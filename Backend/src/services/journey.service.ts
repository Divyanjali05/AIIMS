/**
 * journey.service.ts
 * =========================================================
 * Authoritative Server-Side Learner Journey & Assessment History Service (PostgreSQL + Prisma)
 *
 * Implements:
 * 1. Unified Learner Journey Overview with milestone progression.
 * 2. Immutable, paginated Assessment History across Diagnostic, Clarity, and Submissions.
 * 3. Deep Clarity progression integration (levels, topics, attempts, formative vs submitted).
 * 4. Focus activity integration (excluding breaks and abandoned sessions).
 * 5. Explainable Performance & Skill Analytics with data-sufficiency gating.
 * 6. Authoritative Next Best Learning Action recommendation based on verified learner state.
 */

import { prisma, isDatabaseConnected } from '../config/prisma';
import {
  IUser,
  IQuestionAttempt,
  ILearnerClarityProgression,
  ClarityLevel,
  IClarityAttemptHistoryItem,
  IRubricFeedbackItem,
  ISubmission,
  SubmissionStatus,
  IStatusHistoryEntry,
} from '../types/models';
import { FocusSessionService } from './focusSession.service';
import { isValidId, toArray, toRecord, withLegacyId } from '../utils/id';
import { userRecordToIUser } from '../utils/userMapper';

export interface MilestoneItem {
  id: string;
  order: number;
  name: string;
  subtitle: string;
  status: 'completed' | 'current' | 'upcoming' | 'locked';
  description: string;
  targetTab: string;
  actionLabel: string;
  completionDate?: string;
  score?: number | null;
  highlight?: string;
}

export interface JourneyOverviewResult {
  learnerId: string;
  currentStage: string;
  overallProgressPercent: number;
  completedMilestonesCount: number;
  totalMilestones: number;
  milestones: MilestoneItem[];
  latestAssessmentSummary: {
    completed: boolean;
    date?: string;
    score?: number | null;
    topCapability?: string;
    growthArea?: string;
  };
  claritySummary: {
    currentLevel: string;
    totalAttempts: number;
    completedTopicsCount: number;
  };
  focusSummary: {
    todayFocusMinutes: number;
    todayBreakMinutes: number;
    todayCompletedSessions: number;
    totalCompletedSessions: number;
  };
  nextBestAction: {
    actionTitle: string;
    actionReason: string;
    targetTab: string;
    actionButtonLabel: string;
    isLocked: boolean;
  };
}

export interface HistoricalAssessmentRecord {
  id: string;
  attemptNumber: number;
  type: 'diagnostic' | 'clarity' | 'focus' | 'submission';
  title: string;
  topic: string;
  level?: string;
  track?: string;
  score: number | null;
  maxScore: number;
  status: 'completed' | 'in_progress' | 'abandoned';
  date: string;
  timeTakenSeconds?: number;
  rubricSummary?: string;
  rubrics?: Array<{ criterion: string; score: number; maxScore: number; comment?: string }>;
  details?: Record<string, any>;
}

export interface AssessmentHistoryResult {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  records: HistoricalAssessmentRecord[];
}

export interface ClarityProgressResult {
  learnerId: string;
  overallCurrentLevel: string;
  totalAttempts: number;
  averageSubmittedScore: number | null;
  topics: Array<{
    topic: string;
    currentLevel: string;
    consecutiveHighScores: number;
    totalAttempts: number;
    lastScore?: number | null;
    history: IClarityAttemptHistoryItem[];
  }>;
  recentSubmittedAttempts: Array<{
    attemptId: string;
    topic: string;
    level: string;
    score: number;
    submittedAt: string;
    rubricCount: number;
  }>;
  clarityDistinctionNotice: string;
}

export interface FocusActivityResult {
  learnerId: string;
  todayFocusMinutes: number;
  todayBreakMinutes: number;
  todayCompletedSessions: number;
  totalCompletedSessions: number;
  recentSessions: Array<{
    sessionId: string;
    trackTitle: string;
    intention?: string | null;
    actualFocusMinutes: number;
    status: string;
    completedAt: string | null;
  }>;
  dataRulesNotice: string;
}

