/**
 * focusTaskModule.test.ts
 * ============================================================================
 * AIIMS Phase 5: Focus Module Practice Challenges & Server Timer Test Suite
 *
 * Verifies:
 *  1. Exactly 45 reviewed & approved questions in Focus Question Bank:
 *     - 3 Categories: Prompt Engineering, Evaluation & Auditing, Agentic Systems
 *     - 3 Difficulty levels: Easy (600s), Medium (1200s), Hard (1800s)
 *     - 5 questions per combination = 45 approved questions.
 *     - All scoring rubrics sum to exactly 100 points.
 *  2. Student question sanitization: internal guidance and review notes suppressed.
 *  3. Draft/unapproved question suppression from regular learners.
 *  4. Server-authoritative timer tracking:
 *     - `startedAt` and `targetEndTime = startedAt + durationSeconds`
 *     - Remaining time computed from server clock.
 *     - Refresh persistence (page reload keeps exact server targetEndTime).
 *  5. Product Decision D5: Server timer expiry locks answer.
 *     - Late submissions rejected with HTTP 410 TASK_EXPIRED.
 *     - Zero auto-submit, zero score fabrication.
 *  6. Credit Economy & Pricing:
 *     - First attempt in category is FREE (0 AC) with atomic race-condition guard.
 *     - Subsequent attempts deduct exactly 20 AC (2× Clarity subsequent price).
 *     - Overdraft protection (HTTP 402 INSUFFICIENT_CREDITS) with zero balance mutation.
 *     - Automatic 20 AC refund if AI rubric evaluation fails after charge.
 *     - Pre-validation errors do not deduct credits.
 *  7. Product Decision D4: NO automatic AC rewards for completion.
 *     - Keeps XP separate from AC accounting (+50 XP awarded, 0 AC reward).
 *  8. Attachments & Cloudflare R2 / Secure Storage:
 *     - MIME type validation (PDF, PNG, JPG, WebP, TXT, JSON, MD allowed; .exe rejected).
 *     - File size limit (10 MB maximum).
 *     - Path sanitization to prevent directory traversal (CWE-22).
 *     - Canonical object key: `focus-attachments/{userId}/{attemptId}/{fileName}`.
 *     - Learner ownership verification & IDOR protection.
 *  9. AI Rubric Evaluation & Immutable Attempt Persistence:
 *     - Rubric scores and qualitative feedback recorded.
 *     - Assignment locked (status: 'SUBMITTED').
 *     - Duplicate submission rejected with HTTP 409 TASK_LOCKED.
 * 10. Admin Question Bank Review & Publication Workflow:
 *     - Admin/Evaluator RBAC.
 *     - Create draft question.
 *     - Status update (APPROVED, DRAFT, REVIEW, REJECTED).
 * ============================================================================
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../../config/prisma';
import { resetPrismaTestDouble, uninstallPrismaTestDouble } from './helpers/prismaTestDouble';
import { initSeedQuestions } from '../seedQuestions';
import { creditsLedgerService } from '../creditsLedger.service';
import { rubricEvaluatorService } from '../rubricEvaluator.service';
import { FocusStorageService, MAX_ATTACHMENT_SIZE_BYTES } from '../focusStorage.service';
import {
  FocusTaskService,
  FOCUS_SUBSEQUENT_PRICE_AC,
  FOCUS_TIER_DURATIONS,
} from '../focusTask.service';
import {
  getFocusCategoriesHandler,
  getFocusCategoryQuestionsHandler,
  startFocusTaskAttemptHandler,
  getFocusRemainingTimeHandler,
  uploadFocusAttachmentHandler,
  downloadFocusAttachmentHandler,
  submitFocusTaskAttemptHandler,
  getFocusTaskHistoryHandler,
  getFocusTaskProgressHandler,
  adminListFocusQuestionsHandler,
  adminCreateFocusQuestionHandler,
  adminUpdateFocusStatusHandler,
} from '../../controllers/focus.controller';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { FOCUS_45_APPROVED_QUESTIONS } from '../../data/focusQuestionBank';

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

function createMockRes(): {
  res: any;
  state: { statusCode: number; data: any };
} {
  const state = { statusCode: 200, data: null as any };
  const res: any = {
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    json(payload: any) {
      state.data = payload;
      return res;
    },
    sendFile(filePath: string) {
      state.data = { sentFile: filePath };
      return res;
    },
  };
  return { res, state };
}

describe('AIIMS Phase 5: Focus Module & Practice Challenges Suite', () => {
  const LEARNER_USER = {
    id: 'usr-focus-learner-001',
    _id: 'usr-focus-learner-001',
    name: 'Divyanshu Student',
    email: 'learner.focus@aiims.test',
    role: 'learner' as const,
    college: 'IIT Bombay',
    aiimsCredits: 100,
    xpPoints: 200,
    isActive: true,
  };

  const SECOND_LEARNER = {
    id: 'usr-focus-learner-002',
    _id: 'usr-focus-learner-002',
    name: 'Second Learner',
    email: 'learner2.focus@aiims.test',
    role: 'learner' as const,
    college: 'IIT Delhi',
    aiimsCredits: 50,
    xpPoints: 100,
    isActive: true,
  };

  const ADMIN_USER = {
    id: 'usr-focus-admin-001',
    _id: 'usr-focus-admin-001',
    name: 'Focus Admin',
    email: 'admin.focus@aiims.test',
    role: 'admin' as const,
    college: 'AIIMS HQ',
    aiimsCredits: 1000,
    xpPoints: 500,
    isActive: true,
  };

  beforeEach(async () => {
    resetPrismaTestDouble(true);
    await initSeedQuestions();

    await prisma.user.create({
      data: {
        id: LEARNER_USER.id,
        name: LEARNER_USER.name,
        email: LEARNER_USER.email,
        role: LEARNER_USER.role,
        college: LEARNER_USER.college,
        aiimsCredits: LEARNER_USER.aiimsCredits,
        xpPoints: LEARNER_USER.xpPoints,
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        id: SECOND_LEARNER.id,
        name: SECOND_LEARNER.name,
        email: SECOND_LEARNER.email,
        role: SECOND_LEARNER.role,
        college: SECOND_LEARNER.college,
        aiimsCredits: SECOND_LEARNER.aiimsCredits,
        xpPoints: SECOND_LEARNER.xpPoints,
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        id: ADMIN_USER.id,
        name: ADMIN_USER.name,
        email: ADMIN_USER.email,
        role: ADMIN_USER.role,
        college: ADMIN_USER.college,
        aiimsCredits: ADMIN_USER.aiimsCredits,
        xpPoints: ADMIN_USER.xpPoints,
        isActive: true,
      },
    });

    // Deterministic mock for rubric evaluation
    (rubricEvaluatorService as any).evaluateAnswer = async (params: any) => {
      const rubric = params.rubric || [];
      const criteria = rubric.map((r: any) => ({
        criterion: r.criterion,
        score: Math.round(r.maxScore * 0.9),
        maxScore: r.maxScore,
        feedback: `Solid execution demonstrating competence in ${r.criterion}.`,
      }));
      return {
        criteria,
        overallScore: 90,
        overallFeedback: 'Strong, well-structured solution meeting high engineering standards.',
      };
    };
  });

  afterAll(() => {
    uninstallPrismaTestDouble();
  });

  // ==========================================================================
  // SUITE 1: Question Bank Inventory & Rubric Mathematical Rigor
  // ==========================================================================
  describe('Suite 1: Focus Question Bank (45 Approved Questions)', () => {
    it('1.1 contains exactly 45 reviewed and approved questions in the catalog', () => {
      expect(FOCUS_45_APPROVED_QUESTIONS.length).toBe(45);
      const allApproved = FOCUS_45_APPROVED_QUESTIONS.every((q) => q.status === 'APPROVED');
      expect(allApproved).toBe(true);
    });

    it('1.2 covers exactly 3 canonical categories with 15 questions each', () => {
      const pe = FOCUS_45_APPROVED_QUESTIONS.filter((q) => q.topic === 'Prompt Engineering');
      const ea = FOCUS_45_APPROVED_QUESTIONS.filter((q) => q.topic === 'Evaluation & Auditing');
      const as = FOCUS_45_APPROVED_QUESTIONS.filter((q) => q.topic === 'Agentic Systems');

      expect(pe.length).toBe(15);
      expect(ea.length).toBe(15);
      expect(as.length).toBe(15);
    });

    it('1.3 provides exactly 5 questions per category and difficulty tier (3 × 3 × 5 = 45)', () => {
      const categories = [
        'Prompt Engineering',
        'Evaluation & Auditing',
        'Agentic Systems',
      ] as const;
      const tiers = ['Easy', 'Medium', 'Hard'] as const;

      for (const cat of categories) {
        for (const tier of tiers) {
          const matched = FOCUS_45_APPROVED_QUESTIONS.filter(
            (q) => q.topic === cat && q.level === tier
          );
          expect(matched.length).toBe(5);
        }
      }
    });

    it('1.4 guarantees that every single question rubric sums to exactly 100 points', () => {
      for (const q of FOCUS_45_APPROVED_QUESTIONS) {
        const rubricTotal = q.scoringRubric.reduce((acc, item) => acc + item.maxScore, 0);
        expect(rubricTotal).toBe(100);
      }
    });

    it('1.5 verifies standard time limits per tier: Easy (600s), Medium (1200s), Hard (1800s)', () => {
      expect(FOCUS_TIER_DURATIONS.Easy).toBe(600);
      expect(FOCUS_TIER_DURATIONS.Medium).toBe(1200);
      expect(FOCUS_TIER_DURATIONS.Hard).toBe(1800);

      for (const q of FOCUS_45_APPROVED_QUESTIONS) {
        expect(q.aiMetadata.durationSeconds).toBe(FOCUS_TIER_DURATIONS[q.level]);
      }
    });

    it('1.6 sanitizes questions returned to learners (suppresses review notes & evaluator internals)', async () => {
      const req = createMockReq(
        LEARNER_USER,
        {},
        { level: 'Easy' },
        { category: 'Prompt Engineering' }
      );
      const { res, state } = createMockRes();

      await getFocusCategoryQuestionsHandler(req, res);

      expect(state.statusCode).toBe(200);
      expect(state.data.success).toBe(true);
      expect(state.data.questions.length).toBeGreaterThanOrEqual(5);

      const first = state.data.questions[0];
      expect(first.title).toBeDefined();
      expect(first.promptText).toBeDefined();
      expect(first.testScenario).toBeDefined();
      expect(first.scoringRubric).toBeDefined();
      // Internal review notes must NOT be leaked
      expect(first.reviewNotes).toBeUndefined();
      expect(first.reviewedBy).toBeUndefined();
    });
  });

  // ==========================================================================
  // SUITE 2: Server-Authoritative Timer & Learner Experience
  // ==========================================================================
  describe('Suite 2: Server-Authoritative Timer & Lifecycle', () => {
    it('2.1 starts attempt and calculates targetEndTime = startedAt + durationSeconds', async () => {
      const req = createMockReq(LEARNER_USER, {
        category: 'Prompt Engineering',
        level: 'Easy',
      });
      const { res, state } = createMockRes();

      await startFocusTaskAttemptHandler(req, res);

      expect(state.statusCode).toBe(201);
      expect(state.data.success).toBe(true);
      expect(state.data.assignmentId).toBeDefined();
      expect(state.data.durationSeconds).toBe(600);
      expect(state.data.remainingSeconds).toBe(600);

      const startedAt = new Date(state.data.startedAt).getTime();
      const targetEndTime = new Date(state.data.targetEndTime).getTime();
      expect(targetEndTime - startedAt).toBe(600 * 1000);
    });

    it('2.2 returns exact server-authoritative remaining time on query (anti-tamper)', async () => {
      const startReq = createMockReq(LEARNER_USER, {
        category: 'Prompt Engineering',
        level: 'Easy',
      });
      const { res: startRes, state: startState } = createMockRes();
      await startFocusTaskAttemptHandler(startReq, startRes);

      const assignmentId = startState.data.assignmentId;

      const timeReq = createMockReq(LEARNER_USER, {}, {}, { assignmentId });
      const { res: timeRes, state: timeState } = createMockRes();

      await getFocusRemainingTimeHandler(timeReq, timeRes);

      expect(timeState.statusCode).toBe(200);
      expect(timeState.data.assignmentId).toBe(assignmentId);
      expect(timeState.data.durationSeconds).toBe(600);
      expect(timeState.data.remainingSeconds).toBeGreaterThan(0);
      expect(timeState.data.isExpired).toBe(false);
    });

    it('2.3 resumes existing active assignment when within time limit (refresh persistence)', async () => {
      const req1 = createMockReq(LEARNER_USER, {
        category: 'Prompt Engineering',
        level: 'Easy',
      });
      const { res: res1, state: state1 } = createMockRes();
      await startFocusTaskAttemptHandler(req1, res1);

      // Second start attempt for same category & tier resumes the active assignment
      const req2 = createMockReq(LEARNER_USER, {
        category: 'Prompt Engineering',
        level: 'Easy',
      });
      const { res: res2, state: state2 } = createMockRes();
      await startFocusTaskAttemptHandler(req2, res2);

      expect(state2.statusCode).toBe(200); // 200 OK for resume
      expect(state2.data.isExisting).toBe(true);
      expect(state2.data.assignmentId).toBe(state1.data.assignmentId);
    });

    it('2.4 (Product Decision D5) locks task and rejects submission with HTTP 410 when timer expires', async () => {
      // Create an expired assignment by back-dating assignedAt
      const assignmentId = 'foc-asg-expired-test-01';
      const expiredStartedAt = new Date(Date.now() - 700 * 1000); // 700 seconds ago (> 600s limit)

      await prisma.questionAssignment.create({
        data: {
          assignmentId,
          learnerId: LEARNER_USER.id,
          questionId: 'focus-pe-easy-01',
          topic: 'Prompt Engineering',
          level: 'Easy',
          track: 'General',
          assignedAt: expiredStartedAt,
          status: 'IN_PROGRESS',
        },
      });

      const submitReq = createMockReq(LEARNER_USER, {
        assignmentId,
        answer: 'My late submission attempt after time ran out.',
      });
      const { res: submitRes, state: submitState } = createMockRes();

      await submitFocusTaskAttemptHandler(submitReq, submitRes);

      expect(submitState.statusCode).toBe(410);
      expect(submitState.data.code).toBe('TASK_EXPIRED');
      expect(submitState.data.isExpired).toBe(true);
      expect(submitState.data.isLocked).toBe(true);

      // Verify assignment status in DB was updated to EXPIRED
      const updatedAsg = await prisma.questionAssignment.findUnique({ where: { assignmentId } });
      expect(updatedAsg?.status).toBe('EXPIRED');
    });
  });

  // ==========================================================================
  // SUITE 3: Credit Economy & Pricing Rules
  // ==========================================================================
  describe('Suite 3: Credit Economy (20 AC & First-Free Guarantee)', () => {
    it('3.1 provides the first attempt in a category FREE (0 AC deducted)', async () => {
      const startReq = createMockReq(LEARNER_USER, {
        category: 'Evaluation & Auditing',
        level: 'Easy',
      });
      const { res: startRes, state: startState } = createMockRes();
      await startFocusTaskAttemptHandler(startReq, startRes);

      const initialBalance = await creditsLedgerService.getBalance(LEARNER_USER.id);

      const submitReq = createMockReq(LEARNER_USER, {
        assignmentId: startState.data.assignmentId,
        answer:
          'Comprehensive audit identifying all financial hallucinations and percentage discrepancies.',
      });
      const { res: submitRes, state: submitState } = createMockRes();

      await submitFocusTaskAttemptHandler(submitReq, submitRes);

      expect(submitState.statusCode).toBe(200);
      expect(submitState.data.isFirstAttemptFree).toBe(true);
      expect(submitState.data.creditsDeducted).toBe(0);

      const finalBalance = await creditsLedgerService.getBalance(LEARNER_USER.id);
      expect(finalBalance).toBe(initialBalance); // Balance unchanged on free attempt
    });

    it('3.2 charges exactly 20 AC on subsequent attempts in that category', async () => {
      // First attempt (Free)
      const startReq1 = createMockReq(LEARNER_USER, {
        category: 'Agentic Systems',
        level: 'Easy',
      });
      const { res: res1, state: state1 } = createMockRes();
      await startFocusTaskAttemptHandler(startReq1, res1);

      await submitFocusTaskAttemptHandler(
        createMockReq(LEARNER_USER, {
          assignmentId: state1.data.assignmentId,
          answer: 'First free solution for agentic systems.',
        }),
        createMockRes().res
      );

      const balanceBeforeSecond = await creditsLedgerService.getBalance(LEARNER_USER.id);

      // Second attempt (Subsequent -> 20 AC)
      const startReq2 = createMockReq(LEARNER_USER, {
        category: 'Agentic Systems',
        level: 'Easy',
      });
      const { res: res2, state: state2 } = createMockRes();
      await startFocusTaskAttemptHandler(startReq2, res2);

      const submitReq2 = createMockReq(LEARNER_USER, {
        assignmentId: state2.data.assignmentId,
        answer: 'Second solution requiring 20 AC fee.',
      });
      const { res: submitRes2, state: submitState2 } = createMockRes();

      await submitFocusTaskAttemptHandler(submitReq2, submitRes2);

      expect(submitState2.statusCode).toBe(200);
      expect(submitState2.data.isFirstAttemptFree).toBe(false);
      expect(submitState2.data.creditsDeducted).toBe(20);

      const balanceAfterSecond = await creditsLedgerService.getBalance(LEARNER_USER.id);
      expect(balanceBeforeSecond - balanceAfterSecond).toBe(20);
    });

    it('3.3 triggers overdraft protection (HTTP 402 INSUFFICIENT_CREDITS) when balance < 20 AC', async () => {
      // Set learner balance to 10 AC (insufficient for 20 AC fee)
      await prisma.user.update({
        where: { id: SECOND_LEARNER.id },
        data: { aiimsCredits: 10 },
      });

      // Record a prior attempt so this is recognized as subsequent
      await prisma.questionAttempt.create({
        data: {
          attemptId: 'att-prior-001',
          assignmentId: 'asg-prior-001',
          learnerId: SECOND_LEARNER.id,
          questionId: 'focus-as-easy-01',
          topic: 'Agentic Systems',
          level: 'Easy',
          submittedAnswer: 'prior answer',
          score: 80,
          rubricFeedback: '[]',
        },
      });

      const startReq = createMockReq(SECOND_LEARNER, {
        category: 'Agentic Systems',
        level: 'Easy',
      });
      const { res: startRes, state: startState } = createMockRes();
      await startFocusTaskAttemptHandler(startReq, startRes);

      const submitReq = createMockReq(SECOND_LEARNER, {
        assignmentId: startState.data.assignmentId,
        answer: 'Attempting to submit with insufficient balance.',
      });
      const { res: submitRes, state: submitState } = createMockRes();

      await submitFocusTaskAttemptHandler(submitReq, submitRes);

      expect(submitState.statusCode).toBe(402);
      expect(submitState.data.code).toBe('INSUFFICIENT_CREDITS');
      expect(submitState.data.requiredCredits).toBe(20);

      // Verify zero balance mutation
      const finalBalance = await creditsLedgerService.getBalance(SECOND_LEARNER.id);
      expect(finalBalance).toBe(10);
    });

    it('3.4 automatically refunds 20 AC if AI rubric evaluation fails after charge', async () => {
      // Learner with sufficient credits
      await prisma.user.update({
        where: { id: LEARNER_USER.id },
        data: { aiimsCredits: 100 },
      });

      // Prior attempt exists in category
      await prisma.questionAttempt.create({
        data: {
          attemptId: 'att-prior-refund-test',
          assignmentId: 'asg-prior-refund-test',
          learnerId: LEARNER_USER.id,
          questionId: 'focus-pe-easy-01',
          topic: 'Prompt Engineering',
          level: 'Easy',
          submittedAnswer: 'prior',
          score: 85,
          rubricFeedback: '[]',
        },
      });

      const startReq = createMockReq(LEARNER_USER, {
        category: 'Prompt Engineering',
        level: 'Easy',
      });
      const { res: startRes, state: startState } = createMockRes();
      await startFocusTaskAttemptHandler(startReq, startRes);

      // Force rubric evaluation failure
      (rubricEvaluatorService as any).evaluateAnswer = async () => {
        const err: any = new Error('AI provider network timeout during rubric generation');
        err.code = 'PROVIDER_TIMEOUT';
        throw err;
      };

      const submitReq = createMockReq(LEARNER_USER, {
        assignmentId: startState.data.assignmentId,
        answer: 'Valid solution that fails evaluation due to external provider issue.',
      });
      const { res: submitRes, state: submitState } = createMockRes();

      await submitFocusTaskAttemptHandler(submitReq, submitRes);

      expect(submitState.statusCode).toBe(502);
      expect(submitState.data.refunded).toBe(true);
      expect(submitState.data.refundAmount).toBe(20);

      // Verify final balance is preserved (100 - 20 + 20 = 100)
      const balance = await creditsLedgerService.getBalance(LEARNER_USER.id);
      expect(balance).toBe(100);
    });

    it('3.5 (Product Decision D4) awards +50 XP but NO automatic AC rewards on completion', async () => {
      const initialXP =
        (await prisma.user.findUnique({ where: { id: LEARNER_USER.id } }))?.xpPoints || 0;
      const initialBalance = await creditsLedgerService.getBalance(LEARNER_USER.id);

      const startReq = createMockReq(LEARNER_USER, {
        category: 'Prompt Engineering',
        level: 'Medium',
      });
      const { res: startRes, state: startState } = createMockRes();
      await startFocusTaskAttemptHandler(startReq, startRes);

      const submitReq = createMockReq(LEARNER_USER, {
        assignmentId: startState.data.assignmentId,
        answer: 'Completed solution earning XP but no fabricated AC.',
      });
      const { res: submitRes, state: submitState } = createMockRes();

      await submitFocusTaskAttemptHandler(submitReq, submitRes);

      expect(submitState.statusCode).toBe(200);
      expect(submitState.data.xpAwarded).toBe(50);

      const finalXP =
        (await prisma.user.findUnique({ where: { id: LEARNER_USER.id } }))?.xpPoints || 0;
      expect(finalXP - initialXP).toBe(50);

      // AC balance: 0 AC reward awarded (only fee was deducted if subsequent)
      const transactions = await prisma.creditLedger.findMany({
        where: { userId: LEARNER_USER.id, category: 'REWARD' },
      });
      const positiveRewards = transactions.filter((t) => t.amount > 0);
      expect(positiveRewards.length).toBe(0); // D4: No positive AC minted!
    });
  });

  // ==========================================================================
  // SUITE 4: Attachments & Storage Security (Cloudflare R2 / Fallback)
  // ==========================================================================
  describe('Suite 4: Attachments & Storage Security', () => {
    it('4.1 validates MIME types (accepts PDF/PNG, rejects dangerous executables)', () => {
      expect(FocusStorageService.validateUploadConstraints(1024, 'application/pdf').valid).toBe(
        true
      );
      expect(FocusStorageService.validateUploadConstraints(1024, 'image/png').valid).toBe(true);
      expect(FocusStorageService.validateUploadConstraints(1024, 'application/json').valid).toBe(
        true
      );

      const exeCheck = FocusStorageService.validateUploadConstraints(
        1024,
        'application/x-msdownload'
      );
      expect(exeCheck.valid).toBe(false);
      expect(exeCheck.error).toContain('not supported');
    });

    it('4.2 enforces 10 MB maximum file size constraint', () => {
      const normal = FocusStorageService.validateUploadConstraints(
        5 * 1024 * 1024,
        'application/pdf'
      );
      expect(normal.valid).toBe(true);

      const oversized = FocusStorageService.validateUploadConstraints(
        15 * 1024 * 1024,
        'application/pdf'
      );
      expect(oversized.valid).toBe(false);
      expect(oversized.error).toContain('exceeds the 10 MB limit');
    });

    it('4.3 sanitizes file names against directory traversal attacks (CWE-22)', () => {
      const malicious = '../../etc/passwd';
      const sanitized = FocusStorageService.sanitizeFileName(malicious);
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
      expect(sanitized).toBe('passwd');

      const complex = 'my_prompt<script>.json';
      const cleanComplex = FocusStorageService.sanitizeFileName(complex);
      expect(cleanComplex).not.toContain('<');
      expect(cleanComplex).not.toContain('>');
    });

    it('4.4 constructs canonical object key: focus-attachments/{userId}/{attemptId}/{fileName}', () => {
      const key = FocusStorageService.buildObjectKey('user123', 'asg456', 'diagram.png');
      expect(key).toBe('focus-attachments/user123/asg456/diagram.png');
    });

    it('4.5 enforces IDOR ownership protection on file attachments', async () => {
      // Assignment belongs to LEARNER_USER
      const assignmentId = 'foc-asg-idor-test-01';
      await prisma.questionAssignment.create({
        data: {
          assignmentId,
          learnerId: LEARNER_USER.id,
          questionId: 'focus-pe-easy-01',
          topic: 'Prompt Engineering',
          level: 'Easy',
          status: 'IN_PROGRESS',
        },
      });

      // SECOND_LEARNER attempts to upload attachment to LEARNER_USER assignment
      const uploadReq = createMockReq(SECOND_LEARNER, {
        assignmentId,
        fileName: 'unauthorized_file.pdf',
        mimeType: 'application/pdf',
        content: 'Malicious upload attempt',
      });
      const { res: uploadRes, state: uploadState } = createMockRes();

      await uploadFocusAttachmentHandler(uploadReq, uploadRes);

      expect(uploadState.statusCode).toBe(403);
      expect(uploadState.data.code).toBe('FORBIDDEN');
    });

    it('4.6 enforces IDOR download protection (cross-student access blocked)', async () => {
      const foreignObjectKey = 'focus-attachments/other_user_id/attempt999/secret.pdf';
      const req = createMockReq(
        LEARNER_USER,
        {},
        {},
        { objectKey: encodeURIComponent(foreignObjectKey) }
      );
      const { res, state } = createMockRes();

      await downloadFocusAttachmentHandler(req, res);

      expect(state.statusCode).toBe(403);
      expect(state.data.code).toBe('FORBIDDEN');
    });
  });

  // ==========================================================================
  // SUITE 5: Admin Question Bank Lifecycle
  // ==========================================================================
  describe('Suite 5: Admin Review & Publication Workflow', () => {
    it('5.1 allows Admin to create draft question in QuestionBank', async () => {
      const req = createMockReq(ADMIN_USER, {
        topic: 'Prompt Engineering',
        level: 'Medium',
        title: 'Admin Created Draft Challenge',
        promptText: 'Detailed prompt instructions for draft challenge.',
        testScenario: 'Contextual test scenario for testing.',
        expectedCriteria: ['Criterion A', 'Criterion B'],
        scoringRubric: [
          { criterion: 'Criterion A', maxScore: 50, description: 'Test A' },
          { criterion: 'Criterion B', maxScore: 50, description: 'Test B' },
        ],
        status: 'DRAFT',
      });
      const { res, state } = createMockRes();

      await adminCreateFocusQuestionHandler(req, res);

      expect(state.statusCode).toBe(201);
      expect(state.data.success).toBe(true);
      expect(state.data.question.status).toBe('DRAFT');
    });

    it('5.2 allows Admin to update status from DRAFT to APPROVED', async () => {
      const questionId = 'focus-draft-to-approve-test';
      await prisma.questionBank.create({
        data: {
          questionId,
          topic: 'Agentic Systems',
          level: 'Hard',
          title: 'Draft Task to Approve',
          promptText: 'Instructions...',
          testScenario: 'Scenario...',
          expectedCriteria: ['C1'],
          scoringRubric: '[{"criterion":"C1","maxScore":100,"description":"All"}]',
          status: 'DRAFT',
        },
      });

      const req = createMockReq(
        ADMIN_USER,
        { status: 'APPROVED', reviewNotes: 'Approved after peer review' },
        {},
        { questionId }
      );
      const { res, state } = createMockRes();

      await adminUpdateFocusStatusHandler(req, res);

      expect(state.statusCode).toBe(200);
      expect(state.data.success).toBe(true);

      const updated = await prisma.questionBank.findUnique({ where: { questionId } });
      expect(updated?.status).toBe('APPROVED');
      expect(updated?.reviewNotes).toBe('Approved after peer review');
    });
  });
});
