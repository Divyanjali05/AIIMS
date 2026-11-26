/**
 * testSimplifiedRegistration.ts
 * =========================================================
 * AIIMS Simplified Role-Based Registration Validation Test Suite
 *
 * Verifies:
 * 1. Student Registration - Below 10th (minimal fields)
 * 2. Student Registration - Class 9 / 10 (no specialization/branch/degree)
 * 3. Student Registration - Intermediate (+2 / Junior College)
 * 4. Student Registration - Diploma (Polytechnic)
 * 5. Student Registration - Degree (Undergraduate)
 * 6. Student Registration - Postgraduate (Masters / PhD)
 * 7. Entrepreneur Registration - Minimal fields (no education fields)
 * 8. Cross-Track Isolation - Reject academic fields on Entrepreneur
 * 9. Cross-Track Isolation - Reject venture fields on Student
 * 10. Backward Compatibility - Legacy Student registration without educationCategory
 */

import { registerSchema } from '../schemas/auth.schema';

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

console.log('===============================================================');
console.log('🎓 AIIMS SIMPLIFIED REGISTRATION SCHEMA & FLOW VERIFICATION');
console.log('===============================================================\n');

// 1. Below 10th Student Registration
const below10thPayload = {
  name: 'Aarav Sharma',
  email: 'aarav.school@example.com',
  password: 'simplepass2026',
  confirmPassword: 'simplepass2026',
  track: 'Student',
  educationCategory: 'BELOW_10TH',
  instituteName: 'Delhi Public School',
};
const res1 = registerSchema.safeParse(below10thPayload);
assert(
  'Student Below 10th succeeds without academic year, branch, or degree fields',
  res1.success,
  res1.error?.message
);

// 2. Class 9 / 10 Student Registration
const class9_10Payload = {
  name: 'Sneha Patel',
  email: 'sneha.9th@example.com',
  password: 'simplepass2026',
  confirmPassword: 'simplepass2026',
  track: 'Student',
  educationCategory: 'CLASS_9_10',
  instituteName: 'St. Xavier High School',
  yearOfStudy: 1, // Class 9
};
const res2 = registerSchema.safeParse(class9_10Payload);
assert(
  'Student Class 9/10 succeeds without specialization or degree fields',
  res2.success,
  res2.error?.message
);

// 3. Intermediate Student Registration
const intermediatePayload = {
  name: 'Rohan Reddy',
  email: 'rohan.inter@example.com',
  password: 'simplepass2026',
  confirmPassword: 'simplepass2026',
  track: 'Student',
  educationCategory: 'INTERMEDIATE',
  specializationId: 'mpc',
  specializationName: 'MPC (Maths, Physics, Chemistry)',
  yearOfStudy: 2,
  instituteName: 'Apex Junior College',
};
const res3 = registerSchema.safeParse(intermediatePayload);
assert('Student Intermediate succeeds with group and year', res3.success, res3.error?.message);

// 4. Diploma Student Registration
const diplomaPayload = {
  name: 'Pooja Verma',
  email: 'pooja.poly@example.com',
  password: 'simplepass2026',
  confirmPassword: 'simplepass2026',
  track: 'Student',
  educationCategory: 'DIPLOMA',
  specializationId: 'diploma_cs',
  specializationName: 'Computer Engineering',
  yearOfStudy: 2,
  instituteName: 'Government Polytechnic',
};
const res4 = registerSchema.safeParse(diplomaPayload);
assert('Student Diploma succeeds with branch and year', res4.success, res4.error?.message);

// 5. Degree Student Registration
const degreePayload = {
  name: 'Vikram Rao',
  email: 'vikram.degree@example.com',
  password: 'simplepass2026',
  confirmPassword: 'simplepass2026',
  track: 'Student',
  educationCategory: 'DEGREE',
  stream: 'TECH',
  educationLevel: 'UNDERGRADUATE',
  programId: 'btech',
  specializationId: 'cs',
  yearOfStudy: 3,
  admissionYear: 2023,
  expectedGraduationYear: 2027,
  instituteName: 'IIT Bombay',
};
const res5 = registerSchema.safeParse(degreePayload);
assert('Student Degree succeeds with degree academic fields', res5.success, res5.error?.message);

