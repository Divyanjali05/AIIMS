/**
 * focusSession.service.ts
 * =========================================================
 * Authoritative Server-Side Focus & Pomodoro Session Service
 *
 * Implements:
 * 1. Explicit lifecycle state machine (idle -> focusing -> paused -> break -> completed / abandoned).
 * 2. Authoritative server timekeeping (server timestamps are single source of truth).
 * 3. Single active session guarantee (rejects duplicate / concurrent sessions for same learner).
 * 4. Strict separation of focus time vs break time (breaks never count toward focus totals).
 * 5. Abandoned session exclusion from completed focus stats.
 * 6. Dual-storage synchronization (FocusSession model + User.focus mirror + in-memory fallback).
 */

import mongoose from 'mongoose';
import {
  FocusSession,
  IFocusSession,
  IFocusSessionConfig,
  FocusSessionState,
  FocusPeriodType,
  inMemoryFocusSessions,
} from '../models/FocusSession.model';
import { User } from '../models/User.model';
import { logger } from '../utils/logger';

export interface StartSessionParams {
  learnerId: string;
  trackTitle?: string;
  intention?: string;
  focusDurationMinutes?: number;
  breakDurationMinutes?: number;
  enableLongBreak?: boolean;
  longBreakDurationMinutes?: number;
  longBreakInterval?: number;
  soundEnabled?: boolean;
}

export interface FocusDailyStats {
  todayFocusSeconds: number;
  todayFocusHours: number;
  todayCompletedSessions: number;
  totalCompletedSessions: number;
  todayBreakSeconds: number;
  currentCompletedCycles: number;
  activeSession: IFocusSession | null;
}

export class FocusSessionService {
  /**
   * Helper: Sanitize session configuration with strict bounds
   */
  public static sanitizeConfig(input: Partial<IFocusSessionConfig>): IFocusSessionConfig {
    const defaults: IFocusSessionConfig = {
      focusDurationMinutes: 25,
      breakDurationMinutes: 5,
      enableLongBreak: true,
      longBreakDurationMinutes: 15,
      longBreakInterval: 4,
      soundEnabled: true,
    };

    const parsedFocus =
      input.focusDurationMinutes !== undefined ? Number(input.focusDurationMinutes) : NaN;
    const parsedBreak =
      input.breakDurationMinutes !== undefined ? Number(input.breakDurationMinutes) : NaN;
    const parsedLongBreak =
      input.longBreakDurationMinutes !== undefined ? Number(input.longBreakDurationMinutes) : NaN;
    const parsedInterval =
      input.longBreakInterval !== undefined ? Number(input.longBreakInterval) : NaN;

    return {
      focusDurationMinutes: !isNaN(parsedFocus)
        ? Math.max(1, Math.min(180, Math.round(parsedFocus)))
        : defaults.focusDurationMinutes,
      breakDurationMinutes: !isNaN(parsedBreak)
        ? Math.max(1, Math.min(60, Math.round(parsedBreak)))
        : defaults.breakDurationMinutes,
      enableLongBreak: input.enableLongBreak ?? defaults.enableLongBreak,
      longBreakDurationMinutes: !isNaN(parsedLongBreak)
        ? Math.max(1, Math.min(60, Math.round(parsedLongBreak)))
        : defaults.longBreakDurationMinutes,
      longBreakInterval: !isNaN(parsedInterval)
        ? Math.max(1, Math.min(12, Math.round(parsedInterval)))
        : defaults.longBreakInterval,
      soundEnabled: input.soundEnabled ?? defaults.soundEnabled,
    };
  }

  /**
   * Get learner's current active session, if any
   */
  public static async getActiveSession(learnerId: string): Promise<IFocusSession | null> {
    if (!learnerId) return null;

    let session: any = null;

    if (mongoose.connection.readyState === 1) {
      session = await FocusSession.findOne({
        learnerId,
        status: 'in_progress',
        sessionState: { $in: ['focusing', 'paused', 'break'] },
      }).sort({ startedAt: -1 });
    } else {
      // In-memory fallback
      for (const s of inMemoryFocusSessions.values()) {
        if (
          s.learnerId === learnerId &&
          s.status === 'in_progress' &&
          ['focusing', 'paused', 'break'].includes(s.sessionState)
        ) {
          session = s;
          break;
        }
      }
    }

    if (!session) return null;

    // Dynamically calculate live remaining seconds if actively running
    const now = Date.now();
    if (session.sessionState === 'focusing' || session.sessionState === 'break') {
      if (session.targetEndTime) {
        const targetMs = new Date(session.targetEndTime).getTime();
        session.remainingSeconds = Math.max(0, Math.ceil((targetMs - now) / 1000));
      }
    }

    return session;
  }

