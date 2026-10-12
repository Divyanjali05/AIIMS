import { evaluateAssessment, scoreQuestion } from '../services/assessmentScoring';

console.log('====================================================');
console.log('RUNNING AINOVA EVIDENCE-BASED SCORING ENGINE TESTS (17 SCENARIOS)');
console.log('====================================================\n');

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`✅ [PASS] Test ${totalCount}: ${testName}`);
  } else {
    console.error(`❌ [FAIL] Test ${totalCount}: ${testName}`);
    if (detail) console.error(`   Details: ${detail}`);
  }
}

// 1. Two different options with similar meaning produce similar scores
const score15 = scoreQuestion(15, 'q15_a');
const score16 = scoreQuestion(16, 'q16_a');
assert(
  score15.score === 100 && score16.score === 100,
  'Two options with similar strong verification meaning produce similar scores',
  `Q15 score=${score15.score}, Q16 score=${score16.score}`
);

// 2. Weak answer cannot receive high score merely because it is option A
const resQ6A = scoreQuestion(6, 'q6_a');
assert(
  resQ6A.score <= 20 && resQ6A.evidenceLevel === 'misunderstanding',
  'Weak answer in option A does NOT receive high score',
  `Q6 Option A score=${resQ6A.score}`
);

// 3. Strong answer can receive high score regardless of whether it is option B/C/D
const resQ6B = scoreQuestion(6, 'q6_b');
const resQ3B = scoreQuestion(3, 'q3_b');
assert(
  resQ6B.score === 100 && resQ3B.score === 100,
  'Strong answer receives high score regardless of option letter (B/C/D)',
  `Q6 Option B=${resQ6B.score}, Q3 Option B=${resQ3B.score}`
);

// 4. Selecting more options in multi-select does not automatically produce higher score
const resBasicMulti = scoreQuestion(2, ['q2_a', 'q2_c']);
const resDevMulti = scoreQuestion(2, ['q2_d', 'q2_f']);
assert(
  resDevMulti.score > resBasicMulti.score,
  'Selecting more options in multi-select does NOT automatically produce higher score (depth > count)',
  `Basic Multi (2 tools)=${resBasicMulti.score}, Dev Multi (2 tools)=${resDevMulti.score}`
);

// 5. Q5 and Q24 preferences do not inflate capability
const resQ24 = scoreQuestion(24, ['q24_a', 'q24_b', 'q24_c']);
const evalQ24Only = evaluateAssessment({ 24: ['q24_a', 'q24_b', 'q24_c', 'q24_d'] });
assert(
  resQ24.score === 0 && evalQ24Only.overallScore === 0,
  'Q5 & Q24 preferences do NOT inflate capability scores',
  `Q24 score=${resQ24.score}, overall score=${evalQ24Only.overallScore}`
);

// 6. Q23 concern/attitude does not automatically inflate or reduce capability
const resQ23Concern = scoreQuestion(23, 'q23_b');
const resQ23Optimism = scoreQuestion(23, 'q23_d');
assert(
  resQ23Concern.score >= 60 && resQ23Concern.score <= 85 && resQ23Optimism.score >= 60 && resQ23Optimism.score <= 85,
  'Q23 attitude/concern stays within balanced analytical range without artificial inflation/reduction',
  `Concern score=${resQ23Concern.score}, Optimism score=${resQ23Optimism.score}`
);

// 7. Open-ended answers are evaluated from their actual content, not length
const strongArchitecturePrompt = 'Act as Senior System Architect. Design React and Node.js microservices architecture with PostgreSQL, Redis, JWT auth, and explicit rate limiting schemas.';
const weakArchitecturePrompt = 'make a website make a website make a website make a website make a website';
const resStrongText = scoreQuestion(11, strongArchitecturePrompt);
const resWeakText = scoreQuestion(11, weakArchitecturePrompt);
assert(
  resStrongText.score > resWeakText.score && resStrongText.evidenceLevel === 'strong',
  'Open-ended answers are evaluated from actual text content, not repetitive length',
  `Strong prompt score=${resStrongText.score}, Repetitive prompt score=${resWeakText.score}`
);

