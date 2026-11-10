import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  CreditCard,
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { apiClient } from '../../api/client';

interface LedgerItem {
  id?: string;
  _id?: string;
  type?: string;
  category?: string;
  amount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  description?: string;
  idempotencyKey?: string;
  referenceId?: string;
  createdAt?: string | Date;
}

interface CreditCostsResponse {
  success: boolean;
  costs: {
    clarityRun: { cost: number; freeTrialCount: number; unit: string; description: string };
    focusSession: { cost: number; unit: string; description: string };
    focusChallenge?: {
      cost: number;
      rewardFast?: number;
      rewardNormal?: number;
      unit: string;
      description: string;
    };
    toolMatching: { cost: number; unit: string; description: string };
    diagnosticAssessment: {
      cost: number;
      reward: number;
      xp: number;
      unit: string;
      description: string;
    };
    signalInvestigation: {
      cost: number;
      reward: number;
      xp: number;
      unit: string;
      description: string;
    };
    questLevelCompletion: {
      cost: number;
      reward: number;
      xp: number;
      unit: string;
      description: string;
    };
    clarityTaskCompletion: {
      cost: number;
      reward: number;
      xp: number;
      unit: string;
      description: string;
    };
  };
  paymentGateway: {
    status: string;
    integrated: boolean;
    message: string;
  };
}

interface CreditsLedgerSectionProps {
  onNavigateToMatching?: () => void;
}

