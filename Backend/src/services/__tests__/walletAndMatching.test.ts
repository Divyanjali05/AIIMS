import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { creditsLedgerService } from '../creditsLedger.service';
import { ToolCatalogService } from '../wallet/toolCatalog.service';
import { ToolMatchingService } from '../wallet/toolMatching.service';
import { CREDIT_RULES } from '../../config/credits.config';
import { prisma } from '../../config/prisma';
import { resetPrismaTestDouble, uninstallPrismaTestDouble } from './helpers/prismaTestDouble';

describe('AIIMS AI Wallet & Intelligent Tool Matching', () => {
  const TEST_USER = 'vitest-wallet-learner-001';

  beforeEach(() => {
    resetPrismaTestDouble(true);
    ToolCatalogService.initializeCatalog();
  });

  afterAll(() => {
    uninstallPrismaTestDouble();
  });

  async function seedUser(id: string, credits: number = 0) {
    await prisma.user.create({
      data: {
        id,
        email: `${id}@vitest.aiims.edu`,
        name: id,
        password: 'hash',
        role: 'learner',
        aiimsCredits: credits,
      },
    });
  }

  describe('Authoritative Balance & Ledger Operations', () => {
    it('initializes balance and computes earned/spent metrics correctly', async () => {
      const uId = `user-bal-${Date.now()}`;
      await seedUser(uId, 0);

      const bal0 = await creditsLedgerService.getBalance(uId);
      expect(bal0).toBe(0);

      // Reward 50 AC
      const reward = await creditsLedgerService.rewardCredits(
        uId,
        CREDIT_RULES.ASSESSMENT_COMPLETION.credits,
        'assessment',
        'Diagnostic Assessment Reward',
        `diag-${Date.now()}`
      );
      expect(reward.success).toBe(true);
      expect(reward.newBalance).toBe(50);

      // Deduct 10 AC
      const spend = await creditsLedgerService.deductCredits(
        uId,
        10,
        'clarity',
        'Clarity Task Prompt',
        `clarity-${Date.now()}`
      );
      expect(spend.success).toBe(true);
      expect(spend.newBalance).toBe(40);

      const history = await creditsLedgerService.getLedgerHistory(uId);
      expect(history.balance).toBe(40);
      expect(history.totalEarned).toBe(50);
      expect(history.totalSpent).toBe(10);
      expect(history.totalRefunded).toBe(0);
    });

    it('rejects deduction when balance is insufficient (HTTP 402 invariant)', async () => {
      const uId = `user-overdraft-${Date.now()}`;
      await seedUser(uId, 0);

      await creditsLedgerService.rewardCredits(
        uId,
        5,
        'reward',
        'Pocket credits',
        `pocket-${Date.now()}`
      );

      const spend = await creditsLedgerService.deductCredits(
        uId,
        10,
        'clarity',
        'Clarity Prompt Attempt',
        `fail-${Date.now()}`
      );
      expect(spend.success).toBe(false);
      expect(spend.code).toBe('INSUFFICIENT_CREDITS');

      const bal = await creditsLedgerService.getBalance(uId);
      expect(bal).toBe(5);
    });

    it('deduplicates duplicate requests via idempotency key without double charges or rewards', async () => {
      const uId = `user-idemp-${Date.now()}`;
      await seedUser(uId, 0);
      const idempKey = `fixed-key-${Date.now()}`;

      const res1 = await creditsLedgerService.rewardCredits(
        uId,
        30,
        'reward',
        'Signal reward',
        idempKey
      );
      expect(res1.success).toBe(true);
      expect(res1.newBalance).toBe(30);

      const res2 = await creditsLedgerService.rewardCredits(
        uId,
        30,
        'reward',
        'Signal reward',
        idempKey
      );
      expect(res2.duplicate).toBe(true);
      expect(res2.newBalance).toBe(30);

      const finalBal = await creditsLedgerService.getBalance(uId);
      expect(finalBal).toBe(30);
    });

    it('automatically refunds credits when task execution encounters an unhandled failure', async () => {
      const uId = `user-refund-${Date.now()}`;
      await seedUser(uId, 0);

      await creditsLedgerService.rewardCredits(
        uId,
        50,
        'reward',
        'Seed credits',
        `seed-${Date.now()}`
      );

      let threw = false;
      try {
        await creditsLedgerService.executeTaskWithRefund({
          userId: uId,
          cost: 10,
          taskTitle: 'Failing AI Task',
          source: 'clarity_task_run',
          taskFn: async () => {
            throw new Error('Upstream provider timeout (504 Gateway Timeout)');
          },
        });
      } catch (err: any) {
        threw = true;
      }
      expect(threw).toBe(true);

      const balAfter = await creditsLedgerService.getBalance(uId);
      expect(balAfter).toBe(50);

      const history = await creditsLedgerService.getLedgerHistory(uId);
      expect(history.totalRefunded).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Tool Catalog & Grounded Matching', () => {
    it('contains verified industry tools with complete metadata', () => {
      const catalog = ToolCatalogService.getCatalog();
      expect(catalog.length).toBeGreaterThanOrEqual(10);
      for (const tool of catalog) {
        expect(tool.id).toBeTruthy();
        expect(tool.name).toBeTruthy();
        expect(tool.provider).toBeTruthy();
        expect(tool.category).toBeTruthy();
        expect(tool.capabilities.length).toBeGreaterThan(0);
        expect(tool.pricingDetails).toBeDefined();
      }
    });

    it('accurately matches writing tasks with reasoning models', () => {
      const res = ToolMatchingService.searchTools(
        'Draft academic literature review with APA citations'
      );
      expect(res.matches.length).toBeGreaterThan(0);
      const topMatch = res.matches[0].tool.id;
      expect(['tool-chatgpt', 'tool-claude']).toContain(topMatch);
      expect(res.matches[0].whyMatches.length).toBeGreaterThan(0);
    });

    it('accurately matches presentation generation tasks with Gamma', () => {
      const res = ToolMatchingService.searchTools('Create investor pitch deck slides with visuals');
      expect(res.matches.length).toBeGreaterThan(0);
      expect(res.matches[0].tool.id).toBe('tool-gamma');
    });

    it('accurately matches coding tasks with Cursor, Copilot, or v0', () => {
      const res = ToolMatchingService.searchTools(
        'Full-stack TypeScript React code editor and autocomplete'
      );
      expect(res.matches.length).toBeGreaterThan(0);
      expect(['tool-cursor', 'tool-copilot', 'tool-v0']).toContain(res.matches[0].tool.id);
    });

    it('accurately matches tabular data tasks with Julius', () => {
      const res = ToolMatchingService.searchTools(
        'Clean tabular CSV data, run regression statistics and plot charts'
      );
      expect(res.matches.length).toBeGreaterThan(0);
      expect(['tool-julius', 'tool-chatgpt']).toContain(res.matches[0].tool.id);
    });

    it('guarantees that all matched tools exist in verified catalog (no phantom tools)', () => {
      const res = ToolMatchingService.searchTools(
        'Any complex workflow across coding and research'
      );
      const catalog = ToolCatalogService.getCatalog();
      for (const m of res.matches) {
        expect(catalog.some((c) => c.id === m.tool.id)).toBe(true);
      }
    });
  });
});
