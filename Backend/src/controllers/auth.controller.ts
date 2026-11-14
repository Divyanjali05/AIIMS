import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { prisma, isDatabaseConnected, isPrismaErrorCode } from '../config/prisma';
import { IUser } from '../types/models';
import { AuthenticatedRequest, JwtPayload } from '../middleware/auth.middleware';
import { extractDeviceInfo } from '../utils/deviceIdentifier';
import { sessionService, recordDeviceResetAudit } from '../services/session.service';
import { writeAuditLog } from '../services/auditLog.service';
import { formatUserState, STARTING_CREDITS } from '../config/credits.config';
import { creditsLedgerService } from '../services/creditsLedger.service';
import {
  PROGRAMS,
  SPECIALIZATIONS,
  validateAcademicCombination,
  getProgramDuration,
  VENTURE_STAGES,
} from '../config/academicTaxonomy';
import { isCommonPassword } from '../utils/passwordSecurity';
import { generateCsrfToken } from '../middleware/csrf.middleware';
import {
  hashPassword,
  verifyPassword,
  userRecordToIUser,
  defaultAssessment,
  defaultAnalysis,
  defaultClarity,
  defaultFocus,
  defaultRadar,
  defaultInvestigation,
  defaultSolver,
  defaultBuild,
  defaultNotifications,
  defaultAiWallet,
  toJsonInput,
} from '../utils/userMapper';
import { isSafeKey, isValidId } from '../utils/id';
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

/**
 * Strict One Account – One Device validation & session creation helper.
 */