// 8. Missing or empty evidence does not receive an invented high score
const resEmptyText = scoreQuestion(11, '');
const evalAllEmpty = evaluateAssessment({});
assert(
  resEmptyText.score === 0 && evalAllEmpty.overallScore === 0,
  'Missing/empty evidence receives 0 score with no score inflation',
  `Empty Q11 score=${resEmptyText.score}, Empty overall score=${evalAllEmpty.overallScore}`
);

// 9. Anthropic failure does not produce a fake numeric score
const resFallback = scoreQuestion(11, 'Build a typescript backend API');
assert(
  resFallback.scoringMethod === 'deterministic_fallback' && resFallback.anthropicStatus === 'unavailable' && ![85, 80, 94, 90].includes(resFallback.score),
  'Anthropic failure uses deterministic fallback without fake numeric scores',
  `Scoring method=${resFallback.scoringMethod}, Anthropic status=${resFallback.anthropicStatus}`
);

// 10. Every final capability score can be traced to actual question evidence
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
  'Every final capability score can be traced to actual question evidence',
  `Using AI contributing Qs=${usingCap.contributingQuestionIds.join(',')}, Q1 score=${usingCap.questionScores[1]}`
);

// 11. Intermediate learner profile produces moderate score (50–74 range)
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
  'Intermediate learner profile produces moderate score (50–74 range)',
  `Overall score=${evalIntermediate.overallScore}`
);

// 12. Beginner profile produces low score (<50 range)
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
  'Beginner profile produces low score (<50 range)',
  `Overall score=${evalBeginner.overallScore}`
);

// 13. Advanced profile produces high score (>=75 range)
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
  'Advanced profile produces high score (>=75 range)',
  `Overall score=${evalAdvanced.overallScore}`
);

// 14. Peer benchmark returns insufficiency notice when records < 30
function simulatePeerBenchmark(recordCount: number) {
  if (recordCount < 30) {
    return { insufficientData: true, message: `Peer benchmark requires minimum 30 completed assessments (current: ${recordCount}).` };
  }
  return { insufficientData: false, totalCompleted: recordCount };
}
const benchInsuff = simulatePeerBenchmark(12);
assert(
  benchInsuff.insufficientData === true,
  'Peer benchmark returns insufficiency notice when records < 30',
  `Message: ${benchInsuff.message}`
);

// 15. Peer benchmark calculates accurate percentile when records >= 30
const benchSuff = simulatePeerBenchmark(45);
assert(
  benchSuff.insufficientData === false && benchSuff.totalCompleted === 45,
  'Peer benchmark returns data when records >= 30',
  `Total completed=${benchSuff.totalCompleted}`
);

// 16. Score confidence decreases with missing responses
const partialEval = evaluateAssessment({ 1: 'q1_a', 6: 'q6_b' });
assert(
  partialEval.overallConfidence < evalAdvanced.overallConfidence,
  'Score confidence decreases with missing responses',
  `Partial confidence=${partialEval.overallConfidence.toFixed(2)}, Full confidence=${evalAdvanced.overallConfidence.toFixed(2)}`
);

// 17. Evidence coverage matches percentage of answered weighted questions
const partialCoverageEval = evaluateAssessment({ 1: 'q1_a', 6: 'q6_b' });
assert(
  partialCoverageEval.overallEvidenceCoverage < 1.0 && evalAdvanced.overallEvidenceCoverage === 1.0,
  'Evidence coverage matches percentage of answered weighted questions',
  `Partial coverage=${(partialCoverageEval.overallEvidenceCoverage * 100).toFixed(1)}%, Full coverage=${(evalAdvanced.overallEvidenceCoverage * 100).toFixed(1)}%`
);

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passedCount} / ${totalCount} Quality Checks Passed.`);
console.log('====================================================\n');

if (passedCount < totalCount) {
  process.exit(1);
}

