import { AiTool as PrismaAiTool, Prisma } from '@prisma/client';
import { prisma, isDatabaseConnected } from '../../config/prisma';
import { getSeedToolCatalog } from '../../data/aiimsCatalog';
import {
  AITool,
  TaskCategory,
  ToolFamiliarity,
  ToolLearningTrackLevel,
  ToolLifecycleStatus,
  ToolPricing,
  VerificationStatus,
} from '../../types';
import { IAITool } from '../../types/models';
import { toArray, toRecord } from '../../utils/id';
import { toJsonInput } from '../../utils/userMapper';

/**
 * Converts a PostgreSQL Prisma `AiTool` row into the canonical domain `IAITool` shape.
 */
export function aiToolRowToDomain(row: PrismaAiTool): IAITool {
  const pricingObj = toRecord(row.pricingDetails);
  const pricingDetails: ToolPricing = {
    type: (pricingObj.type as ToolPricing['type']) || 'FREEMIUM',
    summary: String(pricingObj.summary || row.pricing || 'Free tier available'),
    freeTierAvailable: Boolean(pricingObj.freeTierAvailable ?? true),
    freeTrialAvailable: Boolean(pricingObj.freeTrialAvailable ?? false),
    trialDurationDays:
      typeof pricingObj.trialDurationDays === 'number' ? pricingObj.trialDurationDays : undefined,
    freeTierLimitations:
      typeof pricingObj.freeTierLimitations === 'string'
        ? pricingObj.freeTierLimitations
        : undefined,
    startingPriceMonthlyUsd:
      typeof pricingObj.startingPriceMonthlyUsd === 'number'
        ? pricingObj.startingPriceMonthlyUsd
        : undefined,
    verified: Boolean(pricingObj.verified ?? true),
    lastVerifiedAt:
      typeof pricingObj.lastVerifiedAt === 'string' ? pricingObj.lastVerifiedAt : undefined,
  };

  const famObj = row.familiarityGuidance ? toRecord(row.familiarityGuidance) : undefined;
  const familiarityGuidance =
    famObj && Object.keys(famObj).length > 0
      ? (famObj as Partial<Record<ToolFamiliarity, string>>)
      : undefined;

  return {
    id: row.id,
    name: row.name,
    provider: row.provider || 'AI Provider',
    description: row.description,
    shortDescription: row.shortDescription ?? undefined,
    officialWebsite: row.officialWebsite || row.websiteUrl || '',
    websiteUrl: row.websiteUrl || row.officialWebsite || '',
    category: row.category as TaskCategory,
    categories: (row.categories && row.categories.length > 0
      ? row.categories
      : [row.category]) as TaskCategory[],
    domains: row.domains && row.domains.length > 0 ? row.domains : [row.category],
    subdomains: row.subdomains && row.subdomains.length > 0 ? row.subdomains : undefined,
    capabilities: row.capabilities || [],
    useCases: row.useCases || [],
    tasks: row.tasks && row.tasks.length > 0 ? row.tasks : row.taskMappings || [],
    targetUsers: row.targetUsers && row.targetUsers.length > 0 ? row.targetUsers : undefined,
    inputTypes: row.inputTypes && row.inputTypes.length > 0 ? row.inputTypes : undefined,
    outputTypes: row.outputTypes && row.outputTypes.length > 0 ? row.outputTypes : undefined,
    supportedPlatforms:
      row.supportedPlatforms && row.supportedPlatforms.length > 0
        ? row.supportedPlatforms
        : undefined,
    supportedLanguages:
      row.supportedLanguages && row.supportedLanguages.length > 0
        ? row.supportedLanguages
        : undefined,
    strengths: row.strengths || [],
    limitations: row.limitations || [],
    modelInformation: row.modelInformation ?? undefined,
    versionInformation: row.versionInformation ?? undefined,
    pricingDetails,
    pricing: row.pricing ?? pricingDetails.summary,
    learningTrack: toArray<ToolLearningTrackLevel>(row.learningTrack),
    firstSeenAt: row.firstSeenAt,
    lastVerifiedAt: row.lastVerifiedAt,
    lastUpdatedAt: row.lastUpdatedAt,
    status: (row.status as ToolLifecycleStatus) || 'ACTIVE',
    verificationStatus: (row.verificationStatus as VerificationStatus) || 'VERIFIED',
    evidenceCoverage: row.evidenceCoverage,
    sourceUrls: row.sourceUrls || [],
    tags: row.tags || [],
    iconName: row.iconName ?? undefined,
    activeStatus: row.activeStatus,
    taskMappings: row.taskMappings || [],
    relevantRoles:
      row.relevantRoles && row.relevantRoles.length > 0 ? row.relevantRoles : undefined,
    skillLevel: row.skillLevel ?? undefined,
    familiarityGuidance,
    relatedTools: row.relatedTools && row.relatedTools.length > 0 ? row.relatedTools : undefined,
    alternatives: row.alternatives && row.alternatives.length > 0 ? row.alternatives : undefined,
    radarTopics: row.radarTopics && row.radarTopics.length > 0 ? row.radarTopics : undefined,
    clarityTopics:
      row.clarityTopics && row.clarityTopics.length > 0 ? row.clarityTopics : undefined,
    focusTracks: row.focusTracks && row.focusTracks.length > 0 ? row.focusTracks : undefined,
  };
}

