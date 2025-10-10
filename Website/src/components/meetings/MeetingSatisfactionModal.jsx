"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Star,
  Heart,
  ThumbsUp,
  MessageSquare,
  Loader2,
  CheckCircle,
  StarIcon
} from 'lucide-react';
import apiClient from '@/lib/api';

export default function MeetingSatisfactionModal({
  meetingId,
  meetingData,
  onRatingSubmitted,
  trigger,
  autoOpen = false
}) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [aspects, setAspects] = useState({
    communication: 0,
    punctuality: 0,
    professionalism: 0,
    helpfulness: 0
  });
  const [ratingState, setRatingState] = useState({
    canRate: false,
    hasRated: false,
    otherPartyRated: false,
    averageRating: null
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRatingStatus();
    }
  }, [isOpen, meetingId]);

  const loadRatingStatus = async () => {
    try {
      const response = await apiClient.request(`/meetings/${meetingId}/rating`);
      if (response.success) {
        setRatingState(response.data);

        // Pre-fill if already rated
        if (response.data.yourRating) {
          setRating(response.data.yourRating.rating);
          setComment(response.data.yourRating.comment || '');
          setSubmitted(true);
        }
      }
    } catch (error) {
      console.error('Failed to load rating status:', error);
    }
  };

  const submitRating = async () => {
    if (rating < 1 || rating > 5) {
      alert('Please select a rating between 1 and 5 stars');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.request(`/meetings/${meetingId}/rating`, {
        method: 'POST',
        body: {
          rating,
          comment: comment.trim(),
          aspects
        }
      });

      if (response.success) {
        setSubmitted(true);
        setRatingState(prev => ({
          ...prev,
          hasRated: true,
          bothPartiesRated: response.data.bothPartiesRated,
          averageRating: response.data.averageRating
        }));

        if (onRatingSubmitted) {
          onRatingSubmitted(response.data);
        }

        // Auto-close after 3 seconds
        setTimeout(() => {
          setIsOpen(false);
        }, 3000);
      } else {
        alert(response.error || 'Failed to submit rating');
      }
    } catch (error) {
      alert(error.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ value, onChange, readOnly = false, size = 'default' }) => {
    const starSize = size === 'large' ? 32 : 24;

    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            className={`transition-colors ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
            onClick={() => !readOnly && onChange(star)}
            onMouseEnter={() => !readOnly && setHoverRating(star)}
            onMouseLeave={() => !readOnly && setHoverRating(0)}
          >
            <Star
              size={starSize}
              className={`${star <= (hoverRating || value)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
                } transition-colors`}
            />
          </button>
        ))}
      </div>
    );
  };

  const AspectRating = ({ label, value, onChange, readOnly = false }) => (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <StarRating
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        size="small"
      />
    </div>
  );

  const getRatingText = (rating) => {
    switch (rating) {
      case 5: return 'Excellent';
      case 4: return 'Very Good';
      case 3: return 'Good';
      case 2: return 'Fair';
      case 1: return 'Poor';
      default: return 'Select Rating';
    }
  };

  if (submitted) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Rating Submitted
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold text-green-800 mb-1">
                Thank you for your feedback!
              </h3>
              <p className="text-sm text-green-700">
                Your rating has been submitted successfully.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600 mb-1">Your Rating</div>
                <div className="flex items-center justify-center gap-2">
                  <StarRating value={rating} readOnly={true} />
                  <span className="text-sm font-medium">({rating}/5)</span>
                </div>
              </div>

              {comment && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Your Comment</div>
                  <div className="text-sm bg-gray-50 rounded p-2 text-left">
                    "{comment}"
                  </div>
                </div>
              )}

              {ratingState.bothPartiesRated && ratingState.averageRating && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-sm text-blue-800 font-medium mb-1">
                    Overall Meeting Rating
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-lg font-bold text-blue-800">
                      {ratingState.averageRating.toFixed(1)}/5
                    </span>
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Based on both parties' feedback
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={() => setIsOpen(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Rate Your Meeting Experience
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Meeting Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Meeting Details</div>
            <div className="font-medium">{meetingData?.property?.title || 'Property Meeting'}</div>
            {meetingData?.confirmedDate && (
              <div className="text-sm text-gray-500">
                {new Date(meetingData.confirmedDate).toLocaleDateString()} at {meetingData.confirmedTime}
              </div>
            )}
          </div>

          {/* Cannot Rate Message */}
          {!ratingState.canRate && !ratingState.hasRated && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <MessageSquare className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <div className="text-sm text-yellow-800">
                {ratingState.meetingStatus !== 'completed'
                  ? 'You can rate this meeting after it\'s completed.'
                  : 'Loading rating information...'}
              </div>
            </div>
          )}

          {/* Rating Form */}
          {ratingState.canRate && (
            <>
              {/* Overall Rating */}
              <div className="text-center space-y-3">
                <div>
                  <Label className="text-base font-medium">Overall Rating</Label>
                  <div className="text-sm text-gray-600 mb-3">
                    How was your meeting experience?
                  </div>
                </div>

                <div className="flex justify-center">
                  <StarRating
                    value={rating}
                    onChange={setRating}
                    size="large"
                  />
                </div>

                <div className="text-lg font-medium text-gray-700">
                  {getRatingText(rating)}
                </div>
              </div>

              {/* Aspect Ratings */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Rate Specific Aspects</Label>
                <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                  <AspectRating
                    label="Communication"
                    value={aspects.communication}
                    onChange={(value) => setAspects(prev => ({ ...prev, communication: value }))}
                  />
                  <AspectRating
                    label="Punctuality"
                    value={aspects.punctuality}
                    onChange={(value) => setAspects(prev => ({ ...prev, punctuality: value }))}
                  />
                  <AspectRating
                    label="Professionalism"
                    value={aspects.professionalism}
                    onChange={(value) => setAspects(prev => ({ ...prev, professionalism: value }))}
                  />
                  <AspectRating
                    label="Helpfulness"
                    value={aspects.helpfulness}
                    onChange={(value) => setAspects(prev => ({ ...prev, helpfulness: value }))}
                  />
                </div>
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <Label htmlFor="comment" className="text-base font-medium">
                  Additional Comments (Optional)
                </Label>
                <Textarea
                  id="comment"
                  placeholder="Share more details about your meeting experience..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 text-right">
                  {comment.length}/500 characters
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitRating}
                  disabled={loading || rating === 0}
                  className="bg-yellow-500 hover:bg-yellow-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Submit Rating
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}