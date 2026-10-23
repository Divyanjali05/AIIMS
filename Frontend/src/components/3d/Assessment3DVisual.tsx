import React, { useState, useEffect, useRef, Suspense } from 'react';
import { WebGLBoundary, isWebGLAvailable } from './WebGLBoundary';
import { Hero2DFallback } from './Hero2DFallback';

const LazyAssessment3DScene = React.lazy(() => import('./Assessment3DScene'));

export interface Assessment3DVisualProps {
  activeStationId: number;
  stationThemeColor: string;
  stationName: string;
  domainTitle: string;
  progressPercent: number; // 0 to 100
  answeredCount: number; // 0 to 25
  isDarkMode?: boolean;
  pulseTrigger?: number;
  completedStationIds?: number[];
  height?: string | number;
}

export const Assessment3DVisual: React.FC<Assessment3DVisualProps> = ({
  activeStationId,
  stationThemeColor,
  stationName,
  domainTitle,
  progressPercent,
  answeredCount,
  isDarkMode = false,
  pulseTrigger = 0,
  completedStationIds = [],
  height = '100%',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInViewport, setIsInViewport] = useState<boolean>(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [canUseWebGL, setCanUseWebGL] = useState<boolean>(true);

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
        height: height,
        minHeight: '260px',
        borderRadius: '20px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDarkMode ? '#0A0E1C' : '#F6F8FD',
        border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(99, 102, 241, 0.15)'}`,
        boxShadow: isDarkMode
          ? 'inset 0 0 60px rgba(0, 0, 0, 0.6), 0 12px 30px rgba(0, 0, 0, 0.4)'
          : 'inset 0 0 40px rgba(99, 102, 241, 0.04), 0 8px 24px rgba(99, 102, 241, 0.06)',
        userSelect: 'none',
      }}
    >
      {/* Ambient Radial Vignette */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDarkMode
            ? `radial-gradient(circle at 50% 50%, ${stationThemeColor}18 0%, rgba(10, 14, 28, 0) 75%)`
            : `radial-gradient(circle at 50% 50%, ${stationThemeColor}14 0%, rgba(246, 248, 253, 0) 70%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* 3D Scene or Fallback */}
      {canUseWebGL ? (
        <WebGLBoundary
          prefersReducedMotion={prefersReducedMotion}
          fallback={<Hero2DFallback prefersReducedMotion={prefersReducedMotion} />}
        >
          <Suspense fallback={<Hero2DFallback prefersReducedMotion={prefersReducedMotion} />}>
            <LazyAssessment3DScene
              activeStationId={activeStationId}
              stationThemeColor={stationThemeColor}
              progressRatio={progressPercent / 100}
              isDarkMode={isDarkMode}
              prefersReducedMotion={prefersReducedMotion}
              pulseTrigger={pulseTrigger}
              completedStationIds={completedStationIds}
              isActive={isInViewport}
            />
          </Suspense>
        </WebGLBoundary>
      ) : (
        <Hero2DFallback prefersReducedMotion={prefersReducedMotion} />
      )}

      {/* Floating HUD Information Overlay (Top-Right Badge & Bottom Indicator) */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '9999px',
          backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(8px)',
          border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(99, 102, 241, 0.2)'}`,
          fontSize: '11px',
          fontWeight: 700,
          color: stationThemeColor,
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: stationThemeColor,
            boxShadow: `0 0 8px ${stationThemeColor}`,
          }}
        />
        <span>
          Station 0{activeStationId}: {stationName}
        </span>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          right: '12px',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            padding: '4px 10px',
            borderRadius: '8px',
            backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(99, 102, 241, 0.18)'}`,
            fontSize: '10.5px',
            fontWeight: 700,
            color: isDarkMode ? '#cbd5e1' : '#475569',
          }}
        >
          {domainTitle} Calibration Active
        </div>

        <div
          style={{
            padding: '4px 10px',
            borderRadius: '8px',
            backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(99, 102, 241, 0.18)'}`,
            fontSize: '10.5px',
            fontWeight: 800,
            color: isDarkMode ? '#6ee7b7' : '#059669',
          }}
        >
          {answeredCount}/25 Calibrated
        </div>
      </div>
    </div>
  );
};

export default Assessment3DVisual;
