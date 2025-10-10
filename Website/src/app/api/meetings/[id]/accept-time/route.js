import { NextResponse } from 'next/server';

// Simulate database - in production, replace with actual database calls
let meetingRequests = [];
let timeSlots = [];

export async function PUT(request, { params }) {
  try {
    const meetingId = parseInt(params.id);
    const body = await request.json();
    const { timeSlotId } = body;

    // Find the meeting request
    const meetingIndex = meetingRequests.findIndex(req => req.id === meetingId);
    if (meetingIndex === -1) {
      return NextResponse.json(
        { error: 'Meeting request not found' },
        { status: 404 }
      );
    }

    // Find the time slot
    const timeSlot = timeSlots.find(slot => slot.id === timeSlotId);
    if (!timeSlot || timeSlot.meetingRequestId !== meetingId) {
      return NextResponse.json(
        { error: 'Time slot not found' },
        { status: 404 }
      );
    }

    // Update meeting with accepted time
    const updatedMeeting = {
      ...meetingRequests[meetingIndex],
      status: 'confirmed',
      requestedDate: timeSlot.proposedDate,
      requestedTime: timeSlot.proposedTime,
      updatedAt: new Date().toISOString()
    };

    // Mark the selected time slot
    const timeSlotIndex = timeSlots.findIndex(slot => slot.id === timeSlotId);
    if (timeSlotIndex !== -1) {
      timeSlots[timeSlotIndex].isSelected = true;
    }

    meetingRequests[meetingIndex] = updatedMeeting;

    return NextResponse.json({
      success: true,
      data: updatedMeeting,
      message: 'Meeting time accepted successfully'
    });

  } catch (error) {
    console.error('Error accepting meeting time:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