export const CreditsLedgerSection: React.FC<CreditsLedgerSectionProps> = ({
  onNavigateToMatching,
}) => {
  const [balance, setBalance] = useState<number>(0);
  const [totalEarned, setTotalEarned] = useState<number>(0);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [totalRefunded, setTotalRefunded] = useState<number>(0);
  const [transactions, setTransactions] = useState<LedgerItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [_creditCosts, setCreditCosts] = useState<CreditCostsResponse | null>(null);

  // Filter & Pagination State
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [page, setPage] = useState<number>(0);
  const limit = 10;

  // Fetch Ledger History
  const fetchLedger = useCallback(
    async (showRefreshSpinner = false) => {
      if (showRefreshSpinner) setRefreshing(true);
      else setLoading(true);

      try {
        const params: { type?: string; category?: string; limit: number; skip: number } = {
          limit,
          skip: page * limit,
        };
        if (filterType !== 'ALL') params.type = filterType;
        if (filterCategory !== 'ALL') params.category = filterCategory;

        const [ledgerRes, costsRes] = await Promise.all([
          apiClient.getCreditsLedger(params),
          apiClient.getCreditCosts().catch(() => null),
        ]);

        if (ledgerRes) {
          setBalance(ledgerRes.balance ?? 0);
          setTotalEarned(ledgerRes.totalEarned ?? 0);
          setTotalSpent(ledgerRes.totalSpent ?? 0);
          setTotalRefunded(ledgerRes.totalRefunded ?? 0);
          setTransactions(ledgerRes.transactions || []);
          setTotalCount(ledgerRes.total || 0);
        }

        if (costsRes && costsRes.costs) {
          setCreditCosts(costsRes as CreditCostsResponse);
        }
      } catch (err) {
        console.error('Failed to load credit ledger:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, filterType, filterCategory]
  );

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const formatDate = (dateVal?: string | Date) => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dateVal);
    }
  };

  const getTransactionBadge = (type?: string) => {
    switch (type) {
      case 'EARN':
        return (
          <Badge variant="success" size="sm" icon={<TrendingUp size={11} />}>
            EARNED
          </Badge>
        );
      case 'SPEND':
        return (
          <Badge variant="warning" size="sm" icon={<TrendingDown size={11} />}>
            SPENT
          </Badge>
        );
      case 'REFUND':
        return (
          <Badge variant="cyan" size="sm" icon={<RefreshCw size={11} />}>
            REFUNDED
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm">
            {type || 'ADJUST'}
          </Badge>
        );
    }
  };

  const totalPages = Math.ceil(totalCount / limit);
  const isLowBalance = balance < 10;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. SERVER-AUTHORITATIVE AC BALANCE HERO */}
      <Surface variant="gradient-hero" radius="lg" padding="lg">
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--aiims-primary)',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              <ShieldCheck size={14} style={{ color: 'var(--aiims-primary)' }} />
              <span>SERVER-AUTHORITATIVE CREDIT LEDGER</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '44px',
                  fontWeight: 900,
                  color: 'var(--aiims-text-heading)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  lineHeight: 1,
                }}
              >
                {balance.toLocaleString()}
              </span>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: 'var(--aiims-primary)',
                }}
              >
                AI Credits (AC)
              </span>
              <Badge variant="mint" size="sm" icon={<ShieldCheck size={12} />}>
                Dual-Ledger Verified
              </Badge>
            </div>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: '13px',
                color: 'var(--aiims-text-secondary)',
                maxWidth: '600px',
              }}
            >
              Authoritative balance managed strictly via backend transactional ledger. Negative
              balances are mathematically prevented via atomic MongoDB updates.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Button
              variant="outline"
              size="sm"
              disabled={refreshing}
              icon={<RefreshCw size={14} className={refreshing ? 'spin' : ''} />}
              onClick={() => fetchLedger(true)}
            >
              {refreshing ? 'Syncing...' : 'Refresh Balance'}
            </Button>
            {onNavigateToMatching && (
              <Button
                variant="primary"
                size="sm"
                icon={<Sparkles size={14} />}
                onClick={onNavigateToMatching}
              >
                Match AI Tools (Free)
              </Button>
            )}
          </div>
        </div>

        {/* METRICS ROW */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginTop: '8px',
          }}
        >
          <div
            style={{
              padding: '14px',
              borderRadius: '12px',
              backgroundColor: 'var(--aiims-tint-emerald-bg)',
              border: '1px solid var(--aiims-tint-emerald-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <TrendingUp size={14} style={{ color: 'var(--aiims-tint-emerald-text)' }} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--aiims-tint-emerald-text)',
                }}
              >
                TOTAL EARNED
              </span>
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--aiims-tint-emerald-text)',
              }}
            >
              +{totalEarned.toLocaleString()} AC
            </div>
            <div
              style={{ fontSize: '11px', color: 'var(--aiims-tint-emerald-text)', opacity: 0.85 }}
            >
              Via quests, assessments & signals
            </div>
          </div>

          <div
            style={{
              padding: '14px',
              borderRadius: '12px',
              backgroundColor: 'var(--aiims-token-lavender-bg, #f5f3ff)',
              border: '1px solid var(--aiims-token-lavender-border, #ddd6fe)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <TrendingDown size={14} style={{ color: 'var(--aiims-primary)' }} />
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--aiims-primary)' }}>
                TOTAL SPENT
              </span>
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--aiims-primary)',
              }}
            >
              -{totalSpent.toLocaleString()} AC
            </div>
            <div style={{ fontSize: '11px', color: 'var(--aiims-text-secondary)' }}>
              Via Clarity task prompts
            </div>
          </div>

          <div
            style={{
              padding: '14px',
              borderRadius: '12px',
              backgroundColor: 'var(--aiims-tint-cyan-bg)',
              border: '1px solid var(--aiims-tint-cyan-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <RefreshCw size={14} style={{ color: 'var(--aiims-tint-cyan-text)' }} />
              <span
                style={{ fontSize: '11px', fontWeight: 800, color: 'var(--aiims-tint-cyan-text)' }}
              >
                TOTAL REFUNDED
              </span>
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--aiims-tint-cyan-text)',
              }}
            >
              +{totalRefunded.toLocaleString()} AC
            </div>
            <div style={{ fontSize: '11px', color: 'var(--aiims-tint-cyan-text)', opacity: 0.85 }}>
              Compensated on AI operational failures
            </div>
          </div>
        </div>
      </Surface>

      {/* 2. INSUFFICIENT CREDITS BANNER (Conditional) */}
      {isLowBalance && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            padding: '16px 20px',
            borderRadius: '14px',
            backgroundColor: 'var(--aiims-tint-amber-bg)',
            border: '1px solid var(--aiims-tint-amber-border)',
            color: 'var(--aiims-tint-amber-text)',
            boxShadow: 'var(--aiims-shadow-card)',
          }}
        >
          <AlertCircle size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '4px' }}>
              Low AI Credits Balance ({balance} AC Available)
            </div>
            <div style={{ fontSize: '13px', lineHeight: '1.5', opacity: 0.9 }}>
              Executing an AI task prompt in the <strong>Clarity Task Lab</strong> requires{' '}
              <strong>10 AC</strong>. You currently do not have enough credits for full task runs.
              Earn credits immediately by completing:
              <ul style={{ margin: '6px 0 2px 20px', padding: 0 }}>
                <li>
                  Diagnostic Assessment (<strong>+50 AC</strong>)
                </li>
                <li>
                  Radar Signal Investigations (<strong>+30 AC</strong> each)
                </li>
                <li>
                  Learning Universe Quest Levels (<strong>+10 AC</strong> each)
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 3. CREDIT COST DISCOVERY & TRANSPARENCY TABLE */}
      <Surface radius="lg" padding="md">
        <div style={{ marginBottom: '14px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--aiims-primary)',
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
            }}
          >
            TRANSPARENT SCHEDULE
          </div>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading)',
              margin: '2px 0 0',
            }}
          >
            AIIMS Credit Operations & Earning Rates
          </h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '2px solid var(--aiims-border-card)',
                  color: 'var(--aiims-text-secondary)',
                  fontWeight: 700,
                }}
              >
                <th style={{ padding: '8px 12px' }}>Activity / Module</th>
                <th style={{ padding: '8px 12px' }}>Type</th>
                <th style={{ padding: '8px 12px' }}>Credits (AC)</th>
                <th style={{ padding: '8px 12px' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--aiims-border-card)' }}>
                <td
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-heading)',
                  }}
                >
                  Clarity AI Task Run
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <Badge variant="warning" size="sm">
                    Deduction
                  </Badge>
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    fontWeight: 800,
                    color: 'var(--aiims-tint-amber-text)',
                  }}
                >
                  10 AC
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    color: 'var(--aiims-text-secondary)',
                    fontSize: '12px',
                  }}
                >
                  Includes 1 free trial for first-time learners. Automatically refunded if AI
                  provider fails.
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--aiims-border-card)' }}>
                <td
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-heading)',
                  }}
                >
                  Focus Practice Challenges (Easy / Medium / Hard)
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <Badge variant="success" size="sm">
                    Reward
                  </Badge>
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    fontWeight: 800,
                    color: 'var(--aiims-tint-emerald-text)',
                  }}
                >
                  +15 to +20 AC (+50 XP)
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    color: 'var(--aiims-text-secondary)',
                    fontSize: '12px',
                  }}
                >
                  Fast completion (first half of limit): +20 AC. Normal completion: +15 AC.
                  Over-time: 0 AC (attempt and score retained).
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--aiims-border-card)' }}>
                <td
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-heading)',
                  }}
                >
                  Focus Challenge Timer & Breaks
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <Badge variant="mint" size="sm">
                    Free
                  </Badge>
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    fontWeight: 800,
                    color: 'var(--aiims-tint-emerald-text)',
                  }}
                >
                  0 AC
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    color: 'var(--aiims-text-secondary)',
                    fontSize: '12px',
                  }}
                >
                  Distraction-free challenge timer, ambient audio, and interval tracking are 100%
                  free.
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--aiims-border-card)' }}>
                <td
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-heading)',
                  }}
                >
                  Intelligent Tool Matching
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <Badge variant="mint" size="sm">
                    Free
                  </Badge>
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    fontWeight: 800,
                    color: 'var(--aiims-tint-emerald-text)',
                  }}
                >
                  0 AC
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    color: 'var(--aiims-text-secondary)',
                    fontSize: '12px',
                  }}
                >
                  Task-first recommendation and verified catalog discovery cost 0 AC.
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--aiims-border-card)' }}>
                <td
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-heading)',
                  }}
                >
                  Diagnostic Assessment
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <Badge variant="success" size="sm">
                    Reward
                  </Badge>
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    fontWeight: 800,
                    color: 'var(--aiims-tint-emerald-text)',
                  }}
                >
                  +50 AC (+100 XP)
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    color: 'var(--aiims-text-secondary)',
                    fontSize: '12px',
                  }}
                >
                  One-time reward upon completing the comprehensive AI capability diagnostic.
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--aiims-border-card)' }}>
                <td
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-heading)',
                  }}
                >
                  Market Signal Investigation
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <Badge variant="success" size="sm">
                    Reward
                  </Badge>
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    fontWeight: 800,
                    color: 'var(--aiims-tint-emerald-text)',
                  }}
                >
                  +30 AC (+50 XP)
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    color: 'var(--aiims-text-secondary)',
                    fontSize: '12px',
                  }}
                >
                  Awarded for analyzing AI trends and submitting personal interpretations.
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-heading)',
                  }}
                >
                  Learning Universe Quests
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <Badge variant="success" size="sm">
                    Reward
                  </Badge>
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    fontWeight: 800,
                    color: 'var(--aiims-tint-emerald-text)',
                  }}
                >
                  +10 AC (+25 XP)
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    color: 'var(--aiims-text-secondary)',
                    fontSize: '12px',
                  }}
                >
                  Awarded idempotently upon completing each quest tier in the Learning Universe.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Surface>

      {/* 4. HONEST PAYMENT GATEWAY STATUS NOTICE */}
      <Surface
        radius="lg"
        padding="md"
        style={{
          borderLeft: '4px solid var(--aiims-primary)',
          backgroundColor: 'var(--aiims-bg-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'var(--aiims-primary-light)',
              color: 'var(--aiims-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CreditCard size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{ fontSize: '14px', fontWeight: 800, color: 'var(--aiims-text-heading)' }}
              >
                Payment Gateway Status: PREVIEW MODE
              </span>
              <Badge variant="purple" size="sm">
                No Real Charges
              </Badge>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: 'var(--aiims-text-secondary)',
                lineHeight: '1.5',
              }}
            >
              Direct purchasing of AI Credits with fiat currency is currently in preview. In
              adherence to AIIMS educational equity standards, credits cannot be purchased with real
              credit cards; all learners access equal AI capability credits through learning
              activities, diagnostic tests, and quest milestones.
            </p>
          </div>
        </div>
      </Surface>

      {/* 5. TRANSACTION HISTORY TABLE */}
      <Surface radius="lg" padding="md">
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
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading)',
              }}
            >
              Credit Transaction History
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--aiims-text-muted)' }}>
              Showing {transactions.length > 0 ? page * limit + 1 : 0}–
              {Math.min((page + 1) * limit, totalCount)} of {totalCount} transactions
            </p>
          </div>

          {/* FILTERS */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={13} style={{ color: 'var(--aiims-text-muted)' }} />
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setPage(0);
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  border: '1px solid var(--aiims-border-card)',
                  backgroundColor: 'var(--aiims-input-bg)',
                  color: 'var(--aiims-input-text)',
                  outline: 'none',
                }}
              >
                <option value="ALL">All Types</option>
                <option value="EARN">Earned Only</option>
                <option value="SPEND">Spent Only</option>
                <option value="REFUND">Refunds Only</option>
              </select>
            </div>

            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setPage(0);
              }}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '12.5px',
                border: '1px solid var(--aiims-border-card)',
                backgroundColor: 'var(--aiims-input-bg)',
                color: 'var(--aiims-input-text)',
                outline: 'none',
              }}
            >
              <option value="ALL">All Categories</option>
              <option value="clarity">Clarity Tasks</option>
              <option value="assessment">Assessment</option>
              <option value="investigation">Radar Signal</option>
              <option value="quest">Quest Levels</option>
              <option value="compensation">Refunds</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--aiims-text-muted)' }}>
            <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px' }} />
            <div>Loading verified transaction ledger...</div>
          </div>
        ) : transactions.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '36px 20px',
              borderRadius: '12px',
              backgroundColor: 'var(--aiims-card-banner-bg)',
              color: 'var(--aiims-text-muted)',
              fontSize: '13px',
            }}
          >
            <Clock size={28} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
            <div>No transactions match the selected filters.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '12.5px',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--aiims-border-card)',
                    color: 'var(--aiims-text-secondary)',
                    fontWeight: 700,
                  }}
                >
                  <th style={{ padding: '8px 10px' }}>Date & Time</th>
                  <th style={{ padding: '8px 10px' }}>Type</th>
                  <th style={{ padding: '8px 10px' }}>Category</th>
                  <th style={{ padding: '8px 10px' }}>Amount</th>
                  <th style={{ padding: '8px 10px' }}>Balance After</th>
                  <th style={{ padding: '8px 10px' }}>Description</th>
                  <th style={{ padding: '8px 10px' }}>Idempotency Ref</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, idx) => {
                  const isEarn = tx.type === 'EARN';
                  const isRefund = tx.type === 'REFUND';
                  const amountColor = isEarn
                    ? 'var(--aiims-tint-emerald-text)'
                    : isRefund
                      ? 'var(--aiims-tint-cyan-text)'
                      : 'var(--aiims-tint-amber-text)';
                  const amountPrefix = isEarn || isRefund ? '+' : '-';

                  return (
                    <tr
                      key={tx.id || tx._id || idx}
                      style={{
                        borderBottom: '1px solid var(--aiims-border-card)',
                        backgroundColor: idx % 2 === 1 ? 'rgba(0,0,0,0.015)' : 'transparent',
                      }}
                    >
                      <td
                        style={{
                          padding: '10px',
                          color: 'var(--aiims-text-muted)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDate(tx.createdAt)}
                      </td>
                      <td style={{ padding: '10px' }}>{getTransactionBadge(tx.type)}</td>
                      <td
                        style={{
                          padding: '10px',
                          color: 'var(--aiims-text-secondary)',
                          textTransform: 'capitalize',
                        }}
                      >
                        {tx.category || 'general'}
                      </td>
                      <td
                        style={{
                          padding: '10px',
                          fontWeight: 800,
                          color: amountColor,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {amountPrefix}
                        {Math.abs(tx.amount)} AC
                      </td>
                      <td
                        style={{
                          padding: '10px',
                          fontWeight: 700,
                          color: 'var(--aiims-text-heading)',
                        }}
                      >
                        {tx.balanceAfter !== undefined ? `${tx.balanceAfter} AC` : '—'}
                      </td>
                      <td
                        style={{
                          padding: '10px',
                          color: 'var(--aiims-text-heading)',
                          maxWidth: '240px',
                        }}
                      >
                        <div
                          style={{
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {tx.description || 'System credit transaction'}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: '10px',
                          color: 'var(--aiims-text-muted)',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                        }}
                      >
                        {tx.idempotencyKey ? `${tx.idempotencyKey.slice(0, 16)}...` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid var(--aiims-border-card)',
            }}
          >
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              icon={<ChevronLeft size={14} />}
              iconPosition="left"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <span style={{ fontSize: '12.5px', color: 'var(--aiims-text-secondary)' }}>
              Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong>
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              icon={<ChevronRight size={14} />}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </Surface>
    </div>
  );
};
