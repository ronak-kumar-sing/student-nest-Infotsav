"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileNavigation from '@/components/profile/ProfileNavigation';
import ProfileEditForm from '@/components/forms/ProfileEditForm';
import VerificationWidget from '@/components/verification/VerificationWidget';
import { getStudentProfile, updateStudentProfile, uploadAvatar } from '@/lib/api';
import { Camera, Edit, RefreshCw, Shield, ShieldCheck, AlertTriangle, ArrowRight, Clock, Info, X } from 'lucide-react';

// Verification Profile Section Component
function VerificationProfileSection({ verificationDetails, onRefresh }: any) {
  const { user, verification, requirements } = verificationDetails;
  const isVerified = user.isIdentityVerified;
  const isSkipped = user.identityVerificationSkipped;

  // Helper function to check step completion
  const isStepCompleted = (stepName: string) => {
    if (verification?.simpleSteps) {
      return verification.simpleSteps[stepName] === 'completed';
    }
    return verification?.completedSteps?.includes(stepName) || false;
  };

  // Check if verification is in progress
  const hasVerificationInProgress = verification && (
    (verification.completedSteps?.length > 0) ||
    (verification.simpleSteps && Object.values(verification.simpleSteps).some(status => status === 'completed'))
  );

  const handleSkipVerification = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/verify/requirements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'skip' })
      });

      const result = await response.json();

      if (result.success) {
        alert('Identity verification skipped. You can enable it later.');
        onRefresh();
      } else {
        alert(result.error || 'Failed to skip verification');
      }
    } catch (error) {
      console.error('Error skipping verification:', error);
      alert('Failed to skip verification');
    }
  };

  const handleEnableVerification = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/verify/requirements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'require' })
      });

      const result = await response.json();

      if (result.success) {
        alert('Identity verification enabled. Redirecting to verification page...');
        window.location.href = '/student/profile/verification';
      } else {
        alert(result.error || 'Failed to enable verification');
      }
    } catch (error) {
      console.error('Error enabling verification:', error);
      alert('Failed to enable verification');
    }
  };

  if (isVerified) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <ShieldCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-green-900">Identity Verified</h4>
              <p className="text-sm text-green-700">Your identity has been successfully verified</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-600 hover:bg-green-700">Verified</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <h5 className="font-medium text-sm">Document Verified</h5>
            <p className="text-xs text-gray-600">Identity confirmed</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <h5 className="font-medium text-sm">Selfie Verified</h5>
            <p className="text-xs text-gray-600">Face matching passed</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <h5 className="font-medium text-sm">Account Secured</h5>
            <p className="text-xs text-gray-600">Trusted member</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="font-semibold text-blue-900 mb-2">Verification Benefits Active</h5>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>✅ Access to verified-only properties</li>
            <li>✅ Priority in room applications</li>
            <li>✅ Advanced search filters</li>
            <li>✅ Premium support access</li>
          </ul>
        </div>
      </div>
    );
  }

  if (isSkipped) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-full">
              <X className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Verification Skipped</h4>
              <p className="text-sm text-gray-700">You chose to skip identity verification</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h5 className="font-semibold text-yellow-900 mb-2">Enable Identity Verification</h5>
              <p className="text-sm text-yellow-800 mb-3">
                Verify your identity to access premium features and build trust with property owners.
              </p>
              <ul className="space-y-1 text-sm text-yellow-800 mb-4">
                <li>• Access verified-only properties</li>
                <li>• Get priority in room applications</li>
                <li>• Build trust with property owners</li>
                <li>• Receive premium support</li>
              </ul>
              <div className="flex gap-3">
                <Button
                  onClick={handleEnableVerification}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Enable Verification
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/student/profile/verification'}
                >
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hasVerificationInProgress) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900">Verification In Progress</h4>
              <p className="text-sm text-blue-700">
                {Object.values(verification.simpleSteps || {}).filter(s => s === 'completed').length || verification.completedSteps?.length || 0} of 3 steps completed
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className={`text-center p-3 rounded-lg ${isStepCompleted('document') ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
            } border`}>
            <div className={`w-6 h-6 mx-auto mb-2 ${isStepCompleted('document') ? 'text-green-600' : 'text-gray-400'
              }`}>
              {isStepCompleted('document') ? <ShieldCheck /> : <Shield />}
            </div>
            <h5 className="font-medium text-xs">Document</h5>
            <p className="text-xs text-gray-600">
              {isStepCompleted('document') ? 'Complete' : 'Pending'}
            </p>
          </div>
          <div className={`text-center p-3 rounded-lg ${isStepCompleted('selfie') ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
            } border`}>
            <div className={`w-6 h-6 mx-auto mb-2 ${isStepCompleted('selfie') ? 'text-green-600' : 'text-gray-400'
              }`}>
              {isStepCompleted('selfie') ? <ShieldCheck /> : <Shield />}
            </div>
            <h5 className="font-medium text-xs">Selfie</h5>
            <p className="text-xs text-gray-600">
              {isStepCompleted('selfie') ? 'Complete' : 'Pending'}
            </p>
          </div>
          <div className={`text-center p-3 rounded-lg ${isStepCompleted('review') ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
            } border`}>
            <div className={`w-6 h-6 mx-auto mb-2 ${isStepCompleted('review') ? 'text-green-600' : 'text-gray-400'
              }`}>
              {isStepCompleted('review') ? <ShieldCheck /> : <Shield />}
            </div>
            <h5 className="font-medium text-xs">Review</h5>
            <p className="text-xs text-gray-600">
              {isStepCompleted('review') ? 'Complete' : 'Pending'}
            </p>
          </div>
        </div>

        <Button
          onClick={() => window.location.href = '/student/profile/verification'}
          className="w-full"
        >
          Continue Verification
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  // Not started
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-blue-900">Identity Verification Available</h4>
            <p className="text-sm text-blue-700">Optional but recommended for students</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h5 className="font-semibold">Benefits of Identity Verification:</h5>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
            <span>Access to verified-only properties</span>
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
            <span>Priority consideration in room applications</span>
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
            <span>Build trust with property owners</span>
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
            <span>Enhanced security and fraud protection</span>
          </li>
        </ul>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => window.location.href = '/student/profile/verification'}
          className="flex-1"
        >
          <Shield className="w-4 h-4 mr-2" />
          Start Verification
        </Button>
        <Button
          variant="outline"
          onClick={handleSkipVerification}
          className="flex-1"
        >
          Skip for Now
        </Button>
      </div>

      <div className="text-xs text-gray-500 text-center">
        Verification takes 5-10 minutes and can be completed anytime
      </div>
    </div>
  );
}

function StudentProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [verificationStatus, setVerificationStatus] = useState<any>({});
  const [activityStats, setActivityStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [verificationDetails, setVerificationDetails] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
    fetchVerificationDetails();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await getStudentProfile();
      if (response.success) {
        setProfile(response.data.profile);
        setVerificationStatus(response.data.verificationStatus);
        setActivityStats(response.data.activityStats);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVerificationDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/verify/requirements', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setVerificationDetails(result.data);
      }
    } catch (error) {
      console.error('Error fetching verification details:', error);
    }
  };

  const handleUpdateProfile = async (formData: any) => {
    setUpdating(true);
    try {
      const response = await updateStudentProfile(formData);
      if (response.success) {
        setProfile(response.data);
        setShowEditModal(false);
        // Show success message
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setUpdating(false);
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
            setProfile((prev: any) => ({ ...prev, profilePhoto: response.data.photoUrl }));
            alert('Profile photo updated successfully!');
            fetchProfile(); // Refresh profile data
          }
        } catch (error) {
          console.error('Error uploading profile photo:', error);
          alert('Failed to upload profile photo. Please try again.');
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
          <Card className="p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Profile Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Unable to load your profile information.
            </p>
            <Button onClick={fetchProfile}>
              <RefreshCw size={16} className="mr-2" />
              Try Again
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Profile Header */}
        <ProfileHeader
          user={profile}
          userType="student"
          onEditClick={() => setShowEditModal(true)}
          onUploadAvatar={handleAvatarUpload}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <ProfileNavigation userType="student" />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => setShowEditModal(true)}
                  >
                    <Edit size={20} />
                    <span>Edit Profile</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={handleAvatarUpload}
                  >
                    <Camera size={20} />
                    <span>Change Profile Photo</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    asChild
                  >
                    <a href="/student/profile/preferences">
                      <span>💙</span>
                      <span>Preferences</span>
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Profile Completeness */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Completeness</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Profile Completion</span>
                    <span className="text-sm text-gray-500">
                      {activityStats.profileCompleteness}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${activityStats.profileCompleteness}%` }}
                    ></div>
                  </div>

                  {activityStats.profileCompleteness < 100 && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Complete your profile to improve your chances of finding the perfect room!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div>
                      <div className="font-medium text-blue-900 dark:text-blue-300">
                        Profile Updated
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">
                        {new Date(profile.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div>
                      <div className="font-medium text-green-900 dark:text-green-300">
                        Account Created
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-400">
                        {new Date(profile.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Profile Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>
            <ProfileEditForm
              profile={profile}
              userType="student"
              onUpdate={handleUpdateProfile}
              isLoading={updating}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default StudentProfilePage;
