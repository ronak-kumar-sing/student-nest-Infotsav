import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/db/connection';
import Student from '../../../../lib/models/Student';
import { verifyAccessToken } from '../../../../lib/utils/jwt';
import { z } from 'zod';

// Validation schema for student profile updates
const studentProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().regex(/^\+?\d{10,15}$/).optional(),
  collegeId: z.string().min(1).optional(),
  collegeName: z.string().min(1).optional(),
  course: z.string().optional(),
  yearOfStudy: z.union([
    z.number().min(1).max(6),
    z.string().transform((val) => {
      // Convert string like "3rd" to number 3
      const match = val.match(/(\d+)/);
      return match ? parseInt(match[1]) : parseInt(val);
    }).pipe(z.number().min(1).max(6))
  ]).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  profilePhoto: z.string().url().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  // Student preferences
  preferences: z.object({
    budgetMin: z.number().optional(),
    budgetMax: z.number().optional(),
    preferredLocations: z.array(z.string()).optional(),
    roomType: z.string().optional(),
    occupancyType: z.string().optional(),
    amenities: z.array(z.string()).optional(),
    petFriendly: z.boolean().optional(),
    smokingAllowed: z.boolean().optional(),
    couplesAllowed: z.boolean().optional(),
    vegetarianOnly: z.boolean().optional(),
    roomTypePreference: z.array(z.string()).optional(),
    locationPreferences: z.array(z.string()).optional(),
    amenityPreferences: z.array(z.string()).optional(),
  }).optional(),
  // Notification and privacy settings
  notificationSettings: z.any().optional(),
  privacySettings: z.any().optional(),
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

    if (!decoded || !decoded.userId || decoded.role?.toLowerCase() !== 'student') {
      return { error: 'Invalid token or unauthorized access' };
    }

    await connectDB();
    const user = await Student.findById(decoded.userId);

    if (!user) {
      return { error: 'User not found' };
    }

    return { user };
  } catch (error: any) {
    console.error('Authentication error:', error);
    return { error: 'Invalid or expired token' };
  }
}

// GET /api/profile/student - Get student profile
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request);

    if (error) {
      return NextResponse.json({
        success: false,
        error
      }, { status: 401 });
    }

    // Calculate profile completeness
    const profileFields = [
      user.fullName,
      user.email,
      user.phone,
      user.collegeId,
      user.collegeName,
      user.course,
      user.yearOfStudy,
      user.city,
      user.state,
      user.profilePhoto || user.avatar,
      user.dateOfBirth,
      user.gender
    ];
    const filledFields = profileFields.filter(field => field).length;
    const profileCompleteness = Math.round((filledFields / profileFields.length) * 100);

    // Prepare profile data
    const profileData = {
      _id: user._id,
      fullName: user.fullName,
      firstName: user.fullName?.split(' ')[0] || '',
      lastName: user.fullName?.split(' ').slice(1).join(' ') || '',
      email: user.email,
      phone: user.phone,
      role: user.role,
      collegeId: user.collegeId,
      collegeName: user.collegeName,
      course: user.course,
      yearOfStudy: user.yearOfStudy,
      city: user.city,
      state: user.state,
      bio: user.bio,
      profilePhoto: user.profilePhoto,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      profileCompleteness,
      savedPropertiesCount: user.savedProperties?.length || 0,
      memberSince: user.createdAt,
      lastActive: user.lastActive,
    };

    // Structure response to match frontend expectations
    return NextResponse.json({
      success: true,
      data: {
        profile: profileData,
        verificationStatus: {
          email: user.isEmailVerified,
          phone: user.isPhoneVerified,
          isFullyVerified: user.isEmailVerified && user.isPhoneVerified
        },
        activityStats: {
          savedPropertiesCount: user.savedProperties?.length || 0,
          profileCompleteness,
          lastActive: user.lastActive
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching student profile:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch profile'
    }, { status: 500 });
  }
}

// PUT /api/profile/student - Update student profile
export async function PUT(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request);

    if (error) {
      return NextResponse.json({
        success: false,
        error
      }, { status: 401 });
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = studentProfileSchema.safeParse(body);
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

    // Update last active timestamp
    updateData.lastActive = new Date();

    // Handle firstName/lastName combination
    if (updateData.firstName || updateData.lastName) {
      const firstName = updateData.firstName || user.fullName?.split(' ')[0] || '';
      const lastName = updateData.lastName || user.fullName?.split(' ').slice(1).join(' ') || '';
      updateData.fullName = `${firstName} ${lastName}`.trim();

      // Remove individual fields as they're not stored separately
      delete updateData.firstName;
      delete updateData.lastName;
    }

    // Update the user
    Object.assign(user, updateData);
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        profilePhoto: user.profilePhoto,
        collegeId: user.collegeId,
        collegeName: user.collegeName,
        course: user.course,
        yearOfStudy: user.yearOfStudy,
        city: user.city,
        state: user.state,
        bio: user.bio,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
      }
    });

  } catch (error: any) {
    console.error('Error updating student profile:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update profile'
    }, { status: 500 });
  }
}

// DELETE /api/profile/student - Delete student profile
export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request);
    if (error) {
      return NextResponse.json({
        success: false,
        error
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
    console.log(`Deleting student account: ${user.email} (${user._id})`);

    // Delete the user account
    await User.findByIdAndDelete(user._id);

    return NextResponse.json({
      success: true,
      message: 'Student profile deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting student profile:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete profile'
    }, { status: 500 });
  }
}
