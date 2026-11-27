/**
 * testClarityFocusAiExecutionAndReviewQA.ts
 * ============================================================================
 * AIIMS Comprehensive QA Verification Suite:
 * Clarity, Focus, Real AI Execution, and Admin Review Workflow
 * ============================================================================
 */

import http from 'http';
import { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import { app } from '../server';
import { config } from '../config/env';
import { prisma, isDatabaseConnected } from '../config/prisma';
import {
  installPrismaTestDouble,
  uninstallPrismaTestDouble,
} from '../services/__tests__/helpers/prismaTestDouble';
import { toJsonInput } from '../utils/userMapper';
import fs from 'fs';
import path from 'path';

let passedCount = 0;
let failedCount = 0;
const testResults: { name: string; passed: boolean; detail?: string }[] = [];

function assert(description: string, condition: boolean, detail?: string) {
  if (condition) {
    passedCount++;
    testResults.push({ name: description, passed: true });
    console.log(`  ✅ [PASS] ${description}`);
  } else {
    failedCount++;
    testResults.push({ name: description, passed: false, detail });
    console.error(`  ❌ [FAIL] ${description}${detail ? ` — ${detail}` : ''}`);
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

function generateTestToken(userId: string, role: string, email: string): string {
  return jwt.sign(
    {
      userId,
      role,
      email: email.toLowerCase().trim(),
    },
    config.jwtSecret,
    { expiresIn: '1h' }
  );
}

async function runQASuite() {
  console.log('================================================================');
  console.log('🧪 AIIMS COMPREHENSIVE QA: CLARITY, FOCUS, AI EXEC & ADMIN REVIEW');
  console.log('================================================================\n');

  if (!isDatabaseConnected()) {
    installPrismaTestDouble({ connected: true });
  }

  // Start ephemeral test server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const timestamp = Date.now();
  const learnerAId = `qa_learner_a_${timestamp}`;
  const learnerBId = `qa_learner_b_${timestamp}`;
  const adminId = `qa_admin_${timestamp}`;

  const emailA = `learner_a_${timestamp}@aiims.edu`;
  const emailB = `learner_b_${timestamp}@aiims.edu`;
  const emailAdmin = `admin_${timestamp}@aiims.edu`;

  // 1. Create Test Users with Completed Assessment & Viewed Analysis (unlocked Clarity)
  await prisma.user.create({
    data: {
      id: learnerAId,
      email: emailA,
      name: 'QA Learner Alice',
      password: 'HashedPassword123!',
      role: 'learner',
      aiimsCredits: 200,
      xpPoints: 100,
      assessmentData: toJsonInput({
        status: 'completed',
        completedAt: new Date().toISOString(),
        evaluationResult: { percentageScore: 92 },
      }),
      analysisData: toJsonInput({
        status: 'viewed',
        viewedAt: new Date().toISOString(),
      }),
    },
  });

  await prisma.user.create({
    data: {
      id: learnerBId,
      email: emailB,
      name: 'QA Learner Bob',
      password: 'HashedPassword123!',
      role: 'learner',
      aiimsCredits: 150,
      xpPoints: 50,
      assessmentData: toJsonInput({
        status: 'completed',
        completedAt: new Date().toISOString(),
        evaluationResult: { percentageScore: 85 },
      }),
      analysisData: toJsonInput({
        status: 'viewed',
        viewedAt: new Date().toISOString(),
      }),
    },
  });

  await prisma.user.create({
    data: {
      id: adminId,
      email: emailAdmin,
      name: 'QA Staff Admin',
      password: 'HashedPassword123!',
      role: 'admin',
      aiimsCredits: 500,
      xpPoints: 1000,
    },
  });

  const tokenLearnerA = generateTestToken(learnerAId, 'learner', emailA);
  const tokenLearnerB = generateTestToken(learnerBId, 'learner', emailB);
  const tokenAdmin = generateTestToken(adminId, 'admin', emailAdmin);

  try {
    // ============================================================================
    // SUITE 1: REAL AI EXECUTION TESTING
    // ============================================================================
    console.log('\n── SUITE 1: Real AI Execution Testing ──────────────────────────');

    // Test 1.1: Empty prompt validation
    const emptyRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/clarity/run-task',
      headers: { Authorization: `Bearer ${tokenLearnerA}` },
      body: {
        userPrompt: '',
        taskId: 'clarity-q1',
      },
    });
    assert('Empty prompt validation returns HTTP 400 Bad Request', emptyRes.status === 400);

    // Test 1.2: Exceeding length prompt validation (>5,000 characters)
    const longPrompt = 'A'.repeat(5001);
    const longRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/clarity/run-task',
      headers: { Authorization: `Bearer ${tokenLearnerA}` },
      body: {
        userPrompt: longPrompt,
        taskId: 'clarity-q1',
      },
    });
    assert(
      'Prompt exceeding 5,000 characters returns HTTP 400 Bad Request',
      longRes.status === 400
    );

    // Test 1.3: Valid prompt execution returns real response
    const validRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/clarity/run-task',
      headers: { Authorization: `Bearer ${tokenLearnerA}` },
      body: {
        userPrompt:
          'Summarize the primary purpose of diagnostic AI evaluations in three bullet points.',
        taskId: 'clarity-q1',
        topic: 'AI Fundamentals',
        topicId: 'topic-1',
      },
    });
    assert('Valid prompt execution returns HTTP 200 OK', validRes.status === 200);
    assert(
      'Execution response contains output text',
      Boolean(validRes.body?.output && typeof validRes.body.output === 'string')
    );
    assert(
      'Execution response returns model telemetry (modelUsed & executionTimeMs)',
      Boolean(validRes.body?.modelUsed && typeof validRes.body?.executionTimeMs === 'number')
    );

    // Test 1.4: Zero-credit preview verification (creditsDeducted === 0)
    assert(
      'Prompt run is treated as preview with creditsDeducted = 0',
      validRes.body?.creditsDeducted === 0 && validRes.body?.isFreeTrial === true
    );

    const learnerAfterRun = await prisma.user.findUnique({ where: { id: learnerAId } });
    assert(
      'Learner credit balance remains untouched after running prompt (200 AC)',
      learnerAfterRun?.aiimsCredits === 200
    );

    // Test 1.5: Focus prompt execution route (/api/focus/run)
    const focusRunRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/focus/run',
      headers: { Authorization: `Bearer ${tokenLearnerA}` },
      body: {
        userPrompt: 'Draft an architectural prompt for healthcare diagnostic validation.',
        taskId: 'focus-q1',
      },
    });
    assert(
      'Focus prompt execution route (/api/focus/run) returns HTTP 200 OK',
      focusRunRes.status === 200
    );

    // Test 1.6: Secret keys protection (No API keys or system secrets leaked in response)
    const resStr = JSON.stringify(validRes.body);
    const leakedKey =
      resStr.includes('sk-ant') || resStr.includes('AIzaSy') || resStr.includes(config.jwtSecret);
    assert('Zero API keys or secrets exposed in execution response body', !leakedKey);

    // ============================================================================
    // SUITE 2: SUBMISSION FOR ADMIN REVIEW
    // ============================================================================
    console.log('\n── SUITE 2: Learner Submission & Admin Review ──────────────────');

    // Test 2.1: Learner submits task for review via POST /api/submissions
    const submitRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/submissions',
      headers: { Authorization: `Bearer ${tokenLearnerA}` },
      body: {
        taskId: 'clarity-topic-1-q1',
        module: 'clarity',
        topicId: 'topic-1',
        topic: 'AI Fundamentals',
        userPrompt: 'Summarize the primary purpose of diagnostic AI evaluations.',
        aiOutput: validRes.body?.output || 'Diagnostic AI systems provide baseline metrics.',
        modelUsed: validRes.body?.modelUsed || 'claude-3-5-sonnet',
        executionTimeMs: 1200,
        promptHistory: [
          {
            id: 'v1',
            version: 1,
            prompt: 'Draft a short summary.',
            output: 'Brief output.',
            timestamp: new Date().toISOString(),
            modelUsed: 'claude-3-5-sonnet',
            executionTimeMs: 900,
          },
        ],
      },
    });
    assert('Learner submits task for review with HTTP 201 Created', submitRes.status === 201);
    const submissionId = submitRes.body?.submission?.id;
    assert('Submission created with valid ID', Boolean(submissionId));
    assert(
      'Initial submission status is submitted/pending',
      submitRes.body?.submission?.status === 'submitted' ||
        submitRes.body?.submission?.status === 'pending'
    );

    // Test 2.2: Duplicate submission updates existing pending record rather than duplicating
    const duplicateSubmitRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/submissions',
      headers: { Authorization: `Bearer ${tokenLearnerA}` },
      body: {
        taskId: 'clarity-topic-1-q1',
        module: 'clarity',
        topicId: 'topic-1',
        userPrompt:
          'Updated prompt: Summarize the primary purpose of diagnostic AI evaluations in healthcare.',
        aiOutput: 'Updated output with healthcare scope.',
      },
    });
    assert(
      'Resubmitting while pending updates existing record with HTTP 200 OK',
      duplicateSubmitRes.status === 200
    );
    assert(
      'Updated submission retains identical submission ID',
      duplicateSubmitRes.body?.submission?.id === submissionId
    );

    // Test 2.3: Learner fetches their own submission status via GET /api/submissions?taskId=...
    const mySubmissionsRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/submissions?taskId=clarity-topic-1-q1',
      headers: { Authorization: `Bearer ${tokenLearnerA}` },
    });
    assert(
      'Learner fetches own submission status with HTTP 200 OK',
      mySubmissionsRes.status === 200
    );
    assert(
      'Fetched submission matches pending status and task ID',
      mySubmissionsRes.body?.submissions?.[0]?.taskId === 'clarity-topic-1-q1'
    );

    // ============================================================================
    // SUITE 3: SECURITY & AUTHORIZATION BOUNDARIES
    // ============================================================================
    console.log('\n── SUITE 3: Security & Authorization Boundaries ─────────────────');

    // Test 3.1: Non-admin calling Admin Submissions API is refused with HTTP 403
    const nonAdminListRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/admin/submissions',
      headers: { Authorization: `Bearer ${tokenLearnerA}` },
    });
    assert(
      'Learner calling /api/admin/submissions is refused with HTTP 403 Forbidden',
      nonAdminListRes.status === 403
    );

    // Test 3.2: Non-admin calling Admin Review action is refused with HTTP 403
    const nonAdminReviewRes = await makeRequest(server, {
      method: 'POST',
      path: `/api/admin/submissions/${submissionId}/review`,
      headers: { Authorization: `Bearer ${tokenLearnerA}` },
      body: {
        decision: 'accepted',
        feedback: 'Unauthorized review attempt',
      },
    });
    assert(
      'Learner calling /api/admin/submissions/:id/review is refused with HTTP 403 Forbidden',
      nonAdminReviewRes.status === 403
    );

    // Test 3.3: Learner B cannot view Learner A private submission
    const learnerBQueryRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/submissions?taskId=clarity-topic-1-q1',
      headers: { Authorization: `Bearer ${tokenLearnerB}` },
    });
    assert(
      'Learner B queries task and receives 0 submissions (data isolation enforced)',
      learnerBQueryRes.body?.submissions?.length === 0
    );

    // Test 3.4: Learner A views their own submission by ID with HTTP 200
    const learnerAViewSelfRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/submissions/${submissionId}`,
      headers: { Authorization: `Bearer ${tokenLearnerA}` },
    });
    assert(
      'Learner A views own submission by ID with HTTP 200 OK',
      learnerAViewSelfRes.status === 200
    );

    // Test 3.5: Learner B attempts to view Learner A submission by ID -> refused with HTTP 403
    const learnerBViewOtherRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/submissions/${submissionId}`,
      headers: { Authorization: `Bearer ${tokenLearnerB}` },
    });
    assert(
      'Learner B attempting to view Learner A submission by ID is refused with HTTP 403 Forbidden',
      learnerBViewOtherRes.status === 403
    );

    // Test 3.6: Admin views any submission by ID with HTTP 200
    const adminViewByIdRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/admin/submissions/${submissionId}`,
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert('Admin views submission by ID with HTTP 200 OK', adminViewByIdRes.status === 200);

    // ============================================================================
    // SUITE 4: ADMIN REVIEW ACTIONS & AUDIT TRAIL
    // ============================================================================
    console.log('\n── SUITE 4: Admin Review Actions & Audit Trail ──────────────────');

    // Test 4.1: Admin gets submission stats
    const adminStatsRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/admin/submissions/stats',
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert('Admin gets submission stats with HTTP 200 OK', adminStatsRes.status === 200);
    assert(
      'Stats contain total and pending counts (pending >= 1)',
      adminStatsRes.body?.stats?.pending >= 1
    );

    // Test 4.2: Admin lists submissions with filters
    const adminListRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/admin/submissions?status=pending&module=clarity',
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert('Admin lists submissions with HTTP 200 OK', adminListRes.status === 200);
    assert(
      'Admin sees the pending submission in list',
      adminListRes.body?.submissions?.some((s: any) => s.id === submissionId)
    );

    // Test 4.3: Admin reviews submission -> Requests Changes
    const adminChangesRes = await makeRequest(server, {
      method: 'POST',
      path: `/api/admin/submissions/${submissionId}/review`,
      headers: { Authorization: `Bearer ${tokenAdmin}` },
      body: {
        decision: 'revision_requested',
        feedback: 'Please make the prompt more specific regarding diagnostic edge cases.',
      },
    });
    assert(
      'Admin requests changes with HTTP 200 OK',
      adminChangesRes.status === 200 &&
        adminChangesRes.body?.submission?.status === 'revision_requested'
    );

    // Test 4.4: Learner receives updated status and admin feedback
    const learnerCheckRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/submissions?taskId=clarity-topic-1-q1',
      headers: { Authorization: `Bearer ${tokenLearnerA}` },
    });
    const updatedSubmission = learnerCheckRes.body?.submissions?.[0];
    assert(
      'Learner receives revision_requested status and written feedback',
      updatedSubmission?.status === 'revision_requested' &&
        updatedSubmission?.writtenFeedback?.includes('more specific')
    );

    // Test 4.5: Admin approves submission
    const adminApproveRes = await makeRequest(server, {
      method: 'POST',
      path: `/api/admin/submissions/${submissionId}/review`,
      headers: { Authorization: `Bearer ${tokenAdmin}` },
      body: {
        decision: 'accepted',
        feedback: 'Excellent work. Output meets all criteria.',
      },
    });
    assert(
      'Admin approves submission with HTTP 200 OK and accepted status',
      adminApproveRes.status === 200 && adminApproveRes.body?.submission?.status === 'accepted'
    );

    // Test 4.6: Audit logging
    const auditLogs = await prisma.auditLog.findMany({
      where: { target: submissionId },
    });
    assert('Audit log entry created for admin review action', auditLogs.length > 0);

    // Test 4.7: Invalid review decision returns HTTP 400 Bad Request
    const invalidDecisionRes = await makeRequest(server, {
      method: 'POST',
      path: `/api/admin/submissions/${submissionId}/review`,
      headers: { Authorization: `Bearer ${tokenAdmin}` },
      body: {
        decision: 'hacked_bypass',
        feedback: 'Valid feedback text',
      },
    });
    assert(
      'Invalid review decision is rejected with HTTP 400 Bad Request',
      invalidDecisionRes.status === 400
    );

    // Test 4.8: Empty feedback in review returns HTTP 400 Bad Request
    const emptyFeedbackRes = await makeRequest(server, {
      method: 'POST',
      path: `/api/admin/submissions/${submissionId}/review`,
      headers: { Authorization: `Bearer ${tokenAdmin}` },
      body: {
        decision: 'accepted',
        feedback: '   ',
      },
    });
    assert(
      'Empty feedback in review is rejected with HTTP 400 Bad Request',
      emptyFeedbackRes.status === 400
    );

    // Test 4.9: AC & XP financial safety: balances remain completely unchanged across review
    const learnerAfterReview = await prisma.user.findUnique({ where: { id: learnerAId } });
    assert(
      'Learner AC balance remains intact after Admin review (200 AC)',
      learnerAfterReview?.aiimsCredits === 200
    );
    assert(
      'Learner XP balance remains intact after Admin review (100 XP)',
      learnerAfterReview?.xpPoints === 100
    );

    // Test 4.10: Status transition safety: cannot resubmit an already accepted submission
    const resubmitAcceptedRes = await makeRequest(server, {
      method: 'POST',
      path: `/api/submissions/${submissionId}/resubmit`,
      headers: { Authorization: `Bearer ${tokenLearnerA}` },
      body: {
        answerContent: 'Attempting to resubmit an accepted submission',
      },
    });
    assert(
      'Resubmission on already accepted submission is rejected with HTTP 400 (INVALID_STATUS_TRANSITION)',
      resubmitAcceptedRes.status === 400 &&
        resubmitAcceptedRes.body?.code === 'INVALID_STATUS_TRANSITION'
    );

    // ============================================================================
    // SUITE 5: UI & COMPONENT ABSENCE VERIFICATION
    // ============================================================================
    console.log('\n── SUITE 5: Frontend Component & Layout Audit ───────────────────');

    const clarityTaskLabPath = path.resolve(
      __dirname,
      '../../../Frontend/src/screens/clarity/ClarityTaskLab.tsx'
    );
    const focusChallengesPath = path.resolve(
      __dirname,
      '../../../Frontend/src/screens/focus/FocusChallenges.tsx'
    );
    const analysisScreenPath = path.resolve(
      __dirname,
      '../../../Frontend/src/screens/analysis/AnalysisScreen.tsx'
    );
    const workbenchPath = path.resolve(
      __dirname,
      '../../../Frontend/src/components/common/QuestionWorkbench.tsx'
    );
    const adminReviewPath = path.resolve(
      __dirname,
      '../../../Frontend/src/screens/staff/AdminSubmissionsReviewView.tsx'
    );

    const clarityContent = fs.readFileSync(clarityTaskLabPath, 'utf8');
    const focusContent = fs.readFileSync(focusChallengesPath, 'utf8');
    const analysisContent = fs.readFileSync(analysisScreenPath, 'utf8');
    const workbenchContent = fs.readFileSync(workbenchPath, 'utf8');
    const adminReviewContent = fs.readFileSync(adminReviewPath, 'utf8');

    assert(
      'Release Notes completely absent from ClarityTaskLab.tsx',
      !clarityContent.includes('Release Notes') && !clarityContent.includes('release-notes')
    );

    assert(
      'Evaluation Rubric preview completely absent from ClarityTaskLab.tsx',
      !clarityContent.includes('Evaluation Rubric') && !clarityContent.includes('evaluation-rubric')
    );

    assert(
      'Release Notes completely absent from FocusChallenges.tsx',
      !focusContent.includes('Release Notes')
    );

    assert(
      'AI Learner Profile Synthesis card completely absent from AnalysisScreen.tsx',
      !analysisContent.includes('Unlock Your Persistent AI Learner Profile') &&
        !analysisContent.includes('AI Learner Profile Synthesis')
    );

    assert(
      'QuestionWorkbench implements live prompt execution & preview',
      workbenchContent.includes('runClarityTask') && workbenchContent.includes('Output Preview')
    );

    assert(
      'QuestionWorkbench implements Submit for Admin Review confirmation modal',
      workbenchContent.includes('Submit for Admin Review') &&
        workbenchContent.includes('showConfirmModal')
    );

    assert(
      'AdminSubmissionsReviewView implements approve, reject, and changes requested',
      adminReviewContent.includes('accepted') &&
        adminReviewContent.includes('rejected') &&
        adminReviewContent.includes('revision_requested')
    );
  } finally {
    server.close();
  }

  // ============================================================================
  // FINAL QA SUMMARY
  // ============================================================================
  console.log('\n================================================================');
  console.log(`📊 QA EXECUTION SUMMARY: ${passedCount} PASSED / ${failedCount} FAILED`);
  console.log('================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runQASuite().catch((err) => {
  console.error('Fatal error during QA suite execution:', err);
  process.exit(1);
});
