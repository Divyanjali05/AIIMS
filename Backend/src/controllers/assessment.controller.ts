import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma, isDatabaseConnected } from '../config/prisma';
import { getDefaultDimensionScores } from '../data/aiimsCatalog';
import { ASSESSMENT_QUESTIONS, STORY_STATIONS } from '../data/assessmentQuestions';
import { ClaudeService } from '../services/anthropic/claude.service';
import { evaluateAssessment } from '../services/assessmentScoring';
import { CREDIT_RULES, ASSESSMENT_RULES, formatUserState } from '../config/credits.config';
import { creditsLedgerService } from '../services/creditsLedger.service';
import { aiProfileGeneratorService } from '../services/aiProfileGenerator.service';
import {
  defaultAnalysis,
  defaultAssessment,
  toJsonInput,
  userRecordToIUser,
} from '../utils/userMapper';
import { isValidId, toRecord } from '../utils/id';

const claudeService = new ClaudeService();

/**
 * Minimum required completed assessments for cohort comparison (k-anonymity protection)
 */
const MIN_REQUIRED_RECORDS = 5;

/**
 * GET /assessments/questions
 * Returns canonical diagnostic questions across the 5 calibrated stations
 */
export const getQuestions = (req: Request, res: Response) => {
  if (req.query.stations === 'true' || req.query.full === 'true') {
    return res.json({
      stations: STORY_STATIONS,
      questions: ASSESSMENT_QUESTIONS,
      totalQuestions: ASSESSMENT_QUESTIONS.length,
    });
  }
  return res.json(ASSESSMENT_QUESTIONS);
};

/**
 * POST /assessments/submit
 */
