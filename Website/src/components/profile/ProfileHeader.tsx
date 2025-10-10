"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import VerificationBadge from './VerificationBadge';
import {
  Camera,
  Edit,
  MapPin,
  Calendar,
  GraduationCap,
  Building,
  Star,
  Clock,
  Users,
  Award
} from 'lucide-react';

const ProfileHeader = ({
  user,
  userType = "student",
  onEditClick,
  onUploadAvatar
}) => {
  const [avatarHover, setAvatarHover] = useState(false);

  // Early return if user data is not available
  if (!user) {
    return (
      <Card className="relative overflow-hidden">
        <CardContent className="p-8">
          <div className="animate-pulse">
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 bg-gray-300 rounded-full"></div>
              <div className="flex-1 space-y-4">
                <div className="h-6 bg-gray-300 rounded w-1/3"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                <div className="h-4 bg-gray-300 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getInitials = (firstName, lastName) => {
    if (!firstName && !lastName) {
      // Fallback to fullName if firstName/lastName not available
      const fullName = user.fullName || user.businessName || 'User';
      const nameParts = fullName.split(' ');
      return nameParts.length > 1
        ? `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase()
        : fullName.substring(0, 2).toUpperCase();
    }
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const formatJoinDate = (dateString) => {
    if (!dateString) return 'Recently joined';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  const getUserDisplayName = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.fullName || user.businessName || 'User';
  };

  const renderStudentInfo = () => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <GraduationCap size={16} />
        <span className="text-sm">{user.course || 'Not specified'}</span>
      </div>
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <Building size={16} />
        <span className="text-sm">{user.collegeName || 'Not specified'}</span>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-500">
        {user.yearOfStudy || 'Not specified'} Year • ID: {user.collegeId || 'Not specified'}
      </div>
    </div>
  );

  const renderOwnerInfo = () => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <Building size={16} />
        <span className="text-sm">{user.businessName || 'Not specified'}</span>
      </div>
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <Award size={16} />
        <span className="text-sm capitalize">{user.businessType || 'Individual'} • {user.experience || 0} years exp.</span>
      </div>
      {user.averageRating && (
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Star size={16} className="text-yellow-500 fill-current" />
          <span className="text-sm">
            {user.averageRating}/5 {user.totalReviews && `(${user.totalReviews} reviews)`}
          </span>
        </div>
      )}
    </div>
  );

  const renderVerificationBadges = () => {
    if (userType === "student") {
      return (
        <div className="flex flex-wrap gap-2">
          <VerificationBadge
            status={user.verification?.email ? 'verified' : 'not_verified'}
            type="email"
          />
          <VerificationBadge
            status={user.verification?.phone ? 'verified' : 'not_verified'}
            type="phone"
          />
          <VerificationBadge
            status={user.verification?.collegeId || 'not_verified'}
            type="college_id"
          />
        </div>
      );
    } else {
      return (
        <div className="flex flex-wrap gap-2">
          <VerificationBadge
            status={user.verification?.aadhaar || 'not_verified'}
            type="aadhaar"
          />
          <VerificationBadge
            status={user.verification?.digilocker ? 'verified' : 'not_verified'}
            type="digilocker"
          />
          <VerificationBadge
            status={user.verification?.pan || 'not_verified'}
            type="pan"
          />
        </div>
      );
    }
  };

  const renderStats = () => {
    if (userType === "student") {
      return (
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {user.savedProperties || 0}
            </div>
            <div className="text-xs text-gray-500">Saved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {user.meetingRequests || 0}
            </div>
            <div className="text-xs text-gray-500">Visits</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {user.profileCompleteness || 0}%
            </div>
            <div className="text-xs text-gray-500">Complete</div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {user.totalProperties || 0}
            </div>
            <div className="text-xs text-gray-500">Properties</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {user.totalBookings || 0}
            </div>
            <div className="text-xs text-gray-500">Bookings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {user.responseTime || 0}h
            </div>
            <div className="text-xs text-gray-500">Response</div>
          </div>
        </div>
      );
    }
  };

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 border-0 shadow-lg">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center md:items-start">
            <div
              className="relative group cursor-pointer"
              onMouseEnter={() => setAvatarHover(true)}
              onMouseLeave={() => setAvatarHover(false)}
              onClick={onUploadAvatar}
            >
              <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                <AvatarImage
                  src={user.profilePhoto || user.avatar}
                  alt={getUserDisplayName()}
                />
                <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {getInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
              {avatarHover && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <Camera size={20} className="text-white" />
                </div>
              )}
            </div>
            <div className="mt-2 text-center md:text-left">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Joined {formatJoinDate(user.createdAt)}
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                    {getUserDisplayName()}
                  </h1>
                  <Badge
                    variant="secondary"
                    className={`${userType === "student"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      }`}
                  >
                    {userType === "student" ? "Student" : "Property Owner"}
                  </Badge>
                </div>

                {user.bio && (
                  <p className="text-gray-600 dark:text-gray-300 max-w-2xl">
                    {user.bio}
                  </p>
                )}

                {userType === "student" ? renderStudentInfo() : renderOwnerInfo()}
              </div>

              <Button
                onClick={onEditClick}
                variant="outline"
                className="self-start"
              >
                <Edit size={16} className="mr-2" />
                Edit Profile
              </Button>
            </div>

            {/* Verification Badges */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Verification Status
              </div>
              <VerificationBadge
                emailVerified={user.emailVerified}
                phoneVerified={user.phoneVerified}
                idVerified={user.aadhaarVerified || user.studentIdVerified}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileHeader;
