/**
 * Room Sharing Interest API
 * Allows students to mark interest/bookmark room shares
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import RoomSharing from '@/lib/models/RoomSharing';
import Student from '@/lib/models/Student';
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
    const user = await Student.findById(decoded.userId);

    if (!user) {
      return { error: 'User not found', status: 404 };
    }

    return { user, userId: decoded.userId };
  } catch (error) {
    return { error: 'Authentication failed', status: 401 };
  }
}

// GET: Get all interested/bookmarked room shares
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

    await connectDB();

    // Find all shares where user has shown interest
    const interestedShares = await RoomSharing.find({
      'interested.user': userId
    })
      .populate('property', 'title location images amenities rent')
      .populate('initiator', 'fullName email profilePhoto')
      .populate('currentParticipants.user', 'fullName profilePhoto')
      .sort({ 'interested.interestedAt': -1 })
      .lean();

    // Add interest timestamp for each share
    const sharesWithInterest = interestedShares.map(share => {
      const userInterest = share.interested.find(
        (int: any) => int.user.toString() === userId.toString()
      );

      return {
        ...share,
        interestedAt: userInterest?.interestedAt,
        availableSlots: share.maxParticipants - share.currentParticipants.filter(
          (p: any) => p.status === 'confirmed'
        ).length
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        interested: sharesWithInterest,
        total: sharesWithInterest.length
      }
    });

  } catch (error: any) {
    console.error('Error fetching interested shares:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch interested shares'
    }, { status: 500 });
  }
}

// POST: Mark interest in a room share
export async function POST(
  request: NextRequest
) {
  try {
    const verification = await verifyUser(request);
    if ('error' in verification) {
      return NextResponse.json(
        { success: false, error: verification.error },
        { status: verification.status }
      );
    }

    const { userId } = verification;
    const body = await request.json();
    const { shareId } = body;

    if (!shareId) {
      return NextResponse.json({
        success: false,
        error: 'Share ID is required'
      }, { status: 400 });
    }

    await connectDB();

    // Find the room share
    const roomShare = await RoomSharing.findById(shareId);

    if (!roomShare) {
      return NextResponse.json({
        success: false,
        error: 'Room share not found'
      }, { status: 404 });
    }

    // Check if already interested
    const alreadyInterested = roomShare.interested.some(
      (int: any) => int.user.toString() === userId.toString()
    );

    if (alreadyInterested) {
      return NextResponse.json({
        success: false,
        error: 'You have already marked interest in this room share'
      }, { status: 400 });
    }

    // Add interest
    await RoomSharing.findByIdAndUpdate(
      shareId,
      {
        $push: {
          interested: {
            user: userId,
            interestedAt: new Date()
          }
        },
        $inc: { views: 1 } // Also increment views
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Interest marked successfully'
    });

  } catch (error: any) {
    console.error('Error marking interest:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to mark interest'
    }, { status: 500 });
  }
}

// DELETE: Remove interest from a room share
export async function DELETE(request: NextRequest) {
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
    const shareId = searchParams.get('shareId');

    if (!shareId) {
      return NextResponse.json({
        success: false,
        error: 'Share ID is required'
      }, { status: 400 });
    }

    await connectDB();

    // Remove interest
    const result = await RoomSharing.findByIdAndUpdate(
      shareId,
      {
        $pull: {
          interested: { user: userId }
        }
      },
      { new: true }
    );

    if (!result) {
      return NextResponse.json({
        success: false,
        error: 'Room share not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Interest removed successfully'
    });

  } catch (error: any) {
    console.error('Error removing interest:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to remove interest'
    }, { status: 500 });
  }
}
