"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  Users,
  Phone,
  Mail,
  ExternalLink,
  X,
  Check,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

interface MeetingCardProps {
  meeting: any;
  userRole: 'student' | 'owner';
  onUpdate?: () => void;
}

export default function MeetingCard({ meeting, userRole, onUpdate }: MeetingCardProps) {
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this meeting?')) return;

    setCancelling(true);
    try {
      const response = await apiClient.request(`/meetings/${meeting._id}/cancel`, {
        method: 'PATCH'
      });

      if (response.success) {
        toast.success('Meeting cancelled successfully');
        onUpdate?.();
      } else {
        toast.error(response.error || 'Failed to cancel meeting');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel meeting');
    } finally {
      setCancelling(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const response = await apiClient.request(`/meetings/${meeting._id}/confirm`, {
        method: 'PATCH'
      });

      if (response.success) {
        toast.success('Meeting confirmed successfully');
        onUpdate?.();
      } else {
        toast.error(response.error || 'Failed to confirm meeting');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to confirm meeting');
    } finally {
      setConfirming(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
      confirmed: { variant: 'default', icon: Check, label: 'Confirmed' },
      cancelled: { variant: 'destructive', icon: X, label: 'Cancelled' },
      completed: { variant: 'outline', icon: CheckCircle2, label: 'Completed' },
      no_show: { variant: 'destructive', icon: AlertCircle, label: 'No Show' },
      rescheduled: { variant: 'secondary', icon: Clock, label: 'Rescheduled' }
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getMeetingTypeBadge = (type: string) => {
    if (type === 'physical') {
      return (
        <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
          <MapPin className="h-3 w-3" />
          Physical Visit
        </Badge>
      );
    } else if (type === 'virtual') {
      return (
        <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200">
          <Video className="h-3 w-3" />
          Online Meeting
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="gap-1 bg-purple-50 text-purple-700 border-purple-200">
          <Phone className="h-3 w-3" />
          Phone Call
        </Badge>
      );
    }
  };

  const property = meeting.property;
  const student = meeting.student;
  const owner = meeting.owner;
  const preferredDate = meeting.preferredDates?.[0] ? new Date(meeting.preferredDates[0]) : null;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-1">{property?.title || 'Property Visit'}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {property?.location?.address || property?.location?.city || 'Location not specified'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge(meeting.status)}
            {getMeetingTypeBadge(meeting.meetingType)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Meeting Time */}
        {preferredDate && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">
                {preferredDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-sm text-muted-foreground">
                {preferredDate.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
            </div>
          </div>
        )}

        {/* Virtual Meeting Link (if applicable) */}
        {meeting.meetingType === 'virtual' && meeting.virtualMeetingDetails?.meetingLink && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Virtual Meeting Link</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-blue-600 hover:text-blue-700"
                onClick={() => window.open(meeting.virtualMeetingDetails.meetingLink, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Join
              </Button>
            </div>
            {meeting.virtualMeetingDetails.platform && (
              <p className="text-xs text-blue-700 mt-1 capitalize">
                Platform: {meeting.virtualMeetingDetails.platform.replace('_', ' ')}
              </p>
            )}
          </div>
        )}

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Student Info (always visible) */}
          <div className="p-3 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Student</span>
            </div>
            <p className="text-sm font-medium">{student?.fullName || 'Student'}</p>
            {student?.email && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Mail className="h-3 w-3" />
                {student.email}
              </p>
            )}
            {student?.phone && userRole === 'owner' && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Phone className="h-3 w-3" />
                {student.phone}
              </p>
            )}
          </div>

          {/* Owner Info */}
          <div className="p-3 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Owner</span>
            </div>
            <p className="text-sm font-medium">{owner?.fullName || 'Owner'}</p>
            {owner?.email && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Mail className="h-3 w-3" />
                {owner.email}
              </p>
            )}
            {owner?.phone && userRole === 'student' && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Phone className="h-3 w-3" />
                {owner.phone}
              </p>
            )}
          </div>
        </div>

        {/* Student Notes */}
        {meeting.studentNotes && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-1">Message from Student:</p>
            <p className="text-sm">{meeting.studentNotes}</p>
          </div>
        )}

        {/* Owner Notes */}
        {meeting.ownerNotes && (
          <div className="p-3 bg-primary/5 rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-1">Response from Owner:</p>
            <p className="text-sm">{meeting.ownerNotes}</p>
          </div>
        )}

        {/* Number of Students (visible to owner only) */}
        {userRole === 'owner' && (
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Requesting Students:</span>
            <span className="font-medium">1</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {meeting.status === 'pending' && (
            <>
              {userRole === 'owner' && (
                <Button
                  size="sm"
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="flex-1"
                >
                  {confirming ? 'Confirming...' : 'Confirm Meeting'}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-1" />
                {cancelling ? 'Cancelling...' : 'Cancel'}
              </Button>
            </>
          )}
          {meeting.status === 'confirmed' && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-1" />
              {cancelling ? 'Cancelling...' : 'Cancel Meeting'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
