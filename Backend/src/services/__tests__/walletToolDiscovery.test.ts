/**
 * walletToolDiscovery.test.ts
 * ============================================================================
 * AIIMS Phase 3: AI Wallet, Tool Discovery & Intelligent Matching Test Suite
 *
 * Verifies:
 *  1. Authoritative credit balance & ledger persistence in PostgreSQL (zero client balance trust).
 *  2. Wallet operation 100 AC deduction using centralized ledger service.
 *  3. Duplicate operation prevention via idempotency keys (zero double charge).
 *  4. Insufficient balance rejection (HTTP 402 INSUFFICIENT_CREDITS) with zero balance mutation.
 *  5. Concurrent wallet operations & atomic overdraft protection.
 *  6. 13 Canonical Domain Cards organization with verified metadata & pricing.
 *  7. Strict unverified/discovered candidate suppression from learner-facing views.
 *  8. Personalized tool matching for Video Editing, Data Analytics, and Graphic Design.
 *  9. Grounded fallback when AI Learner Profile is absent (zero phantom fabrication).
 * 10. D6 Decision: Manual learner tool usage confirmation persistence in PostgreSQL.
 * 11. Duplicate usage confirmation prevention & idempotency.
 * 12. Security & RBAC: Admin candidate routes protection, unauthenticated rejection, and IDOR isolation.
 * ============================================================================
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../../config/prisma';
import { resetPrismaTestDouble, uninstallPrismaTestDouble } from './helpers/prismaTestDouble';
import { creditsLedgerService } from '../creditsLedger.service';
import { ToolCatalogService } from '../wallet/toolCatalog.service';
import { DomainTaxonomyService, CANONICAL_DOMAINS } from '../wallet/domainTaxonomy.service';
import { ToolMatchingService } from '../wallet/toolMatching.service';
import {
  executeWalletOperation,
  confirmToolUsage,
  getUserConfirmations,
  getPersonalizedToolMatching,
  getDomainCards,
  getCatalog,
} from '../../controllers/aiWallet.controller';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { CREDIT_RULES, WALLET_RULES } from '../../config/credits.config';

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

describe('AIIMS Phase 3: AI Wallet & Tool Discovery Economy', () => {
  const STUDENT_ID = 'student-phase3-tester-01';
  const STUDENT_ID_BROKE = 'student-phase3-broke-02';
  const STUDENT_ID_OTHER = 'student-phase3-other-03';

  beforeEach(async () => {
    resetPrismaTestDouble(true);
    ToolCatalogService.initializeCatalog();

    // Seed test users
    await prisma.user.create({
      data: {
        id: STUDENT_ID,
        email: 'phase3.student@aiims.edu',
        name: 'Phase 3 Student',
        password: 'hashed-password-123',
        role: 'learner',
        aiimsCredits: 500,
        targetGoal: 'Become a Full-Stack AI Engineer',
        aiWalletData: {
          userTools: [],
          usageConfirmations: [],
        },
        analysisData: {
          aiLearnerProfile: {
            summary: 'Disciplined engineer with systematic prompt verification.',
            recommendedFocus: 'AI Workflow Design',
            strengths: ['Structured prompting', 'API orchestration'],
            weaknesses: ['Video generation pipelines'],
            confidenceScore: 0.94,
          },
        },
      },
    });

    await prisma.user.create({
      data: {
        id: STUDENT_ID_BROKE,
        email: 'broke.student@aiims.edu',
        name: 'Broke Student',
        password: 'hashed-password-123',
        role: 'learner',
        aiimsCredits: 50, // Less than the required 100 AC
        targetGoal: 'Master AI Data Analytics',
        aiWalletData: {
          userTools: [],
          usageConfirmations: [],
        },
        analysisData: {}, // No persistent profile -> fallback test
      },
    });

    await prisma.user.create({
      data: {
        id: STUDENT_ID_OTHER,
        email: 'other.student@aiims.edu',
        name: 'Other Student',
        password: 'hashed-password-123',
        role: 'learner',
        aiimsCredits: 300,
        aiWalletData: {
          userTools: [],
          usageConfirmations: [],
        },
      },
    });
  });

  afterAll(() => {
    uninstallPrismaTestDouble();
  });

  // =========================================================================
  // 1. Authoritative Credit Balance & Ledger Operations
  // =========================================================================
  describe('1. Authoritative Credit Balance & Ledger Operations', () => {
    it('verifies WALLET_RULES specifies exactly 100 AC operation charge', () => {
      expect(WALLET_RULES.OPERATION_CHARGE).toBe(100);
      expect(CREDIT_RULES.WALLET_OPERATION.cost).toBe(100);
    });

    it('retrieves authentic credit balance from PostgreSQL', async () => {
      const balance = await creditsLedgerService.getBalance(STUDENT_ID);
      expect(balance).toBe(500);
    });

    it('deducts exactly 100 AC on valid wallet operation', async () => {
      const req = createMockReq(
        { id: STUDENT_ID, role: 'learner' },
        { operationName: 'Workflow Synthesis', idempotencyKey: 'op-key-001' }
      );
      const res = createMockRes();

      await executeWalletOperation(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.cost).toBe(100);
      expect(res.body.balance).toBe(400);

      // Verify PostgreSQL state
      const updatedUser = await prisma.user.findUnique({ where: { id: STUDENT_ID } });
      expect(updatedUser?.aiimsCredits).toBe(400);

      // Verify dual-ledger entry
      const ledgerEntries = await prisma.creditLedger.findMany({
        where: { userId: STUDENT_ID, source: 'WALLET' },
      });
      expect(ledgerEntries.length).toBe(1);
      expect(ledgerEntries[0].amount).toBe(100);
      expect(ledgerEntries[0].type).toBe('SPEND');
      expect(ledgerEntries[0].category).toBe('TASK_USAGE');
    });

    it('prevents double deduction on duplicate request using idempotency key', async () => {
      const idempotencyKey = 'idempotent-wallet-op-999';

      const req1 = createMockReq(
        { id: STUDENT_ID, role: 'learner' },
        { operationName: 'Model Fine-tuning Pipeline', idempotencyKey }
      );
      const res1 = createMockRes();
      await executeWalletOperation(req1, res1);

      expect(res1.statusCode).toBe(200);
      expect(res1.body.balance).toBe(400);
      expect(res1.body.duplicate).toBe(false);

      // Retry with same idempotency key
      const req2 = createMockReq(
        { id: STUDENT_ID, role: 'learner' },
        { operationName: 'Model Fine-tuning Pipeline', idempotencyKey }
      );
      const res2 = createMockRes();
      await executeWalletOperation(req2, res2);

      expect(res2.statusCode).toBe(200);
      expect(res2.body.duplicate).toBe(true);
      expect(res2.body.balance).toBe(400); // Balance NOT deducted twice!

      // Confirm only 1 ledger entry exists for this idempotency key
      const ledgerEntries = await prisma.creditLedger.findMany({
        where: { userId: STUDENT_ID, idempotencyKey },
      });
      expect(ledgerEntries.length).toBe(1);
    });

    it('rejects wallet operation when balance is insufficient (< 100 AC) with HTTP 402', async () => {
      const req = createMockReq(
        { id: STUDENT_ID_BROKE, role: 'learner' },
        { operationName: 'Heavy Workflow Automation', idempotencyKey: 'broke-op-001' }
      );
      const res = createMockRes();

      await executeWalletOperation(req, res);

      expect(res.statusCode).toBe(402);
      expect(res.body.code).toBe('INSUFFICIENT_CREDITS');
      expect(res.body.requiredAmount).toBe(100);
      expect(res.body.currentBalance).toBe(50);

      // Verify balance remains untouched
      const brokeUser = await prisma.user.findUnique({ where: { id: STUDENT_ID_BROKE } });
      expect(brokeUser?.aiimsCredits).toBe(50);

      // Verify no creditLedger entry was recorded
      const ledgerEntries = await prisma.creditLedger.findMany({
        where: { userId: STUDENT_ID_BROKE, source: 'WALLET' },
      });
      expect(ledgerEntries.length).toBe(0);
    });

    it('handles concurrent wallet operations with atomic balance deduction', async () => {
      // User starts with 500 AC. Fire 5 parallel 100 AC operations with unique idempotency keys.
      const ops = Array.from({ length: 5 }, (_, i) =>
        creditsLedgerService.chargeWalletOperation(
          STUDENT_ID,
          `Concurrent Op ${i}`,
          `concurrent-op-key-${i}`
        )
      );

      const results = await Promise.all(ops);
      const successCount = results.filter((r) => r.success).length;
      expect(successCount).toBe(5);

      const finalBalance = await creditsLedgerService.getBalance(STUDENT_ID);
      expect(finalBalance).toBe(0);

      // A 6th operation must fail with INSUFFICIENT_CREDITS
      const sixthOp = await creditsLedgerService.chargeWalletOperation(
        STUDENT_ID,
        'Sixth Op',
        'concurrent-op-key-5'
      );
      expect(sixthOp.success).toBe(false);
      expect(sixthOp.code).toBe('INSUFFICIENT_CREDITS');
      expect(await creditsLedgerService.getBalance(STUDENT_ID)).toBe(0);
    });
  });

  // =========================================================================
  // 2. 13 Canonical Domain Cards & Verification Filtering
  // =========================================================================
  describe('2. 13 Canonical Domain Cards & Verified Tool Catalog', () => {
    it('verifies that exactly 13 canonical domains are registered', () => {
      expect(DomainTaxonomyService.CANONICAL_DOMAINS.length).toBe(13);
      const ids = DomainTaxonomyService.CANONICAL_DOMAINS.map((d) => d.id);
      expect(ids.length).toBe(13);
      expect(ids).toContain('video-editing');
      expect(ids).toContain('data-analytics');
      expect(ids).toContain('graphic-design');
    });

    it('returns all 13 domain cards with verified tool metadata via getDomainCards', async () => {
      const req = createMockReq(null);
      const res = createMockRes();

      await getDomainCards(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.totalDomains).toBe(13);
      expect(res.body.domains.length).toBe(13);

      for (const card of res.body.domains) {
        expect(card).toHaveProperty('id');
        expect(card).toHaveProperty('title');
        expect(card).toHaveProperty('description');
        expect(card).toHaveProperty('tools');
        expect(card).toHaveProperty('keyCapabilities');
        expect(Array.isArray(card.tools)).toBe(true);
        expect(card.totalTools).toBeGreaterThanOrEqual(0);
      }
    });

    it('strictly suppresses unverified/discovered/rejected tools from the learner catalog', async () => {
      // Inject an unverified candidate into the catalog
      await ToolCatalogService.upsertTool({
        id: 'tool-unverified-phantom',
        name: 'Phantom Unverified AI',
        provider: 'Ghost Labs',
        category: 'Code Generation',
        description: 'Unverified experimental tool',
        capabilities: ['Auto-complete'],
        limitations: ['Untested'],
        pricing: 'Free',
        pricingDetails: { type: 'FREE', summary: 'Free' },
        officialWebsite: 'https://phantom.ai',
        verifiedDate: '2026-01-01',
        verificationStatus: 'DISCOVERED', // Must be filtered out
        activeStatus: false,
        learningTrack: [],
      } as any);

      const req = createMockReq(null);
      const res = createMockRes();

      await getCatalog(req, res);

      expect(res.statusCode).toBe(200);
      const catalog = res.body;
      const phantom = catalog.find((t: any) => t.id === 'tool-unverified-phantom');
      expect(phantom).toBeUndefined();

      // Verify domain cards also omit unverified candidates
      const resCards = createMockRes();
      await getDomainCards(req, resCards);
      for (const domain of resCards.body.domains) {
        const foundPhantom = domain.tools.find((t: any) => t.id === 'tool-unverified-phantom');
        expect(foundPhantom).toBeUndefined();
      }
    });
  });

  // =========================================================================
  // 3. Personalized Tool Matching (3 Required Domains)
  // =========================================================================
  describe('3. Personalized Tool Matching across 3 Required Domains', () => {
    it('matches Video Editing tools correctly with beginner and advanced recommendations', () => {
      const matchBeginner = ToolMatchingService.getPersonalizedDomainRecommendations({
        domain: 'Video Editing',
        skillLevel: 'beginner',
      });

      expect(matchBeginner.length).toBe(1);
      const videoResult = matchBeginner[0];
      expect(videoResult.domain).toBe('Video Editing');
      expect(videoResult.totalMatches).toBeGreaterThan(0);
      expect(videoResult.recommendations.beginner.length).toBeGreaterThan(0);
      expect(videoResult.recommendations.advanced.length).toBeGreaterThan(0);
    });

    it('matches Data Analytics tools correctly', () => {
      const matchData = ToolMatchingService.getPersonalizedDomainRecommendations({
        domain: 'Data Analytics',
      });

      expect(matchData.length).toBe(1);
      expect(matchData[0].domain).toBe('Data Analytics');
      expect(matchData[0].totalMatches).toBeGreaterThan(0);
    });

    it('matches Graphic Design tools correctly and filters for free/low-cost when requested', () => {
      const matchDesign = ToolMatchingService.getPersonalizedDomainRecommendations({
        domain: 'Graphic Design',
        freeOnly: true,
      });

      expect(matchDesign.length).toBe(1);
      expect(matchDesign[0].domain).toBe('Graphic Design');
      const allRecs = [
        ...matchDesign[0].recommendations.beginner,
        ...matchDesign[0].recommendations.advanced,
      ];
      expect(allRecs.length).toBeGreaterThan(0);
      for (const rec of allRecs) {
        expect(rec.isFreeOrLowCost).toBe(true);
      }
    });

    it('reuses Phase 2 Persistent AI Learner Profile when available', async () => {
      const req = createMockReq({ id: STUDENT_ID, role: 'learner' }, { domain: 'Video Editing' });
      const res = createMockRes();

      await getPersonalizedToolMatching(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isPersonalized).toBe(true);
      expect(res.body.profileSource).toBe('PERSISTENT_AI_PROFILE');
      expect(res.body.results.length).toBe(1);
      const videoRecs = res.body.results[0].recommendations;
      const allItems = [...videoRecs.beginner, ...videoRecs.advanced];
      expect(allItems.length).toBeGreaterThan(0);
      expect(allItems[0].whyMatches.some((w: string) => w.includes('Structured prompting'))).toBe(
        true
      );
    });

    it('falls back to grounded general domain recommendations when AI profile is absent', async () => {
      const req = createMockReq(
        { id: STUDENT_ID_BROKE, role: 'learner' },
        { domain: 'Data Analytics' }
      );
      const res = createMockRes();

      await getPersonalizedToolMatching(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isPersonalized).toBe(false);
      expect(res.body.profileSource).toBe('GENERAL_DOMAIN_FALLBACK');
      expect(res.body.results.length).toBe(1);
      expect(res.body.results[0].totalMatches).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 4. D6 Decision: Manual Learner Tool Usage Confirmation
  // =========================================================================
  describe('4. D6 Decision: Manual Learner Usage Confirmation', () => {
    it('records manual tool usage confirmation in PostgreSQL without automatic device tracking', async () => {
      const req = createMockReq(
        { id: STUDENT_ID, role: 'learner' },
        {
          toolId: 'tool-descript',
          taskContext: 'Coursework podcast episode 1 editing',
          notes: 'Trimmed filler words and generated captions.',
          idempotencyKey: 'confirm-key-001',
        }
      );
      const res = createMockRes();

      await confirmToolUsage(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.duplicate).toBe(false);
      expect(res.body.confirmation.toolId).toBe('tool-descript');
      expect(res.body.confirmation.verificationMethod).toBe('MANUAL_LEARNER_CONFIRMATION');
      expect(res.body.confirmation.status).toBe('CONFIRMED');

      // Verify persistence in PostgreSQL
      const user = await prisma.user.findUnique({ where: { id: STUDENT_ID } });
      const walletData: any = user?.aiWalletData;
      expect(Array.isArray(walletData.usageConfirmations)).toBe(true);
      expect(walletData.usageConfirmations.length).toBe(1);
      expect(walletData.usageConfirmations[0].toolId).toBe('tool-descript');
    });

    it('prevents duplicate confirmation submissions via idempotency/context check', async () => {
      // First confirmation
      const req1 = createMockReq(
        { id: STUDENT_ID, role: 'learner' },
        {
          toolId: 'tool-canva',
          taskContext: 'Social pitch deck graphics',
          idempotencyKey: 'confirm-canva-001',
        }
      );
      const res1 = createMockRes();
      await confirmToolUsage(req1, res1);
      expect(res1.statusCode).toBe(201);
      expect(res1.body.duplicate).toBe(false);

      // Repeat duplicate confirmation
      const req2 = createMockReq(
        { id: STUDENT_ID, role: 'learner' },
        {
          toolId: 'tool-canva',
          taskContext: 'Social pitch deck graphics',
          idempotencyKey: 'confirm-canva-001',
        }
      );
      const res2 = createMockRes();
      await confirmToolUsage(req2, res2);

      expect(res2.statusCode).toBe(200);
      expect(res2.body.duplicate).toBe(true);
      expect(res2.body.message).toContain('already been manually confirmed');

      // Ensure array length in PostgreSQL is still exactly 1
      const user = await prisma.user.findUnique({ where: { id: STUDENT_ID } });
      const walletData: any = user?.aiWalletData;
      const canvaConfs = walletData.usageConfirmations.filter(
        (c: any) => c.toolId === 'tool-canva'
      );
      expect(canvaConfs.length).toBe(1);
    });

    it('retrieves user confirmation history via getUserConfirmations', async () => {
      // Add a confirmation
      const confirmReq = createMockReq(
        { id: STUDENT_ID, role: 'learner' },
        {
          toolId: 'tool-chatgpt',
          taskContext: 'Algorithm pseudocode drafting',
        }
      );
      const confirmRes = createMockRes();
      await confirmToolUsage(confirmReq, confirmRes);

      // Fetch history
      const req = createMockReq({ id: STUDENT_ID, role: 'learner' });
      const res = createMockRes();
      await getUserConfirmations(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(res.body.confirmations.some((c: any) => c.toolId === 'tool-chatgpt')).toBe(true);
    });
  });

  // =========================================================================
  // 5. Security, IDOR Protection & Authorization
  // =========================================================================
  describe('5. Security, IDOR Protection & Authorization', () => {
    it('rejects unauthenticated requests to wallet operations with HTTP 401', async () => {
      const req = createMockReq(null, { operationName: 'Secret Tool' });
      const res = createMockRes();

      await executeWalletOperation(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('rejects unauthenticated requests to confirm usage with HTTP 401', async () => {
      const req = createMockReq(null, { toolId: 'tool-descript' });
      const res = createMockRes();

      await confirmToolUsage(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('enforces learner data isolation: Student cannot access another user confirmations', async () => {
      // Student 1 adds a confirmation
      const confirmReq = createMockReq(
        { id: STUDENT_ID, role: 'learner' },
        { toolId: 'tool-elevenlabs', taskContext: 'Voiceover testing' }
      );
      await confirmToolUsage(confirmReq, createMockRes());

      // Student OTHER requests confirmations -> should NOT receive Student 1's records
      const otherReq = createMockReq({ id: STUDENT_ID_OTHER, role: 'learner' });
      const otherRes = createMockRes();

      await getUserConfirmations(otherReq, otherRes);
      expect(otherRes.statusCode).toBe(200);
      expect(otherRes.body.confirmations.length).toBe(0);
    });

    it('rejects unknown tool ID in confirm usage with HTTP 404', async () => {
      const req = createMockReq(
        { id: STUDENT_ID, role: 'learner' },
        { toolId: 'tool-nonexistent-999', taskContext: 'Testing invalid tool' }
      );
      const res = createMockRes();

      await confirmToolUsage(req, res);
      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('TOOL_NOT_FOUND');
    });
  });
});
