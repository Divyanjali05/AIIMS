import { Router, Request, Response } from 'express';
import { mockUser, mockDimensionScores, mockCapabilityGaps, mockFocusAreas, mockRadarSignals, mockTransactions, rewardedLevelIds } from '../models/aiims.models';
import { ClaudeService } from '../services/anthropic/claude.service';

const router = Router();
const claudeService = new ClaudeService();

// 1. AUTH MODULE
router.post('/auth/login', (req: Request, res: Response) => {
  res.json({ token: 'mock-jwt-token-aiims', user: mockUser });
});

// 2. USERS MODULE
router.get('/users/profile', (req: Request, res: Response) => {
  res.json(mockUser);
});

router.put('/users/profile', (req: Request, res: Response) => {
  const { name, role, targetGoal } = req.body;
  if (name) mockUser.name = name;
  if (role) mockUser.role = role;
  if (targetGoal) mockUser.targetGoal = targetGoal;
  res.json(mockUser);
});

// 3. ASSESSMENTS MODULE
router.get('/assessments/questions', (req: Request, res: Response) => {
  res.json([
    {
      id: 'q1',
      dimension: 'Prompt Engineering',
      type: 'mcq',
      prompt: 'Which prompting technique best mitigates hallucination in complex multi-step reasoning?',
      options: ['Few-Shot Prompting', 'Chain-of-Thought (CoT)', 'Zero-Shot Direct', 'System Prompt Overriding'],
      correctOptionIndex: 1
    },
    {
      id: 'q2',
      dimension: 'Agentic Workflows',
      type: 'open_ended',
      prompt: 'Describe how you would design state persistence and fallback handling for an autonomous research agent when an external tool API fails.',
      rubric: 'Evaluates understanding of agentic retry loops, exponential backoff, state checkpointing, and graceful degraded response.'
    }
  ]);
});

router.post('/assessments/submit', async (req: Request, res: Response) => {
  const { answers } = req.body;
  
  // Extract raw prompts for Q11 & Q12 if submitted
  const architecturePrompt = answers?.find((a: any) => String(a.questionId) === '11')?.answer || '';
  const prototypePrompt = answers?.find((a: any) => String(a.questionId) === '12')?.answer || '';

  // Optional Anthropic Claude evaluation for open-ended architecture prompt
  let evaluation = null;
  if (architecturePrompt) {
    evaluation = await claudeService.evaluateOpenEndedAnswer(
      'Designing Software Architecture Prompt',
      'Evaluates problem-framing, constraint specification, and AI-thinking behavior',
      architecturePrompt
    );
  }

  // Award +20 AIIMS Credits as defined in the diagnostic spec
  const creditReward = 20;
  mockUser.aiimsCredits += creditReward;
  mockUser.xpPoints += 100;

  mockTransactions.unshift({
    id: `tx-${Date.now()}`,
    type: 'EARN',
    amount: creditReward,
    description: 'Completed Discover Your AI Profile Diagnostic (+20 AC)',
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
  });

  res.json({
    message: 'Assessment completed and raw responses recorded successfully',
    earnedCredits: creditReward,
    evaluation,
    updatedBalance: mockUser.aiimsCredits,
    updatedScores: mockDimensionScores
  });
});

// 4. ANALYSIS MODULE (Individual, Comparative, Overall)
router.get('/analysis/individual', (req: Request, res: Response) => {
  res.json({
    learner: mockUser,
    scores: mockDimensionScores,
    strengths: ['Prompt Engineering (88%)', 'Generative AI Tech (82%)'],
    gaps: ['Agentic Workflows (62%)', 'ML Fundamentals (65%)']
  });
});

router.get('/analysis/comparative', (req: Request, res: Response) => {
  res.json({
    scores: mockDimensionScores,
    cohortPercentile: 78,
    peerAverage: 72.5
  });
});

router.get('/analysis/overall', (req: Request, res: Response) => {
  res.json({
    totalStudents: 1240,
    cohortAverage: 71.4,
    topDimension: 'Prompt Engineering',
    biggestKnowledgeGap: 'Agentic Workflows'
  });
});

// 5. CREDITS MODULE
router.get('/credits/wallet', (req: Request, res: Response) => {
  res.json({
    balance: mockUser.aiimsCredits,
    transactions: mockTransactions
  });
});

router.post('/credits/award-level', (req: Request, res: Response) => {
  const { levelId } = req.body;
  const numLevel = Number(levelId);

  // Duplicate prevention check
  if (rewardedLevelIds.has(numLevel)) {
    return res.json({
      awarded: false,
      message: `Level 0${numLevel} completion credits already awarded previously`,
      amount: 0,
      currentBalance: mockUser.aiimsCredits
    });
  }

  const previousBalance = mockUser.aiimsCredits;
  const rewardAmount = 10;
  mockUser.aiimsCredits += rewardAmount;
  rewardedLevelIds.add(numLevel);

  const tx = {
    id: `tx-level-${numLevel}-${Date.now()}`,
    transactionType: 'LEVEL_COMPLETION' as const,
    source: 'ASSESSMENT' as const,
    sourceId: `LEVEL_0${numLevel}`,
    amount: rewardAmount,
    description: `Completed AI Quest Level 0${numLevel} (+10 AC)`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    previousBalance,
    newBalance: mockUser.aiimsCredits
  };

  mockTransactions.unshift(tx as any);

  res.json({
    awarded: true,
    amount: rewardAmount,
    previousBalance,
    newBalance: mockUser.aiimsCredits,
    transaction: tx
  });
});

