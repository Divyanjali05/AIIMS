/**
 * Dynamic API Base URL resolution for Web and Android environments.
 * - In Web: defaults to '/api' (proxied by Vite or web server)
 * - In Android Emulator: configured to 'http://10.0.2.2:5001/api'
 * - On Physical Android Device: configured to 'http://<LAN-IP>:5001/api'
 * - Configurable via:
 *   1. localStorage 'aiims_api_base_url' (runtime override)
 *   2. import.meta.env.VITE_API_BASE_URL (.env configuration)
 *   3. Default fallback '/api'
 */
export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('aiims_api_base_url');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
  }
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return '/api';
};

const API_BASE = {
  toString() {
    return getApiBaseUrl();
  },
} as unknown as string;

import { Capacitor } from '@capacitor/core';

// In-memory token storage for native mobile platforms.
// Web clients use httpOnly cookies exclusively (no tokens stored in localStorage).
let mobileToken: string | null = null;

export const setAuthToken = (token: string | null): void => {
  mobileToken = token;
};

export const getAuthToken = (): string | null => {
  return mobileToken;
};

export const isMobileClient = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (isMobileClient()) {
    headers['X-Client'] = 'mobile';
  }
  return headers;
};

/**
 * Universal authenticated fetch:
 * - Always sends `credentials: 'include'` so httpOnly cookies are transmitted automatically on Web.
 * - Merges mobile Bearer token & X-Client header when on native mobile platforms.
 */
export const apiFetch = async (input: string, init: RequestInit = {}): Promise<Response> => {
  const authHeaders = getAuthHeaders();
  const mergedHeaders: Record<string, string> = {
    ...authHeaders,
    ...((init.headers as Record<string, string>) || {}),
  };

  return fetch(input, {
    credentials: 'include',
    ...init,
    headers: mergedHeaders,
  });
};

