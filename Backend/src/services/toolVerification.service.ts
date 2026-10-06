/**
 * toolVerification.service.ts
 * ==========================================
 * Phase 2A: Tool Verification Service
 *
 * Responsibilities:
 *  - Evaluate the evidence corpus for a discovered tool
 *  - Determine whether required metadata fields have sufficient evidence
 *  - Calculate evidence coverage ratio
 *  - Determine final verificationStatus
 *  - Prevent unsupported claims (never accepts AI-generated text alone)
 *
 * Verification rules:
 *  - A tool is VERIFIED only when it has at least one ACCEPTED evidence
 *    document covering each required field.
 *  - AI-generated text is NOT counted as evidence.
 *  - A VERIFIED_SEED tool is always considered verified — it entered via
 *    the curated seed process, not discovery.
 */

import { AIToolModel, IAITool, ToolVerificationStatus } from '../models/aiTool.model';
import { ToolEvidenceModel, IToolEvidence } from '../models/toolEvidence.model';
import { ToolVersionHistoryModel } from '../models/toolVersionHistory.model';

// ==========================================
// REQUIRED EVIDENCE FIELDS
// A tool must have at least one ACCEPTED evidence doc
// covering each of these topics to be VERIFIED.
// ==========================================
const REQUIRED_EVIDENCE_FIELDS = [
  'name',
  'description',
  'websiteUrl'
] as const;

type RequiredField = (typeof REQUIRED_EVIDENCE_FIELDS)[number];

// ==========================================
// EVIDENCE FIELD COVERAGE RULES
// Maps field names to keywords that must appear in the evidence text
// for it to count as covering that field.
// ==========================================
const FIELD_COVERAGE_KEYWORDS: Record<RequiredField, string[]> = {
  name:        ['tool', 'product', 'platform', 'model', 'assistant'],
  description: ['ai', 'model', 'generate', 'language', 'image', 'code', 'chat', 'automate'],
  websiteUrl:  ['official', 'website', 'homepage', 'docs', 'pricing']
};

// ==========================================
// VERIFICATION RESULT
// ==========================================

export interface VerificationResult {
  toolId: string;
  status: ToolVerificationStatus;
  evidenceCoverage: number;      // 0–1
  coveredFields: string[];
  missingFields: string[];
  acceptedEvidenceCount: number;
  pendingEvidenceCount: number;
  rejectedEvidenceCount: number;
  notes: string[];
}

// ==========================================
// VERIFICATION SERVICE
// ==========================================

export class ToolVerificationService {

  /**
   * Determines if a piece of evidence adequately covers a required field
   * based on keyword matching against the evidenceText.
   */
  private fieldCoveredBy(field: RequiredField, evidence: IToolEvidence): boolean {
    const text = (evidence.evidenceText || evidence.value || '').toLowerCase();
    const keywords = FIELD_COVERAGE_KEYWORDS[field];
    return keywords.some(kw => text.includes(kw));
  }

