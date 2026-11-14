/**
 * toolVerification.service.ts
 * ==========================================
 * Phase 2A: Tool Verification Service (PostgreSQL + Prisma)
 *
 * Responsibilities:
 *  - Evaluate the evidence corpus for a discovered tool
 *  - Determine whether required metadata fields have sufficient evidence
 *  - Calculate evidence coverage ratio
 *  - Determine final verificationStatus
 *  - Prevent unsupported claims (never accepts AI-generated text alone)
 */

import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { ToolEvidence as PrismaToolEvidence } from '@prisma/client';
import { ToolVerificationStatus } from '../types/models';
import { isValidId } from '../utils/id';

// ==========================================
// REQUIRED EVIDENCE FIELDS
// ==========================================
const REQUIRED_EVIDENCE_FIELDS = ['name', 'description', 'websiteUrl'] as const;

type RequiredField = (typeof REQUIRED_EVIDENCE_FIELDS)[number];

const FIELD_COVERAGE_KEYWORDS: Record<RequiredField, string[]> = {
  name: ['tool', 'product', 'platform', 'model', 'assistant'],
  description: ['ai', 'model', 'generate', 'language', 'image', 'code', 'chat', 'automate'],
  websiteUrl: ['official', 'website', 'homepage', 'docs', 'pricing'],
};

// ==========================================
// VERIFICATION RESULT
// ==========================================

export interface VerificationResult {
  toolId: string;
  status: ToolVerificationStatus;
  evidenceCoverage: number; // 0–1
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
  private fieldCoveredBy(field: RequiredField, evidence: PrismaToolEvidence): boolean {
    const text = (evidence.evidenceText || evidence.value || '').toLowerCase();
    const keywords = FIELD_COVERAGE_KEYWORDS[field];
    return keywords.some((kw) => text.includes(kw));
  }

  /**
   * Evaluates all ACCEPTED evidence documents for a given toolId and
   * computes the verificationStatus + evidenceCoverage.
   */
  async verifyTool(toolId: string): Promise<VerificationResult> {
    const notes: string[] = [];

    const tool = await prisma.aiTool.findFirst({ where: { id: toolId } });
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
        notes: [`Tool "${toolId}" not found in the catalog.`],
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
        notes: ['Tool entered via curated seed — treated as verified.'],
      };
    }

    const allEvidence = await prisma.toolEvidence.findMany({ where: { toolId } });

    const accepted = allEvidence.filter((e) => e.verificationStatus === 'ACCEPTED');
    const pending = allEvidence.filter((e) => e.verificationStatus === 'PENDING');
    const rejected = allEvidence.filter((e) => e.verificationStatus === 'REJECTED');

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
        notes,
      };
    }

    const coveredFields: string[] = [];
    const missingFields: string[] = [];

    for (const field of REQUIRED_EVIDENCE_FIELDS) {
      const isCovered = accepted.some((e) => this.fieldCoveredBy(field, e));
      if (isCovered) {
        coveredFields.push(field);
      } else {
        missingFields.push(field);
        notes.push(`No accepted evidence covers the "${field}" field.`);
      }
    }

    if (!tool.websiteUrl && !coveredFields.includes('websiteUrl')) {
      notes.push('Tool has no websiteUrl — verification blocked.');
      missingFields.push('websiteUrl');
    }

    const evidenceCoverage = coveredFields.length / REQUIRED_EVIDENCE_FIELDS.length;

    let status: ToolVerificationStatus;
    if (missingFields.length === 0 && evidenceCoverage >= 1) {
      status = 'VERIFIED';
      notes.push('All required evidence fields are covered — tool is VERIFIED.');
    } else if (accepted.length > 0) {
      status = 'UNVERIFIED';
      notes.push(
        `Partial coverage (${coveredFields.length}/${REQUIRED_EVIDENCE_FIELDS.length}). More evidence needed.`
      );
    } else {
      status = 'DISCOVERED';
    }

    const now = new Date().toISOString();
    const updateFields: Record<string, any> = {
      verificationStatus: status,
      evidenceCoverage,
      lastUpdatedAt: now,
    };
    if (status === 'VERIFIED') {
      updateFields.lastVerifiedAt = now;
      updateFields.activeStatus = true;
    } else if (status === 'UNVERIFIED' || status === 'DISCOVERED' || status === 'REJECTED') {
      updateFields.activeStatus = false;
    }

    await prisma.aiTool.update({
      where: { id: toolId },
      data: updateFields,
    });

    if (tool.verificationStatus !== status) {
      await prisma.toolVersionHistory.create({
        data: {
          id: `vh-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
          toolId,
          version: '1.0',
          changeType: 'STATUS_CHANGE',
          summary: `Verification status changed: ${tool.verificationStatus} → ${status}`,
          changeSummary: `Verification status changed: ${tool.verificationStatus} → ${status}`,
          detectedAt: now,
          verifiedAt: now,
          sourceUrls: [],
          previousValue: tool.verificationStatus,
          newValue: status,
        },
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
      notes,
    };
  }

  /**
   * Accepts a specific evidence document and triggers re-verification.
   */
  async acceptEvidence(evidenceId: string): Promise<VerificationResult | null> {
    if (!isValidId(evidenceId)) return null;

    const existing = await prisma.toolEvidence.findUnique({ where: { id: evidenceId } });
    if (!existing) return null;

    const evidence = await prisma.toolEvidence.update({
      where: { id: evidenceId },
      data: { verificationStatus: 'ACCEPTED' },
    });

    return this.verifyTool(evidence.toolId);
  }

  /**
   * Rejects a specific evidence document.
   */
  async rejectEvidence(evidenceId: string): Promise<void> {
    if (!isValidId(evidenceId)) return;
    await prisma.toolEvidence.updateMany({
      where: { id: evidenceId },
      data: { verificationStatus: 'REJECTED' },
    });
  }

  /**
   * Computes evidence coverage for a tool without changing any state.
   */
  async computeCoverage(toolId: string): Promise<number> {
    const accepted = await prisma.toolEvidence.findMany({
      where: {
        toolId,
        verificationStatus: { in: ['ACCEPTED', 'VERIFIED'] },
      },
    });

    if (accepted.length === 0) return 0;

    const covered = REQUIRED_EVIDENCE_FIELDS.filter((field) =>
      accepted.some((e) => this.fieldCoveredBy(field, e))
    );

    return covered.length / REQUIRED_EVIDENCE_FIELDS.length;
  }
}

export const toolVerificationService = new ToolVerificationService();
