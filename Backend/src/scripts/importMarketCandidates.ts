/**
 * importMarketCandidates.ts
 * =========================================================
 * AIIMS Market AI Tools Catalog — Safe Prisma Candidate Import Pipeline
 *
 * Implements an idempotent, auditable, transaction-safe candidate import
 * pipeline for the AIIMS Market AI Tools Catalog.
 *
 * Safety Invariants:
 *  1. Default execution mode is strictly DRY-RUN (zero database writes).
 *  2. Actual database writes require explicit flag: --execute-write-authorized-by-owner
 *  3. Ingests ONLY candidates whose verificationStatus is 'VERIFIED'.
 *  4. Excludes all NEEDS_REVIEW, UNVERIFIED, and REJECTED candidates.
 *  5. Validates official websites, pricing sources, market tiers (1-4), and canonical domains.
 *  6. Non-destructive: Existing tools are updated with market tier/pricing metadata without
 *     overwriting user wallet links, custom ratings, or learner progression.
 *  7. Idempotent: Can be executed repeatedly with stable, identical results.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/importMarketCandidates.ts [flags]
 *
 * Flags:
 *   --dry-run                              (Default) Perform validation and preview only. Zero writes.
 *   --execute-write-authorized-by-owner    Execute live database writes inside transaction.
 *   --preview-file <path>                  Custom path for JSON preview output (default: AIIMS_MARKET_TOOLS_IMPORT_PREVIEW.json).
 */

import fs from 'fs';
import path from 'path';
import { prisma, connectDatabase, disconnectDatabase, isDatabaseConnected } from '../config/prisma';
import { CANONICAL_DOMAIN_IDS, CanonicalDomainId } from '../types';
import { toJsonInput } from '../utils/userMapper';
import { writeAuditLog } from '../services/auditLog.service';
import { SEED_TOOL_CATALOG } from '../data/aiimsCatalog';

export interface RawCandidatePlan {
  name: string;
  price: number | string;
  currency: string;
  billingPeriod?: string;
  limits?: string;
}

export interface RawMarketCandidate {
  id: string;
  name: string;
  provider: string;
  officialWebsite: string;
  officialProductPage?: string;
  primaryDomain: string;
  secondaryDomains?: string[];
  shortDescription: string;
  freePlan?: string;
  freePlanDetails?: string;
  paidPlans?: RawCandidatePlan[];
  pricingSourceUrl: string;
  pricingVerifiedAt: string;
  marketTier: number | null;
  tierReason?: string;
  tierSourceUrl?: string;
  skillLevel?: string;
  targetUsers?: string[];
  primaryUseCases?: string[];
  keyCapabilities?: string[];
  supportedPlatforms?: string[];
  evidenceSourceUrls?: string[];
  verificationStatus: string;
  verificationDate?: string;
  notes?: string;
}

export interface CandidateValidationFailure {
  id: string;
  field: string;
  message: string;
  value?: unknown;
}

export interface ExcludedCandidate {
  id: string;
  name: string;
  status: string;
  reason: string;
  tier?: number | null;
  domain?: string;
}

export interface CandidateValidationResult {
  valid: boolean;
  eligible: boolean;
  candidate?: RawMarketCandidate;
  errors: CandidateValidationFailure[];
  exclusionReason?: string;
}

export interface ProposedCreateRecord {
  id: string;
  name: string;
  provider: string;
  primaryDomain: string;
  marketTier: number;
  officialWebsite: string;
  pricingSourceUrl: string;
  freePlan?: string;
  skillLevel?: string;
  data: Record<string, unknown>;
}

export const PERMITTED_UPDATE_FIELDS = [
  'marketTier',
  'pricingDetails',
  'pricingSourceUrl',
  'pricingVerifiedAt',
  'lastVerifiedAt',
  'domains',
] as const;

export type PermittedUpdateField = (typeof PERMITTED_UPDATE_FIELDS)[number];

export interface ExistingToolRecord {
  id: string;
  name: string;
  provider?: string;
  category?: string;
  officialWebsite?: string;
  marketTier?: number | null;
  pricingDetails?: unknown;
  pricingSourceUrl?: string | null;
  pricingVerifiedAt?: Date | string | null;
  domains?: string[];
  description?: string;
  shortDescription?: string;
  capabilities?: string[];
  useCases?: string[];
  strengths?: string[];
  limitations?: string[];
  taskMappings?: string[];
}

export interface ProposedUpdateRecord {
  id: string;
  name: string;
  provider: string;
  primaryDomain: string;
  marketTier: number;
  officialWebsite: string;
  pricingSourceUrl: string;
  existingRecord: {
    id: string;
    name: string;
    category?: string;
    provider?: string;
    marketTier?: number | null;
  };
  changedFields: string[];
  safeUpdatePayload: Record<string, unknown>;
}

export interface SkippedOwnerApprovalRecord {
  id: string;
  name: string;
  provider: string;
  reason: string;
  proposedTier: number;
  existingTier: number | null;
}

