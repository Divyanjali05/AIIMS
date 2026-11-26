/**
 * canonicalCurriculum.ts
 * =========================================================
 * AIIMS Single Source of Truth for the 10-Stage Canonical Learning Journey.
 *
 * CANONICAL ORDER:
 * 1. UNDERSTAND AI — Baseline Assessment
 * 2. MY AI PROFILE — Your AI Skills
 * 3. CLARITY — Your AI Goals
 * 4. FOCUS — Your Focus Track
 * 5. AI WALLET — Your Personalized AI Tools
 * 6. AI RADAR — Discover AI opportunities
 * 7. AI RELEVANCE — Why This Matters to You
 * 8. PROBLEM SOLVER — Solve a Real Problem
 * 9. BUILD — Create a Project
 * 10. IMPROVE — Continuous Improvement
 */

export const MIN_COMPLETED_QUESTIONS_FOR_WALLET = 3;

export type CanonicalStageId =
  | 'understand'
  | 'profile'
  | 'clarity'
  | 'focus'
  | 'wallet'
  | 'radar'
  | 'relevance'
  | 'solver'
  | 'build'
  | 'improve';

export type StageProgressStatus = 'completed' | 'current' | 'upcoming' | 'locked';

export interface CanonicalStageDefinition {
  id: CanonicalStageId;
  order: number;
  stageNumberStr: string;
  name: string;
  subtitle: string;
  description: string;
  targetTab: string;
  level: 'Level 1' | 'Level 2' | 'Level 3' | 'Level 4';
  levelGroup: string;
}

export const CANONICAL_CURRICULUM_STAGES: readonly CanonicalStageDefinition[] = [
  {
    id: 'understand',
    order: 1,
    stageNumberStr: 'Stage 01',
    name: 'UNDERSTAND AI',
    subtitle: 'Baseline Assessment',
    description: 'Discover your AI profile through baseline diagnostic assessment.',
    targetTab: 'assessment',
    level: 'Level 1',
    levelGroup: 'LEVEL 1: UNDERSTAND & DEVELOP',
  },
  {
    id: 'profile',
    order: 2,
    stageNumberStr: 'Stage 02',
    name: 'MY AI PROFILE',
    subtitle: 'Your AI Skills',
    description: 'Understand your top AI skills, capability scores, and personal growth areas.',
    targetTab: 'analysis',
    level: 'Level 1',
    levelGroup: 'LEVEL 1: UNDERSTAND & DEVELOP',
  },
  {
    id: 'clarity',
    order: 3,
    stageNumberStr: 'Stage 03',
    name: 'CLARITY',
    subtitle: 'Your AI Goals',
    description:
      'Define what you actually want AI to help you accomplish and practice topic concepts.',
    targetTab: 'clarity',
    level: 'Level 1',
    levelGroup: 'LEVEL 1: UNDERSTAND & DEVELOP',
  },
  {
    id: 'focus',
    order: 4,
    stageNumberStr: 'Stage 04',
    name: 'FOCUS',
    subtitle: 'Your Focus Track',
    description: 'Select your concentration area and practice deep specialization.',
    targetTab: 'focus',
    level: 'Level 1',
    levelGroup: 'LEVEL 1: UNDERSTAND & DEVELOP',
  },
  {
    id: 'wallet',
    order: 5,
    stageNumberStr: 'Stage 05',
    name: 'AI WALLET',
    subtitle: 'Your Personalized AI Tools',
    description: 'Discover, evaluate, and curate tools tailored to your tasks and profile.',
    targetTab: 'wallet',
    level: 'Level 1',
    levelGroup: 'LEVEL 1: UNDERSTAND & DEVELOP',
  },
  {
    id: 'radar',
    order: 6,
    stageNumberStr: 'Stage 06',
    name: 'AI RADAR',
    subtitle: 'Discover AI opportunities',
    description: 'Discover AI opportunities and tech shifts across foundation models.',
    targetTab: 'radar',
    level: 'Level 2',
    levelGroup: 'LEVEL 2: DISCOVER & INVESTIGATE',
  },
  {
    id: 'relevance',
    order: 7,
    stageNumberStr: 'Stage 07',
    name: 'AI RELEVANCE',
    subtitle: 'Why This Matters to You',
    description: 'Understand why emerging opportunities matter to your work and projects.',
    targetTab: 'relevance',
    level: 'Level 2',
    levelGroup: 'LEVEL 2: DISCOVER & INVESTIGATE',
  },
  {
    id: 'solver',
    order: 8,
    stageNumberStr: 'Stage 08',
    name: 'PROBLEM SOLVER',
    subtitle: 'Solve a Real Problem',
    description: 'Apply AI tools to derive workflows for real business tasks.',
    targetTab: 'solver',
    level: 'Level 3',
    levelGroup: 'LEVEL 3: BUILD & SOLVE',
  },
  {
    id: 'build',
    order: 9,
    stageNumberStr: 'Stage 09',
    name: 'BUILD',
    subtitle: 'Create a Project',
    description: 'Turn your solved workflows into reusable projects and prototypes.',
    targetTab: 'build',
    level: 'Level 3',
    levelGroup: 'LEVEL 3: BUILD & SOLVE',
  },
  {
    id: 'improve',
    order: 10,
    stageNumberStr: 'Stage 10',
    name: 'IMPROVE',
    subtitle: 'Continuous Improvement',
    description: 'Review updated insights, calibrate skills, and pursue continuous mastery.',
    targetTab: 'mentor',
    level: 'Level 4',
    levelGroup: 'LEVEL 4: IMPROVE & MASTER',
  },
] as const;

