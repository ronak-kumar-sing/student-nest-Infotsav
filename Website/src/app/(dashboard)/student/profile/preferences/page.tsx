"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import ProfileNavigation from '@/components/profile/ProfileNavigation';
import { Heart, Home, MapPin, DollarSign, Users, Wifi, Car, Coffee, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const PreferencesPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    budgetMin: 5000,
    budgetMax: 15000,
    preferredLocations: [] as string[],
    roomType: 'any',
    occupancyType: 'any',
    amenities: [] as string[],
    preferences: {
      petFriendly: false,
      smokingAllowed: false,
      couplesAllowed: false,
      vegetarianOnly: false,
    }
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to continue');
        return;
      }

      const response = await fetch('/api/profile/student', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success && result.data) {
        const profile = result.data.profile;
        if (profile.preferences) {
          setPreferences({
            budgetMin: profile.preferences.budgetMin || 5000,
            budgetMax: profile.preferences.budgetMax || 15000,
            preferredLocations: profile.preferences.preferredLocations || [],
            roomType: profile.preferences.roomType || 'any',
            occupancyType: profile.preferences.occupancyType || 'any',
            amenities: profile.preferences.amenities || [],
            preferences: {
              petFriendly: profile.preferences.petFriendly || false,
              smokingAllowed: profile.preferences.smokingAllowed || false,
              couplesAllowed: profile.preferences.couplesAllowed || false,
              vegetarianOnly: profile.preferences.vegetarianOnly || false,
            }
          });
        }
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to continue');
        return;
      }

      const response = await fetch('/api/profile/student', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ preferences })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Preferences saved successfully!');
      } else {
        toast.error(result.error || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const availableAmenities = [
    { value: 'wifi', label: 'WiFi', icon: Wifi },
    { value: 'parking', label: 'Parking', icon: Car },
    { value: 'kitchen', label: 'Kitchen', icon: Coffee },
    { value: 'laundry', label: 'Laundry', icon: Home },
    { value: 'ac', label: 'Air Conditioning', icon: Home },
    { value: 'gym', label: 'Gym', icon: Users },
  ];

  const toggleAmenity = (amenity: string) => {
    setPreferences(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const addLocation = (location: string) => {
    if (location && !preferences.preferredLocations.includes(location)) {
      setPreferences(prev => ({
        ...prev,
        preferredLocations: [...prev.preferredLocations, location]
      }));
    }
  };

  const removeLocation = (location: string) => {
    setPreferences(prev => ({
      ...prev,
      preferredLocations: prev.preferredLocations.filter(l => l !== location)
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3 text-gray-400">
              <RefreshCw size={24} className="animate-spin" />
              <span>Loading preferences...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Room Preferences</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Set your preferences to help us find the perfect room for you
            </p>
          </div>
          <Button onClick={handleSavePreferences} disabled={saving}>
            <Save size={16} className="mr-2" />
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <ProfileNavigation userType="student" />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Budget Range */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign size={20} />
                  Budget Range
                </CardTitle>
                <CardDescription>
                  Set your monthly budget for accommodation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      ₹{preferences.budgetMin.toLocaleString()} - ₹{preferences.budgetMax.toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum Budget</Label>
                    <Input
                      type="number"
                      value={preferences.budgetMin}
                      onChange={(e) => setPreferences(prev => ({ ...prev, budgetMin: parseInt(e.target.value) || 0 }))}
                      min={0}
                      step={1000}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Budget</Label>
                    <Input
                      type="number"
                      value={preferences.budgetMax}
                      onChange={(e) => setPreferences(prev => ({ ...prev, budgetMax: parseInt(e.target.value) || 0 }))}
                      min={0}
                      step={1000}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preferred Locations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin size={20} />
                  Preferred Locations
                </CardTitle>
                <CardDescription>
                  Add locations where you'd like to find accommodation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter location (e.g., Koramangala)"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addLocation((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      const input = document.querySelector('input[placeholder*="location"]') as HTMLInputElement;
                      if (input) {
                        addLocation(input.value);
                        input.value = '';
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {preferences.preferredLocations.map((location) => (
                    <Badge
                      key={location}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeLocation(location)}
                    >
                      {location} ×
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Room Type & Occupancy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home size={20} />
                  Room Type & Occupancy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Room Type</Label>
                  <Select
                    value={preferences.roomType}
                    onValueChange={(value) => setPreferences(prev => ({ ...prev, roomType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="private">Private Room</SelectItem>
                      <SelectItem value="shared">Shared Room</SelectItem>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="apartment">Apartment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Occupancy Type</Label>
                  <Select
                    value={preferences.occupancyType}
                    onValueChange={(value) => setPreferences(prev => ({ ...prev, occupancyType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="double">Double</SelectItem>
                      <SelectItem value="triple">Triple</SelectItem>
                      <SelectItem value="quad">Quad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Amenities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home size={20} />
                  Preferred Amenities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {availableAmenities.map((amenity) => (
                    <div
                      key={amenity.value}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${preferences.amenities.includes(amenity.value)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                        }`}
                      onClick={() => toggleAmenity(amenity.value)}
                    >
                      <div className="flex items-center gap-2">
                        <amenity.icon size={20} />
                        <span className="font-medium">{amenity.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Additional Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart size={20} />
                  Additional Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="petFriendly"
                    checked={preferences.preferences.petFriendly}
                    onCheckedChange={(checked) =>
                      setPreferences(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, petFriendly: checked as boolean }
                      }))
                    }
                  />
                  <label htmlFor="petFriendly" className="text-sm font-medium">
                    Pet Friendly
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="smokingAllowed"
                    checked={preferences.preferences.smokingAllowed}
                    onCheckedChange={(checked) =>
                      setPreferences(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, smokingAllowed: checked as boolean }
                      }))
                    }
                  />
                  <label htmlFor="smokingAllowed" className="text-sm font-medium">
                    Smoking Allowed
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="couplesAllowed"
                    checked={preferences.preferences.couplesAllowed}
                    onCheckedChange={(checked) =>
                      setPreferences(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, couplesAllowed: checked as boolean }
                      }))
                    }
                  />
                  <label htmlFor="couplesAllowed" className="text-sm font-medium">
                    Couples Allowed
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="vegetarianOnly"
                    checked={preferences.preferences.vegetarianOnly}
                    onCheckedChange={(checked) =>
                      setPreferences(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, vegetarianOnly: checked as boolean }
                      }))
                    }
                  />
                  <label htmlFor="vegetarianOnly" className="text-sm font-medium">
                    Vegetarian Only
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreferencesPage;
