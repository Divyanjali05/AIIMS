import { test, expect } from '@playwright/test';

// Isolated mock learner state for deterministic authenticated testing
const mockLearnerState = {
  profile: {
    id: 'test-user-id-e2e',
    name: 'E2E Test Learner',
    email: 'e2e-test@aiims.edu',
    role: 'STUDENT',
    targetGoal: 'Explore AI Architectures & Intelligence',
    stage: 'Knowing',
    xpPoints: 100,
    aiimsCredits: 500
  },
  assessment: {
    status: 'not_started',
    answers: {},
    currentQuestionIndex: 0,
    completedAt: null,
    rewardClaimed: false,
    scores: {
      usageFrequency: 0,
      evaluationCapability: 0,
      workflowDesign: 0,
      strategicVision: 0,
      mentorshipReadiness: 0
    }
  },
  credits: {
    balance: 500,
    transactions: [],
    claimedActions: []
  },
  analysis: {
    status: 'locked',
    topCapability: 'AI Evaluation & Critical Assessment',
    growthArea: 'AI Workflow Design'
  },
  clarity: {
    status: 'locked',
    selectedAreas: [],
    selectedTopic: null,
    completedTopics: [],
    reflections: {},
    taskScores: {}
  },
  focus: {
    status: 'locked',
    selectedTrack: null,
    history: [],
    activatedAt: null
  },
  radar: {
    status: 'locked',
    investigatedSignalIds: [],
    savedSignalIds: [],
    dismissedSignalIds: [],
    lastViewedRadar: null,
    radarProgress: 0
  },
  investigation: {
    status: 'locked',
    selectedSignalId: null,
    userNotes: {},
    evidenceVault: [],
    completedSignals: []
  },
  relevance: {
    status: 'locked'
  },
  aiWallet: {
    userTools: [],
    dismissedRecommendations: [],
    audienceMode: 'student'
  }
};

