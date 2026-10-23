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

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('aiims_auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const apiClient = {
  // 1. Learner State Full Sync (MongoDB Atlas)
  async getLearnerState() {
    const res = await fetch(`${API_BASE}/learner/state`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async syncLearnerState(state: unknown) {
    const res = await fetch(`${API_BASE}/learner/state`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ state }),
    });
    return res.json();
  },

  // 2. Profile Management
  async getProfile() {
    const res = await fetch(`${API_BASE}/users/profile`, {
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
    const res = await fetch(`${API_BASE}/users/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData),
    });
    return res.json();
  },

  // 3. Assessments & Diagnostics
  async getAssessmentQuestions() {
    const res = await fetch(`${API_BASE}/assessments/questions`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async submitAssessment(answers: Record<string, unknown>, scores?: Record<string, unknown>) {
    const res = await fetch(`${API_BASE}/assessments/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ answers, scores }),
    });
    return res.json();
  },

  async getPeerBenchmarks() {
    const res = await fetch(`${API_BASE}/analysis/peer-benchmarks`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // 4. Growth & Capability Analysis
  async getIndividualAnalysis() {
    const res = await fetch(`${API_BASE}/analysis/individual`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getComparativeAnalysis() {
    const res = await fetch(`${API_BASE}/analysis/comparative`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getOverallAnalysis() {
    const res = await fetch(`${API_BASE}/analysis/overall`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // 5. Credits & Transactions
  async getWallet() {
    const res = await fetch(`${API_BASE}/credits/wallet`, {
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
    const res = await fetch(`${API_BASE}/credits/ledger${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getCreditsBalance() {
    const res = await fetch(`${API_BASE}/credits/balance`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getCreditsReconciliation() {
    const res = await fetch(`${API_BASE}/credits/reconcile`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async awardLevelCredits(levelId: number) {
    const res = await fetch(`${API_BASE}/credits/award-level`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ levelId }),
    });
    return res.json();
  },

  async investCredits(amount: number, description: string, idempotencyKey?: string) {
    const res = await fetch(`${API_BASE}/credits/invest`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount, description, idempotencyKey }),
    });
    return res.json();
  },

  // 6. Clarity & Mentor Overrides
  async getCapabilityGaps() {
    const res = await fetch(`${API_BASE}/clarity/gaps`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async submitMentorOverrideGap(gapId: string, mentorOverride: string) {
    const res = await fetch(`${API_BASE}/clarity/mentor-override`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ gapId, mentorOverride }),
    });
    return res.json();
  },

  // 7. Focus Tracks
  async getFocusAreas() {
    const res = await fetch(`${API_BASE}/focus/areas`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async submitMentorOverrideFocus(focusId: string, mentorOverride: string) {
    const res = await fetch(`${API_BASE}/focus/override`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ focusId, mentorOverride }),
    });
    return res.json();
  },

  // 8. Radar & Investigations
  async getRadarSignals() {
    const res = await fetch(`${API_BASE}/radar/signals`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async toggleFollowSignal(signalId: string) {
    const res = await fetch(`${API_BASE}/radar/follow`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ signalId }),
    });
    return res.json();
  },

  async submitInvestigation(signalId: string, personalInterpretation: string) {
    const res = await fetch(`${API_BASE}/investigations/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ signalId, personalInterpretation }),
    });
    return res.json();
  },

  async generateRelevance(signalId: string) {
    const res = await fetch(`${API_BASE}/relevance/generate`, {
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
    const res = await fetch(`${API_BASE}/wallet/catalog?${query}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async searchRequirement(query: string, userTools?: unknown[]) {
    const res = await fetch(`${API_BASE}/wallet/search`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ query, userTools }),
    });
    return res.json();
  },

  async getToolDetail(toolId: string) {
    const res = await fetch(`${API_BASE}/wallet/tools/${toolId}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getAIWalletUser() {
    const res = await fetch(`${API_BASE}/wallet/user`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getWalletRecommendations() {
    const res = await fetch(`${API_BASE}/wallet/recommendations`, {
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
    const res = await fetch(`${API_BASE}/wallet/add`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ toolId, primaryCategory, familiarity, userNotes }),
    });
    return res.json();
  },

  async updateToolFamiliarity(toolId: string, familiarity: string, userNotes?: string) {
    const res = await fetch(`${API_BASE}/wallet/update-familiarity`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ toolId, familiarity, userNotes }),
    });
    return res.json();
  },

  async compareTools(toolAId: string, toolBId: string, task?: string) {
    const res = await fetch(`${API_BASE}/wallet/compare`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ toolAId, toolBId, task }),
    });
    return res.json();
  },

  async compareToolsForRequirement(toolIds: string[], userRequirement?: string) {
    const res = await fetch(`${API_BASE}/wallet/compare`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ toolIds, userRequirement }),
    });
    return res.json();
  },

  async getToolkitGaps() {
    const res = await fetch(`${API_BASE}/wallet/gaps`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async triggerDiscoveryJob() {
    const res = await fetch(`${API_BASE}/wallet/discover/trigger`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getDiscoveryStatus() {
    const res = await fetch(`${API_BASE}/wallet/discovery/status`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getToolEvidence(toolId: string) {
    const res = await fetch(`${API_BASE}/wallet/tools/${toolId}/evidence`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getToolHistory(toolId: string) {
    const res = await fetch(`${API_BASE}/wallet/tools/${toolId}/history`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getNewTools() {
    const res = await fetch(`${API_BASE}/wallet/tools/new`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getRecentlyUpdatedTools() {
    const res = await fetch(`${API_BASE}/wallet/tools/recently-updated`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getIntelligenceStatus() {
    const res = await fetch(`${API_BASE}/wallet/intelligence/status`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // 10. Academic Module
  async searchInstitutes(query: string, limit?: number) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (limit) params.set('limit', String(limit));
    const res = await fetch(`${API_BASE}/academic/institutes?${params.toString()}`, {
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
    const res = await fetch(`${API_BASE}/academic/institutes/request`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getStudentProfile() {
    const res = await fetch(`${API_BASE}/student/profile`, {
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
    const res = await fetch(`${API_BASE}/student/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // 11. Admin & Pipeline Observability APIs
  async getAdminSources() {
    const res = await fetch(`${API_BASE}/admin/sources`, {
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
    const res = await fetch(`${API_BASE}/admin/sources`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getAdminCandidates() {
    const res = await fetch(`${API_BASE}/admin/candidates`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async verifyAdminCandidate(
    toolId: string,
    data?: { acceptEvidenceId?: string; activate?: boolean }
  ) {
    const res = await fetch(`${API_BASE}/admin/verify/${toolId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data || {}),
    });
    return res.json();
  },

  async getAdminDashboard() {
    const res = await fetch(`${API_BASE}/admin/intelligence/dashboard`, {
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
    const res = await fetch(`${API_BASE}/clarity/generate-prompt`, {
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
    const res = await fetch(`${API_BASE}/clarity/run-task`, {
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
    const res = await fetch(`${API_BASE}/clarity/save-task-score`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async suggestClarityReflection(params: { topic: string; taskTitle?: string; score?: number }) {
    const res = await fetch(`${API_BASE}/clarity/suggest-reflection`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    return res.json();
  },
};
