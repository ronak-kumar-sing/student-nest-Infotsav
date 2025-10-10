import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import User from '@/lib/models/User';
import { verifyRefreshToken, generateTokens } from '@/lib/utils/jwt';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    // Get refresh token from cookie or body
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('refreshToken')?.value;
    let bodyToken: string | undefined;

    try {
      const body = await request.json();
      bodyToken = body.refreshToken;
    } catch {
      // Body parsing failed, ignore
    }

    const refreshToken = cookieToken || bodyToken;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token required', message: 'No refresh token provided' },
        { status: 401 }
      );
    }

    // Verify refresh token
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid refresh token', message: 'Refresh token is invalid or expired' },
        { status: 401 }
      );
    }

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid refresh token', message: 'Refresh token is invalid' },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Find user and check if refresh token exists
    const user = await User.findById(payload.userId).exec();
    if (!user) {
      return NextResponse.json(
        { error: 'User not found', message: 'User account not found' },
        { status: 404 }
      );
    }

    // Check if refresh token exists in user's refresh tokens
    const tokenExists = user.refreshTokens.some((token: any) => token.token === refreshToken);
    if (!tokenExists) {
      return NextResponse.json(
        { error: 'Invalid refresh token', message: 'Refresh token not found in user records' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account inactive', message: 'User account has been deactivated' },
        { status: 403 }
      );
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens({
      userId: String(user._id),
      email: user.email,
      role: user.role.toLowerCase() as 'student' | 'owner'
    });

    // Remove old refresh token and add new one
    user.refreshTokens = user.refreshTokens.filter((token: any) => token.token !== refreshToken);
    user.refreshTokens.push({
      token: newRefreshToken,
      createdAt: new Date()
    });

    // Keep only last 5 refresh tokens
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }

    // Use findOneAndUpdate to avoid version conflicts
    await User.findByIdAndUpdate(
      user._id,
      {
        $set: { refreshTokens: user.refreshTokens }
      },
      { new: true }
    );

    // Prepare user data for response
    const userData = user.toPublicProfile();

    // Create response with refreshed tokens and user data
    const response = NextResponse.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        user: userData,
        accessToken
      }
    });

    // Set new refresh token as httpOnly cookie (7 days)
    response.cookies.set('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    // Set new access token as httpOnly cookie (1 hour)
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Token refresh failed' },
      { status: 500 }
    );
  }
}
