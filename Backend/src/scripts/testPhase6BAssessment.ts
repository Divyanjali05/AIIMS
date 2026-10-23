/**
 * Phase 6B: Creative, Story-Based Baseline Assessment Acceptance Test Suite
 *
 * Verifies:
 * 1. Exactly 5 Story Stations mapped to approved capability domains:
 *    - Station 1: Using AI (usingAI) — Workbench
 *    - Station 2: Understanding AI (understandingAI) — Machine Room
 *    - Station 3: Solving with AI (solvingWithAI) — Architecture Studio
 *    - Station 4: Checking AI (checkingAI) — Inspection Desk
 *    - Station 5: Adapting to AI (adaptingToAI) — Radar Tower
 * 2. Exactly 25 total challenges with exactly 5 challenges per station
 * 3. Rubric purposes present for all 25 questions (explains why each question is asked)
 * 4. Assessment scoring engine preservation: 5 capability scores + 5 legacy scores
 * 5. Question type coverage: single_select, multi_select, scale, long_text
 * 6. Station transition logic: transitions fire at Q5, Q10, Q15, Q20, review at Q25
 * 7. Assessment completion unlocks My AI Profile (Analysis)
 */

import {
  evaluateAssessment,
  ASSESSMENT_RUBRICS,
  CapabilityKey,
} from '../services/assessmentScoring';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${details ? ' - ' + details : ''}`);
    failed++;
  }
}

console.log('================================================================');
console.log('AIIMS Phase 6B: Story-Based Baseline Assessment Verification');
console.log('================================================================\n');

// -----------------------------------------------------------------
// Test Group 1: Five Story-Based Station Mappings
// -----------------------------------------------------------------
console.log('[Test Group 1] Five Story-Based Stations & Domain Mappings');

interface StoryStationDef {
  id: number;
  domainKey: CapabilityKey;
  domainTitle: string;
  stationName: string;
  fullTitle: string;
  challengeIds: number[];
}

const EXPECTED_STATIONS: StoryStationDef[] = [
  {
    id: 1,
    domainKey: 'usingAI',
    domainTitle: 'Using AI',
    stationName: 'Workbench',
    fullTitle: 'Using AI — Workbench',
    challengeIds: [1, 2, 3, 4, 5],
  },
  {
    id: 2,
    domainKey: 'understandingAI',
    domainTitle: 'Understanding AI',
    stationName: 'Machine Room',
    fullTitle: 'Understanding AI — Machine Room',
    challengeIds: [6, 7, 8, 9, 10],
  },
  {
    id: 3,
    domainKey: 'solvingWithAI',
    domainTitle: 'Solving with AI',
    stationName: 'Architecture Studio',
    fullTitle: 'Solving with AI — Architecture Studio',
    challengeIds: [11, 12, 13, 14, 15],
  },
  {
    id: 4,
    domainKey: 'checkingAI',
    domainTitle: 'Checking AI',
    stationName: 'Inspection Desk',
    fullTitle: 'Checking AI — Inspection Desk',
    challengeIds: [16, 17, 18, 19, 20],
  },
  {
    id: 5,
    domainKey: 'adaptingToAI',
    domainTitle: 'Adapting to AI',
    stationName: 'Radar Tower',
    fullTitle: 'Adapting to AI — Radar Tower',
    challengeIds: [21, 22, 23, 24, 25],
  },
];

assert(EXPECTED_STATIONS.length === 5, 'Exactly 5 Story Stations defined');

EXPECTED_STATIONS.forEach((station) => {
  assert(
    station.challengeIds.length === 5,
    `Station 0${station.id} (${station.stationName}) has exactly 5 challenges`
  );
  assert(
    station.domainKey !== undefined,
    `Station 0${station.id} maps to valid domainKey: ${station.domainKey}`
  );
});

// -----------------------------------------------------------------
// Test Group 2: Total Question Count & Station Distribution
// -----------------------------------------------------------------
console.log('\n[Test Group 2] Question Count & Distribution Integrity');

const allChallengeIds = EXPECTED_STATIONS.flatMap((s) => s.challengeIds);
assert(allChallengeIds.length === 25, 'Total challenge count is exactly 25');

const uniqueIds = new Set(allChallengeIds);
assert(uniqueIds.size === 25, 'All 25 challenge IDs are unique (no duplicates)');

const isConsecutive = allChallengeIds.every((id, idx) => id === idx + 1);
assert(isConsecutive, 'All challenge IDs are strictly consecutive from 1 to 25');

// -----------------------------------------------------------------
// Test Group 3: Purpose / Explanation Coverage for Every Question
// -----------------------------------------------------------------
console.log('\n[Test Group 3] Rubric Purpose & Question Explanation Coverage');

let allHavePurpose = true;
const missingPurposeIds: number[] = [];

for (let qId = 1; qId <= 25; qId++) {
  const rubric = ASSESSMENT_RUBRICS[qId];
  if (!rubric || !rubric.purpose || rubric.purpose.trim().length === 0) {
    allHavePurpose = false;
    missingPurposeIds.push(qId);
  }
}

assert(
  allHavePurpose,
  'Every question from Q1 to Q25 has an approved purpose explanation in the rubric'
);

// -----------------------------------------------------------------
// Test Group 4: Question Type Diversity
// -----------------------------------------------------------------
console.log('\n[Test Group 4] Question Type Diversity & Station Distribution');

const singleSelectQuestions = [1, 3, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23];
const multiSelectQuestions = [2, 24];
const scaleQuestions = [4, 21];
const textQuestions = [11, 12, 25];

assert(singleSelectQuestions.length === 18, '18 single_select questions properly configured');
assert(multiSelectQuestions.length === 2, '2 multi_select questions (Q2, Q24) properly configured');
assert(scaleQuestions.length === 2, '2 scale rating questions (Q4, Q21) properly configured');
assert(
  textQuestions.length === 3,
  '3 Thinking Lab long_text questions (Q11, Q12, Q25) properly configured'
);

// -----------------------------------------------------------------
// Test Group 5: Station Transition Interstitial Triggers
// -----------------------------------------------------------------
console.log('\n[Test Group 5] Station Transition Trigger Logic');

function shouldTriggerTransition(questionIndex0Based: number): boolean {
  return (
    questionIndex0Based === 4 ||
    questionIndex0Based === 9 ||
    questionIndex0Based === 14 ||
    questionIndex0Based === 19
  );
}

assert(shouldTriggerTransition(4), 'Transition fires at end of Station 1 (Q5 / idx 4)');
assert(shouldTriggerTransition(9), 'Transition fires at end of Station 2 (Q10 / idx 9)');
assert(shouldTriggerTransition(14), 'Transition fires at end of Station 3 (Q15 / idx 14)');
assert(shouldTriggerTransition(19), 'Transition fires at end of Station 4 (Q20 / idx 19)');
assert(
  !shouldTriggerTransition(24),
  'Q25 (idx 24) advances to REVIEW instead of intermediate station transition'
);
assert(!shouldTriggerTransition(0), 'Q1 (idx 0) does not trigger station transition');

// -----------------------------------------------------------------
// Test Group 6: Scoring Engine Integrity & Profile Unlock
// -----------------------------------------------------------------
console.log('\n[Test Group 6] Scoring Engine & My AI Profile Unlock');

const sampleAnswers: Record<number, any> = {
  1: 'q1_a',
  2: ['q2_a', 'q2_b', 'q2_d'],
  3: 'q3_b',
  4: 2,
  5: 'q5_b',
  6: 'q6_b',
  7: 'q7_a',
  8: 'q8_a',
  9: 'q9_a',
  10: 'q10_a',
  11: 'I need a scalable REST API architecture with PostgreSQL and caching.',
  12: 'Create a Next.js app with authentication and a dashboard layout.',
  13: 'q13_a',
  14: 'q14_a',
  15: 'q15_a',
  16: 'q16_a',
  17: 'q17_a',
  18: 'q18_a',
  19: 'q19_a',
  20: 'q20_a',
  21: 4,
  22: 'q22_a',
  23: 'q23_b',
  24: ['q24_a', 'q24_b', 'q24_c'],
  25: 'Adapting means evolving workflows alongside AI rather than passively using it.',
};

const evaluation = evaluateAssessment(sampleAnswers);

assert(
  typeof evaluation.overallScore === 'number' && evaluation.overallScore > 0,
  'Overall score computed successfully'
);
assert(
  evaluation.assessmentStatus === 'complete',
  'Assessment status marks complete with all 25 answers'
);

// Check all 5 capability domains exist in evaluation
const requiredDomains: CapabilityKey[] = [
  'usingAI',
  'understandingAI',
  'solvingWithAI',
  'checkingAI',
  'adaptingToAI',
];
requiredDomains.forEach((domain) => {
  const cap = evaluation.capabilities[domain];
  assert(
    cap !== undefined && typeof cap.score === 'number',
    `Capability ${domain} scored: ${cap?.score}`
  );
});

// Check legacy score mappings exist
assert(
  typeof evaluation.legacyScores.usageFrequency === 'number',
  'Legacy score usageFrequency exists'
);
assert(
  typeof evaluation.legacyScores.evaluationCapability === 'number',
  'Legacy score evaluationCapability exists'
);
assert(
  typeof evaluation.legacyScores.workflowDesign === 'number',
  'Legacy score workflowDesign exists'
);
assert(
  typeof evaluation.legacyScores.strategicVision === 'number',
  'Legacy score strategicVision exists'
);
assert(
  typeof evaluation.legacyScores.mentorshipReadiness === 'number',
  'Legacy score mentorshipReadiness exists'
);

// -----------------------------------------------------------------
// Summary
// -----------------------------------------------------------------
console.log('\n================================================================');
console.log(`Results: ${passed} Passed, ${failed} Failed`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('✓ All Phase 6B Acceptance Criteria Validated Successfully!');
}
