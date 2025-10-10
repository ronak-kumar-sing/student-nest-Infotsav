import mongoose, { Schema, Document, Model } from 'mongoose';
import type { Room as RoomType } from '@/types';

export interface RoomDocument extends Omit<RoomType, '_id'>, Document {
  occupancyRate: number;
  updateRating(): Promise<void>;
}

const roomSchema = new Schema<RoomDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    fullDescription: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
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
    roomType: {
      type: String,
      enum: ['single', 'shared', 'studio'],
      required: true,
    },
    accommodationType: {
      type: String,
      enum: ['pg', 'hostel', 'apartment', 'room'],
      required: true,
    },
    maxSharingCapacity: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },

    features: {
      area: {
        type: Number,
        min: 50,
        max: 2000,
      },
      floor: {
        type: Number,
        min: 0,
        max: 50,
      },
      totalFloors: {
        type: Number,
        min: 1,
        max: 50,
      },
      furnished: {
        type: Boolean,
        default: true,
      },
      balcony: {
        type: Boolean,
        default: false,
      },
      attached_bathroom: {
        type: Boolean,
        default: true,
      },
    },

    location: {
      address: {
        type: String,
        required: true,
        trim: true,
      },
      fullAddress: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      state: {
        type: String,
        required: true,
        trim: true,
      },
      pincode: {
        type: String,
        required: true,
        match: /^\d{6}$/,
      },
      coordinates: {
        lat: {
          type: Number,
          required: true,
          min: -90,
          max: 90,
        },
        lng: {
          type: Number,
          required: true,
          min: -180,
          max: 180,
        },
      },
      nearbyUniversities: [
        {
          name: String,
          distance: String,
          commute: String,
        },
      ],
      nearbyFacilities: [
        {
          name: String,
          distance: String,
          type: {
            type: String,
            enum: ['metro', 'bus', 'hospital', 'mall', 'market', 'restaurant', 'gym', 'bank'],
          },
        },
      ],
    },

    amenities: [
      {
        type: String,
        enum: [
          'wifi',
          'ac',
          'powerBackup',
          'security',
          'housekeeping',
          'laundry',
          'parking',
          'gym',
          'library',
          'cafeteria',
          'cctv',
          'geyser',
          'cooler',
          'fridge',
          'tv',
          'bed',
          'wardrobe',
          'study_table',
          'chair',
        ],
      },
    ],
    detailedAmenities: [
      {
        type: String,
      },
    ],

    availability: {
      isAvailable: {
        type: Boolean,
        default: true,
      },
      availableFrom: {
        type: Date,
        default: Date.now,
      },
      totalRooms: {
        type: Number,
        default: 1,
        min: 1,
      },
      availableRooms: {
        type: Number,
        default: 1,
        min: 0,
      },
    },

    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'blocked'],
      default: 'pending',
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
    electricityCharges: {
      type: String,
      enum: ['included', 'extra', 'shared'],
      default: 'included',
    },

    rules: {
      guestsAllowed: {
        type: Boolean,
        default: true,
      },
      smokingAllowed: {
        type: Boolean,
        default: false,
      },
      alcoholAllowed: {
        type: Boolean,
        default: false,
      },
      petsAllowed: {
        type: Boolean,
        default: false,
      },
      genderPreference: {
        type: String,
        enum: ['male', 'female', 'any'],
        default: 'any',
      },
      curfewTime: {
        type: String,
        default: 'No Curfew',
      },
    },

    totalRooms: {
      type: Number,
      default: 1,
      min: 1,
    },
    occupiedRooms: {
      type: Number,
      default: 0,
      min: 0,
    },

    tags: [
      {
        type: String,
      },
    ],

    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationNotes: String,

    totalBookings: {
      type: Number,
      default: 0,
    },
    monthlyRevenue: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
roomSchema.index({ 'location.city': 1, price: 1 });
roomSchema.index({ 'location.coordinates.lat': 1, 'location.coordinates.lng': 1 });
roomSchema.index({ owner: 1 });
roomSchema.index({ amenities: 1 });
roomSchema.index({ accommodationType: 1, roomType: 1 });
roomSchema.index({ status: 1, 'availability.isAvailable': 1 });
roomSchema.index({ rating: -1 });
roomSchema.index({ price: 1 });

// Virtual for occupancy rate
roomSchema.virtual('occupancyRate').get(function (this: RoomDocument) {
  if (this.totalRooms === 0) return 0;
  return Math.round((this.occupiedRooms / this.totalRooms) * 100);
});

// Pre-save middleware to update availability
roomSchema.pre('save', function (next) {
  if (this.occupiedRooms >= this.totalRooms) {
    this.availability.isAvailable = false;
  } else {
    this.availability.isAvailable = true;
  }
  next();
});

// Update room rating when reviews change
roomSchema.methods.updateRating = async function (this: RoomDocument) {
  try {
    const Review = mongoose.model('Review');
    const result = await Review.aggregate([
      { $match: { property: this._id } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$overallRating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    if (result.length > 0) {
      this.rating = Math.round(result[0].averageRating * 10) / 10;
      this.totalReviews = result[0].totalReviews;
    } else {
      this.rating = 0;
      this.totalReviews = 0;
    }

    await this.save();
  } catch (error) {
    console.error('Error updating room rating:', error);
  }
};

const Room: Model<RoomDocument> =
  (mongoose.models.Room as Model<RoomDocument>) || mongoose.model<RoomDocument>('Room', roomSchema);

export default Room;
