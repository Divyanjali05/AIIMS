import { z } from 'zod';

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

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Please enter your full name.'),
    email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long.')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/[0-9]/, 'Password must contain at least one number.'),
    confirmPassword: z.string().optional(),
    instituteId: z.string().optional(),
    instituteName: z.string().optional(),
    stream: z.enum(['TECH', 'NON_TECH'] as const),
    streamSubCategory: z.string().optional(),
    educationLevel: z.enum([
      'SCHOOL',
      'UNDERGRADUATE',
      'POSTGRADUATE',
      'RESEARCH',
      'GRADUATE',
    ] as const),
    programId: z.string().min(1, 'Please select your degree or program.'),
    programName: z.string().optional(),
    specializationId: z.string().min(1, 'Please select your branch or specialization.'),
    specializationName: z.string().optional(),
    yearOfStudy: z.coerce
      .number()
      .int()
      .min(1, 'Please enter a valid year of study (1–7).')
      .max(7, 'Please enter a valid year of study (1–7).'),
    admissionYear: z.coerce
      .number()
      .int()
      .min(1990, 'Please enter a valid admission year.')
      .max(2030, 'Please enter a valid admission year.'),
    expectedGraduationYear: z.coerce.number().int(),
    aiFamiliarity: z.string().optional(),
    aiUsageContexts: z.array(z.string()).optional(),
    primaryGoal: z.string().optional(),
  })
  .refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })
  .refine((data) => data.expectedGraduationYear >= data.admissionYear, {
    message: 'Expected graduation year must be after admission year.',
    path: ['expectedGraduationYear'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').optional(),
  role: z.string().trim().optional(),
  college: z.string().trim().optional(),
  targetGoal: z.string().trim().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
