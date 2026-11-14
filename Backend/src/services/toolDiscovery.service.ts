/**
 * toolDiscovery.service.ts
 * ==========================================
 * Phase 2A: Tool Discovery Service (PostgreSQL + Prisma)
 *
 * Responsibilities:
 *  - Provide a clean ToolDiscoveryAdapter interface for future adapters
 *  - Accept discovered tool candidates
 *  - Normalize candidate data
 *  - Detect duplicates
 *  - Compare candidates against existing AiTool records
 *  - Identify new vs changed tools
 *  - Store evidence documents
 *  - Update version history
 *  - NEVER automatically activate an unverified tool
 */

import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma, isDatabaseConnected } from '../config/prisma';
import {
  DiscoveryRunSource,
  DiscoveryRunStatus,
  EvidenceCredibility,
  EvidenceSourceType,
  IAITool,
  IToolDiscoveryRun,
  ToolChangeType,
  ToolVerificationStatus,
} from '../types/models';
import { toArray } from '../utils/id';
import { toJsonInput } from '../utils/userMapper';
import { aiToolRowToDomain, domainToolToPrismaData } from './wallet/toolCatalog.service';

// ==========================================
// TOOL CANDIDATE — Data Shape Submitted by Adapters
// ==========================================

export interface ToolCandidate {
  /** Proposed stable slug ID. The service will validate uniqueness. */
  candidateId: string;

  /** Raw tool name from the source */
  name: string;

  /** Short description — must come from the tool's own official source */
  description?: string;

  /** Primary category (will be normalized) */
  category?: string;

  /** Tool provider / company name */
  provider?: string;

  /** Canonical website URL */
  websiteUrl?: string;

  /** Known capabilities, from official documentation */
  capabilities?: string[];

  /** Known use cases, from official documentation */
  useCases?: string[];

  /** Known pricing tier, from official pricing page */
  pricing?: string;

  /** Optional version label (e.g. 'GPT-4o', '3.5 Sonnet') */
  version?: string;

  /** Source URLs used to generate this candidate */
  sourceUrls?: string[];

  /** Pre-collected evidence to be stored alongside the candidate */
  evidence?: Array<{
    sourceType: EvidenceSourceType;
    sourceUrl: string;
    sourceName: string;
    title?: string;
    evidenceText: string;
    credibility: EvidenceCredibility;
  }>;

  /** How confident the adapter is (0–1) */
  confidence?: number;
}

// ==========================================
// DISCOVERY ADAPTER INTERFACE
// ==========================================

export interface ToolDiscoveryAdapter {
  readonly adapterName: string;
  discover(): Promise<ToolCandidate[]>;
}

// ==========================================
// DISCOVERY RUN RESULT
// ==========================================

export interface DiscoveryRunResult {
  runId: string;
  status: DiscoveryRunStatus;
  discoveredCount: number;
  newToolsCount: number;
  updatedToolsCount: number;
  duplicateCount: number;
  rejectedCount: number;
  errorCount: number;
  errors: Array<{ candidateId?: string; message: string }>;
}

// ==========================================
// NORMALIZATION HELPERS
// ==========================================

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`.replace(/\/$/, '');
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, '');
  }
}

function deriveSlugId(provider: string, name: string): string {
  const slug = `${provider}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `tool-${slug}`;
}

// ==========================================
// DISCOVERY SERVICE
// ==========================================

export class ToolDiscoveryService {
  // ── Run Lifecycle ─────────────────────────────────────────────────────

  /**
   * Creates a new RUNNING discovery run record in PostgreSQL.
   */
  async createRun(source: DiscoveryRunSource): Promise<IToolDiscoveryRun> {
    const row = await prisma.toolDiscoveryRun.create({
      data: {
        startedAt: new Date(),
        status: 'RUNNING',
        source,
      },
    });
    return {
      ...row,
      status: row.status as DiscoveryRunStatus,
      source: row.source as DiscoveryRunSource,
      runErrors: toArray(row.runErrors),
    };
  }

