import mongoose, { Schema, Document } from 'mongoose';

export interface ToolVersionRecord {
  id: string;
  toolId: string;
  version: string;
  changeType: 'NEW_RELEASE' | 'CAPABILITY_ADDED' | 'PRICING_CHANGE' | 'FREE_TIER_CHANGE' | 'MODEL_UPDATE' | 'STATUS_CHANGE' | 'MAJOR_PRODUCT_UPDATE';
  summary: string;
  previousValue?: string;
  newValue?: string;
  detectedAt: string;
  sourceUrls: string[];
  verifiedAt: string;
}

export interface ToolVersionDocument extends Omit<ToolVersionRecord, 'id'>, Document {
  id: string;
}

const ToolVersionSchema = new Schema<ToolVersionDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    toolId: { type: String, required: true, index: true },
    version: { type: String, required: true },
    changeType: {
      type: String,
      enum: ['NEW_RELEASE', 'CAPABILITY_ADDED', 'PRICING_CHANGE', 'FREE_TIER_CHANGE', 'MODEL_UPDATE', 'STATUS_CHANGE', 'MAJOR_PRODUCT_UPDATE'],
      required: true,
      index: true
    },
    summary: { type: String, required: true },
    previousValue: { type: String },
    newValue: { type: String },
    detectedAt: { type: String, required: true, index: true },
    sourceUrls: [{ type: String }],
    verifiedAt: { type: String, required: true }
  },
  { timestamps: true }
);

export const ToolVersionHistoryModel = mongoose.model<ToolVersionDocument>('ToolVersionHistory', ToolVersionSchema);
