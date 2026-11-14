/**
 * health.test.ts
 * =========================================================
 * Production Health, Readiness & Request Limits Test Suite
 *
 * Verifies:
 *  1. GET /health returns 200 with service status & DB mode, zero secrets leaked
 *  2. GET /ready returns 200 if DB connected or 503 if disconnected
 *  3. Request body limit rejects payloads larger than 1MB with HTTP 413
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { app } from '../../server';
import { checkDatabaseHealth, setDatabaseConnected } from '../../config/prisma';
import { installPrismaTestDouble, uninstallPrismaTestDouble } from './helpers/prismaTestDouble';

let server: http.Server;
let baseUrl: string;
let originalDatabaseUrl: string | undefined;

beforeAll(async () => {
  originalDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgresql://vitest:vitest@localhost:5432/aiims_vitest';
  installPrismaTestDouble({ connected: true });

  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  uninstallPrismaTestDouble();
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

describe('Production Observability & Health Check Endpoints', () => {
  it('GET /health returns HTTP 200 with public status and no internal secrets', async () => {
    setDatabaseConnected(true);
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('AIIMS Backend API');
    expect(body.version).toBeDefined();
    expect(body.database).toBeDefined();
    expect(typeof body.database.connected).toBe('boolean');
    expect(body.database.mode).toBe('postgresql');

    // Strict leak checks: no secrets, connection strings, passwords, or tokens in health response
    const jsonStr = JSON.stringify(body);
    expect(jsonStr).not.toContain('postgresql://');
    expect(jsonStr).not.toContain('postgres://');
    expect(jsonStr).not.toContain('mongodb://');
    expect(jsonStr).not.toContain('mongodb+srv://');
    expect(jsonStr).not.toContain('password');
    expect(jsonStr).not.toContain('secret');
  });

  it('GET /api/health also returns HTTP 200 with consistent status payload', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('AIIMS Backend API');
    expect(body.database.mode).toBe('postgresql');
  });

  it('GET /ready returns HTTP 200 when PostgreSQL is connected and 503 when disconnected', async () => {
    setDatabaseConnected(true);
    const health = await checkDatabaseHealth();
    expect(health.connected).toBe(true);

    const readyRes = await fetch(`${baseUrl}/ready`);
    expect(readyRes.status).toBe(200);
    const readyBody = await readyRes.json();
    expect(readyBody.status).toBe('ready');
    expect(readyBody.database).toBe('connected');

    setDatabaseConnected(false);
    const disconnectedRes = await fetch(`${baseUrl}/ready`);
    expect(disconnectedRes.status).toBe(503);
    const disconnectedBody = await disconnectedRes.json();
    expect(disconnectedBody.status).toBe('not_ready');
    expect(disconnectedBody.database).toBe('disconnected');

    setDatabaseConnected(true);
  });

  it('GET /api/ready mirrors /ready readiness semantics', async () => {
    setDatabaseConnected(true);
    const connectedRes = await fetch(`${baseUrl}/api/ready`);
    expect(connectedRes.status).toBe(200);

    setDatabaseConnected(false);
    const disconnectedRes = await fetch(`${baseUrl}/api/ready`);
    expect(disconnectedRes.status).toBe(503);

    setDatabaseConnected(true);
  });

  it('rejects oversized JSON request bodies (>1MB) with HTTP 413 Payload Too Large', async () => {
    // Generate an oversized string payload exceeding 1MB
    const oversizedContent = 'X'.repeat(1.2 * 1024 * 1024);
    const res = await fetch(`${baseUrl}/api/mascot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ largeField: oversizedContent }),
    });

    // Express json parser triggers 413 Payload Too Large on oversized bodies
    expect(res.status).toBe(413);
  });
});
