import * as React from 'react';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  Linking,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useAppStore, RegionBounds } from '../store/useAppStore';
import { MapView } from '../components/MapView';
import { GlassCard } from '../components/GlassCard';
import * as LucideIcons from 'lucide-react-native';
const Icons = LucideIcons as any;

// Nominatim search result shape
interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string]; // [south, north, west, east]
  type: string;
  class: string;
}

interface SpendingMapProps {
  onEditTransactionPress?: (id: number) => void;
}

export const SpendingMap: React.FC<SpendingMapProps> = ({ onEditTransactionPress }) => {
  const {
    mapLocations,
    categories,
    mapFilters,
    setMapFilters,
    resetMapFilters,
    fetchSpendingLocations,
    regionSpending,
    isRegionLoading,
    fetchRegionSpending,
    clearRegionSpending,
  } = useAppStore();

  const [activeDateFilter, setActiveDateFilter] = useState<'all' | 'week' | 'month'>('all');
  const [showDrawer, setShowDrawer] = useState(true);

  // ── Location Search State ──────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<NominatimResult | null>(null);
  const [mapRegion, setMapRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchSpendingLocations();
  }, []);

  // ── Debounced Nominatim Geocoding ──────────────────────────────────
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!text.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5&addressdetails=0`,
          {
            headers: {
              'User-Agent': 'ExpenseGeoTrackingApp/1.0',
            },
          },
        );
        const data: NominatimResult[] = await res.json();
        setSearchResults(data);
      } catch (_err) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, []);

  // ── Handle Place Selection ─────────────────────────────────────────
  const handlePlaceSelect = useCallback(
    (place: NominatimResult) => {
      setSelectedPlace(place);
      setSearchResults([]);
      setSearchQuery(place.display_name.split(',')[0]); // Show short name

      // Nominatim boundingbox: [south_lat, north_lat, west_lng, east_lng]
      const [south, north, west, east] = place.boundingbox.map(Number);

      const bounds: RegionBounds = {
        minLat: south,
        maxLat: north,
        minLng: west,
        maxLng: east,
      };

      // Animate map to the region
      setMapRegion({
        latitude: parseFloat(place.lat),
        longitude: parseFloat(place.lon),
        latitudeDelta: Math.abs(north - south) * 1.15, // slight padding
        longitudeDelta: Math.abs(east - west) * 1.15,
      });

      // Fetch spending aggregation for this region
      fetchRegionSpending(bounds);
    },
    [fetchRegionSpending],
  );

  // ── Clear Search ───────────────────────────────────────────────────
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPlace(null);
    setMapRegion(null);
    clearRegionSpending();
  }, [clearRegionSpending]);

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

  // Format currency
  const formatINR = (amount: number) =>
    '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <View style={styles.container}>
      {/* Full screen Polymorphic Map */}
      <View style={styles.mapContainer}>
        <MapView locations={mapLocations} region={mapRegion} />
      </View>

      {/* ── Floating Search Bar ─────────────────────────────────────── */}
      <View style={styles.searchWrapper}>
        <GlassCard
          style={styles.searchCard}
          backgroundColor="rgba(11, 15, 25, 0.92)"
          borderColor="rgba(139, 92, 246, 0.25)"
        >
          <View style={styles.searchInputRow}>
            <Icons.Search size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search location (e.g. Bengaluru)"
              placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
            />
            {isSearching && (
              <ActivityIndicator size="small" color="#8B5CF6" style={{ marginLeft: 4 }} />
            )}
            {(searchQuery.length > 0 || selectedPlace) && !isSearching && (
              <Pressable onPress={handleClearSearch} hitSlop={8}>
                <Icons.X size={16} color="#9CA3AF" />
              </Pressable>
            )}
          </View>
        </GlassCard>

        {/* Autocomplete Dropdown */}
        {searchResults.length > 0 && (
          <View style={styles.autocompleteDropdown}>
            {searchResults.map((result) => (
              <Pressable
                key={result.place_id}
                style={styles.autocompleteItem}
                onPress={() => handlePlaceSelect(result)}
              >
                <Icons.MapPin size={14} color="#8B5CF6" style={{ marginRight: 8, flexShrink: 0 }} />
                <Text style={styles.autocompleteText} numberOfLines={2}>
                  {result.display_name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* ── Region Spending Summary Card ───────────────────────────── */}
      {selectedPlace && (
        <View style={styles.regionSummaryWrapper}>
          <GlassCard
            style={styles.regionSummaryCard}
            backgroundColor="rgba(11, 15, 25, 0.94)"
            borderColor="rgba(139, 92, 246, 0.3)"
          >
            {/* Header */}
            <View style={styles.regionHeader}>
              <View style={styles.regionTitleRow}>
                <Icons.MapPin size={16} color="#8B5CF6" />
                <Text style={styles.regionTitle} numberOfLines={1}>
                  {searchQuery}
                </Text>
              </View>
              <Pressable onPress={handleClearSearch} hitSlop={12}>
                <Icons.X size={16} color="#6B7280" />
              </Pressable>
            </View>

            {/* Stats Grid */}
            {isRegionLoading ? (
              <View style={styles.regionLoadingRow}>
                <ActivityIndicator size="small" color="#8B5CF6" />
                <Text style={styles.regionLoadingText}>Calculating...</Text>
              </View>
            ) : regionSpending ? (
              <View style={styles.statsGrid}>
                {/* Total Spending */}
                <View style={styles.statColumn}>
                  <Text style={styles.statLabel}>Total</Text>
                  <Text style={[styles.statAmount, { color: '#F59E0B' }]}>
                    {formatINR(regionSpending.totalSpending)}
                  </Text>
                  <Text style={styles.statCount}>
                    {regionSpending.transactionCount} txn{regionSpending.transactionCount !== 1 ? 's' : ''}
                  </Text>
                </View>

                {/* Divider */}
                <View style={styles.statDivider} />

                {/* Last 7 Days */}
                <View style={styles.statColumn}>
                  <Text style={styles.statLabel}>Last 7 Days</Text>
                  <Text style={[styles.statAmount, { color: '#EF4444' }]}>
                    {formatINR(regionSpending.last7DaysSpending)}
                  </Text>
                  <Text style={styles.statCount}>
                    {regionSpending.last7DaysCount} txn{regionSpending.last7DaysCount !== 1 ? 's' : ''}
                  </Text>
                </View>

                {/* Divider */}
                <View style={styles.statDivider} />

                {/* Current Month */}
                <View style={styles.statColumn}>
                  <Text style={styles.statLabel}>This Month</Text>
                  <Text style={[styles.statAmount, { color: '#10B981' }]}>
                    {formatINR(regionSpending.currentMonthSpending)}
                  </Text>
                  <Text style={styles.statCount}>
                    {regionSpending.currentMonthCount} txn{regionSpending.currentMonthCount !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            ) : null}
          </GlassCard>
        </View>
      )}

      {/* Floating Top Category Scroll Selection (hidden when search result shown) */}
      {!selectedPlace && (
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
      )}

      {/* Floating Quick Date Filter (Right Side Overlay) — hidden during region view */}
      {!selectedPlace && (
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
      )}

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
                        <View style={{ flexDirection: 'row', marginTop: 6, gap: 12 }}>
                          {onEditTransactionPress && (
                            <Pressable onPress={() => onEditTransactionPress(loc.id)}>
                              <Icons.Edit2 size={12} color="#9CA3AF" />
                            </Pressable>
                          )}
                          <Pressable 
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

  // ── Search Bar ──────────────────────────────────────────────────────
  searchWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: 16,
    right: 16,
    zIndex: 20,
  },
  searchCard: {
    padding: 0,
    borderRadius: 14,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 10 : 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#F3F4F6',
    fontWeight: '500',
    paddingVertical: Platform.OS === 'web' ? 4 : 8,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },

  // ── Autocomplete Dropdown ───────────────────────────────────────────
  autocompleteDropdown: {
    marginTop: 4,
    backgroundColor: 'rgba(11, 15, 25, 0.96)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      },
    }),
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  autocompleteText: {
    flex: 1,
    fontSize: 13,
    color: '#D1D5DB',
    lineHeight: 18,
  },

  // ── Region Spending Summary ─────────────────────────────────────────
  regionSummaryWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 118 : 98,
    left: 16,
    right: 16,
    zIndex: 15,
  },
  regionSummaryCard: {
    padding: 16,
    borderRadius: 16,
  },
  regionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  regionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 12,
  },
  regionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F3F4F6',
    flex: 1,
  },
  regionLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  regionLoadingText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  statAmount: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  statCount: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignSelf: 'center',
  },

  // ── Category Filters (existing) ────────────────────────────────────
  categoryFiltersWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 118 : 98,
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

  // ── Date Filters (existing) ────────────────────────────────────────
  dateFiltersWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 176 : 156,
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

  // ── Bottom Drawer (existing) ───────────────────────────────────────
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
