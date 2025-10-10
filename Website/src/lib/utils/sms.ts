import twilio from 'twilio';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

let twilioClient: ReturnType<typeof twilio> | null = null;

// Initialize Twilio client
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
} else {
  console.warn('Twilio credentials not configured');
}

interface SMSOptions {
  to: string;
  body: string;
}

/**
 * Send SMS using Twilio
 */
export async function sendSMS(options: SMSOptions): Promise<boolean> {
  if (!twilioClient) {
    console.error('Twilio client not initialized');
    return false;
  }

  if (!TWILIO_PHONE_NUMBER) {
    console.error('Twilio phone number not configured');
    return false;
  }

  try {
    const message = await twilioClient.messages.create({
      body: options.body,
      from: TWILIO_PHONE_NUMBER,
      to: options.to
    });

    console.log(`SMS sent successfully to ${options.to}, SID: ${message.sid}`);
    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
}

/**
 * Send OTP SMS
 */
export async function sendOTPSMS(phone: string, otp: string): Promise<boolean> {
  const body = `Your StudentNest verification code is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;

  return sendSMS({
    to: phone,
    body
  });
}

/**
 * Send welcome SMS
 */
export async function sendWelcomeSMS(phone: string, name: string, role: 'student' | 'owner'): Promise<boolean> {
  const roleText = role === 'student' ? 'Student' : 'Property Owner';
  const body = `Welcome to StudentNest, ${name}! Your ${roleText} account has been created successfully. Start exploring now!`;

  return sendSMS({
    to: phone,
    body
  });
}

/**
 * Send booking confirmation SMS
 */
export async function sendBookingConfirmationSMS(
  phone: string,
  propertyName: string,
  bookingId: string
): Promise<boolean> {
  const body = `Your booking at ${propertyName} has been confirmed! Booking ID: ${bookingId}. Check your email for details.`;

  return sendSMS({
    to: phone,
    body
  });
}

/**
 * Send verification reminder SMS
 */
export async function sendVerificationReminderSMS(phone: string, name: string): Promise<boolean> {
  const body = `Hi ${name}, complete your StudentNest profile verification to unlock all features. Visit your profile to get started.`;

  return sendSMS({
    to: phone,
    body
  });
}
