import mongoose, { Schema, Document } from 'mongoose';

// ==========================================
// ToolVersionHistory MongoDB Model
// Immutable audit log of every detected change to an AITool record.
// Each document records what changed, why, and what the data looked
// like before and after the change.
// ==========================================

/**
 * What kind of change was recorded.
 */
export type ToolChangeType =
  | 'NEW_TOOL'          // First time this tool was discovered
  | 'VERSION_UPDATE'    // Model/product version changed (e.g. GPT-4 → GPT-4o)
  | 'CAPABILITY_UPDATE' // capabilities[], strengths[], limitations[] changed
  | 'PRICING_UPDATE'    // Pricing string or tier changed
  | 'WEBSITE_UPDATE'    // websiteUrl changed
  | 'STATUS_CHANGE';    // activeStatus or verificationStatus changed

export interface IToolVersionHistory extends Document {
  toolId: string;                        // AITool.id slug this entry belongs to
  version?: string;                      // Optional version label (e.g. '3.5 Sonnet')
  changeType: ToolChangeType;
  changeSummary: string;                 // Human-readable description of what changed
  sourceUrl?: string;                    // Evidence URL that triggered the change
  detectedAt: Date;                      // When AINOVA detected the change
  // Snapshot of relevant fields before and after the change
  previousData?: Record<string, any>;
  newData?: Record<string, any>;
  // Who/what created this history entry
  recordedBy: 'SEED_SCRIPT' | 'DISCOVERY_RUN' | 'ADMIN';
  createdAt: Date;
}

const ToolVersionHistorySchema = new Schema<IToolVersionHistory>(
  {
    toolId: {
      type: String,
      required: true,
      index: true,
      comment: 'Stable slug ID of the AITool this history entry belongs to'
    },
    version: {
      type: String
    },
    changeType: {
      type: String,
      required: true,
      enum: [
        'NEW_TOOL',
        'VERSION_UPDATE',
        'CAPABILITY_UPDATE',
        'PRICING_UPDATE',
        'WEBSITE_UPDATE',
        'STATUS_CHANGE'
      ],
      index: true
    },
    changeSummary: {
      type: String,
      required: true
    },
    sourceUrl: {
      type: String
    },
    detectedAt: {
      type: Date,
      required: true,
      default: () => new Date()
    },
    previousData: {
      type: Schema.Types.Mixed
    },
    newData: {
      type: Schema.Types.Mixed
    },
    recordedBy: {
      type: String,
      required: true,
      enum: ['SEED_SCRIPT', 'DISCOVERY_RUN', 'ADMIN'],
      default: 'DISCOVERY_RUN'
    }
  },
  {
    // No updatedAt — version history entries are immutable once written
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'toolversionhistory'
  }
);

// Fast lookups: all history for a tool, sorted newest-first
ToolVersionHistorySchema.index({ toolId: 1, detectedAt: -1 });

export const ToolVersionHistoryModel =
  (mongoose.models['ToolVersionHistory'] as mongoose.Model<IToolVersionHistory>) ||
  mongoose.model<IToolVersionHistory>('ToolVersionHistory', ToolVersionHistorySchema);
