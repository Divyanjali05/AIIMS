/**
 * AIIMS Prompt 6: Focus Module Automated Verification Suite
 * =========================================================
 * Rigorously verifies:
 * 1. Session duration and break configuration with strict boundary clamps.
 * 2. Explicit lifecycle state transitions (idle -> focusing -> paused -> break -> completed / abandoned).
 * 3. Authoritative server timekeeping (epoch timestamps, immunity to timer drift/throttling).
 * 4. Single active session guarantee (duplicate/concurrent session creation prevention).
 * 5. Pause time freeze & elapsed focus accumulation accuracy.
 * 6. Early completion guard (prevents claiming completion before target duration elapses).
 * 7. Break management (short break, long break intervals, break time separation from focus time).
 * 8. Abandonment handling (30s threshold, exclusion from completed counts and completed focus totals).
 * 9. Learner ownership isolation (cross-learner mutation rejection).
 * 10. Server-calculated daily and lifetime statistics.
 */

import { FocusSessionService } from '../services/focusSession.service';
import { inMemoryFocusSessions } from '../models/FocusSession.model';

let passed = 0;
let failed = 0;

function assert(description: string, condition: boolean, extra?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${description}${extra ? ` - ${extra}` : ''}`);
    failed++;
  }
}

async function runFocusVerification() {
  console.log('\n================================================================');
  console.log(' AIIMS PROMPT 6: FOCUS MODULE AUTOMATED VERIFICATION SUITE');
  console.log('================================================================\n');

  // Clear in-memory state for fresh test execution
  inMemoryFocusSessions.clear();

  const LEARNER_A = 'learner-focus-test-user-001';
  const LEARNER_B = 'learner-focus-test-user-002';

  // -------------------------------------------------------------
  // SUITE 1: Configuration Sanitization & Validation Bounds
  // -------------------------------------------------------------
  console.log('── SUITE 1: Configuration Sanitization & Validation Bounds ─────');

  const defaultConfig = FocusSessionService.sanitizeConfig({});
  assert('1.1 Default focus duration is 25 minutes', defaultConfig.focusDurationMinutes === 25);
  assert('1.2 Default break duration is 5 minutes', defaultConfig.breakDurationMinutes === 5);
  assert(
    '1.3 Default long break duration is 15 minutes',
    defaultConfig.longBreakDurationMinutes === 15
  );
  assert('1.4 Default long break interval is 4 cycles', defaultConfig.longBreakInterval === 4);
  assert('1.5 Default sound is enabled', defaultConfig.soundEnabled === true);
  assert('1.6 Default long break is enabled', defaultConfig.enableLongBreak === true);

  const clampedLower = FocusSessionService.sanitizeConfig({
    focusDurationMinutes: 0,
    breakDurationMinutes: -5,
    longBreakInterval: 0,
  });
  assert(
    '1.7 Focus duration lower bound clamped to 1 minute',
    clampedLower.focusDurationMinutes === 1
  );
  assert(
    '1.8 Break duration lower bound clamped to 1 minute',
    clampedLower.breakDurationMinutes === 1
  );
  assert(
    '1.9 Long break interval lower bound clamped to 1 cycle',
    clampedLower.longBreakInterval === 1
  );

  const clampedUpper = FocusSessionService.sanitizeConfig({
    focusDurationMinutes: 999,
    breakDurationMinutes: 120,
    longBreakInterval: 50,
  });
  assert(
    '1.10 Focus duration upper bound clamped to 180 minutes',
    clampedUpper.focusDurationMinutes === 180
  );
  assert(
    '1.11 Break duration upper bound clamped to 60 minutes',
    clampedUpper.breakDurationMinutes === 60
  );
  assert(
    '1.12 Long break interval upper bound clamped to 12 cycles',
    clampedUpper.longBreakInterval === 12
  );

  // -------------------------------------------------------------
  // SUITE 2: Single Active Session Guarantee & Lifecycle Start
  // -------------------------------------------------------------
  console.log('\n── SUITE 2: Single Active Session Guarantee & Lifecycle Start ──');

  const initialActive = await FocusSessionService.getActiveSession(LEARNER_A);
  assert('2.1 Initial active session is null (idle state)', initialActive === null);

  const startRes1 = await FocusSessionService.startSession({
    learnerId: LEARNER_A,
    trackTitle: 'AI Workflow Design',
    intention: 'Implement focus timer architecture',
    focusDurationMinutes: 25,
    breakDurationMinutes: 5,
  });

  assert('2.2 Start session returns created session', !!startRes1.session);
  assert('2.3 isExisting is false on initial creation', startRes1.isExisting === false);
  assert('2.4 Session state is "focusing"', startRes1.session.sessionState === 'focusing');
  assert('2.5 Period type is "focus"', startRes1.session.periodType === 'focus');
  assert('2.6 Session status is "in_progress"', startRes1.session.status === 'in_progress');
  assert(
    '2.7 Total period seconds is 1500 (25 min)',
    startRes1.session.totalPeriodSeconds === 1500
  );
  assert(
    '2.8 Target end time is in the future',
    new Date(startRes1.session.targetEndTime!).getTime() > Date.now()
  );

  // Concurrent / Duplicate Start Guard
  const startRes2 = await FocusSessionService.startSession({
    learnerId: LEARNER_A,
    trackTitle: 'AI Agents',
  });
  assert('2.9 Duplicate start returns existing session', startRes2.isExisting === true);
  assert(
    '2.10 Session ID matches existing active session',
    startRes2.session.sessionId === startRes1.session.sessionId
  );

  // -------------------------------------------------------------
  // SUITE 3: Pause, Freeze, and Resume Timekeeping
  // -------------------------------------------------------------
  console.log('\n── SUITE 3: Pause, Freeze, and Resume Timekeeping ─────────────');

  const pausedSession = await FocusSessionService.pauseSession(
    LEARNER_A,
    startRes1.session.sessionId
  );
  assert('3.1 Session state transitioned to "paused"', pausedSession.sessionState === 'paused');
  assert('3.2 targetEndTime is frozen (null) while paused', pausedSession.targetEndTime === null);
  assert('3.3 pausedAt timestamp is recorded', !!pausedSession.pausedAt);
  assert('3.4 remainingSeconds is frozen (> 0)', pausedSession.remainingSeconds > 0);

  // Pausing an already paused session throws error
  let pauseError = '';
  try {
    await FocusSessionService.pauseSession(LEARNER_A, startRes1.session.sessionId);
  } catch (err: any) {
    pauseError = err.message;
  }
  assert('3.5 Pausing already paused session rejected', pauseError === 'SESSION_NOT_PAUSABLE');

  // Resume Session
  const resumedSession = await FocusSessionService.resumeSession(
    LEARNER_A,
    startRes1.session.sessionId
  );
  assert('3.6 Session state returned to "focusing"', resumedSession.sessionState === 'focusing');
  assert(
    '3.7 targetEndTime re-established in future',
    new Date(resumedSession.targetEndTime!).getTime() > Date.now()
  );
  assert('3.8 pausedAt cleared to null', resumedSession.pausedAt === null);

  // -------------------------------------------------------------
  // SUITE 4: Authoritative Duration Verification & Completion
  // -------------------------------------------------------------
  console.log('\n── SUITE 4: Authoritative Duration Verification & Completion ───');

  // Early completion guard (learner attempts to claim completion after only seconds)
  let earlyCompleteError = '';
  try {
    await FocusSessionService.completePeriod(LEARNER_A, startRes1.session.sessionId);
  } catch (err: any) {
    earlyCompleteError = err.message;
  }
  assert(
    '4.1 Early completion (> 5s remaining) strictly rejected',
    earlyCompleteError === 'FOCUS_DURATION_INCOMPLETE'
  );

  // Simulate timer reaching completion (remaining <= 5s)
  resumedSession.targetEndTime = new Date(Date.now() - 1000); // Past target end time
  const completeRes = await FocusSessionService.completePeriod(LEARNER_A, resumedSession.sessionId);
  assert(
    '4.2 Session successfully completed when duration elapses',
    completeRes.session.status === 'completed'
  );
  assert('4.3 Session state is "completed"', completeRes.session.sessionState === 'completed');
  assert('4.4 completedCycles incremented to 1', completeRes.session.completedCycles === 1);
  assert('4.5 completedAt timestamp recorded', !!completeRes.session.completedAt);
  assert('4.6 History record generated', completeRes.record.status === 'completed');
  assert(
    '4.7 History record actualFocusSeconds recorded',
    completeRes.record.actualFocusSeconds === 1500
  );

  // -------------------------------------------------------------
  // SUITE 5: Break Management & Separation of Focus vs Break Time
  // -------------------------------------------------------------
  console.log('\n── SUITE 5: Break Management & Separation of Focus vs Break Time');

  const breakSession = await FocusSessionService.startBreak(LEARNER_A);
  assert('5.1 Break started successfully', breakSession.sessionState === 'break');
  assert('5.2 Period type is "short_break"', breakSession.periodType === 'short_break');
  assert('5.3 Break duration is 300 seconds (5m default)', breakSession.totalPeriodSeconds === 300);
  assert('5.4 totalBreakSeconds tracked on session', breakSession.totalBreakSeconds === 300);
  assert(
    '5.5 accumulatedFocusSeconds unchanged during break',
    breakSession.accumulatedFocusSeconds === 1500
  );

  // -------------------------------------------------------------
  // SUITE 6: Abandonment Handling & 30-Second Threshold
  // -------------------------------------------------------------
  console.log('\n── SUITE 6: Abandonment Handling & 30-Second Threshold ────────');

  // Learner B starts a session and immediately abandons (accumulated < 30s)
  const sessionB1 = await FocusSessionService.startSession({
    learnerId: LEARNER_B,
    trackTitle: 'Quick Cancel Track',
    focusDurationMinutes: 15,
  });

  const abandon1 = await FocusSessionService.abandonSession(LEARNER_B, sessionB1.session.sessionId);
  assert(
    '6.1 Immediate abandonment (< 30s) marks status "abandoned"',
    abandon1.session.status === 'abandoned'
  );
  assert(
    '6.2 Immediate abandonment is NOT saved to history (< 30s noise guard)',
    abandon1.savedToHistory === false
  );

  // Learner B starts another session and abandons after 45 seconds accumulated
  const sessionB2 = await FocusSessionService.startSession({
    learnerId: LEARNER_B,
    trackTitle: 'Partial Work Track',
    focusDurationMinutes: 25,
  });
  sessionB2.session.accumulatedFocusSeconds = 45; // Simulated 45 seconds elapsed

  const abandon2 = await FocusSessionService.abandonSession(LEARNER_B, sessionB2.session.sessionId);
  assert(
    '6.3 Partial abandonment (>= 30s) marks status "abandoned"',
    abandon2.session.status === 'abandoned'
  );
  assert(
    '6.4 Partial abandonment (>= 30s) IS saved to history record',
    abandon2.savedToHistory === true
  );

  // -------------------------------------------------------------
  // SUITE 7: Learner Ownership & Multi-Learner Isolation
  // -------------------------------------------------------------
  console.log('\n── SUITE 7: Learner Ownership & Multi-Learner Isolation ────────');

  // Learner A starts a new session
  const sessionA2 = await FocusSessionService.startSession({
    learnerId: LEARNER_A,
    trackTitle: 'Learner A Secure Track',
  });

  // Learner B attempts to pause Learner A's session
  let crossPauseError = '';
  try {
    await FocusSessionService.pauseSession(LEARNER_B, sessionA2.session.sessionId);
  } catch (err: any) {
    crossPauseError = err.message;
  }
  assert(
    '7.1 Learner B cannot pause Learner A active session',
    crossPauseError === 'NO_ACTIVE_FOCUS_SESSION'
  );

  // -------------------------------------------------------------
  // SUITE 8: Server-Calculated Daily & Lifetime Statistics
  // -------------------------------------------------------------
  console.log('\n── SUITE 8: Server-Calculated Daily & Lifetime Statistics ─────');

  const statsA = await FocusSessionService.getDailyStats(LEARNER_A);
  assert('8.1 Learner A today completed sessions is 1', statsA.todayCompletedSessions === 1);
  assert('8.2 Learner A lifetime completed sessions is 1', statsA.totalCompletedSessions === 1);
  assert('8.3 Learner A today focus seconds is exactly 1500', statsA.todayFocusSeconds === 1500);
  assert('8.4 Learner A today focus hours is 0.42 (1500/3600)', statsA.todayFocusHours === 0.42);

  const statsB = await FocusSessionService.getDailyStats(LEARNER_B);
  assert(
    '8.5 Learner B completed sessions is 0 (abandoned excluded)',
    statsB.todayCompletedSessions === 0
  );
  assert(
    '8.6 Learner B focus seconds is 0 (abandoned excluded from completed totals)',
    statsB.todayFocusSeconds === 0
  );

  // History filtering
  const historyBAll = await FocusSessionService.getSessionHistory(LEARNER_B, 'all');
  assert('8.7 History filter "all" includes partial abandoned session', historyBAll.length === 1);
  assert('8.8 History item status is "abandoned"', historyBAll[0].status === 'abandoned');

  const historyBCompleted = await FocusSessionService.getSessionHistory(LEARNER_B, 'completed');
  assert(
    '8.9 History filter "completed" excludes abandoned sessions',
    historyBCompleted.length === 0
  );

  // -------------------------------------------------------------
  // VERIFICATION SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(` VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runFocusVerification().catch((err) => {
  console.error('Unexpected verification error:', err);
  process.exit(1);
});
