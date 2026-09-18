import { LearnerState } from '../context/LearnerContext';

/**
 * LearnerProfileContext — Derived Intelligence Context
 *
 * This context provides a normalized, privacy-scoped representation of the learner's
 * current state to AI services (mentor, relevance engine, signal recommendation).
 * It is dynamically derived from LearnerState and is NEVER duplicated as a parallel persistent state.
 */

export interface LearnerProfileContext {
  profile: {
    name: string;
    role: string;
    targetGoal: string;
    stage: string;
  };
  assessment: {
    isCompleted: boolean;
    completedAt: string | null;
    scores: {
      usageFrequency: number;
      evaluationCapability: number;
      workflowDesign: number;
      strategicVision: number;
      mentorshipReadiness: number;
    };
    topCapability: string;
    growthArea: string;
    answeredQuestionsCount: number;
  };
  clarity: {
    status: string;
    selectedTopic: string | null;
    completedTopics: string[];
    reflectionsCount: number;
    latestReflection: string | null;
  };
  focus: {
    status: string;
    activeFocusTrack: string | null;
    candidateFocusTrack: string | null;
    history: string[];
    activatedAt: string | null;
  };
  radar: {
    followedSignalCount: number;
    investigatedSignalIds: string[];
  };
  investigation: {
    isCompleted: boolean;
    selectedSignalId: string | null;
    userNotesCount: number;
    latestNote: string | null;
  };
  relevance: {
    status: string;
  };
  journeyProgress: {
    completedStagesCount: number;
    currentStageName: string;
    progressPercent: number;
    statusLabel: string;
  };
}

export const buildLearnerProfileContext = (state: LearnerState): LearnerProfileContext => {
  const isAssessmentCompleted = state.assessment.status === 'completed';
  const scores = state.assessment.scores || {
    usageFrequency: 0,
    evaluationCapability: 0,
    workflowDesign: 0,
    strategicVision: 0,
    mentorshipReadiness: 0
  };

  const topCapability = state.analysis.topCapability || 'AI Evaluation & Critical Assessment';
  const growthArea = state.analysis.growthArea || 'AI Workflow Design';

  const selectedClarityTopic = state.clarity.selectedTopic || null;
  const completedTopics = state.clarity.completedTopics || [];

  const reflections = state.clarity.reflections || {};
  const reflectionsCount = Object.keys(reflections).length;
  const latestReflection = selectedClarityTopic ? reflections[selectedClarityTopic] || null : null;

  const isFocusActive = state.focus.status === 'active' && state.focus.selectedTrack !== null;
  const activeFocusTrack = state.focus.selectedTrack || null;
  const candidateFocusTrack = selectedClarityTopic || completedTopics[0] || (state.clarity.selectedAreas && state.clarity.selectedAreas[0]) || growthArea;

  const investigatedSignalIds = state.radar.investigatedSignalIds || [];
  const userNotes = state.investigation.userNotes || {};
  const selectedSignalId = state.investigation.selectedSignalId || null;
  const latestNote = selectedSignalId ? userNotes[selectedSignalId] || null : null;

  // Calculate dynamic stage progress
  let completedCount = 0;
  let currentStageName = 'Assessment';
  let progressPercent = 0;
  let statusLabel = '0% (Baseline Pending)';

  if (isAssessmentCompleted) {
    completedCount = 1;
    currentStageName = 'Analysis';
    progressPercent = 15;
    statusLabel = '15% (Analysis Ready)';
  }

  if (state.analysis.status === 'viewed' || state.analysis.status === 'unlocked') {
    if (completedTopics.length > 0 || state.clarity.status === 'completed') {
      completedCount = 2;
      currentStageName = 'Focus';
      progressPercent = 35;
      statusLabel = '35% (Clarity Built)';
    }
  }

  if (isFocusActive) {
    completedCount = 3;
    currentStageName = 'AI Radar';
    progressPercent = 50;
    statusLabel = `50% (Focus Active: ${activeFocusTrack})`;
  }

  if (investigatedSignalIds.length > 0) {
    completedCount = 4;
    currentStageName = 'Investigation';
    progressPercent = 70;
    statusLabel = '70% (Radar Active)';
  }

  if (state.investigation.status === 'completed') {
    completedCount = 5;
    currentStageName = 'AI Relevance';
    progressPercent = 85;
    statusLabel = '85% (Investigation Complete)';
  }

  if (state.relevance.status !== 'locked' && state.investigation.status === 'completed') {
    completedCount = 6;
    currentStageName = 'AI Relevance Payoff';
    progressPercent = 100;
    statusLabel = '100% (Intelligence Loop Complete)';
  }

  return {
    profile: {
      name: state.profile?.name || 'Learner',
      role: state.profile?.role || 'Student / AI Learner',
      targetGoal: state.profile?.targetGoal || 'Master AI Intelligence & Mentoring',
      stage: state.profile?.stage || 'Knowing'
    },
    assessment: {
      isCompleted: isAssessmentCompleted,
      completedAt: state.assessment.completedAt,
      scores,
      topCapability,
      growthArea,
      answeredQuestionsCount: Object.keys(state.assessment.answers || {}).length
    },
    clarity: {
      status: state.clarity.status,
      selectedTopic: selectedClarityTopic,
      completedTopics,
      reflectionsCount,
      latestReflection
    },
    focus: {
      status: state.focus.status,
      activeFocusTrack,
      candidateFocusTrack,
      history: state.focus.history || [],
      activatedAt: state.focus.activatedAt
    },
    radar: {
      followedSignalCount: 0,
      investigatedSignalIds
    },
    investigation: {
      isCompleted: state.investigation.status === 'completed',
      selectedSignalId,
      userNotesCount: Object.keys(userNotes).length,
      latestNote
    },
    relevance: {
      status: state.relevance.status
    },
    journeyProgress: {
      completedStagesCount: completedCount,
      currentStageName,
      progressPercent,
      statusLabel
    }
  };
};
