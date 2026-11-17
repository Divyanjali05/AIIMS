import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  Eye,
  RefreshCw,
  FileText,
  ShieldCheck,
  Check,
  X,
  MessageSquare,
  Calendar,
  User,
  Tag,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import {
  AdminToolReportItem,
  AdminToolReportMetrics,
  ToolReportStatus,
  ReportCategory,
} from '../../types';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const ToolReportsQAView: React.FC = () => {
  const [reports, setReports] = useState<AdminToolReportItem[]>([]);
  const [metrics, setMetrics] = useState<AdminToolReportMetrics>({
    pending: 0,
    underReview: 0,
    resolved: 0,
    rejected: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Detail Modal State
  const [selectedReport, setSelectedReport] = useState<AdminToolReportItem | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ToolReportStatus | null>(null);

  // Fetch reports list
  const fetchReports = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const params: {
        status?: string;
        category?: string;
        search?: string;
        page?: number;
        limit?: number;
      } = {
        page: currentPage,
        limit: 20,
      };

      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await apiClient.getAdminToolReports(params);
      if (res && res.success) {
        setReports(res.reports || []);
        if (res.metrics) {
          setMetrics(res.metrics);
        }
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.total || 0);
      } else {
        setErrorBanner(res?.error || 'Failed to load tool reports.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error loading tool reports.';
      setErrorBanner(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedCategory, searchQuery, currentPage]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Open Report Detail Modal
  const handleOpenDetail = async (report: AdminToolReportItem) => {
    setSelectedReport(report);
    setActionNotes(report.reviewNotes || '');
    setConfirmAction(null);
    setModalLoading(true);

    try {
      const detailRes = await apiClient.getAdminToolReportById(report.id);
      if (detailRes && detailRes.success && detailRes.report) {
        setSelectedReport(detailRes.report);
        setActionNotes(detailRes.report.reviewNotes || '');
      }
    } catch {
      // Keep existing report object if detailed fetch fails
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedReport(null);
    setActionNotes('');
    setConfirmAction(null);
  };

  // Submit Review Status Change
  const handleExecuteStatusUpdate = async (newStatus: ToolReportStatus) => {
    if (!selectedReport) return;
    setActionSubmitting(true);
    setErrorBanner(null);

    try {
      const res = await apiClient.updateAdminToolReport(selectedReport.id, {
        status: newStatus,
        reviewNotes: actionNotes.trim(),
      });

      if (res && res.success) {
        setSuccessBanner(`Report '${selectedReport.id}' status updated to ${newStatus}.`);
        handleCloseDetail();
        fetchReports();
      } else {
        setErrorBanner(res?.error || 'Failed to update report status.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update report status.';
      setErrorBanner(msg);
    } finally {
      setActionSubmitting(false);
    }
  };

  const getCategoryLabel = (category: ReportCategory | string): string => {
    switch (category) {
      case 'PRICING_OUTDATED':
        return 'Outdated Pricing';
      case 'LINK_BROKEN':
        return 'Broken Link / 404';
      case 'TIER_INCORRECT':
        return 'Incorrect Market Tier';
      case 'CAPABILITY_CHANGED':
        return 'Capability Changed';
      case 'OTHER':
      default:
        return 'Other Outdated Info';
    }
  };

  const getStatusBadge = (status: ToolReportStatus | string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#fffbeb',
              color: '#b45309',
              border: '1px solid #fde68a',
            }}
          >
            <Clock size={12} />
            Pending Review
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#f0f9ff',
              color: '#0369a1',
              border: '1px solid #bae6fd',
            }}
          >
            <AlertTriangle size={12} />
            Under Review
          </span>
        );
      case 'RESOLVED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
            }}
          >
            <CheckCircle2 size={12} />
            Resolved
          </span>
        );
      case 'REJECTED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#fff1f2',
              color: '#9f1239',
              border: '1px solid #fecdd3',
            }}
          >
            <XCircle size={12} />
            Rejected
          </span>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getTierLabel = (tier?: number | null): string => {
    switch (tier) {
      case 1:
        return 'Tier 1 (Starter)';
      case 2:
        return 'Tier 2 (Growth)';
      case 3:
        return 'Tier 3 (Leading)';
      case 4:
        return 'Tier 4 (Enterprise)';
      default:
        return 'Unrated Tier';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Notifications */}
      {successBanner && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Check size={16} />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#065f46',
            }}
            aria-label="Dismiss success message"
          >
            ✕
          </button>
        </div>
      )}

      {errorBanner && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#9f1239',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorBanner}</span>
          </div>
          <button
            onClick={() => setErrorBanner(null)}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#9f1239',
            }}
            aria-label="Dismiss error message"
          >
            ✕
          </button>
        </div>
      )}

      {/* Metrics Dashboard */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
        }}
      >
        <Surface
          variant="bordered"
          padding="md"
          onClick={() => {
            setSelectedStatus('PENDING');
            setCurrentPage(1);
          }}
          style={{
            cursor: 'pointer',
            border:
              selectedStatus === 'PENDING'
                ? '2px solid #f59e0b'
                : '1px solid var(--aiims-border-subtle, #e2e8f0)',
            backgroundColor:
              selectedStatus === 'PENDING' ? '#fffbeb' : 'var(--aiims-bg-card, #ffffff)',
            borderRadius: '12px',
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
                fontSize: '12px',
                fontWeight: 700,
                color: '#b45309',
                textTransform: 'uppercase',
              }}
            >
              Pending Reports
            </span>
            <Clock size={18} color="#b45309" />
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading, #0f172a)',
            }}
          >
            {metrics.pending}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--aiims-text-secondary, #64748b)',
              marginTop: '4px',
            }}
          >
            Awaiting administrative review
          </div>
        </Surface>

        <Surface
          variant="bordered"
          padding="md"
          onClick={() => {
            setSelectedStatus('UNDER_REVIEW');
            setCurrentPage(1);
          }}
          style={{
            cursor: 'pointer',
            border:
              selectedStatus === 'UNDER_REVIEW'
                ? '2px solid #0284c7'
                : '1px solid var(--aiims-border-subtle, #e2e8f0)',
            backgroundColor:
              selectedStatus === 'UNDER_REVIEW' ? '#f0f9ff' : 'var(--aiims-bg-card, #ffffff)',
            borderRadius: '12px',
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
                fontSize: '12px',
                fontWeight: 700,
                color: '#0369a1',
                textTransform: 'uppercase',
              }}
            >
              Under Review
            </span>
            <AlertTriangle size={18} color="#0284c7" />
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading, #0f172a)',
            }}
          >
            {metrics.underReview}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--aiims-text-secondary, #64748b)',
              marginTop: '4px',
            }}
          >
            Investigation in progress
          </div>
        </Surface>

        <Surface
          variant="bordered"
          padding="md"
          onClick={() => {
            setSelectedStatus('RESOLVED');
            setCurrentPage(1);
          }}
          style={{
            cursor: 'pointer',
            border:
              selectedStatus === 'RESOLVED'
                ? '2px solid #10b981'
                : '1px solid var(--aiims-border-subtle, #e2e8f0)',
            backgroundColor:
              selectedStatus === 'RESOLVED' ? '#ecfdf5' : 'var(--aiims-bg-card, #ffffff)',
            borderRadius: '12px',
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
                fontSize: '12px',
                fontWeight: 700,
                color: '#065f46',
                textTransform: 'uppercase',
              }}
            >
              Resolved Reports
            </span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading, #0f172a)',
            }}
          >
            {metrics.resolved}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--aiims-text-secondary, #64748b)',
              marginTop: '4px',
            }}
          >
            Investigated & completed
          </div>
        </Surface>

        <Surface
          variant="bordered"
          padding="md"
          onClick={() => {
            setSelectedStatus('REJECTED');
            setCurrentPage(1);
          }}
          style={{
            cursor: 'pointer',
            border:
              selectedStatus === 'REJECTED'
                ? '2px solid #f43f5e'
                : '1px solid var(--aiims-border-subtle, #e2e8f0)',
            backgroundColor:
              selectedStatus === 'REJECTED' ? '#fff1f2' : 'var(--aiims-bg-card, #ffffff)',
            borderRadius: '12px',
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
                fontSize: '12px',
                fontWeight: 700,
                color: '#9f1239',
                textTransform: 'uppercase',
              }}
            >
              Rejected Reports
            </span>
            <XCircle size={18} color="#f43f5e" />
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading, #0f172a)',
            }}
          >
            {metrics.rejected}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--aiims-text-secondary, #64748b)',
              marginTop: '4px',
            }}
          >
            Dismissed or unverified claims
          </div>
        </Surface>
      </div>

      {/* Filters & Search Controls */}
      <Surface variant="bordered" padding="md" style={{ borderRadius: '12px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '10px',
              flex: 1,
            }}
          >
            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                minWidth: '220px',
                maxWidth: '340px',
                flex: 1,
              }}
            >
              <Search size={16} color="var(--aiims-text-secondary, #64748b)" />
              <input
                type="text"
                placeholder="Search tool or provider..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '13px',
                  width: '100%',
                  background: 'transparent',
                  color: 'var(--aiims-text-heading, #0f172a)',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#94a3b8',
                  }}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--aiims-text-secondary, #64748b)',
                  fontWeight: 600,
                }}
              >
                Status:
              </span>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                  backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--aiims-text-heading, #0f172a)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Statuses ({metrics.total})</option>
                <option value="PENDING">Pending ({metrics.pending})</option>
                <option value="UNDER_REVIEW">Under Review ({metrics.underReview})</option>
                <option value="RESOLVED">Resolved ({metrics.resolved})</option>
                <option value="REJECTED">Rejected ({metrics.rejected})</option>
              </select>
            </div>

            {/* Category Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--aiims-text-secondary, #64748b)',
                  fontWeight: 600,
                }}
              >
                Category:
              </span>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                  backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--aiims-text-heading, #0f172a)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Categories</option>
                <option value="PRICING_OUTDATED">Outdated Pricing</option>
                <option value="LINK_BROKEN">Broken Link / 404</option>
                <option value="TIER_INCORRECT">Incorrect Market Tier</option>
                <option value="CAPABILITY_CHANGED">Capability Changed</option>
                <option value="OTHER">Other Issue</option>
              </select>
            </div>

            {(selectedStatus !== 'ALL' || selectedCategory !== 'ALL' || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedStatus('ALL');
                  setSelectedCategory('ALL');
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
              >
                Reset Filters
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchReports}
            disabled={loading}
            icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </Surface>

      {/* Reports Table / List */}
      <Surface
        variant="bordered"
        padding="none"
        style={{ borderRadius: '12px', overflow: 'hidden' }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--aiims-border-subtle, #e2e8f0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading, #0f172a)',
              }}
            >
              Reported Outdated Tools
            </h2>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--aiims-text-secondary, #64748b)',
                marginTop: '2px',
              }}
            >
              Showing {reports.length} of {totalCount} reports matching filters
            </div>
          </div>
        </div>

        {loading && reports.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--aiims-text-secondary, #64748b)',
            }}
          >
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <div>Loading tool reports...</div>
          </div>
        ) : reports.length === 0 ? (
          <div
            style={{
              padding: '48px 20px',
              textAlign: 'center',
              color: 'var(--aiims-text-secondary, #64748b)',
            }}
          >
            <FileText size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <div
              style={{
                fontWeight: 700,
                fontSize: '15px',
                color: 'var(--aiims-text-heading, #0f172a)',
              }}
            >
              No Tool Reports Found
            </div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>
              {selectedStatus !== 'ALL' || selectedCategory !== 'ALL' || searchQuery
                ? 'Try adjusting your filters or search terms.'
                : 'No outdated tool reports have been submitted by learners.'}
            </div>
          </div>
        ) : (
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
                    backgroundColor: 'var(--aiims-bg-subtle, #f8fafc)',
                    borderBottom: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                  }}
                >
                  <th
                    style={{
                      padding: '12px 16px',
                      fontWeight: 700,
                      color: 'var(--aiims-text-secondary, #64748b)',
                    }}
                  >
                    Tool & Provider
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      fontWeight: 700,
                      color: 'var(--aiims-text-secondary, #64748b)',
                    }}
                  >
                    Report Category
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      fontWeight: 700,
                      color: 'var(--aiims-text-secondary, #64748b)',
                    }}
                  >
                    Submitted Date
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      fontWeight: 700,
                      color: 'var(--aiims-text-secondary, #64748b)',
                    }}
                  >
                    Current Status
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      fontWeight: 700,
                      color: 'var(--aiims-text-secondary, #64748b)',
                    }}
                  >
                    Reviewer Notes
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      fontWeight: 700,
                      textAlign: 'right',
                      color: 'var(--aiims-text-secondary, #64748b)',
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    style={{
                      borderBottom: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--aiims-text-heading, #0f172a)' }}>
                        {report.tool?.name || report.toolId}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--aiims-text-muted, #94a3b8)',
                          marginTop: '2px',
                        }}
                      >
                        {report.tool?.provider || 'Unknown Provider'} •{' '}
                        {getTierLabel(report.tool?.marketTier)}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: 'var(--aiims-bg-subtle, #f1f5f9)',
                          color: 'var(--aiims-text-secondary, #475569)',
                        }}
                      >
                        {getCategoryLabel(report.reportCategory)}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        color: 'var(--aiims-text-secondary, #64748b)',
                        fontSize: '12px',
                      }}
                    >
                      {new Date(report.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td style={{ padding: '14px 16px' }}>{getStatusBadge(report.status)}</td>
                    <td style={{ padding: '14px 16px', maxWidth: '240px' }}>
                      {report.reviewNotes ? (
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--aiims-text-secondary, #64748b)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={report.reviewNotes}
                        >
                          {report.reviewNotes}
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: '12px',
                            color: 'var(--aiims-text-muted, #94a3b8)',
                            fontStyle: 'italic',
                          }}
                        >
                          No review notes
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenDetail(report)}
                        icon={<Eye size={14} />}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--aiims-border-subtle, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: 'var(--aiims-text-secondary, #64748b)',
            }}
          >
            <div>
              Page {currentPage} of {totalPages}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || loading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Surface>

      {/* Detail & Review Modal */}
      {selectedReport && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box',
          }}
          onClick={handleCloseDetail}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--aiims-bg-card, #ffffff)',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--aiims-shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1))',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '18px',
                      fontWeight: 800,
                      color: 'var(--aiims-text-heading, #0f172a)',
                    }}
                  >
                    Review Report: {selectedReport.tool?.name || selectedReport.toolId}
                  </h3>
                  {getStatusBadge(selectedReport.status)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--aiims-text-secondary, #64748b)' }}>
                  Report ID: <code style={{ fontSize: '11px' }}>{selectedReport.id}</code> •
                  Submitted on {new Date(selectedReport.createdAt).toLocaleString()}
                </div>
              </div>
              <button
                onClick={handleCloseDetail}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  color: 'var(--aiims-text-secondary, #64748b)',
                }}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              {/* Category & Learner Description */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--aiims-bg-subtle, #f8fafc)',
                  border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}
                >
                  <Tag size={14} color="#64748b" />
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--aiims-text-heading, #0f172a)',
                    }}
                  >
                    Issue Category: {getCategoryLabel(selectedReport.reportCategory)}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--aiims-text-heading, #1e293b)',
                    lineHeight: '1.5',
                  }}
                >
                  {selectedReport.description}
                </div>
                {selectedReport.sourceUrl && (
                  <div
                    style={{
                      marginTop: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                    }}
                  >
                    <span
                      style={{ color: 'var(--aiims-text-secondary, #64748b)', fontWeight: 600 }}
                    >
                      Source URL:
                    </span>
                    <a
                      href={selectedReport.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: 'var(--aiims-accent-primary, #5b4bff)',
                        textDecoration: 'underline',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {selectedReport.sourceUrl}
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>

              {/* Associated Catalog Tool Context */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                  backgroundColor: '#ffffff',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-secondary, #64748b)',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}
                >
                  Associated Catalog Tool Information
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    fontSize: '13px',
                  }}
                >
                  <div>
                    <span
                      style={{
                        color: 'var(--aiims-text-muted, #94a3b8)',
                        fontSize: '11px',
                        display: 'block',
                      }}
                    >
                      Provider
                    </span>
                    <strong>{selectedReport.tool?.provider || 'Unknown'}</strong>
                  </div>
                  <div>
                    <span
                      style={{
                        color: 'var(--aiims-text-muted, #94a3b8)',
                        fontSize: '11px',
                        display: 'block',
                      }}
                    >
                      Market Tier
                    </span>
                    <strong>{getTierLabel(selectedReport.tool?.marketTier)}</strong>
                  </div>
                  <div>
                    <span
                      style={{
                        color: 'var(--aiims-text-muted, #94a3b8)',
                        fontSize: '11px',
                        display: 'block',
                      }}
                    >
                      Primary Category
                    </span>
                    <span>{selectedReport.tool?.category || 'General AI'}</span>
                  </div>
                  <div>
                    <span
                      style={{
                        color: 'var(--aiims-text-muted, #94a3b8)',
                        fontSize: '11px',
                        display: 'block',
                      }}
                    >
                      Website
                    </span>
                    {selectedReport.tool?.officialWebsite ? (
                      <a
                        href={selectedReport.tool.officialWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: 'var(--aiims-accent-primary, #5b4bff)',
                          textDecoration: 'underline',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        Visit Website <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span style={{ color: 'var(--aiims-text-muted, #94a3b8)' }}>
                        Not specified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Catalog Safeguard Banner */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontSize: '12px',
                  lineHeight: '1.4',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                }}
              >
                <ShieldCheck
                  size={16}
                  color="#0284c7"
                  style={{ flexShrink: 0, marginTop: '2px' }}
                />
                <div>
                  <strong>Catalog Quality Safeguard:</strong> Resolving or rejecting a report
                  records your QA review decision. It does <em>not</em> automatically change catalog
                  prices, tiers, or descriptions. Verified catalog updates must follow the
                  authorized catalog update process.
                </div>
              </div>

              {/* Reviewer Notes Input */}
              <div>
                <label
                  htmlFor="admin-qa-review-notes"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-heading, #0f172a)',
                    marginBottom: '6px',
                  }}
                >
                  Reviewer Notes & Investigation Findings:
                </label>
                <textarea
                  id="admin-qa-review-notes"
                  rows={3}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Record your investigation findings, vendor verification notes, or reason for decision..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                  maxLength={2000}
                />
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--aiims-text-muted, #94a3b8)',
                    textAlign: 'right',
                    marginTop: '2px',
                  }}
                >
                  {actionNotes.length} / 2000 characters
                </div>
              </div>

              {/* Confirmation Prompt when executing consequential actions */}
              {confirmAction && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: confirmAction === 'RESOLVED' ? '#ecfdf5' : '#fff1f2',
                    border: `1px solid ${confirmAction === 'RESOLVED' ? '#a7f3d0' : '#fecdd3'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: confirmAction === 'RESOLVED' ? '#065f46' : '#9f1239',
                    }}
                  >
                    Confirm Action: Mark report as {confirmAction}?
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: confirmAction === 'RESOLVED' ? '#065f46' : '#9f1239',
                    }}
                  >
                    {confirmAction === 'RESOLVED'
                      ? 'This confirms the reported information was investigated and verified. The report will be marked as RESOLVED.'
                      : 'This marks the report as REJECTED. The reported claim will be recorded as invalid or dismissed.'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <Button
                      variant={confirmAction === 'RESOLVED' ? 'primary' : 'outline'}
                      size="sm"
                      disabled={actionSubmitting}
                      onClick={() => handleExecuteStatusUpdate(confirmAction)}
                    >
                      {actionSubmitting ? 'Submitting...' : `Yes, Mark as ${confirmAction}`}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={actionSubmitting}
                      onClick={() => setConfirmAction(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                backgroundColor: 'var(--aiims-bg-subtle, #f8fafc)',
                borderBottomLeftRadius: '16px',
                borderBottomRightRadius: '16px',
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseDetail}
                disabled={actionSubmitting}
              >
                Close
              </Button>

              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedReport.status !== 'UNDER_REVIEW' && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionSubmitting}
                    onClick={() => handleExecuteStatusUpdate('UNDER_REVIEW')}
                    icon={<Clock size={14} />}
                  >
                    Mark Under Review
                  </Button>
                )}

                {selectedReport.status !== 'RESOLVED' && (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={actionSubmitting}
                    onClick={() => setConfirmAction('RESOLVED')}
                    icon={<CheckCircle2 size={14} />}
                  >
                    Resolve Report
                  </Button>
                )}

                {selectedReport.status !== 'REJECTED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionSubmitting}
                    onClick={() => setConfirmAction('REJECTED')}
                    icon={<XCircle size={14} />}
                  >
                    Reject Report
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
