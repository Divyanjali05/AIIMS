/**
 * AIIMS Academic Taxonomy Configuration
 *
 * Centralized definitions for:
 * - Streams and sub-categories
 * - Education levels
 * - Programs / Degrees (keyed by ID)
 * - Specializations (keyed by programId)
 * - Year-of-study options per education level
 * - AI familiarity options
 * - AI usage contexts
 * - Primary AI goals
 *
 * This config is the single source of truth.
 * Do NOT hardcode these labels in React components.
 * Do NOT scatter validation logic across files.
 */

// ──────────────────────────────────────────────
// STREAMS
// ──────────────────────────────────────────────

export type Stream = 'TECH' | 'NON_TECH';

export interface StreamOption {
  value: Stream;
  label: string;
  description: string;
}

export const STREAMS: StreamOption[] = [
  {
    value: 'TECH',
    label: 'Technology & Engineering',
    description: 'Computer science, engineering, applied sciences, data and AI'
  },
  {
    value: 'NON_TECH',
    label: 'Commerce, Humanities & Other',
    description: 'Business, management, arts, law, social sciences, medicine'
  }
];

// ──────────────────────────────────────────────
// STREAM SUB-CATEGORIES
// ──────────────────────────────────────────────

export type TechSubCategory =
  | 'CS_IT'
  | 'AI_ML_DS'
  | 'ELECTRONICS_ECE'
  | 'ELECTRICAL'
  | 'MECHANICAL'
  | 'CIVIL'
  | 'OTHER_ENGINEERING'
  | 'OTHER_TECHNOLOGY';

export type NonTechSubCategory =
  | 'COMMERCE_FINANCE'
  | 'MANAGEMENT_BUSINESS'
  | 'ARTS_HUMANITIES'
  | 'SCIENCE'
  | 'SOCIAL_SCIENCES'
  | 'LAW'
  | 'MEDICINE_HEALTHCARE'
  | 'EDUCATION'
  | 'OTHER';

export type StreamSubCategory = TechSubCategory | NonTechSubCategory;

export interface SubCategoryOption {
  value: StreamSubCategory;
  label: string;
}

export const TECH_SUB_CATEGORIES: SubCategoryOption[] = [
  { value: 'CS_IT', label: 'Computer Science / IT' },
  { value: 'AI_ML_DS', label: 'AI / ML / Data Science' },
  { value: 'ELECTRONICS_ECE', label: 'Electronics / ECE' },
  { value: 'ELECTRICAL', label: 'Electrical Engineering' },
  { value: 'MECHANICAL', label: 'Mechanical Engineering' },
  { value: 'CIVIL', label: 'Civil Engineering' },
  { value: 'OTHER_ENGINEERING', label: 'Other Engineering' },
  { value: 'OTHER_TECHNOLOGY', label: 'Other Technology' }
];

export const NON_TECH_SUB_CATEGORIES: SubCategoryOption[] = [
  { value: 'COMMERCE_FINANCE', label: 'Commerce / Finance' },
  { value: 'MANAGEMENT_BUSINESS', label: 'Management / Business' },
  { value: 'ARTS_HUMANITIES', label: 'Arts / Humanities' },
  { value: 'SCIENCE', label: 'Science (Pure)' },
  { value: 'SOCIAL_SCIENCES', label: 'Social Sciences' },
  { value: 'LAW', label: 'Law' },
  { value: 'MEDICINE_HEALTHCARE', label: 'Medicine / Healthcare' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'OTHER', label: 'Other' }
];

export const getSubCategories = (stream: Stream): SubCategoryOption[] =>
  stream === 'TECH' ? TECH_SUB_CATEGORIES : NON_TECH_SUB_CATEGORIES;

// ──────────────────────────────────────────────
// EDUCATION LEVELS
// ──────────────────────────────────────────────

export type EducationLevel =
  | 'SCHOOL'
  | 'UNDERGRADUATE'
  | 'POSTGRADUATE'
  | 'RESEARCH'
  | 'GRADUATE';

export interface EducationLevelOption {
  value: EducationLevel;
  label: string;
  maxYear: number; // Maximum year of study at this level
  yearLabels?: string[]; // Optional custom labels for years (e.g., 'Year 1', 'Semester 1')
}

export const EDUCATION_LEVELS: EducationLevelOption[] = [
  { value: 'SCHOOL', label: 'School (Class 9–12)', maxYear: 4 },
  { value: 'UNDERGRADUATE', label: 'Undergraduate (UG)', maxYear: 5 },
  { value: 'POSTGRADUATE', label: 'Postgraduate (PG)', maxYear: 3 },
  { value: 'RESEARCH', label: 'Research / PhD', maxYear: 7 },
  { value: 'GRADUATE', label: 'Graduate (US-style)', maxYear: 4 }
];