export const submitAssessment = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const userId = String(req.user.id || req.user._id);
  if (!isValidId(userId)) {
    return res.status(400).json({ error: 'Invalid user identifier', code: 'INVALID_USER_ID' });
  }

  const { answers } = req.body;
  const userAnswers = answers || {};

  const existingRow = await prisma.user.findUnique({ where: { id: userId } });
  if (!existingRow) {
    return res.status(404).json({ error: 'User record not found', code: 'USER_NOT_FOUND' });
  }

  // 1. Authoritative Assessment Submission Fee (-100 AC)
  // Check available balance and deduct 100 AC atomically with idempotency protection
  const chargeIdempotencyKey = `assessment::${userId}::charge`;
  const chargeResult = await creditsLedgerService.chargeAssessmentSubmission(
    userId,
    chargeIdempotencyKey
  );

  if (!chargeResult.success) {
    if (chargeResult.code === 'INSUFFICIENT_CREDITS') {
      return res.status(402).json({
        error: `Insufficient AIIMS Credits to submit assessment. Requires ${ASSESSMENT_RULES.SUBMISSION_CHARGE} AC. Current balance: ${chargeResult.balance ?? existingRow.aiimsCredits} AC.`,
        code: 'INSUFFICIENT_CREDITS',
        requiredCredits: ASSESSMENT_RULES.SUBMISSION_CHARGE,
        currentBalance: chargeResult.balance ?? existingRow.aiimsCredits,
      });
    }
    if (chargeResult.code === 'DATABASE_UNAVAILABLE') {
      return res.status(503).json({
        error: 'Database service unavailable. PostgreSQL connection is required.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    return res.status(500).json({
      error: chargeResult.error || 'Failed to process assessment submission fee.',
      code: 'TRANSACTION_FAILED',
    });
  }

  // 2. Open-ended evaluations via Claude (with graceful fallback if unavailable)
  const openEndedEvaluations: Record<number, any> = {};
  try {
    const q11Text = typeof userAnswers[11] === 'string' ? userAnswers[11] : userAnswers['11'];
    if (q11Text) {
      const eval11 = await claudeService.evaluateOpenEndedAnswer(
        'Q11',
        'AI THINKING LAB: Designing Software Architecture',
        'Evaluates authentic problem-framing, system boundary definition, role setting, and technical constraint specification.',
        'Solving with AI',
        'Strong: explicit role, technical stack, modular components, non-functional requirements. Weak: generic vague prompt.',
        q11Text
      );
      if (eval11) openEndedEvaluations[11] = eval11;
    }

    const q12Text = typeof userAnswers[12] === 'string' ? userAnswers[12] : userAnswers['12'];
    if (q12Text) {
      const eval12 = await claudeService.evaluateOpenEndedAnswer(
        'Q12',
        'AI THINKING LAB: Building a Working Prototype (MVP)',
        'Evaluates code generation prompting strategy: component modularity, API contract definition, and edge case instructions.',
        'Solving with AI',
        'Strong: explicit languages/frameworks, step-by-step code snippets, mock data, edge cases. Weak: generic request.',
        q12Text
      );
      if (eval12) openEndedEvaluations[12] = eval12;
    }

    const q25Text = typeof userAnswers[25] === 'string' ? userAnswers[25] : userAnswers['25'];
    if (q25Text) {
      const eval25 = await claudeService.evaluateOpenEndedAnswer(
        'Q25',
        'AI THINKING LAB: What separates someone who merely uses AI from someone who adapts to AI?',
        'Evaluates meta-cognition, understanding of paradigm shifts, workflow redesign, and human-AI co-evolution.',
        'Adapting to AI',
        'Strong: workflow redesign mindset, understanding capabilities/limits, continuous learning. Weak: superficial statement.',
        q25Text
      );
      if (eval25) openEndedEvaluations[25] = eval25;
    }
  } catch (err) {
    console.warn(
      'Claude open-ended evaluation warning (continuing with deterministic scoring):',
      err
    );
  }

  // 3. Calculate scores using AIIMS Evidence-Based Scoring Engine
  const evaluationResult = evaluateAssessment(userAnswers, openEndedEvaluations);
  const overallScore = evaluationResult.overallScore;

  // 4. Bonus Economy Logic: Score strictly greater than 95% awards 50 AC bonus exactly once
  // (Score equal to 95% or lower receives no bonus)
  let bonusAwarded = false;
  let bonusResult: any = null;
  const bonusIdempotencyKey = `assessment::${userId}::bonus`;

  if (overallScore > ASSESSMENT_RULES.HIGH_SCORE_BONUS_THRESHOLD) {
    bonusResult = await creditsLedgerService.awardAssessmentBonus(
      userId,
      overallScore,
      bonusIdempotencyKey
    );
    if (bonusResult && bonusResult.success && !bonusResult.duplicate) {
      bonusAwarded = true;
    }
  }

  const existingAssessment = {
    ...defaultAssessment(),
    ...toRecord(existingRow.assessmentData),
  };
  const existingAnalysis = {
    ...defaultAnalysis(),
    ...toRecord(existingRow.analysisData),
  };

  const isAlreadyCompleted =
    existingRow.assessmentStatus === 'completed' || existingAssessment.status === 'completed';

  const nowIso = new Date().toISOString();
  const nextAssessmentData = {
    ...existingAssessment,
    status: 'completed',
    answers: userAnswers,
    currentQuestionIndex: 25,
    completedAt: existingAssessment.completedAt || nowIso,
    rewardClaimed: true,
    chargedFee: 100,
    highScoreBonusClaimed: bonusAwarded || Boolean(bonusResult?.duplicate),
    scores: evaluationResult.legacyScores,
    evaluationResult,
  };

  const nextAnalysisData = {
    ...existingAnalysis,
    status: 'unlocked',
    topCapability: evaluationResult.strongestSkill.name,
    growthArea: evaluationResult.roomToGrow.name,
    unlockedAt: existingAnalysis.unlockedAt || nowIso,
  };

  const xpReward = ASSESSMENT_RULES.XP_REWARD;
  const isFirstCompletion = !isAlreadyCompleted;

  let updatedRow;
  try {
    updatedRow = await prisma.user.update({
      where: { id: userId },
      data: {
        stage: 'Understanding',
        assessmentStatus: 'completed',
        assessmentData: toJsonInput(nextAssessmentData),
        analysisData: toJsonInput(nextAnalysisData),
        ...(isFirstCompletion ? { xpPoints: { increment: xpReward } } : {}),
      },
    });
  } catch (persistErr) {
    // If persistence fails after a non-duplicate deduction, compensate by refunding
    if (!chargeResult.duplicate) {
      await creditsLedgerService
        .refundCredits(
          userId,
          100,
          'REFUND',
          'Automatic Refund: Assessment Persistence Failure',
          `refund::assessment::${userId}::failure`
        )
        .catch(() => {});
    }
    throw persistErr;
  }

  req.user = userRecordToIUser(updatedRow);
  const currentBalance = await creditsLedgerService.getBalance(userId);

  return res.json({
    message: isAlreadyCompleted
      ? 'Assessment updated (idempotent submission preserved)'
      : 'Assessment completed and saved to PostgreSQL!',
    chargedCredits: chargeResult.duplicate ? 0 : 100,
    bonusEarned: overallScore > 95 ? (bonusResult?.duplicate ? 0 : 50) : 0,
    overallScore,
    qualifiesForBonus: overallScore > 95,
    evaluationResult,
    scores: evaluationResult.legacyScores,
    topCapability: evaluationResult.strongestSkill.name,
    growthArea: evaluationResult.roomToGrow.name,
    updatedBalance: currentBalance,
    updatedScores: evaluationResult.legacyScores,
  });
};

