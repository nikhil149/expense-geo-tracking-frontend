const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo Config Plugin for react-native-android-notification-listener.
 *
 * The library's own AndroidManifest.xml already declares:
 *   - The NotificationListenerService (com.lesimoes.androidnotificationlistener.RNAndroidNotificationListener)
 *   - The HeadlessJsTaskService
 *   - The BootUpReceiver
 *
 * This plugin only needs to:
 *   1. Add `tools:replace="android:allowBackup"` to resolve the manifest merger
 *      conflict (the library sets allowBackup=false, Expo sets it to true).
 *   2. Ensure the HeadlessJsTaskService has `android:exported="false"` (required
 *      by Android 12+ / targetSdkVersion 31+).
 *
 * We do NOT re-declare the NotificationListenerService here because the library
 * manifest already does it — duplicating it (especially with a wrong class name)
 * causes the headless task to silently fail.
 */
const withAndroidNotificationListener = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];

    // ── 1. Add tools namespace ──────────────────────────────────────
    androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    // ── 2. Fix allowBackup conflict ─────────────────────────────────
    const currentReplace = application.$['tools:replace'] || '';
    if (!currentReplace.includes('android:allowBackup')) {
      application.$['tools:replace'] = currentReplace 
        ? `${currentReplace},android:allowBackup` 
        : 'android:allowBackup';
    }

    // ── 3. Patch HeadlessJsTaskService to add android:exported ──────
    if (application.service) {
      for (const service of application.service) {
        const name = service.$?.['android:name'] || '';
        if (name.includes('HeadlessJsTaskService')) {
          // Android 12+ requires android:exported on all services
          if (!service.$['android:exported']) {
            service.$['android:exported'] = 'false';
          }
        }
      }
    }

    return config;
  });
};

module.exports = withAndroidNotificationListener;
