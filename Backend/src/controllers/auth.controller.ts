import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { config } from '../config/env';
import { User, IUser } from '../models/User.model';
import { StudentProfile } from '../models/StudentProfile.model';
import { Cohort } from '../models/Cohort.model';
import { mockUser } from '../models/aiims.models';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { formatUserState } from '../config/credits.config';
import { creditsLedgerService } from '../services/creditsLedger.service';
import { PROGRAMS, validateAcademicCombination } from '../config/academicTaxonomy';

/**
 * Generates a cryptographically signed JWT token with a 7-day expiration
 */
export const generateAuthToken = (userId: string, email: string): string => {
  return jwt.sign({ userId, email: email.toLowerCase().trim() }, config.jwtSecret, {
    expiresIn: '7d',
  });
};

import { registeredUsers } from '../models/userStore';
export { registeredUsers };

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !email.trim() || !email.includes('@')) {
    return res.status(400).json({ error: 'Email or password is incorrect.' });
  }
  if (!password || !password.trim()) {
    return res.status(400).json({ error: 'Email or password is incorrect.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // 1. Try DB user if connected
  if (mongoose.connection.readyState === 1) {
    try {
      const dbUser = await User.findOne({ email: normalizedEmail });
      if (dbUser) {
        const isMatch = await dbUser.comparePassword(password);
        if (isMatch) {
          const token = generateAuthToken(String(dbUser._id), dbUser.email);
          const userState = formatUserState(dbUser);
          return res.json({
            token,
            user: userState.profile,
            state: userState,
          });
        } else {
          return res.status(401).json({ error: 'Email or password is incorrect.' });
        }
      }
    } catch {
      // Proceed to fallback
    }
  }

  // 2. Check registeredUsers in-memory store
  const user = registeredUsers[normalizedEmail];
  if (!user) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }

  const isMatch =
    user.password && user.password.startsWith('$2')
      ? await bcrypt.compare(password, user.password)
      : user.password === password;

  if (!isMatch) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }

  const token = generateAuthToken(user.id || `usr-${normalizedEmail}`, user.email);
  return res.json({
    token,
    user: {
      id: user.id || `usr-${normalizedEmail}`,
      name: user.name,
      email: user.email,
      role: user.role,
      college: user.college,
      targetGoal: user.targetGoal,
      stage: user.stage,
      xpPoints: user.xpPoints,
      aiimsCredits: user.aiimsCredits,
    },
  });
};