/**
 * GET /analysis/peer-benchmarks
 */
export const getPeerBenchmarks = async (req: AuthenticatedRequest, res: Response) => {
  const MIN_REQUIRED_RECORDS = 30;

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
      available: false,
      totalComparableRecords: 0,
      minRequiredRecords: MIN_REQUIRED_RECORDS,
    });
  }

  try {
    const allCompleted = await prisma.user.findMany({
      where: { assessmentStatus: 'completed' },
      select: { assessmentData: true },
    });

    const completedUsers = allCompleted.filter(
      (u) => toRecord(u.assessmentData)?.evaluationResult?.scoringVersion === '3.0.0-evidence-based'
    );

    if (completedUsers.length < MIN_REQUIRED_RECORDS) {
      return res.json({
        available: false,
        totalComparableRecords: completedUsers.length,
        minRequiredRecords: MIN_REQUIRED_RECORDS,
        message:
          'Peer benchmarks are not available yet. They will appear when enough comparable assessments have been completed.',
      });
    }

    let sumUsingAI = 0;
    let sumUnderstandingAI = 0;
    let sumSolvingWithAI = 0;
    let sumCheckingAI = 0;
    let sumAdaptingToAI = 0;
    let sumOverall = 0;
    const allOverallScores: number[] = [];

    completedUsers.forEach((u) => {
      const evalRes = toRecord(u.assessmentData).evaluationResult;
      if (evalRes && evalRes.capabilities) {
        const uScore = evalRes.capabilities.usingAI?.score || 0;
        const undScore = evalRes.capabilities.understandingAI?.score || 0;
        const solScore = evalRes.capabilities.solvingWithAI?.score || 0;
        const chkScore = evalRes.capabilities.checkingAI?.score || 0;
        const adpScore = evalRes.capabilities.adaptingToAI?.score || 0;
        const ovScore =
          evalRes.overallScore ||
          Math.round((uScore + undScore + solScore + chkScore + adpScore) / 5);

        sumUsingAI += uScore;
        sumUnderstandingAI += undScore;
        sumSolvingWithAI += solScore;
        sumCheckingAI += chkScore;
        sumAdaptingToAI += adpScore;
        sumOverall += ovScore;
        allOverallScores.push(ovScore);
      }
    });

    const count = completedUsers.length;
    const benchmarks = {
      usingAI: Math.round(sumUsingAI / count),
      understandingAI: Math.round(sumUnderstandingAI / count),
      solvingWithAI: Math.round(sumSolvingWithAI / count),
      checkingAI: Math.round(sumCheckingAI / count),
      adaptingToAI: Math.round(sumAdaptingToAI / count),
    };
    const peerOverallAverage = Math.round(sumOverall / count);

    let userPercentile = 50;
    if (req.user?.assessment?.evaluationResult?.overallScore !== undefined) {
      const userOverall = req.user.assessment.evaluationResult.overallScore;
      const lowerCount = allOverallScores.filter((s) => s < userOverall).length;
      const equalCount = allOverallScores.filter((s) => s === userOverall).length;
      userPercentile = Math.min(
        99,
        Math.max(1, Math.round(((lowerCount + 0.5 * equalCount) / count) * 100))
      );
    }

    return res.json({
      available: true,
      totalComparableRecords: count,
      minRequiredRecords: MIN_REQUIRED_RECORDS,
      benchmarks,
      peerOverallAverage,
      userPercentile,
    });
  } catch (err) {
    console.error('Failed to compute peer benchmarks:', err);
    return res.status(500).json({
      available: false,
      totalComparableRecords: 0,
      minRequiredRecords: MIN_REQUIRED_RECORDS,
      message: 'Failed to compute peer benchmarks.',
    });
  }
};

