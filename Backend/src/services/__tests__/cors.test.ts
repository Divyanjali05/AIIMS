import { describe, it, expect } from 'vitest';
import cors from 'cors';
import { resolveAllowedOrigins, config } from '../../config/env';
import { isAllowedOrigin, isPrivateOrLoopbackIPv4, corsOptions } from '../../config/cors';
import { Request, Response } from 'express';

describe('CORS Origin Allowlist, Private LAN Dynamic Resolution & Preflight Controls', () => {
  describe('1. resolveAllowedOrigins Configuration', () => {
    it('includes standard localhost, loopback, and dev defaults', () => {
      const origins = resolveAllowedOrigins({ NODE_ENV: 'development' });
      expect(origins).toContain('http://localhost:3000');
      expect(origins).toContain('http://127.0.0.1:3000');
      expect(origins).toContain('http://localhost:5173');
      expect(origins).toContain('http://127.0.0.1:5173');
      expect(origins).toContain('capacitor://localhost');
    });

    it('preserves existing legacy LAN reference entries in dev defaults for backward compatibility', () => {
      const origins = resolveAllowedOrigins({ NODE_ENV: 'development' });
      expect(origins).toContain('http://192.168.0.68:3000');
      expect(origins).toContain('http://192.168.1.5:3000');
    });

    it('merges development defaults with any explicitly defined ALLOWED_ORIGINS', () => {
      const origins = resolveAllowedOrigins({
        NODE_ENV: 'development',
        ALLOWED_ORIGINS: 'https://staging.aiims.education, http://192.168.1.83:3000',
      });
      expect(origins).toContain('http://192.168.1.83:3000');
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
      expect(prodOrigins).not.toContain('http://192.168.1.83:3000');
      expect(prodOrigins).not.toContain('http://localhost:3000');
    });

    it('returns empty array in production if ALLOWED_ORIGINS is missing', () => {
      const prodOrigins = resolveAllowedOrigins({
        NODE_ENV: 'production',
      });
      expect(prodOrigins).toEqual([]);
    });
  });

  describe('2. isPrivateOrLoopbackIPv4 RFC 1918 Evaluation', () => {
    it('accepts current observed user LAN IP (192.168.1.83)', () => {
      expect(isPrivateOrLoopbackIPv4('192.168.1.83')).toBe(true);
    });

    it('accepts 192.168.0.0/16 private subnet addresses', () => {
      expect(isPrivateOrLoopbackIPv4('192.168.0.1')).toBe(true);
      expect(isPrivateOrLoopbackIPv4('192.168.0.68')).toBe(true);
      expect(isPrivateOrLoopbackIPv4('192.168.254.254')).toBe(true);
    });

    it('accepts 10.0.0.0/8 private subnet addresses', () => {
      expect(isPrivateOrLoopbackIPv4('10.0.2.2')).toBe(true); // Android Emulator bridge
      expect(isPrivateOrLoopbackIPv4('10.0.0.1')).toBe(true);
      expect(isPrivateOrLoopbackIPv4('10.255.255.255')).toBe(true);
    });

    it('accepts 172.16.0.0/12 private subnet addresses', () => {
      expect(isPrivateOrLoopbackIPv4('172.16.0.1')).toBe(true);
      expect(isPrivateOrLoopbackIPv4('172.20.10.4')).toBe(true); // iPhone personal hotspot
      expect(isPrivateOrLoopbackIPv4('172.31.255.254')).toBe(true);
    });

    it('accepts 127.0.0.0/8 loopback addresses', () => {
      expect(isPrivateOrLoopbackIPv4('127.0.0.1')).toBe(true);
      expect(isPrivateOrLoopbackIPv4('127.0.0.2')).toBe(true);
    });

    it('rejects public internet IPs', () => {
      expect(isPrivateOrLoopbackIPv4('8.8.8.8')).toBe(false); // Google DNS
      expect(isPrivateOrLoopbackIPv4('1.1.1.1')).toBe(false); // Cloudflare DNS
      expect(isPrivateOrLoopbackIPv4('203.0.113.195')).toBe(false); // Documentation IP
      expect(isPrivateOrLoopbackIPv4('192.169.1.1')).toBe(false); // Outside 192.168.0.0/16
      expect(isPrivateOrLoopbackIPv4('172.32.1.1')).toBe(false); // Outside 172.16-31.0.0/12
    });

    it('rejects non-IP strings, domain names, and malformed octets', () => {
      expect(isPrivateOrLoopbackIPv4('malicious.com')).toBe(false);
      expect(isPrivateOrLoopbackIPv4('192.168.1.999')).toBe(false); // octet > 255
      expect(isPrivateOrLoopbackIPv4('192.168.01.1')).toBe(false); // leading zero forbidden
      expect(isPrivateOrLoopbackIPv4('192.168.1')).toBe(false); // only 3 octets
      expect(isPrivateOrLoopbackIPv4('192.168.1.1.1')).toBe(false); // 5 octets
    });
  });

  describe('3. isAllowedOrigin Dynamic Evaluation', () => {
    it('allows requests with missing, null, or undefined Origin (native mobile apps, curl, same-origin)', () => {
      expect(isAllowedOrigin(undefined, 'development')).toBe(true);
      expect(isAllowedOrigin(null, 'development')).toBe(true);
      expect(isAllowedOrigin('', 'development')).toBe(true);
      expect(isAllowedOrigin(undefined, 'production')).toBe(true);
    });

    it('allows current observed user LAN URL http://192.168.1.83:3000 in development', () => {
      expect(isAllowedOrigin('http://192.168.1.83:3000', 'development')).toBe(true);
    });

    it('allows dynamic LAN IP changes in development without code changes', () => {
      expect(isAllowedOrigin('http://192.168.1.42:3000', 'development')).toBe(true);
      expect(isAllowedOrigin('http://192.168.0.150:5173', 'development')).toBe(true);
      expect(isAllowedOrigin('http://10.0.2.2:5001', 'development')).toBe(true);
      expect(isAllowedOrigin('http://172.20.10.4:3000', 'development')).toBe(true);
    });

    it('allows localhost and loopback development origins', () => {
      expect(isAllowedOrigin('http://localhost:3000', 'development')).toBe(true);
      expect(isAllowedOrigin('http://127.0.0.1:3000', 'development')).toBe(true);
      expect(isAllowedOrigin('http://localhost:5173', 'development')).toBe(true);
      expect(isAllowedOrigin('capacitor://localhost', 'development')).toBe(true);
    });

    it('allows explicitly configured origins from allowlist', () => {
      const explicit = ['https://staging.aiims.education', 'https://portal.aiims.education'];
      expect(isAllowedOrigin('https://staging.aiims.education', 'development', explicit)).toBe(
        true
      );
      expect(isAllowedOrigin('https://staging.aiims.education', 'production', explicit)).toBe(true);
    });

    it('rejects untrusted external domains in development', () => {
      expect(isAllowedOrigin('https://malicious-attacker-domain.com', 'development')).toBe(false);
      expect(isAllowedOrigin('http://evil.com', 'development')).toBe(false);
      expect(isAllowedOrigin('https://attacker.org:3000', 'development')).toBe(false);
    });

    it('rejects public external IPs in development', () => {
      expect(isAllowedOrigin('http://8.8.8.8:3000', 'development')).toBe(false);
      expect(isAllowedOrigin('http://1.1.1.1:5001', 'development')).toBe(false);
      expect(isAllowedOrigin('http://203.0.113.1:3000', 'development')).toBe(false);
    });

    it('rejects malformed origins in development', () => {
      expect(isAllowedOrigin('not-a-valid-url', 'development')).toBe(false);
      expect(isAllowedOrigin('javascript:alert(1)', 'development')).toBe(false);
      expect(isAllowedOrigin('http://192.168.1.999:3000', 'development')).toBe(false);
      expect(isAllowedOrigin('http://192.168.1.83:99999', 'development')).toBe(false); // invalid port
    });

    it('strictly isolates production: rejects unlisted LAN origins in production', () => {
      const explicitProd = ['https://aiims.education'];
      expect(isAllowedOrigin('http://192.168.1.83:3000', 'production', explicitProd)).toBe(false);
      expect(isAllowedOrigin('http://192.168.0.68:3000', 'production', explicitProd)).toBe(false);
      expect(isAllowedOrigin('http://localhost:3000', 'production', explicitProd)).toBe(false);
      expect(isAllowedOrigin('https://aiims.education', 'production', explicitProd)).toBe(true);
    });
  });

  describe('4. CORS Middleware & Preflight Evaluation', () => {
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

    it('allows GET request from http://192.168.1.83:3000 with credentials and specific origin', async () => {
      const corsMiddleware = cors(corsOptions);
      const req: any = {
        method: 'GET',
        headers: {
          origin: 'http://192.168.1.83:3000',
        },
      };
      const res = createMockRes();

      await new Promise<void>((resolve, reject) => {
        corsMiddleware(req, res, (err?: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      expect(res.getHeader('access-control-allow-origin')).toBe('http://192.168.1.83:3000');
      expect(res.getHeader('access-control-allow-origin')).not.toBe('*');
      expect(res.getHeader('access-control-allow-credentials')).toBe('true');
    });

    it('handles OPTIONS preflight for http://192.168.1.83:3000 with 204 and allowed headers', async () => {
      const corsMiddleware = cors(corsOptions);
      const req: any = {
        method: 'OPTIONS',
        headers: {
          origin: 'http://192.168.1.83:3000',
          'access-control-request-method': 'POST',
          'access-control-request-headers':
            'content-type,authorization,x-device-id,x-device-name,x-platform,x-csrf-token,x-request-id',
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
      expect(res.getHeader('access-control-allow-origin')).toBe('http://192.168.1.83:3000');
      expect(res.getHeader('access-control-allow-credentials')).toBe('true');
      expect(res.getHeader('access-control-allow-methods')).toContain('POST');
      expect(res.getHeader('access-control-allow-headers')).toBeDefined();
    });

    it('blocks request from untrusted external domain with an error', async () => {
      const corsMiddleware = cors(corsOptions);
      const req: any = {
        method: 'GET',
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

    it('blocks request from external public IP with an error', async () => {
      const corsMiddleware = cors(corsOptions);
      const req: any = {
        method: 'POST',
        headers: {
          origin: 'http://8.8.8.8:3000',
        },
      };
      const res = createMockRes();

      const error = await new Promise<any>((resolve) => {
        corsMiddleware(req, res, (err?: any) => {
          resolve(err);
        });
      });

      expect(error).toBeDefined();
      expect(error.message).toContain('CORS blocked: Origin http://8.8.8.8:3000 is not allowed');
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
