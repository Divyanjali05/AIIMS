export type ProgressionStage =
  'Knowing' | 'Understanding' | 'Recognising' | 'Applying' | 'Adapting';

export type UserRole = 'learner' | 'evaluator' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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

export type RadarCategory =
  | 'New Models'
  | 'Agentic AI'
  | 'Coding'
  | 'Research'
  | 'Multimodal'
  | 'Image & Video'
  | 'Automation'
  | 'Productivity'
  | 'Tech Shift'
  | 'Workflow'
  | 'New Tool'
  | 'Role Shift'
  | 'Model Release';

export interface RadarSignal {
  id: string;
  title: string;
  summary: string;
  category: RadarCategory;
  impactLevel?: 'Critical' | 'High' | 'Medium' | 'Low';
  publishedAt?: string;
  source?: string;
  capabilities?: string[];
  affectedDomains?: string[];
  recommendedTasks?: string[];
  relatedTools?: string[];
  investigationAvailable?: boolean;
  tags?: string[];
  active?: boolean;
  scaffold: {
    yesterday: string;
    today: string;
    whatChanged: string;
    whosAffected: string;
  };
  isFollowed?: boolean;
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
  EVIDENCE_SUBMISSION_REWARD: 25,
};

// ==========================================
// AI WALLET TYPES & EXTENDED SCHEMAS
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
  | 'Audio & Voice'
  | 'Automation';

// ============================================================================
// Market AI Tools Catalog — Market Tiers, Domains & Report Models
// ============================================================================

export type MarketTier = 1 | 2 | 3 | 4 | null;
export type MarketTierName = 'Starter' | 'Growth' | 'Leading' | 'Enterprise' | 'Unrated';

export const MARKET_TIER_CONFIG: Record<
  1 | 2 | 3 | 4,
  { name: MarketTierName; label: string; description: string }
> = {
  1: {
    name: 'Starter',
    label: 'Starter (Tier 1)',
    description: 'Small teams, indie tools, open-source or low-cost newer entrants',
  },
  2: {
    name: 'Growth',
    label: 'Growth (Tier 2)',
    description: 'Popular SaaS with team plans, published user counts and paid tiers',
  },
  3: {
    name: 'Leading',
    label: 'Leading (Tier 3)',
    description:
      'Category leaders with large published user bases and widespread industry adoption',
  },
  4: {
    name: 'Enterprise',
    label: 'Enterprise (Tier 4)',
    description:
      'Large vendors with compliance, SSO/SAML, security certifications and enterprise tiers',
  },
};

export const CANONICAL_DOMAIN_IDS = [
  'video-editing',
  'data-analytics',
  'graphic-design',
  'reasoning-writing',
  'agentic-coding',
  'research-rag',
  'presentation',
  'automation',
  'audio-voice',
  'business-operations',
  'marketing-growth',
  'health-medical',
  'legal-compliance',
] as const;

export type CanonicalDomainId = (typeof CANONICAL_DOMAIN_IDS)[number];

export const DOMAIN_SPEC_ALIASES: Record<string, CanonicalDomainId> = {
  // Direct ID mappings
  'video-editing': 'video-editing',
  'data-analytics': 'data-analytics',
  'graphic-design': 'graphic-design',
  'reasoning-writing': 'reasoning-writing',
  'agentic-coding': 'agentic-coding',
  'research-rag': 'research-rag',
  presentation: 'presentation',
  automation: 'automation',
  'audio-voice': 'audio-voice',
  'business-operations': 'business-operations',
  'marketing-growth': 'marketing-growth',
  'health-medical': 'health-medical',
  'legal-compliance': 'legal-compliance',

  // Spec & Legacy Synonyms
  programming: 'agentic-coding',
  coding: 'agentic-coding',
  'agentic coding': 'agentic-coding',
  'software engineering': 'agentic-coding',
  'data analysis': 'data-analytics',
  'data analytics': 'data-analytics',
  'data intelligence': 'data-analytics',
  'content creation': 'marketing-growth',
  marketing: 'marketing-growth',
  'growth content': 'marketing-growth',
  writing: 'reasoning-writing',
  reasoning: 'reasoning-writing',
  'long-form writing': 'reasoning-writing',
  'image generation': 'graphic-design',
  'visual arts': 'graphic-design',
  'graphic design': 'graphic-design',
  'audio generation': 'audio-voice',
  audio: 'audio-voice',
  'voice synthesis': 'audio-voice',
  'video editing': 'video-editing',
  'video generation': 'video-editing',
  video: 'video-editing',
  productivity: 'automation',
  'workflow automation': 'automation',
  integration: 'automation',
  research: 'research-rag',
  citations: 'research-rag',
  rag: 'research-rag',
  'pitch decks': 'presentation',
  'slide generation': 'presentation',
  'business operations': 'business-operations',
  strategy: 'business-operations',
  health: 'health-medical',
  'clinical research': 'health-medical',
  medical: 'health-medical',
  legal: 'legal-compliance',
  'contract analysis': 'legal-compliance',
  compliance: 'legal-compliance',
};

