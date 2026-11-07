import mongoose from 'mongoose';
import {
  QuestionBank,
  IQuestionBank,
  QuestionLevel,
  QuestionTrack,
  QuestionStatus,
  inMemoryQuestionBank,
} from '../models/QuestionBank.model';
import {
  QuestionAssignment,
  IQuestionAssignment,
  inMemoryAssignments,
} from '../models/QuestionAssignment.model';
import {
  QuestionAttempt,
  IQuestionAttempt,
  inMemoryAttempts,
} from '../models/QuestionAttempt.model';
import {
  InstitutionExclusionConfig,
  ExclusionScope,
  inMemoryExclusionConfig,
  setInMemoryExclusionConfig,
} from '../models/InstitutionExclusionConfig.model';
import { aiQuestionGeneratorService } from './aiQuestionGenerator.service';
import { initSeedQuestions } from './seedQuestions';
import { User } from '../models/User.model';
import { StudentProfile } from '../models/StudentProfile.model';
import { rubricEvaluatorService } from './rubricEvaluator.service';

export const TARGET_MINIMUM_PER_LEVEL = 30;

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
  constructor() {
    // Auto-seed baseline questions asynchronously
    initSeedQuestions().catch(() => {});
  }

  private isDbConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Resolves learner's institutional identity from database or User object.
   * If learner has no verified college info, returns null (never misclassifies into another institution).
   */
  public async resolveLearnerInstitution(
    learnerId: string,
    providedCollege?: string
  ): Promise<{ college: string | null; cohortId: string | null; batch: string | null }> {
    if (this.isDbConnected()) {
      try {
        const profile = await StudentProfile.findOne({
          userId: new mongoose.Types.ObjectId(learnerId),
        });
        if (profile) {
          const college =
            profile.instituteName || (profile.instituteId ? String(profile.instituteId) : null);
          const cohort = profile.cohortId ? String(profile.cohortId) : null;
          const batch = profile.admissionYear ? String(profile.admissionYear) : null;
          return {
            college: college ? college.trim().toUpperCase() : null,
            cohortId: cohort,
            batch,
          };
        }

        const user = await User.findById(learnerId);
        if (user && user.college && user.college.trim().length > 0) {
          return {
            college: user.college.trim().toUpperCase(),
            cohortId: null,
            batch: null,
          };
        }
      } catch (e) {
        // Fallback to provided info
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
   * Gets the active exclusion configuration.
   */
  public async getExclusionConfig(): Promise<{ scope: ExclusionScope; exclusionDays: number }> {
    if (this.isDbConnected()) {
      try {
        const configDoc = await InstitutionExclusionConfig.findOne().sort({ updatedAt: -1 });
        if (configDoc) {
          return {
            scope: configDoc.scope,
            exclusionDays: configDoc.exclusionDays,
          };
        }
      } catch (e) {}
    }
    return {
      scope: inMemoryExclusionConfig.scope,
      exclusionDays: inMemoryExclusionConfig.exclusionDays,
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
    if (this.isDbConnected()) {
      const updated = await InstitutionExclusionConfig.findOneAndUpdate(
        {},
        { scope, exclusionDays, updatedBy: adminId, updatedAt: new Date() },
        { upsert: true, new: true }
      );
      return {
        scope: updated.scope,
        exclusionDays: updated.exclusionDays,
        updatedAt: updated.updatedAt,
      };
    }

    setInMemoryExclusionConfig({ scope, exclusionDays, updatedBy: adminId });
    return {
      scope: inMemoryExclusionConfig.scope,
      exclusionDays: inMemoryExclusionConfig.exclusionDays,
      updatedAt: inMemoryExclusionConfig.updatedAt,
    };
  }

  /**
   * Returns current active assignment for a learner, if one is in progress.
   * Reloading the application does NOT create duplicate assignments.
   */
  public async getCurrentAssignment(learnerId: string): Promise<any | null> {
    if (this.isDbConnected()) {
      const active = await QuestionAssignment.findOne({
        learnerId,
        status: { $in: ['ASSIGNED', 'IN_PROGRESS'] },
      }).sort({ assignedAt: -1 });

      if (active) {
        const question = await QuestionBank.findOne({ questionId: active.questionId });
        return { assignment: active, question };
      }
      return null;
    }

    // In-Memory lookup
    for (const assignment of inMemoryAssignments.values()) {
      if (
        assignment.learnerId === learnerId &&
        (assignment.status === 'ASSIGNED' || assignment.status === 'IN_PROGRESS')
      ) {
        const question = inMemoryQuestionBank.get(assignment.questionId);
        return { assignment, question };
      }
    }
    return null;
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
      college: institution.college || undefined,
      institutionId: undefined,
      cohortId: institution.cohortId || undefined,
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
  }> {
    const { learnerId, assignmentId, answer, timeTakenSeconds, creditTransactionId } = params;

    // 1. Fetch assignment
    let assignment: any = null;
    if (this.isDbConnected()) {
      assignment = await QuestionAssignment.findOne({ assignmentId, learnerId });
    } else {
      assignment = inMemoryAssignments.get(assignmentId);
      if (assignment && assignment.learnerId !== learnerId) {
        assignment = null;
      }
    }

    if (!assignment) {
      throw new Error('Assignment not found or does not belong to learner.');
    }

    // 2. Fetch Question
    let question: any = null;
    if (this.isDbConnected()) {
      question = await QuestionBank.findOne({ questionId: assignment.questionId });
    } else {
      question = inMemoryQuestionBank.get(assignment.questionId);
    }

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
      rubric: question.scoringRubric,
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

    // 4. Save Attempt Record (Immutable)
    const attemptRecord = {
      attemptId,
      assignmentId,
      learnerId,
      questionId: question.questionId,
      topic: question.topic,
      level: question.level,
      track: question.track,
      startedAt: assignment.assignedAt || new Date(),
      submittedAt: new Date(),
      submittedAnswer: cleanAnswer,
      score: normalizedScore,
      rubricFeedback: rubricScores,
      overallFeedback,
      evaluationStatus: 'EVALUATED' as const,
      timeTakenSeconds: timeTakenSeconds || 0,
      creditTransactionId,
    };

    let savedAttempt: any = null;
    if (this.isDbConnected()) {
      savedAttempt = await QuestionAttempt.create(attemptRecord);
      assignment.status = 'SUBMITTED';
      assignment.completedAt = new Date();
      await assignment.save();
    } else {
      savedAttempt = attemptRecord;
      inMemoryAttempts.set(attemptId, attemptRecord);
      assignment.status = 'SUBMITTED';
      assignment.completedAt = new Date();
      inMemoryAssignments.set(assignmentId, assignment);
    }

    return {
      attempt: savedAttempt,
      assignment,
    };
  }

  /**
   * Retrieves attempt history for a learner. Cross-user access is rejected.
   */
  public async getAttemptHistory(
    learnerId: string,
    filters?: { topic?: string; level?: string }
  ): Promise<any[]> {
    if (this.isDbConnected()) {
      const query: any = { learnerId };
      if (filters?.topic) query.topic = filters.topic;
      if (filters?.level) query.level = filters.level;
      return QuestionAttempt.find(query).sort({ submittedAt: -1 }).lean();
    }

    const results: any[] = [];
    for (const attempt of inMemoryAttempts.values()) {
      if (attempt.learnerId === learnerId) {
        if (filters?.topic && attempt.topic !== filters.topic) continue;
        if (filters?.level && attempt.level !== filters.level) continue;
        results.push(attempt);
      }
    }
    return results.sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }

  /**
   * Administrative Question Bank Coverage Report.
   * Reports Question counts and gap to target minimum (30).
   */
  public async getCoverageReport(): Promise<QuestionBankCoverageRow[]> {
    if (inMemoryQuestionBank.size === 0) {
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
          let questions: any[] = [];
          let servedCount = 0;

          if (this.isDbConnected()) {
            questions = await QuestionBank.find({ topic, track, level }).lean();
            servedCount = await QuestionAssignment.countDocuments({ topic, track, level });
          } else {
            questions = Array.from(inMemoryQuestionBank.values()).filter(
              (q) => q.topic === topic && q.track === track && q.level === level
            );
            servedCount = Array.from(inMemoryAssignments.values()).filter(
              (a) => a.topic === topic && a.track === track && a.level === level
            ).length;
          }

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
    if (this.isDbConnected()) {
      const assignments = await QuestionAssignment.find({ learnerId }).select('questionId').lean();
      return assignments.map((a) => a.questionId);
    }
    const ids: string[] = [];
    for (const a of inMemoryAssignments.values()) {
      if (a.learnerId === learnerId) {
        ids.push(a.questionId);
      }
    }
    return ids;
  }

  public async getInstitutionExcludedQuestionIds(
    college: string,
    currentLearnerId: string,
    cutoffDate: Date
  ): Promise<string[]> {
    const cleanCollege = college.trim().toUpperCase();

    if (this.isDbConnected()) {
      const assignments = await QuestionAssignment.find({
        college: cleanCollege,
        learnerId: { $ne: currentLearnerId },
        assignedAt: { $gte: cutoffDate },
      })
        .select('questionId')
        .lean();
      return assignments.map((a) => a.questionId);
    }

    const ids: string[] = [];
    for (const a of inMemoryAssignments.values()) {
      if (
        a.college &&
        a.college.toUpperCase() === cleanCollege &&
        a.learnerId !== currentLearnerId &&
        new Date(a.assignedAt).getTime() >= cutoffDate.getTime()
      ) {
        ids.push(a.questionId);
      }
    }
    return ids;
  }

  public async findEligibleBankQuestion(
    topic: string,
    level: QuestionLevel,
    track: QuestionTrack,
    excludedIds: string[]
  ): Promise<any | null> {
    if (inMemoryQuestionBank.size === 0) {
      await initSeedQuestions();
    }

    const activeStatuses: QuestionStatus[] = ['ACTIVE', 'APPROVED'];

    if (this.isDbConnected()) {
      const candidates = await QuestionBank.find({
        topic,
        level,
        track,
        status: { $in: activeStatuses },
        questionId: { $nin: excludedIds },
      }).lean();

      if (candidates.length === 0) return null;
      // Select randomly to avoid deterministic ordering for concurrent learners
      const randomIndex = Math.floor(Math.random() * candidates.length);
      return candidates[randomIndex];
    }

    const inMemCandidates = Array.from(inMemoryQuestionBank.values()).filter(
      (q) =>
        q.topic === topic &&
        q.level === level &&
        q.track === track &&
        activeStatuses.includes(q.status) &&
        !excludedIds.includes(q.questionId)
    );

    if (inMemCandidates.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * inMemCandidates.length);
    return inMemCandidates[randomIndex];
  }

  public async getAllQuestionsForTopic(topic: string): Promise<any[]> {
    if (this.isDbConnected()) {
      return QuestionBank.find({ topic }).lean();
    }
    if (inMemoryQuestionBank.size === 0) {
      await initSeedQuestions();
    }
    return Array.from(inMemoryQuestionBank.values()).filter((q) => q.topic === topic);
  }

  public async saveQuestion(questionData: any): Promise<any> {
    if (this.isDbConnected()) {
      return QuestionBank.create(questionData);
    }
    inMemoryQuestionBank.set(questionData.questionId, questionData);
    return questionData;
  }

  public async createAssignment(assignmentData: any): Promise<any> {
    if (this.isDbConnected()) {
      try {
        return await QuestionAssignment.create(assignmentData);
      } catch (err: any) {
        if (err.code === 11000) {
          // Unique index collision: return existing
          return QuestionAssignment.findOne({
            learnerId: assignmentData.learnerId,
            questionId: assignmentData.questionId,
          });
        }
        throw err;
      }
    }

    // In-memory unique check on (learnerId, questionId)
    for (const existing of inMemoryAssignments.values()) {
      if (
        existing.learnerId === assignmentData.learnerId &&
        existing.questionId === assignmentData.questionId
      ) {
        return existing;
      }
    }

    inMemoryAssignments.set(assignmentData.assignmentId, assignmentData);
    return assignmentData;
  }
}

export const questionBankService = new QuestionBankService();
