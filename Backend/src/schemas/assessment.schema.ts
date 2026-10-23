import { z } from 'zod';

export const submitAssessmentSchema = z.object({
  answers: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.array(z.string()), z.boolean(), z.null()])
    )
    .optional()
    .default({}),
  scores: z.record(z.string(), z.unknown()).optional(),
});

export type SubmitAssessmentInput = z.infer<typeof submitAssessmentSchema>;