  /**
   * Evaluates all ACCEPTED evidence documents for a given toolId and
   * computes the verificationStatus + evidenceCoverage.
   *
   * IMPORTANT:
   *  - Only ACCEPTED evidence is used for verification.
   *  - PENDING evidence does not count until explicitly accepted.
   *  - REJECTED evidence is completely ignored.
   *  - AI-generated descriptions are never eligible for evidence (no
   *    sourceType exists for AI-generated content).
   */
  async verifyTool(toolId: string): Promise<VerificationResult> {
    const notes: string[] = [];

    // --- Guard: VERIFIED_SEED tools are always considered verified ---
    const tool = await AIToolModel.findOne({ id: toolId }).lean<IAITool>();
    if (!tool) {
      return {
        toolId,
        status: 'REJECTED',
        evidenceCoverage: 0,
        coveredFields: [],
        missingFields: [...REQUIRED_EVIDENCE_FIELDS],
        acceptedEvidenceCount: 0,
        pendingEvidenceCount: 0,
        rejectedEvidenceCount: 0,
        notes: [`Tool "${toolId}" not found in the catalog.`]
      };
    }

    if (tool.verificationStatus === 'VERIFIED_SEED') {
      return {
        toolId,
        status: 'VERIFIED_SEED',
        evidenceCoverage: 1,
        coveredFields: [...REQUIRED_EVIDENCE_FIELDS],
        missingFields: [],
        acceptedEvidenceCount: 0,
        pendingEvidenceCount: 0,
        rejectedEvidenceCount: 0,
        notes: ['Tool entered via curated seed — treated as verified.']
      };
    }

    // --- Fetch evidence breakdown ---
    const allEvidence = await ToolEvidenceModel.find({ toolId }).lean<IToolEvidence[]>();

    const accepted  = allEvidence.filter(e => e.verificationStatus === 'ACCEPTED');
    const pending   = allEvidence.filter(e => e.verificationStatus === 'PENDING');
    const rejected  = allEvidence.filter(e => e.verificationStatus === 'REJECTED');

    if (accepted.length === 0) {
      notes.push('No accepted evidence found. Tool cannot be verified.');
      const newStatus: ToolVerificationStatus =
        tool.verificationStatus === 'DISCOVERED' ? 'DISCOVERED' : 'UNVERIFIED';

      return {
        toolId,
        status: newStatus,
        evidenceCoverage: 0,
        coveredFields: [],
        missingFields: [...REQUIRED_EVIDENCE_FIELDS],
        acceptedEvidenceCount: 0,
        pendingEvidenceCount: pending.length,
        rejectedEvidenceCount: rejected.length,
        notes
      };
    }

    // --- Compute field coverage ---
    const coveredFields: string[] = [];
    const missingFields: string[] = [];

    for (const field of REQUIRED_EVIDENCE_FIELDS) {
      const isCovered = accepted.some(e => this.fieldCoveredBy(field, e));
      if (isCovered) {
        coveredFields.push(field);
      } else {
        missingFields.push(field);
        notes.push(`No accepted evidence covers the "${field}" field.`);
      }
    }

    // Also check for website URL presence directly in the tool record
    // (not from evidence text) as an additional baseline check
    if (!tool.websiteUrl && !coveredFields.includes('websiteUrl')) {
      notes.push('Tool has no websiteUrl — verification blocked.');
      missingFields.push('websiteUrl');
    }

    const evidenceCoverage = coveredFields.length / REQUIRED_EVIDENCE_FIELDS.length;

    // --- Determine final status ---
    let status: ToolVerificationStatus;
    if (missingFields.length === 0 && evidenceCoverage >= 1) {
      status = 'VERIFIED';
      notes.push('All required evidence fields are covered — tool is VERIFIED.');
    } else if (accepted.length > 0) {
      status = 'UNVERIFIED';
      notes.push(`Partial coverage (${coveredFields.length}/${REQUIRED_EVIDENCE_FIELDS.length}). More evidence needed.`);
    } else {
      status = 'DISCOVERED';
    }

    // --- Persist updated verification status to the tool ---
    const now = new Date().toISOString();
    const updateFields: Record<string, any> = {
      verificationStatus: status,
      evidenceCoverage,
      lastUpdatedAt: now
    };
    if (status === 'VERIFIED') {
      updateFields.lastVerifiedAt = now;
    }
    await AIToolModel.updateOne({ id: toolId }, { $set: updateFields });

    // --- Record status change in version history ---
    if (tool.verificationStatus !== status) {
      await ToolVersionHistoryModel.create({
        id: `vh-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        toolId,
        version: '1.0',
        changeType: 'STATUS_CHANGE',
        summary: `Verification status changed: ${tool.verificationStatus} → ${status}`,
        detectedAt: now,
        verifiedAt: now,
        sourceUrls: [],
        previousValue: tool.verificationStatus,
        newValue: status
      });
    }

    return {
      toolId,
      status,
      evidenceCoverage,
      coveredFields,
      missingFields,
      acceptedEvidenceCount: accepted.length,
      pendingEvidenceCount: pending.length,
      rejectedEvidenceCount: rejected.length,
      notes
    };
  }

  /**
   * Accepts a specific evidence document and triggers re-verification.
   * Used by admin endpoints to approve collected evidence.
   */
  async acceptEvidence(evidenceId: string): Promise<VerificationResult | null> {
    const evidence = await ToolEvidenceModel.findByIdAndUpdate(
      evidenceId,
      { $set: { verificationStatus: 'ACCEPTED' } },
      { returnDocument: 'after' }
    ).lean<IToolEvidence>();

    if (!evidence) return null;

    // Re-run verification after accepting
    return this.verifyTool(evidence.toolId);
  }

  /**
   * Rejects a specific evidence document.
   */
  async rejectEvidence(evidenceId: string): Promise<void> {
    await ToolEvidenceModel.findByIdAndUpdate(evidenceId, {
      $set: { verificationStatus: 'REJECTED' }
    });
  }

  /**
   * Computes evidence coverage for a tool without changing any state.
   * Used for read-only reporting.
   */
  async computeCoverage(toolId: string): Promise<number> {
    const accepted = await ToolEvidenceModel.find({
      toolId,
      verificationStatus: { $in: ['ACCEPTED', 'VERIFIED'] as any }
    }).lean<IToolEvidence[]>();

    if (accepted.length === 0) return 0;

    const covered = REQUIRED_EVIDENCE_FIELDS.filter(field =>
      accepted.some(e => this.fieldCoveredBy(field, e))
    );

    return covered.length / REQUIRED_EVIDENCE_FIELDS.length;
  }
}

// Singleton instance
export const toolVerificationService = new ToolVerificationService();
