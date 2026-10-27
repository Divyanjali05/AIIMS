import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  AcademicProfile,
  UserToolItem,
  TaskCategory,
  ToolFamiliarity,
  SolvedWorkflow,
  UserProject,
  AudienceMode,
  FocusSessionConfig,
  ActiveFocusSessionState,
  FocusSessionRecord,
} from '../types';
import { apiClient, apiFetch, getApiBaseUrl, setAuthToken } from '../api/client';
import { evaluateAssessment, AssessmentEvaluationResult } from '../services/assessmentScoring';
import { playSessionCompleteSound, playBreakCompleteSound } from '../utils/focusAudio';
import { sendFocusNotification } from '../utils/focusNotifications';

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

export const resolveAudienceMode = (savedMode?: any, primaryGoal?: string): AudienceMode => {
  if (savedMode === 'student' || savedMode === 'entrepreneur') {
    return savedMode;
  }
  if (primaryGoal === 'ENTREPRENEURSHIP') {
    return 'entrepreneur';
  }
  return 'student';
};

export interface LearnerState {
  profile: UserProfile;
  // Academic identity (separate from learner state — set at registration)
  academicProfile?: AcademicProfile;
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
    evaluationResult?: AssessmentEvaluationResult;
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
    taskScores?: Record<
      string,
      Record<
        string,
        {
          score: number;
          output: string;
          userPrompt: string;
          breakdown?: {
            clarity: number;
            constraints: number;
            structure: number;
            reliability: number;
          };
          grade?: string;
          strengths?: string[];
          gaps?: string[];
          tip?: string;
          completedAt?: string;
        }
      >
    >;
  };
  focus: {
    status: 'locked' | 'unlocked' | 'active' | 'completed';
    selectedTrack: string | null;
    history: string[];
    activatedAt: string | null;
    sessionConfig?: FocusSessionConfig;
    activeSession?: ActiveFocusSessionState | null;
    sessionHistory?: FocusSessionRecord[];
  };
  radar: {
    status: 'locked' | 'available';
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
    audienceMode?: AudienceMode;
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
    id: '',
    name: '',
    email: '',
    role: 'learner',
    targetGoal: 'Explore AI Architectures & Intelligence',
    stage: 'Knowing',
    xpPoints: 0,
    aiimsCredits: 500,
  },
  academicProfile: undefined,
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
      mentorshipReadiness: 0,
    },
  },
  analysis: {
    status: 'locked',
    topCapability: 'AI Evaluation & Critical Assessment',
    growthArea: 'AI Workflow Design',
  },
  clarity: {
    status: 'locked',
    selectedAreas: [],
    selectedTopic: null,
    completedTopics: [],
    reflections: {},
    taskScores: {},
  },
  focus: {
    status: 'locked',
    selectedTrack: null,
    history: [],
    activatedAt: null,
    sessionConfig: {
      focusDurationMinutes: 25,
      breakDurationMinutes: 5,
      enableLongBreak: true,
      longBreakDurationMinutes: 15,
      longBreakInterval: 4,
      soundEnabled: true,
    },
    activeSession: null,
    sessionHistory: [],
  },
  radar: {
    status: 'locked',
    investigatedSignalIds: [],
    savedSignalIds: [],
    dismissedSignalIds: [],
    lastViewedRadar: null,
    radarProgress: 0,
  },
  investigation: {
    status: 'locked',
    selectedSignalId: null,
    userNotes: {},
  },
  relevance: {
    status: 'locked',
  },
  credits: {
    balance: 500,
    transactions: [
      {
        id: 'tx-welcome-01',
        description: 'Account Welcome Bonus',
        amount: 500,
        type: 'EARN',
        timestamp: 'Just now',
        actionKey: 'WELCOME_BONUS',
      },
    ],
    claimedActions: ['WELCOME_BONUS'],
  },
  notifications: [
    {
      id: 'notif-welcome-1',
      title: 'Welcome to AIIMS',
      message:
        'Your AI journey starts here. Discover your AI profile by taking your baseline assessment.',
      timestamp: 'Just now',
      targetTab: 'assessment',
      read: false,
    },
  ],
  aiWallet: {
    userTools: [
      {
        toolId: 'tool-chatgpt',
        addedAt: '2026-08-10',
        familiarity: 'proficient',
        userNotes: 'Used daily for quick prompt queries and document drafting.',
        primaryCategory: 'Reasoning & Writing',
        customTags: ['daily-driver'],
      },
      {
        toolId: 'tool-copilot',
        addedAt: '2026-08-20',
        familiarity: 'practicing',
        userNotes: 'Used in VS Code for autocomplete.',
        primaryCategory: 'Agentic Coding',
        customTags: ['coding'],
      },
    ],
    dismissedRecommendations: [],
    audienceMode: 'student',
  },
  solver: {
    latestWorkflow: null,
    history: [],
  },
  build: {
    projects: [],
    activeProjectId: null,
  },
};

/**
 * Full registration data payload — covers all 3 steps:
 * Step 1: Account (name, email, password)
 * Step 2: Academics (institute, stream, program, specialization, year, cohort)
 * Step 3: AI Context (familiarity, usage contexts, primary goal)
 */
