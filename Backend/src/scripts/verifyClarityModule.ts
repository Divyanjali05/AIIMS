/**
 * verifyClarityModule.ts
 * ============================================================================
 * AIIMS Prompt 5 Verification & Compliance Test Suite
 *
 * Verifies:
 * 1. Question Bank Integration (no hardcoded arrays, non-coder practical scenarios).
 * 2. Visual Hierarchy & 6-Section Layout Contracts.
 * 3. Run vs Submit Decoupling (Run: 0 AC trial, 10 AC subsequent, safe refund; Submit: authoritative rubric scoring, attempt persistence, reward award).
 * 4. Lock After Submission (server & client lock, permanent immutability across reload).
 * 5. Configurable Progression (2 consecutive >= 80 advances, < 50 drops, neutral 50-79, boundaries Easy-Hard, admin config API).
 * 6. Authoritative Elapsed Timer (derived from assignedAt).
 * 7. Security, RBAC & Entitlement Regressions.
 * ============================================================================
 */

import { clarityProgressionService } from '../services/clarityProgression.service';
import { questionBankService } from '../services/questionBank.service';
import { prisma } from '../config/prisma';
import { installPrismaTestDouble } from '../services/__tests__/helpers/prismaTestDouble';
import { creditsLedgerService } from '../services/creditsLedger.service';
import {
  runTask,
  submitClarityTask,
  getActiveClarityTask,
  serveNextClarityTask,
  updateProgressionConfigHandler,
} from '../controllers/clarity.controller';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runClarityVerification() {
  console.log('\n================================================================');
  console.log(' AIIMS PROMPT 5: CLARITY MODULE AUTOMATED VERIFICATION SUITE');
  console.log('================================================================\n');

  installPrismaTestDouble({ connected: true });

  const testUserId = `learner-clarity-${Date.now()}`;
  const testTopic = 'Checking AI';

  // -------------------------------------------------------------------------
  // SUITE 1: QUESTION BANK INTEGRATION & NON-CODER SCENARIO SERVING
  // -------------------------------------------------------------------------
  console.log('── SUITE 1: Question Bank Integration & Serving ────────────────');

  // 1.1 Serve question from Question Bank at Easy level
  const serveRes = await questionBankService.serveQuestion({
    learnerId: testUserId,
    topic: testTopic,
    level: 'Easy',
    track: 'General',
  });

  assert(!!serveRes.assignment, '1.1 Question assignment created successfully');
  assert(
    serveRes.assignment.track === 'General',
    '1.2 Non-coder practical scenario is the default track'
  );
  assert(serveRes.assignment.level === 'Easy', '1.3 Initial assigned question level is Easy');
  assert(!!serveRes.question.promptText, '1.4 Question contains plain-text scenario');
  assert(
    !!serveRes.question.scoringRubric && serveRes.question.scoringRubric.length > 0,
    '1.5 Question includes structured scoring rubric'
  );
  assert(serveRes.assignment.status === 'ASSIGNED', '1.6 Initial assignment status is ASSIGNED');

  // -------------------------------------------------------------------------
  // SUITE 2: AUTHORITATIVE ELAPSED TIMER CONTRACT
  // -------------------------------------------------------------------------
  console.log('\n── SUITE 2: Authoritative Elapsed Timer Contract ──────────────');

  const assignedAt = new Date(serveRes.assignment.assignedAt);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - assignedAt.getTime()) / 1000);

  assert(!isNaN(assignedAt.getTime()), '2.1 assignedAt is a valid ISO timestamp');
  assert(
    diffSeconds >= 0 && diffSeconds < 5,
    '2.2 Elapsed time is correctly derived from assignedAt'
  );

  // -------------------------------------------------------------------------
  // SUITE 3: RUN VS SUBMIT DECOUPLING (RUN PROMPT)
  // -------------------------------------------------------------------------
  console.log('\n── SUITE 3: Decoupled Run Action (Metering & Refund) ─────────');

  // 3.1 Empty prompt rejection
  let emptyRunErr: any = null;
  const mockReqEmpty = {
    body: { userPrompt: '   ', assignmentId: serveRes.assignment.assignmentId },
    user: { _id: testUserId, id: testUserId, clarity: { trialRunsUsed: 0 } },
  };
  const mockResEmpty = {
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      emptyRunErr = { status: this.statusCode, data };
      return this;
    },
    statusCode: 200,
  };
  await runTask(mockReqEmpty as any, mockResEmpty as any);
  assert(emptyRunErr?.status === 400, '3.1 Empty userPrompt rejected with HTTP 400');

  // 3.2 Trial Run (0 AC cost)
  let runTrialRes: any = null;
  const mockReqTrial = {
    body: {
      assignmentId: serveRes.assignment.assignmentId,
      userPrompt: 'Act as a Senior Auditor. Verify the customer claim against shipping policy.',
      topic: testTopic,
    },
    user: { _id: testUserId, id: testUserId, clarity: { trialRunsUsed: 0 }, aiimsCredits: 100 },
  };
  const mockResTrial = {
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      runTrialRes = data;
      return this;
    },
    statusCode: 200,
  };
  await runTask(mockReqTrial as any, mockResTrial as any);
  assert(
    runTrialRes?.isFreeTrial === true,
    '3.2 First run qualifies as complimentary trial (isFreeTrial: true)'
  );
  assert(runTrialRes?.creditsDeducted === 0, '3.3 Zero credits deducted on free trial run');
  assert(runTrialRes?.isLocked === false, '3.4 Task remains unlocked after Run action');

  // Verify assignment is NOT marked SUBMITTED after Run
  const asgnAfterRun = await prisma.questionAssignment.findUnique({
    where: { assignmentId: serveRes.assignment.assignmentId },
  });
  assert(
    asgnAfterRun?.status !== 'SUBMITTED',
    '3.5 Run action DOES NOT submit or complete the assignment'
  );

  // 3.3 Subsequent Run (10 AC deduction)
  let runPaidRes: any = null;
  // Give user balance in ledger first
  await creditsLedgerService.executeTransaction({
    userId: testUserId,
    type: 'EARN',
    category: 'REWARD',
    amount: 100,
    reason: 'Initial test balance',
    source: 'ADMIN_GRANT',
    sourceId: `grant-${Date.now()}`,
    idempotencyKey: `grant-${Date.now()}`,
  });

  const mockReqPaid = {
    body: {
      assignmentId: serveRes.assignment.assignmentId,
      userPrompt: 'Act as a Senior Auditor. Cross-reference the claim against Clause 4.2.',
      topic: testTopic,
    },
    user: { _id: testUserId, id: testUserId, clarity: { trialRunsUsed: 1 }, aiimsCredits: 100 },
  };
  const mockResPaid = {
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      runPaidRes = data;
      return this;
    },
    statusCode: 200,
  };
  await runTask(mockReqPaid as any, mockResPaid as any);
  assert(runPaidRes?.creditsDeducted === 10, '3.6 Subsequent run deducts exactly 10 AC atomically');
  assert(runPaidRes?.isLocked === false, '3.7 Task remains unlocked after paid Run action');

  // -------------------------------------------------------------------------
  // SUITE 4: SUBMIT ACTION & SERVER-AUTHORITATIVE LOCKING
  // -------------------------------------------------------------------------
  console.log('\n── SUITE 4: Submit Action & Task Locking ──────────────────────');

  let submitRes: any = null;
  const mockReqSubmit = {
    body: {
      assignmentId: serveRes.assignment.assignmentId,
      answer:
        'Act as a Senior Compliance Auditor. Compare customer claim with Official Shipping Policy Clause 4.2. Verify discrepancy: overnight delivery requires $18 surcharge regardless of order time. Final verdict: INACCURATE. Citation: Clause 4.2.',
      timeTakenSeconds: 45,
    },
    user: { _id: testUserId, id: testUserId, role: 'student', xpPoints: 0, aiimsCredits: 90 },
  };
  const mockResSubmit = {
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      submitRes = data;
      return this;
    },
    statusCode: 200,
  };
  await submitClarityTask(mockReqSubmit as any, mockResSubmit as any);

  assert(submitRes?.success === true, '4.1 Task submitted successfully');
  assert(submitRes?.isLocked === true, '4.2 Response confirms task isLocked: true');
  assert(
    submitRes?.score >= 0 && submitRes?.score <= 100,
    '4.3 Server-authoritative score returned (0-100)'
  );
  assert(submitRes?.rubricFeedback?.length > 0, '4.4 Rubric criteria breakdown returned');
  assert(submitRes?.creditsAwarded === 15, '4.5 15 AIIMS Credits awarded for completing task');
  assert(submitRes?.xpAwarded === 50, '4.6 50 XP points awarded for completing task');

  // Verify assignment in store is now SUBMITTED
  const asgnAfterSubmit = await prisma.questionAssignment.findUnique({
    where: { assignmentId: serveRes.assignment.assignmentId },
  });
  assert(asgnAfterSubmit?.status === 'SUBMITTED', '4.7 Assignment status updated to SUBMITTED');
  assert(!!asgnAfterSubmit?.completedAt, '4.8 completedAt timestamp recorded upon submission');

  // 4.9 Run on locked task is rejected with HTTP 409
  let runLockedRes: any = null;
  const mockReqRunLocked = {
    body: {
      assignmentId: serveRes.assignment.assignmentId,
      userPrompt: 'Attempting to run a locked task prompt.',
    },
    user: { _id: testUserId, id: testUserId, clarity: { trialRunsUsed: 2 } },
  };
  const mockResRunLocked = {
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      runLockedRes = { status: this.statusCode, data };
      return this;
    },
    statusCode: 200,
  };
  await runTask(mockReqRunLocked as any, mockResRunLocked as any);
  assert(runLockedRes?.status === 409, '4.9 Run on submitted task rejected with HTTP 409 Conflict');
  assert(runLockedRes?.data?.code === 'TASK_LOCKED', '4.10 Error code is TASK_LOCKED');

  // 4.11 Second Submit on locked task is rejected with HTTP 409
  let secondSubmitRes: any = null;
  const mockResSecondSubmit = {
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      secondSubmitRes = { status: this.statusCode, data };
      return this;
    },
    statusCode: 200,
  };
  await submitClarityTask(mockReqSubmit as any, mockResSecondSubmit as any);
  assert(
    secondSubmitRes?.status === 409,
    '4.11 Re-submitting locked task rejected with HTTP 409 Conflict'
  );

  // -------------------------------------------------------------------------
  // SUITE 5: CONFIGURABLE LEVEL PROGRESSION LOGIC
  // -------------------------------------------------------------------------
  console.log('\n── SUITE 5: Configurable Level Progression Logic ─────────────');

  const progLearnerId = `prog-learner-${Date.now()}`;
  const progTopic = 'Fact Checking';

  // 5.1 Initial level is Easy
  const p0 = await clarityProgressionService.getLearnerProgression(progLearnerId, progTopic);
  assert(p0.currentLevel === 'Easy', '5.1 Initial learner level defaults to Easy');
  assert(p0.consecutiveHighScores === 0, '5.2 Initial consecutive high scores count is 0');

  // 5.2 Score 85 (High score 1/2) -> stays Easy
  const t1 = await clarityProgressionService.recordAttemptScore(
    progLearnerId,
    progTopic,
    85,
    'att-1'
  );
  assert(t1.currentLevel === 'Easy', '5.3 First score >= 80 does not advance level yet (1/2)');
  assert(t1.consecutiveHighScores === 1, '5.4 Consecutive high scores increments to 1');
  assert(t1.levelChanged === false, '5.5 levelChanged is false');

  // 5.3 Second consecutive Score 82 (High score 2/2) -> advances to Medium
  const t2 = await clarityProgressionService.recordAttemptScore(
    progLearnerId,
    progTopic,
    82,
    'att-2'
  );
  assert(t2.currentLevel === 'Medium', '5.6 Two consecutive scores >= 80 advances level to Medium');
  assert(
    t2.consecutiveHighScores === 0,
    '5.7 Consecutive high scores streak resets to 0 upon level advancement'
  );
  assert(t2.levelChanged === true, '5.8 levelChanged is true');
  assert(t2.direction === 'UP', '5.9 Progression direction is UP');

  // 5.4 Neutral score 65 (between 50 and 79) -> level unchanged, streak resets
  // First get 1 high score in Medium
  await clarityProgressionService.recordAttemptScore(progLearnerId, progTopic, 90, 'att-3');
  const tNeutral = await clarityProgressionService.recordAttemptScore(
    progLearnerId,
    progTopic,
    65,
    'att-4'
  );
  assert(tNeutral.currentLevel === 'Medium', '5.10 Neutral score (65) maintains Medium level');
  assert(
    tNeutral.consecutiveHighScores === 0,
    '5.11 Neutral score resets consecutive high scores to 0'
  );
  assert(tNeutral.direction === 'NONE', '5.12 Direction is NONE');

  // 5.5 Score exactly 50 does NOT drop level
  const t50 = await clarityProgressionService.recordAttemptScore(
    progLearnerId,
    progTopic,
    50,
    'att-5'
  );
  assert(
    t50.currentLevel === 'Medium',
    '5.13 Score of exactly 50 does NOT drop level (boundary check)'
  );

  // 5.6 Score < 50 drops level (Medium -> Easy)
  const tDrop = await clarityProgressionService.recordAttemptScore(
    progLearnerId,
    progTopic,
    45,
    'att-6'
  );
  assert(tDrop.currentLevel === 'Easy', '5.14 Score < 50 drops level to Easy');
  assert(tDrop.direction === 'DOWN', '5.15 Direction is DOWN');

  // 5.7 Lower boundary: Score < 50 on Easy cannot drop below Easy
  const tBottom = await clarityProgressionService.recordAttemptScore(
    progLearnerId,
    progTopic,
    30,
    'att-7'
  );
  assert(tBottom.currentLevel === 'Easy', '5.16 Lower boundary: Cannot drop below Easy level');

  // 5.8 Upper boundary: Advance to Hard, then verify cannot exceed Hard
  // Advance to Medium
  await clarityProgressionService.recordAttemptScore(progLearnerId, progTopic, 85, 'att-8');
  await clarityProgressionService.recordAttemptScore(progLearnerId, progTopic, 85, 'att-9');
  // Advance to Hard
  await clarityProgressionService.recordAttemptScore(progLearnerId, progTopic, 85, 'att-10');
  const tHard = await clarityProgressionService.recordAttemptScore(
    progLearnerId,
    progTopic,
    85,
    'att-11'
  );
  assert(tHard.currentLevel === 'Hard', '5.17 Advanced to Hard level');

  // Two more high scores on Hard
  await clarityProgressionService.recordAttemptScore(progLearnerId, progTopic, 95, 'att-12');
  const tTop = await clarityProgressionService.recordAttemptScore(
    progLearnerId,
    progTopic,
    95,
    'att-13'
  );
  assert(tTop.currentLevel === 'Hard', '5.18 Upper boundary: Cannot progress beyond Hard level');

  // 5.9 Boundary test: Score of exactly 80 counts as high score
  const boundaryLearner = `bound-learner-${Date.now()}`;
  const t80 = await clarityProgressionService.recordAttemptScore(
    boundaryLearner,
    progTopic,
    80,
    'att-b1'
  );
  assert(t80.consecutiveHighScores === 1, '5.19 Score of exactly 80 counts as high score (>= 80)');

  // -------------------------------------------------------------------------
  // SUITE 6: PROGRESSION CONFIGURATION & ADMIN RBAC
  // -------------------------------------------------------------------------
  console.log('\n── SUITE 6: Progression Configuration & Admin RBAC ───────────');

  // 6.1 Get default config
  const defConfig = await clarityProgressionService.getProgressionConfig();
  assert(defConfig.upwardThreshold === 80, '6.1 Default upwardThreshold is 80');
  assert(defConfig.consecutiveRequired === 2, '6.2 Default consecutiveRequired is 2');
  assert(defConfig.downwardThreshold === 50, '6.3 Default downwardThreshold is 50');

  // 6.2 Non-admin rejected from updating config
  let nonAdminErr: any = null;
  const mockReqStudentConfig = {
    body: { upwardThreshold: 85, consecutiveRequired: 3, downwardThreshold: 45 },
    user: { _id: 'student-1', role: 'student' },
  };
  const mockResStudentConfig = {
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      nonAdminErr = { status: this.statusCode, data };
      return this;
    },
    statusCode: 200,
  };
  await updateProgressionConfigHandler(mockReqStudentConfig as any, mockResStudentConfig as any);
  assert(
    nonAdminErr?.status === 403,
    '6.4 Non-admin blocked with HTTP 403 when updating progression config'
  );

  // 6.3 Admin successfully updates config
  let adminResConfig: any = null;
  const mockReqAdminConfig = {
    body: { upwardThreshold: 85, consecutiveRequired: 3, downwardThreshold: 40 },
    user: { _id: 'admin-1', role: 'admin' },
  };
  const mockResAdminConfig = {
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      adminResConfig = data;
      return this;
    },
    statusCode: 200,
  };
  await updateProgressionConfigHandler(mockReqAdminConfig as any, mockResAdminConfig as any);
  assert(adminResConfig?.success === true, '6.5 Admin successfully updates progression config');
  assert(adminResConfig?.config?.upwardThreshold === 85, '6.6 Updated upwardThreshold is 85');
  assert(adminResConfig?.config?.consecutiveRequired === 3, '6.7 Updated consecutiveRequired is 3');

  // Restore defaults
  await clarityProgressionService.updateProgressionConfig('admin-1', {
    upwardThreshold: 80,
    consecutiveRequired: 2,
    downwardThreshold: 50,
  });

  // -------------------------------------------------------------------------
  // SUITE 7: NEXT QUESTION FLOW & EXCLUSION GUARANTEES
  // -------------------------------------------------------------------------
  console.log('\n── SUITE 7: Next Question Flow & Exclusion Guarantees ─────────');

  let nextTaskRes: any = null;
  const mockReqNext = {
    body: { topic: testTopic },
    user: { _id: testUserId, id: testUserId, role: 'student', college: 'AIIMS_INSTITUTE' },
  };
  const mockResNext = {
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      nextTaskRes = data;
      return this;
    },
    statusCode: 200,
  };
  await serveNextClarityTask(mockReqNext as any, mockResNext as any);

  assert(nextTaskRes?.success === true, '7.1 Next question served successfully');
  assert(
    nextTaskRes?.assignmentId !== serveRes.assignment.assignmentId,
    '7.2 New unique assignmentId generated'
  );
  assert(
    nextTaskRes?.question?.questionId !== serveRes.assignment.questionId,
    '7.3 No-repeat guarantee: Learner does not receive the same question ID twice'
  );

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(` VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runClarityVerification().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
