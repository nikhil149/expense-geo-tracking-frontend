import * as React from 'react';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

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
  region?: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null;
}

export const MapView = ({
  locations,
  onPinSelect,
  interactive = false,
  selectedPin = null,
  userLocation = null,
  region = null,
}: MapViewProps) => {
  const iframeRef = useRef<any>(null);

  // Parse locations that have valid coordinates
  const validLocations = locations.filter((loc: MapLocation) => loc.latitude && loc.longitude);

  // Listen to messages from Leaflet Iframe (Web Platform)
  useEffect(() => {
    const handleMapMessage = (event: MessageEvent) => {
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
    if (!iframeRef.current) return;
    
    const updateIframe = () => {
      try {
        iframeRef.current.contentWindow.postMessage(
          {
            type: 'UPDATE_MARKERS',
            locations: validLocations,
            interactive,
            selectedPin,
            userLocation,
          },
          '*'
        );
      } catch (e) {
        // Iframe might not be loaded yet
      }
    };

    const timer = setTimeout(updateIframe, 400);
    return () => clearTimeout(timer);
  }, [validLocations, interactive, selectedPin, userLocation]);

  // Fly to region when search result is selected
  useEffect(() => {
    if (!region || !iframeRef.current) return;
    try {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'FLY_TO_REGION',
          lat: region.latitude,
          lng: region.longitude,
          latDelta: region.latitudeDelta,
          lngDelta: region.longitudeDelta,
        },
        '*'
      );
    } catch (e) {
      // Iframe might not be loaded yet
    }
  }, [region]);

  const baseLat = selectedPin?.latitude || userLocation?.latitude || (validLocations.length > 0 ? validLocations[0].latitude : 37.7749);
  const baseLng = selectedPin?.longitude || userLocation?.longitude || (validLocations.length > 0 ? validLocations[0].longitude : -122.4194);
  
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
        
        @keyframes userPulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        .user-location-pulse {
          background-color: #3B82F6;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
          animation: userPulse 2s infinite;
        }
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
        let userLocMarker = null;

        function renderMarkers(locations, interactiveMode, selPin, uLoc) {
          markerGroup.clearLayers();

          locations.forEach(loc => {
            const amountStr = loc.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
            const catColor = loc.category_color || '#8B5CF6';
            const typeColor = loc.type === 'income' ? '#10B981' : loc.type === 'investment' ? '#6366F1' : '#EF4444';
            
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

          if (selPin) {
            const selIcon = L.divIcon({
              className: 'selected-div-icon',
              html: '<div style="background-color: #8B5CF6; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px #8B5CF6;"></div>',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });

            if (interactionMarker) {
              map.removeLayer(interactionMarker);
            }
            interactionMarker = L.marker([selPin.latitude, selPin.longitude], { icon: selIcon }).addTo(map);
            map.flyTo([selPin.latitude, selPin.longitude], 15, { animate: true, duration: 1.5 });
          } else if (interactionMarker) {
            map.removeLayer(interactionMarker);
            interactionMarker = null;
          }

          if (uLoc) {
            const uLocIcon = L.divIcon({
              className: 'user-loc-div-icon',
              html: '<div class="user-location-pulse"></div>',
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            });

            if (userLocMarker) {
              map.removeLayer(userLocMarker);
            }
            userLocMarker = L.marker([uLoc.latitude, uLoc.longitude], { icon: uLocIcon }).addTo(map);
            
            if (!selPin && locations.length === 0) {
              map.flyTo([uLoc.latitude, uLoc.longitude], 15, { animate: true, duration: 1.5 });
            }
          } else if (userLocMarker) {
            map.removeLayer(userLocMarker);
            userLocMarker = null;
          }
        }

        renderMarkers(${JSON.stringify(validLocations)}, ${interactive}, ${selectedPin ? JSON.stringify(selectedPin) : 'null'}, ${userLocation ? JSON.stringify(userLocation) : 'null'});

        map.on('click', function(e) {
          window.parent.postMessage({
            type: 'MAP_CLICK',
            lat: e.latlng.lat,
            lng: e.latlng.lng
          }, '*');
        });

        window.addEventListener('message', function(event) {
          if (event.data && event.data.type === 'UPDATE_MARKERS') {
            renderMarkers(event.data.locations, event.data.interactive, event.data.selectedPin, event.data.userLocation);
          }
          if (event.data && event.data.type === 'FLY_TO_REGION') {
            var lat = event.data.lat;
            var lng = event.data.lng;
            var latDelta = event.data.latDelta;
            var lngDelta = event.data.lngDelta;
            var southWest = L.latLng(lat - latDelta / 2, lng - lngDelta / 2);
            var northEast = L.latLng(lat + latDelta / 2, lng + lngDelta / 2);
            map.flyToBounds(L.latLngBounds(southWest, northEast), { animate: true, duration: 1.5, padding: [20, 20] });
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
};

const styles = StyleSheet.create({
  webContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0B0F19',
  },
});
