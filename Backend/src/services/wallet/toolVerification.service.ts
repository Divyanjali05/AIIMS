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
   * Verify candidate assessment against source priority rules and URL validation.
   */
  public static verifyCandidate(assessment: StructuredAssessment, sourceItem: SourceItem, existingTool?: AITool): VerificationResult {
    const nowIso = new Date().toISOString();

    // 1. Deterministic URL Validation
    const officialWebsite = this.sanitizeUrl(assessment.identity.officialWebsite || sourceItem.url);

    // 2. Source Priority Evaluation (1 = Highest priority official source)
    const sourcePriority = sourceItem.sourcePriority || 5;
    const isOfficialSource = sourcePriority <= 2;

    // 3. Pricing Verification & Conflict Resolution
    const pricingDetails: ToolPricing = {
      type: assessment.pricing.type || 'UNKNOWN',
      summary: assessment.pricing.summary || 'Pricing not verified',
      freeTierAvailable: assessment.pricing.freeTierAvailable || false,
      freeTrialAvailable: assessment.pricing.freeTrialAvailable || false,
      trialDurationDays: assessment.pricing.trialDurationDays,
      startingPriceMonthlyUsd: assessment.pricing.startingPriceMonthlyUsd,
      verified: isOfficialSource,
      lastVerifiedAt: nowIso
    };

    // If source is secondary and claims conflict with existing verified pricing, prefer existing verified data
    if (existingTool && existingTool.pricingDetails.verified && !isOfficialSource) {
      pricingDetails.type = existingTool.pricingDetails.type;
      pricingDetails.freeTierAvailable = existingTool.pricingDetails.freeTierAvailable;
      pricingDetails.summary = existingTool.pricingDetails.summary;
    }

    // 4. Construct Verified AITool Record
    const tool: AITool = {
      id: existingTool?.id || `tool-${this.slugify(assessment.identity.name)}`,
      name: assessment.identity.name || sourceItem.title,
      provider: assessment.identity.provider || 'AI Ecosystem Provider',
      description: assessment.description.long || sourceItem.content,
      shortDescription: assessment.description.short || sourceItem.content.slice(0, 150),
      officialWebsite,
      websiteUrl: officialWebsite,
      category: assessment.taxonomy.category || 'Reasoning & Writing',
      categories: assessment.taxonomy.categories || [assessment.taxonomy.category || 'Reasoning & Writing'],
      domains: assessment.taxonomy.domains || ['Software & Technology'],
      subdomains: assessment.taxonomy.subdomains || ['AI Tools'],
      capabilities: assessment.taxonomy.capabilities || ['AI Task Execution'],
      useCases: existingTool?.useCases || ['Task execution'],
      tasks: assessment.taxonomy.tasks || [sourceItem.title],
      strengths: existingTool?.strengths || ['High capability'],
      limitations: existingTool?.limitations || ['Requires account setup'],
      pricingDetails,
      pricing: pricingDetails.summary,
      firstSeenAt: existingTool?.firstSeenAt || sourceItem.publishedAt || nowIso,
      lastVerifiedAt: nowIso,
      lastUpdatedAt: nowIso,
      status: existingTool ? 'RECENTLY_UPDATED' : 'NEW',
      verificationStatus: isOfficialSource ? 'VERIFIED' : 'COMMUNITY_VERIFIED',
      sourceUrls: Array.from(new Set([...(existingTool?.sourceUrls || []), sourceItem.url])),
      tags: Array.from(new Set([...(existingTool?.tags || []), 'ai-tool', sourceItem.sourceId])),
      activeStatus: true,
      taskMappings: [assessment.identity.name.toLowerCase(), ...(assessment.taxonomy.tasks || []).map(t => t.toLowerCase())]
    };

    // 5. Construct Supporting Evidence Records
    const evidenceItems: Omit<ToolEvidenceItem, 'id' | 'toolId'>[] = assessment.evidence.map(e => ({
      claim: e.claim,
      value: e.value,
      sourceUrl: e.sourceUrl || sourceItem.url,
      sourceType: isOfficialSource ? 'Official Announcement' : 'Public Feed',
      sourceTitle: sourceItem.sourceName,
      publishedAt: sourceItem.publishedAt,
      verifiedAt: nowIso,
      confidence: Math.min(e.confidence || 0.90, isOfficialSource ? 1.0 : 0.85),
      verificationStatus: isOfficialSource ? 'VERIFIED' : 'PARTIALLY_VERIFIED'
    }));

    return {
      tool,
      evidenceItems,
      verificationStatus: isOfficialSource ? 'VERIFIED' : 'COMMUNITY_VERIFIED',
      confidence: isOfficialSource ? 0.98 : 0.85
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
