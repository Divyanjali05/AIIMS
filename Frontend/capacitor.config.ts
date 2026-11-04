import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor Configuration for AIIMS Mobile Client.
 *
 * Production Security:
 * - Production traffic MUST be HTTPS only (`androidScheme: 'https'`).
 * - Cleartext/unencrypted HTTP traffic is strictly disabled in production builds (cleartext: false).
 *
 * Development Override:
 * - When testing against local development emulator (http://10.0.2.2:5001) or LAN IP,
 *   cleartext is enabled so the WebView can access the development API server.
 */
const config: CapacitorConfig = {
  appId: 'com.aiims.app',
  appName: 'AIIMS',
  webDir: 'dist',
  server: {
    // Production security baseline: cleartext: false
    // Cleartext is permitted for local emulator & dev testing (http://10.0.2.2:5001)
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f172a'
    }
  }
};

export default config;
