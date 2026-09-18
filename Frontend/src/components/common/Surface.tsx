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
  hoverable = false
}) => {
  const getVariantStyle = (): React.CSSProperties => {
    switch (variant) {
      case 'flat':
        return {
          backgroundColor: '#ffffff',
          border: 'none'
        };
      case 'subtle':
        return {
          backgroundColor: '#f8f7fd',
          border: '1px solid #ede9fe'
        };
      case 'highlight':
        return {
          backgroundColor: '#f0eeff',
          border: '1px solid #c7d2fe'
        };
      case 'dark':
        return {
          backgroundColor: '#1e1b4b',
          color: '#ffffff',
          border: '1px solid #312e81'
        };
      case 'mint':
        return {
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#064e3b'
        };
      case 'sky':
        return {
          backgroundColor: '#e0f2fe',
          border: '1px solid #bae6fd',
          color: '#075985'
        };
      case 'amber':
        return {
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          color: '#78350f'
        };
      case 'cyan':
        return {
          backgroundColor: '#ecfeff',
          border: '1px solid #a5f3fc',
          color: '#155e75'
        };
      case 'violet':
        return {
          backgroundColor: '#f5f3ff',
          border: '1px solid #ddd6fe',
          color: '#4c1d95'
        };
      case 'rose':
        return {
          backgroundColor: '#fff1f2',
          border: '1px solid #fecdd3',
          color: '#881337'
        };
      case 'peach':
        return {
          backgroundColor: '#fff7ed',
          border: '1px solid #ffedd5',
          color: '#7c2d12'
        };
      case 'gradient-hero':
        return {
          background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #e0f2fe 100%)',
          border: '1px solid #c7d2fe',
          boxShadow: '0 8px 30px rgba(99, 102, 241, 0.1)'
        };
      case 'gradient-radar':
        return {
          background: 'linear-gradient(135deg, #e0f2fe 0%, #ecfeff 60%, #eef2ff 100%)',
          border: '1px solid #bae6fd',
          boxShadow: '0 8px 30px rgba(2, 132, 199, 0.1)'
        };
      case 'gradient-clarity':
        return {
          background: 'linear-gradient(135deg, #ecfdf5 0%, #e6fffa 60%, #e0f2fe 100%)',
          border: '1px solid #a7f3d0',
          boxShadow: '0 8px 30px rgba(5, 150, 105, 0.1)'
        };
      case 'gradient-focus':
        return {
          background: 'linear-gradient(135deg, #fffbeb 0%, #fff7ed 60%, #fef3c7 100%)',
          border: '1px solid #fde68a',
          boxShadow: '0 8px 30px rgba(217, 119, 6, 0.1)'
        };
      case 'gradient-relevance':
        return {
          background: 'linear-gradient(135deg, #eef2ff 0%, #f3e8ff 50%, #ecfdf5 100%)',
          border: '1px solid #c7d2fe',
          boxShadow: '0 8px 30px rgba(99, 102, 241, 0.12)'
        };
      case 'bordered':
      default:
        return {
          backgroundColor: '#ffffff',
          border: '1px solid #ede9fe',
          boxShadow: '0 4px 16px rgba(99, 102, 241, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)'
        };
    }
  };

  const getRadiusStyle = (): string => {
    switch (radius) {
      case 'sm': return '10px';
      case 'md': return '14px';
      case 'pill': return '9999px';
      case 'lg':
      default: return '20px';
    }
  };

  const getPaddingStyle = (): string => {
    switch (padding) {
      case 'none': return '0';
      case 'sm': return '16px';
      case 'lg': return '32px';
      case 'md':
      default: return '24px';
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
        ...style
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
          e.currentTarget.style.boxShadow = getVariantStyle().boxShadow || '0 4px 16px rgba(99, 102, 241, 0.04)';
        }
      }}
    >
      {children}
    </div>
  );
};

