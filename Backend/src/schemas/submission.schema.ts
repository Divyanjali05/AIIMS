import { z } from 'zod';

export const createSubmissionSchema = z.object({
  taskId: z.string().trim().min(1, 'Valid taskId is required').max(100),
  userPrompt: z.string().trim().min(10, 'Prompt must be at least 10 characters').max(5000),
  aiResponse: z.string().trim().min(10, 'AI response must be at least 10 characters').max(20000),
  selfReflection: z.string().trim().max(5000).optional(),
});

export const resubmitTaskSchema = z.object({
  userPrompt: z.string().trim().min(10, 'Prompt must be at least 10 characters').max(5000),
  aiResponse: z.string().trim().min(10, 'AI response must be at least 10 characters').max(20000),
  selfReflection: z.string().trim().max(5000).optional(),
});

export const evaluatorReviewSchema = z.object({
  scores: z.object({
    technicalCorrectness: z.number().int().min(1).max(5),
    promptEngineering: z.number().int().min(1).max(5),
    safetyEthics: z.number().int().min(1).max(5),
    practicalUtility: z.number().int().min(1).max(5),
  }),
  feedback: z.string().trim().min(5, 'Feedback must be at least 5 characters').max(5000),
  status: z.enum(['ACCEPTED', 'REVISION_REQUESTED']),
});