export type ToolReportCategory =
  'PRICING_OUTDATED' | 'LINK_BROKEN' | 'TIER_INCORRECT' | 'CAPABILITY_CHANGED' | 'OTHER';

export type ToolReportStatus = 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';

export interface ToolReportItem {
  id: string;
  toolId: string;
  userId: string;
  reportCategory: ToolReportCategory;
  description: string;
  sourceUrl?: string | null;
  status: ToolReportStatus;
  reviewerId?: string | null;
  reviewNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ToolFamiliarity = 'exploring' | 'practicing' | 'proficient' | 'mastered';

export type ToolLifecycleStatus =
  'NEW' | 'RECENTLY_UPDATED' | 'ACTIVE' | 'UPDATED' | 'DEPRECATED' | 'DISCONTINUED' | 'UNVERIFIED';

export type VerificationStatus =
  | 'VERIFIED'
  | 'COMMUNITY_VERIFIED'
  | 'UNVERIFIED'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED_SEED'
  | 'DISCOVERED'
  | 'REJECTED';

export type PricingType =
  'FREE' | 'FREE_TIER' | 'FREE_TRIAL' | 'FREEMIUM' | 'PAID' | 'ENTERPRISE' | 'UNKNOWN';

export interface ToolPricing {
  type: PricingType;
  summary: string;
  freeTierAvailable: boolean;
  freeTrialAvailable: boolean;
  trialDurationDays?: number;
  freeTierLimitations?: string;
  startingPriceMonthlyUsd?: number;
  verified: boolean;
  lastVerifiedAt?: string;
}

export interface ToolLearningTrackLevel {
  level: 1 | 2 | 3 | 4 | 5;
  levelName: 'DISCOVER' | 'EXPLORE' | 'PRACTICE' | 'ADVANCED' | 'MASTER';
  title: string;
  description: string;
  keyTopics: string[];
  suggestedWorkflow: string;
}

export type RecommendationType =
  | 'REQUIREMENT_MATCH'
  | 'ALTERNATIVE_TOOL'
  | 'TASK_BASED'
  | 'SKILL_GAP'
  | 'LEARNING_RECOMMENDATION'
  | 'RADAR_DISCOVERY';

export interface AITool {
  id: string;
  name: string;
  provider: string;
  description: string;
  shortDescription?: string;
  officialWebsite: string;
  websiteUrl?: string;
  category: TaskCategory;
  categories: TaskCategory[];
  domains: string[];
  subdomains?: string[];
  capabilities: string[];
  useCases: string[];
  tasks: string[];
  targetUsers?: string[];
  inputTypes?: string[];
  outputTypes?: string[];
  supportedPlatforms?: string[];
  supportedLanguages?: string[];
  strengths: string[];
  limitations: string[];
  modelInformation?: string;
  versionInformation?: string;
  pricingDetails: ToolPricing;
  pricing?: string; // Concise summary text
  marketTier?: MarketTier;
  pricingSourceUrl?: string;
  pricingVerifiedAt?: string;
  learningTrack?: ToolLearningTrackLevel[];
  firstSeenAt: string; // ISO string
  lastVerifiedAt: string; // ISO string
  lastUpdatedAt: string; // ISO string
  status: ToolLifecycleStatus;
  verificationStatus: VerificationStatus;
  sourceUrls: string[];
  tags: string[];
  iconName?: string;
  activeStatus: boolean;

