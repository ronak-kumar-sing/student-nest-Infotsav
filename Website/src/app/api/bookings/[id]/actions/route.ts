/**
 * Booking Actions API
 * Handles approval, rejection, cancellation, extension requests
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Booking from '@/lib/models/Booking';
import Room from '@/lib/models/Room';
import User from '@/lib/models/User';
import { verifyAccessToken } from '@/lib/utils/jwt';

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

    return { userId: decoded.userId };
  } catch (error) {
    return { error: 'Authentication failed', status: 401 };
  }
}

// POST: Perform booking actions
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const verification = await verifyUser(request);
    if ('error' in verification) {
      return NextResponse.json(
        { success: false, error: verification.error },
        { status: verification.status }
      );
    }

    const { userId } = verification;
    const bookingId = params.id;
    const body = await request.json();
    const { action, reason, extensionDuration, refundAmount } = body;

    await connectDB();

    // Fetch booking
    const booking = await Booking.findById(bookingId)
      .populate('room')
      .populate('student', 'fullName email phone')
      .populate('owner', 'fullName email phone');

    if (!booking) {
      return NextResponse.json({
        success: false,
        error: 'Booking not found'
      }, { status: 404 });
    }

    // Get user
    const user = await User.findById(userId);
    const owner = booking.owner as any;
    const student = booking.student as any;
    const isOwner = owner._id?.toString() === userId;
    const isStudent = student._id?.toString() === userId;

    if (!isOwner && !isStudent) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized to perform this action'
      }, { status: 403 });
    }

    // Handle different actions
    switch (action) {
      case 'approve':
      case 'confirm':
        if (!isOwner) {
          return NextResponse.json({
            success: false,
            error: 'Only owners can approve bookings'
          }, { status: 403 });
        }

        if (booking.status !== 'pending') {
          return NextResponse.json({
            success: false,
            error: 'Only pending bookings can be approved'
          }, { status: 400 });
        }

        booking.status = 'confirmed';
        booking.confirmedAt = new Date();
        await booking.save();

        return NextResponse.json({
          success: true,
          message: 'Booking approved successfully',
          data: {
            booking: {
              id: booking._id,
              status: booking.status,
              confirmedAt: booking.confirmedAt
            }
          }
        });

      case 'reject':
        if (!isOwner) {
          return NextResponse.json({
            success: false,
            error: 'Only owners can reject bookings'
          }, { status: 403 });
        }

        if (booking.status !== 'pending') {
          return NextResponse.json({
            success: false,
            error: 'Only pending bookings can be rejected'
          }, { status: 400 });
        }

        if (!reason) {
          return NextResponse.json({
            success: false,
            error: 'Rejection reason is required'
          }, { status: 400 });
        }

        booking.status = 'rejected';
        booking.rejectedAt = new Date();
        booking.cancellationReason = reason;

        // Restore room availability
        const room = booking.room as any;
        await Room.findByIdAndUpdate(room._id || booking.room, {
          $inc: { 'availability.availableRooms': 1 },
          $set: { 'availability.isAvailable': true }
        });

        await booking.save();

        return NextResponse.json({
          success: true,
          message: 'Booking rejected successfully',
          data: {
            booking: {
              id: booking._id,
              status: booking.status,
              rejectedAt: booking.rejectedAt,
              reason: booking.cancellationReason
            }
          }
        });

      case 'cancel':
        if (!['pending', 'confirmed'].includes(booking.status || '')) {
          return NextResponse.json({
            success: false,
            error: 'Only pending or confirmed bookings can be cancelled'
          }, { status: 400 });
        }

        if (!reason) {
          return NextResponse.json({
            success: false,
            error: 'Cancellation reason is required'
          }, { status: 400 });
        }

        booking.status = 'cancelled';
        booking.cancelledAt = new Date();
        booking.cancellationReason = reason;
        (booking as any).cancelledBy = userId;

        // Handle refund if provided
        if (refundAmount && refundAmount > 0) {
          booking.refundAmount = refundAmount;
          booking.refundStatus = 'pending';
        }

        // Restore room availability
        const roomForCancel = booking.room as any;
        await Room.findByIdAndUpdate(roomForCancel._id || booking.room, {
          $inc: { 'availability.availableRooms': 1 },
          $set: { 'availability.isAvailable': true }
        });

        await booking.save();

        return NextResponse.json({
          success: true,
          message: 'Booking cancelled successfully',
          data: {
            booking: {
              id: booking._id,
              status: booking.status,
              cancelledAt: booking.cancelledAt,
              reason: booking.cancellationReason,
              refundAmount: booking.refundAmount
            }
          }
        });

      case 'activate':
      case 'check_in':
        if (!isOwner) {
          return NextResponse.json({
            success: false,
            error: 'Only owners can activate bookings'
          }, { status: 403 });
        }

        if (booking.status !== 'confirmed') {
          return NextResponse.json({
            success: false,
            error: 'Only confirmed bookings can be activated'
          }, { status: 400 });
        }

        booking.status = 'active';
        (booking as any).checkInDetails = {
          checkedInAt: new Date(),
          checkedInBy: userId,
          notes: body.notes || ''
        };

        await booking.save();

        return NextResponse.json({
          success: true,
          message: 'Student checked in successfully',
          data: {
            booking: {
              id: booking._id,
              status: booking.status,
              checkInDetails: (booking as any).checkInDetails
            }
          }
        });

      case 'complete':
      case 'check_out':
        if (booking.status !== 'active') {
          return NextResponse.json({
            success: false,
            error: 'Only active bookings can be completed'
          }, { status: 400 });
        }

        booking.status = 'completed';
        booking.completedAt = new Date();

        if (isOwner) {
          (booking as any).checkOutDetails = {
            checkedOutAt: new Date(),
            checkedOutBy: userId,
            notes: body.notes || '',
            damageCharges: body.damageCharges || 0,
            cleaningCharges: body.cleaningCharges || 0
          };
        }

        // Update room availability
        const roomForComplete = booking.room as any;
        await Room.findByIdAndUpdate(roomForComplete._id || booking.room, {
          $inc: { 'availability.availableRooms': 1 },
          $set: { 'availability.isAvailable': true }
        });

        await booking.save();

        return NextResponse.json({
          success: true,
          message: 'Booking completed successfully',
          data: {
            booking: {
              id: booking._id,
              status: booking.status,
              completedAt: booking.completedAt,
              checkOutDetails: (booking as any).checkOutDetails
            }
          }
        });

      case 'request_extension':
        if (!isStudent) {
          return NextResponse.json({
            success: false,
            error: 'Only students can request extensions'
          }, { status: 403 });
        }

        if (booking.status !== 'active') {
          return NextResponse.json({
            success: false,
            error: 'Only active bookings can be extended'
          }, { status: 400 });
        }

        if (!extensionDuration || extensionDuration < 1) {
          return NextResponse.json({
            success: false,
            error: 'Valid extension duration is required (in months)'
          }, { status: 400 });
        }

        // Add extension request
        const extensionRequest = {
          requestedBy: userId,
          requestedAt: new Date(),
          extensionMonths: extensionDuration,
          reason: reason || '',
          status: 'pending',
          newMoveOutDate: new Date(booking.moveOutDate!.getTime() + extensionDuration * 30 * 24 * 60 * 60 * 1000)
        };

        if (!(booking as any).extensionRequests) {
          (booking as any).extensionRequests = [];
        }
        (booking as any).extensionRequests.push(extensionRequest);

        await booking.save();

        return NextResponse.json({
          success: true,
          message: 'Extension request submitted successfully',
          data: {
            booking: {
              id: booking._id,
              extensionRequest
            }
          }
        });

      case 'approve_extension':
        if (!isOwner) {
          return NextResponse.json({
            success: false,
            error: 'Only owners can approve extension requests'
          }, { status: 403 });
        }

        const extensionId = body.extensionId;
        if (!extensionId) {
          return NextResponse.json({
            success: false,
            error: 'Extension request ID is required'
          }, { status: 400 });
        }

        const extension = (booking as any).extensionRequests?.find(
          (ext: any) => ext._id.toString() === extensionId
        );

        if (!extension) {
          return NextResponse.json({
            success: false,
            error: 'Extension request not found'
          }, { status: 404 });
        }

        extension.status = 'approved';
        extension.approvedAt = new Date();
        extension.approvedBy = userId;

        // Update booking duration and move-out date
        booking.duration += extension.extensionMonths;
        booking.moveOutDate = extension.newMoveOutDate;

        await booking.save();

        return NextResponse.json({
          success: true,
          message: 'Extension request approved successfully',
          data: {
            booking: {
              id: booking._id,
              moveOutDate: booking.moveOutDate,
              duration: booking.duration
            }
          }
        });

      case 'reject_extension':
        if (!isOwner) {
          return NextResponse.json({
            success: false,
            error: 'Only owners can reject extension requests'
          }, { status: 403 });
        }

        const rejectExtensionId = body.extensionId;
        if (!rejectExtensionId) {
          return NextResponse.json({
            success: false,
            error: 'Extension request ID is required'
          }, { status: 400 });
        }

        const rejectExtension = (booking as any).extensionRequests?.find(
          (ext: any) => ext._id.toString() === rejectExtensionId
        );

        if (!rejectExtension) {
          return NextResponse.json({
            success: false,
            error: 'Extension request not found'
          }, { status: 404 });
        }

        rejectExtension.status = 'rejected';
        rejectExtension.rejectedAt = new Date();
        rejectExtension.rejectedBy = userId;
        rejectExtension.rejectionReason = reason || '';

        await booking.save();

        return NextResponse.json({
          success: true,
          message: 'Extension request rejected successfully',
          data: {
            booking: {
              id: booking._id
            }
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error performing booking action:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform booking action'
    }, { status: 500 });
  }
}
