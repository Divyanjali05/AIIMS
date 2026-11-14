import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma, isDatabaseConnected } from '../config/prisma';
import { formatUserState } from '../config/credits.config';
import {
  STREAMS,
  TECH_SUB_CATEGORIES,
  NON_TECH_SUB_CATEGORIES,
  EDUCATION_LEVELS,
  PROGRAMS,
  SPECIALIZATIONS,
  AI_FAMILIARITY_OPTIONS,
  AI_USAGE_CONTEXTS,
  PRIMARY_GOAL_OPTIONS,
} from '../config/academicTaxonomy';
import { defaultClarity, defaultFocus, toJsonInput, userRecordToIUser } from '../utils/userMapper';
import { isValidId, toRecord, withLegacyId } from '../utils/id';

/**
 * GET /learner/state - Authoritative learner state retrieval
 */
export const getLearnerState = async (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    state: formatUserState(req.user!),
  });
};

/**
 * PUT /learner/state
 */
export const updateLearnerState = async (req: AuthenticatedRequest, res: Response) => {
  const { state } = req.body;
  if (!state || typeof state !== 'object') {
    return res
      .status(400)
      .json({ error: 'State payload is required', code: 'INVALID_STATE_PAYLOAD' });
  }

  // 1. Privilege Escalation Guard (Role Modification)
  const incomingRole = req.body.role || req.body.profile?.role || state.role || state.profile?.role;

  if (incomingRole !== undefined) {
    return res.status(403).json({
      error: 'Privilege escalation prohibited: modifying user role is not permitted.',
      code: 'ROLE_ESCALATION_FORBIDDEN',
    });
  }

  // 2. Account Status Guard
  const incomingStatus =
    req.body.isActive !== undefined ||
    req.body.status !== undefined ||
    state.isActive !== undefined ||
    state.status !== undefined ||
    state.profile?.isActive !== undefined ||
    state.profile?.status !== undefined ||
    state.profile?.accountStatus !== undefined;

  if (incomingStatus) {
    return res.status(403).json({
      error: 'Modifying account status or administrative permissions is not permitted.',
      code: 'ACCOUNT_STATUS_FORBIDDEN',
    });
  }

  // 3. Financial & Experience Balance Tampering Guard
  const incomingCredits =
    req.body.credits !== undefined ||
    req.body.aiimsCredits !== undefined ||
    req.body.xpPoints !== undefined ||
    state.credits !== undefined ||
    state.aiimsCredits !== undefined ||
    state.xpPoints !== undefined ||
    state.profile?.aiimsCredits !== undefined ||
    state.profile?.xpPoints !== undefined ||
    state.profile?.credits !== undefined;

  if (incomingCredits) {
    return res.status(400).json({
      error:
        'Direct credit balance or XP modification is prohibited. Credits are managed authoritatively by the ledger.',
      code: 'CREDIT_TAMPERING_PROHIBITED',
    });
  }

  // 4. Assessment Completion Fabrication Guard
  if (
    state.assessment &&
    (state.assessment.status === 'completed' ||
      state.assessment.scores !== undefined ||
      state.assessment.evaluationResult !== undefined ||
      state.assessment.rewardClaimed !== undefined ||
      state.assessment.completedAt !== undefined)
  ) {
    return res.status(400).json({
      error:
        'Fabricating assessment completion or scores is prohibited. Submit diagnostic via POST /api/assessments/submit.',
      code: 'ASSESSMENT_TAMPERING_PROHIBITED',
    });
  }

  // 5. Analysis Completion Fabrication Guard
  if (
    state.analysis &&
    (state.analysis.status === 'unlocked' ||
      state.analysis.status === 'completed' ||
      state.analysis.topCapability !== undefined ||
      state.analysis.growthArea !== undefined ||
      state.analysis.unlockedAt !== undefined)
  ) {
    return res.status(400).json({
      error:
        'Fabricating analysis completion is prohibited. Analysis unlocks automatically upon completing the diagnostic assessment.',
      code: 'ANALYSIS_TAMPERING_PROHIBITED',
    });
  }

  // 6. Clarity Score Fabrication Guard
  if (
    state.taskScores !== undefined ||
    (state.clarity &&
      (state.clarity.taskScores !== undefined || state.clarity.trialRunsUsed !== undefined))
  ) {
    return res.status(400).json({
      error:
        'Fabricating clarity task scores is prohibited. Submit tasks through POST /api/clarity/save-task-score.',
      code: 'CLARITY_SCORE_TAMPERING_PROHIBITED',
    });
  }

  // 7. Focus Results Fabrication Guard
  if (
    state.focus &&
    (state.focus.sessionHistory !== undefined ||
      state.focus.history !== undefined ||
      state.focus.activeSession !== undefined ||
      state.focus.selectedTrack !== undefined)
  ) {
    return res.status(400).json({
      error:
        'Fabricating focus session history is prohibited. Record sessions through dedicated focus endpoints.',
      code: 'FOCUS_TAMPERING_PROHIBITED',
    });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  try {
    const userId = String(req.user.id || req.user._id);
    if (!isValidId(userId)) {
      return res.status(400).json({ error: 'Invalid user identifier' });
    }

    const existingRow = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingRow) {
      return res.status(404).json({ error: 'User record not found', code: 'USER_NOT_FOUND' });
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (state.profile) {
      if (state.profile.name) updateData.name = state.profile.name;
      if (state.profile.college) updateData.college = state.profile.college;
      if (state.profile.targetGoal) updateData.targetGoal = state.profile.targetGoal;
      if (state.profile.stage) updateData.stage = state.profile.stage;
    }

    if (state.clarity && typeof state.clarity === 'object') {
      const existingClarity = {
        ...defaultClarity(),
        ...toRecord(existingRow.clarityData),
      };
      // Preserve server-managed fields (`taskScores`, `trialRunsUsed`, `gapOverrides`)
      updateData.clarityData = toJsonInput({
        ...existingClarity,
        ...state.clarity,
        taskScores: existingClarity.taskScores,
        trialRunsUsed: existingClarity.trialRunsUsed,
      });
    }

    if (state.focus && typeof state.focus === 'object') {
      const existingFocus = {
        ...defaultFocus(),
        ...toRecord(existingRow.focusData),
      };
      updateData.focusData = toJsonInput({
        ...existingFocus,
        ...state.focus,
        selectedTrack: existingFocus.selectedTrack,
        history: existingFocus.history,
        sessionHistory: existingFocus.sessionHistory,
        activeSession: existingFocus.activeSession,
      });
    }

    if (state.radar && typeof state.radar === 'object') {
      updateData.radarData = toJsonInput(state.radar);
    }
    if (state.investigation && typeof state.investigation === 'object') {
      updateData.investigationData = toJsonInput(state.investigation);
    }
    if (Array.isArray(state.notifications)) {
      updateData.notificationsData = toJsonInput(state.notifications);
    }
    if (state.aiWallet && typeof state.aiWallet === 'object') {
      updateData.aiWalletData = toJsonInput(state.aiWallet);
    }
    if (state.solver && typeof state.solver === 'object') {
      updateData.solverData = toJsonInput(state.solver);
    }
    if (state.build && typeof state.build === 'object') {
      updateData.buildData = toJsonInput(state.build);
    }

    const updatedRow = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
    const mapped = userRecordToIUser(updatedRow);
    req.user = mapped;

    return res.json({ success: true, state: formatUserState(mapped) });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: 'Failed to sync learner state to DB', details: err.message });
  }
};

