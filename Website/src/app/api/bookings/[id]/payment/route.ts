import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Booking from '@/lib/models/Booking';
import { verifyAccessToken } from '@/lib/utils/jwt';

// Helper to verify user
async function verifyUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { error: 'No token provided', status: 401 };
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded || !decoded.userId) {
      return { error: 'Invalid token', status: 401 };
    }

    return { userId: decoded.userId };
  } catch (error) {
    return { error: 'Authentication failed', status: 401 };
  }
}

// POST: Process payment (online or offline)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const verification = await verifyUser(request);
    if ('error' in verification) {
      return NextResponse.json(
        { success: false, error: verification.error },
        { status: verification.status }
      );
    }

    const { userId } = verification;
    const body = await request.json();
    const { paymentMethod, paymentDetails } = body;

    if (!paymentMethod || !['online', 'offline'].includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment method' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find booking
    const booking = await Booking.findById(params.id)
      .populate('student', 'fullName email phone')
      .populate('owner', 'fullName email phone')
      .populate('room', 'title location price');

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify user is the student who made the booking
    const studentId = typeof booking.student === 'object' ? (booking.student as any)._id : booking.student;
    if (studentId.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Not your booking' },
        { status: 403 }
      );
    }

    // Check if booking is in pending state
    if (booking.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Cannot pay for ${booking.status} booking` },
        { status: 400 }
      );
    }

    // Handle online payment
    if (paymentMethod === 'online') {
      // TODO: Integrate with actual payment gateway (Razorpay, Stripe, etc.)
      // For now, simulate successful payment

      booking.paymentStatus = 'paid';
      booking.status = 'confirmed';
      booking.confirmedAt = new Date();

      // Update payment details
      if (!booking.paymentDetails) {
        booking.paymentDetails = {} as any;
      }

      booking.paymentDetails.paymentMethod = 'online';
      booking.paymentDetails.transactionId = paymentDetails?.transactionId || `TXN${Date.now()}`;
      booking.paymentDetails.paymentDate = new Date();
      booking.paymentDetails.totalPaid = booking.totalAmount;

      await booking.save();

      return NextResponse.json({
        success: true,
        message: 'Payment successful! Booking confirmed.',
        data: booking
      });
    }

    // Handle offline payment request
    if (paymentMethod === 'offline') {
      booking.paymentStatus = 'pending';
      booking.status = 'pending' as any;

      // Update payment details
      if (!booking.paymentDetails) {
        booking.paymentDetails = {} as any;
      }

      booking.paymentDetails.paymentMethod = 'cash';

      await booking.save();

      return NextResponse.json({
        success: true,
        message: 'Offline payment selected. Waiting for owner confirmation.',
        data: booking
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid payment method' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Payment processing failed' },
      { status: 500 }
    );
  }
}

// PATCH: Confirm offline payment (owner only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const verification = await verifyUser(request);
    if ('error' in verification) {
      return NextResponse.json(
        { success: false, error: verification.error },
        { status: verification.status }
      );
    }

    const { userId } = verification;
    await connectDB();

    const booking = await Booking.findById(params.id)
      .populate('student', 'fullName email')
      .populate('owner', 'fullName email')
      .populate('room', 'title');

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify user is the owner
    const ownerId = typeof booking.owner === 'object' ? (booking.owner as any)._id : booking.owner;
    if (ownerId.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Not your property' },
        { status: 403 }
      );
    }

    // Verify payment is offline and pending
    if (booking.paymentDetails?.paymentMethod !== 'cash') {
      return NextResponse.json(
        { success: false, error: 'Not an offline payment' },
        { status: 400 }
      );
    }

    // Confirm payment
    booking.paymentStatus = 'paid';
    booking.status = 'confirmed';
    booking.confirmedAt = new Date();

    // Update payment details
    booking.paymentDetails.paymentDate = new Date();
    booking.paymentDetails.totalPaid = booking.totalAmount;

    await booking.save();

    return NextResponse.json({
      success: true,
      message: 'Offline payment confirmed successfully',
      data: booking
    });

  } catch (error: any) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Payment confirmation failed' },
      { status: 500 }
    );
  }
}
