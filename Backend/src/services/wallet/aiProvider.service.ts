import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config/env';

export type AIProviderStatus = 'READY' | 'UNAVAILABLE' | 'AUTHENTICATION_FAILED' | 'CONFIG_ERROR';

export interface AIProviderResponse {
  rawResponse: string;
  parsedJson?: any;
  modelUsed: string;
  providerName: string;
  usage?: { inputTokens: number; outputTokens: number };
  status: 'SUCCESS' | 'UNAVAILABLE' | 'CONFIG_ERROR' | 'FAILED';
  isAIAssessed: boolean;
  errorMessage?: string;
}

export interface AIProvider {
  name: string;
  isAvailable(): boolean;
  getStatus(): AIProviderStatus;
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
  private configStatus: AIProviderStatus = 'CONFIG_ERROR';

  constructor() {
    const rawKey =
      process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || config.anthropicApiKey;
    this.model = process.env.AI_TOOL_ASSESSMENT_MODEL || 'claude-3-5-sonnet-20241022';

    if (AnthropicProvider.isKeyValid(rawKey)) {
      this.client = new Anthropic({ apiKey: rawKey });
      this.configStatus = 'READY';
    } else {
      this.client = null;
      this.configStatus = 'CONFIG_ERROR';
    }
  }

  public static isKeyValid(key?: string): boolean {
    if (!key) return false;
    const trimmed = key.trim();
    if (
      trimmed.startsWith('mock-') ||
      trimmed.includes('placeholder') ||
      trimmed === 'your-api-key-here' ||
      trimmed.length < 10
    ) {
      return false;
    }
    return true;
  }

  public isAvailable(): boolean {
    return this.configStatus === 'READY' && this.client !== null;
  }

  public getStatus(): AIProviderStatus {
    return this.configStatus;
  }

  public async assessToolCandidate(
    sourceContent: string,
    systemPrompt: string
  ): Promise<AIProviderResponse> {
    if (!this.client || this.configStatus !== 'READY') {
      console.warn(
        '[AnthropicProvider] API key is not configured or uses a placeholder key. Returning explicit UNAVAILABLE status.'
      );
      return {
        rawResponse: '',
        modelUsed: this.model,
        providerName: this.name,
        status: 'CONFIG_ERROR',
        isAIAssessed: false,
        errorMessage:
          'Anthropic API key is unconfigured or a placeholder. Live AI assessment unavailable.',
      };
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
            content: `ANALYZE THE FOLLOWING UNTRUSTED SOURCE DATA:\n\n<source_content>\n${sourceContent.slice(0, 8000)}\n</source_content>\n\nReturn schema-valid structured JSON only.`,
          },
        ],
      });

      const textBlock = response.content.find((c) => c.type === 'text');
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
        status: 'SUCCESS',
        isAIAssessed: true,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (err: any) {
      console.warn(`[AnthropicProvider] API error (${err.message}). Live AI provider unavailable.`);
      return {
        rawResponse: '',
        modelUsed: this.model,
        providerName: this.name,
        status: 'UNAVAILABLE',
        isAIAssessed: false,
        errorMessage: `Anthropic API request failed: ${err.message}`,
      };
    }
  }
}

/**
 * Deterministic Fallback Provider (Used for safe offline heuristic extraction without fabricated claims)
 */
export class DeterministicFallbackProvider implements AIProvider {
  public name = 'Deterministic Rule Engine';

  public isAvailable(): boolean {
    return true;
  }

  public getStatus(): AIProviderStatus {
    return 'READY';
  }