  /**
   * Start a new focus session
   */
  public static async startSession(params: StartSessionParams): Promise<{
    session: IFocusSession;
    isExisting: boolean;
  }> {
    const { learnerId } = params;

    // 1. Guard against duplicate active sessions
    const existing = await this.getActiveSession(learnerId);
    if (existing) {
      return { session: existing, isExisting: true };
    }

    // 2. Resolve sanitized configuration
    const config = this.sanitizeConfig({
      focusDurationMinutes: params.focusDurationMinutes,
      breakDurationMinutes: params.breakDurationMinutes,
      enableLongBreak: params.enableLongBreak,
      longBreakDurationMinutes: params.longBreakDurationMinutes,
      longBreakInterval: params.longBreakInterval,
      soundEnabled: params.soundEnabled,
    });

    const now = new Date();
    const durationSeconds = config.focusDurationMinutes * 60;
    const targetEndTime = new Date(now.getTime() + durationSeconds * 1000);
    const sessionId = `foc-sess-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const sessionData: Partial<IFocusSession> = {
      sessionId,
      learnerId,
      trackTitle: params.trackTitle?.trim() || 'AI Workflow Design',
      intention: params.intention?.trim() || '',
      sessionState: 'focusing' as FocusSessionState,
      periodType: 'focus' as FocusPeriodType,
      status: 'in_progress',
      focusDurationMinutes: config.focusDurationMinutes,
      breakDurationMinutes: config.breakDurationMinutes,
      longBreakDurationMinutes: config.longBreakDurationMinutes,
      longBreakInterval: config.longBreakInterval,
      enableLongBreak: config.enableLongBreak,
      soundEnabled: config.soundEnabled,
      totalPeriodSeconds: durationSeconds,
      remainingSeconds: durationSeconds,
      accumulatedFocusSeconds: 0,
      totalBreakSeconds: 0,
      completedCycles: 0,
      startedAt: now,
      pausedAt: null,
      targetEndTime,
      completedAt: null,
    };

    let created: any;

    if (mongoose.connection.readyState === 1) {
      created = await FocusSession.create(sessionData);
      // Dual-sync to User model
      await User.findByIdAndUpdate(learnerId, {
        $set: {
          'focus.status': 'active',
          'focus.selectedTrack': sessionData.trackTitle,
          'focus.activeSession': created.toObject ? created.toObject() : created,
          'focus.sessionConfig': config,
        },
      });
    } else {
      created = {
        ...sessionData,
        _id: sessionId,
        createdAt: now,
        updatedAt: now,
      } as unknown as IFocusSession;
      inMemoryFocusSessions.set(sessionId, created);
    }

    return { session: created, isExisting: false };
  }

  /**
   * Pause active session (freezes remaining time & accumulates elapsed focus time)
   */
  public static async pauseSession(learnerId: string, sessionId?: string): Promise<IFocusSession> {
    const session = await this.getActiveSession(learnerId);
    if (!session) {
      throw new Error('NO_ACTIVE_FOCUS_SESSION');
    }

    if (sessionId && session.sessionId !== sessionId) {
      throw new Error('SESSION_ID_MISMATCH');
    }

    if (session.sessionState !== 'focusing' && session.sessionState !== 'break') {
      throw new Error('SESSION_NOT_PAUSABLE');
    }

    const now = Date.now();
    let remainingSeconds = session.remainingSeconds;

    if (session.targetEndTime) {
      const targetMs = new Date(session.targetEndTime).getTime();
      remainingSeconds = Math.max(0, Math.ceil((targetMs - now) / 1000));
    }

    // Accumulate elapsed focus seconds if currently in focus period
    let accumulatedFocusSeconds = session.accumulatedFocusSeconds;
    if (session.periodType === 'focus') {
      const elapsed = Math.max(0, session.totalPeriodSeconds - remainingSeconds);
      accumulatedFocusSeconds = Math.max(accumulatedFocusSeconds, elapsed);
    }

    session.sessionState = 'paused';
    session.remainingSeconds = remainingSeconds;
    session.targetEndTime = null;
    session.pausedAt = new Date();
    session.accumulatedFocusSeconds = accumulatedFocusSeconds;

    if (mongoose.connection.readyState === 1 && session.save) {
      await session.save();
      await User.findByIdAndUpdate(learnerId, {
        $set: { 'focus.activeSession': session.toObject ? session.toObject() : session },
      });
    } else {
      inMemoryFocusSessions.set(session.sessionId, session);
    }

    return session;
  }

  /**
   * Resume paused focus session
   */
  public static async resumeSession(learnerId: string, sessionId?: string): Promise<IFocusSession> {
    const session = await this.getActiveSession(learnerId);
    if (!session) {
      throw new Error('NO_ACTIVE_FOCUS_SESSION');
    }

    if (sessionId && session.sessionId !== sessionId) {
      throw new Error('SESSION_ID_MISMATCH');
    }

    if (session.sessionState !== 'paused') {
      throw new Error('SESSION_NOT_PAUSED');
    }

    const now = Date.now();
    const newTargetEndTime = new Date(now + session.remainingSeconds * 1000);

    session.sessionState = session.periodType === 'focus' ? 'focusing' : 'break';
    session.targetEndTime = newTargetEndTime;
    session.pausedAt = null;

    if (mongoose.connection.readyState === 1 && session.save) {
      await session.save();
      await User.findByIdAndUpdate(learnerId, {
        $set: { 'focus.activeSession': session.toObject ? session.toObject() : session },
      });
    } else {
      inMemoryFocusSessions.set(session.sessionId, session);
    }

    return session;
  }

  /**
   * Complete active focus period
   * Authoritatively verifies duration or allows completion if remaining <= 5s tolerance
   */
  public static async completePeriod(
    learnerId: string,
    sessionId?: string
  ): Promise<{ session: IFocusSession; record: any }> {
    const session = await this.getActiveSession(learnerId);
    if (!session) {
      throw new Error('NO_ACTIVE_FOCUS_SESSION');
    }

    if (sessionId && session.sessionId !== sessionId) {
      throw new Error('SESSION_ID_MISMATCH');
    }

    const now = Date.now();

    // Check remaining time if actively running
    if (session.sessionState === 'focusing' && session.targetEndTime) {
      const targetMs = new Date(session.targetEndTime).getTime();
      session.remainingSeconds = Math.max(0, Math.ceil((targetMs - now) / 1000));
    }

    // Strict Duration Validation Guard:
    // If more than 5 seconds remain, client cannot claim full completion.
    // Must either wait for timer completion or abandon.
    if (session.periodType === 'focus' && session.remainingSeconds > 5) {
      throw new Error('FOCUS_DURATION_INCOMPLETE');
    }

    const actualFocusSeconds = session.totalPeriodSeconds;
    const newCycles = session.completedCycles + 1;

    session.completedCycles = newCycles;
    session.accumulatedFocusSeconds = Math.max(session.accumulatedFocusSeconds, actualFocusSeconds);
    session.remainingSeconds = 0;
    session.targetEndTime = null;
    session.completedAt = new Date();
    session.status = 'completed';
    session.sessionState = 'completed';

    const historyRecord = {
      id: session.sessionId,
      trackTitle: session.trackTitle,
      intention: session.intention,
      focusDurationMinutes: session.focusDurationMinutes,
      actualFocusSeconds: actualFocusSeconds,
      breakDurationMinutes: session.breakDurationMinutes,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      status: 'completed',
      cyclesCompleted: newCycles,
    };

    if (mongoose.connection.readyState === 1 && session.save) {
      await session.save();
      // Push record to User.focus.sessionHistory and clear activeSession
      await User.findByIdAndUpdate(learnerId, {
        $set: { 'focus.activeSession': null },
        $push: { 'focus.sessionHistory': { $each: [historyRecord], $position: 0 } },
      });
    } else {
      inMemoryFocusSessions.set(session.sessionId, session);
    }

    return { session, record: historyRecord };
  }

  /**
   * Start Break Period (short break or long break)
   */
  public static async startBreak(
    learnerId: string,
    params?: { sessionId?: string; forceLongBreak?: boolean }
  ): Promise<IFocusSession> {
    let session = await this.getActiveSession(learnerId);

    // If no session found in progress, look up the last completed session for this learner to chain into a break
    if (!session) {
      if (mongoose.connection.readyState === 1) {
        session = await FocusSession.findOne({
          learnerId,
          sessionState: 'completed',
        }).sort({ completedAt: -1 });
      } else {
        for (const s of inMemoryFocusSessions.values()) {
          if (s.learnerId === learnerId && s.sessionState === 'completed') {
            session = s;
            break;
          }
        }
      }
    }

    if (!session) {
      throw new Error('NO_COMPLETED_SESSION_FOR_BREAK');
    }

    const isLong =
      params?.forceLongBreak ||
      (session.enableLongBreak &&
        session.completedCycles > 0 &&
        session.completedCycles % session.longBreakInterval === 0);

    const breakMinutes = isLong ? session.longBreakDurationMinutes : session.breakDurationMinutes;
    const breakSeconds = breakMinutes * 60;
    const now = new Date();
    const targetEndTime = new Date(now.getTime() + breakSeconds * 1000);
    const breakSessionId = `foc-break-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const breakData: Partial<IFocusSession> = {
      sessionId: breakSessionId,
      learnerId,
      trackTitle: session.trackTitle,
      intention: session.intention,
      sessionState: 'break',
      periodType: isLong ? 'long_break' : 'short_break',
      status: 'in_progress',
      focusDurationMinutes: session.focusDurationMinutes,
      breakDurationMinutes: session.breakDurationMinutes,
      longBreakDurationMinutes: session.longBreakDurationMinutes,
      longBreakInterval: session.longBreakInterval,
      enableLongBreak: session.enableLongBreak,
      soundEnabled: session.soundEnabled,
      totalPeriodSeconds: breakSeconds,
      remainingSeconds: breakSeconds,
      accumulatedFocusSeconds: session.accumulatedFocusSeconds,
      totalBreakSeconds: breakSeconds,
      completedCycles: session.completedCycles,
      startedAt: now,
      pausedAt: null,
      targetEndTime,
      completedAt: null,
    };

    let createdBreak: any;

    if (mongoose.connection.readyState === 1) {
      createdBreak = await FocusSession.create(breakData);
      await User.findByIdAndUpdate(learnerId, {
        $set: {
          'focus.activeSession': createdBreak.toObject ? createdBreak.toObject() : createdBreak,
        },
      });
    } else {
      createdBreak = {
        ...breakData,
        _id: breakSessionId,
        createdAt: now,
        updatedAt: now,
      } as unknown as IFocusSession;
      inMemoryFocusSessions.set(breakSessionId, createdBreak);
    }

    return createdBreak;
  }

