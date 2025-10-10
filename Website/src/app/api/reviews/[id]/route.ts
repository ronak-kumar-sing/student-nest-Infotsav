import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Review from '@/lib/models/Review';
import Room from '@/lib/models/Room';
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

// GET: Fetch single review by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id: reviewId } = await params;

    // Fetch review
    const review = await Review.findById(reviewId)
      .populate('student', 'fullName profilePhoto')
      .populate('property', 'title location images');

    if (!review) {
      return NextResponse.json({
        success: false,
        error: 'Review not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        review
      }
    });

  } catch (error: any) {
    console.error('Error fetching review:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch review'
    }, { status: 500 });
  }
}

// PUT: Update review
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const { id: reviewId } = await params;
    const body = await request.json();

    // Fetch review
    const review = await Review.findById(reviewId);

    if (!review) {
      return NextResponse.json({
        success: false,
        error: 'Review not found'
      }, { status: 404 });
    }

    // Verify user owns this review
    const reviewStudent = (review.student as any)?.toString();

    if (reviewStudent !== decoded.userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized to update this review'
      }, { status: 403 });
    }

    // Update fields
    if (body.rating !== undefined) {
      if (body.rating < 1 || body.rating > 5) {
        return NextResponse.json({
          success: false,
          error: 'Rating must be between 1 and 5'
        }, { status: 400 });
      }
      (review as any).overallRating = body.rating;
    }

    if (body.comment !== undefined) {
      (review as any).comment = body.comment;
    }

    if (body.categories) {
      (review as any).categories = {
        cleanliness: body.categories.cleanliness || (review as any).categories?.cleanliness || body.rating,
        location: body.categories.location || (review as any).categories?.location || body.rating,
        facilities: body.categories.facilities || (review as any).categories?.facilities || body.rating,
        owner: body.categories.owner || (review as any).categories?.owner || body.rating,
        value: body.categories.value || (review as any).categories?.value || body.rating
      };
    }

    await review.save();

    // Recalculate room rating
    const roomId = (review as any).property;
    const reviews = await Review.find({ property: roomId });
    const totalRating = reviews.reduce((sum, r: any) => sum + (r.overallRating || 0), 0);
    const averageRating = totalRating / reviews.length;

    await Room.findByIdAndUpdate(roomId, {
      rating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length
    });

    // Populate for response
    await review.populate('student', 'fullName profilePhoto');

    return NextResponse.json({
      success: true,
      message: 'Review updated successfully',
      data: {
        review: {
          _id: review._id,
          rating: (review as any).overallRating,
          comment: (review as any).comment,
          student: review.student,
          updatedAt: (review as any).updatedAt
        }
      }
    });

  } catch (error: any) {
    console.error('Error updating review:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update review'
    }, { status: 500 });
  }
}

// DELETE: Delete review
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const { id: reviewId } = await params;

    // Fetch review
    const review = await Review.findById(reviewId);

    if (!review) {
      return NextResponse.json({
        success: false,
        error: 'Review not found'
      }, { status: 404 });
    }

    // Verify user owns this review
    const reviewStudent = (review.student as any)?.toString();

    if (reviewStudent !== decoded.userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized to delete this review'
      }, { status: 403 });
    }

    const roomId = (review as any).property;

    // Delete review
    await Review.findByIdAndDelete(reviewId);

    // Recalculate room rating
    const reviews = await Review.find({ property: roomId });
    const totalRating = reviews.reduce((sum, r: any) => sum + (r.overallRating || 0), 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    await Room.findByIdAndUpdate(roomId, {
      rating: reviews.length > 0 ? Math.round(averageRating * 10) / 10 : 0,
      totalReviews: reviews.length
    });

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting review:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to delete review'
    }, { status: 500 });
  }
}
