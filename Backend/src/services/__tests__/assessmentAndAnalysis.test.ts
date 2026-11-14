import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../../config/prisma';
import { resetPrismaTestDouble, uninstallPrismaTestDouble } from './helpers/prismaTestDouble';
import {
  getQuestions,
  getComparativeAnalysis,
  getIndividualAnalysis,
} from '../../controllers/assessment.controller';
import { ASSESSMENT_QUESTIONS, STORY_STATIONS } from '../../data/assessmentQuestions';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

function createMockResponse() {
  const res: any = {};
  res.statusCode = 200;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = data;
    return res;
  };
  return res;
}

describe('AIIMS Assessment & Cohort Analysis Tests', () => {
  beforeEach(() => {
    resetPrismaTestDouble(true);
  });

  afterAll(() => {
    uninstallPrismaTestDouble();
  });

  describe('Diagnostic Questions Endpoint', () => {
    it('returns all 25 canonical diagnostic questions across 5 calibrated stations', () => {
      const req: any = { query: {} };
      const res = createMockResponse();

      getQuestions(req, res);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(25);
      expect(res.body[0].id).toBe(1);
      expect(res.body[24].id).toBe(25);
    });

    it('returns both stations and questions when query stations=true is supplied', () => {
      const req: any = { query: { stations: 'true' } };
      const res = createMockResponse();

      getQuestions(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.totalQuestions).toBe(25);
      expect(res.body.stations.length).toBe(5);
      expect(res.body.stations[0].stationName).toBe('Workbench');
      expect(res.body.questions.length).toBe(25);
    });
  });

  describe('Cohort Comparative Analysis & Privacy Protection (k-anonymity >= 5)', () => {
    it('enforces privacy protection when completed cohort count is less than 5', async () => {
      // Seed only 2 completed assessments
      for (let i = 1; i <= 2; i++) {
        await prisma.user.create({
          data: {
            id: `cohort-user-${i}`,
            email: `cohort${i}@aiims.edu`,
            name: `Cohort User ${i}`,
            password: 'hash',
            role: 'learner',
            assessmentStatus: 'completed',
            assessmentData: {
              evaluationResult: {
                overallScore: 70 + i * 5,
                capabilities: {
                  usingAI: { score: 75 },
                  understandingAI: { score: 70 },
                  solvingWithAI: { score: 80 },
                  checkingAI: { score: 65 },
                  adaptingToAI: { score: 72 },
                },
              },
            },
          },
        });
      }

      const req: any = {};
      const res = createMockResponse();

      await getComparativeAnalysis(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.available).toBe(false);
      expect(res.body.totalComparableRecords).toBe(2);
      expect(res.body.minRequiredRecords).toBe(5);
      expect(res.body.message).toContain('Comparative analysis requires at least 5');
    });

    it('computes accurate mean, median, p90, and capability averages when cohort size >= 5', async () => {
      // Seed 5 completed assessments with scores: 60, 70, 80, 90, 100
      const testScores = [60, 70, 80, 90, 100];
      for (let i = 0; i < testScores.length; i++) {
        await prisma.user.create({
          data: {
            id: `cohort-user-valid-${i}`,
            email: `cohort-valid-${i}@aiims.edu`,
            name: `User ${i}`,
            password: 'hash',
            role: 'learner',
            assessmentStatus: 'completed',
            assessmentData: {
              evaluationResult: {
                overallScore: testScores[i],
                capabilities: {
                  usingAI: { score: testScores[i] },
                  understandingAI: { score: testScores[i] - 5 },
                  solvingWithAI: { score: testScores[i] + 5 },
                  checkingAI: { score: testScores[i] - 10 },
                  adaptingToAI: { score: testScores[i] },
                },
              },
            },
          },
        });
      }

      const req: any = {};
      const res = createMockResponse();

      await getComparativeAnalysis(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.available).toBe(true);
      expect(res.body.totalComparableRecords).toBe(5);
      // Mean of [60, 70, 80, 90, 100] = 80
      expect(res.body.peerAverage).toBe(80);
      // Median of [60, 70, 80, 90, 100] = 80
      expect(res.body.median).toBe(80);
      // p90 (index floor(5 * 0.9) = 4) = 100
      expect(res.body.p90).toBe(100);
      // Capability averages
      expect(res.body.capabilityAverages.usingAI).toBe(80);
      expect(res.body.capabilityAverages.understandingAI).toBe(75);
      expect(res.body.capabilityAverages.solvingWithAI).toBe(85);
      expect(res.body.capabilityAverages.checkingAI).toBe(70);
      expect(res.body.capabilityAverages.adaptingToAI).toBe(80);
    });
  });

  describe('Individual Analysis Dynamic Evidence', () => {
    it('returns dynamic strengths, gaps, and 5-dimension scores from authentic evaluation results', () => {
      const mockReq: AuthenticatedRequest = {
        user: {
          id: 'test-learner-individual',
          name: 'Jane Doe',
          email: 'jane@aiims.edu',
          role: 'learner',
          college: 'Engineering College',
          track: 'Student',
          targetGoal: 'AI Mastery',
          stage: 'Understanding',
          xpPoints: 600,
          aiimsCredits: 550,
          assessmentStatus: 'completed',
          assessment: {
            status: 'completed',
            evaluationResult: {
              overallScore: 84,
              overallConfidence: 0.92,
              overallEvidenceCoverage: 1.0,
              strongestSkill: { key: 'solvingWithAI', name: 'Solving with AI', score: 92 },
              roomToGrow: { key: 'checkingAI', name: 'Checking AI', score: 68 },
              capabilities: {
                usingAI: { score: 85, demonstratedStrengths: ['Daily tool integration'] },
                understandingAI: {
                  score: 82,
                  demonstratedStrengths: ['Model boundaries intuition'],
                },
                solvingWithAI: {
                  score: 92,
                  demonstratedStrengths: ['Architectural prompt decomposition'],
                },
                checkingAI: {
                  score: 68,
                  identifiedGaps: ['Automated hallucination cross-checking'],
                },
                adaptingToAI: { score: 80, demonstratedStrengths: ['Rapid workflow agility'] },
              },
            },
          },
        } as any,
      } as AuthenticatedRequest;

      const res = createMockResponse();

      getIndividualAnalysis(mockReq, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.overallScore).toBe(84);
      expect(res.body.scores.length).toBe(5);
      expect(res.body.scores.find((s: any) => s.dimension === 'Solving with AI')?.score).toBe(92);
      expect(res.body.scores.find((s: any) => s.dimension === 'Checking AI')?.score).toBe(68);
      expect(res.body.strengths[0]).toContain('Solving with AI');
      expect(res.body.gaps[0]).toContain('Checking AI');
    });
  });
});