  /**
   * Marks a run as completed (or failed) and sets final counters.
   */
  async finalizeRun(
    runId: string,
    counters: {
      discoveredCount: number;
      newToolsCount: number;
      updatedToolsCount: number;
      duplicateCount: number;
      rejectedCount: number;
      errorCount: number;
      errors: Array<{ candidateId?: string; message: string }>;
    },
    status: DiscoveryRunStatus = 'COMPLETED'
  ): Promise<void> {
    await prisma.toolDiscoveryRun.updateMany({
      where: { id: runId },
      data: {
        completedAt: new Date(),
        status,
        discoveredCount: counters.discoveredCount,
        newToolsCount: counters.newToolsCount,
        updatedToolsCount: counters.updatedToolsCount,
        duplicateCount: counters.duplicateCount,
        rejectedCount: counters.rejectedCount,
        errorCount: counters.errorCount,
        runErrors: toJsonInput(counters.errors),
      },
    });
  }

  // ── Candidate Processing ──────────────────────────────────────────────

  normalizeCandidate(candidate: ToolCandidate): ToolCandidate {
    return {
      ...candidate,
      candidateId:
        candidate.candidateId?.trim() ||
        deriveSlugId(candidate.provider || 'unknown', candidate.name),
      name: candidate.name?.trim(),
      description: candidate.description?.trim(),
      provider: candidate.provider?.trim(),
      websiteUrl: candidate.websiteUrl ? normalizeUrl(candidate.websiteUrl) : undefined,
      capabilities: (candidate.capabilities || []).map((c) => c.trim()).filter(Boolean),
      useCases: (candidate.useCases || []).map((u) => u.trim()).filter(Boolean),
      category: candidate.category?.trim(),
      pricing: candidate.pricing?.trim(),
      sourceUrls: (candidate.sourceUrls || []).map((u) => normalizeUrl(u)).filter(Boolean),
      confidence: candidate.confidence ?? 0,
    };
  }

  /**
   * Detects whether a candidate is a duplicate of an existing tool in PostgreSQL.
   */
  async detectDuplicate(candidate: ToolCandidate): Promise<IAITool | null> {
    if (!isDatabaseConnected()) return null;

    const filters: Prisma.AiToolWhereInput[] = [];

    // Signal 1: slug ID
    if (candidate.candidateId) {
      filters.push({ id: candidate.candidateId });
    }

    // Signal 2: canonical websiteUrl
    if (candidate.websiteUrl) {
      filters.push({ websiteUrl: candidate.websiteUrl });
    }

    // Signal 3: provider + normalized name
    if (candidate.provider && candidate.name) {
      const normalizedName = normalizeName(candidate.name);
      const existingByProvider = await prisma.aiTool.findMany({
        where: { provider: candidate.provider },
      });

      for (const existing of existingByProvider) {
        if (normalizeName(existing.name) === normalizedName) {
          return aiToolRowToDomain(existing);
        }
      }
    }

    if (filters.length === 0) return null;

    const found = await prisma.aiTool.findFirst({ where: { OR: filters } });
    return found ? aiToolRowToDomain(found) : null;
  }

  /**
   * Computes the diff between a candidate and an existing tool,
   * returning only the fields that have meaningfully changed.
   */
  diffCandidate(
    candidate: ToolCandidate,
    existing: IAITool
  ): { hasChanges: boolean; changeType: ToolChangeType; changedFields: Record<string, any> } {
    const changedFields: Record<string, any> = {};

    const existingUrl = existing.websiteUrl || existing.officialWebsite || '';
    if (candidate.websiteUrl && normalizeUrl(candidate.websiteUrl) !== normalizeUrl(existingUrl)) {
      changedFields.websiteUrl = { from: existingUrl, to: candidate.websiteUrl };
    }
    if (candidate.pricing && candidate.pricing !== (existing.pricing || '')) {
      changedFields.pricing = { from: existing.pricing, to: candidate.pricing };
    }
    if (
      candidate.version &&
      existing.name &&
      !existing.name.toLowerCase().includes(candidate.version.toLowerCase())
    ) {
      changedFields.version = { from: null, to: candidate.version };
    }
    if (candidate.capabilities && candidate.capabilities.length > 0) {
      const existingSet = new Set(existing.capabilities || []);
      const newCaps = candidate.capabilities.filter((c) => !existingSet.has(c));
      if (newCaps.length > 0) {
        changedFields.capabilities = { added: newCaps };
      }
    }

    const hasChanges = Object.keys(changedFields).length > 0;

    let changeType: ToolChangeType = 'CAPABILITY_UPDATE';
    if (changedFields.websiteUrl) changeType = 'WEBSITE_UPDATE';
    else if (changedFields.pricing) changeType = 'PRICING_UPDATE';
    else if (changedFields.version) changeType = 'VERSION_UPDATE';

    return { hasChanges, changeType, changedFields };
  }

