import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { User } from '../models/User.model';
import { mockUser, mockDimensionScores, mockLearnerFullState, mockTransactions } from '../models/aiims.models';
import { ClaudeService } from '../services/anthropic/claude.service';
import { evaluateAssessment } from '../services/assessmentScoring';
import { CREDIT_RULES, formatUserState } from '../config/credits.config';
import { creditsLedgerService } from '../services/creditsLedger.service';
import { registeredUsers } from '../models/userStore';

const claudeService = new ClaudeService();

/**
 * GET /assessments/questions
 */
export const getQuestions = (req: Request, res: Response) => {
  res.json([
    {
      id: 'q1',
      dimension: 'Prompt Engineering',
      type: 'mcq',
      prompt: 'Which prompting technique best mitigates hallucination in complex multi-step reasoning?',
      options: ['Few-Shot Prompting', 'Chain-of-Thought (CoT)', 'Zero-Shot Direct', 'System Prompt Overriding'],
      correctOptionIndex: 1
    },
    {
      id: 'q2',
      dimension: 'Agentic Workflows',
      type: 'open_ended',
      prompt: 'Describe how you would design state persistence and fallback handling for an autonomous research agent when an external tool API fails.',
      rubric: 'Evaluates understanding of agentic retry loops, exponential backoff, state checkpointing, and graceful degraded response.'
    }
  ]);
};

/**
 * POST /assessments/submit
 */
