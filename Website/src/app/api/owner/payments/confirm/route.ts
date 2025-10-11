import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../../lib/db/connection';
import Booking from '../../../../../lib/models/Booking';
import Room from '../../../../../lib/models/Room';
import { verifyAccessToken } from '../../../../../lib/utils/jwt';

/**
 * POST /api/owner/payments/confirm
 * Owner confirms they have received the offline payment from student
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Please login to continue'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json({
        success: false,
        error: 'Invalid token - Please login again'
      }, { status: 401 });
    }

    // Verify user is an owner
    if (decoded.role?.toLowerCase() !== 'owner') {
      return NextResponse.json({
        success: false,
        error: 'Only property owners can confirm payments'
      }, { status: 403 });
    }

    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json({
        success: false,
        error: 'Booking ID is required'
      }, { status: 400 });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId).populate('room');

    if (!booking) {
      return NextResponse.json({
        success: false,
        error: 'Booking not found'
      }, { status: 404 });
    }

    // Verify the booking belongs to the owner
    if (booking.owner.toString() !== decoded.userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - This booking does not belong to your property'
      }, { status: 403 });
    }

    // Check if already confirmed
    if (booking.paymentStatus === 'completed') {
      return NextResponse.json({
        success: false,
        error: 'Payment has already been confirmed'
      }, { status: 400 });
    }

    // Update booking - Owner confirms payment received
    booking.paymentStatus = 'completed';
    booking.status = 'confirmed';
    
    // Update offline payment status
    const offlinePaymentStatus = (booking as any).offlinePaymentStatus || {};
    (booking as any).offlinePaymentStatus = {
      ...offlinePaymentStatus,
      ownerConfirmed: true,
      ownerConfirmedAt: new Date(),
      studentConfirmed: offlinePaymentStatus.studentConfirmed || true
    };

    // Create transaction record
    (booking as any).transaction = {
      id: `offline_${booking._id}_${Date.now()}`,
      orderId: (booking as any).orderId || `offline_${booking._id}`,
      status: 'success',
      method: (booking as any).paymentMethod || 'offline',
      amount: booking.totalAmount,
      currency: 'INR',
      paidAt: new Date()
    };

    await booking.save();

    // Update room availability - use updateOne to bypass validation
    const room = await Room.findById(booking.room);
    if (room && room.availability) {
      await Room.updateOne(
        { _id: booking.room },
        { 
          $set: {
            'availability.availableRooms': Math.max(0, (room.availability.availableRooms || 0) - 1),
            'availability.isAvailable': (room.availability.availableRooms || 0) - 1 > 0
          }
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed successfully. Booking is now active.',
      data: {
        bookingId: booking._id,
        status: booking.status,
        paymentStatus: booking.paymentStatus
      }
    });

  } catch (error: any) {
    console.error('Error confirming payment:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      errors: error.errors
    });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to confirm payment. Please try again.',
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message,
        errorName: error.name
      })
    }, { status: 500 });
  }
}
