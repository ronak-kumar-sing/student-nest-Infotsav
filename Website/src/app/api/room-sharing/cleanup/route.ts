import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import RoomSharing from '@/lib/models/RoomSharing';
import Room from '@/lib/models/Room';
import { verifyAccessToken } from '@/lib/utils/jwt';

// GET: Manual cleanup check (can be called by admin or cron job)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Find all active room sharing requests
    const activeShares = await RoomSharing.find({
      status: 'active'
    }).populate('property', 'status availableRooms totalRooms');

    console.log(`Found ${activeShares.length} active room shares to check`);

    const cleanupResults = [];

    for (const share of activeShares) {
      const property = share.property as any;

      // Check if property is inactive or fully booked
      const shouldDeactivate =
        !property ||
        property.status !== 'active' ||
        property.availableRooms === 0;

      if (shouldDeactivate) {
        const reason = !property
          ? 'Property deleted'
          : property.status !== 'active'
          ? `Property status: ${property.status}`
          : 'Property fully booked';

        // Update the sharing status
        share.status = 'cancelled';
        share.completionReason = reason;
        share.completedAt = new Date();

        await share.save();

        cleanupResults.push({
          shareId: share._id,
          propertyTitle: property?.title || 'Unknown',
          reason: reason,
          action: 'deactivated'
        });

        console.log(`Deactivated room sharing ${share._id}: ${reason}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed. ${cleanupResults.length} shares deactivated.`,
      data: {
        totalChecked: activeShares.length,
        deactivated: cleanupResults.length,
        results: cleanupResults
      }
    });

  } catch (error: any) {
    console.error('Room sharing cleanup error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Cleanup failed' },
      { status: 500 }
    );
  }
}

// POST: Manual cleanup trigger (admin only)
export async function POST(request: NextRequest) {
  try {
    // Verify admin token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No admin token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin token' },
        { status: 401 }
      );
    }

    // Note: In production, add admin role check here
    // if (decoded.role !== 'admin') { return 401 }

    await connectDB();

    // Get cleanup parameters from request body
    const body = await request.json().catch(() => ({}));
    const {
      daysInactive = 7,
      forceCleanup = false
    } = body;

    // Find room shares that need cleanup
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    const cleanupQuery: any = {
      status: 'active'
    };

    if (!forceCleanup) {
      cleanupQuery.updatedAt = { $lt: cutoffDate };
    }

    const sharesToCleanup = await RoomSharing.find(cleanupQuery)
      .populate('property', 'status availableRooms totalRooms title')
      .populate('initiator', 'fullName email');

    const cleanupResults = [];

    for (const share of sharesToCleanup) {
      const property = share.property as any;
      const shouldDeactivate =
        !property ||
        property.status !== 'active' ||
        property.availableRooms === 0;

      if (shouldDeactivate || forceCleanup) {
        const reason = forceCleanup
          ? 'Manual cleanup triggered'
          : !property
          ? 'Property no longer exists'
          : property.status !== 'active'
          ? `Property status changed to ${property.status}`
          : 'Property fully booked';

        share.status = 'cancelled';
        share.completionReason = reason;
        share.completedAt = new Date();

        await share.save();

        cleanupResults.push({
          shareId: share._id,
          propertyTitle: property?.title || 'Unknown Property',
          initiatorName: (share.initiator as any)?.fullName || 'Unknown',
          reason: reason,
          originalCreated: share.createdAt,
          lastUpdated: share.updatedAt
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Manual cleanup completed. Processed ${sharesToCleanup.length} shares.`,
      data: {
        totalProcessed: sharesToCleanup.length,
        deactivated: cleanupResults.length,
        cleanupCriteria: {
          daysInactive,
          forceCleanup,
          cutoffDate: cutoffDate.toISOString()
        },
        results: cleanupResults
      }
    });

  } catch (error: any) {
    console.error('Manual cleanup error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Manual cleanup failed' },
      { status: 500 }
    );
  }
}