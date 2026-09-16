import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { useLearner, CreditTransactionItem } from '../../context/LearnerContext';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  Coins,
  CheckCircle2,
  Info,
  X,
  FileText
} from 'lucide-react';

export const CreditsScreen: React.FC = () => {
  const { state } = useLearner();
  const [selectedTx, setSelectedTx] = useState<CreditTransactionItem | null>(null);

  const balance = state.credits.balance;
  const transactions = state.credits.transactions || [];

  // Reconciled Calculation of Totals from the Transaction Ledger
  const totalEarned = transactions
    .filter((t) => t.type === 'EARN')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalSpent = transactions
    .filter((t) => t.type === 'SPEND')
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div style={{ maxWidth: '920px', margin: '32px auto', padding: '0 20px' }}>

      {/* 1. ELEGANT DAYLIGHT HEADER */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 800,
          color: '#0f172a',
          margin: '0 0 6px 0',
          fontFamily: "'Outfit', sans-serif"
        }}>
          AIIMS Credits
        </h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: '15px', fontWeight: 500 }}>
          Your Credits reflect meaningful progress through AIIMS.
        </p>
      </div>


      {/* 2. DYNAMIC BALANCE HERO ANCHOR */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
        borderRadius: '28px',
        padding: '36px 40px',
        color: '#ffffff',
        marginBottom: '28px',
        boxShadow: '0 12px 30px rgba(79, 70, 229, 0.22)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Ambient background glow */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, rgba(0, 0, 0, 0) 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ zIndex: 2 }}>
          <div style={{
            fontSize: '13px',
            color: '#c7d2fe',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            <Wallet size={16} /> Authoritative Credit Wallet
          </div>

          <div style={{
            fontSize: '52px',
            fontWeight: 800,
            color: '#ffffff',
            margin: '8px 0',
            fontFamily: "'Outfit', sans-serif",
            lineHeight: 1
          }}>
            {balance}
          </div>

          <div style={{ fontSize: '16px', color: '#e0e7ff', fontWeight: 600 }}>
            AIIMS Credits available
          </div>
        </div>

        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '24px',
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2
        }}>
          <Coins style={{ width: '38px', height: '38px', color: '#ffffff' }} />
        </div>
      </div>


      {/* 3. RECONCILED CREDIT SUMMARY BAR */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {/* Available */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '20px 24px',
          border: '1px solid #eef2f6',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Available
          </span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginTop: '4px', fontFamily: "'Outfit', sans-serif" }}>
            {balance}
          </div>
        </div>

        {/* Earned */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '20px 24px',
          border: '1px solid #eef2f6',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
            Earned
          </span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#059669', marginTop: '4px', fontFamily: "'Outfit', sans-serif" }}>
            +{totalEarned}
          </div>
        </div>

        {/* Used */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '20px 24px',
          border: '1px solid #eef2f6',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Used
          </span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#475569', marginTop: '4px', fontFamily: "'Outfit', sans-serif" }}>
            {totalSpent}
          </div>
        </div>
      </div>


      {/* 4. ACTIVITY HISTORY (YOUR CREDIT ACTIVITY) */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '28px 32px',
        border: '1px solid #eef2f6',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
        marginBottom: '32px'
      }}>
        <h2 style={{
          margin: '0 0 20px 0',
          fontSize: '20px',
          fontWeight: 800,
          color: '#0f172a',
          fontFamily: "'Outfit', sans-serif"
        }}>
          Your Credit Activity
        </h2>

        {transactions.length === 0 ? (
          /* Empty State */
          <div style={{ textAlign: 'center', padding: '36px 20px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              backgroundColor: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              color: '#94a3b8'
            }}>
              <FileText size={24} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#334155', margin: '0 0 4px 0' }}>
              No Credit activity yet
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Complete meaningful AIIMS activities to start building your Credits.
            </p>
          </div>
        ) : (
          /* Real Activity List */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                    padding: '16px 20px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      backgroundColor: isEarn ? '#ecfdf5' : '#fff1f2',
                      border: isEarn ? '1px solid #a7f3d0' : '1px solid #fecdd3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {isEarn ? (
                        <ArrowDownLeft style={{ color: '#059669', width: '18px', height: '18px' }} />
                      ) : (
                        <ArrowUpRight style={{ color: '#e11d48', width: '18px', height: '18px' }} />
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                        {tx.description}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {tx.timestamp}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    color: isEarn ? '#059669' : '#e11d48',
                    fontFamily: "'Outfit', sans-serif"
                  }}>
                    {isEarn ? `+${tx.amount}` : `-${tx.amount}`} AC
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* 5. HOW CREDITS WORK SECTION */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '28px 32px',
        border: '1px solid #eef2f6',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Info style={{ width: '20px', height: '20px', color: '#4f46e5' }} />
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 800,
            color: '#0f172a',
            fontFamily: "'Outfit', sans-serif"
          }}>
            How Credits work
          </h2>
        </div>

        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
          Credits recognise meaningful activity in AIIMS. They are not a score and they do not measure your ability.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div style={{ padding: '18px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              Earn Credits
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.45 }}>
              Complete meaningful AIIMS activities such as baseline assessments and signal investigations.
            </p>
          </div>

          <div style={{ padding: '18px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              Use Credits
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.45 }}>
              Some future learning, mentoring, or exploration experiences may use Credits.
            </p>
          </div>

          <div style={{ padding: '18px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              Track your progress
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.45 }}>
              Your activity history shows exactly where Credits came from.
            </p>
          </div>
        </div>

        <p style={{ margin: '20px 0 0 0', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
          More ways to earn and use Credits will appear as your AIIMS journey develops.
        </p>
      </div>


      {/* 6. TRANSACTION DETAIL MODAL */}
      {selectedTx && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '440px',
            width: '90%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Transaction Detail
              </h3>
              <X style={{ width: '18px', height: '18px', color: '#94a3b8', cursor: 'pointer' }} onClick={() => setSelectedTx(null)} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Activity</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedTx.description}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Credits</span>
                <span style={{ fontWeight: 800, color: selectedTx.type === 'EARN' ? '#059669' : '#e11d48' }}>
                  {selectedTx.type === 'EARN' ? `+${selectedTx.amount}` : `-${selectedTx.amount}`} AC
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Date</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>{selectedTx.timestamp}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Reference ID</span>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>{selectedTx.id}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedTx(null)}
              style={{
                width: '100%',
                marginTop: '24px',
                padding: '12px',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
