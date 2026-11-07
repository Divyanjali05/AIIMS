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
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export interface FocusChallengesProps {
  topicName: string;
  track?: 'General' | 'Coding';
  onChallengeCompleted?: (score: number) => void;
}

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

export const FocusChallenges: React.FC<FocusChallengesProps> = ({
  topicName,
  track = 'General',
  onChallengeCompleted,
}) => {
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

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning && !result) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, result]);

  // Load active or new question
  const loadChallenge = async () => {
    setIsLoading(true);
    setEvalError(null);
    setResult(null);
    setAnswer('');
    setElapsedSeconds(0);
    try {
      // 1. Try fetching current active assignment
      const current = await apiClient.getCurrentQuestion().catch(() => null);
      if (
        current &&
        current.assignment &&
        current.assignment.topic === topicName &&
        current.assignment.status !== 'SUBMITTED'
      ) {
        setActiveAssignmentId(current.assignment.assignmentId);
        setQuestion(current.question);
        setIsTimerRunning(true);
        setIsLoading(false);
        return;
      }

      // 2. Otherwise serve a new question
      const served = await apiClient.serveQuestion(topicName, 'Easy', track);
      if (served && served.assignment && served.question) {
        setActiveAssignmentId(served.assignment.assignmentId);
        setQuestion(served.question);
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

  useEffect(() => {
    if (topicName) {
      loadChallenge();
    }
  }, [topicName, track]);

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

  return (
    <Surface variant="bordered" radius="lg" padding="lg" style={{ marginTop: '24px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'var(--aiims-primary-bg, rgba(99, 102, 241, 0.1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--aiims-primary, #6366f1)',
            }}
          >
            <Target size={20} />
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
              FOCUS PRACTICE CHALLENGE
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
              {question?.title || 'Interactive AI Rubric Challenge'}
            </h3>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {question?.level && (
            <Badge variant="primary" size="sm">
              {question.level} Level
            </Badge>
          )}
          <Badge variant="neutral" size="sm" icon={<Clock size={12} />}>
            {formatTime(elapsedSeconds)}
          </Badge>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div
          style={{
            padding: '36px',
            textAlign: 'center',
            color: 'var(--aiims-text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--aiims-primary)' }} />
          <div>Loading personalized challenge from Question Bank...</div>
        </div>
      )}

      {!isLoading && question && !result && (
        <div>
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
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--aiims-text-muted)',
                marginBottom: '6px',
                textTransform: 'uppercase',
              }}
            >
              Challenge Instructions
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
                AI Rubric Criteria (Evaluated against what you write)
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
                      padding: '6px 10px',
                      backgroundColor: 'var(--aiims-bg-card, #fff)',
                      borderRadius: '8px',
                      border: '1px solid var(--aiims-border-card)',
                      display: 'flex',
                      justifyContent: 'space-between',
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

          {/* Answer Area */}
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
              placeholder="Write your response clearly and concisely. Evidence of competence is evaluated directly by AI against the rubric above..."
              rows={6}
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
                style={{ color: 'var(--aiims-danger, #e11d48)', flexShrink: 0, marginTop: '2px' }}
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
              {isSubmitting ? 'Evaluating Rubric with AI...' : 'Submit Challenge for AI Evaluation'}
            </Button>
          </div>
        </div>
      )}

      {/* RESULT EXPERIENCE */}
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
                  AI RUBRIC ASSESSMENT COMPLETE
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
                {result.reward && (
                  <div style={{ marginTop: '6px' }}>
                    {result.reward.credits > 0 ? (
                      <Badge variant="primary" size="sm">
                        +{result.reward.credits} AC ({result.reward.tier})
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        Over-time (0 AC)
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="md"
              icon={<ArrowRight size={16} />}
              onClick={loadChallenge}
            >
              Practice Next Challenge
            </Button>
          </div>

          {/* Overall AI Feedback */}
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

          {/* Criterion Breakdown */}
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
  );
};
