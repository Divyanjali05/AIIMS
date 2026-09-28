import { LearnerState } from '../context/LearnerContext';
import { buildLearnerProfileContext } from './learnerProfileContext';

export interface JourneyStageItem {
  id: string;
  number: number;
  name: string;
  subtitle: string;
  status: 'completed' | 'current' | 'upcoming';
  description: string;
  targetTab: string;
}

export interface LearnerNextAction {
  currentStageKey: 'assessment' | 'analysis' | 'wallet' | 'clarity' | 'focus' | 'radar' | 'relevance' | 'solver' | 'build' | 'mentor';
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
  const isAssessmentDone = state.assessment.status === 'completed';
  const isAnalysisViewed = state.analysis.status === 'viewed'; // Must actually view profile, unlocked alone is NOT completed
  const isWalletExplored = (state.aiWallet?.userTools?.length || 0) >= 1;
  const isClarityCompleted = (state.clarity?.completedTopics?.length || 0) > 0 || state.clarity?.status === 'completed';
  const isFocusSelected = state.focus?.status === 'active' && state.focus?.selectedTrack !== null;
  const isRadarInvestigated = (state.radar?.investigatedSignalIds?.length || 0) > 0 || state.investigation?.status === 'completed';
  const isRelevanceCompleted = state.relevance?.status === 'completed';
  const hasSolvedWorkflow = !!state.solver?.latestWorkflow || (state.solver?.history?.length || 0) > 0;
  const hasBuildProject = (state.build?.projects?.length || 0) > 0;

  const activeFocus = state.focus?.selectedTrack || profileCtx.assessment.growthArea || 'AI Workflows';

  // Determine stage key and single recommended next action in canonical sequence
  let currentStageKey: LearnerNextAction['currentStageKey'] = 'assessment';
  let currentStageTitle = '1. UNDERSTAND AI';
  let nextActionTitle = 'Complete your AI assessment';
  let nextActionReason = 'Take your baseline diagnostic assessment to discover your AI skills and capability profile.';
  let targetTab = 'assessment';
  let actionButtonLabel = 'Start Assessment';
  let progressPercent = 10;

  if (!isAssessmentDone) {
    currentStageKey = 'assessment';
    currentStageTitle = '1. UNDERSTAND AI';
    nextActionTitle = 'Complete your AI assessment';
    nextActionReason = 'Take your baseline diagnostic assessment to discover your AI skills and capability profile.';
    targetTab = 'assessment';
    actionButtonLabel = 'Start Assessment';
    progressPercent = 10;
  } else if (!isAnalysisViewed) {
    currentStageKey = 'analysis';
    currentStageTitle = '2. MY AI PROFILE';
    nextActionTitle = 'View your AI profile';
    nextActionReason = `Your assessment is complete. Open your profile to see your top skill in ${profileCtx.assessment.topCapability} and growth areas.`;
    targetTab = 'analysis';
    actionButtonLabel = 'View Your AI Profile';
    progressPercent = 20;
  } else if (!isWalletExplored) {
    currentStageKey = 'wallet';
    currentStageTitle = '3. AI WALLET';
    nextActionTitle = 'Explore AI tools';
    nextActionReason = 'Discover AI tools that match your role and profile. Learn which tools you should know or use.';
    targetTab = 'wallet';
    actionButtonLabel = 'Explore AI Tools';
    progressPercent = 30;
  } else if (!isClarityCompleted) {
    currentStageKey = 'clarity';
    currentStageTitle = '4. CLARITY';
    nextActionTitle = 'Clarify your AI goals';
    nextActionReason = 'Define what you actually want AI to help you accomplish in your work and projects.';
    targetTab = 'clarity';
    actionButtonLabel = 'Clarify Your Goals';
    progressPercent = 40;
  } else if (!isFocusSelected) {
    currentStageKey = 'focus';
    currentStageTitle = '5. FOCUS';
    nextActionTitle = 'Choose your focus';
    nextActionReason = 'Select what area you want to concentrate on right now to personalize your radar opportunities.';
    targetTab = 'focus';
    actionButtonLabel = 'Choose Focus Track';
    progressPercent = 50;
  } else if (!isRadarInvestigated) {
    currentStageKey = 'radar';
    currentStageTitle = '6. AI RADAR';
    nextActionTitle = 'Explore an AI opportunity';
    nextActionReason = `Discover what's changing in AI and investigate opportunities relevant to your focus (${activeFocus}).`;
    targetTab = 'radar';
    actionButtonLabel = 'Explore AI Radar';
    progressPercent = 60;
  } else if (!isRelevanceCompleted) {
    currentStageKey = 'relevance';
    currentStageTitle = '7. AI RELEVANCE';
    nextActionTitle = 'Understand why it matters';
    nextActionReason = 'Review how your active focus and evaluated tools connect with emerging ecosystem developments.';
    targetTab = 'relevance';
    actionButtonLabel = 'View Relevance Breakdown';
    progressPercent = 70;
  } else if (!hasSolvedWorkflow) {
    currentStageKey = 'solver';
    currentStageTitle = '8. PROBLEM SOLVER';
    nextActionTitle = 'Solve a real problem';
    nextActionReason = 'Input a real task to derive required tool capabilities and an actionable execution workflow.';
    targetTab = 'solver';
    actionButtonLabel = 'Launch Problem Solver';
    progressPercent = 80;
  } else if (!hasBuildProject) {
    currentStageKey = 'build';
    currentStageTitle = '9. BUILD';
    nextActionTitle = 'Build something';
    nextActionReason = 'Transform your solved workflow into a reusable project or template.';
    targetTab = 'build';
    actionButtonLabel = 'Open Build Workspace';
    progressPercent = 90;
  } else {
    currentStageKey = 'mentor';
    currentStageTitle = '10. IMPROVE';
    nextActionTitle = 'See what Ainova learned';
    nextActionReason = 'Review updated learner insights and mentor recommendations based on your real activity.';
    targetTab = 'mentor';
    actionButtonLabel = 'See Learner Insights';
    progressPercent = 100;
  }

