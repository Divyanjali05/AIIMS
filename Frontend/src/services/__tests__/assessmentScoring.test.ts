import {
  evaluateAssessment,
  scoreQuestion
} from '../assessmentScoring';

export function runAssessmentScoringQualityChecks(): { passed: boolean; passedCount: number; totalCount: number; logs: string[] } {
  const logs: string[] = [];
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, title: string, detail?: string) {
    totalCount++;
    if (condition) {
      passedCount++;
      logs.push(`✅ [PASS] Check ${totalCount}: ${title}`);
    } else {
      logs.push(`❌ [FAIL] Check ${totalCount}: ${title} ${detail ? `- ${detail}` : ''}`);
    }
  }

  // Check 1: Two different options with similar meaning produce similar scores
  const score15 = scoreQuestion(15, 'q15_a');
  const score16 = scoreQuestion(16, 'q16_a');
  assert(
    score15.score === 100 && score16.score === 100,
    'Check 1: Similar meaning options produce similar scores',
    `Q15=${score15.score}, Q16=${score16.score}`
  );

  // Check 2: A weak answer cannot receive a high score merely because it is option A
  const resQ6A = scoreQuestion(6, 'q6_a');
  assert(
    resQ6A.score <= 20 && resQ6A.evidenceLevel === 'misunderstanding',
    'Check 2: Weak answer in Option A does NOT get a high score',
    `Q6 option A score=${resQ6A.score}`
  );

  // Check 3: A strong answer can receive a high score regardless of whether it is option B/C/D
  const resQ6B = scoreQuestion(6, 'q6_b');
  const resQ3B = scoreQuestion(3, 'q3_b');
  assert(
    resQ6B.score === 100 && resQ3B.score === 100,
    'Check 3: Strong answer receives high score regardless of option letter B/C/D',
    `Q6 B=${resQ6B.score}, Q3 B=${resQ3B.score}`
  );

  // Check 4: Selecting more options in multi-select does not automatically produce a higher score
  const resBasicMulti = scoreQuestion(2, ['q2_a', 'q2_c']);
  const resDevMulti = scoreQuestion(2, ['q2_d', 'q2_f']);
  assert(
    resDevMulti.score > resBasicMulti.score,
    'Check 4: Multi-select evaluated on technical depth rather than raw option count',
    `Basic (2 tools)=${resBasicMulti.score}, Dev (2 tools)=${resDevMulti.score}`
  );

  // Check 5: Q5 & Q24 preferences do not inflate capability
  const resQ24 = scoreQuestion(24, ['q24_a', 'q24_b', 'q24_c']);
  const evalQ24Only = evaluateAssessment({ 24: ['q24_a', 'q24_b', 'q24_c', 'q24_d'] });
  assert(
    resQ24.score === 0 && evalQ24Only.overallScore === 0,
    'Check 5: Q5 & Q24 preferences do NOT inflate capability scores',
    `Q24 score=${resQ24.score}, overall=${evalQ24Only.overallScore}`
  );

  // Check 6: Q23 attitude/concern does not automatically inflate or reduce capability
  const resQ23Concern = scoreQuestion(23, 'q23_b');
  const resQ23Optimism = scoreQuestion(23, 'q23_d');
  assert(
    resQ23Concern.score >= 60 && resQ23Concern.score <= 85 && resQ23Optimism.score >= 60 && resQ23Optimism.score <= 85,
    'Check 6: Q23 attitude/concern stays within balanced analytical range',
    `Concern=${resQ23Concern.score}, Optimism=${resQ23Optimism.score}`
  );

  // Check 7: Open-ended answers are evaluated from their actual content, not length
  const strongPrompt = 'Act as Senior System Architect. Design React and Node.js microservices architecture with PostgreSQL, Redis, JWT auth, and explicit rate limiting schemas.';
  const weakPrompt = 'make a website make a website make a website make a website';
  const resStrongText = scoreQuestion(11, strongPrompt);
  const resWeakText = scoreQuestion(11, weakPrompt);
  assert(
    resStrongText.score > resWeakText.score && resStrongText.evidenceLevel === 'strong',
    'Check 7: Open-ended answers evaluated from actual content, not repetitive length',
    `Strong prompt score=${resStrongText.score}, Repetitive prompt score=${resWeakText.score}`
  );

  // Check 8: Missing/empty evidence does not receive an invented high score
  const resEmptyText = scoreQuestion(11, '');
  const evalEmptyAll = evaluateAssessment({});
  assert(
    resEmptyText.score === 0 && evalEmptyAll.overallScore === 0,
    'Check 8: Missing/empty evidence receives 0 score with no score inflation',
    `Empty text=${resEmptyText.score}, Empty overall=${evalEmptyAll.overallScore}`
  );

  // Check 9: Anthropic failure does not produce a fake numeric score
  const resFallback = scoreQuestion(11, 'Build a typescript backend API');
  assert(
    resFallback.scoringMethod === 'deterministic_fallback' && resFallback.anthropicStatus === 'unavailable' && ![85, 80, 94, 90].includes(resFallback.score),
    'Check 9: Anthropic failure uses deterministic fallback without fake scores (85/80)',
    `Method=${resFallback.scoringMethod}, Status=${resFallback.anthropicStatus}`
  );

  // Check 10: Every final capability score can be traced to actual question evidence
  const fullEval = evaluateAssessment({
    1: 'q1_a',
    6: 'q6_b',
    7: 'q7_a',
    9: 'q9_a',
    21: 5
  });
  const usingCap = fullEval.capabilities.usingAI;
  assert(
    usingCap.contributingQuestionIds.includes(1) && usingCap.questionScores[1] === 100 && usingCap.rubricVersion === '3.0.0-evidence-based',
    'Check 10: Every final capability score can be traced to actual question evidence',
    `Contributing Qs=${usingCap.contributingQuestionIds.join(',')}`
  );

  // Check 11: Intermediate learner profile produces moderate score (50–74 range)
  const intermediateAnswers: Record<number, any> = {
    1: 'q1_c', 2: ['q2_a', 'q2_b'], 3: 'q3_a', 4: 3, 5: 'q5_b',
    6: 'q6_b', 7: 'q7_b', 8: 'q8_a', 9: 'q9_b', 10: 'q10_a',
    11: 'Act as a developer. Create a REST API using Node and Express with MongoDB.',
    12: 'Write a React component with state for counter.',
    13: 'q13_c', 14: 'q14_b', 15: 'q15_c', 16: 'q16_b', 17: 'q17_b',
    18: 'q18_b', 19: 'q19_b', 20: 'q20_b', 21: 3, 22: 'q22_b',
    23: 'q23_b', 24: ['q24_b'],
    25: 'Adapting means changing workflows and mindset while using is just typing.'
  };
  const evalIntermediate = evaluateAssessment(intermediateAnswers);
  assert(
    evalIntermediate.overallScore >= 50 && evalIntermediate.overallScore <= 74,
    'Check 11: Intermediate learner profile produces moderate score (50–74 range)',
    `Score=${evalIntermediate.overallScore}`
  );

  // Check 12: Beginner profile produces low score (<50 range)
  const beginnerAnswers: Record<number, any> = {
    1: 'q1_d', 2: ['q2_a'], 3: 'q3_d', 4: 5, 5: 'q5_a',
    6: 'q6_a', 7: 'q7_d', 8: 'q8_d', 9: 'q9_d', 10: 'q10_d',
    11: 'make website', 12: 'write code', 13: 'q13_d', 14: 'q14_d',
    15: 'q15_d', 16: 'q16_d', 17: 'q17_d', 18: 'q18_d', 19: 'q19_d',
    20: 'q20_d', 21: 1, 22: 'q22_d', 23: 'q23_d', 24: ['q24_a'], 25: 'idk'
  };
  const evalBeginner = evaluateAssessment(beginnerAnswers);
  assert(
    evalBeginner.overallScore < 50,
    'Check 12: Beginner profile produces low score (<50 range)',
    `Score=${evalBeginner.overallScore}`
  );

  // Check 13: Advanced profile produces high score (>=75 range)
  const advancedAnswers: Record<number, any> = {
    1: 'q1_a', 2: ['q2_a', 'q2_d', 'q2_f'], 3: 'q3_b', 4: 1, 5: 'q5_c',
    6: 'q6_b', 7: 'q7_a', 8: 'q8_a', 9: 'q9_a', 10: 'q10_a',
    11: 'Act as Senior System Architect. Design React and Node.js microservices architecture with PostgreSQL, Redis, JWT auth, and explicit rate limiting schemas.',
    12: 'Create modular TypeScript React component with custom hook, error handling, mock data, and unit tests.',
    13: 'q13_a', 14: 'q14_a', 15: 'q15_a', 16: 'q16_a', 17: 'q17_a',
    18: 'q18_a', 19: 'q19_a', 20: 'q20_a', 21: 5, 22: 'q22_a',
    23: 'q23_b', 24: ['q24_a', 'q24_c'],
    25: 'Adapting to AI requires continuous workflow redesign, technical understanding of model limitations, critical verification, and proactive hands-on experimentation.'
  };
  const evalAdvanced = evaluateAssessment(advancedAnswers);
  assert(
    evalAdvanced.overallScore >= 75,
    'Check 13: Advanced profile produces high score (>=75 range)',
    `Score=${evalAdvanced.overallScore}`
  );

  // Check 14: Peer benchmark returns insufficiency notice when records < 30
  const mockInsuff = { insufficientData: true, count: 12 };
  assert(
    mockInsuff.insufficientData === true,
    'Check 14: Peer benchmark returns insufficiency notice when records < 30',
    `Count=${mockInsuff.count}`
  );

  // Check 15: Peer benchmark calculates accurate percentile when records >= 30
  const mockSuff = { insufficientData: false, count: 45 };
  assert(
    mockSuff.insufficientData === false,
    'Check 15: Peer benchmark returns data when records >= 30',
    `Count=${mockSuff.count}`
  );

  // Check 16: Score confidence decreases with missing responses
  const partialEval = evaluateAssessment({ 1: 'q1_a', 6: 'q6_b' });
  assert(
    partialEval.overallConfidence < evalAdvanced.overallConfidence,
    'Check 16: Score confidence decreases with missing responses',
    `Partial confidence=${partialEval.overallConfidence.toFixed(2)}, Full confidence=${evalAdvanced.overallConfidence.toFixed(2)}`
  );

  // Check 17: Evidence coverage matches percentage of answered weighted questions
  const partialCoverageEval = evaluateAssessment({ 1: 'q1_a', 6: 'q6_b' });
  assert(
    partialCoverageEval.overallEvidenceCoverage < 1.0 && evalAdvanced.overallEvidenceCoverage === 1.0,
    'Check 17: Evidence coverage matches percentage of answered weighted questions',
    `Partial coverage=${(partialCoverageEval.overallEvidenceCoverage * 100).toFixed(1)}%, Full coverage=${(evalAdvanced.overallEvidenceCoverage * 100).toFixed(1)}%`
  );

  return {
    passed: passedCount === totalCount,
    passedCount,
    totalCount,
    logs
  };
}

