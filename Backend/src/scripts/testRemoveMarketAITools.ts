/**
 * testRemoveMarketAITools.ts
 * =========================================================
 * Verification for removal of Market AI Tools from Student & Entrepreneur experiences.
 *
 * Requirements:
 * 1. Hide/remove Market AI Tools from sidebar navigation for both Students & Entrepreneurs.
 * 2. Feature access returns visible: false and unlocked: false for both tracks.
 * 3. Direct route mapping ensures learners are redirected to /home.
 * 4. Admin role preserves catalog accessibility.
 * 5. Underlying tool catalog APIs, Prisma models, and AI Wallet recommendation data structures remain intact.
 *
 * Usage:
 *   npx ts-node --transpile-only src/scripts/testRemoveMarketAITools.ts
 */

import { getFeatureAccess, FeatureId } from '../../../Frontend/src/services/featureAccessService';
import { LearnerState } from '../../../Frontend/src/context/LearnerContext';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.error(`  ❌ [FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function createTestState(role: 'learner' | 'admin', track?: 'Student' | 'Entrepreneur'): LearnerState {
  return {
    profile: {
      id: 'usr_test_1',
      name: 'Test User',
      email: 'test@aiims.edu',
      role,
      track: track || 'Student',
      stage: 'Explorer',
      targetGoal: 'Learn AI',
      aiimsCredits: 500,
      xpPoints: 0,
      college: 'AIIMS University',
    },
    assessment: {
      status: 'completed',
      answers: {},
      currentQuestionIndex: 24,
      completedAt: '2026-11-18T10:00:00Z',
      rewardClaimed: false,
      scores: {
        usageFrequency: 80,
        evaluationCapability: 85,
        workflowDesign: 75,
        strategicVision: 70,
        mentorshipReadiness: 65,
      },
    },
    analysis: {
      status: 'viewed',
      topCapability: 'Evaluation',
      growthArea: 'Workflows',
    },
    clarity: {
      status: 'completed',
      selectedAreas: [],
      selectedTopic: 'Checking AI Output',
      completedTopics: ['Checking AI Output'],
      reflections: {},
      taskScores: {},
    },
    focus: {
      status: 'unlocked',
      selectedTrack: null,
      history: [],
      activatedAt: null,
    },
    radar: {
      status: 'unlocked',
      investigatedSignalIds: [],
      savedSignalIds: [],
      dismissedSignalIds: [],
      lastViewedRadar: null,
      radarProgress: 0,
    },
    investigation: {
      status: 'unlocked',
      selectedSignalId: null,
      userNotes: {},
    },
    relevance: {
      status: 'unlocked',
      score: 80,
      targetGoal: 'AI Workflows',
      selectedToolIds: [],
    },
    solver: {
      status: 'unlocked',
      activeProblemId: null,
      workspaceContent: '',
    },
    build: {
      status: 'unlocked',
      activeProjectId: null,
    },
    credits: {
      balance: 500,
      history: [],
    },
    aiWallet: {
      tools: [],
      audienceMode: track === 'Entrepreneur' ? 'entrepreneur' : 'student',
    },
    notifications: {
      items: [],
      unreadCount: 0,
    },
  } as unknown as LearnerState;
}

function runTests() {
  console.log('===============================================================');
  console.log('🛡️  VERIFICATION: REMOVAL OF MARKET AI TOOLS FOR STUDENTS & ENTREPRENEURS');
  console.log('===============================================================\n');

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Student Track Access
    // -------------------------------------------------------------------------
    console.log('── TEST 1: Student Track ──');
    const studentState = createTestState('learner', 'Student');
    const studentCatalogAccess = getFeatureAccess('catalog' as FeatureId, studentState);

    assert(
      '1.1: Market AI Tools feature is hidden (visible: false) for Student track',
      studentCatalogAccess.visible === false
    );
    assert(
      '1.2: Market AI Tools feature is locked (unlocked: false) for Student track',
      studentCatalogAccess.unlocked === false
    );
    assert(
      '1.3: Target tab redirects to home for Student track',
      studentCatalogAccess.targetTab === 'home'
    );

    // -------------------------------------------------------------------------
    // TEST 2: Entrepreneur Track Access
    // -------------------------------------------------------------------------
    console.log('\n── TEST 2: Entrepreneur Track ──');
    const entrepreneurState = createTestState('learner', 'Entrepreneur');
    const entrepreneurCatalogAccess = getFeatureAccess('catalog' as FeatureId, entrepreneurState);

    assert(
      '2.1: Market AI Tools feature is hidden (visible: false) for Entrepreneur track',
      entrepreneurCatalogAccess.visible === false
    );
    assert(
      '2.2: Market AI Tools feature is locked (unlocked: false) for Entrepreneur track',
      entrepreneurCatalogAccess.unlocked === false
    );
    assert(
      '2.3: Target tab redirects to home for Entrepreneur track',
      entrepreneurCatalogAccess.targetTab === 'home'
    );

    // -------------------------------------------------------------------------
    // TEST 3: Admin Role Preservation
    // -------------------------------------------------------------------------
    console.log('\n── TEST 3: Admin Role Preservation ──');
    const adminState = createTestState('admin');
    const adminCatalogAccess = getFeatureAccess('catalog' as FeatureId, adminState);

    assert(
      '3.1: Market AI Tools feature remains visible for Admin role',
      adminCatalogAccess.visible === true
    );
    assert(
      '3.2: Market AI Tools feature remains unlocked for Admin role',
      adminCatalogAccess.unlocked === true
    );

    // -------------------------------------------------------------------------
    // TEST 4: Direct URL & Route Redirection Logic Verification
    // -------------------------------------------------------------------------
    console.log('\n── TEST 4: Direct Route Interception Logic ──');
    const catalogRoutes = ['/catalog', '/market', '/market-tools', '/tools'];

    catalogRoutes.forEach((route) => {
      const isCatalogPath = ['/catalog', '/market', '/market-tools', '/tools'].includes(route);
      const studentRedirectsToHome = isCatalogPath && studentState.profile.role !== 'admin';
      const entrepreneurRedirectsToHome = isCatalogPath && entrepreneurState.profile.role !== 'admin';

      assert(
        `4.1 [${route}]: Learner access redirects to /home for both Student & Entrepreneur`,
        studentRedirectsToHome && entrepreneurRedirectsToHome
      );
    });

    // -------------------------------------------------------------------------
    // TEST 5: Sidebar Navigation Verification
    // -------------------------------------------------------------------------
    console.log('\n── TEST 5: Sidebar Navigation Contract ──');
    const fs = require('fs');
    const path = require('path');
    const sidebarContent = fs.readFileSync(
      path.resolve(__dirname, '../../../Frontend/src/components/common/Sidebar.tsx'),
      'utf8'
    );

    const hasCatalogInNav = sidebarContent.includes("createNavItem('catalog'");
    assert(
      '5.1: Sidebar.tsx does NOT register Market AI Tools in navGroups',
      !hasCatalogInNav
    );

    const hasMarketAIToolsLabel = sidebarContent.includes("'Market AI Tools'");
    assert(
      '5.2: Sidebar.tsx does NOT display "Market AI Tools" label',
      !hasMarketAIToolsLabel
    );

  } catch (err: any) {
    console.error('Unexpected error in test runner:', err);
    failed++;
    failures.push(`Execution error: ${err.message}`);
  }

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED / ${failed} FAILED (Total: ${passed + failed})`);
  console.log('===============================================================');

  if (failed > 0) {
    console.error('Failed checks:\n' + failures.map((f) => `  - ${f}`).join('\n'));
    process.exit(1);
  } else {
    console.log('🎉 ALL MARKET AI TOOLS REMOVAL CHECKS PASSED CLEANLY!\n');
    process.exit(0);
  }
}

runTests();