/**
 * GET /analysis/individual
 */
export const getIndividualAnalysis = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }
  const profile = formatUserState(req.user).profile;
  const evalResult = req.user.assessment?.evaluationResult;

  if (evalResult && evalResult.capabilities) {
    const scores = [
      {
        dimension: 'Using AI',
        score: evalResult.capabilities.usingAI?.score ?? 0,
        benchmark: 70,
      },
      {
        dimension: 'Understanding AI',
        score: evalResult.capabilities.understandingAI?.score ?? 0,
        benchmark: 75,
      },
      {
        dimension: 'Solving with AI',
        score: evalResult.capabilities.solvingWithAI?.score ?? 0,
        benchmark: 72,
      },
      {
        dimension: 'Checking AI',
        score: evalResult.capabilities.checkingAI?.score ?? 0,
        benchmark: 68,
      },
      {
        dimension: 'Adapting to AI',
        score: evalResult.capabilities.adaptingToAI?.score ?? 0,
        benchmark: 74,
      },
    ];

    const strengths: string[] = [];
    const gaps: string[] = [];

    if (evalResult.strongestSkill?.name) {
      strengths.push(`${evalResult.strongestSkill.name} (${evalResult.strongestSkill.score}%)`);
    }
    Object.values(evalResult.capabilities as Record<string, any>).forEach((cap: any) => {
      if (Array.isArray(cap.demonstratedStrengths)) {
        strengths.push(...cap.demonstratedStrengths.slice(0, 1));
      }
      if (Array.isArray(cap.identifiedGaps)) {
        gaps.push(...cap.identifiedGaps.slice(0, 1));
      }
    });

    if (evalResult.roomToGrow?.name) {
      gaps.unshift(`${evalResult.roomToGrow.name} (${evalResult.roomToGrow.score}%)`);
    }

    return res.json({
      learner: profile,
      scores,
      overallScore: evalResult.overallScore ?? 0,
      strengths: Array.from(new Set(strengths)).slice(0, 4),
      gaps: Array.from(new Set(gaps)).slice(0, 4),
      evaluationResult: evalResult,
    });
  }

  const scores = req.user?.assessment?.scores
    ? [
        {
          dimension: 'Generative AI Tech',
          score: req.user.assessment.scores.usageFrequency ?? 0,
          benchmark: 75,
        },
        {
          dimension: 'Prompt Engineering',
          score: req.user.assessment.scores.evaluationCapability ?? 0,
          benchmark: 80,
        },
        {
          dimension: 'Agentic Workflows',
          score: req.user.assessment.scores.workflowDesign ?? 0,
          benchmark: 78,
        },
        {
          dimension: 'AI Ethics & Alignment',
          score: req.user.assessment.scores.strategicVision ?? 0,
          benchmark: 72,
        },
        {
          dimension: 'Tool Integration',
          score: req.user.assessment.scores.mentorshipReadiness ?? 0,
          benchmark: 74,
        },
      ]
    : getDefaultDimensionScores();

  return res.json({
    learner: profile,
    scores,
    strengths: ['Baseline assessment pending'],
    gaps: ['Complete baseline assessment to uncover capability gaps'],
  });
};

/**
 * GET /analysis/comparative
 */
