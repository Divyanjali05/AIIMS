import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { FocusSessionService } from '../focusSession.service';
import { prisma } from '../../config/prisma';
import { resetPrismaTestDouble, uninstallPrismaTestDouble } from './helpers/prismaTestDouble';

describe('AIIMS Focus Module & Session Lifecycle', () => {
  const TEST_LEARNER = 'vitest-focus-learner-001';

  beforeEach(() => {
    resetPrismaTestDouble(true);
  });

  afterAll(() => {
    uninstallPrismaTestDouble();
  });

  describe('Configuration Sanitization & Bounds', () => {
    it('returns default config when empty object is passed', () => {
      const config = FocusSessionService.sanitizeConfig({});
      expect(config.focusDurationMinutes).toBe(25);
      expect(config.breakDurationMinutes).toBe(5);
      expect(config.longBreakDurationMinutes).toBe(15);
      expect(config.longBreakInterval).toBe(4);
      expect(config.soundEnabled).toBe(true);
      expect(config.enableLongBreak).toBe(true);
    });

    it('clamps values below minimum to lower bound (1 minute)', () => {
      const config = FocusSessionService.sanitizeConfig({
        focusDurationMinutes: -10,
        breakDurationMinutes: 0,
        longBreakInterval: 0,
      });
      expect(config.focusDurationMinutes).toBe(1);
      expect(config.breakDurationMinutes).toBe(1);
      expect(config.longBreakInterval).toBe(1);
    });

    it('clamps values above maximum to upper bound (180m focus, 60m break, 12 cycles)', () => {
      const config = FocusSessionService.sanitizeConfig({
        focusDurationMinutes: 500,
        breakDurationMinutes: 100,
        longBreakInterval: 24,
      });
      expect(config.focusDurationMinutes).toBe(180);
      expect(config.breakDurationMinutes).toBe(60);
      expect(config.longBreakInterval).toBe(12);
    });
  });

  describe('Session Lifecycle: Start, Pause, Resume, Complete', () => {
    it('starts a new focus session in "focusing" state with future targetEndTime', async () => {
      const { session, isExisting } = await FocusSessionService.startSession({
        learnerId: TEST_LEARNER,
        trackTitle: 'AI Evaluation & Workflow',
        focusDurationMinutes: 25,
      });

      expect(isExisting).toBe(false);
      expect(session.sessionState).toBe('focusing');
      expect(session.periodType).toBe('focus');
      expect(session.status).toBe('in_progress');
      expect(session.totalPeriodSeconds).toBe(1500);
      expect(new Date(session.targetEndTime!).getTime()).toBeGreaterThan(Date.now());
    });

    it('prevents creating duplicate active sessions for the same learner', async () => {
      const first = await FocusSessionService.startSession({
        learnerId: TEST_LEARNER,
        trackTitle: 'Track A',
      });
      const second = await FocusSessionService.startSession({
        learnerId: TEST_LEARNER,
        trackTitle: 'Track B',
      });

      expect(second.isExisting).toBe(true);
      expect(second.session.sessionId).toBe(first.session.sessionId);
    });

    it('pauses an active session and freezes targetEndTime and remainingSeconds', async () => {
      const { session } = await FocusSessionService.startSession({
        learnerId: TEST_LEARNER,
      });

      const paused = await FocusSessionService.pauseSession(TEST_LEARNER, session.sessionId);
      expect(paused.sessionState).toBe('paused');
      expect(paused.targetEndTime).toBeNull();
      expect(paused.pausedAt).toBeDefined();
      expect(paused.remainingSeconds).toBeGreaterThan(0);
    });

    it('resumes a paused session restoring future targetEndTime', async () => {
      const { session } = await FocusSessionService.startSession({
        learnerId: TEST_LEARNER,
      });
      await FocusSessionService.pauseSession(TEST_LEARNER, session.sessionId);
      const resumed = await FocusSessionService.resumeSession(TEST_LEARNER, session.sessionId);

      expect(resumed.sessionState).toBe('focusing');
      expect(resumed.pausedAt).toBeNull();
      expect(new Date(resumed.targetEndTime!).getTime()).toBeGreaterThan(Date.now());
    });

    it('rejects completing session before target duration elapses', async () => {
      const { session } = await FocusSessionService.startSession({
        learnerId: TEST_LEARNER,
      });

      await expect(
        FocusSessionService.completePeriod(TEST_LEARNER, session.sessionId)
      ).rejects.toThrow('FOCUS_DURATION_INCOMPLETE');
    });

    it('completes session when target duration elapses and increments cyclesCompleted', async () => {
      const { session } = await FocusSessionService.startSession({
        learnerId: TEST_LEARNER,
      });
      await prisma.focusSession.update({
        where: { sessionId: session.sessionId },
        data: { targetEndTime: new Date(Date.now() - 5000) },
      });

      const { session: completed, record } = await FocusSessionService.completePeriod(
        TEST_LEARNER,
        session.sessionId
      );

      expect(completed.status).toBe('completed');
      expect(completed.sessionState).toBe('completed');
      expect(completed.completedCycles).toBe(1);
      expect(record.status).toBe('completed');
      expect(record.actualFocusSeconds).toBe(1500);
    });
  });

  describe('Break Management & Focus vs Break Separation', () => {
    it('chains completed focus period into short break period', async () => {
      const { session } = await FocusSessionService.startSession({
        learnerId: TEST_LEARNER,
      });
      await prisma.focusSession.update({
        where: { sessionId: session.sessionId },
        data: { targetEndTime: new Date(Date.now() - 5000) },
      });
      await FocusSessionService.completePeriod(TEST_LEARNER, session.sessionId);

      const breakSession = await FocusSessionService.startBreak(TEST_LEARNER);
      expect(breakSession.sessionState).toBe('break');
      expect(breakSession.periodType).toBe('short_break');
      expect(breakSession.totalPeriodSeconds).toBe(300);
      expect(breakSession.totalBreakSeconds).toBe(300);
      expect(breakSession.accumulatedFocusSeconds).toBe(1500);
    });
  });

  describe('Abandonment & Stats Calculation', () => {
    it('excludes immediate cancellations (< 30s) from session history', async () => {
      const { session } = await FocusSessionService.startSession({
        learnerId: TEST_LEARNER,
      });

      const { savedToHistory } = await FocusSessionService.abandonSession(
        TEST_LEARNER,
        session.sessionId
      );
      expect(savedToHistory).toBe(false);

      const history = await FocusSessionService.getSessionHistory(TEST_LEARNER, 'all');
      expect(history.length).toBe(0);
    });

    it('saves partial sessions (>= 30s) to history but excludes from completed focus stats', async () => {
      const { session } = await FocusSessionService.startSession({
        learnerId: TEST_LEARNER,
      });
      await prisma.focusSession.update({
        where: { sessionId: session.sessionId },
        data: { accumulatedFocusSeconds: 60 },
      });

      const { savedToHistory } = await FocusSessionService.abandonSession(
        TEST_LEARNER,
        session.sessionId
      );
      expect(savedToHistory).toBe(true);

      const stats = await FocusSessionService.getDailyStats(TEST_LEARNER);
      expect(stats.todayCompletedSessions).toBe(0);
      expect(stats.todayFocusSeconds).toBe(0);

      const history = await FocusSessionService.getSessionHistory(TEST_LEARNER, 'all');
      expect(history.length).toBe(1);
      expect(history[0].status).toBe('abandoned');
    });
  });
});
