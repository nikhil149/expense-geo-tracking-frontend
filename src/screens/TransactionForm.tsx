import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { useAppStore, Category, Goal } from '../store/useAppStore';
import { GlassCard } from '../components/GlassCard';
import { MapView } from '../components/MapView';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as LucideIcons from 'lucide-react-native';
const Icons = LucideIcons as any;

// Standard mock autocomplete list centered around San Francisco base coordinate (37.7749, -122.4194)
const MOCK_BUSINESSES = [
  { name: 'Starbucks Coffee', category: 'Food & Dining', lat: 37.7765, lng: -122.4172, loc: 'Starbucks, SOMA' },
  { name: 'Blue Bottle Coffee', category: 'Food & Dining', lat: 37.7784, lng: -122.4236, loc: 'Blue Bottle, SOMA' },
  { name: 'Whole Foods Market', category: 'Food & Dining', lat: 37.7725, lng: -122.4024, loc: 'Whole Foods, SOMA' },
  { name: 'Safeway Supermarket', category: 'Food & Dining', lat: 37.7665, lng: -122.4102, loc: 'Safeway, Market St' },
  { name: 'Equinox Gym', category: 'Health & Gym', lat: 37.7804, lng: -122.4219, loc: 'Equinox, Union St' },
  { name: 'Shell Gas Station', category: 'Transport', lat: 37.7687, lng: -122.4306, loc: 'Shell Fuel, Mission St' },
  { name: 'Chevron Station', category: 'Transport', lat: 37.7712, lng: -122.4112, loc: 'Chevron Gas, 9th St' },
  { name: 'Apple Store', category: 'Shopping', lat: 37.7824, lng: -122.4249, loc: 'Apple Union Square' },
  { name: 'AMC Movie Metreon', category: 'Entertainment', lat: 37.7797, lng: -122.4225, loc: 'AMC Metreon SOMA' },
  { name: 'CVS Pharmacy', category: 'Health & Gym', lat: 37.7771, lng: -122.4159, loc: 'CVS, SOMA' },
];

interface TransactionFormProps {
  transactionId?: number | null; // If editing
  onClose: () => void;
}