  public async assessToolCandidate(
    sourceContent: string,
    _systemPrompt: string
  ): Promise<AIProviderResponse> {
    const text = sourceContent.toLowerCase();

    // Deterministic extraction strictly based on evidence
    const isTool =
      text.includes('tool') ||
      text.includes('assistant') ||
      text.includes('platform') ||
      text.includes('app') ||
      text.includes('model');
    const nameMatch =
      sourceContent.match(/name["\s:]+([^"\n,]+)/i) ||
      sourceContent.match(/title["\s:]+([^"\n,]+)/i);
    const candidateName = nameMatch ? nameMatch[1].trim() : 'Candidate Tool';

    const freeTier =
      text.includes('free tier') || text.includes('free plan') || text.includes('100% free');
    const freeTrial = text.includes('free trial') || text.includes('trial available');

    // Extract ONLY evidenced capabilities — NEVER fabricate Task Execution
    const evidencedCapabilities: string[] = [];
    if (text.includes('code') || text.includes('coding') || text.includes('repo'))
      evidencedCapabilities.push('Code Generation');
    if (text.includes('pdf') || text.includes('document'))
      evidencedCapabilities.push('Document Analysis');
    if (text.includes('image') || text.includes('diffusion'))
      evidencedCapabilities.push('Image Generation');
    if (text.includes('voice') || text.includes('speech') || text.includes('audio'))
      evidencedCapabilities.push('Voice Synthesis');
    if (text.includes('search') || text.includes('retrieval'))
      evidencedCapabilities.push('Information Retrieval');

    const evidencedTasks: string[] = [];
    if (evidencedCapabilities.includes('Code Generation')) evidencedTasks.push('Code Assistance');
    if (evidencedCapabilities.includes('Document Analysis'))
      evidencedTasks.push('Document Analysis');

    const parsedJson = {
      classification: {
        itemType: isTool ? 'AI_TOOL' : 'UNKNOWN',
        isRelevant: isTool && evidencedCapabilities.length > 0,
      },
      identity: {
        name: candidateName,
        provider: 'AI Ecosystem Provider',
        officialWebsite: sourceContent.match(/https?:\/\/[^\s"',]+/i)?.[0] || '',
      },
      description: {
        short: sourceContent.slice(0, 150).trim(),
        long: sourceContent.slice(0, 500).trim(),
      },
      taxonomy: {
        category: evidencedCapabilities.includes('Code Generation')
          ? 'Agentic Coding'
          : 'Reasoning & Writing',
        domains: ['Software & Technology'],
        subdomains: ['AI Tools'],
        tasks: evidencedTasks,
        capabilities: evidencedCapabilities,
      },
      pricing: {
        type: freeTier ? 'FREEMIUM' : freeTrial ? 'FREE_TRIAL' : 'UNKNOWN',
        freeTierAvailable: freeTier,
        freeTrialAvailable: freeTrial,
        summary: freeTier
          ? 'Free tier available'
          : freeTrial
            ? 'Free trial available'
            : 'Pricing not verified',
      },
      confidence: 0.4, // Conservative confidence for rule extraction
      needsVerification: true,
      evidence: [],
    };

    return {
      rawResponse: JSON.stringify(parsedJson, null, 2),
      parsedJson,
      modelUsed: 'rule-engine-v1',
      providerName: this.name,
      status: 'SUCCESS',
      isAIAssessed: false,
    };
  }
}

/**
 * Google Gemini AI Provider Implementation
 */
export class GeminiProvider implements AIProvider {
  public name = 'Google Gemini';
  private client: GoogleGenerativeAI | null = null;
  private model: string;
  private configStatus: AIProviderStatus = 'CONFIG_ERROR';

  constructor() {
    const rawKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || config.geminiApiKey;
    this.model = process.env.GEMINI_MODEL || config.geminiModel || 'gemini-3.5-flash';

    if (GeminiProvider.isKeyValid(rawKey)) {
      this.client = new GoogleGenerativeAI(rawKey);
      this.configStatus = 'READY';
    } else {
      this.client = null;
      this.configStatus = 'CONFIG_ERROR';
    }
  }

