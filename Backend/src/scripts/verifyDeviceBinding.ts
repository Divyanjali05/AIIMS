/**
 * Comprehensive One Account, One Device & Session Security Verification Script
 * Covers all 23 scenarios required by Prompt 3/12.
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { config } from '../config/env';
import { User, IUser } from '../models/User.model';
import { sessionService } from '../models/Session.model';
import { recordDeviceResetAudit, memoryDeviceResetAudits } from '../models/DeviceResetAudit.model';
import { registeredUsers } from '../models/userStore';
import { hashDeviceId, extractDeviceInfo } from '../utils/deviceIdentifier';
import { login, logout, resetUserDevice, generateAuthToken } from '../controllers/auth.controller';
import {
  authenticateStudent,
  requireAuth,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';

interface TestResult {
  id: number;
  name: string;
  category: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function recordTest(id: number, name: string, category: string, passed: boolean, details: string) {
  results.push({ id, name, category, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${status}] Test ${id.toString().padStart(2, '0')}: ${name}`);
  if (!passed) {
    console.error(`   Details: ${details}`);
  }
}

// Mock Express Request & Response helpers
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

interface MockResponseContext {
  res: Response;
  statusCode: number;
  data: any;
  cookiesCleared: Record<string, any>;
  cookiesSet: Record<string, any>;
}

function createMockRes(): MockResponseContext {
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
  return mock as MockResponseContext;
}

async function runDeviceBindingSuite() {
  console.log('================================================================');
  console.log(' AIIMS Prompt 3: One Account – One Device Verification Suite');
  console.log('================================================================\n');

  // Clear stores
  sessionService.clearMemoryStore();
  memoryDeviceResetAudits.length = 0;

  const testPassword = 'Password123!';
  const hashedPassword = bcrypt.hashSync(testPassword, 10);

  // Setup Test Users
  const user1Email = 'test.student@example.com';
  const user1: any = {
    _id: 'usr-dev-001',
    id: 'usr-dev-001',
    name: 'Test Student',
    email: user1Email,
    role: 'learner',
    password: hashedPassword,
    college: 'Engineering College',
    targetGoal: 'AI Mastery',
    stage: 'Knowing',
    xpPoints: 100,
    aiimsCredits: 50,
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
  registeredUsers[user1Email] = user1;

  const adminEmail = 'admin.security@example.com';
  const adminUser: any = {
    _id: 'usr-admin-999',
    id: 'usr-admin-999',
    name: 'Admin Security',
    email: adminEmail,
    role: 'admin',
    password: hashedPassword,
    isActive: true,
  };
  registeredUsers[adminEmail] = adminUser;

  // Device IDs
  const deviceA_Id = 'device_laptop_macbook_pro_uuid_1111';
  const deviceB_Id = 'device_phone_android_samsung_uuid_2222';
  const deviceC_Id = 'device_tablet_ipad_air_uuid_3333';

  const deviceA_Hash = hashDeviceId(deviceA_Id);
  const deviceB_Hash = hashDeviceId(deviceB_Id);

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 1: First Login from Device A Binds Account & Issues Session
  // ───────────────────────────────────────────────────────────────────────────
  {
    const req = createMockReq({
      headers: {
        'x-device-id': deviceA_Id,
        'x-device-name': 'MacBook Pro 16',
        'x-platform': 'web',
      },
      body: { email: user1Email, password: testPassword },
    });
    const mockRes = createMockRes();
    await login(req, mockRes.res);

    const passed =
      mockRes.statusCode === 200 &&
      user1.deviceBinding.bindingStatus === 'BOUND' &&
      user1.deviceBinding.deviceIdHash === deviceA_Hash &&
      Boolean(user1.deviceBinding.activeSessionId);

    recordTest(
      1,
      'First login binds device A & creates active session',
      'Device Binding',
      passed,
      `Status: ${mockRes.statusCode}, bindingStatus: ${user1.deviceBinding?.bindingStatus}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 2: Sensitive Plaintext Device ID Is Never Stored in Database
  // ───────────────────────────────────────────────────────────────────────────
  {
    const hasPlaintext =
      user1.deviceBinding.deviceIdHash === deviceA_Id || JSON.stringify(user1).includes(deviceA_Id);

    const usesSha256 =
      user1.deviceBinding.deviceIdHash.length === 64 &&
      /^[a-f0-9]{64}$/.test(user1.deviceBinding.deviceIdHash);

    const passed = !hasPlaintext && usesSha256;
    recordTest(
      2,
      'Device identifier stored exclusively as SHA-256 hash',
      'Data Privacy',
      passed,
      `Uses 64-char SHA256 hex: ${usesSha256}, Contains plaintext: ${hasPlaintext}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 3: Second Device (Device B) Attempt While Active -> Rejected with Exact Message
  // ───────────────────────────────────────────────────────────────────────────
  let deviceASessionToken = '';
  {
    const activeSessionId = user1.deviceBinding.activeSessionId;
    deviceASessionToken = generateAuthToken(
      user1.id,
      user1.email,
      user1.role,
      activeSessionId,
      deviceA_Hash
    );

    const req = createMockReq({
      headers: {
        'x-device-id': deviceB_Id,
        'x-device-name': 'Samsung Galaxy S24',
        'x-platform': 'android',
      },
      body: { email: user1Email, password: testPassword },
    });
    const mockRes = createMockRes();
    await login(req, mockRes.res);

    const expectedMsg = 'Account is active on another device.';
    const passed =
      mockRes.statusCode === 403 &&
      mockRes.data?.error === expectedMsg &&
      mockRes.data?.code === 'ACCOUNT_ACTIVE_ANOTHER_DEVICE';

    recordTest(
      3,
      'Second device login rejected while active with exact message: "Account is active on another device."',
      'Multi-Device Prevention',
      passed,
      `Status: ${mockRes.statusCode}, error: "${mockRes.data?.error}", code: "${mockRes.data?.code}"`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 4: Existing Active Device (Device A) Session NOT Terminated by Device B Attempt
  // ───────────────────────────────────────────────────────────────────────────
  {
    const session = await sessionService.getSession(user1.deviceBinding.activeSessionId);
    const passed =
      session !== null &&
      session.status === 'ACTIVE' &&
      user1.deviceBinding.activeSessionId !== null;

    recordTest(
      4,
      'Active session on Device A is preserved when Device B is rejected',
      'Session Security',
      passed,
      `Session status: ${session?.status}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 5: Device A Can Continue Performing Authenticated Requests
  // ───────────────────────────────────────────────────────────────────────────
  {
    const req: any = createMockReq({
      headers: { authorization: `Bearer ${deviceASessionToken}` },
    });
    const mockRes = createMockRes();
    let nextCalled = false;
    await authenticateStudent(req, mockRes.res, () => {
      nextCalled = true;
    });

    const passed = nextCalled && req.user?.email === user1Email;
    recordTest(
      5,
      'Device A authenticated request succeeds with active session',
      'Session Validation',
      passed,
      `nextCalled: ${nextCalled}, user: ${req.user?.email}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 6: Logging Out from Device A Revokes Session but Retains Device Binding
  // ───────────────────────────────────────────────────────────────────────────
  const previousSessionId = user1.deviceBinding.activeSessionId;
  {
    const req: any = createMockReq({
      headers: { authorization: `Bearer ${deviceASessionToken}` },
    });
    const mockRes = createMockRes();
    await authenticateStudent(req, mockRes.res, async () => {
      await logout(req, mockRes.res);
    });

    const session = await sessionService.getSession(previousSessionId);
    const passed =
      session?.status === 'REVOKED' &&
      user1.deviceBinding.activeSessionId === null &&
      user1.deviceBinding.deviceIdHash === deviceA_Hash &&
      user1.deviceBinding.bindingStatus === 'BOUND';

    recordTest(
      6,
      'Logout revokes active session while retaining device binding',
      'Logout & Lifecycle',
      passed,
      `Session status: ${session?.status}, bindingStatus: ${user1.deviceBinding.bindingStatus}, activeSession: ${user1.deviceBinding.activeSessionId}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 7: Device B Login Attempt AFTER Device A Logs Out -> Rejected with Support Message
  // ───────────────────────────────────────────────────────────────────────────
  {
    const req = createMockReq({
      headers: {
        'x-device-id': deviceB_Id,
        'x-device-name': 'Samsung Galaxy S24',
        'x-platform': 'android',
      },
      body: { email: user1Email, password: testPassword },
    });
    const mockRes = createMockRes();
    await login(req, mockRes.res);

    const expectedMsg =
      'This account is registered to another device. Contact support for a device reset.';
    const passed =
      mockRes.statusCode === 403 &&
      mockRes.data?.error === expectedMsg &&
      mockRes.data?.code === 'DEVICE_BOUND_ANOTHER_DEVICE';

    recordTest(
      7,
      'Device B login rejected after logout with exact support message',
      'Device Binding Retention',
      passed,
      `Status: ${mockRes.statusCode}, error: "${mockRes.data?.error}", code: "${mockRes.data?.code}"`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 8: Same Device (Device A) Can Successfully Log In Again
  // ───────────────────────────────────────────────────────────────────────────
  let deviceANewSessionId = '';
  {
    const req = createMockReq({
      headers: {
        'x-device-id': deviceA_Id,
        'x-device-name': 'MacBook Pro 16',
        'x-platform': 'web',
      },
      body: { email: user1Email, password: testPassword },
    });
    const mockRes = createMockRes();
    await login(req, mockRes.res);

    deviceANewSessionId = user1.deviceBinding.activeSessionId;
    const session = await sessionService.getSession(deviceANewSessionId);

    const passed =
      mockRes.statusCode === 200 &&
      deviceANewSessionId !== previousSessionId &&
      session?.status === 'ACTIVE';

    recordTest(
      8,
      'Same device A can log in again after logout (issues new active session)',
      'Re-authentication',
      passed,
      `New sessionId: ${deviceANewSessionId}, status: ${session?.status}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 9: Non-Admin Cannot Reset Device Binding
  // ───────────────────────────────────────────────────────────────────────────
  {
    const req: any = createMockReq({
      params: { userId: user1.id },
      body: { reason: 'Unauthorized reset attempt' },
    });
    req.user = user1; // Student role

    const mockRes = createMockRes();
    await resetUserDevice(req, mockRes.res);

    const passed = mockRes.statusCode === 403 && mockRes.data?.code === 'ADMIN_REQUIRED';
    recordTest(
      9,
      'Non-admin user cannot reset device binding (HTTP 403)',
      'Authorization Guard',
      passed,
      `Status: ${mockRes.statusCode}, code: ${mockRes.data?.code}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 10: Admin Can Successfully Reset Device Binding
  // ───────────────────────────────────────────────────────────────────────────
  {
    const req: any = createMockReq({
      params: { userId: user1.id },
      body: { reason: 'Student moved to new corporate device' },
    });
    req.user = adminUser; // Admin role

    const mockRes = createMockRes();
    await resetUserDevice(req, mockRes.res);

    const activeSession = await sessionService.getSession(deviceANewSessionId);
    const passed =
      mockRes.statusCode === 200 &&
      user1.deviceBinding.bindingStatus === 'UNBOUND' &&
      user1.deviceBinding.deviceIdHash === '' &&
      user1.deviceBinding.activeSessionId === null &&
      activeSession?.status === 'REVOKED';

    recordTest(
      10,
      'Administrator resets device binding & revokes existing sessions',
      'Admin Operations',
      passed,
      `Status: ${mockRes.statusCode}, bindingStatus: ${user1.deviceBinding.bindingStatus}, prevSessionRevoked: ${activeSession?.status === 'REVOKED'}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 11: Device Reset Is Recorded in Audit Log
  // ───────────────────────────────────────────────────────────────────────────
  {
    const audit = memoryDeviceResetAudits.find((a) => a.targetUserId === user1.id);
    const passed =
      Boolean(audit) &&
      audit?.adminUserId === adminUser.id &&
      audit?.previousDeviceIdHash === deviceA_Hash &&
      audit?.reason === 'Student moved to new corporate device';

    recordTest(
      11,
      'Device reset recorded authoritatively in DeviceResetAudit log',
      'Audit & Compliance',
      passed,
      `Audit entry: ${JSON.stringify(audit)}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 12: Device B Can Now Successfully Bind & Log In After Admin Reset
  // ───────────────────────────────────────────────────────────────────────────
  let deviceBSessionId = '';
  {
    const req = createMockReq({
      headers: {
        'x-device-id': deviceB_Id,
        'x-device-name': 'Samsung Galaxy S24',
        'x-platform': 'android',
      },
      body: { email: user1Email, password: testPassword },
    });
    const mockRes = createMockRes();
    await login(req, mockRes.res);

    deviceBSessionId = user1.deviceBinding.activeSessionId;
    const passed =
      mockRes.statusCode === 200 &&
      user1.deviceBinding.bindingStatus === 'BOUND' &&
      user1.deviceBinding.deviceIdHash === deviceB_Hash &&
      user1.deviceBinding.platform === 'android';

    recordTest(
      12,
      'New device B can successfully bind and log in following admin reset',
      'Device Migration',
      passed,
      `Bound hash: ${user1.deviceBinding.deviceIdHash}, platform: ${user1.deviceBinding.platform}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 13: Old Device (Device A) Is Now Rejected Following Device B Binding
  // ───────────────────────────────────────────────────────────────────────────
  {
    const req = createMockReq({
      headers: {
        'x-device-id': deviceA_Id,
        'x-device-name': 'MacBook Pro 16',
        'x-platform': 'web',
      },
      body: { email: user1Email, password: testPassword },
    });
    const mockRes = createMockRes();
    await login(req, mockRes.res);

    const passed =
      mockRes.statusCode === 403 && mockRes.data?.code === 'ACCOUNT_ACTIVE_ANOTHER_DEVICE';
    recordTest(
      13,
      'Previous device A is now rejected after device B has become the bound device',
      'One Account Enforcement',
      passed,
      `Status: ${mockRes.statusCode}, code: ${mockRes.data?.code}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 14: Revoked Session Token Is Rejected by Auth Middleware
  // ───────────────────────────────────────────────────────────────────────────
  {
    // Token from previous revoked session on Device A
    const oldToken = generateAuthToken(
      user1.id,
      user1.email,
      user1.role,
      previousSessionId,
      deviceA_Hash
    );

    const req: any = createMockReq({
      headers: { authorization: `Bearer ${oldToken}` },
    });
    const mockRes = createMockRes();

    await authenticateStudent(req, mockRes.res, () => {
      requireAuth(req, mockRes.res, () => {});
    });

    const passed =
      mockRes.statusCode === 401 &&
      (mockRes.data?.code === 'SESSION_REVOKED' || mockRes.data?.code === 'UNAUTHORIZED');
    recordTest(
      14,
      'Revoked session token rejected by auth middleware (HTTP 401)',
      'Token Invalidation',
      passed,
      `Status: ${mockRes.statusCode}, code: ${mockRes.data?.code}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 15: Expired Session Token Is Rejected by Auth Middleware
  // ───────────────────────────────────────────────────────────────────────────
  {
    const expiredSessionId = 'sess_expired_test_uuid';
    await sessionService.createSession({
      sessionId: expiredSessionId,
      userId: user1.id,
      deviceIdHash: deviceB_Hash,
      deviceName: 'Test Expired Device',
      platform: 'web',
      expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
    });

    const expiredToken = generateAuthToken(
      user1.id,
      user1.email,
      user1.role,
      expiredSessionId,
      deviceB_Hash
    );

    const req: any = createMockReq({
      headers: { authorization: `Bearer ${expiredToken}` },
    });
    const mockRes = createMockRes();

    await authenticateStudent(req, mockRes.res, () => {
      requireAuth(req, mockRes.res, () => {});
    });

    const passed =
      mockRes.statusCode === 401 &&
      (mockRes.data?.code === 'SESSION_EXPIRED' ||
        mockRes.data?.code === 'SESSION_REVOKED' ||
        mockRes.data?.code === 'UNAUTHORIZED');
    recordTest(
      15,
      'Expired session token rejected by auth middleware (HTTP 401)',
      'Session Expiration',
      passed,
      `Status: ${mockRes.statusCode}, code: ${mockRes.data?.code}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 16: Mismatched Device Hash in Token Is Rejected (Device Impersonation Guard)
  // ───────────────────────────────────────────────────────────────────────────
  {
    // Valid active session ID, but mismatched device hash
    const fakeDeviceHash = hashDeviceId('attacker_different_hardware_uuid');
    const forgedToken = generateAuthToken(
      user1.id,
      user1.email,
      user1.role,
      deviceBSessionId,
      fakeDeviceHash
    );

    const req: any = createMockReq({
      headers: { authorization: `Bearer ${forgedToken}` },
    });
    const mockRes = createMockRes();

    await authenticateStudent(req, mockRes.res, () => {
      requireAuth(req, mockRes.res, () => {});
    });

    const passed =
      mockRes.statusCode === 401 &&
      (mockRes.data?.code === 'DEVICE_MISMATCH' || mockRes.data?.code === 'UNAUTHORIZED');
    recordTest(
      16,
      'Token with mismatched device hash is rejected (Anti-Spoofing)',
      'Token Validation',
      passed,
      `Status: ${mockRes.statusCode}, code: ${mockRes.data?.code}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 17: Disabled / Inactive Account Rejects Session
  // ───────────────────────────────────────────────────────────────────────────
  {
    user1.isActive = false; // Disable user account
    const activeToken = generateAuthToken(
      user1.id,
      user1.email,
      user1.role,
      deviceBSessionId,
      deviceB_Hash
    );

    const req: any = createMockReq({
      headers: { authorization: `Bearer ${activeToken}` },
    });
    const mockRes = createMockRes();

    await authenticateStudent(req, mockRes.res, () => {
      requireAuth(req, mockRes.res, () => {});
    });

    user1.isActive = true; // Restore active status

    const passed = mockRes.statusCode === 403 && mockRes.data?.code === 'ACCOUNT_DISABLED';
    recordTest(
      17,
      'Disabled account session is immediately terminated (HTTP 403)',
      'Account Security',
      passed,
      `Status: ${mockRes.statusCode}, code: ${mockRes.data?.code}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 18: Premium and Free Accounts Both Enforce 1-Device Rule Identically
  // ───────────────────────────────────────────────────────────────────────────
  {
    const premiumUserEmail = 'premium.entrepreneur@example.com';
    const premiumUser: any = {
      _id: 'usr-prem-888',
      id: 'usr-prem-888',
      name: 'Premium Founder',
      email: premiumUserEmail,
      role: 'learner',
      password: hashedPassword,
      aiimsCredits: 5000,
      tier: 'PREMIUM',
      isActive: true,
      deviceBinding: {
        deviceIdHash: hashDeviceId('founders_macbook_pro_uuid'),
        deviceName: 'Founders MacBook',
        platform: 'web',
        boundAt: new Date(),
        lastSeenAt: new Date(),
        activeSessionId: 'sess_founder_active',
        bindingStatus: 'BOUND',
      },
    };
    registeredUsers[premiumUserEmail] = premiumUser;

    await sessionService.createSession({
      sessionId: 'sess_founder_active',
      userId: premiumUser.id,
      deviceIdHash: premiumUser.deviceBinding.deviceIdHash,
      deviceName: 'Founders MacBook',
      platform: 'web',
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });

    const req = createMockReq({
      headers: {
        'x-device-id': 'different_rogue_device_uuid',
        'x-device-name': 'Rogue Device',
        'x-platform': 'web',
      },
      body: { email: premiumUserEmail, password: testPassword },
    });
    const mockRes = createMockRes();
    await login(req, mockRes.res);

    const passed =
      mockRes.statusCode === 403 && mockRes.data?.code === 'ACCOUNT_ACTIVE_ANOTHER_DEVICE';
    recordTest(
      18,
      'Premium tier accounts enforce strict 1-device policy identically to Free tier',
      'Policy Universality',
      passed,
      `Status: ${mockRes.statusCode}, code: ${mockRes.data?.code}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 19: Web Device Identification Header Extraction & Normalization
  // ───────────────────────────────────────────────────────────────────────────
  {
    const req = createMockReq({
      headers: {
        'x-device-id': 'web_persistent_uuid_12345',
        'x-device-name': 'Chrome on Windows 11',
        'x-platform': 'web',
      },
    });
    const devInfo = extractDeviceInfo(req);

    const passed =
      devInfo.deviceId === 'web_persistent_uuid_12345' &&
      devInfo.deviceName === 'Chrome on Windows 11' &&
      devInfo.platform === 'web' &&
      devInfo.deviceIdHash === hashDeviceId('web_persistent_uuid_12345');

    recordTest(
      19,
      'Web device enrollment headers parsed and hashed correctly',
      'Device Identification',
      passed,
      `platform: ${devInfo.platform}, hashLen: ${devInfo.deviceIdHash.length}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 20: Android Capacitor Identification Header Extraction
  // ───────────────────────────────────────────────────────────────────────────
  {
    const req = createMockReq({
      headers: {
        'x-device-id': 'android_hardware_fingerprint_abc123',
        'x-device-name': 'Google Pixel 8 Pro (Capacitor)',
        'x-platform': 'android',
        'x-client': 'mobile',
      },
    });
    const devInfo = extractDeviceInfo(req);

    const passed =
      devInfo.deviceId === 'android_hardware_fingerprint_abc123' &&
      devInfo.platform === 'android' &&
      devInfo.deviceName === 'Google Pixel 8 Pro (Capacitor)';

    recordTest(
      20,
      'Simulated Android Capacitor headers parsed and tagged as android platform',
      'Mobile Integration',
      passed,
      `platform: ${devInfo.platform}, name: ${devInfo.deviceName}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 21: Tampered Session ID in JWT Is Rejected
  // ───────────────────────────────────────────────────────────────────────────
  {
    const tamperedToken = generateAuthToken(
      user1.id,
      user1.email,
      user1.role,
      'forged-non-existent-session-id',
      deviceB_Hash
    );

    const req: any = createMockReq({
      headers: { authorization: `Bearer ${tamperedToken}` },
    });
    const mockRes = createMockRes();

    await authenticateStudent(req, mockRes.res, () => {
      requireAuth(req, mockRes.res, () => {});
    });

    const passed =
      mockRes.statusCode === 401 &&
      (mockRes.data?.code === 'SESSION_REVOKED' || mockRes.data?.code === 'UNAUTHORIZED');
    recordTest(
      21,
      'Tampered or non-existent session ID in JWT is rejected (HTTP 401)',
      'Tamper Resistance',
      passed,
      `Status: ${mockRes.statusCode}, code: ${mockRes.data?.code}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 22: Concurrent Login Race Condition Handling (Atomic Guard)
  // ───────────────────────────────────────────────────────────────────────────
  {
    const raceUserEmail = 'race.student@example.com';
    const raceUser: any = {
      _id: 'usr-race-777',
      id: 'usr-race-777',
      name: 'Race Student',
      email: raceUserEmail,
      role: 'learner',
      password: hashedPassword,
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
    registeredUsers[raceUserEmail] = raceUser;

    // Simulate two concurrent requests arriving at nearly identical moments
    const req1 = createMockReq({
      headers: { 'x-device-id': 'device_one_uuid', 'x-platform': 'web' },
      body: { email: raceUserEmail, password: testPassword },
    });
    const mockRes1 = createMockRes();

    const req2 = createMockReq({
      headers: { 'x-device-id': 'device_two_uuid', 'x-platform': 'android' },
      body: { email: raceUserEmail, password: testPassword },
    });
    const mockRes2 = createMockRes();

    await Promise.all([login(req1, mockRes1.res), login(req2, mockRes2.res)]);

    const oneSucceeded =
      (mockRes1.statusCode === 200 && mockRes2.statusCode === 403) ||
      (mockRes1.statusCode === 403 && mockRes2.statusCode === 200);

    const exactlyOneBound =
      raceUser.deviceBinding.bindingStatus === 'BOUND' &&
      (raceUser.deviceBinding.deviceIdHash === hashDeviceId('device_one_uuid') ||
        raceUser.deviceBinding.deviceIdHash === hashDeviceId('device_two_uuid'));

    const passed = oneSucceeded && exactlyOneBound;
    recordTest(
      22,
      'Concurrent login race condition: exactly one device binds, the other is rejected',
      'Concurrency & Race Safety',
      passed,
      `Res1: ${mockRes1.statusCode}, Res2: ${mockRes2.statusCode}, boundHash: ${raceUser.deviceBinding.deviceIdHash.slice(0, 16)}...`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 23: Persistent Device ID Hashes Deterministically
  // ───────────────────────────────────────────────────────────────────────────
  {
    const persistentId = 'persisted_uuid_across_restarts';
    const hash1 = hashDeviceId(persistentId);
    const hash2 = hashDeviceId(persistentId);

    const isDeterministic = hash1 === hash2;
    const isCryptoSecure = hash1.length === 64;

    const passed = isDeterministic && isCryptoSecure;
    recordTest(
      23,
      'Persistent device enrollment identifier hashes deterministically across browser restarts',
      'Client Storage Architecture',
      passed,
      `Deterministic: ${isDeterministic}, Length: ${hash1.length}`
    );
  }

  // Summary
  console.log('\n================================================================');
  console.log(' AIIMS Verification Summary: One Account – One Device');
  console.log('================================================================');
  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = total - passedCount;

  console.log(`Total Scenarios Tested: ${total}`);
  console.log(`Passed:                 ${passedCount} / ${total}`);
  console.log(`Failed:                 ${failedCount}`);
  console.log(`Pass Rate:               ${((passedCount / total) * 100).toFixed(1)}%`);

  if (failedCount > 0) {
    console.error('\n❌ Verification Failed! Some scenarios did not pass.');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL 23 DEVICE BINDING & SESSION SECURITY SCENARIOS PASSED CLEANLY!\n');
    process.exit(0);
  }
}

runDeviceBindingSuite().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
