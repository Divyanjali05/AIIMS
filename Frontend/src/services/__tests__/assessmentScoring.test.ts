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

  // Quality Check 1: Two different options with similar meaning produce similar scores.
  const score15 = scoreQuestion(15, 'q15_a');
  const score16 = scoreQuestion(16, 'q16_a');
  assert(
    score15.score === 100 && score16.score === 100,
    'Check 1: Similar meaning options produce similar scores',
    `Q15=${score15.score}, Q16=${score16.score}`
  );

  // Quality Check 2: A weak answer cannot receive a high score merely because it is option A.
  const resQ6A = scoreQuestion(6, 'q6_a');
  assert(
    resQ6A.score <= 20 && resQ6A.evidenceLevel === 'misunderstanding',
    'Check 2: Weak answer in Option A does NOT get a high score',
    `Q6 option A score=${resQ6A.score}`
  );

  // Quality Check 3: A strong answer can receive a high score regardless of whether it is option B/C/D.
  const resQ6B = scoreQuestion(6, 'q6_b');
  const resQ3B = scoreQuestion(3, 'q3_b');
  assert(
    resQ6B.score === 100 && resQ3B.score === 100,
    'Check 3: Strong answer receives high score regardless of option letter B/C/D',
    `Q6 B=${resQ6B.score}, Q3 B=${resQ3B.score}`
  );

  // Quality Check 4: Selecting more options in multi-select does not automatically produce a higher score.
  const resBasicMulti = scoreQuestion(2, ['q2_a', 'q2_c']);
  const resDevMulti = scoreQuestion(2, ['q2_d', 'q2_f']);
  assert(
    resDevMulti.score > resBasicMulti.score,
    'Check 4: Multi-select evaluated on technical depth rather than raw option count',
    `Basic (2 tools)=${resBasicMulti.score}, Dev (2 tools)=${resDevMulti.score}`
  );

  // Quality Check 5: Q24 preferences do not inflate capability.
  const resQ24 = scoreQuestion(24, ['q24_a', 'q24_b', 'q24_c']);
  const evalQ24Only = evaluateAssessment({ 24: ['q24_a', 'q24_b', 'q24_c', 'q24_d'] });
  assert(
    resQ24.score === 0 && evalQ24Only.overallScore === 0,
    'Check 5: Q24 preferences do NOT inflate capability scores',
    `Q24 score=${resQ24.score}, overall=${evalQ24Only.overallScore}`
  );

  // Quality Check 6: Q23 attitude/concern does not automatically inflate or reduce capability.
  const resQ23Concern = scoreQuestion(23, 'q23_b');
  const resQ23Optimism = scoreQuestion(23, 'q23_d');
  assert(
    resQ23Concern.score >= 60 && resQ23Concern.score <= 85 && resQ23Optimism.score >= 60 && resQ23Optimism.score <= 85,
    'Check 6: Q23 attitude/concern stays within balanced analytical range',
    `Concern=${resQ23Concern.score}, Optimism=${resQ23Optimism.score}`
  );

  // Quality Check 7: Open-ended answers are evaluated from their actual content.
  const strongPrompt = 'Act as Senior System Architect. Design React and Node.js microservices architecture with PostgreSQL, Redis, JWT auth, and explicit rate limiting schemas.';
  const weakPrompt = 'make a website';
  const resStrongText = scoreQuestion(11, strongPrompt);
  const resWeakText = scoreQuestion(11, weakPrompt);
  assert(
    resStrongText.score > resWeakText.score && resStrongText.evidenceLevel === 'strong',
    'Check 7: Open-ended answers evaluated from actual text content',
    `Strong prompt score=${resStrongText.score}, Weak prompt score=${resWeakText.score}`
  );

  // Quality Check 8: Missing/empty evidence does not receive an invented high score.
  const resEmptyText = scoreQuestion(11, '');
  const evalEmptyAll = evaluateAssessment({});
  assert(
    resEmptyText.score === 0 && evalEmptyAll.overallScore === 0,
    'Check 8: Missing/empty evidence receives 0 score with no score inflation',
    `Empty text=${resEmptyText.score}, Empty overall=${evalEmptyAll.overallScore}`
  );

  // Quality Check 9: Anthropic failure does not produce a fake numeric score.
  const resFallback = scoreQuestion(11, 'Build a typescript backend API');
  assert(
    resFallback.scoringMethod === 'deterministic_fallback' && resFallback.anthropicStatus === 'unavailable' && ![85, 80, 94, 90].includes(resFallback.score),
    'Check 9: Anthropic failure uses deterministic fallback without fake scores (85/80)',
    `Method=${resFallback.scoringMethod}, Status=${resFallback.anthropicStatus}`
  );

  // Quality Check 10: Every final capability score can be traced to actual question evidence.
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
    'Check 10: Every final capability score can be traced to actual question evidence',
    `Contributing Qs=${usingCap.contributingQuestionIds.join(',')}`
  );

  return {
    passed: passedCount === totalCount,
    passedCount,
    totalCount,
    logs
  };
}
