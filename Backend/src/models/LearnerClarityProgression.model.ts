import mongoose, { Schema, Document } from 'mongoose';

export type ClarityLevel = 'Easy' | 'Medium' | 'Hard';

export interface IClarityAttemptHistoryItem {
  attemptId: string;
  score: number;
  level: ClarityLevel;
  timestamp: Date;
}

export interface ILearnerClarityProgression extends Document {
  learnerId: string;
  topic: string;
  currentLevel: ClarityLevel;
  consecutiveHighScores: number;
  totalAttempts: number;
  lastScore?: number;
  history: IClarityAttemptHistoryItem[];
  createdAt: Date;
  updatedAt: Date;
}

export const inMemoryLearnerClarityProgressions = new Map<string, any>();

export const LearnerClarityProgressionSchema = new Schema<ILearnerClarityProgression>(
  {
    learnerId: {
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
    currentLevel: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Easy',
      required: true,
    },
    consecutiveHighScores: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastScore: {
      type: Number,
    },
    history: [
      {
        attemptId: { type: String, required: true },
        score: { type: Number, required: true },
        level: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

LearnerClarityProgressionSchema.index({ learnerId: 1, topic: 1 }, { unique: true });

export const LearnerClarityProgression =
  mongoose.models.LearnerClarityProgression ||
  mongoose.model<ILearnerClarityProgression>(
    'LearnerClarityProgression',
    LearnerClarityProgressionSchema
  );
