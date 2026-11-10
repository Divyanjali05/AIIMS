/**
 * testLoginRateLimit.ts
 * =========================================================
 * Regression Tests for Local Development Login Rate-Limit Adjustment
 *
 * Verifies:
 *  1. Local development (NODE_ENV=development) allows 30 login attempts / 15 minutes (900s).
 *  2. Attempt #31 in local development returns HTTP 429 with RATE_LIMIT_EXCEEDED and Retry-After=900.
 *  3. Production (NODE_ENV=production) enforces 15 attempts / 15 minutes and rejects attempt #16 with HTTP 429.
 *  4. Production cannot be overridden by spoofed request headers, query params, body flags, or rate-limit env overrides.
 *  5. Missing/empty/unknown NODE_ENV fails closed to production 15 / 15 minutes (never leaks dev 30 limit).
 *  6. Rate-limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After) remain accurate.
 *  7. /auth/register, /auth/set-password, /auth/totp/verify, and /auth/account retain existing independent limiters.
 *  8. Automated test mode (NODE_ENV=test) supports isolated configurable test thresholds without touching production.
 *
 * Usage:
 *  npx ts-node src/scripts/testLoginRateLimit.ts
 */

import {
  resolveLoginRateLimitConfig,
  LOGIN_RATE_LIMIT_WINDOW_MS,
  PRODUCTION_LOGIN_RATE_LIMIT_MAX,
  LOCAL_DEV_LOGIN_RATE_LIMIT_MAX,
} from '../config/env';
import {
  createLoginRateLimiter,
  loginRateLimiter,
  authRateLimiter,
  registrationRateLimiter,
  totpRateLimiter,
  accountDeletionRateLimiter,
  clearRateLimitStore,
} from '../middleware/rateLimit.middleware';
import authRoutes from '../routes/auth.routes';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.error(`  ❌ [FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function invokeLimiter(
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

async function runTests() {
  console.log('===============================================================');
  console.log('🔐  AIIMS LOGIN RATE-LIMIT ENVIRONMENT SEPARATION TESTS');
  console.log('===============================================================\n');

  try {
    // -------------------------------------------------------------------------
    // SUITE 1: Environment Separation & Fail-Closed Defaults
    // -------------------------------------------------------------------------
    console.log('── SUITE 1: Environment Detection & Fail-Closed Defaults ──');

    const devCfg = resolveLoginRateLimitConfig({ NODE_ENV: 'development' });
    assert(
      '1.1: Explicit NODE_ENV=development resolves to 30 attempts / 900s',
      devCfg.environment === 'development' &&
        devCfg.max === 30 &&
        devCfg.windowMs === 900_000 &&
        LOCAL_DEV_LOGIN_RATE_LIMIT_MAX === 30 &&
        LOGIN_RATE_LIMIT_WINDOW_MS === 900_000
    );

    const devWithAuthEnv = resolveLoginRateLimitConfig({
      NODE_ENV: 'development',
      AUTH_RATE_LIMIT_MAX: '15',
    });
    assert(
      '1.2: Explicit NODE_ENV=development retains 30 login limit even when AUTH_RATE_LIMIT_MAX=15 is present in .env',
      devWithAuthEnv.environment === 'development' && devWithAuthEnv.max === 30
    );

    const prodCfg = resolveLoginRateLimitConfig({ NODE_ENV: 'production' });
    assert(
      '1.3: Explicit NODE_ENV=production resolves strictly to 15 attempts / 900s',
      prodCfg.environment === 'production' &&
        prodCfg.max === 15 &&
        prodCfg.windowMs === 900_000 &&
        PRODUCTION_LOGIN_RATE_LIMIT_MAX === 15
    );

    const prodSpoofedEnvVars = resolveLoginRateLimitConfig({
      NODE_ENV: 'production',
      AUTH_RATE_LIMIT_MAX: '999',
      TEST_LOGIN_RATE_LIMIT_MAX: '999',
      AUTH_RATE_LIMIT_WINDOW_MS: '1000',
    });
    assert(
      '1.4: Production ignores higher AUTH/TEST env overrides and remains locked at 15 / 900s',
      prodSpoofedEnvVars.environment === 'production' &&
        prodSpoofedEnvVars.max === 15 &&
        prodSpoofedEnvVars.windowMs === 900_000
    );

    const unsetEnvCfg = resolveLoginRateLimitConfig({});
    const emptyEnvCfg = resolveLoginRateLimitConfig({ NODE_ENV: '' });
    const stagingEnvCfg = resolveLoginRateLimitConfig({ NODE_ENV: 'staging' });
    const localTypoCfg = resolveLoginRateLimitConfig({ NODE_ENV: 'local' });

    assert(
      '1.5: Missing, empty, staging, or unknown NODE_ENV fails closed to production (15 / 900s)',
      unsetEnvCfg.environment === 'production' &&
        unsetEnvCfg.max === 15 &&
        emptyEnvCfg.environment === 'production' &&
        emptyEnvCfg.max === 15 &&
        stagingEnvCfg.environment === 'production' &&
        stagingEnvCfg.max === 15 &&
        localTypoCfg.environment === 'production' &&
        localTypoCfg.max === 15
    );

    const testDefaultCfg = resolveLoginRateLimitConfig({ NODE_ENV: 'test' });
    const testCustomCfg = resolveLoginRateLimitConfig({
      NODE_ENV: 'test',
      TEST_LOGIN_RATE_LIMIT_MAX: '4',
      TEST_LOGIN_RATE_LIMIT_WINDOW_MS: '60000',
    });
    assert(
      '1.6: NODE_ENV=test provides isolated configurable test defaults (15/900s default, custom override supported)',
      testDefaultCfg.environment === 'test' &&
        testDefaultCfg.max === 15 &&
        testDefaultCfg.windowMs === 900_000 &&
        testCustomCfg.environment === 'test' &&
        testCustomCfg.max === 4 &&
        testCustomCfg.windowMs === 60_000
    );

    // -------------------------------------------------------------------------
    // SUITE 2: Local Development Login Limiter (30 allowed, #31 -> HTTP 429)
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 2: Local Development Login Rate Limiter (30 / 15m) ──');

    const devLimiter = createLoginRateLimiter({ NODE_ENV: 'development' });
    let devAllowedCount = 0;
    let firstDevHeaders: Record<string, any> = {};
    for (let i = 1; i <= 30; i++) {
      const r = await invokeLimiter(devLimiter, { ip: '10.0.0.1' });
      if (i === 1) firstDevHeaders = r.headers;
      if (r.allowed) devAllowedCount++;
    }
    const devBlocked = await invokeLimiter(devLimiter, { ip: '10.0.0.1' });

    assert(
      '2.1: Local development allows all 30 login attempts cleanly',
      devAllowedCount === 30 && Number(firstDevHeaders['x-ratelimit-limit']) === 30,
      `Allowed ${devAllowedCount}/30, X-RateLimit-Limit=${firstDevHeaders['x-ratelimit-limit']}`
    );
    assert(
      '2.2: Attempt #31 in local development is rejected with HTTP 429 & RATE_LIMIT_EXCEEDED',
      !devBlocked.allowed &&
        devBlocked.statusCode === 429 &&
        devBlocked.body?.code === 'RATE_LIMIT_EXCEEDED' &&
        devBlocked.body?.error === 'Too many authentication attempts. Please try again later.'
    );
    assert(
      '2.3: Blocked 429 response in local development returns Retry-After=900 and rate-limit headers',
      Number(devBlocked.headers['retry-after']) === 900 &&
        devBlocked.body?.retryAfterSeconds === 900 &&
        Number(devBlocked.headers['x-ratelimit-limit']) === 30 &&
        Number(devBlocked.headers['x-ratelimit-remaining']) === 0
    );

    // -------------------------------------------------------------------------
    // SUITE 3: Production Login Limiter (15 allowed, #16 -> HTTP 429) & Spoof Resistance
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 3: Production Login Rate Limiter (15 / 15m) & Spoof Resistance ──');

    const prodLimiter = createLoginRateLimiter({ NODE_ENV: 'production' });
    let prodAllowedCount = 0;
    let firstProdHeaders: Record<string, any> = {};
    for (let i = 1; i <= 15; i++) {
      const r = await invokeLimiter(prodLimiter, {
        ip: '198.51.100.77',
        // Attempted client spoofing headers / query / body flags
        headers: {
          'x-env': 'development',
          'x-environment': 'local',
          'x-forwarded-host': 'localhost:3000',
          origin: 'http://localhost:3000',
        },
        query: { env: 'development', nodeEnv: 'development' },
        body: { env: 'development', bypassRateLimit: true },
      });
      if (i === 1) firstProdHeaders = r.headers;
      if (r.allowed) prodAllowedCount++;
    }
    const prodBlocked = await invokeLimiter(prodLimiter, {
      ip: '198.51.100.77',
      headers: { 'x-env': 'development', origin: 'http://localhost:3000' },
      query: { env: 'development' },
      body: { env: 'development' },
    });

    assert(
      '3.1: Production allows at most 15 login attempts (even with client dev spoof headers/query/body)',
      prodAllowedCount === 15 && Number(firstProdHeaders['x-ratelimit-limit']) === 15,
      `Allowed ${prodAllowedCount}/15, X-RateLimit-Limit=${firstProdHeaders['x-ratelimit-limit']}`
    );
    assert(
      '3.2: Production rejects attempt #16 with HTTP 429 and RATE_LIMIT_EXCEEDED',
      !prodBlocked.allowed &&
        prodBlocked.statusCode === 429 &&
        prodBlocked.body?.code === 'RATE_LIMIT_EXCEEDED'
    );
    assert(
      '3.3: Production blocked 429 response preserves Retry-After=900 and headers',
      Number(prodBlocked.headers['retry-after']) === 900 &&
        prodBlocked.body?.retryAfterSeconds === 900 &&
        Number(prodBlocked.headers['x-ratelimit-limit']) === 15 &&
        Number(prodBlocked.headers['x-ratelimit-remaining']) === 0
    );

    // -------------------------------------------------------------------------
    // SUITE 4: Isolated Test Configuration
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 4: Isolated Test Configuration ──');

    const isolatedTestLimiter = createLoginRateLimiter({
      NODE_ENV: 'test',
      TEST_LOGIN_RATE_LIMIT_MAX: '3',
      TEST_LOGIN_RATE_LIMIT_WINDOW_MS: '60000',
    });
    const t1 = await invokeLimiter(isolatedTestLimiter, { ip: '203.0.113.5' });
    const t2 = await invokeLimiter(isolatedTestLimiter, { ip: '203.0.113.5' });
    const t3 = await invokeLimiter(isolatedTestLimiter, { ip: '203.0.113.5' });
    const t4 = await invokeLimiter(isolatedTestLimiter, { ip: '203.0.113.5' });

    assert(
      '4.1: Automated test limiter respects isolated config (3 allowed, #4 -> HTTP 429)',
      t1.allowed &&
        t2.allowed &&
        t3.allowed &&
        !t4.allowed &&
        t4.statusCode === 429 &&
        Number(t4.headers['retry-after']) === 60
    );

    // -------------------------------------------------------------------------
    // SUITE 5: Route Isolation & Preservation of Other Auth Rate Limiters
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 5: Registration & Other Auth Routes Preserve Independent Limits ──');

    const findPostRouteHandlers = (path: string) => {
      const layer = (authRoutes as any).stack.find(
        (l: any) => l.route && l.route.path === path && l.route.methods?.post
      );
      return layer ? layer.route.stack.map((s: any) => s.handle) : [];
    };

    const loginHandlers = findPostRouteHandlers('/auth/login');
    const registerHandlers = findPostRouteHandlers('/auth/register');
    const setPwdHandlers = findPostRouteHandlers('/auth/set-password');
    const totpVerifyHandlers = findPostRouteHandlers('/auth/totp/verify');

    assert(
      '5.1: /auth/login uses dedicated loginRateLimiter while /auth/register, /auth/set-password, /auth/totp/verify preserve existing limiters',
      loginHandlers.includes(loginRateLimiter) &&
        !loginHandlers.includes(registrationRateLimiter) &&
        registerHandlers.includes(registrationRateLimiter) &&
        setPwdHandlers.includes(authRateLimiter) &&
        totpVerifyHandlers.includes(totpRateLimiter)
    );

    // Exhaust loginRateLimiter for an IP and confirm registration & set-password remain unblocked and at 15
    clearRateLimitStore();
    const sharedIp = '192.0.2.99';
    const maxLogin = resolveLoginRateLimitConfig().max;
    for (let i = 0; i < maxLogin; i++) {
      await invokeLimiter(loginRateLimiter, { ip: sharedIp });
    }
    const loginAfterMax = await invokeLimiter(loginRateLimiter, { ip: sharedIp });
    const regAfterLoginExhaust = await invokeLimiter(registrationRateLimiter, {
      ip: sharedIp,
      path: '/auth/register',
    });
    const setPwdAfterLoginExhaust = await invokeLimiter(authRateLimiter, {
      ip: sharedIp,
      path: '/auth/set-password',
    });

    assert(
      '5.2: Exhausting loginRateLimiter blocks login without affecting /auth/register or /auth/set-password',
      !loginAfterMax.allowed &&
        loginAfterMax.statusCode === 429 &&
        regAfterLoginExhaust.allowed &&
        Number(regAfterLoginExhaust.headers['x-ratelimit-limit']) === 15 &&
        setPwdAfterLoginExhaust.allowed &&
        Number(setPwdAfterLoginExhaust.headers['x-ratelimit-limit']) === 15
    );

    // Confirm accountDeletionRateLimiter retains 5 attempts / 15m and totpRateLimiter retains 10 attempts / 10m
    const acctRes = await invokeLimiter(accountDeletionRateLimiter, { ip: '192.0.2.100' });
    const totpRes = await invokeLimiter(totpRateLimiter, { ip: '192.0.2.100' });
    assert(
      '5.3: Account deletion (5) and TOTP (10) limiters retain original limits',
      Number(acctRes.headers['x-ratelimit-limit']) === 5 &&
        Number(totpRes.headers['x-ratelimit-limit']) === 10
    );

    clearRateLimitStore();
  } finally {
    clearRateLimitStore();
  }

  console.log('\n===============================================================');
  console.log(`LOGIN RATE-LIMIT SUMMARY: ${passed} PASSED / ${failed} FAILED (Total: ${passed + failed})`);
  console.log('===============================================================');

  if (failed > 0) {
    console.error('❌ Failed checks:', failures);
    process.exit(1);
  }
  console.log('🎉 ALL LOGIN RATE-LIMIT REGRESSION CHECKS PASSED CLEANLY!\n');
}

runTests().catch((err) => {
  console.error('❌ Test runner error:', err);
  process.exit(1);
});

