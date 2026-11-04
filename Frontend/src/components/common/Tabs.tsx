import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: 'pills' | 'underline';
  size?: 'sm' | 'md';
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  variant = 'pills',
  size = 'md',
}) => {
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: variant === 'pills' ? '6px' : '16px',
        borderBottom:
          variant === 'underline' ? '1px solid var(--aiims-border-card, #ede9fe)' : 'none',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        padding: variant === 'pills' ? '4px' : '0',
        backgroundColor:
          variant === 'pills' ? 'var(--aiims-bg-card-hover, #f8f7fd)' : 'transparent',
        borderRadius: variant === 'pills' ? '12px' : '0',
      }}
    >
      {items.map((tab) => {
        const isActive = tab.id === activeId;

        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: size === 'sm' ? '6px 12px' : '8px 16px',
              fontSize: size === 'sm' ? '12px' : '13.5px',
              fontWeight: isActive ? 700 : 600,
              fontFamily: 'inherit',
              color: isActive
                ? 'var(--aiims-primary, #6366f1)'
                : 'var(--aiims-text-secondary, #64748b)',
              backgroundColor:
                variant === 'pills'
                  ? isActive
                    ? 'var(--aiims-bg-card, #ffffff)'
                    : 'transparent'
                  : 'transparent',
              border: 'none',
              borderBottom:
                variant === 'underline'
                  ? isActive
                    ? '2px solid var(--aiims-primary, #6366f1)'
                    : '2px solid transparent'
                  : 'none',
              borderRadius: variant === 'pills' ? '9px' : '0',
              boxShadow:
                variant === 'pills' && isActive ? '0 2px 6px rgba(99, 102, 241, 0.08)' : 'none',
              cursor: tab.disabled ? 'not-allowed' : 'pointer',
              opacity: tab.disabled ? 0.5 : 1,
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              outline: 'none',
            }}
          >
            {tab.icon && <span style={{ display: 'flex', alignItems: 'center' }}>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && (
              <span style={{ display: 'flex', alignItems: 'center' }}>{tab.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
