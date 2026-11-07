import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { config } from '../config/env';
import { User, IUser } from '../models/User.model';
import { StudentProfile } from '../models/StudentProfile.model';
import { Cohort } from '../models/Cohort.model';
import { mockUser } from '../models/aiims.models';
import { Submission, memorySubmissions } from '../models/Submission.model';
import { writeAuditLog } from '../models/AuditLog.model';
import { AuthenticatedRequest, JwtPayload } from '../middleware/auth.middleware';
import { extractDeviceInfo } from '../utils/deviceIdentifier';
import { sessionService } from '../models/Session.model';
import { recordDeviceResetAudit } from '../models/DeviceResetAudit.model';
import { formatUserState, STARTING_CREDITS } from '../config/credits.config';
import { creditsLedgerService } from '../services/creditsLedger.service';
import { PROGRAMS, validateAcademicCombination } from '../config/academicTaxonomy';

import { generateCsrfToken } from '../middleware/csrf.middleware';

/** 7-day cookie / token lifetime */
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generates a cryptographically signed JWT token with a 7-day expiration
 */
export const generateAuthToken = (
  userId: string,
  email: string,
  role: string = 'learner',
  sessionId?: string,
  deviceIdHash?: string
): string => {
  return jwt.sign(
    {
      userId,
      email: email.toLowerCase().trim(),
      role,
      ...(sessionId ? { sessionId } : {}),
      ...(deviceIdHash ? { deviceIdHash } : {}),
    },
    config.jwtSecret,
    {
      expiresIn: '7d',
    }
  );
};

/**
 * Sets the auth JWT as an httpOnly, Secure (in production), SameSite=Lax cookie.
 * Also issues a Double-Submit CSRF cookie for client-side state-changing requests.
 */