  // Metadata helpers for matching & recommendations
  taskMappings: string[];
  relevantRoles?: string[];
  skillLevel?: string;
  familiarityGuidance?: Partial<Record<ToolFamiliarity, string>>;
  relatedTools?: string[];
  alternatives?: string[];
  radarTopics?: string[];
  clarityTopics?: string[];
  focusTracks?: string[];
  comparisonMetadata?: Record<string, any>;
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
  matchedSignals?: RecommendationType[];
  reason: string;
  relatedTask?: string;
  relatedSkill?: string;
  relevance?: string;
  actionLabel?: string;
  status: 'active' | 'dismissed' | 'added';
  createdAt: string;
}

export interface SearchIntentConstraints {
  budget?: string;
  platform?: string[];
  language?: string[];
  noCode?: boolean;
  openSource?: boolean;
  freeOnly?: boolean;
  freeTrial?: boolean;
  budgetMaxUsd?: number;
  privacyFocused?: boolean;
  localOffline?: boolean;
}

export interface ComparisonIntentDetails {
  type: 'alternative' | 'compare' | 'like_tool' | null;
  referenceTool?: string;
}

export interface AmbiguityInfo {
  isAmbiguous: boolean;
  missingInformation: string[];
  clarificationNeeded: boolean;
}

export interface SearchIntent {
  originalQuery: string;
  intent: string;
  primaryGoal: string;
  domain: string[];
  domainConfidence: number;
  tasks: string[];
  requiredCapabilities: string[];
  optionalCapabilities: string[];
  inputTypes: string[];
  outputTypes: string[];
  constraints: SearchIntentConstraints;
  knownTools: string[];
  comparisonIntent?: ComparisonIntentDetails | null;
  ambiguity: AmbiguityInfo;
  specificity: 'broad' | 'moderate' | 'specific';
  freshnessRequirement?: 'low' | 'normal' | 'high';
  keywords: string[];
  exclusions: string[];

  // Legacy compatibility helpers
  task?: string;
  desiredOutcome?: string;
  categories?: TaskCategory[];
  subdomains?: string[];
  alternativeIntent?: boolean;
}

export interface RequirementProfile {
  goal: string;
  workflow: string[];
  requiredCapabilities: string[];
  optionalCapabilities: string[];
  desiredOutput: string;
  domain: string;
  domainSpecificity: 'explicit' | 'inferred' | 'unspecified';
  constraints: SearchIntentConstraints;
  ambiguityLevel: 'none' | 'low' | 'moderate' | 'high';
  knownTools: string[];
}

export interface ToolMatchResult {
  tool: AITool;
  relevanceScore: number; // 0 to 100
  matchScore: number; // 0 to 100 satisfy requirement
  confidence: number; // 0.0 to 1.0 evidence/intent confidence
  evidenceCoverage: number; // 0.0 to 1.0 verified capability coverage
  matchLabel: 'Strong match' | 'Good match' | 'Potential match';
  matchReason: string;
  whyMatches: string[];
  matchedCapabilities: string[];
  missingCapabilities?: string[];
  matchedDomains: string[];
  isExactRequirementMatch: boolean;
}

export interface ToolSearchResult {
  query: string;
  intent: SearchIntent;
  requirementProfile?: RequirementProfile;
  totalMatches: number;
  matches: ToolMatchResult[];
  toolCombinations?: {
    workflowTitle: string;
    explanation: string;
    suggestedTools: AITool[];
  }[];
  suggestionsIfNoMatches?: string[];
}

export interface ComparisonCriterion {
  criterion: string;
  importance: string;
  evaluations: Record<string, string>; // toolId -> textual evaluation
}

export interface RequirementToolComparison {
  userRequirement?: string;
  taskDomain: string;
  tools: AITool[];
  comparisonCriteria: ComparisonCriterion[];
  fitAnalysis: Record<
    string,
    {
      whyItFits: string;
      bestSuitedScenario: string;
      keyTradeoff: string;
    }
  >;
  overallSynthesis: string;
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
