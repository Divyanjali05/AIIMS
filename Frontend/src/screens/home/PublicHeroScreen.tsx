import React, { useRef } from 'react';
import {
  Sparkles,
  ArrowRight,
  Compass,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  LogIn,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { AiimsLogo } from '../../components/common/AiimsLogo';

import { Hero3DVisual } from '../../components/3d/Hero3DVisual';
import { LearningUniverseMap } from '../../components/universe/LearningUniverseMap';
import { SUPPORT_EMAIL } from '../../config/appConfig';

interface PublicHeroScreenProps {
  onStartJourney: () => void;
  onSignIn: () => void;
}

export const PublicHeroScreen: React.FC<PublicHeroScreenProps> = ({ onStartJourney, onSignIn }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const universeSectionRef = useRef<HTMLDivElement>(null);

  const scrollToUniverse = () => {
    universeSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: isDarkMode ? '#080B16' : 'var(--aiims-bg-page, #F8F7FD)',
        color: isDarkMode ? '#F8FAFC' : 'var(--aiims-text-heading, #0F172A)',
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
        overflowX: 'hidden',
        position: 'relative',
        boxSizing: 'border-box',
        transition: 'background-color 0.25s ease, color 0.25s ease',
      }}
    >
      {/* Background Ambient Cosmic Glows */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-10%',
          left: '15%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: isDarkMode
            ? 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(8, 11, 22, 0) 70%)'
            : 'radial-gradient(circle, rgba(124, 58, 237, 0.08) 0%, rgba(248, 247, 253, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '30%',
          right: '5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: isDarkMode
            ? 'radial-gradient(circle, rgba(34, 211, 238, 0.12) 0%, rgba(8, 11, 22, 0) 70%)'
            : 'radial-gradient(circle, rgba(6, 182, 212, 0.07) 0%, rgba(248, 247, 253, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Global Style Injections for Public Hero */}
      <style>{`
        .aiims-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: ${isDarkMode ? 'rgba(139, 92, 246, 0.12)' : 'rgba(124, 58, 237, 0.08)'};
          border: 1px solid ${isDarkMode ? 'rgba(139, 92, 246, 0.35)' : 'rgba(124, 58, 237, 0.22)'};
          border-radius: 9999px;
          color: ${isDarkMode ? '#DDD6FE' : '#6D28D9'};
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          backdrop-filter: blur(8px);
          margin-bottom: 24px;
        }

        .aiims-btn-primary-hero {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%);
          color: #FFFFFF;
          padding: 14px 28px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          border: 1px solid rgba(196, 181, 253, 0.3);
          box-shadow: 0 4px 20px -2px rgba(124, 58, 237, 0.45);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          text-decoration: none;
        }
        .aiims-btn-primary-hero:hover {
          background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 28px -2px rgba(124, 58, 237, 0.6);
        }
        .aiims-btn-primary-hero:active {
          transform: translateY(0);
        }

        .aiims-btn-secondary-hero {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF'};
          color: ${isDarkMode ? '#E2E8F0' : '#334155'};
          padding: 14px 26px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1'};
          backdrop-filter: blur(8px);
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: ${isDarkMode ? 'none' : '0 2px 6px rgba(0, 0, 0, 0.04)'};
        }
        .aiims-btn-secondary-hero:hover {
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#F8FAFC'};
          border-color: ${isDarkMode ? 'rgba(34, 211, 238, 0.4)' : '#6366F1'};
          color: ${isDarkMode ? '#22D3EE' : '#4F46E5'};
          transform: translateY(-1px);
          box-shadow: ${isDarkMode ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.12)'};
        }

        .aiims-nav-link {
          color: ${isDarkMode ? '#94A3B8' : '#64748B'};
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s ease;
          background: none;
          border: none;
          padding: 6px 10px;
        }
        .aiims-nav-link:hover {
          color: ${isDarkMode ? '#F8FAFC' : '#0F172A'};
        }

        .aiims-hero-gradient-text {
          background: ${
            isDarkMode
              ? 'linear-gradient(135deg, #C4B5FD 0%, #38BDF8 100%)'
              : 'linear-gradient(135deg, #7C3AED 0%, #0284C7 100%)'
          };
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: ${isDarkMode ? '#38BDF8' : '#7C3AED'};
          display: inline;
        }

        @media (max-width: 900px) {
          .aiims-hero-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          .aiims-hero-content {
            text-align: center !important;
            align-items: center !important;
          }
          .aiims-cta-group {
            justify-content: center !important;
          }
        }
      `}</style>

      {/* TOP NAVBAR */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          width: '100%',
          backgroundColor: isDarkMode ? 'rgba(8, 11, 22, 0.85)' : 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(16px)',
          borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.07)' : '1px solid #E2E8F0',
          padding: '16px 24px',
          boxSizing: 'border-box',
          transition: 'background-color 0.25s ease, border-color 0.25s ease',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <AiimsLogo
              size="md"
              showWordmark={true}
              textColor={isDarkMode ? '#FFFFFF' : '#0F172A'}
            />
          </div>

          {/* Center Navigation Links (Hidden on small mobile) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            <button className="aiims-nav-link" onClick={scrollToUniverse}>
              Learning Universe
            </button>
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div id="hero-theme-toggle-btn" style={{ display: 'inline-flex' }}>
              <ThemeToggle size="sm" />
            </div>
            <button
              id="hero-nav-signin-btn"
              onClick={onSignIn}
              style={{
                background: isDarkMode ? 'transparent' : '#FFFFFF',
                color: isDarkMode ? '#E2E8F0' : '#1E293B',
                border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #CBD5E1',
                borderRadius: '10px',
                padding: '8px 16px',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: isDarkMode ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.04)',
              }}
            >
              <LogIn size={15} />
              Sign In
            </button>
            <button
              id="hero-nav-start-btn"
              onClick={onStartJourney}
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 20px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              Start Your Journey
            </button>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION */}
      <section
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '60px 24px 80px 24px',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          className="aiims-hero-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.05fr 0.95fr',
            gap: '32px',
            alignItems: 'center',
          }}
        >
          {/* LEFT COLUMN: HERO CONTENT */}
          <div
            className="aiims-hero-content"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            {/* Small brand/category label */}
            <div className="aiims-hero-badge">
              <Sparkles size={13} color={isDarkMode ? '#A78BFA' : '#7C3AED'} />
              AIIMS — AI INTELLIGENCE & MENTORING SYSTEM
            </div>

            {/* Main Headline */}
            <h1
              style={{
                fontSize: 'clamp(38px, 4.6vw, 56px)',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-1.5px',
                margin: '0 0 20px 0',
                color: isDarkMode ? '#F8FAFC' : '#0F172A',
              }}
            >
              Don’t Just Learn AI.{' '}
              <span className="aiims-hero-gradient-text">Become Future-Ready.</span>
            </h1>

            {/* Supporting Copy */}
            <p
              style={{
                fontSize: 'clamp(15px, 1.8vw, 17px)',
                lineHeight: 1.6,
                color: isDarkMode ? '#CBD5E1' : '#334155',
                fontWeight: 450,
                margin: '0 0 32px 0',
                maxWidth: '540px',
              }}
            >
              Experience an intelligent mentorship cosmos. Discover your cognitive strengths,
              practice prompt challenges evaluated by multi-model rubrics, investigate emerging AI
              shifts, and engineer production-grade AI solutions.
            </p>

            {/* CTA Group */}
            <div
              className="aiims-cta-group"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
                marginBottom: '40px',
              }}
            >
              <button
                id="hero-primary-cta"
                className="aiims-btn-primary-hero"
                onClick={onStartJourney}
              >
                Start Your Journey
                <ArrowRight size={17} />
              </button>

              <button
                id="hero-secondary-cta"
                className="aiims-btn-secondary-hero"
                onClick={scrollToUniverse}
              >
                <Compass size={16} />
                Explore AIIMS
              </button>
            </div>

            {/* Verified Evidence Badges */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                flexWrap: 'wrap',
                paddingTop: '16px',
                borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #E2E8F0',
                width: '100%',
                maxWidth: '540px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color={isDarkMode ? '#34D399' : '#059669'} />
                <span
                  style={{
                    fontSize: '13.5px',
                    color: isDarkMode ? '#F1F5F9' : '#1E293B',
                    fontWeight: 600,
                  }}
                >
                  Activity Unlock Engine
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} color={isDarkMode ? '#22D3EE' : '#0891B2'} />
                <span
                  style={{
                    fontSize: '13.5px',
                    color: isDarkMode ? '#F1F5F9' : '#1E293B',
                    fontWeight: 600,
                  }}
                >
                  Deterministic AC/XP
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={16} color={isDarkMode ? '#A78BFA' : '#7C3AED'} />
                <span
                  style={{
                    fontSize: '13.5px',
                    color: isDarkMode ? '#F1F5F9' : '#1E293B',
                    fontWeight: 600,
                  }}
                >
                  Claude & Gemini Scored
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 3D AI CENTERPIECE */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '440px',
            }}
          >
            <Hero3DVisual onExploreClick={scrollToUniverse} />
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE AI LEARNING UNIVERSE PREVIEW */}
      <section
        ref={universeSectionRef}
        style={{
          borderTop: isDarkMode ? '1px solid rgba(139, 92, 246, 0.15)' : '1px solid #E2E8F0',
          background: isDarkMode
            ? 'linear-gradient(180deg, rgba(8, 11, 22, 0.95) 0%, #0F172A 100%)'
            : 'linear-gradient(180deg, #F8F9FE 0%, #EEF2F6 100%)',
          padding: '80px 24px',
          boxSizing: 'border-box',
          position: 'relative',
          transition: 'background 0.25s ease',
        }}
      >
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: '9999px',
                backgroundColor: isDarkMode ? 'rgba(34, 211, 238, 0.1)' : 'rgba(6, 182, 212, 0.1)',
                border: isDarkMode
                  ? '1px solid rgba(34, 211, 238, 0.3)'
                  : '1px solid rgba(6, 182, 212, 0.25)',
                color: isDarkMode ? '#22D3EE' : '#0891B2',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                marginBottom: '14px',
              }}
            >
              <Compass size={13} />7 Interconnected Learning Destinations
            </div>
            <h2
              style={{
                fontSize: 'clamp(28px, 3.5vw, 42px)',
                fontWeight: 800,
                color: isDarkMode ? '#F8FAFC' : '#0F172A',
                margin: '0 0 12px 0',
                letterSpacing: '-1px',
              }}
            >
              AIIMS — Your Personal AI Learning Universe
            </h2>
            <p
              style={{
                fontSize: '16px',
                color: isDarkMode ? '#94A3B8' : '#475569',
                maxWidth: '640px',
                margin: '0 auto',
                lineHeight: 1.55,
              }}
            >
              Journey through purposeful learning zones. Build competence step-by-step from
              foundational diagnostic baseline to production AI system design.
            </p>
          </div>

          {/* Interactive Universe Map */}
          <LearningUniverseMap
            forceDark={isDarkMode}
            setActiveTab={(_tab) => {
              // Non-authenticated visitors are directed to sign in / register to access
              onStartJourney();
            }}
          />

          {/* CTA Box Below Map */}
          <div
            style={{
              marginTop: '40px',
              padding: '24px 32px',
              borderRadius: '16px',
              background: isDarkMode
                ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(34, 211, 238, 0.08) 100%)'
                : 'linear-gradient(135deg, #FFFFFF 0%, #F5F3FF 100%)',
              border: isDarkMode ? '1px solid rgba(139, 92, 246, 0.25)' : '1px solid #DDD6FE',
              boxShadow: isDarkMode ? 'none' : '0 10px 25px -5px rgba(124, 58, 237, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '20px',
            }}
          >
            <div>
              <h4
                style={{
                  margin: '0 0 4px 0',
                  fontSize: '18px',
                  fontWeight: 800,
                  color: isDarkMode ? '#F8FAFC' : '#0F172A',
                }}
              >
                Ready to unlock your personalized AI path?
              </h4>
              <p style={{ margin: 0, fontSize: '14px', color: isDarkMode ? '#94A3B8' : '#475569' }}>
                Create your learner profile in 60 seconds to take your first diagnostic assessment.
              </p>
            </div>
            <button
              onClick={onStartJourney}
              className="aiims-btn-primary-hero"
              style={{ padding: '12px 24px', fontSize: '14px' }}
            >
              Start Free Assessment
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #E2E8F0',
          backgroundColor: isDarkMode ? '#05070E' : '#FFFFFF',
          padding: '36px 24px',
          boxSizing: 'border-box',
          transition: 'background-color 0.25s ease, border-color 0.25s ease',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <AiimsLogo
              size="sm"
              showWordmark={true}
              textColor={isDarkMode ? '#FFFFFF' : '#0F172A'}
            />
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              © {new Date().getFullYear()} AIIMS. All rights reserved.
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              fontSize: '12px',
              color: isDarkMode ? '#94A3B8' : '#64748B',
              flexWrap: 'wrap',
            }}
          >
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState(null, '', '/privacy');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              style={{ color: 'inherit', textDecoration: 'none' }}
              onMouseOver={(e) =>
                (e.currentTarget.style.color = isDarkMode ? '#A78BFA' : '#6366F1')
              }
              onMouseOut={(e) => (e.currentTarget.style.color = 'inherit')}
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
              onMouseOver={(e) =>
                (e.currentTarget.style.color = isDarkMode ? '#A78BFA' : '#6366F1')
              }
              onMouseOut={(e) => (e.currentTarget.style.color = 'inherit')}
            >
              Terms of Service
            </a>
            <span>•</span>
            <a
              href="/refunds"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState(null, '', '/refunds');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              style={{ color: 'inherit', textDecoration: 'none' }}
              onMouseOver={(e) =>
                (e.currentTarget.style.color = isDarkMode ? '#A78BFA' : '#6366F1')
              }
              onMouseOut={(e) => (e.currentTarget.style.color = 'inherit')}
            >
              Refunds
            </a>
            <span>•</span>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              style={{ color: 'inherit', textDecoration: 'none' }}
              onMouseOver={(e) =>
                (e.currentTarget.style.color = isDarkMode ? '#A78BFA' : '#6366F1')
              }
              onMouseOut={(e) => (e.currentTarget.style.color = 'inherit')}
            >
              Support
            </a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '12px',
                color: isDarkMode ? '#10B981' : '#059669',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: isDarkMode ? '#10B981' : '#059669',
                  boxShadow: isDarkMode ? '0 0 8px #10B981' : '0 0 6px rgba(5, 150, 105, 0.4)',
                }}
              />
              Systems Live · 58 Verified Endpoints
            </span>
            <button
              onClick={onSignIn}
              style={{
                background: 'none',
                border: 'none',
                color: isDarkMode ? '#A78BFA' : '#6366F1',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sign In to Your Workspace →
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
