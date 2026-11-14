import { prisma, isDatabaseConnected } from '../../config/prisma';
import { EvidenceVerificationStatus, ToolEvidenceItem } from '../../types/models';

/**
 * Tool Evidence Service — Evidence-First Verification & Fact Management Layer (PostgreSQL + Prisma)
 * Stores evidence records linking factual claims to authoritative source URLs.
 */
export class ToolEvidenceService {
  /**
   * Save evidence items for a tool in PostgreSQL.
   * Requires parent AiTool row to already exist due to foreign key constraint.
   */
  public static async recordEvidence(
    toolId: string,
    items: Omit<ToolEvidenceItem, 'id' | 'toolId'>[]
  ): Promise<ToolEvidenceItem[]> {
    const nowIso = new Date().toISOString();
    const createdItems: ToolEvidenceItem[] = [];

    if (!isDatabaseConnected() || items.length === 0) {
      return createdItems;
    }

    for (const item of items) {
      const fullItem: ToolEvidenceItem = {
        id: `ev-${toolId}-${Math.floor(Math.random() * 100000)}`,
        toolId,
        claim: item.claim,
        value: item.value || 'Verified',
        sourceUrl: item.sourceUrl,
        sourceType: item.sourceType || 'Official Source',
        sourceTitle: item.sourceTitle || 'Source Evidence',
        publishedAt: item.publishedAt || nowIso,
        verifiedAt: nowIso,
        confidence: item.confidence || 0.9,
        verificationStatus: item.verificationStatus || 'VERIFIED',
      };

      try {
        await prisma.toolEvidence.upsert({
          where: { id: fullItem.id },
          create: {
            id: fullItem.id,
            toolId,
            claim: fullItem.claim,
            value: fullItem.value,
            sourceUrl: fullItem.sourceUrl,
            sourceType: fullItem.sourceType,
            sourceTitle: fullItem.sourceTitle,
            publishedAt: fullItem.publishedAt,
            verifiedAt: fullItem.verifiedAt,
            confidence: fullItem.confidence,
            verificationStatus: fullItem.verificationStatus,
          },
          update: {
            claim: fullItem.claim,
            value: fullItem.value,
            sourceUrl: fullItem.sourceUrl,
            sourceType: fullItem.sourceType,
            sourceTitle: fullItem.sourceTitle,
            publishedAt: fullItem.publishedAt,
            verifiedAt: fullItem.verifiedAt,
            confidence: fullItem.confidence,
            verificationStatus: fullItem.verificationStatus,
          },
        });
        createdItems.push(fullItem);
      } catch (err: any) {
        console.warn(`[ToolEvidence] PostgreSQL record warning:`, err.message);
      }
    }

    return createdItems;
  }

  /**
   * Get all evidence claims recorded for a tool from PostgreSQL.
   */
  public static async getEvidenceForTool(toolId: string): Promise<ToolEvidenceItem[]> {
    if (!isDatabaseConnected()) {
      return [];
    }

    try {
      const docs = await prisma.toolEvidence.findMany({
        where: { toolId },
        orderBy: { fetchedAt: 'desc' },
      });
      return docs.map((d) => ({
        id: d.id,
        toolId: d.toolId,
        claim: d.claim,
        value: d.value,
        sourceUrl: d.sourceUrl,
        sourceType: d.sourceType,
        sourceTitle: d.sourceTitle,
        publishedAt: d.publishedAt,
        verifiedAt: d.verifiedAt,
        confidence: d.confidence,
        verificationStatus: d.verificationStatus as EvidenceVerificationStatus,
      }));
    } catch (e: any) {
      console.warn(`[ToolEvidence] DB lookup warning for ${toolId}:`, e.message);
      return [];
    }
  }
}
