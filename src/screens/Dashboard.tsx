import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { GlassCard } from '../components/GlassCard';
import { parseSMSTransaction } from '../store/smsParser';
import RNAndroidNotificationListener from 'react-native-android-notification-listener';
import * as LucideIcons from 'lucide-react-native';
const Icons = LucideIcons as any;

// Helper to resolve Lucide icons dynamically from seeded string values
export const CategoryIcon = ({ name, color, size = 18 }: { name: string; color: string; size?: number }) => {
  // Map standard category names to correct Lucide components
  let IconComponent = (Icons as any)[name];
  if (!IconComponent) {
    // Standard fallbacks if name is a lower-case match
    const lower = name.toLowerCase();
    if (lower === 'utensils') IconComponent = Icons.Utensils;
    else if (lower === 'car') IconComponent = Icons.Car;
    else if (lower === 'home') IconComponent = Icons.Home;
    else if (lower === 'zap') IconComponent = Icons.Zap;
    else if (lower === 'film') IconComponent = Icons.Film;
    else if (lower === 'heart-pulse') IconComponent = Icons.HeartPulse;
    else if (lower === 'shopping-bag') IconComponent = Icons.ShoppingBag;
    else if (lower === 'trending-up') IconComponent = Icons.TrendingUp;
    else if (lower === 'bar-chart-2') IconComponent = Icons.BarChart2;
    else if (lower === 'plane') IconComponent = Icons.Plane;
    else if (lower === 'shield') IconComponent = Icons.Shield;
    else if (lower === 'target') IconComponent = Icons.Target;
    else IconComponent = Icons.HelpCircle;
  }
  return <IconComponent size={size} color={color} />;
};

const SMS_PRESETS = [
  {
    label: '☕ Starbucks Spent',
    text: 'HDFC Bank: Rs 250.00 spent at Starbucks SOMA on 30-May-2026. Available Bal: Rs 15,200.',
  },
  {
    label: '🏋️ Equinox Gym',
    text: 'SBI Card: Charged ₹2,450.00 at Equinox Gym on 30-May-2026. Ref: EQ9281.',
  },
  {
    label: '⛽ Shell Fuel',
    text: 'ALERT: Paid Rs.850.00 to Shell Gas Station via UPI Ref: 629173.',
  },
  {
    label: '📱 Apple Purchase',
    text: 'ICICI Bank: ₹89,900.00 spent at Apple Store for gadgets on 30-May-2026.',
  },
  {
    label: '💬 Non-transactional',
    text: 'Hi Nikhil, are we still meeting at the park for running?',
  },
];

