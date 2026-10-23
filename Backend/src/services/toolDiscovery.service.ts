/**
 * toolDiscovery.service.ts
 * ==========================================
 * Phase 2A: Tool Discovery Service
 *
 * Responsibilities:
 *  - Provide a clean ToolDiscoveryAdapter interface for future adapters
 *  - Accept discovered tool candidates
 *  - Normalize candidate data
 *  - Detect duplicates
 *  - Compare candidates against existing AITool records
 *  - Identify new vs changed tools
 *  - Store evidence documents
 *  - Update version history
 *  - NEVER automatically activate an unverified tool
 *
 * This service is the orchestration layer.
 * It does NOT connect to any external API or web source directly.
 */

import mongoose from 'mongoose';
import { AIToolModel, IAITool, ToolVerificationStatus } from '../models/aiTool.model';
import {
  ToolEvidenceModel,
  EvidenceSourceType,
  EvidenceCredibility,
} from '../models/toolEvidence.model';
import { ToolVersionHistoryModel, ToolChangeType } from '../models/toolVersionHistory.model';
import {
  ToolDiscoveryRunModel,
  DiscoveryRunSource,
  IToolDiscoveryRun,
} from '../models/ToolDiscoveryRun.model';

// ==========================================
// TOOL CANDIDATE — Data Shape Submitted by Adapters
// ==========================================

/**
 * A ToolCandidate is an unverified, raw discovery result.
 * Adapters submit candidates; the discovery service normalizes,
 * deduplicates, verifies, and optionally persists them.
 *
 * Candidates are NEVER activated automatically.
 */
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

/**
 * All future discovery adapters must implement this interface.
 *
 * An adapter is responsible for:
 *  1. Fetching a list of ToolCandidates from a specific source
 *  2. Populating each candidate's `evidence` array with verifiable snippets
 *  3. NOT fabricating descriptions or capabilities
 *
 * Example future adapters:
 *  - HuggingFaceAdapterAdapter — discovers models via HF API
 *  - GitHubReleaseAdapter — monitors starred AI repos for releases
 *  - AdminImportAdapter — reads a structured JSON/CSV from an admin upload
 */
export interface ToolDiscoveryAdapter {
  /** Human-readable name for this adapter (used in run metadata) */
  readonly adapterName: string;

  /**
   * Execute the adapter and return discovered tool candidates.
   * Adapters must not throw — wrap errors internally and return
   * partial results where possible.
   */
  discover(): Promise<ToolCandidate[]>;
}

// ==========================================
// DISCOVERY RUN RESULT
// ==========================================

export interface DiscoveryRunResult {
  runId: string;
  status: IToolDiscoveryRun['status'];
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

/**
 * Normalizes a tool name for deduplication comparison.
 * Does NOT modify the stored display name.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes a URL to its canonical form for deduplication.
 * Strips trailing slashes, query strings, and fragments.
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`.replace(/\/$/, '');
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, '');
  }
}

/**
 * Derives a stable slug ID from provider + name.
 * Only used if the candidate doesn't provide a candidateId.
 */
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
   * Creates a new RUNNING discovery run document.
   */
  async createRun(source: DiscoveryRunSource): Promise<IToolDiscoveryRun> {
    return ToolDiscoveryRunModel.create({
      startedAt: new Date(),
      status: 'RUNNING',
      source,
    });
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
    status: IToolDiscoveryRun['status'] = 'COMPLETED'
  ): Promise<void> {
    await ToolDiscoveryRunModel.findByIdAndUpdate(runId, {
      $set: {
        completedAt: new Date(),
        status,
        ...counters,
      },
    });
  }

  // ── Candidate Processing ──────────────────────────────────────────────

  /**
   * Normalizes a raw ToolCandidate into a clean, consistent shape
   * ready for deduplication and storage checks.
   */
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
   * Detects whether a candidate is a duplicate of an existing tool.
   *
   * Duplicate detection uses multiple signals:
   *  1. Exact candidateId match (slug)
   *  2. Canonical websiteUrl match
   *  3. Normalized provider + normalized name match
   *
   * Does NOT merge tools merely because names are similar in spelling.
   */
  async detectDuplicate(candidate: ToolCandidate): Promise<IAITool | null> {
    if (!mongoose.models['AITool']) return null;

    const filters: any[] = [];

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
      const existingByProvider = await AIToolModel.find({
        provider: candidate.provider,
      }).lean<IAITool[]>();

      for (const existing of existingByProvider) {
        if (normalizeName(existing.name) === normalizedName) {
          return existing as IAITool;
        }
      }
    }

