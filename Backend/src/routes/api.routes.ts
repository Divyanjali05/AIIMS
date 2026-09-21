import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { mockUser, mockDimensionScores, mockCapabilityGaps, mockFocusAreas, mockRadarSignals, mockTransactions, rewardedLevelIds, mockToolCatalog, mockUserTools, mockLearnerFullState } from '../models/aiims.models';
import { User, IUser } from '../models/User.model';
import { ClaudeService } from '../services/anthropic/claude.service';
import { authenticateStudent, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
const claudeService = new ClaudeService();

// Apply student authentication middleware to populate req.user from MongoDB Atlas
router.use(authenticateStudent);

// In-memory fallback cache
const registeredUsers: Record<string, any> = {
  [mockUser.email.toLowerCase()]: {
    ...mockUser,
    college: 'Engineering & Technology College',
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

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }
  if (!password || password.trim().length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // 1. Find or auto-create student in MongoDB Atlas
    let dbUser = await User.findOne({ email: normalizedEmail });

    if (!dbUser) {
      const usernamePart = normalizedEmail.split('@')[0];
      const formattedName = usernamePart
        .split(/[._-]/)
        .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Learner';

      dbUser = await User.create({
        name: formattedName,
        email: normalizedEmail,
        password: password,
        role: 'Student / AI Learner',
        college: 'Engineering & Technology College',
        targetGoal: 'Master AI Intelligence & Mentoring',
        stage: 'Knowing',
        xpPoints: 100,
        aiimsCredits: 100
      });
      console.log(`🌿 Created new student in MongoDB Atlas: ${normalizedEmail}`);
    } else {
      console.log(`🌿 Found student in MongoDB Atlas: ${normalizedEmail}`);
      const isMatch = await dbUser.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
      }
    }

    // Sync session mockUser
    Object.assign(mockUser, {
      id: String(dbUser._id),
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      targetGoal: dbUser.targetGoal,
      stage: dbUser.stage,
      xpPoints: dbUser.xpPoints,
      aiimsCredits: dbUser.aiimsCredits
    });

    const token = `aiims-jwt-${Buffer.from(dbUser.email).toString('base64')}-${Date.now()}`;
    const userState = formatUserState(dbUser);

    return res.json({
      token,
      user: userState.profile,
      state: userState
    });
  } catch (mongoErr) {
    console.warn(`MongoDB login fallback to memory:`, mongoErr);
    let user = registeredUsers[normalizedEmail];
    if (!user) {
      const usernamePart = normalizedEmail.split('@')[0];
      const formattedName = usernamePart
        .split(/[._-]/)
        .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Learner';

      const hashedPassword = await bcrypt.hash(password, 10);
      user = {
        id: `usr-${Date.now().toString().slice(-4)}`,
        name: formattedName,
        email: normalizedEmail,
        role: 'Student / AI Learner',
        college: 'Engineering & Technology College',
        targetGoal: 'Master AI Intelligence & Mentoring',
        stage: 'Knowing',
        xpPoints: 100,
        aiimsCredits: 100,
        password: hashedPassword
      };
      registeredUsers[normalizedEmail] = user;
    } else {
      const isMatch = user.password && user.password.startsWith('$2')
        ? await bcrypt.compare(password, user.password)
        : user.password === password;

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
      }
    }

    Object.assign(mockUser, user);
    const token = `aiims-jwt-${Buffer.from(user.email).toString('base64')}-${Date.now()}`;
    return res.json({
      token,
      user: {
        id: user.id,
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
  }
});

router.post('/auth/register', async (req: Request, res: Response) => {
  const { name, email, password, role, college, targetGoal } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const displayName = (name && name.trim()) || normalizedEmail.split('@')[0];

  try {
    let dbUser = await User.findOne({ email: normalizedEmail });
    if (dbUser) {
      return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
    }

    dbUser = await User.create({
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

    console.log(`🌿 Registered new student in MongoDB Atlas: ${normalizedEmail} (${dbUser.college})`);

    Object.assign(mockUser, {
      id: String(dbUser._id),
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      targetGoal: dbUser.targetGoal,
      stage: dbUser.stage,
      xpPoints: dbUser.xpPoints,
      aiimsCredits: dbUser.aiimsCredits
    });

    const token = `aiims-jwt-${Buffer.from(dbUser.email).toString('base64')}-${Date.now()}`;
    const userState = formatUserState(dbUser);

    return res.json({
      token,
      user: userState.profile,
      state: userState
    });
  } catch (mongoErr) {
    console.warn(`MongoDB register fallback:`, mongoErr);
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
    Object.assign(mockUser, newUser);

    const token = `aiims-jwt-${Buffer.from(newUser.email).toString('base64')}-${Date.now()}`;
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

router.get('/learner/state', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    return res.json({
      success: true,
      state: formatUserState(req.user)
    });
  }

  // Fallback to mock session
  res.json({
    success: true,
    state: mockLearnerFullState
  });
});

router.put('/learner/state', async (req: AuthenticatedRequest, res: Response) => {
  const { state } = req.body;
  if (!state) {
    return res.status(400).json({ error: 'State payload is required' });
  }

  try {
    if (req.user) {
      if (state.profile) {
        if (state.profile.name) req.user.name = state.profile.name;
        if (state.profile.role) req.user.role = state.profile.role;
        if (state.profile.college) req.user.college = state.profile.college;
        if (state.profile.targetGoal) req.user.targetGoal = state.profile.targetGoal;
        if (state.profile.stage) req.user.stage = state.profile.stage;
        if (typeof state.profile.xpPoints === 'number') req.user.xpPoints = state.profile.xpPoints;
        if (typeof state.profile.aiimsCredits === 'number') req.user.aiimsCredits = state.profile.aiimsCredits;
      }
      if (state.assessment) req.user.assessment = state.assessment;
      if (state.analysis) req.user.analysis = state.analysis;
      if (state.clarity) req.user.clarity = state.clarity;
      if (state.focus) req.user.focus = state.focus;
      if (state.radar) req.user.radar = state.radar;
      if (state.investigation) req.user.investigation = state.investigation;
      if (state.credits?.transactions) req.user.transactions = state.credits.transactions;
      if (state.notifications) req.user.notifications = state.notifications;

      await req.user.save();
      return res.json({ success: true, state: formatUserState(req.user) });
    }

    // Fallback if DB unavailable
    if (state.profile) Object.assign(mockUser, state.profile);
    if (state.assessment) Object.assign(mockLearnerFullState.assessment, state.assessment);
    if (state.analysis) Object.assign(mockLearnerFullState.analysis, state.analysis);
    if (state.clarity) Object.assign(mockLearnerFullState.clarity, state.clarity);
    if (state.focus) Object.assign(mockLearnerFullState.focus, state.focus);
    if (state.aiWallet) Object.assign(mockLearnerFullState.aiWallet, state.aiWallet);
    return res.json({ success: true, state: mockLearnerFullState });
  } catch (err: any) {
    console.error('Error syncing learner state to MongoDB:', err);
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
  const { answers, scores } = req.body;
  
  // Extract raw prompts if provided
  const architecturePrompt = answers?.find?.((a: any) => String(a.questionId) === '11')?.answer || '';

  let evaluation = null;
  if (architecturePrompt) {
    evaluation = await claudeService.evaluateOpenEndedAnswer(
      'Designing Software Architecture Prompt',
      'Evaluates problem-framing, constraint specification, and AI-thinking behavior',
      architecturePrompt
    );
  }

  const creditReward = 50;
  const xpReward = 100;

  if (req.user) {
    const previousBalance = req.user.aiimsCredits;
    req.user.aiimsCredits += creditReward;
    req.user.xpPoints += xpReward;
    req.user.stage = 'Understanding';

    const calculatedScores = scores || {
      usageFrequency: 82,
      evaluationCapability: 88,
      workflowDesign: 65,
      strategicVision: 74,
      mentorshipReadiness: 70
    };

    req.user.assessment = {
      status: 'completed',
      answers: answers || {},
      currentQuestionIndex: 12,
      completedAt: new Date().toISOString(),
      rewardClaimed: true,
      scores: calculatedScores
    };

    req.user.analysis = {
      status: 'unlocked',
      topCapability: 'Prompt Engineering & Critical Evaluation',
      growthArea: 'Agentic Workflows & Multi-Modal Architecture',
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
      evaluation,
      updatedBalance: req.user.aiimsCredits,
      updatedScores: req.user.assessment.scores,
      user: formatUserState(req.user).profile
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
    evaluation,
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
  // Generate recommendations dynamically without hardcoding universal rankings
  const currentToolIds = new Set(mockUserTools.map(t => t.toolId));
  const recs = [];

  // Recommendation 1: ALTERNATIVE_TOOL (If ChatGPT present & long-form reasoning task -> Claude)
  if (currentToolIds.has('tool-chatgpt') && !currentToolIds.has('tool-claude')) {
    recs.push({
      id: 'rec-claude-alt',
      toolId: 'tool-claude',
      type: 'ALTERNATIVE_TOOL',
      reason: "You're frequently working with long-form documents and reasoning tasks. You currently use ChatGPT for similar workflows, so exploring another workflow optimized for extended context (200k tokens) and system instructions may be useful.",
      relatedTask: 'long-form document reasoning',
      relatedSkill: 'Prompt Engineering & System Prompts',
      relevance: 'Complements your current reasoning toolkit',
      status: 'active',
      createdAt: 'Just now'
    });
  }

  // Recommendation 2: SKILL_GAP (Agentic Coding gap -> Cursor IDE)
  if (!currentToolIds.has('tool-cursor')) {
    recs.push({
      id: 'rec-cursor-gap',
      toolId: 'tool-cursor',
      type: 'SKILL_GAP',
      reason: 'Based on your profile growth area in Agentic Workflows, exploring an AI-first IDE with multi-file composer agents can help bridge your workflow design targets.',
      relatedTask: 'agentic coding & multi-file editing',
      relatedSkill: 'Agentic Workflows',
      relevance: 'Directly addresses your primary growth area',
      status: 'active',
      createdAt: 'Just now'
    });
  }

  // Recommendation 3: TASK_BASED (Research / RAG -> NotebookLM)
  if (!currentToolIds.has('tool-notebooklm')) {
    recs.push({
      id: 'rec-notebooklm-task',
      toolId: 'tool-notebooklm',
      type: 'TASK_BASED',
      reason: 'If you work with dense academic papers or internal PDFs, exploring a grounded source-based AI assistant can improve citation accuracy without hallucination.',
      relatedTask: 'grounded document research',
      relatedSkill: 'RAG Triad & Context Evaluation',
      relevance: 'Useful for source-grounded research tasks',
      status: 'active',
      createdAt: 'Just now'
    });
  }

  // Recommendation 4: RADAR_DISCOVERY (Computer Use / OS Control -> Perplexity AI or Gemini Pro)
  if (!currentToolIds.has('tool-perplexity')) {
    recs.push({
      id: 'rec-perplexity-radar',
      toolId: 'tool-perplexity',
      type: 'RADAR_DISCOVERY',
      reason: 'Recent AI Radar shifts show web citation models evolving rapidly. Exploring real-time web retrieval models can complement your general AI knowledge.',
      relatedTask: 'live web research & fact verification',
      relatedSkill: 'Generative AI Tech',
      relevance: 'Connected to AI Radar research signals',
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

