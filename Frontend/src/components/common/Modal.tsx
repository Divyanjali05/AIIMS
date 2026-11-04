import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  closeOnBackdrop?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = '540px',
  closeOnBackdrop = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-dialog-title' : undefined}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.18s ease-out',
        boxSizing: 'border-box',
      }}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        style={{
          width: '100%',
          maxWidth,
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          borderRadius: '16px',
          border: '1px solid var(--aiims-border-card, #ede9fe)',
          boxShadow: 'var(--aiims-shadow-modal, 0 20px 40px -10px rgba(0, 0, 0, 0.2))',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden',
          animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Modal Header */}
        {(title || subtitle) && (
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--aiims-border-card, #ede9fe)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              {title && (
                <h3
                  id="modal-dialog-title"
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading, #0f172a)',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '13px',
                    color: 'var(--aiims-text-secondary, #64748b)',
                    lineHeight: 1.4,
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              icon={<X size={18} />}
              aria-label="Close dialog"
              onClick={onClose}
              style={{ padding: '6px', minWidth: 'auto', borderRadius: '8px' }}
            >
              <span className="sr-only">Close</span>
            </Button>
          </div>
        )}

        {/* Modal Body */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
            color: 'var(--aiims-text-body, #334155)',
            fontSize: '14px',
            lineHeight: 1.55,
          }}
        >
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--aiims-border-card, #ede9fe)',
              backgroundColor: 'var(--aiims-bg-card-subtle, #faf9ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
