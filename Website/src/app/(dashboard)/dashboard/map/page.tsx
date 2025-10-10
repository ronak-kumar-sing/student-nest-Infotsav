'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LocationSelector } from '@/components/map/LocationSelector';
import { RoomsMapView } from '@/components/map/RoomsMapView';
import {
  MapPin,
  Plus,
  Trash2,
  Navigation,
  Loader2,
  Map,
  List,
  RefreshCw,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';

interface PreferredLocation {
  address: string;
  city: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  radius: number;
  addedAt: string;
}

export default function StudentMapPage() {
  const [loading, setLoading] = useState(true);
  const [preferredLocations, setPreferredLocations] = useState<PreferredLocation[]>([]);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [addLocationDialog, setAddLocationDialog] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [searchCity, setSearchCity] = useState('');

  useEffect(() => {
    fetchUserLocations();
    fetchRooms();
  }, []);

  const fetchUserLocations = async () => {
    try {
      const response = await apiClient.request('/student/locations');
      if (response.success) {
        setPreferredLocations(response.data.preferredLocations || []);
        setCurrentLocation(response.data.currentLocation);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      // Build query based on preferred locations
      let query = '';

      if (preferredLocations.length > 0) {
        const location = preferredLocations[0];
        query = `?lat=${location.coordinates.lat}&lng=${location.coordinates.lng}&maxDistance=${location.radius}`;
      } else if (currentLocation) {
        query = `?lat=${currentLocation.coordinates.lat}&lng=${currentLocation.coordinates.lng}&maxDistance=5`;
      }

      const response = await apiClient.getRooms({ page: 1, limit: 100 });
      if (response.success) {
        setRooms(response.data.rooms || []);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const handleAddLocation = async () => {
    if (!selectedLocation) {
      toast.error('Please select a location on the map');
      return;
    }

    try {
      const response = await apiClient.request('/student/locations', {
        method: 'POST',
        body: {
          ...selectedLocation,
          radius: radiusKm,
        },
      });

      if (response.success) {
        toast.success('Location added successfully!');
        setPreferredLocations(response.data.preferredLocations);
        setAddLocationDialog(false);
        setSelectedLocation(null);
        setRadiusKm(5);
        fetchRooms();
      } else {
        toast.error(response.error || 'Failed to add location');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to add location');
    }
  };

  const handleDeleteLocation = async (index: number) => {
    try {
      const response = await apiClient.request(`/student/locations?index=${index}`, {
        method: 'DELETE',
      });

      if (response.success) {
        toast.success('Location removed successfully');
        setPreferredLocations(response.data.preferredLocations);
        fetchRooms();
      } else {
        toast.error(response.error || 'Failed to remove location');
      }
    } catch (error) {
      toast.error('Failed to remove location');
    }
  };

  const handleUpdateCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await apiClient.request('/student/locations', {
            method: 'PATCH',
            body: JSON.stringify({
              coordinates: {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              },
            }),
          });

          if (response.success) {
            setCurrentLocation(response.data.currentLocation);
            toast.success('Current location updated!');
            fetchRooms();
          }
        } catch (error) {
          toast.error('Failed to update location');
        }
      },
      (error) => {
        toast.error('Failed to get your location');
      }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Find Rooms Near You</h1>
          <p className="text-gray-600 mt-1">
            Discover available rooms in your preferred locations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleUpdateCurrentLocation} variant="outline">
            <Navigation className="w-4 h-4 mr-2" />
            Update Location
          </Button>
          <Button onClick={() => setAddLocationDialog(true)} disabled={preferredLocations.length >= 3}>
            <Plus className="w-4 h-4 mr-2" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Preferred Locations */}
      {preferredLocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Your Preferred Locations ({preferredLocations.length}/3)
            </CardTitle>
            <CardDescription>
              Rooms will be filtered based on these locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {preferredLocations.map((location, index) => (
                <Card key={index} className="relative">
                  <CardContent className="pt-6">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={() => handleDeleteLocation(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{location.city}</p>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {location.address}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Within {location.radius} km
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Toggle and Filters */}
      <div className="flex items-center justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList>
            <TabsTrigger value="map" className="gap-2">
              <Map className="w-4 h-4" />
              Map View
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="w-4 h-4" />
              List View
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <Input
            placeholder="Search by city..."
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            className="w-64"
          />
          <Button onClick={fetchRooms} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Map/List View */}
      {viewMode === 'map' ? (
        <Card>
          <CardContent className="p-0">
            <RoomsMapView
              rooms={rooms}
              userLocation={currentLocation?.coordinates}
              height="calc(100vh - 400px)"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <Card key={room._id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <h3 className="font-semibold line-clamp-2 mb-2">{room.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{room.location?.city}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">
                    ₹{room.price.toLocaleString()}
                  </span>
                  <Button size="sm" onClick={() => window.location.href = `/dashboard/rooms/${room._id}`}>
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {rooms.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No rooms found</h3>
            <p className="text-gray-600 mb-4">
              Try adding preferred locations or updating your current location
            </p>
            <Button onClick={() => setAddLocationDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Preferred Location
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Location Dialog */}
      <Dialog open={addLocationDialog} onOpenChange={setAddLocationDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Preferred Location</DialogTitle>
            <DialogDescription>
              Select a location on the map and set the search radius (max 3 locations)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <LocationSelector
              onLocationSelect={setSelectedLocation}
              height="400px"
            />

            <div className="space-y-2">
              <Label>Search Radius (km)</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={radiusKm}
                onChange={(e) => setRadiusKm(parseInt(e.target.value) || 5)}
                placeholder="Enter radius in kilometers"
              />
              <p className="text-xs text-gray-600">
                Rooms within this radius will be shown for this location
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLocationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddLocation} disabled={!selectedLocation}>
              Add Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
