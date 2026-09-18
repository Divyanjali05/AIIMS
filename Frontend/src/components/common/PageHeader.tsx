import React from 'react';
import { Badge } from './Badge';

export interface PageHeaderProps {
  sectionLabel?: string;
  title: string;
  description?: string;
  badge?: { label: string; variant?: 'primary' | 'success' | 'warning' | 'cyan' | 'purple' | 'neutral'; icon?: React.ReactNode };
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  sectionLabel,
  title,
  description,
  badge,
  action,
  icon
}) => {
  return (
    <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px' }}>
      <div>
        {sectionLabel && (
          <div style={{
            fontSize: '11px',
            fontWeight: 900,
            color: '#6366f1',
            letterSpacing: '1.2px',
            textTransform: 'uppercase',
            marginBottom: '6px',
            fontFamily: "'Nunito', sans-serif"
          }}>
            {sectionLabel}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {icon && <span style={{ display: 'inline-flex', color: '#6366f1' }}>{icon}</span>}
          <h1 style={{
            margin: 0,
            fontSize: '30px',
            fontWeight: 700,
            color: '#1e1b4b',
            fontFamily: "'Fredoka', 'Outfit', sans-serif",
            letterSpacing: '-0.3px',
            lineHeight: 1.2
          }}>
            {title}
          </h1>
          {badge && <Badge variant={badge.variant} icon={badge.icon}>{badge.label}</Badge>}
        </div>

        {description && (
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#64748b', fontWeight: 600, fontFamily: "'Nunito', sans-serif", lineHeight: 1.5 }}>
            {description}
          </p>
        )}
      </div>

      {action && <div>{action}</div>}
    </div>
  );
};

