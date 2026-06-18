const { withAndroidManifest } = require('@expo/config-plugins');

const withAndroidNotificationListener = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];

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
