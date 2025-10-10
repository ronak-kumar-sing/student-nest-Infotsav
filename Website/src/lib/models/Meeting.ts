import mongoose, { Schema, Document, Model } from 'mongoose';

export interface MeetingDocument extends Document {
  property: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;
  preferredDates?: Date[];
  confirmedDate?: Date;
  confirmedTime?: string;
  status: 'pending' | 'confirmed' | 'rescheduled' | 'cancelled' | 'completed' | 'no_show';
  meetingType: 'physical' | 'virtual' | 'phone';
  virtualMeetingDetails?: {
    platform?: 'zoom' | 'google_meet' | 'whatsapp' | 'phone';
    meetingLink?: string;
    meetingId?: string;
    passcode?: string;
  };
  studentNotes?: string;
  ownerNotes?: string;
  purpose: 'property_viewing' | 'discussion' | 'document_verification' | 'key_handover' | 'inspection';
  requirements?: string[];
  ownerResponseDate?: Date;
  studentConfirmationDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const meetingSchema = new Schema<MeetingDocument>(
  {
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    preferredDates: [{
      type: Date,
      validate: {
        validator: function(date: Date) {
          return date > new Date();
        },
        message: 'Preferred dates must be in the future'
      }
    }],
    confirmedDate: {
      type: Date,
      validate: {
        validator: function(date: Date) {
          return !date || date > new Date();
        },
        message: 'Confirmed date must be in the future'
      }
    },
    confirmedTime: {
      type: String,
      validate: {
        validator: function(time: string) {
          return !time || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
        },
        message: 'Time must be in HH:MM format'
      }
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'rescheduled', 'cancelled', 'completed', 'no_show'],
      default: 'pending'
    },
    meetingType: {
      type: String,
      enum: ['physical', 'virtual', 'phone'],
      default: 'physical'
    },
    virtualMeetingDetails: {
      platform: {
        type: String,
        enum: ['zoom', 'google_meet', 'whatsapp', 'phone']
      },
      meetingLink: String,
      meetingId: String,
      passcode: String
    },
    studentNotes: {
      type: String,
      maxlength: 500,
      trim: true
    },
    ownerNotes: {
      type: String,
      maxlength: 500,
      trim: true
    },
    purpose: {
      type: String,
      enum: ['property_viewing', 'discussion', 'document_verification', 'key_handover', 'inspection'],
      default: 'property_viewing'
    },
    requirements: [{
      type: String,
      enum: ['bring_documents', 'bring_guardian', 'advance_payment', 'id_proof', 'college_id']
    }],
    ownerResponseDate: Date,
    studentConfirmationDate: Date
  },
  {
    timestamps: true
  }
);

// Indexes
meetingSchema.index({ student: 1, status: 1 });
meetingSchema.index({ owner: 1, status: 1 });
meetingSchema.index({ property: 1 });
meetingSchema.index({ confirmedDate: 1 });

const Meeting: Model<MeetingDocument> = mongoose.models.Meeting || mongoose.model<MeetingDocument>('Meeting', meetingSchema);

export default Meeting;