  // ── Storage Operations ────────────────────────────────────────────────

  async storeEvidence(toolId: string, evidenceItems: ToolCandidate['evidence']): Promise<void> {
    if (!evidenceItems || evidenceItems.length === 0) return;

    const now = new Date();
    const nowIso = now.toISOString();
    const docs = evidenceItems.map((e) => ({
      id: `ev-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      toolId,
      claim: e.title || 'Tool Evidence Claim',
      value: e.evidenceText || '',
      sourceType: e.sourceType || 'OFFICIAL_WEBSITE',
      sourceUrl: e.sourceUrl,
      sourceTitle: e.sourceName || e.title || 'Official Source',
      sourceName: e.sourceName ?? null,
      title: e.title ?? null,
      evidenceText: e.evidenceText ?? null,
      credibility: e.credibility || 'MEDIUM',
      verificationStatus: 'PENDING',
      discoveredAt: now,
      fetchedAt: now,
      publishedAt: nowIso,
      verifiedAt: nowIso,
      confidence: 0.9,
    }));

    await prisma.toolEvidence.createMany({ data: docs, skipDuplicates: true });
  }

  async recordHistory(
    toolId: string,
    changeType: ToolChangeType,
    changeSummary: string,
    previousData?: Record<string, any>,
    newData?: Record<string, any>,
    sourceUrl?: string
  ): Promise<void> {
    const nowIso = new Date().toISOString();
    await prisma.toolVersionHistory.create({
      data: {
        id: `vh-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        toolId,
        version: '1.0',
        changeType,
        summary: changeSummary,
        changeSummary,
        sourceUrl: sourceUrl ?? null,
        sourceUrls: sourceUrl ? [sourceUrl] : [],
        detectedAt: nowIso,
        verifiedAt: nowIso,
        previousValue: previousData ? JSON.stringify(previousData) : null,
        newValue: newData ? JSON.stringify(newData) : null,
        previousData: previousData ? toJsonInput(previousData) : Prisma.DbNull,
        newData: newData ? toJsonInput(newData) : Prisma.DbNull,
        recordedBy: 'DISCOVERY_RUN',
      },
    });
  }

  /**
   * Creates a DISCOVERED (inactive, unverified) AiTool from a candidate.
   */
  async createDiscoveredTool(candidate: ToolCandidate): Promise<IAITool> {
    const now = new Date().toISOString();
    const payload = domainToolToPrismaData({
      id: candidate.candidateId,
      name: candidate.name,
      description: candidate.description || '',
      category: (candidate.category as any) || 'Reasoning & Writing',
      capabilities: candidate.capabilities || [],
      useCases: candidate.useCases || [],
      strengths: [],
      limitations: [],
      taskMappings: [],
      websiteUrl: candidate.websiteUrl || '',
      officialWebsite: candidate.websiteUrl || '',
      activeStatus: false, // NOT active until verified
      provider: candidate.provider || 'AI Provider',
      pricing: candidate.pricing,
      pricingDetails: {
        type: 'FREEMIUM',
        summary: candidate.pricing || 'Free / Paid',
        freeTierAvailable: true,
        freeTrialAvailable: false,
        verified: false,
      },
      status: 'UNVERIFIED',
      categories: candidate.category ? [candidate.category as any] : ['Reasoning & Writing'],
      domains: candidate.category ? [candidate.category] : ['Education & Learning'],
      tasks: [],
      tags: [],
      sourceUrls: candidate.sourceUrls || [],
      verificationStatus: 'DISCOVERED' as ToolVerificationStatus,
      firstSeenAt: now,
      lastVerifiedAt: now,
      lastUpdatedAt: now,
    });

    const created = await prisma.aiTool.create({ data: payload });

    // Record the birth of this tool in version history
    await this.recordHistory(
      candidate.candidateId,
      'NEW_TOOL',
      `Tool "${candidate.name}" first discovered by the discovery pipeline`,
      undefined,
      { name: candidate.name, provider: candidate.provider, websiteUrl: candidate.websiteUrl }
    );

    // Store any pre-collected evidence
    if (candidate.evidence) {
      await this.storeEvidence(candidate.candidateId, candidate.evidence);
    }

    return aiToolRowToDomain(created);
  }

