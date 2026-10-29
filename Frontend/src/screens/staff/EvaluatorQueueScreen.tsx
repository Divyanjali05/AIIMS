import React, { useState, useEffect } from 'react';
import { Clock, User, CheckCircle, AlertCircle, RefreshCw, ArrowRight, Inbox } from 'lucide-react';
import { apiClient } from '../../api/client';
import { SubmissionItem } from '../../types';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

interface EvaluatorQueueScreenProps {
  onSelectSubmission?: (id: string) => void;
  onNavigate?: (path: string) => void;
}

export const EvaluatorQueueScreen: React.FC<EvaluatorQueueScreenProps> = ({
  onSelectSubmission,
  onNavigate,
}) => {
  const [queue, setQueue] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const data = await apiClient.getEvaluationQueue();
      if (data && data.success && Array.isArray(data.queue)) {
        setQueue(data.queue);
      } else {
        setQueue([]);
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to load evaluation queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleClaim = async (submission: SubmissionItem) => {
    const subId = String(submission._id || submission.id);
    setClaimingId(subId);
    setErrorBanner(null);
    setSuccessBanner(null);

    try {
      const result = await apiClient.claimSubmission(subId);
      if (result && result.success) {
        setSuccessBanner(
          `Task "${submission.taskTitle || submission.taskId}" claimed successfully.`
        );
        // Navigate to review screen
        if (onSelectSubmission) {
          onSelectSubmission(subId);
        } else if (onNavigate) {
          onNavigate(`/staff/review/${subId}`);
        } else {
          window.location.href = `/staff/review/${subId}`;
        }
      } else {
        setErrorBanner(result?.error || 'Failed to claim task. It may have already been claimed.');
        fetchQueue();
      }
    } catch (err: any) {
      setErrorBanner(
        err.message ||
          'Failed to claim task. It may have already been claimed by another evaluator.'
      );
      fetchQueue();
    } finally {
      setClaimingId(null);
    }
  };

  // Helper for anonymised learner ID or name
  const getLearnerLabel = (sub: SubmissionItem) => {
    if (sub.learnerName && sub.learnerName.trim()) {
      return sub.learnerName;
    }
    const id = typeof sub.learner === 'object' ? sub.learner?._id || sub.learner?.id : sub.learner;
    if (id) {
      return `Learner #${String(id).slice(-4).toUpperCase()}`;
    }
    return 'Learner (Anonymous)';
  };

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px 20px',
        paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))',
        boxSizing: 'border-box',
      }}
    >
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading, #0f172a)',
                letterSpacing: '-0.5px',
              }}
            >
              Evaluation Queue
            </h1>
            <Badge variant="primary">{queue.length} Pending</Badge>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: 'var(--aiims-text-secondary, #64748b)',
            }}
          >
            Review pending submissions sorted oldest first (FIFO). Claim a task to begin scoring.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchQueue}
          disabled={loading}
          icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
        >
          {loading ? 'Refreshing...' : 'Refresh Queue'}
        </Button>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: 'var(--aiims-mint-subtle, #d1fae5)',
            border: '1px solid var(--aiims-mint-border, #a7f3d0)',
            color: 'var(--aiims-mint-text, #065f46)',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px',
          }}
        >
          <CheckCircle size={16} />
          <span>{successBanner}</span>
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
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: 'var(--aiims-coral-subtle, #ffe4e6)',
            border: '1px solid var(--aiims-coral-border, #fecdd3)',
            color: 'var(--aiims-coral-text, #9f1239)',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px',
          }}
        >
          <AlertCircle size={16} />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Queue Listing */}
      {loading && queue.length === 0 ? (
        <Surface variant="bordered" radius="lg" padding="lg" style={{ textAlign: 'center' }}>
          <div style={{ padding: '40px 20px', color: 'var(--aiims-text-muted, #94a3b8)' }}>
            <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600 }}>Loading evaluation queue...</div>
          </div>
        </Surface>
      ) : queue.length === 0 ? (
        <Surface variant="mint" radius="lg" padding="lg" style={{ textAlign: 'center' }}>
          <div style={{ padding: '40px 20px', color: 'var(--aiims-mint-text, #065f46)' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                boxShadow: 'var(--aiims-shadow-sm)',
              }}
            >
              <Inbox size={30} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800 }}>
              Queue is Clear!
            </h3>
            <p
              style={{
                margin: '0 auto',
                maxWidth: '400px',
                fontSize: '14px',
                color: 'var(--aiims-text-secondary, #64748b)',
              }}
            >
              All submitted tasks have been reviewed or are currently in evaluation. New submissions
              will appear here automatically.
            </p>
          </div>
        </Surface>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {queue.map((sub, idx) => {
            const subId = String(sub._id || sub.id);
            const isClaiming = claimingId === subId;

            return (
              <Surface
                key={subId || idx}
                variant="bordered"
                radius="lg"
                padding="md"
                style={{
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  borderLeft: '4px solid var(--aiims-sky-solid, #0284c7)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                  }}
                >
                  {/* Left Column: Task Info, Learner, Waiting Time */}
                  <div style={{ flex: '1 1 300px', minWidth: '240px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '6px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: '16px',
                          fontWeight: 800,
                          color: 'var(--aiims-text-heading, #0f172a)',
                        }}
                      >
                        {sub.taskTitle || sub.taskId}
                      </h3>
                      <Badge variant="warning">{sub.status}</Badge>
                      {sub.revisionCount > 0 && (
                        <Badge variant="neutral">Rev #{sub.revisionCount}</Badge>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '16px',
                        fontSize: '13px',
                        color: 'var(--aiims-text-secondary, #64748b)',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <User size={14} />
                        <strong>{getLearnerLabel(sub)}</strong>
                      </span>

                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: 'var(--aiims-coral-text, #e11d48)',
                          fontWeight: 700,
                        }}
                      >
                        <Clock size={14} />
                        Waiting {sub.waitingTimeFormatted || 'just now'}
                      </span>

                      <span style={{ fontSize: '12px', color: 'var(--aiims-text-muted, #94a3b8)' }}>
                        ID: {sub.taskId}
                      </span>
                    </div>

                    {/* Brief preview of answer */}
                    <div
                      style={{
                        marginTop: '8px',
                        fontSize: '13px',
                        color: 'var(--aiims-text-body, #334155)',
                        backgroundColor: 'var(--aiims-bg-subtle, #f8fafc)',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        maxHeight: '48px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {sub.answerContent}
                    </div>
                  </div>

                  {/* Right Column: Claim Action Button */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexShrink: 0,
                    }}
                  >
                    <Button
                      variant="primary"
                      size="md"
                      disabled={isClaiming}
                      onClick={() => handleClaim(sub)}
                      icon={
                        isClaiming ? (
                          <RefreshCw size={15} className="animate-spin" />
                        ) : (
                          <ArrowRight size={15} />
                        )
                      }
                    >
                      {isClaiming ? 'Claiming...' : 'Claim Task'}
                    </Button>
                  </div>
                </div>
              </Surface>
            );
          })}
        </div>
      )}
    </div>
  );
};
