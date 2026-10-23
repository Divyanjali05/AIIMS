import React, { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, AlertCircle, ArrowLeft, Sun, Moon, Loader2 } from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { useTheme } from '../../context/ThemeContext';
import { AiimsLogo } from '../../components/common/AiimsLogo';
import { RegisterScreen } from './RegisterScreen';
import { PublicHeroScreen } from '../home/PublicHeroScreen';

interface LoginScreenProps {
  onSuccess?: () => void;
  initialMode?: 'home' | 'login' | 'register';
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess, initialMode }) => {
  const { login } = useLearner();
  const { isDarkMode, toggleTheme } = useTheme();

  // Determine view based on URL pathname or prop
  const getModeFromPath = useCallback((): 'home' | 'login' | 'register' => {
    const path = window.location.pathname.toLowerCase();
    if (path === '/register') return 'register';
    if (path === '/login') return 'login';
    if (path === '/' || path === '/index.html' || path === '/hero' || path === '/preview-hero')
      return 'home';
    return initialMode || 'home';
  }, [initialMode]);

  const [mode, setMode] = useState<'home' | 'login' | 'register'>(getModeFromPath);

  // Sync mode with browser history and URL path
  const navigateTo = (newMode: 'home' | 'login' | 'register') => {
    setMode(newMode);
    setErrorMessage('');
    const currentPath = window.location.pathname.toLowerCase();
    const targetPath =
      newMode === 'home'
        ? currentPath === '/hero' || currentPath === '/preview-hero'
          ? currentPath
          : '/'
        : `/${newMode}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setMode(getModeFromPath());
      setErrorMessage('');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getModeFromPath]);

  // Form Fields State (login only — register is handled by RegisterScreen)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Email or password is incorrect.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(cleanEmail, password);
      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.error || 'Email or password is incorrect.');
      }
    } catch {
      setErrorMessage("We couldn't sign you in right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Delegate register mode to the new full 3-step RegisterScreen
  if (mode === 'register') {
    return (
      <RegisterScreen
        onSuccess={onSuccess}
        onNavigateToLogin={() => navigateTo('login')}
        onNavigateToHome={() => navigateTo('home')}
      />
    );
  }

  // Delegate home mode to the 3D PublicHeroScreen
  if (mode === 'home') {
    return (
      <PublicHeroScreen
        onStartJourney={() => navigateTo('register')}
        onSignIn={() => navigateTo('login')}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: 'var(--aiims-bg-page, #F8F9FE)',
        backgroundImage: isDarkMode
          ? 'radial-gradient(circle at 50% 20%, rgba(139, 92, 246, 0.14) 0%, transparent 60%)'
          : 'radial-gradient(circle at 50% 20%, rgba(109, 93, 251, 0.08) 0%, transparent 60%)',
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
        color: 'var(--aiims-text-primary, #0F172A)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      {/* Logged-out Theme Toggle */}
      <button
        id="login-theme-toggle-btn"
        onClick={toggleTheme}
        aria-label={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        style={{
          position: 'absolute',
          top: '20px',
          right: '24px',
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          border: '1px solid var(--aiims-border-card, #E2E8F0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: isDarkMode ? '#fbbf24' : '#4f46e5',
          boxShadow: 'var(--aiims-shadow-card, 0 2px 8px rgba(0,0,0,0.06))',
          transition: 'all 0.2s ease',
          zIndex: 50,
        }}
      >
        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <style>{`
        .aiims-fade-in, .ainova-fade-in {
          animation: aiimsFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes aiimsFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ainovaFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes aiimsSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .aiims-btn-primary, .ainova-btn-primary {
          background: #5B4BFF;
          color: #ffffff;
          border: 1px solid #5B4BFF;
          box-shadow: 0 4px 14px -2px rgba(91, 75, 255, 0.35);
          transition: all 0.2s ease;
          outline: none;
          cursor: pointer;
        }
        .aiims-btn-primary:hover:not(:disabled), .ainova-btn-primary:hover:not(:disabled) {
          background: #4338CA;
          border-color: #4338CA;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px -2px rgba(91, 75, 255, 0.45);
        }
        .aiims-btn-primary:focus-visible, .ainova-btn-primary:focus-visible {
          ring: 3px solid rgba(91, 75, 255, 0.4);
          outline: 2px solid #5B4BFF;
        }
        .aiims-btn-primary:disabled, .ainova-btn-primary:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
        }

        .aiims-btn-secondary, .ainova-btn-secondary {
          background: var(--aiims-bg-card, #ffffff);
          color: var(--aiims-text-primary, #1E293B);
          border: 1.5px solid var(--aiims-border-card, #E2E8F0);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          transition: all 0.2s ease;
          outline: none;
          cursor: pointer;
        }
        .aiims-btn-secondary:hover, .ainova-btn-secondary:hover {
          background: var(--aiims-bg-card-hover, #F8FAFC);
          border-color: var(--aiims-border-card, #CBD5E1);
          color: var(--aiims-text-heading, #0F172A);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }
        .aiims-btn-secondary:focus-visible, .ainova-btn-secondary:focus-visible {
          outline: 2px solid #5B4BFF;
        }

        .aiims-input, .ainova-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1.5px solid var(--aiims-input-border, #E2E8F0);
          background-color: var(--aiims-input-bg, #ffffff);
          color: var(--aiims-input-text, #0F172A);
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
          outline: none;
        }
        .aiims-input:focus, .ainova-input:focus {
          border-color: #5B4BFF;
          box-shadow: 0 0 0 3px rgba(91, 75, 255, 0.12);
        }
        .aiims-input::placeholder, .ainova-input::placeholder {
          color: var(--aiims-text-muted, #94A3B8);
        }
      `}</style>

      {/* ==================================================== */}
      {/* LOGIN PAGE                                           */}
      {/* ==================================================== */}
      <div
        className="aiims-fade-in"
        style={{
          maxWidth: '440px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Top Brand Logo & Back to Home */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '20px',
            gap: '8px',
          }}
        >
          <AiimsLogo size="lg" showWordmark={true} onClick={() => navigateTo('home')} />
          <button
            type="button"
            onClick={() => navigateTo('home')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: 'var(--aiims-text-secondary, #64748B)',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '8px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#5B4BFF')}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = 'var(--aiims-text-secondary, #64748B)')
            }
          >
            <ArrowLeft size={13} /> Back to 3D Space
          </button>
        </div>

        {/* Card Container */}
        <div
          style={{
            width: '100%',
            backgroundColor: 'var(--aiims-bg-card, #ffffff)',
            borderRadius: '20px',
            border: '1px solid var(--aiims-border-card, #E2E8F0)',
            padding: '36px 32px',
            boxShadow: 'var(--aiims-shadow-card, 0 20px 40px -15px rgba(0, 0, 0, 0.06))',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading, #0F172A)',
                letterSpacing: '-0.5px',
                margin: '0 0 6px 0',
              }}
            >
              Welcome back
            </h2>
            <p
              style={{ fontSize: '14px', color: 'var(--aiims-text-secondary, #64748B)', margin: 0 }}
            >
              Sign in to continue your AI journey.
            </p>
          </div>

          {/* Error Notification */}
          {errorMessage && (
            <div
              style={{
                backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                border: isDarkMode ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid #FCA5A5',
                color: isDarkMode ? '#FCA5A5' : '#991B1B',
                padding: '12px 14px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <AlertCircle
                style={{
                  width: '16px',
                  height: '16px',
                  flexShrink: 0,
                  color: isDarkMode ? '#EF4444' : '#DC2626',
                }}
              />
              <span>{errorMessage}</span>
            </div>
          )}

          <form
            onSubmit={handleLoginSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {/* Email */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 650,
                  color: 'var(--aiims-text-secondary, #334155)',
                  marginBottom: '6px',
                }}
              >
                Email
              </label>
              <input
                type="email"
                className="aiims-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 650,
                  color: 'var(--aiims-text-secondary, #334155)',
                  marginBottom: '6px',
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="aiims-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--aiims-text-muted, #64748B)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              className="aiims-btn-primary"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 700,
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} style={{ animation: 'aiimsSpin 1s linear infinite' }} />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Secondary Navigation */}
          <div
            style={{
              marginTop: '24px',
              textAlign: 'center',
              fontSize: '14px',
              color: 'var(--aiims-text-secondary, #64748B)',
            }}
          >
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => navigateTo('register')}
              style={{
                background: 'none',
                border: 'none',
                color: '#5B4BFF',
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0,
                fontSize: 'inherit',
                fontFamily: 'inherit',
              }}
            >
              Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
