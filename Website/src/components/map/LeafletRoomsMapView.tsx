'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Loader2, MapPin, Home, IndianRupee, Bed, Star, Navigation2, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { calculateDistance, filterRoomsByDistance } from '../../utils/distance';
import { MapUpdater } from './MapUpdater';
import { MapController } from './MapController';
import { toast } from 'sonner';

// Fix Leaflet default marker icons
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

// Dynamically import Leaflet components
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

const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
);

const defaultCenter: [number, number] = [28.6139, 77.2090]; // Delhi

interface Room {
  _id: string;
  title: string;
  price: number;
  location: {
    coordinates: {
      lat: number;
      lng: number;
    };
    address: string;
    city: string;
  };
  images: string[];
  roomType: string;
  accommodationType: string;
  rating?: number;
  availability?: {
    isAvailable: boolean;
  };
}

interface LeafletRoomsMapViewProps {
  rooms: Room[];
  userLocation?: {
    lat: number;
    lng: number;
  };
  height?: string;
  showRadius?: boolean;
  radiusKm?: number;
}

// Helper to validate coordinates
const isValidCoordinate = (lat: number | undefined, lng: number | undefined): boolean => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat !== 0 &&
    lng !== 0 &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

export function LeafletRoomsMapView({
  rooms,
  userLocation,
  height = '600px',
  showRadius = false,
  radiusKm = 5
}: LeafletRoomsMapViewProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // Validate user location
  const validUserLocation = userLocation && isValidCoordinate(userLocation.lat, userLocation.lng) 
    ? userLocation 
    : null;
  
  const [center, setCenter] = useState<[number, number]>(
    validUserLocation ? [validUserLocation.lat, validUserLocation.lng] : defaultCenter
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedZoom, setSelectedZoom] = useState(validUserLocation ? 13 : 11);

  // Filter rooms by radius if user location and showRadius are set
  // Also filter out rooms with invalid coordinates
  const displayedRooms = useMemo(() => {
    // First, filter out rooms with invalid coordinates
    const validRooms = rooms.filter(room => {
      const coords = room.location?.coordinates;
      return coords && isValidCoordinate(coords.lat, coords.lng);
    });
    
    if (showRadius && validUserLocation) {
      return filterRoomsByDistance(validRooms, validUserLocation, radiusKm);
    }
    return validRooms;
  }, [rooms, validUserLocation, showRadius, radiusKm]);

  useEffect(() => {
    setMounted(true);

    // Set center based on rooms or user location
    if (displayedRooms.length > 0 && !validUserLocation) {
      const firstRoom = displayedRooms[0];
      if (firstRoom.location?.coordinates) {
        setCenter([
          firstRoom.location.coordinates.lat,
          firstRoom.location.coordinates.lng,
        ]);
      }
    } else if (validUserLocation) {
      setCenter([validUserLocation.lat, validUserLocation.lng]);
    }
  }, [displayedRooms, validUserLocation]);

  // Fetch search suggestions as user types
  const fetchSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
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
      if (searchQuery) {
        fetchSuggestions(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSearch = async (selectedSuggestion?: any) => {
    const queryToSearch = selectedSuggestion || searchQuery;

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
        setSearchQuery(selectedSuggestion.display_name);
      } else {
        // Search by query
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryToSearch)}&limit=1`
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

      const newCenter: [number, number] = [parseFloat(lat), parseFloat(lon)];
      setCenter(newCenter);
      setSelectedZoom(14); // Zoom in when searching
      toast.success('Location found on map');
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search location');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchSuggestions([]);
    setShowSuggestions(false);
    // Reset to user location or default
    if (validUserLocation) {
      setCenter([validUserLocation.lat, validUserLocation.lng]);
      setSelectedZoom(13);
    } else if (displayedRooms.length > 0) {
      const firstRoom = displayedRooms[0];
      if (firstRoom.location?.coordinates) {
        setCenter([
          firstRoom.location.coordinates.lat,
          firstRoom.location.coordinates.lng,
        ]);
        setSelectedZoom(11);
      }
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

  const handleRoomClick = (roomId: string) => {
    router.push(`/rooms/${roomId}`);
  };

  return (
    <div className="relative">
      {/* Search Bar Overlay */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] w-full max-w-md px-4">
        <Card className="shadow-lg">
          <CardContent className="p-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                <Input
                  type="text"
                  placeholder="Search location on map..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  onFocus={() => searchSuggestions.length > 0 && setShowSuggestions(true)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
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
              <Button
                onClick={() => handleSearch()}
                disabled={isSearching || !searchQuery.trim()}
                size="default"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Search'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map Container */}
      <div style={{ height }} className="rounded-lg overflow-hidden border relative z-0">
        <MapContainer
          center={center}
          zoom={selectedZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Map Controller for smooth zoom/pan */}
          <MapController center={center} zoom={selectedZoom} />

          {/* Auto-fit bounds to show all rooms and user location */}
          <MapUpdater rooms={displayedRooms} userLocation={validUserLocation || undefined} />

          {/* User location marker with radius */}
          {validUserLocation && (
            <>
              <Marker position={[validUserLocation.lat, validUserLocation.lng]}>
                <Popup>
                  <div className="text-center">
                    <Navigation2 className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="font-semibold">Your Location</p>
                  </div>
                </Popup>
              </Marker>

              {showRadius && (
                <Circle
                  center={[validUserLocation.lat, validUserLocation.lng]}
                  radius={radiusKm * 1000} // Convert km to meters
                  pathOptions={{
                    color: 'rgb(59, 130, 246)',
                    fillColor: 'rgb(59, 130, 246)',
                    fillOpacity: 0.1,
                    weight: 2,
                  }}
                />
              )}
            </>
          )}

          {/* Room markers */}
          {displayedRooms.map((room) => {
            if (!room.location?.coordinates) return null;

            return (
              <Marker
                key={room._id}
                position={[
                  room.location.coordinates.lat,
                  room.location.coordinates.lng,
                ]}
              >
                <Popup maxWidth={300} minWidth={250}>
                  <div className="p-2">
                    {/* Room Image */}
                    {room.images && room.images.length > 0 && (
                      <div className="relative h-32 mb-3 rounded-lg overflow-hidden">
                        <Image
                          src={room.images[0]}
                          alt={room.title}
                          fill
                          className="object-cover"
                          sizes="250px"
                          unoptimized
                        />
                      </div>
                    )}

                    {/* Room Info */}
                    <div className="space-y-2">
                      <div>
                        <h3 className="font-semibold text-sm line-clamp-1">
                          {room.title}
                        </h3>
                        <p className="text-xs text-gray-600 line-clamp-1">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {room.location.city}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          <Home className="w-3 h-3 mr-1" />
                          {room.roomType}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Bed className="w-3 h-3 mr-1" />
                          {room.accommodationType}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-1">
                          <IndianRupee className="w-4 h-4" />
                          <span className="font-bold">
                            {room.price.toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-600">/month</span>
                        </div>

                        {room.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-medium">
                              {room.rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => handleRoomClick(room._id)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Stats Overlay */}
        <div className="absolute bottom-4 left-4 z-[1000]">
          <Card className="shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">
                  {displayedRooms.length} {displayedRooms.length === 1 ? 'Room' : 'Rooms'} Found
                </span>
              </div>
              {showRadius && userLocation && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Within {radiusKm} km radius
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
