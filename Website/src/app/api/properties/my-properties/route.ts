import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Room from '@/lib/models/Room';
import { verifyAccessToken } from '@/lib/utils/jwt';

// Helper function to verify JWT token and get user
async function getAuthenticatedUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'No valid authorization header found' };
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded || !decoded.userId) {
      return { error: 'Invalid token payload' };
    }

    return { userId: decoded.userId, role: decoded.role };
  } catch (error) {
    console.error('Authentication error:', error);
    return { error: 'Invalid or expired token' };
  }
}

// GET /api/properties/my-properties - Get owner's properties
export async function GET(request: NextRequest) {
  try {
    const { userId, role, error } = await getAuthenticatedUser(request);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error,
        },
        { status: 401 }
      );
    }

    if (role?.toLowerCase() !== 'owner') {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Owner access required',
        },
        { status: 403 }
      );
    }

    await connectDB();

    // Get all properties owned by this user
    const properties = await Room.find({ owner: userId })
      .populate('owner', 'fullName email isVerified')
      .sort({ createdAt: -1 })
      .lean();

    // Transform properties for frontend
    const formattedProperties = properties.map((property: any) => ({
      _id: property._id,
      title: property.title,
      description: property.description,
      price: property.price,
      roomType: property.roomType,
      accommodationType: property.accommodationType,
      location: property.location,
      images: property.images || [],
      amenities: property.amenities || [],
      features: property.features || {},
      availability: property.availability || { isAvailable: true, availableFrom: new Date() },
      status: property.status || 'active',
      totalRooms: property.totalRooms || 1,
      occupiedRooms: property.occupiedRooms || 0,
      rating: property.rating || 0,
      totalReviews: property.totalReviews || 0,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        properties: formattedProperties,
        total: formattedProperties.length,
      },
    });
  } catch (error) {
    console.error('Error fetching owner properties:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch properties',
      },
      { status: 500 }
    );
  }
}

// PATCH /api/properties/my-properties - Update property status (activate/deactivate)
export async function PATCH(request: NextRequest) {
  try {
    const { userId, role, error } = await getAuthenticatedUser(request);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error,
        },
        { status: 401 }
      );
    }

    if (role?.toLowerCase() !== 'owner') {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Owner access required',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { propertyId, action, status } = body;

    if (!propertyId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Property ID is required',
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the property and verify ownership
    const property = await Room.findOne({ _id: propertyId, owner: userId });

    if (!property) {
      return NextResponse.json(
        {
          success: false,
          error: 'Property not found or you do not have permission to modify it',
        },
        { status: 404 }
      );
    }

    // Handle different actions
    let updateData: any = {};
    let message = '';

    switch (action) {
      case 'deactivate':
        updateData = {
          status: 'inactive',
          'availability.isAvailable': false,
        };
        message = 'Property deactivated successfully';
        break;

      case 'activate':
        updateData = {
          status: 'active',
          'availability.isAvailable': true,
        };
        message = 'Property activated successfully';
        break;

      case 'updateStatus':
        if (!status || !['active', 'inactive', 'pending'].includes(status)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid status. Must be active, inactive, or pending',
            },
            { status: 400 }
          );
        }
        updateData = {
          status,
          'availability.isAvailable': status === 'active',
        };
        message = `Property status updated to ${status}`;
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action. Must be activate, deactivate, or updateStatus',
          },
          { status: 400 }
        );
    }

    // Update the property
    const updatedProperty = await Room.findByIdAndUpdate(propertyId, updateData, {
      new: true,
      runValidators: true,
    });

    return NextResponse.json({
      success: true,
      message,
      data: {
        property: {
          _id: updatedProperty!._id,
          title: updatedProperty!.title,
          status: updatedProperty!.status,
          availability: updatedProperty!.availability,
        },
      },
    });
  } catch (error) {
    console.error('Error updating property status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update property status',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/properties/my-properties - Delete a property
export async function DELETE(request: NextRequest) {
  try {
    const { userId, role, error } = await getAuthenticatedUser(request);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error,
        },
        { status: 401 }
      );
    }

    if (role?.toLowerCase() !== 'owner') {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Owner access required',
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');

    if (!propertyId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Property ID is required',
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the property and verify ownership
    const property = await Room.findOne({ _id: propertyId, owner: userId });

    if (!property) {
      return NextResponse.json(
        {
          success: false,
          error: 'Property not found or you do not have permission to delete it',
        },
        { status: 404 }
      );
    }

    // Check if there are active bookings
    // TODO: Add booking check when implementing booking management
    // const Booking = mongoose.model('Booking');
    // const activeBookings = await Booking.countDocuments({
    //   room: propertyId,
    //   status: { $in: ['confirmed', 'active'] }
    // });
    // if (activeBookings > 0) {
    //   return NextResponse.json({
    //     success: false,
    //     error: 'Cannot delete property with active bookings.'
    //   }, { status: 400 });
    // }

    // Delete the property
    await Room.findByIdAndDelete(propertyId);

    return NextResponse.json({
      success: true,
      message: 'Property deleted successfully',
      data: {
        deletedPropertyId: propertyId,
      },
    });
  } catch (error) {
    console.error('Error deleting property:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete property',
      },
      { status: 500 }
    );
  }
}
