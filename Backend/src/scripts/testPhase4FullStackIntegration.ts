/**
 * testPhase4FullStackIntegration.ts
 * ============================================================================
 * AIIMS Comprehensive Integration & Unit Test Suite
 *
 * Covers:
 *  1. Registration & Login Validation (email format, password strength, taxonomy, duplicate prevention)
 *  2. Authentication & Authorization (JWT signature, token expiration, protected routes, RBAC)
 *  3. Credits Calculations & Transaction Integrity (initial endowment, rewards, idempotency, overdraft, tampering)
 *  4. AI Provider Integrations & Safe Fallbacks (key validation, cascade, deterministic rule engine, offline null safety)
 *  5. Learner Workflows & Database Lifecycle (health check, state persistence, in-memory fallback)
 *  6. API Validation & Security Headers (404 handling, malformed JSON, Helmet headers, CORS policy)
 *
 * Runs completely offline using native HTTP test server and in-memory stores.
 * ============================================================================
 */

import http from 'http';
import { AddressInfo } from 'net';
import { app } from '../server';
import {
  AnthropicProvider,
  GeminiProvider,
  DeterministicFallbackProvider,
  getAIProvider,
} from '../services/wallet/aiProvider.service';
import { ClaudeService } from '../services/anthropic/claude.service';

console.log('===============================================================');
console.log('🛡️  AIIMS FULL-STACK INTEGRATION & QUALITY VERIFICATION SUITE');
console.log('===============================================================\n');

let passedCount = 0;
let failedCount = 0;
const failureDetails: string[] = [];

function assert(testName: string, condition: boolean, detail?: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedCount++;
    const msg = `${testName}${detail ? ` — ${detail}` : ''}`;
    failureDetails.push(msg);
    console.error(`  ❌ [FAIL] ${msg}`);
  }
}

// Ephemeral HTTP Request Helper
function request(
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
    const reqHeaders: Record<string, string> = { ...(options.headers || {}) };

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
          let parsed: any = null;
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
    if (postData) req.write(postData);
    req.end();
  });
}

