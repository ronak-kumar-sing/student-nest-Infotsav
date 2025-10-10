'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Home, Navigation2, IndianRupee, Bed, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 28.6139,
  lng: 77.2090,
};

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

interface RoomsMapViewProps {
  rooms: Room[];
  userLocation?: {
    lat: number;
    lng: number;
  };
  height?: string;
}

export function RoomsMapView({ rooms, userLocation, height = '600px' }: RoomsMapViewProps) {
  const router = useRouter();
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [center, setCenter] = useState<google.maps.LatLngLiteral>(
    userLocation || defaultCenter
  );

  useEffect(() => {
    if (rooms.length > 0 && !userLocation) {
      // Center map on first room if no user location
      const firstRoom = rooms[0];
      if (firstRoom.location?.coordinates) {
        setCenter({
          lat: firstRoom.location.coordinates.lat,
          lng: firstRoom.location.coordinates.lng,
        });
      }
    }
  }, [rooms, userLocation]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);

    // Fit bounds to show all rooms
    if (rooms.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      rooms.forEach((room) => {
        if (room.location?.coordinates) {
          bounds.extend({
            lat: room.location.coordinates.lat,
            lng: room.location.coordinates.lng,
          });
        }
      });

      if (userLocation) {
        bounds.extend(userLocation);
      }

      map.fitBounds(bounds);
    }
  }, [rooms, userLocation]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMarkerClick = (room: Room) => {
    setSelectedRoom(room);
  };

  const handleViewDetails = (roomId: string) => {
    router.push(`/dashboard/rooms/${roomId}`);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCenter(pos);
          if (map) {
            map.panTo(pos);
            map.setZoom(13);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
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

  return (
    <div className="relative" style={{ height }}>
      {/* Current Location Button */}
      <Button
        onClick={getCurrentLocation}
        className="absolute top-4 right-4 z-10 shadow-lg"
        variant="secondary"
        size="sm"
      >
        <Navigation2 className="w-4 h-4 mr-2" />
        My Location
      </Button>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={13}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        {/* User Location Marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            }}
            title="Your Location"
          />
        )}

        {/* Room Markers */}
        {rooms.map((room) => {
          if (!room.location?.coordinates) return null;

          return (
            <Marker
              key={room._id}
              position={{
                lat: room.location.coordinates.lat,
                lng: room.location.coordinates.lng,
              }}
              onClick={() => handleMarkerClick(room)}
              icon={{
                url: '/icons/home-marker.png',
                scaledSize: new google.maps.Size(40, 40),
              }}
              title={room.title}
            />
          );
        })}

        {/* Info Window for Selected Room */}
        {selectedRoom && selectedRoom.location?.coordinates && (
          <InfoWindow
            position={{
              lat: selectedRoom.location.coordinates.lat,
              lng: selectedRoom.location.coordinates.lng,
            }}
            onCloseClick={() => setSelectedRoom(null)}
          >
            <Card className="max-w-xs border-0 shadow-none">
              <CardContent className="p-0">
                {/* Room Image */}
                {selectedRoom.images && selectedRoom.images[0] && (
                  <div className="relative w-full h-32 mb-3">
                    <Image
                      src={selectedRoom.images[0]}
                      alt={selectedRoom.title}
                      fill
                      className="object-cover rounded-t-lg"
                    />
                    {selectedRoom.availability?.isAvailable && (
                      <Badge className="absolute top-2 right-2 bg-green-600">
                        Available
                      </Badge>
                    )}
                  </div>
                )}

                {/* Room Details */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm line-clamp-2">
                    {selectedRoom.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <MapPin className="w-3 h-3" />
                    <span className="line-clamp-1">{selectedRoom.location.address}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <Bed className="w-3 h-3" />
                      <span className="capitalize">{selectedRoom.roomType}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Home className="w-3 h-3" />
                      <span className="capitalize">{selectedRoom.accommodationType}</span>
                    </div>
                  </div>

                  {selectedRoom.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-medium">{selectedRoom.rating.toFixed(1)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-1 text-lg font-bold text-primary">
                      <IndianRupee className="w-4 h-4" />
                      {selectedRoom.price.toLocaleString()}
                      <span className="text-xs font-normal text-gray-500">/month</span>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleViewDetails(selectedRoom._id)}
                      className="h-8"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
