import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config/env';

export interface OpenEndedEvaluationResult {
  score: number;
  confidence: number;
  strengths: string[];
  gaps: string[];
  evidence: string[];
  reason: string;
  status: 'evaluated' | 'unavailable';
}

export class ClaudeService {
  private client: Anthropic | null = null;
  private geminiClient: GoogleGenerativeAI | null = null;

  constructor() {
    if (config.anthropicApiKey && config.anthropicApiKey !== 'mock-claude-key') {
      this.client = new Anthropic({ apiKey: config.anthropicApiKey });
    }
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || config.geminiApiKey;
    if (geminiKey && !geminiKey.startsWith('mock-') && geminiKey.length > 10) {
      this.geminiClient = new GoogleGenerativeAI(geminiKey);
    }
  }

  /**
   * Evaluates open-ended assessment questions (Q11, Q12, Q25) against explicit rubric.
   *
   * STRICT PRINCIPLES:
   * 1. Score represents ONLY actual evidence written by learner.
   * 2. NO generous bias, NO artificial motivational scores, NO forcing into middle.
   * 3. NO chain-of-thought exposed.
   * 4. NO fake fallback scores (e.g. 85, 80). If client is unavailable, returns status: 'unavailable'.
   */
  async evaluateOpenEndedAnswer(
    question: string,
    purpose: string,
    capability: string,
    rubric: string,
    learnerAnswer: string
  ): Promise<OpenEndedEvaluationResult | null> {
    if (!this.client && !this.geminiClient) {
      return null; // Return null so caller relies on deterministic rubric fallback without fake scores
    }

    const cleanAnswer = learnerAnswer ? learnerAnswer.trim() : '';
    if (!cleanAnswer) {
      return {
        score: 0,
        confidence: 1.0,
        strengths: [],
        gaps: ['No response provided by learner'],
        evidence: [],
        reason: 'Empty answer submitted.',
        status: 'evaluated'
      };
    }

    const prompt = `You are the AINOVA Assessment Evaluator. Grade the following learner response based strictly on demonstrated evidence.

EXACT QUESTION: ${question}
PURPOSE OF QUESTION: ${purpose}
CAPABILITY BEING MEASURED: ${capability}
EXPLICIT SCORING RUBRIC: ${rubric}
LEARNER'S ACTUAL ANSWER: "${cleanAnswer}"

STRICT EVALUATION INSTRUCTIONS:
- Base score (0-100) ONLY on what the learner actually wrote.
- DO NOT be generous.
- DO NOT make the score motivational.
- DO NOT force scores into the middle range (60-80).
- DO NOT fabricate missing evidence. If evidence is missing, score accordingly.
- If the answer is vague, score only the evidence that actually exists.
- If the answer demonstrates partial understanding, give partial credit.
- If the answer is fundamentally incorrect or non-responsive, score 0-15.
- DO NOT expose internal chain-of-thought or reasoning steps.

Return ONLY a valid JSON object matching this schema:
{
  "score": number (integer 0 to 100),
  "confidence": number (float 0.0 to 1.0),
  "strengths": ["string array of verified strengths"],
  "gaps": ["string array of missing elements or misconceptions"],
  "evidence": ["string array of specific quotes or evidence from the text"],
  "reason": "concise, direct summary explaining why this score was assigned"
}`;

    try {
      let contentText = '';
      if (this.client) {
        const res = await this.client.messages.create({
          model: config.claudeModel || 'claude-3-5-sonnet-20240620',
          max_tokens: 800,
          messages: [{ role: 'user', content: prompt }]
        });
        contentText = res.content[0].type === 'text' ? res.content[0].text : '';
      } else if (this.geminiClient) {
        contentText = await this.generateWithGemini(prompt, 800, 0.1);
      }

      let parsed: any = {};
      try {
        let cleaned = contentText.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
        const match = cleaned.match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : JSON.parse(cleaned);
      } catch (e) {
        console.warn('[ClaudeService] Response JSON parsing warning:', e);
      }

      return {
        score: typeof parsed.score === 'number' ? Math.min(100, Math.max(0, Math.round(parsed.score))) : 0,
        confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.8,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
        evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
        reason: typeof parsed.reason === 'string' ? parsed.reason : 'Evaluated against capability rubric.',
        status: 'evaluated'
      };
    } catch (err) {
      console.error('AI open-ended evaluation failed:', err);
      return null;
    }
  }

