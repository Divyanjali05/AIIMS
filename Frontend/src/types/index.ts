export type ProgressionStage = 'Knowing' | 'Understanding' | 'Recognising' | 'Applying' | 'Adapting';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  targetGoal: string;
  stage: ProgressionStage;
  xpPoints: number;
  aiimsCredits: number;
}

export interface DimensionScore {
  dimension: string;
  score: number;
  benchmark: number;
}

export interface CapabilityGap {
  id: string;
  capabilityArea: string;
  currentLevel: number;
  targetLevel: number;
  aiInterpretation: string;
  mentorOverride?: string;
  isOverridden: boolean;
}

export interface FocusArea {
  id: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  aiReasoning: string;
  mentorOverride?: string;
  estimatedCredits: number;
  status: 'Pending' | 'In Progress' | 'Completed';
}

export interface RadarSignal {
  id: string;
  title: string;
  category: 'Tech Shift' | 'Workflow' | 'New Tool' | 'Role Shift' | 'Model Release';
  source?: string;
  dateTime?: string;
  summary: string;
  scaffold: {
    yesterday: string;
    today: string;
    whatChanged: string;
    whosAffected: string;
  };
  previousState?: string;
  currentState?: string;
  relevanceContext?: string;
  investigationStatus?: 'uninvestigated' | 'in_progress' | 'completed';
  isFollowed: boolean;
}

export interface CreditTransaction {
  id: string;
  transactionType?: 'LEVEL_COMPLETION' | 'SIGNAL_INVESTIGATION' | 'REFLECTION' | 'SPEND';
  type?: 'EARN' | 'SPEND';
  source?: 'ASSESSMENT' | 'RADAR' | 'MENTOR';
  sourceId?: string;
  amount: number;
  description: string;
  timestamp: string;
  previousBalance?: number;
  newBalance?: number;
}

export interface AIRelevanceReport {
  relevanceScore: number;
  whyItMatters: string;
  actionableTakeaway: string;
}

export const CREDIT_CONFIG = {
  LEVEL_COMPLETION_REWARD: 10,
  SIGNAL_INVESTIGATION_REWARD: 30,
  REFLECTION_REWARD: 15,
  EVIDENCE_SUBMISSION_REWARD: 25
};
