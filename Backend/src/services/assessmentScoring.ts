/**
 * AINOVA Assessment Scoring Engine (Backend Copy)
 */

export type CapabilityKey = 'usingAI' | 'understandingAI' | 'solvingWithAI' | 'checkingAI' | 'adaptingToAI';

export interface OptionScoringDefinition {
  score: number;
  evidenceLevel: 'strong' | 'partial' | 'weak' | 'misunderstanding' | 'none' | 'preference';
  demonstration: string;
  relevance: string;
  accuracy: string;
}

export interface QuestionScoringRubric {
  questionId: number;
  title: string;
  type: 'single_select' | 'multi_select' | 'scale' | 'long_text';
  purpose: string;
  capabilityWeights: Record<CapabilityKey, number>;
  isPreference?: boolean;
  isAttitude?: boolean;
  options?: Record<string, OptionScoringDefinition>;
  scaleScoring?: (value: number) => OptionScoringDefinition;
  evaluateMultiSelect?: (selectedIds: string[]) => OptionScoringDefinition;
  deterministicTextFallback?: (text: string) => OptionScoringDefinition;
}

export interface QuestionScoreResult {
  questionId: number;
  questionType: string;
  rawAnswer: any;
  score: number;
  confidence: number;
  evidenceLevel: 'strong' | 'partial' | 'weak' | 'misunderstanding' | 'none' | 'preference';
  scoringMethod: 'question_rubric' | 'anthropic' | 'deterministic_fallback';
  reason: string;
  strengths?: string[];
  gaps?: string[];
  evidence?: string[];
  anthropicStatus?: 'evaluated' | 'unavailable' | 'not_applicable';
}

export interface CapabilityScoreResult {
  capabilityKey: CapabilityKey;
  capabilityName: string;
  score: number;
  confidence: number;
  evidenceStatus: 'robust' | 'moderate' | 'limited';
  contributingQuestionIds: number[];
  questionScores: Record<number, number>;
  scoringMethod: string;
  rubricVersion: string;
}

export interface AssessmentEvaluationResult {
  overallScore: number;
  capabilities: Record<CapabilityKey, CapabilityScoreResult>;
  legacyScores: {
    usageFrequency: number;
    evaluationCapability: number;
    workflowDesign: number;
    strategicVision: number;
    mentorshipReadiness: number;
  };
  questionResults: Record<number, QuestionScoreResult>;
  strongestSkill: { key: CapabilityKey; name: string; score: number };
  roomToGrow: { key: CapabilityKey; name: string; score: number };
  evaluatedAt: string;
  rubricVersion: string;
}

export const CAPABILITY_NAMES: Record<CapabilityKey, string> = {
  usingAI: 'Using AI',
  understandingAI: 'Understanding AI',
  solvingWithAI: 'Solving with AI',
  checkingAI: 'Checking AI',
  adaptingToAI: 'Adapting to AI'
};

