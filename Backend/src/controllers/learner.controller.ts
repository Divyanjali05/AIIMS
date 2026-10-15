import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { User } from '../models/User.model';
import { Institute } from '../models/Institute.model';
import { StudentProfile } from '../models/StudentProfile.model';
import { Cohort } from '../models/Cohort.model';
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
  PRIMARY_GOAL_OPTIONS
} from '../config/academicTaxonomy';

/**
 * GET /learner/state
 */
export const getLearnerState = async (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    state: formatUserState(req.user!)
  });
};

/**
 * PUT /learner/state
 */
export const updateLearnerState = async (req: AuthenticatedRequest, res: Response) => {
  const { state } = req.body;
  if (!state) {
    return res.status(400).json({ error: 'State payload is required' });
  }

  try {
    const user = req.user!;
    const updateDoc: Record<string, any> = {};

    if (state.profile) {
      if (state.profile.name) updateDoc.name = state.profile.name;
      if (state.profile.role) updateDoc.role = state.profile.role;
      if (state.profile.college) updateDoc.college = state.profile.college;
      if (state.profile.targetGoal) updateDoc.targetGoal = state.profile.targetGoal;
      if (state.profile.stage) updateDoc.stage = state.profile.stage;
      // Note: aiimsCredits, xpPoints, and transactions are strictly managed by authoritative
      // server endpoints (save-task-score, award-level, submit, invest) to prevent balance tampering.
    }
    if (state.assessment) updateDoc.assessment = state.assessment;
    if (state.analysis) updateDoc.analysis = state.analysis;
    if (state.clarity) updateDoc.clarity = state.clarity;
    if (state.focus) updateDoc.focus = state.focus;
    if (state.radar) updateDoc.radar = state.radar;
    if (state.investigation) updateDoc.investigation = state.investigation;
    if (state.notifications) updateDoc.notifications = state.notifications;
    if (state.aiWallet) updateDoc.aiWallet = state.aiWallet;
    if (state.solver) updateDoc.solver = state.solver;
    if (state.build) updateDoc.build = state.build;

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: updateDoc, $unset: { __v: 1 } },
      { returnDocument: 'after' }
    );

    if (updatedUser) {
      return res.json({ success: true, state: formatUserState(updatedUser) });
    }
    return res.json({ success: true, state: formatUserState(user) });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to sync learner state to DB', details: err.message });
  }
};

/**
 * GET /academic/taxonomy
 */
export const getAcademicTaxonomy = (_req: Request, res: Response) => {
  res.json({
    streams: STREAMS,
    techSubCategories: TECH_SUB_CATEGORIES,
    nonTechSubCategories: NON_TECH_SUB_CATEGORIES,
    educationLevels: EDUCATION_LEVELS,
    programs: PROGRAMS,
    specializations: SPECIALIZATIONS,
    aiFamiliarityOptions: AI_FAMILIARITY_OPTIONS,
    aiUsageContexts: AI_USAGE_CONTEXTS,
    primaryGoalOptions: PRIMARY_GOAL_OPTIONS
  });
};

/**
 * GET /academic/institutes
 */
