import * as React from 'react';
import { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';

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
}

export const MapView = ({
  locations,
  onPinSelect,
  interactive = false,
  selectedPin = null,
}: MapViewProps) => {
  const iframeRef = useRef<any>(null);

  // Parse locations that have valid coordinates
  const validLocations = locations.filter((loc: MapLocation) => loc.latitude && loc.longitude);

  // Listen to messages from Leaflet Iframe (Web Platform)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleMapMessage = (event: MessageEvent) => {
      // Safety check: verify data is from our map
      if (event.data && event.data.type === 'MAP_CLICK') {
        const { lat, lng } = event.data;
        if (onPinSelect) {
          onPinSelect({ latitude: lat, longitude: lng, location_name: 'Dropped Pin' });
        }
      }
    };

    window.addEventListener('message', handleMapMessage);
    return () => window.removeEventListener('message', handleMapMessage);
  }, [onPinSelect]);

  // Update Web Leaflet Map markers when props change
  useEffect(() => {
    if (Platform.OS !== 'web' || !iframeRef.current) return;
    
    // Send updated locations to iframe
    const updateIframe = () => {
      try {
        iframeRef.current.contentWindow.postMessage(
          {
            type: 'UPDATE_MARKERS',
            locations: validLocations,
            interactive,
            selectedPin,
          },
          '*'
        );
      } catch (e) {
        // Iframe might not be loaded yet
      }
    };

    // Trigger update after a short delay to ensure iframe loaded
    const timer = setTimeout(updateIframe, 400);
    return () => clearTimeout(timer);
  }, [validLocations, interactive, selectedPin]);

  if (Platform.OS === 'web') {
    // Generate self-contained Leaflet Map HTML
    const baseLat = selectedPin?.latitude || (validLocations.length > 0 ? validLocations[0].latitude : 37.7749);
    const baseLng = selectedPin?.longitude || (validLocations.length > 0 ? validLocations[0].longitude : -122.4194);
    
    const srcDocContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #0B0F19; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          .leaflet-popup-content-wrapper {
            background: rgba(17, 24, 39, 0.95);
            color: #fff;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            backdrop-filter: blur(8px);
            box-shadow: 0 4px 16px rgba(0,0,0,0.4);
            padding: 2px;
          }
          .leaflet-popup-tip { background: rgba(17, 24, 39, 0.95); border: 1px solid rgba(255, 255, 255, 0.08); }
          .popup-title { font-weight: 700; font-size: 13px; color: #F3F4F6; margin: 0 0 2px 0; }
          .popup-row { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
          .popup-amount { font-size: 15px; font-weight: 800; }
          .popup-type { font-size: 9px; padding: 1px 6px; border-radius: 4px; font-weight: bold; text-transform: uppercase; }
          .popup-loc { font-size: 10px; color: #9CA3AF; margin-top: 1px; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          let map = L.map('map', { zoomControl: false }).setView([${baseLat}, ${baseLng}], 13);
          
          L.control.zoom({ position: 'topright' }).addTo(map);

          L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CartoDB'
          }).addTo(map);

          let markerGroup = L.layerGroup().addTo(map);
          let interactionMarker = null;

          function renderMarkers(locations, interactiveMode, selPin) {
            markerGroup.clearLayers();

            // 1. Draw transactions pins
            locations.forEach(loc => {
              const amountStr = loc.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
              const catColor = loc.category_color || '#8B5CF6';
              const typeColor = loc.type === 'income' ? '#10B981' : loc.type === 'investment' ? '#6366F1' : '#EF4444';
              
              // Custom SVG Marker icon matching category colors
              const customIcon = L.divIcon({
                className: 'custom-div-icon',
                html: '<div style="background-color: ' + catColor + '; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.5);"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
              });

              const marker = L.marker([loc.latitude, loc.longitude], { icon: customIcon }).addTo(markerGroup);
              
              const popupContent = \`
                <div>
                  <div class="popup-title">\${loc.title}</div>
                  <div class="popup-loc">\${loc.location_name || ''}</div>
                  <div class="popup-row">
                    <span class="popup-amount" style="color: \${typeColor}">\${amountStr}</span>
                    <span class="popup-type" style="background-color: \${catColor}; color: #fff">\${loc.category_name || 'Spent'}</span>
                  </div>
                </div>
              \`;

              marker.bindPopup(popupContent);
            });

            // 2. Draw selection pin
            if (selPin) {
              const selIcon = L.divIcon({
                className: 'selected-div-icon',
                html: '<div style="background-color: #8B5CF6; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px #8B5CF6; animation: pulse 1.5s infinite;"></div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              });

              if (interactionMarker) {
                map.removeLayer(interactionMarker);
              }
              interactionMarker = L.marker([selPin.latitude, selPin.longitude], { icon: selIcon }).addTo(map);
              map.panTo([selPin.latitude, selPin.longitude]);
            }
          }

          // Initial markers paint
          renderMarkers(${JSON.stringify(validLocations)}, ${interactive}, ${selectedPin ? JSON.stringify(selectedPin) : 'null'});

          // Click handling for Interactive mode (dropping pins)
          map.on('click', function(e) {
            window.parent.postMessage({
              type: 'MAP_CLICK',
              lat: e.latlng.lat,
              lng: e.latlng.lng
            }, '*');
          });

          // Hear update events from parent react component
          window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'UPDATE_MARKERS') {
              renderMarkers(event.data.locations, event.data.interactive, event.data.selectedPin);
            }
          });
        </script>
      </body>
      </html>
    `;

    return (
      <View style={styles.webContainer}>
        <iframe
          ref={iframeRef}
          srcDoc={srcDocContent}
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: 16 }}
          title="Geospatial Spending Map"
        />
      </View>
    );
  }

  // Native iOS / Android Map View Fallback
  // Importing conditionally to prevent crash on Web environments
  let NativeMap: any = null;
  let NativeMarker: any = null;
  try {
    const RNMaps = require('react-native-maps');
    NativeMap = RNMaps.default;
    NativeMarker = RNMaps.Marker;
  } catch (err) {
    // In React Native Web context
  }

  if (NativeMap && NativeMarker) {
    const initialRegion = selectedPin
      ? {
          latitude: selectedPin.latitude,
          longitude: selectedPin.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }
      : {
          latitude: validLocations.length > 0 ? (validLocations[0].latitude as number) : 37.7749,
          longitude: validLocations.length > 0 ? (validLocations[0].longitude as number) : -122.4194,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };

    const handlePress = (e: any) => {
      if (!interactive || !onPinSelect) return;
      const { latitude, longitude } = e.nativeEvent.coordinate;
      onPinSelect({ latitude, longitude, location_name: 'Dropped Pin' });
    };

    return (
      <NativeMap
        style={styles.nativeMap}
        initialRegion={initialRegion}
        customMapStyle={darkMapStyle}
        onPress={handlePress}
      >
        {validLocations.map((loc: MapLocation) => (
          <NativeMarker
            key={loc.id}
            coordinate={{ latitude: loc.latitude as number, longitude: loc.longitude as number }}
            title={loc.title}
            description={`${loc.type === 'income' ? '+' : '-'}$${loc.amount.toFixed(2)} - ${loc.location_name || ''}`}
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
  }

  return (
    <View style={styles.fallbackContainer}>
      <Text style={styles.fallbackText}>Interactive Map Loading...</Text>
    </View>
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
  webContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0B0F19',
  },
  nativeMap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#0B0F19',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
});
