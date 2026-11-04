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
