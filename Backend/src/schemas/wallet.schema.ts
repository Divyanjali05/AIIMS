import { z } from 'zod';

export const addToWalletSchema = z.object({
  toolId: z.string().trim().min(1, 'Valid toolId is required').max(100),
  familiarity: z.enum(['exploring', 'learning', 'practicing', 'proficient', 'mastered']).optional(),
  primaryCategory: z.string().trim().max(100).optional(),
  userNotes: z.string().max(2000).optional(),
});

export const updateFamiliaritySchema = z.object({
  toolId: z.string().trim().min(1, 'Valid toolId is required').max(100),
  familiarity: z.enum(['exploring', 'learning', 'practicing', 'proficient', 'mastered']).optional(),
  userNotes: z.string().max(2000).optional(),
});

export const searchToolsSchema = z.object({
  query: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  domain: z.string().trim().max(100).optional(),
  audience: z.enum(['student', 'entrepreneur', 'both']).optional(),
});

export const compareToolsSchema = z.object({
  toolIds: z
    .array(z.string().trim().min(1))
    .min(2, 'At least 2 tools required for comparison')
    .max(5),
});

export const matchToolSchema = z.object({
  taskDescription: z
    .string()
    .trim()
    .min(3, 'Task description must be at least 3 characters')
    .max(500),
  desiredOutput: z.string().trim().max(100).optional(),
  inputFormat: z.string().trim().max(100).optional(),
  freeOnly: z.boolean().optional(),
  category: z.string().trim().max(100).optional(),
});

export type MatchToolInput = z.infer<typeof matchToolSchema>;

export const registerSourceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  url: z.string().url('Source must have a valid URL'),
  type: z.enum(['rss', 'api', 'scraper', 'manual']),
  category: z.string().trim().max(100).optional(),
});

export const walletOperationSchema = z.object({
  operationName: z.string().trim().max(120).optional(),
  idempotencyKey: z.string().trim().max(120).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const confirmUsageSchema = z.object({
  toolId: z.string().trim().min(1, 'Valid toolId is required').max(100),
  taskContext: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(2000).optional(),
  idempotencyKey: z.string().trim().max(120).optional(),
});

export const personalizedMatchSchema = z.object({
  domain: z.string().trim().max(100).optional(),
  freeOnly: z.boolean().optional(),
  preferredSkillLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});

// ============================================================================
// Market AI Tools Catalog — Market Tiers, Filters & Outdated Reports
// ============================================================================

export const marketTierSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.null(),
]);

export const marketTierParamSchema = z
  .union([z.literal('1'), z.literal('2'), z.literal('3'), z.literal('4'), z.literal('unrated')])
  .optional();

export const toolReportCategorySchema = z.enum([
  'PRICING_OUTDATED',
  'LINK_BROKEN',
  'TIER_INCORRECT',
  'CAPABILITY_CHANGED',
  'OTHER',
]);

export const toolReportStatusSchema = z.enum(['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED']);

export const removeFromWalletSchema = z.object({
  toolId: z.string().trim().min(1, 'Valid toolId is required').max(100),
});

export type RemoveFromWalletInput = z.infer<typeof removeFromWalletSchema>;

export const createToolReportSchema = z.object({
  toolId: z.string().trim().min(1, 'Valid toolId is required').max(100).optional(),
  reportCategory: toolReportCategorySchema,
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(2000),
  sourceUrl: z.string().trim().url('Invalid URL format').optional().or(z.literal('')),
});

export type CreateToolReportInput = z.infer<typeof createToolReportSchema>;

export const updateToolReportStatusSchema = z.object({
  status: toolReportStatusSchema,
  reviewNotes: z.string().trim().max(2000).optional(),
});

export type UpdateToolReportStatusInput = z.infer<typeof updateToolReportStatusSchema>;

export const listToolReportsQuerySchema = z.object({
  status: toolReportStatusSchema.optional(),
  category: toolReportCategorySchema.optional(),
  search: z.string().trim().max(100).optional(),
  toolId: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListToolReportsQuery = z.infer<typeof listToolReportsQuerySchema>;
