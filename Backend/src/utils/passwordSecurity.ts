/**
 * Password Security Utility (Backend)
 * Enforces simplified modern password rules and blocks common/compromised passwords.
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

