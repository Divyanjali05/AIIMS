export type ProgressionStage =
  'Knowing' | 'Understanding' | 'Recognising' | 'Applying' | 'Adapting';

export type Stream = 'TECH' | 'NON_TECH';

export type LearnerTrack = 'Student' | 'Entrepreneur';

export interface AcademicProfile {
  id?: string;
  track?: LearnerTrack;
  // Academic Identity
  stream: Stream;
  streamSubCategory?: string;
  educationLevel: string;
  programId: string;
  programName: string;
  specializationId: string;
  specializationName: string;
  yearOfStudy: number;
  admissionYear: number;
  expectedGraduationYear: number;
  // Institute
  instituteId?: string;
  instituteName?: string;
  // Cohort (analytics population)
  cohortId?: string;
  cohortDisplayName?: string;
  // AI Context (personalization signals — NOT capability scores)
  aiFamiliarity?: string;
  aiUsageContexts?: string[];
  primaryGoal?: string;
  isComplete?: boolean;
}

export interface EntrepreneurProfile {
  id?: string;
  fullName: string;
  ventureName?: string;
  industry: string;
  problemStatement?: string;
  ventureStage: string;
  primaryGoal?: string;
  skillsToDevelop?: string[];
  businessChallenges?: string[];
  preferredSupport?: string[];
  isComplete?: boolean;
}

export interface DeviceBindingInfo {
  deviceIdHash?: string;
  deviceName?: string;
  platform?: 'web' | 'android' | 'ios' | 'other';
  bindingStatus?: 'BOUND' | 'UNBOUND';
  boundAt?: string | Date | null;
  lastSeenAt?: string | Date | null;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole | string;
  track?: LearnerTrack;
  college?: string;
  targetGoal: string;
  stage: ProgressionStage;
  xpPoints: number;
  aiimsCredits: number;
  deviceBinding?: DeviceBindingInfo;
}

export interface DimensionScore {
  dimension: string;
  score: number;
  benchmark: number;
}

export interface PersistentAILearnerProfile {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  skillGaps: string[];
  learningPreferences: string[];
  improvementAreas: string[];
  recommendedFocus: string;
  recommendedRoles?: string[];
  confidenceScore?: number;
  version: number;
  generatedAt: string;
  generationCost: number;
  assessmentScoreAtGeneration?: number;
}

export interface PeerBranchComparisonResult {
  available: boolean;
  reason?: string;
  comparisonType: 'SAME_BRANCH_ACROSS_COLLEGES';
  branchName?: string;
  totalComparableRecords: number;
  minRequiredRecords: number;
  distinctCollegesCount?: number;
  peerAverage?: number;
  median?: number;
  p90?: number;
  capabilityAverages?: {
    usingAI: number;
    understandingAI: number;
    solvingWithAI: number;
    checkingAI: number;
    adaptingToAI: number;
  };
  userScore?: number;
  userPercentile?: number;
  message?: string;
}

