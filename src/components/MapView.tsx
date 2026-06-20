import * as React from 'react';
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import NativeMap, { Marker as NativeMarker } from 'react-native-maps';

interface MapLocation {
  id: number;
  title: string;
  amount: number;
  type: string;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  category_name?: string;
  category_color?: string;
}

interface MapViewProps {
  locations: MapLocation[];
  onPinSelect?: (coords: { latitude: number; longitude: number; location_name?: string }) => void;
  interactive?: boolean;
  selectedPin?: { latitude: number; longitude: number } | null;
  userLocation?: { latitude: number; longitude: number } | null;
}

export const MapView = ({
  locations,
  onPinSelect,
  interactive = false,
  selectedPin = null,
  userLocation = null,
}: MapViewProps) => {
  const validLocations = locations.filter((loc: MapLocation) => loc.latitude && loc.longitude);
  const mapRef = useRef<NativeMap>(null);

  useEffect(() => {
    if (selectedPin && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: selectedPin.latitude,
        longitude: selectedPin.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 1000);
    } else if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 1000);
    }
  }, [selectedPin, userLocation]);

  const initialRegion = selectedPin
    ? {
        latitude: selectedPin.latitude,
        longitude: selectedPin.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }
    : {
        latitude: validLocations.length > 0 ? (validLocations[0].latitude as number) : 20.5937,
        longitude: validLocations.length > 0 ? (validLocations[0].longitude as number) : 78.9629,
        latitudeDelta: validLocations.length > 0 ? 0.05 : 20.0,
        longitudeDelta: validLocations.length > 0 ? 0.05 : 20.0,
      };

  const handlePress = (e: any) => {
    if (!interactive || !onPinSelect) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    onPinSelect({ latitude, longitude, location_name: 'Dropped Pin' });
  };

  return (
    <NativeMap
      ref={mapRef}
      style={styles.nativeMap}
      initialRegion={initialRegion}
      customMapStyle={darkMapStyle}
      onPress={handlePress}
      showsUserLocation={true}
      showsMyLocationButton={true}
    >
      {validLocations.map((loc: MapLocation) => (
        <NativeMarker
          key={loc.id}
          coordinate={{ latitude: loc.latitude as number, longitude: loc.longitude as number }}
          title={loc.title}
          description={`${loc.type === 'income' ? '+' : '-'}₹${loc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} - ${loc.location_name || ''}`}
          pinColor={loc.category_color || '#8B5CF6'}
        />
      ))}

      {selectedPin && (
        <NativeMarker
          coordinate={selectedPin}
          title="Selected Location"
          pinColor="#8B5CF6"
        />
      )}
    </NativeMap>
  );
};

// Dark style JSON matching dark mode for Native Google Maps
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#263c3f' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#38414e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212a37' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca5b3' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#746855' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2835' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f3d19c' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f3948' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#17263c' }],
  },
];

const styles = StyleSheet.create({
  nativeMap: {
    ...StyleSheet.absoluteFillObject,
  },
});