/**
 * Converts a domain `AITool` / `IAITool` object into explicit PostgreSQL Prisma column payloads.
 */
export function domainToolToPrismaData(
  tool: Partial<IAITool> & { id: string }
): Prisma.AiToolCreateInput {
  const nowIso = new Date().toISOString();
  const category = String(tool.category || 'Reasoning & Writing');
  const pricingDetails: ToolPricing = tool.pricingDetails || {
    type: 'FREEMIUM',
    summary: tool.pricing || 'Free tier available',
    freeTierAvailable: true,
    freeTrialAvailable: false,
    verified: true,
    lastVerifiedAt: nowIso,
  };

  return {
    id: tool.id,
    name: tool.name || tool.id,
    provider: tool.provider || 'AI Provider',
    description: tool.description || '',
    shortDescription: tool.shortDescription ?? null,
    officialWebsite: tool.officialWebsite || tool.websiteUrl || '',
    websiteUrl: tool.websiteUrl || tool.officialWebsite || '',
    category,
    categories:
      Array.isArray(tool.categories) && tool.categories.length > 0 ? tool.categories : [category],
    domains: Array.isArray(tool.domains) && tool.domains.length > 0 ? tool.domains : [category],
    subdomains: Array.isArray(tool.subdomains) ? tool.subdomains : [],
    capabilities: Array.isArray(tool.capabilities) ? tool.capabilities : [],
    useCases: Array.isArray(tool.useCases) ? tool.useCases : [],
    tasks: Array.isArray(tool.tasks) ? tool.tasks : [],
    targetUsers: Array.isArray(tool.targetUsers) ? tool.targetUsers : [],
    inputTypes: Array.isArray(tool.inputTypes) ? tool.inputTypes : [],
    outputTypes: Array.isArray(tool.outputTypes) ? tool.outputTypes : [],
    supportedPlatforms: Array.isArray(tool.supportedPlatforms) ? tool.supportedPlatforms : [],
    supportedLanguages: Array.isArray(tool.supportedLanguages) ? tool.supportedLanguages : [],
    strengths: Array.isArray(tool.strengths) ? tool.strengths : [],
    limitations: Array.isArray(tool.limitations) ? tool.limitations : [],
    modelInformation: tool.modelInformation ?? null,
    versionInformation: tool.versionInformation ?? null,
    pricingDetails: toJsonInput(pricingDetails),
    pricing: tool.pricing ?? pricingDetails.summary,
    learningTrack: toJsonInput(Array.isArray(tool.learningTrack) ? tool.learningTrack : []),
    firstSeenAt: tool.firstSeenAt || nowIso,
    lastVerifiedAt: tool.lastVerifiedAt || nowIso,
    lastUpdatedAt: tool.lastUpdatedAt || nowIso,
    status: String(tool.status || 'ACTIVE'),
    verificationStatus: String(tool.verificationStatus || 'VERIFIED'),
    evidenceCoverage: typeof tool.evidenceCoverage === 'number' ? tool.evidenceCoverage : 0,
    sourceUrls: Array.isArray(tool.sourceUrls) ? tool.sourceUrls : [],
    tags: Array.isArray(tool.tags) ? tool.tags : [],
    iconName: tool.iconName ?? null,
    activeStatus: tool.activeStatus ?? true,
    taskMappings: Array.isArray(tool.taskMappings) ? tool.taskMappings : [],
    relevantRoles: Array.isArray(tool.relevantRoles) ? tool.relevantRoles : [],
    skillLevel: tool.skillLevel ?? null,
    relatedTools: Array.isArray(tool.relatedTools) ? tool.relatedTools : [],
    alternatives: Array.isArray(tool.alternatives) ? tool.alternatives : [],
    radarTopics: Array.isArray(tool.radarTopics) ? tool.radarTopics : [],
    clarityTopics: Array.isArray(tool.clarityTopics) ? tool.clarityTopics : [],
    focusTracks: Array.isArray(tool.focusTracks) ? tool.focusTracks : [],
    familiarityGuidance: tool.familiarityGuidance
      ? toJsonInput(tool.familiarityGuidance)
      : Prisma.DbNull,
  };
}

