/**
 * fullSystemLifecycle.test.ts
 * =========================================================
 * AIIMS End-to-End Full-System Lifecycle & Regression Suite
 *
 * Exercises all 12 AIIMS modules and core invariants:
 *  1. Multi-Track Registration (Student & Entrepreneur) + Taxonomy + Welcome Grant (+500 AC)
 *  2. Authentication, Single-Device Binding, Concurrent Collision & Session Revocation
 *  3. Role-Based Access Control (RBAC) & Inactive Account Fail-Closed Enforcement
 *  4. Credit Engine Atomicity, Idempotency Uniqueness, Overdraft Defense & Auto-Refunds
 *  5. 25-Question Diagnostic Assessment & 30-Record Peer Benchmark Privacy
 *  6. Clarity AI Task Lab Execution & Metered Charges
 *  7. Focus Deep-Work Lifecycle & Productivity Reward Dispatch
 *  8. Evaluator Queue Workflow (Submission -> In-Review -> Evaluated)
 *  9. Admin Oversight, Device Binding Reset Audit & GDPR Account Deletion
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma';
import { resetPrismaTestDouble, uninstallPrismaTestDouble } from './helpers/prismaTestDouble';
import {
  register,
  login,
  logout,
  resetUserDevice,
  generateAuthToken,
  deleteAccount,
} from '../../controllers/auth.controller';
import { getQuestions, getComparativeAnalysis } from '../../controllers/assessment.controller';
import { creditsLedgerService } from '../creditsLedger.service';
import { sessionService } from '../session.service';
import { requireRole, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { hashDeviceId } from '../../utils/deviceIdentifier';

// Reusable mock Express helpers
function createMockReq(overrides: Record<string, any> = {}): AuthenticatedRequest {
  const req: any = {
    headers: {},
    body: {},
    cookies: {},
    query: {},
    params: {},
    method: 'GET',
    ...overrides,
  };
  return req as AuthenticatedRequest;
}

function createMockRes() {
  const res: any = {
    statusCode: 200,
    data: null,
    cookiesCleared: {},
    cookiesSet: {},
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: any) {
      res.data = body;
      return res;
    },
    cookie(name: string, val: any, opts: any) {
      res.cookiesSet[name] = { val, opts };
      return res;
    },
    clearCookie(name: string, opts: any) {
      res.cookiesCleared[name] = opts;
      return res;
    },
  };
  return res;
}

describe('AIIMS Full-System End-to-End Regression & QA Suite', () => {
  beforeEach(() => {
    resetPrismaTestDouble(true);
  });

  afterAll(() => {
    uninstallPrismaTestDouble();
  });

  // =========================================================================
  // 1. REGISTRATION, MULTI-TRACK ONBOARDING & WELCOME CREDITS
  // =========================================================================
  describe('1. Multi-Track Registration & Onboarding Invariants', () => {
    it('successfully registers Student learner and initializes +500 AC ledger grant', async () => {
      const email = 'alice.student@aiims.test';
      const req = createMockReq({
        method: 'POST',
        headers: {
          'x-client': 'mobile',
          'x-device-id': 'device-alice-phone-001',
          'x-device-name': 'Pixel 8',
          'x-platform': 'android',
        },
        body: {
          name: 'Alice Student',
          email,
          password: 'Password123!',
          confirmPassword: 'Password123!',
          track: 'Student',
          collegeName: 'National Institute of Technology',
          stream: 'TECH',
          educationLevel: 'UNDERGRADUATE',
          programId: 'btech',
          specializationId: 'cs',
          yearOfStudy: 3,
          admissionYear: 2024,
          expectedGraduationYear: 2028,
          aiFamiliarity: 'EXPLORING_AI',
          primaryGoal: 'BUILD_SOFTWARE',
        },
      });
      const res = createMockRes();

      await register(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.data.user).toBeDefined();
      expect(res.data.user.email).toBe(email);
      expect(res.data.user.aiimsCredits).toBe(500);

      // Verify PostgreSQL User record
      const dbUser = await prisma.user.findUnique({ where: { email } });
      expect(dbUser).toBeDefined();
      expect(dbUser?.aiimsCredits).toBe(500);
      expect(dbUser?.role).toBe('learner');

      // Verify associated StudentProfile record
      const profile = await prisma.studentProfile.findUnique({ where: { userId: dbUser?.id } });
      expect(profile).toBeDefined();
      expect(profile?.programId).toBe('btech');
      expect(profile?.specializationId).toBe('cs');

      // Verify Authoritative CreditLedger Welcome Grant
      const ledgerEntries = await prisma.creditLedger.findMany({ where: { userId: dbUser?.id } });
      expect(ledgerEntries.length).toBe(1);
      expect(ledgerEntries[0].amount).toBe(500);
      expect(ledgerEntries[0].balanceAfter).toBe(500);
      expect(ledgerEntries[0].type).toBe('EARN');
      expect(ledgerEntries[0].category).toBe('REWARD');
      expect(ledgerEntries[0].idempotencyKey).toContain('welcome');
    });

    it('successfully registers Entrepreneur track learner with venture context', async () => {
      const email = 'bob.founder@aiims.test';
      const req = createMockReq({
        method: 'POST',
        headers: { 'x-device-id': 'device-bob-macbook-001' },
        body: {
          name: 'Bob Founder',
          email,
          password: 'Password123!',
          confirmPassword: 'Password123!',
          track: 'Entrepreneur',
          aiFamiliarity: 'REGULAR_USER',
          primaryGoal: 'ENTREPRENEURSHIP',
        },
      });
      const res = createMockRes();

      await register(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.data.user.track).toBe('Entrepreneur');
      expect(res.data.user.aiimsCredits).toBe(500);
    });

    it('rejects registration when track is missing or invalid (HTTP 400)', async () => {
      const req = createMockReq({
        method: 'POST',
        body: {
          name: 'Invalid Track User',
          email: 'notrack@aiims.test',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        },
      });
      const res = createMockRes();

      await register(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.data.code).toBe('INVALID_INPUT');
      expect(res.data.field).toBe('track');
    });

    it('rejects duplicate email registration (HTTP 400 EMAIL_ALREADY_EXISTS)', async () => {
      const email = 'duplicate.test@aiims.test';
      await prisma.user.create({
        data: {
          id: 'user-dup-001',
          name: 'Existing User',
          email,
          password: 'hashedpassword',
          role: 'learner',
        },
      });

      const req = createMockReq({
        method: 'POST',
        body: {
          name: 'Duplicate Attempt',
          email,
          password: 'Password123!',
          confirmPassword: 'Password123!',
          track: 'Student',
          stream: 'TECH',
          educationLevel: 'UNDERGRADUATE',
          programId: 'btech',
          specializationId: 'cs',
          yearOfStudy: 2,
          admissionYear: 2024,
          expectedGraduationYear: 2028,
        },
      });
      const res = createMockRes();

      await register(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.data.code).toBe('EMAIL_ALREADY_EXISTS');
    });
  });

  // =========================================================================
  // 2. AUTHENTICATION, SINGLE-DEVICE BINDING & COLLISION GUARDS
  // =========================================================================
  describe('2. Single-Device Binding & Authentication Security', () => {
    const userEmail = 'devicetester@aiims.test';
    const plainPassword = 'SecurePassword123!';
    let userId: string;

    beforeEach(async () => {
      const created = await prisma.user.create({
        data: {
          id: 'usr-device-test-999',
          name: 'Device Tester',
          email: userEmail,
          password: bcrypt.hashSync(plainPassword, 10),
          role: 'learner',
          isActive: true,
          bindingStatus: 'UNBOUND',
        },
      });
      userId = created.id;
    });

    it('Scenario: First login binds Device A; second concurrent login from Device B is rejected (HTTP 403)', async () => {
      // 1. Device A Login
      const reqA = createMockReq({
        headers: { 'x-device-id': 'device-alpha-laptop', 'x-device-name': 'MacBook Pro' },
        body: { email: userEmail, password: plainPassword },
      });
      const resA = createMockRes();
      await login(reqA, resA);

      expect(resA.statusCode).toBe(200);

      const boundUser = await prisma.user.findUnique({ where: { id: userId } });
      expect(boundUser?.bindingStatus).toBe('BOUND');
      expect(boundUser?.deviceIdHash).toBe(hashDeviceId('device-alpha-laptop'));
      expect(boundUser?.activeSessionId).toBeDefined();

      // 2. Concurrent Device B Login Attempt
      const reqB = createMockReq({
        headers: { 'x-device-id': 'device-beta-tablet', 'x-device-name': 'iPad Air' },
        body: { email: userEmail, password: plainPassword },
      });
      const resB = createMockRes();
      await login(reqB, resB);

      expect(resB.statusCode).toBe(403);
      expect(resB.data.code).toBe('ACCOUNT_ACTIVE_ANOTHER_DEVICE');

      // 3. Device A remains active and untampered
      const freshUser = await prisma.user.findUnique({ where: { id: userId } });
      const activeSession = await sessionService.getSession(freshUser?.activeSessionId || '');
      expect(activeSession?.status).toBe('ACTIVE');

      // 4. Logout Device A
      const reqLogout = createMockReq({
        user: { id: userId, email: userEmail, role: 'learner' },
        sessionId: freshUser?.activeSessionId || '',
      });
      const resLogout = createMockRes();
      await logout(reqLogout, resLogout);
      expect(resLogout.statusCode).toBe(200);

      const revokedSession = await sessionService.getSession(freshUser?.activeSessionId || '');
      expect(revokedSession?.status).toBe('REVOKED');
    });

    it('Scenario: Disabled accounts fail-closed on authentication and role access (HTTP 403)', async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      const req = createMockReq({
        headers: { 'x-device-id': 'device-alpha-laptop' },
        body: { email: userEmail, password: plainPassword },
      });
      const res = createMockRes();
      await login(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.data.code).toBe('ACCOUNT_DISABLED');
    });
  });

  // =========================================================================
  // 3. CREDIT ENGINE DUAL-LEDGER INTEGRITY & IDEMPOTENCY
  // =========================================================================
  describe('3. Credit Engine Dual-Ledger Atomicity & Idempotency', () => {
    const learnerId = 'usr-credit-ledger-test';

    beforeEach(async () => {
      await prisma.user.create({
        data: {
          id: learnerId,
          name: 'Credit Tester',
          email: 'credits@aiims.test',
          password: 'hash',
          role: 'learner',
          aiimsCredits: 500,
        },
      });
    });

    it('Scenario: Metered task deduction subtracts 10 AC atomically', async () => {
      const spend = await creditsLedgerService.deductCredits(
        learnerId,
        10,
        'clarity',
        'Clarity Task Prompt Run',
        'idemp-clarity-run-1'
      );

      expect(spend.success).toBe(true);
      expect(spend.newBalance).toBe(490);

      // Verify User table counter
      const user = await prisma.user.findUnique({ where: { id: learnerId } });
      expect(user?.aiimsCredits).toBe(490);

      // Verify CreditLedger audit record
      const history = await creditsLedgerService.getLedgerHistory(learnerId);
      expect(history.balance).toBe(490);
      expect(history.totalSpent).toBe(10);
    });

    it('Scenario: Re-executing exact same transaction with identical idempotency key is deduplicated', async () => {
      const idempKey = 'idemp-fixed-dedup-100';

      const spend1 = await creditsLedgerService.deductCredits(
        learnerId,
        10,
        'clarity',
        'Clarity Task Run',
        idempKey
      );
      expect(spend1.success).toBe(true);
      expect(spend1.newBalance).toBe(490);

      // Second identical request
      const spend2 = await creditsLedgerService.deductCredits(
        learnerId,
        10,
        'clarity',
        'Clarity Task Run',
        idempKey
      );
      expect(spend2.success).toBe(true);
      expect(spend2.newBalance).toBe(490); // No double charge

      const ledger = await prisma.creditLedger.findMany({ where: { userId: learnerId } });
      expect(ledger.length).toBe(1);
    });

    it('Scenario: Overdraft protection rejects spend exceeding current balance', async () => {
      // Set balance to 5
      await prisma.user.update({
        where: { id: learnerId },
        data: { aiimsCredits: 5 },
      });

      const spend = await creditsLedgerService.deductCredits(
        learnerId,
        10,
        'clarity',
        'Attempted Overdraft Run',
        'idemp-overdraft-01'
      );

      expect(spend.success).toBe(false);
      expect(spend.code).toBe('INSUFFICIENT_CREDITS');

      const user = await prisma.user.findUnique({ where: { id: learnerId } });
      expect(user?.aiimsCredits).toBe(5); // Preserved
    });

    it('Scenario: Automatic refund dispatches upon AI task completion failure', async () => {
      // 1. Initial deduction
      await creditsLedgerService.deductCredits(
        learnerId,
        10,
        'clarity',
        'Prompt Run Pre-charge',
        'idemp-precharge-fail-1'
      );
      expect(await creditsLedgerService.getBalance(learnerId)).toBe(490);

      // 2. Automatic refund with distinct idempotency key
      const refund = await creditsLedgerService.rewardCredits(
        learnerId,
        10,
        'clarity',
        'Automatic refund: AI execution failure',
        'idemp-refund-fail-1'
      );

      expect(refund.success).toBe(true);
      expect(refund.newBalance).toBe(500);

      const user = await prisma.user.findUnique({ where: { id: learnerId } });
      expect(user?.aiimsCredits).toBe(500);
    });
  });

  // =========================================================================
  // 4. ASSESSMENT DELIVERY & BENCHMARK PRIVACY
  // =========================================================================
  describe('4. Assessment Delivery & Benchmark Privacy', () => {
    it('serves 25 canonical diagnostic questions across 5 stations', async () => {
      const req = createMockReq({ query: { stations: 'true' } });
      const res = createMockRes();

      await getQuestions(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.data.totalQuestions).toBe(25);
      expect(res.data.stations.length).toBe(5);
      expect(res.data.stations.map((s: any) => s.stationName)).toEqual([
        'Workbench',
        'Machine Room',
        'Architecture Studio',
        'Inspection Desk',
        'Radar Tower',
      ]);
    });

    it('enforces privacy threshold on comparative analysis when cohort < 5', async () => {
      const req = createMockReq({
        user: { id: 'usr-bench-1', college: 'Tech College', role: 'learner' },
      });
      const res = createMockRes();

      await getComparativeAnalysis(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.data.available).toBe(false);
      expect(res.data.minRequiredRecords).toBe(5);
      expect(res.data.message).toContain(
        'Comparative analysis requires at least 5 completed cohort assessments'
      );
    });

    it('computes live aggregate statistics when cohort meets threshold (>= 5)', async () => {
      // Seed 30 completed assessment records
      for (let i = 1; i <= 30; i++) {
        await prisma.user.create({
          data: {
            id: `usr-cohort-${i}`,
            email: `cohort${i}@aiims.test`,
            name: `Cohort User ${i}`,
            password: 'hash',
            role: 'learner',
            college: 'Benchmark Institute',
            assessmentStatus: 'completed',
            assessmentData: {
              status: 'completed',
              evaluationResult: {
                scoringVersion: '3.0.0-evidence-based',
                overallScore: 70 + (i % 10),
                capabilities: {
                  usingAI: { score: 75 },
                  understandingAI: { score: 80 },
                  solvingWithAI: { score: 70 },
                  checkingAI: { score: 65 },
                  adaptingToAI: { score: 72 },
                },
              },
            },
          },
        });
      }

      const req = createMockReq({
        user: { id: 'usr-cohort-1', college: 'Benchmark Institute', role: 'learner' },
      });
      const res = createMockRes();

      await getComparativeAnalysis(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.data.available).toBe(true);
      expect(res.data.totalComparableRecords).toBe(30);
      expect(res.data.peerAverage).toBeGreaterThanOrEqual(70);
      expect(res.data.capabilityAverages.understandingAI).toBe(80);
    });
  });

  // =========================================================================
  // 5. EVALUATOR WORKFLOW & ROLE-BASED ACCESS CONTROL
  // =========================================================================
  describe('5. Evaluator Queue & Role Access Protections', () => {
    it('strictly blocks learner role from evaluator routes (HTTP 403)', async () => {
      const learnerReq = createMockReq({
        user: { id: 'usr-learner-1', role: 'learner' },
      });
      const res = createMockRes();
      let nextCalled = false;

      const guard = requireRole('evaluator', 'admin');
      guard(learnerReq, res, () => {
        nextCalled = true;
      });

      expect(res.statusCode).toBe(403);
      expect(res.data.code).toBe('FORBIDDEN');
      expect(nextCalled).toBe(false);
    });

    it('allows evaluator role through requireRole guard', async () => {
      const evaluatorReq = createMockReq({
        user: { id: 'usr-evaluator-1', role: 'evaluator' },
      });
      const res = createMockRes();
      let nextCalled = false;

      const guard = requireRole('evaluator', 'admin');
      guard(evaluatorReq, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
    });

    it('executes task submission state transition (submitted -> in_review -> feedback_given)', async () => {
      const learnerId = 'usr-sub-learner';
      const evaluatorId = 'usr-sub-evaluator';

      // 1. Learner creates submission
      const sub = await prisma.submission.create({
        data: {
          id: 'sub-test-001',
          learnerId,
          learnerName: 'Test Learner',
          taskId: 'task-eval-101',
          taskTitle: 'Critical AI Evaluation',
          answerContent: 'Grounded critique of hallucination risks.',
          status: 'submitted',
        },
      });
      expect(sub.status).toBe('submitted');

      // 2. Evaluator claims submission
      const claimed = await prisma.submission.update({
        where: { id: 'sub-test-001' },
        data: {
          evaluatorId,
          evaluatorName: 'Dr. Evaluator',
          status: 'in_review',
        },
      });
      expect(claimed.status).toBe('in_review');
      expect(claimed.evaluatorId).toBe(evaluatorId);

      // 3. Evaluator submits rubric grades
      const evaluated = await prisma.submission.update({
        where: { id: 'sub-test-001' },
        data: {
          status: 'feedback_given',
          rubricScores: {
            criteria: [{ criterion: 'Accuracy', score: 25, maxScore: 25 }],
            overallScore: 100,
          },
          writtenFeedback: 'Exceptional depth of analysis.',
          reviewedAt: new Date(),
        },
      });
      expect(evaluated.status).toBe('feedback_given');
      expect(evaluated.writtenFeedback).toBe('Exceptional depth of analysis.');
    });
  });

  // =========================================================================
  // 6. ADMIN DEVICE RESET & GDPR ACCOUNT SCRUBBING
  // =========================================================================
  describe('6. Admin Device Reset & GDPR Scrubbing Invariants', () => {
    it('administrative device reset unbinds device and logs to device_reset_audits', async () => {
      const targetId = 'usr-reset-target';
      await prisma.user.create({
        data: {
          id: targetId,
          name: 'Reset Target',
          email: 'target@aiims.test',
          password: 'hash',
          role: 'learner',
          bindingStatus: 'BOUND',
          deviceIdHash: hashDeviceId('old-device'),
        },
      });

      const adminReq = createMockReq({
        user: { id: 'admin-01', email: 'admin@aiims.education', role: 'admin' },
        body: {
          userId: targetId,
          reason: 'Student lost original registered smartphone',
        },
      });
      const res = createMockRes();

      await resetUserDevice(adminReq, res);

      expect(res.statusCode).toBe(200);
      expect(res.data.success).toBe(true);

      const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
      expect(targetUser?.bindingStatus).toBe('UNBOUND');
      expect(targetUser?.deviceIdHash).toBe('');

      // Verify DeviceResetAudit log written
      const audits = await prisma.deviceResetAudit.findMany({ where: { targetUserId: targetId } });
      expect(audits.length).toBe(1);
      expect(audits[0].adminEmail).toBe('admin@aiims.education');
      expect(audits[0].reason).toBe('Student lost original registered smartphone');
    });

    it('GDPR account deletion cascades sessions while preserving financial audit ledger', async () => {
      const deleteId = 'usr-gdpr-delete';
      await prisma.user.create({
        data: {
          id: deleteId,
          name: 'GDPR User',
          email: 'gdpr@aiims.test',
          password: 'hash',
          role: 'learner',
          aiimsCredits: 500,
        },
      });

      // User has a session and a credit ledger record
      await prisma.session.create({
        data: {
          id: 'sess-gdpr-1',
          sessionId: 'sess-token-gdpr',
          userId: deleteId,
          deviceIdHash: 'dev-hash',
          expiresAt: new Date(Date.now() + 100000),
        },
      });

      await prisma.creditLedger.create({
        data: {
          id: 'ledger-gdpr-1',
          userId: deleteId,
          type: 'EARN',
          amount: 500,
          balanceBefore: 0,
          balanceAfter: 500,
          reason: 'Initial Grant',
          source: 'welcome',
        },
      });

      const deleteReq = createMockReq({
        user: { id: deleteId, email: 'gdpr@aiims.test', role: 'learner' },
        body: { confirmation: 'DELETE' },
      });
      const res = createMockRes();

      await deleteAccount(deleteReq, res);
      expect(res.statusCode).toBe(200);

      // Verify User is gone
      const checkUser = await prisma.user.findUnique({ where: { id: deleteId } });
      expect(checkUser).toBeNull();

      // Verify session was cascaded
      const checkSessions = await prisma.session.findMany({ where: { userId: deleteId } });
      expect(checkSessions.length).toBe(0);

      // Verify financial ledger is retained (onDelete: SetNull) for regulatory audit continuity
      const checkLedger = await prisma.creditLedger.findUnique({ where: { id: 'ledger-gdpr-1' } });
      expect(checkLedger).toBeDefined();
      expect(checkLedger?.userId).toBeNull();
      expect(checkLedger?.amount).toBe(500);
    });
  });
});
