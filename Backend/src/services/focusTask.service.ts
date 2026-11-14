/**
 * focusTask.service.ts
 * ============================================================================
 * AIIMS Phase 5: Authoritative Server-Side Focus Challenge & Task Engine
 *
 * Implements:
 * 1. 3 Canonical Focus Categories with 45 reviewed & approved questions.
 * 2. Server-authoritative timer tracking: `targetEndTime = startedAt + durationSeconds`.
 *    - Easy: 10 min (600s)
 *    - Medium: 20 min (1200s)
 *    - Hard: 30 min (1800s)
 * 3. Product Decision D5: Server-side timer expiry locks answer.
 *    - Rejects late submissions with HTTP 410 `TASK_EXPIRED`.
 *    - Zero auto-submit, zero score fabrication.
 *    - Anti-tampering: refreshing page never extends the timer.
 * 4. Credit Economy:
 *    - 20 AC per subsequent submission (2× Clarity subsequent submission price).
 *    - First-free attempt eligibility enforced server-side with atomic race-guard.
 *    - Overdraft protection (HTTP 402 `INSUFFICIENT_CREDITS`) with zero balance mutation.
 *    - Automatic 20 AC refund if AI rubric evaluation fails.
 *    - Product Decision D4: NO automatic AC rewards for Focus difficulty or scores.
 * 5. Attachments integration via Cloudflare R2 / secure storage.
 * 6. Admin Question Bank lifecycle: APPROVED, DRAFT, REVIEW, REJECTED.
 * ============================================================================
 */

import { prisma, isDatabaseConnected } from '../config/prisma';
import {
  FOCUS_45_APPROVED_QUESTIONS,
  FocusQuestionDefinition,
  getApprovedFocusQuestions,
} from '../data/focusQuestionBank';
import { creditsLedgerService } from './creditsLedger.service';
import { rubricEvaluatorService } from './rubricEvaluator.service';
import { FocusStorageService, AttachmentMetadata } from './focusStorage.service';
import { toJsonInput, userRecordToIUser } from '../utils/userMapper';
import { isValidId, toArray, toRecord } from '../utils/id';

export const FOCUS_TIER_DURATIONS: Record<'Easy' | 'Medium' | 'Hard', number> = {
  Easy: 600, // 10 minutes
  Medium: 1200, // 20 minutes
  Hard: 1800, // 30 minutes
};

export const FOCUS_SUBSEQUENT_PRICE_AC = 20;

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

