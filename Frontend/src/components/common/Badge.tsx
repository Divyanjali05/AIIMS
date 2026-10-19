import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'cyan' | 'purple' | 'neutral' | 'outline';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  style
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'success':
        return { backgroundColor: 'var(--aiims-card-mint-bg, #ecfdf5)', color: 'var(--aiims-card-mint-text, #047857)', border: '1px solid var(--aiims-card-mint-border, #a7f3d0)' };
      case 'warning':
        return { backgroundColor: 'var(--aiims-card-amber-bg, #fef3c7)', color: 'var(--aiims-card-amber-text, #b45309)', border: '1px solid var(--aiims-card-amber-border, #fde68a)' };
      case 'cyan':
        return { backgroundColor: 'var(--aiims-card-cyan-bg, #e0f2fe)', color: 'var(--aiims-card-cyan-text, #0369a1)', border: '1px solid var(--aiims-card-cyan-border, #bae6fd)' };
      case 'purple':
        return { backgroundColor: 'var(--aiims-card-violet-bg, #f3e8ff)', color: 'var(--aiims-card-violet-text, #6b21a8)', border: '1px solid var(--aiims-card-violet-border, #e9d5ff)' };
      case 'neutral':
        return { backgroundColor: 'var(--aiims-bg-card-hover, #f4f3ff)', color: 'var(--aiims-text-secondary, #475569)', border: '1px solid var(--aiims-border-card, #ede9fe)' };
      case 'outline':
        return { backgroundColor: 'var(--aiims-bg-card, #ffffff)', color: 'var(--aiims-text-secondary, #64748b)', border: '1px solid var(--aiims-border-card, #cbd5e1)' };
      case 'primary':
      default:
        return { backgroundColor: 'var(--aiims-card-banner-bg, #eef2ff)', color: 'var(--aiims-primary, #4338ca)', border: '1px solid var(--aiims-border-card, #c7d2fe)' };
    }
  };

  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: isSmall ? '3px 9px' : '5px 14px',
        borderRadius: '9999px',
        fontSize: isSmall ? '11px' : '12px',
        fontWeight: 800,
        fontFamily: "'Nunito', -apple-system, sans-serif",
        lineHeight: 1.2,
        boxSizing: 'border-box',
        whiteSpace: 'nowrap',
        ...getVariantStyles(),
        ...style
      }}
    >
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

