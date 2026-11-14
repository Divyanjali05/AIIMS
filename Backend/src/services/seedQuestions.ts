import { prisma, isDatabaseConnected } from '../config/prisma';
import { QuestionLevel, QuestionTrack } from '../types/models';
import { SEED_INSTITUTES, DEFAULT_TASKS } from '../data/aiimsCatalog';
import { toJsonInput } from '../utils/userMapper';
import { CLARITY_30_APPROVED_QUESTIONS } from '../data/clarityQuestionBank';
import { FOCUS_45_APPROVED_QUESTIONS } from '../data/focusQuestionBank';

export interface SeedQuestionDefinition {
  questionId: string;
  topic: string;
  level: QuestionLevel;
  track: QuestionTrack;
  title: string;
  promptText: string;
  hint?: string;
  testScenario: string;
  expectedCriteria: string[];
  scoringRubric: Array<{ criterion: string; maxScore: number; description: string }>;
  source: 'Human';
  status: 'ACTIVE';
  version: number;
}

export const BASELINE_SEED_QUESTIONS: SeedQuestionDefinition[] = [
  // --- CHECKING AI (General Track) ---
  {
    questionId: 'qb-check-easy-01',
    topic: 'Checking AI',
    level: 'Easy',
    track: 'General',
    title: 'Customer Discount Policy Fact-Check',
    promptText:
      'Review the provided automated customer response against the official discount guidelines. Identify whether the discount applied matches company policy.',
    hint: 'Pay attention to minimum cart value requirements.',
    testScenario:
      'Customer Message: "I bought goods worth $45 and received an automatic 20% discount."\nCompany Policy: "A 20% promotional discount applies strictly to orders of $50 or more."',
    expectedCriteria: [
      'Identifies that the $45 cart does not meet the $50 minimum threshold',
      'States clearly whether the customer response was accurate or inaccurate',
    ],
    scoringRubric: [
      {
        criterion: 'Threshold Identification',
        maxScore: 50,
        description: 'Noticed the $50 requirement',
      },
      {
        criterion: 'Clear Verdict',
        maxScore: 50,
        description: 'Provides definitive verification status',
      },
    ],
    source: 'Human',
    status: 'ACTIVE',
    version: 1,
  },
  {
    questionId: 'qb-check-easy-02',
    topic: 'Checking AI',
    level: 'Easy',
    track: 'General',
    title: 'Customer Return Window Verification',
    promptText:
      'Review the customer service return response against the store policy. Determine if the return eligibility was calculated correctly.',
    hint: 'Check the date difference between purchase and return request.',
    testScenario:
      'Purchase Date: October 1. Return Requested: October 20.\nStore Policy: "Items may be returned within 14 days of purchase for a full refund."',
    expectedCriteria: [
      'Calculates that 19 days elapsed between purchase and return request',
      'Identifies that the 19 days exceeds the 14-day return window',
      'States clearly that the return should be rejected under standard policy',
    ],
    scoringRubric: [
      {
        criterion: 'Threshold Identification',
        maxScore: 50,
        description: 'Noticed the 14-day limit requirement',
      },
      {
        criterion: 'Clear Verdict',
        maxScore: 50,
        description: 'Provides definitive verification status',
      },
    ],
    source: 'Human',
    status: 'ACTIVE',
    version: 1,
  },
  {
    questionId: 'qb-check-med-01',
    topic: 'Checking AI',
    level: 'Medium',
    track: 'General',
    title: 'Vendor Invoice Discrepancy & Hallucination Audit',
    promptText:
      'Audit the AI-generated executive summary against the raw vendor invoice. Identify all factual inconsistencies and format your findings into a verification table.',
    hint: 'Compare both the unit prices and shipping dates.',
    testScenario:
      'Raw Invoice: Vendor TechCorp delivered 15 monitors on March 12 at $200 each. Shipping fee: $50.\nAI Summary: "TechCorp delivered 15 monitors on March 15 for $3,000 total with free shipping."',
    expectedCriteria: [
      'Flags incorrect delivery date (March 15 vs March 12)',
      'Flags omitted shipping fee ($50)',
      'Formats output into structured comparison table',
    ],
    scoringRubric: [
      {
        criterion: 'Date Discrepancy Caught',
        maxScore: 35,
        description: 'Identified March 12 vs 15',
      },
      {
        criterion: 'Fee Discrepancy Caught',
        maxScore: 35,
        description: 'Identified missing $50 shipping fee',
      },
      { criterion: 'Structured Table Output', maxScore: 30, description: 'Formatted as requested' },
    ],
    source: 'Human',
    status: 'ACTIVE',
    version: 1,
  },
  {
    questionId: 'qb-check-hard-01',
    topic: 'Checking AI',
    level: 'Hard',
    track: 'General',
    title: 'Cross-Department Policy Conflict & Compliance Resolution',
    promptText:
      'Perform a multi-step audit of the quarterly department report. Detect conflicting claims, missing regulatory citations, evaluate alternative remediation actions, and provide an executive-ready correction plan.',
    hint: 'HR retention guidelines and finance headcount caps may be in direct contradiction.',
    testScenario:
      'HR Memo: "All high-performing contractors in Q3 may be converted to full-time staff immediately without wait periods."\nFinance Directive: "Zero full-time headcount expansions permitted until Q1 next fiscal year; contractor conversions require CFO signoff."\nDraft Report: "We have finalized offers for 6 contractors starting next week under HR standard process."',
    expectedCriteria: [
      'Identifies direct contradiction between HR conversion memo and Finance headcount freeze',
      'Detects unauthorized draft hiring commitment for 6 contractors',
      'Formulates structured remediation steps with CFO approval requirement',
      'Evaluates alternative staffing solutions (e.g. extending contract duration)',
    ],
    scoringRubric: [
      {
        criterion: 'Conflict Detection',
        maxScore: 30,
        description: 'Caught HR vs Finance policy clash',
      },
      { criterion: 'Risk Identification', maxScore: 25, description: 'Flagged unauthorized hires' },
      {
        criterion: 'Alternative Evaluation',
        maxScore: 25,
        description: 'Considered contractor extension',
      },
      {
        criterion: 'Actionable Remediation',
        maxScore: 20,
        description: 'Clear structured correction plan',
      },
    ],
    source: 'Human',
    status: 'ACTIVE',
    version: 1,
  },

  // --- AI WORKFLOW DESIGN (General Track) ---
  {
    questionId: 'qb-workflow-easy-01',
    topic: 'AI Workflow Design',
    level: 'Easy',
    track: 'General',
    title: 'Weekly Team Progress Report Template',
    promptText:
      'Design a repeatable weekly progress report workflow prompt. Specify the required inputs, output sections, and one supervisory quality check.',
    hint: 'Think about what team members submit every Friday.',
    testScenario:
      'Context: A 5-person marketing team needs to compile their achievements, blockers, and next week goals every Friday at 4 PM.',
    expectedCriteria: [
      'Defines input structure (achievements, blockers, upcoming goals)',
      'Specifies clear section headers for output',
      'Includes one human verification checkpoint before sending to the director',
    ],
    scoringRubric: [
      { criterion: 'Input Definition', maxScore: 35, description: 'Clear input items' },
      { criterion: 'Section Structure', maxScore: 35, description: 'Structured output sections' },
      { criterion: 'Human Checkpoint', maxScore: 30, description: 'Supervisory check included' },
    ],
    source: 'Human',
    status: 'ACTIVE',
    version: 1,
  },
  {
    questionId: 'qb-workflow-med-01',
    topic: 'AI Workflow Design',
    level: 'Medium',
    track: 'General',
    title: 'Customer Feedback Sentiment & Action Item Pipeline',
    promptText:
      'Design a 3-step AI workflow to process incoming customer support transcripts. Define step inputs, intermediate transformations, negative constraints against hallucination, and the final prioritized output format.',
    hint: 'Ensure urgent bug complaints are separated from general feature suggestions.',
    testScenario:
      'Data: 50 daily raw support chat transcripts containing mixed sentiments, pricing questions, and urgent outage reports.',
    expectedCriteria: [
      'Step 1: Categorization & triage (Bugs vs Pricing vs Feedback)',
      'Step 2: Negative constraint (do not invent customer quotes)',
      'Step 3: Prioritized action item table with assigned department',
    ],
    scoringRubric: [
      { criterion: 'Pipeline Stages', maxScore: 35, description: 'Clear 3-stage progression' },
      {
        criterion: 'Negative Constraints',
        maxScore: 35,
        description: 'Anti-hallucination guardrail',
      },
      {
        criterion: 'Prioritization Matrix',
        maxScore: 30,
        description: 'Clear action-item assignment',
      },
    ],
    source: 'Human',
    status: 'ACTIVE',
    version: 1,
  },
  {
    questionId: 'qb-workflow-hard-01',
    topic: 'AI Workflow Design',
    level: 'Hard',
    track: 'General',
    title: 'Multi-Stakeholder Product Launch Communications Assembly',
    promptText:
      'Construct an end-to-end multi-step workflow architecture for a major product launch. Address conflicting stakeholder requests, enforce missing information checkpoints, and produce tailored drafts for executives, sales, and customers.',
    hint: 'Executives need financial impact, sales needs battle cards, customers need benefit summaries.',
    testScenario:
      'Launch Specs: Cloud backup product launching in 3 weeks. Pricing details are still pending final legal signoff. Engineering notes include technical uptime metrics. Marketing drafted enthusiastic customer claims that legal has not reviewed.',
    expectedCriteria: [
      'Establishes explicit hold condition until pending legal pricing is verified',
      'Designs distinct audience-tailored transformation pipelines',
      'Flags unreviewed marketing claims as high risk',
      'Includes fallback procedure if launch date slips',
    ],
    scoringRubric: [
      {
        criterion: 'Hold Condition for Missing Data',
        maxScore: 30,
        description: 'Paused for legal pricing',
      },
      {
        criterion: 'Tailored Multi-Audience Outputs',
        maxScore: 25,
        description: 'Exec vs Sales vs Customer',
      },
      {
        criterion: 'Legal & Compliance Safeguards',
        maxScore: 25,
        description: 'Flagged unverified claims',
      },
      { criterion: 'Contingency Planning', maxScore: 20, description: 'Addressed slippage risks' },
    ],
    source: 'Human',
    status: 'ACTIVE',
    version: 1,
  },

  // --- AI AGENTS & AUTONOMOUS WORKFLOWS (General Track) ---
  {
    questionId: 'qb-agents-easy-01',
    topic: 'AI Agents & Autonomous Workflows',
    level: 'Easy',
    track: 'General',
    title: 'Meeting Notes Action Item Delegation',
    promptText:
      'Formulate a delegated goal for an AI agent to extract action items from meeting notes. Establish one clear stopping condition.',
    hint: 'A stopping condition defines when the agent must pause and ask for confirmation.',
    testScenario:
      'Raw Notes: 45-minute sprint planning call discussing 3 initiatives and assigning tasks to Sarah, David, and Priya.',
    expectedCriteria: [
      'Delegates clear objective (identify owner, task, and deadline)',
      'Defines stopping condition (e.g. prompt user for review before sending)',
    ],
    scoringRubric: [
      { criterion: 'Goal Clarity', maxScore: 50, description: 'Unambiguous assignment objective' },
      { criterion: 'Stopping Condition', maxScore: 50, description: 'Defines when agent pauses' },
    ],
    source: 'Human',
    status: 'ACTIVE',
    version: 1,
  },
  {
    questionId: 'qb-agents-med-01',
    topic: 'AI Agents & Autonomous Workflows',
    level: 'Medium',
    track: 'General',
    title: 'Market Research Synthesis Agent with Tool Boundaries',
    promptText:
      'Design supervisory checkpoints and permissible tool boundaries for an autonomous agent tasked with compiling competitor pricing data.',
    hint: 'Distinguish between public website scraping and contacting sales directly.',
    testScenario:
      'Objective: Agent must collect subscription tiers across 4 competitor software tools and update a shared team spreadsheet.',
    expectedCriteria: [
      'Defines allowed tools (read public pricing page) and forbidden actions (no account creation)',
      'Requires human confirmation before updating the shared spreadsheet',
      'Includes fallback when pricing requires a demo call',
    ],
    scoringRubric: [
      {
        criterion: 'Tool Permissions',
        maxScore: 35,
        description: 'Clear allowable tools and limits',
      },
      {
        criterion: 'Human-in-the-Loop Gate',
        maxScore: 35,
        description: 'Verification before write',
      },
      {
        criterion: 'Uncertainty Handling',
        maxScore: 30,
        description: 'Handles hidden pricing cleanly',
      },
    ],
    source: 'Human',
    status: 'ACTIVE',
    version: 1,
  },
  {
    questionId: 'qb-agents-hard-01',
    topic: 'AI Agents & Autonomous Workflows',
    level: 'Hard',
    track: 'General',
    title: 'Autonomous Procurement Auditor with State Machine Guardrails',
    promptText:
      'Architect an autonomous agent state machine for purchase order auditing. Specify states, transitions, escalation triggers for conflicting invoices, and fraud-detection stopping conditions.',
    hint: 'Define states: INGESTION, VERIFICATION, ESCALATION, APPROVAL_PENDING.',
    testScenario:
      'Enterprise Scenario: Company processes 200 purchase orders monthly. Invoices exceeding $10,000 or showing bank account changes require immediate fraud freeze and human compliance officer takeover.',
    expectedCriteria: [
      'Defines explicit states and valid state transitions',
      'Specifies automated freeze condition on bank detail modifications',
      'Requires two-person verification rule for transactions over $10,000',
      'Provides immutable audit log generation requirement',
    ],
    scoringRubric: [
      {
        criterion: 'State Machine Rigor',
        maxScore: 30,
        description: 'States and transitions well-mapped',
      },
      {
        criterion: 'Fraud Freeze Protocol',
        maxScore: 30,
        description: 'Automatic halt on risky events',
      },
      {
        criterion: 'Dual-Approval Enforcement',
        maxScore: 25,
        description: 'Enforces human authorization thresholds',
      },
      { criterion: 'Auditability', maxScore: 15, description: 'Maintains tamper-proof record' },
    ],
    source: 'Human',
    status: 'ACTIVE',
    version: 1,
  },

  // --- CODING TRACK (Optional - Strictly Opt-In) ---
  {
    questionId: 'qb-coding-easy-01',
    topic: 'API & Contract Design',
    level: 'Easy',
    track: 'Coding',
    title: 'REST API Status Code & Error Contract',
    promptText:
      'Specify standard HTTP status codes and JSON error format for a student registration endpoint.',
    hint: 'Handle validation failure and duplicate email conflicts.',
    testScenario: 'Endpoint: POST /api/students\nPayload: { email: string, name: string }',
    expectedCriteria: [
      'Uses 400 for bad input, 409 for duplicate email, 201 for created',
      'Defines consistent JSON error structure with message and code fields',
    ],
    scoringRubric: [
      {
        criterion: 'HTTP Status Accuracy',
        maxScore: 50,
        description: 'Correct 400/409/201 semantics',
      },
      {
        criterion: 'Error Schema Consistency',
        maxScore: 50,
        description: 'Standardized payload format',
      },
    ],
    source: 'Human',
    status: 'ACTIVE',
    version: 1,
  },
  {
    questionId: 'qb-coding-med-01',
    topic: 'API & Contract Design',
    level: 'Medium',
    track: 'Coding',
    title: 'Idempotent Credit Transaction Endpoint Design',
    promptText:
      'Design an idempotent API contract for credit ledger deductions. Define headers, idempotency key persistence, race condition handling, and response payloads.',
    hint: 'Use X-Idempotency-Key and explain unique database constraint.',
    testScenario:
      'Endpoint: POST /api/credits/spend\nRisk: Network retry causing double-deductions.',
    expectedCriteria: [
      'Specifies Idempotency-Key header requirement',
      'Documents database unique index on (userId, idempotencyKey)',
      'Returns cached result on key reuse without re-debiting balance',
    ],
    scoringRubric: [
      { criterion: 'Header & Contract', maxScore: 35, description: 'Idempotency key contract' },
      {
        criterion: 'Concurrency Protection',
        maxScore: 35,
        description: 'Database uniqueness and locking',
      },
      {
        criterion: 'Safe Replay Semantics',
        maxScore: 30,
        description: 'Cached response on duplicate',
      },
    ],
    source: 'Human',
    status: 'ACTIVE',
    version: 1,
  },
  {
    questionId: 'qb-coding-hard-01',
    topic: 'API & Contract Design',
    level: 'Hard',
    track: 'Coding',
    title: 'Distributed Event Ledger & Reconciliation Schema',
    promptText:
      'Architect a distributed double-entry ledger event schema and compensation protocol for cross-service transactions. Detail schema, outbox pattern, and reconciliation job.',
    hint: 'Handle network partition and partial debit failures.',
    testScenario:
      'Architecture: Microservices with eventual consistency between user wallet service and external payment gateway.',
    expectedCriteria: [
      'Defines immutable double-entry ledger event schema',
      'Specifies transactional outbox pattern to guarantee event delivery',
      'Implements compensating transaction (refund/rollback) on downstream timeout',
      'Details automated reconciliation mismatch audit job',
    ],
    scoringRubric: [
      {
        criterion: 'Double-Entry Integrity',
        maxScore: 30,
        description: 'Zero sum debits and credits',
      },
      { criterion: 'Transactional Outbox', maxScore: 25, description: 'Reliable publishing' },
      { criterion: 'Compensation Protocol', maxScore: 25, description: 'Handles partial failures' },
      { criterion: 'Reconciliation Job', maxScore: 20, description: 'Audit and drift correction' },
    ],
    source: 'Human',
    status: 'ACTIVE',
    version: 1,
  },
];

