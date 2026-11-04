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

export const clarityActiveTaskSchema = z.object({
  topic: z.string().trim().min(1, 'topic cannot be empty'),
  level: z.enum(['Easy', 'Medium', 'Hard']).optional(),
  track: z.enum(['General', 'Coder']).optional().default('General'),
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
