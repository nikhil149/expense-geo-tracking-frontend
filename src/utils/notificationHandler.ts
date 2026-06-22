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
  return 'https://d29xz5ma6wsmg7.cloudfront.net/api';
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

    // ── 2. Run the SMS parsing engine ────────────────────────────────
    const transaction = parseSMSTransaction(notificationText);
    if (!transaction) return; // Not a bank transaction — ignore silently

    // ── 3. Check that the user is logged in ──────────────────────────
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) return;

    // ── 4. Attempt to grab the last-known GPS position ──────────────
    let latitude: number | null = null;
    let longitude: number | null = null;
    let location_name = 'SMS Intercept';

    try {
      const Location = require('expo-location');
      const loc = await Location.getLastKnownPositionAsync();
      if (loc && loc.coords) {
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
        location_name = 'SMS Intercept (Live GPS)';
      }
    } catch (_locErr) {
      // GPS unavailable in headless context — proceed without coordinates
    }

    // ── 5. POST the transaction to the backend API ───────────────────
    const apiUrl = getBackgroundApiUrl();

    const txData = {
      title: transaction.title,
      amount: transaction.amount,
      type: transaction.type,
      date: transaction.date || new Date().toISOString(),
      latitude,
      longitude,
      location_name,
      notes: `Auto-captured via OS notification.\nSource app: ${parsed.app || 'unknown'}\nTitle: ${parsed.title || ''}`,
    };

    const res = await fetch(`${apiUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(txData),
    });

    if (!res.ok) {
      console.error(
        '[NotificationHandler] Failed to auto-log transaction:',
        res.status,
        await res.text().catch(() => ''),
      );
    } else {
      console.log(
        '[NotificationHandler] ✅ Auto-logged:',
        transaction.title,
        '₹' + transaction.amount,
      );
    }
  } catch (error) {
    console.error('[NotificationHandler] Unhandled error:', error);
  }
};