export const getInstitutes = async (req: Request, res: Response) => {
  const query = String(req.query.q || '').trim();
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  const SEED_INSTITUTES = [
    { _id: 'inst-001', name: 'IIT Bombay', shortName: 'IITB', city: 'Mumbai', country: 'India', type: 'INSTITUTE' },
    { _id: 'inst-002', name: 'IIT Delhi', shortName: 'IITD', city: 'New Delhi', country: 'India', type: 'INSTITUTE' },
    { _id: 'inst-003', name: 'IIT Madras', shortName: 'IITM', city: 'Chennai', country: 'India', type: 'INSTITUTE' },
    { _id: 'inst-004', name: 'IIT Kharagpur', shortName: 'IITKgp', city: 'Kharagpur', country: 'India', type: 'INSTITUTE' },
    { _id: 'inst-005', name: 'NIT Trichy', shortName: 'NIT-T', city: 'Tiruchirappalli', country: 'India', type: 'INSTITUTE' },
    { _id: 'inst-006', name: 'BITS Pilani', shortName: 'BITS', city: 'Pilani', country: 'India', type: 'INSTITUTE' },
    { _id: 'inst-007', name: 'VIT Vellore', shortName: 'VIT', city: 'Vellore', country: 'India', type: 'UNIVERSITY' },
    { _id: 'inst-008', name: 'SRM Institute of Science and Technology', shortName: 'SRM', city: 'Chennai', country: 'India', type: 'UNIVERSITY' },
    { _id: 'inst-009', name: 'Anna University', shortName: 'AU', city: 'Chennai', country: 'India', type: 'UNIVERSITY' },
    { _id: 'inst-010', name: 'University of Mumbai', shortName: 'MU', city: 'Mumbai', country: 'India', type: 'UNIVERSITY' },
    { _id: 'inst-011', name: 'Delhi University', shortName: 'DU', city: 'New Delhi', country: 'India', type: 'UNIVERSITY' },
    { _id: 'inst-012', name: 'Amity University', shortName: 'Amity', city: 'Noida', country: 'India', type: 'UNIVERSITY' },
    { _id: 'inst-013', name: 'Manipal Academy of Higher Education', shortName: 'MAHE', city: 'Manipal', country: 'India', type: 'UNIVERSITY' },
    { _id: 'inst-014', name: 'PSG College of Technology', shortName: 'PSGCT', city: 'Coimbatore', country: 'India', type: 'COLLEGE' },
    { _id: 'inst-015', name: 'Coimbatore Institute of Technology', shortName: 'CIT', city: 'Coimbatore', country: 'India', type: 'COLLEGE' },
    { _id: 'inst-099', name: 'Other / Not Listed', shortName: 'OTHER', city: '', country: 'India', type: 'OTHER' }
  ];

  if (mongoose.connection.readyState !== 1) {
    const filtered = query
      ? SEED_INSTITUTES.filter(i =>
          i.name.toLowerCase().includes(query.toLowerCase()) ||
          (i.shortName && i.shortName.toLowerCase().includes(query.toLowerCase())) ||
          (i.city && i.city.toLowerCase().includes(query.toLowerCase()))
        )
      : SEED_INSTITUTES;

    return res.json({ institutes: filtered.slice(0, limit) });
  }

  try {
    let institutes: any[] = [];
    if (query.length >= 2) {
      institutes = await Institute.find(
        { $text: { $search: query }, status: 'ACTIVE' },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } }).limit(limit).lean();

      // Fallback to regex if text index not working
      if (institutes.length === 0) {
        institutes = await Institute.find({
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { shortName: { $regex: query, $options: 'i' } },
            { city: { $regex: query, $options: 'i' } }
          ],
          status: 'ACTIVE'
        }).limit(limit).lean();
      }
    } else {
      institutes = await Institute.find({ status: 'ACTIVE' }).limit(limit).lean();
    }

    if (institutes.length === 0) {
      const filtered = query
        ? SEED_INSTITUTES.filter(i =>
            i.name.toLowerCase().includes(query.toLowerCase()) ||
            (i.shortName && i.shortName.toLowerCase().includes(query.toLowerCase())) ||
            (i.city && i.city.toLowerCase().includes(query.toLowerCase()))
          )
        : SEED_INSTITUTES;
      return res.json({ institutes: filtered.slice(0, limit) });
    }

    res.json({ institutes });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch institutes.', details: err.message });
  }
};

/**
 * POST /academic/institutes/request
 */
export const requestInstitute = async (req: AuthenticatedRequest, res: Response) => {
  const { name, city, state, country, type } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Institute name is required.' });
  }

  if (mongoose.connection.readyState !== 1) {
    return res.json({ success: true, message: 'Institute request received. It will be reviewed and added soon.' });
  }

  try {
    const code = `REQ-${Date.now().toString(36).toUpperCase()}`;
    const inst = await Institute.create({
      name: name.trim(),
      code,
      city: city?.trim(),
      state: state?.trim(),
      country: country?.trim() || 'India',
      type: type || 'COLLEGE',
      status: 'PENDING',
      requestedBy: req.user ? String(req.user._id) : undefined
    });
    res.json({ success: true, institute: { _id: inst._id, name: inst.name, status: inst.status } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to submit request.', details: err.message });
  }
};

/**
 * GET /student/profile
 */
export const getStudentProfile = async (req: AuthenticatedRequest, res: Response) => {
  if (mongoose.connection.readyState !== 1) {
    return res.json({ academicProfile: null });
  }

  try {
    const profile = await StudentProfile.findOne({ userId: req.user!._id }).lean();
    if (!profile) {
      return res.json({ academicProfile: null });
    }

    // Resolve cohort display name if cohortId exists
    let cohortDisplayName: string | undefined;
    if (profile.cohortId) {
      const cohort = await Cohort.findById(profile.cohortId).lean();
      cohortDisplayName = cohort?.displayName;
    }

    res.json({
      academicProfile: {
        id: String(profile._id),
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
        isComplete: profile.isComplete
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch academic profile.', details: err.message });
  }
};

/**
 * PUT /student/profile
 */
export const updateStudentProfile = async (req: AuthenticatedRequest, res: Response) => {
  const allowedUpdates = ['aiFamiliarity', 'aiUsageContexts', 'primaryGoal', 'displayName'];
  const updateData: Record<string, any> = {};

  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      updateData[key] = req.body[key];
    }
  }

  if (mongoose.connection.readyState !== 1) {
    return res.json({ success: true });
  }

  try {
    await StudentProfile.updateOne({ userId: req.user!._id }, { $set: updateData });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update profile.', details: err.message });
  }
};
