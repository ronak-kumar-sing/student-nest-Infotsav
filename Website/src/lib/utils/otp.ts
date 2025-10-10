import OTP from '@/lib/models/OTP';
import { sendOTPEmail } from './email';
import { sendOTPSMS } from './sms';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

/**
 * Generate a random 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create and send OTP via email
 */
export async function sendOTPViaEmail(email: string): Promise<{ success: boolean; message: string }> {
  try {
    // Check if there's a recent OTP (within last minute to prevent spam)
    const recentOTP = await OTP.findOne({
      identifier: email,
      type: 'email',
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) } // Last 1 minute
    });

    if (recentOTP) {
      return {
        success: false,
        message: 'Please wait before requesting another OTP'
      };
    }

    // Generate new OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Save OTP to database
    await OTP.create({
      identifier: email,
      type: 'email',
      code,
      expiresAt
    });

    // Send OTP via email
    const emailSent = await sendOTPEmail(email, code);

    if (!emailSent) {
      return {
        success: false,
        message: 'Failed to send OTP email'
      };
    }

    return {
      success: true,
      message: 'OTP sent successfully to your email'
    };
  } catch (error) {
    console.error('Error sending OTP via email:', error);
    return {
      success: false,
      message: 'Failed to send OTP'
    };
  }
}

/**
 * Create and send OTP via SMS
 */
export async function sendOTPViaPhone(phone: string): Promise<{ success: boolean; message: string }> {
  try {
    // Check if there's a recent OTP (within last minute to prevent spam)
    const recentOTP = await OTP.findOne({
      identifier: phone,
      type: 'phone',
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) } // Last 1 minute
    });

    if (recentOTP) {
      return {
        success: false,
        message: 'Please wait before requesting another OTP'
      };
    }

    // Generate new OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Save OTP to database
    await OTP.create({
      identifier: phone,
      type: 'phone',
      code,
      expiresAt
    });

    // Send OTP via SMS
    const smsSent = await sendOTPSMS(phone, code);

    if (!smsSent) {
      return {
        success: false,
        message: 'Failed to send OTP SMS'
      };
    }

    return {
      success: true,
      message: 'OTP sent successfully to your phone'
    };
  } catch (error) {
    console.error('Error sending OTP via SMS:', error);
    return {
      success: false,
      message: 'Failed to send OTP'
    };
  }
}

/**
 * Verify OTP
 */
export async function verifyOTP(
  identifier: string,
  code: string,
  type: 'email' | 'phone'
): Promise<{ success: boolean; message: string }> {
  try {
    // Find the OTP
    const otp = await OTP.findOne({
      identifier,
      type,
      isUsed: false
    }).sort({ createdAt: -1 }); // Get the most recent

    if (!otp) {
      return {
        success: false,
        message: 'Invalid or expired OTP'
      };
    }

    // Check if OTP has expired
    if (otp.expiresAt < new Date()) {
      return {
        success: false,
        message: 'OTP has expired'
      };
    }

    // Check if max attempts exceeded
    if (otp.attempts >= MAX_OTP_ATTEMPTS) {
      return {
        success: false,
        message: 'Maximum OTP verification attempts exceeded'
      };
    }

    // Verify the code
    if (otp.code !== code) {
      // Increment attempts
      otp.attempts += 1;
      await otp.save();

      return {
        success: false,
        message: `Invalid OTP. ${MAX_OTP_ATTEMPTS - otp.attempts} attempts remaining`
      };
    }

    // Mark OTP as used
    otp.isUsed = true;
    await otp.save();

    return {
      success: true,
      message: 'OTP verified successfully'
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      success: false,
      message: 'Failed to verify OTP'
    };
  }
}

/**
 * Clean up expired OTPs (can be called periodically)
 */
export async function cleanupExpiredOTPs(): Promise<number> {
  try {
    const result = await OTP.deleteMany({
      expiresAt: { $lt: new Date() }
    });

    console.log(`Cleaned up ${result.deletedCount} expired OTPs`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up expired OTPs:', error);
    return 0;
  }
}

/**
 * Resend OTP
 */
export async function resendOTP(
  identifier: string,
  type: 'email' | 'phone'
): Promise<{ success: boolean; message: string }> {
  // Mark existing OTPs as used
  await OTP.updateMany(
    { identifier, type, isUsed: false },
    { isUsed: true }
  );

  // Send new OTP
  if (type === 'email') {
    return sendOTPViaEmail(identifier);
  } else {
    return sendOTPViaPhone(identifier);
  }
}
