import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Meeting from '@/lib/models/Meeting';
import User from '@/lib/models/User';
import jwt from 'jsonwebtoken';

// Helper function to verify JWT token
async function verifyToken(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      throw new Error('No token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const resolvedParams = await params;
    const meetingId = resolvedParams.id;
    const body = await request.json();

    if (!meetingId) {
      return NextResponse.json({
        success: false,
        error: 'Meeting ID is required'
      }, { status: 400 });
    }

    // Find the meeting
    const meeting = await Meeting.findById(meetingId)
      .populate('property', 'title')
      .populate('student', 'fullName phone email')
      .populate('owner', 'fullName phone email');

    if (!meeting) {
      return NextResponse.json({
        success: false,
        error: 'Meeting not found'
      }, { status: 404 });
    }

    // Verify user has permission to modify this meeting
    const user = await User.findById(decoded.id);
    const isOwner = meeting.owner._id.toString() === decoded.id;
    const isStudent = meeting.student._id.toString() === decoded.id;

    if (!isOwner && !isStudent) {
      return NextResponse.json({
        success: false,
        error: 'You do not have permission to modify this meeting'
      }, { status: 403 });
    }

    const action = body.action; // 'confirm', 'reschedule', 'cancel', 'complete'

    switch (action) {
      case 'confirm':
        if (!isOwner) {
          return NextResponse.json({
            success: false,
            error: 'Only the owner can confirm meetings'
          }, { status: 403 });
        }

        if (!body.confirmedDate || !body.confirmedTime) {
          return NextResponse.json({
            success: false,
            error: 'Confirmed date and time are required'
          }, { status: 400 });
        }

        await meeting.confirmMeeting(new Date(body.confirmedDate), body.confirmedTime);

        return NextResponse.json({
          success: true,
          message: 'Meeting confirmed successfully',
          data: {
            meetingId: meeting._id,
            status: meeting.status,
            confirmedDate: meeting.confirmedDate,
            confirmedTime: meeting.confirmedTime
          }
        });

      case 'reschedule':
        if (!body.newPreferredDates || body.newPreferredDates.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'New preferred dates are required'
          }, { status: 400 });
        }

        const newDates = body.newPreferredDates.map(date => new Date(date));
        await meeting.rescheduleMeeting(newDates, body.reason, decoded.id);

        return NextResponse.json({
          success: true,
          message: 'Meeting rescheduled successfully',
          data: {
            meetingId: meeting._id,
            status: meeting.status,
            newPreferredDates: meeting.preferredDates
          }
        });

      case 'cancel':
        if (!body.reason) {
          return NextResponse.json({
            success: false,
            error: 'Cancellation reason is required'
          }, { status: 400 });
        }

        await meeting.cancelMeeting(body.reason, decoded.id);

        return NextResponse.json({
          success: true,
          message: 'Meeting cancelled successfully',
          data: {
            meetingId: meeting._id,
            status: meeting.status,
            cancellationReason: meeting.cancellationReason
          }
        });

      case 'complete':
        if (!isOwner && !isStudent) {
          return NextResponse.json({
            success: false,
            error: 'Only meeting participants can mark as complete'
          }, { status: 403 });
        }

        const outcomeData = {
          attended: {
            student: body.studentAttended ?? true,
            owner: body.ownerAttended ?? true
          },
          studentInterested: body.studentInterested,
          ownerApproved: body.ownerApproved,
          followUpRequired: body.followUpRequired || false,
          notes: body.outcomeNotes,
          nextSteps: body.nextSteps || []
        };

        await meeting.completeMeeting(outcomeData);

        return NextResponse.json({
          success: true,
          message: 'Meeting marked as complete',
          data: {
            meetingId: meeting._id,
            status: meeting.status,
            outcome: meeting.outcome
          }
        });

      case 'no_show':
        if (!isOwner) {
          return NextResponse.json({
            success: false,
            error: 'Only the owner can mark no-show'
          }, { status: 403 });
        }

        const whoDidNotShow = body.whoDidNotShow; // 'student' or 'owner'
        await meeting.markNoShow(whoDidNotShow);

        return NextResponse.json({
          success: true,
          message: 'Meeting marked as no-show',
          data: {
            meetingId: meeting._id,
            status: meeting.status,
            outcome: meeting.outcome
          }
        });

      case 'add_notes':
        if (isOwner) {
          meeting.ownerNotes = body.notes;
        } else if (isStudent) {
          meeting.studentNotes = body.notes;
        }

        await meeting.save();

        return NextResponse.json({
          success: true,
          message: 'Notes added successfully',
          data: {
            meetingId: meeting._id,
            notes: {
              student: meeting.studentNotes,
              owner: meeting.ownerNotes
            }
          }
        });

      case 'add_virtual_details':
        if (!isOwner) {
          return NextResponse.json({
            success: false,
            error: 'Only the owner can add virtual meeting details'
          }, { status: 403 });
        }

        meeting.virtualMeetingDetails = {
          platform: body.platform,
          meetingLink: body.meetingLink,
          meetingId: body.meetingId,
          passcode: body.passcode
        };

        await meeting.save();

        return NextResponse.json({
          success: true,
          message: 'Virtual meeting details added successfully',
          data: {
            meetingId: meeting._id,
            virtualMeetingDetails: meeting.virtualMeetingDetails
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error updating meeting:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update meeting'
    }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);
    const resolvedParams = await params;
    const meetingId = resolvedParams.id;

    if (!meetingId) {
      return NextResponse.json({
        success: false,
        error: 'Meeting ID is required'
      }, { status: 400 });
    }

    // Find the meeting
    const meeting = await Meeting.findById(meetingId)
      .populate('property', 'title location images price amenities')
      .populate('student', 'fullName phone email profilePhoto')
      .populate('owner', 'fullName phone email profilePhoto');

    if (!meeting) {
      return NextResponse.json({
        success: false,
        error: 'Meeting not found'
      }, { status: 404 });
    }

    // Verify user has permission to view this meeting
    const isOwner = meeting.owner._id.toString() === decoded.id;
    const isStudent = meeting.student._id.toString() === decoded.id;

    if (!isOwner && !isStudent) {
      return NextResponse.json({
        success: false,
        error: 'You do not have permission to view this meeting'
      }, { status: 403 });
    }

    // Format meeting data
    const meetingData = {
      id: meeting._id,
      status: meeting.status,
      meetingType: meeting.meetingType,
      purpose: meeting.purpose,

      property: {
        id: meeting.property._id,
        title: meeting.property.title,
        location: meeting.property.location,
        images: meeting.property.images,
        price: meeting.property.price,
        amenities: meeting.property.amenities
      },

      student: {
        id: meeting.student._id,
        name: meeting.student.fullName,
        phone: meeting.student.phone,
        email: meeting.student.email,
        profilePhoto: meeting.student.profilePhoto
      },

      owner: {
        id: meeting.owner._id,
        name: meeting.owner.fullName,
        phone: meeting.owner.phone,
        email: meeting.owner.email,
        profilePhoto: meeting.owner.profilePhoto
      },

      schedule: {
        preferredDates: meeting.preferredDates,
        confirmedDate: meeting.confirmedDate,
        confirmedTime: meeting.confirmedTime
      },

      notes: {
        student: meeting.studentNotes,
        owner: meeting.ownerNotes
      },

      requirements: meeting.requirements,
      virtualMeetingDetails: meeting.virtualMeetingDetails,
      outcome: meeting.outcome,
      rescheduleHistory: meeting.rescheduleHistory,

      cancellation: {
        reason: meeting.cancellationReason,
        cancelledBy: meeting.cancelledBy,
        cancelledAt: meeting.cancelledAt
      },

      priority: meeting.priority,
      isUrgent: meeting.isUrgent,

      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt,

      // Helper fields
      isUpcoming: meeting.isUpcoming,
      estimatedDuration: meeting.estimatedDuration,

      // User permissions
      permissions: {
        canConfirm: isOwner && meeting.status === 'pending',
        canReschedule: (isOwner || isStudent) && ['pending', 'confirmed'].includes(meeting.status),
        canCancel: (isOwner || isStudent) && ['pending', 'confirmed'].includes(meeting.status),
        canComplete: (isOwner || isStudent) && meeting.status === 'confirmed',
        canAddNotes: isOwner || isStudent,
        canAddVirtualDetails: isOwner && meeting.meetingType === 'virtual'
      }
    };

    return NextResponse.json({
      success: true,
      data: meetingData
    });

  } catch (error) {
    console.error('Error fetching meeting:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch meeting'
    }, { status: 500 });
  }
}