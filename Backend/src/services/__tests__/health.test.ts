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
import mongoose from 'mongoose';
import { app } from '../../server';

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe('Production Observability & Health Check Endpoints', () => {
  it('GET /health returns HTTP 200 with public status and no internal secrets', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('AIIMS Backend API');
    expect(body.version).toBeDefined();
    expect(body.database).toBeDefined();
    expect(typeof body.database.connected).toBe('boolean');
    expect(['mongodb', 'fallback']).toContain(body.database.mode);

    // Strict leak checks: no secrets, connection strings, passwords, or tokens in health response
    const jsonStr = JSON.stringify(body);
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
  });

  it('GET /ready returns HTTP 200 when database is connected or 503 when disconnected', async () => {
    const res = await fetch(`${baseUrl}/ready`);
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('ready');
      expect(body.database).toBe('connected');
    } else {
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.status).toBe('not_ready');
      expect(body.database).toBe('disconnected');
    }
  });

  it('GET /api/ready mirrors /ready readiness semantics', async () => {
    const res = await fetch(`${baseUrl}/api/ready`);
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      expect(res.status).toBe(200);
    } else {
      expect(res.status).toBe(503);
    }
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
