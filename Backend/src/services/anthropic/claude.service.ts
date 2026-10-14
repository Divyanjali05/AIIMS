import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config/env';

export interface EvidenceCriterion {
  criterion: string;
  status: 'demonstrated' | 'partially_demonstrated' | 'missing' | 'incorrect';
  explanation: string;
}

export interface OpenEndedEvaluationResult {
  questionId: string;
  dimension: string;
  score: number;
  confidence: number;
  evidence: EvidenceCriterion[];
  strengths: string[];
  gaps: string[];
  reason: string;
  needsReview: boolean;
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
   * Evaluates open-ended assessment questions against explicit rubric using Anthropic Claude.
   *
   * STRICT PRINCIPLES:
   * 1. Score represents ONLY actual evidence written by learner.
   * 2. NO generous bias, NO artificial motivational scores, NO forcing into middle.
   * 3. NO chain-of-thought exposed.
   * 4. NO fake fallback scores (e.g. 85, 80). If client is unavailable or output invalid, returns status: 'unavailable'.
   */
  async evaluateOpenEndedAnswer(
    questionId: string,
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
        questionId,
        dimension: capability,
        score: 0,
        confidence: 1.0,
        evidence: [
          {
            criterion: 'Response Submission',
            status: 'missing',
            explanation: 'No response text provided by learner.'
          }
        ],
        strengths: [],
        gaps: ['No response provided by learner'],
        reason: 'Empty answer submitted.',
        needsReview: false,
        status: 'evaluated'
      };
    }

    const prompt = `You are the AINOVA Evidence-Based Assessment Evaluator. Grade the following learner response based strictly on demonstrated evidence against the explicit rubric.

QUESTION ID: ${questionId}
EXACT QUESTION: ${question}
PURPOSE OF QUESTION: ${purpose}
EXPECTED CAPABILITY DIMENSION: ${capability}
EXPLICIT SCORING RUBRIC: ${rubric}
LEARNER'S ACTUAL ANSWER: "${cleanAnswer}"

STRICT EVALUATION INSTRUCTIONS:
- Grade ONLY what is explicitly written in the answer.
- DO NOT be generous or encouraging.
- DO NOT make the score motivational.
- DO NOT force scores into the middle range (60-74).
- Technical jargon, confident tone, or ambition is NOT evidence of technical competence unless supported by clear reasoning.
- A long answer must NOT receive a higher score than a concise, accurate answer if it lacks substance.
- If evidence is missing or incorrect, score accordingly (0-39 for weak/incorrect, 40-74 for partial, 75-100 for strong).
- DO NOT return or store internal chain-of-thought.

Return ONLY a valid JSON object adhering strictly to this schema:
{
  "questionId": "${questionId}",
  "dimension": "${capability}",
  "score": number (integer 0 to 100),
  "confidence": number (float 0.0 to 1.0),
  "evidence": [
    {
      "criterion": "short description of evaluated criteria",
      "status": "demonstrated" | "partially_demonstrated" | "missing" | "incorrect",
      "explanation": "concise factual explanation based directly on answer text"
    }
  ],
  "strengths": ["string array of verified demonstrated strengths"],
  "gaps": ["string array of missing elements, misconceptions, or flaws"],
  "reason": "concise, direct evaluation summary explaining why score was assigned",
  "needsReview": boolean (true if answer is ambiguous or edge case)
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

      if (typeof parsed !== 'object' || parsed === null || typeof parsed.score !== 'number') {
        throw new Error('Malformed JSON output from Anthropic evaluation');
      }

      const rawScore = Math.min(100, Math.max(0, Math.round(parsed.score)));
      const rawConfidence = typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.85;

      const formattedEvidence: EvidenceCriterion[] = Array.isArray(parsed.evidence)
        ? parsed.evidence.map((ev: any) => ({
            criterion: typeof ev?.criterion === 'string' ? ev.criterion : 'Criteria evaluation',
            status: ['demonstrated', 'partially_demonstrated', 'missing', 'incorrect'].includes(ev?.status)
              ? ev.status
              : 'partially_demonstrated',
            explanation: typeof ev?.explanation === 'string' ? ev.explanation : 'Evaluated against rubric.'
          }))
        : [];

      return {
        questionId: typeof parsed.questionId === 'string' ? parsed.questionId : questionId,
        dimension: typeof parsed.dimension === 'string' ? parsed.dimension : capability,
        score: rawScore,
        confidence: rawConfidence,
        evidence: formattedEvidence,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.filter((s: any) => typeof s === 'string') : [],
        gaps: Array.isArray(parsed.gaps) ? parsed.gaps.filter((g: any) => typeof g === 'string') : [],
        reason: typeof parsed.reason === 'string' ? parsed.reason : 'Evaluated against evidence rubric.',
        needsReview: Boolean(parsed.needsReview),
        status: 'evaluated'
      };
    } catch (err) {
      console.error('AI open-ended evaluation failed:', err);
      return null; // Return null so fallback is triggered cleanly without fake scores
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
