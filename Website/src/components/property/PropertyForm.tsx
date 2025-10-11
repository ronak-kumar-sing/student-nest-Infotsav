"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '../ui/progress';
import { ImageUploader } from './ImageUploader';
import { LocationSelector } from '../map';
import apiClient from '../../lib/api';
import { toast } from 'sonner';
import {
  Home, MapPin, IndianRupee, CheckCircle, ArrowRight, ArrowLeft,
  Wifi, Car, Utensils, Shield, Camera, Tv, Droplet, Wind,
  Zap, Dumbbell, Sparkles, Video, Flame, WashingMachine,
  Loader2, AlertCircle, Building2
} from 'lucide-react';

interface PropertyFormData {
  // Basic Info
  title: string;
  description: string;
  fullDescription: string;
  roomType: 'single' | 'shared' | 'studio' | '';
  accommodationType: 'pg' | 'hostel' | 'apartment' | 'room' | '';
  maxSharingCapacity: number;

  // Location
  location: {
    address: string;
    fullAddress: string;
    city: string;
    state: string;
    pincode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    nearbyUniversities: Array<{
      name: string;
      distance: string;
      commute: string;
    }>;
  };

  // Pricing
  price: number;
  securityDeposit: number;
  maintenanceCharges: number;

  // Features
  features: {
    area: number;
    floor: number;
    totalFloors: number;
    furnished: boolean;
    balcony: boolean;
    attached_bathroom: boolean;
  };

  // Amenities & Rules
  amenities: string[];
  rules: {
    genderPreference: 'male' | 'female' | 'any';
    smokingAllowed: boolean;
    petsAllowed: boolean;
    drinkingAllowed: boolean;
    visitorsAllowed: boolean;
    couplesAllowed: boolean;
  };

  // Availability
  availability: {
    isAvailable: boolean;
    availableRooms: number;
    availableFrom: string;
  };
  totalRooms: number;

  // Images
  images: Array<{
    id: string;
    url: string;
    publicId: string;
    width: number;
    height: number;
    size: number;
    format: string;
  }>;
}

const AMENITIES_LIST = [
  { id: 'wifi', label: 'WiFi', icon: Wifi },
  { id: 'ac', label: 'Air Conditioning', icon: Wind },
  { id: 'powerBackup', label: 'Power Backup', icon: Zap },
  { id: 'security', label: '24/7 Security', icon: Shield },
  { id: 'laundry', label: 'Laundry', icon: WashingMachine },
  { id: 'housekeeping', label: 'Housekeeping', icon: Sparkles },
  { id: 'gym', label: 'Gym', icon: Dumbbell },
  { id: 'parking', label: 'Parking', icon: Car },
  { id: 'lift', label: 'Lift/Elevator', icon: Building2 },
  { id: 'water24x7', label: '24/7 Water', icon: Droplet },
  { id: 'mess', label: 'Mess/Food', icon: Utensils },
  { id: 'tv', label: 'TV', icon: Tv },
  { id: 'fridge', label: 'Refrigerator', icon: Home },
  { id: 'microwave', label: 'Microwave', icon: Home },
  { id: 'washingMachine', label: 'Washing Machine', icon: WashingMachine },
  { id: 'geyser', label: 'Geyser', icon: Flame },
  { id: 'cctv', label: 'CCTV Surveillance', icon: Video },
  { id: 'fireExtinguisher', label: 'Fire Safety', icon: AlertCircle },
];

const ROOM_TYPES = [
  { value: 'single', label: 'Single Room', description: 'Private room for one person' },
  { value: 'shared', label: 'Shared Room', description: 'Room shared with others' },
  { value: 'studio', label: 'Studio Apartment', description: 'Self-contained living space' },
];

const ACCOMMODATION_TYPES = [
  { value: 'pg', label: 'PG (Paying Guest)', description: 'Furnished room with facilities' },
  { value: 'hostel', label: 'Hostel', description: 'Dormitory style accommodation' },
  { value: 'apartment', label: 'Apartment', description: 'Independent flat/apartment' },
  { value: 'room', label: 'Room', description: 'Single room for rent' },
];

