import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  User,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Terminal,
  ShieldCheck,
  Send,
  Loader2,
  Copy,
  Check,
  X,
  ExternalLink,
  RotateCcw,
  MessageSquare,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { SubmissionItem } from '../../types';

interface SubmissionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export const AdminSubmissionsReviewView: React.FC = () => {
  // Stats & List State
  const [stats, setStats] = useState<SubmissionStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  // Selected Submission Detail Modal
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionItem | null>(null);
  const [selectedVersionIdx, setSelectedVersionIdx] = useState<number>(-1);

  // Review Form State
  const [reviewDecision, setReviewDecision] = useState<
    'accepted' | 'revision_requested' | 'rejected'
  >('accepted');
  const [reviewFeedback, setReviewFeedback] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Copy helpers
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [copiedOutput, setCopiedOutput] = useState<boolean>(false);

  // 1. Fetch Stats & Submissions
  const fetchData = async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const [statsRes, listRes] = await Promise.all([
        apiClient.adminGetSubmissionStats(),
        apiClient.adminListSubmissions({
          status: statusFilter,
          module: moduleFilter,
          search: searchQuery,
        }),
      ]);

      if (statsRes && statsRes.success && statsRes.stats) {
        setStats(statsRes.stats);
      }

      if (listRes && listRes.success && Array.isArray(listRes.submissions)) {
        setSubmissions(listRes.submissions);
      } else {
        setSubmissions([]);
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, moduleFilter]);

  // Handle Search on Enter or debounce
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  // 2. Open Submission Review Drawer/Modal
  const handleOpenReview = (sub: SubmissionItem) => {
    setSelectedSubmission(sub);
    setReviewFeedback(sub.writtenFeedback || '');
    setReviewDecision(
      sub.status === 'accepted'
        ? 'accepted'
        : sub.status === 'revision_requested'
          ? 'revision_requested'
          : 'accepted'
    );
    setSelectedVersionIdx(-1);
    setCopiedPrompt(false);
    setCopiedOutput(false);
  };

  // 3. Submit Admin Review Decision
  const handleExecuteReview = async () => {
    if (!selectedSubmission) return;
    if (!reviewFeedback.trim()) {
      alert('Please provide feedback explaining your review decision.');
      return;
    }

    setIsSubmittingReview(true);
    setShowConfirmModal(false);

    try {
      const subId = String(selectedSubmission.id || selectedSubmission._id);
      const res = await apiClient.adminReviewSubmission(subId, {
        decision: reviewDecision,
        feedback: reviewFeedback.trim(),
      });

      if (res && res.success) {
        setSuccessBanner(
          `Submission by ${selectedSubmission.learnerName || 'learner'} was ${reviewDecision === 'accepted' ? 'Approved' : 'reviewed'}.`
        );
        setSelectedSubmission(null);
        fetchData();
      } else {
        setErrorBanner(res?.error || 'Failed to submit review.');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Error occurred while recording review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Status Badge Component
  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted':
      case 'approved':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            <CheckCircle2 size={13} color="#059669" /> Approved
          </span>
        );
      case 'revision_requested':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
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
      case 'rejected':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            <AlertCircle size={13} color="#dc2626" /> Rejected
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
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: '#f5f3ff',
              color: '#6d28d9',
              border: '1px solid #ddd6fe',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            <Clock size={13} color="#7c3aed" /> Pending Review
          </span>
        );
    }
  };

  // Active prompt and output for modal
  const meta = selectedSubmission?.rubricScores || {};
  const promptHistory: any[] = Array.isArray(selectedSubmission?.promptHistory)
    ? selectedSubmission!.promptHistory
    : Array.isArray(meta.promptHistory)
      ? meta.promptHistory
      : [];

  const displayPrompt =
    selectedVersionIdx >= 0 && selectedVersionIdx < promptHistory.length
      ? promptHistory[selectedVersionIdx].prompt
      : selectedSubmission?.userPrompt ||
        meta.userPrompt ||
        selectedSubmission?.answerContent ||
        '';

  const displayOutput =
    selectedVersionIdx >= 0 && selectedVersionIdx < promptHistory.length
      ? promptHistory[selectedVersionIdx].output
      : selectedSubmission?.aiOutput || meta.aiOutput || '';

  const displayModel =
    selectedVersionIdx >= 0 && selectedVersionIdx < promptHistory.length
      ? promptHistory[selectedVersionIdx].model
      : selectedSubmission?.modelUsed || meta.modelUsed || 'Anthropic Claude 3.5';

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', color: '#0f172a' }}>
      {/* 1. ADMIN DASHBOARD STATS CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            padding: '18px 20px',
            borderRadius: '14px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#64748b',
              marginBottom: '6px',
            }}
          >
            Total Submissions
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{stats.total}</div>
        </div>

        <div
          style={{
            padding: '18px 20px',
            borderRadius: '14px',
            backgroundColor: '#f5f3ff',
            border: '1px solid #ddd6fe',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#6d28d9',
              marginBottom: '6px',
            }}
          >
            Pending Reviews
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#5b21b6' }}>{stats.pending}</div>
        </div>

        <div
          style={{
            padding: '18px 20px',
            borderRadius: '14px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#065f46',
              marginBottom: '6px',
            }}
          >
            Approved Submissions
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#047857' }}>
            {stats.approved}
          </div>
        </div>

        <div
          style={{
            padding: '18px 20px',
            borderRadius: '14px',
            backgroundColor: '#fff7ed',
            border: '1px solid #fed7aa',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#9a3412',
              marginBottom: '6px',
            }}
          >
            Changes Requested / Rejected
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#c2410c' }}>
            {stats.rejected}
          </div>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {successBanner && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46' }}
          >
            ✕
          </button>
        </div>
      )}

      {errorBanner && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. SEARCH & FILTER BAR */}
      <Surface variant="bordered" radius="lg" padding="md" style={{ marginBottom: '20px' }}>
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          {/* Search box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 320px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
              }}
            >
              <Search size={16} color="#64748b" />
              <input
                type="text"
                placeholder="Search by learner, email, question, or prompt content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: '13px',
                  color: '#0f172a',
                }}
              />
            </div>
            <Button variant="outline" size="sm" type="submit">
              Search
            </Button>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '13px',
                  color: '#0f172a',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Changes Requested / Rejected</option>
              </select>
            </div>

            {/* Module Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Module:</span>
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                style={{
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '13px',
                  color: '#0f172a',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Modules</option>
                <option value="Clarity">Clarity</option>
                <option value="Focus">Focus</option>
              </select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={14} className={loading ? 'aiims-spin' : ''} />}
              onClick={fetchData}
            >
              Refresh
            </Button>
          </div>
        </form>
      </Surface>

      {/* 3. SUBMISSIONS LIST TABLE */}
      <Surface variant="bordered" radius="lg" padding="none" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '13px',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  color: '#475569',
                }}
              >
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Learner</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Question & Module</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Submitted Date</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>AI Provider / Latency</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}
                  >
                    <Loader2 size={24} className="aiims-spin" style={{ margin: '0 auto 10px' }} />
                    <div>Loading submissions...</div>
                  </td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}
                  >
                    <FileText size={28} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
                    <div style={{ fontWeight: 700, color: '#334155' }}>No submissions found</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      Try adjusting your status or module filters.
                    </div>
                  </td>
                </tr>
              ) : (
                submissions.map((sub) => {
                  const subMeta = sub.rubricScores || {};
                  const mod =
                    sub.module ||
                    subMeta.module ||
                    (sub.taskId?.toLowerCase().includes('focus') ? 'Focus' : 'Clarity');
                  const model = sub.modelUsed || subMeta.modelUsed || 'Anthropic Claude 3.5';
                  const latency = sub.executionTimeMs || subMeta.executionTimeMs;

                  return (
                    <tr
                      key={sub.id || sub._id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#faf5ff')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Learner */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {sub.learnerName || 'Learner'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {sub.learnerEmail || String(sub.learner).slice(-8)}
                        </div>
                      </td>

                      {/* Question */}
                      <td style={{ padding: '14px 18px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '4px',
                          }}
                        >
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: mod === 'Focus' ? '#f5f3ff' : '#eff6ff',
                              color: mod === 'Focus' ? '#6d28d9' : '#1d4ed8',
                              border: mod === 'Focus' ? '1px solid #ddd6fe' : '1px solid #bfdbfe',
                            }}
                          >
                            {mod}
                          </span>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>
                            {sub.taskTitle || sub.taskId}
                          </span>
                        </div>
                        {subMeta.topic && (
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            Topic: {subMeta.topic}
                          </div>
                        )}
                      </td>

                      {/* Submitted Date */}
                      <td style={{ padding: '14px 18px', color: '#475569' }}>
                        {sub.submittedAt
                          ? new Date(sub.submittedAt).toLocaleDateString()
                          : 'Recent'}
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {sub.submittedAt
                            ? new Date(sub.submittedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </div>
                      </td>

                      {/* AI Execution Details */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          {model}
                        </div>
                        {latency ? (
                          <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                            ⚡ {latency}ms
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Preview Verified</div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 18px' }}>{renderStatusBadge(sub.status)}</td>

                      {/* Action */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <Button
                          variant={
                            sub.status === 'submitted' || sub.status === 'in_review'
                              ? 'primary'
                              : 'outline'
                          }
                          size="sm"
                          onClick={() => handleOpenReview(sub)}
                        >
                          Review Submission
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Surface>

      {/* 4. TWO-PANEL SUBMISSION DETAIL & REVIEW MODAL */}
      {selectedSubmission && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => !isSubmittingReview && setSelectedSubmission(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              maxWidth: '1150px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 24px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: '#f5f3ff',
                      color: '#6d28d9',
                      border: '1px solid #ddd6fe',
                    }}
                  >
                    {selectedSubmission.module || meta.module || 'Clarity'}
                  </span>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                    {selectedSubmission.taskTitle || selectedSubmission.taskId}
                  </h2>
                  {renderStatusBadge(selectedSubmission.status)}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Submitted by <strong>{selectedSubmission.learnerName || 'Learner'}</strong> (
                  {selectedSubmission.learnerEmail}) on{' '}
                  {selectedSubmission.submittedAt
                    ? new Date(selectedSubmission.submittedAt).toLocaleString()
                    : 'N/A'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Two-Panel Layout */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.35fr',
                gap: '0',
                overflowY: 'auto',
                flex: 1,
              }}
            >
              {/* LEFT PANEL: Problem Context, Learner Metadata & History */}
              <div
                style={{
                  padding: '24px',
                  borderRight: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  overflowY: 'auto',
                }}
              >
                {/* Learner Info Card */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px',
                    }}
                  >
                    <User size={16} color="#6366f1" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      Learner Profile
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
                    <div>
                      <strong>Name:</strong> {selectedSubmission.learnerName || 'Learner'}
                    </div>
                    <div>
                      <strong>Email:</strong> {selectedSubmission.learnerEmail || 'N/A'}
                    </div>
                    <div>
                      <strong>Learner ID:</strong>{' '}
                      {String(
                        typeof selectedSubmission.learner === 'object'
                          ? selectedSubmission.learner?._id
                          : selectedSubmission.learner || 'N/A'
                      )}
                    </div>
                  </div>
                </div>

                {/* Question Info Card */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px',
                    }}
                  >
                    <FileText size={16} color="#7c3aed" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      Task Information
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
                    <div>
                      <strong>Task ID:</strong> {selectedSubmission.taskId}
                    </div>
                    {meta.topic && (
                      <div>
                        <strong>Topic:</strong> {meta.topic}
                      </div>
                    )}
                    <div>
                      <strong>Execution Latency:</strong> {displayModel} (
                      {selectedSubmission.executionTimeMs || meta.executionTimeMs || 'N/A'}ms)
                    </div>
                  </div>
                </div>

                {/* Prompt Versions History (if available) */}
                {promptHistory.length > 0 && (
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '10px',
                      }}
                    >
                      <RotateCcw size={15} color="#6366f1" />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        Prompt Run Iterations ({promptHistory.length})
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedVersionIdx(-1)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          border:
                            selectedVersionIdx === -1 ? '1.5px solid #7c3aed' : '1px solid #cbd5e1',
                          backgroundColor: selectedVersionIdx === -1 ? '#f5f3ff' : '#ffffff',
                          color: selectedVersionIdx === -1 ? '#6d28d9' : '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        Final Submitted Version
                      </button>
                      {promptHistory.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedVersionIdx(idx)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            border:
                              selectedVersionIdx === idx
                                ? '1.5px solid #7c3aed'
                                : '1px solid #cbd5e1',
                            backgroundColor: selectedVersionIdx === idx ? '#f5f3ff' : '#ffffff',
                            color: selectedVersionIdx === idx ? '#6d28d9' : '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          Run #{idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT PANEL: Submitted Prompt, Output & Admin Review Form */}
              <div
                style={{
                  padding: '24px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  overflowY: 'auto',
                }}
              >
                {/* 1. Submitted Prompt */}
                <div>
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
                        fontSize: '13px',
                        fontWeight: 800,
                        color: '#0f172a',
                      }}
                    >
                      <Terminal size={15} color="#6366f1" />
                      <span>Submitted Prompt</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(displayPrompt);
                        setCopiedPrompt(true);
                        setTimeout(() => setCopiedPrompt(false), 2000);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: copiedPrompt ? '#059669' : '#64748b',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {copiedPrompt ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedPrompt ? 'Copied' : 'Copy Prompt'}</span>
                    </button>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: '14px 16px',
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      fontSize: '13px',
                      lineHeight: 1.6,
                      color: '#1e293b',
                      whiteSpace: 'pre-wrap',
                      fontFamily:
                        "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      maxHeight: '220px',
                      overflowY: 'auto',
                    }}
                  >
                    {displayPrompt || 'No prompt content recorded.'}
                  </pre>
                </div>

                {/* 2. Actual Generated AI Output */}
                <div>
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
                        fontSize: '13px',
                        fontWeight: 800,
                        color: '#0f172a',
                      }}
                    >
                      <Sparkles size={15} color="#7c3aed" />
                      <span>Generated AI Response ({displayModel})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(displayOutput);
                        setCopiedOutput(true);
                        setTimeout(() => setCopiedOutput(false), 2000);
                      }}
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
                      {copiedOutput ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedOutput ? 'Copied' : 'Copy Output'}</span>
                    </button>
                  </div>
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      fontSize: '13px',
                      lineHeight: 1.6,
                      color: '#1e293b',
                      whiteSpace: 'pre-wrap',
                      fontFamily:
                        "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      maxHeight: '260px',
                      overflowY: 'auto',
                    }}
                  >
                    {displayOutput || 'No AI output recorded with this submission.'}
                  </div>
                </div>

                {/* 3. Admin Review Actions Form */}
                <div
                  style={{
                    padding: '18px 20px',
                    borderRadius: '12px',
                    backgroundColor: '#faf5ff',
                    border: '1.5px solid #e9d5ff',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '14px',
                    }}
                  >
                    <ShieldCheck size={18} color="#7c3aed" />
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                      Admin Evaluation Decision
                    </h3>
                  </div>

                  {/* Decision Selector */}
                  <div style={{ marginBottom: '14px' }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#475569',
                        marginBottom: '8px',
                      }}
                    >
                      Select Outcome Decision:
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setReviewDecision('accepted')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border:
                            reviewDecision === 'accepted'
                              ? '2px solid #059669'
                              : '1px solid #cbd5e1',
                          backgroundColor: reviewDecision === 'accepted' ? '#ecfdf5' : '#ffffff',
                          color: reviewDecision === 'accepted' ? '#065f46' : '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <CheckCircle2
                          size={15}
                          color={reviewDecision === 'accepted' ? '#059669' : '#64748b'}
                        />
                        Approve Submission
                      </button>

                      <button
                        type="button"
                        onClick={() => setReviewDecision('revision_requested')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border:
                            reviewDecision === 'revision_requested'
                              ? '2px solid #ea580c'
                              : '1px solid #cbd5e1',
                          backgroundColor:
                            reviewDecision === 'revision_requested' ? '#fff7ed' : '#ffffff',
                          color: reviewDecision === 'revision_requested' ? '#9a3412' : '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <AlertCircle
                          size={15}
                          color={reviewDecision === 'revision_requested' ? '#ea580c' : '#64748b'}
                        />
                        Request Changes
                      </button>

                      <button
                        type="button"
                        onClick={() => setReviewDecision('rejected')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border:
                            reviewDecision === 'rejected'
                              ? '2px solid #dc2626'
                              : '1px solid #cbd5e1',
                          backgroundColor: reviewDecision === 'rejected' ? '#fef2f2' : '#ffffff',
                          color: reviewDecision === 'rejected' ? '#991b1b' : '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <X
                          size={15}
                          color={reviewDecision === 'rejected' ? '#dc2626' : '#64748b'}
                        />
                        Reject
                      </button>
                    </div>
                  </div>

                  {/* Feedback Textarea */}
                  <div style={{ marginBottom: '16px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                        Feedback to Learner:
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        Visible to the learner on their workbench
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      value={reviewFeedback}
                      onChange={(e) => setReviewFeedback(e.target.value)}
                      placeholder="Provide specific, constructive guidance on prompt design, context injection, and output quality..."
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        lineHeight: 1.5,
                        color: '#0f172a',
                        fontFamily:
                          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  {/* Submit Review Action Button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <Button
                      variant="outline"
                      size="md"
                      disabled={isSubmittingReview}
                      onClick={() => setSelectedSubmission(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      disabled={isSubmittingReview || !reviewFeedback.trim()}
                      onClick={() => setShowConfirmModal(true)}
                      icon={
                        isSubmittingReview ? (
                          <Loader2 size={16} className="aiims-spin" />
                        ) : (
                          <Send size={15} />
                        )
                      }
                    >
                      {isSubmittingReview ? 'Recording Decision...' : 'Submit Review Decision'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL BEFORE SAVING REVIEW */}
      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
          onClick={() => !isSubmittingReview && setShowConfirmModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}
            >
              <ShieldCheck size={22} color="#7c3aed" />
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                Confirm Review Decision
              </h3>
            </div>
            <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#475569', margin: '0 0 16px' }}>
              Are you sure you want to mark this submission as{' '}
              <strong
                style={{
                  color:
                    reviewDecision === 'accepted'
                      ? '#059669'
                      : reviewDecision === 'rejected'
                        ? '#dc2626'
                        : '#ea580c',
                }}
              >
                {reviewDecision === 'accepted'
                  ? 'APPROVED'
                  : reviewDecision === 'rejected'
                    ? 'REJECTED'
                    : 'CHANGES REQUESTED'}
              </strong>
              ? The learner will immediately see this status and your written feedback on their
              dashboard.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button
                variant="outline"
                size="md"
                disabled={isSubmittingReview}
                onClick={() => setShowConfirmModal(false)}
              >
                Go Back
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={isSubmittingReview}
                onClick={handleExecuteReview}
                icon={
                  isSubmittingReview ? (
                    <Loader2 size={16} className="aiims-spin" />
                  ) : (
                    <CheckCircle2 size={15} />
                  )
                }
              >
                {isSubmittingReview ? 'Saving...' : 'Confirm & Publish'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