  public static isKeyValid(key?: string): boolean {
    if (!key) return false;
    const trimmed = key.trim();
    if (
      trimmed.startsWith('mock-') ||
      trimmed.includes('placeholder') ||
      trimmed === 'your-api-key-here' ||
      trimmed.length < 10
    ) {
      return false;
    }
    return true;
  }

  public isAvailable(): boolean {
    return this.configStatus === 'READY' && this.client !== null;
  }

  public getStatus(): AIProviderStatus {
    return this.configStatus;
  }

  public async assessToolCandidate(
    sourceContent: string,
    systemPrompt: string
  ): Promise<AIProviderResponse> {
    if (!this.client || this.configStatus !== 'READY') {
      console.warn(
        '[GeminiProvider] Google API key is not configured or uses a placeholder key. Returning explicit UNAVAILABLE status.'
      );
      return {
        rawResponse: '',
        modelUsed: this.model,
        providerName: this.name,
        status: 'CONFIG_ERROR',
        isAIAssessed: false,
        errorMessage:
          'Google Gemini API key is unconfigured or a placeholder. Live AI assessment unavailable.',
      };
    }

    const candidateModels = Array.from(
      new Set([
        this.model,
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.8-flash',
        'gemini-flash-latest',
      ])
    );

    const prompt = `${systemPrompt}\n\nANALYZE THE FOLLOWING UNTRUSTED SOURCE DATA:\n\n<source_content>\n${sourceContent.slice(0, 8000)}\n</source_content>\n\nReturn schema-valid structured JSON only.`;

    let lastError: Error | null = null;

    for (const modelName of candidateModels) {
      try {
        const genModel = this.client.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2000,
            responseMimeType: 'application/json',
          },
        });

        const result = await genModel.generateContent(prompt);
        const text = result.response.text();

        let parsedJson: any = null;
        try {
          let cleaned = text.trim();
          if (cleaned.startsWith('```json')) {
            cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedJson = JSON.parse(jsonMatch[0]);
          } else {
            parsedJson = JSON.parse(cleaned);
          }
        } catch (e) {
          console.warn('[GeminiProvider] JSON parsing warning:', e);
        }

        const usageMetadata = result.response.usageMetadata;
        const usage = usageMetadata
          ? {
              inputTokens: usageMetadata.promptTokenCount || 0,
              outputTokens: usageMetadata.candidatesTokenCount || 0,
            }
          : undefined;

        return {
          rawResponse: text,
          parsedJson,
          modelUsed: modelName,
          providerName: this.name,
          status: 'SUCCESS',
          isAIAssessed: true,
          usage,
        };
      } catch (err: any) {
        lastError = err;
        console.warn(
          `[GeminiProvider] Model ${modelName} call failed (${err.message}). Trying next candidate...`
        );
      }
    }

    console.warn(`[GeminiProvider] All candidate models failed. Live AI provider unavailable.`);
    return {
      rawResponse: '',
      modelUsed: this.model,
      providerName: this.name,
      status: 'UNAVAILABLE',
      isAIAssessed: false,
      errorMessage: `Gemini API request failed: ${lastError?.message || 'Unknown error'}`,
    };
  }
}

/**
 * AI Provider Factory
 */
export function getAIProvider(): AIProvider {
  const providerType = (process.env.AI_PROVIDER || '').toLowerCase();
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || config.geminiApiKey;
  const anthropicKey =
    process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || config.anthropicApiKey;

  // 1. Explicit provider choice
  if (providerType === 'gemini') {
    return new GeminiProvider();
  }
  if (providerType === 'anthropic') {
    return new AnthropicProvider();
  }

  // 2. Auto-detect: if valid Gemini key is available, use Gemini
  if (GeminiProvider.isKeyValid(geminiKey)) {
    return new GeminiProvider();
  }

  // 3. Fallback to Anthropic if valid
  if (AnthropicProvider.isKeyValid(anthropicKey)) {
    return new AnthropicProvider();
  }

  // 4. Fallback to Deterministic heuristic provider
  return new DeterministicFallbackProvider();
}
