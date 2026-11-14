import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma, isDatabaseConnected } from '../config/prisma';
import {
  getDefaultFocusAreas,
  getDefaultRadarSignals,
  getDefaultCapabilityGaps,
} from '../data/aiimsCatalog';
import { ClaudeService } from '../services/anthropic/claude.service';
import { CREDIT_RULES } from '../config/credits.config';
import { creditsLedgerService } from '../services/creditsLedger.service';
import {
  defaultFocus,
  defaultRadar,
  defaultInvestigation,
  toJsonInput,
  userRecordToIUser,
} from '../utils/userMapper';
import { isSafeKey, isValidId, toRecord } from '../utils/id';

const claudeService = new ClaudeService();

/**
 * GET /focus/areas
 */
export const getFocusAreas = (_req: Request, res: Response) => {
  return res.json(getDefaultFocusAreas());
};

/**
 * POST /focus/override
 * Enforces authentication, cross-user ownership guards, and persists to authenticated user's PostgreSQL record.
 */
export const overrideFocus = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }

  const { focusId, mentorOverride, userId: targetUserId } = req.body;

  // Cross-user modification prevention
  const currentUserId = String(req.user.id || req.user._id);
  if (targetUserId && String(targetUserId) !== currentUserId) {
    return res.status(403).json({
      error: 'Access forbidden: cannot modify another learner focus state',
      code: 'FORBIDDEN_CROSS_USER',
    });
  }

  if (!focusId || typeof focusId !== 'string' || !focusId.trim()) {
    return res.status(400).json({ error: 'Valid focusId is required', code: 'INVALID_FOCUS_ID' });
  }

  if (!isDatabaseConnected() || !isValidId(currentUserId)) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const cleanFocusId = focusId.trim();

  try {
    const userRow = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (!userRow) {
      return res.status(404).json({ error: 'User record not found', code: 'USER_NOT_FOUND' });
    }

    const existingFocus = toRecord(userRow.focusData);
    const updatedFocusData = {
      ...defaultFocus(),
      ...existingFocus,
      selectedTrack: cleanFocusId,
      ...(mentorOverride ? { mentorOverride } : {}),
    };

    const updatedRow = await prisma.user.update({
      where: { id: currentUserId },
      data: {
        focusData: toJsonInput(updatedFocusData),
      },
    });
    req.user = userRecordToIUser(updatedRow);
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: 'Failed to persist focus override', details: err.message });
  }

  const baseArea = getDefaultFocusAreas().find((f) => f.id === cleanFocusId) || {
    id: cleanFocusId,
    title: cleanFocusId,
    description: '',
    category: 'General',
  };

  return res.json({
    success: true,
    focus: {
      ...baseArea,
      mentorOverride: mentorOverride || '',
    },
  });
};

/**
 * GET /radar/signals
 */
export const getRadarSignals = (_req: Request, res: Response) => {
  return res.json(getDefaultRadarSignals());
};

/**
 * POST /radar/follow
 * Enforces authentication, cross-user ownership guards, and persists followed signals to PostgreSQL.
 */
export const toggleFollowSignal = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }

  const { signalId, userId: targetUserId } = req.body;

  // Cross-user modification prevention
  const currentUserId = String(req.user.id || req.user._id);
  if (targetUserId && String(targetUserId) !== currentUserId) {
    return res.status(403).json({
      error: 'Access forbidden: cannot modify another learner radar signals',
      code: 'FORBIDDEN_CROSS_USER',
    });
  }

  if (!signalId || typeof signalId !== 'string' || !signalId.trim()) {
    return res.status(400).json({ error: 'Valid signalId is required', code: 'INVALID_SIGNAL_ID' });
  }

  if (!isDatabaseConnected() || !isValidId(currentUserId)) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const cleanSignalId = signalId.trim();
  let isFollowed = false;

  try {
    const userRow = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (!userRow) {
      return res.status(404).json({ error: 'User record not found', code: 'USER_NOT_FOUND' });
    }

    const existingRadar = {
      ...defaultRadar(),
      ...toRecord(userRow.radarData),
    };
    const currentFollowed: string[] = Array.isArray(existingRadar.followedSignalIds)
      ? existingRadar.followedSignalIds
      : [];

    isFollowed = currentFollowed.includes(cleanSignalId);
    const nextFollowed = isFollowed
      ? currentFollowed.filter((id) => id !== cleanSignalId)
      : [...currentFollowed, cleanSignalId];

    const updatedRow = await prisma.user.update({
      where: { id: currentUserId },
      data: {
        radarData: toJsonInput({
          ...existingRadar,
          followedSignalIds: nextFollowed,
        }),
      },
    });
    req.user = userRecordToIUser(updatedRow);
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: 'Failed to update followed signals', details: err.message });
  }

  const baseSignal = getDefaultRadarSignals().find((s) => s.id === cleanSignalId) || {
    id: cleanSignalId,
    title: cleanSignalId,
  };

  return res.json({
    success: true,
    signalId: cleanSignalId,
    isFollowed: !isFollowed,
    signal: {
      ...baseSignal,
      isFollowed: !isFollowed,
    },
  });
};