export interface SkippedAlreadyImportedRecord {
  id: string;
  name: string;
  provider: string;
  reason: string;
  marketTier: number;
}

export interface PlanImportOptions {
  isLiveDatabase?: boolean;
}

export interface ImportPlan {
  totalInspected: number;
  eligibleVerifiedCount: number;
  excludedCount: number;
  excludedBreakdown: {
    needsReview: number;
    unverified: number;
    rejected: number;
    other: number;
  };
  proposedCreates: ProposedCreateRecord[];
  proposedUpdates: ProposedUpdateRecord[];
  skippedOwnerApproval: SkippedOwnerApprovalRecord[];
  skippedAlreadyImported: SkippedAlreadyImportedRecord[];
  excludedCandidates: ExcludedCandidate[];
  validationFailures: CandidateValidationFailure[];
  conflicts: Array<{ id: string; name: string; reason: string }>;
  eligibleIds: string[];
  previewContext: {
    isDatabaseSnapshot: boolean;
    previewType: 'REPOSITORY_PRELIMINARY_PREVIEW' | 'DATABASE_SYNCHRONIZED_PREVIEW';
    notice: string;
  };
}

export interface ImportResult {
  success: boolean;
  mode: 'DRY_RUN' | 'LIVE_EXECUTE';
  timestamp: string;
  plan: ImportPlan;
  createdCount: number;
  updatedCount: number;
  error?: string;
  previewFilePath?: string;
}

/**
 * Validates a single candidate object against catalog quality invariants.
 */
export function validateCandidate(raw: unknown): CandidateValidationResult {
  const errors: CandidateValidationFailure[] = [];

  if (!raw || typeof raw !== 'object') {
    return {
      valid: false,
      eligible: false,
      errors: [{ id: 'UNKNOWN', field: 'root', message: 'Candidate must be a non-null object' }],
    };
  }

  const c = raw as Partial<RawMarketCandidate>;
  const toolId = String(c.id || '').trim();

  if (!toolId) {
    errors.push({ id: 'UNKNOWN', field: 'id', message: 'Candidate tool ID is required' });
  } else if (!/^tool-[a-z0-9-]+$/.test(toolId)) {
    errors.push({
      id: toolId,
      field: 'id',
      message: `ID '${toolId}' must match slug format ^tool-[a-z0-9-]+$`,
      value: toolId,
    });
  }

  const status = String(c.verificationStatus || '')
    .trim()
    .toUpperCase();

  // Exclude non-VERIFIED statuses
  if (status !== 'VERIFIED') {
    let exclusionReason = `Non-verified status: ${status}`;
    if (status === 'NEEDS_REVIEW') {
      exclusionReason =
        'Excluded (NEEDS_REVIEW): Enterprise quote-only tier requires explicit owner review (Decision D-1)';
    } else if (status === 'UNVERIFIED') {
      exclusionReason = 'Excluded (UNVERIFIED): Closed beta / unverified commercial standing';
    } else if (status === 'REJECTED') {
      exclusionReason = 'Excluded (REJECTED): Discontinued tool / consolidated SKU / dead domain';
    }

    return {
      valid: true,
      eligible: false,
      candidate: c as RawMarketCandidate,
      errors: [],
      exclusionReason,
    };
  }

  // Validate Name & Provider
  if (!c.name || typeof c.name !== 'string' || !c.name.trim()) {
    errors.push({ id: toolId, field: 'name', message: 'Tool name is required' });
  }
  if (!c.provider || typeof c.provider !== 'string' || !c.provider.trim()) {
    errors.push({ id: toolId, field: 'provider', message: 'Tool provider is required' });
  }

  // Validate Official Website URL
  if (!c.officialWebsite || typeof c.officialWebsite !== 'string' || !c.officialWebsite.trim()) {
    errors.push({
      id: toolId,
      field: 'officialWebsite',
      message: 'Official website URL is required',
    });
  } else {
    try {
      const parsedUrl = new URL(c.officialWebsite.trim());
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        errors.push({
          id: toolId,
          field: 'officialWebsite',
          message: 'Website URL must use http or https protocol',
          value: c.officialWebsite,
        });
      }
    } catch {
      errors.push({
        id: toolId,
        field: 'officialWebsite',
        message: 'Invalid official website URL format',
        value: c.officialWebsite,
      });
    }
  }

  // Validate Canonical Domain
  const domain = String(c.primaryDomain || '').trim();
  if (!domain) {
    errors.push({
      id: toolId,
      field: 'primaryDomain',
      message: 'Primary canonical domain is required',
    });
  } else if (!CANONICAL_DOMAIN_IDS.includes(domain as CanonicalDomainId)) {
    errors.push({
      id: toolId,
      field: 'primaryDomain',
      message: `Invalid canonical domain '${domain}'. Must be one of: ${CANONICAL_DOMAIN_IDS.join(', ')}`,
      value: domain,
    });
  }

  // Validate Market Tier (Must be 1, 2, 3, or 4 for verified tools)
  if (c.marketTier === null || c.marketTier === undefined) {
    errors.push({
      id: toolId,
      field: 'marketTier',
      message: 'Verified tool must have an assigned market tier (1 to 4)',
      value: c.marketTier,
    });
  } else if (typeof c.marketTier !== 'number' || ![1, 2, 3, 4].includes(c.marketTier)) {
    errors.push({
      id: toolId,
      field: 'marketTier',
      message: `Invalid market tier '${c.marketTier}'. Must be integer 1, 2, 3, or 4.`,
      value: c.marketTier,
    });
  }

  // Validate Pricing Source URL
  if (!c.pricingSourceUrl || typeof c.pricingSourceUrl !== 'string' || !c.pricingSourceUrl.trim()) {
    errors.push({
      id: toolId,
      field: 'pricingSourceUrl',
      message: 'Pricing source URL is required for verified tool',
    });
  } else {
    try {
      const parsedUrl = new URL(c.pricingSourceUrl.trim());
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        errors.push({
          id: toolId,
          field: 'pricingSourceUrl',
          message: 'Pricing source URL must use http or https protocol',
          value: c.pricingSourceUrl,
        });
      }
    } catch {
      errors.push({
        id: toolId,
        field: 'pricingSourceUrl',
        message: 'Invalid pricing source URL format',
        value: c.pricingSourceUrl,
      });
    }
  }

  // Validate Pricing Verification Timestamp
  if (
    !c.pricingVerifiedAt ||
    typeof c.pricingVerifiedAt !== 'string' ||
    !c.pricingVerifiedAt.trim()
  ) {
    errors.push({
      id: toolId,
      field: 'pricingVerifiedAt',
      message: 'Pricing verification date is required',
    });
  } else {
    const parsedDate = Date.parse(c.pricingVerifiedAt.trim());
    if (isNaN(parsedDate)) {
      errors.push({
        id: toolId,
        field: 'pricingVerifiedAt',
        message: 'Invalid ISO date for pricingVerifiedAt',
        value: c.pricingVerifiedAt,
      });
    }
  }

  // Validate Tier Reason
  if (!c.tierReason || typeof c.tierReason !== 'string' || !c.tierReason.trim()) {
    errors.push({
      id: toolId,
      field: 'tierReason',
      message: 'Tier assignment evidence reason is required',
    });
  }

  // Validate Short Description
  if (!c.shortDescription || typeof c.shortDescription !== 'string' || !c.shortDescription.trim()) {
    errors.push({
      id: toolId,
      field: 'shortDescription',
      message: 'Short description is required',
    });
  }

  return {
    valid: errors.length === 0,
    eligible: errors.length === 0,
    candidate: c as RawMarketCandidate,
    errors,
  };
}

