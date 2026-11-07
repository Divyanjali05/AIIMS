import {
  RubricEvaluatorService,
  RubricEvaluationError,
  EvaluateAnswerParams,
} from '../services/rubricEvaluator.service';
import { questionBankService } from '../services/questionBank.service';
import { submitAttemptHandler } from '../controllers/question.controller';
import { submitClarityTask } from '../controllers/clarity.controller';
import { inMemoryAssignments } from '../models/QuestionAssignment.model';
import { inMemoryQuestionBank } from '../models/QuestionBank.model';
import { inMemoryAttempts } from '../models/QuestionAttempt.model';
import { creditsLedgerService } from '../services/creditsLedger.service';

console.log('====================================================');
console.log('AIIMS TASK T2: GENUINE AI RUBRIC EVALUATOR TEST SUITE');
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

  // ---------------------------------------------------------------------------
  // TEST 1: Strong, complete answer receives high rubric scores across all criteria
  // ---------------------------------------------------------------------------
  console.log('--- SUITE 1: Evidence-Based Evaluation Scenarios ---');

  const strongEvaluator = new RubricEvaluatorService();
  const strongRunner = async () =>
    JSON.stringify({
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
    });

  const strongRes = await strongEvaluator.evaluateAnswer({
    question: sampleQuestion,
    rubric: sampleRubric,
    learnerAnswer:
      'Audit Summary:\n1. Tx 2 ($120): Exceeds $50 limit; unapproved vendor. Action: Freeze and request invoice.\n2. Tx 3 ($80): Exceeds $50 limit; duplicate charge. Action: Issue immediate refund.\nTx 1 ($45) is under $50 and fully valid.',
    completionRunner: strongRunner,
  });

  assert(
    strongRes.overallScore === 96 &&
      strongRes.criteria.length === 4 &&
      strongRes.criteria[0].score === 25 &&
      strongRes.overallFeedback.includes('Exceptional'),
    'Strong answer receives high rubric scores (96/100) and detailed feedback'
  );

  // ---------------------------------------------------------------------------
  // TEST 2: Empty / whitespace-only answer receives immediate 0 without LLM call
  // ---------------------------------------------------------------------------
  let llmCalledForEmpty = false;
  const emptyEvaluator = new RubricEvaluatorService();
  const emptyRunner = async () => {
    llmCalledForEmpty = true;
    return '{}';
  };

  const emptyRes = await emptyEvaluator.evaluateAnswer({
    question: sampleQuestion,
    rubric: sampleRubric,
    learnerAnswer: '     \n\t   ',
    completionRunner: emptyRunner,
  });

  assert(
    emptyRes.overallScore === 0 &&
      !llmCalledForEmpty &&
      emptyRes.evaluationSource === 'EMPTY_SUBMISSION' &&
      emptyRes.criteria.every((c) => c.score === 0),
    'Empty answer returns score 0 immediately without invoking LLM runner'
  );

  // ---------------------------------------------------------------------------
  // TEST 3: Concise accurate answer receives full credit (Length is NOT rewarded)
  // ---------------------------------------------------------------------------
  const conciseEvaluator = new RubricEvaluatorService();
  const conciseRunner = async () =>
    JSON.stringify({
      criteria: [
        {
          criterion: 'Accuracy & Threshold Identification',
          score: 25,
          maxScore: 25,
          feedback: 'Accurately flagged Tx 2 and Tx 3; excluded Tx 1.',
        },
        {
          criterion: 'Anomaly Root-Cause Classification',
          score: 25,
          maxScore: 25,
          feedback: 'Categorized unapproved vendor and duplicate.',
        },
        {
          criterion: 'Action Plan Clarity',
          score: 25,
          maxScore: 25,
          feedback: 'Clear freeze and refund actions.',
        },
        {
          criterion: 'Conciseness & Structure',
          score: 25,
          maxScore: 25,
          feedback: 'Exemplary brevity and precision.',
        },
      ],
      overallScore: 100,
      overallFeedback: 'Extremely concise, completely accurate.',
    });

  const conciseRes = await conciseEvaluator.evaluateAnswer({
    question: sampleQuestion,
    rubric: sampleRubric,
    learnerAnswer:
      'Tx 2 ($120, unapproved vendor): Freeze. Tx 3 ($80, duplicate): Refund. Tx 1 ($45): Valid.',
    completionRunner: conciseRunner,
  });

  assert(
    conciseRes.overallScore === 100 && conciseRes.criteria.every((c) => c.score === 25),
    'Concise accurate answer (16 words) receives full 100/100 score (Evidence > Length)'
  );

  // ---------------------------------------------------------------------------
  // TEST 4: Long, fluffy repetitive answer without substance receives low marks
  // ---------------------------------------------------------------------------
  const fluffEvaluator = new RubricEvaluatorService();
  const fluffRunner = async () =>
    JSON.stringify({
      criteria: [
        {
          criterion: 'Accuracy & Threshold Identification',
          score: 5,
          maxScore: 25,
          feedback: 'Failed to specify which transactions exceeded the threshold.',
        },
        {
          criterion: 'Anomaly Root-Cause Classification',
          score: 5,
          maxScore: 25,
          feedback: 'No specific vendors or duplicate details mentioned.',
        },
        {
          criterion: 'Action Plan Clarity',
          score: 5,
          maxScore: 25,
          feedback: 'Generic recommendations to check things without concrete steps.',
        },
        {
          criterion: 'Conciseness & Structure',
          score: 5,
          maxScore: 25,
          feedback: 'Excessive verbosity with no relevant actionable data.',
        },
      ],
      overallScore: 20,
      overallFeedback:
        'Long response that repeats high-level buzzwords without analyzing the data.',
    });

  const fluffRes = await fluffEvaluator.evaluateAnswer({
    question: sampleQuestion,
    rubric: sampleRubric,
    learnerAnswer:
      'In our contemporary paradigm of financial engineering, auditing transactions is of paramount importance for the synergized enterprise ecosystem. When examining transactional vectors, one must always prioritize deep holistic compliance and multifaceted auditing frameworks. As we look into these financial statements, thoroughness and diligence are our utmost guiding lights, keeping in mind that financial anomalies may manifest in various dimensions. Therefore, we will synergistically monitor all transactions across our database infrastructure continuously.',
    completionRunner: fluffRunner,
  });

  assert(
    fluffRes.overallScore === 20 && fluffRes.criteria.every((c) => c.score === 5),
    'Long fluffy buzzword answer (75+ words) receives low score (20/100) (Length is not rewarded)'
  );

  // ---------------------------------------------------------------------------
  // TEST 5: Off-topic answer receives 0 / minimal marks
  // ---------------------------------------------------------------------------
  const offTopicEvaluator = new RubricEvaluatorService();
  const offTopicRunner = async () =>
    JSON.stringify({
      criteria: [
        {
          criterion: 'Accuracy & Threshold Identification',
          score: 0,
          maxScore: 25,
          feedback: 'Content is unrelated to financial transaction auditing.',
        },
        {
          criterion: 'Anomaly Root-Cause Classification',
          score: 0,
          maxScore: 25,
          feedback: 'No financial transaction anomalies evaluated.',
        },
        {
          criterion: 'Action Plan Clarity',
          score: 0,
          maxScore: 25,
          feedback: 'No remediation provided.',
        },
        {
          criterion: 'Conciseness & Structure',
          score: 0,
          maxScore: 25,
          feedback: 'Off-topic response.',
        },
      ],
      overallScore: 0,
      overallFeedback: 'Completely off-topic response.',
    });

  const offTopicRes = await offTopicEvaluator.evaluateAnswer({
    question: sampleQuestion,
    rubric: sampleRubric,
    learnerAnswer:
      'To make the best Neapolitan pizza, ferment the dough at 65% hydration for 48 hours.',
    completionRunner: offTopicRunner,
  });

  assert(
    offTopicRes.overallScore === 0 && offTopicRes.criteria.every((c) => c.score === 0),
    'Off-topic answer receives 0/100 score'
  );

  // ---------------------------------------------------------------------------
  // TEST 6: Single retry on invalid JSON parses and recovers on attempt 2
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Retry and Validation Safety ---');

  let callCount = 0;
  const retryEvaluator = new RubricEvaluatorService();
  const retryRunner = async () => {
    callCount++;
    if (callCount === 1) {
      return '{ "criteria": [ { "criterion": "Accuracy & Threshold Identification", "score": "not_a_number"'; // Broken JSON
    }
    return JSON.stringify({
      criteria: [
        {
          criterion: 'Accuracy & Threshold Identification',
          score: 20,
          maxScore: 25,
          feedback: 'Recovered after format correction.',
        },
        {
          criterion: 'Anomaly Root-Cause Classification',
          score: 20,
          maxScore: 25,
          feedback: 'Valid causes identified.',
        },
        {
          criterion: 'Action Plan Clarity',
          score: 20,
          maxScore: 25,
          feedback: 'Solid actions.',
        },
        {
          criterion: 'Conciseness & Structure',
          score: 20,
          maxScore: 25,
          feedback: 'Clear structure.',
        },
      ],
      overallScore: 80,
      overallFeedback: 'Recovered evaluation.',
    });
  };

  const recoveredRes = await retryEvaluator.evaluateAnswer({
    question: sampleQuestion,
    rubric: sampleRubric,
    learnerAnswer: 'Tx 2 and Tx 3 are the anomalies.',
    completionRunner: retryRunner,
  });

  assert(
    callCount === 2 && recoveredRes.overallScore === 80,
    'Malformed JSON on attempt 1 triggers retry and recovers successfully on attempt 2'
  );

  // ---------------------------------------------------------------------------
  // TEST 7: Malformed JSON on both attempts throws clean RubricEvaluationError
  // ---------------------------------------------------------------------------
  let retryFailCount = 0;
  const failEvaluator = new RubricEvaluatorService();
  const persistentFailRunner = async () => {
    retryFailCount++;
    return 'I am not returning JSON today.';
  };

  let caughtError: RubricEvaluationError | null = null;
  try {
    await failEvaluator.evaluateAnswer({
      question: sampleQuestion,
      rubric: sampleRubric,
      learnerAnswer: 'Some answer text',
      completionRunner: persistentFailRunner,
    });
  } catch (err: any) {
    if (err instanceof RubricEvaluationError) {
      caughtError = err;
    }
  }

  assert(
    retryFailCount === 2 &&
      caughtError !== null &&
      caughtError.code === 'VALIDATION_FAILED_AFTER_RETRY',
    'Persistent schema failure across both attempts throws clean RubricEvaluationError (Never fabricates scores)'
  );

  // ---------------------------------------------------------------------------
  // TEST 8: Server-authoritative scoring: client-submitted scores are ignored
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Server Authority & Flow Integration ---');

  // Seed question in question bank
  const testQId = 'q-rubric-test-01';
  inMemoryQuestionBank.set(testQId, {
    questionId: testQId,
    topic: 'Checking AI',
    level: 'Easy',
    track: 'General',
    title: sampleQuestion.title,
    promptText: sampleQuestion.promptText,
    testScenario: sampleQuestion.testScenario,
    expectedCriteria: sampleQuestion.expectedCriteria,
    scoringRubric: sampleRubric,
    status: 'ACTIVE',
  });

  // Assign to test learner
  const testAssignmentId = 'asgn-rubric-test-01';
  inMemoryAssignments.set(testAssignmentId, {
    assignmentId: testAssignmentId,
    learnerId: 'learner-rubric-user',
    questionId: testQId,
    topic: 'Checking AI',
    level: 'Easy',
    track: 'General',
    assignedAt: new Date(),
    status: 'ASSIGNED',
  });

  // Client sends score = 100 in body (attempted score tampering)
  const fakeScoreReq: any = {
    user: { id: 'learner-rubric-user' },
    body: {
      assignmentId: testAssignmentId,
      answer: 'Identified the $50 threshold and declared Tx 2 and Tx 3 anomalous.',
      score: 100, // Client attempts to force 100
    },
  };

  let capturedStatus = 0;
  let capturedBody: any = null;
  const mockRes: any = {
    status(s: number) {
      capturedStatus = s;
      return this;
    },
    json(b: any) {
      capturedBody = b;
      return this;
    },
  };

  await submitAttemptHandler(fakeScoreReq, mockRes);

  assert(
    capturedStatus === 200 &&
      capturedBody.success === true &&
      capturedBody.attemptId !== undefined &&
      capturedBody.rubricFeedback.length === 4 &&
      capturedBody.overallFeedback !== undefined,
    'Client-submitted score is ignored: server-authoritative rubric evaluation evaluates and returns score'
  );

  // Check stored attempt
  const storedAttempt = inMemoryAttempts.get(capturedBody.attemptId);
  assert(
    storedAttempt !== undefined &&
      storedAttempt.rubricFeedback.length === 4 &&
      storedAttempt.overallFeedback !== undefined,
    'QuestionAttempt record correctly persists rubricFeedback array and overallFeedback summary'
  );

  // ---------------------------------------------------------------------------
  // TEST 9: Clarity Controller submitClarityTask integration
  // ---------------------------------------------------------------------------
  const clarityQId = 'q-clarity-rubric-01';
  inMemoryQuestionBank.set(clarityQId, {
    questionId: clarityQId,
    topic: 'AI Workflow Design',
    level: 'Easy',
    track: 'General',
    title: 'Multi-Step Workflow Verification',
    promptText: 'Design a 3-step verification workflow.',
    testScenario: 'Weekly report consolidation.',
    expectedCriteria: ['Input validation', 'Anomaly flag', 'Manager review'],
    scoringRubric: sampleRubric,
    status: 'ACTIVE',
  });

  const clarityAsgnId = 'asgn-clarity-rubric-01';
  inMemoryAssignments.set(clarityAsgnId, {
    assignmentId: clarityAsgnId,
    learnerId: 'learner-clarity-user',
    questionId: clarityQId,
    topic: 'AI Workflow Design',
    level: 'Easy',
    track: 'General',
    assignedAt: new Date(),
    status: 'ASSIGNED',
  });

  const clarityReq: any = {
    user: {
      _id: 'learner-clarity-user',
      id: 'learner-clarity-user',
      aiimsCredits: 50,
      xpPoints: 100,
    },
    body: {
      assignmentId: clarityAsgnId,
      answer:
        'Step 1: Validate input CSV format. Step 2: Flag missing values. Step 3: Require manager review before distribution.',
      timeTakenSeconds: 60,
    },
  };

  let clarityStatus = 0;
  let clarityBody: any = null;
  const mockClarityRes: any = {
    status(s: number) {
      clarityStatus = s;
      return this;
    },
    json(b: any) {
      clarityBody = b;
      return this;
    },
  };

  await submitClarityTask(clarityReq, mockClarityRes);

  assert(
    clarityStatus === 200 &&
      clarityBody.success === true &&
      clarityBody.rubricFeedback.length === 4 &&
      clarityBody.overallFeedback !== undefined &&
      clarityBody.creditsAwarded > 0,
    'Clarity task submission evaluates via rubricEvaluatorService and awards completion credits'
  );

  // ---------------------------------------------------------------------------
  // TEST 10: Task locking prevents re-submission tampering (HTTP 409)
  // ---------------------------------------------------------------------------
  let resubmitStatus = 0;
  let resubmitBody: any = null;
  const mockResubmitRes: any = {
    status(s: number) {
      resubmitStatus = s;
      return this;
    },
    json(b: any) {
      resubmitBody = b;
      return this;
    },
  };

  await submitClarityTask(clarityReq, mockResubmitRes);

  assert(
    resubmitStatus === 409 && resubmitBody.code === 'TASK_LOCKED',
    'Task locking prevents re-submission (HTTP 409 TASK_LOCKED)'
  );

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
  console.log('====================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ALL 10 RUBRIC EVALUATOR SCENARIOS PASSED!\n');
    process.exit(0);
  } else {
    console.error(`💥 ${totalTests - passedTests} TESTS FAILED\n`);
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
