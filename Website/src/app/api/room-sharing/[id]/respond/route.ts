import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import RoomSharing from '@/lib/models/RoomSharing';
import Student from '@/lib/models/Student';
import { verifyAccessToken } from '@/lib/utils/jwt';

// Verify user and ensure they are verified
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
    const user = await Student.findById(decoded.userId);

    if (!user) {
      return { error: 'User not found', status: 404 };
    }

    // Only verified students can access room sharing
    if (!user.isEmailVerified || !user.isPhoneVerified) {
      return { error: 'Only verified students can access room sharing', status: 403 };
    }

    return { user, userId: decoded.userId };
  } catch (error) {
    console.error('Authentication error:', error);
    return { error: 'Authentication failed', status: 401 };
  }
}

// PUT: Respond to an application (accept/reject)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify user
    const verification = await verifyUser(request);
    if ('error' in verification) {
      return NextResponse.json(
        { success: false, error: verification.error },
        { status: verification.status }
      );
    }

    const { userId } = verification;
    const shareId = params.id;
    const body = await request.json();
    const { applicationId, status, message } = body;

    if (!applicationId || !status) {
      return NextResponse.json(
        { success: false, error: 'Application ID and status are required' },
        { status: 400 }
      );
    }

    if (!['accepted', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be "accepted" or "rejected"' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the room share
    const roomShare = await RoomSharing.findById(shareId);

    if (!roomShare) {
      return NextResponse.json(
        { success: false, error: 'Room share not found' },
        { status: 404 }
      );
    }

    // Check if user is the initiator
    if (roomShare.initiator.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: 'Only the initiator can respond to applications' },
        { status: 403 }
      );
    }

    // Respond to application using the model method
    await roomShare.respondToApplication(applicationId, status, message || '');

    // Populate the updated share
    const updatedShare = await RoomSharing.findById(shareId)
      .populate('property', 'title location images')
      .populate('initiator', 'fullName email profilePhoto')
      .populate('currentParticipants.user', 'fullName profilePhoto email')
      .populate('applications.applicant', 'fullName profilePhoto email')
      .lean();

    return NextResponse.json({
      success: true,
      message: `Application ${status} successfully`,
      data: updatedShare
    });

  } catch (error: any) {
    console.error('Error responding to application:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to respond to application' },
      { status: 500 }
    );
  }
}
