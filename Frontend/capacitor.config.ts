import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor Configuration for AIIMS Mobile Client.
 *
 * Production Security:
 * - Production traffic MUST be HTTPS only (`androidScheme: 'https'`).
 * - Cleartext/unencrypted HTTP traffic is strictly disabled in production builds.
 *
 * Development Override:
 * - If local development against an unencrypted local HTTP backend/LAN IP is required,
 *   set `CAPACITOR_DEV_CLEARTEXT=true` in the environment. It is disabled (false) by default.
 */
const config: CapacitorConfig = {
  appId: 'com.aiims.app',
  appName: 'AIIMS',
  webDir: 'dist',
  server: {
    cleartext: false,
    androidScheme: 'https'
  },
  plugins: {
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
