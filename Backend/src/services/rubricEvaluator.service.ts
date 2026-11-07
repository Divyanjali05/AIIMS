import { z } from 'zod';
import { claudeService, ClaudeService } from './anthropic/claude.service';

export interface RubricCriterionInput {
  criterion: string;
  maxScore: number;
  description: string;
}

export interface QuestionInfo {
  title: string;
  promptText: string;
  testScenario?: string;
  expectedCriteria?: string[];
}

export interface EvaluateAnswerParams {
  question: QuestionInfo;
  rubric: RubricCriterionInput[];
  learnerAnswer: string;
  completionRunner?: (prompt: string) => Promise<string>;
}

export interface EvaluatedCriterion {
  criterion: string;
  score: number;
  maxScore: number;
  feedback: string;
}

export interface RubricEvaluationResult {
  overallScore: number;
  criteria: EvaluatedCriterion[];
  overallFeedback: string;
  evaluationSource: 'AI' | 'EMPTY_SUBMISSION' | 'MOCK';
}

export class RubricEvaluationError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code = 'RUBRIC_EVALUATION_FAILED', details?: any) {
    super(message);
    this.name = 'RubricEvaluationError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Zod schema validating LLM-generated rubric criteria and overall evaluation.
 */
export const evaluatedCriterionSchema = z.object({
  criterion: z.string().trim().min(1, 'Criterion name cannot be empty'),
  score: z.number().int('Score must be an integer').min(0, 'Score cannot be negative'),
  maxScore: z.number().int('Max score must be an integer').min(1, 'Max score must be at least 1'),
  feedback: z.string().default(''),
});

export const rubricEvaluationResponseSchema = z.object({
  criteria: z
    .array(evaluatedCriterionSchema)
    .min(1, 'At least one criterion evaluation is required'),
  overallScore: z.number().int('Overall score must be an integer').min(0).max(100),
  overallFeedback: z.string().default(''),
});

export class RubricEvaluatorService {
  private claude: ClaudeService;
  private defaultRunner?: (prompt: string) => Promise<string>;

  constructor(customClaudeService?: ClaudeService) {
    this.claude = customClaudeService || claudeService;
  }

  /**
   * Allows setting a custom completion runner (e.g. for unit tests and mocks).
   */
  public setAICompletionRunner(runner?: (prompt: string) => Promise<string>): void {
    this.defaultRunner = runner;
  }

