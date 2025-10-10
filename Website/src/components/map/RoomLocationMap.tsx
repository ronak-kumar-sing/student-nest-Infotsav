'use client';

import React, { useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Circle } from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Navigation } from 'lucide-react';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

interface NearbyFacility {
  name: string;
  type: string;
  distance: string;
}

interface RoomLocationMapProps {
  location: {
    address: string;
    city: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  nearbyFacilities?: NearbyFacility[];
  nearbyUniversities?: Array<{
    name: string;
    distance: string;
  }>;
  height?: string;
}

const facilityIcons: Record<string, string> = {
  metro: '🚇',
  bus: '🚌',
  hospital: '🏥',
  mall: '🛒',
  market: '🏪',
  restaurant: '🍽️',
  gym: '💪',
  bank: '🏦',
  university: '🎓',
};

export function RoomLocationMap({
  location,
  nearbyFacilities = [],
  nearbyUniversities = [],
  height = '400px',
}: RoomLocationMapProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<any>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  if (!isLoaded) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg"
        style={{ height }}
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading map...</p>
        </div>
      </div>
    );
  }

  const center = {
    lat: location.coordinates.lat,
    lng: location.coordinates.lng,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Location & Nearby Facilities
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Map */}
        <div style={{ height }} className="rounded-lg overflow-hidden border mb-4">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={14}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
              zoomControl: true,
              streetViewControl: true,
              mapTypeControl: false,
              fullscreenControl: true,
            }}
          >
            {/* Property Marker */}
            <Marker
              position={center}
              icon={{
                path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                scale: 8,
                fillColor: '#10b981',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                rotation: 270,
              }}
              title={location.address}
              label={{
                text: '🏠',
                fontSize: '24px',
              }}
            />

            {/* 5km Radius Circle */}
            <Circle
              center={center}
              radius={5000} // 5km in meters
              options={{
                strokeColor: '#3b82f6',
                strokeOpacity: 0.3,
                strokeWeight: 2,
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
              }}
            />

            {/* Info Window for Property */}
            <InfoWindow position={center}>
              <div className="p-2">
                <h4 className="font-semibold text-sm mb-1">Property Location</h4>
                <p className="text-xs text-gray-600">{location.address}</p>
                <p className="text-xs text-gray-600">{location.city}</p>
              </div>
            </InfoWindow>
          </GoogleMap>
        </div>

        {/* Nearby Universities */}
        {nearbyUniversities.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span>🎓</span>
              Nearby Universities & Colleges
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {nearbyUniversities.map((uni, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">{uni.name}</p>
                    <p className="text-xs text-gray-600">Distance: {uni.distance}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {uni.distance}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nearby Facilities */}
        {nearbyFacilities.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              Nearby Facilities
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {nearbyFacilities.map((facility, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="text-2xl mb-2">
                    {facilityIcons[facility.type] || '📍'}
                  </div>
                  <p className="text-xs font-medium text-center line-clamp-2 mb-1">
                    {facility.name}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {facility.distance}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Address */}
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Complete Address
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                {location.address}, {location.city}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
                {location.coordinates.lat.toFixed(6)}, {location.coordinates.lng.toFixed(6)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