/**
 * Tool Catalog Service — PostgreSQL Prisma Core Database Layer for AI Tool Catalog
 * Source of truth for verified AI tools, pricing, 5-level learning tracks, lifecycle status,
 * verification metadata, and multi-domain associations.
 */
export class ToolCatalogService {
  private static catalog: Map<string, AITool> = new Map<string, AITool>();
  private static isInitialized = false;
  private static degradedMode = false;

  public static initializeCatalog(): void {
    if (this.isInitialized) return;

    const seedTools = getSeedToolCatalog();
    for (const tool of seedTools) {
      this.catalog.set(tool.id, tool);
    }
    this.isInitialized = true;
  }

  public static isDegradedMode(): boolean {
    return this.degradedMode || !isDatabaseConnected();
  }

  public static getCatalog(): AITool[] {
    this.initializeCatalog();
    return Array.from(this.catalog.values());
  }

  public static async getCatalogAsync(): Promise<AITool[]> {
    this.initializeCatalog();
    if (isDatabaseConnected()) {
      try {
        const docs = await prisma.aiTool.findMany({ where: { activeStatus: true } });
        if (docs && docs.length > 0) {
          const result: AITool[] = [];
          for (const doc of docs) {
            const domain = aiToolRowToDomain(doc);
            this.catalog.set(domain.id, domain);
            result.push(domain);
          }
          return result;
        }
      } catch (err: any) {
        console.warn('[ToolCatalog] PostgreSQL getCatalogAsync warning:', err.message);
      }
    }
    return Array.from(this.catalog.values()).filter((t) => t.activeStatus !== false);
  }

  public static getToolById(id: string): AITool | undefined {
    this.initializeCatalog();
    return this.catalog.get(id);
  }

  public static async getToolByIdAsync(id: string): Promise<AITool | undefined> {
    this.initializeCatalog();
    if (isDatabaseConnected()) {
      try {
        const doc = await prisma.aiTool.findFirst({ where: { id, activeStatus: true } });
        if (doc) {
          const domain = aiToolRowToDomain(doc);
          this.catalog.set(domain.id, domain);
          return domain;
        }
      } catch (err: any) {
        console.warn('[ToolCatalog] getToolByIdAsync DB error:', err.message);
      }
    }
    return this.catalog.get(id);
  }

  public static async upsertTool(tool: AITool): Promise<AITool> {
    this.initializeCatalog();
    const existing = this.catalog.get(tool.id);
    const updatedTool: AITool = existing
      ? {
          ...existing,
          ...tool,
          lastUpdatedAt: new Date().toISOString(),
        }
      : {
          ...tool,
          firstSeenAt: tool.firstSeenAt || new Date().toISOString(),
          lastVerifiedAt: tool.lastVerifiedAt || new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
        };

    this.catalog.set(tool.id, updatedTool);

    if (isDatabaseConnected()) {
      try {
        const payload = domainToolToPrismaData(updatedTool);
        const { id: _ignoreId, ...updatePayload } = payload;
        await prisma.aiTool.upsert({
          where: { id: updatedTool.id },
          create: payload,
          update: updatePayload,
        });
      } catch (err: any) {
        this.degradedMode = true;
        console.warn(`[ToolCatalog] PostgreSQL upsert warning (${tool.id}):`, err.message);
      }
    } else {
      this.degradedMode = true;
    }

    return updatedTool;
  }

