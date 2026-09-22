import { RadarSignal } from '../types';
import { LearnerProfileContext } from './learnerProfileContext';

/**
 * Configurable Rule Weights for AI Relevance Engine
 * Explains how different learner context signals contribute to overall signal relevance.
 */
export const RELEVANCE_WEIGHTS = {
  /** Signal directly aligns with learner's active focus track */
  focusMatch: 35,
  /** Signal aligns with learner's completed or selected Clarity topics & goals */
  clarityMatch: 25,
  /** Signal category connects with tools already in learner's AI Wallet */
  walletDomainMatch: 20,
  /** Signal matches learning history & diagnostic profile scores */
  learningHistoryMatch: 15,
  /** Baseline presence as an emerging AI ecosystem development */
  baseEcosystem: 5
};

export type QualitativeRelevanceTier = 'Highly Relevant' | 'Relevant' | 'Possibly Useful';

export interface LearnerRelevanceResult {
  signalId: string;
  relevanceScore: number;
  qualitativeTier: QualitativeRelevanceTier;
  explanation: string; // WHY?
  personalConnection: string; // WHAT DOES IT CONNECT TO?
  recommendedAction: string; // WHAT CAN I DO?
  attributionReason: string; // "Because you are focused on..."
  relatedSkill: string;
  relatedTask: string;
  relevanceBadgeText: string;
  fact: string;
  interpretation: string;
  recommendedNextStep: string;
}

/**
 * Personal AI Relevance Engine
 * Evaluates an emerging technical signal against multi-signal learner profile context:
 * Assessment, AI Profile, Wallet tools, Tool familiarity, Clarity, Focus, Learning history.
 */
export const evaluateSignalRelevance = (
  signal: RadarSignal,
  context: LearnerProfileContext
): LearnerRelevanceResult => {
  const activeFocus = context.focus.activeFocusTrack || 'AI Workflow Design';
  const growthArea = context.assessment.growthArea || 'AI Workflow Design';
  const topCapability = context.assessment.topCapability || 'AI Evaluation & Critical Scrutiny';
  const clarityTopic = context.clarity.selectedTopic || (context.clarity.completedTopics && context.clarity.completedTopics[0]) || null;
  const userNote = context.investigation.latestNote;
  const clarityReflection = context.clarity.latestReflection;
  const walletCategories = context.aiWallet.primaryCategories || [];
  const userRole = context.profile.role || 'AI Learner';

  let calculatedScore = RELEVANCE_WEIGHTS.baseEcosystem; // Start with baseline (5)

  const titleLower = signal.title.toLowerCase();
  const summaryLower = signal.summary.toLowerCase();
  const focusLower = activeFocus.toLowerCase();
  const growthLower = growthArea.toLowerCase();
  const categoryLower = signal.category.toLowerCase();
  const clarityLower = clarityTopic ? clarityTopic.toLowerCase() : '';

  const isFocusMatch = titleLower.includes(focusLower) || summaryLower.includes(focusLower) || categoryLower.includes(focusLower);
  const isClarityMatch = clarityTopic ? (titleLower.includes(clarityLower) || summaryLower.includes(clarityLower) || categoryLower.includes(clarityLower)) : false;
  const isGrowthMatch = titleLower.includes(growthLower) || summaryLower.includes(growthLower) || categoryLower.includes(growthLower);
  const isWalletMatch = walletCategories.some((cat) => titleLower.includes(cat.toLowerCase()) || summaryLower.includes(cat.toLowerCase()));

  if (isFocusMatch) calculatedScore += RELEVANCE_WEIGHTS.focusMatch;
  if (isClarityMatch) calculatedScore += RELEVANCE_WEIGHTS.clarityMatch;
  if (isGrowthMatch) calculatedScore += RELEVANCE_WEIGHTS.learningHistoryMatch;
  if (isWalletMatch) calculatedScore += RELEVANCE_WEIGHTS.walletDomainMatch;

  // Cap score at 100
  const relevanceScore = Math.min(100, calculatedScore);

  // Determine single canonical qualitative tier
  let qualitativeTier: QualitativeRelevanceTier = 'Possibly Useful';
  let badgeText = `Possibly Useful`;

  if (relevanceScore >= 60) {
    qualitativeTier = 'Highly Relevant';
    badgeText = `Highly Relevant • Focus: ${activeFocus}`;
  } else if (relevanceScore >= 35) {
    qualitativeTier = 'Relevant';
    badgeText = `Relevant • ${isWalletMatch ? 'Connects to your Wallet tools' : 'Connects to your growth targets'}`;
  } else {
    qualitativeTier = 'Possibly Useful';
    badgeText = `Possibly Useful • Ecosystem Shift`;
  }

  // Dynamic Attribution Reason ("Because you...")
  let attributionReason = `Because you are exploring ${userRole} workflows in AIIMS.`;
  if (isFocusMatch) {
    attributionReason = `Because you are focused on ${activeFocus}...`;
  } else if (isClarityMatch) {
    attributionReason = `Because this opportunity connects to your stated goal in ${clarityTopic}...`;
  } else if (isWalletMatch) {
    attributionReason = `Because your current toolkit includes tools in related categories (${walletCategories[0] || 'AI Tools'})...`;
  } else if (isGrowthMatch) {
    attributionReason = `Because your diagnostic profile identified ${growthArea} as an opportunity...`;
  }

  // 1. WHY? (Explanation)
  let explanation = `${attributionReason} This development represents an actionable shift for your daily workflow.`;

  // 2. WHAT DOES IT CONNECT TO? (Personal Connection)
  let personalConnection = `Connects your baseline evaluation strength in '${topCapability}' with your focus in '${activeFocus}'.`;
  if (userNote) {
    personalConnection += ` Your investigation note recorded: "${userNote}".`;
  } else if (clarityReflection) {
    personalConnection += ` Connects to your Clarity note: "${clarityReflection}".`;
  }

  // 3. WHAT CAN I DO? (Recommended Action)
  const relatedSkill = signal.capabilities && signal.capabilities.length > 0 ? signal.capabilities[0] : 'AI Workflow Design';
  const relatedTask = signal.recommendedTasks && signal.recommendedTasks.length > 0 ? signal.recommendedTasks[0] : 'Workflow Automation';
  const recommendedAction = `Test this capability against one task in ${activeFocus} before delegating to your AI Wallet tools.`;

  // FACT & INTERPRETATION
  const fact = `SOURCE DATA (${signal.source || 'ArXiv & Industry Bulletins'}): ${signal.title} — ${signal.summary}`;
  const interpretation = `AIIMS SYSTEM INTERPRETATION: ${signal.scaffold.whatChanged} Shifted from "${signal.scaffold.yesterday}" to "${signal.scaffold.today}".`;
  const recommendedNextStep = `RECOMMENDED ACTION: ${recommendedAction}`;

  return {
    signalId: signal.id,
    relevanceScore,
    qualitativeTier,
    explanation,
    personalConnection,
    recommendedAction,
    attributionReason,
    relatedSkill,
    relatedTask,
    relevanceBadgeText: badgeText,
    fact,
    interpretation,
    recommendedNextStep
  };
};
