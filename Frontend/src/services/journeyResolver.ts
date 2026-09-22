import { LearnerState } from '../context/LearnerContext';

export interface JourneyStageItem {
  key: 'understand' | 'learn' | 'discover' | 'choose' | 'solve' | 'build' | 'improve';
  label: string;
  sublabel: string;
  status: 'completed' | 'current' | 'upcoming';
  targetTab: string;
}

export interface DirectionItem {
  category: 'FOCUS' | 'CLARITY' | 'PROFILE';
  title: string;
  status: string;
  actionLabel: string;
  targetTab: string;
}

export interface ResolvedJourney {
  currentStageKey: 'understand' | 'learn' | 'discover' | 'choose' | 'solve' | 'build' | 'improve';
  currentStageIndex: number;
  currentStageLabel: string;
  nextActionTitle: string;
  nextActionReason: string;
  targetTab: string;
  actionButtonLabel: string;
  journeyStages: JourneyStageItem[];
  direction: {
    focus: DirectionItem;
    clarity: DirectionItem;
    profile: DirectionItem;
  };
}

/**
 * Single-source-of-truth Journey Resolver for AIIMS
 * Resolves current stage, next step headline, reason, and direction summary.
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
  const hasInvestigatedSignal = (state.radar.investigatedSignalIds && state.radar.investigatedSignalIds.length > 0);
  const isInvestigationCompleted = state.investigation.status === 'completed';
  const isRelevanceUnlocked = state.relevance.status !== 'locked';

  // Determine current active stage index (0 to 6)
  let currentStageKey: ResolvedJourney['currentStageKey'] = 'understand';
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

  // Define the 7-stage horizontal journey sequence
  const stagesDefinition: Array<{ key: ResolvedJourney['currentStageKey']; label: string; sublabel: string; targetTab: string; isCompleted: boolean }> = [
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

  const journeyStages: JourneyStageItem[] = stagesDefinition.map((s, idx) => {
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

  // Current direction items (Focus, Clarity, Profile)
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