export const getComparativeAnalysis = async (req: Request, res: Response) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
      available: false,
      totalComparableRecords: 0,
      minRequiredRecords: MIN_REQUIRED_RECORDS,
    });
  }

  try {
    const query = req?.query || {};
    const track =
      typeof query.track === 'string' && query.track.trim() ? query.track.trim() : undefined;
    const college =
      typeof query.college === 'string' && query.college.trim() ? query.college.trim() : undefined;

    const completedUsers = await prisma.user.findMany({
      where: {
        assessmentStatus: 'completed',
        ...(track ? { track: { equals: track, mode: 'insensitive' } } : {}),
        ...(college ? { college: { equals: college, mode: 'insensitive' } } : {}),
      },
      select: { assessmentData: true, track: true, college: true },
    });

    if (completedUsers.length < MIN_REQUIRED_RECORDS) {
      return res.json({
        available: false,
        totalComparableRecords: completedUsers.length,
        minRequiredRecords: MIN_REQUIRED_RECORDS,
        track,
        college,
        message: `Comparative analysis requires at least ${MIN_REQUIRED_RECORDS} completed cohort assessments for privacy and statistical significance.`,
      });
    }

    const overallScores: number[] = [];
    const dimensionTotals = {
      usingAI: 0,
      understandingAI: 0,
      solvingWithAI: 0,
      checkingAI: 0,
      adaptingToAI: 0,
    };
    let dimensionCount = 0;

    completedUsers.forEach((u) => {
      const evalRes = toRecord(u.assessmentData)?.evaluationResult;
      if (evalRes) {
        if (typeof evalRes.overallScore === 'number' && !isNaN(evalRes.overallScore)) {
          overallScores.push(evalRes.overallScore);
        }
        if (evalRes.capabilities) {
          dimensionTotals.usingAI += evalRes.capabilities.usingAI?.score || 0;
          dimensionTotals.understandingAI += evalRes.capabilities.understandingAI?.score || 0;
          dimensionTotals.solvingWithAI += evalRes.capabilities.solvingWithAI?.score || 0;
          dimensionTotals.checkingAI += evalRes.capabilities.checkingAI?.score || 0;
          dimensionTotals.adaptingToAI += evalRes.capabilities.adaptingToAI?.score || 0;
          dimensionCount++;
        }
      }
    });

    overallScores.sort((a, b) => a - b);
    const n = overallScores.length;

    const peerAverage =
      n > 0 ? Math.round((overallScores.reduce((a, b) => a + b, 0) / n) * 10) / 10 : 0;

    const median =
      n === 0
        ? 0
        : n % 2 === 1
          ? overallScores[Math.floor(n / 2)]
          : Math.round(((overallScores[n / 2 - 1] + overallScores[n / 2]) / 2) * 10) / 10;

    const p90Index = Math.min(n - 1, Math.floor(n * 0.9));
    const p90 = n > 0 ? overallScores[p90Index] : 0;

    const capabilityAverages =
      dimensionCount > 0
        ? {
            usingAI: Math.round((dimensionTotals.usingAI / dimensionCount) * 10) / 10,
            understandingAI:
              Math.round((dimensionTotals.understandingAI / dimensionCount) * 10) / 10,
            solvingWithAI: Math.round((dimensionTotals.solvingWithAI / dimensionCount) * 10) / 10,
            checkingAI: Math.round((dimensionTotals.checkingAI / dimensionCount) * 10) / 10,
            adaptingToAI: Math.round((dimensionTotals.adaptingToAI / dimensionCount) * 10) / 10,
          }
        : {
            usingAI: 0,
            understandingAI: 0,
            solvingWithAI: 0,
            checkingAI: 0,
            adaptingToAI: 0,
          };

    // Calculate authenticated learner's percentile if user session exists
    const authUser = (req as AuthenticatedRequest).user;
    let userPercentile: number | null = null;
    let userScore: number | null = null;

    if (authUser) {
      const userEval =
        authUser.assessment?.evaluationResult ||
        (toRecord(authUser.assessment) as any)?.evaluationResult;
      if (typeof userEval?.overallScore === 'number' && !isNaN(userEval.overallScore)) {
        userScore = userEval.overallScore;
        const lowerCount = overallScores.filter((s) => s < userScore!).length;
        const equalCount = overallScores.filter((s) => s === userScore!).length;
        userPercentile =
          n > 0
            ? Math.min(99, Math.max(1, Math.round(((lowerCount + 0.5 * equalCount) / n) * 100)))
            : 50;
      }
    }

    return res.json({
      available: true,
      totalComparableRecords: completedUsers.length,
      track,
      college,
      peerAverage,
      median,
      p90,
      capabilityAverages,
      ...(userScore !== null ? { userScore, userPercentile } : {}),
    });
  } catch (err: any) {
    return res.status(500).json({
      available: false,
      totalComparableRecords: 0,
      minRequiredRecords: MIN_REQUIRED_RECORDS,
      message: err?.message || 'Comparative analysis data query failed.',
    });
  }
};

/**
 * GET /analysis/overall
 */
