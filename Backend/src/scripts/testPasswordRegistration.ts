/**
 * testPasswordRegistration.ts
 * =========================================================
 * AIIMS Simplified Password Creation & Registration Validation Test
 */

import { registerSchema } from '../schemas/auth.schema';
import { isCommonPassword } from '../utils/passwordSecurity';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${name}`);
  } else {
    failed++;
    console.error(`  ❌ [FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const basePayload = {
  name: 'Alex Johnson',
  email: 'alex.johnson@example.com',
  track: 'Student',
  stream: 'TECH',
  educationLevel: 'UNDERGRADUATE',
  programId: 'btech-cse',
  specializationId: 'ai-ml',
  yearOfStudy: 3,
  admissionYear: 2023,
  expectedGraduationYear: 2027,
};

console.log('===============================================================');
console.log('🔒 AIIMS SIMPLIFIED PASSWORD CREATION & VALIDATION VERIFICATION');
console.log('===============================================================\n');

// 1. Password length >= 8 without uppercase or numbers
const simplePasswordResult = registerSchema.safeParse({
  ...basePayload,
  password: 'simplepassphrase',
  confirmPassword: 'simplepassphrase',
});
assert(
  'Accepts simple lowercase 8+ character password (no uppercase or digits required)',
  simplePasswordResult.success
);

// 2. Password length < 8 rejected
const shortPasswordResult = registerSchema.safeParse({
  ...basePayload,
  password: 'short',
  confirmPassword: 'short',
});
assert(
  'Rejects password shorter than 8 characters',
  !shortPasswordResult.success &&
    shortPasswordResult.error?.issues.some((i) => i.message.includes('at least 8 characters'))
);

// 3. Common compromised passwords blocked
const common1 = registerSchema.safeParse({
  ...basePayload,
  password: 'password123',
  confirmPassword: 'password123',
});
assert(
  'Rejects common dictionary password "password123"',
  !common1.success &&
    common1.error?.issues.some((i) => i.message.includes('too common or easily guessed'))
);

const common2 = registerSchema.safeParse({
  ...basePayload,
  password: '12345678',
  confirmPassword: '12345678',
});
assert(
  'Rejects common sequential password "12345678"',
  !common2.success &&
    common2.error?.issues.some((i) => i.message.includes('too common or easily guessed'))
);

const commonRepeated = registerSchema.safeParse({
  ...basePayload,
  password: 'aaaaaaaa',
  confirmPassword: 'aaaaaaaa',
});
assert(
  'Rejects repeated identical characters "aaaaaaaa"',
  !commonRepeated.success &&
    commonRepeated.error?.issues.some((i) => i.message.includes('too common or easily guessed'))
);

// 4. Confirm password mismatch rejected
const mismatchResult = registerSchema.safeParse({
  ...basePayload,
  password: 'mysecurepass2026',
  confirmPassword: 'differentpass2026',
});
assert(
  'Rejects password and confirmPassword mismatch',
  !mismatchResult.success &&
    mismatchResult.error?.issues.some((i) => i.message.includes('Passwords do not match'))
);

// 5. Valid strong password accepted
const strongResult = registerSchema.safeParse({
  ...basePayload,
  password: 'CorrectHorse#Battery2026',
  confirmPassword: 'CorrectHorse#Battery2026',
});
assert(
  'Accepts strong password with mixed character classes',
  strongResult.success
);

// 6. Common password helper logic
assert('isCommonPassword returns true for "qwertyui"', isCommonPassword('qwertyui') === true);
assert('isCommonPassword returns true for "admin123"', isCommonPassword('admin123') === true);
assert('isCommonPassword returns false for "uniquepass2026"', isCommonPassword('uniquepass2026') === false);

console.log('\n===============================================================');
console.log(`SUMMARY: ${passed} PASSED / ${failed} FAILED`);
console.log('===============================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL PASSWORD REGISTRATION TESTS PASSED CLEANLY!\n');
  process.exit(0);
}

