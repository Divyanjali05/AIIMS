import { describe, it, expect } from 'vitest';
import {
  marketTierSchema,
  createToolReportSchema,
  toolReportCategorySchema,
  toolReportStatusSchema,
} from '../../schemas/wallet.schema';
import {
  CANONICAL_DOMAIN_IDS,
  DOMAIN_SPEC_ALIASES,
  MARKET_TIER_CONFIG,
  MarketTier,
  AITool,
} from '../../types';
import { DomainTaxonomyService, CANONICAL_DOMAINS } from '../wallet/domainTaxonomy.service';
import { aiToolRowToDomain, domainToolToPrismaData } from '../wallet/toolCatalog.service';
import { AiTool as PrismaAiTool } from '@prisma/client';

describe('Market AI Tools Catalog — Phase A Architecture & Taxonomy Suite', () => {
  // =========================================================================
  // 1. Market Tier Schema & Invariants
  // =========================================================================
  describe('1. Market Tier Schema & Invariants', () => {
    it('accepts valid market tiers 1, 2, 3, 4 and null for Unrated', () => {
      expect(marketTierSchema.safeParse(1).success).toBe(true);
      expect(marketTierSchema.safeParse(2).success).toBe(true);
      expect(marketTierSchema.safeParse(3).success).toBe(true);
      expect(marketTierSchema.safeParse(4).success).toBe(true);
      expect(marketTierSchema.safeParse(null).success).toBe(true);
    });

    it('rejects invalid market tier numbers outside 1-4 range and strings', () => {
      expect(marketTierSchema.safeParse(0).success).toBe(false);
      expect(marketTierSchema.safeParse(5).success).toBe(false);
      expect(marketTierSchema.safeParse(-1).success).toBe(false);
      expect(marketTierSchema.safeParse(2.5).success).toBe(false);
      expect(marketTierSchema.safeParse('1').success).toBe(false);
      expect(marketTierSchema.safeParse('Starter').success).toBe(false);
      expect(marketTierSchema.safeParse(undefined).success).toBe(false);
    });

    it('verifies MARKET_TIER_CONFIG correctly defines all 4 tiers', () => {
      expect(MARKET_TIER_CONFIG[1].name).toBe('Starter');
      expect(MARKET_TIER_CONFIG[2].name).toBe('Growth');
      expect(MARKET_TIER_CONFIG[3].name).toBe('Leading');
      expect(MARKET_TIER_CONFIG[4].name).toBe('Enterprise');

      for (const tierNum of [1, 2, 3, 4] as const) {
        expect(MARKET_TIER_CONFIG[tierNum]).toHaveProperty('name');
        expect(MARKET_TIER_CONFIG[tierNum]).toHaveProperty('label');
        expect(MARKET_TIER_CONFIG[tierNum]).toHaveProperty('description');
        expect(MARKET_TIER_CONFIG[tierNum].description.length).toBeGreaterThan(10);
      }
    });

    it('serializes and deserializes marketTier between Prisma row and domain model', () => {
      const mockRow: PrismaAiTool = {
        id: 'tool-test-tier',
        name: 'Test Tool',
        provider: 'AI Test Lab',
        description: 'Test description',
        shortDescription: null,
        officialWebsite: 'https://testtool.ai',
        websiteUrl: 'https://testtool.ai',
        category: 'Reasoning & Writing',
        categories: ['Reasoning & Writing'],
        domains: ['reasoning-writing'],
        subdomains: ['Academic Writing'],
        capabilities: ['Summarization'],
        useCases: ['Paper drafting'],
        tasks: ['Writing'],
        targetUsers: ['Students'],
        inputTypes: ['text'],
        outputTypes: ['text'],
        supportedPlatforms: ['web'],
        supportedLanguages: ['en'],
        strengths: ['Fast'],
        limitations: ['English only'],
        modelInformation: 'v1.0',
        versionInformation: '1.0',
        pricingDetails: { type: 'FREEMIUM', summary: 'Free tier available' },
        pricing: 'Free tier available',
        learningTrack: [],
        firstSeenAt: '2026-01-01T00:00:00.000Z',
        lastVerifiedAt: '2026-11-01T00:00:00.000Z',
        lastUpdatedAt: '2026-11-01T00:00:00.000Z',
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        evidenceCoverage: 0.9,
        sourceUrls: ['https://testtool.ai'],
        tags: ['academic'],
        iconName: null,
        activeStatus: true,
        taskMappings: ['academic-writing'],
        relevantRoles: ['student'],
        skillLevel: 'Beginner',
        relatedTools: [],
        alternatives: [],
        radarTopics: [],
        clarityTopics: [],
        focusTracks: [],
        familiarityGuidance: null,
        marketTier: 2,
        pricingSourceUrl: 'https://testtool.ai/pricing',
        pricingVerifiedAt: new Date('2026-11-10T12:00:00.000Z'),
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-11-01'),
      };

      const domainTool = aiToolRowToDomain(mockRow);
      expect(domainTool.marketTier).toBe(2);
      expect(domainTool.pricingSourceUrl).toBe('https://testtool.ai/pricing');
      expect(domainTool.pricingVerifiedAt).toBe('2026-11-10T12:00:00.000Z');

      const prismaData = domainToolToPrismaData(domainTool);
      expect(prismaData.marketTier).toBe(2);
      expect(prismaData.pricingSourceUrl).toBe('https://testtool.ai/pricing');
      expect(prismaData.pricingVerifiedAt).toBeInstanceOf(Date);
    });

    it('preserves null marketTier for Unrated tools without crashing', () => {
      const mockUnratedRow: PrismaAiTool = {
        id: 'tool-unrated',
        name: 'Unrated Tool',
        provider: 'Open Source',
        description: 'New unrated tool',
        shortDescription: null,
        officialWebsite: 'https://unrated.dev',
        websiteUrl: 'https://unrated.dev',
        category: 'Agentic Coding',
        categories: ['Agentic Coding'],
        domains: ['agentic-coding'],
        subdomains: [],
        capabilities: ['Code completion'],
        useCases: ['Coding'],
        tasks: ['Code'],
        targetUsers: ['Developers'],
        inputTypes: ['code'],
        outputTypes: ['code'],
        supportedPlatforms: ['web'],
        supportedLanguages: ['en'],
        strengths: ['Open source'],
        limitations: ['Beta'],
        modelInformation: null,
        versionInformation: null,
        pricingDetails: { type: 'FREE', summary: 'Free & Open Source' },
        pricing: 'Free',
        learningTrack: [],
        firstSeenAt: '2026-10-01T00:00:00.000Z',
        lastVerifiedAt: '2026-11-01T00:00:00.000Z',
        lastUpdatedAt: '2026-11-01T00:00:00.000Z',
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        evidenceCoverage: 0.8,
        sourceUrls: [],
        tags: [],
        iconName: null,
        activeStatus: true,
        taskMappings: [],
        relevantRoles: [],
        skillLevel: 'Beginner',
        relatedTools: [],
        alternatives: [],
        radarTopics: [],
        clarityTopics: [],
        focusTracks: [],
        familiarityGuidance: null,
        marketTier: null,
        pricingSourceUrl: null,
        pricingVerifiedAt: null,
        createdAt: new Date('2026-10-01'),
        updatedAt: new Date('2026-11-01'),
      };

      const domainTool = aiToolRowToDomain(mockUnratedRow);
      expect(domainTool.marketTier).toBeNull();
      expect(domainTool.pricingSourceUrl).toBeUndefined();
      expect(domainTool.pricingVerifiedAt).toBeUndefined();

      const prismaData = domainToolToPrismaData(domainTool);
      expect(prismaData.marketTier).toBeNull();
      expect(prismaData.pricingSourceUrl).toBeNull();
      expect(prismaData.pricingVerifiedAt).toBeNull();
    });
  });

  // =========================================================================
  // 2. ToolReport Model & Schema Validation
  // =========================================================================
  describe('2. ToolReport Model & Schema Validation', () => {
    it('validates supported report categories', () => {
      const validCategories = [
        'PRICING_OUTDATED',
        'LINK_BROKEN',
        'TIER_INCORRECT',
        'CAPABILITY_CHANGED',
        'OTHER',
      ];

      for (const cat of validCategories) {
        expect(toolReportCategorySchema.safeParse(cat).success).toBe(true);
      }
      expect(toolReportCategorySchema.safeParse('INVALID_CATEGORY').success).toBe(false);
    });

    it('validates report statuses', () => {
      const validStatuses = ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'];
      for (const status of validStatuses) {
        expect(toolReportStatusSchema.safeParse(status).success).toBe(true);
      }
      expect(toolReportStatusSchema.safeParse('CLOSED').success).toBe(false);
    });

    it('accepts valid report submission input', () => {
      const input = {
        toolId: 'tool-chatgpt',
        reportCategory: 'PRICING_OUTDATED',
        description: 'ChatGPT Plus increased its monthly subscription in certain regions.',
        sourceUrl: 'https://openai.com/pricing',
      };
      const result = createToolReportSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects report submission with missing description or short description', () => {
      const result = createToolReportSchema.safeParse({
        toolId: 'tool-chatgpt',
        reportCategory: 'PRICING_OUTDATED',
        description: 'bad', // < 5 chars
      });
      expect(result.success).toBe(false);
    });

    it('rejects report submission with invalid URL format', () => {
      const result = createToolReportSchema.safeParse({
        toolId: 'tool-chatgpt',
        reportCategory: 'LINK_BROKEN',
        description: 'The official website link leads to a 404 page.',
        sourceUrl: 'not-a-valid-url',
      });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // 3. 13 Canonical Domains & Spec Alias Alignment
  // =========================================================================
  describe('3. 13 Canonical Domains & Spec Alias Alignment', () => {
    it('contains exactly 13 canonical domains in CANONICAL_DOMAINS and CANONICAL_DOMAIN_IDS', () => {
      expect(CANONICAL_DOMAIN_IDS.length).toBe(13);
      expect(CANONICAL_DOMAINS.length).toBe(13);

      const registeredIds = CANONICAL_DOMAINS.map((d) => d.id);
      for (const id of CANONICAL_DOMAIN_IDS) {
        expect(registeredIds).toContain(id);
      }
    });

    it('resolves spec names and legacy aliases to the exact canonical domain IDs', () => {
      expect(DomainTaxonomyService.resolveCanonicalDomainId('Programming')).toBe('agentic-coding');
      expect(DomainTaxonomyService.resolveCanonicalDomainId('coding')).toBe('agentic-coding');
      expect(DomainTaxonomyService.resolveCanonicalDomainId('Content Creation')).toBe(
        'marketing-growth'
      );
      expect(DomainTaxonomyService.resolveCanonicalDomainId('writing')).toBe('reasoning-writing');
      expect(DomainTaxonomyService.resolveCanonicalDomainId('Image Generation')).toBe(
        'graphic-design'
      );
      expect(DomainTaxonomyService.resolveCanonicalDomainId('Audio Generation')).toBe(
        'audio-voice'
      );
      expect(DomainTaxonomyService.resolveCanonicalDomainId('Video Generation')).toBe(
        'video-editing'
      );
      expect(DomainTaxonomyService.resolveCanonicalDomainId('Productivity')).toBe('automation');
      expect(DomainTaxonomyService.resolveCanonicalDomainId('Data Analytics')).toBe(
        'data-analytics'
      );
      expect(DomainTaxonomyService.resolveCanonicalDomainId('Research')).toBe('research-rag');
      expect(DomainTaxonomyService.resolveCanonicalDomainId('Presentation')).toBe('presentation');
      expect(DomainTaxonomyService.resolveCanonicalDomainId('Legal')).toBe('legal-compliance');
      expect(DomainTaxonomyService.resolveCanonicalDomainId('Health')).toBe('health-medical');
    });

    it('returns canonical domain metadata when queried by canonical ID or alias', () => {
      const codingDomain = DomainTaxonomyService.getCanonicalDomain('Programming');
      expect(codingDomain).toBeDefined();
      expect(codingDomain?.id).toBe('agentic-coding');
      expect(codingDomain?.title).toBe('Agentic Coding & Software Engineering');

      const dataDomain = DomainTaxonomyService.getCanonicalDomain('data-analytics');
      expect(dataDomain).toBeDefined();
      expect(dataDomain?.title).toBe('Data Analytics & Intelligence');
    });

    it('enriches 13 domain cards with marketTier and pricing source metadata', () => {
      const sampleTools: AITool[] = [
        {
          id: 'tool-cursor',
          name: 'Cursor',
          provider: 'Anysphere',
          description: 'AI code editor',
          officialWebsite: 'https://cursor.com',
          category: 'Agentic Coding',
          categories: ['Agentic Coding'],
          domains: ['agentic-coding'],
          capabilities: ['Code completion'],
          useCases: ['Software development'],
          tasks: ['Coding'],
          pricingDetails: {
            type: 'FREEMIUM',
            summary: '$20/month for Pro',
            freeTierAvailable: true,
            freeTrialAvailable: true,
            verified: true,
          },
          firstSeenAt: '2026-01-01',
          lastVerifiedAt: '2026-11-01',
          lastUpdatedAt: '2026-11-01',
          status: 'ACTIVE',
          verificationStatus: 'VERIFIED',
          sourceUrls: ['https://cursor.com'],
          tags: ['coding'],
          activeStatus: true,
          taskMappings: ['coding-assistants'],
          marketTier: 3,
          pricingSourceUrl: 'https://cursor.com/pricing',
          pricingVerifiedAt: '2026-11-01T00:00:00.000Z',
        },
      ];

      const cards = DomainTaxonomyService.getThirteenDomainCards(sampleTools);
      expect(cards.length).toBe(13);

      const codingCard = cards.find((c) => c.id === 'agentic-coding');
      expect(codingCard).toBeDefined();
      expect(codingCard?.tools?.length).toBe(1);

      const toolInCard = codingCard?.tools?.[0];
      expect(toolInCard?.name).toBe('Cursor');
      expect(toolInCard?.marketTier).toBe(3);
      expect(toolInCard?.pricingSourceUrl).toBe('https://cursor.com/pricing');
      expect(toolInCard?.pricingVerifiedAt).toBe('2026-11-01T00:00:00.000Z');
    });
  });
});
