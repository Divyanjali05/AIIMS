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
