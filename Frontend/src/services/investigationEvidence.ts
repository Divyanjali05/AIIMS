import { RadarSignal } from '../types';
import { LearnerProfileContext } from './learnerProfileContext';

export interface InvestigationEvidence {
  signalId: string;
  signalTitle: string;
  scaffold: {
    yesterday: string;
    today: string;
    whatChanged: string;
    whosAffected: string;
  };
  learnerObservation: string;
  completedAt: string;
  activeFocusTrack: string;
  topCapability: string;
  growthArea: string;
}

/**
 * Creates a structured evidence object from the learner's manual investigation.
 * The learner's own reasoning remains authoritative.
 */
export const createInvestigationEvidence = (
  signal: RadarSignal,
  learnerObservation: string,
  context: LearnerProfileContext
): InvestigationEvidence => {
  const nowStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return {
    signalId: signal.id,
    signalTitle: signal.title,
    scaffold: {
      yesterday: signal.scaffold.yesterday,
      today: signal.scaffold.today,
      whatChanged: signal.scaffold.whatChanged,
      whosAffected: signal.scaffold.whosAffected
    },
    learnerObservation,
    completedAt: nowStr,
    activeFocusTrack: context.focus.activeFocusTrack || 'AI Workflow Design',
    topCapability: context.assessment.topCapability,
    growthArea: context.assessment.growthArea
  };
};
