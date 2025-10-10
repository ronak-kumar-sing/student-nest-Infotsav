"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Clock, Video, MapPin, Send, X } from 'lucide-react';
import apiClient from '@/lib/api';

function MeetingScheduler({ propertyId, ownerId, onScheduleSuccess, trigger }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    meetingType: '',
    selectedDate: '',
    selectedTime: '',
    notes: ''
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create ISO date for the preferred meeting time
      // Add timezone offset to ensure it's interpreted correctly
      const meetingDateTime = new Date(`${formData.selectedDate}T${formData.selectedTime}:00`);

      // Ensure the date is valid and in the future
      if (isNaN(meetingDateTime.getTime()) || meetingDateTime <= new Date()) {
        throw new Error('Please select a valid future date and time');
      }

      const meetingData = {
        propertyId,
        ownerId,
        preferredDates: [meetingDateTime.toISOString()],
        meetingType: formData.meetingType || 'physical',
        notes: formData.notes,
        purpose: 'property_viewing'
      };

      const response = await apiClient.createMeeting(meetingData);

      if (response.success) {
        setIsOpen(false);
        setFormData({
          meetingType: '',
          selectedDate: '',
          selectedTime: '',
          notes: ''
        });
        onScheduleSuccess?.();

        // Show success message (you can integrate with a toast system)
        alert('Meeting request sent successfully!');
      }
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      alert('Failed to schedule meeting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.meetingType && formData.selectedDate && formData.selectedTime;

  // Generate time slots for selection
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 21; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(`2024-01-01T${timeString}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        slots.push({ value: timeString, label: displayTime });
      }
    }
    return slots;
  };

  // Get minimum date (tomorrow to avoid timezone issues)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold">
            <Calendar size={18} className="mr-2" />
            Schedule Visit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Calendar size={20} className="text-green-500" />
            Schedule Property Visit
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Meeting Type */}
          <div className="space-y-2">
            <Label htmlFor="meetingType" className="text-gray-200">
              Meeting Type
            </Label>
            <Select value={formData.meetingType} onValueChange={(value) => handleInputChange('meetingType', value)}>
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue placeholder="Choose meeting type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="online" className="text-white hover:bg-gray-700">
                  <div className="flex items-center gap-2">
                    <Video size={16} className="text-blue-400" />
                    Online Meeting (Virtual Tour)
                  </div>
                </SelectItem>
                <SelectItem value="offline" className="text-white hover:bg-gray-700">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-green-400" />
                    Offline Meeting (In-Person Visit)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-gray-200">
              Preferred Date
            </Label>
            <Input
              id="date"
              type="date"
              min={getMinDate()}
              value={formData.selectedDate}
              onChange={(e) => handleInputChange('selectedDate', e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label htmlFor="time" className="text-gray-200">
              Preferred Time
            </Label>
            <Select value={formData.selectedTime} onValueChange={(value) => handleInputChange('selectedTime', value)}>
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue placeholder="Choose time slot" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600 max-h-60">
                {generateTimeSlots().map((slot) => (
                  <SelectItem key={slot.value} value={slot.value} className="text-white hover:bg-gray-700">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-gray-400" />
                      {slot.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-gray-200">
              Additional Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Any specific requirements or questions..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 resize-none"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <X size={16} className="mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} className="mr-2" />
                  Send Request
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default MeetingScheduler;
