import mongoose, { Schema, Document } from 'mongoose';

export type AssignmentStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'ABANDONED';

export interface IQuestionAssignment extends Document {
  assignmentId: string;
  learnerId: string;
  questionId: string;
  topic: string;
  level: string;
  track: string;
  college?: string;
  institutionId?: string;
  cohortId?: string;
  assignedAt: Date;
  completedAt?: Date;
  status: AssignmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const QuestionAssignmentSchema = new Schema<IQuestionAssignment>(
  {
    assignmentId: {
      type: String,
      required: true,
      unique: true,
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
      index: true,
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
    college: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },
    institutionId: {
      type: String,
      trim: true,
      index: true,
    },
    cohortId: {
      type: String,
      trim: true,
      index: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    completedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'ABANDONED'],
      default: 'ASSIGNED',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique index: A learner must never receive the same question ID twice!
QuestionAssignmentSchema.index({ learnerId: 1, questionId: 1 }, { unique: true });

// Compound indexes for institution-level exclusion queries
QuestionAssignmentSchema.index({ college: 1, questionId: 1, assignedAt: -1 });
QuestionAssignmentSchema.index({ institutionId: 1, questionId: 1, assignedAt: -1 });
QuestionAssignmentSchema.index({ cohortId: 1, questionId: 1, assignedAt: -1 });

export const QuestionAssignment = mongoose.model<IQuestionAssignment>(
  'QuestionAssignment',
  QuestionAssignmentSchema
);

// In-Memory store for tests and offline fallback execution
export const inMemoryAssignments: Map<string, any> = new Map();