  public static async upsertToolAsync(tool: AITool): Promise<AITool> {
    return this.upsertTool(tool);
  }

  public static async removeTool(id: string): Promise<boolean> {
    this.initializeCatalog();
    const deleted = this.catalog.delete(id);
    if (isDatabaseConnected()) {
      try {
        await prisma.aiTool.deleteMany({ where: { id } });
      } catch (err: any) {
        console.warn(`[ToolCatalog] PostgreSQL delete warning (${id}):`, err.message);
      }
    }
    return deleted;
  }

  /**
   * Synchronizes tool catalog from PostgreSQL.
   * If PostgreSQL has tools, refreshes cache with database rows and backfills missing fields.
   * If PostgreSQL is empty, seeds the curated reference catalog safely into PostgreSQL.
   */
  public static async syncFromDatabase(): Promise<void> {
    this.initializeCatalog();
    if (!isDatabaseConnected()) {
      this.degradedMode = true;
      console.warn(
        '[ToolCatalog] PostgreSQL not connected. Catalog operating in degraded read-only seed state.'
      );
      return;
    }

    try {
      const docs = await prisma.aiTool.findMany({});
      if (docs && docs.length > 0) {
        const freshCatalog = new Map<string, AITool>();
        for (const doc of docs) {
          const domainObj = aiToolRowToDomain(doc);
          const seedFallback = this.catalog.get(doc.id);
          const mergedTool: AITool = {
            ...(seedFallback || {}),
            ...domainObj,
            officialWebsite:
              domainObj.officialWebsite ||
              seedFallback?.officialWebsite ||
              domainObj.websiteUrl ||
              '',
            websiteUrl:
              domainObj.websiteUrl || seedFallback?.websiteUrl || domainObj.officialWebsite || '',
            pricingDetails: domainObj.pricingDetails ||
              seedFallback?.pricingDetails || {
                type:
                  domainObj.pricing && domainObj.pricing.toLowerCase().includes('free')
                    ? 'FREEMIUM'
                    : 'PAID',
                summary: domainObj.pricing || 'Free tier available',
                freeTierAvailable: true,
                freeTrialAvailable: false,
                verified: true,
                lastVerifiedAt: new Date().toISOString(),
              },
            learningTrack:
              domainObj.learningTrack && domainObj.learningTrack.length > 0
                ? domainObj.learningTrack
                : seedFallback?.learningTrack || [],
            domains:
              domainObj.domains && domainObj.domains.length > 0
                ? domainObj.domains
                : seedFallback?.domains || [domainObj.category || 'Software & Technology'],
            categories:
              domainObj.categories && domainObj.categories.length > 0
                ? domainObj.categories
                : seedFallback?.categories || [domainObj.category || 'Reasoning & Writing'],
            tasks:
              domainObj.tasks && domainObj.tasks.length > 0
                ? domainObj.tasks
                : seedFallback?.tasks || domainObj.taskMappings || [],
            strengths:
              domainObj.strengths && domainObj.strengths.length > 0
                ? domainObj.strengths
                : seedFallback?.strengths || [],
            limitations:
              domainObj.limitations && domainObj.limitations.length > 0
                ? domainObj.limitations
                : seedFallback?.limitations || [],
            useCases:
              domainObj.useCases && domainObj.useCases.length > 0
                ? domainObj.useCases
                : seedFallback?.useCases || [],
            status: domainObj.status || seedFallback?.status || 'ACTIVE',
            verificationStatus:
              domainObj.verificationStatus || seedFallback?.verificationStatus || 'VERIFIED',
            activeStatus: domainObj.activeStatus ?? true,
          };

          if (
            !doc.pricingDetails ||
            !domainObj.learningTrack ||
            domainObj.learningTrack.length === 0
          ) {
            const payload = domainToolToPrismaData(mergedTool);
            const { id: _id, ...updatePayload } = payload;
            await prisma.aiTool
              .update({ where: { id: doc.id }, data: updatePayload })
              .catch(() => {});
          }

          freshCatalog.set(doc.id, mergedTool);
        }

        for (const [seedId, seedTool] of this.catalog.entries()) {
          if (!freshCatalog.has(seedId)) {
            freshCatalog.set(seedId, seedTool);
            const payload = domainToolToPrismaData(seedTool);
            const { id: _id, ...updatePayload } = payload;
            await prisma.aiTool
              .upsert({ where: { id: seedId }, create: payload, update: updatePayload })
              .catch(() => {});
          }
        }

        this.catalog = freshCatalog;
        this.degradedMode = false;
        console.log(
          `[ToolCatalog] Synchronized ${freshCatalog.size} tools from PostgreSQL with full schema integrity.`
        );
      } else {
        console.log(
          '[ToolCatalog] PostgreSQL ai_tools table empty. Seeding initial curated tools...'
        );
        for (const tool of this.catalog.values()) {
          const payload = domainToolToPrismaData(tool);
          const { id: _id, ...updatePayload } = payload;
          await prisma.aiTool.upsert({
            where: { id: tool.id },
            create: payload,
            update: updatePayload,
          });
        }
        this.degradedMode = false;
        console.log('[ToolCatalog] Completed initial seed migration to PostgreSQL.');
      }
    } catch (err: any) {
      this.degradedMode = true;
      console.warn(
        '[ToolCatalog] PostgreSQL catalog sync failed (Operating in DEGRADED mode):',
        err.message
      );
    }
  }

