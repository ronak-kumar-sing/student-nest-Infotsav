'use client';

import React, { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Loader2, MapPin, Navigation, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { useMapEvents } from 'react-leaflet';
import type { LeafletMouseEvent } from 'leaflet';
import L from 'leaflet';

// Fix Leaflet default marker icons issue
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

const defaultCenter: [number, number] = [28.6139, 77.2090]; // Delhi

interface LocationSelectorProps {
  onLocationSelect: (location: {
    address: string;
    fullAddress: string;
    city: string;
    state: string;
    pincode: string;
    coordinates: { lat: number; lng: number };
  }) => void;
  initialLocation?: {
    lat: number;
    lng: number;
  };
  height?: string;
}

// Component to handle map clicks
function LocationMarker({
  position,
  setPosition,
  onAddressUpdate,
  address
}: {
  position: [number, number] | null;
  setPosition: (pos: [number, number]) => void;
  onAddressUpdate: (pos: [number, number]) => void;
  address: string;
}) {
  const map = useMapEvents({
    click(e: LeafletMouseEvent) {
      const newPos: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPosition(newPos);
      onAddressUpdate(newPos);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position === null ? null : (
    <Marker position={position}>
      <Popup>
        <div className="p-2 min-w-[200px]">
          <div className="flex items-start gap-2 mb-2">
            <MapPin className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm mb-1">Selected Location</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 break-words">
                {address || 'Loading address...'}
              </p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t text-xs text-gray-500">
            <p>Lat: {position[0].toFixed(6)}</p>
            <p>Lng: {position[1].toFixed(6)}</p>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

export function LeafletLocationSelector({
  onLocationSelect,
  initialLocation,
  height = '400px'
}: LocationSelectorProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(
    initialLocation ? [initialLocation.lat, initialLocation.lng] : null
  );
  const [address, setAddress] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch search suggestions as user types
  const fetchSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );
      const data = await response.json();
      setSearchSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  // Debounce search suggestions
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchValue) {
        fetchSuggestions(searchValue);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchValue]);

  const getAddressFromCoordinates = async (position: [number, number]) => {
    try {
      // Using Nominatim (OpenStreetMap) reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position[0]}&lon=${position[1]}&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const displayName = data.display_name || 'Unknown location';

        // Extract detailed address components from Nominatim response
        const addressData = data.address || {};

        // Build street address from road, house_number, neighbourhood
        const streetParts = [
          addressData.house_number,
          addressData.road || addressData.street,
          addressData.neighbourhood || addressData.suburb
        ].filter(Boolean);
        const streetAddress = streetParts.join(', ') || displayName;

        // Get city (can be city, town, village, or municipality)
        const city = addressData.city ||
          addressData.town ||
          addressData.village ||
          addressData.municipality ||
          addressData.county || '';

        // Get state
        const state = addressData.state || addressData.region || '';

        // Get pincode/postcode
        const pincode = addressData.postcode || '';

        setAddress(displayName);

        onLocationSelect({
          address: streetAddress,
          fullAddress: displayName,
          city: city,
          state: state,
          pincode: pincode,
          coordinates: { lat: position[0], lng: position[1] },
        });
      } else {
        toast.error('No address found for this location');
      }
    } catch (error) {
      console.error('Error getting address:', error);
      toast.error('Failed to get address for this location');
    }
  };

  const handleSearch = async (selectedSuggestion?: any) => {
    const queryToSearch = selectedSuggestion || searchValue;

    if (!queryToSearch || (typeof queryToSearch === 'string' && !queryToSearch.trim())) {
      toast.error('Please enter a location to search');
      return;
    }

    setIsSearching(true);
    setShowSuggestions(false);

    try {
      let lat, lon;

      if (selectedSuggestion && selectedSuggestion.lat && selectedSuggestion.lon) {
        // Use selected suggestion
        lat = selectedSuggestion.lat;
        lon = selectedSuggestion.lon;
        setSearchValue(selectedSuggestion.display_name);
      } else {
        // Search by query
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryToSearch)}&limit=1`,
          {
            headers: {
              'Accept-Language': 'en',
            },
          }
        );
        const data = await response.json();

        if (data && data.length > 0) {
          lat = data[0].lat;
          lon = data[0].lon;
        } else {
          toast.error('Location not found. Try a different search term.');
          setIsSearching(false);
          return;
        }
      }

      const position: [number, number] = [parseFloat(lat), parseFloat(lon)];
      setSelectedPosition(position);
      getAddressFromCoordinates(position);
      toast.success('Location found');
    } catch (error) {
      console.error('Error searching location:', error);
      toast.error('Failed to search location');
    } finally {
      setIsSearching(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos: [number, number] = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          setSelectedPosition(pos);
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

  if (!mounted) {
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

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
          <Input
            placeholder="Search for a location..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            onFocus={() => searchSuggestions.length > 0 && setShowSuggestions(true)}
            className="pl-10 pr-10"
            disabled={isSearching}
          />
          {searchValue && (
            <button
              onClick={() => {
                setSearchValue('');
                setSearchSuggestions([]);
                setShowSuggestions(false);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Search Suggestions Dropdown */}
          {showSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-60 overflow-y-auto z-50">
              {searchSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b last:border-b-0 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {suggestion.display_name.split(',')[0]}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {suggestion.display_name}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button onClick={() => handleSearch()} variant="secondary" disabled={isSearching || !searchValue.trim()}>
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </Button>
        <Button onClick={getCurrentLocation} variant="outline">
          <Navigation className="w-4 h-4" />
        </Button>
      </div>

      {/* Map */}
      <div style={{ height }} className="rounded-lg overflow-hidden border relative z-0">
        <MapContainer
          center={selectedPosition || defaultCenter}
          zoom={selectedPosition ? 15 : 11}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker
            position={selectedPosition}
            setPosition={setSelectedPosition}
            onAddressUpdate={getAddressFromCoordinates}
            address={address}
          />
        </MapContainer>
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
                    {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
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
