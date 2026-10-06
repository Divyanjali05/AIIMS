import mongoose, { Schema, Document } from 'mongoose';

// ==========================================
// AITool MongoDB Model
// Source of truth for the AINOVA AI Tool Catalog.
// Seeded from mockToolCatalog; admin-updatable post-seed.
// Phase 2A adds lifecycle / verification fields.
// ==========================================

/**
 * Lifecycle verification status — separate concept from activeStatus.
 *
 *   VERIFIED_SEED  : Included via the initial trusted seed (Phase 1).
 *                    Treated as authoritative baseline; no additional
 *                    verification needed.
 *   DISCOVERED     : Candidate found by a discovery adapter but not yet
 *                    verified against evidence.
 *   UNVERIFIED     : Evidence collection attempted but insufficient
 *                    coverage to meet the verification threshold.
 *   VERIFIED       : Sufficient evidence from authoritative sources
 *                    confirms the tool's existence and metadata.
 *   REJECTED       : Evidence is contradictory, insufficient, or the
 *                    tool does not exist / is no longer available.
 *
 * NOTE: verificationStatus does NOT control whether a tool is served
 * to learners — that is governed by activeStatus.
 */
export type ToolVerificationStatus =
  | 'VERIFIED_SEED'
  | 'DISCOVERED'
  | 'UNVERIFIED'
  | 'VERIFIED'
  | 'REJECTED';

export interface IAITool extends Document {
  id: string;           // Stable slug ID (e.g. 'tool-chatgpt') — unique across catalog
  name: string;
  description: string;
  category: string;     // Primary display category
  capabilities: string[];
  useCases: string[];
  strengths: string[];
  limitations: string[];
  taskMappings: string[];
  websiteUrl: string;
  activeStatus: boolean; // Controls whether the tool is served to learners

  // UI display
  iconName?: string;
  pricing?: string;
  provider?: string;

  // Recommendation engine metadata
  categories?: string[];
  relevantRoles?: string[];
  skillLevel?: string;
  familiarityGuidance?: {
    exploring?: string;
    practicing?: string;
    proficient?: string;
    mastered?: string;
  };
  relatedTools?: string[];
  alternatives?: string[];
  radarTopics?: string[];
  clarityTopics?: string[];
  focusTracks?: string[];

  // ── Phase 2A: Lifecycle & Discovery fields ──────────────────────────────

  /**
   * Verification status — NOT the same as activeStatus.
   * activeStatus  = "should learners see this tool?"
   * verificationStatus = "has this tool been verified against evidence?"
   */
  verificationStatus: ToolVerificationStatus;

  /** When AINOVA first became aware of this tool (seed or discovery). */
  firstSeenAt: Date;

  /** When the tool last passed a full evidence verification check. */
  lastVerifiedAt?: Date;

  /** When any field on this tool record was last changed. */
  lastUpdatedAt?: Date;

  /** Authoritative source URLs collected for this tool (deduplicated). */
  sourceUrls: string[];

  /** How this tool entered the catalog (e.g. 'MANUAL_SEED', 'ADAPTER'). */
  discoverySource: string;

  /**
   * Fraction 0–1 representing how many required evidence fields have
   * been covered by accepted evidence documents.
   * 1.0 = all required fields have at least one accepted evidence source.
   */
  evidenceCoverage: number;

  /**
   * Confidence score 0–1 produced by the discovery pipeline.
   * Reflects deduplication certainty and evidence quality, not just coverage.
   */
  discoveryConfidence: number;

  // Audit (from timestamps)
  createdAt: Date;
  updatedAt: Date;
}

const FamiliarityGuidanceSchema = new Schema(
  {
    exploring:  { type: String },
    practicing: { type: String },
    proficient: { type: String },
    mastered:   { type: String }
  },
  { _id: false }
);

const AIToolSchema = new Schema<IAITool>(
  {
    id:           { type: String, required: true, unique: true, index: true },
    name:         { type: String, required: true },
    description:  { type: String, required: true },
    category:     { type: String, required: true },
    capabilities: { type: [String], default: [] },
    useCases:     { type: [String], default: [] },
    strengths:    { type: [String], default: [] },
    limitations:  { type: [String], default: [] },
    taskMappings: { type: [String], default: [] },
    websiteUrl:   { type: String, required: true },
    activeStatus: { type: Boolean, default: true, index: true },

    iconName:  { type: String },
    pricing:   { type: String },
    provider:  { type: String },

    categories:          { type: [String], default: [] },
    relevantRoles:       { type: [String], default: [] },
    skillLevel:          { type: String },
    familiarityGuidance: { type: FamiliarityGuidanceSchema },
    relatedTools:        { type: [String], default: [] },
    alternatives:        { type: [String], default: [] },
    radarTopics:         { type: [String], default: [] },
    clarityTopics:       { type: [String], default: [] },
    focusTracks:         { type: [String], default: [] },

    // ── Phase 2A: Lifecycle & Discovery fields ───────────────────────────
    verificationStatus: {
      type: String,
      required: true,
      enum: ['VERIFIED_SEED', 'DISCOVERED', 'UNVERIFIED', 'VERIFIED', 'REJECTED'],
      default: 'VERIFIED_SEED',
      index: true
    },
    firstSeenAt: {
      type: Date,
      required: true,
      default: () => new Date()
    },
    lastVerifiedAt: {
      type: Date
    },
    lastUpdatedAt: {
      type: Date
    },
    sourceUrls: {
      type: [String],
      default: []
    },
    discoverySource: {
      type: String,
      default: 'MANUAL_SEED'
    },
    evidenceCoverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    discoveryConfidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    }
  },
  {
    timestamps: true,
    collection: 'aitools'
  }
);

// Prevent model recompilation on hot-reload
export const AIToolModel = (mongoose.models['AITool'] as mongoose.Model<IAITool>) ||
  mongoose.model<IAITool>('AITool', AIToolSchema);
