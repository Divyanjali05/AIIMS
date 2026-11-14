import { prisma, isDatabaseConnected } from '../config/prisma';
import { ClarityLevel, IClarityAttemptHistoryItem } from '../types/models';
import { toArray } from '../utils/id';
import { toJsonInput } from '../utils/userMapper';

const GLOBAL_CONFIG_KEY = 'GLOBAL_PROGRESSION_CONFIG';

export interface ProgressionTransitionResult {
  previousLevel: ClarityLevel;
  currentLevel: ClarityLevel;
  consecutiveHighScores: number;
  levelChanged: boolean;
  direction: 'UP' | 'DOWN' | 'NONE';
  score: number;
  topic: string;
}

export class ClarityProgressionService {
  /**
   * Retrieves active progression configuration (thresholds and requirements).
   */
  public async getProgressionConfig(): Promise<{
    upwardThreshold: number;
    consecutiveRequired: number;
    downwardThreshold: number;
    updatedBy: string;
    updatedAt: Date;
  }> {
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const config = await prisma.clarityProgressionConfig.upsert({
      where: { configKey: GLOBAL_CONFIG_KEY },
      create: {
        configKey: GLOBAL_CONFIG_KEY,
        upwardThreshold: 80,
        consecutiveRequired: 2,
        downwardThreshold: 50,
        updatedBy: 'SYSTEM_DEFAULT',
      },
      update: {},
    });

    return {
      upwardThreshold: config.upwardThreshold,
      consecutiveRequired: config.consecutiveRequired,
      downwardThreshold: config.downwardThreshold,
      updatedBy: config.updatedBy,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Updates progression configuration (Admin only).
   */
  public async updateProgressionConfig(
    adminId: string,
    updates: {
      upwardThreshold: number;
      consecutiveRequired: number;
      downwardThreshold: number;
    }
  ): Promise<{
    upwardThreshold: number;
    consecutiveRequired: number;
    downwardThreshold: number;
    updatedBy: string;
    updatedAt: Date;
  }> {
    if (updates.downwardThreshold >= updates.upwardThreshold) {
      throw new Error('downwardThreshold must be strictly less than upwardThreshold.');
    }

    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const updated = await prisma.clarityProgressionConfig.upsert({
      where: { configKey: GLOBAL_CONFIG_KEY },
      create: {
        configKey: GLOBAL_CONFIG_KEY,
        upwardThreshold: updates.upwardThreshold,
        consecutiveRequired: updates.consecutiveRequired,
        downwardThreshold: updates.downwardThreshold,
        updatedBy: adminId,
      },
      update: {
        upwardThreshold: updates.upwardThreshold,
        consecutiveRequired: updates.consecutiveRequired,
        downwardThreshold: updates.downwardThreshold,
        updatedBy: adminId,
      },
    });

    return {
      upwardThreshold: updated.upwardThreshold,
      consecutiveRequired: updated.consecutiveRequired,
      downwardThreshold: updated.downwardThreshold,
      updatedBy: updated.updatedBy,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Retrieves progression status for a given learner and topic.
   */
  public async getLearnerProgression(
    learnerId: string,
    topic: string
  ): Promise<{
    learnerId: string;
    topic: string;
    currentLevel: ClarityLevel;
    consecutiveHighScores: number;
    totalAttempts: number;
    lastScore?: number;
    history: IClarityAttemptHistoryItem[];
  }> {
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const progression = await prisma.learnerClarityProgression.findUnique({
      where: {
        learnerId_topic: {
          learnerId,
          topic,
        },
      },
    });

    if (progression) {
      return {
        learnerId: progression.learnerId,
        topic: progression.topic,
        currentLevel: progression.currentLevel as ClarityLevel,
        consecutiveHighScores: progression.consecutiveHighScores,
        totalAttempts: progression.totalAttempts,
        lastScore: progression.lastScore ?? undefined,
        history: toArray<IClarityAttemptHistoryItem>(progression.history),
      };
    }

    // Default starting state
    return {
      learnerId,
      topic,
      currentLevel: 'Easy',
      consecutiveHighScores: 0,
      totalAttempts: 0,
      history: [],
    };
  }

  /**
   * Authoritative progression evaluation on submitted task attempt.
   * Rules:
   * 1. Upward: two consecutive scores >= upwardThreshold (default 80) advances level (Easy -> Medium -> Hard).
   * 2. Downward: a single score < downwardThreshold (default 50) drops level (Hard -> Medium -> Easy).
   * 3. Neutral: scores between 50 and 79 maintain current level and reset consecutive streak to 0.
   * 4. Boundaries: Hard is maximum level; Easy is minimum level.
   * 5. Exactly 80 counts as high; exactly 50 does NOT drop level.
   */
  public async recordAttemptScore(
    learnerId: string,
    topic: string,
    score: number,
    attemptId: string
  ): Promise<ProgressionTransitionResult> {
    if (!isDatabaseConnected()) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const config = await this.getProgressionConfig();
    const currentProgression = await this.getLearnerProgression(learnerId, topic);

    const previousLevel: ClarityLevel = currentProgression.currentLevel;
    let nextLevel: ClarityLevel = previousLevel;
    let consecutiveHigh = currentProgression.consecutiveHighScores;
    let direction: 'UP' | 'DOWN' | 'NONE' = 'NONE';

    // 1. Upward progression rule
    if (score >= config.upwardThreshold) {
      consecutiveHigh += 1;
      if (consecutiveHigh >= config.consecutiveRequired) {
        if (previousLevel === 'Easy') {
          nextLevel = 'Medium';
          consecutiveHigh = 0; // reset streak upon level advancement
          direction = 'UP';
        } else if (previousLevel === 'Medium') {
          nextLevel = 'Hard';
          consecutiveHigh = 0; // reset streak upon level advancement
          direction = 'UP';
        } else if (previousLevel === 'Hard') {
          nextLevel = 'Hard';
          direction = 'NONE';
        }
      }
    }
    // 2. Downward progression rule
    else if (score < config.downwardThreshold) {
      consecutiveHigh = 0;
      if (previousLevel === 'Hard') {
        nextLevel = 'Medium';
        direction = 'DOWN';
      } else if (previousLevel === 'Medium') {
        nextLevel = 'Easy';
        direction = 'DOWN';
      } else if (previousLevel === 'Easy') {
        nextLevel = 'Easy';
        direction = 'NONE';
      }
    }
    // 3. Neutral zone
    else {
      consecutiveHigh = 0;
      direction = 'NONE';
    }

    const historyEntry: IClarityAttemptHistoryItem = {
      attemptId,
      score,
      level: previousLevel,
      timestamp: new Date().toISOString(),
    };

    const totalAttempts = currentProgression.totalAttempts + 1;
    const updatedHistory = [...(currentProgression.history || []), historyEntry];

    await prisma.learnerClarityProgression.upsert({
      where: {
        learnerId_topic: {
          learnerId,
          topic,
        },
      },
      create: {
        learnerId,
        topic,
        currentLevel: nextLevel,
        consecutiveHighScores: consecutiveHigh,
        totalAttempts,
        lastScore: score,
        history: toJsonInput(updatedHistory),
      },
      update: {
        currentLevel: nextLevel,
        consecutiveHighScores: consecutiveHigh,
        totalAttempts,
        lastScore: score,
        history: toJsonInput(updatedHistory),
      },
    });

    return {
      previousLevel,
      currentLevel: nextLevel,
      consecutiveHighScores: consecutiveHigh,
      levelChanged: previousLevel !== nextLevel,
      direction,
      score,
      topic,
    };
  }
}

export const clarityProgressionService = new ClarityProgressionService();
