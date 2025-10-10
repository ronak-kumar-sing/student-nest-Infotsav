import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import User from '@/lib/models/User';
import Student from '@/lib/models/Student';
import Owner from '@/lib/models/Owner';
import { loginSchema, normalizeEmail, sanitizePhone } from '@/lib/validation/authSchemas';
import { generateTokens } from '@/lib/utils/jwt';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Rate limiter: 100 attempts per 15 minutes (increased for testing)
const rateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 15 * 60, // 15 minutes
});

export async function POST(request: Request) {
  try {
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    // Check rate limit
    try {
      await rateLimiter.consume(clientIP);
    } catch (rateLimiterRes: any) {
      return NextResponse.json(
        {
          error: 'Too many login attempts',
          message: `Try again in ${Math.round(rateLimiterRes.msBeforeNext / 1000)} seconds`,
          retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000)
        },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate input
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { identifier, password, role } = validationResult.data;

    // Connect to database
    await connectDB();

    // Determine if identifier is email or phone
    let query: any = {};
    if (identifier.includes('@')) {
      query.email = normalizeEmail(identifier);
    } else {
      query.phone = sanitizePhone(identifier);
    }

    console.log('Login attempt for:', query, 'Role:', role);

    let user = null;

    // Optimized search: Use single query with User model (discriminator handles all types)
    if (role) {
      // Search with role filter for faster lookup
      const roleVariants = [role, role.charAt(0).toUpperCase() + role.slice(1)];
      user = await User.findOne({
        ...query,
        role: { $in: roleVariants }
      }).select('+password').lean(false).exec();

      console.log(role + ' search result:', user ? 'Found' : 'Not found');
    } else {
      // No role specified - search all users
      user = await User.findOne(query).select('+password').lean(false).exec();
      console.log('User search result:', user ? 'Found' : 'Not found');
    }

    if (!user) {
      console.log('User not found');
      return NextResponse.json(
        {
          error: 'Invalid credentials',
          message: 'Email/phone or password is incorrect'
        },
        { status: 401 }
      );
    }

    // Verify role match if specified
    if (role) {
      const userRole = user.role?.toLowerCase();
      const requestedRole = role.toLowerCase();

      if (userRole !== requestedRole) {
        console.log(`Role mismatch: User has ${userRole}, requested ${requestedRole}`);
        return NextResponse.json(
          {
            error: 'Invalid credentials',
            message: 'Please check your account type and try again'
          },
          { status: 401 }
        );
      }
    }

    console.log('User found:', {
      id: user._id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      model: (user.constructor as any).modelName
    });

    // Check if account is locked
    if (user.isLocked && user.isLocked()) {
      const lockTime = user.lockUntil ? Math.round((user.lockUntil.getTime() - Date.now()) / 1000 / 60) : 0;
      return NextResponse.json(
        {
          error: 'Account locked',
          message: `Account is locked due to too many failed login attempts. Try again in ${lockTime} minutes.`
        },
        { status: 423 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        {
          error: 'Account suspended',
          message: 'Your account has been suspended. Please contact support.'
        },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      console.log('Invalid password for user:', user.email);

      // Increment login attempts if method exists
      if (user.incLoginAttempts) {
        await user.incLoginAttempts();
      } else {
        // Fallback for models without this method
        user.loginAttempts = (user.loginAttempts || 0) + 1;
        if (user.loginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
        }
        await user.save();
      }

      return NextResponse.json(
        {
          error: 'Invalid credentials',
          message: 'Email/phone or password is incorrect'
        },
        { status: 401 }
      );
    }

    console.log('Password valid, proceeding with login');

    // Batch all updates together for single save operation
    const updates: any = {
      lastLogin: new Date()
    };

    // Reset login attempts on successful login
    if (user.loginAttempts && user.loginAttempts > 0) {
      updates.loginAttempts = 0;
      updates.lockUntil = undefined;
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      userId: String(user._id),
      email: user.email,
      role: user.role.toLowerCase() as 'student' | 'owner'
    });

    // Store refresh token (ensure array exists and keep only last 5)
    const existingTokens = user.refreshTokens || [];
    updates.refreshTokens = [
      ...existingTokens.slice(-4), // Keep only last 4 old tokens
      {
        token: refreshToken,
        createdAt: new Date()
      }
    ];

    // Apply all updates in single operation
    Object.assign(user, updates);
    await user.save();

    // Prepare user data for response (lightweight)
    let userData;
    if (user.toPublicProfile) {
      userData = user.toPublicProfile();
    } else {
      // Fallback if method doesn't exist
      userData = {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        isIdentityVerified: user.isIdentityVerified
      };
    }

    console.log('Login successful for:', user.email);

    // Create response with user data and access token
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        accessToken
      }
    });

    // Set refresh token as httpOnly cookie (7 days)
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    // Set access token as httpOnly cookie (1 hour for security)
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Something went wrong. Please try again later.'
      },
      { status: 500 }
    );
  }
}
