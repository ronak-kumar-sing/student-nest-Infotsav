"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { Button } from "../../../../../components/ui/button";
import { Badge } from "../../../../../components/ui/badge";
import { Separator } from "../../../../../components/ui/separator";
import {
  ArrowLeft,
  Users,
  MapPin,
  IndianRupee,
  Calendar,
  User,
  Mail,
  Phone,
  Heart,
  UserPlus,
  Check,
  X,
  Loader2,
  Home,
  Bed,
  Bath,
  Utensils,
  BookOpen,
  Shield
} from "lucide-react";
import Image from 'next/image';
import apiClient from '../../../../../lib/api';
import { toast } from 'sonner';

export default function RoomSharingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const shareId = params.id as string;

  const [share, setShare] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [interested, setInterested] = useState(false);

  useEffect(() => {
    if (shareId) {
      fetchShareDetails();
    }
  }, [shareId]);

  const fetchShareDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.request(`/room-sharing/${shareId}`);

      if (response.success && response.data) {
        setShare(response.data);
        setInterested(response.data.userContext?.hasInterest || false);
      } else {
        toast.error('Failed to load room sharing details');
      }
    } catch (error) {
      console.error('Error fetching share details:', error);
      toast.error('Failed to load room sharing details');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    try {
      setApplying(true);
      const response = await apiClient.request(`/room-sharing/${shareId}/apply`, {
        method: 'POST',
        body: JSON.stringify({
          message: 'I would like to join this room sharing'
        })
      });

      if (response.success) {
        toast.success('Application submitted successfully!');
        fetchShareDetails();
      } else {
        toast.error(response.error || 'Failed to apply');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  const handleInterest = async () => {
    try {
      const response = await apiClient.request('/room-sharing/interest', {
        method: 'POST',
        body: JSON.stringify({ roomSharingId: shareId })
      });

      if (response.success) {
        setInterested(!interested);
        toast.success(interested ? 'Removed from interested' : 'Added to interested');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update interest');
    }
  };

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!share) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Room sharing not found</p>
            <Button onClick={() => router.back()} className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const property = share.property;
  const initiator = share.initiator;
  const costSharing = share.costSharing;
  const requirements = share.requirements;
  const roomConfig = share.roomConfiguration;

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{property?.title || 'Room Sharing'}</h1>
          <div className="flex items-center gap-2 text-muted-foreground mt-1">
            <MapPin className="h-4 w-4" />
            <span>
              {property?.location?.address || `${property?.location?.city}, ${property?.location?.state}`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={share.status === 'active' ? 'default' : 'secondary'}>
            {share.status}
          </Badge>
          {share.isFull && <Badge variant="destructive">Full</Badge>}
          {property?._id && (
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/rooms/${property._id}`)}
            >
              <Home className="h-4 w-4 mr-2" />
              View Room Details
            </Button>
          )}
        </div>
      </div>

      {/* Property Images */}
      {property?.images && property.images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative h-96 rounded-lg overflow-hidden">
            <Image
              src={property.images[0]}
              alt={property.title}
              fill
              className="object-cover"
            />
          </div>
          {property.images[1] && (
            <div className="grid grid-rows-2 gap-4">
              <div className="relative h-full rounded-lg overflow-hidden">
                <Image
                  src={property.images[1]}
                  alt={property.title}
                  fill
                  className="object-cover"
                />
              </div>
              {property.images[2] && (
                <div className="relative h-full rounded-lg overflow-hidden">
                  <Image
                    src={property.images[2]}
                    alt={property.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cost Sharing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5" />
                Cost Sharing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Rent per Person</p>
                  <p className="text-2xl font-bold">₹{costSharing?.rentPerPerson || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Security Deposit per Person</p>
                  <p className="text-2xl font-bold">₹{costSharing?.depositPerPerson || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Monthly Rent</p>
                  <p className="text-xl font-semibold">₹{costSharing?.monthlyRent || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Utilities</p>
                  <p className="text-xl font-semibold">
                    {costSharing?.utilitiesIncluded ? 'Included' : `₹${costSharing?.utilitiesPerPerson || 0}/person`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Room Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bed className="h-5 w-5" />
                Room Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Bed className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Beds</p>
                    <p className="font-medium">{roomConfig?.totalBeds || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Available</p>
                    <p className="font-medium">{roomConfig?.bedsAvailable || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Bath className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Bathroom</p>
                    <p className="font-medium">{roomConfig?.hasPrivateBathroom ? 'Private' : 'Shared'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Kitchen</p>
                    <p className="font-medium">{roomConfig?.hasSharedKitchen ? 'Shared' : 'None'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>About This Sharing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-line">
                {share.description || 'No description provided'}
              </p>
            </CardContent>
          </Card>

          {/* Requirements & Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Requirements & Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Gender Preference</p>
                <Badge variant="outline">{requirements?.gender || 'Any'}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Age Range</p>
                <Badge variant="outline">
                  {requirements?.ageRange?.min || 18} - {requirements?.ageRange?.max || 65} years
                </Badge>
              </div>
              {requirements?.preferences && requirements.preferences.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Preferences</p>
                  <div className="flex flex-wrap gap-2">
                    {requirements.preferences.map((pref: string, index: number) => (
                      <Badge key={index} variant="secondary">{pref}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {requirements?.lifestyle && requirements.lifestyle.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Lifestyle</p>
                  <div className="flex flex-wrap gap-2">
                    {requirements.lifestyle.map((item: string, index: number) => (
                      <Badge key={index} variant="secondary">{item}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* House Rules */}
          {share.houseRules && share.houseRules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  House Rules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {share.houseRules.map((rule: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5" />
                      <span className="text-sm">{rule}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Sharing Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Sharing Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Max Participants</p>
                <p className="text-lg font-semibold">{share.maxParticipants}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Participants</p>
                <p className="text-lg font-semibold">{share.currentParticipants?.length || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Slots</p>
                <p className="text-lg font-semibold text-green-600">{share.availableSlots || 0}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Available From</p>
                <p className="font-medium">
                  {new Date(share.availableFrom).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Initiator Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Initiator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                {initiator?.profilePhoto ? (
                  <Image
                    src={initiator.profilePhoto}
                    alt={initiator.fullName}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{initiator?.fullName || 'User'}</p>
                  <div className="flex items-center gap-1">
                    {initiator?.isEmailVerified && (
                      <Badge variant="outline" className="text-xs">Verified</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{initiator?.email || 'N/A'}</span>
                </div>
                {initiator?.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{initiator.phone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Compatibility Score */}
          {share.userContext?.compatibilityScore != null && (
            <Card>
              <CardHeader>
                <CardTitle>Compatibility Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary">
                    {Math.round(share.userContext?.compatibilityScore || 0)}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on lifestyle preferences
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              {!share.userContext?.isInitiator && !share.isFull && (
                <>
                  {share.userContext?.hasApplied ? (
                    <Button disabled className="w-full">
                      <Check className="h-4 w-4 mr-2" />
                      Application Submitted
                    </Button>
                  ) : (
                    <Button onClick={handleApply} disabled={applying} className="w-full">
                      {applying ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-2" />
                      )}
                      Apply to Join
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleInterest}
                    className="w-full"
                  >
                    <Heart className={`h-4 w-4 mr-2 ${interested ? 'fill-red-500 text-red-500' : ''}`} />
                    {interested ? 'Remove Interest' : 'Show Interest'}
                  </Button>
                </>
              )}
              {share.userContext?.isInitiator && (
                <Badge variant="secondary" className="w-full justify-center py-2">
                  You are the initiator
                </Badge>
              )}
              {share.isFull && !share.userContext?.isParticipant && (
                <Badge variant="destructive" className="w-full justify-center py-2">
                  This sharing is full
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
