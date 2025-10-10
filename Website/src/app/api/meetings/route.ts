import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Meeting from '@/lib/models/Meeting';
import Room from '@/lib/models/Room';
import User from '@/lib/models/User';
import { verifyAccessToken } from '@/lib/utils/jwt';

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

// POST: Schedule a new meeting
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const body = await request.json();

    // Validate required fields
    const { roomId, ownerId, preferredDates, meetingType, purpose } = body;

    if (!roomId || !ownerId) {
      return NextResponse.json({
        success: false,
        error: 'Room ID and Owner ID are required'
      }, { status: 400 });
    }

    // Verify room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return NextResponse.json({
        success: false,
        error: 'Room not found'
      }, { status: 404 });
    }

    // Verify owner exists
    const owner = await User.findById(ownerId);
    if (!owner || (owner.role !== 'owner' && owner.role !== 'Owner')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid owner'
      }, { status: 404 });
    }

    // Create meeting
    const meeting = await Meeting.create({
      property: roomId,
      student: decoded.userId,
      owner: ownerId,
      preferredDates: preferredDates || [],
      meetingType: meetingType || 'physical',
      purpose: purpose || 'property_viewing',
      studentNotes: body.notes || body.studentNotes || '',
      status: 'pending'
    });

    // Populate meeting for response
    await meeting.populate([
      { path: 'property', select: 'title location images' },
      { path: 'student', select: 'fullName phone email' },
      { path: 'owner', select: 'fullName phone email' }
    ]);

    return NextResponse.json({
      success: true,
      message: 'Meeting scheduled successfully',
      data: {
        meeting: {
          _id: meeting._id,
          status: meeting.status,
          property: meeting.property,
          student: meeting.student,
          owner: meeting.owner,
          preferredDates: meeting.preferredDates,
          meetingType: meeting.meetingType,
          purpose: meeting.purpose,
          createdAt: meeting.createdAt
        }
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error scheduling meeting:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to schedule meeting'
    }, { status: 500 });
  }
}

// GET: Fetch meetings for user
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Get user to determine role
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Build query based on user role
    let query: any = {};

    if (user.role === 'student' || user.role === 'Student') {
      query.student = decoded.userId;
    } else if (user.role === 'owner' || user.role === 'Owner') {
      query.owner = decoded.userId;
    }

    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    // Execute query
    const [meetings, totalCount] = await Promise.all([
      Meeting.find(query)
        .populate('property', 'title location images')
        .populate('student', 'fullName phone email profilePhoto')
        .populate('owner', 'fullName phone email profilePhoto')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Meeting.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      data: {
        meetings,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page * limit < totalCount,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching meetings:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch meetings'
    }, { status: 500 });
  }
}
