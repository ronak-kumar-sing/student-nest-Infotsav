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

// GET: Fetch single booking by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const { id: bookingId } = await params;

    // Fetch booking
    const booking = await Booking.findById(bookingId)
      .populate('room', 'title location images price amenities features')
      .populate('student', 'fullName phone email profilePhoto')
      .populate('owner', 'fullName phone email profilePhoto');

    if (!booking) {
      return NextResponse.json({
        success: false,
        error: 'Booking not found'
      }, { status: 404 });
    }

    // Verify user has access to this booking
    const bookingStudent = (booking.student as any)?._id?.toString() || booking.student?.toString();
    const bookingOwner = (booking.owner as any)?._id?.toString() || booking.owner?.toString();

    if (bookingStudent !== decoded.userId && bookingOwner !== decoded.userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized to view this booking'
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        booking
      }
    });

  } catch (error: any) {
    console.error('Error fetching booking:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch booking'
    }, { status: 500 });
  }
}

// PUT: Update booking
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
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return NextResponse.json({
        success: false,
        error: 'Booking not found'
      }, { status: 404 });
    }

    // Verify user has access to this booking
    const bookingStudent = booking.student?.toString();
    const bookingOwner = booking.owner?.toString();

    if (bookingStudent !== decoded.userId && bookingOwner !== decoded.userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized to update this booking'
      }, { status: 403 });
    }

    // Update allowed fields
    if (body.status && bookingOwner === decoded.userId) {
      // Only owner can update status
      booking.status = body.status;

      if (body.status === 'confirmed') {
        booking.confirmedAt = new Date();
      } else if (body.status === 'cancelled') {
        booking.cancelledAt = new Date();
        booking.cancellationReason = body.cancellationReason || 'Cancelled by owner';
      }
    }

    if (body.ownerNotes && bookingOwner === decoded.userId) {
      (booking as any).ownerNotes = body.ownerNotes;
    }

    if (body.studentNotes && bookingStudent === decoded.userId) {
      booking.studentNotes = body.studentNotes;
    }

    await booking.save();

    // Populate for response
    await booking.populate([
      { path: 'room', select: 'title location images price' },
      { path: 'student', select: 'fullName phone email' },
      { path: 'owner', select: 'fullName phone email' }
    ]);

    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      data: {
        booking
      }
    });

  } catch (error: any) {
    console.error('Error updating booking:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update booking'
    }, { status: 500 });
  }
}
