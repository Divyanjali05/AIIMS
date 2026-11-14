/**
 * userMapper.ts
 * =========================================================
 * Maps PostgreSQL Prisma User rows to structured IUser domain entities
 * and handles secure bcrypt password hashing/verification.
 */

import bcrypt from 'bcryptjs';
import { Prisma, User as PrismaUser } from '@prisma/client';
import { IUser, UserRole } from '../types/models';
import { toArray, toRecord } from './id';

const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

export function isBcryptHash(value: string): boolean {
  return BCRYPT_HASH_REGEX.test(value);
}

export async function hashPassword(password: string): Promise<string> {
  if (!password) return password;
  if (isBcryptHash(password)) return password;
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verifies a candidate password against the stored bcrypt hash.
 * Strictly rejects non-bcrypt (plaintext/corrupt) stored values.
 */
export async function verifyPassword(
  storedPassword: string | null | undefined,
  candidatePassword: string
): Promise<{ match: boolean; migratedHash?: string }> {
  if (!storedPassword || !candidatePassword) {
    return { match: false };
  }

  if (isBcryptHash(storedPassword)) {
    const match = await bcrypt.compare(candidatePassword, storedPassword);
    return { match };
  }

  return { match: false };
}

export function defaultAssessment(): IUser['assessment'] {
  return {
    status: 'not_started',
    answers: {},
    currentQuestionIndex: 0,
    completedAt: null,
    rewardClaimed: false,
    scores: {
      usageFrequency: 0,
      evaluationCapability: 0,
      workflowDesign: 0,
      strategicVision: 0,
      mentorshipReadiness: 0,
    },
  };
}

export function defaultAnalysis(): IUser['analysis'] {
  return {
    status: 'locked',
    topCapability: 'AI Evaluation & Critical Assessment',
    growthArea: 'AI Workflow Design',
    unlockedAt: null,
  };
}

export function defaultClarity(): IUser['clarity'] {
  return {
    status: 'locked',
    selectedAreas: [],
    selectedTopic: null,
    completedTopics: [],
    reflections: {},
    taskScores: {},
    trialRunsUsed: 0,
  };
}

export function defaultFocus(): IUser['focus'] {
  return {
    status: 'locked',
    selectedTrack: null,
    history: [],
    activatedAt: null,
    sessionHistory: [],
    activeSession: null,
    sessionConfig: null,
  };
}

export function defaultRadar(): IUser['radar'] {
  return {
    status: 'locked',
    investigatedSignalIds: [],
    followedSignalIds: [],
    savedSignalIds: [],
    dismissedSignalIds: [],
    lastViewedRadar: null,
    radarProgress: 0,
  };
}

export function defaultInvestigation(): IUser['investigation'] {
  return {
    status: 'locked',
    selectedSignalId: null,
    userNotes: {},
  };
}

export function defaultSolver(): NonNullable<IUser['solver']> {
  return {
    latestWorkflow: null,
    history: [],
  };
}

export function defaultBuild(): NonNullable<IUser['build']> {
  return {
    projects: [],
    activeProjectId: null,
  };
}

export function defaultNotifications(): IUser['notifications'] {
  return [
    {
      id: 'notif-init',
      title: 'Welcome to AIIMS Ecosystem',
      message:
        'Begin with your baseline Capability Assessment to unlock personalized AI intelligence.',
      timestamp: 'Just now',
      targetTab: 'assessment',
      read: false,
    },
  ];
}

export function defaultAiWallet(): IUser['aiWallet'] {
  return {
    userTools: [],
    dismissedRecommendations: [],
  };
}

/**
 * Maps a PostgreSQL User row returned by Prisma to an application IUser object.
 */
export function userRecordToIUser(row: PrismaUser): IUser {
  const assessmentRaw = toRecord(row.assessmentData);
  const analysisRaw = toRecord(row.analysisData);
  const clarityRaw = toRecord(row.clarityData);
  const focusRaw = toRecord(row.focusData);
  const radarRaw = toRecord(row.radarData);
  const investigationRaw = toRecord(row.investigationData);
  const solverRaw = toRecord(row.solverData);
  const buildRaw = toRecord(row.buildData);
  const relevanceRaw = toRecord(row.relevanceData);
  const mentorRaw = toRecord(row.mentorData);
  const aiWalletRaw = toRecord(row.aiWalletData);

  const defAssessment = defaultAssessment();
  const defAnalysis = defaultAnalysis();
  const defClarity = defaultClarity();
  const defFocus = defaultFocus();
  const defRadar = defaultRadar();
  const defInvestigation = defaultInvestigation();
  const defSolver = defaultSolver();
  const defBuild = defaultBuild();

  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    role: (row.role as UserRole) || 'learner',
    isActive: row.isActive,
    mustChangePassword: row.mustChangePassword,
    inviteToken: row.inviteToken,
    inviteTokenExpires: row.inviteTokenExpires,
    totp: {
      encryptedSecret: row.totpEncryptedSecret ?? undefined,
      enabled: row.totpEnabled,
      pendingSetup: row.totpPendingSetup,
      backupCodeHashes: Array.isArray(row.totpBackupCodeHashes) ? row.totpBackupCodeHashes : [],
      failedAttempts: row.totpFailedAttempts,
      lockedUntil: row.totpLockedUntil,
    },
    deviceBinding: {
      deviceIdHash: row.deviceIdHash || '',
      deviceName: row.deviceName || '',
      platform: (row.devicePlatform as 'web' | 'android' | 'ios' | 'other') || 'web',
      boundAt: row.deviceBoundAt,
      lastSeenAt: row.deviceLastSeenAt,
      activeSessionId: row.activeSessionId,
      bindingStatus: row.bindingStatus === 'BOUND' ? 'BOUND' : 'UNBOUND',
      resetAt: row.deviceResetAt,
      resetBy: row.deviceResetBy,
    },
    track: row.track === 'Entrepreneur' ? 'Entrepreneur' : 'Student',
    college: row.college,
    targetGoal: row.targetGoal,
    stage: row.stage,
    xpPoints: row.xpPoints,
    aiimsCredits: row.aiimsCredits,
    assessment: {
      ...defAssessment,
      ...assessmentRaw,
      status: String(assessmentRaw.status || row.assessmentStatus || 'not_started'),
      scores: {
        ...defAssessment.scores,
        ...toRecord(assessmentRaw.scores),
      },
    },
    analysis: {
      ...defAnalysis,
      ...analysisRaw,
    },
    clarity: {
      ...defClarity,
      ...clarityRaw,
      selectedAreas: Array.isArray(clarityRaw.selectedAreas) ? clarityRaw.selectedAreas : [],
      completedTopics: Array.isArray(clarityRaw.completedTopics) ? clarityRaw.completedTopics : [],
      reflections: toRecord(clarityRaw.reflections),
      taskScores: toRecord(clarityRaw.taskScores),
    },
    focus: {
      ...defFocus,
      ...focusRaw,
      history: Array.isArray(focusRaw.history) ? focusRaw.history : [],
      sessionHistory: Array.isArray(focusRaw.sessionHistory) ? focusRaw.sessionHistory : [],
    },
    radar: {
      ...defRadar,
      ...radarRaw,
      investigatedSignalIds: Array.isArray(radarRaw.investigatedSignalIds)
        ? radarRaw.investigatedSignalIds
        : [],
      followedSignalIds: Array.isArray(radarRaw.followedSignalIds)
        ? radarRaw.followedSignalIds
        : [],
      savedSignalIds: Array.isArray(radarRaw.savedSignalIds) ? radarRaw.savedSignalIds : [],
      dismissedSignalIds: Array.isArray(radarRaw.dismissedSignalIds)
        ? radarRaw.dismissedSignalIds
        : [],
    },
    investigation: {
      ...defInvestigation,
      ...investigationRaw,
      userNotes: toRecord(investigationRaw.userNotes),
    },
    solver: {
      ...defSolver,
      ...solverRaw,
      history: Array.isArray(solverRaw.history) ? solverRaw.history : [],
    },
    build: {
      ...defBuild,
      ...buildRaw,
      projects: Array.isArray(buildRaw.projects) ? buildRaw.projects : [],
    },
    relevance: relevanceRaw,
    mentor: mentorRaw,
    transactions: toArray(row.transactionsData),
    notifications: toArray(row.notificationsData),
    aiWallet: {
      userTools: Array.isArray(aiWalletRaw.userTools) ? aiWalletRaw.userTools : [],
      dismissedRecommendations: Array.isArray(aiWalletRaw.dismissedRecommendations)
        ? aiWalletRaw.dismissedRecommendations
        : [],
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Helper to cast plain JS objects/arrays cleanly to Prisma InputJsonValue without type friction.
 */
export function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
