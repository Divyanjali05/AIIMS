/**
 * featureAccess.test.ts
 * =========================================================
 * AIIMS Phase 3: Rule-Based Entitlements & Journey Gates Test Suite
 */

import {
  getFeatureAccess,
  getAllFeatureAccess,
  isFeatureUnlocked,
  UNRESOLVED_UNLOCK_CONDITIONS,
  FeatureId
} from '../featureAccessService';
import { resolveLearnerNextAction } from '../journeyResolver';
import { LearnerState } from '../../context/LearnerContext';

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
    aiimsCredits: 100
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
      mentorshipReadiness: 0
    }
  },
  analysis: {
    status: 'locked',
    topCapability: 'AI Evaluation & Critical Assessment',
    growthArea: 'AI Workflow Design'
  },
  clarity: {
    status: 'locked',
    selectedAreas: [],
    selectedTopic: null,
    completedTopics: [],
    reflections: {},
    taskScores: {}
  },
  focus: {
    status: 'locked',
    selectedTrack: null,
    history: [],
    activatedAt: null
  },
  radar: {
    status: 'locked',
    investigatedSignalIds: [],
    savedSignalIds: [],
    dismissedSignalIds: [],
    lastViewedRadar: null,
    radarProgress: 0
  },
  investigation: {
    status: 'locked',
    selectedSignalId: null,
    userNotes: {}
  },
  relevance: {
    status: 'locked'
  },
  credits: {
    balance: 100,
    transactions: [],
    claimedActions: []
  },
  notifications: [],
  aiWallet: {
    userTools: [],
    dismissedRecommendations: []
  },
  solver: {
    latestWorkflow: null,
    history: []
  },
  build: {
    projects: [],
    activeProjectId: null
  },
  ...overrides
});

export function runFeatureAccessTestSuite(): { passedCount: number; failedCount: number; results: TestResult[] } {
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
        mentorshipReadiness: 65
      }
    },
    analysis: {
      status: 'unlocked',
      topCapability: 'AI Evaluation & Critical Assessment',
      growthArea: 'AI Workflow Design'
    }
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
      taskScores: {}
    }
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
      taskScores: {}
    },
    focus: {
      status: 'locked',
      selectedTrack: null,
      history: [],
      activatedAt: null
    }
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
      completedTopics: ['Checking AI Output']
    },
    focus: {
      status: 'unlocked',
      selectedTrack: null,
      history: [],
      activatedAt: null
    }
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
    'mentor'
  ];

  level2To4Features.forEach((fid) => {
    const acc = getFeatureAccess(fid, focusUnlockedState);
    assert(
      `4: Feature "${fid}" is visible while locked`,
      acc.visible === true
    );
    assert(
      `4: Feature "${fid}" is safely locked`,
      acc.unlocked === false
    );
    assert(
      `4: Feature "${fid}" has human-readable reason`,
      typeof acc.reason === 'string' && acc.reason.length > 10
    );
    assert(
      `4: Feature "${fid}" marked as unresolved condition`,
      acc.isUnresolved === true
    );
  });

  // ---------------------------------------------------------------------------
  // 5. Undefined Unlock Conditions Do Not Grant Access
  // ---------------------------------------------------------------------------
  const richStateWithArbitraryData = createMockLearnerState({
    credits: {
      balance: 99999, // High balance cannot bypass entitlement locks
      transactions: [],
      claimedActions: []
    },
    profile: {
      ...freshState.profile,
      stage: 'Adapting' // Visual stage does not bypass gates
    }
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
    'journey'
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
  assert(
    '7A: Home Journey contains all 10 stages',
    freshJourney.journeyStages.length === 10
  );
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

  return { passedCount, failedCount, results };
}