/**
 * POST /investigations/submit
 */
export const submitInvestigation = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }

  const { signalId, personalInterpretation } = req.body;
  if (
    !signalId ||
    typeof signalId !== 'string' ||
    !signalId.trim() ||
    !isSafeKey(signalId.trim())
  ) {
    return res.status(400).json({ error: 'Valid signalId is required' });
  }

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const cleanSignalId = signalId.trim();
  const userId = String(req.user.id || req.user._id);
  if (!isValidId(userId)) {
    return res.status(400).json({ error: 'Invalid user identifier', code: 'INVALID_USER_ID' });
  }

  const reward = CREDIT_RULES.SIGNAL_INVESTIGATION.credits;
  const xpReward = CREDIT_RULES.SIGNAL_INVESTIGATION.xp;

  const userRow = await prisma.user.findUnique({ where: { id: userId } });
  if (!userRow) {
    return res.status(404).json({ error: 'User record not found', code: 'USER_NOT_FOUND' });
  }

  const currentRadar = {
    ...defaultRadar(),
    ...toRecord(userRow.radarData),
  };
  const investigatedIds: string[] = Array.isArray(currentRadar.investigatedSignalIds)
    ? [...currentRadar.investigatedSignalIds]
    : [];

  const alreadyInvestigated = investigatedIds.includes(cleanSignalId);
  let awardedNow = false;

  if (!alreadyInvestigated) {
    const ledgerResult = await creditsLedgerService.executeTransaction({
      userId,
      type: 'EARN',
      category: 'REWARD',
      amount: reward,
      reason: `Investigated Signal: ${cleanSignalId} (+${reward} AC)`,
      source: 'RADAR',
      sourceId: cleanSignalId,
      idempotencyKey: `investigation::${userId}::${cleanSignalId}`,
    });

    if (ledgerResult.code === 'DATABASE_UNAVAILABLE') {
      return res.status(503).json({
        error: 'Database service unavailable. PostgreSQL connection is required.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    if (ledgerResult.success && !ledgerResult.duplicate) {
      awardedNow = true;
    }
  }

  // Re-fetch latest row so we never overwrite transactionsData / aiimsCredits touched by ledger transaction
  const latestRow = (await prisma.user.findUnique({ where: { id: userId } })) || userRow;
  const latestRadar = {
    ...defaultRadar(),
    ...toRecord(latestRow.radarData),
  };
  const latestInvestigated: string[] = Array.isArray(latestRadar.investigatedSignalIds)
    ? [...latestRadar.investigatedSignalIds]
    : [];
  if (!latestInvestigated.includes(cleanSignalId)) {
    latestInvestigated.push(cleanSignalId);
  }

  const latestInv = {
    ...defaultInvestigation(),
    ...toRecord(latestRow.investigationData),
  };
  const nextUserNotes = {
    ...toRecord(latestInv.userNotes),
    [cleanSignalId]: personalInterpretation || '',
  };

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      radarData: toJsonInput({
        ...latestRadar,
        investigatedSignalIds: latestInvestigated,
      }),
      investigationData: toJsonInput({
        ...latestInv,
        userNotes: nextUserNotes,
        selectedSignalId: cleanSignalId,
        status: 'completed',
      }),
      ...(awardedNow ? { xpPoints: { increment: xpReward } } : {}),
    },
  });

  req.user = userRecordToIUser(updatedUser);

  if (awardedNow) {
    return res.json({
      message: `Investigation recorded. ${reward} AIIMS Credits earned!`,
      personalInterpretation,
      creditsEarned: reward,
      awarded: true,
      newBalance: updatedUser.aiimsCredits,
    });
  }

  return res.json({
    message: 'Investigation notes updated (credits already claimed).',
    personalInterpretation,
    creditsEarned: 0,
    awarded: false,
    newBalance: updatedUser.aiimsCredits,
  });
};

/**
 * POST /relevance/generate
 */
export const generateRelevance = async (req: AuthenticatedRequest, res: Response) => {
  const { signalId } = req.body;
  const signals = getDefaultRadarSignals();
  const signal = signals.find((s) => s.id === signalId) || signals[0];
  const gapSummary = getDefaultCapabilityGaps()
    .map((g) => g.capabilityArea)
    .join(', ');

  const studentRole = req.user?.role || 'learner';
  const studentGoal = req.user?.targetGoal || 'Master AI Intelligence & Mentoring';

  const report = await claudeService.generateRelevanceReport(
    studentRole,
    studentGoal,
    gapSummary,
    signal.title,
    signal.summary
  );

  return res.json(report);
};

/**
 * POST /ai/mentor
 */
export const getMentorAdvice = async (req: AuthenticatedRequest, res: Response) => {
  const { role, stage, growthArea, activeFocus, hasInvestigation } = req.body;

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

  return res.json({
    message,
    observationType: 'observation',
    relatedStage: stage || req.user?.stage || 'Knowing',
    relatedTopic: activeFocus || growthArea,
    suggestedAction: {
      text: activeFocus ? 'Explore AI Radar' : 'Start Assessment',
      targetTab: activeFocus ? 'radar' : 'assessment',
    },
    provider: 'ai_service',
  });
};
