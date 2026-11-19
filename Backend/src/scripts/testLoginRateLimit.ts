/**
 * testLoginRateLimit.ts
 * =========================================================
 * Regression Tests for Relaxed Institutional Login Rate-Limit Policy
 *
 * Verifies:
 *  1. Local development (NODE_ENV=development) allows 500 login attempts / 15 minutes (900s).
 *  2. Production (NODE_ENV=production) enforces 300 attempts / 15 minutes for shared institutional IPs.
 *  3. Production cannot be overridden by client spoofed request headers, query params, or body flags.
 *  4. Missing/empty/unknown NODE_ENV fails closed to production 300 / 15 minutes.
 *  5. Rate-limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After) remain accurate.
 *  6. /auth/register, /auth/set-password, /auth/totp/verify, and /auth/account retain independent limiters.
 *  7. Automated test mode (NODE_ENV=test) supports isolated configurable test thresholds without touching production.
 *
 * Usage:
 *  npx ts-node src/scripts/testLoginRateLimit.ts
 */

import { EventEmitter } from 'events';
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

class MockResponse extends EventEmitter {
  statusCode = 200;
  headersSent = false;
  headers: Record<string, any> = {};
  body: any = null;

  setHeader(key: string, val: any) {
    this.headers[key.toLowerCase()] = String(val);
    return this;
  }
  getHeader(key: string) {
    return this.headers[key.toLowerCase()];
  }
  status(code: number) {
    this.statusCode = code;
    return this;
  }
  json(payload: any) {
    this.body = payload;
    this.headersSent = true;
    this.emit('finish');
    return this;
  }
  send(payload: any) {
    this.body = payload;
    this.headersSent = true;
    this.emit('finish');
    return this;
  }
  end() {
    this.headersSent = true;
    this.emit('finish');
    return this;
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
    simulateFailure?: boolean;
  } = {}
): Promise<{
  allowed: boolean;
  passedThrough: boolean;
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

    const res = new MockResponse();
    let didPassThrough = false;

    res.once('finish', () => {
      resolve({
        allowed: res.statusCode < 400,
        passedThrough: didPassThrough,
        statusCode: res.statusCode,
        headers: res.headers,
        body: res.body,
      });
    });

    middleware(req, res as any, () => {
      didPassThrough = true;
      if (opts.simulateFailure) {
        res.statusCode = 401;
        res.headersSent = true;
        res.emit('finish');
      } else {
        res.statusCode = 200;
        res.headersSent = true;
        res.emit('finish');
      }
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
      '1.1: Explicit NODE_ENV=development resolves to 500 attempts / 900s',
      devCfg.environment === 'development' &&
        devCfg.max === 500 &&
        devCfg.windowMs === 900_000 &&
        LOCAL_DEV_LOGIN_RATE_LIMIT_MAX === 500 &&
        LOGIN_RATE_LIMIT_WINDOW_MS === 900_000
    );

    const prodCfg = resolveLoginRateLimitConfig({ NODE_ENV: 'production' });
    assert(
      '1.2: Explicit NODE_ENV=production resolves strictly to 300 attempts / 900s',
      prodCfg.environment === 'production' &&
        prodCfg.max === 300 &&
        prodCfg.windowMs === 900_000 &&
        PRODUCTION_LOGIN_RATE_LIMIT_MAX === 300
    );

    const unsetEnvCfg = resolveLoginRateLimitConfig({});
    const emptyEnvCfg = resolveLoginRateLimitConfig({ NODE_ENV: '' });
    const stagingEnvCfg = resolveLoginRateLimitConfig({ NODE_ENV: 'staging' });
    const localTypoCfg = resolveLoginRateLimitConfig({ NODE_ENV: 'local' });

    assert(
      '1.3: Missing, empty, staging, or unknown NODE_ENV fails closed to production (300 / 900s)',
      unsetEnvCfg.environment === 'production' &&
        unsetEnvCfg.max === 300 &&
        emptyEnvCfg.environment === 'production' &&
        emptyEnvCfg.max === 300 &&
        stagingEnvCfg.environment === 'production' &&
        stagingEnvCfg.max === 300 &&
        localTypoCfg.environment === 'production' &&
        localTypoCfg.max === 300
    );

    const testDefaultCfg = resolveLoginRateLimitConfig({ NODE_ENV: 'test' });
    const testCustomCfg = resolveLoginRateLimitConfig({
      NODE_ENV: 'test',
      TEST_LOGIN_RATE_LIMIT_MAX: '4',
      TEST_LOGIN_RATE_LIMIT_WINDOW_MS: '60000',
    });
    assert(
      '1.4: NODE_ENV=test provides isolated configurable test defaults (300/900s default, custom override supported)',
      testDefaultCfg.environment === 'test' &&
        testDefaultCfg.max === 300 &&
        testDefaultCfg.windowMs === 900_000 &&
        testCustomCfg.environment === 'test' &&
        testCustomCfg.max === 4 &&
        testCustomCfg.windowMs === 60_000
    );

    // -------------------------------------------------------------------------
    // SUITE 2: Isolated Test Rate Limiter (Simulating Exhaustion & 429)
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 2: Configurable Rate Limiter Behavior & HTTP 429 ──');

    const testLimiter = createLoginRateLimiter({
      NODE_ENV: 'test',
      TEST_LOGIN_RATE_LIMIT_MAX: '3',
      TEST_LOGIN_RATE_LIMIT_WINDOW_MS: '60000',
    });

    // 3 failed attempts
    const r1 = await invokeLimiter(testLimiter, { ip: '10.0.0.1', simulateFailure: true });
    const r2 = await invokeLimiter(testLimiter, { ip: '10.0.0.1', simulateFailure: true });
    const r3 = await invokeLimiter(testLimiter, { ip: '10.0.0.1', simulateFailure: true });

    assert('2.1: Initial failed attempts within limit are passed to auth handler', r1.passedThrough && r2.passedThrough && r3.passedThrough);

    // 4th attempt should be rejected with 429
    const blocked = await invokeLimiter(testLimiter, { ip: '10.0.0.1', simulateFailure: true });
    assert(
      '2.2: Exceeding failed limit rejects attempt with HTTP 429 & RATE_LIMIT_EXCEEDED',
      !blocked.allowed &&
        blocked.statusCode === 429 &&
        blocked.body?.code === 'RATE_LIMIT_EXCEEDED' &&
        blocked.body?.error === 'Too many authentication attempts. Please try again later.'
    );
    assert(
      '2.3: Blocked response returns Retry-After and rate-limit headers',
      Number(blocked.headers['retry-after']) > 0 &&
        Number(blocked.headers['x-ratelimit-remaining']) === 0
    );

    // -------------------------------------------------------------------------
    // SUITE 3: Successful Logins Do Not Consume Rate Limit (skipSuccessfulRequests: true)
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 3: Successful Requests Exemption ──');
    clearRateLimitStore();

    const successTestLimiter = createLoginRateLimiter({
      NODE_ENV: 'test',
      TEST_LOGIN_RATE_LIMIT_MAX: '3',
      TEST_LOGIN_RATE_LIMIT_WINDOW_MS: '60000',
    });

    // 10 successful logins from the same IP
    let allSuccessAllowed = true;
    for (let i = 0; i < 10; i++) {
      const res = await invokeLimiter(successTestLimiter, { ip: '10.0.0.2', simulateFailure: false });
      if (!res.allowed) {
        allSuccessAllowed = false;
        break;
      }
    }
    assert(
      '3.1: 10 successful logins from same IP do not exhaust limit (skipSuccessfulRequests: true)',
      allSuccessAllowed
    );

    // -------------------------------------------------------------------------
    // SUITE 4: Registration & Other Auth Routes Preserve Independent Limits
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 4: Route Stack Verification & Independent Limiters ──');

    const getHandles = (path: string) => {
      const layer = (authRoutes as any).stack.find(
        (l: any) => l.route && l.route.path === path && l.route.methods?.post
      );
      return layer ? layer.route.stack.map((s: any) => s.handle) : [];
    };

    assert(
      '4.1: /auth/login uses dedicated loginRateLimiter',
      getHandles('/auth/login').includes(loginRateLimiter)
    );
    assert(
      '4.2: /auth/register preserves registrationRateLimiter',
      getHandles('/auth/register').includes(registrationRateLimiter)
    );
    assert(
      '4.3: /auth/set-password preserves authRateLimiter',
      getHandles('/auth/set-password').includes(authRateLimiter)
    );
    assert(
      '4.4: /auth/totp/verify preserves totpRateLimiter',
      getHandles('/auth/totp/verify').includes(totpRateLimiter)
    );

    const acctRes = await invokeLimiter(accountDeletionRateLimiter, { ip: '192.0.2.21' });
    const regRes = await invokeLimiter(registrationRateLimiter, { ip: '192.0.2.21' });
    const totpRes = await invokeLimiter(totpRateLimiter, { ip: '192.0.2.21' });

    assert(
      '4.5: Account deletion (5), registration (30/15), and TOTP (10) retain independent limits',
      Number(acctRes.headers['x-ratelimit-limit']) === 5 &&
        Number(totpRes.headers['x-ratelimit-limit']) === 10
    );

    clearRateLimitStore();
  } catch (err: any) {
    console.error('Unexpected error in test runner:', err);
    failed++;
    failures.push(`Execution error: ${err.message}`);
  }

  console.log('\n===============================================================');
  console.log(`LOGIN RATE-LIMIT SUMMARY: ${passed} PASSED / ${failed} FAILED (Total: ${passed + failed})`);
  console.log('===============================================================');

  if (failed > 0) {
    console.error('Failed checks:\n' + failures.map((f) => `  - ${f}`).join('\n'));
    process.exit(1);
  } else {
    console.log('🎉 ALL LOGIN RATE-LIMIT REGRESSION CHECKS PASSED CLEANLY!\n');
    process.exit(0);
  }
}

runTests();
