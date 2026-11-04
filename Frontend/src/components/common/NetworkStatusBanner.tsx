import React, { useState, useEffect, useCallback } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { getApiBaseUrl } from '../../api/client';

export interface NetworkStatusBannerProps {
  onRetry?: () => void;
}

/**
 * Accessible Network Status Banner for Web and Android environments.
 * - Detects offline/online transitions via browser/WebView events.
 * - Provides active retry capability without queuing unsafe transactions.
 * - Adheres to AIIMS design tokens with high-contrast, accessible visual cues.
 */
export const NetworkStatusBanner: React.FC<NetworkStatusBannerProps> = ({ onRetry }) => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [justRestored, setJustRestored] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setJustRestored(true);
    const timer = setTimeout(() => {
      setJustRestored(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setJustRestored(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  const handleManualRetry = async () => {
    setIsRetrying(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/health`, { method: 'GET', credentials: 'omit' }).catch(
        () => null
      );
      if (res && (res.ok || res.status === 200 || res.status === 401)) {
        setIsOnline(true);
        setJustRestored(true);
        setTimeout(() => setJustRestored(false), 3500);
      }
    } catch {
      // Still offline
    } finally {
      setIsRetrying(false);
      if (onRetry) onRetry();
    }
  };

  if (isOnline && !justRestored) {
    return null;
  }

  if (justRestored) {
    return (
      <aside
        role="status"
        aria-live="polite"
        style={{
          width: '100%',
          backgroundColor: '#059669', // Mint Accent
          color: '#ffffff',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: 600,
          zIndex: 9999,
          boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
          transition: 'all 0.3s ease',
        }}
      >
        <Wifi size={16} />
        <span>Connection restored. You are back online!</span>
      </aside>
    );
  }

  return (
    <aside
      role="alert"
      aria-live="assertive"
      style={{
        width: '100%',
        backgroundColor: '#e11d48', // Coral Accent
        color: '#ffffff',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        fontSize: '13px',
        fontWeight: 600,
        zIndex: 9999,
        boxShadow: '0 2px 8px rgba(225, 29, 72, 0.3)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <WifiOff size={16} />
        <span>You are currently offline. Check your internet connection.</span>
      </div>
      <button
        type="button"
        onClick={handleManualRetry}
        disabled={isRetrying}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          borderRadius: '9999px',
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: 600,
          cursor: isRetrying ? 'not-allowed' : 'pointer',
          outline: 'none',
          transition: 'background-color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        }}
      >
        <RefreshCw size={12} className={isRetrying ? 'aiims-spin' : ''} />
        <span>{isRetrying ? 'Checking...' : 'Retry'}</span>
      </button>
    </aside>
  );
};
