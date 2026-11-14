import { Prisma } from '@prisma/client';
import { prisma, isDatabaseConnected, isPrismaErrorCode } from '../config/prisma';
import { QuestionLevel, QuestionTrack, QuestionStatus, ExclusionScope } from '../types/models';
import { aiQuestionGeneratorService } from './aiQuestionGenerator.service';
import { initSeedQuestions } from './seedQuestions';
import { rubricEvaluatorService } from './rubricEvaluator.service';
import { creditsLedgerService } from './creditsLedger.service';
import { calculateFocusChallengeReward, focusChallengeRewardKey } from '../config/credits.config';
import { isValidId, toArray } from '../utils/id';
import { toJsonInput } from '../utils/userMapper';

export const TARGET_MINIMUM_PER_LEVEL = 30;
const GLOBAL_EXCLUSION_KEY = 'GLOBAL_EXCLUSION_POLICY';

export interface ServeQuestionParams {
  learnerId: string;
  topic: string;
  level: QuestionLevel;
  track?: QuestionTrack;
  userCollege?: string;
  cohortId?: string;
  batch?: string;
}

export interface SubmitAttemptParams {
  learnerId: string;
  assignmentId: string;
  answer: string;
  timeTakenSeconds?: number;
  creditTransactionId?: string;
}

export interface QuestionBankCoverageRow {
  topic: string;
  track: QuestionTrack;
  level: QuestionLevel;
  totalQuestions: number;
  approvedQuestions: number;
  availableQuestions: number;
  servedQuestions: number;
  aiGeneratedQuestions: number;
  rejectedOrInactive: number;
  neededToTarget: number;
}

export class QuestionBankService {
  /**
   * Resolves learner's institutional identity from PostgreSQL database.
   * If learner has no verified college info, returns null (never misclassifies into another institution).
   */
  public async resolveLearnerInstitution(
    learnerId: string,
    providedCollege?: string
  ): Promise<{ college: string | null; cohortId: string | null; batch: string | null }> {
    if (isDatabaseConnected() && isValidId(learnerId)) {
      try {
        const profile = await prisma.studentProfile.findUnique({
          where: { userId: learnerId },
        });
        if (profile) {
          const college = profile.instituteName || profile.instituteId || null;
          const cohort = profile.cohortId || null;
          const batch = profile.admissionYear ? String(profile.admissionYear) : null;
          return {
            college: college ? college.trim().toUpperCase() : null,
            cohortId: cohort,
            batch,
          };
        }

        const user = await prisma.user.findUnique({
          where: { id: learnerId },
          select: { college: true },
        });
        if (user && user.college && user.college.trim().length > 0) {
          return {
            college: user.college.trim().toUpperCase(),
            cohortId: null,
            batch: null,
          };
        }
      } catch {
        // Ignore lookup error and fall back to providedCollege if valid
      }
    }

    const cleanCollege =
      providedCollege && providedCollege.trim().length > 0
        ? providedCollege.trim().toUpperCase()
        : null;

    return {
      college: cleanCollege,
      cohortId: null,
      batch: null,
    };
  }

  /**
   * Gets the active exclusion configuration from PostgreSQL.
   */
  public async getExclusionConfig(): Promise<{ scope: ExclusionScope; exclusionDays: number }> {
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const configDoc = await prisma.institutionExclusionConfig.upsert({
      where: { configKey: GLOBAL_EXCLUSION_KEY },
      create: {
        configKey: GLOBAL_EXCLUSION_KEY,
        scope: 'college',
        exclusionDays: 30,
        updatedBy: 'SYSTEM_DEFAULT',
      },
      update: {},
    });

    return {
      scope: configDoc.scope as ExclusionScope,
      exclusionDays: configDoc.exclusionDays,
    };
  }

