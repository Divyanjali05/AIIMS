/**
 * journeyAndHistory.test.ts
 * =========================================================
 * AIIMS Vitest Unit Test Suite: My AI Journey & Assessment History
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { JourneyService } from '../journey.service';
import { prisma } from '../../config/prisma';
import { toJsonInput } from '../../utils/userMapper';
import { assessmentHistoryQuerySchema } from '../../schemas/journey.schema';
import { resetPrismaTestDouble, uninstallPrismaTestDouble } from './helpers/prismaTestDouble';

describe('AIIMS My AI Journey & Assessment History Module', () => {
  const testUserId = 'test_journey_user_vitest';

  beforeEach(async () => {
    resetPrismaTestDouble(true);

    await prisma.user.create({
      data: {
        id: testUserId,
        email: 'vitest_journey@aiims.edu',
        name: 'Vitest Learner',
        password: 'hash',
        role: 'learner',
        stage: 'Understanding',
        aiimsCredits: 200,
        aiWalletData: toJsonInput({
          userTools: [{ toolId: 'tool-cursor', addedAt: new Date().toISOString() }],
          dismissedRecommendations: [],
        }),
        assessmentData: toJsonInput({
          status: 'completed',
          completedAt: new Date('2026-10-25T12:00:00Z').toISOString(),
          scores: {
            'Understanding AI': 4,
            'Using AI': 5,
            'Solving with AI': 4,
            'Scaling with AI': 3,
            'Adapting to AI': 4,
          },
          evaluationResult: {
            totalScore: 20,
            percentageScore: 80,
            strongestSkill: { name: 'Using AI' },
            roomToGrow: { name: 'Scaling with AI' },
          },
        }),
        analysisData: toJsonInput({
          status: 'viewed',
          unlockedAt: new Date('2026-10-25T12:30:00Z').toISOString(),
          topCapability: 'Using AI',
          growthArea: 'Scaling with AI',
        }),
        clarityData: toJsonInput({
          status: 'completed',
          completedTopics: ['Workflow Design'],
        }),
        focusData: toJsonInput({
          status: 'active',
          selectedTrack: 'AI Agents',
        }),
        radarData: toJsonInput({
          status: 'available',
          investigatedSignalIds: [],
        }),
      },
    });
  });

  afterAll(() => {
    uninstallPrismaTestDouble();
  });

  describe('1. Learner Journey Overview & Milestones', () => {
    it('returns authoritative 10-stage milestones with accurate status', async () => {
      const overview = await JourneyService.getJourneyOverview(testUserId);
      expect(overview.milestones).toHaveLength(10);
      expect(overview.completedMilestonesCount).toBeGreaterThanOrEqual(4);
      expect(overview.overallProgressPercent).toBeGreaterThanOrEqual(40);

      const m1 = overview.milestones.find((m) => m.id === 'understand');
      expect(m1?.status).toBe('completed');
      expect(m1?.score).toBe(80);
    });

    it('identifies fresh unassessed learner with 0% progress and Understand AI stage', async () => {
      const freshId = 'fresh_vitest_user';
      await prisma.user.create({
        data: {
          id: freshId,
          email: 'fresh_vitest@aiims.edu',
          name: 'Fresh Vitest',
          password: 'hash',
          role: 'learner',
          stage: 'Knowing',
          aiimsCredits: 100,
          assessmentData: toJsonInput({ status: 'not_started' }),
          analysisData: toJsonInput({ status: 'locked' }),
          clarityData: toJsonInput({ status: 'locked' }),
          focusData: toJsonInput({ status: 'locked' }),
          radarData: toJsonInput({ status: 'locked' }),
        },
      });

      const overview = await JourneyService.getJourneyOverview(freshId);
      expect(overview.completedMilestonesCount).toBe(0);
      expect(overview.overallProgressPercent).toBe(0);
      expect(overview.currentStage).toBe('Understand AI');
      expect(overview.nextBestAction.targetTab).toBe('assessment');
    });
  });

  describe('2. Assessment History & Individual Attempts', () => {
    it('preserves multiple attempts as separate immutable records with correct scores', async () => {
      await prisma.questionAttempt.create({
        data: {
          attemptId: 'vitest_att_1',
          assignmentId: 'assign_1',
          learnerId: testUserId,
          questionId: 'q_1',
          topic: 'AI Workflows',
          level: 'Easy',
          startedAt: new Date('2026-10-26T10:00:00Z'),
          submittedAt: new Date('2026-10-26T10:15:00Z'),
          submittedAnswer: 'Answer 1',
          score: 95,
          overallFeedback: 'Thorough answer',
          evaluationStatus: 'EVALUATED',
          timeTakenSeconds: 900,
          rubricFeedback: toJsonInput([{ criterion: 'System Boundaries', score: 5, maxScore: 5 }]),
        },
      });

      await prisma.questionAttempt.create({
        data: {
          attemptId: 'vitest_att_2',
          assignmentId: 'assign_2',
          learnerId: testUserId,
          questionId: 'q_2',
          topic: 'AI Workflows',
          level: 'Medium',
          startedAt: new Date('2026-10-27T10:00:00Z'),
          submittedAt: new Date('2026-10-27T10:20:00Z'),
          submittedAnswer: 'Answer 2',
          score: 85,
          overallFeedback: 'Good answer',
          evaluationStatus: 'EVALUATED',
          timeTakenSeconds: 1200,
          rubricFeedback: toJsonInput([{ criterion: 'System Boundaries', score: 4, maxScore: 5 }]),
        },
      });

      const history = await JourneyService.getAssessmentHistory(testUserId, { page: 1, limit: 10 });
      const clarityAttempts = history.records.filter(
        (r) => r.type === 'clarity' && r.status === 'completed'
      );

      expect(clarityAttempts).toHaveLength(2);
      expect(clarityAttempts[0].score).toBe(85); // Most recent first
      expect(clarityAttempts[1].score).toBe(95);
    });

    it('correctly filters by type and pagination bounds', async () => {
      const diagOnly = await JourneyService.getAssessmentHistory(testUserId, {
        type: 'diagnostic',
        page: 1,
        limit: 5,
      });
      expect(diagOnly.records.every((r) => r.type === 'diagnostic')).toBe(true);
      expect(diagOnly.records).toHaveLength(1);
    });
  });

  describe('3. Clarity and Focus Activity Tracking', () => {
    it('integrates Focus stats while strictly excluding break duration and abandoned sessions', async () => {
      const today = new Date();
      today.setHours(9, 0, 0, 0);

      await prisma.focusSession.create({
        data: {
          sessionId: 'sess_complete',
          learnerId: testUserId,
          trackTitle: 'AI Agents',
          sessionState: 'completed',
          status: 'completed',
          accumulatedFocusSeconds: 1800, // 30 mins
          totalBreakSeconds: 300, // 5 mins break
          completedCycles: 1,
          startedAt: today,
          completedAt: new Date(today.getTime() + 2100 * 1000),
        },
      });

      await prisma.focusSession.create({
        data: {
          sessionId: 'sess_abandoned',
          learnerId: testUserId,
          trackTitle: 'AI Agents',
          sessionState: 'abandoned',
          status: 'abandoned',
          accumulatedFocusSeconds: 120, // 2 mins
          totalBreakSeconds: 0,
          completedCycles: 0,
          startedAt: new Date(today.getTime() + 2200 * 1000),
          completedAt: new Date(today.getTime() + 2320 * 1000),
        },
      });

      const focusSummary = await JourneyService.getFocusActivity(testUserId);
      expect(focusSummary.todayFocusMinutes).toBe(30);
      expect(focusSummary.todayBreakMinutes).toBe(5);
      expect(focusSummary.todayCompletedSessions).toBe(1); // Abandoned excluded
    });
  });

  describe('4. Skill Analytics & Recommendations', () => {
    it('gating check triggers when learner has insufficient data', async () => {
      const unassessedId = 'unassessed_analytics_usr';
      await prisma.user.create({
        data: {
          id: unassessedId,
          email: 'unassessed@aiims.edu',
          name: 'Unassessed User',
          password: 'hash',
          assessmentData: toJsonInput({ status: 'not_started' }),
        },
      });

      const analytics = await JourneyService.getPerformanceAnalytics(unassessedId);
      expect(analytics.hasSufficientData).toBe(false);
      expect(analytics.dataNotice).toBeDefined();
    });

    it('generates strengths, growth areas, and distinct score timeline for evaluated learner', async () => {
      const analytics = await JourneyService.getPerformanceAnalytics(testUserId);
      expect(analytics.hasSufficientData).toBe(true);
      expect(analytics.strongestSkills.length).toBeGreaterThan(0);
      expect(analytics.basisExplanation).toContain('Diagnostic assessment scores');
    });

    it('recommends eligible, unlocked next learning action', async () => {
      const overview = await JourneyService.getJourneyOverview(testUserId);
      expect(overview.nextBestAction.isLocked).toBe(false);
      expect(overview.nextBestAction.actionButtonLabel).toBeDefined();
    });
  });

  describe('5. Zod Schema Validation', () => {
    it('validates safe query parameters and defaults invalid ones', () => {
      const parsed = assessmentHistoryQuerySchema.parse({ page: -2, limit: 100 });
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(50);
      expect(parsed.type).toBe('all');
      expect(parsed.status).toBe('all');
    });
  });
});
