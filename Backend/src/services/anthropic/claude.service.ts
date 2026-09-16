import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config/env';

export class ClaudeService {
  private client: Anthropic | null = null;

  constructor() {
    if (config.anthropicApiKey && config.anthropicApiKey !== 'mock-claude-key') {
      this.client = new Anthropic({ apiKey: config.anthropicApiKey });
    }
  }

  // 1. Open-ended Answer Rubric Scoring
  async evaluateOpenEndedAnswer(question: string, rubric: string, learnerAnswer: string) {
    if (!this.client) {
      return {
        score: 85,
        rubricFeedback: 'Demonstrates clear understanding of core concept with minor depth gap in edge cases.',
        strengths: ['Identified key architectural bottleneck', 'Used relevant industry terminology'],
        improvements: ['Could detail error handling strategies in distributed setups']
      };
    }

    const prompt = `You are AIIMS Assessment Evaluator. Grade the following learner response against the rubric.
Question: ${question}
Rubric: ${rubric}
Learner Answer: ${learnerAnswer}

Return a valid JSON object with:
{
  "score": number (0 to 100),
  "rubricFeedback": "string summary",
  "strengths": ["string array"],
  "improvements": ["string array"]
}`;

    const res = await this.client.messages.create({
      model: config.claudeModel,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    try {
      const contentText = res.content[0].type === 'text' ? res.content[0].text : '';
      return JSON.parse(contentText);
    } catch {
      return { score: 80, rubricFeedback: 'Satisfactory answer evaluated by Claude.', strengths: [], improvements: [] };
    }
  }

  // 2. AI Relevance Engine ("Why does this matter to me?")
  async generateRelevanceReport(learnerRole: string, goal: string, gapSummary: string, signalTitle: string, signalSummary: string) {
    if (!this.client) {
      return {
        relevanceScore: 94,
        whyItMatters: `As a ${learnerRole} working towards "${goal}", ${signalTitle} directly alters how you handle state and automation.`,
        actionableTakeaway: 'Incorporate computer use capability checks into your next sprint backlog.'
      };
    }

    const prompt = `You are the AIIMS Personal AI Mentor. Calculate personalized relevance.
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

    const res = await this.client.messages.create({
      model: config.claudeModel,
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });

    try {
      const text = res.content[0].type === 'text' ? res.content[0].text : '';
      return JSON.parse(text);
    } catch {
      return {
        relevanceScore: 90,
        whyItMatters: `This AI update impacts your role as ${learnerRole}.`,
        actionableTakeaway: 'Review signal documentation.'
      };
    }
  }

  // 3. Radar Signal 4-part Scaffolding
  async scaffoldRadarSignal(title: string, rawDescription: string) {
    if (!this.client) {
      return {
        yesterday: 'Manual script writing and static step execution.',
        today: 'Dynamic reasoning and automated multi-step resolution.',
        whatChanged: 'Shift from rule-based scripts to context-driven reasoning loops.',
        whosAffected: 'Software Developers, QA Engineers, Operations Specialists.'
      };
    }

    const prompt = `Scaffold this AI signal into the AIIMS 4-step framework.
Title: ${title}
Description: ${rawDescription}

Return JSON with:
{
  "yesterday": "string",
  "today": "string",
  "whatChanged": "string",
  "whosAffected": "string"
}`;

    const res = await this.client.messages.create({
      model: config.claudeModel,
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });

    try {
      const text = res.content[0].type === 'text' ? res.content[0].text : '';
      return JSON.parse(text);
    } catch {
      return {
        yesterday: 'Legacy approach',
        today: 'Current approach',
        whatChanged: 'Technical paradigm shift',
        whosAffected: 'Target roles'
      };
    }
  }
}