/**
 * Normalizes raw candidate into Prisma AiTool record structure.
 */
export function candidateToAiToolPayload(c: RawMarketCandidate): Record<string, unknown> {
  const primaryDomain = c.primaryDomain.trim();
  const secondary = (c.secondaryDomains || []).map((s) => s.trim()).filter(Boolean);
  const allDomains = Array.from(new Set([primaryDomain, ...secondary]));

  const pricingType = c.freePlan === 'Yes' ? 'FREE' : c.freePlan === 'No' ? 'PAID' : 'FREEMIUM';

  const pricingDetails = {
    type: pricingType,
    summary:
      c.freePlanDetails ||
      (c.freePlan === 'Yes'
        ? 'Free tier available'
        : c.freePlan === 'Trial'
          ? 'Free trial available'
          : 'Subscription required'),
    freeTierAvailable: c.freePlan === 'Yes',
    freeTrialAvailable: c.freePlan === 'Trial',
    paidPlans: c.paidPlans || [],
    verified: true,
    lastVerifiedAt: c.pricingVerifiedAt,
  };

  return {
    id: c.id.trim(),
    name: c.name.trim(),
    provider: c.provider.trim(),
    description: (c.shortDescription || '').trim(),
    shortDescription: (c.shortDescription || '').trim(),
    officialWebsite: c.officialWebsite.trim(),
    websiteUrl: (c.officialProductPage || c.officialWebsite).trim(),
    category: primaryDomain,
    categories: allDomains,
    domains: allDomains,
    subdomains: secondary,
    capabilities: (c.keyCapabilities || []).map((s) => s.trim()).filter(Boolean),
    useCases: (c.primaryUseCases || []).map((s) => s.trim()).filter(Boolean),
    tasks: (c.primaryUseCases || []).map((s) => s.trim()).filter(Boolean),
    targetUsers: (c.targetUsers || []).map((s) => s.trim()).filter(Boolean),
    supportedPlatforms: (c.supportedPlatforms || []).map((s) => s.trim()).filter(Boolean),
    pricing: c.freePlan ? (c.freePlan === 'Yes' ? 'Free' : c.freePlan) : 'Freemium',
    pricingDetails: toJsonInput(pricingDetails),
    pricingSourceUrl: c.pricingSourceUrl.trim(),
    pricingVerifiedAt: new Date(c.pricingVerifiedAt),
    marketTier: c.marketTier,
    firstSeenAt: c.verificationDate || new Date().toISOString(),
    lastVerifiedAt: c.pricingVerifiedAt || new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    verificationStatus: 'VERIFIED',
    activeStatus: true,
    status: 'ACTIVE',
    skillLevel: c.skillLevel || 'Beginner',
    sourceUrls:
      c.evidenceSourceUrls && c.evidenceSourceUrls.length > 0
        ? c.evidenceSourceUrls
        : [c.pricingSourceUrl],
  };
}

