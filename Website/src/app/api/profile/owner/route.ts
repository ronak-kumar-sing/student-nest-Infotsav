import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import User from '@/lib/models/User';
import { verifyAccessToken } from '@/lib/utils/jwt';
import { z } from 'zod';

// Validation schema for owner profile updates
const ownerProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^\+?\d{10,15}$/).optional(),
  email: z.string().email().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z.string().max(500).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  bio: z.string().max(500).optional(),
  profilePhoto: z.string().url().optional(),
});

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

    await connectDB();
    const user = await User.findById(decoded.userId);

    if (!user) {
      console.log('User not found with ID:', decoded.userId);
      return { error: 'User not found' };
    }

    // Check if user has owner role
    if (user.role?.toLowerCase() !== 'owner') {
      return { error: 'Unauthorized: Owner access required' };
    }

    if (!user.isActive) {
      return { error: 'User account is inactive' };
    }

    return { user };
  } catch (error: any) {
    console.error('Authentication error:', error);
    return { error: 'Invalid or expired token' };
  }
}

// GET /api/profile/owner - Get owner profile
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request);

    if (error || !user) {
      return NextResponse.json({
        success: false,
        error: error || 'User not found'
      }, { status: 401 });
    }

    // Extract profile data safely
    const profileData = {
      _id: user._id,
      firstName: (user as any).firstName || user.fullName?.split(' ')[0] || '',
      lastName: (user as any).lastName || user.fullName?.split(' ').slice(1).join(' ') || '',
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      dateOfBirth: (user as any).dateOfBirth,
      gender: (user as any).gender,
      address: (user as any).address,
      city: (user as any).city,
      state: (user as any).state,
      bio: (user as any).bio,
      profilePhoto: user.profilePhoto,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      isIdentityVerified: user.isIdentityVerified,
      // Member info
      memberSince: (user as any).createdAt,
      lastActive: (user as any).lastActive
    };

    return NextResponse.json({
      success: true,
      data: profileData
    });

  } catch (error: any) {
    console.error('Error fetching owner profile:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch profile'
    }, { status: 500 });
  }
}

// PUT /api/profile/owner - Update owner profile
export async function PUT(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request);

    if (error || !user) {
      return NextResponse.json({
        success: false,
        error: error || 'User not found'
      }, { status: 401 });
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = ownerProfileSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid data',
        details: validationResult.error.issues
      }, { status: 400 });
    }

    const updateData = validationResult.data as any;

    // Check if phone is being updated and if it's unique
    if (updateData.phone && updateData.phone !== user.phone) {
      const existingUser = await User.findOne({
        phone: updateData.phone,
        _id: { $ne: user._id }
      });

      if (existingUser) {
        return NextResponse.json({
          success: false,
          error: 'Phone number already exists'
        }, { status: 400 });
      }
    }

    // Update firstName and lastName if provided, or extract from fullName
    if (updateData.fullName) {
      const nameParts = updateData.fullName.split(' ');
      updateData.firstName = nameParts[0];
      updateData.lastName = nameParts.slice(1).join(' ') || '';
    }

    // Update the user
    Object.assign(user, updateData);
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: user._id,
        firstName: (user as any).firstName,
        lastName: (user as any).lastName,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        profilePhoto: user.profilePhoto,
        dateOfBirth: (user as any).dateOfBirth,
        gender: (user as any).gender,
        address: (user as any).address,
        city: (user as any).city,
        state: (user as any).state,
        bio: (user as any).bio,
      }
    });

  } catch (error: any) {
    console.error('Error updating owner profile:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update profile'
    }, { status: 500 });
  }
}

// DELETE /api/profile/owner - Delete owner profile
export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request);
    if (error || !user) {
      return NextResponse.json({
        success: false,
        error: error || 'User not found'
      }, { status: 401 });
    }

    // Optional: Add confirmation check
    const url = new URL(request.url);
    const confirmDelete = url.searchParams.get('confirm');

    if (confirmDelete !== 'true') {
      return NextResponse.json({
        success: false,
        error: 'Please confirm account deletion by adding ?confirm=true to the request'
      }, { status: 400 });
    }

    // Log the deletion attempt
    console.log(`Deleting owner account: ${user.email} (${user._id})`);

    // Delete the user account
    await User.findByIdAndDelete(user._id);

    return NextResponse.json({
      success: true,
      message: 'Owner profile deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting owner profile:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete profile'
    }, { status: 500 });
  }
}
