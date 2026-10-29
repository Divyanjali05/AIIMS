import React from 'react';

interface IllustrationProps {
  className?: string;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
}

/**
 * Level 1: Understand & Develop (Lavender #7c3aed)
 * Visual theme: Diagnostic radar, competency matrix, and prompt reasoning spark.
 */
export const Level1Illustration: React.FC<IllustrationProps> = ({
  style,
  width = '100%',
  height = '110px',
}) => (
  <svg
    viewBox="0 0 320 120"
    width={width}
    height={height}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block', borderRadius: '8px', ...style }}
  >
    <defs>
      <linearGradient id="l1Grad" x1="0" y1="0" x2="320" y2="120" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f5f3ff" />
        <stop offset="1" stopColor="#ede9fe" />
      </linearGradient>
      <linearGradient id="l1Accent" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#7c3aed" />
        <stop offset="1" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    <rect width="320" height="120" rx="8" fill="url(#l1Grad)" />
    {/* Geometric Grid Pattern */}
    <circle cx="160" cy="60" r="46" stroke="#ddd6fe" strokeWidth="1.5" strokeDasharray="3 3" />
    <circle cx="160" cy="60" r="28" stroke="#c4b5fd" strokeWidth="1.5" />
    <circle cx="160" cy="60" r="10" fill="url(#l1Accent)" />

    {/* Radar Pentagon Nodes */}
    <path
      d="M160 22 L198 44 L185 88 L135 88 L122 44 Z"
      fill="rgba(124, 58, 237, 0.12)"
      stroke="url(#l1Accent)"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="160" cy="22" r="3.5" fill="#7c3aed" />
    <circle cx="198" cy="44" r="3.5" fill="#7c3aed" />
    <circle cx="185" cy="88" r="3.5" fill="#7c3aed" />
    <circle cx="135" cy="88" r="3.5" fill="#7c3aed" />
    <circle cx="122" cy="44" r="3.5" fill="#7c3aed" />

    {/* Decorative Cards Left & Right */}
    <rect
      x="22"
      y="36"
      width="60"
      height="48"
      rx="6"
      fill="#ffffff"
      stroke="#ddd6fe"
      strokeWidth="1"
    />
    <rect x="30" y="46" width="36" height="5" rx="2.5" fill="#c4b5fd" />
    <rect x="30" y="56" width="44" height="4" rx="2" fill="#ede9fe" />
    <rect x="30" y="65" width="24" height="4" rx="2" fill="#ede9fe" />

    <rect
      x="238"
      y="36"
      width="60"
      height="48"
      rx="6"
      fill="#ffffff"
      stroke="#ddd6fe"
      strokeWidth="1"
    />
    <circle
      cx="268"
      cy="54"
      r="12"
      fill="rgba(124, 58, 237, 0.12)"
      stroke="#7c3aed"
      strokeWidth="1.5"
    />
    <path
      d="M264 54 L267 57 L273 51"
      stroke="#7c3aed"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect x="248" y="72" width="40" height="4" rx="2" fill="#c4b5fd" />
  </svg>
);

/**
 * Level 2: Discover & Investigate (Sky #0284c7)
 * Visual theme: Radar pulse arcs, telemetry satellite signals, opportunity beacons.
 */
