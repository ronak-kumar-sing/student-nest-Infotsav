import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import User from '@/lib/models/User';
import { verifyAccessToken } from '@/lib/utils/jwt';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    // Get access token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Access token required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let payload;

    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Find user
    const user = await User.findById(payload.userId).exec();
    if (!user) {
      return NextResponse.json(
        { error: 'User not found', message: 'User account not found' },
        { status: 404 }
      );
    }

    // Get refresh token to revoke (optional - can logout specific session)
    const cookieStore = await cookies();
    let bodyToken: string | undefined;

    try {
      const body = await request.json();
      bodyToken = body.refreshToken;
    } catch {
      // Body parsing failed, ignore
    }

    const refreshTokenToRevoke = bodyToken || cookieStore.get('refreshToken')?.value;

    if (refreshTokenToRevoke) {
      // Remove specific refresh token
      user.refreshTokens = user.refreshTokens.filter(
        (token: any) => token.token !== refreshTokenToRevoke
      );
    } else {
      // Remove all refresh tokens (logout from all devices)
      user.refreshTokens = [];
    }

    await user.save();

    // Create logout response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Clear both authentication cookies
    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    response.cookies.set('accessToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Logout failed' },
      { status: 500 }
    );
  }
}