/**
 * GET /academic/taxonomy
 */
export const getAcademicTaxonomy = (_req: Request, res: Response) => {
  return res.json({
    streams: STREAMS,
    techSubCategories: TECH_SUB_CATEGORIES,
    nonTechSubCategories: NON_TECH_SUB_CATEGORIES,
    educationLevels: EDUCATION_LEVELS,
    programs: PROGRAMS,
    specializations: SPECIALIZATIONS,
    aiFamiliarityOptions: AI_FAMILIARITY_OPTIONS,
    aiUsageContexts: AI_USAGE_CONTEXTS,
    primaryGoalOptions: PRIMARY_GOAL_OPTIONS,
  });
};

/**
 * GET /academic/institutes
 */
export const getInstitutes = async (req: Request, res: Response) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const query = String(req.query.q || '').trim();
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  try {
    const where: Prisma.InstituteWhereInput = { status: 'ACTIVE' };
    if (query.length > 0) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { shortName: { contains: query, mode: 'insensitive' } },
        { city: { contains: query, mode: 'insensitive' } },
      ];
    }

    const institutes = await prisma.institute.findMany({
      where,
      orderBy: { name: 'asc' },
      take: limit,
    });

    return res.json({ institutes: institutes.map(withLegacyId) });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch institutes.', details: err.message });
  }
};

