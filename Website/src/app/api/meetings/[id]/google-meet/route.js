/**
 * Google Meet API Routes
 * Handles meeting creation, joining, and management
 */

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Meeting from '@/lib/models/Meeting';
import { verifyAccessToken } from '@/lib/utils/jwt';
import GoogleMeetService from '@/lib/services/googleMeetService';

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

// POST: Create or start Google Meet
export async function POST(request, { params }) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const meetingId = params.id;
    const body = await request.json();

    const { action, googleAccessToken, meetingData } = body;

    // Find the meeting
    const meeting = await Meeting.findById(meetingId)
      .populate('student', 'fullName email')
      .populate('owner', 'fullName email')
      .populate('property', 'title location');

    if (!meeting) {
      return NextResponse.json({
        success: false,
        error: 'Meeting not found'
      }, { status: 404 });
    }

    // Check if user has permission (owner or student)
    const userId = decoded.userId || decoded.id;
    if (meeting.owner._id.toString() !== userId && meeting.student._id.toString() !== userId) {
      return NextResponse.json({
        success: false,
        error: 'You do not have permission to access this meeting'
      }, { status: 403 });
    }

    if (!googleAccessToken) {
      return NextResponse.json({
        success: false,
        error: 'Google access token required'
      }, { status: 400 });
    }

    const googleMeetService = new GoogleMeetService(googleAccessToken);

    switch (action) {
      case 'create':
      case 'start':
        // Check if meeting already has Google Meet link
        if (meeting.virtualMeetingDetails?.meetingLink) {
          return NextResponse.json({
            success: true,
            data: {
              meetingUri: meeting.virtualMeetingDetails.meetingLink,
              meetingId: meeting.virtualMeetingDetails.meetingId,
              status: 'existing',
              message: 'Meeting already exists. You can join now.'
            }
          });
        }

        // Create new Google Meet
        const meetResult = await googleMeetService.createMeeting({
          title: `Property Visit - ${meeting.property.title}`,
          description: `Virtual property viewing between ${meeting.student.fullName} and ${meeting.owner.fullName}`,
          startTime: meeting.confirmedDate ?
            new Date(`${meeting.confirmedDate}T${meeting.confirmedTime || '10:00'}`).toISOString() :
            new Date().toISOString(),
          endTime: meeting.confirmedDate ?
            new Date(new Date(`${meeting.confirmedDate}T${meeting.confirmedTime || '10:00'}`).getTime() + 60 * 60 * 1000).toISOString() :
            new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          attendees: [meeting.student.email, meeting.owner.email]
        });

        // Update meeting with Google Meet details
        meeting.virtualMeetingDetails = {
          platform: 'google_meet',
          meetingLink: meetResult.meetingUri,
          meetingId: meetResult.meetingId,
          eventId: meetResult.eventId,
          createdBy: userId,
          createdAt: new Date()
        };

        // Update meeting type to virtual if not already set
        if (meeting.meetingType !== 'virtual') {
          meeting.meetingType = 'virtual';
        }

        // Add to meeting history
        if (!meeting.history) {
          meeting.history = [];
        }

        meeting.history.push({
          action: 'google_meet_created',
          performedBy: userId,
          performedAt: new Date(),
          details: {
            meetingUri: meetResult.meetingUri,
            createdBy: meeting.owner._id.toString() === userId ? 'owner' : 'student'
          }
        });

        await meeting.save();

        return NextResponse.json({
          success: true,
          data: {
            meetingUri: meetResult.meetingUri,
            meetingId: meetResult.meetingId,
            eventId: meetResult.eventId,
            status: 'created',
            message: 'Google Meet created successfully. Share the link with the other party.'
          }
        });

      case 'join':
        // Return existing meeting details for joining
        if (!meeting.virtualMeetingDetails?.meetingLink) {
          return NextResponse.json({
            success: false,
            error: 'No Google Meet session found for this meeting. Please create one first.'
          }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          data: {
            meetingUri: meeting.virtualMeetingDetails.meetingLink,
            meetingId: meeting.virtualMeetingDetails.meetingId,
            status: 'ready_to_join',
            message: 'Click the link to join the meeting.'
          }
        });

      case 'end':
        // Mark meeting as completed
        if (meeting.virtualMeetingDetails?.eventId) {
          await googleMeetService.endMeeting(meeting.virtualMeetingDetails.eventId);
        }

        meeting.status = 'completed';
        meeting.completedAt = new Date();

        // Add to meeting history
        meeting.history.push({
          action: 'meeting_ended',
          performedBy: userId,
          performedAt: new Date(),
          details: {
            endedBy: meeting.owner._id.toString() === userId ? 'owner' : 'student'
          }
        });

        await meeting.save();

        return NextResponse.json({
          success: true,
          data: {
            status: 'completed',
            message: 'Meeting marked as completed. Please provide your feedback.'
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: create, start, join, or end'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Google Meet API error:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to process Google Meet request',
      details: error.message
    }, { status: 500 });
  }
}

// GET: Get Google Meet details for a meeting
export async function GET(request, { params }) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const meetingId = params.id;

    // Find the meeting
    const meeting = await Meeting.findById(meetingId)
      .populate('student', 'fullName email')
      .populate('owner', 'fullName email')
      .populate('property', 'title location');

    if (!meeting) {
      return NextResponse.json({
        success: false,
        error: 'Meeting not found'
      }, { status: 404 });
    }

    // Check if user has permission (owner or student)
    const userId = decoded.userId || decoded.id;
    if (meeting.owner._id.toString() !== userId && meeting.student._id.toString() !== userId) {
      return NextResponse.json({
        success: false,
        error: 'You do not have permission to access this meeting'
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        hasGoogleMeet: !!meeting.virtualMeetingDetails?.meetingLink,
        meetingUri: meeting.virtualMeetingDetails?.meetingLink,
        meetingId: meeting.virtualMeetingDetails?.meetingId,
        platform: meeting.virtualMeetingDetails?.platform,
        createdBy: meeting.virtualMeetingDetails?.createdBy,
        createdAt: meeting.virtualMeetingDetails?.createdAt,
        meetingType: meeting.meetingType,
        status: meeting.status
      }
    });

  } catch (error) {
    console.error('Error getting Google Meet details:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to get Google Meet details'
    }, { status: 500 });
  }
}