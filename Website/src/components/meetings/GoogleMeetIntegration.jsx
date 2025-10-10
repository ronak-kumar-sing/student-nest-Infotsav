"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Video,
  VideoOff,
  Users,
  Calendar,
  Clock,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import apiClient from '@/lib/api';

export default function GoogleMeetIntegration({
  meetingId,
  meetingData,
  onMeetingUpdate,
  currentUserRole = 'student' // 'student' or 'owner'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [meetState, setMeetState] = useState({
    hasGoogleMeet: false,
    meetingUri: null,
    status: 'not_created',
    createdBy: null
  });
  const [error, setError] = useState(null);
  const [googleToken, setGoogleToken] = useState(null);

  // Load Google Meet status on component mount
  useEffect(() => {
    loadMeetingStatus();
  }, [meetingId]);

  const loadMeetingStatus = async () => {
    try {
      const response = await apiClient.request(`/meetings/${meetingId}/google-meet`);
      if (response.success) {
        setMeetState(response.data);
      }
    } catch (error) {
      console.error('Failed to load meeting status:', error);
    }
  };

  // Get Google token from server
  const getGoogleToken = async () => {
    try {
      const response = await apiClient.request('/auth/google/token');
      if (response.success) {
        return response.accessToken;
      } else if (response.requiresAuth) {
        // Need to authenticate
        authenticateWithGoogle();
        return null;
      }
    } catch (error) {
      console.error('Failed to get Google token:', error);
      authenticateWithGoogle();
      return null;
    }
  };

  // Google OAuth Authentication
  const authenticateWithGoogle = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = window.location.origin + '/api/auth/google/callback';
    const scope = 'https://www.googleapis.com/auth/calendar';

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${redirectUri}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=consent`;

    window.location.href = authUrl;
  };

  const handleGoogleMeetAction = async (action) => {
    let token = googleToken;

    if (!token && (action === 'create' || action === 'start')) {
      token = await getGoogleToken();
      if (!token) {
        return; // Authentication in progress
      }
      setGoogleToken(token);
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.request(`/meetings/${meetingId}/google-meet`, {
        method: 'POST',
        body: {
          action,
          googleAccessToken: token,
          meetingData: {
            title: `Property Visit - ${meetingData?.property?.title || 'Virtual Meeting'}`,
            description: `Meeting between student and property owner`,
            startTime: meetingData?.confirmedDate ?
              new Date(`${meetingData.confirmedDate}T${meetingData.confirmedTime || '10:00'}`).toISOString() :
              new Date().toISOString()
          }
        }
      });

      if (response.success) {
        setMeetState(prev => ({
          ...prev,
          hasGoogleMeet: true,
          meetingUri: response.data.meetingUri,
          status: response.data.status,
          message: response.data.message
        }));

        if (onMeetingUpdate) {
          onMeetingUpdate(response.data);
        }

        // Auto-open meeting if it was just created
        if (action === 'create' || action === 'start') {
          setTimeout(() => {
            window.open(response.data.meetingUri, '_blank');
          }, 1000);
        }
      } else {
        setError(response.error || 'Failed to process meeting request');
      }
    } catch (error) {
      setError(error.message || 'Failed to process meeting request');
    } finally {
      setLoading(false);
    }
  };

  const joinMeeting = () => {
    if (meetState.meetingUri) {
      window.open(meetState.meetingUri, '_blank');
    }
  };

  const endMeeting = async () => {
    await handleGoogleMeetAction('end');
    setIsOpen(false);
  };

  const getStatusBadge = () => {
    switch (meetState.status) {
      case 'created':
        return <Badge className="bg-green-600">Meeting Ready</Badge>;
      case 'existing':
        return <Badge className="bg-blue-600">Meeting Active</Badge>;
      case 'completed':
        return <Badge className="bg-gray-600">Meeting Ended</Badge>;
      default:
        return <Badge variant="outline">No Meeting</Badge>;
    }
  };

  const canCreateMeeting = !meetState.hasGoogleMeet;
  const canJoinMeeting = meetState.hasGoogleMeet && meetState.meetingUri;
  const canEndMeeting = meetState.hasGoogleMeet && meetState.status !== 'completed';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={meetState.hasGoogleMeet ? "default" : "outline"}
          className="w-full"
        >
          <Video className="h-4 w-4 mr-2" />
          {meetState.hasGoogleMeet ? 'Join Google Meet' : 'Start Google Meet'}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Google Meet Session
            {getStatusBadge()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meeting Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Meeting Details</span>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <div>Property: {meetingData?.property?.title || 'Virtual Meeting'}</div>
              {meetingData?.confirmedDate && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(meetingData.confirmedDate).toLocaleDateString()} at {meetingData.confirmedTime || '10:00'}
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {meetState.message && !error && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{meetState.message}</AlertDescription>
            </Alert>
          )}

          {/* Meeting Link Display */}
          {meetState.meetingUri && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Meeting Link Ready</span>
              </div>
              <div className="text-sm text-blue-700 break-all">
                {meetState.meetingUri}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {/* Create/Start Meeting Button */}
            {canCreateMeeting && (
              <Button
                onClick={() => handleGoogleMeetAction('start')}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Meeting...
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4 mr-2" />
                    Start Google Meet
                  </>
                )}
              </Button>
            )}

            {/* Join Meeting Button */}
            {canJoinMeeting && (
              <Button
                onClick={joinMeeting}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Join Meeting Now
              </Button>
            )}

            {/* End Meeting Button */}
            {canEndMeeting && (
              <Button
                onClick={endMeeting}
                variant="outline"
                className="w-full border-red-600 text-red-600 hover:bg-red-50"
              >
                <VideoOff className="h-4 w-4 mr-2" />
                End Meeting
              </Button>
            )}
          </div>

          {/* Instructions */}
          <div className="text-sm text-gray-500 space-y-2">
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                {canCreateMeeting ? (
                  <>
                    <strong>First to start:</strong> Click "Start Google Meet" to create the meeting room.
                    The other party will see a "Join" button once you create it.
                  </>
                ) : (
                  <>
                    <strong>Meeting created:</strong> The meeting room is ready.
                    Both parties can now join using the link above.
                  </>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-400">
              After the meeting ends, both parties will be asked to rate their experience.
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}