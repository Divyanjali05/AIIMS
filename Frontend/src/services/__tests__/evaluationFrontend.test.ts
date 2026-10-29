/**
 * evaluationFrontend.test.ts
 * =========================================================
 * Frontend Evaluation, Role Routing & Learner Feedback Test Suite
 *
 * Verifies:
 *  1. Disabled Send button until valid (all 4 rubric criteria 1-5 + non-empty written feedback)
 *  2. Role redirects (learner redirected away from /staff/*, evaluator -> /staff/queue, admin -> /staff/admin)
 *  3. Feedback visible to learner (submission status, written feedback, rubric scores, resubmit action)
 */

import { SubmissionItem, UserRole, RUBRIC_CRITERIA_LIST } from '../../types';

type TestFn = (name: string, fn: () => void | Promise<void>) => void;
type ExpectMatcher = { [key: string]: (...args: unknown[]) => unknown };
declare const describe: TestFn & { [key: string]: unknown };
declare const it: TestFn & { [key: string]: unknown };
declare const expect: (actual: unknown) => ExpectMatcher;

export interface EvaluationTestReport {
  passed: boolean;
  name: string;
  detail?: string;
}

/**
 * Pure validation logic mirroring EvaluationReviewScreen send button guardian.
 */
export function isEvaluationReviewFormValid(
  scores: Record<string, number>,
  writtenFeedback: string
): boolean {
  const isRubricComplete = RUBRIC_CRITERIA_LIST.every((crit) => {
    const s = scores[crit.id];
    return typeof s === 'number' && Number.isInteger(s) && s >= crit.minScore && s <= crit.maxScore;
  });

  const isFeedbackComplete =
    typeof writtenFeedback === 'string' && writtenFeedback.trim().length > 0;
  return isRubricComplete && isFeedbackComplete;
}

/**
 * Pure route authorization handler mirroring App.tsx location sync logic.
 */
export function resolveStaffRouteNavigation(params: {
  currentPath: string;
  isAuthenticated: boolean;
  role?: UserRole | string;
}): { targetPath: string; isRedirected: boolean; allowed: boolean } {
  const { currentPath, isAuthenticated, role = 'learner' } = params;
  const path = currentPath.toLowerCase();

  // If not accessing staff routes, no staff redirect applies
  if (!path.startsWith('/staff')) {
    return { targetPath: currentPath, isRedirected: false, allowed: true };
  }

  // 1. Unauthenticated staff route handling
  if (!isAuthenticated) {
    if (path === '/staff/login') {
      return { targetPath: '/staff/login', isRedirected: false, allowed: true };
    }
    return { targetPath: '/staff/login', isRedirected: true, allowed: false };
  }

  // 2. Learner role: strictly redirected away from /staff/*
  if (role === 'learner') {
    return { targetPath: '/home', isRedirected: true, allowed: false };
  }

  // 3. Evaluator role: access /staff/queue, /staff/review/*, but redirected away from /staff/admin
  if (role === 'evaluator') {
    if (path === '/staff/login' || path === '/staff') {
      return { targetPath: '/staff/queue', isRedirected: true, allowed: true };
    }
    if (path === '/staff/admin') {
      return { targetPath: '/staff/queue', isRedirected: true, allowed: false };
    }
    if (path.startsWith('/staff/queue') || path.startsWith('/staff/review')) {
      return { targetPath: currentPath, isRedirected: false, allowed: true };
    }
  }

  // 4. Admin role: access /staff/admin, /staff/queue, /staff/review/*
  if (role === 'admin') {
    if (path === '/staff/login' || path === '/staff') {
      return { targetPath: '/staff/admin', isRedirected: true, allowed: true };
    }
    return { targetPath: currentPath, isRedirected: false, allowed: true };
  }

  return { targetPath: '/home', isRedirected: true, allowed: false };
}

/**
 * Pure presenter function mirroring LearnerSubmissionsSection logic.
 */