  /**
   * Evaluates a learner's submitted answer against explicit question rubric criteria.
   *
   * STRICT PRINCIPLES:
   * 1. Evaluates ONLY demonstrated evidence in what the learner actually wrote.
   * 2. Answer length is NEVER rewarded.
   *    - Concise, accurate answers receive full credit.
   *    - Long, repetitive, or fluffy answers receive low credit.
   *    - Empty or off-topic answers receive zero or near-zero credit.
   * 3. Response is strictly validated with Zod.
   * 4. Single retry on invalid JSON or schema parsing error.
   * 5. Clean RubricEvaluationError thrown if retry also fails.
   */
  public async evaluateAnswer(params: EvaluateAnswerParams): Promise<RubricEvaluationResult> {
    const { question, rubric, learnerAnswer } = params;
    const cleanAnswer = learnerAnswer ? learnerAnswer.trim() : '';

    // Guarantee non-empty rubric
    const effectiveRubric =
      rubric && rubric.length > 0
        ? rubric
        : [
            {
              criterion: 'Clarity & Goal Alignment',
              maxScore: 25,
              description: 'Directly and accurately addresses stated task objective.',
            },
            {
              criterion: 'Constraint Handling & Accuracy',
              maxScore: 25,
              description:
                'Complies with all scenario constraints and demonstrates factual accuracy.',
            },
            {
              criterion: 'Structure & Coherence',
              maxScore: 25,
              description: 'Presents logical, well-organized response without ambiguity.',
            },
            {
              criterion: 'Completeness & Reliability',
              maxScore: 25,
              description: 'Provides all required components and handles necessary edge cases.',
            },
          ];

    // 1. Immediate zero evaluation for empty / whitespace-only answers (Zero AI cost)
    if (cleanAnswer.length === 0) {
      return {
        overallScore: 0,
        criteria: effectiveRubric.map((r) => ({
          criterion: r.criterion,
          score: 0,
          maxScore: r.maxScore,
          feedback: 'No response text was submitted for this criterion.',
        })),
        overallFeedback:
          'No answer was submitted. Evidence of competence could not be demonstrated.',
        evaluationSource: 'EMPTY_SUBMISSION',
      };
    }

    // 2. Select completion runner
    const runner =
      params.completionRunner ||
      this.defaultRunner ||
      (this.claude.hasAvailableProvider()
        ? (p: string) =>
            this.claude.generateCompletion(p, { maxTokens: 1200, temperature: 0.1, jsonMode: true })
        : null);

    // If no AI runner or provider is available, throw clean structured error.
    // NEVER substitute keyword scoring, benchmark scoring, answer-length scoring or fabricated scores.
    if (!runner) {
      throw new RubricEvaluationError(
        'AI provider is unavailable or not configured. Cannot perform rubric evaluation.',
        'PROVIDER_UNAVAILABLE'
      );
    }

    // 3. Construct LLM Prompt
    const prompt = this.buildEvaluationPrompt(question, effectiveRubric, cleanAnswer);

    // Helper to categorize provider errors
    const resolveProviderErrorCode = (err: any): string => {
      const msg = (err?.message || '').toLowerCase();
      if (err?.status === 429 || msg.includes('429') || msg.includes('rate limit')) {
        return 'PROVIDER_RATE_LIMIT';
      }
      if (err?.name === 'TimeoutError' || msg.includes('timeout') || msg.includes('timed out')) {
        return 'PROVIDER_TIMEOUT';
      }
      if (
        msg.includes('auth') ||
        msg.includes('api key') ||
        msg.includes('unauthorized') ||
        err?.status === 401
      ) {
        return 'PROVIDER_INVALID_CREDENTIALS';
      }
      return 'PROVIDER_CALL_FAILED';
    };

    // 4. Attempt 1: Call completion runner
    let rawOutput: string = '';
    try {
      rawOutput = await runner(prompt);
    } catch (err: any) {
      throw new RubricEvaluationError(
        `AI provider completion failed: ${err.message || 'Network/service error'}`,
        resolveProviderErrorCode(err),
        err
      );
    }

    // Parse and validate with Zod and schema consistency
    const firstAttempt = this.parseAndValidate(rawOutput, effectiveRubric);
    if (firstAttempt.success) {
      return {
        overallScore: firstAttempt.data.overallScore,
        criteria: firstAttempt.data.criteria,
        overallFeedback: firstAttempt.data.overallFeedback,
        evaluationSource: this.defaultRunner || params.completionRunner ? 'MOCK' : 'AI',
      };
    }

    // 5. Attempt 2 (Retry once): Provide targeted error feedback to the model
    const retryPrompt = this.buildRetryPrompt(prompt, rawOutput, firstAttempt.error);
    let retryOutput: string = '';
    try {
      retryOutput = await runner(retryPrompt);
    } catch (err: any) {
      throw new RubricEvaluationError(
        `AI provider completion failed during retry: ${err.message || 'Network/service error'}`,
        resolveProviderErrorCode(err),
        err
      );
    }

    const secondAttempt = this.parseAndValidate(retryOutput, effectiveRubric);
    if (secondAttempt.success) {
      return {
        overallScore: secondAttempt.data.overallScore,
        criteria: secondAttempt.data.criteria,
        overallFeedback: secondAttempt.data.overallFeedback,
        evaluationSource: this.defaultRunner || params.completionRunner ? 'MOCK' : 'AI',
      };
    }

    // Persistent failure after retry: Fail with clean error. Never save fabricated or length scores!
    throw new RubricEvaluationError(
      `AI rubric evaluation failed schema validation after retry: ${secondAttempt.error}`,
      'VALIDATION_FAILED_AFTER_RETRY',
      { firstAttemptError: firstAttempt.error, secondAttemptError: secondAttempt.error }
    );
  }

  private buildEvaluationPrompt(
    question: QuestionInfo,
    rubric: RubricCriterionInput[],
    learnerAnswer: string
  ): string {
    const rubricCriteriaText = rubric
      .map(
        (r, idx) =>
          `${idx + 1}. CRITERION: "${r.criterion}" (Max Score: ${r.maxScore} points)\n   DESCRIPTION: ${r.description}`
      )
      .join('\n');

    const expectedText =
      question.expectedCriteria && question.expectedCriteria.length > 0
        ? `EXPECTED BENCHMARK CRITERIA:\n${question.expectedCriteria.map((c) => `- ${c}`).join('\n')}\n`
        : '';

    const scenarioText = question.testScenario
      ? `SCENARIO / WORKPLACE CONTEXT:\n"""\n${question.testScenario}\n"""\n`
      : '';

    return `You are the AIIMS Senior Rubric Assessment Evaluator.
Your responsibility is to grade the learner's submitted answer strictly and objectively against the explicit rubric.

QUESTION TITLE: ${question.title}
TASK INSTRUCTIONS: ${question.promptText}
${scenarioText}${expectedText}
EXPLICIT SCORING RUBRIC:
${rubricCriteriaText}

LEARNER'S SUBMITTED ANSWER:
"""
${learnerAnswer}
"""

STRICT EVALUATION INSTRUCTIONS:
1. Grade SOLELY on demonstrated evidence of competence in what the learner actually wrote.
2. DO NOT reward answer length:
   - A short, concise, accurate answer that directly satisfies the rubric MUST receive full or high credit.
   - A long, repetitive, rambling, or fluffy answer without substantive reasoning MUST NOT receive high credit.
   - An off-topic, gibberish, or irrelevant answer must receive 0 for unmet criteria.
3. For EACH criterion in the rubric, assign an integer score between 0 and its specified maxScore.
4. Provide a specific, constructive feedback sentence for each criterion explaining why the score was awarded based on evidence in the answer.
5. Provide a concise overall feedback summary (2-3 sentences) identifying confirmed strengths and actionable improvement areas.

Return ONLY a valid JSON object matching this exact schema:
{
  "criteria": [
    {
      "criterion": "<Exact criterion name>",
      "score": <integer from 0 to maxScore>,
      "maxScore": <maxScore>,
      "feedback": "<Specific factual explanation based on answer evidence>"
    }
  ],
  "overallScore": <integer from 0 to 100>,
  "overallFeedback": "<Concise overall summary of strengths and areas for improvement>"
}

Do not include markdown prose outside the JSON. Return valid JSON only.`;
  }

