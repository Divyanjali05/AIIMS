/**
 * auditLog.service.ts
 * =========================================================
 * PostgreSQL Prisma persistence for audit logs.
 */

import { prisma, isDatabaseConnected } from '../config/prisma';
import { toJsonInput } from '../utils/userMapper';
import { logger } from '../utils/logger';

export interface AuditLogInput {
  actor: string;
  actorName?: string;
  actorRole: string;
  action: string;
  target?: string;
  targetType?: string;
  details?: Record<string, any>;
  time?: Date;
}

/**
 * Persists an audit log entry to PostgreSQL.
 */
export async function writeAuditLog(params: AuditLogInput): Promise<void> {
  if (!isDatabaseConnected()) {
    logger.warn('[AuditLog] Database not connected; audit log entry skipped', {
      action: params.action,
      actorRole: params.actorRole,
    });
    return;
  }

  try {
    await prisma.auditLog.create({
      data: {
        actor: String(params.actor),
        actorName: params.actorName ?? null,
        actorRole: params.actorRole,
        action: params.action,
        target: params.target ?? null,
        targetType: params.targetType ?? null,
        time: params.time || new Date(),
        details: toJsonInput(params.details || {}),
      },
    });
  } catch (err: any) {
    logger.warn('[AuditLog] Failed to persist audit log in PostgreSQL', {
      message: err?.message,
      action: params.action,
    });
  }
}