export function formatLearnerSubmissionView(submission: SubmissionItem): {
  canResubmit: boolean;
  hasFeedback: boolean;
  displayScores: { criterion: string; score: number }[];
  statusLabel: string;
} {
  const canResubmit = submission.status === 'revision_requested';
  const hasFeedback = Boolean(
    (submission.writtenFeedback && submission.writtenFeedback.trim().length > 0) ||
    (submission.rubricScores && Object.keys(submission.rubricScores).length > 0)
  );

  const displayScores: { criterion: string; score: number }[] = [];
  if (submission.rubricScores) {
    for (const [k, v] of Object.entries(submission.rubricScores)) {
      displayScores.push({ criterion: k, score: v });
    }
  }

  return {
    canResubmit,
    hasFeedback,
    displayScores,
    statusLabel: submission.status.replace('_', ' ').toUpperCase(),
  };
}

export function runEvaluationFrontendTestSuite(): {
  passedCount: number;
  failedCount: number;
  totalCount: number;
  results: EvaluationTestReport[];
} {
  const results: EvaluationTestReport[] = [];
  let passedCount = 0;
  let failedCount = 0;

  function assert(name: string, condition: boolean, detail?: string) {
    if (condition) {
      passedCount++;
      results.push({ passed: true, name });
    } else {
      failedCount++;
      results.push({ passed: false, name, detail });
    }
  }

  // =========================================================================
  // SUITE 1: DISABLED SEND BUTTON UNTIL VALID (Requirement 3)
  // =========================================================================

  // 1. Initial empty state: no scores, no feedback
  assert(
    'E1: Send button is disabled when rubric scores and feedback are completely empty',
    isEvaluationReviewFormValid({}, '') === false
  );

  // 2. Partial scoring: 3 out of 4 criteria scored
  assert(
    'E2: Send button is disabled when only 3 of 4 criteria are scored',
    isEvaluationReviewFormValid(
      { accuracy: 4, critical_thinking: 5, clarity: 3 },
      'Great depth in analysis.'
    ) === false
  );

  // 3. All 4 criteria scored, but feedback is empty string
  assert(
    'E3: Send button is disabled when all criteria scored but written feedback is empty',
    isEvaluationReviewFormValid(
      { accuracy: 4, critical_thinking: 5, clarity: 4, ai_application: 5 },
      ''
    ) === false
  );

  // 4. All 4 criteria scored, but feedback is whitespace only
  assert(
    'E4: Send button is disabled when feedback contains only whitespace characters',
    isEvaluationReviewFormValid(
      { accuracy: 4, critical_thinking: 5, clarity: 4, ai_application: 5 },
      '     \n\t   '
    ) === false
  );

  // 5. Score out of range (score 0 < minScore 1)
  assert(
    'E5: Send button is disabled when a criterion score is below minScore 1',
    isEvaluationReviewFormValid(
      { accuracy: 0, critical_thinking: 4, clarity: 4, ai_application: 4 },
      'Needs correction on constraints.'
    ) === false
  );

  // 6. Score out of range (score 6 > maxScore 5)
  assert(
    'E6: Send button is disabled when a criterion score exceeds maxScore 5',
    isEvaluationReviewFormValid(
      { accuracy: 6, critical_thinking: 4, clarity: 4, ai_application: 4 },
      'Outstanding work.'
    ) === false
  );

  // 7. Non-integer score
  assert(
    'E7: Send button is disabled when a score is a floating point number',
    isEvaluationReviewFormValid(
      { accuracy: 4.5, critical_thinking: 4, clarity: 4, ai_application: 4 },
      'Valid feedback string.'
    ) === false
  );

  // 8. Fully valid evaluation: all 4 criteria scored 1-5 + non-empty feedback
  assert(
    'E8: Send button is ENABLED when all 4 criteria are scored (1-5) and written feedback is provided',
    isEvaluationReviewFormValid(
      { accuracy: 5, critical_thinking: 4, clarity: 4, ai_application: 5 },
      'Excellent prompt structure, precise constraint definitions, and robust output formatting.'
    ) === true
  );

  // =========================================================================
  // SUITE 2: ROLE REDIRECTS (Requirement 1)
  // =========================================================================

  // 9. Unauthenticated visiting /staff/queue is redirected to /staff/login
  const unauthQueue = resolveStaffRouteNavigation({
    currentPath: '/staff/queue',
    isAuthenticated: false,
  });
  assert(
    'E9: Unauthenticated visitor accessing /staff/queue is redirected to /staff/login',
    unauthQueue.isRedirected && unauthQueue.targetPath === '/staff/login' && !unauthQueue.allowed
  );

  // 10. Unauthenticated visiting /staff/admin is redirected to /staff/login
  const unauthAdmin = resolveStaffRouteNavigation({
    currentPath: '/staff/admin',
    isAuthenticated: false,
  });
  assert(
    'E10: Unauthenticated visitor accessing /staff/admin is redirected to /staff/login',
    unauthAdmin.isRedirected && unauthAdmin.targetPath === '/staff/login' && !unauthAdmin.allowed
  );

  // 11. Unauthenticated visiting /staff/login is allowed to view login page
  const unauthLogin = resolveStaffRouteNavigation({
    currentPath: '/staff/login',
    isAuthenticated: false,
  });
  assert(
    'E11: Unauthenticated visitor accessing /staff/login is allowed without redirect',
    !unauthLogin.isRedirected && unauthLogin.targetPath === '/staff/login' && unauthLogin.allowed
  );

  // 12. Learner accessing /staff/queue is redirected away to /home
  const learnerQueue = resolveStaffRouteNavigation({
    currentPath: '/staff/queue',
    isAuthenticated: true,
    role: 'learner',
  });
  assert(
    'E12: Learner navigating to /staff/queue is redirected away to /home (nothing role-specific shown)',
    learnerQueue.isRedirected && learnerQueue.targetPath === '/home' && !learnerQueue.allowed
  );

  // 13. Learner accessing /staff/admin is redirected away to /home
  const learnerAdmin = resolveStaffRouteNavigation({
    currentPath: '/staff/admin',
    isAuthenticated: true,
    role: 'learner',
  });
  assert(
    'E13: Learner navigating to /staff/admin is redirected away to /home',
    learnerAdmin.isRedirected && learnerAdmin.targetPath === '/home' && !learnerAdmin.allowed
  );

  // 14. Learner accessing /staff/review/:id is redirected away to /home
  const learnerReview = resolveStaffRouteNavigation({
    currentPath: '/staff/review/sub-123',
    isAuthenticated: true,
    role: 'learner',
  });
  assert(
    'E14: Learner navigating to /staff/review/:id is redirected away to /home',
    learnerReview.isRedirected && learnerReview.targetPath === '/home' && !learnerReview.allowed
  );

  // 15. Evaluator visiting /staff/login is routed to /staff/queue
  const evalLogin = resolveStaffRouteNavigation({
    currentPath: '/staff/login',
    isAuthenticated: true,
    role: 'evaluator',
  });
  assert(
    'E15: Evaluator visiting /staff/login is routed to /staff/queue',
    evalLogin.isRedirected && evalLogin.targetPath === '/staff/queue' && evalLogin.allowed
  );

  // 16. Evaluator accessing /staff/queue is allowed
  const evalQueue = resolveStaffRouteNavigation({
    currentPath: '/staff/queue',
    isAuthenticated: true,
    role: 'evaluator',
  });
  assert(
    'E16: Evaluator accessing /staff/queue is allowed without redirect',
    !evalQueue.isRedirected && evalQueue.targetPath === '/staff/queue' && evalQueue.allowed
  );

  // 17. Evaluator visiting /staff/admin is redirected to /staff/queue
  const evalAdmin = resolveStaffRouteNavigation({
    currentPath: '/staff/admin',
    isAuthenticated: true,
    role: 'evaluator',
  });
  assert(
    'E17: Evaluator attempting to access /staff/admin is redirected to /staff/queue',
    evalAdmin.isRedirected && evalAdmin.targetPath === '/staff/queue' && !evalAdmin.allowed
  );

  // 18. Admin visiting /staff/login is routed to /staff/admin
  const adminLogin = resolveStaffRouteNavigation({
    currentPath: '/staff/login',
    isAuthenticated: true,
    role: 'admin',
  });
  assert(
    'E18: Admin visiting /staff/login is routed to /staff/admin',
    adminLogin.isRedirected && adminLogin.targetPath === '/staff/admin' && adminLogin.allowed
  );

  // 19. Admin accessing /staff/admin is allowed
  const adminAdmin = resolveStaffRouteNavigation({
    currentPath: '/staff/admin',
    isAuthenticated: true,
    role: 'admin',
  });
  assert(
    'E19: Admin accessing /staff/admin is allowed without redirect',
    !adminAdmin.isRedirected && adminAdmin.targetPath === '/staff/admin' && adminAdmin.allowed
  );

  // 20. Admin accessing /staff/queue is allowed
  const adminQueue = resolveStaffRouteNavigation({
    currentPath: '/staff/queue',
    isAuthenticated: true,
    role: 'admin',
  });
  assert(
    'E20: Admin accessing /staff/queue is allowed without redirect',
    !adminQueue.isRedirected && adminQueue.targetPath === '/staff/queue' && adminQueue.allowed
  );

  // =========================================================================
  // SUITE 3: FEEDBACK VISIBLE TO THE LEARNER (Requirement 5)
  // =========================================================================

  // 21. Submitted status: in queue, no resubmit action needed
  const subPending: SubmissionItem = {
    taskId: 'task-prompt-1',
    taskTitle: 'Prompt Optimization',
    answerContent: 'System prompt content...',
    status: 'submitted',
    revisionCount: 0,
    writtenFeedback: '',
    learner: 'usr-123',
    submittedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const viewPending = formatLearnerSubmissionView(subPending);
  assert(
    'E21: Pending submission has status SUBMITTED and resubmit is false',
    viewPending.statusLabel === 'SUBMITTED' && !viewPending.canResubmit && !viewPending.hasFeedback
  );

  // 22. Revision Requested status: feedback, scores, and resubmit action active
  const subRevision: SubmissionItem = {
    taskId: 'task-eval-2',
    taskTitle: 'Hallucination Auditing',
    answerContent: 'Initial draft prompt',
    status: 'revision_requested',
    revisionCount: 1,
    evaluatorName: 'Dr. Sarah Connor',
    writtenFeedback: 'Please add explicit negative constraints and binary verification criteria.',
    rubricScores: {
      accuracy: 3,
      critical_thinking: 4,
      clarity: 2,
      ai_application: 3,
    },
    learner: 'usr-123',
    submittedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const viewRevision = formatLearnerSubmissionView(subRevision);
  assert(
    'E22: When revision is requested, resubmit action is presented to learner',
    viewRevision.canResubmit === true && viewRevision.statusLabel === 'REVISION REQUESTED'
  );

  assert(
    'E23: Evaluator written feedback and 4 rubric scores are visible to the learner',
    viewRevision.hasFeedback === true &&
      viewRevision.displayScores.length === 4 &&
      subRevision.writtenFeedback.includes('negative constraints')
  );

  // 23. Accepted status: scores present, resubmit inactive
  const subAccepted: SubmissionItem = {
    taskId: 'task-eval-2',
    taskTitle: 'Hallucination Auditing',
    answerContent: 'Revised refined prompt with full constraints',
    status: 'accepted',
    revisionCount: 2,
    evaluatorName: 'Dr. Sarah Connor',
    writtenFeedback: 'Exemplary prompt design! Meets all verification standards.',
    rubricScores: {
      accuracy: 5,
      critical_thinking: 5,
      clarity: 5,
      ai_application: 5,
    },
    learner: 'usr-123',
    submittedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const viewAccepted = formatLearnerSubmissionView(subAccepted);
  assert(
    'E24: Accepted submission displays mastery scores and does not prompt for resubmission',
    viewAccepted.statusLabel === 'ACCEPTED' && !viewAccepted.canResubmit && viewAccepted.hasFeedback
  );

  return {
    passedCount,
    failedCount,
    totalCount: passedCount + failedCount,
    results,
  };
}

if (typeof describe === 'function') {
  describe('Frontend Evaluation, Role Routing & Learner Feedback', () => {
    const suite = runEvaluationFrontendTestSuite();
    suite.results.forEach((check) => {
      it(check.name, () => {
        expect(check.passed).toBe(true);
      });
    });
  });
}