export const submitAssessment = async (req: AuthenticatedRequest, res: Response) => {
  const { answers } = req.body;
  const userAnswers = answers || {};

  // Evaluate open-ended questions (Q11, Q12, Q25) via Anthropic Claude
  const openEndedEvaluations: Record<number, any> = {};

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

  // Calculate scores using AIIMS Assessment Scoring Engine
  const evaluationResult = evaluateAssessment(userAnswers, openEndedEvaluations);

  const creditReward = CREDIT_RULES.ASSESSMENT_COMPLETION.credits;
  const xpReward = CREDIT_RULES.ASSESSMENT_COMPLETION.xp;

  if (req.user) {
    if (mongoose.connection.readyState === 1 && req.user._id) {
      const tx = {
        id: `tx-assess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        transactionType: 'LEVEL_COMPLETION',
        type: 'EARN' as const,
        source: 'ASSESSMENT',
        sourceId: 'DIAGNOSTIC_ASSESSMENT',
        amount: creditReward,
        description: 'Completed Discover Your AI Capability Diagnostic (+50 AC)',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        previousBalance: req.user.aiimsCredits || 0,
        newBalance: (req.user.aiimsCredits || 0) + creditReward
      };

      // Atomic reward claim: only matches if assessment.rewardClaimed is NOT true
      const updatedUser = await User.findOneAndUpdate(
        {
          _id: req.user._id,
          'assessment.rewardClaimed': { $ne: true }
        },
        {
          $inc: { xpPoints: xpReward },
          $set: {
            stage: 'Understanding',
            'assessment.status': 'completed',
            'assessment.answers': userAnswers,
            'assessment.currentQuestionIndex': 25,
            'assessment.completedAt': req.user.assessment?.completedAt || new Date().toISOString(),
            'assessment.rewardClaimed': true,
            'assessment.scores': evaluationResult.legacyScores,
            'assessment.evaluationResult': evaluationResult,
            'analysis.status': 'unlocked',
            'analysis.topCapability': evaluationResult.strongestSkill.name,
            'analysis.growthArea': evaluationResult.roomToGrow.name,
            'analysis.unlockedAt': req.user.analysis?.unlockedAt || new Date().toISOString()
          }
        },
        { returnDocument: 'after' }
      );

      if (updatedUser) {
        req.user = updatedUser;
        const userId = String(req.user._id || req.user.id);
        const txResult = await creditsLedgerService.executeTransaction({
          userId,
          type: 'EARN',
          category: 'REWARD',
          amount: creditReward,
          reason: `Completed Baseline Diagnostic Assessment (+${creditReward} AC)`,
          source: 'ASSESSMENT',
          sourceId: 'DIAGNOSTIC_ASSESSMENT',
          idempotencyKey: `assessment::${userId}::completed`
        });

        const latestUser = await User.findById(req.user._id);
        if (latestUser) req.user = latestUser;

        return res.json({
          message: 'Assessment completed and saved to MongoDB Atlas!',
          earnedCredits: creditReward,
          evaluationResult,
          scores: evaluationResult.legacyScores,
          topCapability: evaluationResult.strongestSkill.name,
          growthArea: evaluationResult.roomToGrow.name,
          updatedBalance: txResult.balance ?? req.user.aiimsCredits,
          updatedScores: req.user.assessment.scores
        });
      } else {
        // Already claimed: update answers & scores atomically without re-awarding credits
        await User.updateOne(
          { _id: req.user._id },
          {
            $set: {
              stage: 'Understanding',
              'assessment.status': 'completed',
              'assessment.answers': userAnswers,
              'assessment.scores': evaluationResult.legacyScores,
              'assessment.evaluationResult': evaluationResult,
              'analysis.status': 'unlocked',
              'analysis.topCapability': evaluationResult.strongestSkill.name,
              'analysis.growthArea': evaluationResult.roomToGrow.name
            }
          }
        );
        const latestUser = await User.findById(req.user._id);
        const currentBal = latestUser?.aiimsCredits ?? req.user.aiimsCredits;
        return res.json({
          message: 'Assessment updated (reward already claimed)',
          earnedCredits: 0,
          evaluationResult,
          scores: evaluationResult.legacyScores,
          topCapability: evaluationResult.strongestSkill.name,
          growthArea: evaluationResult.roomToGrow.name,
          updatedBalance: currentBal,
          updatedScores: evaluationResult.legacyScores
        });
      }
    }

    const alreadyClaimed = req.user.assessment?.rewardClaimed || req.user.assessment?.status === 'completed';
    const previousBalance = req.user.aiimsCredits || 0;
    let earnedCredits = 0;

    if (!alreadyClaimed) {
      const userId = String(req.user._id || req.user.id);
      const actionKey = `assessment::${userId}::diagnostic`;

      const ledgerResult = await creditsLedgerService.executeTransaction({
        userId,
        type: 'EARN',
        category: 'REWARD',
        amount: creditReward,
        reason: 'Completed Discover Your AI Capability Diagnostic (+50 AC)',
        source: 'ASSESSMENT',
        sourceId: 'DIAGNOSTIC_ASSESSMENT',
        idempotencyKey: actionKey
      }).catch((e) => {
        console.warn('[Assessment] Ledger offline write notice:', e.message);
        return null;
      });

      if (ledgerResult && ledgerResult.duplicate) {
        earnedCredits = 0;
      } else {
        req.user.aiimsCredits = ledgerResult?.newBalance ?? (previousBalance + creditReward);
        req.user.xpPoints = (req.user.xpPoints || 0) + xpReward;
        earnedCredits = creditReward;

        const tx = {
          id: ledgerResult?.transaction?.id || `tx-assess-${Date.now()}`,
          transactionType: 'LEVEL_COMPLETION',
          type: 'EARN' as const,
          source: 'ASSESSMENT',
          sourceId: 'DIAGNOSTIC_ASSESSMENT',
          amount: creditReward,
          description: 'Completed Discover Your AI Capability Diagnostic (+50 AC)',
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          previousBalance,
          newBalance: req.user.aiimsCredits
        };

        req.user.transactions = req.user.transactions || [];
        req.user.transactions.unshift(tx);

        if (registeredUsers && req.user.email && registeredUsers[req.user.email.toLowerCase()]) {
          const reg = registeredUsers[req.user.email.toLowerCase()];
          reg.aiimsCredits = req.user.aiimsCredits;
          reg.xpPoints = req.user.xpPoints;
        }
      }
    }

    req.user.stage = 'Understanding';
    req.user.assessment = {
      status: 'completed',
      answers: userAnswers,
      currentQuestionIndex: 25,
      completedAt: req.user.assessment?.completedAt || new Date().toISOString(),
      rewardClaimed: true,
      scores: evaluationResult.legacyScores,
      evaluationResult
    };

    req.user.analysis = {
      status: 'unlocked',
      topCapability: evaluationResult.strongestSkill.name,
      growthArea: evaluationResult.roomToGrow.name,
      unlockedAt: req.user.analysis?.unlockedAt || new Date().toISOString()
    };

    if (registeredUsers && req.user.email && registeredUsers[req.user.email.toLowerCase()]) {
      const reg = registeredUsers[req.user.email.toLowerCase()];
      reg.stage = 'Understanding';
      reg.assessment = req.user.assessment;
      reg.analysis = req.user.analysis;
    }

    return res.json({
      message: alreadyClaimed ? 'Assessment updated (reward already claimed)' : 'Assessment completed and saved to MongoDB Atlas!',
      earnedCredits,
      evaluationResult,
      scores: evaluationResult.legacyScores,
      topCapability: evaluationResult.strongestSkill.name,
      growthArea: evaluationResult.roomToGrow.name,
      updatedBalance: req.user.aiimsCredits,
      updatedScores: req.user.assessment.scores
    });
  }

  // In-memory fallback
  mockUser.aiimsCredits += creditReward;
  mockUser.xpPoints += xpReward;
  mockLearnerFullState.assessment.status = 'completed';
  mockLearnerFullState.assessment.completedAt = new Date().toISOString();
  mockLearnerFullState.analysis.status = 'unlocked';
  mockLearnerFullState.clarity.status = 'unlocked';
  mockLearnerFullState.focus.status = 'unlocked';

  mockTransactions.unshift({
    id: `tx-${Date.now()}`,
    type: 'EARN',
    amount: creditReward,
    description: 'Completed Discover Your AI Profile Diagnostic (+50 AC)',
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
  });

  res.json({
    message: 'Assessment recorded',
    earnedCredits: creditReward,
    evaluationResult,
    updatedBalance: mockUser.aiimsCredits,
    updatedScores: mockDimensionScores
  });
};

/**
 * GET /analysis/peer-benchmarks
 */
export const getPeerBenchmarks = async (req: AuthenticatedRequest, res: Response) => {
  const MIN_REQUIRED_RECORDS = 30;

  if (mongoose.connection.readyState !== 1) {
    return res.json({
      available: false,
      totalComparableRecords: 0,
      minRequiredRecords: MIN_REQUIRED_RECORDS,
      message: 'Peer benchmarks are not available yet. They will appear when enough comparable assessments have been completed.'
    });
  }

  try {
    const completedUsers = await User.find({
      'assessment.status': 'completed',
      'assessment.evaluationResult.scoringVersion': '3.0.0-evidence-based'
    }).select('assessment.evaluationResult');

    if (completedUsers.length < MIN_REQUIRED_RECORDS) {
      return res.json({
        available: false,
        totalComparableRecords: completedUsers.length,
        minRequiredRecords: MIN_REQUIRED_RECORDS,
        message: 'Peer benchmarks are not available yet. They will appear when enough comparable assessments have been completed.'
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
      const evalRes = u.assessment?.evaluationResult;
      if (evalRes && evalRes.capabilities) {
        const uScore = evalRes.capabilities.usingAI?.score || 0;
        const undScore = evalRes.capabilities.understandingAI?.score || 0;
        const solScore = evalRes.capabilities.solvingWithAI?.score || 0;
        const chkScore = evalRes.capabilities.checkingAI?.score || 0;
        const adpScore = evalRes.capabilities.adaptingToAI?.score || 0;
        const ovScore = evalRes.overallScore || Math.round((uScore + undScore + solScore + chkScore + adpScore) / 5);

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
      adaptingToAI: Math.round(sumAdaptingToAI / count)
    };
    const peerOverallAverage = Math.round(sumOverall / count);

    let userPercentile = 50;
    if (req.user?.assessment?.evaluationResult?.overallScore !== undefined) {
      const userOverall = req.user.assessment.evaluationResult.overallScore;
      const lowerCount = allOverallScores.filter((s) => s < userOverall).length;
      const equalCount = allOverallScores.filter((s) => s === userOverall).length;
      userPercentile = Math.min(99, Math.max(1, Math.round(((lowerCount + 0.5 * equalCount) / count) * 100)));
    }

    return res.json({
      available: true,
      totalComparableRecords: count,
      minRequiredRecords: MIN_REQUIRED_RECORDS,
      benchmarks,
      peerOverallAverage,
      userPercentile
    });
  } catch (err) {
    console.error('Failed to compute peer benchmarks:', err);
    return res.json({
      available: false,
      totalComparableRecords: 0,
      minRequiredRecords: MIN_REQUIRED_RECORDS,
      message: 'Peer benchmarks are not available yet. They will appear when enough comparable assessments have been completed.'
    });
  }
};

/**
 * GET /analysis/individual
 */
export const getIndividualAnalysis = (req: AuthenticatedRequest, res: Response) => {
  const profile = req.user ? formatUserState(req.user).profile : mockUser;
  const scores = req.user?.assessment?.scores ? [
    { dimension: 'Generative AI Tech', score: req.user.assessment.scores.usageFrequency ?? 0, benchmark: 75 },
    { dimension: 'Prompt Engineering', score: req.user.assessment.scores.evaluationCapability ?? 0, benchmark: 80 },
    { dimension: 'Agentic Workflows', score: req.user.assessment.scores.workflowDesign ?? 0, benchmark: 78 },
    { dimension: 'AI Ethics & Alignment', score: req.user.assessment.scores.strategicVision ?? 0, benchmark: 72 },
    { dimension: 'Tool Integration', score: req.user.assessment.scores.mentorshipReadiness ?? 0, benchmark: 74 }
  ] : mockDimensionScores;

  res.json({
    learner: profile,
    scores,
    strengths: ['Prompt Engineering (88%)', 'Generative AI Tech (82%)'],
    gaps: ['Agentic Workflows (62%)', 'ML Fundamentals (65%)']
  });
};

/**
 * GET /analysis/comparative
 */
export const getComparativeAnalysis = (req: Request, res: Response) => {
  res.json({
    scores: mockDimensionScores,
    cohortPercentile: 78,
    peerAverage: 72.5
  });
};

/**
 * GET /analysis/overall
 */
export const getOverallAnalysis = (req: Request, res: Response) => {
  res.json({
    totalStudents: 1240,
    cohortAverage: 71.4,
    topDimension: 'Prompt Engineering',
    biggestKnowledgeGap: 'Agentic Workflows'
  });
};
