/**
 * featureAccess.test.ts
 * =========================================================
 * AIIMS Phase 3: Rule-Based Entitlements & Journey Gates Test Suite
 */

import { getFeatureAccess, UNRESOLVED_UNLOCK_CONDITIONS, FeatureId } from '../featureAccessService';
import { resolveLearnerNextAction } from '../journeyResolver';
import { LearnerState } from '../../context/LearnerContext';

type TestFn = (name: string, fn: () => void | Promise<void>) => void;
type ExpectMatcher = { [key: string]: (...args: unknown[]) => unknown };
declare const describe: TestFn & { [key: string]: unknown };
declare const it: TestFn & { [key: string]: unknown };
declare const expect: (actual: unknown) => ExpectMatcher;

export interface TestResult {
  passed: boolean;
  name: string;
  detail?: string;
}

const createMockLearnerState = (overrides?: Partial<LearnerState>): LearnerState => ({
  profile: {
    id: 'user-test-01',
    name: 'Alex AI',
    email: 'alex.ai@example.com',
    role: 'STUDENT',
    targetGoal: 'Explore AI Architectures & Intelligence',
    stage: 'Knowing',
    xpPoints: 100,
    aiimsCredits: 500,
  },
  assessment: {
    status: 'not_started',
    answers: {},
    currentQuestionIndex: 0,
    completedAt: null,
    rewardClaimed: false,
    scores: {
      usageFrequency: 0,
      evaluationCapability: 0,
      workflowDesign: 0,
      strategicVision: 0,
      mentorshipReadiness: 0,
    },
  },
  analysis: {
    status: 'locked',
    topCapability: 'AI Evaluation & Critical Assessment',
    growthArea: 'AI Workflow Design',
  },
  clarity: {
    status: 'locked',
    selectedAreas: [],
    selectedTopic: null,
    completedTopics: [],
    reflections: {},
    taskScores: {},
  },
  focus: {
    status: 'locked',
    selectedTrack: null,
    history: [],
    activatedAt: null,
  },
  radar: {
    status: 'locked',
    investigatedSignalIds: [],
    savedSignalIds: [],
    dismissedSignalIds: [],
    lastViewedRadar: null,
    radarProgress: 0,
  },
  investigation: {
    status: 'locked',
    selectedSignalId: null,
    userNotes: {},
  },
  relevance: {
    status: 'locked',
  },
  credits: {
    balance: 500,
    transactions: [],
    claimedActions: [],
  },
  notifications: [],
  aiWallet: {
    userTools: [],
    dismissedRecommendations: [],
  },
  solver: {
    latestWorkflow: null,
    history: [],
  },
  build: {
    projects: [],
    activeProjectId: null,
  },
  ...overrides,
});

