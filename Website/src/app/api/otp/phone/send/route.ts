import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import OTP from '@/lib/models/OTP';
import { sendOTPSMS } from '@/lib/utils/sms';
import { sendPhoneOTPSchema } from '@/lib/validation/otpSchemas';
import {
  sendRateLimiter,
  handleValidationError,
  handleRateLimit,
  handleError,
  createSendSuccessResponse
} from '@/lib/utils/otpHelpers';

/**
 * POST /api/otp/phone/send - Send OTP to phone
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = sendPhoneOTPSchema.safeParse(body);
    if (!validationResult.success) {
      return handleValidationError(validationResult.error);
    }

    const { value: phone, purpose } = validationResult.data;

    // Check rate limit
    const rateLimitResponse = await handleRateLimit(
      sendRateLimiter,
      phone,
      'Please wait'
    );
    if (rateLimitResponse) return rateLimitResponse;

    // Connect to database
    await connectDB();

    // Create and send OTP
    const otp = await OTP.createOTP(phone, 'phone', purpose);
    await sendOTPSMS(phone, otp.code);

    return createSendSuccessResponse('phone', phone, 'twilio');

  } catch (error) {
    return handleError(error, 'Send OTP');
  }
}
