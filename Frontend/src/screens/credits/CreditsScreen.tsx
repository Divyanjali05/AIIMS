import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { useLearner } from '../../context/LearnerContext';
import { useTheme } from '../../context/ThemeContext';
import { apiClient } from '../../api/client';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  Info,
  X,
  FileText,
  Award,
  BookOpen,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

export interface LedgerItem {
  id: string;
  type: 'EARN' | 'SPEND' | 'REFUND' | 'ADJUSTMENT';
  category?: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  source: string;
  sourceId?: string;
  idempotencyKey?: string;
  status: 'COMPLETED' | 'PENDING' | 'REVERSED' | 'FAILED';
  relatedTaskId?: string;
  createdAt: string;
}

export const CreditsScreen: React.FC = () => {
  const { state } = useLearner();
  const { isDarkMode } = useTheme();
  const [selectedTx, setSelectedTx] = useState<LedgerItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'EARN' | 'SPEND' | 'REFUND'>('ALL');
  const [ledgerTxs, setLedgerTxs] = useState<LedgerItem[]>([]);
  const [stats, setStats] = useState({
    balance: state.credits.balance || 100,
    totalEarned: 0,
    totalSpent: 0,
    totalRefunded: 0
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [auditReport, setAuditReport] = useState<{
    isReconciled: boolean;
    currentBalance: number;
    calculatedBalance: number;
    discrepancy: number;
    entriesCount: number;
  } | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const runAudit = async () => {
    setIsAuditing(true);
    try {
      const report = await apiClient.getCreditsReconciliation();
      if (report) {
        setAuditReport(report);
        setShowAuditModal(true);
      }
    } catch (e: any) {
      console.error('Audit failed:', e);
    } finally {
      setIsAuditing(false);
    }
  };

  const fetchLedger = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const res = await apiClient.getCreditsLedger();
      if (res && Array.isArray(res.transactions)) {
        setLedgerTxs(res.transactions);
        setStats({
          balance: typeof res.balance === 'number' ? res.balance : state.credits.balance,
          totalEarned: res.totalEarned ?? 0,
          totalSpent: res.totalSpent ?? 0,
          totalRefunded: res.totalRefunded ?? 0
        });
      } else {
        // Fallback to state.credits if API returns legacy shape
        const fallbackList: LedgerItem[] = (state.credits.transactions || []).map((t: any) => ({
          id: t.id,
          type: (t.type === 'SPEND' ? 'SPEND' : 'EARN') as any,
          category: t.transactionType || 'REWARD',
          amount: t.amount,
          balanceBefore: t.previousBalance ?? 0,
          balanceAfter: t.newBalance ?? 0,
          reason: t.description,
          source: t.source || 'SYSTEM',
          sourceId: t.sourceId,
          status: 'COMPLETED',
          createdAt: t.timestamp
        }));
        setLedgerTxs(fallbackList);
        setStats({
          balance: state.credits.balance,
          totalEarned: fallbackList.filter(t => t.type === 'EARN').reduce((s, c) => s + c.amount, 0),
          totalSpent: fallbackList.filter(t => t.type === 'SPEND').reduce((s, c) => s + c.amount, 0),
          totalRefunded: 0
        });
      }
    } catch (err: any) {
      console.warn('Failed to load server-authoritative ledger, falling back to cached state:', err);
      // Populate from learner state cache
      const fallbackList: LedgerItem[] = (state.credits.transactions || []).map((t: any) => ({
        id: t.id,
        type: (t.type === 'SPEND' ? 'SPEND' : 'EARN') as any,
        category: t.transactionType || 'REWARD',
        amount: t.amount,
        balanceBefore: t.previousBalance ?? 0,
        balanceAfter: t.newBalance ?? 0,
        reason: t.description,
        source: t.source || 'SYSTEM',
        sourceId: t.sourceId,
        status: 'COMPLETED',
        createdAt: t.timestamp
      }));
      setLedgerTxs(fallbackList);
      setStats({
        balance: state.credits.balance,
        totalEarned: fallbackList.filter(t => t.type === 'EARN').reduce((s, c) => s + c.amount, 0),
        totalSpent: fallbackList.filter(t => t.type === 'SPEND').reduce((s, c) => s + c.amount, 0),
        totalRefunded: 0
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [state.credits.balance, state.credits.transactions]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const filteredTransactions = ledgerTxs.filter((tx) => {
    if (activeFilter === 'ALL') return true;
    return tx.type === activeFilter;
  });

  return (
    <div style={{ maxWidth: '940px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--aiims-grid-gap, 20px)' }}>

      {/* PAGE HEADER */}
      <PageHeader
        icon={<Award size={24} />}
        title="YOUR AIIMS CREDITS & LEDGER"
        description="Server-authoritative credits ledger recognizing meaningful learning progress, diagnostic completion, and automated task compensation."
      />

      {/* CREDITS DISPLAY ANCHOR CARD */}
      <Card
        variant="bordered"
        radius="default"
        padding="default"
        style={{
          background: isDarkMode
            ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, rgba(30, 41, 59, 0.8) 70%, rgba(16, 185, 129, 0.12) 100%)'
            : 'linear-gradient(135deg, #fffbeb 0%, #ffffff 70%, #ecfdf5 100%)',
          borderLeft: '6px solid #d97706'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} /> AUTHORITATIVE SERVER-VERIFIED BALANCE
            </div>

            <div style={{ fontSize: '38px', fontWeight: 800, color: 'var(--aiims-text-primary, #0f172a)', margin: '4px 0', fontFamily: "'Fredoka', sans-serif", lineHeight: 1.1 }}>
              {stats.balance} <span style={{ fontSize: '18px', color: '#d97706', fontWeight: 700 }}>AIIMS Credits</span>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: 'var(--aiims-text-secondary, #64748b)', fontWeight: 500 }}>
              Credits are governed by atomic conditional checks, duplicate idempotency keys, and automated compensation.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => fetchLedger(true)}
              disabled={isRefreshing}
              title="Refresh Authoritative Balance"
              style={{
                background: 'var(--aiims-bg-card, #ffffff)',
                border: '1px solid var(--aiims-border-card, #e2e8f0)',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--aiims-text-secondary, #475569)',
                transition: 'all 0.15s ease'
              }}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Syncing...' : 'Sync Balance'}
            </button>

            <button
              onClick={runAudit}
              disabled={isAuditing}
              title="Audit and Reconcile Ledger"
              style={{
                background: 'var(--aiims-bg-card, #ffffff)',
                border: '1px solid var(--aiims-border-card, #cbd5e1)',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--aiims-text-primary, #334155)',
                transition: 'all 0.15s ease'
              }}
            >
              <ShieldCheck size={14} style={{ color: '#2563eb' }} />
              {isAuditing ? 'Auditing...' : 'Audit Ledger'}
            </button>

            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--aiims-card-radius, 12px)',
              backgroundColor: isDarkMode ? 'rgba(217, 119, 6, 0.2)' : '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: isDarkMode ? '1px solid rgba(217, 119, 6, 0.35)' : '1px solid #fde68a',
              flexShrink: 0
            }}>
              <Coins style={{ width: '28px', height: '28px', color: '#d97706' }} />
            </div>
          </div>
        </div>
      </Card>

      {/* METRICS ROW */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        <div style={{
          padding: '14px 16px',
          backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.12)' : '#f0fdf4',
          borderRadius: '12px',
          border: isDarkMode ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid #bbf7d0'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: isDarkMode ? '#4ade80' : '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Earned
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: isDarkMode ? '#86efac' : '#15803d', fontFamily: "'Fredoka', sans-serif", margin: '2px 0' }}>
            +{stats.totalEarned} AC
          </div>
          <div style={{ fontSize: '11.5px', color: isDarkMode ? '#94a3b8' : '#4ade80' }}>
            Via diagnostics, tasks & signals
          </div>
        </div>

        <div style={{
          padding: '14px 16px',
          backgroundColor: isDarkMode ? 'rgba(249, 115, 22, 0.12)' : '#fff7ed',
          borderRadius: '12px',
          border: isDarkMode ? '1px solid rgba(249, 115, 22, 0.25)' : '1px solid #fed7aa'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: isDarkMode ? '#fb923c' : '#9a3412', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Utilized
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: isDarkMode ? '#fdba74' : '#c2410c', fontFamily: "'Fredoka', sans-serif", margin: '2px 0' }}>
            -{stats.totalSpent} AC
          </div>
          <div style={{ fontSize: '11.5px', color: isDarkMode ? '#94a3b8' : '#fb923c' }}>
            Clarity tasks & lab activities
          </div>
        </div>

        <div style={{
          padding: '14px 16px',
          backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.12)' : '#f5f3ff',
          borderRadius: '12px',
          border: isDarkMode ? '1px solid rgba(139, 92, 246, 0.25)' : '1px solid #ddd6fe'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: isDarkMode ? '#c084fc' : '#5b21b6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Provider Refunds
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: isDarkMode ? '#d8b4fe' : '#6d28d9', fontFamily: "'Fredoka', sans-serif", margin: '2px 0' }}>
            +{stats.totalRefunded} AC
          </div>
          <div style={{ fontSize: '11.5px', color: isDarkMode ? '#94a3b8' : '#a78bfa' }}>
            Automatic fault compensation
          </div>
        </div>
      </div>

      {/* OUT OF SCOPE / INFORMATIONAL NOTICE */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
        borderRadius: '12px',
        border: '1px solid var(--aiims-border-card, #e2e8f0)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <Info size={20} style={{ color: 'var(--aiims-text-secondary, #64748b)', flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--aiims-text-secondary, #475569)', lineHeight: 1.4 }}>
          <strong style={{ color: 'var(--aiims-text-primary, #0f172a)' }}>Payment & Top-Up Notice:</strong> Real-money payment gateways and top-ups are currently out of scope. AIIMS Credits are awarded authoritatively for verified learning milestones and protected against negative balances.
        </p>
      </div>

      {/* 1. HOW YOU EARN CREDITS */}
      <Card variant="bordered" radius="default" padding="default">
        <h2 style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: 800, color: 'var(--aiims-text-primary, #0f172a)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Authoritative Reward Matrix
        </h2>

        <div className="aiims-card-grid">
          <div style={{ padding: '16px', backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)', borderRadius: 'var(--aiims-card-radius, 12px)', border: '1px solid var(--aiims-border-card, #e2e8f0)' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5', marginBottom: '4px' }}>+50 AC</div>
            <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: 'var(--aiims-text-primary, #0f172a)' }}>Baseline Diagnostic</h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--aiims-text-secondary, #64748b)', lineHeight: 1.4 }}>Complete 25 questions across 5 dimensions.</p>
          </div>

          <div style={{ padding: '16px', backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)', borderRadius: 'var(--aiims-card-radius, 12px)', border: '1px solid var(--aiims-border-card, #e2e8f0)' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7', marginBottom: '4px' }}>+30 AC</div>
            <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: 'var(--aiims-text-primary, #0f172a)' }}>Signal Investigation</h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--aiims-text-secondary, #64748b)', lineHeight: 1.4 }}>Research technical shifts & submit reflections.</p>
          </div>

          <div style={{ padding: '16px', backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)', borderRadius: 'var(--aiims-card-radius, 12px)', border: '1px solid var(--aiims-border-card, #e2e8f0)' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#059669', marginBottom: '4px' }}>+15 AC</div>
            <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: 'var(--aiims-text-primary, #0f172a)' }}>Clarity AI Tasks</h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--aiims-text-secondary, #64748b)', lineHeight: 1.4 }}>Execute hands-on prompt tasks in Level 2.</p>
          </div>

          <div style={{ padding: '16px', backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)', borderRadius: 'var(--aiims-card-radius, 12px)', border: '1px solid var(--aiims-border-card, #e2e8f0)' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#d97706', marginBottom: '4px' }}>+10 AC</div>
            <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: 'var(--aiims-text-primary, #0f172a)' }}>AI Quest Levels</h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--aiims-text-secondary, #64748b)', lineHeight: 1.4 }}>Complete progression stages in learning journey.</p>
          </div>
        </div>
      </Card>

      {/* 2. TRANSACTION LEDGER WITH FILTERING */}
      <Card variant="bordered" radius="default" padding="default">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--aiims-text-primary, #0f172a)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Authoritative Ledger History
          </h2>

          {/* FILTER PILLS */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(['ALL', 'EARN', 'SPEND', 'REFUND'] as const).map((filter) => {
              const isActive = activeFilter === filter;
              const labels = {
                ALL: 'All Activities',
                EARN: 'Earned (+)',
                SPEND: 'Utilized (-)',
                REFUND: 'Refunds (↺)'
              };
              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  style={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--aiims-primary, #5B4BFF)' : 'var(--aiims-border-card, #e2e8f0)',
                    backgroundColor: isActive ? 'var(--aiims-primary, #5B4BFF)' : 'var(--aiims-bg-card, #ffffff)',
                    color: isActive ? '#ffffff' : 'var(--aiims-text-secondary, #475569)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {labels[filter]}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--aiims-text-muted)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: 'var(--aiims-text-subtle)' }} />
            <div style={{ fontSize: '13px', fontWeight: 600 }}>Loading verified transactions...</div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <FileText size={28} style={{ color: 'var(--aiims-text-subtle)', marginBottom: '8px' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--aiims-text-heading)', margin: '0 0 4px 0' }}>
              No {activeFilter === 'ALL' ? 'transactions' : activeFilter.toLowerCase()} found
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--aiims-text-muted)', margin: 0 }}>
              {activeFilter === 'REFUND'
                ? 'No refunds recorded. Automated refunds trigger only upon provider execution failures.'
                : 'Complete baseline assessments, clarity tasks, or signal investigations to log transactions.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredTransactions.map((tx) => {
              const isEarn = tx.type === 'EARN';
              const isRefund = tx.type === 'REFUND';
              const isSpend = tx.type === 'SPEND';

              return (
                <div
                  key={tx.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedTx(tx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedTx(tx);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: 'var(--aiims-table-row-bg, var(--aiims-bg-card-hover))',
                    borderRadius: 'var(--aiims-card-radius, 12px)',
                    border: '1px solid var(--aiims-table-row-border, var(--aiims-border-card))',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: isEarn ? '#ecfdf5' : isRefund ? '#f5f3ff' : '#fff1f2',
                      border: isEarn ? '1px solid #a7f3d0' : isRefund ? '1px solid #ddd6fe' : '1px solid #fecdd3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {isEarn && <CheckCircle2 style={{ color: '#059669', width: '18px', height: '18px' }} />}
                      {isRefund && <RotateCcw style={{ color: '#7c3aed', width: '18px', height: '18px' }} />}
                      {isSpend && <ArrowDownLeft style={{ color: '#e11d48', width: '18px', height: '18px' }} />}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div className="truncate-1-line" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--aiims-text-primary, #0f172a)' }}>
                        {tx.reason}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--aiims-text-secondary, #64748b)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'Recent'}</span>
                        <span>•</span>
                        <span style={{ fontWeight: 600, color: 'var(--aiims-text-secondary, #475569)' }}>
                          {tx.balanceBefore !== undefined && tx.balanceAfter !== undefined
                            ? `${tx.balanceBefore} → ${tx.balanceAfter} AC`
                            : tx.source}
                        </span>
                        {isRefund && (
                          <span style={{
                            padding: '1px 6px',
                            backgroundColor: '#ede9fe',
                            color: '#6d28d9',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700
                          }}>
                            REFUND
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: isEarn ? '#059669' : isRefund ? '#7c3aed' : '#e11d48',
                    fontFamily: "'Fredoka', sans-serif",
                    flexShrink: 0,
                    marginLeft: '12px'
                  }}>
                    {isSpend ? `-${tx.amount}` : `+${tx.amount}`} AC
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* TRANSACTION DETAILS MODAL */}
      {selectedTx && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--aiims-modal-bg, #ffffff)',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            border: '1px solid var(--aiims-modal-border, #e2e8f0)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} style={{ color: '#059669' }} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--aiims-text-primary, #0f172a)' }}>
                  Transaction Audit Record
                </h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--aiims-text-secondary, #64748b)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ padding: '12px', backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)', borderRadius: '8px', border: '1px solid var(--aiims-border-card, #e2e8f0)' }}>
                <div style={{ fontSize: '11px', color: 'var(--aiims-text-secondary, #64748b)', fontWeight: 700, textTransform: 'uppercase' }}>Description</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--aiims-text-primary, #0f172a)', marginTop: '2px' }}>{selectedTx.reason}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '10px 12px', backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)', borderRadius: '8px', border: '1px solid var(--aiims-border-card, #e2e8f0)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--aiims-text-secondary, #64748b)', fontWeight: 700 }}>AMOUNT</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: selectedTx.type === 'SPEND' ? '#e11d48' : '#059669' }}>
                    {selectedTx.type === 'SPEND' ? `-${selectedTx.amount}` : `+${selectedTx.amount}`} AC
                  </div>
                </div>

                <div style={{ padding: '10px 12px', backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)', borderRadius: '8px', border: '1px solid var(--aiims-border-card, #e2e8f0)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--aiims-text-secondary, #64748b)', fontWeight: 700 }}>BALANCE DELTA</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--aiims-text-primary, #334155)' }}>
                    {selectedTx.balanceBefore} → {selectedTx.balanceAfter} AC
                  </div>
                </div>
              </div>

              <div style={{ padding: '10px 12px', backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)', borderRadius: '8px', border: '1px solid var(--aiims-border-card, #e2e8f0)' }}>
                <div style={{ fontSize: '11px', color: 'var(--aiims-text-secondary, #64748b)', fontWeight: 700 }}>TRANSACTION ID</div>
                <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--aiims-text-secondary, #475569)', wordBreak: 'break-all' }}>
                  {selectedTx.id}
                </div>
              </div>

              {selectedTx.relatedTaskId && (
                <div style={{ padding: '10px 12px', backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)', borderRadius: '8px', border: '1px solid var(--aiims-border-card, #e2e8f0)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--aiims-text-secondary, #64748b)', fontWeight: 700 }}>OPERATION ID</div>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--aiims-text-secondary, #475569)', wordBreak: 'break-all' }}>
                    {selectedTx.relatedTaskId}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}>
                  Status: <strong style={{ color: '#059669' }}>{selectedTx.status || 'COMPLETED'}</strong>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}>
                  Source: <strong>{selectedTx.source}</strong>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="outline" size="sm" onClick={() => setSelectedTx(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT / RECONCILIATION MODAL */}
      {showAuditModal && auditReport && (
        <div style={{
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
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--aiims-modal-bg, #ffffff)',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            border: '1px solid var(--aiims-modal-border, #e2e8f0)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: auditReport.isReconciled ? '#dcfce7' : '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldCheck size={18} style={{ color: auditReport.isReconciled ? '#15803d' : '#b91c1c' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--aiims-text-primary, #0f172a)', margin: 0 }}>
                    Ledger Audit & Reconciliation
                  </h3>
                  <div style={{ fontSize: '11px', color: 'var(--aiims-text-secondary, #64748b)' }}>
                    Cryptographic server-side integrity verification
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--aiims-text-secondary, #64748b)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: auditReport.isReconciled ? (isDarkMode ? 'rgba(22, 163, 74, 0.15)' : '#f0fdf4') : (isDarkMode ? 'rgba(220, 38, 38, 0.15)' : '#fef2f2'),
              border: `1px solid ${auditReport.isReconciled ? (isDarkMode ? '#16a34a' : '#86efac') : (isDarkMode ? '#dc2626' : '#fca5a5')}`,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <CheckCircle2 size={18} style={{ color: auditReport.isReconciled ? '#16a34a' : '#dc2626', flexShrink: 0 }} />
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: auditReport.isReconciled ? (isDarkMode ? '#86efac' : '#166534') : (isDarkMode ? '#fca5a5' : '#991b1b') }}>
                {auditReport.isReconciled
                  ? 'All transactions successfully reconciled with zero discrepancy.'
                  : `Discrepancy detected: ${auditReport.discrepancy} AC variance.`}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={{ padding: '10px 12px', backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)', borderRadius: '8px', border: '1px solid var(--aiims-border-card, #e2e8f0)' }}>
                <div style={{ fontSize: '11px', color: 'var(--aiims-text-secondary, #64748b)', fontWeight: 700 }}>AUTHORITATIVE BALANCE</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--aiims-text-primary, #0f172a)', fontFamily: "'Fredoka', sans-serif" }}>
                  {auditReport.currentBalance} AC
                </div>
              </div>

              <div style={{ padding: '10px 12px', backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)', borderRadius: '8px', border: '1px solid var(--aiims-border-card, #e2e8f0)' }}>
                <div style={{ fontSize: '11px', color: 'var(--aiims-text-secondary, #64748b)', fontWeight: 700 }}>COMPUTED LEDGER SUM</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--aiims-text-primary, #0f172a)', fontFamily: "'Fredoka', sans-serif" }}>
                  {auditReport.calculatedBalance} AC
                </div>
              </div>

              <div style={{ padding: '10px 12px', backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)', borderRadius: '8px', border: '1px solid var(--aiims-border-card, #e2e8f0)' }}>
                <div style={{ fontSize: '11px', color: 'var(--aiims-text-secondary, #64748b)', fontWeight: 700 }}>DISCREPANCY</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: auditReport.discrepancy === 0 ? '#16a34a' : '#dc2626', fontFamily: "'Fredoka', sans-serif" }}>
                  {auditReport.discrepancy} AC
                </div>
              </div>

              <div style={{ padding: '10px 12px', backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)', borderRadius: '8px', border: '1px solid var(--aiims-border-card, #e2e8f0)' }}>
                <div style={{ fontSize: '11px', color: 'var(--aiims-text-secondary, #64748b)', fontWeight: 700 }}>TOTAL ENTRIES</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--aiims-text-primary, #334155)', fontFamily: "'Fredoka', sans-serif" }}>
                  {auditReport.entriesCount} Records
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" size="sm" onClick={() => setShowAuditModal(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CreditsScreen;
