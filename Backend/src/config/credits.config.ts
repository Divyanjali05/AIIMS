import type { IUser } from '../models/User.model';

export const STARTING_CREDITS = 500;

/**
 * CREDIT_RULES — single source of truth for all reward/cost values.
 * Change values here; do NOT scatter hardcoded amounts through route handlers.
 */
export const CREDIT_RULES = {
  ASSESSMENT_COMPLETION: { credits: 50, xp: 100 },
  LEVEL_QUEST_COMPLETION: { credits: 10, xp: 50 },
  SIGNAL_INVESTIGATION: { credits: 30, xp: 100 },
  CLARITY_TASK_EASY: { credits: 15, xp: 50 },
  CLARITY_TASK_MEDIUM: { credits: 15, xp: 50 },
  CLARITY_TASK_ADVANCED: { credits: 15, xp: 50 },
  WELCOME_BONUS: { credits: STARTING_CREDITS, xp: 0 },
} as const;

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
 * Formats a MongoDB User document into a client-ready state payload
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
      college: dbUser.college || 'Engineering & Technology College',
      targetGoal: dbUser.targetGoal,
      stage: dbUser.stage,
      xpPoints: dbUser.xpPoints,
      aiimsCredits: dbUser.aiimsCredits,
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
      taskScores: (dbUser.clarity as any)?.taskScores || {},
    },
    focus: {
      status: dbUser.focus?.status || 'locked',
      selectedTrack: dbUser.focus?.selectedTrack || null,
      history: dbUser.focus?.history || [],
      activatedAt: dbUser.focus?.activatedAt || null,
      sessionHistory: (dbUser.focus as any)?.sessionHistory || [],
      activeSession: (dbUser.focus as any)?.activeSession || null,
      sessionConfig: (dbUser.focus as any)?.sessionConfig || null,
    },
    radar: {
      status: dbUser.radar?.status || 'locked',
      investigatedSignalIds: dbUser.radar?.investigatedSignalIds || [],
      followedSignalIds: dbUser.radar?.followedSignalIds || [],
      savedSignalIds: (dbUser.radar as any)?.savedSignalIds || [],
      dismissedSignalIds: (dbUser.radar as any)?.dismissedSignalIds || [],
      lastViewedRadar: (dbUser.radar as any)?.lastViewedRadar || null,
      radarProgress: (dbUser.radar as any)?.radarProgress || 0,
    },
    investigation: dbUser.investigation || {
      status: 'locked',
      selectedSignalId: null,
      userNotes: {},
    },
    solver: (dbUser as any)?.solver || { latestWorkflow: null, history: [] },
    build: (dbUser as any)?.build || { projects: [], activeProjectId: null },
    relevance: { status: 'locked' },
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
