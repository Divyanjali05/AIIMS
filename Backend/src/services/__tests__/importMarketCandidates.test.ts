import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../config/prisma';
import { installPrismaTestDouble, resetPrismaTestDouble } from './helpers/prismaTestDouble';
import {
  validateCandidate,
  planImport,
  candidateToAiToolPayload,
  buildSafeMetadataUpdatePayload,
  PERMITTED_UPDATE_FIELDS,
  generateImportPreview,
  resolveDatasetPath,
  resolvePreviewOutputPath,
  RawMarketCandidate,
  ExistingToolRecord,
} from '../../scripts/importMarketCandidates';
import { SEED_TOOL_CATALOG } from '../../data/aiimsCatalog';
import path from 'path';
import fs from 'fs';

describe('AIIMS Market AI Tools Catalog — Phase F.1 Candidate Import Pipeline Suite', () => {
  beforeEach(async () => {
    installPrismaTestDouble();
    resetPrismaTestDouble(true);
  });

  const validVerifiedCandidate: RawMarketCandidate = {
    id: 'tool-test-verified',
    name: 'Test Verified AI',
    provider: 'Test Vendor Labs',
    officialWebsite: 'https://testvendor.ai',
    primaryDomain: 'reasoning-writing',
    secondaryDomains: ['agentic-coding'],
    shortDescription: 'State-of-the-art reasoning assistant for research and writing.',
    freePlan: 'Yes',
    freePlanDetails: 'Free tier with 100 queries/day.',
    paidPlans: [{ name: 'Pro', price: 20, currency: 'USD', billingPeriod: 'monthly' }],
    pricingSourceUrl: 'https://testvendor.ai/pricing',
    pricingVerifiedAt: '2026-11-15T00:00:00.000Z',
    marketTier: 2,
    tierReason: 'Fast-growing venture-backed AI startup with documented team adoption.',
    tierSourceUrl: 'https://testvendor.ai/about',
    skillLevel: 'Intermediate',
    verificationStatus: 'VERIFIED',
  };

  // --------------------------------------------------------------------------
  // Suite 1: Status Eligibility & Ingestion Filtering
  // --------------------------------------------------------------------------
  describe('1. Verification Status Filtering & Exclusion Rules', () => {
    it('1A: Accepts candidate whose status is strictly VERIFIED', () => {
      const res = validateCandidate(validVerifiedCandidate);
      expect(res.valid).toBe(true);
      expect(res.eligible).toBe(true);
      expect(res.errors.length).toBe(0);
    });

    it('1B: Excludes NEEDS_REVIEW candidate with explicit owner review notice', () => {
      const candidate: RawMarketCandidate = {
        ...validVerifiedCandidate,
        id: 'tool-test-needs-review',
        verificationStatus: 'NEEDS_REVIEW',
      };
      const res = validateCandidate(candidate);
      expect(res.eligible).toBe(false);
      expect(res.exclusionReason).toContain('NEEDS_REVIEW');
      expect(res.exclusionReason).toContain('Decision D-1');
    });

    it('1C: Excludes UNVERIFIED candidate (closed beta / unverified)', () => {
      const candidate: RawMarketCandidate = {
        ...validVerifiedCandidate,
        id: 'tool-test-unverified',
        verificationStatus: 'UNVERIFIED',
      };
      const res = validateCandidate(candidate);
      expect(res.eligible).toBe(false);
      expect(res.exclusionReason).toContain('UNVERIFIED');
    });

    it('1D: Excludes REJECTED candidate (discontinued / dead domain)', () => {
      const candidate: RawMarketCandidate = {
        ...validVerifiedCandidate,
        id: 'tool-test-rejected',
        verificationStatus: 'REJECTED',
      };
      const res = validateCandidate(candidate);
      expect(res.eligible).toBe(false);
      expect(res.exclusionReason).toContain('REJECTED');
    });
  });

  // --------------------------------------------------------------------------
  // Suite 2: Field Validation & Provenance Requirements
  // --------------------------------------------------------------------------
  describe('2. Metadata Validation & Evidence Requirements', () => {
    it('2A: Rejects candidate with missing official website URL', () => {
      const candidate: RawMarketCandidate = {
        ...validVerifiedCandidate,
        id: 'tool-test-no-website',
        officialWebsite: '',
      };
      const res = validateCandidate(candidate);
      expect(res.valid).toBe(false);
      expect(res.eligible).toBe(false);
      expect(res.errors.some((e) => e.field === 'officialWebsite')).toBe(true);
    });

    it('2B: Rejects candidate with invalid website URL protocol (e.g. ftp:// or malformed)', () => {
      const candidate: RawMarketCandidate = {
        ...validVerifiedCandidate,
        id: 'tool-test-bad-url',
        officialWebsite: 'not-a-valid-url',
      };
      const res = validateCandidate(candidate);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === 'officialWebsite')).toBe(true);
    });

    it('2C: Rejects candidate with missing pricing source URL', () => {
      const candidate: RawMarketCandidate = {
        ...validVerifiedCandidate,
        id: 'tool-test-no-pricing-url',
        pricingSourceUrl: '',
      };
      const res = validateCandidate(candidate);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === 'pricingSourceUrl')).toBe(true);
    });

    it('2D: Rejects candidate with invalid pricing verification timestamp', () => {
      const candidate: RawMarketCandidate = {
        ...validVerifiedCandidate,
        id: 'tool-test-bad-date',
        pricingVerifiedAt: 'invalid-date-string',
      };
      const res = validateCandidate(candidate);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === 'pricingVerifiedAt')).toBe(true);
    });

    it('2E: Rejects candidate with invalid market tier (<1, >4, or non-numeric)', () => {
      const candidateHigh: RawMarketCandidate = {
        ...validVerifiedCandidate,
        id: 'tool-test-tier-high',
        marketTier: 5,
      };
      const resHigh = validateCandidate(candidateHigh);
      expect(resHigh.valid).toBe(false);
      expect(resHigh.errors.some((e) => e.field === 'marketTier')).toBe(true);

      const candidateNull: RawMarketCandidate = {
        ...validVerifiedCandidate,
        id: 'tool-test-tier-null',
        marketTier: null,
      };
      const resNull = validateCandidate(candidateNull);
      expect(resNull.valid).toBe(false);
      expect(resNull.errors.some((e) => e.field === 'marketTier')).toBe(true);
    });

    it('2F: Rejects candidate with invalid canonical domain ID', () => {
      const candidate: RawMarketCandidate = {
        ...validVerifiedCandidate,
        id: 'tool-test-bad-domain',
        primaryDomain: 'arbitrary-unapproved-domain',
      };
      const res = validateCandidate(candidate);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === 'primaryDomain')).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 3: Deduplication & Conflict Detection
  // --------------------------------------------------------------------------
  describe('3. Deduplication & Conflict Detection', () => {
    it('3A: Detects duplicate candidate IDs in dataset', () => {
      const batch = [
        validVerifiedCandidate,
        { ...validVerifiedCandidate, name: 'Different Name But Same ID' },
      ];
      const plan = planImport(batch, []);
      expect(plan.conflicts.length).toBe(1);
      expect(plan.conflicts[0].reason).toContain('Duplicate candidate ID');
    });

    it('3B: Detects duplicate tool identity (normalized name + provider)', () => {
      const tool1: RawMarketCandidate = {
        ...validVerifiedCandidate,
        id: 'tool-id-first',
        name: 'Super AI Tool',
        provider: 'Innovate AI Labs',
      };
      const tool2: RawMarketCandidate = {
        ...validVerifiedCandidate,
        id: 'tool-id-second',
        name: 'super ai tool', // case-insensitive match
        provider: 'innovate ai labs',
      };

      const plan = planImport([tool1, tool2], []);
      expect(plan.conflicts.length).toBe(1);
      expect(plan.conflicts[0].reason).toContain('Duplicate tool identity');
    });
  });

  // --------------------------------------------------------------------------
  // Suite 4: Legacy 20-Tool Catalog Synchronization & Non-Destructive Update
  // --------------------------------------------------------------------------
  describe('4. Legacy 20-Tool Catalog Synchronization & Non-Destructive Update', () => {
    it('4A: Matches existing legacy seed tool and classifies as non-destructive UPDATE', () => {
      const legacyChatGpt: ExistingToolRecord = {
        id: 'tool-chatgpt',
        name: 'ChatGPT (GPT-4o)',
        category: 'Reasoning & Writing',
        provider: 'OpenAI',
        marketTier: null,
      };

      const candidateChatGpt: RawMarketCandidate = {
        ...validVerifiedCandidate,
        id: 'tool-chatgpt',
        name: 'ChatGPT (GPT-4o)',
        provider: 'OpenAI',
        primaryDomain: 'reasoning-writing',
        marketTier: 3,
      };

      const plan = planImport([candidateChatGpt], [legacyChatGpt]);
      expect(plan.proposedCreates.length).toBe(0);
      expect(plan.proposedUpdates.length).toBe(1);
      expect(plan.proposedUpdates[0].id).toBe('tool-chatgpt');
      expect(plan.proposedUpdates[0].marketTier).toBe(3);
      expect(plan.proposedUpdates[0].safeUpdatePayload.marketTier).toBe(3);
    });

    it('4B: Classifies new non-legacy tool as CREATE', () => {
      const legacyChatGpt: ExistingToolRecord = {
        id: 'tool-chatgpt',
        name: 'ChatGPT (GPT-4o)',
        category: 'Reasoning & Writing',
        provider: 'OpenAI',
      };

      const candidateNew: RawMarketCandidate = {
        ...validVerifiedCandidate,
        id: 'tool-new-unknown-tool',
        name: 'Brand New AI',
      };

      const plan = planImport([candidateNew], [legacyChatGpt]);
      expect(plan.proposedCreates.length).toBe(1);
      expect(plan.proposedUpdates.length).toBe(0);
      expect(plan.proposedCreates[0].id).toBe('tool-new-unknown-tool');
    });

    it('4C: Payload mapping preserves structured pricingDetails and subdomains', () => {
      const payload = candidateToAiToolPayload(validVerifiedCandidate);
      expect(payload.id).toBe('tool-test-verified');
      expect(payload.category).toBe('reasoning-writing');
      expect(payload.categories as string[]).toContain('agentic-coding');
      expect(payload.marketTier).toBe(2);
      expect(payload.pricingSourceUrl).toBe('https://testvendor.ai/pricing');
      expect(payload.verificationStatus).toBe('VERIFIED');
    });
  });

  // --------------------------------------------------------------------------
  // Suite 5: Safety Invariants: Dry-Run, Balances & Zero Side Effects
  // --------------------------------------------------------------------------
  describe('5. Safety Invariants: Dry-Run, Zero DB Writes & Zero Balance Mutations', () => {
    it('5A: Dry-run planning executes without modifying user AC or XP balances', async () => {
      const testUser = await prisma.user.create({
        data: {
          id: 'user-balance-test-01',
          email: 'balance.test@aiims.test',
          name: 'Balance Test User',
          aiimsCredits: 500,
          xpPoints: 100,
        },
      });

      const sampleCandidates = [
        validVerifiedCandidate,
        { ...validVerifiedCandidate, id: 'tool-test-sample-02', name: 'Sample 2' },
      ];

      const plan = planImport(sampleCandidates, []);
      expect(plan.proposedCreates.length).toBe(2);

      // Verify user balance is strictly untouched
      const userAfter = await prisma.user.findUnique({ where: { id: testUser.id } });
      expect(userAfter?.aiimsCredits).toBe(500);
      expect(userAfter?.xpPoints).toBe(100);
    });

    it('5B: Dry-run planning executes zero database writes on AiTool table', async () => {
      const countBefore = await prisma.aiTool.count();

      const sampleCandidates = [
        validVerifiedCandidate,
        { ...validVerifiedCandidate, id: 'tool-test-sample-03', name: 'Sample 3' },
      ];

      const plan = planImport(sampleCandidates, []);
      expect(plan.proposedCreates.length).toBe(2);

      const countAfter = await prisma.aiTool.count();
      expect(countAfter).toBe(countBefore);
    });

    it('5C: Failed validation stops candidate from being added to proposed creates or updates', () => {
      const invalidCandidate: RawMarketCandidate = {
        ...validVerifiedCandidate,
        id: 'tool-test-invalid',
        officialWebsite: 'not-valid-url',
      };

      const plan = planImport([invalidCandidate], []);
      expect(plan.proposedCreates.length).toBe(0);
      expect(plan.proposedUpdates.length).toBe(0);
      expect(plan.validationFailures.length).toBeGreaterThan(0);
      expect(plan.eligibleIds.length).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 6: Full Candidate Dataset Verification (66 Candidates on Disk)
  // --------------------------------------------------------------------------
  describe('6. Full Repository Dataset Audit (66 Candidates)', () => {
    it('6A: Evaluates actual AIIMS_MARKET_TOOLS_CANDIDATES.json and produces exact expected counts with NotebookLM skipped', () => {
      const candidatesPath = resolveDatasetPath('AIIMS_MARKET_TOOLS_CANDIDATES.json');
      const previewOutputPath = resolvePreviewOutputPath('AIIMS_MARKET_TOOLS_IMPORT_PREVIEW.json');

      expect(fs.existsSync(candidatesPath)).toBe(true);

      const plan = generateImportPreview(candidatesPath, previewOutputPath);

      // Verify exact counts established in Phase F.0 readiness audit & F.1.2 corrections
      expect(plan.totalInspected).toBe(66);
      expect(plan.eligibleVerifiedCount).toBe(53);
      expect(plan.excludedCount).toBe(13);
      expect(plan.excludedBreakdown.needsReview).toBe(6);
      expect(plan.excludedBreakdown.unverified).toBe(4);
      expect(plan.excludedBreakdown.rejected).toBe(3);

      // Verify proposed database actions against 20-tool legacy seed
      expect(plan.proposedUpdates.length).toBe(18); // 18 updates (was 19; notebooklm skipped)
      expect(plan.skippedOwnerApproval.length).toBe(1);
      expect(plan.skippedOwnerApproval[0].id).toBe('tool-notebooklm');
      expect(plan.skippedAlreadyImported.length).toBe(0);
      expect(plan.proposedCreates.length).toBe(34);
      expect(plan.conflicts.length).toBe(0);
      expect(plan.validationFailures.length).toBe(0);

      // Verify machine-readable preview was created and contains previewContext
      expect(fs.existsSync(previewOutputPath)).toBe(true);
      const previewContent = JSON.parse(fs.readFileSync(previewOutputPath, 'utf8'));
      expect(previewContent.summary.totalInspected).toBe(66);
      expect(previewContent.summary.eligibleVerified).toBe(53);
      expect(previewContent.summary.proposedUpdateCount).toBe(18);
      expect(previewContent.summary.skippedOwnerApprovalCount).toBe(1);
      expect(previewContent.previewContext.previewType).toBe('REPOSITORY_PRELIMINARY_PREVIEW');
      expect(previewContent.previewContext.isDatabaseSnapshot).toBe(false);
      expect(previewContent.eligibleCandidateIds.length).toBe(53);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 7: Phase F.1.2 Data Integrity Corrections (F-1 Allowlist & F-2 Dynamic State)
  // --------------------------------------------------------------------------
  describe('7. Phase F.1.2 Data Integrity Corrections (F-1 & F-2)', () => {
    it('7A: buildSafeMetadataUpdatePayload contains strictly allowlisted fields and never identity/description fields', () => {
      const candidate: RawMarketCandidate = {
        ...validVerifiedCandidate,
        name: 'Overwritten Candidate Name',
        provider: 'Overwritten Candidate Provider',
        officialWebsite: 'https://different-website.com',
        shortDescription: 'Overwritten candidate description',
        keyCapabilities: ['Different Capability A', 'Different Capability B'],
      };

      const { payload, changedFields } = buildSafeMetadataUpdatePayload(candidate);

      // Allowed fields
      expect(payload.marketTier).toBe(2);
      expect(payload.pricingDetails).toBeDefined();
      expect(payload.pricingSourceUrl).toBe('https://testvendor.ai/pricing');
      expect(payload.pricingVerifiedAt).toBeInstanceOf(Date);
      expect(payload.lastVerifiedAt).toBeDefined();
      expect(payload.domains).toEqual(['reasoning-writing', 'agentic-coding']);

      // Prohibited fields must be strictly undefined
      expect(payload.id).toBeUndefined();
      expect(payload.name).toBeUndefined();
      expect(payload.provider).toBeUndefined();
      expect(payload.officialWebsite).toBeUndefined();
      expect(payload.websiteUrl).toBeUndefined();
      expect(payload.description).toBeUndefined();
      expect(payload.shortDescription).toBeUndefined();
      expect(payload.capabilities).toBeUndefined();
      expect(payload.useCases).toBeUndefined();
      expect(payload.strengths).toBeUndefined();
      expect(payload.limitations).toBeUndefined();
      expect(payload.taskMappings).toBeUndefined();

      // changedFields strictly matches allowlist
      expect(changedFields).toEqual([
        'marketTier',
        'pricingDetails',
        'pricingSourceUrl',
        'pricingVerifiedAt',
        'lastVerifiedAt',
        'domains',
      ]);
    });

    it('7B: Metadata enrichment on existing tool preserves name, provider, description, capabilities, strengths, limitations, taskMappings, and officialWebsite', async () => {
      // 1. Seed curated legacy tool in database
      const existing = await prisma.aiTool.create({
        data: {
          id: 'tool-legacy-curated',
          name: 'ChatGPT (GPT-4o)',
          provider: 'OpenAI',
          category: 'Reasoning & Writing',
          officialWebsite: 'https://chatgpt.com',
          websiteUrl: 'https://chatgpt.com',
          description: 'Curated comprehensive legacy description.',
          shortDescription: 'Multi-modal AI assistant for writing, coding, and general tasks.',
          capabilities: ['General Reasoning', 'Creative Writing', 'Code Generation'],
          useCases: ['Drafting documentation', 'General problem solving'],
          strengths: ['High general knowledge', 'Extensive custom GPT ecosystem'],
          limitations: ['200k context limit on web', 'Strict safety alignment'],
          taskMappings: ['Draft documentation', 'Summarize text'],
          pricing: 'Free tier available • Plus at $20/mo',
          pricingDetails: { type: 'FREEMIUM' },
          firstSeenAt: '2026-09-01T00:00:00.000Z',
          lastVerifiedAt: '2026-09-01T00:00:00.000Z',
          lastUpdatedAt: '2026-09-01T00:00:00.000Z',
        },
      });

      // 2. Candidate provides different corporate entity, description, and tier
      const candidate: RawMarketCandidate = {
        ...validVerifiedCandidate,
        id: 'tool-legacy-curated',
        name: 'ChatGPT (GPT-4o)',
        provider: 'OpenAI, LLC', // Corporate suffix
        shortDescription: 'Different candidate description that must NOT overwrite',
        officialWebsite: 'https://chatgpt.com',
        primaryDomain: 'reasoning-writing',
        marketTier: 3,
        pricingSourceUrl: 'https://openai.com/chatgpt/pricing',
        pricingVerifiedAt: '2026-11-15T00:00:00.000Z',
      };

      const plan = planImport([candidate], [existing as any]);
      expect(plan.proposedUpdates.length).toBe(1);
      const updateItem = plan.proposedUpdates[0];

      // 3. Apply safeUpdatePayload to database
      await prisma.aiTool.update({
        where: { id: updateItem.id },
        data: updateItem.safeUpdatePayload as any,
      });

      // 4. Verify all curated fields are 100% preserved
      const updated = await prisma.aiTool.findUnique({ where: { id: 'tool-legacy-curated' } });
      expect(updated?.name).toBe('ChatGPT (GPT-4o)'); // Preserved
      expect(updated?.provider).toBe('OpenAI'); // Preserved (not overwritten by OpenAI, LLC)
      expect(updated?.officialWebsite).toBe('https://chatgpt.com'); // Preserved
      expect(updated?.description).toBe('Curated comprehensive legacy description.'); // Preserved
      expect(updated?.shortDescription).toBe(
        'Multi-modal AI assistant for writing, coding, and general tasks.'
      ); // Preserved
      expect(updated?.capabilities).toEqual([
        'General Reasoning',
        'Creative Writing',
        'Code Generation',
      ]); // Preserved
      expect(updated?.strengths).toEqual([
        'High general knowledge',
        'Extensive custom GPT ecosystem',
      ]); // Preserved
      expect(updated?.limitations).toEqual([
        '200k context limit on web',
        'Strict safety alignment',
      ]); // Preserved
      expect(updated?.taskMappings).toEqual(['Draft documentation', 'Summarize text']); // Preserved

      // 5. Verify allowlisted metadata is enriched
      expect(updated?.marketTier).toBe(3); // Enriched
      expect(updated?.pricingSourceUrl).toBe('https://openai.com/chatgpt/pricing'); // Enriched
      expect(new Date(updated?.pricingVerifiedAt as any).toISOString()).toBe(
        '2026-11-15T00:00:00.000Z'
      ); // Enriched
    });

    it('7C: Preserves user wallet associations and custom ratings during tool enrichment', async () => {
      // Create tool and user with wallet
      await prisma.aiTool.create({
        data: {
          id: 'tool-wallet-preserve',
          name: 'Tool Wallet Test',
          provider: 'Wallet Provider',
          category: 'Video',
          officialWebsite: 'https://wallettest.ai',
          description: 'Tool for wallet test.',
          pricingDetails: { type: 'FREEMIUM' },
          firstSeenAt: new Date().toISOString(),
          lastVerifiedAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
        },
      });

      const user = await prisma.user.create({
        data: {
          id: 'user-wallet-test-01',
          email: 'wallet.preserve@aiims.test',
          name: 'Wallet Preserved User',
          aiWalletData: {
            userTools: [
              {
                toolId: 'tool-wallet-preserve',
                familiarityLevel: 'Daily Driver',
                proficiencyLevel: 'Expert',
                customRating: 5,
                addedAt: '2026-10-01T00:00:00.000Z',
              },
            ],
            dismissedRecommendations: [],
          },
        },
      });

      // Candidate updates marketTier
      const candidate: RawMarketCandidate = {
        ...validVerifiedCandidate,
        id: 'tool-wallet-preserve',
        name: 'Tool Wallet Test',
        marketTier: 2,
      };

      const plan = planImport(
        [candidate],
        [{ id: 'tool-wallet-preserve', name: 'Tool Wallet Test' }]
      );
      await prisma.aiTool.update({
        where: { id: 'tool-wallet-preserve' },
        data: plan.proposedUpdates[0].safeUpdatePayload as any,
      });

      // Verify user's wallet is completely intact
      const userAfter = await prisma.user.findUnique({ where: { id: user.id } });
      const wallet = userAfter?.aiWalletData as any;
      expect(wallet.userTools.length).toBe(1);
      expect(wallet.userTools[0].toolId).toBe('tool-wallet-preserve');
      expect(wallet.userTools[0].customRating).toBe(5);
      expect(wallet.userTools[0].familiarityLevel).toBe('Daily Driver');
    });

    it('7D: Preserves existing tool reports when tool metadata is enriched', async () => {
      await prisma.aiTool.create({
        data: {
          id: 'tool-report-preserve',
          name: 'Tool Report Test',
          provider: 'Report Provider',
          category: 'Video',
          officialWebsite: 'https://reporttest.ai',
          description: 'Tool for report test.',
          pricingDetails: { type: 'FREEMIUM' },
          firstSeenAt: new Date().toISOString(),
          lastVerifiedAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
        },
      });

      const user = await prisma.user.create({
        data: {
          id: 'user-reporter-test-01',
          email: 'reporter@aiims.test',
          name: 'Reporter User',
        },
      });

      const report = await prisma.toolReport.create({
        data: {
          id: 'report-test-01',
          toolId: 'tool-report-preserve',
          userId: user.id,
          reportCategory: 'PRICING_OUTDATED',
          description: 'Pricing changed from $10 to $12.',
          status: 'PENDING',
        },
      });

      // Update tool
      const candidate: RawMarketCandidate = {
        ...validVerifiedCandidate,
        id: 'tool-report-preserve',
        name: 'Tool Report Test',
        marketTier: 2,
      };
      const plan = planImport(
        [candidate],
        [{ id: 'tool-report-preserve', name: 'Tool Report Test' }]
      );
      await prisma.aiTool.update({
        where: { id: 'tool-report-preserve' },
        data: plan.proposedUpdates[0].safeUpdatePayload as any,
      });

      // Verify report relationship still exists and unchanged
      const reportAfter = await prisma.toolReport.findUnique({ where: { id: report.id } });
      expect(reportAfter).not.toBeNull();
      expect(reportAfter?.toolId).toBe('tool-report-preserve');
      expect(reportAfter?.status).toBe('PENDING');
    });

    it('7E: NotebookLM Exception: tool-notebooklm is skipped pending owner approval and not updated', () => {
      const existingNotebookLm: ExistingToolRecord = {
        id: 'tool-notebooklm',
        name: 'Google NotebookLM',
        provider: 'Google',
        category: 'Research & RAG',
        officialWebsite: 'https://notebooklm.google.com',
        marketTier: null,
      };

      const candidateNotebookLm: RawMarketCandidate = {
        ...validVerifiedCandidate,
        id: 'tool-notebooklm',
        name: 'Google NotebookLM',
        provider: 'Google LLC',
        primaryDomain: 'research-rag',
        marketTier: 3,
        pricingSourceUrl: 'https://notebooklm.google.com',
      };

      const plan = planImport([candidateNotebookLm], [existingNotebookLm]);

      expect(plan.proposedUpdates.length).toBe(0);
      expect(plan.proposedCreates.length).toBe(0);
      expect(plan.skippedOwnerApproval.length).toBe(1);
      expect(plan.skippedOwnerApproval[0].id).toBe('tool-notebooklm');
      expect(plan.skippedOwnerApproval[0].proposedTier).toBe(3);
      expect(plan.conflicts.length).toBe(0);
    });

    it('7F: Dynamic database matching identifies already-imported records and marks them SKIP_ALREADY_IMPORTED', () => {
      const alreadyImportedTool: ExistingToolRecord = {
        id: 'tool-already-done',
        name: 'Already Done AI',
        provider: 'Test Vendor Labs',
        marketTier: 2,
        pricingSourceUrl: 'https://testvendor.ai/pricing',
      };

      const candidate: RawMarketCandidate = {
        ...validVerifiedCandidate,
        id: 'tool-already-done',
        name: 'Already Done AI',
        marketTier: 2,
        pricingSourceUrl: 'https://testvendor.ai/pricing',
      };

      const plan = planImport([candidate], [alreadyImportedTool]);
      expect(plan.proposedUpdates.length).toBe(0);
      expect(plan.proposedCreates.length).toBe(0);
      expect(plan.skippedAlreadyImported.length).toBe(1);
      expect(plan.skippedAlreadyImported[0].id).toBe('tool-already-done');
    });

    it('7G: Repeated execution against populated catalog plans zero creates and zero duplicate collisions', () => {
      // Simulate live database where 2 tools were already created and tier set
      const dbTools: ExistingToolRecord[] = [
        {
          id: 'tool-test-verified',
          name: 'Test Verified AI',
          provider: 'Test Vendor Labs',
          marketTier: 2,
          pricingSourceUrl: 'https://testvendor.ai/pricing',
        },
        {
          id: 'tool-test-sample-02',
          name: 'Sample 2 AI',
          provider: 'Test Vendor Labs',
          marketTier: 2,
          pricingSourceUrl: 'https://testvendor.ai/pricing',
        },
      ];

      const candidates: RawMarketCandidate[] = [
        validVerifiedCandidate,
        {
          ...validVerifiedCandidate,
          id: 'tool-test-sample-02',
          name: 'Sample 2 AI',
        },
      ];

      const plan = planImport(candidates, dbTools, { isLiveDatabase: true });
      expect(plan.proposedCreates.length).toBe(0); // ZERO duplicates planned
      expect(plan.proposedUpdates.length).toBe(0); // ZERO redundant updates
      expect(plan.skippedAlreadyImported.length).toBe(2);
      expect(plan.previewContext.previewType).toBe('DATABASE_SYNCHRONIZED_PREVIEW');
      expect(plan.previewContext.isDatabaseSnapshot).toBe(true);
    });

    it('7H: Identity conflict stops unsafe update when candidate ID conflicts with different existing product', () => {
      const existingTool: ExistingToolRecord = {
        id: 'tool-conflict-id',
        name: 'Completely Different Tool Alpha',
        provider: 'Company A',
      };

      const candidate: RawMarketCandidate = {
        ...validVerifiedCandidate,
        id: 'tool-conflict-id',
        name: 'Unrelated Tool Zeta',
        provider: 'Company Z',
      };

      const plan = planImport([candidate], [existingTool]);
      expect(plan.proposedUpdates.length).toBe(0);
      expect(plan.proposedCreates.length).toBe(0);
      expect(plan.conflicts.length).toBe(1);
      expect(plan.conflicts[0].reason).toContain('Identity conflict');
    });

    it('7I: Identity conflict stops candidate when candidate name+provider matches an existing tool with different ID', () => {
      const existingTool: ExistingToolRecord = {
        id: 'tool-original-id',
        name: 'Unique Proprietary AI',
        provider: 'Innovate Labs',
      };

      const candidate: RawMarketCandidate = {
        ...validVerifiedCandidate,
        id: 'tool-different-slug-id',
        name: 'Unique Proprietary AI',
        provider: 'Innovate Labs',
      };

      const plan = planImport([candidate], [existingTool]);
      expect(plan.proposedCreates.length).toBe(0);
      expect(plan.conflicts.length).toBe(1);
      expect(plan.conflicts[0].reason).toContain('matches existing tool');
    });

    it('7J: Preview context clearly distinguishes preliminary repository preview from database snapshot', () => {
      const repoPreview = generateImportPreview(
        resolveDatasetPath('AIIMS_MARKET_TOOLS_CANDIDATES.json'),
        undefined,
        undefined,
        { isLiveDatabase: false }
      );
      expect(repoPreview.previewContext.isDatabaseSnapshot).toBe(false);
      expect(repoPreview.previewContext.previewType).toBe('REPOSITORY_PRELIMINARY_PREVIEW');
      expect(repoPreview.previewContext.notice).toContain(
        'Does not represent live PostgreSQL database state'
      );

      const livePreview = generateImportPreview(
        resolveDatasetPath('AIIMS_MARKET_TOOLS_CANDIDATES.json'),
        undefined,
        [],
        { isLiveDatabase: true }
      );
      expect(livePreview.previewContext.isDatabaseSnapshot).toBe(true);
      expect(livePreview.previewContext.previewType).toBe('DATABASE_SYNCHRONIZED_PREVIEW');
      expect(livePreview.previewContext.notice).toContain(
        'Verified against live PostgreSQL database snapshot'
      );
    });
  });

  // --------------------------------------------------------------------------
  // Suite 8: Transaction Safety & Atomic Rollback
  // --------------------------------------------------------------------------
  describe('8. Transaction Safety & Atomic Rollback (F-3)', () => {
    it('8A: Atomic rollback under failure: when an error is thrown in transaction, all previous writes within that transaction are rolled back', async () => {
      const initialCount = await prisma.aiTool.count();

      let transactionErrorThrown = false;
      try {
        await prisma.$transaction(
          async (tx: any) => {
            // 1. Insert tool 1 successfully
            await tx.aiTool.create({
              data: {
                id: 'tool-tx-rollback-01',
                name: 'Rollback Test Tool 1',
                provider: 'TX Labs',
                category: 'Video',
                officialWebsite: 'https://txlabs.ai',
                description: 'Description 1',
                pricingDetails: { type: 'FREEMIUM' },
                firstSeenAt: new Date().toISOString(),
                lastVerifiedAt: new Date().toISOString(),
                lastUpdatedAt: new Date().toISOString(),
              },
            });

            // 2. Simulate failure on second record
            throw new Error(
              'Database constraint failure during batch ingest [tool-tx-rollback-02]'
            );
          },
          {
            timeout: 30000,
            maxWait: 10000,
          }
        );
      } catch (err: any) {
        transactionErrorThrown = true;
        expect(err.message).toContain('Database constraint failure');
      }

      expect(transactionErrorThrown).toBe(true);

      // Verify tool 1 was rolled back completely
      const tool1 = await prisma.aiTool.findUnique({ where: { id: 'tool-tx-rollback-01' } });
      expect(tool1).toBeNull();

      const finalCount = await prisma.aiTool.count();
      expect(finalCount).toBe(initialCount);
    });
  });
});
