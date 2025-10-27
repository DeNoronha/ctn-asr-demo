import React, { useEffect, useRef, useState } from 'react';

interface Location {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
}

interface JourneyLeg {
  legNumber: number;
  origin: Location;
  destination: Location;
  transportMode: string;
  departureDate: string;
  arrivalDate: string;
}

interface JourneyMapProps {
  origin: Location;
  destination: Location;
  transportLegs?: JourneyLeg[];
  containerNumber?: string;
}

const JourneyMap: React.FC<JourneyMapProps> = ({
  origin,
  destination,
  transportLegs,
  containerNumber
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Google Maps API is available
    if (typeof window !== 'undefined' && (window as any).google) {
      initializeMap();
    } else {
      setMapError('Google Maps API not loaded. Add Google Maps API key to enable journey visualization.');
    }
  }, [origin, destination, transportLegs]);

  const geocodeLocation = async (location: Location, google: any): Promise<{ lat: number; lng: number } | null> => {
    // If coordinates already exist, return them
    if (location.lat && location.lng) {
      return { lat: location.lat, lng: location.lng };
    }

    // Geocode using address or name
    const geocoder = new google.maps.Geocoder();
    const searchQuery = location.address || location.name;

    try {
      const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoder.geocode({ address: searchQuery }, (results: google.maps.GeocoderResult[], status: google.maps.GeocoderStatus) => {
          if (status === 'OK' && results && results.length > 0) {
            resolve(results);
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });

      if (result[0]) {
        return {
          lat: result[0].geometry.location.lat(),
          lng: result[0].geometry.location.lng()
        };
      }
    } catch (error) {
      console.error(`Failed to geocode location: ${searchQuery}`, error);
    }

    return null;
  };

  const initializeMap = async () => {
    if (!mapRef.current || !(window as any).google) return;

    const google = (window as any).google;

    // Create map centered between origin and destination
    const map = new google.maps.Map(mapRef.current, {
      zoom: 6,
      center: { lat: 51.9225, lng: 4.47917 }, // Netherlands center
      mapTypeId: 'roadmap'
    });

    const bounds = new google.maps.LatLngBounds();
    const markers: google.maps.Marker[] = [];

    // Calculate distance between two coordinates (in km)
    const calculateDistance = (coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number => {
      const R = 6371; // Earth's radius in km
      const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
      const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // If transport legs are provided, plot them
    if (transportLegs && transportLegs.length > 0) {
      // Focus on last 200km of journey (inland transport)
      const focusBounds = new google.maps.LatLngBounds();
      let focusDistanceKm = 0;
      const maxFocusDistanceKm = 200;

      // Process legs in reverse to accumulate last 200km
      const legsWithCoords: Array<{ leg: JourneyLeg; originCoords: any; destCoords: any; distance: number; index: number }> = [];

      for (let i = 0; i < transportLegs.length; i++) {
        const leg = transportLegs[i];

        // Geocode origin
        const originCoords = await geocodeLocation(leg.origin, google);
        if (originCoords) {
          const marker = new google.maps.Marker({
            position: originCoords,
            map: map,
            title: `Leg ${leg.legNumber}: ${leg.origin.name}`,
            label: i === 0 ? 'A' : String(leg.legNumber),
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: i === 0 ? '#10b981' : '#3b82f6',
              fillOpacity: 1,
              strokeColor: 'white',
              strokeWeight: 2
            }
          });
          markers.push(marker);
          bounds.extend(originCoords);
        }

        // Geocode destination
        const destCoords = await geocodeLocation(leg.destination, google);
        if (destCoords && originCoords) {
          const distance = calculateDistance(originCoords, destCoords);
          legsWithCoords.push({ leg, originCoords, destCoords, distance, index: i });

          const isLastLeg = i === transportLegs.length - 1;
          const marker = new google.maps.Marker({
            position: destCoords,
            map: map,
            title: `Leg ${leg.legNumber}: ${leg.destination.name}`,
            label: isLastLeg ? 'B' : String(leg.legNumber + 1),
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: isLastLeg ? '#ef4444' : '#3b82f6',
              fillOpacity: 1,
              strokeColor: 'white',
              strokeWeight: 2
            }
          });
          markers.push(marker);
          bounds.extend(destCoords);
        }
      }

      // Calculate focus bounds for last 200km
      for (let i = legsWithCoords.length - 1; i >= 0 && focusDistanceKm < maxFocusDistanceKm; i--) {
        const { originCoords, destCoords, distance } = legsWithCoords[i];
        focusBounds.extend(originCoords);
        focusBounds.extend(destCoords);
        focusDistanceKm += distance;
        console.log(`[JourneyMap] Added leg ${i}: ${distance.toFixed(1)}km (total: ${focusDistanceKm.toFixed(1)}km)`);
      }

      // Draw polylines for all legs
      for (const { leg, originCoords, destCoords, distance } of legsWithCoords) {
        const isVessel = leg.transportMode.toLowerCase().includes('vessel') ||
                       leg.transportMode.toLowerCase().includes('ship') ||
                       leg.transportMode.toLowerCase().includes('sea');

        // Skip polyline for long-distance sea routes (> 1000km) to avoid "flying over land" effect
        const shouldDrawPolyline = !isVessel || distance < 1000;

        if (shouldDrawPolyline) {
          new google.maps.Polyline({
            path: [originCoords, destCoords],
            geodesic: true,
            strokeColor: leg.transportMode.toLowerCase().includes('vessel') ? '#0ea5e9' :
                        leg.transportMode.toLowerCase().includes('truck') ? '#f59e0b' : '#3b82f6',
            strokeOpacity: 1.0,
            strokeWeight: 3,
            map: map
          });
        }
      }

      // Use focus bounds (last 200km) for better zoom, or all bounds if journey is short
      console.log(`[JourneyMap] Focus distance: ${focusDistanceKm.toFixed(1)}km, Total legs: ${legsWithCoords.length}, Focus bounds empty: ${focusBounds.isEmpty()}`);
      if (!focusBounds.isEmpty() && focusDistanceKm >= 50) {
        console.log('[JourneyMap] Using focus bounds (last 200km zoom)');
        map.fitBounds(focusBounds);
      } else if (!bounds.isEmpty()) {
        console.log(`[JourneyMap] Using all bounds (journey too short: ${focusDistanceKm.toFixed(1)}km)`);
        map.fitBounds(bounds);
      }
    } else {
      // Fallback: plot simple origin-destination route
      const originCoords = await geocodeLocation(origin, google);
      if (originCoords) {
        new google.maps.Marker({
          position: originCoords,
          map: map,
          title: `Origin: ${origin.name}`,
          label: 'A',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#10b981',
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 2
          }
        });
        bounds.extend(originCoords);
      }

      const destCoords = await geocodeLocation(destination, google);
      if (destCoords) {
        new google.maps.Marker({
          position: destCoords,
          map: map,
          title: `Destination: ${destination.name}`,
          label: 'B',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 2
          }
        });
        bounds.extend(destCoords);

        // Draw route if both coordinates are available
        if (originCoords && destCoords) {
          new google.maps.Polyline({
            path: [originCoords, destCoords],
            geodesic: true,
            strokeColor: '#3b82f6',
            strokeOpacity: 1.0,
            strokeWeight: 3,
            map: map
          });
        }
      }
    }

    // Fit bounds to show all markers
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds);
    }
  };

  // Fallback UI when Google Maps is not available
  if (mapError) {
    return (
      <div style={{
        padding: '2rem',
        background: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🗺️</div>
          <h3 style={{ color: '#374151', marginBottom: '0.5rem' }}>Journey Route</h3>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>{mapError}</p>
        </div>

        <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{
            padding: '1rem',
            background: 'white',
            borderRadius: '8px',
            border: '2px solid #10b981',
            textAlign: 'center',
            minWidth: '200px'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '0.5rem' }}>📍</div>
            <div style={{ fontWeight: 600, color: '#10b981', marginBottom: '0.25rem' }}>Origin</div>
            <div style={{ fontSize: '14px', color: '#374151' }}>{origin.name}</div>
            {origin.address && (
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '0.25rem' }}>{origin.address}</div>
            )}
          </div>

          <div style={{ fontSize: '32px', color: '#9ca3af' }}>→</div>

          <div style={{
            padding: '1rem',
            background: 'white',
            borderRadius: '8px',
            border: '2px solid #ef4444',
            textAlign: 'center',
            minWidth: '200px'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '0.5rem' }}>🎯</div>
            <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: '0.25rem' }}>Destination</div>
            <div style={{ fontSize: '14px', color: '#374151' }}>{destination.name}</div>
            {destination.address && (
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '0.25rem' }}>{destination.address}</div>
            )}
          </div>
        </div>

        {transportLegs && transportLegs.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h4 style={{ color: '#374151', marginBottom: '1rem' }}>Transport Legs</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {transportLegs.map((leg, index) => (
                <div
                  key={index}
                  style={{
                    padding: '0.75rem',
                    background: 'white',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#3b82f6',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 600
                    }}>
                      {leg.legNumber}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>
                        {leg.origin.name} → {leg.destination.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Mode: {leg.transportMode}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'right' }}>
                    <div>{new Date(leg.departureDate).toLocaleDateString()}</div>
                    <div>→ {new Date(leg.arrivalDate).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {containerNumber && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#eff6ff',
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <span style={{ color: '#1e40af', fontSize: '14px', fontWeight: 500 }}>
              Container: {containerNumber}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '400px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}
      />
      {containerNumber && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#eff6ff',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <span style={{ color: '#1e40af', fontSize: '14px', fontWeight: 500 }}>
            Container: {containerNumber}
          </span>
        </div>
      )}
    </div>
  );
};

export default JourneyMap;