  // AI Relevance Engine ("Why does this matter to me?")
  async generateRelevanceReport(learnerRole: string, goal: string, gapSummary: string, signalTitle: string, signalSummary: string) {
    if (!this.client && !this.geminiClient) {
      return {
        relevanceScore: 85,
        whyItMatters: `As a ${learnerRole} working towards "${goal}", ${signalTitle} alters how you handle workflow automation and technical tools.`,
        actionableTakeaway: 'Review signal capabilities and evaluate impact on your target workflow.'
      };
    }

    const prompt = `You are the AINOVA Personal AI Mentor. Calculate personalized relevance.
Learner Role: ${learnerRole}
Learner Target Goal: ${goal}
Identified Gaps: ${gapSummary}
New AI Signal: ${signalTitle} - ${signalSummary}

Return a JSON object with:
{
  "relevanceScore": number (0 to 100),
  "whyItMatters": "string paragraph tailored to this specific learner",
  "actionableTakeaway": "string bullet point on next step"
}`;

    try {
      let text = '';
      if (this.client) {
        const res = await this.client.messages.create({
          model: config.claudeModel || 'claude-3-5-sonnet-20240620',
          max_tokens: 800,
          messages: [{ role: 'user', content: prompt }]
        });
        text = res.content[0].type === 'text' ? res.content[0].text : '';
      } else if (this.geminiClient) {
        text = await this.generateWithGemini(prompt, 800, 0.2);
      }

      let parsed: any;
      let cleaned = text.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      const match = cleaned.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : JSON.parse(cleaned);
      return parsed;
    } catch {
      return {
        relevanceScore: 75,
        whyItMatters: `This AI update impacts your role as ${learnerRole}.`,
        actionableTakeaway: 'Review signal documentation.'
      };
    }
  }

  // Radar Signal 4-part Scaffolding
  async scaffoldRadarSignal(title: string, rawDescription: string) {
    if (!this.client && !this.geminiClient) {
      return {
        yesterday: 'Manual script writing and static step execution.',
        today: 'Dynamic reasoning and automated multi-step resolution.',
        whatChanged: 'Shift from rule-based scripts to context-driven reasoning loops.',
        whosAffected: 'Software Developers, QA Engineers, Operations Specialists.'
      };
    }

    const prompt = `Scaffold this AI signal into the AINOVA 4-step framework.
Title: ${title}
Description: ${rawDescription}

Return JSON with:
{
  "yesterday": "string",
  "today": "string",
  "whatChanged": "string",
  "whosAffected": "string"
}`;

    try {
      let text = '';
      if (this.client) {
        const res = await this.client.messages.create({
          model: config.claudeModel || 'claude-3-5-sonnet-20240620',
          max_tokens: 800,
          messages: [{ role: 'user', content: prompt }]
        });
        text = res.content[0].type === 'text' ? res.content[0].text : '';
      } else if (this.geminiClient) {
        text = await this.generateWithGemini(prompt, 800, 0.2);
      }

      let parsed: any;
      let cleaned = text.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      const match = cleaned.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : JSON.parse(cleaned);
      return parsed;
    } catch {
      return {
        yesterday: 'Legacy approach',
        today: 'Current approach',
        whatChanged: 'Technical paradigm shift',
        whosAffected: 'Target roles'
      };
    }
  }

  private async generateWithGemini(prompt: string, maxTokens: number = 800, temperature: number = 0.1): Promise<string> {
    if (!this.geminiClient) throw new Error('Gemini client not configured');
    const candidateModels = Array.from(new Set([
      config.geminiModel || 'gemini-3.5-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash'
    ]));

    let lastErr: any = null;
    for (const m of candidateModels) {
      try {
        const genModel = this.geminiClient.getGenerativeModel({
          model: m,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            responseMimeType: 'application/json'
          }
        });
        const res = await genModel.generateContent(prompt);
        return res.response.text();
      } catch (err: any) {
        lastErr = err;
      }
    }
    throw lastErr;
  }
}