/**
 * Builds a strict, allowlist-only metadata enrichment payload for an existing tool.
 * Never includes or overwrites: id, name, provider, description, shortDescription,
 * officialWebsite, websiteUrl, category, capabilities, useCases, strengths,
 * limitations, taskMappings, user ratings, wallet associations, or report relationships.
 */
export function buildSafeMetadataUpdatePayload(
  candidate: RawMarketCandidate,
  existingRecord?: ExistingToolRecord
): { payload: Record<string, unknown>; changedFields: string[] } {
  const safePayload: Record<string, unknown> = {};
  const changedFields: string[] = [];

  // 1. marketTier (must be valid integer 1..4)
  if (candidate.marketTier && [1, 2, 3, 4].includes(candidate.marketTier)) {
    safePayload.marketTier = candidate.marketTier;
    changedFields.push('marketTier');
  }

  // 2. pricingDetails (JSON object)
  const pricingType =
    candidate.freePlan === 'Yes' ? 'FREE' : candidate.freePlan === 'No' ? 'PAID' : 'FREEMIUM';
  const pricingDetails = {
    type: pricingType,
    summary:
      candidate.freePlanDetails ||
      (candidate.freePlan === 'Yes'
        ? 'Free tier available'
        : candidate.freePlan === 'Trial'
          ? 'Free trial available'
          : 'Subscription required'),
    freeTierAvailable: candidate.freePlan === 'Yes',
    freeTrialAvailable: candidate.freePlan === 'Trial',
    paidPlans: candidate.paidPlans || [],
    verified: true,
    lastVerifiedAt: candidate.pricingVerifiedAt,
  };
  safePayload.pricingDetails = toJsonInput(pricingDetails);
  changedFields.push('pricingDetails');

  // 3. pricingSourceUrl (must be non-empty string)
  if (
    candidate.pricingSourceUrl &&
    typeof candidate.pricingSourceUrl === 'string' &&
    candidate.pricingSourceUrl.trim()
  ) {
    safePayload.pricingSourceUrl = candidate.pricingSourceUrl.trim();
    changedFields.push('pricingSourceUrl');
  }

  // 4. pricingVerifiedAt (valid Date)
  if (candidate.pricingVerifiedAt && !isNaN(Date.parse(candidate.pricingVerifiedAt))) {
    safePayload.pricingVerifiedAt = new Date(candidate.pricingVerifiedAt);
    changedFields.push('pricingVerifiedAt');
  }

  // 5. lastVerifiedAt (ISO date string)
  safePayload.lastVerifiedAt = candidate.pricingVerifiedAt || new Date().toISOString();
  changedFields.push('lastVerifiedAt');

  // 6. domains (canonical domain array)
  const primaryDomain = candidate.primaryDomain.trim();
  const secondary = (candidate.secondaryDomains || []).map((s) => s.trim()).filter(Boolean);
  const allDomains = Array.from(new Set([primaryDomain, ...secondary]));
  if (allDomains.length > 0) {
    safePayload.domains = allDomains;
    changedFields.push('domains');
  }

  return { payload: safePayload, changedFields };
}

/**
 * Plans the candidate import against existing catalog records.
 * Identifies creates, non-destructive updates, duplicates, and exclusions.
 */
