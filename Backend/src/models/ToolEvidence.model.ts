import mongoose, { Schema, Document } from 'mongoose';

// ==========================================
// ToolEvidence MongoDB Model
// Stores source evidence used to verify an AI tool's existence,
// capabilities, and metadata. Evidence is collected from authoritative
// sources — never from AI-generated content alone.
// ==========================================

/**
 * Where the evidence was sourced from.
 * Only well-defined source types are allowed — no open-ended web scraping.
 */
export type EvidenceSourceType =
  | 'OFFICIAL_WEBSITE'      // The tool's canonical homepage
  | 'OFFICIAL_BLOG'         // Official blog / announcement page
  | 'OFFICIAL_DOCS'         // Official documentation / API reference
  | 'OFFICIAL_PRICING'      // Official pricing page
  | 'OFFICIAL_RELEASE'      // Official release notes / changelog
  | 'GITHUB'                // GitHub repository (official)
  | 'HUGGING_FACE'          // Hugging Face model card / space (official)
  | 'OTHER_TRUSTED_SOURCE'; // Clearly non-official but trusted (e.g. ProductHunt listing)

/**
 * Evidence credibility band — set by the discovery adapter, not auto-inferred.
 */
export type EvidenceCredibility = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Tracks whether this piece of evidence has been reviewed.
 */
export type EvidenceVerificationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface IToolEvidence extends Document {
  toolId: string;                            // References AITool.id (slug)
  sourceType: EvidenceSourceType;
  sourceUrl: string;                         // Exact URL that was fetched
  sourceName: string;                        // Human-readable source label
  title?: string;                            // Page title or evidence headline
  evidenceText: string;                      // Extracted verbatim text snippet
  discoveredAt: Date;                        // When this evidence was first found
  fetchedAt: Date;                           // When the page was last fetched
  publishedAt?: Date;                        // When the source published the content
  credibility: EvidenceCredibility;
  verificationStatus: EvidenceVerificationStatus;
  // Optional structured data extracted from the evidence
  structuredData?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ToolEvidenceSchema = new Schema<IToolEvidence>(
  {
    toolId: {
      type: String,
      required: true,
      index: true,
      comment: 'Stable slug ID of the AITool this evidence supports'
    },
    sourceType: {
      type: String,
      required: true,
      enum: [
        'OFFICIAL_WEBSITE',
        'OFFICIAL_BLOG',
        'OFFICIAL_DOCS',
        'OFFICIAL_PRICING',
        'OFFICIAL_RELEASE',
        'GITHUB',
        'HUGGING_FACE',
        'OTHER_TRUSTED_SOURCE'
      ]
    },
    sourceUrl: {
      type: String,
      required: true
    },
    sourceName: {
      type: String,
      required: true
    },
    title: {
      type: String
    },
    evidenceText: {
      type: String,
      required: true
    },
    discoveredAt: {
      type: Date,
      required: true,
      default: () => new Date()
    },
    fetchedAt: {
      type: Date,
      required: true,
      default: () => new Date()
    },
    publishedAt: {
      type: Date
    },
    credibility: {
      type: String,
      required: true,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      default: 'MEDIUM'
    },
    verificationStatus: {
      type: String,
      required: true,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
      default: 'PENDING',
      index: true
    },
    structuredData: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true,
    collection: 'toolevidence'
  }
);

// Compound index for querying all evidence for a tool filtered by status
ToolEvidenceSchema.index({ toolId: 1, verificationStatus: 1 });
// Prevent exact-duplicate evidence (same tool + same URL + same fetched time)
ToolEvidenceSchema.index({ toolId: 1, sourceUrl: 1, fetchedAt: 1 }, { unique: false });

export const ToolEvidenceModel =
  (mongoose.models['ToolEvidence'] as mongoose.Model<IToolEvidence>) ||
  mongoose.model<IToolEvidence>('ToolEvidence', ToolEvidenceSchema);
