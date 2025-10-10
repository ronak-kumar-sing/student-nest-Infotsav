/**
 * My Bookings Dashboard API
 * Quick access to user's bookings with different categories
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Booking from '@/lib/models/Booking';
import User from '@/lib/models/User';
import { verifyAccessToken } from '@/lib/utils/jwt';

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

// GET: Fetch user's bookings by category
export async function GET(request: NextRequest) {
  try {
    const verification = await verifyUser(request);
    if ('error' in verification) {
      return NextResponse.json(
        { success: false, error: verification.error },
        { status: verification.status }
      );
    }

    const { userId } = verification;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // pending, confirmed, active, completed, all

    await connectDB();

    // Get user to determine role
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    const isStudent = user.role === 'student' || user.role === 'Student';
    const isOwner = user.role === 'owner' || user.role === 'Owner';

    // Base query
    const baseQuery: any = isStudent
      ? { student: userId }
      : isOwner
      ? { owner: userId }
      : {};

    let bookings: any = {};
    const now = new Date();

    if (!type || type === 'all') {
      // Fetch all categories
      const [pending, confirmed, active, completed, cancelled] = await Promise.all([
        Booking.find({ ...baseQuery, status: 'pending' })
          .populate('room', 'title location images price amenities')
          .populate('student', 'fullName email phone profilePhoto')
          .populate('owner', 'fullName email phone profilePhoto')
          .sort({ createdAt: -1 })
          .lean(),

        Booking.find({ ...baseQuery, status: 'confirmed' })
          .populate('room', 'title location images price amenities')
          .populate('student', 'fullName email phone profilePhoto')
          .populate('owner', 'fullName email phone profilePhoto')
          .sort({ moveInDate: 1 })
          .lean(),

        Booking.find({ ...baseQuery, status: 'active' })
          .populate('room', 'title location images price amenities')
          .populate('student', 'fullName email phone profilePhoto')
          .populate('owner', 'fullName email phone profilePhoto')
          .sort({ moveInDate: 1 })
          .lean(),

        Booking.find({ ...baseQuery, status: 'completed' })
          .populate('room', 'title location images price')
          .populate('student', 'fullName email profilePhoto')
          .populate('owner', 'fullName email profilePhoto')
          .sort({ completedAt: -1 })
          .limit(10)
          .lean(),

        Booking.find({ ...baseQuery, status: { $in: ['cancelled', 'rejected'] } })
          .populate('room', 'title location price')
          .populate('student', 'fullName email')
          .populate('owner', 'fullName email')
          .sort({ cancelledAt: -1, rejectedAt: -1 })
          .limit(10)
          .lean()
      ]);

      bookings = {
        pending,
        confirmed,
        active,
        completed,
        cancelled,
        stats: {
          pending: pending.length,
          confirmed: confirmed.length,
          active: active.length,
          completed: completed.length,
          cancelled: cancelled.length,
          total: pending.length + confirmed.length + active.length + completed.length + cancelled.length
        }
      };

    } else {
      // Fetch specific category
      let statusQuery: any = {};
      let sort: any = { createdAt: -1 };

      switch (type) {
        case 'pending':
          statusQuery = { status: 'pending' };
          break;
        case 'confirmed':
          statusQuery = { status: 'confirmed' };
          sort = { moveInDate: 1 };
          break;
        case 'active':
          statusQuery = { status: 'active' };
          sort = { moveInDate: 1 };
          break;
        case 'completed':
          statusQuery = { status: 'completed' };
          sort = { completedAt: -1 };
          break;
        case 'cancelled':
          statusQuery = { status: { $in: ['cancelled', 'rejected'] } };
          sort = { cancelledAt: -1 };
          break;
        case 'upcoming':
          statusQuery = {
            status: { $in: ['confirmed', 'active'] },
            moveInDate: { $gt: now }
          };
          sort = { moveInDate: 1 };
          break;
        case 'expiring':
          // Bookings expiring within 30 days
          const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          statusQuery = {
            status: 'active',
            moveOutDate: {
              $gt: now,
              $lte: thirtyDaysFromNow
            }
          };
          sort = { moveOutDate: 1 };
          break;
        case 'overdue_payment':
          statusQuery = {
            status: { $in: ['confirmed', 'active'] },
            paymentStatus: { $in: ['pending', 'partial'] }
          };
          sort = { createdAt: 1 };
          break;
        default:
          return NextResponse.json({
            success: false,
            error: 'Invalid booking type'
          }, { status: 400 });
      }

      const results = await Booking.find({ ...baseQuery, ...statusQuery })
        .populate('room', 'title location images price amenities features')
        .populate('student', 'fullName email phone profilePhoto')
        .populate('owner', 'fullName email phone profilePhoto businessName')
        .sort(sort)
        .lean();

      bookings = {
        [type]: results,
        count: results.length
      };
    }

    // Add helper fields to bookings
    const enrichBooking = (booking: any) => ({
      ...booking,
      daysUntilMoveIn: booking.moveInDate
        ? Math.ceil((new Date(booking.moveInDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null,
      daysUntilMoveOut: booking.moveOutDate
        ? Math.ceil((new Date(booking.moveOutDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null,
      isOverdue: booking.paymentStatus === 'pending' &&
        booking.status === 'active' &&
        booking.createdAt &&
        (now.getTime() - new Date(booking.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000,
      canExtend: booking.status === 'active' &&
        booking.moveOutDate &&
        new Date(booking.moveOutDate).getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000,
      canCancel: ['pending', 'confirmed'].includes(booking.status || ''),
      canReview: booking.status === 'completed' &&
        (isStudent ? !booking.studentReviewSubmitted : !booking.ownerReviewSubmitted)
    });

    // Enrich all booking categories
    Object.keys(bookings).forEach(key => {
      if (Array.isArray(bookings[key])) {
        bookings[key] = bookings[key].map(enrichBooking);
      }
    });

    return NextResponse.json({
      success: true,
      data: bookings,
      userRole: user.role
    });

  } catch (error: any) {
    console.error('Error fetching my bookings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch bookings'
    }, { status: 500 });
  }
}
