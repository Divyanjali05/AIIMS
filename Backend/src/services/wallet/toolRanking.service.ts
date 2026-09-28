import { AITool, RequirementProfile, ToolMatchResult } from '../../types';

export interface RankingWeights {
  capabilityMatch: number; // e.g. 0.30
  taskWorkflowMatch: number; // e.g. 0.20
  outputMatch: number; // e.g. 0.15
  constraintMatch: number; // e.g. 0.10
  inputMatch: number; // e.g. 0.10
  domainMatch: number; // e.g. 0.05
  verifiedEvidence: number; // e.g. 0.05
  freshness: number; // e.g. 0.05
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  capabilityMatch: 0.30,
  taskWorkflowMatch: 0.20,
  outputMatch: 0.15,
  constraintMatch: 0.10,
  inputMatch: 0.10,
  domainMatch: 0.05,
  verifiedEvidence: 0.05,
  freshness: 0.05
};

/**
 * Tool Ranking Service — Verified Requirement & Capability Matching Engine
 * Ranks candidates strictly based on requirement satisfaction, verified capabilities, and multi-signal score.
 */
export class ToolRankingService {
  /**
   * Rank a list of candidate tools against a RequirementProfile
   */
  public static rankTools(
    tools: AITool[],
    profile: RequirementProfile,
    weights: RankingWeights = DEFAULT_RANKING_WEIGHTS
  ): ToolMatchResult[] {
    const results: ToolMatchResult[] = [];

    for (const tool of tools) {
      const matchResult = this.evaluateToolMatch(tool, profile, weights);
      results.push(matchResult);
    }

    // Sort descending by matchScore, then by evidenceCoverage
    results.sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      if (b.evidenceCoverage !== a.evidenceCoverage) return b.evidenceCoverage - a.evidenceCoverage;
      return b.confidence - a.confidence;
    });

    return results;
  }

  /**
   * Evaluates match for a single tool
   */
  public static evaluateToolMatch(
    tool: AITool,
    profile: RequirementProfile,
    weights: RankingWeights = DEFAULT_RANKING_WEIGHTS
  ): ToolMatchResult {
    // 1. Capability Match Score (0 to 1)
    const capabilityScore = this.calculateCapabilityMatch(tool, profile.requiredCapabilities);

    // 2. Task/Workflow Match Score (0 to 1)
    const taskScore = this.calculateTaskMatch(tool, profile.workflow);

    // 3. Output Compatibility Score (0 to 1)
    const outputScore = this.calculateOutputMatch(tool, profile.desiredOutput);

    // 4. Constraint Compatibility Score (0 to 1)
    const constraintScore = this.calculateConstraintMatch(tool, profile.constraints);

    // 5. Input Compatibility Score (0 to 1)
    const inputScore = this.calculateInputMatch(tool, profile);

    // 6. Domain Compatibility Score (0 to 1)
    const domainScore = this.calculateDomainMatch(tool, profile.domain, profile.domainSpecificity);

    // 7. Verified Evidence Coverage (0 to 1)
    const evidenceCoverage = this.calculateEvidenceCoverage(tool, profile.requiredCapabilities);

    // 8. Freshness Score (0 to 1)
    const freshnessScore = this.calculateFreshnessScore(tool);

    // Weighted Combined Match Score (0 to 100)
    const rawWeightedScore =
      capabilityScore * weights.capabilityMatch +
      taskScore * weights.taskWorkflowMatch +
      outputScore * weights.outputMatch +
      constraintScore * weights.constraintMatch +
      inputScore * weights.inputMatch +
      domainScore * weights.domainMatch +
      evidenceCoverage * weights.verifiedEvidence +
      freshnessScore * weights.freshness;

    const matchScore = Math.min(100, Math.max(0, Math.round(rawWeightedScore * 100)));

    // Confidence Calculation (based on verification status, source count, evidence coverage)
    let baseConfidence = tool.verificationStatus === 'VERIFIED' ? 0.90 : tool.verificationStatus === 'COMMUNITY_VERIFIED' ? 0.75 : 0.60;
    if (evidenceCoverage > 0.7) baseConfidence += 0.08;
    const confidence = Math.min(0.99, Math.round(baseConfidence * 100) / 100);

    // Human-friendly Match Label
    let matchLabel: 'Strong match' | 'Good match' | 'Potential match' = 'Potential match';
    if (matchScore >= 75 && evidenceCoverage >= 0.5) {
      matchLabel = 'Strong match';
    } else if (matchScore >= 55) {
      matchLabel = 'Good match';
    }

    return {
      tool,
      relevanceScore: matchScore, // legacy field
      matchScore,
      confidence,
      evidenceCoverage: Math.round(evidenceCoverage * 100) / 100,
      matchLabel,
      matchReason: `Matches requirements for ${tool.category}`,
      whyMatches: [], // Filled by ExplanationService
      matchedCapabilities: this.extractMatchedCapabilities(tool, profile.requiredCapabilities),
      missingCapabilities: this.extractMissingCapabilities(tool, profile.requiredCapabilities),
      matchedDomains: [profile.domain],
      isExactRequirementMatch: matchScore >= 70
    };
  }

  private static calculateCapabilityMatch(tool: AITool, requiredCapabilities: string[]): number {
    if (!requiredCapabilities || requiredCapabilities.length === 0) return 0.8;
    const toolCaps = (tool.capabilities || []).map(c => c.toLowerCase());
    let matchedCount = 0;

    for (const reqCap of requiredCapabilities) {
      const normalizedReq = reqCap.toLowerCase().replace(/_/g, ' ');
      const isMatched = toolCaps.some(tc => {
        const normTC = tc.replace(/_/g, ' ');
        return normTC.includes(normalizedReq) || normalizedReq.includes(normTC);
      });
      if (isMatched) {
        matchedCount++;
      } else {
        // Partial semantic keyword match in description/tasks
        const inDesc = (tool.description || '').toLowerCase().includes(normalizedReq);
        const inTasks = (tool.tasks || []).some(t => t.toLowerCase().includes(normalizedReq));
        if (inDesc || inTasks) {
          matchedCount += 0.5;
        }
      }
    }

    return Math.min(1.0, matchedCount / requiredCapabilities.length);
  }

  private static calculateTaskMatch(tool: AITool, workflow: string[]): number {
    if (!workflow || workflow.length === 0) return 0.8;
    const toolTasks = (tool.tasks || []).concat(tool.useCases || []).map(t => t.toLowerCase());
    let score = 0;

    for (const wfStep of workflow) {
      const normStep = wfStep.toLowerCase().replace(/_/g, ' ');
      const matched = toolTasks.some(tt => tt.includes(normStep) || normStep.includes(tt));
      if (matched) score += 1.0;
      else {
        const inDesc = (tool.description || '').toLowerCase().includes(normStep);
        if (inDesc) score += 0.4;
      }
    }

    return Math.min(1.0, score / workflow.length);
  }

  private static calculateOutputMatch(tool: AITool, desiredOutput: string): number {
    if (!desiredOutput) return 0.8;
    const normDesired = desiredOutput.toLowerCase();
    const toolOutputs = (tool.outputTypes || []).map(o => o.toLowerCase());
    const matched = toolOutputs.some(to => normDesired.includes(to) || to.includes(normDesired));
    if (matched) return 1.0;
    
    const textMatch = (tool.description || '').toLowerCase().includes(normDesired);
    return textMatch ? 0.6 : 0.4;
  }

  private static calculateInputMatch(tool: AITool, profile: RequirementProfile): number {
    if (!tool.inputTypes || tool.inputTypes.length === 0) return 0.8;
    return 0.9;
  }

  private static calculateConstraintMatch(tool: AITool, constraints: any): number {
    if (!constraints) return 1.0;
    let score = 1.0;

    if (constraints.freeOnly) {
      if (tool.pricingDetails?.type === 'FREE' || tool.pricingDetails?.freeTierAvailable) {
        score += 0.1;
      } else {
        score -= 0.4;
      }
    }

    if (constraints.freeTrial && tool.pricingDetails?.freeTrialAvailable) {
      score += 0.1;
    }

    if (constraints.noCode && tool.tags?.includes('no-code')) {
      score += 0.1;
    }

    return Math.min(1.0, Math.max(0.0, score));
  }

  private static calculateDomainMatch(tool: AITool, domain: string, specificity: string): number {
    if (specificity === 'unspecified' || domain === 'General') return 0.8;
    const toolDomains = (tool.domains || []).map(d => d.toLowerCase());
    const normDomain = domain.toLowerCase();

    if (toolDomains.some(td => td.includes(normDomain) || normDomain.includes(td))) {
      return 1.0;
    }
    return 0.5;
  }

  private static calculateEvidenceCoverage(tool: AITool, requiredCapabilities: string[]): number {
    if (tool.verificationStatus !== 'VERIFIED') return 0.5;
    if (!requiredCapabilities || requiredCapabilities.length === 0) return 0.8;

    const verifiedCaps = (tool.capabilities || []).map(c => c.toLowerCase());
    let matched = 0;
    for (const req of requiredCapabilities) {
      const normReq = req.toLowerCase().replace(/_/g, ' ');
      if (verifiedCaps.some(vc => vc.includes(normReq) || normReq.includes(vc))) {
        matched++;
      }
    }
    return Math.min(1.0, matched / requiredCapabilities.length);
  }

  private static calculateFreshnessScore(tool: AITool): number {
    if (!tool.lastVerifiedAt) return 0.7;
    const verifiedDate = new Date(tool.lastVerifiedAt).getTime();
    const now = Date.now();
    const daysOld = (now - verifiedDate) / (1000 * 3600 * 24);
    if (daysOld < 30) return 1.0;
    if (daysOld < 90) return 0.85;
    return 0.70;
  }

  private static extractMatchedCapabilities(tool: AITool, requiredCapabilities: string[]): string[] {
    const toolCaps = (tool.capabilities || []).map(c => c.toLowerCase());
    return requiredCapabilities.filter(req => {
      const normReq = req.toLowerCase().replace(/_/g, ' ');
      return toolCaps.some(tc => tc.includes(normReq) || normReq.includes(tc));
    });
  }

  private static extractMissingCapabilities(tool: AITool, requiredCapabilities: string[]): string[] {
    const matched = this.extractMatchedCapabilities(tool, requiredCapabilities);
    return requiredCapabilities.filter(req => !matched.includes(req));
  }
}
