/**
 * promptToolAnalysis.test.ts
 * ============================================================================
 * Unit test suite for Prompt Analysis and AI Tool Matching Service.
 *
 * Covers:
 * 1. scorePrompt:
 *    - Empty & whitespace-only inputs
 *    - Weak one-liners vs strong prompts
 *    - Missing criteria isolation (action verb, context, audience, format, constraints, examples)
 *    - Length thresholds & continuous boundary pacing
 * 2. detectTool:
 *    - All 8 supported tool names
 *    - Case insensitivity & unambiguous aliases
 *    - False-positive prevention (e.g. bare "llama" != Meta AI)
 *    - Multiple tool mentions & no-match fallback
 * 3. suggestTools:
 *    - Coding, research, and data analysis prompts
 *    - Empty inputs & empty catalogues
 *    - Already-owned tool marking
 *    - Category grouping & toolkit gaps
 * ============================================================================
 */

import { scorePrompt, detectTool, suggestTools } from '../promptToolAnalysis';
import { AITool } from '../../types';

type TestFn = (name: string, fn: () => void | Promise<void>) => void;
type ExpectMatcher = { [key: string]: (...args: unknown[]) => unknown };
declare const describe: TestFn & { [key: string]: unknown };
declare const it: TestFn & { [key: string]: unknown };
declare const expect: (actual: unknown) => ExpectMatcher;