export class FocusTaskService {
  /**
   * Returns metadata and approved question counts for the 3 canonical categories.
   */
  public static async getCategories(learnerId?: string): Promise<FocusCategorySummary[]> {
    const categories = [
      {
        category: 'Prompt Engineering',
        displayName: 'Prompt Engineering & Context Design',
        description:
          'Master role framing, few-shot exemplars, structured schemas, CoT reasoning, and prompt injection defense.',
        whyThisMatters:
          'Precision prompting eliminates hallucinations, enforces predictable machine-readable outputs, and secures LLM inputs.',
        practicalApplication:
          'Design production system prompts, extraction tables, and adversarial guardrails.',
        suggestedTool: 'Claude 3.5 Sonnet / ChatGPT',
        suggestedToolUrl: 'https://claude.ai',
      },
      {
        category: 'Evaluation & Auditing',
        displayName: 'Evaluation, Grounding & Auditing',
        description:
          'Audit AI outputs against ground-truth facts, RAG Triad metrics, legal precedents, and algorithmic bias standards.',
        whyThisMatters:
          'Unverified AI outputs create massive financial, legal, and clinical liability in production environments.',
        practicalApplication:
          'Conduct RAG Triad audits, fact-check financial summaries, and evaluate model drift.',
        suggestedTool: 'Perplexity AI / LangSmith',
        suggestedToolUrl: 'https://perplexity.ai',
      },
      {
        category: 'Agentic Systems',
        displayName: 'Autonomous Agents & Multi-Agent Swarms',
        description:
          'Orchestrate ReAct loops, DAG task decomposition, autonomous coding iteration, and blackboard agent swarms.',
        whyThisMatters:
          'Shifts capability from one-off conversational prompts to scalable, multi-step autonomous goal execution.',
        practicalApplication:
          'Build self-evolving tool agents, human-in-the-loop gates, and SRE incident response agents.',
        suggestedTool: 'Cursor / AutoGen / LangGraph',
        suggestedToolUrl: 'https://cursor.com',
      },
    ];

    // Compute question counts from QuestionBank / FOCUS_45_APPROVED_QUESTIONS
    const summaries: FocusCategorySummary[] = [];

    for (const cat of categories) {
      let easyCount = 0;
      let medCount = 0;
      let hardCount = 0;
      let completedCount = 0;

      if (isDatabaseConnected()) {
        try {
          const [easy, med, hard] = await Promise.all([
            prisma.questionBank.count({
              where: { topic: cat.category, level: 'Easy', status: 'APPROVED' },
            }),
            prisma.questionBank.count({
              where: { topic: cat.category, level: 'Medium', status: 'APPROVED' },
            }),
            prisma.questionBank.count({
              where: { topic: cat.category, level: 'Hard', status: 'APPROVED' },
            }),
          ]);
          easyCount = easy;
          medCount = med;
          hardCount = hard;

          if (learnerId && isValidId(learnerId)) {
            completedCount = await prisma.questionAttempt.count({
              where: { learnerId, topic: cat.category },
            });
          }
        } catch {
          // Fall back to static catalog count
          easyCount = FOCUS_45_APPROVED_QUESTIONS.filter(
            (q) => q.topic === cat.category && q.level === 'Easy' && q.status === 'APPROVED'
          ).length;
          medCount = FOCUS_45_APPROVED_QUESTIONS.filter(
            (q) => q.topic === cat.category && q.level === 'Medium' && q.status === 'APPROVED'
          ).length;
          hardCount = FOCUS_45_APPROVED_QUESTIONS.filter(
            (q) => q.topic === cat.category && q.level === 'Hard' && q.status === 'APPROVED'
          ).length;
        }
      } else {
        easyCount = FOCUS_45_APPROVED_QUESTIONS.filter(
          (q) => q.topic === cat.category && q.level === 'Easy' && q.status === 'APPROVED'
        ).length;
        medCount = FOCUS_45_APPROVED_QUESTIONS.filter(
          (q) => q.topic === cat.category && q.level === 'Medium' && q.status === 'APPROVED'
        ).length;
        hardCount = FOCUS_45_APPROVED_QUESTIONS.filter(
          (q) => q.topic === cat.category && q.level === 'Hard' && q.status === 'APPROVED'
        ).length;
      }

      summaries.push({
        ...cat,
        questionsCount: {
          Easy: easyCount,
          Medium: medCount,
          Hard: hardCount,
          total: easyCount + medCount + hardCount,
        },
        completedByLearner: completedCount,
      });
    }

    return summaries;
  }

  /**
   * Retrieves approved questions for a category & level, sanitized for learners.
   */
  public static async getQuestionsForCategory(
    category: string,
    level?: 'Easy' | 'Medium' | 'Hard'
  ): Promise<any[]> {
    let rows: any[] = [];

    if (isDatabaseConnected()) {
      try {
        const where: any = { topic: category, status: 'APPROVED' };
        if (level) where.level = level;
        rows = await prisma.questionBank.findMany({
          where,
          orderBy: [{ level: 'asc' }, { questionId: 'asc' }],
        });
      } catch {
        rows = [];
      }
    }

    if (!rows || rows.length === 0) {
      rows = getApprovedFocusQuestions(category, level);
    }

    // Sanitize for learners (strip internal evaluation guidance, review notes, etc.)
    return rows.map((q) => {
      const meta = toRecord(q.aiMetadata);
      const durationSeconds =
        meta.durationSeconds || FOCUS_TIER_DURATIONS[q.level as 'Easy' | 'Medium' | 'Hard'] || 600;

      return {
        questionId: q.questionId,
        topic: q.topic,
        level: q.level,
        track: q.track || 'General',
        title: q.title,
        promptText: q.promptText,
        hint: q.hint || '',
        testScenario: q.testScenario,
        expectedCriteria: q.expectedCriteria || [],
        scoringRubric: toArray(q.scoringRubric),
        learningObjective: meta.learningObjective || '',
        expectedAnswerFormat: meta.expectedAnswerFormat || 'Structured Markdown',
        suggestedExternalTool: meta.suggestedExternalTool || 'Claude 3.5 Sonnet',
        suggestedExternalToolUrl: meta.suggestedExternalToolUrl || 'https://claude.ai',
        durationSeconds,
      };
    });
  }

