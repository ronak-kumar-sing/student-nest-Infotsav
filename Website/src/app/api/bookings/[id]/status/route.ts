import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Booking from '@/lib/models/Booking';
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

// PUT: Update booking status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const { id: bookingId } = await params;
    const body = await request.json();

    // Fetch booking
    const booking = await Booking.findById(bookingId)
      .populate('room', 'title location owner')
      .populate('student', 'fullName email');

    if (!booking) {
      return NextResponse.json({
        success: false,
        error: 'Booking not found'
      }, { status: 404 });
    }

    // Get room owner ID
    const roomOwner = (booking as any).room?.owner?.toString();

    // Only room owner can update booking status
    if (roomOwner !== decoded.userId) {
      return NextResponse.json({
        success: false,
        error: 'Only the property owner can update booking status'
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
    (booking as any).status = body.status;

    // Update timestamps based on status
    if (body.status === 'confirmed') {
      (booking as any).confirmedAt = new Date();
    } else if (body.status === 'cancelled') {
      (booking as any).cancelledAt = new Date();
    }

    await booking.save();

    // Populate for response
    await booking.populate('student', 'fullName email');

    return NextResponse.json({
      success: true,
      message: 'Booking status updated successfully',
      data: {
        booking: {
          _id: booking._id,
          status: (booking as any).status,
          student: booking.student,
          confirmedAt: (booking as any).confirmedAt,
          cancelledAt: (booking as any).cancelledAt,
          updatedAt: (booking as any).updatedAt
        }
      }
    });

  } catch (error: any) {
    console.error('Error updating booking status:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update booking status'
    }, { status: 500 });
  }
}
