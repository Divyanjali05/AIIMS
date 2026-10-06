import mongoose from 'mongoose';
import { AIToolModel, IAITool } from '../models/AITool.model';
import { mockToolCatalog } from '../models/aiims.models';
import { AITool } from '../types';

// ==========================================
// Tool Catalog Service
// Abstraction layer over the AITool MongoDB collection.
// Falls back to mockToolCatalog when DB is unavailable.
// ==========================================

function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Convert a Mongoose IAITool document to the plain AITool shape
 * that the frontend and recommendation engine expect.
 */
function toAITool(doc: IAITool): AITool {
  return {
    id:          doc.id,
    name:        doc.name,
    description: doc.description,
    category:    doc.category as any,
    capabilities: doc.capabilities,
    useCases:    doc.useCases,
    strengths:   doc.strengths,
    limitations: doc.limitations,
    taskMappings: doc.taskMappings,
    websiteUrl:  doc.websiteUrl,
    activeStatus: doc.activeStatus,
    iconName:    doc.iconName,
    pricing:     doc.pricing,
    provider:    doc.provider,
    categories:  doc.categories as any[],
    relevantRoles: doc.relevantRoles,
    skillLevel:  doc.skillLevel,
    familiarityGuidance: doc.familiarityGuidance as any,
    relatedTools:  doc.relatedTools,
    alternatives:  doc.alternatives,
    radarTopics:   doc.radarTopics,
    clarityTopics: doc.clarityTopics,
    focusTracks:   doc.focusTracks
  };
}

/**
 * GET /api/wallet/catalog
 * Returns all active tools from MongoDB, falls back to mockToolCatalog.
 */
export async function getActiveCatalog(): Promise<AITool[]> {
  if (!isDbConnected()) {
    console.warn('[ToolCatalog] DB not connected — using mock catalog fallback');
    return mockToolCatalog.filter(t => t.activeStatus);
  }
  try {
    const docs = await AIToolModel.find({ activeStatus: true }).lean<IAITool[]>();
    if (!docs || docs.length === 0) {
      // Collection exists but is empty — return mock (pre-seed state)
      console.warn('[ToolCatalog] AITool collection empty — using mock catalog fallback');
      return mockToolCatalog.filter(t => t.activeStatus);
    }
    return docs.map(toAITool);
  } catch (err) {
    console.error('[ToolCatalog] Failed to query AITool collection:', err);
    return mockToolCatalog.filter(t => t.activeStatus);
  }
}

/**
 * Find a single tool by its stable slug ID.
 */
export async function getToolById(toolId: string): Promise<AITool | null> {
  if (!isDbConnected()) {
    return mockToolCatalog.find(t => t.id === toolId) || null;
  }
  try {
    const doc = await AIToolModel.findOne({ id: toolId, activeStatus: true }).lean<IAITool>();
    if (!doc) {
      // Fallback to mock in case seed hasn't been run yet
      return mockToolCatalog.find(t => t.id === toolId) || null;
    }
    return toAITool(doc);
  } catch (err) {
    console.error('[ToolCatalog] getToolById error:', err);
    return mockToolCatalog.find(t => t.id === toolId) || null;
  }
}

/**
 * Admin helper — mark a tool as inactive (soft-delete).
 */
export async function deactivateTool(toolId: string): Promise<boolean> {
  if (!isDbConnected()) return false;
  const result = await AIToolModel.updateOne({ id: toolId }, { $set: { activeStatus: false } });
  return result.modifiedCount > 0;
}

/**
 * Admin helper — upsert a tool into the catalog.
 */
export async function upsertTool(toolData: Partial<AITool> & { id: string }): Promise<IAITool | null> {
  if (!isDbConnected()) return null;
  return AIToolModel.findOneAndUpdate(
    { id: toolData.id },
    { $set: toolData },
    { upsert: true, returnDocument: 'after' }
  );
}
