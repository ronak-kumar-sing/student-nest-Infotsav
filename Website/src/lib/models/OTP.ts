import mongoose, { Schema, Model, Document } from 'mongoose';

// Interface for OTP document
interface IOTPDocument extends Document {
  identifier: string;
  type: 'email' | 'phone';
  code: string;
  expiresAt: Date;
  isUsed: boolean;
  attempts: number;
  createdAt: Date;
}

// Interface for OTP model with static methods
interface IOTPModel extends Model<IOTPDocument> {
  createOTP(identifier: string, type: 'email' | 'phone', purpose?: string): Promise<IOTPDocument>;
  verifyOTP(identifier: string, type: 'email' | 'phone', code: string): Promise<{ success: boolean; message: string }>;
}

// OTP Schema
const otpSchema = new Schema<IOTPDocument, IOTPModel>({
  identifier: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['email', 'phone'],
    required: true
  },
  code: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index - documents auto-delete after expiry
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for faster queries
otpSchema.index({ identifier: 1, type: 1, isUsed: 1 });

// Static method to create OTP
otpSchema.statics.createOTP = async function(
  identifier: string,
  type: 'email' | 'phone',
  purpose?: string
): Promise<IOTPDocument> {
  // Generate 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Set expiry to 10 minutes from now
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Create OTP document
  const otp = await this.create({
    identifier,
    type,
    code,
    expiresAt,
    isUsed: false,
    attempts: 0
  });

  return otp;
};

// Static method to verify OTP
otpSchema.statics.verifyOTP = async function(
  identifier: string,
  type: 'email' | 'phone',
  code: string
): Promise<{ success: boolean; message: string }> {
  // Find the most recent unused OTP
  const otp = await this.findOne({
    identifier,
    type,
    isUsed: false
  }).sort({ createdAt: -1 });

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
  if (otp.attempts >= 5) {
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
      message: `Invalid OTP. ${5 - otp.attempts} attempts remaining`
    };
  }

  // Mark OTP as used
  otp.isUsed = true;
  await otp.save();

  return {
    success: true,
    message: 'OTP verified successfully'
  };
};

const OTP: IOTPModel = (mongoose.models.OTP as IOTPModel) || mongoose.model<IOTPDocument, IOTPModel>('OTP', otpSchema);

export default OTP;
export type { IOTPDocument };
