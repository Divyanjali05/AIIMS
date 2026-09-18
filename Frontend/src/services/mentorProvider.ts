import { LearnerProfileContext } from './learnerProfileContext';
import { getMentorObservation } from '../utils/mentorObservation';
import { LearnerState } from '../context/LearnerContext';

export interface MentorResponse {
  message: string;
  observationType: 'orientation' | 'observation' | 'clarification' | 'encouragement' | 'connection' | 'investigation' | 'reflection' | 'nextStep';
  relatedStage: string;
  relatedTopic?: string;
  suggestedAction?: {
    text: string;
    targetTab: string;
  };
  questionPrompt?: string;
  provider: 'deterministic' | 'ai_service';
}

export interface MentorTurn {
  id: string;
  role: 'mentor' | 'learner';
  message: string;
  observationType: MentorResponse['observationType'];
  relatedStage: string;
  relatedTopic?: string;
  suggestedAction?: MentorResponse['suggestedAction'];
  questionPrompt?: string;
  createdAt: string;
  provider: 'deterministic' | 'ai_service';
}

export interface IMentorProvider {
  getObservation(context: LearnerProfileContext, rawState: LearnerState, customPrompt?: string): Promise<MentorResponse>;
}

/**
 * Validates model output against expected bounds and types.
 */
export const validateMentorResponse = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;
  if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0) return false;
  if (data.message.length > 600) return false; // Max response length safeguard
  return true;
};

/**
 * DeterministicMentorProvider — Reliable Local Fallback Engine with Reflective Questions
 */
export class DeterministicMentorProvider implements IMentorProvider {
  public async getObservation(context: LearnerProfileContext, rawState: LearnerState, customPrompt?: string): Promise<MentorResponse> {
    const localObs = getMentorObservation(rawState);
    const stage = context.journeyProgress.currentStageName;

    // Stage-specific reflective questions
    let questionPrompt: string | undefined = undefined;
    if (stage === 'Analysis') {
      questionPrompt = `Looking at your top capability in ${context.assessment.topCapability}, is this a strength you actively lean on daily, or one you want to formalize?`;
    } else if (stage === 'Focus') {
      questionPrompt = `Before setting ${context.focus.activeFocusTrack || context.assessment.growthArea} as your focus, what specific outcome would make this investment worthwhile?`;
    } else if (stage === 'AI Radar' || stage === 'Investigation') {
      questionPrompt = `What evidence or verification would you require before trusting this technical shift in your work?`;
    } else if (stage === 'AI Relevance Payoff') {
      questionPrompt = `What part of this technical change would actually affect the way you approach your next project?`;
    }

    if (customPrompt) {
      return {
        message: `Regarding "${customPrompt}": Based on your profile context (${context.assessment.topCapability}), focus on how this connects with your active track in ${context.focus.activeFocusTrack || context.assessment.growthArea}.`,
        observationType: 'clarification',
        relatedStage: stage,
        relatedTopic: context.focus.activeFocusTrack || context.assessment.growthArea,
        suggestedAction: {
          text: localObs.primaryCtaText,
          targetTab: localObs.primaryTabTarget
        },
        questionPrompt,
        provider: 'deterministic'
      };
    }

    return {
      message: localObs.message,
      observationType: 'observation',
      relatedStage: stage,
      relatedTopic: context.focus.activeFocusTrack || context.assessment.growthArea,
      suggestedAction: {
        text: localObs.primaryCtaText,
        targetTab: localObs.primaryTabTarget
      },
      questionPrompt,
      provider: 'deterministic'
    };
  }
}

/**
 * AIMentorProvider — AI Service Boundary Provider
 */
export class AIMentorProvider implements IMentorProvider {
  public async getObservation(context: LearnerProfileContext, _rawState: LearnerState, customPrompt?: string): Promise<MentorResponse> {
    const payload = {
      role: context.profile.role,
      stage: context.journeyProgress.currentStageName,
      topCapability: context.assessment.topCapability,
      growthArea: context.assessment.growthArea,
      activeFocus: context.focus.activeFocusTrack,
      clarityTopic: context.clarity.selectedTopic,
      hasReflection: !!context.clarity.latestReflection,
      hasInvestigation: context.investigation.isCompleted,
      customPrompt
    };

    const response = await fetch('/api/ai/mentor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`AI Mentor API HTTP error ${response.status}`);
    }

    const data = await response.json();
    if (!validateMentorResponse(data)) {
      throw new Error('AI Mentor API returned malformed or non-compliant response');
    }

    return {
      message: data.message,
      observationType: data.observationType || 'observation',
      relatedStage: data.relatedStage || context.journeyProgress.currentStageName,
      relatedTopic: data.relatedTopic || context.focus.activeFocusTrack || undefined,
      suggestedAction: data.suggestedAction || undefined,
      questionPrompt: data.questionPrompt || undefined,
      provider: 'ai_service'
    };
  }
}

/**
 * MentorService — Singleton Orchestrator with Observability Logging & Automatic Fallback
 */
export class MentorService {
  private static deterministicProvider = new DeterministicMentorProvider();
  private static aiProvider = new AIMentorProvider();

  public static async getMentorObservation(
    context: LearnerProfileContext,
    rawState: LearnerState,
    customPrompt?: string
  ): Promise<MentorResponse> {
    const TIMEOUT_MS = 2500;

    try {
      const aiPromise = MentorService.aiProvider.getObservation(context, rawState, customPrompt);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI Mentor Service request timed out')), TIMEOUT_MS)
      );

      const response = await Promise.race([aiPromise, timeoutPromise]);
      console.log(`[AIIMS MentorService] Provider: ai_service | Stage: ${context.journeyProgress.currentStageName} | Validated: true`);
      return response;
    } catch (e) {
      console.warn(`[AIIMS MentorService] Fallback activated: ${(e as Error).message} -> Falling back to DeterministicMentorProvider`);
      return await MentorService.deterministicProvider.getObservation(context, rawState, customPrompt);
    }
  }
}
