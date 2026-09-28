

import mongoose, { Schema, Document } from 'mongoose';
import { AITool } from '../types';

export interface AIToolDocument extends Omit<AITool, 'id'>, Document {
  id: string;
}

const AIToolSchema = new Schema<AIToolDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    provider: { type: String, required: true, index: true },
    description: { type: String, required: true },
    shortDescription: { type: String },
    officialWebsite: { type: String, required: true },
    websiteUrl: { type: String },
    category: { type: String, required: true, index: true },
    categories: [{ type: String, index: true }],
    domains: [{ type: String, index: true }],
    subdomains: [{ type: String }],
    capabilities: [{ type: String }],
    useCases: [{ type: String }],
    tasks: [{ type: String, index: true }],
    targetUsers: [{ type: String }],
    inputTypes: [{ type: String }],
    outputTypes: [{ type: String }],
    supportedPlatforms: [{ type: String }],
    supportedLanguages: [{ type: String }],
    strengths: [{ type: String }],
    limitations: [{ type: String }],
    modelInformation: { type: String },
    versionInformation: { type: String },
    pricingDetails: {
      type: { type: String, required: true },
      summary: { type: String, required: true },
      freeTierAvailable: { type: Boolean, required: true },
      freeTrialAvailable: { type: Boolean, required: true },
      trialDurationDays: { type: Number },
      freeTierLimitations: { type: String },
      startingPriceMonthlyUsd: { type: Number },
      verified: { type: Boolean, required: true },
      lastVerifiedAt: { type: String }
    },
    pricing: { type: String },
    learningTrack: [
      {
        level: { type: Number, required: true },
        levelName: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        keyTopics: [{ type: String }],
        suggestedWorkflow: { type: String, required: true }
      }
    ],
    firstSeenAt: { type: String, required: true, index: true },
    lastVerifiedAt: { type: String, required: true, index: true },
    lastUpdatedAt: { type: String, required: true, index: true },
    status: { type: String, required: true, index: true },
    verificationStatus: { type: String, required: true, index: true },
    sourceUrls: [{ type: String }],
    tags: [{ type: String, index: true }],
    iconName: { type: String },
    activeStatus: { type: Boolean, default: true },
    taskMappings: [{ type: String }],
    relevantRoles: [{ type: String }],
    skillLevel: { type: String },
    relatedTools: [{ type: String }],
    alternatives: [{ type: String }],
    familiarityGuidance: { type: Object }
  },
  { timestamps: true }
);

AIToolSchema.index({ name: 'text', description: 'text', provider: 'text', capabilities: 'text', tasks: 'text' });

export const AIToolModel = mongoose.model<AIToolDocument>('AITool', AIToolSchema);
