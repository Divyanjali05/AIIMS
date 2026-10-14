import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Stream is the primary cohort dimension.
 * TECH and NON_TECH students are NEVER compared as one population.
 */
export type Stream = 'TECH' | 'NON_TECH';

export type EducationLevel =
  | 'SCHOOL'
  | 'UNDERGRADUATE'
  | 'POSTGRADUATE'
  | 'RESEARCH'
  | 'GRADUATE';

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

export type AiFamiliarity =
  | 'NEW_TO_AI'
  | 'EXPLORING_AI'
  | 'REGULAR_USER'
  | 'ADVANCED_USER'
  | 'AI_ML_LEARNER'
  | 'AI_ML_PROFESSIONAL';

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

export interface IStudentProfile extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;

  // Personal
  fullName: string;
  displayName?: string;

  // Academic Identity
  instituteId?: Types.ObjectId;
  instituteName?: string; // Cached for display when instituteId is pending
  campusName?: string;
  departmentName?: string;

  stream: Stream;
  streamSubCategory: TechSubCategory | NonTechSubCategory;
  educationLevel: EducationLevel;
  programId: string; // e.g. 'btech', 'bsc', 'mba' — from taxonomy config
  programName: string; // Display name e.g. 'B.Tech'
  specializationId: string; // e.g. 'cs', 'finance'
  specializationName: string; // Display name e.g. 'Computer Science'
  yearOfStudy: number; // 1, 2, 3, 4...
  admissionYear: number; // e.g. 2024
  expectedGraduationYear: number; // e.g. 2028

  // Cohort Association
  cohortId?: Types.ObjectId;

  // AI Context (personalization signals — NOT capability scores)
  aiFamiliarity?: AiFamiliarity;
  aiUsageContexts: string[]; // multi-select
  primaryGoal?: PrimaryGoal;

  // Metadata
  isComplete: boolean; // all required fields filled
  createdAt: Date;
  updatedAt: Date;
}

const StudentProfileSchema = new Schema<IStudentProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One profile per user
      index: true
    },
    fullName: { type: String, required: true, trim: true },
    displayName: { type: String, trim: true },

    // Academic Identity
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', index: true },
    instituteName: { type: String, trim: true },
    campusName: { type: String, trim: true },
    departmentName: { type: String, trim: true },

    stream: {
      type: String,
      enum: ['TECH', 'NON_TECH'],
      required: true,
      index: true
    },
    streamSubCategory: {
      type: String,
      required: true
    },
    educationLevel: {
      type: String,
      enum: ['SCHOOL', 'UNDERGRADUATE', 'POSTGRADUATE', 'RESEARCH', 'GRADUATE'],
      required: true,
      index: true
    },
    programId: { type: String, required: true, index: true },
    programName: { type: String, required: true },
    specializationId: { type: String, required: true, index: true },
    specializationName: { type: String, required: true },
    yearOfStudy: { type: Number, required: true, min: 1, max: 10 },
    admissionYear: { type: Number, required: true },
    expectedGraduationYear: { type: Number, required: true },

    // Cohort
    cohortId: { type: Schema.Types.ObjectId, ref: 'Cohort', index: true },

    // AI Context
    aiFamiliarity: {
      type: String,
      enum: ['NEW_TO_AI', 'EXPLORING_AI', 'REGULAR_USER', 'ADVANCED_USER', 'AI_ML_LEARNER', 'AI_ML_PROFESSIONAL']
    },
    aiUsageContexts: { type: [String], default: [] },
    primaryGoal: {
      type: String,
      enum: ['LEARN_AI', 'USE_AI_FOR_STUDIES', 'BUILD_SOFTWARE', 'SOLVE_PROBLEMS', 'RESEARCH', 'CAREER_PREPARATION', 'ENTREPRENEURSHIP', 'PRODUCTIVITY', 'CREATIVE_WORK', 'EXPLORE_AI', 'OTHER']
    },

    isComplete: { type: Boolean, default: false }
  },
  {
    timestamps: true
  }
);

// Compound indexes for analytics queries
StudentProfileSchema.index({ stream: 1, educationLevel: 1 });
StudentProfileSchema.index({ instituteId: 1, stream: 1 });
StudentProfileSchema.index({ programId: 1, specializationId: 1, stream: 1 });

export const StudentProfile = mongoose.model<IStudentProfile>('StudentProfile', StudentProfileSchema);
