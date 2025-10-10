/**
 * Unified Visit Request Model
 * Handles property visit scheduling for both students and owners
 * Supports bi-directional communication and flexible scheduling
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

// ==================== INTERFACES ====================

export interface ITimeSlot {
  date: Date;
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  isAvailable?: boolean;
}

export interface IProposal {
  proposedBy: 'student' | 'owner';
  timeSlots: ITimeSlot[];
  message?: string;
  createdAt: Date;
}

export interface IResponse {
  respondedBy: 'student' | 'owner';
  action: 'accept' | 'decline' | 'counter' | 'reschedule' | 'cancel';
  selectedSlot?: ITimeSlot;
  counterProposal?: ITimeSlot[];
  message?: string;
  createdAt: Date;
}

export interface IVisitDetails {
  confirmedSlot?: ITimeSlot;
  visitType: 'physical' | 'virtual' | 'hybrid';
  virtualDetails?: {
    platform: 'google_meet' | 'zoom' | 'whatsapp' | 'phone';
    meetingLink?: string;
    meetingId?: string;
    passcode?: string;
  };
  requirements?: string[];
  specialInstructions?: string;
}

export interface IParticipantInfo {
  userId: mongoose.Types.ObjectId;
  name?: string;
  phone?: string;
  email?: string;
  profilePhoto?: string;
  notes?: string;
  rating?: number;
  hasAttended?: boolean;
}

export interface IVisitRequestDocument extends Document {
  // Core References
  property: mongoose.Types.ObjectId;
  student: IParticipantInfo;
  owner: IParticipantInfo;

  // Request Metadata
  initiatedBy: 'student' | 'owner';
  requestType: 'property_viewing' | 'discussion' | 'inspection' | 'key_handover' | 'document_verification';
  priority: 'normal' | 'urgent' | 'flexible';

  // Status Management
  status: 'pending' | 'awaiting_student' | 'awaiting_owner' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';

  // Communication History
  proposals: IProposal[];
  responses: IResponse[];

  // Visit Details
  visitDetails: IVisitDetails;

  // Timeline
  requestedAt: Date;
  lastActivityAt: Date;
  confirmedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;

  // Metadata
  version: number; // Track negotiation rounds
  isActive: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Virtual Properties
  currentResponder: 'student' | 'owner' | null;
  negotiationRounds: number;
  latestProposal: IProposal | null;
  latestResponse: IResponse | null;
  isConfirmed: boolean;
  isPending: boolean;

  // Instance Methods
  addProposal(proposedBy: 'student' | 'owner', timeSlots: ITimeSlot[], message?: string): Promise<IVisitRequestDocument>;
  addResponse(respondedBy: 'student' | 'owner', action: 'accept' | 'decline' | 'counter' | 'reschedule' | 'cancel', data: Partial<IResponse>): Promise<IVisitRequestDocument>;
  markCompleted(studentAttended: boolean, ownerAttended: boolean, studentRating?: number, ownerRating?: number): Promise<IVisitRequestDocument>;
  cancel(cancelledBy: 'student' | 'owner', reason?: string): Promise<IVisitRequestDocument>;
  canRespond(userId: string, role: 'student' | 'owner'): boolean;
  getAvailableActions(userId: string, role: 'student' | 'owner'): string[];
}

// Static methods interface
export interface IVisitRequestModel extends Model<IVisitRequestDocument> {
  findForUser(userId: string, role: 'student' | 'owner', filters?: any): any;
  findPendingForUser(userId: string, role: 'student' | 'owner'): any;
  findUpcomingVisits(userId: string, role: 'student' | 'owner'): any;
  getStatistics(userId: string, role: 'student' | 'owner'): Promise<any>;
}

// ==================== SCHEMA ====================

const TimeSlotSchema = new Schema<ITimeSlot>({
  date: {
    type: Date,
    required: true,
    validate: {
      validator: function(date: Date) {
        return date > new Date();
      },
      message: 'Date must be in the future'
    }
  },
  startTime: {
    type: String,
    required: true,
    validate: {
      validator: function(time: string) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
      },
      message: 'Start time must be in HH:MM format'
    }
  },
  endTime: {
    type: String,
    required: true,
    validate: {
      validator: function(time: string) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
      },
      message: 'End time must be in HH:MM format'
    }
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const ProposalSchema = new Schema<IProposal>({
  proposedBy: {
    type: String,
    enum: ['student', 'owner'],
    required: true
  },
  timeSlots: {
    type: [TimeSlotSchema],
    required: true,
    validate: {
      validator: function(slots: ITimeSlot[]) {
        return slots && slots.length > 0 && slots.length <= 5;
      },
      message: 'Must provide 1-5 time slots'
    }
  },
  message: {
    type: String,
    maxlength: 500,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const ResponseSchema = new Schema<IResponse>({
  respondedBy: {
    type: String,
    enum: ['student', 'owner'],
    required: true
  },
  action: {
    type: String,
    enum: ['accept', 'decline', 'counter', 'reschedule', 'cancel'],
    required: true
  },
  selectedSlot: TimeSlotSchema,
  counterProposal: [TimeSlotSchema],
  message: {
    type: String,
    maxlength: 500,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const ParticipantInfoSchema = new Schema<IParticipantInfo>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: String,
  phone: String,
  email: String,
  profilePhoto: String,
  notes: {
    type: String,
    maxlength: 500
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  hasAttended: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const VisitDetailsSchema = new Schema<IVisitDetails>({
  confirmedSlot: TimeSlotSchema,
  visitType: {
    type: String,
    enum: ['physical', 'virtual', 'hybrid'],
    default: 'physical'
  },
  virtualDetails: {
    platform: {
      type: String,
      enum: ['google_meet', 'zoom', 'whatsapp', 'phone']
    },
    meetingLink: String,
    meetingId: String,
    passcode: String
  },
  requirements: [{
    type: String,
    enum: ['bring_documents', 'bring_guardian', 'advance_payment', 'id_proof', 'college_id', 'parent_consent']
  }],
  specialInstructions: {
    type: String,
    maxlength: 1000
  }
}, { _id: false });

const VisitRequestSchema = new Schema<IVisitRequestDocument>(
  {
    // Core References
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true
    },

    student: {
      type: ParticipantInfoSchema,
      required: true
    },

    owner: {
      type: ParticipantInfoSchema,
      required: true
    },

    // Request Metadata
    initiatedBy: {
      type: String,
      enum: ['student', 'owner'],
      required: true
    },

    requestType: {
      type: String,
      enum: ['property_viewing', 'discussion', 'inspection', 'key_handover', 'document_verification'],
      default: 'property_viewing'
    },

    priority: {
      type: String,
      enum: ['normal', 'urgent', 'flexible'],
      default: 'normal'
    },

    // Status Management
    status: {
      type: String,
      enum: ['pending', 'awaiting_student', 'awaiting_owner', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled'],
      default: 'pending',
      index: true
    },

    // Communication History
    proposals: {
      type: [ProposalSchema],
      default: []
    },

    responses: {
      type: [ResponseSchema],
      default: []
    },

    // Visit Details
    visitDetails: {
      type: VisitDetailsSchema,
      default: () => ({ visitType: 'physical' })
    },

    // Timeline
    requestedAt: {
      type: Date,
      default: Date.now
    },

    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    confirmedAt: Date,
    completedAt: Date,
    cancelledAt: Date,

    // Metadata
    version: {
      type: Number,
      default: 1
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// ==================== INDEXES ====================

VisitRequestSchema.index({ 'student.userId': 1, status: 1 });
VisitRequestSchema.index({ 'owner.userId': 1, status: 1 });
VisitRequestSchema.index({ property: 1, status: 1 });
VisitRequestSchema.index({ status: 1, lastActivityAt: -1 });
VisitRequestSchema.index({ initiatedBy: 1, status: 1 });
VisitRequestSchema.index({ 'visitDetails.confirmedSlot.date': 1 });

// ==================== VIRTUALS ====================

VisitRequestSchema.virtual('currentResponder').get(function() {
  if (this.status === 'awaiting_student') return 'student';
  if (this.status === 'awaiting_owner') return 'owner';
  if (this.status === 'pending') {
    return this.initiatedBy === 'student' ? 'owner' : 'student';
  }
  return null;
});

VisitRequestSchema.virtual('negotiationRounds').get(function() {
  return this.responses.length;
});

VisitRequestSchema.virtual('latestProposal').get(function() {
  return this.proposals.length > 0 ? this.proposals[this.proposals.length - 1] : null;
});

VisitRequestSchema.virtual('latestResponse').get(function() {
  return this.responses.length > 0 ? this.responses[this.responses.length - 1] : null;
});

VisitRequestSchema.virtual('isConfirmed').get(function() {
  return this.status === 'confirmed' && !!this.visitDetails.confirmedSlot;
});

VisitRequestSchema.virtual('isPending').get(function() {
  return ['pending', 'awaiting_student', 'awaiting_owner'].includes(this.status);
});

// ==================== INSTANCE METHODS ====================

// Add a proposal
VisitRequestSchema.methods.addProposal = async function(
  proposedBy: 'student' | 'owner',
  timeSlots: ITimeSlot[],
  message?: string
): Promise<IVisitRequestDocument> {
  this.proposals.push({
    proposedBy,
    timeSlots,
    message,
    createdAt: new Date()
  });

  this.version += 1;
  this.lastActivityAt = new Date();

  // Update status
  if (proposedBy === 'student') {
    this.status = 'awaiting_owner';
  } else {
    this.status = 'awaiting_student';
  }

  return await this.save();
};

// Add a response
VisitRequestSchema.methods.addResponse = async function(
  respondedBy: 'student' | 'owner',
  action: 'accept' | 'decline' | 'counter' | 'reschedule' | 'cancel',
  data: Partial<IResponse>
): Promise<IVisitRequestDocument> {

  const response: IResponse = {
    respondedBy,
    action,
    createdAt: new Date(),
    ...data
  };

  this.responses.push(response);
  this.lastActivityAt = new Date();

  // Update status based on action
  switch (action) {
    case 'accept':
      this.status = 'confirmed';
      this.confirmedAt = new Date();
      if (data.selectedSlot) {
        this.visitDetails.confirmedSlot = data.selectedSlot;
      }
      break;

    case 'decline':
      this.status = 'cancelled';
      this.cancelledAt = new Date();
      this.isActive = false;
      break;

    case 'counter':
      // Counter-proposal: switch who's waiting
      if (respondedBy === 'student') {
        this.status = 'awaiting_owner';
      } else {
        this.status = 'awaiting_student';
      }
      this.version += 1;
      break;

    case 'reschedule':
      this.status = 'rescheduled';
      this.version += 1;
      break;

    case 'cancel':
      this.status = 'cancelled';
      this.cancelledAt = new Date();
      this.isActive = false;
      break;
  }

  return await this.save();
};

// Complete the visit
VisitRequestSchema.methods.markCompleted = async function(
  studentAttended: boolean,
  ownerAttended: boolean,
  studentRating?: number,
  ownerRating?: number
): Promise<IVisitRequestDocument> {
  this.status = studentAttended && ownerAttended ? 'completed' : 'no_show';
  this.completedAt = new Date();
  this.isActive = false;

  this.student.hasAttended = studentAttended;
  this.owner.hasAttended = ownerAttended;

  if (studentRating) this.owner.rating = studentRating; // Student rates owner
  if (ownerRating) this.student.rating = ownerRating; // Owner rates student

  return await this.save();
};

// Cancel the visit
VisitRequestSchema.methods.cancel = async function(
  cancelledBy: 'student' | 'owner',
  reason?: string
): Promise<IVisitRequestDocument> {

  await this.addResponse(cancelledBy, 'cancel', { message: reason });

  return this as IVisitRequestDocument;
};

// Check if user can respond
VisitRequestSchema.methods.canRespond = function(userId: string, role: 'student' | 'owner'): boolean {
  if (!this.isActive) return false;
  if (!this.isPending) return false;

  const userIdStr = userId.toString();

  if (role === 'student') {
    return this.student.userId.toString() === userIdStr && this.status === 'awaiting_student';
  } else {
    return this.owner.userId.toString() === userIdStr && this.status === 'awaiting_owner';
  }
};

// Get available actions for user
VisitRequestSchema.methods.getAvailableActions = function(userId: string, role: 'student' | 'owner'): string[] {
  if (!this.canRespond(userId, role)) return [];

  const actions = ['accept', 'decline', 'counter'];

  if (this.status === 'confirmed') {
    actions.push('reschedule', 'cancel');
  }

  return actions;
};

// ==================== STATIC METHODS ====================

// Find visit requests for a user
VisitRequestSchema.statics.findForUser = function(
  userId: string,
  role: 'student' | 'owner',
  filters: any = {}
) {
  const query: any = { isActive: true };

  if (role === 'student') {
    query['student.userId'] = userId;
  } else {
    query['owner.userId'] = userId;
  }

  // Apply additional filters
  if (filters.status) query.status = filters.status;
  if (filters.property) query.property = filters.property;
  if (filters.requestType) query.requestType = filters.requestType;

  return this.find(query)
    .populate('property', 'title location images rent')
    .sort({ lastActivityAt: -1 });
};

// Find pending requests requiring action
VisitRequestSchema.statics.findPendingForUser = function(
  userId: string,
  role: 'student' | 'owner'
) {
  const query: any = { isActive: true };

  if (role === 'student') {
    query['student.userId'] = userId;
    query.status = 'awaiting_student';
  } else {
    query['owner.userId'] = userId;
    query.status = 'awaiting_owner';
  }

  return this.find(query)
    .populate('property', 'title location images')
    .sort({ lastActivityAt: -1 });
};

// Find upcoming confirmed visits
VisitRequestSchema.statics.findUpcomingVisits = function(
  userId: string,
  role: 'student' | 'owner'
) {
  const query: any = {
    status: 'confirmed',
    isActive: true,
    'visitDetails.confirmedSlot.date': { $gte: new Date() }
  };

  if (role === 'student') {
    query['student.userId'] = userId;
  } else {
    query['owner.userId'] = userId;
  }

  return this.find(query)
    .populate('property', 'title location images')
    .sort({ 'visitDetails.confirmedSlot.date': 1 });
};

// Get statistics for a user
VisitRequestSchema.statics.getStatistics = async function(
  userId: string,
  role: 'student' | 'owner'
) {
  const userField = role === 'student' ? 'student.userId' : 'owner.userId';

  const stats = await this.aggregate([
    { $match: { [userField]: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result: any = {
    total: 0,
    pending: 0,
    awaiting_response: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0
  };

  stats.forEach(stat => {
    result.total += stat.count;
    if (stat._id === 'awaiting_student' || stat._id === 'awaiting_owner' || stat._id === 'pending') {
      result.awaiting_response += stat.count;
    }
    result[stat._id] = stat.count;
  });

  return result;
};

// ==================== MIDDLEWARE ====================

// Pre-save: Update lastActivityAt
VisitRequestSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.lastActivityAt = new Date();
  }
  next();
});

// Pre-save: Validate time slots don't overlap
VisitRequestSchema.pre('save', function(next) {
  if (this.isModified('proposals')) {
    // Add custom validation if needed
  }
  next();
});

// ==================== MODEL ====================

const VisitRequest = (mongoose.models.VisitRequest ||
  mongoose.model<IVisitRequestDocument, IVisitRequestModel>('VisitRequest', VisitRequestSchema)) as IVisitRequestModel;

export default VisitRequest;
