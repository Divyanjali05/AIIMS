import { RadarSignal } from '../types';
import { LearnerProfileContext } from './learnerProfileContext';

export interface LearnerRelevanceResult {
  signalId: string;
  relevanceCategory: 'directly_related' | 'growth_opportunity' | 'useful_background' | 'emerging_area';
  relevanceBadgeText: string;
  fact: string;
  interpretation: string;
  personalConnection: string;
  recommendedNextStep: string;
}

/**
 * Personal Relevance Engine
 * Evaluates a technical signal against the learner's normalized profile context.
 * Explicitly separates FACT, INTERPRETATION, PERSONAL CONNECTION, and NEXT STEP.
 */
export const evaluateSignalRelevance = (
  signal: RadarSignal,
  context: LearnerProfileContext
): LearnerRelevanceResult => {
  const activeFocus = context.focus.activeFocusTrack || 'AI Workflow Design';
  const growthArea = context.assessment.growthArea || 'AI Workflow Design';
  const topCapability = context.assessment.topCapability || 'AI Evaluation & Critical Assessment';
  const userNote = context.investigation.latestNote;
  const clarityReflection = context.clarity.latestReflection;

  let relevanceCategory: LearnerRelevanceResult['relevanceCategory'] = 'useful_background';
  let badgeText = `Useful background for ${activeFocus}`;

  const titleLower = signal.title.toLowerCase();
  const focusLower = activeFocus.toLowerCase();
  const growthLower = growthArea.toLowerCase();

  if (titleLower.includes(focusLower) || signal.summary.toLowerCase().includes(focusLower)) {
    relevanceCategory = 'directly_related';
    badgeText = `Directly related to your active focus: ${activeFocus}`;
  } else if (titleLower.includes(growthLower) || signal.summary.toLowerCase().includes(growthLower)) {
    relevanceCategory = 'growth_opportunity';
    badgeText = `Addresses your growth area: ${growthArea}`;
  } else {
    relevanceCategory = 'emerging_area';
    badgeText = `Emerging technical shift for ${context.profile.role}`;
  }

  // FACT: What source reported
  const fact = `SOURCE DATA (${signal.source || 'ArXiv & Technical Feeds'}): ${signal.title} — ${signal.summary}`;

  // INTERPRETATION: System technical understanding
  const interpretation = `AIIMS SYSTEM INTERPRETATION: ${signal.scaffold.whatChanged} This represents a shift from ${signal.scaffold.yesterday} to ${signal.scaffold.today}.`;

  // PERSONAL CONNECTION: Why it matters to this specific learner
  let personalConnection = `PERSONAL CONNECTION: Leverages your top strength in '${topCapability}' to address your growth area in '${growthArea}'.`;
  if (userNote) {
    personalConnection += ` Your investigation reflection noted: "${userNote}".`;
  } else if (clarityReflection) {
    personalConnection += ` Connects directly to your saved Clarity note: "${clarityReflection}".`;
  }

  // RECOMMENDED NEXT STEP
  const recommendedNextStep = `RECOMMENDED ACTION: Take one recurring task from your active focus track (${activeFocus}) and map a 3-step prompt verification protocol before delegating to an AI assistant.`;

  return {
    signalId: signal.id,
    relevanceCategory,
    relevanceBadgeText: badgeText,
    fact,
    interpretation,
    personalConnection,
    recommendedNextStep
  };
};
