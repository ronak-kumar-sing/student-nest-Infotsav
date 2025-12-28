'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

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

interface MapUpdaterProps {
  rooms: Array<{
    location?: {
      coordinates?: {
        lat: number;
        lng: number;
      };
    };
  }>;
  userLocation?: {
    lat: number;
    lng: number;
  };
}

export function MapUpdater({ rooms, userLocation }: MapUpdaterProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const bounds = L.latLngBounds([]);
    let hasPoints = false;

    // Add user location to bounds (with validation)
    if (userLocation && isValidCoordinate(userLocation.lat, userLocation.lng)) {
      bounds.extend([userLocation.lat, userLocation.lng]);
      hasPoints = true;
    }

    // Add all room locations to bounds (with validation)
    rooms.forEach((room) => {
      const coords = room.location?.coordinates;
      if (coords && isValidCoordinate(coords.lat, coords.lng)) {
        bounds.extend([coords.lat, coords.lng]);
        hasPoints = true;
      }
    });

    // Fit map to bounds if we have any points
    if (hasPoints) {
      // Use setTimeout to ensure map is fully initialized
      setTimeout(() => {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 15,
          animate: true,
        });
      }, 100);
    }
  }, [map, rooms, userLocation]);

  return null;
}