  /**
   * Abandon active focus session
   * Excluded from completed focus metrics; saved to history only if accumulated >= 30s
   */
  public static async abandonSession(
    learnerId: string,
    sessionId?: string
  ): Promise<{ session: IFocusSession; savedToHistory: boolean }> {
    const session = await this.getActiveSession(learnerId);
    if (!session) {
      throw new Error('NO_ACTIVE_FOCUS_SESSION');
    }

    if (sessionId && session.sessionId !== sessionId) {
      throw new Error('SESSION_ID_MISMATCH');
    }

    const now = Date.now();
    let accumulated = session.accumulatedFocusSeconds;

    if (
      session.periodType === 'focus' &&
      session.sessionState === 'focusing' &&
      session.targetEndTime
    ) {
      const targetMs = new Date(session.targetEndTime).getTime();
      const rem = Math.max(0, Math.ceil((targetMs - now) / 1000));
      const elapsed = Math.max(0, session.totalPeriodSeconds - rem);
      accumulated = Math.max(accumulated, elapsed);
    }

    session.status = 'abandoned';
    session.sessionState = 'abandoned';
    session.completedAt = new Date();
    session.targetEndTime = null;
    session.remainingSeconds = 0;
    session.accumulatedFocusSeconds = accumulated;

    const savedToHistory = accumulated >= 30;

    const historyRecord = savedToHistory
      ? {
          id: session.sessionId,
          trackTitle: session.trackTitle,
          intention: session.intention,
          focusDurationMinutes: session.focusDurationMinutes,
          actualFocusSeconds: accumulated,
          breakDurationMinutes: session.breakDurationMinutes,
          startedAt: session.startedAt,
          completedAt: session.completedAt,
          status: 'abandoned',
          cyclesCompleted: session.completedCycles,
        }
      : null;

    if (mongoose.connection.readyState === 1 && session.save) {
      if (!savedToHistory) {
        await FocusSession.deleteOne({ sessionId: session.sessionId });
      } else {
        await session.save();
      }
      const updateDoc: any = { $set: { 'focus.activeSession': null } };
      if (historyRecord) {
        updateDoc.$push = { 'focus.sessionHistory': { $each: [historyRecord], $position: 0 } };
      }
      await User.findByIdAndUpdate(learnerId, updateDoc);
    } else {
      if (!savedToHistory) {
        inMemoryFocusSessions.delete(session.sessionId);
      } else {
        inMemoryFocusSessions.set(session.sessionId, session);
      }
    }

    return { session, savedToHistory };
  }

