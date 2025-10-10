"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  CheckCircle,
  XCircle,
  Edit,
  MessageSquare,
  Plus,
  Trash2
} from 'lucide-react';
import { respondToMeeting } from '@/lib/api';

function MeetingRequestCard({ request, onAccept, onDecline, onModify }) {
  const [isResponding, setIsResponding] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [modifyData, setModifyData] = useState({
    response: '',
    proposedTimeSlots: [{ date: '', time: '' }]
  });
  const [declineReason, setDeclineReason] = useState('');

  const formatDateTime = (date, time) => {
    const dateObj = new Date(`${date}T${time}`);
    return {
      date: dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const handleQuickAccept = async () => {
    setIsResponding(true);
    try {
      await respondToMeeting(request.id, {
        action: 'accept',
        response: 'Meeting accepted as requested'
      });
      onAccept?.(request.id);
    } catch (error) {
      console.error('Error accepting meeting:', error);
      alert('Failed to accept meeting. Please try again.');
    } finally {
      setIsResponding(false);
    }
  };

  const handleDeclineSubmit = async () => {
    setIsResponding(true);
    try {
      await respondToMeeting(request.id, {
        action: 'decline',
        response: declineReason || 'Meeting declined'
      });
      setShowDeclineModal(false);
      setDeclineReason('');
      onDecline?.(request.id);
    } catch (error) {
      console.error('Error declining meeting:', error);
      alert('Failed to decline meeting. Please try again.');
    } finally {
      setIsResponding(false);
    }
  };

  const handleModifySubmit = async () => {
    const validTimeSlots = modifyData.proposedTimeSlots.filter(
      slot => slot.date && slot.time
    );

    if (validTimeSlots.length === 0) {
      alert('Please add at least one alternative time slot.');
      return;
    }

    setIsResponding(true);
    try {
      await respondToMeeting(request.id, {
        action: 'modify',
        response: modifyData.response || 'Alternative times proposed',
        proposedTimeSlots: validTimeSlots
      });
      setShowModifyModal(false);
      setModifyData({
        response: '',
        proposedTimeSlots: [{ date: '', time: '' }]
      });
      onModify?.(request.id);
    } catch (error) {
      console.error('Error modifying meeting:', error);
      alert('Failed to propose alternative times. Please try again.');
    } finally {
      setIsResponding(false);
    }
  };

  const addTimeSlot = () => {
    setModifyData(prev => ({
      ...prev,
      proposedTimeSlots: [...prev.proposedTimeSlots, { date: '', time: '' }]
    }));
  };

  const removeTimeSlot = (index) => {
    setModifyData(prev => ({
      ...prev,
      proposedTimeSlots: prev.proposedTimeSlots.filter((_, i) => i !== index)
    }));
  };

  const updateTimeSlot = (index, field, value) => {
    setModifyData(prev => ({
      ...prev,
      proposedTimeSlots: prev.proposedTimeSlots.map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      )
    }));
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const requestedDateTime = formatDateTime(request.requestedDate, request.requestedTime);

  return (
    <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-white text-lg">
              New Visit Request
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <User size={14} />
                <span>Student ID: #{request.studentId}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>Property #{request.propertyId}</span>
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className="bg-yellow-900/30 text-yellow-400 border-yellow-600"
          >
            Pending Response
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Meeting Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-300">
              {request.meetingType === 'online' ? (
                <Video size={16} className="text-blue-400" />
              ) : (
                <MapPin size={16} className="text-green-400" />
              )}
              <span className="font-medium">
                {request.meetingType === 'online' ? 'Online Meeting' : 'In-Person Visit'}
              </span>
            </div>

            <div className="bg-gray-700/50 p-3 rounded-lg">
              <div className="text-sm font-medium text-gray-300 mb-2">Requested Time:</div>
              <div className="flex items-center gap-2 text-gray-200">
                <Calendar size={14} className="text-gray-400" />
                <span className="text-sm">{requestedDateTime.date}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-200 mt-1">
                <Clock size={14} className="text-gray-400" />
                <span className="text-sm">{requestedDateTime.time}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-gray-400">
              <span className="font-medium">Received:</span>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(request.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Student Notes */}
        {request.studentNotes && (
          <div className="p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={14} className="text-blue-400" />
              <span className="text-sm font-medium text-blue-300">Student's Message</span>
            </div>
            <p className="text-sm text-gray-300">{request.studentNotes}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleQuickAccept}
            disabled={isResponding}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white"
          >
            <CheckCircle size={16} className="mr-2" />
            Accept
          </Button>

          {/* Modify Dialog */}
          <Dialog open={showModifyModal} onOpenChange={setShowModifyModal}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 border-blue-600 text-blue-400 hover:bg-blue-900/30"
              >
                <Edit size={16} className="mr-2" />
                Modify
              </Button>
            </DialogTrigger>

            <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Propose Alternative Times</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-200">
                    Response Message
                  </label>
                  <Textarea
                    placeholder="Let the student know why you're proposing different times..."
                    value={modifyData.response}
                    onChange={(e) => setModifyData(prev => ({ ...prev, response: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-200">
                      Alternative Time Slots
                    </label>
                    <Button
                      type="button"
                      onClick={addTimeSlot}
                      size="sm"
                      variant="outline"
                      className="border-green-600 text-green-400 hover:bg-green-900/30"
                    >
                      <Plus size={14} className="mr-1" />
                      Add Slot
                    </Button>
                  </div>

                  {modifyData.proposedTimeSlots.map((slot, index) => (
                    <div key={index} className="flex gap-3 items-end">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-gray-400">Date</label>
                        <Input
                          type="date"
                          min={getMinDate()}
                          value={slot.date}
                          onChange={(e) => updateTimeSlot(index, 'date', e.target.value)}
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-gray-400">Time</label>
                        <Input
                          type="time"
                          value={slot.time}
                          onChange={(e) => updateTimeSlot(index, 'time', e.target.value)}
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                      {modifyData.proposedTimeSlots.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeTimeSlot(index)}
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-900/30"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowModifyModal(false)}
                    className="flex-1 border-gray-600 text-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleModifySubmit}
                    disabled={isResponding}
                    className="flex-1 bg-blue-600 hover:bg-blue-500"
                  >
                    {isResponding ? 'Sending...' : 'Propose Times'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Decline Dialog */}
          <Dialog open={showDeclineModal} onOpenChange={setShowDeclineModal}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 border-red-600 text-red-400 hover:bg-red-900/30"
              >
                <XCircle size={16} className="mr-2" />
                Decline
              </Button>
            </DialogTrigger>

            <DialogContent className="bg-gray-900 border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white">Decline Meeting Request</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-200">
                    Reason for Declining (Optional)
                  </label>
                  <Textarea
                    placeholder="Let the student know why you can't meet..."
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeclineModal(false)}
                    className="flex-1 border-gray-600 text-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeclineSubmit}
                    disabled={isResponding}
                    className="flex-1 bg-red-600 hover:bg-red-500"
                  >
                    {isResponding ? 'Declining...' : 'Decline Meeting'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

export default MeetingRequestCard;
