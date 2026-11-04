# AIIMS Mobile & PWA Deployment Guide

This document describes how AIIMS is configured and deployed as an installable Progressive Web App (PWA) and inside Capacitor (Android first, iOS ready).

---

## 1. Architecture Overview

AIIMS is built as a single unified React 18 TypeScript codebase that runs in three execution environments:
1. **Desktop/Mobile Web Browser:** Standard responsive web application.
2. **Installable PWA:** Installable directly from Chrome, Safari, Edge, or Firefox onto desktop and mobile home screens with offline static asset shell caching.
3. **Native Mobile App (Capacitor):** Packaged inside native Android (`android/`) and iOS shells via Capacitor 6, communicating with the backend over secure HTTPS with token authentication and hardware back-button handling.

---

## 2. PWA Configuration & Security Invariants

### Manifest Specifications (`Frontend/public/manifest.json`)
- **App Name:** `AIIMS`
- **Short Name:** `AIIMS`
- **Display Mode:** `standalone`
- **Theme Color:** `#4f46e5` (Primary Indigo)
- **Background Color:** `#0f172a` (Dark Slate)
- **Orientation:** `portrait-primary`
- **Icons:**
  - `Frontend/public/icons/icon-192.png` (192x192 PNG)
  - `Frontend/public/icons/icon-512.png` (512x512 PNG)
  - `Frontend/public/icons/icon-maskable.png` (512x512 Maskable PNG)
  - `Frontend/public/icons/icon.svg` (Scalable SVG)
  - `Frontend/public/icons/apple-touch-icon.png` (180x180 iOS touch icon)
  - `Frontend/public/icons/favicon-32.png` (32x32 Favicon)

### Service Worker Cache Boundary (`Frontend/public/sw.js`)
> **CRITICAL SECURITY INVARIANT:** The service worker caches ONLY static bundle assets (HTML, CSS, JS, fonts, static icons).

The service worker **NEVER** caches:
- Any API request (`/api/*`, `/health`, `/ready`)
- Credit balances, wallets, or transaction ledgers (`/credits`, `/wallet`, `/ledger`, `/balance`)
- Authentication tokens, login sessions, or TOTP 2FA data (`/auth/*`, `/login`, `/register`, `/2fa`)
- User account and profile mutations (`/account`, `/user`)
- Any HTTP request with a method other than `GET` (POST, PUT, DELETE, PATCH always pass straight to the network)

---

## 3. Capacitor Native Shell Configuration

### Core Settings (`Frontend/capacitor.config.ts`)
- **`appName`**: `AIIMS`
- **`appId`**: `com.aiims.app`
- **`webDir`**: `dist`
- **`server.cleartext`**: `false` (Unencrypted HTTP traffic is strictly disallowed)
- **`server.androidScheme`**: `https` (Android webview serves internal assets under HTTPS origin)

### Plugins Configured
1. **`SplashScreen`**:
   - `launchShowDuration`: 2000 ms
   - `launchAutoHide`: true
   - `backgroundColor`: `#0f172a`
   - `androidSplashResourceName`: `splash`
   - `androidScaleType`: `CENTER_CROP`
   - `showSpinner`: false
2. **`StatusBar`**:
   - `style`: `DARK`
   - `backgroundColor`: `#0f172a`
3. **`App`**:
   - Hardware back button interception and application lifecycle listeners.

### API Base URL Resolution (Production vs Development)
The mobile app communicates with the backend via `getApiBaseUrl()` in `Frontend/src/api/client.ts`:
- **Production Build:** Uses the environment variable `VITE_API_BASE_URL` (e.g. `https://api.aiims.com/api`).
- **No Localhost Fallback in Production:** In production builds, `VITE_API_BASE_URL` is baked into the bundle. Localhost is never hardcoded.

---

## 4. Android Configuration

### 1. Version Handling (`Frontend/android/app/build.gradle`)
`versionCode` and `versionName` are dynamically evaluated with sensible fallbacks:
```groovy
def appVersionCode = Integer.parseInt(project.findProperty('versionCode') ?: System.getenv('VERSION_CODE') ?: '1')
def appVersionName = (project.findProperty('versionName') ?: System.getenv('VERSION_NAME') ?: '1.0.0') as String
versionCode appVersionCode
versionName appVersionName
```
To build with a specific version:
```bash
VERSION_CODE=42 VERSION_NAME=1.2.0 npm run build:mobile
```

