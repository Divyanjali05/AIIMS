import { z } from 'zod';

export const startFocusSessionSchema = z.object({
  trackTitle: z.string().trim().max(100).optional(),
  intention: z.string().trim().max(300).optional(),
  focusDurationMinutes: z.number().int().min(1).max(180).optional(),
  breakDurationMinutes: z.number().int().min(1).max(60).optional(),
  enableLongBreak: z.boolean().optional(),
  longBreakDurationMinutes: z.number().int().min(1).max(60).optional(),
  longBreakInterval: z.number().int().min(1).max(12).optional(),
  soundEnabled: z.boolean().optional(),
});

export const pauseFocusSessionSchema = z.object({
  sessionId: z.string().trim().optional(),
});

export const resumeFocusSessionSchema = z.object({
  sessionId: z.string().trim().optional(),
});

export const completeFocusPeriodSchema = z.object({
  sessionId: z.string().trim().optional(),
});

export const startBreakPeriodSchema = z.object({
  sessionId: z.string().trim().optional(),
  forceLongBreak: z.boolean().optional(),
});

export const abandonFocusSessionSchema = z.object({
  sessionId: z.string().trim().optional(),
});

export const updateFocusConfigSchema = z.object({
  focusDurationMinutes: z.number().int().min(1).max(180),
  breakDurationMinutes: z.number().int().min(1).max(60),
  enableLongBreak: z.boolean().optional(),
  longBreakDurationMinutes: z.number().int().min(1).max(60).optional(),
  longBreakInterval: z.number().int().min(1).max(12).optional(),
  soundEnabled: z.boolean().optional(),
});

export type StartFocusSessionInput = z.infer<typeof startFocusSessionSchema>;
export type UpdateFocusConfigInput = z.infer<typeof updateFocusConfigSchema>;

// ============================================================================
// Phase 5: Timed Focus Practice Task & Challenge Schemas
// ============================================================================

export const focusCategoryEnum = z.enum([
  'Prompt Engineering',
  'Evaluation & Auditing',
  'Agentic Systems',
]);

export const focusLevelEnum = z.enum(['Easy', 'Medium', 'Hard']);

export const startFocusTaskSchema = z.object({
  category: focusCategoryEnum,
  level: focusLevelEnum,
  questionId: z.string().trim().optional(),
});

export const submitFocusTaskSchema = z.object({
  assignmentId: z.string().trim().min(1, 'assignmentId is required'),
  answer: z.string().trim().min(1, 'Answer content cannot be empty'),
  timeTakenSeconds: z.number().int().min(0).optional().default(0),
  attachments: z
    .array(
      z.object({
        attachmentId: z.string(),
        originalFileName: z.string(),
        objectKey: z.string(),
        mimeType: z.string(),
        fileSizeBytes: z.number(),
        publicUrl: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  idempotencyKey: z.string().trim().optional(),
});

export const adminCreateFocusQuestionSchema = z.object({
  topic: focusCategoryEnum,
  level: focusLevelEnum,
  title: z.string().trim().min(3, 'Title must be at least 3 characters'),
  promptText: z.string().trim().min(10, 'Prompt text must be at least 10 characters'),
  hint: z.string().trim().optional(),
  testScenario: z.string().trim().min(10, 'Test scenario must be at least 10 characters'),
  expectedCriteria: z.array(z.string().trim()).min(1, 'At least 1 expected criterion is required'),
  scoringRubric: z
    .array(
      z.object({
        criterion: z.string().trim(),
        maxScore: z.number().int().min(1),
        description: z.string().trim(),
      })
    )
    .min(1, 'At least 1 rubric criterion is required'),
  aiMetadata: z
    .object({
      learningObjective: z.string().optional(),
      expectedAnswerFormat: z.string().optional(),
      suggestedExternalTool: z.string().optional(),
      suggestedExternalToolUrl: z.string().optional(),
      durationSeconds: z.number().int().optional(),
      module: z.string().optional(),
    })
    .optional(),
  status: z.enum(['APPROVED', 'DRAFT', 'REVIEW', 'REJECTED']).optional().default('DRAFT'),
  reviewNotes: z.string().trim().optional(),
});

export const adminUpdateFocusStatusSchema = z.object({
  status: z.enum(['APPROVED', 'DRAFT', 'REVIEW', 'REJECTED']),
  reviewNotes: z.string().trim().optional(),
});

export type StartFocusTaskInput = z.infer<typeof startFocusTaskSchema>;
export type SubmitFocusTaskInput = z.infer<typeof submitFocusTaskSchema>;
export type AdminCreateFocusQuestionInput = z.infer<typeof adminCreateFocusQuestionSchema>;
export type AdminUpdateFocusStatusInput = z.infer<typeof adminUpdateFocusStatusSchema>;
