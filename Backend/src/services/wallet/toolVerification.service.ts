import { AITool, ToolPricing, VerificationStatus } from '../../types';
import { StructuredAssessment } from './toolAssessment.service';
import { SourceItem } from './toolSource.service';
import { ToolEvidenceItem } from '../../models/toolEvidence.model';

export interface VerificationResult {
  tool: AITool;
  evidenceItems: Omit<ToolEvidenceItem, 'id' | 'toolId'>[];
  verificationStatus: VerificationStatus;
  confidence: number;
}

/**
 * Tool Verification Service — Deterministic & Source-Priority Validation Layer
 * Ensures source evidence overrides arbitrary model claims and enforces strict factual correctness.
 */
export class ToolVerificationService {
  /**
   * Verify candidate assessment against source priority rules, evidence sufficiency, and URL validation.
   */
  public static verifyCandidate(assessment: StructuredAssessment, sourceItem: SourceItem, existingTool?: AITool): VerificationResult {
    const nowIso = new Date().toISOString();

    // 1. Deterministic URL Validation
    const rawUrl = assessment.identity.officialWebsite || sourceItem.url;
    const officialWebsite = this.sanitizeUrl(rawUrl);

    // 2. Source Priority Evaluation (1 = Highest priority official source)
    const sourcePriority = sourceItem.sourcePriority || 5;
    const isOfficialSource = sourcePriority <= 2;

    // 3. Strict Identity and Capability Evidence Verification
    const candidateName = (assessment.identity.name || sourceItem.title || '').trim();
    const isVersionTag = /^v?\d+\.\d+/.test(candidateName);
    const hasValidName = candidateName.length >= 2 && !isVersionTag;
    const hasValidUrl = officialWebsite && !officialWebsite.includes('example.com');
    const isIdentityVerified = Boolean(hasValidName && hasValidUrl);

    // Capabilities must be non-empty and substantiated
    const validCapabilities = (assessment.taxonomy.capabilities || []).filter(
      c => typeof c === 'string' && c.trim().length > 0 && c.toLowerCase() !== 'task execution'
    );
    const hasCapabilityEvidence = validCapabilities.length > 0;

    // Sufficient evidence requires valid identity, real capabilities, relevance, and no pending verification flag
    const hasSufficientEvidence = isIdentityVerified &&
      hasCapabilityEvidence &&
      assessment.classification.isRelevant &&
      !assessment.needsVerification &&
      (assessment.confidence >= 0.75);

    // 4. Verification and Activation Status Determination
    let verificationStatus: VerificationStatus;
    let activeStatus: boolean;

    if (existingTool) {
      // PRESERVE existing verification status for seeded or verified tools
      if (existingTool.verificationStatus === 'VERIFIED_SEED') {
        verificationStatus = 'VERIFIED_SEED';
      } else if (existingTool.verificationStatus === 'VERIFIED') {
        verificationStatus = 'VERIFIED';
      } else {
        verificationStatus = hasSufficientEvidence ? 'VERIFIED' : existingTool.verificationStatus;
      }
      // CRITICAL: Preserve existing tool's activation status when updating metadata
      activeStatus = existingTool.activeStatus !== undefined ? existingTool.activeStatus : true;
    } else {
      // NEW CANDIDATE: Unverified candidates are never eligible for public recommendation
      if (hasSufficientEvidence && isOfficialSource) {
        verificationStatus = 'VERIFIED';
        activeStatus = true; // Eligible for activation only after identity and capability evidence verified
      } else if (hasSufficientEvidence) {
        verificationStatus = 'COMMUNITY_VERIFIED';
        activeStatus = false; // Secondary source candidates require review before public activation
      } else {
        verificationStatus = 'UNVERIFIED';
        activeStatus = false; // Insufficient evidence -> strictly inactive
      }
    }

    // 5. Pricing Verification & Conflict Resolution
    const pricingDetails: ToolPricing = {
      type: assessment.pricing.type || 'UNKNOWN',
      summary: assessment.pricing.summary || 'Pricing not verified',
      freeTierAvailable: assessment.pricing.freeTierAvailable || false,
      freeTrialAvailable: assessment.pricing.freeTrialAvailable || false,
      trialDurationDays: assessment.pricing.trialDurationDays,
      startingPriceMonthlyUsd: assessment.pricing.startingPriceMonthlyUsd,
      verified: isOfficialSource && hasSufficientEvidence,
      lastVerifiedAt: nowIso
    };

    // If source is secondary and claims conflict with existing verified pricing, prefer existing verified data
    if (existingTool && existingTool.pricingDetails.verified && !isOfficialSource) {
      pricingDetails.type = existingTool.pricingDetails.type;
      pricingDetails.freeTierAvailable = existingTool.pricingDetails.freeTierAvailable;
      pricingDetails.summary = existingTool.pricingDetails.summary;
    }

    // 6. Construct Verified AITool Record
    const tool: AITool = {
      id: existingTool?.id || `tool-${this.slugify(candidateName)}`,
      name: candidateName,
      provider: assessment.identity.provider || 'AI Ecosystem Provider',
      description: assessment.description.long || sourceItem.content,
      shortDescription: assessment.description.short || sourceItem.content.slice(0, 150),
      officialWebsite,
      websiteUrl: officialWebsite,
      category: assessment.taxonomy.category || 'Reasoning & Writing',
      categories: assessment.taxonomy.categories || [assessment.taxonomy.category || 'Reasoning & Writing'],
      domains: assessment.taxonomy.domains || ['Software & Technology'],
      subdomains: assessment.taxonomy.subdomains || ['AI Tools'],
      capabilities: validCapabilities,
      useCases: existingTool?.useCases || (validCapabilities.length > 0 ? ['Task execution'] : []),
      tasks: (assessment.taxonomy.tasks || []).filter(t => t.toLowerCase() !== 'ai task automation'),
      strengths: existingTool?.strengths || ['High capability'],
      limitations: existingTool?.limitations || ['Requires account setup'],
      pricingDetails,
      pricing: pricingDetails.summary,
      firstSeenAt: existingTool?.firstSeenAt || sourceItem.publishedAt || nowIso,
      lastVerifiedAt: hasSufficientEvidence ? nowIso : (existingTool?.lastVerifiedAt || nowIso),
      lastUpdatedAt: nowIso,
      status: existingTool ? 'RECENTLY_UPDATED' : 'NEW',
      verificationStatus,
      sourceUrls: Array.from(new Set([...(existingTool?.sourceUrls || []), sourceItem.url])),
      tags: Array.from(new Set([...(existingTool?.tags || []), 'ai-tool', sourceItem.sourceId])),
      activeStatus,
      taskMappings: [candidateName.toLowerCase(), ...(assessment.taxonomy.tasks || []).map(t => t.toLowerCase())]
    };

    // 7. Construct Supporting Evidence Records
    const evidenceItems: Omit<ToolEvidenceItem, 'id' | 'toolId'>[] = assessment.evidence.map(e => ({
      claim: e.claim,
      value: e.value,
      sourceUrl: e.sourceUrl || sourceItem.url,
      sourceType: isOfficialSource ? 'Official Announcement' : 'Public Feed',
      sourceTitle: sourceItem.sourceName,
      publishedAt: sourceItem.publishedAt,
      verifiedAt: nowIso,
      confidence: Math.min(e.confidence || 0.85, isOfficialSource ? 1.0 : 0.80),
      verificationStatus: isOfficialSource ? 'VERIFIED' : 'PARTIALLY_VERIFIED'
    }));

    return {
      tool,
      evidenceItems,
      verificationStatus,
      confidence: hasSufficientEvidence ? (isOfficialSource ? 0.95 : 0.80) : 0.40
    };
  }

  private static sanitizeUrl(url: string): string {
    if (!url) return 'https://ai.example.com';
    let clean = url.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    return clean;
  }

  private static slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
}
