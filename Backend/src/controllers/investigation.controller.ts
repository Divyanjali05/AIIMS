import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { User } from '../models/User.model';
import {
  mockUser,
  mockFocusAreas,
  mockRadarSignals,
  mockCapabilityGaps,
  mockTransactions
} from '../models/aiims.models';
import { ClaudeService } from '../services/anthropic/claude.service';
import { CREDIT_RULES } from '../config/credits.config';
import { creditsLedgerService } from '../services/creditsLedger.service';
import { registeredUsers } from '../models/userStore';

const claudeService = new ClaudeService();

/**
 * GET /focus/areas
 */
export const getFocusAreas = (req: Request, res: Response) => {
  res.json(mockFocusAreas);
};

/**
 * POST /focus/override
 */
export const overrideFocus = (req: Request, res: Response) => {
  const { focusId, mentorOverride } = req.body;
  const focus = mockFocusAreas.find(f => f.id === focusId);
  if (focus) {
    focus.mentorOverride = mentorOverride;
  }
  res.json(focus);
};

/**
 * GET /radar/signals
 */
export const getRadarSignals = (req: Request, res: Response) => {
  res.json(mockRadarSignals);
};

/**
 * POST /radar/follow
 */
export const toggleFollowSignal = (req: Request, res: Response) => {
  const { signalId } = req.body;
  const signal = mockRadarSignals.find(s => s.id === signalId);
  if (signal) {
    signal.isFollowed = !signal.isFollowed;
  }
  res.json(signal);
};

/**
 * POST /investigations/submit
 */
