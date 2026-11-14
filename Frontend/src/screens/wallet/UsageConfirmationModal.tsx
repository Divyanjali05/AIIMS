import React, { useState } from 'react';
import { CheckCircle2, X, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { apiClient } from '../../api/client';
import { AITool } from '../../types';

interface UsageConfirmationModalProps {
  tool: AITool | { id: string; name: string; provider?: string };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (confirmation: any) => void;
}

export const UsageConfirmationModal: React.FC<UsageConfirmationModalProps> = ({
  tool,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [taskContext, setTaskContext] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const idempotencyKey = `confirm::${tool.id}::${Date.now()}`;
      const response = await apiClient.confirmToolUsage({
        toolId: tool.id,
        taskContext: taskContext.trim() || 'Self-guided practice',
        notes: notes.trim(),
        idempotencyKey,
      });

      if (response && response.success) {
        onSuccess(response.confirmation);
        onClose();
      } else {
        setErrorMessage(response?.error || 'Failed to record usage confirmation.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error while recording confirmation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '16px',
      }}
    >
      <Surface
        variant="bordered"
        radius="lg"
        padding="lg"
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          border: '1px solid var(--aiims-border-card, #e2e8f0)',
          boxShadow: 'var(--aiims-shadow-modal, 0 20px 25px -5px rgba(0, 0, 0, 0.1))',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3
                id="confirm-modal-title"
                style={{
                  margin: 0,
                  fontSize: '17px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-primary, #0f172a)',
                }}
              >
                Confirm Tool Usage
              </h3>
              <p
                style={{
                  margin: '2px 0 0 0',
                  fontSize: '13px',
                  color: 'var(--aiims-text-secondary, #64748b)',
                }}
              >
                Self-reported confirmation for {tool.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close confirmation modal"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--aiims-text-muted, #94a3b8)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* D6 Policy Notice */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            backgroundColor: 'var(--aiims-bg-card-subtle, #f8fafc)',
            border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            fontSize: '12.5px',
            color: 'var(--aiims-text-secondary, #64748b)',
            lineHeight: 1.45,
          }}
        >
          <ShieldCheck size={16} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
          <span>
            <strong>Manual Confirmation Standard (D6):</strong> AIIMS respects your privacy. Usage
            is recorded through your explicit self-confirmation with zero background tracking or
            device monitoring.
          </span>
        </div>

        {errorMessage && (
          <div
            role="alert"
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#dc2626',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Confirmation Form */}
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <div>
            <label
              htmlFor="confirm-tool-name"
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--aiims-text-primary, #0f172a)',
                marginBottom: '6px',
              }}
            >
              Selected Tool
            </label>
            <input
              id="confirm-tool-name"
              type="text"
              readOnly
              value={tool.name}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--aiims-border-subtle, #cbd5e1)',
                backgroundColor: 'var(--aiims-bg-card-subtle, #f1f5f9)',
                color: 'var(--aiims-text-primary, #0f172a)',
                fontSize: '13.5px',
                fontWeight: 600,
              }}
            />
          </div>

          <div>
            <label
              htmlFor="confirm-task-context"
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--aiims-text-primary, #0f172a)',
                marginBottom: '6px',
              }}
            >
              Task Context / Project Name (Optional)
            </label>
            <input
              id="confirm-task-context"
              type="text"
              placeholder="e.g. Video assignment editing, CSV statistical analysis..."
              value={taskContext}
              onChange={(e) => setTaskContext(e.target.value)}
              maxLength={250}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--aiims-border-subtle, #cbd5e1)',
                backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                color: 'var(--aiims-text-primary, #0f172a)',
                fontSize: '13.5px',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="confirm-notes"
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--aiims-text-primary, #0f172a)',
                marginBottom: '6px',
              }}
            >
              Learner Notes & Reflection (Optional)
            </label>
            <textarea
              id="confirm-notes"
              rows={3}
              placeholder="What did you learn or accomplish with this tool?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1500}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--aiims-border-subtle, #cbd5e1)',
                backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                color: 'var(--aiims-text-primary, #0f172a)',
                fontSize: '13px',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Action Buttons */}
          <div
            style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}
          >
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Confirming...' : 'Confirm Tool Usage'}
            </Button>
          </div>
        </form>
      </Surface>
    </div>
  );
};
