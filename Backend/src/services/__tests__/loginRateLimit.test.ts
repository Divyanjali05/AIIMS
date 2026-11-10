/**
 * loginRateLimit.test.ts
 * =========================================================
 * AIIMS Authentication Login Rate-Limit Environment Isolation Tests (Vitest)
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  resolveLoginRateLimitConfig,
  LOGIN_RATE_LIMIT_WINDOW_MS,
  PRODUCTION_LOGIN_RATE_LIMIT_MAX,
  LOCAL_DEV_LOGIN_RATE_LIMIT_MAX,
} from '../../config/env';
import {
  createLoginRateLimiter,
  loginRateLimiter,
  authRateLimiter,
  registrationRateLimiter,
  totpRateLimiter,
  accountDeletionRateLimiter,
  clearRateLimitStore,
} from '../../middleware/rateLimit.middleware';
import authRoutes from '../../routes/auth.routes';

async function runMiddleware(
  middleware: any,
  opts: {
    ip?: string;
    path?: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
    body?: Record<string, any>;
  } = {}
): Promise<{
  allowed: boolean;
  statusCode: number;
  headers: Record<string, any>;
  body: any;
}> {
  return new Promise((resolve) => {
    const req: any = {
      method: 'POST',
      path: opts.path || '/auth/login',
      ip: opts.ip || '198.51.100.10',
      headers: opts.headers || {},
      query: opts.query || {},
      body: opts.body || {},
      socket: { remoteAddress: opts.ip || '198.51.100.10' },
      app: { get: () => 1 },
    };

    const res: any = {
      statusCode: 200,
      headersSent: false,
      headers: {} as Record<string, any>,
      body: null as any,
      setHeader(key: string, val: any) {
        this.headers[key.toLowerCase()] = val;
        return this;
      },
      getHeader(key: string) {
        return this.headers[key.toLowerCase()];
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: any) {
        this.body = payload;
        this.headersSent = true;
        resolve({
          allowed: false,
          statusCode: this.statusCode,
          headers: this.headers,
          body: this.body,
        });
        return this;
      },
    };

    middleware(req, res, () => {
      resolve({
        allowed: true,
        statusCode: 200,
        headers: res.headers,
        body: null,
      });
    });
  });
}

describe('Login Rate-Limit Policy & Environment Separation', () => {
  afterEach(() => {
    clearRateLimitStore();
  });

  it('uses 30 attempts / 900s only when NODE_ENV is explicitly development', () => {
    const devCfg = resolveLoginRateLimitConfig({ NODE_ENV: 'development' });
    expect(devCfg).toEqual({
      environment: 'development',
      max: LOCAL_DEV_LOGIN_RATE_LIMIT_MAX,
      windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
    });
    expect(devCfg.max).toBe(30);
    expect(devCfg.windowMs).toBe(900_000);
  });

  it('locks production at 15 attempts / 900s regardless of env overrides', () => {
    const prodCfg = resolveLoginRateLimitConfig({
      NODE_ENV: 'production',
      AUTH_RATE_LIMIT_MAX: '500',
      TEST_LOGIN_RATE_LIMIT_MAX: '500',
    });
    expect(prodCfg).toEqual({
      environment: 'production',
      max: PRODUCTION_LOGIN_RATE_LIMIT_MAX,
      windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
    });
    expect(prodCfg.max).toBe(15);
  });

  it('fails closed to 15 attempts / 900s when NODE_ENV is missing, empty, or unknown', () => {
    for (const env of [{}, { NODE_ENV: '' }, { NODE_ENV: 'staging' }, { NODE_ENV: 'local' }]) {
      const cfg = resolveLoginRateLimitConfig(env);
      expect(cfg.environment).toBe('production');
      expect(cfg.max).toBe(15);
      expect(cfg.windowMs).toBe(900_000);
    }
  });

  it('allows 30 login requests in local development and blocks attempt #31 with HTTP 429', async () => {
    const devLimiter = createLoginRateLimiter({ NODE_ENV: 'development' });
    for (let i = 0; i < 30; i++) {
      const res = await runMiddleware(devLimiter, { ip: '10.0.0.50' });
      expect(res.allowed).toBe(true);
      expect(Number(res.headers['x-ratelimit-limit'])).toBe(30);
    }

    const blocked = await runMiddleware(devLimiter, { ip: '10.0.0.50' });
    expect(blocked.allowed).toBe(false);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.body?.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(Number(blocked.headers['retry-after'])).toBe(900);
    expect(Number(blocked.headers['x-ratelimit-remaining'])).toBe(0);
  });

  it('blocks attempt #16 in production with HTTP 429 despite spoofed dev headers/query', async () => {
    const prodLimiter = createLoginRateLimiter({ NODE_ENV: 'production' });
    for (let i = 0; i < 15; i++) {
      const res = await runMiddleware(prodLimiter, {
        ip: '198.51.100.88',
        headers: { 'x-env': 'development', origin: 'http://localhost:3000' },
        query: { env: 'development' },
        body: { env: 'development' },
      });
      expect(res.allowed).toBe(true);
      expect(Number(res.headers['x-ratelimit-limit'])).toBe(15);
    }

    const blocked = await runMiddleware(prodLimiter, {
      ip: '198.51.100.88',
      headers: { 'x-env': 'development', origin: 'http://localhost:3000' },
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.body?.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(Number(blocked.headers['retry-after'])).toBe(900);
    expect(Number(blocked.headers['x-ratelimit-remaining'])).toBe(0);
  });

  it('supports isolated test limiters in NODE_ENV=test without impacting production', async () => {
    const testLimiter = createLoginRateLimiter({
      NODE_ENV: 'test',
      TEST_LOGIN_RATE_LIMIT_MAX: '2',
      TEST_LOGIN_RATE_LIMIT_WINDOW_MS: '60000',
    });
    expect((await runMiddleware(testLimiter, { ip: '203.0.113.10' })).allowed).toBe(true);
    expect((await runMiddleware(testLimiter, { ip: '203.0.113.10' })).allowed).toBe(true);
    const blocked = await runMiddleware(testLimiter, { ip: '203.0.113.10' });
    expect(blocked.allowed).toBe(false);
    expect(blocked.statusCode).toBe(429);
    expect(Number(blocked.headers['retry-after'])).toBe(60);
  });

  it('preserves independent rate limits for registration, set-password, totp, and account deletion', async () => {
    const getHandles = (path: string) => {
      const layer = (authRoutes as any).stack.find(
        (l: any) => l.route && l.route.path === path && l.route.methods?.post
      );
      return layer ? layer.route.stack.map((s: any) => s.handle) : [];
    };

    expect(getHandles('/auth/login')).toContain(loginRateLimiter);
    expect(getHandles('/auth/register')).toContain(registrationRateLimiter);
    expect(getHandles('/auth/set-password')).toContain(authRateLimiter);
    expect(getHandles('/auth/totp/verify')).toContain(totpRateLimiter);

    const acctRes = await runMiddleware(accountDeletionRateLimiter, { ip: '192.0.2.21' });
    const regRes = await runMiddleware(registrationRateLimiter, { ip: '192.0.2.21' });
    const setPwdRes = await runMiddleware(authRateLimiter, { ip: '192.0.2.21' });
    expect(Number(acctRes.headers['x-ratelimit-limit'])).toBe(5);
    expect(Number(regRes.headers['x-ratelimit-limit'])).toBe(15);
    expect(Number(setPwdRes.headers['x-ratelimit-limit'])).toBe(15);
  });
});