/**
 * Seeds baseline questions into PostgreSQL if not already present.
 */
export async function initSeedQuestions(): Promise<number> {
  if (!isDatabaseConnected()) {
    return 0;
  }

  let synced = 0;
  try {
    for (const q of BASELINE_SEED_QUESTIONS) {
      await prisma.questionBank.upsert({
        where: { questionId: q.questionId },
        create: {
          questionId: q.questionId,
          topic: q.topic,
          level: q.level,
          track: q.track,
          title: q.title,
          promptText: q.promptText,
          hint: q.hint ?? null,
          testScenario: q.testScenario,
          expectedCriteria: q.expectedCriteria,
          scoringRubric: toJsonInput(q.scoringRubric),
          source: q.source,
          status: q.status,
          version: q.version,
        },
        update: {},
      });
      synced++;
    }

    for (const q of CLARITY_30_APPROVED_QUESTIONS) {
      await prisma.questionBank.upsert({
        where: { questionId: q.questionId },
        create: {
          questionId: q.questionId,
          topic: q.topic,
          level: q.level,
          track: q.track,
          title: q.title,
          promptText: q.promptText,
          hint: q.hint ?? null,
          testScenario: q.testScenario,
          expectedCriteria: q.expectedCriteria,
          scoringRubric: toJsonInput(q.scoringRubric),
          aiMetadata: toJsonInput(q.aiMetadata),
          source: q.source,
          status: q.status,
          version: q.version,
          reviewedBy: q.reviewedBy,
          reviewedAt: new Date(q.reviewedAt),
          reviewNotes: q.reviewNotes,
        },
        update: {
          topic: q.topic,
          level: q.level,
          track: q.track,
          title: q.title,
          promptText: q.promptText,
          hint: q.hint ?? null,
          testScenario: q.testScenario,
          expectedCriteria: q.expectedCriteria,
          scoringRubric: toJsonInput(q.scoringRubric),
          aiMetadata: toJsonInput(q.aiMetadata),
          status: q.status,
          version: q.version,
          reviewedBy: q.reviewedBy,
          reviewedAt: new Date(q.reviewedAt),
          reviewNotes: q.reviewNotes,
        },
      });
      synced++;
    }

    for (const q of FOCUS_45_APPROVED_QUESTIONS) {
      await prisma.questionBank.upsert({
        where: { questionId: q.questionId },
        create: {
          questionId: q.questionId,
          topic: q.topic,
          level: q.level,
          track: q.track,
          title: q.title,
          promptText: q.promptText,
          hint: q.hint ?? null,
          testScenario: q.testScenario,
          expectedCriteria: q.expectedCriteria,
          scoringRubric: toJsonInput(q.scoringRubric),
          aiMetadata: toJsonInput(q.aiMetadata),
          source: q.source,
          status: q.status,
          version: q.version,
          reviewedBy: q.reviewedBy,
          reviewedAt: new Date(q.reviewedAt),
          reviewNotes: q.reviewNotes,
        },
        update: {
          topic: q.topic,
          level: q.level,
          track: q.track,
          title: q.title,
          promptText: q.promptText,
          hint: q.hint ?? null,
          testScenario: q.testScenario,
          expectedCriteria: q.expectedCriteria,
          scoringRubric: toJsonInput(q.scoringRubric),
          aiMetadata: toJsonInput(q.aiMetadata),
          status: q.status,
          version: q.version,
          reviewedBy: q.reviewedBy,
          reviewedAt: new Date(q.reviewedAt),
          reviewNotes: q.reviewNotes,
        },
      });
      synced++;
    }
  } catch (e: any) {
    console.warn('[QuestionBank] Seed question sync notice:', e.message);
  }

  return synced;
}

/**
 * Seeds baseline reference Institutes and Tasks into PostgreSQL if missing.
 */
export async function seedReferenceCatalog(): Promise<void> {
  if (!isDatabaseConnected()) return;

  try {
    for (const inst of SEED_INSTITUTES) {
      await prisma.institute.upsert({
        where: { code: inst.code },
        create: {
          id: inst.id,
          name: inst.name,
          code: inst.code,
          shortName: inst.shortName,
          city: inst.city || null,
          country: inst.country,
          type: inst.type,
          status: inst.status,
        },
        update: {},
      });
    }
  } catch (err: any) {
    console.warn('[SeedCatalog] Institute seed notice:', err.message);
  }

  try {
    for (const t of DEFAULT_TASKS) {
      await prisma.task.upsert({
        where: { taskId: t.taskId },
        create: {
          taskId: t.taskId,
          title: t.title,
          description: t.description,
          category: t.category,
          level: t.level,
          isActive: t.isActive,
        },
        update: {},
      });
    }
  } catch (err: any) {
    console.warn('[SeedCatalog] Task seed notice:', err.message);
  }
}
