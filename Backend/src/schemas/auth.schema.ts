import { z } from 'zod';
import { isCommonPassword } from '../utils/passwordSecurity';
import { getProgramDuration, VENTURE_STAGES } from '../config/academicTaxonomy';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address.')
    .toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type LearnerTrack = 'Student' | 'Entrepreneur';

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Please enter your full name.'),
    email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long.')
      .refine((val) => !isCommonPassword(val), {
        message: 'This password is too common or easily guessed. Please choose a more secure password.',
      }),
    confirmPassword: z.string().optional(),
    track: z.preprocess(
      (val) => {
        if (typeof val === 'string') {
          const lower = val.trim().toLowerCase();
          if (lower === 'student') return 'Student';
          if (lower === 'entrepreneur') return 'Entrepreneur';
        }
        return val;
      },
      z.enum(['Student', 'Entrepreneur'] as const, {
        message: 'Track is required. Please select Student or Entrepreneur.',
      })
    ),
    instituteId: z.string().optional(),
    instituteName: z.string().optional(),
    stream: z.enum(['TECH', 'NON_TECH'] as const).optional(),
    streamSubCategory: z.string().optional(),
    educationLevel: z
      .enum(['SCHOOL', 'UNDERGRADUATE', 'POSTGRADUATE', 'RESEARCH', 'GRADUATE'] as const)
      .optional(),
    programId: z.string().optional(),
    programName: z.string().optional(),
    specializationId: z.string().optional(),
    specializationName: z.string().optional(),
    yearOfStudy: z.coerce.number().int().optional(),
    admissionYear: z.coerce.number().int().optional(),
    expectedGraduationYear: z.coerce.number().int().optional(),
    // Entrepreneur-specific onboarding fields
    ventureName: z.string().optional(),
    industry: z.string().optional(),
    problemStatement: z.string().optional(),
    ventureStage: z.string().optional(),
    skillsToDevelop: z.array(z.string()).optional(),
    businessChallenges: z.array(z.string()).optional(),
    preferredSupport: z.array(z.string()).optional(),
    aiFamiliarity: z.string().optional(),
    aiUsageContexts: z.array(z.string()).optional(),
    primaryGoal: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // 1. Password Confirmation
    if (data.confirmPassword && data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match.',
        path: ['confirmPassword'],
      });
    }

    // 2. Track-specific Academic Requirements
    if (data.track === 'Student') {
      if (!data.stream) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please select a valid academic stream.',
          path: ['stream'],
        });
      }
      if (!data.educationLevel) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please select a valid education level.',
          path: ['educationLevel'],
        });
      }
      if (!data.programId || data.programId.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please select your degree or program.',
          path: ['programId'],
        });
      }
      if (!data.specializationId || data.specializationId.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please select your branch or specialization.',
          path: ['specializationId'],
        });
      }

      const duration = data.programId ? getProgramDuration(data.programId) : 4;
      if (
        data.yearOfStudy === undefined ||
        isNaN(data.yearOfStudy) ||
        data.yearOfStudy < 1 ||
        data.yearOfStudy > duration
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Please enter a valid year of study (1–${duration}) for this program.`,
          path: ['yearOfStudy'],
        });
      }

      const currentYear = new Date().getFullYear();
      if (
        data.admissionYear === undefined ||
        isNaN(data.admissionYear) ||
        data.admissionYear < 1990 ||
        data.admissionYear > currentYear + 1
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Please enter a valid admission year (up to ${currentYear + 1}).`,
          path: ['admissionYear'],
        });
      }
      if (
        data.expectedGraduationYear === undefined ||
        isNaN(data.expectedGraduationYear) ||
        (data.admissionYear !== undefined && data.expectedGraduationYear <= data.admissionYear)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Expected graduation year must be after admission year.',
          path: ['expectedGraduationYear'],
        });
      }

      // Cross-track validation: reject entrepreneur-only fields if supplied on Student track
      if (data.ventureStage || data.problemStatement) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Entrepreneur venture fields are not permitted on the Student track.',
          path: ['ventureStage'],
        });
      }
    } else if (data.track === 'Entrepreneur') {
      // Cross-track validation: reject student academic fields if supplied on Entrepreneur track
      if (
        data.stream ||
        data.educationLevel ||
        data.programId ||
        data.specializationId ||
        data.yearOfStudy
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Student academic fields are not permitted on the Entrepreneur track.',
          path: ['stream'],
        });
      }

      if (data.ventureStage && !VENTURE_STAGES.some((s) => s.value === data.ventureStage)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid venture stage selected.',
          path: ['ventureStage'],
        });
      }

      if (
        data.admissionYear !== undefined &&
        data.expectedGraduationYear !== undefined &&
        !isNaN(data.admissionYear) &&
        !isNaN(data.expectedGraduationYear) &&
        data.expectedGraduationYear <= data.admissionYear
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Expected graduation year must be after admission year.',
          path: ['expectedGraduationYear'],
        });
      }
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').optional(),
  role: z.string().trim().optional(),
  college: z.string().trim().optional(),
  targetGoal: z.string().trim().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const deleteAccountSchema = z.object({
  confirmation: z.literal('DELETE', {
    message: 'Please type the word DELETE to confirm account deletion.',
  }),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
