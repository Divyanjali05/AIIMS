import { LearnerState } from '../context/LearnerContext';
import { buildLearnerProfileContext } from './learnerProfileContext';
import { getFeatureAccess } from './featureAccessService';
import {
  CANONICAL_CURRICULUM_STAGES,
  MIN_COMPLETED_QUESTIONS_FOR_WALLET,
  isWalletUnlocked,
  getCompletedQuestionsCount,
} from '../config/canonicalCurriculum';

export interface JourneyStageItem {
  id: string;
  number: number;
  name: string;
  subtitle: string;
  status: 'completed' | 'current' | 'upcoming' | 'locked';
  description: string;
  targetTab: string;
}

export interface LearnerNextAction {
  currentStageKey:
    | 'assessment'
    | 'analysis'
    | 'clarity'
    | 'focus'
    | 'wallet'
    | 'radar'
    | 'relevance'
    | 'solver'
    | 'build'
    | 'mentor';
  currentStageTitle: string;
  nextActionTitle: string;
  nextActionReason: string;
  targetTab: string;
  actionButtonLabel: string;
  progressPercent: number;
  journeyStages: JourneyStageItem[];
}

export interface DirectionItem {
  category: 'FOCUS' | 'CLARITY' | 'PROFILE';
  title: string;
  status: string;
  actionLabel: string;
  targetTab: string;
}

export interface ResolvedJourneyStageItem {
  key: string;
  label: string;
  sublabel: string;
  status: 'completed' | 'current' | 'upcoming';
  targetTab: string;
}

export interface ResolvedJourney {
  currentStageKey: string;
  currentStageIndex: number;
  currentStageLabel: string;
  nextActionTitle: string;
  nextActionReason: string;
  targetTab: string;
  actionButtonLabel: string;
  journeyStages: ResolvedJourneyStageItem[];
  direction: {
    focus: DirectionItem;
    clarity: DirectionItem;
    profile: DirectionItem;
  };
}

/**
 * Journey Resolver Service — Canonical 10-Stage Learner Journey Logic
 * Evaluates the single source of truth (LearnerState) and determines
 * the single recommended "Your Next Step" and 10-stage timeline.
 * Does NOT lock out modules; serves purely as actionable guidance.
 */
