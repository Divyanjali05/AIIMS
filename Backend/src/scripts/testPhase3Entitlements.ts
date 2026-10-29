/**
 * testPhase3Entitlements.ts
 * ============================================================================
 * AIIMS Phase 3: Rule-Based Entitlements and Journey Gates Test Suite
 *
 * Verifies all 10 acceptance criteria defined in AIIMS_Completion_Checklist.md
 * and the Phase 3 prompt against the single source of truth (featureAccessService & journeyResolver).
 * ============================================================================
 */

import {
  getFeatureAccess,
  normalizeFeatureId,
  FeatureId,
} from '../../../Frontend/src/services/featureAccessService';
import { resolveLearnerNextAction } from '../../../Frontend/src/services/journeyResolver';

console.log('===============================================================');
console.log('🛡️  AIIMS PHASE 3: RULE-BASED ENTITLEMENTS & JOURNEY GATES TESTS');
console.log('===============================================================\n');

let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    totalPassed++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    totalFailed++;
    console.error(`  ❌ [FAIL] ${testName}`);
    if (detail) console.error(`     Details: ${detail}`);
  }
}

const createMockLearnerState = (overrides?: any): any => ({
  profile: {
    id: 'user-learner-test-01',
    name: 'Alex AI',
    email: 'alex.ai@example.com',
    role: 'learner',
    targetGoal: 'Master AI Intelligence',
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

// ---------------------------------------------------------------------------
// TEST SUITE 1: Assessment Incomplete -> My AI Profile Remains Locked
// ---------------------------------------------------------------------------
console.log('── SUITE 1: Assessment Incomplete → My AI Profile Gating ───────');
const freshLearner = createMockLearnerState();
const freshProfileAccess = getFeatureAccess('analysis', freshLearner);

assert(
  freshProfileAccess.visible === true,
  '1A: My AI Profile remains visible when assessment is incomplete'
);
assert(
  freshProfileAccess.unlocked === false,
  '1B: My AI Profile is strictly locked when assessment is incomplete'
);
assert(
  Boolean(
    freshProfileAccess.reason &&
    freshProfileAccess.reason.includes('complete your baseline assessment')
  ),
  '1C: Lock explanation clearly states requirement to complete baseline assessment',
  `Reason: ${freshProfileAccess.reason}`
);
assert(
  freshProfileAccess.targetTab === 'assessment' &&
    freshProfileAccess.unlockAction === 'Start Baseline Assessment',
  '1D: Next action points directly to Baseline Assessment tab'
);

// ---------------------------------------------------------------------------
// TEST SUITE 2: Assessment Completed -> My AI Profile Unlocks
// ---------------------------------------------------------------------------
console.log('\n── SUITE 2: Assessment Completed → My AI Profile Unlocking ─────');
const assessedLearner = createMockLearnerState({
  assessment: {
    status: 'completed',
    answers: { 1: 'q1_a', 2: ['q2_a'] },
    currentQuestionIndex: 24,
    completedAt: '18 Oct 2026',
    rewardClaimed: true,
    scores: {
      usageFrequency: 85,
      evaluationCapability: 90,
      workflowDesign: 75,
      strategicVision: 80,
      mentorshipReadiness: 70,
    },
  },
  analysis: {
    status: 'unlocked',
    topCapability: 'AI Evaluation & Critical Assessment',
    growthArea: 'AI Workflow Design',
  },
});
const unlockedProfileAccess = getFeatureAccess('analysis', assessedLearner);

assert(
  unlockedProfileAccess.unlocked === true,
  '2A: My AI Profile unlocks immediately upon baseline assessment completion'
);
assert(unlockedProfileAccess.visible === true, '2B: My AI Profile remains visible after unlock');

// ---------------------------------------------------------------------------
// TEST SUITE 3: Clarity & Focus Prerequisites
// ---------------------------------------------------------------------------
console.log('\n── SUITE 3: Clarity and Focus Defined Prerequisites ────────────');
// 3A: Clarity locked on fresh learner
const clarityLocked = getFeatureAccess('clarity', freshLearner);
assert(
  clarityLocked.unlocked === false && clarityLocked.visible === true,
  '3A: Clarity is locked and visible when assessment is incomplete'
);

// 3B: Clarity locked if assessment done but profile not reviewed
const clarityAwaitingProfile = getFeatureAccess('clarity', {
  ...assessedLearner,
  analysis: { status: 'locked' },
});
assert(
  clarityAwaitingProfile.unlocked === false && clarityAwaitingProfile.targetTab === 'analysis',
  '3B: Clarity requires My AI Profile review after assessment completion'
);

// 3C: Clarity unlocks when profile has been viewed
const clarityUnlockedState = {
  ...assessedLearner,
  analysis: { status: 'viewed' },
  clarity: { status: 'unlocked', completedTopics: [] },
};
const clarityUnlocked = getFeatureAccess('clarity', clarityUnlockedState);
assert(
  clarityUnlocked.unlocked === true,
  '3C: Clarity unlocks after assessment is completed and profile is viewed'
);

// 3D: Focus is locked when clarity activities not yet explored
const focusLocked = getFeatureAccess('focus', clarityUnlockedState);
assert(
  focusLocked.unlocked === false && focusLocked.targetTab === 'clarity',
  '3D: Focus is locked until learner completes a Clarity activity'
);
assert(
  Boolean(focusLocked.reason && focusLocked.reason.includes('explore Clarity')),
  '3E: Focus lock reason accurately explains the Clarity prerequisite',
  `Reason: ${focusLocked.reason}`
);

// 3F: Focus unlocks after clarity activity completed
const focusUnlockedState = {
  ...clarityUnlockedState,
  clarity: {
    ...clarityUnlockedState.clarity,
    status: 'completed',
    completedTopics: ['Checking AI Output'],
  },
  focus: {
    status: 'unlocked',
    selectedTrack: null,
  },
};
const focusUnlocked = getFeatureAccess('focus', focusUnlockedState);
assert(
  focusUnlocked.unlocked === true,
  '3F: Focus unlocks immediately when learner completes a Clarity activity'
);

// ---------------------------------------------------------------------------
// TEST SUITE 4: Level 2–4 Workspaces Remain Visible While Safely Locked
// ---------------------------------------------------------------------------
console.log('\n── SUITE 4: Level 2–4 Features Visible While Safely Locked ─────');
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
  assert(acc.visible === true, `4A [${fid}]: Feature remains visible in UI`);
  assert(acc.unlocked === false, `4B [${fid}]: Feature is safely locked`);
  assert(
    Boolean(acc.reason && acc.reason.length > 15),
    `4C [${fid}]: Feature provides helpful, clear lock explanation`
  );
  assert(
    acc.isUnresolved === true,
    `4D [${fid}]: Feature is marked as unresolved condition awaiting Owner Decisions 1 & 2`
  );
});

// ---------------------------------------------------------------------------
// TEST SUITE 5 & 6: Sidebar & Home Journey Consistency (Single Truth)
// ---------------------------------------------------------------------------
console.log('\n── SUITE 5 & 6: Navigation Guard & Journey Consistency ─────────');
// Verify that normalizeFeatureId correctly maps alternate paths
assert(
  normalizeFeatureId('/ai-radar') === 'radar' &&
    normalizeFeatureId('problem-solver') === 'solver' &&
    normalizeFeatureId('projects') === 'build' &&
    normalizeFeatureId('/improve') === 'mentor' &&
    normalizeFeatureId('profile-analysis') === 'analysis',
  '5A: normalizeFeatureId accurately normalizes legacy/alternate tab routes'
);

// Verify that journey stages status aligns 100% with featureAccess
const journeyFresh = resolveLearnerNextAction(freshLearner);
assert(journeyFresh.journeyStages.length === 10, '5B: Home Journey maintains all 10 stages');
assert(
  journeyFresh.journeyStages[0].status === 'current',
  '5C: Journey Stage 1 (Understand AI) is current on fresh account'
);
assert(
  journeyFresh.journeyStages[1].status === 'locked',
  '5D: Journey Stage 2 (My AI Profile) is locked in journey tiles when assessment incomplete'
);
assert(
  journeyFresh.journeyStages.slice(5).every((s) => s.status === 'locked'),
  '5E: Journey Stages 6–10 (Radar, Relevance, Solver, Build, Improve) are consistently locked'
);

const journeyAssessed = resolveLearnerNextAction(assessedLearner);
assert(
  journeyAssessed.journeyStages[0].status === 'completed',
  '6A: Journey Stage 1 marks completed after assessment'
);
assert(
  journeyAssessed.journeyStages[1].status === 'current',
  '6B: Journey Stage 2 marks current (recommended next step) after assessment'
);

// ---------------------------------------------------------------------------
// TEST SUITE 7: Dynamic State Transition Without Refresh
// ---------------------------------------------------------------------------
console.log('\n── SUITE 7: Dynamic State Transition (Zero Refresh Required) ───');
let stateDynamic = createMockLearnerState();
assert(
  getFeatureAccess('analysis', stateDynamic).unlocked === false,
  '7A: Initial state has My AI Profile locked'
);

// Simulate user finishing assessment in session
stateDynamic = {
  ...stateDynamic,
  assessment: {
    ...stateDynamic.assessment,
    status: 'completed',
    completedAt: '18 Oct 2026',
  },
  analysis: {
    status: 'unlocked',
    topCapability: 'Critical Verification',
    growthArea: 'Prompting',
  },
};
assert(
  getFeatureAccess('analysis', stateDynamic).unlocked === true,
  '7B: State update immediately unlocks My AI Profile without page reload'
);

// ---------------------------------------------------------------------------
// TEST SUITE 8: Undefined Conditions Do Not Accidentally Grant Access
// ---------------------------------------------------------------------------
console.log('\n── SUITE 8: Safeguards Against Unauthorized Access Bypasses ─────');
const highCreditHackerState = createMockLearnerState({
  credits: {
    balance: 1000000,
    transactions: [],
    claimedActions: [],
  },
  profile: {
    ...freshLearner.profile,
    stage: 'Mastery', // Visual stage does not bypass gates
  },
});

assert(
  getFeatureAccess('radar', highCreditHackerState).unlocked === false,
  '8A: Arbitrary credit balance does NOT unlock Level 2 AI Radar'
);
assert(
  getFeatureAccess('solver', highCreditHackerState).unlocked === false,
  '8B: High credit balance does NOT unlock Level 3 Problem Solver'
);
assert(
  getFeatureAccess('mentor', highCreditHackerState).unlocked === false,
  '8C: High credit balance does NOT unlock Level 4 Mentor Workspace'
);

// ---------------------------------------------------------------------------
// TEST SUITE 9: State Preservation Across Rehydration
// ---------------------------------------------------------------------------
console.log('\n── SUITE 9: State Preservation Across Storage Serialization ────');
const serialized = JSON.stringify(focusUnlockedState);
const rehydrated = JSON.parse(serialized);

assert(
  getFeatureAccess('analysis', rehydrated).unlocked === true,
  '9A: Rehydrated state preserves unlocked My AI Profile'
);
assert(
  getFeatureAccess('clarity', rehydrated).unlocked === true,
  '9B: Rehydrated state preserves unlocked Clarity'
);
assert(
  getFeatureAccess('focus', rehydrated).unlocked === true,
  '9C: Rehydrated state preserves unlocked Focus'
);
assert(
  getFeatureAccess('radar', rehydrated).unlocked === false,
  '9D: Rehydrated state preserves safe locking of Level 2 Radar'
);

// ---------------------------------------------------------------------------
// TEST SUITE 10: Continuity of Core Always-Accessible Working Features
// ---------------------------------------------------------------------------
console.log('\n── SUITE 10: Working Feature Continuity ────────────────────────');
const coreFeatures: FeatureId[] = [
  'home',
  'assessment',
  'wallet',
  'credits',
  'settings',
  'journey',
];

coreFeatures.forEach((fid) => {
  const acc = getFeatureAccess(fid, freshLearner);
  assert(
    acc.unlocked === true && acc.visible === true,
    `10: Feature "${fid}" is unconditionally accessible and visible`
  );
});

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log('\n===============================================================');
console.log(
  `PHASE 3 TEST SUMMARY: ${totalPassed} PASSED / ${totalFailed} FAILED (Total: ${totalPassed + totalFailed})`
);
console.log('===============================================================');

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL RULE-BASED ENTITLEMENT & JOURNEY GATE TESTS PASSED!\n');
}
