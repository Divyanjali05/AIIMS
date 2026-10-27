import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PWA & Mobile Deployment Contracts', () => {
  const publicDir = path.resolve(__dirname, '../../../public');
  const manifestPath = path.join(publicDir, 'manifest.json');
  const swPath = path.join(publicDir, 'sw.js');
  const androidManifestPath = path.resolve(
    __dirname,
    '../../../android/app/src/main/AndroidManifest.xml'
  );
  const capacitorConfigPath = path.resolve(__dirname, '../../../capacitor.config.ts');

  it('verifies Web App Manifest configuration and icons', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    expect(manifest.name).toBe('AIIMS');
    expect(manifest.short_name).toBe('AIIMS');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#4f46e5');
    expect(manifest.background_color).toBe('#0f172a');

    interface ManifestIcon {
      src: string;
      sizes: string;
      type?: string;
      purpose?: string;
    }

    const iconSizes = manifest.icons.map((i: ManifestIcon) => i.sizes);
    expect(iconSizes).toContain('192x192');
    expect(iconSizes).toContain('512x512');

    const maskableIcon = manifest.icons.find((i: ManifestIcon) => i.purpose === 'maskable');
    expect(maskableIcon).toBeDefined();

    // Verify all referenced icon files actually exist on disk
    for (const icon of manifest.icons) {
      const relPath = icon.src.replace(/^\//, '');
      const filePath = path.join(publicDir, relPath);
      expect(fs.existsSync(filePath), `Icon file missing: ${filePath}`).toBe(true);
    }
  });

  it('verifies Service Worker caching boundaries (strictly excludes API, auth, credits, ledger)', () => {
    expect(fs.existsSync(swPath)).toBe(true);
    const swContent = fs.readFileSync(swPath, 'utf8');

    // Rule: Must strictly exclude API, auth, credits, ledger, wallet, user, account
    expect(swContent).toContain('api');
    expect(swContent).toContain('auth');
    expect(swContent).toContain('credits');
    expect(swContent).toContain('wallet');
    expect(swContent).toContain('ledger');
    expect(swContent).toContain('account');

    // Rule: Must bypass cache for non-GET requests
    expect(swContent).toMatch(/request\.method\s*!==\s*'GET'/);

    // Rule: Pre-caches static assets only
    expect(swContent).toContain('/manifest.json');
    expect(swContent).toContain('/icons/icon-192.png');
    expect(swContent).toContain('/icons/icon-512.png');
  });

  it('verifies Capacitor configuration has cleartext disabled and plugins configured', () => {
    expect(fs.existsSync(capacitorConfigPath)).toBe(true);
    const configContent = fs.readFileSync(capacitorConfigPath, 'utf8');

    expect(configContent).toContain("appId: 'com.aiims.app'");
    expect(configContent).toContain("appName: 'AIIMS'");
    expect(configContent).toContain("webDir: 'dist'");
    expect(configContent).toContain('cleartext: false');
    expect(configContent).toContain('SplashScreen:');
    expect(configContent).toContain('StatusBar:');
  });

  it('verifies AndroidManifest.xml disables allowBackup and restricts permissions', () => {
    expect(fs.existsSync(androidManifestPath)).toBe(true);
    const manifestXml = fs.readFileSync(androidManifestPath, 'utf8');

    // allowBackup must be strictly false
    expect(manifestXml).toContain('android:allowBackup="false"');
    expect(manifestXml).not.toContain('android:allowBackup="true"');

    // INTERNET permission declared
    expect(manifestXml).toContain('android.permission.INTERNET');

    // No dangerous unneeded permissions
    expect(manifestXml).not.toContain('android.permission.RECORD_AUDIO');
    expect(manifestXml).not.toContain('android.permission.ACCESS_FINE_LOCATION');
    expect(manifestXml).not.toContain('android.permission.CAMERA');
    expect(manifestXml).not.toContain('android.permission.READ_CONTACTS');
  });
});
