import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import { Payment } from '../route';
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

// GET /api/payments/[id] - Get payment details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, role, error } = await getAuthenticatedUser(request);

    if (error) {
      return NextResponse.json({
        success: false,
        error
      }, { status: 401 });
    }

    await connectDB();

    const payment = await Payment.findById(params.id)
      .populate('bookingId', 'startDate endDate status monthlyRent')
      .populate('studentId', 'fullName email phone')
      .populate('ownerId', 'fullName email phone')
      .populate('propertyId', 'title location images price')
      .lean();

    if (!payment) {
      return NextResponse.json({
        success: false,
        error: 'Payment not found'
      }, { status: 404 });
    }

    // Verify user has access
    const hasAccess =
      (role === 'student' && payment.studentId._id.toString() === userId) ||
      (role === 'owner' && payment.ownerId._id.toString() === userId);

    if (!hasAccess) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized to view this payment'
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        payment: {
          id: payment._id,
          booking: payment.bookingId,
          student: payment.studentId,
          owner: payment.ownerId,
          property: payment.propertyId,
          amount: payment.amount,
          type: payment.type,
          status: payment.status,
          paymentMethod: payment.paymentMethod,
          transactionId: payment.transactionId,
          dueDate: payment.dueDate,
          paidDate: payment.paidDate,
          description: payment.description,
          receiptUrl: payment.receiptUrl,
          notes: payment.notes,
          gatewayResponse: payment.gatewayResponse,
          metadata: payment.metadata,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch payment'
    }, { status: 500 });
  }
}

// PATCH /api/payments/[id] - Update payment status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { status, transactionId, gatewayResponse, receiptUrl, notes } = body;

    const payment = await Payment.findById(params.id);

    if (!payment) {
      return NextResponse.json({
        success: false,
        error: 'Payment not found'
      }, { status: 404 });
    }

    // Verify user has access (owners can update)
    if (role !== 'owner' || payment.ownerId.toString() !== userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized to update this payment'
      }, { status: 403 });
    }

    // Update payment
    if (status) payment.status = status;
    if (transactionId) payment.transactionId = transactionId;
    if (gatewayResponse) payment.gatewayResponse = gatewayResponse;
    if (receiptUrl) payment.receiptUrl = receiptUrl;
    if (notes) payment.notes = notes;

    // Set paid date if completed
    if (status === 'completed' && !payment.paidDate) {
      payment.paidDate = new Date();
    }

    await payment.save();

    await payment.populate([
      { path: 'bookingId', select: 'startDate endDate status' },
      { path: 'studentId', select: 'fullName email phone' },
      { path: 'propertyId', select: 'title location' }
    ]);

    return NextResponse.json({
      success: true,
      message: 'Payment updated successfully',
      data: {
        payment: {
          id: payment._id,
          status: payment.status,
          amount: payment.amount,
          paidDate: payment.paidDate,
          transactionId: payment.transactionId
        }
      }
    });

  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update payment'
    }, { status: 500 });
  }
}
