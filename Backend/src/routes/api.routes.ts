import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { config } from '../config/env';
import { mockUser, mockDimensionScores, mockCapabilityGaps, mockFocusAreas, mockRadarSignals, mockTransactions, rewardedLevelIds, mockToolCatalog, mockUserTools, mockLearnerFullState } from '../models/aiims.models';
import { User, IUser } from '../models/User.model';
import { Institute } from '../models/Institute.model';
import { StudentProfile } from '../models/StudentProfile.model';
import { Cohort } from '../models/Cohort.model';
import { ClaudeService } from '../services/anthropic/claude.service';
import { evaluateAssessment } from '../services/assessmentScoring';
import { ToolDiscoveryRunModel } from '../models/ToolDiscoveryRun.model';
import { ToolEvidenceModel } from '../models/toolEvidence.model';
import { ToolVersionHistoryModel } from '../models/toolVersionHistory.model';
import { ToolCatalogService } from '../services/wallet/toolCatalog.service';
import { SearchIntentService } from '../services/wallet/searchIntent.service';
import { ToolMatchingService } from '../services/wallet/toolMatching.service';
import { ToolComparisonService } from '../services/wallet/toolComparison.service';
import { ToolDiscoveryService } from '../services/wallet/toolDiscovery.service';
import { DomainTaxonomyService } from '../services/wallet/domainTaxonomy.service';
import { ToolEvidenceService } from '../services/wallet/toolEvidence.service';
import { ToolChangeDetectionService } from '../services/wallet/toolChangeDetection.service';
import { ToolIntelligenceService } from '../services/wallet/toolIntelligence.service';
import { authenticateStudent, requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  validateAcademicCombination,
  getProgramInfo,
  isValidAiFamiliarity,
  isValidPrimaryGoal,
  STREAMS,
  TECH_SUB_CATEGORIES,
  NON_TECH_SUB_CATEGORIES,
  EDUCATION_LEVELS,
  PROGRAMS,
  SPECIALIZATIONS,
  AI_FAMILIARITY_OPTIONS,
  AI_USAGE_CONTEXTS,
  PRIMARY_GOAL_OPTIONS
} from '../config/academicTaxonomy';

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
    notifications: dbUser.notifications || [],
    // AI Wallet — persisted user tool kit from MongoDB
    aiWallet: dbUser.aiWallet || {
      userTools: [],
      dismissedRecommendations: []
    }
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
  const {
    name,
    email,
    password,
    confirmPassword,
    // Academic fields
    instituteId,
    instituteName,
    stream,
    streamSubCategory,
    educationLevel,
    programId,
    programName,
    specializationId,
    specializationName,
    yearOfStudy,
    admissionYear,
    expectedGraduationYear,
    // AI context (personalization only — NOT capability scores)
    aiFamiliarity,
    aiUsageContexts,
    primaryGoal
  } = req.body;

  // ── Account validation ──
  if (!email || !email.trim() || !email.includes('@') || !email.includes('.')) {
    return res.status(400).json({ error: 'Enter a valid email address.', field: 'email' });
  }
  if (!name || !name.trim() || name.trim().length < 2) {
    return res.status(400).json({ error: 'Please enter your full name.', field: 'name' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.', field: 'password' });
  }
  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one uppercase letter.', field: 'password' });
  }
  if (!/[0-9]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one number.', field: 'password' });
  }
  if (confirmPassword && password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.', field: 'confirmPassword' });
  }

  // ── Academic validation ──
  if (!stream || !['TECH', 'NON_TECH'].includes(stream)) {
    return res.status(400).json({ error: 'Please select a valid stream.', field: 'stream' });
  }
  if (!educationLevel || !['SCHOOL', 'UNDERGRADUATE', 'POSTGRADUATE', 'RESEARCH', 'GRADUATE'].includes(educationLevel)) {
    return res.status(400).json({ error: 'Please select a valid education level.', field: 'educationLevel' });
  }
  if (!programId || !programName) {
    return res.status(400).json({ error: 'Please select your program / degree.', field: 'programId' });
  }
  if (!specializationId || !specializationName) {
    return res.status(400).json({ error: 'Please select your specialization.', field: 'specializationId' });
  }
  if (!yearOfStudy || isNaN(Number(yearOfStudy)) || Number(yearOfStudy) < 1) {
    return res.status(400).json({ error: 'Please provide a valid year of study.', field: 'yearOfStudy' });
  }
  if (!admissionYear || !expectedGraduationYear) {
    return res.status(400).json({ error: 'Please provide admission and graduation years.', field: 'admissionYear' });
  }

  // Backend validates the academic combination independently of frontend
  const taxonomyCheck = validateAcademicCombination(stream, educationLevel, programId, specializationId);
  if (!taxonomyCheck.valid) {
    return res.status(400).json({ error: taxonomyCheck.reason || 'Invalid academic combination.' });
  }

  // Optional AI context validation
  if (aiFamiliarity && !isValidAiFamiliarity(aiFamiliarity)) {
    return res.status(400).json({ error: 'Invalid AI familiarity value.', field: 'aiFamiliarity' });
  }
  if (primaryGoal && !isValidPrimaryGoal(primaryGoal)) {
    return res.status(400).json({ error: 'Invalid primary goal value.', field: 'primaryGoal' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const displayName = name.trim();
  const programInfo = getProgramInfo(programId);

  // ── Check MongoDB connection ──
  if (mongoose.connection.readyState !== 1) {
    // In-memory fallback (dev/offline mode)
    if (registeredUsers[normalizedEmail]) {
      return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: `usr-${Date.now().toString().slice(-6)}`,
      name: displayName,
      email: normalizedEmail,
      role: 'STUDENT',
      college: instituteName || 'Unknown Institute',
      targetGoal: 'Explore AI Architectures & Intelligence',
      stage: 'Knowing',
      xpPoints: 100,
      aiimsCredits: 100,
      password: hashedPassword,
      stream,
      programName,
      specializationName
    };
    registeredUsers[normalizedEmail] = newUser;
    const token = generateAuthToken(newUser.id, newUser.email);
    const baseState = formatUserState(new User(newUser) as IUser);
    return res.json({
      token,
      user: { ...newUser, id: newUser.id },
      state: {
        ...baseState,
        academicProfile: {
          stream, programName, specializationName, educationLevel, yearOfStudy: Number(yearOfStudy)
        }
      }
    });
  }

  try {
    // Check duplicate email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
    }

    // Create the core User (auth + learner state)
    const dbUser = await User.create({
      name: displayName,
      email: normalizedEmail,
      password, // bcrypt hashed via pre-save hook
      role: 'STUDENT',
      college: instituteName || 'Unknown Institute',
      targetGoal: 'Explore AI Architectures & Intelligence',
      stage: 'Knowing',
      xpPoints: 100,
      aiimsCredits: 100
    });

    // Resolve or create Cohort
    let cohortDoc: typeof Cohort.prototype | null = null;
    try {
      const admissionYearNum = Number(admissionYear);
      const graduationYearNum = Number(expectedGraduationYear);
      const cohortShortCode = `${programId.toUpperCase()}-${specializationId.toUpperCase()}-${admissionYearNum}-${graduationYearNum}`;
      const cohortDisplayName = `${programName} · ${specializationName} · ${admissionYearNum}–${graduationYearNum}`;

      cohortDoc = await Cohort.findOneAndUpdate(
        {
          instituteId: instituteId ? new mongoose.Types.ObjectId(String(instituteId)) : undefined,
          stream,
          educationLevel,
          programId,
          specializationId,
          admissionYear: admissionYearNum,
          graduationYear: graduationYearNum
        },
        {
          $setOnInsert: {
            instituteName: instituteName || 'Unknown',
            programName,
            specializationName,
            displayName: cohortDisplayName,
            shortCode: cohortShortCode,
            assessmentVersion: 'v1.0'
          },
          $inc: { studentCount: 1 }
        },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (cohortErr) {
      // Non-fatal — cohort can be resolved later
      console.warn('Cohort upsert warning:', cohortErr);
    }

    // Create StudentProfile (separate from User auth)
    const profileData: any = {
      userId: dbUser._id,
      fullName: displayName,
      stream,
      streamSubCategory: streamSubCategory || (stream === 'TECH' ? 'CS_IT' : 'COMMERCE_FINANCE'),
      educationLevel,
      programId,
      programName: programName || programInfo?.label || programId,
      specializationId,
      specializationName,
      yearOfStudy: Number(yearOfStudy),
      admissionYear: Number(admissionYear),
      expectedGraduationYear: Number(expectedGraduationYear),
      isComplete: true
    };
    if (instituteId) profileData.instituteId = new mongoose.Types.ObjectId(String(instituteId));
    if (instituteName) profileData.instituteName = instituteName;
    if (cohortDoc) profileData.cohortId = cohortDoc._id;
    if (aiFamiliarity) profileData.aiFamiliarity = aiFamiliarity;
    if (aiUsageContexts && Array.isArray(aiUsageContexts)) profileData.aiUsageContexts = aiUsageContexts;
    if (primaryGoal) profileData.primaryGoal = primaryGoal;

    const studentProfile = await StudentProfile.create(profileData);

    const token = generateAuthToken(String(dbUser._id), dbUser.email);
    const userState = formatUserState(dbUser);

    return res.status(201).json({
      token,
      user: userState.profile,
      state: {
        ...userState,
        academicProfile: {
          id: String(studentProfile._id),
          stream: studentProfile.stream,
          streamSubCategory: studentProfile.streamSubCategory,
          educationLevel: studentProfile.educationLevel,
          programId: studentProfile.programId,
          programName: studentProfile.programName,
          specializationId: studentProfile.specializationId,
          specializationName: studentProfile.specializationName,
          yearOfStudy: studentProfile.yearOfStudy,
          admissionYear: studentProfile.admissionYear,
          expectedGraduationYear: studentProfile.expectedGraduationYear,
          instituteName: studentProfile.instituteName,
          cohortId: cohortDoc ? String(cohortDoc._id) : undefined,
          cohortDisplayName: cohortDoc ? cohortDoc.displayName : undefined,
          aiFamiliarity: studentProfile.aiFamiliarity,
          aiUsageContexts: studentProfile.aiUsageContexts,
          primaryGoal: studentProfile.primaryGoal
        }
      }
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
    }
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
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
    // Persist aiWallet to MongoDB alongside the rest of the learner state
    if (state.aiWallet) user.aiWallet = state.aiWallet;

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
// 8. DYNAMIC AI WALLET & TOOL INTELLIGENCE MODULE
// ==========================================

/**
 * POST /api/wallet/search — Natural Language Requirement Intent Search
 */
router.post('/wallet/search', (req: Request, res: Response) => {
  const { query, userTools } = req.body;
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Search requirement query is required.' });
  }

  const userToolIds = Array.isArray(userTools) ? userTools.map((t: any) => t.toolId || t) : [];
  const searchResult = ToolMatchingService.searchTools(query, userToolIds);
  return res.json(searchResult);
});

/**
 * GET /api/wallet/catalog — Verified AI Tool Catalog with Domain & Status Filtering
 */
router.get('/wallet/catalog', (req: Request, res: Response) => {
  const { category, domain, status, pricing, search } = req.query;
  let tools = ToolCatalogService.getCatalog();

  if (category && category !== 'All') {
    tools = tools.filter(t => t.category === category || t.categories.includes(category as any));
  }
  if (domain && domain !== 'All') {
    tools = tools.filter(t => t.domains.some(d => d.toLowerCase() === (domain as string).toLowerCase()));
  }
  if (status && status !== 'All') {
    tools = tools.filter(t => t.status === status);
  }
  if (pricing && pricing !== 'All') {
    if (pricing === 'Free') tools = tools.filter(t => t.pricingDetails.type === 'FREE' || t.pricingDetails.freeTierAvailable);
    else if (pricing === 'Trial') tools = tools.filter(t => t.pricingDetails.freeTrialAvailable);
    else if (pricing === 'Paid') tools = tools.filter(t => t.pricingDetails.type === 'PAID');
  }
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    tools = tools.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.provider.toLowerCase().includes(q));
  }

  return res.json(tools.filter(t => t.activeStatus));
});

/**
 * GET /api/wallet/tools/:id — Full In-App Tool Detail
 */
router.get('/wallet/tools/:id', (req: Request, res: Response) => {
  const tool = ToolCatalogService.getToolById(req.params.id);
  if (!tool) {
    return res.status(404).json({ error: 'AI Tool not found in catalog.' });
  }
  return res.json(tool);
});

/**
 * GET /api/wallet/taxonomy — Vast Multi-Domain AI Taxonomy
 */
router.get('/wallet/taxonomy', (req: Request, res: Response) => {
  return res.json(DomainTaxonomyService.getTaxonomy());
});

/**
 * POST /api/wallet/compare — Requirement-First Tool Comparison Engine
 */
router.post('/wallet/compare', (req: Request, res: Response) => {
  const { toolIds, toolAId, toolBId, userRequirement, task } = req.body;
  const ids: string[] = Array.isArray(toolIds) && toolIds.length > 0
    ? toolIds
    : [toolAId, toolBId].filter(Boolean);

  if (ids.length === 0) {
    return res.status(400).json({ error: 'At least 2 tool IDs are required for comparison.' });
  }

  try {
    const comparison = ToolComparisonService.compareToolsForRequirement(ids, userRequirement || task);
    return res.json(comparison);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/wallet/gaps — Toolkit Gap Analysis
 */
router.get('/wallet/gaps', (req: AuthenticatedRequest, res: Response) => {
  const userTools = req.user?.assessment ? mockUserTools : mockUserTools;
  const catalog = ToolCatalogService.getCatalog();
  
  const coveredDomains = new Set<string>();
  for (const item of userTools) {
    const tool = catalog.find(c => c.id === item.toolId);
    if (tool) {
      tool.domains.forEach(d => coveredDomains.add(d));
    }
  }

  const allTaxonomy = DomainTaxonomyService.getTaxonomy();
  const gaps = allTaxonomy
    .filter(t => !coveredDomains.has(t.domain))
    .map(t => ({
      domain: t.domain,
      subdomains: t.subdomains,
      category: t.categoryMapping,
      recommendedQuery: `Show me ${t.domain} AI tools`
    }));

  return res.json({
    coveredCount: coveredDomains.size,
    totalDomains: allTaxonomy.length,
    coveredDomains: Array.from(coveredDomains),
    gaps
  });
});

/**
 * POST /api/wallet/discover/trigger — Trigger Background Tool Discovery Refresh
 */
router.post('/wallet/discover/trigger', async (req: Request, res: Response) => {
  const jobReport = await ToolDiscoveryService.runDiscoveryJob();
  return res.json({
    message: 'Automated AI Tool Discovery job completed successfully.',
    report: jobReport,
    newAndUpdatedTools: ToolCatalogService.getNewAndRecentlyUpdatedTools()
  });
});

/**
 * GET /api/wallet/tools/new — Surface Verified New AI Tools
 */
router.get('/wallet/tools/new', (req: Request, res: Response) => {
  const tools = ToolCatalogService.getCatalog().filter(t => t.status === 'NEW');
  return res.json(tools);
});

/**
 * GET /api/wallet/tools/recently-updated — Surface Verified Recently Updated AI Tools
 */
router.get('/wallet/tools/recently-updated', (req: Request, res: Response) => {
  const tools = ToolCatalogService.getCatalog().filter(t => t.status === 'RECENTLY_UPDATED' || t.status === 'UPDATED');
  return res.json(tools);
});

/**
 * GET /api/wallet/tools/:id/evidence — Get Supporting Evidence for an AI Tool
 */
router.get('/wallet/tools/:id/evidence', async (req: Request, res: Response) => {
  const evidence = await ToolEvidenceService.getEvidenceForTool(req.params.id);
  return res.json(evidence);
});

/**
 * GET /api/wallet/tools/:id/history — Get Version & Change History for an AI Tool
 */
router.get('/wallet/tools/:id/history', async (req: Request, res: Response) => {
  const history = await ToolChangeDetectionService.getVersionHistory(req.params.id);
  return res.json(history);
});

/**
 * GET /api/wallet/intelligence/status — Get Live AI Ecosystem Intelligence Pipeline Status
 */
router.get('/wallet/intelligence/status', (req: Request, res: Response) => {
  return res.json(ToolIntelligenceService.getIntelligenceStatus());
});

/**
 * GET /api/wallet/discovery/status — Discovery Job & Verified Timestamp Logs
 */
router.get('/wallet/discovery/status', (req: Request, res: Response) => {
  const status = ToolDiscoveryService.getStatus();
  const newAndUpdated = ToolCatalogService.getNewAndRecentlyUpdatedTools();
  return res.json({
    status,
    newAndUpdatedCount: newAndUpdated.length,
    newAndUpdatedTools: newAndUpdated
  });
});

/**
 * GET /api/wallet/user
 * Returns the authenticated user's personal tool kit.
 * Falls back to mockUserTools in offline/unauthenticated mode.
 */
router.get('/wallet/user', (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.aiWallet) {
    return res.json(req.user.aiWallet.userTools || []);
  }
  return res.json(mockUserTools);
});

/**
 * GET /api/wallet/recommendations
 * Generates recommendations from the catalog against the learner profile.
 */
router.get('/wallet/recommendations', (req: AuthenticatedRequest, res: Response) => {
  const userTools = (req.user as any)?.aiWallet?.userTools || mockLearnerFullState.aiWallet?.userTools || mockUserTools;
  const userToolMap = new Map<string, string>();
  userTools.forEach((t: any) => userToolMap.set(t.toolId, t.familiarity));

  const catalog = ToolCatalogService.getCatalog();
  const recs = [];

  const walletCategories = new Set(userTools.map((t: any) => t.primaryCategory));
  const activeFocus =
    req.user?.focus?.selectedTrack ||
    mockLearnerFullState.focus?.selectedTrack ||
    mockLearnerFullState.analysis?.growthArea ||
    'AI Workflow Design';
  const growthArea = mockLearnerFullState.analysis?.growthArea || 'AI Workflow Design';
  const clarityTopic =
    req.user?.clarity?.selectedTopic ||
    mockLearnerFullState.clarity?.selectedTopic || '';
  const investigatedRadarIds =
    req.user?.radar?.investigatedSignalIds ||
    mockLearnerFullState.radar?.investigatedSignalIds || [];

  const containsMatch = (targetText: string, searchKey: string): boolean => {
    if (!targetText || !searchKey) return false;
    return (
      targetText.toLowerCase().includes(searchKey.toLowerCase()) ||
      searchKey.toLowerCase().includes(targetText.toLowerCase())
    );
  };

  for (const tool of catalog) {
    if (!tool.activeStatus) continue;

    const familiarity = userToolMap.get(tool.id);
    const matchedSignals: { type: string; snippet: string; priority: number }[] = [];

    const toolFocusTracks = tool.focusTracks || [tool.category];
    const toolClarityTopics = tool.clarityTopics || tool.taskMappings || [];
    const toolRadarTopics = tool.radarTopics || [tool.category];
    const toolCategories = tool.categories || [tool.category];
    const toolRelatedTools = tool.relatedTools || [];

    // 1. FOCUS_BASED
    if (
      toolFocusTracks.some(ft => containsMatch(ft, activeFocus)) ||
      toolCategories.some(cat => containsMatch(cat, activeFocus))
    ) {
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
        const matchingTopic = toolRadarTopics.find(rt =>
          investigatedRadarIds.some((sigId: string) => containsMatch(rt, sigId))
        );
        if (matchingTopic) matchedRadarTopic = matchingTopic;
      }
    }
    if (matchedRadarTopic) {
      const displayTopic = matchedRadarTopic.toLowerCase().includes('sig-')
        ? tool.category
        : matchedRadarTopic;
      matchedSignals.push({
        type: 'RADAR_DISCOVERY',
        snippet: `supports ${displayTopic} capabilities you explored on AI Radar`,
        priority: 1
      });
    }

    // 3. TASK_BASED
    if (
      clarityTopic &&
      (
        toolClarityTopics.some(ct => containsMatch(ct, clarityTopic)) ||
        toolCategories.some(cat => containsMatch(cat, clarityTopic))
      )
    ) {
      matchedSignals.push({
        type: 'TASK_BASED',
        snippet: `directly supports your Clarity goal ("${clarityTopic}")`,
        priority: 3
      });
    }

    // 4. SKILL_GAP
    if (
      growthArea &&
      (
        toolCategories.some(cat => containsMatch(cat, growthArea)) ||
        toolFocusTracks.some(ft => containsMatch(ft, growthArea))
      )
    ) {
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
      const userToolObj = catalog.find(c => c.id === ut.toolId);
      return (
        userToolObj &&
        (userToolObj.alternatives?.includes(tool.id) || tool.alternatives?.includes(ut.toolId))
      );
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
      const hasRadarOrAlt = matchedSignals.some(
        s => s.type === 'RADAR_DISCOVERY' || s.type === 'ALTERNATIVE_TOOL'
      );
      if (!hasRadarOrAlt) continue;
    } else if (familiarity === 'proficient') {
      const hasAdvancedSignal = matchedSignals.some(
        s => s.type === 'RADAR_DISCOVERY' || s.type === 'ALTERNATIVE_TOOL' || s.type === 'FOCUS_BASED'
      );
      if (!hasAdvancedSignal) continue;
    }

    matchedSignals.sort((a, b) => a.priority - b.priority);
    const primarySignal = matchedSignals[0];
    const allSignalTypes = Array.from(new Set(matchedSignals.map(s => s.type)));

    const snippets = matchedSignals.slice(0, 3).map(s => s.snippet);
    let synthesizedReason = '';
    if (snippets.length === 1) {
      synthesizedReason = `You're seeing this because ${tool.name} ${snippets[0]}.`;
    } else if (snippets.length === 2) {
      synthesizedReason = `You're seeing this because ${tool.name} ${snippets[0]}, and ${snippets[1]}.`;
    } else {
      synthesizedReason = `You're seeing this because ${tool.name} ${snippets[0]}, ${snippets[1]}, and ${snippets[2]}.`;
    }

    let actionLabel = 'Add to Wallet & Explore';
    if (familiarity === 'exploring')  actionLabel = 'Explore & Practice Tool';
    else if (familiarity === 'practicing') actionLabel = 'Practice a Real Task';
    else if (familiarity === 'proficient') actionLabel = 'Try an Advanced Workflow';
    else if (familiarity === 'mastered')   actionLabel = 'View Advanced Opportunities';

    recs.push({
      id: `rec-${tool.id}`,
      toolId: tool.id,
      type: primarySignal.type as any,
      matchedSignals: allSignalTypes as any,
      reason: synthesizedReason,
      relatedTask: tool.useCases[0] || tool.category,
      relatedSkill: tool.category,
      relevance: `Aligned with your ${activeFocus} workflow`,
      actionLabel,
      status: 'active',
      createdAt: 'Just now'
    });
  }

  return res.json(recs);
});

/**
 * POST /api/wallet/add
 * Adds a tool to the authenticated user's AI Wallet in MongoDB.
 * Falls back to mutating mockUserTools in offline mode.
 */
router.post('/wallet/add', async (req: AuthenticatedRequest, res: Response) => {
  const { toolId, familiarity, primaryCategory, userNotes } = req.body;

  // Authenticated + DB path
  if (req.user) {
    try {
      const wallet = req.user.aiWallet || { userTools: [], dismissedRecommendations: [] };
      const existing = wallet.userTools.find((t: any) => t.toolId === toolId);

      if (existing) {
        if (familiarity) existing.familiarity = familiarity;
        if (userNotes !== undefined) existing.userNotes = userNotes;
        req.user.aiWallet = wallet;
        await req.user.save();
        return res.json({ success: true, item: existing, action: 'updated' });
      }

      // Resolve category from live catalog if not supplied
      let resolvedCategory = primaryCategory;
      if (!resolvedCategory) {
        const catalogItem = ToolCatalogService.getToolById(toolId);
        resolvedCategory = catalogItem?.category || 'Reasoning & Writing';
      }

      const newItem = {
        toolId,
        addedAt: new Date().toISOString().split('T')[0],
        familiarity: familiarity || 'exploring',
        userNotes: userNotes || '',
        primaryCategory: resolvedCategory,
        customTags: ['my-toolkit']
      };

      wallet.userTools.unshift(newItem as any);
      req.user.aiWallet = wallet;
      await req.user.save();
      return res.json({ success: true, item: newItem, action: 'added' });
    } catch (err: any) {
      console.error('[/wallet/add] DB error, falling back to mock:', err.message);
    }
  }

  // Offline / unauthenticated fallback — mutate in-memory mock only
  const existing = mockUserTools.find(t => t.toolId === toolId);
  if (existing) {
    existing.familiarity = (familiarity || existing.familiarity) as any;
    if (userNotes) existing.userNotes = userNotes;
    return res.json({ success: true, item: existing, action: 'updated' });
  }

  const catalogItem = ToolCatalogService.getToolById(toolId) || mockToolCatalog.find(t => t.id === toolId);
  const newItem = {
    toolId,
    addedAt: new Date().toISOString().split('T')[0],
    familiarity: familiarity || 'exploring',
    userNotes: userNotes || '',
    primaryCategory: primaryCategory || catalogItem?.category || 'Reasoning & Writing',
    customTags: ['my-toolkit']
  };
  mockUserTools.unshift(newItem as any);
  return res.json({ success: true, item: newItem, action: 'added' });
});

/**
 * POST /api/wallet/update-familiarity
 * Updates the familiarity level for a tool in the authenticated user's wallet.
 */
router.post('/wallet/update-familiarity', async (req: AuthenticatedRequest, res: Response) => {
  const { toolId, familiarity, userNotes } = req.body;

  if (req.user) {
    try {
      const wallet = req.user.aiWallet || { userTools: [], dismissedRecommendations: [] };
      const item = wallet.userTools.find((t: any) => t.toolId === toolId);
      if (!item) {
        return res.status(404).json({ error: 'Tool not found in user wallet' });
      }
      if (familiarity) item.familiarity = familiarity;
      if (userNotes !== undefined) item.userNotes = userNotes;
      req.user.aiWallet = wallet;
      await req.user.save();
      return res.json({ success: true, item });
    } catch (err: any) {
      console.error('[/wallet/update-familiarity] DB error:', err.message);
    }
  }

  // Offline fallback
  const item = mockUserTools.find(t => t.toolId === toolId);
  if (!item) {
    return res.status(404).json({ error: 'Tool not found in user wallet' });
  }
  if (familiarity) item.familiarity = familiarity as any;
  if (userNotes !== undefined) item.userNotes = userNotes;
  return res.json({ success: true, item });
});


// ==========================================
// ACADEMIC MODULE — Institute, Taxonomy, Student Profile
// ==========================================

/**
 * GET /api/academic/taxonomy
 * Returns all programs, specializations, education levels, AI context options.
 * Public endpoint (no auth required) — used by registration screen dropdowns.
 */
router.get('/academic/taxonomy', (_req: Request, res: Response) => {
  res.json({
    streams: STREAMS,
    techSubCategories: TECH_SUB_CATEGORIES,
    nonTechSubCategories: NON_TECH_SUB_CATEGORIES,
    educationLevels: EDUCATION_LEVELS,
    programs: PROGRAMS,
    specializations: SPECIALIZATIONS,
    aiFamiliarityOptions: AI_FAMILIARITY_OPTIONS,
    aiUsageContexts: AI_USAGE_CONTEXTS,
    primaryGoalOptions: PRIMARY_GOAL_OPTIONS
  });
});

/**
 * GET /api/academic/institutes?q=:query&limit=20
 * Searchable institute list. Returns top matches for autocomplete.
 */
router.get('/academic/institutes', async (req: Request, res: Response) => {
  const query = String(req.query.q || '').trim();
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  if (mongoose.connection.readyState !== 1) {
    // Offline fallback — return a curated seed list
    const SEED_INSTITUTES = [
      { _id: 'inst-001', name: 'IIT Bombay', shortName: 'IITB', city: 'Mumbai', country: 'India', type: 'INSTITUTE' },
      { _id: 'inst-002', name: 'IIT Delhi', shortName: 'IITD', city: 'New Delhi', country: 'India', type: 'INSTITUTE' },
      { _id: 'inst-003', name: 'IIT Madras', shortName: 'IITM', city: 'Chennai', country: 'India', type: 'INSTITUTE' },
      { _id: 'inst-004', name: 'IIT Kharagpur', shortName: 'IITKgp', city: 'Kharagpur', country: 'India', type: 'INSTITUTE' },
      { _id: 'inst-005', name: 'NIT Trichy', shortName: 'NIT-T', city: 'Tiruchirappalli', country: 'India', type: 'INSTITUTE' },
      { _id: 'inst-006', name: 'BITS Pilani', shortName: 'BITS', city: 'Pilani', country: 'India', type: 'INSTITUTE' },
      { _id: 'inst-007', name: 'VIT Vellore', shortName: 'VIT', city: 'Vellore', country: 'India', type: 'UNIVERSITY' },
      { _id: 'inst-008', name: 'SRM Institute of Science and Technology', shortName: 'SRM', city: 'Chennai', country: 'India', type: 'UNIVERSITY' },
      { _id: 'inst-009', name: 'Anna University', shortName: 'AU', city: 'Chennai', country: 'India', type: 'UNIVERSITY' },
      { _id: 'inst-010', name: 'University of Mumbai', shortName: 'MU', city: 'Mumbai', country: 'India', type: 'UNIVERSITY' },
      { _id: 'inst-011', name: 'Delhi University', shortName: 'DU', city: 'New Delhi', country: 'India', type: 'UNIVERSITY' },
      { _id: 'inst-012', name: 'Amity University', shortName: 'Amity', city: 'Noida', country: 'India', type: 'UNIVERSITY' },
      { _id: 'inst-013', name: 'Manipal Academy of Higher Education', shortName: 'MAHE', city: 'Manipal', country: 'India', type: 'UNIVERSITY' },
      { _id: 'inst-014', name: 'PSG College of Technology', shortName: 'PSGCT', city: 'Coimbatore', country: 'India', type: 'COLLEGE' },
      { _id: 'inst-015', name: 'Coimbatore Institute of Technology', shortName: 'CIT', city: 'Coimbatore', country: 'India', type: 'COLLEGE' },
      { _id: 'inst-099', name: 'Other / Not Listed', shortName: 'OTHER', city: '', country: 'India', type: 'OTHER' }
    ];

    const filtered = query
      ? SEED_INSTITUTES.filter(i =>
          i.name.toLowerCase().includes(query.toLowerCase()) ||
          (i.shortName && i.shortName.toLowerCase().includes(query.toLowerCase())) ||
          (i.city && i.city.toLowerCase().includes(query.toLowerCase()))
        )
      : SEED_INSTITUTES;

    return res.json({ institutes: filtered.slice(0, limit) });
  }

  try {
    let institutes;
    if (query.length >= 2) {
      institutes = await Institute.find(
        { $text: { $search: query }, status: 'ACTIVE' },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } }).limit(limit).lean();

      // Fallback to regex if text index not working
      if (institutes.length === 0) {
        institutes = await Institute.find({
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { shortName: { $regex: query, $options: 'i' } },
            { city: { $regex: query, $options: 'i' } }
          ],
          status: 'ACTIVE'
        }).limit(limit).lean();
      }
    } else {
      institutes = await Institute.find({ status: 'ACTIVE' }).limit(limit).lean();
    }

    res.json({ institutes });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch institutes.', details: err.message });
  }
});

/**
 * POST /api/academic/institutes/request
 * Allows a student to request a new institute to be added.
 */
router.post('/academic/institutes/request', authenticateStudent, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { name, city, state, country, type } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Institute name is required.' });
  }

  if (mongoose.connection.readyState !== 1) {
    return res.json({ success: true, message: 'Institute request received. It will be reviewed and added soon.' });
  }

  try {
    const code = `REQ-${Date.now().toString(36).toUpperCase()}`;
    const inst = await Institute.create({
      name: name.trim(),
      code,
      city: city?.trim(),
      state: state?.trim(),
      country: country?.trim() || 'India',
      type: type || 'COLLEGE',
      status: 'PENDING',
      requestedBy: req.user ? String(req.user._id) : undefined
    });
    res.json({ success: true, institute: { _id: inst._id, name: inst.name, status: inst.status } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to submit request.', details: err.message });
  }
});

/**
 * GET /api/student/profile
 * Get authenticated student's academic profile.
 */
router.get('/student/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (mongoose.connection.readyState !== 1) {
    return res.json({ academicProfile: null });
  }

  try {
    const profile = await StudentProfile.findOne({ userId: req.user!._id }).lean();
    if (!profile) {
      return res.json({ academicProfile: null });
    }

    // Resolve cohort display name if cohortId exists
    let cohortDisplayName: string | undefined;
    if (profile.cohortId) {
      const cohort = await Cohort.findById(profile.cohortId).lean();
      cohortDisplayName = cohort?.displayName;
    }

    res.json({
      academicProfile: {
        id: String(profile._id),
        stream: profile.stream,
        streamSubCategory: profile.streamSubCategory,
        educationLevel: profile.educationLevel,
        programId: profile.programId,
        programName: profile.programName,
        specializationId: profile.specializationId,
        specializationName: profile.specializationName,
        yearOfStudy: profile.yearOfStudy,
        admissionYear: profile.admissionYear,
        expectedGraduationYear: profile.expectedGraduationYear,
        instituteName: profile.instituteName,
        cohortId: profile.cohortId ? String(profile.cohortId) : undefined,
        cohortDisplayName,
        aiFamiliarity: profile.aiFamiliarity,
        aiUsageContexts: profile.aiUsageContexts,
        primaryGoal: profile.primaryGoal,
        isComplete: profile.isComplete
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch academic profile.', details: err.message });
  }
});

/**
 * PUT /api/student/profile
 * Update authenticated student's academic profile (AI context fields only — academic identity is locked post-registration).
 */
router.put('/student/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const allowedUpdates = ['aiFamiliarity', 'aiUsageContexts', 'primaryGoal', 'displayName'];
  const updateData: Record<string, any> = {};

  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      updateData[key] = req.body[key];
    }
  }

  if (mongoose.connection.readyState !== 1) {
    return res.json({ success: true });
  }

  try {
    await StudentProfile.updateOne({ userId: req.user!._id }, { $set: updateData });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update profile.', details: err.message });
  }
});

