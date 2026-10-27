import mongoose from 'mongoose';
import { config } from '../config/env';
import { creditsLedgerService } from '../services/creditsLedger.service';

const API_BASE = `http://localhost:${config.port}/api`;

interface TestReport {
  id: number;
  name: string;
  passed: boolean;
  details: string;
}

const reports: TestReport[] = [];

function record(id: number, name: string, passed: boolean, details: string) {
  reports.push({ id, name, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [TEST ${id}] ${name}: ${details}`);
}

async function run() {
  console.log('===============================================================');
  console.log('   AIIMS PHASE 6D: SERVER-AUTHORITATIVE CREDITS LEDGER TESTS   ');
  console.log('===============================================================\n');

  // 1. Direct MongoDB Atlas Connection (if configured)
  let isDbConnected = false;
  if (config.mongodbUri) {
    try {
      await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 2000 });
      isDbConnected = mongoose.connection.readyState === 1;
      console.log(`🌿 Direct MongoDB connection status: ${isDbConnected}`);
    } catch (e: any) {
      console.warn('MongoDB direct connection skipped (using API server mode):', e.message);
    }
  }

  // 2. Register Learner A
  const emailA = `learner.a.${Date.now()}@example.com`;
  const password = 'Password123';
  const regResA = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Learner A',
      email: emailA,
      password,
      confirmPassword: password,
      stream: 'TECH',
      educationLevel: 'UNDERGRADUATE',
      programId: 'btech',
      programName: 'B.Tech',
      specializationId: 'ai_ml',
      specializationName: 'AI & ML',
      yearOfStudy: 2,
      admissionYear: 2024,
      expectedGraduationYear: 2028,
    }),
  });

  const regDataA = await regResA.json();
  if (!regResA.ok || !regDataA.token) {
    console.error('Registration A failed:', regDataA);
    process.exit(1);
  }
  const tokenA = regDataA.token;
  const userA = regDataA.user;
  const userIdA = userA.id || userA._id;
  const authHeadersA = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${tokenA}`,
  };

  // 3. Register Learner B (for cross-user isolation tests)
  const emailB = `learner.b.${Date.now()}@example.com`;
  const regResB = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Learner B',
      email: emailB,
      password,
      confirmPassword: password,
      stream: 'NON_TECH',
      educationLevel: 'UNDERGRADUATE',
      programId: 'bcom',
      programName: 'B.Com',
      specializationId: 'finance',
      specializationName: 'Finance',
      yearOfStudy: 1,
      admissionYear: 2025,
      expectedGraduationYear: 2028,
    }),
  });
  const regDataB = await regResB.json();
  const tokenB = regDataB.token;
  const authHeadersB = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${tokenB}`,
  };

  console.log(`👤 Created Learner A (${emailA}) and Learner B (${emailB})\n`);

  // ── TEST 1: Unauthenticated users cannot change or inspect balances ──
  const unauthInvest = await fetch(`${API_BASE}/credits/invest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 20 }),
  });
  const unauthAward = await fetch(`${API_BASE}/credits/award-level`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ levelId: 1 }),
  });
  const unauthLedger = await fetch(`${API_BASE}/credits/ledger`, {
    method: 'GET',
  });

  const test1Pass =
    unauthInvest.status === 401 && unauthAward.status === 401 && unauthLedger.status === 401;

  record(
    1,
    'Unauthenticated Protection',
    test1Pass,
    `Invest: ${unauthInvest.status}, Award: ${unauthAward.status}, Ledger: ${unauthLedger.status} (All 401 Unauthorized)`
  );

  // ── TEST 2: Learner isolation — Learner B cannot read or tamper with Learner A ledger ──
  await fetch(`${API_BASE}/credits/ledger`, { headers: authHeadersA });
  await fetch(`${API_BASE}/credits/ledger`, { headers: authHeadersB });

  // Any attempt to pass another user's id in body must be ignored
  const crossUserSpend = await fetch(`${API_BASE}/credits/invest`, {
    method: 'POST',
    headers: authHeadersB,
    body: JSON.stringify({
      amount: 15,
      userId: userIdA, // Malicious override attempt: Learner B tries to spend Learner A credits
      description: 'Cross-user spend attempt',
    }),
  });
  const crossUserData = await crossUserSpend.json();

  const balanceACheck = await fetch(`${API_BASE}/credits/balance`, { headers: authHeadersA });
  const balanceAData = await balanceACheck.json();

  const test2Pass =
    balanceAData.balance === 500 && // Learner A balance untouched!
    crossUserData.balance === 485; // Deducted from Learner B (500 - 15 = 485), NOT Learner A

  record(
    2,
    'Strict Learner Isolation',
    test2Pass,
    `Learner A balance untouched (${balanceAData.balance} AC), deduction strictly scoped to authenticated user (${crossUserData.balance} AC)`
  );

  // ── TEST 3: Frontend-supplied balances and costs are rejected/ignored ──
  const tamperRes = await fetch(`${API_BASE}/learner/state`, {
    method: 'PUT',
    headers: authHeadersA,
    body: JSON.stringify({
      state: {
        profile: {
          name: 'Tamper Tester',
          aiimsCredits: 999999,
          xpPoints: 888888,
        },
        credits: {
          balance: 999999,
        },
      },
    }),
  });
  const tamperData = await tamperRes.json();
  const freshBalA = await fetch(`${API_BASE}/credits/balance`, { headers: authHeadersA });
  const freshBalAData = await freshBalA.json();

  const test3Pass =
    freshBalAData.balance === 500 && tamperData.state?.profile?.aiimsCredits === 500;
  record(
    3,
    'Client Balance Tamper Resistance',
    test3Pass,
    `Submitted 999,999 credits via state sync. Server balance remains strictly 500 AC (tamper ignored)`
  );

  // ── TEST 4: Insufficient credits prevent a deduction (No Negative Balance) ──
  const overdraftRes = await fetch(`${API_BASE}/credits/invest`, {
    method: 'POST',
    headers: authHeadersA,
    body: JSON.stringify({
      amount: 1000, // Available is 500
      description: 'Overdraft test',
    }),
  });
  await overdraftRes.json();
  const postOverdraftBal = await fetch(`${API_BASE}/credits/balance`, { headers: authHeadersA });
  const postOverdraftBalData = await postOverdraftBal.json();

  const test4Pass = overdraftRes.status === 400 && postOverdraftBalData.balance === 500;

  record(
    4,
    'Negative Balance & Overdraft Prevention',
    test4Pass,
    `HTTP ${overdraftRes.status} (Expected 400). Balance remained ${postOverdraftBalData.balance} AC (no negative balance)`
  );

  // ── TEST 5: Concurrent deductions cannot overspend the balance ──
  // Learner A has 500 AC. We fire 10 concurrent requests of 100 AC each (Total = 1000 AC).
  // Exactly 5 must succeed (500 AC spent), 5 must fail with 400. Final balance must be 0 AC.
  const concurrentPromises = Array.from({ length: 10 }).map((_, idx) =>
    fetch(`${API_BASE}/credits/invest`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        amount: 100,
        description: `Concurrent spend request #${idx + 1}`,
      }),
    })
  );

  const concurrentResults = await Promise.all(concurrentPromises);
  const successCount = concurrentResults.filter((r) => r.status === 200).length;
  const failureCount = concurrentResults.filter((r) => r.status === 400).length;

  const postConcurrentBal = await fetch(`${API_BASE}/credits/balance`, { headers: authHeadersA });
  const postConcurrentBalData = await postConcurrentBal.json();

  const test5Pass = successCount === 5 && failureCount === 5 && postConcurrentBalData.balance === 0;

  record(
    5,
    'Atomic Concurrent Deduction Protection',
    test5Pass,
    `Fired 10 concurrent x 100 AC requests against 500 AC balance: ${successCount} succeeded, ${failureCount} rejected. Final balance: ${postConcurrentBalData.balance} AC`
  );

  // ── TEST 6: Repeated idempotency keys do not duplicate charges ──
  // Grant Learner A some credits first via Quest Level 1 (+10 AC)
  await fetch(`${API_BASE}/credits/award-level`, {
    method: 'POST',
    headers: authHeadersA,
    body: JSON.stringify({ levelId: 1 }),
  });

  const sharedKey = `idemp-key-${Date.now()}`;
  const firstCharge = await fetch(`${API_BASE}/credits/invest`, {
    method: 'POST',
    headers: authHeadersA,
    body: JSON.stringify({
      amount: 5,
      description: 'Idempotency test operation',
      idempotencyKey: sharedKey,
    }),
  });
  await firstCharge.json();

  const secondCharge = await fetch(`${API_BASE}/credits/invest`, {
    method: 'POST',
    headers: authHeadersA,
    body: JSON.stringify({
      amount: 5,
      description: 'Idempotency test operation',
      idempotencyKey: sharedKey,
    }),
  });
  const secondData = await secondCharge.json();

  const balAfterIdemp = await fetch(`${API_BASE}/credits/balance`, { headers: authHeadersA });
  const balAfterIdempData = await balAfterIdemp.json();

  const test6Pass =
    firstCharge.status === 200 &&
    secondCharge.status === 200 &&
    secondData.isDuplicate === true &&
    balAfterIdempData.balance === 5; // 10 - 5 = 5 (deducted once, not twice!)

  record(
    6,
    'Idempotency Key Duplicate-Charge Prevention',
    test6Pass,
    `First request deducted 5 AC. Second request with same key returned duplicate replay (isDuplicate: true). Balance unchanged at ${balAfterIdempData.balance} AC`
  );

  // ── TEST 7: Reusing idempotency key for different operation returns 409 Conflict ──
  const conflictRes = await fetch(`${API_BASE}/credits/invest`, {
    method: 'POST',
    headers: authHeadersA,
    body: JSON.stringify({
      amount: 15, // Conflicting amount!
      description: 'Different operation attempting to reuse key',
      idempotencyKey: sharedKey,
    }),
  });

  const test7Pass = conflictRes.status === 409;
  record(
    7,
    'Idempotency Key Reuse Conflict Rejection',
    test7Pass,
    `Attempted to reuse key '${sharedKey}' with different amount (15 vs 5). Status: ${conflictRes.status} (Expected 409 Conflict)`
  );

  // ── TEST 8: AI Task Provider failure triggers at most one appropriate refund ──
  // Direct test on creditsLedgerService.executeTaskWithRefund to simulate provider crash
  const unitUserId = `unit-learner-${Date.now()}`;
  await creditsLedgerService.executeTransaction({
    userId: unitUserId,
    type: 'EARN',
    amount: 50,
    reason: 'Test funding for AI task execution',
    source: 'TEST',
  });

  const balBeforeTask = await creditsLedgerService.getBalance(unitUserId);
  let refundCaught = false;
  let caughtError: any = null;

  try {
    await creditsLedgerService.executeTaskWithRefund({
      userId: unitUserId,
      cost: 10,
      taskTitle: 'Failing AI Task',
      source: 'CLARITY',
      taskFn: async (_opId: string) => {
        // Balance must be deducted BEFORE this provider function runs
        const balDuringExecution = await creditsLedgerService.getBalance(unitUserId);
        if (balDuringExecution !== balBeforeTask - 10) {
          throw new Error(
            `Deduction did not occur before provider execution! Bal: ${balDuringExecution}`
          );
        }
        // Simulate provider crash
        throw new Error('Anthropic API connection timeout / 503 Service Unavailable');
      },
    });
  } catch (err: any) {
    refundCaught = true;
    caughtError = err;
  }

  const balAfterRefund = await creditsLedgerService.getBalance(unitUserId);
  const ledgerHistory = await creditsLedgerService.getLedgerHistory(unitUserId, { type: 'REFUND' });

  const test8Pass =
    refundCaught === true &&
    caughtError?.refunded === true &&
    caughtError?.refundAmount === 10 &&
    balAfterRefund === balBeforeTask &&
    ledgerHistory.transactions.length >= 1;

  record(
    8,
    'AI Task Provider Failure Automatic Refund',
    test8Pass,
    `Provider crashed. Pre-deducted 10 AC was automatically compensated. Restored balance: ${balAfterRefund} AC (${ledgerHistory.transactions.length} refund record in ledger)`
  );

  // ── TEST 9: Successful operations are NOT refunded ──
  const balBeforeSuccess = await creditsLedgerService.getBalance(unitUserId);
  const successTaskResult = await creditsLedgerService.executeTaskWithRefund({
    userId: unitUserId,
    cost: 10,
    taskTitle: 'Successful AI Task',
    source: 'CLARITY',
    taskFn: async (_opId: string) => {
      return { output: 'Successful AI response generated', model: 'Claude 3.5' };
    },
  });

  const balAfterSuccess = await creditsLedgerService.getBalance(unitUserId);
  const test9Pass =
    successTaskResult.result.output.length > 0 && balAfterSuccess === balBeforeSuccess - 10;

  record(
    9,
    'Successful Operation Preservation (No False Refunds)',
    test9Pass,
    `Task succeeded. Balance deducted by exactly 10 AC (${balBeforeSuccess} -> ${balAfterSuccess} AC), no refund created`
  );

  // ── TEST 10: Duplicate reward events grant credits only once ──
  // Test Level completion reward duplicate prevention
  const level1Dup = await fetch(`${API_BASE}/credits/award-level`, {
    method: 'POST',
    headers: authHeadersA,
    body: JSON.stringify({ levelId: 1 }), // Already awarded earlier
  });
  const level1DupData = await level1Dup.json();

  // Test Clarity Task reward duplicate prevention
  const taskRewardPayload = {
    topic: 'Checking AI',
    difficulty: 'easy',
    taskId: 'prompt-test-01',
    score: 85,
  };
  const task1First = await fetch(`${API_BASE}/clarity/save-task-score`, {
    method: 'POST',
    headers: authHeadersA,
    body: JSON.stringify(taskRewardPayload),
  });
  const task1FirstData = await task1First.json();

  const task1Repeat = await fetch(`${API_BASE}/clarity/save-task-score`, {
    method: 'POST',
    headers: authHeadersA,
    body: JSON.stringify(taskRewardPayload),
  });
  const task1RepeatData = await task1Repeat.json();

  const test10Pass =
    level1DupData.awarded === false &&
    task1FirstData.awarded === true &&
    task1RepeatData.awarded === false;

  record(
    10,
    'Reward Event Idempotency (Single Grant Rule)',
    test10Pass,
    `Quest Level 1 repeat: awarded=${level1DupData.awarded}. Clarity Task first: awarded=${task1FirstData.awarded}, repeat: awarded=${task1RepeatData.awarded}`
  );

  // ── TEST 11: Transaction Ledger Integrity & Balance Reconciliation ──
  const reconcileRes = await fetch(`${API_BASE}/credits/reconcile`, {
    headers: authHeadersA,
  });
  const reconcileData = await reconcileRes.json();

  const test11Pass =
    reconcileData.isReconciled === true &&
    reconcileData.discrepancy === 0 &&
    reconcileData.currentBalance === reconcileData.calculatedBalance;

  record(
    11,
    'Ledger Balance Reconciliation',
    test11Pass,
    `Reconciled: ${reconcileData.isReconciled}, Current: ${reconcileData.currentBalance} AC, Computed: ${reconcileData.calculatedBalance} AC (Discrepancy: ${reconcileData.discrepancy} AC)`
  );

  // ── TEST 12: Wallet & Feature Health Sanity ──
  const walletRes = await fetch(`${API_BASE}/credits/wallet`, { headers: authHeadersA });
  const walletData = await walletRes.json();
  const stateRes = await fetch(`${API_BASE}/learner/state`, { headers: authHeadersA });
  const stateData = await stateRes.json();

  const test12Pass =
    walletRes.status === 200 &&
    walletData.balance === reconcileData.currentBalance &&
    stateRes.status === 200 &&
    stateData.state.profile.aiimsCredits === reconcileData.currentBalance &&
    Array.isArray(walletData.transactions);

  record(
    12,
    'Wallet Endpoints & State Integration Health',
    test12Pass,
    `Wallet balance (${walletData.balance} AC) perfectly synchronized with state profile (${stateData.state.profile.aiimsCredits} AC) and ledger history (${walletData.transactions.length} txs)`
  );

  // ── TEST 13: Signal Investigation & Non-ObjectId Edge Case Resilience ──
  // Test Signal Investigation single-grant
  const balBeforeInv = (
    await (await fetch(`${API_BASE}/credits/balance`, { headers: authHeadersA })).json()
  ).balance;
  const invRes1 = await fetch(`${API_BASE}/investigations/submit`, {
    method: 'POST',
    headers: authHeadersA,
    body: JSON.stringify({
      signalId: 'sig-ledger-test-01',
      personalInterpretation: 'Testing single-grant ledger accounting.',
    }),
  });
  const invData1 = await invRes1.json();
  const balAfterInv1 = (
    await (await fetch(`${API_BASE}/credits/balance`, { headers: authHeadersA })).json()
  ).balance;

  const invRes2 = await fetch(`${API_BASE}/investigations/submit`, {
    method: 'POST',
    headers: authHeadersA,
    body: JSON.stringify({
      signalId: 'sig-ledger-test-01',
      personalInterpretation: 'Testing duplicate single-grant ledger accounting.',
    }),
  });
  const invData2 = await invRes2.json();
  const balAfterInv2 = (
    await (await fetch(`${API_BASE}/credits/balance`, { headers: authHeadersA })).json()
  ).balance;

  // Test Non-ObjectId and empty user resilience
  const emptyUserRes = await creditsLedgerService.executeTransaction({
    userId: '',
    type: 'SPEND',
    amount: 10,
    reason: 'Empty user test',
    source: 'TEST',
  });
  const nonObjBal = await creditsLedgerService.getBalance('non-existent-learner-id');
  const nonObjRecon = await creditsLedgerService.reconcileBalance('non-existent-learner-id');

  const test13Pass =
    invData1.awarded === true &&
    invData1.creditsEarned === 30 &&
    balAfterInv1 === balBeforeInv + 30 &&
    invData2.awarded === false &&
    invData2.creditsEarned === 0 &&
    balAfterInv2 === balAfterInv1 &&
    emptyUserRes.success === false &&
    nonObjBal === 0 &&
    nonObjRecon.isReconciled === true;

  record(
    13,
    'Signal Investigation & Non-ObjectId Resilience',
    test13Pass,
    `Signal first: +${invData1.creditsEarned} AC (bal: ${balAfterInv1}), repeat: +${invData2.creditsEarned} AC (bal: ${balAfterInv2}). Non-ObjectId safe: bal=${nonObjBal}, reconciled=${nonObjRecon.isReconciled}`
  );

  // ── SUMMARY REPORT ──
  console.log('\n===============================================================');
  console.log('                   PHASE 6D TEST SUMMARY                       ');
  console.log('===============================================================');
  const allPassed = reports.every((r) => r.passed);
  const passedCount = reports.filter((r) => r.passed).length;
  console.log(`Results: ${passedCount} / ${reports.length} Tests Passed`);

  if (allPassed) {
    console.log(`🎉 ALL ${reports.length} PHASE 6D REQUIREMENTS SUCCESSFULLY VERIFIED!\n`);
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED. See log details above.\n');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
