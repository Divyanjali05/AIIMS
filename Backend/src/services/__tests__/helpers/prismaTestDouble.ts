/**
 * prismaTestDouble.ts
 * =========================================================
 * In-memory PostgreSQL/Prisma test double for offline Vitest suites.
 *
 * Replaces only the test-time persistence driver on the singleton `prisma`
 * object exported by `src/config/prisma.ts`, allowing production code to
 * remain strictly PostgreSQL-only with zero runtime memory fallbacks.
 */

import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma, setDatabaseConnected } from '../../../config/prisma';
import {
  defaultAssessment,
  defaultAnalysis,
  defaultClarity,
  defaultFocus,
  defaultRadar,
  defaultInvestigation,
  defaultSolver,
  defaultBuild,
  defaultNotifications,
  defaultAiWallet,
} from '../../../utils/userMapper';
import { EXPECTED_PG_INDEXES } from '../../databaseIndex.service';

type Row = Record<string, unknown>;

interface ModelSpec {
  name: string;
  uniqueSingle: string[];
  uniqueCompound?: Record<string, string[]>;
  hasCreatedAt?: boolean;
  hasUpdatedAt?: boolean;
  defaults: () => Row;
}

const MODEL_SPECS: ModelSpec[] = [
  {
    name: 'user',
    uniqueSingle: ['id', 'email'],
    hasCreatedAt: true,
    hasUpdatedAt: true,
    defaults: () => ({
      role: 'learner',
      isActive: true,
      mustChangePassword: false,
      inviteToken: null,
      inviteTokenExpires: null,
      totpEncryptedSecret: null,
      totpEnabled: false,
      totpPendingSetup: false,
      totpBackupCodeHashes: [],
      totpFailedAttempts: 0,
      totpLockedUntil: null,
      deviceIdHash: '',
      deviceName: '',
      devicePlatform: 'web',
      deviceBoundAt: null,
      deviceLastSeenAt: null,
      activeSessionId: null,
      bindingStatus: 'UNBOUND',
      deviceResetAt: null,
      deviceResetBy: null,
      college: 'Engineering & Technology College',
      track: 'Student',
      targetGoal: 'Master AI Intelligence & Mentoring',
      stage: 'Knowing',
      xpPoints: 100,
      aiimsCredits: 500,
      assessmentStatus: 'not_started',
      assessmentData: defaultAssessment(),
      analysisData: defaultAnalysis(),
      clarityData: defaultClarity(),
      focusData: defaultFocus(),
      radarData: defaultRadar(),
      investigationData: defaultInvestigation(),
      solverData: defaultSolver(),
      buildData: defaultBuild(),
      relevanceData: { status: 'locked' },
      mentorData: { status: 'locked' },
      transactionsData: [],
      notificationsData: defaultNotifications(),
      aiWalletData: defaultAiWallet(),
    }),
  },
  {
    name: 'institute',
    uniqueSingle: ['id', 'code'],
    hasCreatedAt: true,
    hasUpdatedAt: true,
    defaults: () => ({
      shortName: null,
      city: null,
      state: null,
      country: 'India',
      type: 'COLLEGE',
      status: 'ACTIVE',
      requestedBy: null,
      verifiedAt: null,
    }),
  },
  {
    name: 'cohort',
    uniqueSingle: ['id'],
    uniqueCompound: {
      instituteId_stream_educationLevel_programId_specializationId_admissionYear_graduationYear: [
        'instituteId',
        'stream',
        'educationLevel',
        'programId',
        'specializationId',
        'admissionYear',
        'graduationYear',
      ],
    },
    hasCreatedAt: true,
    hasUpdatedAt: true,
    defaults: () => ({
      instituteId: null,
      instituteName: null,
      status: 'ACTIVE',
      studentCount: 0,
      assessmentVersion: 'v1.0',
    }),
  },
  {
    name: 'studentProfile',
    uniqueSingle: ['id', 'userId'],
    hasCreatedAt: true,
    hasUpdatedAt: true,
    defaults: () => ({
      displayName: null,
      track: 'Student',
      instituteId: null,
      instituteName: null,
      campusName: null,
      departmentName: null,
      cohortId: null,
      aiFamiliarity: null,
      aiUsageContexts: [],
      primaryGoal: null,
      isComplete: false,
    }),
  },
  {
    name: 'entrepreneurProfile',
    uniqueSingle: ['id', 'userId'],
    hasCreatedAt: true,
    hasUpdatedAt: true,
    defaults: () => ({
      ventureName: null,
      industry: 'Other / Interdisciplinary',
      problemStatement: null,
      ventureStage: 'exploring_idea',
      primaryGoal: null,
      skillsToDevelop: [],
      businessChallenges: [],
      preferredSupport: [],
      isComplete: true,
    }),
  },
  {
    name: 'creditLedger',
    uniqueSingle: ['id'],
    uniqueCompound: {
      userId_idempotencyKey: ['userId', 'idempotencyKey'],
    },
    hasCreatedAt: true,
    hasUpdatedAt: true,
    defaults: () => ({
      userId: null,
      category: 'REWARD',
      sourceId: null,
      idempotencyKey: null,
      status: 'COMPLETED',
      relatedTaskId: null,
      metadata: {},
    }),
  },
  {
    name: 'session',
    uniqueSingle: ['id', 'sessionId'],
    hasCreatedAt: true,
    hasUpdatedAt: false,
    defaults: () => ({
      deviceName: 'Unknown Device',
      platform: 'web',
      lastSeenAt: new Date(),
      revokedAt: null,
      status: 'ACTIVE',
    }),
  },
  {
    name: 'deviceResetAudit',
    uniqueSingle: ['id'],
    hasCreatedAt: false,
    hasUpdatedAt: false,
    defaults: () => ({
      targetUserId: null,
      adminUserId: null,
      previousDeviceIdHash: '',
      previousDeviceName: '',
      resetAt: new Date(),
    }),
  },
  {
    name: 'auditLog',
    uniqueSingle: ['id'],
    hasCreatedAt: false,
    hasUpdatedAt: false,
    defaults: () => ({
      actorName: null,
      target: null,
      targetType: null,
      time: new Date(),
      details: {},
    }),
  },
  {
    name: 'task',
    uniqueSingle: ['id', 'taskId'],
    hasCreatedAt: true,
    hasUpdatedAt: true,
    defaults: () => ({
      category: 'General AI',
      level: 1,
      isActive: true,
    }),
  },
  {
    name: 'submission',
    uniqueSingle: ['id'],
    hasCreatedAt: true,
    hasUpdatedAt: true,
    defaults: () => ({
      learnerName: null,
      learnerEmail: null,
      taskTitle: null,
      status: 'submitted',
      evaluatorId: null,
      evaluatorName: null,
      rubricScores: {},
      writtenFeedback: '',
      revisionCount: 0,
      statusHistory: [],
      submittedAt: new Date(),
      reviewedAt: null,
    }),
  },
  {
    name: 'focusSession',
    uniqueSingle: ['id', 'sessionId'],
    hasCreatedAt: true,
    hasUpdatedAt: true,
    defaults: () => ({
      trackTitle: 'AI Workflow Design',
      intention: '',
      sessionState: 'focusing',
      periodType: 'focus',
      status: 'in_progress',
      focusDurationMinutes: 25,
      breakDurationMinutes: 5,
      longBreakDurationMinutes: 15,
      longBreakInterval: 4,
      enableLongBreak: true,
      soundEnabled: true,
      totalPeriodSeconds: 1500,
      remainingSeconds: 1500,
      accumulatedFocusSeconds: 0,
      totalBreakSeconds: 0,
      completedCycles: 0,
      startedAt: new Date(),
      pausedAt: null,
      targetEndTime: null,
      completedAt: null,
    }),
  },
  {
    name: 'questionBank',
    uniqueSingle: ['id', 'questionId'],
    hasCreatedAt: true,
    hasUpdatedAt: true,
    defaults: () => ({
      track: 'General',
      hint: null,
      expectedCriteria: [],
      scoringRubric: [],
      source: 'Human',
      status: 'ACTIVE',
      version: 1,
      aiMetadata: null,
      createdBy: null,
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
    }),
  },
  {
    name: 'questionAssignment',
    uniqueSingle: ['id', 'assignmentId'],
    uniqueCompound: {
      learnerId_questionId: ['learnerId', 'questionId'],
    },
    hasCreatedAt: true,
    hasUpdatedAt: true,
    defaults: () => ({
      track: 'General',
      college: null,
      institutionId: null,
      cohortId: null,
      assignedAt: new Date(),
      completedAt: null,
      status: 'ASSIGNED',
    }),
  },
  {
    name: 'questionAttempt',
    uniqueSingle: ['id', 'attemptId'],
    hasCreatedAt: true,
    hasUpdatedAt: true,
    defaults: () => ({
      track: 'General',
      startedAt: new Date(),
      submittedAt: new Date(),
      score: 0,
      rubricFeedback: [],
      overallFeedback: '',
      evaluationStatus: 'EVALUATED',
      timeTakenSeconds: 0,
      creditTransactionId: null,
    }),
  },
  {
    name: 'institutionExclusionConfig',
    uniqueSingle: ['id', 'configKey'],
    hasCreatedAt: true,
    hasUpdatedAt: true,
    defaults: () => ({
      configKey: 'GLOBAL_EXCLUSION_POLICY',
      scope: 'college',
      exclusionDays: 30,
      updatedBy: null,
    }),
  },
  {
    name: 'clarityProgressionConfig',
    uniqueSingle: ['id', 'configKey'],
    hasCreatedAt: true,
    hasUpdatedAt: true,
    defaults: () => ({
      configKey: 'GLOBAL_PROGRESSION_CONFIG',
      upwardThreshold: 80,
      consecutiveRequired: 2,
      downwardThreshold: 50,
      updatedBy: 'SYSTEM_DEFAULT',
    }),
  },
  {
    name: 'learnerClarityProgression',
    uniqueSingle: ['id'],
    uniqueCompound: {
      learnerId_topic: ['learnerId', 'topic'],
    },
    hasCreatedAt: true,
    hasUpdatedAt: true,
    defaults: () => ({
      currentLevel: 'Easy',
      consecutiveHighScores: 0,
      totalAttempts: 0,
      lastScore: null,
      history: [],
    }),
  },
  {
    name: 'aiTool',
    uniqueSingle: ['id'],
    hasCreatedAt: true,
    hasUpdatedAt: true,
    defaults: () => ({
      shortDescription: null,
      websiteUrl: null,
      categories: [],
      domains: [],
      subdomains: [],
      capabilities: [],
      useCases: [],
      tasks: [],
      targetUsers: [],
      inputTypes: [],
      outputTypes: [],
      supportedPlatforms: [],
      supportedLanguages: [],
      strengths: [],
      limitations: [],
      modelInformation: null,
      versionInformation: null,
      pricing: null,
      learningTrack: [],
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      evidenceCoverage: 0,
      sourceUrls: [],
      tags: [],
      iconName: null,
      activeStatus: true,
      taskMappings: [],
      relevantRoles: [],
      skillLevel: null,
      relatedTools: [],
      alternatives: [],
      radarTopics: [],
      clarityTopics: [],
      focusTracks: [],
      familiarityGuidance: null,
    }),
  },
  {
    name: 'toolEvidence',
    uniqueSingle: ['id'],
    hasCreatedAt: true,
    hasUpdatedAt: true,
    defaults: () => ({
      sourceName: null,
      title: null,
      evidenceText: null,
      credibility: 'MEDIUM',
      discoveredAt: new Date(),
      fetchedAt: new Date(),
      confidence: 0.9,
      verificationStatus: 'PENDING',
      structuredData: null,
    }),
  },
  {
    name: 'toolVersionHistory',
    uniqueSingle: ['id'],
    hasCreatedAt: true,
    hasUpdatedAt: true,
    defaults: () => ({
      version: '1.0',
      changeSummary: null,
      previousValue: null,
      newValue: null,
      previousData: null,
      newData: null,
      sourceUrl: null,
      sourceUrls: [],
      recordedBy: null,
    }),
  },
  {
    name: 'toolDiscoveryRun',
    uniqueSingle: ['id'],
    hasCreatedAt: true,
    hasUpdatedAt: true,
    defaults: () => ({
      startedAt: new Date(),
      completedAt: null,
      status: 'RUNNING',
      source: 'MANUAL_SEED',
      discoveredCount: 0,
      newToolsCount: 0,
      updatedToolsCount: 0,
      duplicateCount: 0,
      rejectedCount: 0,
      errorCount: 0,
      runErrors: [],
    }),
  },
];