const setAuthCookie = (res: Response, token: string, req?: Request): void => {
  res.cookie('aiims_token', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
  if (req) {
    try {
      generateCsrfToken(req, res);
    } catch {}
  }
};

/**
 * Returns true when the request comes from a native mobile app
 * (mobile clients send `X-Client: mobile` header).
 */
const isMobileClient = (req: Request): boolean =>
  (req.headers['x-client'] as string | undefined)?.toLowerCase() === 'mobile';

import {
  registeredUsers,
  isSafeKey,
  getRegisteredUser,
  saveRegisteredUser,
} from '../models/userStore';
export { registeredUsers };

/**
 * Strict One Account – One Device validation & session creation helper.
 */
async function verifyAndBindDevice(
  userDocOrMemory: any,
  req: Request,
  res: Response
): Promise<{ success: boolean; sessionId?: string; deviceIdHash?: string }> {
  const devInfo = extractDeviceInfo(req);
  const userId = String(userDocOrMemory._id || userDocOrMemory.id);
  const binding = userDocOrMemory.deviceBinding;

  const isBound = Boolean(
    binding &&
    binding.bindingStatus === 'BOUND' &&
    binding.deviceIdHash &&
    binding.deviceIdHash.trim().length > 0
  );

  if (isBound) {
    if (binding.deviceIdHash !== devInfo.deviceIdHash) {
      let hasActiveSession = false;
      if (binding.activeSessionId) {
        const sess = await sessionService.getSession(binding.activeSessionId);
        if (sess && sess.status === 'ACTIVE' && sess.expiresAt > new Date()) {
          hasActiveSession = true;
        }
      }
      if (!hasActiveSession) {
        const anyActive = await sessionService.getActiveSessionForUser(userId);
        if (anyActive) {
          hasActiveSession = true;
        }
      }

      if (hasActiveSession) {
        res.status(403).json({
          error: 'Account is active on another device.',
          code: 'ACCOUNT_ACTIVE_ANOTHER_DEVICE',
        });
        return { success: false };
      } else {
        res.status(403).json({
          error:
            'This account is registered to another device. Contact support for a device reset.',
          code: 'DEVICE_BOUND_ANOTHER_DEVICE',
        });
        return { success: false };
      }
    } else {
      if (binding.activeSessionId) {
        await sessionService.revokeSession(binding.activeSessionId);
      }
      const newSessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE_MS);
      await sessionService.createSession({
        sessionId: newSessionId,
        userId,
        deviceIdHash: devInfo.deviceIdHash,
        deviceName: devInfo.deviceName,
        platform: devInfo.platform,
        expiresAt,
      });

      binding.activeSessionId = newSessionId;
      binding.lastSeenAt = new Date();
      binding.deviceName = devInfo.deviceName;
      binding.platform = devInfo.platform;

      if (typeof userDocOrMemory.save === 'function') {
        await userDocOrMemory.save();
      } else if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(userId)) {
        await User.findByIdAndUpdate(userId, {
          $set: {
            'deviceBinding.activeSessionId': newSessionId,
            'deviceBinding.lastSeenAt': new Date(),
            'deviceBinding.deviceName': devInfo.deviceName,
            'deviceBinding.platform': devInfo.platform,
          },
        });
      }
      return { success: true, sessionId: newSessionId, deviceIdHash: devInfo.deviceIdHash };
    }
  } else {
    const newSessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE_MS);
    await sessionService.createSession({
      sessionId: newSessionId,
      userId,
      deviceIdHash: devInfo.deviceIdHash,
      deviceName: devInfo.deviceName,
      platform: devInfo.platform,
      expiresAt,
    });

    const newBinding = {
      deviceIdHash: devInfo.deviceIdHash,
      deviceName: devInfo.deviceName,
      platform: devInfo.platform,
      boundAt: new Date(),
      lastSeenAt: new Date(),
      activeSessionId: newSessionId,
      bindingStatus: 'BOUND' as const,
      resetAt: null,
      resetBy: null,
    };

    userDocOrMemory.deviceBinding = newBinding;

    if (typeof userDocOrMemory.save === 'function') {
      await userDocOrMemory.save();
    } else if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(userId)) {
      await User.findByIdAndUpdate(userId, {
        $set: { deviceBinding: newBinding },
      });
    }
    return { success: true, sessionId: newSessionId, deviceIdHash: devInfo.deviceIdHash };
  }
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !email.trim() || !email.includes('@')) {
    return res.status(400).json({ error: 'Email or password is incorrect.' });
  }
  if (!password || !password.trim()) {
    return res.status(400).json({ error: 'Email or password is incorrect.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const mobile = isMobileClient(req);

  // 1. Try DB user if connected
  if (mongoose.connection.readyState === 1) {
    try {
      const dbUser = await User.findOne({ email: normalizedEmail });
      if (dbUser) {
        const isMatch = await dbUser.comparePassword(password);
        if (isMatch) {
          // Staff accounts with 2FA enabled must complete the second factor
          if ((dbUser.role === 'evaluator' || dbUser.role === 'admin') && dbUser.totp?.enabled) {
            return res.status(200).json({
              totpRequired: true,
              userId: String(dbUser._id),
              role: dbUser.role,
            });
          }
          const deviceResult = await verifyAndBindDevice(dbUser, req, res);
          if (!deviceResult.success) {
            return;
          }
          const token = generateAuthToken(
            String(dbUser._id),
            dbUser.email,
            dbUser.role,
            deviceResult.sessionId,
            deviceResult.deviceIdHash
          );
          setAuthCookie(res, token, req);
          const userState = formatUserState(dbUser);
          return res.json({
            ...(mobile ? { token } : {}),
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
      : false;

  if (!isMatch) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }

  const deviceResult = await verifyAndBindDevice(user, req, res);
  if (!deviceResult.success) {
    return;
  }
  const token = generateAuthToken(
    user.id || `usr-${normalizedEmail}`,
    user.email,
    user.role || 'learner',
    deviceResult.sessionId,
    deviceResult.deviceIdHash
  );
  setAuthCookie(res, token, req);
  return res.json({
    ...(mobile ? { token } : {}),
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
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  const {
    name,
    email,
    password,
    confirmPassword,
    track,
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

  // Mandatory track validation (Student or Entrepreneur)
  const normalizedTrack =
    typeof track === 'string' && track.trim().toLowerCase() === 'entrepreneur'
      ? 'Entrepreneur'
      : typeof track === 'string' && track.trim().toLowerCase() === 'student'
        ? 'Student'
        : undefined;

  if (!normalizedTrack) {
    return res.status(400).json({
      error: 'Track is required. Please select Student or Entrepreneur.',
      code: 'INVALID_INPUT',
      field: 'track',
    });
  }

  // Account validation
  if (!email || !email.trim() || !email.includes('@') || !email.includes('.')) {
    return res.status(400).json({
      error: 'Enter a valid email address.',
      code: 'INVALID_INPUT',
      field: 'email',
    });
  }
  if (!name || !name.trim() || name.trim().length < 2) {
    return res.status(400).json({
      error: 'Please enter your full name.',
      code: 'INVALID_INPUT',
      field: 'name',
    });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters long.',
      code: 'INVALID_INPUT',
      field: 'password',
    });
  }
  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({
      error: 'Password must contain at least one uppercase letter.',
      code: 'INVALID_INPUT',
      field: 'password',
    });
  }
  if (!/[0-9]/.test(password)) {
    return res.status(400).json({
      error: 'Password must contain at least one number.',
      code: 'INVALID_INPUT',
      field: 'password',
    });
  }
  if (confirmPassword && password !== confirmPassword) {
    return res.status(400).json({
      error: 'Passwords do not match.',
      code: 'INVALID_INPUT',
      field: 'confirmPassword',
    });
  }

  // Academic identity validation
  if (!stream || !['TECH', 'NON_TECH'].includes(stream)) {
    return res.status(400).json({
      error: 'Please select a valid academic stream.',
      code: 'INVALID_INPUT',
      field: 'stream',
    });
  }
  if (
    !educationLevel ||
    !['SCHOOL', 'UNDERGRADUATE', 'POSTGRADUATE', 'RESEARCH', 'GRADUATE'].includes(educationLevel)
  ) {
    return res.status(400).json({
      error: 'Please select a valid education level.',
      code: 'INVALID_INPUT',
      field: 'educationLevel',
    });
  }
  if (!programId) {
    return res.status(400).json({
      error: 'Please select your degree or program.',
      code: 'INVALID_INPUT',
      field: 'programId',
    });
  }
  if (!specializationId) {
    return res.status(400).json({
      error: 'Please select your branch or specialization.',
      code: 'INVALID_INPUT',
      field: 'specializationId',
    });
  }
  if (!yearOfStudy || Number(yearOfStudy) < 1 || Number(yearOfStudy) > 7) {
    return res.status(400).json({
      error: 'Please enter a valid year of study (1–7).',
      code: 'INVALID_INPUT',
      field: 'yearOfStudy',
    });
  }
  if (!admissionYear || Number(admissionYear) < 1990 || Number(admissionYear) > 2030) {
    return res.status(400).json({
      error: 'Please enter a valid admission year.',
      code: 'INVALID_INPUT',
      field: 'admissionYear',
    });
  }
  if (!expectedGraduationYear || Number(expectedGraduationYear) < Number(admissionYear)) {
    return res.status(400).json({
      error: 'Expected graduation year must be after admission year.',
      code: 'INVALID_INPUT',
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
      code: 'INVALID_INPUT',
      field: 'specializationId',
    });
  }

  // Step 7: Discard invalid institute ID if not a valid database ObjectId
  let cleanInstituteId: mongoose.Types.ObjectId | undefined = undefined;
  if (instituteId && typeof instituteId === 'string' && instituteId.trim().length > 0) {
    const trimmed = instituteId.trim();
    if (mongoose.Types.ObjectId.isValid(trimmed) && !trimmed.startsWith('inst-')) {
      cleanInstituteId = new mongoose.Types.ObjectId(trimmed);
    } else {
      console.info(`[Auth] [${requestId}] Non-ObjectId instituteId discarded: "${trimmed}"`);
    }
  }

  const normalizedEmail = email.trim().toLowerCase();
  const displayName = name.trim();
  const programInfo = PROGRAMS.find((p) => p.id === programId);

  // Check MongoDB connection (fallback in-memory store)
  if (mongoose.connection.readyState !== 1) {
    if (registeredUsers[normalizedEmail]) {
      return res.status(400).json({
        error: 'An account with this email already exists. Please sign in.',
        code: 'EMAIL_ALREADY_EXISTS',
        field: 'email',
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const stableId = new mongoose.Types.ObjectId().toHexString();
    const newUser: Record<string, unknown> = {
      _id: stableId,
      id: stableId,
      name: displayName,
      email: normalizedEmail,
      role: 'learner',
      track: normalizedTrack,
      college: instituteName || 'Unknown Institute',
      targetGoal:
        normalizedTrack === 'Entrepreneur'
          ? 'Build & Scale AI Ventures'
          : 'Explore AI Architectures & Intelligence',
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
        amount: STARTING_CREDITS,
        reason: `Welcome Learning Grant (+${STARTING_CREDITS} AC)`,
        source: 'SYSTEM',
        sourceId: 'WELCOME_BONUS',
        idempotencyKey: `welcome::${stableId}`,
      })
      .catch(() => null);

    newUser.aiimsCredits = welcomeResult?.balance ?? STARTING_CREDITS;
    const token = generateAuthToken(stableId, normalizedEmail);
    setAuthCookie(res, token, req);
    const baseState = formatUserState(new User(newUser) as IUser);
    return res.status(201).json({
      ...(isMobileClient(req) ? { token } : {}),
      user: {
        ...newUser,
        id: newUser.id,
        aiimsCredits: newUser.aiimsCredits,
        track: normalizedTrack,
      },
      state: {
        ...baseState,
        academicProfile: {
          stream,
          programName,
          specializationName,
          educationLevel,
          yearOfStudy: Number(yearOfStudy),
          track: normalizedTrack,
        },
      },
    });
  }

  try {
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        error: 'An account with this email already exists. Please sign in.',
        code: 'EMAIL_ALREADY_EXISTS',
        field: 'email',
      });
    }

    let dbUser: IUser;
    try {
      dbUser = await User.create({
        name: displayName,
        email: normalizedEmail,
        password,
        role: 'learner',
        track: normalizedTrack,
        college: instituteName || 'Unknown Institute',
        targetGoal:
          normalizedTrack === 'Entrepreneur'
            ? 'Build & Scale AI Ventures'
            : 'Explore AI Architectures & Intelligence',
        stage: 'Knowing',
        xpPoints: 100,
        aiimsCredits: 0,
      });
    } catch (userCreateErr: any) {
      console.error(`[Auth] [${requestId}] User creation database failure:`, userCreateErr);
      if (userCreateErr?.code === 11000) {
        return res.status(400).json({
          error: 'An account with this email already exists. Please sign in.',
          code: 'EMAIL_ALREADY_EXISTS',
          field: 'email',
        });
      }
      return res.status(500).json({
        error: 'Database operation failed during user registration.',
        code: 'DATABASE_FAILURE',
        requestId,
      });
    }

    // Record welcome bonus authoritatively in CreditLedger and User document
    const welcomeResult = await creditsLedgerService
      .executeTransaction({
        userId: String(dbUser._id),
        type: 'EARN',
        category: 'REWARD',
        amount: STARTING_CREDITS,
        reason: `Welcome Learning Grant (+${STARTING_CREDITS} AC)`,
        source: 'SYSTEM',
        sourceId: 'WELCOME_BONUS',
        idempotencyKey: `welcome::${String(dbUser._id)}`,
      })
      .catch((e) => {
        console.warn(`[Auth] [${requestId}] Welcome ledger entry warning:`, e.message);
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
          ...(cleanInstituteId ? { instituteId: cleanInstituteId } : {}),
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
      console.warn(`[Auth] [${requestId}] Cohort upsert warning:`, cohortErr);
    }

    const profileData: Record<string, unknown> = {
      userId: dbUser._id,
      fullName: displayName,
      track: normalizedTrack,
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
    if (cleanInstituteId) profileData.instituteId = cleanInstituteId;
    if (instituteName) profileData.instituteName = instituteName;
    if (cohortDoc) profileData.cohortId = cohortDoc._id;
    if (aiFamiliarity) profileData.aiFamiliarity = aiFamiliarity;
    if (aiUsageContexts && Array.isArray(aiUsageContexts))
      profileData.aiUsageContexts = aiUsageContexts;
    if (primaryGoal) profileData.primaryGoal = primaryGoal;

    let studentProfile: any;
    try {
      studentProfile = await StudentProfile.create(profileData);
    } catch (profileErr: any) {
      console.error(
        `[Auth] [${requestId}] Profile save failure, rolling back user ${dbUser._id}:`,
        profileErr
      );
      try {
        await User.findByIdAndDelete(dbUser._id);
      } catch (rollbackErr) {
        console.error(`[Auth] [${requestId}] User rollback failed:`, rollbackErr);
      }
      return res.status(500).json({
        error: 'Unable to save learner profile. Please try again.',
        code: 'PROFILE_SAVE_FAILED',
        requestId,
      });
    }

    const token = generateAuthToken(String(finalDbUser._id), finalDbUser.email);
    setAuthCookie(res, token, req);
    const userState = formatUserState(finalDbUser);

    return res.status(201).json({
      ...(isMobileClient(req) ? { token } : {}),
      user: { ...userState.profile, track: normalizedTrack },
      state: {
        ...userState,
        academicProfile: {
          id: String(studentProfile._id),
          track: studentProfile.track,
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
    console.error(`[Auth] [${requestId}] Registration error:`, err);
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: number }).code === 11000
    ) {
      return res.status(400).json({
        error: 'An account with this email already exists. Please sign in.',
        code: 'EMAIL_ALREADY_EXISTS',
        field: 'email',
      });
    }
    return res.status(500).json({
      error: 'Registration failed due to an internal error. Please try again.',
      code: 'DATABASE_FAILURE',
      requestId,
    });
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

/**
 * GET /auth/me — lightweight "who am I" endpoint for session restoration on page load.
 * Returns the authenticated user's profile if a valid cookie or Bearer token is present,
 * or 401 if the session has expired / no credentials are present.
 */
export const getMe = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No active session.', code: 'UNAUTHORIZED' });
  }
  const userState = formatUserState(req.user);
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
    user: userState.profile,
    state: userState,
  });
};

/**
 * POST /auth/logout — clears the auth cookie and invalidates the session.
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    let sessionId = authReq.sessionId;

    if (!sessionId) {
      const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string);
      const cookieToken = req.cookies?.aiims_token;
      const rawToken = authHeader || cookieToken || '';
      const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7).trim() : rawToken.trim();
      if (token) {
        try {
          const decoded = jwt.decode(token) as JwtPayload;
          if (decoded?.sessionId) {
            sessionId = decoded.sessionId;
          }
        } catch {}
      }
    }

    if (sessionId) {
      await sessionService.revokeSession(sessionId);
    }

    const user = authReq.user;
    if (user && user.deviceBinding) {
      user.deviceBinding.activeSessionId = null;
      user.deviceBinding.lastSeenAt = new Date();
      if (typeof user.save === 'function' && mongoose.connection.readyState === 1) {
        await user.save();
      }
    }
    const cleanEmail = (user?.email || authReq.userEmail || '').toLowerCase().trim();
    if (cleanEmail && registeredUsers[cleanEmail]?.deviceBinding) {
      registeredUsers[cleanEmail].deviceBinding.activeSessionId = null;
      registeredUsers[cleanEmail].deviceBinding.lastSeenAt = new Date();
    } else if (sessionId) {
      const sess = await sessionService.getSession(sessionId);
      if (sess?.userId) {
        if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(sess.userId)) {
          await User.findByIdAndUpdate(sess.userId, {
            $set: { 'deviceBinding.activeSessionId': null, 'deviceBinding.lastSeenAt': new Date() },
          });
        } else {
          for (const u of Object.values(registeredUsers)) {
            if ((u.id === sess.userId || u._id === sess.userId) && u.deviceBinding) {
              u.deviceBinding.activeSessionId = null;
              u.deviceBinding.lastSeenAt = new Date();
            }
          }
        }
      }
    }

    res.clearCookie('aiims_token', {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      path: '/',
    });
    res.clearCookie('aiims_csrf', {
      httpOnly: false,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return res.json({ success: true, message: 'Signed out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.clearCookie('aiims_token', {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      path: '/',
    });
    res.clearCookie('aiims_csrf', {
      httpOnly: false,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return res.json({ success: true, message: 'Signed out.' });
  }
};

/**
 * POST /admin/users/:userId/device-reset
 * Resets device binding for a user, revoking all active sessions and allowing them to bind a new device.
 * Strictly protected: requires role 'admin'.
 */
export const resetUserDevice = async (req: AuthenticatedRequest, res: Response) => {
  const adminUser = req.user;
  if (!adminUser || adminUser.role !== 'admin') {
    return res.status(403).json({
      error: 'Access denied: administrator privileges required to reset device binding.',
      code: 'ADMIN_REQUIRED',
    });
  }

  const targetUserId = req.params.userId || req.body.userId;
  if (!targetUserId || typeof targetUserId !== 'string') {
    return res.status(400).json({
      error: 'Target user ID is required.',
      code: 'USER_ID_REQUIRED',
    });
  }

  let targetUser: any = null;

  if (mongoose.connection.readyState === 1) {
    try {
      if (mongoose.Types.ObjectId.isValid(targetUserId)) {
        targetUser = await User.findById(targetUserId);
      }
      if (!targetUser) {
        targetUser = await User.findOne({ email: targetUserId.toLowerCase().trim() });
      }
    } catch {}
  }

  if (!targetUser) {
    for (const u of Object.values(registeredUsers)) {
      if (
        u.id === targetUserId ||
        u._id === targetUserId ||
        u.email?.toLowerCase() === targetUserId.toLowerCase()
      ) {
        targetUser = u;
        break;
      }
    }
  }

  if (!targetUser) {
    return res.status(404).json({
      error: 'User not found.',
      code: 'USER_NOT_FOUND',
    });
  }

  const prevHash = targetUser.deviceBinding?.deviceIdHash || '';
  const prevName = targetUser.deviceBinding?.deviceName || '';
  const reason = req.body.reason || 'Administrator device reset requested';

  const finalUserId = String(targetUser._id || targetUser.id);
  await sessionService.revokeAllUserSessions(finalUserId);

  const newBinding = {
    deviceIdHash: '',
    deviceName: '',
    platform: 'web' as const,
    boundAt: null,
    lastSeenAt: null,
    activeSessionId: null,
    bindingStatus: 'UNBOUND' as const,
    resetAt: new Date(),
    resetBy: String(adminUser._id || adminUser.id),
  };

  targetUser.deviceBinding = newBinding;

  if (typeof targetUser.save === 'function') {
    await targetUser.save();
  }

  if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(finalUserId)) {
    await User.findByIdAndUpdate(finalUserId, {
      $set: { deviceBinding: newBinding },
    });
  }

  await recordDeviceResetAudit({
    targetUserId: finalUserId,
    adminUserId: String(adminUser._id || adminUser.id),
    adminEmail: adminUser.email,
    previousDeviceIdHash: prevHash,
    previousDeviceName: prevName,
    reason,
  });

  return res.json({
    success: true,
    message: 'Device binding successfully reset. The user may now bind a new device.',
    userId: finalUserId,
  });
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  const { name, college, targetGoal } = req.body;

  if (req.user) {
    if (name) req.user.name = name;
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
  if (college) mockUser.college = college;
  if (targetGoal) mockUser.targetGoal = targetGoal;
  return res.json(mockUser);
};

/**
 * POST /auth/set-password
 * Allows users with temporary passwords or one-time invite tokens (e.g. invited evaluators)
 * to set their permanent password.
 */
export const setPassword = async (req: Request, res: Response) => {
  const { email, inviteToken, currentPassword, newPassword } = req.body;
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
  }

  const normalizedEmail = (email || '').toLowerCase().trim();
  if (!isSafeKey(normalizedEmail)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  let user: IUser | null = null;

  if (mongoose.connection.readyState === 1) {
    if (inviteToken) {
      if (typeof inviteToken !== 'string' || !inviteToken.trim()) {
        return res.status(400).json({ error: 'Invalid invite token.' });
      }
      const cleanToken = inviteToken.trim();
      user = await User.findOne({
        email: normalizedEmail,
        inviteToken: cleanToken,
        inviteTokenExpires: { $gt: new Date() },
      });
    } else if (currentPassword && typeof currentPassword === 'string') {
      user = await User.findOne({ email: normalizedEmail });
      if (user && !(await user.comparePassword(currentPassword))) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }
    }
  }

  // Fallback memory user with prototype pollution guards
  let memoryUser: any = null;
  if (!user && isSafeKey(normalizedEmail)) {
    memoryUser = getRegisteredUser(normalizedEmail);
    if (
      inviteToken &&
      typeof inviteToken === 'string' &&
      memoryUser?.inviteToken === inviteToken.trim()
    ) {
      // Valid memory invite token
    } else if (currentPassword && typeof currentPassword === 'string') {
      const match = memoryUser?.password?.startsWith('$2')
        ? await bcrypt.compare(currentPassword, memoryUser.password)
        : memoryUser?.password === currentPassword;
      if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });
    } else {
      memoryUser = null;
    }
  }

  if (!user && !memoryUser) {
    return res.status(400).json({ error: 'Invalid or expired set-password token / credentials.' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  if (user) {
    user.password = hashedPassword;
    user.mustChangePassword = false;
    user.inviteToken = undefined;
    user.inviteTokenExpires = undefined;
    await user.save();
  } else if (memoryUser) {
    const updatedUser = {
      ...memoryUser,
      password: hashedPassword,
      mustChangePassword: false,
      inviteToken: undefined,
      inviteTokenExpires: undefined,
    };
    saveRegisteredUser(normalizedEmail, updatedUser);
  }

  const token = generateAuthToken(
    String(user?._id || memoryUser?.id || memoryUser?._id),
    normalizedEmail
  );
  setAuthCookie(res, token, req);

  return res.json({
    success: true,
    message: 'Password updated successfully. You may now access your dashboard.',
    token: isMobileClient(req) ? token : undefined,
  });
};

// ── TOTP / 2FA Controllers ────────────────────────────────────────────────────

import {
  generateTotpSecret,
  generateOtpauthUri,
  generateQrCodeDataUrl,
  encryptSecret,
  decryptSecret,
  verifyTotpCode,
  generateBackupCodes,
  hashBackupCode,
  findMatchingBackupCodeIndex,
} from '../services/totp.service';

/** Max failed TOTP attempts before lockout */
const TOTP_MAX_ATTEMPTS = 5;
/** Lockout duration in ms (10 minutes) */
const TOTP_LOCKOUT_MS = 10 * 60 * 1000;

/**
 * POST /auth/totp/setup
 * Staff-only. Generates a TOTP secret, encrypts it, stores in pendingSetup state,
 * and returns a QR code data-URL plus the plain-text secret for manual entry.
 * The setup is NOT activated until the user verifies the first code via /auth/totp/verify-setup.
 */
export const totpSetup = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorised.', code: 'UNAUTHORIZED' });
  if (user.role === 'learner') {
    return res
      .status(403)
      .json({ error: '2FA is not available for learner accounts.', code: 'FORBIDDEN' });
  }
  if (user.totp?.enabled) {
    return res.status(400).json({ error: '2FA is already enabled on this account.' });
  }

  try {
    const secret = generateTotpSecret();
    const encryptedSecret = encryptSecret(secret);
    const otpauthUri = generateOtpauthUri(secret, user.email);
    const qrCodeDataUrl = await generateQrCodeDataUrl(otpauthUri);

    // Persist encrypted secret in pendingSetup state
    if (mongoose.connection.readyState === 1) {
      await User.findByIdAndUpdate(user._id, {
        $set: {
          'totp.encryptedSecret': encryptedSecret,
          'totp.pendingSetup': true,
          'totp.enabled': false,
        },
      });
    } else {
      user.totp = {
        encryptedSecret,
        pendingSetup: true,
        enabled: false,
        backupCodeHashes: [],
        failedAttempts: 0,
      };
    }

    return res.json({
      qrCode: qrCodeDataUrl,
      // Plain-text secret for manual authenticator entry
      manualEntryKey: secret,
      message:
        'Scan the QR code with your authenticator app, then call /auth/totp/verify-setup with the first code to activate 2FA.',
    });
  } catch (err) {
    console.error('[TOTP Setup Error]', err);
    return res.status(500).json({ error: 'Failed to initialise 2FA setup.' });
  }
};

/**
 * POST /auth/totp/verify-setup  { code: "123456" }
 * Staff-only. Verifies the first TOTP code, activates 2FA, and returns one-time backup codes.
 */
export const totpVerifySetup = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorised.', code: 'UNAUTHORIZED' });
  if (user.role === 'learner') {
    return res
      .status(403)
      .json({ error: '2FA is not available for learner accounts.', code: 'FORBIDDEN' });
  }

  const dbUser = mongoose.connection.readyState === 1 ? await User.findById(user._id) : user;

  if (!dbUser?.totp?.encryptedSecret || !dbUser.totp.pendingSetup) {
    return res
      .status(400)
      .json({ error: 'No pending 2FA setup found. Call /auth/totp/setup first.' });
  }

  const { code } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Authenticator code is required.' });
  }

  let plainSecret: string;
  try {
    plainSecret = decryptSecret(dbUser.totp.encryptedSecret);
  } catch {
    return res.status(500).json({ error: 'Failed to read 2FA setup data. Please restart setup.' });
  }

  if (!(await verifyTotpCode(code, plainSecret))) {
    return res.status(400).json({ error: 'Invalid authenticator code. Please try again.' });
  }

  // Generate and hash backup codes
  const plainCodes = generateBackupCodes();
  const hashes = plainCodes.map(hashBackupCode);

  if (mongoose.connection.readyState === 1) {
    await User.findByIdAndUpdate(user._id, {
      $set: {
        'totp.enabled': true,
        'totp.pendingSetup': false,
        'totp.backupCodeHashes': hashes,
        'totp.failedAttempts': 0,
        'totp.lockedUntil': null,
      },
    });
  } else {
    dbUser.totp.enabled = true;
    dbUser.totp.pendingSetup = false;
    dbUser.totp.backupCodeHashes = hashes;
    dbUser.totp.failedAttempts = 0;
  }

  return res.json({
    success: true,
    message: '2FA has been successfully activated.',
    // Return plain-text codes ONCE — they will not be shown again
    backupCodes: plainCodes,
  });
};

/**
 * POST /auth/totp/verify  { userId, code, isBackupCode? }
 * Second-step login verification for staff accounts. Called after password auth succeeds
 * and the server has returned `{ totpRequired: true, userId }`.
 */
export const totpVerifyLogin = async (req: Request, res: Response) => {
  const { userId, code } = req.body;
  if (!userId || typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: 'Valid userId is required.' });
  }
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Valid code is required.' });
  }

  const safeUserId = new mongoose.Types.ObjectId(userId);
  const trimmedCode = code.trim();

  let dbUser: IUser | null = null;
  if (mongoose.connection.readyState === 1) {
    dbUser = await User.findById(safeUserId);
  }

  if (!dbUser) {
    return res
      .status(401)
      .json({ error: 'Invalid session or user not found.', code: 'UNAUTHORIZED' });
  }

  if (!dbUser.totp?.enabled) {
    return res.status(400).json({ error: '2FA is not enabled for this account.' });
  }

  // ── Rate-limit / lockout check ────────────────────────────────────────────
  if (dbUser.totp.lockedUntil && dbUser.totp.lockedUntil > new Date()) {
    const waitSecs = Math.ceil((dbUser.totp.lockedUntil.getTime() - Date.now()) / 1000);
    return res.status(429).json({
      error: `Too many failed attempts. Account locked for ${waitSecs} more seconds.`,
      code: 'TOTP_LOCKED',
      retryAfterSeconds: waitSecs,
    });
  }

  let plainSecret: string;
  try {
    plainSecret = decryptSecret(dbUser.totp.encryptedSecret!);
  } catch {
    return res.status(500).json({ error: 'Internal error reading 2FA credentials.' });
  }

  let verified = false;
  let usedBackupCode = false;

  // Cryptographic verification: check backup codes array or TOTP code
  const backupHashes = Array.isArray(dbUser.totp.backupCodeHashes)
    ? dbUser.totp.backupCodeHashes
    : [];
  const backupIdx =
    backupHashes.length > 0 ? findMatchingBackupCodeIndex(trimmedCode, backupHashes) : -1;

  if (backupIdx !== -1) {
    // Consume the backup code (remove it from the array)
    backupHashes.splice(backupIdx, 1);
    dbUser.totp.backupCodeHashes = backupHashes;
    verified = true;
    usedBackupCode = true;
  } else if (plainSecret) {
    verified = await verifyTotpCode(trimmedCode, plainSecret);
  }

  if (!verified) {
    const newFailCount = (dbUser.totp.failedAttempts || 0) + 1;
    const lockout =
      newFailCount >= TOTP_MAX_ATTEMPTS ? new Date(Date.now() + TOTP_LOCKOUT_MS) : undefined;

    await User.findByIdAndUpdate(safeUserId, {
      $set: {
        'totp.failedAttempts': newFailCount,
        ...(lockout ? { 'totp.lockedUntil': lockout } : {}),
      },
    });

    if (lockout) {
      return res.status(429).json({
        error: `Too many failed attempts. Account locked for ${TOTP_LOCKOUT_MS / 60000} minutes.`,
        code: 'TOTP_LOCKED',
        retryAfterSeconds: TOTP_LOCKOUT_MS / 1000,
      });
    }
    return res.status(401).json({
      error: 'Invalid 2FA code.',
      attemptsRemaining: TOTP_MAX_ATTEMPTS - newFailCount,
    });
  }

  // Reset rate-limit counters and persist backup code consumption
  await User.findByIdAndUpdate(safeUserId, {
    $set: {
      'totp.failedAttempts': 0,
      'totp.lockedUntil': null,
      ...(usedBackupCode ? { 'totp.backupCodeHashes': dbUser.totp.backupCodeHashes } : {}),
    },
  });

  // Strict One Account – One Device Binding & Verification on 2FA completion
  const deviceResult = await verifyAndBindDevice(dbUser, req, res);
  if (!deviceResult.success) {
    return;
  }

  // Issue the real JWT now that both factors are verified
  const token = generateAuthToken(
    String(dbUser._id),
    dbUser.email,
    dbUser.role,
    deviceResult.sessionId,
    deviceResult.deviceIdHash
  );
  const mobile = isMobileClient(req);
  setAuthCookie(res, token, req);
  const userState = formatUserState(dbUser);

  return res.json({
    ...(mobile ? { token } : {}),
    user: userState.profile,
    state: userState,
    ...(usedBackupCode
      ? {
          warning: `Backup code used. ${dbUser.totp.backupCodeHashes.length} backup code(s) remaining.`,
        }
      : {}),
  });
};

/**
 * Irreversibly deletes user account, purging personal data, profile, and submissions content,
 * anonymizing ledger entries (preserving non-personal transaction records for balance reconciliation),
 * and logging the deletion in the audit log without any personal data.
 */
export const deleteAccount = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      error: 'Invalid or expired session. Please sign in again.',
      code: 'UNAUTHORIZED',
    });
  }

  const { confirmation } = req.body || {};
  if (confirmation !== 'DELETE') {
    return res.status(400).json({
      error: 'Confirmation failed. You must type the word DELETE to confirm account deletion.',
      code: 'CONFIRMATION_REQUIRED',
    });
  }

  const userId = String(user._id || user.id);
  const userEmail = (user.email || req.userEmail || '').toLowerCase().trim();
  const userRole = user.role || 'learner';

  try {
    // 1. Irreversibly anonymise CreditLedger entries
    await creditsLedgerService.anonymizeUserLedger(userId);

    // 2. Database cleanup if MongoDB is connected
    if (mongoose.connection.readyState === 1) {
      // 2a. Delete student academic profile
      await StudentProfile.deleteMany({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(userId)
            ? [{ userId: new mongoose.Types.ObjectId(userId) }]
            : []),
          { userId: userId as any },
        ],
      });

      // 2b. Delete submissions content
      await Submission.deleteMany({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(userId)
            ? [{ learner: new mongoose.Types.ObjectId(userId) }]
            : []),
          { learner: userId as any },
          ...(userEmail ? [{ learnerEmail: userEmail }] : []),
        ],
      });

      // 2c. Delete User document permanently
      if (mongoose.Types.ObjectId.isValid(userId)) {
        await User.findByIdAndDelete(userId);
      }
      if (userEmail) {
        await User.deleteMany({ email: userEmail });
      }
    }

    // 3. Clean up offline / in-memory stores
    if (userEmail && registeredUsers[userEmail]) {
      delete registeredUsers[userEmail];
    }
    for (let i = memorySubmissions.length - 1; i >= 0; i--) {
      const s = memorySubmissions[i];
      if (String(s.learner) === userId || (userEmail && s.learnerEmail === userEmail)) {
        memorySubmissions.splice(i, 1);
      }
    }

    // 4. Log deletion in AuditLog WITHOUT ANY PERSONAL DATA
    await writeAuditLog({
      actor: 'ANONYMIZED_USER',
      actorRole: userRole,
      action: 'ACCOUNT_DELETION',
      target: 'SELF',
      targetType: 'User',
      details: {
        status: 'COMPLETED',
        retentionNote:
          'Personal data permanently purged; financial credit ledger anonymised for compliance.',
      },
    });

    // 5. Invalidate tokens and clear auth and csrf cookies
    res.clearCookie('aiims_token', {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      path: '/',
    });
    res.clearCookie('aiims_csrf', {
      httpOnly: false,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return res.status(200).json({
      success: true,
      message: 'Your account and all associated personal data have been permanently deleted.',
    });
  } catch (error: any) {
    console.error('Account deletion failed:', error);
    return res.status(500).json({
      error: 'Failed to process account deletion. Please contact support.',
      code: 'SERVER_ERROR',
    });
  }
};

/**
 * Public configuration endpoint for clients (support email, etc.)
 */
export const getPublicConfig = (_req: Request, res: Response) => {
  return res.json({
    supportEmail: config.supportEmail,
  });
};