export const register = async (req: Request, res: Response) => {
  const {
    name,
    email,
    password,
    confirmPassword,
    instituteId,
    instituteName,
    stream,
    streamSubCategory,
    educationLevel,
    programId,
    programName,
    specializationId,
    specializationName,
    yearOfStudy,
    admissionYear,
    expectedGraduationYear,
    aiFamiliarity,
    aiUsageContexts,
    primaryGoal,
  } = req.body;

  // Account validation
  if (!email || !email.trim() || !email.includes('@') || !email.includes('.')) {
    return res.status(400).json({ error: 'Enter a valid email address.', field: 'email' });
  }
  if (!name || !name.trim() || name.trim().length < 2) {
    return res.status(400).json({ error: 'Please enter your full name.', field: 'name' });
  }
  if (!password || password.length < 8) {
    return res
      .status(400)
      .json({ error: 'Password must be at least 8 characters long.', field: 'password' });
  }
  if (!/[A-Z]/.test(password)) {
    return res
      .status(400)
      .json({ error: 'Password must contain at least one uppercase letter.', field: 'password' });
  }
  if (!/[0-9]/.test(password)) {
    return res
      .status(400)
      .json({ error: 'Password must contain at least one number.', field: 'password' });
  }
  if (confirmPassword && password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.', field: 'confirmPassword' });
  }

  // Academic identity validation
  if (!stream || !['TECH', 'NON_TECH'].includes(stream)) {
    return res
      .status(400)
      .json({ error: 'Please select a valid academic stream.', field: 'stream' });
  }
  if (
    !educationLevel ||
    !['SCHOOL', 'UNDERGRADUATE', 'POSTGRADUATE', 'RESEARCH', 'GRADUATE'].includes(educationLevel)
  ) {
    return res
      .status(400)
      .json({ error: 'Please select a valid education level.', field: 'educationLevel' });
  }
  if (!programId) {
    return res
      .status(400)
      .json({ error: 'Please select your degree or program.', field: 'programId' });
  }
  if (!specializationId) {
    return res
      .status(400)
      .json({ error: 'Please select your branch or specialization.', field: 'specializationId' });
  }
  if (!yearOfStudy || Number(yearOfStudy) < 1 || Number(yearOfStudy) > 7) {
    return res
      .status(400)
      .json({ error: 'Please enter a valid year of study (1–7).', field: 'yearOfStudy' });
  }
  if (!admissionYear || Number(admissionYear) < 1990 || Number(admissionYear) > 2030) {
    return res
      .status(400)
      .json({ error: 'Please enter a valid admission year.', field: 'admissionYear' });
  }
  if (!expectedGraduationYear || Number(expectedGraduationYear) < Number(admissionYear)) {
    return res.status(400).json({
      error: 'Expected graduation year must be after admission year.',
      field: 'expectedGraduationYear',
    });
  }

  // Taxonomy consistency check
  const taxonomyCheck = validateAcademicCombination(
    stream,
    educationLevel,
    programId,
    specializationId
  );
  if (!taxonomyCheck.valid) {
    return res.status(400).json({
      error: taxonomyCheck.reason || 'Invalid academic combination.',
      field: 'specializationId',
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const displayName = name.trim();
  const programInfo = PROGRAMS.find((p) => p.id === programId);

  // Check MongoDB connection
  if (mongoose.connection.readyState !== 1) {
    if (registeredUsers[normalizedEmail]) {
      return res
        .status(400)
        .json({ error: 'An account with this email already exists. Please sign in.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const stableId = new mongoose.Types.ObjectId().toHexString();
    const newUser: Record<string, unknown> = {
      _id: stableId,
      id: stableId,
      name: displayName,
      email: normalizedEmail,
      role: 'STUDENT',
      college: instituteName || 'Unknown Institute',
      targetGoal: 'Explore AI Architectures & Intelligence',
      stage: 'Knowing',
      xpPoints: 100,
      aiimsCredits: 0,
      password: hashedPassword,
      stream,
      programName,
      specializationName,
      transactions: [],
    };
    registeredUsers[normalizedEmail] = newUser;
    const welcomeResult = await creditsLedgerService
      .executeTransaction({
        userId: stableId,
        type: 'EARN',
        category: 'REWARD',
        amount: 100,
        reason: 'Welcome Learning Grant (+100 AC)',
        source: 'SYSTEM',
        sourceId: 'WELCOME_BONUS',
        idempotencyKey: `welcome::${stableId}`,
      })
      .catch(() => null);

    newUser.aiimsCredits = welcomeResult?.balance ?? 100;
    const token = generateAuthToken(stableId, normalizedEmail);
    const baseState = formatUserState(new User(newUser) as IUser);
    return res.status(201).json({
      token,
      user: { ...newUser, id: newUser.id, aiimsCredits: newUser.aiimsCredits },
      state: {
        ...baseState,
        academicProfile: {
          stream,
          programName,
          specializationName,
          educationLevel,
          yearOfStudy: Number(yearOfStudy),
        },
      },
    });
  }

  try {
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: 'An account with this email already exists. Please sign in.' });
    }

    const dbUser = await User.create({
      name: displayName,
      email: normalizedEmail,
      password,
      role: 'STUDENT',
      college: instituteName || 'Unknown Institute',
      targetGoal: 'Explore AI Architectures & Intelligence',
      stage: 'Knowing',
      xpPoints: 100,
      aiimsCredits: 0,
    });

    // Record welcome bonus authoritatively in CreditLedger and User document
    const welcomeResult = await creditsLedgerService
      .executeTransaction({
        userId: String(dbUser._id),
        type: 'EARN',
        category: 'REWARD',
        amount: 100,
        reason: 'Welcome Learning Grant (+100 AC)',
        source: 'SYSTEM',
        sourceId: 'WELCOME_BONUS',
        idempotencyKey: `welcome::${String(dbUser._id)}`,
      })
      .catch((e) => {
        console.warn('[Auth] Welcome ledger entry warning:', e.message);
        return null;
      });

    // Refresh user document to ensure persisted balance is reflected in registration response
    const refreshedUser = await User.findById(dbUser._id);
    const finalDbUser = refreshedUser || dbUser;
    if (welcomeResult?.balance !== undefined) {
      finalDbUser.aiimsCredits = welcomeResult.balance;
    }

    let cohortDoc: typeof Cohort.prototype | null = null;
    try {
      const admissionYearNum = Number(admissionYear);
      const graduationYearNum = Number(expectedGraduationYear);
      const cohortShortCode = `${programId.toUpperCase()}-${specializationId.toUpperCase()}-${admissionYearNum}-${graduationYearNum}`;
      const cohortDisplayName = `${programName} · ${specializationName} · ${admissionYearNum}–${graduationYearNum}`;

      cohortDoc = await Cohort.findOneAndUpdate(
        {
          instituteId: instituteId ? new mongoose.Types.ObjectId(String(instituteId)) : undefined,
          stream,
          educationLevel,
          programId,
          specializationId,
          admissionYear: admissionYearNum,
          graduationYear: graduationYearNum,
        },
        {
          $setOnInsert: {
            instituteName: instituteName || 'Unknown',
            programName,
            specializationName,
            displayName: cohortDisplayName,
            shortCode: cohortShortCode,
            assessmentVersion: 'v1.0',
          },
          $inc: { studentCount: 1 },
        },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (cohortErr) {
      console.warn('Cohort upsert warning:', cohortErr);
    }

    const profileData: Record<string, unknown> = {
      userId: dbUser._id,
      fullName: displayName,
      stream,
      streamSubCategory: streamSubCategory || (stream === 'TECH' ? 'CS_IT' : 'COMMERCE_FINANCE'),
      educationLevel,
      programId,
      programName: programName || programInfo?.label || programId,
      specializationId,
      specializationName,
      yearOfStudy: Number(yearOfStudy),
      admissionYear: Number(admissionYear),
      expectedGraduationYear: Number(expectedGraduationYear),
      isComplete: true,
    };
    if (instituteId) profileData.instituteId = new mongoose.Types.ObjectId(String(instituteId));
    if (instituteName) profileData.instituteName = instituteName;
    if (cohortDoc) profileData.cohortId = cohortDoc._id;
    if (aiFamiliarity) profileData.aiFamiliarity = aiFamiliarity;
    if (aiUsageContexts && Array.isArray(aiUsageContexts))
      profileData.aiUsageContexts = aiUsageContexts;
    if (primaryGoal) profileData.primaryGoal = primaryGoal;

    const studentProfile = await StudentProfile.create(profileData);

    const token = generateAuthToken(String(finalDbUser._id), finalDbUser.email);
    const userState = formatUserState(finalDbUser);

    return res.status(201).json({
      token,
      user: userState.profile,
      state: {
        ...userState,
        academicProfile: {
          id: String(studentProfile._id),
          stream: studentProfile.stream,
          streamSubCategory: studentProfile.streamSubCategory,
          educationLevel: studentProfile.educationLevel,
          programId: studentProfile.programId,
          programName: studentProfile.programName,
          specializationId: studentProfile.specializationId,
          specializationName: studentProfile.specializationName,
          yearOfStudy: studentProfile.yearOfStudy,
          admissionYear: studentProfile.admissionYear,
          expectedGraduationYear: studentProfile.expectedGraduationYear,
          instituteName: studentProfile.instituteName,
          cohortId: cohortDoc ? String(cohortDoc._id) : undefined,
          cohortDisplayName: cohortDoc?.displayName,
          isComplete: true,
        },
      },
    });
  } catch (err: unknown) {
    console.error('Registration error:', err);
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: number }).code === 11000
    ) {
      return res
        .status(400)
        .json({ error: 'An account with this email already exists. Please sign in.' });
    }
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

export const getProfile = (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    return res.json({
      id: String(req.user._id || req.user.id),
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      college: req.user.college || 'Engineering & Technology College',
      targetGoal: req.user.targetGoal,
      stage: req.user.stage,
      xpPoints: req.user.xpPoints,
      aiimsCredits: req.user.aiimsCredits,
    });
  }
  return res.json(mockUser);
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  const { name, role, college, targetGoal } = req.body;

  if (req.user) {
    if (name) req.user.name = name;
    if (role) req.user.role = role;
    if (college) req.user.college = college;
    if (targetGoal) req.user.targetGoal = targetGoal;

    if (mongoose.connection.readyState === 1 && typeof req.user.save === 'function') {
      try {
        await req.user.save();
      } catch (saveErr: unknown) {
        const errorMsg = saveErr instanceof Error ? saveErr.message : String(saveErr);
        console.warn('Could not persist profile update to MongoDB:', errorMsg);
      }
    } else if (req.user.email && registeredUsers && registeredUsers[req.user.email.toLowerCase()]) {
      const reg = registeredUsers[req.user.email.toLowerCase()];
      if (name) reg.name = name;
      if (role) reg.role = role;
      if (college) reg.college = college;
      if (targetGoal) reg.targetGoal = targetGoal;
    }

    return res.json({
      id: String(req.user._id || req.user.id),
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      college: req.user.college,
      targetGoal: req.user.targetGoal,
      stage: req.user.stage,
      xpPoints: req.user.xpPoints,
      aiimsCredits: req.user.aiimsCredits,
    });
  }

  if (name) mockUser.name = name;
  if (role) mockUser.role = role;
  if (college) mockUser.college = college;
  if (targetGoal) mockUser.targetGoal = targetGoal;
  return res.json(mockUser);
};
