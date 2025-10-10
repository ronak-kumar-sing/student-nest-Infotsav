/**
 * Unified Visit Request API
 * Handles visit request creation and retrieval for both students and owners
 * POST: Create new visit request (student or owner)
 * GET: Fetch visit requests based on user role and filters
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/connection';
import VisitRequest from '@/lib/models/VisitRequest';
import Room from '@/lib/models/Room';
import User from '@/lib/models/User';
import { verifyAccessToken } from '@/lib/utils/jwt';

// ==================== HELPER FUNCTIONS ====================

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

async function getUserDetails(userId: string) {
  const user = await User.findById(userId).select('fullName email phone profilePhoto role');
  if (!user) {
    throw new Error('User not found');
  }
  return {
    userId: user._id as mongoose.Types.ObjectId,
    name: user.fullName,
    email: user.email,
    phone: user.phone,
    profilePhoto: user.profilePhoto,
    role: user.role.toLowerCase() as 'student' | 'owner'
  };
}

// ==================== POST: CREATE VISIT REQUEST ====================

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const body = await request.json();

    // Get user details
    const currentUser = await getUserDetails(decoded.userId);

    // Validate required fields
    const {
      propertyId,
      recipientId,
      timeSlots,
      requestType,
      visitType,
      message,
      priority,
      requirements,
      specialInstructions
    } = body;

    if (!propertyId) {
      return NextResponse.json({
        success: false,
        error: 'Property ID is required'
      }, { status: 400 });
    }

    if (!recipientId) {
      return NextResponse.json({
        success: false,
        error: 'Recipient ID is required'
      }, { status: 400 });
    }

    if (!timeSlots || !Array.isArray(timeSlots) || timeSlots.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'At least one time slot is required'
      }, { status: 400 });
    }

    if (timeSlots.length > 5) {
      return NextResponse.json({
        success: false,
        error: 'Maximum 5 time slots allowed'
      }, { status: 400 });
    }

    // Verify property exists
    const property = await Room.findById(propertyId);
    if (!property) {
      return NextResponse.json({
        success: false,
        error: 'Property not found'
      }, { status: 404 });
    }

    // Get recipient details
    const recipient = await getUserDetails(recipientId);

    // Validate roles
    if (currentUser.role === recipient.role) {
      return NextResponse.json({
        success: false,
        error: 'Cannot create visit request with same role type'
      }, { status: 400 });
    }

    // Ensure property owner matches
    if (currentUser.role === 'owner' && property.owner.toString() !== currentUser.userId.toString()) {
      return NextResponse.json({
        success: false,
        error: 'You can only create requests for your own properties'
      }, { status: 403 });
    }

    if (recipient.role === 'owner' && property.owner.toString() !== recipient.userId.toString()) {
      return NextResponse.json({
        success: false,
        error: 'Invalid property owner'
      }, { status: 400 });
    }

    // Check for existing active request
    const existingRequest = await VisitRequest.findOne({
      property: propertyId,
      'student.userId': currentUser.role === 'student' ? currentUser.userId : recipient.userId,
      'owner.userId': currentUser.role === 'owner' ? currentUser.userId : recipient.userId,
      isActive: true,
      status: { $in: ['pending', 'awaiting_student', 'awaiting_owner', 'confirmed'] }
    });

    if (existingRequest) {
      return NextResponse.json({
        success: false,
        error: 'An active visit request already exists for this property',
        data: { existingRequestId: existingRequest._id }
      }, { status: 409 });
    }

    // Prepare participant info
    const studentInfo = currentUser.role === 'student' ? currentUser : recipient;
    const ownerInfo = currentUser.role === 'owner' ? currentUser : recipient;

    // Create visit request
    const visitRequest = await VisitRequest.create({
      property: propertyId,
      student: {
        userId: studentInfo.userId,
        name: studentInfo.name,
        email: studentInfo.email,
        phone: studentInfo.phone,
        profilePhoto: studentInfo.profilePhoto,
        notes: currentUser.role === 'student' ? message : undefined
      },
      owner: {
        userId: ownerInfo.userId,
        name: ownerInfo.name,
        email: ownerInfo.email,
        phone: ownerInfo.phone,
        profilePhoto: ownerInfo.profilePhoto,
        notes: currentUser.role === 'owner' ? message : undefined
      },
      initiatedBy: currentUser.role,
      requestType: requestType || 'property_viewing',
      priority: priority || 'normal',
      status: currentUser.role === 'student' ? 'awaiting_owner' : 'awaiting_student',
      proposals: [{
        proposedBy: currentUser.role,
        timeSlots: timeSlots.map((slot: any) => ({
          date: new Date(slot.date),
          startTime: slot.startTime,
          endTime: slot.endTime,
          isAvailable: true
        })),
        message: message,
        createdAt: new Date()
      }],
      visitDetails: {
        visitType: visitType || 'physical',
        requirements: requirements || [],
        specialInstructions: specialInstructions
      }
    });

    // Populate the response
    await visitRequest.populate('property', 'title location images rent');

    return NextResponse.json({
      success: true,
      message: 'Visit request created successfully',
      data: {
        visitRequest: {
          _id: visitRequest._id,
          property: visitRequest.property,
          student: visitRequest.student,
          owner: visitRequest.owner,
          status: visitRequest.status,
          initiatedBy: visitRequest.initiatedBy,
          requestType: visitRequest.requestType,
          priority: visitRequest.priority,
          proposals: visitRequest.proposals,
          visitDetails: visitRequest.visitDetails,
          requestedAt: visitRequest.requestedAt,
          version: visitRequest.version
        }
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating visit request:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    if (error.message === 'User not found') {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 404 });
    }

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create visit request'
    }, { status: 500 });
  }
}

// ==================== GET: FETCH VISIT REQUESTS ====================

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const { searchParams } = new URL(request.url);

    // Get user details
    const currentUser = await getUserDetails(decoded.userId);

    // Parse query parameters
    const status = searchParams.get('status');
    const type = searchParams.get('type'); // 'sent', 'received', 'all'
    const requestType = searchParams.get('requestType');
    const propertyId = searchParams.get('propertyId');
    const filter = searchParams.get('filter'); // 'pending', 'upcoming', 'past'

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build query
    let query: any = {};

    // User-specific filter
    if (type === 'sent') {
      // Requests initiated by current user
      query.initiatedBy = currentUser.role;
      if (currentUser.role === 'student') {
        query['student.userId'] = currentUser.userId;
      } else {
        query['owner.userId'] = currentUser.userId;
      }
    } else if (type === 'received') {
      // Requests received by current user
      if (currentUser.role === 'student') {
        query['student.userId'] = currentUser.userId;
        query.initiatedBy = 'owner';
      } else {
        query['owner.userId'] = currentUser.userId;
        query.initiatedBy = 'student';
      }
    } else {
      // All requests for current user
      if (currentUser.role === 'student') {
        query['student.userId'] = currentUser.userId;
      } else {
        query['owner.userId'] = currentUser.userId;
      }
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Request type filter
    if (requestType) {
      query.requestType = requestType;
    }

    // Property filter
    if (propertyId) {
      query.property = propertyId;
    }

    // Smart filters
    if (filter === 'pending') {
      query.status = { $in: ['pending', 'awaiting_student', 'awaiting_owner'] };
      query.isActive = true;
    } else if (filter === 'upcoming') {
      query.status = 'confirmed';
      query['visitDetails.confirmedSlot.date'] = { $gte: new Date() };
      query.isActive = true;
    } else if (filter === 'past') {
      query.$or = [
        { status: 'completed' },
        { status: 'cancelled' },
        { status: 'no_show' },
        {
          status: 'confirmed',
          'visitDetails.confirmedSlot.date': { $lt: new Date() }
        }
      ];
    }

    // Execute query with pagination
    const [visitRequests, totalCount] = await Promise.all([
      VisitRequest.find(query)
        .populate('property', 'title location images rent availability')
        .sort({ lastActivityAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      VisitRequest.countDocuments(query)
    ]);

    // Get statistics
    const stats = await VisitRequest.getStatistics(currentUser.userId.toString(), currentUser.role);

    // Get pending action count
    const pendingCount = await VisitRequest.countDocuments({
      [currentUser.role === 'student' ? 'student.userId' : 'owner.userId']: currentUser.userId,
      status: currentUser.role === 'student' ? 'awaiting_student' : 'awaiting_owner',
      isActive: true
    });

    // Get upcoming visits count
    const upcomingCount = await VisitRequest.countDocuments({
      [currentUser.role === 'student' ? 'student.userId' : 'owner.userId']: currentUser.userId,
      status: 'confirmed',
      'visitDetails.confirmedSlot.date': { $gte: new Date() },
      isActive: true
    });

    return NextResponse.json({
      success: true,
      data: {
        visitRequests,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page * limit < totalCount,
          hasPrevPage: page > 1
        },
        statistics: {
          ...stats,
          pendingAction: pendingCount,
          upcomingVisits: upcomingCount
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching visit requests:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch visit requests'
    }, { status: 500 });
  }
}
