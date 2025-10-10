import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Booking from '@/lib/models/Booking';
import Room from '@/lib/models/Room';
import { verifyAccessToken } from '@/lib/utils/jwt';

// PATCH: Confirm offline payment by owner
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const bookingId = params.id;
    const body = await request.json();
    const { ownerConfirmed } = body;

    const booking = await Booking.findById(bookingId).populate('room');

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify the user is the owner of this property
    const room = booking.room as any;
    if (!room || room.owner.toString() !== decoded.userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - You are not the owner of this property' },
        { status: 403 }
      );
    }

    // Check if payment method is offline
    if ((booking as any).paymentMethod !== 'offline') {
      return NextResponse.json(
        { success: false, error: 'This booking does not use offline payment' },
        { status: 400 }
      );
    }

    if (ownerConfirmed) {
      (booking as any).paymentStatus = 'paid';
      booking.status = 'confirmed';
      await booking.save();

      return NextResponse.json({
        success: true,
        message: 'Payment confirmed successfully',
        data: booking
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