test.describe('AIIMS E2E Smoke Tests', () => {

  // ==============================================================
  // 1. ROUTE GUARDS: Protected Routes Handle Unauthenticated Users
  // ==============================================================
  test('protected routes safely handle unauthenticated visitors', async ({ page }) => {
    // Attempt to access protected /credits route without authentication
    await page.goto('/credits');

    // App updates URL to /login and displays public authentication entry point
    await expect(page).toHaveURL(/\/login/);
    const signInButton = page.getByRole('button', { name: /sign in/i }).first();
    await expect(signInButton).toBeVisible();

    // Clicking Sign In reveals the login card
    await signInButton.click();
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();

    // Direct visit to /login also renders login card immediately
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
  });

  // ==============================================================
  // 2. AUTHENTICATION: Login Form Rendering & Validation
  // ==============================================================
  test('login form renders and validates required input fields', async ({ page }) => {
    await page.goto('/login');

    // Verify key UI elements
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByText(/sign in to continue your ai journey/i)).toBeVisible();

    const emailInput = page.getByPlaceholder('you@example.com');
    const passwordInput = page.getByPlaceholder('Enter your password');
    const submitBtn = page.getByRole('button', { name: /sign in/i });

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Verify theme toggle button is present and accessible
    const themeToggle = page.locator('#login-theme-toggle-btn');
    await expect(themeToggle).toBeVisible();

    // Test rejection on invalid credentials
    await emailInput.fill('invalid-test-account@aiims.edu');
    await passwordInput.fill('WrongPassword123!');
    await submitBtn.click();

    // Expect alert notification
    await expect(page.getByText(/incorrect|couldn't sign you in/i)).toBeVisible();

    // Verify link to Register page
    const registerLink = page.getByRole('button', { name: /register/i });
    await expect(registerLink).toBeVisible();
    await registerLink.click();
    await expect(page).toHaveURL(/\/register/);
  });

  // ==============================================================
  // 3. REGISTRATION: Multi-Step Registration Form & Validation
  // ==============================================================
  test('registration form renders multi-step flow and validates input', async ({ page }) => {
    await page.goto('/register');

    // Verify step indicators
    await expect(page.getByText(/account/i).first()).toBeVisible();
    await expect(page.getByText(/academics/i).first()).toBeVisible();
    await expect(page.getByText(/ai profile/i).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /create your aiims account/i })).toBeVisible();

    // Form inputs on Step 1
    const nameInput = page.getByPlaceholder('Jane Doe');
    const emailInput = page.getByPlaceholder('you@example.com');
    const passwordInput = page.getByPlaceholder('Min 8 chars, 1 uppercase, 1 number');
    const confirmPasswordInput = page.getByPlaceholder('Re-enter password');
    const continueBtn = page.getByRole('button', { name: /continue/i });

    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();
    await expect(continueBtn).toBeVisible();

    // Validation: Empty name
    await continueBtn.click();
    await expect(page.getByText(/please enter your full name/i)).toBeVisible();

    // Validation: Short / invalid name
    await nameInput.fill('A');
    await continueBtn.click();
    await expect(page.getByText(/please enter your full name/i)).toBeVisible();

    // Validation: Invalid email (missing dot or domain)
    await nameInput.fill('Alex Candidate');
    await emailInput.fill('alex@candidate');
    await continueBtn.click();
    await expect(page.getByText(/enter a valid email address/i)).toBeVisible();

    // Validation: Short password (< 8 chars)
    await emailInput.fill('alex.candidate@aiims.edu');
    await passwordInput.fill('Pass1');
    await continueBtn.click();
    await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible();

    // Validation: Missing uppercase
    await passwordInput.fill('password123');
    await continueBtn.click();
    await expect(page.getByText(/password must include at least one uppercase letter/i)).toBeVisible();

    // Validation: Password mismatch
    await passwordInput.fill('Password123!');
    await confirmPasswordInput.fill('DifferentPassword123!');
    await continueBtn.click();
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();

    // Verify link back to login
    const signInBtn = page.getByRole('button', { name: /sign in/i });
    await expect(signInBtn).toBeVisible();
    await signInBtn.click();
    await expect(page).toHaveURL(/\/login/);
  });

  // ==============================================================
  // 4. ASSESSMENT JOURNEY: Assessment Screen Loads & Interacts
  // ==============================================================
  test('assessment page loads and core question interactions work', async ({ page }) => {
    // Intercept backend state queries to keep test isolated and deterministic
    await page.route('**/api/learner/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, state: mockLearnerState })
      });
    });

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: mockLearnerState.profile,
          state: mockLearnerState
        })
      });
    });

    await page.route('**/api/users/profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, profile: mockLearnerState.profile })
      });
    });

    // Inject authenticated state into localStorage before scripts execute (no token in localStorage)
    await page.addInitScript((state) => {
      window.localStorage.setItem('aiims_learner_state_v3', JSON.stringify(state));
      window.localStorage.setItem('aiims_active_tab', 'assessment');
    }, mockLearnerState);

    await page.goto('/assessment');

    // Verify Welcome view loaded
    await expect(page.getByText(/5-STATION AI DISCOVERY JOURNEY/i)).toBeVisible();
    await expect(page.getByText(/discover your authentic/i)).toBeVisible();

    // Click Begin Assessment Expedition
    const beginBtn = page.getByRole('button', { name: /begin assessment expedition/i });
    await expect(beginBtn).toBeVisible();
    await beginBtn.click();

    // Verify transition to Question stage
    await expect(page.getByText(/Station 01:/i).first()).toBeVisible();
    await expect(page.getByText(/Challenge 1 of 25/i)).toBeVisible();

    // Verify question interaction: radiogroup options render and are selectable
    const firstRadio = page.getByRole('radio').first();
    await expect(firstRadio).toBeVisible();
    await firstRadio.click();
    await expect(firstRadio).toHaveAttribute('aria-checked', 'true');
  });

  // ==============================================================
  // 5. CREDITS & WALLET: Renders Safely with Empty/Default Data
  // ==============================================================
  test('credits and wallet screens render safely with initial data', async ({ page }) => {
    // Intercept backend API calls
    await page.route('**/api/learner/state', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, state: mockLearnerState })
      });
    });

    await page.route('**/api/users/profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, profile: mockLearnerState.profile })
      });
    });

    await page.route('**/api/credits/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          balance: 100,
          totalEarned: 100,
          totalSpent: 0,
          totalRefunded: 0,
          transactions: []
        })
      });
    });

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: mockLearnerState.profile,
          state: mockLearnerState
        })
      });
    });

    await page.route('**/api/wallet/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, tools: [] })
      });
    });

    // Inject authenticated state (no token in localStorage)
    await page.addInitScript((state) => {
      window.localStorage.setItem('aiims_learner_state_v3', JSON.stringify(state));
      window.localStorage.setItem('aiims_active_tab', 'credits');
    }, mockLearnerState);

    // 1. Credits Screen
    await page.goto('/credits');

    // Verify Header and Balance card
    await expect(page.getByText(/YOUR AIIMS CREDITS & LEDGER/i)).toBeVisible();
    await expect(page.getByText(/AUTHORITATIVE SERVER-VERIFIED BALANCE/i)).toBeVisible();

    // Verify filter tabs are rendered
    const allFilter = page.getByRole('button', { name: /all/i }).first();
    await expect(allFilter).toBeVisible();

    // 2. AI Wallet Screen
    await page.goto('/wallet');
    await expect(page.getByRole('heading', { name: /AI Wallet & Tool Intelligence/i })).toBeVisible();
    await expect(page.getByText(/What are you trying to accomplish\?/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Requirement Search & Discover/i })).toBeVisible();
  });

});
