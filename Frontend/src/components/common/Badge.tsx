import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'primary'
    | 'success'
    | 'warning'
    | 'cyan'
    | 'purple'
    | 'neutral'
    | 'outline'
    | 'sky'
    | 'mint'
    | 'sunshine'
    | 'coral'
    | 'lavender'
    | 'level1'
    | 'level2'
    | 'level3'
    | 'level4';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  style,
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'level3':
      case 'mint':
      case 'success':
        return {
          backgroundColor: 'var(--aiims-token-mint-bg, #ecfdf5)',
          color: 'var(--aiims-token-mint-text, #047857)',
          border: '1px solid var(--aiims-token-mint-border, #a7f3d0)',
        };
      case 'sunshine':
      case 'warning':
        return {
          backgroundColor: 'var(--aiims-token-sunshine-bg, #fefce8)',
          color: 'var(--aiims-token-sunshine-text, #854d0e)',
          border: '1px solid var(--aiims-token-sunshine-border, #fde047)',
        };
      case 'level2':
      case 'sky':
      case 'cyan':
        return {
          backgroundColor: 'var(--aiims-token-sky-bg, #f0f9ff)',
          color: 'var(--aiims-token-sky-text, #0369a1)',
          border: '1px solid var(--aiims-token-sky-border, #bae6fd)',
        };
      case 'level1':
      case 'lavender':
      case 'purple':
        return {
          backgroundColor: 'var(--aiims-token-lavender-bg, #f5f3ff)',
          color: 'var(--aiims-token-lavender-text, #5b21b6)',
          border: '1px solid var(--aiims-token-lavender-border, #ddd6fe)',
        };
      case 'level4':
      case 'coral':
        return {
          backgroundColor: 'var(--aiims-token-coral-bg, #fff1f2)',
          color: 'var(--aiims-token-coral-text, #be123c)',
          border: '1px solid var(--aiims-token-coral-border, #fecdd3)',
        };
      case 'neutral':
        return {
          backgroundColor: 'var(--aiims-bg-card-hover, #f8f7fd)',
          color: 'var(--aiims-text-secondary, #334155)',
          border: '1px solid var(--aiims-border-card, #ede9fe)',
        };
      case 'outline':
        return {
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          color: 'var(--aiims-text-secondary, #475569)',
          border: '1px solid var(--aiims-border-card, #cbd5e1)',
        };
      case 'primary':
      default:
        return {
          backgroundColor: 'var(--aiims-card-banner-bg, #eef2ff)',
          color: 'var(--aiims-primary, #4338ca)',
          border: '1px solid var(--aiims-border-card, #c7d2fe)',
        };
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
        ...style,
      }}
    >
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
