import mongoose, { Schema, Document, Model } from 'mongoose';
import type { Booking as BookingType } from '@/types';

export interface BookingDocument extends Omit<BookingType, '_id'>, Document {}

const bookingSchema = new Schema<BookingDocument>(
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

    moveInDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (date: Date) {
          return date >= new Date();
        },
        message: 'Move-in date must be in the future',
      },
    },
    moveOutDate: {
      type: Date,
    },

    duration: {
      type: Number,
      required: true,
      min: 1,
      max: 60, // 5 years max
    },

    monthlyRent: {
      type: Number,
      required: true,
      min: 0,
    },
    securityDeposit: {
      type: Number,
      required: true,
      min: 0,
    },
    maintenanceCharges: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'rejected'],
      default: 'pending',
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'refunded', 'failed'],
      default: 'pending',
    },
    paymentDetails: {
      securityDepositPaid: {
        type: Number,
        default: 0,
      },
      firstMonthRentPaid: {
        type: Number,
        default: 0,
      },
      maintenancePaid: {
        type: Number,
        default: 0,
      },
      totalPaid: {
        type: Number,
        default: 0,
      },
      paymentMethod: {
        type: String,
        enum: ['online', 'cash', 'bank_transfer', 'upi'],
      },
      transactionId: String,
      paymentDate: Date,
    },

    agreementType: {
      type: String,
      enum: ['monthly', 'quarterly', 'half_yearly', 'yearly'],
      default: 'monthly',
    },
    agreementDocument: {
      url: String,
      uploadedAt: Date,
    },

    studentNotes: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    ownerNotes: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    adminNotes: {
      type: String,
      maxlength: 1000,
      trim: true,
    },

    confirmedAt: Date,
    rejectedAt: Date,
    cancelledAt: Date,
    completedAt: Date,

    cancellationReason: {
      type: String,
      maxlength: 500,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
    },

    // Check-in details
    checkInDetails: {
      checkedInAt: Date,
      checkedInBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      notes: {
        type: String,
        maxlength: 500,
      },
      meterReadings: {
        electricity: Number,
        water: Number,
        gas: Number,
      },
      roomCondition: {
        type: String,
        maxlength: 1000,
      },
      photos: [String],
    },

    // Check-out details
    checkOutDetails: {
      checkedOutAt: Date,
      checkedOutBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      notes: {
        type: String,
        maxlength: 500,
      },
      meterReadings: {
        electricity: Number,
        water: Number,
        gas: Number,
      },
      roomCondition: {
        type: String,
        maxlength: 1000,
      },
      photos: [String],
      damageCharges: {
        type: Number,
        default: 0,
      },
      cleaningCharges: {
        type: Number,
        default: 0,
      },
      utilityCharges: {
        type: Number,
        default: 0,
      },
      finalSettlement: Number,
    },

    // Extension requests
    extensionRequests: [
      {
        requestedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        requestedAt: {
          type: Date,
          default: Date.now,
        },
        extensionMonths: {
          type: Number,
          required: true,
          min: 1,
          max: 12,
        },
        reason: {
          type: String,
          maxlength: 500,
        },
        newMoveOutDate: {
          type: Date,
          required: true,
        },
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending',
        },
        respondedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        respondedAt: Date,
        rejectionReason: {
          type: String,
          maxlength: 500,
        },
      },
    ],

    // Review tracking
    studentReviewSubmitted: {
      type: Boolean,
      default: false,
    },
    ownerReviewSubmitted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
bookingSchema.index({ room: 1, status: 1 });
bookingSchema.index({ student: 1, status: 1 });
bookingSchema.index({ owner: 1, status: 1 });
bookingSchema.index({ moveInDate: 1 });
bookingSchema.index({ status: 1, paymentStatus: 1 });
bookingSchema.index({ createdAt: -1 });

const Booking: Model<BookingDocument> =
  (mongoose.models.Booking as Model<BookingDocument>) || mongoose.model<BookingDocument>('Booking', bookingSchema);

export default Booking;
