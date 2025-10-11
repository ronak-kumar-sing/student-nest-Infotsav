import mongoose, { Schema, Model } from 'mongoose';

export interface ITransaction {
  orderId: string; // Razorpay order ID
  paymentId?: string; // Razorpay payment ID
  signature?: string; // Razorpay signature for verification
  amount: number; // Amount in smallest currency unit (paise for INR)
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  method?: string; // card, netbanking, wallet, upi, etc.
  userId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId; // Reference to booking if applicable
  propertyId?: mongoose.Types.ObjectId; // Reference to property/room
  description?: string;
  receipt?: string; // Custom receipt number
  notes?: Record<string, any>;
  errorCode?: string;
  errorDescription?: string;
  refundId?: string; // If refunded
  refundAmount?: number;
  refundStatus?: string;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    paymentId: {
      type: String,
      trim: true,
      sparse: true, // Allow multiple null values
    },
    signature: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['created', 'authorized', 'captured', 'refunded', 'failed'],
      default: 'created',
    },
    method: {
      type: String,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
    },
    description: {
      type: String,
      trim: true,
    },
    receipt: {
      type: String,
      trim: true,
    },
    notes: {
      type: Schema.Types.Mixed,
      default: {},
    },
    errorCode: {
      type: String,
      trim: true,
    },
    errorDescription: {
      type: String,
      trim: true,
    },
    refundId: {
      type: String,
      trim: true,
    },
    refundAmount: {
      type: Number,
      min: 0,
    },
    refundStatus: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
transactionSchema.index({ orderId: 1 });
transactionSchema.index({ paymentId: 1 });
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ bookingId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });

// Virtual for display amount (in rupees)
transactionSchema.virtual('displayAmount').get(function () {
  return (this.amount / 100).toFixed(2);
});

const Transaction: Model<ITransaction> =
  mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', transactionSchema);

export default Transaction;
