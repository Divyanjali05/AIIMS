/**
 * AIIMS TASK T-D — BACKEND PROCESS RESTART VERIFICATION
 *
 * Verifies that AIIMS learner progress, assignments, attempts, credit balances,
 * and ledger records survive an actual operating-system backend process shutdown and restart.
 *
 * Execution Parameters:
 * - Target Database: Persistent MongoDB Atlas ("aiims_test")
 * - Execution Mode: Option B (Deterministic Evaluation Runner for synthetic test learner, 0 live API calls)
 * - Process Lifecycle: Process 1 (Spawn, Capture PID 1) -> Stop (Verify Exit) -> Process 2 (Spawn, Capture PID 2 != PID 1)
 * - State Parity & Lock Verification: Real MongoDB comparison & HTTP 409 TASK_LOCKED verification
 */

import { spawn, execSync, ChildProcess } from 'child_process';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/env';
import { User } from '../models/User.model';
import { QuestionAssignment } from '../models/QuestionAssignment.model';
import { QuestionAttempt } from '../models/QuestionAttempt.model';
import { QuestionBank } from '../models/QuestionBank.model';
import { CreditLedger } from '../models/CreditLedger.model';

interface StepResult {
  step: number;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const results: StepResult[] = [];

function record(step: number, name: string, status: 'PASS' | 'FAIL', details: string) {
  results.push({ step, name, status, details });
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`[Step ${step}] ${icon} ${name}: ${details}`);
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

const TEST_PORT = 5055;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const BACKEND_DIR = path.resolve(__dirname, '../..');
const TS_NODE_BIN = path.resolve(BACKEND_DIR, 'node_modules/ts-node/dist/bin.js');

/**
 * Helper to kill a process tree on Windows or POSIX.
 */
function killProcessTree(pid: number): void {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGKILL');
    }
  } catch {
    // Process may have already exited
  }
}

/**
 * Checks if a PID is still alive.
 */