export const Level2Illustration: React.FC<IllustrationProps> = ({
  style,
  width = '100%',
  height = '110px',
}) => (
  <svg
    viewBox="0 0 320 120"
    width={width}
    height={height}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block', borderRadius: '8px', ...style }}
  >
    <defs>
      <linearGradient id="l2Grad" x1="0" y1="0" x2="320" y2="120" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f0f9ff" />
        <stop offset="1" stopColor="#e0f2fe" />
      </linearGradient>
      <linearGradient id="l2Accent" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#0284c7" />
        <stop offset="1" stopColor="#38bdf8" />
      </linearGradient>
    </defs>
    <rect width="320" height="120" rx="8" fill="url(#l2Grad)" />

    {/* Concentric Signal Radar Waves */}
    <circle cx="160" cy="60" r="50" stroke="#bae6fd" strokeWidth="1.5" strokeDasharray="4 4" />
    <circle cx="160" cy="60" r="34" stroke="#7dd3fc" strokeWidth="1.5" />
    <circle cx="160" cy="60" r="18" stroke="#38bdf8" strokeWidth="2" />
    <circle cx="160" cy="60" r="6" fill="#0284c7" />

    {/* Radar Sweep Arc */}
    <path d="M160 60 L195 25 A50 50 0 0 1 210 60 Z" fill="rgba(2, 132, 199, 0.14)" />

    {/* Discovered Signal Blips */}
    <circle cx="190" cy="42" r="5" fill="#0284c7" />
    <circle cx="190" cy="42" r="9" stroke="#0284c7" strokeWidth="1" opacity="0.6" />

    <circle cx="132" cy="78" r="4" fill="#38bdf8" />
    <circle cx="132" cy="78" r="7" stroke="#38bdf8" strokeWidth="1" opacity="0.6" />

    {/* Satellite Dish & Telemetry Antenna */}
    <path d="M48 76 L62 48 M62 48 L76 76" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" />
    <path d="M52 56 A16 16 0 0 1 72 56" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="62" cy="44" r="3" fill="#0284c7" />

    {/* Wave Indicators on Right */}
    <path
      d="M245 45 C255 52 255 68 245 75"
      stroke="#0284c7"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M255 38 C270 50 270 70 255 82"
      stroke="#7dd3fc"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M265 30 C285 46 285 74 265 90"
      stroke="#bae6fd"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeDasharray="3 3"
    />
  </svg>
);

/**
 * Level 3: Build & Solve (Mint #059669)
 * Visual theme: System architecture graph, pipeline workflows, modular building blocks.
 */
export const Level3Illustration: React.FC<IllustrationProps> = ({
  style,
  width = '100%',
  height = '110px',
}) => (
  <svg
    viewBox="0 0 320 120"
    width={width}
    height={height}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block', borderRadius: '8px', ...style }}
  >
    <defs>
      <linearGradient id="l3Grad" x1="0" y1="0" x2="320" y2="120" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ecfdf5" />
        <stop offset="1" stopColor="#d1fae5" />
      </linearGradient>
      <linearGradient id="l3Accent" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#059669" />
        <stop offset="1" stopColor="#10b981" />
      </linearGradient>
    </defs>
    <rect width="320" height="120" rx="8" fill="url(#l3Grad)" />

    {/* Connecting Pipeline Wires */}
    <path
      d="M80 60 L140 60 M180 60 L240 60"
      stroke="#a7f3d0"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      d="M140 60 L140 40 L160 40"
      stroke="#059669"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="4 4"
    />
    <path
      d="M140 60 L140 80 L160 80"
      stroke="#059669"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="4 4"
    />

    {/* Architecture Module Nodes */}
    {/* Node 1: Input / Trigger */}
    <rect
      x="42"
      y="42"
      width="38"
      height="36"
      rx="6"
      fill="#ffffff"
      stroke="#a7f3d0"
      strokeWidth="1.5"
    />
    <rect x="49" y="52" width="24" height="4" rx="2" fill="#10b981" />
    <rect x="49" y="60" width="16" height="4" rx="2" fill="#a7f3d0" />

    {/* Central Solution Engine */}
    <rect x="140" y="32" width="40" height="56" rx="8" fill="url(#l3Accent)" />
    <path
      d="M152 50 L168 50 M152 60 L168 60 M152 70 L162 70"
      stroke="#ffffff"
      strokeWidth="2"
      strokeLinecap="round"
    />

    {/* Node 3: Target Output Build */}
    <rect
      x="240"
      y="42"
      width="38"
      height="36"
      rx="6"
      fill="#ffffff"
      stroke="#a7f3d0"
      strokeWidth="1.5"
    />
    <circle cx="259" cy="60" r="8" fill="#ecfdf5" stroke="#059669" strokeWidth="2" />
    <path
      d="M256 60 L258 62 L263 57"
      stroke="#059669"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Small Flow Particles */}
    <circle cx="108" cy="60" r="3" fill="#059669" />
    <circle cx="212" cy="60" r="3" fill="#059669" />
  </svg>
);

/**
 * Level 4: Improve & Master (Coral #e11d48)
 * Visual theme: Mentoring dialogue, precision calibration, iterative intelligence loop.
 */
