import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import connectDB from '../../../lib/db/connection';
import RoomSharing from '../../../lib/models/RoomSharing';
import Student from '../../../lib/models/Student';
import { verifyAccessToken } from '../../../lib/utils/jwt';

// Helper function to verify token and get user
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

    // Check if user is verified (required for room sharing)
    if (!user.isEmailVerified || !user.isPhoneVerified) {
      return { error: 'Only verified students can access room sharing', status: 403 };
    }

    return { user, userId: decoded.userId };
  } catch (error) {
    return { error: 'Authentication failed', status: 401 };
  }
}

// GET - Get all room sharing listings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    await connectDB();

    // Build filter
    const filter: any = { status: { $in: ['active', 'full'] } };

    // Gender filter
    const gender = searchParams.get('gender');
    if (gender && gender !== 'any') {
      filter['requirements.gender'] = { $in: ['any', gender] };
    }

    // Price filter
    const maxBudget = searchParams.get('maxBudget');
    if (maxBudget) {
      filter['costSharing.rentPerPerson'] = { $lte: parseInt(maxBudget) };
    }

    // Fetch room sharing listings
    const total = await RoomSharing.countDocuments(filter);
    let shares = await RoomSharing.find(filter)
      .populate('property', 'title location images amenities features')
      .populate('initiator', 'fullName email profilePhoto isVerified')
      .populate('currentParticipants.user', 'fullName profilePhoto')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Location filter (post-populate)
    const city = searchParams.get('city');
    if (city) {
      shares = shares.filter((share: any) =>
        share.property?.location?.city?.toLowerCase().includes(city.toLowerCase())
      );
    }

    // Format response
    const formattedShares = shares.map((share: any) => ({
      id: share._id,
      _id: share._id,
      status: share.status,
      property: share.property,
      initiator: share.initiator,
      maxParticipants: share.maxParticipants,
      currentParticipants: share.currentParticipants,
      costSharing: share.costSharing,
      requirements: share.requirements,
      roomConfiguration: share.roomConfiguration,
      description: share.description,
      availableFrom: share.availableFrom,
      availableTill: share.availableTill,
      houseRules: share.houseRules,
      views: share.views,
      applications: share.applications,
      createdAt: share.createdAt,
      sharing: {
        maxParticipants: share.maxParticipants,
        currentParticipants: share.currentParticipants.filter((p: any) => p.status === 'confirmed').length,
        availableSlots: share.maxParticipants - share.currentParticipants.filter((p: any) => p.status === 'confirmed').length,
        isFull: share.maxParticipants <= share.currentParticipants.filter((p: any) => p.status === 'confirmed').length
      },
      cost: {
        rentPerPerson: share.costSharing.rentPerPerson,
        depositPerPerson: share.costSharing.depositPerPerson,
        utilitiesIncluded: share.costSharing.utilitiesIncluded,
        utilitiesPerPerson: share.costSharing.utilitiesPerPerson
      }
    }));

    return NextResponse.json({
      success: true,
      data: {
        shares: formattedShares,
        requests: formattedShares, // Support both field names
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('Error fetching room sharing:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch room sharing data'
    }, { status: 500 });
  }
}

// POST: Create new room sharing request
export async function POST(request: NextRequest) {
  try {
    // Verify user and check verification status
    const verification = await verifyUser(request);
    if ('error' in verification) {
      return NextResponse.json(
        { success: false, error: verification.error },
        { status: verification.status }
      );
    }

    const { userId } = verification;
    const body = await request.json();

    // Validate required fields
    const {
      propertyId,
      maxParticipants,
      requirements,
      costSharing,
      description,
      roomConfiguration,
      availableFrom,
      houseRules
    } = body;

    if (!propertyId || !requirements || !costSharing || !description) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate and set defaults for maxParticipants
    const validatedMaxParticipants = maxParticipants && maxParticipants >= 2
      ? Math.min(maxParticipants, 6)
      : 2;

    // Validate and set defaults for roomConfiguration
    const validatedRoomConfiguration = {
      totalBeds: roomConfiguration?.totalBeds || 2,
      bedsAvailable: roomConfiguration?.bedsAvailable || Math.max(1, validatedMaxParticipants - 1),
      hasPrivateBathroom: roomConfiguration?.hasPrivateBathroom ?? false,
      hasSharedKitchen: roomConfiguration?.hasSharedKitchen ?? true,
      hasStudyArea: roomConfiguration?.hasStudyArea ?? true,
      hasStorage: roomConfiguration?.hasStorage ?? true
    };

    // Ensure bedsAvailable is at least 1 and not more than totalBeds
    if (validatedRoomConfiguration.bedsAvailable < 1) {
      validatedRoomConfiguration.bedsAvailable = 1;
    }
    if (validatedRoomConfiguration.bedsAvailable > validatedRoomConfiguration.totalBeds) {
      validatedRoomConfiguration.bedsAvailable = validatedRoomConfiguration.totalBeds;
    }

    await connectDB();

    // Check if user already has an active share for this property
    const existingShare = await RoomSharing.findOne({
      property: propertyId,
      initiator: userId,
      status: { $in: ['active', 'full'] }
    });

    if (existingShare) {
      return NextResponse.json(
        { success: false, error: 'You already have an active room share for this property' },
        { status: 400 }
      );
    }

    // Create new room sharing listing
    const roomSharing = await RoomSharing.create({
      property: propertyId,
      initiator: userId,
      maxParticipants: validatedMaxParticipants,
      currentParticipants: [
        {
          user: userId,
          sharedAmount: costSharing.rentPerPerson,
          status: 'confirmed',
          joinedAt: new Date()
        }
      ],
      requirements,
      costSharing,
      description,
      roomConfiguration: validatedRoomConfiguration,
      availableFrom: new Date(availableFrom),
      availableTill: body.availableTill ? new Date(body.availableTill) : null,
      houseRules: houseRules || [],
      status: 'active',
      views: 0,
      applications: []
    });

    // Populate for response
    const populatedShare = await RoomSharing.findById(roomSharing._id)
      .populate('property', 'title location images amenities features')
      .populate('initiator', 'fullName email profilePhoto isVerified')
      .lean();

    return NextResponse.json({
      success: true,
      message: 'Room sharing listing created successfully',
      data: populatedShare
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating room sharing:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create room sharing request'
    }, { status: 500 });
  }
}