  /**
   * Updates an existing tool based on a diff and records version history.
   * Does NOT change verificationStatus or activeStatus.
   */
  async updateExistingTool(
    existing: IAITool,
    changedFields: Record<string, any>,
    changeType: ToolChangeType,
    sourceUrl?: string
  ): Promise<void> {
    const updateData: Prisma.AiToolUpdateInput = {
      lastUpdatedAt: new Date().toISOString(),
    };

    if (changedFields.websiteUrl) {
      updateData.websiteUrl = changedFields.websiteUrl.to;
      updateData.officialWebsite = changedFields.websiteUrl.to;
    }
    if (changedFields.pricing) {
      updateData.pricing = changedFields.pricing.to;
    }
    if (changedFields.capabilities?.added) {
      const mergedCapabilities = Array.from(
        new Set([...(existing.capabilities || []), ...changedFields.capabilities.added])
      );
      updateData.capabilities = mergedCapabilities;
    }

    await prisma.aiTool.update({
      where: { id: existing.id },
      data: updateData,
    });

    await this.recordHistory(
      existing.id,
      changeType,
      `Detected ${changeType.toLowerCase().replace('_', ' ')} for "${existing.name}"`,
      Object.fromEntries(Object.entries(changedFields).map(([k, v]) => [k, (v as any).from])),
      Object.fromEntries(
        Object.entries(changedFields).map(([k, v]) => [k, (v as any).to || (v as any).added])
      ),
      sourceUrl
    );
  }

  // ── Full Pipeline Orchestration ───────────────────────────────────────

  async processCandidates(
    candidates: ToolCandidate[],
    runId: string,
    _source: DiscoveryRunSource = 'DISCOVERY_RUN' as any
  ): Promise<DiscoveryRunResult> {
    const counters = {
      discoveredCount: candidates.length,
      newToolsCount: 0,
      updatedToolsCount: 0,
      duplicateCount: 0,
      rejectedCount: 0,
      errorCount: 0,
      errors: [] as Array<{ candidateId?: string; message: string }>,
    };

    for (const rawCandidate of candidates) {
      const candidate = this.normalizeCandidate(rawCandidate);

      try {
        if (!candidate.name || !candidate.candidateId) {
          counters.rejectedCount++;
          counters.errors.push({
            candidateId: candidate.candidateId,
            message: 'Rejected: missing required fields (name or candidateId)',
          });
          continue;
        }

        const existing = await this.detectDuplicate(candidate);

        if (existing) {
          const { hasChanges, changeType, changedFields } = this.diffCandidate(candidate, existing);

          if (hasChanges) {
            await this.updateExistingTool(existing, changedFields, changeType);
            if (candidate.evidence) {
              await this.storeEvidence(existing.id, candidate.evidence);
            }
            counters.updatedToolsCount++;
          } else {
            counters.duplicateCount++;
          }
        } else {
          await this.createDiscoveredTool(candidate);
          counters.newToolsCount++;
        }
      } catch (err: any) {
        counters.errorCount++;
        counters.errors.push({
          candidateId: candidate.candidateId,
          message: err.message || 'Unknown error during candidate processing',
        });
      }
    }

    let finalStatus: DiscoveryRunStatus = 'COMPLETED';
    if (counters.errorCount > 0 && counters.errorCount < candidates.length) {
      finalStatus = 'PARTIAL';
    } else if (counters.errorCount === candidates.length && candidates.length > 0) {
      finalStatus = 'FAILED';
    }

    await this.finalizeRun(runId, counters, finalStatus);

    return {
      runId,
      status: finalStatus,
      ...counters,
    };
  }
}

export const toolDiscoveryService = new ToolDiscoveryService();
