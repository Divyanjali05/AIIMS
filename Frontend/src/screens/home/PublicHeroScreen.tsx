import React, { useState } from 'react';
import {
  Compass,
  Sparkles,
  ArrowRight,
  Target,
  Wallet,
  Clock,
  Award,
  CheckCircle2,
  LogIn,
  Menu,
  X,
  Zap,
  Brain,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { AiimsLogo } from '../../components/common/AiimsLogo';
import { Modal } from '../../components/common/Modal';
import { SUPPORT_EMAIL } from '../../config/appConfig';
import { colors } from '../../theme/tokens';

interface PublicHeroScreenProps {
  onStartJourney: () => void;
  onSignIn: () => void;
}

export const PublicHeroScreen: React.FC<PublicHeroScreenProps> = ({ onStartJourney, onSignIn }) => {
  const { isDarkMode } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [activePreview, setActivePreview] = useState<'diagnostic' | 'clarity' | 'wallet' | 'focus'>(
    'diagnostic'
  );

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Color theme helpers
  const bgPage = isDarkMode ? colors.darkNeutral.pageBg : colors.neutral.pageBg;
  const bgCard = isDarkMode ? colors.darkNeutral.cardBg : colors.neutral.cardBg;
  const borderCard = isDarkMode ? colors.darkNeutral.border : colors.neutral.border;
  const textHeading = isDarkMode ? colors.darkNeutral.textHeading : colors.neutral.textHeading;
  const textBody = isDarkMode ? colors.darkNeutral.textBody : colors.neutral.textBody;
  const textMuted = isDarkMode ? colors.darkNeutral.textMuted : colors.neutral.textMuted;

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: bgPage,
        color: textHeading,
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
        overflowX: 'hidden',
        position: 'relative',
        boxSizing: 'border-box',
        transition: 'background-color 0.25s ease, color 0.25s ease',
      }}
    >
      {/* Lightweight Ambient Glow Accents */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-60px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(900px, 100vw)',
          height: '420px',
          background: isDarkMode
            ? 'radial-gradient(ellipse at top, rgba(99, 102, 241, 0.15) 0%, rgba(8, 11, 22, 0) 70%)'
            : 'radial-gradient(ellipse at top, rgba(99, 102, 241, 0.08) 0%, rgba(248, 247, 253, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Embedded CSS for Smooth Keyframes & Responsiveness */}
      <style>{`
        @keyframes floatOrbitSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes floatOrbitDelay {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(8px); }
        }
        @keyframes pulseGlowSlow {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.04); opacity: 1; }
        }
        .aiims-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: ${isDarkMode ? colors.lavender.darkBg : colors.lavender.light};
          border: 1px solid ${isDarkMode ? colors.lavender.darkBorder : colors.lavender.border};
          border-radius: 9999px;
          color: ${isDarkMode ? colors.lavender.darkText : colors.lavender.text};
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          margin-bottom: 20px;
        }
        .aiims-btn-primary-hero {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, ${colors.primary.base} 0%, ${colors.lavender.base} 100%);
          color: #FFFFFF;
          padding: 13px 26px;
          border-radius: 12px;
          font-size: 14.5px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 4px 16px -2px rgba(99, 102, 241, 0.35);
          text-decoration: none;
        }
        .aiims-btn-primary-hero:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px -1px rgba(99, 102, 241, 0.45);
        }
        .aiims-btn-secondary-hero {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF'};
          color: ${textHeading};
          padding: 13px 22px;
          border-radius: 12px;
          font-size: 14.5px;
          font-weight: 600;
          border: 1px solid ${borderCard};
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
          text-decoration: none;
        }
        .aiims-btn-secondary-hero:hover {
          border-color: ${colors.primary.base};
          color: ${colors.primary.base};
          transform: translateY(-1px);
        }
        .aiims-nav-link {
          background: none;
          border: none;
          color: ${textMuted};
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          padding: 6px 12px;
          border-radius: 8px;
          transition: color 0.15s ease, background-color 0.15s ease;
        }
        .aiims-nav-link:hover {
          color: ${textHeading};
          background-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
        }
        .aiims-card-hover {
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .aiims-card-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 24px -4px rgba(15, 23, 42, 0.06);
          border-color: ${colors.primary.border} !important;
        }
        @media (max-width: 860px) {
          .aiims-hero-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          .aiims-hero-content {
            text-align: center !important;
            align-items: center !important;
          }
          .aiims-hero-cta-group {
            justify-content: center !important;
          }
          .aiims-desktop-nav-links {
            display: none !important;
          }
          .aiims-mobile-menu-btn {
            display: inline-flex !important;
          }
        }
        @media (min-width: 861px) {
          .aiims-mobile-menu-btn {
            display: none !important;
          }
          .aiims-mobile-drawer {
            display: none !important;
          }
        }
      `}</style>

      {/* =====================================================================
          A. NAVIGATION BAR (Clean, Sticky, Responsive)
          ===================================================================== */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          width: '100%',
          backgroundColor: isDarkMode ? 'rgba(8, 11, 22, 0.88)' : 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${borderCard}`,
          padding: '14px 24px',
          boxSizing: 'border-box',
          transition: 'background-color 0.25s ease, border-color 0.25s ease',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          >
            <AiimsLogo size="md" showWordmark={true} textColor={textHeading} />
          </div>

          {/* Desktop Navigation Links */}
          <nav
            className="aiims-desktop-nav-links"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <button className="aiims-nav-link" onClick={() => scrollToSection('value-props')}>
              Features
            </button>
            <button className="aiims-nav-link" onClick={() => scrollToSection('how-it-works')}>
              How It Works
            </button>
            <button
              className="aiims-nav-link"
              onClick={() => scrollToSection('featured-experience')}
            >
              Experience
            </button>
            <button className="aiims-nav-link" onClick={() => setAboutModalOpen(true)}>
              About
            </button>
          </nav>

          {/* Right Action Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div id="hero-theme-toggle-btn" style={{ display: 'inline-flex' }}>
              <ThemeToggle size="sm" />
            </div>

            <button
              id="hero-nav-signin-btn"
              onClick={onSignIn}
              style={{
                background: 'transparent',
                color: textBody,
                border: `1px solid ${borderCard}`,
                borderRadius: '10px',
                padding: '8px 16px',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <LogIn size={15} />
              Sign In
            </button>

            <button
              id="hero-nav-start-btn"
              onClick={onStartJourney}
              style={{
                background: `linear-gradient(135deg, ${colors.primary.base} 0%, ${colors.lavender.base} 100%)`,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 18px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 3px 12px rgba(99, 102, 241, 0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              Get Started
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              className="aiims-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
              style={{
                background: 'none',
                border: `1px solid ${borderCard}`,
                borderRadius: '8px',
                padding: '8px',
                color: textHeading,
                cursor: 'pointer',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Collapsible Drawer */}
        {mobileMenuOpen && (
          <div
            className="aiims-mobile-drawer"
            style={{
              paddingTop: '16px',
              paddingBottom: '8px',
              borderTop: `1px solid ${borderCard}`,
              marginTop: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <button
              className="aiims-nav-link"
              onClick={() => scrollToSection('value-props')}
              style={{ textAlign: 'left', width: '100%', padding: '10px 12px' }}
            >
              Features & Benefits
            </button>
            <button
              className="aiims-nav-link"
              onClick={() => scrollToSection('how-it-works')}
              style={{ textAlign: 'left', width: '100%', padding: '10px 12px' }}
            >
              How It Works (3 Steps)
            </button>
            <button
              className="aiims-nav-link"
              onClick={() => scrollToSection('featured-experience')}
              style={{ textAlign: 'left', width: '100%', padding: '10px 12px' }}
            >
              Platform Experience
            </button>
            <button
              className="aiims-nav-link"
              onClick={() => {
                setMobileMenuOpen(false);
                setAboutModalOpen(true);
              }}
              style={{ textAlign: 'left', width: '100%', padding: '10px 12px' }}
            >
              About AIIMS
            </button>
          </div>
        )}
      </header>

      {/* =====================================================================
          B. HERO SECTION (Focused, Clear Headline, CTAs, Lightweight Ecosystem Visual)
          ===================================================================== */}
      <section
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '56px 24px 64px 24px',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          className="aiims-hero-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 0.9fr',
            gap: '36px',
            alignItems: 'center',
          }}
        >
          {/* Left Column: Headline, Summary & Direct CTAs */}
          <div
            className="aiims-hero-content"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            {/* Small Brand Pill */}
            <div className="aiims-hero-badge">
              <Sparkles size={13} />
              AI Intelligence & Mentoring System
            </div>

            {/* Main Headline */}
            <h1
              style={{
                fontSize: 'clamp(34px, 4.2vw, 52px)',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-1.2px',
                margin: '0 0 18px 0',
                color: textHeading,
              }}
            >
              Master Practical AI Skills with{' '}
              <span
                style={{
                  background: `linear-gradient(135deg, ${colors.primary.base} 0%, ${colors.lavender.base} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Intelligent Mentoring
              </span>
            </h1>

            {/* Short Supporting Description */}
            <p
              style={{
                fontSize: 'clamp(15px, 1.8vw, 17px)',
                lineHeight: 1.6,
                color: textBody,
                fontWeight: 450,
                margin: '0 0 32px 0',
                maxWidth: '540px',
              }}
            >
              Discover your AI strengths through diagnostic evaluation, practice guided prompt
              engineering, and build verified capabilities with personalized AI mentoring.
            </p>

            {/* Primary & Secondary Action Buttons */}
            <div
              className="aiims-hero-cta-group"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                flexWrap: 'wrap',
              }}
            >
              <button
                id="hero-primary-cta"
                className="aiims-btn-primary-hero"
                onClick={onStartJourney}
              >
                Get Started
                <ArrowRight size={16} />
              </button>

              <button
                id="hero-secondary-cta"
                className="aiims-btn-secondary-hero"
                onClick={() => scrollToSection('how-it-works')}
              >
                <Compass size={16} />
                Explore AIIMS
              </button>
            </div>
          </div>

          {/* Right Column: Attractive, Lightweight Ecosystem Visual (No Heavy Canvas) */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '380px',
              padding: '20px',
            }}
          >
            {/* Outer Subtle Orbit Ring */}
            <div
              style={{
                position: 'absolute',
                width: '320px',
                height: '320px',
                borderRadius: '50%',
                border: `1.5px dashed ${isDarkMode ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.18)'}`,
                pointerEvents: 'none',
              }}
            />

            {/* Center Core: AIIMS Intelligence Hub */}
            <div
              style={{
                width: '130px',
                height: '130px',
                borderRadius: '32px',
                background: isDarkMode
                  ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)'
                  : 'linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)',
                border: `2px solid ${isDarkMode ? colors.primary.border : colors.primary.base}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: isDarkMode
                  ? '0 0 32px rgba(99, 102, 241, 0.3)'
                  : '0 8px 24px rgba(99, 102, 241, 0.18)',
                zIndex: 2,
                animation: 'pulseGlowSlow 6s ease-in-out infinite',
              }}
            >
              <Brain size={32} color={colors.primary.base} />
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: textHeading,
                  letterSpacing: '0.4px',
                }}
              >
                AIIMS CORE
              </div>
            </div>

            {/* Orbit Node 1: Diagnostic Radar (Top Left - Sky Blue) */}
            <div
              style={{
                position: 'absolute',
                top: '24px',
                left: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '9999px',
                background: bgCard,
                border: `1px solid ${colors.sky.border}`,
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.12)',
                animation: 'floatOrbitSlow 5s ease-in-out infinite',
              }}
            >
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: colors.sky.light,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.sky.text,
                }}
              >
                <Compass size={14} />
              </div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: textHeading }}>
                Diagnostic Radar
              </div>
            </div>

            {/* Orbit Node 2: Clarity Task Lab (Top Right - Lavender) */}
            <div
              style={{
                position: 'absolute',
                top: '32px',
                right: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '9999px',
                background: bgCard,
                border: `1px solid ${colors.lavender.border}`,
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.12)',
                animation: 'floatOrbitDelay 5.5s ease-in-out infinite',
              }}
            >
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: colors.lavender.light,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.lavender.text,
                }}
              >
                <Target size={14} />
              </div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: textHeading }}>
                Prompt Lab
              </div>
            </div>

            {/* Orbit Node 3: AI Wallet (Bottom Left - Mint Green) */}
            <div
              style={{
                position: 'absolute',
                bottom: '28px',
                left: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '9999px',
                background: bgCard,
                border: `1px solid ${colors.mint.border}`,
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.12)',
                animation: 'floatOrbitDelay 6s ease-in-out infinite',
              }}
            >
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: colors.mint.light,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.mint.text,
                }}
              >
                <Wallet size={14} />
              </div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: textHeading }}>
                AI Tool Wallet
              </div>
            </div>

            {/* Orbit Node 4: Focus Sprints (Bottom Right - Coral) */}
            <div
              style={{
                position: 'absolute',
                bottom: '36px',
                right: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '9999px',
                background: bgCard,
                border: `1px solid ${colors.coral.border}`,
                boxShadow: '0 4px 14px rgba(225, 29, 72, 0.12)',
                animation: 'floatOrbitSlow 6.5s ease-in-out infinite',
              }}
            >
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: colors.coral.light,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.coral.text,
                }}
              >
                <Clock size={14} />
              </div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: textHeading }}>
                Focus Sprints
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          C. CORE VALUE PROPOSITION (Only the 3 Most Important Benefits)
          ===================================================================== */}
      <section
        id="value-props"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '64px 24px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: isDarkMode ? colors.mint.darkBg : colors.mint.light,
              border: `1px solid ${isDarkMode ? colors.mint.darkBorder : colors.mint.border}`,
              color: isDarkMode ? colors.mint.darkText : colors.mint.text,
              fontSize: '11.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: '10px',
            }}
          >
            Why AIIMS
          </div>
          <h2
            style={{
              fontSize: 'clamp(26px, 3.2vw, 36px)',
              fontWeight: 800,
              letterSpacing: '-0.8px',
              margin: '0 0 10px 0',
              color: textHeading,
            }}
          >
            Built for Real-World AI Competence
          </h2>
          <p
            style={{
              fontSize: '15.5px',
              color: textBody,
              maxWidth: '560px',
              margin: '0 auto',
              lineHeight: 1.5,
            }}
          >
            Everything you need to move from passive AI user to confident, verified practitioner.
          </p>
        </div>

        {/* 3 Value Proposition Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Benefit 1: Evidence-Based Diagnostics (Sky Blue) */}
          <div
            className="aiims-card-hover"
            style={{
              background: bgCard,
              borderRadius: '16px',
              padding: '28px 24px',
              border: `1px solid ${borderCard}`,
              borderTop: `4px solid ${colors.sky.base}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: colors.sky.light,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.sky.text,
              }}
            >
              <Compass size={22} />
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: textHeading }}>
              Diagnostic Capability Profiling
            </h3>
            <p style={{ margin: 0, fontSize: '14.5px', color: textBody, lineHeight: 1.55 }}>
              Map your prompt precision, analytical depth, and tool readiness using multi-model
              rubric evaluation.
            </p>
          </div>

          {/* Benefit 2: Guided Hands-On Clarity Labs (Lavender) */}
          <div
            className="aiims-card-hover"
            style={{
              background: bgCard,
              borderRadius: '16px',
              padding: '28px 24px',
              border: `1px solid ${borderCard}`,
              borderTop: `4px solid ${colors.lavender.base}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: colors.lavender.light,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.lavender.text,
              }}
            >
              <Target size={22} />
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: textHeading }}>
              Hands-On Clarity Tasks
            </h3>
            <p style={{ margin: 0, fontSize: '14.5px', color: textBody, lineHeight: 1.55 }}>
              Solve practical problem-solving challenges that adapt to your skill level from
              foundational to advanced.
            </p>
          </div>

          {/* Benefit 3: Intelligent AI Tool Ecosystem (Mint Green) */}
          <div
            className="aiims-card-hover"
            style={{
              background: bgCard,
              borderRadius: '16px',
              padding: '28px 24px',
              border: `1px solid ${borderCard}`,
              borderTop: `4px solid ${colors.mint.base}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: colors.mint.light,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.mint.text,
              }}
            >
              <Wallet size={22} />
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: textHeading }}>
              Intelligent Tool Matching & Credits
            </h3>
            <p style={{ margin: 0, fontSize: '14.5px', color: textBody, lineHeight: 1.55 }}>
              Match tasks to the best verified AI tools, earn AI Credits (AC), and build your
              verifiable learning portfolio.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================================
          D. HOW IT WORKS (3 Simple Steps — Horizontal on Desktop, Stacked on Mobile)
          ===================================================================== */}
      <section
        id="how-it-works"
        style={{
          borderTop: `1px solid ${borderCard}`,
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.02)' : '#FAF9FF',
          padding: '64px 24px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '9999px',
                backgroundColor: isDarkMode ? colors.sunshine.darkBg : colors.sunshine.light,
                border: `1px solid ${isDarkMode ? colors.sunshine.darkBorder : colors.sunshine.border}`,
                color: isDarkMode ? colors.sunshine.darkText : colors.sunshine.text,
                fontSize: '11.5px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                marginBottom: '10px',
              }}
            >
              The Learner Journey
            </div>
            <h2
              style={{
                fontSize: 'clamp(26px, 3.2vw, 36px)',
                fontWeight: 800,
                letterSpacing: '-0.8px',
                margin: '0 0 10px 0',
                color: textHeading,
              }}
            >
              How AIIMS Works in 3 Simple Steps
            </h2>
            <p
              style={{
                fontSize: '15.5px',
                color: textBody,
                maxWidth: '540px',
                margin: '0 auto',
                lineHeight: 1.5,
              }}
            >
              A clear, guided roadmap designed for measurable progress and verified mastery.
            </p>
          </div>

          {/* 3 Step Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
            }}
          >
            {/* Step 1 */}
            <div
              style={{
                background: bgCard,
                borderRadius: '16px',
                padding: '28px 24px',
                border: `1px solid ${borderCard}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: colors.sky.text,
                    background: colors.sky.light,
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    letterSpacing: '0.5px',
                  }}
                >
                  STEP 01
                </span>
                <Compass size={20} color={colors.sky.base} />
              </div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: textHeading }}>
                Take the Baseline Diagnostic
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: textBody, lineHeight: 1.55 }}>
                Complete a 15-minute diagnostic assessment to map your prompt engineering and
                analytical strengths.
              </p>
            </div>

            {/* Step 2 */}
            <div
              style={{
                background: bgCard,
                borderRadius: '16px',
                padding: '28px 24px',
                border: `1px solid ${borderCard}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: colors.lavender.text,
                    background: colors.lavender.light,
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    letterSpacing: '0.5px',
                  }}
                >
                  STEP 02
                </span>
                <Zap size={20} color={colors.lavender.base} />
              </div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: textHeading }}>
                Practice in Guided AI Labs
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: textBody, lineHeight: 1.55 }}>
                Tackle Clarity problem-solving tasks and Pomodoro focus sprints with immediate
                rubric-based feedback.
              </p>
            </div>

            {/* Step 3 */}
            <div
              style={{
                background: bgCard,
                borderRadius: '16px',
                padding: '28px 24px',
                border: `1px solid ${borderCard}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: colors.mint.text,
                    background: colors.mint.light,
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    letterSpacing: '0.5px',
                  }}
                >
                  STEP 03
                </span>
                <Award size={20} color={colors.mint.base} />
              </div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: textHeading }}>
                Earn Credentials & Expand
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: textBody, lineHeight: 1.55 }}>
                Accumulate verified AI Credits, unlock advanced problem solvers, and share your
                capability profile.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          E. FEATURED LEARNING EXPERIENCE (Preview of Existing Platform Tools)
          ===================================================================== */}
      <section
        id="featured-experience"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '64px 24px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: isDarkMode ? colors.lavender.darkBg : colors.lavender.light,
              border: `1px solid ${isDarkMode ? colors.lavender.darkBorder : colors.lavender.border}`,
              color: isDarkMode ? colors.lavender.darkText : colors.lavender.text,
              fontSize: '11.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: '10px',
            }}
          >
            Platform Preview
          </div>
          <h2
            style={{
              fontSize: 'clamp(26px, 3.2vw, 36px)',
              fontWeight: 800,
              letterSpacing: '-0.8px',
              margin: '0 0 10px 0',
              color: textHeading,
            }}
          >
            Inside the AIIMS Experience
          </h2>
          <p
            style={{
              fontSize: '15.5px',
              color: textBody,
              maxWidth: '560px',
              margin: '0 auto',
              lineHeight: 1.5,
            }}
          >
            Explore real features built to keep you focused, engaged, and making continuous
            progress.
          </p>
        </div>

        {/* Tab Selector Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            marginBottom: '28px',
          }}
        >
          {[
            { id: 'diagnostic', label: 'Diagnostic Radar', icon: Compass },
            { id: 'clarity', label: 'Clarity Task Labs', icon: Target },
            { id: 'wallet', label: 'AI Tool Wallet', icon: Wallet },
            { id: 'focus', label: 'Deep Focus Timer', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activePreview === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() =>
                  setActivePreview(tab.id as 'diagnostic' | 'clarity' | 'wallet' | 'focus')
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: isActive ? `1px solid ${colors.primary.base}` : `1px solid ${borderCard}`,
                  backgroundColor: isActive
                    ? isDarkMode
                      ? 'rgba(99, 102, 241, 0.15)'
                      : colors.primary.light
                    : bgCard,
                  color: isActive ? colors.primary.base : textMuted,
                  fontSize: '13.5px',
                  fontWeight: isActive ? 700 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Dynamic Preview Card */}
        <div
          style={{
            background: bgCard,
            borderRadius: '20px',
            border: `1px solid ${borderCard}`,
            padding: '32px 28px',
            boxShadow: '0 8px 30px -4px rgba(0, 0, 0, 0.04)',
            maxWidth: '820px',
            margin: '0 auto',
          }}
        >
          {activePreview === 'diagnostic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: colors.sky.text,
                      background: colors.sky.light,
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    DIAGNOSTIC RADAR
                  </span>
                  <h4
                    style={{
                      margin: '6px 0 0',
                      fontSize: '18px',
                      fontWeight: 800,
                      color: textHeading,
                    }}
                  >
                    Evidence-Based AI Capability Score
                  </h4>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: '28px',
                      fontWeight: 900,
                      color: colors.sky.base,
                      lineHeight: 1,
                    }}
                  >
                    82/100
                  </div>
                  <div style={{ fontSize: '12px', color: textMuted, fontWeight: 600 }}>
                    Proficient Baseline
                  </div>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '14.5px', color: textBody, lineHeight: 1.5 }}>
                Evaluates prompt clarity, multi-step problem breakdown, verification skepticism, and
                ethical safeguards using calibrated scoring rubrics.
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  marginTop: '4px',
                }}
              >
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: isDarkMode ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                    border: `1px solid ${borderCard}`,
                  }}
                >
                  <div style={{ fontSize: '12px', color: textMuted }}>Prompt Clarity</div>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: textHeading,
                      marginTop: '2px',
                    }}
                  >
                    88% Mastery
                  </div>
                </div>
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: isDarkMode ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                    border: `1px solid ${borderCard}`,
                  }}
                >
                  <div style={{ fontSize: '12px', color: textMuted }}>Critical Verification</div>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: textHeading,
                      marginTop: '2px',
                    }}
                  >
                    76% Mastery
                  </div>
                </div>
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: isDarkMode ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                    border: `1px solid ${borderCard}`,
                  }}
                >
                  <div style={{ fontSize: '12px', color: textMuted }}>Tool Fluency</div>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: textHeading,
                      marginTop: '2px',
                    }}
                  >
                    84% Mastery
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePreview === 'clarity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: colors.lavender.text,
                      background: colors.lavender.light,
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    CLARITY LABS
                  </span>
                  <h4
                    style={{
                      margin: '6px 0 0',
                      fontSize: '18px',
                      fontWeight: 800,
                      color: textHeading,
                    }}
                  >
                    Adaptive Prompt Engineering Challenges
                  </h4>
                </div>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: colors.mint.text,
                    background: colors.mint.light,
                    padding: '4px 10px',
                    borderRadius: '9999px',
                  }}
                >
                  +15 AC Reward
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '14.5px', color: textBody, lineHeight: 1.5 }}>
                Level 1 through Level 4 guided practice tasks. Formulate zero-shot, few-shot, and
                reasoning-chained prompts evaluated directly by Claude & Gemini rubrics.
              </p>
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: isDarkMode ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                  border: `1px solid ${borderCard}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={18} color={colors.mint.base} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: textHeading }}>
                    Task #3: Edge-Case Constraint Crafting
                  </span>
                </div>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: colors.lavender.text }}>
                  Score: 92/100
                </span>
              </div>
            </div>
          )}

          {activePreview === 'wallet' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: colors.mint.text,
                      background: colors.mint.light,
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    INTELLIGENT TOOL WALLET
                  </span>
                  <h4
                    style={{
                      margin: '6px 0 0',
                      fontSize: '18px',
                      fontWeight: 800,
                      color: textHeading,
                    }}
                  >
                    Verified Tool Matching & AI Credits
                  </h4>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 900,
                      color: colors.mint.base,
                      lineHeight: 1,
                    }}
                  >
                    500 AC
                  </div>
                  <div style={{ fontSize: '12px', color: textMuted, fontWeight: 600 }}>
                    Active Balance
                  </div>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '14.5px', color: textBody, lineHeight: 1.5 }}>
                Explore 25+ cataloged AI tools filtered by safety, academic utility, and relevance
                scores. Claim daily discovery rewards and track usage idempotency.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: colors.sky.light,
                    color: colors.sky.text,
                  }}
                >
                  98% Research Fit
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: colors.mint.light,
                    color: colors.mint.text,
                  }}
                >
                  Enterprise Data Privacy
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: colors.lavender.light,
                    color: colors.lavender.text,
                  }}
                >
                  Dual-Ledger Audited
                </span>
              </div>
            </div>
          )}

          {activePreview === 'focus' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: colors.coral.text,
                      background: colors.coral.light,
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    FOCUS SPRINTS
                  </span>
                  <h4
                    style={{
                      margin: '6px 0 0',
                      fontSize: '18px',
                      fontWeight: 800,
                      color: textHeading,
                    }}
                  >
                    Structured Deep-Work Sessions
                  </h4>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: '26px',
                      fontWeight: 900,
                      color: colors.coral.base,
                      lineHeight: 1,
                    }}
                  >
                    25:00
                  </div>
                  <div style={{ fontSize: '12px', color: textMuted, fontWeight: 600 }}>
                    Focus Timer
                  </div>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '14.5px', color: textBody, lineHeight: 1.5 }}>
                Lock in learning retention with distraction-free Pomodoro focus intervals, adaptive
                audio chimes, and automatic session streak tracking.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    color: textBody,
                  }}
                >
                  <CheckCircle2 size={16} color={colors.mint.base} />
                  25 Min Deep Work
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    color: textBody,
                  }}
                >
                  <CheckCircle2 size={16} color={colors.mint.base} />5 Min Rest Interval
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    color: textBody,
                  }}
                >
                  <CheckCircle2 size={16} color={colors.mint.base} />
                  Streak Synchronized
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          F. FINAL CALL TO ACTION (Clean, Encouraging, No Bloat)
          ===================================================================== */}
      <section
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '40px 24px 72px 24px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            background: isDarkMode
              ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.14) 0%, rgba(124, 58, 237, 0.10) 100%)'
              : 'linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 100%)',
            border: `1.5px solid ${isDarkMode ? colors.primary.border : '#DDD6FE'}`,
            borderRadius: '24px',
            padding: '48px 32px',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(26px, 3.5vw, 38px)',
              fontWeight: 800,
              letterSpacing: '-0.8px',
              margin: '0 0 12px 0',
              color: textHeading,
            }}
          >
            Start Your AI Journey Today
          </h2>
          <p
            style={{
              fontSize: '16px',
              color: textBody,
              maxWidth: '520px',
              margin: '0 auto 28px auto',
              lineHeight: 1.5,
            }}
          >
            Join thousands of learners building verifiable prompt engineering skills and mastering
            the modern AI ecosystem.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={onStartJourney}
              className="aiims-btn-primary-hero"
              style={{ padding: '14px 28px', fontSize: '15px' }}
            >
              Get Started Free
              <ArrowRight size={16} />
            </button>
            <button
              onClick={onSignIn}
              className="aiims-btn-secondary-hero"
              style={{ padding: '14px 24px', fontSize: '15px' }}
            >
              Sign In to Workspace
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          G. FOOTER (Minimal, Accessible, Legal & Support)
          ===================================================================== */}
      <footer
        style={{
          borderTop: `1px solid ${borderCard}`,
          backgroundColor: isDarkMode ? '#05070E' : '#FFFFFF',
          padding: '36px 24px',
          boxSizing: 'border-box',
          transition: 'background-color 0.25s ease, border-color 0.25s ease',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '18px',
          }}
        >
          {/* Logo & Copyright */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <AiimsLogo size="sm" showWordmark={true} textColor={textHeading} />
            <span style={{ fontSize: '12.5px', color: textMuted }}>
              © {new Date().getFullYear()} AIIMS. All rights reserved.
            </span>
          </div>

          {/* Minimal Navigation & Legal Links */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              fontSize: '13px',
              color: textMuted,
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={() => setAboutModalOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                padding: 0,
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              About
            </button>
            <span>•</span>
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState(null, '', '/privacy');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              Privacy Policy
            </a>
            <span>•</span>
            <a
              href="/terms"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState(null, '', '/terms');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              Terms of Service
            </a>
            <span>•</span>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              Contact & Support
            </a>
          </div>

          {/* System Status Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '12px',
                color: colors.mint.base,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: colors.mint.base,
                  boxShadow: `0 0 6px ${colors.mint.base}`,
                }}
              />
              Platform Operational
            </span>
          </div>
        </div>
      </footer>

      {/* =====================================================================
          ABOUT MODAL (Clean, Informative)
          ===================================================================== */}
      <Modal
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
        title="About AIIMS"
        subtitle="AI Intelligence & Mentoring System"
        maxWidth="520px"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            fontSize: '14.5px',
            color: textBody,
            lineHeight: 1.6,
          }}
        >
          <p style={{ margin: 0 }}>
            <strong>AIIMS</strong> is an advanced AI capability diagnostic, intelligent tool
            discovery wallet, and prompt engineering mentoring platform designed for students,
            educators, and innovators.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div
                style={{
                  padding: '6px',
                  borderRadius: '8px',
                  background: colors.sky.light,
                  color: colors.sky.text,
                  marginTop: '2px',
                }}
              >
                <Compass size={16} />
              </div>
              <div>
                <strong>Evidence-Based Evaluation:</strong> Real question evidence evaluated with
                multi-model rubrics to assess true cognitive depth rather than guess-work.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div
                style={{
                  padding: '6px',
                  borderRadius: '8px',
                  background: colors.lavender.light,
                  color: colors.lavender.text,
                  marginTop: '2px',
                }}
              >
                <Target size={16} />
              </div>
              <div>
                <strong>Guided Clarity Tasks:</strong> Progressive challenges designed to teach
                robust prompt construction and critical verification.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div
                style={{
                  padding: '6px',
                  borderRadius: '8px',
                  background: colors.mint.light,
                  color: colors.mint.text,
                  marginTop: '2px',
                }}
              >
                <Wallet size={16} />
              </div>
              <div>
                <strong>Intelligent Tool Matching:</strong> Safe, curated catalog matching
                real-world tasks to verified AI tools with an audited credits ledger.
              </div>
            </div>
          </div>

          <div
            style={{
              borderTop: `1px solid ${borderCard}`,
              paddingTop: '12px',
              fontSize: '13px',
              color: textMuted,
            }}
          >
            Contact our educational support team anytime at{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              style={{ color: colors.primary.base, fontWeight: 600 }}
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </Modal>
    </div>
  );
};
