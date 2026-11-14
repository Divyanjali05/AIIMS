/**
 * Domain model type definitions decoupled from persistence implementation.
 * Previously exported from Mongoose model files; centralized here for Prisma + TS consumers.
 */

import { AITool, ToolPricing, VerificationStatus } from './index';
import { DevicePlatform } from '../utils/deviceIdentifier';

// ============================================================================
// Identity, Auth & Security
// ============================================================================

export type UserRole = 'learner' | 'evaluator' | 'admin';

export interface ICreditTransaction {
  id: string;
  transactionType?: string;
  type?: 'EARN' | 'SPEND';
  source?: string;
  sourceId?: string;
  amount: number;
  description: string;
  timestamp: string;
  previousBalance?: number;
  newBalance?: number;
}

export interface IDeviceBinding {
  deviceIdHash: string;
  deviceName?: string;
  platform: DevicePlatform;
  boundAt?: Date | null;
  lastSeenAt?: Date | null;
  activeSessionId?: string | null;
  bindingStatus: 'BOUND' | 'UNBOUND';
  resetAt?: Date | null;
  resetBy?: string | null;
}

export interface ITotp {
  /** AES-256-GCM encrypted TOTP secret (iv:authTag:ciphertext hex). Empty until setup. */
  encryptedSecret?: string;
  /** Whether 2FA has been fully set up and is required on login. */
  enabled: boolean;
  /** True between first login (QR shown) and the user verifying the first code. */
  pendingSetup: boolean;
  /** SHA-256 hashes of single-use backup codes. */
  backupCodeHashes: string[];
  /** Number of failed TOTP attempts since last success. */
  failedAttempts: number;
  /** Timestamp until which TOTP entry is locked out. */
  lockedUntil?: Date | null;
}

export interface IUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  isActive?: boolean;
  mustChangePassword?: boolean;
  inviteToken?: string | null;
  inviteTokenExpires?: Date | null;
  totp: ITotp;
  deviceBinding?: IDeviceBinding;
  track?: 'Student' | 'Entrepreneur';
  college: string;
  targetGoal: string;
  stage: string;
  xpPoints: number;
  aiimsCredits: number;
  assessment: {
    status: string;
    answers: Record<string, any>;
    currentQuestionIndex: number;
    completedAt: string | null;
    rewardClaimed: boolean;
    scores: {
      usageFrequency: number;
      evaluationCapability: number;
      workflowDesign: number;
      strategicVision: number;
      mentorshipReadiness: number;
    };
    evaluationResult?: any;
  };
  analysis: {
    status: string;
    topCapability: string;
    growthArea: string;
    unlockedAt?: string | null;
    aiProfile?: any;
    history?: any[];
    lastGeneratedAt?: string | null;
  };
  clarity: {
    status: string;
    selectedAreas: string[];
    selectedTopic: string | null;
    completedTopics: string[];
    reflections: Record<string, string>;
    taskScores?: Record<string, any>;
    trialRunsUsed?: number;
  };
  focus: {
    status: string;
    selectedTrack: string | null;
    history: string[];
    activatedAt?: string | null;
    sessionHistory?: any[];
    activeSession?: any;
    sessionConfig?: any;
  };
  radar: {
    status: string;
    investigatedSignalIds: string[];
    followedSignalIds: string[];
    savedSignalIds?: string[];
    dismissedSignalIds?: string[];
    lastViewedRadar?: string | null;
    radarProgress?: number;
  };
  investigation: {
    status: string;
    selectedSignalId: string | null;
    userNotes: Record<string, string>;
  };
  solver?: {
    latestWorkflow: any;
    history: any[];
  };
  build?: {
    projects: any[];
    activeProjectId: string | null;
  };
  relevance?: {
    status?: string;
    [key: string]: any;
  };
  mentor?: {
    status?: string;
    [key: string]: any;
  };
  transactions: ICreditTransaction[];
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    timestamp: string;
    targetTab?: string;
    read: boolean;
  }>;
  aiWallet: {
    userTools: Array<{
      toolId: string;
      addedAt: string;
      familiarity: string;
      userNotes?: string;
      primaryCategory: string;
      customTags?: string[];
    }>;
    dismissedRecommendations: string[];
  };
  createdAt: Date;
  updatedAt?: Date;
}

