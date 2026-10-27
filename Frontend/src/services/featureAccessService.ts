import { LearnerState } from '../context/LearnerContext';

/**
 * Stable internal feature identifiers for AIIMS.
 */
export type FeatureId =
  | 'home'
  | 'assessment'
  | 'analysis'
  | 'wallet'
  | 'clarity'
  | 'focus'
  | 'radar'
  | 'investigation'
  | 'relevance'
  | 'solver'
  | 'build'
  | 'mentor'
  | 'credits'
  | 'insights'
  | 'settings'
  | 'journey'
  | 'discover';

export type JourneyLevel = 'Level 1' | 'Level 2' | 'Level 3' | 'Level 4' | 'Other';

export interface FeatureAccess {
  featureId: FeatureId;
  name: string;
  level: JourneyLevel;
  visible: boolean;
  unlocked: boolean;
  reason?: string;
  unlockAction?: string;
  targetTab?: string;
  requiredConditions?: string[];
  isUnresolved?: boolean;
}

/**
 * Canonical Register of Unresolved Unlock Conditions (Governance Link: OWNER_DECISION_REGISTER.md)
 * All Level 2-4 premium workspace unlocks await Owner Decision 1 (Plan Access Model)
 * and Decision 2 (Premium Level Unlock Basis).
 */
export const UNRESOLVED_UNLOCK_CONDITIONS = [
  {
    featureId: 'radar',
    level: 'Level 2',
    decisionRef: 'Decision 1 & 2',
    status: 'Unresolved',
    rule: 'Remains visible and safely locked until Owner confirms Plan Subscription vs. Milestone progression.',
  },
  {
    featureId: 'investigation',
    level: 'Level 2',
    decisionRef: 'Decision 1 & 2',
    status: 'Unresolved',
    rule: 'Activity-gated workspace linked to AI Radar signals; safely locked pending Level 2 entitlement.',
  },
  {
    featureId: 'relevance',
    level: 'Level 2',
    decisionRef: 'Decision 1 & 2',
    status: 'Unresolved',
    rule: 'Impact analysis workspace connecting signals to focus; safely locked pending Level 2 entitlement.',
  },
  {
    featureId: 'solver',
    level: 'Level 3',
    decisionRef: 'Decision 1 & 2',
    status: 'Unresolved',
    rule: 'Level 3 Specialist workflow generator; safely locked pending Level 3 entitlement.',
  },
  {
    featureId: 'build',
    level: 'Level 3',
    decisionRef: 'Decision 1 & 2',
    status: 'Unresolved',
    rule: 'Level 3 Specialist project builder; safely locked pending Level 3 entitlement.',
  },
  {
    featureId: 'mentor',
    level: 'Level 4',
    decisionRef: 'Decision 1 & 2',
    status: 'Unresolved',
    rule: 'Level 4 Mastery/Enterprise coaching environment; safely locked pending Level 4 entitlement.',
  },
];

/**
 * Normalizes tab names and paths into canonical FeatureId.
 */
export function normalizeFeatureId(tabOrPath: string): FeatureId {
  const clean = tabOrPath
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '')
    .trim();
  if (!clean || clean === 'index.html' || clean === 'home') return 'home';
  if (clean === 'problem-solver' || clean === 'solver') return 'solver';
  if (clean === 'projects' || clean === 'build') return 'build';
  if (clean === 'profile' || clean === 'settings') return 'settings';
  if (clean === 'wallet' || clean === 'ai-wallet' || clean === 'aiwallet' || clean === 'discover')
    return 'wallet';
  if (
    clean === 'profile-analysis' ||
    clean === 'analysis' ||
    clean === 'my-profile' ||
    clean === 'my-ai-profile'
  )
    return 'analysis';
  if (clean === 'improve' || clean === 'mentor' || clean === 'mentor-workspace') return 'mentor';
  if (clean === 'ai-radar' || clean === 'radar') return 'radar';
  if (clean === 'ai-relevance' || clean === 'relevance') return 'relevance';
  if (clean === 'signal-investigation' || clean === 'investigation') return 'investigation';
  if (clean === 'growth-insights' || clean === 'insights') return 'insights';
  if (clean === 'baseline-assessment' || clean === 'assessment') return 'assessment';
  if (clean === 'credits-progress' || clean === 'credits') return 'credits';
  return (clean as FeatureId) || 'home';
}

/**
 * Evaluates the single source of truth (LearnerState) to determine access,
 * lock state, human-readable explanations, and next actions for any feature.
 */
