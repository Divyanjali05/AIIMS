import type { LearnerState, AppNotification } from '../context/LearnerContext';
import type {
  AudienceMode,
  ProgressionStage,
  SolvedWorkflow,
  UserProject,
  UserToolItem,
} from '../types';

export interface WritableProfilePayload {
  name?: string;
  college?: string;
  targetGoal?: string;
  stage?: ProgressionStage;
}

export interface WritableRadarPayload {
  savedSignalIds?: string[];
  dismissedSignalIds?: string[];
  lastViewedRadar?: string | null;
  radarProgress?: number;
}

export interface WritableInvestigationPayload {
  selectedSignalId?: string | null;
  userNotes?: Record<string, string>;
}

export interface WritableAIWalletPayload {
  userTools?: UserToolItem[];
  dismissedRecommendations?: string[];
  audienceMode?: AudienceMode;
}

export interface WritableSolverPayload {
  latestWorkflow?: SolvedWorkflow | null;
  history?: SolvedWorkflow[];
}

export interface WritableBuildPayload {
  projects?: UserProject[];
  activeProjectId?: string | null;
}

/**
 * Explicit allowlisted shape permitted for generic PUT /api/learner/state synchronization.
 * Strictly excludes all server-authoritative fields and slices:
 * - profile.role, profile.id, profile.email, profile.aiimsCredits, profile.xpPoints, profile.track
 * - credits, assessment, analysis, relevance, clarity, focus, academicProfile
 * - radar.status, radar.investigatedSignalIds, radar.followedSignalIds
 * - investigation.status
 */
export interface WritableLearnerStatePayload {
  profile?: WritableProfilePayload;
  radar?: WritableRadarPayload;
  investigation?: WritableInvestigationPayload;
  notifications?: AppNotification[];
  aiWallet?: WritableAIWalletPayload;
  solver?: WritableSolverPayload;
  build?: WritableBuildPayload;
}

export type LearnerStateSyncInput =
  | LearnerState
  | WritableLearnerStatePayload
  | (Partial<LearnerState> & Record<string, unknown>);

function cloneStringArray(items: unknown): string[] | undefined {
  if (!Array.isArray(items)) return undefined;
  return items.filter((item): item is string => typeof item === 'string');
}

function sanitizeUserTools(tools: unknown): UserToolItem[] | undefined {
  if (!Array.isArray(tools)) return undefined;
  return tools
    .filter((item): item is UserToolItem => Boolean(item && typeof item === 'object' && 'toolId' in item))
    .map((item) => ({
      toolId: String(item.toolId),
      addedAt: String(item.addedAt || ''),
      familiarity: item.familiarity,
      primaryCategory: item.primaryCategory,
      ...(typeof item.userNotes === 'string' ? { userNotes: item.userNotes } : {}),
      ...(Array.isArray(item.customTags)
        ? { customTags: item.customTags.filter((tag): tag is string => typeof tag === 'string') }
        : {}),
    }));
}

function sanitizeNotifications(items: unknown): AppNotification[] | undefined {
  if (!Array.isArray(items)) return undefined;
  return items
    .filter(
      (item): item is AppNotification =>
        Boolean(item && typeof item === 'object' && 'id' in item && 'title' in item)
    )
    .map((item) => ({
      id: String(item.id),
      title: String(item.title),
      message: String(item.message || ''),
      timestamp: String(item.timestamp || 'Just now'),
      targetTab: String(item.targetTab || 'home'),
      read: Boolean(item.read),
    }));
}

