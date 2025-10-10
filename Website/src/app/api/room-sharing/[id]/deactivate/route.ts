import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import RoomSharing from '@/lib/models/RoomSharing';
import { verifyAccessToken } from '@/lib/utils/jwt';

// PATCH: Deactivate room sharing (initiator only)
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
    await connectDB();

    // Find the room sharing request
    const roomSharing = await RoomSharing.findById(params.id)
      .populate('property', 'title')
      .populate('initiator', 'fullName');

    if (!roomSharing) {
      return NextResponse.json(
        { success: false, error: 'Room sharing not found' },
        { status: 404 }
      );
    }

    // Verify user is the initiator
    const initiatorId = typeof roomSharing.initiator === 'object'
      ? (roomSharing.initiator as any)._id
      : roomSharing.initiator;

    if (initiatorId.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: 'Only the initiator can deactivate this room sharing' },
        { status: 403 }
      );
    }

    // Check if already deactivated
    if (roomSharing.status !== 'active') {
      return NextResponse.json(
        { success: false, error: `Room sharing is already ${roomSharing.status}` },
        { status: 400 }
      );
    }

    // Get optional reason from request body
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    // Deactivate the room sharing
    roomSharing.status = 'cancelled';
    roomSharing.completionReason = reason || 'Manually deactivated by initiator';
    roomSharing.completedAt = new Date();

    await roomSharing.save();

    return NextResponse.json({
      success: true,
      message: 'Room sharing deactivated successfully',
      data: {
        id: roomSharing._id,
        status: roomSharing.status,
        completionReason: roomSharing.completionReason,
        completedAt: roomSharing.completedAt,
        propertyTitle: (roomSharing.property as any)?.title
      }
    });

  } catch (error: any) {
    console.error('Deactivate room sharing error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to deactivate room sharing' },
      { status: 500 }
    );
  }
}