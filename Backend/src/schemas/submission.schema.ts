import { z } from 'zod';

export const createSubmissionSchema = z
  .object({
    taskId: z.string().trim().min(1, 'Valid taskId is required').max(100),
    taskTitle: z.string().trim().max(200).optional(),
    answerContent: z
      .string()
      .trim()
      .min(10, 'Answer content must be at least 10 characters')
      .max(50000)
      .optional(),
    userPrompt: z.string().trim().max(5000).optional(),
    aiResponse: z.string().trim().max(20000).optional(),
    selfReflection: z.string().trim().max(5000).optional(),
  })
  .refine(
    (data) =>
      Boolean(
        (data.answerContent && data.answerContent.length >= 10) ||
        (data.userPrompt && data.userPrompt.length >= 10)
      ),
    { message: 'Valid submission content is required (answerContent or userPrompt).' }
  );

export const resubmitTaskSchema = z
  .object({
    answerContent: z.string().trim().min(10).max(50000).optional(),
    userPrompt: z.string().trim().max(5000).optional(),
    aiResponse: z.string().trim().max(20000).optional(),
    selfReflection: z.string().trim().max(5000).optional(),
  })
  .refine(
    (data) =>
      Boolean(
        (data.answerContent && data.answerContent.length >= 10) ||
        (data.userPrompt && data.userPrompt.length >= 10)
      ),
    { message: 'Valid resubmission content is required.' }
  );

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