### 2. Android Manifest & Permissions (`Frontend/android/app/src/main/AndroidManifest.xml`)
- **`android:allowBackup="false"`**: Application backup is disabled to prevent sensitive credential/token extraction via ADB.
- **Minimal Permissions**: Only `android.permission.INTERNET` is requested. No dangerous permissions (camera, location, contacts, microphone) are declared.
- **Adaptive Icon**: Declared as `@mipmap/ic_launcher` with adaptive XML definitions in `mipmap-anydpi-v26/ic_launcher.xml`.

### 3. Hardware Back Button Handling (`Frontend/src/App.tsx`)
The Android physical and gesture back button is handled cleanly:
1. If an active mobile drawer navigation menu is open, the back button closes it.
2. If an active radar signal modal or sub-screen is open, the back button closes it.
3. If the user is on the root screen (`home` or `hero`), `CapApp.exitApp()` exits the app.
4. If the user is on any other screen (e.g. `journey`, `assessment`, `wallet`, `profile`), the back button pops the internal navigation stack and returns to the previous screen.

### 4. Safe Area Insets (Notches & Home Indicators)
- Header height: `--aiims-header-height: calc(60px + env(safe-area-inset-top, 0px))`
- Header padding: `padding-top: env(safe-area-inset-top, 0px)`
- Bottom navigation height: `calc(56px + env(safe-area-inset-bottom, 0px))`
- Bottom navigation padding: `padding-bottom: env(safe-area-inset-bottom, 0px)`
- Viewport configuration: `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`

---

## 5. Build & Sync Workflows

### Standard Mobile Build
From the repository root:
```bash
npm run build:mobile
```
Or with custom production API endpoint:
```bash
VITE_API_BASE_URL=https://api.yourdomain.com/api npm run build:mobile
```
This script:
1. Runs TypeScript type checking (`tsc`).
2. Builds the optimized production Vite bundle into `Frontend/dist`.
3. Runs `npx cap sync` to copy web assets to `android/app/src/main/assets/public` and update native plugins.

### Opening in Android Studio
To open the native Android project in Android Studio:
```bash
cd Frontend
npm run cap:open
# or: npx cap open android
```

From Android Studio:
1. Wait for Gradle sync to complete.
2. Select an Android Virtual Device (AVD) or connect a physical device via USB with USB debugging enabled.
3. Click the green **Run** button (or press `Shift + F10`).
4. To build release APK / AAB:
   - Select **Build > Generate Signed Bundle / APK...**
   - Follow prompts to sign with your release keystore.

---

## 6. iOS Setup & Deployment on macOS

To add and build for iOS on macOS, follow these exact steps:

### Prerequisites
1. **Full Xcode Installation:** Install Xcode from the Mac App Store.
2. **Xcode Command Line Tools:**
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```
3. **CocoaPods:**
   ```bash
   brew install cocoapods
   # or: sudo gem install cocoapods
   ```

### Step-by-Step iOS Commands
```bash
# 1. Navigate to Frontend
cd Frontend

# 2. Install Capacitor iOS package
npm install @capacitor/ios@^6.0.0

# 3. Add the iOS platform
npx cap add ios

# 4. Sync web assets and plugins
npx cap sync ios

# 5. Open Xcode workspace
npx cap open ios
```

From Xcode:
1. Select the `App` target.
2. Under **Signing & Capabilities**, select your Apple Developer Team.
3. Select an iOS Simulator (e.g. iPhone 15 Pro) or a connected iPhone.
4. Press **Cmd + R** to run.

---

## 7. Verification Results & Physical Device Limitations

### Verified Automatically in CI / Test Suite
- `npm run build:mobile` succeeds with 0 errors.
- `Frontend/dist` bundle includes `manifest.json`, `sw.js`, and all icons.
- `capacitor.config.json` in Android assets contains `appId: "com.aiims.app"`, `cleartext: false`, and plugin configurations.
- `AndroidManifest.xml` has `android:allowBackup="false"` and only `INTERNET` permission.
- `pwaServiceWorker.test.ts` validates that API endpoints, credits, wallets, and auth are strictly excluded from the service worker cache.
- Full unit test suite passes (251 tests across backend and frontend).

### Items Requiring Physical Device Verification
The following items cannot be fully verified without physical hardware:
1. **Hardware Notch Geometries:** Different Android OEM punch-hole or teardrop cameras (e.g., Samsung OneUI vs Google Pixel vs Xiaomi MIUI) have proprietary status bar padding.
2. **Gesture Pill / Physical Navigation Bar:** Testing the transition between 3-button navigation and full gesture pill mode on physical Android 13/14/15 devices.
3. **Physical Splash Screen Fade Duration:** Exact animation timing of the native splash screen handoff to the web view.
4. **Android Battery Optimization / Doze Mode:** Background push notifications and socket keep-alive behavior when the phone enters deep sleep.
