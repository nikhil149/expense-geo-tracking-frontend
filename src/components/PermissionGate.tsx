import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LucideIcons from 'lucide-react-native';

const Icons = LucideIcons as any;

const PERMISSION_GATE_KEY = 'permission_gate_completed';

interface PermissionGateProps {
  children: React.ReactNode;
}

interface PermissionState {
  location: 'pending' | 'granted' | 'denied';
  notification: 'pending' | 'granted' | 'denied';
}

export const PermissionGate: React.FC<PermissionGateProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [gateCompleted, setGateCompleted] = useState(false);
  const [permissions, setPermissions] = useState<PermissionState>({
    location: 'pending',
    notification: 'pending',
  });

  // Check if the gate was already completed in a previous session
  useEffect(() => {
    (async () => {
      const completed = await AsyncStorage.getItem(PERMISSION_GATE_KEY);
      if (completed === 'true') {
        setGateCompleted(true);
      } else {
        // Check current permission statuses
        await checkCurrentPermissions();
      }
      setLoading(false);
    })();
  }, []);

  const checkCurrentPermissions = async () => {
    if (Platform.OS !== 'android') {
      setGateCompleted(true);
      return;
    }

    const newState: PermissionState = {
      location: 'pending',
      notification: 'pending',
    };

    // Check location permission
    try {
      const Location = require('expo-location');
      const { status } = await Location.getForegroundPermissionsAsync();
      newState.location = status === 'granted' ? 'granted' : 'pending';
    } catch (e) {
      newState.location = 'pending';
    }

    // Check notification listener permission
    try {
      const RNAndroidNotificationListener = require('react-native-android-notification-listener').default;
      if (RNAndroidNotificationListener?.getPermissionStatus) {
        const status = await RNAndroidNotificationListener.getPermissionStatus();
        newState.notification = status !== 'denied' ? 'granted' : 'pending';
      }
    } catch (e) {
      newState.notification = 'pending';
    }

    setPermissions(newState);

    // If all permissions already granted, mark gate as complete
    if (newState.location === 'granted' && newState.notification === 'granted') {
      await AsyncStorage.setItem(PERMISSION_GATE_KEY, 'true');
      setGateCompleted(true);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const Location = require('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        // Also request background location
        try {
          await Location.requestBackgroundPermissionsAsync();
        } catch (_bgErr) {
          // Background location may fail; foreground is sufficient
        }
        setPermissions((prev) => ({ ...prev, location: 'granted' }));
      } else {
        setPermissions((prev) => ({ ...prev, location: 'denied' }));
      }
    } catch (e) {
      setPermissions((prev) => ({ ...prev, location: 'denied' }));
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const RNAndroidNotificationListener = require('react-native-android-notification-listener').default;
      if (RNAndroidNotificationListener?.requestPermission) {
        RNAndroidNotificationListener.requestPermission();
        // The user will be taken to system settings; we cannot detect
        // the result immediately. Set a short delay and re-check.
        setTimeout(async () => {
          await checkCurrentPermissions();
        }, 2000);
      }
    } catch (e) {
      setPermissions((prev) => ({ ...prev, notification: 'denied' }));
    }
  };

  const handleContinue = async () => {
    await AsyncStorage.setItem(PERMISSION_GATE_KEY, 'true');
    setGateCompleted(true);
  };

  // Re-check permissions when the app comes back into focus
  // (user may have just returned from system settings)
  useEffect(() => {
    if (gateCompleted || loading) return;

    const interval = setInterval(() => {
      checkCurrentPermissions();
    }, 3000);

    return () => clearInterval(interval);
  }, [gateCompleted, loading]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  if (gateCompleted) {
    return <>{children}</>;
  }

  const allGranted =
    permissions.location === 'granted' && permissions.notification === 'granted';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerIconBox}>
          <Icons.Shield size={36} color="#8B5CF6" />
        </View>
        <Text style={styles.title}>App Permissions</Text>
        <Text style={styles.subtitle}>
          Geo-Finance needs these permissions to automatically track your expenses in
          the background.
        </Text>

        {/* Permission Cards */}
        <View style={styles.cardsWrapper}>
          {/* Location Permission */}
          <View style={styles.permCard}>
            <View style={styles.permCardLeft}>
              <View
                style={[
                  styles.permIconBox,
                  {
                    backgroundColor:
                      permissions.location === 'granted'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(139, 92, 246, 0.15)',
                  },
                ]}
              >
                <Icons.MapPin
                  size={20}
                  color={
                    permissions.location === 'granted' ? '#10B981' : '#8B5CF6'
                  }
                />
              </View>
              <View style={styles.permTextCol}>
                <Text style={styles.permTitle}>Location Access</Text>
                <Text style={styles.permDesc}>
                  Tag each transaction with GPS coordinates
                </Text>
              </View>
            </View>
            {permissions.location === 'granted' ? (
              <View style={styles.grantedBadge}>
                <Icons.Check size={14} color="#10B981" />
                <Text style={styles.grantedText}>Granted</Text>
              </View>
            ) : (
              <Pressable
                style={styles.grantBtn}
                onPress={requestLocationPermission}
              >
                <Text style={styles.grantBtnText}>Allow</Text>
              </Pressable>
            )}
          </View>

          {/* Notification Listener Permission */}
          <View style={styles.permCard}>
            <View style={styles.permCardLeft}>
              <View
                style={[
                  styles.permIconBox,
                  {
                    backgroundColor:
                      permissions.notification === 'granted'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(139, 92, 246, 0.15)',
                  },
                ]}
              >
                <Icons.Bell
                  size={20}
                  color={
                    permissions.notification === 'granted'
                      ? '#10B981'
                      : '#8B5CF6'
                  }
                />
              </View>
              <View style={styles.permTextCol}>
                <Text style={styles.permTitle}>Notification Access</Text>
                <Text style={styles.permDesc}>
                  Read bank SMS alerts to auto-log expenses
                </Text>
              </View>
            </View>
            {permissions.notification === 'granted' ? (
              <View style={styles.grantedBadge}>
                <Icons.Check size={14} color="#10B981" />
                <Text style={styles.grantedText}>Granted</Text>
              </View>
            ) : (
              <Pressable
                style={styles.grantBtn}
                onPress={requestNotificationPermission}
              >
                <Text style={styles.grantBtnText}>Allow</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Continue Button */}
        <Pressable
          style={[
            styles.continueBtn,
            allGranted && styles.continueBtnActive,
          ]}
          onPress={handleContinue}
        >
          <Text
            style={[
              styles.continueBtnText,
              allGranted && styles.continueBtnTextActive,
            ]}
          >
            {allGranted ? 'All Set — Continue' : 'Skip for Now'}
          </Text>
          <Icons.ArrowRight
            size={16}
            color={allGranted ? '#FFFFFF' : '#9CA3AF'}
          />
        </Pressable>

        {!allGranted && (
          <Text style={styles.skipHint}>
            You can enable these later from Settings
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  headerIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#F3F4F6',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    maxWidth: 300,
  },
  cardsWrapper: {
    width: '100%',
    gap: 14,
    marginBottom: 32,
  },
  permCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
  },
  permCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  permIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  permTextCol: {
    flex: 1,
  },
  permTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F3F4F6',
    marginBottom: 2,
  },
  permDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  grantBtn: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  grantBtnText: {
    color: '#A78BFA',
    fontSize: 13,
    fontWeight: '700',
  },
  grantedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  grantedText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  continueBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  continueBtnActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  continueBtnTextActive: {
    color: '#FFFFFF',
  },
  skipHint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});