export const apiClient = {
  // Session & Authentication
  async getMe() {
    const res = await apiFetch(`${API_BASE}/auth/me`);
    return res.json();
  },

  async logout() {
    const res = await apiFetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
    });
    return res.json();
  },

  async deleteAccount(confirmation: string = 'DELETE') {
    const res = await apiFetch(`${API_BASE}/auth/account`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ confirmation }),
    });
    return res.json();
  },

  async getPublicConfig() {
    const res = await apiFetch(`${API_BASE}/config/public`);
    return res.json();
  },

  // 1. Learner State Full Sync (MongoDB Atlas)
  async getLearnerState() {
    const res = await apiFetch(`${API_BASE}/learner/state`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async syncLearnerState(state: unknown) {
    const res = await apiFetch(`${API_BASE}/learner/state`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ state }),
    });
    return res.json();
  },

  // 2. Profile Management
  async getProfile() {
    const res = await apiFetch(`${API_BASE}/users/profile`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async updateProfile(profileData: {
    name?: string;
    role?: string;
    college?: string;
    targetGoal?: string;
  }) {
    const res = await apiFetch(`${API_BASE}/users/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData),
    });
    return res.json();
  },

  // 3. Assessments & Diagnostics
  async getAssessmentQuestions() {
    const res = await apiFetch(`${API_BASE}/assessments/questions`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async submitAssessment(answers: Record<string, unknown>, scores?: Record<string, unknown>) {
    const res = await apiFetch(`${API_BASE}/assessments/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ answers, scores }),
    });
    return res.json();
  },

  async getPeerBenchmarks() {
    const res = await apiFetch(`${API_BASE}/analysis/peer-benchmarks`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // 4. Growth & Capability Analysis
  async getIndividualAnalysis() {
    const res = await apiFetch(`${API_BASE}/analysis/individual`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getComparativeAnalysis() {
    const res = await apiFetch(`${API_BASE}/analysis/comparative`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getOverallAnalysis() {
    const res = await apiFetch(`${API_BASE}/analysis/overall`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // 5. Credits & Transactions
  async getWallet() {
    const res = await apiFetch(`${API_BASE}/credits/wallet`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getCreditsLedger(params?: { type?: string; limit?: number; skip?: number }) {
    const queryEntries: [string, string][] = [];
    if (params?.type) queryEntries.push(['type', params.type]);
    if (params?.limit !== undefined) queryEntries.push(['limit', String(params.limit)]);
    if (params?.skip !== undefined) queryEntries.push(['skip', String(params.skip)]);
    const query = new URLSearchParams(queryEntries).toString();
    const res = await apiFetch(`${API_BASE}/credits/ledger${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getCreditsBalance() {
    const res = await apiFetch(`${API_BASE}/credits/balance`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getCreditsReconciliation() {
    const res = await apiFetch(`${API_BASE}/credits/reconcile`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async awardLevelCredits(levelId: number) {
    const res = await apiFetch(`${API_BASE}/credits/award-level`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ levelId }),
    });
    return res.json();
  },

  async investCredits(amount: number, description: string, idempotencyKey?: string) {
    const res = await apiFetch(`${API_BASE}/credits/invest`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount, description, idempotencyKey }),
    });
    return res.json();
  },

  // 6. Clarity & Mentor Overrides
  async getCapabilityGaps() {
    const res = await apiFetch(`${API_BASE}/clarity/gaps`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async submitMentorOverrideGap(gapId: string, mentorOverride: string) {
    const res = await apiFetch(`${API_BASE}/clarity/mentor-override`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ gapId, mentorOverride }),
    });
    return res.json();
  },

  // 7. Focus Tracks
  async getFocusAreas() {
    const res = await apiFetch(`${API_BASE}/focus/areas`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async submitMentorOverrideFocus(focusId: string, mentorOverride: string) {
    const res = await apiFetch(`${API_BASE}/focus/override`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ focusId, mentorOverride }),
    });
    return res.json();
  },

  // 8. Radar & Investigations
  async getRadarSignals() {
    const res = await apiFetch(`${API_BASE}/radar/signals`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async toggleFollowSignal(signalId: string) {
    const res = await apiFetch(`${API_BASE}/radar/follow`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ signalId }),
    });
    return res.json();
  },

  async submitInvestigation(signalId: string, personalInterpretation: string) {
    const res = await apiFetch(`${API_BASE}/investigations/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ signalId, personalInterpretation }),
    });
    return res.json();
  },

  async generateRelevance(signalId: string) {
    const res = await apiFetch(`${API_BASE}/relevance/generate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ signalId }),
    });
    return res.json();
  },

  // 9. AI Wallet Module APIs
  async getWalletCatalog(params?: {
    category?: string;
    domain?: string;
    status?: string;
    pricing?: string;
    search?: string;
  }) {
    const queryEntries: [string, string][] = [];
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null) queryEntries.push([key, String(val)]);
      }
    }
    const query = new URLSearchParams(queryEntries).toString();
    const res = await apiFetch(`${API_BASE}/wallet/catalog?${query}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async searchRequirement(query: string, userTools?: unknown[]) {
    const res = await apiFetch(`${API_BASE}/wallet/search`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ query, userTools }),
    });
    return res.json();
  },

  async getToolDetail(toolId: string) {
    const res = await apiFetch(`${API_BASE}/wallet/tools/${toolId}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getAIWalletUser() {
    const res = await apiFetch(`${API_BASE}/wallet/user`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getWalletRecommendations() {
    const res = await apiFetch(`${API_BASE}/wallet/recommendations`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async addToolToWallet(
    toolId: string,
    primaryCategory: string,
    familiarity?: string,
    userNotes?: string
  ) {
    const res = await apiFetch(`${API_BASE}/wallet/add`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ toolId, primaryCategory, familiarity, userNotes }),
    });
    return res.json();
  },

  async updateToolFamiliarity(toolId: string, familiarity: string, userNotes?: string) {
    const res = await apiFetch(`${API_BASE}/wallet/update-familiarity`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ toolId, familiarity, userNotes }),
    });
    return res.json();
  },

  async compareTools(toolAId: string, toolBId: string, task?: string) {
    const res = await apiFetch(`${API_BASE}/wallet/compare`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ toolAId, toolBId, task }),
    });
    return res.json();
  },

  async compareToolsForRequirement(toolIds: string[], userRequirement?: string) {
    const res = await apiFetch(`${API_BASE}/wallet/compare`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ toolIds, userRequirement }),
    });
    return res.json();
  },

  async getToolkitGaps() {
    const res = await apiFetch(`${API_BASE}/wallet/gaps`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async triggerDiscoveryJob() {
    const res = await apiFetch(`${API_BASE}/wallet/discover/trigger`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getDiscoveryStatus() {
    const res = await apiFetch(`${API_BASE}/wallet/discovery/status`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getToolEvidence(toolId: string) {
    const res = await apiFetch(`${API_BASE}/wallet/tools/${toolId}/evidence`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getToolHistory(toolId: string) {
    const res = await apiFetch(`${API_BASE}/wallet/tools/${toolId}/history`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getNewTools() {
    const res = await apiFetch(`${API_BASE}/wallet/tools/new`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getRecentlyUpdatedTools() {
    const res = await apiFetch(`${API_BASE}/wallet/tools/recently-updated`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getIntelligenceStatus() {
    const res = await apiFetch(`${API_BASE}/wallet/intelligence/status`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // 10. Academic Module
  async searchInstitutes(query: string, limit?: number) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (limit) params.set('limit', String(limit));
    const res = await apiFetch(`${API_BASE}/academic/institutes?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async requestInstitute(data: {
    name: string;
    city?: string;
    state?: string;
    country?: string;
    type?: string;
  }) {
    const res = await apiFetch(`${API_BASE}/academic/institutes/request`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getStudentProfile() {
    const res = await apiFetch(`${API_BASE}/student/profile`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async updateStudentProfile(data: {
    aiFamiliarity?: string;
    aiUsageContexts?: string[];
    primaryGoal?: string;
    displayName?: string;
  }) {
    const res = await apiFetch(`${API_BASE}/student/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // 11. Admin & Pipeline Observability APIs
  async getAdminSources() {
    const res = await apiFetch(`${API_BASE}/admin/sources`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async registerAdminSource(data: {
    id: string;
    name: string;
    type?: string;
    priority?: number;
    enabled?: boolean;
  }) {
    const res = await apiFetch(`${API_BASE}/admin/sources`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getAdminCandidates() {
    const res = await apiFetch(`${API_BASE}/admin/candidates`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async verifyAdminCandidate(
    toolId: string,
    data?: { acceptEvidenceId?: string; activate?: boolean }
  ) {
    const res = await apiFetch(`${API_BASE}/admin/verify/${toolId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data || {}),
    });
    return res.json();
  },

  async getAdminDashboard() {
    const res = await apiFetch(`${API_BASE}/admin/intelligence/dashboard`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // 12. Level 2 Clarity Interactive AI Tasks
  async generateClarityPrompt(params: {
    topic: string;
    difficulty: string;
    taskTitle: string;
    taskObjective: string;
    scenario: string;
  }) {
    const res = await apiFetch(`${API_BASE}/clarity/generate-prompt`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async runClarityTask(params: {
    topic: string;
    difficulty: string;
    taskTitle: string;
    taskObjective?: string;
    userPrompt: string;
    contextData?: string;
  }) {
    const res = await apiFetch(`${API_BASE}/clarity/run-task`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async saveClarityTaskScore(params: {
    topic: string;
    difficulty: string;
    taskId: string;
    score: number;
    userPrompt?: string;
    output?: string;
  }) {
    const res = await apiFetch(`${API_BASE}/clarity/save-task-score`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async suggestClarityReflection(params: { topic: string; taskTitle?: string; score?: number }) {
    const res = await apiFetch(`${API_BASE}/clarity/suggest-reflection`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    return res.json();
  },

  // 13. Task Submissions & Learner Review
  async submitTask(params: { taskId: string; taskTitle?: string; answerContent: string }) {
    const res = await apiFetch(`${API_BASE}/submissions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async getMySubmissions() {
    const res = await apiFetch(`${API_BASE}/submissions`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getSubmissionById(id: string) {
    const res = await apiFetch(`${API_BASE}/submissions/${id}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async resubmitTask(id: string, params: { answerContent: string; note?: string }) {
    const res = await apiFetch(`${API_BASE}/submissions/${id}/resubmit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    return res.json();
  },

  // 14. Evaluator Queue & Scoring
  async getEvaluationQueue() {
    const res = await apiFetch(`${API_BASE}/evaluator/queue`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async claimSubmission(id: string) {
    const res = await apiFetch(`${API_BASE}/evaluator/submissions/${id}/claim`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async submitReview(
    id: string,
    params: {
      rubricScores: Record<string, number>;
      writtenFeedback: string;
      decision: 'accepted' | 'revision_requested';
    }
  ) {
    const res = await apiFetch(`${API_BASE}/evaluator/submissions/${id}/review`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    return res.json();
  },

  // 15. Admin Management (Evaluators, Tasks, Reports, Audits)
  async createEvaluator(params: { name: string; email: string; password?: string }) {
    const res = await apiFetch(`${API_BASE}/admin/evaluators`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async updateEvaluatorStatus(id: string, isActive: boolean) {
    const res = await apiFetch(`${API_BASE}/admin/evaluators/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isActive }),
    });
    return res.json();
  },

  async getEvaluators() {
    const res = await apiFetch(`${API_BASE}/admin/evaluators`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getAdminTasks() {
    const res = await apiFetch(`${API_BASE}/admin/tasks`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async createAdminTask(params: {
    taskId: string;
    title: string;
    description: string;
    category?: string;
    level?: number;
  }) {
    const res = await apiFetch(`${API_BASE}/admin/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async updateAdminTask(
    id: string,
    params: {
      title?: string;
      description?: string;
      category?: string;
      level?: number;
      isActive?: boolean;
    }
  ) {
    const res = await apiFetch(`${API_BASE}/admin/tasks/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async deleteAdminTask(id: string) {
    const res = await apiFetch(`${API_BASE}/admin/tasks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getAdminSummaryReport() {
    const res = await apiFetch(`${API_BASE}/admin/reports/summary`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getAdminAuditLogs(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await apiFetch(`${API_BASE}/admin/audit-logs${qs}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // ── TOTP 2FA ────────────────────────────────────────────────────────────────

  /** Initiate 2FA setup for the currently authenticated staff user. Returns a QR code data URL. */
  async totpInitiateSetup() {
    const res = await apiFetch(`${API_BASE}/auth/totp/setup`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to initiate 2FA setup.');
    }
    return res.json() as Promise<{ qrCode: string; manualEntryKey: string; message: string }>;
  },

  /** Confirm the first TOTP code after scanning the QR. Returns one-time backup codes. */
  async totpVerifySetup(code: string) {
    const res = await apiFetch(`${API_BASE}/auth/totp/verify-setup`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Invalid code.');
    }
    return res.json() as Promise<{ success: boolean; backupCodes: string[] }>;
  },

  /** Complete the second factor of login (TOTP or backup code). */
  async totpVerifyLogin(userId: string, code: string, isBackupCode = false) {
    const res = await apiFetch(`${API_BASE}/auth/totp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, code, isBackupCode }),
    });
    return res.json();
  },
};
