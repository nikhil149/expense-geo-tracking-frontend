import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseSMSTransaction } from '../store/smsParser';

/**
 * Resolve the correct API base URL for the background headless context.
 *
 * When Android cold-starts the JS engine for a headless task the normal
 * `__DEV__` global is unavailable and `Platform.select` may resolve to
 * `localhost` which is unreachable.  We therefore fall back to the
 * production CloudFront URL whenever the stored/envvar URL is absent.
 */
function getBackgroundApiUrl(): string {
  // Try the environment variable first (set via Expo env)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // In a headless background context we cannot rely on __DEV__ so always
  // use the production URL.
  return 'https://wxm1ud51uf.execute-api.ap-south-1.amazonaws.com/api';
}

/**
 * Headless notification handler.
 *
 * Invoked by `react-native-android-notification-listener` whenever any
 * notification arrives on the device — even if the app is killed.
 *
 * The library passes `{ notification }` where `notification` is a **JSON
 * string**, not a parsed object.  We must JSON.parse it ourselves.
 */
export const backgroundNotificationHandler = async ({ notification }: any) => {
  if (!notification) return;

  try {
    // ── 1. Parse the raw notification payload ────────────────────────
    let parsed: any = {};

    if (typeof notification === 'string') {
      try {
        parsed = JSON.parse(notification);
      } catch (_jsonErr) {
        // Not JSON — treat the entire string as the notification text
        parsed = { text: notification };
      }
    } else {
      parsed = notification;
    }

    // Build a single text blob from all available fields
    const notificationText = [
      parsed.text,
      parsed.titleBig,
      parsed.title,
      parsed.subText,
      parsed.bigText,
      parsed.summaryText,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (!notificationText) return;

    // ── 2.0 Pre-Filter: Check Sender App Whitelist ───────────────────
    const appPackage = parsed.app || '';
    const ALLOWED_APPS = [
      'com.google.android.apps.messaging', // Google Messages
      'com.samsung.android.messaging', // Samsung Messages
      'com.apple.MobileSMS', // iOS Messages
      // Add typical Indian Banking apps that send Push notifications instead of SMS:
      'com.sbi.SBIFreedomPlus', 'com.sbi.lotusintouch', // SBI
      'com.hdfcbank.payzapp', 'com.snapwork.hdfc', 'com.hdfcbank.android.now', // HDFC
      'com.csam.icici.bank.imobile', // ICICI
      'com.axis.mobile', // Axis
      'com.zerodha.kite3', 'com.zerodha.coin', 'com.phonepe.app'
    ];

    if (appPackage && !ALLOWED_APPS.includes(appPackage)) {
      // Allow 'unknown' if testing/mocking, otherwise block
      if (appPackage !== 'unknown') {
        return; // Silently drop notifications from WhatsApp, Instagram, etc.
      }
    }

    // ── 2.5 Pre-Filter: Ignore non-financial messages ────────────────
    const lowerText = notificationText.toLowerCase();
    const isFinancial = /(?:\b(debited|credited|spent|rs\.?|inr|payment|txn|transaction|account|upi|sent|received)\b|₹|a\/c)/i.test(lowerText);

    if (!isFinancial) {
      return; // Silently drop, don't waste API calls
    }

    // ── 2.8 Pre-Filter: Deduplicate same amounts within 3 minutes ──
    const amounts: number[] = [];
    for (const m of notificationText.matchAll(/(?:rs\.?|inr|₹)\s*([\d,]+\.?\d*)/gi)) amounts.push(parseFloat(m[1].replace(/,/g, '')));
    for (const m of notificationText.matchAll(/(?:debited|credited|spent|payment of)\s*([\d,]+\.?\d*)/gi)) amounts.push(parseFloat(m[1].replace(/,/g, '')));
    for (const m of notificationText.matchAll(/([\d,]+\.?\d*)\s*(?:debited|credited|spent)/gi)) amounts.push(parseFloat(m[1].replace(/,/g, '')));
    const uniqueAmounts = [...new Set(amounts.filter(a => !isNaN(a) && a > 0))];

    if (uniqueAmounts.length > 0) {
      try {
        const storedRecents = await AsyncStorage.getItem('recent_amounts');
        let recentAmounts: { amount: number, time: number }[] = storedRecents ? JSON.parse(storedRecents) : [];
        const now = Date.now();
        const THREE_MINUTES = 3 * 60 * 1000;

        // Clean up old entries
        recentAmounts = recentAmounts.filter(entry => now - entry.time < THREE_MINUTES);

        // Check for duplicates
        let isDuplicate = false;
        for (const amount of uniqueAmounts) {
          if (recentAmounts.some(entry => entry.amount === amount)) {
            isDuplicate = true;
            break;
          }
        }

        if (isDuplicate) {
          console.log(`[SMS] Dropping duplicate notification for amount(s) ${uniqueAmounts.join(', ')}`);
          return;
        }

        // Add new amounts and save
        uniqueAmounts.forEach(amount => recentAmounts.push({ amount, time: now }));
        await AsyncStorage.setItem('recent_amounts', JSON.stringify(recentAmounts));
      } catch (e) {
        console.warn('[SMS] Failed to read/write recent amounts', e);
      }
    }

    // ── 3. Check that the user is logged in ──────────────────────────
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) return;

    // ── 4. Attempt to grab the last-known GPS position ──────────────
    let latitude: number | null = null;
    let longitude: number | null = null;
    let location_name = 'SMS Intercept';

    try {
      // Read the GPS position that the foreground app cached in AsyncStorage.
      const { getCachedLocation } = require('./locationCache');
      const cached = await getCachedLocation();

      if (cached) {
        latitude = cached.latitude;
        longitude = cached.longitude;
        location_name = 'SMS Intercept (Cached GPS)';
      }
    } catch (_locErr: any) {
      console.warn(
        '[NotificationHandler] Could not read cached GPS position:',
        _locErr?.message || _locErr,
      );
    }

    // ── 5. POST the RAW SMS to the backend API ───────────────────
    const apiUrl = getBackgroundApiUrl();

    const rawSmsPayload = {
      raw_text: notificationText,
      source_app: parsed.app || 'unknown',
      latitude,
      longitude,
      location_name,
    };

    try {
      const res = await fetch(`${apiUrl}/sms/raw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(rawSmsPayload),
      });

      if (!res.ok) {
        console.error(
          '[NotificationHandler] Backend rejected raw SMS:',
          res.status,
          await res.text().catch(() => ''),
        );
        throw new Error('Backend rejection'); // Force catch block for queueing
      } else {
        console.log('[NotificationHandler] ✅ Raw SMS sent successfully');
      }
    } catch (networkErr) {
      console.warn('[NotificationHandler] Network error, queueing SMS for offline processing...', networkErr);
      // Enqueue to AsyncStorage manually (Zustand might not be fully initialized in headless mode)
      try {
        const queueJson = await AsyncStorage.getItem('pending_sms_queue');
        const queue = queueJson ? JSON.parse(queueJson) : [];
        const newSms = { ...rawSmsPayload, id: Date.now().toString() + Math.random().toString(36).substring(7) };
        queue.push(newSms);
        await AsyncStorage.setItem('pending_sms_queue', JSON.stringify(queue));
        console.log('[NotificationHandler] 📝 SMS queued locally');
      } catch (storageErr) {
        console.error('[NotificationHandler] Fatal: failed to enqueue SMS locally', storageErr);
      }
    }
  } catch (error) {
    console.error('[NotificationHandler] Unhandled error:', error);
  }
};
