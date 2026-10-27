import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Send,
  MessageSquare,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { SubmissionItem } from '../../types';
import { Surface } from '../common/Surface';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface LearnerSubmissionsSectionProps {
  currentTaskId?: string;
  currentTaskTitle?: string;
  onRefreshTrigger?: number;
}

export const LearnerSubmissionsSection: React.FC<LearnerSubmissionsSectionProps> = ({
  currentTaskId: _currentTaskId,
  currentTaskTitle: _currentTaskTitle,
  onRefreshTrigger,
}) => {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [resubmittingId, setResubmittingId] = useState<string | null>(null);
  const [revisedContent, setRevisedContent] = useState('');
  const [revisionNote, setRevisionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.getMySubmissions();
      if (res && res.success && Array.isArray(res.submissions)) {
        setSubmissions(res.submissions);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Failed to fetch learner submissions:', msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [onRefreshTrigger]);

  const handleStartResubmit = (sub: SubmissionItem) => {
    const subId = String(sub._id || sub.id);
    setResubmittingId(subId);
    setRevisedContent(sub.answerContent || '');
    setRevisionNote('');
    setErrorMessage(null);
  };

  const handleSubmitRevision = async (subId: string) => {
    if (!revisedContent.trim()) {
      setErrorMessage('Revised answer content cannot be empty.');
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await apiClient.resubmitTask(subId, {
        answerContent: revisedContent.trim(),
        note: revisionNote.trim() || undefined,
      });

      if (res && res.success) {
        setSuccessMessage('Revision submitted successfully! Evaluator will review shortly.');
        setResubmittingId(null);
        fetchSubmissions();
      } else {
        setErrorMessage(res?.error || 'Failed to submit revision.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit revision.';
      setErrorMessage(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeVariant = (
    status: string
  ): 'primary' | 'success' | 'warning' | 'coral' | 'neutral' => {
    switch (status) {
      case 'accepted':
        return 'success';
      case 'revision_requested':
        return 'coral';
      case 'in_review':
        return 'warning';
      case 'feedback_given':
        return 'primary';
      default:
        return 'neutral';
    }
  };

  return (
    <div style={{ marginTop: '24px' }}>
      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={18} color="var(--aiims-sky-text, #0369a1)" />
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading, #0f172a)',
            }}
          >
            My Submissions & Evaluator Feedback
          </h2>
          <Badge variant="primary">{submissions.length}</Badge>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={fetchSubmissions}
          disabled={loading}
          icon={<RefreshCw size={13} className={loading ? 'animate-spin' : ''} />}
        >
          Refresh
        </Button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--aiims-mint-subtle, #d1fae5)',
            border: '1px solid var(--aiims-mint-border, #a7f3d0)',
            color: 'var(--aiims-mint-text, #065f46)',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '14px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--aiims-coral-subtle, #ffe4e6)',
            border: '1px solid var(--aiims-coral-border, #fecdd3)',
            color: 'var(--aiims-coral-text, #9f1239)',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '14px',
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Submissions List */}
      {loading && submissions.length === 0 ? (
        <Surface variant="bordered" radius="lg" padding="md" style={{ textAlign: 'center' }}>
          <div
            style={{ padding: '20px', color: 'var(--aiims-text-muted, #94a3b8)', fontSize: '13px' }}
          >
            Loading your task submissions...
          </div>
        </Surface>
      ) : submissions.length === 0 ? (
        <Surface variant="bordered" radius="lg" padding="md" style={{ textAlign: 'center' }}>
          <div
            style={{
              padding: '20px',
              color: 'var(--aiims-text-secondary, #64748b)',
              fontSize: '13px',
            }}
          >
            No task submissions yet. Complete the task prompt above and click "Submit for Evaluator
            Review" to receive certified mentor feedback and rubric scores.
          </div>
        </Surface>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {submissions.map((sub) => {
            const subId = String(sub._id || sub.id);
            const isRevisionRequested = sub.status === 'revision_requested';
            const isAccepted = sub.status === 'accepted';
            const hasScores = sub.rubricScores && Object.keys(sub.rubricScores).length > 0;
            const isExpanded = expandedId === subId || isRevisionRequested;

            return (
              <Surface
                key={subId}
                variant={isAccepted ? 'mint' : isRevisionRequested ? 'coral' : 'bordered'}
                radius="lg"
                padding="md"
              >
                {/* Header Row */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    marginBottom: '8px',
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '15px',
                        fontWeight: 800,
                        color: 'var(--aiims-text-heading, #0f172a)',
                      }}
                    >
                      {sub.taskTitle || sub.taskId}
                    </h3>
                    <Badge variant={getStatusBadgeVariant(sub.status)}>
                      {sub.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {sub.revisionCount > 0 && (
                      <Badge variant="neutral">Rev #{sub.revisionCount}</Badge>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--aiims-text-muted, #94a3b8)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Clock size={12} />
                      {new Date(sub.submittedAt).toLocaleDateString()}
                    </span>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : subId)}
                      style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        color: 'var(--aiims-text-secondary, #64748b)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      {isExpanded ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>
                </div>

                {/* Submitted Answer Snippet */}
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--aiims-text-body, #334155)',
                    backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                    lineHeight: 1.5,
                    maxHeight: isExpanded ? '300px' : '50px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    marginBottom: '10px',
                  }}
                >
                  {sub.answerContent}
                </div>

                {/* Evaluator Written Feedback & Rubric Scores */}
                {(sub.writtenFeedback || hasScores) && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: isAccepted
                        ? 'var(--aiims-mint-subtle, #d1fae5)'
                        : isRevisionRequested
                          ? 'var(--aiims-coral-subtle, #ffe4e6)'
                          : 'var(--aiims-sky-subtle, #e0f2fe)',
                      border: '1px solid var(--aiims-border-card, #e2e8f0)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '6px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 800,
                          color: 'var(--aiims-text-heading, #0f172a)',
                        }}
                      >
                        Evaluator Feedback {sub.evaluatorName ? `by ${sub.evaluatorName}` : ''}
                      </span>
                    </div>

                    {/* Written Feedback Text */}
                    {sub.writtenFeedback && (
                      <p
                        style={{
                          margin: '0 0 10px',
                          fontSize: '13px',
                          lineHeight: 1.5,
                          color: 'var(--aiims-text-body, #334155)',
                        }}
                      >
                        {sub.writtenFeedback}
                      </p>
                    )}

                    {/* Rubric Score Breakdown */}
                    {hasScores && sub.rubricScores && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                          gap: '8px',
                          paddingTop: '8px',
                          borderTop: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                        }}
                      >
                        {Object.entries(sub.rubricScores).map(([crit, val]) => (
                          <div
                            key={crit}
                            style={{
                              backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                            }}
                          >
                            <span
                              style={{
                                textTransform: 'capitalize',
                                color: 'var(--aiims-text-secondary)',
                              }}
                            >
                              {crit.replace('_', ' ')}:
                            </span>{' '}
                            <strong>{val} / 5</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Revision Requested Callout & Resubmit Action */}
                {isRevisionRequested && (
                  <div style={{ marginTop: '12px' }}>
                    {resubmittingId === subId ? (
                      <div
                        style={{
                          padding: '14px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                          border: '2px solid var(--aiims-coral-solid, #e11d48)',
                        }}
                      >
                        <h4
                          style={{
                            margin: '0 0 8px',
                            fontSize: '14px',
                            fontWeight: 800,
                            color: 'var(--aiims-coral-text, #9f1239)',
                          }}
                        >
                          Submit Revised Answer
                        </h4>

                        <div style={{ marginBottom: '10px' }}>
                          <label
                            style={{
                              display: 'block',
                              fontSize: '12px',
                              fontWeight: 700,
                              marginBottom: '4px',
                            }}
                          >
                            Updated Answer Content *
                          </label>
                          <textarea
                            rows={4}
                            required
                            value={revisedContent}
                            onChange={(e) => setRevisedContent(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--aiims-border-card, #e2e8f0)',
                              boxSizing: 'border-box',
                              fontFamily: 'inherit',
                              fontSize: '13px',
                            }}
                          />
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <label
                            style={{
                              display: 'block',
                              fontSize: '12px',
                              fontWeight: 700,
                              marginBottom: '4px',
                            }}
                          >
                            Revision Note (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Added verification persona and explicit bounds"
                            value={revisionNote}
                            onChange={(e) => setRevisionNote(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--aiims-border-card, #e2e8f0)',
                              boxSizing: 'border-box',
                              fontSize: '13px',
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={actionLoading || !revisedContent.trim()}
                            onClick={() => handleSubmitRevision(subId)}
                            icon={<Send size={13} />}
                          >
                            {actionLoading ? 'Submitting Revision...' : 'Submit Revised Answer'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => setResubmittingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--aiims-coral-subtle, #ffe4e6)',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: 'var(--aiims-coral-text, #9f1239)',
                          }}
                        >
                          Action Needed: The evaluator has requested revisions on this task.
                        </span>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleStartResubmit(sub)}
                          icon={<RotateCcw size={14} />}
                        >
                          Resubmit Revision
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Surface>
            );
          })}
        </div>
      )}
    </div>
  );
};