export const ASSESSMENT_RUBRICS: Record<number, QuestionScoringRubric> = {
  1: {
    questionId: 1,
    title: 'How frequently do you currently use AI tools in your work or study?',
    type: 'single_select',
    purpose: 'Measures regularity and routine integration of AI tools into daily workflows.',
    capabilityWeights: { usingAI: 1.0, understandingAI: 0, solvingWithAI: 0.2, checkingAI: 0, adaptingToAI: 0 },
    options: {
      q1_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Seamlessly integrated AI into daily core workflow.', relevance: 'Directly answers frequency requirement.', accuracy: 'Accurately reflects active daily execution.' },
      q1_b: { score: 80, evidenceLevel: 'strong', demonstration: 'Regular consultation of AI for daily routine tasks.', relevance: 'Demonstrates frequent usage.', accuracy: 'Accurately reflects consistent usage.' },
      q1_c: { score: 50, evidenceLevel: 'partial', demonstration: 'Occasional task-specific AI usage.', relevance: 'Demonstrates moderate usage.', accuracy: 'Reflects intermittent integration.' },
      q1_d: { score: 25, evidenceLevel: 'weak', demonstration: 'Infrequent usage only when stuck.', relevance: 'Demonstrates minimal routine reliance.', accuracy: 'Reflects reactive usage.' },
      q1_e: { score: 0, evidenceLevel: 'none', demonstration: 'No active reliance or usage of AI tools.', relevance: 'Demonstrates complete lack of usage.', accuracy: 'Accurately indicates zero workflow integration.' }
    }
  },
  2: {
    questionId: 2,
    title: 'Which AI models or tools do you regularly interact with?',
    type: 'multi_select',
    purpose: 'Measures breadth and technical depth of tool usage.',
    capabilityWeights: { usingAI: 0.7, understandingAI: 0.3, solvingWithAI: 0, checkingAI: 0, adaptingToAI: 0.3 },
    evaluateMultiSelect: (selectedIds: string[]): OptionScoringDefinition => {
      if (!selectedIds || selectedIds.length === 0) {
        return { score: 0, evidenceLevel: 'none', demonstration: 'No tools selected.', relevance: 'No evidence.', accuracy: 'No evidence.' };
      }
      const hasDevTools = selectedIds.some((id) => id === 'q2_d' || id === 'q2_f');
      const hasSpecialized = selectedIds.some((id) => id === 'q2_b' || id === 'q2_e');
      const hasBasicChat = selectedIds.some((id) => id === 'q2_a' || id === 'q2_c');

      let score = 35;
      let level: 'strong' | 'partial' | 'weak' = 'weak';
      let demo = 'Demonstrates basic single-tool chatbot interaction.';

      if (hasDevTools && (hasSpecialized || hasBasicChat)) {
        score = 95;
        level = 'strong';
        demo = 'Demonstrates technical depth across coding assistants, custom APIs, and multimodal/reasoning models.';
      } else if (hasDevTools) {
        score = 85;
        level = 'strong';
        demo = 'Demonstrates technical tool usage including developer tools and APIs.';
      } else if (hasSpecialized && hasBasicChat) {
        score = 70;
        level = 'partial';
        demo = 'Demonstrates multi-tool usage across general chatbots and specialized models.';
      } else if (hasSpecialized) {
        score = 60;
        level = 'partial';
        demo = 'Demonstrates specialized tool usage beyond default search interfaces.';
      } else if (hasBasicChat && selectedIds.length > 1) {
        score = 50;
        level = 'partial';
        demo = 'Demonstrates standard multi-model chatbot usage.';
      }

      return { score, evidenceLevel: level, demonstration: demo, relevance: 'Evaluated tool diversity and technical sophistication.', accuracy: 'Accurately reflects depth.' };
    }
  },
  3: {
    questionId: 3,
    title: 'When starting a new assignment or project, what is your first instinct?',
    type: 'single_select',
    purpose: 'Measures problem-framing strategy: manual human reasoning combined with AI augmentation.',
    capabilityWeights: { usingAI: 0.5, understandingAI: 0.3, solvingWithAI: 1.0, checkingAI: 0, adaptingToAI: 0 },
    options: {
      q3_b: { score: 100, evidenceLevel: 'strong', demonstration: 'First-principles human framing followed by structured AI augmentation.', relevance: 'Demonstrates optimal human agency balance.', accuracy: 'Ideal problem solving architecture.' },
      q3_a: { score: 75, evidenceLevel: 'strong', demonstration: 'Immediate AI brainstorming and initial ideation.', relevance: 'High AI integration.', accuracy: 'Proactive tool usage.' },
      q3_c: { score: 40, evidenceLevel: 'weak', demonstration: 'Reliance on traditional web search engines before AI.', relevance: 'Lower AI integration.', accuracy: 'Legacy search paradigm.' },
      q3_d: { score: 20, evidenceLevel: 'weak', demonstration: 'Isolated manual work, using AI only as a last resort.', relevance: 'Minimal AI adoption.', accuracy: 'Low AI leverage.' }
    }
  },
  4: {
    questionId: 4,
    title: 'If AI tools suddenly became unavailable for a week, how would it impact your productivity?',
    type: 'scale',
    purpose: 'Measures extent of AI integration into daily productivity.',
    capabilityWeights: { usingAI: 1.0, understandingAI: 0, solvingWithAI: 0.4, checkingAI: 0, adaptingToAI: 0 },
    scaleScoring: (val: number): OptionScoringDefinition => {
      const map: Record<number, OptionScoringDefinition> = {
        1: { score: 95, evidenceLevel: 'strong', demonstration: 'Core workflows rely significantly on AI tooling.', relevance: 'High dependence.', accuracy: 'Deep integration.' },
        2: { score: 80, evidenceLevel: 'strong', demonstration: 'Substantial workflow dependency on AI.', relevance: 'Moderate-high dependence.', accuracy: 'Strong integration.' },
        3: { score: 60, evidenceLevel: 'partial', demonstration: 'Balanced workflow with moderate AI assistance.', relevance: 'Moderate impact.', accuracy: 'Partial integration.' },
        4: { score: 40, evidenceLevel: 'weak', demonstration: 'Minor AI workflow reliance.', relevance: 'Low impact.', accuracy: 'Light integration.' },
        5: { score: 20, evidenceLevel: 'weak', demonstration: 'Workflow completely unaffected by AI absence.', relevance: 'Minimal integration.', accuracy: 'Negligible dependency.' }
      };
      return map[val] || map[3];
    }
  },
  5: {
    questionId: 5,
    title: 'What best describes your primary goal when using AI?',
    type: 'single_select',
    purpose: 'Evaluates strategic intent and value proposition.',
    capabilityWeights: { usingAI: 0.5, understandingAI: 0.3, solvingWithAI: 0.8, checkingAI: 0, adaptingToAI: 0.2 },
    options: {
      q5_c: { score: 95, evidenceLevel: 'strong', demonstration: 'Using AI for complex ideation and technical architecture.', relevance: 'High-level cognitive leverage.', accuracy: 'Strategic creative output.' },
      q5_b: { score: 90, evidenceLevel: 'strong', demonstration: 'Using AI for deep learning and concept synthesis.', relevance: 'Cognitive augmentation.', accuracy: 'Intellectual growth.' },
      q5_d: { score: 85, evidenceLevel: 'strong', demonstration: 'Using AI for systemized delegation and automation.', relevance: 'Automation mindset.', accuracy: 'Efficiency scaling.' },
      q5_a: { score: 65, evidenceLevel: 'partial', demonstration: 'Using AI primarily for quick task completion.', relevance: 'Basic task productivity.', accuracy: 'Execution speed.' }
    }
  },
  6: {
    questionId: 6,
    title: 'How would you explain how Large Language Models (LLMs) generate answers?',
    type: 'single_select',
    purpose: 'Evaluates accuracy of learner mental model regarding LLMs.',
    capabilityWeights: { usingAI: 0, understandingAI: 1.0, solvingWithAI: 0, checkingAI: 0.3, adaptingToAI: 0 },
    options: {
      q6_b: { score: 100, evidenceLevel: 'strong', demonstration: 'Accurate technical mental model: probabilistic next-token prediction.', relevance: 'Directly explains core mechanism.', accuracy: 'Factually precise.' },
      q6_a: { score: 20, evidenceLevel: 'misunderstanding', demonstration: 'Confuses generative models with search databases.', relevance: 'Incorrect concept.', accuracy: 'Factually inaccurate.' },
      q6_c: { score: 10, evidenceLevel: 'misunderstanding', demonstration: 'Anthropomorphic misconception of conscious reasoning.', relevance: 'Flawed mental model.', accuracy: 'Factually inaccurate.' },
      q6_d: { score: 0, evidenceLevel: 'none', demonstration: 'Honest admission of unknown mechanics.', relevance: 'No evidence.', accuracy: 'No technical understanding.' }
    }
  },
  7: {
    questionId: 7,
    title: 'Have you ever encountered an AI "hallucination"?',
    type: 'single_select',
    purpose: 'Measures awareness of error modes and verification practices.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.6, solvingWithAI: 0, checkingAI: 1.0, adaptingToAI: 0 },
    options: {
      q7_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Frequent detection combined with systematic cross-verification.', relevance: 'High scrutiny and risk awareness.', accuracy: 'Recognizes model vulnerability.' },
      q7_b: { score: 60, evidenceLevel: 'partial', demonstration: 'Occasional detection of false outputs.', relevance: 'Passive checking behavior.', accuracy: 'Recognizes obvious errors.' },
      q7_c: { score: 15, evidenceLevel: 'misunderstanding', demonstration: 'Blind trust in model outputs without verification.', relevance: 'Unaware of hallucination risks.', accuracy: 'Inaccurate trust assumption.' },
      q7_d: { score: 0, evidenceLevel: 'none', demonstration: 'Unfamiliar with model hallucination concept.', relevance: 'No risk awareness.', accuracy: 'No evidence.' }
    }
  },
  8: {
    questionId: 8,
    title: 'What does "Context Window" mean when working with an AI model?',
    type: 'single_select',
    purpose: 'Evaluates technical knowledge of LLM memory bounds.',
    capabilityWeights: { usingAI: 0, understandingAI: 1.0, solvingWithAI: 0.4, checkingAI: 0, adaptingToAI: 0 },
    options: {
      q8_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Accurate technical definition: maximum token memory capacity.', relevance: 'Directly defines technical concept.', accuracy: 'Factually precise.' },
      q8_c: { score: 15, evidenceLevel: 'misunderstanding', demonstration: 'Confuses context memory with text streaming speed.', relevance: 'Incorrect mapping.', accuracy: 'Factually inaccurate.' },
      q8_b: { score: 10, evidenceLevel: 'misunderstanding', demonstration: 'Confuses model memory with browser UI window size.', relevance: 'Literal misinterpretation.', accuracy: 'Factually inaccurate.' },
      q8_d: { score: 0, evidenceLevel: 'none', demonstration: 'Unaware of technical meaning.', relevance: 'No evidence.', accuracy: 'No evidence.' }
    }
  },
  9: {
    questionId: 9,
    title: 'How do you adjust your prompting style for structured vs creative tasks?',
    type: 'single_select',
    purpose: 'Evaluates prompt engineering and schema control.',
    capabilityWeights: { usingAI: 0.3, understandingAI: 0.5, solvingWithAI: 1.0, checkingAI: 0, adaptingToAI: 0 },
    options: {
      q9_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Explicit specification of JSON/Markdown schemas and system constraints.', relevance: 'Advanced structured prompt control.', accuracy: 'Applies schema-driven prompting.' },
      q9_b: { score: 55, evidenceLevel: 'partial', demonstration: 'Elaborates prompts with extra descriptive text.', relevance: 'Basic prompt expansion.', accuracy: 'Informal prompt tweaking.' },
      q9_c: { score: 25, evidenceLevel: 'weak', demonstration: 'Uses uniform prompting style for all tasks.', relevance: 'Lacks adaptation.', accuracy: 'Fails to leverage model steering.' },
      q9_d: { score: 15, evidenceLevel: 'weak', demonstration: 'Passively relies on model default formatting.', relevance: 'No active structuring.', accuracy: 'Passive usage.' }
    }
  },
  10: {
    questionId: 10,
    title: 'What is Retrieval-Augmented Generation (RAG)?',
    type: 'single_select',
    purpose: 'Evaluates technical knowledge of RAG architectures.',
    capabilityWeights: { usingAI: 0, understandingAI: 1.0, solvingWithAI: 0.5, checkingAI: 0, adaptingToAI: 0.3 },
    options: {
      q10_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Accurate technical definition: augmenting LLMs with document retrieval over private datasets.', relevance: 'Correctly identifies RAG architecture.', accuracy: 'Factually precise.' },
      q10_b: { score: 20, evidenceLevel: 'misunderstanding', demonstration: 'Confuses RAG retrieval with pre-training from scratch.', relevance: 'Incorrect concept.', accuracy: 'Factually inaccurate.' },
      q10_c: { score: 0, evidenceLevel: 'misunderstanding', demonstration: 'Confuses vector database embeddings with vector artwork.', relevance: 'Completely mistaken domain.', accuracy: 'Factually inaccurate.' },
      q10_d: { score: 0, evidenceLevel: 'none', demonstration: 'Unfamiliar with RAG.', relevance: 'No evidence.', accuracy: 'No evidence.' }
    }
  },
  11: {
    questionId: 11,
    title: 'AI THINKING LAB: Designing Software Architecture',
    type: 'long_text',
    purpose: 'Evaluates system boundary framing, role setting, and technical constraints.',
    capabilityWeights: { usingAI: 0.3, understandingAI: 0.5, solvingWithAI: 1.0, checkingAI: 0.2, adaptingToAI: 0 },
    deterministicTextFallback: (text: string): OptionScoringDefinition => {
      const clean = text ? text.trim() : '';
      if (!clean || clean.length < 5) return { score: 0, evidenceLevel: 'none', demonstration: 'No prompt entered.', relevance: 'No text.', accuracy: 'No evidence.' };
      if (clean.length < 15 && ['idk', 'test', 'asdf', 'nothing', 'na', 'none'].includes(clean.toLowerCase())) {
        return { score: 0, evidenceLevel: 'none', demonstration: 'Non-responsive text.', relevance: 'Lacks prompt content.', accuracy: 'No valid evidence.' };
      }
      const lower = clean.toLowerCase();
      let score = 30;
      const strengths: string[] = [];
      if (lower.includes('act as') || lower.includes('you are') || lower.includes('architect')) { score += 15; strengths.push('Role definition'); }
      if (lower.includes('tech stack') || lower.includes('react') || lower.includes('node') || lower.includes('database') || lower.includes('api')) { score += 20; strengths.push('Tech constraints'); }
      if (lower.includes('scalable') || lower.includes('security') || lower.includes('performance') || lower.includes('auth')) { score += 15; strengths.push('Non-functional requirements'); }
      if (lower.includes('format') || lower.includes('step') || lower.includes('diagram') || lower.includes('json') || lower.includes('markdown')) { score += 10; strengths.push('Output format'); }
      score = Math.min(95, Math.max(15, score));
      const level = score >= 70 ? 'strong' : score >= 40 ? 'partial' : 'weak';
      return { score, evidenceLevel: level, demonstration: `Evaluated architecture prompt (${clean.length} chars). Elements: ${strengths.join(', ') || 'basic structure'}.`, relevance: 'Evaluated raw prompt text.', accuracy: 'Deterministic fallback evaluation.' };
    }
  },
  12: {
    questionId: 12,
    title: 'AI THINKING LAB: Building a Working Prototype (MVP)',
    type: 'long_text',
    purpose: 'Evaluates code generation prompting strategy.',
    capabilityWeights: { usingAI: 0.5, understandingAI: 0.3, solvingWithAI: 1.0, checkingAI: 0.2, adaptingToAI: 0 },
    deterministicTextFallback: (text: string): OptionScoringDefinition => {
      const clean = text ? text.trim() : '';
      if (!clean || clean.length < 5) return { score: 0, evidenceLevel: 'none', demonstration: 'No prompt entered.', relevance: 'No text.', accuracy: 'No evidence.' };
      if (clean.length < 15 && ['idk', 'test', 'asdf', 'nothing', 'na', 'none'].includes(clean.toLowerCase())) {
        return { score: 0, evidenceLevel: 'none', demonstration: 'Non-responsive text.', relevance: 'Lacks prompt content.', accuracy: 'No valid evidence.' };
      }
      const lower = clean.toLowerCase();
      let score = 30;
      const strengths: string[] = [];
      if (lower.includes('typescript') || lower.includes('react') || lower.includes('python') || lower.includes('function') || lower.includes('api')) { score += 20; strengths.push('Code stack specification'); }
      if (lower.includes('step') || lower.includes('mock data') || lower.includes('file structure')) { score += 20; strengths.push('Implementation breakdown'); }
      if (lower.includes('edge case') || lower.includes('error handling')) { score += 15; strengths.push('Quality constraints'); }
      score = Math.min(95, Math.max(15, score));
      const level = score >= 70 ? 'strong' : score >= 40 ? 'partial' : 'weak';
      return { score, evidenceLevel: level, demonstration: `Evaluated MVP prompt. Elements: ${strengths.join(', ') || 'basic instructions'}.`, relevance: 'Evaluated raw prompt text.', accuracy: 'Deterministic fallback evaluation.' };
    }
  },
  13: {
    questionId: 13,
    title: 'When an AI model gives you an incomplete or slightly incorrect answer, what do you do?',
    type: 'single_select',
    purpose: 'Evaluates iterative prompt debugging capability.',
    capabilityWeights: { usingAI: 0.3, understandingAI: 0.4, solvingWithAI: 1.0, checkingAI: 0.3, adaptingToAI: 0.5 },
    options: {
      q13_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Refines prompt with explicit constraints and sub-step task decomposition.', relevance: 'Active prompt debugging mastery.', accuracy: 'Systematic refactoring.' },
      q13_c: { score: 60, evidenceLevel: 'partial', demonstration: 'Switches to alternative model or search engine.', relevance: 'Recognizes model variance.', accuracy: 'Cross-model trial.' },
      q13_b: { score: 35, evidenceLevel: 'weak', demonstration: 'Repeats exact same prompt or hits regenerate.', relevance: 'Naive retry loop.', accuracy: 'Fails to modify prompt.' },
      q13_d: { score: 20, evidenceLevel: 'weak', demonstration: 'Abandons AI completely and fixes manually.', relevance: 'Gives up on AI collaboration.', accuracy: 'Low AI leverage.' }
    }
  },
  14: {
    questionId: 14,
    title: 'You have an idea for solving a real-world problem. What would you most likely ask AI first?',
    type: 'single_select',
    purpose: 'Evaluates strategic use of AI for assumption testing.',
    capabilityWeights: { usingAI: 0.2, understandingAI: 0.5, solvingWithAI: 1.0, checkingAI: 0.4, adaptingToAI: 0 },
    options: {
      q14_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Leverages AI to challenge assumptions and red-team blind spots.', relevance: 'Top-tier strategic thinking.', accuracy: 'Critical risk analysis.' },
      q14_b: { score: 80, evidenceLevel: 'strong', demonstration: 'Uses AI to analyze existing competitor landscape.', relevance: 'Structured research usage.', accuracy: 'Solid analytical inquiry.' },
      q14_c: { score: 60, evidenceLevel: 'partial', demonstration: 'Asks AI for immediate execution plan without testing assumptions.', relevance: 'Premature execution.', accuracy: 'Action without scrutiny.' },
      q14_d: { score: 30, evidenceLevel: 'weak', demonstration: 'Asks AI to generate complete solution end-to-end passively.', relevance: 'Passive delegation.', accuracy: 'Lacks problem framing ownership.' }
    }
  },
  15: {
    questionId: 15,
    title: 'How do you assess whether an AI response is "good enough"?',
    type: 'single_select',
    purpose: 'Evaluates output validation rigor against requirements.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.4, solvingWithAI: 0.5, checkingAI: 1.0, adaptingToAI: 0 },
    options: {
      q15_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Empirical verification against functional requirements and edge cases.', relevance: 'Rigorous output verification.', accuracy: 'Executes quality control.' },
      q15_c: { score: 70, evidenceLevel: 'partial', demonstration: 'Asks AI model to self-critique its own output.', relevance: 'Uses self-reflection prompting.', accuracy: 'Automated verification.' },
      q15_b: { score: 20, evidenceLevel: 'misunderstanding', demonstration: 'Accepts output based on superficial plausibility.', relevance: 'Plausibility bias.', accuracy: 'Inaccurate methodology.' },
      q15_d: { score: 10, evidenceLevel: 'weak', demonstration: 'Struggles to evaluate accuracy of AI output.', relevance: 'Lacks verification capability.', accuracy: 'No evaluation criteria.' }
    }
  },
  16: {
    questionId: 16,
    title: 'How often do you fact-check AI outputs against authoritative documentation?',
    type: 'single_select',
    purpose: 'Measures systematic verification frequency.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.3, solvingWithAI: 0, checkingAI: 1.0, adaptingToAI: 0 },
    options: {
      q16_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Consistently fact-checks critical decisions against primary documentation.', relevance: 'Uncompromised verification discipline.', accuracy: 'Maintains factual integrity.' },
      q16_b: { score: 50, evidenceLevel: 'partial', demonstration: 'Fact-checks selectively only when answers feel counter-intuitive.', relevance: 'Intuition-gated verification.', accuracy: 'Spot checking.' },
      q16_c: { score: 20, evidenceLevel: 'weak', demonstration: 'Rarely fact-checks, assuming models are accurate.', relevance: 'Complacency risk.', accuracy: 'Inaccurate trust assumption.' },
      q16_d: { score: 0, evidenceLevel: 'none', demonstration: 'Never fact-checks AI outputs.', relevance: 'Zero verification.', accuracy: 'No evidence.' }
    }
  },
  17: {
    questionId: 17,
    title: 'What is your stance on pasting proprietary code or sensitive personal data into public AI chats?',
    type: 'single_select',
    purpose: 'Evaluates security, data sanitization, and privacy policy compliance.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.5, solvingWithAI: 0, checkingAI: 1.0, adaptingToAI: 0 },
    options: {
      q17_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Strict data sanitization/anonymization and checking zero-retention policies.', relevance: 'Security compliance and enterprise safety mindset.', accuracy: 'Mitigates data leak risks.' },
      q17_b: { score: 45, evidenceLevel: 'partial', demonstration: 'Inconsistent data sanitization when convenient for speed.', relevance: 'Partial security compliance.', accuracy: 'Policy gaps.' },
      q17_c: { score: 10, evidenceLevel: 'weak', demonstration: 'Pastes sensitive data without concern for privacy policies.', relevance: 'High security violation risk.', accuracy: 'Ignores data exposure.' },
      q17_d: { score: 0, evidenceLevel: 'none', demonstration: 'Unaware of public AI model data retention policies.', relevance: 'No security awareness.', accuracy: 'No evidence.' }
    }
  },
  18: {
    questionId: 18,
    title: 'What best describes "Human-in-the-Loop" decision making?',
    type: 'single_select',
    purpose: 'Evaluates understanding of HITL architecture.',
    capabilityWeights: { usingAI: 0, understandingAI: 1.0, solvingWithAI: 0, checkingAI: 0.8, adaptingToAI: 0 },
    options: {
      q18_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Accurate technical definition: AI proposes, human retains decision authority and accountability.', relevance: 'Correctly identifies HITL framework.', accuracy: 'Conceptually precise.' },
      q18_b: { score: 35, evidenceLevel: 'partial', demonstration: 'Confuses HITL with passive monitoring of autonomous execution.', relevance: 'Imprecise concept.', accuracy: 'Partially inaccurate.' },
      q18_c: { score: 25, evidenceLevel: 'weak', demonstration: 'Confuses HITL with post-hoc RLHF rating buttons.', relevance: 'Misinterprets scope.', accuracy: 'Conceptually flawed.' },
      q18_d: { score: 0, evidenceLevel: 'none', demonstration: 'Unfamiliar with HITL concept.', relevance: 'No evidence.', accuracy: 'No evidence.' }
    }
  },
  19: {
    questionId: 19,
    title: 'Before asking AI to design a solution, how much time do you spend framing the user problem?',
    type: 'single_select',
    purpose: 'Evaluates thoroughness of human problem definition.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.4, solvingWithAI: 1.0, checkingAI: 0.5, adaptingToAI: 0 },
    options: {
      q19_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Substantial upfront human framing: user personas, pain points, constraints, metrics.', relevance: 'Deep problem framing before prompting.', accuracy: 'Structures problem boundaries.' },
      q19_b: { score: 65, evidenceLevel: 'partial', demonstration: 'Brief problem framing outlining basic requirements.', relevance: 'Light problem framing.', accuracy: 'Informal requirements.' },
      q19_c: { score: 25, evidenceLevel: 'weak', demonstration: 'Minimal framing, delegating problem definition to AI.', relevance: 'Bypasses human framing.', accuracy: 'Over-relies on defaults.' },
      q19_d: { score: 15, evidenceLevel: 'weak', demonstration: 'Requests solutions from AI without framing user problems.', relevance: 'Unframed prompting.', accuracy: 'Reactive generation.' }
    }
  },
  20: {
    questionId: 20,
    title: 'When AI generates code or a document for you, who takes ultimate responsibility if there is a flaw?',
    type: 'single_select',
    purpose: 'Evaluates professional accountability and ownership mindset.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.3, solvingWithAI: 0, checkingAI: 1.0, adaptingToAI: 0 },
    options: {
      q20_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Full personal ownership and accountability for final products created with AI.', relevance: 'Uncompromised human responsibility.', accuracy: 'Asserts professional liability.' },
      q20_b: { score: 40, evidenceLevel: 'partial', demonstration: 'Assumes shared responsibility between human and AI vendor.', relevance: 'Dilutes personal accountability.', accuracy: 'Inaccurate legal stance.' },
      q20_c: { score: 10, evidenceLevel: 'misunderstanding', demonstration: 'Shifts product liability to AI tool vendor.', relevance: 'Refuses accountability.', accuracy: 'Flawed product ownership stance.' },
      q20_d: { score: 0, evidenceLevel: 'none', demonstration: 'Unaware of liability or ownership considerations.', relevance: 'No responsibility awareness.', accuracy: 'No evidence.' }
    }
  },
  21: {
    questionId: 21,
    title: 'How comfortable are you adapting your workflow when a major new AI capability is released?',
    type: 'scale',
    purpose: 'Measures adaptiveness and rapid workflow evolution.',
    capabilityWeights: { usingAI: 0.3, understandingAI: 0, solvingWithAI: 0, checkingAI: 0, adaptingToAI: 1.0 },
    scaleScoring: (val: number): OptionScoringDefinition => {
      const map: Record<number, OptionScoringDefinition> = {
        5: { score: 100, evidenceLevel: 'strong', demonstration: 'Eager and rapid experimentation with emerging AI shifts.', relevance: 'High adaptiveness.', accuracy: 'Proactive evolution.' },
        4: { score: 80, evidenceLevel: 'strong', demonstration: 'Comfortable trying new AI capabilities.', relevance: 'Moderate-high adaptiveness.', accuracy: 'Steady adoption.' },
        3: { score: 60, evidenceLevel: 'partial', demonstration: 'Moderate comfort with workflow adaptation.', relevance: 'Average adaptiveness.', accuracy: 'Cautious adoption.' },
        2: { score: 40, evidenceLevel: 'weak', demonstration: 'Hesitant to change established workflows.', relevance: 'Low adaptiveness.', accuracy: 'Workflow inertia.' },
        1: { score: 20, evidenceLevel: 'weak', demonstration: 'Prefers traditional methods, resistant to new AI tools.', relevance: 'Minimal adaptiveness.', accuracy: 'Strong resistance.' }
      };
      return map[val] || map[3];
    }
  },
  22: {
    questionId: 22,
    title: 'How do you approach learning a brand-new AI tool or framework?',
    type: 'single_select',
    purpose: 'Evaluates proactive hands-on project learning vs passive consumption.',
    capabilityWeights: { usingAI: 0.5, understandingAI: 0.3, solvingWithAI: 0, checkingAI: 0, adaptingToAI: 1.0 },
    options: {
      q22_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Builds hands-on project immediately while reading official documentation.', relevance: 'Active project-based learning.', accuracy: 'Rapid skill acquisition.' },
      q22_b: { score: 65, evidenceLevel: 'partial', demonstration: 'Watches video tutorials and overview articles first.', relevance: 'Passive learning before trying.', accuracy: 'Theoretical introduction.' },
      q22_c: { score: 25, evidenceLevel: 'weak', demonstration: 'Waits for school or employer mandates before learning.', relevance: 'Reactive learning posture.', accuracy: 'Low self-directed initiative.' },
      q22_d: { score: 10, evidenceLevel: 'weak', demonstration: 'Rarely explores new technical frameworks.', relevance: 'Low technical exploration.', accuracy: 'Static skill set.' }
    }
  },
  23: {
    questionId: 23,
    title: 'What is your biggest concern about the rapid rise of AI in your field?',
    type: 'single_select',
    isAttitude: true,
    purpose: 'Evaluates analytical awareness of structural AI shifts.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.4, solvingWithAI: 0, checkingAI: 0.3, adaptingToAI: 0.5 },
    options: {
      q23_b: { score: 85, evidenceLevel: 'strong', demonstration: 'Deep awareness of cognitive deskilling risk and core skill atrophy.', relevance: 'Nuanced critical awareness.', accuracy: 'Identifies human skill protection.' },
      q23_a: { score: 75, evidenceLevel: 'partial', demonstration: 'Awareness of skill obsolescence and urgency to stay current.', relevance: 'Motivation to adapt.', accuracy: 'Reflects awareness of pace.' },
      q23_c: { score: 70, evidenceLevel: 'partial', demonstration: 'Awareness of labor market displacement and role restructuring.', relevance: 'Realistic macro economic awareness.', accuracy: 'Industry shift recognition.' },
      q23_d: { score: 60, evidenceLevel: 'partial', demonstration: 'Pure optimistic outlook without major risk concerns.', relevance: 'Positive attitude.', accuracy: 'Optimistic stance.' }
    }
  },
  24: {
    questionId: 24,
    title: 'Which AI skills do you most want to master over the next 6 months?',
    type: 'multi_select',
    isPreference: true,
    purpose: 'Captures learner preference. MUST NOT directly inflate capability scores.',
    capabilityWeights: { usingAI: 0, understandingAI: 0, solvingWithAI: 0, checkingAI: 0, adaptingToAI: 0 },
    evaluateMultiSelect: (selectedIds: string[]): OptionScoringDefinition => {
      return { score: 0, evidenceLevel: 'preference', demonstration: `Selected learning preferences: ${selectedIds.join(', ')}.`, relevance: 'Recorded for personalization.', accuracy: 'Does not inflate capability scores.' };
    }
  },
  25: {
    questionId: 25,
    title: 'AI THINKING LAB: What separates someone who merely uses AI from someone who adapts to AI?',
    type: 'long_text',
    purpose: 'Evaluates meta-cognition, workflow redesign, and human-AI co-evolution.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.5, solvingWithAI: 0.3, checkingAI: 0, adaptingToAI: 1.0 },
    deterministicTextFallback: (text: string): OptionScoringDefinition => {
      const clean = text ? text.trim() : '';
      if (!clean || clean.length < 5) return { score: 0, evidenceLevel: 'none', demonstration: 'No text entered.', relevance: 'No response.', accuracy: 'No evidence.' };
      if (clean.length < 15 && ['idk', 'test', 'asdf', 'nothing', 'na', 'none'].includes(clean.toLowerCase())) {
        return { score: 0, evidenceLevel: 'none', demonstration: 'Non-responsive text.', relevance: 'Lacks actual reflection.', accuracy: 'No valid evidence.' };
      }
      const lower = clean.toLowerCase();
      let score = 30;
      const strengths: string[] = [];
      if (lower.includes('workflow') || lower.includes('redesign') || lower.includes('system')) { score += 20; strengths.push('Workflow redesign perspective'); }
      if (lower.includes('mindset') || lower.includes('understand') || lower.includes('limit') || lower.includes('critical')) { score += 20; strengths.push('Meta-cognitive awareness'); }
      if (lower.includes('continuous') || lower.includes('learn') || lower.includes('evolve') || lower.includes('experiment')) { score += 20; strengths.push('Continuous growth mindset'); }
      score = Math.min(95, Math.max(15, score));
      const level = score >= 70 ? 'strong' : score >= 40 ? 'partial' : 'weak';
      return { score, evidenceLevel: level, demonstration: `Evaluated text reflection. Identified: ${strengths.join(', ') || 'basic reflection'}.`, relevance: 'Evaluated raw text.', accuracy: 'Deterministic fallback evaluation.' };
    }
  }
};