  // Canonical 10-Stage Journey Statuses
  const journeyStages: JourneyStageItem[] = [
    {
      id: 'understand',
      number: 1,
      name: 'UNDERSTAND AI',
      subtitle: 'Baseline Assessment',
      status: isAssessmentDone ? 'completed' : 'current',
      description: 'Discover your AI profile through baseline assessment.',
      targetTab: 'assessment'
    },
    {
      id: 'profile',
      number: 2,
      name: 'MY AI PROFILE',
      subtitle: 'Your AI Skills',
      status: isAnalysisViewed ? 'completed' : isAssessmentDone ? 'current' : 'upcoming',
      description: 'Understand your top AI skills and growth areas.',
      targetTab: 'analysis'
    },
    {
      id: 'wallet',
      number: 3,
      name: 'AI WALLET',
      subtitle: 'Your AI Tools',
      status: isWalletExplored ? 'completed' : isAnalysisViewed ? 'current' : 'upcoming',
      description: 'Discover and evaluate tools suited to your profile.',
      targetTab: 'wallet'
    },
    {
      id: 'clarity',
      number: 4,
      name: 'CLARITY',
      subtitle: 'Your AI Goals',
      status: isClarityCompleted ? 'completed' : isWalletExplored ? 'current' : 'upcoming',
      description: 'Define what you actually want AI to help you accomplish.',
      targetTab: 'clarity'
    },
    {
      id: 'focus',
      number: 5,
      name: 'FOCUS',
      subtitle: 'Your Focus Track',
      status: isFocusSelected ? 'completed' : isClarityCompleted ? 'current' : 'upcoming',
      description: 'Select your concentration area right now.',
      targetTab: 'focus'
    },
    {
      id: 'radar',
      number: 6,
      name: 'AI RADAR',
      subtitle: "What's Changing in AI",
      status: isRadarInvestigated ? 'completed' : isFocusSelected ? 'current' : 'upcoming',
      description: 'Discover AI opportunities and tech shifts.',
      targetTab: 'radar'
    },
    {
      id: 'relevance',
      number: 7,
      name: 'AI RELEVANCE',
      subtitle: 'Why This Matters to You',
      status: isRelevanceCompleted ? 'completed' : isRadarInvestigated ? 'current' : 'upcoming',
      description: 'Understand why emerging opportunities matter to your work.',
      targetTab: 'relevance'
    },
    {
      id: 'solver',
      number: 8,
      name: 'PROBLEM SOLVER',
      subtitle: 'Solve a Real Problem',
      status: hasSolvedWorkflow ? 'completed' : isRelevanceCompleted ? 'current' : 'upcoming',
      description: 'Apply AI tools to derive workflows for real tasks.',
      targetTab: 'solver'
    },
    {
      id: 'build',
      number: 9,
      name: 'BUILD',
      subtitle: 'Create a Project',
      status: hasBuildProject ? 'completed' : hasSolvedWorkflow ? 'current' : 'upcoming',
      description: 'Turn your solved workflows into reusable projects.',
      targetTab: 'build'
    },
    {
      id: 'improve',
      number: 10,
      name: 'IMPROVE',
      subtitle: 'What Ainova Learned',
      status: hasBuildProject ? 'completed' : isAssessmentDone ? 'current' : 'upcoming',
      description: 'Review updated insights and continuous growth guidance.',
      targetTab: 'mentor'
    }
  ];

