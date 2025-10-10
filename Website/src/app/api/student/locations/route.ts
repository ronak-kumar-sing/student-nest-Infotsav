import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import User from '@/lib/models/User';
import { verifyAccessToken } from '@/lib/utils/jwt';

// Helper function to verify authentication
async function getAuthenticatedUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'No valid authorization header found' };
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    if (!decoded || !decoded.userId) {
      return { error: 'Invalid token payload' };
    }

    return { userId: decoded.userId, role: decoded.role };
  } catch (error) {
    console.error('Authentication error:', error);
    return { error: 'Invalid or expired token' };
  }
}

// GET: Get student's preferred locations
export async function GET(request: NextRequest) {
  try {
  const authResult = await getAuthenticatedUser(request);
  if ('error' in authResult) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
  }

  const { userId, role } = authResult;
  if (role?.toLowerCase() !== 'student') {
    return NextResponse.json({
      success: false,
      error: 'Only students can access this endpoint'
    }, { status: 403 });
  }    await connectDB();

    const user = await User.findById(userId).select('preferredLocations currentLocation');

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        preferredLocations: user.preferredLocations || [],
        currentLocation: user.currentLocation || null
      }
    });

  } catch (error: any) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch locations'
    }, { status: 500 });
  }
}

// POST: Add a new preferred location
export async function POST(request: NextRequest) {
  try {
    const { userId, role, error } = await getAuthenticatedUser(request);

    if (error) {
      return NextResponse.json({
        success: false,
        error
      }, { status: 401 });
    }

    if (role?.toLowerCase() !== 'student') {
      return NextResponse.json({
        success: false,
        error: 'Only students can add preferred locations'
      }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { address, city, coordinates, radius = 5 } = body;

    // Validation
    if (!address || !city || !coordinates || !coordinates.lat || !coordinates.lng) {
      return NextResponse.json({
        success: false,
        error: 'Address, city, and coordinates are required'
      }, { status: 400 });
    }

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Check if user already has 3 locations
    if (user.preferredLocations && user.preferredLocations.length >= 3) {
      return NextResponse.json({
        success: false,
        error: 'Maximum 3 preferred locations allowed. Please delete one to add a new location.'
      }, { status: 400 });
    }

    // Add new location
    const newLocation = {
      address,
      city,
      coordinates: {
        lat: parseFloat(coordinates.lat),
        lng: parseFloat(coordinates.lng)
      },
      radius: parseInt(radius) || 5,
      addedAt: new Date()
    };

    if (!user.preferredLocations) {
      user.preferredLocations = [];
    }

    user.preferredLocations.push(newLocation as any);
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Location added successfully',
      data: {
        preferredLocations: user.preferredLocations
      }
    });

  } catch (error: any) {
    console.error('Error adding location:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to add location'
    }, { status: 500 });
  }
}

// DELETE: Remove a preferred location
export async function DELETE(request: NextRequest) {
  try {
    const { userId, role, error } = await getAuthenticatedUser(request);

    if (error) {
      return NextResponse.json({
        success: false,
        error
      }, { status: 401 });
    }

    if (role?.toLowerCase() !== 'student') {
      return NextResponse.json({
        success: false,
        error: 'Only students can delete preferred locations'
      }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const index = searchParams.get('index');

    if (index === null) {
      return NextResponse.json({
        success: false,
        error: 'Location index is required'
      }, { status: 400 });
    }

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    const locationIndex = parseInt(index);

    if (!user.preferredLocations || locationIndex < 0 || locationIndex >= user.preferredLocations.length) {
      return NextResponse.json({
        success: false,
        error: 'Invalid location index'
      }, { status: 400 });
    }

    // Remove location
    user.preferredLocations.splice(locationIndex, 1);
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Location removed successfully',
      data: {
        preferredLocations: user.preferredLocations
      }
    });

  } catch (error: any) {
    console.error('Error deleting location:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete location'
    }, { status: 500 });
  }
}

// PATCH: Update current location
export async function PATCH(request: NextRequest) {
  try {
    const { userId, role, error } = await getAuthenticatedUser(request);

    if (error) {
      return NextResponse.json({
        success: false,
        error
      }, { status: 401 });
    }

    if (role?.toLowerCase() !== 'student') {
      return NextResponse.json({
        success: false,
        error: 'Only students can update current location'
      }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { coordinates } = body;

    if (!coordinates || !coordinates.lat || !coordinates.lng) {
      return NextResponse.json({
        success: false,
        error: 'Coordinates are required'
      }, { status: 400 });
    }

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Update current location
    user.currentLocation = {
      coordinates: {
        lat: parseFloat(coordinates.lat),
        lng: parseFloat(coordinates.lng)
      },
      lastUpdated: new Date()
    } as any;

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Current location updated successfully',
      data: {
        currentLocation: user.currentLocation
      }
    });

  } catch (error: any) {
    console.error('Error updating current location:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update current location'
    }, { status: 500 });
  }
}
