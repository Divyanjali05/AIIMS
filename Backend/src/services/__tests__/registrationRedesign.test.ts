/**
 * registrationRedesign.test.ts
 * =========================================================
 * AIIMS Dynamic Student Academic Registration & Entrepreneur Onboarding Test Suite
 *
 * Verifies:
 *  1. Academic taxonomy & dynamic program duration helpers (B.Tech, BCA, MCA, MBA, MBBS).
 *  2. Calendar-agnostic dynamic start year and graduation year generation.
 *  3. Student registration with dynamic duration constraints, cohort binding, and welcome grant.
 *  4. Custom college / institute free-text support (null instituteId + custom instituteName).
 *  5. Rejection of invalid academic dates (graduation <= start, year > duration, future start).
 *  6. Dedicated Entrepreneur registration with venture details, no cohort creation, and welcome grant.
 *  7. Entrepreneur ideation stage with optional / exploratory venture name.
 *  8. Strict cross-track field isolation (student rejecting venture fields, entrepreneur rejecting academic fields).
 *  9. Session & profile retrieval (login & getMe returning proper specialized profile).
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../../config/prisma';
import { resetPrismaTestDouble, uninstallPrismaTestDouble } from './helpers/prismaTestDouble';
import { register, login, getMe } from '../../controllers/auth.controller';
import {
  getProgramDuration,
  getStudyYearsForProgram,
  getDynamicStartYears,
  deriveExpectedGraduationYear,
  getDynamicGraduationYears,
  validateStudentAcademicDates,
  VENTURE_STAGES,
  VENTURE_INDUSTRIES,
} from '../../config/academicTaxonomy';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

function createMockReq(overrides: Record<string, any> = {}): AuthenticatedRequest {
  const req: any = {
    headers: {},
    body: {},
    cookies: {},
    query: {},
    params: {},
    method: 'GET',
    ...overrides,
  };
  return req as AuthenticatedRequest;
}

function createMockRes() {
  const res: any = {
    statusCode: 200,
    data: null,
    cookiesCleared: {},
    cookiesSet: {},
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: any) {
      res.data = body;
      return res;
    },
    cookie(name: string, val: any, opts: any) {
      res.cookiesSet[name] = { val, opts };
      return res;
    },
    clearCookie(name: string, opts: any) {
      res.cookiesCleared[name] = opts;
      return res;
    },
  };
  return res;
}

describe('AIIMS Registration Redesign: Student Dynamic Academics & Entrepreneur Onboarding', () => {
  beforeEach(() => {
    resetPrismaTestDouble(true);
  });

  afterAll(() => {
    uninstallPrismaTestDouble();
  });

  // =========================================================================
  // 1. DYNAMIC TAXONOMY & PROGRAM DURATION HELPERS
  // =========================================================================
  describe('1. Academic Taxonomy & Program Duration Functions', () => {
    it('returns correct program duration for known degrees and default fallback', () => {
      expect(getProgramDuration('btech')).toBe(4);
      expect(getProgramDuration('be')).toBe(4);
      expect(getProgramDuration('bca')).toBe(3);
      expect(getProgramDuration('bsc')).toBe(3);
      expect(getProgramDuration('bba')).toBe(3);
      expect(getProgramDuration('mca')).toBe(2);
      expect(getProgramDuration('mba')).toBe(2);
      expect(getProgramDuration('mtech')).toBe(2);
      expect(getProgramDuration('mbbs')).toBe(5);
      expect(getProgramDuration('unknown_prog')).toBe(4); // Default fallback
    });

    it('generates correct study year arrays [1..D] matching program duration', () => {
      expect(getStudyYearsForProgram('btech')).toEqual([1, 2, 3, 4]);
      expect(getStudyYearsForProgram('bca')).toEqual([1, 2, 3]);
      expect(getStudyYearsForProgram('mca')).toEqual([1, 2]);
      expect(getStudyYearsForProgram('mbbs')).toEqual([1, 2, 3, 4, 5]);
    });

    it('dynamically derives expected graduation year from start year and duration', () => {
      // 4-year B.Tech started in 2023 -> 2027
      expect(deriveExpectedGraduationYear(2023, 'btech')).toBe(2027);
      // 2-year MCA started in 2024 -> 2026
      expect(deriveExpectedGraduationYear(2024, 'mca')).toBe(2026);
      // 3-year BCA started in 2022 -> 2025
      expect(deriveExpectedGraduationYear(2022, 'bca')).toBe(2025);
    });

    it('dynamically calculates dynamic start years relative to calendar year', () => {
      const baseYear = 2026;
      const startYears4Yr = getDynamicStartYears('btech', baseYear);
      // Window is [2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019]
      expect(startYears4Yr).toContain(2026);
      expect(startYears4Yr).toContain(2023);
      expect(startYears4Yr[0]).toBe(2027);
      expect(startYears4Yr[startYears4Yr.length - 1]).toBe(2019);
    });

    it('generates graduation year options accommodating standard duration and extensions', () => {
      const gradYears = getDynamicGraduationYears('btech', 2023, 2, 2026);
      // Standard is 2027 (2023 + 4), plus extension options
      expect(gradYears).toContain(2027);
      expect(gradYears).toContain(2028);
      expect(gradYears).toContain(2029);
      expect(gradYears).toContain(2030);
      expect(gradYears.every((yr) => yr > 2023)).toBe(true);
    });

    it('validates academic date consistency correctly', () => {
      const baseYear = 2026;
      // Valid B.Tech: started 2023, year 3, grad 2027
      const validCheck = validateStudentAcademicDates(2023, 3, 2027, 'btech', baseYear);
      expect(validCheck.valid).toBe(true);

      // Invalid: Year of study exceeds program duration (Year 3 of 2-year MCA)
      const invalidStudyYear = validateStudentAcademicDates(2024, 3, 2026, 'mca', baseYear);
      expect(invalidStudyYear.valid).toBe(false);
      expect(invalidStudyYear.reason).toContain('Study year must be between 1 and 2');

      // Invalid: Graduation year <= start year
      const invalidGradYear = validateStudentAcademicDates(2024, 1, 2024, 'btech', baseYear);
      expect(invalidGradYear.valid).toBe(false);
      expect(invalidGradYear.reason).toContain(
        'Expected graduation year must be after academic start year'
      );

      // Invalid: Future start year beyond next academic year
      const invalidStartYear = validateStudentAcademicDates(2028, 1, 2032, 'btech', baseYear);
      expect(invalidStartYear.valid).toBe(false);
      expect(invalidStartYear.reason).toContain(
        'Start year cannot be further than the next academic year'
      );
    });

    it('exposes comprehensive venture stage and industry taxonomies for entrepreneurs', () => {
      expect(VENTURE_STAGES.length).toBeGreaterThanOrEqual(7);
      expect(VENTURE_STAGES.map((s) => s.value)).toContain('exploring_idea');
      expect(VENTURE_STAGES.map((s) => s.value)).toContain('mvp_development');
      expect(VENTURE_STAGES.map((s) => s.value)).toContain('scaling_business');
      expect(VENTURE_INDUSTRIES.length).toBeGreaterThanOrEqual(10);
    });
  });

  // =========================================================================
  // 2. DYNAMIC STUDENT REGISTRATION FLOW
  // =========================================================================
  describe('2. Dynamic Student Registration Flow', () => {
    it('successfully registers student with 4-year B.Tech program, creates cohort and grants +500 AC', async () => {
      const email = 'divya.student@aiims.test';
      const currentYear = new Date().getFullYear();
      const startYear = currentYear - 2; // e.g. 2024
      const expectedGradYear = startYear + 4; // e.g. 2028

      const req = createMockReq({
        method: 'POST',
        headers: {
          'x-client': 'web',
          'x-device-id': 'device-student-001',
        },
        body: {
          name: 'Divya Student',
          email,
          password: 'Password123!',
          confirmPassword: 'Password123!',
          track: 'Student',
          collegeName: 'Indian Institute of Information Technology',
          stream: 'TECH',
          educationLevel: 'UNDERGRADUATE',
          programId: 'btech',
          specializationId: 'cs',
          yearOfStudy: 3,
          admissionYear: startYear,
          expectedGraduationYear: expectedGradYear,
          aiFamiliarity: 'EXPLORING_AI',
          primaryGoal: 'BUILD_SOFTWARE',
        },
      });
      const res = createMockRes();

      await register(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.data.user).toBeDefined();
      expect(res.data.user.email).toBe(email);
      expect(res.data.user.track).toBe('Student');
      expect(res.data.user.aiimsCredits).toBe(500);

      // Verify User record in DB
      const user = await prisma.user.findUnique({ where: { email } });
      expect(user).toBeDefined();
      expect(user?.aiimsCredits).toBe(500);

      // Verify StudentProfile
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: user!.id },
      });
      expect(studentProfile).toBeDefined();
      expect(studentProfile?.programId).toBe('btech');
      expect(studentProfile?.yearOfStudy).toBe(3);
      expect(studentProfile?.admissionYear).toBe(startYear);
      expect(studentProfile?.expectedGraduationYear).toBe(expectedGradYear);

      // Verify Cohort created for Student
      const cohort = await prisma.cohort.findFirst({
        where: { instituteId: studentProfile!.instituteId },
      });
      expect(cohort).toBeDefined();
      expect(cohort?.programId).toBe('btech');

      // Verify Authoritative CreditLedger Welcome Grant
      const ledger = await prisma.creditLedger.findMany({ where: { userId: user!.id } });
      expect(ledger.length).toBe(1);
      expect(ledger[0].amount).toBe(500);
      expect(ledger[0].balanceAfter).toBe(500);
      expect(ledger[0].type).toBe('EARN');
      expect(ledger[0].category).toBe('REWARD');
      expect(ledger[0].idempotencyKey).toContain('welcome');
    });

    it('successfully handles custom college entry when college is not in pre-seeded catalog', async () => {
      const email = 'custom.college@aiims.test';
      const customCollege = 'Apex Autonomous Institute of Emerging Technologies';
      const currentYear = new Date().getFullYear();

      const req = createMockReq({
        method: 'POST',
        headers: { 'x-device-id': 'device-custom-college' },
        body: {
          name: 'College Explorer',
          email,
          password: 'Password123!',
          confirmPassword: 'Password123!',
          track: 'Student',
          collegeName: customCollege,
          // Note: instituteId is omitted because "My college is not listed" was chosen
          stream: 'TECH',
          educationLevel: 'UNDERGRADUATE',
          programId: 'bca',
          specializationId: 'data_science',
          yearOfStudy: 2,
          admissionYear: currentYear - 1,
          expectedGraduationYear: currentYear + 2,
          aiFamiliarity: 'FREQUENT_USER',
          primaryGoal: 'ACADEMIC_EXCELLENCE',
        },
      });
      const res = createMockRes();

      await register(req, res);

      expect(res.statusCode).toBe(201);
      const user = await prisma.user.findUnique({ where: { email } });
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: user!.id },
      });

      expect(studentProfile).toBeDefined();
      expect(studentProfile?.instituteName).toBe(customCollege);
      expect(studentProfile?.instituteId).toBeNull();
      expect(studentProfile?.programId).toBe('bca');
      expect(studentProfile?.yearOfStudy).toBe(2);
    });

    it('rejects student registration when study year exceeds program duration (HTTP 400)', async () => {
      const currentYear = new Date().getFullYear();
      const req = createMockReq({
        method: 'POST',
        body: {
          name: 'Overyear Student',
          email: 'overyear@aiims.test',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          track: 'Student',
          collegeName: 'National Business School',
          stream: 'NON_TECH',
          educationLevel: 'POSTGRADUATE',
          programId: 'mba', // MBA has normal duration 2 years
          specializationId: 'finance',
          yearOfStudy: 3, // Invalid: exceeds 2-year duration
          admissionYear: currentYear - 2,
          expectedGraduationYear: currentYear + 1,
          aiFamiliarity: 'BEGINNER',
          primaryGoal: 'CAREER_PIVOT',
        },
      });
      const res = createMockRes();

      await register(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.data.code).toBe('INVALID_INPUT');
      expect(res.data.error).toMatch(/year of study/i);
    });

    it('rejects student registration when graduation year is less than or equal to start year (HTTP 400)', async () => {
      const currentYear = new Date().getFullYear();
      const req = createMockReq({
        method: 'POST',
        body: {
          name: 'Invalid Dates Student',
          email: 'invalid.dates@aiims.test',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          track: 'Student',
          collegeName: 'Tech University',
          stream: 'TECH',
          educationLevel: 'UNDERGRADUATE',
          programId: 'btech',
          specializationId: 'cs',
          yearOfStudy: 1,
          admissionYear: currentYear,
          expectedGraduationYear: currentYear - 1, // Invalid: graduation before start
          aiFamiliarity: 'BEGINNER',
          primaryGoal: 'BUILD_SOFTWARE',
        },
      });
      const res = createMockRes();

      await register(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.data.code).toBe('INVALID_INPUT');
      expect(res.data.error).toMatch(/graduation year/i);
    });
  });

  // =========================================================================
  // 3. INDEPENDENT ENTREPRENEUR ONBOARDING FLOW
  // =========================================================================
  describe('3. Independent Entrepreneur Onboarding Flow', () => {
    it('successfully registers Entrepreneur with complete venture profile and awards +500 AC', async () => {
      const email = 'priya.founder@aiims.test';
      const req = createMockReq({
        method: 'POST',
        headers: {
          'x-client': 'web',
          'x-device-id': 'device-founder-001',
        },
        body: {
          name: 'Priya Sharma',
          email,
          password: 'Password123!',
          confirmPassword: 'Password123!',
          track: 'Entrepreneur',
          ventureName: 'HealthPulse AI',
          industry: 'HEALTHCARE',
          problemStatement:
            'Automating outpatient clinical documentation to save doctors 2 hours per day.',
          ventureStage: 'mvp_development',
          primaryGoal: 'LAUNCH_MVP',
          skillsToDevelop: ['AI_PROMPT_ENGINEERING', 'TECH_ARCHITECTURE'],
          businessChallenges: ['TECHNICAL_FEASIBILITY', 'GO_TO_MARKET'],
          preferredSupport: ['AI_WORKFLOW_TEMPLATES', 'EXPERT_EVALUATION'],
        },
      });
      const res = createMockRes();

      await register(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.data.user).toBeDefined();
      expect(res.data.user.email).toBe(email);
      expect(res.data.user.track).toBe('Entrepreneur');
      expect(res.data.user.aiimsCredits).toBe(500);

      // Verify User record in DB
      const user = await prisma.user.findUnique({ where: { email } });
      expect(user).toBeDefined();
      expect(user?.role).toBe('learner');
      expect(user?.track).toBe('Entrepreneur');
      expect(user?.aiimsCredits).toBe(500);

      // Verify EntrepreneurProfile created in DB
      const entrepreneurProfile = await prisma.entrepreneurProfile.findUnique({
        where: { userId: user!.id },
      });
      expect(entrepreneurProfile).toBeDefined();
      expect(entrepreneurProfile?.fullName).toBe('Priya Sharma');
      expect(entrepreneurProfile?.ventureName).toBe('HealthPulse AI');
      expect(entrepreneurProfile?.industry).toBe('HEALTHCARE');
      expect(entrepreneurProfile?.problemStatement).toContain(
        'Automating outpatient clinical documentation'
      );
      expect(entrepreneurProfile?.ventureStage).toBe('mvp_development');
      expect(entrepreneurProfile?.primaryGoal).toBe('LAUNCH_MVP');
      expect(entrepreneurProfile?.skillsToDevelop).toEqual([
        'AI_PROMPT_ENGINEERING',
        'TECH_ARCHITECTURE',
      ]);
      expect(entrepreneurProfile?.businessChallenges).toEqual([
        'TECHNICAL_FEASIBILITY',
        'GO_TO_MARKET',
      ]);
      expect(entrepreneurProfile?.preferredSupport).toEqual([
        'AI_WORKFLOW_TEMPLATES',
        'EXPERT_EVALUATION',
      ]);
      expect(entrepreneurProfile?.isComplete).toBe(true);

      // Invariant: Entrepreneurs MUST NOT have StudentProfile or Cohort records
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: user!.id },
      });
      expect(studentProfile).toBeNull();

      const cohorts = await prisma.cohort.findMany();
      expect(cohorts.length).toBe(0);

      // Invariant: Authoritative CreditLedger contains +500 AC welcome grant
      const ledgerEntries = await prisma.creditLedger.findMany({ where: { userId: user!.id } });
      expect(ledgerEntries.length).toBe(1);
      expect(ledgerEntries[0].amount).toBe(500);
      expect(ledgerEntries[0].balanceAfter).toBe(500);
      expect(ledgerEntries[0].type).toBe('EARN');
      expect(ledgerEntries[0].category).toBe('REWARD');
      expect(ledgerEntries[0].idempotencyKey).toContain('welcome');

      // Invariant: AI Wallet has audienceMode set to 'entrepreneur'
      const walletData =
        typeof user?.aiWalletData === 'string' ? JSON.parse(user.aiWalletData) : user?.aiWalletData;
      expect(walletData?.audienceMode).toBe('entrepreneur');
    });

    it('successfully handles ideation stage entrepreneur with optional / exploring venture name', async () => {
      const email = 'ideator.sam@aiims.test';
      const req = createMockReq({
        method: 'POST',
        headers: { 'x-device-id': 'device-ideator-001' },
        body: {
          name: 'Sam Ideator',
          email,
          password: 'Password123!',
          confirmPassword: 'Password123!',
          track: 'Entrepreneur',
          ventureName: 'Not started yet / Exploring ideas',
          industry: 'EDUCATION',
          problemStatement:
            'Exploring generative AI applications for vocational education in Tier-2 colleges.',
          ventureStage: 'exploring_idea',
          primaryGoal: 'FIND_COFOUNDER',
          skillsToDevelop: ['AI_PROMPT_ENGINEERING'],
          businessChallenges: ['IDEA_VALIDATION'],
          preferredSupport: ['AI_TOOL_DISCOVERY'],
        },
      });
      const res = createMockRes();

      await register(req, res);

      expect(res.statusCode).toBe(201);
      const user = await prisma.user.findUnique({ where: { email } });
      const entrepreneurProfile = await prisma.entrepreneurProfile.findUnique({
        where: { userId: user!.id },
      });

      expect(entrepreneurProfile).toBeDefined();
      expect(entrepreneurProfile?.ventureStage).toBe('exploring_idea');
      expect(entrepreneurProfile?.ventureName).toBe('Not started yet / Exploring ideas');
      expect(entrepreneurProfile?.primaryGoal).toBe('FIND_COFOUNDER');
    });

    it('rejects entrepreneur registration when ventureStage is invalid (HTTP 400)', async () => {
      const req = createMockReq({
        method: 'POST',
        body: {
          name: 'Invalid Stage Founder',
          email: 'invalidstage@aiims.test',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          track: 'Entrepreneur',
          industry: 'FINTECH',
          ventureStage: 'unicorn_ipo_unsupported', // Invalid venture stage
        },
      });
      const res = createMockRes();

      await register(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.data.code).toBe('INVALID_INPUT');
      expect(res.data.error).toMatch(/venture stage/i);
    });
  });

  // =========================================================================
  // 4. CROSS-TRACK FIELD ISOLATION & CONTAMINATION DEFENSE
  // =========================================================================
  describe('4. Cross-Track Field Isolation & Validation Guards', () => {
    it('rejects student track registration when contaminated with entrepreneur fields (HTTP 400)', async () => {
      const currentYear = new Date().getFullYear();
      const req = createMockReq({
        method: 'POST',
        body: {
          name: 'Polluted Student',
          email: 'polluted.student@aiims.test',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          track: 'Student',
          collegeName: 'Tech College',
          stream: 'TECH',
          educationLevel: 'UNDERGRADUATE',
          programId: 'btech',
          specializationId: 'cs',
          yearOfStudy: 2,
          admissionYear: currentYear - 1,
          expectedGraduationYear: currentYear + 3,
          // Contaminating entrepreneur fields:
          ventureStage: 'early_stage',
          problemStatement: 'Attempting to sneak venture problem into student registration',
        },
      });
      const res = createMockRes();

      await register(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.data.code).toBe('INVALID_INPUT');
      expect(res.data.error).toMatch(/entrepreneur.*not permitted/i);
    });

    it('rejects entrepreneur track registration when contaminated with student academic fields (HTTP 400)', async () => {
      const req = createMockReq({
        method: 'POST',
        body: {
          name: 'Polluted Entrepreneur',
          email: 'polluted.entrepreneur@aiims.test',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          track: 'Entrepreneur',
          ventureName: 'CloudScale',
          industry: 'TECHNOLOGY',
          ventureStage: 'early_stage',
          // Contaminating student academic fields:
          stream: 'TECH',
          educationLevel: 'UNDERGRADUATE',
          programId: 'btech',
          yearOfStudy: 3,
        },
      });
      const res = createMockRes();

      await register(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.data.code).toBe('INVALID_INPUT');
      expect(res.data.error).toMatch(/student academic fields are not permitted/i);
    });
  });

  // =========================================================================
  // 5. SESSION & SPECIALIZED PROFILE RETRIEVAL (LOGIN & GETME)
  // =========================================================================
  describe('5. Profile Retrieval in Login & getMe', () => {
    it('returns academicProfile on login and getMe for Student, with no entrepreneurProfile', async () => {
      const email = 'student.login@aiims.test';
      const password = 'Password123!';
      const currentYear = new Date().getFullYear();

      // Register student
      const regReq = createMockReq({
        method: 'POST',
        headers: { 'x-device-id': 'device-student-login' },
        body: {
          name: 'Login Student',
          email,
          password,
          confirmPassword: password,
          track: 'Student',
          collegeName: 'Govt Engg College',
          stream: 'TECH',
          educationLevel: 'UNDERGRADUATE',
          programId: 'btech',
          specializationId: 'it',
          yearOfStudy: 4,
          admissionYear: currentYear - 3,
          expectedGraduationYear: currentYear + 1,
        },
      });
      const regRes = createMockRes();
      await register(regReq, regRes);
      expect(regRes.statusCode).toBe(201);

      // Login as student
      const loginReq = createMockReq({
        method: 'POST',
        headers: { 'x-device-id': 'device-student-login' },
        body: { email, password },
      });
      const loginRes = createMockRes();
      await login(loginReq, loginRes);

      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.data.user.track).toBe('Student');
      expect(loginRes.data.state.academicProfile).toBeDefined();
      expect(loginRes.data.state.academicProfile.programId).toBe('btech');
      expect(loginRes.data.state.academicProfile.yearOfStudy).toBe(4);
      expect(loginRes.data.state.entrepreneurProfile).toBeUndefined();

      // getMe as student
      const getMeReq = createMockReq({
        user: {
          userId: loginRes.data.user.id,
          id: loginRes.data.user.id,
          email,
          role: 'learner',
          track: 'Student',
          tokenVersion: 0,
        },
      });
      const getMeRes = createMockRes();
      await getMe(getMeReq, getMeRes);

      expect(getMeRes.statusCode).toBe(200);
      expect(getMeRes.data.state.academicProfile).toBeDefined();
      expect(getMeRes.data.state.academicProfile.programId).toBe('btech');
      expect(getMeRes.data.state.entrepreneurProfile).toBeUndefined();
    });

    it('returns entrepreneurProfile on login and getMe for Entrepreneur, with no academicProfile', async () => {
      const email = 'founder.login@aiims.test';
      const password = 'Password123!';

      // Register entrepreneur
      const regReq = createMockReq({
        method: 'POST',
        headers: { 'x-device-id': 'device-founder-login' },
        body: {
          name: 'Login Founder',
          email,
          password,
          confirmPassword: password,
          track: 'Entrepreneur',
          ventureName: 'OmniAI Retail',
          industry: 'ECOMMERCE',
          problemStatement:
            'Autonomous checkout and inventory optimization for mid-sized retail outlets.',
          ventureStage: 'operating_business',
          primaryGoal: 'FUNDRAISING',
          skillsToDevelop: ['AI_AGENT_ORCHESTRATION'],
          businessChallenges: ['SCALING_INFRASTRUCTURE'],
          preferredSupport: ['AI_WORKFLOW_TEMPLATES'],
        },
      });
      const regRes = createMockRes();
      await register(regReq, regRes);
      expect(regRes.statusCode).toBe(201);

      // Login as entrepreneur
      const loginReq = createMockReq({
        method: 'POST',
        headers: { 'x-device-id': 'device-founder-login' },
        body: { email, password },
      });
      const loginRes = createMockRes();
      await login(loginReq, loginRes);

      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.data.user.track).toBe('Entrepreneur');
      expect(loginRes.data.state.entrepreneurProfile).toBeDefined();
      expect(loginRes.data.state.entrepreneurProfile.ventureName).toBe('OmniAI Retail');
      expect(loginRes.data.state.entrepreneurProfile.ventureStage).toBe('operating_business');
      expect(loginRes.data.state.academicProfile).toBeUndefined();

      // getMe as entrepreneur
      const getMeReq = createMockReq({
        user: {
          userId: loginRes.data.user.id,
          id: loginRes.data.user.id,
          email,
          role: 'learner',
          track: 'Entrepreneur',
          tokenVersion: 0,
        },
      });
      const getMeRes = createMockRes();
      await getMe(getMeReq, getMeRes);

      expect(getMeRes.statusCode).toBe(200);
      expect(getMeRes.data.state.entrepreneurProfile).toBeDefined();
      expect(getMeRes.data.state.entrepreneurProfile.ventureName).toBe('OmniAI Retail');
      expect(getMeRes.data.state.entrepreneurProfile.ventureStage).toBe('operating_business');
      expect(getMeRes.data.state.academicProfile).toBeUndefined();
    });
  });
});
