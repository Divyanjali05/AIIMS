/**
 * learnerStateSync.test.ts
 * =========================================================
 * AIIMS Learner-State Synchronization Sanitizer Test Suite
 *
 * Verifies:
 *  1. Sanitized PUT /api/learner/state payload omits role and server-controlled fields.
 *  2. Excluded slices (credits, assessment, analysis, relevance, clarity, focus) are omitted.
 *  3. Approved client-writable fields (profile, radar prefs, investigation notes, notifications, aiWallet, solver, build) are preserved.
 *  4. Input React state object is never mutated and sanitizer is idempotent.
 */

import { buildWritableLearnerStatePayload } from '../../utils/learnerStateSync';
import type { LearnerState } from '../../context/LearnerContext';

type TestFn = (name: string, fn: () => void | Promise<void>) => void;
type ExpectMatcher = { [key: string]: (...args: unknown[]) => unknown };
declare const describe: TestFn & { [key: string]: unknown };
declare const it: TestFn & { [key: string]: unknown };
declare const expect: (actual: unknown) => ExpectMatcher;

export interface LearnerStateSyncTestResult {
  name: string;
  passed: boolean;
  detail?: string;
}

export function runLearnerStateSyncTestSuite(): {
  passedCount: number;
  failedCount: number;
  totalCount: number;
  results: LearnerStateSyncTestResult[];
} {
  const results: LearnerStateSyncTestResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  function record(name: string, condition: boolean, detail?: string) {
    if (condition) {
      passedCount++;
      results.push({ name, passed: true, detail: detail || 'Passed' });
    } else {
      failedCount++;
      results.push({ name, passed: false, detail: detail || 'Assertion failed' });
    }
  }

  const fullSnapshot: LearnerState = {
    profile: {
      id: 'user-123',
      name: 'Priya Sharma',
      email: 'priya@aiims.edu',
      role: 'learner',
      track: 'Student',
      college: 'IIT Madras',
      targetGoal: 'Master Applied AI Systems',
      stage: 'Understanding',
      xpPoints: 350,
      aiimsCredits: 565,
    },
    academicProfile: {
      stream: 'TECH',
      educationLevel: 'UG',
      programId: 'btech',
      programName: 'B.Tech',
      specializationId: 'cse',
      specializationName: 'Computer Science',
      yearOfStudy: 3,
      admissionYear: 2024,
      expectedGraduationYear: 2028,
    },
    assessment: {
      status: 'completed',
      answers: { 1: 'b' },
      currentQuestionIndex: 25,
      completedAt: '2026-11-01T10:00:00Z',
      rewardClaimed: true,
      scores: {
        usageFrequency: 80,
        evaluationCapability: 85,
        workflowDesign: 78,
        strategicVision: 75,
        mentorshipReadiness: 70,
      },
    },
    analysis: {
      status: 'viewed',
      topCapability: 'Critical AI Verification',
      growthArea: 'Autonomous Workflows',
    },
    clarity: {
      status: 'completed',
      selectedAreas: ['Research & Analysis'],
      selectedTopic: 'Structured Prompting',
      completedTopics: ['Structured Prompting'],
      reflections: { 'Structured Prompting': 'Deep verification notes' },
      taskScores: {
        'Structured Prompting': {
          easy: { score: 92, output: 'Good output', userPrompt: 'Prompt text' },
        },
      },
    },
    focus: {
      status: 'active',
      selectedTrack: 'Prompt Engineering',
      history: ['session-1'],
      activatedAt: '2026-11-02T09:00:00Z',
      sessionConfig: {
        focusDurationMinutes: 25,
        breakDurationMinutes: 5,
        enableLongBreak: true,
        longBreakDurationMinutes: 15,
        longBreakInterval: 4,
        soundEnabled: true,
      },
      activeSession: null,
      sessionHistory: [
        {
          id: 'session-1',
          trackTitle: 'Prompt Engineering',
          startedAt: '2026-11-02T09:00:00Z',
          plannedFocusSeconds: 1500,
          actualFocusSeconds: 1500,
          cyclesCompleted: 1,
          status: 'completed',
        },
      ],
    },
    radar: {
      status: 'available',
      investigatedSignalIds: ['sig-001'],
      savedSignalIds: ['sig-002'],
      dismissedSignalIds: ['sig-009'],
      lastViewedRadar: '2026-11-05',
      radarProgress: 40,
    },
    investigation: {
      status: 'completed',
      selectedSignalId: 'sig-001',
      userNotes: { 'sig-001': 'Key shift in agentic verification' },
    },
    relevance: {
      status: 'unlocked',
    },
    credits: {
      balance: 565,
      transactions: [
        {
          id: 'tx-1',
          description: 'Welcome Bonus',
          amount: 500,
          type: 'EARN',
          timestamp: '2026-11-01',
          actionKey: 'WELCOME_BONUS',
        },
      ],
      claimedActions: ['WELCOME_BONUS'],
    },
    notifications: [
      {
        id: 'notif-1',
        title: 'Welcome',
        message: 'Start assessment',
        timestamp: 'Just now',
        targetTab: 'assessment',
        read: true,
      },
    ],
    aiWallet: {
      userTools: [
        {
          toolId: 'tool-chatgpt',
          addedAt: '2026-11-01',
          familiarity: 'proficient',
          primaryCategory: 'Reasoning & Writing',
          userNotes: 'Daily drafting assistant',
          customTags: ['writing'],
        },
      ],
      dismissedRecommendations: ['rec-123'],
      audienceMode: 'student',
    },
    solver: {
      latestWorkflow: null,
      history: [],
    },
    build: {
      projects: [],
      activeProjectId: null,
    },
  };

  const sanitized = buildWritableLearnerStatePayload(fullSnapshot);
  const serialized = JSON.stringify(sanitized);
  const rawRecord = sanitized as Record<string, unknown>;
  const profileRecord = (sanitized.profile || {}) as Record<string, unknown>;
  const radarRecord = (sanitized.radar || {}) as Record<string, unknown>;
  const investigationRecord = (sanitized.investigation || {}) as Record<string, unknown>;

  record(
    'S1: Sanitized profile excludes role, id, email, aiimsCredits, xpPoints, and track',
    profileRecord.role === undefined &&
      profileRecord.id === undefined &&
      profileRecord.email === undefined &&
      profileRecord.aiimsCredits === undefined &&
      profileRecord.xpPoints === undefined &&
      profileRecord.track === undefined
  );

  record(
    'S2: Sanitized profile includes writable name, college, targetGoal, and stage',
    sanitized.profile?.name === 'Priya Sharma' &&
      sanitized.profile?.college === 'IIT Madras' &&
      sanitized.profile?.targetGoal === 'Master Applied AI Systems' &&
      sanitized.profile?.stage === 'Understanding'
  );

  record(
    'S3: Sanitized payload completely excludes server-controlled slices (credits, assessment, analysis, relevance, clarity, focus, academicProfile)',
    rawRecord.credits === undefined &&
      rawRecord.assessment === undefined &&
      rawRecord.analysis === undefined &&
      rawRecord.relevance === undefined &&
      rawRecord.clarity === undefined &&
      rawRecord.focus === undefined &&
      rawRecord.academicProfile === undefined
  );

  record(
    'S4: Sanitized radar excludes server-managed status & investigatedSignalIds while keeping saved/dismissed signals',
    radarRecord.status === undefined &&
      radarRecord.investigatedSignalIds === undefined &&
      sanitized.radar?.savedSignalIds?.[0] === 'sig-002' &&
      sanitized.radar?.dismissedSignalIds?.[0] === 'sig-009' &&
      sanitized.radar?.lastViewedRadar === '2026-11-05' &&
      sanitized.radar?.radarProgress === 40
  );

  record(
    'S5: Sanitized investigation excludes server-gated status while keeping selectedSignalId and userNotes',
    investigationRecord.status === undefined &&
      sanitized.investigation?.selectedSignalId === 'sig-001' &&
      sanitized.investigation?.userNotes?.['sig-001'] === 'Key shift in agentic verification'
  );

  record(
    'S6: Sanitized aiWallet, notifications, solver, and build preserve editable workspace items',
    sanitized.aiWallet?.userTools?.length === 1 &&
      sanitized.aiWallet?.dismissedRecommendations?.[0] === 'rec-123' &&
      sanitized.aiWallet?.audienceMode === 'student' &&
      sanitized.notifications?.length === 1 &&
      sanitized.notifications[0].read === true &&
      sanitized.solver !== undefined &&
      sanitized.build !== undefined
  );

  record(
    'S7: Sanitizer does not mutate original LearnerState snapshot',
    fullSnapshot.profile.role === 'learner' &&
      fullSnapshot.credits.balance === 565 &&
      fullSnapshot.clarity.taskScores?.['Structured Prompting']?.easy?.score === 92 &&
      fullSnapshot.focus.sessionHistory?.length === 1
  );

  record(
    'S8: Sanitizer is idempotent when invoked repeatedly',
    JSON.stringify(buildWritableLearnerStatePayload(sanitized)) === serialized
  );

  return {
    passedCount,
    failedCount,
    totalCount: results.length,
    results,
  };
}

if (typeof describe === 'function') {
  describe('Learner State Sync Sanitization & Contract', () => {
    const suite = runLearnerStateSyncTestSuite();
    suite.results.forEach((r) => {
      it(r.name, () => {
        expect(r.passed).toBe(true);
      });
    });
  });
}

