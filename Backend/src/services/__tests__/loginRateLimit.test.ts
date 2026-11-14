/**
 * loginRateLimit.test.ts
 * =========================================================
 * AIIMS Authentication Login Rate-Limit & Environment Isolation Tests (Vitest)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
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
import { validateBody } from '../../middleware/validate.middleware';
import { loginSchema } from '../../schemas/auth.schema';
import { login } from '../../controllers/auth.controller';
import { prisma } from '../../config/prisma';
import { installPrismaTestDouble, uninstallPrismaTestDouble } from './helpers/prismaTestDouble';
import { hashPassword } from '../../utils/userMapper';

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

class MockResponse extends EventEmitter {
  statusCode = 200;
  headers: Record<string, any> = {};
  body: any = null;

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  setHeader(k: string, v: any) {
    this.headers[k.toLowerCase()] = String(v);
    return this;
  }

  getHeader(k: string) {
    return this.headers[k.toLowerCase()];
  }

  json(data: any) {
    this.body = data;
    this.emit('finish');
    return this;
  }

  send(data: any) {
    this.body = data;
    this.emit('finish');
    return this;
  }

  cookie() {
    return this;
  }
}

async function makeRequest(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Promise<{ status: number; headers: { get: (k: string) => string | null }; body: any }> {
  const req: any = {
    method: options.method || 'POST',
    path,
    url: path,
    headers: { ...(options.headers || {}) },
    body: options.body || {},
    ip: options.headers?.['x-forwarded-for'] || '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
  };

  const res = new MockResponse();

  await new Promise<void>((resolve) => {
    res.on('finish', () => resolve());

    authRateLimiter(req, res as any, (err?: any) => {
      if (err) {
        res.status(500).json({ error: String(err) });
        return;
      }
      validateBody(loginSchema)(req, res as any, async (valErr?: any) => {
        if (valErr) {
          res.status(400).json({ error: String(valErr) });
          return;
        }
        try {
          await login(req, res as any);
        } catch (e: any) {
          res.status(500).json({ error: e?.message || 'Internal Server Error' });
        }
      });
    });
  });

  return {
    status: res.statusCode,
    headers: {
      get: (k: string) => res.headers[k.toLowerCase()] ?? null,
    },
    body: res.body,
  };
}

describe('AIIMS Login Rate-Limit & Authentication Security Audit', () => {
  beforeAll(async () => {
    installPrismaTestDouble({ connected: true });

    // Seed test user with known password
    await prisma.user.create({
      data: {
        id: '65d000000000000000000101',
        email: 'ratelimit.user@aiims.edu',
        name: 'Rate Limit Tester',
        password: await hashPassword('ValidPassword123!'),
        role: 'learner',
        aiimsCredits: 500,
        xpPoints: 100,
        stage: 'Knowing',
      },
    });
  });

  afterAll(async () => {
    uninstallPrismaTestDouble();
  });

  beforeEach(() => {
    clearRateLimitStore();
  });

  it('1. Login error messages are identical between non-existent user and wrong password (prevents account enumeration)', async () => {
    // Non-existent user
    const nonExistentRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'nobody.exists@aiims.edu',
        password: 'SomePassword123!',
      },
    });
    expect(nonExistentRes.status).toBe(401);
    expect(nonExistentRes.body.error).toBe('Email or password is incorrect.');

    // Existing user with wrong password
    const wrongPwRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'ratelimit.user@aiims.edu',
        password: 'IncorrectPassword123!',
      },
    });
    expect(wrongPwRes.status).toBe(401);
    expect(wrongPwRes.body.error).toBe('Email or password is incorrect.');
  });

  it('2. Successful login attempts do NOT increment the failure counter (skipSuccessfulRequests: true)', async () => {
    const deviceHeaders = { 'x-device-id': 'rate-limit-test-device-1', 'x-platform': 'web' };

    // Perform a successful login
    const loginRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      headers: deviceHeaders,
      body: {
        email: 'ratelimit.user@aiims.edu',
        password: 'ValidPassword123!',
      },
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user?.email).toBe('ratelimit.user@aiims.edu');

    // Since successful requests are skipped, remaining slots should remain unaffected.
    // Now perform 1 failed login and verify remaining slots is max - 1 (14)
    const failRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      headers: deviceHeaders,
      body: {
        email: 'ratelimit.user@aiims.edu',
        password: 'WrongPassword!',
      },
    });
    expect(failRes.status).toBe(401);

    const remainingHeader = failRes.headers.get('x-ratelimit-remaining');
    if (remainingHeader !== null) {
      expect(Number(remainingHeader)).toBe(14); // 15 max - 1 failure = 14
    }
  });

  it('3. Repeated failed login attempts exhaust the rate limit and return HTTP 429', async () => {
    // Fire 15 failed logins to exhaust 15 limit slots
    for (let i = 0; i < 15; i++) {
      const failRes = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: {
          email: 'ratelimit.user@aiims.edu',
          password: 'WrongPassword!',
        },
      });
      expect(failRes.status).toBe(401);
    }

    // 16th attempt must be blocked by rate limiter
    const blockedRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'ratelimit.user@aiims.edu',
        password: 'ValidPassword123!',
      },
    });
    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(blockedRes.body.error).toContain('Too many authentication attempts');
    expect(blockedRes.headers.get('retry-after')).toBeTruthy();
  });

  it('4. Clearing rate limit store safely restores access', async () => {
    // Trigger a failed login
    await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'ratelimit.user@aiims.edu', password: 'Bad' },
    });

    // Reset store
    clearRateLimitStore();

    // Next request should have full capacity restored
    const freshRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'ratelimit.user@aiims.edu', password: 'Bad' },
    });
    expect(freshRes.status).toBe(401);
    const remaining = freshRes.headers.get('x-ratelimit-remaining');
    if (remaining !== null) {
      expect(Number(remaining)).toBe(14);
    }
  });
});