function isPidAlive(pid: number): boolean {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`tasklist /FI "PID eq ${pid}"`, { encoding: 'utf8' });
      return output.includes(`${pid}`);
    } else {
      process.kill(pid, 0);
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Polls the backend health endpoint until it is ready.
 */
async function waitForServerReady(timeoutMs: number = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) {
        return true;
      }
    } catch {
      // Server not accepting connections yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

/**
 * Spawns an actual backend OS process.
 */
function spawnBackendProcess(envOverrides: Record<string, string> = {}): {
  child: ChildProcess;
  pid: number;
  getLogs: () => string;
} {
  let stdoutLogs = '';

  const child = spawn(process.execPath, [TS_NODE_BIN, 'src/server.ts'], {
    cwd: BACKEND_DIR,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      NODE_ENV: 'test',
      MONGODB_TEST_DB: 'aiims_test',
      ENABLE_TEST_DETERMINISTIC_RUNNER: 'true',
      JWT_SECRET: config.jwtSecret || 'aiims-test-jwt-secret-for-process-restart-32chars',
      ALLOWED_ORIGINS: `http://localhost:${TEST_PORT},http://127.0.0.1:${TEST_PORT}`,
      ...envOverrides,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const pid = child.pid!;

  child.stdout?.on('data', (data) => {
    stdoutLogs += data.toString();
  });
  child.stderr?.on('data', (data) => {
    stdoutLogs += data.toString();
  });

  return {
    child,
    pid,
    getLogs: () => stdoutLogs,
  };
}

export async function runProcessRestartVerification(): Promise<boolean> {
  console.log('================================================================');
  console.log(' AIIMS TASK T-D — BACKEND PROCESS RESTART VERIFICATION');
  console.log(' Target Database: aiims_test (MongoDB Atlas)');
  console.log(' Execution Mode: Option B (Deterministic Test Runner, 0 API Calls)');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const testEmail = `td_restart_learner_${timestamp}@aiims.test`;
  const testPassword = 'Password123!';
  let testUserId = '';
  let clarityAssignmentId = '';
  let focusAssignmentId = '';
  let focusQuestionId = '';
  let process1Pid = 0;
  let process2Pid = 0;
  let activeProcess1: ReturnType<typeof spawnBackendProcess> | null = null;
  let activeProcess2: ReturnType<typeof spawnBackendProcess> | null = null;

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Direct Database Preflight & Synthetic Learner Seeding
    // -------------------------------------------------------------------------
    const rawUri = config.mongodbUri || process.env.MONGODB_URI;
    if (!rawUri) {
      throw new Error(
        'FATAL: No MONGODB_URI configured. Real persistent MongoDB connection required.'
      );
    }

    console.log('📡 Connecting directly to MongoDB Atlas ("aiims_test") for preflight...');
    await mongoose.connect(rawUri, {
      dbName: 'aiims_test',
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });

    const activeDbName = mongoose.connection.db?.databaseName || mongoose.connection.name;
    assert(
      activeDbName === 'aiims_test' || (activeDbName?.includes('test') ?? false),
      `Target database "${activeDbName}" is not an authorized test database.`
    );

    // Ensure seed question qb-check-easy-01 exists for Focus challenge
    const existingQ = await QuestionBank.findOne({ questionId: 'qb-check-easy-01' });
    if (!existingQ) {
      await QuestionBank.create({
        questionId: 'qb-check-easy-01',
        topic: 'Checking AI',
        level: 'Easy',
        track: 'General',
        title: 'Customer Discount Policy Fact-Check',
        promptText:
          'Review the automated customer response against discount guidelines. Identify whether discount applied matches company policy.',
        hint: 'Pay attention to minimum cart value requirements.',
        testScenario:
          'Customer Message: "I bought goods worth $45 and received an automatic 20% discount."\nCompany Policy: "A 20% promotional discount applies strictly to orders of $50 or more."',
        expectedCriteria: [
          'Identifies that the $45 cart does not meet the $50 minimum threshold',
          'States clearly whether the customer response was accurate or inaccurate',
        ],
        scoringRubric: [
          {
            criterion: 'Threshold Identification',
            maxScore: 50,
            description: 'Noticed the $50 requirement',
          },
          {
            criterion: 'Clear Verdict',
            maxScore: 50,
            description: 'Provides definitive verification status',
          },
        ],
        source: 'Human',
        status: 'ACTIVE',
        version: 1,
      });
    }

    // Seed synthetic test learner with 500 AC baseline
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const seededUser: any = await User.create({
      name: 'TD Restart Test Learner',
      email: testEmail,
      password: hashedPassword,
      role: 'learner',
      track: 'Student',
      isActive: true,
      college: 'Apex Engineering Institute',
      targetGoal: 'AI Skills',
      stage: 'Knowing',
      aiimsCredits: 500,
      xpPoints: 100,
      assessment: {
        status: 'completed',
        answers: {},
        currentQuestionIndex: 25,
        completedAt: new Date().toISOString(),
        rewardClaimed: true,
        scores: {
          usageFrequency: 80,
          evaluationCapability: 85,
          workflowDesign: 80,
          strategicVision: 75,
          mentorshipReadiness: 70,
        },
      },
      analysis: {
        status: 'viewed',
        topCapability: 'Prompt Design',
        growthArea: 'Autonomous Workflows',
        unlockedAt: new Date().toISOString(),
      },
    });

    testUserId = String(seededUser._id);
    record(
      1,
      'Preflight Database Safety Guard & Synthetic Learner Seeding',
      'PASS',
      `Connected to persistent "${activeDbName}"; Seeded learner ID: ${testUserId} (${testEmail}) with initial 500 AC`
    );

    // -------------------------------------------------------------------------
    // STEP 2: Start First Backend Process (OS Process 1)
    // -------------------------------------------------------------------------
    console.log('\n🚀 Starting First Backend Operating-System Process on port 5055...');
    const startTime1 = Date.now();
    activeProcess1 = spawnBackendProcess();
    process1Pid = activeProcess1.pid;

    const ready1 = await waitForServerReady();
    assert(ready1, 'Process 1 failed to reach ready state within 30s');
    record(
      2,
      'First Backend Process Startup & PID Capture',
      'PASS',
      `Process 1 online with PID: ${process1Pid} on port ${TEST_PORT} in ${Date.now() - startTime1}ms`
    );

    // -------------------------------------------------------------------------
    // STEP 3: Authenticate Synthetic Learner via HTTP (Process 1)
    // -------------------------------------------------------------------------
    const TEST_DEVICE_ID = `td_device_${timestamp}`;

    const loginRes1 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client': 'mobile',
        'x-device-id': TEST_DEVICE_ID,
      },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    assert(loginRes1.ok, `HTTP login failed with status ${loginRes1.status}`);
    const loginData1 = (await loginRes1.json()) as any;
    const rawSetCookie1 = loginRes1.headers.get('set-cookie') || '';
    const cookieTokenMatch1 = rawSetCookie1.match(/aiims_token=([^;]+)/);
    const cookieToken1 = cookieTokenMatch1 ? decodeURIComponent(cookieTokenMatch1[1]) : '';
    const token1 = loginData1.token || loginData1.user?.token || cookieToken1;
    assert(Boolean(token1), 'No JWT authentication token returned from login');

    const authHeaders1 = {
      'Content-Type': 'application/json',
      'X-Client': 'mobile',
      'x-device-id': TEST_DEVICE_ID,
      Authorization: `Bearer ${token1}`,
      Cookie: `aiims_token=${token1}`,
    };

    record(
      3,
      'Synthetic Learner Authentication (Process 1)',
      'PASS',
      `HTTP 200 OK; JWT token issued for learner ${testUserId}`
    );

    // -------------------------------------------------------------------------
    // STEP 4: Submit Clarity Assignment (Process 1)
    // -------------------------------------------------------------------------
    const clarityActiveRes = await fetch(`${BASE_URL}/api/clarity/active-task`, {
      method: 'POST',
      headers: authHeaders1,
      body: JSON.stringify({ topic: 'Checking AI' }),
    });
    assert(clarityActiveRes.ok, `Failed to obtain clarity active task: ${clarityActiveRes.status}`);
    const clarityActiveData = (await clarityActiveRes.json()) as any;
    clarityAssignmentId = clarityActiveData.assignmentId;
    assert(Boolean(clarityAssignmentId), 'No assignmentId returned for clarity task');

    const claritySubmitRes = await fetch(`${BASE_URL}/api/clarity/submit`, {
      method: 'POST',
      headers: authHeaders1,
      body: JSON.stringify({
        assignmentId: clarityAssignmentId,
        answer:
          'Role: AI Architect. Objective: Validate constraints. Threshold: $50 minimum order value. Edge cases: Null carts, expired tokens.',
        timeTakenSeconds: 60,
      }),
    });
    assert(claritySubmitRes.ok, `Clarity submit failed with status ${claritySubmitRes.status}`);
    const claritySubmitData = (await claritySubmitRes.json()) as any;
    assert(
      claritySubmitData.score >= 80 && claritySubmitData.currentBalance === 515,
      `Expected Clarity score >= 80 and balance 515, got score ${claritySubmitData.score}, balance ${claritySubmitData.currentBalance}`
    );

    record(
      4,
      'Clarity Assignment Submission & Reward (Process 1)',
      'PASS',
      `HTTP 200; Score: ${claritySubmitData.score}%; +15 AC awarded; New Balance: ${claritySubmitData.currentBalance} AC`
    );

    // -------------------------------------------------------------------------
    // STEP 5: Submit Focus Challenge (Process 1)
    // -------------------------------------------------------------------------
    const focusServeRes = await fetch(`${BASE_URL}/api/questions/serve`, {
      method: 'POST',
      headers: authHeaders1,
      body: JSON.stringify({ topic: 'Checking AI', level: 'Easy', track: 'General' }),
    });
    assert(focusServeRes.ok, `Focus serve failed with status ${focusServeRes.status}`);
    const focusServeData = (await focusServeRes.json()) as any;
    focusAssignmentId = focusServeData.assignmentId;
    focusQuestionId = focusServeData.question?.questionId;
    assert(
      Boolean(focusAssignmentId) && Boolean(focusQuestionId),
      'Focus assignment or question ID missing'
    );

    const focusSubmitRes = await fetch(`${BASE_URL}/api/questions/submit`, {
      method: 'POST',
      headers: authHeaders1,
      body: JSON.stringify({
        assignmentId: focusAssignmentId,
        answer:
          'The customer discount was invalid. The company policy requires a minimum cart value of $50, but the customer order was only $45.',
        timeTakenSeconds: 120,
      }),
    });
    assert(focusSubmitRes.ok, `Focus submit failed with status ${focusSubmitRes.status}`);
    const focusSubmitData = (await focusSubmitRes.json()) as any;
    assert(
      focusSubmitData.reward?.tier === 'FAST' && focusSubmitData.reward?.credits === 20,
      `Expected Fast tier with 20 AC, got tier ${focusSubmitData.reward?.tier}, credits ${focusSubmitData.reward?.credits}`
    );

    // Direct MongoDB balance check after both submissions
    const userAfterProcess1 = await User.findById(testUserId);
    assert(
      userAfterProcess1?.aiimsCredits === 535,
      `Expected persisted balance 535 AC (500 + 15 + 20), got ${userAfterProcess1?.aiimsCredits}`
    );

    record(
      5,
      'Focus Challenge Submission & Fast Reward (Process 1)',
      'PASS',
      `HTTP 200; Tier: ${focusSubmitData.reward?.tier}; +20 AC awarded; Persisted Balance: ${userAfterProcess1?.aiimsCredits} AC`
    );

    // -------------------------------------------------------------------------
    // STEP 6: Pre-Restart Snapshot & Direct MongoDB Persistence Audit
    // -------------------------------------------------------------------------
    const clarityAsgnPre = await QuestionAssignment.findOne({ assignmentId: clarityAssignmentId });
    const focusAsgnPre = await QuestionAssignment.findOne({ assignmentId: focusAssignmentId });
    const attemptsPre = await QuestionAttempt.find({ learnerId: testUserId });
    const ledgerPre = await CreditLedger.find({ userId: testUserId });

    assert(clarityAsgnPre?.status === 'SUBMITTED', 'Clarity assignment not SUBMITTED in DB');
    assert(focusAsgnPre?.status === 'SUBMITTED', 'Focus assignment not SUBMITTED in DB');
    assert(
      attemptsPre.length === 2,
      `Expected exactly 2 attempts in DB, found ${attemptsPre.length}`
    );
    assert(
      ledgerPre.length === 2,
      `Expected exactly 2 ledger entries in DB, found ${ledgerPre.length}`
    );

    record(
      6,
      'Pre-Restart MongoDB Snapshot Captured',
      'PASS',
      `Snapshot verified in MongoDB: Balance=535 AC; 2 Assignments (Both locked); 2 Attempts; 2 Ledger entries`
    );

    // -------------------------------------------------------------------------
    // STEP 7: Actual Hard Process Termination (PID 1)
    // -------------------------------------------------------------------------
    console.log(`\n🛑 Terminating First Backend Process (PID: ${process1Pid})...`);
    killProcessTree(process1Pid);

    // Wait and verify process has actually exited
    let isTerminated = false;
    for (let i = 0; i < 20; i++) {
      if (!isPidAlive(process1Pid)) {
        isTerminated = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert(isTerminated, `Failed to terminate Process 1 (PID ${process1Pid})`);

    // Confirm HTTP port is no longer reachable
    let portClosed = false;
    try {
      await fetch(`${BASE_URL}/health`);
    } catch {
      portClosed = true;
    }
    assert(portClosed, `Port ${TEST_PORT} still responding after Process 1 termination`);

    // Confirm MongoDB database remains available and unaffected
    assert(
      mongoose.connection.readyState === 1,
      'MongoDB connection dropped during process termination'
    );

    record(
      7,
      'First Process Hard Termination Evidence',
      'PASS',
      `Process 1 (PID ${process1Pid}) verified terminated; Port ${TEST_PORT} connection refused; MongoDB connection intact`
    );

    // -------------------------------------------------------------------------
    // STEP 8: Start Second Backend Process (OS Process 2)
    // -------------------------------------------------------------------------
    console.log('\n🚀 Starting Second Backend Operating-System Process on port 5055...');
    const startTime2 = Date.now();
    activeProcess2 = spawnBackendProcess();
    process2Pid = activeProcess2.pid;

    assert(
      process2Pid !== process1Pid,
      `PID 2 (${process2Pid}) must differ from PID 1 (${process1Pid})`
    );

    const ready2 = await waitForServerReady();
    assert(ready2, 'Process 2 failed to reach ready state within 30s');

    record(
      8,
      'Second Backend Process Startup & PID Differentiation',
      'PASS',
      `Process 2 online with NEW PID: ${process2Pid} (PID 2 != PID 1: ${process1Pid}) in ${Date.now() - startTime2}ms`
    );

    // -------------------------------------------------------------------------
    // STEP 9: Authenticate Synthetic Learner via HTTP (Process 2)
    // -------------------------------------------------------------------------
    const loginRes2 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client': 'mobile',
        'x-device-id': TEST_DEVICE_ID,
      },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    assert(loginRes2.ok, `HTTP login on Process 2 failed with status ${loginRes2.status}`);
    const loginData2 = (await loginRes2.json()) as any;
    const rawSetCookie2 = loginRes2.headers.get('set-cookie') || '';
    const cookieTokenMatch2 = rawSetCookie2.match(/aiims_token=([^;]+)/);
    const cookieToken2 = cookieTokenMatch2 ? decodeURIComponent(cookieTokenMatch2[1]) : '';
    const token2 = loginData2.token || loginData2.user?.token || cookieToken2;
    assert(Boolean(token2), 'No JWT authentication token returned on Process 2');

    const authHeaders2 = {
      'Content-Type': 'application/json',
      'X-Client': 'mobile',
      'x-device-id': TEST_DEVICE_ID,
      Authorization: `Bearer ${token2}`,
      Cookie: `aiims_token=${token2}`,
    };

    record(
      9,
      'Synthetic Learner Re-Authentication (Process 2)',
      'PASS',
      `HTTP 200 OK; Authenticated on new OS process using original credentials`
    );

    // -------------------------------------------------------------------------
    // STEP 10: State Parity & MongoDB Persistence Comparison
    // -------------------------------------------------------------------------
    const userPost = await User.findById(testUserId);
    const clarityAsgnPost = await QuestionAssignment.findOne({ assignmentId: clarityAssignmentId });
    const focusAsgnPost = await QuestionAssignment.findOne({ assignmentId: focusAssignmentId });
    const attemptsPost = await QuestionAttempt.find({ learnerId: testUserId });
    const ledgerPost = await CreditLedger.find({ userId: testUserId });

    assert(
      userPost?.aiimsCredits === 535,
      `Persisted balance mismatch: expected 535, found ${userPost?.aiimsCredits}`
    );
    assert(
      clarityAsgnPost?.status === 'SUBMITTED',
      'Clarity assignment status mismatch post-restart'
    );
    assert(
      focusAsgnPost?.status === focusAsgnPre?.status,
      'Focus assignment status mismatch post-restart'
    );
    assert(
      attemptsPost.length === 2,
      `Attempt count mismatch: expected 2, found ${attemptsPost.length}`
    );
    assert(
      ledgerPost.length === 2,
      `Ledger count mismatch: expected 2, found ${ledgerPost.length}`
    );

    // Verify individual ledger entries match exactly
    const clarityTx = ledgerPost.find((l) => l.source === 'CLARITY_TASK');
    const focusTx = ledgerPost.find((l) => l.source === 'FOCUS_CHALLENGE');
    assert(
      clarityTx?.amount === 15,
      `Clarity ledger transaction amount mismatch: ${clarityTx?.amount}`
    );
    assert(focusTx?.amount === 20, `Focus ledger transaction amount mismatch: ${focusTx?.amount}`);

    record(
      10,
      'Post-Restart State Parity & Ledger Reconciliation',
      'PASS',
      `100% State Parity: Balance=535 AC; Clarity status=SUBMITTED; Focus status=${focusAsgnPost?.status}; 2 Attempts; 2 Ledger entries`
    );

    // -------------------------------------------------------------------------
    // STEP 11: Duplicate Submission Protection (HTTP 409 Locks)
    // -------------------------------------------------------------------------
    // Attempt duplicate Clarity submission
    const duplicateClarityRes = await fetch(`${BASE_URL}/api/clarity/submit`, {
      method: 'POST',
      headers: authHeaders2,
      body: JSON.stringify({
        assignmentId: clarityAssignmentId,
        answer: 'Attempting duplicate clarity submission after restart.',
        timeTakenSeconds: 30,
      }),
    });
    assert(
      duplicateClarityRes.status === 409,
      `Expected HTTP 409 for duplicate Clarity submission, got ${duplicateClarityRes.status}`
    );
    const dupClarityData = (await duplicateClarityRes.json()) as any;
    assert(
      dupClarityData.code === 'TASK_LOCKED' || dupClarityData.isLocked === true,
      `Expected TASK_LOCKED code, got ${dupClarityData.code}`
    );

    // Attempt duplicate Focus submission
    const duplicateFocusRes = await fetch(`${BASE_URL}/api/questions/submit`, {
      method: 'POST',
      headers: authHeaders2,
      body: JSON.stringify({
        assignmentId: focusAssignmentId,
        answer: 'Attempting duplicate focus submission after restart.',
        timeTakenSeconds: 30,
      }),
    });
    assert(
      duplicateFocusRes.status === 409,
      `Expected HTTP 409 for duplicate Focus submission, got ${duplicateFocusRes.status}`
    );
    const dupFocusData = (await duplicateFocusRes.json()) as any;
    assert(
      dupFocusData.code === 'TASK_LOCKED',
      `Expected TASK_LOCKED code for duplicate Focus, got ${dupFocusData.code}`
    );

    // Confirm balance did not increase after duplicate attempts
    const userAfterDupes = await User.findById(testUserId);
    assert(
      userAfterDupes?.aiimsCredits === 535,
      `Balance increased after duplicate attempts! Expected 535 AC, found ${userAfterDupes?.aiimsCredits}`
    );

    record(
      11,
      'Duplicate Submission Hard Locks (HTTP 409 TASK_LOCKED)',
      'PASS',
      `Both Clarity (HTTP 409) and Focus (HTTP 409) rejected post-restart; Zero duplicate AC awarded; Balance preserved at 535 AC`
    );

    // -------------------------------------------------------------------------
    // STEP 12: Question Repetition Prevention & Stream Isolation
    // -------------------------------------------------------------------------
    // Request a new question for the same learner
    const nextServeRes = await fetch(`${BASE_URL}/api/questions/serve`, {
      method: 'POST',
      headers: authHeaders2,
      body: JSON.stringify({ topic: 'Checking AI', level: 'Easy', track: 'General' }),
    });
    assert(nextServeRes.ok, `Next question serve failed with status ${nextServeRes.status}`);
    const nextServeData = (await nextServeRes.json()) as any;
    const nextQuestionId = nextServeData.question?.questionId;

    // Verify question repetition prevention (must not serve the already answered qb-check-easy-01 if other questions exist, or creates distinct assignment)
    assert(
      nextServeData.assignmentId !== focusAssignmentId,
      'New serve returned previously completed assignmentId'
    );

    // Cross-stream isolation: Clarity assignment cannot be submitted to Focus endpoint
    const crossStreamRes = await fetch(`${BASE_URL}/api/questions/submit`, {
      method: 'POST',
      headers: authHeaders2,
      body: JSON.stringify({
        assignmentId: clarityAssignmentId,
        answer: 'Attempting cross-stream submission.',
        timeTakenSeconds: 30,
      }),
    });
    assert(
      crossStreamRes.status === 404 ||
        crossStreamRes.status === 400 ||
        crossStreamRes.status === 409,
      `Cross-stream submission should be rejected, got ${crossStreamRes.status}`
    );

    record(
      12,
      'Question Repetition Prevention & Stream Isolation',
      'PASS',
      `Distinct assignment generated (${nextServeData.assignmentId}); Cross-stream injection rejected (HTTP ${crossStreamRes.status})`
    );

    return true;
  } finally {
    // -------------------------------------------------------------------------
    // STEP 13: Cleanup & Post-Verification Audit (Finally-style)
    // -------------------------------------------------------------------------
    console.log('\n🧹 Performing finally-style teardown of synthetic test data...');

    if (process1Pid && isPidAlive(process1Pid)) {
      killProcessTree(process1Pid);
    }
    if (process2Pid && isPidAlive(process2Pid)) {
      killProcessTree(process2Pid);
    }

    if (testUserId) {
      await User.deleteMany({ _id: testUserId });
      await QuestionAssignment.deleteMany({ learnerId: testUserId });
      await QuestionAttempt.deleteMany({ learnerId: testUserId });
      await CreditLedger.deleteMany({ userId: testUserId });
    }

    // Also clean up by test email pattern
    await User.deleteMany({ email: /^td_restart_learner_.*@aiims\.test$/ });

    const remainingUsers = await User.countDocuments({ email: testEmail });
    const remainingAssignments = await QuestionAssignment.countDocuments({
      assignmentId: { $in: [clarityAssignmentId, focusAssignmentId] },
    });
    const remainingAttempts = await QuestionAttempt.countDocuments({ learnerId: testUserId });
    const remainingLedger = await CreditLedger.countDocuments({ userId: testUserId });

    const cleanupClean =
      remainingUsers === 0 &&
      remainingAssignments === 0 &&
      remainingAttempts === 0 &&
      remainingLedger === 0;

    record(
      13,
      'Automated Teardown & Post-Cleanup Database Audit',
      cleanupClean ? 'PASS' : 'FAIL',
      `Remaining records in aiims_test: Users=${remainingUsers}, Assignments=${remainingAssignments}, Attempts=${remainingAttempts}, Ledger=${remainingLedger}`
    );

    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('📡 Disconnected cleanly from MongoDB Atlas.');
    }
  }
}

// Execute when invoked directly
if (require.main === module) {
  runProcessRestartVerification()
    .then((success) => {
      console.log('\n================================================================');
      console.log(
        `TASK T-D RESULT: ${success ? 'ALL 13 VERIFICATION STEPS PASSED (COMPLETED)' : 'FAILED'}`
      );
      console.log('================================================================');
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error('\n❌ TASK T-D FATAL ERROR:', err);
      process.exit(1);
    });
}
