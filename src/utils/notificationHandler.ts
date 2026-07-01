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

    // ── 2.5 Pre-Filter: Ignore non-financial messages ────────────────
    const lowerText = notificationText.toLowerCase();
    const isFinancial = /(?:\b(debited|credited|spent|rs\.?|inr|payment|txn|transaction|account|upi|sent|received)\b|₹|a\/c)/i.test(lowerText);
    
    if (!isFinancial) {
      return; // Silently drop, don't waste API calls
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
