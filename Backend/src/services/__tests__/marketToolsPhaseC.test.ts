import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../../config/prisma';
import {
  installPrismaTestDouble,
  resetPrismaTestDouble,
  uninstallPrismaTestDouble,
} from './helpers/prismaTestDouble';
import {
  getCatalog,
  getToolById,
  removeFromWallet,
  reportOutdatedTool,
  compareTools,
  getAdminCandidates,
  getAdminDashboard,
} from '../../controllers/aiWallet.controller';
import aiWalletRouter from '../../routes/aiWallet.routes';
import { ToolCatalogService } from '../wallet/toolCatalog.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { MARKET_TIER_CONFIG, MarketTier } from '../../types';

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

describe('AIIMS Market AI Tools Catalog — Phase C Backend APIs & Business Logic Suite', () => {
  const LEARNER_USER_ID = 'learner-phase-c-tester-01';
  const ADMIN_USER_ID = 'admin-phase-c-reviewer-01';

  beforeEach(async () => {
    installPrismaTestDouble();
    resetPrismaTestDouble(true);
    ToolCatalogService.initializeCatalog();

    // 1. Seed test learner user
    await prisma.user.create({
      data: {
        id: LEARNER_USER_ID,
        email: 'learner.market@aiims.edu',
        name: 'Market Learner',
        password: 'hashed-password-123',
        role: 'learner',
        aiimsCredits: 500,
        aiWalletData: {
          userTools: [
            {
              toolId: 'tool-cursor',
              addedAt: '2026-03-01',
              familiarity: 'practicing',
              userNotes: 'Using for agentic coding practice',
              primaryCategory: 'Agentic Coding',
            },
            {
              toolId: 'tool-chatgpt',
              addedAt: '2026-03-02',
              familiarity: 'proficient',
              userNotes: 'General reasoning',
              primaryCategory: 'Reasoning & Writing',
            },
          ],
          dismissedRecommendations: [],
        },
      },
    });

    // 2. Seed test admin user
    await prisma.user.create({
      data: {
        id: ADMIN_USER_ID,
        email: 'admin.market@aiims.edu',
        name: 'Market Catalog Admin',
        password: 'hashed-password-123',
        role: 'admin',
        aiimsCredits: 1000,
      },
    });

    // 3. Seed test AI Tools spanning tiers 1 to 4 and unrated (null)
    const testTools = [
      {
        id: 'tier1-starter-tool',
        name: 'Aider AI',
        provider: 'Paul Gauthier',
        description: 'Command-line AI pair programming terminal tool',
        category: 'Agentic Coding',
        categories: ['Agentic Coding'],
        domains: ['agentic-coding'],
        capabilities: ['Terminal pair programming', 'Git auto-commit'],
        useCases: ['CLI coding', 'Local refactoring'],
        activeStatus: true,
        verificationStatus: 'VERIFIED',
        marketTier: 1, // Starter
        skillLevel: 'intermediate',
        pricing: 'Free open source',
        pricingDetails: {
          type: 'FREE',
          summary: 'Open-source CLI tool',
          freeTierAvailable: true,
          freeTrialAvailable: false,
          verified: true,
        },
        pricingSourceUrl: 'https://aider.chat/docs/faq.html',
        pricingVerifiedAt: new Date('2026-03-10'),
      },
      {
        id: 'tier2-growth-tool',
        name: 'Cursor Editor',
        provider: 'Anysphere',
        description: 'AI-first code editor fork of VS Code',
        category: 'Agentic Coding',
        categories: ['Agentic Coding'],
        domains: ['agentic-coding'],
        capabilities: ['Workspace indexing', 'Tab completion', 'Agent mode'],
        useCases: ['Full codebase editing', 'Automated bug resolution'],
        activeStatus: true,
        verificationStatus: 'VERIFIED',
        marketTier: 2, // Growth
        skillLevel: 'intermediate',
        pricing: '$20/month Pro plan',
        pricingDetails: {
          type: 'FREEMIUM',
          summary: 'Free 2-week Pro trial, then $20/month',
          freeTierAvailable: true,
          freeTrialAvailable: true,
          startingPriceMonthlyUsd: 20,
          verified: true,
        },
        pricingSourceUrl: 'https://www.cursor.com/pricing',
        pricingVerifiedAt: new Date('2026-03-10'),
      },
      {
        id: 'tier3-leading-tool',
        name: 'GitHub Copilot',
        provider: 'GitHub / Microsoft',
        description: 'Industry-leading AI developer pair programmer',
        category: 'Agentic Coding',
        categories: ['Agentic Coding'],
        domains: ['agentic-coding'],
        capabilities: ['Code completion', 'CLI chat', 'PR generation'],
        useCases: ['Enterprise developer productivity'],
        activeStatus: true,
        verificationStatus: 'VERIFIED',
        marketTier: 3, // Leading
        skillLevel: 'beginner',
        pricing: '$10/month Individual plan',
        pricingDetails: {
          type: 'PAID',
          summary: '$10/month for individuals, no free tier',
          freeTierAvailable: false,
          freeTrialAvailable: true,
          startingPriceMonthlyUsd: 10,
          verified: true,
        },
        pricingSourceUrl: 'https://github.com/pricing',
        pricingVerifiedAt: new Date('2026-03-10'),
      },
      {
        id: 'tier4-enterprise-tool',
        name: 'Amazon Q Developer',
        provider: 'Amazon Web Services',
        description: 'Enterprise-grade generative AI assistant for software development',
        category: 'Agentic Coding',
        categories: ['Agentic Coding'],
        domains: ['agentic-coding'],
        capabilities: ['AWS optimization', 'Security scanning', 'Legacy code transformation'],
        useCases: ['AWS cloud architecture', 'Java enterprise upgrades'],
        activeStatus: true,
        verificationStatus: 'VERIFIED',
        marketTier: 4, // Enterprise
        skillLevel: 'advanced',
        pricing: '$19/user/month Pro plan',
        pricingDetails: {
          type: 'FREEMIUM',
          summary: 'Free tier with AWS builder ID, $19/user/mo Pro',
          freeTierAvailable: true,
          freeTrialAvailable: false,
          startingPriceMonthlyUsd: 19,
          verified: true,
        },
        pricingSourceUrl: 'https://aws.amazon.com/q/developer/pricing/',
        pricingVerifiedAt: new Date('2026-03-10'),
      },
      {
        id: 'unrated-candidate-tool',
        name: 'Zeta Video AI',
        provider: 'Zeta Labs',
        description: 'Emerging AI video generation tool pending market verification',
        category: 'Video',
        categories: ['Video'],
        domains: ['video-editing'],
        capabilities: ['Text to video generation'],
        useCases: ['Short-form video creation'],
        activeStatus: true,
        verificationStatus: 'VERIFIED',
        marketTier: null, // Unrated
        skillLevel: 'beginner',
        pricing: 'Freemium with 50 credits/month',
        pricingDetails: {
          type: 'FREEMIUM',
          summary: '50 free generation credits/month',
          freeTierAvailable: true,
          freeTrialAvailable: false,
          verified: true,
        },
      },
    ];

    for (const tool of testTools) {
      await prisma.aiTool.create({
        data: tool as any,
      });
    }
  });

  afterAll(() => {
    uninstallPrismaTestDouble();
  });

  // =========================================================================
  // 1. Tier-Aware Catalog Retrieval & Strict Sorting Order
  // =========================================================================
  describe('1. Tier-Aware Catalog Retrieval & Sorting Order', () => {
    it('returns tools in strict order: Starter (1) -> Growth (2) -> Leading (3) -> Enterprise (4) -> Unrated (last)', async () => {
      const req = createMockReq(null, {}, {});
      const res = createMockRes();

      await getCatalog(req, res);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const items = res.body;
      expect(items.length).toBeGreaterThanOrEqual(5);

      // Verify tier order monotonicity: rank non-decreasing
      const tierRank = (tier: MarketTier): number => {
        if (tier === 1) return 1;
        if (tier === 2) return 2;
        if (tier === 3) return 3;
        if (tier === 4) return 4;
        return 5; // Unrated last
      };

      for (let i = 0; i < items.length - 1; i++) {
        const currentRank = tierRank(items[i].marketTier);
        const nextRank = tierRank(items[i + 1].marketTier);
        expect(currentRank).toBeLessThanOrEqual(nextRank);

        // Secondary sort: alphabetical by name when ranks are identical
        if (currentRank === nextRank) {
          expect(items[i].name.localeCompare(items[i + 1].name)).toBeLessThanOrEqual(0);
        }
      }
    });

    it('enriches every tool in catalog with marketTierName and marketTierLabel', async () => {
      const req = createMockReq(null, {}, {});
      const res = createMockRes();

      await getCatalog(req, res);

      const items = res.body;
      for (const item of items) {
        expect(item).toHaveProperty('marketTier');
        expect(item).toHaveProperty('marketTierName');
        expect(item).toHaveProperty('marketTierLabel');

        if (item.marketTier !== null && item.marketTier !== undefined) {
          expect(item.marketTierName).toBe(
            MARKET_TIER_CONFIG[item.marketTier as 1 | 2 | 3 | 4].name
          );
          expect(item.marketTierLabel).toBe(
            MARKET_TIER_CONFIG[item.marketTier as 1 | 2 | 3 | 4].label
          );
        } else {
          expect(item.marketTierName).toBe('Unrated');
          expect(item.marketTierLabel).toBe('Unrated');
        }
      }
    });
  });

  // =========================================================================
  // 2. Catalog Query Filters
  // =========================================================================
  describe('2. Catalog Query Filters (Market Tier, Domain, Pricing, Skill Level)', () => {
    it('filters accurately by marketTier=1 (Starter)', async () => {
      const req = createMockReq(null, {}, { marketTier: '1' });
      const res = createMockRes();

      await getCatalog(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      for (const tool of res.body) {
        expect(tool.marketTier).toBe(1);
        expect(tool.marketTierName).toBe('Starter');
      }
    });

    it('filters accurately by marketTier=4 (Enterprise)', async () => {
      const req = createMockReq(null, {}, { marketTier: '4' });
      const res = createMockRes();

      await getCatalog(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      for (const tool of res.body) {
        expect(tool.marketTier).toBe(4);
        expect(tool.marketTierName).toBe('Enterprise');
      }
    });

    it('filters accurately by marketTier=unrated', async () => {
      const req = createMockReq(null, {}, { marketTier: 'unrated' });
      const res = createMockRes();

      await getCatalog(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      for (const tool of res.body) {
        expect(tool.marketTier).toBeNull();
        expect(tool.marketTierName).toBe('Unrated');
      }
    });

    it('filters accurately by canonical domain (domain=agentic-coding)', async () => {
      const req = createMockReq(null, {}, { domain: 'agentic-coding' });
      const res = createMockRes();

      await getCatalog(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      for (const tool of res.body) {
        const matchesDomain =
          tool.domains.includes('agentic-coding') || tool.category === 'Agentic Coding';
        expect(matchesDomain).toBe(true);
      }
    });

    it('filters accurately by spec domain alias (domain=programming)', async () => {
      const req = createMockReq(null, {}, { domain: 'programming' });
      const res = createMockRes();

      await getCatalog(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      for (const tool of res.body) {
        const matchesDomain =
          tool.domains.includes('agentic-coding') || tool.category === 'Agentic Coding';
        expect(matchesDomain).toBe(true);
      }
    });

    it('filters accurately by freeTierAvailable=true', async () => {
      const req = createMockReq(null, {}, { freeTierAvailable: 'true' });
      const res = createMockRes();

      await getCatalog(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      for (const tool of res.body) {
        const hasFree =
          tool.pricingDetails.type === 'FREE' || Boolean(tool.pricingDetails.freeTierAvailable);
        expect(hasFree).toBe(true);
      }
    });

    it('filters accurately by freeTierAvailable=false (Paid-only)', async () => {
      const req = createMockReq(null, {}, { freeTierAvailable: 'false' });
      const res = createMockRes();

      await getCatalog(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      for (const tool of res.body) {
        expect(tool.pricingDetails.freeTierAvailable).toBe(false);
      }
    });

    it('filters accurately by skillLevel=beginner', async () => {
      const req = createMockReq(null, {}, { skillLevel: 'beginner' });
      const res = createMockRes();

      await getCatalog(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      for (const tool of res.body) {
        expect(tool.skillLevel.toLowerCase()).toBe('beginner');
      }
    });

    it('combines multiple filters (domain + marketTier)', async () => {
      const req = createMockReq(null, {}, { domain: 'agentic-coding', marketTier: '2' });
      const res = createMockRes();

      await getCatalog(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      for (const tool of res.body) {
        expect(tool.marketTier).toBe(2);
        expect(tool.domains.includes('agentic-coding') || tool.category === 'Agentic Coding').toBe(
          true
        );
      }
    });

    it('rejects invalid marketTier query parameter with 400', async () => {
      const req = createMockReq(null, {}, { marketTier: 'invalid-tier-9' });
      const res = createMockRes();

      await getCatalog(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_MARKET_TIER');
    });

    it('rejects invalid freeTierAvailable query parameter with 400', async () => {
      const req = createMockReq(null, {}, { freeTierAvailable: 'maybe' });
      const res = createMockRes();

      await getCatalog(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_FREE_TIER_PARAM');
    });

    it('preserves pre-existing visibility behavior: default query retains all verified tools without hiding Unrated', async () => {
      const req = createMockReq(null, {}, {});
      const res = createMockRes();

      await getCatalog(req, res);

      expect(res.statusCode).toBe(200);
      const items = res.body;

      // Unrated tool (zeta-video) is present and not artificially excluded
      const unrated = items.find((t: any) => t.id === 'unrated-candidate-tool');
      expect(unrated).toBeDefined();
      expect(unrated.marketTier).toBeNull();
      expect(unrated.marketTierName).toBe('Unrated');

      // Tiered tools are also present
      const tiered = items.filter((t: any) => t.marketTier !== null);
      expect(tiered.length).toBeGreaterThanOrEqual(4);

      // Verify unrated tools sort at the very end
      const lastItem = items[items.length - 1];
      expect(lastItem.marketTier).toBeNull();
    });
  });

  // =========================================================================
  // 3. Consistent Tool-Detail API Responses (GET /wallet/tools/:id)
  // =========================================================================
  describe('3. Consistent Tool-Detail API Responses', () => {
    it('returns enriched tool metadata including tier label and pricing provenance', async () => {
      const req = createMockReq(null, {}, {}, { id: 'tier2-growth-tool' });
      const res = createMockRes();

      await getToolById(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id', 'tier2-growth-tool');
      expect(res.body).toHaveProperty('name', 'Cursor Editor');
      expect(res.body).toHaveProperty('marketTier', 2);
      expect(res.body).toHaveProperty('marketTierName', 'Growth');
      expect(res.body).toHaveProperty('marketTierLabel', 'Growth (Tier 2)');
      expect(res.body).toHaveProperty('pricingSourceUrl', 'https://www.cursor.com/pricing');
      expect(res.body).toHaveProperty('pricingVerifiedAt');
      expect(res.body).toHaveProperty('capabilities');
      expect(res.body).toHaveProperty('useCases');
      expect(res.body).toHaveProperty('skillLevel', 'intermediate');
    });

    it('returns 404 for unknown tool ID', async () => {
      const req = createMockReq(null, {}, {}, { id: 'unknown-nonexistent-tool' });
      const res = createMockRes();

      await getToolById(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  // =========================================================================
  // 4. Secure Wallet Removal Endpoint (POST /wallet/remove)
  // =========================================================================
  describe('4. Secure Wallet Removal Endpoint', () => {
    it('removes an existing tool from learner personal wallet and preserves other tools', async () => {
      const user = await prisma.user.findUnique({ where: { id: LEARNER_USER_ID } });
      const req = createMockReq(
        {
          id: LEARNER_USER_ID,
          name: 'Market Learner',
          role: 'learner',
          aiWallet: (user as any).aiWalletData,
        },
        { toolId: 'tool-cursor' }
      );
      const res = createMockRes();

      await removeFromWallet(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.removed).toBe(true);
      expect(res.body.toolId).toBe('tool-cursor');

      // Verify tool was removed from wallet
      const remainingTools = res.body.userTools;
      expect(remainingTools.some((t: any) => t.toolId === 'tool-cursor')).toBe(false);
      expect(remainingTools.some((t: any) => t.toolId === 'tool-chatgpt')).toBe(true);

      // Verify database persistence
      const updatedUser: any = await prisma.user.findUnique({ where: { id: LEARNER_USER_ID } });
      const updatedWallet = updatedUser.aiWalletData;
      expect(updatedWallet.userTools.some((t: any) => t.toolId === 'tool-cursor')).toBe(false);
      expect(updatedWallet.userTools.some((t: any) => t.toolId === 'tool-chatgpt')).toBe(true);
    });

    it('isolation: removing a tool does not affect other learners wallets', async () => {
      const OTHER_USER_ID = 'other-learner-isolation-02';
      await prisma.user.create({
        data: {
          id: OTHER_USER_ID,
          email: 'other.learner@aiims.edu',
          name: 'Other Learner',
          password: 'hashed-password-123',
          role: 'learner',
          aiimsCredits: 300,
          aiWalletData: {
            userTools: [{ toolId: 'tool-cursor', addedAt: '2026-03-01' }],
          },
        },
      });

      const userA = await prisma.user.findUnique({ where: { id: LEARNER_USER_ID } });
      const req = createMockReq(
        {
          id: LEARNER_USER_ID,
          name: 'Market Learner',
          role: 'learner',
          aiWallet: (userA as any).aiWalletData,
        },
        { toolId: 'tool-cursor' }
      );
      const res = createMockRes();

      await removeFromWallet(req, res);
      expect(res.statusCode).toBe(200);

      const userB: any = await prisma.user.findUnique({ where: { id: OTHER_USER_ID } });
      expect(userB.aiWalletData.userTools.some((t: any) => t.toolId === 'tool-cursor')).toBe(true);
    });

    it('is idempotent: removing a tool not in the wallet succeeds with removed: false', async () => {
      const user = await prisma.user.findUnique({ where: { id: LEARNER_USER_ID } });
      const req = createMockReq(
        {
          id: LEARNER_USER_ID,
          name: 'Market Learner',
          role: 'learner',
          aiWallet: (user as any).aiWalletData,
        },
        { toolId: 'tool-not-in-wallet' }
      );
      const res = createMockRes();

      await removeFromWallet(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.removed).toBe(false);
    });

    it('enforces authentication: rejects unauthenticated caller with 401', async () => {
      const req = createMockReq(null, { toolId: 'tool-cursor' });
      const res = createMockRes();

      await removeFromWallet(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('validates toolId input: rejects empty or invalid toolId with 400', async () => {
      const user = await prisma.user.findUnique({ where: { id: LEARNER_USER_ID } });
      const req = createMockReq(
        {
          id: LEARNER_USER_ID,
          name: 'Market Learner',
          role: 'learner',
          aiWallet: (user as any).aiWalletData,
        },
        { toolId: '   ' }
      );
      const res = createMockRes();

      await removeFromWallet(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_TOOL_ID');
    });

    it('preserves economy invariants: modifies zero AC and zero XP (0 AC charged, 0 refunded)', async () => {
      const userBefore = await prisma.user.findUnique({ where: { id: LEARNER_USER_ID } });
      const creditsBefore = userBefore?.aiimsCredits;

      const req = createMockReq(
        {
          id: LEARNER_USER_ID,
          name: 'Market Learner',
          role: 'learner',
          aiWallet: (userBefore as any).aiWalletData,
        },
        { toolId: 'tool-chatgpt' }
      );
      const res = createMockRes();

      await removeFromWallet(req, res);

      const userAfter = await prisma.user.findUnique({ where: { id: LEARNER_USER_ID } });
      expect(userAfter?.aiimsCredits).toBe(creditsBefore);
    });

    it('is non-destructive: catalog AiTool record remains completely intact', async () => {
      const toolBefore = await prisma.aiTool.findUnique({ where: { id: 'tier2-growth-tool' } });
      expect(toolBefore).not.toBeNull();

      const user = await prisma.user.findUnique({ where: { id: LEARNER_USER_ID } });
      const req = createMockReq(
        {
          id: LEARNER_USER_ID,
          name: 'Market Learner',
          role: 'learner',
          aiWallet: (user as any).aiWalletData,
        },
        { toolId: 'tier2-growth-tool' }
      );
      const res = createMockRes();

      await removeFromWallet(req, res);

      const toolAfter = await prisma.aiTool.findUnique({ where: { id: 'tier2-growth-tool' } });
      expect(toolAfter).not.toBeNull();
      expect(toolAfter?.name).toBe('Cursor Editor');
    });

    it('writes audit log on wallet tool removal', async () => {
      const user = await prisma.user.findUnique({ where: { id: LEARNER_USER_ID } });
      const req = createMockReq(
        {
          id: LEARNER_USER_ID,
          name: 'Market Learner',
          role: 'learner',
          aiWallet: (user as any).aiWalletData,
        },
        { toolId: 'tool-cursor' }
      );
      const res = createMockRes();

      await removeFromWallet(req, res);

      const auditLogs = await prisma.auditLog.findMany({
        where: { action: 'WALLET_TOOL_REMOVED' },
      });
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].target).toBe('tool-cursor');
    });
  });

  // =========================================================================
  // 5. Outdated-Information Reporting Endpoint (POST /wallet/tools/:id/report)
  // =========================================================================
  describe('5. Outdated-Information Reporting Endpoint', () => {
    it('submits a valid outdated information report with status PENDING', async () => {
      const req = createMockReq(
        { id: LEARNER_USER_ID, name: 'Market Learner', role: 'learner' },
        {
          reportCategory: 'PRICING_OUTDATED',
          description: 'Pricing has been updated from $20 to $25 per month on vendor site.',
          sourceUrl: 'https://www.cursor.com/pricing',
        },
        {},
        { id: 'tier2-growth-tool' }
      );
      const res = createMockRes();

      await reportOutdatedTool(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.report).toHaveProperty('id');
      expect(res.body.report.toolId).toBe('tier2-growth-tool');
      expect(res.body.report.reportCategory).toBe('PRICING_OUTDATED');
      expect(res.body.report.status).toBe('PENDING');
      expect(res.body.report.sourceUrl).toBe('https://www.cursor.com/pricing');
    });

    it('enforces authentication: rejects unauthenticated caller with 401', async () => {
      const req = createMockReq(
        null,
        {
          reportCategory: 'LINK_BROKEN',
          description: 'Documentation link returns 404 error.',
        },
        {},
        { id: 'tier2-growth-tool' }
      );
      const res = createMockRes();

      await reportOutdatedTool(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('rejects report for nonexistent tool with 404', async () => {
      const req = createMockReq(
        { id: LEARNER_USER_ID, name: 'Market Learner', role: 'learner' },
        {
          reportCategory: 'TIER_INCORRECT',
          description: 'This tool is marked incorrectly.',
        },
        {},
        { id: 'nonexistent-tool-999' }
      );
      const res = createMockRes();

      await reportOutdatedTool(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('TOOL_NOT_FOUND');
    });

    it('duplicate prevention: rejects duplicate pending report for same tool and category with 409', async () => {
      const req1 = createMockReq(
        { id: LEARNER_USER_ID, name: 'Market Learner', role: 'learner' },
        {
          reportCategory: 'CAPABILITY_CHANGED',
          description: 'New multimodal capabilities added to tool.',
        },
        {},
        { id: 'tier3-leading-tool' }
      );
      const res1 = createMockRes();
      await reportOutdatedTool(req1, res1);
      expect(res1.statusCode).toBe(201);

      // Attempt second submission with same category and tool
      const req2 = createMockReq(
        { id: LEARNER_USER_ID, name: 'Market Learner', role: 'learner' },
        {
          reportCategory: 'CAPABILITY_CHANGED',
          description: 'Second report attempting to duplicate.',
        },
        {},
        { id: 'tier3-leading-tool' }
      );
      const res2 = createMockRes();
      await reportOutdatedTool(req2, res2);

      expect(res2.statusCode).toBe(409);
      expect(res2.body.code).toBe('DUPLICATE_REPORT');
    });

    it('tamper resistance: ignores learner status and reviewerId attempts, forcing status to PENDING', async () => {
      const req = createMockReq(
        { id: LEARNER_USER_ID, name: 'Market Learner', role: 'learner' },
        {
          reportCategory: 'OTHER',
          description: 'Vendor acquired by larger tech enterprise.',
          status: 'RESOLVED', // Tampering attempt
          reviewerId: 'malicious-override', // Tampering attempt
          reviewNotes: 'Auto-resolved by learner', // Tampering attempt
        },
        {},
        { id: 'tier1-starter-tool' }
      );
      const res = createMockRes();

      await reportOutdatedTool(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.report.status).toBe('PENDING');

      // Verify database record
      const dbReport = await (prisma as any).toolReport.findUnique({
        where: { id: res.body.report.id },
      });
      expect(dbReport.status).toBe('PENDING');
      expect(dbReport.reviewerId).toBeNull();
      expect(dbReport.reviewNotes).toBeNull();
    });

    it('rejects submission if body toolId conflicts with route parameter toolId (400 TOOL_ID_MISMATCH)', async () => {
      const req = createMockReq(
        { id: LEARNER_USER_ID, name: 'Market Learner', role: 'learner' },
        {
          toolId: 'conflicting-tool-id',
          reportCategory: 'PRICING_OUTDATED',
          description: 'Testing route parameter integrity.',
        },
        {},
        { id: 'tier2-growth-tool' }
      );
      const res = createMockRes();

      await reportOutdatedTool(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('TOOL_ID_MISMATCH');
    });

    it('persists report to Prisma database and does not swallow errors', async () => {
      const req = createMockReq(
        { id: LEARNER_USER_ID, name: 'Market Learner', role: 'learner' },
        {
          reportCategory: 'PRICING_OUTDATED',
          description: 'Official price dropped from $30 to $20.',
          sourceUrl: 'https://aider.chat/pricing',
        },
        {},
        { id: 'tier1-starter-tool' }
      );
      const res = createMockRes();

      await reportOutdatedTool(req, res);

      expect(res.statusCode).toBe(201);
      const createdId = res.body.report.id;

      // Authoritative database check
      const persisted = await (prisma as any).toolReport.findUnique({
        where: { id: createdId },
      });
      expect(persisted).not.toBeNull();
      expect(persisted.toolId).toBe('tier1-starter-tool');
      expect(persisted.status).toBe('PENDING');
    });

    it('writes audit log on tool report submission', async () => {
      const req = createMockReq(
        { id: LEARNER_USER_ID, name: 'Market Learner', role: 'learner' },
        {
          reportCategory: 'LINK_BROKEN',
          description: 'Official vendor homepage link is broken.',
          sourceUrl: 'https://aider.chat',
        },
        {},
        { id: 'tier1-starter-tool' }
      );
      const res = createMockRes();

      await reportOutdatedTool(req, res);
      expect(res.statusCode).toBe(201);

      const auditLogs = await prisma.auditLog.findMany({
        where: { action: 'TOOL_REPORT_SUBMITTED' },
      });
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs.some((l) => l.target === 'tier1-starter-tool')).toBe(true);
    });
  });

  // =========================================================================
  // 6. Phase E Scope Boundary & Admin Route Protection
  // =========================================================================
  describe('6. Phase E Scope Boundary & Admin Route Protection', () => {
    it('verifies admin tool-report review routes are deferred to Phase E and not registered in router', () => {
      const routes = (aiWalletRouter as any).stack
        ?.filter((layer: any) => layer.route)
        ?.map((layer: any) => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods),
        }));

      const hasAdminReportGet = routes.some(
        (r: any) => r.path === '/admin/tool-reports' && r.methods.includes('get')
      );
      const hasAdminReportPatch = routes.some(
        (r: any) => r.path === '/admin/tool-reports/:id' && r.methods.includes('patch')
      );

      // Both must be strictly false in Phase C / C.1 (deferred to Phase E)
      expect(hasAdminReportGet).toBe(false);
      expect(hasAdminReportPatch).toBe(false);
    });

    it('preserves existing pre-Phase C Discovery and Tool Management admin handlers', async () => {
      const req = createMockReq({ id: ADMIN_USER_ID, role: 'admin' });
      const res = createMockRes();

      await getAdminCandidates(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('candidates');

      const resDash = createMockRes();
      await getAdminDashboard(req, resDash);
      expect(resDash.statusCode).toBe(200);
      expect(resDash.body).toHaveProperty('totalToolsInCatalog');
    });
  });

  // =========================================================================
  // 7. Dynamic Tool Comparison Compatibility & Economy Invariants
  // =========================================================================
  describe('7. Dynamic Tool Comparison Compatibility', () => {
    it('compares tools dynamically, preserving market tier labels and zero economy cost', async () => {
      const req = createMockReq(
        { id: LEARNER_USER_ID, aiimsCredits: 500 },
        {
          toolIds: ['tool-cursor', 'tool-notebooklm'],
          userRequirement: 'Need AI assistance for coding and documentation',
        }
      );
      const res = createMockRes();

      compareTools(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('tools');
      expect(res.body).toHaveProperty('comparisonCriteria');
      expect(res.body).toHaveProperty('fitAnalysis');
      expect(res.body).toHaveProperty('overallSynthesis');

      for (const t of res.body.tools) {
        expect(t).toHaveProperty('marketTierName');
        expect(t).toHaveProperty('marketTierLabel');
      }

      // Check user credits untouched
      const user = await prisma.user.findUnique({ where: { id: LEARNER_USER_ID } });
      expect(user?.aiimsCredits).toBe(500);
    });
  });
});
