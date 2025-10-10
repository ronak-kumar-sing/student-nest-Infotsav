import mongoose, { Schema } from 'mongoose';
import User, { IUserDocument } from './User';

// Interface for Owner document
interface IOwnerDocument extends IUserDocument {
  city?: string;
  state?: string;
  bio?: string;
  businessName?: string;
  businessType: 'individual' | 'company' | 'partnership';
  businessDescription?: string;
  gstNumber?: string;
  experience?: number;
  licenseNumber?: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country: string;
  };
  verification: {
    status: string;
    aadhaarNumber?: string;
    aadhaarDocument?: string;
    digilockerLinked: boolean;
    digilockerData?: {
      name?: string;
      dob?: Date;
      gender?: string;
      address?: string;
    };
    verificationDocuments: Array<{
      type: string;
      url: string;
      uploadedAt: Date;
    }>;
    verifiedAt?: Date;
    rejectionReason?: string;
  };
  properties: mongoose.Types.ObjectId[];
  stats: {
    totalProperties: number;
    activeListings: number;
    totalBookings: number;
    averageRating: number;
    responseTime: number;
  };
  profileCompleteness: number;
}

// Owner-specific schema extending User
const ownerSchema = new Schema<IOwnerDocument>({
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    maxlength: 500,
    trim: true
  },
  businessName: {
    type: String,
    trim: true
  },
  businessType: {
    type: String,
    enum: ['individual', 'company', 'partnership'],
    default: 'individual'
  },
  businessDescription: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  gstNumber: {
    type: String,
    trim: true,
    validate: {
      validator: function(gst: string) {
        return !gst || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst);
      },
      message: 'Please enter a valid GST number'
    }
  },
  experience: {
    type: Number,
    min: 0
  },
  licenseNumber: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  verification: {
    status: {
      type: String,
      enum: ['pending', 'in-review', 'verified', 'rejected'],
      default: 'pending'
    },
    aadhaarNumber: {
      type: String,
      validate: {
        validator: function(aadhaar: string) {
          return !aadhaar || /^\d{12}$/.test(aadhaar);
        },
        message: 'Aadhaar number must be 12 digits'
      }
    },
    aadhaarDocument: String,
    digilockerLinked: {
      type: Boolean,
      default: false
    },
    digilockerData: {
      name: String,
      dob: Date,
      gender: String,
      address: String
    },
    verificationDocuments: [{
      type: String,
      url: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    verifiedAt: Date,
    rejectionReason: String
  },
  properties: [{
    type: Schema.Types.ObjectId,
    ref: 'Property'
  }],
  stats: {
    totalProperties: {
      type: Number,
      default: 0
    },
    activeListings: {
      type: Number,
      default: 0
    },
    totalBookings: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    responseTime: {
      type: Number,
      default: 0
    }
  },
  profileCompleteness: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
});

// Calculate profile completeness before saving
ownerSchema.pre('save', function(next) {
  const requiredFields = ['fullName', 'email', 'phone'];
  const optionalFields = ['city', 'state', 'bio', 'businessName', 'businessDescription', 'profilePhoto'];
  const verificationFields = ['verification.aadhaarNumber', 'verification.aadhaarDocument'];

  let completeness = 0;
  const requiredWeight = 40;
  const optionalWeight = 30;
  const verificationWeight = 30;

  // Check required fields
  const requiredComplete = requiredFields.filter(field => {
    const value = (this as any)[field];
    return value && value.toString().trim() !== '';
  }).length;
  completeness += (requiredComplete / requiredFields.length) * requiredWeight;

  // Check optional fields
  const optionalComplete = optionalFields.filter(field => {
    const value = (this as any)[field];
    return value && value.toString().trim() !== '';
  }).length;
  completeness += (optionalComplete / optionalFields.length) * optionalWeight;

  // Check verification
  if (this.verification?.status === 'verified') {
    completeness += verificationWeight;
  } else if (this.verification?.aadhaarDocument) {
    completeness += verificationWeight / 2;
  }

  this.profileCompleteness = Math.round(completeness);
  next();
});

// Create discriminator model
const Owner = (User.discriminators?.Owner || User.discriminator<IOwnerDocument>('Owner', ownerSchema)) as mongoose.Model<IOwnerDocument>;

export default Owner;
export type { IOwnerDocument };
