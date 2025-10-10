"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  Edit,
  Reply
} from 'lucide-react';
import { acceptMeetingTime } from '@/lib/api';
import StudentMeetingResponseModal from './StudentMeetingResponseModal';
import StudentMeetingCancelModal from './StudentMeetingCancelModal';
import GoogleMeetIntegration from './GoogleMeetIntegration';
import MeetingSatisfactionModal from './MeetingSatisfactionModal';

function MeetingStatusCard({ meeting, onAcceptTime, onModifyTime, onStudentResponse }) {
  const [isAcceptingTime, setIsAcceptingTime] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [showTimeSlots, setShowTimeSlots] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-900/30 text-yellow-400 border-yellow-600';
      case 'accepted':
        return 'bg-green-900/30 text-green-400 border-green-600';
      case 'declined':
        return 'bg-red-900/30 text-red-400 border-red-600';
      case 'cancelled':
        return 'bg-red-900/30 text-red-400 border-red-600';
      case 'modified':
        return 'bg-blue-900/30 text-blue-400 border-blue-600';
      case 'confirmed':
        return 'bg-emerald-900/30 text-emerald-400 border-emerald-600';
      default:
        return 'bg-gray-900/30 text-gray-400 border-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <AlertCircle size={16} />;
      case 'accepted':
        return <CheckCircle size={16} />;
      case 'declined':
        return <XCircle size={16} />;
      case 'cancelled':
        return <XCircle size={16} />;
      case 'modified':
        return <Edit size={16} />;
      case 'confirmed':
        return <CheckCircle size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  const handleAcceptTimeSlot = async () => {
    if (!selectedTimeSlot) return;

    setIsAcceptingTime(true);
    try {
      await acceptMeetingTime(meeting.id, parseInt(selectedTimeSlot));
      setShowTimeSlots(false);
      onAcceptTime?.(meeting.id, selectedTimeSlot);
    } catch (error) {
      console.error('Error accepting time slot:', error);
      alert('Failed to accept time slot. Please try again.');
    } finally {
      setIsAcceptingTime(false);
    }
  };

  const formatDateTime = (date, time) => {
    try {
      // Handle different date formats
      let dateObj;
      if (date && time) {
        // If we have both date and time
        if (typeof date === 'string' && date.includes('T')) {
          // ISO string
          dateObj = new Date(date);
        } else {
          // Separate date and time
          dateObj = new Date(`${date}T${time}`);
        }
      } else if (date) {
        // Only date provided
        dateObj = new Date(date);
      } else {
        // Fallback to current date
        dateObj = new Date();
      }

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return {
          date: 'Invalid Date',
          time: 'Invalid Time'
        };
      }

      return {
        date: dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        time: time ? (
          // Use provided time if available
          time.includes(':') ? time : dateObj.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
        ) : dateObj.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      };
    } catch (error) {
      console.error('Error formatting date/time:', error);
      return {
        date: 'Date not available',
        time: 'Time not available'
      };
    }
  };

  const requestedDateTime = formatDateTime(meeting.requestedDate, meeting.requestedTime);

  return (
    <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-white text-lg">
              Property Visit Request
            </CardTitle>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <User size={14} />
                <span>Property ID: #{meeting.propertyId}</span>
              </div>
              {meeting.property && (
                <div className="text-sm text-gray-300">
                  <div className="font-medium">{meeting.property.title}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <MapPin size={12} />
                    {typeof meeting.property.location === 'object'
                      ? (meeting.property.location?.address || meeting.property.location?.fullAddress || meeting.property.location?.city || 'Location not specified')
                      : (meeting.property.location || 'Location not specified')
                    }
                  </div>
                  {meeting.property.price && (
                    <div className="text-xs text-green-400">
                      ₹{meeting.property.price.toLocaleString()}/month
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <Badge
            variant="outline"
            className={`${getStatusColor(meeting.status)} flex items-center gap-1`}
          >
            {getStatusIcon(meeting.status)}
            <span className="capitalize">{meeting.status}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Meeting Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-300">
              {meeting.meetingType === 'online' ? (
                <Video size={16} className="text-blue-400" />
              ) : (
                <MapPin size={16} className="text-green-400" />
              )}
              <span className="text-sm font-medium">
                {meeting.meetingType === 'online' ? 'Online Meeting' : 'In-Person Visit'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-300">
              <Calendar size={16} className="text-gray-400" />
              <span className="text-sm">{requestedDateTime.date}</span>
            </div>

            <div className="flex items-center gap-2 text-gray-300">
              <Clock size={16} className="text-gray-400" />
              <span className="text-sm">{requestedDateTime.time}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-gray-400">
              <span className="font-medium">Requested:</span>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(meeting.createdAt).toLocaleDateString('en-US', {
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
        {meeting.studentNotes && (
          <div className="p-3 bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={14} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-300">Your Notes</span>
            </div>
            <p className="text-sm text-gray-400">{meeting.studentNotes}</p>
          </div>
        )}

        {/* Owner Response */}
        {meeting.ownerResponse && (
          <div className="p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={14} className="text-blue-400" />
              <span className="text-sm font-medium text-blue-300">Owner Response</span>
            </div>
            <p className="text-sm text-gray-300">{meeting.ownerResponse}</p>
          </div>
        )}

        {/* Rescheduled Meeting Alert */}
        {meeting.isRescheduled && meeting.status === 'confirmed' && (
          <div className="p-3 bg-amber-900/20 border border-amber-800/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-amber-400" />
              <span className="text-sm font-medium text-amber-300">Meeting Rescheduled</span>
            </div>
            <p className="text-sm text-gray-300">
              The owner has rescheduled this meeting. Please confirm or propose a different time.
            </p>
          </div>
        )}

        {/* Student Response Actions */}
        {(meeting.isRescheduled || meeting.status === 'pending_student_response') && (
          <div className="space-y-3 pt-2">
            <StudentMeetingResponseModal
              meetingId={meeting.id}
              meetingData={meeting}
              onResponse={(responseData) => {
                if (onStudentResponse) {
                  onStudentResponse(responseData);
                } else {
                  // Fallback to refresh
                  window.location.reload();
                }
              }}
              trigger={
                <Button
                  variant="outline"
                  className="w-full border-blue-600 text-blue-400 hover:bg-blue-900/30"
                >
                  <Reply size={16} className="mr-2" />
                  Respond to Meeting
                </Button>
              }
            />
          </div>
        )}

        {/* Action Buttons for Modified Status */}
        {meeting.status === 'modified' && meeting.proposedTimeSlots && (
          <div className="space-y-3 pt-2">
            <div className="text-sm font-medium text-blue-300">
              Owner has proposed alternative times:
            </div>

            <Dialog open={showTimeSlots} onOpenChange={setShowTimeSlots}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-blue-600 text-blue-400 hover:bg-blue-900/30"
                >
                  <Clock size={16} className="mr-2" />
                  View & Select Time ({meeting.proposedTimeSlots?.length} options)
                </Button>
              </DialogTrigger>

              <DialogContent className="bg-gray-900 border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Select Meeting Time</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="Choose from proposed times" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {meeting.proposedTimeSlots?.map((slot) => {
                        const slotDateTime = formatDateTime(slot.proposedDate, slot.proposedTime);
                        return (
                          <SelectItem
                            key={slot.id}
                            value={slot.id.toString()}
                            className="text-white hover:bg-gray-700"
                          >
                            <div className="flex flex-col">
                              <span>{slotDateTime.date}</span>
                              <span className="text-sm text-gray-400">{slotDateTime.time}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowTimeSlots(false)}
                      className="flex-1 border-gray-600 text-gray-300"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAcceptTimeSlot}
                      disabled={!selectedTimeSlot || isAcceptingTime}
                      className="flex-1 bg-green-600 hover:bg-green-500"
                    >
                      {isAcceptingTime ? 'Accepting...' : 'Accept Time'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              onClick={() => onModifyTime?.(meeting)}
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Edit size={16} className="mr-2" />
              Request Different Times
            </Button>
          </div>
        )}

        {/* Google Meet Integration */}
        {meeting.status === 'confirmed' && (
          <div className="pt-3 border-t border-gray-700">
            <GoogleMeetIntegration
              meetingId={meeting.id}
              meetingData={meeting}
              currentUserRole="student"
              onMeetingUpdate={(updateData) => {
                if (onStudentResponse) {
                  onStudentResponse(updateData);
                }
              }}
            />
          </div>
        )}

        {/* Meeting Satisfaction Rating */}
        {meeting.status === 'completed' && (
          <div className="pt-3 border-t border-gray-700">
            <MeetingSatisfactionModal
              meetingId={meeting.id}
              meetingData={meeting}
              onRatingSubmitted={(ratingData) => {
                if (onStudentResponse) {
                  onStudentResponse(ratingData);
                }
              }}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-yellow-600 text-yellow-500 hover:bg-yellow-900/30"
                >
                  <MessageSquare size={16} className="mr-2" />
                  Rate Meeting Experience
                </Button>
              }
            />
          </div>
        )}

        {/* Cancel button for active meetings */}
        {(meeting.status === 'pending' || meeting.status === 'confirmed' || meeting.status === 'modified') && (
          <div className="pt-3 border-t border-gray-700">
            <StudentMeetingCancelModal
              meetingId={meeting.id}
              onCancel={(cancelledData) => {
                if (onStudentResponse) {
                  onStudentResponse(cancelledData);
                } else {
                  // Fallback to refresh
                  window.location.reload();
                }
              }}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-red-600 text-red-400 hover:bg-red-900/30"
                >
                  <XCircle size={16} className="mr-2" />
                  Cancel Meeting
                </Button>
              }
            />
          </div>
        )}

        {/* Status-specific messages */}
        {meeting.status === 'pending' && (
          <div className="text-sm text-yellow-400 italic">
            Waiting for owner response...
          </div>
        )}

        {meeting.status === 'confirmed' && (
          <div className="text-sm text-green-400 italic">
            Meeting confirmed! Check your calendar.
          </div>
        )}

        {meeting.status === 'declined' && (
          <div className="text-sm text-red-400 italic">
            Unfortunately, this meeting was declined.
          </div>
        )}

        {meeting.status === 'cancelled' && (
          <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <XCircle size={14} className="text-red-400" />
              <span className="text-sm font-medium text-red-300">Meeting Cancelled</span>
            </div>
            {meeting.cancellationReason && (
              <p className="text-sm text-gray-300">
                Reason: {meeting.cancellationReason}
              </p>
            )}
            {meeting.cancelledAt && (
              <p className="text-xs text-gray-400 mt-1">
                Cancelled on {new Date(meeting.cancelledAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MeetingStatusCard;
