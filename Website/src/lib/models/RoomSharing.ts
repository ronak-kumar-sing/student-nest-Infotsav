import mongoose, { Document, Schema, Model } from 'mongoose';

// TypeScript interfaces
export interface IParticipant {
  user: mongoose.Types.ObjectId;
  joinedAt: Date;
  status: 'pending' | 'confirmed' | 'declined' | 'left';
  sharedAmount: number;
}

export interface IApplication {
  applicant: mongoose.Types.ObjectId;
  appliedAt: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  message?: string;
  compatibility?: {
    score: number;
    details?: {
      lifestyle?: number;
      preferences?: number;
      schedule?: number;
      cleanliness?: number;
    };
  };
  initiatorResponse?: {
    message?: string;
    respondedAt?: Date;
  };
}

export interface IRoomSharing extends Document {
  property: mongoose.Types.ObjectId;
  initiator: mongoose.Types.ObjectId;
  maxParticipants: number;
  currentParticipants: IParticipant[];

  requirements: {
    gender: 'male' | 'female' | 'any';
    ageRange: {
      min: number;
      max: number;
    };
    preferences: string[];
    lifestyle: string[];
    studyHabits?: string;
  };

  costSharing: {
    monthlyRent: number;
    rentPerPerson: number;
    securityDeposit: number;
    depositPerPerson: number;
    maintenanceCharges?: number;
    maintenancePerPerson?: number;
    utilitiesIncluded: boolean;
    utilitiesPerPerson: number;
  };

  description: string;

  roomConfiguration: {
    totalBeds: number;
    bedsAvailable: number;
    hasPrivateBathroom: boolean;
    hasSharedKitchen: boolean;
    hasStudyArea: boolean;
    hasStorage?: boolean;
  };

  status: 'active' | 'full' | 'cancelled' | 'inactive' | 'completed';
  availableFrom: Date;
  availableTill?: Date;

  applications: IApplication[];

  houseRules: string[];

  isOpenToMeetup: boolean;
  meetupPreferences: string[];

  views: number;
  interested: Array<{
    user: mongoose.Types.ObjectId;
    interestedAt: Date;
  }>;

  completedAt?: Date;
  completionReason?: string;
  tags: string[];
  isPriority: boolean;
  featuredTill?: Date;

  createdAt: Date;
  updatedAt: Date;

  // Virtual properties
  availableSlots: number;
  isFull: boolean;

  // Methods
  addParticipant(userId: mongoose.Types.ObjectId, sharedAmount: number): Promise<IRoomSharing>;
  removeParticipant(userId: mongoose.Types.ObjectId): Promise<IRoomSharing>;
  addApplication(applicantId: mongoose.Types.ObjectId, message?: string): Promise<IRoomSharing>;
  respondToApplication(applicationId: string, status: string, responseMessage?: string): Promise<IRoomSharing>;
  calculateCompatibility(userPreferences: any): number;
}

interface IRoomSharingModel extends Model<IRoomSharing> {
  findMatches(userPreferences: any, limit?: number): Promise<IRoomSharing[]>;
}