export const submitInvestigation = async (req: AuthenticatedRequest, res: Response) => {
  const { signalId, personalInterpretation } = req.body;
  if (!signalId || typeof signalId !== 'string') {
    return res.status(400).json({ error: 'Valid signalId is required' });
  }
  const reward = CREDIT_RULES.SIGNAL_INVESTIGATION.credits;
  const xpReward = CREDIT_RULES.SIGNAL_INVESTIGATION.xp;

  if (req.user) {
    if (mongoose.connection.readyState === 1 && req.user._id) {
      const tx = {
        id: `tx-inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        transactionType: 'SIGNAL_INVESTIGATION',
        type: 'EARN' as const,
        source: 'RADAR',
        sourceId: signalId,
        amount: reward,
        description: `Investigated Signal: ${signalId} (+${reward} AC)`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        previousBalance: req.user.aiimsCredits || 0,
        newBalance: (req.user.aiimsCredits || 0) + reward
      };

      const updatedUser = await User.findOneAndUpdate(
        {
          _id: req.user._id,
          'radar.investigatedSignalIds': { $ne: signalId }
        },
        {
          $inc: { xpPoints: xpReward },
          $push: {
            'radar.investigatedSignalIds': signalId
          },
          $set: {
            [`investigation.userNotes.${signalId}`]: personalInterpretation || '',
            'investigation.selectedSignalId': signalId,
            'investigation.status': 'completed'
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
          amount: reward,
          reason: `Investigated Signal: ${signalId} (+${reward} AC)`,
          source: 'RADAR',
          sourceId: signalId,
          idempotencyKey: `investigation::${userId}::${signalId}`
        });

        const latestUser = await User.findById(req.user._id);
        if (latestUser) req.user = latestUser;

        return res.json({
          message: `Investigation recorded. ${reward} AIIMS Credits earned!`,
          personalInterpretation,
          creditsEarned: reward,
          awarded: true,
          newBalance: txResult.balance ?? req.user.aiimsCredits
        });
      } else {
        await User.updateOne(
          { _id: req.user._id },
          {
            $set: {
              [`investigation.userNotes.${signalId}`]: personalInterpretation || '',
              'investigation.selectedSignalId': signalId,
              'investigation.status': 'completed'
            }
          }
        );
        const latestUser = await User.findById(req.user._id);
        const currentBal = latestUser?.aiimsCredits ?? req.user.aiimsCredits;
        return res.json({
          message: 'Investigation notes updated (credits already claimed).',
          personalInterpretation,
          creditsEarned: 0,
          awarded: false,
          newBalance: currentBal
        });
      }
    }

    const alreadyInvestigated = req.user.radar?.investigatedSignalIds?.includes(signalId);
    let creditsEarned = 0;

    if (!alreadyInvestigated) {
      const userId = String(req.user._id || req.user.id);
      const actionKey = `investigation::${userId}::${signalId}`;

      const ledgerResult = await creditsLedgerService.executeTransaction({
        userId,
        type: 'EARN',
        category: 'REWARD',
        amount: reward,
        reason: `Investigated Signal: ${signalId} (+${reward} AC)`,
        source: 'RADAR',
        sourceId: signalId,
        idempotencyKey: actionKey
      }).catch((e) => {
        console.warn('[Investigation] Ledger offline write notice:', e.message);
        return null;
      });

      if (ledgerResult && ledgerResult.duplicate) {
        creditsEarned = 0;
      } else {
        const previousBalance = req.user.aiimsCredits || 0;
        req.user.aiimsCredits = ledgerResult?.newBalance ?? (previousBalance + reward);
        req.user.xpPoints = (req.user.xpPoints || 0) + xpReward;
        creditsEarned = reward;

        if (!req.user.radar.investigatedSignalIds) {
          req.user.radar.investigatedSignalIds = [];
        }
        req.user.radar.investigatedSignalIds.push(signalId);

        const tx = {
          id: ledgerResult?.transaction?.id || `tx-inv-${Date.now()}`,
          transactionType: 'SIGNAL_INVESTIGATION',
          type: 'EARN' as const,
          source: 'RADAR',
          sourceId: signalId,
          amount: reward,
          description: `Investigated Signal: ${signalId} (+${reward} AC)`,
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
          if (!reg.radar) reg.radar = { status: 'unlocked', investigatedSignalIds: [] };
          if (!reg.radar.investigatedSignalIds) reg.radar.investigatedSignalIds = [];
          if (!reg.radar.investigatedSignalIds.includes(signalId)) {
            reg.radar.investigatedSignalIds.push(signalId);
          }
        }
      }
    }

    if (!req.user.investigation) {
      req.user.investigation = { status: 'completed', selectedSignalId: signalId, userNotes: {} };
    }
    if (!req.user.investigation.userNotes) {
      req.user.investigation.userNotes = {};
    }
    req.user.investigation.userNotes[signalId] = personalInterpretation;

    return res.json({
      message: alreadyInvestigated ? 'Investigation notes updated (credits already claimed).' : `Investigation recorded. ${reward} AIIMS Credits earned!`,
      personalInterpretation,
      creditsEarned,
      awarded: !alreadyInvestigated,
      newBalance: req.user.aiimsCredits
    });
  }

  const alreadyInvestigatedMock = mockRadarSignals.some(s => s.id === signalId && s.isFollowed);
  if (!alreadyInvestigatedMock) {
    mockUser.aiimsCredits += reward;
    mockUser.xpPoints += xpReward;
    const tx = {
      id: `tx-${Date.now()}`,
      type: 'EARN' as const,
      sourceId: signalId,
      amount: reward,
      description: `Investigated Signal ${signalId} (+${reward} AC)`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    mockTransactions.unshift(tx as any);
  }

  res.json({
    message: alreadyInvestigatedMock ? 'Investigation notes updated (credits already claimed).' : `Investigation recorded. ${reward} AIIMS Credits earned!`,
    personalInterpretation,
    creditsEarned: alreadyInvestigatedMock ? 0 : reward,
    awarded: !alreadyInvestigatedMock,
    newBalance: mockUser.aiimsCredits
  });
};

/**
 * POST /relevance/generate
 */
export const generateRelevance = async (req: AuthenticatedRequest, res: Response) => {
  const { signalId } = req.body;
  const signal = mockRadarSignals.find(s => s.id === signalId) || mockRadarSignals[0];
  const gapSummary = mockCapabilityGaps.map(g => g.capabilityArea).join(', ');

  const studentRole = req.user?.role || mockUser.role;
  const studentGoal = req.user?.targetGoal || mockUser.targetGoal;

  const report = await claudeService.generateRelevanceReport(
    studentRole,
    studentGoal,
    gapSummary,
    signal.title,
    signal.summary
  );

  res.json(report);
};

/**
 * POST /ai/mentor
 */
export const getMentorAdvice = async (req: AuthenticatedRequest, res: Response) => {
  const { role, stage, topCapability, growthArea, activeFocus, clarityTopic, hasReflection, hasInvestigation } = req.body;

  const studentRole = role || req.user?.role || 'Student / AI Learner';
  const studentCollege = req.user?.college || 'your college';

  let message = `Hello! As an AI learner at ${studentCollege}, I noticed you are focused on ${activeFocus || growthArea || 'mastering AI capability'}. Continuing your active track will strengthen your practical engineering instincts.`;
  
  if (!stage || stage === 'Knowing') {
    message = `Welcome to AIIMS! Your AI journey at ${studentCollege} starts with establishing your baseline capability profile. Completing the diagnostic provides a verifiable radar of your strengths and growth areas.`;
  } else if (hasInvestigation) {
    message = `Great work on your technical signal investigation! Analyzing how emerging breakthroughs impact your role as ${studentRole} builds verifiable engineering judgment.`;
  } else if (activeFocus) {
    message = `Your active focus track is set to '${activeFocus}'. Explore real-time technical shifts in AI Radar to test your knowledge against modern production architectures.`;
  }

  res.json({
    message,
    observationType: 'observation',
    relatedStage: stage || req.user?.stage || 'Knowing',
    relatedTopic: activeFocus || growthArea,
    suggestedAction: {
      text: activeFocus ? 'Explore AI Radar' : 'Start Assessment',
      targetTab: activeFocus ? 'radar' : 'assessment'
    },
    provider: 'ai_service'
  });
};
