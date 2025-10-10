import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Booking from '@/lib/models/Booking';
import Room from '@/lib/models/Room';
import User from '@/lib/models/User';
import { verifyAccessToken } from '@/lib/utils/jwt';

// Payment model schema (will be created if doesn't exist)
import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['booking', 'rent', 'deposit', 'maintenance', 'late_fee', 'refund'],
    default: 'rent'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['upi', 'card', 'netbanking', 'wallet', 'cash', 'bank_transfer'],
    required: true
  },
  transactionId: String,
  gatewayResponse: mongoose.Schema.Types.Mixed,
  dueDate: Date,
  paidDate: Date,
  description: String,
  receiptUrl: String,
  notes: String,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);

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

// GET /api/payments - Get payments with filters
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
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build query based on role
    const query: any = role === 'owner'
      ? { ownerId: userId }
      : { studentId: userId };

    if (status) query.status = status;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [payments, totalCount] = await Promise.all([
      Payment.find(query)
        .populate('bookingId', 'startDate endDate status')
        .populate('studentId', 'fullName email phone')
        .populate('ownerId', 'fullName email phone')
        .populate('propertyId', 'title location images price')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Payment.countDocuments(query)
    ]);

    // Calculate statistics
    const stats = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const completedPayments = stats.find(s => s._id === 'completed');
    const pendingPayments = stats.find(s => s._id === 'pending');

    return NextResponse.json({
      success: true,
      data: {
        payments: payments.map(payment => ({
          id: payment._id,
          bookingId: payment.bookingId?._id,
          student: {
            id: payment.studentId?._id,
            name: payment.studentId?.fullName,
            email: payment.studentId?.email,
            phone: payment.studentId?.phone
          },
          owner: {
            id: payment.ownerId?._id,
            name: payment.ownerId?.fullName,
            email: payment.ownerId?.email
          },
          property: {
            id: payment.propertyId?._id,
            title: payment.propertyId?.title,
            location: payment.propertyId?.location,
            image: payment.propertyId?.images?.[0]
          },
          amount: payment.amount,
          type: payment.type,
          status: payment.status,
          paymentMethod: payment.paymentMethod,
          transactionId: payment.transactionId,
          dueDate: payment.dueDate,
          paidDate: payment.paidDate,
          description: payment.description,
          receiptUrl: payment.receiptUrl,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt
        })),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        },
        statistics: {
          totalAmount,
          totalCompleted: completedPayments?.total || 0,
          totalPending: pendingPayments?.total || 0,
          completedCount: completedPayments?.count || 0,
          pendingCount: pendingPayments?.count || 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch payments'
    }, { status: 500 });
  }
}

// POST /api/payments - Create new payment
export async function POST(request: NextRequest) {
  try {
    const { userId, role, error } = await getAuthenticatedUser(request);

    if (error) {
      return NextResponse.json({
        success: false,
        error
      }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const {
      bookingId,
      amount,
      type = 'rent',
      paymentMethod,
      dueDate,
      description,
      notes
    } = body;

    // Validate required fields
    if (!bookingId || !amount || !paymentMethod) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: bookingId, amount, paymentMethod'
      }, { status: 400 });
    }

    // Get booking details
    const booking = await Booking.findById(bookingId)
      .populate('room')
      .populate('student')
      .populate('owner');

    if (!booking) {
      return NextResponse.json({
        success: false,
        error: 'Booking not found'
      }, { status: 404 });
    }

    // Verify user has access to this booking
    const isStudent = role === 'student' && booking.student._id.toString() === userId;
    const isOwner = role === 'owner' && booking.owner._id.toString() === userId;

    if (!isStudent && !isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized to create payment for this booking'
      }, { status: 403 });
    }

    // Create payment record
    const payment = await Payment.create({
      bookingId: booking._id,
      studentId: booking.student._id,
      ownerId: booking.owner._id,
      propertyId: booking.room._id,
      amount,
      type,
      paymentMethod,
      dueDate: dueDate || new Date(),
      description,
      notes,
      status: 'pending'
    });

    // Populate payment details
    await payment.populate([
      { path: 'bookingId', select: 'startDate endDate status' },
      { path: 'studentId', select: 'fullName email phone' },
      { path: 'ownerId', select: 'fullName email' },
      { path: 'propertyId', select: 'title location images' }
    ]);

    return NextResponse.json({
      success: true,
      message: 'Payment record created successfully',
      data: {
        paymentId: payment._id,
        payment: {
          id: payment._id,
          amount: payment.amount,
          type: payment.type,
          status: payment.status,
          paymentMethod: payment.paymentMethod,
          dueDate: payment.dueDate,
          student: {
            name: payment.studentId.fullName,
            email: payment.studentId.email
          },
          property: {
            title: payment.propertyId.title,
            location: payment.propertyId.location
          }
        }
      }
    });

  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create payment'
    }, { status: 500 });
  }
}

export { Payment };
