import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  BookOpen,
  BarChart2,
  ShieldCheck,
  Trash2,
  Edit2,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { EvaluatorItem, TaskItem, AuditLogItem, AdminSummaryMetrics } from '../../types';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

type AdminTab = 'reports' | 'evaluators' | 'tasks' | 'audit';

export const AdminDashboardScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('reports');
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // 1. Reports Data
  const [reports, setReports] = useState<AdminSummaryMetrics | null>(null);

  // 2. Evaluators Data
  const [evaluators, setEvaluators] = useState<EvaluatorItem[]>([]);
  const [showCreateEvalModal, setShowCreateEvalModal] = useState(false);
  const [evalName, setEvalName] = useState('');
  const [evalEmail, setEvalEmail] = useState('');
  const [evalTempPassword, setEvalTempPassword] = useState('');
  const [createdInviteInfo, setCreatedInviteInfo] = useState<{
    temporaryPassword?: string;
    setPasswordUrl?: string;
  } | null>(null);

  // 3. Tasks Data
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskFormId, setTaskFormId] = useState('');
  const [taskFormTitle, setTaskFormTitle] = useState('');
  const [taskFormDesc, setTaskFormDesc] = useState('');
  const [taskFormCategory, setTaskFormCategory] = useState('General AI');
  const [taskFormLevel, setTaskFormLevel] = useState(1);

  // 4. Audit Logs Data
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditFilterAction, setAuditFilterAction] = useState('ALL');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  // Fetch data depending on active tab
  const fetchData = async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      if (activeTab === 'reports') {
        const res = await apiClient.getAdminSummaryReport();
        if (res && res.success && res.summary) {
          setReports(res.summary);
        }
      } else if (activeTab === 'evaluators') {
        const res = await apiClient.getEvaluators();
        if (res && res.success && Array.isArray(res.evaluators)) {
          setEvaluators(res.evaluators);
        }
      } else if (activeTab === 'tasks') {
        const res = await apiClient.getAdminTasks();
        if (res && res.success && Array.isArray(res.tasks)) {
          setTasks(res.tasks);
        }
      } else if (activeTab === 'audit') {
        const res = await apiClient.getAdminAuditLogs({ limit: 100 });
        if (res && res.success && Array.isArray(res.auditLogs)) {
          setAuditLogs(res.auditLogs);
        }
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to fetch admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Evaluator Actions
  const handleCreateEvaluator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalName.trim() || !evalEmail.trim()) {
      setErrorBanner('Name and email are required.');
      return;
    }

    try {
      const res = await apiClient.createEvaluator({
        name: evalName.trim(),
        email: evalEmail.trim(),
        password: evalTempPassword.trim() || undefined,
      });

      if (res && res.success) {
        setSuccessBanner(`Evaluator ${res.evaluator?.name} invited successfully!`);
        setCreatedInviteInfo(res.invite || null);
        setEvalName('');
        setEvalEmail('');
        setEvalTempPassword('');
        const updated = await apiClient.getEvaluators();
        if (updated?.evaluators) setEvaluators(updated.evaluators);
      } else {
        setErrorBanner(res?.error || 'Failed to create evaluator.');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to create evaluator.');
    }
  };

  const handleToggleEvaluatorStatus = async (evaluator: EvaluatorItem) => {
    const evalId = evaluator.id || evaluator._id;
    if (!evalId) return;
    try {
      const newStatus = !evaluator.isActive;
      const res = await apiClient.updateEvaluatorStatus(evalId, newStatus);
      if (res && res.success) {
        setSuccessBanner(`Evaluator status updated to ${newStatus ? 'Active' : 'Disabled'}.`);
        setEvaluators((prev) =>
          prev.map((e) => ((e.id || e._id) === evalId ? { ...e, isActive: newStatus } : e))
        );
      } else {
        setErrorBanner(res?.error || 'Failed to update evaluator status.');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to update evaluator status.');
    }
  };

  // Task Actions
  const openCreateTaskModal = () => {
    setEditingTaskId(null);
    setTaskFormId(`task-${Date.now().toString().slice(-4)}`);
    setTaskFormTitle('');
    setTaskFormDesc('');
    setTaskFormCategory('Prompt Engineering');
    setTaskFormLevel(1);
    setShowTaskModal(true);
  };

  const openEditTaskModal = (task: TaskItem) => {
    setEditingTaskId(task.taskId || task.id || task._id || null);
    setTaskFormId(task.taskId);
    setTaskFormTitle(task.title);
    setTaskFormDesc(task.description);
    setTaskFormCategory(task.category || 'General AI');
    setTaskFormLevel(task.level || 1);
    setShowTaskModal(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskFormTitle.trim() || !taskFormDesc.trim()) {
      setErrorBanner('Title and description are required.');
      return;
    }

    try {
      if (editingTaskId) {
        const res = await apiClient.updateAdminTask(editingTaskId, {
          title: taskFormTitle.trim(),
          description: taskFormDesc.trim(),
          category: taskFormCategory,
          level: Number(taskFormLevel),
        });
        if (res && res.success) {
          setSuccessBanner('Task updated successfully.');
          setShowTaskModal(false);
          const updated = await apiClient.getAdminTasks();
          if (updated?.tasks) setTasks(updated.tasks);
        } else {
          setErrorBanner(res?.error || 'Failed to update task.');
        }
      } else {
        const res = await apiClient.createAdminTask({
          taskId: taskFormId.trim(),
          title: taskFormTitle.trim(),
          description: taskFormDesc.trim(),
          category: taskFormCategory,
          level: Number(taskFormLevel),
        });
        if (res && res.success) {
          setSuccessBanner('Task created successfully.');
          setShowTaskModal(false);
          const updated = await apiClient.getAdminTasks();
          if (updated?.tasks) setTasks(updated.tasks);
        } else {
          setErrorBanner(res?.error || 'Failed to create task.');
        }
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to save task.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm(`Are you sure you want to delete task "${taskId}"?`)) return;
    try {
      const res = await apiClient.deleteAdminTask(taskId);
      if (res && res.success) {
        setSuccessBanner('Task deleted successfully.');
        setTasks((prev) =>
          prev.filter((t) => t.taskId !== taskId && t.id !== taskId && t._id !== taskId)
        );
      } else {
        setErrorBanner(res?.error || 'Failed to delete task.');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to delete task.');
    }
  };

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditFilterAction !== 'ALL' && log.action !== auditFilterAction) {
      return false;
    }
    if (auditSearchQuery.trim()) {
      const q = auditSearchQuery.toLowerCase();
      const matchActor = (log.actorName || '').toLowerCase().includes(q);
      const matchAction = (log.action || '').toLowerCase().includes(q);
      const matchTarget = (log.target || '').toLowerCase().includes(q);
      return matchActor || matchAction || matchTarget;
    }
    return true;
  });

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
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1
            style={{
              margin: '0 0 4px',
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading, #0f172a)',
              letterSpacing: '-0.5px',
            }}
          >
            Admin Administration Console
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: 'var(--aiims-text-secondary, #64748b)',
            }}
          >
            Manage evaluators, configure tasks, view evaluation analytics, and audit security
            events.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Notifications */}
      {successBanner && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: 'var(--aiims-mint-subtle, #d1fae5)',
            border: '1px solid var(--aiims-mint-border, #a7f3d0)',
            color: 'var(--aiims-mint-text, #065f46)',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px' }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorBanner}</span>
          </div>
          <button
            onClick={() => setErrorBanner(null)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--aiims-border-subtle, #e2e8f0)',
          marginBottom: '20px',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom:
              activeTab === 'reports'
                ? '3px solid var(--aiims-sky-solid, #0284c7)'
                : '3px solid transparent',
            color:
              activeTab === 'reports'
                ? 'var(--aiims-sky-text, #0369a1)'
                : 'var(--aiims-text-secondary, #64748b)',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <BarChart2 size={16} />
          Reports & Analytics
        </button>

        <button
          onClick={() => setActiveTab('evaluators')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom:
              activeTab === 'evaluators'
                ? '3px solid var(--aiims-mint-solid, #059669)'
                : '3px solid transparent',
            color:
              activeTab === 'evaluators'
                ? 'var(--aiims-mint-text, #065f46)'
                : 'var(--aiims-text-secondary, #64748b)',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Users size={16} />
          Evaluators
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom:
              activeTab === 'tasks'
                ? '3px solid var(--aiims-lavender-solid, #7c3aed)'
                : '3px solid transparent',
            color:
              activeTab === 'tasks'
                ? 'var(--aiims-lavender-text, #5b21b6)'
                : 'var(--aiims-text-secondary, #64748b)',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <BookOpen size={16} />
          Task Catalog
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom:
              activeTab === 'audit'
                ? '3px solid var(--aiims-coral-solid, #e11d48)'
                : '3px solid transparent',
            color:
              activeTab === 'audit'
                ? 'var(--aiims-coral-text, #9f1239)'
                : 'var(--aiims-text-secondary, #64748b)',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <ShieldCheck size={16} />
          Audit Logs
        </button>
      </div>

      {/* TAB 1: REPORTS */}
      {activeTab === 'reports' && (
        <div>
          {reports ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Metric Cards Row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '14px',
                }}
              >
                <Surface variant="sky" radius="lg" padding="md">
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--aiims-sky-text, #0369a1)',
                      marginBottom: '4px',
                    }}
                  >
                    TOTAL SUBMISSIONS
                  </div>
                  <div
                    style={{
                      fontSize: '28px',
                      fontWeight: 800,
                      color: 'var(--aiims-text-heading, #0f172a)',
                    }}
                  >
                    {reports.metrics.totalSubmissions}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--aiims-text-secondary, #64748b)',
                      marginTop: '4px',
                    }}
                  >
                    All-time recorded task submissions
                  </div>
                </Surface>

                <Surface variant="mint" radius="lg" padding="md">
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--aiims-mint-text, #065f46)',
                      marginBottom: '4px',
                    }}
                  >
                    REVIEWED & GRADED
                  </div>
                  <div
                    style={{
                      fontSize: '28px',
                      fontWeight: 800,
                      color: 'var(--aiims-text-heading, #0f172a)',
                    }}
                  >
                    {reports.metrics.reviewedCount}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--aiims-text-secondary, #64748b)',
                      marginTop: '4px',
                    }}
                  >
                    Completed evaluator assessments
                  </div>
                </Surface>

                <Surface variant="sunshine" radius="lg" padding="md">
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--aiims-sunshine-text, #b45309)',
                      marginBottom: '4px',
                    }}
                  >
                    PENDING IN QUEUE
                  </div>
                  <div
                    style={{
                      fontSize: '28px',
                      fontWeight: 800,
                      color: 'var(--aiims-text-heading, #0f172a)',
                    }}
                  >
                    {reports.metrics.pendingReviewCount}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--aiims-text-secondary, #64748b)',
                      marginTop: '4px',
                    }}
                  >
                    Submitted + In Review tasks
                  </div>
                </Surface>

                <Surface variant="lavender" radius="lg" padding="md">
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--aiims-lavender-text, #5b21b6)',
                      marginBottom: '4px',
                    }}
                  >
                    AVERAGE REVIEW TIME
                  </div>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 800,
                      color: 'var(--aiims-text-heading, #0f172a)',
                    }}
                  >
                    {reports.metrics.averageReviewTimeFormatted || '0s'}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--aiims-text-secondary, #64748b)',
                      marginTop: '4px',
                    }}
                  >
                    Submission to evaluation completed
                  </div>
                </Surface>
              </div>

              {/* Status Breakdown Table */}
              <Surface variant="bordered" radius="lg" padding="lg">
                <h2
                  style={{
                    margin: '0 0 16px',
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading, #0f172a)',
                  }}
                >
                  Submission Counts by Status
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--aiims-bg-subtle, #f8fafc)',
                      border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7' }}>
                      Submitted
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800 }}>
                      {reports.statusCounts.submitted}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--aiims-bg-subtle, #f8fafc)',
                      border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#d97706' }}>
                      In Review
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800 }}>
                      {reports.statusCounts.in_review}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--aiims-bg-subtle, #f8fafc)',
                      border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#7c3aed' }}>
                      Feedback Given
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800 }}>
                      {reports.statusCounts.feedback_given}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--aiims-bg-subtle, #f8fafc)',
                      border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#e11d48' }}>
                      Revision Requested
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800 }}>
                      {reports.statusCounts.revision_requested}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--aiims-bg-subtle, #f8fafc)',
                      border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#059669' }}>
                      Accepted
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800 }}>
                      {reports.statusCounts.accepted}
                    </div>
                  </div>
                </div>
              </Surface>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--aiims-text-muted)' }}>
              Loading summary reports...
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EVALUATORS */}
      {activeTab === 'evaluators' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Action */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800 }}>
                AIIMS Evaluator Panel ({evaluators.length})
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: 'var(--aiims-text-secondary, #64748b)',
                }}
              >
                Evaluators have permissions to review submissions, assign rubric scores, and request
                revisions.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setShowCreateEvalModal(!showCreateEvalModal);
                setCreatedInviteInfo(null);
              }}
              icon={<Plus size={15} />}
            >
              Invite Evaluator
            </Button>
          </div>

          {/* Create Evaluator Drawer/Modal */}
          {showCreateEvalModal && (
            <Surface variant="mint" radius="lg" padding="lg">
              <h3
                style={{
                  margin: '0 0 12px',
                  fontSize: '16px',
                  fontWeight: 800,
                  color: 'var(--aiims-mint-text, #065f46)',
                }}
              >
                Provision New Evaluator Account
              </h3>
              <form onSubmit={handleCreateEvaluator}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '14px',
                    marginBottom: '16px',
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 700,
                        marginBottom: '4px',
                      }}
                    >
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Dr. Eleanor Vance"
                      value={evalName}
                      onChange={(e) => setEvalName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--aiims-border-card)',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 700,
                        marginBottom: '4px',
                      }}
                    >
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="evaluator@aiims.edu"
                      value={evalEmail}
                      onChange={(e) => setEvalEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--aiims-border-card)',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 700,
                        marginBottom: '4px',
                      }}
                    >
                      Temporary Password (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Leave blank for auto-generated"
                      value={evalTempPassword}
                      onChange={(e) => setEvalTempPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--aiims-border-card)',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button variant="primary" size="sm" type="submit">
                    Send Invite & Provision Account
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setShowCreateEvalModal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>

              {/* Created Invite Notice */}
              {createdInviteInfo && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--aiims-bg-card)',
                    border: '1px solid var(--aiims-mint-border)',
                  }}
                >
                  <div
                    style={{ fontSize: '13px', fontWeight: 800, color: 'var(--aiims-mint-text)' }}
                  >
                    ✓ Evaluator Credentials Generated
                  </div>
                  {createdInviteInfo.temporaryPassword && (
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>
                      Temporary Password: <code>{createdInviteInfo.temporaryPassword}</code>
                    </div>
                  )}
                  {createdInviteInfo.setPasswordUrl && (
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>
                      Set-Password Link: <code>{createdInviteInfo.setPasswordUrl}</code>
                    </div>
                  )}
                </div>
              )}
            </Surface>
          )}

          {/* Evaluator List Table */}
          <Surface variant="bordered" radius="lg" padding="none" style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '14px',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--aiims-bg-subtle, #f8fafc)',
                    borderBottom: '1px solid var(--aiims-border-subtle)',
                  }}
                >
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Evaluator</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Email</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Must Change Password</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {evaluators.map((evaluator) => {
                  const evalId = evaluator.id || evaluator._id || '';
                  return (
                    <tr
                      key={evalId}
                      style={{ borderBottom: '1px solid var(--aiims-border-subtle)' }}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 700 }}>{evaluator.name}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--aiims-text-secondary)' }}>
                        {evaluator.email}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <Badge variant={evaluator.isActive ? 'success' : 'warning'}>
                          {evaluator.isActive ? 'Active' : 'Disabled'}
                        </Badge>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--aiims-text-muted)' }}>
                        {evaluator.mustChangePassword ? 'Yes (Pending)' : 'No'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <Button
                          variant={evaluator.isActive ? 'outline' : 'primary'}
                          size="sm"
                          onClick={() => handleToggleEvaluatorStatus(evaluator)}
                        >
                          {evaluator.isActive ? 'Disable Evaluator' : 'Enable Evaluator'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Surface>
        </div>
      )}

      {/* TAB 3: TASKS */}
      {activeTab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800 }}>
                Task Catalog Management ({tasks.length})
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: 'var(--aiims-text-secondary, #64748b)',
                }}
              >
                Manage interactive tasks evaluated by mentors and peer evaluators.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={openCreateTaskModal}
              icon={<Plus size={15} />}
            >
              Create New Task
            </Button>
          </div>

          {/* Task Modal / Form */}
          {showTaskModal && (
            <Surface variant="lavender" radius="lg" padding="lg">
              <h3
                style={{
                  margin: '0 0 14px',
                  fontSize: '16px',
                  fontWeight: 800,
                  color: 'var(--aiims-lavender-text, #5b21b6)',
                }}
              >
                {editingTaskId ? `Edit Task (${taskFormId})` : 'Create New AI Task'}
              </h3>
              <form onSubmit={handleSaveTask}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '14px',
                    marginBottom: '14px',
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 700,
                        marginBottom: '4px',
                      }}
                    >
                      Task Identifier (slug) *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!!editingTaskId}
                      value={taskFormId}
                      onChange={(e) => setTaskFormId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--aiims-border-card)',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 700,
                        marginBottom: '4px',
                      }}
                    >
                      Task Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={taskFormTitle}
                      onChange={(e) => setTaskFormTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--aiims-border-card)',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 700,
                        marginBottom: '4px',
                      }}
                    >
                      Category
                    </label>
                    <input
                      type="text"
                      value={taskFormCategory}
                      onChange={(e) => setTaskFormCategory(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--aiims-border-card)',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 700,
                        marginBottom: '4px',
                      }}
                    >
                      Level (1 to 4)
                    </label>
                    <select
                      value={taskFormLevel}
                      onChange={(e) => setTaskFormLevel(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--aiims-border-card)',
                        boxSizing: 'border-box',
                        backgroundColor: 'var(--aiims-bg-card)',
                      }}
                    >
                      <option value={1}>Level 1 - Knowing</option>
                      <option value={2}>Level 2 - Understanding</option>
                      <option value={3}>Level 3 - Applying</option>
                      <option value={4}>Level 4 - Adapting</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 700,
                      marginBottom: '4px',
                    }}
                  >
                    Task Instructions & Rubric Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={taskFormDesc}
                    onChange={(e) => setTaskFormDesc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--aiims-border-card)',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button variant="primary" size="sm" type="submit">
                    Save Task
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setShowTaskModal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Surface>
          )}

          {/* Task Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '14px',
            }}
          >
            {tasks.map((task) => (
              <Surface key={task.taskId} variant="bordered" radius="lg" padding="md">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px',
                  }}
                >
                  <div>
                    <Badge variant="primary">Level {task.level}</Badge>
                    <span
                      style={{
                        marginLeft: '8px',
                        fontSize: '12px',
                        color: 'var(--aiims-text-muted)',
                      }}
                    >
                      {task.category}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditTaskModal(task)}
                      icon={<Edit2 size={13} />}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTask(task.taskId)}
                      icon={<Trash2 size={13} color="#e11d48" />}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800 }}>
                  {task.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: 'var(--aiims-text-secondary)',
                    lineHeight: 1.4,
                  }}
                >
                  {task.description}
                </p>
                <div
                  style={{ marginTop: '10px', fontSize: '11px', color: 'var(--aiims-text-muted)' }}
                >
                  ID: <code>{task.taskId}</code>
                </div>
              </Surface>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filter Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--aiims-text-muted)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search actor, action, target..."
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  style={{
                    padding: '8px 12px 8px 30px',
                    borderRadius: '6px',
                    border: '1px solid var(--aiims-border-card)',
                    fontSize: '13px',
                    width: '220px',
                  }}
                />
              </div>

              <select
                value={auditFilterAction}
                onChange={(e) => setAuditFilterAction(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--aiims-border-card)',
                  fontSize: '13px',
                  backgroundColor: 'var(--aiims-bg-card)',
                }}
              >
                <option value="ALL">All Actions</option>
                <option value="CREATE_EVALUATOR">CREATE_EVALUATOR</option>
                <option value="STATUS_CHANGE">STATUS_CHANGE</option>
                <option value="CLAIM_SUBMISSION">CLAIM_SUBMISSION</option>
                <option value="REVIEW_SUBMISSION">REVIEW_SUBMISSION</option>
                <option value="CREATE_TASK">CREATE_TASK</option>
                <option value="UPDATE_TASK">UPDATE_TASK</option>
                <option value="DELETE_TASK">DELETE_TASK</option>
              </select>
            </div>

            <span style={{ fontSize: '13px', color: 'var(--aiims-text-secondary)' }}>
              Showing {filteredAuditLogs.length} events
            </span>
          </div>

          {/* Audit Log Table */}
          <Surface variant="bordered" radius="lg" padding="none" style={{ overflowX: 'auto' }}>
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
                    borderBottom: '1px solid var(--aiims-border-subtle)',
                  }}
                >
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Time</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Actor</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Action</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Target</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: '24px',
                        textAlign: 'center',
                        color: 'var(--aiims-text-muted)',
                      }}
                    >
                      No audit events matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((log, idx) => (
                    <tr
                      key={log.id || log._id || idx}
                      style={{ borderBottom: '1px solid var(--aiims-border-subtle)' }}
                    >
                      <td
                        style={{
                          padding: '12px 14px',
                          color: 'var(--aiims-text-secondary)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {new Date(log.time).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <strong>{log.actorName || String(log.actor)}</strong>
                        <span
                          style={{
                            display: 'block',
                            fontSize: '11px',
                            color: 'var(--aiims-text-muted)',
                          }}
                        >
                          {log.actorRole}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <Badge variant="primary">{log.action}</Badge>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--aiims-text-secondary)' }}>
                        {log.target || '—'}
                      </td>
                      <td
                        style={{
                          padding: '12px 14px',
                          fontSize: '12px',
                          color: 'var(--aiims-text-body)',
                        }}
                      >
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Surface>
        </div>
      )}
    </div>
  );
};
