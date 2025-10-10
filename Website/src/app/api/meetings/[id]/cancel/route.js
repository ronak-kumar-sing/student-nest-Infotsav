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

export async function POST(request, { params }) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const meetingId = params.id;
    const body = await request.json();

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

    // Check if user has permission to cancel (owner or student)
    const userId = decoded.userId || decoded.id;
    if (meeting.owner._id.toString() !== userId && meeting.student._id.toString() !== userId) {
      return NextResponse.json({
        success: false,
        error: 'You do not have permission to cancel this meeting'
      }, { status: 403 });
    }

    // Update meeting status to cancelled
    meeting.status = 'cancelled';
    meeting.cancelledBy = userId;
    meeting.cancelledAt = new Date();
    meeting.cancellationReason = body.reason || 'No reason provided';

    // Add to meeting history
    if (!meeting.history) {
      meeting.history = [];
    }

    meeting.history.push({
      action: 'cancelled',
      performedBy: userId,
      performedAt: new Date(),
      details: {
        reason: body.reason || 'No reason provided',
        cancelledBy: meeting.owner._id.toString() === userId ? 'owner' : 'student'
      }
    });

    await meeting.save();

    // Return updated meeting data
    const updatedMeeting = await Meeting.findById(meetingId)
      .populate('student', 'fullName email phone profilePhoto')
      .populate('owner', 'fullName email phone profilePhoto')
      .populate('property', 'title location images price');

    return NextResponse.json({
      success: true,
      message: 'Meeting cancelled successfully',
      data: {
        meeting: {
          id: updatedMeeting._id,
          status: updatedMeeting.status,
          cancelledBy: updatedMeeting.cancelledBy,
          cancelledAt: updatedMeeting.cancelledAt,
          cancellationReason: updatedMeeting.cancellationReason,

          student: {
            id: updatedMeeting.student._id,
            name: updatedMeeting.student.fullName,
            email: updatedMeeting.student.email,
            phone: updatedMeeting.student.phone,
            profilePhoto: updatedMeeting.student.profilePhoto
          },

          owner: {
            id: updatedMeeting.owner._id,
            name: updatedMeeting.owner.fullName,
            email: updatedMeeting.owner.email,
            phone: updatedMeeting.owner.phone,
            profilePhoto: updatedMeeting.owner.profilePhoto
          },

          property: {
            id: updatedMeeting.property._id,
            title: updatedMeeting.property.title,
            location: updatedMeeting.property.location,
            images: updatedMeeting.property.images,
            price: updatedMeeting.property.price
          },

          schedule: {
            preferredDates: updatedMeeting.preferredDates,
            confirmedDate: updatedMeeting.confirmedDate,
            confirmedTime: updatedMeeting.confirmedTime
          },

          history: updatedMeeting.history,
          createdAt: updatedMeeting.createdAt,
          updatedAt: updatedMeeting.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Error cancelling meeting:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to cancel meeting'
    }, { status: 500 });
  }
}