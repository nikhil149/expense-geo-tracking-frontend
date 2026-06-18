import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme, AppRegistry } from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { AuthScreen } from '../screens/AuthScreen';
import { RNAndroidNotificationListenerHeadlessJsName } from 'react-native-android-notification-listener';
import { backgroundNotificationHandler } from '../utils/notificationHandler';

AppRegistry.registerHeadlessTask(RNAndroidNotificationListenerHeadlessJsName, () => backgroundNotificationHandler);

const Icons = LucideIcons as any;

export default function TabLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { isAuthenticated, initializeAuth } = useAppStore();

  React.useEffect(() => {
    initializeAuth();
  }, []);

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0,0,0,0.08)',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#9CA3AF',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Icons.Home size={size} color={color as any} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Spending Map',
          tabBarIcon: ({ color, size }) => <Icons.MapPin size={size} color={color as any} />,
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ color, size }) => <Icons.Target size={size} color={color as any} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => <Icons.BarChart2 size={size} color={color as any} />,
        }}
      />
    </Tabs>
  );
}
