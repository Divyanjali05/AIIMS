import type { IUser } from '../types/models';

export const STARTING_CREDITS = 500;

/**
 * Phase 1 Assessment Economy Rules
 * - Assessment submission charge: 100 AC
 * - Score strictly greater than 95%: 50 AC bonus
 * - Score equal to or less than 95%: No bonus
 */
export const ASSESSMENT_RULES = {
  SUBMISSION_CHARGE: 100,
  HIGH_SCORE_BONUS_THRESHOLD: 95,
  HIGH_SCORE_BONUS: 50,
  XP_REWARD: 100,
} as const;

/**
 * Phase 3 AI Wallet Economy Rules
 * - Wallet operation charge: 100 AC
 * - Manual add operation: Flagged as unresolved product decision requiring approval (not assumed).
 */
export const WALLET_RULES = {
  OPERATION_CHARGE: 100,
} as const;

/**
 * CREDIT_RULES — single source of truth for all reward/cost values.
 * Change values here; do NOT scatter hardcoded amounts through route handlers.
 */
export const CREDIT_RULES = {
  ASSESSMENT_SUBMISSION_FEE: { cost: 100 },
  ASSESSMENT_HIGH_SCORE_BONUS: { credits: 50, threshold: 95 },
  ASSESSMENT_COMPLETION: { credits: 50, xp: 100 }, // legacy compatibility mirror
  WALLET_OPERATION: { cost: WALLET_RULES.OPERATION_CHARGE },
  LEVEL_QUEST_COMPLETION: { credits: 10, xp: 50 },
  SIGNAL_INVESTIGATION: { credits: 30, xp: 100 },
  CLARITY_TASK_EASY: { credits: 15, xp: 50 },
  CLARITY_TASK_MEDIUM: { credits: 15, xp: 50 },
  CLARITY_TASK_ADVANCED: { credits: 15, xp: 50 },
  WELCOME_BONUS: { credits: STARTING_CREDITS, xp: 0 },
} as const;

/**
 * FOCUS_CHALLENGE_RULES — Per-level duration thresholds and reward tiers for Focus Practice Challenges.
 * Approved in T3 Owner Decision Record (2026-11-07).
 */
export interface FocusChallengeRule {
  fastThresholdSeconds: number;
  normalThresholdSeconds: number;
  fastReward: { credits: number; xp: number };
  normalReward: { credits: number; xp: number };
  overtimeReward: { credits: number; xp: number };
}

export const FOCUS_CHALLENGE_RULES: Record<string, FocusChallengeRule> = {
  Easy: {
    fastThresholdSeconds: 300,
    normalThresholdSeconds: 600,
    fastReward: { credits: 20, xp: 50 },
    normalReward: { credits: 15, xp: 50 },
    overtimeReward: { credits: 0, xp: 0 },
  },
  Medium: {
    fastThresholdSeconds: 600,
    normalThresholdSeconds: 1200,
    fastReward: { credits: 20, xp: 50 },
    normalReward: { credits: 15, xp: 50 },
    overtimeReward: { credits: 0, xp: 0 },
  },
  Hard: {
    fastThresholdSeconds: 900,
    normalThresholdSeconds: 1800,
    fastReward: { credits: 20, xp: 50 },
    normalReward: { credits: 15, xp: 50 },
    overtimeReward: { credits: 0, xp: 0 },
  },
};

/**
 * Calculates Focus challenge reward tiers authoritatively based on difficulty and server-calculated elapsed seconds.
 */
export const calculateFocusChallengeReward = (
  level: string,
  serverDurationSeconds: number
): { credits: number; xp: number; tier: 'FAST' | 'NORMAL' | 'OVERTIME' } => {
  const rule = FOCUS_CHALLENGE_RULES[level] || FOCUS_CHALLENGE_RULES.Easy;
  if (serverDurationSeconds <= rule.fastThresholdSeconds) {
    return { ...rule.fastReward, tier: 'FAST' };
  }
  if (serverDurationSeconds <= rule.normalThresholdSeconds) {
    return { ...rule.normalReward, tier: 'NORMAL' };
  }
  return { ...rule.overtimeReward, tier: 'OVERTIME' };
};

/**
 * Generates deterministic idempotency key for Focus Practice Challenge completion rewards.
 */
export const focusChallengeRewardKey = (assignmentId: string): string =>
  `focus::challenge::${assignmentId}`;

/**
 * Generates a deterministic idempotency key for a clarity task reward.
 * The key format ensures the same task for the same user only ever awards once.
 */
export const clarityTaskRewardKey = (
  userId: string,
  topic: string,
  difficulty: string,
  taskId: string
): string => `clarity::${userId}::${topic}::${difficulty}::${taskId}`;

