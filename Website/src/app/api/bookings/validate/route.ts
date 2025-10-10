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

// POST: Validate if user can book a room
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const body = await request.json();

    const { roomId, userId } = body;

    if (!roomId) {
      return NextResponse.json({
        success: false,
        error: 'Room ID is required'
      }, { status: 400 });
    }

    // Use userId from body if provided, otherwise use decoded userId
    const targetUserId = userId || decoded.userId;

    // Verify user exists
    const user = await User.findById(targetUserId);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
        data: { canBook: false }
      }, { status: 404 });
    }

    // Only students can book
    if (user.role !== 'student' && user.role !== 'Student') {
      return NextResponse.json({
        success: false,
        error: 'Only students can book rooms',
        data: { canBook: false }
      }, { status: 403 });
    }

    // Verify room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return NextResponse.json({
        success: false,
        error: 'Room not found',
        data: { canBook: false }
      }, { status: 404 });
    }

    // Check room availability
    if (!room.availability.isAvailable || room.availability.availableRooms <= 0) {
      return NextResponse.json({
        success: true,
        data: {
          canBook: false,
          reason: 'Room is not currently available'
        }
      });
    }

    // Check if student has active bookings
    const activeBookings = await Booking.find({
      student: targetUserId,
      status: { $in: ['pending', 'confirmed', 'active'] }
    });

    if (activeBookings.length > 0) {
      const today = new Date();
      const activeBooking = activeBookings.find(booking => {
        if (!booking.moveOutDate) return false;
        const moveOutDate = new Date(booking.moveOutDate);
        return moveOutDate > today && booking.paymentStatus !== 'failed';
      });

      if (activeBooking) {
        return NextResponse.json({
          success: true,
          data: {
            canBook: false,
            reason: 'You already have an active booking',
            currentBookingId: activeBooking._id,
            currentBookingExpires: activeBooking.moveOutDate
          }
        });
      }
    }

    // Check if student already has a booking for this specific room
    const existingRoomBooking = await Booking.findOne({
      room: roomId,
      student: targetUserId,
      status: { $in: ['pending', 'confirmed', 'active'] }
    });

    if (existingRoomBooking) {
      return NextResponse.json({
        success: true,
        data: {
          canBook: false,
          reason: 'You already have a booking for this room',
          bookingId: existingRoomBooking._id
        }
      });
    }

    // All checks passed
    return NextResponse.json({
      success: true,
      data: {
        canBook: true,
        reason: 'You can book this room'
      }
    });

  } catch (error: any) {
    console.error('Error validating booking:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to validate booking',
      data: { canBook: false }
    }, { status: 500 });
  }
}