const tables = new Map<string, Row[]>();
const originals = new Map<string, unknown>();
let installed = false;

for (const spec of MODEL_SPECS) {
  tables.set(spec.name, []);
}

function makePrismaError(code: string, message: string): Error & { code: string } {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

function cloneRow<T>(value: T): T {
  return structuredClone(value);
}

function sanitizeIncomingValue(val: unknown): unknown {
  if (val === Prisma.DbNull || val === Prisma.JsonNull || val === Prisma.AnyNull) {
    return null;
  }
  return val;
}

function normalizeComparable(val: unknown): unknown {
  if (val instanceof Date) return val.getTime();
  return val;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if ((a === null || a === undefined) && (b === null || b === undefined)) return true;
  if (a instanceof Date || b instanceof Date) {
    const tA = a instanceof Date ? a.getTime() : typeof a === 'string' ? Date.parse(a) : NaN;
    const tB = b instanceof Date ? b.getTime() : typeof b === 'string' ? Date.parse(b) : NaN;
    return !Number.isNaN(tA) && !Number.isNaN(tB) && tA === tB;
  }
  return false;
}

function matchesFieldCondition(rowVal: unknown, cond: unknown): boolean {
  if (cond === undefined) return true;
  if (cond === null || typeof cond !== 'object' || Array.isArray(cond) || cond instanceof Date) {
    return valuesEqual(rowVal, cond);
  }

  const ops = cond as Record<string, unknown>;
  const modeInsensitive = ops.mode === 'insensitive';

  if ('equals' in ops && !valuesEqual(rowVal, ops.equals)) {
    return false;
  }
  if ('not' in ops) {
    const notVal = ops.not;
    if (
      notVal !== null &&
      typeof notVal === 'object' &&
      !(notVal instanceof Date) &&
      !Array.isArray(notVal)
    ) {
      if (matchesFieldCondition(rowVal, notVal)) return false;
    } else if (valuesEqual(rowVal, notVal)) {
      return false;
    }
  }
  if ('in' in ops && Array.isArray(ops.in)) {
    if (!ops.in.some((item) => valuesEqual(rowVal, item))) return false;
  }
  if ('notIn' in ops && Array.isArray(ops.notIn)) {
    if (ops.notIn.some((item) => valuesEqual(rowVal, item))) return false;
  }

  const cmpVal = normalizeComparable(rowVal);
  if ('gt' in ops && ops.gt !== undefined) {
    const target = normalizeComparable(ops.gt);
    if (
      cmpVal === null ||
      cmpVal === undefined ||
      !(Number(cmpVal) > Number(target) || String(cmpVal) > String(target))
    ) {
      if (typeof cmpVal === 'number' && typeof target === 'number') {
        if (!(cmpVal > target)) return false;
      } else {
        return false;
      }
    }
    if (typeof cmpVal === 'number' && typeof target === 'number' && !(cmpVal > target)) {
      return false;
    }
  }
  if ('gte' in ops && ops.gte !== undefined) {
    const target = normalizeComparable(ops.gte);
    if (typeof cmpVal === 'number' && typeof target === 'number') {
      if (!(cmpVal >= target)) return false;
    } else if (String(cmpVal ?? '') < String(target)) {
      return false;
    }
  }
  if ('lt' in ops && ops.lt !== undefined) {
    const target = normalizeComparable(ops.lt);
    if (typeof cmpVal === 'number' && typeof target === 'number') {
      if (!(cmpVal < target)) return false;
    } else if (String(cmpVal ?? '') >= String(target)) {
      return false;
    }
  }
  if ('lte' in ops && ops.lte !== undefined) {
    const target = normalizeComparable(ops.lte);
    if (typeof cmpVal === 'number' && typeof target === 'number') {
      if (!(cmpVal <= target)) return false;
    } else if (String(cmpVal ?? '') > String(target)) {
      return false;
    }
  }

  if ('contains' in ops && typeof ops.contains === 'string') {
    if (typeof rowVal !== 'string') return false;
    const hay = modeInsensitive ? rowVal.toLowerCase() : rowVal;
    const needle = modeInsensitive ? ops.contains.toLowerCase() : ops.contains;
    if (!hay.includes(needle)) return false;
  }
  if ('startsWith' in ops && typeof ops.startsWith === 'string') {
    if (typeof rowVal !== 'string') return false;
    const hay = modeInsensitive ? rowVal.toLowerCase() : rowVal;
    const needle = modeInsensitive ? ops.startsWith.toLowerCase() : ops.startsWith;
    if (!hay.startsWith(needle)) return false;
  }
  if ('endsWith' in ops && typeof ops.endsWith === 'string') {
    if (typeof rowVal !== 'string') return false;
    const hay = modeInsensitive ? rowVal.toLowerCase() : rowVal;
    const needle = modeInsensitive ? ops.endsWith.toLowerCase() : ops.endsWith;
    if (!hay.endsWith(needle)) return false;
  }

  if ('has' in ops) {
    if (!Array.isArray(rowVal) || !rowVal.some((v) => valuesEqual(v, ops.has))) return false;
  }
  if ('hasSome' in ops && Array.isArray(ops.hasSome)) {
    if (
      !Array.isArray(rowVal) ||
      !ops.hasSome.some((target) => rowVal.some((v) => valuesEqual(v, target)))
    ) {
      return false;
    }
  }
  if ('hasEvery' in ops && Array.isArray(ops.hasEvery)) {
    if (
      !Array.isArray(rowVal) ||
      !ops.hasEvery.every((target) => rowVal.some((v) => valuesEqual(v, target)))
    ) {
      return false;
    }
  }
  if ('isEmpty' in ops && typeof ops.isEmpty === 'boolean') {
    const empty = !Array.isArray(rowVal) || rowVal.length === 0;
    if (empty !== ops.isEmpty) return false;
  }

  return true;
}

function matchesWhere(spec: ModelSpec, row: Row, where?: Row): boolean {
  if (!where) return true;

  for (const [key, cond] of Object.entries(where)) {
    if (cond === undefined) continue;

    if (key === 'AND') {
      const list = Array.isArray(cond) ? (cond as Row[]) : [cond as Row];
      if (!list.every((sub) => matchesWhere(spec, row, sub))) return false;
      continue;
    }
    if (key === 'OR') {
      const list = Array.isArray(cond) ? (cond as Row[]) : [cond as Row];
      if (!list.some((sub) => matchesWhere(spec, row, sub))) return false;
      continue;
    }
    if (key === 'NOT') {
      const list = Array.isArray(cond) ? (cond as Row[]) : [cond as Row];
      if (list.some((sub) => matchesWhere(spec, row, sub))) return false;
      continue;
    }

    if (spec.uniqueCompound && key in spec.uniqueCompound) {
      const subWhere = cond as Row;
      const fields = spec.uniqueCompound[key];
      for (const field of fields) {
        if (!valuesEqual(row[field], subWhere[field])) {
          return false;
        }
      }
      continue;
    }

    if (!matchesFieldCondition(row[key], cond)) {
      return false;
    }
  }

  return true;
}

function compareValuesDescOrAsc(a: unknown, b: unknown, dir: 'asc' | 'desc'): number {
  const factor = dir === 'desc' ? -1 : 1;
  if (a == null && b == null) return 0;
  if (a == null) return 1 * factor;
  if (b == null) return -1 * factor;
  const nA = normalizeComparable(a);
  const nB = normalizeComparable(b);
  if (typeof nA === 'number' && typeof nB === 'number') {
    return (nA - nB) * factor;
  }
  return String(nA).localeCompare(String(nB)) * factor;
}

function applyOrderBy(rows: Row[], orderBy?: Row | Row[]): Row[] {
  if (!orderBy) return rows;
  const specs = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((a, b) => {
    for (const spec of specs) {
      for (const [field, dirVal] of Object.entries(spec)) {
        const dir: 'asc' | 'desc' = dirVal === 'desc' ? 'desc' : 'asc';
        const cmp = compareValuesDescOrAsc(a[field], b[field], dir);
        if (cmp !== 0) return cmp;
      }
    }
    return 0;
  });
}

function applySelect(row: Row, select?: Record<string, boolean>): Row {
  if (!select) return cloneRow(row);
  const out: Row = {};
  for (const [key, include] of Object.entries(select)) {
    if (include) {
      out[key] = cloneRow(row[key]);
    }
  }
  return out;
}

function checkUniqueConstraints(
  spec: ModelSpec,
  existingRows: Row[],
  candidate: Row,
  ignoreIndex?: number
): void {
  for (let i = 0; i < existingRows.length; i++) {
    if (i === ignoreIndex) continue;
    const other = existingRows[i];

    for (const field of spec.uniqueSingle) {
      const cVal = candidate[field];
      const oVal = other[field];
      if (cVal !== null && cVal !== undefined && oVal !== null && oVal !== undefined) {
        if (valuesEqual(cVal, oVal)) {
          throw makePrismaError('P2002', `Unique constraint failed on the fields: (\`${field}\`)`);
        }
      }
    }

    if (spec.uniqueCompound) {
      for (const [constraintName, fields] of Object.entries(spec.uniqueCompound)) {
        const allNonNull = fields.every(
          (f) =>
            candidate[f] !== null &&
            candidate[f] !== undefined &&
            other[f] !== null &&
            other[f] !== undefined
        );
        if (allNonNull && fields.every((f) => valuesEqual(candidate[f], other[f]))) {
          throw makePrismaError(
            'P2002',
            `Unique constraint failed on the constraint: \`${constraintName}\``
          );
        }
      }
    }
  }
}

function buildRowForCreate(spec: ModelSpec, data: Row): Row {
  const now = new Date();
  const base: Row = {
    id: crypto.randomUUID(),
    ...spec.defaults(),
    ...(spec.hasCreatedAt ? { createdAt: now } : {}),
    ...(spec.hasUpdatedAt ? { updatedAt: now } : {}),
  };

  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      base[k] = cloneRow(sanitizeIncomingValue(v));
    }
  }

  return base;
}

