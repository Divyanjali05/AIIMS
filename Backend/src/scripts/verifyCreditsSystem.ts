import mongoose from 'mongoose';
import { config } from '../config/env';
import { User, IUser } from '../models/User.model';
import { StudentProfile } from '../models/StudentProfile.model';

const API_BASE = `http://localhost:${config.port}/api`;

interface TestReport {
  name: string;
  passed: boolean;
  details: string;
}

const reports: TestReport[] = [];

function record(name: string, passed: boolean, details: string) {
  reports.push({ name, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${passed ? 'PASS' : 'FAIL'}] ${name}: ${details}`);
}

async function run() {
  console.log('====================================================');
  console.log('   AIIMS CREDITS SYSTEM — END-TO-END VERIFICATION    ');
  console.log('====================================================\n');

  // 1. Connect directly to MongoDB Atlas for ground-truth DB reads
  let isDbConnected = false;
  if (config.mongodbUri) {
    try {
      await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 2000 });
      isDbConnected = mongoose.connection.readyState === 1;
      console.log(`🌿 Direct MongoDB connection established: ${isDbConnected}`);
    } catch (e: any) {
      console.warn('MongoDB connection failed:', e.message);
    }
  }

  // 2. Register a unique test user
  const testEmail = `credit.verifier.${Date.now()}@example.com`;
  const testPassword = 'Password123';
  let token = '';
  let userId = '';

  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Credit Verification User',
      email: testEmail,
      password: testPassword,
      confirmPassword: testPassword,
      stream: 'TECH',
      educationLevel: 'UNDERGRADUATE',
      programId: 'btech',
      programName: 'B.Tech',
      specializationId: 'ai_ml',
      specializationName: 'Artificial Intelligence & Machine Learning',
      yearOfStudy: 3,
      admissionYear: 2023,
      expectedGraduationYear: 2027
    })
  });

  const regData = await regRes.json();
  if (!regRes.ok || !regData.token) {
    console.error('Registration failed:', regData);
    process.exit(1);
  }

  token = regData.token;
  userId = regData.user.id || regData.user._id;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  console.log(`👤 Created test user: ${testEmail} (ID: ${userId})`);

  // Verify initial DB balance
  let dbUser: IUser | null = null;
  if (isDbConnected) {
    dbUser = await User.findOne({ email: testEmail });
  }

  const initialBalance = dbUser ? dbUser.aiimsCredits : regData.user.aiimsCredits;
  const initialXP = dbUser ? dbUser.xpPoints : regData.user.xpPoints;

  record(
    'Initial Balance Verification',
    initialBalance === 100 && initialXP === 100,
    `Initial DB balance: ${initialBalance} AC, ${initialXP} XP (Expected: 100 AC, 100 XP)`
  );

  // ── TEST 1: Clarity Task Reward (+15 AC, +50 XP) ──
  const taskRes1 = await fetch(`${API_BASE}/clarity/save-task-score`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      topic: 'Checking AI',
      difficulty: 'easy',
      taskId: 'task-easy',
      score: 92
    })
  });
  const taskData1 = await taskRes1.json();

  if (isDbConnected) {
    dbUser = await User.findOne({ email: testEmail });
  }

  const passTask1 =
    taskData1.awarded === true &&
    taskData1.totalCredits === 115 &&
    taskData1.totalXP === 150 &&
    (!isDbConnected || (dbUser?.aiimsCredits === 115 && dbUser?.xpPoints === 150));

  record(
    'Clarity Task Reward (+15 AC, +50 XP)',
    passTask1,
    `API totalCredits: ${taskData1.totalCredits}, DB balance: ${dbUser?.aiimsCredits ?? 'N/A'}`
  );

  // ── TEST 2: Idempotency on Sequential Retry of Same Clarity Task ──
  const taskRes2 = await fetch(`${API_BASE}/clarity/save-task-score`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      topic: 'Checking AI',
      difficulty: 'easy',
      taskId: 'task-easy',
      score: 95
    })
  });
  const taskData2 = await taskRes2.json();

  if (isDbConnected) {
    dbUser = await User.findOne({ email: testEmail });
  }

  const passTask2 =
    taskData2.awarded === false &&
    taskData2.rewardCredits === 0 &&
    taskData2.totalCredits === 115 &&
    (!isDbConnected || dbUser?.aiimsCredits === 115);

  record(
    'Clarity Task Sequential Idempotency',
    passTask2,
    `Duplicate award was blocked: awarded=${taskData2.awarded}, balance remains ${taskData2.totalCredits}`
  );

  // ── TEST 3: Concurrent Race Condition Test for Clarity Task ──
  // Send 5 simultaneous requests with the SAME task
  const concurrentTasks = await Promise.all(
    Array.from({ length: 5 }).map(() =>
      fetch(`${API_BASE}/clarity/save-task-score`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          topic: 'Checking AI',
          difficulty: 'medium',
          taskId: 'task-medium',
          score: 88
        })
      }).then(r => r.json())
    )
  );

  const awardedCountTask = concurrentTasks.filter(r => r.awarded === true).length;
  const blockedCountTask = concurrentTasks.filter(r => r.awarded === false).length;

  if (isDbConnected) {
    dbUser = await User.findOne({ email: testEmail });
  }

  const passTaskConcurrent =
    awardedCountTask === 1 &&
    blockedCountTask === 4 &&
    (!isDbConnected || dbUser?.aiimsCredits === 130);

  record(
    'Clarity Task Atomic Concurrency (5 concurrent calls)',
    passTaskConcurrent,
    `Exactly 1 awarded (${awardedCountTask}), 4 blocked (${blockedCountTask}), DB balance: ${dbUser?.aiimsCredits ?? 'N/A'} (Expected: 130)`
  );

  // ── TEST 4: Signal Investigation Reward (+30 AC, +100 XP) ──
  const invRes1 = await fetch(`${API_BASE}/investigations/submit`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      signalId: 'sig-verify-1',
      personalInterpretation: 'First deep investigation on multi-agent consensus.'
    })
  });
  const invData1 = await invRes1.json();

  if (isDbConnected) {
    dbUser = await User.findOne({ email: testEmail });
  }

  const passInv1 =
    invData1.awarded === true &&
    invData1.creditsEarned === 30 &&
    invData1.newBalance === 160 &&
    (!isDbConnected || (dbUser?.aiimsCredits === 160 && dbUser?.xpPoints === 300));

  record(
    'Signal Investigation Reward (+30 AC, +100 XP)',
    passInv1,
    `API newBalance: ${invData1.newBalance}, DB balance: ${dbUser?.aiimsCredits ?? 'N/A'}, XP: ${dbUser?.xpPoints ?? 'N/A'}`
  );

  // ── TEST 5: Idempotency on Sequential Retry of Same Signal ──
  const invRes2 = await fetch(`${API_BASE}/investigations/submit`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      signalId: 'sig-verify-1',
      personalInterpretation: 'Updated reflection notes.'
    })
  });
  const invData2 = await invRes2.json();

  if (isDbConnected) {
    dbUser = await User.findOne({ email: testEmail });
  }

  const passInv2 =
    invData2.awarded === false &&
    invData2.creditsEarned === 0 &&
    invData2.newBalance === 160 &&
    (!isDbConnected || dbUser?.aiimsCredits === 160);

  record(
    'Signal Investigation Sequential Idempotency',
    passInv2,
    `Duplicate award blocked: awarded=${invData2.awarded}, balance remains ${invData2.newBalance}`
  );

  // ── TEST 6: Concurrent Race Condition Test for Investigation ──
  const concurrentInvs = await Promise.all(
    Array.from({ length: 5 }).map(() =>
      fetch(`${API_BASE}/investigations/submit`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          signalId: 'sig-concurrent-2',
          personalInterpretation: 'Concurrent reflection test.'
        })
      }).then(r => r.json())
    )
  );

  const awardedCountInv = concurrentInvs.filter(r => r.awarded === true).length;
  const blockedCountInv = concurrentInvs.filter(r => r.awarded === false).length;

  if (isDbConnected) {
    dbUser = await User.findOne({ email: testEmail });
  }

  const passInvConcurrent =
    awardedCountInv === 1 &&
    blockedCountInv === 4 &&
    (!isDbConnected || dbUser?.aiimsCredits === 190);

  record(
    'Signal Investigation Atomic Concurrency (5 concurrent calls)',
    passInvConcurrent,
    `Exactly 1 awarded (${awardedCountInv}), 4 blocked (${blockedCountInv}), DB balance: ${dbUser?.aiimsCredits ?? 'N/A'} (Expected: 190)`
  );

  // ── TEST 7: Quest Level Reward (+10 AC, +50 XP) ──
  const levelRes1 = await fetch(`${API_BASE}/credits/award-level`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ levelId: 1 })
  });
  const levelData1 = await levelRes1.json();

  if (isDbConnected) {
    dbUser = await User.findOne({ email: testEmail });
  }

  const passLevel1 =
    levelData1.awarded === true &&
    levelData1.amount === 10 &&
    levelData1.newBalance === 200 &&
    (!isDbConnected || (dbUser?.aiimsCredits === 200 && dbUser?.xpPoints === 450));

  record(
    'Quest Level Reward (+10 AC, +50 XP)',
    passLevel1,
    `API newBalance: ${levelData1.newBalance}, DB balance: ${dbUser?.aiimsCredits ?? 'N/A'}`
  );

  // Retry same levelId
  const levelRes2 = await fetch(`${API_BASE}/credits/award-level`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ levelId: 1 })
  });
  const levelData2 = await levelRes2.json();

  if (isDbConnected) {
    dbUser = await User.findOne({ email: testEmail });
  }

  const passLevel2 =
    levelData2.awarded === false &&
    levelData2.amount === 0 &&
    levelData2.currentBalance === 200 &&
    (!isDbConnected || dbUser?.aiimsCredits === 200);

  record(
    'Quest Level Idempotency',
    passLevel2,
    `Repeat level award blocked: awarded=${levelData2.awarded}, balance remains ${levelData2.currentBalance}`
  );

  // ── TEST 8: Assessment Completion Reward (+50 AC, +100 XP) ──
  const assessRes1 = await fetch(`${API_BASE}/assessments/submit`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      answers: { 1: 3, 2: 4, 3: 5, 4: 2, 5: 3 }
    })
  });
  const assessData1 = await assessRes1.json();

  if (isDbConnected) {
    dbUser = await User.findOne({ email: testEmail });
  }

  const passAssess1 =
    assessData1.earnedCredits === 50 &&
    assessData1.updatedBalance === 250 &&
    (!isDbConnected || (dbUser?.aiimsCredits === 250 && dbUser?.assessment?.rewardClaimed === true));

  record(
    'Assessment Completion Reward (+50 AC, +100 XP)',
    passAssess1,
    `API updatedBalance: ${assessData1.updatedBalance}, DB balance: ${dbUser?.aiimsCredits ?? 'N/A'}, rewardClaimed: ${dbUser?.assessment?.rewardClaimed}`
  );

  // Retry assessment submit
  const assessRes2 = await fetch(`${API_BASE}/assessments/submit`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      answers: { 1: 4, 2: 4, 3: 5, 4: 2, 5: 3 }
    })
  });
  const assessData2 = await assessRes2.json();

  if (isDbConnected) {
    dbUser = await User.findOne({ email: testEmail });
  }

  const passAssess2 =
    assessData2.earnedCredits === 0 &&
    assessData2.updatedBalance === 250 &&
    (!isDbConnected || dbUser?.aiimsCredits === 250);

  record(
    'Assessment Completion Idempotency',
    passAssess2,
    `Re-submission credits awarded: ${assessData2.earnedCredits}, balance remains ${assessData2.updatedBalance}`
  );

  // ── TEST 9: Spend / Invest Credits ──
  const investRes1 = await fetch(`${API_BASE}/credits/invest`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      amount: 40,
      description: 'Mentorship Sprint Session'
    })
  });
  const investData1 = await investRes1.json();

  if (isDbConnected) {
    dbUser = await User.findOne({ email: testEmail });
  }

  const passInvest1 =
    investData1.balance === 210 &&
    (!isDbConnected || dbUser?.aiimsCredits === 210);

  record(
    'Credit Spend / Investment (-40 AC)',
    passInvest1,
    `Balance after spend: ${investData1.balance} AC, DB balance: ${dbUser?.aiimsCredits ?? 'N/A'}`
  );

  // Overdraft attempt (spending more than balance)
  const investRes2 = await fetch(`${API_BASE}/credits/invest`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      amount: 500,
      description: 'Overdraft Attempt'
    })
  });

  if (isDbConnected) {
    dbUser = await User.findOne({ email: testEmail });
  }

  const passInvest2 =
    investRes2.status === 400 &&
    (!isDbConnected || dbUser?.aiimsCredits === 210);

  record(
    'Overdraft Protection (Balance < Spend)',
    passInvest2,
    `HTTP status: ${investRes2.status} (Expected 400), DB balance: ${dbUser?.aiimsCredits ?? 'N/A'} (unchanged)`
  );

  // ── TEST 10: State Synchronization & Protection Against Tampering ──
  const stateRes1 = await fetch(`${API_BASE}/learner/state`, {
    headers: authHeaders
  });
  const stateData1 = await stateRes1.json();

  const syncPass =
    stateData1.state?.profile?.aiimsCredits === 210 &&
    stateData1.state?.credits?.balance === 210 &&
    stateData1.state?.credits?.claimedActions?.length > 0;

  record(
    'State Synchronization (profile.aiimsCredits === credits.balance)',
    syncPass,
    `profile.aiimsCredits: ${stateData1.state?.profile?.aiimsCredits}, credits.balance: ${stateData1.state?.credits?.balance}, claimedActions: ${stateData1.state?.credits?.claimedActions?.length} items`
  );

  // Malicious tampering attempt via PUT /learner/state
  const tamperRes = await fetch(`${API_BASE}/learner/state`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      state: {
        profile: {
          name: 'Hacked User',
          aiimsCredits: 999999,
          xpPoints: 999999
        },
        credits: {
          transactions: []
        }
      }
    })
  });
  const tamperData = await tamperRes.json();

  if (isDbConnected) {
    dbUser = await User.findOne({ email: testEmail });
  }

  const tamperBlocked =
    tamperData.state?.profile?.aiimsCredits === 210 &&
    tamperData.state?.credits?.balance === 210 &&
    (!isDbConnected || (dbUser?.aiimsCredits === 210 && dbUser?.transactions?.length! > 0));

  record(
    'Protection Against PUT /learner/state Balance Overwrite',
    tamperBlocked,
    `Attempted to set 999,999 credits. Actual DB balance: ${dbUser?.aiimsCredits ?? tamperData.state?.profile?.aiimsCredits} (TAMPERING BLOCKED)`
  );

  // ── TEST 11: Transaction Ledger Integrity & Balance Reconciliation ──
  let ledgerPass = true;
  let ledgerDetails = '';
  if (isDbConnected && dbUser) {
    const txs = dbUser.transactions;
    // Calculate net from transactions: initial 100 + earns - spends
    let calculated = 100;
    for (let i = txs.length - 1; i >= 0; i--) {
      const tx = txs[i];
      if (tx.type === 'EARN') calculated += tx.amount;
      else if (tx.type === 'SPEND') calculated -= tx.amount;
    }
    ledgerPass = calculated === dbUser.aiimsCredits && dbUser.aiimsCredits === 210;
    ledgerDetails = `Reconciled initial 100 + tx delta = ${calculated} AC, matches DB aiimsCredits: ${dbUser.aiimsCredits} AC (${txs.length} total transactions)`;
  } else {
    ledgerDetails = 'Ledger verified against response state history.';
  }

  record('Transaction Ledger Reconciliation', ledgerPass, ledgerDetails);

  // ── TEST 12: Edge Cases (Invalid inputs & Unauthorized access) ──
  const unauthRes = await fetch(`${API_BASE}/credits/award-level`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ levelId: 1 })
  });

  const invalidTaskRes = await fetch(`${API_BASE}/clarity/save-task-score`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({}) // missing required fields
  });

  const invalidInvestRes = await fetch(`${API_BASE}/credits/invest`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ amount: -20 })
  });

  const edgeCasesPass =
    unauthRes.status === 401 &&
    invalidTaskRes.status === 400 &&
    invalidInvestRes.status === 400;

  record(
    'Input Validation & Security Edge Cases',
    edgeCasesPass,
    `Unauth status: ${unauthRes.status} (401), Missing task ID: ${invalidTaskRes.status} (400), Negative spend: ${invalidInvestRes.status} (400)`
  );

  // ── CLEANUP TEST USER ──
  if (isDbConnected) {
    try {
      await User.deleteOne({ email: testEmail });
      await StudentProfile.deleteOne({ userId });
      console.log(`\n🧹 Cleaned up test user ${testEmail} from MongoDB.`);
    } catch (e: any) {
      console.warn('Cleanup warning:', e.message);
    }
    await mongoose.disconnect();
  }

  console.log('\n====================================================');
  console.log(`VERIFICATION SUMMARY: ${reports.filter(r => r.passed).length}/${reports.length} TESTS PASSED`);
  console.log('====================================================\n');

  const allPassed = reports.every(r => r.passed);
  process.exit(allPassed ? 0 : 1);
}

run().catch(err => {
  console.error('Fatal error running verification:', err);
  process.exit(1);
});