export interface PerformanceAnalyticsResult {
  learnerId: string;
  hasSufficientData: boolean;
  dataNotice?: string;
  strongestSkills: Array<{ name: string; score: number; domain: string }>;
  growthAreas: Array<{ name: string; score: number; domain: string }>;
  scoreTimeline: Array<{
    id: string;
    date: string;
    score: number;
    scoreType: 'diagnostic' | 'clarity';
    label: string;
  }>;
  basisExplanation: string;
}

export interface AssessmentHistoryOptions {
  page?: number;
  limit?: number;
  type?: 'all' | 'diagnostic' | 'clarity' | 'focus' | 'submission';
  status?: 'all' | 'completed' | 'in_progress' | 'abandoned';
  startDate?: string;
  endDate?: string;
}

export class JourneyService {
  /**
   * Helper: Resolve learner document by ID from PostgreSQL
   */
  private static async getLearner(learnerId: string): Promise<IUser | null> {
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }
    if (!isValidId(learnerId)) return null;

    const row = await prisma.user.findUnique({ where: { id: learnerId } });
    return row ? userRecordToIUser(row) : null;
  }

  /**
   * 1. GET LEARNER JOURNEY OVERVIEW
   */
  public static async getJourneyOverview(learnerId: string): Promise<JourneyOverviewResult> {
    const learner = await this.getLearner(learnerId);
    if (!learner) {
      throw new Error('LEARNER_NOT_FOUND');
    }

    // Diagnostic Assessment completion state
    const isAssessmentDone = learner.assessment?.status === 'completed';
    const isAnalysisViewed = learner.analysis?.status === 'viewed';
    const isAnalysisUnlocked = learner.analysis?.status === 'unlocked' || isAnalysisViewed;

    // AI Wallet state
    const walletCount = learner.aiWallet?.userTools?.length || 0;
    const isWalletExplored = walletCount > 0;

    // Clarity state from LearnerClarityProgression
    const clarityProgressions = await this.getLearnerClarityProgressions(learnerId);
    const clarityAttempts = await this.getLearnerQuestionAttempts(learnerId);
    const totalClarityAttempts = clarityAttempts.length;
    const isClarityCompleted =
      (learner.clarity?.completedTopics?.length || 0) > 0 ||
      learner.clarity?.status === 'completed' ||
      totalClarityAttempts > 0;

    let highestLevel = 'Easy';
    for (const prog of clarityProgressions) {
      if (prog.currentLevel === 'Hard') highestLevel = 'Hard';
      else if (prog.currentLevel === 'Medium' && highestLevel !== 'Hard') highestLevel = 'Medium';
    }

    // Focus state from FocusSessionService
    const focusDaily = await FocusSessionService.getDailyStats(learnerId);
    const isFocusSelected =
      learner.focus?.status === 'active' ||
      focusDaily.totalCompletedSessions > 0 ||
      !!learner.focus?.selectedTrack;

    // Other advanced stages
    const isRadarDone = (learner.radar?.investigatedSignalIds?.length || 0) > 0;
    const isRelevanceDone = learner.relevance?.status === 'completed';
    const isSolverDone = (learner.solver?.history?.length || 0) > 0;
    const isBuildDone = (learner.build?.projects?.length || 0) > 0;
    const isMentorAvailable = isAssessmentDone;

    // Canonical 10-Stage Milestones
    const milestones: MilestoneItem[] = [
      {
        id: 'understand',
        order: 1,
        name: 'Understand AI',
        subtitle: 'Baseline Diagnostic Assessment',
        status: isAssessmentDone ? 'completed' : 'current',
        description:
          'Complete 25-question multidimensional baseline evaluation across 5 AI capabilities.',
        targetTab: 'assessment',
        actionLabel: isAssessmentDone ? 'Review Diagnostic' : 'Start Assessment',
        completionDate: isAssessmentDone
          ? (learner.assessment?.completedAt ?? undefined)
          : undefined,
        score: isAssessmentDone
          ? learner.assessment?.evaluationResult?.percentageScore ||
            (learner.assessment?.scores
              ? Math.round(
                  (Object.values(learner.assessment.scores as Record<string, number>).reduce(
                    (a, b) => a + b,
                    0
                  ) /
                    25) *
                    100
                )
              : 85)
          : null,
        highlight: isAssessmentDone
          ? `Top Capability: ${learner.analysis?.topCapability || 'Workflow Design'}`
          : 'Awards +50 AC on completion',
      },
      {
        id: 'profile',
        order: 2,
        name: 'My AI Profile',
        subtitle: 'Skill Diagnostics & Benchmarks',
        status: isAnalysisViewed ? 'completed' : isAnalysisUnlocked ? 'current' : 'locked',
        description:
          'Actionable breakdown of your strengths, peer benchmarks, and personal growth areas.',
        targetTab: 'analysis',
        actionLabel: isAnalysisUnlocked ? 'View Profile' : 'Complete Assessment to Unlock',
        completionDate: isAnalysisViewed ? (learner.analysis?.unlockedAt ?? undefined) : undefined,
        highlight: isAnalysisUnlocked
          ? `Growth Opportunity: ${learner.analysis?.growthArea || 'Iterative Prompting'}`
          : undefined,
      },
      {
        id: 'wallet',
        order: 3,
        name: 'AI Wallet',
        subtitle: 'Intelligent Tool Stack',
        status: isWalletExplored ? 'completed' : isAnalysisUnlocked ? 'current' : 'upcoming',
        description:
          'Curate your active AI toolkit with natural-language matching and credit ledger tracking.',
        targetTab: 'wallet',
        actionLabel: isWalletExplored ? 'Manage Wallet' : 'Explore AI Tools',
        highlight: `${walletCount} Tools Bookmarked`,
      },
      {
        id: 'clarity',
        order: 4,
        name: 'Clarity Lab',
        subtitle: 'Deliberate AI Practice',
        status: isClarityCompleted ? 'completed' : isWalletExplored ? 'current' : 'upcoming',
        description: 'Solve real AI workflow challenges with multi-criteria rubric evaluations.',
        targetTab: 'clarity',
        actionLabel: isClarityCompleted ? 'Continue Clarity' : 'Enter Clarity Lab',
        highlight: `Current Difficulty: ${highestLevel} (${totalClarityAttempts} attempts)`,
      },
      {
        id: 'focus',
        order: 5,
        name: 'Focus Track',
        subtitle: 'Deep Work & Pomodoro Cycles',
        status: isFocusSelected ? 'completed' : isClarityCompleted ? 'current' : 'upcoming',
        description:
          'Execute focused study blocks on chosen AI capability tracks with authoritative timekeeping.',
        targetTab: 'focus',
        actionLabel: isFocusSelected ? 'Open Focus' : 'Choose Focus Track',
        highlight:
          focusDaily.todayFocusHours > 0
            ? `${focusDaily.todayFocusHours} hrs focused today`
            : 'Concentrate on high-priority track',
      },
      {
        id: 'radar',
        order: 6,
        name: 'AI Radar',
        subtitle: 'Emerging AI Breakthroughs',
        status: isRadarDone ? 'completed' : isFocusSelected ? 'upcoming' : 'locked',
        description:
          'Continuous intelligence feed of foundation model releases and technical tool breakthroughs.',
        targetTab: 'radar',
        actionLabel: isFocusSelected ? 'Investigate Signals' : 'Locked (Complete Focus)',
        highlight: isRadarDone
          ? `${learner.radar?.investigatedSignalIds?.length} Signals Investigated`
          : undefined,
      },
      {
        id: 'relevance',
        order: 7,
        name: 'AI Relevance',
        subtitle: 'Personal Impact Synthesis',
        status: isRelevanceDone ? 'completed' : isRadarDone ? 'upcoming' : 'locked',
        description:
          'Map emerging AI capabilities directly to your academic and professional workflow.',
        targetTab: 'relevance',
        actionLabel: isRadarDone ? 'Synthesize Payoff' : 'Locked (Prerequisites)',
      },
      {
        id: 'solver',
        order: 8,
        name: 'Problem Solver',
        subtitle: 'AI Workflow Architecture',
        status: isSolverDone ? 'completed' : isRelevanceDone ? 'upcoming' : 'locked',
        description:
          'Architect multi-agent and tool-routing workflows for complex business problems.',
        targetTab: 'solver',
        actionLabel: isRelevanceDone ? 'Synthesize Workflow' : 'Locked (Prerequisites)',
      },
      {
        id: 'build',
        order: 9,
        name: 'Projects Workspace',
        subtitle: 'Production Scaffolding',
        status: isBuildDone ? 'completed' : isSolverDone ? 'upcoming' : 'locked',
        description: 'Translate architecture blueprints into production codebase templates.',
        targetTab: 'build',
        actionLabel: isSolverDone ? 'Open Projects' : 'Locked (Prerequisites)',
      },
      {
        id: 'mentor',
        order: 10,
        name: 'AI Mentor',
        subtitle: 'Continuous Calibration',
        status: isMentorAvailable ? 'current' : 'locked',
        description: 'Adaptive AI mentorship and personalized growth trajectory recommendations.',
        targetTab: 'mentor',
        actionLabel: isMentorAvailable ? 'Consult AI Mentor' : 'Locked (Complete Assessment)',
      },
    ];

    const completedMilestonesCount = milestones.filter((m) => m.status === 'completed').length;
    const overallProgressPercent = Math.round((completedMilestonesCount / 10) * 100);

    let currentStage = 'Understand AI';
    const currentMilestone = milestones.find((m) => m.status === 'current');
    if (currentMilestone) {
      currentStage = currentMilestone.name;
    } else if (completedMilestonesCount === 10) {
      currentStage = 'Continuous Mastery';
    }

    const nextBestAction = this.computeNextBestAction(
      isAssessmentDone,
      isAnalysisViewed,
      isWalletExplored,
      isClarityCompleted,
      isFocusSelected,
      highestLevel
    );

    return {
      learnerId,
      currentStage,
      overallProgressPercent,
      completedMilestonesCount,
      totalMilestones: 10,
      milestones,
      latestAssessmentSummary: {
        completed: isAssessmentDone,
        date: learner.assessment?.completedAt ?? undefined,
        score: isAssessmentDone ? milestones[0].score : null,
        topCapability: learner.analysis?.topCapability,
        growthArea: learner.analysis?.growthArea,
      },
      claritySummary: {
        currentLevel: highestLevel,
        totalAttempts: totalClarityAttempts,
        completedTopicsCount: clarityProgressions.length,
      },
      focusSummary: {
        todayFocusMinutes: Math.round(focusDaily.todayFocusSeconds / 60),
        todayBreakMinutes: Math.round(focusDaily.todayBreakSeconds / 60),
        todayCompletedSessions: focusDaily.todayCompletedSessions,
        totalCompletedSessions: focusDaily.totalCompletedSessions,
      },
      nextBestAction,
    };
  }

  private static computeNextBestAction(
    isAssessmentDone: boolean,
    isAnalysisViewed: boolean,
    isWalletExplored: boolean,
    isClarityCompleted: boolean,
    isFocusSelected: boolean,
    clarityLevel: string
  ) {
    if (!isAssessmentDone) {
      return {
        actionTitle: 'Complete Baseline Assessment',
        actionReason:
          'Take your 25-question multidimensional baseline to discover your top AI capability and unlock your profile (+50 AC).',
        targetTab: 'assessment',
        actionButtonLabel: 'Start Assessment',
        isLocked: false,
      };
    }

    if (!isAnalysisViewed) {
      return {
        actionTitle: 'Review Your AI Profile',
        actionReason:
          'Your assessment is complete. Inspect your top capability benchmarks and personal growth recommendations.',
        targetTab: 'analysis',
        actionButtonLabel: 'View AI Profile',
        isLocked: false,
      };
    }

    if (!isWalletExplored) {
      return {
        actionTitle: 'Curate Your AI Wallet',
        actionReason:
          'Discover and bookmark verified AI tools matching your specific tasks and academic discipline.',
        targetTab: 'wallet',
        actionButtonLabel: 'Explore AI Wallet',
        isLocked: false,
      };
    }

    if (!isClarityCompleted) {
      return {
        actionTitle: 'Practice in Clarity Lab',
        actionReason:
          'Solve practical AI tasks with multi-criteria rubric evaluations to build repeatable capability.',
        targetTab: 'clarity',
        actionButtonLabel: 'Enter Clarity Lab',
        isLocked: false,
      };
    }

    if (!isFocusSelected) {
      return {
        actionTitle: 'Start a Focus Session',
        actionReason:
          'Concentrate on your chosen capability track with authoritative Pomodoro cycles and zero distractions.',
        targetTab: 'focus',
        actionButtonLabel: 'Start Focus Session',
        isLocked: false,
      };
    }

    return {
      actionTitle: `Advance Clarity to ${clarityLevel === 'Easy' ? 'Medium' : 'Hard'} Level`,
      actionReason:
        'Score 85%+ on two consecutive Clarity tasks to level up and deepen your AI engineering mental models.',
      targetTab: 'clarity',
      actionButtonLabel: 'Continue Clarity Lab',
      isLocked: false,
    };
  }

  /**
   * 2. GET ASSESSMENT HISTORY (Paginated & Filtered)
   */
  public static async getAssessmentHistory(
    learnerId: string,
    query: AssessmentHistoryOptions = {}
  ): Promise<AssessmentHistoryResult> {
    const learner = await this.getLearner(learnerId);
    if (!learner) {
      throw new Error('LEARNER_NOT_FOUND');
    }

    const allRecords: HistoricalAssessmentRecord[] = [];

    // 1. Diagnostic Assessment record
    if (learner.assessment?.status === 'completed') {
      const percentageScore =
        learner.assessment?.evaluationResult?.percentageScore ||
        (learner.assessment?.scores
          ? Math.round(
              (Object.values(learner.assessment.scores as Record<string, number>).reduce(
                (a, b) => a + b,
                0
              ) /
                25) *
                100
            )
          : 85);

      allRecords.push({
        id: `diag-${learnerId}`,
        attemptNumber: 1,
        type: 'diagnostic',
        title: 'Baseline AI Diagnostic Assessment',
        topic: 'AI Capability Foundations',
        score: percentageScore,
        maxScore: 100,
        status: 'completed',
        date:
          learner.assessment?.completedAt ||
          learner.createdAt?.toISOString?.() ||
          new Date().toISOString(),
        rubricSummary:
          '25 questions evaluated across 5 core dimensions: Understanding, Using, Solving, Scaling, and Adapting.',
        details: learner.assessment?.scores,
      });
    } else if (learner.assessment?.status === 'in_progress') {
      allRecords.push({
        id: `diag-inprogress-${learnerId}`,
        attemptNumber: 1,
        type: 'diagnostic',
        title: 'Baseline AI Diagnostic Assessment',
        topic: 'AI Capability Foundations',
        score: null,
        maxScore: 100,
        status: 'in_progress',
        date: learner.updatedAt?.toISOString?.() || new Date().toISOString(),
        rubricSummary: 'Assessment in progress',
      });
    }

    // 2. Clarity Attempts
    const questionAttempts = await this.getLearnerQuestionAttempts(learnerId);
    const attemptsByTopic = new Map<string, number>();

    for (const qa of questionAttempts) {
      const topicKey = `${qa.topic}-${qa.questionId}`;
      const count = (attemptsByTopic.get(topicKey) || 0) + 1;
      attemptsByTopic.set(topicKey, count);

      const isFocus = qa.track === 'Focus' || qa.topic?.toLowerCase().includes('focus');
      const attemptType: 'clarity' | 'focus' = isFocus ? 'focus' : 'clarity';
      const title = isFocus ? `Focus Challenge: ${qa.topic}` : `Clarity Lab: ${qa.topic}`;

      allRecords.push({
        id: qa.attemptId,
        attemptNumber: count,
        type: attemptType,
        title,
        topic: qa.topic,
        level: qa.level,
        track: qa.track || 'General',
        score: qa.score,
        maxScore: 100,
        status: qa.evaluationStatus === 'EVALUATED' ? 'completed' : 'in_progress',
        date: qa.submittedAt ? new Date(qa.submittedAt).toISOString() : new Date().toISOString(),
        timeTakenSeconds: qa.timeTakenSeconds,
        rubricSummary: `${qa.rubricFeedback?.length || 0} rubric criteria evaluated`,
        rubrics: qa.rubricFeedback?.map((r) => ({
          criterion: r.criterion,
          score: r.score,
          maxScore: r.maxScore,
          comment: r.comment,
        })),
      });
    }

    // 3. Question Assignments in progress or abandoned without attempt
    const assignments = await this.getLearnerQuestionAssignments(learnerId);
    for (const assign of assignments) {
      if (assign.status === 'IN_PROGRESS' || assign.status === 'ABANDONED') {
        allRecords.push({
          id: assign.assignmentId,
          attemptNumber: 1,
          type: 'clarity',
          title: `Clarity Task: ${assign.topic}`,
          topic: assign.topic,
          level: assign.level,
          score: null,
          maxScore: 100,
          status: assign.status === 'ABANDONED' ? 'abandoned' : 'in_progress',
          date: assign.assignedAt
            ? new Date(assign.assignedAt).toISOString()
            : new Date().toISOString(),
          rubricSummary:
            assign.status === 'ABANDONED' ? 'Task session abandoned' : 'Task in progress',
        });
      }
    }

    // 4. Evaluator Submissions
    const submissions = await this.getLearnerSubmissions(learnerId);
    for (const sub of submissions) {
      const isAccepted = sub.status === 'accepted' || sub.status === 'feedback_given';
      const rubricScores = sub.rubricScores || {};
      const scoreVals = Object.values(rubricScores) as number[];
      const avgScore =
        scoreVals.length > 0
          ? Math.round((scoreVals.reduce((a, b) => a + b, 0) / (scoreVals.length * 5)) * 100)
          : null;

      allRecords.push({
        id: String(sub._id || sub.id || sub.taskId),
        attemptNumber: (sub.revisionCount || 0) + 1,
        type: 'submission',
        title: sub.taskTitle || 'Applied Challenge Submission',
        topic: 'Applied Practice',
        score: avgScore,
        maxScore: 100,
        status: isAccepted ? 'completed' : 'in_progress',
        date: sub.submittedAt ? new Date(sub.submittedAt).toISOString() : new Date().toISOString(),
        rubricSummary: sub.writtenFeedback || `Status: ${sub.status}`,
      });
    }

    let filtered = allRecords;
    if (query.type && query.type !== 'all') {
      filtered = filtered.filter((r) => r.type === query.type);
    }

    if (query.status && query.status !== 'all') {
      filtered = filtered.filter((r) => r.status === query.status);
    }

    if (query.startDate) {
      const startMs = new Date(query.startDate).getTime();
      filtered = filtered.filter((r) => new Date(r.date).getTime() >= startMs);
    }
    if (query.endDate) {
      const endMs = new Date(query.endDate).getTime();
      filtered = filtered.filter((r) => new Date(r.date).getTime() <= endMs);
    }

    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const page = query.page || 1;
    const limit = query.limit || 10;
    const totalRecords = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
    const offset = (page - 1) * limit;
    const paginatedRecords = filtered.slice(offset, offset + limit);

    return {
      page,
      limit,
      totalRecords,
      totalPages,
      records: paginatedRecords,
    };
  }

  /**
   * 3. GET CLARITY PROGRESS
   */
  public static async getClarityProgress(learnerId: string): Promise<ClarityProgressResult> {
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const progressions = await this.getLearnerClarityProgressions(learnerId);
    const attempts = await this.getLearnerQuestionAttempts(learnerId);

    let highestLevel = 'Easy';
    let totalAttemptsCount = 0;
    let scoreSum = 0;
    let scoredAttemptsCount = 0;

    const topics = progressions.map((prog) => {
      totalAttemptsCount += prog.totalAttempts || 0;
      if (prog.lastScore !== undefined && prog.lastScore !== null) {
        scoreSum += prog.lastScore;
        scoredAttemptsCount++;
      }
      if (prog.currentLevel === 'Hard') highestLevel = 'Hard';
      else if (prog.currentLevel === 'Medium' && highestLevel !== 'Hard') highestLevel = 'Medium';

      return {
        topic: prog.topic,
        currentLevel: prog.currentLevel,
        consecutiveHighScores: prog.consecutiveHighScores,
        totalAttempts: prog.totalAttempts,
        lastScore: prog.lastScore,
        history: prog.history || [],
      };
    });

    const recentSubmittedAttempts = attempts.slice(0, 10).map((a) => ({
      attemptId: a.attemptId,
      topic: a.topic,
      level: a.level,
      score: a.score,
      submittedAt: a.submittedAt ? new Date(a.submittedAt).toISOString() : new Date().toISOString(),
      rubricCount: a.rubricFeedback?.length || 0,
    }));

    const averageSubmittedScore =
      scoredAttemptsCount > 0 ? Math.round(scoreSum / scoredAttemptsCount) : null;

    return {
      learnerId,
      overallCurrentLevel: highestLevel,
      totalAttempts: totalAttemptsCount,
      averageSubmittedScore,
      topics,
      recentSubmittedAttempts,
      clarityDistinctionNotice:
        'Clarity distinction: Formative "Run" practice evaluations inside the Task Lab do not count toward grading or progression. Only authoritative "Submit" attempts are recorded in your verified learning history.',
    };
  }

  /**
   * 4. GET FOCUS ACTIVITY SUMMARY
   */
  public static async getFocusActivity(learnerId: string): Promise<FocusActivityResult> {
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const dailyStats = await FocusSessionService.getDailyStats(learnerId);
    const history = await FocusSessionService.getSessionHistory(learnerId, 'all');

    const recentSessions = history.slice(0, 10).map((s) => ({
      sessionId: s.sessionId,
      trackTitle: s.trackTitle,
      intention: s.intention,
      actualFocusMinutes: Math.round((s.accumulatedFocusSeconds || 0) / 60),
      status: s.status,
      completedAt: s.completedAt ? new Date(s.completedAt).toISOString() : null,
    }));

    return {
      learnerId,
      todayFocusMinutes: Math.round(dailyStats.todayFocusSeconds / 60),
      todayBreakMinutes: Math.round(dailyStats.todayBreakSeconds / 60),
      todayCompletedSessions: dailyStats.todayCompletedSessions,
      totalCompletedSessions: dailyStats.totalCompletedSessions,
      recentSessions,
      dataRulesNotice:
        'Focus time rules: Break duration is strictly excluded from focus time calculations. Abandoned sessions are recorded in audit logs but excluded from completed session totals.',
    };
  }

  /**
   * 5. GET PERFORMANCE & SKILL ANALYTICS
   */
  public static async getPerformanceAnalytics(
    learnerId: string
  ): Promise<PerformanceAnalyticsResult> {
    const learner = await this.getLearner(learnerId);
    if (!learner) {
      throw new Error('LEARNER_NOT_FOUND');
    }

    const isAssessmentDone = learner.assessment?.status === 'completed';
    const attempts = await this.getLearnerQuestionAttempts(learnerId);

    if (!isAssessmentDone && attempts.length < 2) {
      return {
        learnerId,
        hasSufficientData: false,
        dataNotice:
          'Insufficient historical data to infer skill mastery. Complete your baseline diagnostic assessment and at least two Clarity tasks to generate reliable performance analytics.',
        strongestSkills: [],
        growthAreas: [],
        scoreTimeline: [],
        basisExplanation:
          'Skill analytics are computed exclusively from verified diagnostic assessments and evaluated Clarity rubric attempts.',
      };
    }

    const strongestSkills: Array<{ name: string; score: number; domain: string }> = [];
    const growthAreas: Array<{ name: string; score: number; domain: string }> = [];
    const scoreTimeline: Array<{
      id: string;
      date: string;
      score: number;
      scoreType: 'diagnostic' | 'clarity';
      label: string;
    }> = [];

    if (isAssessmentDone && learner.assessment?.scores) {
      const dimMap: Record<string, string> = {
        'Understanding AI': 'Theoretical Foundations',
        'Using AI': 'Practical Prompting',
        'Solving with AI': 'Workflow Architecture',
        'Scaling with AI': 'Autonomous Systems',
        'Adapting to AI': 'Continuous Meta-Learning',
      };

      for (const [dim, rawScore] of Object.entries(
        learner.assessment.scores as Record<string, number>
      )) {
        const normalized = Math.min(100, Math.round((Number(rawScore) / 5) * 100));
        const item = { name: dim, score: normalized, domain: dimMap[dim] || 'AI Capability' };

        if (normalized >= 70) {
          strongestSkills.push(item);
        } else {
          growthAreas.push(item);
        }
      }

      const diagDate =
        learner.assessment?.completedAt ||
        learner.createdAt?.toISOString?.() ||
        new Date().toISOString();
      scoreTimeline.push({
        id: `diag-${learnerId}`,
        date: diagDate,
        score:
          learner.assessment?.evaluationResult?.percentageScore ||
          Math.round(
            (Object.values(learner.assessment.scores as Record<string, number>).reduce(
              (a, b) => a + b,
              0
            ) /
              25) *
              100
          ),
        scoreType: 'diagnostic',
        label: 'Baseline Assessment Overall',
      });
    }

    for (const a of attempts) {
      scoreTimeline.push({
        id: a.attemptId,
        date: a.submittedAt ? new Date(a.submittedAt).toISOString() : new Date().toISOString(),
        score: a.score,
        scoreType: 'clarity',
        label: `Clarity: ${a.topic} (${a.level})`,
      });

      if (a.score >= 80) {
        if (!strongestSkills.some((s) => s.name === a.topic)) {
          strongestSkills.push({ name: a.topic, score: a.score, domain: 'Clarity Lab' });
        }
      } else if (a.score < 65) {
        if (!growthAreas.some((g) => g.name === a.topic)) {
          growthAreas.push({ name: a.topic, score: a.score, domain: 'Clarity Lab' });
        }
      }
    }

    scoreTimeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      learnerId,
      hasSufficientData: true,
      strongestSkills,
      growthAreas,
      scoreTimeline,
      basisExplanation:
        'Scores reflect server-persisted records: Diagnostic assessment scores are normalized across 5 foundational dimensions (0-100%). Clarity scores represent multi-criteria rubric evaluations from final submitted tasks.',
    };
  }

  private static async getLearnerClarityProgressions(
    learnerId: string
  ): Promise<ILearnerClarityProgression[]> {
    if (!isDatabaseConnected()) return [];
    const rows = await prisma.learnerClarityProgression.findMany({ where: { learnerId } });
    return rows.map((r) => ({
      id: r.id,
      learnerId: r.learnerId,
      topic: r.topic,
      currentLevel: r.currentLevel as ClarityLevel,
      consecutiveHighScores: r.consecutiveHighScores,
      totalAttempts: r.totalAttempts,
      lastScore: r.lastScore,
      history: toArray<IClarityAttemptHistoryItem>(r.history),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  private static async getLearnerQuestionAttempts(learnerId: string): Promise<IQuestionAttempt[]> {
    if (!isDatabaseConnected()) return [];
    const rows = await prisma.questionAttempt.findMany({
      where: { learnerId },
      orderBy: { submittedAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      attemptId: r.attemptId,
      assignmentId: r.assignmentId,
      learnerId: r.learnerId,
      questionId: r.questionId,
      topic: r.topic,
      level: r.level,
      track: r.track,
      startedAt: r.startedAt,
      submittedAt: r.submittedAt,
      submittedAnswer: r.submittedAnswer,
      score: r.score,
      rubricFeedback: toArray<IRubricFeedbackItem>(r.rubricFeedback),
      overallFeedback: r.overallFeedback,
      evaluationStatus: r.evaluationStatus as 'PENDING' | 'EVALUATED',
      timeTakenSeconds: r.timeTakenSeconds,
      creditTransactionId: r.creditTransactionId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  private static async getLearnerQuestionAssignments(learnerId: string) {
    if (!isDatabaseConnected()) return [];
    return prisma.questionAssignment.findMany({ where: { learnerId } });
  }

  private static async getLearnerSubmissions(learnerId: string): Promise<ISubmission[]> {
    if (!isDatabaseConnected()) return [];
    const rows = await prisma.submission.findMany({
      where: { learnerId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) =>
      withLegacyId({
        id: r.id,
        learner: r.learnerId,
        learnerId: r.learnerId,
        learnerName: r.learnerName,
        learnerEmail: r.learnerEmail,
        taskId: r.taskId,
        taskTitle: r.taskTitle,
        answerContent: r.answerContent,
        status: r.status as SubmissionStatus,
        evaluator: r.evaluatorId,
        evaluatorId: r.evaluatorId,
        evaluatorName: r.evaluatorName,
        rubricScores: toRecord(r.rubricScores) as Record<string, number>,
        writtenFeedback: r.writtenFeedback,
        revisionCount: r.revisionCount,
        statusHistory: toArray<IStatusHistoryEntry>(r.statusHistory),
        submittedAt: r.submittedAt,
        reviewedAt: r.reviewedAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })
    );
  }
}