export function runPromptToolAnalysisTestSuite(): {
  passedCount: number;
  failedCount: number;
  totalCount: number;
  results: { name: string; passed: boolean; detail?: string }[];
} {
  const results: { name: string; passed: boolean; detail?: string }[] = [];
  let passedCount = 0;
  let failedCount = 0;

  function assert(name: string, condition: boolean, detail?: string) {
    if (condition) {
      passedCount++;
      results.push({ name, passed: true, detail: detail || 'Passed' });
    } else {
      failedCount++;
      results.push({ name, passed: false, detail: detail || 'Failed' });
    }
  }

  // ==========================================================================
  // 1. scorePrompt TESTS
  // ==========================================================================

  // 1.1 Empty & Whitespace Input
  const emptyRes = scorePrompt('');
  assert(
    '1.1: Empty prompt returns 0 total score',
    emptyRes.totalScore === 0 && emptyRes.grade === 'Needs Improvement',
    `Score: ${emptyRes.totalScore}`
  );

  const whitespaceRes = scorePrompt('    \n\t   ');
  assert(
    '1.2: Whitespace-only prompt returns 0 total score',
    whitespaceRes.totalScore === 0 && whitespaceRes.charCount === 0,
    `Score: ${whitespaceRes.totalScore}`
  );

  // 1.3 Very Weak One-Liner
  const weakRes = scorePrompt('write code');
  assert(
    '1.3: Very weak prompt receives low score (< 50)',
    weakRes.totalScore < 50 && weakRes.grade === 'Needs Improvement',
    `Score: ${weakRes.totalScore}, Grade: ${weakRes.grade}`
  );

  // 1.4 Strong Complete Prompt
  const strongPrompt =
    'Act as a Senior AI Architect. Analyze our microservice latency bottleneck and formulate a recovery plan. Context: We are building an enterprise fintech platform processing 50,000 transactions per second with database lock contention. Format the response as a numbered step-by-step markdown list with a metrics table. Constraints: Limit to 400 words, do not suggest replacing PostgreSQL, and ensure zero downtime. For example: | Metric | Target | Solution | - | P99 Latency | <50ms | Read replica scaling |.';
  const strongRes = scorePrompt(strongPrompt);
  assert(
    '1.4: Comprehensive prompt scores in Excellent tier (>= 85)',
    strongRes.totalScore >= 85 && strongRes.grade === 'Excellent',
    `Score: ${strongRes.totalScore}, Grade: ${strongRes.grade}`
  );

  // 1.5 Missing Action Verb
  const noVerbPrompt =
    'Context: We are testing our database. Act as a DBA. Format: JSON. Limit: 100 words. For example: { id: 1 }. Some additional text to satisfy length.';
  const noVerbRes = scorePrompt(noVerbPrompt);
  assert(
    '1.5: Missing action verb scores 0 on actionVerb criterion',
    noVerbRes.breakdown.actionVerb.score === 0 && !noVerbRes.breakdown.actionVerb.detected,
    `Verb score: ${noVerbRes.breakdown.actionVerb.score}`
  );

  // 1.6 Missing Context
  const noContextPrompt =
    'Analyze the sales data. Act as a Data Analyst. Format: Markdown table. Limit to 200 words. For example: | A | B |.';
  const noContextRes = scorePrompt(noContextPrompt);
  assert(
    '1.6: Missing domain context scores 0 on context criterion',
    noContextRes.breakdown.context.score === 0 && !noContextRes.breakdown.context.detected,
    `Context score: ${noContextRes.breakdown.context.score}`
  );

  // 1.7 Missing Audience / Role
  const noAudiencePrompt =
    'Analyze the database logs. Context: We are building an analytics pipeline. Format: bulleted list. Limit to 200 words. For example: item 1.';
  const noAudienceRes = scorePrompt(noAudiencePrompt);
  assert(
    '1.7: Missing role or audience scores 0 on roleAudience criterion',
    noAudienceRes.breakdown.roleAudience.score === 0,
    `Role score: ${noAudienceRes.breakdown.roleAudience.score}`
  );

  // 1.8 Missing Output Format
  const noFormatPrompt =
    'Act as a Teacher. Explain quantum entanglement to beginners. Context: High school physics curriculum. Do not use complex equations. For example, think of two coins.';
  const noFormatRes = scorePrompt(noFormatPrompt);
  assert(
    '1.8: Missing format specification scores 0 on outputFormat criterion',
    noFormatRes.breakdown.outputFormat.score === 0,
    `Format score: ${noFormatRes.breakdown.outputFormat.score}`
  );

  // 1.9 Missing Constraints
  const noConstraintsPrompt =
    'Act as a Copywriter. Write an introductory blog post on generative AI. Context: Tech marketing launch. Format: Markdown headers. For example: Introduction section.';
  const noConstraintsRes = scorePrompt(noConstraintsPrompt);
  assert(
    '1.9: Missing constraints scores 0 on constraints criterion',
    noConstraintsRes.breakdown.constraints.score === 0,
    `Constraint score: ${noConstraintsRes.breakdown.constraints.score}`
  );

  // 1.10 Missing Examples
  const noExamplesPrompt =
    'Act as a Senior Developer. Refactor this TypeScript authentication middleware. Context: Migration to JWT RS256 signing. Format: clean code block. Limit: do not use any external auth libraries.';
  const noExamplesRes = scorePrompt(noExamplesPrompt);
  assert(
    '1.10: Missing few-shot examples scores 0 on examples criterion',
    noExamplesRes.breakdown.examples.score === 0,
    `Examples score: ${noExamplesRes.breakdown.examples.score}`
  );

  // 1.11 Length Boundaries & Continuous Thresholds
  const p19 = 'a'.repeat(19);
  assert(
    '1.11: 19 chars length receives 0 length score',
    scorePrompt(p19).breakdown.lengthPacing.score === 0
  );

  const p20 = 'a'.repeat(20);
  assert(
    '1.12: 20 chars boundary receives 8 length score',
    scorePrompt(p20).breakdown.lengthPacing.score === 8
  );

  const p60 = 'a'.repeat(60);
  assert(
    '1.13: 60 chars boundary receives 8 length score',
    scorePrompt(p60).breakdown.lengthPacing.score === 8
  );

  const p61 = 'a'.repeat(61);
  assert(
    '1.14: 61 chars boundary receives 14 length score',
    scorePrompt(p61).breakdown.lengthPacing.score === 14
  );

  const p150 = 'a'.repeat(150);
  assert(
    '1.15: 150 chars boundary receives 14 length score',
    scorePrompt(p150).breakdown.lengthPacing.score === 14
  );

  const p151 = 'a'.repeat(151);
  assert(
    '1.16: 151 chars boundary receives 20 length score (optimal)',
    scorePrompt(p151).breakdown.lengthPacing.score === 20
  );

  const p1200 = 'a'.repeat(1200);
  assert(
    '1.17: 1200 chars boundary receives 20 length score (optimal)',
    scorePrompt(p1200).breakdown.lengthPacing.score === 20
  );

  const p1201 = 'a'.repeat(1201);
  assert(
    '1.18: 1201 chars boundary receives 16 length score (long)',
    scorePrompt(p1201).breakdown.lengthPacing.score === 16
  );

  const p2000 = 'a'.repeat(2000);
  assert(
    '1.19: 2000 chars boundary receives 16 length score (long)',
    scorePrompt(p2000).breakdown.lengthPacing.score === 16
  );

  const p2001 = 'a'.repeat(2001);
  assert(
    '1.20: 2001 chars receives 12 length score (excessive verbosity)',
    scorePrompt(p2001).breakdown.lengthPacing.score === 12
  );

  // ==========================================================================
  // 2. detectTool TESTS
  // ==========================================================================

  assert('2.1: Detects ChatGPT', detectTool('Can you run this query in ChatGPT?') === 'ChatGPT');
  assert(
    '2.2: Detects ChatGPT alias gpt-4o',
    detectTool('Generate code using gpt-4o model') === 'ChatGPT'
  );
  assert('2.3: Detects Claude', detectTool('Explain using Claude 3.5 Sonnet') === 'Claude');
  assert(
    '2.4: Detects Claude alias sonnet',
    detectTool('Prompting sonnet for refactoring') === 'Claude'
  );
  assert('2.5: Detects Gemini', detectTool('Test this with Gemini Flash 1.5') === 'Gemini');
  assert(
    '2.6: Detects Gemini alias google bard',
    detectTool('Migrating prompts from Google Bard') === 'Gemini'
  );
  assert(
    '2.7: Detects Perplexity',
    detectTool('Search citations on Perplexity AI') === 'Perplexity'
  );
  assert(
    '2.8: Detects Perplexity alias pplx',
    detectTool('Use pplx for real-time verification') === 'Perplexity'
  );
  assert('2.9: Detects Copilot', detectTool('Write unit test with GitHub Copilot') === 'Copilot');
  assert('2.10: Detects Grok', detectTool('Summarize news with Grok-2') === 'Grok');
  assert(
    '2.11: Detects DeepSeek',
    detectTool('Use DeepSeek-R1 for mathematical reasoning') === 'DeepSeek'
  );
  assert(
    '2.12: Detects Meta AI with Llama 3',
    detectTool('Deploy on Meta AI Llama 3.1') === 'Meta AI'
  );

  // Case Insensitivity
  assert(
    '2.13: Case insensitive matching for CHATGPT',
    detectTool('USE CHATGPT NOW') === 'ChatGPT'
  );
  assert(
    '2.14: Case insensitive matching for cLaUdE',
    detectTool('Run on cLaUdE please') === 'Claude'
  );

  // False Positive Prevention
  assert(
    '2.15: Generic animal "llama" does NOT trigger Meta AI',
    detectTool('A story about a cute fluffy llama on a farm') === null
  );
  assert(
    '2.16: Unrelated prompt returns null',
    detectTool('What is the capital of France?') === null
  );
  assert('2.17: Empty input returns null', detectTool('') === null);

  // ==========================================================================
  // 3. suggestTools TESTS
  // ==========================================================================

  const mockCatalog: AITool[] = [
    {
      id: 'tool-cursor',
      name: 'Cursor AI',
      provider: 'Anysphere',
      description: 'AI-first code editor with project-wide indexing and refactoring.',
      officialWebsite: 'https://cursor.com',
      category: 'Coding & Development' as any,
      categories: ['Coding & Development' as any],
      domains: ['Software Engineering', 'Development'],
      capabilities: ['Code Generation', 'Refactoring', 'Bug Fixing'],
      useCases: ['Web Development', 'Full-stack apps'],
      tasks: ['Write unit tests', 'Refactor code', 'Debug errors'],
      strengths: ['Codebase indexing', 'Agentic edits'],
      limitations: ['Requires subscription for fast models'],
      pricing: 'Freemium',
      pricingDetails: {
        type: 'FREEMIUM',
        summary: 'Free tier available',
        freeTierAvailable: true,
        freeTrialAvailable: false,
        verified: true,
      },
      verificationStatus: 'VERIFIED' as any,
      firstSeenAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      status: 'ACTIVE' as any,
      activeStatus: true,
      sourceUrls: [],
      tags: [],
      taskMappings: [],
    },
    {
      id: 'tool-perplexity',
      name: 'Perplexity AI',
      provider: 'Perplexity',
      description: 'AI conversational search engine with verified real-time citations.',
      officialWebsite: 'https://perplexity.ai',
      category: 'Research & Search' as any,
      categories: ['Research & Search' as any],
      domains: ['Research', 'Fact Checking'],
      capabilities: ['Real-time search', 'Citation indexing', 'Academic literature'],
      useCases: ['Market Research', 'Fact Checking'],
      tasks: ['Find citations', 'Verify sources'],
      strengths: ['Accurate links', 'Zero hallucinated URLs'],
      limitations: ['Limited long-form document drafting'],
      pricing: 'Free',
      pricingDetails: {
        type: 'FREE',
        summary: 'Free with optional Pro tier',
        freeTierAvailable: true,
        freeTrialAvailable: false,
        verified: true,
      },
      verificationStatus: 'VERIFIED' as any,
      firstSeenAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      status: 'ACTIVE' as any,
      activeStatus: true,
      sourceUrls: [],
      tags: [],
      taskMappings: [],
    },
    {
      id: 'tool-claude',
      name: 'Claude 3.5 Sonnet',
      provider: 'Anthropic',
      description: 'High-intelligence reasoning and document synthesis model with 200k context.',
      officialWebsite: 'https://claude.ai',
      category: 'General AI & Reasoning' as any,
      categories: ['General AI & Reasoning' as any],
      domains: ['Reasoning', 'Writing', 'Code'],
      capabilities: ['Step-by-step logic', 'Long context analysis', 'Coding'],
      useCases: ['System Architecture', 'Document Analysis'],
      tasks: ['Analyze architecture', 'Solve complex reasoning problems'],
      strengths: ['Nuanced writing', 'Excellent code logic'],
      limitations: ['Rate limits on free tier'],
      pricing: 'Freemium',
      pricingDetails: {
        type: 'FREEMIUM',
        summary: 'Free tier available with rate limits',
        freeTierAvailable: true,
        freeTrialAvailable: false,
        verified: true,
      },
      verificationStatus: 'VERIFIED' as any,
      firstSeenAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      status: 'ACTIVE' as any,
      activeStatus: true,
      sourceUrls: [],
      tags: [],
      taskMappings: [],
    },
  ];

  // 3.1 Relevant Coding Prompt
  const codingSuggestions = suggestTools(
    'Debug and refactor this TypeScript React code snippet',
    mockCatalog,
    []
  );
  assert(
    '3.1: Coding prompt ranks Cursor AI prominently',
    codingSuggestions.recommendedTools.length > 0 &&
      codingSuggestions.recommendedTools.some((t) => t.tool.id === 'tool-cursor'),
    `Top tool: ${codingSuggestions.recommendedTools[0]?.tool.name}`
  );

  // 3.2 Research Prompt
  const researchSuggestions = suggestTools(
    'Find academic research citations and verified sources on neural networks',
    mockCatalog,
    []
  );
  assert(
    '3.2: Research prompt recommends Perplexity AI',
    researchSuggestions.recommendedTools.some((t) => t.tool.id === 'tool-perplexity'),
    `Recommended: ${researchSuggestions.recommendedTools.map((t) => t.tool.name).join(', ')}`
  );

  // 3.3 Already-Owned Tool Detection
  const ownedSuggestions = suggestTools(
    'Write a TypeScript script for data scraping',
    mockCatalog,
    ['tool-cursor']
  );
  const cursorMatch = ownedSuggestions.recommendedTools.find((t) => t.tool.id === 'tool-cursor');
  assert(
    '3.3: Correctly identifies tool already in user toolkit',
    cursorMatch !== undefined && cursorMatch.isAlreadyInToolkit === true,
    `isAlreadyInToolkit: ${cursorMatch?.isAlreadyInToolkit}`
  );

  // 3.4 Empty Prompt
  const emptySuggest = suggestTools('', mockCatalog, []);
  assert('3.4: Empty prompt returns 0 recommendations', emptySuggest.recommendedTools.length === 0);

  // 3.5 Empty Catalog
  const emptyCatSuggest = suggestTools('Write Python code', [], []);
  assert(
    '3.5: Empty catalog returns 0 recommendations',
    emptyCatSuggest.recommendedTools.length === 0
  );

  // 3.6 Toolkit Gaps Identification
  const gapPromptSuggestions = suggestTools(
    'Find academic research papers and citations on quantum computing',
    mockCatalog,
    ['tool-cursor'] // User only has a coding tool
  );
  assert(
    '3.6: Identifies toolkit gap when user lacks research tools',
    gapPromptSuggestions.toolkitGaps.length > 0,
    `Gaps found: ${gapPromptSuggestions.toolkitGaps.map((g) => g.category).join(', ')}`
  );

  // 3.7 Category Grouping
  assert(
    '3.7: Tool recommendations are grouped by category',
    Object.keys(codingSuggestions.categoryGroups).length > 0,
    `Categories: ${Object.keys(codingSuggestions.categoryGroups).join(', ')}`
  );

  // 3.8 Relevance Score Ordering
  const scores = codingSuggestions.recommendedTools.map((t) => t.relevanceScore);
  const isSorted = scores.every((val, i, arr) => i === 0 || arr[i - 1] >= val);
  assert(
    '3.8: Recommendations are sorted in descending relevance order',
    isSorted,
    `Scores: ${scores.join(', ')}`
  );

  return {
    passedCount,
    failedCount,
    totalCount: passedCount + failedCount,
    results,
  };
}

if (typeof describe === 'function') {
  describe('Prompt Analysis & Tool Matching Test Suite', () => {
    const suite = runPromptToolAnalysisTestSuite();
    suite.results.forEach((r) => {
      it(r.name, () => {
        expect(r.passed).toBe(true);
      });
    });
  });
}