export const resolveLearnerNextAction = (state: LearnerState): LearnerNextAction => {
  const profileCtx = buildLearnerProfileContext(state);

  // Exact Stage Completion Triggers
  const isAssessmentDone = state.assessment?.status === 'completed';
  const isAnalysisViewed =
    state.analysis?.status === 'viewed' ||
    state.analysis?.status === 'generated' ||
    Boolean(state.analysis?.aiProfile);
  const isClarityCompleted =
    (state.clarity?.completedTopics?.length || 0) > 0 || state.clarity?.status === 'completed';
  const isFocusSelected =
    (state.focus?.status === 'active' && state.focus?.selectedTrack !== null) ||
    state.focus?.status === 'completed';

  // AI Wallet unlock and completion logic
  const completedQuestionsCount = getCompletedQuestionsCount(state);
  const walletUnlocked = isWalletUnlocked(state);
  const isWalletCompleted =
    walletUnlocked &&
    ((state.aiWallet?.userTools?.length || 0) >= 3 ||
      (state.aiWallet as any)?.status === 'completed');

  const isRadarInvestigated =
    (state.radar?.investigatedSignalIds?.length || 0) > 0 ||
    state.investigation?.status === 'completed';
  const isRelevanceCompleted = state.relevance?.status === 'completed';
  const hasSolvedWorkflow =
    !!state.solver?.latestWorkflow || (state.solver?.history?.length || 0) > 0;
  const hasBuildProject = (state.build?.projects?.length || 0) > 0;

  // Determine stage key and single recommended next action in canonical sequence
  let currentStageKey: LearnerNextAction['currentStageKey'] = 'assessment';
  let currentStageTitle = '1. UNDERSTAND AI';
  let nextActionTitle = 'Complete your AI assessment';
  let nextActionReason =
    'Take your baseline diagnostic assessment to discover your AI skills and capability profile.';
  let targetTab = 'assessment';
  let actionButtonLabel = 'Start Assessment';
  let progressPercent = 0;

  if (!isAssessmentDone) {
    currentStageKey = 'assessment';
    currentStageTitle = '1. UNDERSTAND AI';
    nextActionTitle = 'Complete your AI assessment';
    nextActionReason =
      'Take your baseline diagnostic assessment to discover your AI skills and capability profile.';
    targetTab = 'assessment';
    actionButtonLabel = 'Start Assessment';
    progressPercent = 0;
  } else if (!isAnalysisViewed) {
    currentStageKey = 'analysis';
    currentStageTitle = '2. MY AI PROFILE';
    nextActionTitle = 'View your AI profile';
    nextActionReason = `Your assessment is complete. Open your profile to see your top skill in ${profileCtx.assessment?.topCapability || 'AI Systems'} and growth areas.`;
    targetTab = 'analysis';
    actionButtonLabel = 'View Your AI Profile';
    progressPercent = 20;
  } else if (!isClarityCompleted) {
    currentStageKey = 'clarity';
    currentStageTitle = '3. CLARITY';
    nextActionTitle = 'Clarify your AI goals';
    nextActionReason =
      'Define what you actually want AI to help you accomplish and practice topic concepts.';
    targetTab = 'clarity';
    actionButtonLabel = 'Clarify Your Goals';
    progressPercent = 30;
  } else if (!isFocusSelected) {
    currentStageKey = 'focus';
    currentStageTitle = '4. FOCUS';
    nextActionTitle = 'Choose your focus track';
    nextActionReason =
      'Select what area you want to concentrate on right now to personalize your learning track.';
    targetTab = 'focus';
    actionButtonLabel = 'Choose Focus Track';
    progressPercent = 40;
  } else if (!walletUnlocked) {
    currentStageKey = 'clarity';
    currentStageTitle = 'PRACTICE CLARITY & FOCUS';
    nextActionTitle = `Complete ${MIN_COMPLETED_QUESTIONS_FOR_WALLET - completedQuestionsCount} more question(s) to unlock AI Wallet`;
    nextActionReason = `AI Wallet unlocks after completing at least ${MIN_COMPLETED_QUESTIONS_FOR_WALLET} questions across Clarity and Focus (${completedQuestionsCount} of ${MIN_COMPLETED_QUESTIONS_FOR_WALLET} completed).`;
    targetTab = 'clarity';
    actionButtonLabel = 'Practice in Clarity';
    progressPercent = 45;
  } else if (!isWalletCompleted) {
    currentStageKey = 'wallet';
    currentStageTitle = '5. AI WALLET';
    nextActionTitle = 'Explore your personalized AI tools';
    nextActionReason =
      'Your AI Wallet is unlocked! Curate your personalized tool stack and discover recommended AI tools matching your role.';
    targetTab = 'wallet';
    actionButtonLabel = 'Explore AI Wallet';
    progressPercent = 50;
  } else if (!isRadarInvestigated) {
    currentStageKey = 'radar';
    currentStageTitle = '6. AI RADAR';
    nextActionTitle = 'Discover AI opportunities';
    nextActionReason =
      'Investigate emerging signals and discover new foundation model capabilities.';
    targetTab = 'radar';
    actionButtonLabel = 'Investigate Radar';
    progressPercent = 60;
  } else if (!isRelevanceCompleted) {
    currentStageKey = 'relevance';
    currentStageTitle = '7. AI RELEVANCE';
    nextActionTitle = 'Synthesize personal relevance';
    nextActionReason =
      'Connect investigated signals to your daily tasks and understand why they matter.';
    targetTab = 'relevance';
    actionButtonLabel = 'Synthesize Relevance';
    progressPercent = 70;
  } else if (!hasSolvedWorkflow) {
    currentStageKey = 'solver';
    currentStageTitle = '8. PROBLEM SOLVER';
    nextActionTitle = 'Solve a real problem';
    nextActionReason = 'Apply AI tools to architect workflows for complex domain tasks.';
    targetTab = 'solver';
    actionButtonLabel = 'Open Problem Solver';
    progressPercent = 80;
  } else if (!hasBuildProject) {
    currentStageKey = 'build';
    currentStageTitle = '9. BUILD';
    nextActionTitle = 'Create a project';
    nextActionReason = 'Scaffold and build your solved workflow into a working project.';
    targetTab = 'build';
    actionButtonLabel = 'Open Projects';
    progressPercent = 90;
  } else {
    currentStageKey = 'mentor';
    currentStageTitle = '10. IMPROVE';
    nextActionTitle = 'Continuous AI mastery';
    nextActionReason =
      'Review your updated insights, mentor feedback, and calibrated capability scores.';
    targetTab = 'mentor';
    actionButtonLabel = 'View Mentorship Insights';
    progressPercent = 100;
  }

  // Canonical 10-Stage Journey Statuses aligned with featureAccessService
  const profileAccess = getFeatureAccess('analysis', state);
  const clarityAccess = getFeatureAccess('clarity', state);
  const focusAccess = getFeatureAccess('focus', state);
  const radarAccess = getFeatureAccess('radar', state);
  const relevanceAccess = getFeatureAccess('relevance', state);
  const solverAccess = getFeatureAccess('solver', state);
  const buildAccess = getFeatureAccess('build', state);
  const mentorAccess = getFeatureAccess('mentor', state);

  const journeyStages: JourneyStageItem[] = [
    {
      id: 'understand',
      number: 1,
      name: 'UNDERSTAND AI',
      subtitle: 'Baseline Assessment',
      status: isAssessmentDone ? 'completed' : 'current',
      description: 'Discover your AI profile through baseline assessment.',
      targetTab: 'assessment',
    },
    {
      id: 'profile',
      number: 2,
      name: 'MY AI PROFILE',
      subtitle: 'Your AI Skills',
      status: isAnalysisViewed
        ? 'completed'
        : !profileAccess.unlocked
          ? 'locked'
          : isAssessmentDone
            ? 'current'
            : 'locked',
      description: 'Understand your top AI skills and growth areas.',
      targetTab: 'analysis',
    },
    {
      id: 'clarity',
      number: 3,
      name: 'CLARITY',
      subtitle: 'Your AI Goals',
      status: isClarityCompleted
        ? 'completed'
        : !clarityAccess.unlocked
          ? 'locked'
          : isAnalysisViewed
            ? 'current'
            : 'upcoming',
      description: 'Define what you actually want AI to help you accomplish.',
      targetTab: 'clarity',
    },
    {
      id: 'focus',
      number: 4,
      name: 'FOCUS',
      subtitle: 'Your Focus Track',
      status: isFocusSelected
        ? 'completed'
        : !focusAccess.unlocked
          ? 'locked'
          : isClarityCompleted
            ? 'current'
            : 'upcoming',
      description: 'Select your concentration area right now.',
      targetTab: 'focus',
    },
    {
      id: 'wallet',
      number: 5,
      name: 'AI WALLET',
      subtitle: 'Your Personalized AI Tools',
      status: !walletUnlocked
        ? 'locked'
        : isWalletCompleted
          ? 'completed'
          : isFocusSelected
            ? 'current'
            : 'upcoming',
      description: 'Discover, evaluate, and curate tools tailored to your tasks and profile.',
      targetTab: 'wallet',
    },
    {
      id: 'radar',
      number: 6,
      name: 'AI RADAR',
      subtitle: 'Discover AI opportunities',
      status: !radarAccess.unlocked
        ? 'locked'
        : isRadarInvestigated
          ? 'completed'
          : isWalletCompleted
            ? 'current'
            : 'upcoming',
      description: 'Discover AI opportunities and tech shifts (Activity-Gated).',
      targetTab: 'radar',
    },
    {
      id: 'relevance',
      number: 7,
      name: 'AI RELEVANCE',
      subtitle: 'Why This Matters to You',
      status: !relevanceAccess.unlocked
        ? 'locked'
        : isRelevanceCompleted
          ? 'completed'
          : isRadarInvestigated
            ? 'current'
            : 'upcoming',
      description: 'Understand why emerging opportunities matter to your work (Activity-Gated).',
      targetTab: 'relevance',
    },
    {
      id: 'solver',
      number: 8,
      name: 'PROBLEM SOLVER',
      subtitle: 'Solve a Real Problem',
      status: !solverAccess.unlocked
        ? 'locked'
        : hasSolvedWorkflow
          ? 'completed'
          : isRelevanceCompleted
            ? 'current'
            : 'upcoming',
      description: 'Apply AI tools to derive workflows for real tasks (Activity-Gated).',
      targetTab: 'solver',
    },
    {
      id: 'build',
      number: 9,
      name: 'BUILD',
      subtitle: 'Create a Project',
      status: !buildAccess.unlocked
        ? 'locked'
        : hasBuildProject
          ? 'completed'
          : hasSolvedWorkflow
            ? 'current'
            : 'upcoming',
      description: 'Turn your solved workflows into reusable projects (Activity-Gated).',
      targetTab: 'build',
    },
    {
      id: 'improve',
      number: 10,
      name: 'IMPROVE',
      subtitle: 'Continuous Improvement',
      status: !mentorAccess.unlocked ? 'locked' : hasBuildProject ? 'current' : 'upcoming',
      description: 'Review updated insights and continuous growth guidance (Activity-Gated).',
      targetTab: 'mentor',
    },
  ];

  return {
    currentStageKey,
    currentStageTitle,
    nextActionTitle,
    nextActionReason,
    targetTab,
    actionButtonLabel,
    progressPercent,
    journeyStages,
  };
};

