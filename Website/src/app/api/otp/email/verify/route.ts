import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import OTP from '@/lib/models/OTP';
import { verifyEmailOTPSchema } from '@/lib/validation/otpSchemas';
import {
  verifyRateLimiter,
  getClientIP,
  handleValidationError,
  handleRateLimit,
  handleError,
  createVerifySuccessResponse,
  createVerifyErrorResponse
} from '@/lib/utils/otpHelpers';

/**
 * POST /api/otp/email/verify - Verify email OTP
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const clientIP = getClientIP(request);

    // Validate input
    const validationResult = verifyEmailOTPSchema.safeParse(body);
    if (!validationResult.success) {
      return handleValidationError(validationResult.error);
    }

    const { value: email, code } = validationResult.data;

    // Check rate limit
    const rateLimitResponse = await handleRateLimit(
      verifyRateLimiter,
      `${clientIP}-${email}`,
      'Please wait'
    );
    if (rateLimitResponse) return rateLimitResponse;

    // Connect to database
    await connectDB();

    // Verify OTP
    const verification = await OTP.verifyOTP(email, 'email', code);

    if (!verification.success) {
      return createVerifyErrorResponse(verification);
    }

    return createVerifySuccessResponse('email');

  } catch (error) {
    return handleError(error, 'Verify OTP');
  }
}
