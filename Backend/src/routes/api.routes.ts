import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { config } from '../config/env';
import { mockUser, mockDimensionScores, mockCapabilityGaps, mockFocusAreas, mockRadarSignals, mockTransactions, rewardedLevelIds, mockToolCatalog, mockUserTools, mockLearnerFullState } from '../models/aiims.models';
import { User, IUser } from '../models/User.model';
import { ClaudeService } from '../services/anthropic/claude.service';
import { evaluateAssessment } from '../services/assessmentScoring';
import { authenticateStudent, requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
const claudeService = new ClaudeService();

/**
 * Generates a cryptographically signed JWT token with a 7-day expiration
 */
const generateAuthToken = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email: email.toLowerCase().trim() },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
};

// Apply student authentication middleware globally to extract token if present
router.use(authenticateStudent);

// In-memory fallback cache seeded with standard test accounts
export const registeredUsers: Record<string, any> = {
  [mockUser.email.toLowerCase()]: {
    ...mockUser,
    college: 'Engineering & Technology College',
    password: bcrypt.hashSync('password123', 10)
  },
  'alex.ai@example.com': {
    id: 'usr-alex-101',
    name: 'Alex AI',
    email: 'alex.ai@example.com',
    role: 'Student / AI Learner',
    college: 'Stanford University',
    targetGoal: 'Master AI Intelligence & Mentoring',
    stage: 'Knowing',
    xpPoints: 100,
    aiimsCredits: 100,
    password: bcrypt.hashSync('password123', 10)
  }
};

/**
 * Formats a MongoDB User document into a client-ready state payload
 */
const formatUserState = (dbUser: IUser) => {
  return {
    profile: {
      id: dbUser._id ? String(dbUser._id) : dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      college: dbUser.college || 'Engineering & Technology College',
      targetGoal: dbUser.targetGoal,
      stage: dbUser.stage,
      xpPoints: dbUser.xpPoints,
      aiimsCredits: dbUser.aiimsCredits
    },
    assessment: dbUser.assessment || {
      status: 'not_started',
      answers: {},
      currentQuestionIndex: 0,
      completedAt: null,
      rewardClaimed: false,
      scores: { usageFrequency: 0, evaluationCapability: 0, workflowDesign: 0, strategicVision: 0, mentorshipReadiness: 0 }
    },
    analysis: dbUser.analysis || {
      status: 'locked',
      topCapability: 'AI Evaluation & Critical Assessment',
      growthArea: 'AI Workflow Design'
    },
    clarity: dbUser.clarity || {
      status: 'locked',
      selectedAreas: [],
      selectedTopic: null,
      completedTopics: [],
      reflections: {}
    },
    focus: dbUser.focus || {
      status: 'locked',
      selectedTrack: null,
      history: [],
      activatedAt: null
    },
    radar: dbUser.radar || {
      status: 'available',
      investigatedSignalIds: [],
      followedSignalIds: []
    },
    investigation: dbUser.investigation || {
      status: 'locked',
      selectedSignalId: null,
      userNotes: {}
    },
    relevance: { status: 'locked' },
    credits: {
      balance: dbUser.aiimsCredits,
      transactions: dbUser.transactions || [],
      claimedActions: []
    },
    notifications: dbUser.notifications || []
  };
};

// ==========================================
// 1. AUTHENTICATION MODULE
// ==========================================

