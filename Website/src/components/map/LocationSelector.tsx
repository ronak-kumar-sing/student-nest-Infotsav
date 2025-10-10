'use client';

import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Navigation, Search } from 'lucide-react';
import { toast } from 'sonner';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 28.6139, // Delhi
  lng: 77.2090,
};

// Fix #1: Static libraries array (prevents LoadScript reload warning)
const GOOGLE_MAPS_LIBRARIES: ("places")[] = ['places'];

interface LocationSelectorProps {
  onLocationSelect: (location: {
    address: string;
    city: string;
    coordinates: { lat: number; lng: number };
  }) => void;
  initialLocation?: {
    lat: number;
    lng: number;
  };
  height?: string;
}

export function LocationSelector({
  onLocationSelect,
  initialLocation,
  height = '400px'
}: LocationSelectorProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES, // Use static array
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<google.maps.LatLngLiteral | null>(
    initialLocation || null
  );
  const [address, setAddress] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const searchBoxRef = useRef<HTMLInputElement>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    if (initialLocation) {
      map.setCenter(initialLocation);
    }
  }, [initialLocation]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const position = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      };
      setSelectedPosition(position);
      getAddressFromCoordinates(position);
    }
  }, []);

  const getAddressFromCoordinates = async (position: google.maps.LatLngLiteral) => {
    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ location: position });

      // Fix #3: Validate response before accessing results
      if (response?.results && response.results.length > 0) {
        const addr = response.results[0].formatted_address;
        const city = response.results[0].address_components.find(
          (component) => component.types.includes('locality')
        )?.long_name || '';

        setAddress(addr);

        onLocationSelect({
          address: addr,
          city: city,
          coordinates: position,
        });
      } else {
        toast.error('No address found for this location');
      }
    } catch (error) {
      console.error('Error getting address:', error);
      toast.error('Failed to get address for this location');
    }
  };

  const handleSearch = async () => {
    if (!searchValue || !map) return;

    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ address: searchValue });

      // Fix #4: Validate response before accessing results
      if (response?.results && response.results.length > 0) {
        const location = response.results[0].geometry.location;
        const position = {
          lat: location.lat(),
          lng: location.lng(),
        };

        map.panTo(position);
        map.setZoom(15);
        setSelectedPosition(position);
        getAddressFromCoordinates(position);
      } else {
        toast.error('Location not found. Try a different search term.');
      }
    } catch (error) {
      console.error('Error searching location:', error);
      toast.error('Location not found');
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setSelectedPosition(pos);
          if (map) {
            map.panTo(pos);
            map.setZoom(15);
          }
          getAddressFromCoordinates(pos);
          toast.success('Location detected successfully');
        },
        () => {
          toast.error('Failed to get your location');
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
    }
  };

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

  if (loadError) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg border border-red-300"
        style={{ height }}
      >
        <div className="text-center p-4">
          <MapPin className="w-8 h-8 mx-auto mb-2 text-red-500" />
          <p className="text-sm font-medium text-red-600 dark:text-red-400">Failed to load map</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Please check your internet connection and API key
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            ref={searchBoxRef}
            placeholder="Search for a location..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} variant="secondary">
          Search
        </Button>
        <Button onClick={getCurrentLocation} variant="outline">
          <Navigation className="w-4 h-4" />
        </Button>
      </div>

      {/* Map */}
      <div style={{ height }} className="rounded-lg overflow-hidden border">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={selectedPosition || defaultCenter}
          zoom={selectedPosition ? 15 : 11}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onClick={handleMapClick}
          options={{
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
        >
          {selectedPosition && (
            <Marker
              position={selectedPosition}
              animation={google.maps.Animation.DROP}
            />
          )}
        </GoogleMap>
      </div>

      {/* Selected Address */}
      {address && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Selected Location</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{address}</p>
                {selectedPosition && (
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedPosition.lat.toFixed(6)}, {selectedPosition.lng.toFixed(6)}
                  </p>
                )}
              </div>
              <Badge variant="secondary">Selected</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
