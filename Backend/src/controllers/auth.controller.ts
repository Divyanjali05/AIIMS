import { Request, Response } from 'express';
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
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { formatUserState, STARTING_CREDITS } from '../config/credits.config';
import { creditsLedgerService } from '../services/creditsLedger.service';
import { PROGRAMS, validateAcademicCombination } from '../config/academicTaxonomy';

import { generateCsrfToken } from '../middleware/csrf.middleware';

/** 7-day cookie / token lifetime */
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generates a cryptographically signed JWT token with a 7-day expiration
 */
export const generateAuthToken = (userId: string, email: string): string => {
  return jwt.sign({ userId, email: email.toLowerCase().trim() }, config.jwtSecret, {
    expiresIn: '7d',
  });
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
          const token = generateAuthToken(String(dbUser._id), dbUser.email);
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
      : user.password === password;

  if (!isMatch) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }

  const token = generateAuthToken(user.id || `usr-${normalizedEmail}`, user.email);
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
      role: 'learner',
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
      role: 'learner',
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
        amount: STARTING_CREDITS,
        reason: `Welcome Learning Grant (+${STARTING_CREDITS} AC)`,
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
    setAuthCookie(res, token, req);
    const userState = formatUserState(finalDbUser);

    return res.status(201).json({
      ...(isMobileClient(req) ? { token } : {}),
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
export const logout = (_req: Request, res: Response) => {
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

  // Issue the real JWT now that both factors are verified
  const token = generateAuthToken(String(dbUser._id), dbUser.email);
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
