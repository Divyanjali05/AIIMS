import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { useLearner } from '../../context/LearnerContext';
import { useTheme } from '../../context/ThemeContext';
import { apiClient } from '../../api/client';
import { CreditTransaction } from '../../types';
import {
  ArrowDownLeft,
  Info,
  X,
  FileText,
  Award,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  RotateCcw,
  Zap,
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
    totalRefunded: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Authoritative XP Balance from profile
  const xpBalance = state.profile?.xpPoints ?? 0;
  const currentStage = state.profile?.stage || 'EXPLORER';

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
    if (isAuditing) return;
    setIsAuditing(true);
    setErrorMessage(null);
    try {
      const report = await apiClient.getCreditsReconciliation();
      if (report) {
        setAuditReport(report);
        setShowAuditModal(true);
      }
    } catch (e: unknown) {
      console.error('Audit failed:', e);
      setErrorMessage('Unable to complete ledger reconciliation audit. Please try again.');
    } finally {
      setIsAuditing(false);
    }
  };

  const fetchLedger = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage(null);

      try {
        const res = await apiClient.getCreditsLedger();
        if (res && Array.isArray(res.transactions)) {
          setLedgerTxs(res.transactions);
          setStats({
            balance: typeof res.balance === 'number' ? res.balance : state.credits.balance,
            totalEarned: res.totalEarned ?? 0,
            totalSpent: res.totalSpent ?? 0,
            totalRefunded: res.totalRefunded ?? 0,
          });
        } else {
          // Fallback to state.credits if API returns legacy shape
          const fallbackList: LedgerItem[] = (state.credits.transactions || []).map(
            (t: CreditTransaction) => ({
              id: t.id,
              type: (t.type === 'SPEND' ? 'SPEND' : 'EARN') as 'SPEND' | 'EARN',
              category: t.transactionType || 'REWARD',
              amount: t.amount,
              balanceBefore: t.previousBalance ?? 0,
              balanceAfter: t.newBalance ?? 0,
              reason: t.description,
              source: t.source || 'SYSTEM',
              sourceId: t.sourceId,
              status: 'COMPLETED',
              createdAt: t.timestamp,
            })
          );
          setLedgerTxs(fallbackList);
          setStats({
            balance: state.credits.balance,
            totalEarned: fallbackList
              .filter((t) => t.type === 'EARN')
              .reduce((s, c) => s + c.amount, 0),
            totalSpent: fallbackList
              .filter((t) => t.type === 'SPEND')
              .reduce((s, c) => s + c.amount, 0),
            totalRefunded: 0,
          });
        }
      } catch (err: unknown) {
        console.warn(
          'Failed to load server-authoritative ledger, falling back to cached state:',
          err
        );
        // Populate from learner state cache
        const fallbackList: LedgerItem[] = (state.credits.transactions || []).map(
          (t: CreditTransaction) => ({
            id: t.id,
            type: (t.type === 'SPEND' ? 'SPEND' : 'EARN') as 'SPEND' | 'EARN',
            category: t.transactionType || 'REWARD',
            amount: t.amount,
            balanceBefore: t.previousBalance ?? 0,
            balanceAfter: t.newBalance ?? 0,
            reason: t.description,
            source: t.source || 'SYSTEM',
            sourceId: t.sourceId,
            status: 'COMPLETED',
            createdAt: t.timestamp,
          })
        );
        setLedgerTxs(fallbackList);
        setStats({
          balance: state.credits.balance,
          totalEarned: fallbackList
            .filter((t) => t.type === 'EARN')
            .reduce((s, c) => s + c.amount, 0),
          totalSpent: fallbackList
            .filter((t) => t.type === 'SPEND')
            .reduce((s, c) => s + c.amount, 0),
          totalRefunded: 0,
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [state.credits.balance, state.credits.transactions]
  );

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const filteredTransactions = useMemo(() => {
    return ledgerTxs.filter((tx) => {
      if (activeFilter === 'ALL') return true;
      return tx.type === activeFilter;
    });
  }, [ledgerTxs, activeFilter]);

  // Counts for tabs
  const earnCount = useMemo(() => ledgerTxs.filter((t) => t.type === 'EARN').length, [ledgerTxs]);
  const spendCount = useMemo(() => ledgerTxs.filter((t) => t.type === 'SPEND').length, [ledgerTxs]);
  const refundCount = useMemo(
    () => ledgerTxs.filter((t) => t.type === 'REFUND').length,
    [ledgerTxs]
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recent';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div
      style={{
        maxWidth: '980px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--aiims-grid-gap, 24px)',
      }}
    >
      {/* PAGE HEADER */}
      <PageHeader
        icon={<Award size={24} />}
        title="Credits Ledger & XP Recognition"
        description="Authoritative dual-ledger tracking spendable AI utility credits alongside permanent capability experience points."
      />

      {/* ERROR NOTICE (IF ANY) */}
      {errorMessage && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--aiims-card-rose-bg, #fff1f2)',
            border: '1px solid var(--aiims-card-rose-border, #fecdd3)',
            borderRadius: '12px',
            color: 'var(--aiims-card-rose-text, #be123c)',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <span>{errorMessage}</span>
          <Button variant="ghost" size="sm" onClick={() => fetchLedger(false)}>
            Retry
          </Button>
        </div>
      )}

      {/* DUAL-LEDGER PRESENTATION: CREDITS & XP SIDE-BY-SIDE */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
        }}
      >
        {/* 1. SPENDABLE AIIMS CREDITS (AC) CARD */}
        <Card
          variant="bordered"
          radius="default"
          padding="default"
          style={{
            background: isDarkMode
              ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.16) 0%, rgba(15, 23, 42, 0.9) 80%, rgba(16, 185, 129, 0.1) 100%)'
              : 'linear-gradient(135deg, #fffbeb 0%, #ffffff 80%, #f0fdf4 100%)',
            borderLeft: '5px solid #d97706',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--aiims-card-amber-text, #b45309)',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Zap size={14} /> SPENDABLE UTILITY BALANCE
              </div>
              <Badge variant="warning" size="sm">
                Live Ledger
              </Badge>
            </div>

            <div
              style={{
                fontSize: '34px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading, #0f172a)',
                margin: '2px 0 6px 0',
                fontFamily: "'Fredoka', sans-serif",
                lineHeight: 1.1,
              }}
            >
              {stats.balance.toLocaleString()}{' '}
              <span style={{ fontSize: '18px', color: '#d97706', fontWeight: 700 }}>
                AIIMS Credits
              </span>
            </div>

            <p
              style={{
                margin: 0,
                fontSize: '12.5px',
                color: 'var(--aiims-text-secondary, #64748b)',
                lineHeight: 1.5,
              }}
            >
              Spendable credits power LLM prompt derivations, Clarity laboratory simulations, and
              tool queries. Earned through verified learning milestones.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              paddingTop: '12px',
              borderTop: '1px solid var(--aiims-border-subtle, #ede9fe)',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={() => fetchLedger(true)}
              disabled={isRefreshing}
              title="Refresh Authoritative Balance"
              style={{
                background: 'var(--aiims-bg-card, #ffffff)',
                border: '1px solid var(--aiims-border-card, #e2e8f0)',
                borderRadius: '8px',
                padding: '7px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--aiims-text-secondary, #475569)',
                transition: 'all 0.15s ease',
              }}
            >
              <RefreshCw size={13} className={isRefreshing ? 'spin' : ''} />
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
                padding: '7px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--aiims-text-primary, #0f172a)',
                transition: 'all 0.15s ease',
              }}
            >
              <ShieldCheck size={14} style={{ color: '#2563eb' }} />
              {isAuditing ? 'Auditing...' : 'Audit Ledger'}
            </button>
          </div>
        </Card>

        {/* 2. PERMANENT EXPERIENCE POINTS (XP) CARD */}
        <Card
          variant="bordered"
          radius="default"
          padding="default"
          style={{
            background: isDarkMode
              ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.16) 0%, rgba(15, 23, 42, 0.9) 80%, rgba(139, 92, 246, 0.12) 100%)'
              : 'linear-gradient(135deg, #eef2ff 0%, #ffffff 80%, #f5f3ff 100%)',
            borderLeft: '5px solid var(--aiims-primary, #6366f1)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--aiims-primary, #6366f1)',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Award size={14} /> PERMANENT COMPETENCY RECOGNITION
              </div>
              <Badge variant="purple" size="sm">
                {currentStage} Stage
              </Badge>
            </div>

            <div
              style={{
                fontSize: '34px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading, #0f172a)',
                margin: '2px 0 6px 0',
                fontFamily: "'Fredoka', sans-serif",
                lineHeight: 1.1,
              }}
            >
              {xpBalance.toLocaleString()}{' '}
              <span
                style={{
                  fontSize: '18px',
                  color: 'var(--aiims-primary, #6366f1)',
                  fontWeight: 700,
                }}
              >
                XP Points
              </span>
            </div>

            <p
              style={{
                margin: 0,
                fontSize: '12.5px',
                color: 'var(--aiims-text-secondary, #64748b)',
                lineHeight: 1.5,
              }}
            >
              XP represents cumulative mastery and progression rank across your entire learning
              journey. Unlike credits, XP points are permanent and never deducted.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingTop: '12px',
              borderTop: '1px solid var(--aiims-border-subtle, #ede9fe)',
            }}
          >
            <span
              style={{
                fontSize: '11.5px',
                color: 'var(--aiims-text-muted, #64748b)',
                fontWeight: 600,
              }}
            >
              Rank Metric:
            </span>
            <span
              style={{
                fontSize: '11.5px',
                color: 'var(--aiims-primary, #6366f1)',
                fontWeight: 800,
              }}
            >
              {xpBalance >= 300
                ? 'Advanced Practitioner'
                : xpBalance >= 100
                  ? 'Competent Explorer'
                  : 'Apprentice Learner'}
            </span>
          </div>
        </Card>
      </div>

      {/* METRICS ROW */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: 'var(--aiims-card-mint-bg, #f0fdf4)',
            borderRadius: '12px',
            border: '1px solid var(--aiims-card-mint-border, #bbf7d0)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--aiims-card-mint-text, #15803d)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Total Earned
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--aiims-card-mint-text, #15803d)',
              fontFamily: "'Fredoka', sans-serif",
              margin: '2px 0',
            }}
          >
            +{stats.totalEarned.toLocaleString()} AC
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--aiims-text-muted, #64748b)' }}>
            Via diagnostics, tasks & signals
          </div>
        </div>

        <div
          style={{
            padding: '14px 16px',
            backgroundColor: 'var(--aiims-card-peach-bg, #fff7ed)',
            borderRadius: '12px',
            border: '1px solid var(--aiims-card-peach-border, #fed7aa)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--aiims-card-peach-text, #c2410c)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Total Utilized
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--aiims-card-peach-text, #c2410c)',
              fontFamily: "'Fredoka', sans-serif",
              margin: '2px 0',
            }}
          >
            -{stats.totalSpent.toLocaleString()} AC
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--aiims-text-muted, #64748b)' }}>
            Clarity tasks & lab simulations
          </div>
        </div>

        <div
          style={{
            padding: '14px 16px',
            backgroundColor: 'var(--aiims-card-violet-bg, #f5f3ff)',
            borderRadius: '12px',
            border: '1px solid var(--aiims-card-violet-border, #ddd6fe)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--aiims-card-violet-text, #6d28d9)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Provider Refunds
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--aiims-card-violet-text, #6d28d9)',
              fontFamily: "'Fredoka', sans-serif",
              margin: '2px 0',
            }}
          >
            +{stats.totalRefunded.toLocaleString()} AC
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--aiims-text-muted, #64748b)' }}>
            Automated fault compensation
          </div>
        </div>

        <div
          style={{
            padding: '14px 16px',
            backgroundColor: 'var(--aiims-primary-light, #eef2ff)',
            borderRadius: '12px',
            border: '1px solid var(--aiims-border-card-hover, #c7d2fe)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--aiims-primary, #6366f1)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Total XP Earned
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--aiims-primary, #6366f1)',
              fontFamily: "'Fredoka', sans-serif",
              margin: '2px 0',
            }}
          >
            +{xpBalance.toLocaleString()} XP
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--aiims-text-muted, #64748b)' }}>
            Cumulative learning score
          </div>
        </div>
      </div>

      {/* INFORMATIONAL CALLOUT: NON-MONETARY CREDITS MODEL */}
      <div
        style={{
          padding: '14px 18px',
          backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
          borderRadius: '12px',
          border: '1px solid var(--aiims-border-card, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Info size={20} style={{ color: 'var(--aiims-primary, #6366f1)', flexShrink: 0 }} />
        <div
          style={{
            fontSize: '12.5px',
            color: 'var(--aiims-text-secondary, #475569)',
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: 'var(--aiims-text-heading, #0f172a)' }}>
            Non-Monetary Credits Architecture:{' '}
          </strong>
          Real-money payment gateways and micro-transactions are intentionally not present. AIIMS
          Credits are earned exclusively through diagnostic performance and verified hands-on
          activities, with built-in overdraft protection and dual-ledger synchronization.
        </div>
      </div>

      {/* 1. HOW YOU EARN CREDITS MATRIX */}
      <Card variant="bordered" radius="default" padding="default">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <h2
              style={{
                margin: '0 0 4px 0',
                fontSize: '17px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading, #0f172a)',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              Authoritative Reward Matrix
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: '12.5px',
                color: 'var(--aiims-text-secondary, #64748b)',
              }}
            >
              Verifiable reward values awarded upon completion of curriculum milestones.
            </p>
          </div>
          <Badge variant="cyan" size="sm">
            4 Reward Tiers
          </Badge>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '12px',
          }}
        >
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
              borderRadius: '12px',
              border: '1px solid var(--aiims-border-card, #e2e8f0)',
            }}
          >
            <div
              style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5', marginBottom: '4px' }}
            >
              +50 AC · 100 XP
            </div>
            <h3
              style={{
                margin: '0 0 4px',
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--aiims-text-heading, #0f172a)',
              }}
            >
              Baseline Diagnostic
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: 'var(--aiims-text-secondary, #64748b)',
                lineHeight: 1.45,
              }}
            >
              Complete 25 experiential challenges across 5 core dimensions.
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
              borderRadius: '12px',
              border: '1px solid var(--aiims-border-card, #e2e8f0)',
            }}
          >
            <div
              style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7', marginBottom: '4px' }}
            >
              +30 AC · 60 XP
            </div>
            <h3
              style={{
                margin: '0 0 4px',
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--aiims-text-heading, #0f172a)',
              }}
            >
              Signal Investigation
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: 'var(--aiims-text-secondary, #64748b)',
                lineHeight: 1.45,
              }}
            >
              Research emerging AI breakthroughs & submit technical reflections.
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
              borderRadius: '12px',
              border: '1px solid var(--aiims-border-card, #e2e8f0)',
            }}
          >
            <div
              style={{ fontSize: '12px', fontWeight: 800, color: '#059669', marginBottom: '4px' }}
            >
              +15 AC · 30 XP
            </div>
            <h3
              style={{
                margin: '0 0 4px',
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--aiims-text-heading, #0f172a)',
              }}
            >
              Clarity AI Tasks
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: 'var(--aiims-text-secondary, #64748b)',
                lineHeight: 1.45,
              }}
            >
              Master structured prompt engineering and laboratory tasks.
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
              borderRadius: '12px',
              border: '1px solid var(--aiims-border-card, #e2e8f0)',
            }}
          >
            <div
              style={{ fontSize: '12px', fontWeight: 800, color: '#d97706', marginBottom: '4px' }}
            >
              +10 AC · 20 XP
            </div>
            <h3
              style={{
                margin: '0 0 4px',
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--aiims-text-heading, #0f172a)',
              }}
            >
              Quest Progression
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: 'var(--aiims-text-secondary, #64748b)',
                lineHeight: 1.45,
              }}
            >
              Advance through progressive stages in your 10-stage learning journey.
            </p>
          </div>
        </div>
      </Card>

      {/* 2. TRANSACTION LEDGER WITH FILTERING TABS */}
      <Card variant="bordered" radius="default" padding="default">
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
          <div>
            <h2
              style={{
                margin: '0 0 2px 0',
                fontSize: '17px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading, #0f172a)',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              Authoritative Ledger History
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--aiims-text-secondary, #64748b)' }}>
              Every transaction is cryptographically tied to an idempotency key. Click any entry to
              inspect audit record.
            </div>
          </div>

          {/* FILTER TABS */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(
              [
                { key: 'ALL', label: 'All Activities', count: ledgerTxs.length },
                { key: 'EARN', label: 'Earned (+)', count: earnCount },
                { key: 'SPEND', label: 'Utilized (-)', count: spendCount },
                { key: 'REFUND', label: 'Refunds (↺)', count: refundCount },
              ] as const
            ).map((tab) => {
              const isActive = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveFilter(tab.key)}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: isActive
                      ? 'var(--aiims-primary, #6366f1)'
                      : 'var(--aiims-border-card, #e2e8f0)',
                    backgroundColor: isActive
                      ? 'var(--aiims-primary, #6366f1)'
                      : 'var(--aiims-bg-card, #ffffff)',
                    color: isActive ? '#ffffff' : 'var(--aiims-text-secondary, #475569)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: isActive
                        ? 'rgba(255, 255, 255, 0.25)'
                        : 'var(--aiims-bg-card-hover, #f1f5f9)',
                      color: isActive ? '#ffffff' : 'var(--aiims-text-muted, #64748b)',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TRANSACTION CONTENT */}
        {isLoading ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 16px',
              color: 'var(--aiims-text-muted, #94a3b8)',
            }}
          >
            <RefreshCw
              size={26}
              className="spin"
              style={{ margin: '0 auto 10px', color: 'var(--aiims-primary, #6366f1)' }}
            />
            <div
              style={{
                fontSize: '13.5px',
                fontWeight: 700,
                color: 'var(--aiims-text-heading, #0f172a)',
              }}
            >
              Loading Server-Authoritative Ledger...
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--aiims-text-secondary, #64748b)',
                marginTop: '4px',
              }}
            >
              Reconciling balance against cryptographic entry hashes
            </div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px' }}>
            <FileText
              size={32}
              style={{ color: 'var(--aiims-text-muted, #94a3b8)', margin: '0 auto 8px' }}
            />
            <h3
              style={{
                fontSize: '14.5px',
                fontWeight: 700,
                color: 'var(--aiims-text-heading, #0f172a)',
                margin: '0 0 6px 0',
              }}
            >
              {activeFilter === 'ALL'
                ? 'No transactions recorded yet'
                : `No ${activeFilter.toLowerCase()} transactions recorded`}
            </h3>
            <p
              style={{
                fontSize: '12.5px',
                color: 'var(--aiims-text-secondary, #64748b)',
                margin: 0,
                maxWidth: '420px',
                marginLeft: 'auto',
                marginRight: 'auto',
                lineHeight: 1.5,
              }}
            >
              {activeFilter === 'REFUND'
                ? 'No provider refunds recorded. Automated compensations trigger strictly upon external model API execution faults.'
                : activeFilter === 'SPEND'
                  ? 'No utilized credits recorded. Hands-on prompt exercises in Clarity and tool executions will log debits here.'
                  : 'Complete your baseline diagnostic, explore Clarity tasks, or investigate radar signals to earn verifiable credits.'}
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
                    backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                    borderRadius: '12px',
                    border: '1px solid var(--aiims-border-card, #e2e8f0)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.borderColor = 'var(--aiims-border-card-hover, #c7d2fe)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.borderColor = 'var(--aiims-border-card, #e2e8f0)';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      minWidth: 0,
                      flex: 1,
                      paddingRight: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: isEarn
                          ? 'var(--aiims-card-mint-bg, #ecfdf5)'
                          : isRefund
                            ? 'var(--aiims-card-violet-bg, #f5f3ff)'
                            : 'var(--aiims-card-rose-bg, #fff1f2)',
                        border: isEarn
                          ? '1px solid var(--aiims-card-mint-border, #a7f3d0)'
                          : isRefund
                            ? '1px solid var(--aiims-card-violet-border, #ddd6fe)'
                            : '1px solid var(--aiims-card-rose-border, #fecdd3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isEarn && (
                        <CheckCircle2
                          style={{
                            color: 'var(--aiims-card-mint-text, #059669)',
                            width: '18px',
                            height: '18px',
                          }}
                        />
                      )}
                      {isRefund && (
                        <RotateCcw
                          style={{
                            color: 'var(--aiims-card-violet-text, #7c3aed)',
                            width: '18px',
                            height: '18px',
                          }}
                        />
                      )}
                      {isSpend && (
                        <ArrowDownLeft
                          style={{
                            color: 'var(--aiims-card-rose-text, #e11d48)',
                            width: '18px',
                            height: '18px',
                          }}
                        />
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: 'var(--aiims-text-heading, #0f172a)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {tx.reason}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--aiims-text-secondary, #64748b)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '2px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>{formatDate(tx.createdAt)}</span>
                        <span>•</span>
                        <span
                          style={{ fontWeight: 600, color: 'var(--aiims-text-secondary, #475569)' }}
                        >
                          {tx.balanceBefore !== undefined && tx.balanceAfter !== undefined
                            ? `${tx.balanceBefore} → ${tx.balanceAfter} AC`
                            : tx.source}
                        </span>
                        {isRefund && (
                          <span
                            style={{
                              padding: '1px 6px',
                              backgroundColor: 'var(--aiims-card-violet-bg, #ede9fe)',
                              color: 'var(--aiims-card-violet-text, #6d28d9)',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 700,
                            }}
                          >
                            REFUND
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: '14.5px',
                      fontWeight: 800,
                      color: isEarn
                        ? 'var(--aiims-card-mint-text, #059669)'
                        : isRefund
                          ? 'var(--aiims-card-violet-text, #7c3aed)'
                          : 'var(--aiims-card-rose-text, #e11d48)',
                      fontFamily: "'Fredoka', sans-serif",
                      flexShrink: 0,
                    }}
                  >
                    {isSpend ? `-${tx.amount}` : `+${tx.amount}`} AC
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* TRANSACTION DETAILS AUDIT MODAL */}
      {selectedTx && (
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
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--aiims-modal-bg, #ffffff)',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '100%',
              padding: '24px',
              border: '1px solid var(--aiims-modal-border, #e2e8f0)',
              boxShadow: 'var(--aiims-shadow-modal)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} style={{ color: '#059669' }} />
                <h3
                  style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading, #0f172a)',
                  }}
                >
                  Transaction Audit Record
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'var(--aiims-text-secondary, #64748b)',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}
            >
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                  borderRadius: '8px',
                  border: '1px solid var(--aiims-border-card, #e2e8f0)',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--aiims-text-secondary, #64748b)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Description
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-heading, #0f172a)',
                    marginTop: '2px',
                  }}
                >
                  {selectedTx.reason}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                    borderRadius: '8px',
                    border: '1px solid var(--aiims-border-card, #e2e8f0)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--aiims-text-secondary, #64748b)',
                      fontWeight: 700,
                    }}
                  >
                    AMOUNT
                  </div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color:
                        selectedTx.type === 'SPEND'
                          ? 'var(--aiims-card-rose-text, #e11d48)'
                          : 'var(--aiims-card-mint-text, #059669)',
                    }}
                  >
                    {selectedTx.type === 'SPEND'
                      ? `-${selectedTx.amount}`
                      : `+${selectedTx.amount}`}{' '}
                    AC
                  </div>
                </div>

                <div
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                    borderRadius: '8px',
                    border: '1px solid var(--aiims-border-card, #e2e8f0)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--aiims-text-secondary, #64748b)',
                      fontWeight: 700,
                    }}
                  >
                    BALANCE DELTA
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--aiims-text-heading, #0f172a)',
                    }}
                  >
                    {selectedTx.balanceBefore} → {selectedTx.balanceAfter} AC
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                  borderRadius: '8px',
                  border: '1px solid var(--aiims-border-card, #e2e8f0)',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--aiims-text-secondary, #64748b)',
                    fontWeight: 700,
                  }}
                >
                  TRANSACTION ID
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: 'var(--aiims-text-secondary, #475569)',
                    wordBreak: 'break-all',
                  }}
                >
                  {selectedTx.id}
                </div>
              </div>

              {selectedTx.relatedTaskId && (
                <div
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                    borderRadius: '8px',
                    border: '1px solid var(--aiims-border-card, #e2e8f0)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--aiims-text-secondary, #64748b)',
                      fontWeight: 700,
                    }}
                  >
                    OPERATION ID
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      color: 'var(--aiims-text-secondary, #475569)',
                      wordBreak: 'break-all',
                    }}
                  >
                    {selectedTx.relatedTaskId}
                  </div>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '4px',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--aiims-text-muted, #94a3b8)' }}>
                  Status:{' '}
                  <strong style={{ color: '#059669' }}>{selectedTx.status || 'COMPLETED'}</strong>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--aiims-text-muted, #94a3b8)' }}>
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
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--aiims-modal-bg, #ffffff)',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: 'var(--aiims-shadow-modal)',
              border: '1px solid var(--aiims-modal-border, #e2e8f0)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: auditReport.isReconciled ? '#dcfce7' : '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldCheck
                    size={18}
                    style={{ color: auditReport.isReconciled ? '#15803d' : '#b91c1c' }}
                  />
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: 'var(--aiims-text-heading, #0f172a)',
                      margin: 0,
                    }}
                  >
                    Ledger Audit & Reconciliation
                  </h3>
                  <div style={{ fontSize: '11px', color: 'var(--aiims-text-secondary, #64748b)' }}>
                    Cryptographic server-side integrity verification
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--aiims-text-secondary, #64748b)',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: auditReport.isReconciled
                  ? isDarkMode
                    ? 'rgba(22, 163, 74, 0.15)'
                    : '#f0fdf4'
                  : isDarkMode
                    ? 'rgba(220, 38, 38, 0.15)'
                    : '#fef2f2',
                border: `1px solid ${auditReport.isReconciled ? (isDarkMode ? '#16a34a' : '#86efac') : isDarkMode ? '#dc2626' : '#fca5a5'}`,
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <CheckCircle2
                size={18}
                style={{ color: auditReport.isReconciled ? '#16a34a' : '#dc2626', flexShrink: 0 }}
              />
              <div
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: auditReport.isReconciled
                    ? isDarkMode
                      ? '#86efac'
                      : '#166534'
                    : isDarkMode
                      ? '#fca5a5'
                      : '#991b1b',
                }}
              >
                {auditReport.isReconciled
                  ? 'All transactions successfully reconciled with zero discrepancy.'
                  : `Discrepancy detected: ${auditReport.discrepancy} AC variance.`}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                  borderRadius: '8px',
                  border: '1px solid var(--aiims-border-card, #e2e8f0)',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--aiims-text-secondary, #64748b)',
                    fontWeight: 700,
                  }}
                >
                  AUTHORITATIVE BALANCE
                </div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading, #0f172a)',
                    fontFamily: "'Fredoka', sans-serif",
                  }}
                >
                  {auditReport.currentBalance} AC
                </div>
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                  borderRadius: '8px',
                  border: '1px solid var(--aiims-border-card, #e2e8f0)',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--aiims-text-secondary, #64748b)',
                    fontWeight: 700,
                  }}
                >
                  COMPUTED LEDGER SUM
                </div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading, #0f172a)',
                    fontFamily: "'Fredoka', sans-serif",
                  }}
                >
                  {auditReport.calculatedBalance} AC
                </div>
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                  borderRadius: '8px',
                  border: '1px solid var(--aiims-border-card, #e2e8f0)',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--aiims-text-secondary, #64748b)',
                    fontWeight: 700,
                  }}
                >
                  DISCREPANCY
                </div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: auditReport.discrepancy === 0 ? '#16a34a' : '#dc2626',
                    fontFamily: "'Fredoka', sans-serif",
                  }}
                >
                  {auditReport.discrepancy} AC
                </div>
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                  borderRadius: '8px',
                  border: '1px solid var(--aiims-border-card, #e2e8f0)',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--aiims-text-secondary, #64748b)',
                    fontWeight: 700,
                  }}
                >
                  TOTAL ENTRIES
                </div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading, #0f172a)',
                    fontFamily: "'Fredoka', sans-serif",
                  }}
                >
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
