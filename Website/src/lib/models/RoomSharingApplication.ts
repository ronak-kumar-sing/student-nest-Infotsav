import mongoose, { Schema, Document } from 'mongoose';

export interface RoomSharingApplicationDocument extends Document {
  roomSharing: mongoose.Types.ObjectId;
  applicant: mongoose.Types.ObjectId;
  message: string;
  studyHabits: string;
  lifestyle: string;
  status: 'pending' | 'accepted' | 'rejected';
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const roomSharingApplicationSchema = new Schema<RoomSharingApplicationDocument>(
  {
    roomSharing: {
      type: Schema.Types.ObjectId,
      ref: 'RoomSharing',
      required: true,
    },
    applicant: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      maxlength: 1000,
      trim: true,
      default: '',
    },
    studyHabits: {
      type: String,
      maxlength: 500,
      trim: true,
      default: '',
    },
    lifestyle: {
      type: String,
      maxlength: 500,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: {
      type: String,
      maxlength: 500,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
roomSharingApplicationSchema.index({ roomSharing: 1, applicant: 1 }, { unique: true });
roomSharingApplicationSchema.index({ applicant: 1, createdAt: -1 });
roomSharingApplicationSchema.index({ roomSharing: 1, status: 1 });
roomSharingApplicationSchema.index({ status: 1, createdAt: -1 });

// Pre-save middleware
roomSharingApplicationSchema.pre('save', function (next) {
  // Set reviewedAt when status changes from pending
  if (this.isModified('status') && this.status !== 'pending' && !this.reviewedAt) {
    this.reviewedAt = new Date();
  }
  next();
});

// Virtual to check if application is still actionable
roomSharingApplicationSchema.virtual('isActionable').get(function (this: RoomSharingApplicationDocument) {
  return this.status === 'pending';
});

// Virtual to get days since application
roomSharingApplicationSchema.virtual('daysSinceApplication').get(function (this: RoomSharingApplicationDocument) {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
});

// Static method to get applications for a room sharing post
roomSharingApplicationSchema.statics.getByRoomSharing = function (roomSharingId: string, status?: string) {
  const query: any = { roomSharing: roomSharingId };
  if (status) query.status = status;

  return this.find(query)
    .populate('applicant', 'fullName email phone collegeId course yearOfStudy')
    .sort({ createdAt: -1 });
};

// Static method to get user's applications
roomSharingApplicationSchema.statics.getByApplicant = function (applicantId: string, status?: string) {
  const query: any = { applicant: applicantId };
  if (status) query.status = status;

  return this.find(query)
    .populate('roomSharing')
    .populate({
      path: 'roomSharing',
      populate: {
        path: 'property',
        select: 'title location images'
      }
    })
    .sort({ createdAt: -1 });
};

// Instance method to accept application
roomSharingApplicationSchema.methods.accept = function (reviewedBy?: string) {
  this.status = 'accepted';
  this.reviewedAt = new Date();
  if (reviewedBy) this.reviewedBy = reviewedBy;
  return this.save();
};

// Instance method to reject application
roomSharingApplicationSchema.methods.reject = function (reason?: string, reviewedBy?: string) {
  this.status = 'rejected';
  this.reviewedAt = new Date();
  if (reason) this.rejectionReason = reason;
  if (reviewedBy) this.reviewedBy = reviewedBy;
  return this.save();
};

// Export model
const RoomSharingApplication = mongoose.models.RoomSharingApplication ||
  mongoose.model<RoomSharingApplicationDocument>('RoomSharingApplication', roomSharingApplicationSchema);

export default RoomSharingApplication;