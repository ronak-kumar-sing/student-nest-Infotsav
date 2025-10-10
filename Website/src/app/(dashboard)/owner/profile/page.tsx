"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ProfileNavigation from '@/components/profile/ProfileNavigation';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileEditForm from '@/components/forms/ProfileEditForm';
import { getOwnerProfile, updateOwnerProfile, uploadAvatar } from '@/lib/api';
import {
  Building,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Star,
  Users,
  Home,
  TrendingUp,
  RefreshCw,
  Edit,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

function OwnerProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await getOwnerProfile();
      if (response.success) {
        setProfile(response.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (data: any) => {
    try {
      const response = await updateOwnerProfile(data);
      if (response.success) {
        setProfile({ ...(profile || {}), ...data });
        setIsEditing(false);
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    }
  };

  const handleAvatarUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/jpg,image/webp';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        try {
          const formData = new FormData();
          formData.append('profilePhoto', file);

          const response = await uploadAvatar(formData);
          if (response.success) {
            setProfile((prev: any) => ({ ...prev, profilePhoto: response.data.photoUrl, avatar: response.data.photoUrl }));
            toast.success('Profile photo updated successfully!');
            fetchProfile(); // Refresh profile data
          } else {
            toast.error(response.error || 'Failed to upload profile photo');
          }
        } catch (error) {
          console.error('Error uploading profile photo:', error);
          toast.error('Failed to upload profile photo. Please try again.');
        }
      }
    };
    input.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3 text-gray-400">
              <RefreshCw size={24} className="animate-spin" />
              <span>Loading profile...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Profile not found
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Unable to load your profile. Please try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Building size={24} className="text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Property Owner Profile</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <ProfileNavigation userType="owner" />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Profile Header */}
            <ProfileHeader
              user={profile}
              userType="owner"
              onEditClick={() => setIsEditing(true)}
              onUploadAvatar={handleAvatarUpload}
            />

            {/* Business Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Total Properties
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {profile.totalProperties || 0}
                      </p>
                    </div>
                    <Home size={24} className="text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Active Listings
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {profile.activeListings || 0}
                      </p>
                    </div>
                    <TrendingUp size={24} className="text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Total Tenants
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {profile.totalTenants || 0}
                      </p>
                    </div>
                    <Users size={24} className="text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Average Rating
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {profile.averageRating || 0}/5
                      </p>
                    </div>
                    <Star size={24} className="text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone size={20} className="text-green-600" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Mail size={16} className="text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</p>
                        <p className="text-gray-900 dark:text-white">{profile.email || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone size={16} className="text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Phone</p>
                        <p className="text-gray-900 dark:text-white">{profile.phone || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin size={16} className="text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Address</p>
                        <p className="text-gray-900 dark:text-white">{profile.address || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar size={16} className="text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Date of Birth</p>
                        <p className="text-gray-900 dark:text-white">
                          {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'Not provided'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users size={16} className="text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Gender</p>
                        <p className="text-gray-900 dark:text-white">
                          {profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : 'Not provided'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar size={16} className="text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Member Since</p>
                        <p className="text-gray-900 dark:text-white">
                          {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Not available'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {profile.bio && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Bio
                    </p>
                    <p className="text-gray-900 dark:text-white leading-relaxed">
                      {profile.bio}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Profile Completion */}
            <Card className="border-green-200 bg-green-50 dark:bg-green-900/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-300">
                  <TrendingUp size={20} />
                  Profile Strength
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-green-700 dark:text-green-400">Profile Completion</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {profile.profileCompletion || 85}%
                    </Badge>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${profile.profileCompletion || 85}%` }}
                    ></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-green-700 dark:text-green-400">
                      ✓ Complete your business verification to increase trust
                    </div>
                    <div className="text-green-700 dark:text-green-400">
                      ✓ Add more property photos to attract students
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Profile Modal */}
        {isEditing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Edit Profile
                  </h2>
                  <Button
                    variant="ghost"
                    onClick={() => setIsEditing(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </Button>
                </div>
                <ProfileEditForm
                  profile={profile}
                  userType="owner"
                  onUpdate={handleProfileUpdate}
                  isLoading={false}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OwnerProfilePage;
