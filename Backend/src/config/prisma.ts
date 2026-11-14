/**
 * prisma.ts
 * =========================================================
 * Singleton Prisma ORM Client & PostgreSQL Connection Lifecycle Manager
 *
 * Strictly PostgreSQL-only architecture (zero MongoDB or in-memory fallbacks).
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { config } from './env';
import { logger } from '../utils/logger';

declare global {
  var __aiimsPrisma: PrismaClient | undefined;
}

const createPrismaClient = (): PrismaClient => {
  return new PrismaClient({
    log: config.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
  });
};

export const prisma: PrismaClient = globalThis.__aiimsPrisma ?? createPrismaClient();

if (config.nodeEnv !== 'production') {
  globalThis.__aiimsPrisma = prisma;
}

let dbConnected = false;

export interface DatabaseConnectionStatus {
  connected: boolean;
  mode: 'postgresql';
  databaseName?: string;
  warning?: string;
}

/**
 * Returns cached connection readiness state synchronously.
 * Updated by connectDatabase(), checkDatabaseHealth(), and disconnectDatabase().
 */
export function isDatabaseConnected(): boolean {
  return dbConnected;
}

/**
 * Allows health tests or shutdown hooks to update cached status cleanly.
 */
export function setDatabaseConnected(state: boolean): void {
  dbConnected = state;
}

/**
 * Establishes connection to PostgreSQL with bounded retries and verifies via `SELECT 1`.
 */
export async function connectDatabase(
  maxRetries: number = 3,
  delayMs: number = 1500
): Promise<DatabaseConnectionStatus> {
  const effectiveUrl = (process.env.DATABASE_URL || config.databaseUrl || '').trim();

  if (!effectiveUrl) {
    dbConnected = false;
    if (config.nodeEnv === 'production') {
      throw new Error(
        'FATAL: Configuration error for variable DATABASE_URL: variable is missing in production.'
      );
    }
    logger.warn(
      '[Database] DATABASE_URL is not configured. PostgreSQL database is disconnected; readiness checks will return 503.'
    );
    return {
      connected: false,
      mode: 'postgresql',
      warning: 'DATABASE_URL not configured',
    };
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`[Database] Connecting to PostgreSQL (attempt ${attempt}/${maxRetries})...`);
      await prisma.$connect();
      const rows = await prisma.$queryRaw<Array<{ db: string }>>`SELECT current_database() AS db`;
      const databaseName = rows?.[0]?.db;
      dbConnected = true;
      logger.info('[Database] Connected to PostgreSQL successfully.', { databaseName });
      return {
        connected: true,
        mode: 'postgresql',
        databaseName,
      };
    } catch (err: unknown) {
      dbConnected = false;
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn(`[Database] PostgreSQL connection attempt ${attempt} failed: ${errMsg}`);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        if (config.nodeEnv === 'production') {
          throw new Error(`FATAL: PostgreSQL connection failed in production: ${errMsg}`);
        }
        return {
          connected: false,
          mode: 'postgresql',
          warning: errMsg,
        };
      }
    }
  }

  dbConnected = false;
  return { connected: false, mode: 'postgresql' };
}

/**
 * Active PostgreSQL health probe (`SELECT 1`).
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  databaseName?: string;
}> {
  const effectiveUrl = (process.env.DATABASE_URL || config.databaseUrl || '').trim();
  if (!effectiveUrl && config.nodeEnv !== 'test') {
    dbConnected = false;
    return { connected: false };
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ db: string }>>`SELECT current_database() AS db`;
    dbConnected = true;
    return {
      connected: true,
      databaseName: rows?.[0]?.db || 'aiims',
    };
  } catch {
    dbConnected = false;
    return { connected: false };
  }
}

/**
 * Cleanly closes Prisma connection pool on graceful shutdown.
 */
export async function disconnectDatabase(): Promise<void> {
  dbConnected = false;
  try {
    await prisma.$disconnect();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`[Database] Disconnect warning: ${msg}`);
  }
}

const TRANSIENT_PRISMA_CODES = new Set(['P1001', 'P1008', 'P1017', 'P2034']);

/**
 * Retries transient PostgreSQL serialization / connection drops safely.
 */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries: number = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: unknown }).code)
          : '';
      if (!TRANSIENT_PRISMA_CODES.has(code) || attempt === maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }
  throw lastError;
}

/**
 * Type guard checking if a Prisma error matches a specific error code (e.g. 'P2002').
 */
export function isPrismaErrorCode(err: unknown, code: string): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return err.code === code;
  }
  return Boolean(
    err &&
    typeof err === 'object' &&
    'code' in err &&
    String((err as { code: unknown }).code) === code
  );
}
