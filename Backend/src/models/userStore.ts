import bcrypt from 'bcryptjs';
import { mockUser } from './aiims.models';
import { STARTING_CREDITS } from '../config/credits.config';

/**
 * Blocked property names to prevent prototype pollution and remote property injection.
 */
const DANGEROUS_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isSafeKey(key: unknown): key is string {
  if (typeof key !== 'string') return false;
  const trimmed = key.trim().toLowerCase();
  return trimmed.length > 0 && !DANGEROUS_OBJECT_KEYS.has(trimmed);
}

// In-memory registered user store with null prototype to prevent prototype pollution
export const registeredUsers: Record<string, any> = Object.create(null);

registeredUsers[mockUser.email.toLowerCase()] = {
  ...mockUser,
  _id: mockUser.id || 'usr-mock-001',
  college: 'Engineering & Technology College',
  password: bcrypt.hashSync('password123', 10),
  transactions: [],
};

registeredUsers['alex.ai@example.com'] = {
  _id: 'usr-alex-101',
  id: 'usr-alex-101',
  name: 'Alex AI',
  email: 'alex.ai@example.com',
  role: 'learner',
  college: 'Stanford University',
  targetGoal: 'Master AI Intelligence & Mentoring',
  stage: 'Knowing',
  xpPoints: 100,
  aiimsCredits: STARTING_CREDITS,
  password: bcrypt.hashSync('password123', 10),
  stream: 'TECH',
  programName: 'B.Tech',
  specializationName: 'AI & ML',
  transactions: [],
};
