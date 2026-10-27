/**
 * colorContrast.test.ts
 * =========================================================
 * AIIMS Automated WCAG AA Color Contrast Test Suite
 *
 * Mathematically verifies that all core design token pairs (Sky, Mint, Sunshine,
 * Coral, Lavender, and Levels 1 to 4) achieve WCAG AA contrast ratio (>= 4.5:1
 * for normal text, >= 3.0:1 for large text/icons).
 */

import { theme, levelColors } from '../../theme/theme';

type TestFn = (name: string, fn: () => void | Promise<void>) => void;
type ExpectMatcher = { [key: string]: (...args: unknown[]) => unknown };
declare const describe: TestFn & { [key: string]: unknown };
declare const it: TestFn & { [key: string]: unknown };
declare const expect: (actual: unknown) => ExpectMatcher;

export interface ContrastCheckResult {
  name: string;
  foreground: string;
  background: string;
  contrastRatio: number;
  requiredRatio: number;
  passed: boolean;
  detail?: string;
}

/**
 * Convert 6-digit hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Standard WCAG 2.1 relative luminance calculation
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const [sR, sG, sB] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((val) => {
    return val <= 0.04045 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
}

/**
 * Standard WCAG 2.1 contrast ratio: (L1 + 0.05) / (L2 + 0.05)
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hexToRgb(hex1));
  const lum2 = getRelativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

export function runColorContrastTestSuite(): {
  passedCount: number;
  failedCount: number;
  totalCount: number;
  results: ContrastCheckResult[];
} {
  const checks: {
    name: string;
    foreground: string;
    background: string;
    minRatio: number;
  }[] = [
    // 1. Sky Token Family (WCAG AA normal text >= 4.5:1)
    {
      name: 'Sky text (#0369a1) on Sky light background (#f0f9ff)',
      foreground: theme.colors.skyText,
      background: theme.colors.skyLight,
      minRatio: 4.5,
    },
    {
      name: 'White text on Sky solid button (#0369a1)',
      foreground: '#ffffff',
      background: '#0369a1',
      minRatio: 4.5,
    },

    // 2. Mint Token Family (WCAG AA normal text >= 4.5:1)
    {
      name: 'Mint text (#047857) on Mint light background (#ecfdf5)',
      foreground: theme.colors.mintText,
      background: theme.colors.mintLight,
      minRatio: 4.5,
    },
    {
      name: 'White text on Mint solid button (#047857)',
      foreground: '#ffffff',
      background: '#047857',
      minRatio: 4.5,
    },

    // 3. Sunshine Token Family (WCAG AA normal text >= 4.5:1)
    {
      name: 'Sunshine text (#854d0e) on Sunshine light background (#fefce8)',
      foreground: theme.colors.sunshineText,
      background: theme.colors.sunshineLight,
      minRatio: 4.5,
    },
    {
      name: 'White text on Sunshine solid button (#854d0e)',
      foreground: '#ffffff',
      background: '#854d0e',
      minRatio: 4.5,
    },

    // 4. Coral Token Family (WCAG AA normal text >= 4.5:1)
    {
      name: 'Coral text (#be123c) on Coral light background (#fff1f2)',
      foreground: theme.colors.coralText,
      background: theme.colors.coralLight,
      minRatio: 4.5,
    },
    {
      name: 'White text on Coral solid button (#e11d48)',
      foreground: '#ffffff',
      background: theme.colors.coral,
      minRatio: 4.5,
    },

    // 5. Lavender Token Family (WCAG AA normal text >= 4.5:1)
    {
      name: 'Lavender text (#5b21b6) on Lavender light background (#f5f3ff)',
      foreground: theme.colors.lavenderText,
      background: theme.colors.lavenderLight,
      minRatio: 4.5,
    },
    {
      name: 'White text on Lavender solid button (#7c3aed)',
      foreground: '#ffffff',
      background: theme.colors.lavender,
      minRatio: 4.5,
    },

    // 6. Level 1 (Understand & Develop): Lavender
    {
      name: 'Level 1 text on Level 1 light card surface',
      foreground: levelColors[1].text,
      background: levelColors[1].bgLight,
      minRatio: 4.5,
    },

    // 7. Level 2 (Discover & Investigate): Sky
    {
      name: 'Level 2 text on Level 2 light card surface',
      foreground: levelColors[2].text,
      background: levelColors[2].bgLight,
      minRatio: 4.5,
    },

    // 8. Level 3 (Build & Solve): Mint
    {
      name: 'Level 3 text on Level 3 light card surface',
      foreground: levelColors[3].text,
      background: levelColors[3].bgLight,
      minRatio: 4.5,
    },

    // 9. Level 4 (Improve & Master): Coral
    {
      name: 'Level 4 text on Level 4 light card surface',
      foreground: levelColors[4].text,
      background: levelColors[4].bgLight,
      minRatio: 4.5,
    },

    // 10. General Page Typography on Surface
    {
      name: 'Heading text (#0f172a) on white surface (#ffffff)',
      foreground: '#0f172a',
      background: theme.colors.surface,
      minRatio: 4.5,
    },
    {
      name: 'Body text (#334155) on white surface (#ffffff)',
      foreground: theme.colors.textBody,
      background: theme.colors.surface,
      minRatio: 4.5,
    },
    {
      name: 'Secondary text (#475569) on white surface (#ffffff)',
      foreground: '#475569',
      background: theme.colors.surface,
      minRatio: 4.5,
    },
    {
      name: 'Electric Indigo text (#4338ca) on primary light surface (#eef2ff)',
      foreground: theme.colors.primaryText,
      background: theme.colors.primaryLight,
      minRatio: 4.5,
    },
  ];

  const results: ContrastCheckResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  for (const c of checks) {
    const ratio = getContrastRatio(c.foreground, c.background);
    const passed = ratio >= c.minRatio;
    if (passed) {
      passedCount++;
    } else {
      failedCount++;
    }
    results.push({
      name: c.name,
      foreground: c.foreground,
      background: c.background,
      contrastRatio: ratio,
      requiredRatio: c.minRatio,
      passed,
      detail: passed
        ? `${ratio}:1 >= ${c.minRatio}:1 (PASSED WCAG AA)`
        : `${ratio}:1 < ${c.minRatio}:1 (FAILED WCAG AA)`,
    });
  }

  return {
    passedCount,
    failedCount,
    totalCount: checks.length,
    results,
  };
}

if (typeof describe === 'function') {
  describe('WCAG AA Color Contrast Standards', () => {
    const suite = runColorContrastTestSuite();
    suite.results.forEach((check) => {
      it(check.name, () => {
        expect(check.passed).toBe(true);
      });
    });
  });
}