router.post('/credits/invest', (req: Request, res: Response) => {
  const { amount, description } = req.body;
  if (mockUser.aiimsCredits < amount) {
    return res.status(400).json({ error: 'Insufficient AIIMS Credits balance' });
  }
  const previousBalance = mockUser.aiimsCredits;
  mockUser.aiimsCredits -= amount;
  const tx = {
    id: `tx-${Date.now()}`,
    transactionType: 'SPEND' as const,
    source: 'MENTOR' as const,
    sourceId: 'LAB_INVESTMENT',
    amount,
    description: description || 'Invested in mentoring activity',
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    previousBalance,
    newBalance: mockUser.aiimsCredits
  };
  mockTransactions.unshift(tx as any);
  res.json({ balance: mockUser.aiimsCredits, transaction: tx });
});

// 6. CLARITY MODULE (Capability Gaps & Mentor Review)
router.get('/clarity/gaps', (req: Request, res: Response) => {
  res.json(mockCapabilityGaps);
});

router.post('/clarity/mentor-override', (req: Request, res: Response) => {
  const { gapId, mentorOverride } = req.body;
  const gap = mockCapabilityGaps.find(g => g.id === gapId);
  if (gap) {
    gap.mentorOverride = mentorOverride;
    gap.isOverridden = true;
  }
  res.json(gap);
});

// 7. FOCUS MODULE (Priority Areas)
router.get('/focus/areas', (req: Request, res: Response) => {
  res.json(mockFocusAreas);
});

router.post('/focus/override', (req: Request, res: Response) => {
  const { focusId, mentorOverride } = req.body;
  const focus = mockFocusAreas.find(f => f.id === focusId);
  if (focus) {
    focus.mentorOverride = mentorOverride;
  }
  res.json(focus);
});

// 8. RADAR MODULE (Opportunity Signals)
router.get('/radar/signals', (req: Request, res: Response) => {
  res.json(mockRadarSignals);
});

router.post('/radar/follow', (req: Request, res: Response) => {
  const { signalId } = req.body;
  const signal = mockRadarSignals.find(s => s.id === signalId);
  if (signal) {
    signal.isFollowed = !signal.isFollowed;
  }
  res.json(signal);
});

// 9. INVESTIGATIONS MODULE (Yesterday -> Today -> What Changed -> Who's Affected)
router.post('/investigations/submit', (req: Request, res: Response) => {
  const { signalId, personalInterpretation } = req.body;
  // Reward credits for completing an investigation
  mockUser.aiimsCredits += 30;
  mockUser.xpPoints += 100;
  const tx = {
    id: `tx-${Date.now()}`,
    type: 'EARN' as const,
    amount: 30,
    description: `Investigated Signal ${signalId}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
  };
  mockTransactions.unshift(tx);

  res.json({
    message: 'Investigation recorded. 30 AIIMS Credits earned!',
    personalInterpretation,
    creditsEarned: 30,
    newBalance: mockUser.aiimsCredits
  });
});

// 10. RELEVANCE MODULE ("Why does this matter to me?")
router.post('/relevance/generate', async (req: Request, res: Response) => {
  const { signalId } = req.body;
  const signal = mockRadarSignals.find(s => s.id === signalId) || mockRadarSignals[0];
  const gapSummary = mockCapabilityGaps.map(g => g.capabilityArea).join(', ');

  const report = await claudeService.generateRelevanceReport(
    mockUser.role,
    mockUser.targetGoal,
    gapSummary,
    signal.title,
    signal.summary
  );

  res.json(report);
});

// 11. AI MENTOR BOUNDARY MODULE
router.post('/ai/mentor', async (req: Request, res: Response) => {
  const { role, stage, topCapability, growthArea, activeFocus, clarityTopic, hasReflection, hasInvestigation } = req.body;

  let message = `I noticed you are currently focused on ${activeFocus || growthArea || 'understanding your AI profile'}. Continuing your active track will strengthen your workflow integration.`;
  if (!stage || stage === 'Assessment') {
    message = "Your AI journey begins with understanding your baseline profile. Completing the diagnostic gives us a clear picture of how you work with AI.";
  } else if (hasInvestigation) {
    message = `Your technical signal investigation is recorded! Connect this market shift with your active focus in '${activeFocus || growthArea}'.`;
  } else if (activeFocus) {
    message = `Your active focus track is set to '${activeFocus}'. Explore real-time technical shifts in AI Radar to test your understanding.`;
  }

  res.json({
    message,
    observationType: 'observation',
    relatedStage: stage || 'Command Centre',
    relatedTopic: activeFocus || growthArea,
    suggestedAction: {
      text: activeFocus ? 'Explore AI Radar' : 'Start Assessment',
      targetTab: activeFocus ? 'radar' : 'assessment'
    },
    provider: 'ai_service'
  });
});

export default router;
