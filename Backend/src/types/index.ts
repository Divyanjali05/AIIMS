export type ProgressionStage = 'Knowing' | 'Understanding' | 'Recognising' | 'Applying' | 'Adapting';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  college?: string;
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
  summary: string;
  scaffold: {
    yesterday: string;
    today: string;
    whatChanged: string;
    whosAffected: string;
  };
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

// ==========================================
// AI WALLET TYPES
// ==========================================

export type TaskCategory =
  | 'Reasoning & Writing'
  | 'Agentic Coding'
  | 'Multi-Modal'
  | 'Research & RAG'
  | 'Image & Vision'
  | 'Data Analysis'
  | 'Presentation'
  | 'Video'
  | 'Automation';

export type ToolFamiliarity = 'exploring' | 'practicing' | 'proficient' | 'mastered';

export type RecommendationType =
  | 'ALTERNATIVE_TOOL'
  | 'TASK_BASED'
  | 'SKILL_GAP'
  | 'LEARNING_RECOMMENDATION'
  | 'RADAR_DISCOVERY';

export interface AITool {
  id: string;
  name: string;
  description: string;
  category: TaskCategory;
  capabilities: string[];
  useCases: string[];
  strengths: string[];
  limitations: string[];
  taskMappings: string[];
  comparisonMetadata?: Record<string, any>;
  websiteUrl: string;
  activeStatus: boolean;
  iconName?: string;
}

export interface UserToolItem {
  toolId: string;
  addedAt: string;
  familiarity: ToolFamiliarity;
  userNotes?: string;
  primaryCategory: TaskCategory;
  customTags?: string[];
}

export interface ToolRecommendation {
  id: string;
  toolId: string;
  type: RecommendationType;
  reason: string;
  relatedTask?: string;
  relatedSkill?: string;
  relevance?: string;
  status: 'active' | 'dismissed' | 'added';
  createdAt: string;
}

export interface ComparisonPoint {
  feature: string;
  toolAFit: string;
  toolBFit: string;
}

export interface ToolComparison {
  task: string;
  toolA: AITool;
  toolB: AITool;
  comparisonPoints: ComparisonPoint[];
  keyConsideration: string;
  summaryQuestion: string;
}

