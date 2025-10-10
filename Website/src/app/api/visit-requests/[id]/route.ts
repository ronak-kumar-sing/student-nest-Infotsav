/**
 * Visit Request Actions API
 * Unified endpoint for both students and owners to respond to visit requests
 * Supports: accept, decline, counter, reschedule, cancel
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import VisitRequest from '@/lib/models/VisitRequest';
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

async function getUserRole(userId: string): Promise<'student' | 'owner'> {
  const user = await User.findById(userId).select('role');
  if (!user) {
    throw new Error('User not found');
  }
  return user.role.toLowerCase() as 'student' | 'owner';
}

// ==================== PUT: RESPOND TO VISIT REQUEST ====================

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const userId = decoded.userId;
    const userRole = await getUserRole(userId);

    const visitRequestId = params.id;
    const body = await request.json();

    const { action, selectedSlot, counterProposal, message } = body;

    // Validate action
    const validActions = ['accept', 'decline', 'counter', 'reschedule', 'cancel'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json({
        success: false,
        error: `Invalid action. Must be one of: ${validActions.join(', ')}`
      }, { status: 400 });
    }

    // Find visit request
    const visitRequest = await VisitRequest.findById(visitRequestId).populate('property', 'title location images');

    if (!visitRequest) {
      return NextResponse.json({
        success: false,
        error: 'Visit request not found'
      }, { status: 404 });
    }

    // Verify user is part of this request
    const isStudent = visitRequest.student.userId.toString() === userId;
    const isOwner = visitRequest.owner.userId.toString() === userId;

    if (!isStudent && !isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized: You are not part of this visit request'
      }, { status: 403 });
    }

    // Verify correct role
    if ((isStudent && userRole !== 'student') || (isOwner && userRole !== 'owner')) {
      return NextResponse.json({
        success: false,
        error: 'Role mismatch'
      }, { status: 403 });
    }

    // Check if user can respond
    if (!visitRequest.canRespond(userId, userRole)) {
      return NextResponse.json({
        success: false,
        error: `Cannot respond to this request. Current status: ${visitRequest.status}`,
        data: {
          currentStatus: visitRequest.status,
          currentResponder: visitRequest.currentResponder,
          availableActions: visitRequest.getAvailableActions(userId, userRole)
        }
      }, { status: 400 });
    }

    // Process action
    let updatedRequest;
    let responseMessage = '';

    switch (action) {
      case 'accept':
        // Accept the proposed time slots
        if (!selectedSlot) {
          return NextResponse.json({
            success: false,
            error: 'Selected time slot is required for accept action'
          }, { status: 400 });
        }

        // Validate selected slot exists in latest proposal
        const latestProposal = visitRequest.latestProposal;
        if (!latestProposal) {
          return NextResponse.json({
            success: false,
            error: 'No proposal found to accept'
          }, { status: 400 });
        }

        const slotExists = latestProposal.timeSlots.some((slot: any) =>
          new Date(slot.date).getTime() === new Date(selectedSlot.date).getTime() &&
          slot.startTime === selectedSlot.startTime &&
          slot.endTime === selectedSlot.endTime
        );

        if (!slotExists) {
          return NextResponse.json({
            success: false,
            error: 'Selected slot does not match any proposed slots'
          }, { status: 400 });
        }

        updatedRequest = await visitRequest.addResponse(userRole, 'accept', {
          selectedSlot: {
            date: new Date(selectedSlot.date),
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
            isAvailable: true
          },
          message
        });

        responseMessage = 'Visit request accepted successfully';
        break;

      case 'decline':
        // Decline the request
        if (!message) {
          return NextResponse.json({
            success: false,
            error: 'Decline reason is required'
          }, { status: 400 });
        }

        updatedRequest = await visitRequest.addResponse(userRole, 'decline', { message });
        responseMessage = 'Visit request declined';
        break;

      case 'counter':
        // Counter with new time slots
        if (!counterProposal || !Array.isArray(counterProposal) || counterProposal.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'Counter proposal with time slots is required'
          }, { status: 400 });
        }

        if (counterProposal.length > 5) {
          return NextResponse.json({
            success: false,
            error: 'Maximum 5 time slots allowed in counter proposal'
          }, { status: 400 });
        }

        // Validate time slots
        const validatedSlots = counterProposal.map((slot: any) => {
          const slotDate = new Date(slot.date);
          if (slotDate <= new Date()) {
            throw new Error('All time slots must be in the future');
          }

          return {
            date: slotDate,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isAvailable: true
          };
        });

        updatedRequest = await visitRequest.addResponse(userRole, 'counter', {
          counterProposal: validatedSlots,
          message
        });

        // Also add as new proposal
        await updatedRequest.addProposal(userRole, validatedSlots, message);

        responseMessage = 'Counter proposal sent successfully';
        break;

      case 'reschedule':
        // Reschedule confirmed visit
        if (visitRequest.status !== 'confirmed') {
          return NextResponse.json({
            success: false,
            error: 'Can only reschedule confirmed visits'
          }, { status: 400 });
        }

        if (!counterProposal || !Array.isArray(counterProposal) || counterProposal.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'New time slots required for rescheduling'
          }, { status: 400 });
        }

        const rescheduledSlots = counterProposal.map((slot: any) => ({
          date: new Date(slot.date),
          startTime: slot.startTime,
          endTime: slot.endTime,
          isAvailable: true
        }));

        updatedRequest = await visitRequest.addResponse(userRole, 'reschedule', {
          counterProposal: rescheduledSlots,
          message
        });

        // Add as new proposal
        await updatedRequest.addProposal(userRole, rescheduledSlots, message);

        responseMessage = 'Reschedule request sent successfully';
        break;

      case 'cancel':
        // Cancel the visit
        if (!message) {
          return NextResponse.json({
            success: false,
            error: 'Cancellation reason is required'
          }, { status: 400 });
        }

        updatedRequest = await visitRequest.cancel(userRole, message);
        responseMessage = 'Visit request cancelled';
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

    // Populate for response
    await updatedRequest.populate('property', 'title location images rent');

    return NextResponse.json({
      success: true,
      message: responseMessage,
      data: {
        visitRequest: {
          _id: updatedRequest._id,
          property: updatedRequest.property,
          student: updatedRequest.student,
          owner: updatedRequest.owner,
          status: updatedRequest.status,
          initiatedBy: updatedRequest.initiatedBy,
          requestType: updatedRequest.requestType,
          proposals: updatedRequest.proposals,
          responses: updatedRequest.responses,
          visitDetails: updatedRequest.visitDetails,
          version: updatedRequest.version,
          lastActivityAt: updatedRequest.lastActivityAt,
          confirmedAt: updatedRequest.confirmedAt,
          cancelledAt: updatedRequest.cancelledAt
        }
      }
    });

  } catch (error: any) {
    console.error('Error responding to visit request:', error);

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
      error: error.message || 'Failed to respond to visit request'
    }, { status: 500 });
  }
}

// ==================== GET: GET VISIT REQUEST DETAILS ====================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const userId = decoded.userId;
    const userRole = await getUserRole(userId);

    const visitRequestId = params.id;

    // Find visit request
    const visitRequest = await VisitRequest.findById(visitRequestId)
      .populate('property', 'title location images rent availability amenities')
      .lean();

    if (!visitRequest) {
      return NextResponse.json({
        success: false,
        error: 'Visit request not found'
      }, { status: 404 });
    }

    // Verify user is part of this request
    const isStudent = visitRequest.student.userId.toString() === userId;
    const isOwner = visitRequest.owner.userId.toString() === userId;

    if (!isStudent && !isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized: You are not part of this visit request'
      }, { status: 403 });
    }

    // Get available actions for current user
    const visitRequestDoc = await VisitRequest.findById(visitRequestId);
    const availableActions = visitRequestDoc?.getAvailableActions(userId, userRole) || [];
    const canRespond = visitRequestDoc?.canRespond(userId, userRole) || false;

    return NextResponse.json({
      success: true,
      data: {
        visitRequest,
        userContext: {
          role: userRole,
          canRespond,
          availableActions,
          isInitiator: visitRequest.initiatedBy === userRole,
          currentResponder: visitRequestDoc?.currentResponder
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching visit request:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch visit request'
    }, { status: 500 });
  }
}

// ==================== PATCH: MARK AS COMPLETED ====================

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const userId = decoded.userId;
    const userRole = await getUserRole(userId);

    const visitRequestId = params.id;
    const body = await request.json();

    const { attended, rating, feedback } = body;

    // Find visit request
    const visitRequest = await VisitRequest.findById(visitRequestId);

    if (!visitRequest) {
      return NextResponse.json({
        success: false,
        error: 'Visit request not found'
      }, { status: 404 });
    }

    // Verify user is part of this request
    const isStudent = visitRequest.student.userId.toString() === userId;
    const isOwner = visitRequest.owner.userId.toString() === userId;

    if (!isStudent && !isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 403 });
    }

    // Can only mark completed/no-show visits
    if (visitRequest.status !== 'confirmed') {
      return NextResponse.json({
        success: false,
        error: 'Can only update status of confirmed visits'
      }, { status: 400 });
    }

    // Check if visit date has passed
    const confirmedDate = visitRequest.visitDetails.confirmedSlot?.date;
    if (confirmedDate && confirmedDate > new Date()) {
      return NextResponse.json({
        success: false,
        error: 'Cannot mark visit as completed before the scheduled date'
      }, { status: 400 });
    }

    // Update attendance and rating
    if (userRole === 'student') {
      visitRequest.student.hasAttended = attended;
      if (rating) {
        visitRequest.owner.rating = rating; // Student rates owner
      }
      if (feedback) {
        visitRequest.student.notes = (visitRequest.student.notes || '') + '\n\nFeedback: ' + feedback;
      }
    } else {
      visitRequest.owner.hasAttended = attended;
      if (rating) {
        visitRequest.student.rating = rating; // Owner rates student
      }
      if (feedback) {
        visitRequest.owner.notes = (visitRequest.owner.notes || '') + '\n\nFeedback: ' + feedback;
      }
    }

    // If both marked attendance, update status
    if (visitRequest.student.hasAttended !== undefined && visitRequest.owner.hasAttended !== undefined) {
      if (visitRequest.student.hasAttended && visitRequest.owner.hasAttended) {
        visitRequest.status = 'completed';
      } else {
        visitRequest.status = 'no_show';
      }
      visitRequest.completedAt = new Date();
      visitRequest.isActive = false;
    }

    await visitRequest.save();
    await visitRequest.populate('property', 'title location');

    return NextResponse.json({
      success: true,
      message: 'Visit status updated successfully',
      data: {
        visitRequest: {
          _id: visitRequest._id,
          status: visitRequest.status,
          student: visitRequest.student,
          owner: visitRequest.owner,
          completedAt: visitRequest.completedAt
        }
      }
    });

  } catch (error: any) {
    console.error('Error updating visit status:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update visit status'
    }, { status: 500 });
  }
}
