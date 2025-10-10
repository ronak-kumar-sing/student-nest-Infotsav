"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, CheckCircle, XCircle, Edit2, Loader2, AlertCircle } from 'lucide-react';
import apiClient from '@/lib/api';

export default function StudentMeetingResponseModal({
  meetingId,
  meetingData,
  onResponse,
  trigger
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('accept');
  const [formData, setFormData] = useState({
    response: '',
    counterDate: '',
    counterTime: '',
    counterReason: ''
  });

  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (time) => {
    if (!time) return 'Not set';
    return time;
  };

  const handleSubmit = async (action) => {
    setLoading(true);

    try {
      let requestData = {
        action,
        response: formData.response || `Meeting ${action}ed by student`
      };

      // Add counter proposal data if counter_reschedule
      if (action === 'counter_reschedule') {
        if (!formData.counterDate || !formData.counterTime) {
          alert('Please provide both date and time for counter proposal');
          setLoading(false);
          return;
        }

        requestData.counterProposal = {
          newDate: formData.counterDate,
          newTime: formData.counterTime,
          reason: formData.counterReason || 'Student requested different time'
        };
      }

      const response = await apiClient.studentRespondToMeeting(meetingId, requestData);

      if (response.success) {
        setIsOpen(false);
        if (onResponse) {
          onResponse(response.data);
        }
        // Reset form
        setFormData({
          response: '',
          counterDate: '',
          counterTime: '',
          counterReason: ''
        });
        setActiveTab('accept');
      } else {
        console.error('Failed to respond to meeting:', response.error);
        alert('Failed to respond to meeting. Please try again.');
      }
    } catch (error) {
      console.error('Error responding to meeting:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Get today's date for min date
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Respond to Meeting Request
          </DialogTitle>
        </DialogHeader>

        {/* Current Meeting Details */}
        <div className="bg-muted/30 rounded-lg p-4 mb-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Current Meeting Schedule
          </h4>
          <div className="space-y-1 text-sm">
            <div><strong>Property:</strong> {meetingData?.property?.title || 'Property details not available'}</div>
            <div><strong>Date:</strong> {formatDate(meetingData?.confirmedDate || meetingData?.schedule?.confirmedDate)}</div>
            <div><strong>Time:</strong> {formatTime(meetingData?.confirmedTime || meetingData?.schedule?.confirmedTime)}</div>
            {meetingData?.isRescheduled && (
              <Badge variant="secondary" className="mt-2">
                <AlertCircle className="h-3 w-3 mr-1" />
                Rescheduled by Owner
              </Badge>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="accept">Accept</TabsTrigger>
            <TabsTrigger value="decline">Decline</TabsTrigger>
            <TabsTrigger value="counter">Counter Proposal</TabsTrigger>
          </TabsList>

          <TabsContent value="accept" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="acceptResponse">Message (Optional)</Label>
              <Textarea
                id="acceptResponse"
                placeholder="Add a message for the owner..."
                value={formData.response}
                onChange={(e) => handleInputChange('response', e.target.value)}
                rows={3}
              />
            </div>

            <Button
              onClick={() => handleSubmit('accept')}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept Meeting
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="decline" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="declineResponse">Reason for declining</Label>
              <Textarea
                id="declineResponse"
                placeholder="Please let the owner know why you're declining..."
                value={formData.response}
                onChange={(e) => handleInputChange('response', e.target.value)}
                rows={3}
              />
            </div>

            <Button
              onClick={() => handleSubmit('decline')}
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Declining...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline Meeting
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="counter" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="counterDate">Preferred Date</Label>
                <Input
                  id="counterDate"
                  type="date"
                  value={formData.counterDate}
                  onChange={(e) => handleInputChange('counterDate', e.target.value)}
                  min={today}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="counterTime">Preferred Time</Label>
                <Input
                  id="counterTime"
                  type="time"
                  value={formData.counterTime}
                  onChange={(e) => handleInputChange('counterTime', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="counterReason">Reason for Different Time</Label>
                <Textarea
                  id="counterReason"
                  placeholder="Explain why you need a different time..."
                  value={formData.counterReason}
                  onChange={(e) => handleInputChange('counterReason', e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <Button
              onClick={() => handleSubmit('counter_reschedule')}
              disabled={loading || !formData.counterDate || !formData.counterTime}
              variant="outline"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Send Counter Proposal
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-4">
          <Button
            variant="ghost"
            onClick={() => setIsOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}