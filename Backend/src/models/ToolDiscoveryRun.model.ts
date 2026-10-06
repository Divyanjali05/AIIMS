import mongoose, { Schema, Document } from 'mongoose';

// ==========================================
// ToolDiscoveryRun MongoDB Model
// Records every execution of the discovery pipeline —
// when it ran, how many candidates were found, and what
// outcome each candidate had.
// ==========================================

export type DiscoveryRunStatus =
  | 'RUNNING'    // Currently in progress
  | 'COMPLETED'  // Finished without fatal errors
  | 'PARTIAL'    // Finished but some candidates could not be processed
  | 'FAILED';    // Fatal error — no useful output was produced

export type DiscoveryRunSource =
  | 'MANUAL_SEED'       // Seeded from mockToolCatalog (Phase 1 bootstrap)
  | 'ADMIN_IMPORT'      // Admin uploaded a structured tool list
  | 'ADAPTER';          // A pluggable ToolDiscoveryAdapter (future Phase 2B+)

export interface IDiscoveryRunError {
  candidateId?: string;
  message: string;
  stack?: string;
}

export interface IToolDiscoveryRun extends Document {
  startedAt: Date;
  completedAt?: Date;
  status: DiscoveryRunStatus;
  source: DiscoveryRunSource;
  // Counters
  discoveredCount: number;   // Total candidates received
  newToolsCount: number;     // New tools created in AITool collection
  updatedToolsCount: number; // Existing tools updated
  duplicateCount: number;    // Duplicates detected and skipped
  rejectedCount: number;     // Candidates that failed verification
  errorCount: number;        // Candidates that caused errors
  // Structured error list (max 100 to avoid bloating)
  runErrors: IDiscoveryRunError[];
  createdAt: Date;
  updatedAt: Date;
}

const DiscoveryRunErrorSchema = new Schema<IDiscoveryRunError>(
  {
    candidateId: { type: String },
    message: { type: String, required: true },
    stack: { type: String }
  },
  { _id: false }
);

const ToolDiscoveryRunSchema = new Schema<IToolDiscoveryRun>(
  {
    startedAt: {
      type: Date,
      required: true,
      default: () => new Date()
    },
    completedAt: {
      type: Date
    },
    status: {
      type: String,
      required: true,
      enum: ['RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED'],
      default: 'RUNNING',
      index: true
    },
    source: {
      type: String,
      required: true,
      enum: ['MANUAL_SEED', 'ADMIN_IMPORT', 'ADAPTER'],
      default: 'MANUAL_SEED'
    },
    discoveredCount:  { type: Number, default: 0 },
    newToolsCount:    { type: Number, default: 0 },
    updatedToolsCount:{ type: Number, default: 0 },
    duplicateCount:   { type: Number, default: 0 },
    rejectedCount:    { type: Number, default: 0 },
    errorCount:       { type: Number, default: 0 },
    runErrors: {
      type: [DiscoveryRunErrorSchema],
      default: []
    }
  },
  {
    timestamps: true,
    collection: 'tooldiscoveryruns'
  }
);

// Most recent runs first
ToolDiscoveryRunSchema.index({ startedAt: -1 });

export const ToolDiscoveryRunModel =
  (mongoose.models['ToolDiscoveryRun'] as mongoose.Model<IToolDiscoveryRun>) ||
  mongoose.model<IToolDiscoveryRun>('ToolDiscoveryRun', ToolDiscoveryRunSchema);
