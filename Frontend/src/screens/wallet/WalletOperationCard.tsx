import React, { useState } from 'react';
import { Coins, Zap, ShieldCheck, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { apiClient } from '../../api/client';

interface WalletOperationCardProps {
  balance: number;
  onOperationComplete: (newBalance: number) => void;
}

export const WalletOperationCard: React.FC<WalletOperationCardProps> = ({
  balance,
  onOperationComplete,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'duplicate';
    text: string;
  } | null>(null);

  const OPERATION_COST = 100;
  const hasInsufficientCredits = balance < OPERATION_COST;

  const handleExecuteOperation = async () => {
    if (hasInsufficientCredits || isRunning) return;

    setIsRunning(true);
    setStatusMessage(null);

    const idempotencyKey = `wallet::op::${Date.now()}`;

    try {
      const response = await apiClient.executeWalletOperation({
        operationName: 'AI Toolkit Optimization & Capability Analysis',
        idempotencyKey,
      });

      if (response && response.success) {
        if (response.duplicate) {
          setStatusMessage({
            type: 'duplicate',
            text: 'Operation previously completed with this idempotency key. Balance unchanged.',
          });
        } else {
          setStatusMessage({
            type: 'success',
            text: `Successfully executed wallet operation (-100 AC). New balance: ${response.balance} AC.`,
          });
          onOperationComplete(response.balance);
        }
      } else {
        const errorText =
          response?.code === 'INSUFFICIENT_CREDITS'
            ? 'Insufficient credits. You need at least 100 AC to execute this wallet operation.'
            : response?.error || 'Failed to execute wallet operation.';
        setStatusMessage({
          type: 'error',
          text: errorText,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Network error executing wallet operation.',
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Surface
      variant="bordered"
      radius="lg"
      padding="lg"
      style={{
        backgroundColor: 'var(--aiims-bg-card, #ffffff)',
        border: '1px solid var(--aiims-border-card, #e2e8f0)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              color: 'var(--aiims-primary, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Zap size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h4
                style={{
                  margin: 0,
                  fontSize: '15.5px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-primary, #0f172a)',
                }}
              >
                Advanced AI Wallet Operation
              </h4>
              <Badge variant="warning" size="sm">
                100 AC Charge
              </Badge>
            </div>
            <p
              style={{
                margin: '3px 0 0 0',
                fontSize: '13px',
                color: 'var(--aiims-text-secondary, #64748b)',
              }}
            >
              Executes multi-domain tool capability benchmarking and personal stack optimization.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge
            variant={hasInsufficientCredits ? 'warning' : 'primary'}
            size="md"
            icon={<Coins size={14} />}
          >
            Authoritative Balance: {balance} AC
          </Badge>
        </div>
      </div>

      {/* Insufficient Credit Alert */}
      {hasInsufficientCredits && (
        <div
          role="alert"
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#b45309',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>Insufficient Credits:</strong> You currently have {balance} AC. A minimum of 100
            AC is required for this operation. Earn credits by completing diagnostic assessments,
            focus practice challenges, and learning quests.
          </span>
        </div>
      )}

      {/* Status Banner */}
      {statusMessage && (
        <div
          role="status"
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            backgroundColor:
              statusMessage.type === 'success'
                ? 'rgba(16, 185, 129, 0.12)'
                : statusMessage.type === 'duplicate'
                  ? 'rgba(59, 130, 246, 0.12)'
                  : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${
              statusMessage.type === 'success'
                ? 'rgba(16, 185, 129, 0.3)'
                : statusMessage.type === 'duplicate'
                  ? 'rgba(59, 130, 246, 0.3)'
                  : 'rgba(239, 68, 68, 0.3)'
            }`,
            color:
              statusMessage.type === 'success'
                ? '#047857'
                : statusMessage.type === 'duplicate'
                  ? '#1d4ed8'
                  : '#b91c1c',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Trigger Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'var(--aiims-text-muted, #94a3b8)',
          }}
        >
          <ShieldCheck size={14} style={{ color: '#10b981' }} />
          <span>PostgreSQL interactive transaction • Atomic overdraft protection • Idempotent</span>
        </div>

        <Button
          variant="primary"
          onClick={handleExecuteOperation}
          disabled={hasInsufficientCredits || isRunning}
        >
          {isRunning ? 'Processing...' : 'Run Operation (100 AC)'}
        </Button>
      </div>
    </Surface>
  );
};
