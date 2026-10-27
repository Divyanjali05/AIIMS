/**
 * rubric.config.ts
 *
 * Central configuration for evaluation rubric criteria.
 * Every criterion must receive an integer score from 1 to 5.
 * Submitting feedback requires all configured criteria to be scored and
 * a non-empty written feedback string.
 */

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  minScore: number;
  maxScore: number;
}

export const RUBRIC_CRITERIA: RubricCriterion[] = [
  {
    id: 'accuracy',
    name: 'Accuracy & Correctness',
    description:
      'Precision of solution, technical correctness, and factual consistency with requirements.',
    minScore: 1,
    maxScore: 5,
  },
  {
    id: 'critical_thinking',
    name: 'Critical Thinking & Reasoning',
    description:
      'Depth of analytical reasoning, problem formulation, trade-off analysis, and risk mitigation.',
    minScore: 1,
    maxScore: 5,
  },
  {
    id: 'clarity',
    name: 'Clarity & Communication',
    description:
      'Logical structure, readability, precision of prompt wording, and actionable documentation.',
    minScore: 1,
    maxScore: 5,
  },
  {
    id: 'ai_application',
    name: 'Practical AI Application',
    description:
      'Effectiveness of model context utilization, constraint handling, and workflow efficiency.',
    minScore: 1,
    maxScore: 5,
  },
];

export interface RubricValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates that all criteria in the rubric are scored with integer values between 1 and 5,
 * and that writtenFeedback is present and non-empty.
 */
export function validateRubricEvaluation(
  rubricScores: Record<string, any> | undefined,
  writtenFeedback: string | undefined
): RubricValidationResult {
  if (
    !writtenFeedback ||
    typeof writtenFeedback !== 'string' ||
    writtenFeedback.trim().length === 0
  ) {
    return {
      valid: false,
      error: 'Written feedback is required and cannot be empty.',
    };
  }

  if (!rubricScores || typeof rubricScores !== 'object') {
    return {
      valid: false,
      error: 'Rubric scores object is required.',
    };
  }

  for (const criterion of RUBRIC_CRITERIA) {
    const score = rubricScores[criterion.id];
    if (score === undefined || score === null) {
      return {
        valid: false,
        error: `Missing score for rubric criterion '${criterion.id}' (${criterion.name}). All criteria must be scored.`,
      };
    }

    if (
      typeof score !== 'number' ||
      !Number.isInteger(score) ||
      score < criterion.minScore ||
      score > criterion.maxScore
    ) {
      return {
        valid: false,
        error: `Invalid score for '${criterion.id}'. Score must be an integer between ${criterion.minScore} and ${criterion.maxScore} (received ${score}).`,
      };
    }
  }

  return { valid: true };
}
