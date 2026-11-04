import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { AiimsLogo } from '../../components/common/AiimsLogo';
import { Hero3DVisual } from '../../components/3d/Hero3DVisual';
import { colors } from '../../theme/tokens';

interface PublicHeroScreenProps {
  onStartJourney: () => void;
  onSignIn: () => void;
}

export const PublicHeroScreen: React.FC<PublicHeroScreenProps> = ({ onStartJourney, onSignIn }) => {
  const { isDarkMode } = useTheme();

  // Color theme helpers
  const bgPage = isDarkMode ? colors.darkNeutral.pageBg : colors.neutral.pageBg;
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
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'background-color 0.25s ease, color 0.25s ease',
      }}
    >
      {/* Subtle Ambient Background Glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-40px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(860px, 100vw)',
          height: '380px',
          background: isDarkMode
            ? 'radial-gradient(ellipse at top, rgba(99, 102, 241, 0.16) 0%, rgba(8, 11, 22, 0) 70%)'
            : 'radial-gradient(ellipse at top, rgba(99, 102, 241, 0.08) 0%, rgba(248, 247, 253, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Embedded CSS for Mobile First Responsiveness & Button Interactions */}
      <style>{`
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
          letter-spacing: 0.4px;
          margin-bottom: 20px;
        }
        .aiims-btn-primary-hero {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, ${colors.primary.base} 0%, ${colors.lavender.base} 100%);
          color: #FFFFFF;
          padding: 14px 30px;
          border-radius: 14px;
          font-size: 15.5px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 6px 20px -2px rgba(99, 102, 241, 0.38);
          text-decoration: none;
        }
        .aiims-btn-primary-hero:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px -2px rgba(99, 102, 241, 0.48);
        }
        .aiims-btn-primary-hero:active {
          transform: translateY(0);
        }
        .aiims-header-signin-btn {
          background: transparent;
          color: ${textHeading};
          border: 1px solid ${borderCard};
          border-radius: 10px;
          padding: 8px 16px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }
        .aiims-header-signin-btn:hover {
          border-color: ${colors.primary.base};
          color: ${colors.primary.base};
          transform: translateY(-1px);
        }
        .aiims-header-signup-btn {
          background: linear-gradient(135deg, ${colors.primary.base} 0%, ${colors.lavender.base} 100%);
          color: #FFFFFF;
          border: none;
          border-radius: 10px;
          padding: 8px 18px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          box-shadow: 0 3px 12px rgba(99, 102, 241, 0.28);
          transition: all 0.15s ease;
        }
        .aiims-header-signup-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.38);
        }
        .aiims-gradient-text {
          background: linear-gradient(135deg, ${colors.primary.base} 0%, ${colors.lavender.base} 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        @media (max-width: 480px) {
          .aiims-header-container {
            padding: 10px 14px !important;
          }
          .aiims-header-right-group {
            gap: 6px !important;
          }
          .aiims-header-signin-btn {
            padding: 7px 12px !important;
            font-size: 12.5px !important;
          }
          .aiims-header-signup-btn {
            padding: 7px 14px !important;
            font-size: 12.5px !important;
          }
          .aiims-hero-section {
            padding: 36px 16px 16px 16px !important;
          }
          .aiims-final-card {
            padding: 28px 16px !important;
            border-radius: 20px !important;
          }
          .aiims-btn-primary-hero {
            width: 100% !important;
            max-width: 280px !important;
          }
        }
      `}</style>

      {/* =====================================================================
          A. HEADER (Brand, Theme Toggle, Sign In, Sign Up - No Wrapping/Overflow)
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
          padding: '12px 20px',
          boxSizing: 'border-box',
          transition: 'background-color 0.25s ease, border-color 0.25s ease',
        }}
        className="aiims-header-container"
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          {/* Logo & Brand Name */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <AiimsLogo size="sm" showWordmark={true} textColor={textHeading} />
          </div>

          {/* Right Action Group: Theme Toggle, Sign In, Sign Up */}
          <div
            className="aiims-header-right-group"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexShrink: 0,
            }}
          >
            <div id="hero-theme-toggle-btn" style={{ display: 'inline-flex', flexShrink: 0 }}>
              <ThemeToggle size="sm" />
            </div>

            <button id="hero-nav-signin-btn" onClick={onSignIn} className="aiims-header-signin-btn">
              Sign In
            </button>

            <button
              id="hero-nav-signup-btn"
              onClick={onStartJourney}
              className="aiims-header-signup-btn"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================================
          MAIN BODY: HERO + CENTER ILLUSTRATION + FINAL CTA
          ===================================================================== */}
      <main
        style={{
          width: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
          boxSizing: 'border-box',
        }}
      >
        {/* =====================================================================
            B. HERO SECTION
            ===================================================================== */}
        <section
          className="aiims-hero-section"
          style={{
            maxWidth: '860px',
            width: '100%',
            margin: '0 auto',
            padding: '44px 20px 16px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxSizing: 'border-box',
          }}
        >
          {/* Small AIIMS Brand Label */}
          <div className="aiims-hero-badge">
            <Sparkles size={13} />
            AI Intelligence & Mentoring System
          </div>

          {/* Main Heading */}
          <h1
            style={{
              fontSize: 'clamp(28px, 4.4vw, 46px)',
              fontWeight: 800,
              lineHeight: 1.18,
              letterSpacing: '-0.8px',
              margin: '0 0 16px 0',
              color: textHeading,
            }}
          >
            Don't Just Learn AI. <span className="aiims-gradient-text">Become Future-Ready.</span>
          </h1>

          {/* Short Description (Max 2-3 lines) */}
          <p
            style={{
              fontSize: 'clamp(15px, 1.8vw, 17px)',
              lineHeight: 1.6,
              color: textBody,
              fontWeight: 450,
              maxWidth: '560px',
              margin: '0 auto 28px auto',
            }}
          >
            Discover your AI strengths through diagnostic evaluation, practice guided prompt
            engineering, and build verified capabilities with personalized AI mentoring.
          </p>

          {/* One Primary CTA */}
          <button id="hero-primary-cta" className="aiims-btn-primary-hero" onClick={onStartJourney}>
            Start Your Journey
            <ArrowRight size={17} />
          </button>
        </section>

        {/* =====================================================================
            C. CENTER ILLUSTRATION (Original AIIMS Quantum Core)
            ===================================================================== */}
        <section
          style={{
            width: '100%',
            maxWidth: '680px',
            margin: '12px auto 44px auto',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          <Hero3DVisual showFloatingCards={false} onExploreClick={onStartJourney} />
        </section>

        {/* =====================================================================
            D. FINAL CTA / SIGN UP SECTION
            ===================================================================== */}
        <section
          style={{
            width: '100%',
            maxWidth: '720px',
            margin: '0 auto 48px auto',
            padding: '0 20px',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="aiims-final-card"
            style={{
              background: isDarkMode
                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(124, 58, 237, 0.08) 100%)'
                : 'linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 100%)',
              border: `1.5px solid ${isDarkMode ? 'rgba(99, 102, 241, 0.28)' : '#DDD6FE'}`,
              borderRadius: '24px',
              padding: 'clamp(32px, 5vw, 44px) 24px',
              textAlign: 'center',
              boxSizing: 'border-box',
              boxShadow: '0 10px 30px rgba(99, 102, 241, 0.08)',
            }}
          >
            <h2
              style={{
                fontSize: 'clamp(23px, 3.4vw, 32px)',
                fontWeight: 800,
                letterSpacing: '-0.6px',
                margin: '0 0 10px 0',
                color: textHeading,
              }}
            >
              Ready to unlock your AI path?
            </h2>

            <p
              style={{
                fontSize: '15.5px',
                color: textBody,
                maxWidth: '480px',
                margin: '0 auto 24px auto',
                lineHeight: 1.5,
              }}
            >
              Create your learner profile and start your AI journey.
            </p>

            <button
              id="hero-final-cta"
              className="aiims-btn-primary-hero"
              onClick={onStartJourney}
              style={{ padding: '14px 32px' }}
            >
              Start Free Assessment
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      </main>

      {/* =====================================================================
          MINIMAL FOOTER (Legal & Brand Integrity)
          ===================================================================== */}
      <footer
        style={{
          borderTop: `1px solid ${borderCard}`,
          backgroundColor: isDarkMode ? 'rgba(5, 7, 14, 0.7)' : 'rgba(255, 255, 255, 0.8)',
          padding: '20px 16px',
          textAlign: 'center',
          fontSize: '12.5px',
          color: textMuted,
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        © {new Date().getFullYear()} AIIMS. All rights reserved.
      </footer>
    </div>
  );
};

export default PublicHeroScreen;