export const getYearsForLevel = (level: EducationLevel): number[] => {
  const levelInfo = EDUCATION_LEVELS.find(l => l.value === level);
  if (!levelInfo) return [1, 2, 3, 4];
  return Array.from({ length: levelInfo.maxYear }, (_, i) => i + 1);
};

// ──────────────────────────────────────────────
// PROGRAMS / DEGREES
// ──────────────────────────────────────────────

export interface ProgramOption {
  id: string; // stable key used in DB
  label: string; // display name
  stream: Stream;
  educationLevel: EducationLevel;
  normalDuration: number; // years
}

export const PROGRAMS: ProgramOption[] = [
  // TECH · Undergraduate
  { id: 'btech', label: 'B.Tech', stream: 'TECH', educationLevel: 'UNDERGRADUATE', normalDuration: 4 },
  { id: 'be', label: 'B.E.', stream: 'TECH', educationLevel: 'UNDERGRADUATE', normalDuration: 4 },
  { id: 'bsc_tech', label: 'B.Sc (Tech)', stream: 'TECH', educationLevel: 'UNDERGRADUATE', normalDuration: 3 },
  { id: 'bca', label: 'BCA', stream: 'TECH', educationLevel: 'UNDERGRADUATE', normalDuration: 3 },
  { id: 'bsc', label: 'B.Sc', stream: 'TECH', educationLevel: 'UNDERGRADUATE', normalDuration: 3 },
  { id: 'diploma_tech', label: 'Diploma (Engineering)', stream: 'TECH', educationLevel: 'UNDERGRADUATE', normalDuration: 3 },

  // TECH · Postgraduate
  { id: 'mtech', label: 'M.Tech', stream: 'TECH', educationLevel: 'POSTGRADUATE', normalDuration: 2 },
  { id: 'me', label: 'M.E.', stream: 'TECH', educationLevel: 'POSTGRADUATE', normalDuration: 2 },
  { id: 'mca', label: 'MCA', stream: 'TECH', educationLevel: 'POSTGRADUATE', normalDuration: 2 },
  { id: 'msc_tech', label: 'M.Sc (Tech / CS / DS)', stream: 'TECH', educationLevel: 'POSTGRADUATE', normalDuration: 2 },

  // TECH · Research
  { id: 'phd_tech', label: 'Ph.D (Technology)', stream: 'TECH', educationLevel: 'RESEARCH', normalDuration: 5 },

  // NON_TECH · Undergraduate
  { id: 'bcom', label: 'B.Com', stream: 'NON_TECH', educationLevel: 'UNDERGRADUATE', normalDuration: 3 },
  { id: 'ba', label: 'BA', stream: 'NON_TECH', educationLevel: 'UNDERGRADUATE', normalDuration: 3 },
  { id: 'bba', label: 'BBA', stream: 'NON_TECH', educationLevel: 'UNDERGRADUATE', normalDuration: 3 },
  { id: 'bsc_pure', label: 'B.Sc (Pure Science)', stream: 'NON_TECH', educationLevel: 'UNDERGRADUATE', normalDuration: 3 },
  { id: 'llb', label: 'LLB', stream: 'NON_TECH', educationLevel: 'UNDERGRADUATE', normalDuration: 3 },
  { id: 'mbbs', label: 'MBBS', stream: 'NON_TECH', educationLevel: 'UNDERGRADUATE', normalDuration: 5 },
  { id: 'bpharm', label: 'B.Pharm', stream: 'NON_TECH', educationLevel: 'UNDERGRADUATE', normalDuration: 4 },
  { id: 'bed', label: 'B.Ed', stream: 'NON_TECH', educationLevel: 'UNDERGRADUATE', normalDuration: 2 },

  // NON_TECH · Postgraduate
  { id: 'mba', label: 'MBA', stream: 'NON_TECH', educationLevel: 'POSTGRADUATE', normalDuration: 2 },
  { id: 'mcom', label: 'M.Com', stream: 'NON_TECH', educationLevel: 'POSTGRADUATE', normalDuration: 2 },
  { id: 'ma', label: 'MA', stream: 'NON_TECH', educationLevel: 'POSTGRADUATE', normalDuration: 2 },
  { id: 'msc_pure', label: 'M.Sc (Pure Science)', stream: 'NON_TECH', educationLevel: 'POSTGRADUATE', normalDuration: 2 },
  { id: 'llm', label: 'LLM', stream: 'NON_TECH', educationLevel: 'POSTGRADUATE', normalDuration: 1 },
  { id: 'mba_exec', label: 'Executive MBA', stream: 'NON_TECH', educationLevel: 'POSTGRADUATE', normalDuration: 1 },

  // NON_TECH · Research
  { id: 'phd_nontech', label: 'Ph.D (Non-Tech)', stream: 'NON_TECH', educationLevel: 'RESEARCH', normalDuration: 5 },

  // School
  { id: 'school_general', label: 'School (Class 9–12)', stream: 'TECH', educationLevel: 'SCHOOL', normalDuration: 4 },
  { id: 'school_nontech', label: 'School (Class 9–12)', stream: 'NON_TECH', educationLevel: 'SCHOOL', normalDuration: 4 },

  // Other
  { id: 'other_tech', label: 'Other (Technology)', stream: 'TECH', educationLevel: 'UNDERGRADUATE', normalDuration: 3 },
  { id: 'other_nontech', label: 'Other (Non-Technology)', stream: 'NON_TECH', educationLevel: 'UNDERGRADUATE', normalDuration: 3 }
];

