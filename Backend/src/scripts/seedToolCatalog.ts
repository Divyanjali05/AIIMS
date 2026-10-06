/**
 * seedToolCatalog.ts
 * ==========================================
 * Idempotent bootstrap script.
 * Upserts all 12 seed tools from mockToolCatalog into the MongoDB
 * AITool collection.  Safe to run multiple times — will not duplicate.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/seedToolCatalog.ts
 *   (or via: npm run seed:tools  — add this script to package.json)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { mockToolCatalog } from '../models/aiims.models';
import { AIToolModel } from '../models/AITool.model';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌  MONGO_URI is not set in environment. Aborting seed.');
  process.exit(1);
}

async function seedToolCatalog(): Promise<void> {
  console.log('🌱  Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI as string);
  console.log('✅  MongoDB connected');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const tool of mockToolCatalog) {
    try {
      const existing = await AIToolModel.findOne({ id: tool.id });

      if (!existing) {
        // New tool — insert
        await AIToolModel.create({
          id:           tool.id,
          name:         tool.name,
          description:  tool.description,
          category:     tool.category,
          capabilities: tool.capabilities,
          useCases:     tool.useCases,
          strengths:    tool.strengths,
          limitations:  tool.limitations,
          taskMappings: tool.taskMappings,
          websiteUrl:   tool.websiteUrl,
          activeStatus: tool.activeStatus,
          iconName:     tool.iconName,
          pricing:      tool.pricing,
          provider:     tool.provider,
          categories:   tool.categories,
          relevantRoles:       tool.relevantRoles,
          skillLevel:          tool.skillLevel,
          familiarityGuidance: tool.familiarityGuidance,
          relatedTools:        tool.relatedTools,
          alternatives:        tool.alternatives,
          radarTopics:         tool.radarTopics,
          clarityTopics:       tool.clarityTopics,
          focusTracks:         tool.focusTracks
        });
        console.log(`  ✨  Created: ${tool.id} — ${tool.name}`);
        created++;
      } else {
        // Tool already exists — update only non-overridden fields
        // (preserves any admin-made edits in production)
        await AIToolModel.updateOne(
          { id: tool.id },
          {
            $setOnInsert: { id: tool.id },  // no-op on existing docs
            $set: {
              // Always keep these in sync from seed data
              name:        tool.name,
              description: tool.description,
              category:    tool.category,
              websiteUrl:  tool.websiteUrl,
              iconName:    tool.iconName,
              provider:    tool.provider
              // NOTE: Do NOT overwrite activeStatus, capabilities, pricing
              // so admins can freely customise those in production.
            }
          }
        );
        console.log(`  ↩️   Synced: ${tool.id} — ${tool.name}`);
        updated++;
      }
    } catch (err: any) {
      console.error(`  ❌  Failed to seed ${tool.id}:`, err.message);
      skipped++;
    }
  }

  console.log('\n─────────────────────────────────');
  console.log(`✅  Seed complete`);
  console.log(`   Created : ${created}`);
  console.log(`   Synced  : ${updated}`);
  console.log(`   Errors  : ${skipped}`);
  console.log('─────────────────────────────────');

  await mongoose.disconnect();
  console.log('🔌  Disconnected from MongoDB');
}

seedToolCatalog().catch((err) => {
  console.error('❌  Seed script crashed:', err);
  process.exit(1);
});