export function getFeatureAccess(rawFeatureId: string, state: LearnerState): FeatureAccess {
  const featureId = normalizeFeatureId(rawFeatureId);

  const isAssessmentCompleted = state?.assessment?.status === 'completed';
  const isAnalysisViewed =
    state?.analysis?.status === 'viewed' || state?.analysis?.status === 'unlocked';
  const isClarityCompleted =
    (state?.clarity?.completedTopics?.length || 0) > 0 || state?.clarity?.status === 'completed';
  const isClarityActive =
    isClarityCompleted ||
    state?.clarity?.status === 'in_progress' ||
    !!state?.clarity?.selectedTopic;
  const isFocusSelected = !!state?.focus?.selectedTrack || state?.focus?.status === 'active';

  switch (featureId) {
    case 'home':
      return {
        featureId: 'home',
        name: 'Home',
        level: 'Level 1',
        visible: true,
        unlocked: true,
      };

    case 'assessment':
      return {
        featureId: 'assessment',
        name: 'Baseline Assessment',
        level: 'Level 1',
        visible: true,
        unlocked: true,
      };

    case 'analysis':
      if (isAssessmentCompleted) {
        return {
          featureId: 'analysis',
          name: 'My AI Profile',
          level: 'Level 1',
          visible: true,
          unlocked: true,
        };
      }
      return {
        featureId: 'analysis',
        name: 'My AI Profile',
        level: 'Level 1',
        visible: true,
        unlocked: false,
        reason: 'My AI Profile unlocks after you complete your baseline assessment.',
        unlockAction: 'Start Baseline Assessment',
        targetTab: 'assessment',
        requiredConditions: ['Baseline Assessment completed'],
      };

    case 'wallet':
    case 'discover':
      return {
        featureId: 'wallet',
        name: 'AI Wallet',
        level: 'Level 1',
        visible: true,
        unlocked: true,
      };

    case 'clarity':
      if (!isAssessmentCompleted) {
        return {
          featureId: 'clarity',
          name: 'Clarity',
          level: 'Level 1',
          visible: true,
          unlocked: false,
          reason: 'Clarity unlocks after your assessment profile is analyzed.',
          unlockAction: 'Complete Baseline Assessment',
          targetTab: 'assessment',
          requiredConditions: ['Baseline Assessment completed', 'My AI Profile reviewed'],
        };
      }
      if (!isAnalysisViewed) {
        return {
          featureId: 'clarity',
          name: 'Clarity',
          level: 'Level 1',
          visible: true,
          unlocked: false,
          reason: 'Clarity unlocks after you review your AI capability profile.',
          unlockAction: 'View My AI Profile',
          targetTab: 'analysis',
          requiredConditions: ['My AI Profile reviewed'],
        };
      }
      return {
        featureId: 'clarity',
        name: 'Clarity',
        level: 'Level 1',
        visible: true,
        unlocked: true,
      };

    case 'focus':
      if (!isAssessmentCompleted) {
        return {
          featureId: 'focus',
          name: 'Focus',
          level: 'Level 1',
          visible: true,
          unlocked: false,
          reason: 'Focus unlocks after completing the baseline assessment and exploring Clarity.',
          unlockAction: 'Complete Baseline Assessment',
          targetTab: 'assessment',
          requiredConditions: ['Baseline Assessment completed', 'Clarity activity completed'],
        };
      }
      if (!isAnalysisViewed) {
        return {
          featureId: 'focus',
          name: 'Focus',
          level: 'Level 1',
          visible: true,
          unlocked: false,
          reason: 'Focus unlocks after reviewing your profile and exploring Clarity.',
          unlockAction: 'View My AI Profile',
          targetTab: 'analysis',
          requiredConditions: ['My AI Profile reviewed', 'Clarity activity completed'],
        };
      }
      if (!isClarityCompleted && !isClarityActive && state?.focus?.status === 'locked') {
        return {
          featureId: 'focus',
          name: 'Focus',
          level: 'Level 1',
          visible: true,
          unlocked: false,
          reason: 'Focus unlocks after you explore Clarity.',
          unlockAction: 'Explore Clarity',
          targetTab: 'clarity',
          requiredConditions: ['Clarity activity completed'],
        };
      }
      return {
        featureId: 'focus',
        name: 'Focus',
        level: 'Level 1',
        visible: true,
        unlocked: true,
      };

    case 'radar':
      return {
        featureId: 'radar',
        name: 'AI Radar',
        level: 'Level 2',
        visible: true,
        unlocked: false,
        isUnresolved: true,
        reason: 'AI Radar is locked for now. It will unlock based on your learning activities.',
        unlockAction: isFocusSelected ? 'Explore AI Wallet' : 'Choose Focus Track',
        targetTab: isFocusSelected ? 'wallet' : 'focus',
        requiredConditions: [
          'Level 2 Practitioner Plan or Focus Track Milestone (Pending Owner Confirmation)',
        ],
      };

    case 'investigation':
      return {
        featureId: 'investigation',
        name: 'Signal Investigation',
        level: 'Level 2',
        visible: true,
        unlocked: false,
        isUnresolved: true,
        reason:
          'Signal Investigation is locked for now. It will unlock based on your learning activities.',
        unlockAction: 'Explore AI Radar',
        targetTab: 'radar',
        requiredConditions: ['AI Radar signal selected'],
      };

    case 'relevance':
      return {
        featureId: 'relevance',
        name: 'AI Relevance',
        level: 'Level 2',
        visible: true,
        unlocked: false,
        isUnresolved: true,
        reason: 'AI Relevance is locked for now. It will unlock based on your learning activities.',
        unlockAction: 'Explore AI Radar',
        targetTab: 'radar',
        requiredConditions: ['Signal Investigation completed'],
      };

    case 'solver':
      return {
        featureId: 'solver',
        name: 'Problem Solver',
        level: 'Level 3',
        visible: true,
        unlocked: false,
        isUnresolved: true,
        reason:
          'Problem Solver is locked for now. It will unlock based on your learning activities.',
        unlockAction: 'Advance through Level 2',
        targetTab: 'home',
        requiredConditions: ['Level 3 Specialist Entitlement (Pending Owner Confirmation)'],
      };

    case 'build':
      return {
        featureId: 'build',
        name: 'Projects',
        level: 'Level 3',
        visible: true,
        unlocked: false,
        isUnresolved: true,
        reason: 'Projects is locked for now. It will unlock based on your learning activities.',
        unlockAction: 'Solve a Workflow',
        targetTab: 'solver',
        requiredConditions: ['Workflow created in Problem Solver'],
      };

    case 'mentor':
      return {
        featureId: 'mentor',
        name: 'Mentor Workspace',
        level: 'Level 4',
        visible: true,
        unlocked: false,
        isUnresolved: true,
        reason:
          'Mentor Workspace is locked for now. It will unlock based on your learning activities.',
        unlockAction: 'Advance through Level 3',
        targetTab: 'home',
        requiredConditions: ['Level 4 Mastery Entitlement (Pending Owner Confirmation)'],
      };

    case 'insights':
      if (isAssessmentCompleted) {
        return {
          featureId: 'insights',
          name: 'Growth Insights',
          level: 'Level 1',
          visible: true,
          unlocked: true,
        };
      }
      return {
        featureId: 'insights',
        name: 'Growth Insights',
        level: 'Level 1',
        visible: true,
        unlocked: false,
        reason: 'Growth Insights unlock after you complete your baseline assessment.',
        unlockAction: 'Complete Baseline Assessment',
        targetTab: 'assessment',
        requiredConditions: ['Baseline Assessment completed'],
      };

    case 'credits':
      return {
        featureId: 'credits',
        name: 'Credits & Progress',
        level: 'Other',
        visible: true,
        unlocked: true,
      };

    case 'settings':
      return {
        featureId: 'settings',
        name: 'Settings',
        level: 'Other',
        visible: true,
        unlocked: true,
      };

    case 'journey':
      return {
        featureId: 'journey',
        name: 'AI Journey',
        level: 'Other',
        visible: true,
        unlocked: true,
      };

    default:
      return {
        featureId: 'home',
        name: 'Home',
        level: 'Level 1',
        visible: true,
        unlocked: true,
      };
  }
}

/**
 * Returns a typed dictionary of all feature access determinations.
 */
export function getAllFeatureAccess(state: LearnerState): Record<FeatureId, FeatureAccess> {
  const featureIds: FeatureId[] = [
    'home',
    'assessment',
    'analysis',
    'wallet',
    'clarity',
    'focus',
    'radar',
    'investigation',
    'relevance',
    'solver',
    'build',
    'mentor',
    'credits',
    'insights',
    'settings',
    'journey',
  ];

  const result = {} as Record<FeatureId, FeatureAccess>;
  for (const id of featureIds) {
    result[id] = getFeatureAccess(id, state);
  }
  return result;
}

/**
 * Convenience helper to check if a feature is unlocked.
 */
export function isFeatureUnlocked(featureId: string, state: LearnerState): boolean {
  return getFeatureAccess(featureId, state).unlocked;
}
