/**
 * Custom entry point for Geo-Finance Tracker.
 *
 * This file MUST be the first thing executed by the React Native runtime.
 * We register the headless notification-listener task here (outside any
 * React component tree) so that Android can cold-start the JS engine in the
 * background and still find the task handler — even when the app has been
 * killed / swiped away by the user.
 *
 * IMPORTANT: We use require() instead of import for the headless registration
 * because ES `import` statements are hoisted to the top of the module by the
 * bundler — which would cause expo-router/entry to run before our headless
 * task registration.
 */

const { AppRegistry, Platform } = require('react-native');

if (Platform.OS === 'android') {
  try {
    const {
      RNAndroidNotificationListenerHeadlessJsName,
    } = require('react-native-android-notification-listener');

    const {
      backgroundNotificationHandler,
    } = require('./src/utils/notificationHandler');

    if (RNAndroidNotificationListenerHeadlessJsName) {
      AppRegistry.registerHeadlessTask(
        RNAndroidNotificationListenerHeadlessJsName,
        () => backgroundNotificationHandler,
      );
      console.log('[index.ts] ✅ Headless notification task registered');
    }
  } catch (e) {
    // Silently ignore on platforms where the native module is unavailable
    // (e.g. iOS, web, or Expo Go without a dev-client build).
    console.warn('[index.ts] Could not register headless notification task:', e);
  }
}

// Boot the normal Expo Router application AFTER registering the headless task
require('expo-router/entry');
