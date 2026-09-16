const API_BASE = '/api';

export const apiClient = {
  async getProfile() {
    const res = await fetch(`${API_BASE}/users/profile`);
    return res.json();
  },

  async getAssessmentQuestions() {
    const res = await fetch(`${API_BASE}/assessments/questions`);
    return res.json();
  },

  async submitAssessment(answers: any[]) {
    const res = await fetch(`${API_BASE}/assessments/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers })
    });
    return res.json();
  },

  async getIndividualAnalysis() {
    const res = await fetch(`${API_BASE}/analysis/individual`);
    return res.json();
  },

  async getComparativeAnalysis() {
    const res = await fetch(`${API_BASE}/analysis/comparative`);
    return res.json();
  },

  async getOverallAnalysis() {
    const res = await fetch(`${API_BASE}/analysis/overall`);
    return res.json();
  },

  async getWallet() {
    const res = await fetch(`${API_BASE}/credits/wallet`);
    return res.json();
  },

  async awardLevelCredits(levelId: number) {
    const res = await fetch(`${API_BASE}/credits/award-level`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ levelId })
    });
    return res.json();
  },

  async investCredits(amount: number, description: string) {
    const res = await fetch(`${API_BASE}/credits/invest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, description })
    });
    return res.json();
  },

  async getCapabilityGaps() {
    const res = await fetch(`${API_BASE}/clarity/gaps`);
    return res.json();
  },

  async submitMentorOverrideGap(gapId: string, mentorOverride: string) {
    const res = await fetch(`${API_BASE}/clarity/mentor-override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gapId, mentorOverride })
    });
    return res.json();
  },

  async getFocusAreas() {
    const res = await fetch(`${API_BASE}/focus/areas`);
    return res.json();
  },

  async submitMentorOverrideFocus(focusId: string, mentorOverride: string) {
    const res = await fetch(`${API_BASE}/focus/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ focusId, mentorOverride })
    });
    return res.json();
  },

  async getRadarSignals() {
    const res = await fetch(`${API_BASE}/radar/signals`);
    return res.json();
  },

  async toggleFollowSignal(signalId: string) {
    const res = await fetch(`${API_BASE}/radar/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signalId })
    });
    return res.json();
  },

  async submitInvestigation(signalId: string, personalInterpretation: string) {
    const res = await fetch(`${API_BASE}/investigations/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signalId, personalInterpretation })
    });
    return res.json();
  },

  async generateRelevance(signalId: string) {
    const res = await fetch(`${API_BASE}/relevance/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signalId })
    });
    return res.json();
  }
};