/**
 * Formats a PostgreSQL User record into a client-ready state payload
 */
export const formatUserState = (dbUser: IUser) => {
  // Populate claimedActions from DB transactions and user state for guaranteed client idempotency
  const claimedSet = new Set<string>(['WELCOME_BONUS']);

  if (dbUser.assessment?.status === 'completed' || dbUser.assessment?.rewardClaimed) {
    claimedSet.add('DIAGNOSTIC_ASSESSMENT');
    claimedSet.add('ASSESSMENT_COMPLETION');
  }

  if (dbUser.transactions && Array.isArray(dbUser.transactions)) {
    for (const tx of dbUser.transactions) {
      if (tx.sourceId) {
        claimedSet.add(tx.sourceId);
        if (tx.source === 'RADAR' || tx.transactionType === 'SIGNAL_INVESTIGATION') {
          claimedSet.add(`INVESTIGATE_SIGNAL_${tx.sourceId}`);
        }
      }
    }
  }

  if (dbUser.radar?.investigatedSignalIds && Array.isArray(dbUser.radar.investigatedSignalIds)) {
    for (const sigId of dbUser.radar.investigatedSignalIds) {
      claimedSet.add(sigId);
      claimedSet.add(`INVESTIGATE_SIGNAL_${sigId}`);
    }
  }

  return {
    profile: {
      id: dbUser._id ? String(dbUser._id) : dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      track: dbUser.track || 'Student',
      college: dbUser.college || 'Engineering & Technology College',
      targetGoal: dbUser.targetGoal,
      stage: dbUser.stage,
      xpPoints: dbUser.xpPoints,
      aiimsCredits: dbUser.aiimsCredits,
      deviceBinding: dbUser.deviceBinding,
    },
    assessment: dbUser.assessment || {
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
    },
    analysis: dbUser.analysis || {
      status: 'locked',
      topCapability: 'AI Evaluation & Critical Assessment',
      growthArea: 'AI Workflow Design',
    },
    clarity: {
      status: dbUser.clarity?.status || 'locked',
      selectedAreas: dbUser.clarity?.selectedAreas || [],
      selectedTopic: dbUser.clarity?.selectedTopic || null,
      completedTopics: dbUser.clarity?.completedTopics || [],
      reflections: dbUser.clarity?.reflections || {},
      taskScores: (dbUser.clarity as unknown as Record<string, unknown>)?.taskScores || {},
    },
    focus: {
      status: dbUser.focus?.status || 'locked',
      selectedTrack: dbUser.focus?.selectedTrack || null,
      history: dbUser.focus?.history || [],
      activatedAt: dbUser.focus?.activatedAt || null,
      sessionHistory: (dbUser.focus as unknown as Record<string, unknown>)?.sessionHistory || [],
      activeSession: (dbUser.focus as unknown as Record<string, unknown>)?.activeSession || null,
      sessionConfig: (dbUser.focus as unknown as Record<string, unknown>)?.sessionConfig || null,
    },
    radar: {
      status: dbUser.radar?.status || 'locked',
      investigatedSignalIds: dbUser.radar?.investigatedSignalIds || [],
      followedSignalIds: dbUser.radar?.followedSignalIds || [],
      savedSignalIds: (dbUser.radar as unknown as Record<string, unknown>)?.savedSignalIds || [],
      dismissedSignalIds:
        (dbUser.radar as unknown as Record<string, unknown>)?.dismissedSignalIds || [],
      lastViewedRadar:
        (dbUser.radar as unknown as Record<string, unknown>)?.lastViewedRadar || null,
      radarProgress: (dbUser.radar as unknown as Record<string, unknown>)?.radarProgress || 0,
    },
    investigation: dbUser.investigation || {
      status: 'locked',
      selectedSignalId: null,
      userNotes: {},
    },
    solver: (dbUser as unknown as Record<string, unknown>)?.solver || {
      latestWorkflow: null,
      history: [],
    },
    build: (dbUser as unknown as Record<string, unknown>)?.build || {
      projects: [],
      activeProjectId: null,
    },
    relevance:
      dbUser.relevance && (dbUser.relevance as Record<string, unknown>).status
        ? dbUser.relevance
        : { status: 'locked' },
    mentor:
      dbUser.mentor && (dbUser.mentor as Record<string, unknown>).status
        ? dbUser.mentor
        : { status: 'locked' },
    credits: {
      balance: dbUser.aiimsCredits,
      transactions: dbUser.transactions || [],
      claimedActions: Array.from(claimedSet),
    },
    notifications: dbUser.notifications || [],
    aiWallet: dbUser.aiWallet || {
      userTools: [],
      dismissedRecommendations: [],
    },
  };
};