function sanitizeUserNotes(notes: unknown): Record<string, string> | undefined {
  if (!notes || typeof notes !== 'object' || Array.isArray(notes)) return undefined;
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(notes)) {
    if (typeof value === 'string') {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Pure, non-mutating payload builder that maps full LearnerState into the minimal
 * client-writable subset accepted by PUT /api/learner/state without triggering
 * backend privilege-escalation or anti-tampering guards.
 */
export function buildWritableLearnerStatePayload(
  state: LearnerStateSyncInput | null | undefined
): WritableLearnerStatePayload {
  const payload: WritableLearnerStatePayload = {};
  if (!state || typeof state !== 'object') {
    return payload;
  }

  // 1. Profile (explicit allowlist: name, college, targetGoal, stage ONLY)
  if (state.profile && typeof state.profile === 'object') {
    const profileOut: WritableProfilePayload = {};
    const profileIn = state.profile as unknown as Record<string, unknown>;

    if (typeof profileIn.name === 'string' && profileIn.name.trim().length > 0) {
      profileOut.name = profileIn.name;
    }
    if (typeof profileIn.college === 'string') {
      profileOut.college = profileIn.college;
    }
    if (typeof profileIn.targetGoal === 'string') {
      profileOut.targetGoal = profileIn.targetGoal;
    }
    if (typeof profileIn.stage === 'string' && profileIn.stage.trim().length > 0) {
      profileOut.stage = profileIn.stage as ProgressionStage;
    }

    if (Object.keys(profileOut).length > 0) {
      payload.profile = profileOut;
    }
  }

  // 2. Radar (client preference fields only; excludes status & investigatedSignalIds)
  if (state.radar && typeof state.radar === 'object') {
    const radarIn = state.radar as unknown as Record<string, unknown>;
    const radarOut: WritableRadarPayload = {};

    const saved = cloneStringArray(radarIn.savedSignalIds);
    if (saved !== undefined) radarOut.savedSignalIds = saved;

    const dismissed = cloneStringArray(radarIn.dismissedSignalIds);
    if (dismissed !== undefined) radarOut.dismissedSignalIds = dismissed;

    if (radarIn.lastViewedRadar === null || typeof radarIn.lastViewedRadar === 'string') {
      radarOut.lastViewedRadar = radarIn.lastViewedRadar;
    }

    if (typeof radarIn.radarProgress === 'number' && !Number.isNaN(radarIn.radarProgress)) {
      radarOut.radarProgress = radarIn.radarProgress;
    }

    if (Object.keys(radarOut).length > 0) {
      payload.radar = radarOut;
    }
  }

  // 3. Investigation (user notes & selection only; excludes server-gated status)
  if (state.investigation && typeof state.investigation === 'object') {
    const invIn = state.investigation as unknown as Record<string, unknown>;
    const invOut: WritableInvestigationPayload = {};

    if (invIn.selectedSignalId === null || typeof invIn.selectedSignalId === 'string') {
      invOut.selectedSignalId = invIn.selectedSignalId;
    }

    const notes = sanitizeUserNotes(invIn.userNotes);
    if (notes !== undefined) {
      invOut.userNotes = notes;
    }

    if (Object.keys(invOut).length > 0) {
      payload.investigation = invOut;
    }
  }

  // 4. Notifications
  const notificationsOut = sanitizeNotifications(state.notifications);
  if (notificationsOut !== undefined) {
    payload.notifications = notificationsOut;
  }

  // 5. AI Wallet (toolkit curation, dismissals, audience mode preference)
  if (state.aiWallet && typeof state.aiWallet === 'object') {
    const walletIn = state.aiWallet as unknown as Record<string, unknown>;
    const walletOut: WritableAIWalletPayload = {};

    const userTools = sanitizeUserTools(walletIn.userTools);
    if (userTools !== undefined) {
      walletOut.userTools = userTools;
    }

    const dismissedRecs = cloneStringArray(walletIn.dismissedRecommendations);
    if (dismissedRecs !== undefined) {
      walletOut.dismissedRecommendations = dismissedRecs;
    }

    if (walletIn.audienceMode === 'student' || walletIn.audienceMode === 'entrepreneur') {
      walletOut.audienceMode = walletIn.audienceMode;
    }

    if (Object.keys(walletOut).length > 0) {
      payload.aiWallet = walletOut;
    }
  }

  // 6. Problem Solver workspace state
  if (state.solver && typeof state.solver === 'object') {
    const solverIn = state.solver as unknown as Record<string, unknown>;
    const solverOut: WritableSolverPayload = {};

    if (solverIn.latestWorkflow === null) {
      solverOut.latestWorkflow = null;
    } else if (solverIn.latestWorkflow && typeof solverIn.latestWorkflow === 'object') {
      solverOut.latestWorkflow = { ...(solverIn.latestWorkflow as SolvedWorkflow) };
    }

    if (Array.isArray(solverIn.history)) {
      solverOut.history = (solverIn.history as SolvedWorkflow[]).map((wf) => ({ ...wf }));
    }

    if (Object.keys(solverOut).length > 0) {
      payload.solver = solverOut;
    }
  }

  // 7. Build workspace projects
  if (state.build && typeof state.build === 'object') {
    const buildIn = state.build as unknown as Record<string, unknown>;
    const buildOut: WritableBuildPayload = {};

    if (Array.isArray(buildIn.projects)) {
      buildOut.projects = (buildIn.projects as UserProject[]).map((proj) => ({
        ...proj,
        toolsUsed: Array.isArray(proj.toolsUsed) ? [...proj.toolsUsed] : [],
      }));
    }

    if (buildIn.activeProjectId === null || typeof buildIn.activeProjectId === 'string') {
      buildOut.activeProjectId = buildIn.activeProjectId;
    }

    if (Object.keys(buildOut).length > 0) {
      payload.build = buildOut;
    }
  }

  return payload;
}

