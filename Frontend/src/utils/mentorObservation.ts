import { LearnerState } from '../context/LearnerContext';

export interface MentorObservation {
  title: string;
  message: string;
  primaryTabTarget: string;
  primaryCtaText: string;
  contextualTag: string;
}

export const getMentorObservation = (state: LearnerState): MentorObservation => {
  const isAssessmentCompleted = state.assessment.status === 'completed';
  const isAnalysisViewed = state.analysis.status === 'viewed' || state.analysis.status === 'unlocked';
  const clarityStatus = state.clarity.status;
  const selectedClarityTopic = state.clarity.selectedTopic;
  const completedTopics = state.clarity.completedTopics || [];
  const isFocusActive = state.focus.status === 'active' && state.focus.selectedTrack !== null;
  const activeFocusTrack = state.focus.selectedTrack;
  const investigatedSignalIds = state.radar.investigatedSignalIds || [];
  const isInvestigationDone = state.investigation.status === 'completed';
  const isRelevanceUnlocked = state.relevance.status !== 'locked';

  // 1. Assessment not started or in progress
  if (!isAssessmentCompleted) {
    const answeredCount = Object.keys(state.assessment.answers || {}).length;
    if (answeredCount > 0) {
      return {
        title: 'AIIMS MENTOR OBSERVATION',
        message: `I noticed you've answered ${answeredCount} of 25 questions in your baseline assessment. Continuing will allow AIIMS to construct your personal capability profile.`,
        primaryTabTarget: 'assessment',
        primaryCtaText: 'Resume Assessment',
        contextualTag: `Assessment in Progress (${answeredCount}/25)`
      };
    }
    return {
      title: 'AIIMS MENTOR OBSERVATION',
      message: 'Your AI journey begins with understanding where you are today. Complete your baseline assessment to reveal how you approach AI usage, evaluation, and workflow design.',
      primaryTabTarget: 'assessment',
      primaryCtaText: 'Start Assessment',
      contextualTag: 'Baseline Assessment Pending'
    };
  }

  // 2. Assessment completed but Analysis not viewed
  if (!isAnalysisViewed) {
    return {
      title: 'AIIMS MENTOR OBSERVATION',
      message: `Your assessment is complete! AIIMS identified '${state.analysis.topCapability}' as your top capability, and '${state.analysis.growthArea}' as a key growth opportunity.`,
      primaryTabTarget: 'analysis',
      primaryCtaText: 'Reveal My Analysis',
      contextualTag: 'Analysis Unlocked'
    };
  }

  // 3. Relevance completed loop
  if (isRelevanceUnlocked && isInvestigationDone) {
    return {
      title: 'AIIMS MENTOR OBSERVATION',
      message: `You've completed a full AIIMS intelligence loop connecting market shifts with your active focus in '${activeFocusTrack}'. Continue investigating new signals or choose a new focus track when ready.`,
      primaryTabTarget: 'relevance',
      primaryCtaText: 'View AI Relevance Map',
      contextualTag: 'Intelligence Loop Active'
    };
  }

  // 4. Investigation in progress or completed
  if (isInvestigationDone) {
    return {
      title: 'AIIMS MENTOR OBSERVATION',
      message: 'Your signal investigation reflection is recorded! See how this technical shift connects directly to your career focus in AI Relevance.',
      primaryTabTarget: 'relevance',
      primaryCtaText: 'See Why It Matters',
      contextualTag: 'Investigation Complete'
    };
  }

  if (investigatedSignalIds.length > 0 || state.investigation.selectedSignalId) {
    return {
      title: 'AIIMS MENTOR OBSERVATION',
      message: 'You have selected a market signal for investigation. Work through the 4-part framework and record your personal observations.',
      primaryTabTarget: 'investigation',
      primaryCtaText: 'Continue Investigation',
      contextualTag: 'Investigation in Progress'
    };
  }

  // 5. Focus activated
  if (isFocusActive && activeFocusTrack) {
    return {
      title: 'AIIMS MENTOR OBSERVATION',
      message: `Your active priority focus is '${activeFocusTrack}'. Explore real-time signals in AI Radar relevant to this track.`,
      primaryTabTarget: 'radar',
      primaryCtaText: 'Explore AI Radar',
      contextualTag: `Active Focus: ${activeFocusTrack}`
    };
  }

  // 6. Clarity completed or in progress
  if (clarityStatus === 'completed' || completedTopics.length > 0) {
    const topic = completedTopics[0] || selectedClarityTopic || 'AI Workflow Design';
    return {
      title: 'AIIMS MENTOR OBSERVATION',
      message: `You have built clarity around '${topic}'. Your next useful step is to decide whether this area deserves your primary focus now.`,
      primaryTabTarget: 'focus',
      primaryCtaText: 'Decide Your Focus',
      contextualTag: `Clarity Built: ${topic}`
    };
  }

  if (selectedClarityTopic) {
    return {
      title: 'AIIMS MENTOR OBSERVATION',
      message: `You are currently exploring '${selectedClarityTopic}'. Complete the concept, example, and reflection to build personal clarity.`,
      primaryTabTarget: 'clarity',
      primaryCtaText: `Continue Exploring ${selectedClarityTopic}`,
      contextualTag: `Exploring: ${selectedClarityTopic}`
    };
  }

  // 7. Default Analysis viewed state -> Explore Clarity
  return {
    title: 'AIIMS MENTOR OBSERVATION',
    message: `Your analysis identified '${state.analysis.growthArea}' as a priority growth area. Open Clarity to explore what this concept means for your work.`,
    primaryTabTarget: 'clarity',
    primaryCtaText: 'Explore Clarity',
    contextualTag: `Opportunity: ${state.analysis.growthArea}`
  };
};