export function PropertyForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<PropertyFormData>({
    title: '',
    description: '',
    fullDescription: '',
    roomType: '',
    accommodationType: '',
    maxSharingCapacity: 1,
    location: {
      address: '',
      fullAddress: '',
      city: '',
      state: '',
      pincode: '',
      nearbyUniversities: [],
    },
    price: 0,
    securityDeposit: 0,
    maintenanceCharges: 0,
    features: {
      area: 50,
      floor: 0,
      totalFloors: 0,
      furnished: false,
      balcony: false,
      attached_bathroom: false,
    },
    amenities: [],
    rules: {
      genderPreference: 'any',
      smokingAllowed: false,
      petsAllowed: false,
      drinkingAllowed: false,
      visitorsAllowed: true,
      couplesAllowed: false,
    },
    availability: {
      isAvailable: true,
      availableRooms: 1,
      availableFrom: new Date().toISOString().split('T')[0],
    },
    totalRooms: 1,
    images: [],
  });

  const steps = [
    { id: 1, title: 'Property Type', description: 'Choose property category' },
    { id: 2, title: 'Basic Details', description: 'Title, description & location' },
    { id: 3, title: 'Pricing & Rooms', description: 'Rent, deposit & availability' },
    { id: 4, title: 'Features', description: 'Property specifications' },
    { id: 5, title: 'Amenities', description: 'Facilities & services' },
    { id: 6, title: 'Images', description: 'Upload property photos' },
    { id: 7, title: 'Rules', description: 'House rules & preferences' },
    { id: 8, title: 'Review', description: 'Confirm & publish' },
  ];

  const updateFormData = (updates: Partial<PropertyFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updateNestedData = (key: keyof PropertyFormData, updates: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: { ...(prev[key] as any), ...updates }
    }));
  };

  const toggleAmenity = (amenityId: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(id => id !== amenityId)
        : [...prev.amenities, amenityId]
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.roomType || !formData.accommodationType) {
          toast.error('Please select both room type and accommodation type');
          return false;
        }
        return true;

      case 2:
        if (!formData.title.trim()) {
          toast.error('Property title is required');
          return false;
        }
        if (formData.title.length > 200) {
          toast.error('Title must be less than 200 characters');
          return false;
        }
        if (!formData.description.trim()) {
          toast.error('Description is required');
          return false;
        }
        if (!formData.location.address || !formData.location.city || !formData.location.state || !formData.location.pincode) {
          toast.error('Complete location details are required (address, city, state, pincode)');
          return false;
        }
        if (!formData.location.coordinates || !formData.location.coordinates.lat || !formData.location.coordinates.lng) {
          toast.error('Please select the exact location on the map');
          return false;
        }
        return true;

      case 3:
        if (formData.price <= 0) {
          toast.error('Monthly rent must be greater than 0');
          return false;
        }
        if (formData.securityDeposit < 0) {
          toast.error('Security deposit cannot be negative');
          return false;
        }
        if (formData.totalRooms <= 0) {
          toast.error('Total rooms must be at least 1');
          return false;
        }
        if (formData.availability.availableRooms > formData.totalRooms) {
          toast.error('Available rooms cannot exceed total rooms');
          return false;
        }
        return true;

      case 4:
        if (!formData.features.area || formData.features.area < 50) {
          toast.error('Area must be at least 50 sq. ft.');
          return false;
        }
        if (formData.features.area > 2000) {
          toast.error('Area cannot exceed 2000 sq. ft.');
          return false;
        }
        return true;

      case 5:
        if (formData.amenities.length === 0) {
          toast.error('Please select at least one amenity');
          return false;
        }
        return true;

      case 6:
        if (formData.images.length === 0) {
          toast.error('Please upload at least one property image');
          return false;
        }
        if (formData.images.length > 20) {
          toast.error('Maximum 20 images allowed');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      // Validate that required fields are filled before submission
      if (!formData.roomType || !formData.accommodationType) {
        toast.error('Please select both room type and accommodation type');
        setLoading(false);
        return;
      }

      const submissionData: Parameters<typeof apiClient.createRoom>[0] = {
        title: formData.title,
        description: formData.description,
        fullDescription: formData.fullDescription || formData.description,
        price: formData.price,
        images: formData.images.map(img => img.url),
        roomType: formData.roomType,
        accommodationType: formData.accommodationType,
        maxSharingCapacity: formData.maxSharingCapacity,
        securityDeposit: formData.securityDeposit,
        maintenanceCharges: formData.maintenanceCharges,
        location: {
          address: formData.location.address,
          fullAddress: formData.location.fullAddress || formData.location.address,
          city: formData.location.city,
          state: formData.location.state,
          pincode: formData.location.pincode,
          coordinates: formData.location.coordinates,
          nearbyUniversities: formData.location.nearbyUniversities.length > 0
            ? formData.location.nearbyUniversities
            : undefined,
        },
        features: formData.features,
        amenities: formData.amenities,
        rules: formData.rules,
        availability: formData.availability,
        totalRooms: formData.totalRooms,
      };

      const result = await apiClient.createRoom(submissionData);

      if (result.success) {
        toast.success('🎉 Property listed successfully!', {
          description: 'Your property is now live and visible to students.',
          duration: 5000,
        });

        // Redirect after short delay
        setTimeout(() => {
          window.location.href = '/owner/properties';
        }, 2000);
      } else {
        toast.error(result.error || 'Failed to create property listing');
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Failed to submit property. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Room Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ROOM_TYPES.map((type) => (
                  <Card
                    key={type.value}
                    className={`cursor-pointer transition-all hover:shadow-md ${formData.roomType === type.value
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                      : 'hover:border-gray-400'
                      }`}
                    onClick={() => updateFormData({ roomType: type.value as any })}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-3">
                        <Home className={`w-6 h-6 mt-1 ${formData.roomType === type.value ? 'text-blue-600' : 'text-gray-500'
                          }`} />
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{type.label}</h4>
                          <p className="text-sm text-muted-foreground">{type.description}</p>
                        </div>
                        {formData.roomType === type.value && (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {formData.roomType === 'shared' && (
              <div>
                <Label htmlFor="maxSharing">Maximum Sharing Capacity</Label>
                <Input
                  id="maxSharing"
                  type="number"
                  min="2"
                  max="6"
                  value={formData.maxSharingCapacity}
                  onChange={(e) => updateFormData({ maxSharingCapacity: parseInt(e.target.value) || 2 })}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  How many people can share this room?
                </p>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold mb-4">Select Accommodation Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ACCOMMODATION_TYPES.map((type) => (
                  <Card
                    key={type.value}
                    className={`cursor-pointer transition-all hover:shadow-md ${formData.accommodationType === type.value
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                      : 'hover:border-gray-400'
                      }`}
                    onClick={() => updateFormData({ accommodationType: type.value as any })}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-3">
                        <Building2 className={`w-6 h-6 mt-1 ${formData.accommodationType === type.value ? 'text-blue-600' : 'text-gray-500'
                          }`} />
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{type.label}</h4>
                          <p className="text-sm text-muted-foreground">{type.description}</p>
                        </div>
                        {formData.accommodationType === type.value && (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="title">Property Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Comfortable Studio Apartment near IIT Delhi"
                value={formData.title}
                onChange={(e) => updateFormData({ title: e.target.value })}
                maxLength={200}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {formData.title.length}/200 characters
              </p>
            </div>

            <div>
              <Label htmlFor="description">Short Description *</Label>
              <Textarea
                id="description"
                placeholder="Brief description of your property (max 500 characters)"
                value={formData.description}
                onChange={(e) => updateFormData({ description: e.target.value })}
                maxLength={500}
                rows={3}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {formData.description.length}/500 characters
              </p>
            </div>

            <div>
              <Label htmlFor="fullDescription">Full Description (Optional)</Label>
              <Textarea
                id="fullDescription"
                placeholder="Detailed description of your property, nearby facilities, rules, etc. (max 2000 characters)"
                value={formData.fullDescription}
                onChange={(e) => updateFormData({ fullDescription: e.target.value })}
                maxLength={2000}
                rows={6}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {formData.fullDescription.length}/2000 characters
              </p>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Location Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="address">Street Address *</Label>
                  <Input
                    id="address"
                    placeholder="Building name, street, area"
                    value={formData.location.address}
                    onChange={(e) => updateNestedData('location', { address: e.target.value })}
                    className="mt-2"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="fullAddress">Complete Address (Optional)</Label>
                  <Textarea
                    id="fullAddress"
                    placeholder="Full address with landmarks"
                    value={formData.location.fullAddress}
                    onChange={(e) => updateNestedData('location', { fullAddress: e.target.value })}
                    rows={2}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="e.g., Delhi"
                    value={formData.location.city}
                    onChange={(e) => updateNestedData('location', { city: e.target.value })}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    placeholder="e.g., Delhi"
                    value={formData.location.state}
                    onChange={(e) => updateNestedData('location', { state: e.target.value })}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="pincode">PIN Code *</Label>
                  <Input
                    id="pincode"
                    placeholder="e.g., 110016"
                    value={formData.location.pincode}
                    onChange={(e) => updateNestedData('location', { pincode: e.target.value })}
                    maxLength={6}
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Map Location Selector */}
              <div className="mt-6 border-t pt-6">
                <h4 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Pin Exact Location on Map *
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Click on the map or search to select the exact location of your property
                </p>
                <LocationSelector
                  onLocationSelect={(location) => {
                    updateNestedData('location', {
                      coordinates: location.coordinates,
                      address: location.address,
                      fullAddress: location.fullAddress,
                      city: location.city,
                      state: location.state,
                      pincode: location.pincode,
                    });
                  }}
                  initialLocation={formData.location.coordinates}
                  height="450px"
                />
              </div>

              {/* Nearby Universities Section */}
              <div className="mt-6 border-t pt-6">
                <h4 className="text-base font-semibold mb-4">
                  🎓 Nearby Universities (Optional)
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Add nearby universities to attract students. This helps in search visibility.
                </p>

                {/* Add University Form */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <Input
                    placeholder="University name"
                    id="university-name-input"
                  />
                  <Input
                    placeholder="Distance (km)"
                    type="number"
                    step="0.1"
                    id="university-distance-input"
                  />
                  <Input
                    placeholder="Travel time (e.g., 15 mins)"
                    id="university-commute-input"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const nameInput = document.getElementById('university-name-input') as HTMLInputElement;
                    const distanceInput = document.getElementById('university-distance-input') as HTMLInputElement;
                    const commuteInput = document.getElementById('university-commute-input') as HTMLInputElement;

                    if (nameInput?.value && distanceInput?.value) {
                      const newUniversity = {
                        name: nameInput.value,
                        distance: distanceInput.value,
                        commute: commuteInput?.value || '',
                      };

                      updateNestedData('location', {
                        nearbyUniversities: [...formData.location.nearbyUniversities, newUniversity]
                      });

                      // Clear inputs
                      nameInput.value = '';
                      distanceInput.value = '';
                      if (commuteInput) commuteInput.value = '';
                    } else {
                      toast.error('Please enter university name and distance');
                    }
                  }}
                >
                  + Add University
                </Button>

                {/* List of added universities */}
                <div className="mt-4 space-y-2">
                  {formData.location.nearbyUniversities.map((uni, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{uni.name}</p>
                        <p className="text-sm text-gray-600">
                          {uni.distance}km away{uni.commute && ` • ${uni.commute}`}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updated = formData.location.nearbyUniversities.filter((_, i) => i !== index);
                          updateNestedData('location', { nearbyUniversities: updated });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  {formData.location.nearbyUniversities.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No universities added yet</p>
                  )}
                </div>
              </div>

              {/* Nearby Facilities Section */}
              <div className="mt-6 border-t pt-6">
                <h4 className="text-base font-semibold mb-4">
                  🏪 Nearby Facilities (Optional)
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Add nearby amenities like hospitals, metro stations, markets, etc.
                </p>

                {/* Add Facility Form */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    id="facility-type-input"
                  >
                    <option value="">Select type</option>
                    <option value="hospital">🏥 Hospital</option>
                    <option value="metro">🚇 Metro Station</option>
                    <option value="bus">🚌 Bus Stop</option>
                    <option value="market">🛒 Market/Mall</option>
                    <option value="restaurant">🍽️ Restaurant</option>
                    <option value="gym">🏋️ Gym</option>
                    <option value="bank">🏦 Bank/ATM</option>
                    <option value="pharmacy">💊 Pharmacy</option>
                    <option value="park">🌳 Park</option>
                    <option value="other">📍 Other</option>
                  </select>
                  <Input
                    placeholder="Facility name"
                    id="facility-name-input"
                  />
                  <Input
                    placeholder="Distance (km)"
                    type="number"
                    step="0.1"
                    id="facility-distance-input"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const typeInput = document.getElementById('facility-type-input') as HTMLSelectElement;
                    const nameInput = document.getElementById('facility-name-input') as HTMLInputElement;
                    const distanceInput = document.getElementById('facility-distance-input') as HTMLInputElement;

                    if (typeInput?.value && nameInput?.value && distanceInput?.value) {
                      const newFacility = {
                        type: typeInput.value,
                        name: nameInput.value,
                        distance: parseFloat(distanceInput.value),
                      };

                      const currentFacilities = formData.location.nearbyFacilities || [];
                      updateNestedData('location', {
                        nearbyFacilities: [...currentFacilities, newFacility]
                      });

                      // Clear inputs
                      typeInput.value = '';
                      nameInput.value = '';
                      distanceInput.value = '';
                    } else {
                      toast.error('Please fill all facility fields');
                    }
                  }}
                >
                  + Add Facility
                </Button>

                {/* List of added facilities */}
                <div className="mt-4 space-y-2">
                  {(formData.location.nearbyFacilities || []).map((facility: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{facility.name}</p>
                        <p className="text-sm text-gray-600">
                          {facility.type} • {facility.distance}km away
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updated = (formData.location.nearbyFacilities || []).filter((_: any, i: number) => i !== index);
                          updateNestedData('location', { nearbyFacilities: updated });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  {(!formData.location.nearbyFacilities || formData.location.nearbyFacilities.length === 0) && (
                    <p className="text-sm text-gray-500 italic">No facilities added yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center">
              <IndianRupee className="w-5 h-5 mr-2" />
              Pricing Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Monthly Rent (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="e.g., 15000"
                  value={formData.price || ''}
                  onChange={(e) => updateFormData({ price: parseFloat(e.target.value) || 0 })}
                  min="0"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="securityDeposit">Security Deposit (₹) *</Label>
                <Input
                  id="securityDeposit"
                  type="number"
                  placeholder="e.g., 30000"
                  value={formData.securityDeposit || ''}
                  onChange={(e) => updateFormData({ securityDeposit: parseFloat(e.target.value) || 0 })}
                  min="0"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="maintenanceCharges">Maintenance Charges (₹/month)</Label>
                <Input
                  id="maintenanceCharges"
                  type="number"
                  placeholder="e.g., 1000 (Optional)"
                  value={formData.maintenanceCharges || ''}
                  onChange={(e) => updateFormData({ maintenanceCharges: parseFloat(e.target.value) || 0 })}
                  min="0"
                  className="mt-2"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Room Availability</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="totalRooms">Total Rooms *</Label>
                  <Input
                    id="totalRooms"
                    type="number"
                    min="1"
                    value={formData.totalRooms || ''}
                    onChange={(e) => updateFormData({ totalRooms: parseInt(e.target.value) || 1 })}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="availableRooms">Currently Available *</Label>
                  <Input
                    id="availableRooms"
                    type="number"
                    min="0"
                    max={formData.totalRooms}
                    value={formData.availability.availableRooms || ''}
                    onChange={(e) => updateNestedData('availability', {
                      availableRooms: parseInt(e.target.value) || 0
                    })}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="availableFrom">Available From</Label>
                  <Input
                    id="availableFrom"
                    type="date"
                    value={formData.availability.availableFrom}
                    onChange={(e) => updateNestedData('availability', { availableFrom: e.target.value })}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Property Features</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="area">Area (sq. ft.) *</Label>
                <Input
                  id="area"
                  type="number"
                  placeholder="e.g., 400 (minimum 50 sq. ft.)"
                  value={formData.features.area || ''}
                  onChange={(e) => updateNestedData('features', {
                    area: parseFloat(e.target.value) || 0
                  })}
                  min="50"
                  max="2000"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 50 sq. ft. required</p>
              </div>

              <div>
                <Label htmlFor="floor">Floor Number</Label>
                <Input
                  id="floor"
                  type="number"
                  placeholder="e.g., 2"
                  value={formData.features.floor || ''}
                  onChange={(e) => updateNestedData('features', {
                    floor: parseInt(e.target.value) || 0
                  })}
                  min="0"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="totalFloors">Total Floors in Building</Label>
                <Input
                  id="totalFloors"
                  type="number"
                  placeholder="e.g., 5"
                  value={formData.features.totalFloors || ''}
                  onChange={(e) => updateNestedData('features', {
                    totalFloors: parseInt(e.target.value) || 0
                  })}
                  min="0"
                  className="mt-2"
                />
              </div>
            </div>

            <div className="space-y-4 border-t pt-6">
              <h4 className="font-medium">Additional Features</h4>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border hover:bg-accent transition-colors">
                  <Checkbox
                    checked={formData.features.furnished}
                    onCheckedChange={(checked) => updateNestedData('features', {
                      furnished: checked === true
                    })}
                  />
                  <div className="flex-1">
                    <p className="font-medium">Fully Furnished</p>
                    <p className="text-sm text-muted-foreground">
                      Includes bed, wardrobe, study table, etc.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border hover:bg-accent transition-colors">
                  <Checkbox
                    checked={formData.features.balcony}
                    onCheckedChange={(checked) => updateNestedData('features', {
                      balcony: checked === true
                    })}
                  />
                  <div className="flex-1">
                    <p className="font-medium">Balcony Available</p>
                    <p className="text-sm text-muted-foreground">
                      Private or shared balcony
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border hover:bg-accent transition-colors">
                  <Checkbox
                    checked={formData.features.attached_bathroom}
                    onCheckedChange={(checked) => updateNestedData('features', {
                      attached_bathroom: checked === true
                    })}
                  />
                  <div className="flex-1">
                    <p className="font-medium">Attached Bathroom</p>
                    <p className="text-sm text-muted-foreground">
                      Private bathroom attached to room
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Available Amenities</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select all facilities available at your property
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {AMENITIES_LIST.map((amenity) => {
                const Icon = amenity.icon;
                const isSelected = formData.amenities.includes(amenity.id);

                return (
                  <Card
                    key={amenity.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${isSelected
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                      : 'hover:border-gray-400'
                      }`}
                    onClick={() => toggleAmenity(amenity.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center text-center gap-2">
                        <Icon className={`w-6 h-6 ${isSelected ? 'text-primary' : 'text-gray-500'
                          }`} />
                        <span className="text-sm font-medium">{amenity.label}</span>
                        {isSelected && (
                          <CheckCircle className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {formData.amenities.length > 0 && (
              <Card className="bg-green-500/10 border-green-500/20">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-3">
                    Selected Amenities ({formData.amenities.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.amenities.map((amenityId) => {
                      const amenity = AMENITIES_LIST.find(a => a.id === amenityId);
                      return amenity ? (
                        <Badge key={amenityId} variant="secondary">
                          {amenity.label}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                <Camera className="w-5 h-5 mr-2" />
                Property Images
              </h3>
              <p className="text-sm text-muted-foreground">
                Upload high-quality images of your property. The first image will be the main display image.
              </p>
            </div>

            <ImageUploader
              images={formData.images}
              onImagesChange={(images) => updateFormData({ images })}
              maxImages={20}
              maxSizeMB={10}
            />
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">House Rules & Preferences</h3>
            </div>

            <div>
              <Label>Gender Preference</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {(['male', 'female', 'any'] as const).map((gender) => (
                  <Card
                    key={gender}
                    className={`cursor-pointer transition-all ${formData.rules.genderPreference === gender
                      ? 'border-primary bg-primary/10'
                      : 'hover:border-gray-400'
                      }`}
                    onClick={() => updateNestedData('rules', { genderPreference: gender })}
                  >
                    <CardContent className="p-4 text-center">
                      <p className="font-medium capitalize">{gender === 'any' ? 'No Preference' : gender}</p>
                      {formData.rules.genderPreference === gender && (
                        <CheckCircle className="w-4 h-4 text-primary mx-auto mt-2" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-3 border-t pt-6">
              <h4 className="font-medium mb-3">Allowed Activities</h4>

              <label className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent">
                <div>
                  <p className="font-medium">Smoking Allowed</p>
                  <p className="text-sm text-muted-foreground">Allow smoking inside the property</p>
                </div>
                <Checkbox
                  checked={formData.rules.smokingAllowed}
                  onCheckedChange={(checked) => updateNestedData('rules', {
                    smokingAllowed: checked === true
                  })}
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent">
                <div>
                  <p className="font-medium">Pets Allowed</p>
                  <p className="text-sm text-muted-foreground">Allow pets in the property</p>
                </div>
                <Checkbox
                  checked={formData.rules.petsAllowed}
                  onCheckedChange={(checked) => updateNestedData('rules', {
                    petsAllowed: checked === true
                  })}
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent">
                <div>
                  <p className="font-medium">Drinking Allowed</p>
                  <p className="text-sm text-muted-foreground">Allow alcohol consumption</p>
                </div>
                <Checkbox
                  checked={formData.rules.drinkingAllowed}
                  onCheckedChange={(checked) => updateNestedData('rules', {
                    drinkingAllowed: checked === true
                  })}
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent">
                <div>
                  <p className="font-medium">Visitors Allowed</p>
                  <p className="text-sm text-muted-foreground">Allow guests to visit</p>
                </div>
                <Checkbox
                  checked={formData.rules.visitorsAllowed}
                  onCheckedChange={(checked) => updateNestedData('rules', {
                    visitorsAllowed: checked === true
                  })}
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent">
                <div>
                  <p className="font-medium">Couples Allowed</p>
                  <p className="text-sm text-muted-foreground">Allow couples to rent together</p>
                </div>
                <Checkbox
                  checked={formData.rules.couplesAllowed}
                  onCheckedChange={(checked) => updateNestedData('rules', {
                    couplesAllowed: checked === true
                  })}
                />
              </label>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">Review Your Property Listing</h3>
              <p className="text-muted-foreground">
                Please review all details before publishing
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Property Type</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge>{formData.roomType}</Badge>
                    <Badge variant="outline">{formData.accommodationType}</Badge>
                  </div>
                  {formData.roomType === 'shared' && (
                    <p className="text-sm text-muted-foreground">
                      Max {formData.maxSharingCapacity} sharing
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Basic Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p><strong>Title:</strong> {formData.title}</p>
                  <p><strong>Location:</strong> {formData.location.city}, {formData.location.state}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pricing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p><strong>Monthly Rent:</strong> ₹{formData.price.toLocaleString()}</p>
                  <p><strong>Security Deposit:</strong> ₹{formData.securityDeposit.toLocaleString()}</p>
                  {formData.maintenanceCharges > 0 && (
                    <p><strong>Maintenance:</strong> ₹{formData.maintenanceCharges.toLocaleString()}/month</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Availability</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p><strong>Total Rooms:</strong> {formData.totalRooms}</p>
                  <p><strong>Available:</strong> {formData.availability.availableRooms}</p>
                  <p><strong>From:</strong> {new Date(formData.availability.availableFrom).toLocaleDateString()}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {formData.features.area > 0 && <p><strong>Area:</strong> {formData.features.area} sq. ft.</p>}
                  {formData.features.floor > 0 && <p><strong>Floor:</strong> {formData.features.floor}/{formData.features.totalFloors}</p>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.features.furnished && <Badge variant="secondary">Furnished</Badge>}
                    {formData.features.balcony && <Badge variant="secondary">Balcony</Badge>}
                    {formData.features.attached_bathroom && <Badge variant="secondary">Attached Bath</Badge>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Amenities ({formData.amenities.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {formData.amenities.slice(0, 6).map((amenityId) => {
                      const amenity = AMENITIES_LIST.find(a => a.id === amenityId);
                      return amenity ? (
                        <Badge key={amenityId} variant="outline" className="text-xs">
                          {amenity.label}
                        </Badge>
                      ) : null;
                    })}
                    {formData.amenities.length > 6 && (
                      <Badge variant="outline" className="text-xs">
                        +{formData.amenities.length - 6} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Images</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{formData.images.length} images uploaded</p>
                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {formData.images.slice(0, 4).map((img, index) => (
                        <div key={img.id} className="aspect-square rounded overflow-hidden border">
                          <img
                            src={img.url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">House Rules</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p><strong>Gender:</strong> {formData.rules.genderPreference === 'any' ? 'No Preference' : formData.rules.genderPreference}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.rules.smokingAllowed && <Badge variant="secondary">Smoking OK</Badge>}
                    {formData.rules.petsAllowed && <Badge variant="secondary">Pets OK</Badge>}
                    {formData.rules.visitorsAllowed && <Badge variant="secondary">Visitors OK</Badge>}
                    {formData.rules.couplesAllowed && <Badge variant="secondary">Couples OK</Badge>}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-6">
                <h4 className="font-semibold mb-2 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Ready to Publish?
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Your property will be visible to thousands of students searching for accommodation.
                  Make sure all details are accurate.
                </p>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Publishing Property...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Publish Property
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="py-6 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">List Your Property</h1>
          <p className="text-muted-foreground">
            Connect with thousands of students looking for accommodation
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">
              Step {currentStep} of {steps.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round((currentStep / steps.length) * 100)}% Complete
            </span>
          </div>
          <Progress value={(currentStep / steps.length) * 100} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="overflow-x-auto pb-4">
          <div className="flex items-center gap-2 min-w-max">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center min-w-[100px]">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${isCompleted
                        ? 'bg-green-600 text-white'
                        : isActive
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                          : 'bg-gray-200 text-gray-600'
                        }`}
                    >
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> : step.id}
                    </div>
                    <div className="mt-2 text-center">
                      <div className={`text-xs font-medium ${isActive ? 'text-blue-600' : ''}`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-muted-foreground hidden sm:block">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-12 h-0.5 mx-2 transition-all ${isCompleted ? 'bg-green-600' : 'bg-gray-300'
                        }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
            <CardDescription>{steps[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            size="lg"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {currentStep < steps.length && (
            <Button onClick={nextStep} size="lg">
              Next Step
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
