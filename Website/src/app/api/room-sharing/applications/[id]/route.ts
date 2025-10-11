import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../../lib/db/connection';
import RoomSharingApplication from '../../../../../lib/models/RoomSharingApplication';
import RoomSharing from '../../../../../lib/models/RoomSharing';
import { verifyAccessToken } from '../../../../../lib/utils/jwt';

// GET: Get specific application details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    await connectDB();

    const application = await RoomSharingApplication.findById(params.id)
      .populate('applicant', 'fullName email phone collegeId course yearOfStudy')
      .populate('roomSharing', 'totalBeds bedsAvailable monthlyRent securityDeposit studyHabits lifestyle')
      .populate({
        path: 'roomSharing',
        populate: {
          path: 'property',
          select: 'title location images roomType'
        }
      })
      .populate({
        path: 'roomSharing',
        populate: {
          path: 'initiator',
          select: 'fullName email phone'
        }
      });

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    // Verify user has permission to view this application
    const userId = decoded.userId;
    const applicantId = typeof application.applicant === 'object'
      ? (application.applicant as any)._id
      : application.applicant;
    const initiatorId = typeof (application.roomSharing as any).initiator === 'object'
      ? ((application.roomSharing as any).initiator as any)._id
      : (application.roomSharing as any).initiator;

    if (applicantId.toString() !== userId && initiatorId.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to view this application' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: application
    });

  } catch (error: any) {
    console.error('Get application error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch application' },
      { status: 500 }
    );
  }
}

// PATCH: Accept or reject application (room sharing initiator only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;
    const body = await request.json();
    const { action, rejectionReason } = body; // action: 'accept' or 'reject'

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "accept" or "reject"' },
        { status: 400 }
      );
    }

    await connectDB();

    const application = await RoomSharingApplication.findById(params.id)
      .populate('roomSharing', 'initiator totalBeds bedsAvailable')
      .populate('applicant', 'fullName email');

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    // Verify user is the room sharing initiator
    const initiatorId = typeof (application.roomSharing as any).initiator === 'object'
      ? ((application.roomSharing as any).initiator as any)._id
      : (application.roomSharing as any).initiator;

    if (initiatorId.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: 'Only the room sharing initiator can review applications' },
        { status: 403 }
      );
    }

    // Check if application is still pending
    if (application.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Application is already ${application.status}` },
        { status: 400 }
      );
    }

    // Update application status
    if (action === 'accept') {
      application.status = 'accepted';
      application.reviewedAt = new Date();
      application.reviewedBy = userId;

      // If accepting, add participant and update room sharing
      const roomSharing = await RoomSharing.findById((application.roomSharing as any)._id);
      if (roomSharing) {
        // Add the applicant to currentParticipants
        const applicantId = typeof application.applicant === 'object'
          ? (application.applicant as any)._id
          : application.applicant;

        (roomSharing as any).currentParticipants.push({
          user: applicantId,
          status: 'confirmed',
          joinedAt: new Date()
        });

        // Decrease available beds
        if ((roomSharing as any).bedsAvailable > 0) {
          (roomSharing as any).bedsAvailable -= 1;
        }

        // Check if room sharing is now full
        const confirmedParticipants = (roomSharing as any).currentParticipants.filter(
          (p: any) => p.status === 'confirmed'
        ).length;

        // If all slots are filled (initiator + participants = maxParticipants)
        // Or if no beds are available, mark as completed and archive
        if (confirmedParticipants >= (roomSharing as any).maxParticipants - 1 ||
            (roomSharing as any).bedsAvailable === 0) {
          (roomSharing as any).status = 'completed';
          (roomSharing as any).completionReason = 'All slots filled';
          (roomSharing as any).completedAt = new Date();

          // Optionally, you can delete it instead of just marking as completed
          // await RoomSharing.findByIdAndDelete((application.roomSharing as any)._id);
          // For now, we'll keep it as 'completed' for record-keeping
        }

        await roomSharing.save();
      }

    } else if (action === 'reject') {
      application.status = 'rejected';
      application.reviewedAt = new Date();
      application.reviewedBy = userId;
      if (rejectionReason) {
        application.rejectionReason = rejectionReason;
      }
    }

    await application.save();

    // Populate the updated application for response
    const updatedApplication = await RoomSharingApplication.findById(application._id)
      .populate('applicant', 'fullName email')
      .populate('roomSharing', 'totalBeds bedsAvailable status');

    return NextResponse.json({
      success: true,
      message: `Application ${action}ed successfully`,
      data: updatedApplication
    });

  } catch (error: any) {
    console.error('Update application error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update application' },
      { status: 500 }
    );
  }
}

// DELETE: Cancel application (applicant only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;
    await connectDB();

    const application = await RoomSharingApplication.findById(params.id);

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    // Verify user is the applicant
    const applicantId = typeof application.applicant === 'object'
      ? (application.applicant as any)._id
      : application.applicant;

    if (applicantId.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: 'Only the applicant can cancel their application' },
        { status: 403 }
      );
    }

    // Can only cancel pending applications
    if (application.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Cannot cancel ${application.status} application` },
        { status: 400 }
      );
    }

    await application.deleteOne();

    return NextResponse.json({
      success: true,
      message: 'Application cancelled successfully'
    });

  } catch (error: any) {
    console.error('Cancel application error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to cancel application' },
      { status: 500 }
    );
  }
}