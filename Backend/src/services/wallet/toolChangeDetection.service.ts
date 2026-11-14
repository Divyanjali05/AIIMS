import { AITool } from '../../types';
import { prisma, isDatabaseConnected } from '../../config/prisma';
import { ToolVersionRecord } from '../../types/models';

export interface DetectedChange {
  hasChanges: boolean;
  changeType?: ToolVersionRecord['changeType'];
  summary?: string;
  previousValue?: string;
  newValue?: string;
  versionRecord?: ToolVersionRecord;
}

/**
 * Tool Change Detection Service — Content Hashing & Selective Change Re-assessment
 * Detects version updates, pricing adjustments, capability changes, and model updates.
 */
export class ToolChangeDetectionService {
  private static cachedHashes: Map<string, { hash: string; lastAssessedAt: string }> = new Map();

  /**
   * Fast check if source content has changed since last assessment.
   * Prevents calling expensive LLM evaluations when source data is unchanged.
   */
  public static isSourceUnchanged(toolId: string, currentContentHash: string): boolean {
    const cached = this.cachedHashes.get(toolId);
    if (cached && cached.hash === currentContentHash) {
      return true;
    }
    return false;
  }

  /**
   * Record updated source content hash.
   */
  public static updateSourceHash(toolId: string, contentHash: string): void {
    this.cachedHashes.set(toolId, {
      hash: contentHash,
      lastAssessedAt: new Date().toISOString(),
    });
  }

  /**
   * Compare new tool candidate against existing catalog tool to identify explicit changes
   * and persist version history in PostgreSQL.
   */
  public static async detectToolChanges(
    existingTool: AITool,
    candidateTool: AITool,
    sourceUrl: string
  ): Promise<DetectedChange> {
    const nowIso = new Date().toISOString();
    const changes: string[] = [];
    let primaryChangeType: ToolVersionRecord['changeType'] = 'MAJOR_PRODUCT_UPDATE';

    if (
      existingTool.pricingDetails.type !== candidateTool.pricingDetails.type ||
      existingTool.pricingDetails.freeTierAvailable !==
        candidateTool.pricingDetails.freeTierAvailable
    ) {
      primaryChangeType = 'PRICING_CHANGE';
      changes.push(
        `Pricing updated: ${existingTool.pricingDetails.summary} -> ${candidateTool.pricingDetails.summary}`
      );
    }

    const newCapabilities = candidateTool.capabilities.filter(
      (c) => !existingTool.capabilities.includes(c)
    );
    if (newCapabilities.length > 0) {
      primaryChangeType = 'CAPABILITY_ADDED';
      changes.push(`Added new capabilities: ${newCapabilities.join(', ')}`);
    }

    if (changes.length === 0) {
      return { hasChanges: false };
    }

    const versionRecord: ToolVersionRecord = {
      id: `ver-${existingTool.id}-${Date.now()}`,
      toolId: existingTool.id,
      version: candidateTool.versionInformation || 'v1.1',
      changeType: primaryChangeType,
      summary: changes.join(' | '),
      previousValue: existingTool.pricingDetails.summary,
      newValue: candidateTool.pricingDetails.summary,
      detectedAt: nowIso,
      sourceUrls: [sourceUrl],
      verifiedAt: nowIso,
    };

    if (isDatabaseConnected()) {
      try {
        await prisma.toolVersionHistory.upsert({
          where: { id: versionRecord.id },
          create: {
            id: versionRecord.id,
            toolId: versionRecord.toolId,
            version: versionRecord.version,
            changeType: versionRecord.changeType,
            summary: versionRecord.summary,
            previousValue: versionRecord.previousValue ?? null,
            newValue: versionRecord.newValue ?? null,
            detectedAt: versionRecord.detectedAt,
            sourceUrls: versionRecord.sourceUrls,
            verifiedAt: versionRecord.verifiedAt,
          },
          update: {
            version: versionRecord.version,
            changeType: versionRecord.changeType,
            summary: versionRecord.summary,
            previousValue: versionRecord.previousValue ?? null,
            newValue: versionRecord.newValue ?? null,
            detectedAt: versionRecord.detectedAt,
            sourceUrls: versionRecord.sourceUrls,
            verifiedAt: versionRecord.verifiedAt,
          },
        });
      } catch (err: any) {
        console.warn(`[ToolChangeDetection] Version record DB error:`, err.message);
      }
    }

    return {
      hasChanges: true,
      changeType: primaryChangeType,
      summary: versionRecord.summary,
      previousValue: versionRecord.previousValue,
      newValue: versionRecord.newValue,
      versionRecord,
    };
  }

  /**
   * Get version history records for a tool from PostgreSQL.
   */
  public static async getVersionHistory(toolId: string): Promise<ToolVersionRecord[]> {
    if (!isDatabaseConnected()) {
      return [];
    }

    try {
      const docs = await prisma.toolVersionHistory.findMany({
        where: { toolId },
        orderBy: { detectedAt: 'desc' },
      });
      return docs.map((d) => ({
        id: d.id,
        toolId: d.toolId,
        version: d.version,
        changeType: d.changeType as ToolVersionRecord['changeType'],
        summary: d.summary,
        previousValue: d.previousValue ?? undefined,
        newValue: d.newValue ?? undefined,
        detectedAt: d.detectedAt,
        sourceUrls: d.sourceUrls || [],
        verifiedAt: d.verifiedAt,
      }));
    } catch (e: any) {
      console.warn(`[ToolChangeDetection] Version history lookup error for ${toolId}:`, e.message);
      return [];
    }
  }
}
