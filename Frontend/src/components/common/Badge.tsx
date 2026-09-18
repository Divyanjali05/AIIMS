import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'cyan' | 'purple' | 'neutral';
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
        return { backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' };
      case 'warning':
        return { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
      case 'cyan':
        return { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' };
      case 'purple':
        return { backgroundColor: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff' };
      case 'neutral':
        return { backgroundColor: '#f4f3ff', color: '#475569', border: '1px solid #ede9fe' };
      case 'primary':
      default:
        return { backgroundColor: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' };
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