function applyUpdateData(spec: ModelSpec, row: Row, data: Row): Row {
  const updated: Row = cloneRow(row);

  for (const [k, rawVal] of Object.entries(data)) {
    if (rawVal === undefined) continue;
    const val = sanitizeIncomingValue(rawVal);

    if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      const opObj = val as Record<string, unknown>;
      if ('increment' in opObj && typeof opObj.increment === 'number') {
        const prev = typeof updated[k] === 'number' ? (updated[k] as number) : 0;
        updated[k] = prev + opObj.increment;
        continue;
      }
      if ('decrement' in opObj && typeof opObj.decrement === 'number') {
        const prev = typeof updated[k] === 'number' ? (updated[k] as number) : 0;
        updated[k] = prev - opObj.decrement;
        continue;
      }
      if ('multiply' in opObj && typeof opObj.multiply === 'number') {
        const prev = typeof updated[k] === 'number' ? (updated[k] as number) : 0;
        updated[k] = prev * opObj.multiply;
        continue;
      }
      if ('set' in opObj) {
        updated[k] = cloneRow(sanitizeIncomingValue(opObj.set));
        continue;
      }
      if ('push' in opObj) {
        const current = Array.isArray(updated[k]) ? (updated[k] as unknown[]) : [];
        const add = Array.isArray(opObj.push) ? opObj.push : [opObj.push];
        updated[k] = [...current, ...cloneRow(add)];
        continue;
      }
    }

    updated[k] = cloneRow(val);
  }

  if (spec.hasUpdatedAt && !('updatedAt' in data)) {
    updated.updatedAt = new Date();
  }

  return updated;
}

