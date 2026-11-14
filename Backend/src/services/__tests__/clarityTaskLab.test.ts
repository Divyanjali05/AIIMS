/**
 * clarityTaskLab.test.ts
 * ============================================================================
 * AIIMS Phase 4: Clarity AI Task Lab Automated Test Suite
 *
 * Verifies:
 *  1. Exactly 30 reviewed and approved questions across 3 learning levels:
 *     - Understanding (10 questions: Easy, Medium, Hard)
 *     - Workflow (10 questions: Easy, Medium, Hard)
 *     - AI Agents (10 questions: Easy, Medium, Hard)
 *  2. Student question sanitization: model answers & evaluation guidance suppressed for learners.
 *  3. Unapproved/draft question suppression from regular learners.
 *  4. Learner journey attempt lifecycle: start attempt -> submit -> evaluate -> lock.
 *  5. Credit Economy:
 *     - First attempt in each learning level is FREE (0 AC).
 *     - Subsequent attempts deduct exactly 10 AC atomically via centralized ledger.
 *     - Overdraft protection (HTTP 402 INSUFFICIENT_CREDITS) with zero balance mutation.
 *     - Automatic 10 AC refund if AI provider fails after charge.
 *  6. Idempotency and task locking (HTTP 409 TASK_LOCKED on duplicate submission).
 *  7. Rubric evaluation scoring and criteria feedback persistence in PostgreSQL.
 *  8. XP persistence (+50 XP) separate from financial credit ledger.
 *  9. Admin question review & publication workflow (RBAC, draft creation, approve/reject, stats).
 * ============================================================================
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../../config/prisma';
import { resetPrismaTestDouble, uninstallPrismaTestDouble } from './helpers/prismaTestDouble';
import { initSeedQuestions } from '../seedQuestions';
import { creditsLedgerService } from '../creditsLedger.service';
import { rubricEvaluatorService } from '../rubricEvaluator.service';
import {
  getClarityLevels,
  getLevelQuestions,
  startClarityAttempt,
  submitClarityTask,
  getClarityHistory,
  getClarityProgress,
  adminListClarityQuestions,
  adminCreateClarityQuestion,
  adminUpdateClarityQuestionStatus,
  adminGetClarityStats,
} from '../../controllers/clarity.controller';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { CLARITY_30_APPROVED_QUESTIONS } from '../../data/clarityQuestionBank';

function createMockReq(
  user: any,
  body: Record<string, any> = {},
  query: Record<string, any> = {},
  params: Record<string, any> = {}
): AuthenticatedRequest {
  return {
    user,
    headers: { 'x-client': 'web' },
    body,
    query,
    params,
  } as AuthenticatedRequest;
}

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('AIIMS Phase 4: Clarity AI Task Lab Test Suite', () => {
  beforeEach(async () => {
    resetPrismaTestDouble(true);
    await initSeedQuestions();

    // Default deterministic AI completion runner for rubric evaluation tests
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
        const score = Math.round(maxScore * 0.85);
        criteria.push({
          criterion,
          score,
          maxScore,
          feedback: `Demonstrated capability in ${criterion}.`,
        });
      }
      if (criteria.length === 0) {
        criteria.push({
          criterion: 'Objective Alignment',
          score: 45,
          maxScore: 50,
          feedback: 'Strong alignment with goal.',
        });
      }
      const totalScore = criteria.reduce((sum, c) => sum + c.score, 0);
      const totalMax = criteria.reduce((sum, c) => sum + c.maxScore, 0);
      const overallScore = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 85;

      return JSON.stringify({
        criteria,
        overallScore,
        overallFeedback:
          'Demonstrated solid prompt engineering principles with explicit constraints.',
      });
    });
  });

  afterAll(() => {
    uninstallPrismaTestDouble();
  });

  // =========================================================================
  // 1. QUESTION BANK & 30 APPROVED QUESTIONS VERIFICATION
  // =========================================================================
  describe('1. Question Bank 30 Approved Questions Inventory', () => {
    it('has exactly 30 approved questions in the authoritative dataset', () => {
      expect(CLARITY_30_APPROVED_QUESTIONS).toHaveLength(30);
    });

    it('contains exactly 10 questions for each of the 3 canonical levels', () => {
      const und = CLARITY_30_APPROVED_QUESTIONS.filter((q) => q.topic === 'Understanding');
      const wf = CLARITY_30_APPROVED_QUESTIONS.filter((q) => q.topic === 'Workflow');
      const agt = CLARITY_30_APPROVED_QUESTIONS.filter((q) => q.topic === 'AI Agents');

      expect(und).toHaveLength(10);
      expect(wf).toHaveLength(10);
      expect(agt).toHaveLength(10);
    });

    it('seeds all 30 questions into PostgreSQL QuestionBank with status APPROVED', async () => {
      const undCount = await prisma.questionBank.count({
        where: { topic: 'Understanding', status: 'APPROVED' },
      });
      const wfCount = await prisma.questionBank.count({
        where: { topic: 'Workflow', status: 'APPROVED' },
      });
      const agtCount = await prisma.questionBank.count({
        where: { topic: 'AI Agents', status: 'APPROVED' },
      });

      expect(undCount).toBe(10);
      expect(wfCount).toBe(10);
      expect(agtCount).toBe(10);
    });

    it('every question provides complete rubric, objective, scenario, criteria, and guidance', () => {
      for (const q of CLARITY_30_APPROVED_QUESTIONS) {
        expect(q.questionId).toBeTruthy();
        expect(q.title).toBeTruthy();
        expect(q.promptText.length).toBeGreaterThan(15);
        expect(q.testScenario.length).toBeGreaterThan(15);
        expect(q.expectedCriteria.length).toBeGreaterThanOrEqual(2);
        expect(q.scoringRubric.length).toBeGreaterThanOrEqual(2);
        expect(q.aiMetadata.learningObjective).toBeTruthy();
        expect(q.aiMetadata.expectedAnswerFormat).toBeTruthy();
        expect(q.aiMetadata.evaluationGuidance).toBeTruthy();

        // Rubric maxScores must sum to 100
        const totalRubricScore = q.scoringRubric.reduce((sum, r) => sum + r.maxScore, 0);
        expect(totalRubricScore).toBe(100);
      }
    });

    it('provides a balanced distribution of Easy, Medium, and Hard difficulty in each level', () => {
      for (const levelTopic of ['Understanding', 'Workflow', 'AI Agents']) {
        const levelQuestions = CLARITY_30_APPROVED_QUESTIONS.filter((q) => q.topic === levelTopic);
        const easy = levelQuestions.filter((q) => q.level === 'Easy');
        const med = levelQuestions.filter((q) => q.level === 'Medium');
        const hard = levelQuestions.filter((q) => q.level === 'Hard');

        expect(easy.length).toBeGreaterThanOrEqual(3);
        expect(med.length).toBeGreaterThanOrEqual(3);
        expect(hard.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  // =========================================================================
  // 2. LEARNING LEVELS OVERVIEW & STUDENT CONTENT SANITIZATION
  // =========================================================================
  describe('2. Learning Levels API & Content Sanitization', () => {
    it('returns all 3 learning levels with accurate approved question counts', async () => {
      const learner = await prisma.user.create({
        data: {
          id: 'learner-san-01',
          email: 'learner-san-01@example.com',
          name: 'Student Sanitization',
          passwordHash: 'dummy',
          role: 'learner',
          aiimsCredits: 500,
          xpPoints: 100,
        },
      });

      const req = createMockReq(learner);
      const res = createMockRes();

      await getClarityLevels(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.levels).toHaveLength(3);

      const levelTopics = res.body.levels.map((l: any) => l.topic);
      expect(levelTopics).toContain('Understanding');
      expect(levelTopics).toContain('Workflow');
      expect(levelTopics).toContain('AI Agents');

      for (const lvl of res.body.levels) {
        expect(lvl.totalQuestions).toBe(10);
        expect(lvl.isFirstAttemptFree).toBe(true);
        expect(lvl.completedQuestions).toBe(0);
      }
    });

    it('sanitizes questions for students, omitting model answer guidance & review notes', async () => {
      const learner = await prisma.user.create({
        data: {
          id: 'learner-san-02',
          email: 'learner-san-02@example.com',
          name: 'Student Learner',
          passwordHash: 'dummy',
          role: 'learner',
        },
      });

      const req = createMockReq(learner, {}, {}, { level: 'understanding' });
      const res = createMockRes();

      await getLevelQuestions(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.questions).toHaveLength(10);

      const firstQ = res.body.questions[0];
      expect(firstQ.title).toBeTruthy();
      expect(firstQ.promptText).toBeTruthy();
      expect(firstQ.testScenario).toBeTruthy();
      expect(firstQ.expectedCriteria).toBeInstanceOf(Array);
      expect(firstQ.scoringRubric).toBeInstanceOf(Array);
      expect(firstQ.learningObjective).toBeTruthy();
      expect(firstQ.expectedAnswerFormat).toBeTruthy();

      // STRICT SECURITY CHECK: Model answers, evaluation guidance & review notes must NOT be exposed!
      expect(firstQ.evaluationGuidance).toBeUndefined();
      expect(firstQ.reviewNotes).toBeUndefined();
      expect(firstQ.reviewedBy).toBeUndefined();
    });

    it('suppresses unapproved and draft questions from regular learners', async () => {
      // Create a DRAFT question
      await prisma.questionBank.create({
        data: {
          questionId: 'clarity-draft-hidden-01',
          topic: 'Understanding',
          level: 'Easy',
          title: 'Unpublished Draft Question',
          promptText: 'Internal prompt not yet reviewed',
          testScenario: 'Internal scenario',
          expectedCriteria: ['Criterion 1'],
          scoringRubric: [{ criterion: 'Test', maxScore: 100, description: 'Test' }],
          status: 'DRAFT',
          version: 1,
        },
      });

      const learner = await prisma.user.create({
        data: {
          id: 'learner-draft-01',
          email: 'learner-draft-01@example.com',
          name: 'Regular Learner',
          passwordHash: 'dummy',
          role: 'learner',
        },
      });

      const req = createMockReq(learner, {}, {}, { level: 'understanding' });
      const res = createMockRes();

      await getLevelQuestions(req, res);

      expect(res.statusCode).toBe(200);
      // Only the 10 APPROVED questions are returned; the DRAFT question is suppressed
      expect(res.body.questions).toHaveLength(10);
      const questionIds = res.body.questions.map((q: any) => q.questionId);
      expect(questionIds).not.toContain('clarity-draft-hidden-01');
    });
  });

  // =========================================================================
  // 3. LEARNER JOURNEY: ATTEMPT START & PERSISTENCE
  // =========================================================================
  describe('3. Learner Journey: Start Attempt & Deduplication', () => {
    it('creates a new question assignment on attempt start', async () => {
      const learner = await prisma.user.create({
        data: {
          id: 'learner-start-01',
          email: 'learner-start-01@example.com',
          name: 'Journey Student',
          passwordHash: 'dummy',
          role: 'learner',
          aiimsCredits: 500,
        },
      });

      const req = createMockReq(learner, { questionId: 'clarity-und-01' });
      const res = createMockRes();

      await startClarityAttempt(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.assignmentId).toBeTruthy();
      expect(res.body.isLocked).toBe(false);
      expect(res.body.isFirstAttemptFree).toBe(true);
      expect(res.body.submissionCost).toBe(0);

      // Verify assignment persisted in PostgreSQL
      const persisted = await prisma.questionAssignment.findUnique({
        where: { assignmentId: res.body.assignmentId },
      });
      expect(persisted).toBeTruthy();
      expect(persisted?.status).toBe('ASSIGNED');
    });

    it('returns the existing assignment on reload without creating duplicates', async () => {
      const learner = await prisma.user.create({
        data: {
          id: 'learner-start-02',
          email: 'learner-start-02@example.com',
          name: 'Reload Student',
          passwordHash: 'dummy',
          role: 'learner',
        },
      });

      const req1 = createMockReq(learner, { questionId: 'clarity-wf-01' });
      const res1 = createMockRes();
      await startClarityAttempt(req1, res1);

      const req2 = createMockReq(learner, { questionId: 'clarity-wf-01' });
      const res2 = createMockRes();
      await startClarityAttempt(req2, res2);

      expect(res1.body.assignmentId).toBe(res2.body.assignmentId);

      const totalAssignments = await prisma.questionAssignment.count({
        where: { learnerId: learner.id, questionId: 'clarity-wf-01' },
      });
      expect(totalAssignments).toBe(1);
    });

    it('rejects attempt start on unapproved question with HTTP 403', async () => {
      await prisma.questionBank.create({
        data: {
          questionId: 'clarity-und-unapproved',
          topic: 'Understanding',
          level: 'Medium',
          title: 'Unapproved Task',
          promptText: 'Draft task',
          testScenario: 'Scenario',
          status: 'DRAFT',
          version: 1,
        },
      });

      const learner = await prisma.user.create({
        data: {
          id: 'learner-start-unapp',
          email: 'learner-unapp@example.com',
          name: 'Test Student',
          passwordHash: 'dummy',
          role: 'learner',
        },
      });

      const req = createMockReq(learner, { questionId: 'clarity-und-unapproved' });
      const res = createMockRes();

      await startClarityAttempt(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('QUESTION_NOT_PUBLISHED');
    });
  });

  // =========================================================================
  // 4. CREDIT ECONOMY: FIRST FREE ATTEMPT, 10 AC CHARGE, OVERDRAFT PROTECTION
  // =========================================================================
  describe('4. Credit Economy: Pricing, Atomic Deductions & Overdraft', () => {
    it('first submission in a learning level is FREE (0 AC deduction)', async () => {
      const learner = await prisma.user.create({
        data: {
          id: 'learner-credit-free',
          email: 'learner-credit-free@example.com',
          name: 'Free Attempt Student',
          passwordHash: 'dummy',
          role: 'learner',
          aiimsCredits: 500,
          xpPoints: 100,
        },
      });

      // Start attempt on Understanding question
      const startReq = createMockReq(learner, { questionId: 'clarity-und-01' });
      const startRes = createMockRes();
      await startClarityAttempt(startReq, startRes);
      const assignmentId = startRes.body.assignmentId;

      // Submit attempt
      const submitReq = createMockReq(learner, {
        assignmentId,
        answer:
          'Provide a structured prompt with temperature 0.0 and explicit constraint verification.',
      });
      const submitRes = createMockRes();
      await submitClarityTask(submitReq, submitRes);

      expect(submitRes.statusCode).toBe(200);
      expect(submitRes.body.success).toBe(true);
      expect(submitRes.body.creditsDeducted).toBe(0);
      expect(submitRes.body.isFirstAttemptFree).toBe(true);

      // Verify balance in PostgreSQL remains 500 AC
      const balance = await creditsLedgerService.getBalance(learner.id);
      expect(balance).toBe(500);

      // Verify XP awarded
      expect(submitRes.body.xpAwarded).toBe(50);
      expect(submitRes.body.currentXP).toBe(150);
    });

    it('subsequent submission in that learning level deducts exactly 10 AC atomically', async () => {
      const learner = await prisma.user.create({
        data: {
          id: 'learner-credit-paid',
          email: 'learner-credit-paid@example.com',
          name: 'Paid Attempt Student',
          passwordHash: 'dummy',
          role: 'learner',
          aiimsCredits: 500,
          xpPoints: 100,
        },
      });

      // 1. Complete First attempt in Understanding (Free: 0 AC)
      const start1 = createMockRes();
      await startClarityAttempt(createMockReq(learner, { questionId: 'clarity-und-01' }), start1);
      const sub1 = createMockRes();
      await submitClarityTask(
        createMockReq(learner, {
          assignmentId: start1.body.assignmentId,
          answer: 'First free attempt prompt response with clear verification steps.',
        }),
        sub1
      );
      expect(sub1.body.creditsDeducted).toBe(0);

      // 2. Start Second attempt in Understanding (Paid: 10 AC)
      const start2 = createMockRes();
      await startClarityAttempt(createMockReq(learner, { questionId: 'clarity-und-02' }), start2);
      expect(start2.body.isFirstAttemptFree).toBe(false);
      expect(start2.body.submissionCost).toBe(10);

      const sub2 = createMockRes();
      await submitClarityTask(
        createMockReq(learner, {
          assignmentId: start2.body.assignmentId,
          answer: 'Second paid attempt prompt with structured markdown tables and edge checks.',
        }),
        sub2
      );

      expect(sub2.statusCode).toBe(200);
      expect(sub2.body.creditsDeducted).toBe(10);
      expect(sub2.body.isFirstAttemptFree).toBe(false);

      // Balance must decrease by exactly 10 AC: 500 - 10 = 490 AC
      const finalBalance = await creditsLedgerService.getBalance(learner.id);
      expect(finalBalance).toBe(490);

      // Verify financial ledger record in PostgreSQL
      const ledgerEntry = await prisma.creditLedger.findFirst({
        where: {
          userId: learner.id,
          type: 'SPEND',
          category: 'TASK_USAGE',
          amount: 10,
        },
      });
      expect(ledgerEntry).toBeTruthy();
      expect(ledgerEntry?.balanceBefore).toBe(500);
      expect(ledgerEntry?.balanceAfter).toBe(490);
    });

    it('rejects submission with HTTP 402 INSUFFICIENT_CREDITS when balance < 10 AC on paid attempt', async () => {
      const learner = await prisma.user.create({
        data: {
          id: 'learner-credit-broke',
          email: 'learner-broke@example.com',
          name: 'Low Balance Student',
          passwordHash: 'dummy',
          role: 'learner',
          aiimsCredits: 5, // Only 5 AC (< 10 AC)
          xpPoints: 100,
        },
      });

      // Simulate prior attempt so this attempt is NOT free
      await prisma.questionAttempt.create({
        data: {
          attemptId: 'att-prior-01',
          assignmentId: 'asg-prior-01',
          learnerId: learner.id,
          questionId: 'clarity-und-01',
          topic: 'Understanding',
          level: 'Easy',
          submittedAnswer: 'Previous answer',
          score: 80,
        },
      });

      // Start attempt on second question
      const startRes = createMockRes();
      await startClarityAttempt(createMockReq(learner, { questionId: 'clarity-und-02' }), startRes);

      // Attempt to submit
      const submitRes = createMockRes();
      await submitClarityTask(
        createMockReq(learner, {
          assignmentId: startRes.body.assignmentId,
          answer: 'Attempting to submit with insufficient credit balance.',
        }),
        submitRes
      );

      expect(submitRes.statusCode).toBe(402);
      expect(submitRes.body.code).toBe('INSUFFICIENT_CREDITS');
      expect(submitRes.body.requiredCredits).toBe(10);
      expect(submitRes.body.currentBalance).toBe(5);

      // Balance must remain strictly unchanged at 5 AC
      const balance = await creditsLedgerService.getBalance(learner.id);
      expect(balance).toBe(5);
    });

    it('input validation error (HTTP 400) precedes credit deduction with zero balance change', async () => {
      const learner = await prisma.user.create({
        data: {
          id: 'learner-val-400',
          email: 'learner-val@example.com',
          name: 'Validation Student',
          passwordHash: 'dummy',
          role: 'learner',
          aiimsCredits: 500,
        },
      });

      // Simulate prior attempt so next attempt would be paid
      await prisma.questionAttempt.create({
        data: {
          attemptId: 'att-val-prior',
          assignmentId: 'asg-val-prior',
          learnerId: learner.id,
          questionId: 'clarity-wf-01',
          topic: 'Workflow',
          level: 'Easy',
          submittedAnswer: 'Prior answer',
          score: 80,
        },
      });

      const startRes = createMockRes();
      await startClarityAttempt(createMockReq(learner, { questionId: 'clarity-wf-02' }), startRes);

      // Submit invalid empty answer
      const submitRes = createMockRes();
      await submitClarityTask(
        createMockReq(learner, {
          assignmentId: startRes.body.assignmentId,
          answer: '', // Empty answer violates schema
        }),
        submitRes
      );

      expect(submitRes.statusCode).toBe(400);

      // Balance must remain strictly unchanged at 500 AC
      const balance = await creditsLedgerService.getBalance(learner.id);
      expect(balance).toBe(500);
    });
  });

  // =========================================================================
  // 5. AUTOMATIC REFUND ON AI PROVIDER FAILURE
  // =========================================================================
  describe('5. Automatic Refund on AI Evaluation Failure', () => {
    it('automatically refunds 10 AC when AI rubric evaluation throws an error after charge', async () => {
      const learner = await prisma.user.create({
        data: {
          id: 'learner-refund-01',
          email: 'learner-refund@example.com',
          name: 'Refund Student',
          passwordHash: 'dummy',
          role: 'learner',
          aiimsCredits: 500,
          xpPoints: 100,
        },
      });

      // Simulate prior attempt so this attempt is charged 10 AC
      await prisma.questionAttempt.create({
        data: {
          attemptId: 'att-prior-refund',
          assignmentId: 'asg-prior-refund',
          learnerId: learner.id,
          questionId: 'clarity-agt-01',
          topic: 'AI Agents',
          level: 'Easy',
          submittedAnswer: 'Previous answer',
          score: 85,
        },
      });

      const startRes = createMockRes();
      await startClarityAttempt(createMockReq(learner, { questionId: 'clarity-agt-02' }), startRes);

      // Inject deliberate AI provider failure
      rubricEvaluatorService.setAICompletionRunner(async () => {
        throw new Error('Claude API network timeout or rate limit error');
      });

      const submitRes = createMockRes();
      await submitClarityTask(
        createMockReq(learner, {
          assignmentId: startRes.body.assignmentId,
          answer: 'Autonomous agent design with goal decomposition and tool loop.',
        }),
        submitRes
      );

      expect(submitRes.statusCode).toBe(502);
      expect(submitRes.body.refunded).toBe(true);
      expect(submitRes.body.refundAmount).toBe(10);

      // Balance must be restored to original 500 AC
      const finalBalance = await creditsLedgerService.getBalance(learner.id);
      expect(finalBalance).toBe(500);

      // Check refund transaction exists in credit_ledger
      const refundLedger = await prisma.creditLedger.findFirst({
        where: {
          userId: learner.id,
          type: 'REFUND',
          category: 'REFUND',
          amount: 10,
        },
      });
      expect(refundLedger).toBeTruthy();
      expect(refundLedger?.reason).toContain('Automatic Refund');

      // Task remains unlocked so learner can retry
      const assignment = await prisma.questionAssignment.findUnique({
        where: { assignmentId: startRes.body.assignmentId },
      });
      expect(assignment?.status).not.toBe('SUBMITTED');
    });
  });

  // =========================================================================
  // 6. IDEMPOTENCY, TASK LOCKING & SECURITY
  // =========================================================================
  describe('6. Idempotency, Task Locking & RBAC', () => {
    it('locks task upon submission and rejects duplicate submission with HTTP 409 TASK_LOCKED', async () => {
      const learner = await prisma.user.create({
        data: {
          id: 'learner-lock-01',
          email: 'learner-lock@example.com',
          name: 'Lock Student',
          passwordHash: 'dummy',
          role: 'learner',
          aiimsCredits: 500,
          xpPoints: 100,
        },
      });

      const startRes = createMockRes();
      await startClarityAttempt(createMockReq(learner, { questionId: 'clarity-und-03' }), startRes);
      const assignmentId = startRes.body.assignmentId;

      // 1. First submission succeeds
      const sub1 = createMockRes();
      await submitClarityTask(
        createMockReq(learner, {
          assignmentId,
          answer: 'First submission with constraint checks and verification rubric.',
        }),
        sub1
      );
      expect(sub1.statusCode).toBe(200);
      expect(sub1.body.isLocked).toBe(true);

      // 2. Duplicate submission on locked assignment fails with HTTP 409
      const sub2 = createMockRes();
      await submitClarityTask(
        createMockReq(learner, {
          assignmentId,
          answer: 'Duplicate re-submission attempt.',
        }),
        sub2
      );

      expect(sub2.statusCode).toBe(409);
      expect(sub2.body.code).toBe('TASK_LOCKED');
      expect(sub2.body.isLocked).toBe(true);

      // Verify exactly one attempt record exists in PostgreSQL
      const attemptsCount = await prisma.questionAttempt.count({
        where: { assignmentId },
      });
      expect(attemptsCount).toBe(1);
    });

    it('prevents IDOR: learner cannot submit an assignment belonging to another learner', async () => {
      const learnerA = await prisma.user.create({
        data: {
          id: 'learner-idor-a',
          email: 'learner-a@example.com',
          name: 'Learner A',
          passwordHash: 'dummy',
          role: 'learner',
        },
      });
      const learnerB = await prisma.user.create({
        data: {
          id: 'learner-idor-b',
          email: 'learner-b@example.com',
          name: 'Learner B',
          passwordHash: 'dummy',
          role: 'learner',
        },
      });

      // Learner A starts assignment
      const startRes = createMockRes();
      await startClarityAttempt(
        createMockReq(learnerA, { questionId: 'clarity-und-04' }),
        startRes
      );
      const assignmentId = startRes.body.assignmentId;

      // Learner B attempts to submit Learner A's assignment
      const submitRes = createMockRes();
      await submitClarityTask(
        createMockReq(learnerB, {
          assignmentId,
          answer: 'Illicit attempt to submit another user assignment.',
        }),
        submitRes
      );

      expect(submitRes.statusCode).toBe(404);
    });
  });

  // =========================================================================
  // 7. PROGRESS TRACKING & ATTEMPT HISTORY
  // =========================================================================
  describe('7. Progress Tracking & Attempt History', () => {
    it('accurately tracks attempts and progress across all 3 levels', async () => {
      const learner = await prisma.user.create({
        data: {
          id: 'learner-prog-01',
          email: 'learner-prog@example.com',
          name: 'Progress Student',
          passwordHash: 'dummy',
          role: 'learner',
          aiimsCredits: 500,
          xpPoints: 100,
        },
      });

      // Complete 1 question in Understanding
      const s1 = createMockRes();
      await startClarityAttempt(createMockReq(learner, { questionId: 'clarity-und-01' }), s1);
      await submitClarityTask(
        createMockReq(learner, {
          assignmentId: s1.body.assignmentId,
          answer: 'Completed understanding question 1.',
        }),
        createMockRes()
      );

      // Complete 1 question in Workflow
      const s2 = createMockRes();
      await startClarityAttempt(createMockReq(learner, { questionId: 'clarity-wf-01' }), s2);
      await submitClarityTask(
        createMockReq(learner, {
          assignmentId: s2.body.assignmentId,
          answer: 'Completed workflow question 1.',
        }),
        createMockRes()
      );

      // Fetch progress
      const progRes = createMockRes();
      await getClarityProgress(createMockReq(learner), progRes);

      expect(progRes.statusCode).toBe(200);
      expect(progRes.body.success).toBe(true);
      expect(progRes.body.totalCompleted).toBe(2);
      expect(progRes.body.totalQuestions).toBe(30);
      expect(progRes.body.levels.understanding.completed).toBe(1);
      expect(progRes.body.levels.workflow.completed).toBe(1);
      expect(progRes.body.levels.aiAgents.completed).toBe(0);

      // Fetch history
      const histRes = createMockRes();
      await getClarityHistory(createMockReq(learner), histRes);

      expect(histRes.statusCode).toBe(200);
      expect(histRes.body.count).toBe(2);
      expect(histRes.body.history[0].score).toBeGreaterThanOrEqual(80);
      expect(histRes.body.history[0].rubricFeedback).toHaveLength(3);
    });
  });

  // =========================================================================
  // 8. ADMIN QUESTION REVIEW & WORKFLOW
  // =========================================================================
  describe('8. Administrative Review & Publication Workflow', () => {
    it('blocks non-admin users from administrative clarity endpoints with HTTP 403', async () => {
      const regularStudent = await prisma.user.create({
        data: {
          id: 'student-no-admin',
          email: 'student-no-admin@example.com',
          name: 'Non Admin Student',
          passwordHash: 'dummy',
          role: 'learner',
        },
      });

      const resList = createMockRes();
      await adminListClarityQuestions(createMockReq(regularStudent), resList);
      expect(resList.statusCode).toBe(403);

      const resCreate = createMockRes();
      await adminCreateClarityQuestion(
        createMockReq(regularStudent, {
          title: 'Hacked Question',
          topic: 'Understanding',
          level: 'Easy',
          promptText: 'Some prompt text',
          testScenario: 'Some test scenario',
          expectedCriteria: ['Criterion 1'],
          scoringRubric: [{ criterion: 'Test', maxScore: 100, description: 'Test' }],
        }),
        resCreate
      );
      expect(resCreate.statusCode).toBe(403);

      const resStats = createMockRes();
      await adminGetClarityStats(createMockReq(regularStudent), resStats);
      expect(resStats.statusCode).toBe(403);
    });

    it('allows administrator to create a draft question, approve it, and view updated stats', async () => {
      const admin = await prisma.user.create({
        data: {
          id: 'admin-super-01',
          email: 'admin-super@example.com',
          name: 'Admin Reviewer',
          passwordHash: 'dummy',
          role: 'admin',
        },
      });

      // 1. Admin creates a new DRAFT question
      const createRes = createMockRes();
      await adminCreateClarityQuestion(
        createMockReq(admin, {
          topic: 'Understanding',
          level: 'Easy',
          title: 'Customer Feedback Sentiment Audit',
          promptText: 'Analyze user sentiment scores against official customer metrics.',
          hint: 'Pay attention to neutrality thresholds.',
          testScenario: 'Review customer response for factual sentiment consistency.',
          expectedCriteria: ['Identifies sentiment polarity', 'Flags edge cases'],
          scoringRubric: [
            { criterion: 'Polarity Check', maxScore: 50, description: 'Correct polarity' },
            { criterion: 'Edge Flagging', maxScore: 50, description: 'Flags ambiguity' },
          ],
          status: 'DRAFT',
          reviewNotes: 'Pending secondary reviewer signoff',
        }),
        createRes
      );

      expect(createRes.statusCode).toBe(201);
      expect(createRes.body.success).toBe(true);
      const newQId = createRes.body.question.questionId;
      expect(createRes.body.question.status).toBe('DRAFT');

      // 2. Admin reviews and approves the question
      const approveRes = createMockRes();
      await adminUpdateClarityQuestionStatus(
        createMockReq(
          admin,
          { status: 'APPROVED', note: 'Reviewed and certified for live learners' },
          {},
          { id: newQId }
        ),
        approveRes
      );

      expect(approveRes.statusCode).toBe(200);
      expect(approveRes.body.question.status).toBe('APPROVED');

      // 3. Admin stats endpoint reflects the approval
      const statsRes = createMockRes();
      await adminGetClarityStats(createMockReq(admin), statsRes);

      expect(statsRes.statusCode).toBe(200);
      expect(statsRes.body.stats.Understanding.approved).toBe(11); // 10 seeded + 1 approved
    });
  });
});
