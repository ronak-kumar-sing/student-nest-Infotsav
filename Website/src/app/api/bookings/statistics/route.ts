/**
 * Booking Statistics & Analytics API
 * Provides comprehensive analytics for both students and owners
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Booking from '@/lib/models/Booking';
import Room from '@/lib/models/Room';
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

    await connectDB();
    const user = await User.findById(decoded.userId);

    if (!user) {
      return { error: 'User not found', status: 404 };
    }

    return { user, userId: decoded.userId };
  } catch (error) {
    return { error: 'Authentication failed', status: 401 };
  }
}

// GET: Fetch booking statistics and analytics
export async function GET(request: NextRequest) {
  try {
    const verification = await verifyUser(request);
    if ('error' in verification) {
      return NextResponse.json(
        { success: false, error: verification.error },
        { status: verification.status }
      );
    }

    const { user, userId } = verification;
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'all'; // all, month, week, year

    // Determine query based on user role
    const isStudent = user.role === 'student' || user.role === 'Student';
    const isOwner = user.role === 'owner' || user.role === 'Owner';

    const baseQuery: any = isStudent
      ? { student: userId }
      : isOwner
      ? { owner: userId }
      : {};

    // Date filter based on timeframe
    const now = new Date();
    let dateFilter: any = {};

    if (timeframe === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter.createdAt = { $gte: weekAgo };
    } else if (timeframe === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter.createdAt = { $gte: monthAgo };
    } else if (timeframe === 'year') {
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      dateFilter.createdAt = { $gte: yearAgo };
    }

    await connectDB();

    // Get all bookings for the user
    const allBookings = await Booking.find({ ...baseQuery, ...dateFilter })
      .populate('room', 'title location price')
      .populate('student', 'fullName email')
      .populate('owner', 'fullName email')
      .lean();

    // Calculate statistics
    const stats = {
      total: allBookings.length,
      pending: allBookings.filter(b => b.status === 'pending').length,
      confirmed: allBookings.filter(b => b.status === 'confirmed').length,
      active: allBookings.filter(b => b.status === 'active').length,
      completed: allBookings.filter(b => b.status === 'completed').length,
      cancelled: allBookings.filter(b => b.status === 'cancelled').length,
      rejected: allBookings.filter(b => b.status === 'rejected').length,
    };

    // Payment statistics
    const paymentStats = {
      totalRevenue: allBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
      totalPaid: allBookings.reduce((sum, b) => sum + (b.paymentDetails?.totalPaid || 0), 0),
      pendingPayments: allBookings.reduce((sum, b) =>
        b.paymentStatus === 'pending' || b.paymentStatus === 'partial'
          ? sum + (b.totalAmount - (b.paymentDetails?.totalPaid || 0))
          : sum
      , 0),
      paidCount: allBookings.filter(b => b.paymentStatus === 'paid').length,
      pendingCount: allBookings.filter(b => b.paymentStatus === 'pending').length,
      partialCount: allBookings.filter(b => b.paymentStatus === 'partial').length,
      failedCount: allBookings.filter(b => b.paymentStatus === 'failed').length,
    };

    // Duration statistics
    const avgDuration = allBookings.length > 0
      ? allBookings.reduce((sum, b) => sum + (b.duration || 0), 0) / allBookings.length
      : 0;

    // Upcoming bookings (move-in dates in the future)
    const upcomingBookings = allBookings.filter(b =>
      b.moveInDate && new Date(b.moveInDate) > now &&
      ['pending', 'confirmed'].includes(b.status || '')
    ).map(b => ({
      id: b._id,
      room: b.room,
      student: b.student,
      owner: b.owner,
      moveInDate: b.moveInDate,
      status: b.status,
      totalAmount: b.totalAmount
    }));

    // Active ongoing bookings
    const ongoingBookings = allBookings.filter(b =>
      b.status === 'active' &&
      b.moveInDate && new Date(b.moveInDate) <= now &&
      (!b.moveOutDate || new Date(b.moveOutDate) > now)
    ).map(b => ({
      id: b._id,
      room: b.room,
      student: b.student,
      owner: b.owner,
      moveInDate: b.moveInDate,
      moveOutDate: b.moveOutDate,
      monthlyRent: b.monthlyRent,
      paymentStatus: b.paymentStatus
    }));

    // Bookings expiring soon (within 30 days)
    const expiringSoon = allBookings.filter(b => {
      if (!b.moveOutDate || b.status !== 'active') return false;
      const moveOutDate = new Date(b.moveOutDate);
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return moveOutDate > now && moveOutDate <= thirtyDaysFromNow;
    }).map(b => ({
      id: b._id,
      room: b.room,
      student: b.student,
      moveOutDate: b.moveOutDate,
      daysRemaining: Math.ceil((new Date(b.moveOutDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }));

    // Recent activity (last 10 bookings)
    const recentActivity = allBookings
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 10)
      .map(b => ({
        id: b._id,
        room: b.room,
        student: b.student,
        owner: b.owner,
        status: b.status,
        createdAt: b.createdAt,
        totalAmount: b.totalAmount
      }));

    // Monthly breakdown (for charts)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthBookings = allBookings.filter(b => {
        const createdAt = new Date(b.createdAt!);
        return createdAt >= monthStart && createdAt <= monthEnd;
      });

      monthlyData.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
        bookings: monthBookings.length,
        revenue: monthBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
        confirmed: monthBookings.filter(b => b.status === 'confirmed' || b.status === 'active').length
      });
    }

    // Student-specific stats
    let studentSpecificStats = {};
    if (isStudent) {
      const currentBooking = allBookings.find(b =>
        b.status === 'active' &&
        (!b.moveOutDate || new Date(b.moveOutDate) > now)
      );

      studentSpecificStats = {
        hasActiveBooking: !!currentBooking,
        currentBooking: currentBooking ? {
          id: currentBooking._id,
          room: currentBooking.room,
          owner: currentBooking.owner,
          moveInDate: currentBooking.moveInDate,
          moveOutDate: currentBooking.moveOutDate,
          monthlyRent: currentBooking.monthlyRent,
          paymentStatus: currentBooking.paymentStatus
        } : null,
        totalSpent: allBookings
          .filter(b => b.paymentStatus === 'paid')
          .reduce((sum, b) => sum + (b.paymentDetails?.totalPaid || 0), 0),
        averageStayDuration: avgDuration,
        favoriteLocations: getFavoriteLocations(allBookings)
      };
    }

    // Owner-specific stats
    let ownerSpecificStats = {};
    if (isOwner) {
      const uniqueStudents = new Set(allBookings.map(b => b.student?.toString()));
      const uniqueProperties = new Set(allBookings.map(b => b.room?.toString()));

      ownerSpecificStats = {
        totalStudents: uniqueStudents.size,
        totalProperties: uniqueProperties.size,
        occupancyRate: calculateOccupancyRate(allBookings),
        avgBookingDuration: avgDuration,
        totalEarnings: paymentStats.totalPaid,
        pendingApprovals: stats.pending,
        activeTenants: stats.active,
        topPerformingProperty: await getTopPerformingProperty(userId),
        renewalRate: calculateRenewalRate(allBookings)
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: stats,
        payment: paymentStats,
        upcoming: upcomingBookings,
        ongoing: ongoingBookings,
        expiringSoon,
        recentActivity,
        monthlyTrend: monthlyData,
        ...(isStudent && { student: studentSpecificStats }),
        ...(isOwner && { owner: ownerSpecificStats })
      }
    });

  } catch (error: any) {
    console.error('Error fetching booking statistics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch booking statistics'
    }, { status: 500 });
  }
}

// Helper function to get favorite locations
function getFavoriteLocations(bookings: any[]) {
  const locationCount: { [key: string]: number } = {};

  bookings.forEach(b => {
    const city = b.room?.location?.city;
    if (city) {
      locationCount[city] = (locationCount[city] || 0) + 1;
    }
  });

  return Object.entries(locationCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([city, count]) => ({ city, bookings: count }));
}

// Helper function to calculate occupancy rate
function calculateOccupancyRate(bookings: any[]) {
  const activeBookings = bookings.filter(b => b.status === 'active' || b.status === 'confirmed');
  const totalBookings = bookings.length;

  return totalBookings > 0 ? Math.round((activeBookings.length / totalBookings) * 100) : 0;
}

// Helper function to get top performing property
async function getTopPerformingProperty(ownerId: string) {
  const bookings = await Booking.find({ owner: ownerId })
    .populate('room', 'title location')
    .lean();

  const propertyRevenue: { [key: string]: { total: number, bookings: number, room: any } } = {};

  bookings.forEach(b => {
    const room = b.room as any;
    const roomId = room?._id?.toString();
    if (roomId) {
      if (!propertyRevenue[roomId]) {
        propertyRevenue[roomId] = { total: 0, bookings: 0, room: b.room };
      }
      propertyRevenue[roomId].total += b.totalAmount || 0;
      propertyRevenue[roomId].bookings += 1;
    }
  });

  const topProperty = Object.values(propertyRevenue)
    .sort((a, b) => b.total - a.total)[0];

  return topProperty ? {
    room: topProperty.room,
    totalRevenue: topProperty.total,
    totalBookings: topProperty.bookings
  } : null;
}

// Helper function to calculate renewal rate
function calculateRenewalRate(bookings: any[]) {
  const completedBookings = bookings.filter(b => b.status === 'completed');
  if (completedBookings.length === 0) return 0;

  // Count students who have multiple bookings (renewals)
  const studentBookingCount: { [key: string]: number } = {};

  bookings.forEach(b => {
    const studentId = b.student?.toString();
    if (studentId) {
      studentBookingCount[studentId] = (studentBookingCount[studentId] || 0) + 1;
    }
  });

  const renewedCount = Object.values(studentBookingCount).filter(count => count > 1).length;
  const totalStudents = Object.keys(studentBookingCount).length;

  return totalStudents > 0 ? Math.round((renewedCount / totalStudents) * 100) : 0;
}
