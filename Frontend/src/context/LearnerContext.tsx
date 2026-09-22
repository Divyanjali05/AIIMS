import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserToolItem, TaskCategory, ToolFamiliarity, SolvedWorkflow, UserProject } from '../types';
import { apiClient } from '../api/client';

export interface CreditTransactionItem {
  id: string;
  description: string;
  amount: number;
  type: 'EARN' | 'SPEND';
  timestamp: string;
  actionKey?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  targetTab: string;
  read: boolean;
}

export interface LearnerState {
  profile: UserProfile;
  assessment: {
    status: 'not_started' | 'in_progress' | 'completed';
    answers: Record<number, any>;
    currentQuestionIndex: number;
    completedAt: string | null;
    rewardClaimed: boolean;
    scores: {
      usageFrequency: number;
      evaluationCapability: number;
      workflowDesign: number;
      strategicVision: number;
      mentorshipReadiness: number;
    };
  };
  analysis: {
    status: 'locked' | 'unlocked' | 'viewed';
    topCapability: string;
    growthArea: string;
  };
  clarity: {
    status: 'locked' | 'unlocked' | 'in_progress' | 'completed';
    selectedAreas: string[];
    selectedTopic: string | null;
    completedTopics: string[];
    reflections: Record<string, string>;
  };
  focus: {
    status: 'locked' | 'unlocked' | 'active' | 'completed';
    selectedTrack: string | null;
    history: string[];
    activatedAt: string | null;
  };
  radar: {
    status: 'available';
    investigatedSignalIds: string[];
    savedSignalIds: string[];
    dismissedSignalIds: string[];
    lastViewedRadar: string | null;
    radarProgress: number;
  };
  investigation: {
    status: 'locked' | 'available' | 'completed';
    selectedSignalId: string | null;
    userNotes: Record<string, string>;
  };
  relevance: {
    status: 'locked' | 'unlocked' | 'completed';
  };
  credits: {
    balance: number;
    transactions: CreditTransactionItem[];
    claimedActions: string[];
  };
  notifications: AppNotification[];
  aiWallet: {
    userTools: UserToolItem[];
    dismissedRecommendations: string[];
  };
  solver?: {
    latestWorkflow: SolvedWorkflow | null;
    history: SolvedWorkflow[];
  };
  build?: {
    projects: UserProject[];
    activeProjectId: string | null;
  };
  radarOpportunityContext?: {
    activeSignalId: string | null;
    opportunityTitle?: string;
    opportunityDesc?: string;
    passedContext?: any;
  };
}

const initialLearnerState: LearnerState = {
  profile: {
    id: 'usr-101',
    name: 'Divya',
    email: 'divya@example.com',
    role: 'Student / AI Learner',
    targetGoal: 'Master AI Intelligence & Mentoring',
    stage: 'Knowing',
    xpPoints: 0,
    aiimsCredits: 100
  },
  assessment: {
    status: 'not_started',
    answers: {},
    currentQuestionIndex: 0,
    completedAt: null,
    rewardClaimed: false,
    scores: {
      usageFrequency: 0,
      evaluationCapability: 0,
      workflowDesign: 0,
      strategicVision: 0,
      mentorshipReadiness: 0
    }
  },
  analysis: {
    status: 'locked',
    topCapability: 'AI Evaluation & Critical Assessment',
    growthArea: 'AI Workflow Design'
  },
  clarity: {
    status: 'locked',
    selectedAreas: [],
    selectedTopic: null,
    completedTopics: [],
    reflections: {}
  },
  focus: {
    status: 'locked',
    selectedTrack: null,
    history: [],
    activatedAt: null
  },
  radar: {
    status: 'available',
    investigatedSignalIds: [],
    savedSignalIds: [],
    dismissedSignalIds: [],
    lastViewedRadar: null,
    radarProgress: 0
  },
  investigation: {
    status: 'locked',
    selectedSignalId: null,
    userNotes: {}
  },
  relevance: {
    status: 'locked'
  },
  credits: {
    balance: 100,
    transactions: [
      {
        id: 'tx-welcome-01',
        description: 'Account Welcome Bonus',
        amount: 100,
        type: 'EARN',
        timestamp: 'Just now',
        actionKey: 'WELCOME_BONUS'
      }
    ],
    claimedActions: ['WELCOME_BONUS']
  },
  notifications: [
    {
      id: 'notif-welcome-1',
      title: 'Welcome to AIIMS',
      message: 'Your AI journey starts here. Discover your AI profile by taking your baseline assessment.',
      timestamp: 'Just now',
      targetTab: 'assessment',
      read: false
    }
  ],
  aiWallet: {
    userTools: [
      {
        toolId: 'tool-chatgpt',
        addedAt: '2026-08-10',
        familiarity: 'proficient',
        userNotes: 'Used daily for quick prompt queries and document drafting.',
        primaryCategory: 'Reasoning & Writing',
        customTags: ['daily-driver']
      },
      {
        toolId: 'tool-copilot',
        addedAt: '2026-08-20',
        familiarity: 'practicing',
        userNotes: 'Used in VS Code for autocomplete.',
        primaryCategory: 'Agentic Coding',
        customTags: ['coding']
      }
    ],
    dismissedRecommendations: []
  },
  solver: {
    latestWorkflow: null,
    history: []
  },
  build: {
    projects: [],
    activeProjectId: null
  }
};

