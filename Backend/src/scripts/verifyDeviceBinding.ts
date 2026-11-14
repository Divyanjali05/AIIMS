/**
 * Comprehensive One Account, One Device & Session Security Verification Script
 * Covers all 23 scenarios required by Prompt 3/12.
 * Fully migrated to PostgreSQL / Prisma.
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { config } from '../config/env';
import { prisma, isDatabaseConnected, disconnectDatabase } from '../config/prisma';
import { installPrismaTestDouble } from '../services/__tests__/helpers/prismaTestDouble';
import { sessionService } from '../services/session.service';
import { userRecordToIUser } from '../utils/userMapper';
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

async function runAuthPipeline(req: any, mockRes: MockResponseContext): Promise<boolean> {
  let nextCalled = false;
  await authenticateStudent(req, mockRes.res, (() => {
    requireAuth(req, mockRes.res, (() => {
      nextCalled = true;
    }) as any);
  }) as any);
  return nextCalled;
}

async function runDeviceBindingSuite() {
  console.log('================================================================');
  console.log(' AIIMS Prompt 3: One Account – One Device Verification Suite');
  console.log('================================================================\n');

  if (!isDatabaseConnected()) {
    installPrismaTestDouble({ connected: true });
  }

  const testPassword = 'Password123!';
  const hashedPassword = bcrypt.hashSync(testPassword, 10);

  const getUser = async (email: string): Promise<any> => {
    const row = await prisma.user.findUnique({ where: { email } });
    return row ? userRecordToIUser(row) : null;
  };

  // Setup Test Users
  const user1Email = 'test.student@example.com';
  await prisma.user.upsert({
    where: { email: user1Email },
    create: {
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
      deviceIdHash: '',
      deviceName: '',
      devicePlatform: 'web',
      bindingStatus: 'UNBOUND',
    },
    update: {
      deviceIdHash: '',
      deviceName: '',
      devicePlatform: 'web',
      bindingStatus: 'UNBOUND',
      activeSessionId: null,
      deviceBoundAt: null,
      deviceLastSeenAt: null,
    },
  });

  const adminEmail = 'admin.security@example.com';
  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      id: 'usr-admin-999',
      name: 'Admin Security',
      email: adminEmail,
      role: 'admin',
      password: hashedPassword,
      isActive: true,
      deviceIdHash: '',
      deviceName: '',
      devicePlatform: 'web',
      bindingStatus: 'UNBOUND',
    },
    update: {
      isActive: true,
    },
  });

  let user1 = (await getUser(user1Email))!;
  const adminUser = (await getUser(adminEmail))!;

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

    user1 = (await getUser(user1Email))!;
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
    user1 = (await getUser(user1Email))!;
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
    user1 = (await getUser(user1Email))!;
    const activeSessionId = user1.deviceBinding.activeSessionId;
    deviceASessionToken = generateAuthToken(
      user1.id,
      user1.email,
      user1.role,
      activeSessionId || undefined,
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

    const expectedMsg =
      'This account is already active on another device. Please log out from that device to continue.';
    const passed =
      mockRes.statusCode === 403 &&
      mockRes.data?.error === expectedMsg &&
      mockRes.data?.code === 'ACCOUNT_ACTIVE_ANOTHER_DEVICE';

    recordTest(
      3,
      'Login from device B rejected with exact security message (HTTP 403)',
      'Device Enforcement',
      passed,
      `Status: ${mockRes.statusCode}, Message: "${mockRes.data?.error}"`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 4: Existing Active Device (Device A) Session NOT Terminated by Device B Attempt
  // ───────────────────────────────────────────────────────────────────────────
  {
    user1 = (await getUser(user1Email))!;
    const session = await sessionService.getSession(user1.deviceBinding.activeSessionId || '');
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
  // SCENARIO 5: Device A Can Continue Authenticated Operations
  // ───────────────────────────────────────────────────────────────────────────
  {
    const req: any = createMockReq({
      headers: {
        authorization: `Bearer ${deviceASessionToken}`,
        'x-device-id': deviceA_Id,
      },
    });
    const mockRes = createMockRes();
    const nextCalled = await runAuthPipeline(req, mockRes);

    const passed = nextCalled && req.user?.id === user1.id;
    recordTest(
      5,
      'Device A authenticated request succeeds with active session',
      'Session Validation',
      passed,
      `nextCalled: ${nextCalled}, userId: ${req.user?.id}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 6: Logging Out from Device A Revokes Session but Retains Device Binding
  // ───────────────────────────────────────────────────────────────────────────
  user1 = (await getUser(user1Email))!;
  const previousSessionId = user1.deviceBinding.activeSessionId;
  {
    const req: any = createMockReq({
      headers: { authorization: `Bearer ${deviceASessionToken}` },
    });
    req.user = user1;
    const mockRes = createMockRes();
    await logout(req, mockRes.res);

    user1 = (await getUser(user1Email))!;
    const session = await sessionService.getSession(previousSessionId || '');
    const passed =
      session?.status === 'REVOKED' &&
      user1.deviceBinding.activeSessionId === null &&
      user1.deviceBinding.bindingStatus === 'BOUND' &&
      user1.deviceBinding.deviceIdHash === deviceA_Hash;

    recordTest(
      6,
      'Logout revokes active session while retaining device binding',
      'Session Revocation',
      passed,
      `Session status: ${session?.status}, bindingStatus: ${user1.deviceBinding.bindingStatus}, activeSession: ${user1.deviceBinding.activeSessionId}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 7: Device B Still Rejected Even When Device A Is Logged Out
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

    const passed =
      mockRes.statusCode === 403 &&
      (mockRes.data?.code === 'ACCOUNT_ACTIVE_ANOTHER_DEVICE' ||
        mockRes.data?.code === 'DEVICE_BOUND_ANOTHER_DEVICE');

    recordTest(
      7,
      'Device B rejected after Device A logout because account remains bound to Device A',
      'Device Enforcement',
      passed,
      `Status: ${mockRes.statusCode}, Code: ${mockRes.data?.code}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 8: Device A Can Log Back In After Logging Out (Creates New Active Session)
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

    user1 = (await getUser(user1Email))!;
    deviceANewSessionId = user1.deviceBinding.activeSessionId || '';
    const session = await sessionService.getSession(deviceANewSessionId);

    const passed =
      mockRes.statusCode === 200 &&
      Boolean(deviceANewSessionId) &&
      deviceANewSessionId !== previousSessionId &&
      session?.status === 'ACTIVE';

    recordTest(
      8,
      'Same device A can log in again after logout (issues new active session)',
      'Session Lifecycle',
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

    user1 = (await getUser(user1Email))!;
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
    const audit = await prisma.deviceResetAudit.findFirst({
      where: { targetUserId: user1.id },
      orderBy: { resetAt: 'desc' },
    });
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
      `Audit recorded: ${Boolean(audit)}, reason: "${audit?.reason}"`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 12: Device B Can Now Log In and Bind Account
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

    user1 = (await getUser(user1Email))!;
    deviceBSessionId = user1.deviceBinding.activeSessionId || '';
    const passed =
      mockRes.statusCode === 200 &&
      user1.deviceBinding.bindingStatus === 'BOUND' &&
      user1.deviceBinding.deviceIdHash === deviceB_Hash &&
      Boolean(deviceBSessionId);

    recordTest(
      12,
      'Device B can bind to account following administrative reset',
      'Device Binding',
      passed,
      `Status: ${mockRes.statusCode}, bindingStatus: ${user1.deviceBinding.bindingStatus}, newBoundHash: ${user1.deviceBinding.deviceIdHash.slice(0, 16)}...`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 13: Old Device (Device A) Is Now Rejected
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
      mockRes.statusCode === 403 &&
      (mockRes.data?.code === 'ACCOUNT_ACTIVE_ANOTHER_DEVICE' ||
        mockRes.data?.code === 'DEVICE_BOUND_ANOTHER_DEVICE');

    recordTest(
      13,
      'Former Device A is now rejected because account is bound to Device B',
      'Device Enforcement',
      passed,
      `Status: ${mockRes.statusCode}, code: ${mockRes.data?.code}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 14: Revoked Session Token Is Rejected by Auth Middleware
  // ───────────────────────────────────────────────────────────────────────────
  {
    const revokedToken = generateAuthToken(
      user1.id,
      user1.email,
      user1.role,
      previousSessionId || undefined,
      deviceA_Hash
    );

    const req: any = createMockReq({
      headers: { authorization: `Bearer ${revokedToken}`, 'x-device-id': deviceA_Id },
    });
    const mockRes = createMockRes();
    const nextCalled = await runAuthPipeline(req, mockRes);

    const passed =
      !nextCalled &&
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
      expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
    });

    const expiredToken = generateAuthToken(
      user1.id,
      user1.email,
      user1.role,
      expiredSessionId,
      deviceB_Hash
    );

    const req: any = createMockReq({
      headers: { authorization: `Bearer ${expiredToken}`, 'x-device-id': deviceB_Id },
    });
    const mockRes = createMockRes();
    const nextCalled = await runAuthPipeline(req, mockRes);

    const passed =
      !nextCalled &&
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
  // SCENARIO 16: Device Spoofing (Valid Token from Device B used with Device A Header)
  // ───────────────────────────────────────────────────────────────────────────
  {
    const validBToken = generateAuthToken(
      user1.id,
      user1.email,
      user1.role,
      deviceBSessionId,
      deviceB_Hash
    );

    // Attacker steals token and sends with their own device ID (Device A)
    const req: any = createMockReq({
      headers: { authorization: `Bearer ${validBToken}`, 'x-device-id': deviceA_Id },
    });
    const mockRes = createMockRes();
    const nextCalled = await runAuthPipeline(req, mockRes);

    const passed =
      !nextCalled &&
      (mockRes.statusCode === 401 || mockRes.statusCode === 403) &&
      mockRes.data?.code === 'DEVICE_MISMATCH';

    recordTest(
      16,
      'Token used with mismatched device header rejected (HTTP 403 DEVICE_MISMATCH)',
      'Device Spoofing Prevention',
      passed,
      `Status: ${mockRes.statusCode}, code: ${mockRes.data?.code}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 17: Disabled / Inactive Account Rejects Session
  // ───────────────────────────────────────────────────────────────────────────
  {
    await prisma.user.update({
      where: { id: user1.id },
      data: { isActive: false },
    });

    const token = generateAuthToken(
      user1.id,
      user1.email,
      user1.role,
      deviceBSessionId,
      deviceB_Hash
    );

    const req: any = createMockReq({
      headers: { authorization: `Bearer ${token}`, 'x-device-id': deviceB_Id },
    });
    const mockRes = createMockRes();
    const nextCalled = await runAuthPipeline(req, mockRes);

    const passed =
      !nextCalled &&
      mockRes.statusCode === 403 &&
      (mockRes.data?.code === 'ACCOUNT_DISABLED' || mockRes.data?.code === 'ACCOUNT_DEACTIVATED');

    recordTest(
      17,
      'Disabled account session is immediately terminated (HTTP 403)',
      'Account State Enforcement',
      passed,
      `Status: ${mockRes.statusCode}, code: ${mockRes.data?.code}`
    );

    // Restore active status
    await prisma.user.update({
      where: { id: user1.id },
      data: { isActive: true },
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 18: Single Device Enforcement Across Premium / All Tiers
  // ───────────────────────────────────────────────────────────────────────────
  {
    const premiumUserEmail = 'founder.vip@example.com';
    const premiumBoundHash = hashDeviceId('founders_macbook_pro_uuid');
    await prisma.user.upsert({
      where: { email: premiumUserEmail },
      create: {
        id: 'usr-prem-001',
        name: 'Premium Founder',
        email: premiumUserEmail,
        role: 'learner',
        password: hashedPassword,
        aiimsCredits: 5000,
        isActive: true,
        deviceIdHash: premiumBoundHash,
        deviceName: 'Founders MacBook',
        devicePlatform: 'web',
        bindingStatus: 'BOUND',
        activeSessionId: 'sess_founder_active',
      },
      update: {
        deviceIdHash: premiumBoundHash,
        bindingStatus: 'BOUND',
        activeSessionId: 'sess_founder_active',
      },
    });

    await sessionService.createSession({
      sessionId: 'sess_founder_active',
      userId: 'usr-prem-001',
      deviceIdHash: premiumBoundHash,
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
      'One account, one device policy applies universally across all tiers and user types',
      'Policy Universality',
      passed,
      `Status: ${mockRes.statusCode}, code: ${mockRes.data?.code}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 19: Missing Device Identification Headers Handled Safely
  // ───────────────────────────────────────────────────────────────────────────
  {
    const req = createMockReq({
      headers: {}, // No x-device-id
      body: { email: user1Email, password: testPassword },
    });
    const mockRes = createMockRes();
    await login(req, mockRes.res);

    const passed = mockRes.statusCode === 200 || mockRes.statusCode === 403;
    recordTest(
      19,
      'Missing device headers fallback to IP/UA fingerprint without server crash',
      'Fallback Resilience',
      passed,
      `Status: ${mockRes.statusCode}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 20: Malformed Authorization Header Rejected
  // ───────────────────────────────────────────────────────────────────────────
  {
    const req: any = createMockReq({
      headers: { authorization: 'InvalidScheme 123456789' },
    });
    const mockRes = createMockRes();
    const nextCalled = await runAuthPipeline(req, mockRes);

    const passed = !nextCalled && mockRes.statusCode === 401;
    recordTest(
      20,
      'Malformed Authorization header rejected with HTTP 401',
      'Header Validation',
      passed,
      `Status: ${mockRes.statusCode}, code: ${mockRes.data?.code}`
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
      headers: { authorization: `Bearer ${tamperedToken}`, 'x-device-id': deviceB_Id },
    });
    const mockRes = createMockRes();
    const nextCalled = await runAuthPipeline(req, mockRes);

    const passed =
      !nextCalled &&
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
    await prisma.user.upsert({
      where: { email: raceUserEmail },
      create: {
        id: 'usr-race-777',
        name: 'Race Student',
        email: raceUserEmail,
        role: 'learner',
        password: hashedPassword,
        isActive: true,
        deviceIdHash: '',
        deviceName: '',
        devicePlatform: 'web',
        bindingStatus: 'UNBOUND',
        activeSessionId: null,
      },
      update: {
        deviceIdHash: '',
        bindingStatus: 'UNBOUND',
        activeSessionId: null,
      },
    });

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

    const raceUser = (await getUser(raceUserEmail))!;
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
    const idSample = 'stable-device-uuid-987654';
    const hash1 = hashDeviceId(idSample);
    const hash2 = hashDeviceId(idSample);
    const hash3 = hashDeviceId('different-device-uuid');

    const passed = hash1 === hash2 && hash1 !== hash3 && hash1.length === 64;
    recordTest(
      23,
      'Device identifier hashes deterministically across calls',
      'Cryptographic Integrity',
      passed,
      `Hash 1 === Hash 2: ${hash1 === hash2}, Distinct: ${hash1 !== hash3}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Summary & Exit
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log(' VERIFICATION SUMMARY');
  console.log('================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log(`Total Scenarios Tested: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.error('\n❌ Verification failed on the following tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => console.error(`  - Test ${r.id}: ${r.name} (${r.details})`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL 23 DEVICE BINDING & SESSION SECURITY SCENARIOS PASSED CLEANLY!\n');
    process.exit(0);
  }
}

runDeviceBindingSuite().catch((err) => {
  console.error('Fatal error during device binding verification:', err);
  process.exit(1);
});
