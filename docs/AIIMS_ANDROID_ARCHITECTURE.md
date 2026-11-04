# AIIMS Android Application Architecture

## 1. Executive Summary & Architectural Decision

The **AIIMS Android Application** is architected as a native Android container leveraging **Capacitor 6** to wrap the existing, production-grade **React 18 / TypeScript / Vite** single-page application (SPA).

### Technical Justification: Capacitor vs. React Native Rebuild
| Architectural Criteria | Capacitor 6 Hybrid Container | React Native Complete Rewrite | Selected Strategy |
| :--- | :--- | :--- | :--- |
| **Codebase Unification** | **Single unified codebase** for Web, PWA, and Android | Two completely separate repositories/runtimes | **Capacitor** (Zero duplication) |
| **Feature Parity** | Instant 100% parity across all Prompts 1–9 | High risk of feature fragmentation & drift | **Capacitor** (Preserves all modules) |
| **3D Three.js Visualizers** | WebGL canvas natively runs via Chromium WebView | Requires heavy native bridge adapters | **Capacitor** (Native WebGL support) |
| **State & Business Logic** | Preserves authoritative `LearnerContext` & ledger | Must re-implement contexts and state machines | **Capacitor** (Deterministic reuse) |
| **Security & Cryptography** | Uses Web Crypto API & standard TLS HTTPS | Requires third-party native crypto modules | **Capacitor** (Standardized security) |

---

## 2. Android Project Structure

The native Android project is situated in `Frontend/android/` and generated/synchronized via `@capacitor/cli`:

```
Frontend/android/
├── app/
│   ├── build.gradle                               # Module Gradle build script
│   ├── capacitor.build.gradle                     # Capacitor auto-generated Gradle config
│   ├── proguard-rules.pro                         # Code obfuscation and shrinking rules
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml                # Native permissions & activity declaration
│       │   ├── java/com/aiims/app/
│       │   │   └── MainActivity.java              # Bridge activity extending BridgeActivity
│       │   ├── res/
│       │   │   ├── mipmap-*/                      # Adaptive launcher icons (ic_launcher.png)
│       │   │   ├── values/                        # strings.xml, styles.xml (Splash & AppTheme)
│       │   │   └── xml/file_paths.xml             # Secure FileProvider paths
│       │   └── assets/
│       │       ├── capacitor.config.json          # Compiled Capacitor native runtime config
│       │       └── public/                        # Synchronized Vite production bundle (dist/)
├── build.gradle                                   # Top-level project build script
├── capacitor.settings.gradle                      # Capacitor plugin module references
├── gradle.properties                              # JVM args, AndroidX and Jetifier flags
├── gradlew & gradlew.bat                          # Gradle wrapper binaries (v8.2.1)
├── settings.gradle                                # Sub-module project inclusions
└── variables.gradle                               # Target SDK (34), compile SDK (34), min SDK (22)
```

---

## 3. Application Identity & Metadata

- **Application Name:** `AIIMS`
- **Application ID (Package):** `com.aiims.app`
- **Display Name:** `AIIMS`
- **Min SDK Version:** `22` (Android 5.1 Lollipop)
- **Compile SDK Version:** `34` (Android 14)
- **Target SDK Version:** `34` (Android 14)
- **Version Code:** Configurable via environment variable `VERSION_CODE` (defaults to `1`)
- **Version Name:** Configurable via environment variable `VERSION_NAME` (defaults to `1.0.0`)

---

## 4. Capacitor Native Shell Configuration

Configuration resides in [`Frontend/capacitor.config.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/capacitor.config.ts) and synchronizes to `Frontend/android/app/src/main/assets/capacitor.config.json`:

```typescript
const config: CapacitorConfig = {
  appId: 'com.aiims.app',
  appName: 'AIIMS',
  webDir: 'dist',
  server: {
    cleartext: false,       // Disallows unencrypted HTTP in production
    androidScheme: 'https'  // Serves internal assets securely over https://
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
```

---

## 5. Lifecycle & Hardware Back-Button Integration

In mobile environments, Android hardware back buttons (or gesture navigation swipes) are captured and governed by a strict four-level hierarchy in `Frontend/src/App.tsx`:

```mermaid
flowchart TD
    BackPress[Hardware Back Button Pressed] --> CheckDrawer{Is Mobile Navigation Drawer Open?}
    CheckDrawer -->|Yes| CloseDrawer[Close Drawer & Stop]
    CheckDrawer -->|No| CheckModal{Is Signal Modal / Dialog Active?}
    CheckModal -->|Yes| CloseModal[Close Modal & Stop]
    CheckModal -->|No| CheckRoot{Is Learner on Root Screen?}
    CheckRoot -->|Yes: Home or Hero| ExitApp[CapApp.exitApp()]
    CheckRoot -->|No: In Sub-Screen| HistoryPop[Pop Tab History Stack & Navigate Back]
```

### Hierarchy Rules:
1. **Drawer Menu Priority:** If the mobile drawer sidebar is open, back-button closes it.
2. **Modal Dismissal Priority:** If an active dialog or radar signal investigation is open, back-button dismisses it without routing away.
3. **Internal Stack Navigation:** If the learner is on a sub-screen (e.g. `wallet`, `focus`, `journey`, `clarity`), back-button returns to the preceding tab.
4. **Root Protection:** The app only exits if pressed while at the primary root dashboard (`home` or `hero`).

