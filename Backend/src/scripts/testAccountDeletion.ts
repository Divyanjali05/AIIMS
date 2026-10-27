/**
 * testAccountDeletion.ts
 * ============================================================================
 * AIIMS In-App Account Deletion & App Store Compliance Verification Suite
 *
 * Verifies:
 *  1. Confirmation step: requires exact word "DELETE" (rejects empty/mismatched strings).
 *  2. Authentication continuity: works for accounts signed in with any method (Bearer & Cookie).
 *  3. Requirement 4a: Deleted user cannot log in (HTTP 401 on login and old session tokens).
 *  4. Requirement 4b: Personal data is permanently gone (User, StudentProfile, Submissions content, memory stores).
 *  5. Requirement 4c: Non-personal credit ledger records are kept (anonymised) and ledger totals still balance.
 *  6. Audit logging: Logs the deletion in the audit log WITHOUT any personal data.
 *  7. Public support contact endpoint is available and exposes SUPPORT_EMAIL.
 *
 * Run:
 *  npx ts-node src/scripts/testAccountDeletion.ts
 * ============================================================================
 */

import http from 'http';
import { AddressInfo } from 'net';
import mongoose from 'mongoose';
import { app } from '../server';
import { User } from '../models/User.model';
import { StudentProfile } from '../models/StudentProfile.model';
import { Submission, memorySubmissions } from '../models/Submission.model';
import { CreditLedger } from '../models/CreditLedger.model';
import { AuditLog, memoryAuditLogs } from '../models/AuditLog.model';
import { registeredUsers } from '../controllers/auth.controller';
import { creditsLedgerService } from '../services/creditsLedger.service';
import { config } from '../config/env';

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

