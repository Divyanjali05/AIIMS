import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  GitFork,
  Bot,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Award,
  HelpCircle,
  Lock,
  RefreshCw,
  FileText,
  Check,
  ChevronDown,
  ChevronUp,
  Zap,
  ShieldCheck,
  Eye,
  PlusCircle,
  Sliders,
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { QuestionWorkbench } from '../../components/common/QuestionWorkbench';
import { apiClient } from '../../api/client';
import { useLearner } from '../../context/LearnerContext';
import {
  ClarityLearningLevel,
  ClarityQuestionSummary,
  ClarityAttemptResult,
  ClarityProgressSummary,
} from '../../types';

interface ClarityTaskLabProps {
  onBackToOverview?: () => void;
}

export const ClarityTaskLab: React.FC<ClarityTaskLabProps> = () => {
  const { state, completeClarityTopic, saveClarityTaskResult } = useLearner();
  const isAdmin = state.profile?.role === 'admin';

  // Navigation view state
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<ClarityQuestionSummary | null>(null);
  const [viewMode, setViewMode] = useState<'levels' | 'questions' | 'task' | 'history' | 'admin'>(
    'levels'
  );

  // Data states
  const [levels, setLevels] = useState<ClarityLearningLevel[]>([]);
  const [questions, setQuestions] = useState<ClarityQuestionSummary[]>([]);
  const [progressSummary, setProgressSummary] = useState<ClarityProgressSummary | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Task attempt state
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [isHintExpanded, setIsHintExpanded] = useState<boolean>(false);
  const [isRubricExpanded, setIsRubricExpanded] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isFirstAttemptFree, setIsFirstAttemptFree] = useState<boolean>(true);
  const [submissionCost, setSubmissionCost] = useState<number>(0);
  const [lastResult, setLastResult] = useState<ClarityAttemptResult | null>(null);
  const [isTaskLocked, setIsTaskLocked] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Admin states
  const [adminStats, setAdminStats] = useState<any | null>(null);
  const [adminQuestions, setAdminQuestions] = useState<any[]>([]);
  const [adminFilterLevel, setAdminFilterLevel] = useState<string>('all');
  const [adminFilterStatus, setAdminFilterStatus] = useState<string>('all');

  // 1. Fetch initial Levels and Progress summary
  const loadLevelsAndProgress = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [levelsRes, progressRes] = await Promise.all([
        apiClient.getClarityLevels(),
        apiClient.getClarityProgress(),
      ]);

      if (levelsRes.success && levelsRes.levels) {
        setLevels(levelsRes.levels);
      }
      if (progressRes.success) {
        setProgressSummary(progressRes);
      }
    } catch (err: any) {
      console.error('[ClarityTaskLab] Failed to load levels:', err);
      setErrorMsg(err.message || 'Failed to load Clarity learning levels');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLevelsAndProgress();
  }, [loadLevelsAndProgress]);

  // 2. Fetch Questions when Level is selected
  const loadLevelQuestions = async (levelTopic: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.getClarityLevelQuestions(levelTopic);
      if (res.success && res.questions) {
        setQuestions(res.questions);
        setIsFirstAttemptFree(res.isFirstAttemptFree ?? true);
        setSubmissionCost(res.costPerSubmission ?? (res.isFirstAttemptFree ? 0 : 10));
      }
    } catch (err: any) {
      console.error('[ClarityTaskLab] Failed to load level questions:', err);
      setErrorMsg(err.message || 'Failed to load questions for this level');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Start Task Attempt
  const handleStartTask = async (q: ClarityQuestionSummary) => {
    setSelectedQuestion(q);
    setUserAnswer('');
    setLastResult(null);
    setNotification(null);
    setIsLoading(true);

    try {
      const res = await apiClient.startClarityAttempt(q.questionId);
      if (res.success) {
        setActiveAssignmentId(res.assignmentId);
        setIsTaskLocked(res.isLocked);
        setIsFirstAttemptFree(res.isFirstAttemptFree);
        setSubmissionCost(res.submissionCost);
        setViewMode('task');

        // If previously submitted, load history attempt if available
        if (res.isLocked && q.attemptId) {
          const histRes = await apiClient.getClarityHistory(q.topic);
          if (histRes.success && histRes.history) {
            const att = histRes.history.find((h: any) => h.attemptId === q.attemptId);
            if (att) {
              setUserAnswer(att.submittedAnswer || '');
              setLastResult({
                success: true,
                attemptId: att.attemptId,
                score: att.score,
                rubricFeedback: att.rubricFeedback || [],
                overallFeedback: att.overallFeedback || '',
                submittedAt: att.submittedAt,
                timeTakenSeconds: att.timeTakenSeconds,
                isLocked: true,
                creditsDeducted: 0,
                isFirstAttemptFree: false,
                currentBalance: progressSummary?.aiimsCredits ?? 500,
                xpAwarded: 0,
                currentXP: progressSummary?.xpPoints ?? 100,
              });
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[ClarityTaskLab] Failed to start attempt:', err);
      setNotification({ type: 'error', message: err.message || 'Failed to start attempt' });
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Submit Answer for AI Rubric Evaluation
  const handleSubmitAnswer = async () => {
    if (!activeAssignmentId) return;
    if (userAnswer.trim().length < 10) {
      setNotification({
        type: 'error',
        message:
          'Your answer must be at least 10 characters long to demonstrate meaningful response.',
      });
      return;
    }

    setIsSubmitting(true);
    setNotification(null);

    try {
      const res = await apiClient.submitClarityAttemptPhase4({
        assignmentId: activeAssignmentId,
        answer: userAnswer.trim(),
        timeTakenSeconds: 60,
      });

      if (res.success) {
        setLastResult(res);
        setIsTaskLocked(true);
        setNotification({
          type: 'success',
          message: `Evaluation Complete! Score: ${res.score}/100. Awarded +${res.xpAwarded} XP!`,
        });

        // Immediately update LearnerContext to unlock Focus
        const completedTopic = selectedLevel || selectedQuestion?.topic || 'AI Foundations';
        if (completeClarityTopic) {
          completeClarityTopic(completedTopic);
        }
        if (saveClarityTaskResult) {
          saveClarityTaskResult(completedTopic, 'easy', {
            score: res.score,
            userPrompt: userAnswer.trim(),
            output: res.overallFeedback || 'Evaluated against rubric',
          });
        }

        // Refresh progress and levels
        await loadLevelsAndProgress();
        if (selectedLevel) {
          await loadLevelQuestions(selectedLevel);
        }
      } else {
        setNotification({
          type: 'error',
          message: res.error || 'Failed to complete evaluation',
        });
      }
    } catch (err: any) {
      console.error('[ClarityTaskLab] Submit error:', err);
      if (err.status === 402 || err.code === 'INSUFFICIENT_CREDITS') {
        setNotification({
          type: 'error',
          message: `Insufficient Credits! This submission requires 10 AC. Please earn more credits to continue.`,
        });
      } else if (err.status === 409 || err.code === 'TASK_LOCKED') {
        setIsTaskLocked(true);
        setNotification({
          type: 'info',
          message: 'This task has already been submitted and is locked.',
        });
      } else {
        setNotification({
          type: 'error',
          message:
            err.message || 'Submission failed. Any charged credits were automatically refunded.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Load History
  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getClarityHistory();
      if (res.success) {
        setHistory(res.history || []);
        setViewMode('history');
      }
    } catch (err: any) {
      console.error('[ClarityTaskLab] Failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Admin Panel data
  const loadAdminPanel = async () => {
    setIsLoading(true);
    try {
      const [statsRes, qRes] = await Promise.all([
        apiClient.adminGetClarityStats(),
        apiClient.adminListClarityQuestions(),
      ]);
      if (statsRes.success) setAdminStats(statsRes.stats);
      if (qRes.questions) setAdminQuestions(qRes.questions);
      setViewMode('admin');
    } catch (err: any) {
      console.error('[ClarityTaskLab] Failed to load admin panel:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminApproveQuestion = async (qId: string) => {
    try {
      await apiClient.adminUpdateClarityQuestionStatus(
        qId,
        'APPROVED',
        'Approved by administrator'
      );
      setNotification({ type: 'success', message: `Question ${qId} approved!` });
      await loadAdminPanel();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to approve question' });
    }
  };

  // Render Level Icon
  const renderLevelIcon = (iconName: string) => {
    switch (iconName) {
      case 'Brain':
        return <Brain size={28} style={{ color: 'var(--aiims-token-sky-accent, #0284c7)' }} />;
      case 'GitFork':
        return (
          <GitFork size={28} style={{ color: 'var(--aiims-token-lavender-accent, #7c3aed)' }} />
        );
      case 'Bot':
        return <Bot size={28} style={{ color: 'var(--aiims-token-mint-text, #047857)' }} />;
      default:
        return (
          <Sparkles size={28} style={{ color: 'var(--aiims-token-sunshine-text, #b45309)' }} />
        );
    }
  };

  // Render Difficulty Badge
  const renderDifficultyBadge = (level: string) => {
    if (level === 'Easy') {
      return (
        <Badge variant="success" size="sm">
          Easy
        </Badge>
      );
    }
    if (level === 'Medium') {
      return (
        <Badge variant="warning" size="sm">
          Medium
        </Badge>
      );
    }
    return (
      <Badge variant="purple" size="sm">
        Hard
      </Badge>
    );
  };

  // =========================================================================
  // VIEW: 1. LEVELS SELECTION VIEW
  // =========================================================================
  if (viewMode === 'levels') {
    return (
      <div
        style={{
          maxWidth: '1080px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <PageHeader
          icon={<Brain size={26} />}
          title="Clarity AI Task Lab"
          description="Master hands-on prompt engineering across 3 curated tiers: Understanding, Workflow Orchestration, and Autonomous AI Agents (30 Approved Tasks)."
          badge={{ label: 'Phase 4 Task Lab', variant: 'primary' }}
        />

        {/* Global Progress & Credits Status Card */}
        <Surface
          variant="bordered"
          radius="lg"
          padding="md"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '20px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
            <div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--aiims-text-secondary)',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Total Completed
              </div>
              <div
                style={{ fontSize: '24px', fontWeight: 800, color: 'var(--aiims-text-heading)' }}
              >
                {progressSummary?.totalCompleted ?? 0}{' '}
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--aiims-text-secondary)',
                  }}
                >
                  / 30 Questions
                </span>
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--aiims-text-secondary)',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Average Score
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: 'var(--aiims-token-mint-text, #047857)',
                }}
              >
                {progressSummary?.averageScore ?? 0}%
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--aiims-text-secondary)',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                AIIMS Credits
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: 'var(--aiims-token-sunshine-text, #b45309)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Zap size={20} />{' '}
                {progressSummary?.aiimsCredits ?? state.profile?.aiimsCredits ?? 500} AC
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--aiims-text-secondary)',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                XP Points
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: 'var(--aiims-token-lavender-accent, #7c3aed)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Award size={20} /> {progressSummary?.xpPoints ?? state.profile?.xpPoints ?? 100} XP
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="outline" size="sm" icon={<Clock size={14} />} onClick={loadHistory}>
              Attempt History
            </Button>
            {isAdmin && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Sliders size={14} />}
                onClick={loadAdminPanel}
              >
                Admin Question Bank
              </Button>
            )}
          </div>
        </Surface>

        {/* 3 Learning Levels Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {levels.map((lvl) => (
            <Surface
              key={lvl.id}
              variant="bordered"
              radius="lg"
              padding="lg"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s, box-shadow 0.2s',
                borderTop: `4px solid ${
                  lvl.topic === 'Understanding'
                    ? 'var(--aiims-token-sky-accent, #0284c7)'
                    : lvl.topic === 'Workflow'
                      ? 'var(--aiims-token-lavender-accent, #7c3aed)'
                      : 'var(--aiims-token-mint-text, #047857)'
                }`,
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '14px',
                  }}
                >
                  <div
                    style={{
                      padding: '10px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--aiims-bg-subtle, #f8fafc)',
                    }}
                  >
                    {renderLevelIcon(lvl.icon)}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: '4px',
                    }}
                  >
                    <Badge
                      variant={
                        lvl.topic === 'Understanding'
                          ? 'sky'
                          : lvl.topic === 'Workflow'
                            ? 'purple'
                            : 'mint'
                      }
                    >
                      {lvl.totalQuestions} Questions
                    </Badge>
                    {lvl.isFirstAttemptFree ? (
                      <Badge variant="success" size="sm">
                        Free 1st Attempt
                      </Badge>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--aiims-text-secondary)' }}>
                        10 AC / attempt
                      </span>
                    )}
                  </div>
                </div>

                <h3
                  style={{
                    margin: '0 0 6px',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-heading)',
                  }}
                >
                  {lvl.title}
                </h3>
                <p
                  style={{
                    margin: '0 0 16px',
                    fontSize: '13px',
                    color: 'var(--aiims-text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  {lvl.description}
                </p>

                {/* Progress bar */}
                <div style={{ marginBottom: '16px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      fontWeight: 600,
                      marginBottom: '6px',
                    }}
                  >
                    <span>Progress</span>
                    <span>
                      {lvl.completedQuestions} / {lvl.totalQuestions} Completed (
                      {lvl.progressPercentage}%)
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: 'var(--aiims-bg-subtle, #e2e8f0)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${lvl.progressPercentage}%`,
                        height: '100%',
                        backgroundColor:
                          lvl.topic === 'Understanding'
                            ? 'var(--aiims-token-sky-accent, #0284c7)'
                            : lvl.topic === 'Workflow'
                              ? 'var(--aiims-token-lavender-accent, #7c3aed)'
                              : 'var(--aiims-token-mint-text, #047857)',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              </div>

              <Button
                variant={
                  lvl.topic === 'Understanding'
                    ? 'sky'
                    : lvl.topic === 'Workflow'
                      ? 'secondary'
                      : 'mint'
                }
                size="md"
                fullWidth
                icon={<ArrowRight size={16} />}
                onClick={() => {
                  setSelectedLevel(lvl.topic);
                  loadLevelQuestions(lvl.topic);
                  setViewMode('questions');
                }}
              >
                {lvl.completedQuestions > 0 ? 'Continue Level' : 'Start Level'}
              </Button>
            </Surface>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: 2. LEVEL QUESTIONS EXPLORER
  // =========================================================================
  if (viewMode === 'questions') {
    return (
      <div
        style={{
          maxWidth: '1080px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={16} />}
            iconPosition="left"
            onClick={() => setViewMode('levels')}
          >
            Back to Levels
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge variant="primary">{selectedLevel} Level</Badge>
            {isFirstAttemptFree ? (
              <Badge variant="success">First Attempt: FREE (0 AC)</Badge>
            ) : (
              <Badge variant="warning">Submission: 10 AC</Badge>
            )}
          </div>
        </div>

        <PageHeader
          icon={<FileText size={24} />}
          title={`${selectedLevel} Question Bank`}
          description={`Select any of the 10 reviewed & approved challenges. Submit your structured response for genuine AI rubric evaluation.`}
        />

        {errorMsg && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#b91c1c',
              fontSize: '14px',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Questions Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {questions.map((q, idx) => (
            <Surface
              key={q.questionId}
              variant="bordered"
              radius="lg"
              padding="md"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px',
                borderLeft: `4px solid ${
                  q.userStatus === 'COMPLETED'
                    ? 'var(--aiims-token-mint-text, #047857)'
                    : 'var(--aiims-border-subtle, #cbd5e1)'
                }`,
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '6px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--aiims-text-secondary)',
                    }}
                  >
                    #{idx + 1}
                  </span>
                  {renderDifficultyBadge(q.level)}
                  <h4
                    style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: 700,
                      color: 'var(--aiims-text-heading)',
                    }}
                  >
                    {q.title}
                  </h4>
                  {q.userStatus === 'COMPLETED' && (
                    <Badge variant="success" icon={<CheckCircle2 size={12} />}>
                      Score: {q.lastScore}/100
                    </Badge>
                  )}
                </div>

                <p
                  style={{
                    margin: '0 0 6px',
                    fontSize: '13px',
                    color: 'var(--aiims-text-secondary)',
                    lineHeight: 1.45,
                  }}
                >
                  <strong>Objective:</strong> {q.learningObjective}
                </p>

                <div style={{ fontSize: '12px', color: 'var(--aiims-text-tertiary, #64748b)' }}>
                  <strong>Format:</strong> {q.expectedAnswerFormat} • <strong>Rubric:</strong>{' '}
                  {q.scoringRubric.length} criteria
                </div>
              </div>

              <div>
                <Button
                  variant={q.userStatus === 'COMPLETED' ? 'outline' : 'primary'}
                  size="sm"
                  icon={q.userStatus === 'COMPLETED' ? <Eye size={14} /> : <ArrowRight size={14} />}
                  onClick={() => handleStartTask(q)}
                >
                  {q.userStatus === 'COMPLETED' ? 'Review Submission' : 'Start Task'}
                </Button>
              </div>
            </Surface>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: 3. ACTIVE TASK ATTEMPT & EVALUATION VIEW
  // =========================================================================
  if (viewMode === 'task' && selectedQuestion) {
    return (
      <QuestionWorkbench
        module="Clarity"
        questionId={selectedQuestion.questionId}
        questionTitle={selectedQuestion.title}
        topicId={selectedQuestion.topic || ''}
        topicTitle={selectedQuestion.topic || ''}
        difficulty={selectedQuestion.level || 'intermediate'}
        problemStatement={selectedQuestion.promptText || selectedQuestion.title}
        scenarioInput={selectedQuestion.testScenario}
        outputRequirements={
          Array.isArray(selectedQuestion.expectedCriteria) &&
          selectedQuestion.expectedCriteria.length > 0
            ? selectedQuestion.expectedCriteria
            : undefined
        }
        onBack={() => {
          if (selectedLevel) loadLevelQuestions(selectedLevel);
          setViewMode('questions');
        }}
      />
    );
  }

  // =========================================================================
  // VIEW: 4. ATTEMPT HISTORY VIEW
  // =========================================================================
  if (viewMode === 'history') {
    return (
      <div
        style={{
          maxWidth: '1080px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={16} />}
            iconPosition="left"
            onClick={() => setViewMode('levels')}
          >
            Back to Levels
          </Button>
          <Badge variant="primary">{history.length} Attempt Records</Badge>
        </div>

        <PageHeader
          icon={<Clock size={24} />}
          title="Clarity Attempt History"
          description="Authoritative, immutable attempt history persisted in PostgreSQL with scores and rubric breakdown."
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {history.length === 0 ? (
            <Surface
              variant="bordered"
              radius="lg"
              padding="lg"
              style={{ textAlign: 'center', color: 'var(--aiims-text-secondary)' }}
            >
              No clarity attempts recorded yet. Start your first free attempt in any of the 3
              levels!
            </Surface>
          ) : (
            history.map((att) => (
              <Surface key={att.attemptId} variant="bordered" radius="lg" padding="md">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--aiims-text-secondary)',
                      }}
                    >
                      {att.topic} • {att.level}
                    </span>
                    <h4 style={{ margin: '2px 0', fontSize: '16px', fontWeight: 700 }}>
                      {att.title}
                    </h4>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Badge variant={att.score >= 80 ? 'success' : 'warning'} size="md">
                      Score: {att.score}/100
                    </Badge>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--aiims-text-secondary)',
                        marginTop: '4px',
                      }}
                    >
                      {new Date(att.submittedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <p
                  style={{
                    margin: '0 0 10px',
                    fontSize: '13px',
                    color: 'var(--aiims-text-secondary)',
                  }}
                >
                  {att.overallFeedback}
                </p>

                <div
                  style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: 'var(--aiims-text-secondary)',
                    backgroundColor: 'var(--aiims-bg-subtle, #f8fafc)',
                    padding: '6px 10px',
                    borderRadius: '4px',
                  }}
                >
                  Attempt ID: {att.attemptId}
                </div>
              </Surface>
            ))
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: 5. ADMIN QUESTION BANK MANAGEMENT PANEL
  // =========================================================================
  if (viewMode === 'admin') {
    return (
      <div
        style={{
          maxWidth: '1080px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={16} />}
            iconPosition="left"
            onClick={() => setViewMode('levels')}
          >
            Back to Levels
          </Button>
          <Badge variant="purple">Admin Review Panel</Badge>
        </div>

        <PageHeader
          icon={<Sliders size={24} />}
          title="Question Bank Review & Administration"
          description="Review question rubrics, approve/reject draft submissions, and track approved question counts per level."
        />

        {/* Stats Summary per level */}
        {adminStats && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {Object.entries(adminStats).map(([topicKey, st]: [string, any]) => (
              <Surface key={topicKey} variant="bordered" radius="lg" padding="md">
                <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700 }}>{topicKey}</h4>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    marginBottom: '4px',
                  }}
                >
                  <span>Approved (Target: 10):</span>
                  <strong style={{ color: '#059669' }}>{st.approved} / 10</strong>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    marginBottom: '4px',
                  }}
                >
                  <span>Drafts / Review:</span>
                  <span>{st.draft + st.review}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Total in DB:</span>
                  <strong>{st.total}</strong>
                </div>
              </Surface>
            ))}
          </div>
        )}

        {/* Questions Table */}
        <Surface variant="bordered" radius="lg" padding="lg">
          <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700 }}>
            Question Bank Inventory ({adminQuestions.length} Total)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {adminQuestions.map((q) => (
              <div
                key={q.questionId}
                style={{
                  padding: '12px 14px',
                  border: '1px solid var(--aiims-border, #e2e8f0)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: 'var(--aiims-text-secondary)',
                      }}
                    >
                      {q.questionId}
                    </span>
                    <Badge
                      variant={
                        q.topic === 'Understanding'
                          ? 'sky'
                          : q.topic === 'Workflow'
                            ? 'purple'
                            : 'mint'
                      }
                      size="sm"
                    >
                      {q.topic}
                    </Badge>
                    {renderDifficultyBadge(q.level)}
                    <Badge
                      variant={
                        q.status === 'APPROVED'
                          ? 'success'
                          : q.status === 'DRAFT'
                            ? 'warning'
                            : 'neutral'
                      }
                      size="sm"
                    >
                      {q.status}
                    </Badge>
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--aiims-text-heading)',
                    }}
                  >
                    {q.title}
                  </div>
                </div>

                <div>
                  {q.status !== 'APPROVED' ? (
                    <Button
                      variant="green"
                      size="sm"
                      icon={<Check size={14} />}
                      onClick={() => handleAdminApproveQuestion(q.questionId)}
                    >
                      Approve
                    </Button>
                  ) : (
                    <Badge variant="success">Approved & Live</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </div>
    );
  }

  return null;
};
