import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/db/connection';
import Booking from '../../../../lib/models/Booking';
import { verifyAccessToken } from '../../../../lib/utils/jwt';

/**
 * POST /api/payments/confirm-offline
 * Student confirms they have made an offline payment (cash/UPI/bank transfer)
 * This marks the payment as waiting for owner confirmation
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

    const body = await request.json();
    const { bookingId, paymentMethod, transactionId, notes } = body;

    if (!bookingId) {
      return NextResponse.json({
        success: false,
        error: 'Booking ID is required'
      }, { status: 400 });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId).populate('room owner');

    if (!booking) {
      return NextResponse.json({
        success: false,
        error: 'Booking not found'
      }, { status: 404 });
    }

    // Verify the booking belongs to the student
    if (booking.student.toString() !== decoded.userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - This booking does not belong to you'
      }, { status: 403 });
    }

    // Check if payment is already confirmed
    if (booking.paymentStatus === 'completed' || booking.offlinePaymentStatus?.ownerConfirmed) {
      return NextResponse.json({
        success: false,
        error: 'Payment has already been confirmed'
      }, { status: 400 });
    }

    // Update booking with offline payment details
    booking.paymentMethod = paymentMethod || 'offline';
    booking.paymentStatus = 'pending_confirmation'; // Waiting for owner to confirm
    
    // Initialize or update offline payment status
    booking.offlinePaymentStatus = {
      studentConfirmed: true,
      studentConfirmedAt: new Date(),
      ownerConfirmed: false,
      paymentMethod: paymentMethod || 'cash',
      transactionId: transactionId || '',
      notes: notes || ''
    };

    // Generate order ID for tracking
    booking.orderId = `offline_${booking._id}_${Date.now()}`;

    await booking.save();

    return NextResponse.json({
      success: true,
      message: 'Payment confirmation sent to owner. Waiting for owner to verify payment receipt.',
      data: {
        bookingId: booking._id,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        offlinePaymentStatus: booking.offlinePaymentStatus
      }
    });

  } catch (error: any) {
    console.error('Error confirming offline payment:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({
      success: false,
      error: 'Failed to confirm payment. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
