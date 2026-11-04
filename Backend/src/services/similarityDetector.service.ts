/**
 * AIIMS Question Similarity Detection Service
 *
 * Implements token-level Jaccard similarity, Szymkiewicz–Simpson overlap coefficient,
 * character-level n-gram overlap, stemming, and scenario containment comparison to detect
 * exact duplicates and near-duplicates before approving or serving AI-generated questions.
 *
 * Configurable default threshold: 0.70 (70% similarity threshold)
 */

export interface QuestionComparisonTarget {
  questionId?: string;
  title: string;
  promptText: string;
  testScenario?: string;
  expectedCriteria?: string[];
}

export interface SimilarityResult {
  isDuplicate: boolean;
  highestSimilarity: number;
  matchedQuestionId?: string;
  matchedTitle?: string;
  reason?: string;
}

const STOPWORDS = new Set([
  'a',
  'about',
  'above',
  'after',
  'again',
  'against',
  'all',
  'am',
  'an',
  'and',
  'any',
  'are',
  "aren't",
  'as',
  'at',
  'be',
  'because',
  'been',
  'before',
  'being',
  'below',
  'between',
  'both',
  'but',
  'by',
  'can',
  "can't",
  'cannot',
  'could',
  "couldn't",
  'did',
  "didn't",
  'do',
  'does',
  "doesn't",
  'doing',
  "don't",
  'down',
  'during',
  'each',
  'few',
  'for',
  'from',
  'further',
  'had',
  "hadn't",
  'has',
  "hasn't",
  'have',
  "haven't",
  'having',
  'he',
  "he'd",
  "he'll",
  "he's",
  'her',
  'here',
  "here's",
  'hers',
  'herself',
  'him',
  'himself',
  'his',
  'how',
  "how's",
  'i',
  "i'd",
  "i'll",
  "i'm",
  "i've",
  'if',
  'in',
  'into',
  'is',
  "isn't",
  'it',
  "it's",
  'its',
  'itself',
  "let's",
  'me',
  'more',
  'most',
  "mustn't",
  'my',
  'myself',
  'no',
  'nor',
  'not',
  'of',
  'off',
  'on',
  'once',
  'only',
  'or',
  'other',
  'ought',
  'our',
  'ours',
  'ourselves',
  'out',
  'over',
  'own',
  'same',
  "shan't",
  'she',
  "she'd",
  "she'll",
  "she's",
  'should',
  "shouldn't",
  'so',
  'some',
  'such',
  'than',
  'that',
  "that's",
  'the',
  'their',
  'theirs',
  'them',
  'themselves',
  'then',
  'there',
  "there's",
  'these',
  'they',
  "they'd",
  "they'll",
  "they're",
  "they've",
  'this',
  'those',
  'through',
  'to',
  'too',
  'under',
  'until',
  'up',
  'very',
  'was',
  "wasn't",
  'we',
  "we'd",
  "we'll",
  "we're",
  "we've",
  'were',
  "weren't",
  'what',
  "what's",
  'when',
  "when's",
  'where',
  "where's",
  'which',
  'while',
  'who',
  "who's",
  'whom',
  'why',
  "why's",
  'with',
  "won't",
  'would',
  "wouldn't",
  'you',
  "you'd",
  "you'll",
  "you're",
  "you've",
  'your',
  'yours',
  'yourself',
  'yourselves',
]);

export class SimilarityDetectorService {
  private defaultThreshold: number;

  constructor(defaultThreshold: number = 0.7) {
    this.defaultThreshold = defaultThreshold;
  }

