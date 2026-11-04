import React from 'react';

export interface LinearProgressProps {
  value: number; // 0 to 100
  color?: 'primary' | 'mint' | 'sky' | 'sunshine' | 'coral' | 'lavender';
  height?: number;
  showLabel?: boolean;
}

export const LinearProgress: React.FC<LinearProgressProps> = ({
  value,
  color = 'primary',
  height = 6,
  showLabel = false,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  const getColor = () => {
    switch (color) {
      case 'mint':
        return 'var(--aiims-token-mint-accent, #059669)';
      case 'sky':
        return 'var(--aiims-token-sky-accent, #0284c7)';
      case 'sunshine':
        return 'var(--aiims-token-sunshine-accent, #d97706)';
      case 'coral':
        return 'var(--aiims-token-coral-accent, #e11d48)';
      case 'lavender':
        return 'var(--aiims-token-lavender-accent, #7c3aed)';
      case 'primary':
      default:
        return 'var(--aiims-primary, #6366f1)';
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {showLabel && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px',
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--aiims-text-secondary, #475569)',
          }}
        >
          <span>Progress</span>
          <span>{Math.round(clampedValue)}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(clampedValue)}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          width: '100%',
          height: `${height}px`,
          borderRadius: `${height / 2}px`,
          backgroundColor: 'var(--aiims-border-card, #ede9fe)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${clampedValue}%`,
            height: '100%',
            borderRadius: `${height / 2}px`,
            backgroundColor: getColor(),
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  );
};

export interface CircularProgressProps {
  value: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size = 100,
  strokeWidth = 8,
  color = 'var(--aiims-primary, #6366f1)',
  label,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(100, Math.max(0, value));
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  return (
    <div
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--aiims-border-subtle, #ede9fe)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>

      <div
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontSize: `${size * 0.2}px`,
            fontWeight: 800,
            color: 'var(--aiims-text-heading, #0f172a)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            lineHeight: 1,
          }}
        >
          {Math.round(clampedValue)}%
        </span>
        {label && (
          <span
            style={{
              fontSize: `${Math.max(9, size * 0.09)}px`,
              fontWeight: 800,
              color: 'var(--aiims-text-muted, #94a3b8)',
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              marginTop: '2px',
            }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
};