async function verifyAndBindDevice(
  user: IUser,
  req: Request,
  res: Response
): Promise<{ success: boolean; sessionId?: string; deviceIdHash?: string }> {
  const devInfo = extractDeviceInfo(req);
  const userId = String(user.id || user._id);
  const binding = user.deviceBinding;

  const isBound = Boolean(
    binding &&
    binding.bindingStatus === 'BOUND' &&
    binding.deviceIdHash &&
    binding.deviceIdHash.trim().length > 0
  );

  if (isBound && binding) {
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
          error:
            'This account is already active on another device. Please log out from that device to continue.',
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

      const now = new Date();
      binding.activeSessionId = newSessionId;
      binding.lastSeenAt = now;
      binding.deviceName = devInfo.deviceName;
      binding.platform = devInfo.platform;

      if (isValidId(userId)) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            activeSessionId: newSessionId,
            deviceLastSeenAt: now,
            deviceName: devInfo.deviceName,
            devicePlatform: devInfo.platform,
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

    const now = new Date();
    const newBinding = {
      deviceIdHash: devInfo.deviceIdHash,
      deviceName: devInfo.deviceName,
      platform: devInfo.platform,
      boundAt: now,
      lastSeenAt: now,
      activeSessionId: newSessionId,
      bindingStatus: 'BOUND' as const,
      resetAt: null,
      resetBy: null,
    };

    user.deviceBinding = newBinding;

    if (isValidId(userId)) {
      const bound = await prisma.user.updateMany({
        where: { id: userId, bindingStatus: { not: 'BOUND' } },
        data: {
          deviceIdHash: devInfo.deviceIdHash,
          deviceName: devInfo.deviceName,
          devicePlatform: devInfo.platform,
          deviceBoundAt: now,
          deviceLastSeenAt: now,
          activeSessionId: newSessionId,
          bindingStatus: 'BOUND',
          deviceResetAt: null,
          deviceResetBy: null,
        },
      });

      if (bound.count === 0) {
        res.status(403).json({
          error:
            'This account is already active on another device. Please log out from that device to continue.',
          code: 'ACCOUNT_ACTIVE_ANOTHER_DEVICE',
        });
        return { success: false };
      }
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
  if (!isSafeKey(normalizedEmail)) {
    return res.status(400).json({ error: 'Email or password is incorrect.' });
  }

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const mobile = isMobileClient(req);

  try {
    const row = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!row) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    const { match } = await verifyPassword(row.password, password);
    if (!match) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    if (row.isActive === false) {
      return res.status(403).json({
        error: 'Account has been disabled. Please contact support.',
        code: 'ACCOUNT_DISABLED',
      });
    }

    const dbUser = userRecordToIUser(row);

    // Staff accounts with 2FA enabled must complete the second factor
    if ((dbUser.role === 'evaluator' || dbUser.role === 'admin') && dbUser.totp?.enabled) {
      return res.status(200).json({
        totpRequired: true,
        userId: String(dbUser.id),
        role: dbUser.role,
      });
    }

    const deviceResult = await verifyAndBindDevice(dbUser, req, res);
    if (!deviceResult.success) {
      return;
    }

    const token = generateAuthToken(
      String(dbUser.id),
      dbUser.email,
      dbUser.role,
      deviceResult.sessionId,
      deviceResult.deviceIdHash
    );
    setAuthCookie(res, token, req);
    const userState = formatUserState(dbUser);
    let academicProfile: any = undefined;
    let entrepreneurProfile: any = undefined;
    try {
      const uid = String(dbUser.id);
      if (dbUser.track === 'Entrepreneur') {
        const ep = await prisma.entrepreneurProfile.findUnique({ where: { userId: uid } });
        if (ep) entrepreneurProfile = ep;
      } else {
        const sp = await prisma.studentProfile.findUnique({ where: { userId: uid } });
        if (sp) academicProfile = sp;
      }
    } catch {}

    return res.json({
      ...(mobile ? { token } : {}),
      user: { ...userState.profile, track: dbUser.track },
      state: {
        ...userState,
        ...(academicProfile ? { academicProfile } : {}),
        ...(entrepreneurProfile ? { entrepreneurProfile } : {}),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Sign in failed due to a database error.', details: msg });
  }
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
    // Entrepreneur-specific onboarding fields
    ventureName,
    industry,
    problemStatement,
    ventureStage,
    skillsToDevelop,
    businessChallenges,
    preferredSupport,
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
  if (isCommonPassword(password)) {
    return res.status(400).json({
      error: 'This password is too common or easily guessed. Please choose a more secure password.',
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

  const currentCalendarYear = new Date().getFullYear();

  // Track-specific validation & cross-track pollution checks
  if (normalizedTrack === 'Student') {
    // Cross-track rejection: reject entrepreneur-only fields
    if (ventureStage || problemStatement) {
      return res.status(400).json({
        error: 'Entrepreneur venture fields are not permitted on the Student track.',
        code: 'INVALID_INPUT',
        field: 'ventureStage',
      });
    }

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

    const duration = getProgramDuration(programId);
    if (!yearOfStudy || Number(yearOfStudy) < 1 || Number(yearOfStudy) > duration) {
      return res.status(400).json({
        error: `Please enter a valid year of study (1–${duration}) for this program.`,
        code: 'INVALID_INPUT',
        field: 'yearOfStudy',
      });
    }
    if (
      !admissionYear ||
      Number(admissionYear) < 1990 ||
      Number(admissionYear) > currentCalendarYear + 1
    ) {
      return res.status(400).json({
        error: `Please enter a valid admission year (up to ${currentCalendarYear + 1}).`,
        code: 'INVALID_INPUT',
        field: 'admissionYear',
      });
    }
    if (!expectedGraduationYear || Number(expectedGraduationYear) <= Number(admissionYear)) {
      return res.status(400).json({
        error: 'Expected graduation year must be after admission year.',
        code: 'INVALID_INPUT',
        field: 'expectedGraduationYear',
      });
    }

    // Taxonomy consistency check for Student track
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
  } else if (normalizedTrack === 'Entrepreneur') {
    // Cross-track rejection: reject student-only academic fields
    if (stream || educationLevel || programId || specializationId || yearOfStudy) {
      return res.status(400).json({
        error: 'Student academic fields are not permitted on the Entrepreneur track.',
        code: 'INVALID_INPUT',
        field: 'stream',
      });
    }

    if (ventureStage && !VENTURE_STAGES.some((s) => s.value === ventureStage)) {
      return res.status(400).json({
        error: 'Invalid venture stage selected.',
        code: 'INVALID_INPUT',
        field: 'ventureStage',
      });
    }

    if (
      admissionYear &&
      expectedGraduationYear &&
      Number(expectedGraduationYear) <= Number(admissionYear)
    ) {
      return res.status(400).json({
        error: 'Expected graduation year must be after admission year.',
        code: 'INVALID_INPUT',
        field: 'expectedGraduationYear',
      });
    }
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!isSafeKey(normalizedEmail)) {
    return res.status(400).json({
      error: 'Enter a valid email address.',
      code: 'INVALID_INPUT',
      field: 'email',
    });
  }

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
      requestId,
    });
  }

  const displayName = name.trim();
  const resolvedInstituteName =
    (typeof instituteName === 'string' && instituteName.trim()) ||
    (typeof (req.body as any)?.collegeName === 'string' && (req.body as any).collegeName.trim()) ||
    (typeof (req.body as any)?.college === 'string' && (req.body as any).college.trim()) ||
    '';
  const programInfo = programId ? PROGRAMS.find((p) => p.id === programId) : undefined;
  const specInfo = specializationId
    ? SPECIALIZATIONS.find((s) => s.id === specializationId)
    : undefined;

  // Student profile field resolution
  const finalStream = stream || 'TECH';
  const finalStreamSubCategory =
    streamSubCategory || (finalStream === 'TECH' ? 'CS_IT' : 'COMMERCE_FINANCE');
  const finalEducationLevel = educationLevel || 'UNDERGRADUATE';
  const finalProgramId = programId || 'btech';
  const finalProgramName = programName || programInfo?.label || 'B.Tech / Engineering';
  const finalSpecializationId = specializationId || 'cs';
  const finalSpecializationName = specializationName || specInfo?.label || 'Computer Science';
  const finalYearOfStudy = yearOfStudy ? Number(yearOfStudy) : 1;
  const finalAdmissionYear = admissionYear ? Number(admissionYear) : currentCalendarYear;
  const finalGraduationYear = expectedGraduationYear
    ? Number(expectedGraduationYear)
    : finalAdmissionYear + (programId ? getProgramDuration(programId) : 4);

  try {
    const hashedPassword = await hashPassword(password);

    // Atomic PostgreSQL transaction
    const txResult = await prisma.$transaction(async (tx) => {
      // 1. Email uniqueness check inside transaction
      const existingUser = await tx.user.findUnique({ where: { email: normalizedEmail } });
      if (existingUser) {
        const err = new Error('An account with this email already exists. Please sign in.');
        (err as any).code = 'EMAIL_ALREADY_EXISTS';
        (err as any).field = 'email';
        throw err;
      }

      // 2. Verify optional instituteId against Institute table cleanly
      let cleanInstituteId: string | null = null;
      if (
        normalizedTrack === 'Student' &&
        instituteId &&
        typeof instituteId === 'string' &&
        instituteId.trim().length > 0
      ) {
        const trimmedInst = instituteId.trim();
        if (isValidId(trimmedInst) && trimmedInst !== 'inst-099') {
          const inst = await tx.institute.findUnique({ where: { id: trimmedInst } });
          if (inst) {
            cleanInstituteId = inst.id;
          }
        }
      }

      // 3. Create User record
      const defaultAudience = normalizedTrack === 'Entrepreneur' ? 'entrepreneur' : 'student';
      const createdUser = await tx.user.create({
        data: {
          name: displayName,
          email: normalizedEmail,
          password: hashedPassword,
          role: 'learner',
          track: normalizedTrack,
          college:
            normalizedTrack === 'Entrepreneur'
              ? ventureName && ventureName.trim().length > 0
                ? ventureName.trim()
                : 'Independent Founder'
              : resolvedInstituteName.length > 0
                ? resolvedInstituteName
                : cleanInstituteId
                  ? 'Verified Partner Institute'
                  : 'Independent Learner',
          targetGoal:
            primaryGoal ||
            (normalizedTrack === 'Entrepreneur'
              ? 'Build & Scale AI Ventures'
              : 'Explore AI Architectures & Intelligence'),
          stage: 'Knowing',
          xpPoints: 100,
          aiimsCredits: STARTING_CREDITS,
          assessmentStatus: 'not_started',
          assessmentData: toJsonInput(defaultAssessment()),
          analysisData: toJsonInput(defaultAnalysis()),
          clarityData: toJsonInput(defaultClarity()),
          focusData: toJsonInput(defaultFocus()),
          radarData: toJsonInput(defaultRadar()),
          investigationData: toJsonInput(defaultInvestigation()),
          solverData: toJsonInput(defaultSolver()),
          buildData: toJsonInput(defaultBuild()),
          relevanceData: toJsonInput({ status: 'locked' }),
          mentorData: toJsonInput({ status: 'locked' }),
          transactionsData: toJsonInput([]),
          notificationsData: toJsonInput(defaultNotifications()),
          aiWalletData: toJsonInput({
            ...defaultAiWallet(),
            audienceMode: defaultAudience,
          }),
        },
      });

      // 4. Record welcome bonus authoritatively in CreditLedger
      await tx.creditLedger.create({
        data: {
          userId: createdUser.id,
          type: 'EARN',
          category: 'REWARD',
          amount: STARTING_CREDITS,
          balanceBefore: 0,
          balanceAfter: STARTING_CREDITS,
          reason: `Welcome Learning Grant (+${STARTING_CREDITS} AC)`,
          source: 'SYSTEM',
          sourceId: 'WELCOME_BONUS',
          idempotencyKey: `welcome::${createdUser.id}`,
          status: 'COMPLETED',
        },
      });

      let studentProfileDoc: any = null;
      let cohortDoc: { id: string; displayName: string } | null = null;
      let entrepreneurProfileDoc: any = null;

      if (normalizedTrack === 'Student') {
        // 5a. Cohort tracking / upsert
        try {
          const cohortShortCode = `${finalProgramId.toUpperCase()}-${finalSpecializationId.toUpperCase()}-${finalAdmissionYear}-${finalGraduationYear}`;
          const cohortDisplayName = `${finalProgramName} · ${finalSpecializationName} · ${finalAdmissionYear}–${finalGraduationYear}`;

          const existingCohort = await tx.cohort.findFirst({
            where: {
              instituteId: cleanInstituteId,
              stream: finalStream,
              educationLevel: finalEducationLevel,
              programId: finalProgramId,
              specializationId: finalSpecializationId,
              admissionYear: finalAdmissionYear,
              graduationYear: finalGraduationYear,
            },
          });

          if (existingCohort) {
            cohortDoc = await tx.cohort.update({
              where: { id: existingCohort.id },
              data: { studentCount: { increment: 1 } },
            });
          } else {
            cohortDoc = await tx.cohort.create({
              data: {
                instituteId: cleanInstituteId,
                instituteName: resolvedInstituteName || 'Unknown',
                stream: finalStream,
                educationLevel: finalEducationLevel,
                programId: finalProgramId,
                programName: finalProgramName,
                specializationId: finalSpecializationId,
                specializationName: finalSpecializationName,
                admissionYear: finalAdmissionYear,
                graduationYear: finalGraduationYear,
                displayName: cohortDisplayName,
                shortCode: cohortShortCode,
                assessmentVersion: 'v1.0',
                studentCount: 1,
              },
            });
          }
        } catch (cohortErr) {
          console.warn(`[Auth] [${requestId}] Cohort upsert warning:`, cohortErr);
        }

        // 6a. Create StudentProfile
        studentProfileDoc = await tx.studentProfile.create({
          data: {
            userId: createdUser.id,
            fullName: displayName,
            track: 'Student',
            instituteId: cleanInstituteId,
            instituteName: resolvedInstituteName || null,
            stream: finalStream,
            streamSubCategory: finalStreamSubCategory,
            educationLevel: finalEducationLevel,
            programId: finalProgramId,
            programName: finalProgramName,
            specializationId: finalSpecializationId,
            specializationName: finalSpecializationName,
            yearOfStudy: finalYearOfStudy,
            admissionYear: finalAdmissionYear,
            expectedGraduationYear: finalGraduationYear,
            cohortId: cohortDoc ? cohortDoc.id : null,
            aiFamiliarity: aiFamiliarity || null,
            aiUsageContexts: Array.isArray(aiUsageContexts) ? aiUsageContexts : [],
            primaryGoal: primaryGoal || null,
            isComplete: true,
          },
        });
      } else {
        // 6b. Create EntrepreneurProfile
        entrepreneurProfileDoc = await tx.entrepreneurProfile.create({
          data: {
            userId: createdUser.id,
            fullName: displayName,
            ventureName:
              ventureName && ventureName.trim().length > 0
                ? ventureName.trim()
                : 'Ideation / Not started',
            industry: industry || 'Other / Interdisciplinary',
            problemStatement: problemStatement || null,
            ventureStage: ventureStage || 'exploring_idea',
            primaryGoal: primaryGoal || 'BUILD_AI_PRODUCT',
            skillsToDevelop: Array.isArray(skillsToDevelop) ? skillsToDevelop : [],
            businessChallenges: Array.isArray(businessChallenges) ? businessChallenges : [],
            preferredSupport: Array.isArray(preferredSupport) ? preferredSupport : [],
            isComplete: true,
          },
        });
      }

      return {
        createdUser,
        studentProfile: studentProfileDoc,
        cohortDoc,
        entrepreneurProfile: entrepreneurProfileDoc,
      };
    });

    const finalDbUser = userRecordToIUser(txResult.createdUser);
    finalDbUser.aiimsCredits = STARTING_CREDITS;

    const token = generateAuthToken(String(finalDbUser.id), finalDbUser.email);
    setAuthCookie(res, token, req);
    const userState = formatUserState(finalDbUser);

    if (normalizedTrack === 'Student' && txResult.studentProfile) {
      return res.status(201).json({
        ...(isMobileClient(req) ? { token } : {}),
        user: { ...userState.profile, track: 'Student' },
        state: {
          ...userState,
          academicProfile: {
            id: String(txResult.studentProfile.id),
            track: 'Student',
            stream: txResult.studentProfile.stream,
            streamSubCategory: txResult.studentProfile.streamSubCategory,
            educationLevel: txResult.studentProfile.educationLevel,
            programId: txResult.studentProfile.programId,
            programName: txResult.studentProfile.programName,
            specializationId: txResult.studentProfile.specializationId,
            specializationName: txResult.studentProfile.specializationName,
            yearOfStudy: txResult.studentProfile.yearOfStudy,
            admissionYear: txResult.studentProfile.admissionYear,
            expectedGraduationYear: txResult.studentProfile.expectedGraduationYear,
            instituteName: txResult.studentProfile.instituteName,
            cohortId: txResult.cohortDoc ? String(txResult.cohortDoc.id) : undefined,
            cohortDisplayName: txResult.cohortDoc?.displayName,
            aiFamiliarity: txResult.studentProfile.aiFamiliarity,
            aiUsageContexts: txResult.studentProfile.aiUsageContexts,
            primaryGoal: txResult.studentProfile.primaryGoal,
            isComplete: true,
          },
        },
      });
    } else {
      return res.status(201).json({
        ...(isMobileClient(req) ? { token } : {}),
        user: { ...userState.profile, track: 'Entrepreneur' },
        state: {
          ...userState,
          aiWallet: {
            ...userState.aiWallet,
            audienceMode: 'entrepreneur',
          },
          entrepreneurProfile: {
            id: String(txResult.entrepreneurProfile.id),
            fullName: txResult.entrepreneurProfile.fullName,
            ventureName: txResult.entrepreneurProfile.ventureName,
            industry: txResult.entrepreneurProfile.industry,
            problemStatement: txResult.entrepreneurProfile.problemStatement,
            ventureStage: txResult.entrepreneurProfile.ventureStage,
            primaryGoal: txResult.entrepreneurProfile.primaryGoal,
            skillsToDevelop: txResult.entrepreneurProfile.skillsToDevelop,
            businessChallenges: txResult.entrepreneurProfile.businessChallenges,
            preferredSupport: txResult.entrepreneurProfile.preferredSupport,
            isComplete: true,
          },
        },
      });
    }
  } catch (err: any) {
    console.error(`[Auth] [${requestId}] Registration error:`, err);
    if (err?.code === 'EMAIL_ALREADY_EXISTS' || isPrismaErrorCode(err, 'P2002')) {
      return res.status(400).json({
        error: 'An account with this email already exists. Please sign in.',
        code: 'EMAIL_ALREADY_EXISTS',
        field: 'email',
      });
    }
    return res.status(500).json({
      error: 'Database operation failed during user registration.',
      code: 'DATABASE_FAILURE',
      details: err?.message,
    });
  }
};

export const getProfile = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No active session.', code: 'UNAUTHORIZED' });
  }
  return res.json({
    id: String(req.user.id || req.user._id),
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    track: req.user.track,
    college: req.user.college || 'Engineering & Technology College',
    targetGoal: req.user.targetGoal,
    stage: req.user.stage,
    xpPoints: req.user.xpPoints,
    aiimsCredits: req.user.aiimsCredits,
    deviceBinding: req.user.deviceBinding,
  });
};

/**
 * GET /auth/me — lightweight "who am I" endpoint for session restoration on page load.
 */
export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No active session.', code: 'UNAUTHORIZED' });
  }
  const userState = formatUserState(req.user);
  const userId = String(req.user.id || req.user._id);

  let academicProfile: any = undefined;
  let entrepreneurProfile: any = undefined;

  try {
    if (req.user.track === 'Entrepreneur') {
      const ep = await prisma.entrepreneurProfile.findUnique({ where: { userId } });
      if (ep) entrepreneurProfile = ep;
    } else {
      const sp = await prisma.studentProfile.findUnique({ where: { userId } });
      if (sp) academicProfile = sp;
    }
  } catch {}

  return res.json({
    id: userId,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    track: req.user.track,
    college: req.user.college || 'Engineering & Technology College',
    targetGoal: req.user.targetGoal,
    stage: req.user.stage,
    xpPoints: req.user.xpPoints,
    aiimsCredits: req.user.aiimsCredits,
    user: { ...userState.profile, track: req.user.track },
    state: {
      ...userState,
      ...(academicProfile ? { academicProfile } : {}),
      ...(entrepreneurProfile ? { entrepreneurProfile } : {}),
    },
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
    }

    if (isDatabaseConnected()) {
      const targetId = user ? String(user.id || user._id) : null;
      if (targetId && isValidId(targetId)) {
        await prisma.user
          .updateMany({
            where: { id: targetId },
            data: { activeSessionId: null, deviceLastSeenAt: new Date() },
          })
          .catch(() => {});
      } else if (sessionId) {
        const sess = await sessionService.getSession(sessionId);
        if (sess?.userId && isValidId(sess.userId)) {
          await prisma.user
            .updateMany({
              where: { id: sess.userId },
              data: { activeSessionId: null, deviceLastSeenAt: new Date() },
            })
            .catch(() => {});
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

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  let targetRow = null;
  if (isValidId(targetUserId)) {
    targetRow = await prisma.user.findUnique({ where: { id: targetUserId.trim() } });
  }
  if (!targetRow && isSafeKey(targetUserId.toLowerCase().trim())) {
    targetRow = await prisma.user.findUnique({
      where: { email: targetUserId.toLowerCase().trim() },
    });
  }

  if (!targetRow) {
    return res.status(404).json({
      error: 'User not found.',
      code: 'USER_NOT_FOUND',
    });
  }

  const prevHash = targetRow.deviceIdHash || '';
  const prevName = targetRow.deviceName || '';
  const reason = req.body.reason || 'Administrator device reset requested';
  const finalUserId = String(targetRow.id);

  await sessionService.revokeAllUserSessions(finalUserId);

  const now = new Date();
  await prisma.user.update({
    where: { id: finalUserId },
    data: {
      deviceIdHash: '',
      deviceName: '',
      devicePlatform: 'web',
      deviceBoundAt: null,
      deviceLastSeenAt: null,
      activeSessionId: null,
      bindingStatus: 'UNBOUND',
      deviceResetAt: now,
      deviceResetBy: String(adminUser.id || adminUser._id),
    },
  });

  await recordDeviceResetAudit({
    targetUserId: finalUserId,
    adminUserId: String(adminUser.id || adminUser._id),
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
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHORIZED' });
  }
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const { name, college, targetGoal } = req.body;
  const userId = String(req.user.id || req.user._id);

  const updatedRow = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name ? { name } : {}),
      ...(college ? { college } : {}),
      ...(targetGoal ? { targetGoal } : {}),
    },
  });
  const mapped = userRecordToIUser(updatedRow);
  req.user = mapped;

  return res.json({
    id: String(mapped.id),
    name: mapped.name,
    email: mapped.email,
    role: mapped.role,
    college: mapped.college,
    targetGoal: mapped.targetGoal,
    stage: mapped.stage,
    xpPoints: mapped.xpPoints,
    aiimsCredits: mapped.aiimsCredits,
  });
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
  if (isCommonPassword(newPassword)) {
    return res.status(400).json({ error: 'This password is too common or easily guessed. Please choose a more secure password.' });
  }

  const normalizedEmail = (typeof email === 'string' ? email : '').toLowerCase().trim();
  if (!normalizedEmail || !isSafeKey(normalizedEmail) || !normalizedEmail.includes('@')) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  if (inviteToken !== undefined && (typeof inviteToken !== 'string' || !inviteToken.trim())) {
    return res.status(400).json({ error: 'Invalid invite token.' });
  }

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  let userRow = null;

  if (typeof inviteToken === 'string' && inviteToken.trim()) {
    const cleanToken = inviteToken.trim();
    userRow = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        inviteToken: cleanToken,
        inviteTokenExpires: { gt: new Date() },
      },
    });
  } else if (currentPassword && typeof currentPassword === 'string') {
    const candidate = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (candidate) {
      const { match } = await verifyPassword(candidate.password, currentPassword);
      if (!match) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }
      userRow = candidate;
    }
  }

  if (!userRow) {
    return res.status(400).json({ error: 'Invalid or expired set-password token / credentials.' });
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userRow.id },
    data: {
      password: hashedPassword,
      mustChangePassword: false,
      inviteToken: null,
      inviteTokenExpires: null,
    },
  });

  const token = generateAuthToken(String(userRow.id), normalizedEmail, userRow.role);
  setAuthCookie(res, token, req);

  return res.json({
    success: true,
    message: 'Password updated successfully. You may now access your dashboard.',
    token: isMobileClient(req) ? token : undefined,
  });
};

