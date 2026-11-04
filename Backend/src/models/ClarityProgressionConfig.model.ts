import mongoose, { Schema, Document } from 'mongoose';

export interface IClarityProgressionConfig extends Document {
  upwardThreshold: number; // Score threshold to count as high (default: 80)
  consecutiveRequired: number; // Consecutive high scores required to advance level (default: 2)
  downwardThreshold: number; // Score threshold below which level drops (default: 50)
  updatedBy: string;
  updatedAt: Date;
}

export const inMemoryClarityProgressionConfig: {
  upwardThreshold: number;
  consecutiveRequired: number;
  downwardThreshold: number;
  updatedBy: string;
  updatedAt: Date;
} = {
  upwardThreshold: 80,
  consecutiveRequired: 2,
  downwardThreshold: 50,
  updatedBy: 'SYSTEM_DEFAULT',
  updatedAt: new Date(),
};

export const setInMemoryClarityProgressionConfig = (
  config: Partial<typeof inMemoryClarityProgressionConfig>
) => {
  Object.assign(inMemoryClarityProgressionConfig, config, { updatedAt: new Date() });
};

export const ClarityProgressionConfigSchema = new Schema<IClarityProgressionConfig>(
  {
    upwardThreshold: {
      type: Number,
      required: true,
      default: 80,
      min: 50,
      max: 100,
    },
    consecutiveRequired: {
      type: Number,
      required: true,
      default: 2,
      min: 1,
      max: 10,
    },
    downwardThreshold: {
      type: Number,
      required: true,
      default: 50,
      min: 0,
      max: 100,
    },
    updatedBy: {
      type: String,
      default: 'SYSTEM_DEFAULT',
      trim: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const ClarityProgressionConfig =
  mongoose.models.ClarityProgressionConfig ||
  mongoose.model<IClarityProgressionConfig>(
    'ClarityProgressionConfig',
    ClarityProgressionConfigSchema
  );
