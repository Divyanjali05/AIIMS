/**
 * security.test.ts
 * =========================================================
 * AIIMS Security Test Suite
 *
 * Verifies:
 *  1. Forged or expired token rejected (HTTP 401)
 *  2. Learner blocked from evaluator/admin routes (HTTP 403)
 *  3. CORS blocks unknown origins (HTTP 403)
 *  4. Cookie-authenticated state-changing requests with bad Origin rejected (HTTP 403 CSRF)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import { app } from '../../server';
import { config } from '../../config/env';
import { registeredUsers } from '../../models/userStore';

let server: http.Server;
let baseUrl: string;

// Helpers to make requests
async function makeRequest(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Promise<{ status: number; headers: Headers; body: any }> {
  const method = options.method || 'GET';
  const reqHeaders: Record<string, string> = { ...(options.headers || {}) };
  let reqBody: string | undefined;

  if (options.body) {
    reqHeaders['Content-Type'] = 'application/json';
    reqBody = JSON.stringify(options.body);
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: reqHeaders,
    body: reqBody,
  });

  let parsed: any;
  const rawText = await res.text();
  try {
    parsed = JSON.parse(rawText);
  } catch {
    parsed = rawText;
  }

  return {
    status: res.status,
    headers: res.headers,
    body: parsed,
  };
}

// Generate test token
function generateToken(
  payload: { userId: string; email: string; role?: string },
  options: jwt.SignOptions = {}
): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '1h',
    ...options,
  });
}

beforeAll(async () => {
  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;

  // Seed a test learner user in memory
  registeredUsers['security.learner@example.com'] = {
    _id: '65d000000000000000000099',
    id: '65d000000000000000000099',
    email: 'security.learner@example.com',
    name: 'Security Test Learner',
    passwordHash: 'dummy-hash',
    role: 'learner',
    aiimsCredits: 500,
    xpPoints: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any;
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  delete registeredUsers['security.learner@example.com'];
});

describe('AIIMS Security Test Suite', () => {
  describe('1. Token Integrity & Expiration Verification', () => {
    it('1A: Completely forged token string is rejected with HTTP 401', async () => {
      const res = await makeRequest('/api/users/profile', {
        headers: {
          Authorization: 'Bearer forged.invalid.token-payload-garbage',
        },
      });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('1B: Token signed with wrong secret key is rejected with HTTP 401', async () => {
      const wrongSecretToken = jwt.sign(
        { userId: 'fake-user-id', email: 'security.learner@example.com' },
        'wrong-secret-key-that-does-not-match-aiims-jwt-secret-at-all'
      );
      const res = await makeRequest('/api/users/profile', {
        headers: {
          Authorization: `Bearer ${wrongSecretToken}`,
        },
      });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('1C: Expired token is rejected with HTTP 401', async () => {
      const expiredToken = generateToken(
        { userId: '65d000000000000000000099', email: 'security.learner@example.com' },
        { expiresIn: -10 } // Expired 10 seconds ago
      );
      const res = await makeRequest('/api/users/profile', {
        headers: {
          Authorization: `Bearer ${expiredToken}`,
        },
      });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('1D: Unauthenticated request to protected endpoint is rejected with HTTP 401', async () => {
      const res = await makeRequest('/api/users/profile');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('2. Role-Based Access Control: Learner Blocked from Staff Routes', () => {
    let learnerToken: string;

    beforeAll(() => {
      learnerToken = generateToken({
        userId: '65d000000000000000000099',
        email: 'security.learner@example.com',
        role: 'learner',
      });
    });

    it('2A: Learner calling GET /api/evaluator/queue is blocked with HTTP 403', async () => {
      const res = await makeRequest('/api/evaluator/queue', {
        headers: {
          Authorization: `Bearer ${learnerToken}`,
        },
      });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('2B: Learner calling POST /api/evaluator/submissions/:id/claim is blocked with HTTP 403', async () => {
      const res = await makeRequest('/api/evaluator/submissions/sub-dummy-id/claim', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${learnerToken}`,
        },
      });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('2C: Learner calling POST /api/evaluator/submissions/:id/review is blocked with HTTP 403', async () => {
      const res = await makeRequest('/api/evaluator/submissions/sub-dummy-id/review', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${learnerToken}`,
        },
        body: {
          scores: { accuracy: 4, critical_thinking: 4, clarity: 4, ai_application: 4 },
          feedback: 'Valid feedback text',
          decision: 'accepted',
        },
      });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('2D: Learner calling GET /api/admin/evaluators is blocked with HTTP 403', async () => {
      const res = await makeRequest('/api/admin/evaluators', {
        headers: {
          Authorization: `Bearer ${learnerToken}`,
        },
      });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('2E: Learner calling POST /api/admin/evaluators is blocked with HTTP 403', async () => {
      const res = await makeRequest('/api/admin/evaluators', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${learnerToken}`,
        },
        body: {
          email: 'new.eval@example.com',
          name: 'New Evaluator',
        },
      });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('2F: Learner calling GET /api/admin/audit-logs is blocked with HTTP 403', async () => {
      const res = await makeRequest('/api/admin/audit-logs', {
        headers: {
          Authorization: `Bearer ${learnerToken}`,
        },
      });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('2G: Learner calling GET /api/admin/reports/summary is blocked with HTTP 403', async () => {
      const res = await makeRequest('/api/admin/reports/summary', {
        headers: {
          Authorization: `Bearer ${learnerToken}`,
        },
      });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });
  });

  describe('3. CORS Origin Filtering Controls', () => {
    it('3A: Request with unauthorized Origin is blocked with HTTP 403 and CORS_FORBIDDEN', async () => {
      const res = await makeRequest('/api/health', {
        headers: {
          Origin: 'https://evil-unauthorized-attacker.com',
        },
      });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CORS_FORBIDDEN');
    });

    it('3B: Request with allowed Origin succeeds with HTTP 200 and matches Origin header', async () => {
      const allowedOrigin = 'http://localhost:3000';
      const res = await makeRequest('/api/health', {
        headers: {
          Origin: allowedOrigin,
        },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('access-control-allow-origin')).toBe(allowedOrigin);
      expect(res.headers.get('access-control-allow-credentials')).toBe('true');
    });

    it('3C: Preflight OPTIONS request from allowed Origin returns HTTP 204', async () => {
      const res = await makeRequest('/api/health', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
        },
      });
      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
    });
  });

  describe('4. Cookie-Authenticated State-Changing CSRF Origin Protection', () => {
    let validCookieToken: string;

    beforeAll(() => {
      validCookieToken = generateToken({
        userId: '65d000000000000000000099',
        email: 'security.learner@example.com',
        role: 'learner',
      });
    });

    it('4A: Cookie-authenticated state-changing POST with disallowed Origin is rejected with HTTP 403', async () => {
      const res = await makeRequest('/api/submissions', {
        method: 'POST',
        headers: {
          Cookie: `aiims_token=${validCookieToken}`,
          Origin: 'https://malicious-cross-origin.com',
        },
        body: {
          taskId: 'task-prompt-1',
          answerContent: 'Malicious payload',
        },
      });
      expect(res.status).toBe(403);
      expect(['CORS_FORBIDDEN', 'CSRF_FORBIDDEN']).toContain(res.body.code);
    });

    it('4B: Cookie-authenticated state-changing POST with missing Origin and Referer is rejected with HTTP 403', async () => {
      const res = await makeRequest('/api/submissions', {
        method: 'POST',
        headers: {
          Cookie: `aiims_token=${validCookieToken}`,
        },
        body: {
          taskId: 'task-prompt-1',
          answerContent: 'Missing origin payload',
        },
      });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CSRF_FORBIDDEN');
    });

    it('4C: Cookie-authenticated state-changing POST with allowed Origin passes CSRF guard', async () => {
      const res = await makeRequest('/api/submissions', {
        method: 'POST',
        headers: {
          Cookie: `aiims_token=${validCookieToken}`,
          Origin: 'http://localhost:3000',
        },
        body: {
          taskId: 'task-prompt-1',
          answerContent:
            'A comprehensive, well-structured prompt designed to test AI safety and output consistency.',
        },
      });
      // Should not be rejected by CSRF guard (status is 201 Created or 200 OK)
      expect(res.status).toBe(201);
      expect(res.body.code).not.toBe('CSRF_FORBIDDEN');
    });
  });
});