const roomSharingSchema = new Schema<IRoomSharing>({
  property: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  initiator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  maxParticipants: {
    type: Number,
    required: true,
    min: 2,
    max: 6,
    default: 2
  },

  currentParticipants: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'declined', 'left'],
      default: 'confirmed'
    },
    sharedAmount: {
      type: Number,
      required: true
    }
  }],

  requirements: {
    gender: {
      type: String,
      enum: ['male', 'female', 'any'],
      default: 'any'
    },
    ageRange: {
      min: {
        type: Number,
        min: 16,
        max: 50,
        default: 18
      },
      max: {
        type: Number,
        min: 18,
        max: 60,
        default: 30
      }
    },
    preferences: [{
      type: String
    }],
    lifestyle: [{
      type: String
    }],
    studyHabits: {
      type: String,
      enum: ['Focused', 'Balanced', 'Flexible', 'Serious']
    }
  },

  costSharing: {
    monthlyRent: {
      type: Number,
      required: true
    },
    rentPerPerson: {
      type: Number,
      required: true
    },
    securityDeposit: {
      type: Number,
      required: true
    },
    depositPerPerson: {
      type: Number,
      required: true
    },
    maintenanceCharges: {
      type: Number,
      default: 0
    },
    maintenancePerPerson: {
      type: Number,
      default: 0
    },
    utilitiesIncluded: {
      type: Boolean,
      default: true
    },
    utilitiesPerPerson: {
      type: Number,
      default: 0
    }
  },

  description: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },

  roomConfiguration: {
    totalBeds: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    bedsAvailable: {
      type: Number,
      required: true,
      min: 1
    },
    hasPrivateBathroom: {
      type: Boolean,
      default: false
    },
    hasSharedKitchen: {
      type: Boolean,
      default: true
    },
    hasStudyArea: {
      type: Boolean,
      default: true
    },
    hasStorage: {
      type: Boolean,
      default: true
    }
  },

  status: {
    type: String,
    enum: ['active', 'full', 'cancelled', 'inactive', 'completed'],
    default: 'active'
  },

  availableFrom: {
    type: Date,
    required: true
  },

  availableTill: {
    type: Date
  },

  applications: [{
    applicant: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
      default: 'pending'
    },
    message: {
      type: String,
      maxlength: 500
    },
    compatibility: {
      score: {
        type: Number,
        min: 0,
        max: 100
      },
      details: {
        lifestyle: Number,
        preferences: Number,
        schedule: Number,
        cleanliness: Number
      }
    },
    initiatorResponse: {
      message: String,
      respondedAt: Date
    }
  }],

  houseRules: [{
    type: String,
    maxlength: 200
  }],

  isOpenToMeetup: {
    type: Boolean,
    default: true
  },

  meetupPreferences: [{
    type: String,
    enum: ['coffee_chat', 'video_call', 'property_visit', 'public_place']
  }],

  views: {
    type: Number,
    default: 0
  },

  interested: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    interestedAt: {
      type: Date,
      default: Date.now
    }
  }],

  completedAt: Date,
  completionReason: String,

  tags: [{
    type: String,
    lowercase: true
  }],

  isPriority: {
    type: Boolean,
    default: false
  },

  featuredTill: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
roomSharingSchema.index({ status: 1, availableFrom: 1 });
roomSharingSchema.index({ initiator: 1, status: 1 });
roomSharingSchema.index({ property: 1, status: 1 });
roomSharingSchema.index({ 'requirements.gender': 1 });
roomSharingSchema.index({ 'costSharing.rentPerPerson': 1 });
roomSharingSchema.index({ createdAt: -1 });

// Virtuals
roomSharingSchema.virtual('availableSlots').get(function(this: IRoomSharing) {
  const confirmedParticipants = this.currentParticipants.filter(
    p => p.status === 'confirmed'
  ).length;
  return this.maxParticipants - confirmedParticipants;
});

roomSharingSchema.virtual('isFull').get(function(this: IRoomSharing) {
  const confirmedParticipants = this.currentParticipants.filter(
    p => p.status === 'confirmed'
  ).length;
  return this.maxParticipants <= confirmedParticipants;
});

// Pre-save middleware
roomSharingSchema.pre('save', function(next) {
  const confirmedCount = this.currentParticipants.filter(p => p.status === 'confirmed').length;
  const isFull = this.maxParticipants <= confirmedCount;

  if (isFull && this.status === 'active') {
    this.status = 'full';
  } else if (!isFull && this.status === 'full') {
    this.status = 'active';
  }

  // Calculate per-person amounts
  this.costSharing.rentPerPerson = Math.ceil(this.costSharing.monthlyRent / this.maxParticipants);
  this.costSharing.depositPerPerson = Math.ceil(this.costSharing.securityDeposit / this.maxParticipants);
  if (this.costSharing.maintenanceCharges) {
    this.costSharing.maintenancePerPerson = Math.ceil(this.costSharing.maintenanceCharges / this.maxParticipants);
  }

  next();
});

// Methods
roomSharingSchema.methods.addParticipant = async function(
  this: IRoomSharing,
  userId: mongoose.Types.ObjectId,
  sharedAmount: number
): Promise<IRoomSharing> {
  const confirmedCount = this.currentParticipants.filter(p => p.status === 'confirmed').length;
  if (this.maxParticipants <= confirmedCount) {
    throw new Error('Room sharing is already full');
  }

  this.currentParticipants.push({
    user: userId,
    sharedAmount,
    status: 'confirmed',
    joinedAt: new Date()
  });

  return await this.save();
};

