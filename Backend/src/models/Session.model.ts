import mongoose, { Schema, Document } from 'mongoose';
import { DevicePlatform } from '../utils/deviceIdentifier';

export type SessionStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface ISession extends Document {
  sessionId: string;
  userId: string;
  deviceIdHash: string;
  deviceName: string;
  platform: DevicePlatform;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt?: Date | null;
  status: SessionStatus;
}

const SessionSchema = new Schema<ISession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    deviceIdHash: { type: String, required: true, index: true },
    deviceName: { type: String, default: 'Unknown Device' },
    platform: { type: String, enum: ['web', 'android', 'ios', 'other'], default: 'web' },
    createdAt: { type: Date, default: Date.now, index: true },
    lastSeenAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['ACTIVE', 'REVOKED', 'EXPIRED'],
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: false }
);

// Compound indexes for session queries
SessionSchema.index({ userId: 1, status: 1 });
SessionSchema.index({ userId: 1, deviceIdHash: 1 });

export const Session = mongoose.model<ISession>('Session', SessionSchema);

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Session Store for Offline / Mock / Testing Environments
// ─────────────────────────────────────────────────────────────────────────────

export interface MemorySession {
  sessionId: string;
  userId: string;
  deviceIdHash: string;
  deviceName: string;
  platform: DevicePlatform;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  status: SessionStatus;
}

const memorySessionStore: Map<string, MemorySession> = new Map();

export const sessionService = {
  /**
   * Creates and persists a new session.
   */
  async createSession(params: {
    sessionId: string;
    userId: string;
    deviceIdHash: string;
    deviceName: string;
    platform: DevicePlatform;
    expiresAt: Date;
  }): Promise<MemorySession> {
    const sessionData: MemorySession = {
      sessionId: params.sessionId,
      userId: String(params.userId),
      deviceIdHash: params.deviceIdHash,
      deviceName: params.deviceName,
      platform: params.platform,
      createdAt: new Date(),
      lastSeenAt: new Date(),
      expiresAt: params.expiresAt,
      revokedAt: null,
      status: 'ACTIVE',
    };

    // Save to memory store
    memorySessionStore.set(params.sessionId, sessionData);

    // Save to MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      try {
        await Session.create(sessionData);
      } catch (err) {
        console.warn('Failed to persist session to MongoDB, memory fallback active:', err);
      }
    }

    return sessionData;
  },

  /**
   * Retrieves a session by sessionId.
   */
  async getSession(sessionId: string): Promise<MemorySession | null> {
    if (!sessionId || typeof sessionId !== 'string') return null;

    if (mongoose.connection.readyState === 1) {
      try {
        const dbSession = await Session.findOne({ sessionId });
        if (dbSession) {
          // Check expiration on read
          if (dbSession.status === 'ACTIVE' && dbSession.expiresAt < new Date()) {
            dbSession.status = 'EXPIRED';
            await dbSession.save();
          }
          return {
            sessionId: dbSession.sessionId,
            userId: dbSession.userId,
            deviceIdHash: dbSession.deviceIdHash,
            deviceName: dbSession.deviceName,
            platform: dbSession.platform,
            createdAt: dbSession.createdAt,
            lastSeenAt: dbSession.lastSeenAt,
            expiresAt: dbSession.expiresAt,
            revokedAt: dbSession.revokedAt ?? null,
            status: dbSession.status,
          };
        }
      } catch (err) {
        console.warn('MongoDB session fetch error, checking memory store:', err);
      }
    }

    const memSession = memorySessionStore.get(sessionId);
    if (!memSession) return null;

    if (memSession.status === 'ACTIVE' && memSession.expiresAt < new Date()) {
      memSession.status = 'EXPIRED';
    }
    return memSession;
  },

  /**
   * Finds the currently ACTIVE session for a given user.
   */
  async getActiveSessionForUser(userId: string): Promise<MemorySession | null> {
    const uid = String(userId);
    const now = new Date();

    if (mongoose.connection.readyState === 1) {
      try {
        const dbSession = await Session.findOne({
          userId: uid,
          status: 'ACTIVE',
          expiresAt: { $gt: now },
        });
        if (dbSession) {
          return {
            sessionId: dbSession.sessionId,
            userId: dbSession.userId,
            deviceIdHash: dbSession.deviceIdHash,
            deviceName: dbSession.deviceName,
            platform: dbSession.platform,
            createdAt: dbSession.createdAt,
            lastSeenAt: dbSession.lastSeenAt,
            expiresAt: dbSession.expiresAt,
            revokedAt: dbSession.revokedAt ?? null,
            status: dbSession.status,
          };
        }
      } catch (err) {
        console.warn('MongoDB active session lookup error:', err);
      }
    }

    // Memory store scan
    for (const session of memorySessionStore.values()) {
      if (session.userId === uid && session.status === 'ACTIVE') {
        if (session.expiresAt > now) {
          return session;
        } else {
          session.status = 'EXPIRED';
        }
      }
    }
    return null;
  },

  /**
   * Revokes a specific session by sessionId.
   */
  async revokeSession(sessionId: string): Promise<boolean> {
    const now = new Date();

    if (memorySessionStore.has(sessionId)) {
      const s = memorySessionStore.get(sessionId)!;
      s.status = 'REVOKED';
      s.revokedAt = now;
    }

    if (mongoose.connection.readyState === 1) {
      try {
        await Session.updateOne({ sessionId }, { $set: { status: 'REVOKED', revokedAt: now } });
        return true;
      } catch (err) {
        console.warn('Failed to revoke session in MongoDB:', err);
      }
    }

    return true;
  },

  /**
   * Revokes all active sessions for a user (used during device reset).
   */
  async revokeAllUserSessions(userId: string): Promise<number> {
    const uid = String(userId);
    const now = new Date();
    let count = 0;

    for (const session of memorySessionStore.values()) {
      if (session.userId === uid && session.status === 'ACTIVE') {
        session.status = 'REVOKED';
        session.revokedAt = now;
        count++;
      }
    }

    if (mongoose.connection.readyState === 1) {
      try {
        const res = await Session.updateMany(
          { userId: uid, status: 'ACTIVE' },
          { $set: { status: 'REVOKED', revokedAt: now } }
        );
        count = Math.max(count, res.modifiedCount);
      } catch (err) {
        console.warn('Failed to revoke all user sessions in MongoDB:', err);
      }
    }

    return count;
  },

  /**
   * Updates lastSeenAt timestamp for an active session.
   */
  async touchSession(sessionId: string): Promise<void> {
    const now = new Date();
    if (memorySessionStore.has(sessionId)) {
      const s = memorySessionStore.get(sessionId)!;
      s.lastSeenAt = now;
    }

    if (mongoose.connection.readyState === 1) {
      try {
        await Session.updateOne({ sessionId }, { $set: { lastSeenAt: now } });
      } catch {}
    }
  },

  /**
   * Clears the in-memory session store (used in test suites).
   */
  clearMemoryStore(): void {
    memorySessionStore.clear();
  },
};
