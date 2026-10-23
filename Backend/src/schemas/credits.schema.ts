import { z } from 'zod';

export const awardLevelSchema = z.object({
  levelId: z.coerce
    .number()
    .int('Valid positive levelId is required')
    .min(1, 'Valid positive levelId is required')
    .max(10, 'levelId must be between 1 and 10'),
});

export type AwardLevelInput = z.infer<typeof awardLevelSchema>;

export const investCreditsSchema = z.object({
  amount: z.coerce
    .number()
    .positive('Valid positive investment amount is required')
    .finite('Valid positive investment amount is required'),
  description: z.string().trim().max(250).optional(),
  idempotencyKey: z.string().trim().min(1).max(128).optional(),
});

export type InvestCreditsInput = z.infer<typeof investCreditsSchema>;

export const ledgerQuerySchema = z.object({
  type: z.enum(['EARN', 'SPEND', 'REFUND'] as const).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
  skip: z.coerce.number().int().min(0).default(0).optional(),
});

export type LedgerQueryInput = z.infer<typeof ledgerQuerySchema>;