export function planImport(
  rawCandidates: unknown[],
  existingTools: ExistingToolRecord[] = [],
  options?: PlanImportOptions
): ImportPlan {
  const existingById = new Map<string, ExistingToolRecord>();
  const existingByIdentity = new Map<string, ExistingToolRecord>();

  for (const t of existingTools) {
    existingById.set(t.id, t);
    const norm = `${t.name.toLowerCase().trim()}::${(t.provider || '').toLowerCase().trim()}`;
    existingByIdentity.set(norm, t);
  }

  const seenIds = new Set<string>();
  const seenIdentities = new Map<string, string>(); // normalized identity -> id

  const proposedCreates: ProposedCreateRecord[] = [];
  const proposedUpdates: ProposedUpdateRecord[] = [];
  const skippedOwnerApproval: SkippedOwnerApprovalRecord[] = [];
  const skippedAlreadyImported: SkippedAlreadyImportedRecord[] = [];
  const excludedCandidates: ExcludedCandidate[] = [];
  const validationFailures: CandidateValidationFailure[] = [];
  const conflicts: Array<{ id: string; name: string; reason: string }> = [];
  const eligibleIds: string[] = [];

  let needsReviewCount = 0;
  let unverifiedCount = 0;
  let rejectedCount = 0;
  let otherExcludedCount = 0;

  for (const raw of rawCandidates) {
    const valResult = validateCandidate(raw);
    const candidate = valResult.candidate;
    const toolId = candidate?.id || 'UNKNOWN';

    // Handle Exclusions
    if (!valResult.eligible) {
      if (valResult.errors.length > 0) {
        validationFailures.push(...valResult.errors);
      }

      if (candidate) {
        const s = String(candidate.verificationStatus || '').toUpperCase();
        if (s === 'NEEDS_REVIEW') needsReviewCount++;
        else if (s === 'UNVERIFIED') unverifiedCount++;
        else if (s === 'REJECTED') rejectedCount++;
        else otherExcludedCount++;

        excludedCandidates.push({
          id: toolId,
          name: candidate.name || 'Unknown',
          status: candidate.verificationStatus || 'UNKNOWN',
          reason: valResult.exclusionReason || 'Excluded by validation',
          tier: candidate.marketTier,
          domain: candidate.primaryDomain,
        });
      }
      continue;
    }

    if (!valResult.valid || !candidate) {
      validationFailures.push(...valResult.errors);
      continue;
    }

    // Check Duplicate ID inside candidate dataset
    if (seenIds.has(toolId)) {
      conflicts.push({
        id: toolId,
        name: candidate.name,
        reason: `Duplicate candidate ID '${toolId}' in dataset`,
      });
      continue;
    }
    seenIds.add(toolId);

    // Check Duplicate Normalized Identity (Name + Provider)
    const normIdentity = `${candidate.name.toLowerCase().trim()}::${candidate.provider.toLowerCase().trim()}`;
    if (seenIdentities.has(normIdentity)) {
      const priorId = seenIdentities.get(normIdentity)!;
      conflicts.push({
        id: toolId,
        name: candidate.name,
        reason: `Duplicate tool identity matching '${priorId}' (${candidate.name} by ${candidate.provider})`,
      });
      continue;
    }
    seenIdentities.set(normIdentity, toolId);

    eligibleIds.push(toolId);

    const payload = candidateToAiToolPayload(candidate);
    const existing = existingById.get(toolId);

    if (existing) {
      // 1. Identity conflict check: Verify candidate is compatible with existing record
      const existingNameClean = existing.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const candidateNameClean = candidate.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const namesAreCompatible =
        existingNameClean.includes(candidateNameClean) ||
        candidateNameClean.includes(existingNameClean) ||
        existingNameClean.slice(0, 5) === candidateNameClean.slice(0, 5);

      if (!namesAreCompatible) {
        conflicts.push({
          id: toolId,
          name: candidate.name,
          reason: `Identity conflict: Candidate ID '${toolId}' (${candidate.name}) conflicts with existing record '${existing.name}' by '${existing.provider || 'unknown'}'.`,
        });
        continue;
      }

      // 2. NotebookLM exception (Decision D-3: Tier 1 free entry vs Tier 3 market scale)
      if (toolId === 'tool-notebooklm') {
        skippedOwnerApproval.push({
          id: toolId,
          name: candidate.name,
          provider: candidate.provider,
          reason:
            'Preserved without tier mutation pending explicit owner approval (Decision D-3: Tier 1 free entry vs Tier 3 market scale)',
          proposedTier: candidate.marketTier!,
          existingTier: existing.marketTier ?? null,
        });
        continue;
      }

      // 3. Dynamic idempotency check: Skip if already imported with matching tier & source
      const alreadyHasTier = existing.marketTier === candidate.marketTier;
      const alreadyHasPricingUrl = Boolean(
        existing.pricingSourceUrl &&
        existing.pricingSourceUrl.trim() === candidate.pricingSourceUrl.trim()
      );
      if (alreadyHasTier && alreadyHasPricingUrl) {
        skippedAlreadyImported.push({
          id: toolId,
          name: candidate.name,
          provider: candidate.provider,
          reason: 'Record already has matching marketTier and pricingSourceUrl in catalog',
          marketTier: candidate.marketTier!,
        });
        continue;
      }

      // 4. Safe metadata enrichment (STRICT ALLOWLIST ONLY)
      const { payload: safePayload, changedFields } = buildSafeMetadataUpdatePayload(
        candidate,
        existing
      );

      proposedUpdates.push({
        id: toolId,
        name: existing.name, // Keep existing name
        provider: existing.provider || candidate.provider, // Keep existing provider
        primaryDomain: candidate.primaryDomain,
        marketTier: candidate.marketTier!,
        officialWebsite: existing.officialWebsite || candidate.officialWebsite, // Keep existing website
        pricingSourceUrl: candidate.pricingSourceUrl,
        existingRecord: {
          id: existing.id,
          name: existing.name,
          category: existing.category,
          provider: existing.provider,
          marketTier: existing.marketTier ?? null,
        },
        changedFields,
        safeUpdatePayload: safePayload, // ONLY ALLOWLISTED FIELDS
      });
    } else {
      // Check if candidate identity conflicts with an existing tool having a different ID
      const norm = `${candidate.name.toLowerCase().trim()}::${candidate.provider.toLowerCase().trim()}`;
      const identityMatch = existingByIdentity.get(norm);
      if (identityMatch && identityMatch.id !== toolId) {
        conflicts.push({
          id: toolId,
          name: candidate.name,
          reason: `Identity conflict: Candidate '${candidate.name}' by '${candidate.provider}' matches existing tool '${identityMatch.id}' (${identityMatch.name}) with a different ID.`,
        });
        continue;
      }

      // New tool — create
      proposedCreates.push({
        id: toolId,
        name: candidate.name,
        provider: candidate.provider,
        primaryDomain: candidate.primaryDomain,
        marketTier: candidate.marketTier!,
        officialWebsite: candidate.officialWebsite,
        pricingSourceUrl: candidate.pricingSourceUrl,
        freePlan: candidate.freePlan,
        skillLevel: candidate.skillLevel,
        data: payload,
      });
    }
  }

  const isLive = options?.isLiveDatabase ?? false;
  const previewContext = {
    isDatabaseSnapshot: isLive,
    previewType: isLive
      ? ('DATABASE_SYNCHRONIZED_PREVIEW' as const)
      : ('REPOSITORY_PRELIMINARY_PREVIEW' as const),
    notice: isLive
      ? 'Verified against live PostgreSQL database snapshot.'
      : 'Preliminary dry-run preview based on repository seed catalog baseline (SEED_TOOL_CATALOG). Does not represent live PostgreSQL database state.',
  };

  return {
    totalInspected: rawCandidates.length,
    eligibleVerifiedCount: eligibleIds.length,
    excludedCount: excludedCandidates.length,
    excludedBreakdown: {
      needsReview: needsReviewCount,
      unverified: unverifiedCount,
      rejected: rejectedCount,
      other: otherExcludedCount,
    },
    proposedCreates,
    proposedUpdates,
    skippedOwnerApproval,
    skippedAlreadyImported,
    excludedCandidates,
    validationFailures,
    conflicts,
    eligibleIds,
    previewContext,
  };
}

