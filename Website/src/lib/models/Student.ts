import mongoose, { Schema } from 'mongoose';
import User, { IUserDocument } from './User';

// Compatibility Assessment Interface
interface ICompatibilityAssessment {
  sleepSchedule: 'early_bird' | 'night_owl' | 'flexible';
  cleanliness: 'very_clean' | 'moderately_clean' | 'relaxed';
  studyHabits: 'silent' | 'quiet' | 'moderate_noise' | 'flexible';
  socialLevel: 'very_social' | 'moderately_social' | 'quiet' | 'prefer_alone';
  cookingFrequency: 'daily' | 'often' | 'sometimes' | 'rarely';
  musicPreference: 'silent' | 'low_volume' | 'moderate' | 'loud';
  guestPolicy: 'no_guests' | 'rare_guests' | 'occasional_guests' | 'frequent_guests';
  smokingTolerance: 'no_smoking' | 'outdoor_only' | 'tolerant';
  petFriendly: 'love_pets' | 'okay_with_pets' | 'no_pets';
  workSchedule: 'regular_hours' | 'flexible' | 'night_shift' | 'student_only';
  sharingPreferences?: string[];
  dealBreakers?: string[];
  updatedAt?: Date;
}

// Interface for Student document
interface IStudentDocument extends IUserDocument {
  collegeId: string;
  collegeName: string;
  course?: string;
  yearOfStudy?: number;
  city?: string;
  state?: string;
  bio?: string;
  preferences: {
    roomTypePreference: string[];
    budgetMin: number;
    budgetMax: number;
    locationPreferences: string[];
    amenityPreferences: string[];
  };
  verification: {
    status: string;
    collegeIdCard?: string;
    aadhaarCard?: string;
    verifiedAt?: Date;
    rejectionReason?: string;
  };
  compatibilityAssessment?: ICompatibilityAssessment;
  lastActive: Date;
  viewCount: number;
  savedProperties: mongoose.Types.ObjectId[];
  profileCompleteness: number;
}

// Student-specific schema extending User
const studentSchema = new Schema<IStudentDocument>({
  collegeId: {
    type: String,
    required: true,
    trim: true
  },
  collegeName: {
    type: String,
    required: true,
    trim: true
  },
  course: {
    type: String,
    trim: true
  },
  yearOfStudy: {
    type: Number,
    min: 1,
    max: 6
  },
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
  preferences: {
    roomTypePreference: [{
      type: String,
      enum: ['single', 'shared', 'studio', 'pg']
    }],
    budgetMin: {
      type: Number,
      min: 2000,
      max: 50000,
      default: 5000
    },
    budgetMax: {
      type: Number,
      min: 2000,
      max: 50000,
      default: 15000
    },
    locationPreferences: [{
      type: String
    }],
    amenityPreferences: [{
      type: String
    }]
  },
  verification: {
    status: {
      type: String,
      enum: ['pending', 'in-review', 'verified', 'rejected'],
      default: 'pending'
    },
    collegeIdCard: {
      type: String
    },
    aadhaarCard: {
      type: String
    },
    verifiedAt: Date,
    rejectionReason: String
  },
  compatibilityAssessment: {
    sleepSchedule: {
      type: String,
      enum: ['early_bird', 'night_owl', 'flexible']
    },
    cleanliness: {
      type: String,
      enum: ['very_clean', 'moderately_clean', 'relaxed']
    },
    studyHabits: {
      type: String,
      enum: ['silent', 'quiet', 'moderate_noise', 'flexible']
    },
    socialLevel: {
      type: String,
      enum: ['very_social', 'moderately_social', 'quiet', 'prefer_alone']
    },
    cookingFrequency: {
      type: String,
      enum: ['daily', 'often', 'sometimes', 'rarely']
    },
    musicPreference: {
      type: String,
      enum: ['silent', 'low_volume', 'moderate', 'loud']
    },
    guestPolicy: {
      type: String,
      enum: ['no_guests', 'rare_guests', 'occasional_guests', 'frequent_guests']
    },
    smokingTolerance: {
      type: String,
      enum: ['no_smoking', 'outdoor_only', 'tolerant']
    },
    petFriendly: {
      type: String,
      enum: ['love_pets', 'okay_with_pets', 'no_pets']
    },
    workSchedule: {
      type: String,
      enum: ['regular_hours', 'flexible', 'night_shift', 'student_only']
    },
    sharingPreferences: [{ type: String }],
    dealBreakers: [{ type: String }],
    updatedAt: Date
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  viewCount: {
    type: Number,
    default: 0
  },
  savedProperties: [{
    type: Schema.Types.ObjectId,
    ref: 'Property'
  }],
  profileCompleteness: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
});

// Calculate profile completeness before saving
studentSchema.pre('save', function(next) {
  const requiredFields = ['fullName', 'email', 'phone', 'collegeId', 'collegeName'];
  const optionalFields = ['course', 'yearOfStudy', 'city', 'state', 'bio', 'profilePhoto'];

  let completeness = 0;
  const requiredWeight = 60;
  const optionalWeight = 40;

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

  this.profileCompleteness = Math.round(completeness);
  next();
});

// Create discriminator model
const Student = (User.discriminators?.Student || User.discriminator<IStudentDocument>('Student', studentSchema)) as mongoose.Model<IStudentDocument>;

export default Student;
export type { IStudentDocument, ICompatibilityAssessment };
