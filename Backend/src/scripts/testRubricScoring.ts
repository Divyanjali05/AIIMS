import {
  RubricEvaluatorService,
  RubricEvaluationError,
  rubricEvaluatorService,
} from '../services/rubricEvaluator.service';
import { questionBankService } from '../services/questionBank.service';
import { submitAttemptHandler } from '../controllers/question.controller';
import { submitClarityTask } from '../controllers/clarity.controller';
import { inMemoryAssignments } from '../models/QuestionAssignment.model';
import { inMemoryQuestionBank } from '../models/QuestionBank.model';
import { inMemoryAttempts } from '../models/QuestionAttempt.model';
import { ClaudeService } from '../services/anthropic/claude.service';

console.log('====================================================');
console.log('AIIMS TASK T2: 15-POINT GENUINE AI RUBRIC TEST SUITE');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] Test ${totalTests}: ${testName}`);
  } else {
    console.error(`❌ [FAIL] Test ${totalTests}: ${testName}`);
    if (detail) console.error(`   Details: ${detail}`);
  }
}

async function runTestSuite() {
  const sampleQuestion = {
    title: 'Financial Transaction Audit Workflow',
    promptText: 'Audit the flagged transactions and extract anomalies over $50.',
    testScenario:
      'Batch 104 contains: Tx 1: $45 (Valid), Tx 2: $120 (Unapproved vendor), Tx 3: $80 (Duplicate).',
    expectedCriteria: [
      'Identifies Tx 2 ($120) and Tx 3 ($80) as anomalies',
      'Excludes Tx 1 ($45) as compliant with threshold',
      'Specifies remediation actions for each anomaly',
    ],
  };

  const sampleRubric = [
    {
      criterion: 'Accuracy & Threshold Identification',
      maxScore: 25,
      description: 'Accurately isolates transactions above $50.',
    },
    {
      criterion: 'Anomaly Root-Cause Classification',
      maxScore: 25,
      description: 'Identifies unapproved vendor and duplicate flag.',
    },
    {
      criterion: 'Action Plan Clarity',
      maxScore: 25,
      description: 'Provides concrete remediation steps.',
    },
    {
      criterion: 'Conciseness & Structure',
      maxScore: 25,
      description: 'Presents findings cleanly without unnecessary noise.',
    },
  ];

  const validMockPayload = {
    criteria: [
      {
        criterion: 'Accuracy & Threshold Identification',
        score: 25,
        maxScore: 25,
        feedback: 'Correctly identified Tx 2 ($120) and Tx 3 ($80) while excluding Tx 1 ($45).',
      },
      {
        criterion: 'Anomaly Root-Cause Classification',
        score: 24,
        maxScore: 25,
        feedback: 'Explicitly flagged unapproved vendor and duplicate payment causes.',
      },
      {
        criterion: 'Action Plan Clarity',
        score: 23,
        maxScore: 25,
        feedback: 'Detailed hold notices and merchant verification steps provided.',
      },
      {
        criterion: 'Conciseness & Structure',
        score: 24,
        maxScore: 25,
        feedback: 'Logical tabular format with immediate findings.',
      },
    ],
    overallScore: 96,
    overallFeedback: 'Exceptional audit accuracy and remediation structuring.',
  };

  // ---------------------------------------------------------------------------
  // TEST 1: Valid AI response produces valid score and breakdown
  // ---------------------------------------------------------------------------
  const test1Evaluator = new RubricEvaluatorService();
  const test1Res = await test1Evaluator.evaluateAnswer({
    question: sampleQuestion,
    rubric: sampleRubric,
    learnerAnswer:
      'Tx 2 ($120): Unapproved vendor -> Freeze. Tx 3 ($80): Duplicate -> Refund. Tx 1 is compliant.',
    completionRunner: async () => JSON.stringify(validMockPayload),
  });

  assert(
    test1Res.overallScore === 96 &&
      test1Res.criteria.length === 4 &&
      test1Res.criteria[0].score === 25 &&
      test1Res.criteria[1].score === 24 &&
      test1Res.overallFeedback.includes('Exceptional'),
    'Valid AI response produces valid score (96/100) and complete rubric breakdown'
  );

  // ---------------------------------------------------------------------------
  // TEST 2: Criterion score exceeding maxScore rejected (triggers retry/error)
  // ---------------------------------------------------------------------------
  const test2Evaluator = new RubricEvaluatorService();
  let test2Error: RubricEvaluationError | null = null;
  try {
    await test2Evaluator.evaluateAnswer({
      question: sampleQuestion,
      rubric: sampleRubric,
      learnerAnswer: 'Some answer text',
      completionRunner: async () =>
        JSON.stringify({
          ...validMockPayload,
          criteria: [
            {
              criterion: 'Accuracy & Threshold Identification',
              score: 30, // Exceeds maxScore 25
              maxScore: 25,
              feedback: 'Too high score',
            },
            ...validMockPayload.criteria.slice(1),
          ],
        }),
    });
  } catch (err: any) {
    if (err instanceof RubricEvaluationError) test2Error = err;
  }

  assert(
    test2Error !== null &&
      test2Error.code === 'VALIDATION_FAILED_AFTER_RETRY' &&
      test2Error.message.includes('out of bounds'),
    'Criterion score exceeding maxScore (30 > 25) is rejected, fails validation, and throws RubricEvaluationError'
  );

  // ---------------------------------------------------------------------------
  // TEST 3: Negative criterion score rejected
  // ---------------------------------------------------------------------------
  const test3Evaluator = new RubricEvaluatorService();
  let test3Error: RubricEvaluationError | null = null;
  try {
    await test3Evaluator.evaluateAnswer({
      question: sampleQuestion,
      rubric: sampleRubric,
      learnerAnswer: 'Some answer text',
      completionRunner: async () =>
        JSON.stringify({
          ...validMockPayload,
          criteria: [
            {
              criterion: 'Accuracy & Threshold Identification',
              score: -5, // Negative score
              maxScore: 25,
              feedback: 'Negative',
            },
            ...validMockPayload.criteria.slice(1),
          ],
        }),
    });
  } catch (err: any) {
    if (err instanceof RubricEvaluationError) test3Error = err;
  }

  assert(
    test3Error !== null && test3Error.code === 'VALIDATION_FAILED_AFTER_RETRY',
    'Negative criterion score (-5) is rejected and triggers clean evaluation error'
  );

  // ---------------------------------------------------------------------------
  // TEST 4: Non-integer criterion score rejected
  // ---------------------------------------------------------------------------
  const test4Evaluator = new RubricEvaluatorService();
  let test4Error: RubricEvaluationError | null = null;
  try {
    await test4Evaluator.evaluateAnswer({
      question: sampleQuestion,
      rubric: sampleRubric,
      learnerAnswer: 'Some answer text',
      completionRunner: async () =>
        JSON.stringify({
          ...validMockPayload,
          criteria: [
            {
              criterion: 'Accuracy & Threshold Identification',
              score: 22.5, // Non-integer
              maxScore: 25,
              feedback: 'Decimal score',
            },
            ...validMockPayload.criteria.slice(1),
          ],
        }),
    });
  } catch (err: any) {
    if (err instanceof RubricEvaluationError) test4Error = err;
  }

  assert(
    test4Error !== null && test4Error.code === 'VALIDATION_FAILED_AFTER_RETRY',
    'Non-integer criterion score (22.5) is rejected and throws RubricEvaluationError'
  );

  // ---------------------------------------------------------------------------
  // TEST 5: Missing rubric criterion rejected
  // ---------------------------------------------------------------------------
  const test5Evaluator = new RubricEvaluatorService();
  let test5Error: RubricEvaluationError | null = null;
  try {
    await test5Evaluator.evaluateAnswer({
      question: sampleQuestion,
      rubric: sampleRubric,
      learnerAnswer: 'Some answer text',
      completionRunner: async () =>
        JSON.stringify({
          // Only 2 of 4 criteria provided
          criteria: validMockPayload.criteria.slice(0, 2),
          overallScore: 50,
          overallFeedback: 'Incomplete criteria list',
        }),
    });
  } catch (err: any) {
    if (err instanceof RubricEvaluationError) test5Error = err;
  }

  assert(
    test5Error !== null &&
      test5Error.code === 'VALIDATION_FAILED_AFTER_RETRY' &&
      test5Error.message.includes('Missing required rubric criterion'),
    'Missing rubric criterion in AI response is rejected and throws RubricEvaluationError'
  );

  // ---------------------------------------------------------------------------
  // TEST 6: Overall score inconsistent with sum of criteria rejected
  // ---------------------------------------------------------------------------
  const test6Evaluator = new RubricEvaluatorService();
  let test6Error: RubricEvaluationError | null = null;
  try {
    await test6Evaluator.evaluateAnswer({
      question: sampleQuestion,
      rubric: sampleRubric,
      learnerAnswer: 'Some answer text',
      completionRunner: async () =>
        JSON.stringify({
          ...validMockPayload,
          // Criteria sum to 96, but overallScore states 40
          overallScore: 40,
        }),
    });
  } catch (err: any) {
    if (err instanceof RubricEvaluationError) test6Error = err;
  }

  assert(
    test6Error !== null &&
      test6Error.code === 'VALIDATION_FAILED_AFTER_RETRY' &&
      test6Error.message.includes('inconsistent with sum of rubric criteria'),
    'Overall score mathematically inconsistent with criteria sum (40 vs 96%) is rejected'
  );

  // ---------------------------------------------------------------------------
  // TEST 7: First invalid response triggers retry; valid retry succeeds
  // ---------------------------------------------------------------------------
  let test7Calls = 0;
  const test7Evaluator = new RubricEvaluatorService();
  const test7Runner = async () => {
    test7Calls++;
    if (test7Calls === 1) {
      return 'Malformed { json string not closing';
    }
    return JSON.stringify(validMockPayload);
  };

  const test7Res = await test7Evaluator.evaluateAnswer({
    question: sampleQuestion,
    rubric: sampleRubric,
    learnerAnswer: 'Audit response',
    completionRunner: test7Runner,
  });

  assert(
    test7Calls === 2 && test7Res.overallScore === 96 && test7Res.criteria.length === 4,
    'First invalid response triggers retry; valid retry succeeds with full rubric results'
  );

  // ---------------------------------------------------------------------------
  // TEST 8: Second invalid response throws structured RubricEvaluationError
  // ---------------------------------------------------------------------------
  let test8Calls = 0;
  const test8Evaluator = new RubricEvaluatorService();
  let test8Error: RubricEvaluationError | null = null;
  try {
    await test8Evaluator.evaluateAnswer({
      question: sampleQuestion,
      rubric: sampleRubric,
      learnerAnswer: 'Audit response',
      completionRunner: async () => {
        test8Calls++;
        return 'Still not valid JSON';
      },
    });
  } catch (err: any) {
    if (err instanceof RubricEvaluationError) test8Error = err;
  }

  assert(
    test8Calls === 2 && test8Error !== null && test8Error.code === 'VALIDATION_FAILED_AFTER_RETRY',
    'Second invalid response throws structured RubricEvaluationError (VALIDATION_FAILED_AFTER_RETRY)'
  );

  // ---------------------------------------------------------------------------
  // TEST 9: Provider timeout / network failure throws structured RubricEvaluationError
  // ---------------------------------------------------------------------------
  const test9Evaluator = new RubricEvaluatorService();
  let test9Error: RubricEvaluationError | null = null;
  try {
    await test9Evaluator.evaluateAnswer({
      question: sampleQuestion,
      rubric: sampleRubric,
      learnerAnswer: 'Audit response',
      completionRunner: async () => {
        const err: any = new Error('Gateway Connection timed out after 15000ms');
        err.name = 'TimeoutError';
        throw err;
      },
    });
  } catch (err: any) {
    if (err instanceof RubricEvaluationError) test9Error = err;
  }

  assert(
    test9Error !== null && test9Error.code === 'PROVIDER_TIMEOUT',
    'Provider timeout throws structured RubricEvaluationError (PROVIDER_TIMEOUT)'
  );

  // ---------------------------------------------------------------------------
  // TEST 10: Provider 429 / rate limit throws structured RubricEvaluationError
  // ---------------------------------------------------------------------------
  const test10Evaluator = new RubricEvaluatorService();
  let test10Error: RubricEvaluationError | null = null;
  try {
    await test10Evaluator.evaluateAnswer({
      question: sampleQuestion,
      rubric: sampleRubric,
      learnerAnswer: 'Audit response',
      completionRunner: async () => {
        const err: any = new Error('Rate limit exceeded: 429 Too Many Requests');
        err.status = 429;
        throw err;
      },
    });
  } catch (err: any) {
    if (err instanceof RubricEvaluationError) test10Error = err;
  }

  assert(
    test10Error !== null && test10Error.code === 'PROVIDER_RATE_LIMIT',
    'Provider rate limit (429) throws structured RubricEvaluationError (PROVIDER_RATE_LIMIT)'
  );

  // ---------------------------------------------------------------------------
  // TEST 11: Provider invalid credentials / unavailable throws structured RubricEvaluationError
  // ---------------------------------------------------------------------------
  // Create an unconfigured ClaudeService instance (no keys)
  const unconfiguredClaude = new ClaudeService();
  (unconfiguredClaude as any).client = null;
  (unconfiguredClaude as any).geminiClient = null;

  const test11Evaluator = new RubricEvaluatorService(unconfiguredClaude);
  let test11Error: RubricEvaluationError | null = null;
  try {
    await test11Evaluator.evaluateAnswer({
      question: sampleQuestion,
      rubric: sampleRubric,
      learnerAnswer: 'Audit response',
    });
  } catch (err: any) {
    if (err instanceof RubricEvaluationError) test11Error = err;
  }

  assert(
    test11Error !== null && test11Error.code === 'PROVIDER_UNAVAILABLE',
    'Unavailable / unconfigured AI provider throws structured RubricEvaluationError (PROVIDER_UNAVAILABLE)'
  );

  // ---------------------------------------------------------------------------
  // TEST 12: No QuestionAttempt or score saved when evaluation fails
  // ---------------------------------------------------------------------------
  const test12QId = 'q-test-fail-save-12';
  inMemoryQuestionBank.set(test12QId, {
    questionId: test12QId,
    topic: 'Checking AI',
    level: 'Easy',
    track: 'General',
    title: 'Fail-Safe Attempt Persistence',
    promptText: 'Audit transactions.',
    scoringRubric: sampleRubric,
    status: 'ACTIVE',
  });

  const test12AsgnId = 'asgn-test-fail-save-12';
  inMemoryAssignments.set(test12AsgnId, {
    assignmentId: test12AsgnId,
    learnerId: 'learner-test-12',
    questionId: test12QId,
    topic: 'Checking AI',
    level: 'Easy',
    track: 'General',
    assignedAt: new Date(),
    status: 'ASSIGNED',
  });

  // Inject failing runner into global singleton
  rubricEvaluatorService.setAICompletionRunner(async () => {
    throw new Error('AI Provider Service Unavailable: 503');
  });

  const attemptsBefore = inMemoryAttempts.size;
  let attempt12Error: any = null;
  try {
    await questionBankService.submitAttempt({
      learnerId: 'learner-test-12',
      assignmentId: test12AsgnId,
      answer: 'Some response that will fail during AI evaluation.',
      timeTakenSeconds: 30,
    });
  } catch (err: any) {
    attempt12Error = err;
  }

  const assignmentAfter = inMemoryAssignments.get(test12AsgnId);
  const attemptsAfter = inMemoryAttempts.size;

  assert(
    attempt12Error !== null &&
      attemptsAfter === attemptsBefore &&
      assignmentAfter.status === 'ASSIGNED',
    'When AI evaluation fails, no QuestionAttempt is saved and assignment remains ASSIGNED (Never saves fabricated score)'
  );

  // ---------------------------------------------------------------------------
  // TEST 13: No AC / XP rewards awarded when evaluation fails
  // ---------------------------------------------------------------------------
  const test13AsgnId = 'asgn-test-clarity-rewards-13';
  inMemoryAssignments.set(test13AsgnId, {
    assignmentId: test13AsgnId,
    learnerId: 'learner-clarity-13',
    questionId: test12QId,
    topic: 'Checking AI',
    level: 'Easy',
    track: 'General',
    assignedAt: new Date(),
    status: 'ASSIGNED',
  });

  const test13User = {
    _id: 'learner-clarity-13',
    id: 'learner-clarity-13',
    aiimsCredits: 75,
    xpPoints: 200,
  };

  const clarityFailReq: any = {
    user: test13User,
    body: {
      assignmentId: test13AsgnId,
      answer: 'Draft answer under failing provider.',
      timeTakenSeconds: 45,
    },
  };

  let test13Status = 0;
  let test13Body: any = null;
  const mockClarityFailRes: any = {
    status(s: number) {
      test13Status = s;
      return this;
    },
    json(b: any) {
      test13Body = b;
      return this;
    },
  };

  await submitClarityTask(clarityFailReq, mockClarityFailRes);

  assert(
    test13Status === 502 &&
      test13Body.code !== undefined &&
      test13User.aiimsCredits === 75 &&
      test13User.xpPoints === 200,
    'Clarity task returns HTTP 502 on evaluation failure and awards 0 AC and 0 XP (User balances unchanged)'
  );

  // ---------------------------------------------------------------------------
  // TEST 14: Empty / whitespace submission returns 0 without calling AI
  // ---------------------------------------------------------------------------
  let test14LlmCalled = false;
  const test14Evaluator = new RubricEvaluatorService();
  const test14Res = await test14Evaluator.evaluateAnswer({
    question: sampleQuestion,
    rubric: sampleRubric,
    learnerAnswer: '    \n\t   ',
    completionRunner: async () => {
      test14LlmCalled = true;
      return '{}';
    },
  });

  assert(
    test14Res.overallScore === 0 &&
      !test14LlmCalled &&
      test14Res.evaluationSource === 'EMPTY_SUBMISSION' &&
      test14Res.criteria.every((c) => c.score === 0) &&
      test14Res.overallFeedback.includes('No answer was submitted'),
    'Empty/whitespace submission returns 0 without calling AI and without fabricated scores'
  );

  // ---------------------------------------------------------------------------
  // TEST 15: Focus challenge submission flow uses rubric evaluation and returns criteria breakdown
  // ---------------------------------------------------------------------------
  // Configure valid mock runner for the server singleton
  rubricEvaluatorService.setAICompletionRunner(async () =>
    JSON.stringify({
      criteria: [
        {
          criterion: 'Accuracy & Threshold Identification',
          score: 22,
          maxScore: 25,
          feedback: 'Strong identification of thresholds.',
        },
        {
          criterion: 'Anomaly Root-Cause Classification',
          score: 22,
          maxScore: 25,
          feedback: 'Accurately diagnosed vendor anomalies.',
        },
        {
          criterion: 'Action Plan Clarity',
          score: 22,
          maxScore: 25,
          feedback: 'Clear remediation actions provided.',
        },
        {
          criterion: 'Conciseness & Structure',
          score: 22,
          maxScore: 25,
          feedback: 'Clean presentation.',
        },
      ],
      overallScore: 88,
      overallFeedback: 'High quality Focus challenge execution.',
    })
  );

  const test15QId = 'q-focus-challenge-15';
  inMemoryQuestionBank.set(test15QId, {
    questionId: test15QId,
    topic: 'AI Workflow Design',
    level: 'Easy',
    track: 'General',
    title: 'Focus Track Rubric Challenge',
    promptText: 'Design a prompt workflow for data validation.',
    testScenario: 'Weekly CSV ingest.',
    expectedCriteria: ['Validation rule', 'Anomaly check', 'Alerting'],
    scoringRubric: sampleRubric,
    status: 'ACTIVE',
  });

  const test15AsgnId = 'asgn-focus-challenge-15';
  inMemoryAssignments.set(test15AsgnId, {
    assignmentId: test15AsgnId,
    learnerId: 'learner-focus-15',
    questionId: test15QId,
    topic: 'AI Workflow Design',
    level: 'Easy',
    track: 'General',
    assignedAt: new Date(),
    status: 'ASSIGNED',
  });

  const focusReq: any = {
    user: { id: 'learner-focus-15' },
    body: {
      assignmentId: test15AsgnId,
      answer:
        'Step 1: Check CSV structure. Step 2: Extract anomalies > $50. Step 3: Alert audit team.',
      timeTakenSeconds: 90,
    },
  };

  let focusStatus = 0;
  let focusBody: any = null;
  const mockFocusRes: any = {
    status(s: number) {
      focusStatus = s;
      return this;
    },
    json(b: any) {
      focusBody = b;
      return this;
    },
  };

  await submitAttemptHandler(focusReq, mockFocusRes);

  const savedFocusAttempt = inMemoryAttempts.get(focusBody?.attemptId);

  assert(
    focusStatus === 200 &&
      focusBody.success === true &&
      focusBody.score === 88 &&
      focusBody.rubricFeedback.length === 4 &&
      focusBody.overallFeedback.includes('Focus challenge') &&
      savedFocusAttempt !== undefined &&
      savedFocusAttempt.score === 88 &&
      savedFocusAttempt.rubricFeedback.length === 4,
    'Focus challenge submission flow evaluates via AI rubric, returns criteria breakdown, and persists immutable attempt record'
  );

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
  console.log('====================================================');

  if (passedTests === totalTests && totalTests === 15) {
    console.log('🎉 ALL 15 MANDATORY RUBRIC EVALUATION TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.error(`💥 ${totalTests - passedTests} TESTS FAILED (Total: ${totalTests}/15)\n`);
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