/**
 * Loads candidates from JSON file and generates machine-readable preview report.
 */
export function generateImportPreview(
  candidatesFilePath: string,
  previewOutputPath?: string,
  existingSnapshot?: ExistingToolRecord[],
  options?: PlanImportOptions
): ImportPlan {
  if (!fs.existsSync(candidatesFilePath)) {
    throw new Error(`Candidates dataset file not found at: ${candidatesFilePath}`);
  }

  const rawJson = fs.readFileSync(candidatesFilePath, 'utf8');
  const candidates = JSON.parse(rawJson);

  // Use provided snapshot, or fallback to SEED_TOOL_CATALOG baseline in offline/dry-run mode
  const baselineReference: ExistingToolRecord[] =
    existingSnapshot ||
    SEED_TOOL_CATALOG.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      provider: t.provider,
      officialWebsite: t.officialWebsite,
      marketTier: t.marketTier ?? null,
      pricingSourceUrl: (t as any).pricingSourceUrl ?? null,
      domains: t.domains,
      description: t.description,
      capabilities: t.capabilities,
    }));

  const plan = planImport(candidates, baselineReference, options);

  const previewData = {
    generatedAt: new Date().toISOString(),
    mode: 'DRY_RUN',
    summary: {
      totalInspected: plan.totalInspected,
      eligibleVerified: plan.eligibleVerifiedCount,
      excludedTotal: plan.excludedCount,
      excludedNeedsReview: plan.excludedBreakdown.needsReview,
      excludedUnverified: plan.excludedBreakdown.unverified,
      excludedRejected: plan.excludedBreakdown.rejected,
      proposedCreateCount: plan.proposedCreates.length,
      proposedUpdateCount: plan.proposedUpdates.length,
      skippedOwnerApprovalCount: plan.skippedOwnerApproval.length,
      skippedAlreadyImportedCount: plan.skippedAlreadyImported.length,
      conflictCount: plan.conflicts.length,
      validationErrorCount: plan.validationFailures.length,
    },
    previewContext: plan.previewContext,
    eligibleCandidateIds: plan.eligibleIds,
    excludedCandidates: plan.excludedCandidates,
    proposedCreates: plan.proposedCreates.map((c) => ({
      id: c.id,
      name: c.name,
      provider: c.provider,
      primaryDomain: c.primaryDomain,
      marketTier: c.marketTier,
      officialWebsite: c.officialWebsite,
      pricingSourceUrl: c.pricingSourceUrl,
    })),
    proposedUpdates: plan.proposedUpdates.map((u) => ({
      id: u.id,
      name: u.name,
      provider: u.provider,
      primaryDomain: u.primaryDomain,
      marketTier: u.marketTier,
      changedFields: u.changedFields,
    })),
    skippedOwnerApproval: plan.skippedOwnerApproval,
    skippedAlreadyImported: plan.skippedAlreadyImported,
    validationFailures: plan.validationFailures,
    conflicts: plan.conflicts,
  };

  const outputPath =
    previewOutputPath || path.resolve(process.cwd(), 'AIIMS_MARKET_TOOLS_IMPORT_PREVIEW.json');

  fs.writeFileSync(outputPath, JSON.stringify(previewData, null, 2), 'utf8');
  return plan;
}

