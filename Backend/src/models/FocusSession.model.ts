import mongoose, { Document, Schema } from 'mongoose';

export interface IFocusSessionConfig {
  focusDurationMinutes: number;
  breakDurationMinutes: number;
  enableLongBreak: boolean;
  longBreakDurationMinutes: number;
  longBreakInterval: number;
  soundEnabled: boolean;
}

export type FocusSessionState =
  'idle' | 'focusing' | 'paused' | 'break' | 'completed' | 'abandoned';

export type FocusPeriodType = 'focus' | 'short_break' | 'long_break';

export type FocusSessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface IFocusSession extends Document {
  sessionId: string;
  learnerId: string;
  trackTitle: string;
  intention?: string;
  sessionState: FocusSessionState;
  periodType: FocusPeriodType;
  status: FocusSessionStatus;
  focusDurationMinutes: number;
  breakDurationMinutes: number;
  longBreakDurationMinutes: number;
  longBreakInterval: number;
  enableLongBreak: boolean;
  soundEnabled: boolean;
  totalPeriodSeconds: number;
  remainingSeconds: number;
  accumulatedFocusSeconds: number;
  totalBreakSeconds: number;
  completedCycles: number;
  startedAt: Date;
  pausedAt: Date | null;
  targetEndTime: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const FocusSessionSchema = new Schema<IFocusSession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    learnerId: {
      type: String,
      required: true,
      index: true,
    },
    trackTitle: {
      type: String,
      required: true,
      default: 'AI Workflow Design',
    },
    intention: {
      type: String,
      default: '',
    },
    sessionState: {
      type: String,
      enum: ['idle', 'focusing', 'paused', 'break', 'completed', 'abandoned'],
      default: 'focusing',
      index: true,
    },
    periodType: {
      type: String,
      enum: ['focus', 'short_break', 'long_break'],
      default: 'focus',
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'abandoned'],
      default: 'in_progress',
      index: true,
    },
    focusDurationMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 180,
      default: 25,
    },
    breakDurationMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 60,
      default: 5,
    },
    longBreakDurationMinutes: {
      type: Number,
      min: 1,
      max: 60,
      default: 15,
    },
    longBreakInterval: {
      type: Number,
      min: 1,
      max: 12,
      default: 4,
    },
    enableLongBreak: {
      type: Boolean,
      default: true,
    },
    soundEnabled: {
      type: Boolean,
      default: true,
    },
    totalPeriodSeconds: {
      type: Number,
      required: true,
      default: 1500,
    },
    remainingSeconds: {
      type: Number,
      required: true,
      default: 1500,
    },
    accumulatedFocusSeconds: {
      type: Number,
      default: 0,
    },
    totalBreakSeconds: {
      type: Number,
      default: 0,
    },
    completedCycles: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    pausedAt: {
      type: Date,
      default: null,
    },
    targetEndTime: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for performant history and active session lookups
FocusSessionSchema.index({ learnerId: 1, status: 1 });
FocusSessionSchema.index({ learnerId: 1, startedAt: -1 });
FocusSessionSchema.index({ learnerId: 1, sessionState: 1 });

export const FocusSession =
  (mongoose.models.FocusSession as mongoose.Model<IFocusSession>) ||
  mongoose.model<IFocusSession>('FocusSession', FocusSessionSchema);

// In-Memory store fallback for standalone test runners or offline fallback
export const inMemoryFocusSessions: Map<string, any> = new Map();
