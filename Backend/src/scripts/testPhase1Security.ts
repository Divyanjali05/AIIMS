/**
 * testPhase1Security.ts
 * =========================================================
 * AIIMS Phase 1: Security Audit & Remediation Verification Suite
 *
 * Verifies:
 *  1. JWT configuration (safe failure on missing/weak/default secrets in prod, dev fallback).
 *  2. CORS origin filtering (allowed origins succeed, unauthorized origins rejected with 403, preflight handling).
 *  3. Helmet security headers (nosniff, frameguard, CORP cross-origin).
 *  4. Auth rate limiting on /auth/login and /auth/register (429, headers, non-auth unaffected).
 *  5. Database connection lifecycle (bounded timeout, safe non-crashing dev fallback, health endpoint).
 *  6. Normal authentication and application request continuity.
 *
 * Usage:
 *  npx ts-node src/scripts/testPhase1Security.ts
 */

import http from 'http';
import { AddressInfo } from 'net';
import { app, initDatabase } from '../server';
import { getValidatedJwtSecret, config } from '../config/env';
import { clearRateLimitStore } from '../middleware/rateLimit.middleware';

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

// Helper to send HTTP requests to an active test server
function makeRequest(
  server: http.Server,
  options: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: any;
  }
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any; rawBody: string }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as AddressInfo;
    const postData = options.body ? JSON.stringify(options.body) : undefined;

    const reqHeaders: Record<string, string> = {
      ...(options.headers || {}),
    };
    if (postData) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: addr.port,
        path: options.path,
        method: options.method,
        headers: reqHeaders,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let parsed: any;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: parsed,
            rawBody: raw,
          });
        });
      }
    );

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runSecuritySuite() {
  console.log('===============================================================');
  console.log('🛡️  AIIMS PHASE 1 SECURITY AUDIT & REMEDIATION TEST SUITE');
  console.log('===============================================================\n');

  // ---------------------------------------------------------------------------
  // 1. JWT Configuration & Startup Safeguards
  // ---------------------------------------------------------------------------
  console.log('── SUITE 1: JWT Secret Configuration & Production Guards ───────');

  const origEnv = process.env.NODE_ENV;
  const origSecret = process.env.JWT_SECRET;

  try {
    // 1A: In production, missing JWT_SECRET throws fatal error
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    let thrownMissing = false;
    try {
      getValidatedJwtSecret();
    } catch (e: any) {
      thrownMissing = true;
      assert(
        'Production fails fast if JWT_SECRET is missing',
        e.message.includes('FATAL: JWT_SECRET environment variable is missing')
      );
    }
    if (!thrownMissing) {
      assert(
        'Production fails fast if JWT_SECRET is missing',
        false,
        'Expected fatal error not thrown'
      );
    }

    // 1B: In production, hardcoded default placeholder throws fatal error
    process.env.JWT_SECRET = 'aiims-secret-key-2026';
    let thrownDefault = false;
    try {
      getValidatedJwtSecret();
    } catch (e: any) {
      thrownDefault = true;
      assert(
        'Production rejects hardcoded default placeholder "aiims-secret-key-2026"',
        e.message.includes('FATAL: Insecure JWT_SECRET detected')
      );
    }
    if (!thrownDefault) {
      assert(
        'Production rejects hardcoded default placeholder',
        false,
        'Expected fatal error not thrown'
      );
    }

    // 1C: In production, short secret (<32 chars) throws fatal error
    process.env.JWT_SECRET = 'short-secret-under-32-chars';
    let thrownShort = false;
    try {
      getValidatedJwtSecret();
    } catch (e: any) {
      thrownShort = true;
      assert(
        'Production rejects secrets shorter than 32 characters',
        e.message.includes('FATAL: Insecure JWT_SECRET detected')
      );
    }
    if (!thrownShort) {
      assert('Production rejects short secrets', false, 'Expected fatal error not thrown');
    }

    // 1D: In production, valid 32+ character strong secret succeeds
    process.env.JWT_SECRET = 'strong-production-signing-secret-with-high-entropy-64bytes!';
    const prodValidSecret = getValidatedJwtSecret();
    assert(
      'Production accepts strong 32+ character secret',
      prodValidSecret === 'strong-production-signing-secret-with-high-entropy-64bytes!'
    );

    // 1E: In development mode, missing secret provides safe fallback without crashing
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;
    const devFallbackSecret = getValidatedJwtSecret();
    assert(
      'Development mode safely provides development fallback without crashing',
      typeof devFallbackSecret === 'string' && devFallbackSecret.length >= 32
    );
  } finally {
    process.env.NODE_ENV = origEnv;
    if (origSecret !== undefined) {
      process.env.JWT_SECRET = origSecret;
    } else {
      delete process.env.JWT_SECRET;
    }
  }

  // ---------------------------------------------------------------------------
  // Start ephemeral server for HTTP tests
  // ---------------------------------------------------------------------------
  const testServer = http.createServer(app);
  await new Promise<void>((resolve) => testServer.listen(0, resolve));
  const testPort = (testServer.address() as AddressInfo).port;
  console.log(`\n  (Ephemeral test server listening on port ${testPort})\n`);

  try {
    // ---------------------------------------------------------------------------
    // 2. CORS Policy & Origin Allowlist
    // ---------------------------------------------------------------------------
    console.log('── SUITE 2: CORS Origin Allowlist & Preflight Controls ─────────');

    // 2A: Allowed origin (http://localhost:3000) is accepted
    const allowedRes = await makeRequest(testServer, {
      method: 'GET',
      path: '/health',
      headers: {
        Origin: 'http://localhost:3000',
      },
    });
    assert('Allowed origin (http://localhost:3000) receives 200 OK', allowedRes.status === 200);
    assert(
      'Allowed origin receives Access-Control-Allow-Origin matching origin',
      allowedRes.headers['access-control-allow-origin'] === 'http://localhost:3000'
    );
    assert(
      'CORS credentials enabled for allowed origin',
      allowedRes.headers['access-control-allow-credentials'] === 'true'
    );

    // 2B: Unauthorized origin (http://evil-attacker-site.com) is rejected with 403
    const blockedRes = await makeRequest(testServer, {
      method: 'GET',
      path: '/health',
      headers: {
        Origin: 'http://evil-attacker-site.com',
      },
    });
    assert(
      'Unauthorized origin (http://evil-attacker-site.com) is rejected with HTTP 403 Forbidden',
      blockedRes.status === 403
    );
    assert(
      'Blocked CORS response returns safe error code CORS_FORBIDDEN',
      blockedRes.body?.code === 'CORS_FORBIDDEN'
    );

    // 2C: Preflight OPTIONS request from allowed origin returns 204
    const preflightRes = await makeRequest(testServer, {
      method: 'OPTIONS',
      path: '/api/auth/login',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization',
      },
    });
    assert(
      'Preflight OPTIONS from allowed origin returns HTTP 204 No Content',
      preflightRes.status === 204
    );
    assert(
      'Preflight responds with allowed methods',
      Boolean(preflightRes.headers['access-control-allow-methods']?.includes('POST'))
    );

    // 2D: Requests without origin (server-to-server, curl, mobile) succeed
    const noOriginRes = await makeRequest(testServer, {
      method: 'GET',
      path: '/health',
    });
    assert(
      'Direct server-to-server / curl request without Origin succeeds',
      noOriginRes.status === 200
    );

    // ---------------------------------------------------------------------------
    // 3. Security Headers (Helmet)
    // ---------------------------------------------------------------------------
    console.log('\n── SUITE 3: Helmet Security Headers ────────────────────────────');

    const headerRes = await makeRequest(testServer, {
      method: 'GET',
      path: '/health',
    });
    assert(
      'X-Content-Type-Options: nosniff header is present',
      headerRes.headers['x-content-type-options'] === 'nosniff'
    );
    assert(
      'X-Frame-Options: SAMEORIGIN header is present',
      headerRes.headers['x-frame-options'] === 'SAMEORIGIN'
    );
    assert(
      'Cross-Origin-Resource-Policy: cross-origin is set for compatibility',
      headerRes.headers['cross-origin-resource-policy'] === 'cross-origin'
    );
    assert(
      'X-Download-Options: noopen header is present',
      headerRes.headers['x-download-options'] === 'noopen'
    );

    // ---------------------------------------------------------------------------
    // 4. Authentication Rate Limiting
    // ---------------------------------------------------------------------------
    console.log('\n── SUITE 4: Authentication Rate Limiting ───────────────────────');
    clearRateLimitStore();

    // Check rate limit headers on initial call
    const firstLogin = await makeRequest(testServer, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'invalid@example.com', password: 'wrong' },
    });
    assert(
      'Auth route includes X-RateLimit-Limit header',
      firstLogin.headers['x-ratelimit-limit'] !== undefined
    );
    assert(
      'Auth route includes X-RateLimit-Remaining header',
      firstLogin.headers['x-ratelimit-remaining'] !== undefined
    );

    // Exceed rate limit by triggering requests up to limit
    const limit = config.authRateLimitMax;
    console.log(`  (Testing exhaustion of ${limit} auth limit slots)...`);
    for (let i = 0; i < limit - 1; i++) {
      await makeRequest(testServer, {
        method: 'POST',
        path: '/api/auth/login',
        body: { email: 'spam@example.com', password: 'wrong' },
      });
    }

    // Next request should trigger HTTP 429
    const limitedRes = await makeRequest(testServer, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'spam@example.com', password: 'wrong' },
    });
    assert('Exceeded login requests trigger HTTP 429 Too Many Requests', limitedRes.status === 429);
    assert(
      'Rate limit response contains RATE_LIMIT_EXCEEDED code',
      limitedRes.body?.code === 'RATE_LIMIT_EXCEEDED'
    );
    assert(
      'Rate limit response includes Retry-After header',
      limitedRes.headers['retry-after'] !== undefined
    );
    assert(
      'Rate limit error message does not disclose account existence',
      limitedRes.body?.error === 'Too many authentication attempts. Please try again later.'
    );

    // Non-auth route is NOT affected by auth rate limit
    const nonAuthRes = await makeRequest(testServer, {
      method: 'GET',
      path: '/health',
    });
    assert(
      'Non-auth routes (/health) remain unblocked when auth rate limit is exhausted',
      nonAuthRes.status === 200
    );

    // Clear rate limits for clean subsequent tests
    clearRateLimitStore();

    // ---------------------------------------------------------------------------
    // 5. Database Connection Lifecycle & Health Reporting
    // ---------------------------------------------------------------------------
    console.log('\n── SUITE 5: Database Connection Lifecycle & Health Status ──────');

    const healthRes = await makeRequest(testServer, {
      method: 'GET',
      path: '/api/health',
    });
    assert('API Health check returns HTTP 200', healthRes.status === 200);
    assert(
      'Health check exposes structured database status object',
      typeof healthRes.body?.database === 'object' && healthRes.body?.database !== null
    );
    assert(
      'Health check identifies database mode ("mongodb" or "fallback")',
      ['mongodb', 'fallback'].includes(healthRes.body?.database?.mode)
    );

    // Test bounded retry with invalid URI in development
    const origMongo = config.mongodbUri;
    try {
      config.mongodbUri = 'mongodb://127.0.0.1:27019/nonexistent';
      const start = Date.now();
      const testDbStatus = await initDatabase(1, 1000); // 1 retry, 1s timeout
      const elapsed = Date.now() - start;
      assert('Database connection failure resolves boundedly without hanging', elapsed < 3000);
      assert(
        'Database connection failure falls back safely in development mode',
        testDbStatus.connected === false && testDbStatus.mode === 'fallback'
      );
    } finally {
      config.mongodbUri = origMongo;
    }

    // ---------------------------------------------------------------------------
    // 6. Normal Authentication & Core Request Integrity
    // ---------------------------------------------------------------------------
    // 6. Normal Authentication & Protected Routes Continuity
    // ---------------------------------------------------------------------------
    console.log('\n── SUITE 6: Normal Authentication & Protected Routes Continuity ');

    // 6A: Web client login succeeds, sets httpOnly cookie, and omits token from JSON body
    const webLogin = await makeRequest(testServer, {
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: 'alex.ai@example.com',
        password: 'password123',
      },
    });
    assert('Valid web login returns HTTP 200 OK', webLogin.status === 200);
    assert(
      'Web login sets httpOnly cookie aiims_token',
      Boolean(
        webLogin.headers['set-cookie']?.some(
          (c) => c.includes('aiims_token=') && c.toLowerCase().includes('httponly')
        )
      )
    );
    assert('Web login omits token from JSON body', webLogin.body?.token === undefined);
    assert(
      'Valid login returns user profile',
      webLogin.body?.user?.email === 'alex.ai@example.com'
    );

    // Extract cookie value for subsequent requests
    const cookieHeader = webLogin.headers['set-cookie']?.find((c) => c.includes('aiims_token='));
    const tokenCookie = cookieHeader ? cookieHeader.split(';')[0] : '';

    // 6B: Mobile client login with X-Client: mobile returns token in JSON body
    const mobileLogin = await makeRequest(testServer, {
      method: 'POST',
      path: '/api/auth/login',
      headers: {
        'x-client': 'mobile',
      },
      body: {
        email: 'alex.ai@example.com',
        password: 'password123',
      },
    });
    assert('Mobile login returns HTTP 200 OK', mobileLogin.status === 200);
    assert(
      'Mobile login returns signed JWT token in JSON body',
      typeof mobileLogin.body?.token === 'string' && mobileLogin.body.token.length > 20
    );
    const mobileToken = mobileLogin.body?.token;

    // 6C: Invalid password returns HTTP 401
    const invalidPwRes = await makeRequest(testServer, {
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: 'alex.ai@example.com',
        password: 'definitely-wrong-password',
      },
    });
    assert('Invalid login password returns HTTP 401 Unauthorized', invalidPwRes.status === 401);

    // 6D: Authenticated request using cookie succeeds
    const cookieProfileRes = await makeRequest(testServer, {
      method: 'GET',
      path: '/api/users/profile',
      headers: {
        Cookie: tokenCookie,
      },
    });
    assert(
      'Cookie-authenticated request to /api/users/profile returns HTTP 200 OK',
      cookieProfileRes.status === 200
    );
    assert(
      'Cookie-authenticated profile matches user',
      cookieProfileRes.body?.email === 'alex.ai@example.com'
    );

    // 6E: Authenticated request using Bearer token (mobile client) succeeds
    const bearerProfileRes = await makeRequest(testServer, {
      method: 'GET',
      path: '/api/users/profile',
      headers: {
        Authorization: `Bearer ${mobileToken}`,
      },
    });
    assert(
      'Bearer-authenticated request to /api/users/profile returns HTTP 200 OK',
      bearerProfileRes.status === 200
    );
    assert(
      'Bearer-authenticated profile matches user',
      bearerProfileRes.body?.email === 'alex.ai@example.com'
    );

    // 6F: CSRF protection: cookie-authenticated mutation with invalid Origin fails with HTTP 403
    const csrfFailRes = await makeRequest(testServer, {
      method: 'PUT',
      path: '/api/users/profile',
      headers: {
        Cookie: tokenCookie,
        Origin: 'https://evil-hacker.com',
      },
      body: { name: 'Hacked Name' },
    });
    assert(
      'Cookie mutation with disallowed Origin is rejected with HTTP 403',
      csrfFailRes.status === 403
    );

    // 6G: CSRF protection: cookie-authenticated mutation with allowed Origin succeeds
    const csrfPassRes = await makeRequest(testServer, {
      method: 'PUT',
      path: '/api/users/profile',
      headers: {
        Cookie: tokenCookie,
        Origin: 'http://localhost:3000',
      },
      body: { name: 'Alex AI Updated' },
    });
    assert(
      'Cookie mutation with allowed Origin succeeds with HTTP 200',
      csrfPassRes.status === 200
    );

    // 6H: Logout clears the aiims_token cookie
    const logoutRes = await makeRequest(testServer, {
      method: 'POST',
      path: '/api/auth/logout',
    });
    assert('Logout returns HTTP 200 OK', logoutRes.status === 200);
    assert(
      'Logout clears aiims_token cookie',
      Boolean(
        logoutRes.headers['set-cookie']?.some(
          (c) => c.includes('aiims_token=;') || c.includes('aiims_token=')
        )
      )
    );

    // 6I: Unauthenticated request to protected route is rejected
    const unauthRes = await makeRequest(testServer, {
      method: 'GET',
      path: '/api/users/profile',
    });
    assert(
      'Unauthenticated request to /api/users/profile is rejected with HTTP 401',
      unauthRes.status === 401
    );

    // -------------------------------------------------------------------------
    // SUITE 7: Server-Side Feature Lock Enforcement (HTTP 403 Refusal)
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 7: Server-Side Feature Lock Enforcement (HTTP 403 Refusal) ──');

    // 7A: Direct invocation of locked Investigation API is refused with HTTP 403
    const lockedInvestigationRes = await makeRequest(testServer, {
      method: 'POST',
      path: '/api/investigations/submit',
      headers: {
        Authorization: `Bearer ${mobileToken}`,
      },
      body: {
        signalId: 'sig-rag-memory-2026',
        personalInterpretation: 'Direct call from locked client',
      },
    });
    assert(
      'Locked user calling /api/investigations/submit directly is refused with HTTP 403',
      lockedInvestigationRes.status === 403
    );
    assert(
      'Investigation lock refusal includes FEATURE_LOCKED code and clear explanation',
      lockedInvestigationRes.body?.code === 'FEATURE_LOCKED' &&
        Boolean(lockedInvestigationRes.body?.error)
    );

    // 7B: Direct invocation of locked Relevance API is refused with HTTP 403
    const lockedRelevanceRes = await makeRequest(testServer, {
      method: 'POST',
      path: '/api/relevance/generate',
      headers: {
        Authorization: `Bearer ${mobileToken}`,
      },
      body: {
        signalId: 'sig-rag-memory-2026',
      },
    });
    assert(
      'Locked user calling /api/relevance/generate directly is refused with HTTP 403',
      lockedRelevanceRes.status === 403
    );
    assert(
      'Relevance lock refusal includes FEATURE_LOCKED code',
      lockedRelevanceRes.body?.code === 'FEATURE_LOCKED'
    );

    // 7C: Direct invocation of locked Mentor API is refused with HTTP 403
    const lockedMentorRes = await makeRequest(testServer, {
      method: 'POST',
      path: '/api/ai/mentor',
      headers: {
        Authorization: `Bearer ${mobileToken}`,
      },
      body: {
        stage: 'Knowing',
      },
    });
    assert(
      'Locked user calling /api/ai/mentor directly is refused with HTTP 403',
      lockedMentorRes.status === 403
    );
    assert(
      'Mentor lock refusal includes FEATURE_LOCKED code',
      lockedMentorRes.body?.code === 'FEATURE_LOCKED'
    );
  } finally {
    testServer.close();
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`TEST RESULTS: ${passed} PASSED / ${failed} FAILED (Total: ${passed + failed})`);
  console.log('===============================================================');

  if (failed > 0) {
    console.error('Failed test names:');
    failures.forEach((f) => console.error(` - ${f}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL SECURITY & REMEDIATION TESTS PASSED CLEANLY!\n');
    process.exit(0);
  }
}

runSecuritySuite().catch((err) => {
  console.error('Fatal test runner exception:', err);
  process.exit(1);
});
