import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Negotiation from '@/lib/models/Negotiation';
import { verifyAccessToken } from '@/lib/utils/jwt';

// GET: Get specific negotiation details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    await connectDB();

    const negotiation = await Negotiation.findById(params.id)
      .populate('room', 'title price location images roomType')
      .populate('student', 'fullName email phone collegeId course yearOfStudy')
      .populate('owner', 'fullName email phone');

    if (!negotiation) {
      return NextResponse.json(
        { success: false, error: 'Negotiation not found' },
        { status: 404 }
      );
    }

    // Verify user has permission to view this negotiation
    const userId = decoded.userId;
    const studentId = typeof negotiation.student === 'object'
      ? (negotiation.student as any)._id
      : negotiation.student;
    const ownerId = typeof negotiation.owner === 'object'
      ? (negotiation.owner as any)._id
      : negotiation.owner;

    if (studentId.toString() !== userId && ownerId.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to view this negotiation' },
        { status: 403 }
      );
    }

    // Add user role to response
    const userRole = studentId.toString() === userId ? 'student' : 'owner';

    return NextResponse.json({
      success: true,
      data: {
        ...negotiation.toObject(),
        userRole,
        isExpired: negotiation.expiresAt && negotiation.expiresAt < new Date(),
        discountPercentage: Math.round(((negotiation.originalPrice - (negotiation.counterOffer || negotiation.proposedPrice)) / negotiation.originalPrice) * 100),
        savingsAmount: negotiation.originalPrice - (negotiation.counterOffer || negotiation.proposedPrice)
      }
    });

  } catch (error: any) {
    console.error('Get negotiation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch negotiation' },
      { status: 500 }
    );
  }
}

// PATCH: Update negotiation (accept, reject, counter, or withdraw)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;
    const body = await request.json();
    const { action, counterOffer, ownerResponse, counterMessage } = body;

    if (!action || !['accept', 'reject', 'counter', 'withdraw'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be accept, reject, counter, or withdraw' },
        { status: 400 }
      );
    }

    await connectDB();

    const negotiation = await Negotiation.findById(params.id)
      .populate('room', 'title price')
      .populate('student', 'fullName email')
      .populate('owner', 'fullName email');

    if (!negotiation) {
      return NextResponse.json(
        { success: false, error: 'Negotiation not found' },
        { status: 404 }
      );
    }

    // Check if negotiation is expired
    if (negotiation.expiresAt && negotiation.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This negotiation has expired' },
        { status: 400 }
      );
    }

    const studentId = typeof negotiation.student === 'object'
      ? (negotiation.student as any)._id
      : negotiation.student;
    const ownerId = typeof negotiation.owner === 'object'
      ? (negotiation.owner as any)._id
      : negotiation.owner;

    // Verify authorization based on action
    if (action === 'withdraw') {
      // Only student can withdraw
      if (studentId.toString() !== userId) {
        return NextResponse.json(
          { success: false, error: 'Only the student can withdraw this negotiation' },
          { status: 403 }
        );
      }
    } else {
      // Only owner can accept, reject, or counter
      if (ownerId.toString() !== userId) {
        return NextResponse.json(
          { success: false, error: 'Only the owner can respond to this negotiation' },
          { status: 403 }
        );
      }
    }

    // Check if negotiation is in actionable state
    if (!['pending', 'countered'].includes(negotiation.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot ${action} ${negotiation.status} negotiation` },
        { status: 400 }
      );
    }

    // Perform the action
    switch (action) {
      case 'accept':
        negotiation.status = 'accepted';
        negotiation.responseDate = new Date();
        negotiation.finalPrice = negotiation.counterOffer || negotiation.proposedPrice;
        if (ownerResponse) negotiation.ownerResponse = ownerResponse;
        break;

      case 'reject':
        negotiation.status = 'rejected';
        negotiation.responseDate = new Date();
        if (ownerResponse) negotiation.ownerResponse = ownerResponse;
        break;

      case 'counter':
        if (!counterOffer || counterOffer <= 0) {
          return NextResponse.json(
            { success: false, error: 'Valid counter offer amount is required' },
            { status: 400 }
          );
        }

        // Validate counter offer range
        if (counterOffer < negotiation.proposedPrice || counterOffer > negotiation.originalPrice) {
          return NextResponse.json(
            { success: false, error: 'Counter offer must be between proposed price and original price' },
            { status: 400 }
          );
        }

        negotiation.status = 'countered';
        negotiation.responseDate = new Date();
        negotiation.counterOffer = counterOffer;
        if (counterMessage) negotiation.counterMessage = counterMessage;
        // Extend expiry by 3 more days for counter negotiation
        negotiation.expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        break;

      case 'withdraw':
        negotiation.status = 'withdrawn';
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    await negotiation.save();

    // Populate the updated negotiation for response
    const updatedNegotiation = await Negotiation.findById(negotiation._id)
      .populate('room', 'title price')
      .populate('student', 'fullName email')
      .populate('owner', 'fullName email');

    return NextResponse.json({
      success: true,
      message: `Negotiation ${action}${action === 'accept' ? 'ed' : action === 'reject' ? 'ed' : action === 'counter' ? 'ed' : 'n'}`,
      data: updatedNegotiation
    });

  } catch (error: any) {
    console.error('Update negotiation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update negotiation' },
      { status: 500 }
    );
  }
}

// DELETE: Delete negotiation (admin only or expired negotiations)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    await connectDB();

    const negotiation = await Negotiation.findById(params.id);

    if (!negotiation) {
      return NextResponse.json(
        { success: false, error: 'Negotiation not found' },
        { status: 404 }
      );
    }

    // Only allow deletion of expired or completed negotiations
    const canDelete =
      (negotiation.expiresAt && negotiation.expiresAt < new Date()) ||
      ['accepted', 'rejected', 'withdrawn'].includes(negotiation.status);

    if (!canDelete) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete active negotiation' },
        { status: 400 }
      );
    }

    await negotiation.deleteOne();

    return NextResponse.json({
      success: true,
      message: 'Negotiation deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete negotiation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete negotiation' },
      { status: 500 }
    );
  }
}