import mongoose, { Schema, Document } from 'mongoose';
import { writeAuditLog } from './AuditLog.model';

export interface IDeviceResetAudit extends Document {
  targetUserId: string;
  adminUserId: string;
  adminEmail: string;
  previousDeviceIdHash: string;
  previousDeviceName?: string;
  reason: string;
  resetAt: Date;
}

const DeviceResetAuditSchema = new Schema<IDeviceResetAudit>(
  {
    targetUserId: { type: String, required: true, index: true },
    adminUserId: { type: String, required: true, index: true },
    adminEmail: { type: String, required: true },
    previousDeviceIdHash: { type: String, default: '' },
    previousDeviceName: { type: String, default: '' },
    reason: { type: String, required: true },
    resetAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

DeviceResetAuditSchema.index({ targetUserId: 1, resetAt: -1 });

export const DeviceResetAudit = mongoose.model<IDeviceResetAudit>(
  'DeviceResetAudit',
  DeviceResetAuditSchema
);

export const memoryDeviceResetAudits: Array<{
  id: string;
  targetUserId: string;
  adminUserId: string;
  adminEmail: string;
  previousDeviceIdHash: string;
  previousDeviceName?: string;
  reason: string;
  resetAt: Date;
}> = [];

/**
 * Authoritatively records a device reset event in both DeviceResetAudit collection
 * and universal AuditLog collection.
 */
export async function recordDeviceResetAudit(params: {
  targetUserId: string;
  adminUserId: string;
  adminEmail: string;
  previousDeviceIdHash: string;
  previousDeviceName?: string;
  reason: string;
}): Promise<void> {
  const resetAt = new Date();
  const record = {
    id: `dra-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    targetUserId: String(params.targetUserId),
    adminUserId: String(params.adminUserId),
    adminEmail: params.adminEmail,
    previousDeviceIdHash: params.previousDeviceIdHash,
    previousDeviceName: params.previousDeviceName,
    reason: params.reason,
    resetAt,
  };

  memoryDeviceResetAudits.push(record);

  if (mongoose.connection.readyState === 1) {
    try {
      await DeviceResetAudit.create(record);
    } catch (err) {
      console.warn('Failed to persist DeviceResetAudit to MongoDB:', err);
    }
  }

  // Also write to general AuditLog
  await writeAuditLog({
    actor: params.adminUserId,
    actorName: params.adminEmail,
    actorRole: 'admin',
    action: 'DEVICE_RESET',
    target: String(params.targetUserId),
    targetType: 'User',
    details: {
      previousDeviceIdHash: params.previousDeviceIdHash,
      previousDeviceName: params.previousDeviceName,
      reason: params.reason,
    },
    time: resetAt,
  }).catch((err) => {
    console.warn('Failed to write device reset to AuditLog:', err);
  });
}