export const getProgramsForStreamAndLevel = (
  stream: Stream,
  educationLevel: EducationLevel
): ProgramOption[] =>
  PROGRAMS.filter(p => p.stream === stream && p.educationLevel === educationLevel);

// ──────────────────────────────────────────────
// SPECIALIZATIONS
// ──────────────────────────────────────────────

export interface SpecializationOption {
  id: string;
  label: string;
  programIds: string[]; // which programs can have this specialization
  stream: Stream;
}

export const SPECIALIZATIONS: SpecializationOption[] = [
  // TECH specializations
  { id: 'cs', label: 'Computer Science', programIds: ['btech', 'be', 'mtech', 'me', 'bsc_tech', 'other_tech'], stream: 'TECH' },
  { id: 'ai_ml', label: 'Artificial Intelligence & Machine Learning', programIds: ['btech', 'be', 'mtech', 'me', 'bsc_tech', 'msc_tech'], stream: 'TECH' },
  { id: 'data_science', label: 'Data Science', programIds: ['btech', 'be', 'mtech', 'me', 'bsc_tech', 'msc_tech', 'bca', 'mca'], stream: 'TECH' },
  { id: 'it', label: 'Information Technology', programIds: ['btech', 'be', 'bca', 'mca', 'other_tech'], stream: 'TECH' },
  { id: 'ece', label: 'Electronics & Communication (ECE)', programIds: ['btech', 'be', 'mtech', 'me'], stream: 'TECH' },
  { id: 'electrical', label: 'Electrical Engineering', programIds: ['btech', 'be', 'mtech', 'me'], stream: 'TECH' },
  { id: 'mechanical', label: 'Mechanical Engineering', programIds: ['btech', 'be', 'mtech', 'me'], stream: 'TECH' },
  { id: 'civil', label: 'Civil Engineering', programIds: ['btech', 'be', 'mtech', 'me'], stream: 'TECH' },
  { id: 'cybersecurity', label: 'Cyber Security', programIds: ['btech', 'be', 'mtech', 'bca', 'mca', 'bsc_tech', 'msc_tech'], stream: 'TECH' },
  { id: 'cloud', label: 'Cloud Computing', programIds: ['btech', 'be', 'mtech', 'bca', 'mca'], stream: 'TECH' },
  { id: 'iot', label: 'IoT & Embedded Systems', programIds: ['btech', 'be', 'mtech', 'me'], stream: 'TECH' },
  { id: 'robotics', label: 'Robotics & Automation', programIds: ['btech', 'be', 'mtech', 'me'], stream: 'TECH' },
  { id: 'biotech', label: 'Biotechnology', programIds: ['btech', 'be', 'bsc_tech', 'msc_tech'], stream: 'TECH' },
  { id: 'chemical', label: 'Chemical Engineering', programIds: ['btech', 'be', 'mtech'], stream: 'TECH' },
  { id: 'general_cs_bsc', label: 'Computer Science (B.Sc)', programIds: ['bsc', 'bsc_tech'], stream: 'TECH' },
  { id: 'statistics', label: 'Statistics', programIds: ['bsc', 'msc_tech'], stream: 'TECH' },
  { id: 'math', label: 'Mathematics', programIds: ['bsc', 'msc_tech'], stream: 'TECH' },
  { id: 'general_tech', label: 'General / Interdisciplinary', programIds: ['btech', 'be', 'bca', 'mca', 'mtech', 'bsc_tech', 'msc_tech', 'other_tech', 'diploma_tech', 'phd_tech', 'school_general'], stream: 'TECH' },

  // NON_TECH specializations
  { id: 'accounting', label: 'Accounting', programIds: ['bcom', 'mcom'], stream: 'NON_TECH' },
  { id: 'finance', label: 'Finance', programIds: ['bcom', 'mcom', 'bba', 'mba', 'mba_exec'], stream: 'NON_TECH' },
  { id: 'taxation', label: 'Taxation', programIds: ['bcom', 'mcom'], stream: 'NON_TECH' },
  { id: 'marketing', label: 'Marketing', programIds: ['bba', 'mba', 'mba_exec'], stream: 'NON_TECH' },
  { id: 'hr', label: 'Human Resources', programIds: ['bba', 'mba', 'mba_exec'], stream: 'NON_TECH' },
  { id: 'operations', label: 'Operations Management', programIds: ['bba', 'mba', 'mba_exec'], stream: 'NON_TECH' },
  { id: 'business_analytics', label: 'Business Analytics', programIds: ['bba', 'mba', 'mba_exec', 'mcom'], stream: 'NON_TECH' },
  { id: 'entrepreneurship', label: 'Entrepreneurship', programIds: ['bba', 'mba', 'mba_exec'], stream: 'NON_TECH' },
  { id: 'economics', label: 'Economics', programIds: ['ba', 'ma', 'bcom', 'mcom'], stream: 'NON_TECH' },
  { id: 'english', label: 'English Literature', programIds: ['ba', 'ma'], stream: 'NON_TECH' },
  { id: 'sociology', label: 'Sociology', programIds: ['ba', 'ma'], stream: 'NON_TECH' },
  { id: 'psychology', label: 'Psychology', programIds: ['ba', 'ma'], stream: 'NON_TECH' },
  { id: 'political_science', label: 'Political Science', programIds: ['ba', 'ma'], stream: 'NON_TECH' },
  { id: 'history', label: 'History', programIds: ['ba', 'ma'], stream: 'NON_TECH' },
  { id: 'philosophy', label: 'Philosophy', programIds: ['ba', 'ma'], stream: 'NON_TECH' },
  { id: 'journalism', label: 'Journalism & Communication', programIds: ['ba', 'ma'], stream: 'NON_TECH' },
  { id: 'physics_pure', label: 'Physics', programIds: ['bsc_pure', 'msc_pure'], stream: 'NON_TECH' },
  { id: 'chemistry_pure', label: 'Chemistry', programIds: ['bsc_pure', 'msc_pure'], stream: 'NON_TECH' },
  { id: 'biology', label: 'Biology / Life Sciences', programIds: ['bsc_pure', 'msc_pure'], stream: 'NON_TECH' },
  { id: 'corporate_law', label: 'Corporate Law', programIds: ['llb', 'llm'], stream: 'NON_TECH' },
  { id: 'criminal_law', label: 'Criminal Law', programIds: ['llb', 'llm'], stream: 'NON_TECH' },
  { id: 'clinical', label: 'Clinical Medicine', programIds: ['mbbs'], stream: 'NON_TECH' },
  { id: 'pharmacy', label: 'Pharmacy', programIds: ['bpharm'], stream: 'NON_TECH' },
  { id: 'education_general', label: 'Education & Teaching', programIds: ['bed', 'ma'], stream: 'NON_TECH' },
  { id: 'general_nontech', label: 'General / Interdisciplinary', programIds: ['ba', 'ma', 'bba', 'mba', 'bcom', 'mcom', 'bsc_pure', 'msc_pure', 'llb', 'llm', 'mbbs', 'bpharm', 'bed', 'other_nontech', 'phd_nontech', 'school_nontech', 'mba_exec'], stream: 'NON_TECH' }
];

