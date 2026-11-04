import mongoose, { Schema, Document } from 'mongoose';

export type QuestionLevel = 'Easy' | 'Medium' | 'Hard';
export type QuestionTrack = 'General' | 'Coding';
export type QuestionSource = 'Human' | 'AI';
export type QuestionStatus =
  'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'ACTIVE' | 'REJECTED' | 'INACTIVE';

export interface IScoringRubricCriterion {
  criterion: string;
  maxScore: number;
  description: string;
}

export interface IAIMetadata {
  provider?: string;
  model?: string;
  generatedAt?: Date;
  similarityScore?: number;
  validationErrors?: string[];
  retryCount?: number;
}

export interface IQuestionBank extends Document {
  questionId: string;
  topic: string;
  level: QuestionLevel;
  track: QuestionTrack;
  title: string;
  promptText: string;
  hint?: string;
  testScenario: string;
  expectedCriteria: string[];
  scoringRubric: IScoringRubricCriterion[];
  source: QuestionSource;
  status: QuestionStatus;
  version: number;
  aiMetadata?: IAIMetadata;
  createdBy?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ScoringRubricCriterionSchema = new Schema(
  {
    criterion: { type: String, required: true, trim: true },
    maxScore: { type: Number, required: true, min: 1, max: 100 },
    description: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const AIMetadataSchema = new Schema(
  {
    provider: { type: String, trim: true },
    model: { type: String, trim: true },
    generatedAt: { type: Date, default: Date.now },
    similarityScore: { type: Number, min: 0, max: 1 },
    validationErrors: [{ type: String }],
    retryCount: { type: Number, default: 0 },
  },
  { _id: false }
);

export const QuestionBankSchema = new Schema<IQuestionBank>(
  {
    questionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    level: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: true,
      index: true,
    },
    track: {
      type: String,
      enum: ['General', 'Coding'],
      default: 'General',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    promptText: {
      type: String,
      required: true,
      trim: true,
    },
    hint: {
      type: String,
      trim: true,
    },
    testScenario: {
      type: String,
      required: true,
      trim: true,
    },
    expectedCriteria: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: 'At least one expected criterion is required.',
      },
    },
    scoringRubric: {
      type: [ScoringRubricCriterionSchema],
      required: true,
      validate: {
        validator: (v: IScoringRubricCriterion[]) => Array.isArray(v) && v.length > 0,
        message: 'At least one scoring rubric criterion is required.',
      },
    },
    source: {
      type: String,
      enum: ['Human', 'AI'],
      default: 'Human',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ACTIVE', 'REJECTED', 'INACTIVE'],
      default: 'ACTIVE',
      required: true,
      index: true,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    aiMetadata: {
      type: AIMetadataSchema,
    },
    createdBy: {
      type: String,
      trim: true,
    },
    reviewedBy: {
      type: String,
      trim: true,
    },
    reviewedAt: {
      type: Date,
    },
    reviewNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal query performance
QuestionBankSchema.index({ topic: 1, level: 1, track: 1, status: 1 });
QuestionBankSchema.index({ source: 1, status: 1 });

export const QuestionBank = mongoose.model<IQuestionBank>('QuestionBank', QuestionBankSchema);

// In-Memory store for tests and offline fallback execution
export const inMemoryQuestionBank: Map<string, any> = new Map();
