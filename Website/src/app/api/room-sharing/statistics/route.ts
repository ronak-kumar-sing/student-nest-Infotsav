/**
 * Room Sharing Statistics API
 * Provides analytics and statistics for room sharing platform
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
      return { userId: null }; // Allow anonymous access
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    return { userId: decoded?.userId || null };
  } catch (error) {
    return { userId: null };
  }
}

// GET: Fetch room sharing statistics
export async function GET(request: NextRequest) {
  try {
    const { userId } = await verifyUser(request);

    await connectDB();

    // Overall platform statistics
    const totalShares = await RoomSharing.countDocuments();
    const activeShares = await RoomSharing.countDocuments({ status: 'active' });
    const fullShares = await RoomSharing.countDocuments({ status: 'full' });
    const completedShares = await RoomSharing.countDocuments({ status: 'completed' });

    // Total participants across all shares
    const participantsAggregate = await RoomSharing.aggregate([
      {
        $unwind: '$currentParticipants'
      },
      {
        $match: {
          'currentParticipants.status': 'confirmed'
        }
      },
      {
        $group: {
          _id: null,
          totalParticipants: { $sum: 1 },
          uniqueUsers: { $addToSet: '$currentParticipants.user' }
        }
      }
    ]);

    const totalParticipants = participantsAggregate[0]?.totalParticipants || 0;
    const uniqueParticipants = participantsAggregate[0]?.uniqueUsers?.length || 0;

    // Pending applications across platform
    const pendingApplicationsAggregate = await RoomSharing.aggregate([
      {
        $unwind: '$applications'
      },
      {
        $match: {
          'applications.status': 'pending'
        }
      },
      {
        $count: 'total'
      }
    ]);

    const totalPendingApplications = pendingApplicationsAggregate[0]?.total || 0;

    // Average participants per share
    const avgParticipantsAggregate = await RoomSharing.aggregate([
      {
        $match: {
          status: { $in: ['active', 'full', 'completed'] }
        }
      },
      {
        $project: {
          confirmedCount: {
            $size: {
              $filter: {
                input: '$currentParticipants',
                cond: { $eq: ['$$this.status', 'confirmed'] }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          avgParticipants: { $avg: '$confirmedCount' }
        }
      }
    ]);

    const avgParticipants = avgParticipantsAggregate[0]?.avgParticipants || 0;

    // Price range statistics
    const priceStats = await RoomSharing.aggregate([
      {
        $group: {
          _id: null,
          minRent: { $min: '$costSharing.rentPerPerson' },
          maxRent: { $max: '$costSharing.rentPerPerson' },
          avgRent: { $avg: '$costSharing.rentPerPerson' }
        }
      }
    ]);

    // Gender distribution
    const genderDistribution = await RoomSharing.aggregate([
      {
        $group: {
          _id: '$requirements.gender',
          count: { $sum: 1 }
        }
      }
    ]);

    // Most active cities
    const topCities = await RoomSharing.aggregate([
      {
        $lookup: {
          from: 'rooms',
          localField: 'property',
          foreignField: '_id',
          as: 'propertyData'
        }
      },
      {
        $unwind: '$propertyData'
      },
      {
        $group: {
          _id: '$propertyData.location.city',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // User-specific statistics
    const myStats = {
      created: await RoomSharing.countDocuments({ initiator: userId }),
      joined: await RoomSharing.countDocuments({
        'currentParticipants.user': userId,
        initiator: { $ne: userId }
      }),
      applied: await RoomSharing.countDocuments({
        'applications.applicant': userId
      }),
      pendingApplications: await RoomSharing.countDocuments({
        initiator: userId,
        'applications.status': 'pending'
      })
    };

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentShares = await RoomSharing.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    const recentApplications = await RoomSharing.aggregate([
      {
        $unwind: '$applications'
      },
      {
        $match: {
          'applications.appliedAt': { $gte: thirtyDaysAgo }
        }
      },
      {
        $count: 'total'
      }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        platform: {
          totalShares,
          activeShares,
          fullShares,
          completedShares,
          totalParticipants,
          uniqueParticipants,
          totalPendingApplications,
          avgParticipants: Math.round(avgParticipants * 10) / 10,
          priceRange: {
            min: priceStats[0]?.minRent || 0,
            max: priceStats[0]?.maxRent || 0,
            avg: Math.round(priceStats[0]?.avgRent || 0)
          },
          genderDistribution: genderDistribution.reduce((acc: any, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          topCities: topCities.map(city => ({
            name: city._id,
            count: city.count
          }))
        },
        myStats,
        recentActivity: {
          newShares: recentShares,
          newApplications: recentApplications[0]?.total || 0
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch statistics'
    }, { status: 500 });
  }
}
