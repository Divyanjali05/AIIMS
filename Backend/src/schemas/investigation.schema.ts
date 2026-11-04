import { z } from 'zod';

export const focusOverrideSchema = z.object({
  focusId: z.string().trim().min(1, 'Valid focusId is required').max(100),
  mentorOverride: z.string().trim().max(1000).optional(),
  userId: z.string().trim().max(100).optional(),
});

export const radarFollowSchema = z.object({
  signalId: z.string().trim().min(1, 'Valid signalId is required').max(100),
  userId: z.string().trim().max(100).optional(),
});

export const submitInvestigationSchema = z.object({
  signalId: z.string().trim().min(1, 'Valid signalId is required').max(100),
  personalInterpretation: z.string().trim().max(5000).optional(),
});

export const generateRelevanceSchema = z.object({
  signalId: z.string().trim().min(1, 'Valid signalId is required').max(100),
  domain: z.string().trim().max(100).optional(),
});

export const mentorAdviceSchema = z.object({
  question: z.string().trim().min(1, 'Question cannot be empty').max(2000),
  context: z.record(z.string(), z.any()).optional(),
});