/**
 * POST /academic/institutes/request
 */
export const requestInstitute = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }

  const { name, city, state, country, type } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Institute name is required.' });
  }

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  try {
    const code = `REQ-${Date.now().toString(36).toUpperCase()}`;
    const inst = await prisma.institute.create({
      data: {
        name: name.trim(),
        code,
        city: city?.trim() || null,
        state: state?.trim() || null,
        country: country?.trim() || 'India',
        type: type || 'COLLEGE',
        status: 'PENDING',
        requestedBy: req.user ? String(req.user.id || req.user._id) : null,
      },
    });
    return res.json({
      success: true,
      institute: { id: inst.id, _id: inst.id, name: inst.name, status: inst.status },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to submit request.', details: err.message });
  }
};

/**
 * GET /student/profile
 */
export const getStudentProfile = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  try {
    const userId = String(req.user.id || req.user._id);
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) {
      return res.json({ academicProfile: null });
    }

    let cohortDisplayName: string | undefined;
    if (profile.cohortId) {
      const cohort = await prisma.cohort.findUnique({ where: { id: profile.cohortId } });
      cohortDisplayName = cohort?.displayName;
    }

    return res.json({
      academicProfile: {
        id: String(profile.id),
        stream: profile.stream,
        streamSubCategory: profile.streamSubCategory,
        educationLevel: profile.educationLevel,
        programId: profile.programId,
        programName: profile.programName,
        specializationId: profile.specializationId,
        specializationName: profile.specializationName,
        yearOfStudy: profile.yearOfStudy,
        admissionYear: profile.admissionYear,
        expectedGraduationYear: profile.expectedGraduationYear,
        instituteName: profile.instituteName,
        cohortId: profile.cohortId ? String(profile.cohortId) : undefined,
        cohortDisplayName,
        aiFamiliarity: profile.aiFamiliarity,
        aiUsageContexts: profile.aiUsageContexts,
        primaryGoal: profile.primaryGoal,
        isComplete: profile.isComplete,
      },
    });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: 'Failed to fetch academic profile.', details: err.message });
  }
};

/**
 * PUT /student/profile
 */
export const updateStudentProfile = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const updateData: Prisma.StudentProfileUpdateManyMutationInput = {};
  if (req.body.aiFamiliarity !== undefined) updateData.aiFamiliarity = req.body.aiFamiliarity;
  if (req.body.aiUsageContexts !== undefined) updateData.aiUsageContexts = req.body.aiUsageContexts;
  if (req.body.primaryGoal !== undefined) updateData.primaryGoal = req.body.primaryGoal;
  if (req.body.displayName !== undefined) updateData.displayName = req.body.displayName;

  try {
    const userId = String(req.user.id || req.user._id);
    await prisma.studentProfile.updateMany({
      where: { userId },
      data: updateData,
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update profile.', details: err.message });
  }
};
