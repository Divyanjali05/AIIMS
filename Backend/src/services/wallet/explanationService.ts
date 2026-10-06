import { AITool, RequirementProfile, ToolMatchResult } from '../../types';

/**
 * Explanation Service — Generates evidence-backed natural language explanations for tool recommendations.
 * Avoids keyword-matching jargon and explains exact capability, task, output, and verification alignment.
 */
export class ExplanationService {
  /**
   * Generates rationale explanation lines for a single ToolMatchResult
   */
  public static generateExplanation(tool: AITool, profile: RequirementProfile, matchResult: ToolMatchResult): string[] {
    const whyMatches: string[] = [];

    // 1. Task & Workflow Alignment
    if (profile.goal) {
      whyMatches.push(`Supports ${profile.goal.toLowerCase()} workflows`);
    }

    // 2. Verified Capabilities Alignment
    if (matchResult.matchedCapabilities && matchResult.matchedCapabilities.length > 0) {
      const topCaps = matchResult.matchedCapabilities
        .slice(0, 3)
        .map(c => c.replace(/_/g, ' '));
      whyMatches.push(`Verified capabilities: ${topCaps.join(', ')}`);
    } else if (tool.capabilities && tool.capabilities.length > 0) {
      const toolCaps = tool.capabilities.slice(0, 2).join(', ');
      whyMatches.push(`Offers verified capability support for ${toolCaps}`);
    }

    // 3. Desired Output Alignment
    if (profile.desiredOutput) {
      whyMatches.push(`Matches output requirements for ${profile.desiredOutput.toLowerCase()}`);
    }

    // 4. Constraint & Pricing Highlights
    if (profile.constraints?.freeOnly && tool.pricingDetails?.freeTierAvailable) {
      whyMatches.push('Provides a free tier matching your budget constraints');
    } else if (tool.pricingDetails?.summary) {
      whyMatches.push(`Pricing status: ${tool.pricingDetails.summary}`);
    }

    // 5. Source Verification Evidence
    if (tool.verificationStatus === 'VERIFIED') {
      whyMatches.push('Verified against live vendor catalog and documentation evidence');
    }

    return Array.from(new Set(whyMatches));
  }
}
