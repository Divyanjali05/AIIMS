import mongoose, { Schema, Document } from 'mongoose';

export interface IRubricFeedbackItem {
  criterion: string;
  score: number;
  maxScore: number;
  comment: string;
}

export interface IQuestionAttempt extends Document {
  attemptId: string;
  assignmentId: string;
  learnerId: string;
  questionId: string;
  topic: string;
  level: string;
  track: string;
  startedAt: Date;
  submittedAt: Date;
  submittedAnswer: string;
  score: number;
  rubricFeedback: IRubricFeedbackItem[];
  evaluationStatus: 'PENDING' | 'EVALUATED';
  timeTakenSeconds: number;
  creditTransactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RubricFeedbackSchema = new Schema(
  {
    criterion: { type: String, required: true },
    score: { type: Number, required: true, min: 0 },
    maxScore: { type: Number, required: true, min: 1 },
    comment: { type: String, default: '' },
  },
  { _id: false }
);

export const QuestionAttemptSchema = new Schema<IQuestionAttempt>(
  {
    attemptId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    assignmentId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    learnerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    questionId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: String,
      required: true,
      trim: true,
    },
    track: {
      type: String,
      default: 'General',
      trim: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    submittedAnswer: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    rubricFeedback: {
      type: [RubricFeedbackSchema],
      default: [],
    },
    evaluationStatus: {
      type: String,
      enum: ['PENDING', 'EVALUATED'],
      default: 'EVALUATED',
      index: true,
    },
    timeTakenSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    creditTransactionId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Query optimization indexes
QuestionAttemptSchema.index({ learnerId: 1, submittedAt: -1 });
QuestionAttemptSchema.index({ questionId: 1, submittedAt: -1 });

export const QuestionAttempt = mongoose.model<IQuestionAttempt>(
  'QuestionAttempt',
  QuestionAttemptSchema
);

// In-Memory store for tests and offline fallback execution
export const inMemoryAttempts: Map<string, any> = new Map();
