import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Negotiation from '@/lib/models/Negotiation';
import Room from '@/lib/models/Room';
import { verifyAccessToken } from '@/lib/utils/jwt';

// GET: Get user's negotiations (student or owner)
export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || 'auto'; // 'student', 'owner', 'auto'
    const status = searchParams.get('status'); // 'pending', 'accepted', 'rejected', 'countered'

    await connectDB();

    let negotiations = [];

    if (role === 'student' || role === 'auto') {
      // Get negotiations as student
      const studentQuery: any = { student: userId };
      if (status) studentQuery.status = status;

      const studentNegotiations = await Negotiation.find(studentQuery)
        .populate('room', 'title price location images')
        .populate('owner', 'fullName email phone')
        .sort({ createdAt: -1 });

      negotiations.push(...studentNegotiations.map((neg: any) => ({
        ...neg.toObject(),
        userRole: 'student',
        counterparty: neg.owner
      })));
    }

    if (role === 'owner' || role === 'auto') {
      // Get negotiations as owner
      const ownerQuery: any = { owner: userId };
      if (status) ownerQuery.status = status;

      const ownerNegotiations = await Negotiation.find(ownerQuery)
        .populate('room', 'title price location images')
        .populate('student', 'fullName email phone collegeId course yearOfStudy')
        .sort({ createdAt: -1 });

      negotiations.push(...ownerNegotiations.map((neg: any) => ({
        ...neg.toObject(),
        userRole: 'owner',
        counterparty: neg.student
      })));
    }

    // Sort by creation date (newest first)
    negotiations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate summary statistics
    const summary = {
      total: negotiations.length,
      asStudent: negotiations.filter(n => n.userRole === 'student').length,
      asOwner: negotiations.filter(n => n.userRole === 'owner').length,
      pending: negotiations.filter(n => n.status === 'pending').length,
      accepted: negotiations.filter(n => n.status === 'accepted').length,
      rejected: negotiations.filter(n => n.status === 'rejected').length,
      countered: negotiations.filter(n => n.status === 'countered').length,
      totalSavings: negotiations
        .filter(n => n.status === 'accepted')
        .reduce((sum, n) => sum + (n.originalPrice - (n.finalPrice || n.proposedPrice)), 0),
      avgDiscount: negotiations
        .filter(n => n.status === 'accepted')
        .reduce((sum, n, _, arr) => {
          const discount = ((n.originalPrice - (n.finalPrice || n.proposedPrice)) / n.originalPrice) * 100;
          return sum + discount / arr.length;
        }, 0)
    };

    return NextResponse.json({
      success: true,
      data: {
        negotiations,
        summary
      }
    });

  } catch (error: any) {
    console.error('Get negotiations error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch negotiations' },
      { status: 500 }
    );
  }
}

// POST: Create new negotiation (student only)
export async function POST(request: NextRequest) {
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
    const { roomId, proposedPrice, message } = body;

    // Validation
    if (!roomId || !proposedPrice || proposedPrice <= 0) {
      return NextResponse.json(
        { success: false, error: 'Room ID and valid proposed price are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify room exists
    const room = await Room.findById(roomId).populate('owner', 'fullName email');
    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    // Check if user is trying to negotiate on their own property
    const ownerId = typeof room.owner === 'object' ? (room.owner as any)._id : room.owner;
    if (ownerId.toString() === userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot negotiate on your own property' },
        { status: 400 }
      );
    }

    // Check if user already has a negotiation for this room
    const existingNegotiation = await Negotiation.findOne({
      room: roomId,
      student: userId,
      status: { $in: ['pending', 'countered'] }
    });

    if (existingNegotiation) {
      return NextResponse.json(
        { success: false, error: 'You already have an active negotiation for this room' },
        { status: 400 }
      );
    }

    // Validate proposed price is not higher than original
    if (proposedPrice >= (room as any).price) {
      return NextResponse.json(
        { success: false, error: 'Proposed price must be lower than the original price' },
        { status: 400 }
      );
    }

    // Create new negotiation
    const negotiation = new Negotiation({
      room: roomId,
      student: userId,
      owner: ownerId,
      originalPrice: (room as any).price,
      proposedPrice,
      message: message || '',
      status: 'pending'
    });

    await negotiation.save();

    // Populate the created negotiation for response
    const populatedNegotiation = await Negotiation.findById(negotiation._id)
      .populate('room', 'title price location images')
      .populate('owner', 'fullName email')
      .populate('student', 'fullName email');

    return NextResponse.json({
      success: true,
      message: 'Negotiation submitted successfully',
      data: populatedNegotiation
    });

  } catch (error: any) {
    console.error('Create negotiation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create negotiation' },
      { status: 500 }
    );
  }
}