import { z } from 'zod';

export const assessmentHistoryQuerySchema = z.object({
  page: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === null || val === '') return 1;
      const parsed = Number(val);
      return isNaN(parsed) || parsed < 1 ? 1 : Math.floor(parsed);
    }),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === null || val === '') return 10;
      const parsed = Number(val);
      return isNaN(parsed) || parsed < 1 ? 10 : Math.min(50, Math.floor(parsed));
    }),
  type: z.enum(['all', 'diagnostic', 'clarity', 'submission']).optional().default('all'),
  status: z.enum(['all', 'completed', 'in_progress', 'abandoned']).optional().default('all'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type AssessmentHistoryQuery = z.infer<typeof assessmentHistoryQuerySchema>;
