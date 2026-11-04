import mongoose, { Schema, Document } from 'mongoose';

export type ExclusionScope = 'college' | 'batch' | 'cohort';

export interface IInstitutionExclusionConfig extends Document {
  scope: ExclusionScope;
  exclusionDays: number;
  updatedBy?: string;
  updatedAt: Date;
  createdAt: Date;
}

export const InstitutionExclusionConfigSchema = new Schema<IInstitutionExclusionConfig>(
  {
    scope: {
      type: String,
      enum: ['college', 'batch', 'cohort'],
      default: 'college',
      required: true,
    },
    exclusionDays: {
      type: Number,
      default: 30, // Provisional default: 30 days
      min: 0,
      max: 365,
      required: true,
    },
    updatedBy: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const InstitutionExclusionConfig = mongoose.model<IInstitutionExclusionConfig>(
  'InstitutionExclusionConfig',
  InstitutionExclusionConfigSchema
);

// In-Memory store for tests and offline execution
export let inMemoryExclusionConfig: {
  scope: ExclusionScope;
  exclusionDays: number;
  updatedBy?: string;
  updatedAt: Date;
} = {
  scope: 'college',
  exclusionDays: 30, // Default 30 days
  updatedAt: new Date(),
};

export function setInMemoryExclusionConfig(config: {
  scope: ExclusionScope;
  exclusionDays: number;
  updatedBy?: string;
}) {
  inMemoryExclusionConfig = {
    ...inMemoryExclusionConfig,
    ...config,
    updatedAt: new Date(),
  };
}
