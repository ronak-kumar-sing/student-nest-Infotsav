import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import OTP from '@/lib/models/OTP';
import { verifyPhoneOTPSchema } from '@/lib/validation/otpSchemas';
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
 * POST /api/otp/phone/verify - Verify phone OTP
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const clientIP = getClientIP(request);

    // Validate input
    const validationResult = verifyPhoneOTPSchema.safeParse(body);
    if (!validationResult.success) {
      return handleValidationError(validationResult.error);
    }

    const { value: phone, code } = validationResult.data;

    // Check rate limit
    const rateLimitResponse = await handleRateLimit(
      verifyRateLimiter,
      `${clientIP}-${phone}`,
      'Please wait'
    );
    if (rateLimitResponse) return rateLimitResponse;

    // Connect to database
    await connectDB();

    // Verify OTP
    const verification = await OTP.verifyOTP(phone, 'phone', code);

    if (!verification.success) {
      return createVerifyErrorResponse(verification);
    }

    return createVerifySuccessResponse('phone');

  } catch (error) {
    return handleError(error, 'Verify OTP');
  }
}
