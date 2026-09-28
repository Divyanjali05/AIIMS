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