// ── TOTP / 2FA Controllers ────────────────────────────────────────────────────

/** Max failed TOTP attempts before lockout */
const TOTP_MAX_ATTEMPTS = 5;
/** Lockout duration in ms (10 minutes) */
const TOTP_LOCKOUT_MS = 10 * 60 * 1000;

/**
 * POST /auth/totp/setup
 * Staff-only. Generates a TOTP secret, encrypts it, stores in pendingSetup state.
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
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  try {
    const secret = generateTotpSecret();
    const encryptedSecret = encryptSecret(secret);
    const otpauthUri = generateOtpauthUri(secret, user.email);
    const qrCodeDataUrl = await generateQrCodeDataUrl(otpauthUri);

    await prisma.user.update({
      where: { id: String(user.id || user._id) },
      data: {
        totpEncryptedSecret: encryptedSecret,
        totpPendingSetup: true,
        totpEnabled: false,
      },
    });

    return res.json({
      qrCode: qrCodeDataUrl,
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
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const userId = String(user.id || user._id);
  const dbRow = await prisma.user.findUnique({ where: { id: userId } });

  if (!dbRow?.totpEncryptedSecret || !dbRow.totpPendingSetup) {
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
    plainSecret = decryptSecret(dbRow.totpEncryptedSecret);
  } catch {
    return res.status(500).json({ error: 'Failed to read 2FA setup data. Please restart setup.' });
  }

  if (!(await verifyTotpCode(code, plainSecret))) {
    return res.status(400).json({ error: 'Invalid authenticator code. Please try again.' });
  }

  const plainCodes = generateBackupCodes();
  const hashes = plainCodes.map(hashBackupCode);

  await prisma.user.update({
    where: { id: userId },
    data: {
      totpEnabled: true,
      totpPendingSetup: false,
      totpBackupCodeHashes: hashes,
      totpFailedAttempts: 0,
      totpLockedUntil: null,
    },
  });

  return res.json({
    success: true,
    message: '2FA has been successfully activated.',
    backupCodes: plainCodes,
  });
};

/**
 * POST /auth/totp/verify  { userId, code }
 * Second-step login verification for staff accounts.
 */
