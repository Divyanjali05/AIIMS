/**
 * session.service.ts
 * =========================================================
 * PostgreSQL Prisma service for session lifecycle and device-reset audits.
 */

import { Session as PrismaSession } from '@prisma/client';
import { prisma, isDatabaseConnected } from '../config/prisma';
import { DevicePlatform } from '../utils/deviceIdentifier';
import { ISession, SessionStatus } from '../types/models';
import { writeAuditLog } from './auditLog.service';
import { logger } from '../utils/logger';

function toSessionRecord(row: PrismaSession): ISession {
  return {
    id: row.id,
    sessionId: row.sessionId,
    userId: row.userId,
    deviceIdHash: row.deviceIdHash,
    deviceName: row.deviceName,
    platform: (row.platform as DevicePlatform) || 'web',
    createdAt: row.createdAt,
    lastSeenAt: row.lastSeenAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    status: row.status as SessionStatus,
  };
}

export const sessionService = {
  /**
   * Creates and persists a new active session in PostgreSQL.
   */
  async createSession(params: {
    sessionId: string;
    userId: string;
    deviceIdHash: string;
    deviceName: string;
    platform: DevicePlatform;
    expiresAt: Date;
  }): Promise<ISession> {
    if (!isDatabaseConnected()) {
      throw new Error('Database not connected');
    }

    const row = await prisma.session.create({
      data: {
        sessionId: params.sessionId,
        userId: String(params.userId),
        deviceIdHash: params.deviceIdHash,
        deviceName: params.deviceName || 'Unknown Device',
        platform: params.platform || 'web',
        lastSeenAt: new Date(),
        expiresAt: params.expiresAt,
        revokedAt: null,
        status: 'ACTIVE',
      },
    });

    return toSessionRecord(row);
  },

  /**
   * Retrieves a session by sessionId and enforces expiration on read.
   */
  async getSession(sessionId: string): Promise<ISession | null> {
    if (!sessionId || typeof sessionId !== 'string' || !isDatabaseConnected()) {
      return null;
    }

    try {
      const row = await prisma.session.findUnique({ where: { sessionId } });
      if (!row) return null;

      if (row.status === 'ACTIVE' && row.expiresAt < new Date()) {
        const updated = await prisma.session.update({
          where: { sessionId },
          data: { status: 'EXPIRED' },
        });
        return toSessionRecord(updated);
      }

      return toSessionRecord(row);
    } catch (err: any) {
      logger.warn('[Session] Failed to fetch session', { message: err?.message });
      return null;
    }
  },

  /**
   * Finds the currently ACTIVE non-expired session for a given user.
   */
  async getActiveSessionForUser(userId: string): Promise<ISession | null> {
    if (!isDatabaseConnected()) return null;

    try {
      const row = await prisma.session.findFirst({
        where: {
          userId: String(userId),
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      return row ? toSessionRecord(row) : null;
    } catch (err: any) {
      logger.warn('[Session] Active session lookup failed', { message: err?.message });
      return null;
    }
  },

  /**
   * Revokes a specific session by sessionId.
   */
  async revokeSession(sessionId: string): Promise<boolean> {
    if (!sessionId || typeof sessionId !== 'string' || !isDatabaseConnected()) {
      return false;
    }

    try {
      await prisma.session.updateMany({
        where: { sessionId },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });
      return true;
    } catch (err: any) {
      logger.warn('[Session] Failed to revoke session', { message: err?.message });
      return false;
    }
  },

  /**
   * Revokes all active sessions for a user (used during device reset).
   */
  async revokeAllUserSessions(userId: string): Promise<number> {
    if (!isDatabaseConnected()) return 0;

    try {
      const res = await prisma.session.updateMany({
        where: { userId: String(userId), status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });
      return res.count;
    } catch (err: any) {
      logger.warn('[Session] Failed to revoke all user sessions', { message: err?.message });
      return 0;
    }
  },

  /**
   * Updates lastSeenAt timestamp for an active session.
   */
  async touchSession(sessionId: string): Promise<void> {
    if (!sessionId || typeof sessionId !== 'string' || !isDatabaseConnected()) return;

    try {
      await prisma.session.updateMany({
        where: { sessionId },
        data: { lastSeenAt: new Date() },
      });
    } catch {
      // Non-critical heartbeat update
    }
  },
};

/**
 * Authoritatively records a device reset event in both DeviceResetAudit and AuditLog tables.
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

  if (isDatabaseConnected()) {
    try {
      await prisma.deviceResetAudit.create({
        data: {
          targetUserId: String(params.targetUserId),
          adminUserId: String(params.adminUserId),
          adminEmail: params.adminEmail,
          previousDeviceIdHash: params.previousDeviceIdHash || '',
          previousDeviceName: params.previousDeviceName || '',
          reason: params.reason,
          resetAt,
        },
      });
    } catch (err: any) {
      logger.warn('[DeviceResetAudit] Failed to persist reset audit row', {
        message: err?.message,
      });
    }
  }

  await writeAuditLog({
    actor: String(params.adminUserId),
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
  });
}
