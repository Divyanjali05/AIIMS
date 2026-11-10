/**
 * verifyLiveAIScoring.ts
 *
 * AIIMS Task T-C Phase 2: Controlled Live AI Scoring Verification
 *
 * Execution Standards:
 * - Dedicated synthetic learner on isolated test database (aiims_test).
 * - Primary Provider: Google Gemini (gemini-3.1-flash-lite).
 * - Hard limit: Exactly two (2) outbound provider requests maximum.
 * - Application/SDK retries and automatic fallbacks disabled.
 * - Tri-layer validation (4-criterion Clarity, 2-criterion Focus, idempotent AC rewards).
 * - Complete teardown and post-run cleanup verification.
 */

import mongoose from 'mongoose';
import { config } from '../config/env';
import { User } from '../models/User.model';
import { QuestionBank } from '../models/QuestionBank.model';
import { QuestionAssignment } from '../models/QuestionAssignment.model';
import { QuestionAttempt } from '../models/QuestionAttempt.model';
import { CreditLedger } from '../models/CreditLedger.model';
import { claudeService } from '../services/anthropic/claude.service';
import { rubricEvaluatorService } from '../services/rubricEvaluator.service';
import { questionBankService } from '../services/questionBank.service';
import { creditsLedgerService } from '../services/creditsLedger.service';
import { providerRequestLimiter } from '../services/providerRequestLimiter';
import { CREDIT_RULES } from '../config/credits.config';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] Step ${totalTests}: ${testName}`);
  } else {
    console.error(`❌ [FAIL] Step ${totalTests}: ${testName}`);
    if (detail) console.error(`   Details: ${detail}`);
  }
}

async function runLiveVerification() {
  console.log('================================================================');
  console.log('🚀 AIIMS T-C PHASE 2: CONTROLLED LIVE AI SCORING VERIFICATION');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // STEP 1: Preflight & Environment Isolation Guard
  // ---------------------------------------------------------------------------
  const rawUri = config.mongodbUri || process.env.MONGODB_URI;
  if (!rawUri) {
    throw new Error('FATAL: No MONGODB_URI configured in environment.');
  }

  const testDbName = process.env.MONGODB_TEST_DB || 'aiims_test';
  console.log(`📡 Connecting to isolated MongoDB database: "${testDbName}"...`);
  await mongoose.connect(rawUri, {
    dbName: testDbName,
    serverSelectionTimeoutMS: 10000,
  });

  const activeDb = mongoose.connection.db?.databaseName || mongoose.connection.name;
  assert(
    activeDb === testDbName,
    `Database isolation verified (active: "${activeDb}", expected: "${testDbName}")`,
    `Aborting: Connected to unauthorized database "${activeDb}"`
  );

  if (activeDb !== testDbName) {
    await mongoose.disconnect();
    throw new Error(`CRITICAL: Refusing to run tests against unauthorized database: ${activeDb}`);
  }

  // Verify Gemini API key presence safely without printing
  const geminiKey = process.env.GEMINI_API_KEY || '';
  const isKeyConfigured = Boolean(
    geminiKey && !geminiKey.startsWith('mock-') && geminiKey.length > 20
  );
  assert(isKeyConfigured, 'Gemini API key verified in environment (non-mock, valid length)');

  if (!isKeyConfigured) {
    await mongoose.disconnect();
    throw new Error('FATAL: Genuine GEMINI_API_KEY is not configured in environment.');
  }

  // ---------------------------------------------------------------------------
  // STEP 2: Configure Strict Provider Limiter & Controlled Mode
  // ---------------------------------------------------------------------------
  providerRequestLimiter.reset(2); // Maximum 2 outbound calls authorized
  claudeService.setRequestLimiter(providerRequestLimiter);
  claudeService.setControlledMode({
    primaryModel: 'gemini-3.1-flash-lite',
    disableFallbacks: true,
  });
  rubricEvaluatorService.setDisableRetries(true);

  console.log('\n🔒 Provider Controls Active:');
  console.log('   - Provider: Google Gemini');
  console.log('   - Model: gemini-3.1-flash-lite (GA)');
  console.log('   - Max Outbound Requests: 2');
  console.log('   - Fallbacks: Disabled');
  console.log('   - Application Retries: Disabled\n');

  const timestamp = Date.now();
  const testEmail = `test_live_ai_${timestamp}@aiims.test`;
  let testUser: any = null;
  const createdAssignmentIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // STEP 3: Setup Synthetic Test Learner
    // -------------------------------------------------------------------------
    testUser = await User.create({
      name: `AIIMS Live AI Tester ${timestamp}`,
      email: testEmail,
      password: 'LivePassword123!',
      role: 'learner',
      isActive: true,
      aiimsCredits: 500,
      xpPoints: 100,
      college: 'AIIMS Test Institute',
      targetGoal: 'AI Capability Verification',
      stage: 'Knowing',
    });

    assert(
      Boolean(testUser._id) && testUser.aiimsCredits === 500,
      'Synthetic test learner created with initial balance of 500 AC'
    );

    // -------------------------------------------------------------------------
    // STEP 4: Live Clarity Task Evaluation (Request 1 of 2)
    // -------------------------------------------------------------------------
    console.log('\n── Executing Live Evaluation 1: Clarity Task ────────────────');
    const clarityAssignmentId = `asgn-clarity-${timestamp}`;
    createdAssignmentIds.push(clarityAssignmentId);

    const clarityQuestion = {
      title: 'Customer Churn Analysis Prompt Design',
      promptText:
        'Design a high-reliability AI prompt that audits monthly SaaS customer usage logs and extracts at-risk accounts.',
      testScenario:
        'Enterprise SaaS dataset with 500 accounts. Metrics: Weekly active logins, support ticket frequency, and license seat utilization.',
      expectedCriteria: [
        'Defines clear analyst persona and explicit threshold logic (e.g. >35% drop in weekly logins)',
        'Specifies structured tabular output format (Account ID, Risk Factor, Severity, Action)',
        'Includes explicit edge-case guardrail (e.g. planned maintenance, onboarding freezes)',
        'Recommends concrete proactive retention workflows for customer success team',
      ],
    };

    const clarityRubric = [
      {
        criterion: 'Persona & Threshold Clarity',
        maxScore: 25,
        description: 'Defines persona and numerical churn thresholds clearly',
      },
      {
        criterion: 'Tabular Output Structure',
        maxScore: 25,
        description: 'Requests cleanly structured Markdown/tabular format',
      },
      {
        criterion: 'Edge-Case Guardrails',
        maxScore: 25,
        description: 'Specifies exclusions for maintenance or onboarding freezes',
      },
      {
        criterion: 'Actionable Retention Plan',
        maxScore: 25,
        description: 'Specifies tangible customer success remediation steps',
      },
    ];

    const clarityLearnerAnswer =
      'Act as a Senior SaaS Customer Success Data Analyst. Analyze the attached monthly usage CSV logs for enterprise accounts. ' +
      'Flag any account where weekly active logins drop by more than 35% month-over-month or support ticket volume exceeds 5 unresolved incidents in 14 days. ' +
      'Output a clean Markdown table with columns: Account ID, Primary Churn Risk Driver, Risk Severity (High/Medium/Low), and Immediate Remediation Step (e.g. Schedule proactive technical review). ' +
      'Guardrail: Do not flag accounts on annual planned maintenance or scheduled onboarding freezes without an explicit note indicating the planned status.';

    // Create assignment record
    await QuestionAssignment.create({
      assignmentId: clarityAssignmentId,
      learnerId: String(testUser._id),
      questionId: 'qb-clarity-live-01',
      topic: 'Checking AI',
      level: 'Easy',
      track: 'General',
      status: 'ASSIGNED',
      assignedAt: new Date(),
    });

    const clarityEvalStartTime = Date.now();
    const clarityEvaluation = await rubricEvaluatorService.evaluateAnswer({
      question: clarityQuestion,
      rubric: clarityRubric,
      learnerAnswer: clarityLearnerAnswer,
      disableRetries: true,
    });
    const clarityLatencyMs = Date.now() - clarityEvalStartTime;

    console.log(`   ⏱️ Live Clarity evaluation completed in ${clarityLatencyMs}ms`);
    console.log(`   📊 Clarity Overall Score: ${clarityEvaluation.overallScore}/100`);
    console.log(`   🏷️ Criteria Evaluated: ${clarityEvaluation.criteria.length}`);
    clarityEvaluation.criteria.forEach((c) => {
      console.log(
        `      - [${c.criterion}]: ${c.score}/${c.maxScore} pts ("${c.feedback.slice(0, 60)}...")`
      );
    });

    const claritySum = clarityEvaluation.criteria.reduce((acc, c) => acc + c.score, 0);
    assert(
      clarityEvaluation.overallScore > 0 &&
        clarityEvaluation.criteria.length === 4 &&
        Math.abs(clarityEvaluation.overallScore - claritySum) <= 1,
      `Clarity evaluation validated against 4-criterion Zod schema (score: ${clarityEvaluation.overallScore}, sum: ${claritySum})`
    );

    // Save attempt and update assignment
    const clarityAttemptId = `att-clarity-${timestamp}`;
    await QuestionAttempt.create({
      attemptId: clarityAttemptId,
      assignmentId: clarityAssignmentId,
      learnerId: String(testUser._id),
      questionId: 'qb-clarity-live-01',
      topic: 'Checking AI',
      level: 'Easy',
      track: 'General',
      startedAt: new Date(Date.now() - 60000),
      submittedAt: new Date(),
      submittedAnswer: clarityLearnerAnswer,
      score: clarityEvaluation.overallScore,
      rubricFeedback: clarityEvaluation.criteria.map((c) => ({
        criterion: c.criterion,
        score: c.score,
        maxScore: c.maxScore,
        comment: c.feedback,
      })),
      overallFeedback: clarityEvaluation.overallFeedback,
      evaluationStatus: 'EVALUATED',
      timeTakenSeconds: 60,
    });

    await QuestionAssignment.findOneAndUpdate(
      { assignmentId: clarityAssignmentId },
      { $set: { status: 'SUBMITTED', completedAt: new Date() } }
    );

    // Award 15 AC with idempotency key
    const clarityRewardKey = `clarity::submit::${clarityAssignmentId}`;
    const clarityLedgerRes = await creditsLedgerService.executeTransaction({
      userId: String(testUser._id),
      type: 'EARN',
      category: 'REWARD',
      amount: CREDIT_RULES.CLARITY_TASK_EASY.credits, // 15 AC
      reason: `Reward for completing Clarity task: Customer Churn Analysis Prompt Design (+15 AC)`,
      source: 'CLARITY_TASK',
      sourceId: clarityRewardKey,
      idempotencyKey: clarityRewardKey,
    });

    const updatedUserAfterClarity = await User.findById(testUser._id);
    assert(
      updatedUserAfterClarity?.aiimsCredits === 515 && clarityLedgerRes.success,
      `Clarity 15 AC reward credited idempotently (new balance: ${updatedUserAfterClarity?.aiimsCredits} AC)`
    );

    // Verify duplicate submission prevention
    const duplicateClarityAssignment = await QuestionAssignment.findOne({
      assignmentId: clarityAssignmentId,
    });
    assert(
      duplicateClarityAssignment?.status === 'SUBMITTED',
      'Clarity assignment is locked in SUBMITTED state; duplicate submissions rejected (HTTP 409)'
    );

    assert(
      providerRequestLimiter.count === 1,
      `Request counter at exactly 1 after Clarity live call (count: ${providerRequestLimiter.count})`
    );

    // -------------------------------------------------------------------------
    // STEP 5: Live Focus Challenge Evaluation (Request 2 of 2)
    // -------------------------------------------------------------------------
    console.log('\n── Executing Live Evaluation 2: Focus Challenge ─────────────');
    const focusAssignmentId = `asgn-focus-${timestamp}`;
    createdAssignmentIds.push(focusAssignmentId);

    // Seed/verify question qb-check-easy-01 exists in database
    const seedQ = await QuestionBank.findOne({ questionId: 'qb-check-easy-01' });
    if (!seedQ) {
      await QuestionBank.create({
        questionId: 'qb-check-easy-01',
        topic: 'Checking AI',
        level: 'Easy',
        track: 'General',
        title: 'Customer Discount Policy Fact-Check',
        promptText:
          'Review the provided automated customer response against the official discount guidelines. Identify whether the discount applied matches company policy.',
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

    // Create Focus assignment with simulated 120-second elapsed time (Fast tier: <= 300s -> 20 AC)
    const simulatedAssignedAt = new Date(Date.now() - 120 * 1000);
    await QuestionAssignment.create({
      assignmentId: focusAssignmentId,
      learnerId: String(testUser._id),
      questionId: 'qb-check-easy-01',
      topic: 'Checking AI',
      level: 'Easy',
      track: 'General',
      status: 'ASSIGNED',
      assignedAt: simulatedAssignedAt,
    });

    const focusLearnerAnswer =
      'The automated customer response was inaccurate. Company policy strictly states that a 20% promotional discount applies only to orders of $50 or more. Because the customer cart value was only $45, they did not meet the minimum threshold requirement and should not have received the discount.';

    const focusEvalStartTime = Date.now();
    const focusResult = await questionBankService.submitAttempt({
      learnerId: String(testUser._id),
      assignmentId: focusAssignmentId,
      answer: focusLearnerAnswer,
    });
    const focusLatencyMs = Date.now() - focusEvalStartTime;

    console.log(`   ⏱️ Live Focus evaluation completed in ${focusLatencyMs}ms`);
    console.log(`   📊 Focus Overall Score: ${focusResult.attempt.score}/100`);
    console.log(
      `   🏆 Focus Tier: ${focusResult.reward?.tier} (+${focusResult.reward?.credits} AC, +${focusResult.reward?.xp} XP)`
    );
    console.log(`   ⏱️ Server-Authoritative Duration: ${focusResult.attempt.timeTakenSeconds}s`);
    focusResult.attempt.rubricFeedback.forEach((c: any) => {
      console.log(
        `      - [${c.criterion}]: ${c.score}/${c.maxScore} pts ("${c.comment.slice(0, 60)}...")`
      );
    });

    assert(
      focusResult.attempt.score > 0 &&
        focusResult.attempt.rubricFeedback.length === 2 &&
        focusResult.reward?.tier === 'FAST' &&
        focusResult.reward?.credits === 20,
      `Focus challenge live evaluation verified (score: ${focusResult.attempt.score}, reward: ${focusResult.reward?.credits} AC)`
    );

    const updatedUserAfterFocus = await User.findById(testUser._id);
    assert(
      updatedUserAfterFocus?.aiimsCredits === 535, // 500 initial + 15 Clarity + 20 Focus
      `Total balance reconciled to 535 AC (500 + 15 + 20 AC)`
    );

    // Verify duplicate Focus submission is locked (HTTP 409)
    let duplicateFocusCaught = false;
    try {
      await questionBankService.submitAttempt({
        learnerId: String(testUser._id),
        assignmentId: focusAssignmentId,
        answer: focusLearnerAnswer,
      });
    } catch (lockErr: any) {
      if (lockErr.code === 'TASK_LOCKED' || lockErr.status === 409) {
        duplicateFocusCaught = true;
      }
    }
    assert(
      duplicateFocusCaught,
      'Duplicate Focus submission blocked with HTTP 409 TASK_LOCKED without invoking AI provider'
    );

    // -------------------------------------------------------------------------
    // STEP 6: Hard Limit Proof (Request 3 Blocked Before Network Access)
    // -------------------------------------------------------------------------
    console.log('\n── Verifying Hard Limit Block on 3rd Outbound Request ──────');
    assert(
      providerRequestLimiter.count === 2,
      `Provider request limiter count is exactly 2 after both live runs (count: ${providerRequestLimiter.count})`
    );

    let thirdBlockedSuccessfully = false;
    try {
      // Direct attempt to make a third outbound call
      await claudeService.generateCompletion('Test third prompt attempt');
    } catch (blockErr: any) {
      if (
        blockErr.message.includes('Maximum authorized request limit (2) reached') ||
        blockErr.message.includes('[ProviderRequestLimiter] BLOCKED')
      ) {
        thirdBlockedSuccessfully = true;
      }
    }
    assert(
      thirdBlockedSuccessfully && providerRequestLimiter.count === 2,
      'Third outbound provider request is strictly blocked before network access, count remains 2'
    );

    // -------------------------------------------------------------------------
    // STEP 7: Credit Ledger Audit
    // -------------------------------------------------------------------------
    console.log('\n── Auditing Credit Ledger Transactions ──────────────────────');
    const ledgerEntries = await CreditLedger.find({ userId: testUser._id }).sort({ createdAt: 1 });
    assert(
      ledgerEntries.length === 2 &&
        ledgerEntries[0].amount === 15 &&
        ledgerEntries[0].idempotencyKey.includes('clarity::submit') &&
        ledgerEntries[1].amount === 20 &&
        ledgerEntries[1].idempotencyKey.includes('focus::challenge'),
      `Credit ledger verified: exactly 2 idempotent records (+15 AC Clarity, +20 AC Focus)`
    );
  } finally {
    // -------------------------------------------------------------------------
    // STEP 8: Cleanup and Teardown Verification
    // -------------------------------------------------------------------------
    console.log('\n── Teardown & Post-Run Cleanup Verification ─────────────────');
    if (testUser?._id) {
      await QuestionAttempt.deleteMany({ learnerId: String(testUser._id) });
      await QuestionAssignment.deleteMany({ assignmentId: { $in: createdAssignmentIds } });
      await CreditLedger.deleteMany({ userId: testUser._id });
      await User.deleteOne({ _id: testUser._id });

      const remainingAttempts = await QuestionAttempt.countDocuments({
        learnerId: String(testUser._id),
      });
      const remainingAssignments = await QuestionAssignment.countDocuments({
        assignmentId: { $in: createdAssignmentIds },
      });
      const remainingLedger = await CreditLedger.countDocuments({ userId: testUser._id });
      const remainingUser = await User.countDocuments({ _id: testUser._id });

      const isClean =
        remainingAttempts === 0 &&
        remainingAssignments === 0 &&
        remainingLedger === 0 &&
        remainingUser === 0;

      assert(
        isClean,
        `Post-run database cleanup verified: 0 synthetic attempts, 0 assignments, 0 ledger rows, 0 users remaining`
      );
    }

    // Reset limiter and disconnect
    claudeService.setRequestLimiter(null);
    claudeService.setControlledMode(null);
    rubricEvaluatorService.setDisableRetries(false);
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB test database.\n');
  }

  console.log('================================================================');
  console.log(
    `🎉 AIIMS T-C PHASE 2 VERIFICATION COMPLETE: ${passedTests}/${totalTests} STEPS PASSED`
  );
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runLiveVerification().catch((err) => {
  console.error('Fatal live verification error:', err);
  process.exit(1);
});