  /**
   * Updates the institution exclusion policy (Admin only).
   */
  public async updateExclusionConfig(
    scope: ExclusionScope,
    exclusionDays: number,
    adminId?: string
  ): Promise<{ scope: ExclusionScope; exclusionDays: number; updatedAt: Date }> {
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const updated = await prisma.institutionExclusionConfig.upsert({
      where: { configKey: GLOBAL_EXCLUSION_KEY },
      create: {
        configKey: GLOBAL_EXCLUSION_KEY,
        scope,
        exclusionDays,
        updatedBy: adminId ?? null,
      },
      update: {
        scope,
        exclusionDays,
        updatedBy: adminId ?? null,
      },
    });

    return {
      scope: updated.scope as ExclusionScope,
      exclusionDays: updated.exclusionDays,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Returns current active assignment for a learner, if one is in progress.
   * Reloading the application does NOT create duplicate assignments.
   */
  public async getCurrentAssignment(learnerId: string): Promise<any | null> {
    if (!isDatabaseConnected() || !learnerId) return null;

    const active = await prisma.questionAssignment.findFirst({
      where: {
        learnerId,
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
      },
      orderBy: { assignedAt: 'desc' },
    });

    if (!active) return null;

    const question = await prisma.questionBank.findUnique({
      where: { questionId: active.questionId },
    });

    return { assignment: active, question };
  }

  /**
   * Serves an eligible question to a learner:
   * 1. Resolves institution identity.
   * 2. Checks individual no-repeat rule: learner never receives the same question twice.
   * 3. Checks institution exclusion window (provisional default 30 days).
   * 4. Selects candidate question or triggers backend AI generation if bank is exhausted.
   * 5. Atomically creates assignment record.
   */
  public async serveQuestion(params: ServeQuestionParams): Promise<{
    assignment: any;
    question: any;
    source: 'BANK' | 'AI_GENERATED';
  }> {
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const track = params.track || 'General'; // Non-Coder Default

    // 1. Check if learner already has an ongoing assignment for this topic and level
    const existingOngoing = await this.getCurrentAssignment(params.learnerId);
    if (
      existingOngoing &&
      existingOngoing.assignment.topic === params.topic &&
      existingOngoing.assignment.level === params.level
    ) {
      return {
        assignment: existingOngoing.assignment,
        question: existingOngoing.question,
        source: 'BANK',
      };
    }

    // 2. Resolve learner institutional identity
    const institution = await this.resolveLearnerInstitution(params.learnerId, params.userCollege);

    // 3. Collect excluded question IDs
    const excludedQuestionIds = new Set<string>();

    // 3a. Personal history exclusion: Learner never receives same question twice
    const personalHistoryIds = await this.getLearnerServedQuestionIds(params.learnerId);
    for (const qid of personalHistoryIds) {
      excludedQuestionIds.add(qid);
    }

    // 3b. Same-institution exclusion
    const exclusionConfig = await this.getExclusionConfig();
    const exclusionWindowMs = exclusionConfig.exclusionDays * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - exclusionWindowMs);

    if (institution.college) {
      const institutionExcluded = await this.getInstitutionExcludedQuestionIds(
        institution.college,
        params.learnerId,
        cutoffDate
      );
      for (const qid of institutionExcluded) {
        excludedQuestionIds.add(qid);
      }
    }

    // 4. Query eligible questions from QuestionBank
    const excludedArray = Array.from(excludedQuestionIds);
    let candidate = await this.findEligibleBankQuestion(
      params.topic,
      params.level,
      track,
      excludedArray
    );

    let source: 'BANK' | 'AI_GENERATED' = 'BANK';

    // 5. If bank is exhausted, trigger backend AI generation
    if (!candidate) {
      const existingPool = await this.getAllQuestionsForTopic(params.topic);
      const generated = await aiQuestionGeneratorService.generateQuestion({
        topic: params.topic,
        level: params.level,
        track,
        existingQuestions: existingPool,
      });

      // Save generated question to QuestionBank
      candidate = await this.saveQuestion(generated);
      source = 'AI_GENERATED';
    }

    // 6. Atomically persist question assignment
    const assignmentId = `asgn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const assignment = await this.createAssignment({
      assignmentId,
      learnerId: params.learnerId,
      questionId: candidate.questionId,
      topic: candidate.topic,
      level: candidate.level,
      track: candidate.track,
      college: institution.college || null,
      institutionId: null,
      cohortId: institution.cohortId || null,
      assignedAt: new Date(),
      status: 'ASSIGNED',
    });

    return {
      assignment,
      question: candidate,
      source,
    };
  }

  /**
   * Submits a learner attempt, scores it against the rubric, and saves immutable record.
   */
  public async submitAttempt(params: SubmitAttemptParams): Promise<{
    attempt: any;
    assignment: any;
    reward?: any;
  }> {
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const { learnerId, assignmentId, answer, creditTransactionId } = params;

    // 1. Fetch assignment
    const assignment = await prisma.questionAssignment.findFirst({
      where: { assignmentId, learnerId },
    });

    if (!assignment) {
      throw new Error('Assignment not found or does not belong to learner.');
    }

    // 1b. Duplicate submission lock guard (HTTP 409)
    if (assignment.status === 'SUBMITTED') {
      const lockError: any = new Error('This task has already been submitted and is locked.');
      lockError.code = 'TASK_LOCKED';
      lockError.status = 409;
      throw lockError;
    }

    // 2. Fetch Question
    const question = await prisma.questionBank.findUnique({
      where: { questionId: assignment.questionId },
    });

    if (!question) {
      throw new Error('Assigned question not found in Question Bank.');
    }

    // 3. Server-authoritative Genuine AI Rubric Evaluation
    const cleanAnswer = answer.trim();
    const evaluation = await rubricEvaluatorService.evaluateAnswer({
      question: {
        title: question.title,
        promptText: question.promptText,
        testScenario: question.testScenario,
        expectedCriteria: question.expectedCriteria,
      },
      rubric: toArray(question.scoringRubric),
      learnerAnswer: cleanAnswer,
    });

    const rubricScores = evaluation.criteria.map((c) => ({
      criterion: c.criterion,
      score: c.score,
      maxScore: c.maxScore,
      comment: c.feedback,
    }));

    const normalizedScore = evaluation.overallScore;
    const overallFeedback = evaluation.overallFeedback;

    const attemptId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // 4. Server-Side Authoritative Timing Calculation
    const submittedAt = new Date();
    const assignedAt = assignment.assignedAt ? new Date(assignment.assignedAt) : submittedAt;
    const serverDurationSeconds = Math.max(
      0,
      Math.floor((submittedAt.getTime() - assignedAt.getTime()) / 1000)
    );

    // 5. Calculate Reward Tiers (FOCUS_CHALLENGE_RULES)
    const reward = calculateFocusChallengeReward(
      (assignment.level as QuestionLevel) || 'Easy',
      serverDurationSeconds
    );
    const idempotencyKey = focusChallengeRewardKey(assignmentId);
    let finalTxId: string | undefined = creditTransactionId;

    if (reward.credits > 0) {
      try {
        const ledgerResult = await creditsLedgerService.executeTransaction({
          userId: learnerId,
          type: 'EARN',
          category: 'REWARD',
          amount: reward.credits,
          reason: `Completed Focus Challenge: ${assignment.topic} (${assignment.level}) - ${reward.tier} (+${reward.credits} AC)`,
          source: 'FOCUS_CHALLENGE',
          sourceId: idempotencyKey,
          idempotencyKey,
        });
        if (ledgerResult.transaction?.id) {
          finalTxId = ledgerResult.transaction.id;
        } else {
          finalTxId = idempotencyKey;
        }
      } catch (txErr: any) {
        console.warn('[QuestionBank] Credits ledger transaction notice:', txErr.message);
      }

      if (reward.xp > 0) {
        try {
          await prisma.user.update({
            where: { id: learnerId },
            data: { xpPoints: { increment: reward.xp } },
          });
        } catch (xpErr: any) {
          console.warn('[QuestionBank] XP update notice:', xpErr.message);
        }
      }
    }

    // 6. Atomically lock assignment and persist immutable attempt record in PostgreSQL
    const { savedAttempt, updatedAssignment } = await prisma.$transaction(async (tx) => {
      const lockUpdate = await tx.questionAssignment.updateMany({
        where: {
          assignmentId,
          learnerId,
          status: { not: 'SUBMITTED' },
        },
        data: {
          status: 'SUBMITTED',
          completedAt: submittedAt,
        },
      });

      if (lockUpdate.count === 0) {
        const lockError: any = new Error('This task has already been submitted and is locked.');
        lockError.code = 'TASK_LOCKED';
        lockError.status = 409;
        throw lockError;
      }

      const attemptRow = await tx.questionAttempt.create({
        data: {
          attemptId,
          assignmentId,
          learnerId,
          questionId: question.questionId,
          topic: question.topic,
          level: question.level,
          track: question.track,
          startedAt: assignedAt,
          submittedAt,
          submittedAnswer: cleanAnswer,
          score: normalizedScore,
          rubricFeedback: toJsonInput(rubricScores),
          overallFeedback,
          evaluationStatus: 'EVALUATED',
          timeTakenSeconds: serverDurationSeconds,
          creditTransactionId: reward.credits > 0 ? (finalTxId ?? null) : null,
        },
      });

      const refreshedAssignment = await tx.questionAssignment.findUnique({
        where: { assignmentId },
      });

      return {
        savedAttempt: {
          ...attemptRow,
          rubricFeedback: toArray(attemptRow.rubricFeedback),
        },
        updatedAssignment: refreshedAssignment || {
          ...assignment,
          status: 'SUBMITTED',
          completedAt: submittedAt,
        },
      };
    });

    return {
      attempt: savedAttempt,
      assignment: updatedAssignment,
      reward,
    };
  }

  /**
   * Retrieves attempt history for a learner. Cross-user access is rejected.
   */
  public async getAttemptHistory(
    learnerId: string,
    filters?: { topic?: string; level?: string }
  ): Promise<any[]> {
    if (!isDatabaseConnected() || !learnerId) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const where: Prisma.QuestionAttemptWhereInput = { learnerId };
    if (filters?.topic) where.topic = filters.topic;
    if (filters?.level) where.level = filters.level;

    const rows = await prisma.questionAttempt.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
    });

    return rows.map((r) => ({
      ...r,
      rubricFeedback: toArray(r.rubricFeedback),
    }));
  }

  /**
   * Administrative Question Bank Coverage Report.
   * Reports Question counts and gap to target minimum (30).
   */
  public async getCoverageReport(): Promise<QuestionBankCoverageRow[]> {
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const totalCount = await prisma.questionBank.count();
    if (totalCount === 0) {
      await initSeedQuestions();
    }

    const topics = [
      'Checking AI',
      'AI Workflow Design',
      'AI Agents & Autonomous Workflows',
      'Prompt Engineering & Grounding',
    ];
    const levels: QuestionLevel[] = ['Easy', 'Medium', 'Hard'];
    const tracks: QuestionTrack[] = ['General', 'Coding'];

    const report: QuestionBankCoverageRow[] = [];

    for (const topic of topics) {
      for (const track of tracks) {
        for (const level of levels) {
          const [questions, servedCount] = await Promise.all([
            prisma.questionBank.findMany({
              where: { topic, track, level },
              select: { status: true, source: true },
            }),
            prisma.questionAssignment.count({
              where: { topic, track, level },
            }),
          ]);

          const total = questions.length;
          const approved = questions.filter(
            (q) => q.status === 'APPROVED' || q.status === 'ACTIVE'
          ).length;
          const available = approved;
          const aiGenerated = questions.filter((q) => q.source === 'AI').length;
          const rejectedOrInactive = questions.filter(
            (q) => q.status === 'REJECTED' || q.status === 'INACTIVE'
          ).length;
          const neededToTarget = Math.max(0, TARGET_MINIMUM_PER_LEVEL - available);

          report.push({
            topic,
            track,
            level,
            totalQuestions: total,
            approvedQuestions: approved,
            availableQuestions: available,
            servedQuestions: servedCount,
            aiGeneratedQuestions: aiGenerated,
            rejectedOrInactive,
            neededToTarget,
          });
        }
      }
    }

    return report;
  }

  // --- Helper Methods ---

  public async getLearnerServedQuestionIds(learnerId: string): Promise<string[]> {
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const assignments = await prisma.questionAssignment.findMany({
      where: { learnerId },
      select: { questionId: true },
    });
    return assignments.map((a) => a.questionId);
  }

  public async getInstitutionExcludedQuestionIds(
    college: string,
    currentLearnerId: string,
    cutoffDate: Date
  ): Promise<string[]> {
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const cleanCollege = college.trim().toUpperCase();
    const assignments = await prisma.questionAssignment.findMany({
      where: {
        college: cleanCollege,
        learnerId: { not: currentLearnerId },
        assignedAt: { gte: cutoffDate },
      },
      select: { questionId: true },
    });
    return assignments.map((a) => a.questionId);
  }

  public async findEligibleBankQuestion(
    topic: string,
    level: QuestionLevel,
    track: QuestionTrack,
    excludedIds: string[]
  ): Promise<any | null> {
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const totalCount = await prisma.questionBank.count();
    if (totalCount === 0) {
      await initSeedQuestions();
    }

    const activeStatuses: QuestionStatus[] = ['ACTIVE', 'APPROVED'];

    const where: Prisma.QuestionBankWhereInput = {
      topic,
      level,
      track,
      status: { in: activeStatuses },
    };
    if (excludedIds.length > 0) {
      where.questionId = { notIn: excludedIds };
    }

    const candidates = await prisma.questionBank.findMany({ where });

    if (candidates.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex];
  }

  public async getAllQuestionsForTopic(topic: string): Promise<any[]> {
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    return prisma.questionBank.findMany({ where: { topic } });
  }

  public async saveQuestion(questionData: any): Promise<any> {
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const payload = {
      questionId: questionData.questionId,
      topic: questionData.topic,
      level: questionData.level,
      track: questionData.track || 'General',
      title: questionData.title,
      promptText: questionData.promptText,
      hint: questionData.hint ?? null,
      testScenario: questionData.testScenario,
      expectedCriteria: Array.isArray(questionData.expectedCriteria)
        ? questionData.expectedCriteria
        : [],
      scoringRubric: toJsonInput(questionData.scoringRubric || []),
      source: questionData.source || 'Human',
      status: questionData.status || 'ACTIVE',
      version: questionData.version || 1,
      aiMetadata: questionData.aiMetadata ? toJsonInput(questionData.aiMetadata) : Prisma.DbNull,
      createdBy: questionData.createdBy ?? null,
      reviewedBy: questionData.reviewedBy ?? null,
      reviewedAt: questionData.reviewedAt ?? null,
      reviewNotes: questionData.reviewNotes ?? null,
    };

    return prisma.questionBank.upsert({
      where: { questionId: questionData.questionId },
      update: {},
      create: payload,
    });
  }

  public async createAssignment(assignmentData: any): Promise<any> {
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    try {
      return await prisma.questionAssignment.create({
        data: {
          assignmentId: assignmentData.assignmentId,
          learnerId: assignmentData.learnerId,
          questionId: assignmentData.questionId,
          topic: assignmentData.topic,
          level: assignmentData.level,
          track: assignmentData.track || 'General',
          college: assignmentData.college ?? null,
          institutionId: assignmentData.institutionId ?? null,
          cohortId: assignmentData.cohortId ?? null,
          assignedAt: assignmentData.assignedAt || new Date(),
          status: assignmentData.status || 'ASSIGNED',
        },
      });
    } catch (err: unknown) {
      if (isPrismaErrorCode(err, 'P2002')) {
        return prisma.questionAssignment.findUnique({
          where: {
            learnerId_questionId: {
              learnerId: assignmentData.learnerId,
              questionId: assignmentData.questionId,
            },
          },
        });
      }
      throw err;
    }
  }
}

export const questionBankService = new QuestionBankService();
