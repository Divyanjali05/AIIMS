import { QuestionWorkbench } from '../../components/common/QuestionWorkbench';
import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../api/client';
import { useLearner } from '../../context/LearnerContext';
import {
  Target,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Upload,
  FileText,
  Trash2,
  Lock,
  Layers,
  Award,
  History,
  Shield,
  BookOpen,
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  FocusChallengeTier,
  FocusCategorySummary,
  FocusTaskQuestion,
  FocusAttachmentItem,
  FocusAttemptResult,
  FocusHistoryItem,
} from '../../types';

export interface FocusChallengesProps {
  topicName?: string;
  track?: 'General' | 'Coding';
  onChallengeCompleted?: (score: number) => void;
}

const CANONICAL_CATEGORIES = [
  'Prompt Engineering',
  'Evaluation & Auditing',
  'Agentic Systems',
] as const;

export const FocusChallenges: React.FC<FocusChallengesProps> = ({
  topicName,
  onChallengeCompleted,
}) => {
  const { state } = useLearner();
  const isAdminOrEvaluator =
    state.profile?.role === 'admin' ||
    state.profile?.role === 'evaluator' ||
    (state.profile as any)?.roles?.includes('admin') ||
    (state.profile as any)?.roles?.includes('evaluator');

  // Active view: 'challenges' | 'history' | 'admin'
  const [activeTab, setActiveTab] = useState<'challenges' | 'history' | 'admin'>('challenges');

  // Category & Difficulty Selection
  const initialCategory =
    topicName && CANONICAL_CATEGORIES.includes(topicName as any) ? topicName : 'Prompt Engineering';
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedTier, setSelectedTier] = useState<FocusChallengeTier>('Easy');

  // Data states
  const [categories, setCategories] = useState<FocusCategorySummary[]>([]);
  const [questions, setQuestions] = useState<FocusTaskQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<FocusTaskQuestion | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Active attempt / session state
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string>('');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(600);
  const [durationSeconds, setDurationSeconds] = useState<number>(600);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [costAC, setCostAC] = useState<number>(0);
  const [isFirstAttemptFree, setIsFirstAttemptFree] = useState<boolean>(true);

  // Attachments
  const [attachments, setAttachments] = useState<FocusAttachmentItem[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Results & Errors
  const [result, setResult] = useState<FocusAttemptResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOverdraft, setIsOverdraft] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // History & Admin states
  const [historyItems, setHistoryItems] = useState<FocusHistoryItem[]>([]);
  const [adminQuestions, setAdminQuestions] = useState<any[]>([]);

  // 1. Initial Load: Fetch categories
  useEffect(() => {
    loadCategories();
  }, []);

  // 2. Load questions whenever category or difficulty tier changes
  useEffect(() => {
    if (!activeAssignmentId) {
      loadCategoryQuestions(selectedCategory, selectedTier);
    }
  }, [selectedCategory, selectedTier, activeAssignmentId]);

  // 3. Server-authoritative timer interval
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isTimerRunning && !isExpired && !result && remainingSeconds > 0) {
      timer = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setIsExpired(true);
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTimerRunning, isExpired, result, remainingSeconds]);

  // Periodic server timer resync every 30 seconds to prevent client drift
  useEffect(() => {
    let syncTimer: NodeJS.Timeout | null = null;
    if (activeAssignmentId && isTimerRunning && !result && !isExpired) {
      syncTimer = setInterval(async () => {
        try {
          const res = await apiClient.getFocusTimeRemaining(activeAssignmentId);
          if (res.success) {
            setRemainingSeconds(res.remainingSeconds);
            if (res.isExpired) {
              setIsExpired(true);
              setIsTimerRunning(false);
            }
          }
        } catch (e) {
          // Ignore network ping errors during active work
        }
      }, 30000);
    }
    return () => {
      if (syncTimer) clearInterval(syncTimer);
    };
  }, [activeAssignmentId, isTimerRunning, result, isExpired]);

  const loadCategories = async () => {
    try {
      const res = await apiClient.getFocusCategories();
      if (res.success && res.categories) {
        setCategories(res.categories);
      }
    } catch (e) {
      console.warn('[FocusChallenges] Failed to fetch categories:', e);
    }
  };

  const loadCategoryQuestions = async (category: string, level: FocusChallengeTier) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.getFocusCategoryQuestions(category, level);
      if (res.success && res.questions) {
        setQuestions(res.questions);
        if (res.questions.length > 0) {
          setSelectedQuestion(res.questions[0]);
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load challenges');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChallenge = async (question: FocusTaskQuestion) => {
    setIsStarting(true);
    setErrorMsg(null);
    setIsOverdraft(false);
    setResult(null);
    setAnswer('');
    setAttachments([]);

    try {
      const res = await apiClient.startFocusTask(
        question.topic,
        question.level,
        question.questionId
      );
      if (res.success) {
        setActiveAssignmentId(res.assignmentId);
        setSelectedQuestion(res.question);
        setDurationSeconds(res.durationSeconds);
        setRemainingSeconds(res.remainingSeconds);
        setIsTimerRunning(true);
        setIsExpired(res.remainingSeconds <= 0);
        setCostAC(res.costAC);
        setIsFirstAttemptFree(res.isFirstAttemptFree);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to start challenge attempt');
    } finally {
      setIsStarting(false);
    }
  };

  const handleCopyPrompt = () => {
    if (!selectedQuestion) return;
    const fullText = `Scenario:\n${selectedQuestion.testScenario}\n\nTask:\n${selectedQuestion.promptText}`;
    navigator.clipboard.writeText(fullText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeAssignmentId) return;

    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10 MB limit.');
      return;
    }

    setIsUploadingAttachment(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const uploadRes = await apiClient.uploadFocusAttachment({
          assignmentId: activeAssignmentId,
          fileName: file.name,
          mimeType: file.type || 'application/pdf',
          fileBase64: base64,
        });

        if (uploadRes.success && uploadRes.attachment) {
          setAttachments((prev) => [...prev, uploadRes.attachment]);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert(err.message || 'Failed to upload attachment');
    } finally {
      setIsUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setAttachments((prev) => prev.filter((a) => a.attachmentId !== attachmentId));
  };

  const handleSubmit = async () => {
    if (!activeAssignmentId || !answer.trim()) return;

    if (isExpired) {
      alert('Time limit has expired. The challenge is locked and cannot be submitted.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setIsOverdraft(false);

    try {
      const timeTaken = Math.max(1, durationSeconds - remainingSeconds);
      const res = await apiClient.submitFocusTask({
        assignmentId: activeAssignmentId,
        answer: answer.trim(),
        timeTakenSeconds: timeTaken,
        attachments,
      });

      if (res.success) {
        setResult(res);
        setIsTimerRunning(false);
        if (onChallengeCompleted) {
          onChallengeCompleted(res.score);
        }
      }
    } catch (err: any) {
      if (err.code === 'TASK_EXPIRED' || err.status === 410) {
        setIsExpired(true);
        setIsTimerRunning(false);
        setErrorMsg('Time limit expired. The task is locked and cannot be submitted.');
      } else if (err.code === 'INSUFFICIENT_CREDITS' || err.status === 402) {
        setIsOverdraft(true);
        setErrorMsg(
          err.message ||
            `Submitting this challenge requires 20 AC. Current balance is insufficient.`
        );
      } else {
        setErrorMsg(err.message || 'Failed to submit focus challenge');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToCatalog = () => {
    setActiveAssignmentId(null);
    setResult(null);
    setErrorMsg(null);
    setAnswer('');
    setAttachments([]);
    setIsTimerRunning(false);
    setIsExpired(false);
    loadCategoryQuestions(selectedCategory, selectedTier);
  };

  const loadHistory = async () => {
    try {
      const res = await apiClient.getFocusTaskHistory();
      if (res.success) {
        setHistoryItems(res.history || []);
      }
    } catch (e) {
      console.warn('[FocusChallenges] Failed to load history:', e);
    }
  };

  const loadAdminQuestions = async () => {
    try {
      const res = await apiClient.adminListFocusQuestions();
      if (res.success) {
        setAdminQuestions(res.questions || []);
      }
    } catch (e) {
      console.warn('[FocusChallenges] Failed to load admin questions:', e);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* NAVIGATION TABS (Challenges | History | Admin)                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--aiims-border-card)',
          paddingBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant={activeTab === 'challenges' ? 'amber' : 'outline'}
            size="sm"
            icon={<Target size={15} />}
            onClick={() => setActiveTab('challenges')}
          >
            Timed Challenges
          </Button>

          <Button
            variant={activeTab === 'history' ? 'amber' : 'outline'}
            size="sm"
            icon={<History size={15} />}
            onClick={() => {
              setActiveTab('history');
              loadHistory();
            }}
          >
            Attempt History
          </Button>

          {isAdminOrEvaluator && (
            <Button
              variant={activeTab === 'admin' ? 'amber' : 'outline'}
              size="sm"
              icon={<Shield size={15} />}
              onClick={() => {
                setActiveTab('admin');
                loadAdminQuestions();
              }}
            >
              Question Bank (Admin)
            </Button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <Clock size={16} style={{ color: 'var(--aiims-tint-amber-text)' }} />
          <span style={{ fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
            Server-Authoritative Timing
          </span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: CHALLENGES & ACTIVE WORKBENCH                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'challenges' && (
        <>
          {/* Active Task Workbench (When attempt is in progress or completed) */}
          {activeAssignmentId && selectedQuestion ? (
            <QuestionWorkbench
              module="Focus"
              questionId={selectedQuestion.questionId}
              questionTitle={selectedQuestion.title}
              topicId={selectedQuestion.topic}
              topicTitle={selectedQuestion.topic}
              difficulty={selectedQuestion.level}
              problemStatement={
                selectedQuestion.testScenario ||
                selectedQuestion.learningObjective ||
                selectedQuestion.title
              }
              scenarioInput={selectedQuestion.promptText}
              outputRequirements={
                Array.isArray(selectedQuestion.expectedCriteria) &&
                selectedQuestion.expectedCriteria.length > 0
                  ? selectedQuestion.expectedCriteria
                  : undefined
              }
              timeRemainingFormatted={formatTimer(remainingSeconds)}
              onBack={() => {
                setActiveAssignmentId(null);
                setSelectedQuestion(null);
              }}
            />
          ) : (
            /* Question Catalog Browser */
            <div>
              {/* Category Cards (3 Canonical Categories) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '16px',
                  marginBottom: '24px',
                }}
              >
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.category;
                  return (
                    <div
                      key={cat.category}
                      onClick={() => setSelectedCategory(cat.category)}
                      style={{
                        padding: '18px',
                        borderRadius: '14px',
                        backgroundColor: isSelected
                          ? 'var(--aiims-tint-amber-bg)'
                          : 'var(--aiims-bg-card)',
                        border: `2px solid ${isSelected ? 'var(--aiims-primary)' : 'var(--aiims-border-card)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
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
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: 'var(--aiims-tint-amber-text)',
                            textTransform: 'uppercase',
                          }}
                        >
                          CATEGORY
                        </span>
                        <Badge variant="warning">{cat.questionsCount.total} Tasks</Badge>
                      </div>

                      <h3
                        style={{
                          margin: '0 0 6px',
                          fontSize: '17px',
                          fontWeight: 800,
                          color: 'var(--aiims-text-heading)',
                        }}
                      >
                        {cat.displayName}
                      </h3>

                      <p
                        style={{
                          margin: '0 0 12px',
                          fontSize: '13px',
                          color: 'var(--aiims-text-secondary)',
                          lineHeight: '1.4',
                        }}
                      >
                        {cat.description}
                      </p>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Badge variant="neutral">Easy: {cat.questionsCount.Easy}</Badge>
                        <Badge variant="neutral">Med: {cat.questionsCount.Medium}</Badge>
                        <Badge variant="neutral">Hard: {cat.questionsCount.Hard}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Difficulty Level Selector */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'var(--aiims-bg-card)',
                  padding: '12px 18px',
                  borderRadius: '12px',
                  border: '1px solid var(--aiims-border-card)',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Layers size={18} style={{ color: 'var(--aiims-primary)' }} />
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: 'var(--aiims-text-heading)',
                    }}
                  >
                    Difficulty Tier:
                  </span>
                  {(['Easy', 'Medium', 'Hard'] as FocusChallengeTier[]).map((tier) => (
                    <Button
                      key={tier}
                      variant={selectedTier === tier ? 'amber' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedTier(tier)}
                    >
                      {tier} ({tier === 'Easy' ? '10 min' : tier === 'Medium' ? '20 min' : '30 min'}
                      )
                    </Button>
                  ))}
                </div>

                <div style={{ fontSize: '13px', color: 'var(--aiims-text-muted)' }}>
                  Subsequent attempts cost <strong>20 AC</strong> (First attempt in category is
                  free)
                </div>
              </div>

              {/* Question List (5 Approved Questions per tier) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {isLoading ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px',
                      color: 'var(--aiims-text-muted)',
                    }}
                  >
                    Loading verified challenges from PostgreSQL...
                  </div>
                ) : questions.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px',
                      color: 'var(--aiims-text-muted)',
                    }}
                  >
                    No approved questions found for this category and tier.
                  </div>
                ) : (
                  questions.map((q, idx) => (
                    <Surface
                      key={q.questionId}
                      variant="bordered"
                      radius="md"
                      padding="md"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '16px',
                      }}
                    >
                      <div style={{ flex: '1 1 350px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '6px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 800,
                              color: 'var(--aiims-primary)',
                            }}
                          >
                            #{idx + 1}
                          </span>
                          <h4
                            style={{
                              margin: 0,
                              fontSize: '16px',
                              fontWeight: 800,
                              color: 'var(--aiims-text-heading)',
                            }}
                          >
                            {q.title}
                          </h4>
                          <Badge variant="neutral">{q.expectedAnswerFormat}</Badge>
                        </div>
                        <p
                          style={{
                            margin: '0 0 6px',
                            fontSize: '13px',
                            color: 'var(--aiims-text-secondary)',
                            lineHeight: '1.4',
                          }}
                        >
                          {q.learningObjective}
                        </p>
                        <div style={{ fontSize: '12px', color: 'var(--aiims-text-muted)' }}>
                          Time Limit: {Math.round(q.durationSeconds / 60)} minutes • Suggested Tool:{' '}
                          {q.suggestedExternalTool}
                        </div>
                      </div>

                      <Button
                        variant="amber"
                        size="md"
                        icon={<ArrowRight size={16} />}
                        onClick={() => handleStartChallenge(q)}
                        disabled={isStarting}
                      >
                        Start Challenge
                      </Button>
                    </Surface>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: ATTEMPT HISTORY                                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <Surface variant="bordered" radius="lg" padding="lg">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading)',
              }}
            >
              Your Focus Challenge Attempts
            </h3>
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw size={14} />}
              onClick={loadHistory}
            >
              Refresh
            </Button>
          </div>

          {historyItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--aiims-text-muted)' }}>
              No completed challenges yet. Select a challenge from the Timed Challenges tab to
              start!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {historyItems.map((h) => (
                <div
                  key={h.attemptId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 18px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--aiims-bg-card)',
                    border: '1px solid var(--aiims-border-card)',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                      <Badge variant="warning">{h.category}</Badge>
                      <Badge variant="purple">{h.level}</Badge>
                      <span style={{ fontSize: '12px', color: 'var(--aiims-text-muted)' }}>
                        {new Date(h.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: '15px',
                        color: 'var(--aiims-text-heading)',
                      }}
                    >
                      {h.title}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}>TIME</div>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{h.timeTakenSeconds}s</div>
                    </div>

                    <div
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        backgroundColor: h.score >= 85 ? '#ecfdf5' : '#fffbeb',
                        border: `1px solid ${h.score >= 85 ? '#34d399' : '#f59e0b'}`,
                        fontWeight: 900,
                        fontSize: '18px',
                        color: h.score >= 85 ? '#059669' : '#d97706',
                      }}
                    >
                      {h.score}/100
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Surface>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: ADMIN QUESTION BANK PANEL                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'admin' && isAdminOrEvaluator && (
        <Surface variant="bordered" radius="lg" padding="lg">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading)',
                }}
              >
                Focus Question Bank Management (Admin & Evaluator)
              </h3>
              <div style={{ fontSize: '13px', color: 'var(--aiims-text-muted)' }}>
                Authoritative questions seeded from PostgreSQL. Only APPROVED questions are served
                to students.
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw size={14} />}
              onClick={loadAdminQuestions}
            >
              Reload Questions
            </Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {adminQuestions.map((q) => (
              <div
                key={q.questionId}
                style={{
                  padding: '14px 18px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--aiims-bg-card)',
                  border: '1px solid var(--aiims-border-card)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                    <Badge variant={q.status === 'APPROVED' ? 'success' : 'neutral'}>
                      {q.status}
                    </Badge>
                    <Badge variant="warning">{q.topic}</Badge>
                    <Badge variant="purple">{q.level}</Badge>
                    <span style={{ fontSize: '12px', color: 'var(--aiims-text-muted)' }}>
                      {q.questionId}
                    </span>
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '15px',
                      color: 'var(--aiims-text-heading)',
                    }}
                  >
                    {q.title}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {q.status !== 'APPROVED' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={async () => {
                        await apiClient.adminUpdateFocusStatus(
                          q.questionId,
                          'APPROVED',
                          'Approved by Admin'
                        );
                        loadAdminQuestions();
                      }}
                    >
                      Approve
                    </Button>
                  )}
                  {q.status === 'APPROVED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await apiClient.adminUpdateFocusStatus(
                          q.questionId,
                          'DRAFT',
                          'Set to Draft'
                        );
                        loadAdminQuestions();
                      }}
                    >
                      Set to Draft
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Surface>
      )}
    </div>
  );
};