// ============================================================================
// Academic Identity & Cohorts
// ============================================================================

export type Stream = 'TECH' | 'NON_TECH';
export type EducationLevel = 'SCHOOL' | 'UNDERGRADUATE' | 'POSTGRADUATE' | 'RESEARCH' | 'GRADUATE';

export type TechSubCategory =
  | 'CS_IT'
  | 'AI_ML_DS'
  | 'ELECTRONICS_ECE'
  | 'ELECTRICAL'
  | 'MECHANICAL'
  | 'CIVIL'
  | 'OTHER_ENGINEERING'
  | 'OTHER_TECHNOLOGY';

export type NonTechSubCategory =
  | 'COMMERCE_FINANCE'
  | 'MANAGEMENT_BUSINESS'
  | 'ARTS_HUMANITIES'
  | 'SCIENCE'
  | 'SOCIAL_SCIENCES'
  | 'LAW'
  | 'MEDICINE_HEALTHCARE'
  | 'EDUCATION'
  | 'OTHER';

export type AiFamiliarity =
  | 'NEW_TO_AI'
  | 'EXPLORING_AI'
  | 'REGULAR_USER'
  | 'ADVANCED_USER'
  | 'AI_ML_LEARNER'
  | 'AI_ML_PROFESSIONAL';

export type PrimaryGoal =
  | 'LEARN_AI'
  | 'USE_AI_FOR_STUDIES'
  | 'BUILD_SOFTWARE'
  | 'SOLVE_PROBLEMS'
  | 'RESEARCH'
  | 'CAREER_PREPARATION'
  | 'ENTREPRENEURSHIP'
  | 'PRODUCTIVITY'
  | 'CREATIVE_WORK'
  | 'EXPLORE_AI'
  | 'OTHER';

