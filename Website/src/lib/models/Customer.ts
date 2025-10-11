import mongoose, { Schema, Model } from 'mongoose';

export interface ICustomer {
  userId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  razorpayCustomerId?: string; // Razorpay customer ID
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    razorpayCustomerId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
customerSchema.index({ userId: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ razorpayCustomerId: 1 });

const Customer: Model<ICustomer> =
  mongoose.models.Customer || mongoose.model<ICustomer>('Customer', customerSchema);

export default Customer;
