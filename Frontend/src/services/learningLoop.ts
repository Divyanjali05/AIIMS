/**
 * Learning Loop Event Extension Point — Standardized Learner Signals
 *
 * Captures learner journey interaction signals across assessment, analytics, clarity, focus,
 * AI Wallet, AI Radar, investigation, relevance, problem solver, and build screens.
 * Feeds back into profile context and personalized recommendations.
 */

export type LearningLoopEventType =
  | 'ASSESSMENT_COMPLETED'
  | 'ANALYTICS_VIEWED'
  | 'CLARITY_COMPLETED'
  | 'FOCUS_SELECTED'
  | 'WALLET_TOOL_ADDED'
  | 'WALLET_TOOL_EXPLORED'
  | 'WALLET_TOOL_COMPARED'
  | 'WALLET_TOOL_REMOVED'
  | 'WALLET_RECOMMENDATION_DISMISSED'
  | 'RADAR_VIEWED'
  | 'SIGNAL_SAVED'
  | 'INVESTIGATION_OPENED'
  | 'INVESTIGATION_COMPLETED'
  | 'RELEVANCE_VIEWED'
  | 'PROBLEM_SOLVED'
  | 'PROJECT_BUILT'
  // Legacy / Direct Wallet compatibility aliases
  | 'TOOL_ADDED'
  | 'TOOL_REMOVED'
  | 'FAMILIARITY_UPDATED'
  | 'RECOMMENDATION_DISMISSED'
  | 'TOOL_EXPLORED_DETAIL'
  | 'TOOLS_COMPARED'
  | 'RADAR_SIGNAL_INVESTIGATED';

export interface LearningLoopEvent {
  eventType: LearningLoopEventType;
  toolId?: string;
  category?: string;
  familiarity?: string;
  recommendationId?: string;
  signalId?: string;
  focusTrack?: string;
  clarityTopic?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

const eventLog: LearningLoopEvent[] = [];

export const trackLearningLoopEvent = (event: Omit<LearningLoopEvent, 'timestamp'>): LearningLoopEvent => {
  const fullEvent: LearningLoopEvent = {
    ...event,
    timestamp: new Date().toISOString()
  };

  eventLog.push(fullEvent);
  console.log(`[LearningLoop Signal] ${fullEvent.eventType}:`, fullEvent);

  return fullEvent;
};

export const getLearningLoopEvents = (): LearningLoopEvent[] => {
  return [...eventLog];
};
