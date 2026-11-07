/**
 * testRegistrationDiagnosis.ts
 * =========================================================
 * AIIMS Task T1: Registration Diagnosis & Fix Verification Suite
 *
 * Verifies:
 *  1. Valid registration returns HTTP 201 with mandatory Student track.
 *  2. Valid registration returns HTTP 201 with mandatory Entrepreneur track.
 *  3. Invalid institute ID (non-ObjectId) is discarded safely and registration still succeeds (HTTP 201).
 *  4. Missing track is rejected with HTTP 400, specific error code and clear message.
 *  5. Invalid track value is rejected with HTTP 400.
 *  6. Duplicate registration with an existing email returns specific error code EMAIL_ALREADY_EXISTS.
 *  7. Input validation errors return specific error code INVALID_INPUT / VALIDATION_ERROR.
 *  8. Registration rate limit operates independently of login rate limit.
 *
 * Usage:
 *  npx ts-node src/scripts/testRegistrationDiagnosis.ts
 */

import http from 'http';
import { AddressInfo } from 'net';
import { app } from '../server';
import { clearRateLimitStore } from '../middleware/rateLimit.middleware';
import { registeredUsers } from '../models/userStore';

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

function getValidPayload(
  email: string,
  track: 'Student' | 'Entrepreneur' = 'Student',
  instituteId?: string
) {
  return {
    name: 'Ananya Sharma',
    email,
    password: 'Password123!',
    confirmPassword: 'Password123!',
    track,
    instituteId: instituteId !== undefined ? instituteId : 'inst-custom-demo-college',
    instituteName: 'National Institute of Technology',
    stream: 'TECH',
    streamSubCategory: 'CS_IT',
    educationLevel: 'UNDERGRADUATE',
    programId: 'btech',
    programName: 'B.Tech Computer Science',
    specializationId: 'cs',
    specializationName: 'Computer Science',
    yearOfStudy: 3,
    admissionYear: 2023,
    expectedGraduationYear: 2027,
    aiFamiliarity: 'REGULAR_USER',
    aiUsageContexts: ['Coding', 'Workflow Design'],
    primaryGoal: track === 'Entrepreneur' ? 'ENTREPRENEURSHIP' : 'LEARN_AI',
  };
}

