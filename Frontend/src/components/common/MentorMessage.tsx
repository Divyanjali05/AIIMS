import React from 'react';
import { Sparkles } from 'lucide-react';

export interface MentorMessageProps {
  title?: string;
  message: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

export const MentorMessage: React.FC<MentorMessageProps> = ({
  title = 'AIIMS MENTOR OBSERVATION',
  message,
  action,
  style
}) => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #4c1d95 100%)',
      borderRadius: '20px',
      padding: '22px 28px',
      color: '#ffffff',
      border: '1px solid rgba(199, 210, 254, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '20px',
      boxShadow: '0 10px 30px rgba(99, 102, 241, 0.25)',
      position: 'relative',
      overflow: 'hidden',
      ...style
    }}>
      {/* Decorative Glow */}
      <div style={{
        position: 'absolute',
        top: '-40px',
        right: '-40px',
        width: '140px',
        height: '140px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(199, 210, 254, 0.3) 0%, rgba(255, 255, 255, 0) 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ flex: 1, position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles style={{ width: '14px', height: '14px', color: '#c7d2fe' }} />
          </div>
          <span style={{
            fontSize: '11px',
            fontWeight: 900,
            letterSpacing: '1.2px',
            color: '#c7d2fe',
            textTransform: 'uppercase',
            fontFamily: "'Nunito', sans-serif"
          }}>
            {title}
          </span>
        </div>

        <p style={{
          fontSize: '15px',
          lineHeight: 1.6,
          fontWeight: 600,
          color: '#ffffff',
          fontFamily: "'Nunito', sans-serif",
          margin: 0
        }}>
          "{message}"
        </p>
      </div>

      {action && <div style={{ flexShrink: 0, position: 'relative', zIndex: 2 }}>{action}</div>}
    </div>
  );
};