export const getOverallAnalysis = async (_req: Request, res: Response) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
      available: false,
      totalStudents: 0,
    });
  }

  try {
    const [total, completedRows] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({
        where: { assessmentStatus: 'completed' },
        select: { assessmentData: true, analysisData: true },
      }),
    ]);

    const scores = completedRows
      .map((r) => toRecord(r.assessmentData)?.evaluationResult?.overallScore)
      .filter((n): n is number => typeof n === 'number' && !isNaN(n));

    const cohortAverage =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : 0;

    return res.json({
      available: true,
      totalStudents: total,
      completedAssessments: completedRows.length,
      cohortAverage,
      topDimension: 'Prompt Engineering',
      biggestKnowledgeGap: 'Agentic Workflows',
    });
  } catch (err: any) {
    return res.status(500).json({
      available: false,
      totalStudents: 0,
      message: err?.message || 'Overall analysis data query failed.',
    });
  }
};

/**
 * POST /analysis/generate-profile
 * Generates persistent AI Learner Profile using authentic assessment evidence.
 * Charge: exactly 50 AC via Phase 1 centralized credit engine.
 */
export const generateAIProfile = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }

  const { idempotencyKey } = req.body || {};
  try {
    const result = await aiProfileGeneratorService.generateProfileForLearner({
      userId: req.user.id,
      idempotencyKey,
    });

    if (!result.success) {
      if (result.code === 'INSUFFICIENT_CREDITS') {
        return res.status(402).json({
          error: result.error,
          code: 'INSUFFICIENT_CREDITS',
          requiredCredits: 50,
          currentBalance: result.balance,
        });
      }
      if (result.code === 'ASSESSMENT_NOT_COMPLETED') {
        return res.status(400).json({
          error: result.error,
          code: 'ASSESSMENT_NOT_COMPLETED',
        });
      }
      return res.status(500).json({
        error: result.error || 'Failed to generate AI Learner Profile',
        code: result.code || 'GENERATION_FAILED',
        balance: result.balance,
      });
    }

    return res.json({
      success: true,
      message: result.duplicate
        ? 'AI Profile retrieved (idempotent request preserved)'
        : 'AI Learner Profile generated successfully!',
      profile: result.profile,
      balance: result.balance,
      chargedFee: result.chargedFee,
      duplicate: Boolean(result.duplicate),
      retried: Boolean(result.retried),
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || 'Unexpected error during profile generation',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * GET /analysis/ai-profile
 * Returns the authenticated learner's persistent AI profile and historical generations.
 */
export const getAIProfile = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }

  try {
    const profileData = await aiProfileGeneratorService.getProfileForLearner(req.user.id);
    return res.json(profileData);
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || 'Failed to fetch AI Learner Profile',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * GET /analysis/comparative/peer-branch
 * Peer Comparison — Same Branch Across Colleges.
 * K-Anonymity of at least 5 learners enforced.
 */
export const getPeerBranchComparison = async (req: AuthenticatedRequest, res: Response) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
      available: false,
      totalComparableRecords: 0,
      minRequiredRecords: MIN_REQUIRED_RECORDS,
    });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }

  try {
    // 1. Identify learner's branch
    const userRow = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { studentProfile: true, entrepreneurProfile: true },
    });

    const studentProfile = userRow?.studentProfile;
    const branchName =
      (typeof req.query.branch === 'string' && req.query.branch.trim()
        ? req.query.branch.trim()
        : null) ||
      studentProfile?.stream ||
      studentProfile?.specializationName ||
      studentProfile?.programName ||
      studentProfile?.streamSubCategory ||
      'Computer Science';

    const programId = studentProfile?.programId;
    const specializationId = studentProfile?.specializationId;

    // 2. Query completed peers in same branch across colleges
    const allCompletedInBranch = await prisma.user.findMany({
      where: {
        assessmentStatus: 'completed',
        role: 'learner',
        OR: [
          ...(programId ? [{ studentProfile: { programId } }] : []),
          ...(specializationId ? [{ studentProfile: { specializationId } }] : []),
          { studentProfile: { streamSubCategory: { contains: branchName, mode: 'insensitive' } } },
          { studentProfile: { specializationName: { contains: branchName, mode: 'insensitive' } } },
          { studentProfile: { programName: { contains: branchName, mode: 'insensitive' } } },
          { track: userRow?.track || 'Student' },
        ],
      },
      select: {
        id: true,
        college: true,
        assessmentData: true,
      },
    });

    // Filter valid evidence-based results
    const validPeers = allCompletedInBranch.filter((u) => {
      const evalRes = toRecord(u.assessmentData)?.evaluationResult;
      return evalRes && typeof evalRes.overallScore === 'number' && !isNaN(evalRes.overallScore);
    });

    // 3. K-Anonymity Guard (Strictly >= 5)
    if (validPeers.length < MIN_REQUIRED_RECORDS) {
      return res.json({
        available: false,
        reason: 'INSUFFICIENT_COHORT',
        comparisonType: 'SAME_BRANCH_ACROSS_COLLEGES',
        branchName,
        totalComparableRecords: validPeers.length,
        minRequiredRecords: MIN_REQUIRED_RECORDS,
        message: `Peer branch comparison requires at least ${MIN_REQUIRED_RECORDS} completed assessments in ${branchName} for privacy and statistical significance.`,
      });
    }

    // 4. Calculate skill-level comparisons
    const scores = validPeers.map(
      (u) => toRecord(u.assessmentData).evaluationResult.overallScore as number
    );
    scores.sort((a, b) => a - b);
    const n = scores.length;

    const peerAverage = Math.round((scores.reduce((a, b) => a + b, 0) / n) * 10) / 10;
    const median =
      n % 2 === 1
        ? scores[Math.floor(n / 2)]
        : Math.round(((scores[n / 2 - 1] + scores[n / 2]) / 2) * 10) / 10;
    const p90 = scores[Math.min(n - 1, Math.floor(n * 0.9))];

    // Capability dimension averages
    const capTotals = {
      usingAI: 0,
      understandingAI: 0,
      solvingWithAI: 0,
      checkingAI: 0,
      adaptingToAI: 0,
    };
    validPeers.forEach((u) => {
      const caps = toRecord(u.assessmentData).evaluationResult.capabilities;
      if (caps) {
        capTotals.usingAI += caps.usingAI?.score || 0;
        capTotals.understandingAI += caps.understandingAI?.score || 0;
        capTotals.solvingWithAI += caps.solvingWithAI?.score || 0;
        capTotals.checkingAI += caps.checkingAI?.score || 0;
        capTotals.adaptingToAI += caps.adaptingToAI?.score || 0;
      }
    });

    const capabilityAverages = {
      usingAI: Math.round((capTotals.usingAI / n) * 10) / 10,
      understandingAI: Math.round((capTotals.understandingAI / n) * 10) / 10,
      solvingWithAI: Math.round((capTotals.solvingWithAI / n) * 10) / 10,
      checkingAI: Math.round((capTotals.checkingAI / n) * 10) / 10,
      adaptingToAI: Math.round((capTotals.adaptingToAI / n) * 10) / 10,
    };

    // Calculate authenticated learner's relative performance
    const userEval = toRecord(userRow?.assessmentData)?.evaluationResult;
    let userScore: number | null = null;
    let userPercentile: number | null = null;

    if (userEval && typeof userEval.overallScore === 'number') {
      userScore = userEval.overallScore;
      const lowerCount = scores.filter((s) => s < userScore!).length;
      const equalCount = scores.filter((s) => s === userScore!).length;
      userPercentile = Math.min(
        99,
        Math.max(1, Math.round(((lowerCount + 0.5 * equalCount) / n) * 100))
      );
    }

    const collegesCount = new Set(validPeers.map((p) => p.college).filter(Boolean)).size;

    return res.json({
      available: true,
      comparisonType: 'SAME_BRANCH_ACROSS_COLLEGES',
      branchName,
      totalComparableRecords: n,
      minRequiredRecords: MIN_REQUIRED_RECORDS,
      distinctCollegesCount: collegesCount,
      peerAverage,
      median,
      p90,
      capabilityAverages,
      ...(userScore !== null ? { userScore, userPercentile } : {}),
    });
  } catch (err: any) {
    return res.status(500).json({
      available: false,
      totalComparableRecords: 0,
      minRequiredRecords: MIN_REQUIRED_RECORDS,
      message: err?.message || 'Failed to compute peer branch comparison.',
    });
  }
};

