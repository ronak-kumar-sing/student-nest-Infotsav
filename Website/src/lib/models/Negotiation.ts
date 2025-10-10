import mongoose, { Schema, Document } from 'mongoose';

export interface NegotiationDocument extends Document {
  room: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;
  originalPrice: number;
  proposedPrice: number;
  counterOffer?: number;
  finalPrice?: number;
  message?: string;
  ownerResponse?: string;
  counterMessage?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'withdrawn';
  responseDate?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const negotiationSchema = new Schema<NegotiationDocument>(
  {
    room: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    proposedPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (value: number) {
          return value <= this.originalPrice;
        },
        message: 'Proposed price cannot be higher than original price',
      },
    },
    counterOffer: {
      type: Number,
      min: 0,
      validate: {
        validator: function (value: number) {
          // Counter offer should be between proposed price and original price
          return !value || (value >= this.proposedPrice && value <= this.originalPrice);
        },
        message: 'Counter offer must be between proposed price and original price',
      },
    },
    finalPrice: {
      type: Number,
      min: 0,
    },
    message: {
      type: String,
      maxlength: 1000,
      trim: true,
    },
    ownerResponse: {
      type: String,
      maxlength: 1000,
      trim: true,
    },
    counterMessage: {
      type: String,
      maxlength: 1000,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'countered', 'withdrawn'],
      default: 'pending',
    },
    responseDate: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      default: function () {
        // Negotiations expire after 7 days
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
negotiationSchema.index({ student: 1, createdAt: -1 });
negotiationSchema.index({ owner: 1, status: 1, createdAt: -1 });
negotiationSchema.index({ room: 1, student: 1 }, { unique: true }); // One negotiation per student per room
negotiationSchema.index({ status: 1, expiresAt: 1 });

// Virtual to check if negotiation is expired
negotiationSchema.virtual('isExpired').get(function (this: NegotiationDocument) {
  return this.expiresAt && this.expiresAt < new Date();
});

// Virtual to get discount percentage
negotiationSchema.virtual('discountPercentage').get(function (this: NegotiationDocument) {
  const finalPrice = this.finalPrice || this.counterOffer || this.proposedPrice;
  return Math.round(((this.originalPrice - finalPrice) / this.originalPrice) * 100);
});

// Virtual to get savings amount
negotiationSchema.virtual('savingsAmount').get(function (this: NegotiationDocument) {
  const finalPrice = this.finalPrice || this.counterOffer || this.proposedPrice;
  return this.originalPrice - finalPrice;
});

// Virtual to check if negotiation is actionable
negotiationSchema.virtual('isActionable').get(function (this: NegotiationDocument) {
  return this.status === 'pending' || this.status === 'countered';
});

// Pre-save middleware
negotiationSchema.pre('save', function (next) {
  // Set responseDate when status changes from pending
  if (this.isModified('status') && this.status !== 'pending' && !this.responseDate) {
    this.responseDate = new Date();
  }

  // Set final price when accepted
  if (this.status === 'accepted' && !this.finalPrice) {
    this.finalPrice = this.counterOffer || this.proposedPrice;
  }

  next();
});

// Static method to get negotiations by student
negotiationSchema.statics.getByStudent = function (studentId: string, status?: string) {
  const query: any = { student: studentId };
  if (status) query.status = status;

  return this.find(query)
    .populate('room', 'title price location images')
    .populate('owner', 'fullName email phone')
    .sort({ createdAt: -1 });
};

// Static method to get negotiations by owner
negotiationSchema.statics.getByOwner = function (ownerId: string, status?: string) {
  const query: any = { owner: ownerId };
  if (status) query.status = status;

  return this.find(query)
    .populate('room', 'title price location images')
    .populate('student', 'fullName email phone collegeId course')
    .sort({ createdAt: -1 });
};

// Static method to get negotiations for a room
negotiationSchema.statics.getByRoom = function (roomId: string, status?: string) {
  const query: any = { room: roomId };
  if (status) query.status = status;

  return this.find(query)
    .populate('student', 'fullName email phone collegeId')
    .sort({ createdAt: -1 });
};

// Instance method to accept negotiation
negotiationSchema.methods.accept = function (ownerResponse?: string) {
  this.status = 'accepted';
  this.responseDate = new Date();
  if (ownerResponse) this.ownerResponse = ownerResponse;
  this.finalPrice = this.counterOffer || this.proposedPrice;
  return this.save();
};

// Instance method to reject negotiation
negotiationSchema.methods.reject = function (ownerResponse?: string) {
  this.status = 'rejected';
  this.responseDate = new Date();
  if (ownerResponse) this.ownerResponse = ownerResponse;
  return this.save();
};

// Instance method to counter negotiation
negotiationSchema.methods.counter = function (counterOffer: number, counterMessage?: string) {
  this.status = 'countered';
  this.responseDate = new Date();
  this.counterOffer = counterOffer;
  if (counterMessage) this.counterMessage = counterMessage;
  // Extend expiry by 3 more days for counter negotiation
  this.expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  return this.save();
};

// Instance method to withdraw negotiation
negotiationSchema.methods.withdraw = function () {
  this.status = 'withdrawn';
  return this.save();
};

// Export model
const Negotiation = mongoose.models.Negotiation ||
  mongoose.model<NegotiationDocument>('Negotiation', negotiationSchema);

export default Negotiation;