export interface RegistrationPayload {
  // Step 1: Account
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  // Step 2: Academics
  instituteId?: string;
  instituteName?: string;
  stream: string;
  streamSubCategory?: string;
  educationLevel: string;
  programId: string;
  programName: string;
  specializationId: string;
  specializationName: string;
  yearOfStudy: number;
  admissionYear: number;
  expectedGraduationYear: number;
  // Step 3: AI Context
  aiFamiliarity?: string;
  aiUsageContexts?: string[];
  primaryGoal?: string;
}

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
  saveClarityTaskResult: (
    topicName: string,
    difficulty: 'easy' | 'medium' | 'advanced',
    result: any
  ) => void;
  selectFocusTrack: (trackName: string) => void;
  changeFocusTrack: (newTrackName: string) => void;
  clearFocusSelection: () => void;
  updateFocusSessionConfig: (config: Partial<FocusSessionConfig>) => void;
  startFocusSession: (params?: {
    trackTitle?: string;
    intention?: string;
    customFocusMinutes?: number;
    customBreakMinutes?: number;
  }) => boolean;
  pauseFocusSession: () => void;
  resumeFocusSession: () => void;
  completeFocusPeriod: () => void;
  startBreakPeriod: (forceLongBreak?: boolean) => void;
  skipBreakPeriod: () => void;
  endFocusSession: (saveAsAbandoned?: boolean) => void;
  clearFocusSessionHistory: () => void;
  investigateSignal: (signalId: string, notes?: string, serverRes?: any) => void;
  completeRelevance: (signalId?: string) => void;
  toggleSaveSignal: (signalId: string) => void;
  dismissSignal: (signalId: string) => void;
  awardCredits: (amount: number, description: string, actionKey?: string) => void;
  setAudienceMode: (mode: AudienceMode) => void;
  addToolToWallet: (
    toolId: string,
    primaryCategory: TaskCategory,
    familiarity?: ToolFamiliarity,
    userNotes?: string
  ) => void;
  addMultipleToolsToWallet: (tools: UserToolItem[]) => void;
  removeToolFromWallet: (toolId: string) => void;
  updateToolFamiliarity: (toolId: string, familiarity: ToolFamiliarity, userNotes?: string) => void;
  dismissRecommendation: (recommendationId: string) => void;
  saveSolvedWorkflow: (workflow: Omit<SolvedWorkflow, 'id' | 'createdAt'>) => void;
  saveUserProject: (project: Omit<UserProject, 'id' | 'createdAt'>) => void;
  setRadarOpportunityContext: (
    ctx: {
      activeSignalId: string;
      opportunityTitle?: string;
      opportunityDesc?: string;
      passedContext?: any;
    } | null
  ) => void;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{
    success: boolean;
    user?: any;
    error?: string;
    totpRequired?: boolean;
    userId?: string;
    role?: string;
  }>;
  register: (
    data: RegistrationPayload
  ) => Promise<{ success: boolean; error?: string; field?: string }>;
  logout: () => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  resetState: () => void;
}

const LearnerContext = createContext<LearnerContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'aiims_learner_state_v3';

