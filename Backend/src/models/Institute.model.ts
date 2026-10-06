import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IInstitute extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string; // e.g. "ABC-UNI"
  shortName?: string;
  city?: string;
  state?: string;
  country: string;
  type: 'UNIVERSITY' | 'COLLEGE' | 'INSTITUTE' | 'SCHOOL' | 'OTHER';
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE';
  requestedBy?: string; // userId of who requested it
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InstituteSchema = new Schema<IInstitute>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    shortName: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, default: 'India', trim: true },
    type: {
      type: String,
      enum: ['UNIVERSITY', 'COLLEGE', 'INSTITUTE', 'SCHOOL', 'OTHER'],
      default: 'COLLEGE'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PENDING', 'INACTIVE'],
      default: 'ACTIVE'
    },
    requestedBy: { type: String },
    verifiedAt: { type: Date }
  },
  {
    timestamps: true
  }
);

// Text index for searchable institute selector
InstituteSchema.index({ name: 'text', shortName: 'text', city: 'text' });

export const Institute = mongoose.model<IInstitute>('Institute', InstituteSchema);
