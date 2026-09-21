const API_BASE = '/api';

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('aiims_auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
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
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async syncLearnerState(state: any) {
    const res = await fetch(`${API_BASE}/learner/state`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ state })
    });
    return res.json();
  },

  // 2. Profile Management
  async getProfile() {
    const res = await fetch(`${API_BASE}/users/profile`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async updateProfile(profileData: { name?: string; role?: string; college?: string; targetGoal?: string }) {
    const res = await fetch(`${API_BASE}/users/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData)
    });
    return res.json();
  },

  // 3. Assessments & Diagnostics
  async getAssessmentQuestions() {
    const res = await fetch(`${API_BASE}/assessments/questions`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async submitAssessment(answers: any[], scores?: any) {
    const res = await fetch(`${API_BASE}/assessments/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ answers, scores })
    });
    return res.json();
  },

  // 4. Growth & Capability Analysis
  async getIndividualAnalysis() {
    const res = await fetch(`${API_BASE}/analysis/individual`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async getComparativeAnalysis() {
    const res = await fetch(`${API_BASE}/analysis/comparative`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async getOverallAnalysis() {
    const res = await fetch(`${API_BASE}/analysis/overall`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // 5. Credits & Transactions
  async getWallet() {
    const res = await fetch(`${API_BASE}/credits/wallet`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async awardLevelCredits(levelId: number) {
    const res = await fetch(`${API_BASE}/credits/award-level`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ levelId })
    });
    return res.json();
  },

  async investCredits(amount: number, description: string) {
    const res = await fetch(`${API_BASE}/credits/invest`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount, description })
    });
    return res.json();
  },

  // 6. Clarity & Mentor Overrides
  async getCapabilityGaps() {
    const res = await fetch(`${API_BASE}/clarity/gaps`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async submitMentorOverrideGap(gapId: string, mentorOverride: string) {
    const res = await fetch(`${API_BASE}/clarity/mentor-override`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ gapId, mentorOverride })
    });
    return res.json();
  },

  // 7. Focus Tracks
  async getFocusAreas() {
    const res = await fetch(`${API_BASE}/focus/areas`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async submitMentorOverrideFocus(focusId: string, mentorOverride: string) {
    const res = await fetch(`${API_BASE}/focus/override`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ focusId, mentorOverride })
    });
    return res.json();
  },

  // 8. Radar & Investigations
  async getRadarSignals() {
    const res = await fetch(`${API_BASE}/radar/signals`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async toggleFollowSignal(signalId: string) {
    const res = await fetch(`${API_BASE}/radar/follow`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ signalId })
    });
    return res.json();
  },

  async submitInvestigation(signalId: string, personalInterpretation: string) {
    const res = await fetch(`${API_BASE}/investigations/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ signalId, personalInterpretation })
    });
    return res.json();
  },

  async generateRelevance(signalId: string) {
    const res = await fetch(`${API_BASE}/relevance/generate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ signalId })
    });
    return res.json();
  }
};
