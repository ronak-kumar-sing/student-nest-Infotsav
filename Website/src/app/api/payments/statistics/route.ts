import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import { Payment } from '../route';
import Booking from '@/lib/models/Booking';
import { verifyAccessToken } from '@/lib/utils/jwt';

// Helper function to verify authentication
async function getAuthenticatedUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'No valid authorization header found' };
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    if (!decoded.userId) {
      return { error: 'Invalid token payload' };
    }

    return { userId: decoded.userId, role: decoded.role };
  } catch (error) {
    console.error('Authentication error:', error);
    return { error: 'Invalid or expired token' };
  }
}

// GET /api/payments/statistics - Get payment statistics
export async function GET(request: NextRequest) {
  try {
    const { userId, role, error } = await getAuthenticatedUser(request);

    if (error) {
      return NextResponse.json({
        success: false,
        error
      }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // month, quarter, year, all

    // Build query based on role
    const query: any = role === 'owner'
      ? { ownerId: userId }
      : { studentId: userId };

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0); // All time
    }

    // Get comprehensive statistics
    const [
      totalStats,
      statusBreakdown,
      typeBreakdown,
      monthlyTrend,
      recentPayments,
      upcomingPayments
    ] = await Promise.all([
      // Total statistics
      Payment.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            totalCount: { $sum: 1 },
            averageAmount: { $avg: '$amount' }
          }
        }
      ]),

      // Status breakdown
      Payment.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),

      // Type breakdown
      Payment.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),

      // Monthly trend (last 6 months)
      Payment.aggregate([
        {
          $match: {
            ...query,
            createdAt: {
              $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1)
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            total: { $sum: '$amount' },
            count: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
            },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),

      // Recent payments
      Payment.find(query)
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('propertyId', 'title')
        .populate('studentId', 'fullName')
        .lean(),

      // Upcoming payments (due in next 30 days)
      Payment.find({
        ...query,
        status: 'pending',
        dueDate: {
          $gte: now,
          $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        }
      })
        .sort({ dueDate: 1 })
        .populate('propertyId', 'title')
        .populate('studentId', 'fullName')
        .lean()
    ]);

    // Calculate period-specific stats
    const periodQuery = {
      ...query,
      createdAt: { $gte: startDate }
    };

    const periodStats = await Payment.aggregate([
      { $match: periodQuery },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] }
          }
        }
      }
    ]);

    // Calculate overdue payments
    const overduePayments = await Payment.find({
      ...query,
      status: { $in: ['pending', 'processing'] },
      dueDate: { $lt: now }
    }).countDocuments();

    const overdueAmount = await Payment.aggregate([
      {
        $match: {
          ...query,
          status: { $in: ['pending', 'processing'] },
          dueDate: { $lt: now }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalAmount: totalStats[0]?.totalAmount || 0,
          totalCount: totalStats[0]?.totalCount || 0,
          averageAmount: totalStats[0]?.averageAmount || 0,
          periodAmount: periodStats[0]?.total || 0,
          periodCount: periodStats[0]?.count || 0,
          periodCompleted: periodStats[0]?.completed || 0,
          periodPending: periodStats[0]?.pending || 0,
          overdueCount: overduePayments,
          overdueAmount: overdueAmount[0]?.total || 0
        },
        statusBreakdown: statusBreakdown.map(item => ({
          status: item._id,
          total: item.total,
          count: item.count,
          percentage: totalStats[0]?.totalAmount
            ? (item.total / totalStats[0].totalAmount * 100).toFixed(2)
            : 0
        })),
        typeBreakdown: typeBreakdown.map(item => ({
          type: item._id,
          total: item.total,
          count: item.count,
          percentage: totalStats[0]?.totalAmount
            ? (item.total / totalStats[0].totalAmount * 100).toFixed(2)
            : 0
        })),
        monthlyTrend: monthlyTrend.map(item => ({
          month: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
          total: item.total,
          count: item.count,
          completed: item.completed,
          pending: item.pending
        })),
        recentPayments: recentPayments.map(p => ({
          id: p._id,
          amount: p.amount,
          type: p.type,
          status: p.status,
          property: p.propertyId?.title,
          student: p.studentId?.fullName,
          createdAt: p.createdAt
        })),
        upcomingPayments: upcomingPayments.map(p => ({
          id: p._id,
          amount: p.amount,
          type: p.type,
          property: p.propertyId?.title,
          student: p.studentId?.fullName,
          dueDate: p.dueDate
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching payment statistics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch payment statistics'
    }, { status: 500 });
  }
}
