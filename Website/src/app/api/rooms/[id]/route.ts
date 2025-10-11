import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/db/connection';
import Room from '../../../../lib/models/Room';
import Review from '../../../../lib/models/Review';
import { verifyAccessToken } from '../../../../lib/utils/jwt';
import mongoose from 'mongoose';

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Room ID is required',
        },
        { status: 400 }
      );
    }

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid room ID format',
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Find room and populate owner information
    const room = await Room.findById(id).populate('owner', 'fullName email phone profilePhoto isVerified createdAt');

    if (!room) {
      return NextResponse.json(
        {
          success: false,
          error: 'Room not found',
        },
        { status: 404 }
      );
    }

    // Get reviews for this room
    const reviews = await Review.find({ property: id })
      .populate('student', 'fullName profilePhoto')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Format reviews to match frontend expectations
    const formattedReviews = reviews.map((review: any) => ({
      id: review._id,
      userName: review.student?.fullName || 'Anonymous',
      userAvatar: review.student?.profilePhoto,
      rating: review.overallRating,
      comment: review.comment,
      date: new Date(review.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      }),
      verified: review.isVerified,
      helpfulCount: review.helpfulCount,
      stayDuration: review.stayDuration,
      categories: review.categories,
    }));

    // Calculate owner response metrics
    const ownerJoinDate = new Date((room.owner as any).createdAt).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });

    // Format response to match frontend expectations exactly
    const roomData = {
      id: room._id,
      title: room.title,
      description: room.description,
      fullDescription: room.fullDescription || room.description,
      price: room.price,
      securityDeposit: room.securityDeposit,
      images: room.images && room.images.length > 0 ? room.images : ['/api/placeholder/800/600'],
      roomType: room.roomType || 'single',
      accommodationType: room.accommodationType || 'pg',
      maxSharingCapacity: room.maxSharingCapacity || 1,
      rating: room.rating || 0,
      totalReviews: room.totalReviews || formattedReviews.length,
      amenities: room.amenities || [],
      detailedAmenities: room.detailedAmenities || room.amenities || [],

      features: {
        area: room.features?.area || 120,
        floor: room.features?.floor || 2,
        totalFloors: room.features?.totalFloors || 4,
        furnished: room.features?.furnished !== false,
        balcony: room.features?.balcony || false,
        attached_bathroom: room.features?.attached_bathroom || true,
      },

      location: {
        address: room.location?.address,
        fullAddress: room.location?.fullAddress || `${room.location?.address}, ${room.location?.city}, ${room.location?.state} - ${room.location?.pincode}`,
        city: room.location?.city,
        state: room.location?.state,
        pincode: room.location?.pincode,
        coordinates: room.location?.coordinates || { lat: 28.6139, lng: 77.209 },
        nearbyUniversities: room.location?.nearbyUniversities || [],
        nearbyFacilities: room.location?.nearbyFacilities || [],
      },

      availability: {
        isAvailable: room.availability?.isAvailable ?? true,
        availableFrom: room.availability?.availableFrom ? new Date(room.availability.availableFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      },

      owner: {
        id: (room.owner as any)._id,
        name: (room.owner as any).fullName,
        rating: (room.owner as any).averageRating || 4.5,
        verified: (room.owner as any).isVerified || (room.owner as any).isEmailVerified || false,
        responseRate: (room.owner as any).responseRate || 95,
        responseTime: (room.owner as any).responseTime || 'within 2 hours',
        joinedDate: `Joined in ${ownerJoinDate}`,
        email: (room.owner as any).email,
        phone: (room.owner as any).phone,
      },

      reviews: formattedReviews,
    };

    return NextResponse.json({
      success: true,
      data: roomData,
    });
  } catch (error) {
    console.error('Error fetching room details:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch room details',
      },
      { status: 500 }
    );
  }
}

// PUT /api/rooms/[id] - Update room (owner only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const decoded = await verifyToken(request);
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid room ID' },
        { status: 400 }
      );
    }

    await connectDB();

    const room = await Room.findById(id);
    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (room.owner.toString() !== decoded.userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - You can only edit your own properties' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Update the room
    const updatedRoom = await Room.findByIdAndUpdate(
      id,
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('owner', 'fullName email phoneNumber');

    return NextResponse.json({
      success: true,
      message: 'Property updated successfully',
      data: updatedRoom,
    });
  } catch (error: any) {
    console.error('Error updating room:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const details = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details,
        },
        { status: 400 }
      );
    }

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update property' },
      { status: 500 }
    );
  }
}

// DELETE /api/rooms/[id] - Delete room (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const decoded = await verifyToken(request);
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid room ID' },
        { status: 400 }
      );
    }

    await connectDB();

    const room = await Room.findById(id);
    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (room.owner.toString() !== decoded.userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - You can only delete your own properties' },
        { status: 403 }
      );
    }

    await Room.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Property deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting room:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete property' },
      { status: 500 }
    );
  }
}
