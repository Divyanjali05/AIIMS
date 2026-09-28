import mongoose, { Schema, Document } from 'mongoose';

export interface ToolEvidenceItem {
  id: string;
  toolId: string;
  claim: string;
  value: string;
  sourceUrl: string;
  sourceType: string;
  sourceTitle: string;
  publishedAt: string;
  verifiedAt: string;
  confidence: number;
  verificationStatus: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIED' | 'CONFLICTING' | 'EXPIRED';
}

export interface ToolEvidenceDocument extends Omit<ToolEvidenceItem, 'id'>, Document {
  id: string;
}

const ToolEvidenceSchema = new Schema<ToolEvidenceDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    toolId: { type: String, required: true, index: true },
    claim: { type: String, required: true },
    value: { type: String, required: true },
    sourceUrl: { type: String, required: true },
    sourceType: { type: String, required: true },
    sourceTitle: { type: String, required: true },
    publishedAt: { type: String, required: true },
    verifiedAt: { type: String, required: true },
    confidence: { type: Number, required: true, default: 0.9 },
    verificationStatus: {
      type: String,
      enum: ['VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED', 'CONFLICTING', 'EXPIRED'],
      default: 'VERIFIED',
      index: true
    }
  },
  { timestamps: true }
);

export const ToolEvidenceModel = mongoose.model<ToolEvidenceDocument>('ToolEvidence', ToolEvidenceSchema);
