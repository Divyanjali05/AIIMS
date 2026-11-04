# AIIMS Design System Specification

## 1. Executive Summary & Design Vision
The **AIIMS Design System** establishes a modern, premium, colorful, and accessible visual foundation for the AI Intelligence & Mentoring System (AIIMS). Designed to feel energetic yet clean and distraction-free, the system pairs crisp typography, soft neutral surfaces, and vibrant accent colors (Sky, Mint, Sunshine, Coral, Lavender) anchored by an authoritative Electric Indigo primary brand identity.

Crucially, the system adheres to strict WCAG 2.1 AA accessibility guidelines, ensuring dark text on light backgrounds for light mode (no muddy navy-on-light surfaces) and clear luminances in dark mode.

---

## 2. Token Architecture & Hierarchy

Tokens are defined programmatically in `Frontend/src/theme/tokens.ts` and surfaced as CSS Custom Properties in `Frontend/src/theme/theme.ts` / `Frontend/src/index.css`.

### 2.1 Vibrant Accent Palette
The 5 signature AIIMS vibrant colors each serve clear semantic, cognitive, and functional purposes:

| Token Name | Base Color | Light Surface | Dark Surface | Primary Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Sky** | `#0284c7` (Sky-600) | `#f0f9ff` (Sky-50) | `rgba(14, 165, 233, 0.12)` | Exploratory actions, links, diagnostic flows, tool discovery |
| **Mint** | `#059669` (Emerald-600) | `#ecfdf5` (Emerald-50) | `rgba(16, 185, 129, 0.12)` | Completed milestones, positive feedback, success states, verified criteria |
| **Sunshine** | `#d97706` (Amber-600) | `#fffbeb` (Amber-50) | `rgba(245, 158, 11, 0.12)` | AIIMS Credits (AC), XP rewards, badges, milestones in progress |
| **Coral** | `#e11d48` (Rose-600) | `#fff1f2` (Rose-50) | `rgba(244, 63, 94, 0.12)` | Focus sessions, urgent attention, timer controls, critical errors |
| **Lavender** | `#7c3aed` (Violet-600) | `#f5f3ff` (Violet-50) | `rgba(139, 92, 246, 0.12)` | AI Radar, machine learning models, Clarity tasks, mentor workspace |

### 2.2 Core Brand & Primary Tokens
- **Brand Primary:** `#6366f1` (Indigo-500)
- **Brand Primary Hover:** `#4f46e5` (Indigo-600)
- **Brand Primary Light:** `#eef2ff` (Indigo-50)
- **Brand Primary Dark:** `#3730a3` (Indigo-800)

### 2.3 Neutral Surface & Text Hierarchy
To ensure strict readability and eliminate muddy contrast:
- **Light Theme Surface:** `#ffffff` (Pure white cards) and `#f8fafc` (Slate-50 background)
- **Light Theme Text Main:** `#0f172a` (Slate-900 — Contrast ratio > 15:1 against white)
- **Light Theme Text Secondary:** `#475569` (Slate-600 — Contrast ratio > 5.5:1 against white)
- **Light Theme Text Muted:** `#64748b` (Slate-500 — Contrast ratio > 4.6:1 against white)
- **Dark Theme Surface:** `#1e1b4b` (Deep Indigo-950 cards) and `#0f0d24` (Background)
- **Dark Theme Text Main:** `#f8fafc` (Slate-50 — Contrast ratio > 14:1 against surface)
- **Dark Theme Text Secondary:** `#cbd5e1` (Slate-300 — Contrast ratio > 9:1 against surface)

---

## 3. Typography Scale & Hierarchy

