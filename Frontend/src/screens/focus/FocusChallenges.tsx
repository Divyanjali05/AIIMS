import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import {
  Target,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Award,
  ChevronDown,
  ChevronUp,
  Zap,
  Timer,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export type ChallengeLevel = 'Easy' | 'Medium' | 'Hard';

export interface FocusChallengesProps {
  topicName: string;
  track?: 'General' | 'Coding';
  onChallengeCompleted?: (score: number) => void;
}

export interface ChallengeLevelConfig {
  level: ChallengeLevel;
  durationMinutes: number;
  limitSeconds: number;
  fastThresholdSeconds: number;
  normalThresholdSeconds: number;
  fastRewardAC: number;
  normalRewardAC: number;
  overtimeRewardAC: number;
  fastRewardXP: number;
  normalRewardXP: number;
  overtimeRewardXP: number;
  title: string;
  description: string;
}

export const FOCUS_CHALLENGE_TIERS: Record<ChallengeLevel, ChallengeLevelConfig> = {
  Easy: {
    level: 'Easy',
    durationMinutes: 10,
    limitSeconds: 600,
    fastThresholdSeconds: 300,
    normalThresholdSeconds: 600,
    fastRewardAC: 20,
    normalRewardAC: 15,
    overtimeRewardAC: 0,
    fastRewardXP: 50,
    normalRewardXP: 50,
    overtimeRewardXP: 0,
    title: 'Easy Challenge',
    description: '10 min sprint for rapid skill application and quick feedback.',
  },
  Medium: {
    level: 'Medium',
    durationMinutes: 20,
    limitSeconds: 1200,
    fastThresholdSeconds: 600,
    normalThresholdSeconds: 1200,
    fastRewardAC: 20,
    normalRewardAC: 15,
    overtimeRewardAC: 0,
    fastRewardXP: 50,
    normalRewardXP: 50,
    overtimeRewardXP: 0,
    title: 'Medium Challenge',
    description: '20 min scenario requiring structured reasoning and multi-step execution.',
  },
  Hard: {
    level: 'Hard',
    durationMinutes: 30,
    limitSeconds: 1800,
    fastThresholdSeconds: 900,
    normalThresholdSeconds: 1800,
    fastRewardAC: 20,
    normalRewardAC: 15,
    overtimeRewardAC: 0,
    fastRewardXP: 50,
    normalRewardXP: 50,
    overtimeRewardXP: 0,
    title: 'Hard Challenge',
    description: '30 min in-depth problem solving for complex real-world workflows.',
  },
};

interface ScoringRubricItem {
  criterion: string;
  maxScore: number;
  description: string;
}

interface QuestionData {
  questionId: string;
  title: string;
  promptText: string;
  testScenario?: string;
  scoringRubric?: ScoringRubricItem[];
  level?: string;
  track?: string;
}

interface RubricFeedbackItem {
  criterion: string;
  score: number;
  maxScore: number;
  comment?: string;
  feedback?: string;
}

interface SubmissionResult {
  attemptId: string;
  score: number;
  rubricFeedback: RubricFeedbackItem[];
  overallFeedback?: string;
  submittedAt?: string;
  reward?: {
    credits: number;
    xp: number;
    tier: 'FAST' | 'NORMAL' | 'OVERTIME';
  };
}

interface AttemptHistoryItem {
  attemptId: string;
  level: string;
  score: number;
  timeTakenSeconds: number;
  submittedAt: string;
  creditTransactionId?: string;
}

export const FocusChallenges: React.FC<FocusChallengesProps> = ({
  topicName,
  track = 'General',
  onChallengeCompleted,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<ChallengeLevel>('Easy');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [answer, setAnswer] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [showScenario, setShowScenario] = useState<boolean>(true);

  // Result and error states
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [evalError, setEvalError] = useState<{
    message: string;
    code?: string;
  } | null>(null);

  // Attempt history
  const [history, setHistory] = useState<AttemptHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const activeConfig = FOCUS_CHALLENGE_TIERS[selectedLevel] || FOCUS_CHALLENGE_TIERS.Easy;

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning && !result && activeAssignmentId) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, result, activeAssignmentId]);

  // Load active or new challenge
  const loadChallenge = async (levelToLoad: ChallengeLevel = selectedLevel) => {
    setIsLoading(true);
    setEvalError(null);
    setResult(null);
    setAnswer('');
    setElapsedSeconds(0);

    try {
      // 1. Check for current active assignment
      const current = await apiClient.getCurrentQuestion().catch(() => null);
      if (
        current &&
        current.hasActiveAssignment &&
        current.question &&
        current.question.topic === topicName
      ) {
        setActiveAssignmentId(current.assignmentId);
        setQuestion(current.question);

        const currentLvl = (current.question.level as ChallengeLevel) || levelToLoad;
        if (FOCUS_CHALLENGE_TIERS[currentLvl]) {
          setSelectedLevel(currentLvl);
        }

        // Calculate authoritative elapsed time from assignedAt
        if (current.assignedAt) {
          const started = new Date(current.assignedAt).getTime();
          const now = Date.now();
          const pastSeconds = Math.max(0, Math.floor((now - started) / 1000));
          setElapsedSeconds(pastSeconds);
        }

        setIsTimerRunning(true);
        setIsLoading(false);
        return;
      }

      // 2. Serve a new question from Question Bank for the requested level
      const served = await apiClient.serveQuestion(topicName, levelToLoad, track);
      if (served && served.assignmentId && served.question) {
        setActiveAssignmentId(served.assignmentId);
        setQuestion(served.question);
        setSelectedLevel(levelToLoad);
        setElapsedSeconds(0);
        setIsTimerRunning(true);
      }
    } catch (err: any) {
      setEvalError({
        message: err.message || 'Failed to load Focus challenge. Please try again.',
        code: err.code || 'LOAD_FAILED',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load history
  const loadHistory = async () => {
    try {
      const res = await apiClient.getQuestionHistory({ topic: topicName });
      if (res && res.attempts) {
        setHistory(res.attempts);
      }
    } catch {
      // History fetch is non-blocking
    }
  };

  useEffect(() => {
    if (topicName) {
      loadChallenge(selectedLevel);
      loadHistory();
    }
  }, [topicName, track]);

  // Handle switching level
  const handleSelectLevel = (newLevel: ChallengeLevel) => {
    if (newLevel === selectedLevel && question) return;
    setSelectedLevel(newLevel);
    loadChallenge(newLevel);
  };

  // Submit attempt
  const handleSubmit = async () => {
    if (!activeAssignmentId || !answer.trim()) return;

    setIsSubmitting(true);
    setEvalError(null);
    try {
      const res = await apiClient.submitQuestionAttempt(
        activeAssignmentId,
        answer.trim(),
        elapsedSeconds
      );

      if (res && res.attemptId) {
        setResult({
          attemptId: res.attemptId,
          score: res.score,
          rubricFeedback: res.rubricFeedback || [],
          overallFeedback: res.overallFeedback,
          submittedAt: res.submittedAt,
          reward: res.reward,
        });
        setIsTimerRunning(false);

        if (onChallengeCompleted) {
          onChallengeCompleted(res.score);
        }

        // Refresh attempt history
        loadHistory();
      }
    } catch (err: any) {
      console.error('[FocusChallenges] Submission error:', err);
      setEvalError({
        message:
          err.message ||
          'AI Rubric evaluation could not be completed. Please retry your submission.',
        code: err.code || 'RUBRIC_EVALUATION_FAILED',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Real-time Tier Calculation
  const isFastTier = elapsedSeconds <= activeConfig.fastThresholdSeconds;
  const isNormalTier =
    elapsedSeconds > activeConfig.fastThresholdSeconds &&
    elapsedSeconds <= activeConfig.normalThresholdSeconds;
  const isOvertime = elapsedSeconds > activeConfig.normalThresholdSeconds;

  const progressRatio = Math.min(1, elapsedSeconds / activeConfig.limitSeconds);
  const progressPercent = Math.min(100, Math.round(progressRatio * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. CHALLENGE LEVEL SELECTOR & REWARD RULES TABS               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Surface variant="bordered" radius="lg" padding="md">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--aiims-primary, #6366f1)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              FOCUS DIFFICULTY & TIMED TIERS
            </div>
            <h3
              style={{
                margin: '2px 0 0',
                fontSize: '16px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading)',
                fontFamily: "'Fredoka', sans-serif",
              }}
            >
              Select Your Challenge Level
            </h3>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: 'var(--aiims-text-muted)',
              backgroundColor: 'var(--aiims-bg-subtle)',
              padding: '4px 10px',
              borderRadius: '20px',
            }}
          >
            <ShieldCheck size={13} style={{ color: 'var(--aiims-success, #10b981)' }} />
            <span>Server Authoritative Timing</span>
          </div>
        </div>

        {/* Level Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
          }}
        >
          {(['Easy', 'Medium', 'Hard'] as ChallengeLevel[]).map((levelKey) => {
            const config = FOCUS_CHALLENGE_TIERS[levelKey];
            const isSelected = selectedLevel === levelKey;
            const isLocked = Boolean(isTimerRunning && !result && activeAssignmentId);

            return (
              <button
                key={levelKey}
                type="button"
                disabled={isLoading || (isLocked && !isSelected)}
                onClick={() => handleSelectLevel(levelKey)}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: isSelected
                    ? '2px solid var(--aiims-primary, #6366f1)'
                    : '1px solid var(--aiims-border-subtle, #e2e8f0)',
                  backgroundColor: isSelected
                    ? 'var(--aiims-tint-indigo-bg, rgba(99, 102, 241, 0.05))'
                    : 'var(--aiims-bg-card, #fff)',
                  cursor: isLocked && !isSelected ? 'not-allowed' : 'pointer',
                  opacity: isLocked && !isSelected ? 0.6 : 1,
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  boxShadow: isSelected ? '0 0 0 1px var(--aiims-primary, #6366f1)' : 'none',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: isSelected
                        ? 'var(--aiims-primary, #6366f1)'
                        : 'var(--aiims-text-heading)',
                    }}
                  >
                    {config.title}
                  </span>
                  <Badge variant={isSelected ? 'primary' : 'neutral'} size="sm">
                    {config.durationMinutes} min limit
                  </Badge>
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--aiims-text-secondary, #64748b)',
                    lineHeight: 1.4,
                  }}
                >
                  {config.description}
                </div>

                {/* Reward breakdown */}
                <div
                  style={{
                    marginTop: '4px',
                    paddingTop: '8px',
                    borderTop: '1px dashed var(--aiims-border-subtle, #e2e8f0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  <span style={{ color: 'var(--aiims-success, #10b981)' }}>
                    Fast: {config.fastRewardAC} AC
                  </span>
                  <span style={{ color: 'var(--aiims-warning, #d97706)' }}>
                    Normal: {config.normalRewardAC} AC
                  </span>
                  <span style={{ color: 'var(--aiims-text-muted)' }}>Over-time: 0 AC</span>
                </div>
              </button>
            );
          })}
        </div>
      </Surface>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. ACTIVE CHALLENGE SURFACE (PROMPT, TIMER & SUBMISSION)      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Surface variant="bordered" radius="lg" padding="lg">
        {/* Loading state */}
        {isLoading && (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: 'var(--aiims-text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <RefreshCw
              size={28}
              className="animate-spin"
              style={{ color: 'var(--aiims-primary)' }}
            />
            <div style={{ fontSize: '15px', fontWeight: 600 }}>
              Serving {activeConfig.title} ({activeConfig.durationMinutes} min) from Question
              Bank...
            </div>
            <div style={{ fontSize: '12px', color: 'var(--aiims-text-muted)' }}>
              Preparing individualized workplace scenario and rubric criteria
            </div>
          </div>
        )}

        {/* Active Challenge View */}
        {!isLoading && question && !result && (
          <div>
            {/* Header: Title, Level, and Timer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--aiims-primary-bg, rgba(99, 102, 241, 0.1))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--aiims-primary, #6366f1)',
                  }}
                >
                  <Target size={22} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: 'var(--aiims-primary, #6366f1)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    FOCUS CHALLENGE • {selectedLevel.toUpperCase()} LEVEL
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '18px',
                      fontWeight: 800,
                      color: 'var(--aiims-text-heading)',
                      fontFamily: "'Fredoka', sans-serif",
                    }}
                  >
                    {question.title}
                  </h3>
                </div>
              </div>

              {/* Digital Timer & Tier Indicator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    backgroundColor: isOvertime
                      ? 'var(--aiims-tint-rose-bg, rgba(244, 63, 94, 0.08))'
                      : isNormalTier
                        ? 'var(--aiims-tint-amber-bg, rgba(245, 158, 11, 0.08))'
                        : 'var(--aiims-tint-emerald-bg, rgba(16, 185, 129, 0.08))',
                    border: isOvertime
                      ? '1px solid var(--aiims-tint-rose-border, rgba(244, 63, 94, 0.2))'
                      : isNormalTier
                        ? '1px solid var(--aiims-tint-amber-border, rgba(245, 158, 11, 0.2))'
                        : '1px solid var(--aiims-tint-emerald-border, rgba(16, 185, 129, 0.2))',
                  }}
                >
                  <Timer
                    size={16}
                    style={{
                      color: isOvertime
                        ? 'var(--aiims-danger, #e11d48)'
                        : isNormalTier
                          ? 'var(--aiims-warning, #d97706)'
                          : 'var(--aiims-success, #10b981)',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'Courier New', Courier, monospace",
                      fontWeight: 900,
                      fontSize: '16px',
                      color: isOvertime
                        ? 'var(--aiims-danger, #e11d48)'
                        : isNormalTier
                          ? 'var(--aiims-warning, #d97706)'
                          : 'var(--aiims-success, #10b981)',
                    }}
                  >
                    {formatTime(elapsedSeconds)} / {formatTime(activeConfig.limitSeconds)}
                  </span>
                </div>

                {/* Tier Badge */}
                {isFastTier && (
                  <Badge variant="success" size="sm" icon={<Zap size={12} />}>
                    Fast Tier (+20 AC)
                  </Badge>
                )}
                {isNormalTier && (
                  <Badge variant="warning" size="sm" icon={<Clock size={12} />}>
                    Normal Tier (+15 AC)
                  </Badge>
                )}
                {isOvertime && (
                  <Badge variant="neutral" size="sm">
                    Over-time (0 AC)
                  </Badge>
                )}
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: 'var(--aiims-bg-subtle, #f1f5f9)',
                borderRadius: '3px',
                overflow: 'hidden',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  backgroundColor: isOvertime
                    ? 'var(--aiims-danger, #e11d48)'
                    : isNormalTier
                      ? 'var(--aiims-warning, #f59e0b)'
                      : 'var(--aiims-success, #10b981)',
                  transition: 'width 1s linear',
                }}
              />
            </div>

            {/* Timing Guidance Banner */}
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--aiims-bg-subtle, #f8fafc)',
                border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                fontSize: '12px',
                color: 'var(--aiims-text-secondary, #64748b)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <span>
                {isFastTier && (
                  <>
                    ⚡ <strong>Fast Reward Window:</strong> Complete within{' '}
                    <strong>
                      {formatTime(activeConfig.fastThresholdSeconds - elapsedSeconds)}
                    </strong>{' '}
                    for top reward (+20 AC, +50 XP).
                  </>
                )}
                {isNormalTier && (
                  <>
                    ⏱️ <strong>Normal Reward Window:</strong> Complete within{' '}
                    <strong>
                      {formatTime(activeConfig.normalThresholdSeconds - elapsedSeconds)}
                    </strong>{' '}
                    for standard reward (+15 AC, +50 XP).
                  </>
                )}
                {isOvertime && (
                  <>
                    ⌛ <strong>Over-time submission:</strong> No AC awarded, but complete your
                    answer to receive full AI rubric scoring and preserve your attempt history!
                  </>
                )}
              </span>

              <span style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}>
                Authoritative timing: <code>submittedAt - assignedAt</code>
              </span>
            </div>

            {/* Question Prompt */}
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--aiims-bg-card, #fff)',
                borderRadius: '12px',
                border: '1px solid var(--aiims-border-card)',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-muted)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                }}
              >
                Challenge Task
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '15px',
                  color: 'var(--aiims-text-heading)',
                  lineHeight: 1.6,
                  fontWeight: 500,
                }}
              >
                {question.promptText}
              </p>
            </div>

            {/* Test Scenario (Collapsible) */}
            {question.testScenario && (
              <div
                style={{
                  borderRadius: '12px',
                  border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                  marginBottom: '16px',
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowScenario(!showScenario)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'var(--aiims-bg-subtle, #f8fafc)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-heading)',
                  }}
                >
                  <span>Workplace Scenario & Context</span>
                  {showScenario ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showScenario && (
                  <div
                    style={{
                      padding: '14px 16px',
                      backgroundColor: 'var(--aiims-bg-card, #fff)',
                      fontSize: '14px',
                      color: 'var(--aiims-text-body)',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {question.testScenario}
                  </div>
                )}
              </div>
            )}

            {/* Rubric Preview */}
            {question.scoringRubric && question.scoringRubric.length > 0 && (
              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: 'var(--aiims-tint-indigo-bg, rgba(99, 102, 241, 0.05))',
                  borderRadius: '12px',
                  border: '1px solid var(--aiims-tint-indigo-border, rgba(99, 102, 241, 0.15))',
                  marginBottom: '20px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: 'var(--aiims-primary, #4f46e5)',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}
                >
                  AI Rubric Criteria (Evaluated against your written response)
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '8px',
                  }}
                >
                  {question.scoringRubric.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: '12px',
                        color: 'var(--aiims-text-heading)',
                        padding: '8px 12px',
                        backgroundColor: 'var(--aiims-bg-card, #fff)',
                        borderRadius: '8px',
                        border: '1px solid var(--aiims-border-card)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{r.criterion}</span>
                      <span style={{ color: 'var(--aiims-primary)', fontWeight: 700 }}>
                        {r.maxScore} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Answer Textarea */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="focus-answer-input"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--aiims-text-heading)',
                  marginBottom: '6px',
                }}
              >
                Your Solution / Prompt Response
              </label>
              <textarea
                id="focus-answer-input"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Write your response clearly and concisely. Evidence of practical competence is evaluated authoritatively by AI against the criteria above..."
                rows={7}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid var(--aiims-border-card, #cbd5e1)',
                  backgroundColor: 'var(--aiims-bg-card, #fff)',
                  color: 'var(--aiims-text-heading)',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <div
                style={{
                  marginTop: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: 'var(--aiims-text-muted)',
                }}
              >
                <span>Write a substantive, practical response to satisfy rubric criteria.</span>
                <span>{answer.trim().length} characters</span>
              </div>
            </div>

            {/* Error Banner */}
            {evalError && (
              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: 'var(--aiims-tint-rose-bg, rgba(244, 63, 94, 0.08))',
                  borderRadius: '12px',
                  border: '1px solid var(--aiims-tint-rose-border, rgba(244, 63, 94, 0.2))',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <AlertCircle
                  size={20}
                  style={{
                    color: 'var(--aiims-danger, #e11d48)',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--aiims-danger, #e11d48)',
                      marginBottom: '2px',
                    }}
                  >
                    Evaluation Failed {evalError.code ? `(${evalError.code})` : ''}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--aiims-text-heading)' }}>
                    {evalError.message}
                  </div>
                </div>
              </div>
            )}

            {/* Action Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
              }}
            >
              <Button
                variant="primary"
                size="lg"
                disabled={isSubmitting || !answer.trim()}
                onClick={handleSubmit}
                icon={
                  isSubmitting ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )
                }
              >
                {isSubmitting
                  ? 'Evaluating Rubric with AI...'
                  : 'Submit Challenge for AI Evaluation'}
              </Button>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 3. SUBMISSION RESULT VIEW                                     */}
        {/* ───────────────────────────────────────────────────────────── */}
        {result && (
          <div>
            {/* Header Score Card */}
            <div
              style={{
                padding: '24px',
                backgroundColor:
                  result.score >= 70
                    ? 'var(--aiims-tint-emerald-bg, rgba(16, 185, 129, 0.08))'
                    : 'var(--aiims-tint-amber-bg, rgba(245, 158, 11, 0.08))',
                borderRadius: '16px',
                border:
                  result.score >= 70
                    ? '1px solid var(--aiims-tint-emerald-border, rgba(16, 185, 129, 0.2))'
                    : '1px solid var(--aiims-tint-amber-border, rgba(245, 158, 11, 0.2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--aiims-bg-card, #fff)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color:
                      result.score >= 70
                        ? 'var(--aiims-success, #10b981)'
                        : 'var(--aiims-warning, #f59e0b)',
                    boxShadow: 'var(--aiims-shadow-card)',
                  }}
                >
                  <Award size={32} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color:
                        result.score >= 70
                          ? 'var(--aiims-success, #10b981)'
                          : 'var(--aiims-warning, #f59e0b)',
                      textTransform: 'uppercase',
                    }}
                  >
                    AI RUBRIC EVALUATION COMPLETE • {selectedLevel.toUpperCase()}
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '28px',
                      fontWeight: 900,
                      color: 'var(--aiims-text-heading)',
                      fontFamily: "'Fredoka', sans-serif",
                    }}
                  >
                    {result.score}%
                    <span
                      style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: 'var(--aiims-text-muted)',
                        marginLeft: '8px',
                      }}
                    >
                      Overall Score
                    </span>
                  </h3>

                  {/* Reward Badge */}
                  {result.reward && (
                    <div
                      style={{
                        marginTop: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {result.reward.credits > 0 ? (
                        <Badge variant="success" size="sm" icon={<Zap size={12} />}>
                          +{result.reward.credits} AC ({result.reward.tier} Tier)
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Over-time (0 AC awarded • Score preserved)
                        </Badge>
                      )}
                      {result.reward.xp > 0 && (
                        <Badge variant="primary" size="sm">
                          +{result.reward.xp} XP
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  size="md"
                  icon={<ArrowRight size={16} />}
                  onClick={() => loadChallenge(selectedLevel)}
                >
                  Next {selectedLevel} Challenge
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  icon={<RotateCcw size={16} />}
                  onClick={() => {
                    setResult(null);
                    setQuestion(null);
                    setActiveAssignmentId(null);
                  }}
                >
                  Change Level
                </Button>
              </div>
            </div>

            {/* Mentor Summary */}
            {result.overallFeedback && (
              <div
                style={{
                  padding: '18px 20px',
                  backgroundColor: 'var(--aiims-bg-card, #fff)',
                  borderRadius: '12px',
                  border: '1px solid var(--aiims-border-card)',
                  marginBottom: '24px',
                  boxShadow: 'var(--aiims-shadow-card)',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: 'var(--aiims-primary, #6366f1)',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                  }}
                >
                  AI Mentor Assessment Summary
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '14px',
                    color: 'var(--aiims-text-heading)',
                    lineHeight: 1.6,
                    fontWeight: 500,
                  }}
                >
                  {result.overallFeedback}
                </p>
              </div>
            )}

            {/* Detailed Criteria Breakdown */}
            <div style={{ marginBottom: '24px' }}>
              <h4
                style={{
                  margin: '0 0 14px',
                  fontSize: '16px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading)',
                  fontFamily: "'Fredoka', sans-serif",
                }}
              >
                Detailed Rubric Criteria Breakdown
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {result.rubricFeedback.map((crit, idx) => {
                  const earned = crit.score;
                  const max = crit.maxScore;
                  const ratio = max > 0 ? earned / max : 0;
                  const comment = crit.comment || crit.feedback || 'Evaluated against rubric.';

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '16px',
                        backgroundColor: 'var(--aiims-bg-card, #fff)',
                        borderRadius: '12px',
                        border: '1px solid var(--aiims-border-card)',
                        boxShadow: 'var(--aiims-shadow-card)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '8px',
                          flexWrap: 'wrap',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2
                            size={18}
                            style={{
                              color:
                                ratio >= 0.7
                                  ? 'var(--aiims-success, #10b981)'
                                  : 'var(--aiims-warning, #f59e0b)',
                            }}
                          />
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 700,
                              color: 'var(--aiims-text-heading)',
                            }}
                          >
                            {crit.criterion}
                          </span>
                        </div>
                        <Badge
                          variant={ratio >= 0.7 ? 'success' : ratio >= 0.4 ? 'warning' : 'neutral'}
                          size="sm"
                        >
                          {earned} / {max} pts
                        </Badge>
                      </div>

                      <p
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          color: 'var(--aiims-text-body, #475569)',
                          lineHeight: 1.5,
                        }}
                      >
                        {comment}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Surface>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. ATTEMPT HISTORY SECTION (COLLAPSIBLE)                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <Surface variant="bordered" radius="lg" padding="md">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} style={{ color: 'var(--aiims-primary)' }} />
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading)',
                  fontFamily: "'Fredoka', sans-serif",
                }}
              >
                Previous Focus Challenge Attempts ({history.length})
              </span>
            </div>
            {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showHistory && (
            <div
              style={{
                marginTop: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {history.slice(0, 5).map((att) => (
                <div
                  key={att.attemptId}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--aiims-bg-subtle, #f8fafc)',
                    border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Badge variant="primary" size="sm">
                      {att.level}
                    </Badge>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--aiims-text-heading)',
                      }}
                    >
                      Score: {att.score}%
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--aiims-text-muted)' }}>
                      Time: {formatTime(att.timeTakenSeconds || 0)}
                    </span>
                  </div>

                  <span style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}>
                    {att.submittedAt ? new Date(att.submittedAt).toLocaleDateString() : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Surface>
      )}
    </div>
  );
};
