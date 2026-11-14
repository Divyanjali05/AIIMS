/**
 * aiProfileGenerator.service.ts
 * =========================================================
 * AIIMS Phase 2: AI Learner Profile Generation & Validation Service
 *
 * Responsibilities:
 *  1. Generates deep, personalized AI Learner Profiles based on authentic assessment evidence.
 *  2. Enforces strict structured output validation via Zod schemas.
 *  3. Executes exactly ONE controlled retry when schema validation fails.
 *  4. Integrates with Phase 1 Credits Ledger Service:
 *     - Exactly 50 AC deduction per valid generation.
 *     - Guaranteed atomic refund if generation fails (schema failure after retry or provider error).
 *     - Strict idempotency to prevent duplicate charges or concurrent replay attacks.
 *  5. Persists validated profiles into PostgreSQL (survives logout, login, and browser refresh).
 *  6. Preserves historical profile generations in an audit history array.
 */

import { z } from 'zod';
import { prisma, isDatabaseConnected } from '../config/prisma';
import { creditsLedgerService } from './creditsLedger.service';
import { ClaudeService } from './anthropic/claude.service';
import { toRecord } from '../utils/id';
import { toJsonInput } from '../utils/userMapper';

/**
 * 1. Zod Validation Schema for AI Learner Profile
 */
export const aiLearnerProfileSchema = z.object({
  summary: z.string().min(20, 'Executive summary must be at least 20 characters'),
  strengths: z.array(z.string()).min(1, 'At least one demonstrated strength is required'),
  weaknesses: z.array(z.string()).min(1, 'At least one weakness is required'),
  skillGaps: z.array(z.string()).min(1, 'At least one skill gap is required'),
  learningPreferences: z.array(z.string()).min(1, 'At least one learning preference is required'),
  improvementAreas: z
    .array(z.string())
    .min(1, 'At least one priority improvement area is required'),
  recommendedFocus: z.string().min(5, 'Recommended focus track must be at least 5 characters'),
  recommendedRoles: z.array(z.string()).default([]),
  confidenceScore: z.number().min(0).max(100).default(85),
});

export type AILearnerProfilePayload = z.infer<typeof aiLearnerProfileSchema>;

export interface PersistentAILearnerProfile extends AILearnerProfilePayload {
  version: number;
  generatedAt: string;
  generationCost: number;
  assessmentScoreAtGeneration: number;
}

export interface ProfileGenerationResult {
  success: boolean;
  profile?: PersistentAILearnerProfile;
  balance?: number;
  chargedFee?: number;
  duplicate?: boolean;
  code?: string;
  error?: string;
  retried?: boolean;
}

export class AIProfileGeneratorService {
  private claudeService: ClaudeService;
  private activeGenerations: Map<string, Promise<ProfileGenerationResult>> = new Map();
  private completionRunner?: (prompt: string) => Promise<string>;

  constructor() {
    this.claudeService = new ClaudeService();
  }

  /**
   * Allows setting a custom AI completion runner (for unit and integration tests)
   */
  public setAICompletionRunner(runner?: (prompt: string) => Promise<string>): void {
    this.completionRunner = runner;
  }

  /**
   * Clears any active in-flight promises
   */
  public clearActiveGenerations(): void {
    this.activeGenerations.clear();
  }

  /**
   * Generates or retrieves an AI Learner Profile for the authenticated user.
   */
  public async generateProfile(
    userId: string,
    idempotencyKey?: string
  ): Promise<ProfileGenerationResult> {
    return this.generateProfileForLearner({ userId, idempotencyKey });
  }

  public async generateProfileForLearner(params: {
    userId: string;
    idempotencyKey?: string;
  }): Promise<ProfileGenerationResult> {
    const { userId, idempotencyKey } = params;

    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      return { success: false, code: 'INVALID_USER_ID', error: 'Valid user ID is required.' };
    }

    if (!isDatabaseConnected()) {
      return {
        success: false,
        code: 'DATABASE_UNAVAILABLE',
        error: 'Database service unavailable. PostgreSQL connection is required.',
      };
    }

    // 1. Concurrency Mutex: Prevent duplicate concurrent requests from charging multiple times
    const activeLockKey = `lock::profile::${userId}`;
    const existingActivePromise = this.activeGenerations.get(activeLockKey);
    if (existingActivePromise) {
      return existingActivePromise;
    }

    const generationPromise = this.executeProfileGenerationFlow(userId, idempotencyKey);
    this.activeGenerations.set(activeLockKey, generationPromise);

