/**
 * testEvaluationSystem.ts
 * =========================================================
 * AIIMS End-to-End Verification Test Suite:
 * Task Submission, Evaluator Workflow, Rubric Scoring,
 * RBAC Enforcements, Self-Review Prevention, Concurrency, and Audit Logs.
 *
 * Usage:
 *   npx ts-node src/scripts/testEvaluationSystem.ts
 */

import http from 'http';
import { AddressInfo } from 'net';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../server';
import { config } from '../config/env';
import { User, IUser } from '../models/User.model';
import { defaultTasks } from '../models/Task.model';
import { memorySubmissions } from '../models/Submission.model';
import { memoryAuditLogs } from '../models/AuditLog.model';
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

// HTTP request helper against the ephemeral test server
function makeRequest(
  server: http.Server,
  options: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: any;
  }
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
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
          resolve({ status: res.statusCode || 0, headers: res.headers, body: parsed });
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

// Generate JWT token helper
function createToken(userId: string, email: string): string {
  return jwt.sign({ userId, email: email.toLowerCase().trim() }, config.jwtSecret, {
    expiresIn: '7d',
  });
}

async function run() {
  console.log('===============================================================');
  console.log('🧪 AIIMS TASK SUBMISSION & EVALUATION TEST SUITE');
  console.log('===============================================================\n');

  // Optional DB connection if MONGODB_URI is provided
  if (config.mongodbUri) {
    try {
      await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 2000 });
      console.log('🌿 Connected to MongoDB for test verification.\n');
    } catch {
      console.log('⚠️ Running in offline memory fallback mode.\n');
    }
  }

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as AddressInfo;
  console.log(`Ephemeral test server active on port ${addr.port}\n`);

  try {
    // Setup Test Users
    const time = Date.now();
    const createdUsersToClean: string[] = [];

    async function createTestUser(userData: {
      name: string;
      email: string;
      role: 'learner' | 'evaluator' | 'admin';
      aiimsCredits?: number;
      xpPoints?: number;
      isActive?: boolean;
    }) {
      let u: any;
      if (mongoose.connection.readyState === 1) {
        u = await User.create({
          name: userData.name,
          email: userData.email,
          password: 'Password123!',
          role: userData.role,
          isActive: userData.isActive !== false,
          aiimsCredits: userData.aiimsCredits ?? 500,
          xpPoints: userData.xpPoints ?? 100,
          college: 'AIIMS Test Institute',
          targetGoal: 'AI Evaluation & Learning',
          stage: 'Knowing',
        });
        createdUsersToClean.push(String(u._id));
      } else {
        u = {
          _id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          isActive: userData.isActive !== false,
          aiimsCredits: userData.aiimsCredits ?? 500,
          xpPoints: userData.xpPoints ?? 100,
          transactions: [],
        };
        u.id = u._id;
        registeredUsers[userData.email.toLowerCase()] = u;
      }
      const id = String(u._id || u.id);
      const token = createToken(id, userData.email);
      return { id, email: userData.email, token, user: u };
    }

    const admin = await createTestUser({
      name: 'System Admin',
      email: `admin.${time}@aiims.test`,
      role: 'admin',
      aiimsCredits: 1000,
    });
    const adminToken = admin.token;
    const adminUser = admin.user;

    const learner1 = await createTestUser({
      name: 'Learner One',
      email: `learner1.${time}@aiims.test`,
      role: 'learner',
      aiimsCredits: 500,
    });
    const learner1Token = learner1.token;
    const learner1User = learner1.user;

    const learner2 = await createTestUser({
      name: 'Learner Two',
      email: `learner2.${time}@aiims.test`,
      role: 'learner',
      aiimsCredits: 500,
    });
    const learner2Token = learner2.token;
    const learner2User = learner2.user;

    const evaluator1 = await createTestUser({
      name: 'Dr. Evaluator One',
      email: `evaluator1.${time}@aiims.test`,
      role: 'evaluator',
      aiimsCredits: 200,
    });
    const evaluator1Token = evaluator1.token;
    const evaluator1User = evaluator1.user;

    const evaluator2 = await createTestUser({
      name: 'Prof. Evaluator Two',
      email: `evaluator2.${time}@aiims.test`,
      role: 'evaluator',
      aiimsCredits: 200,
    });
    const evaluator2Token = evaluator2.token;
    const evaluator2User = evaluator2.user;

    // ─────────────────────────────────────────────────────────────
    // SUITE 1: Role Enumeration & Public Registration Security
    // ─────────────────────────────────────────────────────────────
    console.log('── SUITE 1: Role Enumeration & Public Registration Security ──');
    const pubRegAttempt = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/register',
      headers: { 'X-Client': 'mobile' },
      body: {
        name: 'Hacker User',
        email: `hacker.${time}@aiims.test`,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'admin', // Malicious attempt to self-grant admin
        stream: 'TECH',
        educationLevel: 'UNDERGRADUATE',
        programId: 'btech',
        programName: 'B.Tech',
        specializationId: 'ai_ml',
        specializationName: 'AI & ML',
        yearOfStudy: 3,
        admissionYear: 2023,
        expectedGraduationYear: 2027,
      },
    });

    assert(
      'Public registration forces role to "learner" regardless of payload input',
      pubRegAttempt.status === 201 && pubRegAttempt.body.user.role === 'learner'
    );

    const profileSelfEscalate = await makeRequest(server, {
      method: 'PUT',
      path: '/api/users/profile',
      headers: { Authorization: `Bearer ${learner1Token}` },
      body: { role: 'admin' },
    });
    assert(
      'Learner cannot self-escalate role via updateProfile',
      profileSelfEscalate.status === 200 && profileSelfEscalate.body.role === 'learner'
    );

    // ─────────────────────────────────────────────────────────────
    // SUITE 2: Role-Based Access Control (requireRole)
    // ─────────────────────────────────────────────────────────────
    console.log('\n── SUITE 2: Role-Based Access Control (requireRole) ──────────');
    const unauthQueue = await makeRequest(server, {
      method: 'GET',
      path: '/api/evaluator/queue',
    });
    assert(
      'Unauthenticated request to evaluator queue returns HTTP 401',
      unauthQueue.status === 401
    );

    const learnerQueue = await makeRequest(server, {
      method: 'GET',
      path: '/api/evaluator/queue',
      headers: { Authorization: `Bearer ${learner1Token}` },
    });
    assert(
      'Learner calling /evaluator/queue directly returns HTTP 403 Forbidden',
      learnerQueue.status === 403 && learnerQueue.body.code === 'FORBIDDEN'
    );

    const learnerAdminAction = await makeRequest(server, {
      method: 'POST',
      path: '/api/admin/evaluators',
      headers: { Authorization: `Bearer ${learner1Token}` },
      body: { name: 'Fake', email: 'fake@example.com' },
    });
    assert(
      'Learner calling /admin/evaluators directly returns HTTP 403 Forbidden',
      learnerAdminAction.status === 403 && learnerAdminAction.body.code === 'FORBIDDEN'
    );

    const evaluatorAdminAction = await makeRequest(server, {
      method: 'GET',
      path: '/api/admin/audit-logs',
      headers: { Authorization: `Bearer ${evaluator1Token}` },
    });
    assert(
      'Evaluator calling /admin/audit-logs directly returns HTTP 403 Forbidden',
      evaluatorAdminAction.status === 403 && evaluatorAdminAction.body.code === 'FORBIDDEN'
    );

    // ─────────────────────────────────────────────────────────────
    // SUITE 3: Admin Evaluator Provisioning & Lifecycle
    // ─────────────────────────────────────────────────────────────
    console.log('\n── SUITE 3: Admin Evaluator Provisioning & Lifecycle ─────────');
    const newEvalEmail = `invite.eval.${time}@aiims.test`;
    const createEvalRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/admin/evaluators',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Invited Evaluator',
        email: newEvalEmail,
      },
    });

    assert(
      'Admin successfully creates evaluator account with mustChangePassword flag',
      createEvalRes.status === 201 &&
        createEvalRes.body.evaluator.role === 'evaluator' &&
        createEvalRes.body.evaluator.mustChangePassword === true &&
        Boolean(createEvalRes.body.invite.temporaryPassword) &&
        Boolean(createEvalRes.body.invite.inviteToken)
    );

    const inviteToken = createEvalRes.body.invite.inviteToken;
    const setPassRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/set-password',
      body: {
        email: newEvalEmail,
        inviteToken,
        newPassword: 'PermanentSecretPassword123!',
      },
    });
    assert(
      'Evaluator can set permanent password using one-time invite token',
      setPassRes.status === 200 && setPassRes.body.success === true
    );

    const evalUserDoc =
      mongoose.connection.readyState === 1
        ? await User.findOne({ email: newEvalEmail }).lean()
        : registeredUsers[newEvalEmail];
    assert(
      'Setting permanent password clears mustChangePassword flag and invite token',
      Boolean(evalUserDoc && evalUserDoc.mustChangePassword === false && !evalUserDoc.inviteToken)
    );

    // Admin disables evaluator
    const evalId = createEvalRes.body.evaluator.id;
    const disableRes = await makeRequest(server, {
      method: 'PATCH',
      path: `/api/admin/evaluators/${evalId}/status`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { isActive: false },
    });
    assert(
      'Admin can disable an evaluator account',
      disableRes.status === 200 && disableRes.body.evaluator.isActive === false
    );

    const disabledToken = createToken(evalId, newEvalEmail);
    const disabledQueueAttempt = await makeRequest(server, {
      method: 'GET',
      path: '/api/evaluator/queue',
      headers: { Authorization: `Bearer ${disabledToken}` },
    });
    assert(
      'Disabled evaluator is blocked with HTTP 403 ACCOUNT_DISABLED',
      disabledQueueAttempt.status === 403 && disabledQueueAttempt.body.code === 'ACCOUNT_DISABLED'
    );

    // ─────────────────────────────────────────────────────────────
    // SUITE 4: Task Catalogue Management
    // ─────────────────────────────────────────────────────────────
    console.log('\n── SUITE 4: Task Catalogue Management ─────────────────────────');
    const testTaskId = `task-eval-test-${time}`;
    const createTaskRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/admin/tasks',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        taskId: testTaskId,
        title: 'Prompt Optimization & Context Constraint Design',
        description: 'Design a system prompt that handles edge-case adversarial inputs.',
        category: 'Prompt Engineering',
        level: 2,
      },
    });
    assert(
      'Admin can create a new evaluation task',
      createTaskRes.status === 201 && createTaskRes.body.task.taskId === testTaskId
    );

    const listTasksRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/admin/tasks',
      headers: { Authorization: `Bearer ${learner1Token}` },
    });
    assert(
      'Learners can list available tasks',
      listTasksRes.status === 200 && listTasksRes.body.tasks.length > 0
    );

    // ─────────────────────────────────────────────────────────────
    // SUITE 5: Task Submission & Learner Access
    // ─────────────────────────────────────────────────────────────
    console.log('\n── SUITE 5: Task Submission & Learner Access ──────────────────');
    const emptySub = await makeRequest(server, {
      method: 'POST',
      path: '/api/submissions',
      headers: { Authorization: `Bearer ${learner1Token}` },
      body: { taskId: testTaskId, answerContent: '' },
    });
    assert('Empty answerContent submission is rejected with HTTP 400', emptySub.status === 400);

    const validSubRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/submissions',
      headers: { Authorization: `Bearer ${learner1Token}` },
      body: {
        taskId: testTaskId,
        answerContent:
          'SYSTEM PROMPT:\nYou are an AI assistant specialized in medical diagnostics. Maintain strict patient privacy under HIPAA rules.',
      },
    });
    assert(
      'Learner can submit task solution and initial status is "submitted"',
      validSubRes.status === 201 &&
        validSubRes.body.submission.status === 'submitted' &&
        validSubRes.body.submission.statusHistory.length === 1 &&
        validSubRes.body.submission.statusHistory[0].fromStatus === 'none' &&
        validSubRes.body.submission.statusHistory[0].toStatus === 'submitted'
    );

    const submissionId = validSubRes.body.submission._id || validSubRes.body.submission.id;

    const listMySubs = await makeRequest(server, {
      method: 'GET',
      path: '/api/submissions',
      headers: { Authorization: `Bearer ${learner1Token}` },
    });
    assert(
      'Learner can list their own submissions',
      listMySubs.status === 200 && listMySubs.body.submissions.length >= 1
    );

    const viewOwnSub = await makeRequest(server, {
      method: 'GET',
      path: `/api/submissions/${submissionId}`,
      headers: { Authorization: `Bearer ${learner1Token}` },
    });
    assert('Learner can view their own submission', viewOwnSub.status === 200);

    const viewOtherSub = await makeRequest(server, {
      method: 'GET',
      path: `/api/submissions/${submissionId}`,
      headers: { Authorization: `Bearer ${learner2Token}` },
    });
    assert(
      'Learner cannot view another learner’s submission (HTTP 403 Forbidden)',
      viewOtherSub.status === 403
    );

    // ─────────────────────────────────────────────────────────────
    // SUITE 6: Evaluator Queue & Self-Review Prevention
    // ─────────────────────────────────────────────────────────────
    console.log('\n── SUITE 6: Evaluator Queue & Self-Review Prevention ─────────');
    const queueRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/evaluator/queue',
      headers: { Authorization: `Bearer ${evaluator1Token}` },
    });
    assert(
      'Evaluator queue lists submitted tasks with waiting time',
      queueRes.status === 200 &&
        queueRes.body.queue.length >= 1 &&
        typeof queueRes.body.queue[0].waitingTimeMs === 'number' &&
        Boolean(queueRes.body.queue[0].waitingTimeFormatted)
    );

    // Self-review prevention: Have evaluator1 submit a task as a learner, then attempt to claim it
    const selfSubRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/submissions',
      headers: { Authorization: `Bearer ${evaluator1Token}` },
      body: {
        taskId: testTaskId,
        answerContent: 'Self evaluation submission by evaluator 1',
      },
    });
    const selfSubId = selfSubRes.body.submission._id || selfSubRes.body.submission.id;

    const selfClaimAttempt = await makeRequest(server, {
      method: 'POST',
      path: `/api/evaluator/submissions/${selfSubId}/claim`,
      headers: { Authorization: `Bearer ${evaluator1Token}` },
    });
    assert(
      'Evaluator cannot claim their own submission (HTTP 403 SELF_REVIEW_FORBIDDEN)',
      selfClaimAttempt.status === 403 && selfClaimAttempt.body.code === 'SELF_REVIEW_FORBIDDEN'
    );

    const selfReviewAttempt = await makeRequest(server, {
      method: 'POST',
      path: `/api/evaluator/submissions/${selfSubId}/review`,
      headers: { Authorization: `Bearer ${evaluator1Token}` },
      body: {
        rubricScores: { accuracy: 5, critical_thinking: 5, clarity: 5, ai_application: 5 },
        writtenFeedback: 'Self feedback',
        decision: 'accepted',
      },
    });
    assert(
      'Evaluator cannot review their own submission (HTTP 403 SELF_REVIEW_FORBIDDEN)',
      selfReviewAttempt.status === 403 && selfReviewAttempt.body.code === 'SELF_REVIEW_FORBIDDEN'
    );

    // ─────────────────────────────────────────────────────────────
    // SUITE 7: Atomic Concurrency on Submission Claim
    // ─────────────────────────────────────────────────────────────
    console.log('\n── SUITE 7: Atomic Concurrency on Submission Claim ───────────');
    // Evaluator 1 and Evaluator 2 race to claim submissionId concurrently
    const [claim1, claim2] = await Promise.all([
      makeRequest(server, {
        method: 'POST',
        path: `/api/evaluator/submissions/${submissionId}/claim`,
        headers: { Authorization: `Bearer ${evaluator1Token}` },
      }),
      makeRequest(server, {
        method: 'POST',
        path: `/api/evaluator/submissions/${submissionId}/claim`,
        headers: { Authorization: `Bearer ${evaluator2Token}` },
      }),
    ]);

    const claimSuccessCount = [claim1, claim2].filter((c) => c.status === 200).length;
    const claimConflictCount = [claim1, claim2].filter((c) => c.status === 409).length;

    assert(
      'Two evaluators claiming the same submission concurrently: exactly one succeeds (200), other receives 409 Conflict',
      claimSuccessCount === 1 && claimConflictCount === 1
    );

    const winningEvaluatorToken = claim1.status === 200 ? evaluator1Token : evaluator2Token;
    const losingEvaluatorToken = claim1.status === 200 ? evaluator2Token : evaluator1Token;

    // ─────────────────────────────────────────────────────────────
    // SUITE 8: Rubric & Written Feedback Validation
    // ─────────────────────────────────────────────────────────────
    console.log('\n── SUITE 8: Rubric & Written Feedback Validation ─────────────');
    // Missing written feedback
    const missingFeedback = await makeRequest(server, {
      method: 'POST',
      path: `/api/evaluator/submissions/${submissionId}/review`,
      headers: { Authorization: `Bearer ${winningEvaluatorToken}` },
      body: {
        rubricScores: { accuracy: 4, critical_thinking: 4, clarity: 4, ai_application: 4 },
        writtenFeedback: '',
      },
    });
    assert(
      'Review with empty written feedback is rejected with HTTP 400',
      missingFeedback.status === 400
    );

    // Missing a rubric criterion
    const missingCriterion = await makeRequest(server, {
      method: 'POST',
      path: `/api/evaluator/submissions/${submissionId}/review`,
      headers: { Authorization: `Bearer ${winningEvaluatorToken}` },
      body: {
        rubricScores: { accuracy: 4, critical_thinking: 4, clarity: 4 }, // missing ai_application
        writtenFeedback: 'Overall strong prompt, but missing benchmark tests.',
      },
    });
    assert(
      'Review missing one of the rubric criteria is rejected with HTTP 400',
      missingCriterion.status === 400
    );

    // Score out of bounds
    const outOfBoundsScore = await makeRequest(server, {
      method: 'POST',
      path: `/api/evaluator/submissions/${submissionId}/review`,
      headers: { Authorization: `Bearer ${winningEvaluatorToken}` },
      body: {
        rubricScores: { accuracy: 6, critical_thinking: 4, clarity: 4, ai_application: 4 }, // 6 is > 5
        writtenFeedback: 'Good try',
      },
    });
    assert(
      'Review with rubric score > 5 is rejected with HTTP 400',
      outOfBoundsScore.status === 400
    );

    // Wrong evaluator trying to review
    const wrongEvalReview = await makeRequest(server, {
      method: 'POST',
      path: `/api/evaluator/submissions/${submissionId}/review`,
      headers: { Authorization: `Bearer ${losingEvaluatorToken}` },
      body: {
        rubricScores: { accuracy: 4, critical_thinking: 4, clarity: 4, ai_application: 4 },
        writtenFeedback: 'Good try',
        decision: 'accepted',
      },
    });
    assert(
      'Evaluator who did not claim the submission cannot review it (HTTP 403 Forbidden)',
      wrongEvalReview.status === 403 && wrongEvalReview.body.code === 'NOT_ASSIGNED_EVALUATOR'
    );

    // ─────────────────────────────────────────────────────────────
    // SUITE 9: Status Transitions & Revision Workflow
    // ─────────────────────────────────────────────────────────────
    console.log('\n── SUITE 9: Status Transitions & Revision Workflow ───────────');
    // Valid review requesting revision
    const validRevisionReview = await makeRequest(server, {
      method: 'POST',
      path: `/api/evaluator/submissions/${submissionId}/review`,
      headers: { Authorization: `Bearer ${winningEvaluatorToken}` },
      body: {
        rubricScores: { accuracy: 3, critical_thinking: 4, clarity: 3, ai_application: 3 },
        writtenFeedback:
          'Solid prompt structure, but please add few-shot demonstrations to improve boundary compliance.',
        decision: 'revision_requested',
      },
    });
    assert(
      'Evaluator successfully reviews and requests revision (status becomes revision_requested)',
      validRevisionReview.status === 200 &&
        validRevisionReview.body.submission.status === 'revision_requested'
    );

    // Check status history recorded transition
    const subAfterReview = validRevisionReview.body.submission;
    const historyToStatus = subAfterReview.statusHistory.map((h: any) => h.toStatus);
    assert(
      'Status history accurately recorded progression (in_review -> feedback_given -> revision_requested)',
      historyToStatus.includes('in_review') &&
        historyToStatus.includes('feedback_given') &&
        historyToStatus.includes('revision_requested')
    );

    // Learner resubmits
    const resubmitRes = await makeRequest(server, {
      method: 'POST',
      path: `/api/submissions/${submissionId}/resubmit`,
      headers: { Authorization: `Bearer ${learner1Token}` },
      body: {
        answerContent:
          'REVISED SYSTEM PROMPT:\nAdded two few-shot examples for adversarial edge cases.',
      },
    });
    assert(
      'Learner resubmits task when revision is requested (increments revisionCount to 1, status resets to submitted)',
      resubmitRes.status === 200 &&
        resubmitRes.body.submission.status === 'submitted' &&
        resubmitRes.body.submission.revisionCount === 1 &&
        resubmitRes.body.submission.evaluator === null
    );

    // Resubmitting when NOT in revision_requested must be rejected
    const invalidResubmitAttempt = await makeRequest(server, {
      method: 'POST',
      path: `/api/submissions/${submissionId}/resubmit`,
      headers: { Authorization: `Bearer ${learner1Token}` },
      body: { answerContent: 'Another edit' },
    });
    assert(
      'Resubmitting when status is already "submitted" is rejected with HTTP 400',
      invalidResubmitAttempt.status === 400 &&
        invalidResubmitAttempt.body.code === 'INVALID_STATUS_TRANSITION'
    );

    // Evaluator claims revision and accepts it
    const claimRevision = await makeRequest(server, {
      method: 'POST',
      path: `/api/evaluator/submissions/${submissionId}/claim`,
      headers: { Authorization: `Bearer ${evaluator2Token}` },
    });
    assert('Evaluator claims resubmission (moves to in_review)', claimRevision.status === 200);

    const acceptReview = await makeRequest(server, {
      method: 'POST',
      path: `/api/evaluator/submissions/${submissionId}/review`,
      headers: { Authorization: `Bearer ${evaluator2Token}` },
      body: {
        rubricScores: { accuracy: 5, critical_thinking: 5, clarity: 5, ai_application: 5 },
        writtenFeedback:
          'Excellent revisions! The few-shot examples completely solve boundary failure modes.',
        decision: 'accepted',
      },
    });
    assert(
      'Evaluator accepts resubmission (status transitions to "accepted")',
      acceptReview.status === 200 && acceptReview.body.submission.status === 'accepted'
    );

    // Attempting to review an already accepted submission is rejected
    const repeatReviewAttempt = await makeRequest(server, {
      method: 'POST',
      path: `/api/evaluator/submissions/${submissionId}/review`,
      headers: { Authorization: `Bearer ${evaluator2Token}` },
      body: {
        rubricScores: { accuracy: 5, critical_thinking: 5, clarity: 5, ai_application: 5 },
        writtenFeedback: 'Extra review',
        decision: 'accepted',
      },
    });
    assert(
      'Submitting review for an already accepted submission is rejected with HTTP 400',
      repeatReviewAttempt.status === 400 &&
        repeatReviewAttempt.body.code === 'INVALID_STATUS_TRANSITION'
    );

    // ─────────────────────────────────────────────────────────────
    // SUITE 10: Audit Log & Summary Report
    // ─────────────────────────────────────────────────────────────
    console.log('\n── SUITE 10: Audit Log & Summary Report ───────────────────────');
    const auditLogsRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/admin/audit-logs',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const auditActions = auditLogsRes.body.auditLogs.map((l: any) => l.action);
    assert(
      'Audit log contains recorded entries for admin and evaluator actions',
      auditLogsRes.status === 200 &&
        auditActions.includes('CREATE_EVALUATOR') &&
        auditActions.includes('DISABLE_EVALUATOR') &&
        auditActions.includes('CREATE_TASK') &&
        auditActions.includes('CLAIM_SUBMISSION') &&
        auditActions.includes('SUBMIT_REVIEW')
    );

    const summaryReportRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/admin/reports/summary',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      'Admin summary report provides counts by status and average review time',
      summaryReportRes.status === 200 &&
        typeof summaryReportRes.body.summary.statusCounts.accepted === 'number' &&
        summaryReportRes.body.summary.statusCounts.accepted >= 1 &&
        typeof summaryReportRes.body.summary.metrics.averageReviewTimeMs === 'number' &&
        Boolean(summaryReportRes.body.summary.metrics.averageReviewTimeFormatted)
    );

    // ─────────────────────────────────────────────────────────────
    // SUITE 11: Credits Invariance (Requirement 10)
    // ─────────────────────────────────────────────────────────────
    console.log('\n── SUITE 11: Credits Invariance Verification ──────────────────');
    assert(
      'Learner 1 credit balance is completely unchanged (500 AC)',
      learner1User.aiimsCredits === 500
    );
    assert(
      'Evaluator 1 credit balance is completely unchanged (200 AC)',
      evaluator1User.aiimsCredits === 200
    );
    assert(
      'Admin credit balance is completely unchanged (1000 AC)',
      adminUser.aiimsCredits === 1000
    );

    // ─────────────────────────────────────────────────────────────
    // SUITE 12: Migration Script Verification (--dry-run)
    // ─────────────────────────────────────────────────────────────
    console.log('\n── SUITE 12: Migration Script Verification ────────────────────');
    const { migrateUserRoles } = await import('./migrateUserRoles');
    const dryRunResult = await migrateUserRoles(true);
    assert(
      'migrateUserRoles --dry-run completes cleanly with inspected count without performing writes',
      typeof dryRunResult.inspected === 'number' && dryRunResult.migrated === 0
    );
  } finally {
    server.close();
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }

  console.log('\n===============================================================');
  console.log(`TEST RESULTS: ${passed} PASSED / ${failed} FAILED (Total: ${passed + failed})`);
  console.log('===============================================================');

  if (failed > 0) {
    console.error('Failed checks:');
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL TASK SUBMISSION & EVALUATION TESTS PASSED CLEANLY!\n');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