/**
 * Calculates the number of unique questions completed across Clarity and Focus.
 * Collects distinct question IDs across top-level, clarity, focus, and recorded task scores.
 * Duplicate attempts or page refreshes do NOT inflate the count.
 */
export function getCompletedQuestionsCount(state: any): number {
  if (!state) return 0;
  const completedIds = new Set<string>();

  // 1. Collect from top-level array if present
  if (Array.isArray(state.completedQuestionIds)) {
    state.completedQuestionIds.forEach((id: string) => {
      if (typeof id === 'string' && id.trim()) completedIds.add(id.trim());
    });
  }

  // 2. Collect from clarity state
  if (state.clarity) {
    if (Array.isArray(state.clarity.completedQuestionIds)) {
      state.clarity.completedQuestionIds.forEach((id: string) => {
        if (typeof id === 'string' && id.trim()) completedIds.add(id.trim());
      });
    }
    // Also include questions with recorded task scores
    if (state.clarity.taskScores && typeof state.clarity.taskScores === 'object') {
      Object.keys(state.clarity.taskScores).forEach((topicOrId) => {
        const item = state.clarity.taskScores[topicOrId];
        if (item && typeof item === 'object') {
          Object.keys(item).forEach((qKey) => {
            completedIds.add(`clarity-${topicOrId}-${qKey}`);
          });
        }
      });
    }
  }

  // 3. Collect from focus state
  if (state.focus) {
    if (Array.isArray(state.focus.completedQuestionIds)) {
      state.focus.completedQuestionIds.forEach((id: string) => {
        if (typeof id === 'string' && id.trim()) completedIds.add(id.trim());
      });
    }
    if (Array.isArray(state.focus.sessionHistory)) {
      state.focus.sessionHistory.forEach((session: any) => {
        if (session && session.completedAt && session.sessionId) {
          completedIds.add(`focus-session-${session.sessionId}`);
        }
      });
    }
  }

  return completedIds.size;
}

/**
 * Evaluates whether the AI Wallet is unlocked for the current learner state.
 * Evaluators and Admins always bypass.
 * Students require at least MIN_COMPLETED_QUESTIONS_FOR_WALLET valid attempts.
 */
export function isWalletUnlocked(state: any): boolean {
  if (!state) return false;
  const role = state?.profile?.role?.toLowerCase?.() || '';
  if (role === 'admin' || role === 'evaluator') return true;
  return getCompletedQuestionsCount(state) >= MIN_COMPLETED_QUESTIONS_FOR_WALLET;
}

/**
 * Returns wallet unlock progress details for UI progress bars and badges.
 */
export function getWalletUnlockProgress(state: any): {
  completedCount: number;
  requiredThreshold: number;
  unlocked: boolean;
  progressPercent: number;
  remaining: number;
} {
  const completedCount = getCompletedQuestionsCount(state);
  const requiredThreshold = MIN_COMPLETED_QUESTIONS_FOR_WALLET;
  const unlocked = isWalletUnlocked(state);
  const progressPercent = Math.min(100, Math.round((completedCount / requiredThreshold) * 100));
  const remaining = Math.max(0, requiredThreshold - completedCount);

  return {
    completedCount,
    requiredThreshold,
    unlocked,
    progressPercent,
    remaining,
  };
}
