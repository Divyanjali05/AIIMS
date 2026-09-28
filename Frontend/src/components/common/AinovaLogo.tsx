import React from 'react';

interface AinovaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  textColor?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const AinovaLogo: React.FC<AinovaLogoProps> = ({
  size = 'md',
  showWordmark = true,
  textColor = '#111827',
  onClick,
  style
}) => {
  const dimensions = {
    sm: { icon: 28, font: 16, textFont: 16, gap: 8, radius: 8 },
    md: { icon: 38, font: 20, textFont: 22, gap: 10, radius: 11 },
    lg: { icon: 48, font: 26, textFont: 26, gap: 12, radius: 14 },
    xl: { icon: 60, font: 32, textFont: 32, gap: 14, radius: 18 }
  }[size];

  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${dimensions.gap}px`,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        ...style
      }}
    >
      {/* Soft rounded geometric A mark with inner glowing AI path */}
      <div
        style={{
          width: `${dimensions.icon}px`,
          height: `${dimensions.icon}px`,
          borderRadius: `${dimensions.radius}px`,
          background: 'linear-gradient(135deg, #5B4BFF 0%, #7C3AED 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          position: 'relative',
          boxShadow: '0 6px 16px -2px rgba(91, 75, 255, 0.35)',
          overflow: 'hidden',
          flexShrink: 0
        }}
      >
        {/* Subtle background geometric AI accent line */}
        <svg
          viewBox="0 0 100 100"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0.25,
            pointerEvents: 'none'
          }}
        >
          <circle cx="50" cy="50" r="40" stroke="#ffffff" strokeWidth="6" fill="none" strokeDasharray="12 8" />
          <circle cx="80" cy="20" r="10" fill="#ffffff" />
        </svg>

        {/* Clean geometric 'A' symbol */}
        <span
          style={{
            fontWeight: 900,
            fontSize: `${dimensions.font}px`,
            fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
            letterSpacing: '-0.5px',
            color: '#ffffff',
            lineHeight: 1,
            transform: 'translateY(-0.5px)'
          }}
        >
          A
        </span>
      </div>

      {showWordmark && (
        <span
          style={{
            fontSize: `${dimensions.textFont}px`,
            fontWeight: 800,
            color: textColor,
            letterSpacing: '-0.5px',
            fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
            lineHeight: 1
          }}
        >
          AINOVA
        </span>
      )}
    </div>
  );
};
