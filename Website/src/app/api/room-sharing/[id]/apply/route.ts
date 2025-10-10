import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import RoomSharing from '@/lib/models/RoomSharing';
import Student from '@/lib/models/Student';
import { verifyAccessToken } from '@/lib/utils/jwt';
import mongoose from 'mongoose';

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

// POST: Apply to join a room share
export async function POST(
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
    const { message } = body;

    await connectDB();

    // Find the room share
    const roomShare = await RoomSharing.findById(shareId);

    if (!roomShare) {
      return NextResponse.json(
        { success: false, error: 'Room share not found' },
        { status: 404 }
      );
    }

    // Check if share is active
    if (roomShare.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'This room share is not accepting applications' },
        { status: 400 }
      );
    }

    // Check if user is the initiator
    if (roomShare.initiator.toString() === userId) {
      return NextResponse.json(
        { success: false, error: 'You cannot apply to your own room share' },
        { status: 400 }
      );
    }

    // Check if user is already a participant
    const isParticipant = roomShare.currentParticipants.some(
      (p: any) => p.user.toString() === userId && p.status === 'confirmed'
    );

    if (isParticipant) {
      return NextResponse.json(
        { success: false, error: 'You are already a participant in this room share' },
        { status: 400 }
      );
    }

    // Check if user already has a pending application
    const existingApplication = roomShare.applications.find(
      (app: any) => app.applicant.toString() === userId && app.status === 'pending'
    );

    if (existingApplication) {
      return NextResponse.json(
        { success: false, error: 'You have already applied to this room share' },
        { status: 400 }
      );
    }

    // Add application using the model method
    await roomShare.addApplication(new mongoose.Types.ObjectId(userId), message || '');

    // Populate the updated share
    const updatedShare = await RoomSharing.findById(shareId)
      .populate('property', 'title location')
      .populate('initiator', 'fullName email profilePhoto')
      .populate('applications.applicant', 'fullName profilePhoto email')
      .lean();

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      data: updatedShare
    });

  } catch (error: any) {
    console.error('Error applying to room share:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit application' },
      { status: 500 }
    );
  }
}

// DELETE: Withdraw application
export async function DELETE(
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

    await connectDB();

    // Find the room share
    const roomShare = await RoomSharing.findById(shareId);

    if (!roomShare) {
      return NextResponse.json(
        { success: false, error: 'Room share not found' },
        { status: 404 }
      );
    }

    // Find the user's application
    const applicationIndex = roomShare.applications.findIndex(
      (app: any) => app.applicant.toString() === userId && app.status === 'pending'
    );

    if (applicationIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'No pending application found' },
        { status: 404 }
      );
    }

    // Remove the application
    roomShare.applications.splice(applicationIndex, 1);
    await roomShare.save();

    return NextResponse.json({
      success: true,
      message: 'Application withdrawn successfully'
    });

  } catch (error: any) {
    console.error('Error withdrawing application:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to withdraw application' },
      { status: 500 }
    );
  }
}
