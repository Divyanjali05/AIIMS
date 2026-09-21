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
  AlertCircle
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';

interface LoginScreenProps {
  onSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
  const { login, register } = useLearner();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    if (!password.trim() || password.length < 4) {
      setErrorMessage('Password must be at least 4 characters');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        const res = await login(email.trim(), password);
        if (res.success) {
          if (onSuccess) onSuccess();
        } else {
          setErrorMessage(res.error || 'Failed to sign in. Please check your credentials.');
        }
      } else {
        const res = await register(name.trim() || email.split('@')[0], email.trim(), password);
        if (res.success) {
          setSuccessMessage('Account created successfully! Welcome to AIIMS.');
          if (onSuccess) onSuccess();
        } else {
          setErrorMessage(res.error || 'Registration failed. Please try again.');
        }
      }
    } catch (err: any) {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'microsoft') => {
    setIsLoading(true);
    setErrorMessage('');
    const demoEmail = provider === 'google' ? 'alex.chen@gmail.com' : 'alex.chen@microsoft.com';
    try {
      const res = await login(demoEmail, 'password123');
      if (res.success && onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setErrorMessage('Social login failed. Please try email login.');
    } finally {
      setIsLoading(false);
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
        backgroundColor: '#f8f9ff',
        backgroundImage: `
          radial-gradient(at 10% 20%, rgba(224, 231, 255, 0.6) 0px, transparent 50%),
          radial-gradient(at 90% 10%, rgba(243, 232, 255, 0.7) 0px, transparent 50%),
          radial-gradient(at 50% 80%, rgba(238, 242, 255, 0.5) 0px, transparent 50%),
          radial-gradient(at 85% 85%, rgba(245, 208, 254, 0.3) 0px, transparent 50%)
        `,
        fontFamily: "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
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
            gridTemplateColumns: '1.25fr 0.95fr',
            gap: '48px',
            alignItems: 'center',
            width: '100%'
          }}
        >
          {/* ================= LEFT COLUMN: Value Proposition + 3D Visual ================= */}
          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* Main Headline */}
            <h1
              style={{
                fontSize: '52px',
                fontWeight: 900,
                color: '#0f172a',
                lineHeight: 1.12,
                letterSpacing: '-1.5px',
                margin: '0 0 16px 0'
              }}
            >
              Learn AI.
              <br />
              Build Your Future.
              <br />
              <span
                style={{
                  background: 'linear-gradient(110deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                With AIIMS.
              </span>
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: '17px',
                color: '#475569',
                lineHeight: 1.55,
                margin: '0 0 32px 0',
                maxWidth: '460px',
                fontWeight: 500
              }}
            >
              A personalized learning journey to help you understand, apply and grow with AI.
            </p>

            {/* Visual Workspace: Left Feature Badges + 3D Illustration Area */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '240px 1fr',
                gap: '24px',
                alignItems: 'center',
                position: 'relative'
              }}
            >
              {/* Stack of Feature Badges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 2 }}>
                {/* 1. Understand Yourself */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(8px)',
                    padding: '10px 14px',
                    borderRadius: '16px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.9)',
                    transition: 'transform 0.2s ease',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: '#ecfdf5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#10b981',
                      flexShrink: 0
                    }}
                  >
                    <User size={19} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                      Understand Yourself
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                      Discover your AI profile
                    </div>
                  </div>
                </div>

                {/* 2. Learn What Matters */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(8px)',
                    padding: '10px 14px',
                    borderRadius: '16px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.9)',
                    transition: 'transform 0.2s ease',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: '#e0f2fe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#0284c7',
                      flexShrink: 0
                    }}
                  >
                    <Lightbulb size={19} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                      Learn What Matters
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                      Build real skills, step by step
                    </div>
                  </div>
                </div>

                {/* 3. Stay Ahead */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(8px)',
                    padding: '10px 14px',
                    borderRadius: '16px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.9)',
                    transition: 'transform 0.2s ease',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: '#ffedd5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ea580c',
                      flexShrink: 0
                    }}
                  >
                    <Target size={19} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                      Stay Ahead
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                      Explore what's changing in AI
                    </div>
                  </div>
                </div>

                {/* 4. Take Action */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(8px)',
                    padding: '10px 14px',
                    borderRadius: '16px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.9)',
                    transition: 'transform 0.2s ease',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: '#fce7f3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#db2777',
                      flexShrink: 0
                    }}
                  >
                    <BarChart3 size={19} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                      Take Action
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                      Turn insights into progress
                    </div>
                  </div>
                </div>
              </div>

              {/* Center 3D Character Illustration Area */}
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '340px'
                }}
              >
                {/* Ambient Glow Aura */}
                <div
                  style={{
                    position: 'absolute',
                    width: '280px',
                    height: '280px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(168, 85, 247, 0.22) 0%, rgba(99, 102, 241, 0.15) 50%, transparent 70%)',
                    filter: 'blur(20px)',
                    zIndex: 0
                  }}
                />

                {/* Floating Skill Tag 1: Discover (Top Right) */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '120px',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    boxShadow: '0 8px 20px rgba(99, 102, 241, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    zIndex: 3,
                    border: '1px solid rgba(255, 255, 255, 0.8)'
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      backgroundColor: '#6366f1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff'
                    }}
                  >
                    <User size={13} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>Discover</div>
                    <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>Your AI profile</div>
                  </div>
                </div>

                {/* Floating Skill Tag 2: Learn (Top Left) */}
                <div
                  style={{
                    position: 'absolute',
                    top: '40px',
                    left: '-20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    zIndex: 3,
                    border: '1px solid rgba(255, 255, 255, 0.8)'
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      backgroundColor: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff'
                    }}
                  >
                    <Lightbulb size={13} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>Learn</div>
                    <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>New skills</div>
                  </div>
                </div>

                {/* Floating Skill Tag 3: Explore (Mid Right) */}
                <div
                  style={{
                    position: 'absolute',
                    top: '85px',
                    right: '-15px',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    boxShadow: '0 8px 20px rgba(59, 130, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    zIndex: 3,
                    border: '1px solid rgba(255, 255, 255, 0.8)'
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      backgroundColor: '#3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff'
                    }}
                  >
                    <Rocket size={13} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>Explore</div>
                    <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>What's next</div>
                  </div>
                </div>

                {/* Floating Skill Tag 4: Grow (Lower Right) */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '80px',
                    right: '-20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    boxShadow: '0 8px 20px rgba(217, 70, 239, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    zIndex: 3,
                    border: '1px solid rgba(255, 255, 255, 0.8)'
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      backgroundColor: '#c026d3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff'
                    }}
                  >
                    <BarChart3 size={13} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>Grow</div>
                    <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>Your potential</div>
                  </div>
                </div>

                {/* 3D Student Character Image / Render */}
                <div
                  style={{
                    position: 'relative',
                    width: '320px',
                    height: '320px',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    boxShadow: '0 16px 36px -12px rgba(79, 70, 229, 0.25)',
                    border: '3px solid rgba(255, 255, 255, 0.85)',
                    zIndex: 1
                  }}
                >
                  <img
                    src="/api/mascot"
                    alt="AIIMS AI Learner"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>

                {/* Decorative Sparkles */}
                <div
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '80px',
                    color: '#38bdf8',
                    zIndex: 4,
                    fontSize: '18px',
                    filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.6))'
                  }}
                >
                  ✦
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: '120px',
                    left: '20px',
                    color: '#818cf8',
                    zIndex: 4,
                    fontSize: '18px',
                    filter: 'drop-shadow(0 0 6px rgba(129, 140, 248, 0.6))'
                  }}
                >
                  ✦
                </div>
              </div>
            </div>

            {/* Handwritten / Cursive Quotes at bottom of left column */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '32px',
                padding: '0 12px'
              }}
            >
              {/* Left Quote */}
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    fontFamily: "'Segoe Print', 'Caveat', 'Comic Sans MS', cursive",
                    fontSize: '18px',
                    color: '#6366f1',
                    fontWeight: 600,
                    display: 'block',
                    transform: 'rotate(-2deg)'
                  }}
                >
                  A more confident you
                  <br />
                  in an AI-powered world.
                </span>
                {/* Purple decorative scribble underline */}
                <svg
                  width="130"
                  height="16"
                  viewBox="0 0 130 16"
                  fill="none"
                  style={{ marginTop: '2px', display: 'block' }}
                >
                  <path
                    d="M3 10C35 4 85 14 127 6"
                    stroke="#8b5cf6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Right Quote */}
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontFamily: "'Segoe Print', 'Caveat', 'Comic Sans MS', cursive",
                    fontSize: '17px',
                    color: '#7c3aed',
                    fontWeight: 600,
                    display: 'block',
                    transform: 'rotate(1.5deg)'
                  }}
                >
                  Same you.
                  <br />
                  Brighter possibilities.
                </span>
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: Sleek Login Card ================= */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              width: '100%'
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '430px',
                backgroundColor: '#ffffff',
                borderRadius: '28px',
                padding: '40px 36px',
                boxShadow: '0 20px 48px -12px rgba(99, 102, 241, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                boxSizing: 'border-box',
                position: 'relative'
              }}
            >
              {/* Card Header */}
              <div style={{ marginBottom: '28px' }}>
                <h2
                  style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: '0 0 6px 0',
                    letterSpacing: '-0.4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {mode === 'login' ? 'Welcome back' : 'Join AIIMS'}
                  <span style={{ fontSize: '24px' }}>👋</span>
                </h2>
                <p
                  style={{
                    fontSize: '14px',
                    color: '#64748b',
                    margin: 0,
                    fontWeight: 500
                  }}
                >
                  {mode === 'login'
                    ? 'Continue your AI learning journey.'
                    : 'Start your personalized AI growth path today.'}
                </p>
              </div>

              {/* Alert Feedback */}
              {errorMessage && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '20px'
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#047857',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '20px'
                  }}
                >
                  <CheckCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Authentication Form */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Full Name field if registering */}
                {mode === 'register' && (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#334155',
                        marginBottom: '8px'
                      }}
                    >
                      Full Name
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User
                        size={17}
                        style={{
                          position: 'absolute',
                          left: '14px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#94a3b8'
                        }}
                      />
                      <input
                        type="text"
                        placeholder="e.g. Divya Kumar"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px 12px 42px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '12px',
                          outline: 'none',
                          backgroundColor: '#f8fafc',
                          boxSizing: 'border-box',
                          color: '#0f172a',
                          transition: 'all 0.2s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#6366f1';
                          e.target.style.backgroundColor = '#ffffff';
                          e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e2e8f0';
                          e.target.style.backgroundColor = '#f8fafc';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Email Address */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '8px'
                    }}
                  >
                    Email address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={17}
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8'
                      }}
                    />
                    <input
                      type="email"
                      id="login-email-input"
                      placeholder="yourname@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 42px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '12px',
                        outline: 'none',
                        backgroundColor: '#f8fafc',
                        boxSizing: 'border-box',
                        color: '#0f172a',
                        transition: 'all 0.2s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#6366f1';
                        e.target.style.backgroundColor = '#ffffff';
                        e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.backgroundColor = '#f8fafc';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '8px'
                    }}
                  >
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={17}
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8'
                      }}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="login-password-input"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 42px 12px 42px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '12px',
                        outline: 'none',
                        backgroundColor: '#f8fafc',
                        boxSizing: 'border-box',
                        color: '#0f172a',
                        transition: 'all 0.2s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#6366f1';
                        e.target.style.backgroundColor = '#ffffff';
                        e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
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
                      title={showPassword ? 'Hide password' : 'Show password'}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px'
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Forgot Password Link */}
                  {mode === 'login' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <span
                        onClick={() => setShowForgotModal(true)}
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#4f46e5',
                          cursor: 'pointer',
                          transition: 'color 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#3730a3')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#4f46e5')}
                      >
                        Forgot password?
                      </span>
                    </div>
                  )}
                </div>

                {/* Primary Action Button: Sign In / Create Account */}
                <button
                  type="submit"
                  id="login-submit-button"
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%)',
                    color: '#ffffff',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
                    transition: 'all 0.2s ease',
                    opacity: isLoading ? 0.75 : 1,
                    marginTop: '4px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 12px 28px rgba(99, 102, 241, 0.45)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.35)';
                  }}
                >
                  {isLoading ? (
                    'Signing in...'
                  ) : (
                    <>
                      <span>{mode === 'login' ? 'Sign in' : 'Create account'}</span>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  margin: '24px 0',
                  gap: '14px'
                }}
              >
                <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>or continue with</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
              </div>

              {/* Social Login Buttons */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '28px'
                }}
              >
                {/* Google Button */}
                <button
                  type="button"
                  onClick={() => handleSocialLogin('google')}
                  disabled={isLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '11px',
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#1e293b',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Google</span>
                </button>

                {/* Microsoft Button */}
                <button
                  type="button"
                  onClick={() => handleSocialLogin('microsoft')}
                  disabled={isLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '11px',
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#1e293b',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#F25022" d="M1 1h10v10H1z" />
                    <path fill="#00A4EF" d="M1 13h10v10H1z" />
                    <path fill="#7FBA00" d="M13 1h10v10H13z" />
                    <path fill="#FFB900" d="M13 13h10v10H13z" />
                  </svg>
                  <span>Microsoft</span>
                </button>
              </div>

              {/* Reassurance Footer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#64748b'
                }}
              >
                <ShieldCheck size={16} color="#475569" />
                <span>Your data is safe with us.</span>
                <span
                  style={{ color: '#4f46e5', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => alert('AIIMS secures all student progress, diagnostic telemetry, and learner states using end-to-end tokenized sessions.')}
                >
                  Learn more
                </span>
              </div>
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
