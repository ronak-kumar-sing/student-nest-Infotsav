"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Heart, MapPin, Star, Users, Eye, Filter, Navigation, Map } from 'lucide-react';
import apiClient from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import FilterComponent from '@/components/filters/FilterComponent';
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
import { toast } from 'sonner';

interface Room {
  id: string;
  title: string;
  price: number;
  location: {
    address: string;
    city: string;
    state: string;
  };
  images?: string[];
  rating?: number;
  totalReviews?: number;
  amenities?: string[];
  roomType?: string;
  availability?: {
    isAvailable: boolean;
    availableFrom?: string;
  };
  features?: {
    area?: number;
  };
  owner?: {
    verified?: boolean;
  };
  verified?: boolean;
}

function RoomBrowser() {
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [displayedRooms, setDisplayedRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false); // Hidden by default
  const [savedRooms, setSavedRooms] = useState<Set<string>>(new Set());
  const [savingRoom, setSavingRoom] = useState<string | null>(null);

  // Location filter states
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    address: string;
    city: string;
    coordinates: { lat: number; lng: number };
    radius?: number;
  } | null>(null);
  const [savedLocations, setSavedLocations] = useState<any[]>([]);

  // Filter states
  const [priceRange, setPriceRange] = useState<number[]>([2000, 25000]);
  const [availabilityFilter, setAvailabilityFilter] = useState({
    availableNow: false,
    availableNextMonth: false,
  });
  const [roomTypeFilter, setRoomTypeFilter] = useState({
    single: false,
    shared: false,
    pg: false,
    hostel: false,
    apartment: false,
    studio: false,
  });
  const [amenityFilter, setAmenityFilter] = useState({
    wifi: false,
    parking: false,
    security: false,
    kitchen: false,
    laundry: false,
    gym: false,
    ac: false,
    heating: false,
  });
  const [locationFilter, setLocationFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [sortBy, setSortBy] = useState('newest');
  const [areaRange, setAreaRange] = useState<number[]>([50, 500]);

  // Load rooms from API
  const loadRooms = async () => {
    try {
      setLoading(true);
      console.log('📡 Loading rooms from API...');

      const response = await apiClient.getRooms();
      console.log('📊 API Response:', response);

      if (response.success) {
        // API returns data as array directly, not data.rooms
        const rooms = Array.isArray(response.data) ? response.data : (response.data.rooms || []);
        console.log(`✅ Loaded ${rooms.length} rooms`);
        setAllRooms(rooms);
        setDisplayedRooms(rooms);
      } else {
        console.error('Failed to load rooms:', response.error);
        setAllRooms([]);
        setDisplayedRooms([]);
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
      setAllRooms([]);
      setDisplayedRooms([]);
    } finally {
      setLoading(false);
    }
  };

  // Load saved rooms
  const loadSavedRooms = async () => {
    try {
      const response = await apiClient.getSavedRooms();
      console.log('📚 Saved rooms API response:', response);

      if (response.success && response.data) {
        // API returns { success: true, data: { savedRooms: [...], total: N } }
        const rooms = response.data.savedRooms || response.data || [];
        const savedIds = new Set<string>(
          rooms.map((room: any) => String(room._id || room.id))
        );
        console.log('💾 Loaded saved room IDs:', Array.from(savedIds));
        setSavedRooms(savedIds);
      }
    } catch (error) {
      console.error('Error loading saved rooms:', error);
    }
  };

  // Load saved locations
  const loadSavedLocations = async () => {
    try {
      const response = await apiClient.request('/student/locations', {
        method: 'GET',
      });

      if (response.success && response.data) {
        setSavedLocations(response.data.preferredLocations || []);
      }
    } catch (error) {
      console.error('Error loading saved locations:', error);
    }
  };

  // Save location to backend
  const handleSaveLocation = async () => {
    if (!selectedLocation) {
      toast.error('Please select a location first');
      return;
    }

    try {
      const response = await apiClient.request('/student/locations', {
        method: 'POST',
        body: JSON.stringify({
          address: selectedLocation.address,
          city: selectedLocation.city,
          coordinates: selectedLocation.coordinates,
          radius: selectedLocation.radius || 5,
        }),
      });

      if (response.success) {
        toast.success('Location saved successfully!');
        loadSavedLocations();
        setShowLocationModal(false);
        // Apply location filter
        applyLocationFilter();
      } else {
        toast.error(response.error || 'Failed to save location');
      }
    } catch (error: any) {
      console.error('Error saving location:', error);
      toast.error(error.message || 'Failed to save location');
    }
  };

  // Apply location-based filtering
  const applyLocationFilter = () => {
    if (!selectedLocation) return;

    const { coordinates, radius = 5 } = selectedLocation;
    const radiusInMeters = radius * 1000;

    const filtered = allRooms.filter((room: any) => {
      if (!room.location?.coordinates) return false;

      const { lat, lng } = room.location.coordinates;
      const distance = calculateDistance(
        coordinates.lat,
        coordinates.lng,
        lat,
        lng
      );

      return distance <= radiusInMeters;
    });

    setDisplayedRooms(filtered);
    toast.success(`Found ${filtered.length} rooms within ${radius}km`);
  };

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Clear location filter
  const clearLocationFilter = () => {
    setSelectedLocation(null);
    setDisplayedRooms(allRooms);
    toast.info('Location filter cleared');
  };

  // Handle save/unsave room
  const handleSaveRoom = async (roomId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setSavingRoom(roomId);
    try {
      if (savedRooms.has(roomId)) {
        const response = await apiClient.unsaveRoom(roomId);
        if (response.success) {
          setSavedRooms(prev => {
            const next = new Set(prev);
            next.delete(roomId);
            return next;
          });
        }
      } else {
        const response = await apiClient.saveRoom(roomId);
        if (response.success) {
          setSavedRooms(prev => new Set(prev).add(roomId));
        }
      }
    } catch (error: any) {
      console.error('Error saving room:', error);
      alert(error.message || 'Failed to save room. Please login to continue.');
    } finally {
      setSavingRoom(null);
    }
  };

  // Apply filters
  const applyFilters = () => {
    let filtered = [...allRooms];

    // Filter out fully booked rooms (availableRooms = 0)
    filtered = filtered.filter((room: any) => {
      const availableRooms = room.availability?.availableRooms ?? room.availableRooms;
      // If availableRooms is 0, hide the room
      return availableRooms === undefined || availableRooms > 0;
    });

    // Price filter
    filtered = filtered.filter(
      (room) => room.price >= priceRange[0] && room.price <= priceRange[1]
    );

    // Availability filter
    if (availabilityFilter.availableNow || availabilityFilter.availableNextMonth) {
      filtered = filtered.filter((room) => {
        if (availabilityFilter.availableNow && room.availability?.isAvailable) {
          return true;
        }
        if (availabilityFilter.availableNextMonth && room.availability?.availableFrom) {
          const availableDate = new Date(room.availability.availableFrom);
          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          return availableDate <= nextMonth;
        }
        return false;
      });
    }

    // Room type filter
    const selectedRoomTypes = Object.entries(roomTypeFilter)
      .filter(([_, selected]) => selected)
      .map(([type]) => type);
    if (selectedRoomTypes.length > 0) {
      filtered = filtered.filter((room) =>
        selectedRoomTypes.includes(room.roomType?.toLowerCase() || '')
      );
    }

    // Amenity filter
    const selectedAmenities = Object.entries(amenityFilter)
      .filter(([_, selected]) => selected)
      .map(([amenity]) => amenity);
    if (selectedAmenities.length > 0) {
      filtered = filtered.filter((room) =>
        selectedAmenities.every((amenity) =>
          room.amenities?.some((a) => a.toLowerCase() === amenity.toLowerCase())
        )
      );
    }

    // Location filter
    if (locationFilter) {
      const searchTerm = locationFilter.toLowerCase();
      filtered = filtered.filter(
        (room) =>
          room.location.address.toLowerCase().includes(searchTerm) ||
          room.location.city.toLowerCase().includes(searchTerm) ||
          room.location.state.toLowerCase().includes(searchTerm) ||
          room.title.toLowerCase().includes(searchTerm)
      );
    }

    // Rating filter
    if (ratingFilter > 0) {
      filtered = filtered.filter((room) => (room.rating || 0) >= ratingFilter);
    }

    // Area filter - only apply if area data exists
    if (areaRange[0] !== 50 || areaRange[1] !== 500) {
      filtered = filtered.filter((room) => {
        const area = room.features?.area;
        // If area is not set, include the room (don't filter it out)
        if (!area || area === 0) return true;
        return area >= areaRange[0] && area <= areaRange[1];
      });
    }

    // Sorting
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'area':
        filtered.sort((a, b) => (b.features?.area || 0) - (a.features?.area || 0));
        break;
      case 'newest':
      default:
        // Keep default order
        break;
    }

    setDisplayedRooms(filtered);
  };

  // Auto-apply filters when any filter changes
  useEffect(() => {
    if (allRooms.length > 0) {
      applyFilters();
    }
  }, [
    priceRange,
    availabilityFilter,
    roomTypeFilter,
    amenityFilter,
    locationFilter,
    ratingFilter,
    sortBy,
    areaRange,
    allRooms,
  ]);

  // Clear all filters
  const clearAllFilters = () => {
    setPriceRange([2000, 25000]);
    setAvailabilityFilter({ availableNow: false, availableNextMonth: false });
    setRoomTypeFilter({
      single: false,
      shared: false,
      pg: false,
      hostel: false,
      apartment: false,
      studio: false,
    });
    setAmenityFilter({
      wifi: false,
      parking: false,
      security: false,
      kitchen: false,
      laundry: false,
      gym: false,
      ac: false,
      heating: false,
    });
    setLocationFilter('');
    setRatingFilter(0);
    setSortBy('newest');
    setAreaRange([50, 500]);
    clearLocationFilter();
  };

  // Initial load
  useEffect(() => {
    loadRooms();
    loadSavedRooms();
    loadSavedLocations();
  }, []);

  // Count active filters
  const getActiveFiltersCount = () => {
    let count = 0;
    if (priceRange[0] !== 2000 || priceRange[1] !== 25000) count++;
    if (availabilityFilter.availableNow || availabilityFilter.availableNextMonth) count++;
    if (Object.values(roomTypeFilter).some((v) => v)) count++;
    if (Object.values(amenityFilter).some((v) => v)) count++;
    if (locationFilter) count++;
    if (ratingFilter > 0) count++;
    if (areaRange[0] !== 50 || areaRange[1] !== 500) count++;
    return count;
  };

  // Load rooms on component mount
  useEffect(() => {
    loadRooms();
    loadSavedRooms();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-gray-700">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">
            Find Your Perfect Accommodation
          </CardTitle>
          <p className="text-center text-muted-foreground mt-2">
            Discover comfortable and affordable student housing near top universities
          </p>
        </CardHeader>
      </Card>

      {/* Main Content Area - Filter Sidebar + Results */}
      <div className="flex gap-6">
        {/* Filter Sidebar - Collapsible */}
        {showFilters && (
          <div className="w-full lg:w-80 flex-shrink-0">
            <FilterComponent
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              availabilityFilter={availabilityFilter}
              setAvailabilityFilter={setAvailabilityFilter}
              roomTypeFilter={roomTypeFilter}
              setRoomTypeFilter={setRoomTypeFilter}
              amenityFilter={amenityFilter}
              setAmenityFilter={setAmenityFilter}
              locationFilter={locationFilter}
              setLocationFilter={setLocationFilter}
              ratingFilter={ratingFilter}
              setRatingFilter={setRatingFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              areaRange={areaRange}
              setAreaRange={setAreaRange}
              onClearFilters={clearAllFilters}
              activeFiltersCount={getActiveFiltersCount()}
            />
          </div>
        )}

        {/* Results Area */}
        <div className="flex-1 space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Available Rooms</h2>
              <p className="text-muted-foreground">
                {displayedRooms.length} room{displayedRooms.length !== 1 ? 's' : ''} found
                {allRooms.length !== displayedRooms.length && (
                  <span> (filtered from {allRooms.length})</span>
                )}
                {selectedLocation && (
                  <span className="text-blue-500"> • Near {selectedLocation.city}</span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              {/* Location Filter Button */}
              <Button
                variant={selectedLocation ? "default" : "outline"}
                onClick={() => setShowLocationModal(true)}
                className="gap-2"
              >
                <MapPin className="h-4 w-4" />
                {selectedLocation ? 'Change Location' : 'Filter by Location'}
              </Button>

              {selectedLocation && (
                <Button
                  variant="ghost"
                  onClick={clearLocationFilter}
                  className="gap-2"
                >
                  Clear Location
                </Button>
              )}

              {/* Toggle Filter Button */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? 'Hide' : 'Show'} Filters
                {getActiveFiltersCount() > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {getActiveFiltersCount()}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
                <p className="text-muted-foreground">Loading available rooms...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Rooms Grid */}
              {displayedRooms.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {displayedRooms.map(room => (
                    <Card key={room.id} className="overflow-hidden hover:shadow-lg transition-shadow relative">
                      {/* Save/Heart Button */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-4 right-4 z-20 bg-white/90 hover:bg-white shadow-md"
                        onClick={(e) => handleSaveRoom(room.id, e)}
                        disabled={savingRoom === room.id}
                      >
                        {savingRoom === room.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Heart
                            className={`h-5 w-5 ${savedRooms.has(room.id)
                              ? 'fill-red-500 text-red-500'
                              : 'text-gray-600'
                              }`}
                          />
                        )}
                      </Button>

                      <Link href={`/dashboard/rooms/${room.id}`}>
                        <div className="relative h-48 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900">
                          {room.images && room.images.length > 0 ? (
                            <Image
                              src={room.images[0]}
                              alt={room.title}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                          ) : null}
                          {(room.verified || room.owner?.verified) && (
                            <Badge className="absolute top-2 left-2 bg-green-500 z-10">
                              Verified
                            </Badge>
                          )}
                          {room.availability?.isAvailable && (
                            <Badge className="absolute bottom-2 left-2 bg-blue-500 z-10">
                              Available
                            </Badge>
                          )}
                        </div>
                      </Link>

                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <Link href={`/dashboard/rooms/${room.id}`}>
                              <h3 className="font-semibold text-lg hover:text-blue-600 transition-colors">
                                {room.title}
                              </h3>
                            </Link>
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3 mr-1" />
                              {room.location?.address ||
                                (room.location?.city && room.location?.state ?
                                  `${room.location.city}, ${room.location.state}` :
                                  'Location not specified')}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-lg font-bold text-green-600">
                              ₹{room.price?.toLocaleString()}/month
                            </div>
                            {room.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">{room.rating}</span>
                                <span className="text-sm text-muted-foreground">
                                  ({room.totalReviews || 0})
                                </span>
                              </div>
                            )}
                          </div>

                          {room.roomType && (
                            <Badge variant="outline" className="text-xs">
                              {room.roomType}
                            </Badge>
                          )}

                          {room.amenities && room.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {room.amenities.slice(0, 3).map((amenity) => (
                                <Badge key={amenity} variant="secondary" className="text-xs">
                                  {amenity}
                                </Badge>
                              ))}
                              {room.amenities.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{room.amenities.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Button asChild size="sm" className="flex-1">
                              <Link href={`/dashboard/rooms/${room.id}`}>
                                <Eye className="w-4 h-4 mr-1" />
                                View Details
                              </Link>
                            </Button>
                            <Button size="sm" variant="outline">
                              <Heart className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <div className="text-muted-foreground text-lg mb-4">
                      {allRooms.length === 0
                        ? 'No rooms available at the moment'
                        : 'No rooms match your filters'}
                    </div>
                    {allRooms.length > 0 && getActiveFiltersCount() > 0 ? (
                      <Button onClick={clearAllFilters}>Clear All Filters</Button>
                    ) : (
                      <Button onClick={loadRooms}>Refresh</Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Location Filter Modal */}
      <Dialog open={showLocationModal} onOpenChange={setShowLocationModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Location to Filter Rooms</DialogTitle>
            <DialogDescription>
              Choose a location on the map to find rooms within your preferred radius.
              You can also save this location for future searches.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Saved Locations */}
            {savedLocations.length > 0 && (
              <div className="space-y-2">
                <Label>Your Saved Locations ({savedLocations.length}/3)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {savedLocations.map((loc: any, index: number) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start text-left h-auto py-2"
                      onClick={() => {
                        setSelectedLocation({
                          address: loc.address,
                          city: loc.city,
                          coordinates: loc.coordinates,
                          radius: loc.radius || 5,
                        });
                        toast.info(`Selected: ${loc.city}`);
                      }}
                    >
                      <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{loc.city}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {loc.address}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Location Selector Map */}
            <LocationSelector
              height="450px"
              onLocationSelect={(location) => {
                setSelectedLocation({
                  ...location,
                  radius: 5,
                });
                toast.success('Location selected!');
              }}
              initialLocation={
                selectedLocation?.coordinates
                  ? {
                    lat: selectedLocation.coordinates.lat,
                    lng: selectedLocation.coordinates.lng,
                  }
                  : undefined
              }
            />

            {/* Selected Location Info */}
            {selectedLocation && (
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">{selectedLocation.city}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedLocation.address}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Lat: {selectedLocation.coordinates.lat.toFixed(4)}, Lng:{' '}
                          {selectedLocation.coordinates.lng.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowLocationModal(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                applyLocationFilter();
                setShowLocationModal(false);
              }}
              disabled={!selectedLocation}
            >
              <Filter className="h-4 w-4 mr-2" />
              Apply Filter
            </Button>
            <Button
              onClick={handleSaveLocation}
              disabled={!selectedLocation || savedLocations.length >= 3}
            >
              <Navigation className="h-4 w-4 mr-2" />
              {savedLocations.length >= 3 ? 'Max Locations Saved' : 'Save & Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RoomBrowser;