/**
 * Single-source-of-truth Journey Resolver for Personal Learning Home
 */
export const resolveJourneyState = (state: LearnerState): ResolvedJourney => {
  const isAssessmentCompleted = state.assessment?.status === 'completed';
  const isAnalysisViewed =
    state.analysis?.status === 'viewed' ||
    state.analysis?.status === 'generated' ||
    Boolean(state.analysis?.aiProfile);
  const isAnalysisUnlocked = state.analysis?.status !== 'locked';
  const isClarityCompleted =
    state.clarity?.status === 'completed' ||
    (state.clarity?.completedTopics && state.clarity.completedTopics.length > 0);
  const isFocusActive = state.focus?.status === 'active' && Boolean(state.focus?.selectedTrack);
  const activeFocusTrack =
    state.focus?.selectedTrack || state.analysis?.growthArea || 'AI Workflow Design';
  const growthArea = state.analysis?.growthArea || 'AI Workflow Design';
  const topCapability = state.analysis?.topCapability || 'AI Literacy & Verification';
  const hasInvestigatedSignal =
    state.radar?.investigatedSignalIds && state.radar.investigatedSignalIds.length > 0;
  const isInvestigationCompleted = state.investigation?.status === 'completed';
  const isRelevanceUnlocked = state.relevance?.status !== 'locked';

  let currentStageKey = 'understand';
  let nextActionTitle = 'Discover your AI capability baseline.';
  let nextActionReason =
    'AIIMS needs to understand your usage habits, evaluation skills, and workflow patterns through a 25-question diagnostic.';
  let targetTab = 'assessment';
  let actionButtonLabel = 'Start Baseline Assessment (+50 Credits)';

  if (!isAssessmentCompleted) {
    currentStageKey = 'understand';
    nextActionTitle = 'Discover your AI capability baseline.';
    nextActionReason =
      'AIIMS needs to understand your usage habits, evaluation skills, and workflow patterns through a 25-question diagnostic.';
    targetTab = 'assessment';
    actionButtonLabel = 'Start Baseline Assessment (+50 Credits)';
  } else if (!isAnalysisViewed) {
    currentStageKey = 'learn';
    nextActionTitle = 'Review your AI profile analysis.';
    nextActionReason = `Your baseline assessment shows top capability in "${topCapability}" with a priority growth opportunity in "${growthArea}".`;
    targetTab = 'analysis';
    actionButtonLabel = 'View Profile Analysis';
  } else if (!isClarityCompleted && !isFocusActive) {
    currentStageKey = 'discover';
    const selectedTopic = state.clarity.selectedTopic || growthArea;
    nextActionTitle = `Build clarity around ${selectedTopic}.`;
    nextActionReason = `Strengthening your mental model in ${selectedTopic} provides the foundation for practical AI tool integration.`;
    targetTab = 'clarity';
    actionButtonLabel = 'Explore Clarity Hub';
  } else if (!isFocusActive) {
    currentStageKey = 'choose';
    nextActionTitle = `Choose your active learning focus track.`;
    nextActionReason = `Select an active capability track such as "${growthArea}" to anchor your signal investigations and real-world practice.`;
    targetTab = 'focus';
    actionButtonLabel = 'Decide Focus Track';
  } else if (!hasInvestigatedSignal) {
    currentStageKey = 'solve';
    nextActionTitle = `Investigate emerging AI shifts for ${activeFocusTrack}.`;
    nextActionReason = `Recent autonomous tool-calling and model breakthroughs directly impact your focus in ${activeFocusTrack}.`;
    targetTab = 'radar';
    actionButtonLabel = 'Investigate Radar Signals';
  } else if (!isInvestigationCompleted) {
    currentStageKey = 'build';
    nextActionTitle = 'Complete your technical signal investigation.';
    nextActionReason =
      'Record your evidence and reflection notes on how recent model advances change your everyday workflows.';
    targetTab = 'radar';
    actionButtonLabel = 'Continue Investigation';
  } else {
    currentStageKey = 'improve';
    nextActionTitle = 'Synthesize your AI relevance and action protocol.';
    nextActionReason = `Your profile, focus in ${activeFocusTrack}, and signal investigations are connected into a concrete action plan.`;
    targetTab = isRelevanceUnlocked ? 'relevance' : 'radar';
    actionButtonLabel = 'View Relevance Payoff';
  }

  const completedQuestionsCount = getCompletedQuestionsCount(state);
  const walletUnlocked = isWalletUnlocked(state);
  const isWalletCompleted =
    walletUnlocked &&
    ((state.aiWallet?.userTools?.length || 0) >= 3 ||
      (state.aiWallet as any)?.status === 'completed');

  const stagesDefinition = [
    {
      key: 'understand',
      label: 'Understand',
      sublabel: 'Baseline Assessment',
      targetTab: 'assessment',
      isCompleted: isAssessmentCompleted,
    },
    {
      key: 'learn',
      label: 'Profile',
      sublabel: 'Your AI Skills',
      targetTab: 'analysis',
      isCompleted: isAnalysisViewed,
    },
    {
      key: 'clarity',
      label: 'Clarity',
      sublabel: 'Your AI Goals',
      targetTab: 'clarity',
      isCompleted: isClarityCompleted,
    },
    {
      key: 'focus',
      label: 'Focus',
      sublabel: 'Your Focus Track',
      targetTab: 'focus',
      isCompleted: isFocusActive,
    },
    {
      key: 'wallet',
      label: 'Wallet',
      sublabel: 'Personalized AI Tools',
      targetTab: 'wallet',
      isCompleted: isWalletCompleted,
    },
    {
      key: 'radar',
      label: 'Radar',
      sublabel: 'Discover AI Opportunities',
      targetTab: 'radar',
      isCompleted: hasInvestigatedSignal,
    },
    {
      key: 'relevance',
      label: 'Relevance',
      sublabel: 'Why This Matters',
      targetTab: 'relevance',
      isCompleted: isRelevanceUnlocked,
    },
    {
      key: 'solver',
      label: 'Solver',
      sublabel: 'Solve a Problem',
      targetTab: 'solver',
      isCompleted: !!state.solver?.latestWorkflow,
    },
    {
      key: 'build',
      label: 'Build',
      sublabel: 'Create a Project',
      targetTab: 'build',
      isCompleted: (state.build?.projects?.length || 0) > 0,
    },
    {
      key: 'improve',
      label: 'Improve',
      sublabel: 'Continuous Mastery',
      targetTab: 'mentor',
      isCompleted: false,
    },
  ];

  const currentStageIndex = stagesDefinition.findIndex((s) => s.key === currentStageKey);

  const journeyStages: ResolvedJourneyStageItem[] = stagesDefinition.map((s, idx) => {
    let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
    if (s.isCompleted && idx < currentStageIndex) {
      status = 'completed';
    } else if (idx === currentStageIndex) {
      status = 'current';
    } else if (s.isCompleted) {
      status = 'completed';
    }
    return {
      key: s.key,
      label: s.label,
      sublabel: s.sublabel,
      status,
      targetTab: s.targetTab,
    };
  });

  const focusItem: DirectionItem = {
    category: 'FOCUS',
    title: isFocusActive ? activeFocusTrack : growthArea,
    status: isFocusActive ? 'Active Track' : 'Candidate Track',
    actionLabel: isFocusActive ? 'Manage' : 'Select',
    targetTab: 'focus',
  };

  const clarityStatusText = isClarityCompleted
    ? 'Completed'
    : state.clarity.selectedTopic
      ? `Exploring: ${state.clarity.selectedTopic}`
      : isAnalysisUnlocked
        ? 'Available'
        : 'Pending Baseline';

  const clarityItem: DirectionItem = {
    category: 'CLARITY',
    title: state.clarity.selectedTopic || growthArea,
    status: clarityStatusText,
    actionLabel: isClarityCompleted ? 'Review' : 'Continue',
    targetTab: 'clarity',
  };

  const profileStatusText = isAssessmentCompleted
    ? `Top: ${topCapability}`
    : '25-Question Diagnostic';

  const profileItem: DirectionItem = {
    category: 'PROFILE',
    title: isAssessmentCompleted ? 'Assessment Complete' : 'Baseline Pending',
    status: profileStatusText,
    actionLabel: isAssessmentCompleted ? 'View' : 'Start',
    targetTab: isAssessmentCompleted ? 'analysis' : 'assessment',
  };

  return {
    currentStageKey,
    currentStageIndex,
    currentStageLabel: stagesDefinition[currentStageIndex]?.label || 'Understand',
    nextActionTitle,
    nextActionReason,
    targetTab,
    actionButtonLabel,
    journeyStages,
    direction: {
      focus: focusItem,
      clarity: clarityItem,
      profile: profileItem,
    },
  };
};
