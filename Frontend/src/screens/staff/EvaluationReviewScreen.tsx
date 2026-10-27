import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Star,
  Send,
  RotateCcw,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { SubmissionItem, RUBRIC_CRITERIA_LIST } from '../../types';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export { RUBRIC_CRITERIA_LIST };

interface EvaluationReviewScreenProps {
  submissionId: string;
  onBackToQueue: () => void;
}

export const EvaluationReviewScreen: React.FC<EvaluationReviewScreenProps> = ({
  submissionId,
  onBackToQueue,
}) => {
  const [submission, setSubmission] = useState<SubmissionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Rubric Scores (1 to 5 per criterion)
  const [scores, setScores] = useState<Record<string, number>>({});
  // Written feedback
  const [writtenFeedback, setWrittenFeedback] = useState('');
  // Outcome decision: 'accepted' or 'revision_requested'
  const [decision, setDecision] = useState<'accepted' | 'revision_requested'>('accepted');

  useEffect(() => {
    let isMounted = true;
    const fetchSubmission = async () => {
      setLoading(true);
      setErrorBanner(null);
      try {
        const res = await apiClient.getSubmissionById(submissionId);
        if (isMounted) {
          if (res && res.success && res.submission) {
            setSubmission(res.submission);
            if (res.submission.rubricScores) {
              setScores(res.submission.rubricScores);
            }
            if (res.submission.writtenFeedback) {
              setWrittenFeedback(res.submission.writtenFeedback);
            }
          } else {
            setErrorBanner(res?.error || 'Failed to load submission details.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorBanner(err.message || 'Error fetching submission data.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSubmission();
    return () => {
      isMounted = false;
    };
  }, [submissionId]);

  // Validation logic: Send button stays disabled until all criteria are scored (1-5) and feedback is written
  const isRubricComplete = RUBRIC_CRITERIA_LIST.every((crit) => {
    const s = scores[crit.id];
    return typeof s === 'number' && s >= crit.minScore && s <= crit.maxScore;
  });

  const isFeedbackComplete = writtenFeedback.trim().length > 0;
  const isFormValid = isRubricComplete && isFeedbackComplete;

  const handleScoreChange = (criterionId: string, value: number) => {
    setScores((prev) => ({
      ...prev,
      [criterionId]: value,
    }));
  };

  const handleSubmitReview = async () => {
    if (!isFormValid) return;

    setSubmittingReview(true);
    setErrorBanner(null);
    setSuccessBanner(null);

    try {
      const payload = {
        rubricScores: scores,
        writtenFeedback: writtenFeedback.trim(),
        decision,
      };

      const res = await apiClient.submitReview(submissionId, payload);
      if (res && res.success) {
        setSuccessBanner(
          `Review submitted successfully! Outcome: ${
            decision === 'accepted' ? 'Accepted & Approved' : 'Revision Requested'
          }.`
        );
        setSubmission(res.submission);
      } else {
        setErrorBanner(res?.error || 'Failed to submit review.');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const scoreValues = Object.values(scores);
  const averageScore =
    scoreValues.length > 0
      ? (scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length).toFixed(1)
      : null;

  return (
    <div
      style={{
        maxWidth: '960px',
        margin: '0 auto',
        padding: '24px 20px',
        paddingBottom: 'calc(48px + env(safe-area-inset-bottom, 0px))',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Navigation */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={onBackToQueue}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            border: 'none',
            background: 'none',
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--aiims-sky-text, #0369a1)',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          <ArrowLeft size={16} />
          Back to Evaluation Queue
        </button>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '14px 18px',
            borderRadius: '12px',
            backgroundColor: 'var(--aiims-mint-subtle, #d1fae5)',
            border: '1px solid var(--aiims-mint-border, #a7f3d0)',
            color: 'var(--aiims-mint-text, #065f46)',
            fontSize: '14px',
            fontWeight: 700,
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={20} />
            <span>{successBanner}</span>
          </div>
          <Button variant="outline" size="sm" onClick={onBackToQueue}>
            Return to Queue
          </Button>
        </div>
      )}

      {/* Error Notification */}
      {errorBanner && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 18px',
            borderRadius: '12px',
            backgroundColor: 'var(--aiims-coral-subtle, #ffe4e6)',
            border: '1px solid var(--aiims-coral-border, #fecdd3)',
            color: 'var(--aiims-coral-text, #9f1239)',
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '20px',
          }}
        >
          <AlertCircle size={20} />
          <span>{errorBanner}</span>
        </div>
      )}

      {loading ? (
        <Surface variant="bordered" radius="lg" padding="lg" style={{ textAlign: 'center' }}>
          <div style={{ padding: '40px', color: 'var(--aiims-text-muted, #94a3b8)' }}>
            Loading submission review workspace...
          </div>
        </Surface>
      ) : !submission ? (
        <Surface variant="coral" radius="lg" padding="lg" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 10px', color: 'var(--aiims-coral-text, #9f1239)' }}>
            Submission Not Found
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: '14px' }}>
            The requested task submission could not be located.
          </p>
          <Button variant="outline" onClick={onBackToQueue}>
            Back to Queue
          </Button>
        </Surface>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Card */}
          <Surface variant="bordered" radius="lg" padding="lg">
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--aiims-sky-text, #0369a1)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Task Evaluation & Rubric Grading
                </span>
                <h1
                  style={{
                    margin: '4px 0 0',
                    fontSize: '22px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading, #0f172a)',
                  }}
                >
                  {submission.taskTitle || submission.taskId}
                </h1>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge variant={submission.status === 'accepted' ? 'success' : 'warning'}>
                  Status: {submission.status}
                </Badge>
                {submission.revisionCount > 0 && (
                  <Badge variant="neutral">Revision #{submission.revisionCount}</Badge>
                )}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '20px',
                fontSize: '13px',
                color: 'var(--aiims-text-secondary, #64748b)',
                paddingTop: '8px',
                borderTop: '1px solid var(--aiims-border-subtle, #e2e8f0)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} />
                <span>
                  Learner: <strong>{submission.learnerName || 'Student'}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} />
                <span>
                  Submitted: <strong>{new Date(submission.submittedAt).toLocaleString()}</strong>
                </span>
              </div>
              {submission.evaluatorName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} />
                  <span>
                    Assigned Evaluator: <strong>{submission.evaluatorName}</strong>
                  </span>
                </div>
              )}
            </div>
          </Surface>

          {/* Learner's Answer Panel */}
          <Surface variant="bordered" radius="lg" padding="lg">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
              }}
            >
              <FileText size={18} color="var(--aiims-sky-text, #0369a1)" />
              <h2
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0f172a)',
                }}
              >
                Learner's Submitted Answer
              </h2>
            </div>

            <div
              style={{
                backgroundColor: 'var(--aiims-bg-subtle, #f8fafc)',
                border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                borderRadius: '8px',
                padding: '16px',
                fontSize: '14px',
                lineHeight: 1.6,
                color: 'var(--aiims-text-primary, #0f172a)',
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
                maxHeight: '400px',
                overflowY: 'auto',
              }}
            >
              {submission.answerContent}
            </div>
          </Surface>

          {/* Rubric Scoring Card */}
          <Surface variant="sky" radius="lg" padding="lg">
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div>
                <h2
                  style={{
                    margin: '0 0 4px',
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading, #0f172a)',
                  }}
                >
                  Evaluation Rubric (1 to 5)
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: 'var(--aiims-text-secondary, #64748b)',
                  }}
                >
                  Rate all 4 criteria. Every criterion must receive an integer score from 1 to 5.
                </p>
              </div>

              {averageScore && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--aiims-border-card, #e2e8f0)',
                  }}
                >
                  <Star size={16} color="#eab308" fill="#eab308" />
                  <span style={{ fontSize: '14px', fontWeight: 800 }}>
                    Average Score: {averageScore} / 5.0
                  </span>
                </div>
              )}
            </div>

            {/* Criteria List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {RUBRIC_CRITERIA_LIST.map((criterion) => {
                const currentScore = scores[criterion.id];
                const isScored = currentScore !== undefined;

                return (
                  <div
                    key={criterion.id}
                    style={{
                      backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      border: isScored
                        ? '1px solid var(--aiims-sky-border, #bae6fd)'
                        : '1px dashed var(--aiims-border-card, #e2e8f0)',
                      boxShadow: 'var(--aiims-shadow-sm)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        marginBottom: '6px',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 800,
                            color: 'var(--aiims-text-heading, #0f172a)',
                          }}
                        >
                          {criterion.name}
                        </span>
                        <p
                          style={{
                            margin: '2px 0 0',
                            fontSize: '12px',
                            color: 'var(--aiims-text-secondary, #64748b)',
                          }}
                        >
                          {criterion.description}
                        </p>
                      </div>

                      {/* 1 to 5 Pill Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {[1, 2, 3, 4, 5].map((val) => {
                          const isSelected = currentScore === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              aria-label={`Score ${criterion.name} ${val} out of 5`}
                              onClick={() => handleScoreChange(criterion.id, val)}
                              style={{
                                width: '38px',
                                height: '36px',
                                borderRadius: '8px',
                                border: isSelected
                                  ? '2px solid var(--aiims-sky-solid, #0284c7)'
                                  : '1px solid var(--aiims-border-subtle, #e2e8f0)',
                                backgroundColor: isSelected
                                  ? 'var(--aiims-sky-subtle, #e0f2fe)'
                                  : 'var(--aiims-bg-card, #ffffff)',
                                color: isSelected
                                  ? 'var(--aiims-sky-text, #0369a1)'
                                  : 'var(--aiims-text-primary, #0f172a)',
                                fontWeight: 800,
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Surface>

          {/* Feedback & Decision Form */}
          <Surface variant="bordered" radius="lg" padding="lg">
            <h2
              style={{
                margin: '0 0 12px',
                fontSize: '18px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading, #0f172a)',
              }}
            >
              Written Feedback & Decision
            </h2>

            {/* Decision Selector */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--aiims-text-heading, #0f172a)',
                  marginBottom: '8px',
                }}
              >
                Outcome Decision
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border:
                      decision === 'accepted'
                        ? '2px solid var(--aiims-mint-solid, #059669)'
                        : '1px solid var(--aiims-border-subtle, #e2e8f0)',
                    backgroundColor:
                      decision === 'accepted'
                        ? 'var(--aiims-mint-subtle, #d1fae5)'
                        : 'var(--aiims-bg-card, #ffffff)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 700,
                    color:
                      decision === 'accepted'
                        ? 'var(--aiims-mint-text, #065f46)'
                        : 'var(--aiims-text-primary, #0f172a)',
                  }}
                >
                  <input
                    type="radio"
                    name="decision"
                    value="accepted"
                    checked={decision === 'accepted'}
                    onChange={() => setDecision('accepted')}
                    style={{ accentColor: '#059669' }}
                  />
                  Accept & Approve
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border:
                      decision === 'revision_requested'
                        ? '2px solid var(--aiims-coral-solid, #e11d48)'
                        : '1px solid var(--aiims-border-subtle, #e2e8f0)',
                    backgroundColor:
                      decision === 'revision_requested'
                        ? 'var(--aiims-coral-subtle, #ffe4e6)'
                        : 'var(--aiims-bg-card, #ffffff)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 700,
                    color:
                      decision === 'revision_requested'
                        ? 'var(--aiims-coral-text, #9f1239)'
                        : 'var(--aiims-text-primary, #0f172a)',
                  }}
                >
                  <input
                    type="radio"
                    name="decision"
                    value="revision_requested"
                    checked={decision === 'revision_requested'}
                    onChange={() => setDecision('revision_requested')}
                    style={{ accentColor: '#e11d48' }}
                  />
                  Request Revision
                </label>
              </div>
            </div>

            {/* Written Feedback Textarea */}
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <label
                  htmlFor="evaluator-feedback"
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-heading, #0f172a)',
                  }}
                >
                  Constructive Written Feedback <span style={{ color: '#e11d48' }}>*</span>
                </label>
                <span
                  style={{
                    fontSize: '12px',
                    color: isFeedbackComplete
                      ? 'var(--aiims-mint-text, #065f46)'
                      : 'var(--aiims-text-muted, #94a3b8)',
                    fontWeight: 600,
                  }}
                >
                  {isFeedbackComplete ? 'Feedback written ✓' : 'Feedback required'}
                </span>
              </div>

              <textarea
                id="evaluator-feedback"
                rows={5}
                required
                placeholder="Provide specific feedback on prompt structure, reasoning depth, edge-case coverage, and next steps..."
                value={writtenFeedback}
                onChange={(e) => setWrittenFeedback(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--aiims-border-card, #e2e8f0)',
                  backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                  color: 'var(--aiims-text-primary, #0f172a)',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s ease',
                }}
              />
            </div>

            {/* Action Bar with Disabled Send Button Guardian */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                paddingTop: '16px',
                borderTop: '1px solid var(--aiims-border-subtle, #e2e8f0)',
              }}
            >
              <div style={{ fontSize: '13px', color: 'var(--aiims-text-secondary, #64748b)' }}>
                {!isRubricComplete ? (
                  <span style={{ color: 'var(--aiims-coral-text, #9f1239)', fontWeight: 600 }}>
                    ⚠️ All 4 rubric criteria must be scored (1 to 5).
                  </span>
                ) : !isFeedbackComplete ? (
                  <span style={{ color: 'var(--aiims-coral-text, #9f1239)', fontWeight: 600 }}>
                    ⚠️ Written feedback text is required before submitting.
                  </span>
                ) : (
                  <span style={{ color: 'var(--aiims-mint-text, #065f46)', fontWeight: 700 }}>
                    ✓ Ready to send evaluation to learner.
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Button variant="outline" onClick={onBackToQueue}>
                  Cancel
                </Button>

                {/* THE SEND BUTTON: REMAINS DISABLED UNTIL ALL CRITERIA SCORED & FEEDBACK WRITTEN */}
                <Button
                  id="send-review-btn"
                  variant="primary"
                  size="lg"
                  disabled={!isFormValid || submittingReview}
                  onClick={handleSubmitReview}
                  icon={
                    submittingReview ? (
                      <RotateCcw size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )
                  }
                >
                  {submittingReview ? 'Sending Evaluation...' : 'Send Review to Learner'}
                </Button>
              </div>
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
};
