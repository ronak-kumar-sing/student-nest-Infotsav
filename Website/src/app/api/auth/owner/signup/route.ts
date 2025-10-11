import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../../lib/db/connection'
import Owner from '../../../../../lib/models/Owner'
import OTP from '../../../../../lib/models/OTP'
import { ownerSignupSchema, normalizeEmail, sanitizePhone } from '../../../../../lib/validation/authSchemas'
import { generateTokens } from '../../../../../lib/utils/jwt'
import { sendWelcomeEmail } from '../../../../../lib/utils/email'
import { sendWelcomeSMS } from '../../../../../lib/utils/sms'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import mongoose from 'mongoose'

// Rate limiter: 3 signups per hour per IP
const rateLimiter = new RateLimiterMemory({
  points: 3,
  duration: 60 * 60, // 1 hour
})

export async function POST(request: NextRequest) {
  try {
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    // Check rate limit
    try {
      await rateLimiter.consume(clientIP)
    } catch (rateLimiterRes: any) {
      return NextResponse.json(
        {
          error: 'Too many signup attempts',
          message: `Try again in ${Math.round(rateLimiterRes.msBeforeNext / 1000 / 60)} minutes`,
          retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000)
        },
        { status: 429 }
      )
    }

    const body = await request.json()

    // Validate input
    const validationResult = ownerSignupSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const userData = validationResult.data
    userData.email = normalizeEmail(userData.email)
    userData.phone = sanitizePhone(userData.phone)

    // Connect to database
    await connectDB()

    // Check if user already exists
    const existingUser = await Owner.findOne({
      $or: [
        { email: userData.email },
        { phone: userData.phone }
      ]
    }).exec()

    if (existingUser) {
      const field = existingUser.email === userData.email ? 'email' : 'phone'
      return NextResponse.json(
        {
          error: 'User already exists',
          message: `An account with this ${field} already exists`
        },
        { status: 409 }
      )
    }

    // Verify email OTP - look for successfully verified OTP
    const emailOTP = await OTP.findOne({
      identifier: userData.email,
      type: 'email',
      isUsed: true
    }).sort({ createdAt: -1 }).exec()

    if (!emailOTP) {
      return NextResponse.json(
        {
          error: 'Email not verified',
          message: 'Please verify your email first'
        },
        { status: 400 }
      )
    }

    // Phone verification disabled - auto-verify phone
    // const phoneOTP = await OTP.findOne({
    //   identifier: userData.phone,
    //   type: 'phone',
    //   isUsed: true
    // }).sort({ createdAt: -1 }).exec()

    // if (!phoneOTP) {
    //   return NextResponse.json(
    //     {
    //       error: 'Phone not verified',
    //       message: 'Please verify your phone number first'
    //     },
    //     { status: 400 }
    //   )
    // }

    // Create new owner - discriminator automatically sets role
    const owner = new Owner({
      ...userData,
      isEmailVerified: true,
      isPhoneVerified: true,
      // Owner accounts start as inactive until verified
      isActive: false
    })

    await owner.save()

    // Mark OTPs as used
    await OTP.updateMany(
      {
        $or: [
          { identifier: userData.email, type: 'email' },
          { identifier: userData.phone, type: 'phone' }
        ],
        isUsed: false
      },
      { isUsed: true }
    ).exec()

    // Generate tokens
    const tokenPayload = {
      userId: String(owner._id),
      email: owner.email,
      role: owner.role.toLowerCase() as 'owner',
      isActive: owner.isActive
    }
    const { accessToken, refreshToken } = generateTokens(tokenPayload)

    // Store refresh token
    owner.refreshTokens.push({
      token: refreshToken,
      createdAt: new Date()
    })

    await owner.save()

    // Send welcome emails/SMS (don't wait for them)
    try {
      sendWelcomeEmail(owner.email, owner.fullName, 'owner')
      sendWelcomeSMS(owner.phone, owner.fullName, 'owner')
    } catch (error) {
      console.error('Error sending welcome messages:', error)
      // Don't fail the signup for this
    }

    // Prepare user data for response
    const userDataResponse = owner.toPublicProfile()

    // Set refresh token as httpOnly cookie
    const response = NextResponse.json({
      success: true,
      message: 'Owner account created successfully. Please complete verification to activate your account.',
      user: userDataResponse,
      accessToken,
      nextStep: 'verification'
    }, { status: 201 })

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    return response

  } catch (error: any) {
    console.error('Owner signup error:', error)

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)?.[0]
      return NextResponse.json(
        {
          error: 'Duplicate field',
          message: `An account with this ${field} already exists`
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Something went wrong. Please try again later.'
      },
      { status: 500 }
    )
  }
}
