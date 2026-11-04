import { Capacitor } from '@capacitor/core';
import { getDeviceHeaders } from '../utils/deviceIdentifier';

/**
 * Dynamic API Base URL resolution for Web and Android environments.
 * - In Web: defaults to '/api' (proxied by Vite or web server)
 * - In Android Emulator: configured to 'http://10.0.2.2:5001/api'
 * - On Physical Android Device: configured to 'http://<LAN-IP>:5001/api'
 * - Configurable via:
 *   1. localStorage 'aiims_api_base_url' (runtime override)
 *   2. import.meta.env.VITE_API_BASE_URL (.env configuration)
 *   3. Native Android default: 'http://10.0.2.2:5001/api' (dev) or 'https://api.aiims.com/api' (prod)
 *   4. Web default fallback '/api'
 */
export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('aiims_api_base_url');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
  }
  const envUrl = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // Native Android & Mobile default resolution
  try {
    if (Capacitor.isNativePlatform()) {
      // Android emulator default bridge to local development backend on host machine (port 5001)
      return 'http://10.0.2.2:5001/api';
    }
  } catch {
    // Ignore error if Capacitor is not yet initialized
  }

  return '/api';
};

/**
 * Allows setting a custom runtime API Base URL (e.g. for physical Android device testing on LAN).
 */
export const setCustomApiBaseUrl = (url: string | null): void => {
  if (typeof window === 'undefined') return;
  if (!url) {
    localStorage.removeItem('aiims_api_base_url');
  } else {
    localStorage.setItem('aiims_api_base_url', url.trim().replace(/\/+$/, ''));
  }
};

const API_BASE = {
  toString() {
    return getApiBaseUrl();
  },
} as unknown as string;

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
    ...getDeviceHeaders(),
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
 * Reads a cookie value by name in browser environments.
 */
export const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
};

/**
 * Test connectivity to an API endpoint (/health check).
 */
export const testApiConnection = async (
  baseUrl: string
): Promise<{ ok: boolean; status?: number; data?: any; error?: string }> => {
  try {
    const cleanUrl = baseUrl.trim().replace(/\/+$/, '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${cleanUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: true, status: res.status, data };
    }
    return { ok: false, status: res.status, error: `HTTP ${res.status}` };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Connection failed' };
  }
};

/**
 * Universal authenticated fetch:
 * - Always sends `credentials: 'include'` so httpOnly cookies are transmitted automatically on Web.
 * - Merges mobile Bearer token & X-Client header when on native mobile platforms.
 * - Automatically attaches X-CSRF-Token on state-changing browser mutations.
 * - Native Android auto-fallback between emulator (10.0.2.2) and host LAN IP (192.168.1.5).
 */