  private buildRetryPrompt(
    originalPrompt: string,
    failedOutput: string,
    validationError: string
  ): string {
    return `${originalPrompt}

CRITICAL CORRECTION REQUIRED:
Your previous response could not be accepted because it failed schema validation:
Error: ${validationError}

Your previous output was:
"""
${failedOutput.slice(0, 1500)}
"""

Please correct the formatting, ensure all numeric scores are integers within [0, maxScore], ensure all criteria are present, and return ONLY a valid JSON object.`;
  }

  /**
   * Cleans JSON output, parses it, validates with Zod, and ensures mathematical consistency.
   */
  private parseAndValidate(
    rawText: string,
    rubric: RubricCriterionInput[]
  ):
    | {
        success: true;
        data: { criteria: EvaluatedCriterion[]; overallScore: number; overallFeedback: string };
      }
    | { success: false; error: string } {
    if (!rawText || typeof rawText !== 'string') {
      return { success: false, error: 'Empty response received from AI completion runner.' };
    }

    let cleaned = rawText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: 'No JSON object found in response.' };
    }

    let parsedObj: any;
    try {
      parsedObj = JSON.parse(jsonMatch[0]);
    } catch (parseErr: any) {
      return { success: false, error: `JSON parse error: ${parseErr.message}` };
    }

    const zodResult = rubricEvaluationResponseSchema.safeParse(parsedObj);
    if (!zodResult.success) {
      const issueMsgs = zodResult.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      return { success: false, error: `Schema validation failed: ${issueMsgs}` };
    }

    const parsedData = zodResult.data;

    // Match criteria against rubric and enforce bounds (Strict: NEVER clamp! Reject invalid scores so retry fires):
    const validatedCriteria: EvaluatedCriterion[] = [];
    for (const r of rubric) {
      const matched = parsedData.criteria.find(
        (c) =>
          c.criterion.toLowerCase().trim() === r.criterion.toLowerCase().trim() ||
          c.criterion.toLowerCase().includes(r.criterion.toLowerCase()) ||
          r.criterion.toLowerCase().includes(c.criterion.toLowerCase())
      );

      if (!matched) {
        return {
          success: false,
          error: `Missing required rubric criterion in evaluation: "${r.criterion}"`,
        };
      }

      if (typeof matched.score !== 'number' || !Number.isInteger(matched.score)) {
        return {
          success: false,
          error: `Criterion "${r.criterion}" score must be an integer, got: ${matched.score}`,
        };
      }

      if (matched.score < 0 || matched.score > r.maxScore) {
        return {
          success: false,
          error: `Criterion "${r.criterion}" score ${matched.score} is out of bounds [0, ${r.maxScore}]`,
        };
      }

      validatedCriteria.push({
        criterion: r.criterion,
        score: matched.score,
        maxScore: r.maxScore,
        feedback:
          matched.feedback && matched.feedback.trim().length > 0
            ? matched.feedback.trim()
            : `Demonstrated ${r.criterion} at ${matched.score}/${r.maxScore}.`,
      });
    }

    // Compute mathematically consistent overall score (0 to 100)
    const totalEarned = validatedCriteria.reduce((sum, c) => sum + c.score, 0);
    const totalMax = validatedCriteria.reduce((sum, c) => sum + c.maxScore, 0);
    const computedOverall = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

    // Enforce mathematical consistency: overallScore must match sum of criteria within rounding tolerance (+-1)
    if (Math.abs(parsedData.overallScore - computedOverall) > 1) {
      return {
        success: false,
        error: `Overall score (${parsedData.overallScore}) is inconsistent with sum of rubric criteria (${totalEarned}/${totalMax} = ${computedOverall}%)`,
      };
    }

    return {
      success: true,
      data: {
        criteria: validatedCriteria,
        overallScore: computedOverall,
        overallFeedback:
          parsedData.overallFeedback && parsedData.overallFeedback.trim().length > 0
            ? parsedData.overallFeedback.trim()
            : `Evaluated ${validatedCriteria.length} criteria. Total score: ${computedOverall}/100.`,
      },
    };
  }
}

export const rubricEvaluatorService = new RubricEvaluatorService();
