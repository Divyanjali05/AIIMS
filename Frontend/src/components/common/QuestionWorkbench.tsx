import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Play,
  RotateCcw,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
  MessageSquare,
  FileText,
  Terminal,
  Loader2,
  HelpCircle,
  ArrowLeft,
  History,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Surface } from './Surface';
import { Button } from './Button';
import { Badge } from './Badge';
import { SubmissionItem } from '../../types';

export interface PromptRunRecord {
  id: string;
  prompt: string;
  output: string;
  model: string;
  executionTimeMs: number;
  timestamp: string;
  formativeFeedback?: string[];
}

export interface QuestionWorkbenchProps {
  module: 'Clarity' | 'Focus';
  questionId: string;
  questionTitle: string;
  topicId?: string;
  topicTitle?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'easy' | 'medium' | 'hard' | string;
  problemStatement: string;
  scenarioInput?: string;
  outputRequirements?: string[];
  maxCharacters?: number;
  onBack?: () => void;
  // Optional timer / attempt count from host screens
  timeRemainingFormatted?: string;
  attemptNumber?: number;
}

export const QuestionWorkbench: React.FC<QuestionWorkbenchProps> = ({
  module,
  questionId,
  questionTitle,
  topicId = '',
  topicTitle = '',
  difficulty = 'intermediate',
  problemStatement,
  scenarioInput,
  outputRequirements = [],
  maxCharacters = 5000,
  onBack,
  timeRemainingFormatted,
  attemptNumber,
}) => {
  // State for prompt editor
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runError, setRunError] = useState<string | null>(null);

  // Execution history & active preview
  const [runHistory, setRunHistory] = useState<PromptRunRecord[]>([]);
  const [activeRunIndex, setActiveRunIndex] = useState<number>(-1);

  // Submission state & Admin feedback
  const [submission, setSubmission] = useState<SubmissionItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Copy feedback state
  const [copiedInput, setCopiedInput] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [copiedOutput, setCopiedOutput] = useState<boolean>(false);

  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const storageDraftKey = `aiims_prompt_draft_${questionId}`;

  // 1. Load persisted draft on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(storageDraftKey);
      if (savedDraft && savedDraft.trim()) {
        setUserPrompt(savedDraft);
      }
    } catch {}
  }, [storageDraftKey]);

  // 2. Fetch existing learner submission for this question
  useEffect(() => {
    let mounted = true;
    const fetchExistingSubmission = async () => {
      try {
        const res = await apiClient.getMySubmissions({ taskId: questionId });
        if (
          mounted &&
          res &&
          res.success &&
          Array.isArray(res.submissions) &&
          res.submissions.length > 0
        ) {
          // Take most recent
          const latest = res.submissions[0];
          setSubmission(latest);

          // Populate prompt if editor is currently empty
          const meta = latest.rubricScores || {};
          const priorPrompt = meta.userPrompt || latest.answerContent;
          if (priorPrompt && !localStorage.getItem(storageDraftKey)) {
            setUserPrompt(priorPrompt);
          }

          // If AI output was recorded in metadata, populate into history
          if (meta.aiOutput) {
            const initialRecord: PromptRunRecord = {
              id: `run-saved-${latest.id}`,
              prompt: priorPrompt,
              output: meta.aiOutput,
              model: meta.modelUsed || 'AI Provider',
              executionTimeMs: meta.executionTimeMs || 0,
              timestamp: latest.submittedAt
                ? new Date(latest.submittedAt).toLocaleTimeString()
                : 'Recorded',
            };
            setRunHistory([initialRecord]);
            setActiveRunIndex(0);
          }
        }
      } catch (err) {
        // Non-blocking
      }
    };

    fetchExistingSubmission();
    return () => {
      mounted = false;
    };
  }, [questionId, storageDraftKey]);

  // 3. Draft auto-save handler
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= maxCharacters) {
      setUserPrompt(text);
      try {
        localStorage.setItem(storageDraftKey, text);
      } catch {}
    }
  };

  const handleClearDraft = () => {
    if (window.confirm('Clear your prompt draft? This cannot be undone.')) {
      setUserPrompt('');
      try {
        localStorage.removeItem(storageDraftKey);
      } catch {}
    }
  };

  // 4. Run Prompt handler (real AI execution via secure backend)
  const handleRunPrompt = async () => {
    if (!userPrompt.trim()) {
      setRunError('Please enter a prompt before running.');
      return;
    }
    if (isRunning) return;

    setIsRunning(true);
    setRunError(null);
    setSubmitSuccess(null);
    const startTime = Date.now();

    try {
      const res = await apiClient.runClarityTask({
        assignmentId: questionId,
        topic: topicTitle || module,
        difficulty,
        taskTitle: questionTitle,
        userPrompt: userPrompt.trim(),
        contextData: scenarioInput,
      });

      const latency = res.executionTimeMs || Date.now() - startTime;
      const model = res.modelUsed || 'Anthropic Claude 3.5';
      const output = res.output || 'No output generated by AI provider.';

      const newRun: PromptRunRecord = {
        id: `run-${Date.now()}`,
        prompt: userPrompt.trim(),
        output,
        model,
        executionTimeMs: latency,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        formativeFeedback: Array.isArray(res.recommendations)
          ? res.recommendations
          : Array.isArray(res.strengths)
            ? res.strengths
            : undefined,
      };

      setRunHistory((prev) => [newRun, ...prev]);
      setActiveRunIndex(0);
    } catch (err: any) {
      setRunError(
        err.message ||
          'AI Prompt execution timed out or failed. Please check your prompt and try again.'
      );
    } finally {
      setIsRunning(false);
    }
  };

  // 5. Submit for Admin Review handler
  const handleSubmitForAdminReview = async () => {
    const currentRun = activeRunIndex >= 0 ? runHistory[activeRunIndex] : null;
    const finalPrompt = userPrompt.trim() || currentRun?.prompt || '';
    const finalOutput = currentRun?.output || '';

    if (!finalPrompt || finalPrompt.length < 10) {
      setSubmitError('A prompt of at least 10 characters is required for Admin review.');
      return;
    }

    if (!finalOutput) {
      setSubmitError(
        'Please click "Run Prompt" to generate and preview the AI response before submitting for review.'
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setShowConfirmModal(false);

    try {
      const payload = {
        taskId: questionId,
        taskTitle: questionTitle,
        module,
        topicId,
        topic: topicTitle,
        userPrompt: finalPrompt,
        aiOutput: finalOutput,
        modelUsed: currentRun?.model || 'Anthropic Claude 3.5',
        executionTimeMs: currentRun?.executionTimeMs,
        promptHistory: runHistory.map((r) => ({
          prompt: r.prompt,
          output: r.output,
          model: r.model,
          timestamp: r.timestamp,
        })),
      };

      const res = await apiClient.submitTask(payload);
      if (res && res.success) {
        setSubmitSuccess(
          'Your prompt and generated AI output have been submitted for Admin review.'
        );
        if (res.submission) {
          setSubmission(res.submission);
        }
      } else {
        setSubmitError(res?.error || 'Failed to submit task for review.');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit task for review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper copies
  const handleCopyInput = () => {
    if (scenarioInput) {
      navigator.clipboard.writeText(scenarioInput);
      setCopiedInput(true);
      setTimeout(() => setCopiedInput(false), 2000);
    }
  };

  const handleCopyPrompt = () => {
    if (userPrompt) {
      navigator.clipboard.writeText(userPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  const handleCopyOutput = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  const activeRun =
    activeRunIndex >= 0 && activeRunIndex < runHistory.length ? runHistory[activeRunIndex] : null;

  // Review Status formatting
  const getReviewStatusBadge = (status?: string) => {
    if (!status) return null;
    switch (status.toLowerCase()) {
      case 'accepted':
      case 'approved':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            <CheckCircle2 size={13} color="#059669" /> Approved by Admin
          </span>
        );
      case 'revision_requested':
      case 'rejected':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: '#fff7ed',
              color: '#9a3412',
              border: '1px solid #fed7aa',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            <AlertCircle size={13} color="#ea580c" /> Changes Requested
          </span>
        );
      case 'submitted':
      case 'in_review':
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: '#f5f3ff',
              color: '#6d28d9',
              border: '1px solid #ddd6fe',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            <Clock size={13} color="#7c3aed" /> Pending Admin Review
          </span>
        );
    }
  };

  return (
    <div
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '24px 20px 80px',
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: '#0f172a',
      }}
    >
      {/* SECTION A: COMPACT HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          {/* Breadcrumb */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: '#64748b',
              marginBottom: '8px',
            }}
          >
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6366f1',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}
            {onBack && <span>/</span>}
            <span style={{ fontWeight: 600, color: '#4338ca' }}>{module}</span>
            {topicTitle && (
              <>
                <ChevronRight size={14} />
                <span>{topicTitle}</span>
              </>
            )}
          </div>

          {/* Title & Pill Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              {questionTitle}
            </h1>
            <Badge variant="primary">{module}</Badge>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #e2e8f0',
              }}
            >
              {difficulty}
            </span>
            {getReviewStatusBadge(submission?.status)}
          </div>
        </div>

        {/* Right side stats: Timer / Attempts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {timeRemainingFormatted && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                fontSize: '13px',
                fontWeight: 700,
                border: '1px solid #fecaca',
              }}
            >
              <Clock size={14} />
              <span>{timeRemainingFormatted}</span>
            </div>
          )}
          {typeof attemptNumber === 'number' && (
            <div
              style={{
                fontSize: '12px',
                color: '#64748b',
                padding: '6px 10px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              Attempt #{attemptNumber}
            </div>
          )}
        </div>
      </div>

      {/* ADMIN FEEDBACK CALLOUT (IF REVIEWED) */}
      {submission &&
        (submission.status === 'accepted' ||
          (submission.status as string) === 'revision_requested' ||
          (submission.status as string) === 'rejected') && (
          <div
            style={{
              marginBottom: '20px',
              padding: '16px 20px',
              borderRadius: '12px',
              backgroundColor: submission.status === 'accepted' ? '#f0fdf4' : '#fff7ed',
              border: `1px solid ${submission.status === 'accepted' ? '#bbf7d0' : '#fed7aa'}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 800,
                  fontSize: '14px',
                  color: submission.status === 'accepted' ? '#166534' : '#9a3412',
                }}
              >
                <MessageSquare size={16} />
                <span>Admin Review Feedback</span>
              </div>
              {submission.reviewedAt && (
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Reviewed on {new Date(submission.reviewedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                lineHeight: 1.6,
                color: submission.status === 'accepted' ? '#14532d' : '#7c2d12',
              }}
            >
              {submission.writtenFeedback ||
                (submission.status === 'accepted'
                  ? 'Your prompt and output meet all operational standards. Excellent work!'
                  : 'Please review and adjust your prompt to better address the task objective.')}
            </p>
            {submission.status !== 'accepted' && (
              <div
                style={{ marginTop: '10px', fontSize: '12px', fontWeight: 600, color: '#c2410c' }}
              >
                💡 Resubmission is enabled: refine your prompt below, click "Run Prompt" to test,
                and submit again for review.
              </div>
            )}
          </div>
        )}

      {/* NOTIFICATIONS: SUCCESS / ERROR */}
      {submitSuccess && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} color="#059669" />
          <span>{submitSuccess}</span>
        </div>
      )}

      {submitError && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={16} color="#dc2626" />
          <span>{submitError}</span>
        </div>
      )}

      {/* MAIN TWO-COLUMN / VERTICAL LAYOUT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* SECTION B: PROBLEM STATEMENT (MAXIMUM VISUAL PROMINENCE) */}
        <Surface
          variant="bordered"
          radius="lg"
          padding="lg"
          style={{
            borderLeft: '4px solid #6366f1',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  backgroundColor: '#ede9fe',
                  color: '#6d28d9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={14} />
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#6366f1',
                }}
              >
                Problem Statement
              </span>
            </div>
            <p
              style={{
                fontSize: '16px',
                lineHeight: 1.7,
                color: '#0f172a',
                margin: 0,
                fontWeight: 600,
                letterSpacing: '-0.01em',
              }}
            >
              {problemStatement}
            </p>
          </div>

          {/* Scenario Input Context Box (Clean lavender-tinted card, NOT dark blue) */}
          {scenarioInput && (
            <div
              style={{
                marginTop: '16px',
                padding: '14px 16px',
                backgroundColor: '#faf5ff',
                borderRadius: '10px',
                border: '1px solid #e9d5ff',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#7c3aed',
                  }}
                >
                  <Terminal size={14} />
                  <span>Input Data / Context</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyInput}
                  style={{
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: copiedInput ? '#059669' : '#6b21a8',
                    cursor: 'pointer',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {copiedInput ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedInput ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre
                style={{
                  margin: 0,
                  fontSize: '13px',
                  lineHeight: 1.5,
                  color: '#3b0764',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                }}
              >
                {scenarioInput}
              </pre>
            </div>
          )}

          {/* SECTION C: OUTPUT REQUIREMENTS (ONLY WHEN SPECIFIED) */}
          {outputRequirements && outputRequirements.length > 0 && (
            <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: '#64748b',
                  marginBottom: '8px',
                  letterSpacing: '0.04em',
                }}
              >
                Output Requirements
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '20px',
                  fontSize: '13.5px',
                  color: '#334155',
                  lineHeight: 1.6,
                }}
              >
                {outputRequirements.map((req, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Surface>

        {/* SECTION D: PROMPT EDITOR */}
        <Surface variant="bordered" radius="lg" padding="lg">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                Prompt Editor
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>(Autosaved to draft)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: userPrompt.length >= maxCharacters ? '#b91c1c' : '#64748b',
                }}
              >
                {userPrompt.length} / {maxCharacters}
              </span>
              {userPrompt.trim().length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copiedPrompt ? '#059669' : '#64748b',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copiedPrompt ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedPrompt ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearDraft}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          <textarea
            ref={promptTextareaRef}
            value={userPrompt}
            onChange={handlePromptChange}
            placeholder="Write your prompt here to solve the scenario. E.g., 'You are an AI assistant. Analyze the input data provided above and generate...'"
            disabled={isRunning}
            rows={8}
            style={{
              width: '100%',
              minHeight: '190px',
              boxSizing: 'border-box',
              padding: '16px 18px',
              borderRadius: '12px',
              border: runError ? '1.5px solid #f87171' : '1px solid #cbd5e1',
              backgroundColor: isRunning ? '#f8fafc' : '#ffffff',
              fontSize: '14.5px',
              lineHeight: 1.65,
              color: '#0f172a',
              fontFamily:
                "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.15s ease',
            }}
          />

          {runError && (
            <div
              style={{
                marginTop: '10px',
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                color: '#991b1b',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={14} />
              <span>{runError}</span>
            </div>
          )}

          {/* Execution Action Bar */}
          <div
            style={{
              marginTop: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Button
                variant="primary"
                size="md"
                disabled={isRunning || !userPrompt.trim()}
                onClick={handleRunPrompt}
                icon={
                  isRunning ? (
                    <Loader2 size={16} className="aiims-spin" />
                  ) : runHistory.length > 0 ? (
                    <RotateCcw size={15} />
                  ) : (
                    <Play size={15} />
                  )
                }
                style={{
                  padding: '10px 22px',
                  fontWeight: 700,
                  fontSize: '14px',
                  boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.25)',
                }}
              >
                {isRunning
                  ? 'Executing Prompt...'
                  : runHistory.length > 0
                    ? 'Run Again'
                    : 'Run Prompt'}
              </Button>

              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Preview operation · Instant execution
              </span>
            </div>

            {/* Run History Selector */}
            {runHistory.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <History size={13} color="#64748b" />
                <span style={{ fontSize: '12px', color: '#64748b', marginRight: '4px' }}>
                  Versions:
                </span>
                {runHistory.map((run, idx) => (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => setActiveRunIndex(idx)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      border: idx === activeRunIndex ? '1.5px solid #7c3aed' : '1px solid #e2e8f0',
                      backgroundColor: idx === activeRunIndex ? '#f5f3ff' : '#ffffff',
                      color: idx === activeRunIndex ? '#6d28d9' : '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    Run #{runHistory.length - idx}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Surface>

        {/* SECTION E: AI OUTPUT PREVIEW */}
        {activeRun && (
          <Surface variant="bordered" radius="lg" padding="lg">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                marginBottom: '14px',
                paddingBottom: '12px',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    backgroundColor: '#ede9fe',
                    color: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={16} />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  AI Output Preview
                </h3>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {activeRun.model}
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: '#ecfdf5',
                    color: '#065f46',
                    border: '1px solid #a7f3d0',
                  }}
                >
                  ⚡ {activeRun.executionTimeMs}ms
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{activeRun.timestamp}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {activeRun.prompt !== userPrompt && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserPrompt(activeRun.prompt);
                      promptTextareaRef.current?.focus();
                    }}
                    style={{
                      background: 'none',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      color: '#475569',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Restore Prompt
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleCopyOutput(activeRun.output)}
                  style={{
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: copiedOutput ? '#059669' : '#64748b',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {copiedOutput ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedOutput ? 'Copied' : 'Copy Response'}</span>
                </button>
              </div>
            </div>

            {/* Formatted Output Container (Clean white card with subtle border, NOT dark blue) */}
            <div
              style={{
                padding: '16px 18px',
                borderRadius: '10px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                fontSize: '14px',
                lineHeight: 1.7,
                color: '#1e293b',
                whiteSpace: 'pre-wrap',
                fontFamily:
                  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                maxHeight: '450px',
                overflowY: 'auto',
              }}
            >
              {activeRun.output}
            </div>

            {/* Formative Analysis / Strengths (if provided by execution) */}
            {activeRun.formativeFeedback && activeRun.formativeFeedback.length > 0 && (
              <div
                style={{
                  marginTop: '14px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: '#64748b',
                    marginBottom: '4px',
                  }}
                >
                  Formative Observations
                </div>
                <ul
                  style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: '#475569' }}
                >
                  {activeRun.formativeFeedback.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </Surface>
        )}

        {/* SECTION F: ACTIONS & SUBMISSION (VISIBLE ONLY WHEN VALID AI OUTPUT EXISTS) */}
        {Boolean(activeRun && activeRun.output && activeRun.output.trim().length > 0) && (
          <Surface variant="bordered" radius="lg" padding="lg">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#0f172a',
                    marginBottom: '2px',
                  }}
                >
                  Submit for Staff & Admin Evaluation
                </div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Send your prompt and generated AI output to the staff queue for structured review
                  and feedback.
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    promptTextareaRef.current?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    });
                    promptTextareaRef.current?.focus();
                  }}
                >
                  Edit Prompt
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  disabled={isSubmitting}
                  onClick={() => setShowConfirmModal(true)}
                  icon={
                    isSubmitting ? <Loader2 size={16} className="aiims-spin" /> : <Send size={15} />
                  }
                >
                  {isSubmitting
                    ? 'Submitting...'
                    : submission
                      ? 'Resubmit for Admin Review'
                      : 'Submit for Admin Review'}
                </Button>
              </div>
            </div>
          </Surface>
        )}
      </div>

      {/* CONFIRMATION MODAL BEFORE ADMIN SUBMISSION */}
      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => !isSubmitting && setShowConfirmModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow:
                '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#ede9fe',
                  color: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                  Submit for Admin Review
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Module: {module} · {questionTitle}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#475569', margin: '0 0 16px' }}>
              Your latest prompt and its verified AI response ({activeRun?.model || 'AI Provider'})
              will be submitted for evaluation. An authorized Admin will review your methodology and
              provide feedback.
            </p>

            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '20px',
                fontSize: '12px',
                color: '#334155',
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <strong>Question:</strong> {questionTitle}
              </div>
              <div style={{ marginTop: '4px' }}>
                <strong>Prompt Length:</strong> {userPrompt.trim().length} characters
              </div>
              <div style={{ marginTop: '4px' }}>
                <strong>AI Output:</strong> Ready for evaluation ({activeRun?.executionTimeMs}ms)
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button
                variant="outline"
                size="md"
                disabled={isSubmitting}
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={isSubmitting}
                icon={
                  isSubmitting ? <Loader2 size={16} className="aiims-spin" /> : <Send size={15} />
                }
                onClick={handleSubmitForAdminReview}
              >
                {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
