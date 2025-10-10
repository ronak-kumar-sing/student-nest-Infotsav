"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import apiClient from '@/lib/api';
import { toast } from 'sonner';
import {
  Users, Home, Calendar, IndianRupee, MessageCircle,
  Phone, Loader2, ArrowLeft, CheckCircle, AlertCircle
} from 'lucide-react';

interface RoomSharingFormData {
  roomId: string;
  maxParticipants: number;
  rentPerPerson: number;
  securityDeposit: number;
  description: string;
  preferences: {
    ageRange: { min: number; max: number };
    gender: string;
    occupation: string[];
    lifestyle: string[];
    habits: string[];
  };
  availability: {
    availableFrom: string;
    duration: number;
  };
  contact: {
    phone: string;
    whatsappAvailable: boolean;
    preferredContactTime: string;
  };
}

const LIFESTYLE_OPTIONS = [
  'Early Bird', 'Night Owl', 'Social', 'Quiet', 'Clean & Organized',
  'Fitness Enthusiast', 'Foodie', 'Minimalist', 'Pet Lover'
];

const HABIT_OPTIONS = [
  'Non-Smoker', 'Vegetarian', 'Non-Vegetarian', 'Vegan',
  'No Alcohol', 'Studious', 'Working Professional', 'Freelancer'
];

const OCCUPATION_OPTIONS = [
  'Student', 'Working Professional', 'Freelancer', 'Entrepreneur', 'Any'
];

