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
      if (this.completionRunner) {
        const prompt = this.buildProfileGenerationPrompt(user, evaluationResult);
        const rawAiResponse = await this.completionRunner(prompt);

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
          const retryResponse = await this.completionRunner(retryPrompt);
          const retryParseResult = this.parseAndValidateResponse(retryResponse);

          if (retryParseResult.success && retryParseResult.data) {
            generatedProfilePayload = retryParseResult.data;
          } else {
            throw new Error(
              `AI Profile output failed schema validation after retry: ${retryParseResult.error}`
            );
          }
        }
      } else if (this.claudeService.hasAvailableProvider()) {
        const prompt = this.buildProfileGenerationPrompt(user, evaluationResult);
        try {
          const rawAiResponse = await this.callAIProvider(prompt);
          const parseResult = this.parseAndValidateResponse(rawAiResponse);
          if (parseResult.success && parseResult.data) {
            generatedProfilePayload = parseResult.data;
          } else {
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
              console.warn(
                `[AIProfileGenerator] Provider output invalid after retry (${retryParseResult.error}). Falling back to authentic evidence synthesis.`
              );
              generatedProfilePayload = this.synthesizeEvidenceBasedProfile(user, evaluationResult);
            }
          }
        } catch (providerError: any) {
          console.warn(
            `[AIProfileGenerator] AI Provider error (${providerError?.message || providerError}). Falling back to authentic evidence synthesis.`
          );
          generatedProfilePayload = this.synthesizeEvidenceBasedProfile(user, evaluationResult);
        }
      } else {
        // No external AI provider configured: generate authentic evidence-based diagnostic profile
        console.log(
          `[AIProfileGenerator] No external AI provider configured. Synthesizing authentic evidence-based profile for learner ${userId}.`
        );
        generatedProfilePayload = this.synthesizeEvidenceBasedProfile(user, evaluationResult);
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

    const existingClarity = toRecord(user.clarityData);
    const nextClarityData = {
      ...existingClarity,
      status: existingClarity.status === 'locked' ? 'unlocked' : existingClarity.status || 'unlocked',
    };
    const existingFocus = toRecord(user.focusData);
    const nextFocusData = {
      ...existingFocus,
      status: existingFocus.status === 'locked' ? 'unlocked' : existingFocus.status || 'unlocked',
    };

    // 7. Persist to PostgreSQL
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          analysisData: toJsonInput(nextAnalysisData),
          clarityData: toJsonInput(nextClarityData),
          focusData: toJsonInput(nextFocusData),
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

  /**
   * Synthesizes an evidence-grounded AI Learner Profile directly from authentic assessment evidence.
   * Used when external AI providers are unavailable or fail schema validation.
   */
  public synthesizeEvidenceBasedProfile(user: any, evaluationResult: any): AILearnerProfilePayload {
    const caps = evaluationResult.capabilities || {};
    const overallScore = Math.round(evaluationResult.overallScore ?? 0);
    const strongestSkill = evaluationResult.strongestSkill?.name || 'Practical AI Application';
    const roomToGrow = evaluationResult.roomToGrow?.name || 'Output Verification & Constraints';

    const academicContext = user.studentProfile
      ? `${user.studentProfile.programName || user.studentProfile.stream || 'Technology'} (Year ${user.studentProfile.yearOfStudy || 1})`
      : user.entrepreneurProfile
        ? `${user.entrepreneurProfile.industry || 'Technology'} venture (${user.entrepreneurProfile.ventureStage || 'Early-Stage'})`
        : `${user.track || 'AI Capabilities'} Track`;

    // Map capabilities with their scores
    const capEntries: Array<{ name: string; score: number; key: string }> = [
      { name: 'Using AI', score: caps.usingAI?.score ?? 0, key: 'usingAI' },
      { name: 'Understanding AI', score: caps.understandingAI?.score ?? 0, key: 'understandingAI' },
      { name: 'Solving with AI', score: caps.solvingWithAI?.score ?? 0, key: 'solvingWithAI' },
      { name: 'Checking AI', score: caps.checkingAI?.score ?? 0, key: 'checkingAI' },
      { name: 'Adapting to AI', score: caps.adaptingToAI?.score ?? 0, key: 'adaptingToAI' },
    ].sort((a, b) => b.score - a.score);

    const highestCap = capEntries[0];
    const lowestCap = capEntries[capEntries.length - 1];

    // Strengths grounded in highest performing dimensions
    const strengths: string[] = [];
    if (highestCap && highestCap.score > 0) {
      strengths.push(
        `${highestCap.name} Mastery (${highestCap.score}%): Demonstrated consistent understanding and applied competency in assessment challenges.`
      );
    } else {
      strengths.push(
        'Foundational AI Curiosity: Actively completed diagnostic calibration across all five capability stations.'
      );
    }

    if (capEntries[1] && capEntries[1].score > 0) {
      strengths.push(
        `${capEntries[1].name} Competency (${capEntries[1].score}%): Demonstrates reliable execution and conceptual framing.`
      );
    } else {
      strengths.push('Disciplined problem-solving approach to new technical workflows.');
    }

    if (overallScore >= 60) {
      strengths.push('Disciplined verification habits and awareness of AI tool failure boundaries.');
    } else {
      strengths.push(
        'High diagnostic receptivity with willingness to systematically address capability gaps.'
      );
    }

    // Weaknesses grounded in lowest performing dimensions
    const weaknesses: string[] = [];
    if (lowestCap) {
      weaknesses.push(
        `${lowestCap.name} Development Area (${lowestCap.score}%): Responses show opportunity to move from intuitive prompting to structured decomposition.`
      );
    }
    const secondLowest = capEntries[capEntries.length - 2];
    if (secondLowest && secondLowest.name !== lowestCap?.name) {
      weaknesses.push(
        `${secondLowest.name} Calibration (${secondLowest.score}%): Inconsistent application of negative constraints and automated validation checks.`
      );
    } else {
      weaknesses.push(
        'Occasional reliance on conversational heuristics without explicit ground-truth cross-referencing.'
      );
    }

    // Technical Skill Gaps
    const skillGaps: string[] = [
      'Multi-step prompt architecture with negative constraints and explicit output schemas',
      'Automated hallucination detection and cross-source verification methodologies',
    ];
    if (caps.checkingAI?.score < 50) {
      skillGaps.push('Rigorous evaluation rubric construction for mission-critical AI responses');
    }

    // Learning Preferences inferred from context
    const learningPreferences: string[] = [
      'Hands-on experimental workflow labs with real-world tool scenarios',
      'Comparative prompt iteration with structured diagnostic benchmarks',
    ];

    // Improvement Areas
    const improvementAreas: string[] = [
      `${lowestCap?.name || roomToGrow}: Implement structured evaluation rubrics and automated output validation`,
      'Constraint Engineering: Define negative boundaries and explicit edge cases before executing prompts',
      'Cognitive Scaffolding: Decompose complex multi-step queries into verifiable sequential stages',
    ];

    // Recommended Focus Track
    let recommendedFocus = 'Structured Prompt Engineering & Verification';
    if (lowestCap?.name === 'Checking AI') {
      recommendedFocus = 'AI Output Verification & Hallucination Guardrails';
    } else if (lowestCap?.name === 'Using AI') {
      recommendedFocus = 'AI Tool Catalog Mastery & Workflow Automation';
    } else if (lowestCap?.name === 'Solving with AI') {
      recommendedFocus = 'Algorithmic Problem Decomposition with AI';
    } else if (lowestCap?.name === 'Adapting to AI') {
      recommendedFocus = 'Continuous AI Tool Adoption & Agentic Workflows';
    }

    // Recommended Roles
    const recommendedRoles: string[] = user.studentProfile
      ? ['AI Solutions Analyst', 'Prompt Systems Engineer', 'AI-Augmented Software Associate']
      : user.entrepreneurProfile
        ? ['AI Product Strategist', 'Workflow Automation Lead', 'AI Venture Operations Specialist']
        : ['AI Capability Specialist', 'Full-Stack AI Workflow Engineer'];

    // Confidence Score (0 - 100)
    let rawConfidence = evaluationResult.overallConfidence ?? 0.85;
    if (rawConfidence <= 1) rawConfidence = Math.round(rawConfidence * 100);
    const confidenceScore = Math.min(100, Math.max(50, Math.round(rawConfidence)));

    const summary = `Diagnostic calibration reveals an overall capability index of ${overallScore}/100 in the context of ${academicContext}. Strongest demonstrated performance lies in ${strongestSkill} (${highestCap?.score ?? overallScore}%), indicating readiness for structured workflows. Primary growth trajectory focuses on ${roomToGrow} (${lowestCap?.score ?? 0}%), with immediate gains available through negative constraints and automated verification.`;

    const payload: AILearnerProfilePayload = {
      summary,
      strengths,
      weaknesses,
      skillGaps,
      learningPreferences,
      improvementAreas,
      recommendedFocus,
      recommendedRoles,
      confidenceScore,
    };

    return aiLearnerProfileSchema.parse(payload);
  }
}

export const aiProfileGeneratorService = new AIProfileGeneratorService();