router.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !email.trim() || !email.includes('@')) {
    return res.status(400).json({ error: 'Email or password is incorrect.' });
  }
  if (!password || !password.trim()) {
    return res.status(400).json({ error: 'Email or password is incorrect.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // 1. Try DB user if connected
  if (mongoose.connection.readyState === 1) {
    try {
      const dbUser = await User.findOne({ email: normalizedEmail });
      if (dbUser) {
        const isMatch = await dbUser.comparePassword(password);
        if (isMatch) {
          const token = generateAuthToken(String(dbUser._id), dbUser.email);
          const userState = formatUserState(dbUser);
          return res.json({
            token,
            user: userState.profile,
            state: userState
          });
        } else {
          return res.status(401).json({ error: 'Email or password is incorrect.' });
        }
      }
    } catch (err) {
      // Proceed to fallback
    }
  }

  // 2. Check registeredUsers in-memory store
  const user = registeredUsers[normalizedEmail];
  if (!user) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }

  const isMatch = user.password && user.password.startsWith('$2')
    ? await bcrypt.compare(password, user.password)
    : user.password === password;

  if (!isMatch) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }

  const token = generateAuthToken(user.id || `usr-${normalizedEmail}`, user.email);
  return res.json({
    token,
    user: {
      id: user.id || `usr-${normalizedEmail}`,
      name: user.name,
      email: user.email,
      role: user.role,
      college: user.college,
      targetGoal: user.targetGoal,
      stage: user.stage,
      xpPoints: user.xpPoints,
      aiimsCredits: user.aiimsCredits
    }
  });
});

router.post('/auth/register', async (req: Request, res: Response) => {
  const { name, email, password, role, college, targetGoal } = req.body;

  if (!email || !email.trim() || !email.includes('@')) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const displayName = (name && name.trim()) || normalizedEmail.split('@')[0];

  try {
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
    }

    const dbUser = await User.create({
      name: displayName,
      email: normalizedEmail,
      password,
      role: role || 'AI Practitioner',
      college: college || 'Engineering & Technology College',
      targetGoal: targetGoal || 'Explore AI Architectures & Intelligence',
      stage: 'Knowing',
      xpPoints: 100,
      aiimsCredits: 100
    });

    const token = generateAuthToken(String(dbUser._id), dbUser.email);
    const userState = formatUserState(dbUser);

    return res.json({
      token,
      user: userState.profile,
      state: userState
    });
  } catch (mongoErr) {
    if (registeredUsers[normalizedEmail]) {
      return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: `usr-${Date.now().toString().slice(-4)}`,
      name: displayName,
      email: normalizedEmail,
      role: role || 'AI Practitioner',
      college: college || 'Engineering & Technology College',
      targetGoal: targetGoal || 'Explore AI Architectures & Intelligence',
      stage: 'Knowing',
      xpPoints: 100,
      aiimsCredits: 100,
      password: hashedPassword
    };

    registeredUsers[normalizedEmail] = newUser;

    const token = generateAuthToken(newUser.id, newUser.email);
    return res.json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        college: newUser.college,
        targetGoal: newUser.targetGoal,
        stage: newUser.stage,
        xpPoints: newUser.xpPoints,
        aiimsCredits: newUser.aiimsCredits
      }
    });
  }
});

// ==========================================
// 2. BIDIRECTIONAL LEARNER STATE SYNC
// ==========================================

router.get('/learner/state', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    state: formatUserState(req.user!)
  });
});

router.put('/learner/state', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { state } = req.body;
  if (!state) {
    return res.status(400).json({ error: 'State payload is required' });
  }

  try {
    const user = req.user!;
    if (state.profile) {
      if (state.profile.name) user.name = state.profile.name;
      if (state.profile.role) user.role = state.profile.role;
      if (state.profile.college) user.college = state.profile.college;
      if (state.profile.targetGoal) user.targetGoal = state.profile.targetGoal;
      if (state.profile.stage) user.stage = state.profile.stage;
      if (typeof state.profile.xpPoints === 'number') user.xpPoints = state.profile.xpPoints;
      if (typeof state.profile.aiimsCredits === 'number') user.aiimsCredits = state.profile.aiimsCredits;
    }
    if (state.assessment) user.assessment = state.assessment;
    if (state.analysis) user.analysis = state.analysis;
    if (state.clarity) user.clarity = state.clarity;
    if (state.focus) user.focus = state.focus;
    if (state.radar) user.radar = state.radar;
    if (state.investigation) user.investigation = state.investigation;
    if (state.credits?.transactions) user.transactions = state.credits.transactions;
    if (state.notifications) user.notifications = state.notifications;

    await user.save();
    return res.json({ success: true, state: formatUserState(user) });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to sync learner state to DB', details: err.message });
  }
});

