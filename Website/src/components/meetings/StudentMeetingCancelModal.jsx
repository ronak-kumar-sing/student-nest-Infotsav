"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { XCircle, Loader2 } from 'lucide-react';
import apiClient from '@/lib/api';

export default function StudentMeetingCancelModal({ meetingId, onCancel, trigger }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  const handleCancel = async () => {
    setLoading(true);
    try {
      const response = await apiClient.cancelMeeting(meetingId, {
        reason: reason || 'Meeting cancelled by student'
      });

      if (response.success) {
        setIsOpen(false);
        if (onCancel) {
          onCancel(response.data);
        }
        setReason('');
      } else {
        console.error('Failed to cancel meeting:', response.error);
        alert('Failed to cancel meeting. Please try again.');
      }
    } catch (error) {
      console.error('Error cancelling meeting:', error);
      alert('Error cancelling meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Cancel Meeting
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">
              <strong>Are you sure you want to cancel this meeting?</strong>
            </p>
            <p className="text-red-600 text-sm mt-1">
              This action cannot be undone. The property owner will be notified about the cancellation.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for cancellation (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Let the owner know why you're cancelling..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              Keep Meeting
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancel}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Meeting
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}