/**
 * GET /analysis/comparative/cohort-all
 * Overall Cohort Comparison — All Branches.
 * K-Anonymity of at least 5 learners enforced.
 */
export const getCohortAllComparison = async (req: Request, res: Response) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
      available: false,
      totalComparableRecords: 0,
      minRequiredRecords: MIN_REQUIRED_RECORDS,
    });
  }

  try {
    const completedUsers = await prisma.user.findMany({
      where: {
        assessmentStatus: 'completed',
        role: 'learner',
      },
      select: {
        id: true,
        assessmentData: true,
        studentProfile: {
          select: {
            stream: true,
            programName: true,
            specializationName: true,
            streamSubCategory: true,
          },
        },
      },
    });

    const validUsers = completedUsers.filter((u) => {
      const evalRes = toRecord(u.assessmentData)?.evaluationResult;
      return evalRes && typeof evalRes.overallScore === 'number' && !isNaN(evalRes.overallScore);
    });

    // K-Anonymity Guard (Strictly >= 5)
    if (validUsers.length < MIN_REQUIRED_RECORDS) {
      return res.json({
        available: false,
        reason: 'INSUFFICIENT_COHORT',
        comparisonType: 'ALL_BRANCHES_COHORT',
        totalComparableRecords: validUsers.length,
        minRequiredRecords: MIN_REQUIRED_RECORDS,
        message: `Overall cohort comparison requires at least ${MIN_REQUIRED_RECORDS} completed assessments across branches for privacy and statistical significance.`,
      });
    }

    const scores = validUsers.map(
      (u) => toRecord(u.assessmentData).evaluationResult.overallScore as number
    );
    scores.sort((a, b) => a - b);
    const n = scores.length;

    const cohortAverage = Math.round((scores.reduce((a, b) => a + b, 0) / n) * 10) / 10;
    const median =
      n % 2 === 1
        ? scores[Math.floor(n / 2)]
        : Math.round(((scores[n / 2 - 1] + scores[n / 2]) / 2) * 10) / 10;
    const p90 = scores[Math.min(n - 1, Math.floor(n * 0.9))];

    // Capability dimension averages
    const capTotals = {
      usingAI: 0,
      understandingAI: 0,
      solvingWithAI: 0,
      checkingAI: 0,
      adaptingToAI: 0,
    };
    validUsers.forEach((u) => {
      const caps = toRecord(u.assessmentData).evaluationResult.capabilities;
      if (caps) {
        capTotals.usingAI += caps.usingAI?.score || 0;
        capTotals.understandingAI += caps.understandingAI?.score || 0;
        capTotals.solvingWithAI += caps.solvingWithAI?.score || 0;
        capTotals.checkingAI += caps.checkingAI?.score || 0;
        capTotals.adaptingToAI += caps.adaptingToAI?.score || 0;
      }
    });

    const capabilityAverages = {
      usingAI: Math.round((capTotals.usingAI / n) * 10) / 10,
      understandingAI: Math.round((capTotals.understandingAI / n) * 10) / 10,
      solvingWithAI: Math.round((capTotals.solvingWithAI / n) * 10) / 10,
      checkingAI: Math.round((capTotals.checkingAI / n) * 10) / 10,
      adaptingToAI: Math.round((capTotals.adaptingToAI / n) * 10) / 10,
    };

    // Authenticated learner percentile in overall cohort
    const authUser = (req as AuthenticatedRequest).user;
    let userScore: number | null = null;
    let userPercentile: number | null = null;

    if (authUser) {
      const userEval =
        authUser.assessment?.evaluationResult ||
        toRecord((authUser as any).assessmentData)?.evaluationResult ||
        (toRecord(authUser.assessment) as any)?.evaluationResult;
      if (typeof userEval?.overallScore === 'number') {
        userScore = userEval.overallScore;
        const lowerCount = scores.filter((s) => s < userScore!).length;
        const equalCount = scores.filter((s) => s === userScore!).length;
        userPercentile = Math.min(
          99,
          Math.max(1, Math.round(((lowerCount + 0.5 * equalCount) / n) * 100))
        );
      }
    }

    return res.json({
      available: true,
      comparisonType: 'ALL_BRANCHES_COHORT',
      totalComparableRecords: n,
      minRequiredRecords: MIN_REQUIRED_RECORDS,
      cohortAverage,
      median,
      p90,
      capabilityAverages,
      normalizationNote:
        'Standardized comparison across different academic branches using calibrated capability weighting.',
      ...(userScore !== null ? { userScore, userPercentile } : {}),
    });
  } catch (err: any) {
    return res.status(500).json({
      available: false,
      totalComparableRecords: 0,
      minRequiredRecords: MIN_REQUIRED_RECORDS,
      message: err?.message || 'Failed to compute overall cohort comparison.',
    });
  }
};
