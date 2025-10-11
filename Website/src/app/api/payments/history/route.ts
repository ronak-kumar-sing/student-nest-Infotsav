import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/db/connection';
import Transaction from '../../../../lib/models/Transaction';
import { verifyAccessToken } from '../../../../lib/utils/jwt';

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

// GET: Fetch payment history for a user
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const decoded = await verifyToken(request);
    const userId = decoded.userId;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    // Build query
    const query: any = { userId };
    if (status) {
      query.status = status;
    }

    // Fetch transactions
    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('bookingId', 'checkInDate checkOutDate')
        .populate('propertyId', 'title location')
        .lean(),
      Transaction.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Format transactions for frontend
    const formattedTransactions = transactions.map((txn: any) => ({
      id: txn._id,
      orderId: txn.orderId,
      paymentId: txn.paymentId,
      amount: txn.amount,
      displayAmount: (txn.amount / 100).toFixed(2),
      currency: txn.currency,
      status: txn.status,
      method: txn.method,
      description: txn.description,
      receipt: txn.receipt,
      booking: txn.bookingId
        ? {
            id: txn.bookingId._id,
            checkIn: txn.bookingId.checkInDate,
            checkOut: txn.bookingId.checkOutDate,
          }
        : null,
      property: txn.propertyId
        ? {
            id: txn.propertyId._id,
            title: txn.propertyId.title,
            location: txn.propertyId.location,
          }
        : null,
      refund: txn.refundId
        ? {
            refundId: txn.refundId,
            amount: txn.refundAmount,
            status: txn.refundStatus,
          }
        : null,
      createdAt: txn.createdAt,
      updatedAt: txn.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error: any) {
    console.error('Fetch payment history error:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch payment history' },
      { status: 500 }
    );
  }
}
