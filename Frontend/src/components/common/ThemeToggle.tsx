import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, ChevronDown } from 'lucide-react';
import { useTheme, ThemeMode } from '../../context/ThemeContext';

interface ThemeToggleProps {
  showDropdown?: boolean;
  size?: 'sm' | 'md';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ showDropdown = false, size = 'md' }) => {
  const { mode, theme, setThemeMode, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const isLight = theme === 'light';

  // Quick 1-click toggle when dropdown is false
  if (!showDropdown) {
    return (
      <button
        onClick={toggleTheme}
        aria-label={`Switch to ${isLight ? 'Dark' : 'Light'} Theme`}
        title={`Current theme: ${theme} (${mode} mode). Click to switch to ${isLight ? 'Dark' : 'Light'} Theme.`}
        style={{
          width: size === 'sm' ? '34px' : '38px',
          height: size === 'sm' ? '34px' : '38px',
          borderRadius: '12px',
          backgroundColor: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)',
          border: isLight ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: isLight ? '#D97706' : '#FBBF24',
          transition: 'all 0.2s ease',
          outline: 'none',
          boxShadow: isLight ? '0 1px 3px rgba(0, 0, 0, 0.05)' : 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.borderColor = isLight ? '#6D5DFB' : '#8B5CF6';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.borderColor = isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.12)';
        }}
      >
        {isLight ? (
          <Sun size={size === 'sm' ? 16 : 18} />
        ) : (
          <Moon size={size === 'sm' ? 16 : 18} />
        )}
      </button>
    );
  }

  // Dropdown variant for explicit Light/Dark/System selection
  const options: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'light', label: 'Light', icon: <Sun size={15} /> },
    { mode: 'dark', label: 'Dark', icon: <Moon size={15} /> },
    { mode: 'system', label: 'System', icon: <Laptop size={15} /> }
  ];

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Theme settings"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 10px',
          borderRadius: '10px',
          backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
          border: isLight ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.12)',
          color: isLight ? '#172033' : '#F8FAFC',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.2s ease'
        }}
      >
        {mode === 'system' ? <Laptop size={14} /> : isLight ? <Sun size={14} color="#D97706" /> : <Moon size={14} color="#FBBF24" />}
        <span style={{ textTransform: 'capitalize' }}>{mode}</span>
        <ChevronDown size={12} style={{ opacity: 0.7 }} />
      </button>

      {isOpen && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: '130px',
            backgroundColor: isLight ? '#FFFFFF' : '#10162A',
            border: isLight ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            boxShadow: isLight
              ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
              : '0 16px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(139, 92, 246, 0.15)',
            padding: '6px',
            zIndex: 300,
            backdropFilter: 'blur(16px)'
          }}
        >
          {options.map((opt) => {
            const isSelected = mode === opt.mode;
            return (
              <button
                key={opt.mode}
                role="menuitem"
                onClick={() => {
                  setThemeMode(opt.mode);
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  backgroundColor: isSelected
                    ? isLight
                      ? 'rgba(109, 93, 251, 0.1)'
                      : 'rgba(139, 92, 246, 0.2)'
                    : 'transparent',
                  border: 'none',
                  color: isSelected
                    ? isLight
                      ? '#6D5DFB'
                      : '#C4B5FD'
                    : isLight
                    ? '#475569'
                    : '#CBD5E1',
                  fontSize: '12.5px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease'
                }}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
