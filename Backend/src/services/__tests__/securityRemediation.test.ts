/**
 * securityRemediation.test.ts
 * =========================================================
 * Vitest Unit Tests for Prompt 2 Security Remediation:
 *  - Role Escalation & Learner State Tampering Prevention
 *  - AI Wallet Authentication & Authorization
 *  - Focus & Radar Cross-User Ownership Isolation
 *  - Plaintext Password Comparison Rejection
 *  - Ephemeral High-Entropy JWT Secret Fallback
 *  - Zod Request Body Validation Schemas
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { updateLearnerState } from '../../controllers/learner.controller';
import {
  getUserWallet,
  addToWallet,
  updateFamiliarity,
} from '../../controllers/aiWallet.controller';
import { overrideFocus, toggleFollowSignal } from '../../controllers/investigation.controller';
import { login } from '../../controllers/auth.controller';
import { getValidatedJwtSecret } from '../../config/env';
import { prisma } from '../../config/prisma';
import { SEED_TOOL_CATALOG } from '../../data/aiimsCatalog';
import { ToolCatalogService } from '../wallet/toolCatalog.service';
import { resetPrismaTestDouble, uninstallPrismaTestDouble } from './helpers/prismaTestDouble';
import { addToWalletSchema, updateFamiliaritySchema } from '../../schemas/wallet.schema';
import { focusOverrideSchema, radarFollowSchema } from '../../schemas/investigation.schema';
import { updateLearnerStateSchema } from '../../schemas/learner.schema';

function createMockRes() {
  const res: any = {
    statusCode: 200,
    headers: {},
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
    setHeader(key: string, val: string) {
      this.headers[key] = val;
      return this;
    },
    cookie(name: string, val: any) {
      this.headers[`cookie-${name}`] = val;
      return this;
    },
  };
  return res;
}

function createMockStudent(id = 'student_vitest_001', role = 'Student') {
  return {
    _id: id,
    id,
    email: 'student_vitest@example.com',
    name: 'Vitest Student',
    role,
    isActive: true,
    aiimsCredits: 100,
    xpPoints: 50,
    stage: 'Knowing',
    profile: {
      name: 'Vitest Student',
      email: 'student_vitest@example.com',
      role,
      institution: 'AIIMS Academy',
      targetGoal: 'Master AI',
    },
    wallet: [],
    focus: {
      status: 'available',
      selectedTrack: null,
      history: [],
    },
    radar: {
      status: 'available',
      investigatedSignalIds: [],
      followedSignalIds: [],
    },
    assessment: {
      status: 'not_started',
      rewardClaimed: false,
    },
  };
}

describe('Prompt 2 Security Remediation Test Suite', () => {
  beforeEach(async () => {
    resetPrismaTestDouble(true);
    ToolCatalogService.initializeCatalog();

    await prisma.user.create({
      data: {
        id: 'student_vitest_001',
        email: 'student_vitest@example.com',
        name: 'Vitest Student',
        password: 'hash',
        role: 'learner',
        college: 'AIIMS Academy',
        targetGoal: 'Master AI',
        aiimsCredits: 100,
        xpPoints: 50,
        stage: 'Knowing',
      },
    });

    await prisma.user.create({
      data: {
        id: 'student_vitest_123',
        email: 'student_vitest_123@example.com',
        name: 'Vitest Student 123',
        password: 'hash',
        role: 'learner',
        college: 'AIIMS Academy',
        targetGoal: 'Master AI',
        aiimsCredits: 100,
        xpPoints: 50,
        stage: 'Knowing',
      },
    });
  });

  afterAll(() => {
    uninstallPrismaTestDouble();
  });
  describe('Learner Role Escalation & State Tampering Prevention', () => {
    it('rejects attempts to escalate role to admin with HTTP 403', async () => {
      const req: any = {
        user: createMockStudent(),
        body: { state: { profile: { role: 'admin' } } },
      };
      const res = createMockRes();
      await updateLearnerState(req, res);
      expect(res.statusCode).toBe(403);
      expect(res.body?.code).toBe('ROLE_ESCALATION_FORBIDDEN');
    });

    it('rejects attempts to escalate role to evaluator with HTTP 403', async () => {
      const req: any = {
        user: createMockStudent(),
        body: { state: { profile: { role: 'evaluator' } } },
      };
      const res = createMockRes();
      await updateLearnerState(req, res);
      expect(res.statusCode).toBe(403);
      expect(res.body?.code).toBe('ROLE_ESCALATION_FORBIDDEN');
    });

    it('rejects attempts to modify account status with HTTP 403', async () => {
      const req: any = {
        user: createMockStudent(),
        body: { state: { isActive: true, status: 'active' } },
      };
      const res = createMockRes();
      await updateLearnerState(req, res);
      expect(res.statusCode).toBe(403);
      expect(res.body?.code).toBe('ACCOUNT_STATUS_FORBIDDEN');
    });

    it('rejects fabricated assessment status with HTTP 400', async () => {
      const req: any = {
        user: createMockStudent(),
        body: { state: { assessment: { status: 'completed' } } },
      };
      const res = createMockRes();
      await updateLearnerState(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body?.code).toBe('ASSESSMENT_TAMPERING_PROHIBITED');
    });

    it('rejects fabricated analysis status with HTTP 400', async () => {
      const req: any = {
        user: createMockStudent(),
        body: { state: { analysis: { status: 'completed' } } },
      };
      const res = createMockRes();
      await updateLearnerState(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body?.code).toBe('ANALYSIS_TAMPERING_PROHIBITED');
    });

    it('rejects fabricated clarity taskScores with HTTP 400', async () => {
      const req: any = {
        user: createMockStudent(),
        body: { state: { taskScores: { 'task-1': 100 } } },
      };
      const res = createMockRes();
      await updateLearnerState(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body?.code).toBe('CLARITY_SCORE_TAMPERING_PROHIBITED');
    });

    it('rejects direct credit balance manipulation with HTTP 400', async () => {
      const req: any = {
        user: createMockStudent(),
        body: { state: { aiimsCredits: 99999 } },
      };
      const res = createMockRes();
      await updateLearnerState(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body?.code).toBe('CREDIT_TAMPERING_PROHIBITED');
    });

    it('allows legitimate learner profile updates with HTTP 200', async () => {
      const req: any = {
        user: createMockStudent(),
        body: {
          state: {
            profile: {
              name: 'Updated Name',
              targetGoal: 'Become AI Engineer',
            },
          },
        },
      };
      const res = createMockRes();
      await updateLearnerState(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body?.state?.profile?.name).toBe('Updated Name');
    });

    it('rejects role: "learner" presence with HTTP 403 ROLE_ESCALATION_FORBIDDEN', async () => {
      const req: any = {
        user: createMockStudent(),
        body: { state: { profile: { name: 'Valid Name', role: 'learner' } } },
      };
      const res = createMockRes();
      await updateLearnerState(req, res);
      expect(res.statusCode).toBe(403);
      expect(res.body?.code).toBe('ROLE_ESCALATION_FORBIDDEN');
    });

    it('persists sanitized learner slices while preserving Clarity, Focus, Radar, and Investigation server fields', async () => {
      const mockUser: any = createMockStudent();
      mockUser.clarity = {
        status: 'in_progress',
        selectedAreas: ['Prompt Engineering'],
        selectedTopic: 'Structured Prompting',
        completedTopics: ['Structured Prompting'],
        reflections: {},
        taskScores: { 'Structured Prompting': { easy: { score: 92 } } },
        trialRunsUsed: 1,
      };
      mockUser.focus = {
        status: 'active',
        selectedTrack: 'Deep Prompting',
        history: ['sess-1'],
        sessionHistory: [{ id: 'sess-1', actualFocusSeconds: 1500, status: 'completed' }],
      };
      mockUser.radar = {
        status: 'available',
        investigatedSignalIds: ['sig-server-01'],
        followedSignalIds: ['sig-server-01'],
        savedSignalIds: [],
        dismissedSignalIds: [],
      };
      mockUser.investigation = {
        status: 'completed',
        selectedSignalId: 'sig-server-01',
        userNotes: {},
      };

      const req: any = {
        user: mockUser,
        body: {
          state: {
            profile: {
              name: 'Priya Updated',
              college: 'IIT Bombay',
              targetGoal: 'Build Safe Agents',
              stage: 'Understanding',
            },
            radar: {
              savedSignalIds: ['sig-client-02'],
              dismissedSignalIds: ['sig-client-03'],
              lastViewedRadar: '2026-11-10',
              radarProgress: 50,
            },
            investigation: {
              selectedSignalId: 'sig-server-01',
              userNotes: { 'sig-server-01': 'Reviewed agent safety impact' },
            },
            aiWallet: {
              userTools: [
                {
                  toolId: 'tool-chatgpt',
                  addedAt: '2026-11-10',
                  familiarity: 'proficient',
                  primaryCategory: 'Reasoning & Writing',
                },
              ],
              dismissedRecommendations: ['rec-01'],
            },
            notifications: [
              {
                id: 'n-1',
                title: 'Sync Check',
                message: 'Read notification',
                timestamp: 'Just now',
                targetTab: 'home',
                read: true,
              },
            ],
          },
        },
      };

      const res = createMockRes();
      await updateLearnerState(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.state?.profile?.name).toBe('Priya Updated');
      expect(res.body?.state?.clarity?.taskScores?.['Structured Prompting']?.easy?.score).toBe(92);
      expect(res.body?.state?.focus?.selectedTrack).toBe('Deep Prompting');
      expect(res.body?.state?.focus?.sessionHistory?.length).toBe(1);
      expect(res.body?.state?.radar?.investigatedSignalIds).toContain('sig-server-01');
      expect(res.body?.state?.radar?.savedSignalIds).toContain('sig-client-02');
      expect(res.body?.state?.investigation?.status).toBe('completed');
      expect(res.body?.state?.investigation?.userNotes?.['sig-server-01']).toBe(
        'Reviewed agent safety impact'
      );
      expect(res.body?.state?.aiWallet?.userTools?.length).toBe(1);
      expect(res.body?.state?.notifications?.[0]?.read).toBe(true);
    });
  });

  describe('AI Wallet Security & Ownership Enforcement', () => {
    it('rejects unauthenticated GET /wallet/user with HTTP 401', async () => {
      const req: any = { user: undefined };
      const res = createMockRes();
      await getUserWallet(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body?.code).toBe('UNAUTHORIZED');
    });

    it('rejects unauthenticated POST /wallet/add with HTTP 401', async () => {
      const req: any = { user: undefined, body: { toolId: 'cursor' } };
      const res = createMockRes();
      await addToWallet(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body?.code).toBe('UNAUTHORIZED');
    });

    it('returns HTTP 404 when adding non-existent tool ID', async () => {
      const req: any = {
        user: createMockStudent(),
        body: { toolId: 'invalid-nonexistent-tool' },
      };
      const res = createMockRes();
      await addToWallet(req, res);
      expect(res.statusCode).toBe(404);
      expect(res.body?.code).toBe('TOOL_NOT_FOUND');
    });

    it('successfully adds valid catalog tool for authenticated user', async () => {
      const sampleTool = SEED_TOOL_CATALOG[0];
      const req: any = {
        user: createMockStudent(),
        body: { toolId: sampleTool.id },
      };
      const res = createMockRes();
      await addToWallet(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body?.item?.toolId).toBe(sampleTool.id);
    });
  });

  describe('Focus & Radar Cross-User Ownership Isolation', () => {
    it('rejects unauthenticated POST /focus/override with HTTP 401', async () => {
      const req: any = { user: undefined, body: { focusId: 'track-1' } };
      const res = createMockRes();
      await overrideFocus(req, res);
      expect(res.statusCode).toBe(401);
    });

    it('rejects cross-user focus override attempt with HTTP 403', async () => {
      const student = createMockStudent('student_vitest_123');
      const req: any = {
        user: student,
        body: { focusId: 'track-1', userId: 'victim_student_999' },
      };
      const res = createMockRes();
      await overrideFocus(req, res);
      expect(res.statusCode).toBe(403);
      expect(res.body?.code).toBe('FORBIDDEN_CROSS_USER');
    });

    it('rejects unauthenticated POST /radar/follow with HTTP 401', async () => {
      const req: any = { user: undefined, body: { signalId: 'sig-1' } };
      const res = createMockRes();
      await toggleFollowSignal(req, res);
      expect(res.statusCode).toBe(401);
    });

    it('rejects cross-user radar follow attempt with HTTP 403', async () => {
      const student = createMockStudent('student_vitest_123');
      const req: any = {
        user: student,
        body: { signalId: 'sig-1', userId: 'victim_student_999' },
      };
      const res = createMockRes();
      await toggleFollowSignal(req, res);
      expect(res.statusCode).toBe(403);
      expect(res.body?.code).toBe('FORBIDDEN_CROSS_USER');
    });

    it('allows valid focus override for self', async () => {
      const student = createMockStudent('student_vitest_123');
      const req: any = {
        user: student,
        body: { focusId: 'agentic_workflows', mentorOverride: 'Test override' },
      };
      const res = createMockRes();
      await overrideFocus(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body?.success).toBe(true);
    });
  });

  describe('Plaintext Password Comparison Elimination', () => {
    it('strictly rejects passwords stored as plaintext without $2 bcrypt prefix', async () => {
      await prisma.user.create({
        data: {
          id: 'user_plain_vitest',
          email: 'plain_vitest@aiims.edu',
          password: 'PlainPassword123!',
          name: 'Plain Vitest User',
          role: 'learner',
        },
      });

      const req: any = {
        body: { email: 'plain_vitest@aiims.edu', password: 'PlainPassword123!' },
        headers: {},
      };
      const res = createMockRes();
      await login(req, res);
      expect(res.statusCode).toBe(401);
    });

    it('authenticates valid bcrypt hashed password', async () => {
      const hashedPassword = bcrypt.hashSync('BcryptVitestPass123!', 10);
      await prisma.user.create({
        data: {
          id: 'user_bcrypt_vitest',
          email: 'bcrypt_vitest@aiims.edu',
          password: hashedPassword,
          name: 'Bcrypt Vitest User',
          role: 'learner',
        },
      });

      const req: any = {
        body: { email: 'bcrypt_vitest@aiims.edu', password: 'BcryptVitestPass123!' },
        headers: {},
      };
      const res = createMockRes();
      await login(req, res);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('JWT Ephemeral Secret Fallback', () => {
    it('returns a high-entropy secret in dev rather than static fallback', () => {
      const secret = getValidatedJwtSecret();
      expect(secret).not.toBe('dev-secret-change-in-production');
      expect(secret.length).toBeGreaterThanOrEqual(16);
    });
  });

  describe('Zod Request Validation Schemas', () => {
    it('rejects empty payload on wallet tool add', () => {
      expect(addToWalletSchema.safeParse({}).success).toBe(false);
    });

    it('rejects whitespace-only focusId on focus override', () => {
      expect(focusOverrideSchema.safeParse({ focusId: '   ' }).success).toBe(false);
    });

    it('rejects empty payload on radar follow', () => {
      expect(radarFollowSchema.safeParse({}).success).toBe(false);
    });

    it('validates sanitized learner state update', () => {
      const parseResult = updateLearnerStateSchema.safeParse({
        state: {
          profile: {
            name: 'Valid Name',
            targetGoal: 'Pass Security Audit',
          },
        },
      });
      expect(parseResult.success).toBe(true);
    });
  });
});
