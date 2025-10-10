"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Calendar,
  Clock,
  Bell,
  CheckCircle,
  XCircle,
  RefreshCw,
  Phone,
  Mail,
  User,
  Loader2,
  MapPin,
  CalendarClock
} from 'lucide-react';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

interface Visit {
  id: string;
  studentName: string;
  propertyTitle: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  studentPhone: string;
  studentEmail: string;
  requestDate: string;
  notes?: string;
  meetingType?: string;
}

export default function OwnerVisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleDialog, setRescheduleDialog] = useState<{
    isOpen: boolean;
    visitId: string;
    date: string;
    time: string;
  }>({
    isOpen: false,
    visitId: '',
    date: '',
    time: '',
  });

  useEffect(() => {
    fetchVisits();
  }, []);

  const fetchVisits = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getMeetings();

      if (response.success && response.data?.meetings) {
        const visitsData = response.data.meetings.map((meeting: any) => ({
          id: meeting._id || meeting.id,
          studentName: meeting.student?.fullName || meeting.student?.name || 'Student',
          propertyTitle: meeting.property?.title || meeting.room?.title || 'Property',
          scheduledDate: meeting.confirmedDate || meeting.preferredDates?.[0] || meeting.createdAt,
          scheduledTime: meeting.confirmedTime || meeting.timeSlot || 'TBD',
          status: meeting.status || 'pending',
          studentPhone: meeting.student?.phone || 'N/A',
          studentEmail: meeting.student?.email || 'N/A',
          requestDate: meeting.createdAt,
          notes: meeting.studentNotes || meeting.notes || meeting.message,
          meetingType: meeting.meetingType || 'physical',
        }));
        setVisits(visitsData);
      } else {
        toast.error('Failed to load visit requests');
      }
    } catch (error) {
      console.error('Error fetching visits:', error);
      toast.error('Failed to load visit requests');
    } finally {
      setLoading(false);
    }
  };

  const handleVisitAction = async (visitId: string, newStatus: string) => {
    try {
      const response = await apiClient.updateMeetingStatus(visitId, newStatus);

      if (response.success) {
        toast.success(`Visit ${newStatus} successfully`);
        fetchVisits(); // Refresh the list
      } else {
        toast.error(response.error || 'Failed to update visit');
      }
    } catch (error) {
      console.error('Error updating visit:', error);
      toast.error('Failed to update visit');
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDialog.date || !rescheduleDialog.time) {
      toast.error('Please select both date and time');
      return;
    }

    try {
      const response = await apiClient.rescheduleMeeting(rescheduleDialog.visitId, {
        confirmedDate: rescheduleDialog.date,
        confirmedTime: rescheduleDialog.time,
      });

      if (response.success) {
        toast.success('Visit rescheduled successfully');
        setRescheduleDialog({ isOpen: false, visitId: '', date: '', time: '' });
        fetchVisits();
      } else {
        toast.error(response.error || 'Failed to reschedule visit');
      }
    } catch (error) {
      console.error('Error rescheduling visit:', error);
      toast.error('Failed to reschedule visit');
    }
  };

  const openRescheduleDialog = (visitId: string, currentDate: string, currentTime: string) => {
    setRescheduleDialog({
      isOpen: true,
      visitId,
      date: new Date(currentDate).toISOString().split('T')[0],
      time: currentTime || '',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return statusConfig[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusCounts = {
    total: visits.length,
    pending: visits.filter(v => v.status === 'pending').length,
    confirmed: visits.filter(v => v.status === 'confirmed').length,
    completed: visits.filter(v => v.status === 'completed').length
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold">Visit Requests</h1>
          <p className="text-muted-foreground mt-2">
            Manage property visit requests from students
          </p>
        </div>
        <div className="flex gap-3">
          {statusCounts.pending > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Bell size={16} className="text-yellow-600" />
              <span className="text-yellow-700 text-sm">{statusCounts.pending} pending</span>
            </div>
          )}
          <Button onClick={fetchVisits} variant="outline">
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{statusCounts.total}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Requests</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</div>
              <div className="text-sm text-muted-foreground mt-1">Pending</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statusCounts.confirmed}</div>
              <div className="text-sm text-muted-foreground mt-1">Confirmed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{statusCounts.completed}</div>
              <div className="text-sm text-muted-foreground mt-1">Completed</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visits List */}
      <div className="space-y-4">
        {visits.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No visit requests yet</p>
            </CardContent>
          </Card>
        ) : (
          visits.map((visit) => (
            <Card key={visit.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{visit.propertyTitle}</h3>
                    <p className="text-sm text-muted-foreground">Request ID: {visit.id}</p>
                  </div>
                  <Badge className={getStatusBadge(visit.status)}>
                    {visit.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{visit.studentName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{visit.studentEmail}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{visit.studentPhone}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(visit.scheduledDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{visit.scheduledTime}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Requested: </span>
                      <span className="font-medium">{formatDate(visit.requestDate)}</span>
                    </div>
                  </div>
                </div>

                {visit.notes && (
                  <div className="mb-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Notes:</p>
                    <p className="text-sm">{visit.notes}</p>
                  </div>
                )}

                {visit.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleVisitAction(visit.id, 'confirmed')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openRescheduleDialog(visit.id, visit.scheduledDate, visit.scheduledTime)}
                    >
                      <CalendarClock className="h-4 w-4 mr-1" />
                      Reschedule
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleVisitAction(visit.id, 'cancelled')}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                )}

                {visit.status === 'confirmed' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleVisitAction(visit.id, 'completed')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark as Completed
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openRescheduleDialog(visit.id, visit.scheduledDate, visit.scheduledTime)}
                    >
                      <CalendarClock className="h-4 w-4 mr-1" />
                      Reschedule
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Reschedule Dialog */}
      {rescheduleDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Reschedule Visit</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reschedule-date">New Date</Label>
                  <Input
                    id="reschedule-date"
                    type="date"
                    value={rescheduleDialog.date}
                    onChange={(e) => setRescheduleDialog({ ...rescheduleDialog, date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="reschedule-time">New Time</Label>
                  <Input
                    id="reschedule-time"
                    type="time"
                    value={rescheduleDialog.time}
                    onChange={(e) => setRescheduleDialog({ ...rescheduleDialog, time: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setRescheduleDialog({ isOpen: false, visitId: '', date: '', time: '' })}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleReschedule}>
                    Confirm Reschedule
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
