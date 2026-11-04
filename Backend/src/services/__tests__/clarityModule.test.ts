import { describe, it, expect, beforeEach } from 'vitest';
import { clarityProgressionService } from '../clarityProgression.service';
import {
  inMemoryClarityProgressionConfig,
  setInMemoryClarityProgressionConfig,
} from '../../models/ClarityProgressionConfig.model';
import { inMemoryLearnerClarityProgressions } from '../../models/LearnerClarityProgression.model';

describe('AIIMS Clarity Module & Progression Engine', () => {
  beforeEach(() => {
    // Reset progression config to defaults
    setInMemoryClarityProgressionConfig({
      upwardThreshold: 80,
      consecutiveRequired: 2,
      downwardThreshold: 50,
      updatedBy: 'SYSTEM_TEST_DEFAULT',
    });
    inMemoryLearnerClarityProgressions.clear();
  });

  describe('Clarity Progression Defaults & Thresholds', () => {
    it('returns default progression configuration: upward 80, consecutive 2, downward 50', async () => {
      const config = await clarityProgressionService.getProgressionConfig();
      expect(config.upwardThreshold).toBe(80);
      expect(config.consecutiveRequired).toBe(2);
      expect(config.downwardThreshold).toBe(50);
    });

    it('allows admin to update progression configuration with valid thresholds', async () => {
      const updated = await clarityProgressionService.updateProgressionConfig('admin-unit-1', {
        upwardThreshold: 85,
        consecutiveRequired: 3,
        downwardThreshold: 45,
      });

      expect(updated.upwardThreshold).toBe(85);
      expect(updated.consecutiveRequired).toBe(3);
      expect(updated.downwardThreshold).toBe(45);
      expect(updated.updatedBy).toBe('admin-unit-1');
    });

    it('rejects invalid configuration where downwardThreshold >= upwardThreshold', async () => {
      await expect(
        clarityProgressionService.updateProgressionConfig('admin-unit-1', {
          upwardThreshold: 60,
          consecutiveRequired: 2,
          downwardThreshold: 70,
        })
      ).rejects.toThrow('downwardThreshold must be strictly less than upwardThreshold');
    });
  });

  describe('Level Progression Transitions & Boundaries', () => {
    const learnerId = 'unit-test-learner-1';
    const topic = 'Checking AI';

    it('initializes learner at Easy level with 0 consecutive high scores', async () => {
      const prog = await clarityProgressionService.getLearnerProgression(learnerId, topic);
      expect(prog.currentLevel).toBe('Easy');
      expect(prog.consecutiveHighScores).toBe(0);
      expect(prog.totalAttempts).toBe(0);
    });

    it('advances from Easy to Medium after two consecutive scores >= 80', async () => {
      // First high score
      const res1 = await clarityProgressionService.recordAttemptScore(
        learnerId,
        topic,
        85,
        'att-1'
      );
      expect(res1.currentLevel).toBe('Easy');
      expect(res1.consecutiveHighScores).toBe(1);
      expect(res1.levelChanged).toBe(false);

      // Second consecutive high score
      const res2 = await clarityProgressionService.recordAttemptScore(
        learnerId,
        topic,
        90,
        'att-2'
      );
      expect(res2.currentLevel).toBe('Medium');
      expect(res2.consecutiveHighScores).toBe(0); // Resets streak
      expect(res2.levelChanged).toBe(true);
      expect(res2.direction).toBe('UP');
    });

    it('advances from Medium to Hard after two consecutive scores >= 80', async () => {
      // Advance to Medium first
      await clarityProgressionService.recordAttemptScore(learnerId, topic, 85, 'att-1');
      await clarityProgressionService.recordAttemptScore(learnerId, topic, 85, 'att-2');

      // Now in Medium: achieve two consecutive high scores
      const res3 = await clarityProgressionService.recordAttemptScore(
        learnerId,
        topic,
        80,
        'att-3'
      );
      expect(res3.currentLevel).toBe('Medium');
      expect(res3.consecutiveHighScores).toBe(1);

      const res4 = await clarityProgressionService.recordAttemptScore(
        learnerId,
        topic,
        88,
        'att-4'
      );
      expect(res4.currentLevel).toBe('Hard');
      expect(res4.consecutiveHighScores).toBe(0);
      expect(res4.levelChanged).toBe(true);
      expect(res4.direction).toBe('UP');
    });

    it('enforces Upper Boundary: cannot progress beyond Hard level', async () => {
      // Bring learner to Hard
      await clarityProgressionService.recordAttemptScore(learnerId, topic, 85, 'att-1');
      await clarityProgressionService.recordAttemptScore(learnerId, topic, 85, 'att-2');
      await clarityProgressionService.recordAttemptScore(learnerId, topic, 85, 'att-3');
      await clarityProgressionService.recordAttemptScore(learnerId, topic, 85, 'att-4');

      // Two more high scores on Hard
      await clarityProgressionService.recordAttemptScore(learnerId, topic, 95, 'att-5');
      const resHard = await clarityProgressionService.recordAttemptScore(
        learnerId,
        topic,
        98,
        'att-6'
      );

      expect(resHard.currentLevel).toBe('Hard');
      expect(resHard.levelChanged).toBe(false);
      expect(resHard.direction).toBe('NONE');
    });

    it('drops from Hard to Medium after a single score < 50', async () => {
      // Bring learner to Hard
      await clarityProgressionService.recordAttemptScore(learnerId, topic, 85, 'att-1');
      await clarityProgressionService.recordAttemptScore(learnerId, topic, 85, 'att-2');
      await clarityProgressionService.recordAttemptScore(learnerId, topic, 85, 'att-3');
      await clarityProgressionService.recordAttemptScore(learnerId, topic, 85, 'att-4');

      // Score below 50
      const dropRes = await clarityProgressionService.recordAttemptScore(
        learnerId,
        topic,
        45,
        'att-drop-1'
      );
      expect(dropRes.currentLevel).toBe('Medium');
      expect(dropRes.levelChanged).toBe(true);
      expect(dropRes.direction).toBe('DOWN');
      expect(dropRes.consecutiveHighScores).toBe(0);
    });

    it('drops from Medium to Easy after a single score < 50', async () => {
      // Bring learner to Medium
      await clarityProgressionService.recordAttemptScore(learnerId, topic, 85, 'att-1');
      await clarityProgressionService.recordAttemptScore(learnerId, topic, 85, 'att-2');

      // Score below 50
      const dropRes = await clarityProgressionService.recordAttemptScore(
        learnerId,
        topic,
        40,
        'att-drop-2'
      );
      expect(dropRes.currentLevel).toBe('Easy');
      expect(dropRes.levelChanged).toBe(true);
      expect(dropRes.direction).toBe('DOWN');
    });

    it('enforces Lower Boundary: cannot drop below Easy level', async () => {
      // Score < 50 while already on Easy
      const resEasy = await clarityProgressionService.recordAttemptScore(
        learnerId,
        topic,
        20,
        'att-low'
      );
      expect(resEasy.currentLevel).toBe('Easy');
      expect(resEasy.levelChanged).toBe(false);
      expect(resEasy.direction).toBe('NONE');
    });

    it('treats score of exactly 50 as neutral: does NOT drop level', async () => {
      // Bring to Medium
      await clarityProgressionService.recordAttemptScore(learnerId, topic, 85, 'att-1');
      await clarityProgressionService.recordAttemptScore(learnerId, topic, 85, 'att-2');

      // Score of exactly 50
      const res50 = await clarityProgressionService.recordAttemptScore(
        learnerId,
        topic,
        50,
        'att-exact-50'
      );
      expect(res50.currentLevel).toBe('Medium');
      expect(res50.levelChanged).toBe(false);
      expect(res50.direction).toBe('NONE');
    });

    it('treats score of exactly 80 as high score (counts toward advancement)', async () => {
      const res80 = await clarityProgressionService.recordAttemptScore(
        learnerId,
        topic,
        80,
        'att-exact-80'
      );
      expect(res80.consecutiveHighScores).toBe(1);
    });

    it('neutral scores (50-79) reset consecutive high scores streak without dropping level', async () => {
      // 1 high score
      await clarityProgressionService.recordAttemptScore(learnerId, topic, 85, 'att-1');
      const p1 = await clarityProgressionService.getLearnerProgression(learnerId, topic);
      expect(p1.consecutiveHighScores).toBe(1);

      // Neutral score
      const resNeutral = await clarityProgressionService.recordAttemptScore(
        learnerId,
        topic,
        72,
        'att-neutral'
      );
      expect(resNeutral.currentLevel).toBe('Easy');
      expect(resNeutral.consecutiveHighScores).toBe(0); // Streak broken
      expect(resNeutral.direction).toBe('NONE');
    });
  });
});
