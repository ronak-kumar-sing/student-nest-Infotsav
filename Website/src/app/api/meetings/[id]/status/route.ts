import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Meeting from '@/lib/models/Meeting';
import { verifyAccessToken } from '@/lib/utils/jwt';

// Helper function to verify JWT token
async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);
  const decoded = await verifyAccessToken(token);

  if (!decoded || !decoded.userId) {
    throw new Error('Invalid token');
  }

  return decoded;
}

// PUT: Update meeting status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const { id: meetingId } = await params;
    const body = await request.json();

    // Fetch meeting
    const meeting = await Meeting.findById(meetingId)
      .populate('property', 'title location')
      .populate('student', 'fullName email')
      .populate('owner', 'fullName email');

    if (!meeting) {
      return NextResponse.json({
        success: false,
        error: 'Meeting not found'
      }, { status: 404 });
    }

    // Get owner ID
    const meetingOwner = (meeting as any).owner?._id?.toString();

    // Only property owner can update meeting status
    if (meetingOwner !== decoded.userId) {
      return NextResponse.json({
        success: false,
        error: 'Only the property owner can update meeting status'
      }, { status: 403 });
    }

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      }, { status: 400 });
    }

    // Update status
    (meeting as any).status = body.status;

    // If confirming, set the confirmed date
    if (body.status === 'confirmed' && body.confirmedDate) {
      (meeting as any).confirmedDate = new Date(body.confirmedDate);
    }

    await meeting.save();

    return NextResponse.json({
      success: true,
      message: 'Meeting status updated successfully',
      data: {
        meeting: {
          _id: meeting._id,
          status: (meeting as any).status,
          confirmedDate: (meeting as any).confirmedDate,
          property: meeting.property,
          student: meeting.student,
          updatedAt: (meeting as any).updatedAt
        }
      }
    });

  } catch (error: any) {
    console.error('Error updating meeting status:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update meeting status'
    }, { status: 500 });
  }
}
