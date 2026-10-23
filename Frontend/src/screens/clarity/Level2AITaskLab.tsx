import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  Lightbulb,
  Award,
  Clock,
  Terminal,
  Zap,
  Check,
  Copy,
  ChevronRight,
  ShieldCheck,
  FileCode,
  HelpCircle,
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { apiClient } from '../../api/client';
import { useLearner } from '../../context/LearnerContext';

export interface ClarityAITask {
  id: string;
  difficulty: 'easy' | 'medium' | 'advanced';
  difficultyLabel: string;
  badgeColor: string;
  title: string;
  tagline: string;
  scenario: string;
  objective: string;
  testInput: string;
  starterPrompt: string;
  rubricFocus: string[];
}

interface Level2AITaskLabProps {
  topicName: string;
  onTaskCompleted?: (difficulty: 'easy' | 'medium' | 'advanced', score: number) => void;
  legacyTryThis?: {
    question: string;
    options: {
      id: string;
      text: string;
      explanation: string;
      isRecommended?: boolean;
    }[];
  };
}

export const getTasksForTopic = (topic: string): ClarityAITask[] => {
  const isCheckingAI =
    topic.toLowerCase().includes('check') || topic.toLowerCase().includes('eval');
  const isAgents = topic.toLowerCase().includes('agent') || topic.toLowerCase().includes('autonom');

  if (isCheckingAI) {
    return [
      {
        id: 'task-easy',
        difficulty: 'easy',
        difficultyLabel: 'Easy (Basic Level 2)',
        badgeColor: '#059669',
        title: 'Fact-Check & Grounding Verification Prompt',
        tagline: 'Single-objective inspection against policy ground truth',
        scenario:
          'A company published an automated customer announcement claiming: "All orders placed before midnight receive free overnight delivery." You need an AI prompt to verify this statement against official shipping policy.',
        objective:
          'Write an AI prompt that establishes a compliance auditor persona, compares the claim against provided policy terms, flags any discrepancies, and outputs a strict Accurate / Inaccurate verdict.',
        testInput:
          'Official Shipping Policy (Clause 4.2): Free standard ground shipping applies to domestic orders exceeding $50 placed Monday through Thursday. Express overnight delivery requires an additional $18 surcharge regardless of order time or basket value.',
        starterPrompt: `Act as a Senior Compliance & Policy Auditor.
Compare the following customer statement against the official policy text below.

CUSTOMER STATEMENT:
"All orders placed before midnight receive free overnight delivery."

OFFICIAL POLICY TEXT:
[Insert Official Policy Text Here]

AUDIT INSTRUCTIONS:
1. Identify any factual discrepancy between the statement and the policy.
2. State your final verdict clearly: [ACCURATE or INACCURATE].
3. Provide a one-sentence factual correction citing the exact policy clause.`,
        rubricFocus: [
          'Explicit verification persona established',
          'Direct contrast between claim and source evidence',
          'Definitive binary verdict (Accurate / Inaccurate)',
          'Clear policy citation requirement',
        ],
      },
      {
        id: 'task-medium',
        difficulty: 'medium',
        difficultyLabel: 'Medium (Intermediate Level 2)',
        badgeColor: '#d97706',
        title: 'Hallucination Detection & Logic Audit Workflow',
        tagline: 'Multi-point verification with negative constraints & JSON schema',
        scenario:
          'An AI draft summarized Q3 corporate earnings. Some statistics match the financial ledger, but others appear fabricated or speculative. You need a structured validation prompt to audit every single fact.',
        objective:
          'Construct a verification prompt with explicit negative constraints ("Do not extrapolate", "Flag missing figures") and mandate structured JSON output separating verified facts from ungrounded claims.',
        testInput:
          'Source Financial Ledger: Q3 revenue was $14.2M with an operating margin of 11.4%. Research & Development expenditure was $2.6M.\n\nAI Draft to Audit: "Q3 delivered exceptional results with $14.2M revenue and 11.4% margin. Due to strong market response, Q4 revenue is guaranteed to exceed $22M with a 15% dividend bonus for investors."',
        starterPrompt: `Act as a Financial Data Auditor and Hallucination Inspector.
Audit the following AI draft against the official Source Financial Ledger.

AUDIT CONSTRAINTS & NEGATIVE RULES:
1. Cross-reference every quantitative number and projection.
2. STRICT RULE: DO NOT extrapolate, assume, or validate unstated figures.
3. Every claim not backed by the ledger MUST be classified as UNBACKED_OR_HALLUCINATED.

OUTPUT FORMAT (Return valid JSON only):
{
  "auditStatus": "PASSED" | "FLAGGED_DISCREPANCIES",
  "verifiedFacts": ["list of facts confirmed in ledger"],
  "unbackedClaims": ["list of speculative or fabricated statements"],
  "confidenceScore": 0-100,
  "summaryVerdict": "string explanation"
}`,
        rubricFocus: [
          'Strict negative constraints preventing extrapolation',
          'Clear separation between grounded vs unbacked claims',
          'Structured JSON schema enforcement',
          'Quantitative confidence scoring',
        ],
      },
      {
        id: 'task-advanced',
        difficulty: 'advanced',
        difficultyLabel: 'Advanced (Pro Level 2)',
        badgeColor: '#7c3aed',
        title: 'Autonomous Verification Gate & Escalation Protocol',
        tagline: 'High-stakes decision auditing with automated human-in-the-loop triggers',
        scenario:
          'An autonomous customer refund agent is approving a $780 warranty refund. You must build an AI verification gatekeeper that evaluates fraud indicators, policy limits, and automatically halts execution for human review if risk score exceeds safety thresholds.',
        objective:
          'Design an advanced autonomous gate prompt that verifies chronological event validity, calculates claim discrepancy risk, and enforces a mandatory Human-in-the-Loop escalation trigger if confidence falls below 85%.',
        testInput:
          'Claim #W-9021: Product purchased 14 months ago (Standard Warranty: 12 months). Extended care package active: YES (Adds 12 months). Customer claims hardware defect occurred within 30 days of purchase but reported today. Requested payout: $780 replacement credit.',
        starterPrompt: `Act as an Autonomous Risk & Verification Gatekeeper for High-Value Claims.
Audit the incoming claim data against business governance rules before payment dispatch.

DECISION PROTOCOL:
1. Verify warranty coverage duration (Standard 12 mo + Extended 12 mo = 24 mo active window).
2. Assess reporting latency risk (claimant notes defect happened 13 months ago but filed today).
3. Compute a Verification Confidence Score between 0.0 and 1.0.

ESCALATION THRESHOLD:
- If Confidence Score < 0.85 OR reporting delay > 90 days without documentation, output Decision: HUMAN_ESCALATION_REQUIRED.
- Otherwise, output Decision: AUTOMATED_CLEARANCE_APPROVED.

OUTPUT FORMAT:
- Gate Decision: [AUTOMATED_CLEARANCE_APPROVED | HUMAN_ESCALATION_REQUIRED | REJECTED]
- Confidence Score: (0.0 to 1.0)
- Risk Factors Identified: (bullet points)
- Actionable Human Checklist: (specific items the human reviewer must verify if escalated)`,
        rubricFocus: [
          'Multi-variable governance and coverage validation',
          'Explicit quantitative escalation threshold (< 0.85 triggers human intervention)',
          'Clear audit trail and human remediation checklist',
          'Resilience against prompt injection or premature clearance',
        ],
      },
    ];
  }

  if (isAgents) {
    return [
      {
        id: 'task-easy',
        difficulty: 'easy',
        difficultyLabel: 'Easy (Basic Level 2)',
        badgeColor: '#059669',
        title: 'Goal-Oriented Agent Instruction Prompt',
        tagline: 'Framing autonomous objectives without line-by-line micromanagement',
        scenario:
          'You want an AI agent to monitor customer feedback emails, categorize sentiment, and alert engineers only to high-priority system bugs.',
        objective:
          'Design an agent prompt that states the high-level objective, defines clear boundaries, and specifies output triggers instead of commanding every tiny manual step.',
        testInput:
          'Incoming Email: "The checkout page crashed 3 times when trying to apply discount code SAVE20 on mobile Safari. Lost my cart items!"',
        starterPrompt: `Act as an Autonomous Customer Triage Agent.
Your objective is to inspect incoming customer messages and surface critical issues.

OPERATIONAL BOUNDARIES:
- Categorize sentiment: [Positive | Neutral | Frustrated | Critical].
- Determine if an immediate engineering ticket is required.
- Do NOT reply directly to the customer; your role is internal triage.

OUTPUT FORMAT:
- Severity: [LOW | MEDIUM | HIGH | URGENT]
- Issue Category: [Billing | UI Bug | Crash | Inquiry]
- Engineer Summary: 1-line concise description
- Recommended Action: Next step`,
        rubricFocus: [
          'Goal delegation rather than step-by-step micromanagement',
          'Explicit operational boundaries (what NOT to do)',
          'Actionable output schema for downstream tools',
        ],
      },
      {
        id: 'task-medium',
        difficulty: 'medium',
        difficultyLabel: 'Medium (Intermediate Level 2)',
        badgeColor: '#d97706',
        title: 'Agent Tool-Contract & Pre-Flight Validation Prompt',
        tagline: 'Ensuring autonomous agents validate arguments before calling tools',
        scenario:
          'An AI agent has access to a `send_refund_payment(user_id, amount_cents)` tool. You must prevent the agent from triggering the tool with missing parameters or negative numbers.',
        objective:
          'Write a pre-flight validation prompt that forces the agent to verify all tool parameters against business constraints before confirming tool invocation.',
        testInput:
          'User Request: "Please refund customer cust_994 for $45.00 because their package was late."',
        starterPrompt: `Act as an Agentic Tool Execution Gatekeeper.
Before authorizing the execution of 'send_refund_payment', conduct a pre-flight sanity check.

TOOL SPECIFICATION:
tool: send_refund_payment
parameters:
  - user_id: string (must start with 'cust_')
  - amount_cents: integer (must be positive integer, 1 to 50000)
  - reason: string (minimum 10 characters)

VALIDATION RULES:
1. Parse the user request to extract tool parameters.
2. Confirm amount conversion: $45.00 = 4500 cents.
3. If any parameter is missing or invalid, ABORT tool execution and state missing requirements.

OUTPUT FORMAT:
- Tool Clearance: [READY_TO_EXECUTE | ABORTED_INVALID_ARGS]
- Extracted Payload: { user_id, amount_cents, reason }
- Validation Notes: explanation of checks passed`,
        rubricFocus: [
          'Pre-flight parameter validation before execution',
          'Unit conversion verification (dollars to cents)',
          'Defensive error abort states for invalid inputs',
        ],
      },
      {
        id: 'task-advanced',
        difficulty: 'advanced',
        difficultyLabel: 'Advanced (Pro Level 2)',
        badgeColor: '#7c3aed',
        title: 'Multi-Agent Coordination & Reflection Loop Prompt',
        tagline: 'Autonomous agent self-correction and cross-evaluation loop',
        scenario:
          'A multi-agent system uses a Researcher Agent to collect product details and a Critic Agent to spot gaps before presenting the final report to stakeholders.',
        objective:
          'Craft a prompt for the Critic & Synthesis Agent that evaluates the Researcher output against completeness criteria, triggers a reflection loop if gaps exist, and compiles the final verified briefing.',
        testInput:
          'Researcher Output: "Tool XYZ costs $20/month. It has a modern interface and supports API keys. Recommended for enterprise teams."',
        starterPrompt: `Act as the Lead Critic & Synthesis Agent in a Multi-Agent Architecture.
Review the draft submitted by the Researcher Agent against our enterprise diligence standard.

EVALUATION CHECKLIST:
1. Pricing clarity: Are enterprise tiers, annual discounts, and seat limits defined?
2. Security & Compliance: Are SOC2, GDPR, or data retention policies documented?
3. Integration capabilities: What ecosystems does it connect to?

REFLECTION PROTOCOL:
- If >= 2 checklist items are missing: Trigger STATUS: REWORK_REQUIRED and specify the exact query prompts the Researcher must run next.
- If all checklist items are satisfied: Trigger STATUS: APPROVED_FOR_STAKEHOLDERS and compile the executive summary.

OUTPUT:
- Reflection Status: [APPROVED_FOR_STAKEHOLDERS | REWORK_REQUIRED]
- Gap Analysis: (detailed list of missing data points)
- Directed Queries for Next Loop: (specific research instructions if rework required)`,
        rubricFocus: [
          'Autonomous quality inspection and self-correction loop',
          'Actionable feedback for other agents in the loop',
          'Rigorous criteria preventing premature workflow completion',
        ],
      },
    ];
  }

  // Default / AI Workflow Design tasks
  return [
    {
      id: 'task-easy',
      difficulty: 'easy',
      difficultyLabel: 'Easy (Basic Level 2)',
      badgeColor: '#059669',
      title: 'Single-Objective Structured Prompt',
      tagline: 'Transforming casual AI chat into a repeatable, grounded prompt template',
      scenario:
        'You need to turn a weekly team status update into an automated, structured progress briefing with accomplishments, blockers, and next week targets.',
      objective:
        'Write a prompt that defines a project manager persona, takes raw team bullet points as input, filters out irrelevant chat chatter, and formats the result into a clean 3-part update.',
      testInput:
        'Raw Team Notes: "Sarah finished the login flow! Dave was waiting on backend API tokens for 2 days. The server had a restart on Tuesday. Next week we plan to run load tests and demo to marketing. Also had pizza on Friday."',
      starterPrompt: `Act as a Technical Project Manager.
Transform the raw team notes below into a clean, professional weekly progress report.

RAW NOTES:
[Insert Raw Notes Here]

REPORT FORMAT:
1. Key Milestones Completed (bulleted)
2. Blockers & Technical Risks (bulleted)
3. Priorities for Next Week (bulleted)

NEGATIVE CONSTRAINT:
Filter out personal or casual commentary (e.g. food, casual chat) and keep only operational work items.`,
      rubricFocus: [
        'Clear persona and domain framing',
        'Filtering constraint for irrelevant chatter',
        'Consistent 3-part structured layout',
      ],
    },
    {
      id: 'task-medium',
      difficulty: 'medium',
      difficultyLabel: 'Medium (Intermediate Level 2)',
      badgeColor: '#d97706',
      title: 'Context-Aware Quality Gate Workflow Prompt',
      tagline: 'Adding validation checkpoints and schema enforcement to recurring workflows',
      scenario:
        'You are automating customer ticket categorization for a SaaS platform. Tickets must be tagged with exact department categories, SLA priority, and an estimated resolution complexity score.',
      objective:
        'Build a prompt that classifies customer issues against fixed enum categories, enforces negative boundary rules, and outputs schema-valid JSON for direct system ingestion.',
      testInput:
        'Customer Ticket: "Our webhook endpoint stopped receiving events since 09:00 UTC today. We are losing payment notifications for active customers! Please help ASAP."',
      starterPrompt: `Act as an Automated Triage Classifier for an Enterprise SaaS Platform.
Analyze the customer support ticket and classify it according to strict taxonomy rules.

ALLOWED CATEGORIES:
- "Billing"
- "API_Integrations"
- "Authentication"
- "UI_UX"

SLA PRIORITY CRITERIA:
- "P1_CRITICAL": Data loss, payment failure, complete service outage
- "P2_HIGH": Major feature degradation with workaround
- "P3_NORMAL": General questions, minor bugs

OUTPUT FORMAT (Return valid JSON only):
{
  "category": "API_Integrations",
  "priority": "P1_CRITICAL",
  "affectedSystem": "Webhooks / Payments",
  "summary": "1-line summary",
  "suggestedAssignmentQueue": "Platform Engineering",
  "confidenceScore": 0.95
}`,
      rubricFocus: [
        'Strict enum category constraints',
        'Clear decision logic for SLA severity levels',
        'Valid JSON format ready for automated API processing',
      ],
    },
    {
      id: 'task-advanced',
      difficulty: 'advanced',
      difficultyLabel: 'Advanced (Pro Level 2)',
      badgeColor: '#7c3aed',
      title: 'Resilient Multi-Stage Pipeline with Fallback Protocol',
      tagline:
        'Designing an end-to-end prompt workflow with error recovery & validation checkpoints',
      scenario:
        'You are designing an AI data extraction workflow that parses unstructured vendor invoices. The prompt must extract line items, verify that the sum of line items equals the invoice total, and trigger an anomaly alert if mathematical discrepancies are found.',
      objective:
        'Design an advanced extraction prompt with internal math verification, explicit failure recovery instructions, and structured risk tagging.',
      testInput:
        'Invoice Snippet: "Vendor: Acme Cloud Inc. Items: Database Instance $400.00, Storage 500GB $80.00, Network Egress $50.00. Invoice Subtotal: $530.00. Tax: $53.00. Total Billed: $590.00."',
      starterPrompt: `Act as an Automated Financial Data Extraction & Reconciliation Engine.
Parse the vendor invoice and execute mathematical integrity verification before committing records.

WORKFLOW STEPS:
1. Extract line items, subtotal, taxes, and total billed.
2. RECONCILIATION CHECK: Sum line items ($400 + $80 + $50 = $530). Add tax ($53) = $583 expected total.
3. Compare expected total ($583) against Total Billed ($590).
4. Identify discrepancy ($7 discrepancy detected).

ANOMALY PROTOCOL:
- If Math Check fails: Flag Status: "RECONCILIATION_MISMATCH" and detail the exact discrepancy.
- If Math Check passes: Flag Status: "RECONCILED_SUCCESS".

OUTPUT JSON SCHEMA:
{
  "vendor": "string",
  "lineItems": [{"item": "string", "amount": number}],
  "calculatedTotal": number,
  "billedTotal": number,
  "status": "RECONCILED_SUCCESS" | "RECONCILIATION_MISMATCH",
  "discrepancyAmount": number,
  "actionRequired": "string"
}`,
      rubricFocus: [
        'Mathematical reconciliation and self-verification logic',
        'Explicit anomaly protocol for discrepancy handling',
        'Production-grade JSON schema for ERP ingestion',
      ],
    },
  ];
};

