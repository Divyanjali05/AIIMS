import mongoose, { Schema, Document } from 'mongoose';

export type SubmissionStatus =
  'submitted' | 'in_review' | 'feedback_given' | 'revision_requested' | 'accepted';

export interface IStatusHistoryEntry {
  changedBy: mongoose.Types.ObjectId | string;
  changedByName?: string;
  changedAt: Date;
  fromStatus: string;
  toStatus: string;
  note?: string;
}

export interface ISubmission extends Document {
  learner: mongoose.Types.ObjectId;
  learnerName?: string;
  learnerEmail?: string;
  taskId: string;
  taskTitle?: string;
  answerContent: string;
  status: SubmissionStatus;
  evaluator: mongoose.Types.ObjectId | null;
  evaluatorName?: string;
  rubricScores?: Record<string, number>;
  writtenFeedback: string;
  revisionCount: number;
  statusHistory: IStatusHistoryEntry[];
  submittedAt: Date;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StatusHistorySchema = new Schema(
  {
    changedBy: { type: Schema.Types.Mixed, required: true },
    changedByName: { type: String },
    changedAt: { type: Date, default: Date.now },
    fromStatus: { type: String, required: true },
    toStatus: { type: String, required: true },
    note: { type: String },
  },
  { _id: false }
);

const SubmissionSchema = new Schema(
  {
    learner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    learnerName: { type: String },
    learnerEmail: { type: String },
    taskId: { type: String, required: true, index: true },
    taskTitle: { type: String },
    answerContent: { type: String, required: true },
    status: {
      type: String,
      enum: ['submitted', 'in_review', 'feedback_given', 'revision_requested', 'accepted'],
      default: 'submitted',
      index: true,
    },
    evaluator: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    evaluatorName: { type: String },
    rubricScores: { type: Schema.Types.Mixed, default: {} },
    writtenFeedback: { type: String, default: '' },
    revisionCount: { type: Number, default: 0 },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    submittedAt: { type: Date, default: Date.now, index: true },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

// Query optimization compound indexes
SubmissionSchema.index({ status: 1, submittedAt: 1 });
SubmissionSchema.index({ learner: 1, createdAt: -1 });
SubmissionSchema.index({ evaluator: 1, reviewedAt: -1 });

export const Submission = mongoose.model<ISubmission>('Submission', SubmissionSchema);

// In-memory submissions store for offline development / test fallback
export const memorySubmissions: any[] = [];
