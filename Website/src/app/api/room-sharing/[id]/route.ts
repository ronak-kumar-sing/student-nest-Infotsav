/**
 * Room Sharing Detail API
 * Get detailed information about a specific room share
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import RoomSharing from '@/lib/models/RoomSharing';
import Student from '@/lib/models/Student';
import { verifyAccessToken } from '@/lib/utils/jwt';

async function verifyUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { userId: null }; // Allow anonymous viewing
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    return { userId: decoded?.userId || null };
  } catch (error) {
    return { userId: null };
  }
}

// GET: Get detailed room share information
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await verifyUser(request);
    const shareId = params.id;

    await connectDB();

    // Find the room share
    const roomShare = await RoomSharing.findById(shareId)
      .populate('property', 'title description location images amenities features rent owner availability')
      .populate('initiator', 'fullName email phone profilePhoto bio isEmailVerified isPhoneVerified')
      .populate('currentParticipants.user', 'fullName email profilePhoto bio')
      .populate('applications.applicant', 'fullName email profilePhoto phone bio')
      .lean();

    if (!roomShare) {
      return NextResponse.json({
        success: false,
        error: 'Room share not found'
      }, { status: 404 });
    }

    // Increment view count (only if not the initiator)
    if (userId && roomShare.initiator._id.toString() !== userId.toString()) {
      await RoomSharing.findByIdAndUpdate(shareId, {
        $inc: { views: 1 }
      });
    }

    // Check if current user has applied
    let userApplication = null;
    let userIsParticipant = false;
    let userHasInterest = false;

    if (userId) {
      userApplication = roomShare.applications.find(
        (app: any) => app.applicant._id.toString() === userId.toString()
      );

      userIsParticipant = roomShare.currentParticipants.some(
        (p: any) => p.user._id.toString() === userId.toString()
      );

      userHasInterest = roomShare.interested.some(
        (int: any) => int.user.toString() === userId.toString()
      );
    }

    // Calculate compatibility if user has assessment
    let compatibilityScore = null;
    if (userId && userId !== roomShare.initiator._id.toString()) {
      const currentUser = await Student.findById(userId).select('compatibilityAssessment');
      const initiatorUser = await Student.findById(roomShare.initiator._id).select('compatibilityAssessment');

      if (currentUser?.compatibilityAssessment && initiatorUser?.compatibilityAssessment) {
        compatibilityScore = calculateCompatibility(
          currentUser.compatibilityAssessment,
          initiatorUser.compatibilityAssessment
        );
      }
    }

    // Format response
    const response = {
      ...roomShare,
      availableSlots: roomShare.maxParticipants - roomShare.currentParticipants.filter(
        (p: any) => p.status === 'confirmed'
      ).length,
      isFull: roomShare.maxParticipants <= roomShare.currentParticipants.filter(
        (p: any) => p.status === 'confirmed'
      ).length,
      userContext: userId ? {
        hasApplied: !!userApplication,
        applicationStatus: userApplication?.status || null,
        isParticipant: userIsParticipant,
        isInitiator: roomShare.initiator._id.toString() === userId.toString(),
        hasInterest: userHasInterest,
        compatibilityScore
      } : null
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error: any) {
    console.error('Error fetching room share details:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch room share details'
    }, { status: 500 });
  }
}

// Calculate compatibility score between two assessments
function calculateCompatibility(assessment1: any, assessment2: any): number {
  let score = 0;
  let totalFactors = 0;

  const factors = [
    { key: 'sleepSchedule', weight: 15 },
    { key: 'cleanliness', weight: 20 },
    { key: 'studyHabits', weight: 15 },
    { key: 'socialLevel', weight: 10 },
    { key: 'cookingFrequency', weight: 10 },
    { key: 'musicPreference', weight: 10 },
    { key: 'guestPolicy', weight: 10 },
    { key: 'smokingTolerance', weight: 5 },
    { key: 'petFriendly', weight: 5 }
  ];

  factors.forEach(factor => {
    if (assessment1[factor.key] && assessment2[factor.key]) {
      totalFactors += factor.weight;

      if (assessment1[factor.key] === assessment2[factor.key]) {
        score += factor.weight; // Perfect match
      } else if (isCompatible(assessment1[factor.key], assessment2[factor.key], factor.key)) {
        score += factor.weight * 0.5; // Partial match
      }
    }
  });

  // Check deal breakers
  if (assessment1.dealBreakers && assessment2.dealBreakers) {
    const hasConflict = assessment1.dealBreakers.some((db: string) =>
      assessment2.sharingPreferences?.includes(db)
    ) || assessment2.dealBreakers.some((db: string) =>
      assessment1.sharingPreferences?.includes(db)
    );

    if (hasConflict) {
      score *= 0.5; // Reduce score if deal breakers conflict
    }
  }

  return totalFactors > 0 ? Math.round((score / totalFactors) * 100) : 0;
}

// Check if two preferences are compatible
function isCompatible(pref1: string, pref2: string, category: string): boolean {
  const compatibilityRules: any = {
    sleepSchedule: {
      early_bird: ['flexible'],
      night_owl: ['flexible'],
      flexible: ['early_bird', 'night_owl', 'flexible']
    },
    cleanliness: {
      very_clean: ['moderately_clean'],
      moderately_clean: ['very_clean', 'relaxed'],
      relaxed: ['moderately_clean']
    },
    studyHabits: {
      silent: ['quiet'],
      quiet: ['silent', 'moderate_noise', 'flexible'],
      moderate_noise: ['quiet', 'flexible'],
      flexible: ['quiet', 'moderate_noise']
    },
    socialLevel: {
      very_social: ['moderately_social'],
      moderately_social: ['very_social', 'quiet'],
      quiet: ['moderately_social', 'prefer_alone'],
      prefer_alone: ['quiet']
    }
  };

  const rules = compatibilityRules[category];
  if (!rules || !rules[pref1]) return false;

  return rules[pref1].includes(pref2);
}

// PUT: Update room share details (initiator only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await verifyUser(request);

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const shareId = params.id;
    const body = await request.json();

    await connectDB();

    // Find the room share
    const roomShare = await RoomSharing.findById(shareId);

    if (!roomShare) {
      return NextResponse.json({
        success: false,
        error: 'Room share not found'
      }, { status: 404 });
    }

    // Check if user is the initiator
    if (roomShare.initiator.toString() !== userId.toString()) {
      return NextResponse.json({
        success: false,
        error: 'Only the initiator can update this room share'
      }, { status: 403 });
    }

    // Update allowed fields
    const allowedUpdates = [
      'description',
      'houseRules',
      'requirements',
      'availableTill',
      'isOpenToMeetup',
      'meetupPreferences'
    ];

    const updates: any = {};
    allowedUpdates.forEach(field => {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    });

    const updatedShare = await RoomSharing.findByIdAndUpdate(
      shareId,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('property', 'title location images')
      .populate('initiator', 'fullName email profilePhoto');

    return NextResponse.json({
      success: true,
      message: 'Room share updated successfully',
      data: updatedShare
    });

  } catch (error: any) {
    console.error('Error updating room share:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update room share'
    }, { status: 500 });
  }
}

// DELETE: Cancel/Delete room share (initiator only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await verifyUser(request);

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const shareId = params.id;

    await connectDB();

    // Find the room share
    const roomShare = await RoomSharing.findById(shareId);

    if (!roomShare) {
      return NextResponse.json({
        success: false,
        error: 'Room share not found'
      }, { status: 404 });
    }

    // Check if user is the initiator
    if (roomShare.initiator.toString() !== userId.toString()) {
      return NextResponse.json({
        success: false,
        error: 'Only the initiator can cancel this room share'
      }, { status: 403 });
    }

    // Update status to cancelled instead of deleting
    await RoomSharing.findByIdAndUpdate(shareId, {
      $set: {
        status: 'cancelled',
        completedAt: new Date(),
        completionReason: 'Cancelled by initiator'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Room share cancelled successfully'
    });

  } catch (error: any) {
    console.error('Error cancelling room share:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to cancel room share'
    }, { status: 500 });
  }
}