interface TxLog {
  creates: Array<{ model: string; id: unknown }>;
  updates: Array<{ model: string; id: unknown; prev: Row }>;
  deletes: Array<{ model: string; row: Row; index: number }>;
}

function createModelDelegate(spec: ModelSpec, txLog?: TxLog) {
  const getRows = (): Row[] => tables.get(spec.name)!;

  return {
    async findUnique(args: { where: Row; select?: Record<string, boolean> }) {
      const match = getRows().find((r) => matchesWhere(spec, r, args?.where));
      return match ? applySelect(match, args?.select) : null;
    },

    async findUniqueOrThrow(args: { where: Row; select?: Record<string, boolean> }) {
      const match = getRows().find((r) => matchesWhere(spec, r, args?.where));
      if (!match) {
        throw makePrismaError(
          'P2025',
          `An operation failed because it depends on one or more records that were required but not found.`
        );
      }
      return applySelect(match, args?.select);
    },

    async findFirst(args?: {
      where?: Row;
      orderBy?: Row | Row[];
      skip?: number;
      select?: Record<string, boolean>;
    }) {
      let matches = getRows().filter((r) => matchesWhere(spec, r, args?.where));
      matches = applyOrderBy(matches, args?.orderBy);
      if (args?.skip) matches = matches.slice(args.skip);
      const first = matches[0];
      return first ? applySelect(first, args?.select) : null;
    },

    async findFirstOrThrow(args?: {
      where?: Row;
      orderBy?: Row | Row[];
      skip?: number;
      select?: Record<string, boolean>;
    }) {
      const found = await this.findFirst(args);
      if (!found) {
        throw makePrismaError('P2025', `No ${spec.name} record found.`);
      }
      return found;
    },

    async findMany(args?: {
      where?: Row;
      orderBy?: Row | Row[];
      skip?: number;
      take?: number;
      select?: Record<string, boolean>;
      distinct?: string[];
    }) {
      let matches = getRows().filter((r) => matchesWhere(spec, r, args?.where));
      matches = applyOrderBy(matches, args?.orderBy);
      if (args?.distinct && args.distinct.length > 0) {
        const seen = new Set<string>();
        matches = matches.filter((r) => {
          const sig = args.distinct!.map((d) => String(r[d])).join('::');
          if (seen.has(sig)) return false;
          seen.add(sig);
          return true;
        });
      }
      const skip = args?.skip ?? 0;
      const take = args?.take;
      matches = take !== undefined ? matches.slice(skip, skip + take) : matches.slice(skip);
      return matches.map((r) => applySelect(r, args?.select));
    },

    async count(args?: { where?: Row }) {
      return getRows().filter((r) => matchesWhere(spec, r, args?.where)).length;
    },

    async create(args: { data: Row; select?: Record<string, boolean> }) {
      const rows = getRows();
      const row = buildRowForCreate(spec, args.data || {});
      checkUniqueConstraints(spec, rows, row);
      rows.push(row);
      if (txLog) {
        txLog.creates.push({ model: spec.name, id: row.id });
      }
      return applySelect(row, args?.select);
    },

    async createMany(args: { data: Row[]; skipDuplicates?: boolean }) {
      const rows = getRows();
      let inserted = 0;
      for (const item of args.data || []) {
        const row = buildRowForCreate(spec, item);
        try {
          checkUniqueConstraints(spec, rows, row);
          rows.push(row);
          if (txLog) {
            txLog.creates.push({ model: spec.name, id: row.id });
          }
          inserted++;
        } catch (err: unknown) {
          if (
            args.skipDuplicates &&
            err &&
            typeof err === 'object' &&
            'code' in err &&
            (err as { code: string }).code === 'P2002'
          ) {
            continue;
          }
          throw err;
        }
      }
      return { count: inserted };
    },

    async update(args: { where: Row; data: Row; select?: Record<string, boolean> }) {
      const rows = getRows();
      const idx = rows.findIndex((r) => matchesWhere(spec, r, args.where));
      if (idx === -1) {
        throw makePrismaError('P2025', `Record to update not found in ${spec.name}.`);
      }
      const prev = cloneRow(rows[idx]);
      const updated = applyUpdateData(spec, rows[idx], args.data || {});
      checkUniqueConstraints(spec, rows, updated, idx);
      if (txLog) {
        txLog.updates.push({ model: spec.name, id: rows[idx].id, prev });
      }
      rows[idx] = updated;
      return applySelect(updated, args?.select);
    },

    async updateMany(args: { where?: Row; data: Row }) {
      const rows = getRows();
      let count = 0;
      for (let i = 0; i < rows.length; i++) {
        if (matchesWhere(spec, rows[i], args.where)) {
          const prev = cloneRow(rows[i]);
          const updated = applyUpdateData(spec, rows[i], args.data || {});
          checkUniqueConstraints(spec, rows, updated, i);
          if (txLog) {
            txLog.updates.push({ model: spec.name, id: rows[i].id, prev });
          }
          rows[i] = updated;
          count++;
        }
      }
      return { count };
    },

    async upsert(args: { where: Row; create: Row; update: Row; select?: Record<string, boolean> }) {
      const rows = getRows();
      const idx = rows.findIndex((r) => matchesWhere(spec, r, args.where));
      if (idx !== -1) {
        const prev = cloneRow(rows[idx]);
        const updated = applyUpdateData(spec, rows[idx], args.update || {});
        checkUniqueConstraints(spec, rows, updated, idx);
        if (txLog) {
          txLog.updates.push({ model: spec.name, id: rows[idx].id, prev });
        }
        rows[idx] = updated;
        return applySelect(updated, args?.select);
      }
      const created = buildRowForCreate(spec, args.create || {});
      checkUniqueConstraints(spec, rows, created);
      rows.push(created);
      if (txLog) {
        txLog.creates.push({ model: spec.name, id: created.id });
      }
      return applySelect(created, args?.select);
    },

    async delete(args: { where: Row; select?: Record<string, boolean> }) {
      const rows = getRows();
      const idx = rows.findIndex((r) => matchesWhere(spec, r, args.where));
      if (idx === -1) {
        throw makePrismaError('P2025', `Record to delete not found in ${spec.name}.`);
      }
      const [removed] = rows.splice(idx, 1);
      if (txLog) {
        txLog.deletes.push({ model: spec.name, row: cloneRow(removed), index: idx });
      }
      return applySelect(removed, args?.select);
    },

    async deleteMany(args?: { where?: Row }) {
      const rows = getRows();
      if (!args?.where) {
        const count = rows.length;
        if (txLog) {
          for (let i = 0; i < rows.length; i++) {
            txLog.deletes.push({ model: spec.name, row: cloneRow(rows[i]), index: i });
          }
        }
        rows.length = 0;
        return { count };
      }
      const remaining: Row[] = [];
      let count = 0;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (matchesWhere(spec, r, args.where)) {
          if (txLog) {
            txLog.deletes.push({ model: spec.name, row: cloneRow(r), index: i });
          }
          count++;
        } else {
          remaining.push(r);
        }
      }
      tables.set(spec.name, remaining);
      return { count };
    },
  };
}