    if (filters.length === 0) return null;

    return AIToolModel.findOne({ $or: filters }).lean<IAITool>();
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

  /**
   * Persists evidence documents for a candidate (or existing tool).
   * All evidence starts in PENDING verification status.
   */
  async storeEvidence(toolId: string, evidenceItems: ToolCandidate['evidence']): Promise<void> {
    if (!evidenceItems || evidenceItems.length === 0) return;

    const docs = evidenceItems.map((e) => ({
      id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      toolId,
      claim: e.title || 'Tool Evidence Claim',
      value: e.evidenceText || '',
      sourceType: e.sourceType || 'OFFICIAL_WEBSITE',
      sourceUrl: e.sourceUrl,
      sourceTitle: e.sourceName || e.title || 'Official Source',
      sourceName: e.sourceName,
      title: e.title,
      evidenceText: e.evidenceText,
      credibility: e.credibility,
      verificationStatus: 'PENDING' as any,
      discoveredAt: new Date(),
      fetchedAt: new Date(),
      publishedAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
      confidence: 0.9,
    }));

    await ToolEvidenceModel.insertMany(docs, { ordered: false });
  }

  /**
   * Records a version history entry for a tool change.
   */
  async recordHistory(
    toolId: string,
    changeType: ToolChangeType,
    changeSummary: string,
    previousData?: Record<string, any>,
    newData?: Record<string, any>,
    sourceUrl?: string
  ): Promise<void> {
    await ToolVersionHistoryModel.create({
      id: `vh-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      toolId,
      version: '1.0',
      changeType: changeType as any,
      summary: changeSummary,
      sourceUrls: sourceUrl ? [sourceUrl] : [],
      detectedAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
      previousValue: previousData ? JSON.stringify(previousData) : undefined,
      newValue: newData ? JSON.stringify(newData) : undefined,
    });
  }

  /**
   * Creates a DISCOVERED (inactive, unverified) AITool from a candidate.
   * The tool is NOT activated — activeStatus remains false.
   * The tool must pass verification before being served to learners.
   */
  async createDiscoveredTool(candidate: ToolCandidate): Promise<IAITool> {
    const now = new Date().toISOString();
    const tool = await AIToolModel.create({
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

    return tool;
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
    const updateSet: Record<string, any> = { lastUpdatedAt: new Date() };

    if (changedFields.websiteUrl) updateSet.websiteUrl = changedFields.websiteUrl.to;
    if (changedFields.pricing) updateSet.pricing = changedFields.pricing.to;
    if (changedFields.capabilities?.added) {
      updateSet.$addToSet = { capabilities: { $each: changedFields.capabilities.added } };
    }

    const { $addToSet, ...rest } = updateSet;
    const updateOps: any = { $set: rest };
    if ($addToSet) updateOps.$addToSet = $addToSet;

    await AIToolModel.updateOne({ id: existing.id }, updateOps);

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

  /**
   * Main entry point: processes a batch of candidates through the full
   * discovery pipeline.
   *
   * For each candidate:
   *  1. Normalize
   *  2. Check for duplicates
   *  3. If new: create as DISCOVERED (inactive, unverified)
   *  4. If existing: diff and update changed fields only
   *  5. Store evidence
   *  6. Update run counters
   *
   * Does NOT call external APIs. Does NOT activate any tool.
   */
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
        // Basic validation
        if (!candidate.name || !candidate.candidateId) {
          counters.rejectedCount++;
          counters.errors.push({
            candidateId: candidate.candidateId,
            message: `Rejected: missing required fields (name or candidateId)`,
          });
          continue;
        }

        const existing = await this.detectDuplicate(candidate);

        if (existing) {
          // Duplicate — check for actual changes
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
          // New tool — create as DISCOVERED, NOT activated
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

    // Determine run status
    let finalStatus: IToolDiscoveryRun['status'] = 'COMPLETED';
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

// Singleton instance
export const toolDiscoveryService = new ToolDiscoveryService();
