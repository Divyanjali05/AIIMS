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
    let rawWeightedScore =
      capabilityScore * weights.capabilityMatch +
      taskScore * weights.taskWorkflowMatch +
      outputScore * weights.outputMatch +
      constraintScore * weights.constraintMatch +
      inputScore * weights.inputMatch +
      domainScore * weights.domainMatch +
      evidenceCoverage * weights.verifiedEvidence +
      freshnessScore * weights.freshness;

    // HARD REQUIREMENT GATING:
    // A discovered or catalog tool MUST NOT receive a strong match score unless its supported
    // capabilities provide evidence for the requested task.
    if (profile.requiredCapabilities && profile.requiredCapabilities.length > 0) {
      if (capabilityScore === 0) {
        // Zero capability match completely disqualifies the tool from being recommended
        rawWeightedScore = Math.min(rawWeightedScore * 0.25, 0.20);
      } else if (capabilityScore < 0.35) {
        // Poor capability match caps the score below standard recommendation threshold
        rawWeightedScore = Math.min(rawWeightedScore, 0.40);
      }
    }

    // Heavy penalty for unverified candidates attempting to enter recommendations
    if (tool.verificationStatus === 'UNVERIFIED' || tool.verificationStatus === 'DISCOVERED' || !tool.activeStatus) {
      rawWeightedScore = Math.min(rawWeightedScore * 0.3, 0.25);
    }

    const matchScore = Math.min(100, Math.max(0, Math.round(rawWeightedScore * 100)));

    // Confidence Calculation (based on verification status, source count, evidence coverage)
    let baseConfidence = (tool.verificationStatus === 'VERIFIED' || tool.verificationStatus === 'VERIFIED_SEED')
      ? 0.90
      : tool.verificationStatus === 'COMMUNITY_VERIFIED'
      ? 0.65
      : 0.20;
    if (evidenceCoverage > 0.7 && tool.verificationStatus === 'VERIFIED') baseConfidence += 0.08;
    const confidence = Math.min(0.99, Math.round(baseConfidence * 100) / 100);

    // Human-friendly Match Label — only allow strong match if capabilityScore is high
    let matchLabel: 'Strong match' | 'Good match' | 'Potential match' = 'Potential match';
    if (matchScore >= 75 && evidenceCoverage >= 0.5 && capabilityScore >= 0.5) {
      matchLabel = 'Strong match';
    } else if (matchScore >= 55 && capabilityScore >= 0.3) {
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
      isExactRequirementMatch: matchScore >= 70 && capabilityScore >= 0.6
    };
  }

  private static calculateCapabilityMatch(tool: AITool, requiredCapabilities: string[]): number {
    if (!requiredCapabilities || requiredCapabilities.length === 0) return 0.5;
    const toolCaps = (tool.capabilities || []).map(c => c.toLowerCase());
    const toolTasks = (tool.tasks || []).concat(tool.useCases || []).map(t => t.toLowerCase());
    const toolDesc = (tool.description || '').toLowerCase();
    let matchedCount = 0;

    for (const reqCap of requiredCapabilities) {
      const normalizedReq = reqCap.toLowerCase().replace(/_/g, ' ');
      // Direct capability match
      const isMatched = toolCaps.some(tc => {
        const normTC = tc.replace(/_/g, ' ');
        return normTC.includes(normalizedReq) || normalizedReq.includes(normTC);
      });

      if (isMatched) {
        matchedCount += 1.0;
      } else {
        // Morphological & task-level match (e.g. document_analysis -> analyze document)
        const words = normalizedReq.split(' ').filter(w => w.length > 2);
        const matchesInTasks = toolTasks.some(task =>
          words.every(w => task.includes(w) || (w === 'analysis' && task.includes('analyze')) || (w === 'summarization' && task.includes('summarize')))
        );
        if (matchesInTasks) {
          matchedCount += 0.85;
        } else {
          const matchesInDesc = words.every(w =>
            toolDesc.includes(w) || (w === 'analysis' && toolDesc.includes('analyze')) || (w === 'summarization' && toolDesc.includes('summarize'))
          );
          if (matchesInDesc) {
            matchedCount += 0.65;
          }
        }
      }
    }

    return Math.min(1.0, matchedCount / requiredCapabilities.length);
  }

  private static calculateTaskMatch(tool: AITool, workflow: string[]): number {
    if (!workflow || workflow.length === 0) return 0.5;
    const toolTasks = (tool.tasks || []).concat(tool.useCases || []).map(t => t.toLowerCase());
    if (toolTasks.length === 0) return 0.1;
    let score = 0;

    for (const wfStep of workflow) {
      const normStep = wfStep.toLowerCase().replace(/_/g, ' ');
      const matched = toolTasks.some(tt => tt.includes(normStep) || normStep.includes(tt));
      if (matched) score += 1.0;
      else {
        const inDesc = (tool.description || '').toLowerCase().includes(normStep);
        if (inDesc) score += 0.3;
      }
    }

    return Math.min(1.0, score / workflow.length);
  }

  private static calculateOutputMatch(tool: AITool, desiredOutput: string): number {
    if (!desiredOutput) return 0.6;
    const normDesired = desiredOutput.toLowerCase();
    const toolOutputs = (tool.outputTypes || []).map(o => o.toLowerCase());
    const matched = toolOutputs.some(to => normDesired.includes(to) || to.includes(normDesired));
    if (matched) return 1.0;
    
    const textMatch = (tool.description || '').toLowerCase().includes(normDesired);
    return textMatch ? 0.5 : 0.2;
  }

  private static calculateInputMatch(tool: AITool, profile: RequirementProfile): number {
    const goal = (profile.goal || '').toLowerCase();
    const isDocQuery = goal.includes('pdf') || goal.includes('document');
    if (isDocQuery) {
      const desc = (tool.description || '').toLowerCase();
      const caps = (tool.capabilities || []).map(c => c.toLowerCase()).join(' ');
      const hasDocInput = desc.includes('pdf') || desc.includes('document') || caps.includes('pdf') || caps.includes('document') || caps.includes('rag');
      return hasDocInput ? 1.0 : 0.15;
    }
    return 0.6;
  }

  private static calculateConstraintMatch(tool: AITool, constraints: any): number {
    if (!constraints) return 1.0;
    let score = 1.0;

    if (constraints.freeOnly) {
      if (tool.pricingDetails?.type === 'FREE' || tool.pricingDetails?.freeTierAvailable) {
        score += 0.1;
      } else {
        score -= 0.5;
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
    if (specificity === 'unspecified' || !domain || domain === 'General') return 0.5;
    const toolDomains = (tool.domains || []).map(d => d.toLowerCase());
    const normDomain = domain.toLowerCase();

    if (toolDomains.some(td => td.includes(normDomain) || normDomain.includes(td))) {
      return 1.0;
    }
    return 0.2;
  }

  private static calculateEvidenceCoverage(tool: AITool, requiredCapabilities: string[]): number {
    if (tool.verificationStatus !== 'VERIFIED' && tool.verificationStatus !== 'VERIFIED_SEED') {
      return 0.0;
    }
    if (!requiredCapabilities || requiredCapabilities.length === 0) return 0.8;
    const matched = this.extractMatchedCapabilities(tool, requiredCapabilities);
    return Math.min(1.0, matched.length / requiredCapabilities.length);
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
    const toolTasks = (tool.tasks || []).concat(tool.useCases || []).map(t => t.toLowerCase());
    const toolDesc = (tool.description || '').toLowerCase();

    return (requiredCapabilities || []).filter(req => {
      const normReq = req.toLowerCase().replace(/_/g, ' ');
      if (toolCaps.some(tc => tc.includes(normReq) || normReq.includes(tc))) return true;
      const words = normReq.split(' ').filter(w => w.length > 2);
      const inTasks = toolTasks.some(task =>
        words.every(w => task.includes(w) || (w === 'analysis' && task.includes('analyze')) || (w === 'summarization' && task.includes('summarize')))
      );
      if (inTasks) return true;
      return words.every(w =>
        toolDesc.includes(w) || (w === 'analysis' && toolDesc.includes('analyze')) || (w === 'summarization' && toolDesc.includes('summarize'))
      );
    });
  }

  private static extractMissingCapabilities(tool: AITool, requiredCapabilities: string[]): string[] {
    const matched = this.extractMatchedCapabilities(tool, requiredCapabilities);
    return (requiredCapabilities || []).filter(req => !matched.includes(req));
  }
}