export default function PostRoomSharingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [myRooms, setMyRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [roomFromUrl, setRoomFromUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState<RoomSharingFormData>({
    roomId: '',
    maxParticipants: 1,
    rentPerPerson: 0,
    securityDeposit: 0,
    description: '',
    preferences: {
      ageRange: { min: 18, max: 35 },
      gender: 'any',
      occupation: [],
      lifestyle: [],
      habits: [],
    },
    availability: {
      availableFrom: new Date().toISOString().split('T')[0],
      duration: 6,
    },
    contact: {
      phone: '',
      whatsappAvailable: true,
      preferredContactTime: 'evening',
    },
  });

  useEffect(() => {
    // Check if roomId is provided in query params
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomId = params.get('roomId');

      if (roomId) {
        console.log('Loading room from URL:', roomId);
        setRoomFromUrl(roomId);
        setFormData(prev => ({ ...prev, roomId }));
        loadSpecificRoom(roomId);
      } else {
        // No roomId in URL, load from bookings
        loadMyRooms();
      }
    }
  }, []);

  const loadSpecificRoom = async (roomId: string) => {
    try {
      setLoadingRooms(true);
      const response = await apiClient.request(`/rooms/${roomId}`);

      if (response.success && response.data) {
        setSelectedRoom(response.data);
        setMyRooms([response.data]); // Set as the only available room

        // Auto-calculate rent per person based on total rent and default sharing
        const defaultRentPerPerson = Math.floor(response.data.price / 2);
        const defaultDeposit = response.data.securityDeposit || response.data.price || 0;

        setFormData(prev => ({
          ...prev,
          roomId: response.data.id,
          rentPerPerson: defaultRentPerPerson,
          securityDeposit: defaultDeposit
        }));

        toast.success('Room loaded successfully!');
      }
    } catch (error) {
      console.error('Error loading room:', error);
      toast.error('Failed to load room details');
    } finally {
      setLoadingRooms(false);
    }
  };

  const loadMyRooms = async () => {
    try {
      setLoadingRooms(true);
      // Get user's bookings to find rooms they can share
      const response = await apiClient.request('/bookings/my-bookings');

      if (response.success && response.data) {
        // API returns categorized bookings: { pending, confirmed, active, completed, cancelled }
        const { active = [], confirmed = [] } = response.data;

        // Combine active and confirmed bookings
        const availableBookings = [...active, ...confirmed];

        // Extract unique rooms (some bookings might have same room)
        const roomsMap = new Map();
        availableBookings.forEach((booking: any) => {
          if (booking.room && booking.room.id) {
            roomsMap.set(booking.room.id, booking.room);
          }
        });

        setMyRooms(Array.from(roomsMap.values()));
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
      toast.error('Failed to load your rooms');
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.roomId) {
      toast.error('Please select a room');
      return;
    }

    if (formData.maxParticipants < 1 || formData.maxParticipants > 5) {
      toast.error('Max participants must be between 1 and 5');
      return;
    }

    if (!formData.rentPerPerson || formData.rentPerPerson <= 0) {
      toast.error('Please enter rent per person');
      return;
    }

    if (!formData.securityDeposit || formData.securityDeposit <= 0) {
      toast.error('Please enter security deposit');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please add a description');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.createRoomSharingRequest(formData.roomId, {
        maxParticipants: formData.maxParticipants,
        rentPerPerson: formData.rentPerPerson,
        securityDeposit: formData.securityDeposit,
        description: formData.description,
        preferences: formData.preferences,
        availability: formData.availability,
        contact: formData.contact,
      });

      if (response.success) {
        toast.success('Room sharing post created successfully!');
        router.push('/dashboard/shared-rooms');
      } else {
        toast.error(response.error || 'Failed to create post');
      }
    } catch (error: any) {
      console.error('Error creating room sharing post:', error);
      toast.error(error.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    } else {
      return [...array, item];
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Post Room for Sharing</h1>
          <p className="text-muted-foreground">Find compatible roommates to share your space</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Room Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Select Room
            </CardTitle>
            <CardDescription>Choose which room you want to share</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRooms ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : myRooms.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No room available to share.</p>
                <Button
                  variant="link"
                  onClick={() => router.push('/dashboard/rooms')}
                  className="mt-2"
                >
                  Browse Rooms
                </Button>
              </div>
            ) : roomFromUrl ? (
              // Show pre-selected room from URL
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      {selectedRoom?.title || myRooms[0]?.title}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {selectedRoom?.location?.city || myRooms[0]?.location?.city} •
                      ₹{selectedRoom?.price || myRooms[0]?.price}/month
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    Selected from Room Details
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  This room was pre-selected. You can share it with compatible roommates.
                </p>
              </div>
            ) : (
              // Show dropdown for rooms from bookings
              <Select
                value={formData.roomId}
                onValueChange={(value) => setFormData({ ...formData, roomId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent>
                  {myRooms.map((room) => (
                    <SelectItem key={room._id || room.id} value={room._id || room.id}>
                      {room.title} - {room.location?.city} (₹{room.price}/month)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Sharing Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Sharing Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxParticipants">Max Participants *</Label>
                <Select
                  value={formData.maxParticipants.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, maxParticipants: parseInt(value) })
                  }
                >
                  <SelectTrigger id="maxParticipants">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {num === 1 ? 'Person' : 'People'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  How many people can share this room?
                </p>
              </div>

              <div>
                <Label htmlFor="rentPerPerson">Rent per Person (₹/month) *</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="rentPerPerson"
                    type="number"
                    min="0"
                    value={formData.rentPerPerson || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, rentPerPerson: parseInt(e.target.value) })
                    }
                    className="pl-10"
                    placeholder="5000"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="securityDeposit">Security Deposit (₹) *</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="securityDeposit"
                    type="number"
                    min="0"
                    value={formData.securityDeposit || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, securityDeposit: parseInt(e.target.value) })
                    }
                    className="pl-10"
                    placeholder="10000"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total security deposit for the room
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell potential roommates about yourself and what you're looking for..."
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 50 characters. Be specific about your lifestyle and preferences.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Roommate Preferences</CardTitle>
            <CardDescription>Help find the perfect match</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Gender & Age */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Gender Preference</Label>
                <Select
                  value={formData.preferences.gender}
                  onValueChange={(value: any) =>
                    setFormData({
                      ...formData,
                      preferences: { ...formData.preferences, gender: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Age Range</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={formData.preferences.ageRange.min}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preferences: {
                          ...formData.preferences,
                          ageRange: { ...formData.preferences.ageRange, min: parseInt(e.target.value) },
                        },
                      })
                    }
                    min="18"
                    max="65"
                  />
                  <span>to</span>
                  <Input
                    type="number"
                    value={formData.preferences.ageRange.max}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preferences: {
                          ...formData.preferences,
                          ageRange: { ...formData.preferences.ageRange, max: parseInt(e.target.value) },
                        },
                      })
                    }
                    min="18"
                    max="65"
                  />
                </div>
              </div>
            </div>

            {/* Occupation */}
            <div>
              <Label>Occupation</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {OCCUPATION_OPTIONS.map((occ) => (
                  <Badge
                    key={occ}
                    variant={formData.preferences.occupation.includes(occ) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        preferences: {
                          ...formData.preferences,
                          occupation: toggleArrayItem(formData.preferences.occupation, occ),
                        },
                      })
                    }
                  >
                    {occ}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Lifestyle */}
            <div>
              <Label>Lifestyle Preferences</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {LIFESTYLE_OPTIONS.map((lifestyle) => (
                  <Badge
                    key={lifestyle}
                    variant={formData.preferences.lifestyle.includes(lifestyle) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        preferences: {
                          ...formData.preferences,
                          lifestyle: toggleArrayItem(formData.preferences.lifestyle, lifestyle),
                        },
                      })
                    }
                  >
                    {lifestyle}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Habits */}
            <div>
              <Label>Habits & Preferences</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {HABIT_OPTIONS.map((habit) => (
                  <Badge
                    key={habit}
                    variant={formData.preferences.habits.includes(habit) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        preferences: {
                          ...formData.preferences,
                          habits: toggleArrayItem(formData.preferences.habits, habit),
                        },
                      })
                    }
                  >
                    {habit}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Availability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Availability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="availableFrom">Available From</Label>
                <Input
                  id="availableFrom"
                  type="date"
                  value={formData.availability.availableFrom}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      availability: { ...formData.availability, availableFrom: e.target.value },
                    })
                  }
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div>
                <Label htmlFor="duration">Duration (months)</Label>
                <Select
                  value={formData.availability.duration.toString()}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      availability: { ...formData.availability, duration: parseInt(value) },
                    })
                  }
                >
                  <SelectTrigger id="duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 6, 9, 12, 18, 24].map((months) => (
                      <SelectItem key={months} value={months.toString()}>
                        {months} months
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.contact.phone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contact: { ...formData.contact, phone: e.target.value },
                  })
                }
                placeholder="+91 XXXXX XXXXX"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="whatsapp"
                checked={formData.contact.whatsappAvailable}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    contact: { ...formData.contact, whatsappAvailable: checked as boolean },
                  })
                }
              />
              <Label htmlFor="whatsapp" className="cursor-pointer">
                Available on WhatsApp
              </Label>
            </div>

            <div>
              <Label>Preferred Contact Time</Label>
              <Select
                value={formData.contact.preferredContactTime}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    contact: { ...formData.contact, preferredContactTime: value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (6 AM - 12 PM)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12 PM - 5 PM)</SelectItem>
                  <SelectItem value="evening">Evening (5 PM - 9 PM)</SelectItem>
                  <SelectItem value="anytime">Anytime</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || loadingRooms || myRooms.length === 0}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Post...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Post Room Sharing
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
