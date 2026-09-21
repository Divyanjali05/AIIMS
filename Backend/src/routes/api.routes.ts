import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { mockUser, mockDimensionScores, mockCapabilityGaps, mockFocusAreas, mockRadarSignals, mockTransactions, rewardedLevelIds } from '../models/aiims.models';
import { User } from '../models/User.model';
import { ClaudeService } from '../services/anthropic/claude.service';

const router = Router();
const claudeService = new ClaudeService();

// In-memory user cache with hashed initial password
const registeredUsers: Record<string, any> = {
  [mockUser.email.toLowerCase()]: {
    ...mockUser,
    password: bcrypt.hashSync('password123', 10)
  }
};

// 1. AUTH MODULE
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
    // 1. Try finding user in MongoDB Atlas
    let dbUser = await User.findOne({ email: normalizedEmail });

    if (!dbUser) {
      // Auto-register new learner in MongoDB with bcrypt hashed password
      const usernamePart = normalizedEmail.split('@')[0];
      const formattedName = usernamePart
        .split(/[._-]/)
        .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Learner';

      dbUser = await User.create({
        name: formattedName,
        email: normalizedEmail,
        password: password, // UserSchema pre-save hook will hash this using bcrypt
        role: 'Student / AI Learner',
        targetGoal: 'Master AI Intelligence & Mentoring',
        stage: 'Knowing',
        xpPoints: 100,
        aiimsCredits: 100
      });
      console.log(`🌿 Created new user in MongoDB Atlas with bcrypt hash: ${normalizedEmail}`);
    } else {
      console.log(`🌿 Found existing user in MongoDB Atlas: ${normalizedEmail}`);
      // Validate password against bcrypt hash (also auto-upgrades legacy unhashed passwords)
      const isMatch = await dbUser.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
      }
    }

    // Sync active mockUser session
    Object.assign(mockUser, {
      id: dbUser._id ? String(dbUser._id) : `usr-${Date.now().toString().slice(-4)}`,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      targetGoal: dbUser.targetGoal,
      stage: dbUser.stage,
      xpPoints: dbUser.xpPoints,
      aiimsCredits: dbUser.aiimsCredits
    });

    const token = `aiims-jwt-${Buffer.from(dbUser.email).toString('base64')}-${Date.now()}`;
    return res.json({
      token,
      user: {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
        targetGoal: mockUser.targetGoal,
        stage: mockUser.stage,
        xpPoints: mockUser.xpPoints,
        aiimsCredits: mockUser.aiimsCredits
      }
    });
  } catch (mongoErr) {
    console.warn(`MongoDB query fallback to memory:`, mongoErr);
    // In-memory fallback if Mongo connection is unreachable
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
        targetGoal: user.targetGoal,
        stage: user.stage,
        xpPoints: user.xpPoints,
        aiimsCredits: user.aiimsCredits
      }
    });
  }
});

router.post('/auth/register', async (req: Request, res: Response) => {
  const { name, email, password, role, targetGoal } = req.body;

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

    // UserSchema pre-save hook securely hashes password with bcrypt
    dbUser = await User.create({
      name: displayName,
      email: normalizedEmail,
      password,
      role: role || 'AI Practitioner',
      targetGoal: targetGoal || 'Explore AI Architectures & Intelligence',
      stage: 'Knowing',
      xpPoints: 100,
      aiimsCredits: 100
    });

    console.log(`🌿 Registered new user with bcrypt hashed password in MongoDB Atlas: ${normalizedEmail}`);

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
    return res.json({
      token,
      user: {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
        targetGoal: mockUser.targetGoal,
        stage: mockUser.stage,
        xpPoints: mockUser.xpPoints,
        aiimsCredits: mockUser.aiimsCredits
      }
    });
  } catch (mongoErr) {
    console.warn(`MongoDB register fallback:`, mongoErr);
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: `usr-${Date.now().toString().slice(-4)}`,
      name: displayName,
      email: normalizedEmail,
      role: role || 'AI Practitioner',
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
        targetGoal: newUser.targetGoal,
        stage: newUser.stage,
        xpPoints: newUser.xpPoints,
        aiimsCredits: newUser.aiimsCredits
      }
    });
  }
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
