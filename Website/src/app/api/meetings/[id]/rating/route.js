/**
 * Meeting Satisfaction Rating API
 * Handles post-meeting satisfaction ratings from both parties
 */

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Meeting from '@/lib/models/Meeting';
import { verifyAccessToken } from '@/lib/utils/jwt';

// Helper function to verify JWT token
async function verifyToken(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// POST: Submit satisfaction rating
export async function POST(request, { params }) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const meetingId = params.id;
    const body = await request.json();

    const { rating, comment, aspects } = body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({
        success: false,
        error: 'Rating must be between 1 and 5'
      }, { status: 400 });
    }

    // Find the meeting
    const meeting = await Meeting.findById(meetingId)
      .populate('student', 'fullName email')
      .populate('owner', 'fullName email')
      .populate('property', 'title');

    if (!meeting) {
      return NextResponse.json({
        success: false,
        error: 'Meeting not found'
      }, { status: 404 });
    }

    // Check if user has permission (owner or student)
    const userId = decoded.userId || decoded.id;
    const isOwner = meeting.owner._id.toString() === userId;
    const isStudent = meeting.student._id.toString() === userId;

    if (!isOwner && !isStudent) {
      return NextResponse.json({
        success: false,
        error: 'You do not have permission to rate this meeting'
      }, { status: 403 });
    }

    // Check if meeting is completed
    if (meeting.status !== 'completed') {
      return NextResponse.json({
        success: false,
        error: 'Can only rate completed meetings'
      }, { status: 400 });
    }

    // Initialize feedback object if it doesn't exist
    if (!meeting.feedback) {
      meeting.feedback = {
        student: {},
        owner: {}
      };
    }

    // Determine which feedback to update
    const feedbackKey = isOwner ? 'owner' : 'student';
    const otherKey = isOwner ? 'student' : 'owner';

    // Check if already rated
    if (meeting.feedback[feedbackKey].rating) {
      return NextResponse.json({
        success: false,
        error: 'You have already rated this meeting'
      }, { status: 400 });
    }

    // Save the rating
    meeting.feedback[feedbackKey] = {
      rating,
      comment: comment || '',
      aspects: aspects || {},
      submittedAt: new Date()
    };

    // Add to meeting history
    if (!meeting.history) {
      meeting.history = [];
    }

    meeting.history.push({
      action: 'rating_submitted',
      performedBy: userId,
      performedAt: new Date(),
      details: {
        rating,
        ratedBy: feedbackKey,
        hasComment: !!comment
      }
    });

    // Check if both parties have rated
    const bothRated = meeting.feedback.student.rating && meeting.feedback.owner.rating;

    if (bothRated) {
      // Calculate average rating
      const avgRating = (meeting.feedback.student.rating + meeting.feedback.owner.rating) / 2;

      meeting.history.push({
        action: 'meeting_fully_rated',
        performedBy: null,
        performedAt: new Date(),
        details: {
          averageRating: avgRating,
          studentRating: meeting.feedback.student.rating,
          ownerRating: meeting.feedback.owner.rating
        }
      });
    }

    await meeting.save();

    return NextResponse.json({
      success: true,
      data: {
        rating,
        comment,
        submittedAt: meeting.feedback[feedbackKey].submittedAt,
        bothPartiesRated: bothRated,
        averageRating: bothRated ?
          (meeting.feedback.student.rating + meeting.feedback.owner.rating) / 2 :
          null,
        message: bothRated ?
          'Thank you for your feedback! Both parties have now rated this meeting.' :
          'Thank you for your feedback! Waiting for the other party to rate.'
      }
    });

  } catch (error) {
    console.error('Error submitting meeting rating:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to submit rating'
    }, { status: 500 });
  }
}

// GET: Get meeting ratings
export async function GET(request, { params }) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const meetingId = params.id;

    // Find the meeting
    const meeting = await Meeting.findById(meetingId)
      .populate('student', 'fullName')
      .populate('owner', 'fullName')
      .populate('property', 'title');

    if (!meeting) {
      return NextResponse.json({
        success: false,
        error: 'Meeting not found'
      }, { status: 404 });
    }

    // Check if user has permission (owner or student)
    const userId = decoded.userId || decoded.id;
    const isOwner = meeting.owner._id.toString() === userId;
    const isStudent = meeting.student._id.toString() === userId;

    if (!isOwner && !isStudent) {
      return NextResponse.json({
        success: false,
        error: 'You do not have permission to view this meeting\'s ratings'
      }, { status: 403 });
    }

    const feedback = meeting.feedback || { student: {}, owner: {} };
    const currentUserKey = isOwner ? 'owner' : 'student';
    const otherUserKey = isOwner ? 'student' : 'owner';

    return NextResponse.json({
      success: true,
      data: {
        meetingStatus: meeting.status,
        canRate: meeting.status === 'completed' && !feedback[currentUserKey].rating,
        hasRated: !!feedback[currentUserKey].rating,
        otherPartyRated: !!feedback[otherUserKey].rating,
        yourRating: feedback[currentUserKey].rating ? {
          rating: feedback[currentUserKey].rating,
          comment: feedback[currentUserKey].comment,
          submittedAt: feedback[currentUserKey].submittedAt
        } : null,
        averageRating: (feedback.student.rating && feedback.owner.rating) ?
          (feedback.student.rating + feedback.owner.rating) / 2 : null,
        bothPartiesRated: !!(feedback.student.rating && feedback.owner.rating)
      }
    });

  } catch (error) {
    console.error('Error getting meeting ratings:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to get ratings'
    }, { status: 500 });
  }
}