// ==========================================
// ADMIN / DEBUG — Tool Discovery & Verification
// Phase 2A foundation endpoints.
// Protected: requires authentication.
// NOT part of the learner-facing API.
// ==========================================

/**
 * GET /api/tools/discovery/runs
 * Returns the N most recent discovery runs (default: 20).
 * Useful for monitoring the discovery pipeline.
 */
router.get('/tools/discovery/runs', requireAuth, async (req: Request, res: Response) => {
  if (mongoose.connection.readyState !== 1) {
    return res.json({ runs: [], message: 'DB not connected — no run history available.' });
  }
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const runs = await ToolDiscoveryRunModel.find()
      .sort({ startedAt: -1 })
      .limit(limit)
      .lean();
    return res.json({ runs, total: runs.length });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch discovery runs.', details: err.message });
  }
});

/**
 * GET /api/tools/evidence/:toolId
 * Returns all evidence documents collected for a specific tool.
 * Includes pending, accepted, and rejected evidence.
 */
router.get('/tools/evidence/:toolId', requireAuth, async (req: Request, res: Response) => {
  const { toolId } = req.params;
  if (!toolId) {
    return res.status(400).json({ error: 'toolId param is required.' });
  }
  if (mongoose.connection.readyState !== 1) {
    return res.json({ evidence: [], message: 'DB not connected.' });
  }
  try {
    const evidence = await ToolEvidenceModel.find({ toolId })
      .sort({ fetchedAt: -1 })
      .lean();
    return res.json({
      toolId,
      evidence,
      counts: {
        total:    evidence.length,
        pending:  evidence.filter((e: any) => e.verificationStatus === 'PENDING').length,
        accepted: evidence.filter((e: any) => e.verificationStatus === 'ACCEPTED').length,
        rejected: evidence.filter((e: any) => e.verificationStatus === 'REJECTED').length
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch tool evidence.', details: err.message });
  }
});

/**
 * GET /api/tools/history/:toolId
 * Returns the version history for a specific tool, newest-first.
 */
router.get('/tools/history/:toolId', requireAuth, async (req: Request, res: Response) => {
  const { toolId } = req.params;
  if (!toolId) {
    return res.status(400).json({ error: 'toolId param is required.' });
  }
  if (mongoose.connection.readyState !== 1) {
    return res.json({ history: [], message: 'DB not connected.' });
  }
  try {
    const history = await ToolVersionHistoryModel.find({ toolId })
      .sort({ detectedAt: -1 })
      .lean();
    return res.json({ toolId, history, count: history.length });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch tool history.', details: err.message });
  }
});

export default router;
