/**
 * aiProfileAndComparison.test.ts
 * =========================================================
 * AIIMS Phase 2: AI Learner Profile & Comparative Intelligence Test Suite
 *
 * Exhaustively tests all 18 Phase 2 Scenarios:
 *  1. AI profile generation success from authentic completed assessment data.
 *  2. Persistent AI Learner Profile in PostgreSQL surviving simulated refresh/reload.
 *  3. Exact 50 AC deduction with category 'TASK_USAGE' and source 'AI_PROFILE'.
 *  4. Duplicate generation prevention via idempotency key (zero duplicate charge).
 *  5. Concurrent generation mutex lock preventing parallel double charge.
 *  6. Insufficient credit balance (< 50 AC) returns HTTP 402 without deduction.
 *  7. Invalid AI output detection against strict Zod schema.
 *  8. Exactly ONE schema-validation retry upon invalid AI output.
 *  9. Failed retry triggers automatic refund of 50 AC and never saves invalid output.
 * 10. External AI provider failure triggers automatic refund of 50 AC.
 * 11. Peer comparison across colleges for same branch (k >= 5 learners).
 * 12. Peer comparison suppression when branch cohort < 5 (k-anonymity privacy guard).
 * 13. Overall cohort comparison across all branches (k >= 5 learners).
 * 14. Overall cohort comparison suppression when overall cohort < 5 (k-anonymity).
 * 15. Unauthorized profile access rejected with HTTP 401.
 * 16. Assessment pending rejection (cannot generate profile without completed assessment).
 * 17. Learner data isolation & zero PII leakage in comparative intelligence payloads.
 * 18. Complete credit ledger mathematical consistency across charges and refunds.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { prisma } from '../../config/prisma';
import { resetPrismaTestDouble, uninstallPrismaTestDouble } from './helpers/prismaTestDouble';
import {
  generateAIProfile,
  getAIProfile,
  getPeerBranchComparison,
  getCohortAllComparison,
} from '../../controllers/assessment.controller';
import { aiProfileGeneratorService } from '../aiProfileGenerator.service';
import { creditsLedgerService } from '../creditsLedger.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { defaultAssessment, defaultAnalysis } from '../../utils/userMapper';

function createMockReq(
  user: any,
  body: Record<string, any> = {},
  query: Record<string, any> = {}
): AuthenticatedRequest {
  const req: any = {
    user,
    headers: { 'x-client': 'web' },
    body,
    query,
    params: {},
  };
  return req as AuthenticatedRequest;
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

const VALID_AI_PROFILE_PAYLOAD = {
  summary:
    'Demonstrates disciplined structured prompt engineering with systematic verification habits and strong architectural decomposition.',
  strengths: [
    'Systematic verification against ground-truth documentation',
    'Schema-driven structured prompting with negative constraints',
    'First-principles cognitive framing before delegating to LLMs',
  ],
  weaknesses: [
    'Tendency to rely on conversational prompting without explicit unit tests',
    'Limited hands-on multi-agent orchestration experience',
  ],
  skillGaps: [
    'Automated prompt regression testing pipelines',
    'Evaluation rubric construction for complex reasoning chains',
  ],
  learningPreferences: ['Hands-on experimental workflow labs', 'Empirical benchmark comparison'],
  improvementAreas: [
    'Checking AI: Automated output validation',
    'Adapting to AI: Multi-agent design',
  ],
  recommendedFocus: 'AI Workflow Design',
  recommendedRoles: ['AI Workflow Architect', 'Full-Stack AI Engineer'],
  confidenceScore: 0.95,
};

const VALID_AI_PROFILE_RAW_JSON = JSON.stringify(VALID_AI_PROFILE_PAYLOAD);

const COMPLETED_EVALUATION_RESULT = {
  overallScore: 84,
  overallConfidence: 0.92,
  overallEvidenceCoverage: 1.0,
  assessmentStatus: 'complete',
  scoringVersion: '3.0.0-evidence-based',
  capabilities: {
    usingAI: {
      capabilityName: 'Using AI',
      score: 88,
      evidenceCoverage: 1.0,
      demonstratedStrengths: ['Daily tool integration'],
    },
    understandingAI: {
      capabilityName: 'Understanding AI',
      score: 85,
      evidenceCoverage: 1.0,
      demonstratedStrengths: ['Architecture framing'],
    },
    solvingWithAI: {
      capabilityName: 'Solving with AI',
      score: 82,
      evidenceCoverage: 1.0,
      demonstratedStrengths: ['Constraint definition'],
    },
    checkingAI: {
      capabilityName: 'Checking AI',
      score: 80,
      evidenceCoverage: 1.0,
      demonstratedStrengths: ['Ground-truth fact checking'],
    },
    adaptingToAI: {
      capabilityName: 'Adapting to AI',
      score: 85,
      evidenceCoverage: 1.0,
      demonstratedStrengths: ['Rapid adoption'],
    },
  },
  strongestSkill: { name: 'Using AI', score: 88, key: 'usingAI' },
  roomToGrow: { name: 'Checking AI', score: 80, key: 'checkingAI' },
  legacyScores: {
    usageFrequency: 88,
    evaluationCapability: 85,
    workflowDesign: 82,
    strategicVision: 80,
    mentorshipReadiness: 85,
  },
};

describe('AIIMS Phase 2: AI Learner Profile & Comparative Intelligence', () => {
  beforeEach(async () => {
    resetPrismaTestDouble();
    aiProfileGeneratorService.setAICompletionRunner(null);
  });

  afterAll(() => {
    aiProfileGeneratorService.setAICompletionRunner(null);
    uninstallPrismaTestDouble();
  });

  // Helper to create a user with completed assessment and specific credits
  async function seedTestUser(options: {
    id: string;
    email: string;
    credits?: number;
    stream?: string;
    college?: string;
    assessmentStatus?: string;
    overallScore?: number;
    capabilities?: any;
  }) {
    const credits = options.credits ?? 500;
    const isCompleted = (options.assessmentStatus ?? 'completed') === 'completed';
    const score = options.overallScore ?? 84;

    const evalRes = isCompleted
      ? {
          ...COMPLETED_EVALUATION_RESULT,
          overallScore: score,
          capabilities: options.capabilities || COMPLETED_EVALUATION_RESULT.capabilities,
        }
      : null;

    const user = await prisma.user.create({
      data: {
        id: options.id,
        email: options.email,
        college: options.college || 'National Institute of Technology',
        track: 'Student',
        aiimsCredits: 0,
        assessmentStatus: options.assessmentStatus || 'completed',
        assessmentData: {
          ...defaultAssessment(),
          status: options.assessmentStatus || 'completed',
          answers: { 1: 'q1_a', 2: ['q2_b'], 25: 'Adaptive mental models' },
          evaluationResult: evalRes,
        },
        analysisData: defaultAnalysis(),
        studentProfile: {
          stream: options.stream || 'Computer Science and Engineering',
          programName: 'B.Tech',
          specializationName: 'Artificial Intelligence',
          streamSubCategory: 'Software Engineering',
        },
      } as any,
    });

    if (credits > 0) {
      await creditsLedgerService.executeTransaction({
        userId: options.id,
        type: 'EARN',
        category: 'WELCOME_BONUS',
        amount: credits,
        reason: 'Welcome registration credits',
        source: 'REGISTRATION',
        idempotencyKey: `welcome::seed::${options.id}`,
      });
    }

    return user;
  }

  // =========================================================================
  // SCENARIO 1: AI profile generation success from authentic assessment data
  // =========================================================================
  it('Scenario 1: Successfully generates AI Learner Profile grounded in completed assessment answers', async () => {
    const user = await seedTestUser({ id: 'user-01', email: 'user01@aiims.test', credits: 500 });
    aiProfileGeneratorService.setAICompletionRunner(async () => VALID_AI_PROFILE_RAW_JSON);

    const req = createMockReq(user);
    const res = createMockRes();

    await generateAIProfile(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.profile).toBeDefined();
    expect(res.body.profile.summary).toContain('structured prompt engineering');
    expect(res.body.profile.strengths).toHaveLength(3);
    expect(res.body.profile.weaknesses).toHaveLength(2);
    expect(res.body.profile.skillGaps).toHaveLength(2);
    expect(res.body.profile.recommendedFocus).toBe('AI Workflow Design');
    expect(res.body.profile.confidenceScore).toBe(0.95);
    expect(res.body.profile.version).toBe(1);
    expect(res.body.balance).toBe(450); // 500 - 50 = 450
  });

  // =========================================================================
  // SCENARIO 2: Persistent AI Learner Profile survives simulated refresh
  // =========================================================================
  it('Scenario 2: Persists AI Learner Profile in PostgreSQL surviving simulated reload & fetch', async () => {
    const user = await seedTestUser({ id: 'user-02', email: 'user02@aiims.test', credits: 500 });
    aiProfileGeneratorService.setAICompletionRunner(async () => VALID_AI_PROFILE_RAW_JSON);

    // Generate profile
    const genReq = createMockReq(user);
    const genRes = createMockRes();
    await generateAIProfile(genReq, genRes);
    expect(genRes.statusCode).toBe(200);

    // Verify persisted directly in database
    const dbUser = await prisma.user.findUnique({ where: { id: 'user-02' } });
    const analysis: any = dbUser?.analysisData;
    expect(analysis.aiProfile).toBeDefined();
    expect(analysis.aiProfile.summary).toBe(VALID_AI_PROFILE_PAYLOAD.summary);
    expect(analysis.history).toHaveLength(1);
    expect(analysis.lastGeneratedAt).toBeDefined();

    // Verify GET /analysis/ai-profile endpoint returns persisted profile
    const fetchReq = createMockReq(dbUser);
    const fetchRes = createMockRes();
    await getAIProfile(fetchReq, fetchRes);

    expect(fetchRes.statusCode).toBe(200);
    expect(fetchRes.body.available).toBe(true);
    expect(fetchRes.body.profile.version).toBe(1);
    expect(fetchRes.body.profile.summary).toBe(VALID_AI_PROFILE_PAYLOAD.summary);
  });

  // =========================================================================
  // SCENARIO 3: Exact 50 AC deduction with category 'TASK_USAGE' and source 'AI_PROFILE'
  // =========================================================================
  it('Scenario 3: Deducts exactly 50 AC recorded as TASK_USAGE with source AI_PROFILE', async () => {
    const user = await seedTestUser({ id: 'user-03', email: 'user03@aiims.test', credits: 500 });
    aiProfileGeneratorService.setAICompletionRunner(async () => VALID_AI_PROFILE_RAW_JSON);

    const req = createMockReq(user);
    const res = createMockRes();
    await generateAIProfile(req, res);

    expect(res.body.balance).toBe(450);

    const history = await creditsLedgerService.getLedgerHistory(user.id);
    const deduction = history.transactions.find((t) => t.category === 'TASK_USAGE');

    expect(deduction).toBeDefined();
    expect(deduction?.amount).toBe(50);
    expect(deduction?.source).toBe('AI_PROFILE');
    expect(deduction?.status).toBe('COMPLETED');
  });

  // =========================================================================
  // SCENARIO 4: Duplicate generation prevention via idempotency key
  // =========================================================================
  it('Scenario 4: Duplicate generation with same idempotency key prevents second charge', async () => {
    const user = await seedTestUser({ id: 'user-04', email: 'user04@aiims.test', credits: 500 });
    aiProfileGeneratorService.setAICompletionRunner(async () => VALID_AI_PROFILE_RAW_JSON);

    const fixedIdempotencyKey = 'profile::user-04::test-idem-key';

    // First call
    const req1 = createMockReq(user, { idempotencyKey: fixedIdempotencyKey });
    const res1 = createMockRes();
    await generateAIProfile(req1, res1);
    expect(res1.statusCode).toBe(200);
    expect(res1.body.balance).toBe(450);

    // Second call with same idempotency key
    const req2 = createMockReq(user, { idempotencyKey: fixedIdempotencyKey });
    const res2 = createMockRes();
    await generateAIProfile(req2, res2);

    expect(res2.statusCode).toBe(200);
    expect(res2.body.balance).toBe(450); // Balance remains 450, NOT 400!
    expect(res2.body.duplicate).toBe(true);

    const currentBalance = await creditsLedgerService.getBalance(user.id);
    expect(currentBalance).toBe(450);
  });

  // =========================================================================
  // SCENARIO 5: Concurrent generation requests mutex lock prevents double deduction
  // =========================================================================
  it('Scenario 5: Concurrent generation requests for same user execute atomically without double charge', async () => {
    const user = await seedTestUser({ id: 'user-05', email: 'user05@aiims.test', credits: 500 });

    let callCount = 0;
    aiProfileGeneratorService.setAICompletionRunner(async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 50)); // artificial delay
      return VALID_AI_PROFILE_RAW_JSON;
    });

    const [res1, res2] = await Promise.all([
      aiProfileGeneratorService.generateProfile(user.id, 'idem-concurrent-1'),
      aiProfileGeneratorService.generateProfile(user.id, 'idem-concurrent-2'),
    ]);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);

    // Only one 50 AC deduction must occur
    const finalBalance = await creditsLedgerService.getBalance(user.id);
    expect(finalBalance).toBe(450);
    expect(callCount).toBe(1); // Provider invoked exactly once
  });

  // =========================================================================
  // SCENARIO 6: Insufficient credit balance (< 50 AC) returns HTTP 402
  // =========================================================================
  it('Scenario 6: Rejects profile generation with HTTP 402 when balance < 50 AC without deduction', async () => {
    const user = await seedTestUser({ id: 'user-06', email: 'user06@aiims.test', credits: 35 });
    aiProfileGeneratorService.setAICompletionRunner(async () => VALID_AI_PROFILE_RAW_JSON);

    const req = createMockReq(user);
    const res = createMockRes();
    await generateAIProfile(req, res);

    expect(res.statusCode).toBe(402);
    expect(res.body.error).toContain('Insufficient AIIMS Credits');
    expect(res.body.requiredCredits).toBe(50);
    expect(res.body.currentBalance).toBe(35);

    const balanceAfter = await creditsLedgerService.getBalance(user.id);
    expect(balanceAfter).toBe(35); // Zero deduction
  });

  // =========================================================================
  // SCENARIO 7 & 8: Invalid AI output detection and controlled retry
  // =========================================================================
  it('Scenario 7 & 8: Detects invalid AI output and succeeds on exactly ONE controlled retry', async () => {
    const user = await seedTestUser({ id: 'user-07', email: 'user07@aiims.test', credits: 500 });

    let invocation = 0;
    aiProfileGeneratorService.setAICompletionRunner(async () => {
      invocation++;
      if (invocation === 1) {
        // Return malformed payload missing required 'strengths' array
        return JSON.stringify({ summary: 'Too brief', weaknesses: [] });
      }
      // Second invocation (the retry) returns valid payload
      return VALID_AI_PROFILE_RAW_JSON;
    });

    const result = await aiProfileGeneratorService.generateProfile(user.id);

    expect(result.success).toBe(true);
    expect(result.retried).toBe(true);
    expect(invocation).toBe(2); // Exactly 1 initial + 1 retry
    expect(result.balance).toBe(450);
  });

  // =========================================================================
  // SCENARIO 9: Failed retry triggers automatic refund of 50 AC
  // =========================================================================
  it('Scenario 9: Aborts and issues automatic 50 AC refund when retry also fails validation', async () => {
    const user = await seedTestUser({ id: 'user-09', email: 'user09@aiims.test', credits: 500 });

    let invocation = 0;
    aiProfileGeneratorService.setAICompletionRunner(async () => {
      invocation++;
      // Return invalid non-JSON garbage on both attempts
      return 'I cannot process this diagnostic right now.';
    });

    const result = await aiProfileGeneratorService.generateProfile(user.id);

    expect(result.success).toBe(false);
    expect(result.code).toBe('GENERATION_FAILED');
    expect(invocation).toBe(2); // Tried twice (initial + 1 retry)

    // Full 50 AC refund executed
    const balance = await creditsLedgerService.getBalance(user.id);
    expect(balance).toBe(500);

    const history = await creditsLedgerService.getLedgerHistory(user.id);
    const refundTx = history.transactions.find((t) => t.category === 'REFUND');
    expect(refundTx).toBeDefined();
    expect(refundTx?.amount).toBe(50);

    // Database user analysis must NOT save invalid profile
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const analysis: any = dbUser?.analysisData;
    expect(analysis.aiProfile).toBeUndefined();
  });

  // =========================================================================
  // SCENARIO 10: External AI provider failure triggers automatic refund of 50 AC
  // =========================================================================
  it('Scenario 10: Automatic compensation refund of 50 AC when AI provider throws network error', async () => {
    const user = await seedTestUser({ id: 'user-10', email: 'user10@aiims.test', credits: 500 });

    aiProfileGeneratorService.setAICompletionRunner(async () => {
      throw new Error('Anthropic API 503 Service Unavailable');
    });

    const result = await aiProfileGeneratorService.generateProfile(user.id);

    expect(result.success).toBe(false);
    expect(result.code).toBe('GENERATION_FAILED');

    // Balance restored to 500 AC
    const balance = await creditsLedgerService.getBalance(user.id);
    expect(balance).toBe(500);
  });

  // =========================================================================
  // SCENARIO 11: Peer comparison across colleges for same branch (k >= 5)
  // =========================================================================
  it('Scenario 11: Computes same-branch cross-college comparison when cohort has at least 5 learners', async () => {
    const branch = 'Computer Science and Engineering';

    // Seed 6 learners in same branch across 3 different colleges
    const colleges = ['NIT Trichy', 'IIT Madras', 'BITS Pilani'];
    for (let i = 1; i <= 6; i++) {
      await seedTestUser({
        id: `branch-peer-${i}`,
        email: `peer${i}@aiims.test`,
        college: colleges[i % colleges.length],
        stream: branch,
        overallScore: 70 + i * 3, // 73, 76, 79, 82, 85, 88
      });
    }

    const authUser = await prisma.user.findUnique({ where: { id: 'branch-peer-3' } });
    const req = createMockReq(authUser, {}, { branch });
    const res = createMockRes();

    await getPeerBranchComparison(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.available).toBe(true);
    expect(res.body.branchName).toBe(branch);
    expect(res.body.totalComparableRecords).toBe(6);
    expect(res.body.distinctCollegesCount).toBeGreaterThanOrEqual(2);
    expect(res.body.peerAverage).toBeDefined();
    expect(res.body.median).toBeDefined();
    expect(res.body.p90).toBeDefined();
    expect(res.body.capabilityAverages).toBeDefined();
    expect(res.body.userPercentile).toBeDefined();
  });

  // =========================================================================
  // SCENARIO 12: Peer comparison suppression when cohort < 5 (k-anonymity)
  // =========================================================================
  it('Scenario 12: Suppresses branch comparison under k-anonymity privacy guard when cohort < 5', async () => {
    const branch = 'Biomedical Engineering';

    // Seed only 3 learners in this branch (< 5)
    for (let i = 1; i <= 3; i++) {
      await seedTestUser({
        id: `bio-peer-${i}`,
        email: `bio${i}@aiims.test`,
        stream: branch,
        overallScore: 75,
      });
    }

    const authUser = await prisma.user.findUnique({ where: { id: 'bio-peer-1' } });
    const req = createMockReq(authUser, {}, { branch });
    const res = createMockRes();

    await getPeerBranchComparison(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.available).toBe(false);
    expect(res.body.reason).toBe('INSUFFICIENT_COHORT');
    expect(res.body.totalComparableRecords).toBe(3);
    expect(res.body.minRequiredRecords).toBe(5);
    expect(res.body.peerAverage).toBeUndefined(); // Suppressed
  });

  // =========================================================================
  // SCENARIO 13: Overall cohort comparison across all branches (k >= 5)
  // =========================================================================
  it('Scenario 13: Computes cross-branch overall cohort comparison when platform cohort >= 5', async () => {
    // Seed 5 learners across different branches
    const streams = [
      'Mechanical Engineering',
      'Electrical Engineering',
      'Civil Engineering',
      'Computer Science',
      'Chemical Engineering',
    ];

    for (let i = 0; i < 5; i++) {
      await seedTestUser({
        id: `overall-learner-${i}`,
        email: `learner${i}@aiims.test`,
        stream: streams[i],
        overallScore: 65 + i * 5,
      });
    }

    const authUser = await prisma.user.findUnique({ where: { id: 'overall-learner-2' } });
    const req = createMockReq(authUser);
    const res = createMockRes();

    await getCohortAllComparison(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.available).toBe(true);
    expect(res.body.totalComparableRecords).toBe(5);
    expect(res.body.cohortAverage).toBeDefined();
    expect(res.body.median).toBeDefined();
    expect(res.body.p90).toBeDefined();
    expect(res.body.normalizationNote).toBeDefined();
    expect(res.body.userPercentile).toBeDefined();
  });

  // =========================================================================
  // SCENARIO 14: Overall cohort comparison suppression when cohort < 5
  // =========================================================================
  it('Scenario 14: Suppresses overall cohort comparison under k-anonymity when cohort < 5', async () => {
    // Only 2 learners on entire platform
    await seedTestUser({ id: 'lone-1', email: 'lone1@aiims.test' });
    await seedTestUser({ id: 'lone-2', email: 'lone2@aiims.test' });

    const authUser = await prisma.user.findUnique({ where: { id: 'lone-1' } });
    const req = createMockReq(authUser);
    const res = createMockRes();

    await getCohortAllComparison(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.available).toBe(false);
    expect(res.body.reason).toBe('INSUFFICIENT_COHORT');
    expect(res.body.totalComparableRecords).toBe(2);
    expect(res.body.minRequiredRecords).toBe(5);
    expect(res.body.cohortAverage).toBeUndefined();
  });

  // =========================================================================
  // SCENARIO 15: Unauthorized profile access rejected
  // =========================================================================
  it('Scenario 15: Rejects unauthenticated profile generation request with HTTP 401', async () => {
    const req = createMockReq(null); // No authenticated user
    const res = createMockRes();

    await generateAIProfile(req, res);
    expect(res.statusCode).toBe(401);

    const getRes = createMockRes();
    await getAIProfile(req, getRes);
    expect(getRes.statusCode).toBe(401);
  });

  // =========================================================================
  // SCENARIO 16: Unauthorized comparison access rejection
  // =========================================================================
  it('Scenario 16: Rejects unauthenticated request to peer-branch comparison with HTTP 401', async () => {
    const req = createMockReq(null);
    const res = createMockRes();

    await getPeerBranchComparison(req, res);
    expect(res.statusCode).toBe(401);
  });

  // =========================================================================
  // SCENARIO 17: Assessment pending rejection
  // =========================================================================
  it('Scenario 17: Rejects profile generation if learner diagnostic assessment is not yet completed', async () => {
    const pendingUser = await seedTestUser({
      id: 'pending-user',
      email: 'pending@aiims.test',
      assessmentStatus: 'in_progress',
    });

    const req = createMockReq(pendingUser);
    const res = createMockRes();

    await generateAIProfile(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('baseline diagnostic assessment');
    expect(res.body.code).toBe('ASSESSMENT_NOT_COMPLETED');
  });

  // =========================================================================
  // SCENARIO 18: Learner data isolation & zero PII leakage
  // =========================================================================
  it('Scenario 18: Comparative intelligence payloads strictly leak zero PII or individual identity', async () => {
    for (let i = 1; i <= 6; i++) {
      await seedTestUser({
        id: `pii-user-${i}`,
        email: `secret.student${i}@private-college.edu`,
        stream: 'Information Technology',
        overallScore: 80,
      });
    }

    const authUser = await prisma.user.findUnique({ where: { id: 'pii-user-1' } });
    const req = createMockReq(authUser, {}, { branch: 'Information Technology' });
    const res = createMockRes();

    await getPeerBranchComparison(req, res);

    const payloadString = JSON.stringify(res.body);
    expect(payloadString).not.toContain('secret.student');
    expect(payloadString).not.toContain('private-college.edu');
    expect(payloadString).not.toContain('pii-user-');
  });

  // =========================================================================
  // SCENARIO 19: Complete credit ledger mathematical consistency
  // =========================================================================
  it('Scenario 19: Authoritative ledger sum matches user.aiimsCredits across charges, replays, and refunds', async () => {
    const user = await seedTestUser({
      id: 'user-ledger-audit',
      email: 'audit@aiims.test',
      credits: 500,
    });
    aiProfileGeneratorService.setAICompletionRunner(async () => VALID_AI_PROFILE_RAW_JSON);

    // 1. Generation fee deduction
    const req = createMockReq(user);
    const res = createMockRes();
    await generateAIProfile(req, res);
    expect(res.statusCode).toBe(200);

    // Verify ledger consistency
    let dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    let ledgerBalance = await creditsLedgerService.getBalance(user.id);
    expect(dbUser?.aiimsCredits).toBe(450);
    expect(ledgerBalance).toBe(450);

    // 2. Simulate failure + refund
    await creditsLedgerService.refundCredits(
      user.id,
      50,
      'REFUND',
      'Refund test',
      'refund::audit-test'
    );

    dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    ledgerBalance = await creditsLedgerService.getBalance(user.id);
    expect(dbUser?.aiimsCredits).toBe(500);
    expect(ledgerBalance).toBe(500);
  });
});
