import { prisma, isDatabaseConnected } from '../config/prisma';
import { getSeedToolCatalog } from '../data/aiimsCatalog';
import { AITool } from '../types';
import { IAITool } from '../types/models';
import { aiToolRowToDomain, domainToolToPrismaData } from './wallet/toolCatalog.service';

// ==========================================
// Tool Catalog Service
// Abstraction layer over the PostgreSQL ai_tools table via Prisma.
// ==========================================

/**
 * GET /api/wallet/catalog
 * Returns all active tools from PostgreSQL.
 */
export async function getActiveCatalog(): Promise<AITool[]> {
  if (!isDatabaseConnected()) {
    throw Object.assign(new Error('Database unavailable'), { code: 'DATABASE_UNAVAILABLE' });
  }
  const docs = await prisma.aiTool.findMany({ where: { activeStatus: true } });
  if (!docs || docs.length === 0) {
    return getSeedToolCatalog().filter((t) => t.activeStatus);
  }
  return docs.map(aiToolRowToDomain);
}

/**
 * Find a single tool by its stable slug ID.
 */
export async function getToolById(toolId: string): Promise<AITool | null> {
  if (!isDatabaseConnected()) {
    throw Object.assign(new Error('Database unavailable'), { code: 'DATABASE_UNAVAILABLE' });
  }
  const doc = await prisma.aiTool.findFirst({
    where: { id: toolId, activeStatus: true },
  });
  return doc ? aiToolRowToDomain(doc) : null;
}

/**
 * Admin helper — mark a tool as inactive (soft-delete).
 */
export async function deactivateTool(toolId: string): Promise<boolean> {
  if (!isDatabaseConnected()) return false;
  const result = await prisma.aiTool.updateMany({
    where: { id: toolId },
    data: { activeStatus: false },
  });
  return result.count > 0;
}

/**
 * Admin helper — upsert a tool into the PostgreSQL catalog.
 */
export async function upsertTool(
  toolData: Partial<AITool> & { id: string }
): Promise<IAITool | null> {
  if (!isDatabaseConnected()) return null;
  const payload = domainToolToPrismaData(toolData);
  const { id: _ignoreId, ...updatePayload } = payload;
  const row = await prisma.aiTool.upsert({
    where: { id: toolData.id },
    create: payload,
    update: updatePayload,
  });
  return aiToolRowToDomain(row);
}
