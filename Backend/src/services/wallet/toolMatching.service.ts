import { AITool, RequirementProfile, SearchIntent, ToolMatchResult, ToolSearchResult } from '../../types';
import { ToolCatalogService } from './toolCatalog.service';
import { SearchIntentService } from './searchIntent.service';
import { RequirementUnderstandingService } from './requirementUnderstanding.service';
import { ToolRankingService } from './toolRanking.service';
import { ExplanationService } from './explanationService';

/**
 * Tool Matching Service — Verified Requirement & Intent Pipeline Engine
 * Pipeline Architecture:
 * Natural Language Query
 *   ↓
 * SearchIntentService (Intent Extraction)
 *   ↓
 * RequirementUnderstandingService (Requirement Profile)
 *   ↓
 * Candidate Tool Catalog Retrieval
 *   ↓
 * ToolRankingService (Multi-Signal Verified Matcher & Ranker)
 *   ↓
 * ExplanationService (Evidence-Backed Match Rationale)
 *   ↓
 * Safe Development Logging & Result Presentation
 */
export class ToolMatchingService {
  /**
   * Primary entry point for requirement-first tool search
   */
  public static searchTools(query: string, userWalletToolIds: string[] = []): ToolSearchResult {
    const rawQuery = query || '';
    
    // 1. Intent Extraction
    const intent: SearchIntent = SearchIntentService.extractIntent(rawQuery);

    // 2. Requirement Understanding
    const profile: RequirementProfile = RequirementUnderstandingService.buildRequirementProfile(intent);

    // 3. Tool Catalog Candidate Retrieval
    const catalog: AITool[] = ToolCatalogService.getCatalog();

    // 4. Tool Ranking & Multi-Signal Matching
    let rankedMatches: ToolMatchResult[] = ToolRankingService.rankTools(catalog, profile);

    // Alternative tool handling ("something like ChatGPT for research")
    if (intent.comparisonIntent?.type === 'alternative' && intent.comparisonIntent.referenceTool) {
      const refToolName = intent.comparisonIntent.referenceTool.toLowerCase();
      rankedMatches = rankedMatches.map(match => {
        if (match.tool.name.toLowerCase().includes(refToolName) || match.tool.id.toLowerCase().includes(refToolName)) {
          // Downrank the reference tool itself when looking for alternatives
          const newScore = Math.max(20, match.matchScore - 40);
          return {
            ...match,
            matchScore: newScore,
            relevanceScore: newScore,
            matchLabel: 'Potential match'
          };
        }
        return match;
      });
      // Re-sort after downranking reference tool
      rankedMatches.sort((a, b) => b.matchScore - a.matchScore);
    }

    // Filter out tools that do not satisfy the minimum quality threshold (Item 11: No forced results)
    const validMatches = rankedMatches.filter(m => m.matchScore >= 45);

    // 5. Generate Evidence-Backed Explanations for valid matches
    for (const match of validMatches) {
      match.whyMatches = ExplanationService.generateExplanation(match.tool, profile, match);
      // Legacy compatibility fields
      match.matchReason = match.whyMatches[0] || `Matches requirements for ${match.tool.category}`;
      match.matchedDomains = [profile.domain];
      match.isExactRequirementMatch = match.matchScore >= 70;
    }

    // Limit to top 8 strong matches
    const topMatches = validMatches.slice(0, 8);

    // Handle tool combinations for multi-intent queries
    const toolCombinations = this.deriveToolCombinationsIfNeeded(intent, topMatches.map(m => m.tool));

    // Handle empty state suggestions
    let suggestionsIfNoMatches: string[] | undefined = undefined;
    if (topMatches.length === 0) {
      suggestionsIfNoMatches = [
        'No strong match found for your exact requirements.',
        'Try removing strict price constraints (e.g. "free only").',
        'Broaden your task description (e.g., search for "research" instead of specific paper titles).'
      ];
    }

    // 6. Safe Development Debug Logging (Item 21)
    this.safeDebugLog(rawQuery, intent, profile, topMatches);

    return {
      query: intent.originalQuery,
      intent,
      totalMatches: topMatches.length,
      matches: topMatches,
      toolCombinations,
      suggestionsIfNoMatches
    };
  }

  /**
   * Safe Debug Logging (Omits private learner data, API keys, passwords)
   */
  private static safeDebugLog(rawQuery: string, intent: SearchIntent, profile: RequirementProfile, topMatches: ToolMatchResult[]): void {
    if (process.env.NODE_ENV !== 'production') {
      console.log('=== [AINOVA SEARCH INTENT & MATCHING PIPELINE LOG] ===');
      console.log('Original Query:', rawQuery);
      console.log('Normalized Intent:', intent.intent);
      console.log('Primary Goal:', profile.goal);
      console.log('Tasks:', profile.workflow);
      console.log('Required Capabilities:', profile.requiredCapabilities);
      console.log('Domain:', profile.domain, `(${profile.domainSpecificity})`);
      console.log('Constraints:', JSON.stringify(profile.constraints));
      console.log('Ambiguity Level:', profile.ambiguityLevel);
      if (topMatches.length > 0) {
        console.log('Top Match:', topMatches[0].tool.name, `| Score: ${topMatches[0].matchScore}% | Label: ${topMatches[0].matchLabel} | Conf: ${topMatches[0].confidence} | Coverage: ${topMatches[0].evidenceCoverage}`);
      } else {
        console.log('Top Match: NONE (No strong match found)');
      }
      console.log('======================================================');
    }
  }

  /**
   * Generates tool combination workflows when user requirement spans multiple distinct domains
   */
  private static deriveToolCombinationsIfNeeded(intent: SearchIntent, topTools: AITool[]): {
    workflowTitle: string;
    explanation: string;
    suggestedTools: AITool[];
  }[] | undefined {
    if ((intent.domain && intent.domain.length >= 2) || (intent.tasks.includes('Research') && intent.tasks.includes('Presentation Creation'))) {
      const researchTool = topTools.find(t => t.category === 'Research & RAG');
      const presTool = topTools.find(t => t.category === 'Presentation');
      const dataTool = topTools.find(t => t.category === 'Data Analysis');

      if (researchTool && presTool) {
        return [
          {
            workflowTitle: '2-Tool Multi-Domain Workflow: Research → Presentation',
            explanation: `Use ${researchTool.name} to extract zero-hallucination insights from your documents, then pass the outline to ${presTool.name} to automatically generate your slide deck.`,
            suggestedTools: [researchTool, presTool]
          }
        ];
      }

      if (researchTool && dataTool) {
        return [
          {
            workflowTitle: '2-Tool Multi-Domain Workflow: Research → Data Analysis',
            explanation: `Use ${researchTool.name} for literature review and ${dataTool.name} to execute sandbox Python scripts and interactive charts.`,
            suggestedTools: [researchTool, dataTool]
          }
        ];
      }
    }

    return undefined;
  }
}

