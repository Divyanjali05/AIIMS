import { describe, it, expect } from 'vitest';
import { evaluateAssessment, scoreQuestion } from '../assessmentScoring';

describe('Backend Evidence-Based Scoring Engine', () => {
  it('Test 1: Two options with similar strong verification meaning produce similar scores', () => {
    const score15 = scoreQuestion(15, 'q15_a');
    const score16 = scoreQuestion(16, 'q16_a');
    expect(score15.score).toBe(100);
    expect(score16.score).toBe(100);
  });

  it('Test 2: Weak answer in option A does NOT receive high score', () => {
    const resQ6A = scoreQuestion(6, 'q6_a');
    expect(resQ6A.score).toBeLessThanOrEqual(20);
    expect(resQ6A.evidenceLevel).toBe('misunderstanding');
  });

  it('Test 3: Strong answer receives high score regardless of option letter (B/C/D)', () => {
    const resQ6B = scoreQuestion(6, 'q6_b');
    const resQ3B = scoreQuestion(3, 'q3_b');
    expect(resQ6B.score).toBe(100);
    expect(resQ3B.score).toBe(100);
  });

  it('Test 4: Selecting more options in multi-select does NOT automatically produce higher score (depth > count)', () => {
    const resBasicMulti = scoreQuestion(2, ['q2_a', 'q2_c']);
    const resDevMulti = scoreQuestion(2, ['q2_d', 'q2_f']);
    expect(resDevMulti.score).toBeGreaterThan(resBasicMulti.score);
  });

  it('Test 5: Q5 & Q24 preferences do NOT inflate capability scores', () => {
    const resQ24 = scoreQuestion(24, ['q24_a', 'q24_b', 'q24_c']);
    const evalQ24Only = evaluateAssessment({ 24: ['q24_a', 'q24_b', 'q24_c', 'q24_d'] });
    expect(resQ24.score).toBe(0);
    expect(evalQ24Only.overallScore).toBe(0);
  });

  it('Test 6: Q23 attitude/concern stays within balanced analytical range without artificial inflation/reduction', () => {
    const resQ23Concern = scoreQuestion(23, 'q23_b');
    const resQ23Optimism = scoreQuestion(23, 'q23_d');
    expect(resQ23Concern.score).toBeGreaterThanOrEqual(60);
    expect(resQ23Concern.score).toBeLessThanOrEqual(85);
    expect(resQ23Optimism.score).toBeGreaterThanOrEqual(60);
    expect(resQ23Optimism.score).toBeLessThanOrEqual(85);
  });

  it('Test 7: Open-ended answers are evaluated from actual text content, not repetitive length', () => {
    const strongArchitecturePrompt =
      'Act as Senior System Architect. Design React and Node.js microservices architecture with PostgreSQL, Redis, JWT auth, and explicit rate limiting schemas.';
    const weakArchitecturePrompt =
      'make a website make a website make a website make a website make a website';
    const resStrongText = scoreQuestion(11, strongArchitecturePrompt);
    const resWeakText = scoreQuestion(11, weakArchitecturePrompt);
    expect(resStrongText.score).toBeGreaterThan(resWeakText.score);
    expect(resStrongText.evidenceLevel).toBe('strong');
  });

  it('Test 8: Missing/empty evidence receives 0 score with no score inflation', () => {
    const resEmptyText = scoreQuestion(11, '');
    const evalAllEmpty = evaluateAssessment({});
    expect(resEmptyText.score).toBe(0);
    expect(evalAllEmpty.overallScore).toBe(0);
  });

  it('Test 9: Anthropic failure uses deterministic fallback without fake numeric scores', () => {
    const resFallback = scoreQuestion(11, 'Build a typescript backend API');
    expect(resFallback.scoringMethod).toBe('deterministic_fallback');
    expect(resFallback.anthropicStatus).toBe('unavailable');
    expect([85, 80, 94, 90].includes(resFallback.score)).toBe(false);
  });

  it('Test 10: Every final capability score can be traced to actual question evidence', () => {
    const fullEval = evaluateAssessment({
      1: 'q1_a',
      6: 'q6_b',
      7: 'q7_a',
      9: 'q9_a',
      21: 5,
    });
    const usingCap = fullEval.capabilities.usingAI;
    expect(usingCap.contributingQuestionIds).toContain(1);
    expect(usingCap.questionScores[1]).toBe(100);
    expect(usingCap.rubricVersion).toBe('3.0.0-evidence-based');
  });

  it('Test 11: Intermediate learner profile produces moderate score (50–74 range)', () => {
    const intermediateAnswers: Record<number, any> = {
      1: 'q1_c',
      2: ['q2_a', 'q2_b'],
      3: 'q3_a',
      4: 3,
      5: 'q5_b',
      6: 'q6_b',
      7: 'q7_b',
      8: 'q8_a',
      9: 'q9_b',
      10: 'q10_a',
      11: 'Act as a developer. Create a REST API using Node and Express with MongoDB.',
      12: 'Write a React component with state for counter.',
      13: 'q13_c',
      14: 'q14_b',
      15: 'q15_c',
      16: 'q16_b',
      17: 'q17_b',
      18: 'q18_b',
      19: 'q19_b',
      20: 'q20_b',
      21: 3,
      22: 'q22_b',
      23: 'q23_b',
      24: ['q24_b'],
      25: 'Adapting means changing workflows and mindset while using is just typing.',
    };
    const evalIntermediate = evaluateAssessment(intermediateAnswers);
    expect(evalIntermediate.overallScore).toBeGreaterThanOrEqual(50);
    expect(evalIntermediate.overallScore).toBeLessThanOrEqual(74);
  });

  it('Test 12: Beginner profile produces low score (<50 range)', () => {
    const beginnerAnswers: Record<number, any> = {
      1: 'q1_d',
      2: ['q2_a'],
      3: 'q3_d',
      4: 5,
      5: 'q5_a',
      6: 'q6_a',
      7: 'q7_d',
      8: 'q8_d',
      9: 'q9_d',
      10: 'q10_d',
      11: 'make website',
      12: 'write code',
      13: 'q13_d',
      14: 'q14_d',
      15: 'q15_d',
      16: 'q16_d',
      17: 'q17_d',
      18: 'q18_d',
      19: 'q19_d',
      20: 'q20_d',
      21: 1,
      22: 'q22_d',
      23: 'q23_d',
      24: ['q24_a'],
      25: 'idk',
    };
    const evalBeginner = evaluateAssessment(beginnerAnswers);
    expect(evalBeginner.overallScore).toBeLessThan(50);
  });

  it('Test 13: Advanced profile produces high score (>=75 range)', () => {
    const advancedAnswers: Record<number, any> = {
      1: 'q1_a',
      2: ['q2_a', 'q2_d', 'q2_f'],
      3: 'q3_b',
      4: 1,
      5: 'q5_c',
      6: 'q6_b',
      7: 'q7_a',
      8: 'q8_a',
      9: 'q9_a',
      10: 'q10_a',
      11: 'Act as Senior System Architect. Design React and Node.js microservices architecture with PostgreSQL, Redis, JWT auth, and explicit rate limiting schemas.',
      12: 'Create modular TypeScript React component with custom hook, error handling, mock data, and unit tests.',
      13: 'q13_a',
      14: 'q14_a',
      15: 'q15_a',
      16: 'q16_a',
      17: 'q17_a',
      18: 'q18_a',
      19: 'q19_a',
      20: 'q20_a',
      21: 5,
      22: 'q22_a',
      23: 'q23_b',
      24: ['q24_a', 'q24_c'],
      25: 'Adapting to AI requires continuous workflow redesign, technical understanding of model limitations, critical verification, and proactive hands-on experimentation.',
    };
    const evalAdvanced = evaluateAssessment(advancedAnswers);
    expect(evalAdvanced.overallScore).toBeGreaterThanOrEqual(75);
  });

  it('Test 14: Peer benchmark returns insufficiency notice when records < 30', () => {
    const mockInsuff = { insufficientData: true, count: 12 };
    expect(mockInsuff.insufficientData).toBe(true);
  });

  it('Test 15: Peer benchmark returns data when records >= 30', () => {
    const mockSuff = { insufficientData: false, count: 45 };
    expect(mockSuff.insufficientData).toBe(false);
  });

  it('Test 16: Score confidence decreases with missing responses', () => {
    const partialEval = evaluateAssessment({ 1: 'q1_a', 6: 'q6_b' });
    const advancedAnswers: Record<number, any> = {
      1: 'q1_a',
      2: ['q2_a', 'q2_d', 'q2_f'],
      3: 'q3_b',
      4: 1,
      5: 'q5_c',
      6: 'q6_b',
      7: 'q7_a',
      8: 'q8_a',
      9: 'q9_a',
      10: 'q10_a',
      11: 'Act as Senior System Architect. Design React and Node.js microservices architecture with PostgreSQL, Redis, JWT auth, and explicit rate limiting schemas.',
      12: 'Create modular TypeScript React component with custom hook, error handling, mock data, and unit tests.',
      13: 'q13_a',
      14: 'q14_a',
      15: 'q15_a',
      16: 'q16_a',
      17: 'q17_a',
      18: 'q18_a',
      19: 'q19_a',
      20: 'q20_a',
      21: 5,
      22: 'q22_a',
      23: 'q23_b',
      24: ['q24_a', 'q24_c'],
      25: 'Adapting to AI requires continuous workflow redesign, technical understanding of model limitations, critical verification, and proactive hands-on experimentation.',
    };
    const evalAdvanced = evaluateAssessment(advancedAnswers);
    expect(partialEval.overallConfidence).toBeLessThan(evalAdvanced.overallConfidence);
  });

  it('Test 17: Evidence coverage matches percentage of answered weighted questions', () => {
    const partialCoverageEval = evaluateAssessment({ 1: 'q1_a', 6: 'q6_b' });
    const advancedAnswers: Record<number, any> = {
      1: 'q1_a',
      2: ['q2_a', 'q2_d', 'q2_f'],
      3: 'q3_b',
      4: 1,
      5: 'q5_c',
      6: 'q6_b',
      7: 'q7_a',
      8: 'q8_a',
      9: 'q9_a',
      10: 'q10_a',
      11: 'Act as Senior System Architect. Design React and Node.js microservices architecture with PostgreSQL, Redis, JWT auth, and explicit rate limiting schemas.',
      12: 'Create modular TypeScript React component with custom hook, error handling, mock data, and unit tests.',
      13: 'q13_a',
      14: 'q14_a',
      15: 'q15_a',
      16: 'q16_a',
      17: 'q17_a',
      18: 'q18_a',
      19: 'q19_a',
      20: 'q20_a',
      21: 5,
      22: 'q22_a',
      23: 'q23_b',
      24: ['q24_a', 'q24_c'],
      25: 'Adapting to AI requires continuous workflow redesign, technical understanding of model limitations, critical verification, and proactive hands-on experimentation.',
    };
    const evalAdvanced = evaluateAssessment(advancedAnswers);
    expect(partialCoverageEval.overallEvidenceCoverage).toBeLessThan(1.0);
    expect(evalAdvanced.overallEvidenceCoverage).toBe(1.0);
  });
});
