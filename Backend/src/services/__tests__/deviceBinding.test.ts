import { describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { hashDeviceId, extractDeviceInfo } from '../../utils/deviceIdentifier';
import { sessionService } from '../../models/Session.model';
import { memoryDeviceResetAudits } from '../../models/DeviceResetAudit.model';
import { registeredUsers } from '../../models/userStore';
import {
  login,
  logout,
  resetUserDevice,
  generateAuthToken,
} from '../../controllers/auth.controller';
import {
  authenticateStudent,
  requireAuth,
  AuthenticatedRequest,
} from '../../middleware/auth.middleware';
import { Request, Response } from 'express';

function createMockReq(overrides: Partial<Request> = {}): Request {
  const req: any = {
    headers: {},
    body: {},
    cookies: {},
    method: 'GET',
    ...overrides,
  };
  return req as Request;
}

function createMockRes() {
  const mock: any = {
    statusCode: 200,
    data: null,
    cookiesCleared: {},
    cookiesSet: {},
    status(code: number) {
      mock.statusCode = code;
      return mock;
    },
    json(body: any) {
      mock.data = body;
      return mock;
    },
    cookie(name: string, val: any, opts: any) {
      mock.cookiesSet[name] = { val, opts };
      return mock;
    },
    clearCookie(name: string, opts: any) {
      mock.cookiesCleared[name] = opts;
      return mock;
    },
  };
  mock.res = mock;
  return mock;
}

describe('AIIMS One Account, One Device & Session Security (Prompt 3)', () => {
  const testPassword = 'Password123!';
  const hashedPassword = bcrypt.hashSync(testPassword, 10);
  const userEmail = 'device.test.user@example.com';
  const adminEmail = 'device.admin@example.com';

  const deviceA = 'device_laptop_uuid_alpha_1111';
  const deviceB = 'device_mobile_uuid_beta_2222';

  let testUser: any;
  let adminUser: any;

  beforeEach(() => {
    sessionService.clearMemoryStore();
    memoryDeviceResetAudits.length = 0;

    testUser = {
      _id: 'usr-dev-test-100',
      id: 'usr-dev-test-100',
      name: 'Device Test Learner',
      email: userEmail,
      role: 'learner',
      password: hashedPassword,
      college: 'Tech University',
      isActive: true,
      deviceBinding: {
        deviceIdHash: '',
        deviceName: '',
        platform: 'web',
        boundAt: null,
        lastSeenAt: null,
        activeSessionId: null,
        bindingStatus: 'UNBOUND',
      },
    };
    registeredUsers[userEmail] = testUser;

    adminUser = {
      _id: 'usr-dev-admin-200',
      id: 'usr-dev-admin-200',
      name: 'Device Test Admin',
      email: adminEmail,
      role: 'admin',
      password: hashedPassword,
      isActive: true,
    };
    registeredUsers[adminEmail] = adminUser;
  });

  it('Scenario 1: Binds account to first device on successful login', async () => {
    const req = createMockReq({
      headers: { 'x-device-id': deviceA, 'x-device-name': 'MacBook Pro', 'x-platform': 'web' },
      body: { email: userEmail, password: testPassword },
    });
    const mockRes = createMockRes();
    await login(req, mockRes.res);

    expect(mockRes.statusCode).toBe(200);
    expect(testUser.deviceBinding.bindingStatus).toBe('BOUND');
    expect(testUser.deviceBinding.deviceIdHash).toBe(hashDeviceId(deviceA));
    expect(testUser.deviceBinding.activeSessionId).toBeDefined();
  });

  it('Scenario 2: Device ID is hashed with SHA-256 and never stored in plaintext', () => {
    const hash = hashDeviceId(deviceA);
    expect(hash).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
    expect(hash).not.toContain(deviceA);
  });

  it('Scenario 3: Rejects login from another device when an active session exists with exact message', async () => {
    // First login binds deviceA
    const req1 = createMockReq({
      headers: { 'x-device-id': deviceA, 'x-device-name': 'MacBook Pro', 'x-platform': 'web' },
      body: { email: userEmail, password: testPassword },
    });
    const mockRes1 = createMockRes();
    await login(req1, mockRes1.res);

    // Device B attempt while Device A is active
    const req2 = createMockReq({
      headers: {
        'x-device-id': deviceB,
        'x-device-name': 'Android Phone',
        'x-platform': 'android',
      },
      body: { email: userEmail, password: testPassword },
    });
    const mockRes2 = createMockRes();
    await login(req2, mockRes2.res);

    expect(mockRes2.statusCode).toBe(403);
    expect(mockRes2.data.error).toBe('Account is active on another device.');
    expect(mockRes2.data.code).toBe('ACCOUNT_ACTIVE_ANOTHER_DEVICE');
  });

  it('Scenario 4: Device A session is not logged out when Device B attempt is rejected', async () => {
    const req1 = createMockReq({
      headers: { 'x-device-id': deviceA },
      body: { email: userEmail, password: testPassword },
    });
    const mockRes1 = createMockRes();
    await login(req1, mockRes1.res);

    const activeSessionId = testUser.deviceBinding.activeSessionId;

    // Rejected device B attempt
    const req2 = createMockReq({
      headers: { 'x-device-id': deviceB },
      body: { email: userEmail, password: testPassword },
    });
    const mockRes2 = createMockRes();
    await login(req2, mockRes2.res);

    const session = await sessionService.getSession(activeSessionId);
    expect(session?.status).toBe('ACTIVE');
  });

  it('Scenario 5: Logout releases active session while retaining device binding', async () => {
    const req1 = createMockReq({
      headers: { 'x-device-id': deviceA },
      body: { email: userEmail, password: testPassword },
    });
    const mockRes1 = createMockRes();
    await login(req1, mockRes1.res);

    const activeSessionId = testUser.deviceBinding.activeSessionId;
    const token = generateAuthToken(
      testUser.id,
      testUser.email,
      testUser.role,
      activeSessionId,
      hashDeviceId(deviceA)
    );

    // Logout
    const logoutReq: any = createMockReq({
      headers: { authorization: `Bearer ${token}` },
    });
    const logoutRes = createMockRes();
    await authenticateStudent(logoutReq, logoutRes.res, async () => {
      await logout(logoutReq, logoutRes.res);
    });

    const session = await sessionService.getSession(activeSessionId);
    expect(session?.status).toBe('REVOKED');
    expect(testUser.deviceBinding.activeSessionId).toBeNull();
    expect(testUser.deviceBinding.bindingStatus).toBe('BOUND');
    expect(testUser.deviceBinding.deviceIdHash).toBe(hashDeviceId(deviceA));
  });

  it('Scenario 6: Different device cannot log in after logout without admin reset', async () => {
    // First login on Device A
    const req1 = createMockReq({
      headers: { 'x-device-id': deviceA },
      body: { email: userEmail, password: testPassword },
    });
    await login(req1, createMockRes().res);

    // Logout on Device A
    const token = generateAuthToken(
      testUser.id,
      testUser.email,
      testUser.role,
      testUser.deviceBinding.activeSessionId,
      hashDeviceId(deviceA)
    );
    const logoutReq: any = createMockReq({ headers: { authorization: `Bearer ${token}` } });
    await authenticateStudent(logoutReq, createMockRes().res, async () => {
      await logout(logoutReq, createMockRes().res);
    });

    // Device B attempt after logout
    const req2 = createMockReq({
      headers: { 'x-device-id': deviceB },
      body: { email: userEmail, password: testPassword },
    });
    const mockRes2 = createMockRes();
    await login(req2, mockRes2.res);

    expect(mockRes2.statusCode).toBe(403);
    expect(mockRes2.data.error).toBe(
      'This account is registered to another device. Contact support for a device reset.'
    );
    expect(mockRes2.data.code).toBe('DEVICE_BOUND_ANOTHER_DEVICE');
  });

  it('Scenario 7: Same device can log in again after logout', async () => {
    // First login
    const req1 = createMockReq({
      headers: { 'x-device-id': deviceA },
      body: { email: userEmail, password: testPassword },
    });
    await login(req1, createMockRes().res);

    // Logout
    const token = generateAuthToken(
      testUser.id,
      testUser.email,
      testUser.role,
      testUser.deviceBinding.activeSessionId,
      hashDeviceId(deviceA)
    );
    const logoutReq: any = createMockReq({ headers: { authorization: `Bearer ${token}` } });
    await authenticateStudent(logoutReq, createMockRes().res, async () => {
      await logout(logoutReq, createMockRes().res);
    });

    // Re-login on Device A
    const reLoginReq = createMockReq({
      headers: { 'x-device-id': deviceA },
      body: { email: userEmail, password: testPassword },
    });
    const reLoginRes = createMockRes();
    await login(reLoginReq, reLoginRes.res);

    expect(reLoginRes.statusCode).toBe(200);
    expect(testUser.deviceBinding.activeSessionId).toBeDefined();
    const newSession = await sessionService.getSession(testUser.deviceBinding.activeSessionId);
    expect(newSession?.status).toBe('ACTIVE');
  });

  it('Scenario 8: Non-admin cannot reset device binding', async () => {
    const req: any = createMockReq({ params: { userId: testUser.id } });
    req.user = testUser; // Student role

    const mockRes = createMockRes();
    await resetUserDevice(req, mockRes.res);

    expect(mockRes.statusCode).toBe(403);
    expect(mockRes.data.code).toBe('ADMIN_REQUIRED');
  });

  it('Scenario 9: Admin reset unbinds device, revokes sessions, and logs audit', async () => {
    // Bind Device A
    const req1 = createMockReq({
      headers: { 'x-device-id': deviceA },
      body: { email: userEmail, password: testPassword },
    });
    await login(req1, createMockRes().res);
    const activeSessionId = testUser.deviceBinding.activeSessionId;

    // Admin reset
    const resetReq: any = createMockReq({
      params: { userId: testUser.id },
      body: { reason: 'User device replacement' },
    });
    resetReq.user = adminUser;
    const resetRes = createMockRes();
    await resetUserDevice(resetReq, resetRes.res);

    expect(resetRes.statusCode).toBe(200);
    expect(testUser.deviceBinding.bindingStatus).toBe('UNBOUND');
    expect(testUser.deviceBinding.deviceIdHash).toBe('');

    const session = await sessionService.getSession(activeSessionId);
    expect(session?.status).toBe('REVOKED');

    const audit = memoryDeviceResetAudits.find((a) => a.targetUserId === testUser.id);
    expect(audit).toBeDefined();
    expect(audit?.adminUserId).toBe(adminUser.id);
    expect(audit?.previousDeviceIdHash).toBe(hashDeviceId(deviceA));
  });

  it('Scenario 10: Revoked session token is rejected by auth middleware with 401', async () => {
    const revokedSessionId = 'sess-revoked-uuid';
    await sessionService.createSession({
      sessionId: revokedSessionId,
      userId: testUser.id,
      deviceIdHash: hashDeviceId(deviceA),
      deviceName: 'Device A',
      platform: 'web',
      expiresAt: new Date(Date.now() + 100000),
    });
    await sessionService.revokeSession(revokedSessionId);

    const token = generateAuthToken(
      testUser.id,
      testUser.email,
      testUser.role,
      revokedSessionId,
      hashDeviceId(deviceA)
    );
    const req: any = createMockReq({ headers: { authorization: `Bearer ${token}` } });
    const mockRes = createMockRes();

    await authenticateStudent(req, mockRes.res, () => {
      requireAuth(req, mockRes.res, () => {});
    });

    expect(mockRes.statusCode).toBe(401);
    expect(['SESSION_REVOKED', 'UNAUTHORIZED']).toContain(mockRes.data.code);
  });
});