interface LearnerContextType {
  state: LearnerState;
  saveAssessmentAnswer: (questionId: number, value: any) => void;
  setQuestionIndex: (index: number) => void;
  completeAssessment: () => void;
  unlockAnalysis: () => void;
  viewAnalysis: () => void;
  selectClarityArea: (areaName: string) => void;
  setClarityTopic: (topicName: string | null) => void;
  saveClarityReflection: (topicName: string, text: string) => void;
  completeClarityTopic: (topicName: string) => void;
  selectFocusTrack: (trackName: string) => void;
  changeFocusTrack: (newTrackName: string) => void;
  clearFocusSelection: () => void;
  investigateSignal: (signalId: string, notes?: string) => void;
  toggleSaveSignal: (signalId: string) => void;
  dismissSignal: (signalId: string) => void;
  awardCredits: (amount: number, description: string, actionKey?: string) => void;
  addToolToWallet: (toolId: string, primaryCategory: TaskCategory, familiarity?: ToolFamiliarity, userNotes?: string) => void;
  removeToolFromWallet: (toolId: string) => void;
  updateToolFamiliarity: (toolId: string, familiarity: ToolFamiliarity, userNotes?: string) => void;
  dismissRecommendation: (recommendationId: string) => void;
  saveSolvedWorkflow: (workflow: Omit<SolvedWorkflow, 'id' | 'createdAt'>) => void;
  saveUserProject: (project: Omit<UserProject, 'id' | 'createdAt'>) => void;
  setRadarOpportunityContext: (ctx: { activeSignalId: string; opportunityTitle?: string; opportunityDesc?: string; passedContext?: any } | null) => void;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, college?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  resetState: () => void;
}

const LearnerContext = createContext<LearnerContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'aiims_learner_state_v3';

