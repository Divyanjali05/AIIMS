import React from 'react';
import { Trash2, ShieldCheck } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export interface ConfirmRemoveModalProps {
  tool: { id: string; name: string } | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (toolId: string) => void;
  isRemoving?: boolean;
}

export const ConfirmRemoveModal: React.FC<ConfirmRemoveModalProps> = ({
  tool,
  isOpen,
  onClose,
  onConfirm,
  isRemoving = false,
}) => {
  if (!tool) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="460px"
      title={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--aiims-token-coral-text, #be123c)',
          }}
        >
          <Trash2 size={18} />
          <span>Remove Tool from AI Wallet?</span>
        </div>
      }
      subtitle={
        <span style={{ fontSize: '12.5px', color: 'var(--aiims-text-muted)' }}>
          Confirm tool removal from your personal toolkit stack.
        </span>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isRemoving}>
            Keep in Wallet
          </Button>
          <Button
            variant="outline"
            size="sm"
            style={{
              borderColor: 'var(--aiims-token-coral-border, #fecdd3)',
              color: 'var(--aiims-token-coral-text, #be123c)',
              backgroundColor: 'var(--aiims-token-coral-bg, #fff1f2)',
            }}
            disabled={isRemoving}
            onClick={() => onConfirm(tool.id)}
            icon={<Trash2 size={13} />}
          >
            {isRemoving ? 'Removing...' : 'Confirm Remove'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p
          style={{
            margin: 0,
            fontSize: '13.5px',
            color: 'var(--aiims-text-secondary)',
            lineHeight: 1.5,
          }}
        >
          Are you sure you want to remove{' '}
          <strong style={{ color: 'var(--aiims-text-heading)' }}>{tool.name}</strong> from your
          active AI Wallet?
        </p>

        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--aiims-bg-card-hover)',
            border: '1px solid var(--aiims-border-subtle)',
            fontSize: '12px',
            color: 'var(--aiims-text-muted)',
            lineHeight: 1.45,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              color: 'var(--aiims-text-primary)',
              marginBottom: '3px',
            }}
          >
            <ShieldCheck size={14} style={{ color: 'var(--aiims-token-mint-text, #047857)' }} />
            Zero Economy Charge
          </div>
          Tool removal is free of charge (0 AC fee, 0 XP deduction). The tool remains available in
          the catalog and can be re-added anytime.
        </div>
      </div>
    </Modal>
  );
};