function snapshotTables(): Map<string, Row[]> {
  const snap = new Map<string, Row[]>();
  for (const [k, v] of tables.entries()) {
    snap.set(k, cloneRow(v));
  }
  return snap;
}

function restoreTables(snap: Map<string, Row[]>): void {
  tables.clear();
  for (const [k, v] of snap.entries()) {
    tables.set(k, v);
  }
}

let txQueue: Promise<unknown> = Promise.resolve();

export function installPrismaTestDouble(options: { connected?: boolean } = {}): void {
  const target = prisma as unknown as Record<string, unknown>;

  if (!installed) {
    for (const spec of MODEL_SPECS) {
      originals.set(spec.name, target[spec.name]);
    }
    originals.set('$connect', target.$connect);
    originals.set('$disconnect', target.$disconnect);
    originals.set('$queryRaw', target.$queryRaw);
    originals.set('$executeRaw', target.$executeRaw);
    originals.set('$transaction', target.$transaction);
    installed = true;
  }

  for (const spec of MODEL_SPECS) {
    target[spec.name] = createModelDelegate(spec);
  }

  target.$connect = async () => {};
  target.$disconnect = async () => {};

  target.$queryRaw = async (strings: TemplateStringsArray | string) => {
    const sqlText = Array.isArray(strings) ? strings.join(' ') : String(strings);
    if (sqlText.includes('pg_indexes')) {
      const indexRows: Array<{ tablename: string; indexname: string }> = [];
      for (const spec of EXPECTED_PG_INDEXES) {
        for (const indexname of spec.expectedIndexes) {
          indexRows.push({ tablename: spec.tableName, indexname });
        }
      }
      return indexRows;
    }
    if (sqlText.includes('current_database')) {
      return [{ db: 'aiims_vitest' }];
    }
    return [{ '?column?': 1 }];
  };

  target.$executeRaw = async () => 1;

  target.$transaction = async (arg: unknown) => {
    if (typeof arg === 'function') {
      const runInTx = async () => {
        const txLog: TxLog = { creates: [], updates: [], deletes: [] };
        const txClient: Record<string, unknown> = {};
        for (const spec of MODEL_SPECS) {
          txClient[spec.name] = createModelDelegate(spec, txLog);
        }
        txClient.$queryRaw = target.$queryRaw;
        txClient.$executeRaw = target.$executeRaw;
        txClient.$transaction = target.$transaction;

        try {
          const fn = arg as (tx: unknown) => Promise<unknown>;
          return await fn(txClient);
        } catch (err) {
          for (let i = txLog.updates.length - 1; i >= 0; i--) {
            const entry = txLog.updates[i];
            const rows = tables.get(entry.model);
            if (rows) {
              const idx = rows.findIndex((r) => r.id === entry.id);
              if (idx !== -1) {
                rows[idx] = entry.prev;
              }
            }
          }
          for (let i = txLog.creates.length - 1; i >= 0; i--) {
            const entry = txLog.creates[i];
            const rows = tables.get(entry.model);
            if (rows) {
              const idx = rows.findIndex((r) => r.id === entry.id);
              if (idx !== -1) {
                rows.splice(idx, 1);
              }
            }
          }
          for (let i = txLog.deletes.length - 1; i >= 0; i--) {
            const entry = txLog.deletes[i];
            const rows = tables.get(entry.model);
            if (rows) {
              const insertIdx = Math.min(entry.index, rows.length);
              rows.splice(insertIdx, 0, entry.row);
            }
          }
          throw err;
        }
      };

      const next = txQueue.then(runInTx, runInTx);
      txQueue = next.then(
        () => {},
        () => {}
      );
      return await next;
    }
    if (Array.isArray(arg)) {
      return await Promise.all(arg);
    }
    throw new Error('Unsupported $transaction argument in prismaTestDouble');
  };

  setDatabaseConnected(options.connected ?? true);
}

export function resetPrismaTestDouble(connected: boolean = true): void {
  txQueue = Promise.resolve();
  for (const spec of MODEL_SPECS) {
    tables.set(spec.name, []);
  }
  if (!installed) {
    installPrismaTestDouble({ connected });
  } else {
    setDatabaseConnected(connected);
  }
}

export function uninstallPrismaTestDouble(): void {
  if (!installed) return;
  txQueue = Promise.resolve();
  const target = prisma as unknown as Record<string, unknown>;
  for (const [k, orig] of originals.entries()) {
    target[k] = orig;
  }
  originals.clear();
  installed = false;
  setDatabaseConnected(false);
}