export interface IStudentProfile {
  id: string;
  _id?: string;
  userId: string;
  fullName: string;
  displayName?: string | null;
  track: 'Student' | 'Entrepreneur';
  instituteId?: string | null;
  instituteName?: string | null;
  campusName?: string | null;
  departmentName?: string | null;
  stream: Stream;
  streamSubCategory: TechSubCategory | NonTechSubCategory | string;
  educationLevel: EducationLevel | string;
  programId: string;
  programName: string;
  specializationId: string;
  specializationName: string;
  yearOfStudy: number;
  admissionYear: number;
  expectedGraduationYear: number;
  cohortId?: string | null;
  aiFamiliarity?: AiFamiliarity | string | null;
  aiUsageContexts: string[];
  primaryGoal?: PrimaryGoal | string | null;
  isComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEntrepreneurProfile {
  id: string;
  _id?: string;
  userId: string;
  fullName: string;
  ventureName?: string | null;
  industry: string;
  problemStatement?: string | null;
  ventureStage: string;
  primaryGoal?: string | null;
  skillsToDevelop: string[];
  businessChallenges: string[];
  preferredSupport: string[];
  isComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInstitute {
  id: string;
  _id?: string;
  name: string;
  code: string;
  shortName?: string | null;
  city?: string | null;
  state?: string | null;
  country: string;
  type: 'UNIVERSITY' | 'COLLEGE' | 'INSTITUTE' | 'SCHOOL' | 'OTHER' | string;
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE' | string;
  requestedBy?: string | null;
  verifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICohort {
  id: string;
  _id?: string;
  instituteId?: string | null;
  instituteName?: string | null;
  stream: 'TECH' | 'NON_TECH' | string;
  educationLevel: string;
  programId: string;
  programName: string;
  specializationId: string;
  specializationName: string;
  admissionYear: number;
  graduationYear: number;
  displayName: string;
  shortCode: string;
  status: 'ACTIVE' | 'GRADUATED' | 'INACTIVE' | string;
  studentCount: number;
  assessmentVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Credits Ledger
// ============================================================================

export type CreditTransactionType = 'EARN' | 'SPEND' | 'REFUND' | 'ADJUSTMENT';
export type CreditTransactionCategory = 'TASK_USAGE' | 'REWARD' | 'REFUND' | 'ADMIN' | 'INVESTMENT';
export type CreditTransactionStatus = 'COMPLETED' | 'PENDING' | 'REVERSED' | 'FAILED';

export interface ICreditLedger {
  id: string;
  userId: string | null;
  type: CreditTransactionType;
  category: CreditTransactionCategory;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  source: string;
  sourceId?: string | null;
  idempotencyKey?: string | null;
  status: CreditTransactionStatus;
  relatedTaskId?: string | null;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// ============================================================================
// Sessions & Audit
// ============================================================================

export type SessionStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface ISession {
  id?: string;
  sessionId: string;
  userId: string;
  deviceIdHash: string;
  deviceName: string;
  platform: DevicePlatform;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt?: Date | null;
  status: SessionStatus;
}

export interface IDeviceResetAudit {
  id: string;
  targetUserId: string | null;
  adminUserId: string | null;
  adminEmail: string;
  previousDeviceIdHash: string;
  previousDeviceName?: string | null;
  reason: string;
  resetAt: Date;
}

export interface IAuditLog {
  id: string;
  _id?: string;
  actor: string;
  actorName?: string | null;
  actorRole: string;
  action: string;
  target?: string | null;
  targetType?: string | null;
  time: Date;
  details?: Record<string, any>;
}

// ============================================================================
// Tasks & Submissions
// ============================================================================

export interface ITask {
  id: string;
  _id?: string;
  taskId: string;
  title: string;
  description: string;
  category: string;
  level: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SubmissionStatus =
  'submitted' | 'in_review' | 'feedback_given' | 'revision_requested' | 'accepted';

export interface IStatusHistoryEntry {
  changedBy: string;
  changedByName?: string;
  changedAt: Date;
  fromStatus: string;
  toStatus: string;
  note?: string;
}

export interface ISubmission {
  id: string;
  _id?: string;
  learner: string;
  learnerId?: string;
  learnerName?: string | null;
  learnerEmail?: string | null;
  taskId: string;
  taskTitle?: string | null;
  answerContent: string;
  status: SubmissionStatus;
  evaluator: string | null;
  evaluatorId?: string | null;
  evaluatorName?: string | null;
  rubricScores?: Record<string, number>;
  writtenFeedback: string;
  revisionCount: number;
  statusHistory: IStatusHistoryEntry[];
  submittedAt: Date;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Focus Sessions
// ============================================================================

export interface IFocusSessionConfig {
  focusDurationMinutes: number;
  breakDurationMinutes: number;
  enableLongBreak: boolean;
  longBreakDurationMinutes: number;
  longBreakInterval: number;
  soundEnabled: boolean;
}

export type FocusSessionState =
  'idle' | 'focusing' | 'paused' | 'break' | 'completed' | 'abandoned';

export type FocusPeriodType = 'focus' | 'short_break' | 'long_break';
export type FocusSessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface IFocusSession {
  id?: string;
  sessionId: string;
  learnerId: string;
  trackTitle: string;
  intention?: string | null;
  sessionState: FocusSessionState;
  periodType: FocusPeriodType;
  status: FocusSessionStatus;
  focusDurationMinutes: number;
  breakDurationMinutes: number;
  longBreakDurationMinutes: number;
  longBreakInterval: number;
  enableLongBreak: boolean;
  soundEnabled: boolean;
  totalPeriodSeconds: number;
  remainingSeconds: number;
  accumulatedFocusSeconds: number;
  totalBreakSeconds: number;
  completedCycles: number;
  startedAt: Date;
  pausedAt: Date | null;
  targetEndTime: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Clarity Question Bank & Progression
// ============================================================================

export type QuestionLevel = 'Easy' | 'Medium' | 'Hard';
export type QuestionTrack = 'General' | 'Coding';
export type QuestionSource = 'Human' | 'AI';
export type QuestionStatus =
  'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'ACTIVE' | 'REJECTED' | 'INACTIVE';

export interface IScoringRubricCriterion {
  criterion: string;
  maxScore: number;
  description: string;
}

export interface IAIMetadata {
  provider?: string;
  model?: string;
  generatedAt?: Date | string;
  similarityScore?: number;
  validationErrors?: string[];
  retryCount?: number;
}

export interface IQuestionBank {
  id?: string;
  questionId: string;
  topic: string;
  level: QuestionLevel;
  track: QuestionTrack;
  title: string;
  promptText: string;
  hint?: string | null;
  testScenario: string;
  expectedCriteria: string[];
  scoringRubric: IScoringRubricCriterion[];
  source: QuestionSource;
  status: QuestionStatus;
  version: number;
  aiMetadata?: IAIMetadata | null;
  createdBy?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  reviewNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type AssignmentStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'ABANDONED';

export interface IQuestionAssignment {
  id?: string;
  assignmentId: string;
  learnerId: string;
  questionId: string;
  topic: string;
  level: string;
  track: string;
  college?: string | null;
  institutionId?: string | null;
  cohortId?: string | null;
  assignedAt: Date;
  completedAt?: Date | null;
  status: AssignmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRubricFeedbackItem {
  criterion: string;
  score: number;
  maxScore: number;
  comment: string;
}

export interface IQuestionAttempt {
  id?: string;
  attemptId: string;
  assignmentId: string;
  learnerId: string;
  questionId: string;
  topic: string;
  level: string;
  track: string;
  startedAt: Date;
  submittedAt: Date;
  submittedAnswer: string;
  score: number;
  rubricFeedback: IRubricFeedbackItem[];
  overallFeedback?: string | null;
  evaluationStatus: 'PENDING' | 'EVALUATED';
  timeTakenSeconds: number;
  creditTransactionId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ExclusionScope = 'college' | 'batch' | 'cohort';

export interface IInstitutionExclusionConfig {
  id?: string;
  scope: ExclusionScope;
  exclusionDays: number;
  updatedBy?: string | null;
  updatedAt: Date;
  createdAt?: Date;
}

export type ClarityLevel = 'Easy' | 'Medium' | 'Hard';

export interface IClarityAttemptHistoryItem {
  attemptId: string;
  score: number;
  level: ClarityLevel;
  timestamp: Date | string;
}

export interface IClarityProgressionConfig {
  id?: string;
  upwardThreshold: number;
  consecutiveRequired: number;
  downwardThreshold: number;
  updatedBy: string;
  updatedAt: Date;
}

export interface ILearnerClarityProgression {
  id?: string;
  learnerId: string;
  topic: string;
  currentLevel: ClarityLevel;
  consecutiveHighScores: number;
  totalAttempts: number;
  lastScore?: number | null;
  history: IClarityAttemptHistoryItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================================================
// AI Tool Catalog, Evidence, History & Discovery Runs
// ============================================================================

export type ToolVerificationStatus =
  | VerificationStatus
  | 'VERIFIED_SEED'
  | 'DISCOVERED'
  | 'UNVERIFIED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'COMMUNITY_VERIFIED'
  | 'PENDING_VERIFICATION';

export type IAITool = AITool & {
  evidenceCoverage?: number;
  websiteUrl?: string;
  officialWebsite?: string;
  pricingDetails?: ToolPricing;
};

export type EvidenceSourceType =
  | 'OFFICIAL_WEBSITE'
  | 'OFFICIAL_BLOG'
  | 'OFFICIAL_DOCS'
  | 'OFFICIAL_PRICING'
  | 'OFFICIAL_RELEASE'
  | 'GITHUB'
  | 'HUGGING_FACE'
  | 'OTHER_TRUSTED_SOURCE'
  | string;

export type EvidenceCredibility = 'HIGH' | 'MEDIUM' | 'LOW';

export type EvidenceVerificationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'UNVERIFIED'
  | 'CONFLICTING'
  | 'EXPIRED';

export interface ToolEvidenceItem {
  id: string;
  toolId: string;
  claim: string;
  value: string;
  sourceUrl: string;
  sourceType: string;
  sourceTitle: string;
  publishedAt: string;
  verifiedAt: string;
  confidence: number;
  verificationStatus: EvidenceVerificationStatus;
}

export interface IToolEvidence {
  id: string;
  toolId: string;
  sourceType: EvidenceSourceType;
  sourceUrl: string;
  sourceTitle?: string;
  sourceName?: string | null;
  title?: string | null;
  evidenceText?: string | null;
  claim?: string;
  value?: string;
  discoveredAt?: Date;
  fetchedAt?: Date;
  publishedAt?: string;
  verifiedAt?: string;
  confidence?: number;
  credibility?: EvidenceCredibility | string | null;
  verificationStatus: EvidenceVerificationStatus;
  structuredData?: Record<string, any> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ToolChangeType =
  | 'NEW_TOOL'
  | 'VERSION_UPDATE'
  | 'CAPABILITY_UPDATE'
  | 'PRICING_UPDATE'
  | 'WEBSITE_UPDATE'
  | 'STATUS_CHANGE'
  | 'NEW_RELEASE'
  | 'CAPABILITY_ADDED'
  | 'PRICING_CHANGE'
  | 'FREE_TIER_CHANGE'
  | 'MODEL_UPDATE'
  | 'MAJOR_PRODUCT_UPDATE';

export interface ToolVersionRecord {
  id: string;
  toolId: string;
  version: string;
  changeType:
    | 'NEW_RELEASE'
    | 'CAPABILITY_ADDED'
    | 'PRICING_CHANGE'
    | 'FREE_TIER_CHANGE'
    | 'MODEL_UPDATE'
    | 'STATUS_CHANGE'
    | 'MAJOR_PRODUCT_UPDATE';
  summary: string;
  previousValue?: string;
  newValue?: string;
  detectedAt: string;
  sourceUrls: string[];
  verifiedAt: string;
}

export interface IToolVersionHistory {
  id: string;
  toolId: string;
  version?: string;
  changeType: ToolChangeType;
  changeSummary?: string | null;
  summary?: string;
  sourceUrl?: string | null;
  sourceUrls?: string[];
  detectedAt: string;
  verifiedAt?: string;
  previousData?: Record<string, any> | null;
  newData?: Record<string, any> | null;
  previousValue?: string | null;
  newValue?: string | null;
  recordedBy?: 'SEED_SCRIPT' | 'DISCOVERY_RUN' | 'ADMIN' | string | null;
  createdAt?: Date;
}

export type DiscoveryRunStatus = 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
export type DiscoveryRunSource = 'MANUAL_SEED' | 'ADMIN_IMPORT' | 'ADAPTER';

export interface IDiscoveryRunError {
  candidateId?: string;
  message: string;
  stack?: string;
}

export interface IToolDiscoveryRun {
  id: string;
  startedAt: Date;
  completedAt?: Date | null;
  status: DiscoveryRunStatus;
  source: DiscoveryRunSource;
  discoveredCount: number;
  newToolsCount: number;
  updatedToolsCount: number;
  duplicateCount: number;
  rejectedCount: number;
  errorCount: number;
  runErrors: IDiscoveryRunError[];
  createdAt: Date;
  updatedAt: Date;
}
