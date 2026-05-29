import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
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

      {/* Floating Top Header: Total Filtered Expenditure */}
      <GlassCard style={styles.floatingHeader}>
        <Text style={styles.headerSub}>Filtered Spending</Text>
        <Text style={styles.headerMain}>
          ${totalOnMap.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </GlassCard>

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
                        <Text style={styles.locItemStore} numberOfLines={1}>
                          {loc.location_name || 'Mapped Coordinate'}
                        </Text>
                        <Text style={styles.locItemDate}>
                          {new Date(loc.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.locItemAmt,
                          { color: loc.type === 'income' ? '#10B981' : loc.type === 'investment' ? '#6366F1' : '#EF4444' },
                        ]}
                      >
                        {isExpense ? '-' : '+'}${loc.amount.toFixed(2)}
                      </Text>
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
  floatingHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    left: 20,
    right: 20,
    alignItems: 'center',
    padding: 12,
    zIndex: 10,
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
  },
  headerSub: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: '#9CA3AF',
    letterSpacing: 1,
    fontWeight: '700',
  },
  headerMain: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  categoryFiltersWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 140 : 110,
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
    top: Platform.OS === 'ios' ? 200 : 170,
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
  locItemStore: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
    maxWidth: 200,
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
