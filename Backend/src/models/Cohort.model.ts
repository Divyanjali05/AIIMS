import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * A Cohort represents a meaningful comparison population.
 * It is defined by institute + stream + education level + program + specialization + batch.
 *
 * Example: ABC University → TECH → UNDERGRADUATE → B.Tech → CSE → 2024-2028
 * Resolved to a stable cohortId. Display name: "B.Tech CSE · 2024–2028"
 */
export interface ICohort extends Document {
  _id: Types.ObjectId;
  instituteId?: Types.ObjectId;
  instituteName?: string;

  stream: 'TECH' | 'NON_TECH';
  educationLevel: string;
  programId: string;
  programName: string;
  specializationId: string;
  specializationName: string;

  admissionYear: number;
  graduationYear: number;

  displayName: string; // "B.Tech CSE · 2024–2028"
  shortCode: string;   // "BTECH-CSE-2024-2028" — human-readable slug
  status: 'ACTIVE' | 'GRADUATED' | 'INACTIVE';

  studentCount: number; // Maintained counter for analytics queries
  assessmentVersion: string; // Which version of the 25-question assessment applies
  createdAt: Date;
  updatedAt: Date;
}

const CohortSchema = new Schema<ICohort>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', index: true },
    instituteName: { type: String },

    stream: { type: String, enum: ['TECH', 'NON_TECH'], required: true, index: true },
    educationLevel: { type: String, required: true, index: true },
    programId: { type: String, required: true, index: true },
    programName: { type: String, required: true },
    specializationId: { type: String, required: true, index: true },
    specializationName: { type: String, required: true },

    admissionYear: { type: Number, required: true },
    graduationYear: { type: Number, required: true },

    displayName: { type: String, required: true },
    shortCode: { type: String, required: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'GRADUATED', 'INACTIVE'],
      default: 'ACTIVE'
    },

    studentCount: { type: Number, default: 0 },
    assessmentVersion: { type: String, default: 'v1.0' }
  },
  {
    timestamps: true
  }
);

// Unique compound: one cohort record per institute+program+spec+batch combination
CohortSchema.index(
  {
    instituteId: 1,
    stream: 1,
    educationLevel: 1,
    programId: 1,
    specializationId: 1,
    admissionYear: 1,
    graduationYear: 1
  },
  { unique: true, sparse: true }
);

// For analytics population queries
CohortSchema.index({ stream: 1, programId: 1, specializationId: 1 });

export const Cohort = mongoose.model<ICohort>('Cohort', CohortSchema);