  /**
   * Get server-calculated daily and lifetime statistics
   * Excludes break time and abandoned sessions from focus time totals!
   */
  public static async getDailyStats(learnerId: string): Promise<FocusDailyStats> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let completedSessions: any[] = [];
    let lifetimeCompletedCount = 0;

    if (mongoose.connection.readyState === 1) {
      // Completed sessions today
      completedSessions = await FocusSession.find({
        learnerId,
        status: 'completed',
        completedAt: { $gte: startOfToday },
      });

      lifetimeCompletedCount = await FocusSession.countDocuments({
        learnerId,
        status: 'completed',
      });
    } else {
      for (const s of inMemoryFocusSessions.values()) {
        if (s.learnerId === learnerId && s.status === 'completed') {
          lifetimeCompletedCount++;
          if (new Date(s.completedAt).getTime() >= startOfToday.getTime()) {
            completedSessions.push(s);
          }
        }
      }
    }

    const todayFocusSeconds = completedSessions.reduce(
      (sum, s) => sum + (s.accumulatedFocusSeconds || s.totalPeriodSeconds || 0),
      0
    );

    const todayBreakSeconds = completedSessions.reduce(
      (sum, s) => sum + (s.totalBreakSeconds || 0),
      0
    );

    const activeSession = await this.getActiveSession(learnerId);

