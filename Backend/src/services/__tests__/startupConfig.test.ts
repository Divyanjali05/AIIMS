/**
 * startupConfig.test.ts
 * =========================================================
 * Startup Configuration Validation Test Suite
 *
 * Verifies that in production (NODE_ENV=production), the backend:
 *  1. Refuses to start if JWT_SECRET is missing or shorter than 32 characters
 *  2. Refuses to start if JWT_SECRET is an insecure placeholder
 *  3. Refuses to start if MONGODB_URI is missing
 *  4. Refuses to start if ALLOWED_ORIGINS is missing or contains '*'
 *  5. Names which variable is wrong, NEVER its value
 *  6. Passes cleanly when all production variables are valid
 */

import { describe, it, expect } from 'vitest';
import { validateStartupConfig } from '../../config/env';

describe('Startup Configuration Validation (Production Safeguards)', () => {
  const validBaseEnv: NodeJS.ProcessEnv = {
    NODE_ENV: 'production',
    JWT_SECRET: 'a_very_strong_production_jwt_secret_with_more_than_32_characters_12345',
    MONGODB_URI: 'mongodb://localhost:27017/aiims_prod',
    ALLOWED_ORIGINS: 'https://aiims.edu,https://app.aiims.edu',
  };

  it('passes cleanly when all production variables are valid', () => {
    expect(() => validateStartupConfig(validBaseEnv)).not.toThrow();
  });

  it('refuses to start if JWT_SECRET is missing in production', () => {
    const env = { ...validBaseEnv };
    delete env.JWT_SECRET;

    expect(() => validateStartupConfig(env)).toThrowError(
      /Configuration error for variable JWT_SECRET: variable is missing in production/
    );
  });

  it('refuses to start if JWT_SECRET is shorter than 32 characters in production', () => {
    const env = { ...validBaseEnv, JWT_SECRET: 'short_secret_under_32' };

    expect(() => validateStartupConfig(env)).toThrowError(
      /Configuration error for variable JWT_SECRET: must be at least 32 characters in production/
    );
  });

  it('refuses to start if JWT_SECRET is a known placeholder in production', () => {
    const env = { ...validBaseEnv, JWT_SECRET: 'aiims-secret-key-2026' };

    expect(() => validateStartupConfig(env)).toThrowError(
      /Configuration error for variable JWT_SECRET/
    );
  });

  it('never prints the actual JWT_SECRET value in error messages', () => {
    const secretValue = 'this_is_a_secret_value_1234567890';
    const env = { ...validBaseEnv, JWT_SECRET: secretValue };

    try {
      validateStartupConfig(env);
    } catch (err: any) {
      expect(err.message).toContain('JWT_SECRET');
      expect(err.message).not.toContain(secretValue);
    }
  });

  it('refuses to start if MONGODB_URI is missing in production', () => {
    const env = { ...validBaseEnv };
    delete env.MONGODB_URI;

    expect(() => validateStartupConfig(env)).toThrowError(
      /Configuration error for variable MONGODB_URI: variable is missing in production/
    );
  });

  it('refuses to start if ALLOWED_ORIGINS is missing in production', () => {
    const env = { ...validBaseEnv };
    delete env.ALLOWED_ORIGINS;

    expect(() => validateStartupConfig(env)).toThrowError(
      /Configuration error for variable ALLOWED_ORIGINS: variable is missing in production/
    );
  });

  it('refuses to start if ALLOWED_ORIGINS contains wildcard * in production', () => {
    const env = { ...validBaseEnv, ALLOWED_ORIGINS: '*' };

    expect(() => validateStartupConfig(env)).toThrowError(
      /Configuration error for variable ALLOWED_ORIGINS: wildcard '\*' is not permitted in production/
    );
  });

  it('refuses to start if ALLOWED_ORIGINS contains wildcard * alongside other origins in production', () => {
    const env = { ...validBaseEnv, ALLOWED_ORIGINS: 'https://aiims.edu, *' };

    expect(() => validateStartupConfig(env)).toThrowError(
      /Configuration error for variable ALLOWED_ORIGINS: wildcard '\*' is not permitted in production/
    );
  });

  it('does not throw in development mode when production variables are absent', () => {
    const devEnv: NodeJS.ProcessEnv = {
      NODE_ENV: 'development',
    };

    expect(() => validateStartupConfig(devEnv)).not.toThrow();
  });
});