export const totpVerifyLogin = async (req: Request, res: Response) => {
  const { userId, code } = req.body;
  if (!userId || typeof userId !== 'string' || !isValidId(userId)) {
    return res.status(400).json({ error: 'Valid userId is required.' });
  }
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Valid code is required.' });
  }
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const safeUserId = userId.trim();
  const trimmedCode = code.trim();

  const dbRow = await prisma.user.findUnique({ where: { id: safeUserId } });
  if (!dbRow) {
    return res
      .status(401)
      .json({ error: 'Invalid session or user not found.', code: 'UNAUTHORIZED' });
  }

  if (!dbRow.totpEnabled || !dbRow.totpEncryptedSecret) {
    return res.status(400).json({ error: '2FA is not enabled for this account.' });
  }

  // Rate-limit / lockout check
  if (dbRow.totpLockedUntil && dbRow.totpLockedUntil > new Date()) {
    const waitSecs = Math.ceil((dbRow.totpLockedUntil.getTime() - Date.now()) / 1000);
    return res.status(429).json({
      error: `Too many failed attempts. Account locked for ${waitSecs} more seconds.`,
      code: 'TOTP_LOCKED',
      retryAfterSeconds: waitSecs,
    });
  }

  let plainSecret: string;
  try {
    plainSecret = decryptSecret(dbRow.totpEncryptedSecret);
  } catch {
    return res.status(500).json({ error: 'Internal error reading 2FA credentials.' });
  }

  let verified = false;
  let usedBackupCode = false;

  const backupHashes = Array.isArray(dbRow.totpBackupCodeHashes)
    ? [...dbRow.totpBackupCodeHashes]
    : [];
  const backupIdx =
    backupHashes.length > 0 ? findMatchingBackupCodeIndex(trimmedCode, backupHashes) : -1;

  if (backupIdx !== -1) {
    backupHashes.splice(backupIdx, 1);
    verified = true;
    usedBackupCode = true;
  } else if (plainSecret) {
    verified = await verifyTotpCode(trimmedCode, plainSecret);
  }

  if (!verified) {
    const newFailCount = (dbRow.totpFailedAttempts || 0) + 1;
    const lockout =
      newFailCount >= TOTP_MAX_ATTEMPTS ? new Date(Date.now() + TOTP_LOCKOUT_MS) : undefined;

    await prisma.user.update({
      where: { id: safeUserId },
      data: {
        totpFailedAttempts: newFailCount,
        ...(lockout ? { totpLockedUntil: lockout } : {}),
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

  const updatedRow = await prisma.user.update({
    where: { id: safeUserId },
    data: {
      totpFailedAttempts: 0,
      totpLockedUntil: null,
      ...(usedBackupCode ? { totpBackupCodeHashes: backupHashes } : {}),
    },
  });

  const dbUser = userRecordToIUser(updatedRow);

  // Strict One Account – One Device Binding & Verification on 2FA completion
  const deviceResult = await verifyAndBindDevice(dbUser, req, res);
  if (!deviceResult.success) {
    return;
  }

  const token = generateAuthToken(
    String(dbUser.id),
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
          warning: `Backup code used. ${backupHashes.length} backup code(s) remaining.`,
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

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const userId = String(user.id || user._id);
  const userEmail = (user.email || req.userEmail || '').toLowerCase().trim();
  const userRole = user.role || 'learner';

  try {
    // 1. Irreversibly anonymise CreditLedger entries
    await creditsLedgerService.anonymizeUserLedger(userId);

    // 2. Purge sessions, student academic profile, submissions, and User record in PostgreSQL
    await prisma.session.deleteMany({
      where: { userId },
    });

    await prisma.studentProfile.deleteMany({
      where: { userId },
    });

    await prisma.submission.deleteMany({
      where: {
        OR: [{ learnerId: userId }, ...(userEmail ? [{ learnerEmail: userEmail }] : [])],
      },
    });

    if (isValidId(userId)) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    if (userEmail) {
      await prisma.user.deleteMany({ where: { email: userEmail } });
    }

    // 3. Log deletion in AuditLog WITHOUT ANY PERSONAL DATA
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

    // 4. Clear auth and csrf cookies
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