export const getSpecializationsForProgram = (
  programId: string,
  stream: Stream
): SpecializationOption[] =>
  SPECIALIZATIONS.filter(
    s => s.stream === stream && s.programIds.includes(programId)
  );

/**
 * Validates that a given (stream, programId, specializationId) combination is valid.
 */
export const isValidAcademicCombination = (
  stream: Stream,
  educationLevel: EducationLevel,
  programId: string,
  specializationId: string
): { valid: boolean; reason?: string } => {
  const program = PROGRAMS.find(p => p.id === programId);
  if (!program) return { valid: false, reason: 'Invalid program.' };
  if (program.stream !== stream) {
    return { valid: false, reason: `Program "${program.label}" does not belong to stream "${stream}".` };
  }
  if (program.educationLevel !== educationLevel) {
    return { valid: false, reason: `Program "${program.label}" is not valid for education level "${educationLevel}".` };
  }

  const spec = SPECIALIZATIONS.find(s => s.id === specializationId);
  if (!spec) return { valid: false, reason: 'Invalid specialization.' };
  if (spec.stream !== stream) {
    return { valid: false, reason: `Specialization "${spec.label}" does not belong to stream "${stream}".` };
  }
  if (!spec.programIds.includes(programId)) {
    return { valid: false, reason: `Specialization "${spec.label}" is not valid for program "${program.label}".` };
  }

  return { valid: true };
};

