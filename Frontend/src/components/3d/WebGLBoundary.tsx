import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Hero2DFallback } from './Hero2DFallback';

export const isWebGLAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return Boolean(gl && gl instanceof WebGLRenderingContext);
  } catch (e) {
    return false;
  }
};

interface WebGLBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onExploreClick?: () => void;
  prefersReducedMotion?: boolean;
}

interface WebGLBoundaryState {
  hasError: boolean;
  contextLost: boolean;
  webGLSupported: boolean;
}

export class WebGLBoundary extends Component<WebGLBoundaryProps, WebGLBoundaryState> {
  constructor(props: WebGLBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      contextLost: false,
      webGLSupported: isWebGLAvailable()
    };
  }

  static getDerivedStateFromError(_: Error): Partial<WebGLBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('WebGLBoundary caught 3D scene error, switching to graceful 2D fallback:', error, errorInfo);
  }

  componentDidMount() {
    window.addEventListener('webglcontextlost', this.handleContextLost);
    window.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  componentWillUnmount() {
    window.removeEventListener('webglcontextlost', this.handleContextLost);
    window.removeEventListener('webglcontextrestored', this.handleContextRestored);
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    console.warn('WebGL context lost, activating graceful fallback');
    this.setState({ contextLost: true });
  };

  private handleContextRestored = () => {
    console.info('WebGL context restored, attempting 3D re-render');
    this.setState({ contextLost: false, hasError: false });
  };

  render() {
    const { hasError, contextLost, webGLSupported } = this.state;
    const { children, fallback, onExploreClick, prefersReducedMotion } = this.props;

    if (!webGLSupported || hasError || contextLost) {
      if (fallback) return fallback;
      return (
        <Hero2DFallback
          onExploreClick={onExploreClick}
          prefersReducedMotion={prefersReducedMotion}
        />
      );
    }

    return children;
  }
}