  /**
   * Cleans text: lowercase, punctuation removed, excess whitespace collapsed.
   */
  public normalizeText(text: string): string {
    if (!text || typeof text !== 'string') return '';
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Simple light stemmer for English suffixes to match near-synonyms.
   */
  public stemWord(word: string): string {
    if (word.length <= 3) return word;
    if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
    if (word.endsWith('ing')) return word.slice(0, -3);
    if (word.endsWith('ed')) return word.slice(0, -2);
    if (word.endsWith('es')) return word.slice(0, -2);
    if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
    return word;
  }

  /**
   * Tokenizes text, removes stopwords, and stems words.
   * Preserves numbers with digits (e.g. '12', '15', '50').
   */
  public tokenize(text: string): string[] {
    const normalized = this.normalizeText(text);
    if (!normalized) return [];
    return normalized
      .split(' ')
      .filter((w) => ((w.length >= 2 && /\d/.test(w)) || w.length > 2) && !STOPWORDS.has(w))
      .map((w) => this.stemWord(w));
  }

  /**
   * Generates character n-grams (default 3-grams) for fuzzy substring matching.
   */
  public generateNGrams(text: string, n: number = 3): Set<string> {
    const normalized = this.normalizeText(text);
    const ngrams = new Set<string>();
    if (normalized.length < n) {
      if (normalized.length > 0) ngrams.add(normalized);
      return ngrams;
    }
    for (let i = 0; i <= normalized.length - n; i++) {
      ngrams.add(normalized.substring(i, i + n));
    }
    return ngrams;
  }

  /**
   * Computes Jaccard Similarity between two sets: |A ∩ B| / |A ∪ B|.
   */
  public jaccardSimilarity<T>(setA: Set<T>, setB: Set<T>): number {
    if (setA.size === 0 && setB.size === 0) return 1.0;
    if (setA.size === 0 || setB.size === 0) return 0.0;

    let intersectionCount = 0;
    for (const item of setA) {
      if (setB.has(item)) {
        intersectionCount++;
      }
    }

    const unionCount = setA.size + setB.size - intersectionCount;
    return unionCount === 0 ? 0 : intersectionCount / unionCount;
  }

  /**
   * Computes Szymkiewicz–Simpson overlap coefficient: |A ∩ B| / min(|A|, |B|).
   * Measures subset containment when one question's scenario is embedded inside another.
   */
  public overlapCoefficient<T>(setA: Set<T>, setB: Set<T>): number {
    if (setA.size === 0 && setB.size === 0) return 1.0;
    if (setA.size === 0 || setB.size === 0) return 0.0;

    let intersectionCount = 0;
    for (const item of setA) {
      if (setB.has(item)) {
        intersectionCount++;
      }
    }

    const minSize = Math.min(setA.size, setB.size);
    return minSize === 0 ? 0 : intersectionCount / minSize;
  }

  /**
   * Computes composite similarity score between two questions.
   * Weighs:
   * - Title similarity (20%)
   * - Prompt text token similarity (40%)
   * - Test scenario similarity & containment (30%)
   * - Expected criteria overlap (10%)
   */
  public compareQuestions(q1: QuestionComparisonTarget, q2: QuestionComparisonTarget): number {
    // 1. Exact string matches
    const normPrompt1 = this.normalizeText(q1.promptText);
    const normPrompt2 = this.normalizeText(q2.promptText);
    if (normPrompt1 && normPrompt1 === normPrompt2) {
      return 1.0;
    }

    // 2. Title token similarity
    const tokensTitle1 = new Set(this.tokenize(q1.title));
    const tokensTitle2 = new Set(this.tokenize(q2.title));
    const titleSim = this.jaccardSimilarity(tokensTitle1, tokensTitle2);

    // 3. Prompt text token similarity & overlap
    const tokensPrompt1 = new Set(this.tokenize(q1.promptText));
    const tokensPrompt2 = new Set(this.tokenize(q2.promptText));
    const promptJaccard = this.jaccardSimilarity(tokensPrompt1, tokensPrompt2);
    const promptOverlap = this.overlapCoefficient(tokensPrompt1, tokensPrompt2);
    const promptSim = Math.max(promptJaccard, promptOverlap * 0.9);

    // 4. Scenario similarity: token Jaccard, n-gram overlap, and containment coefficient
    const scen1 = q1.testScenario || q1.promptText;
    const scen2 = q2.testScenario || q2.promptText;
    const tokensScen1 = new Set(this.tokenize(scen1));
    const tokensScen2 = new Set(this.tokenize(scen2));
    const scenTokenJaccard = this.jaccardSimilarity(tokensScen1, tokensScen2);
    const scenTokenOverlap = this.overlapCoefficient(tokensScen1, tokensScen2);

    const ngramsScen1 = this.generateNGrams(scen1, 3);
    const ngramsScen2 = this.generateNGrams(scen2, 3);
    const scenNgramSim = this.jaccardSimilarity(ngramsScen1, ngramsScen2);

    const scenSim = Math.max(scenTokenJaccard, scenTokenOverlap * 0.9, scenNgramSim);

    // 5. Expected criteria overlap
    let criteriaSim = 0;
    if (q1.expectedCriteria?.length && q2.expectedCriteria?.length) {
      const crit1 = new Set(q1.expectedCriteria.map((c) => this.normalizeText(c)));
      const crit2 = new Set(q2.expectedCriteria.map((c) => this.normalizeText(c)));
      criteriaSim = Math.max(
        this.jaccardSimilarity(crit1, crit2),
        this.overlapCoefficient(crit1, crit2) * 0.9
      );
    } else {
      criteriaSim = promptSim;
    }

    // High scenario and prompt overlap indicates near-identical business problem
    if (promptSim >= 0.6 && scenSim >= 0.6) {
      return Math.min(1.0, Math.max(0.75, (promptSim + scenSim) / 2));
    }

    // Composite weighted score
    const compositeScore = titleSim * 0.2 + promptSim * 0.4 + scenSim * 0.3 + criteriaSim * 0.1;

    return Math.min(1.0, Math.max(0.0, Number(compositeScore.toFixed(4))));
  }

  /**
   * Evaluates candidate question against a collection of existing questions.
   */
  public checkAgainstQuestionBank(
    candidate: QuestionComparisonTarget,
    existingQuestions: QuestionComparisonTarget[],
    threshold?: number
  ): SimilarityResult {
    const activeThreshold = threshold !== undefined ? threshold : this.defaultThreshold;
    let highestSim = 0;
    let matchedQ: QuestionComparisonTarget | undefined;

    for (const existing of existingQuestions) {
      if (
        candidate.questionId &&
        existing.questionId &&
        candidate.questionId === existing.questionId
      ) {
        continue;
      }

      const sim = this.compareQuestions(candidate, existing);
      if (sim > highestSim) {
        highestSim = sim;
        matchedQ = existing;
      }

      if (highestSim >= 0.99) break;
    }

    const isDuplicate = highestSim >= activeThreshold;
    return {
      isDuplicate,
      highestSimilarity: highestSim,
      matchedQuestionId: matchedQ?.questionId,
      matchedTitle: matchedQ?.title,
      reason: isDuplicate
        ? `Similarity score ${(highestSim * 100).toFixed(1)}% exceeds threshold ${(activeThreshold * 100).toFixed(0)}% against "${matchedQ?.title || 'existing question'}"`
        : undefined,
    };
  }
}

export const similarityDetectorService = new SimilarityDetectorService();
