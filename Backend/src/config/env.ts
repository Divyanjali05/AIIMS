import dotenv from 'dotenv';
import path from 'path';

// Load .env from Backend directory or current working directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

/**
 * Validates and retrieves the JWT secret.
 * Enforces strict 32+ character entropy in production and fails fast.
 * In development/test, emits a prominent security warning without crashing local workflows.
 * Never logs the actual secret value.
 */
export function getValidatedJwtSecret(): string {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const secret = process.env.JWT_SECRET?.trim();
  const INSECURE_DEFAULTS = [
    'aiims-secret-key-2026',
    'secret',
    'default',
    'test',
    'password',
    'changeme',
    '123456'
  ];

  if (!secret) {
    if (isProduction) {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production environment.');
    }
    console.warn('⚠️  [SECURITY WARNING] No JWT_SECRET defined in environment. Using development-only fallback. DO NOT USE IN PRODUCTION.');
    return 'aiims-dev-ephemeral-key-do-not-use-in-production-min32chars';
  }

  const isKnownDefault = INSECURE_DEFAULTS.some(d => d.toLowerCase() === secret.toLowerCase());
  const isTooShort = secret.length < 32;

  if (isProduction) {
    if (isKnownDefault || isTooShort) {
      throw new Error('FATAL: Insecure JWT_SECRET detected in production. Secret must be at least 32 characters and cannot match known placeholders.');
    }
  } else if (isKnownDefault || isTooShort) {
    console.warn('⚠️  [SECURITY WARNING] Weak or placeholder JWT_SECRET detected in development environment. Please configure a strong 256-bit secret (32+ characters) in .env.');
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
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173'
      ],
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 15,
  authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000
};


