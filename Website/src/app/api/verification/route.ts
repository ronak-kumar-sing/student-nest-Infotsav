import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import User from '@/lib/models/User';
import { verifyAccessToken } from '@/lib/utils/jwt';

// Helper function to verify JWT token
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

// GET: Get user verification status
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const decoded = await verifyToken(request);

    // Get user
    const user = await User.findById(decoded.userId).select(
      'isEmailVerified isPhoneVerified isIdentityVerified email phone role'
    );

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Calculate verification status
    const emailVerified = user.isEmailVerified || false;
    const phoneVerified = user.isPhoneVerified || false;
    const identityVerified = (user as any).isIdentityVerified || false;

    const allVerified = emailVerified && phoneVerified && identityVerified;
    const partiallyVerified = emailVerified || phoneVerified || identityVerified;

    let verificationStatus = 'not-verified';
    if (allVerified) {
      verificationStatus = 'verified';
    } else if (partiallyVerified) {
      verificationStatus = 'partially-verified';
    }

    return NextResponse.json({
      success: true,
      data: {
        status: verificationStatus,
        email: {
          value: user.email,
          verified: emailVerified
        },
        phone: {
          value: user.phone,
          verified: phoneVerified
        },
        identity: {
          verified: identityVerified
        },
        completionPercentage: Math.round(
          ((emailVerified ? 1 : 0) + (phoneVerified ? 1 : 0) + (identityVerified ? 1 : 0)) / 3 * 100
        )
      }
    });

  } catch (error: any) {
    console.error('Error getting verification status:', error);

    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to get verification status'
    }, { status: 500 });
  }
}
