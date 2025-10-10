"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Star, Users, Wifi, Car, Utensils, Loader2, X, Eye, Calendar } from "lucide-react";
import apiClient from "@/lib/api";
import { useRouter } from "next/navigation";

interface Location {
  address?: string;
  fullAddress?: string;
  city?: string;
  state?: string;
}

interface Features {
  capacity?: number;
}

interface Owner {
  verified?: boolean;
}

interface Property {
  id: string;
  title?: string;
  name?: string;
  location?: Location;
  price?: number;
  rating?: number | string;
  totalReviews?: number;
  features?: Features;
  amenities?: string[];
  verified?: boolean;
  owner?: Owner;
}

export default function SavedPage() {
  const router = useRouter();
  const [savedProperties, setSavedProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    loadSavedProperties();
  }, []);

  const loadSavedProperties = async () => {
    try {
      setLoading(true);

      // Check if user is authenticated
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (!token) {
        console.log('No authentication token found');
        setSavedProperties([]);
        return;
      }

      // Get user's saved rooms using the new API
      const response = await apiClient.getSavedRooms();
      if (response.success && response.data.savedRooms) {
        setSavedProperties(response.data.savedRooms);
      } else {
        // If no saved properties, show empty array
        setSavedProperties([]);
      }
    } catch (error) {
      console.error('Error loading saved properties:', error);
      setSavedProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromSaved = async (propertyId: string) => {
    if (!confirm('Are you sure you want to remove this property from your saved list?')) {
      return;
    }

    try {
      setRemovingId(propertyId);
      const response = await apiClient.unsaveRoom(propertyId);

      if (response.success) {
        // Remove the property from the local state
        setSavedProperties(prev => prev.filter(property => property.id !== propertyId));
        alert('Property removed from saved list');
      } else {
        alert(response.error || 'Failed to remove property');
      }
    } catch (error) {
      console.error('Error removing property:', error);
      alert('Failed to remove property');
    } finally {
      setRemovingId(null);
    }
  };

  const handleViewDetails = (propertyId: string) => {
    router.push(`/dashboard/rooms/${propertyId}`);
  };

  const getAmenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case 'wifi':
        return <Wifi className="h-3 w-3" />;
      case 'food':
        return <Utensils className="h-3 w-3" />;
      case 'parking':
        return <Car className="h-3 w-3" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading saved properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Saved Properties</h1>
        <p className="text-muted-foreground mt-2">
          Your bookmarked accommodations - {savedProperties.length} properties saved
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {savedProperties.map((property) => (
          <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative">
              <div className="h-48 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900"></div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveFromSaved(property.id)}
                disabled={removingId === property.id}
                className="absolute top-2 right-2 bg-white/80 hover:bg-white text-red-500"
              >
                {removingId === property.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Heart className="h-4 w-4 fill-current" />
                )}
              </Button>
              {(property.verified || property.owner?.verified) && (
                <Badge className="absolute top-2 left-2 bg-green-500">
                  Verified
                </Badge>
              )}
            </div>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{property.title || property.name}</h3>
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    {property.location?.address ||
                      property.location?.fullAddress ||
                      (property.location?.city && property.location?.state ?
                        `${property.location.city}, ${property.location.state}` :
                        'Location not specified')}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-green-600">
                    ₹{property.price?.toLocaleString()}/month
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{property.rating || 'N/A'}</span>
                    <span className="text-sm text-muted-foreground">({property.totalReviews || 0})</span>
                  </div>
                </div>

                {property.features?.capacity && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {property.features.capacity} occupancy
                  </div>
                )}

                {property.amenities && property.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {property.amenities.slice(0, 3).map((amenity) => (
                      <Badge key={amenity} variant="secondary" className="text-xs">
                        <span className="mr-1">{getAmenityIcon(amenity)}</span>
                        {amenity}
                      </Badge>
                    ))}
                    {property.amenities.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{property.amenities.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewDetails(property.id)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push(`/dashboard/rooms/${property.id}#schedule-visit`)}
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    Schedule Visit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveFromSaved(property.id)}
                    disabled={removingId === property.id}
                    className="px-2"
                  >
                    {removingId === property.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {savedProperties.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No saved properties yet</h3>
            <p className="text-muted-foreground mb-4">
              Start exploring and save properties you&apos;re interested in
            </p>
            <Button onClick={() => router.push('/dashboard')}>Browse Properties</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