  return {
    currentStageKey,
    currentStageTitle,
    nextActionTitle,
    nextActionReason,
    targetTab,
    actionButtonLabel,
    progressPercent,
    journeyStages
  };
};

/**
 * Single-source-of-truth Journey Resolver for Personal Learning Home
 */
export const resolveJourneyState = (state: LearnerState): ResolvedJourney => {
  const isAssessmentCompleted = state.assessment.status === 'completed';
  const isAnalysisViewed = state.analysis.status === 'viewed';
  const isAnalysisUnlocked = state.analysis.status !== 'locked';
  const isClarityCompleted =
    state.clarity.status === 'completed' ||
    (state.clarity.completedTopics && state.clarity.completedTopics.length > 0);
  const isFocusActive = state.focus.status === 'active' && Boolean(state.focus.selectedTrack);
  const activeFocusTrack = state.focus.selectedTrack || state.analysis.growthArea || 'AI Workflow Design';
  const growthArea = state.analysis.growthArea || 'AI Workflow Design';
  const topCapability = state.analysis.topCapability || 'AI Literacy & Verification';
  const hasInvestigatedSignal = (state.radar?.investigatedSignalIds && state.radar.investigatedSignalIds.length > 0);
  const isInvestigationCompleted = state.investigation.status === 'completed';
  const isRelevanceUnlocked = state.relevance.status !== 'locked';

  let currentStageKey = 'understand';
  let nextActionTitle = 'Discover your AI capability baseline.';
  let nextActionReason = 'AIIMS needs to understand your usage habits, evaluation skills, and workflow patterns through a 25-question diagnostic.';
  let targetTab = 'assessment';
  let actionButtonLabel = 'Start Baseline Assessment (+50 Credits)';

  if (!isAssessmentCompleted) {
    currentStageKey = 'understand';
    nextActionTitle = 'Discover your AI capability baseline.';
    nextActionReason = 'AIIMS needs to understand your usage habits, evaluation skills, and workflow patterns through a 25-question diagnostic.';
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
    nextActionReason = 'Record your evidence and reflection notes on how recent model advances change your everyday workflows.';
    targetTab = 'radar';
    actionButtonLabel = 'Continue Investigation';
  } else {
    currentStageKey = 'improve';
    nextActionTitle = 'Synthesize your AI relevance and action protocol.';
    nextActionReason = `Your profile, focus in ${activeFocusTrack}, and signal investigations are connected into a concrete action plan.`;
    targetTab = isRelevanceUnlocked ? 'relevance' : 'radar';
    actionButtonLabel = 'View Relevance Payoff';
  }

  const stagesDefinition = [
    {
      key: 'understand',
      label: 'Understand',
      sublabel: 'Baseline Diagnostic',
      targetTab: 'assessment',
      isCompleted: isAssessmentCompleted
    },
    {
      key: 'learn',
      label: 'Learn',
      sublabel: 'Profile Report',
      targetTab: 'analysis',
      isCompleted: isAnalysisViewed
    },
    {
      key: 'discover',
      label: 'Discover',
      sublabel: 'Clarity Hub',
      targetTab: 'clarity',
      isCompleted: isClarityCompleted
    },
    {
      key: 'choose',
      label: 'Choose',
      sublabel: 'Focus Track',
      targetTab: 'focus',
      isCompleted: isFocusActive
    },
    {
      key: 'solve',
      label: 'Solve',
      sublabel: 'AI Radar',
      targetTab: 'radar',
      isCompleted: hasInvestigatedSignal
    },
    {
      key: 'build',
      label: 'Build',
      sublabel: 'Investigation',
      targetTab: 'radar',
      isCompleted: isInvestigationCompleted
    },
    {
      key: 'improve',
      label: 'Improve',
      sublabel: 'Relevance Synthesis',
      targetTab: 'relevance',
      isCompleted: isInvestigationCompleted && isRelevanceUnlocked
    }
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
      targetTab: s.targetTab
    };
  });

  const focusItem: DirectionItem = {
    category: 'FOCUS',
    title: isFocusActive ? activeFocusTrack : growthArea,
    status: isFocusActive ? 'Active Track' : 'Candidate Track',
    actionLabel: isFocusActive ? 'Manage' : 'Select',
    targetTab: 'focus'
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
    targetTab: 'clarity'
  };

  const profileStatusText = isAssessmentCompleted
    ? `Top: ${topCapability}`
    : '25-Question Diagnostic';

  const profileItem: DirectionItem = {
    category: 'PROFILE',
    title: isAssessmentCompleted ? 'Assessment Complete' : 'Baseline Pending',
    status: profileStatusText,
    actionLabel: isAssessmentCompleted ? 'View' : 'Start',
    targetTab: isAssessmentCompleted ? 'analysis' : 'assessment'
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
      profile: profileItem
    }
  };
};
