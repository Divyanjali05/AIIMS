import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { AinovaLogo } from '../../components/common/AinovaLogo';

interface LoginScreenProps {
  onSuccess?: () => void;
  initialMode?: 'home' | 'login' | 'register';
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess, initialMode }) => {
  const { login, register } = useLearner();

  // Determine view based on URL pathname or prop
  const getModeFromPath = (): 'home' | 'login' | 'register' => {
    const path = window.location.pathname.toLowerCase();
    if (path === '/register') return 'register';
    if (path === '/login') return 'login';
    if (path === '/' || path === '/index.html') return 'home';
    return initialMode || 'home';
  };

  const [mode, setMode] = useState<'home' | 'login' | 'register'>(getModeFromPath);

  // Sync mode with browser history and URL path
  const navigateTo = (newMode: 'home' | 'login' | 'register') => {
    setMode(newMode);
    setErrorMessage('');
    setSuccessMessage('');
    const targetPath = newMode === 'home' ? '/' : `/${newMode}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setMode(getModeFromPath());
      setErrorMessage('');
      setSuccessMessage('');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [initialMode]);

  // Form Fields State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');

  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

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
    } catch (err) {
      setErrorMessage("We couldn't sign you in right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanCollege = college.trim();

    if (!cleanName) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await register(
        cleanName,
        cleanEmail,
        password,
        cleanCollege || 'Engineering & Technology College'
      );
      if (res.success) {
        setSuccessMessage('Account created successfully!');
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.error || "We couldn't create your account right now. Please try again.");
      }
    } catch (err) {
      setErrorMessage("We couldn't create your account right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#F8F9FE',
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
        color: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}
    >
      <style>{`
        .ainova-fade-in {
          animation: ainovaFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes ainovaFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .ainova-btn-primary {
          background: #5B4BFF;
          color: #ffffff;
          border: 1px solid #5B4BFF;
          box-shadow: 0 4px 14px -2px rgba(91, 75, 255, 0.35);
          transition: all 0.2s ease;
          outline: none;
          cursor: pointer;
        }
        .ainova-btn-primary:hover:not(:disabled) {
          background: #4338CA;
          border-color: #4338CA;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px -2px rgba(91, 75, 255, 0.45);
        }
        .ainova-btn-primary:focus-visible {
          ring: 3px solid rgba(91, 75, 255, 0.4);
          outline: 2px solid #5B4BFF;
        }
        .ainova-btn-primary:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
        }

        .ainova-btn-secondary {
          background: #ffffff;
          color: #1E293B;
          border: 1.5px solid #E2E8F0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          transition: all 0.2s ease;
          outline: none;
          cursor: pointer;
        }
        .ainova-btn-secondary:hover {
          background: #F8FAFC;
          border-color: #CBD5E1;
          color: #0F172A;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }
        .ainova-btn-secondary:focus-visible {
          outline: 2px solid #5B4BFF;
        }

        .ainova-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1.5px solid #E2E8F0;
          background-color: #ffffff;
          color: #0F172A;
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
          outline: none;
        }
        .ainova-input:focus {
          border-color: #5B4BFF;
          box-shadow: 0 0 0 3px rgba(91, 75, 255, 0.12);
        }
        .ainova-input::placeholder {
          color: #94A3B8;
        }
      `}</style>

      {/* ==================================================== */}
      {/* MODE 1: PUBLIC HOMEPAGE                              */}
      {/* ==================================================== */}
      {mode === 'home' && (
        <div
          className="ainova-fade-in"
          style={{
            maxWidth: '680px',
            width: '100%',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px'
          }}
        >
          {/* Brand Visual Logo */}
          <div style={{ marginBottom: '32px' }}>
            <AinovaLogo size="xl" showWordmark={true} onClick={() => navigateTo('home')} />
          </div>

          {/* Main Title */}
          <h1
            style={{
              fontSize: 'clamp(32px, 5vw, 44px)',
              fontWeight: 800,
              lineHeight: 1.15,
              color: '#0F172A',
              letterSpacing: '-1.2px',
              margin: '0 0 16px 0'
            }}
          >
            Unlock Your AI Potential
          </h1>

          {/* Short Description (ONE sentence) */}
          <p
            style={{
              fontSize: 'clamp(15px, 2.5vw, 18px)',
              lineHeight: 1.6,
              color: '#475569',
              fontWeight: 450,
              margin: '0 0 40px 0',
              maxWidth: '540px'
            }}
          >
            Learn, discover, and build with AI through a journey designed for you.
          </p>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              width: '100%',
              maxWidth: '360px',
              flexWrap: 'wrap'
            }}
          >
            <button
              id="register-button"
              className="ainova-btn-primary"
              onClick={() => navigateTo('register')}
              style={{
                flex: '1 1 150px',
                padding: '14px 28px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 700
              }}
            >
              Register
            </button>

            <button
              id="signin-button"
              className="ainova-btn-secondary"
              onClick={() => navigateTo('login')}
              style={{
                flex: '1 1 150px',
                padding: '14px 28px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 700
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODE 2: REGISTER PAGE                                */}
      {/* ==================================================== */}
      {mode === 'register' && (
        <div
          className="ainova-fade-in"
          style={{
            maxWidth: '460px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          {/* Top Brand Logo */}
          <div style={{ marginBottom: '24px' }}>
            <AinovaLogo size="lg" showWordmark={true} onClick={() => navigateTo('home')} />
          </div>

          {/* Card Container */}
          <div
            style={{
              width: '100%',
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '36px 32px',
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.06)',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#0F172A',
                  letterSpacing: '-0.5px',
                  margin: '0 0 6px 0'
                }}
              >
                Create your AINOVA account
              </h2>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
                Start your AI journey with AINOVA.
              </p>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0, color: '#DC2626' }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Notification */}
            {successMessage && (
              <div
                style={{
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #86EFAC',
                  color: '#166534',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <CheckCircle style={{ width: '16px', height: '16px', flexShrink: 0, color: '#16A34A' }} />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 650, color: '#334155', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  className="ainova-input"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              {/* College / Institution */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 650, color: '#334155', marginBottom: '6px' }}>
                  College / Institution
                </label>
                <input
                  type="text"
                  className="ainova-input"
                  placeholder="Engineering & Technology College"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 650, color: '#334155', marginBottom: '6px' }}>
                  Email
                </label>
                <input
                  type="email"
                  className="ainova-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 650, color: '#334155', marginBottom: '6px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="ainova-input"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 650, color: '#334155', marginBottom: '6px' }}>
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="ainova-input"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                type="submit"
                className="ainova-btn-primary"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 700,
                  marginTop: '8px'
                }}
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            {/* Secondary Navigation */}
            <div
              style={{
                marginTop: '24px',
                textAlign: 'center',
                fontSize: '14px',
                color: '#64748B'
              }}
            >
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigateTo('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#5B4BFF',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: 'inherit',
                  fontFamily: 'inherit'
                }}
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODE 3: LOGIN PAGE                                   */}
      {/* ==================================================== */}
      {mode === 'login' && (
        <div
          className="ainova-fade-in"
          style={{
            maxWidth: '440px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          {/* Top Brand Logo */}
          <div style={{ marginBottom: '24px' }}>
            <AinovaLogo size="lg" showWordmark={true} onClick={() => navigateTo('home')} />
          </div>

          {/* Card Container */}
          <div
            style={{
              width: '100%',
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '36px 32px',
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.06)',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#0F172A',
                  letterSpacing: '-0.5px',
                  margin: '0 0 6px 0'
                }}
              >
                Welcome back
              </h2>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
                Sign in to continue your AI journey.
              </p>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0, color: '#DC2626' }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 650, color: '#334155', marginBottom: '6px' }}>
                  Email
                </label>
                <input
                  type="email"
                  className="ainova-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 650, color: '#334155', marginBottom: '6px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="ainova-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                type="submit"
                className="ainova-btn-primary"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 700,
                  marginTop: '8px'
                }}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Secondary Navigation */}
            <div
              style={{
                marginTop: '24px',
                textAlign: 'center',
                fontSize: '14px',
                color: '#64748B'
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
                  fontFamily: 'inherit'
                }}
              >
                Register
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginScreen;
