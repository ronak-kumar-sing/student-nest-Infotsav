import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import OTP from '@/lib/models/OTP';
import { sendOTPEmail } from '@/lib/utils/email';
import { sendEmailOTPSchema } from '@/lib/validation/otpSchemas';
import {
  sendRateLimiter,
  handleValidationError,
  handleRateLimit,
  handleError,
  createSendSuccessResponse
} from '@/lib/utils/otpHelpers';

/**
 * POST /api/otp/email/send - Send OTP to email
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = sendEmailOTPSchema.safeParse(body);
    if (!validationResult.success) {
      return handleValidationError(validationResult.error);
    }

    const { value: email, purpose } = validationResult.data;

    // Check rate limit
    const rateLimitResponse = await handleRateLimit(
      sendRateLimiter,
      email,
      'Please wait'
    );
    if (rateLimitResponse) return rateLimitResponse;

    // Connect to database
    await connectDB();

    // Create and send OTP
    const otp = await OTP.createOTP(email, 'email', purpose);
    await sendOTPEmail(email, otp.code);

    return createSendSuccessResponse('email', email, 'sendgrid');

  } catch (error) {
    return handleError(error, 'Send OTP');
  }
}
