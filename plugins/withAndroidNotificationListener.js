const { withAndroidManifest } = require('@expo/config-plugins');

const withAndroidNotificationListener = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];

    // Ensure tools namespace exists to use tools:replace
    androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    // Add tools:replace="android:allowBackup" to handle library manifest conflict
    const currentReplace = application.$['tools:replace'] || '';
    if (!currentReplace.includes('android:allowBackup')) {
      application.$['tools:replace'] = currentReplace 
        ? `${currentReplace},android:allowBackup` 
        : 'android:allowBackup';
    }

    if (!application.service) {
      application.service = [];
    }

    application.service.push({
      $: {
        'android:name': 'com.rnandroidnotificationlistener.RNAndroidNotificationListener',
        'android:label': '@string/app_name',
        'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
        'android:exported': 'true'
      },
      'intent-filter': [
        {
          action: [
            {
              $: {
                'android:name': 'android.service.notification.NotificationListenerService'
              }
            }
          ]
        }
      ]
    });

    return config;
  });
};

module.exports = withAndroidNotificationListener;
