/**
 * verifyT3LearnerJourney.ts
 * ============================================================================
 * AIIMS Task T3: End-to-End Learner Journey Verification Suite
 *
 * Verified against persistent MongoDB test database (aiims_test).
 *
 * Requirements & Steps Tested:
 *  1. Database connectivity check, test DB safety guard & index synchronization.
 *  2. Question seed process initialization & idempotency.
 *  3. Learner registration via normal flow (mandatory track) persisted in MongoDB.
 *  4. Baseline assessment completion & 50 AC / 100 XP award in MongoDB ledger.
 *  5. Baseline resubmission idempotency (no duplicate 50 AC).
 *  6. Clarity task serving, AI rubric evaluation, and 15 AC award in MongoDB.
 *  7. Clarity submission lock & reload persistence (HTTP 409).
 *  8. Focus Practice Challenge serving (Easy) persisted in MongoDB.
 *  9. Focus Fast submission (≤ 5 min): 20 AC awarded in MongoDB.
 * 10. Focus Normal submission (≤ 10 min): 15 AC awarded in MongoDB.
 * 11. Focus Over-time submission (> 10 min): 0 AC awarded while preserving score.
 * 12. Focus submission lock (HTTP 409 on re-submission).
 * 13. Question repetition guard (previously served questions never repeat).
 * 14. Assignment isolation (Clarity vs Focus isolation).
 * 15. Credit ledger reconciliation (ledger total strictly equals user balance).
 * 16. MongoDB persistence, compound unique indexes & process restart recovery.
 * ============================================================================
 */

import mongoose from 'mongoose';
import { register } from '../controllers/auth.controller';
import { submitAssessment } from '../controllers/assessment.controller';
import { getActiveClarityTask, submitClarityTask } from '../controllers/clarity.controller';
import { serveQuestionHandler, submitAttemptHandler } from '../controllers/question.controller';
import { initSeedQuestions } from '../services/seedQuestions';
import { clearRateLimitStore } from '../middleware/rateLimit.middleware';
import { rubricEvaluatorService } from '../services/rubricEvaluator.service';
import { creditsLedgerService } from '../services/creditsLedger.service';
import { QuestionAssignment, inMemoryAssignments } from '../models/QuestionAssignment.model';
import { QuestionAttempt, inMemoryAttempts } from '../models/QuestionAttempt.model';
import { CreditLedger } from '../models/CreditLedger.model';
import { User } from '../models/User.model';
import { syncAllDatabaseIndexes } from '../services/databaseIndex.service';
import { config } from '../config/env';

interface TestStepResult {
  step: number;
  name: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED';
  evidence: string;
}

const results: TestStepResult[] = [];

function record(step: number, name: string, status: 'PASS' | 'FAIL' | 'BLOCKED', evidence: string) {
  results.push({ step, name, status, evidence });
  const icon =
    status === 'PASS' ? '✅ [PASS]' : status === 'BLOCKED' ? '⚠️ [BLOCKED]' : '❌ [FAIL]';
  console.log(`  ${icon} Step ${step}: ${name} — ${evidence}`);
}

function createMockRes() {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
    send(data: any) {
      this.body = data;
      return this;
    },
    setHeader(k: string, v: string) {
      this.headers[k.toLowerCase()] = v;
      return this;
    },
    cookie(name: string, val: string) {
      this.headers[`cookie_${name}`] = val;
      return this;
    },
  };
  return res;
}

function createMockReq(options: {
  user?: any;
  body?: any;
  params?: any;
  query?: any;
  headers?: any;
}) {
  return {
    user: options.user,
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    get(name: string) {
      return this.headers[name.toLowerCase()];
    },
    ip: '127.0.0.1',
  } as any;
}

async function cleanupTestData(testEmail?: string, learnerId?: string): Promise<void> {
  if (mongoose.connection.readyState !== 1) return;
  try {
    if (learnerId) {
      await QuestionAttempt.deleteMany({ learnerId });
      await QuestionAssignment.deleteMany({ learnerId });
      await CreditLedger.deleteMany({ userId: learnerId });
      await User.deleteOne({ _id: learnerId });
    }
    if (testEmail) {
      await User.deleteMany({ email: testEmail });
    }
    // Targeted cleanup: only delete automated test identities matching the test pattern
    await User.deleteMany({ email: /^t3-e2e-.*@aiims\.test$/ });
  } catch (err: any) {
    console.warn('[Cleanup] Test data cleanup notice:', err.message);
  }
}