/**
 * Resolves the path to a file at the project root regardless of whether the
 * caller is running from root (`AIIMS/`) or from `Backend/`.
 */
export function resolveDatasetPath(filename = 'AIIMS_MARKET_TOOLS_CANDIDATES.json'): string {
  const cwdCandidate = path.resolve(process.cwd(), filename);
  if (fs.existsSync(cwdCandidate)) return cwdCandidate;

  const parentCandidate = path.resolve(process.cwd(), '..', filename);
  if (fs.existsSync(parentCandidate)) return parentCandidate;

  const relCandidate = path.resolve(__dirname, '../../../', filename);
  if (fs.existsSync(relCandidate)) return relCandidate;

  return cwdCandidate;
}

export function resolvePreviewOutputPath(
  filename = 'AIIMS_MARKET_TOOLS_IMPORT_PREVIEW.json'
): string {
  const datasetPath = resolveDatasetPath('AIIMS_MARKET_TOOLS_CANDIDATES.json');
  return path.resolve(path.dirname(datasetPath), filename);
}

/**
 * Main import pipeline execution entry point.
 */
export async function executeImportPipeline(): Promise<ImportResult> {
  const args = process.argv.slice(2);
  const isExplicitWriteAuthorized = args.includes('--execute-write-authorized-by-owner');
  const isDryRun = !isExplicitWriteAuthorized || args.includes('--dry-run');

  const candidatesPath = resolveDatasetPath('AIIMS_MARKET_TOOLS_CANDIDATES.json');
  const previewPath = resolvePreviewOutputPath('AIIMS_MARKET_TOOLS_IMPORT_PREVIEW.json');

  console.log('========================================================================');
  console.log(' AIIMS Market AI Tools Catalog — Safe Prisma Candidate Import Pipeline ');
  console.log('========================================================================');
  console.log(
    `Execution Mode : ${isDryRun ? '🛡️  DRY-RUN (Zero database writes)' : '⚠️  LIVE WRITE MODE'}`
  );
  console.log(`Dataset Path   : ${candidatesPath}`);
  console.log(`Preview Output : ${previewPath}`);
  console.log('------------------------------------------------------------------------');

  if (!fs.existsSync(candidatesPath)) {
    console.error(`❌ Dataset file not found: ${candidatesPath}`);
    return {
      success: false,
      mode: isDryRun ? 'DRY_RUN' : 'LIVE_EXECUTE',
      timestamp: new Date().toISOString(),
      plan: {
        totalInspected: 0,
        eligibleVerifiedCount: 0,
        excludedCount: 0,
        excludedBreakdown: { needsReview: 0, unverified: 0, rejected: 0, other: 0 },
        proposedCreates: [],
        proposedUpdates: [],
        skippedOwnerApproval: [],
        skippedAlreadyImported: [],
        excludedCandidates: [],
        validationFailures: [],
        conflicts: [],
        eligibleIds: [],
        previewContext: {
          isDatabaseSnapshot: false,
          previewType: 'REPOSITORY_PRELIMINARY_PREVIEW',
          notice: 'Dataset file not found',
        },
      },
      createdCount: 0,
      updatedCount: 0,
      error: 'Dataset file not found',
    };
  }

  // Generate Plan & Preview
  const plan = generateImportPreview(candidatesPath, previewPath);

  console.log('\n📊 Candidate Inspection Summary:');
  console.log(`  • Total Candidates Inspected : ${plan.totalInspected}`);
  console.log(`  • Eligible VERIFIED Tools    : ${plan.eligibleVerifiedCount} (Ready for Ingest)`);
  console.log(`  • Excluded Candidates        : ${plan.excludedCount}`);
  console.log(`      - NEEDS_REVIEW (Quote)   : ${plan.excludedBreakdown.needsReview}`);
  console.log(`      - UNVERIFIED (Beta/Open) : ${plan.excludedBreakdown.unverified}`);
  console.log(`      - REJECTED (Discontinued): ${plan.excludedBreakdown.rejected}`);
  console.log(`  • Proposed Creates (New)     : ${plan.proposedCreates.length}`);
  console.log(`  • Proposed Safe Updates      : ${plan.proposedUpdates.length} (Allowlist only)`);
  console.log(`  • Skipped (Owner Approval)   : ${plan.skippedOwnerApproval.length}`);
  console.log(`  • Skipped (Already Imported) : ${plan.skippedAlreadyImported.length}`);
  console.log(`  • Duplicate Conflicts        : ${plan.conflicts.length}`);
  console.log(`  • Validation Errors          : ${plan.validationFailures.length}`);
  console.log(`  • Preview Context            : ${plan.previewContext.previewType}`);

  if (plan.skippedOwnerApproval.length > 0) {
    console.log('\n⏸️  Skipped pending Owner Approval:');
    plan.skippedOwnerApproval.forEach((s) => console.log(`   - [${s.id}] ${s.name}: ${s.reason}`));
  }

  if (plan.conflicts.length > 0) {
    console.warn('\n⚠️  Conflicts detected:');
    plan.conflicts.forEach((c) => console.warn(`   - [${c.id}] ${c.name}: ${c.reason}`));
  }

  if (plan.validationFailures.length > 0) {
    console.error('\n❌ Validation failures:');
    plan.validationFailures.forEach((e) =>
      console.error(`   - [${e.id}] ${e.field}: ${e.message}`)
    );
  }

  console.log(`\n💾 Machine-readable preview saved to: ${previewPath}`);

  if (isDryRun) {
    console.log('\n------------------------------------------------------------------------');
    console.log('✅ DRY-RUN COMPLETE: Zero database writes executed.');
    console.log('   To perform live database writes in future Phase F operations:');
    console.log(
      '   npx ts-node -r tsconfig-paths/register src/scripts/importMarketCandidates.ts --execute-write-authorized-by-owner'
    );
    console.log('========================================================================\n');

    return {
      success: true,
      mode: 'DRY_RUN',
      timestamp: new Date().toISOString(),
      plan,
      createdCount: 0,
      updatedCount: 0,
      previewFilePath: previewPath,
    };
  }

  // --- LIVE WRITE MODE (Guarded by --execute-write-authorized-by-owner) ---
  console.log('\n🔌 Connecting to PostgreSQL...');
  const conn = await connectDatabase(3, 1000);
  if (!conn.connected || !isDatabaseConnected()) {
    console.warn('⚠️  PostgreSQL is not reachable. Live write operation aborted.');
    return {
      success: false,
      mode: 'LIVE_EXECUTE',
      timestamp: new Date().toISOString(),
      plan,
      createdCount: 0,
      updatedCount: 0,
      error: 'PostgreSQL database unreachable',
    };
  }

  let createdCount = 0;
  let updatedCount = 0;

  try {
    console.log('🚀 Executing transactional catalog import with 30s timeout...');
    const rawCandidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'));

    await prisma.$transaction(
      async (tx) => {
        // 1. Dynamic state check: Fetch actual existing database records
        const dbTools = await tx.aiTool.findMany({
          select: {
            id: true,
            name: true,
            provider: true,
            category: true,
            officialWebsite: true,
            marketTier: true,
            pricingSourceUrl: true,
            pricingVerifiedAt: true,
            domains: true,
            description: true,
            capabilities: true,
          },
        });

        // 2. Re-evaluate import plan dynamically against live database state
        const livePlan = planImport(rawCandidates, dbTools as ExistingToolRecord[], {
          isLiveDatabase: true,
        });

        if (livePlan.conflicts.length > 0) {
          const conflictDetails = livePlan.conflicts.map((c) => `[${c.id}] ${c.reason}`).join('; ');
          throw new Error(
            `Import aborted due to ${livePlan.conflicts.length} identity conflicts: ${conflictDetails}`
          );
        }

        // 3. Process Creates
        for (const item of livePlan.proposedCreates) {
          await tx.aiTool.create({
            data: item.data as any,
          });
          createdCount++;
        }

        // 4. Process Safe Updates using STRICT ALLOWLIST ONLY
        for (const item of livePlan.proposedUpdates) {
          await tx.aiTool.update({
            where: { id: item.id },
            data: item.safeUpdatePayload as any, // STRICT ALLOWLIST: marketTier, pricingDetails, pricingSourceUrl, pricingVerifiedAt, lastVerifiedAt, domains
          });
          updatedCount++;
        }
      },
      {
        timeout: 30000,
        maxWait: 10000,
      }
    );

    console.log(
      `✅ Transaction committed successfully: ${createdCount} created, ${updatedCount} updated.`
    );

    // Write audit log
    await writeAuditLog({
      actor: 'system-migration',
      actorName: 'Phase F.1 Candidate Import Pipeline',
      actorRole: 'admin',
      action: 'TOOL_CATALOG_IMPORTED',
      target: 'AiToolCatalog',
      targetType: 'SYSTEM',
      details: {
        createdCount,
        updatedCount,
        totalEligible: plan.eligibleVerifiedCount,
        datasetFile: 'AIIMS_MARKET_TOOLS_CANDIDATES.json',
      },
    });

    return {
      success: true,
      mode: 'LIVE_EXECUTE',
      timestamp: new Date().toISOString(),
      plan,
      createdCount,
      updatedCount,
      previewFilePath: previewPath,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('❌ Transaction rolled back due to error:', msg);
    return {
      success: false,
      mode: 'LIVE_EXECUTE',
      timestamp: new Date().toISOString(),
      plan,
      createdCount: 0,
      updatedCount: 0,
      error: msg,
    };
  } finally {
    await disconnectDatabase();
    console.log('🔌 Disconnected from PostgreSQL.');
  }
}

// Auto-run if executed directly via CLI
if (require.main === module) {
  executeImportPipeline()
    .then((res) => {
      process.exit(res.success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal import pipeline error:', err);
      process.exit(1);
    });
}
