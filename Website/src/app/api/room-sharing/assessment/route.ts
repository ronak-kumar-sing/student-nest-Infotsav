/**
 * Room Sharing Compatibility Assessment API
 * Allows students to submit and retrieve compatibility assessments
 * Used for matching compatible roommates
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Student from '@/lib/models/Student';
import { verifyAccessToken } from '@/lib/utils/jwt';

// Compatibility assessment interface
interface ICompatibilityAssessment {
  sleepSchedule: 'early_bird' | 'night_owl' | 'flexible';
  cleanliness: 'very_clean' | 'moderately_clean' | 'relaxed';
  studyHabits: 'silent' | 'quiet' | 'moderate_noise' | 'flexible';
  socialLevel: 'very_social' | 'moderately_social' | 'quiet' | 'prefer_alone';
  cookingFrequency: 'daily' | 'often' | 'sometimes' | 'rarely';
  musicPreference: 'silent' | 'low_volume' | 'moderate' | 'loud';
  guestPolicy: 'no_guests' | 'rare_guests' | 'occasional_guests' | 'frequent_guests';
  smokingTolerance: 'no_smoking' | 'outdoor_only' | 'tolerant';
  petFriendly: 'love_pets' | 'okay_with_pets' | 'no_pets';
  workSchedule: 'regular_hours' | 'flexible' | 'night_shift' | 'student_only';
  sharingPreferences: string[];
  dealBreakers: string[];
}

// Verify user authentication
async function verifyUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { error: 'No token provided', status: 401 };
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded || !decoded.userId) {
      return { error: 'Invalid token', status: 401 };
    }

    await connectDB();
    const user = await Student.findById(decoded.userId);

    if (!user) {
      return { error: 'User not found', status: 404 };
    }

    return { user, userId: decoded.userId };
  } catch (error) {
    return { error: 'Authentication failed', status: 401 };
  }
}

// GET: Retrieve user's compatibility assessment
export async function GET(request: NextRequest) {
  try {
    const verification = await verifyUser(request);
    if ('error' in verification) {
      return NextResponse.json(
        { success: false, error: verification.error },
        { status: verification.status }
      );
    }

    const { user } = verification;

    // Check if assessment exists in user profile
    const assessment = (user as any).compatibilityAssessment;

    if (!assessment) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No assessment found. Please complete your compatibility assessment.'
      });
    }

    return NextResponse.json({
      success: true,
      data: assessment
    });

  } catch (error: any) {
    console.error('Error fetching assessment:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch assessment'
    }, { status: 500 });
  }
}

// POST: Submit/Update compatibility assessment
export async function POST(request: NextRequest) {
  try {
    const verification = await verifyUser(request);
    if ('error' in verification) {
      return NextResponse.json(
        { success: false, error: verification.error },
        { status: verification.status }
      );
    }

    const { user, userId } = verification;
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'sleepSchedule', 'cleanliness', 'studyHabits', 'socialLevel',
      'cookingFrequency', 'musicPreference', 'guestPolicy'
    ];

    const missingFields = requiredFields.filter(field => !body[field]);
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 });
    }

    // Update user's compatibility assessment
    await Student.findByIdAndUpdate(
      userId,
      {
        $set: {
          compatibilityAssessment: {
            sleepSchedule: body.sleepSchedule,
            cleanliness: body.cleanliness,
            studyHabits: body.studyHabits,
            socialLevel: body.socialLevel,
            cookingFrequency: body.cookingFrequency,
            musicPreference: body.musicPreference,
            guestPolicy: body.guestPolicy,
            smokingTolerance: body.smokingTolerance || 'no_smoking',
            petFriendly: body.petFriendly || 'no_pets',
            workSchedule: body.workSchedule || 'student_only',
            sharingPreferences: body.sharingPreferences || [],
            dealBreakers: body.dealBreakers || [],
            completedAt: new Date(),
            lastUpdated: new Date()
          }
        }
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Compatibility assessment saved successfully',
      data: {
        sleepSchedule: body.sleepSchedule,
        cleanliness: body.cleanliness,
        studyHabits: body.studyHabits,
        socialLevel: body.socialLevel,
        cookingFrequency: body.cookingFrequency,
        musicPreference: body.musicPreference,
        guestPolicy: body.guestPolicy,
        smokingTolerance: body.smokingTolerance,
        petFriendly: body.petFriendly,
        workSchedule: body.workSchedule,
        sharingPreferences: body.sharingPreferences,
        dealBreakers: body.dealBreakers
      }
    });

  } catch (error: any) {
    console.error('Error saving assessment:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to save assessment'
    }, { status: 500 });
  }
}

// PUT: Update specific assessment fields
export async function PUT(request: NextRequest) {
  try {
    const verification = await verifyUser(request);
    if ('error' in verification) {
      return NextResponse.json(
        { success: false, error: verification.error },
        { status: verification.status }
      );
    }

    const { userId } = verification;
    const body = await request.json();

    // Build update object with only provided fields
    const updateFields: any = {};
    Object.keys(body).forEach(key => {
      if (body[key] !== undefined) {
        updateFields[`compatibilityAssessment.${key}`] = body[key];
      }
    });

    updateFields['compatibilityAssessment.lastUpdated'] = new Date();

    await Student.findByIdAndUpdate(userId, { $set: updateFields });

    return NextResponse.json({
      success: true,
      message: 'Assessment updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating assessment:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update assessment'
    }, { status: 500 });
  }
}
