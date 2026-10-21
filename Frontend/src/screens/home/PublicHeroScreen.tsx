import React, { useRef } from 'react';
import {
  Sparkles,
  ArrowRight,
  Compass,
  Brain,
  ShieldCheck,
  Cpu,
  Layers,
  ChevronDown,
  CheckCircle2,
  LogIn
} from 'lucide-react';
import { AinovaLogo } from '../../components/common/AinovaLogo';
import { Hero3DVisual } from '../../components/3d/Hero3DVisual';
import { LearningUniverseMap } from '../../components/universe/LearningUniverseMap';

interface PublicHeroScreenProps {
  onStartJourney: () => void;
  onSignIn: () => void;
}

export const PublicHeroScreen: React.FC<PublicHeroScreenProps> = ({
  onStartJourney,
  onSignIn
}) => {
  const universeSectionRef = useRef<HTMLDivElement>(null);

  const scrollToUniverse = () => {
    universeSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#080B16',
        color: '#F8FAFC',
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
        overflowX: 'hidden',
        position: 'relative',
        boxSizing: 'border-box'
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
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(8, 11, 22, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0
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
          background: 'radial-gradient(circle, rgba(34, 211, 238, 0.12) 0%, rgba(8, 11, 22, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Global Style Injections for Public Hero */}
      <style>{`
        .aiims-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: rgba(139, 92, 246, 0.12);
          border: 1px solid rgba(139, 92, 246, 0.35);
          border-radius: 9999px;
          color: #DDD6FE;
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
          background: rgba(255, 255, 255, 0.04);
          color: #E2E8F0;
          padding: 14px 26px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(8px);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .aiims-btn-secondary-hero:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(34, 211, 238, 0.4);
          color: #22D3EE;
          transform: translateY(-1px);
        }

        .aiims-nav-link {
          color: #94A3B8;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s ease;
          background: none;
          border: none;
          padding: 6px 10px;
        }
        .aiims-nav-link:hover {
          color: #F8FAFC;
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
          backgroundColor: 'rgba(8, 11, 22, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          padding: '16px 24px',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <AinovaLogo size="md" showWordmark={true} textColor="#FFFFFF" />
          </div>

          {/* Center Navigation Links (Hidden on small mobile) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px'
            }}
          >
            <button className="aiims-nav-link" onClick={scrollToUniverse}>
              Learning Universe
            </button>
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={onSignIn}
              style={{
                background: 'transparent',
                color: '#E2E8F0',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                padding: '8px 18px',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
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
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                transition: 'all 0.2s ease'
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
          zIndex: 1
        }}
      >
        <div
          className="aiims-hero-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.05fr 0.95fr',
            gap: '32px',
            alignItems: 'center'
          }}
        >
          {/* LEFT COLUMN: HERO CONTENT */}
          <div
            className="aiims-hero-content"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start'
            }}
          >
            {/* Small brand/category label */}
            <div className="aiims-hero-badge">
              <Sparkles size={13} color="#A78BFA" />
              AINOVA AI INTELLIGENT MENTORSHIP SYSTEM
            </div>

            {/* Main Headline */}
            <h1
              style={{
                fontSize: 'clamp(38px, 4.6vw, 56px)',
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: '-1.5px',
                margin: '0 0 20px 0',
                color: '#F8FAFC'
              }}
            >
              Don’t Just Learn AI.{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #A78BFA 0%, #22D3EE 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: 'inline-block'
                }}
              >
                Become Future-Ready.
              </span>
            </h1>

            {/* Supporting Copy */}
            <p
              style={{
                fontSize: 'clamp(15px, 1.8vw, 17px)',
                lineHeight: 1.6,
                color: '#94A3B8',
                fontWeight: 450,
                margin: '0 0 32px 0',
                maxWidth: '540px'
              }}
            >
              Experience an intelligent mentorship cosmos. Discover your cognitive strengths,
              practice prompt challenges evaluated by multi-model rubrics, investigate emerging
              AI shifts, and engineer production-grade AI solutions.
            </p>

            {/* CTA Group */}
            <div
              className="aiims-cta-group"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
                marginBottom: '40px'
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
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                width: '100%',
                maxWidth: '540px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={15} color="#34D399" />
                <span style={{ fontSize: '13px', color: '#CBD5E1', fontWeight: 600 }}>
                  Activity Unlock Engine
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={15} color="#22D3EE" />
                <span style={{ fontSize: '13px', color: '#CBD5E1', fontWeight: 600 }}>
                  Deterministic AC/XP
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={15} color="#A78BFA" />
                <span style={{ fontSize: '13px', color: '#CBD5E1', fontWeight: 600 }}>
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
              minHeight: '440px'
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
          borderTop: '1px solid rgba(139, 92, 246, 0.15)',
          background: 'linear-gradient(180deg, rgba(8, 11, 22, 0.95) 0%, #0F172A 100%)',
          padding: '80px 24px',
          boxSizing: 'border-box',
          position: 'relative'
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
                backgroundColor: 'rgba(34, 211, 238, 0.1)',
                border: '1px solid rgba(34, 211, 238, 0.3)',
                color: '#22D3EE',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                marginBottom: '14px'
              }}
            >
              <Compass size={13} />
              7 Interconnected Learning Destinations
            </div>
            <h2
              style={{
                fontSize: 'clamp(28px, 3.5vw, 42px)',
                fontWeight: 800,
                color: '#F8FAFC',
                margin: '0 0 12px 0',
                letterSpacing: '-1px'
              }}
            >
              AIIMS — Your Personal AI Learning Universe
            </h2>
            <p
              style={{
                fontSize: '16px',
                color: '#94A3B8',
                maxWidth: '640px',
                margin: '0 auto',
                lineHeight: 1.55
              }}
            >
              Journey through purposeful learning zones. Build competence step-by-step from
              foundational diagnostic baseline to production AI system design.
            </p>
          </div>

          {/* Interactive Universe Map */}
          <LearningUniverseMap
            forceDark
            setActiveTab={(tab) => {
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
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(34, 211, 238, 0.08) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '20px'
            }}
          >
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800, color: '#F8FAFC' }}>
                Ready to unlock your personalized AI path?
              </h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#94A3B8' }}>
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
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          backgroundColor: '#05070E',
          padding: '36px 24px',
          boxSizing: 'border-box'
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
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AinovaLogo size="sm" showWordmark={true} textColor="#FFFFFF" />
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              © {new Date().getFullYear()} Ainova. All rights reserved.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <span style={{ fontSize: '12px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  boxShadow: '0 0 8px #10B981'
                }}
              />
              Systems Live · 58 Verified Endpoints
            </span>
            <button
              onClick={onSignIn}
              style={{
                background: 'none',
                border: 'none',
                color: '#A78BFA',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
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
