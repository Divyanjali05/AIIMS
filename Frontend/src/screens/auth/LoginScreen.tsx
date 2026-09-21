import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  User,
  Lightbulb,
  Target,
  BarChart3,
  Rocket,
  CheckCircle,
  AlertCircle,
  Compass,
  Zap,
  Award,
  Sparkles
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';

interface LoginScreenProps {
  onSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
  const { login, register } = useLearner();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [signInStep, setSignInStep] = useState<'identifier' | 'password'>('identifier');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reenterPassword, setReenterPassword] = useState('');
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [showKeepSignedDetails, setShowKeepSignedDetails] = useState(false);
  const [showNeedHelp, setShowNeedHelp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Amazon Step 1: Continue button handler
  const handleContinueIdentifier = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim()) {
      setErrorMessage('Enter your email');
      return;
    }

    if (!email.includes('@')) {
      setErrorMessage('Enter a valid email address');
      return;
    }

    setSignInStep('password');
  };

  // Amazon Step 2 / Register submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (mode === 'login') {
      if (!password.trim()) {
        setErrorMessage('Enter your password');
        return;
      }

      setIsLoading(true);

      try {
        const res = await login(email.trim(), password);
        if (res.success) {
          if (onSuccess) onSuccess();
        } else {
          setErrorMessage(res.error || 'Invalid email or password. Please check your credentials.');
        }
      } catch (err: any) {
        setErrorMessage('An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Amazon Create account validation
      if (!name.trim()) {
        setErrorMessage('Enter your name');
        return;
      }

      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('Enter a valid email address');
        return;
      }

      if (!password.trim() || password.length < 6) {
        setErrorMessage('Passwords must be at least 6 characters.');
        return;
      }

      if (password !== reenterPassword) {
        setErrorMessage('Passwords must match.');
        return;
      }

      setIsLoading(true);

      try {
        const res = await register(name.trim(), email.trim(), password, college.trim() || 'Engineering & Technology College');
        if (res.success) {
          setSuccessMessage('Account created successfully! Welcome to AIIMS.');
          if (onSuccess) onSuccess();
        } else {
          setErrorMessage(res.error || 'Registration failed. Please try again.');
        }
      } catch (err: any) {
        setErrorMessage('An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      return;
    }
    setForgotSent(true);
    setTimeout(() => {
      setShowForgotModal(false);
      setForgotSent(false);
      setForgotEmail('');
    }, 2500);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#f8fafc',
        backgroundImage: `
          radial-gradient(circle at 12% 15%, rgba(99, 102, 241, 0.09) 0%, transparent 45%),
          radial-gradient(circle at 88% 28%, rgba(139, 92, 246, 0.08) 0%, transparent 42%),
          radial-gradient(circle at 50% 88%, rgba(59, 130, 246, 0.06) 0%, transparent 50%),
          radial-gradient(circle, #cbd5e1 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 100% 100%, 100% 100%, 28px 28px',
        fontFamily: "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        position: 'relative'
      }}
    >
      {/* 1. TOP NAVIGATION BAR */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 48px',
          boxSizing: 'border-box',
          width: '100%',
          maxWidth: '1440px',
          margin: '0 auto'
        }}
      >
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '22px',
              boxShadow: '0 8px 16px rgba(99, 102, 241, 0.28)'
            }}
          >
            A
          </div>
          <div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.1,
                letterSpacing: '-0.2px'
              }}
            >
              AIIMS
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#64748b',
                fontWeight: 600,
                letterSpacing: '0.1px'
              }}
            >
              Your AI Learning Companion
            </div>
          </div>
        </div>

        {/* Top Right Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '14px', color: '#475569', fontWeight: 500 }}>
            {mode === 'login' ? 'New to AIIMS?' : 'Already have an account?'}
          </span>
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            style={{
              backgroundColor: '#ffffff',
              color: '#4f46e5',
              border: '1.5px solid #6366f1',
              borderRadius: '9999px',
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.08)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f3ff';
              e.currentTarget.style.borderColor = '#4f46e5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#6366f1';
            }}
          >
            {mode === 'login' ? 'Create an account' : 'Sign in instead'}
          </button>
        </div>
      </header>

      {/* 2. MAIN HERO & AUTH SECTION */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 48px 40px 48px',
          width: '100%',
          maxWidth: '1440px',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.35fr 0.9fr',
            gap: '52px',
            alignItems: 'center',
            width: '100%'
          }}
        >
          {/* ================= LEFT COLUMN: Professional Value Proposition ================= */}
          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* System Eyebrow Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.12) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.28)',
                color: '#4f46e5',
                fontSize: '13.5px',
                fontWeight: 700,
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                marginBottom: '22px',
                alignSelf: 'flex-start',
                boxShadow: '0 2px 10px rgba(99, 102, 241, 0.08)'
              }}
            >
              <Sparkles size={16} color="#6366f1" />
              AI Intelligence &amp; Mentoring System (AIIMS)
            </div>

            {/* Main Headline */}
            <h1
              style={{
                fontSize: 'clamp(46px, 4.3vw, 62px)',
                fontWeight: 900,
                color: '#0f172a',
                lineHeight: 1.1,
                letterSpacing: '-2px',
                margin: '0 0 22px 0'
              }}
            >
              Master the AI Frontier.
              <br />
              Build Verifiable Capability.
              <br />
              <span
                style={{
                  background: 'linear-gradient(110deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                With AIIMS Intelligence.
              </span>
            </h1>

            {/* Clear, Professional Explanation of Project Purpose */}
            <p
              style={{
                fontSize: '18.5px',
                color: '#334155',
                lineHeight: 1.68,
                margin: '0 0 28px 0',
                maxWidth: '680px',
                fontWeight: 500
              }}
            >
              AIIMS is an adaptive capability and intelligence ecosystem designed to help you thrive in a rapidly evolving AI landscape. Through continuous technical signal monitoring from ArXiv &amp; model labs, personalized capability diagnostics, and real-time contextual AI mentorship, AIIMS translates complex technological breakthroughs into structured, verifiable growth.
            </p>
          </div>

          {/* ================= RIGHT COLUMN: Modern AIIMS Auth Card ================= */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%'
            }}
          >
            {/* AIIMS Modern Auth Box */}
            <div
              style={{
                width: '100%',
                maxWidth: '400px',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '30px 30px',
                border: '1px solid #e2e8f0',
                boxSizing: 'border-box',
                boxShadow: '0 20px 35px -10px rgba(99, 102, 241, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)'
              }}
            >
              {/* Error Box Callout */}
              {errorMessage && (
                <div
                  style={{
                    borderRadius: '10px',
                    padding: '12px 14px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    marginBottom: '18px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}
                >
                  <AlertCircle size={17} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b' }}>
                      Authentication Problem
                    </span>
                    <span style={{ fontSize: '12.5px', color: '#b91c1c', lineHeight: 1.4 }}>
                      {errorMessage}
                    </span>
                  </div>
                </div>
              )}

              {/* Success Callout */}
              {successMessage && (
                <div
                  style={{
                    borderRadius: '10px',
                    padding: '12px 14px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    marginBottom: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <CheckCircle size={17} color="#16a34a" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#15803d', fontWeight: 600 }}>
                    {successMessage}
                  </span>
                </div>
              )}

              {/* ----------------- 1. SIGN IN: STEP 1 (Identifier) ----------------- */}
              {mode === 'login' && signInStep === 'identifier' && (
                <div>
                  <h2
                    style={{
                      fontSize: '24px',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: '0 0 6px 0',
                      letterSpacing: '-0.5px'
                    }}
                  >
                    Sign in
                  </h2>
                  <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 0 20px 0', lineHeight: 1.4 }}>
                    Welcome back! Enter your identifier to continue.
                  </p>

                  <form onSubmit={handleContinueIdentifier}>
                    <div style={{ marginBottom: '16px' }}>
                      <label
                        htmlFor="aiims-email-input"
                        style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#334155',
                          marginBottom: '6px'
                        }}
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        id="aiims-email-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoFocus
                        placeholder="Enter your email"
                        style={{
                          width: '100%',
                          height: '42px',
                          padding: '0 14px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '10px',
                          outline: 'none',
                          backgroundColor: '#f8fafc',
                          boxSizing: 'border-box',
                          color: '#0f172a',
                          transition: 'all 0.18s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#6366f1';
                          e.target.style.backgroundColor = '#ffffff';
                          e.target.style.boxShadow = '0 0 0 3.5px rgba(99, 102, 241, 0.14)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e2e8f0';
                          e.target.style.backgroundColor = '#f8fafc';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      id="aiims-continue-btn"
                      style={{
                        width: '100%',
                        height: '42px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.28)',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: 700,
                        letterSpacing: '0.2px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box',
                        transition: 'all 0.18s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(79, 70, 229, 0.38)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.28)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      Continue
                    </button>
                  </form>

                  {/* Terms Notice */}
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#64748b',
                      lineHeight: 1.5,
                      margin: '18px 0 16px 0'
                    }}
                  >
                    By continuing, you agree to AIIMS's{' '}
                    <span
                      style={{ color: '#4f46e5', cursor: 'pointer', fontWeight: 600 }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = 'underline')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = 'none')}
                      onClick={() => alert('AIIMS Conditions of Use apply to all student accounts.')}
                    >
                      Conditions of Use
                    </span>{' '}
                    and{' '}
                    <span
                      style={{ color: '#4f46e5', cursor: 'pointer', fontWeight: 600 }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = 'underline')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = 'none')}
                      onClick={() => alert('AIIMS Privacy Notice: All learner states are securely tokenized.')}
                    >
                      Privacy Notice
                    </span>
                    .
                  </p>

                  {/* Need Help Accordion */}
                  <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                    <div
                      onClick={() => setShowNeedHelp(!showNeedHelp)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        color: '#4f46e5',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ fontSize: '11px' }}>{showNeedHelp ? '▾' : '▸'}</span>
                      <span>Need help?</span>
                    </div>

                    {showNeedHelp && (
                      <div
                        style={{
                          paddingLeft: '14px',
                          marginTop: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                      >
                        <span
                          onClick={() => setShowForgotModal(true)}
                          style={{ fontSize: '13px', color: '#4f46e5', cursor: 'pointer', fontWeight: 500 }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = 'underline')}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = 'none')}
                        >
                          Forgot your password?
                        </span>
                        <span
                          onClick={() => alert('For other Sign-In issues, make sure your browser allows local storage sessions.')}
                          style={{ fontSize: '13px', color: '#4f46e5', cursor: 'pointer', fontWeight: 500 }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = 'underline')}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = 'none')}
                        >
                          Other issues with Sign-In
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ----------------- 2. SIGN IN: STEP 2 (Password) ----------------- */}
              {mode === 'login' && signInStep === 'password' && (
                <div>
                  <h2
                    style={{
                      fontSize: '24px',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: '0 0 12px 0',
                      letterSpacing: '-0.5px'
                    }}
                  >
                    Sign in
                  </h2>

                  {/* Identifier summary row with Change link */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      fontSize: '13px',
                      color: '#0f172a'
                    }}
                  >
                    <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {email}
                    </span>
                    <span
                      onClick={() => {
                        setSignInStep('identifier');
                        setErrorMessage('');
                      }}
                      style={{ color: '#4f46e5', cursor: 'pointer', fontSize: '12.5px', fontWeight: 700, flexShrink: 0 }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = 'underline')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = 'none')}
                    >
                      Change
                    </span>
                  </div>

                  <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '6px'
                        }}
                      >
                        <label
                          htmlFor="aiims-password-input"
                          style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}
                        >
                          Password
                        </label>
                        <span
                          onClick={() => setShowForgotModal(true)}
                          style={{ fontSize: '12.5px', color: '#4f46e5', cursor: 'pointer', fontWeight: 600 }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = 'underline')}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = 'none')}
                        >
                          Forgot password?
                        </span>
                      </div>

                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="aiims-password-input"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoFocus
                          placeholder="••••••••"
                          style={{
                            width: '100%',
                            height: '42px',
                            padding: '0 38px 0 14px',
                            fontSize: '14px',
                            fontFamily: 'inherit',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '10px',
                            outline: 'none',
                            backgroundColor: '#f8fafc',
                            boxSizing: 'border-box',
                            color: '#0f172a',
                            transition: 'all 0.18s ease'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#6366f1';
                            e.target.style.backgroundColor = '#ffffff';
                            e.target.style.boxShadow = '0 0 0 3.5px rgba(99, 102, 241, 0.14)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#e2e8f0';
                            e.target.style.backgroundColor = '#f8fafc';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#64748b',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      id="aiims-signin-btn"
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        height: '42px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.28)',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: 700,
                        letterSpacing: '0.2px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box',
                        opacity: isLoading ? 0.7 : 1,
                        transition: 'all 0.18s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(79, 70, 229, 0.38)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.28)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      {isLoading ? 'Signing in...' : 'Sign in'}
                    </button>
                  </form>

                  {/* Keep me signed in checkbox */}
                  <div style={{ marginTop: '16px' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        color: '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={keepSignedIn}
                        onChange={(e) => setKeepSignedIn(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#4f46e5' }}
                      />
                      <span>Keep me signed in</span>
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          setShowKeepSignedDetails(!showKeepSignedDetails);
                        }}
                        style={{ color: '#4f46e5', cursor: 'pointer', fontWeight: 600, marginLeft: 'auto' }}
                      >
                        Details {showKeepSignedDetails ? '▴' : '▾'}
                      </span>
                    </label>

                    {showKeepSignedDetails && (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '10px 12px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#64748b',
                          lineHeight: 1.45
                        }}
                      >
                        Choosing "Keep me signed in" preserves your active authentication session on this device. Use this option only on personal devices.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ----------------- 3. CREATE ACCOUNT (REGISTRATION) ----------------- */}
              {mode === 'register' && (
                <div>
                  <h2
                    style={{
                      fontSize: '24px',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: '0 0 6px 0',
                      letterSpacing: '-0.5px'
                    }}
                  >
                    Create account
                  </h2>
                  <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 0 18px 0', lineHeight: 1.4 }}>
                    Start building verifiable AI capability with AIIMS.
                  </p>

                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Your Name */}
                    <div>
                      <label
                        htmlFor="aiims-name-input"
                        style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#334155',
                          marginBottom: '6px'
                        }}
                      >
                        Your name
                      </label>
                      <input
                        type="text"
                        id="aiims-name-input"
                        placeholder="First and last name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          height: '42px',
                          padding: '0 14px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '10px',
                          outline: 'none',
                          backgroundColor: '#f8fafc',
                          boxSizing: 'border-box',
                          color: '#0f172a',
                          transition: 'all 0.18s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#6366f1';
                          e.target.style.backgroundColor = '#ffffff';
                          e.target.style.boxShadow = '0 0 0 3.5px rgba(99, 102, 241, 0.14)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e2e8f0';
                          e.target.style.backgroundColor = '#f8fafc';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    {/* College / Institution Name */}
                    <div>
                      <label
                        htmlFor="aiims-college-input"
                        style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#334155',
                          marginBottom: '6px'
                        }}
                      >
                        College / Institution
                      </label>
                      <input
                        type="text"
                        id="aiims-college-input"
                        placeholder="e.g. Stanford / MIT / IIT / Your College"
                        value={college}
                        onChange={(e) => setCollege(e.target.value)}
                        style={{
                          width: '100%',
                          height: '42px',
                          padding: '0 14px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '10px',
                          outline: 'none',
                          backgroundColor: '#f8fafc',
                          boxSizing: 'border-box',
                          color: '#0f172a',
                          transition: 'all 0.18s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#6366f1';
                          e.target.style.backgroundColor = '#ffffff';
                          e.target.style.boxShadow = '0 0 0 3.5px rgba(99, 102, 241, 0.14)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e2e8f0';
                          e.target.style.backgroundColor = '#f8fafc';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    {/* Mobile number or email */}
                    <div>
                      <label
                        htmlFor="aiims-reg-email"
                        style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#334155',
                          marginBottom: '6px'
                        }}
                      >
                        Email address
                      </label>
                      <input
                        type="email"
                        id="aiims-reg-email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          height: '42px',
                          padding: '0 14px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '10px',
                          outline: 'none',
                          backgroundColor: '#f8fafc',
                          boxSizing: 'border-box',
                          color: '#0f172a',
                          transition: 'all 0.18s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#6366f1';
                          e.target.style.backgroundColor = '#ffffff';
                          e.target.style.boxShadow = '0 0 0 3.5px rgba(99, 102, 241, 0.14)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e2e8f0';
                          e.target.style.backgroundColor = '#f8fafc';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <label
                        htmlFor="aiims-reg-password"
                        style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#334155',
                          marginBottom: '6px'
                        }}
                      >
                        Password
                      </label>
                      <input
                        type="password"
                        id="aiims-reg-password"
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          height: '42px',
                          padding: '0 14px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '10px',
                          outline: 'none',
                          backgroundColor: '#f8fafc',
                          boxSizing: 'border-box',
                          color: '#0f172a',
                          transition: 'all 0.18s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#6366f1';
                          e.target.style.backgroundColor = '#ffffff';
                          e.target.style.boxShadow = '0 0 0 3.5px rgba(99, 102, 241, 0.14)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e2e8f0';
                          e.target.style.backgroundColor = '#f8fafc';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#64748b',
                          marginTop: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span style={{ color: '#4f46e5', fontWeight: 700 }}>•</span>
                        <span>Passwords must be at least 6 characters.</span>
                      </div>
                    </div>

                    {/* Re-enter password */}
                    <div>
                      <label
                        htmlFor="aiims-reenter-password"
                        style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#334155',
                          marginBottom: '6px'
                        }}
                      >
                        Re-enter password
                      </label>
                      <input
                        type="password"
                        id="aiims-reenter-password"
                        placeholder="Re-enter your password"
                        value={reenterPassword}
                        onChange={(e) => setReenterPassword(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          height: '42px',
                          padding: '0 14px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '10px',
                          outline: 'none',
                          backgroundColor: '#f8fafc',
                          boxSizing: 'border-box',
                          color: '#0f172a',
                          transition: 'all 0.18s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#6366f1';
                          e.target.style.backgroundColor = '#ffffff';
                          e.target.style.boxShadow = '0 0 0 3.5px rgba(99, 102, 241, 0.14)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e2e8f0';
                          e.target.style.backgroundColor = '#f8fafc';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      id="aiims-create-acc-btn"
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        height: '42px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.28)',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: 700,
                        letterSpacing: '0.2px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '4px',
                        boxSizing: 'border-box',
                        opacity: isLoading ? 0.7 : 1,
                        transition: 'all 0.18s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(79, 70, 229, 0.38)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.28)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      {isLoading ? 'Creating account...' : 'Create your AIIMS account'}
                    </button>
                  </form>

                  {/* Terms Notice */}
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#64748b',
                      lineHeight: 1.5,
                      margin: '18px 0 16px 0'
                    }}
                  >
                    By creating an account, you agree to AIIMS's{' '}
                    <span
                      style={{ color: '#4f46e5', cursor: 'pointer', fontWeight: 600 }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = 'underline')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = 'none')}
                    >
                      Conditions of Use
                    </span>{' '}
                    and{' '}
                    <span
                      style={{ color: '#4f46e5', cursor: 'pointer', fontWeight: 600 }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = 'underline')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = 'none')}
                    >
                      Privacy Notice
                    </span>
                    .
                  </p>

                  <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '18px 0' }} />

                  {/* Already have an account row */}
                  <div style={{ fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
                    <span>Already have an account? </span>
                    <span
                      onClick={() => {
                        setMode('login');
                        setSignInStep('identifier');
                        setErrorMessage('');
                      }}
                      style={{ color: '#4f46e5', cursor: 'pointer', fontWeight: 700 }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = 'underline')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = 'none')}
                    >
                      Sign in ▸
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* "New to AIIMS?" Divider + Secondary Button (Visible in login mode) */}
            {mode === 'login' && (
              <div style={{ width: '100%', maxWidth: '400px', marginTop: '20px' }}>
                <div
                  style={{
                    position: 'relative',
                    textAlign: 'center',
                    marginBottom: '14px'
                  }}
                >
                  <div style={{ height: '1px', backgroundColor: '#e2e8f0', width: '100%', position: 'absolute', top: '50%' }} />
                  <span
                    style={{
                      position: 'relative',
                      backgroundColor: '#f8fafc',
                      padding: '0 12px',
                      fontSize: '12.5px',
                      color: '#64748b',
                      fontWeight: 600,
                      borderRadius: '4px'
                    }}
                  >
                    New to AIIMS?
                  </span>
                </div>

                <button
                  type="button"
                  id="aiims-create-switch-btn"
                  onClick={() => {
                    setMode('register');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    color: '#0f172a',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                    transition: 'all 0.18s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#94a3b8';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Create your AIIMS account
                </button>
              </div>
            )}

            {/* Quick Demo Login Pill */}
            <div style={{ marginTop: '18px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
              <span>Need test access? </span>
              <span
                onClick={() => {
                  setEmail('alex.chen@aiims.edu');
                  setPassword('password123');
                  setSignInStep('password');
                  setMode('login');
                  setErrorMessage('');
                }}
                style={{ color: '#4f46e5', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#4338ca')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#4f46e5')}
              >
                Prefill Demo Account
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* 3. BOTTOM FOOTER TAGLINE */}
      <footer
        style={{
          padding: '16px 48px 24px 48px',
          display: 'flex',
          justifyContent: 'flex-end',
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            fontSize: '13px',
            color: '#64748b',
            fontWeight: 600,
            letterSpacing: '0.6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>Learn</span>
          <span>•</span>
          <span>Explore</span>
          <span>•</span>
          <span>Grow</span>
          <span>•</span>
          <span>Belong</span>
        </div>
      </footer>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '28px',
              width: '100%',
              maxWidth: '380px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Reset Password
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b' }}>
              Enter your email address and we'll send you an instant link to reset your AIIMS password.
            </p>

            {forgotSent ? (
              <div
                style={{
                  backgroundColor: '#ecfdf5',
                  color: '#065f46',
                  padding: '12px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle size={16} /> Reset link sent! Check your inbox.
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <input
                  type="email"
                  placeholder="Enter your account email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  style={{
                    padding: '10px 14px',
                    fontSize: '14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    outline: 'none'
                  }}
                />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#4f46e5',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Send Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
