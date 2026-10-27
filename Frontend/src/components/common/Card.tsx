import React from 'react';
import { Lock } from 'lucide-react';
import { SurfaceProps } from './Surface';

export type CardIconSize = 'inline' | 'button' | 'header' | 'level';

export interface CardImageProps {
  src: string;
  alt?: string;
  aspectRatio?: string;
}

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  iconSize?: CardIconSize;
  badge?: React.ReactNode;
  image?: CardImageProps;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: SurfaceProps['variant'];
  radius?: 'default' | 'sm' | 'md' | 'lg' | 'pill';
  padding?: 'default' | 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  interactive?: boolean;
  selected?: boolean;
  locked?: boolean;
  lockReason?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  description,
  icon,
  iconSize = 'header',
  badge,
  image,
  actions,
  footer,
  variant = 'bordered',
  radius = 'default',
  padding = 'default',
  hoverable = false,
  interactive,
  selected = false,
  locked = false,
  lockReason,
  className = '',
  style,
  children,
  onClick,
  onKeyDown,
  ...restProps
}) => {
  const isInteractive = interactive !== undefined ? interactive : !!onClick;

  // Icon sizing standard:
  // inline = 16px, button = 20px, header = 24px, level = 32px
  const getIconContainerSize = (): { width: string; height: string; fontSize?: string } => {
    switch (iconSize) {
      case 'inline':
        return { width: '16px', height: '16px' };
      case 'button':
        return { width: '20px', height: '20px' };
      case 'level':
        return { width: '32px', height: '32px' };
      case 'header':
      default:
        return { width: '24px', height: '24px' };
    }
  };

  // Border radius standards: default = 12px
  const getRadiusValue = (): string => {
    switch (radius) {
      case 'sm':
        return '10px';
      case 'md':
        return '14px';
      case 'lg':
        return '20px';
      case 'pill':
        return '9999px';
      case 'default':
      default:
        return 'var(--aiims-card-radius, 12px)';
    }
  };

  // Card padding standards: default = 16px phone / 20px desktop
  const getPaddingValue = (): string => {
    switch (padding) {
      case 'none':
        return '0';
      case 'sm':
        return '12px 14px';
      case 'md':
        return '16px 18px';
      case 'lg':
        return '24px';
      case 'default':
      default:
        return 'var(--aiims-card-padding, 20px)';
    }
  };

  // Surface Variant Styling
  const getVariantStyles = (): React.CSSProperties => {
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
          border: selected
            ? '2px solid var(--aiims-primary, #6366f1)'
            : '1px solid var(--aiims-border-card, #ede9fe)',
          boxShadow: 'var(--aiims-shadow-card, 0 4px 16px rgba(99, 102, 241, 0.04))',
          color: 'var(--aiims-text-primary, #0f172a)',
        };
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isInteractive && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
    }
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const hasHeader = Boolean(title || icon || badge || actions);

  return (
    <div
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-disabled={locked ? true : undefined}
      title={locked && lockReason ? lockReason : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`aiims-card ${isInteractive ? 'interactive' : ''} ${hoverable ? 'hoverable' : ''} ${className}`}
      style={{
        borderRadius: getRadiusValue(),
        padding: getPaddingValue(),
        opacity: locked ? 0.8 : 1,
        ...getVariantStyles(),
        ...style,
      }}
      {...restProps}
    >
      {/* 1. Optional 16:9 Image */}
      {image && (
        <div
          className="aiims-card-image"
          style={{
            aspectRatio: image.aspectRatio || '16 / 9',
            overflow: 'hidden',
            borderRadius: `${getRadiusValue()} ${getRadiusValue()} 0 0`,
            marginBottom: '12px',
          }}
        >
          <img
            src={image.src}
            alt={image.alt || (typeof title === 'string' ? title : 'Card preview')}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            loading="lazy"
          />
        </div>
      )}

      {/* 2. Standardized Card Header */}
      {hasHeader && (
        <div
          className="aiims-card-header"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: description || subtitle || children ? '12px' : 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            {icon && (
              <div
                style={{
                  ...getIconContainerSize(),
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {icon}
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              {title && (
                <h3
                  className="aiims-card-title truncate-1-line"
                  style={{
                    fontSize: 'var(--aiims-card-title-size, 16px)',
                    fontWeight: 'var(--aiims-card-title-weight, 600)',
                    color: 'var(--aiims-text-heading, #0f172a)',
                    margin: 0,
                    lineHeight: 1.35,
                  }}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <div
                  className="truncate-1-line"
                  style={{
                    fontSize: '12px',
                    color: 'var(--aiims-text-muted, #64748b)',
                    marginTop: '2px',
                  }}
                >
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {badge}
            {actions}
          </div>
        </div>
      )}

      {/* Locked Prerequisite Banner */}
      {locked && (
        <div
          className="aiims-card-locked-banner"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
            border: '1px solid var(--aiims-border-card, #e2e8f0)',
            color: 'var(--aiims-text-secondary, #475569)',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '12px',
          }}
        >
          <Lock size={14} color="var(--aiims-text-muted, #64748b)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, lineHeight: 1.4 }}>
            {lockReason || 'Locked: Complete prerequisite activities to unlock'}
          </span>
        </div>
      )}

      {/* 3. Standardized Card Description (Body: 14px regular, max 2 lines) */}
      {description && (
        <p
          className="aiims-card-body"
          style={{
            fontSize: 'var(--aiims-card-body-size, 14px)',
            fontWeight: 'var(--aiims-card-body-weight, 400)',
            color: 'var(--aiims-text-muted, #334155)',
            lineHeight: 1.5,
            margin: children ? '0 0 12px 0' : 0,
          }}
        >
          {description}
        </p>
      )}

      {/* 4. Custom Card Content / Children */}
      {children}

      {/* 5. Optional Card Footer */}
      {footer && (
        <div
          style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid var(--aiims-border-card, #ede9fe)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
};

// Compound Helper Components for Flexible Layouts
export const CardHeader: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    className="aiims-card-header"
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '12px',
      marginBottom: '12px',
      ...style,
    }}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, className = '', style }) => (
  <h3
    className={`aiims-card-title ${className}`}
    style={{
      fontSize: 'var(--aiims-card-title-size, 16px)',
      fontWeight: 'var(--aiims-card-title-weight, 600)',
      color: 'var(--aiims-text-heading, #0f172a)',
      margin: 0,
      lineHeight: 1.35,
      ...style,
    }}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<{
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, className = '', style }) => (
  <p
    className={`aiims-card-body ${className}`}
    style={{
      fontSize: 'var(--aiims-card-body-size, 14px)',
      fontWeight: 'var(--aiims-card-body-weight, 400)',
      color: 'var(--aiims-text-muted, #334155)',
      lineHeight: 1.5,
      margin: 0,
      ...style,
    }}
  >
    {children}
  </p>
);

export const CardFooter: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      marginTop: '16px',
      paddingTop: '12px',
      borderTop: '1px solid var(--aiims-border-card, #ede9fe)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      ...style,
    }}
  >
    {children}
  </div>
);

export default Card;
