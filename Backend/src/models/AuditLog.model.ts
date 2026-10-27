import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  actor: mongoose.Types.ObjectId | string;
  actorName?: string;
  actorRole: string;
  action: string;
  target?: string;
  targetType?: string;
  time: Date;
  details?: Record<string, any>;
}

const AuditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.Mixed, required: true, index: true },
    actorName: { type: String },
    actorRole: { type: String, required: true },
    action: { type: String, required: true, index: true },
    target: { type: String, index: true },
    targetType: { type: String },
    time: { type: Date, default: Date.now, index: true },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: false }
);

// Query optimization compound indexes for audit log timeline and filtering
AuditLogSchema.index({ action: 1, time: -1 });
AuditLogSchema.index({ actor: 1, time: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

// In-memory audit log store for fallback/offline mode
export const memoryAuditLogs: Array<{
  id: string;
  actor: string;
  actorName?: string;
  actorRole: string;
  action: string;
  target?: string;
  targetType?: string;
  time: Date;
  details?: Record<string, any>;
}> = [];

/**
 * Universal audit log helper: writes to MongoDB if connected, or memory store if offline.
 */
export async function writeAuditLog(params: {
  actor: any;
  actorName?: string;
  actorRole: string;
  action: string;
  target?: string;
  targetType?: string;
  details?: Record<string, any>;
  time?: Date;
}): Promise<void> {
  const timestamp = params.time || new Date();
  const entry = {
    actor: params.actor,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: params.action,
    target: params.target,
    targetType: params.targetType,
    time: timestamp,
    details: params.details || {},
  };

  if (mongoose.connection.readyState === 1) {
    try {
      await AuditLog.create(entry);
      return;
    } catch (err: any) {
      console.warn('[AuditLog] Failed to persist audit log in MongoDB:', err.message);
    }
  }

  // Fallback to memory store
  memoryAuditLogs.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...entry,
    actor: String(entry.actor),
  });
}
