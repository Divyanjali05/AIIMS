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
 * the single recommended "Next Best Action" and 10-stage timeline.
 * Does NOT lock out modules; serves purely as actionable guidance.
 */
export const resolveLearnerNextAction = (state: LearnerState): LearnerNextAction => {
  const profileCtx = buildLearnerProfileContext(state);
  const isAssessmentDone = state.assessment.status === 'completed';
  const isAnalysisViewed = state.analysis.status === 'viewed' || state.analysis.status === 'unlocked';
  const toolCount = state.aiWallet?.userTools?.length || 0;
  const isClarityStarted = (state.clarity.completedTopics && state.clarity.completedTopics.length > 0) || state.clarity.status === 'completed';
  const isFocusActive = state.focus.status === 'active' && state.focus.selectedTrack !== null;
  const investigatedCount = state.radar?.investigatedSignalIds?.length || 0;
  const activeFocus = state.focus.selectedTrack || 'AI Workflow Design';
  const hasSolvedWorkflow = !!state.solver?.latestWorkflow;
  const hasBuildProject = (state.build?.projects?.length || 0) > 0;

  // Determine stage key and single recommended next action in 10-stage sequence
  let currentStageKey: LearnerNextAction['currentStageKey'] = 'assessment';
  let currentStageTitle = '1. UNDERSTAND AI';
  let nextActionTitle = 'Complete your AI baseline';
  let nextActionReason = 'Complete your 5-minute baseline diagnostic to unlock your personalized AI capability profile.';
  let targetTab = 'assessment';
  let actionButtonLabel = 'Start Baseline Assessment';
  let progressPercent = 10;

  if (!isAssessmentDone) {
    currentStageKey = 'assessment';
    currentStageTitle = '1. UNDERSTAND AI';
    nextActionTitle = 'Complete your AI baseline';
    nextActionReason = 'Complete your 5-minute baseline diagnostic to unlock your personalized AI capability profile.';
    targetTab = 'assessment';
    actionButtonLabel = 'Start Baseline Assessment';
    progressPercent = 10;
  } else if (!isAnalysisViewed) {
    currentStageKey = 'analysis';
    currentStageTitle = '2. MY AI PROFILE';
    nextActionTitle = 'Understand your AI profile';
    nextActionReason = `Your diagnostic is complete. Discover your top strength in ${profileCtx.assessment.topCapability} and primary growth area.`;
    targetTab = 'analysis';
    actionButtonLabel = 'View Your AI Profile';
    progressPercent = 20;
  } else if (toolCount < 2) {
    currentStageKey = 'wallet';
    currentStageTitle = '3. AI WALLET';
    nextActionTitle = 'Discover your AI tools';
    nextActionReason = `Explore AI tools that match your role and diagnostic profile. Understand what tools you should know and use.`;
    targetTab = 'wallet';
    actionButtonLabel = 'Open AI Wallet';
    progressPercent = 30;
  } else if (!isClarityStarted) {
    currentStageKey = 'clarity';
    currentStageTitle = '4. CLARITY';
    nextActionTitle = 'Clarify your AI goals';
    nextActionReason = `Now that you have explored tools in your Wallet, clarify what you actually want AI to help you accomplish in your work.`;
    targetTab = 'clarity';
    actionButtonLabel = 'Build My AI Direction';
    progressPercent = 40;
  } else if (!isFocusActive) {
    currentStageKey = 'focus';
    currentStageTitle = '5. FOCUS';
    nextActionTitle = 'Select your AI focus track';
    nextActionReason = `Choose your primary area of concentration right now to prioritize active guidance and radar opportunities.`;
    targetTab = 'focus';
    actionButtonLabel = 'Select Focus Track';
    progressPercent = 50;
  } else if (investigatedCount === 0) {
    currentStageKey = 'radar';
    currentStageTitle = '6. AI RADAR';
    nextActionTitle = "Explore what's changing in AI";
    nextActionReason = `Discover technical shifts and emerging opportunities relevant to your focus track (${activeFocus}).`;
    targetTab = 'radar';
    actionButtonLabel = 'Explore AI Radar';
    progressPercent = 60;
  } else if (state.investigation.selectedSignalId && state.investigation.status !== 'completed') {
    currentStageKey = 'relevance';
    currentStageTitle = '7. AI RELEVANCE';
    nextActionTitle = 'Understand why this shift matters to you';
    nextActionReason = 'Review how your active focus and evaluated tools connect with emerging ecosystem developments.';
    targetTab = 'relevance';
    actionButtonLabel = 'View Relevance Report';
    progressPercent = 70;
  } else if (!hasSolvedWorkflow) {
    currentStageKey = 'solver';
    currentStageTitle = '8. PROBLEM SOLVER';
    nextActionTitle = 'Apply AI to a real problem';
    nextActionReason = `Formulate a real task (e.g. analyzing customer feedback or coding agents) to receive a custom execution workflow.`;
    targetTab = 'solver';
    actionButtonLabel = 'Launch Problem Solver';
    progressPercent = 80;
  } else if (!hasBuildProject) {
    currentStageKey = 'build';
    currentStageTitle = '9. BUILD WORKSPACE';
    nextActionTitle = 'Turn your solution into a project';
    nextActionReason = `Transform your solved problem workflow into a reusable AI project or automated workflow.`;
    targetTab = 'build';
    actionButtonLabel = 'Open Build Workspace';
    progressPercent = 90;
  } else {
    currentStageKey = 'mentor';
    currentStageTitle = '10. IMPROVE CONTINUOUSLY';
    nextActionTitle = 'Review continuous mentorship';
    nextActionReason = `Refine your capabilities with AIIMS mentor feedback, credit rewards, and updated profile insights.`;
    targetTab = 'mentor';
    actionButtonLabel = 'Open Mentor Workspace';
    progressPercent = 98;
  }

  // Canonical 10-Stage Journey Array
  const journeyStages: JourneyStageItem[] = [
    {
      id: 'understand',
      number: 1,
      name: 'UNDERSTAND AI',
      subtitle: 'Baseline Assessment',
      status: isAssessmentDone ? 'completed' : 'current',
      description: 'Discover who you are as an AI user through baseline diagnostic assessment.',
      targetTab: 'assessment'
    },
    {
      id: 'profile',
      number: 2,
      name: 'MY AI PROFILE',
      subtitle: 'Diagnostic Report',
      status: isAnalysisViewed ? 'completed' : isAssessmentDone ? 'current' : 'upcoming',
      description: 'Understand your evaluation capabilities, strengths, and growth areas.',
      targetTab: 'analysis'
    },
    {
      id: 'wallet',
      number: 3,
      name: 'AI WALLET',
      subtitle: 'Tools & Discovery',
      status: toolCount >= 2 ? 'completed' : isAnalysisViewed ? 'current' : 'upcoming',
      description: 'Discover and evaluate relevant AI tools suited to your profile.',
      targetTab: 'wallet'
    },
    {
      id: 'clarity',
      number: 4,
      name: 'CLARITY',
      subtitle: 'Goals & Outcomes',
      status: isClarityStarted ? 'completed' : toolCount >= 2 ? 'current' : 'upcoming',
      description: 'Understand what you actually want AI to help you accomplish.',
      targetTab: 'clarity'
    },
    {
      id: 'focus',
      number: 5,
      name: 'FOCUS',
      subtitle: 'Current Attention Track',
      status: isFocusActive ? 'completed' : isClarityStarted ? 'current' : 'upcoming',
      description: 'Select your primary growth track to concentrate your attention.',
      targetTab: 'focus'
    },
    {
      id: 'radar',
      number: 6,
      name: 'AI RADAR',
      subtitle: 'Ecosystem Shifts',
      status: investigatedCount > 0 ? 'completed' : isFocusActive ? 'current' : 'upcoming',
      description: 'Discover AI changes, developments, and opportunities.',
      targetTab: 'radar'
    },
    {
      id: 'relevance',
      number: 7,
      name: 'AI RELEVANCE',
      subtitle: 'Personal Connection',
      status: investigatedCount > 0 ? 'completed' : 'upcoming',
      description: 'Understand why emerging Radar opportunities matter to you.',
      targetTab: 'relevance'
    },
    {
      id: 'solver',
      number: 8,
      name: 'PROBLEM SOLVER',
      subtitle: 'Real Task Solution',
      status: hasSolvedWorkflow ? 'completed' : investigatedCount > 0 ? 'current' : 'upcoming',
      description: 'Apply AI tools to solve real-world tasks and derive workflows.',
      targetTab: 'solver'
    },
    {
      id: 'build',
      number: 9,
      name: 'BUILD',
      subtitle: 'Projects & Workflows',
      status: hasBuildProject ? 'completed' : hasSolvedWorkflow ? 'current' : 'upcoming',
      description: 'Turn your solution into a reusable workflow or project template.',
      targetTab: 'build'
    },
    {
      id: 'improve',
      number: 10,
      name: 'IMPROVE',
      subtitle: 'Continuous Guidance',
      status: isAssessmentDone ? 'current' : 'upcoming',
      description: 'Update profile recommendations and refine skills continuously.',
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
