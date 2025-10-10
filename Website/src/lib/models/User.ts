import mongoose, { Schema, Model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// Interface for User document
interface IUserDocument extends Document {
  email: string;
  phone: string;
  password: string;
  fullName: string;
  profilePhoto: string | null;
  role: 'student' | 'owner' | 'Student' | 'Owner';
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isIdentityVerified: boolean;
  identityVerificationRequired: boolean;
  identityVerificationSkipped: boolean;
  savedRooms: mongoose.Types.ObjectId[];
  preferredLocations: Array<{
    address: string;
    city: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    radius: number;
    addedAt: Date;
  }>;
  currentLocation?: {
    coordinates: {
      lat: number;
      lng: number;
    };
    lastUpdated: Date;
  };
  isActive: boolean;
  lastLogin?: Date;
  refreshTokens: Array<{ token: string; createdAt: Date }>;
  loginAttempts: number;
  lockUntil?: Date;
  settings: Record<string, any>;
  comparePassword(candidatePassword: string): Promise<boolean>;
  isLocked(): boolean;
  incLoginAttempts(): Promise<any>;
  resetLoginAttempts(): Promise<any>;
  toPublicProfile(): any;
}

// Base User Schema
const userSchema = new Schema<IUserDocument>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Please enter a valid email address'
    }
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(phone: string) {
        return /^\+?\d{10,15}$/.test(phone);
      },
      message: 'Please enter a valid phone number'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    validate: {
      validator: function(password: string) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(password);
      },
      message: 'Password must contain at least 8 characters with uppercase, lowercase, number and special character'
    }
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  profilePhoto: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['student', 'owner', 'Student', 'Owner'],
    required: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isIdentityVerified: {
    type: Boolean,
    default: false
  },
  identityVerificationRequired: {
    type: Boolean,
    default: function(this: IUserDocument) {
      return this.role === 'owner' || this.role === 'Owner';
    }
  },
  identityVerificationSkipped: {
    type: Boolean,
    default: false
  },
  savedRooms: [{
    type: Schema.Types.ObjectId,
    ref: 'Room'
  }],
  preferredLocations: [{
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    coordinates: {
      lat: {
        type: Number,
        required: true
      },
      lng: {
        type: Number,
        required: true
      }
    },
    radius: {
      type: Number,
      default: 5 // Default 5km radius
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  currentLocation: {
    coordinates: {
      lat: Number,
      lng: Number
    },
    lastUpdated: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 604800 // 7 days
    }
  }],
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  settings: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  discriminatorKey: 'role'
});

// Indexes for faster queries (email, phone have unique:true which creates indexes automatically)
userSchema.index({ email: 1, role: 1 }); // Compound index for login queries
userSchema.index({ phone: 1, role: 1 }); // Compound index for phone login
userSchema.index({ isActive: 1 }); // Index for active users

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to check password
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
userSchema.methods.isLocked = function(): boolean {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = async function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1, loginAttempts: 1 }
    });
  }

  const updates: any = { $inc: { loginAttempts: 1 } };

  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = {
      lockUntil: Date.now() + 2 * 60 * 60 * 1000 // Lock for 2 hours
    };
  }

  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({
    $unset: { lockUntil: 1, loginAttempts: 1 }
  });
};

// Method to get public profile
userSchema.methods.toPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.refreshTokens;
  delete userObject.loginAttempts;
  delete userObject.lockUntil;
  return userObject;
};

// Role index already covered by compound indexes above

const User: Model<IUserDocument> = mongoose.models.User || mongoose.model<IUserDocument>('User', userSchema);

export default User;
export type { IUserDocument };
