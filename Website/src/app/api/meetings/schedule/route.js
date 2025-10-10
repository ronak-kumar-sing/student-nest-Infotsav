import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Meeting from '@/lib/models/Meeting';
import Room from '@/lib/models/Room';
import User from '@/lib/models/User';
import { verifyAccessToken } from '@/lib/utils/jwt';

export async function POST(request) {
  try {
    await connectDB();

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please login' },
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

    const body = await request.json();
    const {
      propertyId,
      meetingType,      // 'physical' or 'virtual'
      requestedDate,
      requestedTime,
      message,          // Optional message from student
      meetingLink,      // Optional - for virtual meetings
      numberOfStudents, // Optional - how many students will visit
      studentEmail      // Optional - student email for confirmation
    } = body;

    // Validation - only propertyId, date and time are required
    if (!propertyId || !requestedDate || !requestedTime) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: propertyId, requestedDate, requestedTime' },
        { status: 400 }
      );
    }

    // Validate and set meetingType - default to 'physical'
    const validMeetingType = meetingType === 'virtual' ? 'virtual' : 'physical';

    // Check if meeting time is in the future
    const meetingDateTime = new Date(`${requestedDate}T${requestedTime}`);
    if (meetingDateTime <= new Date()) {
      return NextResponse.json(
        { success: false, error: 'Meeting time must be in the future' },
        { status: 400 }
      );
    }

    // Verify student exists
    const student = await User.findById(decoded.userId);
    if (!student || (student.role !== 'student' && student.role !== 'Student')) {
      return NextResponse.json(
        { success: false, error: 'Only students can schedule visits' },
        { status: 403 }
      );
    }

    // Verify room exists and get owner
    const room = await Room.findById(propertyId).populate('owner');
    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    // Create new meeting request
    const meetingData = {
      property: propertyId,
      student: decoded.userId,
      owner: room.owner._id,
      meetingType: validMeetingType,
      preferredDates: [meetingDateTime],
      status: 'pending',
      purpose: 'property_viewing',
      studentNotes: message || '',
    };

    // Add virtual meeting details if it's a virtual meeting
    if (validMeetingType === 'virtual' && meetingLink) {
      meetingData.virtualMeetingDetails = {
        platform: 'google_meet', // or detect from link
        meetingLink: meetingLink
      };
    }

    const meeting = await Meeting.create(meetingData);

    await meeting.populate([
      { path: 'property', select: 'title location images' },
      { path: 'student', select: 'fullName phone email' },
      { path: 'owner', select: 'fullName phone email' }
    ]);

    return NextResponse.json({
      success: true,
      data: meeting,
      message: 'Visit request sent successfully! The owner will respond soon.'
    });

  } catch (error) {
    console.error('Error creating meeting request:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    await connectDB();

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const filter = {};

    // Filter by user role
    const user = await User.findById(decoded.userId);
    if (user.role === 'student' || user.role === 'Student') {
      filter.student = decoded.userId;
    } else if (user.role === 'owner' || user.role === 'Owner') {
      filter.owner = decoded.userId;
    }

    const meetings = await Meeting.find(filter)
      .populate('property', 'title location images')
      .populate('student', 'fullName phone email')
      .populate('owner', 'fullName phone email')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: meetings
    });

  } catch (error) {
    console.error('Error fetching meeting requests:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