export const apiFetch = async (input: string, init: RequestInit = {}): Promise<Response> => {
  const authHeaders = getAuthHeaders();
  const mergedHeaders: Record<string, string> = {
    ...authHeaders,
    ...((init.headers as Record<string, string>) || {}),
  };

  const method = (init.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !isMobileClient()) {
    const csrfToken = getCookie('aiims_csrf');
    if (csrfToken && !mergedHeaders['X-CSRF-Token'] && !mergedHeaders['x-csrf-token']) {
      mergedHeaders['X-CSRF-Token'] = csrfToken;
    }
  }

  // Mobile request timeout protection (adaptive timeout on mobile candidate endpoints)
  const isMobile = isMobileClient();
  const isCandidateUrl =
    typeof input === 'string' &&
    (input.includes('10.0.2.2:5001') || input.includes('192.168.1.5:5001'));
  const timeoutMs = isMobile && isCandidateUrl ? 5000 : 15000;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let signal = init.signal;
  if (!signal && typeof AbortController !== 'undefined') {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    signal = controller.signal;
  }

  try {
    const response = await fetch(input, {
      credentials: 'include',
      ...init,
      headers: mergedHeaders,
      signal,
    });
    return response;
  } catch (err: unknown) {
    // If on native mobile and connection to candidate 1 fails, attempt automatic candidate 2 fallback
    if (isMobileClient() && typeof input === 'string') {
      const isEmulatorUrl = input.includes('10.0.2.2:5001');
      const isLanUrl = input.includes('192.168.1.5:5001');

      if (isEmulatorUrl || isLanUrl) {
        const altUrl = isEmulatorUrl
          ? input.replace('10.0.2.2:5001', '192.168.1.5:5001')
          : input.replace('192.168.1.5:5001', '10.0.2.2:5001');
        const altBase = isEmulatorUrl ? 'http://192.168.1.5:5001/api' : 'http://10.0.2.2:5001/api';

        let fallbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
        const fallbackController =
          typeof AbortController !== 'undefined' ? new AbortController() : null;
        if (fallbackController) {
          fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 8000);
        }

        try {
          const fallbackResponse = await fetch(altUrl, {
            credentials: 'include',
            ...init,
            headers: mergedHeaders,
            signal: fallbackController ? fallbackController.signal : undefined,
          });
          // Fallback succeeded! Persist working URL so all future requests use it directly
          setCustomApiBaseUrl(altBase);
          return fallbackResponse;
        } catch {
          // If fallback also fails, rethrow original error
        } finally {
          if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);
        }
      }
    }

    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Network request timed out. Please check your internet connection.');
    }
    throw err;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
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
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  /**
   * Resets device binding for a user (Administrator only).
   */
  async adminResetUserDevice(userId: string, reason?: string) {
    const res = await apiFetch(`${API_BASE}/admin/users/${userId}/device-reset`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
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

  async getCreditsLedger(params?: {
    type?: string;
    category?: string;
    limit?: number;
    skip?: number;
  }) {
    const queryEntries: [string, string][] = [];
    if (params?.type) queryEntries.push(['type', params.type]);
    if (params?.category) queryEntries.push(['category', params.category]);
    if (params?.limit !== undefined) queryEntries.push(['limit', String(params.limit)]);
    if (params?.skip !== undefined) queryEntries.push(['skip', String(params.skip)]);
    const query = new URLSearchParams(queryEntries).toString();
    const res = await apiFetch(`${API_BASE}/credits/ledger${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getCreditCosts() {
    const res = await apiFetch(`${API_BASE}/credits/costs`, {
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

  async matchTools(params: {
    taskDescription: string;
    desiredOutput?: string;
    inputFormat?: string;
    freeOnly?: boolean;
    category?: string;
  }) {
    const res = await apiFetch(`${API_BASE}/wallet/match`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
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
    assignmentId?: string;
    topic?: string;
    difficulty?: string;
    taskTitle?: string;
    taskObjective?: string;
    userPrompt: string;
    contextData?: string;
  }) {
    const res = await apiFetch(`${API_BASE}/clarity/run`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async getClarityActiveTask(topic: string, track: string = 'General') {
    const res = await apiFetch(`${API_BASE}/clarity/active-task`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ topic, track }),
    });
    return res.json();
  },

  async submitClarityAttempt(params: {
    assignmentId: string;
    answer: string;
    timeTakenSeconds?: number;
  }) {
    const res = await apiFetch(`${API_BASE}/clarity/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async serveNextClarityTask(topic: string, track: string = 'General') {
    const res = await apiFetch(`${API_BASE}/clarity/next-task`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ topic, track }),
    });
    return res.json();
  },

  async getClarityProgression(topic: string) {
    const res = await apiFetch(
      `${API_BASE}/clarity/progression?topic=${encodeURIComponent(topic)}`,
      {
        headers: getAuthHeaders(),
      }
    );
    return res.json();
  },

  async getClarityProgressionConfig() {
    const res = await apiFetch(`${API_BASE}/clarity/progression-config`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async updateClarityProgressionConfig(updates: {
    upwardThreshold: number;
    consecutiveRequired: number;
    downwardThreshold: number;
  }) {
    const res = await apiFetch(`${API_BASE}/clarity/progression-config`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
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

  // ── QUESTION BANK & AI QUESTION GENERATION ─────────────────────────────────

  /** Serves an unrepeated, eligible question to the authenticated learner. */
  async serveQuestion(topic: string, level: string, track: 'General' | 'Coding' = 'General') {
    const res = await apiFetch(`${API_BASE}/questions/serve`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, level, track }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to serve question');
    }
    return res.json();
  },

  /** Retrieves the active in-progress question assignment for the learner. */
  async getCurrentQuestion() {
    const res = await apiFetch(`${API_BASE}/questions/current`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch current question');
    }
    return res.json();
  },

  /** Submits an attempt to an assigned question for grading. */
  async submitQuestionAttempt(assignmentId: string, answer: string, timeTakenSeconds = 0) {
    const res = await apiFetch(`${API_BASE}/questions/submit`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId, answer, timeTakenSeconds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit attempt');
    }
    return res.json();
  },

  /** Retrieves learner attempt history. */
  async getQuestionHistory(params?: { topic?: string; level?: string }) {
    const query = new URLSearchParams();
    if (params?.topic) query.set('topic', params.topic);
    if (params?.level) query.set('level', params.level);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await apiFetch(`${API_BASE}/questions/history${qs}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  /** Admin: retrieves question bank coverage statistics. */
  async getAdminQuestionStats() {
    const res = await apiFetch(`${API_BASE}/admin/questions/stats`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  /** Admin: lists questions with filters. */
  async getAdminQuestions(filters?: Record<string, string>) {
    const query = new URLSearchParams(filters || {});
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await apiFetch(`${API_BASE}/admin/questions${qs}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  /** Admin: creates a human-authored question. */
  async adminCreateQuestion(data: any) {
    const res = await apiFetch(`${API_BASE}/admin/questions`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  /** Admin: updates an existing question. */
  async adminUpdateQuestion(id: string, data: any) {
    const res = await apiFetch(`${API_BASE}/admin/questions/${id}`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  /** Admin: updates question status (approval, active, inactive, etc.). */
  async adminUpdateQuestionStatus(id: string, status: string, note?: string) {
    const res = await apiFetch(`${API_BASE}/admin/questions/${id}/status`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    });
    return res.json();
  },

  /** Admin: retrieves institution exclusion configuration. */
  async getAdminExclusionConfig() {
    const res = await apiFetch(`${API_BASE}/admin/questions/exclusion-config`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  /** Admin: updates institution exclusion configuration. */
  async updateAdminExclusionConfig(scope: string, exclusionDays: number) {
    const res = await apiFetch(`${API_BASE}/admin/questions/exclusion-config`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope, exclusionDays }),
    });
    return res.json();
  },

  // 17. Focus Module Endpoints
  async getActiveFocusSession() {
    const res = await apiFetch(`${API_BASE}/focus/active`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async startFocusSession(params?: {
    trackTitle?: string;
    intention?: string;
    focusDurationMinutes?: number;
    breakDurationMinutes?: number;
    enableLongBreak?: boolean;
    longBreakDurationMinutes?: number;
    longBreakInterval?: number;
    soundEnabled?: boolean;
  }) {
    const res = await apiFetch(`${API_BASE}/focus/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params || {}),
    });
    return res.json();
  },

  async pauseFocusSession(sessionId?: string) {
    const res = await apiFetch(`${API_BASE}/focus/pause`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ sessionId }),
    });
    return res.json();
  },

  async resumeFocusSession(sessionId?: string) {
    const res = await apiFetch(`${API_BASE}/focus/resume`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ sessionId }),
    });
    return res.json();
  },

  async completeFocusPeriod(sessionId?: string) {
    const res = await apiFetch(`${API_BASE}/focus/complete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ sessionId }),
    });
    return res.json();
  },

  async startBreakPeriod(params?: { sessionId?: string; forceLongBreak?: boolean }) {
    const res = await apiFetch(`${API_BASE}/focus/break`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params || {}),
    });
    return res.json();
  },

  async abandonFocusSession(sessionId?: string) {
    const res = await apiFetch(`${API_BASE}/focus/abandon`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ sessionId }),
    });
    return res.json();
  },

  async getFocusStats() {
    const res = await apiFetch(`${API_BASE}/focus/stats`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getFocusHistory(filter: 'all' | 'completed' = 'all') {
    const res = await apiFetch(`${API_BASE}/focus/history?filter=${filter}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async updateFocusConfig(config: {
    focusDurationMinutes: number;
    breakDurationMinutes: number;
    enableLongBreak?: boolean;
    longBreakDurationMinutes?: number;
    longBreakInterval?: number;
    soundEnabled?: boolean;
  }) {
    const res = await apiFetch(`${API_BASE}/focus/config`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(config),
    });
    return res.json();
  },

  // 17. My AI Journey & Assessment History Module
  async getJourneyOverview() {
    const res = await apiFetch(`${API_BASE}/journey/overview`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getAssessmentHistory(params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.type && params.type !== 'all') query.set('type', params.type);
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);

    const qs = query.toString();
    const res = await apiFetch(`${API_BASE}/journey/assessment-history${qs ? `?${qs}` : ''}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getJourneyClarityProgress() {
    const res = await apiFetch(`${API_BASE}/journey/clarity-progress`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getJourneyFocusActivity() {
    const res = await apiFetch(`${API_BASE}/journey/focus-activity`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getJourneyAnalytics() {
    const res = await apiFetch(`${API_BASE}/journey/analytics`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getJourneyNextAction() {
    const res = await apiFetch(`${API_BASE}/journey/next-action`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
};

export { apiClient as api };