export const Level4Illustration: React.FC<IllustrationProps> = ({
  style,
  width = '100%',
  height = '110px',
}) => (
  <svg
    viewBox="0 0 320 120"
    width={width}
    height={height}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block', borderRadius: '8px', ...style }}
  >
    <defs>
      <linearGradient id="l4Grad" x1="0" y1="0" x2="320" y2="120" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fff1f2" />
        <stop offset="1" stopColor="#ffe4e6" />
      </linearGradient>
      <linearGradient id="l4Accent" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#e11d48" />
        <stop offset="1" stopColor="#fb7185" />
      </linearGradient>
    </defs>
    <rect width="320" height="120" rx="8" fill="url(#l4Grad)" />

    {/* Continuous Feedback Orbit Loop */}
    <ellipse
      cx="160"
      cy="60"
      rx="58"
      ry="32"
      stroke="#fecdd3"
      strokeWidth="1.5"
      strokeDasharray="4 4"
    />

    {/* Mentor Dialogue Bubble Left */}
    <rect
      x="74"
      y="34"
      width="62"
      height="42"
      rx="8"
      fill="#ffffff"
      stroke="#fecdd3"
      strokeWidth="1.5"
    />
    <path
      d="M120 76 L128 84 L126 76 Z"
      fill="#ffffff"
      stroke="#fecdd3"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <rect x="84" y="44" width="42" height="4" rx="2" fill="#fb7185" />
    <rect x="84" y="52" width="30" height="4" rx="2" fill="#fecdd3" />
    <rect x="84" y="60" width="36" height="4" rx="2" fill="#fecdd3" />

    {/* AI Mentor Sparkle Centre */}
    <circle cx="160" cy="60" r="16" fill="url(#l4Accent)" />
    <path d="M160 52 L162 58 L168 60 L162 62 L160 68 L158 62 L152 60 L158 58 Z" fill="#ffffff" />

    {/* Learner Performance Reflection Right */}
    <rect
      x="184"
      y="42"
      width="62"
      height="42"
      rx="8"
      fill="#ffffff"
      stroke="#fecdd3"
      strokeWidth="1.5"
    />
    <path
      d="M192 84 L200 84 L196 76 Z"
      fill="#ffffff"
      stroke="#fecdd3"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M194 62 L199 56 L205 60 L212 52"
      stroke="#e11d48"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="212" cy="52" r="2.5" fill="#e11d48" />
  </svg>
);

/**
 * AI Tool Intelligence / Wallet Illustration (Sunshine #d97706)
 */
export const WalletIllustration: React.FC<IllustrationProps> = ({
  style,
  width = '100%',
  height = '110px',
}) => (
  <svg
    viewBox="0 0 320 120"
    width={width}
    height={height}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block', borderRadius: '8px', ...style }}
  >
    <defs>
      <linearGradient id="wGrad" x1="0" y1="0" x2="320" y2="120" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fefce8" />
        <stop offset="1" stopColor="#fef08a" />
      </linearGradient>
      <linearGradient id="wAccent" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#d97706" />
        <stop offset="1" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
    <rect width="320" height="120" rx="8" fill="url(#wGrad)" />

    {/* Digital Smart Wallet Card */}
    <rect
      x="95"
      y="28"
      width="130"
      height="68"
      rx="10"
      fill="#ffffff"
      stroke="#fde047"
      strokeWidth="1.5"
    />
    <rect x="110" y="40" width="24" height="18" rx="4" fill="url(#wAccent)" />
    <rect x="115" y="46" width="14" height="6" rx="2" fill="#fefce8" opacity="0.8" />

    <rect x="144" y="42" width="60" height="5" rx="2.5" fill="#d97706" />
    <rect x="144" y="52" width="40" height="4" rx="2" fill="#fde047" />
    <rect x="110" y="74" width="70" height="5" rx="2.5" fill="#ca8a04" opacity="0.7" />

    {/* Verified Security Shield */}
    <circle cx="205" cy="74" r="10" fill="#fefce8" stroke="#d97706" strokeWidth="1.5" />
    <path
      d="M202 74 L204 76 L208 72"
      stroke="#d97706"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
