import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import { studentSignupSchema } from '@/lib/validation/authSchemas';
import Student from '@/lib/models/Student';
import OTP from '@/lib/models/OTP';
import { generateTokens } from '@/lib/utils/jwt';
import { sendWelcomeEmail } from '@/lib/utils/email';
import { sendWelcomeSMS } from '@/lib/utils/sms';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Rate limiter: 3 signups per hour per IP
const rateLimiter = new RateLimiterMemory({
  points: 3,
  duration: 60 * 60, // 1 hour
});

// POST /api/auth/student/signup - Student registration
export async function POST(request: Request) {
  try {
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const body = await request.json();

    // Check rate limit
    try {
      await rateLimiter.consume(clientIP);
    } catch (rateLimiterRes: any) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many signup attempts',
          message: `Please wait ${Math.round(rateLimiterRes.msBeforeNext / 1000)} seconds before trying again`,
          retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000)
        },
        { status: 429 }
      );
    }

    // Validate student data
    const validation = studentSignupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          errors: validation.error.issues.map((e: any) => e.message) || ['Invalid input data']
        },
        { status: 400 }
      );
    }

    const { fullName, email, phone, password, collegeId, collegeName } = validation.data;

    // Connect to database
    await connectDB();

    // Check if user already exists
    const existingUser = await Student.findOne({
      $or: [
        { email: email },
        { phone: phone }
      ]
    }).exec();

    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'phone';
      return NextResponse.json(
        {
          success: false,
          error: 'User already exists',
          message: `An account with this ${field} already exists`
        },
        { status: 409 }
      );
    }

    // Verify email OTP - look for successfully verified OTP
    const emailOTP = await OTP.findOne({
      identifier: email,
      type: 'email',
      isUsed: true
    }).sort({ createdAt: -1 });

    if (!emailOTP) {
      return NextResponse.json({ error: 'Email verification required' }, { status: 400 });
    }

    // Verify phone OTP - look for successfully verified OTP
    const phoneOTP = await OTP.findOne({
      identifier: phone,
      type: 'phone',
      isUsed: true
    }).sort({ createdAt: -1 });

    if (!phoneOTP) {
      return NextResponse.json({ error: 'Phone verification required' }, { status: 400 });
    }

    // Create new student (role and password hashing handled automatically)
    const student = new Student({
      fullName,
      email,
      phone,
      password, // Will be hashed by User model pre-save middleware
      collegeId,
      collegeName,
      isEmailVerified: true,
      isPhoneVerified: true
    });

    await student.save();

    // Mark OTPs as used
    await OTP.updateMany(
      {
        $or: [
          { identifier: email, type: 'email' },
          { identifier: phone, type: 'phone' }
        ],
        isUsed: false
      },
      { isUsed: true }
    );

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      userId: String(student._id),
      email: student.email,
      role: student.role.toLowerCase() as 'student' | 'owner'
    });

    // Store refresh token
    student.refreshTokens.push({
      token: refreshToken,
      createdAt: new Date()
    });

    await student.save();

    // Send welcome emails/SMS (don't wait for them)
    try {
      sendWelcomeEmail(student.email, student.fullName, 'student');
      sendWelcomeSMS(student.phone, student.fullName, 'student');
    } catch (error) {
      console.error('Error sending welcome messages:', error);
      // Don't fail the signup for this
    }

    // Prepare user data for response
    const userData = student.toPublicProfile();

    // Set refresh token as httpOnly cookie
    const response = NextResponse.json({
      success: true,
      message: 'Student account created successfully',
      data: {
        user: userData,
        accessToken
      }
    }, { status: 201 });

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;

  } catch (error: any) {
    console.error('Signup error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({
        error: 'Validation failed',
        details: errors
      }, { status: 400 });
    }

    // Handle duplicate key errors (unique constraint violations)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})?.[0];
      const fieldNames: any = {
        email: 'email',
        phone: 'phone'
      };
      return NextResponse.json({
        success: false,
        error: 'User already exists',
        message: `An account with this ${fieldNames[field] || 'information'} already exists`
      }, { status: 409 });
    }

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