export const TransactionForm = ({
  transactionId = null,
  onClose,
}: TransactionFormProps) => {
  const {
    categories,
    goals,
    isLoading,
    createTransaction,
    updateTransaction,
    transactions,
    createCategory,
  } = useAppStore();

  const isEditing = transactionId !== null;

  // Form fields
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense' | 'investment' | 'transfer'>('expense');
  const [date, setDate] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [goalId, setGoalId] = useState<number | null>(null);

  // Geospatial coordinate states
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationName, setLocationName] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Autocomplete UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSuggestions, setMapSuggestions] = useState<any[]>([]);
  const searchTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const mapSearchTimeout = React.useRef<NodeJS.Timeout | null>(null);

  // Add custom category mini form states
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#8B5CF6');
  const [newCatIcon, setNewCatIcon] = useState('tag');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);

  // Load existing transaction for Editing
  useEffect(() => {
    if (isEditing) {
      const tx = transactions.find((t) => t.id === transactionId);
      if (tx) {
        setTitle(tx.title);
        setAmount(String(tx.amount));
        setType(tx.type);
        // Format ISO Date for input
        setDate(new Date(tx.date).toISOString().split('T')[0]);
        setCategoryId(tx.category_id);
        setNotes(tx.notes || '');
        setLatitude(tx.latitude);
        setLongitude(tx.longitude);
        setLocationName(tx.location_name || '');
        setGoalId(tx.linked_goal_id || null);
      }
    } else {
      // Default to today
      setDate(new Date().toISOString().split('T')[0]);
      // Default category to Food & Dining if seeded
      const defaultCat = categories.find((c) => c.name.includes('Food'));
      if (defaultCat) setCategoryId(defaultCat.id);
    }
  }, [transactionId, isEditing, categories]);

  // Auto-fetch GPS on form mount for new transactions
  useEffect(() => {
    if (!isEditing) {
      handleFetchGPSLocation();
    }
  }, [isEditing]);

  // Handle dedicated Google Maps-style location search
  const handleMapSearchChange = async (query: string) => {
    setMapSearchQuery(query);
    if (query.length > 2) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=6`,
          {
            headers: {
              'User-Agent': 'ExpenseGeoTrackingApp/1.0',
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          const formatted = data.map((item: any) => {
            const addr = item.address;
            const name = item.name || addr.amenity || addr.shop || addr.building || addr.road || query;
            const fullLoc = item.display_name;
            return {
              name: name,
              loc: fullLoc,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              category: addr.shop || addr.amenity || 'Shopping',
            };
          });
          setMapSuggestions(formatted);
        }
      } catch (err) {
        // Fallback silently
      }
    } else {
      setMapSuggestions([]);
    }
  };

  const handleSelectMapSuggestion = (suggestion: any) => {
    setLocationName(suggestion.loc.split(',').slice(0, 3).join(', '));
    setLatitude(suggestion.lat);
    setLongitude(suggestion.lng);

    // Auto populate transaction title if empty
    if (!title) {
      setTitle(suggestion.name);
    }

    // Pre-select category based on location categories
    const sugCat = (suggestion.category || '').toLowerCase();
    const matchCat = categories.find((c) => {
      const catLower = c.name.toLowerCase();
      return sugCat.includes(catLower) || catLower.includes(sugCat);
    });
    if (matchCat) {
      setCategoryId(matchCat.id);
    }

    setMapSuggestions([]);
    setMapSearchQuery('');
  };

  // Handle store names autocomplete matching via real OSM Nominatim Search API
  const handleLocationSearchChange = (query: string) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (query.length > 2) {
      searchTimeout.current = setTimeout(async () => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=6`,
            {
              headers: {
                'User-Agent': 'ExpenseGeoTrackingApp/1.0',
              },
            }
          );
          if (response.ok) {
            const data = await response.json();
            const formatted = data.map((item: any) => {
              const addr = item.address;
              const name = item.name || addr.amenity || addr.shop || addr.building || addr.road || query;
              const fullLoc = item.display_name;
              return {
                name: name,
                loc: fullLoc.split(',').slice(0, 3).join(', '),
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                category: addr.shop || addr.amenity || 'Shopping',
              };
            });
            setSuggestions(formatted);
          }
        } catch (error) {
          console.log('Search API Error', error);
        }
      }, 800);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (suggestion: any) => {
    setTitle(suggestion.name);
    setLocationName(suggestion.loc);
    setLatitude(suggestion.lat);
    setLongitude(suggestion.lng);
    setSuggestions([]);
    setSearchQuery('');

    // Pre-select category based on suggestion
    const sugCat = (suggestion.category || '').toLowerCase();
    const matchCat = categories.find((c) => {
      const catLower = c.name.toLowerCase();
      return sugCat.includes(catLower) || catLower.includes(sugCat);
    });
    if (matchCat) {
      setCategoryId(matchCat.id);
    } else {
      const nameLower = suggestion.name.toLowerCase();
      if (nameLower.includes('starbucks') || nameLower.includes('coffee') || nameLower.includes('cafe') || nameLower.includes('food') || nameLower.includes('restaurant')) {
        const cat = categories.find(c => c.name.toLowerCase().includes('food') || c.name.toLowerCase().includes('dining'));
        if (cat) setCategoryId(cat.id);
      } else if (nameLower.includes('gym') || nameLower.includes('fitness') || nameLower.includes('sport')) {
        const cat = categories.find(c => c.name.toLowerCase().includes('health') || c.name.toLowerCase().includes('gym') || c.name.toLowerCase().includes('fitness'));
        if (cat) setCategoryId(cat.id);
      } else if (nameLower.includes('fuel') || nameLower.includes('gas') || nameLower.includes('station') || nameLower.includes('chevron') || nameLower.includes('shell')) {
        const cat = categories.find(c => c.name.toLowerCase().includes('transport') || c.name.toLowerCase().includes('car'));
        if (cat) setCategoryId(cat.id);
      } else if (nameLower.includes('shop') || nameLower.includes('store') || nameLower.includes('mall') || nameLower.includes('grocery') || nameLower.includes('supermarket')) {
        const cat = categories.find(c => c.name.toLowerCase().includes('shop'));
        if (cat) setCategoryId(cat.id);
      }
    }
  };

  // Taps Device GPS button: calls native Location module & does reverse-geocoding
  const handleFetchGPSLocation = async () => {
    setIsLocating(true);
    setFormError(null);
    try {
      let lat: number | null = null;
      let lng: number | null = null;

      if (Platform.OS === 'web') {
        if ('geolocation' in navigator) {
          const posPromise = new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
          });
          const pos = await posPromise;
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } else {
          throw new Error('Web Geolocation is not supported by your browser.');
        }
      } else {
        const Location = require('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('GPS permission denied.');
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }

      if (lat && lng) {
        setLatitude(lat);
        setLongitude(lng);
        setUserLocation({ latitude: lat, longitude: lng });

        // Reverse-geocoding using OSM Nominatim API
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'ExpenseGeoTrackingApp/1.0',
              },
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              const addr = data.address;
              const shortAddr = addr
                ? [addr.amenity || addr.shop || addr.building, addr.road, addr.suburb || addr.neighbourhood, addr.city || addr.town]
                    .filter(Boolean)
                    .slice(0, 2)
                    .join(', ') || data.display_name.split(',').slice(0, 2).join(',')
                : data.display_name.split(',').slice(0, 2).join(',');
              setLocationName(shortAddr);
            } else {
              setLocationName('My GPS Location');
            }
          } else {
            setLocationName('My GPS Location');
          }
        } catch (e) {
          setLocationName('My GPS Location');
        }
      }
    } catch (err: any) {
      setFormError(`GPS failed: ${err.message}`);
    } finally {
      setIsLocating(false);
    }
  };

  // drops a coordinate selection marker from MapSelector
  const handleMapPinDrop = (coords: { latitude: number; longitude: number; location_name?: string }) => {
    setLatitude(coords.latitude);
    setLongitude(coords.longitude);
    if (!locationName) {
      setLocationName(coords.location_name || 'Dropped Pin');
    }
  };

  const handleCreateCustomCategory = async () => {
    if (!newCatName) return;
    try {
      const newCat = await createCategory(newCatName, newCatColor, newCatIcon);
      setCategoryId(newCat.id);
      setNewCatName('');
      setShowAddCat(false);
    } catch (e: any) {
      alert(e.message || 'Error creating custom category');
    }
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!title || !amount || !date) {
      setFormError('Store Name, Amount, and Date are required.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid positive amount.');
      return;
    }

    const payload = {
      title,
      amount: parsedAmount,
      type,
      date: new Date(date).toISOString(),
      category_id: categoryId,
      latitude,
      longitude,
      location_name: locationName || null,
      notes: notes || null,
      goal_id: type === 'investment' || goalId ? goalId : null,
    };

    try {
      if (isEditing) {
        await updateTransaction(transactionId as number, payload);
      } else {
        await createTransaction(payload);
      }
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record transaction');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title / Close Header */}
        <View style={styles.headerRow}>
          <Text style={styles.titleText}>
            {isEditing ? 'Modify Transaction' : 'Record Transaction'}
          </Text>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Icons.X size={18} color="#9CA3AF" />
          </Pressable>
        </View>

        {formError && <Text style={styles.errorText}>{formError}</Text>}

        {/* Transaction Type Selector */}
        <View style={styles.typeSelector}>
          {(['expense', 'income', 'investment', 'transfer'] as const).map((t) => {
            const label = t === 'transfer' ? 'Self/Family' : t;
            return (
            <Pressable
              key={t}
              style={[
                styles.typeBtn,
                type === t && styles.typeBtnActive,
                type === t && t === 'expense' && { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
                type === t && t === 'income' && { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
                type === t && t === 'investment' && { backgroundColor: 'rgba(99, 102, 241, 0.15)' },
                type === t && t === 'transfer' && { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
              ]}
              onPress={() => setType(t)}
            >
              <Text
                style={[
                  styles.typeBtnText,
                  type === t && {
                    color: t === 'expense' ? '#EF4444' : t === 'income' ? '#10B981' : t === 'investment' ? '#6366F1' : '#F59E0B',
                    fontWeight: '800',
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
            );
          })}
        </View>

        {/* Autocomplete Location Input */}
        <Text style={styles.inputLabel}>Place/Store Name</Text>
        <View style={styles.searchWrapper}>
          <TextInput
            placeholder="Type store name (e.g. Starbucks, Safeway...)"
            placeholderTextColor="#6B7280"
            value={isEditing ? title : searchQuery || title}
            onChangeText={(txt) => {
              if (isEditing) setTitle(txt);
              else {
                setTitle(txt);
                handleLocationSearchChange(txt);
              }
            }}
            style={styles.formInput}
          />
          {suggestions.length > 0 && (
            <View style={styles.suggestionsCard}>
              {suggestions.map((item, idx) => (
                <Pressable
                  key={idx}
                  style={styles.suggestionItem}
                  onPress={() => handleSelectSuggestion(item)}
                >
                  <Text style={styles.suggestionName}>{item.name}</Text>
                  <Text style={styles.suggestionLoc}>{item.loc}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Amount & Date */}
        <View style={styles.inputRow}>
          <View style={styles.inputCol}>
            <Text style={styles.inputLabel}>Amount (₹)</Text>
            <TextInput
              placeholder="0.00"
              placeholderTextColor="#6B7280"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              style={styles.formInput}
            />
          </View>
          <View style={styles.inputCol}>
            <Text style={styles.inputLabel}>Date</Text>
            {Platform.OS === 'web' ? (
              <TextInput
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#6B7280"
                value={date}
                onChangeText={setDate}
                style={styles.formInput}
                // @ts-ignore
                type="date"
              />
            ) : (
              <>
                <Pressable onPress={() => setShowDatePicker(true)} style={[styles.formInput, { justifyContent: 'center' }]}>
                  <Text style={{ color: date ? '#FFFFFF' : '#6B7280' }}>
                    {date || 'Select Date'}
                  </Text>
                </Pressable>
                {showDatePicker && (
                  <DateTimePicker
                    value={date ? new Date(date) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(event: any, selectedDate?: Date) => {
                      if (Platform.OS === 'android') setShowDatePicker(false);
                      if (event.type === 'set' && selectedDate) {
                        setDate(selectedDate.toISOString().split('T')[0]);
                      }
                      if (event.type === 'dismissed') {
                        setShowDatePicker(false);
                      }
                    }}
                  />
                )}
              </>
            )}
          </View>
        </View>

        {/* Categories Selection */}
        <View style={styles.categoryHeadingRow}>
          <Text style={styles.inputLabel}>Category</Text>
          <Pressable onPress={() => setShowAddCat(!showAddCat)}>
            <Text style={styles.addCatLink}>{showAddCat ? 'Cancel' : '+ Custom'}</Text>
          </Pressable>
        </View>

        {/* Mini custom category form */}
        {showAddCat && (
          <GlassCard style={styles.miniCatForm}>
            <Text style={styles.miniCatFormTitle}>Create Custom Category</Text>
            <TextInput
              placeholder="e.g. Subscriptions, Gifts..."
              placeholderTextColor="#6B7280"
              value={newCatName}
              onChangeText={setNewCatName}
              style={styles.formInput}
            />
            <View style={styles.catColorsRow}>
              {['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'].map((col) => (
                <Pressable
                  key={col}
                  style={[
                    styles.catColorOption,
                    { backgroundColor: col },
                    newCatColor === col && styles.catColorSelected,
                  ]}
                  onPress={() => setNewCatColor(col)}
                />
              ))}
            </View>
            <Pressable style={styles.saveCatBtn} onPress={handleCreateCustomCategory}>
              <Text style={styles.saveCatBtnText}>Add Category</Text>
            </Pressable>
          </GlassCard>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((cat) => {
            const isSelected = categoryId === cat.id;
            return (
              <Pressable
                key={cat.id}
                style={[
                  styles.categoryOption,
                  isSelected && {
                    backgroundColor: cat.color,
                    borderColor: cat.color,
                  },
                ]}
                onPress={() => setCategoryId(cat.id)}
              >
                <Text
                  style={[
                    styles.categoryOptionText,
                    isSelected && styles.categoryOptionTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Savings Goal integration */}
        {(type === 'investment' || goalId !== null) && (
          <View style={styles.goalSelectWrapper}>
            <Text style={styles.inputLabel}>Link to Savings Goal</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.goalScroll}
            >
              <Pressable
                style={[styles.goalOption, goalId === null && styles.goalOptionActive]}
                onPress={() => setGoalId(null)}
              >
                <Text style={[styles.goalOptionText, goalId === null && styles.goalOptionTextActive]}>
                  Unlinked
                </Text>
              </Pressable>
              {goals.map((g) => {
                const isSelected = goalId === g.id;
                return (
                  <Pressable
                    key={g.id}
                    style={[
                      styles.goalOption,
                      isSelected && { backgroundColor: g.color, borderColor: g.color },
                    ]}
                    onPress={() => setGoalId(g.id)}
                  >
                    <Text
                      style={[
                        styles.goalOptionText,
                        isSelected && styles.goalOptionTextActive,
                      ]}
                    >
                      {g.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Location Section */}
        <View style={styles.locationHeaderRow}>
          <Text style={styles.inputLabel}>Geospatial Location Coordinates</Text>
          <Pressable
            style={styles.gpsBtn}
            onPress={handleFetchGPSLocation}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color="#8B5CF6" />
            ) : (
              <>
                <Icons.Compass size={12} color="#8B5CF6" />
                <Text style={styles.gpsBtnText}>Use GPS</Text>
              </>
            )}
          </Pressable>
        </View>

        <TextInput
          placeholder="Location Name/Store Address (e.g. SOMA Coffee Shop)"
          placeholderTextColor="#6B7280"
          value={locationName}
          onChangeText={setLocationName}
          style={styles.formInput}
        />

        <View style={styles.coordDisplayRow}>
          <View style={styles.coordBox}>
            <Text style={styles.coordLabel}>Latitude</Text>
            <Text style={styles.coordVal}>
              {latitude ? latitude.toFixed(6) : 'Not selected'}
            </Text>
          </View>
          <View style={styles.coordBox}>
            <Text style={styles.coordLabel}>Longitude</Text>
            <Text style={styles.coordVal}>
              {longitude ? longitude.toFixed(6) : 'Not selected'}
            </Text>
          </View>
        </View>

        {latitude && longitude && (
          <Pressable
            style={styles.googleMapsBtn}
            onPress={() => {
              const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
              Linking.openURL(url).catch((err) => alert('Error opening map: ' + err.message));
            }}
          >
            <Icons.Compass size={14} color="#10B981" />
            <Text style={styles.googleMapsBtnText}>Open in Google Maps</Text>
          </Pressable>
        )}

        {/* Dedicated Google Maps-style Search Bar */}
        <Text style={[styles.inputLabel, { marginTop: 4 }]}>Search Map Location (Google Maps style)</Text>
        <View style={styles.mapSearchWrapper}>
          <View style={styles.mapSearchBox}>
            <Icons.Search size={14} color="#6B7280" style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search place, city, landmark to center map..."
              placeholderTextColor="#6B7280"
              value={mapSearchQuery}
              onChangeText={handleMapSearchChange}
              style={styles.mapSearchInput}
            />
            {mapSearchQuery ? (
              <Pressable onPress={() => { setMapSearchQuery(''); setMapSuggestions([]); }}>
                <Icons.X size={14} color="#6B7280" />
              </Pressable>
            ) : null}
          </View>
          {mapSuggestions.length > 0 && (
            <View style={styles.mapSuggestionsCard}>
              {mapSuggestions.map((item, idx) => (
                <Pressable
                  key={idx}
                  style={styles.mapSuggestionItem}
                  onPress={() => handleSelectMapSuggestion(item)}
                >
                  <Icons.MapPin size={12} color="#8B5CF6" style={{ marginRight: 8, marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestionName}>{item.name}</Text>
                    <Text style={styles.suggestionLoc} numberOfLines={1}>{item.loc}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Interactive Map Pin Dropper Embedded Selector */}
        <Text style={[styles.inputLabel, { marginTop: 8 }]}>
          Manual Pin Placement (Tap map below to drop coordinate marker)
        </Text>
        <View style={styles.embeddedMapWrapper}>
          <MapView
            locations={[]}
            interactive={true}
            onPinSelect={handleMapPinDrop}
            selectedPin={latitude && longitude ? { latitude, longitude } : null}
            userLocation={userLocation}
          />
        </View>

        {/* Notes */}
        <Text style={[styles.inputLabel, { marginTop: 14 }]}>Notes & Details</Text>
        <TextInput
          placeholder="Enter details of transaction..."
          placeholderTextColor="#6B7280"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={[styles.formInput, styles.notesInput]}
        />

        {/* Submit */}
        <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>
              {isEditing ? 'Save Changes' : 'Record Transaction'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
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
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: Platform.OS === 'ios' ? 40 : 10,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F3F4F6',
  },
  closeBtn: {
    padding: 6,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 14,
    fontWeight: '600',
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  typeBtnActive: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  typeBtnText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  inputLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  searchWrapper: {
    position: 'relative',
    zIndex: 20,
  },
  formInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    color: '#FFFFFF',
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
    marginBottom: 14,
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  suggestionsCard: {
    position: 'absolute',
    top: 42,
    left: 0,
    right: 0,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    zIndex: 100,
    maxHeight: 180,
    overflow: 'scroll',
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  suggestionName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionLoc: {
    color: '#9CA3AF',
    fontSize: 10,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    zIndex: 10,
  },
  inputCol: {
    flex: 1,
  },
  categoryHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    zIndex: 10,
  },
  addCatLink: {
    color: '#8B5CF6',
    fontSize: 11,
    fontWeight: '700',
  },
  miniCatForm: {
    padding: 14,
    marginBottom: 14,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  miniCatFormTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  catColorsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  catColorOption: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  catColorSelected: {
    borderColor: '#FFFFFF',
  },
  saveCatBtn: {
    backgroundColor: '#8B5CF6',
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveCatBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryScroll: {
    gap: 8,
    marginBottom: 14,
    zIndex: 10,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryOptionText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  goalSelectWrapper: {
    marginBottom: 14,
  },
  goalScroll: {
    gap: 8,
  },
  goalOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  goalOptionActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  goalOptionText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  goalOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  gpsBtnText: {
    color: '#8B5CF6',
    fontSize: 10,
    fontWeight: '700',
  },
  coordDisplayRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  coordBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  coordLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '600',
  },
  coordVal: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  embeddedMapWrapper: {
    height: 180,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  notesInput: {
    height: 70,
    textAlignVertical: 'top',
    paddingVertical: 10,
  },
  submitBtn: {
    backgroundColor: '#8B5CF6',
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  googleMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  googleMapsBtnText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  mapSearchWrapper: {
    position: 'relative',
    zIndex: 30,
    marginBottom: 12,
  },
  mapSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  mapSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    height: '100%',
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  mapSuggestionsCard: {
    position: 'absolute',
    top: 42,
    left: 0,
    right: 0,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    zIndex: 100,
    maxHeight: 180,
    overflow: 'scroll',
  },
  mapSuggestionItem: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
});