  /**
   * Starts or resumes a focus task attempt.
   * Computes server-authoritative timestamps: `targetEndTime = startedAt + durationSeconds`.
   */
  public static async startAttempt(params: {
    learnerId: string;
    category: string;
    level: 'Easy' | 'Medium' | 'Hard';
    questionId?: string;
  }): Promise<{
    assignmentId: string;
    question: any;
    durationSeconds: number;
    startedAt: string;
    targetEndTime: string;
    remainingSeconds: number;
    isExisting: boolean;
    costAC: number;
    isFirstAttemptFree: boolean;
  }> {
    const { learnerId, category, level, questionId } = params;
    const durationSeconds = FOCUS_TIER_DURATIONS[level] || 600;
    const now = new Date();

    // 1. Check for an active, unsubmitted assignment for this learner in this category & level
    const activeAssignment = await prisma.questionAssignment.findFirst({
      where: {
        learnerId,
        topic: category,
        level,
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
      },
      orderBy: { assignedAt: 'desc' },
    });

    if (activeAssignment) {
      const activeQuestion =
        (activeAssignment as any).question ||
        (await prisma.questionBank.findUnique({
          where: { questionId: activeAssignment.questionId },
        })) ||
        (await prisma.questionBank.findFirst({
          where: { questionId: activeAssignment.questionId },
        })) ||
        getApprovedFocusQuestions(category, level).find(
          (q) => q.questionId === activeAssignment.questionId
        );

      if (activeQuestion) {
        const assignedAt = new Date(activeAssignment.assignedAt);
        const targetEndTime = new Date(assignedAt.getTime() + durationSeconds * 1000);
        const remainingSeconds = Math.max(
          0,
          Math.floor((targetEndTime.getTime() - now.getTime()) / 1000)
        );

        // If active assignment is still within time, return it to resume!
        if (remainingSeconds > 0) {
          const isFirstAttemptFree =
            (await prisma.questionAttempt.count({ where: { learnerId, topic: category } })) === 0;

          return {
            assignmentId: activeAssignment.assignmentId,
            question: this.sanitizeQuestionForLearner(activeQuestion, durationSeconds),
            durationSeconds,
            startedAt: assignedAt.toISOString(),
            targetEndTime: targetEndTime.toISOString(),
            remainingSeconds,
            isExisting: true,
            costAC: isFirstAttemptFree ? 0 : FOCUS_SUBSEQUENT_PRICE_AC,
            isFirstAttemptFree,
          };
        } else {
          // Expired active assignment: mark EXPIRED
          await prisma.questionAssignment.update({
            where: { assignmentId: activeAssignment.assignmentId },
            data: { status: 'EXPIRED' },
          });
        }
      }
    }

    // 2. Select eligible approved question from QuestionBank
    let targetQuestion: any = null;

    if (questionId) {
      targetQuestion = await prisma.questionBank.findFirst({
        where: { questionId, topic: category, level, status: 'APPROVED' },
      });
    }

    if (!targetQuestion) {
      // Find past attempted questionIds by this learner to avoid repeats
      const pastAttempts = await prisma.questionAttempt.findMany({
        where: { learnerId, topic: category, level },
        select: { questionId: true },
      });
      const attemptedIds = new Set(pastAttempts.map((a) => a.questionId));

      const candidates = await prisma.questionBank.findMany({
        where: { topic: category, level, status: 'APPROVED' },
      });

      const unattempted = candidates.filter((c) => !attemptedIds.has(c.questionId));
      targetQuestion = unattempted.length > 0 ? unattempted[0] : candidates[0];
    }

    // Fallback to static catalog if DB is empty/seeding
    if (!targetQuestion) {
      const staticList = getApprovedFocusQuestions(category, level);
      targetQuestion = staticList[0];
    }

    if (!targetQuestion) {
      const notFoundErr: any = new Error(
        `No approved Focus questions available for category '${category}' and level '${level}'.`
      );
      notFoundErr.status = 404;
      throw notFoundErr;
    }

    // 3. Create new QuestionAssignment with server-authoritative timestamps
    const assignmentId = `foc-asg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const startedAt = now;
    const targetEndTime = new Date(startedAt.getTime() + durationSeconds * 1000);

    await prisma.questionAssignment.create({
      data: {
        assignmentId,
        learnerId,
        questionId: targetQuestion.questionId,
        topic: category,
        level,
        track: targetQuestion.track || 'General',
        assignedAt: startedAt,
        status: 'IN_PROGRESS',
      },
    });

    // 4. Check First-Free eligibility
    const priorAttemptsCount = await prisma.questionAttempt.count({
      where: { learnerId, topic: category },
    });
    const isFirstAttemptFree = priorAttemptsCount === 0;

    return {
      assignmentId,
      question: this.sanitizeQuestionForLearner(targetQuestion, durationSeconds),
      durationSeconds,
      startedAt: startedAt.toISOString(),
      targetEndTime: targetEndTime.toISOString(),
      remainingSeconds: durationSeconds,
      isExisting: false,
      costAC: isFirstAttemptFree ? 0 : FOCUS_SUBSEQUENT_PRICE_AC,
      isFirstAttemptFree,
    };
  }

  /**
   * Retrieves server-authoritative remaining time for an active assignment.
   */
  public static async getTimeRemaining(
    assignmentId: string,
    learnerId: string
  ): Promise<{
    assignmentId: string;
    startedAt: string;
    targetEndTime: string;
    remainingSeconds: number;
    durationSeconds: number;
    isExpired: boolean;
    isLocked: boolean;
  }> {
    const assignment = await prisma.questionAssignment.findFirst({
      where: { assignmentId, learnerId },
      include: { question: true },
    });

    if (!assignment) {
      const err: any = new Error('Assignment not found or does not belong to you.');
      err.status = 404;
      throw err;
    }

    const durationSeconds =
      FOCUS_TIER_DURATIONS[assignment.level as 'Easy' | 'Medium' | 'Hard'] || 600;
    const startedAt = new Date(assignment.assignedAt);
    const targetEndTime = new Date(startedAt.getTime() + durationSeconds * 1000);
    const now = Date.now();
    const remainingSeconds = Math.max(0, Math.floor((targetEndTime.getTime() - now) / 1000));
    const isExpired = now > targetEndTime.getTime();
    const isLocked = assignment.status === 'SUBMITTED' || assignment.status === 'EXPIRED';

    return {
      assignmentId,
      startedAt: startedAt.toISOString(),
      targetEndTime: targetEndTime.toISOString(),
      remainingSeconds,
      durationSeconds,
      isExpired,
      isLocked,
    };
  }

  /**
   * Submits a focus task solution.
   * Enforces Product Decisions D4 and D5:
   * - D5: Late submissions rejected with HTTP 410 TASK_EXPIRED (zero auto-submit, zero score fabrication).
   * - 20 AC charge on subsequent attempts with overdraft protection (HTTP 402) and auto-refund on AI error.
   * - D4: NO automatic AC rewards for completion or scores.
   */
  public static async submitAttempt(params: {
    learnerId: string;
    assignmentId: string;
    answer: string;
    timeTakenSeconds?: number;
    attachments?: AttachmentMetadata[];
    idempotencyKey?: string;
  }): Promise<{
    success: boolean;
    attemptId: string;
    score: number;
    rubricFeedback: any[];
    overallFeedback: string;
    submittedAt: string;
    timeTakenSeconds: number;
    creditsDeducted: number;
    isFirstAttemptFree: boolean;
    currentBalance: number;
    xpAwarded: number;
  }> {
    const { learnerId, assignmentId, answer, timeTakenSeconds, attachments, idempotencyKey } =
      params;

    // 1. Fetch assignment and question
    const assignment = await prisma.questionAssignment.findFirst({
      where: { assignmentId, learnerId },
    });

    if (!assignment) {
      const err: any = new Error('Assignment not found or invalid.');
      err.status = 404;
      throw err;
    }

    const question =
      (assignment as any).question ||
      (await prisma.questionBank.findUnique({
        where: { questionId: assignment.questionId },
      })) ||
      (await prisma.questionBank.findFirst({
        where: { questionId: assignment.questionId },
      })) ||
      FOCUS_45_APPROVED_QUESTIONS.find((q) => q.questionId === assignment.questionId);

    if (!question) {
      const err: any = new Error('Associated question not found or invalid.');
      err.status = 404;
      throw err;
    }

    // 2. Lock check: If already submitted, reject with HTTP 409
    if (assignment.status === 'SUBMITTED') {
      const lockErr: any = new Error('This focus task has already been submitted and is locked.');
      lockErr.code = 'TASK_LOCKED';
      lockErr.status = 409;
      lockErr.isLocked = true;
      throw lockErr;
    }

    // 3. Server-authoritative timer expiry check (Product Decision D5)
    const durationSeconds =
      FOCUS_TIER_DURATIONS[assignment.level as 'Easy' | 'Medium' | 'Hard'] || 600;
    const startedAt = new Date(assignment.assignedAt);
    const targetEndTime = new Date(startedAt.getTime() + durationSeconds * 1000);
    const now = new Date();

    if (now.getTime() > targetEndTime.getTime()) {
      // Mark assignment as EXPIRED and lock it
      await prisma.questionAssignment.update({
        where: { assignmentId },
        data: { status: 'EXPIRED' },
      });

      const expireErr: any = new Error(
        'Time limit for this focus challenge has expired. Answers are locked and can no longer be submitted.'
      );
      expireErr.code = 'TASK_EXPIRED';
      expireErr.status = 410;
      expireErr.isExpired = true;
      throw expireErr;
    }

    // 4. Calculate Credit Pricing:
    // First attempt in this Focus category is FREE (0 AC).
    // Subsequent attempts cost 20 AC (2× Clarity subsequent price).
    const priorAttemptsCount = await prisma.questionAttempt.count({
      where: { learnerId, topic: assignment.topic },
    });
    let isFirstAttemptFree = priorAttemptsCount === 0;
    let submissionCost = isFirstAttemptFree ? 0 : FOCUS_SUBSEQUENT_PRICE_AC;
    const finalIdempotencyKey = idempotencyKey || `focus-sub-${assignmentId}`;
    let creditTransactionId: string | null = null;

    if (isFirstAttemptFree) {
      // Atomically claim the first-free grant to prevent concurrent request race exploitation
      const claimResult = await creditsLedgerService.executeTransaction({
        userId: learnerId,
        type: 'EARN',
        category: 'REWARD',
        amount: 0,
        reason: `Focus Challenge First-Free Attempt: ${assignment.topic}`,
        source: 'FOCUS',
        sourceId: `first-free-${assignment.topic}`,
        idempotencyKey: `focus-first-free-${learnerId}-${assignment.topic}`,
        relatedTaskId: assignmentId,
      });

      if (claimResult.conflict) {
        // Already claimed by concurrent request
        isFirstAttemptFree = false;
        submissionCost = FOCUS_SUBSEQUENT_PRICE_AC;
      }
    }

    // 5. Pre-charge credits atomically if not free
    if (submissionCost > 0) {
      const spendResult = await creditsLedgerService.executeTransaction({
        userId: learnerId,
        type: 'SPEND',
        category: 'TASK_USAGE',
        amount: submissionCost,
        reason: `Focus Challenge Submission: ${question.title} (-${submissionCost} AC)`,
        source: 'FOCUS',
        sourceId: assignmentId,
        idempotencyKey: finalIdempotencyKey,
        relatedTaskId: assignmentId,
      });

      if (spendResult.conflict) {
        const conflictErr: any = new Error('Idempotency key reuse conflict');
        conflictErr.status = 409;
        throw conflictErr;
      }

      if (!spendResult.success) {
        const overdraftErr: any = new Error(
          `Insufficient AIIMS Credits balance. Submitting this challenge requires ${submissionCost} AC. Current balance: ${spendResult.balance ?? 0} AC.`
        );
        overdraftErr.code = 'INSUFFICIENT_CREDITS';
        overdraftErr.status = 402;
        overdraftErr.requiredCredits = submissionCost;
        overdraftErr.currentBalance = spendResult.balance ?? 0;
        throw overdraftErr;
      }

      creditTransactionId = spendResult.transaction?.id || finalIdempotencyKey;
    }

    // 6. Genuine AI Rubric Evaluation with automatic 20 AC refund safety
    const cleanAnswer = answer.trim();
    let evaluation: any;

    try {
      evaluation = await rubricEvaluatorService.evaluateAnswer({
        question: {
          title: question.title,
          promptText: question.promptText,
          testScenario: question.testScenario,
          expectedCriteria: question.expectedCriteria,
        },
        rubric: toArray(question.scoringRubric),
        learnerAnswer: cleanAnswer,
      });
    } catch (evalErr: any) {
      console.error(
        `[FocusTaskService] Rubric evaluation failed for assignment ${assignmentId}:`,
        evalErr.message
      );

      // Execute automatic refund if credits were pre-deducted
      if (submissionCost > 0) {
        try {
          await creditsLedgerService.executeTransaction({
            userId: learnerId,
            type: 'REFUND',
            category: 'REFUND',
            amount: submissionCost,
            reason: `Automatic Refund: Focus Evaluation Failure (${question.title})`,
            source: 'FOCUS',
            sourceId: assignmentId,
            idempotencyKey: `refund::${finalIdempotencyKey}`,
            relatedTaskId: assignmentId,
            metadata: { originalError: evalErr.message },
          });
        } catch (refundErr: any) {
          console.error('[FocusTaskService] Refund execution error:', refundErr.message);
        }
      }

      const evalError: any = new Error(
        `AI rubric evaluation failed. Your ${
          submissionCost > 0
            ? submissionCost + ' AC have been safely refunded.'
            : 'submission was not counted.'
        }`
      );
      evalError.code = evalErr.code || 'RUBRIC_EVALUATION_FAILED';
      evalError.status = 502;
      evalError.refunded = submissionCost > 0;
      throw evalError;
    }

    const rubricFeedback = evaluation.criteria.map((c: any) => ({
      criterion: c.criterion,
      score: c.score,
      maxScore: c.maxScore,
      comment: c.feedback,
    }));

    const score = evaluation.overallScore;
    const overallFeedback = evaluation.overallFeedback;
    const attemptId = `att-foc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const submittedAt = now;
    const calculatedElapsed = Math.min(
      durationSeconds,
      Math.max(1, Math.floor((submittedAt.getTime() - startedAt.getTime()) / 1000))
    );
    const finalTimeTaken =
      timeTakenSeconds && timeTakenSeconds > 0 ? timeTakenSeconds : calculatedElapsed;

    // 7. Persist QuestionAttempt and lock assignment atomically in transaction
    const rewardXP = 50; // XP separated from AC

    await prisma.$transaction(async (tx) => {
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
        const lockErr: any = new Error('This task has already been submitted and is locked.');
        lockErr.code = 'TASK_LOCKED';
        lockErr.status = 409;
        throw lockErr;
      }

      await tx.questionAttempt.create({
        data: {
          attemptId,
          assignmentId,
          learnerId,
          questionId: assignment.questionId,
          topic: assignment.topic,
          level: assignment.level,
          track: assignment.track || 'General',
          startedAt,
          submittedAt,
          submittedAnswer: cleanAnswer,
          score,
          rubricFeedback: toJsonInput(rubricFeedback),
          overallFeedback,
          evaluationStatus: 'EVALUATED',
          timeTakenSeconds: finalTimeTaken,
          creditTransactionId,
        },
      });

      // Product Decision D4: NO automatic AC rewards. Award XP cleanly inside transaction:
      if (isValidId(learnerId)) {
        await tx.user.update({
          where: { id: learnerId },
          data: { xpPoints: { increment: rewardXP } },
        });
      }
    });