  /**
   * Cleans invalid discovery records (fake tools, git tags) from PostgreSQL
   */
  public static async cleanInvalidDiscoveryRecords(): Promise<number> {
    if (!isDatabaseConnected()) return 0;

    const invalidIds = [
      'tool-v2-0-0-vscode',
      'tool-astra',
      'tool-hugging-face-trending-ai-item-1',
      'tool-claude-3-5-sonnet-computer-use-release',
    ];

    const res = await prisma.aiTool.deleteMany({
      where: { id: { in: invalidIds } },
    });
    for (const id of invalidIds) {
      this.catalog.delete(id);
    }

    const riskyPattern = /uncensored|nsfw|face[\s-]?swap|deepfake|undress/i;
    const allTools = await prisma.aiTool.findMany({ select: { id: true, name: true } });
    const riskyIds = allTools.filter((t) => riskyPattern.test(t.name)).map((t) => t.id);

    let riskyDeletedCount = 0;
    if (riskyIds.length > 0) {
      const riskyRes = await prisma.aiTool.deleteMany({
        where: { id: { in: riskyIds } },
      });
      riskyDeletedCount = riskyRes.count;
    }

    for (const [id, tool] of this.catalog.entries()) {
      if (riskyPattern.test(tool.name)) {
        this.catalog.delete(id);
      }
    }

    // Enforce: unverified / community-verified discovery candidates are not active by default
    await prisma.aiTool.updateMany({
      where: {
        verificationStatus: { in: ['COMMUNITY_VERIFIED', 'UNVERIFIED', 'DISCOVERED'] },
      },
      data: { activeStatus: false },
    });

    const totalDeleted = res.count + riskyDeletedCount;
    console.log(
      `[ToolCatalog] Cleaned ${res.count} invalid records and ${riskyDeletedCount} risky records from PostgreSQL and deactivated unverified candidates.`
    );
    return totalDeleted;
  }

  public static getNewAndRecentlyUpdatedTools(): AITool[] {
    this.initializeCatalog();
    const tools = Array.from(this.catalog.values());
    return tools.filter(
      (t) =>
        t.activeStatus &&
        (t.status === 'NEW' || t.status === 'RECENTLY_UPDATED' || t.status === 'UPDATED')
    );
  }
}