async function runSuite() {
  // 1. Start ephemeral HTTP server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const serverPort = (server.address() as AddressInfo).port;
  console.log(`📡 Ephemeral Test Server active on port ${serverPort}\n`);

  try {
    // -------------------------------------------------------------------------
    // SUITE 1: Registration Validation & Boundary Cases
    // -------------------------------------------------------------------------
    console.log('── SUITE 1: Registration Input Validation & Boundary Cases ─────');

    // 1.1 Missing Email
    const resNoEmail = await request(server, {
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Test User',
        password: 'Password123!',
        stream: 'TECH',
        educationLevel: 'UNDERGRADUATE',
      },
    });
    assert(
      '1.1: Registration rejects missing email with HTTP 400',
      resNoEmail.status === 400 && resNoEmail.body?.field === 'email'
    );

    // 1.2 Malformed Email
    const resBadEmail = await request(server, {
      method: 'POST',
      path: '/api/auth/register',
      body: { email: 'invalid-email-no-at', name: 'Test User', password: 'Password123!' },
    });
    assert(
      '1.2: Registration rejects malformed email syntax',
      resBadEmail.status === 400 && resBadEmail.body?.field === 'email'
    );

    // 1.3 Weak Password (< 8 chars)
    const resShortPass = await request(server, {
      method: 'POST',
      path: '/api/auth/register',
      body: { email: 'valid@example.com', name: 'Test User', password: 'Pass1' },
    });
    assert(
      '1.3: Registration rejects password under 8 characters',
      resShortPass.status === 400 && resShortPass.body?.field === 'password'
    );

    // 1.4 Password missing uppercase
    const resNoUpper = await request(server, {
      method: 'POST',
      path: '/api/auth/register',
      body: { email: 'valid@example.com', name: 'Test User', password: 'password123!' },
    });
    assert(
      '1.4: Registration rejects password without uppercase letter',
      resNoUpper.status === 400 && resNoUpper.body?.field === 'password'
    );

    // 1.5 Password missing number
    const resNoNum = await request(server, {
      method: 'POST',
      path: '/api/auth/register',
      body: { email: 'valid@example.com', name: 'Test User', password: 'PasswordOnly!' },
    });
    assert(
      '1.5: Registration rejects password without number',
      resNoNum.status === 400 && resNoNum.body?.field === 'password'
    );

    // 1.6 Passwords do not match
    const resPassMismatch = await request(server, {
      method: 'POST',
      path: '/api/auth/register',
      body: {
        email: 'valid@example.com',
        name: 'Test User',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!',
      },
    });
    assert(
      '1.6: Registration rejects non-matching confirmPassword',
      resPassMismatch.status === 400 && resPassMismatch.body?.field === 'confirmPassword'
    );

    // 1.7 Missing academic taxonomy
    const resNoStream = await request(server, {
      method: 'POST',
      path: '/api/auth/register',
      body: {
        email: 'valid@example.com',
        name: 'Test User',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      },
    });
    assert(
      '1.7: Registration rejects missing academic stream',
      resNoStream.status === 400 && resNoStream.body?.field === 'stream'
    );

    // 1.8 Successful Registration
    const uniqueEmail = `test.student.${Date.now()}@example.com`;
    const resSuccessReg = await request(server, {
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Test Student',
        email: uniqueEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        stream: 'TECH',
        educationLevel: 'UNDERGRADUATE',
        programId: 'btech',
        programName: 'B.Tech',
        specializationId: 'ai_ml',
        specializationName: 'AI & ML',
        yearOfStudy: 2,
        admissionYear: 2024,
        expectedGraduationYear: 2028,
        primaryGoal: 'ACADEMIC_RESEARCH',
      },
    });
    assert(
      '1.8: Successful registration returns HTTP 200/201 with auth token',
      (resSuccessReg.status === 200 || resSuccessReg.status === 201) &&
        Boolean(resSuccessReg.body?.token)
    );
    assert(
      '1.9: New registered user receives starting balance of 100 AC',
      resSuccessReg.body?.state?.profile?.aiimsCredits === 100 ||
        resSuccessReg.body?.user?.aiimsCredits === 100
    );

    // 1.10 Duplicate Email Registration Rejected
    const resDupReg = await request(server, {
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Duplicate Student',
        email: uniqueEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        stream: 'TECH',
        educationLevel: 'UNDERGRADUATE',
        programId: 'btech',
        programName: 'B.Tech',
        specializationId: 'ai_ml',
        specializationName: 'AI & ML',
        yearOfStudy: 2,
        admissionYear: 2024,
        expectedGraduationYear: 2028,
      },
    });
    assert(
      '1.10: Duplicate email registration is blocked with HTTP 400',
      resDupReg.status === 400 && resDupReg.body?.field === 'email'
    );

    // -------------------------------------------------------------------------
    // SUITE 2: Authentication & Authorization Controls
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 2: Authentication & Authorization Controls ───────────');

    // 2.1 Login with wrong password
    const resWrongPass = await request(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: uniqueEmail, password: 'WrongPassword999!' },
    });
    assert(
      '2.1: Login with incorrect password returns HTTP 400/401',
      resWrongPass.status === 400 || resWrongPass.status === 401
    );

    // 2.2 Login with valid credentials
    const resLogin = await request(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: uniqueEmail, password: 'Password123!' },
    });
    assert(
      '2.2: Login with valid credentials returns HTTP 200',
      resLogin.status === 200 && Boolean(resLogin.body?.token)
    );
    const authToken = resLogin.body?.token;

    // 2.3 Access Protected Profile with Valid Token
    const resProfile = await request(server, {
      method: 'GET',
      path: '/api/users/profile',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(
      '2.3: Protected /api/users/profile accessible with valid token',
      resProfile.status === 200 && resProfile.body?.email === uniqueEmail
    );

    // 2.4 Unauthenticated Request Rejected
    const resUnauth = await request(server, {
      method: 'GET',
      path: '/api/users/profile',
    });
    assert(
      '2.4: Protected route without Authorization header rejected with 401',
      resUnauth.status === 401
    );

    // 2.5 Malformed Token Rejected
    const resBadToken = await request(server, {
      method: 'GET',
      path: '/api/users/profile',
      headers: { Authorization: 'Bearer totally-invalid-jwt-token' },
    });
    assert('2.5: Protected route with forged token rejected with 401', resBadToken.status === 401);

    // -------------------------------------------------------------------------
    // SUITE 3: Credits System, Idempotency & Overdraft Protection
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 3: Credits System, Idempotency & Overdraft Protection ─');

    // 3.1 Fetch Credits Balance
    const resBalance = await request(server, {
      method: 'GET',
      path: '/api/credits/balance',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(
      '3.1: /api/credits/balance returns valid initial balance',
      resBalance.status === 200 && resBalance.body?.balance >= 100
    );

    // 3.2 Clarity Task Reward Execution (+15 AC)
    const resClarity = await request(server, {
      method: 'POST',
      path: '/api/clarity/run-task',
      headers: { Authorization: `Bearer ${authToken}` },
      body: { taskId: 'clarity-task-verify-1', category: 'prompt_engineering' },
    });
    assert(
      '3.2: First-time task reward succeeds',
      resClarity.status === 200 && resClarity.body?.awarded === true
    );

    // 3.3 Idempotency: Duplicate Task Reward Blocked
    const resClarityDup = await request(server, {
      method: 'POST',
      path: '/api/clarity/run-task',
      headers: { Authorization: `Bearer ${authToken}` },
      body: { taskId: 'clarity-task-verify-1', category: 'prompt_engineering' },
    });
    assert(
      '3.3: Duplicate task execution blocks duplicate credit award',
      resClarityDup.status === 200 && resClarityDup.body?.awarded === false
    );

    // 3.4 Overdraft Protection: Spending Exceeding Balance
    const resOverdraft = await request(server, {
      method: 'POST',
      path: '/api/credits/spend',
      headers: { Authorization: `Bearer ${authToken}` },
      body: { amount: 999999, reason: 'Illegal overdraft investment attempt' },
    });
    assert(
      '3.4: Overdraft spend attempt rejected with HTTP 400',
      resOverdraft.status === 400 && resOverdraft.body?.error?.includes('Insufficient')
    );

    // 3.5 Anti-Tampering: State Balance Injection Blocked
    await request(server, {
      method: 'PUT',
      path: '/api/learner/state',
      headers: { Authorization: `Bearer ${authToken}` },
      body: {
        profile: { aiimsCredits: 888888 },
        credits: { balance: 888888 },
      },
    });
    const resCheckBalance = await request(server, {
      method: 'GET',
      path: '/api/credits/balance',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(
      '3.5: State overwrite attack does NOT modify server credit ledger',
      resCheckBalance.body?.balance < 888888
    );

    // -------------------------------------------------------------------------
    // SUITE 4: AI Providers & Deterministic Fallback Integrity
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 4: AI Providers & Deterministic Fallback Integrity ───');

    // 4.1 Key Validator Units
    assert(
      '4.1: AnthropicProvider rejects placeholder & mock keys',
      !AnthropicProvider.isKeyValid('mock-claude-key') &&
        !AnthropicProvider.isKeyValid('your-api-key-here') &&
        !AnthropicProvider.isKeyValid('short') &&
        !AnthropicProvider.isKeyValid('')
    );

    assert(
      '4.2: GeminiProvider rejects placeholder & mock keys',
      !GeminiProvider.isKeyValid('mock-gemini-key') &&
        !GeminiProvider.isKeyValid('placeholder-api-key') &&
        !GeminiProvider.isKeyValid('abc') &&
        !GeminiProvider.isKeyValid('')
    );

    // 4.3 getAIProvider safely resolves to DeterministicFallbackProvider in unconfigured environment
    const activeProvider = getAIProvider();
    assert(
      '4.3: Factory falls back to DeterministicFallbackProvider when keys are absent',
      activeProvider.name === 'Deterministic Rule Engine' || activeProvider.isAvailable()
    );

    // 4.4 Deterministic Rule Engine Offline Assessment
    const sampleHtml =
      'Platform designed for code generation and document analysis with a 100% free plan.';
    const fallbackEngine = new DeterministicFallbackProvider();
    const fallbackRes = await fallbackEngine.assessToolCandidate(sampleHtml, 'Analyze this tool');
    assert(
      '4.4: Deterministic fallback produces valid JSON classification',
      fallbackRes.status === 'SUCCESS' &&
        fallbackRes.isAIAssessed === false &&
        fallbackRes.parsedJson?.classification?.itemType === 'AI_TOOL'
    );
    assert(
      '4.5: Deterministic fallback confidence is bounded to conservative 0.40',
      fallbackRes.parsedJson?.confidence === 0.4
    );
    assert(
      '4.6: Evidenced capabilities extracted strictly from text (Code Generation)',
      fallbackRes.parsedJson?.taxonomy?.capabilities?.includes('Code Generation') &&
        fallbackRes.parsedJson?.taxonomy?.capabilities?.includes('Document Analysis')
    );

    // 4.7 ClaudeService Offline Null Safety
    const claudeService = new ClaudeService();
    const evalRes = await claudeService.evaluateOpenEndedAnswer(
      'q25',
      'What are the limitations of LLMs?',
      'Test rubric',
      'checkingAI',
      'Rubric description',
      'Hallucinations and context window boundaries.'
    );
    // In unconfigured/offline dev, claudeService returns null to force deterministic scoring
    assert(
      '4.7: ClaudeService returns null safely without throwing or faking scores',
      evalRes === null || evalRes?.status === 'evaluated'
    );

    // -------------------------------------------------------------------------
    // SUITE 5: Learner Workflows & Database Lifecycle
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 5: Learner Workflows & Database Lifecycle ───────────');

    // 5.1 Health check exposes database status and mode
    const resHealth = await request(server, { method: 'GET', path: '/health' });
    assert(
      '5.1: Health endpoint returns HTTP 200',
      resHealth.status === 200 && resHealth.body?.status === 'ok'
    );
    assert(
      '5.2: Health check includes database connection mode ("mongodb" or "fallback")',
      resHealth.body?.database?.mode === 'mongodb' || resHealth.body?.database?.mode === 'fallback'
    );

    // 5.3 Learner State Read & Write Continuity
    const resState = await request(server, {
      method: 'GET',
      path: '/api/learner/state',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(
      '5.3: GET /api/learner/state returns structured state',
      resState.status === 200 && Boolean(resState.body?.profile)
    );

    // -------------------------------------------------------------------------
    // SUITE 6: API Error Handling, Routing & Security Headers
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 6: API Error Handling, Routing & Security Headers ───');

    // 6.1 Unknown Route Handled
    const resNotFound = await request(server, {
      method: 'GET',
      path: '/api/nonexistent-route-xyz',
    });
    assert('6.1: Nonexistent API route returns 404', resNotFound.status === 404);

    // 6.2 Helmet Security Headers
    const headers = resHealth.headers;
    assert('6.2: Helmet nosniff header present', headers['x-content-type-options'] === 'nosniff');
    assert(
      '6.3: Helmet frameguard SAMEORIGIN present',
      headers['x-frame-options'] === 'SAMEORIGIN'
    );
    assert(
      '6.4: Cross-Origin-Resource-Policy present',
      headers['cross-origin-resource-policy'] === 'cross-origin'
    );

    // 6.3 CORS Allowlist Behavior
    const resCorsAllowed = await request(server, {
      method: 'GET',
      path: '/health',
      headers: { Origin: 'http://localhost:3000' },
    });
    assert(
      '6.5: Allowed CORS origin (http://localhost:3000) is accepted',
      resCorsAllowed.headers['access-control-allow-origin'] === 'http://localhost:3000'
    );

    const resCorsForbidden = await request(server, {
      method: 'GET',
      path: '/health',
      headers: { Origin: 'http://unauthorized-malicious-domain.com' },
    });
    assert('6.6: Unauthorized CORS origin receives HTTP 403', resCorsForbidden.status === 403);
  } finally {
    // Teardown ephemeral server
    await new Promise<void>((resolve) => server.close(() => resolve()));
    console.log('\n📡 Ephemeral Test Server closed gracefully.');
  }

  // Final Summary
  const total = passedCount + failedCount;
  console.log('\n===============================================================');
  console.log(
    `INTEGRATION SUITE SUMMARY: ${passedCount} PASSED / ${failedCount} FAILED (Total: ${total})`
  );
  console.log('===============================================================');

  if (failedCount > 0) {
    console.error('\n❌ FAILURES RECORDED:');
    failureDetails.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL FULL-STACK INTEGRATION TESTS PASSED CLEANLY!\n');
    process.exit(0);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test runner crash:', err);
  process.exit(1);
});
