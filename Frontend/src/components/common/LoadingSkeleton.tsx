import React from 'react';

export interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: React.CSSProperties;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  borderRadius = '6px',
  style,
  className = '',
}) => {
  return (
    <div
      aria-hidden="true"
      className={`aiims-skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'var(--aiims-border-subtle, #ede9fe)',
        opacity: 0.65,
        animation: 'pulse 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div
      style={{
        padding: '20px',
        borderRadius: '14px',
        backgroundColor: 'var(--aiims-bg-card, #ffffff)',
        border: '1px solid var(--aiims-border-card, #ede9fe)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Skeleton width="45%" height="20px" borderRadius="8px" />
        <Skeleton width="25%" height="16px" borderRadius="12px" />
      </div>
      <Skeleton width="85%" height="14px" />
      <Skeleton width="65%" height="14px" />
      <div style={{ marginTop: '12px' }}>
        <Skeleton width="100%" height="36px" borderRadius="10px" />
      </div>
    </div>
  );
};