export const LearnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('aiims_auth_token');
  });

  const [state, setState] = useState<LearnerState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...initialLearnerState,
          ...parsed,
          aiWallet: parsed.aiWallet || initialLearnerState.aiWallet
        };
      }
    } catch (e) {
      console.error('Failed to load learner state from storage', e);
    }
    return initialLearnerState;
  });

  // Hydrate live state from MongoDB Atlas on mount if authenticated
  useEffect(() => {
    const token = localStorage.getItem('aiims_auth_token');
    if (token) {
      apiClient.getLearnerState()
        .then((res) => {
          if (res?.success && res?.state) {
            setState(res.state);
            setIsAuthenticated(true);
          }
        })
        .catch((err) => {
          console.warn('Could not hydrate learner state from MongoDB:', err);
        });
    }
  }, []);

  // Sync state to scoped localStorage and MongoDB Atlas on updates
  useEffect(() => {
    if (!state.profile?.email) return;

    try {
      const scopedKey = `aiims_learner_state_${state.profile.email.toLowerCase()}`;
      localStorage.setItem(scopedKey, JSON.stringify(state));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save learner state to localStorage', e);
    }

    // Auto-sync to MongoDB Atlas if authenticated
    if (isAuthenticated) {
      const timer = setTimeout(() => {
        apiClient.syncLearnerState(state).catch((err) => {
          console.warn('Background MongoDB sync warning:', err);
        });
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [state, isAuthenticated]);

  const saveAssessmentAnswer = (questionId: number, value: any) => {
    setState((prev) => ({
      ...prev,
      assessment: {
        ...prev.assessment,
        status: prev.assessment.status === 'completed' ? 'completed' : 'in_progress',
        answers: {
          ...prev.assessment.answers,
          [questionId]: value
        }
      }
    }));
  };

  const setQuestionIndex = (index: number) => {
    setState((prev) => ({
      ...prev,
      assessment: {
        ...prev.assessment,
        currentQuestionIndex: index
      }
    }));
  };

  // Dynamic Score Calculation from 25 Questions
  const calculateScoresFromAnswers = (answers: Record<number, any>) => {
    const calcSection = (qIds: number[]) => {
      let sum = 0;
      let count = 0;
      qIds.forEach((id) => {
        const val = answers[id];
        if (typeof val === 'number') {
          sum += val * 20; // 1-5 scale -> 20-100
          count++;
        } else if (typeof val === 'string') {
          if (val.endsWith('_a')) sum += 95;
          else if (val.endsWith('_b')) sum += 75;
          else if (val.endsWith('_c')) sum += 55;
          else if (val.endsWith('_d')) sum += 35;
          else if (val.endsWith('_e')) sum += 15;
          else if (val.trim().length > 0) sum += 80; // text response given
          count++;
        } else if (Array.isArray(val)) {
          sum += Math.min(100, Math.max(30, val.length * 30));
          count++;
        }
      });
      return count > 0 ? Math.round(sum / count) : 60;
    };

    const usageFrequency = calcSection([1, 2, 3, 4, 5]);
    const evaluationCapability = calcSection([6, 7, 8, 9, 10]);
    const workflowDesign = calcSection([11, 12, 13, 14, 15]);
    const strategicVision = calcSection([16, 17, 18, 19, 20]);
    const mentorshipReadiness = calcSection([21, 22, 23, 24, 25]);

    const dimensions = [
      { name: 'AI Usage & Frequency', score: usageFrequency },
      { name: 'AI Evaluation & Critical Assessment', score: evaluationCapability },
      { name: 'AI Workflow Design', score: workflowDesign },
      { name: 'Strategic AI Vision', score: strategicVision },
      { name: 'AI Mentorship Readiness', score: mentorshipReadiness }
    ];

    dimensions.sort((a, b) => b.score - a.score);
    const topCap = dimensions[0].name;
    const growth = dimensions[dimensions.length - 1].name;

    return {
      scores: {
        usageFrequency,
        evaluationCapability,
        workflowDesign,
        strategicVision,
        mentorshipReadiness
      },
      topCapability: topCap,
      growthArea: growth
    };
  };

  const completeAssessment = () => {
    const nowStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const rewardAmount = 50;
    const actionKey = 'ASSESSMENT_COMPLETION';

    setState((prev) => {
      if (prev.assessment.status === 'completed' || prev.credits.claimedActions.includes(actionKey)) {
        return prev; // Idempotent check
      }

      const calculated = calculateScoresFromAnswers(prev.assessment.answers || {});
      const newBalance = prev.credits.balance + rewardAmount;

      const newTx: CreditTransactionItem = {
        id: `tx-assessment-${Date.now()}`,
        description: 'Assessment Completed Reward',
        amount: rewardAmount,
        type: 'EARN',
        timestamp: nowStr,
        actionKey
      };

      const newNotif: AppNotification = {
        id: `notif-assessment-${Date.now()}`,
        title: 'Assessment Complete',
        message: `You completed your AI baseline assessment (+${rewardAmount} Credits)! Your analysis is now unlocked.`,
        timestamp: 'Just now',
        targetTab: 'analysis',
        read: false
      };

      return {
        ...prev,
        profile: {
          ...prev.profile,
          stage: 'Recognising',
          xpPoints: prev.profile.xpPoints + 500,
          aiimsCredits: newBalance
        },
        assessment: {
          ...prev.assessment,
          status: 'completed',
          completedAt: nowStr,
          rewardClaimed: true,
          scores: calculated.scores
        },
        analysis: {
          status: 'unlocked',
          topCapability: calculated.topCapability,
          growthArea: calculated.growthArea
        },
        clarity: {
          ...prev.clarity,
          status: 'unlocked',
          selectedAreas: [calculated.growthArea, 'AI Workflow Design', 'AI Agents & Autonomous Workflows']
        },
        focus: {
          ...prev.focus,
          status: 'unlocked',
          selectedTrack: null
        },
        credits: {
          balance: newBalance,
          transactions: [newTx, ...prev.credits.transactions],
          claimedActions: [...prev.credits.claimedActions, actionKey]
        },
        notifications: [newNotif, ...prev.notifications]
      };
    });
  };

  const unlockAnalysis = () => {
    setState((prev) => ({
      ...prev,
      analysis: { ...prev.analysis, status: 'unlocked' }
    }));
  };

  const viewAnalysis = () => {
    setState((prev) => ({
      ...prev,
      analysis: { ...prev.analysis, status: 'viewed' },
      clarity: { ...prev.clarity, status: prev.clarity.status === 'locked' ? 'unlocked' : prev.clarity.status },
      focus: { ...prev.focus, status: prev.focus.status === 'locked' ? 'unlocked' : prev.focus.status }
    }));
  };

  const selectClarityArea = (areaName: string) => {
    setState((prev) => {
      const existing = prev.clarity.selectedAreas;
      const updated = existing.includes(areaName) ? existing : [areaName, ...existing];
      const isCompleted = prev.clarity.completedTopics.includes(areaName);
      return {
        ...prev,
        clarity: {
          ...prev.clarity,
          status: isCompleted ? 'completed' : 'in_progress',
          selectedAreas: updated,
          selectedTopic: areaName
        }
      };
    });
  };

  const selectFocusTrack = (trackName: string) => {
    const nowStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    setState((prev) => {
      const prevHistory = prev.focus.history || [];
      const updatedHistory = prevHistory.includes(trackName) ? prevHistory : [trackName, ...prevHistory];
      return {
        ...prev,
        focus: {
          ...prev.focus,
          status: 'active',
          selectedTrack: trackName,
          history: updatedHistory,
          activatedAt: nowStr
        },
        investigation: {
          ...prev.investigation,
          status: 'available'
        }
      };
    });
  };

  const changeFocusTrack = (newTrackName: string) => {
    const nowStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    setState((prev) => {
      const prevTrack = prev.focus.selectedTrack;
      const prevHistory = prev.focus.history || [];
      let updatedHistory = [...prevHistory];
      if (prevTrack && !updatedHistory.includes(prevTrack)) {
        updatedHistory.unshift(prevTrack);
      }
      if (!updatedHistory.includes(newTrackName)) {
        updatedHistory.unshift(newTrackName);
      }
      return {
        ...prev,
        focus: {
          ...prev.focus,
          status: 'active',
          selectedTrack: newTrackName,
          history: updatedHistory,
          activatedAt: nowStr
        }
      };
    });
  };

  const clearFocusSelection = () => {
    setState((prev) => ({
      ...prev,
      focus: {
        ...prev.focus,
        status: prev.focus.status === 'locked' ? 'locked' : 'unlocked'
      }
    }));
  };

  // Strictly Idempotent Investigation Reward Handling
  const investigateSignal = (signalId: string, notes?: string) => {
    const rewardAmount = 30;
    const actionKey = `INVESTIGATE_SIGNAL_${signalId}`;
    const nowStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    setState((prev) => {
      const alreadyClaimed = prev.credits.claimedActions.includes(actionKey);
      const newInvestigated = prev.radar.investigatedSignalIds.includes(signalId)
        ? prev.radar.investigatedSignalIds
        : [...prev.radar.investigatedSignalIds, signalId];

      if (alreadyClaimed) {
        return {
          ...prev,
          radar: { ...prev.radar, investigatedSignalIds: newInvestigated },
          investigation: {
            ...prev.investigation,
            status: 'completed',
            selectedSignalId: signalId,
            userNotes: { ...prev.investigation.userNotes, ...(notes ? { [signalId]: notes } : {}) }
          },
          relevance: { ...prev.relevance, status: 'unlocked' }
        };
      }

      const newBalance = prev.credits.balance + rewardAmount;
      const newTx: CreditTransactionItem = {
        id: `tx-investigate-${Date.now()}`,
        description: `Signal Investigation Completed`,
        amount: rewardAmount,
        type: 'EARN',
        timestamp: nowStr,
        actionKey
      };

      const newNotif: AppNotification = {
        id: `notif-investigate-${Date.now()}`,
        title: 'Signal Investigated',
        message: `You completed a signal investigation (+${rewardAmount} Credits)! AI Relevance map is now available.`,
        timestamp: 'Just now',
        targetTab: 'relevance',
        read: false
      };

      return {
        ...prev,
        profile: { ...prev.profile, aiimsCredits: newBalance },
        radar: { ...prev.radar, investigatedSignalIds: newInvestigated },
        investigation: {
          ...prev.investigation,
          status: 'completed',
          selectedSignalId: signalId,
          userNotes: { ...prev.investigation.userNotes, ...(notes ? { [signalId]: notes } : {}) }
        },
        relevance: { ...prev.relevance, status: 'unlocked' },
        credits: {
          balance: newBalance,
          transactions: [newTx, ...prev.credits.transactions],
          claimedActions: [...prev.credits.claimedActions, actionKey]
        },
        notifications: [newNotif, ...prev.notifications]
      };
    });
  };

  const toggleSaveSignal = (signalId: string) => {
    setState((prev) => {
      const saved = prev.radar?.savedSignalIds || [];
      const updated = saved.includes(signalId)
        ? saved.filter((id) => id !== signalId)
        : [...saved, signalId];
      return {
        ...prev,
        radar: {
          ...prev.radar,
          savedSignalIds: updated
        }
      };
    });
  };

  const dismissSignal = (signalId: string) => {
    setState((prev) => ({
      ...prev,
      radar: {
        ...prev.radar,
        dismissedSignalIds: [...(prev.radar?.dismissedSignalIds || []), signalId]
      }
    }));
  };

  const awardCredits = (amount: number, description: string, actionKey?: string) => {
    const key = actionKey || `CUSTOM_${Date.now()}_${amount}`;
    const nowStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    setState((prev) => {
      if (prev.credits.claimedActions.includes(key)) {
        return prev;
      }
      const newBalance = prev.credits.balance + amount;
      const newTx: CreditTransactionItem = {
        id: `tx-${Date.now()}`,
        description,
        amount,
        type: 'EARN',
        timestamp: nowStr,
        actionKey: key
      };
      return {
        ...prev,
        profile: { ...prev.profile, aiimsCredits: newBalance },
        credits: {
          balance: newBalance,
          transactions: [newTx, ...prev.credits.transactions],
          claimedActions: [...prev.credits.claimedActions, key]
        }
      };
    });
  };

  const markNotificationRead = (id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    }));
  };

  const clearNotifications = () => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true }))
    }));
  };

  const resetState = () => {
    setState(initialLearnerState);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  const setClarityTopic = (topicName: string | null) => {
    setState((prev) => ({
      ...prev,
      clarity: {
        ...prev.clarity,
        selectedTopic: topicName,
        status: topicName 
          ? (prev.clarity.completedTopics.includes(topicName) ? 'completed' : 'in_progress')
          : (prev.clarity.status === 'locked' ? 'locked' : 'unlocked')
      }
    }));
  };

  const saveClarityReflection = (topicName: string, text: string) => {
    setState((prev) => ({
      ...prev,
      clarity: {
        ...prev.clarity,
        reflections: {
          ...prev.clarity.reflections,
          [topicName]: text
        }
      }
    }));
  };

  const completeClarityTopic = (topicName: string) => {
    setState((prev) => {
      const updatedCompleted = prev.clarity.completedTopics.includes(topicName)
        ? prev.clarity.completedTopics
        : [...prev.clarity.completedTopics, topicName];

      return {
        ...prev,
        clarity: {
          ...prev.clarity,
          selectedTopic: topicName,
          completedTopics: updatedCompleted,
          status: 'completed'
        },
        focus: {
          ...prev.focus,
          status: prev.focus.status === 'locked' ? 'unlocked' : prev.focus.status
        }
      };
    });
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid credentials' };
      }
      localStorage.setItem('aiims_auth_token', data.token);
      setIsAuthenticated(true);
      if (data.state) {
        setState(data.state);
      } else if (data.user) {
        setState((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            ...data.user
          }
        }));
      }
      return { success: true };
    } catch (e: any) {
      const usernamePart = email.split('@')[0];
      const formattedName = usernamePart
        .split(/[._-]/)
        .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Learner';
      const token = `local-token-${Date.now()}`;
      localStorage.setItem('aiims_auth_token', token);
      setIsAuthenticated(true);
      setState((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          name: formattedName,
          email: email
        }
      }));
      return { success: true };
    }
  };

  const register = async (name: string, email: string, password: string, college?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, college })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }
      localStorage.setItem('aiims_auth_token', data.token);
      setIsAuthenticated(true);
      if (data.state) {
        setState(data.state);
      } else if (data.user) {
        setState((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            ...data.user
          }
        }));
      }
      return { success: true };
    } catch (e: any) {
      const token = `local-token-${Date.now()}`;
      localStorage.setItem('aiims_auth_token', token);
      setIsAuthenticated(true);
      setState((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          name,
          email,
          college: college || 'Engineering & Technology College'
        }
      }));
      return { success: true };
    }
  };

  const logout = () => {
    localStorage.removeItem('aiims_auth_token');
    setIsAuthenticated(false);
    setState(initialLearnerState);
  };

  const addToolToWallet = (
    toolId: string,
    primaryCategory: TaskCategory,
    familiarity: ToolFamiliarity = 'exploring',
    userNotes?: string
  ) => {
    setState((prev) => {
      const currentTools = prev.aiWallet?.userTools || [];
      const exists = currentTools.find((t) => t.toolId === toolId);
      if (exists) return prev;

      const newItem: UserToolItem = {
        toolId,
        addedAt: new Date().toISOString().split('T')[0],
        familiarity,
        primaryCategory,
        userNotes: userNotes || '',
        customTags: ['my-toolkit']
      };

      return {
        ...prev,
        aiWallet: {
          ...prev.aiWallet,
          userTools: [newItem, ...currentTools]
        }
      };
    });
  };

  const removeToolFromWallet = (toolId: string) => {
    setState((prev) => ({
      ...prev,
      aiWallet: {
        ...prev.aiWallet,
        userTools: (prev.aiWallet?.userTools || []).filter((t) => t.toolId !== toolId)
      }
    }));
  };

  const updateToolFamiliarity = (
    toolId: string,
    familiarity: ToolFamiliarity,
    userNotes?: string
  ) => {
    setState((prev) => ({
      ...prev,
      aiWallet: {
        ...prev.aiWallet,
        userTools: (prev.aiWallet?.userTools || []).map((t) =>
          t.toolId === toolId
            ? { ...t, familiarity, ...(userNotes !== undefined ? { userNotes } : {}) }
            : t
        )
      }
    }));
  };

  const dismissRecommendation = (recommendationId: string) => {
    setState((prev) => ({
      ...prev,
      aiWallet: {
        ...prev.aiWallet,
        dismissedRecommendations: [
          ...(prev.aiWallet?.dismissedRecommendations || []),
          recommendationId
        ]
      }
    }));
  };

  const saveSolvedWorkflow = (workflow: Omit<SolvedWorkflow, 'id' | 'createdAt'>) => {
    const fullWorkflow: SolvedWorkflow = {
      ...workflow,
      id: `wf-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setState((prev) => {
      const currentSolver = prev.solver || { latestWorkflow: null, history: [] };
      return {
        ...prev,
        solver: {
          latestWorkflow: fullWorkflow,
          history: [fullWorkflow, ...currentSolver.history]
        }
      };
    });
  };

  const saveUserProject = (project: Omit<UserProject, 'id' | 'createdAt'>) => {
    const fullProject: UserProject = {
      ...project,
      id: `proj-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setState((prev) => {
      const currentBuild = prev.build || { projects: [], activeProjectId: null };
      return {
        ...prev,
        build: {
          projects: [fullProject, ...currentBuild.projects],
          activeProjectId: fullProject.id
        }
      };
    });
  };

  const setRadarOpportunityContext = (ctx: { activeSignalId: string; opportunityTitle?: string; opportunityDesc?: string; passedContext?: any } | null) => {
    setState((prev) => ({
      ...prev,
      radarOpportunityContext: ctx ? {
        activeSignalId: ctx.activeSignalId,
        opportunityTitle: ctx.opportunityTitle,
        opportunityDesc: ctx.opportunityDesc,
        passedContext: ctx.passedContext
      } : undefined
    }));
  };

  return (
    <LearnerContext.Provider
      value={{
        state,
        isAuthenticated,
        login,
        register,
        logout,
        saveAssessmentAnswer,
        setQuestionIndex,
        completeAssessment,
        unlockAnalysis,
        viewAnalysis,
        selectClarityArea,
        setClarityTopic,
        saveClarityReflection,
        completeClarityTopic,
        selectFocusTrack,
        changeFocusTrack,
        clearFocusSelection,
        investigateSignal,
        toggleSaveSignal,
        dismissSignal,
        awardCredits,
        addToolToWallet,
        removeToolFromWallet,
        updateToolFamiliarity,
        dismissRecommendation,
        saveSolvedWorkflow,
        saveUserProject,
        setRadarOpportunityContext,
        markNotificationRead,
        clearNotifications,
        resetState
      }}
    >
      {children}
    </LearnerContext.Provider>
  );
};

export const useLearner = () => {
  const context = useContext(LearnerContext);
  if (!context) {
    throw new Error('useLearner must be used within a LearnerProvider');
  }
  return context;
};
