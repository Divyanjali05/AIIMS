import React from 'react';

export interface SurfaceProps {
  children: React.ReactNode;
  variant?:
    | 'flat'
    | 'bordered'
    | 'subtle'
    | 'highlight'
    | 'dark'
    | 'mint'
    | 'sky'
    | 'amber'
    | 'cyan'
    | 'violet'
    | 'rose'
    | 'peach'
    | 'sunshine'
    | 'coral'
    | 'lavender'
    | 'level1'
    | 'level2'
    | 'level3'
    | 'level4'
    | 'gradient-hero'
    | 'gradient-radar'
    | 'gradient-clarity'
    | 'gradient-focus'
    | 'gradient-relevance';
  radius?: 'sm' | 'md' | 'lg' | 'pill';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Surface: React.FC<SurfaceProps> = ({
  children,
  variant = 'bordered',
  radius = 'lg',
  padding = 'md',
  className = '',
  style,
  onClick,
  hoverable = false,
}) => {
  const getVariantStyle = (): React.CSSProperties => {
    switch (variant) {
      case 'flat':
        return {
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          border: 'none',
          color: 'var(--aiims-text-primary, #0f172a)',
        };
      case 'subtle':
        return {
          backgroundColor: 'var(--aiims-bg-card-hover, #f8f7fd)',
          border: '1px solid var(--aiims-border-card, #ede9fe)',
          color: 'var(--aiims-text-primary, #0f172a)',
        };
      case 'highlight':
        return {
          backgroundColor: 'var(--aiims-card-banner-bg, #f0eeff)',
          border: '1px solid var(--aiims-border-card, #c7d2fe)',
          color: 'var(--aiims-text-primary, #0f172a)',
        };
      case 'dark':
        return {
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          color: 'var(--aiims-text-primary, #0f172a)',
          border: '1px solid var(--aiims-border-card, #ede9fe)',
        };
      case 'level1':
      case 'lavender':
        return {
          backgroundColor: 'var(--aiims-token-lavender-bg, #f5f3ff)',
          border: '1.5px solid var(--aiims-token-lavender-border, #ddd6fe)',
          color: 'var(--aiims-token-lavender-text, #5b21b6)',
        };
      case 'level2':
      case 'sky':
        return {
          backgroundColor: 'var(--aiims-token-sky-bg, #f0f9ff)',
          border: '1.5px solid var(--aiims-token-sky-border, #bae6fd)',
          color: 'var(--aiims-token-sky-text, #0369a1)',
        };
      case 'level3':
      case 'mint':
        return {
          backgroundColor: 'var(--aiims-token-mint-bg, #ecfdf5)',
          border: '1.5px solid var(--aiims-token-mint-border, #a7f3d0)',
          color: 'var(--aiims-token-mint-text, #047857)',
        };
      case 'level4':
      case 'coral':
        return {
          backgroundColor: 'var(--aiims-token-coral-bg, #fff1f2)',
          border: '1.5px solid var(--aiims-token-coral-border, #fecdd3)',
          color: 'var(--aiims-token-coral-text, #be123c)',
        };
      case 'sunshine':
        return {
          backgroundColor: 'var(--aiims-token-sunshine-bg, #fefce8)',
          border: '1.5px solid var(--aiims-token-sunshine-border, #fde047)',
          color: 'var(--aiims-token-sunshine-text, #854d0e)',
        };
      case 'amber':
        return {
          backgroundColor: 'var(--aiims-card-amber-bg, #fffbeb)',
          border: '1px solid var(--aiims-card-amber-border, #fde68a)',
          color: 'var(--aiims-card-amber-text, #78350f)',
        };
      case 'cyan':
        return {
          backgroundColor: 'var(--aiims-card-cyan-bg, #ecfeff)',
          border: '1px solid var(--aiims-card-cyan-border, #a5f3fc)',
          color: 'var(--aiims-card-cyan-text, #155e75)',
        };
      case 'violet':
        return {
          backgroundColor: 'var(--aiims-card-violet-bg, #f5f3ff)',
          border: '1px solid var(--aiims-card-violet-border, #ddd6fe)',
          color: 'var(--aiims-card-violet-text, #4c1d95)',
        };
      case 'rose':
        return {
          backgroundColor: 'var(--aiims-card-rose-bg, #fff1f2)',
          border: '1px solid var(--aiims-card-rose-border, #fecdd3)',
          color: 'var(--aiims-card-rose-text, #881337)',
        };
      case 'peach':
        return {
          backgroundColor: 'var(--aiims-card-peach-bg, #fff7ed)',
          border: '1px solid var(--aiims-card-peach-border, #ffedd5)',
          color: 'var(--aiims-card-peach-text, #7c2d12)',
        };
      case 'gradient-hero':
        return {
          background:
            'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 50%, rgba(2, 132, 199, 0.12) 100%)',
          border: '1px solid var(--aiims-border-card, #c7d2fe)',
          boxShadow: 'var(--aiims-shadow-card, 0 8px 30px rgba(99, 102, 241, 0.1))',
          color: 'var(--aiims-text-primary, #0f172a)',
        };
      case 'gradient-radar':
        return {
          background:
            'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(6, 182, 212, 0.1) 60%, rgba(99, 102, 241, 0.12) 100%)',
          border: '1px solid var(--aiims-border-card, #bae6fd)',
          boxShadow: 'var(--aiims-shadow-card, 0 8px 30px rgba(2, 132, 199, 0.1))',
          color: 'var(--aiims-text-primary, #0f172a)',
        };
      case 'gradient-clarity':
        return {
          background:
            'linear-gradient(135deg, rgba(5, 150, 105, 0.15) 0%, rgba(16, 185, 129, 0.1) 60%, rgba(2, 132, 199, 0.1) 100%)',
          border: '1px solid var(--aiims-border-card, #a7f3d0)',
          boxShadow: 'var(--aiims-shadow-card, 0 8px 30px rgba(5, 150, 105, 0.1))',
          color: 'var(--aiims-text-primary, #0f172a)',
        };
      case 'gradient-focus':
        return {
          background:
            'linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, rgba(249, 115, 22, 0.1) 60%, rgba(245, 158, 11, 0.1) 100%)',
          border: '1px solid var(--aiims-border-card, #fde68a)',
          boxShadow: 'var(--aiims-shadow-card, 0 8px 30px rgba(217, 119, 6, 0.1))',
          color: 'var(--aiims-text-primary, #0f172a)',
        };
      case 'gradient-relevance':
        return {
          background:
            'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.1) 50%, rgba(16, 185, 129, 0.1) 100%)',
          border: '1px solid var(--aiims-border-card, #c7d2fe)',
          boxShadow: 'var(--aiims-shadow-card, 0 8px 30px rgba(99, 102, 241, 0.12))',
          color: 'var(--aiims-text-primary, #0f172a)',
        };
      case 'bordered':
      default:
        return {
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          border: '1px solid var(--aiims-border-card, #ede9fe)',
          boxShadow:
            'var(--aiims-shadow-card, 0 4px 16px rgba(99, 102, 241, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02))',
          color: 'var(--aiims-text-primary, #0f172a)',
        };
    }
  };

  const getRadiusStyle = (): string => {
    switch (radius) {
      case 'sm':
        return '10px';
      case 'md':
        return '14px';
      case 'pill':
        return '9999px';
      case 'lg':
      default:
        return '20px';
    }
  };

  const getPaddingStyle = (): string => {
    switch (padding) {
      case 'none':
        return '0';
      case 'sm':
        return '16px';
      case 'lg':
        return '32px';
      case 'md':
      default:
        return '24px';
    }
  };

  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        borderRadius: getRadiusStyle(),
        padding: getPaddingStyle(),
        boxSizing: 'border-box',
        cursor: onClick ? 'pointer' : 'default',
        transition: hoverable ? 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        ...getVariantStyle(),
        ...style,
      }}
      onMouseEnter={(e) => {
        if (hoverable && onClick) {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 12px 30px rgba(99, 102, 241, 0.12)';
        }
      }}
      onMouseLeave={(e) => {
        if (hoverable && onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow =
            getVariantStyle().boxShadow || '0 4px 16px rgba(99, 102, 241, 0.04)';
        }
      }}
    >
      {children}
    </div>
  );
};