export const LearnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [state, setState] = useState<LearnerState>(() => {
    try {
      // Try to load cached user-scoped state first
      const scopedByEmail = Object.keys(localStorage).find(
        (k) => k.startsWith('aiims_learner_state_') && !k.endsWith('_v3') && !k.endsWith('_v4')
      );
      if (scopedByEmail) {
        const scoped = localStorage.getItem(scopedByEmail);
        if (scoped) {
          const parsed = JSON.parse(scoped);
          const resolvedMode = resolveAudienceMode(
            parsed.aiWallet?.audienceMode,
            parsed.academicProfile?.primaryGoal || parsed.profile?.targetGoal
          );
          return {
            ...initialLearnerState,
            ...parsed,
            focus: {
              ...initialLearnerState.focus,
              ...(parsed.focus || {}),
            },
            aiWallet: {
              ...initialLearnerState.aiWallet,
              ...(parsed.aiWallet || {}),
              audienceMode: resolvedMode,
            },
          };
        }
      }
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only load if there's a real user (not the old hardcoded demo)
        if (parsed?.profile?.email && parsed.profile.email !== 'divya@example.com') {
          const resolvedMode = resolveAudienceMode(
            parsed.aiWallet?.audienceMode,
            parsed.academicProfile?.primaryGoal || parsed.profile?.targetGoal
          );
          return {
            ...initialLearnerState,
            ...parsed,
            focus: {
              ...initialLearnerState.focus,
              ...(parsed.focus || {}),
            },
            aiWallet: {
              ...initialLearnerState.aiWallet,
              ...(parsed.aiWallet || {}),
              audienceMode: resolvedMode,
            },
          };
        }
      }
    } catch (e) {
      console.error('Failed to load learner state from storage', e);
    }
    return initialLearnerState;
  });

  // Restore session on mount via /auth/me endpoint using httpOnly cookie or mobile bearer token
  useEffect(() => {
    let isMounted = true;
    apiClient
      .getMe()
      .then(async (res) => {
        if (!isMounted) return;
        if (res?.user || res?.id || res?.email) {
          setIsAuthenticated(true);
          try {
            const stateRes = await apiClient.getLearnerState();
            if (isMounted && stateRes?.success && stateRes?.state) {
              const loaded = stateRes.state;
              if (loaded.profile && loaded.credits) {
                loaded.credits.balance = loaded.profile.aiimsCredits;
              }
              setState(loaded);
            } else if (isMounted && res.state) {
              setState(res.state);
            }
          } catch (stateErr) {
            console.warn(
              'Network issue fetching live state, preserving restored session:',
              stateErr
            );
            if (isMounted && res.state) {
              setState(res.state);
            }
          }
        } else {
          setIsAuthenticated(false);
        }
      })
      .catch((err) => {
        console.warn('Session check failed or unauthenticated:', err);
        if (isMounted) {
          setIsAuthenticated(false);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync state to scoped localStorage and MongoDB Atlas on updates
  useEffect(() => {
    if (!state.profile?.email) return;

    try {
      // Scope localStorage key to user email (prevents cross-user state bleed)
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

  // Reliable Timer Heartbeat & Background-Sleep Synchronizer (Phase 6C)
  // Uses persisted target epoch ms timestamps rather than simple setInterval decrements.
  useEffect(() => {
    const checkTimerSync = () => {
      setState((prev) => {
        const active = prev.focus?.activeSession;
        if (!active || (active.sessionState !== 'focusing' && active.sessionState !== 'break')) {
          return prev;
        }

        if (!active.targetEndTime) {
          return prev;
        }

        const now = Date.now();
        const msRemaining = active.targetEndTime - now;

        // Has period elapsed?
        if (msRemaining <= 0) {
          if (active.periodType === 'focus') {
            const accumulated = active.totalPeriodSeconds;
            const newCycles = active.completedCycles + 1;
            const record: FocusSessionRecord = {
              id: active.id,
              trackTitle: active.trackTitle,
              intention: active.intention,
              focusDurationMinutes: Math.round(active.totalPeriodSeconds / 60),
              actualFocusSeconds: accumulated,
              breakDurationMinutes: active.config.breakDurationMinutes,
              startedAt: new Date(active.sessionStartEpoch).toISOString(),
              completedAt: new Date().toISOString(),
              status: 'completed',
              cyclesCompleted: newCycles,
            };

            playSessionCompleteSound(active.config.soundEnabled);
            sendFocusNotification(
              'Focus Period Completed!',
              `Great job! You finished ${Math.round(active.totalPeriodSeconds / 60)} minutes of focus on ${active.trackTitle}.`
            );

            const prevHistory = prev.focus.sessionHistory || [];
            // Prevent duplicate completion records
            const alreadyLogged = prevHistory.some(
              (r) => r.id === active.id && r.cyclesCompleted === newCycles
            );
            const updatedHistory = alreadyLogged ? prevHistory : [record, ...prevHistory];

            return {
              ...prev,
              focus: {
                ...prev.focus,
                activeSession: {
                  ...active,
                  sessionState: 'completed',
                  remainingSeconds: 0,
                  targetEndTime: null,
                  completedCycles: newCycles,
                  accumulatedFocusSeconds: accumulated,
                },
                sessionHistory: updatedHistory,
              },
            };
          } else {
            // Break period finished
            playBreakCompleteSound(active.config.soundEnabled);
            sendFocusNotification(
              'Break Finished!',
              'Your break has ended. Ready to start your next focus session?'
            );

            return {
              ...prev,
              focus: {
                ...prev.focus,
                activeSession: {
                  ...active,
                  sessionState: 'idle',
                  remainingSeconds: 0,
                  targetEndTime: null,
                },
              },
            };
          }
        } else {
          // Period still running: sync remainingSeconds accurately
          const remainingSec = Math.max(0, Math.ceil(msRemaining / 1000));
          if (remainingSec === active.remainingSeconds) {
            return prev;
          }
          const elapsed =
            active.periodType === 'focus'
              ? Math.max(0, active.totalPeriodSeconds - remainingSec)
              : 0;
          const newAccumulated =
            active.periodType === 'focus'
              ? Math.max(active.accumulatedFocusSeconds, elapsed)
              : active.accumulatedFocusSeconds;

          return {
            ...prev,
            focus: {
              ...prev.focus,
              activeSession: {
                ...active,
                remainingSeconds: remainingSec,
                accumulatedFocusSeconds: newAccumulated,
              },
            },
          };
        }
      });
    };

    const interval = setInterval(checkTimerSync, 500);

    const handleVisibilityOrFocus = () => {
      checkTimerSync();
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, []);

  const saveAssessmentAnswer = (questionId: number, value: any) => {
    setState((prev) => ({
      ...prev,
      assessment: {
        ...prev.assessment,
        status: prev.assessment.status === 'completed' ? 'completed' : 'in_progress',
        answers: {
          ...prev.assessment.answers,
          [questionId]: value,
        },
      },
    }));
  };

  const setQuestionIndex = (index: number) => {
    setState((prev) => ({
      ...prev,
      assessment: {
        ...prev.assessment,
        currentQuestionIndex: index,
      },
    }));
  };

  // Dynamic Score Calculation from 25 Questions via Assessment Scoring Engine
  const calculateScoresFromAnswers = (
    answers: Record<number, any>
  ): {
    scores: {
      usageFrequency: number;
      evaluationCapability: number;
      workflowDesign: number;
      strategicVision: number;
      mentorshipReadiness: number;
    };
    topCapability: string;
    growthArea: string;
    evaluationResult: AssessmentEvaluationResult;
  } => {
    const result = evaluateAssessment(answers);

    return {
      scores: result.legacyScores,
      topCapability: result.strongestSkill.name,
      growthArea: result.roomToGrow.name,
      evaluationResult: result,
    };
  };

  const completeAssessment = async () => {
    const nowStr = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const rewardAmount = 50;
    const actionKey = 'ASSESSMENT_COMPLETION';

    let serverEvaluationResult: AssessmentEvaluationResult | undefined;
    let serverUpdatedBalance: number | undefined;
    try {
      const serverRes = await apiClient.submitAssessment(state.assessment.answers || {});
      if (serverRes?.evaluationResult) {
        serverEvaluationResult = serverRes.evaluationResult;
      }
      if (typeof serverRes?.updatedBalance === 'number') {
        serverUpdatedBalance = serverRes.updatedBalance;
      }
    } catch (err) {
      console.warn('Backend evaluation endpoint call warning, falling back to client engine:', err);
    }

    setState((prev) => {
      if (
        prev.assessment.status === 'completed' ||
        prev.credits.claimedActions.includes(actionKey)
      ) {
        return prev; // Idempotent check
      }

      const calculated = calculateScoresFromAnswers(prev.assessment.answers || {});
      const finalEvalResult = serverEvaluationResult || calculated.evaluationResult;
      const newBalance =
        typeof serverUpdatedBalance === 'number'
          ? serverUpdatedBalance
          : prev.credits.balance + rewardAmount;

      const newTx: CreditTransactionItem = {
        id: `tx-assessment-${Date.now()}`,
        description: 'Assessment Completed Reward',
        amount: rewardAmount,
        type: 'EARN',
        timestamp: nowStr,
        actionKey,
      };

      const newNotif: AppNotification = {
        id: `notif-assessment-${Date.now()}`,
        title: 'Assessment Complete',
        message: `You completed your AI baseline assessment (+${rewardAmount} Credits)! Your analysis is now unlocked.`,
        timestamp: 'Just now',
        targetTab: 'analysis',
        read: false,
      };

      return {
        ...prev,
        profile: {
          ...prev.profile,
          stage: 'Recognising',
          xpPoints: prev.profile.xpPoints + 500,
          aiimsCredits: newBalance,
        },
        assessment: {
          ...prev.assessment,
          status: 'completed',
          completedAt: nowStr,
          rewardClaimed: true,
          scores: finalEvalResult.legacyScores,
          evaluationResult: finalEvalResult,
        },
        analysis: {
          status: 'unlocked',
          topCapability: finalEvalResult.strongestSkill.name,
          growthArea: finalEvalResult.roomToGrow.name,
        },
        clarity: {
          ...prev.clarity,
          status: 'unlocked',
          selectedAreas: [
            finalEvalResult.roomToGrow.name,
            'AI Workflow Design',
            'AI Agents & Autonomous Workflows',
          ],
        },
        focus: {
          ...prev.focus,
          status: 'unlocked',
          selectedTrack: null,
        },
        credits: {
          balance: newBalance,
          transactions: [newTx, ...prev.credits.transactions],
          claimedActions: [...prev.credits.claimedActions, actionKey],
        },
        aiWallet: {
          ...prev.aiWallet,
          userTools:
            prev.aiWallet?.userTools && prev.aiWallet.userTools.length > 0
              ? prev.aiWallet.userTools
              : [
                  {
                    toolId: 'tool-chatgpt',
                    addedAt: nowStr,
                    familiarity: 'proficient',
                    primaryCategory: 'Reasoning & Writing',
                    userNotes: 'Auto-added from Assessment: Daily reasoning & prompt engineering',
                    customTags: ['assessment-baseline'],
                  },
                  {
                    toolId: 'tool-cursor',
                    addedAt: nowStr,
                    familiarity: 'practicing',
                    primaryCategory: 'Agentic Coding',
                    userNotes: 'Auto-added from Assessment: Matched Challenge 12 Prototype Prompt',
                    customTags: ['assessment-prompt'],
                  },
                  {
                    toolId: 'tool-claude',
                    addedAt: nowStr,
                    familiarity: 'practicing',
                    primaryCategory: 'Reasoning & Writing',
                    userNotes:
                      'Auto-added from Assessment: Matched Challenge 11 Architecture Prompt',
                    customTags: ['assessment-prompt'],
                  },
                ],
        },
        notifications: [newNotif, ...prev.notifications],
      };
    });
  };

  const unlockAnalysis = () => {
    setState((prev) => ({
      ...prev,
      analysis: { ...prev.analysis, status: 'unlocked' },
    }));
  };

  const viewAnalysis = useCallback(() => {
    setState((prev) => ({
      ...prev,
      analysis: { ...prev.analysis, status: 'viewed' },
      clarity: {
        ...prev.clarity,
        status: prev.clarity.status === 'locked' ? 'unlocked' : prev.clarity.status,
      },
      focus: {
        ...prev.focus,
        status: prev.focus.status === 'locked' ? 'unlocked' : prev.focus.status,
      },
    }));
  }, []);

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
          selectedTopic: areaName,
        },
      };
    });
  };

  const selectFocusTrack = (trackName: string) => {
    const nowStr = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    setState((prev) => {
      const prevHistory = prev.focus.history || [];
      const updatedHistory = prevHistory.includes(trackName)
        ? prevHistory
        : [trackName, ...prevHistory];
      return {
        ...prev,
        focus: {
          ...prev.focus,
          status: 'active',
          selectedTrack: trackName,
          history: updatedHistory,
          activatedAt: nowStr,
        },
        investigation: {
          ...prev.investigation,
          status: 'available',
        },
      };
    });
  };

  const changeFocusTrack = (newTrackName: string) => {
    const nowStr = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    setState((prev) => {
      const prevTrack = prev.focus.selectedTrack;
      const prevHistory = prev.focus.history || [];
      const updatedHistory = [...prevHistory];
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
          activatedAt: nowStr,
        },
      };
    });
  };

  const clearFocusSelection = () => {
    setState((prev) => ({
      ...prev,
      focus: {
        ...prev.focus,
        status: prev.focus.status === 'locked' ? 'locked' : 'unlocked',
      },
    }));
  };

  // ==========================================
  // FOCUS SESSION MANAGEMENT (Phase 6C)
  // ==========================================

  const updateFocusSessionConfig = (newConfig: Partial<FocusSessionConfig>) => {
    setState((prev) => {
      const currentConfig = prev.focus.sessionConfig || {
        focusDurationMinutes: 25,
        breakDurationMinutes: 5,
        enableLongBreak: true,
        longBreakDurationMinutes: 15,
        longBreakInterval: 4,
        soundEnabled: true,
      };

      const updated = {
        ...currentConfig,
        ...newConfig,
      };

      const parsedFocus = Number(updated.focusDurationMinutes);
      updated.focusDurationMinutes = isNaN(parsedFocus)
        ? 25
        : Math.max(1, Math.min(180, parsedFocus));

      const parsedBreak = Number(updated.breakDurationMinutes);
      updated.breakDurationMinutes = isNaN(parsedBreak)
        ? 5
        : Math.max(1, Math.min(60, parsedBreak));

      const parsedLongBreak = Number(updated.longBreakDurationMinutes);
      updated.longBreakDurationMinutes = isNaN(parsedLongBreak)
        ? 15
        : Math.max(1, Math.min(60, parsedLongBreak));

      const parsedInterval = Number(updated.longBreakInterval);
      updated.longBreakInterval = isNaN(parsedInterval)
        ? 4
        : Math.max(1, Math.min(12, parsedInterval));

      return {
        ...prev,
        focus: {
          ...prev.focus,
          sessionConfig: updated,
          activeSession: prev.focus.activeSession
            ? {
                ...prev.focus.activeSession,
                config: updated,
              }
            : prev.focus.activeSession,
        },
      };
    });
  };

  const startFocusSession = (params?: {
    trackTitle?: string;
    intention?: string;
    customFocusMinutes?: number;
    customBreakMinutes?: number;
  }): boolean => {
    let started = false;

    setState((prev) => {
      // Guard against starting if session is currently active
      if (
        prev.focus.activeSession &&
        (prev.focus.activeSession.sessionState === 'focusing' ||
          prev.focus.activeSession.sessionState === 'paused' ||
          prev.focus.activeSession.sessionState === 'break')
      ) {
        return prev;
      }

      const config = prev.focus.sessionConfig || {
        focusDurationMinutes: 25,
        breakDurationMinutes: 5,
        enableLongBreak: true,
        longBreakDurationMinutes: 15,
        longBreakInterval: 4,
        soundEnabled: true,
      };

      const parsedCustomFocus =
        params?.customFocusMinutes !== undefined ? Number(params.customFocusMinutes) : NaN;
      const focusMinutes = !isNaN(parsedCustomFocus)
        ? Math.max(1, Math.min(180, parsedCustomFocus))
        : config.focusDurationMinutes;

      const parsedCustomBreak =
        params?.customBreakMinutes !== undefined ? Number(params.customBreakMinutes) : NaN;
      const breakMinutes = !isNaN(parsedCustomBreak)
        ? Math.max(1, Math.min(60, parsedCustomBreak))
        : config.breakDurationMinutes;

      const effectiveConfig: FocusSessionConfig = {
        ...config,
        focusDurationMinutes: focusMinutes,
        breakDurationMinutes: breakMinutes,
      };

      const track = params?.trackTitle?.trim() || prev.focus.selectedTrack || 'AI Workflow Design';
      const durationSeconds = focusMinutes * 60;
      const now = Date.now();
      const targetEndTime = now + durationSeconds * 1000;

      const newSession: ActiveFocusSessionState = {
        id: `foc-sess-${now}`,
        trackTitle: track,
        intention: params?.intention?.trim() || '',
        sessionState: 'focusing',
        periodType: 'focus',
        targetEndTime,
        totalPeriodSeconds: durationSeconds,
        remainingSeconds: durationSeconds,
        pausedAt: null,
        accumulatedFocusSeconds: 0,
        sessionStartEpoch: now,
        completedCycles: 0,
        config: effectiveConfig,
      };

      started = true;

      return {
        ...prev,
        focus: {
          ...prev.focus,
          status: 'active',
          selectedTrack: track,
          activeSession: newSession,
        },
      };
    });

    return started;
  };

  const pauseFocusSession = () => {
    setState((prev) => {
      const active = prev.focus.activeSession;
      if (!active || (active.sessionState !== 'focusing' && active.sessionState !== 'break')) {
        return prev;
      }

      const now = Date.now();
      const remainingSeconds = active.targetEndTime
        ? Math.max(0, Math.ceil((active.targetEndTime - now) / 1000))
        : active.remainingSeconds;

      const elapsed =
        active.periodType === 'focus'
          ? Math.max(0, active.totalPeriodSeconds - remainingSeconds)
          : 0;
      const newAccumulated =
        active.periodType === 'focus'
          ? Math.max(active.accumulatedFocusSeconds, elapsed)
          : active.accumulatedFocusSeconds;

      return {
        ...prev,
        focus: {
          ...prev.focus,
          activeSession: {
            ...active,
            sessionState: 'paused',
            remainingSeconds,
            targetEndTime: null,
            pausedAt: now,
            accumulatedFocusSeconds: newAccumulated,
          },
        },
      };
    });
  };

  const resumeFocusSession = () => {
    setState((prev) => {
      const active = prev.focus.activeSession;
      if (!active || active.sessionState !== 'paused') {
        return prev;
      }

      const now = Date.now();
      const targetEndTime = now + active.remainingSeconds * 1000;

      return {
        ...prev,
        focus: {
          ...prev.focus,
          activeSession: {
            ...active,
            sessionState: active.periodType === 'focus' ? 'focusing' : 'break',
            targetEndTime,
            pausedAt: null,
          },
        },
      };
    });
  };

  const completeFocusPeriod = () => {
    setState((prev) => {
      const active = prev.focus.activeSession;
      if (!active) return prev;

      const newCycles = active.completedCycles + 1;
      const actualSeconds =
        active.periodType === 'focus'
          ? Math.max(
              active.accumulatedFocusSeconds,
              active.totalPeriodSeconds - active.remainingSeconds
            )
          : active.accumulatedFocusSeconds;

      const record: FocusSessionRecord = {
        id: active.id,
        trackTitle: active.trackTitle,
        intention: active.intention,
        focusDurationMinutes: Math.round(active.totalPeriodSeconds / 60),
        actualFocusSeconds: actualSeconds,
        breakDurationMinutes: active.config.breakDurationMinutes,
        startedAt: new Date(active.sessionStartEpoch).toISOString(),
        completedAt: new Date().toISOString(),
        status: 'completed',
        cyclesCompleted: newCycles,
      };

      playSessionCompleteSound(active.config.soundEnabled);
      sendFocusNotification(
        'Focus Period Completed!',
        `Great job! You finished ${Math.round(active.totalPeriodSeconds / 60)} minutes of focus on ${active.trackTitle}.`
      );

      const prevHistory = prev.focus.sessionHistory || [];
      const alreadyLogged = prevHistory.some(
        (r) => r.id === active.id && r.cyclesCompleted === newCycles
      );
      const updatedHistory = alreadyLogged ? prevHistory : [record, ...prevHistory];

      return {
        ...prev,
        focus: {
          ...prev.focus,
          activeSession: {
            ...active,
            sessionState: 'completed',
            remainingSeconds: 0,
            targetEndTime: null,
            completedCycles: newCycles,
            accumulatedFocusSeconds: actualSeconds,
          },
          sessionHistory: updatedHistory,
        },
      };
    });
  };

  const startBreakPeriod = (forceLongBreak?: boolean) => {
    setState((prev) => {
      const active = prev.focus.activeSession;
      if (!active) return prev;

      const isLong =
        forceLongBreak ||
        (active.config.enableLongBreak &&
          active.completedCycles > 0 &&
          active.completedCycles % active.config.longBreakInterval === 0);

      const breakMins = isLong
        ? active.config.longBreakDurationMinutes
        : active.config.breakDurationMinutes;
      const breakSecs = breakMins * 60;
      const now = Date.now();
      const targetEndTime = now + breakSecs * 1000;

      return {
        ...prev,
        focus: {
          ...prev.focus,
          activeSession: {
            ...active,
            sessionState: 'break',
            periodType: isLong ? 'long_break' : 'short_break',
            totalPeriodSeconds: breakSecs,
            remainingSeconds: breakSecs,
            targetEndTime,
            pausedAt: null,
          },
        },
      };
    });
  };

  const skipBreakPeriod = () => {
    setState((prev) => {
      const active = prev.focus.activeSession;
      if (!active) return prev;

      const focusMins = active.config.focusDurationMinutes;
      const focusSecs = focusMins * 60;
      const now = Date.now();
      const targetEndTime = now + focusSecs * 1000;

      return {
        ...prev,
        focus: {
          ...prev.focus,
          activeSession: {
            ...active,
            sessionState: 'focusing',
            periodType: 'focus',
            totalPeriodSeconds: focusSecs,
            remainingSeconds: focusSecs,
            targetEndTime,
            pausedAt: null,
          },
        },
      };
    });
  };

  const endFocusSession = (saveAsAbandoned?: boolean) => {
    setState((prev) => {
      const active = prev.focus.activeSession;
      if (!active) return prev;

      let updatedHistory = prev.focus.sessionHistory || [];

      // Save partial session if user spent at least 30 seconds focused and it wasn't finished
      const shouldSaveAbandoned =
        (saveAsAbandoned ?? true) &&
        active.sessionState !== 'completed' &&
        active.accumulatedFocusSeconds >= 30;

      if (shouldSaveAbandoned) {
        const record: FocusSessionRecord = {
          id: active.id,
          trackTitle: active.trackTitle,
          intention: active.intention,
          focusDurationMinutes: Math.round(active.totalPeriodSeconds / 60),
          actualFocusSeconds: active.accumulatedFocusSeconds,
          breakDurationMinutes: active.config.breakDurationMinutes,
          startedAt: new Date(active.sessionStartEpoch).toISOString(),
          completedAt: new Date().toISOString(),
          status: 'abandoned',
          cyclesCompleted: active.completedCycles,
        };
        const alreadyLogged = updatedHistory.some(
          (r) => r.id === active.id && r.status === 'abandoned'
        );
        if (!alreadyLogged) {
          updatedHistory = [record, ...updatedHistory];
        }
      }

      return {
        ...prev,
        focus: {
          ...prev.focus,
          activeSession: null,
          sessionHistory: updatedHistory,
        },
      };
    });
  };

  const clearFocusSessionHistory = () => {
    setState((prev) => ({
      ...prev,
      focus: {
        ...prev.focus,
        sessionHistory: [],
      },
    }));
  };

  // Strictly Idempotent Investigation Reward Handling
  const investigateSignal = (signalId: string, notes?: string, serverRes?: any) => {
    const rewardAmount = 30;
    const actionKey = `INVESTIGATE_SIGNAL_${signalId}`;
    const nowStr = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    setState((prev) => {
      const alreadyClaimed =
        prev.credits.claimedActions.includes(actionKey) ||
        prev.credits.claimedActions.includes(signalId);
      const newInvestigated = prev.radar.investigatedSignalIds.includes(signalId)
        ? prev.radar.investigatedSignalIds
        : [...prev.radar.investigatedSignalIds, signalId];

      if (alreadyClaimed || serverRes?.awarded === false) {
        const syncBalance =
          typeof serverRes?.newBalance === 'number' ? serverRes.newBalance : prev.credits.balance;
        return {
          ...prev,
          profile: { ...prev.profile, aiimsCredits: syncBalance },
          credits: { ...prev.credits, balance: syncBalance },
          radar: { ...prev.radar, investigatedSignalIds: newInvestigated },
          investigation: {
            ...prev.investigation,
            status: 'completed',
            selectedSignalId: signalId,
            userNotes: { ...prev.investigation.userNotes, ...(notes ? { [signalId]: notes } : {}) },
          },
          relevance: { ...prev.relevance, status: 'unlocked' },
        };
      }

      const newBalance =
        typeof serverRes?.newBalance === 'number'
          ? serverRes.newBalance
          : prev.credits.balance + rewardAmount;
      const newTx: CreditTransactionItem = {
        id: `tx-investigate-${Date.now()}`,
        description: `Signal Investigation Completed`,
        amount: rewardAmount,
        type: 'EARN',
        timestamp: nowStr,
        actionKey,
      };

      const newNotif: AppNotification = {
        id: `notif-investigate-${Date.now()}`,
        title: 'Signal Investigated',
        message: `You completed a signal investigation (+${rewardAmount} Credits)! AI Relevance map is now available.`,
        timestamp: 'Just now',
        targetTab: 'relevance',
        read: false,
      };

      return {
        ...prev,
        profile: { ...prev.profile, aiimsCredits: newBalance },
        radar: { ...prev.radar, investigatedSignalIds: newInvestigated },
        investigation: {
          ...prev.investigation,
          status: 'completed',
          selectedSignalId: signalId,
          userNotes: { ...prev.investigation.userNotes, ...(notes ? { [signalId]: notes } : {}) },
        },
        relevance: { ...prev.relevance, status: 'unlocked' },
        credits: {
          balance: newBalance,
          transactions: [newTx, ...prev.credits.transactions],
          claimedActions: [...prev.credits.claimedActions, actionKey, signalId],
        },
        notifications: [newNotif, ...prev.notifications],
      };
    });
  };

  const completeRelevance = useCallback((_signalId?: string) => {
    setState((prev) => ({
      ...prev,
      relevance: {
        ...prev.relevance,
        status: 'completed',
      },
    }));
  }, []);

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
          savedSignalIds: updated,
        },
      };
    });
  };

  const dismissSignal = (signalId: string) => {
    setState((prev) => ({
      ...prev,
      radar: {
        ...prev.radar,
        dismissedSignalIds: [...(prev.radar?.dismissedSignalIds || []), signalId],
      },
    }));
  };

  const awardCredits = (amount: number, description: string, actionKey?: string) => {
    const key = actionKey || `CUSTOM_${Date.now()}_${amount}`;
    const nowStr = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

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
        actionKey: key,
      };
      return {
        ...prev,
        profile: { ...prev.profile, aiimsCredits: newBalance },
        credits: {
          balance: newBalance,
          transactions: [newTx, ...prev.credits.transactions],
          claimedActions: [...prev.credits.claimedActions, key],
        },
      };
    });
  };

  const markNotificationRead = (id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  };

  const clearNotifications = () => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
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
          ? prev.clarity.completedTopics.includes(topicName)
            ? 'completed'
            : 'in_progress'
          : prev.clarity.status === 'locked'
            ? 'locked'
            : 'unlocked',
      },
    }));
  };

  const saveClarityReflection = (topicName: string, text: string) => {
    setState((prev) => ({
      ...prev,
      clarity: {
        ...prev.clarity,
        reflections: {
          ...prev.clarity.reflections,
          [topicName]: text,
        },
      },
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
          status: 'completed',
        },
        focus: {
          ...prev.focus,
          status: prev.focus.status === 'locked' ? 'unlocked' : prev.focus.status,
        },
      };
    });
  };

  const saveClarityTaskResult = (
    topicName: string,
    difficulty: 'easy' | 'medium' | 'advanced',
    result: any
  ) => {
    // 1. Immediately record task execution in state
    setState((prev) => {
      const prevScores = prev.clarity.taskScores || {};
      const topicScores = prevScores[topicName] || {};
      const updatedTopicScores = {
        ...topicScores,
        [difficulty]: {
          ...result,
          completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      };

      return {
        ...prev,
        clarity: {
          ...prev.clarity,
          status: 'in_progress',
          taskScores: {
            ...prevScores,
            [topicName]: updatedTopicScores,
          },
        },
      };
    });

    const taskId = `task-${difficulty}`;
    // 2. Sync to authoritative server endpoint
    apiClient
      .saveClarityTaskScore({
        topic: topicName,
        difficulty,
        taskId,
        score: result.score,
        userPrompt: result.userPrompt,
        output: result.output,
      })
      .then((serverRes) => {
        if (serverRes?.success) {
          setState((prev) => {
            const actionKey =
              serverRes.actionKey || `clarity::${topicName}::${difficulty}::${taskId}`;
            const isAlreadyClaimed = prev.credits.claimedActions.includes(actionKey);

            if (!serverRes.awarded || isAlreadyClaimed) {
              // Already awarded previously: synchronize authoritative balance without duplicate tx
              return {
                ...prev,
                profile: {
                  ...prev.profile,
                  xpPoints: serverRes.totalXP ?? prev.profile.xpPoints,
                  aiimsCredits: serverRes.totalCredits ?? prev.profile.aiimsCredits,
                },
                credits: {
                  ...prev.credits,
                  balance: serverRes.totalCredits ?? prev.credits.balance,
                  claimedActions: isAlreadyClaimed
                    ? prev.credits.claimedActions
                    : [...prev.credits.claimedActions, actionKey],
                },
              };
            }

            // First-time award from server
            const nowStr = new Date().toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            const newTx: CreditTransactionItem = serverRes.transaction
              ? {
                  id: serverRes.transaction.id,
                  description: serverRes.transaction.description,
                  amount: serverRes.transaction.amount,
                  type: serverRes.transaction.type || 'EARN',
                  timestamp: serverRes.transaction.timestamp || nowStr,
                  actionKey,
                }
              : {
                  id: `tx-task-${Date.now()}`,
                  description: `Level 2 AI Task (${difficulty.toUpperCase()}): ${topicName} (+${serverRes.rewardCredits || 15} AC)`,
                  amount: serverRes.rewardCredits || 15,
                  type: 'EARN',
                  timestamp: nowStr,
                  actionKey,
                };

            return {
              ...prev,
              profile: {
                ...prev.profile,
                xpPoints: serverRes.totalXP ?? prev.profile.xpPoints + 50,
                aiimsCredits: serverRes.totalCredits ?? prev.profile.aiimsCredits + 15,
              },
              credits: {
                ...prev.credits,
                balance: serverRes.totalCredits ?? prev.credits.balance + 15,
                transactions: [newTx, ...prev.credits.transactions],
                claimedActions: [...prev.credits.claimedActions, actionKey],
              },
            };
          });
        }
      })
      .catch((err) => {
        console.warn(
          'Failed to sync task score to server, applying idempotent local fallback:',
          err
        );
        setState((prev) => {
          const actionKey = `clarity::${topicName}::${difficulty}::${taskId}`;
          if (prev.credits.claimedActions.includes(actionKey)) return prev;

          const rewardCredits = 15;
          const rewardXP = 50;
          const nowStr = new Date().toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
          const tx: CreditTransactionItem = {
            id: `tx-task-${Date.now()}`,
            description: `Level 2 AI Task (${difficulty.toUpperCase()}): ${topicName} (+${rewardCredits} AC)`,
            amount: rewardCredits,
            type: 'EARN',
            timestamp: nowStr,
            actionKey,
          };

          const newBal = prev.credits.balance + rewardCredits;
          return {
            ...prev,
            profile: {
              ...prev.profile,
              xpPoints: prev.profile.xpPoints + rewardXP,
              aiimsCredits: newBal,
            },
            credits: {
              ...prev.credits,
              balance: newBal,
              transactions: [tx, ...prev.credits.transactions],
              claimedActions: [...prev.credits.claimedActions, actionKey],
            },
          };
        });
      });
  };

  const login = async (
    email: string,
    password: string
  ): Promise<{
    success: boolean;
    user?: any;
    error?: string;
    totpRequired?: boolean;
    userId?: string;
    role?: string;
  }> => {
    try {
      const res = await apiFetch(`${getApiBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Email or password is incorrect.' };
      }
      // Staff accounts with 2FA enabled — return challenge without setting session
      if (data.totpRequired) {
        return { success: true, totpRequired: true, userId: data.userId, role: data.role };
      }
      if (data.token) {
        setAuthToken(data.token);
      }
      setIsAuthenticated(true);
      const userObj = data.user || data.state?.profile;
      if (data.state) {
        setState(data.state);
      } else if (data.user) {
        setState((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            ...data.user,
          },
        }));
      }
      return { success: true, user: userObj };
    } catch {
      return { success: false, error: "We couldn't sign you in right now. Please try again." };
    }
  };

  const register = async (
    payload: RegistrationPayload
  ): Promise<{ success: boolean; error?: string; field?: string }> => {
    try {
      const res = await apiFetch(`${getApiBaseUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: resData.error || 'Registration failed.',
          field: resData.field,
        };
      }
      if (resData.token) {
        setAuthToken(resData.token);
      }
      setIsAuthenticated(true);
      const defaultMode: AudienceMode =
        payload.primaryGoal === 'ENTREPRENEURSHIP' ? 'entrepreneur' : 'student';
      if (resData.state) {
        setState({
          ...initialLearnerState,
          ...resData.state,
          aiWallet: {
            ...(resData.state.aiWallet || initialLearnerState.aiWallet),
            audienceMode: resData.state.aiWallet?.audienceMode || defaultMode,
          },
        });
      } else if (resData.user) {
        setState((prev) => ({
          ...prev,
          profile: { ...prev.profile, ...resData.user },
          academicProfile: resData.academicProfile || prev.academicProfile,
          aiWallet: {
            ...prev.aiWallet,
            audienceMode: prev.aiWallet?.audienceMode || defaultMode,
          },
        }));
      }
      return { success: true };
    } catch {
      return {
        success: false,
        error: "We couldn't create your account right now. Please try again.",
      };
    }
  };

  const logout = () => {
    apiClient.logout().catch((err) => {
      console.warn('Backend logout warning:', err);
    });
    setAuthToken(null);
    setIsAuthenticated(false);
    setState(initialLearnerState);
    if (window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
    }
  };

  const setAudienceMode = (mode: AudienceMode) => {
    setState((prev) => ({
      ...prev,
      aiWallet: {
        ...prev.aiWallet,
        audienceMode: mode,
      },
    }));
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
        customTags: ['my-toolkit'],
      };

      return {
        ...prev,
        aiWallet: {
          ...prev.aiWallet,
          userTools: [newItem, ...currentTools],
        },
      };
    });
  };

  const addMultipleToolsToWallet = (newTools: UserToolItem[]) => {
    setState((prev) => {
      const currentTools = prev.aiWallet?.userTools || [];
      const currentIds = new Set(currentTools.map((t) => t.toolId));
      const toolsToAdd = newTools.filter((t) => !currentIds.has(t.toolId));
      if (toolsToAdd.length === 0) return prev;

      return {
        ...prev,
        aiWallet: {
          ...prev.aiWallet,
          userTools: [...toolsToAdd, ...currentTools],
        },
      };
    });
  };

  const removeToolFromWallet = (toolId: string) => {
    setState((prev) => ({
      ...prev,
      aiWallet: {
        ...prev.aiWallet,
        userTools: (prev.aiWallet?.userTools || []).filter((t) => t.toolId !== toolId),
      },
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
        ),
      },
    }));
  };

  const dismissRecommendation = (recommendationId: string) => {
    setState((prev) => ({
      ...prev,
      aiWallet: {
        ...prev.aiWallet,
        dismissedRecommendations: [
          ...(prev.aiWallet?.dismissedRecommendations || []),
          recommendationId,
        ],
      },
    }));
  };

  const saveSolvedWorkflow = (workflow: Omit<SolvedWorkflow, 'id' | 'createdAt'>) => {
    const fullWorkflow: SolvedWorkflow = {
      ...workflow,
      id: `wf-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => {
      const currentSolver = prev.solver || { latestWorkflow: null, history: [] };
      return {
        ...prev,
        solver: {
          latestWorkflow: fullWorkflow,
          history: [fullWorkflow, ...currentSolver.history],
        },
      };
    });
  };

  const saveUserProject = (project: Omit<UserProject, 'id' | 'createdAt'>) => {
    const fullProject: UserProject = {
      ...project,
      id: `proj-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => {
      const currentBuild = prev.build || { projects: [], activeProjectId: null };
      return {
        ...prev,
        build: {
          projects: [fullProject, ...currentBuild.projects],
          activeProjectId: fullProject.id,
        },
      };
    });
  };

  const setRadarOpportunityContext = (
    ctx: {
      activeSignalId: string;
      opportunityTitle?: string;
      opportunityDesc?: string;
      passedContext?: any;
    } | null
  ) => {
    setState((prev) => ({
      ...prev,
      radarOpportunityContext: ctx
        ? {
            activeSignalId: ctx.activeSignalId,
            opportunityTitle: ctx.opportunityTitle,
            opportunityDesc: ctx.opportunityDesc,
            passedContext: ctx.passedContext,
          }
        : undefined,
    }));
  };

  return (
    <LearnerContext.Provider
      value={{
        state,
        isAuthenticated,
        isAuthLoading,
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
        saveClarityTaskResult,
        selectFocusTrack,
        changeFocusTrack,
        clearFocusSelection,
        updateFocusSessionConfig,
        startFocusSession,
        pauseFocusSession,
        resumeFocusSession,
        completeFocusPeriod,
        startBreakPeriod,
        skipBreakPeriod,
        endFocusSession,
        clearFocusSessionHistory,
        investigateSignal,
        completeRelevance,
        toggleSaveSignal,
        dismissSignal,
        awardCredits,
        setAudienceMode,
        addToolToWallet,
        addMultipleToolsToWallet,
        removeToolFromWallet,
        updateToolFamiliarity,
        dismissRecommendation,
        saveSolvedWorkflow,
        saveUserProject,
        setRadarOpportunityContext,
        markNotificationRead,
        clearNotifications,
        resetState,
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
