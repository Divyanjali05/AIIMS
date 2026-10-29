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

// Internal dictionary with null prototype
const internalStore: Record<string, any> = Object.create(null);

// In-memory registered user store with null prototype and $-prefixing to eliminate prototype pollution & property injection (CWE-1321)
export const registeredUsers: Record<string, any> = new Proxy(internalStore, {
  get(target, prop: string | symbol) {
    if (typeof prop !== 'string' || !isSafeKey(prop)) return undefined;
    const key = prop.toLowerCase().trim();
    return target['$' + key] || target[key];
  },
  set(target, prop: string | symbol, value) {
    if (typeof prop !== 'string' || !isSafeKey(prop)) return false;
    const key = prop.toLowerCase().trim();
    const safeProp = '$' + key;
    target[safeProp] = value;
    return true;
  },
  deleteProperty(target, prop: string | symbol) {
    if (typeof prop !== 'string') return false;
    const key = prop.toLowerCase().trim();
    delete target['$' + key];
    delete target[key];
    return true;
  },
  has(target, prop: string | symbol) {
    if (typeof prop !== 'string' || !isSafeKey(prop)) return false;
    const key = prop.toLowerCase().trim();
    return '$' + key in target || key in target;
  },
  ownKeys(target) {
    return Object.keys(target).map((k) => (k.startsWith('$') ? k.slice(1) : k));
  },
  getOwnPropertyDescriptor(target, prop: string | symbol) {
    if (typeof prop !== 'string') return undefined;
    const key = prop.startsWith('$') ? prop : '$' + prop;
    if (key in target) {
      return { configurable: true, enumerable: true, value: target[key], writable: true };
    }
    return undefined;
  },
});

export function saveRegisteredUser(email: string, user: any): void {
  if (!isSafeKey(email)) return;
  const safeKey = '$' + email.toLowerCase().trim();
  internalStore[safeKey] = user;
}

export function getRegisteredUser(email: string): any {
  if (!email || typeof email !== 'string') return undefined;
  const clean = email.toLowerCase().trim();
  return internalStore['$' + clean] || internalStore[clean];
}

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
