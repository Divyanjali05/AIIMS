/**
 * promptToolAnalysis.ts
 * ============================================================================
 * Pure, deterministic prompt analysis and AI tool matching service for AIIMS.
 *
 * NOTE ON PROMPT EFFICIENCY SCORING:
 * This score measures prompt structural completeness, specificity, and prompt
 * engineering best practices (context, role, constraints, formatting, and pacing).
 * It evaluates the quality of the prompt instructions, NOT guaranteed AI output quality.
 *
 * PRIVACY & SAFETY INVARIANTS:
 * - Runs 100% in the browser (zero network calls, zero AI provider requests).
 * - Zero storage persistence (never writes to localStorage, sessionStorage, or IndexedDB).
 * - Zero telemetry or analytics tracking of prompt content.
 * ============================================================================
 */

import { AITool } from '../types';

// ============================================================================
// 1. SCORING CONSTANTS & RUBRIC WEIGHTS
// ============================================================================

export const PROMPT_SCORING_WEIGHTS = {
  ACTION_VERB: 15,
  CONTEXT: 15,
  ROLE_AUDIENCE: 10,
  OUTPUT_FORMAT: 15,
  CONSTRAINTS: 15,
  EXAMPLES: 10,
  REASONABLE_LENGTH: 20,
} as const;

export const MAX_TOTAL_SCORE = 100;

export const LENGTH_THRESHOLDS = {
  TOO_SHORT_MAX: 19, // 0 - 19 chars -> 0 pts
  MINIMAL_MAX: 60, // 20 - 60 chars -> 8 pts
  MODERATE_MAX: 150, // 61 - 150 chars -> 14 pts
  OPTIMAL_MAX: 1200, // 151 - 1200 chars -> 20 pts
  LONG_MAX: 2000, // 1201 - 2000 chars -> 16 pts
  // 2001+ chars -> 12 pts (penalize extreme unconstrained verbosity)
} as const;

// Patterns for Clear Action Verbs
const ACTION_VERB_REGEX =
  /\b(analyze|generate|create|write|explain|summarize|refactor|design|build|classify|compare|evaluate|debug|optimize|translate|extract|calculate|implement|identify|draft|develop|test|formulate|synthesize|audit|review)\b/i;

// Patterns for Context / Background
const CONTEXT_INDICATOR_REGEX =
  /\b(context|background|scenario|use case|situation|working on|we are building|i am working on|our goal is|the problem is|given that|suppose that|project involves|objective is|for the purpose of)\b/i;

// Patterns for Target Role or Persona / Audience
const ROLE_AUDIENCE_REGEX =
  /\b(act as|you are an?|role:|persona:|as an expert|as a senior|audience:|target audience|for beginners|for students|for developers|for executives|for kids|explain to|from the perspective of)\b/i;

// Patterns for Output Format
const OUTPUT_FORMAT_REGEX =
  /\b(format|output|markdown|json|table|bullet points?|numbered list|csv|code snippet|yaml|html|step-by-step|as a list|in a table|in paragraphs?|headers?|schema:|columns?)\b/i;

