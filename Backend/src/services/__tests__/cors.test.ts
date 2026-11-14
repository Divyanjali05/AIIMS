import { describe, it, expect } from 'vitest';
import cors from 'cors';
import { resolveAllowedOrigins, config } from '../../config/env';
import { corsOptions } from '../../server';
import { Request, Response } from 'express';

describe('CORS Origin Allowlist & Preflight Controls', () => {
  describe('1. resolveAllowedOrigins Configuration', () => {
    it('includes http://192.168.0.68:3000 in development default origins', () => {
      const origins = resolveAllowedOrigins({ NODE_ENV: 'development' });
      expect(origins).toContain('http://192.168.0.68:3000');
      expect(origins).toContain('http://192.168.0.68:5173');
      expect(origins).toContain('http://192.168.0.68:5001');
    });

    it('preserves all existing localhost, loopback, and LAN development origins', () => {
      const origins = resolveAllowedOrigins({ NODE_ENV: 'development' });
      const requiredExisting = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://localhost',
        'http://localhost',
        'capacitor://localhost',
        'http://192.168.1.5:3000',
        'http://192.168.1.5:5173',
        'http://192.168.1.5:5001',
      ];
      for (const origin of requiredExisting) {
        expect(origins).toContain(origin);
      }
    });

    it('merges development defaults with any explicitly defined ALLOWED_ORIGINS', () => {
      const origins = resolveAllowedOrigins({
        NODE_ENV: 'development',
        ALLOWED_ORIGINS: 'https://staging.aiims.education, http://192.168.0.68:3000',
      });
      expect(origins).toContain('http://192.168.0.68:3000');
      expect(origins).toContain('https://staging.aiims.education');
      expect(origins).toContain('http://localhost:3000');
    });

    it('filters out wildcard * from origins list', () => {
      const origins = resolveAllowedOrigins({
        NODE_ENV: 'development',
        ALLOWED_ORIGINS: 'http://localhost:3000, *',
      });
      expect(origins).not.toContain('*');
    });

    it('keeps strict production isolation without injecting dev/LAN origins', () => {
      const prodOrigins = resolveAllowedOrigins({
        NODE_ENV: 'production',
        ALLOWED_ORIGINS: 'https://aiims.education,https://app.aiims.education',
      });
      expect(prodOrigins).toEqual(['https://aiims.education', 'https://app.aiims.education']);
      expect(prodOrigins).not.toContain('http://192.168.0.68:3000');
      expect(prodOrigins).not.toContain('http://localhost:3000');
    });

    it('returns empty array in production if ALLOWED_ORIGINS is missing', () => {
      const prodOrigins = resolveAllowedOrigins({
        NODE_ENV: 'production',
      });
      expect(prodOrigins).toEqual([]);
    });

    it('exposes the new origin in active backend config', () => {
      expect(config.allowedOrigins).toContain('http://192.168.0.68:3000');
    });
  });

  describe('2. CORS Middleware & Preflight Evaluation', () => {
    function createMockRes() {
      const headers: Record<string, string> = {};
      const statusCode = 200;
      let ended = false;

      const res: any = {
        statusCode,
        headers,
        setHeader(name: string, val: string) {
          headers[name.toLowerCase()] = String(val);
          return res;
        },
        getHeader(name: string) {
          return headers[name.toLowerCase()];
        },
        status(code: number) {
          res.statusCode = code;
          return res;
        },
        sendStatus(code: number) {
          res.statusCode = code;
          ended = true;
          return res;
        },
        end() {
          ended = true;
          return res;
        },
        isEnded() {
          return ended;
        },
      };
      return res;
    }

    it('allows GET request from http://192.168.0.68:3000 with credentials and without wildcard', async () => {
      const corsMiddleware = cors(corsOptions);
      const req: any = {
        method: 'GET',
        headers: {
          origin: 'http://192.168.0.68:3000',
        },
      };
      const res = createMockRes();

      await new Promise<void>((resolve, reject) => {
        corsMiddleware(req, res, (err?: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      expect(res.getHeader('access-control-allow-origin')).toBe('http://192.168.0.68:3000');
      expect(res.getHeader('access-control-allow-origin')).not.toBe('*');
      expect(res.getHeader('access-control-allow-credentials')).toBe('true');
    });

    it('handles OPTIONS preflight for http://192.168.0.68:3000 with 204 and allowed headers', async () => {
      const corsMiddleware = cors(corsOptions);
      const req: any = {
        method: 'OPTIONS',
        headers: {
          origin: 'http://192.168.0.68:3000',
          'access-control-request-method': 'POST',
          'access-control-request-headers':
            'content-type,authorization,x-device-id,x-device-name,x-platform,x-csrf-token',
        },
      };
      const res = createMockRes();

      await new Promise<void>((resolve) => {
        corsMiddleware(req, res, () => {
          resolve();
        });
        if (res.isEnded()) {
          resolve();
        }
      });

      expect(res.statusCode).toBe(204);
      expect(res.getHeader('access-control-allow-origin')).toBe('http://192.168.0.68:3000');
      expect(res.getHeader('access-control-allow-credentials')).toBe('true');
      expect(res.getHeader('access-control-allow-methods')).toContain('POST');
      expect(res.getHeader('access-control-allow-headers')).toBeDefined();
    });

    it('blocks request from untrusted origin with an error', async () => {
      const corsMiddleware = cors(corsOptions);
      const req: any = {
        method: 'GET',
        headers: {
          origin: 'http://192.168.0.99:3000',
        },
      };
      const res = createMockRes();

      const error = await new Promise<any>((resolve) => {
        corsMiddleware(req, res, (err?: any) => {
          resolve(err);
        });
      });

      expect(error).toBeDefined();
      expect(error.message).toContain(
        'CORS blocked: Origin http://192.168.0.99:3000 is not allowed'
      );
    });

    it('blocks request from external untrusted attacker origin', async () => {
      const corsMiddleware = cors(corsOptions);
      const req: any = {
        method: 'POST',
        headers: {
          origin: 'https://malicious-attacker-domain.com',
        },
      };
      const res = createMockRes();

      const error = await new Promise<any>((resolve) => {
        corsMiddleware(req, res, (err?: any) => {
          resolve(err);
        });
      });

      expect(error).toBeDefined();
      expect(error.message).toContain(
        'CORS blocked: Origin https://malicious-attacker-domain.com is not allowed'
      );
    });

    it('allows requests with no origin (e.g. mobile apps, same-origin, curl)', async () => {
      const corsMiddleware = cors(corsOptions);
      const req: any = {
        method: 'GET',
        headers: {},
      };
      const res = createMockRes();

      await new Promise<void>((resolve, reject) => {
        corsMiddleware(req, res, (err?: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      expect(res.getHeader('access-control-allow-origin')).toBeUndefined();
    });
  });
});