// 6. Postgraduate Student Registration
const pgPayload = {
  name: 'Dr. Ananya Sen',
  email: 'ananya.pg@example.com',
  password: 'simplepass2026',
  confirmPassword: 'simplepass2026',
  track: 'Student',
  educationCategory: 'POSTGRADUATE',
  stream: 'TECH',
  educationLevel: 'POSTGRADUATE',
  programId: 'mtech',
  specializationId: 'mtech_cs',
  yearOfStudy: 1,
  admissionYear: 2025,
  expectedGraduationYear: 2027,
  instituteName: 'IISc Bangalore',
};
const res6 = registerSchema.safeParse(pgPayload);
assert('Student Postgraduate succeeds with PG fields', res6.success, res6.error?.message);

// 7. Entrepreneur Registration (Minimal fields, no education)
const entrepreneurPayload = {
  name: 'Kiran Kumar',
  email: 'kiran.founder@startup.io',
  password: 'simplepass2026',
  confirmPassword: 'simplepass2026',
  track: 'Entrepreneur',
};
const res7 = registerSchema.safeParse(entrepreneurPayload);
assert(
  'Entrepreneur succeeds with only account credentials (no education details)',
  res7.success,
  res7.error?.message
);

// 8. Entrepreneur with optional venture fields
const entrepreneurWithVenturePayload = {
  name: 'Priya Mehta',
  email: 'priya@healthai.tech',
  password: 'simplepass2026',
  confirmPassword: 'simplepass2026',
  track: 'Entrepreneur',
  ventureName: 'HealthAI Labs',
  industry: 'Healthcare & Biotech',
  ventureStage: 'mvp_development',
};
const res8 = registerSchema.safeParse(entrepreneurWithVenturePayload);
assert(
  'Entrepreneur succeeds with optional venture name and stage',
  res8.success,
  res8.error?.message
);

// 9. Cross-track isolation: Reject Student academic fields on Entrepreneur
const invalidEntrepreneurPayload = {
  name: 'Invalid Entrepreneur',
  email: 'bad.founder@example.com',
  password: 'simplepass2026',
  confirmPassword: 'simplepass2026',
  track: 'Entrepreneur',
  stream: 'TECH',
  educationLevel: 'UNDERGRADUATE',
};
const res9 = registerSchema.safeParse(invalidEntrepreneurPayload);
assert('Rejects academic fields (stream, educationLevel) on Entrepreneur track', !res9.success);

// 10. Cross-track isolation: Reject Entrepreneur venture fields on Student
const invalidStudentPayload = {
  name: 'Invalid Student',
  email: 'bad.student@example.com',
  password: 'simplepass2026',
  confirmPassword: 'simplepass2026',
  track: 'Student',
  educationCategory: 'BELOW_10TH',
  ventureStage: 'scaling',
};
const res10 = registerSchema.safeParse(invalidStudentPayload);
assert('Rejects ventureStage on Student track', !res10.success);

// 11. Backward compatibility: Legacy student registration without educationCategory
const legacyStudentPayload = {
  name: 'Legacy Student',
  email: 'legacy.student@example.com',
  password: 'simplepass2026',
  confirmPassword: 'simplepass2026',
  track: 'Student',
  stream: 'TECH',
  educationLevel: 'UNDERGRADUATE',
  programId: 'btech',
  specializationId: 'cs',
  yearOfStudy: 2,
  admissionYear: 2024,
  expectedGraduationYear: 2028,
};
const res11 = registerSchema.safeParse(legacyStudentPayload);
assert(
  'Preserves backward compatibility for legacy Student registrations without educationCategory',
  res11.success,
  res11.error?.message
);

console.log('\n===============================================================');
console.log(`SUMMARY: ${passed} PASSED / ${failed} FAILED`);
console.log('===============================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL SIMPLIFIED REGISTRATION TESTS PASSED CLEANLY!\n');
}
