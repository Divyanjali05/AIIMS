/**
 * AIIMS Design System Central Design Tokens
 * ============================================================================
 * Establishes centralized color palette, typography, spacing, radii, shadows,
 * and semantic tokens for the modern, colorful, accessible AIIMS learning UI.
 *
 * Core Color Meanings:
 *  - Sky: Primary blue and learning-related highlights
 *  - Mint: Success, completion and positive learning progress
 *  - Sunshine: Important highlights and learning motivation
 *  - Coral: Attention and selected important actions
 *  - Lavender: AI-related features and secondary highlights
 *  - White/Soft Neutral: Content surfaces with high text contrast
 */

export const colors = {
  // 5 Core Vibrant Learning Tokens
  sky: {
    base: '#0284c7',
    hover: '#0369a1',
    light: '#f0f9ff',
    border: '#bae6fd',
    text: '#0369a1',
    dark: '#38bdf8',
    darkBg: 'rgba(14, 165, 233, 0.15)',
    darkBorder: 'rgba(14, 165, 233, 0.35)',
    darkText: '#7dd3fc',
  },
  mint: {
    base: '#059669',
    hover: '#047857',
    light: '#ecfdf5',
    border: '#a7f3d0',
    text: '#047857',
    dark: '#34d399',
    darkBg: 'rgba(16, 185, 129, 0.15)',
    darkBorder: 'rgba(16, 185, 129, 0.35)',
    darkText: '#6ee7b7',
  },
  sunshine: {
    base: '#d97706',
    hover: '#b45309',
    light: '#fefce8',
    border: '#fde047',
    text: '#854d0e',
    dark: '#fbbf24',
    darkBg: 'rgba(245, 158, 11, 0.15)',
    darkBorder: 'rgba(245, 158, 11, 0.35)',
    darkText: '#fcd34d',
  },
  coral: {
    base: '#e11d48',
    hover: '#be123c',
    light: '#fff1f2',
    border: '#fecdd3',
    text: '#be123c',
    dark: '#fb7185',
    darkBg: 'rgba(244, 63, 94, 0.15)',
    darkBorder: 'rgba(244, 63, 94, 0.35)',
    darkText: '#fda4af',
  },
  lavender: {
    base: '#7c3aed',
    hover: '#6d28d9',
    light: '#f5f3ff',
    border: '#ddd6fe',
    text: '#5b21b6',
    dark: '#a78bfa',
    darkBg: 'rgba(139, 92, 246, 0.15)',
    darkBorder: 'rgba(139, 92, 246, 0.35)',
    darkText: '#c4b5fd',
  },

  // Primary Brand (Electric Indigo / Violet)
  primary: {
    base: '#6366f1',
    hover: '#4f46e5',
    light: '#eef2ff',
    border: '#c7d2fe',
    text: '#4338ca',
    glow: 'rgba(99, 102, 241, 0.18)',
    dark: '#818cf8',
    darkGlow: 'rgba(129, 140, 248, 0.3)',
  },

  // Neutrals (Light Theme)
  neutral: {
    pageBg: '#f8f7fd',
    cardBg: '#ffffff',
    cardSubtle: '#f9f8ff',
    cardHover: '#faf9ff',
    border: '#ede9fe',
    borderLight: '#f3f0ff',
    borderStrong: '#c7d2fe',
    textHeading: '#0f172a',
    textBody: '#334155',
    textSecondary: '#475569',
    textMuted: '#64748b',
    textSubtle: '#94a3b8',
  },

  // Neutrals (Dark Theme)
  darkNeutral: {
    pageBg: '#080b16',
    cardBg: '#0f1629',
    cardSubtle: '#141c33',
    cardHover: '#192340',
    border: '#202b4d',
    borderLight: '#1e293b',
    borderStrong: '#6366f1',
    textHeading: '#f8fafc',
    textBody: '#cbd5e1',
    textSecondary: '#94a3b8',
    textMuted: '#94a3b8',
    textSubtle: '#64748b',
  },
} as const;

export const typography = {
  fonts: {
    heading: "'Plus Jakarta Sans', 'Outfit', sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'Fira Code', 'JetBrains Mono', monospace",
  },
  sizes: {
    xs: '11px',
    sm: '12px',
    bodySm: '13px',
    body: '14px',
    bodyLg: '15px',
    h4: '16px',
    h3: '18px',
    h2: '22px',
    h1: '28px',
    hero: '34px',
  },
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  lineHeights: {
    tight: 1.2,
    heading: 1.3,
    body: 1.55,
    relaxed: 1.65,
  },
} as const;

export const spacing = {
  xxs: '4px',
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '20px',
  xl: '24px',
  xxl: '32px',
  xxxl: '48px',
} as const;

export const radii = {
  xs: '6px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  pill: '9999px',
} as const;

export const shadows = {
  none: 'none',
  sm: '0 2px 8px rgba(99, 102, 241, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
  card: '0 4px 16px rgba(99, 102, 241, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
  hover: '0 8px 24px rgba(99, 102, 241, 0.12), 0 2px 6px rgba(0, 0, 0, 0.03)',
  modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  dropdown: '0 10px 30px rgba(0, 0, 0, 0.12)',
} as const;

export const breakpoints = {
  mobileSm: 360,
  mobileMd: 390,
  tablet: 768,
  laptop: 1024,
  desktop: 1440,
} as const;
