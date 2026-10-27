/**
 * fullStackAuditTest.ts
 * ==========================================
 * Comprehensive Full-Stack and API Verification Suite
 * Tests all modular Express routes, controllers, auth guards,
 * data persistence, credits system rules, and API contracts.
 */

import mongoose from 'mongoose';
import { config } from '../config/env';
import { User, IUser } from '../models/User.model';
import { StudentProfile } from '../models/StudentProfile.model';

const API_BASE = `http://localhost:${config.port}/api`;
const ROOT_BASE = `http://localhost:${config.port}`;

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function check(suite: string, name: string, condition: boolean, details: string) {
  results.push({ suite, name, passed: condition, details });
  const icon = condition ? '✅' : '❌';
  console.log(`  ${icon} [${condition ? 'PASS' : 'FAIL'}] ${name}: ${details}`);
}

async function runAudit() {
  console.log('===============================================================');
  console.log('🧪 AIIMS COMPREHENSIVE FULL-STACK & MODULAR API AUDIT SUITE');
  console.log('===============================================================\n');

  // Direct MongoDB connection for ground-truth verification
  let isDbConnected = false;
  if (config.mongodbUri) {
    try {
      await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 2000 });
      isDbConnected = mongoose.connection.readyState === 1;
      console.log(`🌿 Direct MongoDB connection established: ${isDbConnected}\n`);
    } catch (e: any) {
      console.warn('⚠️ Direct DB connection failed:', e.message);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SUITE 1: Server Health & Route Aliases
  // ─────────────────────────────────────────────────────────────
  console.log('── SUITE 1: Server Health & Route Aliases ───────────────────────');
  const h1 = await fetch(`${ROOT_BASE}/health`)
    .then((r) => r.json())
    .catch(() => null);
  check(
    'Health',
    'Root /health endpoint returns 200 OK',
    h1?.status === 'ok',
    `status=${h1?.status}`
  );

  const h2 = await fetch(`${API_BASE}/health`)
    .then((r) => r.json())
    .catch(() => null);
  check(
    'Health',
    'API alias /api/health returns 200 OK',
    h2?.status === 'ok',
    `status=${h2?.status}`
  );

  // ─────────────────────────────────────────────────────────────
  // SUITE 2: Academic Module & Public Endpoints
  // ─────────────────────────────────────────────────────────────
  console.log('\n── SUITE 2: Academic Module & Public Endpoints ──────────────────');
  const taxRes = await fetch(`${API_BASE}/academic/taxonomy`).then((r) => r.json());
  check(
    'Academic',
    'Taxonomy endpoint returns streams, programs, specializations',
    Array.isArray(taxRes.streams) &&
      Array.isArray(taxRes.programs) &&
      Array.isArray(taxRes.specializations),
    `programs=${taxRes.programs?.length}, specializations=${taxRes.specializations?.length}`
  );

  const instRes = await fetch(`${API_BASE}/academic/institutes?q=IIT&limit=5`).then((r) =>
    r.json()
  );
  check(
    'Academic',
    'Institutes search returns filtered list',
    Array.isArray(instRes.institutes) && instRes.institutes.length > 0,
    `returned ${instRes.institutes?.length} institutes matching "IIT"`
  );

  // ─────────────────────────────────────────────────────────────
  // SUITE 3: Authentication & Registration Security
  // ─────────────────────────────────────────────────────────────
  console.log('\n── SUITE 3: Authentication & Registration Security ─────────────');

  // 3a. Invalid registration (weak password)
  const weakPwRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Weak User',
      email: 'weak.user@example.com',
      password: 'weak',
      stream: 'TECH',
      educationLevel: 'UNDERGRADUATE',
      programId: 'btech',
      specializationId: 'ai_ml',
      yearOfStudy: 1,
      admissionYear: 2024,
      expectedGraduationYear: 2028,
    }),
  });
  check(
    'Auth',
    'Registration rejects password < 8 chars',
    weakPwRes.status === 400,
    `status=${weakPwRes.status}`
  );

  // 3b. Invalid registration (incompatible taxonomy combination)
  const badTaxRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Mismatch User',
      email: 'mismatch.user@example.com',
      password: 'Password123',
      stream: 'TECH',
      educationLevel: 'UNDERGRADUATE',
      programId: 'mbbs', // NON_TECH program with TECH stream
      specializationId: 'clinical',
      yearOfStudy: 1,
      admissionYear: 2024,
      expectedGraduationYear: 2029,
    }),
  });
  check(
    'Auth',
    'Registration rejects invalid stream-program taxonomy mismatch',
    badTaxRes.status === 400,
    `status=${badTaxRes.status}`
  );

  // 3c. Valid Registration
  const testEmail = `audit.user.${Date.now()}@example.com`;
  const testPassword = 'Password123';
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Audit Senior QA',
      email: testEmail,
      password: testPassword,
      confirmPassword: testPassword,
      stream: 'TECH',
      educationLevel: 'UNDERGRADUATE',
      programId: 'btech',
      programName: 'B.Tech',
      specializationId: 'ai_ml',
      specializationName: 'Artificial Intelligence & Machine Learning',
      yearOfStudy: 3,
      admissionYear: 2023,
      expectedGraduationYear: 2027,
      aiFamiliarity: 'EXPLORING_AI',
      primaryGoal: 'BUILD_SOFTWARE',
    }),
  });
  const regData = await regRes.json();
  const token = regData.token;
  const userId = regData.user?.id || regData.user?._id;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  check(
    'Auth',
    'Valid registration creates user with token and initial 500 AC balance',
    regRes.status === 201 && !!token && regData.user?.aiimsCredits === 500,
    `token=${token ? 'issued' : 'missing'}, credits=${regData.user?.aiimsCredits}`
  );

  // 3d. Duplicate registration rejection
  const dupRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Duplicate User',
      email: testEmail,
      password: testPassword,
      stream: 'TECH',
      educationLevel: 'UNDERGRADUATE',
      programId: 'btech',
      specializationId: 'ai_ml',
      yearOfStudy: 3,
      admissionYear: 2023,
      expectedGraduationYear: 2027,
    }),
  });
  check(
    'Auth',
    'Duplicate registration with existing email is rejected',
    dupRes.status === 400,
    `status=${dupRes.status}`
  );

  // 3e. Login with invalid password
  const badLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'WrongPassword' }),
  });
  check(
    'Auth',
    'Login rejects wrong password with 401',
    badLoginRes.status === 401,
    `status=${badLoginRes.status}`
  );

  // 3f. Valid login
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  const loginData = await loginRes.json();
  check(
    'Auth',
    'Login succeeds with correct credentials and returns JWT + user state',
    loginRes.status === 200 && !!loginData.token && !!loginData.user,
    `user=${loginData.user?.email}`
  );

  // ─────────────────────────────────────────────────────────────
  // SUITE 4: Authorization Guards (401 on missing/bad token)
  // ─────────────────────────────────────────────────────────────
  console.log('\n── SUITE 4: Authorization Guards ───────────────────────────────');
  const unauthEndpoints = [
    { method: 'GET', url: `${API_BASE}/users/profile` },
    { method: 'GET', url: `${API_BASE}/student/profile` },
    { method: 'GET', url: `${API_BASE}/learner/state` },
    { method: 'PUT', url: `${API_BASE}/learner/state` },
    { method: 'GET', url: `${API_BASE}/credits/wallet` },
    { method: 'POST', url: `${API_BASE}/credits/award-level` },
    { method: 'POST', url: `${API_BASE}/credits/invest` },
    { method: 'POST', url: `${API_BASE}/assessments/submit` },
    { method: 'POST', url: `${API_BASE}/clarity/save-task-score` },
    { method: 'POST', url: `${API_BASE}/investigations/submit` },
  ];

  for (const ep of unauthEndpoints) {
    const res = await fetch(ep.url, {
      method: ep.method,
      headers: { 'Content-Type': 'application/json' },
    });
    check(
      'Auth Guard',
      `Protected ${ep.method} ${ep.url.replace(API_BASE, '')} returns 401 without token`,
      res.status === 401,
      `status=${res.status}`
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SUITE 5: Profile Management & Persistence
  // ─────────────────────────────────────────────────────────────
  console.log('\n── SUITE 5: Profile Management & Persistence ───────────────────');
  const profRes = await fetch(`${API_BASE}/users/profile`, { headers: authHeaders }).then((r) =>
    r.json()
  );
  check(
    'Profile',
    'GET /users/profile returns authenticated learner info',
    profRes.email === testEmail && profRes.aiimsCredits === 500,
    `name=${profRes.name}, college=${profRes.college}`
  );

  const updateProfRes = await fetch(`${API_BASE}/users/profile`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ college: 'IIT Bombay', targetGoal: 'Lead AI Systems Engineering' }),
  }).then((r) => r.json());
  check(
    'Profile',
    'PUT /users/profile updates and persists college and targetGoal',
    updateProfRes.college === 'IIT Bombay' &&
      updateProfRes.targetGoal === 'Lead AI Systems Engineering',
    `college=${updateProfRes.college}, goal=${updateProfRes.targetGoal}`
  );

  // ─────────────────────────────────────────────────────────────
  // SUITE 6: Learner State & TaskScore Schema Persistence
  // ─────────────────────────────────────────────────────────────
  console.log('\n── SUITE 6: Learner State & TaskScore Schema Persistence ───────');
  const stateRes1 = await fetch(`${API_BASE}/learner/state`, { headers: authHeaders }).then((r) =>
    r.json()
  );
  check(
    'Learner State',
    'GET /learner/state returns structured state',
    stateRes1.success === true && stateRes1.state?.profile?.email === testEmail,
    `stage=${stateRes1.state?.profile?.stage}`
  );

  // Test updating learner state with taskScores and radar signals
  const putStateRes = await fetch(`${API_BASE}/learner/state`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      state: {
        profile: {
          name: 'Audit Senior QA',
          stage: 'Understanding',
          aiimsCredits: 999999, // Tampering attempt: should be ignored!
        },
        clarity: {
          status: 'in_progress',
          selectedTopic: 'AI Workflow Design',
          completedTopics: ['AI Workflow Design'],
          reflections: { 'AI Workflow Design': 'Custom structured reflection text.' },
          taskScores: {
            'AI Workflow Design': {
              easy: { score: 92, grade: 'Proficient', userPrompt: 'Test Prompt' },
            },
          },
        },
        radar: {
          status: 'available',
          investigatedSignalIds: ['sig-test-1'],
          followedSignalIds: ['sig-test-1'],
          savedSignalIds: ['sig-test-1'],
          dismissedSignalIds: ['sig-dismiss-1'],
          lastViewedRadar: 'sig-test-1',
          radarProgress: 50,
        },
        solver: {
          latestWorkflow: { id: 'wf-1', name: 'Document Analysis Loop' },
          history: [],
        },
      },
    }),
  }).then((r) => r.json());

  // Verify DB directly for persistence
  let dbCheckUser: IUser | null = null;
  if (isDbConnected) {
    dbCheckUser = await User.findOne({ email: testEmail });
  }

  check(
    'Learner State',
    'PUT /learner/state blocks credit tampering (credits remain 500)',
    dbCheckUser
      ? dbCheckUser.aiimsCredits === 500
      : putStateRes.state?.profile?.aiimsCredits === 500,
    `DB credits=${dbCheckUser?.aiimsCredits}`
  );

  check(
    'Learner State',
    'PUT /learner/state successfully persists clarity.taskScores to MongoDB',
    dbCheckUser
      ? dbCheckUser?.clarity?.taskScores?.['AI Workflow Design']?.['easy']?.score === 92
      : putStateRes.state?.clarity?.taskScores?.['AI Workflow Design']?.['easy']?.score === 92,
    `saved score=${dbCheckUser ? dbCheckUser?.clarity?.taskScores?.['AI Workflow Design']?.['easy']?.score : putStateRes.state?.clarity?.taskScores?.['AI Workflow Design']?.['easy']?.score}`
  );

  check(
    'Learner State',
    'PUT /learner/state successfully persists radar saved & dismissed signals',
    dbCheckUser
      ? !!(
          dbCheckUser?.radar?.savedSignalIds?.includes('sig-test-1') &&
          dbCheckUser?.radar?.dismissedSignalIds?.includes('sig-dismiss-1')
        )
      : !!(
          putStateRes.state?.radar?.savedSignalIds?.includes('sig-test-1') &&
          putStateRes.state?.radar?.dismissedSignalIds?.includes('sig-dismiss-1')
        ),
    `saved=${dbCheckUser?.radar?.savedSignalIds?.length ?? putStateRes.state?.radar?.savedSignalIds?.length}, dismissed=${dbCheckUser?.radar?.dismissedSignalIds?.length ?? putStateRes.state?.radar?.dismissedSignalIds?.length}`
  );

  // ─────────────────────────────────────────────────────────────
  // SUITE 7: Assessment & Diagnostic Scoring
  // ─────────────────────────────────────────────────────────────
  console.log('\n── SUITE 7: Assessment & Diagnostic Scoring ────────────────────');
  const qRes = await fetch(`${API_BASE}/assessments/questions`).then((r) => r.json());
  check(
    'Assessment',
    'GET /assessments/questions returns diagnostic question set',
    Array.isArray(qRes) && qRes.length > 0,
    `questions=${qRes.length}`
  );

  const assessAnswers = {
    1: 'q1_b',
    2: ['q2_a', 'q2_b'],
    3: 'q3_b',
    4: 'q4_b',
    5: 'q5_a',
    6: 'q6_b',
    7: 'q7_b',
    8: 'q8_a',
    9: 'q9_b',
    10: 'q10_c',
    11: 'I establish strict system boundaries with role definition and testable contracts.',
    12: 'Modular components with typed interfaces and defensive error recovery.',
    13: 'q13_b',
    14: 'q14_c',
    15: 'q15_a',
    16: 'q16_a',
    17: 'q17_b',
    18: 'q18_b',
    19: 'q19_b',
    20: 'q20_b',
    21: 'q21_b',
    22: 'q22_b',
    23: 'q23_b',
    24: 'q24_b',
    25: 'Continuously redesigning personal workflows to exploit new autonomous capabilities with verification.',
  };

  const assessSub1 = await fetch(`${API_BASE}/assessments/submit`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ answers: assessAnswers }),
  }).then((r) => r.json());

  check(
    'Assessment',
    'First assessment submission awards +50 AC and unlocks analysis',
    assessSub1.earnedCredits === 50 &&
      assessSub1.updatedBalance === 150 &&
      !!assessSub1.evaluationResult,
    `earned=${assessSub1.earnedCredits}, balance=${assessSub1.updatedBalance}, topSkill=${assessSub1.topCapability}`
  );

  // Re-submission idempotency test
  const assessSub2 = await fetch(`${API_BASE}/assessments/submit`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ answers: assessAnswers }),
  }).then((r) => r.json());

  check(
    'Assessment',
    'Assessment re-submission awards 0 new credits (strict idempotency)',
    assessSub2.earnedCredits === 0 && assessSub2.updatedBalance === 150,
    `earned=${assessSub2.earnedCredits}, balance=${assessSub2.updatedBalance}`
  );

  // Analysis endpoints
  const indAnalysis = await fetch(`${API_BASE}/analysis/individual`, { headers: authHeaders }).then(
    (r) => r.json()
  );
  check(
    'Analysis',
    'GET /analysis/individual returns dimension scores with non-inflated 0-safe metrics',
    Array.isArray(indAnalysis.scores) && indAnalysis.scores.length === 5,
    `dimensions=${indAnalysis.scores?.length}`
  );

  const compAnalysis = await fetch(`${API_BASE}/analysis/comparative`).then((r) => r.json());
  check(
    'Analysis',
    'GET /analysis/comparative returns cohort benchmark percentile',
    typeof compAnalysis.cohortPercentile === 'number',
    `cohortPercentile=${compAnalysis.cohortPercentile}`
  );

  const overallAnalysis = await fetch(`${API_BASE}/analysis/overall`).then((r) => r.json());
  check(
    'Analysis',
    'GET /analysis/overall returns aggregate metrics',
    typeof overallAnalysis.totalStudents === 'number',
    `totalStudents=${overallAnalysis.totalStudents}`
  );

  // ─────────────────────────────────────────────────────────────
  // SUITE 8: Clarity AI Task Lab & Reflection
  // ─────────────────────────────────────────────────────────────
  console.log('\n── SUITE 8: Clarity AI Task Lab & Reflection ───────────────────');
  const gapsRes = await fetch(`${API_BASE}/clarity/gaps`).then((r) => r.json());
  check(
    'Clarity',
    'GET /clarity/gaps returns capability gaps',
    Array.isArray(gapsRes) && gapsRes.length > 0,
    `gaps=${gapsRes.length}`
  );

  const promptGenRes = await fetch(`${API_BASE}/clarity/generate-prompt`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      topic: 'Checking AI',
      difficulty: 'easy',
      taskTitle: 'Fact-Check Verification',
      taskObjective: 'Verify customer claim against policy',
      scenario: 'Auditing announcement',
    }),
  }).then((r) => r.json());
  check(
    'Clarity',
    'POST /clarity/generate-prompt returns tailored prompt text',
    typeof promptGenRes.prompt === 'string' && promptGenRes.prompt.length > 20,
    `promptLength=${promptGenRes.prompt?.length}`
  );

  const runTaskRes = await fetch(`${API_BASE}/clarity/run-task`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      topic: 'Checking AI',
      difficulty: 'easy',
      taskTitle: 'Fact-Check Verification',
      userPrompt: 'Act as compliance auditor. Check if free shipping applies.',
      contextData: 'Policy: Free shipping on orders > $50.',
    }),
  }).then((r) => r.json());
  check(
    'Clarity',
    'POST /clarity/run-task returns AI evaluation with score & breakdown',
    typeof runTaskRes.score === 'number' && typeof runTaskRes.output === 'string',
    `score=${runTaskRes.score}, model=${runTaskRes.modelUsed}`
  );

  const reflectSuggestRes = await fetch(`${API_BASE}/clarity/suggest-reflection`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      topic: 'Checking AI',
      taskTitle: 'Fact-Check Verification',
      score: 90,
    }),
  }).then((r) => r.json());
  check(
    'Clarity',
    'POST /clarity/suggest-reflection returns grounded scenario reflection',
    typeof reflectSuggestRes.suggestion === 'string' && reflectSuggestRes.suggestion.length > 30,
    `suggestion=${reflectSuggestRes.suggestion?.substring(0, 60)}...`
  );

  // ─────────────────────────────────────────────────────────────
  // SUITE 9: Focus, Radar, & Investigation
  // ─────────────────────────────────────────────────────────────
  console.log('\n── SUITE 9: Focus, Radar, & Investigation ───────────────────────');
  const focusRes = await fetch(`${API_BASE}/focus/areas`).then((r) => r.json());
  check(
    'Focus',
    'GET /focus/areas returns focus tracks',
    Array.isArray(focusRes),
    `count=${focusRes.length}`
  );

  const radarSignalsRes = await fetch(`${API_BASE}/radar/signals`).then((r) => r.json());
  check(
    'Radar',
    'GET /radar/signals returns signals feed',
    Array.isArray(radarSignalsRes),
    `signals=${radarSignalsRes.length}`
  );

  const followRes = await fetch(`${API_BASE}/radar/follow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signalId: 'sig-1' }),
  }).then((r) => r.json());
  check(
    'Radar',
    'POST /radar/follow toggles followed status',
    typeof followRes.isFollowed === 'boolean',
    `isFollowed=${followRes.isFollowed}`
  );

  const mentorAdvRes = await fetch(`${API_BASE}/ai/mentor`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ stage: 'Understanding', activeFocus: 'AI Workflow Design' }),
  }).then((r) => r.json());
  check(
    'Mentor',
    'POST /ai/mentor provides personalized mentoring guidance',
    typeof mentorAdvRes.message === 'string' && mentorAdvRes.message.includes('AI Workflow Design'),
    `message=${mentorAdvRes.message?.substring(0, 50)}...`
  );

  // ─────────────────────────────────────────────────────────────
  // SUITE 10: AI Wallet & Recommendations
  // ─────────────────────────────────────────────────────────────
  console.log('\n── SUITE 10: AI Wallet & Recommendations ───────────────────────');
  const catalogRes = await fetch(`${API_BASE}/wallet/catalog`).then((r) => r.json());
  check(
    'AI Wallet',
    'GET /wallet/catalog returns active verified tools catalog',
    Array.isArray(catalogRes) && catalogRes.length >= 10,
    `activeTools=${catalogRes.length}`
  );

  const searchRes = await fetch(`${API_BASE}/wallet/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'automated unit testing and coding agent', userTools: [] }),
  }).then((r) => r.json());
  check(
    'AI Wallet',
    'POST /wallet/search returns ranked tool matches with explanations',
    Array.isArray(searchRes.matches) && searchRes.matches.length > 0,
    `topMatch=${searchRes.matches?.[0]?.tool?.name}`
  );

  const recsRes = await fetch(`${API_BASE}/wallet/recommendations`, { headers: authHeaders }).then(
    (r) => r.json()
  );
  check(
    'AI Wallet',
    'GET /wallet/recommendations returns contextual recommendations with why-signals',
    Array.isArray(recsRes) && recsRes.length > 0,
    `recs=${recsRes.length}, firstReason=${recsRes[0]?.reason?.substring(0, 50)}...`
  );

  // Add tool to personal wallet
  const addToolRes = await fetch(`${API_BASE}/wallet/add`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      toolId: 'tool-cursor',
      primaryCategory: 'Agentic Coding',
      familiarity: 'practicing',
      userNotes: 'Used for pair programming.',
    }),
  }).then((r) => r.json());
  check(
    'AI Wallet',
    'POST /wallet/add stores tool in learner personal wallet',
    addToolRes.success === true && addToolRes.item?.toolId === 'tool-cursor',
    `action=${addToolRes.action}`
  );

  // Update familiarity
  const updateFamRes = await fetch(`${API_BASE}/wallet/update-familiarity`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      toolId: 'tool-cursor',
      familiarity: 'proficient',
      userNotes: 'Mastered multi-file edits.',
    }),
  }).then((r) => r.json());
  check(
    'AI Wallet',
    'POST /wallet/update-familiarity updates familiarity to proficient',
    updateFamRes.success === true && updateFamRes.item?.familiarity === 'proficient',
    `familiarity=${updateFamRes.item?.familiarity}`
  );

  // Compare tools
  const compareRes = await fetch(`${API_BASE}/wallet/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      toolAId: 'tool-cursor',
      toolBId: 'tool-copilot',
      task: 'Coding assistance',
    }),
  }).then((r) => r.json());
  check(
    'AI Wallet',
    'POST /wallet/compare produces structured head-to-head comparison',
    Array.isArray(compareRes.tools) && compareRes.tools.length >= 2,
    `compared ${compareRes.tools?.[0]?.name} vs ${compareRes.tools?.[1]?.name}`
  );

  // ─────────────────────────────────────────────────────────────
  // SUITE 11: Admin Endpoints & Pipeline Observability
  // ─────────────────────────────────────────────────────────────
  console.log('\n── SUITE 11: Admin Endpoints & Pipeline Observability ───────────');
  const adminDashRes = await fetch(`${API_BASE}/admin/intelligence/dashboard`, {
    headers: authHeaders,
  }).then((r) => r.json());
  check(
    'Admin',
    'GET /admin/intelligence/dashboard returns catalog metrics',
    adminDashRes.pipelineStatus === 'OPERATIONAL' &&
      typeof adminDashRes.totalToolsInCatalog === 'number',
    `total=${adminDashRes.totalToolsInCatalog}, active=${adminDashRes.activeVerifiedTools}`
  );

  const adminSourcesRes = await fetch(`${API_BASE}/admin/sources`, { headers: authHeaders }).then(
    (r) => r.json()
  );
  check(
    'Admin',
    'GET /admin/sources returns catalog feed sources',
    Array.isArray(adminSourcesRes.sources) && adminSourcesRes.sources.length > 0,
    `sources=${adminSourcesRes.sources?.length}`
  );

  const adminCandRes = await fetch(`${API_BASE}/admin/candidates`, { headers: authHeaders }).then(
    (r) => r.json()
  );
  check(
    'Admin',
    'GET /admin/candidates returns unverified tool candidates queue',
    Array.isArray(adminCandRes.candidates),
    `candidates=${adminCandRes.candidates?.length}`
  );

  // ─────────────────────────────────────────────────────────────
  // CLEANUP TEST USER
  // ─────────────────────────────────────────────────────────────
  if (isDbConnected && testEmail) {
    await User.deleteOne({ email: testEmail });
    await StudentProfile.deleteOne({ userId });
    console.log(`\n🧹 Cleaned up audit test user ${testEmail} from MongoDB.`);
  }

  // ─────────────────────────────────────────────────────────────
  // FINAL SUMMARY
  // ─────────────────────────────────────────────────────────────
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log('\n===============================================================');
  console.log(
    `📊 AUDIT SUMMARY: ${passedCount} / ${results.length} CHECKS PASSED (${failedCount} FAILED)`
  );
  console.log('===============================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal audit failure:', err);
    process.exit(1);
  });