interface DashboardProps {
  onAddTransactionPress: () => void;
  onEditTransactionPress: (id: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onAddTransactionPress,
  onEditTransactionPress,
}) => {
  const {
    user,
    logout,
    transactions,
    categories,
    summary,
    isLoading,
    loadAllData,
    deleteTransaction,
    createTransaction,
    deleteAccount,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');

  // Simulated SMS Interceptor states
  const [smsText, setSmsText] = useState(SMS_PRESETS[0].text);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{
    success: boolean;
    message: string;
    latitude?: number;
    longitude?: number;
    locationName?: string;
  } | null>(null);

  const [hasListenerPermission, setHasListenerPermission] = useState(false);

  useEffect(() => {
    loadAllData();
    if (Platform.OS === 'android') {
      try {
        if (RNAndroidNotificationListener && RNAndroidNotificationListener.getPermissionStatus) {
          RNAndroidNotificationListener.getPermissionStatus().then(status => {
            setHasListenerPermission(status !== 'denied');
          }).catch(() => setHasListenerPermission(false));
        }
      } catch (e) {
        console.warn('Native module missing for notification listener');
      }
    }
  }, []);

  const requestListenerPermission = () => {
    if (Platform.OS === 'android') {
      if (RNAndroidNotificationListener && RNAndroidNotificationListener.requestPermission) {
        RNAndroidNotificationListener.requestPermission();
      } else {
        Alert.alert('Module Missing', 'Native notification module is not installed. Did you build a new EAS APK?');
      }
    } else {
      Alert.alert('Not Supported', 'True Background Interception is only available on Android OS.');
    }
  };

  const handleRefresh = () => {
    loadAllData();
  };

  const handleDelete = (id: number) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this transaction?')) {
        deleteTransaction(id);
      }
    } else {
      Alert.alert(
        'Delete Transaction',
        'Are you sure you want to delete this transaction?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(id) }
        ]
      );
    }
  };

  const handleDeleteAccount = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('WARNING: This will permanently delete your account and all data. Are you sure?')) {
        deleteAccount();
      }
    } else {
      Alert.alert(
        'Delete Account',
        'WARNING: This will permanently delete your account and all your transactions. This cannot be undone. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete Permanently', style: 'destructive', onPress: deleteAccount }
        ]
      );
    }
  };

  const handleSimulateSMS = async () => {
    setIsSimulating(true);
    setSimResult(null);
    try {
      // 1. Parse SMS using regex logic engine
      const parsed = parseSMSTransaction(smsText);
      if (!parsed) {
        setSimResult({
          success: false,
          message: 'Notification ignored. The text pattern did not match a valid bank transaction debit alert.',
        });
        setIsSimulating(false);
        return;
      }

      // 2. Fetch Device GPS location (emulating live background receiver pinning coordinate)
      let latitude: number | null = null;
      let longitude: number | null = null;
      let locationName = 'Simulated Location';

      try {
        if (Platform.OS === 'web') {
          const posPromise = new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 });
          });
          const pos = await posPromise;
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
          locationName = 'Live Web GPS Pin';
        } else {
          const Location = require('expo-location');
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            latitude = loc.coords.latitude;
            longitude = loc.coords.longitude;
            locationName = 'Live Mobile GPS Pin';
          } else {
            throw new Error('Permission denied');
          }
        }
      } catch (gpsError) {
        // Fallback inside city center if GPS is disabled or blocked
        latitude = 37.7749 + (Math.random() - 0.5) * 0.01;
        longitude = -122.4194 + (Math.random() - 0.5) * 0.01;
        locationName = 'San Francisco (GPS Fallback)';
      }

      // 3. Map matched Category using merchant indicators
      let matchedCategoryId: number | null = null;
      const titleLower = parsed.title.toLowerCase();

      const bestMatch = categories.find(c => {
        const nameLower = c.name.toLowerCase();
        return titleLower.includes(nameLower) || nameLower.includes(titleLower);
      });

      if (bestMatch) {
        matchedCategoryId = bestMatch.id;
      } else {
        // Semantic keyword matching fallbacks
        if (titleLower.includes('starbucks') || titleLower.includes('cafe') || titleLower.includes('food') || titleLower.includes('dining')) {
          const cat = categories.find(c => c.name.toLowerCase().includes('food') || c.name.toLowerCase().includes('dining'));
          if (cat) matchedCategoryId = cat.id;
        } else if (titleLower.includes('gym') || titleLower.includes('equinox') || titleLower.includes('fitness')) {
          const cat = categories.find(c => c.name.toLowerCase().includes('health') || c.name.toLowerCase().includes('gym') || c.name.toLowerCase().includes('fitness'));
          if (cat) matchedCategoryId = cat.id;
        } else if (titleLower.includes('fuel') || titleLower.includes('gas') || titleLower.includes('shell') || titleLower.includes('chevron')) {
          const cat = categories.find(c => c.name.toLowerCase().includes('transport') || c.name.toLowerCase().includes('car'));
          if (cat) matchedCategoryId = cat.id;
        } else if (titleLower.includes('apple') || titleLower.includes('store') || titleLower.includes('shopping')) {
          const cat = categories.find(c => c.name.toLowerCase().includes('shop'));
          if (cat) matchedCategoryId = cat.id;
        }
      }

      // Default to first category if still null
      if (!matchedCategoryId && categories.length > 0) {
        matchedCategoryId = categories[0].id;
      }

      // 4. Save and Synchronize Transaction to Secure Backend API
      await createTransaction({
        title: parsed.title,
        amount: parsed.amount,
        type: parsed.type,
        date: parsed.date || new Date().toISOString(),
        category_id: matchedCategoryId,
        latitude,
        longitude,
        location_name: locationName,
        notes: parsed.notes,
      });

      setSimResult({
        success: true,
        message: `Successfully intercepted and auto-logged: ₹${parsed.amount.toLocaleString('en-IN')} spent at "${parsed.title}"!`,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        locationName,
      });

      // Clear input
      setSmsText('');
      
    } catch (err: any) {
      setSimResult({
        success: false,
        message: `Interception failed: ${err.message || 'Unknown API error'}`,
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const filteredTransactions = transactions.filter((tx) =>
    tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tx.location_name && tx.location_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (tx.category_name && tx.category_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top welcome profile bar with Logout action */}
        <View style={styles.headerBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeText}>Hello {user?.name || 'Nikhil'},</Text>
            <Text style={styles.subWelcomeText}>Welcome to your Geo-Finance Hub</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.refreshBtn} onPress={handleRefresh}>
              <Icons.RotateCw size={18} color="#9CA3AF" />
            </Pressable>
            <Pressable style={[styles.refreshBtn, { marginLeft: 8 }]} onPress={logout}>
              <Icons.LogOut size={18} color="#9CA3AF" />
            </Pressable>
            <Pressable style={[styles.refreshBtn, { marginLeft: 8, borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }]} onPress={handleDeleteAccount}>
              <Icons.UserMinus size={18} color="#EF4444" />
            </Pressable>
          </View>
        </View>

        {/* Dynamic Glassmorphic PFM stats overview */}
        <GlassCard style={styles.mainBalanceCard}>
          <Text style={styles.balanceLabel}>Net Cash Balance</Text>
          <Text style={styles.balanceValue}>
            ₹{summary.netSavings.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <View style={styles.statsDivider} />
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <View style={styles.statIconWrapper}>
                <Icons.TrendingUp size={16} color="#10B981" />
                <Text style={styles.statLabel}>Income</Text>
              </View>
              <Text style={styles.statValue}>
                ₹{summary.totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </View>
            <View style={styles.statCol}>
              <View style={styles.statIconWrapper}>
                <Icons.TrendingDown size={16} color="#EF4444" />
                <Text style={styles.statLabel}>Expenses</Text>
              </View>
              <Text style={styles.statValue}>
                ₹{summary.totalExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </View>
            <View style={styles.statCol}>
              <View style={styles.statIconWrapper}>
                <Icons.BarChart2 size={16} color="#6366F1" />
                <Text style={styles.statLabel}>Invested</Text>
              </View>
              <Text style={styles.statValue}>
                ₹{summary.totalInvestment.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Simulated SMS Notification Interceptor Widget */}
        <GlassCard style={styles.smsCard}>
          <View style={styles.smsHeader}>
            <View style={styles.smsTitleRow}>
              <Icons.MessageSquare size={18} color="#8B5CF6" />
              <Text style={styles.smsTitle}>SMS Notification Auto-Logger</Text>
            </View>
            <View style={styles.smsActiveBadge}>
              <View style={[styles.smsBadgeDot, { backgroundColor: hasListenerPermission ? '#10B981' : '#F59E0B' }]} />
              <Text style={[styles.smsBadgeText, { color: hasListenerPermission ? '#10B981' : '#F59E0B' }]}>
                {hasListenerPermission ? 'OS Listener Active' : 'OS Listener Disabled'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.smsDescription}>
            Simulate incoming bank SMS notifications, or enable true Android OS Background Interception to auto-log real SMS messages silently.
          </Text>

          {!hasListenerPermission ? (
            <Pressable style={styles.permissionBtn} onPress={requestListenerPermission}>
              <Icons.Shield size={14} color="#8B5CF6" />
              <Text style={styles.permissionBtnText}>Enable True Android OS Interception</Text>
            </Pressable>
          ) : (
            <Pressable 
              style={[styles.permissionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }]} 
              onPress={() => {
                Alert.alert(
                  'Keep Background Service Alive',
                  'Android actively kills background services to save battery.\n\nTo ensure the SMS listener runs 24/7 without crashing:\n\n1. Tap "Open Settings"\n2. Tap "App Battery Usage" (or "Battery")\n3. Select "Unrestricted"',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: () => Linking.openSettings() }
                  ]
                );
              }}
            >
              <Icons.BatteryCharging size={14} color="#10B981" />
              <Text style={[styles.permissionBtnText, { color: '#10B981' }]}>Disable Battery Optimization</Text>
            </Pressable>
          )}

          {/* Quick presets list */}
          <Text style={styles.presetsLabel}>TAP PRESET ALERT TO LOAD:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetsScroll}
          >
            {SMS_PRESETS.map((preset, idx) => {
              const isActive = smsText === preset.text;
              return (
                <Pressable
                  key={idx}
                  style={isActive ? styles.presetActiveBadge : styles.presetBadge}
                  onPress={() => {
                    setSmsText(preset.text);
                    setSimResult(null);
                  }}
                >
                  <Text style={isActive ? styles.presetActiveBadgeText : styles.presetBadgeText}>
                    {preset.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* SMS input field */}
          <TextInput
            style={styles.smsInput}
            multiline
            numberOfLines={3}
            placeholder="Paste raw bank transaction SMS notification text here..."
            placeholderTextColor="#6B7280"
            value={smsText}
            onChangeText={(text) => {
              setSmsText(text);
              setSimResult(null);
            }}
          />

          <Pressable
            style={[styles.smsButton, isSimulating && { opacity: 0.7 }]}
            onPress={handleSimulateSMS}
            disabled={isSimulating}
          >
            {isSimulating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icons.Send size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.smsButtonText}>Intercept SMS & Pin Location</Text>
              </View>
            )}
          </Pressable>

          {/* Simulation response card */}
          {simResult && (
            <View
              style={[
                styles.smsResultCard,
                {
                  backgroundColor: simResult.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  borderColor: simResult.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                },
              ]}
            >
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                <Icons.AlertCircle
                  size={16}
                  color={simResult.success ? '#10B981' : '#EF4444'}
                  style={{ marginTop: 2 }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.smsResultText,
                      { color: simResult.success ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    {simResult.message}
                  </Text>
                  {simResult.success && simResult.latitude && (
                    <View style={styles.smsResultGeoDetails}>
                      <Icons.MapPin size={10} color="#9CA3AF" />
                      <Text style={styles.smsResultGeoText}>
                        Pinned at: {simResult.locationName} ({simResult.latitude.toFixed(4)}, {simResult.longitude?.toFixed(4)})
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
        </GlassCard>

        {/* Transactions list header & search */}
        <View style={styles.txSectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {isLoading && <ActivityIndicator size="small" color="#8B5CF6" />}
        </View>

        <View style={styles.searchBarContainer}>
          <Icons.Search size={16} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            placeholder="Search stores, categories, or names..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery !== '' && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Icons.X size={16} color="#6B7280" />
            </Pressable>
          )}
        </View>

        {/* Transactions logs list */}
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icons.IndianRupee size={40} color="#374151" />
            <Text style={styles.emptyText}>No matching transactions found.</Text>
          </View>
        ) : (
          filteredTransactions.map((tx) => {
            const isExpense = tx.type === 'expense';
            const isIncome = tx.type === 'income';
            const catColor = tx.category_color || '#9CA3AF';
            const catIcon = tx.category_icon || 'HelpCircle';
            const txAmt = tx.amount;

            return (
              <GlassCard key={tx.id} style={styles.txRowCard}>
                <View style={styles.txRowInner}>
                  {/* Left part: Icon & Title */}
                  <View style={[styles.txIconBox, { backgroundColor: `${catColor}15` }]}>
                    <CategoryIcon name={catIcon} color={catColor} size={20} />
                  </View>
                  <View style={styles.txInfoCol}>
                    <View style={styles.txTitleRow}>
                      <Text style={styles.txTitle} numberOfLines={1}>
                        {tx.title}
                      </Text>
                      {tx.linked_goal_id && (
                        <View style={styles.goalBadge}>
                          <Icons.Target size={10} color="#8B5CF6" />
                          <Text style={styles.goalBadgeText} numberOfLines={1}>
                            {tx.linked_goal_name}
                          </Text>
                        </View>
                      )}
                      {tx.type === 'transfer' && (
                        <View style={[styles.goalBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                          <Icons.ArrowLeftRight size={10} color="#F59E0B" />
                          <Text style={[styles.goalBadgeText, { color: '#F59E0B' }]} numberOfLines={1}>
                            Self/Family
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Location tag with Pin icon */}
                    {tx.location_name && (
                      tx.latitude && tx.longitude ? (
                        <Pressable
                          style={styles.locationTagPressable}
                          onPress={() => {
                            const url = `https://www.google.com/maps/search/?api=1&query=${tx.latitude},${tx.longitude}`;
                            Linking.openURL(url).catch((err) => alert('Error opening map: ' + err.message));
                          }}
                        >
                          <Icons.MapPin size={10} color="#10B981" />
                          <Text style={styles.locationTagTextPressable} numberOfLines={1}>
                            {tx.location_name}
                          </Text>
                          <Icons.Compass size={9} color="#10B981" style={{ marginLeft: 3 }} />
                        </Pressable>
                      ) : (
                        <View style={styles.locationTag}>
                          <Icons.MapPin size={10} color="#9CA3AF" />
                          <Text style={styles.locationTagText} numberOfLines={1}>
                            {tx.location_name}
                          </Text>
                        </View>
                      )
                    )}
                    <Text style={styles.txDate}>
                      {new Date(tx.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>

                  {/* Right part: Amount & Actions */}
                  <View style={styles.txRightCol}>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: isIncome ? '#10B981' : tx.type === 'investment' ? '#6366F1' : tx.type === 'transfer' ? '#F59E0B' : '#EF4444' },
                      ]}
                    >
                      {tx.type === 'transfer' ? '↔' : isIncome ? '+' : '-'}₹{txAmt.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                    <View style={styles.actionRow}>
                      <Pressable
                        style={styles.actionBtn}
                        onPress={() => onEditTransactionPress(tx.id)}
                      >
                        <Icons.Edit2 size={12} color="#9CA3AF" />
                      </Pressable>
                      <Pressable
                        style={styles.actionBtn}
                        onPress={() => handleDelete(tx.id)}
                      >
                        <Icons.Trash2 size={12} color="#EF4444" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </GlassCard>
            );
          })
        )}
      </ScrollView>

      {/* Floating Add Transaction glowing Button */}
      <Pressable style={styles.fabBtn} onPress={onAddTransactionPress}>
        <Icons.Plus size={24} color="#FFFFFF" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Space for FAB
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: Platform.OS === 'ios' ? 40 : 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F3F4F6',
  },
  subWelcomeText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  mainBalanceCard: {
    marginBottom: 24,
    padding: 24,
  },
  balanceLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#9CA3AF',
    letterSpacing: 1,
    fontWeight: '600',
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statsDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 18,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
  },
  statIconWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F3F4F6',
  },
  smsCard: {
    marginBottom: 24,
    padding: 18,
  },
  smsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  smsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  smsActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 5,
  },
  smsBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  smsBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  smsDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 14,
  },
  permissionBtn: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  permissionBtnText: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: '600',
  },
  presetsLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  presetsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
    marginBottom: 12,
  },
  presetBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  presetBadgeText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  presetActiveBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  presetActiveBadgeText: {
    color: '#C7D2FE',
    fontSize: 12,
    fontWeight: '700',
  },
  smsInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    padding: 12,
    color: '#F3F4F6',
    fontSize: 13,
    textAlignVertical: 'top',
    marginBottom: 12,
    minHeight: 60,
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  smsButton: {
    backgroundColor: '#8B5CF6',
    height: 40,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  smsButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  smsResultCard: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  smsResultText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  smsResultGeoDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  smsResultGeoText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  txSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F3F4F6',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F3F4F6',
    fontSize: 14,
    height: '100%',
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  emptyContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 10,
    fontStyle: 'italic',
  },
  txRowCard: {
    marginBottom: 12,
    padding: 14,
  },
  txRowInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  txIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  txTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  txTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F3F4F6',
    maxWidth: 120,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
    maxWidth: 100,
  },
  goalBadgeText: {
    color: '#8B5CF6',
    fontSize: 9,
    fontWeight: '700',
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  locationTagText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '400',
    maxWidth: 160,
  },
  locationTagPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  locationTagTextPressable: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '700',
    maxWidth: 140,
  },
  txDate: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 3,
  },
  txRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  actionBtn: {
    padding: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  fabBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      web: {
        cursor: 'pointer',
        boxShadow: '0 6px 20px rgba(139, 92, 246, 0.4)',
      },
    }),
  },
});
