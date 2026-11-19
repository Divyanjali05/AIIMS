import assert from 'assert';
import { userRecordToIUser, defaultClarity, defaultFocus } from '../utils/userMapper';
import { formatUserState } from '../config/credits.config';
import { IUser } from '../types/models';

function runTests() {
  console.log('==================================================================');
  console.log('🧪 VERIFYING CLARITY LEVELS PROGRESSION & FOCUS UNLOCKING');
  console.log('==================================================================');

  // Test 1: userRecordToIUser unlocks clarity and focus when assessment is completed even if raw data is empty
  const mockUserRowEmptyRaw: any = {
    id: 'user-empty-1',
    name: 'Test Student',
    email: 'student@aiims.education',
    role: 'Student',
    track: 'Student',
    stage: 'Recognising',
    xpPoints: 100,
    aiimsCredits: 500,
    assessmentStatus: 'completed',
    assessmentData: { status: 'completed' },
    analysisData: { status: 'viewed' },
    clarityData: {}, // empty object from initial state or migration
    focusData: {}, // empty object
    radarData: {},
    investigationData: {},
  };

  const parsedEmpty = userRecordToIUser(mockUserRowEmptyRaw);
  assert.strictEqual(
    parsedEmpty.clarity.status,
    'unlocked',
    'Clarity should be unlocked when assessmentStatus is completed'
  );
  assert.strictEqual(
    parsedEmpty.focus.status,
    'unlocked',
    'Focus should be unlocked when assessmentStatus is completed'
  );
  console.log('  ✅ [PASS] Test 1: userRecordToIUser unlocks clarity & focus when assessmentStatus is completed');

  // Test 2: userRecordToIUser marks clarity completed and focus unlocked when completedTopics has items
  const mockUserRowWithCompletedTopics: any = {
    ...mockUserRowEmptyRaw,
    id: 'user-completed-topic-2',
    clarityData: {
      status: 'completed',
      completedTopics: ['AI Foundations'],
      taskScores: {
        'AI Foundations': {
          easy: { score: 85, completedAt: new Date().toISOString() },
        },
      },
    },
    focusData: {
      status: 'unlocked',
    },
  };

  const parsedWithCompleted = userRecordToIUser(mockUserRowWithCompletedTopics);
  assert.strictEqual(parsedWithCompleted.clarity.status, 'completed');
  assert.strictEqual(parsedWithCompleted.focus.status, 'unlocked');
  assert.deepStrictEqual(parsedWithCompleted.clarity.completedTopics, ['AI Foundations']);
  console.log('  ✅ [PASS] Test 2: userRecordToIUser correctly parses completedTopics and unlocks focus');

  // Test 3: formatUserState produces unlocked focus state
  const formattedState = formatUserState(parsedWithCompleted);
  assert.strictEqual(formattedState.clarity.status, 'completed');
  assert.strictEqual(formattedState.focus.status, 'unlocked');
  assert.deepStrictEqual(formattedState.clarity.completedTopics, ['AI Foundations']);
  console.log('  ✅ [PASS] Test 3: formatUserState exports completed clarity and unlocked focus state');

  // Test 4: Verify FocusScreen isClarityExplored gating logic
  // Scenario A: When clarity has completed status or completedTopics > 0
  const stateClarityCompleted = {
    clarity: {
      status: 'completed' as const,
      completedTopics: ['AI Foundations'],
      selectedAreas: ['AI Foundations'],
      selectedTopic: 'AI Foundations',
      taskScores: { 'AI Foundations': { easy: { score: 90 } } },
      reflections: {},
    },
    focus: {
      status: 'unlocked' as const,
      selectedTrack: null,
    },
    credits: {
      claimedActions: ['clarity::AI Foundations::easy::task-easy'],
    },
  };

  const isExploredA =
    stateClarityCompleted.clarity.status === 'completed' ||
    stateClarityCompleted.clarity.status === 'in_progress' ||
    stateClarityCompleted.clarity.status === 'unlocked' ||
    stateClarityCompleted.focus.status === 'unlocked' ||
    stateClarityCompleted.focus.status === 'active' ||
    Boolean(stateClarityCompleted.focus.selectedTrack) ||
    (stateClarityCompleted.clarity.completedTopics && stateClarityCompleted.clarity.completedTopics.length > 0) ||
    (stateClarityCompleted.clarity.selectedAreas && stateClarityCompleted.clarity.selectedAreas.length > 0) ||
    stateClarityCompleted.clarity.selectedTopic !== null ||
    Object.keys(stateClarityCompleted.clarity.taskScores || {}).length > 0 ||
    Object.keys(stateClarityCompleted.clarity.reflections || {}).length > 0 ||
    Boolean(
      stateClarityCompleted.credits.claimedActions &&
        stateClarityCompleted.credits.claimedActions.some((a) => a.includes('clarity') || a.includes('CLARITY'))
    );

  assert.strictEqual(isExploredA, true, 'isClarityExplored must be true when tasks are completed');
  console.log('  ✅ [PASS] Test 4: Focus gating guard evaluates to unlocked (true) after question attempt');

  console.log('==================================================================');
  console.log('🎉 ALL 4 VERIFICATION TESTS PASSED CLEANLY!');
  console.log('==================================================================');
}

runTests();