export function runFeatureAccessTestSuite(): {
  passedCount: number;
  failedCount: number;
  results: TestResult[];
} {
  const results: TestResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  function assert(name: string, condition: boolean, detail?: string) {
    if (condition) {
      passedCount++;
      results.push({ passed: true, name });
    } else {
      failedCount++;
      results.push({ passed: false, name, detail });
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Assessment Incomplete -> My AI Profile Remains Locked
  // ---------------------------------------------------------------------------
  const freshState = createMockLearnerState();
  const freshProfileAccess = getFeatureAccess('analysis', freshState);
  assert(
    '1A: My AI Profile is visible when assessment is incomplete',
    freshProfileAccess.visible === true
  );
  assert(
    '1B: My AI Profile is locked when assessment is incomplete',
    freshProfileAccess.unlocked === false
  );
  assert(
    '1C: Lock explanation clearly states requirement to complete assessment',
    typeof freshProfileAccess.reason === 'string' &&
      freshProfileAccess.reason.includes('complete your baseline assessment')
  );
  assert(
    '1D: Next action points user to assessment tab',
    freshProfileAccess.targetTab === 'assessment'
  );

  // ---------------------------------------------------------------------------
  // 2. Assessment Completed -> My AI Profile Unlocks
  // ---------------------------------------------------------------------------
  const assessmentDoneState = createMockLearnerState({
    assessment: {
      status: 'completed',
      answers: { 1: 'a', 2: ['b'] },
      currentQuestionIndex: 24,
      completedAt: '18 Oct 2026',
      rewardClaimed: true,
      scores: {
        usageFrequency: 80,
        evaluationCapability: 85,
        workflowDesign: 70,
        strategicVision: 75,
        mentorshipReadiness: 65,
      },
    },
    analysis: {
      status: 'unlocked',
      topCapability: 'AI Evaluation & Critical Assessment',
      growthArea: 'AI Workflow Design',
    },
  });
  const completedProfileAccess = getFeatureAccess('analysis', assessmentDoneState);
  assert(
    '2A: My AI Profile unlocks immediately upon assessment completion',
    completedProfileAccess.unlocked === true
  );
  assert(
    '2B: My AI Profile remains visible when unlocked',
    completedProfileAccess.visible === true
  );

  // ---------------------------------------------------------------------------
  // 3. Clarity & Focus Prerequisites
  // ---------------------------------------------------------------------------
  // 3A: Clarity locked when assessment incomplete
  const clarityIncomplete = getFeatureAccess('clarity', freshState);
  assert(
    '3A: Clarity is locked when assessment is incomplete',
    clarityIncomplete.unlocked === false && clarityIncomplete.visible === true
  );

  // 3B: Clarity unlocked when assessment complete and profile analyzed/viewed
  const clarityUnlockedState = createMockLearnerState({
    assessment: { ...assessmentDoneState.assessment },
    analysis: { status: 'viewed', topCapability: 'Evaluation', growthArea: 'Workflows' },
    clarity: {
      status: 'unlocked',
      selectedAreas: ['Workflows'],
      selectedTopic: null,
      completedTopics: [],
      reflections: {},
      taskScores: {},
    },
  });
  const clarityAccess = getFeatureAccess('clarity', clarityUnlockedState);
  assert(
    '3B: Clarity unlocks after assessment is completed and profile is viewed',
    clarityAccess.unlocked === true
  );

  // 3C: Focus locked when clarity has not been explored
  const focusLockedState = createMockLearnerState({
    assessment: { ...assessmentDoneState.assessment },
    analysis: { status: 'viewed', topCapability: 'Evaluation', growthArea: 'Workflows' },
    clarity: {
      status: 'unlocked',
      selectedAreas: [],
      selectedTopic: null,
      completedTopics: [],
      reflections: {},
      taskScores: {},
    },
    focus: {
      status: 'locked',
      selectedTrack: null,
      history: [],
      activatedAt: null,
    },
  });
  const focusLockedAccess = getFeatureAccess('focus', focusLockedState);
  assert(
    '3C: Focus is locked when clarity activities have not been completed',
    focusLockedAccess.unlocked === false
  );
  assert(
    '3D: Focus lock reason points to exploring Clarity',
    Boolean(focusLockedAccess.reason?.includes('Clarity'))
  );

  // 3E: Focus unlocks when clarity topic is completed or focus track selected
  const focusUnlockedState = createMockLearnerState({
    ...focusLockedState,
    clarity: {
      ...focusLockedState.clarity,
      status: 'completed',
      completedTopics: ['Checking AI Output'],
    },
    focus: {
      status: 'unlocked',
      selectedTrack: null,
      history: [],
      activatedAt: null,
    },
  });
  const focusUnlockedAccess = getFeatureAccess('focus', focusUnlockedState);
  assert(
    '3E: Focus unlocks when learner completes a Clarity activity',
    focusUnlockedAccess.unlocked === true
  );

  // ---------------------------------------------------------------------------
  // 4. Level 2–4 Workspaces Remain Visible While Safely Locked
  // ---------------------------------------------------------------------------
  const level2To4Features: FeatureId[] = [
    'radar',
    'investigation',
    'relevance',
    'solver',
    'build',
    'mentor',
  ];

  level2To4Features.forEach((fid) => {
    const acc = getFeatureAccess(fid, focusUnlockedState);
    assert(`4: Feature "${fid}" is visible while locked`, acc.visible === true);
    assert(`4: Feature "${fid}" is safely locked`, acc.unlocked === false);
    assert(
      `4: Feature "${fid}" has human-readable reason`,
      typeof acc.reason === 'string' && acc.reason.length > 10
    );
    assert(`4: Feature "${fid}" marked as unresolved condition`, acc.isUnresolved === true);
  });

  // ---------------------------------------------------------------------------
  // 5. Undefined Unlock Conditions Do Not Grant Access
  // ---------------------------------------------------------------------------
  const richStateWithArbitraryData = createMockLearnerState({
    credits: {
      balance: 99999, // High balance cannot bypass entitlement locks
      transactions: [],
      claimedActions: [],
    },
    profile: {
      ...freshState.profile,
      stage: 'Adapting', // Visual stage does not bypass gates
    },
  });
  assert(
    '5A: High credit balance does not unlock Level 2 AI Radar',
    getFeatureAccess('radar', richStateWithArbitraryData).unlocked === false
  );
  assert(
    '5B: High credit balance does not unlock Level 3 Problem Solver',
    getFeatureAccess('solver', richStateWithArbitraryData).unlocked === false
  );
  assert(
    '5C: High credit balance does not unlock Level 4 Mentor Workspace',
    getFeatureAccess('mentor', richStateWithArbitraryData).unlocked === false
  );

  // ---------------------------------------------------------------------------
  // 6. Core Always-Accessible Features
  // ---------------------------------------------------------------------------
  const alwaysOpenFeatures: FeatureId[] = [
    'home',
    'assessment',
    'wallet',
    'credits',
    'settings',
    'journey',
  ];
  alwaysOpenFeatures.forEach((fid) => {
    const acc = getFeatureAccess(fid, freshState);
    assert(
      `6: Feature "${fid}" is always unlocked and visible on registration`,
      acc.unlocked === true && acc.visible === true
    );
  });

  // ---------------------------------------------------------------------------
  // 7. Journey Stages Status Synchronization
  // ---------------------------------------------------------------------------
  const freshJourney = resolveLearnerNextAction(freshState);
  assert('7A: Home Journey contains all 10 stages', freshJourney.journeyStages.length === 10);
  assert(
    '7B: Stage 1 (UNDERSTAND AI) is current on fresh account',
    freshJourney.journeyStages[0].status === 'current'
  );
  assert(
    '7C: Stage 2 (MY AI PROFILE) is locked when assessment incomplete',
    freshJourney.journeyStages[1].status === 'locked'
  );
  assert(
    '7D: Stage 6-10 (Radar, Relevance, Solver, Build, Improve) are locked',
    freshJourney.journeyStages.slice(5).every((s) => s.status === 'locked')
  );

  const completedJourney = resolveLearnerNextAction(assessmentDoneState);
  assert(
    '7E: Stage 1 is completed when assessment is done',
    completedJourney.journeyStages[0].status === 'completed'
  );
  assert(
    '7F: Stage 2 is current (recommended) when assessment is done and profile not viewed',
    completedJourney.journeyStages[1].status === 'current'
  );

  // ---------------------------------------------------------------------------
  // 8. Unresolved Unlock Conditions Register
  // ---------------------------------------------------------------------------
  assert(
    '8A: Canonical Unresolved Register lists all 6 Level 2-4 premium interfaces',
    UNRESOLVED_UNLOCK_CONDITIONS.length === 6
  );
  assert(
    '8B: Unresolved conditions reference Owner Decisions 1 & 2',
    UNRESOLVED_UNLOCK_CONDITIONS.every((u) => u.decisionRef.includes('Decision 1'))
  );

  // ---------------------------------------------------------------------------
  // 9. Levels 1 to 4 Navigation & Growth Insights / Investigation / Improve
  // ---------------------------------------------------------------------------
  const insightsLocked = getFeatureAccess('insights', freshState);
  assert(
    '9A: Growth Insights is Level 1 and locked when assessment is incomplete',
    insightsLocked.level === 'Level 1' && insightsLocked.unlocked === false
  );
  assert(
    '9B: Growth Insights has clear next action pointing to baseline assessment',
    insightsLocked.targetTab === 'assessment' && Boolean(insightsLocked.unlockAction)
  );

  const insightsUnlocked = getFeatureAccess('insights', assessmentDoneState);
  assert(
    '9C: Growth Insights unlocks when assessment is completed',
    insightsUnlocked.level === 'Level 1' && insightsUnlocked.unlocked === true
  );

  const investigationAccess = getFeatureAccess('investigation', freshState);
  assert(
    '9D: Signal Investigation is Level 2 and locked for now',
    investigationAccess.level === 'Level 2' && investigationAccess.unlocked === false
  );
  assert(
    '9E: Signal Investigation has clear unlock reason and next step pointing to radar',
    investigationAccess.targetTab === 'radar' && typeof investigationAccess.reason === 'string'
  );

  const mentorAccess = getFeatureAccess('mentor', freshState);
  assert(
    '9F: Improve (Mentor) is Level 4 and locked for now',
    mentorAccess.level === 'Level 4' && mentorAccess.unlocked === false
  );
  assert(
    '9G: Improve (Mentor) has clear unlock reason and next action',
    Boolean(mentorAccess.unlockAction) && typeof mentorAccess.reason === 'string'
  );

  return { passedCount, failedCount, results };
}

if (typeof describe === 'function') {
  describe('Feature Access, Entitlements & Journey Gates', () => {
    describe('1. Assessment Incomplete -> My AI Profile Remains Locked', () => {
      const freshState = createMockLearnerState();
      const freshProfileAccess = getFeatureAccess('analysis', freshState);

      it('1A: My AI Profile is visible when assessment is incomplete', () => {
        expect(freshProfileAccess.visible).toBe(true);
      });

      it('1B: My AI Profile is locked when assessment is incomplete', () => {
        expect(freshProfileAccess.unlocked).toBe(false);
      });

      it('1C: Lock explanation clearly states requirement to complete assessment', () => {
        expect(
          typeof freshProfileAccess.reason === 'string' &&
            freshProfileAccess.reason.includes('complete your baseline assessment')
        ).toBe(true);
      });

      it('1D: Next action points user to assessment tab', () => {
        expect(freshProfileAccess.targetTab).toBe('assessment');
      });
    });

    describe('2. Assessment Completed -> My AI Profile Unlocks', () => {
      const assessmentDoneState = createMockLearnerState({
        assessment: {
          status: 'completed',
          answers: { 1: 'a', 2: ['b'] },
          currentQuestionIndex: 24,
          completedAt: '18 Oct 2026',
          rewardClaimed: true,
          scores: {
            usageFrequency: 80,
            evaluationCapability: 85,
            workflowDesign: 70,
            strategicVision: 75,
            mentorshipReadiness: 65,
          },
        },
        analysis: {
          status: 'unlocked',
          topCapability: 'AI Evaluation & Critical Assessment',
          growthArea: 'AI Workflow Design',
        },
      });
      const completedProfileAccess = getFeatureAccess('analysis', assessmentDoneState);

      it('2A: My AI Profile unlocks immediately upon assessment completion', () => {
        expect(completedProfileAccess.unlocked).toBe(true);
      });

      it('2B: My AI Profile remains visible when unlocked', () => {
        expect(completedProfileAccess.visible).toBe(true);
      });
    });

    describe('3. Clarity & Focus Prerequisites', () => {
      const freshState = createMockLearnerState();
      const assessmentDoneState = createMockLearnerState({
        assessment: {
          status: 'completed',
          answers: { 1: 'a', 2: ['b'] },
          currentQuestionIndex: 24,
          completedAt: '18 Oct 2026',
          rewardClaimed: true,
          scores: {
            usageFrequency: 80,
            evaluationCapability: 85,
            workflowDesign: 70,
            strategicVision: 75,
            mentorshipReadiness: 65,
          },
        },
        analysis: {
          status: 'unlocked',
          topCapability: 'AI Evaluation & Critical Assessment',
          growthArea: 'AI Workflow Design',
        },
      });

      it('3A: Clarity is locked when assessment is incomplete', () => {
        const clarityIncomplete = getFeatureAccess('clarity', freshState);
        expect(clarityIncomplete.unlocked).toBe(false);
        expect(clarityIncomplete.visible).toBe(true);
      });

      it('3B: Clarity unlocks after assessment is completed and profile is viewed', () => {
        const clarityUnlockedState = createMockLearnerState({
          assessment: { ...assessmentDoneState.assessment },
          analysis: { status: 'viewed', topCapability: 'Evaluation', growthArea: 'Workflows' },
          clarity: {
            status: 'unlocked',
            selectedAreas: ['Workflows'],
            selectedTopic: null,
            completedTopics: [],
            reflections: {},
            taskScores: {},
          },
        });
        const clarityAccess = getFeatureAccess('clarity', clarityUnlockedState);
        expect(clarityAccess.unlocked).toBe(true);
      });

      it('3C: Focus is locked when clarity activities have not been completed', () => {
        const focusLockedState = createMockLearnerState({
          assessment: { ...assessmentDoneState.assessment },
          analysis: { status: 'viewed', topCapability: 'Evaluation', growthArea: 'Workflows' },
          clarity: {
            status: 'unlocked',
            selectedAreas: [],
            selectedTopic: null,
            completedTopics: [],
            reflections: {},
            taskScores: {},
          },
          focus: {
            status: 'locked',
            selectedTrack: null,
            history: [],
            activatedAt: null,
          },
        });
        const focusLockedAccess = getFeatureAccess('focus', focusLockedState);
        expect(focusLockedAccess.unlocked).toBe(false);
      });

      it('3D: Focus lock reason points to exploring Clarity', () => {
        const focusLockedState = createMockLearnerState({
          assessment: { ...assessmentDoneState.assessment },
          analysis: { status: 'viewed', topCapability: 'Evaluation', growthArea: 'Workflows' },
          clarity: {
            status: 'unlocked',
            selectedAreas: [],
            selectedTopic: null,
            completedTopics: [],
            reflections: {},
            taskScores: {},
          },
          focus: {
            status: 'locked',
            selectedTrack: null,
            history: [],
            activatedAt: null,
          },
        });
        const focusLockedAccess = getFeatureAccess('focus', focusLockedState);
        expect(Boolean(focusLockedAccess.reason?.includes('Clarity'))).toBe(true);
      });

      it('3E: Focus unlocks when learner completes a Clarity activity', () => {
        const focusUnlockedState = createMockLearnerState({
          assessment: { ...assessmentDoneState.assessment },
          analysis: { status: 'viewed', topCapability: 'Evaluation', growthArea: 'Workflows' },
          clarity: {
            status: 'completed',
            selectedAreas: [],
            selectedTopic: null,
            completedTopics: ['Checking AI Output'],
            reflections: {},
            taskScores: {},
          },
          focus: {
            status: 'unlocked',
            selectedTrack: null,
            history: [],
            activatedAt: null,
          },
        });
        const focusUnlockedAccess = getFeatureAccess('focus', focusUnlockedState);
        expect(focusUnlockedAccess.unlocked).toBe(true);
      });
    });

    describe('4. Level 2–4 Workspaces Remain Visible While Safely Locked', () => {
      const focusUnlockedState = createMockLearnerState({
        clarity: {
          status: 'completed',
          selectedAreas: [],
          selectedTopic: null,
          completedTopics: ['Checking AI Output'],
          reflections: {},
          taskScores: {},
        },
        focus: {
          status: 'unlocked',
          selectedTrack: null,
          history: [],
          activatedAt: null,
        },
      });
      const level2To4Features: FeatureId[] = [
        'radar',
        'investigation',
        'relevance',
        'solver',
        'build',
        'mentor',
      ];

      level2To4Features.forEach((fid) => {
        const acc = getFeatureAccess(fid, focusUnlockedState);
        it(`4: Feature "${fid}" is visible while locked`, () => {
          expect(acc.visible).toBe(true);
        });
        it(`4: Feature "${fid}" is safely locked`, () => {
          expect(acc.unlocked).toBe(false);
        });
        it(`4: Feature "${fid}" has human-readable reason`, () => {
          expect(typeof acc.reason === 'string' && acc.reason.length > 10).toBe(true);
        });
        it(`4: Feature "${fid}" marked as unresolved condition`, () => {
          expect(acc.isUnresolved).toBe(true);
        });
      });
    });

    describe('5. Undefined Unlock Conditions Do Not Grant Access', () => {
      const richStateWithArbitraryData = createMockLearnerState({
        credits: {
          balance: 99999,
          transactions: [],
          claimedActions: [],
        },
        profile: {
          id: 'user-test-01',
          name: 'Alex AI',
          email: 'alex.ai@example.com',
          role: 'STUDENT',
          targetGoal: 'Explore AI Architectures & Intelligence',
          stage: 'Adapting',
          xpPoints: 100,
          aiimsCredits: 100,
        },
      });

      it('5A: High credit balance does not unlock Level 2 AI Radar', () => {
        expect(getFeatureAccess('radar', richStateWithArbitraryData).unlocked).toBe(false);
      });

      it('5B: High credit balance does not unlock Level 3 Problem Solver', () => {
        expect(getFeatureAccess('solver', richStateWithArbitraryData).unlocked).toBe(false);
      });

      it('5C: High credit balance does not unlock Level 4 Mentor Workspace', () => {
        expect(getFeatureAccess('mentor', richStateWithArbitraryData).unlocked).toBe(false);
      });
    });

    describe('6. Core Always-Accessible Features', () => {
      const freshState = createMockLearnerState();
      const alwaysOpenFeatures: FeatureId[] = [
        'home',
        'assessment',
        'wallet',
        'credits',
        'settings',
        'journey',
      ];

      alwaysOpenFeatures.forEach((fid) => {
        const acc = getFeatureAccess(fid, freshState);
        it(`6: Feature "${fid}" is always unlocked and visible on registration`, () => {
          expect(acc.unlocked).toBe(true);
          expect(acc.visible).toBe(true);
        });
      });
    });

    describe('7. Journey Stages Status Synchronization', () => {
      const freshState = createMockLearnerState();
      const assessmentDoneState = createMockLearnerState({
        assessment: {
          status: 'completed',
          answers: { 1: 'a', 2: ['b'] },
          currentQuestionIndex: 24,
          completedAt: '18 Oct 2026',
          rewardClaimed: true,
          scores: {
            usageFrequency: 80,
            evaluationCapability: 85,
            workflowDesign: 70,
            strategicVision: 75,
            mentorshipReadiness: 65,
          },
        },
        analysis: {
          status: 'unlocked',
          topCapability: 'AI Evaluation & Critical Assessment',
          growthArea: 'AI Workflow Design',
        },
      });

      it('7A: Home Journey contains all 10 stages', () => {
        const freshJourney = resolveLearnerNextAction(freshState);
        expect(freshJourney.journeyStages.length).toBe(10);
      });

      it('7B: Stage 1 (UNDERSTAND AI) is current on fresh account', () => {
        const freshJourney = resolveLearnerNextAction(freshState);
        expect(freshJourney.journeyStages[0].status).toBe('current');
      });

      it('7C: Stage 2 (MY AI PROFILE) is locked when assessment incomplete', () => {
        const freshJourney = resolveLearnerNextAction(freshState);
        expect(freshJourney.journeyStages[1].status).toBe('locked');
      });

      it('7D: Stage 6-10 (Radar, Relevance, Solver, Build, Improve) are locked', () => {
        const freshJourney = resolveLearnerNextAction(freshState);
        expect(freshJourney.journeyStages.slice(5).every((s) => s.status === 'locked')).toBe(true);
      });

      it('7E: Stage 1 is completed when assessment is done', () => {
        const completedJourney = resolveLearnerNextAction(assessmentDoneState);
        expect(completedJourney.journeyStages[0].status).toBe('completed');
      });

      it('7F: Stage 2 is current (recommended) when assessment is done and profile not viewed', () => {
        const completedJourney = resolveLearnerNextAction(assessmentDoneState);
        expect(completedJourney.journeyStages[1].status).toBe('current');
      });
    });

    describe('8. Unresolved Unlock Conditions Register', () => {
      it('8A: Canonical Unresolved Register lists all 6 Level 2-4 premium interfaces', () => {
        expect(UNRESOLVED_UNLOCK_CONDITIONS.length).toBe(6);
      });

      it('8B: Unresolved conditions reference Owner Decisions 1 & 2', () => {
        expect(
          UNRESOLVED_UNLOCK_CONDITIONS.every((u) => u.decisionRef.includes('Decision 1'))
        ).toBe(true);
      });
    });

    describe('9. Levels 1 to 4 Navigation & Growth Insights / Investigation / Improve', () => {
      const freshState = createMockLearnerState();
      const assessmentDoneState = createMockLearnerState({
        assessment: {
          status: 'completed',
          answers: { 1: 'a' },
          currentQuestionIndex: 24,
          completedAt: '18 Oct 2026',
          rewardClaimed: true,
          scores: {
            usageFrequency: 80,
            evaluationCapability: 85,
            workflowDesign: 70,
            strategicVision: 75,
            mentorshipReadiness: 65,
          },
        },
      });

      it('9A: Growth Insights is Level 1 and locked when assessment is incomplete', () => {
        const insightsLocked = getFeatureAccess('insights', freshState);
        expect(insightsLocked.level).toBe('Level 1');
        expect(insightsLocked.unlocked).toBe(false);
      });

      it('9B: Growth Insights has clear next action pointing to baseline assessment', () => {
        const insightsLocked = getFeatureAccess('insights', freshState);
        expect(insightsLocked.targetTab).toBe('assessment');
        expect(Boolean(insightsLocked.unlockAction)).toBe(true);
      });

      it('9C: Growth Insights unlocks when assessment is completed', () => {
        const insightsUnlocked = getFeatureAccess('insights', assessmentDoneState);
        expect(insightsUnlocked.level).toBe('Level 1');
        expect(insightsUnlocked.unlocked).toBe(true);
      });

      it('9D: Signal Investigation is Level 2 and locked for now', () => {
        const investigationAccess = getFeatureAccess('investigation', freshState);
        expect(investigationAccess.level).toBe('Level 2');
        expect(investigationAccess.unlocked).toBe(false);
      });

      it('9E: Signal Investigation has clear unlock reason and next step pointing to radar', () => {
        const investigationAccess = getFeatureAccess('investigation', freshState);
        expect(investigationAccess.targetTab).toBe('radar');
        expect(typeof investigationAccess.reason).toBe('string');
      });

      it('9F: Improve (Mentor) is Level 4 and locked for now', () => {
        const mentorAccess = getFeatureAccess('mentor', freshState);
        expect(mentorAccess.level).toBe('Level 4');
        expect(mentorAccess.unlocked).toBe(false);
      });

      it('9G: Improve (Mentor) has clear unlock reason and next action', () => {
        const mentorAccess = getFeatureAccess('mentor', freshState);
        expect(Boolean(mentorAccess.unlockAction)).toBe(true);
        expect(typeof mentorAccess.reason).toBe('string');
      });
    });
  });
}
