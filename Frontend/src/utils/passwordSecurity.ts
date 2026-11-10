/**
 * Password Security & Strength Utility (Frontend)
 * Provides simplified password validation, common password detection,
 * and user-friendly strength assessment (Weak / Medium / Strong).
 */

export const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  'password',
  'password1',
  'password12',
  'password123',
  'password1234',
  '12345678',
  '123456789',
  '1234567890',
  '01234567',
  '87654321',
  'qwertyui',
  'qwertyuiop',
  'asdfghjk',
  'asdfghjkl',
  'zxcvbnm1',
  '11111111',
  '00000000',
  '12312312',
  '123123123',
  '12341234',
  'abc12345',
  'abcdefgh',
  'admin123',
  'admin1234',
  'administrator',
  'welcome1',
  'welcome123',
  'letmein1',
  'letmein123',
  'iloveyou',
  'iloveyou1',
  'sunshine',
  'sunshine1',
  'princess',
  'football',
  'monkey12',
  'monkey123',
  'dragon12',
  'dragon123',
  'master12',
  'master123',
  'computer',
  'trustno1',
  'secret12',
  'secret123',
  'superman',
  'superman1',
  'charlie1',
  'shadow12',
  'shadow123',
  'pass1234',
  'passcode1',
  'testing123',
]);

/**
 * Checks whether a given password is considered commonly used, easily guessable, or compromised.
 */
export function isCommonPassword(password: string): boolean {
  if (!password || typeof password !== 'string') return false;
  const normalized = password.trim().toLowerCase();
  if (COMMON_PASSWORDS.has(normalized)) return true;
  // All identical repeated characters (8 or more characters, e.g. 'aaaaaaaa', '11111111')
  if (/^(.)\1{7,}$/.test(normalized)) return true;
  return false;
}

export type PasswordStrengthLabel = 'Weak' | 'Medium' | 'Strong' | '';

export interface PasswordStrengthResult {
  score: number; // 0 (empty), 1 (Weak), 2 (Medium), 3 (Strong)
  label: PasswordStrengthLabel;
  color: string;
}

/**
 * Calculates password strength dynamically without forcing arbitrary complexity rules.
 * Uses length, character variety, and common password checks.
 */
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return { score: 0, label: '', color: '' };
  }

  // Common passwords or under 8 chars are automatically Weak
  if (password.length < 8 || isCommonPassword(password)) {
    return { score: 1, label: 'Weak', color: '#EF4444' };
  }

  // Base points for meeting minimum length
  let points = 1;

  // Length bonus
  if (password.length >= 10) points++;
  if (password.length >= 12) points++;

  // Variety bonus: checks presence of multiple character classes
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const varietyCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  if (varietyCount >= 2) points++;
  if (varietyCount >= 3) points++;

  if (points <= 1) {
    return { score: 1, label: 'Weak', color: '#EF4444' };
  }
  if (points === 2 || points === 3) {
    return { score: 2, label: 'Medium', color: '#F59E0B' };
  }
  return { score: 3, label: 'Strong', color: '#10B981' };
}

