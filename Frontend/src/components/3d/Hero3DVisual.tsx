import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Sparkles, Cpu, Radar } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { WebGLBoundary, isWebGLAvailable } from './WebGLBoundary';
import { Hero2DFallback } from './Hero2DFallback';

// Lazy load the full Three.js / React Three Fiber scene
const LazyHero3DScene = React.lazy(() => import('./Hero3DScene'));

interface Hero3DVisualProps {
  onExploreClick?: () => void;
}

export const Hero3DVisual: React.FC<Hero3DVisualProps> = ({ onExploreClick }) => {
  const { isDarkMode } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInViewport, setIsInViewport] = useState<boolean>(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [canUseWebGL, setCanUseWebGL] = useState<boolean>(true);

  // Check reduced motion & WebGL support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);

      const handleMotionChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleMotionChange);
      } else {
        mediaQuery.addListener(handleMotionChange);
      }

      setCanUseWebGL(isWebGLAvailable());

      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleMotionChange);
        } else {
          mediaQuery.removeListener(handleMotionChange);
        }
      };
    }
  }, []);

  // IntersectionObserver to pause 3D rendering when scrolled outside viewport
  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsInViewport(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '520px',
        height: '460px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
    >
      {/* 3D Scene or 2D Fallback */}
      {canUseWebGL ? (
        <WebGLBoundary
          onExploreClick={onExploreClick}
          prefersReducedMotion={prefersReducedMotion}
          fallback={
            <Hero2DFallback
              onExploreClick={onExploreClick}
              prefersReducedMotion={prefersReducedMotion}
            />
          }
        >
          <Suspense
            fallback={
              <Hero2DFallback
                onExploreClick={onExploreClick}
                prefersReducedMotion={prefersReducedMotion}
              />
            }
          >
            <LazyHero3DScene
              onExploreClick={onExploreClick}
              prefersReducedMotion={prefersReducedMotion}
              isActive={isInViewport}
            />
          </Suspense>
        </WebGLBoundary>
      ) : (
        <Hero2DFallback
          onExploreClick={onExploreClick}
          prefersReducedMotion={prefersReducedMotion}
        />
      )}

      {/* Floating HUD Badges Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        {/* Core Tag */}
        <div
          style={{
            position: 'absolute',
            bottom: '72px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: isDarkMode ? 'rgba(8, 11, 22, 0.85)' : 'rgba(255, 255, 255, 0.92)',
            border: isDarkMode ? '1px solid #22D3EE' : '1px solid #0891B2',
            borderRadius: '9999px',
            padding: '4px 12px',
            fontSize: '10px',
            fontWeight: 800,
            color: isDarkMode ? '#22D3EE' : '#0891B2',
            letterSpacing: '0.8px',
            boxShadow: isDarkMode
              ? '0 4px 14px rgba(34, 211, 238, 0.35)'
              : '0 4px 14px rgba(8, 145, 178, 0.2)',
            textTransform: 'uppercase',
            pointerEvents: 'auto',
            cursor: onExploreClick ? 'pointer' : 'default',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease',
          }}
          onClick={onExploreClick}
        >
          AIIMS QUANTUM CORE
        </div>

        {/* FLOATING CARD 1: Diagnostic Assessment (Top Left) */}
        <div
          className="aiims-floating-card-1"
          style={{
            position: 'absolute',
            top: '28px',
            left: '12px',
            backgroundColor: isDarkMode ? 'rgba(16, 22, 42, 0.82)' : 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(16px)',
            border: isDarkMode
              ? '1px solid rgba(139, 92, 246, 0.35)'
              : '1px solid rgba(124, 58, 237, 0.25)',
            borderRadius: '16px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: isDarkMode
              ? '0 12px 30px rgba(0, 0, 0, 0.45), 0 0 15px rgba(139, 92, 246, 0.15)'
              : '0 10px 25px rgba(124, 58, 237, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04)',
            pointerEvents: 'auto',
            animation: prefersReducedMotion ? 'none' : 'floatSlow1 5.2s ease-in-out infinite',
            transition:
              'background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.2)' : 'rgba(124, 58, 237, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDarkMode ? '#A855F7' : '#7C3AED',
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: isDarkMode ? '#A855F7' : '#7C3AED',
                textTransform: 'uppercase',
              }}
            >
              Capability Radar
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: isDarkMode ? '#F8FAFC' : '#0F172A',
              }}
            >
              5-Dimension Diagnostic
            </div>
          </div>
        </div>

        {/* FLOATING CARD 2: Clarity Task Lab (Bottom Left) */}
        <div
          className="aiims-floating-card-2"
          style={{
            position: 'absolute',
            bottom: '36px',
            left: '18px',
            backgroundColor: isDarkMode ? 'rgba(16, 22, 42, 0.82)' : 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(16px)',
            border: isDarkMode
              ? '1px solid rgba(34, 211, 238, 0.35)'
              : '1px solid rgba(8, 145, 178, 0.25)',
            borderRadius: '16px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: isDarkMode
              ? '0 12px 30px rgba(0, 0, 0, 0.45), 0 0 15px rgba(34, 211, 238, 0.15)'
              : '0 10px 25px rgba(8, 145, 178, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04)',
            pointerEvents: 'auto',
            animation: prefersReducedMotion ? 'none' : 'floatSlow2 5.8s ease-in-out infinite',
            transition:
              'background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: isDarkMode ? 'rgba(34, 211, 238, 0.2)' : 'rgba(8, 145, 178, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDarkMode ? '#22D3EE' : '#0891B2',
            }}
          >
            <Cpu size={18} />
          </div>
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: isDarkMode ? '#22D3EE' : '#0891B2',
                textTransform: 'uppercase',
              }}
            >
              AI Task Lab
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: isDarkMode ? '#F8FAFC' : '#0F172A',
              }}
            >
              Claude & Gemini Rubric
            </div>
          </div>
        </div>

        {/* FLOATING CARD 3: Technical Radar (Right Side) */}
        <div
          className="aiims-floating-card-3"
          style={{
            position: 'absolute',
            top: '42%',
            right: '10px',
            backgroundColor: isDarkMode ? 'rgba(16, 22, 42, 0.82)' : 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(16px)',
            border: isDarkMode
              ? '1px solid rgba(52, 211, 153, 0.35)'
              : '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '16px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: isDarkMode
              ? '0 12px 30px rgba(0, 0, 0, 0.45), 0 0 15px rgba(52, 211, 153, 0.15)'
              : '0 10px 25px rgba(16, 185, 129, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04)',
            pointerEvents: 'auto',
            animation: prefersReducedMotion
              ? 'none'
              : 'floatSlow1 4.9s ease-in-out infinite reverse',
            transition:
              'background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: isDarkMode ? 'rgba(52, 211, 153, 0.2)' : 'rgba(16, 185, 129, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDarkMode ? '#34D399' : '#059669',
            }}
          >
            <Radar size={18} />
          </div>
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: isDarkMode ? '#34D399' : '#059669',
                textTransform: 'uppercase',
              }}
            >
              Market Signals
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: isDarkMode ? '#F8FAFC' : '#0F172A',
              }}
            >
              Real-time Shifts & Tools
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes floatSlow1 {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        @keyframes floatSlow2 {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(7px);
          }
        }
        @media (max-width: 640px) {
          .aiims-floating-card-1 {
            top: 10px !important;
            left: 6px !important;
            padding: 8px 12px !important;
          }
          .aiims-floating-card-2 {
            bottom: 12px !important;
            left: 6px !important;
            padding: 8px 12px !important;
          }
          .aiims-floating-card-3 {
            right: 6px !important;
            padding: 8px 12px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Hero3DVisual;
