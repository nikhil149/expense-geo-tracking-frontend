import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHED_LOCATION_KEY = 'cached_gps_location';

export interface CachedLocation {
  latitude: number;
  longitude: number;
  timestamp: number; // Date.now() when cached
}

/**
 * Save the current GPS position to AsyncStorage.
 *
 * Called from the foreground app whenever a fresh GPS fix is obtained
 * (e.g. on Dashboard load, when creating a transaction, etc.).
 * The headless notification handler reads this cache to tag
 * auto-captured transactions with the user's most recent position —
 * avoiding the need for ACCESS_BACKGROUND_LOCATION which triggers
 * Google Play's strict review process.
 */
export async function cacheLocation(latitude: number, longitude: number): Promise<void> {
  try {
    const data: CachedLocation = {
      latitude,
      longitude,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(CACHED_LOCATION_KEY, JSON.stringify(data));
  } catch (_err) {
    // Non-critical — silently ignore storage errors
  }
}

/**
 * Retrieve the most recently cached GPS position.
 *
 * Returns `null` if no position has been cached or if the cached position
 * is older than `maxAgeMs` (default: 30 minutes).
 */
export async function getCachedLocation(
  maxAgeMs: number = 30 * 60 * 1000,
): Promise<CachedLocation | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHED_LOCATION_KEY);
    if (!raw) return null;

    const data: CachedLocation = JSON.parse(raw);

    // Discard stale positions
    if (Date.now() - data.timestamp > maxAgeMs) {
      return null;
    }

    return data;
  } catch (_err) {
    return null;
  }
}
