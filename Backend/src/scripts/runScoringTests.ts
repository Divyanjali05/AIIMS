import { evaluateAssessment, scoreQuestion } from '../services/assessmentScoring';

console.log('====================================================');
console.log('RUNNING AINOVA ASSESSMENT SCORING ENGINE TESTS');
console.log('====================================================\n');

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`✅ [PASS] Check ${totalCount}: ${testName}`);
  } else {
    console.error(`❌ [FAIL] Check ${totalCount}: ${testName}`);
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

// 5. Q24 preferences do not inflate capability
const resQ24 = scoreQuestion(24, ['q24_a', 'q24_b', 'q24_c']);
const evalQ24Only = evaluateAssessment({ 24: ['q24_a', 'q24_b', 'q24_c', 'q24_d'] });
assert(
  resQ24.score === 0 && evalQ24Only.overallScore === 0,
  'Q24 preferences do NOT inflate capability scores',
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

// 7. Open-ended answers are evaluated from their actual content
const strongArchitecturePrompt = 'Act as Senior System Architect. Design React and Node.js microservices architecture with PostgreSQL, Redis, JWT auth, and explicit rate limiting schemas.';
const weakArchitecturePrompt = 'make a website';
const resStrongText = scoreQuestion(11, strongArchitecturePrompt);
const resWeakText = scoreQuestion(11, weakArchitecturePrompt);
assert(
  resStrongText.score > resWeakText.score && resStrongText.evidenceLevel === 'strong',
  'Open-ended answers are evaluated from actual text content',
  `Strong prompt score=${resStrongText.score}, Weak prompt score=${resWeakText.score}`
);

// 8. Missing/empty evidence does not receive an invented high score
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
  usingCap.contributingQuestionIds.includes(1) && usingCap.questionScores[1] === 100 && usingCap.rubricVersion === '2.0.0-ainova',
  'Every final capability score can be traced to actual question evidence',
  `Using AI contributing Qs=${usingCap.contributingQuestionIds.join(',')}, Q1 score=${usingCap.questionScores[1]}`
);

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passedCount} / ${totalCount} Quality Checks Passed.`);
console.log('====================================================\n');

if (passedCount < totalCount) {
  process.exit(1);
}