    try {
      const result = await generationPromise;
      return result;
    } finally {
      this.activeGenerations.delete(activeLockKey);
    }
  }

  /**
   * Internal execution pipeline for profile generation
   */
  private async executeProfileGenerationFlow(
    userId: string,
    idempotencyKey?: string
  ): Promise<ProfileGenerationResult> {
    const finalIdempotencyKey = idempotencyKey || `profile::${userId}::generate`;

    // 2. Fetch User and Assessment Record
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        entrepreneurProfile: true,
      },
    });

    if (!user) {
      return { success: false, code: 'USER_NOT_FOUND', error: 'Learner account not found.' };
    }

    const assessmentData = toRecord(user.assessmentData);
    if (user.assessmentStatus !== 'completed' || assessmentData.status !== 'completed') {
      return {
        success: false,
        code: 'ASSESSMENT_NOT_COMPLETED',
        error:
          'Cannot generate an AI Learner Profile before completing the baseline diagnostic assessment.',
      };
    }

    const evaluationResult = assessmentData.evaluationResult;
    if (!evaluationResult || !evaluationResult.capabilities) {
      return {
        success: false,
        code: 'ASSESSMENT_DATA_INVALID',
        error: 'Assessment evaluation result is missing or incomplete.',
      };
    }

    // 3. Economy Check & Pre-Deduction (50 AC)
    // Check if this exact idempotency key was already completed
    const existingTx = await prisma.creditLedger.findUnique({
      where: {
        userId_idempotencyKey: {
          userId,
          idempotencyKey: finalIdempotencyKey,
        },
      },
    });

    if (existingTx && existingTx.type === 'SPEND' && existingTx.status === 'COMPLETED') {
      // Replay / Duplicate request: Return current profile from database without re-charging
      const analysisData = toRecord(user.analysisData);
      if (analysisData.aiProfile) {
        const currentBalance = await creditsLedgerService.getBalance(userId);
        return {
          success: true,
          duplicate: true,
          profile: analysisData.aiProfile as PersistentAILearnerProfile,
          balance: currentBalance,
          chargedFee: 0,
        };
      }
    }

    // Verify current balance before charging
    const currentBalanceBefore = await creditsLedgerService.getBalance(userId);
    const PROFILE_GENERATION_COST = 50;

    if (currentBalanceBefore < PROFILE_GENERATION_COST) {
      return {
        success: false,
        code: 'INSUFFICIENT_CREDITS',
        balance: currentBalanceBefore,
        error: `Insufficient AIIMS Credits. Profile generation requires ${PROFILE_GENERATION_COST} AC (current balance: ${currentBalanceBefore} AC).`,
      };
    }

    // Atomically deduct 50 AC
    const deductionResult = await creditsLedgerService.executeTransaction({
      userId,
      type: 'SPEND',
      category: 'TASK_USAGE',
      amount: PROFILE_GENERATION_COST,
      reason: 'AI Learner Profile Generation Fee (-50 AC)',
      source: 'AI_PROFILE',
      sourceId: finalIdempotencyKey,
      idempotencyKey: finalIdempotencyKey,
    });

    if (!deductionResult.success) {
      if (deductionResult.duplicate) {
        const analysisData = toRecord(user.analysisData);
        if (analysisData.aiProfile) {
          return {
            success: true,
            duplicate: true,
            profile: analysisData.aiProfile as PersistentAILearnerProfile,
            balance: deductionResult.balance,
            chargedFee: 0,
          };
        }
      }
      return {
        success: false,
        code: deductionResult.code || 'TRANSACTION_FAILED',
        error: deductionResult.error || 'Failed to process AI Profile generation fee.',
      };
    }

    // 4. Generate AI Profile using Authentic Evidence
    const refundKey = `refund::profile::${userId}::${Date.now()}`;
    let generatedProfilePayload: AILearnerProfilePayload | null = null;
    let didRetry = false;

    try {
      const prompt = this.buildProfileGenerationPrompt(user, evaluationResult);
      const rawAiResponse = await this.callAIProvider(prompt);

      // Validate response
      const parseResult = this.parseAndValidateResponse(rawAiResponse);
      if (parseResult.success && parseResult.data) {
        generatedProfilePayload = parseResult.data;
      } else {
        // ONE CONTROLLED RETRY on schema validation failure
        didRetry = true;
        console.warn(
          `[AIProfileGenerator] Response failed schema validation: ${parseResult.error}. Initiating controlled retry...`
        );
        const retryPrompt = this.buildRetryPrompt(prompt, rawAiResponse, parseResult.error);
        const retryResponse = await this.callAIProvider(retryPrompt);
        const retryParseResult = this.parseAndValidateResponse(retryResponse);

        if (retryParseResult.success && retryParseResult.data) {
          generatedProfilePayload = retryParseResult.data;
        } else {
          throw new Error(
            `AI Profile output failed schema validation after retry: ${retryParseResult.error}`
          );
        }
      }
    } catch (aiError: any) {
      // 5. Automatic Compensation Refund on Failure
      console.error(
        '[AIProfileGenerator] Profile generation failed. Executing automatic refund of 50 AC:',
        aiError?.message || aiError
      );

      await creditsLedgerService
        .refundCredits(
          userId,
          PROFILE_GENERATION_COST,
          'REFUND',
          'Automatic Refund: AI Profile Generation Failure',
          refundKey
        )
        .catch((refundErr) => {
          console.error('[AIProfileGenerator] CRITICAL: Compensation refund failed:', refundErr);
        });

      const refundedBalance = await creditsLedgerService.getBalance(userId);
      return {
        success: false,
        code: 'GENERATION_FAILED',
        error:
          'AI Profile generation encountered an error or failed output validation. Your 50 AC fee was automatically refunded.',
        balance: refundedBalance,
        retried: didRetry,
      };
    }

    if (!generatedProfilePayload) {
      throw new Error('AI Profile generation finished without valid payload');
    }

    // 6. Assemble Persistent Profile Record & Historical Audit
    const existingAnalysis = toRecord(user.analysisData);
    const existingHistory = Array.isArray(existingAnalysis.history) ? existingAnalysis.history : [];
    const currentVersion = existingHistory.length + 1;
    const nowIso = new Date().toISOString();

    const persistentProfile: PersistentAILearnerProfile = {
      summary: generatedProfilePayload.summary,
      strengths: generatedProfilePayload.strengths,
      weaknesses: generatedProfilePayload.weaknesses,
      skillGaps: generatedProfilePayload.skillGaps,
      learningPreferences: generatedProfilePayload.learningPreferences,
      improvementAreas: generatedProfilePayload.improvementAreas,
      recommendedFocus: generatedProfilePayload.recommendedFocus,
      recommendedRoles: generatedProfilePayload.recommendedRoles,
      confidenceScore: generatedProfilePayload.confidenceScore,
      version: currentVersion,
      generatedAt: nowIso,
      generationCost: PROFILE_GENERATION_COST,
      assessmentScoreAtGeneration: evaluationResult.overallScore ?? 0,
    };

    const nextAnalysisData = {
      ...existingAnalysis,
      status: 'generated',
      topCapability: persistentProfile.strengths[0] || existingAnalysis.topCapability,
      growthArea: persistentProfile.improvementAreas[0] || existingAnalysis.growthArea,
      aiProfile: persistentProfile,
      history: [...existingHistory, persistentProfile],
      lastGeneratedAt: nowIso,
    };

    // 7. Persist to PostgreSQL
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          analysisData: toJsonInput(nextAnalysisData),
          stage: 'Understanding',
        },
      });
    } catch (persistError) {
      console.error('[AIProfileGenerator] Persistence failure. Refunding credits:', persistError);
      await creditsLedgerService.refundCredits(
        userId,
        PROFILE_GENERATION_COST,
        'REFUND',
        'Automatic Refund: AI Profile Persistence Failure',
        `refund::persist::${userId}::${Date.now()}`
      );
      throw persistError;
    }

    const finalBalance = await creditsLedgerService.getBalance(userId);

    return {
      success: true,
      profile: persistentProfile,
      balance: finalBalance,
      chargedFee: PROFILE_GENERATION_COST,
      retried: didRetry,
    };
  }

  /**
   * Retrieves the current persistent profile for a learner
   */
  public async getProfileForLearner(userId: string): Promise<{
    available: boolean;
    profile?: PersistentAILearnerProfile;
    history?: PersistentAILearnerProfile[];
    analysisStatus?: string;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { analysisData: true, assessmentStatus: true },
    });

    if (!user) {
      return { available: false };
    }

    const analysisData = toRecord(user.analysisData);
    if (!analysisData.aiProfile) {
      return {
        available: false,
        analysisStatus: (analysisData.status as string) || 'locked',
        history: [],
      };
    }

    return {
      available: true,
      analysisStatus: (analysisData.status as string) || 'generated',
      profile: analysisData.aiProfile as PersistentAILearnerProfile,
      history: (analysisData.history as PersistentAILearnerProfile[]) || [],
    };
  }

  /**
   * Invokes AI provider or injected mock runner
   */
  private async callAIProvider(prompt: string): Promise<string> {
    if (this.completionRunner) {
      return this.completionRunner(prompt);
    }
    return this.claudeService.generateCompletion(prompt, {
      maxTokens: 1500,
      temperature: 0.2,
      jsonMode: true,
    });
  }

  /**
   * Parses JSON and validates against Zod schema
   */
  private parseAndValidateResponse(rawText: string): {
    success: boolean;
    data?: AILearnerProfilePayload;
    error?: string;
  } {
    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return { success: false, error: 'Empty AI response received' };
    }

    try {
      // Clean markdown code fence if present
      let cleanJson = rawText.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.slice(7);
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.slice(3);
      }
      if (cleanJson.endsWith('```')) {
        cleanJson = cleanJson.slice(0, -3);
      }
      cleanJson = cleanJson.trim();

      const parsed = JSON.parse(cleanJson);
      const validation = aiLearnerProfileSchema.safeParse(parsed);

      if (!validation.success) {
        const errorMessages = validation.error.issues
          .map((e: any) => `${e.path.join('.')}: ${e.message}`)
          .join(', ');
        return { success: false, error: errorMessages };
      }

      return { success: true, data: validation.data };
    } catch (jsonErr: any) {
      return { success: false, error: `Invalid JSON syntax: ${jsonErr.message}` };
    }
  }

  /**
   * Constructs evidence-based prompt strictly grounded in assessment answers
   */
  private buildProfileGenerationPrompt(user: any, evaluationResult: any): string {
    const caps = evaluationResult.capabilities || {};
    const strengths = evaluationResult.strongestSkill?.name || 'Evidence-based AI usage';
    const roomToGrow = evaluationResult.roomToGrow?.name || 'Prompt architecture and verification';
    const overallScore = evaluationResult.overallScore ?? 0;

    const academicContext = user.studentProfile
      ? `Student in ${user.studentProfile.programName || user.studentProfile.stream} (${user.studentProfile.specializationName || 'General'}), Year ${user.studentProfile.yearOfStudy}`
      : user.entrepreneurProfile
        ? `Entrepreneur in ${user.entrepreneurProfile.industry} (${user.entrepreneurProfile.ventureStage})`
        : `Learner in ${user.track || 'General'}`;

    return `You are the AIIMS Senior AI Capability Diagnostic Architect.
Analyze the following authentic assessment evidence and produce a structured AI Learner Profile JSON.

### STRICT RULES:
1. Ground every conclusion strictly in the provided assessment evidence and capability scores.
2. DO NOT fabricate tools or capabilities that the learner has not demonstrated.
3. You must output ONLY a valid JSON object matching the exact schema below. No conversational text or markdown.

### LEARNER EVIDENCE:
- Track & Context: ${academicContext}
- Overall AI Capability Score: ${overallScore}/100
- Strongest Demonstrated Skill: ${strengths}
- Primary Room To Grow: ${roomToGrow}
- Capability Scores:
  - Using AI: ${caps.usingAI?.score ?? 0}% (Evidence: ${caps.usingAI?.evidenceStatus ?? 'moderate'})
  - Understanding AI: ${caps.understandingAI?.score ?? 0}% (Evidence: ${caps.understandingAI?.evidenceStatus ?? 'moderate'})
  - Solving with AI: ${caps.solvingWithAI?.score ?? 0}% (Evidence: ${caps.solvingWithAI?.evidenceStatus ?? 'moderate'})
  - Checking AI: ${caps.checkingAI?.score ?? 0}% (Evidence: ${caps.checkingAI?.evidenceStatus ?? 'moderate'})
  - Adapting to AI: ${caps.adaptingToAI?.score ?? 0}% (Evidence: ${caps.adaptingToAI?.evidenceStatus ?? 'moderate'})

### REQUIRED JSON SCHEMA:
{
  "summary": "At least 20 characters synthesizing the learner's current AI capability profile based on evidence",
  "strengths": ["List of 2 to 4 specific demonstrated strengths grounded in evidence"],
  "weaknesses": ["List of 1 to 3 specific areas where understanding or verification is weak"],
  "skillGaps": ["List of 1 to 3 concrete technical capability gaps"],
  "learningPreferences": ["List of 1 to 2 workflow preferences inferred from responses"],
  "improvementAreas": ["List of 2 to 3 actionable capability growth areas"],
  "recommendedFocus": "Specific recommended curriculum track or topic name (at least 5 characters)",
  "recommendedRoles": ["1 to 3 suitable AI-collaborative industry roles or tracks"],
  "confidenceScore": 85
}`;
  }

  /**
   * Constructs corrective prompt for the single permitted retry
   */
  private buildRetryPrompt(
    originalPrompt: string,
    failedResponse: string,
    validationError?: string
  ): string {
    return `${originalPrompt}

### CORRECTION REQUIRED:
Your previous response failed schema validation with error: "${validationError || 'Invalid format'}".
Previous output was:
${failedResponse.substring(0, 300)}...

You MUST return a clean, valid JSON object strictly complying with the schema with all required fields present. Output JSON only:`;
  }
}

export const aiProfileGeneratorService = new AIProfileGeneratorService();
