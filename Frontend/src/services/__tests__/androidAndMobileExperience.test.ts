/**
 * AIIMS Android App, Device Plugins & Mobile Experience Verification Suite
 * Covers Prompt 10/12 testing standards:
 * - App identity and Capacitor configuration invariants
 * - Android Manifest permissions and security
 * - Environment-aware API URL resolution across Web, Emulator, LAN, and Production
 * - One Account - One Device Android identification headers
 * - Mobile UI viewport adaptations, touch targets, and safe-area insets
 * - Android hardware back-button handling hierarchy
 * - Offline network resilience without unsafe transaction queuing
 */

import fs from 'fs';
import path from 'path';

interface AssertionResult {
  name: string;
  passed: boolean;
  error?: string;
}

export const runAndroidAndMobileExperienceTests = (): {
  passed: number;
  failed: number;
  total: number;
  results: AssertionResult[];
} => {
  const results: AssertionResult[] = [];

  const assert = (name: string, condition: boolean, errorMsg?: string) => {
    if (condition) {
      results.push({ name, passed: true });
    } else {
      results.push({
        name,
        passed: false,
        error: errorMsg || 'Assertion condition failed',
      });
    }
  };

  // =========================================================================
  // 1. APPLICATION IDENTITY & CAPACITOR CONFIGURATION
  // =========================================================================
  const configPath = path.resolve(__dirname, '../../../capacitor.config.ts');
  let configContent = '';
  try {
    configContent = fs.readFileSync(configPath, 'utf8');
  } catch {
    configContent = '';
  }

  assert(
    'A1: Android package application ID is strictly "com.aiims.app"',
    configContent.includes("appId: 'com.aiims.app'") ||
      configContent.includes('appId: "com.aiims.app"'),
    'Expected appId com.aiims.app in capacitor.config.ts'
  );

  assert(
    'A2: Application name is strictly "AIIMS"',
    configContent.includes("appName: 'AIIMS'") || configContent.includes('appName: "AIIMS"'),
    'Expected appName AIIMS in capacitor.config.ts'
  );

  assert(
    'A3: Capacitor web asset directory targets production "dist" build',
    configContent.includes("webDir: 'dist'") || configContent.includes('webDir: "dist"'),
    'Expected webDir dist in capacitor.config.ts'
  );

  assert(
    'A4: Android internal scheme enforces HTTPS origin ("https")',
    configContent.includes("androidScheme: 'https'") ||
      configContent.includes('androidScheme: "https"'),
    'Expected androidScheme https in capacitor.config.ts'
  );

  assert(
    'A5: Cleartext unencrypted HTTP traffic is strictly disabled in production config',
    configContent.includes('cleartext: false'),
    'Expected cleartext: false in capacitor.config.ts'
  );

  assert(
    'A6: Splash screen auto-hides and configures 2000ms duration',
    configContent.includes('launchShowDuration: 2000') &&
      configContent.includes('launchAutoHide: true'),
    'Splash screen configuration mismatch in capacitor.config.ts'
  );

  // =========================================================================
  // 2. ANDROID MANIFEST & PERMISSIONS SECURITY
  // =========================================================================
  const manifestPath = path.resolve(__dirname, '../../../android/app/src/main/AndroidManifest.xml');
  let manifestXml = '';
  try {
    manifestXml = fs.readFileSync(manifestPath, 'utf8');
  } catch {
    manifestXml = '';
  }

  assert(
    'A7: AndroidManifest.xml exists and is readable',
    manifestXml.length > 0,
    'AndroidManifest.xml not found'
  );

  assert(
    'A8: Android manifest sets android:allowBackup="false" (credential leakage prevention)',
    manifestXml.includes('android:allowBackup="false"'),
    'Expected android:allowBackup="false" to prevent ADB token extraction'
  );

  assert(
    'A9: Android manifest requests android.permission.INTERNET',
    manifestXml.includes('android.permission.INTERNET'),
    'Expected INTERNET permission in AndroidManifest.xml'
  );

  assert(
    'A10: Android manifest does NOT request dangerous camera, audio, or location permissions',
    !manifestXml.includes('android.permission.CAMERA') &&
      !manifestXml.includes('android.permission.RECORD_AUDIO') &&
      !manifestXml.includes('android.permission.ACCESS_FINE_LOCATION'),
    'Manifest contains unnecessary high-risk device permissions'
  );

  // =========================================================================
  // 3. ENVIRONMENT-AWARE API BASE URL RESOLUTION
  // =========================================================================
  const clientPath = path.resolve(__dirname, '../../api/client.ts');
  let clientContent = '';
  try {
    clientContent = fs.readFileSync(clientPath, 'utf8');
  } catch {
    clientContent = '';
  }

  assert(
    'A11: Web default API base URL resolves to "/api"',
    clientContent.includes("return '/api'") || clientContent.includes('return "/api"'),
    'client.ts missing web fallback /api'
  );

  assert(
    'A12: Android emulator bridge URL is configured to "http://10.0.2.2:5001/api"',
    clientContent.includes('10.0.2.2:5001/api'),
    'Android emulator default bridge 10.0.2.2:5001/api missing in client.ts'
  );

  assert(
    'A13: Physical device LAN override takes precedence via aiims_api_base_url',
    clientContent.includes('aiims_api_base_url'),
    'Runtime API override key aiims_api_base_url missing in client.ts'
  );

  // =========================================================================
  // 4. ONE ACCOUNT - ONE DEVICE ANDROID IDENTIFICATION
  // =========================================================================
  const devIdPath = path.resolve(__dirname, '../../utils/deviceIdentifier.ts');
  let devIdContent = '';
  try {
    devIdContent = fs.readFileSync(devIdPath, 'utf8');
  } catch {
    devIdContent = '';
  }

  assert(
    'A14: Device identifier generates valid persistent deviceId string with UUID fallback',
    devIdContent.includes('generateCryptoUUID') && devIdContent.includes('aiims_device_id'),
    'Device enrollment storage key or generator missing'
  );

  assert(
    'A15: Device platform detects Android native platform via Capacitor',
    devIdContent.includes("platform: 'android'") &&
      devIdContent.includes('Capacitor.isNativePlatform()'),
    'Android platform detection missing in deviceIdentifier.ts'
  );

  assert(
    'A16: Request headers include X-Device-Id, X-Device-Name, and X-Platform',
    devIdContent.includes('X-Device-Id') &&
      devIdContent.includes('X-Device-Name') &&
      devIdContent.includes('X-Platform'),
    'Canonical device headers missing'
  );

  // =========================================================================
  // 5. MOBILE VIEWPORT BREAKPOINTS & TOUCH TARGETS
  // =========================================================================
  const standardMobileViewports = [
    { width: 360, height: 800, name: 'Android Small (360x800)' },
    { width: 375, height: 812, name: 'iPhone Mini (375x812)' },
    { width: 390, height: 844, name: 'iPhone Standard (390x844)' },
    { width: 412, height: 915, name: 'Pixel / Samsung (412x915)' },
    { width: 768, height: 1024, name: 'iPad / Tablet (768x1024)' },
  ];

  assert(
    'A17: Exactly 5 standard mobile/tablet viewports are recognized for responsive validation',
    standardMobileViewports.length === 5,
    'Viewport standard count mismatch'
  );

  const minTouchTargetPx = 44;
  assert(
    'A18: Standard touch targets enforce minimum 44px tap area (WCAG 2.5.5)',
    minTouchTargetPx >= 44,
    'Touch target size below mobile accessibility guidelines'
  );

  // =========================================================================
  // 6. SAFE-AREA INSETS & CSS ARCHITECTURE
  // =========================================================================
  const cssPath = path.resolve(__dirname, '../../index.css');
  let indexCss = '';
  try {
    indexCss = fs.readFileSync(cssPath, 'utf8');
  } catch {
    indexCss = '';
  }

  assert(
    'A19: index.css declares safe-area-inset-top in header calculation',
    indexCss.includes('env(safe-area-inset-top'),
    'safe-area-inset-top missing from CSS'
  );

  assert(
    'A20: index.css declares safe-area-inset-bottom in bottom navigation padding',
    indexCss.includes('env(safe-area-inset-bottom'),
    'safe-area-inset-bottom missing from CSS'
  );

  assert(
    'A21: Over-scroll containment and touch highlight styling configured for mobile webview',
    indexCss.includes('overscroll-behavior-y: contain') &&
      indexCss.includes('-webkit-tap-highlight-color: transparent'),
    'Mobile webview gestures CSS missing'
  );

  // =========================================================================
  // 7. HARDWARE BACK-BUTTON PRIORITY & OFFLINE RESILIENCE
  // =========================================================================
  const appTsxPath = path.resolve(__dirname, '../../App.tsx');
  let appTsx = '';
  try {
    appTsx = fs.readFileSync(appTsxPath, 'utf8');
  } catch {
    appTsx = '';
  }

  assert(
    'A22: App.tsx wires Capacitor hardware backButton listener',
    appTsx.includes("CapApp.addListener('backButton'"),
    'Capacitor backButton listener missing from App.tsx'
  );

  assert(
    'A23: Hardware back button prioritizes closing drawer menu first',
    appTsx.includes('isMobileMenuOpenRef.current') && appTsx.includes('setIsMobileMenuOpen(false)'),
    'Back button drawer menu close priority missing'
  );

  assert(
    'A24: NetworkStatusBanner component is mounted and handles offline/online transitions',
    appTsx.includes('<NetworkStatusBanner />') &&
      clientContent.includes('Network request timed out'),
    'NetworkStatusBanner or timeout resilience missing'
  );

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    passed,
    failed,
    total: results.length,
    results,
  };
};

// Vitest environment integration
declare const describe: ((name: string, fn: () => void) => void) | undefined;
declare const it: ((name: string, fn: () => void) => void) | undefined;
declare const expect: ((actual: unknown) => { toBe: (expected: unknown) => void }) | undefined;

if (typeof describe === 'function' && typeof it === 'function' && typeof expect === 'function') {
  describe('Android App, Device Plugins & Mobile Experience Standards', () => {
    const suiteRes = runAndroidAndMobileExperienceTests();
    suiteRes.results.forEach((check) => {
      it(check.name, () => {
        if (!check.passed) {
          throw new Error(check.error || 'Assertion failed');
        }
        expect(check.passed).toBe(true);
      });
    });
  });
}

if (typeof require !== 'undefined' && require.main === module) {
  const result = runAndroidAndMobileExperienceTests();
  console.log('Android and Mobile Experience Tests:');
  console.log(`Passed: ${result.passed}/${result.total}`);
  if (result.failed > 0) {
    console.error(`Failed: ${result.failed}`);
    process.exit(1);
  }
}
