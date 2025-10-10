import mongoose, { Schema, Document, Model } from 'mongoose';
import type { Review as ReviewType } from '@/types';

export interface ReviewDocument extends Omit<ReviewType, '_id'>, Document {}

const reviewSchema = new Schema<ReviewDocument>(
  {
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },

    overallRating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },

    categories: {
      cleanliness: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },
      location: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },
      facilities: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },
      owner: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },
      value: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },
    },

    comment: {
      type: String,
      maxlength: 1000,
      trim: true,
    },

    stayDuration: {
      type: String,
      enum: [
        '1 month',
        '2 months',
        '3 months',
        '4 months',
        '5 months',
        '6 months',
        '7 months',
        '8 months',
        '9 months',
        '10 months',
        '11 months',
        '12+ months',
      ],
      required: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    helpfulUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    images: [
      {
        type: String,
        validate: {
          validator: function (url: string) {
            return /^https?:\/\/.+/.test(url);
          },
          message: 'Image must be a valid URL',
        },
      },
    ],

    isApproved: {
      type: Boolean,
      default: true,
    },
    moderationNotes: String,

    ownerResponse: {
      message: {
        type: String,
        maxlength: 500,
        trim: true,
      },
      respondedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
reviewSchema.index({ property: 1, createdAt: -1 });
reviewSchema.index({ student: 1 });
reviewSchema.index({ overallRating: -1 });
reviewSchema.index({ isApproved: 1, isVerified: 1 });
reviewSchema.index({ createdAt: -1 });

// Compound index for property reviews with ratings
reviewSchema.index({ property: 1, overallRating: -1, createdAt: -1 });

// Ensure one review per student per property per booking
reviewSchema.index({ property: 1, student: 1, booking: 1 }, { unique: true });

const Review: Model<ReviewDocument> =
  (mongoose.models.Review as Model<ReviewDocument>) || mongoose.model<ReviewDocument>('Review', reviewSchema);

export default Review;
