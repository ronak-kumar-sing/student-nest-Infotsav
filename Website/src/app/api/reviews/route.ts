import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Review from '@/lib/models/Review';
import Room from '@/lib/models/Room';
import Booking from '@/lib/models/Booking';
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

// POST: Create a new review
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const body = await request.json();

    // Validate required fields
    const { roomId, rating, comment } = body;

    if (!roomId || !rating) {
      return NextResponse.json({
        success: false,
        error: 'Room ID and rating are required'
      }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({
        success: false,
        error: 'Rating must be between 1 and 5'
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

    // Check if user has a completed booking for this room (optional - can be removed for testing)
    // const hasBooking = await Booking.findOne({
    //   room: roomId,
    //   student: decoded.userId,
    //   status: { $in: ['completed', 'active'] }
    // });

    // if (!hasBooking) {
    //   return NextResponse.json({
    //     success: false,
    //     error: 'You can only review rooms you have booked'
    //   }, { status: 403 });
    // }

    // Check if user already reviewed this room
    const existingReview = await Review.findOne({
      property: roomId,  // Model uses 'property' not 'room'
      student: decoded.userId
    });

    if (existingReview) {
      return NextResponse.json({
        success: false,
        error: 'You have already reviewed this room'
      }, { status: 409 });
    }

    // Create review with proper field names matching the model
    const review = await Review.create({
      property: roomId,  // Model uses 'property' not 'room'
      student: decoded.userId,
      overallRating: rating,  // Model uses 'overallRating' not 'rating'
      categories: {
        cleanliness: body.cleanliness || rating,
        location: body.location || rating,
        facilities: body.amenities || body.facilities || rating,
        owner: body.communication || rating,
        value: body.value || rating
      },
      comment: comment || '',
      stayDuration: body.stayDuration || '3 months'  // Required field
    });

    // Update room rating
    const reviews = await Review.find({ property: roomId });
    const totalRating = reviews.reduce((sum, r: any) => sum + (r.overallRating || 0), 0);
    const averageRating = totalRating / reviews.length;

    await Room.findByIdAndUpdate(roomId, {
      rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews: reviews.length
    });

    // Populate review for response
    await review.populate('student', 'fullName profilePhoto');

    return NextResponse.json({
      success: true,
      message: 'Review created successfully',
      data: {
        review: {
          _id: review._id,
          rating: (review as any).overallRating,
          comment: (review as any).comment,
          student: review.student,
          createdAt: (review as any).createdAt
        }
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating review:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to create review'
    }, { status: 500 });
  }
}

// GET: Fetch reviews for a room
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    if (!roomId) {
      return NextResponse.json({
        success: false,
        error: 'Room ID is required'
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

    // Fetch reviews
    const [reviews, totalCount] = await Promise.all([
      Review.find({ property: roomId })  // Model uses 'property' not 'room'
        .populate('student', 'fullName profilePhoto')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments({ property: roomId })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page * limit < totalCount,
          hasPrevPage: page > 1
        },
        summary: {
          averageRating: room.rating || 0,
          totalReviews: room.totalReviews || 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching reviews:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch reviews'
    }, { status: 500 });
  }
}