export async function runT3E2ESuite(): Promise<boolean> {
  console.log('================================================================');
  console.log(' AIIMS TASK T3 — PERSISTENT MONGODB LEARNER JOURNEY VERIFICATION');
  console.log('================================================================\n');

  clearRateLimitStore();

  let testEmail = '';
  let learnerId = '';

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Persistent MongoDB Connectivity & Safety Guard
    // -------------------------------------------------------------------------
    const rawUri = config.mongodbUri || process.env.MONGODB_URI;
    if (!rawUri) {
      throw new Error(
        'FATAL: No MONGODB_URI configured. Real MongoDB connection is required for Task T3 verification.'
      );
    }

    const testDbName = process.env.MONGODB_TEST_DB || 'aiims_test';

    console.log(`📡 Connecting to persistent MongoDB test database ("${testDbName}")...`);
    await mongoose.connect(rawUri, {
      dbName: testDbName,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    const activeDbName = mongoose.connection.db?.databaseName || mongoose.connection.name;
    // Explicit Safety Guard: Prevent execution against production database
    if (!activeDbName || (!activeDbName.includes('test') && !activeDbName.endsWith('_test'))) {
      await mongoose.disconnect();
      throw new Error(
        `SAFETY BLOCK: Execution aborted. Target database "${activeDbName}" is not an authorized test database (must contain "test").`
      );
    }

    if (mongoose.connection.readyState !== 1) {
      throw new Error(
        `FATAL: MongoDB connection failed with readyState=${mongoose.connection.readyState}. Silent fallback is forbidden.`
      );
    }

    const client = (
      mongoose.connection as unknown as {
        client?: { topology?: { description?: { type?: string } } };
      }
    )?.client;
    const topologyType = client?.topology?.description?.type || 'Unknown';

    // Synchronize required database indexes
    const indexSyncResults = await syncAllDatabaseIndexes();
    const successfulIndexes = indexSyncResults.filter((r) => r.success).length;

    record(
      1,
      'Database Connectivity & Safety Guard',
      'PASS',
      `Connected to persistent database "${activeDbName}" (Topology: ${topologyType}; ${successfulIndexes}/${indexSyncResults.length} indexes synchronized; Production safety guard enforced)`
    );

    // Setup dynamic mock AI runner matching served rubric criteria
    rubricEvaluatorService.setAICompletionRunner(async (userPrompt: string) => {
      const regex = /CRITERION:\s*"([^"]+)"\s*\(Max Score:\s*(\d+)\s*points\)/g;
      const criteria: Array<{
        criterion: string;
        score: number;
        maxScore: number;
        feedback: string;
      }> = [];
      let match: RegExpExecArray | null;
      while ((match = regex.exec(userPrompt)) !== null) {
        const criterion = match[1];
        const maxScore = parseInt(match[2], 10);
        const score = Math.round(maxScore * 0.9);
        criteria.push({
          criterion,
          score,
          maxScore,
          feedback: `Strong demonstrated capability in ${criterion}.`,
        });
      }

      if (criteria.length === 0) {
        criteria.push(
          {
            criterion: 'Threshold Identification',
            score: 45,
            maxScore: 50,
            feedback: 'Strong verification.',
          },
          {
            criterion: 'Clear Verdict',
            score: 45,
            maxScore: 50,
            feedback: 'Definitive evaluation.',
          }
        );
      }

      const totalScore = criteria.reduce((sum, c) => sum + c.score, 0);
      const totalMax = criteria.reduce((sum, c) => sum + c.maxScore, 0);
      const overallScore = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 90;

      return JSON.stringify({
        criteria,
        overallScore,
        overallFeedback:
          'Thorough analysis demonstrating solid AI evaluation capability and attention to detail.',
      });
    });

    // -------------------------------------------------------------------------
    // STEP 2: Question Bank Seed Process
    // -------------------------------------------------------------------------
    const seedCount = await initSeedQuestions();
    record(
      2,
      'Question Bank Seed Initialization',
      seedCount > 0 ? 'PASS' : 'FAIL',
      `Seeded ${seedCount} verified baseline questions into persistent MongoDB`
    );

    // -------------------------------------------------------------------------
    // STEP 3: Learner Registration Flow
    // -------------------------------------------------------------------------
    testEmail = `t3-e2e-${Date.now()}@aiims.test`;
    const regReq = createMockReq({
      body: {
        name: 'T3 E2E Learner',
        email: testEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        track: 'Student',
        stream: 'TECH',
        streamSubCategory: 'CS_IT',
        educationLevel: 'UNDERGRADUATE',
        programId: 'btech',
        programName: 'B.Tech Computer Science',
        specializationId: 'cs',
        specializationName: 'Computer Science',
        yearOfStudy: 3,
        admissionYear: 2022,
        expectedGraduationYear: 2026,
        college: 'Apex Engineering Institute',
      },
    });
    const regRes = createMockRes();
    await register(regReq, regRes);

    const user = regRes.body?.user;
    learnerId = String(user?.id || user?._id);
    const regPassed = regRes.statusCode === 201 && Boolean(learnerId);

    // Verify user document in persistent MongoDB
    let authUser = await User.findById(learnerId);
    if (!authUser) {
      throw new Error(`FATAL: User ${learnerId} was not persisted in MongoDB.`);
    }

    record(
      3,
      'Learner Registration Flow (Persistent)',
      regPassed && authUser.aiimsCredits === 500 ? 'PASS' : 'FAIL',
      `HTTP ${regRes.statusCode}; persisted balance: ${authUser.aiimsCredits} AC; track: ${authUser.track}; MongoDB ID: ${learnerId}`
    );

    // -------------------------------------------------------------------------
    // STEP 4: Baseline Assessment Completion & Reward
    // -------------------------------------------------------------------------
    const baselineAnswers: Record<string, any> = {
      '1': 'A',
      '2': 'B',
      '3': 'C',
      '4': 'D',
      '5': 'A',
      '6': 'B',
      '7': 'C',
      '8': 'D',
      '9': 'A',
      '10': 'B',
      '11': 'Modular architecture with strict decoupled boundaries and explicit error handlers.',
      '12': 'Clean contracts with TypeScript type-safety and automated test harness.',
      '13': 'A',
      '14': 'B',
      '15': 'C',
      '16': 'D',
      '17': 'A',
      '18': 'B',
      '19': 'C',
      '20': 'D',
      '21': 'A',
      '22': 'B',
      '23': 'C',
      '24': 'D',
      '25': 'Adaptation requires critical thinking, prompt refinement, and continuous learning.',
    };

    const assessReq = createMockReq({
      user: authUser,
      body: { answers: baselineAnswers },
    });
    const assessRes = createMockRes();
    await submitAssessment(assessReq, assessRes);

    // Refresh user from persistent MongoDB
    authUser = (await User.findById(learnerId)) || authUser;

    const assessPassed =
      assessRes.statusCode === 200 &&
      assessRes.body?.earnedCredits === 50 &&
      assessRes.body?.updatedBalance === 550 &&
      authUser.aiimsCredits === 550;

    record(
      4,
      'Baseline Assessment Award (Persistent)',
      assessPassed ? 'PASS' : 'FAIL',
      `HTTP ${assessRes.statusCode}; earned: +50 AC; persisted balance: ${authUser.aiimsCredits} AC; stage: Understanding`
    );

    // -------------------------------------------------------------------------
    // STEP 5: Baseline Resubmission Idempotency
    // -------------------------------------------------------------------------
    const assessResubReq = createMockReq({
      user: authUser,
      body: { answers: baselineAnswers },
    });
    const assessResubRes = createMockRes();
    await submitAssessment(assessResubReq, assessResubRes);

    authUser = (await User.findById(learnerId)) || authUser;

    const assessResubPassed =
      assessResubRes.statusCode === 200 &&
      (assessResubRes.body?.earnedCredits === 0 || !assessResubRes.body?.earnedCredits) &&
      assessResubRes.body?.alreadyClaimed === true &&
      authUser.aiimsCredits === 550;

    record(
      5,
      'Baseline Resubmission Idempotency (Persistent)',
      assessResubPassed ? 'PASS' : 'FAIL',
      `HTTP ${assessResubRes.statusCode}; duplicate AC awarded: 0; alreadyClaimed: true; balance preserved at ${authUser.aiimsCredits} AC`
    );

    // -------------------------------------------------------------------------
    // STEP 6: Clarity Task Serving, Evaluation & Reward
    // -------------------------------------------------------------------------
    const clarityActiveReq = createMockReq({
      user: authUser,
      body: { topic: 'Checking AI' },
    });
    const clarityActiveRes = createMockRes();
    await getActiveClarityTask(clarityActiveReq, clarityActiveRes);

    const clarityAssignmentId = clarityActiveRes.body?.assignmentId;
    const claritySubmitReq = createMockReq({
      user: authUser,
      body: {
        assignmentId: clarityAssignmentId,
        answer:
          'The order value of $45 falls short of the $50 requirement, meaning the 20% discount is invalid.',
        timeTakenSeconds: 120,
      },
    });
    const claritySubmitRes = createMockRes();
    await submitClarityTask(claritySubmitReq, claritySubmitRes);

    authUser = (await User.findById(learnerId)) || authUser;

    const clarityPassed =
      claritySubmitRes.statusCode === 200 &&
      typeof claritySubmitRes.body?.score === 'number' &&
      claritySubmitRes.body?.score >= 1 &&
      claritySubmitRes.body?.score <= 100 &&
      claritySubmitRes.body?.currentBalance === 565 &&
      authUser.aiimsCredits === 565;

    record(
      6,
      'Clarity Task Rubric Evaluation & Reward (Persistent)',
      clarityPassed ? 'PASS' : 'FAIL',
      `HTTP ${claritySubmitRes.statusCode}; score: ${claritySubmitRes.body?.score}%; reward: +15 AC / +50 XP; persisted balance: ${authUser.aiimsCredits} AC`
    );

    // -------------------------------------------------------------------------
    // STEP 7: Clarity Submission Lock (HTTP 409)
    // -------------------------------------------------------------------------
    const clarityResubReq = createMockReq({
      user: authUser,
      body: {
        assignmentId: clarityAssignmentId,
        answer: 'Attempting to resubmit locked task.',
        timeTakenSeconds: 150,
      },
    });
    const clarityResubRes = createMockRes();
    await submitClarityTask(clarityResubReq, clarityResubRes);

    const clarityLockPassed =
      clarityResubRes.statusCode === 409 &&
      (clarityResubRes.body?.code === 'TASK_LOCKED' || clarityResubRes.body?.isLocked === true);

    record(
      7,
      'Clarity Task Submission Lock Guard',
      clarityLockPassed ? 'PASS' : 'FAIL',
      `HTTP ${clarityResubRes.statusCode}; code: ${clarityResubRes.body?.code}; resubmission rejected; lock preserved`
    );

    // -------------------------------------------------------------------------
    // STEP 8: Focus Challenge Serving (Easy)
    // -------------------------------------------------------------------------
    const focusServeReq1 = createMockReq({
      user: authUser,
      body: {
        topic: 'Checking AI',
        level: 'Easy',
        track: 'General',
      },
    });
    const focusServeRes1 = createMockRes();
    await serveQuestionHandler(focusServeReq1, focusServeRes1);

    const focusAsgnId1 = focusServeRes1.body?.assignmentId;
    const focusQId1 = focusServeRes1.body?.question?.questionId;
    const focusServe1Passed =
      focusServeRes1.statusCode === 200 && Boolean(focusAsgnId1) && Boolean(focusQId1);

    record(
      8,
      'Focus Challenge Serving (Easy)',
      focusServe1Passed ? 'PASS' : 'FAIL',
      `HTTP ${focusServeRes1.statusCode}; assignmentId: ${focusAsgnId1}; question: ${focusQId1}`
    );

    // -------------------------------------------------------------------------
    // STEP 9: Focus Fast Submission (≤ 5 min -> 20 AC)
    // -------------------------------------------------------------------------
    const focusSubmitReq1 = createMockReq({
      user: authUser,
      body: {
        assignmentId: focusAsgnId1,
        answer: 'Customer cart of $45 does not meet the $50 threshold. Policy violation verified.',
        timeTakenSeconds: 100,
      },
    });
    const focusSubmitRes1 = createMockRes();
    await submitAttemptHandler(focusSubmitReq1, focusSubmitRes1);

    authUser = (await User.findById(learnerId)) || authUser;

    const focusFastPassed =
      focusSubmitRes1.statusCode === 200 &&
      focusSubmitRes1.body?.reward?.tier === 'FAST' &&
      focusSubmitRes1.body?.reward?.credits === 20 &&
      focusSubmitRes1.body?.currentBalance === 585 &&
      authUser.aiimsCredits === 585;

    record(
      9,
      'Focus Fast Timing Reward (≤ 5 min, Persistent)',
      focusFastPassed ? 'PASS' : 'FAIL',
      `HTTP ${focusSubmitRes1.statusCode}; tier: ${focusSubmitRes1.body?.reward?.tier}; reward: +${focusSubmitRes1.body?.reward?.credits} AC; persisted balance: ${authUser.aiimsCredits} AC`
    );

    // -------------------------------------------------------------------------
    // STEP 10: Focus Normal Submission (≤ 10 min -> 15 AC)
    // -------------------------------------------------------------------------
    const focusServeReq2 = createMockReq({
      user: authUser,
      body: {
        topic: 'Checking AI',
        level: 'Easy',
        track: 'General',
      },
    });
    const focusServeRes2 = createMockRes();
    await serveQuestionHandler(focusServeReq2, focusServeRes2);

    const focusAsgnId2 = focusServeRes2.body?.assignmentId;
    const focusQId2 = focusServeRes2.body?.question?.questionId;

    // Simulate clock: set assignedAt to 400 seconds ago (between 300s and 600s -> NORMAL)
    const pastDateNormal = new Date(Date.now() - 400 * 1000);
    await QuestionAssignment.updateOne(
      { assignmentId: focusAsgnId2 },
      { assignedAt: pastDateNormal }
    );

    const focusSubmitReq2 = createMockReq({
      user: authUser,
      body: {
        assignmentId: focusAsgnId2,
        answer: 'Carefully audited cart threshold. The transaction violates promotional rules.',
      },
    });
    const focusSubmitRes2 = createMockRes();
    await submitAttemptHandler(focusSubmitReq2, focusSubmitRes2);

    authUser = (await User.findById(learnerId)) || authUser;

    const focusNormalPassed =
      focusSubmitRes2.statusCode === 200 &&
      focusSubmitRes2.body?.reward?.tier === 'NORMAL' &&
      focusSubmitRes2.body?.reward?.credits === 15 &&
      focusSubmitRes2.body?.currentBalance === 600 &&
      authUser.aiimsCredits === 600;

    record(
      10,
      'Focus Normal Timing Reward (≤ 10 min, Persistent)',
      focusNormalPassed ? 'PASS' : 'FAIL',
      `HTTP ${focusSubmitRes2.statusCode}; tier: ${focusSubmitRes2.body?.reward?.tier}; reward: +${focusSubmitRes2.body?.reward?.credits} AC; persisted balance: ${authUser.aiimsCredits} AC`
    );

    // -------------------------------------------------------------------------
    // STEP 11: Focus Over-Time Submission (> 10 min -> 0 AC, score preserved)
    // -------------------------------------------------------------------------
    const focusServeReq3 = createMockReq({
      user: authUser,
      body: {
        topic: 'Checking AI',
        level: 'Easy',
        track: 'General',
      },
    });
    const focusServeRes3 = createMockRes();
    await serveQuestionHandler(focusServeReq3, focusServeRes3);

    const focusAsgnId3 = focusServeRes3.body?.assignmentId;
    const focusQId3 = focusServeRes3.body?.question?.questionId;

    // Simulate clock: set assignedAt to 750 seconds ago (> 600s -> OVERTIME)
    const pastDateOvertime = new Date(Date.now() - 750 * 1000);
    await QuestionAssignment.updateOne(
      { assignmentId: focusAsgnId3 },
      { assignedAt: pastDateOvertime }
    );

    const focusSubmitReq3 = createMockReq({
      user: authUser,
      body: {
        assignmentId: focusAsgnId3,
        answer: 'Overtime submission analysis verifying policy non-compliance.',
      },
    });
    const focusSubmitRes3 = createMockRes();
    await submitAttemptHandler(focusSubmitReq3, focusSubmitRes3);

    authUser = (await User.findById(learnerId)) || authUser;

    const focusOvertimePassed =
      focusSubmitRes3.statusCode === 200 &&
      focusSubmitRes3.body?.reward?.tier === 'OVERTIME' &&
      focusSubmitRes3.body?.reward?.credits === 0 &&
      typeof focusSubmitRes3.body?.score === 'number' &&
      focusSubmitRes3.body?.score >= 1 &&
      focusSubmitRes3.body?.score <= 100 &&
      focusSubmitRes3.body?.currentBalance === 600 &&
      authUser.aiimsCredits === 600;

    record(
      11,
      'Focus Over-time Timing & Score Retention (Persistent)',
      focusOvertimePassed ? 'PASS' : 'FAIL',
      `HTTP ${focusSubmitRes3.statusCode}; tier: OVERTIME; credits awarded: 0 AC; score preserved: ${focusSubmitRes3.body?.score}%; persisted balance: ${authUser.aiimsCredits} AC`
    );

    // -------------------------------------------------------------------------
    // STEP 12: Focus Submission Lock (HTTP 409)
    // -------------------------------------------------------------------------
    const focusResubReq = createMockReq({
      user: authUser,
      body: {
        assignmentId: focusAsgnId1,
        answer: 'Attempting to re-submit already completed assignment',
      },
    });
    const focusResubRes = createMockRes();
    await submitAttemptHandler(focusResubReq, focusResubRes);

    const focusLockPassed =
      focusResubRes.statusCode === 409 &&
      (focusResubRes.body?.code === 'TASK_LOCKED' || focusResubRes.body?.isLocked === true);

    record(
      12,
      'Focus Challenge Submission Lock Guard',
      focusLockPassed ? 'PASS' : 'FAIL',
      `HTTP ${focusResubRes.statusCode}; code: ${focusResubRes.body?.code}; re-attempt rejected with HTTP 409`
    );

    // -------------------------------------------------------------------------
    // STEP 13: Question Repetition Guard
    // -------------------------------------------------------------------------
    const servedIds = [focusQId1, focusQId2, focusQId3];
    const uniqueServed = new Set(servedIds);
    const repetitionPassed = uniqueServed.size === 3;

    record(
      13,
      'Unrepeated Question Delivery Guard',
      repetitionPassed ? 'PASS' : 'FAIL',
      `3 consecutive assignments delivered 3 unique questions (${servedIds.join(', ')}); personal history exclusion enforced`
    );

    // -------------------------------------------------------------------------
    // STEP 14: Clarity vs Focus Module & Assignment Isolation
    // -------------------------------------------------------------------------
    const crossReq = createMockReq({
      user: authUser,
      body: {
        assignmentId: 'asgn-non-existent-cross-module-id',
        answer: 'Cross-module injection attack attempt',
      },
    });
    const crossRes = createMockRes();
    await submitAttemptHandler(crossReq, crossRes);

    const crossPassed = crossRes.statusCode === 404 || crossRes.statusCode === 409;
    record(
      14,
      'Clarity vs Focus Assignment Isolation',
      crossPassed ? 'PASS' : 'FAIL',
      `HTTP ${crossRes.statusCode}; foreign / cross-module assignment cannot be submitted to Focus endpoint`
    );

    // -------------------------------------------------------------------------
    // STEP 15: Credit Ledger Strict Reconciliation
    // -------------------------------------------------------------------------
    const finalLedgerBalance = await creditsLedgerService.getBalance(learnerId);
    // Expected: 500 starting + 50 baseline + 15 clarity + 20 fast focus + 15 normal focus + 0 overtime focus = 600 AC
    const expectedBalance = 600;
    const ledgerReconciliationPassed =
      finalLedgerBalance === expectedBalance && authUser.aiimsCredits === expectedBalance;

    record(
      15,
      'End-to-End Credit Ledger Reconciliation (Persistent)',
      ledgerReconciliationPassed ? 'PASS' : 'FAIL',
      `Calculated ledger balance: ${finalLedgerBalance} AC; Persisted User balance: ${authUser.aiimsCredits} AC; Expected: ${expectedBalance} AC; Zero drift detected`
    );

    // -------------------------------------------------------------------------
    // STEP 16: MongoDB Persistence, Compound Indexes & Process Restart Recovery
    // -------------------------------------------------------------------------
    // 16a. Verify Unique CreditLedger Idempotency Compound Index (E11000 duplicate rejection)
    let idempotencyConstraintPassed = false;
    try {
      const existingLedgerEntry = await CreditLedger.findOne({
        userId: learnerId,
        idempotencyKey: { $exists: true, $ne: null },
      });
      if (existingLedgerEntry && existingLedgerEntry.idempotencyKey) {
        await CreditLedger.create({
          id: `tx-dup-test-${Date.now()}`,
          userId: learnerId,
          type: 'EARN',
          category: 'REWARD',
          amount: 999,
          balanceBefore: 600,
          balanceAfter: 1599,
          reason: 'Direct collision test',
          source: 'TEST',
          idempotencyKey: existingLedgerEntry.idempotencyKey,
          status: 'COMPLETED',
        });
      }
    } catch (err: any) {
      if (
        err.code === 11000 ||
        String(err.message).includes('E11000') ||
        (err.errorResponse && err.errorResponse.code === 11000)
      ) {
        idempotencyConstraintPassed = true;
      }
    }

    // 16b. Verify Unique QuestionAssignment Compound Index (E11000 duplicate rejection)
    let assignmentConstraintPassed = false;
    try {
      const existingAsgn = await QuestionAssignment.findOne({ learnerId });
      if (existingAsgn) {
        await QuestionAssignment.create({
          assignmentId: `asgn-dup-${Date.now()}`,
          learnerId: existingAsgn.learnerId,
          questionId: existingAsgn.questionId,
          topic: existingAsgn.topic,
          level: existingAsgn.level,
          status: 'ASSIGNED',
        });
      }
    } catch (err: any) {
      if (err.code === 11000 || String(err.message).includes('E11000')) {
        assignmentConstraintPassed = true;
      }
    }

    // 16c. Verify QuestionAttempt Persistence
    const persistedAttempts = await QuestionAttempt.find({ learnerId });
    const attemptsPersisted = persistedAttempts.length >= 4;

    // 16d. Verify Simulated Process Restart (clear all in-memory caches, reload from MongoDB)
    inMemoryAssignments.clear();
    inMemoryAttempts.clear();
    const reloadedAssignment = await QuestionAssignment.findOne({ assignmentId: focusAsgnId1 });
    const reloadedUser = await User.findById(learnerId);
    const restartPersistencePassed =
      reloadedAssignment?.status === 'SUBMITTED' && reloadedUser?.aiimsCredits === 600;

    // 16e. Verify Duplicate Reward Rejection after restart
    const postRestartDupReq = createMockReq({
      user: reloadedUser,
      body: {
        assignmentId: focusAsgnId1,
        answer: 'Attempting reward claim after simulated restart',
      },
    });
    const postRestartDupRes = createMockRes();
    await submitAttemptHandler(postRestartDupReq, postRestartDupRes);
    const postRestartRejectionPassed = postRestartDupRes.statusCode === 409;

    const persistencePassed =
      idempotencyConstraintPassed &&
      assignmentConstraintPassed &&
      attemptsPersisted &&
      restartPersistencePassed &&
      postRestartRejectionPassed;

    record(
      16,
      'MongoDB Persistence, Indexes & Process Restart Recovery',
      persistencePassed ? 'PASS' : 'FAIL',
      `E11000 Idempotency Index: ${idempotencyConstraintPassed ? 'ENFORCED' : 'FAILED'}; ` +
        `E11000 Assignment Index: ${assignmentConstraintPassed ? 'ENFORCED' : 'FAILED'}; ` +
        `Attempts Persisted: ${persistedAttempts.length}; ` +
        `Restart State Recovery: ${restartPersistencePassed ? 'VERIFIED' : 'FAILED'}; ` +
        `Post-Restart Lock Rejection: ${postRestartRejectionPassed ? 'VERIFIED (HTTP 409)' : 'FAILED'}`
    );
  } finally {
    // Teardown: Clean ONLY test-scoped records created by this suite, then disconnect
    await cleanupTestData(testEmail, learnerId);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected cleanly from persistent MongoDB test database.\n');
    }
  }

  // -------------------------------------------------------------------------
  // OVERALL VERDICT
  // -------------------------------------------------------------------------
  const failedSteps = results.filter((r) => r.status === 'FAIL');
  const blockedSteps = results.filter((r) => r.status === 'BLOCKED');

  console.log('================================================================');
  console.log(
    ` RESULTS: ${results.filter((r) => r.status === 'PASS').length} Passed, ${failedSteps.length} Failed, ${blockedSteps.length} Blocked`
  );
  console.log('================================================================');

  return failedSteps.length === 0 && blockedSteps.length === 0;
}

if (require.main === module) {
  runT3E2ESuite()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal unhandled error in T3 E2E Suite:', err);
      process.exit(1);
    });
}
