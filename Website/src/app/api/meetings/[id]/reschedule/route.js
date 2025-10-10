import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Meeting from '@/lib/models/Meeting';
import { verifyAccessToken } from '@/lib/utils/jwt';

// Helper function to verify JWT token and get user
async function getAuthenticatedUser(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'No valid authorization header found' };
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    if (!decoded.userId) {
      return { error: 'Invalid token payload' };
    }

    return { userId: decoded.userId, role: decoded.role };
  } catch (error) {
    console.error('Authentication error:', error);
    return { error: 'Invalid or expired token' };
  }
}

// POST /api/meetings/[id]/reschedule - Reschedule a meeting
export async function POST(request, { params }) {
  try {
    const { userId, role, error } = await getAuthenticatedUser(request);

    if (error) {
      return NextResponse.json({
        success: false,
        error
      }, { status: 401 });
    }

    if (role?.toLowerCase() !== 'owner') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized: Owner access required'
      }, { status: 403 });
    }

    await connectDB();

    const meetingId = params.id;
    const body = await request.json();
    const { newDate, newTime, reason } = body;

    // Validate required fields
    if (!newDate || !newTime) {
      return NextResponse.json({
        success: false,
        error: 'New date and time are required for rescheduling'
      }, { status: 400 });
    }

    // Find the meeting
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return NextResponse.json({
        success: false,
        error: 'Meeting not found'
      }, { status: 404 });
    }

    // Verify the meeting belongs to this owner
    if (meeting.owner.toString() !== userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized: You can only reschedule your own meetings'
      }, { status: 403 });
    }

    // Update meeting with new date and time
    const updateData = {
      confirmedDate: new Date(newDate),
      confirmedTime: newTime,
      status: 'confirmed',
      ownerResponse: reason || 'Meeting rescheduled by owner',
      rescheduledAt: new Date(),
      isRescheduled: true
    };

    // Update the meeting
    const updatedMeeting = await Meeting.findByIdAndUpdate(
      meetingId,
      updateData,
      { new: true }
    ).populate([
      { path: 'property', select: 'title location' },
      { path: 'student', select: 'fullName phone email' }
    ]);

    return NextResponse.json({
      success: true,
      message: 'Meeting rescheduled successfully',
      data: {
        meetingId: updatedMeeting._id,
        status: updatedMeeting.status,
        confirmedDate: updatedMeeting.confirmedDate,
        confirmedTime: updatedMeeting.confirmedTime,
        ownerResponse: updatedMeeting.ownerResponse,
        isRescheduled: updatedMeeting.isRescheduled,
        property: updatedMeeting.property,
        student: updatedMeeting.student
      }
    });

  } catch (error) {
    console.error('Error rescheduling meeting:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to reschedule meeting'
    }, { status: 500 });
  }
}