// Patterns for Constraints & Negative Boundaries
const CONSTRAINTS_REGEX =
  /\b(do not|must not|don't|limit to|maximum of|at most|under \d+|concise|strictly|without using|tone:|avoid|keep it under|no more than|only include|restrictions?|constraints?|requirements?)\b/i;

// Patterns for Few-Shot Examples
const EXAMPLES_REGEX =
  /\b(for example|e\.g\.|example:|examples:|such as|sample:|input:.*output:|sample input|here is an example)\b/i;

// ============================================================================
// 2. TYPES AND INTERFACES
// ============================================================================

export type PromptGrade = 'Needs Improvement' | 'Fair' | 'Good' | 'Excellent';

export interface CriterionDetail {
  score: number;
  maxScore: number;
  detected: boolean;
  evidence?: string;
  feedback: string;
}

export interface PromptScoreBreakdown {
  actionVerb: CriterionDetail;
  context: CriterionDetail;
  roleAudience: CriterionDetail;
  outputFormat: CriterionDetail;
  constraints: CriterionDetail;
  examples: CriterionDetail;
  lengthPacing: CriterionDetail;
}

export interface PromptAnalysisResult {
  totalScore: number;
  grade: PromptGrade;
  breakdown: PromptScoreBreakdown;
  detectedEvidence: string[];
  suggestions: string[];
  charCount: number;
  wordCount: number;
}

export type SupportedToolName =
  'ChatGPT' | 'Claude' | 'Gemini' | 'Perplexity' | 'Copilot' | 'Grok' | 'DeepSeek' | 'Meta AI';

export interface ToolRecommendationItem {
  tool: AITool;
  relevanceScore: number;
  explanation: string;
  category: string;
  isAlreadyInToolkit: boolean;
}

export interface ToolkitGapItem {
  category: string;
  title: string;
  description: string;
  suggestedAction: string;
}

export interface ToolSuggestionResult {
  recommendedTools: ToolRecommendationItem[];
  categoryGroups: Record<string, ToolRecommendationItem[]>;
  toolkitGaps: ToolkitGapItem[];
  totalMatches: number;
}

// ============================================================================
// 3. PROMPT EFFICIENCY SCORING (scorePrompt)
// ============================================================================

/**
 * Evaluates the structural efficiency of a user-provided prompt string.
 * Completely deterministic, client-side, zero network calls.
 */
export function scorePrompt(text: string): PromptAnalysisResult {
  const trimmed = (text || '').trim();
  const charCount = trimmed.length;
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;

  // Handle empty or whitespace-only prompt
  if (!trimmed) {
    return {
      totalScore: 0,
      grade: 'Needs Improvement',
      breakdown: {
        actionVerb: {
          score: 0,
          maxScore: PROMPT_SCORING_WEIGHTS.ACTION_VERB,
          detected: false,
          feedback:
            'Add a clear action verb at the start (e.g., "Analyze", "Generate", "Design", "Explain").',
        },
        context: {
          score: 0,
          maxScore: PROMPT_SCORING_WEIGHTS.CONTEXT,
          detected: false,
          feedback:
            'Provide relevant background or context explaining why or where this task will be used.',
        },
        roleAudience: {
          score: 0,
          maxScore: PROMPT_SCORING_WEIGHTS.ROLE_AUDIENCE,
          detected: false,
          feedback:
            'Specify an AI persona or target audience (e.g., "Act as a Senior Architect", "For beginners").',
        },
        outputFormat: {
          score: 0,
          maxScore: PROMPT_SCORING_WEIGHTS.OUTPUT_FORMAT,
          detected: false,
          feedback:
            'Define the desired output structure (e.g., JSON schema, Markdown table, bulleted list).',
        },
        constraints: {
          score: 0,
          maxScore: PROMPT_SCORING_WEIGHTS.CONSTRAINTS,
          detected: false,
          feedback:
            'Specify explicit boundaries or negative constraints (e.g., "Limit to 200 words", "Do not assume X").',
        },
        examples: {
          score: 0,
          maxScore: PROMPT_SCORING_WEIGHTS.EXAMPLES,
          detected: false,
          feedback:
            'Include a few-shot example or sample input/output to anchor expected response format.',
        },
        lengthPacing: {
          score: 0,
          maxScore: PROMPT_SCORING_WEIGHTS.REASONABLE_LENGTH,
          detected: false,
          feedback: 'Prompt is empty. Write an actionable instruction with context and details.',
        },
      },
      detectedEvidence: [],
      suggestions: [
        'Start with a strong directive action verb (e.g., "Generate a step-by-step audit plan").',
        'Add 2–3 sentences of domain context explaining your goal.',
        'Define constraints and format (e.g., "Limit to 3 bullets in a markdown table").',
      ],
      charCount: 0,
      wordCount: 0,
    };
  }

  const detectedEvidence: string[] = [];
  const suggestions: string[] = [];

  // Criterion 1: Action Verb (15 pts)
  const verbMatch = trimmed.match(ACTION_VERB_REGEX);
  let verbScore = 0;
  let verbFeedback = '';
  if (verbMatch) {
    const matchedVerb = verbMatch[0];
    const indexInWords = trimmed.slice(0, verbMatch.index).split(/\s+/).length;
    if (indexInWords <= 15) {
      verbScore = PROMPT_SCORING_WEIGHTS.ACTION_VERB; // 15 pts
      verbFeedback = `Strong action verb "${matchedVerb}" located near the start of the prompt.`;
    } else {
      verbScore = 8; // Present but deferred
      verbFeedback = `Action verb "${matchedVerb}" found, but moving it to the opening sentence clarifies intent faster.`;
    }
    detectedEvidence.push(`Action Verb: "${matchedVerb}"`);
  } else {
    verbScore = 0;
    verbFeedback =
      'Missing clear action verb. Start with explicit commands like "Analyze", "Write", "Refactor", or "Evaluate".';
    suggestions.push(
      'Add an explicit directive verb (e.g., "Analyze", "Generate", "Compare") at the opening.'
    );
  }

  // Criterion 2: Context / Background (15 pts)
  const hasContextKeywords = CONTEXT_INDICATOR_REGEX.test(trimmed);
  // Also check if text has sufficient clause depth beyond a simple single-sentence request
  const hasSubstantialPreamble =
    (trimmed.length > 70 && trimmed.includes(',')) || trimmed.includes('.');
  let contextScore = 0;
  let contextFeedback = '';
  if (hasContextKeywords || (hasSubstantialPreamble && trimmed.length > 120)) {
    if (hasContextKeywords && trimmed.length > 80) {
      contextScore = PROMPT_SCORING_WEIGHTS.CONTEXT; // 15 pts
      contextFeedback = 'Rich contextual background provides clear grounding for the model.';
      detectedEvidence.push('Context / Background cues detected');
    } else {
      contextScore = 8; // Moderate context
      contextFeedback =
        'Basic context detected; expanding background specifics will improve precision.';
      detectedEvidence.push('Basic context detected');
    }
  } else {
    contextScore = 0;
    contextFeedback =
      'No domain context found. Explain your project scenario or reasons to prevent generic answers.';
    suggestions.push(
      'Add 1–2 sentences explaining the project background, domain, or why this request is needed.'
    );
  }

  // Criterion 3: Target Role / Audience (10 pts)
  const roleMatch = trimmed.match(ROLE_AUDIENCE_REGEX);
  let roleScore = 0;
  let roleFeedback = '';
  if (roleMatch) {
    roleScore = PROMPT_SCORING_WEIGHTS.ROLE_AUDIENCE; // 10 pts
    roleFeedback = `Explicit persona/audience defined: "${roleMatch[0]}".`;
    detectedEvidence.push(`Role / Audience: "${roleMatch[0]}"`);
  } else {
    roleScore = 0;
    roleFeedback =
      'No role or target audience specified. Setting a persona calibrates tone, depth, and vocabulary.';
    suggestions.push(
      'Specify a persona or target audience (e.g., "Act as a Senior AI Architect", "Explain for non-technical users").'
    );
  }

  // Criterion 4: Output Format (15 pts)
  const formatMatch = trimmed.match(OUTPUT_FORMAT_REGEX);
  let formatScore = 0;
  let formatFeedback = '';
  if (formatMatch) {
    formatScore = PROMPT_SCORING_WEIGHTS.OUTPUT_FORMAT; // 15 pts
    formatFeedback = `Output structure defined with "${formatMatch[0]}".`;
    detectedEvidence.push(`Output Format: "${formatMatch[0]}"`);
  } else {
    formatScore = 0;
    formatFeedback =
      'No output structure specified. Requesting JSON, Markdown tables, or numbered lists prevents messy text walls.';
    suggestions.push(
      'Define output structure (e.g., "Format as a numbered markdown list with code snippets").'
    );
  }

  // Criterion 5: Constraints & Requirements (15 pts)
  const constraintMatch = trimmed.match(CONSTRAINTS_REGEX);
  let constraintScore = 0;
  let constraintFeedback = '';
  if (constraintMatch) {
    constraintScore = PROMPT_SCORING_WEIGHTS.CONSTRAINTS; // 15 pts
    constraintFeedback = `Explicit negative/boundary constraints identified: "${constraintMatch[0]}".`;
    detectedEvidence.push(`Constraint / Requirement: "${constraintMatch[0]}"`);
  } else {
    constraintScore = 0;
    constraintFeedback =
      'No negative constraints or limits found. Constraining length, style, or disallowed assumptions reduces hallucinations.';
    suggestions.push(
      'Add explicit constraints (e.g., "Limit response to 300 words; do not use external libraries").'
    );
  }

  // Criterion 6: Few-Shot Examples (10 pts)
  const exampleMatch = trimmed.match(EXAMPLES_REGEX);
  let exampleScore = 0;
  let exampleFeedback = '';
  if (exampleMatch) {
    exampleScore = PROMPT_SCORING_WEIGHTS.EXAMPLES; // 10 pts
    exampleFeedback = `Few-shot demonstration or sample provided: "${exampleMatch[0]}".`;
    detectedEvidence.push(`Example Demonstration: "${exampleMatch[0]}"`);
  } else {
    exampleScore = 0;
    exampleFeedback =
      'No examples provided. Showing 1 sample input/output dramatically improves consistency on structured tasks.';
    suggestions.push('Provide a sample input and expected output format (few-shot prompting).');
  }

  // Criterion 7: Reasonable Length & Pacing (20 pts)
  // Continuous partition without gaps:
  // [0..19] -> 0
  // [20..60] -> 8
  // [61..150] -> 14
  // [151..1200] -> 20
  // [1201..2000] -> 16
  // [2001..inf] -> 12
  let lengthScore = 0;
  let lengthFeedback = '';
  if (charCount <= LENGTH_THRESHOLDS.TOO_SHORT_MAX) {
    lengthScore = 0;
    lengthFeedback = `Prompt is only ${charCount} characters. Very short prompts lack sufficient guidance.`;
  } else if (charCount <= LENGTH_THRESHOLDS.MINIMAL_MAX) {
    lengthScore = 8;
    lengthFeedback = `Prompt is brief (${charCount} characters). Consider adding more specifics to avoid ambiguity.`;
  } else if (charCount <= LENGTH_THRESHOLDS.MODERATE_MAX) {
    lengthScore = 14;
    lengthFeedback = `Moderate prompt length (${charCount} characters, ${wordCount} words). Good foundation.`;
    detectedEvidence.push(`Adequate Length: ${charCount} chars`);
  } else if (charCount <= LENGTH_THRESHOLDS.OPTIMAL_MAX) {
    lengthScore = PROMPT_SCORING_WEIGHTS.REASONABLE_LENGTH; // 20 pts
    lengthFeedback = `Optimal prompt length (${charCount} characters, ${wordCount} words) with thorough specification.`;
    detectedEvidence.push(`Optimal Length: ${charCount} chars`);
  } else if (charCount <= LENGTH_THRESHOLDS.LONG_MAX) {
    lengthScore = 16;
    lengthFeedback = `Comprehensive prompt (${charCount} characters). Ensure key instructions remain prominent.`;
    detectedEvidence.push(`Comprehensive Length: ${charCount} chars`);
  } else {
    lengthScore = 12;
    lengthFeedback = `Very long prompt (${charCount} characters). Trim redundant repetition to prevent model attention degradation.`;
    detectedEvidence.push(`Length: ${charCount} chars (check for verbosity)`);
  }

  const totalScore = Math.min(
    MAX_TOTAL_SCORE,
    verbScore +
      contextScore +
      roleScore +
      formatScore +
      constraintScore +
      exampleScore +
      lengthScore
  );

  let grade: PromptGrade = 'Needs Improvement';
  if (totalScore >= 85) {
    grade = 'Excellent';
  } else if (totalScore >= 70) {
    grade = 'Good';
  } else if (totalScore >= 50) {
    grade = 'Fair';
  }

  return {
    totalScore,
    grade,
    breakdown: {
      actionVerb: {
        score: verbScore,
        maxScore: PROMPT_SCORING_WEIGHTS.ACTION_VERB,
        detected: verbScore > 0,
        evidence: verbMatch ? verbMatch[0] : undefined,
        feedback: verbFeedback,
      },
      context: {
        score: contextScore,
        maxScore: PROMPT_SCORING_WEIGHTS.CONTEXT,
        detected: contextScore > 0,
        feedback: contextFeedback,
      },
      roleAudience: {
        score: roleScore,
        maxScore: PROMPT_SCORING_WEIGHTS.ROLE_AUDIENCE,
        detected: roleScore > 0,
        evidence: roleMatch ? roleMatch[0] : undefined,
        feedback: roleFeedback,
      },
      outputFormat: {
        score: formatScore,
        maxScore: PROMPT_SCORING_WEIGHTS.OUTPUT_FORMAT,
        detected: formatScore > 0,
        evidence: formatMatch ? formatMatch[0] : undefined,
        feedback: formatFeedback,
      },
      constraints: {
        score: constraintScore,
        maxScore: PROMPT_SCORING_WEIGHTS.CONSTRAINTS,
        detected: constraintScore > 0,
        evidence: constraintMatch ? constraintMatch[0] : undefined,
        feedback: constraintFeedback,
      },
      examples: {
        score: exampleScore,
        maxScore: PROMPT_SCORING_WEIGHTS.EXAMPLES,
        detected: exampleScore > 0,
        evidence: exampleMatch ? exampleMatch[0] : undefined,
        feedback: exampleFeedback,
      },
      lengthPacing: {
        score: lengthScore,
        maxScore: PROMPT_SCORING_WEIGHTS.REASONABLE_LENGTH,
        detected: lengthScore >= 14,
        feedback: lengthFeedback,
      },
    },
    detectedEvidence,
    suggestions,
    charCount,
    wordCount,
  };
}

// ============================================================================
// 4. EXPLICIT TOOL DETECTION (detectTool)
// ============================================================================

const TOOL_DETECTION_PATTERNS: { name: SupportedToolName; regex: RegExp }[] = [
  {
    name: 'ChatGPT',
    regex: /\b(chatgpt|chat-gpt|chat gpt|gpt-4o|gpt-4|gpt-3\.5|gpt4|gpt3)\b/i,
  },
  {
    name: 'Claude',
    regex: /\b(claude|claude-3|claude-3\.5|claude sonnet|sonnet|opus|haiku|anthropic claude)\b/i,
  },
  {
    name: 'Gemini',
    regex: /\b(gemini|gemini-pro|gemini-flash|gemini-ultra|gemini 1\.5|google bard|bard)\b/i,
  },
  {
    name: 'Perplexity',
    regex: /\b(perplexity|perplexity ai|pplx)\b/i,
  },
  {
    name: 'Copilot',
    regex: /\b(github copilot|microsoft copilot|copilot)\b/i,
  },
  {
    name: 'Grok',
    regex: /\b(grok|grok-2|grok-1|xai grok)\b/i,
  },
  {
    name: 'DeepSeek',
    regex: /\b(deepseek|deepseek-r1|deepseek-v3|deepseek coder|deepseek-ai)\b/i,
  },
  {
    // Do not treat every generic mention of "llama" as Meta AI. Only explicit Meta AI or Llama 3.x
    name: 'Meta AI',
    regex: /\b(meta ai|meta-ai|llama-3|llama 3|llama 3\.1|llama 3\.2|llama 3\.3)\b/i,
  },
];

/**
 * Recognizes explicitly named AI tools and known aliases within prompt text.
 * Independent of catalogue lookup. Returns canonical name or null.
 */
export function detectTool(text: string): SupportedToolName | null {
  if (!text || !text.trim()) return null;
  const lower = text.toLowerCase();

  for (const item of TOOL_DETECTION_PATTERNS) {
    if (item.regex.test(lower)) {
      return item.name;
    }
  }

  return null;
}

// ============================================================================
// 5. TOOL RECOMMENDATION & GAP ANALYSIS (suggestTools)
// ============================================================================

interface CapabilityKeywordMapping {
  keywords: RegExp;
  category: string;
  explanation: string;
}

const CAPABILITY_MAPPINGS: CapabilityKeywordMapping[] = [
  {
    keywords:
      /\b(code|coding|refactor|debug|typescript|javascript|python|react|frontend|backend|api|sql|database|repository)\b/i,
    category: 'Development & Coding',
    explanation: 'Detected programming, refactoring, and software engineering tasks.',
  },
  {
    keywords:
      /\b(research|citations?|sources?|literature|fact[- ]check|verified|papers?|academic|news|current events)\b/i,
    category: 'Research & Verification',
    explanation: 'Detected research, citation grounding, and fact-checking requirements.',
  },
  {
    keywords:
      /\b(math|logic|reasoning|algorithm|proof|complex problem|derivation|step-by-step thinking)\b/i,
    category: 'Deep Reasoning & Math',
    explanation: 'Detected advanced reasoning, mathematical derivation, or step-by-step logic.',
  },
  {
    keywords: /\b(image|video|audio|voice|speech|design|thumbnail|graphic|poster|visual|avatar)\b/i,
    category: 'Media & Visual Design',
    explanation: 'Detected visual media, audio synthesis, or creative design generation.',
  },
  {
    keywords:
      /\b(document|pdf|summarize|meeting|notes|synthesis|transcribe|report|presentation|deck)\b/i,
    category: 'Document & Knowledge Synthesis',
    explanation: 'Detected document analysis, PDF synthesis, and knowledge extraction.',
  },
];

/**
 * Suggests best-fit AI tools from the active AIIMS catalogue based on prompt tasks and keywords.
 * Computes relevance scores, identifies category groupings, and notes toolkit gaps.
 * Does NOT modify wallet records or invoke backend mutation APIs.
 */
export function suggestTools(
  text: string,
  catalog: AITool[],
  userToolIds: string[] | Set<string>
): ToolSuggestionResult {
  const query = (text || '').trim().toLowerCase();
  const userSet = userToolIds instanceof Set ? userToolIds : new Set(userToolIds || []);

  if (!query || !catalog || catalog.length === 0) {
    return {
      recommendedTools: [],
      categoryGroups: {},
      toolkitGaps: [],
      totalMatches: 0,
    };
  }

  // Detect capability requirements from the prompt
  const detectedCapabilities = CAPABILITY_MAPPINGS.filter((m) => m.keywords.test(query));

  // Score each catalog tool
  const scoredTools: ToolRecommendationItem[] = [];

  for (const tool of catalog) {
    let score = 0;
    const reasons: string[] = [];

    const toolName = (tool.name || '').toLowerCase();
    const toolDesc = (tool.description || '').toLowerCase();
    const toolCat = (tool.category || '').toLowerCase();
    const toolTasks = (tool.tasks || []).map((t) => t.toLowerCase());
    const toolCapabilities = (tool.capabilities || []).map((c) => c.toLowerCase());
    const toolStrengths = (tool.strengths || []).map((s) => s.toLowerCase());
    const toolDomains = (tool.domains || []).map((d) => d.toLowerCase());

    // 1. Direct tool name match in prompt (+40 pts)
    if (toolName && query.includes(toolName)) {
      score += 40;
      reasons.push(`Direct mention of "${tool.name}" in prompt.`);
    }

    // 2. Capability keyword matches (+15 pts per match)
    for (const cap of detectedCapabilities) {
      const matchInCat = toolCat.includes(cap.category.toLowerCase());
      const matchInDesc = cap.keywords.test(toolDesc);
      const matchInTasks = toolTasks.some((t) => cap.keywords.test(t));
      const matchInCapabilities = toolCapabilities.some((c) => cap.keywords.test(c));
      const matchInStrengths = toolStrengths.some((s) => cap.keywords.test(s));
      const matchInDomains = toolDomains.some((d) => cap.keywords.test(d));

      if (
        matchInCat ||
        matchInDesc ||
        matchInTasks ||
        matchInCapabilities ||
        matchInStrengths ||
        matchInDomains
      ) {
        score += 25;
        reasons.push(cap.explanation);
      }
    }

    // 3. Free or Freemium bonus (+5 pts for student accessibility)
    const isFree =
      tool.pricingDetails?.freeTierAvailable ||
      tool.pricingDetails?.type === 'FREE' ||
      tool.pricingDetails?.type === 'FREEMIUM' ||
      (tool.pricing || '').toLowerCase().includes('free');
    if (isFree) {
      score += 5;
    }

    // 4. Verified badge bonus (+5 pts)
    const isVerified =
      (tool.verificationStatus as string) === 'VERIFIED' ||
      tool.pricingDetails?.verified ||
      Boolean(tool.lastVerifiedAt);
    if (isVerified) {
      score += 5;
    }

    if (score >= 20) {
      const categoryLabel = tool.category || 'General AI';
      scoredTools.push({
        tool,
        relevanceScore: Math.min(100, score),
        explanation:
          reasons.length > 0
            ? reasons.slice(0, 2).join(' ')
            : `Matches task requirements for ${categoryLabel}.`,
        category: categoryLabel,
        isAlreadyInToolkit: userSet.has(tool.id),
      });
    }
  }

  // Sort tools by relevance score descending, then prioritize tools not yet in toolkit
  scoredTools.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    // If scores tie, recommend tools the user doesn't have yet
    if (a.isAlreadyInToolkit !== b.isAlreadyInToolkit) {
      return a.isAlreadyInToolkit ? 1 : -1;
    }
    return a.tool.name.localeCompare(b.tool.name);
  });

  // Limit to top 8 recommendations to keep UI focused
  const topRecommendations = scoredTools.slice(0, 8);

  // Group by category
  const categoryGroups: Record<string, ToolRecommendationItem[]> = {};
  for (const item of topRecommendations) {
    if (!categoryGroups[item.category]) {
      categoryGroups[item.category] = [];
    }
    categoryGroups[item.category].push(item);
  }

  // Identify toolkit gaps: capabilities requested by the prompt that user currently lacks in their wallet
  const toolkitGaps: ToolkitGapItem[] = [];

  for (const cap of detectedCapabilities) {
    // Check if the user has any tool in their toolkit that addresses this capability
    const userHasToolInCap = catalog.some(
      (t) =>
        userSet.has(t.id) &&
        (t.category?.toLowerCase().includes(cap.category.toLowerCase()) ||
          cap.keywords.test(t.description || '') ||
          (t.capabilities || []).some((c) => cap.keywords.test(c)))
    );

    if (!userHasToolInCap) {
      toolkitGaps.push({
        category: cap.category,
        title: `No ${cap.category} tool in your toolkit`,
        description: `Your prompt requests ${cap.category.toLowerCase()} tasks, but you have no tool in your AI Wallet configured for this capability.`,
        suggestedAction: `Consider exploring top-rated tools in ${cap.category} to accelerate this workflow.`,
      });
    }
  }

  return {
    recommendedTools: topRecommendations,
    categoryGroups,
    toolkitGaps,
    totalMatches: scoredTools.length,
  };
}
