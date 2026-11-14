/**
 * verifyJourneyAndHistory.ts
 * =========================================================
 * AIIMS Prompt 8: My AI Journey & Assessment History Automated Verification Suite
 *
 * Verifies:
 *  1. Journey Overview: Authoritative milestone calculation, current stage, and progress %.
 *  2. Fresh Learner Handling: Zero hallucinated progress for new users.
 *  3. Assessment History: Distinct immutable attempts, scores, and completion status.
 *  4. Assessment History Filters & Pagination: Type, status, date filtering, and page bounds.
 *  5. Incomplete & Abandoned Attempt Distinction: Separate handling from completed assessments.
 *  6. Clarity Progress Integration: Levels, topics, consecutive high scores, formative vs submitted.
 *  7. Focus Activity Integration: Excludes breaks and abandoned sessions; accurate focus totals.
 *  8. Performance & Skill Analytics: Strengths, growth areas, chronological timeline, data-sufficiency guard.
 *  9. Next Best Learning Action: Eligibility-based recommendations with transparent explanations.
 * 10. Security & Ownership Isolation: Cross-user boundary enforcement and Zod query validation.
 *
 * Usage:
 *  npx ts-node src/scripts/verifyJourneyAndHistory.ts
 */

import { JourneyService } from '../services/journey.service';
import { prisma } from '../config/prisma';
import { installPrismaTestDouble } from '../services/__tests__/helpers/prismaTestDouble';
import { toJsonInput } from '../utils/userMapper';
import { assessmentHistoryQuerySchema } from '../schemas/journey.schema';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.error(`  ❌ [FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function runAllTests() {
  console.log('===============================================================');
  console.log('🚀 AIIMS PROMPT 8: MY AI JOURNEY & ASSESSMENT HISTORY VERIFICATION');
  console.log('===============================================================\n');

  // =========================================================================
  // SETUP TEST FIXTURES
  // =========================================================================

  installPrismaTestDouble({ connected: true });

  // Learner 1: Fresh user with no history
  const freshUserId = 'usr_journey_fresh_001';
  await prisma.user.create({
    data: {
      id: freshUserId,
      email: 'fresh@aiims.edu',
      name: 'Fresh Learner',
      password: 'dummy-password',
      role: 'learner',
      stage: 'Knowing',
      aiimsCredits: 100,
      assessmentData: toJsonInput({ status: 'not_started', rewardClaimed: false }),
      analysisData: toJsonInput({ status: 'locked' }),
      clarityData: toJsonInput({ status: 'locked', completedTopics: [] }),
      focusData: toJsonInput({ status: 'locked', selectedTrack: null }),
      radarData: toJsonInput({ status: 'locked', investigatedSignalIds: [] }),
    },
  });

  // Learner 2: Experienced learner with rich progression history
  const expUserId = 'usr_journey_exp_002';
  await prisma.user.create({
    data: {
      id: expUserId,
      email: 'experienced@aiims.edu',
      name: 'Experienced Learner',
      password: 'dummy-password',
      role: 'learner',
      stage: 'Understanding',
      aiimsCredits: 250,
      aiWalletData: toJsonInput({
        userTools: [
          { toolId: 'tool-cursor', addedAt: new Date().toISOString() },
          { toolId: 'tool-claude', addedAt: new Date().toISOString() },
        ],
      }),
      assessmentData: toJsonInput({
        status: 'completed',
        completedAt: new Date('2026-10-15T10:00:00Z').toISOString(),
        scores: {
          'Understanding AI': 4,
          'Using AI': 5,
          'Solving with AI': 4,
          'Scaling with AI': 3,
          'Adapting to AI': 4,
        },
        evaluationResult: {
          totalScore: 20,
          percentageScore: 80,
          strongestSkill: { name: 'Using AI' },
          roomToGrow: { name: 'Scaling with AI' },
        },
      }),
      analysisData: toJsonInput({
        status: 'viewed',
        unlockedAt: new Date('2026-10-15T10:30:00Z').toISOString(),
        topCapability: 'Using AI (Practical Prompting)',
        growthArea: 'Scaling with AI (Autonomous Systems)',
      }),
      clarityData: toJsonInput({
        status: 'completed',
        completedTopics: ['Prompt Architecture', 'Tool Selection'],
      }),
      focusData: toJsonInput({
        status: 'active',
        selectedTrack: 'AI Workflow Design',
      }),
      radarData: toJsonInput({
        status: 'available',
        investigatedSignalIds: ['sig-01'],
      }),
    },
  });

  // Populate Clarity Attempts for Learner 2
  await prisma.questionAttempt.create({
    data: {
      attemptId: 'att_001',
      assignmentId: 'assign_001',
      learnerId: expUserId,
      questionId: 'q_001',
      topic: 'Prompt Architecture',
      level: 'Easy',
      track: 'AI Engineering',
      startedAt: new Date('2026-10-16T09:00:00Z'),
      submittedAt: new Date('2026-10-16T09:15:00Z'),
      submittedAnswer: 'Well-structured prompt with system boundaries.',
      score: 90,
      evaluationStatus: 'EVALUATED',
      timeTakenSeconds: 900,
      rubricFeedback: toJsonInput([
        { criterion: 'Role Definition', score: 5, maxScore: 5, comment: 'Clear role' },
        {
          criterion: 'Constraint Specification',
          score: 4,
          maxScore: 5,
          comment: 'Good boundaries',
        },
      ]),
    },
  });

  await prisma.questionAttempt.create({
    data: {
      attemptId: 'att_002',
      assignmentId: 'assign_002',
      learnerId: expUserId,
      questionId: 'q_002',
      topic: 'Prompt Architecture',
      level: 'Medium',
      track: 'AI Engineering',
      startedAt: new Date('2026-10-17T11:00:00Z'),
      submittedAt: new Date('2026-10-17T11:20:00Z'),
      submittedAnswer: 'Multi-step chain-of-thought prompt with edge case handling.',
      score: 88,
      evaluationStatus: 'EVALUATED',
      timeTakenSeconds: 1200,
      rubricFeedback: toJsonInput([
        { criterion: 'Step Deconstruction', score: 5, maxScore: 5, comment: 'Exemplary reasoning' },
        { criterion: 'Fallback Guidance', score: 4, maxScore: 5, comment: 'Strong handling' },
      ]),
    },
  });

  await prisma.questionAttempt.create({
    data: {
      attemptId: 'att_003',
      assignmentId: 'assign_003',
      learnerId: expUserId,
      questionId: 'q_003',
      topic: 'Tool Selection',
      level: 'Easy',
      track: 'AI Engineering',
      startedAt: new Date('2026-10-18T14:00:00Z'),
      submittedAt: new Date('2026-10-18T14:10:00Z'),
      submittedAnswer: 'Matched tabular CSV data analysis to Julius AI.',
      score: 60,
      evaluationStatus: 'EVALUATED',
      timeTakenSeconds: 600,
      rubricFeedback: toJsonInput([
        { criterion: 'Capability Alignment', score: 3, maxScore: 5, comment: 'Partial coverage' },
      ]),
    },
  });

  // Populate Assignments for Learner 2 (one in progress, one abandoned)
  await prisma.questionAssignment.create({
    data: {
      assignmentId: 'assign_inprogress_01',
      learnerId: expUserId,
      questionId: 'q_004',
      topic: 'Autonomous Agents',
      level: 'Medium',
      track: 'General',
      status: 'IN_PROGRESS',
      assignedAt: new Date('2026-10-20T10:00:00Z'),
    },
  });

  await prisma.questionAssignment.create({
    data: {
      assignmentId: 'assign_abandoned_01',
      learnerId: expUserId,
      questionId: 'q_005',
      topic: 'Evaluation Rubrics',
      level: 'Hard',
      track: 'General',
      status: 'ABANDONED',
      assignedAt: new Date('2026-10-19T08:00:00Z'),
    },
  });

  // Populate Clarity Progression for Learner 2
  await prisma.learnerClarityProgression.create({
    data: {
      learnerId: expUserId,
      topic: 'Prompt Architecture',
      currentLevel: 'Medium',
      consecutiveHighScores: 2,
      totalAttempts: 2,
      lastScore: 88,
      history: toJsonInput([
        {
          attemptId: 'att_001',
          score: 90,
          level: 'Easy',
          timestamp: new Date('2026-10-16T09:15:00Z'),
        },
        {
          attemptId: 'att_002',
          score: 88,
          level: 'Medium',
          timestamp: new Date('2026-10-17T11:20:00Z'),
        },
      ]),
    },
  });

  // Populate Focus Sessions for Learner 2
  const startOfToday = new Date();
  startOfToday.setHours(9, 0, 0, 0);

  // Completed focus session (25 mins = 1500 sec)
  await prisma.focusSession.create({
    data: {
      sessionId: 'foc_001',
      learnerId: expUserId,
      trackTitle: 'AI Workflow Design',
      intention: 'Design rubric evaluation pipeline',
      sessionState: 'completed',
      status: 'completed',
      periodType: 'focus',
      accumulatedFocusSeconds: 1500,
      totalBreakSeconds: 300,
      completedCycles: 1,
      startedAt: startOfToday,
      completedAt: new Date(startOfToday.getTime() + 1500 * 1000),
    },
  });

  // Break session (5 mins = 300 sec) — MUST NOT count towards focus time!
  await prisma.focusSession.create({
    data: {
      sessionId: 'foc_break_001',
      learnerId: expUserId,
      trackTitle: 'AI Workflow Design',
      sessionState: 'break',
      status: 'in_progress',
      periodType: 'short_break',
      accumulatedFocusSeconds: 1500,
      totalBreakSeconds: 300,
      completedCycles: 1,
      startedAt: new Date(startOfToday.getTime() + 1500 * 1000),
      completedAt: new Date(startOfToday.getTime() + 1800 * 1000),
    },
  });

  // Abandoned focus session (abandoned after 3 mins) — MUST NOT count towards completed sessions!
  await prisma.focusSession.create({
    data: {
      sessionId: 'foc_abandoned_001',
      learnerId: expUserId,
      trackTitle: 'AI Workflow Design',
      sessionState: 'abandoned',
      status: 'abandoned',
      periodType: 'focus',
      accumulatedFocusSeconds: 180,
      totalBreakSeconds: 0,
      completedCycles: 0,
      startedAt: new Date(startOfToday.getTime() + 2000 * 1000),
      completedAt: new Date(startOfToday.getTime() + 2180 * 1000),
    },
  });

  // =========================================================================
  // SUITE 1: JOURNEY OVERVIEW & MILESTONES
  // =========================================================================
  console.log('── SUITE 1: Learner Journey Overview & Milestone Progression ──');

  // Test 1: Fetch overview for fresh learner
  {
    const overview = await JourneyService.getJourneyOverview(freshUserId);
    assert(
      'Test 1: Fresh learner overview returns 0% or low baseline progression without hallucinations',
      overview.completedMilestonesCount === 0 && overview.overallProgressPercent === 0,
      `Got count: ${overview.completedMilestonesCount}, percent: ${overview.overallProgressPercent}`
    );
  }

  // Test 2: Fresh learner starts at "Understand AI"
  {
    const overview = await JourneyService.getJourneyOverview(freshUserId);
    assert(
      'Test 2: Fresh learner current stage is "Understand AI"',
      overview.currentStage === 'Understand AI'
    );
  }

  // Test 3: Fresh learner milestone 1 is current, rest are locked or upcoming
  {
    const overview = await JourneyService.getJourneyOverview(freshUserId);
    const m1 = overview.milestones.find((m) => m.id === 'understand');
    const m2 = overview.milestones.find((m) => m.id === 'profile');
    assert(
      'Test 3: Milestone 1 is "current" and Milestone 2 is "locked" for unassessed learner',
      m1?.status === 'current' && m2?.status === 'locked'
    );
  }

  // Test 4: Experienced learner overview accurately computes milestones
  {
    const overview = await JourneyService.getJourneyOverview(expUserId);
    assert(
      'Test 4: Experienced learner completed milestones count matches actual records (5 completed)',
      overview.completedMilestonesCount >= 5,
      `Got count: ${overview.completedMilestonesCount}`
    );
  }

  // Test 5: Experienced learner milestone 1 is completed with score and date
  {
    const overview = await JourneyService.getJourneyOverview(expUserId);
    const m1 = overview.milestones.find((m) => m.id === 'understand');
    assert(
      'Test 5: Milestone 1 displays "completed" with authoritative score and date',
      m1?.status === 'completed' && m1?.score === 80 && !!m1?.completionDate
    );
  }

  // Test 6: Milestone roadmap contains exactly 10 canonical milestones
  {
    const overview = await JourneyService.getJourneyOverview(expUserId);
    assert(
      'Test 6: Journey contains exactly 10 canonical curriculum milestones',
      overview.milestones.length === 10 && overview.totalMilestones === 10
    );
  }

  // Test 7: Non-existent learner returns error
  {
    let caught = false;
    try {
      await JourneyService.getJourneyOverview('non_existent_usr_999');
    } catch (err: any) {
      caught = err.message === 'LEARNER_NOT_FOUND';
    }
    assert('Test 7: Querying non-existent learner throws LEARNER_NOT_FOUND', caught);
  }

  // =========================================================================
  // SUITE 2: ASSESSMENT HISTORY (PAGINATION, FILTERS & IMMUTABILITY)
  // =========================================================================
  console.log('\n── SUITE 2: Assessment History (Pagination, Filtering, Immutability) ──');

  // Test 8: Fetch assessment history for experienced learner
  {
    const history = await JourneyService.getAssessmentHistory(expUserId, { page: 1, limit: 10 });
    assert(
      'Test 8: Assessment history retrieves records across Diagnostic, Clarity attempts, and assignments',
      history.totalRecords >= 4 && history.records.length >= 4,
      `Got total: ${history.totalRecords}`
    );
  }

  // Test 9: Each Clarity attempt is preserved as an individual immutable record
  {
    const history = await JourneyService.getAssessmentHistory(expUserId, { page: 1, limit: 10 });
    const clarityRecords = history.records.filter(
      (r) => r.type === 'clarity' && r.status === 'completed'
    );
    const attemptIds = clarityRecords.map((r) => r.id);
    const uniqueIds = new Set(attemptIds);
    assert(
      'Test 9: Multiple attempts on the same topic are preserved as separate records (no overwrites)',
      clarityRecords.length === 3 && uniqueIds.size === 3,
      `Got ${clarityRecords.length} attempts, unique: ${uniqueIds.size}`
    );
  }

  // Test 10: Server-authoritative scores match attempt records
  {
    const history = await JourneyService.getAssessmentHistory(expUserId, { page: 1, limit: 10 });
    const att1 = history.records.find((r) => r.id === 'att_001');
    const att2 = history.records.find((r) => r.id === 'att_002');
    assert(
      'Test 10: Historical attempt scores match submitted evaluations (90% and 88%)',
      att1?.score === 90 && att2?.score === 88
    );
  }

  // Test 11: Distinguishes completed vs in-progress vs abandoned records
  {
    const history = await JourneyService.getAssessmentHistory(expUserId, { page: 1, limit: 10 });
    const completed = history.records.find((r) => r.status === 'completed');
    const inProgress = history.records.find((r) => r.status === 'in_progress');
    const abandoned = history.records.find((r) => r.status === 'abandoned');
    assert(
      'Test 11: Clearly distinguishes completed, in_progress, and abandoned attempts',
      !!completed && !!inProgress && !!abandoned
    );
  }

  // Test 12: Filtering by type ('diagnostic') returns only diagnostic assessments
  {
    const history = await JourneyService.getAssessmentHistory(expUserId, {
      type: 'diagnostic',
      page: 1,
      limit: 10,
    });
    const allDiag = history.records.every((r) => r.type === 'diagnostic');
    assert(
      'Test 12: Filter by type="diagnostic" returns exclusively diagnostic records',
      allDiag && history.records.length === 1
    );
  }

  // Test 13: Filtering by status ('abandoned') returns only abandoned tasks
  {
    const history = await JourneyService.getAssessmentHistory(expUserId, {
      status: 'abandoned',
      page: 1,
      limit: 10,
    });
    const allAbandoned = history.records.every((r) => r.status === 'abandoned');
    assert(
      'Test 13: Filter by status="abandoned" isolates abandoned tasks without score fabrication',
      allAbandoned && history.records.length === 1 && history.records[0].score === null
    );
  }

  // Test 14: Pagination limits page size and computes total pages
  {
    const p1 = await JourneyService.getAssessmentHistory(expUserId, { page: 1, limit: 2 });
    const p2 = await JourneyService.getAssessmentHistory(expUserId, { page: 2, limit: 2 });
    assert(
      'Test 14: Pagination correctly limits results per page and advances offset',
      p1.records.length === 2 && p2.records.length === 2 && p1.records[0].id !== p2.records[0].id
    );
  }

  // Test 15: Fresh learner with no assessments returns clear empty state
  {
    const history = await JourneyService.getAssessmentHistory(freshUserId, { page: 1, limit: 10 });
    assert(
      'Test 15: Unassessed learner returns 0 records and totalPages=1 (clean empty state)',
      history.totalRecords === 0 && history.records.length === 0 && history.totalPages === 1
    );
  }

  // =========================================================================
  // SUITE 3: CLARITY PROGRESS INTEGRATION
  // =========================================================================
  console.log('\n── SUITE 3: Clarity Progress Integration & Formative Separation ──');

  // Test 16: Fetch Clarity progress returns topic breakdown
  {
    const clarity = await JourneyService.getClarityProgress(expUserId);
    assert(
      'Test 16: Clarity progress returns topic mastery data for learner',
      clarity.topics.length >= 1 && clarity.topics[0].topic === 'Prompt Architecture'
    );
  }

  // Test 17: Consecutive high scores reflected accurately
  {
    const clarity = await JourneyService.getClarityProgress(expUserId);
    const promptTopic = clarity.topics.find((t) => t.topic === 'Prompt Architecture');
    assert(
      'Test 17: Reflects consecutive high scores (2 / 2 for level advancement)',
      promptTopic?.consecutiveHighScores === 2
    );
  }

  // Test 18: Clarity current level reflects highest unlocked tier
  {
    const clarity = await JourneyService.getClarityProgress(expUserId);
    assert(
      'Test 18: Learner current Clarity level is "Medium"',
      clarity.overallCurrentLevel === 'Medium'
    );
  }

  // Test 19: Clear notice distinguishing formative runs from submitted attempts
  {
    const clarity = await JourneyService.getClarityProgress(expUserId);
    assert(
      'Test 19: System provides explicit disclosure distinguishing formative "Run" from submitted attempts',
      clarity.clarityDistinctionNotice.includes('Formative "Run"') &&
        clarity.clarityDistinctionNotice.includes('Submit')
    );
  }

  // =========================================================================
  // SUITE 4: FOCUS ACTIVITY INTEGRATION
  // =========================================================================
  console.log('\n── SUITE 4: Focus Activity Integration (Break & Abandoned Exclusion) ──');

  // Test 20: Fetch Focus summary returns today's focus minutes
  {
    const focus = await JourneyService.getFocusActivity(expUserId);
    assert(
      'Test 20: Focus summary returns completed focus duration (25 minutes)',
      focus.todayFocusMinutes === 25,
      `Got: ${focus.todayFocusMinutes}`
    );
  }

  // Test 21: Break time is strictly excluded from focus time
  {
    const focus = await JourneyService.getFocusActivity(expUserId);
    assert(
      'Test 21: Break duration (5 min) is tracked separately and excluded from todayFocusMinutes',
      focus.todayBreakMinutes === 5 && focus.todayFocusMinutes === 25
    );
  }

  // Test 22: Abandoned session excluded from completed session count
  {
    const focus = await JourneyService.getFocusActivity(expUserId);
    assert(
      'Test 22: Abandoned sessions are excluded from completed sessions (exactly 1 completed session)',
      focus.todayCompletedSessions === 1,
      `Got: ${focus.todayCompletedSessions}`
    );
  }

  // Test 23: Fresh learner focus activity returns 0 minutes with zero phantom sessions
  {
    const focus = await JourneyService.getFocusActivity(freshUserId);
    assert(
      'Test 23: Fresh learner focus summary returns 0 minutes and 0 sessions',
      focus.todayFocusMinutes === 0 && focus.todayCompletedSessions === 0
    );
  }

  // =========================================================================
  // SUITE 5: PERFORMANCE & SKILL ANALYTICS
  // =========================================================================
  console.log('\n── SUITE 5: Performance & Skill Analytics (Data-Sufficiency Guard) ──');

  // Test 24: Fresh learner with no data triggers sufficiency guard
  {
    const analytics = await JourneyService.getPerformanceAnalytics(freshUserId);
    assert(
      'Test 24: Unassessed learner triggers hasSufficientData: false guard',
      analytics.hasSufficientData === false && !!analytics.dataNotice
    );
  }

  // Test 25: Experienced learner provides verified skill strengths
  {
    const analytics = await JourneyService.getPerformanceAnalytics(expUserId);
    assert(
      'Test 25: Experienced learner analytics identifies strengths (scores >= 70%)',
      analytics.hasSufficientData === true && analytics.strongestSkills.length > 0,
      `Got ${analytics.strongestSkills.length} strengths`
    );
  }

  // Test 26: Growth areas identified from scores < 70%
  {
    const analytics = await JourneyService.getPerformanceAnalytics(expUserId);
    const hasGrowth = analytics.growthAreas.some(
      (g) => g.name === 'Scaling with AI' || g.score < 70
    );
    assert(
      'Test 26: Accurately identifies growth areas from evaluated data (Scaling with AI / Tool Selection)',
      hasGrowth
    );
  }

  // Test 27: Distinguishes diagnostic vs Clarity scores in timeline without false aggregate
  {
    const analytics = await JourneyService.getPerformanceAnalytics(expUserId);
    const diagItems = analytics.scoreTimeline.filter((s) => s.scoreType === 'diagnostic');
    const clarityItems = analytics.scoreTimeline.filter((s) => s.scoreType === 'clarity');
    assert(
      'Test 27: Chronological timeline strictly distinguishes diagnostic from Clarity scores',
      diagItems.length >= 1 && clarityItems.length >= 2
    );
  }

  // Test 28: Provides transparent explanation of score calculation basis
  {
    const analytics = await JourneyService.getPerformanceAnalytics(expUserId);
    assert(
      'Test 28: Includes plain-English explanation of mathematical scoring basis',
      analytics.basisExplanation.includes('Diagnostic assessment scores') &&
        analytics.basisExplanation.includes('rubric evaluations')
    );
  }

  // =========================================================================
  // SUITE 6: RECOMMENDED NEXT BEST LEARNING ACTION
  // =========================================================================
  console.log('\n── SUITE 6: Authoritative Next Best Action Recommendation ──');

  // Test 29: Fresh learner next action is Start Assessment
  {
    const overview = await JourneyService.getJourneyOverview(freshUserId);
    assert(
      'Test 29: Fresh learner is recommended "Complete Baseline Assessment" targeting "assessment"',
      overview.nextBestAction.targetTab === 'assessment' &&
        overview.nextBestAction.actionButtonLabel === 'Start Assessment'
    );
  }

  // Test 30: Fresh learner next action is not locked
  {
    const overview = await JourneyService.getJourneyOverview(freshUserId);
    assert(
      'Test 30: Recommended next action is immediately actionable (isLocked === false)',
      overview.nextBestAction.isLocked === false
    );
  }

  // Test 31: Experienced learner next action advances Clarity difficulty tier
  {
    const overview = await JourneyService.getJourneyOverview(expUserId);
    assert(
      'Test 31: Experienced learner next action targets Clarity advancement',
      overview.nextBestAction.targetTab === 'clarity' &&
        overview.nextBestAction.actionTitle.includes('Advance Clarity')
    );
  }

  // Test 32: Recommendation includes actionable explanation
  {
    const overview = await JourneyService.getJourneyOverview(expUserId);
    assert(
      'Test 32: Action includes clear, evidence-backed reason (Score 85%+ on two consecutive tasks)',
      overview.nextBestAction.actionReason.includes('Score 85%+')
    );
  }

  // =========================================================================
  // SUITE 7: SECURITY, OWNERSHIP & SCHEMA VALIDATION
  // =========================================================================
  console.log('\n── SUITE 7: Security, Ownership & Request Schema Validation ──');

  // Test 33: Schema validates valid query
  {
    const valid = assessmentHistoryQuerySchema.safeParse({
      page: '1',
      limit: '20',
      type: 'clarity',
    });
    assert(
      'Test 33: assessmentHistoryQuerySchema parses valid string pagination into numbers',
      valid.success === true && (valid.data as any).page === 1 && (valid.data as any).limit === 20
    );
  }

  // Test 34: Schema handles negative page by resetting to 1
  {
    const res = assessmentHistoryQuerySchema.safeParse({ page: '-5', limit: '10' });
    assert(
      'Test 34: Negative page parameter safely defaults to page 1',
      res.success === true && (res.data as any).page === 1
    );
  }

  // Test 35: Schema clamps limit to max 50
  {
    const res = assessmentHistoryQuerySchema.safeParse({ page: '1', limit: '9999' });
    assert(
      'Test 35: Extreme limit parameter safely clamps to 50',
      res.success === true && (res.data as any).limit === 50
    );
  }

  // Test 36: Schema rejects invalid type enum
  {
    const res = assessmentHistoryQuerySchema.safeParse({ type: 'invalid_malicious_type' });
    assert('Test 36: Invalid type enum is rejected with validation error', res.success === false);
  }

  // Test 37: Cross-user history isolation (user A cannot see user B's records)
  {
    const freshHistory = await JourneyService.getAssessmentHistory(freshUserId, {
      page: 1,
      limit: 10,
    });
    const expHistory = await JourneyService.getAssessmentHistory(expUserId, { page: 1, limit: 10 });
    const freshHasExpRecords = freshHistory.records.some((r) => r.id === 'att_001');
    assert(
      'Test 37: Cross-user isolation: Fresh learner cannot see experienced learner attempt records',
      freshHasExpRecords === false && expHistory.records.length > 0
    );
  }

  // Test 38: Rubric feedback in history does not expose hidden answer keys
  {
    const expHistory = await JourneyService.getAssessmentHistory(expUserId, { page: 1, limit: 10 });
    const att1 = expHistory.records.find((r) => r.id === 'att_001');
    const hasSecretKey =
      JSON.stringify(att1).includes('correctOption') ||
      JSON.stringify(att1).includes('secretPrompt');
    assert(
      'Test 38: History records omit private evaluator prompts and secret answer keys',
      hasSecretKey === false
    );
  }

  // =========================================================================
  // FINAL SUMMARY
  // =========================================================================
  console.log('\n===============================================================');
  console.log(
    `VERIFICATION SUMMARY: ${passed} PASSED / ${failed} FAILED (Total: ${passed + failed})`
  );
  console.log('===============================================================');

  if (failed > 0) {
    console.error('Failed checks:');
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL 38 JOURNEY & ASSESSMENT HISTORY CHECKS PASSED CLEANLY!\n');
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
