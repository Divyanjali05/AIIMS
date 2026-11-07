import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  Lightbulb,
  Clock,
  Zap,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Lock,
  Send,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Award,
  HelpCircle,
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { apiClient } from '../../api/client';
import { useLearner } from '../../context/LearnerContext';
import { LearnerSubmissionsSection } from '../../components/clarity/LearnerSubmissionsSection';

interface Level2AITaskLabProps {
  topicName: string;
  onTaskCompleted?: (difficulty: 'easy' | 'medium' | 'advanced', score: number) => void;
  legacyTryThis?: {
    question: string;
    options: {
      id: string;
      text: string;
      explanation: string;
      isRecommended?: boolean;
    }[];
  };
}

export const Level2AITaskLab: React.FC<Level2AITaskLabProps> = ({ topicName, onTaskCompleted }) => {
  const { state } = useLearner();

  // Active assignment & question state from centralized Question Bank
  const [activeAssignment, setActiveAssignment] = useState<any | null>(null);
  const [assignedQuestion, setAssignedQuestion] = useState<any | null>(null);
  const [isLoadingTask, setIsLoadingTask] = useState<boolean>(true);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Authoritative progression state
  const [currentLevel, setCurrentLevel] = useState<'Easy' | 'Medium' | 'Hard'>('Easy');
  const [consecutiveHighScores, setConsecutiveHighScores] = useState<number>(0);

  // Authoritative elapsed timer
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Section 2: Scenario expansion toggle
  const [isScenarioExpanded, setIsScenarioExpanded] = useState<boolean>(false);
  const [copiedTestScenario, setCopiedTestScenario] = useState<boolean>(false);

  // Section 3: Collapsed Hint (optional)
  const [isHintExpanded, setIsHintExpanded] = useState<boolean>(false);

  // Section 4: Prompt Editor (initially empty, placeholder: "Write your prompt here")
  const [promptText, setPromptText] = useState<string>('');

  // Section 5: Run vs Submit decoupled states
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [runMetrics, setRunMetrics] = useState<{
    modelUsed?: string;
    executionTimeMs?: number;
    creditsDeducted?: number;
    isFreeTrial?: boolean;
  } | null>(null);

  // Section 6: Results & rubric-based evaluation feedback
  const [submissionResult, setSubmissionResult] = useState<{
    attemptId: string;
    score: number;
    rubricFeedback: any[];
    overallFeedback?: string;
    submittedAt?: string;
    timeTakenSeconds?: number;
    creditsAwarded?: number;
    xpAwarded?: number;
    progression?: any;
  } | null>(null);

  // Doubt / Mentor Query State (Locked alongside task submission)
  const [doubtText, setDoubtText] = useState<string>('');
  const [doubtSubmitted, setDoubtSubmitted] = useState<boolean>(false);

  // UI feedback banner
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [copiedOutput, setCopiedOutput] = useState<boolean>(false);
  const [refreshSubmissionsKey, setRefreshSubmissionsKey] = useState<number>(0);

  // Format MM:SS for timer
  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Draft key in localStorage for auto-saving drafts before submission
  const draftStorageKey = activeAssignment?.assignmentId
    ? `aiims_clarity_draft_${activeAssignment.assignmentId}`
    : `aiims_clarity_draft_${topicName}`;

  // Fetch or initialize active clarity task from Question Bank
  const loadActiveTask = async () => {
    setIsLoadingTask(true);
    setNotification(null);
    try {
      const res = await apiClient.getClarityActiveTask(topicName, 'General');
      if (res && res.hasActiveTask) {
        setActiveAssignment({
          assignmentId: res.assignmentId,
          assignedAt: res.assignedAt,
          completedAt: res.completedAt,
          status: res.isLocked ? 'SUBMITTED' : 'IN_PROGRESS',
        });
        setAssignedQuestion(res.question);
        setCurrentLevel(res.currentLevel || res.question?.level || 'Easy');
        setConsecutiveHighScores(res.consecutiveHighScores || 0);

        if (res.isLocked && res.attempt) {
          setIsLocked(true);
          setPromptText(res.attempt.submittedAnswer || '');
          setSubmissionResult({
            attemptId: res.attempt.attemptId,
            score: res.attempt.score,
            rubricFeedback: res.attempt.rubricFeedback || [],
            overallFeedback: res.attempt.overallFeedback || '',
            submittedAt: res.attempt.submittedAt,
            timeTakenSeconds: res.attempt.timeTakenSeconds || 0,
          });
          setElapsedSeconds(res.attempt.timeTakenSeconds || 0);
        } else {
          setIsLocked(false);
          // Restore draft safely from localStorage
          const savedDraft = localStorage.getItem(`aiims_clarity_draft_${res.assignmentId}`);
          setPromptText(savedDraft || '');
          setSubmissionResult(null);
          setRunOutput(null);
          setRunMetrics(null);

          // Compute authoritative elapsed seconds from assignedAt
          if (res.assignedAt) {
            const startMs = new Date(res.assignedAt).getTime();
            const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
            setElapsedSeconds(elapsed);
          }
        }
      }
    } catch (err: any) {
      console.warn('[Level2AITaskLab] Failed to load active task:', err);
    } finally {
      setIsLoadingTask(false);
    }
  };

  useEffect(() => {
    loadActiveTask();
  }, [topicName]);

  // Authoritative elapsed timer: ticks every 1 second while task is active and unlocked
  useEffect(() => {
    if (isLocked || !activeAssignment?.assignedAt) return;

    const startMs = new Date(activeAssignment.assignedAt).getTime();
    const interval = setInterval(() => {
      const nowMs = Date.now();
      const currentElapsed = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setElapsedSeconds(currentElapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeAssignment?.assignedAt, isLocked]);

  // Safe draft persistence: auto-save typed prompt to localStorage
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isLocked) return;
    const value = e.target.value;
    setPromptText(value);
    if (activeAssignment?.assignmentId) {
      try {
        localStorage.setItem(draftStorageKey, value);
      } catch {
        // Safe storage quota fallback
      }
    }
  };

  // Section 5: Decoupled RUN Action (0 AC on trial, 10 AC subsequently, refund on failure)
  const handleRunTask = async () => {
    if (!promptText.trim() || isLocked || isRunning) return;

    setIsRunning(true);
    setNotification(null);

    try {
      const res = await apiClient.runClarityTask({
        assignmentId: activeAssignment?.assignmentId,
        topic: topicName,
        difficulty: currentLevel.toLowerCase(),
        taskTitle: assignedQuestion?.title,
        userPrompt: promptText.trim(),
        contextData: assignedQuestion?.testScenario,
      });

      if (res) {
        if (res.error) {
          if (res.code === 'TASK_LOCKED') {
            setIsLocked(true);
          }
          setNotification({ type: 'error', message: res.error });
        } else {
          setRunOutput(res.output || 'Execution completed.');
          setRunMetrics({
            modelUsed: res.modelUsed,
            executionTimeMs: res.executionTimeMs,
            creditsDeducted: res.creditsDeducted,
            isFreeTrial: res.isFreeTrial,
          });

          const creditMsg = res.isFreeTrial
            ? 'Complimentary trial run executed (0 AC deducted).'
            : `Ran successfully. Deducted ${res.creditsDeducted || 10} AC. Balance: ${res.currentBalance} AC.`;
          setNotification({ type: 'info', message: creditMsg });
        }
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Run failed. Any deducted credits were safely refunded.',
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Section 5: Decoupled SUBMIT Action (Evaluates rubric, locks question, awards credits & XP, updates progression)
  const handleSubmitTask = async () => {
    if (!promptText.trim() || isLocked || isSubmitting) return;

    if (!activeAssignment?.assignmentId) {
      setNotification({ type: 'error', message: 'Active assignment ID is missing.' });
      return;
    }

    setIsSubmitting(true);
    setNotification(null);

    try {
      const res = await apiClient.submitClarityAttempt({
        assignmentId: activeAssignment.assignmentId,
        answer: promptText.trim(),
        timeTakenSeconds: elapsedSeconds,
      });

      if (res && res.success) {
        // Enforce lock permanently
        setIsLocked(true);

        // Clear local storage draft
        try {
          localStorage.removeItem(draftStorageKey);
        } catch {}

        setSubmissionResult({
          attemptId: res.attemptId,
          score: res.score,
          rubricFeedback: res.rubricFeedback || [],
          overallFeedback: res.overallFeedback || '',
          submittedAt: res.submittedAt,
          timeTakenSeconds: res.timeTakenSeconds,
          creditsAwarded: res.creditsAwarded,
          xpAwarded: res.xpAwarded,
          progression: res.progression,
        });

        // Update progression indicators
        if (res.progression) {
          setCurrentLevel(res.progression.currentLevel);
          setConsecutiveHighScores(res.progression.consecutiveHighScores);
        }

        setNotification({
          type: 'success',
          message: `Task successfully submitted! Score: ${res.score}/100. Awarded +${res.creditsAwarded || 50} AC and +${res.xpAwarded || 100} XP. Task is now locked.`,
        });

        if (onTaskCompleted) {
          const diffMap: Record<string, 'easy' | 'medium' | 'advanced'> = {
            Easy: 'easy',
            Medium: 'medium',
            Hard: 'advanced',
          };
          onTaskCompleted(diffMap[currentLevel] || 'easy', res.score);
        }

        setRefreshSubmissionsKey((k) => k + 1);
      } else if (res && res.error) {
        if (res.code === 'TASK_LOCKED') {
          setIsLocked(true);
        }
        setNotification({ type: 'error', message: res.error });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to submit task. Please check your connection and retry.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Serve Next Question handler (Loads next eligible question for the learner)
  const handleNextQuestion = async () => {
    setIsLoadingTask(true);
    setNotification(null);
    try {
      const res = await apiClient.serveNextClarityTask(topicName, 'General');
      if (res && res.success) {
        setActiveAssignment({
          assignmentId: res.assignmentId,
          assignedAt: res.assignedAt,
          status: 'ASSIGNED',
        });
        setAssignedQuestion(res.question);
        setCurrentLevel(res.currentLevel || res.question?.level || 'Easy');
        setConsecutiveHighScores(res.consecutiveHighScores || 0);
        setIsLocked(false);
        setPromptText('');
        setRunOutput(null);
        setRunMetrics(null);
        setSubmissionResult(null);
        setElapsedSeconds(0);
        setIsHintExpanded(false);
        setDoubtText('');
        setDoubtSubmitted(false);

        try {
          localStorage.removeItem(`aiims_clarity_draft_${res.assignmentId}`);
        } catch {}

        setNotification({
          type: 'info',
          message: `Loaded new practice question at ${res.currentLevel} level.`,
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to load next question.',
      });
    } finally {
      setIsLoadingTask(false);
    }
  };

  const handleCopyTestScenario = () => {
    if (!assignedQuestion?.testScenario) return;
    navigator.clipboard.writeText(assignedQuestion.testScenario);
    setCopiedTestScenario(true);
    setTimeout(() => setCopiedTestScenario(false), 2000);
  };

  const handleCopyRunOutput = () => {
    if (!runOutput) return;
    navigator.clipboard.writeText(runOutput);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  const handleClearDraft = () => {
    if (isLocked) return;
    setPromptText('');
    try {
      localStorage.removeItem(draftStorageKey);
    } catch {}
  };

  const handleSendDoubt = () => {
    if (isLocked || !doubtText.trim()) return;
    setDoubtSubmitted(true);
    setTimeout(() => {
      setDoubtText('');
    }, 1500);
  };

  // Difficulty chip color resolver
  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'Hard':
        return {
          label: 'Hard',
          color: '#7c3aed',
          bg: 'var(--aiims-tint-violet-bg, #f5f3ff)',
          border: 'var(--aiims-tint-violet-border, #ddd6fe)',
        };
      case 'Medium':
        return {
          label: 'Medium',
          color: '#d97706',
          bg: 'var(--aiims-tint-amber-bg, #fffbeb)',
          border: 'var(--aiims-tint-amber-border, #fde68a)',
        };
      case 'Easy':
      default:
        return {
          label: 'Easy',
          color: '#059669',
          bg: 'var(--aiims-tint-emerald-bg, #ecfdf5)',
          border: 'var(--aiims-tint-emerald-border, #a7f3d0)',
        };
    }
  };

  const badgeProps = getLevelBadge(currentLevel);

  if (isLoadingTask && !assignedQuestion) {
    return (
      <Surface variant="mint" radius="lg" padding="lg">
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid var(--aiims-primary)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ color: 'var(--aiims-text-heading)', fontWeight: 600 }}>
            Fetching eligible question from Question Bank for {topicName}...
          </p>
        </div>
      </Surface>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* GLOBAL NOTIFICATION BANNER */}
      {notification && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor:
              notification.type === 'success'
                ? 'var(--aiims-tint-emerald-bg, #ecfdf5)'
                : notification.type === 'error'
                  ? 'var(--aiims-tint-rose-bg, #fff1f2)'
                  : 'var(--aiims-tint-sky-bg, #f0f9ff)',
            color:
              notification.type === 'success'
                ? '#059669'
                : notification.type === 'error'
                  ? '#dc2626'
                  : 'var(--aiims-primary)',
            border: `1px solid ${
              notification.type === 'success'
                ? 'var(--aiims-tint-emerald-border, #a7f3d0)'
                : notification.type === 'error'
                  ? 'var(--aiims-tint-rose-border, #fecdd3)'
                  : 'var(--aiims-tint-sky-border, #bae6fd)'
            }`,
          }}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={16} />
          ) : notification.type === 'error' ? (
            <AlertTriangle size={16} />
          ) : (
            <Zap size={16} />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ========================================================
          SECTION 1: TOPIC NAME, DIFFICULTY CHIP, ELAPSED TIMER
          ======================================================== */}
      <Surface variant="sky" radius="lg" padding="md">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Topic & Difficulty */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'var(--aiims-primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap size={18} />
            </div>

            <div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--aiims-primary)',
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                }}
              >
                Clarity Practice Lab
              </span>
              <h3
                style={{
                  margin: 0,
                  fontSize: '17px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading)',
                  fontFamily: "'Fredoka', sans-serif",
                }}
              >
                {topicName}
              </h3>
            </div>

            {/* Difficulty Level Chip */}
            <div
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 800,
                color: badgeProps.color,
                backgroundColor: badgeProps.bg,
                border: `1px solid ${badgeProps.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>Level: {badgeProps.label}</span>
              {consecutiveHighScores > 0 && !isLocked && (
                <span style={{ opacity: 0.85, fontSize: '11px' }}>
                  ({consecutiveHighScores}/2 toward advance)
                </span>
              )}
            </div>
          </div>

          {/* Authoritative Elapsed Timer & Lock Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isLocked ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  backgroundColor: 'var(--aiims-tint-rose-bg, #fff1f2)',
                  border: '1px solid var(--aiims-tint-rose-border, #fecdd3)',
                  borderRadius: '8px',
                  color: '#dc2626',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <Lock size={14} />
                <span>Locked • Finalized in {formatTime(elapsedSeconds)}</span>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  backgroundColor: 'var(--aiims-bg-card)',
                  border: '1px solid var(--aiims-border-card)',
                  borderRadius: '8px',
                  boxShadow: 'var(--aiims-shadow-card)',
                  color: 'var(--aiims-text-heading)',
                  fontSize: '13px',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                }}
                title="Authoritative practice duration computed from server assignment timestamp"
              >
                <Clock size={15} style={{ color: 'var(--aiims-primary)' }} />
                <span>Elapsed: {formatTime(elapsedSeconds)}</span>
              </div>
            )}
          </div>
        </div>
      </Surface>

      {/* ========================================================
          SECTION 2: QUESTION CARD (CONCISE TITLE & SCENARIO)
          ======================================================== */}
      <Surface variant="mint" radius="lg" padding="lg">
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--aiims-tint-emerald-text)',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
              }}
            >
              Practical Workplace Scenario (Non-Coder Track)
            </span>
          </div>

          <h2
            style={{
              margin: '0 0 10px',
              fontSize: '20px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading)',
              fontFamily: "'Fredoka', sans-serif",
            }}
          >
            {assignedQuestion?.title || 'AI Prompt Engineering Challenge'}
          </h2>

          {/* Concise Scenario (<= 4 lines before expansion) */}
          <div
            style={{
              fontSize: '14px',
              color: 'var(--aiims-text-heading)',
              lineHeight: 1.6,
              fontWeight: 500,
              maxHeight: isScenarioExpanded ? 'none' : '90px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <p style={{ margin: 0 }}>
              {assignedQuestion?.promptText ||
                'Design a reliable AI prompt that addresses the operational requirements described below.'}
            </p>
          </div>

          {assignedQuestion?.promptText && assignedQuestion.promptText.length > 200 && (
            <button
              onClick={() => setIsScenarioExpanded(!isScenarioExpanded)}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 0 0',
                color: 'var(--aiims-primary)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {isScenarioExpanded ? (
                <>
                  Show Less <ChevronUp size={13} />
                </>
              ) : (
                <>
                  Show More <ChevronDown size={13} />
                </>
              )}
            </button>
          )}
        </div>

        {/* Test Input / Context Scenario */}
        {assignedQuestion?.testScenario && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: 'var(--aiims-bg-card)',
              border: '1px solid var(--aiims-border-card)',
              boxShadow: 'var(--aiims-shadow-card)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--aiims-primary)',
                  textTransform: 'uppercase',
                }}
              >
                Permitted Test Input Context
              </span>
              <Button
                variant="ghost"
                size="sm"
                icon={copiedTestScenario ? <Check size={12} /> : <Copy size={12} />}
                onClick={handleCopyTestScenario}
              >
                {copiedTestScenario ? 'Copied' : 'Copy'}
              </Button>
            </div>

            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: 'var(--aiims-text-body)',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                maxHeight: '130px',
                overflowY: 'auto',
              }}
            >
              {assignedQuestion.testScenario}
            </p>
          </div>
        )}
      </Surface>

      {/* ========================================================
          SECTION 3: COLLAPSED HINT (OPTIONAL)
          ======================================================== */}
      {assignedQuestion?.hint && (
        <Surface variant="mint" radius="lg" padding="sm">
          <button
            onClick={() => setIsHintExpanded(!isHintExpanded)}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              cursor: 'pointer',
              color: 'var(--aiims-text-heading)',
              fontWeight: 700,
              fontSize: '13px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lightbulb size={16} color="#d97706" />
              <span>Hint (optional)</span>
            </div>
            {isHintExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {isHintExpanded && (
            <div
              style={{
                padding: '10px 14px 12px',
                borderTop: '1px solid var(--aiims-tint-emerald-border)',
                fontSize: '13px',
                color: 'var(--aiims-text-body)',
                lineHeight: 1.55,
              }}
            >
              <p style={{ margin: 0 }}>{assignedQuestion.hint}</p>
            </div>
          )}
        </Surface>
      )}

      {/* ========================================================
          SECTION 4: PROMPT EDITOR (EMPTY INITIALLY, DRAFT PRESERVED)
          ======================================================== */}
      <Surface variant="mint" radius="lg" padding="lg">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Your AI Prompt
            </span>
            {isLocked && (
              <Badge variant="neutral" icon={<Lock size={11} />}>
                Read-Only (Locked)
              </Badge>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--aiims-text-muted)', fontWeight: 600 }}>
              {promptText.length} / 3,000 chars
            </span>
            {!isLocked && promptText.length > 0 && (
              <button
                onClick={handleClearDraft}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--aiims-text-muted)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Clear Draft
              </button>
            )}
          </div>
        </div>

        <textarea
          rows={6}
          value={promptText}
          onChange={handlePromptChange}
          disabled={isLocked}
          placeholder="Write your prompt here"
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '10px',
            border: isLocked
              ? '1px solid var(--aiims-border-card)'
              : '1.5px solid var(--aiims-primary)',
            backgroundColor: isLocked
              ? 'var(--aiims-bg-card-subtle, #f9fafb)'
              : 'var(--aiims-bg-card)',
            color: 'var(--aiims-text-heading)',
            fontSize: '13.5px',
            lineHeight: 1.55,
            fontFamily: 'inherit',
            resize: isLocked ? 'none' : 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
            opacity: isLocked ? 0.9 : 1,
          }}
        />

        {/* ========================================================
            SECTION 5: SEPARATE RUN AND SUBMIT ACTIONS
            ======================================================== */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '14px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Run Button (Decoupled: does NOT lock or complete task) */}
            <Button
              variant="secondary"
              size="md"
              icon={isRunning ? undefined : <Play size={14} />}
              onClick={handleRunTask}
              disabled={isLocked || isRunning || !promptText.trim()}
            >
              {isRunning
                ? 'Running AI...'
                : (state.clarity as any)?.trialRunsUsed === 0
                  ? 'Run Prompt (Free Trial)'
                  : 'Run Prompt (10 AC)'}
            </Button>

            {/* Clear output button */}
            {runOutput && !isLocked && (
              <Button
                variant="ghost"
                size="sm"
                icon={<RotateCcw size={12} />}
                onClick={() => {
                  setRunOutput(null);
                  setRunMetrics(null);
                }}
              >
                Reset Output
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Submit Button (Server rubric scoring, locks task, awards +50 AC, level progression) */}
            <Button
              variant="green"
              size="md"
              icon={isSubmitting ? undefined : <CheckCircle2 size={15} />}
              onClick={handleSubmitTask}
              disabled={isLocked || isSubmitting || !promptText.trim()}
            >
              {isSubmitting
                ? 'Submitting & Evaluating...'
                : isLocked
                  ? 'Task Submitted'
                  : 'Submit Task (+50 AC)'}
            </Button>
          </div>
        </div>
      </Surface>

      {/* ========================================================
          RUN OUTPUT PREVIEW (AFTER RUNNING AI)
          ======================================================== */}
      {runOutput && !submissionResult && (
        <Surface variant="mint" radius="lg" padding="md">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="var(--aiims-primary)" />
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--aiims-primary)' }}>
                AI Model Test Execution Output
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {runMetrics?.modelUsed && <Badge variant="neutral">{runMetrics.modelUsed}</Badge>}
              {runMetrics?.executionTimeMs !== undefined && (
                <Badge variant="neutral">{runMetrics.executionTimeMs}ms</Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                icon={copiedOutput ? <Check size={12} /> : <Copy size={12} />}
                onClick={handleCopyRunOutput}
              >
                {copiedOutput ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--aiims-bg-card)',
              borderRadius: '8px',
              border: '1px solid var(--aiims-border-card)',
              fontSize: '13px',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              maxHeight: '200px',
              overflowY: 'auto',
              color: 'var(--aiims-text-heading)',
            }}
          >
            {runOutput}
          </div>

          <p
            style={{
              margin: '8px 0 0',
              fontSize: '11.5px',
              color: 'var(--aiims-text-muted)',
              fontStyle: 'italic',
            }}
          >
            💡 Review the output above to refine your prompt. When satisfied, click "Submit Task
            (+50 AC)" to lock and finalize your attempt.
          </p>
        </Surface>
      )}

      {/* ========================================================
          SECTION 6: RESULTS & RUBRIC-BASED EVALUATION FEEDBACK
          ======================================================== */}
      {submissionResult && (
        <Surface variant="sky" radius="lg" padding="lg">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Award size={20} />
              </div>

              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#059669',
                    textTransform: 'uppercase',
                  }}
                >
                  Server-Authoritative Rubric Score
                </span>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '22px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading)',
                    fontFamily: "'Fredoka', sans-serif",
                  }}
                >
                  {submissionResult.score} / 100
                </h3>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge variant="success">Completed</Badge>
              <Badge variant="neutral">
                +{submissionResult.creditsAwarded || 50} AC / +{submissionResult.xpAwarded || 100}{' '}
                XP
              </Badge>
            </div>
          </div>

          {/* Level Progression Transition Notification */}
          {submissionResult.progression && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor:
                  submissionResult.progression.direction === 'UP'
                    ? 'var(--aiims-tint-emerald-bg, #ecfdf5)'
                    : submissionResult.progression.direction === 'DOWN'
                      ? 'var(--aiims-tint-amber-bg, #fffbeb)'
                      : 'var(--aiims-bg-card)',
                border: `1px solid ${
                  submissionResult.progression.direction === 'UP'
                    ? 'var(--aiims-tint-emerald-border, #a7f3d0)'
                    : submissionResult.progression.direction === 'DOWN'
                      ? 'var(--aiims-tint-amber-border, #fde68a)'
                      : 'var(--aiims-border-card)'
                }`,
                marginBottom: '16px',
              }}
            >
              {submissionResult.progression.direction === 'UP' ? (
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                  🎉 Level Advanced to {submissionResult.progression.currentLevel}! You achieved two
                  consecutive high scores (≥80) in this topic!
                </p>
              ) : submissionResult.progression.direction === 'DOWN' ? (
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#d97706' }}>
                  ⚠️ Score fell below 50. Level adjusted to{' '}
                  {submissionResult.progression.currentLevel} for additional foundational practice.
                </p>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--aiims-text-heading)',
                  }}
                >
                  Score recorded. Current Level: {submissionResult.progression.currentLevel} •
                  Consecutive high scores: {submissionResult.progression.consecutiveHighScores}/2
                </p>
              )}
            </div>
          )}

          {/* AI Mentor Overall Evaluation Summary */}
          {submissionResult.overallFeedback && (
            <div
              style={{
                marginBottom: '16px',
                padding: '14px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(124, 58, 237, 0.08)',
                border: '1px solid rgba(124, 58, 237, 0.25)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '6px',
                }}
              >
                <Sparkles size={16} color="var(--aiims-primary, #7c3aed)" />
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: 'var(--aiims-primary, #7c3aed)',
                    letterSpacing: '0.04em',
                  }}
                >
                  AI Mentor Evaluation
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  lineHeight: 1.5,
                  color: 'var(--aiims-text-heading)',
                }}
              >
                {submissionResult.overallFeedback}
              </p>
            </div>
          )}

          {/* Rubric Criteria Breakdown */}
          {submissionResult.rubricFeedback && submissionResult.rubricFeedback.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4
                style={{
                  margin: '0 0 10px',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading)',
                  textTransform: 'uppercase',
                }}
              >
                Rubric Criteria Evaluation
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {submissionResult.rubricFeedback.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--aiims-bg-card)',
                      border: '1px solid var(--aiims-border-card)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: 'var(--aiims-text-heading)',
                        }}
                      >
                        {item.criterion}
                      </span>
                      {item.comment && (
                        <p
                          style={{
                            margin: '2px 0 0',
                            fontSize: '12px',
                            color: 'var(--aiims-text-muted)',
                          }}
                        >
                          {item.comment}
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 800,
                        color:
                          item.score >= item.maxScore * 0.8
                            ? '#059669'
                            : item.score >= item.maxScore * 0.5
                              ? '#d97706'
                              : '#dc2626',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.score} / {item.maxScore}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NEXT QUESTION ACTION */}
          <div
            style={{
              paddingTop: '16px',
              borderTop: '1px solid var(--aiims-border-card)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} color="#059669" />
              <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>
                Attempt finalized & securely locked
              </span>
            </div>

            <Button
              variant="green"
              size="md"
              icon={<ArrowRight size={14} />}
              onClick={handleNextQuestion}
            >
              Next Practice Question →
            </Button>
          </div>
        </Surface>
      )}

      {/* ========================================================
          MENTOR DOUBT / QUERY SECTION (READ-ONLY WHEN LOCKED)
          ======================================================== */}
      <Surface variant="mint" radius="lg" padding="md">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <HelpCircle size={16} color="var(--aiims-primary)" />
          <span
            style={{
              fontSize: '13px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading)',
            }}
          >
            Ask Mentor about this Question
          </span>
          {isLocked && (
            <Badge variant="neutral" icon={<Lock size={11} />}>
              Locked
            </Badge>
          )}
        </div>

        {doubtSubmitted ? (
          <p style={{ margin: 0, fontSize: '13px', color: '#059669', fontWeight: 600 }}>
            ✓ Your doubt has been recorded for evaluator follow-up.
          </p>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={doubtText}
              onChange={(e) => setDoubtText(e.target.value)}
              disabled={isLocked}
              placeholder={
                isLocked
                  ? 'Task is locked after submission. Doubt chat is read-only.'
                  : 'Have a doubt regarding this prompt scenario? Ask here...'
              }
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--aiims-border-card)',
                backgroundColor: isLocked
                  ? 'var(--aiims-bg-card-subtle, #f9fafb)'
                  : 'var(--aiims-bg-card)',
                fontSize: '13px',
                color: 'var(--aiims-text-heading)',
                outline: 'none',
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              icon={<Send size={13} />}
              onClick={handleSendDoubt}
              disabled={isLocked || !doubtText.trim()}
            >
              Send
            </Button>
          </div>
        )}
      </Surface>

      {/* ========================================================
          MY SUBMISSIONS & EVALUATOR FEEDBACK SECTION
          ======================================================== */}
      {assignedQuestion && (
        <LearnerSubmissionsSection
          currentTaskId={assignedQuestion.questionId}
          currentTaskTitle={assignedQuestion.title}
          onRefreshTrigger={refreshSubmissionsKey}
        />
      )}
    </div>
  );
};
