import { z } from 'zod';

/**
 * Explicit schema for learner-editable profile fields.
 * Strictly forbids role, account status, credits, xpPoints, and admin privileges.
 */
export const learnerProfileUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name cannot be empty')
      .max(100, 'Name cannot exceed 100 characters')
      .optional(),
    college: z.string().trim().max(200, 'College name cannot exceed 200 characters').optional(),
    targetGoal: z.string().trim().max(250, 'Target goal cannot exceed 250 characters').optional(),
    stage: z.string().trim().max(50, 'Stage cannot exceed 50 characters').optional(),
  })
  .strict();

export const updateLearnerStateSchema = z
  .object({
    state: z
      .object({
        profile: learnerProfileUpdateSchema.optional(),
        clarity: z
          .object({
            selectedAreas: z.array(z.string().trim().max(100)).optional(),
            selectedTopic: z.string().trim().max(100).nullable().optional(),
            completedTopics: z.array(z.string().trim().max(100)).optional(),
            reflections: z.record(z.string(), z.string()).optional(),
          })
          .strict()
          .optional(),
        focus: z
          .object({
            selectedTrack: z.string().trim().max(100).nullable().optional(),
            sessionConfig: z.record(z.string(), z.any()).optional(),
          })
          .strict()
          .optional(),
        radar: z
          .object({
            savedSignalIds: z.array(z.string().trim().max(100)).optional(),
            dismissedSignalIds: z.array(z.string().trim().max(100)).optional(),
            lastViewedRadar: z.string().trim().max(100).nullable().optional(),
            radarProgress: z.number().min(0).max(100).optional(),
          })
          .strict()
          .optional(),
        investigation: z
          .object({
            selectedSignalId: z.string().trim().max(100).nullable().optional(),
            userNotes: z.record(z.string(), z.string()).optional(),
          })
          .strict()
          .optional(),
        notifications: z.array(z.any()).optional(),
        aiWallet: z
          .object({
            dismissedRecommendations: z.array(z.string()).optional(),
            audienceMode: z.enum(['student', 'entrepreneur']).optional(),
          })
          .strict()
          .optional(),
        solver: z
          .object({
            latestWorkflow: z.record(z.string(), z.any()).nullable().optional(),
            history: z.array(z.any()).optional(),
          })
          .strict()
          .optional(),
        build: z
          .object({
            projects: z.array(z.any()).optional(),
            activeProjectId: z.string().trim().max(100).nullable().optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
  })
  .strict();

export type UpdateLearnerStateInput = z.infer<typeof updateLearnerStateSchema>;
