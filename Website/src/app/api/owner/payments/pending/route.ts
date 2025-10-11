import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../../lib/db/connection';
import Booking from '../../../../../lib/models/Booking';
import { verifyAccessToken } from '../../../../../lib/utils/jwt';

/**
 * GET /api/owner/payments/pending
 * Get list of bookings with pending offline payment confirmations
 * Owner needs to verify they received the payment
 */
export async function GET(request: NextRequest) {
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
        error: 'Only property owners can access this endpoint'
      }, { status: 403 });
    }

    // Find all bookings for this owner's properties with pending offline payments
    const pendingPayments = await Booking.find({
      owner: decoded.userId,
      paymentStatus: { $in: ['pending_confirmation', 'pending'] },
      $or: [
        { 'offlinePaymentStatus.studentConfirmed': true, 'offlinePaymentStatus.ownerConfirmed': false },
        { paymentMethod: 'offline', paymentStatus: 'pending_confirmation' }
      ]
    })
    .populate('student', 'fullName email phone profilePhoto')
    .populate('room', 'title location price images')
    .sort({ createdAt: -1 })
    .lean();

    // Format response
    const formattedPayments = pendingPayments.map(booking => ({
      bookingId: booking._id,
      student: {
        id: booking.student._id,
        name: booking.student.fullName,
        email: booking.student.email,
        phone: booking.student.phone,
        profilePhoto: booking.student.profilePhoto
      },
      room: {
        id: booking.room._id,
        title: booking.room.title,
        location: booking.room.location,
        price: booking.room.price,
        images: booking.room.images
      },
      amount: booking.totalAmount,
      paymentMethod: booking.offlinePaymentStatus?.paymentMethod || booking.paymentMethod || 'offline',
      transactionId: booking.offlinePaymentStatus?.transactionId || '',
      notes: booking.offlinePaymentStatus?.notes || '',
      studentConfirmedAt: booking.offlinePaymentStatus?.studentConfirmedAt,
      createdAt: booking.createdAt,
      moveInDate: booking.moveInDate,
      duration: booking.duration
    }));

    return NextResponse.json({
      success: true,
      count: formattedPayments.length,
      data: formattedPayments
    });

  } catch (error: any) {
    console.error('Error fetching pending payments:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch pending payments'
    }, { status: 500 });
  }
}
