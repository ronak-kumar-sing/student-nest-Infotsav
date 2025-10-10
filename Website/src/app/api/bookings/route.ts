import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Booking from '@/lib/models/Booking';
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

// POST: Create a new booking
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['roomId', 'moveInDate', 'duration'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 });
    }

    // Verify student exists
    const student = await User.findById(decoded.userId);
    if (!student || (student.role !== 'student' && student.role !== 'Student')) {
      return NextResponse.json({
        success: false,
        error: 'Only students can create bookings'
      }, { status: 403 });
    }

    // Verify room exists and is available
    const room = await Room.findById(body.roomId).populate('owner');
    if (!room) {
      return NextResponse.json({
        success: false,
        error: 'Room not found'
      }, { status: 404 });
    }

    if (!room.availability.isAvailable || room.availability.availableRooms <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Room is not available for booking'
      }, { status: 409 });
    }

    // Check if student has any active bookings (ONE ROOM PER STUDENT RULE)
    const activeStudentBookings = await Booking.find({
      student: decoded.userId,
      status: { $in: ['pending', 'confirmed', 'active'] }
    });

    if (activeStudentBookings.length > 0) {
      const today = new Date();
      const activeBooking = activeStudentBookings.find(booking => {
        if (!booking.moveOutDate) return false;
        const moveOutDate = new Date(booking.moveOutDate);
        return moveOutDate > today && booking.paymentStatus !== 'failed';
      });

      if (activeBooking) {
        return NextResponse.json({
          success: false,
          error: 'You already have an active booking. One student can only book one room at a time.',
          data: {
            currentBookingId: activeBooking._id,
            currentBookingExpires: activeBooking.moveOutDate
          }
        }, { status: 409 });
      }
    }

    // Validate move-in date
    const moveInDate = new Date(body.moveInDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (moveInDate < today) {
      return NextResponse.json({
        success: false,
        error: 'Move-in date cannot be in the past'
      }, { status: 400 });
    }

    // Calculate move-out date based on duration
    const moveOutDate = new Date(moveInDate);
    moveOutDate.setMonth(moveOutDate.getMonth() + body.duration);

    // Calculate financial details
    const monthlyRent = room.price;
    const securityDeposit = body.securityDeposit || room.securityDeposit || monthlyRent;
    const maintenanceCharges = body.maintenanceCharges || room.maintenanceCharges || 0;
    const totalAmount = monthlyRent + securityDeposit + maintenanceCharges;

    // Create booking
    const booking = await Booking.create({
      room: body.roomId,
      student: decoded.userId,
      owner: (room.owner as any)._id,
      moveInDate,
      moveOutDate,
      duration: body.duration,
      monthlyRent,
      securityDeposit,
      maintenanceCharges,
      totalAmount,
      agreementType: body.agreementType || 'monthly',
      studentNotes: body.notes || body.specialRequests || '',
      isUrgent: body.isUrgent || false,
      priority: body.isUrgent ? 'high' : 'medium'
    });

    // Update room availability
    await Room.findByIdAndUpdate(body.roomId, {
      $inc: { 'availability.availableRooms': -1 },
      $set: {
        'availability.isAvailable': room.availability.availableRooms > 1
      }
    });

    // Populate booking for response
    await booking.populate([
      { path: 'room', select: 'title location images price amenities features' },
      { path: 'student', select: 'fullName phone email profilePhoto' },
      { path: 'owner', select: 'fullName phone email profilePhoto' }
    ]);

    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      data: {
        booking: {
          _id: booking._id,
          status: booking.status,
          room: booking.room,
          student: booking.student,
          owner: booking.owner,
          moveInDate: booking.moveInDate,
          moveOutDate: booking.moveOutDate,
          duration: booking.duration,
          monthlyRent: booking.monthlyRent,
          securityDeposit: booking.securityDeposit,
          totalAmount: booking.totalAmount,
          paymentStatus: booking.paymentStatus
        }
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating booking:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to create booking'
    }, { status: 500 });
  }
}

// GET: Fetch bookings for user
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
      if (status === 'active') {
        query.status = { $in: ['confirmed', 'active'] };
      } else {
        query.status = status;
      }
    }

    // Execute query
    const [bookings, totalCount] = await Promise.all([
      Booking.find(query)
        .populate('room', 'title location images price amenities features')
        .populate('student', 'fullName phone email profilePhoto')
        .populate('owner', 'fullName phone email profilePhoto')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      data: {
        bookings,
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
    console.error('Error fetching bookings:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch bookings'
    }, { status: 500 });
  }
}