export function scoreQuestion(
  questionId: number,
  rawAnswer: any,
  anthropicEvaluation?: { score: number; confidence: number; reason: string; strengths?: string[]; gaps?: string[]; evidence?: string[] }
): QuestionScoreResult {
  const rubric = ASSESSMENT_RUBRICS[questionId];
  if (!rubric) {
    return { questionId, questionType: 'unknown', rawAnswer, score: 0, confidence: 0, evidenceLevel: 'none', scoringMethod: 'question_rubric', reason: `Unknown question ID: ${questionId}` };
  }
  if (rubric.isPreference) {
    const selected = Array.isArray(rawAnswer) ? rawAnswer : [];
    return { questionId, questionType: rubric.type, rawAnswer, score: 0, confidence: 1.0, evidenceLevel: 'preference', scoringMethod: 'question_rubric', reason: `Q${questionId} is a learning preference question (${selected.length} selected). Does not inflate capability scores.` };
  }
  if (rubric.type === 'long_text') {
    const textStr = typeof rawAnswer === 'string' ? rawAnswer : '';
    if (anthropicEvaluation && typeof anthropicEvaluation.score === 'number') {
      const level = anthropicEvaluation.score >= 75 ? 'strong' : anthropicEvaluation.score >= 40 ? 'partial' : anthropicEvaluation.score > 0 ? 'weak' : 'none';
      return { questionId, questionType: rubric.type, rawAnswer, score: anthropicEvaluation.score, confidence: anthropicEvaluation.confidence ?? 0.9, evidenceLevel: level, scoringMethod: 'anthropic', reason: anthropicEvaluation.reason || 'Evaluated via Anthropic Claude model.', strengths: anthropicEvaluation.strengths || [], gaps: anthropicEvaluation.gaps || [], evidence: anthropicEvaluation.evidence || [], anthropicStatus: 'evaluated' };
    }
    if (rubric.deterministicTextFallback) {
      const fallback = rubric.deterministicTextFallback(textStr);
      return { questionId, questionType: rubric.type, rawAnswer, score: fallback.score, confidence: textStr.trim().length > 10 ? 0.7 : 0.2, evidenceLevel: fallback.evidenceLevel, scoringMethod: 'deterministic_fallback', reason: fallback.demonstration, anthropicStatus: 'unavailable' };
    }
  }
  if (rubric.type === 'multi_select' && rubric.evaluateMultiSelect) {
    const selected = Array.isArray(rawAnswer) ? rawAnswer : [];
    const evalRes = rubric.evaluateMultiSelect(selected);
    return { questionId, questionType: rubric.type, rawAnswer, score: evalRes.score, confidence: selected.length > 0 ? 0.95 : 0.1, evidenceLevel: evalRes.evidenceLevel, scoringMethod: 'question_rubric', reason: evalRes.demonstration };
  }
  if (rubric.type === 'scale' && rubric.scaleScoring) {
    const val = typeof rawAnswer === 'number' ? rawAnswer : parseInt(String(rawAnswer), 10);
    if (!isNaN(val) && val >= 1 && val <= 5) {
      const scaleRes = rubric.scaleScoring(val);
      return { questionId, questionType: rubric.type, rawAnswer, score: scaleRes.score, confidence: 0.9, evidenceLevel: scaleRes.evidenceLevel, scoringMethod: 'question_rubric', reason: scaleRes.demonstration };
    }
  }
  if (rubric.options && typeof rawAnswer === 'string') {
    const opt = rubric.options[rawAnswer];
    if (opt) {
      return { questionId, questionType: rubric.type, rawAnswer, score: opt.score, confidence: 1.0, evidenceLevel: opt.evidenceLevel, scoringMethod: 'question_rubric', reason: opt.demonstration };
    }
  }
  return { questionId, questionType: rubric.type, rawAnswer, score: 0, confidence: 0, evidenceLevel: 'none', scoringMethod: 'question_rubric', reason: `No valid response provided for Q${questionId}. NO score inflation applied.` };
}