    const currentBalance = await creditsLedgerService.getBalance(learnerId);

    return {
      success: true,
      attemptId,
      score,
      rubricFeedback,
      overallFeedback,
      submittedAt: submittedAt.toISOString(),
      timeTakenSeconds: finalTimeTaken,
      creditsDeducted: submissionCost,
      isFirstAttemptFree,
      currentBalance,
      xpAwarded: rewardXP,
    };
  }

  /**
   * Retrieves attempt history for a learner.
   */
  public static async getHistory(learnerId: string): Promise<any[]> {
    if (!isDatabaseConnected()) return [];

    const attempts = await prisma.questionAttempt.findMany({
      where: { learnerId },
      include: {
        question: {
          select: {
            title: true,
            topic: true,
            level: true,
            aiMetadata: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
      take: 50,
    });

    return attempts.map((a) => {
      const meta = toRecord(a.question?.aiMetadata);
      return {
        attemptId: a.attemptId,
        assignmentId: a.assignmentId,
        questionId: a.questionId,
        title: a.question?.title || 'Focus Challenge',
        category: a.topic,
        level: a.level,
        score: a.score,
        timeTakenSeconds: a.timeTakenSeconds,
        submittedAt: a.submittedAt.toISOString(),
        rubricFeedback: toArray(a.rubricFeedback),
        overallFeedback: a.overallFeedback || '',
        suggestedTool: meta.suggestedExternalTool || '',
      };
    });
  }

  /**
   * Computes learner focus progress and completion statistics.
   */
  public static async getProgress(learnerId: string): Promise<any> {
    if (!isDatabaseConnected()) {
      return {
        totalCompleted: 0,
        averageScore: 0,
        byCategory: {},
      };
    }

    const attempts = await prisma.questionAttempt.findMany({
      where: { learnerId },
      select: {
        topic: true,
        level: true,
        score: true,
        timeTakenSeconds: true,
      },
    });

    const totalCompleted = attempts.length;
    const averageScore =
      totalCompleted > 0
        ? Math.round(attempts.reduce((acc, a) => acc + a.score, 0) / totalCompleted)
        : 0;

    const byCategory: Record<string, { completed: number; avgScore: number }> = {};
    for (const a of attempts) {
      if (!byCategory[a.topic]) {
        byCategory[a.topic] = { completed: 0, avgScore: 0 };
      }
      byCategory[a.topic].completed++;
    }

    for (const cat of Object.keys(byCategory)) {
      const catAttempts = attempts.filter((a) => a.topic === cat);
      byCategory[cat].avgScore = Math.round(
        catAttempts.reduce((acc, a) => acc + a.score, 0) / catAttempts.length
      );
    }

    return {
      totalCompleted,
      averageScore,
      byCategory,
    };
  }

  /**
   * Admin: List questions with filtering by category, level, and review status.
   */
  public static async adminListQuestions(params: {
    category?: string;
    level?: string;
    status?: string;
  }): Promise<any[]> {
    const where: any = {};
    if (params.category) where.topic = params.category;
    if (params.level) where.level = params.level;
    if (params.status) where.status = params.status;

    if (!isDatabaseConnected()) {
      return FOCUS_45_APPROVED_QUESTIONS.filter((q) => {
        if (params.category && q.topic !== params.category) return false;
        if (params.level && q.level !== params.level) return false;
        if (params.status && q.status !== params.status) return false;
        return true;
      });
    }

    return prisma.questionBank.findMany({
      where,
      orderBy: [{ topic: 'asc' }, { level: 'asc' }, { questionId: 'asc' }],
    });
  }

  /**
   * Admin: Create a new draft question in QuestionBank.
   */
  public static async adminCreateQuestion(data: any, adminEmail: string): Promise<any> {
    const questionId = `focus-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    return prisma.questionBank.create({
      data: {
        questionId,
        topic: data.topic,
        level: data.level,
        track: 'General',
        title: data.title,
        promptText: data.promptText,
        hint: data.hint || null,
        testScenario: data.testScenario,
        expectedCriteria: data.expectedCriteria,
        scoringRubric: toJsonInput(data.scoringRubric),
        aiMetadata: toJsonInput(data.aiMetadata || {}),
        source: 'Human',
        status: data.status || 'DRAFT',
        version: 1,
        createdBy: adminEmail,
        reviewNotes: data.reviewNotes || null,
      },
    });
  }

  /**
   * Admin: Update question review status (APPROVED, DRAFT, REVIEW, REJECTED).
   */
  public static async adminUpdateStatus(
    questionId: string,
    status: 'APPROVED' | 'DRAFT' | 'REVIEW' | 'REJECTED',
    reviewNotes: string | undefined,
    adminEmail: string
  ): Promise<any> {
    return prisma.questionBank.update({
      where: { questionId },
      data: {
        status,
        reviewedBy: adminEmail,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      },
    });
  }

  private static sanitizeQuestionForLearner(question: any, durationSeconds: number): any {
    const meta = toRecord(question.aiMetadata);
    return {
      questionId: question.questionId,
      topic: question.topic,
      level: question.level,
      track: question.track || 'General',
      title: question.title,
      promptText: question.promptText,
      hint: question.hint || '',
      testScenario: question.testScenario,
      expectedCriteria: question.expectedCriteria || [],
      scoringRubric: toArray(question.scoringRubric),
      learningObjective: meta.learningObjective || '',
      expectedAnswerFormat: meta.expectedAnswerFormat || 'Structured Markdown',
      suggestedExternalTool: meta.suggestedExternalTool || 'Claude 3.5 Sonnet',
      suggestedExternalToolUrl: meta.suggestedExternalToolUrl || 'https://claude.ai',
      durationSeconds,
    };
  }
}
