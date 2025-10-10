"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import ProfileNavigation from '@/components/profile/ProfileNavigation';
import { Settings, Lock, Bell, Shield, Trash2, Eye, EyeOff, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const SettingsPage = () => {
  const router = useRouter();
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    bookingUpdates: true,
    messageAlerts: true,
    marketingEmails: false,
  });

  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: true,
    showEmail: false,
    showPhone: false,
  });

  const handlePasswordChange = async () => {
    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    // Password strength check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(passwordData.newPassword)) {
      toast.error('Password must contain uppercase, lowercase, number, and special character (@$!%*?&)');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to continue');
        return;
      }

      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Password changed successfully!');
        setPasswordData({
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        toast.error(result.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
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
        body: JSON.stringify({
          notificationSettings
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Notification settings saved!');
      } else {
        toast.error(result.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
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
        body: JSON.stringify({
          privacySettings
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Privacy settings saved!');
      } else {
        toast.error(result.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );

    if (!confirmation) return;

    const doubleConfirmation = window.prompt(
      'Please type "DELETE" to confirm account deletion:'
    );

    if (doubleConfirmation !== 'DELETE') {
      toast.error('Account deletion cancelled');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to continue');
        return;
      }

      const response = await fetch('/api/profile/student', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Account deleted successfully');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
      } else {
        toast.error(result.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your account preferences and security settings
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <ProfileNavigation userType="student" />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Password Change */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock size={20} />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="oldPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="oldPassword"
                      type={showOldPassword ? 'text' : 'password'}
                      value={passwordData.oldPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, oldPassword: e.target.value }))}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Password must be at least 8 characters with uppercase, lowercase, number, and special character
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <Button onClick={handlePasswordChange} disabled={saving}>
                  <Lock size={16} className="mr-2" />
                  {saving ? 'Updating...' : 'Update Password'}
                </Button>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell size={20} />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose how you want to be notified
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <p className="text-sm text-gray-500">Receive notifications via email</p>
                  </div>
                  <Checkbox
                    id="emailNotifications"
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked: boolean) =>
                      setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="pushNotifications">Push Notifications</Label>
                    <p className="text-sm text-gray-500">Receive push notifications</p>
                  </div>
                  <Checkbox
                    id="pushNotifications"
                    checked={notificationSettings.pushNotifications}
                    onCheckedChange={(checked: boolean) =>
                      setNotificationSettings(prev => ({ ...prev, pushNotifications: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="bookingUpdates">Booking Updates</Label>
                    <p className="text-sm text-gray-500">Get notified about booking status</p>
                  </div>
                  <Checkbox
                    id="bookingUpdates"
                    checked={notificationSettings.bookingUpdates}
                    onCheckedChange={(checked: boolean) =>
                      setNotificationSettings(prev => ({ ...prev, bookingUpdates: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="messageAlerts">Message Alerts</Label>
                    <p className="text-sm text-gray-500">Get notified about new messages</p>
                  </div>
                  <Checkbox
                    id="messageAlerts"
                    checked={notificationSettings.messageAlerts}
                    onCheckedChange={(checked: boolean) =>
                      setNotificationSettings(prev => ({ ...prev, messageAlerts: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="marketingEmails">Marketing Emails</Label>
                    <p className="text-sm text-gray-500">Receive promotional content</p>
                  </div>
                  <Checkbox
                    id="marketingEmails"
                    checked={notificationSettings.marketingEmails}
                    onCheckedChange={(checked: boolean) =>
                      setNotificationSettings(prev => ({ ...prev, marketingEmails: checked }))
                    }
                  />
                </div>

                <Button onClick={handleSaveNotifications} disabled={saving}>
                  <Save size={16} className="mr-2" />
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>

            {/* Privacy Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield size={20} />
                  Privacy Settings
                </CardTitle>
                <CardDescription>
                  Control what information is visible to others
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="profileVisibility">Profile Visibility</Label>
                    <p className="text-sm text-gray-500">Make your profile visible to property owners</p>
                  </div>
                  <Checkbox
                    id="profileVisibility"
                    checked={privacySettings.profileVisibility}
                    onCheckedChange={(checked: boolean) =>
                      setPrivacySettings(prev => ({ ...prev, profileVisibility: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="showEmail">Show Email</Label>
                    <p className="text-sm text-gray-500">Display email on your public profile</p>
                  </div>
                  <Checkbox
                    id="showEmail"
                    checked={privacySettings.showEmail}
                    onCheckedChange={(checked: boolean) =>
                      setPrivacySettings(prev => ({ ...prev, showEmail: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="showPhone">Show Phone</Label>
                    <p className="text-sm text-gray-500">Display phone number on your public profile</p>
                  </div>
                  <Checkbox
                    id="showPhone"
                    checked={privacySettings.showPhone}
                    onCheckedChange={(checked: boolean) =>
                      setPrivacySettings(prev => ({ ...prev, showPhone: checked }))
                    }
                  />
                </div>

                <Button onClick={handleSavePrivacy} disabled={saving}>
                  <Save size={16} className="mr-2" />
                  Save Privacy Settings
                </Button>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <Trash2 size={20} />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={saving}
                >
                  <Trash2 size={16} className="mr-2" />
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