export interface CohortAllComparisonResult {
  available: boolean;
  reason?: string;
  comparisonType: 'ALL_BRANCHES_COHORT';
  totalComparableRecords: number;
  minRequiredRecords: number;
  cohortAverage?: number;
  median?: number;
  p90?: number;
  capabilityAverages?: {
    usingAI: number;
    understandingAI: number;
    solvingWithAI: number;
    checkingAI: number;
    adaptingToAI: number;
  };
  normalizationNote?: string;
  userScore?: number;
  userPercentile?: number;
  message?: string;
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

// ==========================================
// FOCUS SESSION, BREAK & HISTORY TYPES (Phase 6C)
// ==========================================

export type FocusSessionLifecycleState =
  'idle' | 'focusing' | 'paused' | 'break' | 'completed' | 'abandoned';

export type FocusPeriodType = 'focus' | 'short_break' | 'long_break';

export interface FocusSessionConfig {
  focusDurationMinutes: number;
  breakDurationMinutes: number;
  enableLongBreak: boolean;
  longBreakDurationMinutes: number;
  longBreakInterval: number;
  soundEnabled: boolean;
}

export interface ActiveFocusSessionState {
  id: string;
  trackTitle: string;
  intention?: string;
  sessionState: FocusSessionLifecycleState;
  periodType: FocusPeriodType;
  targetEndTime: number | null;
  totalPeriodSeconds: number;
  remainingSeconds: number;
  pausedAt: number | null;
  accumulatedFocusSeconds: number;
  sessionStartEpoch: number;
  completedCycles: number;
  config: FocusSessionConfig;
}

export interface FocusSessionRecord {
  id: string;
  trackTitle: string;
  intention?: string;
  focusDurationMinutes: number;
  actualFocusSeconds: number;
  breakDurationMinutes: number;
  startedAt: string;
  completedAt: string;
  status: 'completed' | 'abandoned';
  cyclesCompleted: number;
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
  dateTime?: string;
  previousState?: string;
  currentState?: string;
  relevanceContext?: string;
  investigationStatus?: 'uninvestigated' | 'in_progress' | 'completed';
  isFollowed?: boolean;
  isSaved?: boolean;
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

export type ToolFamiliarity = 'exploring' | 'practicing' | 'proficient' | 'mastered';

export type ToolLifecycleStatus =
  'NEW' | 'RECENTLY_UPDATED' | 'ACTIVE' | 'UPDATED' | 'DEPRECATED' | 'DISCONTINUED' | 'UNVERIFIED';

export type VerificationStatus =
  'VERIFIED' | 'COMMUNITY_VERIFIED' | 'UNVERIFIED' | 'PENDING_VERIFICATION';

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
  | 'FOCUS_BASED'
  | 'SKILL_GAP'
  | 'TOOLKIT_GAP'
  | 'LEARNING_RECOMMENDATION'
  | 'RADAR_DISCOVERY'
  | 'ASSESSMENT_PROMPT';

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

export interface SolvedWorkflow {
  id: string;
  problemSummary: string;
  requiredCapability: string;
  capabilityDescription: string;
  workflowSteps: { stepNumber: number; title: string; description: string; toolCategory: string }[];
  matchedTools: { name: string; category: string; inWallet: boolean; reason: string }[];
  suggestedApproach: string;
  createdAt: string;
  sourceSignalId?: string;
}

export interface UserProject {
  id: string;
  title: string;
  description: string;
  category: string;
  workflowId?: string;
  toolsUsed: string[];
  createdAt: string;
  status: 'active' | 'archived';
}

export type AudienceMode = 'student' | 'entrepreneur';

// ==========================================
// EVALUATOR & TASK SUBMISSION TYPES
// ==========================================

export type UserRole = 'learner' | 'evaluator' | 'admin';

export type SubmissionStatus =
  'submitted' | 'in_review' | 'feedback_given' | 'revision_requested' | 'accepted';

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  minScore: number;
  maxScore: number;
}

export const RUBRIC_CRITERIA_LIST: RubricCriterion[] = [
  {
    id: 'accuracy',
    name: 'Accuracy & Correctness',
    description:
      'Precision of solution, technical correctness, and factual consistency with requirements.',
    minScore: 1,
    maxScore: 5,
  },
  {
    id: 'critical_thinking',
    name: 'Critical Thinking & Reasoning',
    description:
      'Depth of analytical reasoning, problem formulation, trade-off analysis, and risk mitigation.',
    minScore: 1,
    maxScore: 5,
  },
  {
    id: 'clarity',
    name: 'Clarity & Communication',
    description:
      'Logical structure, readability, precision of prompt wording, and actionable documentation.',
    minScore: 1,
    maxScore: 5,
  },
  {
    id: 'ai_application',
    name: 'Practical AI Application',
    description:
      'Effectiveness of model context utilization, constraint handling, and workflow efficiency.',
    minScore: 1,
    maxScore: 5,
  },
];

export type RubricScores = Record<string, number>;

export interface StatusHistoryEntry {
  changedBy: string;
  changedByName?: string;
  changedAt: string;
  fromStatus: string;
  toStatus: string;
  note?: string;
}

export interface SubmissionItem {
  _id?: string;
  id?: string;
  learner: string | { _id?: string; id?: string; name?: string; email?: string };
  learnerName?: string;
  learnerEmail?: string;
  taskId: string;
  taskTitle?: string;
  answerContent: string;
  status: SubmissionStatus;
  evaluator?: string | { _id?: string; id?: string; name?: string } | null;
  evaluatorName?: string;
  rubricScores?: RubricScores;
  writtenFeedback: string;
  revisionCount: number;
  statusHistory?: StatusHistoryEntry[];
  submittedAt: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  waitingTimeMs?: number;
  waitingTimeFormatted?: string;
}

export interface TaskItem {
  _id?: string;
  id?: string;
  taskId: string;
  title: string;
  description: string;
  category: string;
  level: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EvaluatorItem {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'evaluator' | 'admin';
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt?: string;
}

export interface AuditLogItem {
  id?: string;
  _id?: string;
  actor: string;
  actorName?: string;
  actorRole: string;
  action: string;
  target?: string;
  targetType?: string;
  time: string;
  details?: Record<string, any>;
}

export interface AdminSummaryMetrics {
  statusCounts: {
    submitted: number;
    in_review: number;
    feedback_given: number;
    revision_requested: number;
    accepted: number;
    total: number;
  };
  metrics: {
    totalSubmissions: number;
    reviewedCount: number;
    pendingReviewCount: number;
    averageReviewTimeMs: number;
    averageReviewTimeFormatted: string;
  };
}

// ==========================================
// PHASE 3: AI WALLET & 13 DOMAIN CARDS TYPES
// ==========================================

export interface DomainCardTool {
  id: string;
  name: string;
  provider: string;
  description: string;
  capabilities: string[];
  officialWebsite: string;
  pricingSummary: string;
  pricingType: string;
  freeTierAvailable: boolean;
  skillLevel?: string;
  lastVerifiedAt?: string;
}

export interface DomainCard {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  keyCapabilities: string[];
  subdomains: string[];
  targetAudience: 'student' | 'entrepreneur' | 'both';
  icon: string;
  tools?: DomainCardTool[];
  totalTools?: number;
  hasFreeTier?: boolean;
}

export interface ToolUsageConfirmation {
  id: string;
  userId: string;
  toolId: string;
  toolName: string;
  provider: string;
  taskContext?: string;
  notes?: string;
  confirmedAt: string;
  verificationMethod: 'MANUAL_LEARNER_CONFIRMATION';
  status: 'CONFIRMED';
  idempotencyKey?: string;
}

export interface PersonalizedRecommendationItem {
  toolId: string;
  name: string;
  provider: string;
  domain: string;
  skillTier: 'beginner' | 'advanced';
  pricing: {
    type: string;
    summary: string;
    freeTierAvailable: boolean;
  };
  whyMatches: string[];
  capabilities: string[];
  officialWebsite: string;
  isFreeOrLowCost: boolean;
  lastVerifiedAt?: string;
}

export interface PersonalizedDomainMatchingResult {
  domain: string;
  isPersonalized: boolean;
  profileSource: 'PERSISTENT_AI_PROFILE' | 'GENERAL_DOMAIN_FALLBACK';
  learnerGoal: string;
  learnerSkillLevel: string;
  recommendations: {
    beginner: PersonalizedRecommendationItem[];
    advanced: PersonalizedRecommendationItem[];
  };
  totalMatches: number;
}

// ============================================================================
// Phase 4: Clarity AI Task Lab Types
// ============================================================================

export interface ClarityLearningLevel {
  id: string;
  topic: string;
  name: string;
  title: string;
  levelTier: string;
  description: string;
  icon: string;
  totalQuestions: number;
  completedQuestions: number;
  isFirstAttemptFree: boolean;
  progressPercentage: number;
}

export interface ClarityQuestionSummary {
  questionId: string;
  topic: string;
  level: 'Easy' | 'Medium' | 'Hard';
  track: string;
  title: string;
  promptText: string;
  hint?: string | null;
  testScenario: string;
  expectedCriteria: string[];
  scoringRubric: Array<{
    criterion: string;
    maxScore: number;
    description: string;
  }>;
  learningObjective: string;
  expectedAnswerFormat: string;
  source: string;
  status: string;
  version: number;
  userStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  lastScore?: number | null;
  attemptId?: string | null;
  assignmentId?: string | null;
  isLocked: boolean;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  evaluationGuidance?: string | null;
}

export interface ClarityAttemptResult {
  success: boolean;
  attemptId: string;
  score: number;
  rubricFeedback: Array<{
    criterion: string;
    score: number;
    maxScore: number;
    comment: string;
  }>;
  overallFeedback: string;
  submittedAt: string;
  timeTakenSeconds: number;
  isLocked: boolean;
  creditsDeducted: number;
  isFirstAttemptFree: boolean;
  currentBalance: number;
  xpAwarded: number;
  currentXP: number;
  progression?: any;
}

export interface ClarityProgressSummary {
  success: boolean;
  totalCompleted: number;
  totalQuestions: number;
  totalAttempts: number;
  averageScore: number;
  xpPoints: number;
  aiimsCredits: number;
  levels: {
    understanding: { completed: number; total: number; avgScore: number };
    workflow: { completed: number; total: number; avgScore: number };
    aiAgents: { completed: number; total: number; avgScore: number };
  };
}

// ============================================================================
// Phase 5: Focus Module Practice Challenges & Timer Types
// ============================================================================

export type FocusChallengeTier = 'Easy' | 'Medium' | 'Hard';

export interface FocusCategorySummary {
  category: string;
  displayName: string;
  description: string;
  whyThisMatters: string;
  practicalApplication: string;
  suggestedTool: string;
  suggestedToolUrl: string;
  questionsCount: {
    Easy: number;
    Medium: number;
    Hard: number;
    total: number;
  };
  completedByLearner: number;
}

export interface FocusTaskQuestion {
  questionId: string;
  topic: string;
  level: FocusChallengeTier;
  track: string;
  title: string;
  promptText: string;
  hint: string;
  testScenario: string;
  expectedCriteria: string[];
  scoringRubric: Array<{
    criterion: string;
    maxScore: number;
    description: string;
  }>;
  learningObjective: string;
  expectedAnswerFormat: string;
  suggestedExternalTool: string;
  suggestedExternalToolUrl: string;
  durationSeconds: number;
}

export interface FocusAttachmentItem {
  attachmentId: string;
  userId?: string;
  attemptId?: string;
  originalFileName: string;
  sanitizedFileName?: string;
  objectKey: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadedAt: string;
  publicUrl?: string;
}

export interface FocusAttemptResult {
  success: boolean;
  attemptId: string;
  score: number;
  rubricFeedback: Array<{
    criterion: string;
    score: number;
    maxScore: number;
    comment: string;
  }>;
  overallFeedback: string;
  submittedAt: string;
  timeTakenSeconds: number;
  isLocked: boolean;
  creditsDeducted: number;
  isFirstAttemptFree: boolean;
  currentBalance: number;
  xpAwarded: number;
}

export interface FocusTimeData {
  assignmentId: string;
  startedAt: string;
  targetEndTime: string;
  remainingSeconds: number;
  durationSeconds: number;
  isExpired: boolean;
  isLocked: boolean;
}

export interface FocusHistoryItem {
  attemptId: string;
  assignmentId: string;
  questionId: string;
  title: string;
  category: string;
  level: string;
  score: number;
  timeTakenSeconds: number;
  submittedAt: string;
  rubricFeedback: any[];
  overallFeedback: string;
  suggestedTool: string;
}
