import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/connection';
import User from '@/lib/models/User';
import Student from '@/lib/models/Student';
import Room from '@/lib/models/Room';
import { verifyAccessToken } from '@/lib/utils/jwt';

// Helper function to verify JWT token
async function verifyToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded) {
      throw new Error('Invalid token');
    }

    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// GET - Get all saved rooms for the user
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const userId = decoded.userId;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID is required',
        },
        { status: 400 }
      );
    }

    // Get user and their saved rooms
    const user = await User.findById(userId).select('role');
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    let savedRoomIds: string[] = [];

    // For students, use savedProperties field
    if (user.role === 'Student' || user.role === 'student') {
      const student = await Student.findById(userId).select('savedProperties');
      savedRoomIds = (student as any)?.savedProperties || [];
    } else {
      // For other users, check if they have a savedRooms field
      const userWithSaved = await User.findById(userId).select('savedRooms');
      savedRoomIds = (userWithSaved as any)?.savedRooms || [];
    }

    // Populate saved rooms with full room details
    const savedRooms = await Room.find({
      _id: { $in: savedRoomIds },
    })
      .populate('owner', 'fullName email phone profilePhoto isVerified')
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        savedRooms: savedRooms.map((room: any) => ({
          id: room._id,
          title: room.title,
          description: room.description,
          images: room.images,
          price: room.price,
          location: room.location,
          amenities: room.amenities,
          features: room.features,
          rating: room.rating,
          totalReviews: room.totalReviews || 0,
          availability: room.availability,
          roomType: room.roomType,
          accommodationType: room.accommodationType,
          owner: {
            id: room.owner._id,
            name: room.owner.fullName,
            email: room.owner.email,
            phone: room.owner.phone,
            profilePhoto: room.owner.profilePhoto,
            verified: room.owner.isVerified,
          },
        })),
        total: savedRooms.length,
      },
    });
  } catch (error) {
    console.error('Get saved rooms error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch saved rooms',
      },
      { status: 500 }
    );
  }
}

// POST - Add room to saved rooms
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const userId = decoded.userId;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID is required',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { roomId } = body;

    if (!roomId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Room ID is required',
        },
        { status: 400 }
      );
    }

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid room ID format',
        },
        { status: 400 }
      );
    }

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return NextResponse.json(
        {
          success: false,
          error: 'Room not found',
        },
        { status: 404 }
      );
    }

    // Get user to determine the role
    const user = await User.findById(userId).select('role');
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    let savedList: string[] = [];

    // Add room to appropriate saved list based on user role
    if (user.role === 'Student' || user.role === 'student') {
      // For students, use savedProperties in Student model
      const updatedStudent = await Student.findByIdAndUpdate(
        userId,
        { $addToSet: { savedProperties: new mongoose.Types.ObjectId(roomId) } },
        { new: true, upsert: false }
      ).select('savedProperties');

      savedList = (updatedStudent as any)?.savedProperties || [];
    } else {
      // For other users, use savedRooms in User model
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { savedRooms: new mongoose.Types.ObjectId(roomId) } },
        { new: true }
      ).select('savedRooms');

      savedList = (updatedUser as any)?.savedRooms || [];
    }

    return NextResponse.json({
      success: true,
      message: 'Room saved successfully',
      data: {
        savedRoomsCount: savedList.length,
        isSaved: true,
      },
    });
  } catch (error) {
    console.error('Save room error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save room',
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove room from saved rooms
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const userId = decoded.userId;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID is required',
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Room ID is required',
        },
        { status: 400 }
      );
    }

    // Get user to determine the role
    const user = await User.findById(userId).select('role');
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    let savedList: string[] = [];

    // Remove room from appropriate saved list based on user role
    if (user.role === 'Student' || user.role === 'student') {
      // For students, use savedProperties in Student model
      const updatedStudent = await Student.findByIdAndUpdate(
        userId,
        { $pull: { savedProperties: mongoose.Types.ObjectId.isValid(roomId) ? new mongoose.Types.ObjectId(roomId) : roomId } },
        { new: true }
      ).select('savedProperties');

      savedList = (updatedStudent as any)?.savedProperties || [];
    } else {
      // For other users, use savedRooms in User model
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $pull: { savedRooms: mongoose.Types.ObjectId.isValid(roomId) ? new mongoose.Types.ObjectId(roomId) : roomId } },
        { new: true }
      ).select('savedRooms');

      savedList = (updatedUser as any)?.savedRooms || [];
    }

    return NextResponse.json({
      success: true,
      message: 'Room removed from saved list',
      data: {
        savedRoomsCount: savedList.length,
        isSaved: false,
      },
    });
  } catch (error) {
    console.error('Remove saved room error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove saved room',
      },
      { status: 500 }
    );
  }
}
