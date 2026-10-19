import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitStore>();

/**
 * Resets the in-memory rate limit store (used for test teardown and cleanup)
 */
export const clearRateLimitStore = (): void => {
  memoryStore.clear();
};

// Clean up stale IP records every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (now > record.resetTime) {
      memoryStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  statusCode?: number;
}

/**
 * Lightweight, in-memory IP/Token rate limiting middleware.
 * Zero external dependencies.
 */
export const createRateLimiter = (options: RateLimitOptions) => {
  const { windowMs, max, message = 'Too many requests, please try again later.', statusCode = 429 } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const key = `${req.baseUrl || ''}${req.path}:${clientIp}`;
    const now = Date.now();

    const record = memoryStore.get(key);

    if (!record || now > record.resetTime) {
      memoryStore.set(key, { count: 1, resetTime: now + windowMs });
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      return next();
    }

    if (record.count >= max) {
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
      return res.status(statusCode).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000)
      });
    }

    record.count++;
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max - record.count);
    next();
  };
};

// 1. Auth Rate Limiter: configurable window and max requests per IP (defaults: 15 per 15 minutes)
export const authRateLimiter = createRateLimiter({
  windowMs: config.authRateLimitWindowMs,
  max: config.authRateLimitMax,
  message: 'Too many authentication attempts. Please try again later.'
});

// 2. AI Execution Rate Limiter: max 20 prompt runs per minute per IP
export const aiExecutionRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'AI task execution rate limit reached. Please wait a moment before sending another prompt.'
});
