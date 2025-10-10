import { NextResponse } from 'next/server';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { ZodError } from 'zod';

// Rate limiters
export const sendRateLimiter = new RateLimiterMemory({
  points: 3, // 3 requests
  duration: 60, // per 60 seconds
});

export const verifyRateLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 60, // per 60 seconds
});

// Helper to get client IP
export function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for') ||
         request.headers.get('x-real-ip') ||
         'unknown';
}

// Handle validation errors
export function handleValidationError(error: ZodError) {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      details: error.issues.map((issue) => issue.message)
    },
    { status: 400 }
  );
}

// Handle rate limiting
export async function handleRateLimit(
  rateLimiter: RateLimiterMemory,
  key: string,
  message: string
): Promise<NextResponse | null> {
  try {
    await rateLimiter.consume(key);
    return null;
  } catch (rateLimiterRes: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests',
        message: `${message} ${Math.round(rateLimiterRes.msBeforeNext / 1000)} seconds`,
        retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000)
      },
      { status: 429 }
    );
  }
}

// Handle errors
export function handleError(error: any, context: string) {
  console.error(`${context} error:`, error);
  return NextResponse.json(
    {
      success: false,
      error: 'Internal server error',
      message: 'Something went wrong. Please try again later.'
    },
    { status: 500 }
  );
}

// Create success response for sending OTP
export function createSendSuccessResponse(
  type: 'email' | 'phone',
  value: string,
  provider: string
) {
  return NextResponse.json({
    success: true,
    message: `OTP sent successfully to your ${type}`,
    data: {
      type,
      value,
      provider,
      expiresIn: 600 // 10 minutes
    }
  });
}

// Create success response for verifying OTP
export function createVerifySuccessResponse(type: 'email' | 'phone') {
  return NextResponse.json({
    success: true,
    message: `${type.charAt(0).toUpperCase() + type.slice(1)} verified successfully`,
    data: {
      verified: true,
      type
    }
  });
}

// Create error response for OTP verification
export function createVerifyErrorResponse(verification: { success: boolean; message: string }) {
  return NextResponse.json(
    {
      success: false,
      error: 'Verification failed',
      message: verification.message
    },
    { status: 400 }
  );
}