async function runRegistrationDiagnosisSuite() {
  console.log('===============================================================');
  console.log('📝 AIIMS T1: REGISTRATION DIAGNOSIS & TRACK FIX TEST SUITE');
  console.log('===============================================================\n');

  clearRateLimitStore();

  const testServer = http.createServer(app);
  await new Promise<void>((resolve) => testServer.listen(0, resolve));
  const testPort = (testServer.address() as AddressInfo).port;
  console.log(`  (Ephemeral test server listening on port ${testPort})\n`);

  try {
    // -------------------------------------------------------------------------
    // SUITE 1: Valid Registration & Mandatory Track Selection
    // -------------------------------------------------------------------------
    console.log('── SUITE 1: Valid Registration & Mandatory Track Selection ────');

    const studentEmail = `student_${Date.now()}@example.com`;
    const studentPayload = getValidPayload(studentEmail, 'Student');
    const studentRes = await makeRequest(testServer, {
      method: 'POST',
      path: '/api/auth/register',
      body: studentPayload,
    });

    assert(
      'Valid registration with Student track returns HTTP 201',
      studentRes.status === 201,
      `Status: ${studentRes.status}`
    );
    assert(
      'Registration response includes user object with track "Student"',
      studentRes.body?.user?.track === 'Student'
    );
    assert(
      'Registration response includes state with track "Student"',
      studentRes.body?.state?.academicProfile?.track === 'Student'
    );
    assert('Welcome grant credits credited (500 AC)', studentRes.body?.user?.aiimsCredits === 500);

    const entEmail = `entrepreneur_${Date.now()}@example.com`;
    const entPayload = getValidPayload(entEmail, 'Entrepreneur');
    const entRes = await makeRequest(testServer, {
      method: 'POST',
      path: '/api/auth/register',
      body: entPayload,
    });

    assert(
      'Valid registration with Entrepreneur track returns HTTP 201',
      entRes.status === 201,
      `Status: ${entRes.status}`
    );
    assert(
      'Registration response includes user object with track "Entrepreneur"',
      entRes.body?.user?.track === 'Entrepreneur'
    );
    assert(
      'Registration response includes state with track "Entrepreneur"',
      entRes.body?.state?.academicProfile?.track === 'Entrepreneur'
    );

    // -------------------------------------------------------------------------
    // SUITE 2: Invalid Institute ID Discard & Safe Continuity
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 2: Non-ObjectId Institute ID Discard & Continuity ────');

    const weirdInstituteIdEmail = `weird_inst_${Date.now()}@example.com`;
    const weirdInstPayload = getValidPayload(
      weirdInstituteIdEmail,
      'Student',
      'inst-random-string-not-an-objectid'
    );
    const weirdInstRes = await makeRequest(testServer, {
      method: 'POST',
      path: '/api/auth/register',
      body: weirdInstPayload,
    });

    assert(
      'Invalid / non-ObjectId instituteId does not crash and registration succeeds (HTTP 201)',
      weirdInstRes.status === 201,
      `Status: ${weirdInstRes.status}, Body: ${JSON.stringify(weirdInstRes.body)}`
    );

    const emptyInstituteIdEmail = `empty_inst_${Date.now()}@example.com`;
    const emptyInstPayload = getValidPayload(emptyInstituteIdEmail, 'Student', '');
    const emptyInstRes = await makeRequest(testServer, {
      method: 'POST',
      path: '/api/auth/register',
      body: emptyInstPayload,
    });

    assert(
      'Empty instituteId string registration succeeds (HTTP 201)',
      emptyInstRes.status === 201
    );

    // -------------------------------------------------------------------------
    // SUITE 3: Missing or Invalid Track Rejection
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 3: Missing & Invalid Track Rejection ─────────────────');

    const missingTrackPayload = getValidPayload(`notrack_${Date.now()}@example.com`);
    delete (missingTrackPayload as any).track;

    const missingTrackRes = await makeRequest(testServer, {
      method: 'POST',
      path: '/api/auth/register',
      body: missingTrackPayload,
    });

    assert(
      'Registration missing track is rejected with HTTP 400',
      missingTrackRes.status === 400,
      `Status: ${missingTrackRes.status}`
    );
    assert(
      'Missing track response contains specific validation error message',
      String(missingTrackRes.body?.error || '')
        .toLowerCase()
        .includes('track') || missingTrackRes.body?.field === 'track'
    );
    assert(
      'Missing track response has code INVALID_INPUT or VALIDATION_ERROR',
      missingTrackRes.body?.code === 'INVALID_INPUT' ||
        missingTrackRes.body?.code === 'VALIDATION_ERROR'
    );

    const invalidTrackPayload = getValidPayload(`badtrack_${Date.now()}@example.com`);
    (invalidTrackPayload as any).track = 'Cosmonaut';

    const invalidTrackRes = await makeRequest(testServer, {
      method: 'POST',
      path: '/api/auth/register',
      body: invalidTrackPayload,
    });

    assert(
      'Registration with invalid track value is rejected with HTTP 400',
      invalidTrackRes.status === 400
    );

    // -------------------------------------------------------------------------
    // SUITE 4: Duplicate Email & Specific Error Return Codes
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 4: Duplicate Email & Specific Error Codes ─────────────');

    const duplicateEmail = `duplicate_${Date.now()}@example.com`;
    const firstReg = await makeRequest(testServer, {
      method: 'POST',
      path: '/api/auth/register',
      body: getValidPayload(duplicateEmail, 'Student'),
    });
    assert('First registration with new email succeeds (HTTP 201)', firstReg.status === 201);

    const secondReg = await makeRequest(testServer, {
      method: 'POST',
      path: '/api/auth/register',
      body: getValidPayload(duplicateEmail, 'Student'),
    });

    assert(
      'Second registration with existing email is rejected (HTTP 400)',
      secondReg.status === 400
    );
    assert(
      'Duplicate email response code is EMAIL_ALREADY_EXISTS',
      secondReg.body?.code === 'EMAIL_ALREADY_EXISTS'
    );
    assert(
      'Duplicate email response message clearly instructs user to sign in',
      secondReg.body?.error === 'An account with this email already exists. Please sign in.'
    );

    // -------------------------------------------------------------------------
    // SUITE 5: Independent Registration Rate Limiting
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 5: Independent Registration & Login Rate Limiting ────');

    clearRateLimitStore();

    // 5A: Exhaust login rate limit (15 attempts)
    console.log('  (Simulating 15 failed login attempts)...');
    for (let i = 0; i < 15; i++) {
      await makeRequest(testServer, {
        method: 'POST',
        path: '/api/auth/login',
        body: { email: 'wrong@example.com', password: 'wrong' },
      });
    }

    const exhaustedLoginRes = await makeRequest(testServer, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'wrong@example.com', password: 'wrong' },
    });
    assert('16th login attempt is rate limited with HTTP 429', exhaustedLoginRes.status === 429);
    assert(
      'Login rate limit code is RATE_LIMIT_EXCEEDED',
      exhaustedLoginRes.body?.code === 'RATE_LIMIT_EXCEEDED'
    );

    // 5B: Verify registration route is NOT blocked when login rate limit is exhausted
    const postLoginExhaustionEmail = `unblocked_reg_${Date.now()}@example.com`;
    const unblockedRegRes = await makeRequest(testServer, {
      method: 'POST',
      path: '/api/auth/register',
      body: getValidPayload(postLoginExhaustionEmail, 'Student'),
    });

    assert(
      'Registration succeeds (HTTP 201) even after login rate limiter is completely exhausted',
      unblockedRegRes.status === 201,
      `Status: ${unblockedRegRes.status}, Body: ${JSON.stringify(unblockedRegRes.body)}`
    );

    // 5C: Exhaust dedicated registration rate limiter (15 requests)
    clearRateLimitStore();
    console.log('  (Simulating exhaustion of 15 registration rate limit slots)...');
    for (let i = 0; i < 15; i++) {
      await makeRequest(testServer, {
        method: 'POST',
        path: '/api/auth/register',
        body: getValidPayload(`ratelimit_${i}_${Date.now()}@example.com`, 'Student'),
      });
    }

    const exhaustedRegRes = await makeRequest(testServer, {
      method: 'POST',
      path: '/api/auth/register',
      body: getValidPayload(`ratelimit_exceeded_${Date.now()}@example.com`, 'Student'),
    });

    assert(
      '16th registration attempt triggers HTTP 429 Too Many Requests',
      exhaustedRegRes.status === 429
    );
    assert(
      'Registration rate limit code is RATE_LIMIT_EXCEEDED',
      exhaustedRegRes.body?.code === 'RATE_LIMIT_EXCEEDED'
    );
    assert(
      'Registration rate limit includes Retry-After header',
      Boolean(exhaustedRegRes.headers['retry-after'])
    );

    clearRateLimitStore();
  } finally {
    await new Promise<void>((resolve) => testServer.close(() => resolve()));
  }

  console.log('\n===============================================================');
  console.log(`TEST RESULTS: ${passed} PASSED / ${failed} FAILED (Total: ${passed + failed})`);
  console.log('===============================================================');

  if (failed > 0) {
    console.error('Failed checks:');
    failures.forEach((f) => console.error(` - ${f}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL T1 REGISTRATION CHECKS PASSED CLEANLY!\n');
    process.exit(0);
  }
}

runRegistrationDiagnosisSuite().catch((err) => {
  console.error('Fatal test runner exception:', err);
  process.exit(1);
});
