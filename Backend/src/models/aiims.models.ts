import { UserProfile, DimensionScore, CapabilityGap, FocusArea, RadarSignal, CreditTransaction } from '../types';

export const mockUser: UserProfile = {
  id: 'usr-101',
  name: 'Divya Kumar',
  email: 'divya@example.com',
  role: 'AI Product Lead / Engineer',
  targetGoal: 'Master Agentic Workflows & Multi-Modal AI Deployment',
  stage: 'Recognising',
  xpPoints: 1250,
  aiimsCredits: 420 // Initial Account Balance
};

// Track level completions that have already received credit rewards (prevents duplicate rewards)
export const rewardedLevelIds: Set<number> = new Set<number>();

export const mockDimensionScores: DimensionScore[] = [
  { dimension: 'Generative AI Tech', score: 82, benchmark: 75 },
  { dimension: 'Prompt Engineering', score: 88, benchmark: 80 },
  { dimension: 'Agentic Workflows', score: 62, benchmark: 78 },
  { dimension: 'AI Ethics & Alignment', score: 70, benchmark: 72 },
  { dimension: 'ML Fundamentals', score: 65, benchmark: 70 },
  { dimension: 'Tool Integration', score: 78, benchmark: 74 }
];

export const mockCapabilityGaps: CapabilityGap[] = [
  {
    id: 'gap-1',
    capabilityArea: 'Agentic Workflow Orchestration',
    currentLevel: 62,
    targetLevel: 85,
    aiInterpretation: 'Learner exhibits strong prompt design but struggles with multi-agent state persistence and tool execution loops.',
    isOverridden: false
  },
  {
    id: 'gap-2',
    capabilityArea: 'ML Foundation Model Fine-Tuning',
    currentLevel: 65,
    targetLevel: 80,
    aiInterpretation: 'Basic intuition of RAG pipelines present, but lacks hands-on experience with LoRA adapter tuning.',
    mentorOverride: 'Mentor Note: Focus on RAG evaluation metrics (Ragas framework) before deep-diving into parameter fine-tuning.',
    isOverridden: true
  }
];

export const mockFocusAreas: FocusArea[] = [
  {
    id: 'focus-1',
    title: 'Master Multi-Agent Routing (LangGraph / Autogen)',
    priority: 'High',
    aiReasoning: 'Critical gap identified in agentic state persistence. Closing this increases overall capability by 22%.',
    estimatedCredits: 50,
    status: 'In Progress'
  },
  {
    id: 'focus-2',
    title: 'Evaluate RAG Triad Metrics (Context Precision & Recall)',
    priority: 'High',
    aiReasoning: 'Aligns directly with target goal of enterprise-grade RAG deployment.',
    estimatedCredits: 40,
    status: 'Pending'
  }
];

export const mockRadarSignals: RadarSignal[] = [
  {
    id: 'sig-1',
    title: 'Claude 3.5 Sonnet & Computer Use Capability',
    category: 'Model Release',
    summary: 'AI models can now interact directly with desktop OS environments via mouse and keyboard emulation.',
    scaffold: {
      yesterday: 'AI models responded purely via text/JSON APIs requiring human developers to bind tools.',
      today: 'Models interpret visual screenshots and execute native GUI actions directly.',
      whatChanged: 'Shift from text-only APIs to direct GUI interaction loops.',
      whosAffected: 'QA Automation Engineers, Software Developers, Workflow Automation Specialists.'
    },
    isFollowed: true
  },
  {
    id: 'sig-2',
    title: 'Autonomous Coding Agents (Devin / SWE-Bench benchmark shifts)',
    category: 'Workflow',
    summary: 'Agentic coding platforms autonomously plan multi-file diffs and debug failing unit tests.',
    scaffold: {
      yesterday: 'Copilot auto-completed code line-by-line.',
      today: 'Agents read full GitHub repositories and execute terminal build loops.',
      whatChanged: 'Transition from code completion to end-to-end task execution.',
      whosAffected: 'Fullstack Engineers, DevOps Engineers, Technical Product Managers.'
    },
    isFollowed: false
  }
];

export const mockTransactions: CreditTransaction[] = [
  {
    id: 'tx-init-1',
    transactionType: 'SIGNAL_INVESTIGATION',
    source: 'RADAR',
    sourceId: 'sig-1',
    amount: 30,
    description: 'Investigated Computer Use Signal',
    timestamp: '2026-09-15 14:15',
    previousBalance: 390,
    newBalance: 420
  }
];