// ==========================================
// 3. PROFILE MODULE
// ==========================================

router.get('/users/profile', (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    return res.json({
      id: String(req.user._id),
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      college: req.user.college || 'Engineering & Technology College',
      targetGoal: req.user.targetGoal,
      stage: req.user.stage,
      xpPoints: req.user.xpPoints,
      aiimsCredits: req.user.aiimsCredits
    });
  }
  res.json(mockUser);
});

router.put('/users/profile', async (req: AuthenticatedRequest, res: Response) => {
  const { name, role, college, targetGoal } = req.body;

  if (req.user) {
    if (name) req.user.name = name;
    if (role) req.user.role = role;
    if (college) req.user.college = college;
    if (targetGoal) req.user.targetGoal = targetGoal;
    await req.user.save();

    return res.json({
      id: String(req.user._id),
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      college: req.user.college,
      targetGoal: req.user.targetGoal,
      stage: req.user.stage,
      xpPoints: req.user.xpPoints,
      aiimsCredits: req.user.aiimsCredits
    });
  }

  if (name) mockUser.name = name;
  if (role) mockUser.role = role;
  if (targetGoal) mockUser.targetGoal = targetGoal;
  res.json(mockUser);
});

// ==========================================
// 4. ASSESSMENTS & DIAGNOSTICS MODULE
// ==========================================

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

router.post('/assessments/submit', async (req: AuthenticatedRequest, res: Response) => {
  const { answers } = req.body;
  const userAnswers = answers || {};

  // Evaluate open-ended questions (Q11, Q12, Q25) via Anthropic Claude
  const openEndedEvaluations: Record<number, any> = {};

  const q11Text = typeof userAnswers[11] === 'string' ? userAnswers[11] : userAnswers['11'];
  if (q11Text) {
    const eval11 = await claudeService.evaluateOpenEndedAnswer(
      'AI THINKING LAB: Designing Software Architecture',
      'Evaluates authentic problem-framing, system boundary definition, role setting, and technical constraint specification.',
      'Solving with AI',
      'Strong: explicit role, technical stack, modular components, non-functional requirements. Weak: generic vague prompt.',
      q11Text
    );
    if (eval11) openEndedEvaluations[11] = eval11;
  }

  const q12Text = typeof userAnswers[12] === 'string' ? userAnswers[12] : userAnswers['12'];
  if (q12Text) {
    const eval12 = await claudeService.evaluateOpenEndedAnswer(
      'AI THINKING LAB: Building a Working Prototype (MVP)',
      'Evaluates code generation prompting strategy: component modularity, API contract definition, and edge case instructions.',
      'Solving with AI',
      'Strong: explicit languages/frameworks, step-by-step code snippets, mock data, edge cases. Weak: generic request.',
      q12Text
    );
    if (eval12) openEndedEvaluations[12] = eval12;
  }

  const q25Text = typeof userAnswers[25] === 'string' ? userAnswers[25] : userAnswers['25'];
  if (q25Text) {
    const eval25 = await claudeService.evaluateOpenEndedAnswer(
      'AI THINKING LAB: What separates someone who merely uses AI from someone who adapts to AI?',
      'Evaluates meta-cognition, understanding of paradigm shifts, workflow redesign, and human-AI co-evolution.',
      'Adapting to AI',
      'Strong: workflow redesign mindset, understanding capabilities/limits, continuous learning. Weak: superficial statement.',
      q25Text
    );
    if (eval25) openEndedEvaluations[25] = eval25;
  }

  // Calculate scores using AINOVA Assessment Scoring Engine
  const evaluationResult = evaluateAssessment(userAnswers, openEndedEvaluations);

  const creditReward = 50;
  const xpReward = 100;

  if (req.user) {
    const previousBalance = req.user.aiimsCredits;
    req.user.aiimsCredits += creditReward;
    req.user.xpPoints += xpReward;
    req.user.stage = 'Understanding';

    req.user.assessment = {
      status: 'completed',
      answers: userAnswers,
      currentQuestionIndex: 25,
      completedAt: new Date().toISOString(),
      rewardClaimed: true,
      scores: evaluationResult.legacyScores
    };

    req.user.analysis = {
      status: 'unlocked',
      topCapability: evaluationResult.strongestSkill.name,
      growthArea: evaluationResult.roomToGrow.name,
      unlockedAt: new Date().toISOString()
    };

    const tx = {
      id: `tx-assess-${Date.now()}`,
      transactionType: 'LEVEL_COMPLETION',
      type: 'EARN' as const,
      source: 'ASSESSMENT',
      sourceId: 'DIAGNOSTIC_ASSESSMENT',
      amount: creditReward,
      description: 'Completed Discover Your AI Capability Diagnostic (+50 AC)',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      previousBalance,
      newBalance: req.user.aiimsCredits
    };

    req.user.transactions.unshift(tx);
    await req.user.save();

    return res.json({
      message: 'Assessment completed and saved to MongoDB Atlas!',
      earnedCredits: creditReward,
      evaluationResult,
      scores: evaluationResult.legacyScores,
      topCapability: evaluationResult.strongestSkill.name,
      growthArea: evaluationResult.roomToGrow.name,
      updatedBalance: req.user.aiimsCredits,
      updatedScores: req.user.assessment.scores
    });
  }

  // In-memory fallback
  mockUser.aiimsCredits += creditReward;
  mockUser.xpPoints += xpReward;
  mockLearnerFullState.assessment.status = 'completed';
  mockLearnerFullState.assessment.completedAt = new Date().toISOString();
  mockLearnerFullState.analysis.status = 'unlocked';
  mockLearnerFullState.clarity.status = 'unlocked';
  mockLearnerFullState.focus.status = 'unlocked';

  mockTransactions.unshift({
    id: `tx-${Date.now()}`,
    type: 'EARN',
    amount: creditReward,
    description: 'Completed Discover Your AI Profile Diagnostic (+50 AC)',
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
  });

  res.json({
    message: 'Assessment recorded',
    earnedCredits: creditReward,
    evaluationResult,
    updatedBalance: mockUser.aiimsCredits,
    updatedScores: mockDimensionScores
  });
});

