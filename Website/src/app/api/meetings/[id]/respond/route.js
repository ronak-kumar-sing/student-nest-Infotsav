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

// POST /api/meetings/[id]/respond - Respond to meeting request
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
    const { action, response, confirmedDate, confirmedTime } = body;

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
        error: 'Unauthorized: You can only respond to your own meeting requests'
      }, { status: 403 });
    }

    // Validate action
    if (!['accept', 'decline', 'confirm', 'accept_counter', 'decline_counter'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Must be accept, decline, confirm, accept_counter, or decline_counter'
      }, { status: 400 });
    }

    // Update meeting based on action
    let updateData = {};

    switch (action) {
      case 'accept':
      case 'confirm':
        updateData.status = 'confirmed';
        updateData.ownerResponse = response || 'Meeting confirmed';
        if (confirmedDate && confirmedTime) {
          updateData.confirmedDate = new Date(confirmedDate);
          updateData.confirmedTime = confirmedTime;
        }
        break;

      case 'decline':
        updateData.status = 'declined';
        updateData.ownerResponse = response || 'Meeting declined';
        break;

      case 'accept_counter':
        // Accept student's counter proposal
        if (meeting.counterProposal) {
          updateData.status = 'confirmed';
          updateData.confirmedDate = meeting.counterProposal.date;
          updateData.confirmedTime = meeting.counterProposal.time;
          updateData.ownerResponse = response || 'Counter proposal accepted';
          updateData.counterProposal = undefined; // Clear counter proposal
        } else {
          return NextResponse.json({
            success: false,
            error: 'No counter proposal found to accept'
          }, { status: 400 });
        }
        break;

      case 'decline_counter':
        // Decline student's counter proposal
        updateData.status = 'pending'; // Back to pending for new negotiation
        updateData.ownerResponse = response || 'Counter proposal declined';
        updateData.counterProposal = undefined; // Clear counter proposal
        break;
    }

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
      message: `Meeting ${action}ed successfully`,
      data: {
        meetingId: updatedMeeting._id,
        status: updatedMeeting.status,
        ownerResponse: updatedMeeting.ownerResponse,
        confirmedDate: updatedMeeting.confirmedDate,
        confirmedTime: updatedMeeting.confirmedTime,
        property: updatedMeeting.property,
        student: updatedMeeting.student
      }
    });

  } catch (error) {
    console.error('Error responding to meeting:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to respond to meeting'
    }, { status: 500 });
  }
}

// PUT method for backward compatibility
export async function PUT(request, { params }) {
  return POST(request, { params });
}