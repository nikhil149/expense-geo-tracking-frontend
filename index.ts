/**
 * Custom entry point for Geo-Finance Tracker.
 *
 * This file MUST be the first thing executed by the React Native runtime.
 * We register the headless notification-listener task here (outside any
 * React component tree) so that Android can cold-start the JS engine in the
 * background and still find the task handler — even when the app has been
 * killed / swiped away by the user.
 *
 * After registering the headless task we hand off to Expo Router's normal
 * entry point which boots the rest of the application.
 */

import { AppRegistry, Platform } from 'react-native';

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
    }
  } catch (e) {
    // Silently ignore on platforms where the native module is unavailable
    // (e.g. iOS, web, or Expo Go without a dev-client build).
    console.warn('[index.ts] Could not register headless notification task:', e);
  }
}

// Boot the normal Expo Router application
import 'expo-router/entry';
