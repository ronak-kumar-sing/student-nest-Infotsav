/**
 * My Room Shares API
 * Allows students to view and manage their own room sharing listings and applications
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

// GET: Fetch user's own room shares and applications
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
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'created', 'joined', 'applied'

    await connectDB();

    let myShares: any[] = [];
    let myApplications: any[] = [];
    let joinedShares: any[] = [];

    if (!type || type === 'created') {
      // Room shares I created
      myShares = await RoomSharing.find({ initiator: userId })
        .populate('property', 'title location images amenities rent')
        .populate('currentParticipants.user', 'fullName email profilePhoto')
        .populate('applications.applicant', 'fullName email profilePhoto phone')
        .sort({ createdAt: -1 })
        .lean();
    }

    if (!type || type === 'joined') {
      // Room shares I'm a participant in (but didn't create)
      joinedShares = await RoomSharing.find({
        'currentParticipants.user': userId,
        initiator: { $ne: userId }
      })
        .populate('property', 'title location images amenities rent')
        .populate('initiator', 'fullName email profilePhoto')
        .populate('currentParticipants.user', 'fullName email profilePhoto')
        .sort({ createdAt: -1 })
        .lean();
    }

    if (!type || type === 'applied') {
      // Room shares I've applied to
      const sharesWithMyApplications = await RoomSharing.find({
        'applications.applicant': userId
      })
        .populate('property', 'title location images amenities rent')
        .populate('initiator', 'fullName email profilePhoto')
        .sort({ createdAt: -1 })
        .lean();

      // Filter to only show my application details
      myApplications = sharesWithMyApplications.map(share => {
        const myApp = share.applications.find(
          (app: any) => app.applicant.toString() === userId.toString()
        );

        return {
          _id: share._id,
          property: share.property,
          initiator: share.initiator,
          status: share.status,
          costSharing: share.costSharing,
          requirements: share.requirements,
          maxParticipants: share.maxParticipants,
          currentParticipantsCount: share.currentParticipants.filter(
            (p: any) => p.status === 'confirmed'
          ).length,
          myApplication: myApp,
          createdAt: share.createdAt
        };
      });
    }

    // Calculate statistics
    const stats = {
      created: !type || type === 'created' ? myShares.length :
        await RoomSharing.countDocuments({ initiator: userId }),

      joined: !type || type === 'joined' ? joinedShares.length :
        await RoomSharing.countDocuments({
          'currentParticipants.user': userId,
          initiator: { $ne: userId }
        }),

      applied: !type || type === 'applied' ? myApplications.length :
        await RoomSharing.countDocuments({
          'applications.applicant': userId
        }),

      pendingApplications: await RoomSharing.countDocuments({
        initiator: userId,
        'applications.status': 'pending'
      }),

      activeShares: await RoomSharing.countDocuments({
        $or: [
          { initiator: userId },
          { 'currentParticipants.user': userId }
        ],
        status: 'active'
      })
    };

    return NextResponse.json({
      success: true,
      data: {
        created: myShares,
        joined: joinedShares,
        applied: myApplications,
        statistics: stats
      }
    });

  } catch (error: any) {
    console.error('Error fetching my room shares:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch your room shares'
    }, { status: 500 });
  }
}
