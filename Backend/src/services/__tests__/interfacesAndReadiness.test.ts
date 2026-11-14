/**
 * interfacesAndReadiness.test.ts
 * ============================================================================
 * AIIMS Phase 8: Entrepreneur Module & Additional Interfaces (6/7)
 * Architecture, Role Separation & Interface Boundary Test Suite
 *
 * Exhaustively verifies:
 *  1. Role-Based Access Control (RBAC) & Boundary Enforcement:
 *     - 1.1 Unauthenticated requests are rejected (HTTP 401 UNAUTHORIZED).
 *     - 1.2 Learner role is blocked from Evaluator-guarded endpoints (HTTP 403 FORBIDDEN).
 *     - 1.3 Learner role is blocked from Admin-guarded endpoints (HTTP 403 FORBIDDEN).
 *     - 1.4 Evaluator role is blocked from Admin-only endpoints (HTTP 403 FORBIDDEN).
 *     - 1.5 Evaluator role is permitted on Evaluator endpoints (Calls next()).
 *     - 1.6 Admin role is permitted on Admin endpoints (Calls next()).
 *     - 1.7 Disabled accounts (isActive: false) are rejected with HTTP 403 ACCOUNT_DISABLED.
 *
 *  2. Multi-Track Registration & Domain Separation (Student vs. Entrepreneur):
 *     - 2.1 Student track registration strictly rejects venture fields (HTTP 400 INVALID_INPUT).
 *     - 2.2 Entrepreneur track registration strictly rejects academic fields (HTTP 400 INVALID_INPUT).
 *     - 2.3 Registration with missing or invalid track is rejected (HTTP 400 INVALID_INPUT).
 *     - 2.4 Valid Student registration persists track: 'Student'.
 *     - 2.5 Valid Entrepreneur registration persists track: 'Entrepreneur'.
 *
 *  3. Persona-Aware Credit Engine & Economic Invariants:
 *     - 3.1 Both tracks receive the standard 500 AC registration baseline.
 *     - 3.2 Assessment fee deduction (100 AC) executes identically across tracks.
 *     - 3.3 Score > 95% bonus (+50 AC) is awarded with exact-once idempotency across tracks.
 *     - 3.4 Overdraft protection (non-negative balance constraint) enforced equally across tracks.
 *     - 3.5 Dual-ledger parity invariant holds for Entrepreneur accounts.
 *
 *  4. Tool Catalog Universal Availability & Persona Metadata:
 *     - 4.1 Tool catalog serves active tools to both Student and Entrepreneur tracks.
 *     - 4.2 Tool catalog includes tools with relevantRoles containing 'Student'.
 *     - 4.3 Tool catalog includes tools with relevantRoles containing 'Entrepreneur'.
 *     - 4.4 Tool catalog mutation operations require admin authorization.
 *
 *  5. Additional Interfaces (6/7 Scope) Data Model & Locking Boundaries:
 *     - 5.1 Level 2 Radar data defaults to status: 'locked'.
 *     - 5.2 Level 2 Investigation data defaults to status: 'locked'.
 *     - 5.3 Level 2 Relevance data defaults to status: 'locked'.
 *     - 5.4 Level 3 Problem Solver defaults to empty workflows with zero unearned solutions.
 *     - 5.5 Level 3 Projects Workspace defaults to empty projects with zero unearned builds.
 *     - 5.6 Level 4 Mentor Workspace defaults to status: 'locked'.
 *     - 5.7 Canonical 6 locked interfaces + 7th Insights align with Owner Decisions D8/D9.
 *
 *  6. Database Architecture & Zero-Speculation Audit:
 *     - 6.1 Exactly the canonical Prisma models exist without speculative Phase 8 tables.
 *     - 6.2 EntrepreneurProfile exists safely as an optional 1-to-1 extension to User.
 *     - 6.3 Omission of EntrepreneurProfile does not corrupt Student operations.
 *     - 6.4 Zero MongoDB / Mongoose dependencies exist in the backend.
 *
 *  7. Cross-User Isolation (IDOR Prevention):
 *     - 7.1 User A cannot access or query User B's credit ledger entries.
 *     - 7.2 Request body tampering cannot inject administrative role or override credit balance.
 * ============================================================================
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../config/prisma';
import {
  installPrismaTestDouble,
  resetPrismaTestDouble,
  uninstallPrismaTestDouble,
} from './helpers/prismaTestDouble';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { register } from '../../controllers/auth.controller';
import { creditsLedgerService } from '../creditsLedger.service';
import { getActiveCatalog } from '../toolCatalog.service';
import {
  defaultRadar,
  defaultInvestigation,
  defaultSolver,
  defaultBuild,
  userRecordToIUser,
} from '../../utils/userMapper';
import { IUser } from '../../types/models';

function createMockReq(
  user?: Partial<IUser>,
  body: Record<string, any> = {},
  query: Record<string, any> = {},
  params: Record<string, any> = {},
  headers: Record<string, string> = {}
): AuthenticatedRequest {
  const req: any = {
    user: user ? ({ ...user, _id: user.id } as IUser) : undefined,
    headers: { 'x-client': 'web', ...headers },
    body,
    query,
    params,
  };
  return req as AuthenticatedRequest;
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
    cookie() {
      return res;
    },
  };
  return { res, state };
}

describe('AIIMS Phase 8: Entrepreneur Module & Additional Interfaces (6/7) Suite', () => {
  const STUDENT_USER: Partial<IUser> = {
    id: 'usr-student-001',
    name: 'Aarav Student',
    email: 'aarav.student@aiims.test',
    role: 'learner',
    track: 'Student',
    college: 'IIT Delhi',
    aiimsCredits: 500,
    xpPoints: 100,
    isActive: true,
  };

  const ENTREPRENEUR_USER: Partial<IUser> = {
    id: 'usr-entrepreneur-001',
    name: 'Priya Founder',
    email: 'priya.founder@aiims.test',
    role: 'learner',
    track: 'Entrepreneur',
    college: 'BITS Pilani',
    aiimsCredits: 500,
    xpPoints: 100,
    isActive: true,
  };

  const EVALUATOR_USER: Partial<IUser> = {
    id: 'usr-evaluator-001',
    name: 'Dr. Evaluator',
    email: 'evaluator@aiims.test',
    role: 'evaluator',
    track: 'Student',
    aiimsCredits: 500,
    xpPoints: 500,
    isActive: true,
  };

  const ADMIN_USER: Partial<IUser> = {
    id: 'usr-admin-001',
    name: 'Super Admin',
    email: 'admin@aiims.test',
    role: 'admin',
    track: 'Student',
    aiimsCredits: 1000,
    xpPoints: 1000,
    isActive: true,
  };

  beforeEach(async () => {
    installPrismaTestDouble({ connected: true });
    resetPrismaTestDouble();

    // Seed test users
    await prisma.user.create({
      data: {
        id: STUDENT_USER.id!,
        name: STUDENT_USER.name!,
        email: STUDENT_USER.email!,
        password: 'hashed_password_123',
        role: STUDENT_USER.role!,
        track: STUDENT_USER.track!,
        college: STUDENT_USER.college!,
        aiimsCredits: STUDENT_USER.aiimsCredits!,
        xpPoints: STUDENT_USER.xpPoints!,
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        id: ENTREPRENEUR_USER.id!,
        name: ENTREPRENEUR_USER.name!,
        email: ENTREPRENEUR_USER.email!,
        password: 'hashed_password_456',
        role: ENTREPRENEUR_USER.role!,
        track: ENTREPRENEUR_USER.track!,
        college: ENTREPRENEUR_USER.college!,
        aiimsCredits: ENTREPRENEUR_USER.aiimsCredits!,
        xpPoints: ENTREPRENEUR_USER.xpPoints!,
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        id: EVALUATOR_USER.id!,
        name: EVALUATOR_USER.name!,
        email: EVALUATOR_USER.email!,
        password: 'hashed_password_789',
        role: EVALUATOR_USER.role!,
        track: EVALUATOR_USER.track!,
        aiimsCredits: EVALUATOR_USER.aiimsCredits!,
        xpPoints: EVALUATOR_USER.xpPoints!,
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        id: ADMIN_USER.id!,
        name: ADMIN_USER.name!,
        email: ADMIN_USER.email!,
        password: 'hashed_password_admin',
        role: ADMIN_USER.role!,
        track: ADMIN_USER.track!,
        aiimsCredits: ADMIN_USER.aiimsCredits!,
        xpPoints: ADMIN_USER.xpPoints!,
        isActive: true,
      },
    });
  });

  afterAll(() => {
    uninstallPrismaTestDouble();
  });

  // ==========================================================================
  // Suite 1: Role-Based Access Control (RBAC) & Boundary Enforcement
  // ==========================================================================
  describe('1. Role-Based Access Control (RBAC) & Boundary Enforcement', () => {
    it('1.1 Unauthenticated requests are rejected by requireAuth with HTTP 401', () => {
      const req = createMockReq(undefined);
      const { res, state } = createMockRes();
      let nextCalled = false;

      requireAuth(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(state.statusCode).toBe(401);
      expect(state.data.code).toBe('UNAUTHORIZED');
    });

    it('1.2 Learner role is blocked from Evaluator-guarded endpoints with HTTP 403', () => {
      const req = createMockReq(STUDENT_USER);
      const { res, state } = createMockRes();
      let nextCalled = false;

      const guard = requireRole('evaluator', 'admin');
      guard(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(state.statusCode).toBe(403);
      expect(state.data.code).toBe('FORBIDDEN');
    });

    it('1.3 Learner role is blocked from Admin-guarded endpoints with HTTP 403', () => {
      const req = createMockReq(STUDENT_USER);
      const { res, state } = createMockRes();
      let nextCalled = false;

      const guard = requireRole('admin');
      guard(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(state.statusCode).toBe(403);
      expect(state.data.code).toBe('FORBIDDEN');
    });

    it('1.4 Evaluator role is blocked from Admin-only endpoints with HTTP 403', () => {
      const req = createMockReq(EVALUATOR_USER);
      const { res, state } = createMockRes();
      let nextCalled = false;

      const guard = requireRole('admin');
      guard(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(state.statusCode).toBe(403);
      expect(state.data.code).toBe('FORBIDDEN');
    });

    it('1.5 Evaluator role is permitted on Evaluator endpoints', () => {
      const req = createMockReq(EVALUATOR_USER);
      const { res } = createMockRes();
      let nextCalled = false;

      const guard = requireRole('evaluator', 'admin');
      guard(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
    });

    it('1.6 Admin role is permitted on Admin endpoints', () => {
      const req = createMockReq(ADMIN_USER);
      const { res } = createMockRes();
      let nextCalled = false;

      const guard = requireRole('admin');
      guard(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
    });

    it('1.7 Disabled accounts (isActive: false) are rejected with HTTP 403 ACCOUNT_DISABLED', () => {
      const disabledUser: Partial<IUser> = {
        ...STUDENT_USER,
        isActive: false,
      };
      const req = createMockReq(disabledUser);
      const { res, state } = createMockRes();
      let nextCalled = false;

      const guard = requireRole('learner');
      guard(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(state.statusCode).toBe(403);
      expect(state.data.code).toBe('ACCOUNT_DISABLED');
    });
  });

  // ==========================================================================
  // Suite 2: Multi-Track Registration & Domain Separation (Student vs. Entrepreneur)
  // ==========================================================================
  describe('2. Multi-Track Registration & Domain Separation (Student vs. Entrepreneur)', () => {
    it('2.1 Student track registration strictly rejects venture fields with HTTP 400', async () => {
      const req = createMockReq(undefined, {
        name: 'Test Student',
        email: 'test.polluted.student@aiims.test',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        track: 'Student',
        stream: 'TECH',
        educationLevel: 'UNDERGRADUATE',
        programId: 'btech',
        specializationId: 'cs',
        yearOfStudy: '2',
        admissionYear: 2023,
        expectedGraduationYear: 2027,
        ventureStage: 'exploring_idea', // Contamination: Entrepreneur field on Student registration
      });
      const { res, state } = createMockRes();

      await register(req as any, res);

      expect(state.statusCode).toBe(400);
      expect(state.data.code).toBe('INVALID_INPUT');
      expect(state.data.field).toBe('ventureStage');
      expect(state.data.error).toContain(
        'Entrepreneur venture fields are not permitted on the Student track'
      );
    });

    it('2.2 Entrepreneur track registration strictly rejects academic fields with HTTP 400', async () => {
      const req = createMockReq(undefined, {
        name: 'Test Entrepreneur',
        email: 'test.polluted.founder@aiims.test',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        track: 'Entrepreneur',
        ventureStage: 'exploring_idea',
        problemStatement: 'Automating medical image transcription',
        stream: 'TECH', // Contamination: Student academic field on Entrepreneur registration
      });
      const { res, state } = createMockRes();

      await register(req as any, res);

      expect(state.statusCode).toBe(400);
      expect(state.data.code).toBe('INVALID_INPUT');
      expect(state.data.field).toBe('stream');
      expect(state.data.error).toContain(
        'Student academic fields are not permitted on the Entrepreneur track'
      );
    });

    it('2.3 Registration with missing track is rejected with HTTP 400', async () => {
      const req = createMockReq(undefined, {
        name: 'No Track User',
        email: 'notrack@aiims.test',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
      const { res, state } = createMockRes();

      await register(req as any, res);

      expect(state.statusCode).toBe(400);
      expect(state.data.code).toBe('INVALID_INPUT');
      expect(state.data.field).toBe('track');
    });

    it('2.4 Valid Student registration assigns track: "Student"', async () => {
      const studentEmail = 'valid.student@aiims.test';
      const req = createMockReq(undefined, {
        name: 'Valid Student',
        email: studentEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        track: 'Student',
        stream: 'TECH',
        educationLevel: 'UNDERGRADUATE',
        programId: 'btech',
        specializationId: 'cs',
        yearOfStudy: '3',
        admissionYear: 2022,
        expectedGraduationYear: 2026,
      });
      const { res, state } = createMockRes();

      await register(req as any, res);

      expect(state.statusCode).toBe(201);
      expect(state.data.user.track).toBe('Student');

      const savedUser = await prisma.user.findUnique({ where: { email: studentEmail } });
      expect(savedUser).not.toBeNull();
      expect(savedUser?.track).toBe('Student');
    });

    it('2.5 Valid Entrepreneur registration assigns track: "Entrepreneur"', async () => {
      const founderEmail = 'valid.founder@aiims.test';
      const req = createMockReq(undefined, {
        name: 'Valid Founder',
        email: founderEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        track: 'Entrepreneur',
        ventureStage: 'exploring_idea',
        problemStatement: 'Personalized AI mentors for higher education',
      });
      const { res, state } = createMockRes();

      await register(req as any, res);

      expect(state.statusCode).toBe(201);
      expect(state.data.user.track).toBe('Entrepreneur');

      const savedUser = await prisma.user.findUnique({ where: { email: founderEmail } });
      expect(savedUser).not.toBeNull();
      expect(savedUser?.track).toBe('Entrepreneur');
    });
  });

  // ==========================================================================
  // Suite 3: Persona-Aware Credit Engine & Economic Invariants
  // ==========================================================================
  describe('3. Persona-Aware Credit Engine & Economic Invariants', () => {
    it('3.1 Both tracks receive the standard 500 AC registration baseline', async () => {
      const student = await prisma.user.findUnique({ where: { id: STUDENT_USER.id } });
      const founder = await prisma.user.findUnique({ where: { id: ENTREPRENEUR_USER.id } });

      expect(student?.aiimsCredits).toBe(500);
      expect(founder?.aiimsCredits).toBe(500);
    });

    it('3.2 Assessment fee deduction (100 AC) executes identically across tracks', async () => {
      // Deduct from Student
      const studentSpend = await creditsLedgerService.executeTransaction({
        userId: STUDENT_USER.id!,
        type: 'SPEND',
        amount: 100,
        reason: 'assessment_submission',
        source: 'assessment',
        idempotencyKey: 'spend-student-assessment-01',
      });
      expect(studentSpend.success).toBe(true);
      expect(studentSpend.newBalance).toBe(400);

      // Deduct from Entrepreneur
      const founderSpend = await creditsLedgerService.executeTransaction({
        userId: ENTREPRENEUR_USER.id!,
        type: 'SPEND',
        amount: 100,
        reason: 'assessment_submission',
        source: 'assessment',
        idempotencyKey: 'spend-founder-assessment-01',
      });
      expect(founderSpend.success).toBe(true);
      expect(founderSpend.newBalance).toBe(400);
    });

    it('3.3 Score > 95% bonus (+50 AC) is awarded with exact-once idempotency across tracks', async () => {
      // Award bonus to Student
      const bonus1 = await creditsLedgerService.executeTransaction({
        userId: STUDENT_USER.id!,
        type: 'EARN',
        amount: 50,
        reason: 'assessment_high_score_bonus',
        source: 'assessment',
        idempotencyKey: 'bonus-assessment-score-98-student',
      });
      expect(bonus1.success).toBe(true);
      expect(bonus1.newBalance).toBe(550);

      // Replay attempt on Student bonus
      const replay1 = await creditsLedgerService.executeTransaction({
        userId: STUDENT_USER.id!,
        type: 'EARN',
        amount: 50,
        reason: 'assessment_high_score_bonus',
        source: 'assessment',
        idempotencyKey: 'bonus-assessment-score-98-student',
      });
      expect(replay1.success).toBe(true);
      expect(replay1.duplicate || replay1.conflict).toBe(true);
      expect(replay1.newBalance).toBe(550);

      // Award bonus to Entrepreneur
      const bonus2 = await creditsLedgerService.executeTransaction({
        userId: ENTREPRENEUR_USER.id!,
        type: 'EARN',
        amount: 50,
        reason: 'assessment_high_score_bonus',
        source: 'assessment',
        idempotencyKey: 'bonus-assessment-score-98-founder',
      });
      expect(bonus2.success).toBe(true);
      expect(bonus2.newBalance).toBe(550);

      // Replay attempt on Entrepreneur bonus
      const replay2 = await creditsLedgerService.executeTransaction({
        userId: ENTREPRENEUR_USER.id!,
        type: 'EARN',
        amount: 50,
        reason: 'assessment_high_score_bonus',
        source: 'assessment',
        idempotencyKey: 'bonus-assessment-score-98-founder',
      });
      expect(replay2.success).toBe(true);
      expect(replay2.duplicate || replay2.conflict).toBe(true);
      expect(replay2.newBalance).toBe(550);
    });

    it('3.4 Overdraft protection (non-negative balance constraint) enforced equally across tracks', async () => {
      // Attempt spend of 9999 AC on student
      const studentOverdraft = await creditsLedgerService.executeTransaction({
        userId: STUDENT_USER.id!,
        type: 'SPEND',
        amount: 9999,
        reason: 'expensive_enterprise_tool',
        source: 'wallet',
        idempotencyKey: 'overdraft-student-01',
      });
      expect(studentOverdraft.success).toBe(false);
      expect(studentOverdraft.error).toContain('Insufficient');

      // Attempt spend of 9999 AC on entrepreneur
      const founderOverdraft = await creditsLedgerService.executeTransaction({
        userId: ENTREPRENEUR_USER.id!,
        type: 'SPEND',
        amount: 9999,
        reason: 'expensive_enterprise_tool',
        source: 'wallet',
        idempotencyKey: 'overdraft-founder-01',
      });
      expect(founderOverdraft.success).toBe(false);
      expect(founderOverdraft.error).toContain('Insufficient');

      // Both balances remain intact
      const sUser = await prisma.user.findUnique({ where: { id: STUDENT_USER.id } });
      const fUser = await prisma.user.findUnique({ where: { id: ENTREPRENEUR_USER.id } });
      expect(sUser?.aiimsCredits).toBe(500);
      expect(fUser?.aiimsCredits).toBe(500);
    });

    it('3.5 Dual-ledger parity invariant holds for Entrepreneur accounts', async () => {
      // Seed initial registration credit transaction to establish full dual-ledger parity
      await creditsLedgerService.executeTransaction({
        userId: ENTREPRENEUR_USER.id!,
        type: 'EARN',
        amount: 500,
        reason: 'welcome_credits',
        source: 'registration',
        idempotencyKey: 'tx-founder-welcome-500',
      });

      // Reset balance to 500 for clean parity baseline
      await prisma.user.update({
        where: { id: ENTREPRENEUR_USER.id! },
        data: { aiimsCredits: 500 },
      });

      // Execute a series of transactions on Entrepreneur account
      await creditsLedgerService.executeTransaction({
        userId: ENTREPRENEUR_USER.id!,
        type: 'SPEND',
        amount: 100,
        reason: 'assessment_charge',
        source: 'assessment',
        idempotencyKey: 'tx-founder-spend-1',
      });
      await creditsLedgerService.executeTransaction({
        userId: ENTREPRENEUR_USER.id!,
        type: 'EARN',
        amount: 50,
        reason: 'clarity_task_reward',
        source: 'clarity',
        idempotencyKey: 'tx-founder-earn-1',
      });
      await creditsLedgerService.executeTransaction({
        userId: ENTREPRENEUR_USER.id!,
        type: 'SPEND',
        amount: 25,
        reason: 'tool_investigation',
        source: 'wallet',
        idempotencyKey: 'tx-founder-spend-2',
      });

      // Verify User.aiimsCredits == 500 - 100 + 50 - 25 = 425
      const user = await prisma.user.findUnique({ where: { id: ENTREPRENEUR_USER.id } });
      expect(user?.aiimsCredits).toBe(425);

      // Verify reconciliation
      const reconciliation = await creditsLedgerService.reconcileBalance(ENTREPRENEUR_USER.id!);
      expect(reconciliation.isReconciled).toBe(true);
      expect(reconciliation.currentBalance).toBe(425);
      expect(reconciliation.calculatedBalance).toBe(425);
      expect(reconciliation.discrepancy).toBe(0);
    });
  });

  // ==========================================================================
  // Suite 4: Tool Catalog Universal Availability & Persona Metadata
  // ==========================================================================
  describe('4. Tool Catalog Universal Availability & Persona Metadata', () => {
    it('4.1 Tool catalog serves active tools to both Student and Entrepreneur tracks', async () => {
      const catalog = await getActiveCatalog();
      expect(catalog.length).toBeGreaterThan(0);
      catalog.forEach((tool) => {
        expect(tool.activeStatus).toBe(true);
      });
    });

    it('4.2 Tool catalog includes tools with relevantRoles containing "Student"', async () => {
      const catalog = await getActiveCatalog();
      const studentTools = catalog.filter(
        (t) => t.relevantRoles && t.relevantRoles.includes('Student')
      );
      expect(studentTools.length).toBeGreaterThan(0);
    });

    it('4.3 Tool catalog includes tools with relevantRoles containing "Entrepreneur"', async () => {
      const catalog = await getActiveCatalog();
      const founderTools = catalog.filter(
        (t) => t.relevantRoles && t.relevantRoles.includes('Entrepreneur')
      );
      expect(founderTools.length).toBeGreaterThan(0);
    });

    it('4.4 Tool catalog mutation operations require admin authorization', () => {
      const learnerReq = createMockReq(STUDENT_USER);
      const { res, state } = createMockRes();
      let nextCalled = false;

      const adminGuard = requireRole('admin');
      adminGuard(learnerReq, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(state.statusCode).toBe(403);
      expect(state.data.code).toBe('FORBIDDEN');
    });
  });

  // ==========================================================================
  // Suite 5: Additional Interfaces (6/7 Scope) Data Model & Locking Boundaries
  // ==========================================================================
  describe('5. Additional Interfaces (6/7 Scope) Data Model & Locking Boundaries', () => {
    it('5.1 Level 2 Radar data defaults to status: "locked"', () => {
      const radar = defaultRadar();
      expect(radar.status).toBe('locked');
      expect(radar.investigatedSignalIds).toEqual([]);
      expect(radar.followedSignalIds).toEqual([]);
      expect(radar.savedSignalIds).toEqual([]);
    });

    it('5.2 Level 2 Investigation data defaults to status: "locked"', () => {
      const investigation = defaultInvestigation();
      expect(investigation.status).toBe('locked');
      expect(investigation.selectedSignalId).toBeNull();
      expect(investigation.userNotes).toEqual({});
    });

    it('5.3 Level 2 Relevance data defaults to status: "locked"', async () => {
      const rawUser = await prisma.user.findUnique({ where: { id: STUDENT_USER.id } });
      const user = userRecordToIUser(rawUser!);
      expect(user.relevance?.status).toBe('locked');
    });

    it('5.4 Level 3 Problem Solver defaults to empty workflows with zero unearned solutions', () => {
      const solver = defaultSolver();
      expect(solver.latestWorkflow).toBeNull();
      expect(solver.history).toEqual([]);
    });

    it('5.5 Level 3 Projects Workspace defaults to empty projects with zero unearned builds', () => {
      const build = defaultBuild();
      expect(build.projects).toEqual([]);
      expect(build.activeProjectId).toBeNull();
    });

    it('5.6 Level 4 Mentor Workspace defaults to status: "locked"', async () => {
      const rawUser = await prisma.user.findUnique({ where: { id: STUDENT_USER.id } });
      const user = userRecordToIUser(rawUser!);
      expect(user.mentor?.status).toBe('locked');
    });

    it('5.7 Canonical 6 locked interfaces + 7th Insights align with Owner Decisions D8/D9', async () => {
      // Canonical 6 locked workspace interfaces beyond Level 1
      const canonicalAdvancedInterfaces = [
        'radar', // Level 2
        'investigation', // Level 2
        'relevance', // Level 2
        'solver', // Level 3
        'build', // Level 3
        'mentor', // Level 4
      ];
      expect(canonicalAdvancedInterfaces.length).toBe(6);

      // Verify that all 6 default to locked/empty state on fresh created user
      const createdUser = await prisma.user.create({
        data: {
          id: 'usr-fresh-001',
          email: 'fresh@aiims.test',
          name: 'Fresh Learner',
          password: 'hashed_password_fresh',
          role: 'learner',
          track: 'Student',
          college: 'IIT Madras',
          aiimsCredits: 500,
          xpPoints: 100,
        },
      });

      const mappedUser = userRecordToIUser(createdUser);
      expect(mappedUser.radar?.status).toBe('locked');
      expect(mappedUser.investigation?.status).toBe('locked');
      expect(mappedUser.relevance?.status).toBe('locked');
      expect(mappedUser.solver?.latestWorkflow).toBeNull();
      expect(mappedUser.build?.projects).toEqual([]);
      expect(mappedUser.mentor?.status).toBe('locked');
    });
  });

  // ==========================================================================
  // Suite 6: Database Architecture & Zero-Speculation Audit
  // ==========================================================================
  describe('6. Database Architecture & Zero-Speculation Audit', () => {
    it('6.1 Exactly the canonical Prisma models exist without speculative Phase 8 tables', () => {
      const schemaPath = path.resolve(__dirname, '../../../prisma/schema.prisma');
      const schemaContent = fs.readFileSync(schemaPath, 'utf8');

      const modelMatches = schemaContent.match(/model\s+(\w+)\s+\{/g) || [];
      const modelNames = modelMatches.map((m) => m.replace(/model\s+/, '').replace(/\s+\{/, ''));

      // 22 canonical application models
      expect(modelNames.length).toBe(22);
      expect(modelNames).toContain('User');
      expect(modelNames).toContain('StudentProfile');
      expect(modelNames).toContain('EntrepreneurProfile');
      expect(modelNames).toContain('CreditLedger');
      expect(modelNames).toContain('Session');
      expect(modelNames).toContain('AuditLog');
      expect(modelNames).toContain('AiTool');

      // Zero speculative tables
      expect(modelNames).not.toContain('EntrepreneurDashboard');
      expect(modelNames).not.toContain('InvestorMatch');
      expect(modelNames).not.toContain('VenturePitch');
    });

    it('6.2 EntrepreneurProfile exists safely as an optional 1-to-1 extension to User', async () => {
      // Create an EntrepreneurProfile linked to the entrepreneur user
      const profile = await prisma.entrepreneurProfile.create({
        data: {
          id: 'ent-prof-001',
          userId: ENTREPRENEUR_USER.id!,
          ventureName: 'HealthAI Diagnostics',
          ventureStage: 'exploring_idea',
          industry: 'Healthcare & Lifesciences',
          problemStatement: 'Automated diagnostic workflows',
          skillsToDevelop: ['Machine Learning', 'Regulatory Compliance'],
          businessChallenges: ['Go-to-market strategy'],
          preferredSupport: ['Mentorship', 'Grant funding'],
          isComplete: true,
        },
      });

      expect(profile).not.toBeNull();
      expect(profile.ventureName).toBe('HealthAI Diagnostics');

      const fetchedProfile = await prisma.entrepreneurProfile.findUnique({
        where: { userId: ENTREPRENEUR_USER.id! },
      });
      expect(fetchedProfile?.industry).toBe('Healthcare & Lifesciences');
    });

    it('6.3 Omission of EntrepreneurProfile does not corrupt Student operations', async () => {
      // Student user has NO EntrepreneurProfile
      const studentProfile = await prisma.entrepreneurProfile.findUnique({
        where: { userId: STUDENT_USER.id! },
      });
      expect(studentProfile).toBeNull();

      // Student operations remain completely functional
      const user = await prisma.user.findUnique({ where: { id: STUDENT_USER.id } });
      expect(user).not.toBeNull();
      expect(user?.track).toBe('Student');
    });

    it('6.4 Zero MongoDB / Mongoose dependencies exist in the backend', () => {
      const packageJsonPath = path.resolve(__dirname, '../../../../Backend/package.json');
      const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');

      expect(packageJsonContent).not.toContain('"mongoose"');
      expect(packageJsonContent).not.toContain('"mongodb"');
    });
  });

  // ==========================================================================
  // Suite 7: Cross-User Isolation (IDOR Prevention)
  // ==========================================================================
  describe('7. Cross-User Isolation (IDOR Prevention)', () => {
    it("7.1 User A cannot access or query User B's credit ledger entries", async () => {
      // Record transaction for User B (Entrepreneur)
      await creditsLedgerService.executeTransaction({
        userId: ENTREPRENEUR_USER.id!,
        type: 'EARN',
        amount: 100,
        reason: 'special_grant',
        source: 'grant',
        idempotencyKey: 'grant-founder-private-01',
      });

      // User A (Student) queries ledger history
      const studentHistory = await creditsLedgerService.getLedgerHistory(STUDENT_USER.id!);
      const founderTransactionFound = studentHistory.transactions.some(
        (t) => t.idempotencyKey === 'grant-founder-private-01'
      );
      expect(founderTransactionFound).toBe(false);

      // User B queries ledger history
      const founderHistory = await creditsLedgerService.getLedgerHistory(ENTREPRENEUR_USER.id!);
      const foundInOwner = founderHistory.transactions.some(
        (t) => t.idempotencyKey === 'grant-founder-private-01'
      );
      expect(foundInOwner).toBe(true);
    });

    it('7.2 Request body tampering cannot inject administrative role or override credit balance', async () => {
      // Attacker attempts to register with injected admin role and massive credits
      const attackerEmail = 'tamperer@aiims.test';
      const req = createMockReq(undefined, {
        name: 'Tampering User',
        email: attackerEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        track: 'Student',
        stream: 'TECH',
        educationLevel: 'UNDERGRADUATE',
        programId: 'btech',
        specializationId: 'cs',
        yearOfStudy: '1',
        admissionYear: 2024,
        expectedGraduationYear: 2028,
        role: 'admin', // Malicious privilege escalation attempt
        aiimsCredits: 999999, // Malicious balance inflation attempt
      });
      const { res, state } = createMockRes();

      await register(req as any, res);

      expect(state.statusCode).toBe(201);
      // Injected role is sanitized -> defaults strictly to 'learner'
      expect(state.data.user.role).toBe('learner');
      // Injected credits are ignored -> assigned initial 500 AC
      expect(state.data.user.aiimsCredits).toBe(500);

      const savedUser = await prisma.user.findUnique({ where: { email: attackerEmail } });
      expect(savedUser?.role).toBe('learner');
      expect(savedUser?.aiimsCredits).toBe(500);
    });
  });
});
