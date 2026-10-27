export type ThemeMode = 'light' | 'dark' | 'system';

export const theme = {
  colors: {
    // Warm Lavender-White Base Palette
    background: '#f8f7fd',
    surface: '#ffffff',
    surfaceSubtle: '#f4f3ff',
    surfaceHover: '#faf9ff',
    border: '#ede9fe',
    borderLight: '#f3f0ff',
    borderStrong: '#c7d2fe',

    // Primary Brand (Electric Indigo / Violet)
    primary: '#6366f1',
    primaryHover: '#4f46e5',
    primaryLight: '#eef2ff',
    primaryText: '#4338ca',
    primaryGlow: 'rgba(99, 102, 241, 0.18)',

    // Secondary Accents & Compatibility
    cyan: '#0284c7',
    cyanLight: '#e0f2fe',
    cyanText: '#0369a1',

    emerald: '#059669',
    emeraldLight: '#ecfdf5',
    emeraldText: '#047857',

    amber: '#d97706',
    amberLight: '#fef3c7',
    amberText: '#b45309',

    rose: '#e11d48',
    roseLight: '#fff1f2',
    roseText: '#be123c',

    purple: '#7c3aed',
    purpleLight: '#f3e8ff',
    purpleText: '#6b21a8',

    // Core 5 Vibrant Friendly Tokens (Sky, Mint, Sunshine, Coral, Lavender)
    sky: '#0284c7',
    skyLight: '#f0f9ff',
    skyBorder: '#bae6fd',
    skyText: '#0369a1',

    mint: '#059669',
    mintLight: '#ecfdf5',
    mintBorder: '#a7f3d0',
    mintText: '#047857',

    sunshine: '#d97706',
    sunshineLight: '#fefce8',
    sunshineBorder: '#fde047',
    sunshineText: '#854d0e',

    coral: '#e11d48',
    coralLight: '#fff1f2',
    coralBorder: '#fecdd3',
    coralText: '#be123c',

    lavender: '#7c3aed',
    lavenderLight: '#f5f3ff',
    lavenderBorder: '#ddd6fe',
    lavenderText: '#5b21b6',

    // Typography Colors
    textMain: '#1e1b4b',
    textBody: '#334155',
    textMuted: '#64748b',
    textSubtle: '#94a3b8',
  },
  typography: {
    headingFont: "'Fredoka', 'Outfit', sans-serif",
    bodyFont: "'Nunito', 'Inter', sans-serif",
    sizes: {
      hero: '36px',
      h1: '32px',
      h2: '24px',
      h3: '20px',
      h4: '16px',
      body: '14px',
      small: '13px',
      xs: '12px',
    },
  },
  radius: {
    card: '12px',
    sm: '10px',
    md: '14px',
    lg: '20px',
    xl: '24px',
    pill: '9999px',
  },
  tokens: {
    // Phase 4 Baseline Standard Values
    cardMinWidthDesktop: '260px',
    cardWidthPhone: '100%',
    journeyTileMinSize: '120px',
    gridGapPhone: '16px',
    gridGapDesktop: '20px',
    cardPaddingPhone: '16px',
    cardPaddingDesktop: '20px',
    cardRadius: '12px',
    iconInline: 16,
    iconButton: 20,
    iconCardHeader: 24,
    iconLevelCard: 32,
    cardTitleSize: '16px',
    cardTitleWeight: 600,
    cardBodySize: '14px',
    cardBodyWeight: 400,
    cardBodyMaxLines: 2,
    cardImageAspectRatio: '16/9',
    cardImageMaxSizeKb: 150,
    statusBadgeSize: '12px',
  },
  shadows: {
    none: 'none',
    sm: '0 2px 8px rgba(99, 102, 241, 0.05)',
    md: '0 4px 16px rgba(99, 102, 241, 0.08), 0 2px 4px rgba(0, 0, 0, 0.02)',
    lg: '0 10px 30px rgba(99, 102, 241, 0.12), 0 4px 12px rgba(0, 0, 0, 0.03)',
    tactilePrimary: '0 4px 0 #4338ca, 0 6px 20px rgba(99, 102, 241, 0.25)',
  },
  transitions: {
    fast: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    normal: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    slow: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

export const levelColors = {
  1: {
    name: 'Lavender',
    level: 1,
    title: 'Understand & Develop',
    accent: '#7c3aed',
    bgLight: '#f5f3ff',
    border: '#ddd6fe',
    text: '#5b21b6',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
    badgeVariant: 'lavender' as const,
  },
  2: {
    name: 'Sky',
    level: 2,
    title: 'Discover & Investigate',
    accent: '#0284c7',
    bgLight: '#f0f9ff',
    border: '#bae6fd',
    text: '#0369a1',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
    badgeVariant: 'sky' as const,
  },
  3: {
    name: 'Mint',
    level: 3,
    title: 'Build & Solve',
    accent: '#059669',
    bgLight: '#ecfdf5',
    border: '#a7f3d0',
    text: '#047857',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    badgeVariant: 'mint' as const,
  },
  4: {
    name: 'Coral',
    level: 4,
    title: 'Improve & Master',
    accent: '#e11d48',
    bgLight: '#fff1f2',
    border: '#fecdd3',
    text: '#be123c',
    gradient: 'linear-gradient(135deg, #e11d48 0%, #fb7185 100%)',
    badgeVariant: 'coral' as const,
  },
} as const;
