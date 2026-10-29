/**
 * databaseIndex.service.ts
 * =========================================================
 * Production Deploy-Time Database Index Creation Service
 *
 * Ensures all query paths across AIIMS models have their MongoDB indexes
 * built explicitly on deploy before traffic hits the application.
 */

import mongoose from 'mongoose';
import { User } from '../models/User.model';
import { Submission } from '../models/Submission.model';
import { AuditLog } from '../models/AuditLog.model';
import { Task } from '../models/Task.model';
import { CreditLedger } from '../models/CreditLedger.model';
import { AIToolModel } from '../models/aiTool.model';
import { StudentProfile } from '../models/StudentProfile.model';
import { Cohort } from '../models/Cohort.model';
import { Institute } from '../models/Institute.model';
import { ToolDiscoveryRunModel } from '../models/ToolDiscoveryRun.model';
import { ToolEvidenceModel } from '../models/toolEvidence.model';
import { ToolVersionHistoryModel } from '../models/toolVersionHistory.model';
import { logger } from '../utils/logger';

export interface IndexSyncResult {
  modelName: string;
  success: boolean;
  error?: string;
}

/**
 * Creates and synchronizes all MongoDB indexes across the application's models.
 * Should be executed during deployment or backend initialization.
 */
export async function syncAllDatabaseIndexes(): Promise<IndexSyncResult[]> {
  if (mongoose.connection.readyState !== 1) {
    logger.warn('[DatabaseIndexService] MongoDB is not connected; skipping index creation.');
    return [];
  }

  const models: Array<{ name: string; model: mongoose.Model<any> }> = [
    { name: 'User', model: User },
    { name: 'Submission', model: Submission },
    { name: 'AuditLog', model: AuditLog },
    { name: 'Task', model: Task },
    { name: 'CreditLedger', model: CreditLedger },
    { name: 'AITool', model: AIToolModel },
    { name: 'StudentProfile', model: StudentProfile },
    { name: 'Cohort', model: Cohort },
    { name: 'Institute', model: Institute },
    { name: 'ToolDiscoveryRun', model: ToolDiscoveryRunModel },
    { name: 'ToolEvidence', model: ToolEvidenceModel },
    { name: 'ToolVersionHistory', model: ToolVersionHistoryModel },
  ];

  logger.info(`[DatabaseIndexService] Beginning index creation for ${models.length} models...`);

  const results: IndexSyncResult[] = [];

  for (const { name, model } of models) {
    try {
      await model.createIndexes();
      results.push({ modelName: name, success: true });
    } catch (err: any) {
      logger.error(`[DatabaseIndexService] Failed to create indexes for ${name}: ${err.message}`);
      results.push({ modelName: name, success: false, error: err.message });
    }
  }

  const successfulCount = results.filter((r) => r.success).length;
  logger.info(
    `[DatabaseIndexService] Index creation completed: ${successfulCount}/${models.length} models synchronized.`
  );

  return results;
}
