import { z } from 'zod';

export const questionLevelSchema = z.enum(['Easy', 'Medium', 'Hard']);
export const questionTrackSchema = z.enum(['General', 'Coding']);
export const questionSourceSchema = z.enum(['Human', 'AI']);
export const questionStatusSchema = z.enum([
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'ACTIVE',
  'REJECTED',
  'INACTIVE',
]);

export const rubricCriterionSchema = z.object({
  criterion: z.string().trim().min(2, 'Criterion name must be at least 2 characters'),
  maxScore: z.number().min(1).max(100),
  description: z.string().trim().min(5, 'Criterion description must be at least 5 characters'),
});

export const serveQuestionSchema = z.object({
  topic: z.string().trim().min(1, 'Topic is required').max(150),
  level: questionLevelSchema,
  track: questionTrackSchema.default('General'), // Default to Non-Coder General track!
});

export const submitAttemptSchema = z.object({
  assignmentId: z.string().trim().min(1, 'assignmentId is required'),
  answer: z
    .string()
    .trim()
    .min(1, 'Answer is required')
    .max(10000, 'Answer exceeds maximum allowed length (10,000 characters)'),
  timeTakenSeconds: z.number().int().nonnegative().optional().default(0),
});

export const adminCreateQuestionSchema = z.object({
  questionId: z.string().trim().min(3).max(100).optional(),
  topic: z.string().trim().min(2).max(150),
  level: questionLevelSchema,
  track: questionTrackSchema.default('General'),
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(250),
  promptText: z.string().trim().min(10, 'Prompt text must be at least 10 characters').max(5000),
  hint: z.string().trim().max(1000).optional(),
  testScenario: z.string().trim().min(10, 'Test scenario must be at least 10 characters').max(5000),
  expectedCriteria: z
    .array(z.string().trim().min(2))
    .min(1, 'At least one expected criterion is required'),
  scoringRubric: z
    .array(rubricCriterionSchema)
    .min(1, 'At least one scoring rubric criterion is required'),
  source: questionSourceSchema.default('Human'),
  status: questionStatusSchema.default('ACTIVE'),
});

export const adminUpdateQuestionSchema = adminCreateQuestionSchema.partial();

export const adminUpdateStatusSchema = z.object({
  status: questionStatusSchema,
  note: z.string().trim().max(1000).optional(),
});

export const adminExclusionConfigSchema = z.object({
  scope: z.enum(['college', 'batch', 'cohort']),
  exclusionDays: z.number().int().min(0).max(365),
});

export const aiGeneratedQuestionSchema = z.object({
  title: z.string().trim().min(3).max(250),
  promptText: z.string().trim().min(10).max(5000),
  hint: z.string().trim().max(1000).optional(),
  testScenario: z.string().trim().min(10).max(5000),
  expectedCriteria: z.array(z.string().trim().min(2)).min(2),
  scoringRubric: z.array(rubricCriterionSchema).min(2),
});