export const Level2AITaskLab: React.FC<Level2AITaskLabProps> = ({
  topicName,
  onTaskCompleted,
  legacyTryThis,
}) => {
  const { state, saveClarityTaskResult } = useLearner();
  const tasks = getTasksForTopic(topicName);

  const [activeTab, setActiveTab] = useState<'easy' | 'medium' | 'advanced'>('easy');
  const [showLegacyQuiz, setShowLegacyQuiz] = useState<boolean>(false);
  const [legacySelectedId, setLegacySelectedId] = useState<string | null>(null);

  // Active task data
  const currentTask = tasks.find((t) => t.difficulty === activeTab) || tasks[0];

  // Learner saved task scores
  const savedTaskData = state.clarity.taskScores?.[topicName]?.[activeTab];

  // Editor and execution states
  const [promptText, setPromptText] = useState<string>(
    savedTaskData?.userPrompt || currentTask.starterPrompt
  );
  const [testInput, setTestInput] = useState<string>(currentTask.testInput);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState<boolean>(false);
  const [isRunningAI, setIsRunningAI] = useState<boolean>(false);

  // Execution result state
  const [aiOutput, setAiOutput] = useState<string>(savedTaskData?.output || '');
  const [taskScore, setTaskScore] = useState<number | null>(
    savedTaskData?.score !== undefined ? savedTaskData.score : null
  );
  const [scoreBreakdown, setScoreBreakdown] = useState<{
    clarity: number;
    constraints: number;
    structure: number;
    reliability: number;
  } | null>(savedTaskData?.breakdown || null);
  const [grade, setGrade] = useState<string>(savedTaskData?.grade || '');
  const [strengths, setStrengths] = useState<string[]>(savedTaskData?.strengths || []);
  const [gaps, setGaps] = useState<string[]>(savedTaskData?.gaps || []);
  const [evalTip, setEvalTip] = useState<string>(savedTaskData?.tip || '');
  const [modelUsed, setModelUsed] = useState<string>('Google Gemini 3.1 Flash');
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [_saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Sync state when switching task difficulty tabs
  useEffect(() => {
    const existing = state.clarity.taskScores?.[topicName]?.[activeTab];
    if (existing) {
      setPromptText(existing.userPrompt);
      setAiOutput(existing.output);
      setTaskScore(existing.score);
      setScoreBreakdown(existing.breakdown || null);
      setGrade(existing.grade || '');
      setStrengths(existing.strengths || []);
      setGaps(existing.gaps || []);
      setEvalTip(existing.tip || '');
    } else {
      setPromptText(currentTask.starterPrompt);
      setAiOutput('');
      setTaskScore(null);
      setScoreBreakdown(null);
      setGrade('');
      setStrengths([]);
      setGaps([]);
      setEvalTip('');
    }
    setTestInput(currentTask.testInput);
    setSaveSuccess(false);
  }, [activeTab, topicName, currentTask, state.clarity.taskScores]);

  // AI Prompt Generator handler
  const handleGeneratePromptWithAI = async () => {
    setIsGeneratingPrompt(true);
    try {
      const res = await apiClient.generateClarityPrompt({
        topic: topicName,
        difficulty: currentTask.difficulty,
        taskTitle: currentTask.title,
        taskObjective: currentTask.objective,
        scenario: currentTask.scenario,
      });
      if (res && res.prompt) {
        setPromptText(res.prompt);
      }
    } catch (err) {
      console.warn('AI prompt generation error, using curated template:', err);
      setPromptText(currentTask.starterPrompt);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  // Run AI Task handler
  const handleRunAITask = async () => {
    if (!promptText.trim()) return;
    setIsRunningAI(true);
    setSaveSuccess(false);

    try {
      const startTime = Date.now();
      const res = await apiClient.runClarityTask({
        topic: topicName,
        difficulty: currentTask.difficulty,
        taskTitle: currentTask.title,
        taskObjective: currentTask.objective,
        userPrompt: promptText,
        contextData: testInput,
      });

      const elapsed = Date.now() - startTime;
      setExecutionTime(elapsed);

      if (res) {
        setAiOutput(res.output || 'Execution completed with no output.');
        setTaskScore(res.score || 85);
        setScoreBreakdown(
          res.breakdown || { clarity: 22, constraints: 21, structure: 22, reliability: 20 }
        );
        setGrade(res.grade || 'Proficient');
        setStrengths(res.strengths || ['Clear prompt structure']);
        setGaps(res.gaps || []);
        setEvalTip(res.tip || 'Include explicit validation criteria.');
        if (res.modelUsed) setModelUsed(res.modelUsed);

        // Auto-save to LearnerContext and trigger credit award
        saveClarityTaskResult(topicName, currentTask.difficulty, {
          score: res.score || 85,
          output: res.output,
          userPrompt: promptText,
          breakdown: res.breakdown,
          grade: res.grade,
          strengths: res.strengths,
          gaps: res.gaps,
          tip: res.tip,
        });
        setSaveSuccess(true);

        if (onTaskCompleted) {
          onTaskCompleted(currentTask.difficulty, res.score || 85);
        }
      }
    } catch (err) {
      console.error('Error running AI task:', err);
    } finally {
      setIsRunningAI(false);
    }
  };

  const handleCopyOutput = () => {
    if (!aiOutput) return;
    navigator.clipboard.writeText(aiOutput);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Overall Task Completion Counter for Level 2
  const topicScoresObj = state.clarity.taskScores?.[topicName] || {};
  const completedTaskCount = ['easy', 'medium', 'advanced'].filter(
    (diff) => topicScoresObj[diff]?.score !== undefined
  ).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* TOP HEADER & DIFFICULTY TAB BAR */}
      <Surface variant="sky" radius="lg" padding="lg">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--aiims-primary)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Zap size={18} />
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading)',
                  fontFamily: "'Fredoka', sans-serif",
                }}
              >
                3. Try This — Level 2 Interactive AI Tasks
              </h2>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: 'var(--aiims-text-secondary)',
                lineHeight: 1.45,
              }}
            >
              Hands-on practical execution for <strong>{topicName}</strong>. Engineer prompts, run
              live with AI, inspect outputs, and earn individual task evaluation scores.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Badge variant="cyan">{completedTaskCount} of 3 Tasks Scored</Badge>

            {legacyTryThis && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLegacyQuiz(!showLegacyQuiz)}
                icon={<HelpCircle size={14} />}
              >
                {showLegacyQuiz ? 'Show AI Tasks' : 'Concept Quiz'}
              </Button>
            )}
          </div>
        </div>

        {/* 3 TASK DIFFICULTY SELECTOR TILES */}
        <div
          className="aiims-card-grid"
          style={{
            gridTemplateColumns:
              'repeat(auto-fit, minmax(var(--aiims-card-min-width-desktop, 260px), 1fr))',
            gap: '12px',
          }}
        >
          {tasks.map((task) => {
            const isCurrent = activeTab === task.difficulty;
            const saved = topicScoresObj[task.difficulty];
            const hasScore = saved?.score !== undefined;

            return (
              <div
                key={task.id}
                onClick={() => {
                  setActiveTab(task.difficulty);
                  setShowLegacyQuiz(false);
                }}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  border: isCurrent
                    ? '2px solid var(--aiims-primary)'
                    : '1px solid var(--aiims-border-subtle)',
                  backgroundColor: isCurrent ? 'var(--aiims-bg-card)' : 'var(--aiims-bg-subtle)',
                  boxShadow: isCurrent ? 'var(--aiims-shadow-card)' : 'none',
                  transition: 'all 0.18s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: task.badgeColor,
                      backgroundColor:
                        task.difficulty === 'easy'
                          ? 'var(--aiims-tint-emerald-bg)'
                          : task.difficulty === 'medium'
                            ? 'var(--aiims-tint-amber-bg)'
                            : 'var(--aiims-tint-indigo-bg)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {task.difficultyLabel}
                  </span>

                  {hasScore ? (
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color:
                          saved.score >= 85
                            ? 'var(--aiims-tint-emerald-text)'
                            : 'var(--aiims-tint-amber-text)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckCircle2 size={14} /> {saved.score}/100
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--aiims-text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Clock size={12} /> Ready
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-heading)',
                    lineHeight: 1.3,
                  }}
                >
                  {task.title}
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--aiims-text-secondary)',
                    lineHeight: 1.4,
                  }}
                >
                  {task.tagline}
                </div>
              </div>
            );
          })}
        </div>
      </Surface>

      {/* OPTIONAL LEGACY QUIZ ACCORDION / TOGGLE */}
      {showLegacyQuiz && legacyTryThis && (
        <Surface variant="bordered" radius="lg" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <HelpCircle style={{ width: '18px', height: '18px', color: 'var(--aiims-primary)' }} />
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading)',
              }}
            >
              Concept Check: {legacyTryThis.question}
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {legacyTryThis.options.map((option) => {
              const isSelected = legacySelectedId === option.id;
              return (
                <div
                  key={option.id}
                  onClick={() => setLegacySelectedId(option.id)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: isSelected
                      ? '2px solid #059669'
                      : '1px solid var(--aiims-border-subtle)',
                    backgroundColor: isSelected
                      ? 'var(--aiims-card-mint-bg)'
                      : 'var(--aiims-bg-card)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        backgroundColor: isSelected ? '#059669' : 'var(--aiims-bg-subtle)',
                        color: isSelected ? '#ffffff' : 'var(--aiims-text-body)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '12px',
                      }}
                    >
                      {option.id}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--aiims-text-heading)',
                        }}
                      >
                        {option.text}
                      </div>
                      {isSelected && (
                        <div
                          style={{
                            marginTop: '6px',
                            fontSize: '12px',
                            color: option.isRecommended ? '#059669' : 'var(--aiims-text-secondary)',
                          }}
                        >
                          <strong>{option.isRecommended ? 'Correct: ' : 'Analysis: '}</strong>{' '}
                          {option.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Surface>
      )}

      {/* ACTIVE TASK WORKSPACE */}
      {!showLegacyQuiz && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. SCENARIO & OBJECTIVE BRIEFING */}
          <Surface variant="bordered" radius="lg" padding="md">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '16px',
              }}
            >
              <div>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: currentTask.badgeColor,
                      backgroundColor: 'var(--aiims-bg-subtle)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {currentTask.difficultyLabel}
                  </span>
                  <span
                    style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aiims-text-muted)' }}
                  >
                    • Real-World Challenge
                  </span>
                </div>

                <h3
                  style={{
                    margin: '0 0 8px',
                    fontSize: '16px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading)',
                  }}
                >
                  {currentTask.title}
                </h3>

                <p
                  style={{
                    margin: '0 0 10px',
                    fontSize: '13px',
                    color: 'var(--aiims-text-body)',
                    lineHeight: 1.5,
                  }}
                >
                  {currentTask.scenario}
                </p>

                <div
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'var(--aiims-bg-subtle)',
                    borderRadius: '8px',
                    border: '1px solid var(--aiims-border-subtle)',
                    fontSize: '12px',
                    color: 'var(--aiims-text-heading)',
                  }}
                >
                  <strong style={{ color: 'var(--aiims-primary)' }}>Target Goal: </strong>
                  {currentTask.objective}
                </div>
              </div>

              {/* RUBRIC TARGETS */}
              <div
                style={{
                  backgroundColor: 'var(--aiims-card-mint-bg)',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid var(--aiims-card-mint-border)',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}
                >
                  <ShieldCheck size={16} color="#059669" />
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      color: 'var(--aiims-card-mint-text)',
                      textTransform: 'uppercase',
                    }}
                  >
                    AI Evaluator Rubric Focus
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {currentTask.rubricFocus.map((focus, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: 'var(--aiims-card-mint-text)',
                      }}
                    >
                      <Check size={13} color="#059669" style={{ flexShrink: 0 }} />
                      <span>{focus}</span>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: '12px',
                    fontSize: '11px',
                    color: 'var(--aiims-card-mint-text)',
                    borderTop: '1px dashed var(--aiims-card-mint-border)',
                    paddingTop: '8px',
                  }}
                >
                  💡{' '}
                  <em>
                    Scored on Clarity (25), Constraints (25), Output Structure (25), and Reliability
                    (25).
                  </em>
                </div>
              </div>
            </div>
          </Surface>

          {/* 2. PROMPT GENERATOR & PROMPT EDITOR */}
          <Surface variant="bordered" radius="lg" padding="md">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileCode size={18} color="var(--aiims-primary)" />
                <span
                  style={{ fontSize: '14px', fontWeight: 800, color: 'var(--aiims-text-heading)' }}
                >
                  Your Level 2 AI Prompt
                </span>
                <span style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}>
                  ({promptText.length} chars)
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGeneratePromptWithAI}
                  disabled={isGeneratingPrompt}
                  icon={<Sparkles size={14} color="#7c3aed" />}
                >
                  {isGeneratingPrompt ? 'AI Generating Prompt...' : '✨ AI Generate Starter Prompt'}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPromptText(currentTask.starterPrompt)}
                  icon={<RotateCcw size={12} />}
                >
                  Reset Template
                </Button>
              </div>
            </div>

            {/* PROMPT TEXTAREA */}
            <textarea
              rows={9}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Draft your AI instructions here..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                borderRadius: '8px',
                border: '1px solid var(--aiims-input-border)',
                padding: '12px 14px',
                fontSize: '13px',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                color: 'var(--aiims-input-text)',
                lineHeight: 1.5,
                backgroundColor: 'var(--aiims-input-bg)',
                outline: 'none',
                resize: 'vertical',
              }}
            />

            {/* TEST INPUT DATA DRAWER */}
            <div
              style={{
                marginTop: '12px',
                borderTop: '1px solid var(--aiims-border-subtle)',
                paddingTop: '10px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-secondary)',
                  }}
                >
                  Execution Context Data (Passed into AI):
                </span>
                <span style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}>
                  Editable Test Snippet
                </span>
              </div>
              <textarea
                rows={2}
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  borderRadius: '6px',
                  border: '1px solid var(--aiims-input-border)',
                  padding: '8px 10px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: 'var(--aiims-input-text)',
                  backgroundColor: 'var(--aiims-input-bg)',
                }}
              />
            </div>

            {/* RUN BUTTON & MODEL BADGE */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '14px',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge variant="neutral">Model: {modelUsed}</Badge>
                {executionTime !== null && (
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--aiims-text-secondary, #64748b)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <Clock size={12} /> {executionTime}ms
                  </span>
                )}
              </div>

              <Button
                variant="green"
                size="lg"
                onClick={handleRunAITask}
                disabled={isRunningAI || !promptText.trim()}
                icon={
                  isRunningAI ? <Sparkles size={16} className="animate-spin" /> : <Play size={16} />
                }
              >
                {isRunningAI ? 'Executing with AI Model...' : '▶ Run Prompt with AI & See Output'}
              </Button>
            </div>
          </Surface>

          {/* 3. LIVE AI OUTPUT TERMINAL (SEEING OUTPUT HERE ITSELF) */}
          {aiOutput && (
            <Surface variant="bordered" radius="lg" padding="md">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Terminal size={18} color="#059669" />
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: 'var(--aiims-text-heading)',
                    }}
                  >
                    Live AI Generated Output
                  </span>
                  <Badge variant="success">Executed Here</Badge>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyOutput}
                  icon={isCopied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                >
                  {isCopied ? 'Copied' : 'Copy Output'}
                </Button>
              </div>

              <div
                style={{
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  fontSize: '13px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  lineHeight: 1.55,
                  maxHeight: '360px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {aiOutput}
              </div>
            </Surface>
          )}

          {/* 4. INDIVIDUAL SCORE FOR THE TASK REPRESENTATION */}
          {taskScore !== null && (
            <Surface variant="mint" radius="lg" padding="lg">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '14px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* RADIAL SCORE CIRCLE */}
                  <div
                    style={{
                      width: '68px',
                      height: '68px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--aiims-bg-card)',
                      border:
                        taskScore >= 85
                          ? '4px solid var(--aiims-tint-emerald-text)'
                          : '4px solid var(--aiims-tint-amber-text)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'var(--aiims-shadow-card)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '20px',
                        fontWeight: 800,
                        color:
                          taskScore >= 85
                            ? 'var(--aiims-tint-emerald-text)'
                            : 'var(--aiims-tint-amber-text)',
                        lineHeight: 1,
                      }}
                    >
                      {taskScore}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        color: 'var(--aiims-text-muted)',
                        fontWeight: 700,
                      }}
                    >
                      / 100
                    </span>
                  </div>

                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '2px',
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: '18px',
                          fontWeight: 800,
                          color: 'var(--aiims-text-heading)',
                          fontFamily: "'Fredoka', sans-serif",
                        }}
                      >
                        Individual Task Evaluation: {currentTask.difficultyLabel}
                      </h3>
                      <Badge variant={taskScore >= 85 ? 'success' : 'warning'}>
                        {grade || (taskScore >= 85 ? 'Mastery' : 'Proficient')}
                      </Badge>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--aiims-text-body)' }}>
                      Rigorous rubric evaluation based on your submitted prompt & generated AI
                      response.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Badge variant="success" icon={<Award size={12} />}>
                    +50 XP Earned
                  </Badge>
                  <Badge variant="success" icon={<Zap size={12} />}>
                    +15 AC Awarded
                  </Badge>
                </div>
              </div>

              {/* 4 RUBRIC BARS */}
              {scoreBreakdown && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    backgroundColor: 'var(--aiims-bg-card)',
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1px solid var(--aiims-border-card)',
                    marginBottom: '16px',
                    boxShadow: 'var(--aiims-shadow-card)',
                  }}
                >
                  {/* Clarity */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--aiims-text-heading)',
                        marginBottom: '4px',
                      }}
                    >
                      <span>🎯 Clarity & Intent</span>
                      <span>{scoreBreakdown.clarity}/25</span>
                    </div>
                    <div
                      style={{
                        height: '6px',
                        borderRadius: '3px',
                        backgroundColor: 'var(--aiims-border-subtle)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${(scoreBreakdown.clarity / 25) * 100}%`,
                          backgroundColor: '#059669',
                        }}
                      />
                    </div>
                  </div>

                  {/* Constraints */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--aiims-text-heading)',
                        marginBottom: '4px',
                      }}
                    >
                      <span>🛡️ Constraints & Bounds</span>
                      <span>{scoreBreakdown.constraints}/25</span>
                    </div>
                    <div
                      style={{
                        height: '6px',
                        borderRadius: '3px',
                        backgroundColor: 'var(--aiims-border-subtle)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${(scoreBreakdown.constraints / 25) * 100}%`,
                          backgroundColor: '#0284c7',
                        }}
                      />
                    </div>
                  </div>

                  {/* Structure */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--aiims-text-heading)',
                        marginBottom: '4px',
                      }}
                    >
                      <span>📋 Output Schema</span>
                      <span>{scoreBreakdown.structure}/25</span>
                    </div>
                    <div
                      style={{
                        height: '6px',
                        borderRadius: '3px',
                        backgroundColor: 'var(--aiims-border-subtle)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${(scoreBreakdown.structure / 25) * 100}%`,
                          backgroundColor: '#7c3aed',
                        }}
                      />
                    </div>
                  </div>

                  {/* Reliability */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--aiims-text-heading)',
                        marginBottom: '4px',
                      }}
                    >
                      <span>⚡ Verification & Reliability</span>
                      <span>{scoreBreakdown.reliability}/25</span>
                    </div>
                    <div
                      style={{
                        height: '6px',
                        borderRadius: '3px',
                        backgroundColor: 'var(--aiims-border-subtle)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${(scoreBreakdown.reliability / 25) * 100}%`,
                          backgroundColor: '#d97706',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STRENGTHS & IMPROVEMENTS */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '12px',
                  marginBottom: '14px',
                }}
              >
                {strengths.length > 0 && (
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--aiims-tint-emerald-bg)',
                      borderRadius: '8px',
                      border: '1px solid var(--aiims-tint-emerald-border)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: 'var(--aiims-tint-emerald-text)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Demonstrated Strengths
                    </span>
                    <ul
                      style={{
                        margin: '6px 0 0',
                        paddingLeft: '18px',
                        fontSize: '12px',
                        color: 'var(--aiims-tint-emerald-text)',
                        lineHeight: 1.45,
                      }}
                    >
                      {strengths.map((str, idx) => (
                        <li key={idx}>{str}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {gaps.length > 0 && (
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--aiims-tint-amber-bg)',
                      borderRadius: '8px',
                      border: '1px solid var(--aiims-tint-amber-border)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: 'var(--aiims-tint-amber-text)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Target Improvements
                    </span>
                    <ul
                      style={{
                        margin: '6px 0 0',
                        paddingLeft: '18px',
                        fontSize: '12px',
                        color: 'var(--aiims-tint-amber-text)',
                        lineHeight: 1.45,
                      }}
                    >
                      {gaps.map((gap, idx) => (
                        <li key={idx}>{gap}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* EVALUATOR PRO TIP */}
              {evalTip && (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'var(--aiims-tint-emerald-bg)',
                    borderRadius: '8px',
                    border: '1px solid var(--aiims-tint-emerald-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: 'var(--aiims-tint-emerald-text)',
                  }}
                >
                  <Lightbulb size={16} color="#d97706" style={{ flexShrink: 0 }} />
                  <span>
                    <strong>AI Evaluator Tip: </strong>
                    {evalTip}
                  </span>
                </div>
              )}

              {/* SAVE STATUS & NEXT STEPS */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '16px',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>
                  ✓ Task score saved to your Learner Profile
                </span>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {activeTab !== 'advanced' && (
                    <Button
                      variant="green"
                      size="md"
                      icon={<ChevronRight size={14} />}
                      onClick={() => setActiveTab(activeTab === 'easy' ? 'medium' : 'advanced')}
                    >
                      Next Difficulty: {activeTab === 'easy' ? 'Medium' : 'Advanced'} Task
                    </Button>
                  )}
                </div>
              </div>
            </Surface>
          )}
        </div>
      )}
    </div>
  );
};
