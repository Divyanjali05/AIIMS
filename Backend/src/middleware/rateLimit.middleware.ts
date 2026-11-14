import { Request, Response } from 'express';
import { rateLimit, MemoryStore } from 'express-rate-limit';
import { config, resolveLoginRateLimitConfig, type LoginRateLimitConfig } from '../config/env';

/**
 * Registry of active in-memory stores for testing teardown and cleanup.
 */
const activeStores: MemoryStore[] = [];

/**
 * Resets all in-memory rate limit stores (used for test teardown and cleanup).
 */
export const clearRateLimitStore = (): void => {
  for (const store of activeStores) {
    if (typeof store.resetAll === 'function') {
      store.resetAll();
    }
  }
};

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  statusCode?: number;
  skipSuccessfulRequests?: boolean;
}

/**
 * Creates a rate limiting middleware using standard express-rate-limit.
 * Satisfies CodeQL js/missing-rate-limiting requirements.
 */
export const createRateLimiter = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    skipSuccessfulRequests = false,
  } = options;

  const store = new MemoryStore();
  activeStores.push(store);

  return rateLimit({
    windowMs,
    limit: max,
    store,
    standardHeaders: 'draft-7',
    legacyHeaders: true,
    validate: false,
    skipSuccessfulRequests,
    keyGenerator: (req: Request) => {
      const forwarded = req.headers['x-forwarded-for'];
      const ip =
        typeof forwarded === 'string'
          ? forwarded.split(',')[0].trim()
          : req.ip || req.socket.remoteAddress || '127.0.0.1';
      return `${ip}`;
    },
    handler: (req: Request, res: Response, _next, opts) => {
      const retryAfter = Math.ceil(opts.windowMs / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      return res.status(statusCode).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds: retryAfter,
      });
    },
  });
};

// 1. Auth Rate Limiter: configurable window and max requests per IP (defaults: 15 per 15 minutes)
// Only failed authentication attempts increment the rate limit counter (skipSuccessfulRequests: true)
export const authRateLimiter = createRateLimiter({
  windowMs: config.authRateLimitWindowMs || 15 * 60 * 1000,
  max: config.authRateLimitMax || 15,
  message: 'Too many authentication attempts. Please try again later.',
  skipSuccessfulRequests: true,
});

/**
 * Factory for dedicated login rate limiter so unit tests can instantiate
 * isolated environment-specific limiters cleanly without mutating production config.
 */
export const createLoginRateLimiter = (
  envOrConfig: NodeJS.ProcessEnv | LoginRateLimitConfig = {
    environment: config.loginRateLimitEnvironment,
    max: config.loginRateLimitMax,
    windowMs: config.loginRateLimitWindowMs,
  }
) => {
  const resolved: LoginRateLimitConfig =
    'max' in envOrConfig && 'windowMs' in envOrConfig && typeof envOrConfig.max === 'number'
      ? (envOrConfig as LoginRateLimitConfig)
      : resolveLoginRateLimitConfig(envOrConfig as NodeJS.ProcessEnv);

  return createRateLimiter({
    windowMs: resolved.windowMs,
    max: resolved.max,
    message: 'Too many authentication attempts. Please try again later.',
  });
};

// 1a. Dedicated Login Rate Limiter: 30/15m in explicit local development, 15/15m in production
export const loginRateLimiter = createLoginRateLimiter();

// 1b. Registration Rate Limiter: dedicated limit (default: 15 attempts per hour per IP)
export const registrationRateLimiter = createRateLimiter({
  windowMs: config.registrationRateLimitWindowMs || 60 * 60 * 1000,
  max: config.registrationRateLimitMax || 15,
  message: 'Too many registration attempts. Please try again later.',
});

// 2. Account Deletion Rate Limiter: max 5 deletion requests per 15 minutes per IP
export const accountDeletionRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many account deletion attempts. Please wait before trying again.',
});

// 3. TOTP / 2FA Rate Limiter: max 10 attempts per 10 minutes per IP
export const totpRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: 'Too many 2FA attempts. Please wait before trying again.',
});

// 4. Admin Management Rate Limiter: max 120 requests per 15 minutes per IP
export const adminRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: 'Too many administrative requests. Please slow down.',
});

// 5. Evaluator Queue & Review Rate Limiter: max 120 requests per 15 minutes per IP
export const evaluatorRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: 'Too many evaluation requests. Please slow down.',
});

// 6. Submission & Resubmission Rate Limiter: max 60 requests per 15 minutes per IP
export const submissionRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Submission rate limit reached. Please wait before submitting again.',
});

// 7. Clarity Tasks Rate Limiter: max 120 requests per 15 minutes per IP
export const clarityRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: 'Too many clarity task operations. Please wait a moment.',
});

// 8. AI Task Execution Rate Limiter: max 20 prompt runs per minute per IP
export const aiExecutionRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message:
    'AI task execution rate limit reached. Please wait a moment before sending another prompt.',
});

// 9. General API Rate Limiter: max 300 requests per 15 minutes per IP
export const generalApiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Too many requests. Please try again later.',
});
