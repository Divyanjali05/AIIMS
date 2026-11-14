/**
 * focusSession.service.ts
 * =========================================================
 * Authoritative Server-Side Focus & Pomodoro Session Service (PostgreSQL + Prisma)
 *
 * Implements:
 * 1. Explicit lifecycle state machine (idle -> focusing -> paused -> break -> completed / abandoned).
 * 2. Authoritative server timekeeping (server timestamps are single source of truth).
 * 3. Single active session guarantee (rejects duplicate / concurrent sessions for same learner).
 * 4. Strict separation of focus time vs break time (breaks never count toward focus totals).
 * 5. Abandoned session exclusion from completed focus totals.
 * 6. Dual-storage synchronization (FocusSession table + User.focusData JSONB mirror).
 */

import { FocusSession as PrismaFocusSession } from '@prisma/client';
import { prisma, isDatabaseConnected } from '../config/prisma';
import {
  IFocusSession,
  IFocusSessionConfig,
  FocusSessionState,
  FocusPeriodType,
  FocusSessionStatus,
} from '../types/models';
import { toArray, toRecord } from '../utils/id';
import { defaultFocus, toJsonInput } from '../utils/userMapper';

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

function toFocusSessionDomain(row: PrismaFocusSession): IFocusSession {
  return {
    id: row.id,
    sessionId: row.sessionId,
    learnerId: row.learnerId,
    trackTitle: row.trackTitle,
    intention: row.intention,
    sessionState: row.sessionState as FocusSessionState,
    periodType: row.periodType as FocusPeriodType,
    status: row.status as FocusSessionStatus,
    focusDurationMinutes: row.focusDurationMinutes,
    breakDurationMinutes: row.breakDurationMinutes,
    longBreakDurationMinutes: row.longBreakDurationMinutes,
    longBreakInterval: row.longBreakInterval,
    enableLongBreak: row.enableLongBreak,
    soundEnabled: row.soundEnabled,
    totalPeriodSeconds: row.totalPeriodSeconds,
    remainingSeconds: row.remainingSeconds,
    accumulatedFocusSeconds: row.accumulatedFocusSeconds,
    totalBreakSeconds: row.totalBreakSeconds,
    completedCycles: row.completedCycles,
    startedAt: row.startedAt,
    pausedAt: row.pausedAt,
    targetEndTime: row.targetEndTime,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function syncUserFocusData(
  db: { user: typeof prisma.user },
  learnerId: string,
  patch: {
    status?: string;
    selectedTrack?: string;
    activeSession?: IFocusSession | null;
    sessionConfig?: IFocusSessionConfig;
    prependHistoryRecord?: Record<string, any>;
  }
): Promise<void> {
  const userRow = await db.user.findUnique({
    where: { id: learnerId },
    select: { focusData: true },
  });
  if (!userRow) return;

  const current = { ...defaultFocus(), ...toRecord(userRow.focusData) };
  if (patch.status !== undefined) current.status = patch.status;
  if (patch.selectedTrack !== undefined) current.selectedTrack = patch.selectedTrack;
  if (patch.activeSession !== undefined) current.activeSession = patch.activeSession;
  if (patch.sessionConfig !== undefined) current.sessionConfig = patch.sessionConfig;
  if (patch.prependHistoryRecord) {
    current.sessionHistory = [
      patch.prependHistoryRecord,
      ...toArray<Record<string, any>>(current.sessionHistory),
    ].slice(0, 100);
  }

  await db.user.update({
    where: { id: learnerId },
    data: { focusData: toJsonInput(current) },
  });
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
    if (!learnerId || !isDatabaseConnected()) return null;

    const row = await prisma.focusSession.findFirst({
      where: {
        learnerId,
        status: 'in_progress',
        sessionState: { in: ['focusing', 'paused', 'break'] },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (!row) return null;

    const session = toFocusSessionDomain(row);

    // Dynamically calculate live remaining seconds if actively running
    const now = Date.now();
    if (
      (session.sessionState === 'focusing' || session.sessionState === 'break') &&
      session.targetEndTime
    ) {
      const targetMs = new Date(session.targetEndTime).getTime();
      session.remainingSeconds = Math.max(0, Math.ceil((targetMs - now) / 1000));
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
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const { learnerId } = params;

    // 1. Guard against duplicate active sessions
    const existing = await this.getActiveSession(learnerId);
    if (existing) {
      return { session: existing, isExisting: true };
    }

    // 2. Resolve sanitized configuration
    const sessionConfig = this.sanitizeConfig({
      focusDurationMinutes: params.focusDurationMinutes,
      breakDurationMinutes: params.breakDurationMinutes,
      enableLongBreak: params.enableLongBreak,
      longBreakDurationMinutes: params.longBreakDurationMinutes,
      longBreakInterval: params.longBreakInterval,
      soundEnabled: params.soundEnabled,
    });

    const now = new Date();
    const durationSeconds = sessionConfig.focusDurationMinutes * 60;
    const targetEndTime = new Date(now.getTime() + durationSeconds * 1000);
    const sessionId = `foc-sess-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const trackTitle = params.trackTitle?.trim() || 'AI Workflow Design';
    const intention = params.intention?.trim() || '';

    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.focusSession.create({
        data: {
          sessionId,
          learnerId,
          trackTitle,
          intention,
          sessionState: 'focusing',
          periodType: 'focus',
          status: 'in_progress',
          focusDurationMinutes: sessionConfig.focusDurationMinutes,
          breakDurationMinutes: sessionConfig.breakDurationMinutes,
          longBreakDurationMinutes: sessionConfig.longBreakDurationMinutes,
          longBreakInterval: sessionConfig.longBreakInterval,
          enableLongBreak: sessionConfig.enableLongBreak,
          soundEnabled: sessionConfig.soundEnabled,
          totalPeriodSeconds: durationSeconds,
          remainingSeconds: durationSeconds,
          accumulatedFocusSeconds: 0,
          totalBreakSeconds: 0,
          completedCycles: 0,
          startedAt: now,
          pausedAt: null,
          targetEndTime,
          completedAt: null,
        },
      });

      const domain = toFocusSessionDomain(row);
      await syncUserFocusData(tx, learnerId, {
        status: 'active',
        selectedTrack: trackTitle,
        activeSession: domain,
        sessionConfig,
      });

      return domain;
    });

    return { session: created, isExisting: false };
  }

  /**
   * Pause active session (freezes remaining time & accumulates elapsed focus time)
   */
  public static async pauseSession(learnerId: string, sessionId?: string): Promise<IFocusSession> {
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

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

    let accumulatedFocusSeconds = session.accumulatedFocusSeconds;
    if (session.periodType === 'focus') {
      const elapsed = Math.max(0, session.totalPeriodSeconds - remainingSeconds);
      accumulatedFocusSeconds = Math.max(accumulatedFocusSeconds, elapsed);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.focusSession.update({
        where: { sessionId: session.sessionId },
        data: {
          sessionState: 'paused',
          remainingSeconds,
          targetEndTime: null,
          pausedAt: new Date(),
          accumulatedFocusSeconds,
        },
      });

      const domain = toFocusSessionDomain(row);
      await syncUserFocusData(tx, learnerId, { activeSession: domain });
      return domain;
    });

    return updated;
  }

  /**
   * Resume paused focus session
   */
  public static async resumeSession(learnerId: string, sessionId?: string): Promise<IFocusSession> {
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

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
    const nextState: FocusSessionState = session.periodType === 'focus' ? 'focusing' : 'break';

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.focusSession.update({
        where: { sessionId: session.sessionId },
        data: {
          sessionState: nextState,
          targetEndTime: newTargetEndTime,
          pausedAt: null,
        },
      });

      const domain = toFocusSessionDomain(row);
      await syncUserFocusData(tx, learnerId, { activeSession: domain });
      return domain;
    });

    return updated;
  }

  /**
   * Complete active focus period
   * Authoritatively verifies duration or allows completion if remaining <= 5s tolerance
   */
  public static async completePeriod(
    learnerId: string,
    sessionId?: string
  ): Promise<{ session: IFocusSession; record: any }> {
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const session = await this.getActiveSession(learnerId);
    if (!session) {
      throw new Error('NO_ACTIVE_FOCUS_SESSION');
    }

    if (sessionId && session.sessionId !== sessionId) {
      throw new Error('SESSION_ID_MISMATCH');
    }

    const now = Date.now();

    if (session.sessionState === 'focusing' && session.targetEndTime) {
      const targetMs = new Date(session.targetEndTime).getTime();
      session.remainingSeconds = Math.max(0, Math.ceil((targetMs - now) / 1000));
    }

    // Strict Duration Validation Guard: if more than 5 seconds remain, reject early claim
    if (session.periodType === 'focus' && session.remainingSeconds > 5) {
      throw new Error('FOCUS_DURATION_INCOMPLETE');
    }

    const actualFocusSeconds = session.totalPeriodSeconds;
    const newCycles = session.completedCycles + 1;
    const completedAt = new Date();
    const accumulatedFocusSeconds = Math.max(session.accumulatedFocusSeconds, actualFocusSeconds);

    const historyRecord = {
      id: session.sessionId,
      trackTitle: session.trackTitle,
      intention: session.intention,
      focusDurationMinutes: session.focusDurationMinutes,
      actualFocusSeconds,
      breakDurationMinutes: session.breakDurationMinutes,
      startedAt: session.startedAt,
      completedAt,
      status: 'completed',
      cyclesCompleted: newCycles,
    };

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.focusSession.update({
        where: { sessionId: session.sessionId },
        data: {
          completedCycles: newCycles,
          accumulatedFocusSeconds,
          remainingSeconds: 0,
          targetEndTime: null,
          completedAt,
          status: 'completed',
          sessionState: 'completed',
        },
      });

      await syncUserFocusData(tx, learnerId, {
        activeSession: null,
        prependHistoryRecord: historyRecord,
      });

      return toFocusSessionDomain(row);
    });

    return { session: updated, record: historyRecord };
  }

  /**
   * Start Break Period (short break or long break)
   */
  public static async startBreak(
    learnerId: string,
    params?: { sessionId?: string; forceLongBreak?: boolean }
  ): Promise<IFocusSession> {
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    let session = await this.getActiveSession(learnerId);

    if (!session) {
      const lastCompleted = await prisma.focusSession.findFirst({
        where: {
          learnerId,
          sessionState: 'completed',
        },
        orderBy: { completedAt: 'desc' },
      });
      if (lastCompleted) {
        session = toFocusSessionDomain(lastCompleted);
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

    const createdBreak = await prisma.$transaction(async (tx) => {
      const row = await tx.focusSession.create({
        data: {
          sessionId: breakSessionId,
          learnerId,
          trackTitle: session!.trackTitle,
          intention: session!.intention ?? '',
          sessionState: 'break',
          periodType: isLong ? 'long_break' : 'short_break',
          status: 'in_progress',
          focusDurationMinutes: session!.focusDurationMinutes,
          breakDurationMinutes: session!.breakDurationMinutes,
          longBreakDurationMinutes: session!.longBreakDurationMinutes,
          longBreakInterval: session!.longBreakInterval,
          enableLongBreak: session!.enableLongBreak,
          soundEnabled: session!.soundEnabled,
          totalPeriodSeconds: breakSeconds,
          remainingSeconds: breakSeconds,
          accumulatedFocusSeconds: session!.accumulatedFocusSeconds,
          totalBreakSeconds: breakSeconds,
          completedCycles: session!.completedCycles,
          startedAt: now,
          pausedAt: null,
          targetEndTime,
          completedAt: null,
        },
      });

      const domain = toFocusSessionDomain(row);
      await syncUserFocusData(tx, learnerId, { activeSession: domain });
      return domain;
    });

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
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

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

    const completedAt = new Date();
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
          completedAt,
          status: 'abandoned',
          cyclesCompleted: session.completedCycles,
        }
      : undefined;

    const resultSession = await prisma.$transaction(async (tx) => {
      if (!savedToHistory) {
        await tx.focusSession.delete({ where: { sessionId: session.sessionId } });
        await syncUserFocusData(tx, learnerId, { activeSession: null });
        return {
          ...session,
          status: 'abandoned' as FocusSessionStatus,
          sessionState: 'abandoned' as FocusSessionState,
          completedAt,
          targetEndTime: null,
          remainingSeconds: 0,
          accumulatedFocusSeconds: accumulated,
        };
      }

      const row = await tx.focusSession.update({
        where: { sessionId: session.sessionId },
        data: {
          status: 'abandoned',
          sessionState: 'abandoned',
          completedAt,
          targetEndTime: null,
          remainingSeconds: 0,
          accumulatedFocusSeconds: accumulated,
        },
      });
      await syncUserFocusData(tx, learnerId, {
        activeSession: null,
        prependHistoryRecord: historyRecord,
      });
      return toFocusSessionDomain(row);
    });

    return { session: resultSession, savedToHistory };
  }

  /**
   * Get server-calculated daily and lifetime statistics
   * Excludes break time and abandoned sessions from focus time totals!
   */
  public static async getDailyStats(learnerId: string): Promise<FocusDailyStats> {
    if (!isDatabaseConnected()) {
      return {
        todayFocusSeconds: 0,
        todayFocusHours: 0,
        todayCompletedSessions: 0,
        totalCompletedSessions: 0,
        todayBreakSeconds: 0,
        currentCompletedCycles: 0,
        activeSession: null,
      };
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [completedSessions, lifetimeCompletedCount, activeSession] = await Promise.all([
      prisma.focusSession.findMany({
        where: {
          learnerId,
          status: 'completed',
          completedAt: { gte: startOfToday },
        },
      }),
      prisma.focusSession.count({
        where: {
          learnerId,
          status: 'completed',
        },
      }),
      this.getActiveSession(learnerId),
    ]);

    const todayFocusSeconds = completedSessions.reduce(
      (sum, s) => sum + (s.accumulatedFocusSeconds || s.totalPeriodSeconds || 0),
      0
    );

    const todayBreakSeconds = completedSessions.reduce(
      (sum, s) => sum + (s.totalBreakSeconds || 0),
      0
    );

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
  ): Promise<IFocusSession[]> {
    if (!isDatabaseConnected()) return [];

    const rows = await prisma.focusSession.findMany({
      where:
        filter === 'completed'
          ? { learnerId, status: 'completed' }
          : {
              learnerId,
              OR: [
                { status: 'completed' },
                { status: 'abandoned', accumulatedFocusSeconds: { gte: 30 } },
              ],
            },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });

    return rows.map(toFocusSessionDomain);
  }

  /**
   * Update learner focus configuration
   */
  public static async updateConfig(
    learnerId: string,
    newConfig: Partial<IFocusSessionConfig>
  ): Promise<IFocusSessionConfig> {
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const sanitized = this.sanitizeConfig(newConfig);
    await syncUserFocusData(prisma, learnerId, { sessionConfig: sanitized });
    return sanitized;
  }
}
