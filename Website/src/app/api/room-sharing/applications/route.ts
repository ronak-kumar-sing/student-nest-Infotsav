import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/db/connection';
import RoomSharingApplication from '../../../../lib/models/RoomSharingApplication';
import RoomSharing from '../../../../lib/models/RoomSharing';
import { verifyAccessToken } from '../../../../lib/utils/jwt';

// GET: Get user's room sharing applications
export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // 'sent', 'received', 'all'
    const status = searchParams.get('status'); // 'pending', 'accepted', 'rejected'

    await connectDB();

    let applications = [];

    if (type === 'sent' || type === 'all') {
      // Applications sent by this user
      const sentQuery: any = { applicant: userId };
      if (status) sentQuery.status = status;

      const sentApplications = await RoomSharingApplication.find(sentQuery)
        .populate('roomSharing', 'totalBeds bedsAvailable monthlyRent securityDeposit')
        .populate({
          path: 'roomSharing',
          populate: {
            path: 'property',
            select: 'title location images roomType'
          }
        })
        .populate({
          path: 'roomSharing',
          populate: {
            path: 'initiator',
            select: 'fullName email phone profilePhoto'
          }
        })
        .sort({ createdAt: -1 });

      applications.push(...sentApplications.map((app: any) => ({
        ...app.toObject(),
        type: 'sent',
        counterparty: (app.roomSharing as any)?.initiator
      })));
    }

    if (type === 'received' || type === 'all') {
      // Applications received for user's room sharing posts
      const userRoomShares = await RoomSharing.find({ initiator: userId }).select('_id');
      const roomShareIds = userRoomShares.map(rs => rs._id);

      const receivedQuery: any = { roomSharing: { $in: roomShareIds } };
      if (status) receivedQuery.status = status;

      const receivedApplications = await RoomSharingApplication.find(receivedQuery)
        .populate('roomSharing', 'totalBeds bedsAvailable monthlyRent securityDeposit')
        .populate({
          path: 'roomSharing',
          populate: {
            path: 'property',
            select: 'title location images roomType'
          }
        })
        .populate('applicant', 'fullName email phone profilePhoto collegeId course yearOfStudy')
        .sort({ createdAt: -1 });

      applications.push(...receivedApplications.map((app: any) => ({
        ...app.toObject(),
        type: 'received',
        counterparty: app.applicant
      })));
    }

    // Sort by creation date (newest first)
    applications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: {
        applications,
        summary: {
          total: applications.length,
          sent: applications.filter(a => a.type === 'sent').length,
          received: applications.filter(a => a.type === 'received').length,
          pending: applications.filter(a => a.status === 'pending').length,
          accepted: applications.filter(a => a.status === 'accepted').length,
          rejected: applications.filter(a => a.status === 'rejected').length
        }
      }
    });

  } catch (error: any) {
    console.error('Get applications error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

// POST: Apply for room sharing
export async function POST(request: NextRequest) {
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
    const { roomSharingId, message, studyHabits, lifestyle } = body;

    if (!roomSharingId) {
      return NextResponse.json(
        { success: false, error: 'Room sharing ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify room sharing exists and is active
    const roomSharing = await RoomSharing.findById(roomSharingId)
      .populate('initiator', 'fullName');

    if (!roomSharing) {
      return NextResponse.json(
        { success: false, error: 'Room sharing not found' },
        { status: 404 }
      );
    }

    if (roomSharing.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'This room sharing is no longer active' },
        { status: 400 }
      );
    }

    // Check if user is trying to apply to their own post
    const initiatorId = typeof roomSharing.initiator === 'object'
      ? (roomSharing.initiator as any)._id
      : roomSharing.initiator;

    if (initiatorId.toString() === userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot apply to your own room sharing post' },
        { status: 400 }
      );
    }

    // Check if user already applied
    const existingApplication = await RoomSharingApplication.findOne({
      roomSharing: roomSharingId,
      applicant: userId
    });

    if (existingApplication) {
      return NextResponse.json(
        { success: false, error: 'You have already applied to this room sharing' },
        { status: 400 }
      );
    }

    // Create new application
    const application = new RoomSharingApplication({
      roomSharing: roomSharingId,
      applicant: userId,
      message: message || '',
      studyHabits: studyHabits || '',
      lifestyle: lifestyle || '',
      status: 'pending'
    });

    await application.save();

    // Populate the created application for response
    const populatedApplication = await RoomSharingApplication.findById(application._id)
      .populate('roomSharing', 'totalBeds bedsAvailable monthlyRent')
      .populate({
        path: 'roomSharing',
        populate: {
          path: 'property',
          select: 'title location'
        }
      })
      .populate('applicant', 'fullName email');

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      data: populatedApplication
    });

  } catch (error: any) {
    console.error('Apply for room sharing error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit application' },
      { status: 500 }
    );
  }
}