| Semantic Level | Font Size | Line Height | Weight | Letter Spacing | CSS Variable / Token |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Hero** | 36px (2.25rem) | 1.15 | 800 (Extrabold) | -0.03em | `tokens.typography.sizes.displayHero` |
| **Heading 1** | 28px (1.75rem) | 1.2 | 700 (Bold) | -0.02em | `tokens.typography.sizes.h1` |
| **Heading 2** | 22px (1.375rem) | 1.25 | 700 (Bold) | -0.015em | `tokens.typography.sizes.h2` |
| **Heading 3** | 18px (1.125rem) | 1.3 | 600 (Semibold) | -0.01em | `tokens.typography.sizes.h3` |
| **Body Large** | 16px (1.0rem) | 1.5 | 400 (Regular) | normal | `tokens.typography.sizes.bodyLg` |
| **Body Regular** | 14px (0.875rem) | 1.5 | 400 (Regular) | normal | `tokens.typography.sizes.body` |
| **Body Small** | 12px (0.75rem) | 1.4 | 400 (Regular) | 0.01em | `tokens.typography.sizes.bodySm` |
| **Caption / Badge** | 11px (0.6875rem) | 1.3 | 600 (Semibold) | 0.04em | `tokens.typography.sizes.caption` |

### Font Families
- **Display & Headings:** `'Plus Jakarta Sans', system-ui, -apple-system, sans-serif`
- **Body Text:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Code & Numbers:** `'JetBrains Mono', 'Fira Code', Menlo, Monaco, monospace`

---

## 4. Spacing, Radii, Elevation & Shadows

### 4.1 Spacing Scale
- `xxs`: `4px`
- `xs`: `8px`
- `sm`: `12px`
- `md`: `16px`
- `lg`: `20px`
- `xl`: `24px`
- `xxl`: `32px`
- `xxxl`: `48px`

### 4.2 Border Radii
- `sm`: `6px` (tooltips, small chips)
- `md`: `10px` (inputs, select dropdowns, small buttons)
- `lg`: `14px` (standard cards, quick access tiles)
- `xl`: `20px` (hero welcome cards, modal windows)
- `pill`: `9999px` (status badges, pill tabs, CTA buttons)

### 4.3 Elevation & Shadows
- `sm`: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- `md`: `0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)`
- `lg`: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)`
- `accent-glow`: `0 0 20px -5px var(--accent-glow-color)`

---

## 5. Standard Component Library Catalog

All shared components are fully typed in TypeScript and located in `Frontend/src/components/common/`:

### 5.1 Card (`Card.tsx`)
- Container supporting `default`, `elevated`, and `outline` variants.
- Interactive hover effects with subtle border highlighting (`var(--aiims-primary)`).
- Full dark/light mode surface switching.

### 5.2 Button (`Button.tsx`)
- Variants: `primary`, `secondary`, `outline`, `ghost`, `danger`.
- Sizes: `sm`, `md`, `lg`.
- Loading spinner integration and accessible `:focus-visible` ring.

### 5.3 Badge (`Badge.tsx`)
- Pill-shaped status indicator supporting semantic palettes: `mint`, `sky`, `sunshine`, `coral`, `lavender`, `primary`, and `neutral`.
- Accommodates dot indicator and icon prefixes.

### 5.4 Input & Select (`Input.tsx`)
- Accessible text input and select components with label, helper text, and error rendering.
- Forward ref support, keyboard focus outline, and fullWidth toggling.

### 5.5 Modal (`Modal.tsx`)
- Accessible dialog component with backdrop blur overlay.
- Keyboard trap with `Escape` key close listener and `aria-modal="true"`.
- Prevents document body scrolling when active.

### 5.6 Tabs (`Tabs.tsx`)
- Supports `pills` and `underline` variants.
- Full keyboard and ARIA navigation (`role="tablist"`, `role="tab"`, `aria-selected`).

### 5.7 EmptyState (`EmptyState.tsx`)
- Illustrated empty state presentation for zero-data contexts (e.g., fresh transaction history, empty filter results).
- Provides optional icon, title, description, and call-to-action button.

### 5.8 LoadingSkeleton (`LoadingSkeleton.tsx`)
- CSS shimmer animation for content placeholding during asynchronous data fetches.
- Includes `Skeleton` line/box element and pre-composed `CardSkeleton`.

### 5.9 ProgressIndicator (`ProgressIndicator.tsx`)
- `LinearProgress`: Clamped 0-100% horizontal bar with customizable color tokens and optional percentage label.
- `CircularProgress`: SVG circular gauge with animated stroke offset.

