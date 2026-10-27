import dotenv from 'dotenv';
import path from 'path';

// Load .env from Backend directory or current working directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const INSECURE_JWT_DEFAULTS = [
  'aiims-secret-key-2026',
  'secret',
  'default',
  'test',
  'password',
  'changeme',
  '123456',
];

/**
 * Validates startup configuration for production environments.
 * In production (NODE_ENV=production), throws fatal error if:
 *  - JWT_SECRET is missing, shorter than 32 characters, or a known placeholder
 *  - MONGODB_URI is missing or empty
 *  - ALLOWED_ORIGINS is missing or contains '*'
 * Prints which variable is wrong, NEVER its value.
 */
export function validateStartupConfig(env: NodeJS.ProcessEnv = process.env): void {
  const nodeEnv = env.NODE_ENV || 'development';
  if (nodeEnv !== 'production') {
    return;
  }

  // 1. JWT_SECRET validation
  const jwtSecret = env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    throw new Error(
      'FATAL: Configuration error for variable JWT_SECRET: variable is missing in production.'
    );
  }
  if (jwtSecret.length < 32) {
    throw new Error(
      'FATAL: Configuration error for variable JWT_SECRET: must be at least 32 characters in production.'
    );
  }
  if (INSECURE_JWT_DEFAULTS.some((d) => d.toLowerCase() === jwtSecret.toLowerCase())) {
    throw new Error(
      'FATAL: Configuration error for variable JWT_SECRET: insecure placeholder value is not permitted in production.'
    );
  }

  // 2. MONGODB_URI validation
  const mongodbUri = env.MONGODB_URI?.trim();
  if (!mongodbUri) {
    throw new Error(
      'FATAL: Configuration error for variable MONGODB_URI: variable is missing in production.'
    );
  }

  // 3. ALLOWED_ORIGINS validation
  const allowedOriginsRaw = env.ALLOWED_ORIGINS?.trim();
  if (!allowedOriginsRaw) {
    throw new Error(
      'FATAL: Configuration error for variable ALLOWED_ORIGINS: variable is missing in production.'
    );
  }
  const origins = allowedOriginsRaw.split(',').map((o) => o.trim());
  if (origins.some((o) => o === '*' || o.includes('*'))) {
    throw new Error(
      "FATAL: Configuration error for variable ALLOWED_ORIGINS: wildcard '*' is not permitted in production."
    );
  }
}

/**
 * Validates and retrieves the JWT secret.
 * Enforces strict 32+ character entropy in production and fails fast.
 * In development/test, emits a security warning without crashing local workflows.
 * Never logs the actual secret value.
 */
export function getValidatedJwtSecret(): string {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    if (isProduction) {
      throw new Error(
        'FATAL: JWT_SECRET environment variable is missing in production. (Configuration error for variable JWT_SECRET)'
      );
    }
    console.warn(
      '⚠️  [SECURITY WARNING] No JWT_SECRET defined in environment. Using development-only fallback. DO NOT USE IN PRODUCTION.'
    );
    return 'aiims-dev-ephemeral-key-do-not-use-in-production-min32chars';
  }

  const isKnownDefault = INSECURE_JWT_DEFAULTS.some(
    (d) => d.toLowerCase() === secret.toLowerCase()
  );
  const isTooShort = secret.length < 32;

  if (isProduction) {
    if (isKnownDefault || isTooShort) {
      throw new Error(
        'FATAL: Insecure JWT_SECRET detected: must be at least 32 characters and cannot match known placeholders in production.'
      );
    }
  } else if (isKnownDefault || isTooShort) {
    console.warn(
      '⚠️  [SECURITY WARNING] Weak or placeholder JWT_SECRET detected in development environment. Please configure a strong 256-bit secret (32+ characters) in .env.'
    );
  }

  return secret;
}

export const config = {
  port: Number(process.env.PORT) || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: getValidatedJwtSecret(),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || 'mock-claude-key',
  claudeModel: 'claude-3-5-sonnet-20241022',
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  mongodbUri: process.env.MONGODB_URI || '',
  allowedOrigins: (() => {
    const raw = process.env.ALLOWED_ORIGINS;
    const isProd = (process.env.NODE_ENV || 'development') === 'production';
    if (raw) {
      return raw
        .split(',')
        .map((o) => o.trim())
        .filter((o) => o && o !== '*');
    }
    // Localhost fallbacks for local development only
    return isProd
      ? []
      : [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://localhost:5173',
          'http://127.0.0.1:5173',
        ];
  })(),
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 15,
  authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  /** 64-char hex string → 32-byte AES-256 key for encrypting TOTP secrets at rest. */
  totpEncryptionKey: process.env.TOTP_ENCRYPTION_KEY || '',
  /** Support contact email (placeholder read from SUPPORT_EMAIL) */
  supportEmail: process.env.SUPPORT_EMAIL || 'support@aiims.education',
};
