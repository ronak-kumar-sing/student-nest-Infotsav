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

// POST /api/meetings/[id]/student-respond - Student response to meeting/reschedule
export async function POST(request, { params }) {
  try {
    const { userId, role, error } = await getAuthenticatedUser(request);

    if (error) {
      return NextResponse.json({
        success: false,
        error
      }, { status: 401 });
    }

    if (role?.toLowerCase() !== 'student') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized: Student access required'
      }, { status: 403 });
    }

    await connectDB();

    const meetingId = params.id;
    const body = await request.json();
    const { action, response, counterProposal } = body;

    // Find the meeting
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return NextResponse.json({
        success: false,
        error: 'Meeting not found'
      }, { status: 404 });
    }

    // Verify the meeting belongs to this student
    if (meeting.student.toString() !== userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized: You can only respond to your own meetings'
      }, { status: 403 });
    }

    // Validate action
    if (!['accept', 'decline', 'counter_reschedule'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Must be accept, decline, or counter_reschedule'
      }, { status: 400 });
    }

    // Update meeting based on action
    let updateData = {};
    let message = '';

    switch (action) {
      case 'accept':
        updateData.status = 'confirmed';
        updateData.studentResponse = response || 'Meeting accepted by student';
        updateData.studentResponseAt = new Date();
        message = 'Meeting accepted successfully';
        break;

      case 'decline':
        updateData.status = 'declined';
        updateData.studentResponse = response || 'Meeting declined by student';
        updateData.studentResponseAt = new Date();
        message = 'Meeting declined';
        break;

      case 'counter_reschedule':
        if (!counterProposal || !counterProposal.newDate || !counterProposal.newTime) {
          return NextResponse.json({
            success: false,
            error: 'Counter proposal must include new date and time'
          }, { status: 400 });
        }

        updateData.status = 'pending_owner_response';
        updateData.studentResponse = response || 'Student requested different time';
        updateData.studentResponseAt = new Date();
        updateData.counterProposal = {
          date: new Date(counterProposal.newDate),
          time: counterProposal.newTime,
          reason: counterProposal.reason || 'Student counter-proposal'
        };
        message = 'Counter proposal sent to owner';
        break;
    }

    // Update the meeting
    const updatedMeeting = await Meeting.findByIdAndUpdate(
      meetingId,
      updateData,
      { new: true }
    ).populate([
      { path: 'property', select: 'title location' },
      { path: 'owner', select: 'fullName phone email' }
    ]);

    return NextResponse.json({
      success: true,
      message,
      data: {
        meetingId: updatedMeeting._id,
        status: updatedMeeting.status,
        studentResponse: updatedMeeting.studentResponse,
        confirmedDate: updatedMeeting.confirmedDate,
        confirmedTime: updatedMeeting.confirmedTime,
        counterProposal: updatedMeeting.counterProposal,
        property: updatedMeeting.property,
        owner: updatedMeeting.owner
      }
    });

  } catch (error) {
    console.error('Error processing student response:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process student response'
    }, { status: 500 });
  }
}