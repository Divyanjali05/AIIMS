import { z } from 'zod';

export const clarityRunSchema = z.object({
  assignmentId: z.string().trim().optional(),
  topic: z.string().trim().optional(),
  difficulty: z.string().trim().optional(),
  taskTitle: z.string().trim().optional(),
  taskObjective: z.string().trim().optional(),
  userPrompt: z
    .string()
    .trim()
    .min(1, 'Prompt cannot be empty')
    .max(3000, 'Prompt exceeds maximum limit of 3,000 characters'),
  contextData: z.string().trim().max(10000).optional(),
  idempotencyKey: z.string().trim().max(128).optional(),
});

export const claritySubmitSchema = z.object({
  assignmentId: z.string().trim().min(1, 'assignmentId cannot be empty'),
  answer: z
    .string()
    .trim()
    .min(1, 'Submission answer cannot be empty')
    .max(5000, 'Answer exceeds maximum limit of 5,000 characters'),
  timeTakenSeconds: z.number().int().min(0).max(86400).optional().default(0),
  idempotencyKey: z.string().trim().max(128).optional(),
});

export const clarityStartAttemptSchema = z.object({
  questionId: z.string().trim().min(1, 'questionId cannot be empty'),
});

export const clarityAdminCreateQuestionSchema = z.object({
  questionId: z.string().trim().min(1).optional(),
  topic: z.string().trim().min(1, 'topic is required'),
  level: z.enum(['Easy', 'Medium', 'Hard']),
  track: z.enum(['General', 'Coder']).optional().default('General'),
  title: z.string().trim().min(3, 'title must have at least 3 characters'),
  promptText: z.string().trim().min(10, 'promptText must have at least 10 characters'),
  hint: z.string().trim().optional(),
  testScenario: z.string().trim().min(10, 'testScenario must have at least 10 characters'),
  expectedCriteria: z
    .array(z.string().trim().min(1))
    .min(1, 'At least 1 expected criterion is required'),
  scoringRubric: z
    .array(
      z.object({
        criterion: z.string().trim().min(1),
        maxScore: z.number().int().positive(),
        description: z.string().trim().min(1),
      })
    )
    .min(1, 'At least 1 rubric criterion is required'),
  status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE']).optional().default('DRAFT'),
  source: z.enum(['Human', 'AI']).optional().default('Human'),
  aiMetadata: z.record(z.string(), z.unknown()).optional(),
  reviewNotes: z.string().trim().optional(),
});

export const clarityAdminUpdateQuestionSchema = clarityAdminCreateQuestionSchema.partial();

export const clarityAdminUpdateStatusSchema = z.object({
  status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE']),
  note: z.string().trim().max(1000).optional(),
});

export const clarityProgressionConfigSchema = z
  .object({
    upwardThreshold: z
      .number()
      .min(50, 'upwardThreshold must be at least 50')
      .max(100, 'upwardThreshold cannot exceed 100'),
    consecutiveRequired: z
      .number()
      .int()
      .min(1, 'consecutiveRequired must be at least 1')
      .max(10, 'consecutiveRequired cannot exceed 10'),
    downwardThreshold: z
      .number()
      .min(0, 'downwardThreshold cannot be negative')
      .max(100, 'downwardThreshold cannot exceed 100'),
  })
  .refine((data) => data.downwardThreshold < data.upwardThreshold, {
    message: 'downwardThreshold must be strictly less than upwardThreshold',
    path: ['downwardThreshold'],
  });