async function runSuite() {
  console.log('===============================================================');
  console.log('🛡️  AIIMS APP STORE REQUIREMENTS & ACCOUNT DELETION TEST SUITE');
  console.log('===============================================================\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as AddressInfo;
  console.log(`  (Test server listening on port ${addr.port})\n`);

  try {
    // -------------------------------------------------------------------------
    // SUITE 1: Public Config & Support Email
    // -------------------------------------------------------------------------
    console.log('── SUITE 1: Public Configuration & Support Contact ─────────────');
    const configRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/config/public',
    });
    assert('Public config returns HTTP 200', configRes.status === 200);
    assert(
      'Support email is read from env variable / config',
      configRes.body?.supportEmail === config.supportEmail &&
        typeof configRes.body?.supportEmail === 'string'
    );

    // -------------------------------------------------------------------------
    // SUITE 2: Account Creation & Personal Data Population
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 2: Test User Registration & Activity Seeding ───────────');
    const timestamp = Date.now();
    const testEmail = `delete.test.${timestamp}@example.edu`;
    const testPassword = 'Password123!';
    const testName = 'Jane Doe Candidate';

    const regRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/register',
      headers: { 'X-Client': 'mobile' },
      body: {
        name: testName,
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
        stream: 'TECH',
        educationLevel: 'UNDERGRADUATE',
        programId: 'btech',
        programName: 'B.Tech',
        specializationId: 'ai_ml',
        specializationName: 'Artificial Intelligence & Machine Learning',
        yearOfStudy: 2,
        admissionYear: 2024,
        expectedGraduationYear: 2028,
      },
    });

    assert(
      'Test user registration returns HTTP 201/200',
      regRes.status === 201 || regRes.status === 200
    );
    const token = regRes.body?.token;
    const userId = regRes.body?.user?.id || regRes.body?.user?._id;
    assert('User ID and JWT token issued', !!token && !!userId);

    // Seed additional credit transactions
    await creditsLedgerService.executeTransaction({
      userId,
      type: 'EARN',
      amount: 50,
      reason: 'Capability assessment quest completed',
      source: 'QUEST_COMPLETION',
      idempotencyKey: `earn-quest-${timestamp}`,
      metadata: { privateUserIp: '192.168.1.50', personalNickname: 'Janie' },
    });

    await creditsLedgerService.executeTransaction({
      userId,
      type: 'SPEND',
      amount: 20,
      reason: 'AI Clarity mentor feedback generated',
      source: 'TOOL_EXECUTION',
      idempotencyKey: `spend-mentor-${timestamp}`,
      metadata: { temporarySessionToken: 'sess_abc123' },
    });

    // Seed personal submission
    const personalSubmission = {
      learner: userId,
      learnerName: testName,
      learnerEmail: testEmail,
      taskId: 'clarity_eval_task_1',
      taskTitle: 'Critical AI Evaluation',
      answerContent: 'My personal confidential essay about AI bias and neural hallucination.',
      status: 'submitted' as const,
      writtenFeedback: 'Excellent critique of model reasoning.',
    };

    if (mongoose.connection.readyState === 1) {
      await Submission.create(personalSubmission);
    } else {
      memorySubmissions.push(personalSubmission);
    }

    // Verify user can access profile
    const profileRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/users/profile',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert('Pre-deletion: User can fetch profile with active token', profileRes.status === 200);
    assert(
      'Pre-deletion: Personal name matches registered name',
      profileRes.body?.name === testName
    );

    // -------------------------------------------------------------------------
    // SUITE 3: Confirmation Step Validation
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 3: Account Deletion Confirmation Validation ───────────');

    // Missing confirmation
    const rejectNoBody = await makeRequest(server, {
      method: 'DELETE',
      path: '/api/auth/account',
      headers: { Authorization: `Bearer ${token}` },
      body: {},
    });
    assert('Rejects deletion request without confirmation (HTTP 400)', rejectNoBody.status === 400);

    // Wrong word confirmation (e.g. lowercase or "yes")
    const rejectWrongWord = await makeRequest(server, {
      method: 'DELETE',
      path: '/api/auth/account',
      headers: { Authorization: `Bearer ${token}` },
      body: { confirmation: 'delete' },
    });
    assert(
      'Rejects deletion request when word is not exact uppercase "DELETE" (HTTP 400)',
      rejectWrongWord.status === 400
    );

    // Unauthenticated request
    const rejectUnauth = await makeRequest(server, {
      method: 'DELETE',
      path: '/api/auth/account',
      body: { confirmation: 'DELETE' },
    });
    assert('Rejects unauthenticated deletion request (HTTP 401)', rejectUnauth.status === 401);

    // -------------------------------------------------------------------------
    // SUITE 4: Successful Deletion Execution
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 4: Successful Deletion Execution ──────────────────────');
    const deleteRes = await makeRequest(server, {
      method: 'DELETE',
      path: '/api/auth/account',
      headers: { Authorization: `Bearer ${token}` },
      body: { confirmation: 'DELETE' },
    });

    assert('Account deletion succeeds with HTTP 200', deleteRes.status === 200);
    assert('Deletion returns clear success message', deleteRes.body?.success === true);
    assert(
      'Sets cookie expiration / clear cookie header',
      Array.isArray(deleteRes.headers['set-cookie']) ||
        typeof deleteRes.headers['set-cookie'] === 'string'
    );

    // -------------------------------------------------------------------------
    // SUITE 5: Verification — Deleted User Cannot Log In
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 5: Verification — Deleted User Cannot Log In ──────────');

    // Attempt login with deleted credentials
    const loginAttempt = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: testEmail,
        password: testPassword,
      },
    });
    assert(
      'Deleted user cannot log in (HTTP 401 Unauthorized)',
      loginAttempt.status === 401,
      `Received status: ${loginAttempt.status}`
    );

    // Attempt accessing protected endpoint with old JWT token
    const oldTokenAttempt = await makeRequest(server, {
      method: 'GET',
      path: '/api/users/profile',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(
      'Old JWT token is rejected on protected routes (HTTP 401 Unauthorized)',
      oldTokenAttempt.status === 401,
      `Received status: ${oldTokenAttempt.status}`
    );

    const oldMeAttempt = await makeRequest(server, {
      method: 'GET',
      path: '/api/auth/me',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert('Old JWT token fails on /api/auth/me (HTTP 401)', oldMeAttempt.status === 401);

    // -------------------------------------------------------------------------
    // SUITE 6: Verification — Personal Data Is Gone
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 6: Verification — Personal Data Is Gone ───────────────');

    // 6A: Check User model
    if (mongoose.connection.readyState === 1) {
      const dbUserByEmail = await User.findOne({ email: testEmail });
      const dbUserById = await User.findById(userId);
      assert('DB: User document is completely removed by email', dbUserByEmail === null);
      assert('DB: User document is completely removed by ID', dbUserById === null);

      // 6B: Check StudentProfile model
      const dbProfile = await StudentProfile.findOne({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(userId)
            ? [{ userId: new mongoose.Types.ObjectId(userId) }]
            : []),
          { userId },
        ],
      });
      assert('DB: StudentProfile document is completely removed', dbProfile === null);

      // 6C: Check Submissions content
      const dbSubmissions = await Submission.find({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(userId)
            ? [{ learner: new mongoose.Types.ObjectId(userId) }]
            : []),
          { learner: userId },
          { learnerEmail: testEmail },
        ],
      });
      assert(
        'DB: Submission answer content and personal records are purged',
        dbSubmissions.length === 0
      );
    } else {
      assert('Memory: registeredUsers entry is purged', registeredUsers[testEmail] === undefined);
      const remainingMemSubs = memorySubmissions.filter(
        (s) => String(s.learner) === userId || s.learnerEmail === testEmail
      );
      assert('Memory: Submissions for user are purged', remainingMemSubs.length === 0);
    }

    // 6D: Check Audit Log — MUST NOT contain personal data
    let foundAuditLog = false;
    let auditLogHasPersonalData = false;

    if (mongoose.connection.readyState === 1) {
      const logs = await AuditLog.find({ action: 'ACCOUNT_DELETION' }).sort({ time: -1 }).limit(5);
      if (logs.length > 0) {
        foundAuditLog = true;
        for (const log of logs) {
          const logStr = JSON.stringify(log);
          if (logStr.includes(testEmail) || logStr.includes(testName)) {
            auditLogHasPersonalData = true;
          }
        }
      }
    } else {
      const memLogs = memoryAuditLogs.filter((l) => l.action === 'ACCOUNT_DELETION');
      if (memLogs.length > 0) {
        foundAuditLog = true;
        for (const log of memLogs) {
          const logStr = JSON.stringify(log);
          if (logStr.includes(testEmail) || logStr.includes(testName)) {
            auditLogHasPersonalData = true;
          }
        }
      }
    }

    assert('Audit log records the ACCOUNT_DELETION event', foundAuditLog);
    assert(
      'Audit log contains ZERO personal data (no email or name stored)',
      !auditLogHasPersonalData
    );

    // -------------------------------------------------------------------------
    // SUITE 7: Verification — Ledger Totals Still Balance
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 7: Verification — Ledger Totals Still Balance ─────────');

    let userEntries: any[] = [];
    if (mongoose.connection.readyState === 1) {
      userEntries = await CreditLedger.find({ userId }).sort({ createdAt: 1 });
    } else {
      // Reconcile via ledger service
      const res = await creditsLedgerService.getLedgerHistory(userId, { limit: 50 });
      userEntries = res.transactions;
    }

    assert('Ledger entries are preserved for audit trail', userEntries.length >= 2);

    let totalEarned = 0;
    let totalSpent = 0;
    let personalMetadataFound = false;

    for (const entry of userEntries) {
      if (entry.type === 'EARN' || entry.type === 'REFUND') {
        totalEarned += entry.amount;
      } else if (entry.type === 'SPEND') {
        totalSpent += entry.amount;
      }
      // Metadata must be stripped of any personal traces
      if (entry.metadata && Object.keys(entry.metadata).length > 0) {
        const metaStr = JSON.stringify(entry.metadata);
        if (
          metaStr.includes('privateUserIp') ||
          metaStr.includes('Janie') ||
          metaStr.includes('sess_abc123')
        ) {
          personalMetadataFound = true;
        }
      }
    }

    const calculatedBalance = totalEarned - totalSpent;
    assert('Ledger entries have zero identifying metadata remaining', !personalMetadataFound);
    assert(
      'Ledger totals mathematically balance (Earned - Spent = Net historical credits)',
      totalEarned > 0 && calculatedBalance === 500 + 50 - 20
    );

    // -------------------------------------------------------------------------
    // SUITE 8: Web Cookie Authentication Deletion Continuity
    // -------------------------------------------------------------------------
    console.log('\n── SUITE 8: Web Client (Cookie) Deletion Continuity ────────────');
    const cookieUserEmail = `cookie.user.${Date.now()}@example.com`;
    const regCookieUser = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/register',
      headers: {
        Origin: 'http://localhost:3000',
      },
      body: {
        name: 'Cookie User',
        email: cookieUserEmail,
        password: testPassword,
        confirmPassword: testPassword,
        stream: 'NON_TECH',
        educationLevel: 'UNDERGRADUATE',
        programId: 'bba',
        programName: 'BBA',
        specializationId: 'marketing',
        specializationName: 'Marketing',
        yearOfStudy: 1,
        admissionYear: 2025,
        expectedGraduationYear: 2028,
      },
    });

    const setCookieHeaders = regCookieUser.headers['set-cookie'];
    const cookieHeader = Array.isArray(setCookieHeaders)
      ? setCookieHeaders.join('; ')
      : setCookieHeaders || '';
    assert('Web client receives httpOnly cookie', cookieHeader.includes('aiims_token'));

    // Perform deletion using cookie and Origin header
    const cookieDeleteRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/delete-account',
      headers: {
        Cookie: cookieHeader,
        Origin: 'http://localhost:3000',
      },
      body: { confirmation: 'DELETE' },
    });

    assert('Cookie-authenticated deletion succeeds (HTTP 200)', cookieDeleteRes.status === 200);
    assert(
      'Cookie-authenticated user cannot log in',
      (
        await makeRequest(server, {
          method: 'POST',
          path: '/api/auth/login',
          body: { email: cookieUserEmail, password: testPassword },
        })
      ).status === 401
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED / ${failed} FAILED (Total: ${passed + failed})`);
  console.log('===============================================================');

  if (failed > 0) {
    console.error('Failed test names:', failures);
    process.exit(1);
  } else {
    console.log('🎉 ALL ACCOUNT DELETION & STORE COMPLIANCE TESTS PASSED!');
    process.exit(0);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
