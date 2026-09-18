import React, { useState } from 'react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { useLearner, CreditTransactionItem } from '../../context/LearnerContext';
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
  CheckCircle2
} from 'lucide-react';

export const CreditsScreen: React.FC = () => {
  const { state } = useLearner();
  const [selectedTx, setSelectedTx] = useState<CreditTransactionItem | null>(null);

  const balance = state.credits.balance;
  const transactions = state.credits.transactions || [];

  const totalEarned = transactions
    .filter((t) => t.type === 'EARN')
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div style={{ maxWidth: '940px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* PAGE HEADER */}
      <PageHeader
        icon={<Award size={24} />}
        title="YOUR AIIMS CREDITS"
        description="AIIMS Credits recognise meaningful learning progress, baseline diagnostic completion, and technical signal investigations."
      />

      {/* CREDITS DISPLAY ANCHOR */}
      <Surface variant="bordered" radius="lg" padding="lg" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 70%, #ecfdf5 100%)', borderLeft: '6px solid #d97706' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={14} /> PERSISTENT LEARNING BALANCE
            </div>

            <div style={{ fontSize: '40px', fontWeight: 800, color: '#0f172a', margin: '4px 0', fontFamily: "'Fredoka', sans-serif", lineHeight: 1 }}>
              {balance} <span style={{ fontSize: '16px', color: '#d97706', fontWeight: 700 }}>AIIMS Credits</span>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
              Earned by taking diagnostic assessments, exploring clarity lessons, and investigating AI market signals.
            </p>
          </div>

          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #fde68a'
          }}>
            <Coins style={{ width: '32px', height: '32px', color: '#d97706' }} />
          </div>
        </div>
      </Surface>

      {/* 1. HOW YOU HAVE EARNED THEM */}
      <Surface variant="bordered" radius="lg" padding="lg">
        <h2 style={{ margin: '0 0 14px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a', fontFamily: "'Fredoka', sans-serif" }}>
          How You Earn Credits
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5', marginBottom: '4px' }}>+50 AC</div>
            <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Baseline Diagnostic</h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Complete 25 questions across 5 dimensions.</p>
          </div>

          <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7', marginBottom: '4px' }}>+30 AC</div>
            <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Signal Investigation</h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Research technical shifts & submit reflections.</p>
          </div>

          <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#059669', marginBottom: '4px' }}>+25 AC</div>
            <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Relevance Synthesis</h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Calculate personal AI payoff & action plan.</p>
          </div>
        </div>
      </Surface>

      {/* 2. ACTIVITY HISTORY */}
      <Surface variant="bordered" radius="lg" padding="lg">
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a', fontFamily: "'Fredoka', sans-serif" }}>
          Learning Activity History
        </h2>

        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 16px' }}>
            <FileText size={24} style={{ color: '#94a3b8', marginBottom: '8px' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#334155', margin: '0 0 2px 0' }}>
              No Credit activity yet
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Complete baseline assessment or signal investigation to build credits.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {transactions.map((tx) => {
              const isEarn = tx.type === 'EARN';
              return (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: isEarn ? '#ecfdf5' : '#fff1f2',
                      border: isEarn ? '1px solid #a7f3d0' : '1px solid #fecdd3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <CheckCircle2 style={{ color: '#059669', width: '16px', height: '16px' }} />
                    </div>

                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        {tx.description}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {tx.timestamp}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    color: '#059669',
                    fontFamily: "'Fredoka', sans-serif"
                  }}>
                    +{tx.amount} AC
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Surface>

    </div>
  );
};
