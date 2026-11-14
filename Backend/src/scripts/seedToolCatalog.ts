/**
 * seedToolCatalog.ts
 * ==========================================
 * Idempotent bootstrap script for PostgreSQL.
 * Upserts all seed tools from SEED_TOOL_CATALOG into the PostgreSQL
 * "ai_tools" table via Prisma. Safe to run multiple times — will not duplicate.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/seedToolCatalog.ts
 *   (or via: npm run seed:tools)
 */

import { prisma, connectDatabase, disconnectDatabase, isDatabaseConnected } from '../config/prisma';
import { SEED_TOOL_CATALOG } from '../data/aiimsCatalog';
import { toJsonInput } from '../utils/userMapper';

async function seedToolCatalog(): Promise<void> {
  console.log('🌱  Connecting to PostgreSQL...');
  const conn = await connectDatabase(3, 1000);
  if (!conn.connected) {
    console.warn('⚠️  PostgreSQL is not reachable. Skipping live seed.');
    process.exit(0);
  }
  console.log(`✅  PostgreSQL connected (${conn.databaseName || 'aiims'})`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const tool of SEED_TOOL_CATALOG) {
    try {
      const existing = await prisma.aiTool.findUnique({ where: { id: tool.id } });

      if (!existing) {
        // New tool — insert
        await prisma.aiTool.create({
          data: {
            id: tool.id,
            name: tool.name,
            description: tool.description,
            category: tool.category,
            capabilities: tool.capabilities,
            useCases: tool.useCases,
            strengths: tool.strengths,
            limitations: tool.limitations,
            taskMappings: tool.taskMappings,
            websiteUrl: tool.websiteUrl,
            officialWebsite: tool.websiteUrl || 'https://aiims.edu',
            activeStatus: tool.activeStatus,
            iconName: tool.iconName,
            pricing: tool.pricing,
            provider: tool.provider,
            categories: tool.categories || [tool.category],
            relevantRoles: tool.relevantRoles || [],
            skillLevel: tool.skillLevel || 'Beginner',
            familiarityGuidance: toJsonInput(tool.familiarityGuidance || {}),
            pricingDetails: toJsonInput((tool as any).pricingDetails || { type: 'freemium' }),
            firstSeenAt: new Date().toISOString(),
            lastVerifiedAt: new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString(),
            relatedTools: tool.relatedTools || [],
            alternatives: tool.alternatives || [],
            radarTopics: tool.radarTopics || [],
            clarityTopics: tool.clarityTopics || [],
            focusTracks: tool.focusTracks || [],
          },
        });
        console.log(`  ✨  Created: ${tool.id} — ${tool.name}`);
        created++;
      } else {
        // Tool already exists — update only non-overridden fields
        await prisma.aiTool.update({
          where: { id: tool.id },
          data: {
            name: tool.name,
            description: tool.description,
            category: tool.category,
            websiteUrl: tool.websiteUrl,
            iconName: tool.iconName,
            provider: tool.provider,
          },
        });
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

  await disconnectDatabase();
  console.log('🔌  Disconnected from PostgreSQL');
}

seedToolCatalog().catch((err) => {
  console.error('❌  Seed script crashed:', err);
  process.exit(1);
});
