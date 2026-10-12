import mongoose, { Schema, Document } from 'mongoose';

export type EvidenceSourceType =
  | 'OFFICIAL_WEBSITE'
  | 'OFFICIAL_BLOG'
  | 'OFFICIAL_DOCS'
  | 'OFFICIAL_PRICING'
  | 'OFFICIAL_RELEASE'
  | 'GITHUB'
  | 'HUGGING_FACE'
  | 'OTHER_TRUSTED_SOURCE'
  | string;

export type EvidenceCredibility = 'HIGH' | 'MEDIUM' | 'LOW';

export type EvidenceVerificationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'UNVERIFIED'
  | 'CONFLICTING'
  | 'EXPIRED';

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
  verificationStatus: EvidenceVerificationStatus;
}

export interface ToolEvidenceDocument extends Omit<ToolEvidenceItem, 'id'>, Document {
  id: string;
}

export interface IToolEvidence extends Document {
  toolId: string;
  sourceType: EvidenceSourceType;
  sourceUrl: string;
  sourceName?: string;
  title?: string;
  evidenceText?: string;
  claim?: string;
  value?: string;
  discoveredAt?: Date;
  fetchedAt?: Date;
  publishedAt?: any;
  credibility?: EvidenceCredibility;
  verificationStatus: any;
  structuredData?: Record<string, any>;
  createdAt?: any;
  updatedAt?: any;
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
      enum: [
        'PENDING',
        'ACCEPTED',
        'REJECTED',
        'VERIFIED',
        'PARTIALLY_VERIFIED',
        'UNVERIFIED',
        'CONFLICTING',
        'EXPIRED'
      ],
      default: 'PENDING',
      index: true
    }
  },
  { timestamps: true }
);

export const ToolEvidenceModel = mongoose.model<ToolEvidenceDocument>('ToolEvidence', ToolEvidenceSchema);
