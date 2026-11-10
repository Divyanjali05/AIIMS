/**
 * verifySecurityRemediation.ts
 * =========================================================
 * AIIMS Prompt 2: Critical Security Remediation Automated Verification Suite
 *
 * Verifies:
 *  1. CRITICAL: Learner role escalation & state tampering prevention (HTTP 403/400).
 *  2. HIGH: AI Wallet authentication & authorization guards (HTTP 401/403).
 *  3. HIGH: Focus & Radar ownership & cross-user modification prevention (HTTP 401/403).
 *  4. HIGH: Plaintext password fallback elimination & bcrypt enforcement.
 *  5. HIGH: Static dev JWT fallback replacement with random ephemeral entropy.
 *  6. MEDIUM: Zod input validation schemas for mutating operations.
 *
 * Usage:
 *  npx ts-node src/scripts/verifySecurityRemediation.ts
 */

import bcrypt from 'bcryptjs';
import { updateLearnerState } from '../controllers/learner.controller';
import { getUserWallet, addToWallet, updateFamiliarity } from '../controllers/aiWallet.controller';
import { overrideFocus, toggleFollowSignal } from '../controllers/investigation.controller';
import { login } from '../controllers/auth.controller';
import { getValidatedJwtSecret } from '../config/env';
import { registeredUsers } from '../models/userStore';
import { mockToolCatalog } from '../models/aiims.models';
import { addToWalletSchema, updateFamiliaritySchema } from '../schemas/wallet.schema';
import { focusOverrideSchema, radarFollowSchema } from '../schemas/investigation.schema';
import { updateLearnerStateSchema } from '../schemas/learner.schema';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.error(`  ❌ [FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function createMockRes() {
  const res: any = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
    send(data: any) {
      this.body = data;
      return this;
    },
    setHeader(key: string, val: string) {
      this.headers[key] = val;
      return this;
    },
    cookie(name: string, val: any) {
      this.headers[`cookie-${name}`] = val;
      return this;
    },
  };
  return res;
}

function createMockStudent(id = 'student_001', role = 'Student') {
  return {
    _id: id,
    id,
    email: 'student@example.com',
    name: 'Test Student',
    role,
    isActive: true,
    aiimsCredits: 100,
    xpPoints: 50,
    stage: 'Knowing',
    profile: {
      name: 'Test Student',
      email: 'student@example.com',
      role,
      institution: 'AIIMS Academy',
      targetGoal: 'Master AI',
    },
    wallet: [],
    focus: {
      status: 'available',
      selectedTrack: null,
      history: [],
    },
    radar: {
      status: 'available',
      investigatedSignalIds: [],
      followedSignalIds: [],
    },
    assessment: {
      status: 'not_started',
      rewardClaimed: false,
    },
  };
}

async function runAllTests() {
  console.log('===============================================================');
  console.log('🛡️  AIIMS PROMPT 2: CRITICAL SECURITY REMEDIATION VERIFICATION');
  console.log('===============================================================\n');

  // =========================================================================
  // SUITE 1: LEARNER ROLE ESCALATION & STATE TAMPERING PREVENTION
  // =========================================================================
  console.log('── SUITE 1: Learner Role Escalation & State Tampering Prevention ──');

  // Test 1: Student sends role = admin
  {
    const req: any = {
      user: createMockStudent(),
      body: { state: { profile: { role: 'admin' } } },
    };
    const res = createMockRes();
    await updateLearnerState(req, res);
    assert(
      'Test 1: Student cannot escalate role to "admin" (HTTP 403)',
      res.statusCode === 403 && res.body?.code === 'ROLE_ESCALATION_FORBIDDEN',
      `Got code ${res.statusCode}: ${JSON.stringify(res.body)}`
    );
  }

  // Test 2: Student sends role = evaluator
  {
    const req: any = {
      user: createMockStudent(),
      body: { state: { profile: { role: 'evaluator' } } },
    };
    const res = createMockRes();
    await updateLearnerState(req, res);
    assert(
      'Test 2: Student cannot escalate role to "evaluator" (HTTP 403)',
      res.statusCode === 403 && res.body?.code === 'ROLE_ESCALATION_FORBIDDEN',
      `Got code ${res.statusCode}: ${JSON.stringify(res.body)}`
    );
  }

  // Test 3: Student attempts to modify account status
  {
    const req: any = {
      user: createMockStudent(),
      body: { state: { isActive: true, status: 'active' } },
    };
    const res = createMockRes();
    await updateLearnerState(req, res);
    assert(
      'Test 3: Student cannot modify account status (HTTP 403)',
      res.statusCode === 403 && res.body?.code === 'ACCOUNT_STATUS_FORBIDDEN',
      `Got code ${res.statusCode}: ${JSON.stringify(res.body)}`
    );
  }

  // Test 4: Student sends fabricated assessment completion
  {
    const req: any = {
      user: createMockStudent(),
      body: { state: { assessment: { status: 'completed', scores: { overall: 100 } } } },
    };
    const res = createMockRes();
    await updateLearnerState(req, res);
    assert(
      'Test 4: Student cannot fabricate assessment completion (HTTP 400)',
      res.statusCode === 400 && res.body?.code === 'ASSESSMENT_TAMPERING_PROHIBITED',
      `Got code ${res.statusCode}: ${JSON.stringify(res.body)}`
    );
  }

  // Test 5: Student sends fabricated analysis completion
  {
    const req: any = {
      user: createMockStudent(),
      body: { state: { analysis: { status: 'completed' } } },
    };
    const res = createMockRes();
    await updateLearnerState(req, res);
    assert(
      'Test 5: Student cannot fabricate analysis completion (HTTP 400)',
      res.statusCode === 400 && res.body?.code === 'ANALYSIS_TAMPERING_PROHIBITED',
      `Got code ${res.statusCode}: ${JSON.stringify(res.body)}`
    );
  }

  // Test 6: Student sends fabricated Clarity scores
  {
    const req: any = {
      user: createMockStudent(),
      body: { state: { taskScores: { 'task-1': 100 } } },
    };
    const res = createMockRes();
    await updateLearnerState(req, res);
    assert(
      'Test 6: Student cannot fabricate taskScores (HTTP 400)',
      res.statusCode === 400 && res.body?.code === 'CLARITY_SCORE_TAMPERING_PROHIBITED',
      `Got code ${res.statusCode}: ${JSON.stringify(res.body)}`
    );
  }

  // Test 7: Student sends fabricated Focus results
  {
    const req: any = {
      user: createMockStudent(),
      body: { state: { focus: { history: ['hack_track'] } } },
    };
    const res = createMockRes();
    await updateLearnerState(req, res);
    assert(
      'Test 7: Student cannot fabricate focus history/state directly (HTTP 400)',
      res.statusCode === 400 && res.body?.code === 'FOCUS_TAMPERING_PROHIBITED',
      `Got code ${res.statusCode}: ${JSON.stringify(res.body)}`
    );
  }

  // Test 8: Student sends manipulated credit balances
  {
    const req: any = {
      user: createMockStudent(),
      body: { state: { aiimsCredits: 99999, xpPoints: 50000 } },
    };
    const res = createMockRes();
    await updateLearnerState(req, res);
    assert(
      'Test 8: Student cannot directly manipulate credit balances (HTTP 400)',
      res.statusCode === 400 && res.body?.code === 'CREDIT_TAMPERING_PROHIBITED',
      `Got code ${res.statusCode}: ${JSON.stringify(res.body)}`
    );
  }

  // Test 9: Legitimate learner update succeeds
  {
    const req: any = {
      user: createMockStudent(),
      body: {
        state: {
          profile: {
            name: 'Updated Name',
            bio: 'Aspiring AI Architect',
            targetGoal: 'Build enterprise LLM systems',
          },
        },
      },
    };
    const res = createMockRes();
    await updateLearnerState(req, res);
    assert(
      'Test 9: Legitimate profile updates succeed within allowlist (HTTP 200)',
      res.statusCode === 200 && res.body?.state?.profile?.name === 'Updated Name',
      `Got code ${res.statusCode}: ${JSON.stringify(res.body)}`
    );
  }

  // Test 9A: Student sends role = 'learner' (role presence must remain blocked)
  {
    const req: any = {
      user: createMockStudent(),
      body: { state: { profile: { name: 'Valid Name', role: 'learner' } } },
    };
    const res = createMockRes();
    await updateLearnerState(req, res);
    assert(
      'Test 9A: Payload containing profile.role="learner" remains blocked (HTTP 403)',
      res.statusCode === 403 && res.body?.code === 'ROLE_ESCALATION_FORBIDDEN',
      `Got code ${res.statusCode}: ${JSON.stringify(res.body)}`
    );
  }

  // Test 9B: Sanitized ordinary sync persists editable slices without overwriting Clarity/Focus/Radar/Investigation server fields
  {
    const mockUser: any = createMockStudent();
    mockUser.clarity = {
      status: 'in_progress',
      selectedAreas: ['Prompt Engineering'],
      selectedTopic: 'Structured Prompting',
      completedTopics: ['Structured Prompting'],
      reflections: {},
      taskScores: { 'Structured Prompting': { easy: { score: 95, grade: 'Exemplary' } } },
      trialRunsUsed: 1,
    };
    mockUser.focus = {
      status: 'active',
      selectedTrack: 'Deep Prompting',
      history: ['sess-1'],
      sessionHistory: [{ id: 'sess-1', actualFocusSeconds: 1500, status: 'completed' }],
    };
    mockUser.radar = {
      status: 'available',
      investigatedSignalIds: ['sig-server-01'],
      followedSignalIds: ['sig-server-01'],
      savedSignalIds: [],
      dismissedSignalIds: [],
    };
    mockUser.investigation = {
      status: 'completed',
      selectedSignalId: 'sig-server-01',
      userNotes: {},
    };

    const req: any = {
      user: mockUser,
      body: {
        state: {
          profile: {
            name: 'Priya Updated',
            college: 'IIT Bombay',
            targetGoal: 'Build Safe Agents',
            stage: 'Understanding',
          },
          radar: {
            savedSignalIds: ['sig-client-02'],
            dismissedSignalIds: ['sig-client-03'],
            lastViewedRadar: '2026-11-10',
            radarProgress: 50,
          },
          investigation: {
            selectedSignalId: 'sig-server-01',
            userNotes: { 'sig-server-01': 'Reviewed agent safety impact' },
          },
          aiWallet: {
            userTools: [
              {
                toolId: 'tool-chatgpt',
                addedAt: '2026-11-10',
                familiarity: 'proficient',
                primaryCategory: 'Reasoning & Writing',
              },
            ],
            dismissedRecommendations: ['rec-01'],
          },
          notifications: [
            {
              id: 'n-1',
              title: 'Sync Check',
              message: 'Read notification',
              timestamp: 'Just now',
              targetTab: 'home',
              read: true,
            },
          ],
        },
      },
    };
    const res = createMockRes();
    await updateLearnerState(req, res);

    const preservedClarity =
      res.body?.state?.clarity?.taskScores?.['Structured Prompting']?.easy?.score === 95;
    const preservedFocus =
      res.body?.state?.focus?.selectedTrack === 'Deep Prompting' &&
      res.body?.state?.focus?.sessionHistory?.length === 1;
    const preservedRadarServer =
      res.body?.state?.radar?.investigatedSignalIds?.includes('sig-server-01') &&
      res.body?.state?.radar?.savedSignalIds?.includes('sig-client-02');
    const preservedInvestigation =
      res.body?.state?.investigation?.status === 'completed' &&
      res.body?.state?.investigation?.userNotes?.['sig-server-01'] ===
        'Reviewed agent safety impact';
    const updatedWalletAndNotif =
      res.body?.state?.aiWallet?.userTools?.length === 1 &&
      res.body?.state?.notifications?.[0]?.read === true;

    assert(
      'Test 9B: Ordinary sanitized sync succeeds (HTTP 200) and preserves Clarity, Focus, Radar, and Investigation server fields',
      res.statusCode === 200 &&
        res.body?.state?.profile?.name === 'Priya Updated' &&
        preservedClarity &&
        preservedFocus &&
        preservedRadarServer &&
        preservedInvestigation &&
        updatedWalletAndNotif,
      `Got status ${res.statusCode}: clarity=${preservedClarity}, focus=${preservedFocus}, radar=${preservedRadarServer}, inv=${preservedInvestigation}`
    );
  }

  // =========================================================================
  // SUITE 2: AI WALLET AUTHENTICATION & ACCESS CONTROL
  // =========================================================================
  console.log('\n── SUITE 2: AI Wallet Security & Endpoint Protection ──');

  // Test 10: Anonymous getUserWallet rejected
  {
    const req: any = { user: undefined };
    const res = createMockRes();
    await getUserWallet(req, res);
    assert(
      'Test 10: Anonymous access to GET /wallet/user is rejected (HTTP 401)',
      res.statusCode === 401 && res.body?.code === 'UNAUTHORIZED',
      `Got code ${res.statusCode}`
    );
  }

  // Test 11: Anonymous addToWallet rejected
  {
    const req: any = { user: undefined, body: { toolId: 'cursor' } };
    const res = createMockRes();
    await addToWallet(req, res);
    assert(
      'Test 11: Anonymous access to POST /wallet/add is rejected (HTTP 401)',
      res.statusCode === 401 && res.body?.code === 'UNAUTHORIZED',
      `Got code ${res.statusCode}`
    );
  }

  // Test 12: Anonymous updateFamiliarity rejected
  {
    const req: any = {
      user: undefined,
      body: { toolId: 'cursor', familiarityLevel: 'Daily Driver' },
    };
    const res = createMockRes();
    await updateFamiliarity(req, res);
    assert(
      'Test 12: Anonymous access to POST /wallet/update-familiarity is rejected (HTTP 401)',
      res.statusCode === 401 && res.body?.code === 'UNAUTHORIZED',
      `Got code ${res.statusCode}`
    );
  }

  // Test 13: Adding non-existent tool returns 404
  {
    const req: any = {
      user: createMockStudent(),
      body: { toolId: 'non-existent-tool-xyz-999' },
    };
    const res = createMockRes();
    await addToWallet(req, res);
    assert(
      'Test 13: Adding invalid/unregistered tool ID returns 404',
      res.statusCode === 404 && res.body?.code === 'TOOL_NOT_FOUND',
      `Got code ${res.statusCode}`
    );
  }

  // Test 14: Adding valid catalog tool succeeds
  {
    const sampleTool = mockToolCatalog[0];
    const student = createMockStudent();
    const req: any = {
      user: student,
      body: { toolId: sampleTool.id },
    };
    const res = createMockRes();
    await addToWallet(req, res);
    assert(
      'Test 14: Adding valid catalog tool succeeds for authenticated user',
      res.statusCode === 200 && res.body?.item?.toolId === sampleTool.id,
      `Got code ${res.statusCode}`
    );
  }

  // =========================================================================
  // SUITE 3: FOCUS & RADAR ENDPOINTS AND CROSS-USER ISOLATION
  // =========================================================================
  console.log('\n── SUITE 3: Focus & Radar Cross-User Ownership Isolation ──');

  // Test 15: Anonymous overrideFocus rejected
  {
    const req: any = { user: undefined, body: { focusId: 'track-1' } };
    const res = createMockRes();
    await overrideFocus(req, res);
    assert(
      'Test 15: Anonymous POST /focus/override returns 401',
      res.statusCode === 401 && res.body?.code === 'UNAUTHORIZED',
      `Got code ${res.statusCode}`
    );
  }

  // Test 16: Cross-user overrideFocus rejected
  {
    const student = createMockStudent('student_123');
    const req: any = {
      user: student,
      body: { focusId: 'track-1', userId: 'victim_student_999' },
    };
    const res = createMockRes();
    await overrideFocus(req, res);
    assert(
      'Test 16: Cross-user focus override attempt blocked (HTTP 403)',
      res.statusCode === 403 && res.body?.code === 'FORBIDDEN_CROSS_USER',
      `Got code ${res.statusCode}`
    );
  }

  // Test 17: Anonymous toggleFollowSignal rejected
  {
    const req: any = { user: undefined, body: { signalId: 'sig-1' } };
    const res = createMockRes();
    await toggleFollowSignal(req, res);
    assert(
      'Test 17: Anonymous POST /radar/follow returns 401',
      res.statusCode === 401 && res.body?.code === 'UNAUTHORIZED',
      `Got code ${res.statusCode}`
    );
  }

  // Test 18: Cross-user toggleFollowSignal rejected
  {
    const student = createMockStudent('student_123');
    const req: any = {
      user: student,
      body: { signalId: 'sig-1', userId: 'victim_student_999' },
    };
    const res = createMockRes();
    await toggleFollowSignal(req, res);
    assert(
      'Test 18: Cross-user radar follow attempt blocked (HTTP 403)',
      res.statusCode === 403 && res.body?.code === 'FORBIDDEN_CROSS_USER',
      `Got code ${res.statusCode}`
    );
  }

  // Test 19: Valid own-user focus override succeeds
  {
    const student = createMockStudent('student_123');
    const req: any = {
      user: student,
      body: { focusId: 'agentic_workflows', mentorOverride: 'Focus approved' },
    };
    const res = createMockRes();
    await overrideFocus(req, res);
    assert(
      'Test 19: Valid focus override for self succeeds (HTTP 200)',
      res.statusCode === 200 && res.body?.success === true,
      `Got code ${res.statusCode}`
    );
  }

  // Test 20: Valid own-user radar toggle succeeds
  {
    const student = createMockStudent('student_123');
    const req: any = {
      user: student,
      body: { signalId: 'deepseek-r1-launch' },
    };
    const res = createMockRes();
    await toggleFollowSignal(req, res);
    assert(
      'Test 20: Valid radar toggle for self succeeds (HTTP 200)',
      res.statusCode === 200 && res.body?.success === true && res.body?.isFollowed === true,
      `Got code ${res.statusCode}`
    );
  }

  // =========================================================================
  // SUITE 4: PLAINTEXT PASSWORD CHECK ELIMINATION & BCRYPT ENFORCEMENT
  // =========================================================================
  console.log('\n── SUITE 4: Plaintext Password Rejection & Bcrypt Enforcement ──');

  // Test 21: Plaintext password in database is NOT accepted
  {
    const testPlainUser = {
      id: 'user_plaintext_test',
      email: 'plaintext@aiims.edu',
      password: 'PlaintextPassword123!', // Stored as plaintext without $2 bcrypt prefix
      name: 'Plaintext User',
      role: 'Student',
      aiimsCredits: 100,
    };
    registeredUsers['plaintext@aiims.edu'] = testPlainUser as any;

    const req: any = {
      body: { email: 'plaintext@aiims.edu', password: 'PlaintextPassword123!' },
      headers: {},
    };
    const res = createMockRes();
    await login(req, res);

    assert(
      'Test 21: Plaintext passwords in database are rejected (never verified with ===)',
      res.statusCode === 401 && res.body?.error !== undefined,
      `Got code ${res.statusCode}: ${JSON.stringify(res.body)}`
    );
    delete registeredUsers['plaintext@aiims.edu'];
  }

  // Test 22: Valid bcrypt hash is accepted
  {
    const hashedPassword = bcrypt.hashSync('SecurePassword123!', 10);
    const testBcryptUser = {
      id: 'user_bcrypt_test',
      email: 'bcrypt@aiims.edu',
      password: hashedPassword,
      name: 'Bcrypt User',
      role: 'Student',
      aiimsCredits: 100,
    };
    registeredUsers['bcrypt@aiims.edu'] = testBcryptUser as any;

    const req: any = {
      body: { email: 'bcrypt@aiims.edu', password: 'SecurePassword123!' },
      headers: {},
    };
    const res = createMockRes();
    await login(req, res);

    assert(
      'Test 22: Proper bcrypt hashed password verifies successfully (HTTP 200)',
      res.statusCode === 200 &&
        (res.body?.user !== undefined || res.headers['cookie-token'] !== undefined),
      `Got code ${res.statusCode}: ${JSON.stringify(res.body)}`
    );
    delete registeredUsers['bcrypt@aiims.edu'];
  }

  // Test 23: Wrong password against bcrypt hash fails
  {
    const hashedPassword = bcrypt.hashSync('CorrectPassword123!', 10);
    const testBcryptUser = {
      id: 'user_bcrypt_test2',
      email: 'wrongpass@aiims.edu',
      password: hashedPassword,
      name: 'Bcrypt User 2',
      role: 'Student',
      aiimsCredits: 100,
    };
    registeredUsers['wrongpass@aiims.edu'] = testBcryptUser as any;

    const req: any = {
      body: { email: 'wrongpass@aiims.edu', password: 'WrongPassword123!' },
      headers: {},
    };
    const res = createMockRes();
    await login(req, res);

    assert(
      'Test 23: Incorrect password fails bcrypt verification (HTTP 401)',
      res.statusCode === 401 && res.body?.error !== undefined,
      `Got code ${res.statusCode}: ${JSON.stringify(res.body)}`
    );
    delete registeredUsers['wrongpass@aiims.edu'];
  }

  // =========================================================================
  // SUITE 5: JWT CONFIGURATION & RANDOM EPHEMERAL SECRET FALLBACK
  // =========================================================================
  console.log('\n── SUITE 5: JWT Ephemeral Secret Fallback ──');

  // Test 24: Validate dev JWT secret is high-entropy, not static default
  {
    const secret = getValidatedJwtSecret();
    assert(
      'Test 24: Non-production JWT secret fallback is high-entropy (not static default)',
      secret !== 'dev-secret-change-in-production' && secret.length >= 16,
      `Secret length: ${secret.length}, value starts with: ${secret.substring(0, 8)}...`
    );
  }

  // =========================================================================
  // SUITE 6: ZOD INPUT VALIDATION SCHEMAS
  // =========================================================================
  console.log('\n── SUITE 6: Zod Request Validation Schemas ──');

  // Test 25: addToWalletSchema rejects missing toolId
  {
    const result = addToWalletSchema.safeParse({});
    assert(
      'Test 25: addToWalletSchema rejects empty object missing toolId',
      result.success === false
    );
  }

  // Test 26: updateFamiliaritySchema rejects invalid level
  {
    const result = updateFamiliaritySchema.safeParse({
      toolId: 'cursor',
      familiarity: 'Super Expert' as any,
    });
    assert('Test 26: updateFamiliaritySchema rejects invalid enum value', result.success === false);
  }

  // Test 27: focusOverrideSchema rejects empty string focusId
  {
    const result = focusOverrideSchema.safeParse({ focusId: '   ' });
    assert(
      'Test 27: focusOverrideSchema rejects whitespace-only focusId',
      result.success === false
    );
  }

  // Test 28: radarFollowSchema rejects missing signalId
  {
    const result = radarFollowSchema.safeParse({});
    assert('Test 28: radarFollowSchema rejects empty payload', result.success === false);
  }

  // Test 29: updateLearnerStateSchema validates structured update
  {
    const result = updateLearnerStateSchema.safeParse({
      state: {
        profile: {
          name: 'Jane Doe',
          targetGoal: 'AI researcher',
        },
      },
    });
    assert(
      'Test 29: updateLearnerStateSchema validates safe profile update',
      result.success === true
    );
  }

  // =========================================================================
  // FINAL SUMMARY
  // =========================================================================
  console.log('\n===============================================================');
  console.log(
    `VERIFICATION SUMMARY: ${passed} PASSED / ${failed} FAILED (Total: ${passed + failed})`
  );
  console.log('===============================================================');

  if (failed > 0) {
    console.error('Failed checks:');
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL 29 SECURITY REMEDIATION CHECKS PASSED CLEANLY!\n');
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