// ──────────────────────────────────────────────
// AI CONTEXT OPTIONS (Personalization signals — NOT scores)
// ──────────────────────────────────────────────

export type AiFamiliarity =
  | 'NEW_TO_AI'
  | 'EXPLORING_AI'
  | 'REGULAR_USER'
  | 'ADVANCED_USER'
  | 'AI_ML_LEARNER'
  | 'AI_ML_PROFESSIONAL';

export interface AiFamiliarityOption {
  value: AiFamiliarity;
  label: string;
  description: string;
}

export const AI_FAMILIARITY_OPTIONS: AiFamiliarityOption[] = [
  { value: 'NEW_TO_AI', label: 'New to AI', description: 'I haven\'t started using AI tools yet.' },
  { value: 'EXPLORING_AI', label: 'Exploring AI', description: 'I\'ve tried a few tools and am learning.' },
  { value: 'REGULAR_USER', label: 'Regular AI User', description: 'I use AI tools frequently in my work or studies.' },
  { value: 'ADVANCED_USER', label: 'Advanced AI User', description: 'I work deeply with AI — prompting, automation, workflows.' },
  { value: 'AI_ML_LEARNER', label: 'AI / ML Learner', description: 'I\'m formally studying AI, ML, or data science.' },
  { value: 'AI_ML_PROFESSIONAL', label: 'AI / ML Professional', description: 'I build or deploy AI systems professionally.' }
];

export interface AiUsageOption {
  value: string;
  label: string;
}

export const AI_USAGE_CONTEXTS: AiUsageOption[] = [
  { value: 'none', label: 'I don\'t use AI yet' },
  { value: 'learning', label: 'Learning / Studying' },
  { value: 'assignments', label: 'Assignments & Academic work' },
  { value: 'coding', label: 'Coding & Development' },
  { value: 'research', label: 'Research' },
  { value: 'writing', label: 'Writing & Communication' },
  { value: 'productivity', label: 'Productivity & Automation' },
  { value: 'creative', label: 'Creative Work' },
  { value: 'projects', label: 'Personal Projects' },
  { value: 'business', label: 'Business / Entrepreneurship' },
  { value: 'other', label: 'Other' }
];

export type PrimaryGoal =
  | 'LEARN_AI'
  | 'USE_AI_FOR_STUDIES'
  | 'BUILD_SOFTWARE'
  | 'SOLVE_PROBLEMS'
  | 'RESEARCH'
  | 'CAREER_PREPARATION'
  | 'ENTREPRENEURSHIP'
  | 'PRODUCTIVITY'
  | 'CREATIVE_WORK'
  | 'EXPLORE_AI'
  | 'OTHER';

export interface PrimaryGoalOption {
  value: PrimaryGoal;
  label: string;
}

export const PRIMARY_GOAL_OPTIONS: PrimaryGoalOption[] = [
  { value: 'LEARN_AI', label: 'Learn about AI' },
  { value: 'USE_AI_FOR_STUDIES', label: 'Use AI for my studies' },
  { value: 'BUILD_SOFTWARE', label: 'Build AI-powered software' },
  { value: 'SOLVE_PROBLEMS', label: 'Solve real-world problems with AI' },
  { value: 'RESEARCH', label: 'AI Research' },
  { value: 'CAREER_PREPARATION', label: 'Prepare for AI-focused career' },
  { value: 'ENTREPRENEURSHIP', label: 'Build an AI startup / product' },
  { value: 'PRODUCTIVITY', label: 'Improve personal productivity' },
  { value: 'CREATIVE_WORK', label: 'Creative & artistic work' },
  { value: 'EXPLORE_AI', label: 'Just exploring AI' },
  { value: 'OTHER', label: 'Other' }
];

// ──────────────────────────────────────────────
// GRADUATION YEAR RANGE
// ──────────────────────────────────────────────

export const getExpectedGraduationYears = (): number[] => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y <= currentYear + 10; y++) {
    years.push(y);
  }
  return years;
};

export const getAdmissionYears = (): number[] => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 7; y <= currentYear + 1; y++) {
    years.push(y);
  }
  return years.reverse();
};
