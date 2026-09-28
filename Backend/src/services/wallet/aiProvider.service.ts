import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config/env';

export interface AIProviderResponse {
  rawResponse: string;
  parsedJson?: any;
  modelUsed: string;
  providerName: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface AIProvider {
  name: string;
  assessToolCandidate(sourceContent: string, systemPrompt: string): Promise<AIProviderResponse>;
  extractSearchIntent?(query: string, systemPrompt: string): Promise<AIProviderResponse>;
}

/**
 * Anthropic Claude Provider Implementation
 */
export class AnthropicProvider implements AIProvider {
  public name = 'Anthropic Claude';
  private client: Anthropic | null = null;
  private model: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    this.model = process.env.AI_TOOL_ASSESSMENT_MODEL || 'claude-3-5-sonnet-20241022';

    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  public async assessToolCandidate(sourceContent: string, systemPrompt: string): Promise<AIProviderResponse> {
    if (!this.client) {
      return new DeterministicFallbackProvider().assessToolCandidate(sourceContent, systemPrompt);
    }

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2000,
        temperature: 0.1, // Low temperature for high factual precision
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `ANALYZE THE FOLLOWING UNTRUSTED SOURCE DATA:\n\n<source_content>\n${sourceContent.slice(0, 8000)}\n</source_content>\n\nReturn schema-valid structured JSON only.`
          }
        ]
      });

      const textBlock = response.content.find(c => c.type === 'text');
      const text = textBlock ? textBlock.text : '';
      let parsedJson: any = null;

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedJson = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn('[AnthropicProvider] JSON parsing warning:', e);
      }

      return {
        rawResponse: text,
        parsedJson,
        modelUsed: this.model,
        providerName: this.name,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        }
      };
    } catch (err: any) {
      console.warn(`[AnthropicProvider] API error (${err.message}). Falling back to deterministic provider.`);
      return new DeterministicFallbackProvider().assessToolCandidate(sourceContent, systemPrompt);
    }
  }
}

/**
 * Deterministic Fallback Provider (Used when API Key is absent or during fast offline change checks)
 */
export class DeterministicFallbackProvider implements AIProvider {
  public name = 'Deterministic Rule Engine';

  public async assessToolCandidate(sourceContent: string, systemPrompt: string): Promise<AIProviderResponse> {
    const text = sourceContent.toLowerCase();

    // Deterministic extraction logic for source evidence
    const isTool = text.includes('tool') || text.includes('assistant') || text.includes('app') || text.includes('platform') || text.includes('release') || text.includes('ai');
    const nameMatch = sourceContent.match(/name["\s:]+([^"\n,]+)/i) || sourceContent.match(/title["\s:]+([^"\n,]+)/i);
    const candidateName = nameMatch ? nameMatch[1].trim() : 'Discovered AI Tool';

    const freeTier = text.includes('free tier') || text.includes('free plan') || text.includes('100% free');
    const freeTrial = text.includes('free trial') || text.includes('trial available');

    const parsedJson = {
      classification: {
        itemType: isTool ? 'AI_TOOL' : 'NEWS',
        isRelevant: isTool
      },
      identity: {
        name: candidateName,
        provider: 'AI Ecosystem Provider',
        officialWebsite: sourceContent.match(/https?:\/\/[^\s"',]+/i)?.[0] || 'https://ai.example.com'
      },
      description: {
        short: sourceContent.slice(0, 150).trim(),
        long: sourceContent.slice(0, 500).trim()
      },
      taxonomy: {
        domains: ['Software & Technology', 'Personal Productivity'],
        subdomains: ['AI Tools'],
        tasks: ['AI task automation'],
        capabilities: ['Task Execution']
      },
      pricing: {
        type: freeTier ? 'FREEMIUM' : freeTrial ? 'FREE_TRIAL' : 'PAID',
        freeTier: freeTier,
        freeTrial: freeTrial,
        trialDuration: freeTrial ? 14 : null,
        premiumSummary: freeTier ? 'Free tier available' : 'Paid plans available'
      },
      confidence: 0.85,
      evidence: [
        {
          claim: freeTier ? 'Free tier available' : 'Pricing metadata extracted',
          confidence: 0.90
        }
      ]
    };

    return {
      rawResponse: JSON.stringify(parsedJson, null, 2),
      parsedJson,
      modelUsed: 'rule-engine-v1',
      providerName: this.name
    };
  }
}

/**
 * AI Provider Factory
 */
export function getAIProvider(): AIProvider {
  const providerType = (process.env.AI_PROVIDER || 'anthropic').toLowerCase();
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

  if (providerType === 'anthropic' && apiKey) {
    return new AnthropicProvider();
  }

  return new DeterministicFallbackProvider();
}
