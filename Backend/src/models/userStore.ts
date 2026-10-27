import bcrypt from 'bcryptjs';
import { mockUser } from './aiims.models';
import { STARTING_CREDITS } from '../config/credits.config';

export const registeredUsers: Record<string, any> = {
  [mockUser.email.toLowerCase()]: {
    ...mockUser,
    _id: mockUser.id || 'usr-mock-001',
    college: 'Engineering & Technology College',
    password: bcrypt.hashSync('password123', 10),
    transactions: [],
  },
  'alex.ai@example.com': {
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
  },
};