    return {
      todayFocusSeconds,
      todayFocusHours: Number((todayFocusSeconds / 3600).toFixed(2)),
      todayCompletedSessions: completedSessions.length,
      totalCompletedSessions: lifetimeCompletedCount,
      todayBreakSeconds,
      currentCompletedCycles: activeSession?.completedCycles || 0,
      activeSession,
    };
  }

  /**
   * Get learner's session history with optional filter ('all' | 'completed')
   */
  public static async getSessionHistory(
    learnerId: string,
    filter: 'all' | 'completed' = 'all'
  ): Promise<any[]> {
    if (mongoose.connection.readyState === 1) {
      const query: any = { learnerId };
      if (filter === 'completed') {
        query.status = 'completed';
      } else {
        query.$or = [
          { status: 'completed' },
          { status: 'abandoned', accumulatedFocusSeconds: { $gte: 30 } },
        ];
      }
      return await FocusSession.find(query).sort({ startedAt: -1 }).limit(100);
    } else {
      const records: any[] = [];
      for (const s of inMemoryFocusSessions.values()) {
        if (s.learnerId === learnerId) {
          if (filter === 'completed' && s.status === 'completed') {
            records.push(s);
          } else if (filter === 'all') {
            if (
              s.status === 'completed' ||
              (s.status === 'abandoned' && (s.accumulatedFocusSeconds || 0) >= 30)
            ) {
              records.push(s);
            }
          }
        }
      }
      return records.sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
    }
  }

  /**
   * Update learner focus configuration
   */
  public static async updateConfig(
    learnerId: string,
    newConfig: Partial<IFocusSessionConfig>
  ): Promise<IFocusSessionConfig> {
    const sanitized = this.sanitizeConfig(newConfig);

    if (mongoose.connection.readyState === 1) {
      await User.findByIdAndUpdate(learnerId, {
        $set: { 'focus.sessionConfig': sanitized },
      });
    }

    return sanitized;
  }
}
