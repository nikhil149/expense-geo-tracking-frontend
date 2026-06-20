import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { MapView } from '../components/MapView';
import { GlassCard } from '../components/GlassCard';
import * as LucideIcons from 'lucide-react-native';
const Icons = LucideIcons as any;

export const SpendingMap: React.FC = () => {
  const {
    mapLocations,
    categories,
    mapFilters,
    setMapFilters,
    resetMapFilters,
    fetchSpendingLocations,
  } = useAppStore();

  const [activeDateFilter, setActiveDateFilter] = useState<'all' | 'week' | 'month'>('all');
  const [showDrawer, setShowDrawer] = useState(true);

  useEffect(() => {
    fetchSpendingLocations();
  }, []);

  // Update date ranges based on quick filter selection
  const handleDateFilterSelect = (type: 'all' | 'week' | 'month') => {
    setActiveDateFilter(type);
    
    let startDate = null;
    const now = new Date();
    
    if (type === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = oneWeekAgo.toISOString();
    } else if (type === 'month') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = oneMonthAgo.toISOString();
    }
    
    setMapFilters({ startDate, endDate: null });
  };

  const handleCategorySelect = (categoryId: number | null) => {
    setMapFilters({ category_id: categoryId });
  };

  // Calculate total amount representing visible map coordinates
  const totalOnMap = mapLocations.reduce((sum, loc) => sum + (loc.type === 'expense' ? loc.amount : 0), 0);

  return (
    <View style={styles.container}>
      {/* Full screen Polymorphic Map */}
      <View style={styles.mapContainer}>
        <MapView locations={mapLocations} />
      </View>

      {/* Floating Top Category Scroll Selection */}
      <View style={styles.categoryFiltersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          <Pressable
            style={[
              styles.filterBadge,
              mapFilters.category_id === null && styles.filterBadgeActive,
            ]}
            onPress={() => handleCategorySelect(null)}
          >
            <Text
              style={[
                styles.badgeText,
                mapFilters.category_id === null && styles.badgeTextActive,
              ]}
            >
              All Categories
            </Text>
          </Pressable>

          {categories.map((cat) => {
            const isSelected = mapFilters.category_id === cat.id;
            return (
              <Pressable
                key={cat.id}
                style={[
                  styles.filterBadge,
                  isSelected && {
                    backgroundColor: cat.color,
                    borderColor: cat.color,
                  },
                ]}
                onPress={() => handleCategorySelect(cat.id)}
              >
                <View style={styles.badgeInner}>
                  <Text
                    style={[
                      styles.badgeText,
                      isSelected && styles.badgeTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Floating Quick Date Filter (Left Side Overlay) */}
      <View style={styles.dateFiltersWrapper}>
        <GlassCard style={styles.dateCard}>
          <Pressable
            style={[styles.dateBtn, activeDateFilter === 'all' && styles.dateBtnActive]}
            onPress={() => handleDateFilterSelect('all')}
          >
            <Text style={[styles.dateBtnText, activeDateFilter === 'all' && styles.dateBtnTextActive]}>
              All Time
            </Text>
          </Pressable>
          <Pressable
            style={[styles.dateBtn, activeDateFilter === 'week' && styles.dateBtnActive]}
            onPress={() => handleDateFilterSelect('week')}
          >
            <Text style={[styles.dateBtnText, activeDateFilter === 'week' && styles.dateBtnTextActive]}>
              7 Days
            </Text>
          </Pressable>
          <Pressable
            style={[styles.dateBtn, activeDateFilter === 'month' && styles.dateBtnActive]}
            onPress={() => handleDateFilterSelect('month')}
          >
            <Text style={[styles.dateBtnText, activeDateFilter === 'month' && styles.dateBtnTextActive]}>
              30 Days
            </Text>
          </Pressable>
        </GlassCard>
      </View>

      {/* Floating Collapsible Bottom Slide-over Drawer for Transactions logs */}
      <View style={[styles.drawerContainer, !showDrawer && styles.drawerCollapsed]}>
        <Pressable style={styles.drawerHandle} onPress={() => setShowDrawer(!showDrawer)}>
          <View style={styles.handleIndicator} />
          <View style={styles.drawerTitleRow}>
            <Text style={styles.drawerTitle}>
              Visible Locations ({mapLocations.length})
            </Text>
            <Icons.ChevronDown
              size={18}
              color="#9CA3AF"
              style={{ transform: [{ rotate: showDrawer ? '0deg' : '180deg' }] }}
            />
          </View>
        </Pressable>

        {showDrawer && (
          <ScrollView style={styles.drawerScroll} showsVerticalScrollIndicator={false}>
            {mapLocations.length === 0 ? (
              <View style={styles.emptyDrawer}>
                <Text style={styles.emptyText}>No geolocated transactions in this view.</Text>
              </View>
            ) : (
              mapLocations.map((loc) => {
                const catColor = loc.category_color || '#8B5CF6';
                const isExpense = loc.type === 'expense';
                
                return (
                  <GlassCard key={loc.id} style={styles.locItemCard}>
                    <View style={styles.locItemInner}>
                      <View style={[styles.colorBullet, { backgroundColor: catColor }]} />
                      <View style={styles.locItemMain}>
                        <Text style={styles.locItemTitle}>{loc.title}</Text>
                        <Pressable
                           style={styles.locItemStoreWrapper}
                           onPress={() => {
                             if (loc.latitude && loc.longitude) {
                               const url = `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;
                               Linking.openURL(url).catch((err) => alert('Error opening map: ' + err.message));
                             }
                           }}
                         >
                           <Text style={styles.locItemStore} numberOfLines={1}>
                             {loc.location_name || 'Mapped Coordinate'}
                           </Text>
                           {loc.latitude && loc.longitude && (
                             <Icons.Compass size={8} color="#10B981" style={{ marginLeft: 2 }} />
                           )}
                         </Pressable>
                        <Text style={styles.locItemDate}>
                          {new Date(loc.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                        <Text
                          style={[
                            styles.locItemAmt,
                            { color: loc.type === 'income' ? '#10B981' : loc.type === 'investment' ? '#6366F1' : '#EF4444' },
                          ]}
                        >
                          {isExpense ? '-' : '+'}₹{loc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                        <Pressable 
                          style={{ marginTop: 6 }}
                          onPress={() => {
                            if (Platform.OS === 'web') {
                              if (window.confirm('Delete this transaction?')) useAppStore.getState().deleteTransaction(loc.id);
                            } else {
                              Alert.alert('Delete', 'Delete this transaction?', [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => useAppStore.getState().deleteTransaction(loc.id) }
                              ]);
                            }
                          }}
                        >
                          <Icons.Trash2 size={12} color="#EF4444" />
                        </Pressable>
                      </View>
                    </View>
                  </GlassCard>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  mapContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  floatingHeaderWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    zIndex: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  floatingHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  headerIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerSub: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#9CA3AF',
    letterSpacing: 1.2,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerMain: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  categoryFiltersWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    zIndex: 10,
    height: 48,
  },
  categoryScrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  filterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterBadgeActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  badgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dateFiltersWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    right: 20,
    zIndex: 10,
  },
  dateCard: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    gap: 4,
  },
  dateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dateBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dateBtnText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  dateBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  drawerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(11, 15, 25, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: '40%',
    zIndex: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 -8px 32px 0 rgba(0, 0, 0, 0.5)',
      },
    }),
  },
  drawerCollapsed: {
    paddingBottom: 10,
  },
  drawerHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 10,
  },
  drawerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },
  drawerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F3F4F6',
  },
  drawerScroll: {
    marginTop: 8,
  },
  emptyDrawer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 13,
    fontStyle: 'italic',
  },
  locItemCard: {
    marginBottom: 10,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  locItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  locItemMain: {
    flex: 1,
  },
  locItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F3F4F6',
  },
  locItemStoreWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: 'flex-start',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  locItemStore: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
    maxWidth: 180,
  },
  locItemDate: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  locItemAmt: {
    fontSize: 14,
    fontWeight: '800',
  },
});
