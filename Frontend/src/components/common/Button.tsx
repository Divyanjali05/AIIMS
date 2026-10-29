import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'ghost'
    | 'outline'
    | 'danger'
    | 'icon'
    | 'sky'
    | 'mint'
    | 'sunshine'
    | 'coral'
    | 'lavender'
    | 'green'
    | 'amber'
    | 'cyan'
    | 'violet'
    | 'rose'
    | 'level1'
    | 'level2'
    | 'level3'
    | 'level4';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  iconPosition = 'right',
  fullWidth = false,
  disabled,
  style,
  className = '',
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: 'var(--aiims-token-lavender-bg, #f5f3ff)',
          color: 'var(--aiims-token-lavender-accent, #7c3aed)',
          border: '1px solid var(--aiims-token-lavender-border, #ddd6fe)',
          boxShadow: '0 2px 0 var(--aiims-token-lavender-border, #ddd6fe)',
        };
      case 'outline':
        return {
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          color: 'var(--aiims-text-heading, #0f172a)',
          border: '1.5px solid var(--aiims-border-card, #cbd5e1)',
          boxShadow: '0 2px 0 var(--aiims-border-subtle, #e2e8f0)',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--aiims-text-secondary, #475569)',
          border: '1px solid transparent',
        };
      case 'danger':
        return {
          backgroundColor: '#ef4444',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 0 #dc2626, 0 4px 14px rgba(239, 68, 68, 0.25)',
        };
      case 'level2':
      case 'sky':
      case 'cyan':
        return {
          backgroundColor: '#0369a1',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 0 #075985, 0 4px 14px rgba(3, 105, 161, 0.25)',
        };
      case 'level3':
      case 'mint':
      case 'green':
        return {
          backgroundColor: '#047857',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 0 #065f46, 0 4px 14px rgba(4, 120, 87, 0.25)',
        };
      case 'sunshine':
      case 'amber':
        return {
          backgroundColor: '#854d0e',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 0 #713f12, 0 4px 14px rgba(133, 77, 14, 0.25)',
        };
      case 'level4':
      case 'coral':
      case 'rose':
        return {
          backgroundColor: '#e11d48',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 0 #be123c, 0 4px 14px rgba(225, 29, 72, 0.25)',
        };
      case 'level1':
      case 'lavender':
      case 'violet':
        return {
          backgroundColor: '#7c3aed',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 0 #6d28d9, 0 4px 14px rgba(124, 58, 237, 0.25)',
        };
      case 'icon':
        return {
          backgroundColor: 'var(--aiims-bg-card-hover, #f8f7fd)',
          color: 'var(--aiims-text-secondary, #64748b)',
          border: '1px solid var(--aiims-border-card, #e2e8f0)',
          padding: '8px',
          borderRadius: '50%',
        };
      case 'primary':
      default:
        return {
          backgroundColor: '#6366f1',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 0 #4338ca, 0 6px 18px rgba(99, 102, 241, 0.3)',
        };
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    if (variant === 'icon') return {};
    switch (size) {
      case 'sm':
        return { padding: '8px 14px', fontSize: '12px', borderRadius: '10px' };
      case 'lg':
        return { padding: '14px 28px', fontSize: '15px', borderRadius: '16px' };
      case 'md':
      default:
        return { padding: '10px 20px', fontSize: '13px', borderRadius: '12px' };
    }
  };

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: 800,
    fontFamily: "'Nunito', -apple-system, sans-serif",
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    outline: 'none',
    boxSizing: 'border-box',
    userSelect: 'none',
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...style,
  };

  return (
    <button
      disabled={disabled}

      style={baseStyle}
      className={className}
      onMouseDown={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(2px)';
        }
      }}
      onMouseUp={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
      {...props}
    >
      {icon && iconPosition === 'left' && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === 'right' && <span style={{ display: 'inline-flex' }}>{icon}</span>}
    </button>
  );
};
