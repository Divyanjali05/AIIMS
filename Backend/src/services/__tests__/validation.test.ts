import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema, updateProfileSchema } from '../../schemas/auth.schema';
import {
  awardLevelSchema,
  investCreditsSchema,
  ledgerQuerySchema,
} from '../../schemas/credits.schema';
import { submitAssessmentSchema } from '../../schemas/assessment.schema';
import { validateBody, validateQuery, validateParams } from '../../middleware/validate.middleware';
import { Request, Response } from 'express';

describe('Zod Runtime Request Validation Suite', () => {
  // =========================================================================
  // 1. Authentication Schemas
  // =========================================================================
  describe('Auth Schemas', () => {
    describe('loginSchema', () => {
      it('accepts valid credentials with trimmed and lowercased email', () => {
        const result = loginSchema.safeParse({
          email: '  User.Test@Example.COM  ',
          password: 'Password123!',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.email).toBe('user.test@example.com');
          expect(result.data.password).toBe('Password123!');
        }
      });

      it('rejects missing email', () => {
        const result = loginSchema.safeParse({ password: 'Password123!' });
        expect(result.success).toBe(false);
      });

      it('rejects invalid email format', () => {
        const result = loginSchema.safeParse({
          email: 'not-an-email',
          password: 'Password123!',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Enter a valid email address');
        }
      });

      it('rejects empty password', () => {
        const result = loginSchema.safeParse({
          email: 'user@example.com',
          password: '',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('registerSchema', () => {
      const validRegisterPayload = {
        name: 'Alex Developer',
        email: 'alex.dev@aiims.edu',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        stream: 'TECH' as const,
        educationLevel: 'UNDERGRADUATE' as const,
        programId: 'btech',
        specializationId: 'ai_ml',
        yearOfStudy: 3,
        admissionYear: 2023,
        expectedGraduationYear: 2027,
      };

      it('accepts a valid student registration payload', () => {
        const result = registerSchema.safeParse(validRegisterPayload);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.email).toBe('alex.dev@aiims.edu');
          expect(result.data.yearOfStudy).toBe(3);
        }
      });

      it('coerces numeric string years into numbers', () => {
        const result = registerSchema.safeParse({
          ...validRegisterPayload,
          yearOfStudy: '2',
          admissionYear: '2024',
          expectedGraduationYear: '2028',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.yearOfStudy).toBe(2);
          expect(result.data.admissionYear).toBe(2024);
          expect(result.data.expectedGraduationYear).toBe(2028);
        }
      });

      it('rejects short name (<2 characters)', () => {
        const result = registerSchema.safeParse({
          ...validRegisterPayload,
          name: 'A',
        });
        expect(result.success).toBe(false);
      });

      it('rejects passwords shorter than 8 characters', () => {
        const result = registerSchema.safeParse({
          ...validRegisterPayload,
          password: 'Pass1',
          confirmPassword: 'Pass1',
        });
        expect(result.success).toBe(false);
      });

      it('rejects passwords without an uppercase letter', () => {
        const result = registerSchema.safeParse({
          ...validRegisterPayload,
          password: 'password123!',
          confirmPassword: 'password123!',
        });
        expect(result.success).toBe(false);
      });

      it('rejects passwords without a number', () => {
        const result = registerSchema.safeParse({
          ...validRegisterPayload,
          password: 'PasswordABC!',
          confirmPassword: 'PasswordABC!',
        });
        expect(result.success).toBe(false);
      });

      it('rejects password and confirmPassword mismatch', () => {
        const result = registerSchema.safeParse({
          ...validRegisterPayload,
          confirmPassword: 'DifferentPassword123!',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some((i) => i.path.includes('confirmPassword'))).toBe(true);
        }
      });

      it('rejects invalid academic stream', () => {
        const result = registerSchema.safeParse({
          ...validRegisterPayload,
          stream: 'INVALID_STREAM',
        });
        expect(result.success).toBe(false);
      });

      it('rejects yearOfStudy out of bounds (<1 or >7)', () => {
        expect(registerSchema.safeParse({ ...validRegisterPayload, yearOfStudy: 0 }).success).toBe(
          false
        );
        expect(registerSchema.safeParse({ ...validRegisterPayload, yearOfStudy: 8 }).success).toBe(
          false
        );
      });

      it('rejects graduation year prior to admission year', () => {
        const result = registerSchema.safeParse({
          ...validRegisterPayload,
          admissionYear: 2025,
          expectedGraduationYear: 2024,
        });
        expect(result.success).toBe(false);
      });
    });

    describe('updateProfileSchema', () => {
      it('accepts partial profile fields', () => {
        const result = updateProfileSchema.safeParse({
          name: 'Jordan Architect',
          targetGoal: 'Master AI Orchestration',
        });
        expect(result.success).toBe(true);
      });

      it('accepts empty object (no-op update)', () => {
        const result = updateProfileSchema.safeParse({});
        expect(result.success).toBe(true);
      });

      it('rejects name shorter than 2 characters', () => {
        const result = updateProfileSchema.safeParse({ name: ' ' });
        expect(result.success).toBe(false);
      });
    });
  });

  // =========================================================================
  // 2. Credits Ledger Schemas
  // =========================================================================
  describe('Credits Schemas', () => {
    describe('awardLevelSchema', () => {
      it('accepts positive integer levelId', () => {
        const result = awardLevelSchema.safeParse({ levelId: 1 });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.levelId).toBe(1);
      });

      it('coerces string numeric levelId', () => {
        const result = awardLevelSchema.safeParse({ levelId: '3' });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.levelId).toBe(3);
      });

      it('rejects zero, negative, and decimal levels', () => {
        expect(awardLevelSchema.safeParse({ levelId: 0 }).success).toBe(false);
        expect(awardLevelSchema.safeParse({ levelId: -1 }).success).toBe(false);
        expect(awardLevelSchema.safeParse({ levelId: 1.5 }).success).toBe(false);
      });

      it('rejects level greater than 10', () => {
        expect(awardLevelSchema.safeParse({ levelId: 11 }).success).toBe(false);
      });

      it('rejects non-numeric string', () => {
        expect(awardLevelSchema.safeParse({ levelId: 'level_one' }).success).toBe(false);
      });
    });

    describe('investCreditsSchema', () => {
      it('accepts valid investment with positive amount', () => {
        const result = investCreditsSchema.safeParse({
          amount: 50,
          description: 'Focus Track Session',
          idempotencyKey: 'idemp-001',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.amount).toBe(50);
          expect(result.data.description).toBe('Focus Track Session');
          expect(result.data.idempotencyKey).toBe('idemp-001');
        }
      });

      it('coerces string numeric amount', () => {
        const result = investCreditsSchema.safeParse({ amount: '25.5' });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.amount).toBe(25.5);
      });

      it('rejects zero or negative amounts', () => {
        expect(investCreditsSchema.safeParse({ amount: 0 }).success).toBe(false);
        expect(investCreditsSchema.safeParse({ amount: -10 }).success).toBe(false);
      });

      it('rejects non-finite amounts (NaN, Infinity)', () => {
        expect(investCreditsSchema.safeParse({ amount: NaN }).success).toBe(false);
        expect(investCreditsSchema.safeParse({ amount: Infinity }).success).toBe(false);
      });
    });

    describe('ledgerQuerySchema', () => {
      it('applies safe defaults for limit and skip', () => {
        const result = ledgerQuerySchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(50);
          expect(result.data.skip).toBe(0);
        }
      });

      it('accepts valid filtered pagination query', () => {
        const result = ledgerQuerySchema.safeParse({
          type: 'EARN',
          limit: '20',
          skip: '40',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe('EARN');
          expect(result.data.limit).toBe(20);
          expect(result.data.skip).toBe(40);
        }
      });

      it('rejects limits outside range (1–100)', () => {
        expect(ledgerQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
        expect(ledgerQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
      });

      it('rejects negative skip', () => {
        expect(ledgerQuerySchema.safeParse({ skip: -1 }).success).toBe(false);
      });

      it('rejects invalid transaction type enum', () => {
        expect(ledgerQuerySchema.safeParse({ type: 'TRANSFER' }).success).toBe(false);
      });
    });
  });

  // =========================================================================
  // 3. Assessment Schemas
  // =========================================================================
  describe('Assessment Schemas', () => {
    describe('submitAssessmentSchema', () => {
      it('accepts valid answers dictionary', () => {
        const result = submitAssessmentSchema.safeParse({
          answers: {
            1: 'q1_a',
            2: ['q2_a', 'q2_d'],
            4: 2,
            11: 'Designing modular microservices',
          },
        });
        expect(result.success).toBe(true);
      });

      it('defaults empty answers when omitted', () => {
        const result = submitAssessmentSchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.answers).toEqual({});
        }
      });

      it('rejects non-object answers (e.g. string or array)', () => {
        expect(submitAssessmentSchema.safeParse({ answers: 'invalid' }).success).toBe(false);
        expect(submitAssessmentSchema.safeParse({ answers: [1, 2, 3] }).success).toBe(false);
      });
    });
  });

  // =========================================================================
  // 4. Validation Middleware Behavior
  // =========================================================================
  describe('Validation Middleware Functionality', () => {
    function createMockExpressContext(initial: {
      body?: unknown;
      query?: unknown;
      params?: unknown;
    }) {
      const req = {
        body: initial.body,
        query: initial.query,
        params: initial.params,
      } as unknown as Request;

      let statusCode = 200;
      let jsonPayload: unknown = null;

      const res = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (payload: unknown) => {
          jsonPayload = payload;
          return res;
        },
      } as unknown as Response;

      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      return {
        req,
        res,
        next,
        getStatusCode: () => statusCode,
        getJsonPayload: () => jsonPayload,
        wasNextCalled: () => nextCalled,
      };
    }

    it('passes control to next() when body validation succeeds', () => {
      const ctx = createMockExpressContext({
        body: { email: 'test@example.com', password: 'password123' },
      });
      const middleware = validateBody(loginSchema);

      middleware(ctx.req, ctx.res, ctx.next);

      expect(ctx.wasNextCalled()).toBe(true);
      expect(ctx.getStatusCode()).toBe(200);
      expect(ctx.req.body.email).toBe('test@example.com');
    });

    it('returns HTTP 400 with sanitized details on invalid body', () => {
      const ctx = createMockExpressContext({
        body: { email: 'bad-email', password: '' },
      });
      const middleware = validateBody(loginSchema);

      middleware(ctx.req, ctx.res, ctx.next);

      expect(ctx.wasNextCalled()).toBe(false);
      expect(ctx.getStatusCode()).toBe(400);

      const payload = ctx.getJsonPayload() as any;
      expect(payload.code).toBe('VALIDATION_ERROR');
      expect(payload.error).toBeDefined();
      expect(Array.isArray(payload.details)).toBe(true);
      expect(payload.details.length).toBeGreaterThanOrEqual(1);

      // Verify no stack traces or secrets leaked
      expect(payload.stack).toBeUndefined();
      expect(payload.password).toBeUndefined();
    });

    it('sanitizes and coerces query parameters via validateQuery', () => {
      const ctx = createMockExpressContext({
        query: { limit: '25', skip: '10' },
      });
      const middleware = validateQuery(ledgerQuerySchema);

      middleware(ctx.req, ctx.res, ctx.next);

      expect(ctx.wasNextCalled()).toBe(true);
      expect(ctx.req.query.limit).toBe(25);
      expect(ctx.req.query.skip).toBe(10);
    });

    it('rejects invalid query parameter types with HTTP 400', () => {
      const ctx = createMockExpressContext({
        query: { limit: 'not-a-number' },
      });
      const middleware = validateQuery(ledgerQuerySchema);

      middleware(ctx.req, ctx.res, ctx.next);

      expect(ctx.wasNextCalled()).toBe(false);
      expect(ctx.getStatusCode()).toBe(400);
    });
  });
});