roomSharingSchema.methods.removeParticipant = async function(
  this: IRoomSharing,
  userId: mongoose.Types.ObjectId
): Promise<IRoomSharing> {
  const participant = this.currentParticipants.find(
    p => p.user.toString() === userId.toString()
  );

  if (participant) {
    participant.status = 'left';
  }

  return await this.save();
};

roomSharingSchema.methods.addApplication = async function(
  this: IRoomSharing,
  applicantId: mongoose.Types.ObjectId,
  message?: string
): Promise<IRoomSharing> {
  const existingApplication = this.applications.find(
    app => app.applicant.toString() === applicantId.toString()
  );

  if (existingApplication) {
    throw new Error('Already applied for this room sharing');
  }

  this.applications.push({
    applicant: applicantId,
    message,
    appliedAt: new Date(),
    status: 'pending'
  });

  return await this.save();
};

roomSharingSchema.methods.respondToApplication = async function(
  this: IRoomSharing,
  applicationId: string,
  status: string,
  responseMessage?: string
): Promise<IRoomSharing> {
  const application = this.applications.id(applicationId);
  if (!application) {
    throw new Error('Application not found');
  }

  application.status = status as any;
  application.initiatorResponse = {
    message: responseMessage,
    respondedAt: new Date()
  };

  // If accepted, add to participants
  if (status === 'accepted') {
    const confirmedCount = this.currentParticipants.filter(p => p.status === 'confirmed').length;
    if (this.maxParticipants > confirmedCount) {
      await this.addParticipant(application.applicant, this.costSharing.rentPerPerson);
    }
  }

  return await this.save();
};

roomSharingSchema.methods.calculateCompatibility = function(
  this: IRoomSharing,
  userPreferences: any
): number {
  let score = 0;
  let totalCriteria = 0;

  // Gender compatibility
  if (this.requirements.gender === 'any' || this.requirements.gender === userPreferences.gender) {
    score += 20;
  }
  totalCriteria += 20;

  // Age compatibility
  if (userPreferences.age >= this.requirements.ageRange.min &&
      userPreferences.age <= this.requirements.ageRange.max) {
    score += 15;
  }
  totalCriteria += 15;

  // Preferences match
  const commonPreferences = this.requirements.preferences.filter(
    pref => userPreferences.preferences?.includes(pref)
  );
  score += (commonPreferences.length / Math.max(this.requirements.preferences.length, 1)) * 30;
  totalCriteria += 30;

  // Lifestyle compatibility
  const commonLifestyle = this.requirements.lifestyle.filter(
    lifestyle => userPreferences.lifestyle?.includes(lifestyle)
  );
  score += (commonLifestyle.length / Math.max(this.requirements.lifestyle.length, 1)) * 25;
  totalCriteria += 25;

  // Budget compatibility
  if (Math.abs(userPreferences.budget - this.costSharing.rentPerPerson) <= 1000) {
    score += 10;
  }
  totalCriteria += 10;

  return Math.round((score / totalCriteria) * 100);
};

// Static methods
roomSharingSchema.statics.findMatches = function(
  this: IRoomSharingModel,
  userPreferences: any,
  limit: number = 10
): Promise<IRoomSharing[]> {
  const query: any = {
    status: 'active',
    availableFrom: { $lte: new Date(userPreferences.moveInDate || Date.now()) }
  };

  // Gender filter
  if (userPreferences.gender && userPreferences.gender !== 'any') {
    query['requirements.gender'] = { $in: ['any', userPreferences.gender] };
  }

  // Budget filter
  if (userPreferences.maxBudget) {
    query['costSharing.rentPerPerson'] = { $lte: userPreferences.maxBudget };
  }

  return this.find(query)
    .populate('property', 'title location images')
    .populate('initiator', 'fullName profilePhoto isVerified')
    .sort({ createdAt: -1 })
    .limit(limit)
    .exec();
};

const RoomSharing = (mongoose.models.RoomSharing as IRoomSharingModel) ||
  mongoose.model<IRoomSharing, IRoomSharingModel>('RoomSharing', roomSharingSchema);

export default RoomSharing;
