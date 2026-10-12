import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button';
import { Surface } from './Surface';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught rendering exception:', error, errorInfo);
  }

  public handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    try {
      localStorage.setItem('aiims_active_tab', 'home');
      window.location.href = '/home';
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ maxWidth: '680px', margin: '40px auto', padding: '0 20px' }}>
          <Surface variant="bordered" radius="lg" padding="lg" style={{ textAlign: 'center', borderTop: '4px solid #ef4444' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <AlertTriangle size={28} />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              {this.props.fallbackTitle || 'Something went wrong rendering this view'}
            </h2>

            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
              {this.state.error?.message || 'An unexpected rendering error occurred. You can safely reload or return to Home.'}
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <Button
                variant="outline"
                size="md"
                icon={<RefreshCw size={14} />}
                onClick={this.handleReload}
              >
                Try Again
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={<Home size={14} />}
                onClick={this.handleGoHome}
              >
                Return to Home
              </Button>
            </div>
          </Surface>
        </div>
      );
    }

    return this.props.children;
  }
}
