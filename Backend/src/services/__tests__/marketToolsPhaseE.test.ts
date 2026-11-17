import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../config/prisma';
import { installPrismaTestDouble, resetPrismaTestDouble } from './helpers/prismaTestDouble';
import {
  adminListToolReports,
  adminGetToolReportById,
  adminUpdateToolReportStatus,
} from '../../controllers/admin.controller';
import { reportOutdatedTool } from '../../controllers/aiWallet.controller';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { ToolCatalogService } from '../wallet/toolCatalog.service';

function createMockReq(
  user: any,
  body: Record<string, any> = {},
  query: Record<string, any> = {},
  params: Record<string, any> = {}
): AuthenticatedRequest {
  return {
    user,
    headers: { 'x-client': 'web' },
    body,
    query,
    params,
  } as AuthenticatedRequest;
}

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('AIIMS Market AI Tools Catalog — Phase E Admin Quality Assurance & Report Review Suite', () => {
  const LEARNER_USER_ID = 'learner-phase-e-tester-01';
  const ADMIN_USER_ID = 'admin-phase-e-qa-reviewer-01';

  const mockLearnerUser = {
    id: LEARNER_USER_ID,
    email: 'learner.qa@aiims.test',
    name: 'Learner QA Tester',
    role: 'learner',
    isActive: true,
  };

  const mockAdminUser = {
    id: ADMIN_USER_ID,
    email: 'admin.qa@aiims.test',
    name: 'Admin QA Reviewer',
    role: 'admin',
    isActive: true,
  };

  beforeEach(async () => {
    installPrismaTestDouble();
    resetPrismaTestDouble(true);
    ToolCatalogService.initializeCatalog();

    // Seed test users
    await prisma.user.create({
      data: {
        id: LEARNER_USER_ID,
        email: mockLearnerUser.email,
        name: mockLearnerUser.name,
        role: 'learner',
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        id: ADMIN_USER_ID,
        email: mockAdminUser.email,
        name: mockAdminUser.name,
        role: 'admin',
        isActive: true,
      },
    });

    // Seed a canonical tool in AiTool table
    await prisma.aiTool.create({
      data: {
        id: 'tool-chatgpt',
        name: 'ChatGPT',
        provider: 'OpenAI',
        description: 'Advanced conversational AI and reasoning model.',
        officialWebsite: 'https://chatgpt.com',
        category: 'Conversation AI',
        marketTier: 3,
        pricingDetails: {
          type: 'FREEMIUM',
          summary: 'Free tier with Plus at $20/mo',
          freeTierAvailable: true,
        },
        firstSeenAt: '2026-01-01',
        lastVerifiedAt: '2026-03-01',
        lastUpdatedAt: '2026-03-01',
      },
    });

    // Seed a second canonical tool in AiTool table
    await prisma.aiTool.create({
      data: {
        id: 'tool-claude',
        name: 'Claude',
        provider: 'Anthropic',
        description: 'Safety-focused AI assistant with large context window.',
        officialWebsite: 'https://claude.ai',
        category: 'Conversation AI',
        marketTier: 3,
        pricingDetails: {
          type: 'FREEMIUM',
          summary: 'Free tier with Pro at $20/mo',
          freeTierAvailable: true,
        },
        firstSeenAt: '2026-01-01',
        lastVerifiedAt: '2026-03-01',
        lastUpdatedAt: '2026-03-01',
      },
    });
  });

  // --------------------------------------------------------------------------
  // Suite 1: Role-Based Authorization & Learner Access Denial
  // --------------------------------------------------------------------------
  describe('1. Role-Based Access Control & Security Guards', () => {
    it('1A: Unauthenticated caller is blocked with HTTP 401', async () => {
      const guard = requireRole('admin');
      const req = createMockReq(null);
      const res = createMockRes();
      let nextCalled = false;

      guard(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('1B: Learner caller is rejected with HTTP 403 FORBIDDEN', async () => {
      const guard = requireRole('admin');
      const req = createMockReq(mockLearnerUser);
      const res = createMockRes();
      let nextCalled = false;

      guard(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('1C: Admin caller passes authorization guard to access admin QA endpoints', async () => {
      const guard = requireRole('admin');
      const req = createMockReq(mockAdminUser);
      const res = createMockRes();
      let nextCalled = false;

      guard(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
    });

    it('1D: Disabled admin account is blocked with HTTP 403 ACCOUNT_DISABLED', async () => {
      const guard = requireRole('admin');
      const disabledAdmin = { ...mockAdminUser, isActive: false };
      const req = createMockReq(disabledAdmin);
      const res = createMockRes();
      let nextCalled = false;

      guard(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('ACCOUNT_DISABLED');
    });
  });

  // --------------------------------------------------------------------------
  // Suite 2: Report Listing, Filtering & Metrics Breakdown
  // --------------------------------------------------------------------------
  describe('2. Admin Report Listing, Filtering & Metrics Breakdown', () => {
    beforeEach(async () => {
      // Create reports with varied statuses and categories
      await prisma.toolReport.create({
        data: {
          id: 'report-001',
          toolId: 'tool-chatgpt',
          userId: LEARNER_USER_ID,
          reportCategory: 'PRICING_OUTDATED',
          description: 'OpenAI announced new Plus pricing model.',
          sourceUrl: 'https://openai.com/pricing',
          status: 'PENDING',
        },
      });

      await prisma.toolReport.create({
        data: {
          id: 'report-002',
          toolId: 'tool-chatgpt',
          userId: LEARNER_USER_ID,
          reportCategory: 'LINK_BROKEN',
          description: 'Documentation link is returning HTTP 404.',
          sourceUrl: 'https://chatgpt.com/docs',
          status: 'UNDER_REVIEW',
          reviewerId: ADMIN_USER_ID,
          reviewNotes: 'Investigating documentation URL redirection.',
        },
      });

      await prisma.toolReport.create({
        data: {
          id: 'report-003',
          toolId: 'tool-claude',
          userId: LEARNER_USER_ID,
          reportCategory: 'TIER_INCORRECT',
          description: 'Claude 3.7 Sonnet hybrid reasoning warrants Tier 4 review.',
          sourceUrl: 'https://anthropic.com/claude',
          status: 'RESOLVED',
          reviewerId: ADMIN_USER_ID,
          reviewNotes: 'Evaluated against Tier 4 enterprise criteria; retained Tier 3 for base.',
        },
      });

      await prisma.toolReport.create({
        data: {
          id: 'report-004',
          toolId: 'tool-claude',
          userId: LEARNER_USER_ID,
          reportCategory: 'OTHER',
          description: 'Unsubstantiated competitor claim without source.',
          status: 'REJECTED',
          reviewerId: ADMIN_USER_ID,
          reviewNotes: 'No official vendor evidence provided.',
        },
      });
    });

    it('2A: Lists all reports with correct status breakdown metrics', async () => {
      const req = createMockReq(mockAdminUser);
      const res = createMockRes();

      await adminListToolReports(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(4);
      expect(res.body.metrics).toEqual({
        pending: 1,
        underReview: 1,
        resolved: 1,
        rejected: 1,
        total: 4,
      });
      expect(res.body.reports.length).toBe(4);
    });

    it('2B: Filters reports by status (PENDING)', async () => {
      const req = createMockReq(mockAdminUser, {}, { status: 'PENDING' });
      const res = createMockRes();

      await adminListToolReports(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.reports[0].id).toBe('report-001');
      expect(res.body.reports[0].status).toBe('PENDING');
    });

    it('2C: Filters reports by category (PRICING_OUTDATED)', async () => {
      const req = createMockReq(mockAdminUser, {}, { category: 'PRICING_OUTDATED' });
      const res = createMockRes();

      await adminListToolReports(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.reports[0].id).toBe('report-001');
      expect(res.body.reports[0].reportCategory).toBe('PRICING_OUTDATED');
    });

    it('2D: Searches reports by tool name (Claude)', async () => {
      const req = createMockReq(mockAdminUser, {}, { search: 'Claude' });
      const res = createMockRes();

      await adminListToolReports(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.reports.every((r: any) => r.toolId === 'tool-claude')).toBe(true);
    });

    it('2E: Rejects invalid status query parameter with HTTP 400', async () => {
      const req = createMockReq(mockAdminUser, {}, { status: 'INVALID_STATUS' });
      const res = createMockRes();

      await adminListToolReports(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_REPORT_STATUS');
    });

    it('2F: Rejects invalid category query parameter with HTTP 400', async () => {
      const req = createMockReq(mockAdminUser, {}, { category: 'SPAM_NOT_REAL' });
      const res = createMockRes();

      await adminListToolReports(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_REPORT_CATEGORY');
    });
  });

  // --------------------------------------------------------------------------
  // Suite 3: Report Detail Retrieval & Associated Tool Data
  // --------------------------------------------------------------------------
  describe('3. Report Detail Retrieval', () => {
    beforeEach(async () => {
      await prisma.toolReport.create({
        data: {
          id: 'report-detail-test',
          toolId: 'tool-chatgpt',
          userId: LEARNER_USER_ID,
          reportCategory: 'PRICING_OUTDATED',
          description: 'Team plan pricing was updated from $25 to $30.',
          sourceUrl: 'https://openai.com/chatgpt/pricing',
          status: 'PENDING',
        },
      });
    });

    it('3A: Retrieves full detail of report with associated catalog tool and reporter info', async () => {
      const req = createMockReq(mockAdminUser, {}, {}, { id: 'report-detail-test' });
      const res = createMockRes();

      await adminGetToolReportById(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.report.id).toBe('report-detail-test');
      expect(res.body.report.toolId).toBe('tool-chatgpt');
      expect(res.body.report.tool.name).toBe('ChatGPT');
      expect(res.body.report.tool.provider).toBe('OpenAI');
      expect(res.body.report.reporter.id).toBe(LEARNER_USER_ID);
    });

    it('3B: Returns HTTP 404 REPORT_NOT_FOUND for non-existent report ID', async () => {
      const req = createMockReq(mockAdminUser, {}, {}, { id: 'non-existent-report-999' });
      const res = createMockRes();

      await adminGetToolReportById(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('REPORT_NOT_FOUND');
    });
  });

  // --------------------------------------------------------------------------
  // Suite 4: Report Lifecycle, Review Actions & Status Transitions
  // --------------------------------------------------------------------------
  describe('4. Review Lifecycle & Valid/Invalid Transitions', () => {
    beforeEach(async () => {
      await prisma.toolReport.create({
        data: {
          id: 'report-lifecycle-01',
          toolId: 'tool-chatgpt',
          userId: LEARNER_USER_ID,
          reportCategory: 'PRICING_OUTDATED',
          description: 'Pro plan increased.',
          status: 'PENDING',
        },
      });
    });

    it('4A: Moves PENDING report to UNDER_REVIEW with reviewer notes', async () => {
      const req = createMockReq(
        mockAdminUser,
        {
          status: 'UNDER_REVIEW',
          reviewNotes: 'Cross-checking vendor pricing page and blog announcement.',
        },
        {},
        { id: 'report-lifecycle-01' }
      );
      const res = createMockRes();

      await adminUpdateToolReportStatus(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.report.status).toBe('UNDER_REVIEW');
      expect(res.body.report.reviewerId).toBe(ADMIN_USER_ID);
      expect(res.body.report.reviewNotes).toContain('Cross-checking vendor');
    });

    it('4B: Moves UNDER_REVIEW report to RESOLVED with resolution findings', async () => {
      // First advance to UNDER_REVIEW
      await prisma.toolReport.update({
        where: { id: 'report-lifecycle-01' },
        data: { status: 'UNDER_REVIEW' },
      });

      const req = createMockReq(
        mockAdminUser,
        {
          status: 'RESOLVED',
          reviewNotes:
            'Vendor website confirmed. Pricing update logged for scheduled catalog refresh.',
        },
        {},
        { id: 'report-lifecycle-01' }
      );
      const res = createMockRes();

      await adminUpdateToolReportStatus(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.report.status).toBe('RESOLVED');
      expect(res.body.report.reviewerId).toBe(ADMIN_USER_ID);
    });

    it('4C: Disallows direct transition from REJECTED to RESOLVED without intermediate review', async () => {
      // Set to REJECTED
      await prisma.toolReport.update({
        where: { id: 'report-lifecycle-01' },
        data: { status: 'REJECTED' },
      });

      const req = createMockReq(
        mockAdminUser,
        {
          status: 'RESOLVED',
          reviewNotes: 'Attempting invalid direct resolution.',
        },
        {},
        { id: 'report-lifecycle-01' }
      );
      const res = createMockRes();

      await adminUpdateToolReportStatus(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('4D: Allows re-opening a REJECTED report to UNDER_REVIEW upon new evidence', async () => {
      await prisma.toolReport.update({
        where: { id: 'report-lifecycle-01' },
        data: { status: 'REJECTED' },
      });

      const req = createMockReq(
        mockAdminUser,
        {
          status: 'UNDER_REVIEW',
          reviewNotes: 'Learner provided new official vendor URL; re-opening investigation.',
        },
        {},
        { id: 'report-lifecycle-01' }
      );
      const res = createMockRes();

      await adminUpdateToolReportStatus(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.report.status).toBe('UNDER_REVIEW');
    });

    it('4E: Rejects review notes exceeding 2000 character limit', async () => {
      const excessiveNotes = 'A'.repeat(2001);
      const req = createMockReq(
        mockAdminUser,
        {
          status: 'UNDER_REVIEW',
          reviewNotes: excessiveNotes,
        },
        {},
        { id: 'report-lifecycle-01' }
      );
      const res = createMockRes();

      await adminUpdateToolReportStatus(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // --------------------------------------------------------------------------
  // Suite 5: Reviewer Identity Enforcement & Mass-Assignment Protection
  // --------------------------------------------------------------------------
  describe('5. Reviewer Identity Enforcement & Anti-Tampering', () => {
    beforeEach(async () => {
      await prisma.toolReport.create({
        data: {
          id: 'report-tamper-01',
          toolId: 'tool-chatgpt',
          userId: LEARNER_USER_ID,
          reportCategory: 'TIER_INCORRECT',
          description: 'Tier claim.',
          status: 'PENDING',
        },
      });
    });

    it('5A: Reviewer ID is derived authoritatively from session, ignoring client-supplied reviewerId', async () => {
      const spoofedReviewerId = 'spoofed-fake-admin-id-999';
      const req = createMockReq(
        mockAdminUser,
        {
          status: 'UNDER_REVIEW',
          reviewerId: spoofedReviewerId, // Attacker attempts to spoof reviewer
          userId: 'spoofed-reporter-id',
          id: 'spoofed-report-id',
        },
        {},
        { id: 'report-tamper-01' }
      );
      const res = createMockRes();

      await adminUpdateToolReportStatus(req, res);

      expect(res.statusCode).toBe(200);
      // Must be authoritative session admin ID, not spoofed ID
      expect(res.body.report.reviewerId).toBe(ADMIN_USER_ID);
      expect(res.body.report.reviewerId).not.toBe(spoofedReviewerId);
      expect(res.body.report.id).toBe('report-tamper-01');
    });
  });

  // --------------------------------------------------------------------------
  // Suite 6: Catalog Quality Safeguard (Immutability Guarantee)
  // --------------------------------------------------------------------------
  describe('6. Catalog Quality Safeguard: Catalog Data Remains Immutable on Resolution', () => {
    it('6A: Resolving a PRICING_OUTDATED report does NOT modify tool pricing, tier, or website in catalog', async () => {
      const toolBefore = await prisma.aiTool.findUnique({ where: { id: 'tool-chatgpt' } });
      expect(toolBefore).toBeDefined();

      const report = await prisma.toolReport.create({
        data: {
          id: 'report-immutability-test',
          toolId: 'tool-chatgpt',
          userId: LEARNER_USER_ID,
          reportCategory: 'PRICING_OUTDATED',
          description: 'Claim that Plus is now $50/mo.',
          status: 'UNDER_REVIEW',
        },
      });

      const req = createMockReq(
        mockAdminUser,
        {
          status: 'RESOLVED',
          reviewNotes: 'Investigated and confirmedPlus remains $20/mo; catalog data unchanged.',
        },
        {},
        { id: report.id }
      );
      const res = createMockRes();

      await adminUpdateToolReportStatus(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.report.status).toBe('RESOLVED');

      // Verify the catalog tool record in the database is completely untouched
      const toolAfter = await prisma.aiTool.findUnique({ where: { id: 'tool-chatgpt' } });
      expect(toolAfter?.marketTier).toBe(toolBefore?.marketTier);
      expect(toolAfter?.officialWebsite).toBe(toolBefore?.officialWebsite);
      expect(toolAfter?.pricingDetails).toEqual(toolBefore?.pricingDetails);
      expect(toolAfter?.description).toBe(toolBefore?.description);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 7: Audit Logging Verification
  // --------------------------------------------------------------------------
  describe('7. Security Audit Logging', () => {
    it('7A: Writing a review status update records an entry in the audit log table', async () => {
      const report = await prisma.toolReport.create({
        data: {
          id: 'report-audit-test',
          toolId: 'tool-claude',
          userId: LEARNER_USER_ID,
          reportCategory: 'CAPABILITY_CHANGED',
          description: 'Context window updated.',
          status: 'PENDING',
        },
      });

      const req = createMockReq(
        mockAdminUser,
        {
          status: 'RESOLVED',
          reviewNotes: 'Vendor documentation verified.',
        },
        {},
        { id: report.id }
      );
      const res = createMockRes();

      await adminUpdateToolReportStatus(req, res);

      expect(res.statusCode).toBe(200);

      // Verify audit log entry was written
      const logs = await prisma.auditLog.findMany({
        where: {
          target: report.id,
        },
      });

      expect(logs.length).toBeGreaterThan(0);
      const matchingLog = logs.find((l: any) => l.action === 'TOOL_REPORT_RESOLVED');
      expect(matchingLog).toBeDefined();
      expect(matchingLog?.actor).toBe(ADMIN_USER_ID);
      expect(matchingLog?.actorRole).toBe('admin');
    });
  });

  // --------------------------------------------------------------------------
  // Suite 8: Learner Report Submission Regression
  // --------------------------------------------------------------------------
  describe('8. Existing Learner Report Submission Regression', () => {
    it('8A: Learner report submission creates report with status PENDING and blocks duplicate pending submission', async () => {
      const req = createMockReq(
        mockLearnerUser,
        {
          reportCategory: 'PRICING_OUTDATED',
          description: 'New free tier limits introduced.',
          sourceUrl: 'https://openai.com/pricing',
        },
        {},
        { id: 'tool-chatgpt' }
      );
      const res = createMockRes();

      await reportOutdatedTool(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.report.status).toBe('PENDING');

      // Attempting duplicate submission with same category and tool returns HTTP 409
      const dupReq = createMockReq(
        mockLearnerUser,
        {
          reportCategory: 'PRICING_OUTDATED',
          description: 'Second report attempt for same category.',
        },
        {},
        { id: 'tool-chatgpt' }
      );
      const dupRes = createMockRes();

      await reportOutdatedTool(dupReq, dupRes);

      expect(dupRes.statusCode).toBe(409);
      expect(dupRes.body.code).toBe('DUPLICATE_REPORT');
    });
  });
});