export function evaluateAssessment(
  answers: Record<number | string, any>,
  openEndedEvaluations?: Record<number | string, { score: number; confidence: number; reason: string; strengths?: string[]; gaps?: string[]; evidence?: string[] }>
): AssessmentEvaluationResult {
  const questionResults: Record<number, QuestionScoreResult> = {};
  for (let qId = 1; qId <= 25; qId++) {
    const rawAns = answers[qId] !== undefined ? answers[qId] : answers[String(qId)];
    const anthropicEval = openEndedEvaluations ? (openEndedEvaluations[qId] || openEndedEvaluations[String(qId)]) : undefined;
    questionResults[qId] = scoreQuestion(qId, rawAns, anthropicEval);
  }

  const capabilityKeys: CapabilityKey[] = ['usingAI', 'understandingAI', 'solvingWithAI', 'checkingAI', 'adaptingToAI'];
  const capabilities: Record<CapabilityKey, CapabilityScoreResult> = {} as any;

  capabilityKeys.forEach((capKey) => {
    let weightedSum = 0;
    let totalWeight = 0;
    const contributingQuestionIds: number[] = [];
    const questionScores: Record<number, number> = {};
    let totalConfidenceSum = 0;
    let validQuestionCount = 0;

    for (let qId = 1; qId <= 25; qId++) {
      const rubric = ASSESSMENT_RUBRICS[qId];
      if (!rubric) continue;
      const weight = rubric.capabilityWeights[capKey] || 0;
      if (weight > 0) {
        contributingQuestionIds.push(qId);
        const qRes = questionResults[qId];
        questionScores[qId] = qRes.score;
        weightedSum += qRes.score * weight;
        totalWeight += weight;
        totalConfidenceSum += qRes.confidence;
        if (qRes.score > 0) validQuestionCount++;
      }
    }

    const capScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    const avgConfidence = contributingQuestionIds.length > 0 ? totalConfidenceSum / contributingQuestionIds.length : 0;

    let evidenceStatus: 'robust' | 'moderate' | 'limited' = 'limited';
    if (validQuestionCount >= 3 && avgConfidence >= 0.7) evidenceStatus = 'robust';
    else if (validQuestionCount >= 1 && avgConfidence >= 0.4) evidenceStatus = 'moderate';

    capabilities[capKey] = {
      capabilityKey: capKey,
      capabilityName: CAPABILITY_NAMES[capKey],
      score: capScore,
      confidence: Math.round(avgConfidence * 100) / 100,
      evidenceStatus,
      contributingQuestionIds,
      questionScores,
      scoringMethod: 'explicit_question_rubric_v2',
      rubricVersion: '2.0.0-ainova'
    };
  });

  const capScoresList = capabilityKeys.map((k) => capabilities[k].score);
  const overallScore = Math.round(capScoresList.reduce((a, b) => a + b, 0) / capScoresList.length);
  const sortedCapabilities = [...capabilityKeys].map((k) => capabilities[k]).sort((a, b) => b.score - a.score);

  const strongestSkill = { key: sortedCapabilities[0].capabilityKey, name: sortedCapabilities[0].capabilityName, score: sortedCapabilities[0].score };
  const roomToGrow = { key: sortedCapabilities[sortedCapabilities.length - 1].capabilityKey, name: sortedCapabilities[sortedCapabilities.length - 1].capabilityName, score: sortedCapabilities[sortedCapabilities.length - 1].score };

  const legacyScores = {
    usageFrequency: capabilities.usingAI.score,
    evaluationCapability: capabilities.checkingAI.score,
    workflowDesign: capabilities.solvingWithAI.score,
    strategicVision: capabilities.understandingAI.score,
    mentorshipReadiness: capabilities.adaptingToAI.score
  };

  return { overallScore, capabilities, legacyScores, questionResults, strongestSkill, roomToGrow, evaluatedAt: new Date().toISOString(), rubricVersion: '2.0.0-ainova' };
}
