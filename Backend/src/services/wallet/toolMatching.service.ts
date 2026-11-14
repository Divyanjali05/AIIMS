import {
  AITool,
  RequirementProfile,
  SearchIntent,
  ToolMatchResult,
  ToolSearchResult,
} from '../../types';
import { ToolCatalogService } from './toolCatalog.service';
import { SearchIntentService } from './searchIntent.service';
import { RequirementUnderstandingService } from './requirementUnderstanding.service';
import { ToolRankingService } from './toolRanking.service';
import { ExplanationService } from './explanationService';

export interface PersonalizedRecommendationItem {
  toolId: string;
  name: string;
  provider: string;
  domain: string;
  skillTier: 'beginner' | 'advanced';
  pricing: {
    type: string;
    summary: string;
    freeTierAvailable: boolean;
  };
  whyMatches: string[];
  capabilities: string[];
  officialWebsite: string;
  isFreeOrLowCost: boolean;
  lastVerifiedAt?: string;
}

export interface PersonalizedDomainMatchingResult {
  domain: string;
  isPersonalized: boolean;
  profileSource: 'PERSISTENT_AI_PROFILE' | 'GENERAL_DOMAIN_FALLBACK';
  learnerGoal: string;
  learnerSkillLevel: string;
  recommendations: {
    beginner: PersonalizedRecommendationItem[];
    advanced: PersonalizedRecommendationItem[];
  };
  totalMatches: number;
}

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
  public static searchTools(query: string, _userWalletToolIds: string[] = []): ToolSearchResult {
    const rawQuery = query || '';

    // 1. Intent Extraction
    const intent: SearchIntent = SearchIntentService.extractIntent(rawQuery);

    // 2. Requirement Understanding
    const profile: RequirementProfile =
      RequirementUnderstandingService.buildRequirementProfile(intent);

    // 3. Tool Catalog Candidate Retrieval — strictly active, verified tools only
    const catalog: AITool[] = ToolCatalogService.getCatalog().filter(
      (t) =>
        t.activeStatus &&
        t.verificationStatus !== 'UNVERIFIED' &&
        t.verificationStatus !== 'DISCOVERED' &&
        t.verificationStatus !== 'REJECTED'
    );

    // 4. Tool Ranking & Multi-Signal Matching
    let rankedMatches: ToolMatchResult[] = ToolRankingService.rankTools(catalog, profile);

    // Alternative tool handling ("something like ChatGPT for research")
    if (intent.comparisonIntent?.type === 'alternative' && intent.comparisonIntent.referenceTool) {
      const refToolName = intent.comparisonIntent.referenceTool.toLowerCase();
      rankedMatches = rankedMatches.map((match) => {
        if (
          match.tool.name.toLowerCase().includes(refToolName) ||
          match.tool.id.toLowerCase().includes(refToolName)
        ) {
          // Downrank the reference tool itself when looking for alternatives
          const newScore = Math.max(20, match.matchScore - 40);
          return {
            ...match,
            matchScore: newScore,
            relevanceScore: newScore,
            matchLabel: 'Potential match',
          };
        }
        return match;
      });
      // Re-sort after downranking reference tool
      rankedMatches.sort((a, b) => b.matchScore - a.matchScore);
    }

    // Filter out tools that do not satisfy the minimum quality threshold (Item 11: No forced results)
    const validMatches = rankedMatches.filter((m) => m.matchScore >= 45);

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
    const toolCombinations = this.deriveToolCombinationsIfNeeded(
      intent,
      topMatches.map((m) => m.tool)
    );

    // Handle empty state suggestions
    let suggestionsIfNoMatches: string[] | undefined = undefined;
    if (topMatches.length === 0) {
      suggestionsIfNoMatches = [
        'No strong match found for your exact requirements.',
        'Try removing strict price constraints (e.g. "free only").',
        'Broaden your task description (e.g., search for "research" instead of specific paper titles).',
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
      suggestionsIfNoMatches,
    };
  }

  /**
   * Safe Debug Logging (Omits private learner data, API keys, passwords)
   */
  private static safeDebugLog(
    rawQuery: string,
    intent: SearchIntent,
    profile: RequirementProfile,
    topMatches: ToolMatchResult[]
  ): void {
    if (process.env.NODE_ENV !== 'production') {
      console.log('=== [AIIMS SEARCH INTENT & MATCHING PIPELINE LOG] ===');
      console.log('Original Query:', rawQuery);
      console.log('Normalized Intent:', intent.intent);
      console.log('Primary Goal:', profile.goal);
      console.log('Tasks:', profile.workflow);
      console.log('Required Capabilities:', profile.requiredCapabilities);
      console.log('Domain:', profile.domain, `(${profile.domainSpecificity})`);
      console.log('Constraints:', JSON.stringify(profile.constraints));
      console.log('Ambiguity Level:', profile.ambiguityLevel);
      if (topMatches.length > 0) {
        console.log(
          'Top Match:',
          topMatches[0].tool.name,
          `| Score: ${topMatches[0].matchScore}% | Label: ${topMatches[0].matchLabel} | Conf: ${topMatches[0].confidence} | Coverage: ${topMatches[0].evidenceCoverage}`
        );
      } else {
        console.log('Top Match: NONE (No strong match found)');
      }
      console.log('======================================================');
    }
  }

  /**
   * Generates tool combination workflows when user requirement spans multiple distinct domains
   */
  private static deriveToolCombinationsIfNeeded(
    intent: SearchIntent,
    topTools: AITool[]
  ):
    | {
        workflowTitle: string;
        explanation: string;
        suggestedTools: AITool[];
      }[]
    | undefined {
    if (
      (intent.domain && intent.domain.length >= 2) ||
      (intent.tasks.includes('Research') &&
        (intent.tasks.includes('Presentation Creation') ||
          intent.tasks.includes('Slide Deck Generation'))) ||
      intent.intent.includes('multi-step') ||
      intent.primaryGoal.includes('Multi-Task')
    ) {
      const allCatalog = ToolCatalogService.getCatalog();
      const researchTool =
        topTools.find((t) => t.category === 'Research & RAG') ||
        allCatalog.find((t) => t.category === 'Research & RAG');
      const presTool =
        topTools.find((t) => t.category === 'Presentation') ||
        allCatalog.find((t) => t.category === 'Presentation');
      const dataTool =
        topTools.find((t) => t.category === 'Data Analysis') ||
        allCatalog.find((t) => t.category === 'Data Analysis');

      if (researchTool && presTool) {
        return [
          {
            workflowTitle: '2-Tool Multi-Domain Workflow: Research → Presentation',
            explanation: `Use ${researchTool.name} to extract zero-hallucination insights from your documents, then pass the outline to ${presTool.name} to automatically generate your slide deck.`,
            suggestedTools: [researchTool, presTool],
          },
        ];
      }

      if (researchTool && dataTool) {
        return [
          {
            workflowTitle: '2-Tool Multi-Domain Workflow: Research → Data Analysis',
            explanation: `Use ${researchTool.name} for literature review and ${dataTool.name} to execute sandbox Python scripts and interactive charts.`,
            suggestedTools: [researchTool, dataTool],
          },
        ];
      }
    }

    return undefined;
  }

  /**
   * Personalized Tool Matching for Video Editing, Data Analytics, and Graphic Design.
   * Phase 3 requirement: Match tools based on learner goals and skill level,
   * distinguishing beginner vs advanced, highlighting free/low-cost options,
   * and reusing the Phase 2 Persistent AI Learner Profile where available.
   * Fallback: Provides grounded general recommendations if profile is absent (no hallucinated profiles).
   */
  public static getPersonalizedDomainRecommendations(params: {
    domain?: string;
    learnerProfile?: any;
    targetGoal?: string;
    skillLevel?: 'beginner' | 'intermediate' | 'advanced';
    freeOnly?: boolean;
  }): PersonalizedDomainMatchingResult[] {
    const rawDomain = (params.domain || 'All').trim();
    const isProfilePresent = Boolean(
      params.learnerProfile &&
      (params.learnerProfile.executiveSummary ||
        params.learnerProfile.summary ||
        params.learnerProfile.topCapability ||
        params.learnerProfile.recommendedFocusTrack ||
        params.learnerProfile.recommendedFocus ||
        params.learnerProfile.strengths)
    );

    const goal =
      params.targetGoal ||
      params.learnerProfile?.targetGoal ||
      params.learnerProfile?.recommendedFocus ||
      params.learnerProfile?.recommendedFocusTrack ||
      'Master industry AI workflows';

    const learnerSkill =
      params.skillLevel ||
      params.learnerProfile?.skillLevel ||
      (params.learnerProfile?.demonstratedStrengths?.length > 2 ||
      params.learnerProfile?.strengths?.length > 2
        ? 'advanced'
        : 'beginner');

    // Canonical targets: 1) Video Editing, 2) Data Analytics, 3) Graphic Design
    const targetDomains =
      rawDomain.toLowerCase() === 'all'
        ? ['Video Editing', 'Data Analytics', 'Graphic Design']
        : [rawDomain];

    // Filter catalog for active & verified tools only
    const allCatalog = ToolCatalogService.getCatalog().filter(
      (t) =>
        t.activeStatus &&
        t.verificationStatus !== 'UNVERIFIED' &&
        t.verificationStatus !== 'DISCOVERED' &&
        t.verificationStatus !== 'REJECTED'
    );

    const results: PersonalizedDomainMatchingResult[] = [];

    for (const d of targetDomains) {
      const dLower = d.toLowerCase();

      // Find candidates for this domain
      const candidates = allCatalog.filter((t) => {
        if (
          params.freeOnly &&
          t.pricingDetails.type !== 'FREE' &&
          !t.pricingDetails.freeTierAvailable
        ) {
          return false;
        }

        if (dLower.includes('video')) {
          return (
            t.category === 'Video' ||
            (t.domains || []).some((dm) => dm.toLowerCase().includes('video')) ||
            t.id === 'tool-runway' ||
            t.id === 'tool-descript'
          );
        }
        if (dLower.includes('data')) {
          return (
            t.category === 'Data Analysis' ||
            (t.domains || []).some((dm) => dm.toLowerCase().includes('data')) ||
            t.id === 'tool-julius' ||
            t.id === 'tool-chatgpt'
          );
        }
        if (dLower.includes('graphic') || dLower.includes('design') || dLower.includes('image')) {
          return (
            t.category === 'Image & Vision' ||
            (t.domains || []).some(
              (dm) => dm.toLowerCase().includes('design') || dm.toLowerCase().includes('graphic')
            ) ||
            t.id === 'tool-midjourney' ||
            t.id === 'tool-canva'
          );
        }

        // Generic fallback for any other valid domain
        return (
          t.category.toLowerCase().includes(dLower) ||
          (t.domains || []).some((dm) => dm.toLowerCase().includes(dLower))
        );
      });

      // Split into beginner and advanced tiers
      const beginnerTools: PersonalizedRecommendationItem[] = [];
      const advancedTools: PersonalizedRecommendationItem[] = [];

      for (const tool of candidates) {
        const isBeginnerFriendly =
          tool.skillLevel?.toLowerCase().includes('beginner') ||
          tool.id === 'tool-canva' ||
          tool.id === 'tool-descript' ||
          tool.id === 'tool-gamma' ||
          (tool.capabilities || []).some(
            (c) => c.toLowerCase().includes('drag-and-drop') || c.toLowerCase().includes('template')
          );

        const skillTier: 'beginner' | 'advanced' = isBeginnerFriendly ? 'beginner' : 'advanced';

        // Grounded explanation tailored to learner profile or general domain
        const whyMatches: string[] = [];
        if (isProfilePresent) {
          whyMatches.push(`Tailored to your goal of "${goal}".`);
          const strengths =
            params.learnerProfile?.strengths || params.learnerProfile?.demonstratedStrengths;
          if (Array.isArray(strengths) && strengths.length > 0) {
            whyMatches.push(`Builds on demonstrated strength: ${strengths[0]}.`);
          }
          if (skillTier === 'beginner') {
            whyMatches.push(
              `Recommended entry-level tool with intuitive controls to accelerate workflow adoption.`
            );
          } else {
            whyMatches.push(
              `High-leverage advanced platform supporting granular parameters and production asset generation.`
            );
          }
          if (tool.pricingDetails.freeTierAvailable) {
            whyMatches.push(`Verified free tier available (${tool.pricingDetails.summary}).`);
          } else {
            whyMatches.push(`Commercial pro tier (${tool.pricingDetails.summary}).`);
          }
        } else {
          whyMatches.push(
            `Grounded general ${skillTier} recommendation for ${d} from the verified AIIMS catalog.`
          );
          if (skillTier === 'beginner') {
            whyMatches.push(`Features accessible templates and low friction onboarding.`);
          } else {
            whyMatches.push(
              `Engineered for deep customization, high fidelity, and professional control.`
            );
          }
          if (tool.pricingDetails.freeTierAvailable) {
            whyMatches.push(`Verified free tier accessible with zero upfront credit cost.`);
          }
        }

        const item: PersonalizedRecommendationItem = {
          toolId: tool.id,
          name: tool.name,
          provider: tool.provider,
          domain: d,
          skillTier,
          pricing: {
            type: tool.pricingDetails.type,
            summary: tool.pricingDetails.summary || tool.pricing || 'Free tier available',
            freeTierAvailable: Boolean(tool.pricingDetails.freeTierAvailable),
          },
          whyMatches,
          capabilities: tool.capabilities || [],
          officialWebsite: tool.officialWebsite || tool.websiteUrl || '',
          isFreeOrLowCost:
            tool.pricingDetails.type === 'FREE' ||
            Boolean(tool.pricingDetails.freeTierAvailable) ||
            (tool.pricingDetails.startingPriceMonthlyUsd !== undefined &&
              tool.pricingDetails.startingPriceMonthlyUsd <= 15),
          lastVerifiedAt: tool.pricingDetails.lastVerifiedAt || tool.lastVerifiedAt,
        };

        if (skillTier === 'beginner') {
          beginnerTools.push(item);
        } else {
          advancedTools.push(item);
        }
      }

      // If one tier is empty, populate appropriately from candidates
      if (beginnerTools.length === 0 && advancedTools.length > 1) {
        beginnerTools.push({ ...advancedTools.pop()!, skillTier: 'beginner' });
      } else if (advancedTools.length === 0 && beginnerTools.length > 1) {
        advancedTools.push({ ...beginnerTools.pop()!, skillTier: 'advanced' });
      }

      results.push({
        domain: d,
        isPersonalized: isProfilePresent,
        profileSource: isProfilePresent ? 'PERSISTENT_AI_PROFILE' : 'GENERAL_DOMAIN_FALLBACK',
        learnerGoal: goal,
        learnerSkillLevel: learnerSkill,
        recommendations: {
          beginner: beginnerTools,
          advanced: advancedTools,
        },
        totalMatches: beginnerTools.length + advancedTools.length,
      });
    }

    return results;
  }
}