// ==========================================
// 5. ANALYSIS MODULE
// ==========================================

router.get('/analysis/individual', (req: AuthenticatedRequest, res: Response) => {
  const profile = req.user ? formatUserState(req.user).profile : mockUser;
  const scores = req.user?.assessment?.scores ? [
    { dimension: 'Generative AI Tech', score: req.user.assessment.scores.usageFrequency || 82, benchmark: 75 },
    { dimension: 'Prompt Engineering', score: req.user.assessment.scores.evaluationCapability || 88, benchmark: 80 },
    { dimension: 'Agentic Workflows', score: req.user.assessment.scores.workflowDesign || 62, benchmark: 78 },
    { dimension: 'AI Ethics & Alignment', score: req.user.assessment.scores.strategicVision || 70, benchmark: 72 },
    { dimension: 'Tool Integration', score: req.user.assessment.scores.mentorshipReadiness || 78, benchmark: 74 }
  ] : mockDimensionScores;

  res.json({
    learner: profile,
    scores,
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

// ==========================================
// 6. CREDITS WALLET MODULE
// ==========================================

router.get('/credits/wallet', (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    return res.json({
      balance: req.user.aiimsCredits,
      transactions: req.user.transactions || []
    });
  }
  res.json({
    balance: mockUser.aiimsCredits,
    transactions: mockTransactions
  });
});

router.post('/credits/award-level', async (req: AuthenticatedRequest, res: Response) => {
  const { levelId } = req.body;
  const numLevel = Number(levelId);
  const rewardAmount = 10;

  if (req.user) {
    const previousBalance = req.user.aiimsCredits;
    req.user.aiimsCredits += rewardAmount;
    req.user.xpPoints += 50;

    const tx = {
      id: `tx-level-${numLevel}-${Date.now()}`,
      transactionType: 'LEVEL_COMPLETION',
      type: 'EARN' as const,
      source: 'ASSESSMENT',
      sourceId: `LEVEL_0${numLevel}`,
      amount: rewardAmount,
      description: `Completed AI Quest Level 0${numLevel} (+10 AC)`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      previousBalance,
      newBalance: req.user.aiimsCredits
    };

    req.user.transactions.unshift(tx);
    await req.user.save();

    return res.json({
      awarded: true,
      amount: rewardAmount,
      previousBalance,
      newBalance: req.user.aiimsCredits,
      transaction: tx
    });
  }

  // Fallback
  if (rewardedLevelIds.has(numLevel)) {
    return res.json({
      awarded: false,
      message: `Level 0${numLevel} credits already awarded`,
      amount: 0,
      currentBalance: mockUser.aiimsCredits
    });
  }

  const previousBalance = mockUser.aiimsCredits;
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

router.post('/credits/invest', async (req: AuthenticatedRequest, res: Response) => {
  const { amount, description } = req.body;

  if (req.user) {
    if (req.user.aiimsCredits < amount) {
      return res.status(400).json({ error: 'Insufficient AIIMS Credits balance' });
    }
    const previousBalance = req.user.aiimsCredits;
    req.user.aiimsCredits -= amount;

    const tx = {
      id: `tx-invest-${Date.now()}`,
      transactionType: 'SPEND',
      type: 'SPEND' as const,
      source: 'MENTOR',
      sourceId: 'LAB_INVESTMENT',
      amount,
      description: description || 'Invested in mentoring activity',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      previousBalance,
      newBalance: req.user.aiimsCredits
    };

    req.user.transactions.unshift(tx);
    await req.user.save();

    return res.json({ balance: req.user.aiimsCredits, transaction: tx });
  }

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

// ==========================================
// 7. CLARITY, FOCUS & RADAR MODULES
// ==========================================

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

router.post('/investigations/submit', async (req: AuthenticatedRequest, res: Response) => {
  const { signalId, personalInterpretation } = req.body;
  const reward = 30;

  if (req.user) {
    const previousBalance = req.user.aiimsCredits;
    req.user.aiimsCredits += reward;
    req.user.xpPoints += 100;

    if (!req.user.radar.investigatedSignalIds.includes(signalId)) {
      req.user.radar.investigatedSignalIds.push(signalId);
    }
    req.user.investigation.userNotes[signalId] = personalInterpretation;

    const tx = {
      id: `tx-inv-${Date.now()}`,
      transactionType: 'SIGNAL_INVESTIGATION',
      type: 'EARN' as const,
      source: 'RADAR',
      sourceId: signalId,
      amount: reward,
      description: `Investigated Signal: ${signalId} (+30 AC)`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      previousBalance,
      newBalance: req.user.aiimsCredits
    };

    req.user.transactions.unshift(tx);
    await req.user.save();

    return res.json({
      message: 'Investigation recorded. 30 AIIMS Credits earned!',
      personalInterpretation,
      creditsEarned: reward,
      newBalance: req.user.aiimsCredits
    });
  }

  mockUser.aiimsCredits += reward;
  mockUser.xpPoints += 100;
  const tx = {
    id: `tx-${Date.now()}`,
    type: 'EARN' as const,
    amount: reward,
    description: `Investigated Signal ${signalId}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
  };
  mockTransactions.unshift(tx);

  res.json({
    message: 'Investigation recorded. 30 AIIMS Credits earned!',
    personalInterpretation,
    creditsEarned: reward,
    newBalance: mockUser.aiimsCredits
  });
});

router.post('/relevance/generate', async (req: AuthenticatedRequest, res: Response) => {
  const { signalId } = req.body;
  const signal = mockRadarSignals.find(s => s.id === signalId) || mockRadarSignals[0];
  const gapSummary = mockCapabilityGaps.map(g => g.capabilityArea).join(', ');

  const studentRole = req.user?.role || mockUser.role;
  const studentGoal = req.user?.targetGoal || mockUser.targetGoal;

  const report = await claudeService.generateRelevanceReport(
    studentRole,
    studentGoal,
    gapSummary,
    signal.title,
    signal.summary
  );

  res.json(report);
});

router.post('/ai/mentor', async (req: AuthenticatedRequest, res: Response) => {
  const { role, stage, topCapability, growthArea, activeFocus, clarityTopic, hasReflection, hasInvestigation } = req.body;

  const studentRole = role || req.user?.role || 'Student / AI Learner';
  const studentCollege = req.user?.college || 'your college';

  let message = `Hello! As an AI learner at ${studentCollege}, I noticed you are focused on ${activeFocus || growthArea || 'mastering AI capability'}. Continuing your active track will strengthen your practical engineering instincts.`;
  
  if (!stage || stage === 'Knowing') {
    message = `Welcome to AIIMS! Your AI journey at ${studentCollege} starts with establishing your baseline capability profile. Completing the diagnostic provides a verifiable radar of your strengths and growth areas.`;
  } else if (hasInvestigation) {
    message = `Great work on your technical signal investigation! Analyzing how emerging breakthroughs impact your role as ${studentRole} builds verifiable engineering judgment.`;
  } else if (activeFocus) {
    message = `Your active focus track is set to '${activeFocus}'. Explore real-time technical shifts in AI Radar to test your knowledge against modern production architectures.`;
  }

  res.json({
    message,
    observationType: 'observation',
    relatedStage: stage || req.user?.stage || 'Knowing',
    relatedTopic: activeFocus || growthArea,
    suggestedAction: {
      text: activeFocus ? 'Explore AI Radar' : 'Start Assessment',
      targetTab: activeFocus ? 'radar' : 'assessment'
    },
    provider: 'ai_service'
  });
});

// ==========================================
// 8. AI WALLET MODULE (Admin-Updatable Catalog & Neutral Recommendations)
// ==========================================

router.get('/wallet/catalog', (req: Request, res: Response) => {
  res.json(mockToolCatalog.filter(t => t.activeStatus));
});

router.get('/wallet/user', (req: AuthenticatedRequest, res: Response) => {
  res.json(mockUserTools);
});

router.get('/wallet/recommendations', (req: AuthenticatedRequest, res: Response) => {
  // Generate recommendations dynamically from catalog metadata without hardcoded tool IDs
  const userTools = (req.user as any)?.aiWallet?.userTools || mockLearnerFullState.aiWallet?.userTools || mockUserTools;
  const userToolMap = new Map<string, string>();
  userTools.forEach((t: any) => userToolMap.set(t.toolId, t.familiarity));

  const walletCategories = new Set(userTools.map((t: any) => t.primaryCategory));
  const activeFocus = req.user?.focus?.selectedTrack || mockLearnerFullState.focus?.selectedTrack || mockLearnerFullState.analysis?.growthArea || 'AI Workflow Design';
  const growthArea = mockLearnerFullState.analysis?.growthArea || 'AI Workflow Design';
  const clarityTopic = req.user?.clarity?.selectedTopic || mockLearnerFullState.clarity?.selectedTopic || '';
  const investigatedRadarIds = req.user?.radar?.investigatedSignalIds || mockLearnerFullState.radar?.investigatedSignalIds || [];

  const recs = [];

  const containsMatch = (targetText: string, searchKey: string): boolean => {
    if (!targetText || !searchKey) return false;
    return targetText.toLowerCase().includes(searchKey.toLowerCase()) || searchKey.toLowerCase().includes(targetText.toLowerCase());
  };

  for (const tool of mockToolCatalog) {
    if (!tool.activeStatus) continue;

    const familiarity = userToolMap.get(tool.id);
    const matchedSignals: { type: string; snippet: string; priority: number }[] = [];

    const toolFocusTracks = tool.focusTracks || [tool.category];
    const toolClarityTopics = tool.clarityTopics || tool.taskMappings || [];
    const toolRadarTopics = tool.radarTopics || [tool.category];
    const toolCategories = tool.categories || [tool.category];
    const toolRelatedTools = tool.relatedTools || [];

    // 1. FOCUS_BASED
    if (toolFocusTracks.some(ft => containsMatch(ft, activeFocus)) || toolCategories.some(cat => containsMatch(cat, activeFocus))) {
      matchedSignals.push({
        type: 'FOCUS_BASED',
        snippet: `aligns with your active focus on ${activeFocus}`,
        priority: 2
      });
    }

    // 2. RADAR_DISCOVERY
    let matchedRadarTopic: string | null = null;
    if (investigatedRadarIds.length > 0) {
      for (const sigId of investigatedRadarIds) {
        if (toolRadarTopics.includes(sigId) || toolRelatedTools.includes(sigId)) {
          matchedRadarTopic = toolRadarTopics.find(t => t !== sigId) || tool.category;
          break;
        }
      }
      if (!matchedRadarTopic) {
        const matchingTopic = toolRadarTopics.find(rt => investigatedRadarIds.some((sigId: string) => containsMatch(rt, sigId)));
        if (matchingTopic) matchedRadarTopic = matchingTopic;
      }
    }
    if (matchedRadarTopic) {
      const displayTopic = matchedRadarTopic.toLowerCase().includes('sig-') ? tool.category : matchedRadarTopic;
      matchedSignals.push({
        type: 'RADAR_DISCOVERY',
        snippet: `supports ${displayTopic} capabilities you explored on AI Radar`,
        priority: 1
      });
    }

    // 3. TASK_BASED
    if (clarityTopic && (toolClarityTopics.some(ct => containsMatch(ct, clarityTopic)) || toolCategories.some(cat => containsMatch(cat, clarityTopic)))) {
      matchedSignals.push({
        type: 'TASK_BASED',
        snippet: `directly supports your Clarity goal ("${clarityTopic}")`,
        priority: 3
      });
    }

    // 4. SKILL_GAP
    if (growthArea && (toolCategories.some(cat => containsMatch(cat, growthArea)) || toolFocusTracks.some(ft => containsMatch(ft, growthArea)))) {
      matchedSignals.push({
        type: 'SKILL_GAP',
        snippet: `strengthens your growth area in ${growthArea}`,
        priority: 4
      });
    }

    // 5. TOOLKIT_GAP
    if (!walletCategories.has(tool.category) && !familiarity) {
      matchedSignals.push({
        type: 'TOOLKIT_GAP',
        snippet: `fills an unrepresented category (${tool.category}) in your current AI toolkit`,
        priority: 5
      });
    }

    // 6. ALTERNATIVE_TOOL
    const isAlt = userTools.some((ut: any) => {
      const userToolObj = mockToolCatalog.find(c => c.id === ut.toolId);
      return userToolObj && (userToolObj.alternatives?.includes(tool.id) || tool.alternatives?.includes(ut.toolId));
    });
    if (isAlt && !familiarity) {
      matchedSignals.push({
        type: 'ALTERNATIVE_TOOL',
        snippet: `offers a complementary workflow alternative to tools in your wallet`,
        priority: 6
      });
    }

    if (matchedSignals.length === 0) continue;

    // Familiarity filtering
    if (familiarity === 'mastered') {
      const hasRadarOrAlt = matchedSignals.some(s => s.type === 'RADAR_DISCOVERY' || s.type === 'ALTERNATIVE_TOOL');
      if (!hasRadarOrAlt) continue;
    } else if (familiarity === 'proficient') {
      const hasAdvancedSignal = matchedSignals.some(s => s.type === 'RADAR_DISCOVERY' || s.type === 'ALTERNATIVE_TOOL' || s.type === 'FOCUS_BASED');
      if (!hasAdvancedSignal) continue;
    }

    matchedSignals.sort((a, b) => a.priority - b.priority);
    const primarySignal = matchedSignals[0];
    const allSignalTypes = Array.from(new Set(matchedSignals.map(s => s.type)));

    let synthesizedReason = '';
    const snippets = matchedSignals.slice(0, 3).map(s => s.snippet);
    if (snippets.length === 1) {
      synthesizedReason = `You're seeing this because ${tool.name} ${snippets[0]}.`;
    } else if (snippets.length === 2) {
      synthesizedReason = `You're seeing this because ${tool.name} ${snippets[0]}, and ${snippets[1]}.`;
    } else {
      synthesizedReason = `You're seeing this because ${tool.name} ${snippets[0]}, ${snippets[1]}, and ${snippets[2]}.`;
    }

    let actionLabel = 'Add to Wallet & Explore';
    if (familiarity === 'exploring') actionLabel = 'Explore & Practice Tool';
    else if (familiarity === 'practicing') actionLabel = 'Practice a Real Task';
    else if (familiarity === 'proficient') actionLabel = 'Try an Advanced Workflow';
    else if (familiarity === 'mastered') actionLabel = 'View Advanced Opportunities';

    recs.push({
      id: `rec-${tool.id}`,
      toolId: tool.id,
      type: primarySignal.type,
      matchedSignals: allSignalTypes,
      reason: synthesizedReason,
      relatedTask: tool.useCases[0] || tool.category,
      relatedSkill: tool.category,
      relevance: `Aligned with your ${activeFocus} workflow`,
      actionLabel,
      status: 'active',
      createdAt: 'Just now'
    });
  }

  res.json(recs);
});

router.post('/wallet/add', (req: AuthenticatedRequest, res: Response) => {
  const { toolId, familiarity, primaryCategory, userNotes } = req.body;
  const existing = mockUserTools.find(t => t.toolId === toolId);
  
  if (existing) {
    existing.familiarity = familiarity || existing.familiarity;
    if (userNotes) existing.userNotes = userNotes;
    return res.json({ success: true, item: existing, action: 'updated' });
  }

  const catalogItem = mockToolCatalog.find(t => t.id === toolId);
  const newItem = {
    toolId,
    addedAt: new Date().toISOString().split('T')[0],
    familiarity: familiarity || 'exploring',
    userNotes: userNotes || '',
    primaryCategory: primaryCategory || catalogItem?.category || 'Reasoning & Writing',
    customTags: ['my-toolkit']
  };

  mockUserTools.unshift(newItem);
  res.json({ success: true, item: newItem, action: 'added' });
});

router.post('/wallet/update-familiarity', (req: AuthenticatedRequest, res: Response) => {
  const { toolId, familiarity, userNotes } = req.body;
  const item = mockUserTools.find(t => t.toolId === toolId);
  
  if (!item) {
    return res.status(404).json({ error: 'Tool not found in user wallet' });
  }

  if (familiarity) item.familiarity = familiarity;
  if (userNotes !== undefined) item.userNotes = userNotes;

  res.json({ success: true, item });
});

router.post('/wallet/compare', (req: Request, res: Response) => {
  const { toolAId, toolBId, task } = req.body;
  
  const toolA = mockToolCatalog.find(t => t.id === toolAId) || mockToolCatalog[0];
  const toolB = mockToolCatalog.find(t => t.id === toolBId) || mockToolCatalog[1];

  const targetTask = task || toolA.taskMappings[0] || 'Long-form reasoning & document analysis';

  res.json({
    task: targetTask,
    toolA,
    toolB,
    comparisonPoints: [
      {
        feature: 'Primary Task Fit',
        toolAFit: `${toolA.name} is designed for ${toolA.useCases[0] || 'versatile execution'}.`,
        toolBFit: `${toolB.name} is designed for ${toolB.useCases[0] || 'targeted technical tasks'}.`
      },
      {
        feature: 'Context Window & Architecture',
        toolAFit: toolA.limitations[0] || 'Standard context management.',
        toolBFit: toolB.strengths[0] || 'Extended context or workspace index.'
      },
      {
        feature: 'Specialized Capabilities',
        toolAFit: toolA.capabilities.slice(0, 3).join(', '),
        toolBFit: toolB.capabilities.slice(0, 3).join(', ')
      },
      {
        feature: 'Workflow Strengths',
        toolAFit: toolA.strengths.slice(0, 2).join(' • '),
        toolBFit: toolB.strengths.slice(0, 2).join(' • ')
      }
    ],
    keyConsideration: `When choosing between ${toolA.name} and ${toolB.name}, consider your primary bottleneck: high-velocity quick queries vs deeper structured artifacts.`,
    summaryQuestion: `Which may fit your task?`
  });
});

export default router;

