/**
 * AI Wallet Unlock Configuration
 *
 * Configurable threshold for unlocking AI Wallet.
 * Learner must complete at least this many unique questions across Clarity and Focus.
 */
export const MIN_COMPLETED_QUESTIONS_FOR_WALLET = 3;

/**
 * Calculates the number of unique questions completed across Clarity and Focus.
 * Ensures duplicate attempts on the same question or page refreshes do NOT inflate the count.
 */
export function getCompletedQuestionsCount(user: any): number {
  if (!user) return 0;

  const completedIds = new Set<string>();

  // Collect from top-level array if present
  if (Array.isArray(user.completedQuestionIds)) {
    user.completedQuestionIds.forEach((id: string) => {
      if (typeof id === 'string' && id.trim()) completedIds.add(id.trim());
    });
  }

  // Collect from clarity state
  if (user.clarity) {
    if (Array.isArray(user.clarity.completedQuestionIds)) {
      user.clarity.completedQuestionIds.forEach((id: string) => {
        if (typeof id === 'string' && id.trim()) completedIds.add(id.trim());
      });
    }
    // Also include questions with recorded task scores
    if (user.clarity.taskScores && typeof user.clarity.taskScores === 'object') {
      Object.keys(user.clarity.taskScores).forEach((topicOrId) => {
        const item = user.clarity.taskScores[topicOrId];
        if (item && typeof item === 'object') {
          Object.keys(item).forEach((qKey) => {
            completedIds.add(`clarity-${topicOrId}-${qKey}`);
          });
        }
      });
    }
  }

  // Collect from focus state
  if (user.focus) {
    if (Array.isArray(user.focus.completedQuestionIds)) {
      user.focus.completedQuestionIds.forEach((id: string) => {
        if (typeof id === 'string' && id.trim()) completedIds.add(id.trim());
      });
    }
    if (Array.isArray(user.focus.sessionHistory)) {
      user.focus.sessionHistory.forEach((s: any, idx: number) => {
        if (s?.questionId) {
          completedIds.add(String(s.questionId));
        } else if (s?.completedAt || s?.isCompleted) {
          completedIds.add(`focus-session-${s.id || idx}`);
        }
      });
    }
  }

  return completedIds.size;
}

/**
 * Determines whether the learner has unlocked AI Wallet.
 * Administrators and Evaluators always have full access.
 */
export function isWalletUnlocked(user: any): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'evaluator') {
    return true;
  }
  return getCompletedQuestionsCount(user) >= MIN_COMPLETED_QUESTIONS_FOR_WALLET;
}
