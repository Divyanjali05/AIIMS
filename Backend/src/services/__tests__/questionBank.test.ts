import { describe, it, expect, beforeEach } from 'vitest';
import { questionBankService, TARGET_MINIMUM_PER_LEVEL } from '../questionBank.service';
import { similarityDetectorService } from '../similarityDetector.service';
import { aiQuestionGeneratorService } from '../aiQuestionGenerator.service';
import { inMemoryQuestionBank } from '../../models/QuestionBank.model';
import { inMemoryAssignments } from '../../models/QuestionAssignment.model';
import { inMemoryAttempts } from '../../models/QuestionAttempt.model';
import { inMemoryExclusionConfig } from '../../models/InstitutionExclusionConfig.model';
import { initSeedQuestions } from '../seedQuestions';

describe('AIIMS Question Bank & AI Generation Engine', () => {
  beforeEach(async () => {
    inMemoryQuestionBank.clear();
    inMemoryAssignments.clear();
    inMemoryAttempts.clear();
    inMemoryExclusionConfig.scope = 'college';
    inMemoryExclusionConfig.exclusionDays = 30;
    await initSeedQuestions();
  });

  describe('1. Baseline Seeding & Model Integrity', () => {
    it('seeds approved baseline questions for General and Coding tracks across Easy, Medium, Hard', () => {
      expect(inMemoryQuestionBank.size).toBeGreaterThanOrEqual(10);
      const checkingEasy = inMemoryQuestionBank.get('qb-check-easy-01');
      expect(checkingEasy).toBeDefined();
      expect(checkingEasy.topic).toBe('Checking AI');
      expect(checkingEasy.level).toBe('Easy');
      expect(checkingEasy.track).toBe('General');
      expect(checkingEasy.status).toBe('ACTIVE');
    });

    it('validates question bank coverage and calculates deficit to reach minimum target (30)', async () => {
      const coverage = await questionBankService.getCoverageReport();
      expect(coverage.length).toBeGreaterThan(0);
      const row = coverage.find(
        (r) => r.topic === 'Checking AI' && r.level === 'Easy' && r.track === 'General'
      );
      expect(row).toBeDefined();
      expect(row!.neededToTarget).toBe(TARGET_MINIMUM_PER_LEVEL - row!.availableQuestions);
    });
  });

  describe('2. Learner Assignment & No-Repeat Guarantee', () => {
    it('serves an eligible question to a learner on first request', async () => {
      const res = await questionBankService.serveQuestion({
        learnerId: 'learner-u101',
        topic: 'Checking AI',
        level: 'Easy',
        track: 'General',
      });
      expect(res.assignment).toBeDefined();
      expect(res.question).toBeDefined();
      expect(res.question.level).toBe('Easy');
      expect(res.assignment.learnerId).toBe('learner-u101');
      expect(res.assignment.status).toBe('ASSIGNED');
    });

    it('enforces that a learner never receives the same question ID twice', async () => {
      const res1 = await questionBankService.serveQuestion({
        learnerId: 'learner-u102',
        topic: 'Checking AI',
        level: 'Easy',
        track: 'General',
      });

      // Submit attempt so learner finishes question 1
      await questionBankService.submitAttempt({
        learnerId: 'learner-u102',
        assignmentId: res1.assignment.assignmentId,
        answer: 'Thorough answer demonstrating all criteria.',
      });

      // Request next question for same topic and level
      const res2 = await questionBankService.serveQuestion({
        learnerId: 'learner-u102',
        topic: 'Checking AI',
        level: 'Easy',
        track: 'General',
      });

      expect(res2.question.questionId).not.toBe(res1.question.questionId);
    });

    it('returns existing ongoing assignment on page reload without creating duplicate assignments', async () => {
      const res1 = await questionBankService.serveQuestion({
        learnerId: 'learner-u103',
        topic: 'Checking AI',
        level: 'Easy',
        track: 'General',
      });

      const current = await questionBankService.getCurrentAssignment('learner-u103');
      expect(current).not.toBeNull();
      expect(current.assignment.assignmentId).toBe(res1.assignment.assignmentId);

      // Reloading / repeating serveQuestion returns the same ongoing assignment
      const res2 = await questionBankService.serveQuestion({
        learnerId: 'learner-u103',
        topic: 'Checking AI',
        level: 'Easy',
        track: 'General',
      });
      expect(res2.assignment.assignmentId).toBe(res1.assignment.assignmentId);
    });
  });

  describe('3. Institution-Level Exclusion Protection', () => {
    it('excludes questions served to other learners from the same college within the exclusion window', async () => {
      const COLLEGE = 'TECH-INSTITUTE-BANGALORE';

      // Learner A from College X is served question 1
      const resA = await questionBankService.serveQuestion({
        learnerId: 'learner-coll-A',
        topic: 'Checking AI',
        level: 'Easy',
        track: 'General',
        userCollege: COLLEGE,
      });

      // Submit attempt
      await questionBankService.submitAttempt({
        learnerId: 'learner-coll-A',
        assignmentId: resA.assignment.assignmentId,
        answer: 'Completed answer',
      });

      // Learner B from the SAME College X requests question for same topic/level
      const resB = await questionBankService.serveQuestion({
        learnerId: 'learner-coll-B',
        topic: 'Checking AI',
        level: 'Easy',
        track: 'General',
        userCollege: COLLEGE,
      });

      // Learner B must NOT receive Learner A's question!
      expect(resB.question.questionId).not.toBe(resA.question.questionId);
    });

    it('allows different-college learner to receive a question served elsewhere', async () => {
      const COLLEGE_1 = 'STANFORD-TECH';
      const COLLEGE_2 = 'OXFORD-COMPUTING';

      const res1 = await questionBankService.serveQuestion({
        learnerId: 'learner-diff-1',
        topic: 'AI Workflow Design',
        level: 'Easy',
        track: 'General',
        userCollege: COLLEGE_1,
      });

      // Different college learner has no institution collision
      const excludedFor2 = await questionBankService.getInstitutionExcludedQuestionIds(
        COLLEGE_2,
        'learner-diff-2',
        new Date(Date.now() - 30 * 86400000)
      );
      expect(excludedFor2).not.toContain(res1.question.questionId);
    });

    it('allows administrator to configure exclusion duration and scope', async () => {
      const updated = await questionBankService.updateExclusionConfig('batch', 15, 'admin-01');
      expect(updated.scope).toBe('batch');
      expect(updated.exclusionDays).toBe(15);

      const active = await questionBankService.getExclusionConfig();
      expect(active.scope).toBe('batch');
      expect(active.exclusionDays).toBe(15);
    });
  });

  describe('4. Question Similarity & Duplicate Detection', () => {
    it('detects exact duplicate text with 100% similarity', () => {
      const q1 = {
        title: 'Weekly Report Prompt Design',
        promptText: 'Design a structured weekly report prompt with 3 sections.',
        testScenario: 'Marketing team reporting progress every Friday.',
      };
      const q2 = {
        title: 'Weekly Report Prompt Design',
        promptText: 'Design a structured weekly report prompt with 3 sections.',
        testScenario: 'Marketing team reporting progress every Friday.',
      };
      const result = similarityDetectorService.compareQuestions(q1, q2);
      expect(result).toBe(1.0);
    });

    it('detects near-duplicate questions with high token overlap above threshold', () => {
      const q1 = {
        title: 'Vendor Invoice Discrepancy Audit',
        promptText:
          'Audit the generated executive summary against the raw vendor invoice for discrepancies.',
        testScenario: 'Vendor TechCorp delivered 15 monitors on March 12 at $200 each.',
      };
      const q2 = {
        title: 'Vendor Invoice Inconsistency Audit',
        promptText:
          'Audit the produced executive summary against raw vendor invoices for factual discrepancies.',
        testScenario: 'Vendor TechCorp delivered 15 monitors on March 12 for $200 each.',
      };
      const check = similarityDetectorService.checkAgainstQuestionBank(q2, [q1], 0.7);
      expect(check.isDuplicate).toBe(true);
      expect(check.highestSimilarity).toBeGreaterThanOrEqual(0.7);
    });

    it('passes genuinely distinct scenarios below similarity threshold', () => {
      const q1 = {
        title: 'Customer Discount Policy Check',
        promptText: 'Verify customer response against promotional guidelines.',
        testScenario: 'Purchased $45 with 20% discount code.',
      };
      const q2 = {
        title: 'Autonomous Procurement Auditor',
        promptText: 'Architect an agent state machine for purchase orders exceeding $10,000.',
        testScenario: 'Company processes 200 purchase orders monthly with bank details.',
      };
      const check = similarityDetectorService.checkAgainstQuestionBank(q2, [q1], 0.7);
      expect(check.isDuplicate).toBe(false);
      expect(check.highestSimilarity).toBeLessThan(0.4);
    });
  });

  describe('5. AI Question Generation & Bank Exhaustion', () => {
    it('triggers AI question generation when bank is exhausted', async () => {
      // Clear out all existing questions for 'AI Agents & Autonomous Workflows' / 'Easy'
      for (const [id, q] of inMemoryQuestionBank.entries()) {
        if (q.topic === 'AI Agents & Autonomous Workflows' && q.level === 'Easy') {
          inMemoryQuestionBank.delete(id);
        }
      }

      const res = await questionBankService.serveQuestion({
        learnerId: 'learner-ai-gen',
        topic: 'AI Agents & Autonomous Workflows',
        level: 'Easy',
        track: 'General',
      });

      expect(res.source).toBe('AI_GENERATED');
      expect(res.question.source).toBe('AI');
      expect(res.question.aiMetadata).toBeDefined();
      expect(res.question.status).toBe('ACTIVE');
    });

    it('protects against duplicate concurrent AI generations using concurrency locking', async () => {
      const p1 = aiQuestionGeneratorService.generateQuestion({
        topic: 'Prompt Engineering & Grounding',
        level: 'Medium',
        track: 'General',
      });
      const p2 = aiQuestionGeneratorService.generateQuestion({
        topic: 'Prompt Engineering & Grounding',
        level: 'Medium',
        track: 'General',
      });

      const [res1, res2] = await Promise.all([p1, p2]);
      // Both promises should return the same de-duplicated generation instance
      expect(res1.questionId).toBe(res2.questionId);
    });
  });

  describe('6. Attempt History & Immutable Scoring', () => {
    it('creates an immutable attempt record with server-side scoring and rubric feedback', async () => {
      const serveRes = await questionBankService.serveQuestion({
        learnerId: 'learner-attempt-test',
        topic: 'Checking AI',
        level: 'Easy',
        track: 'General',
      });

      const submitRes = await questionBankService.submitAttempt({
        learnerId: 'learner-attempt-test',
        assignmentId: serveRes.assignment.assignmentId,
        answer:
          'Identified the $50 threshold and declared the $45 transaction inaccurate according to Clause 2.',
        timeTakenSeconds: 45,
      });

      expect(submitRes.attempt.attemptId).toBeDefined();
      expect(submitRes.attempt.score).toBeGreaterThan(0);
      expect(submitRes.attempt.rubricFeedback.length).toBeGreaterThan(0);

      const history = await questionBankService.getAttemptHistory('learner-attempt-test');
      expect(history.length).toBe(1);
      expect(history[0].attemptId).toBe(submitRes.attempt.attemptId);
      expect(history[0].score).toBe(submitRes.attempt.score);
    });
  });
});
