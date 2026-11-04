import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowRight,
  Compass,
  Target,
  Wallet,
  Sparkles,
  Route,
  History,
  Radar,
  Wrench,
  Globe,
  Award,
  Zap,
  CheckCircle2,
  Clock,
  Lock,
  Flame,
  Activity,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';

import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CircularProgress } from '../../components/common/ProgressIndicator';
import { Skeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { resolveLearnerNextAction } from '../../services/journeyResolver';
import { getFeatureAccess } from '../../services/featureAccessService';
import { apiClient } from '../../api/client';

export interface HomeScreenProps {
  setActiveTab: (tab: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ setActiveTab }) => {
  const { state } = useLearner();

  // Authoritative Learner Details
  const userName = state.profile?.name ? state.profile.name.split(' ')[0] : 'Learner';
  const userStage = state.profile?.stage || 'Explorer';
  const acBalance = state.credits?.balance ?? state.profile?.aiimsCredits ?? 0;
  const xpBalance = state.profile?.xpPoints ?? 0;

  // Resolve Next Action from authoritative client service
  const nextAction = useMemo(() => resolveLearnerNextAction(state), [state]);

  // Assessment & Module Progress Indicators
  const isAssessmentDone = state.assessment?.status === 'completed';
  const diagnosticScore = state.assessment?.evaluationResult?.overallScore ?? null;
  const clarityLevel = (state.clarity as any)?.level || 'Easy';
  const clarityTasksDone =
    state.clarity?.completedTopics?.length ||
    Object.keys(state.clarity?.taskScores || {}).length ||
    0;

  // Focus Summary
  const focusAny = state.focus as any;
  const focusHistory = state.focus?.sessionHistory || [];
  const todayDateStr = new Date().toDateString();
  const sessionHistoryTodaySec = focusHistory
    .filter((s) => new Date(s.startedAt).toDateString() === todayDateStr)
    .reduce((acc, s) => acc + (s.actualFocusSeconds || 0), 0);
  const rawFocusSec = focusAny?.todayFocusSeconds ?? sessionHistoryTodaySec;
  const todayFocusMinutes = rawFocusSec ? Math.round(rawFocusSec / 60) : 0;
  const completedFocusSessions =
    focusAny?.completedSessionsCount ?? focusHistory.filter((s) => s.status === 'completed').length;
  const activeFocusTrack = state.focus?.selectedTrack;

  // Milestone Progress Calculation
  const completedMilestones = useMemo(() => {
    return nextAction.journeyStages.filter((s) => s.status === 'completed').length;
  }, [nextAction.journeyStages]);
  const progressPercent = Math.round((completedMilestones / 10) * 100);

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Formatted date string
  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  // Verified Catalog State
  const [catalogTools, setCatalogTools] = useState<any[]>([]);
  const [isToolsLoading, setIsToolsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .getWalletCatalog()
      .then((data) => {
        if (isMounted) {
          if (Array.isArray(data)) {
            const valid = data.filter((t: any) => t && t.name).slice(0, 3);
            setCatalogTools(valid);
          }
          setIsToolsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch wallet catalog preview:', err);
        if (isMounted) setIsToolsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const recentTransactions = (state.credits?.transactions || []).slice(0, 3);

  // 9 Core Platforms Quick Access Configuration
  const quickAccessCards = [
    {
      id: 'clarity',
      title: 'Clarity Lab',
      subtitle: 'Systematic Prompt Reasoning',
      desc: 'Master structured prompt engineering and iterative rubric derivation.',
      icon: Compass,
      route: 'clarity',
      color: 'sky',
      badge: `${clarityLevel} Level`,
      accent: 'var(--aiims-token-sky-accent, #0284c7)',
      bg: 'var(--aiims-token-sky-bg, #f0f9ff)',
      border: 'var(--aiims-token-sky-border, #bae6fd)',
      text: 'var(--aiims-token-sky-text, #0369a1)',
    },
    {
      id: 'focus',
      title: 'Focus Track',
      subtitle: 'Deep Work & Concentration',
      desc: 'Structured Pomodoro sprints with verified timekeeping and break protection.',
      icon: Target,
      route: 'focus',
      color: 'coral',
      badge: todayFocusMinutes > 0 ? `${todayFocusMinutes}m Today` : 'Start Sprint',
      accent: 'var(--aiims-token-coral-accent, #e11d48)',
      bg: 'var(--aiims-token-coral-bg, #fff1f2)',
      border: 'var(--aiims-token-coral-border, #fecdd3)',
      text: 'var(--aiims-token-coral-text, #be123c)',
    },
    {
      id: 'wallet',
      title: 'AI Wallet',
      subtitle: 'Authoritative Credit Ledger',
      desc: 'Inspect your AIIMS Credit (AC) balance, claimable rewards, and usage audit logs.',
      icon: Wallet,
      route: 'wallet',
      color: 'sunshine',
      badge: `${acBalance} AC`,
      accent: 'var(--aiims-token-sunshine-accent, #d97706)',
      bg: 'var(--aiims-token-sunshine-bg, #fefce8)',
      border: 'var(--aiims-token-sunshine-border, #fde047)',
      text: 'var(--aiims-token-sunshine-text, #854d0e)',
    },
    {
      id: 'tool-matching',
      title: 'Tool Matching',
      subtitle: 'Intelligent AI Recommendations',
      desc: 'Match verified models and AI platforms to your specific academic tasks.',
      icon: Sparkles,
      route: 'wallet',
      color: 'lavender',
      badge: 'Intent Engine',
      accent: 'var(--aiims-token-lavender-accent, #7c3aed)',
      bg: 'var(--aiims-token-lavender-bg, #f5f3ff)',
      border: 'var(--aiims-token-lavender-border, #ddd6fe)',
      text: 'var(--aiims-token-lavender-text, #5b21b6)',
    },
    {
      id: 'journey',
      title: 'My AI Journey',
      subtitle: 'Curriculum Progression',
      desc: '10-stage milestones roadmap with transparent completion status.',
      icon: Route,
      route: 'journey',
      color: 'mint',
      badge: `${progressPercent}% Complete`,
      accent: 'var(--aiims-token-mint-accent, #059669)',
      bg: 'var(--aiims-token-mint-bg, #ecfdf5)',
      border: 'var(--aiims-token-mint-border, #a7f3d0)',
      text: 'var(--aiims-token-mint-text, #047857)',
    },
    {
      id: 'assessment-history',
      title: 'Assessment History',
      subtitle: 'Verified Attempt Evaluations',
      desc: 'Chronological evaluative history across diagnostic, clarity, and challenge submissions.',
      icon: History,
      route: 'journey',
      color: 'sky',
      badge: 'Separate Attempts',
      accent: 'var(--aiims-token-sky-accent, #0284c7)',
      bg: 'var(--aiims-token-sky-bg, #f0f9ff)',
      border: 'var(--aiims-token-sky-border, #bae6fd)',
      text: 'var(--aiims-token-sky-text, #0369a1)',
    },
    {
      id: 'radar',
      title: 'AI Radar',
      subtitle: 'Telemetry & Emerging Tech',
      desc: 'Monitor real-time shifts, enterprise AI models, and technology signals.',
      icon: Radar,
      route: 'radar',
      color: 'coral',
      badge: 'Signals Feed',
      accent: 'var(--aiims-token-coral-accent, #e11d48)',
      bg: 'var(--aiims-token-coral-bg, #fff1f2)',
      border: 'var(--aiims-token-coral-border, #fecdd3)',
      text: 'var(--aiims-token-coral-text, #be123c)',
    },
    {
      id: 'universe',
      title: 'Learning Universe',
      subtitle: 'Spatial Capability Map',
      desc: 'Interactive 3D representation of your AI competence dimensions and orbital rings.',
      icon: Globe,
      route: 'hero',
      color: 'lavender',
      badge: '3D Spatial',
      accent: 'var(--aiims-token-lavender-accent, #7c3aed)',
      bg: 'var(--aiims-token-lavender-bg, #f5f3ff)',
      border: 'var(--aiims-token-lavender-border, #ddd6fe)',
      text: 'var(--aiims-token-lavender-text, #5b21b6)',
    },
    {
      id: 'solver',
      title: 'Problem Solver',
      subtitle: 'Architecture & Capstones',
      desc: 'Deconstruct real-world enterprise problems and design multi-agent workflows.',
      icon: Wrench,
      route: 'solver',
      color: 'mint',
      badge: 'System Design',
      accent: 'var(--aiims-token-mint-accent, #059669)',
      bg: 'var(--aiims-token-mint-bg, #ecfdf5)',
      border: 'var(--aiims-token-mint-border, #a7f3d0)',
      text: 'var(--aiims-token-mint-text, #047857)',
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        width: '100%',
        maxWidth: '1120px',
        margin: '0 auto',
        boxSizing: 'border-box',
        padding: '0 8px',
      }}
    >
      {/* ======================================================== */}
      {/* SECTION A: WELCOME SECTION                               */}
      {/* ======================================================== */}
      <section
        aria-label="Welcome & Learner Profile Header"
        style={{
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          border: '1px solid var(--aiims-border-card, #ede9fe)',
          borderRadius: '16px',
          padding: '28px 32px',
          boxShadow: 'var(--aiims-shadow-card, 0 4px 16px rgba(99, 102, 241, 0.05))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle decorative top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background:
              'linear-gradient(90deg, var(--aiims-token-lavender-accent, #7c3aed) 0%, var(--aiims-token-sky-accent, #0284c7) 50%, var(--aiims-token-mint-accent, #059669) 100%)',
          }}
        />

        {/* Left Side: Greeting, Date, and Intro */}
        <div style={{ flex: '1 1 480px', minWidth: '280px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--aiims-token-lavender-text, #5b21b6)',
                backgroundColor: 'var(--aiims-token-lavender-bg, #f5f3ff)',
                border: '1px solid var(--aiims-token-lavender-border, #ddd6fe)',
                padding: '3px 10px',
                borderRadius: '9999px',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Sparkles size={12} />
              {userStage} Stage
            </span>

            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--aiims-text-muted, #64748b)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Clock size={13} />
              {formattedDate}
            </span>
          </div>

          <h1
            style={{
              margin: '0 0 10px 0',
              fontSize: '28px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading, #0f172a)',
              letterSpacing: '-0.5px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              lineHeight: 1.25,
            }}
          >
            {greeting}, {userName}.<br />
            <span style={{ color: 'var(--aiims-primary, #6366f1)' }}>
              Ready to advance your verified AI capability?
            </span>
          </h1>

          <p
            style={{
              margin: '0 0 20px 0',
              fontSize: '14px',
              color: 'var(--aiims-text-secondary, #475569)',
              lineHeight: 1.55,
              maxWidth: '560px',
            }}
          >
            You are advancing through <strong>{nextAction.currentStageTitle}</strong>. Follow your
            milestone path to master authentic prompt reasoning, tool stacking, and real-task
            workflows.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Button
              variant="lavender"
              size="md"
              icon={<ArrowRight size={16} />}
              onClick={() => setActiveTab(nextAction.targetTab)}
            >
              Continue: {nextAction.actionButtonLabel}
            </Button>

            <Button
              variant="outline"
              size="md"
              icon={<Route size={16} />}
              onClick={() => setActiveTab('journey')}
            >
              View My AI Journey
            </Button>
          </div>
        </div>

        {/* Right Side: Circular Gauge & Balances */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            padding: '16px 20px',
            borderRadius: '14px',
            backgroundColor: 'var(--aiims-bg-card-hover, #faf9ff)',
            border: '1px solid var(--aiims-border-card, #ede9fe)',
            flexShrink: 0,
          }}
        >
          <CircularProgress
            value={progressPercent}
            size={104}
            strokeWidth={8}
            color="var(--aiims-token-lavender-accent, #7c3aed)"
            label="ROADMAP"
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--aiims-token-mint-bg, #ecfdf5)',
                border: '1px solid var(--aiims-token-mint-border, #a7f3d0)',
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--aiims-token-mint-text, #047857)',
              }}
            >
              <CheckCircle2 size={14} />
              <span>{completedMilestones} / 10 Milestones Done</span>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => setActiveTab('wallet')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveTab('wallet');
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--aiims-token-sunshine-bg, #fefce8)',
                border: '1px solid var(--aiims-token-sunshine-border, #fde047)',
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--aiims-token-sunshine-text, #854d0e)',
                cursor: 'pointer',
              }}
            >
              <Zap size={14} />
              <span>{acBalance.toLocaleString()} Credits</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--aiims-primary-light, #eef2ff)',
                border: '1px solid var(--aiims-border-card, #ede9fe)',
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--aiims-primary, #4338ca)',
              }}
            >
              <Award size={14} />
              <span>{xpBalance.toLocaleString()} XP Points</span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION B: LEARNING PROGRESS OVERVIEW (6 KEY TILES)     */}
      {/* ======================================================== */}
      <section aria-label="Learning Progress Overview">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '14px',
          }}
        >
          {/* Tile 1: Stage Progress */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'var(--aiims-bg-card, #ffffff)',
              border: '1px solid var(--aiims-border-card, #ede9fe)',
              boxShadow: 'var(--aiims-shadow-card, 0 2px 8px rgba(99, 102, 241, 0.04))',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-muted, #64748b)',
                  textTransform: 'uppercase',
                }}
              >
                Roadmap
              </span>
              <Route size={16} color="var(--aiims-token-mint-accent, #059669)" />
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading, #0f172a)',
              }}
            >
              {progressPercent}%
            </div>
            <div
              style={{
                fontSize: '11.5px',
                color: 'var(--aiims-text-secondary, #64748b)',
                marginTop: '2px',
              }}
            >
              {completedMilestones} of 10 Completed
            </div>
          </div>

          {/* Tile 2: Current Stage */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'var(--aiims-bg-card, #ffffff)',
              border: '1px solid var(--aiims-border-card, #ede9fe)',
              boxShadow: 'var(--aiims-shadow-card, 0 2px 8px rgba(99, 102, 241, 0.04))',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-muted, #64748b)',
                  textTransform: 'uppercase',
                }}
              >
                Active Stage
              </span>
              <Sparkles size={16} color="var(--aiims-token-lavender-accent, #7c3aed)" />
            </div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading, #0f172a)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {nextAction.currentStageTitle}
            </div>
            <div
              style={{
                fontSize: '11.5px',
                color: 'var(--aiims-token-lavender-text, #5b21b6)',
                fontWeight: 700,
                marginTop: '2px',
              }}
            >
              Level{' '}
              {completedMilestones < 5
                ? '1'
                : completedMilestones < 7
                  ? '2'
                  : completedMilestones < 9
                    ? '3'
                    : '4'}
            </div>
          </div>

          {/* Tile 3: Clarity Level */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'var(--aiims-bg-card, #ffffff)',
              border: '1px solid var(--aiims-border-card, #ede9fe)',
              boxShadow: 'var(--aiims-shadow-card, 0 2px 8px rgba(99, 102, 241, 0.04))',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-muted, #64748b)',
                  textTransform: 'uppercase',
                }}
              >
                Clarity Level
              </span>
              <Compass size={16} color="var(--aiims-token-sky-accent, #0284c7)" />
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading, #0f172a)',
              }}
            >
              {clarityLevel}
            </div>
            <div
              style={{
                fontSize: '11.5px',
                color: 'var(--aiims-text-secondary, #64748b)',
                marginTop: '2px',
              }}
            >
              {clarityTasksDone} Tasks Mastered
            </div>
          </div>

          {/* Tile 4: Baseline Assessment */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'var(--aiims-bg-card, #ffffff)',
              border: '1px solid var(--aiims-border-card, #ede9fe)',
              boxShadow: 'var(--aiims-shadow-card, 0 2px 8px rgba(99, 102, 241, 0.04))',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-muted, #64748b)',
                  textTransform: 'uppercase',
                }}
              >
                Diagnostic
              </span>
              <ShieldCheck size={16} color={isAssessmentDone ? '#059669' : '#e11d48'} />
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading, #0f172a)',
              }}
            >
              {isAssessmentDone
                ? diagnosticScore
                  ? `${diagnosticScore}/10`
                  : 'Verified'
                : 'Pending'}
            </div>
            <div
              style={{
                fontSize: '11.5px',
                color: 'var(--aiims-text-secondary, #64748b)',
                marginTop: '2px',
              }}
            >
              {isAssessmentDone ? 'Baseline Complete' : 'Take 25-Question Test'}
            </div>
          </div>

          {/* Tile 5: Focus Sprints */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'var(--aiims-bg-card, #ffffff)',
              border: '1px solid var(--aiims-border-card, #ede9fe)',
              boxShadow: 'var(--aiims-shadow-card, 0 2px 8px rgba(99, 102, 241, 0.04))',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-muted, #64748b)',
                  textTransform: 'uppercase',
                }}
              >
                Focus Today
              </span>
              <Target size={16} color="var(--aiims-token-coral-accent, #e11d48)" />
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading, #0f172a)',
              }}
            >
              {todayFocusMinutes}m
            </div>
            <div
              style={{
                fontSize: '11.5px',
                color: 'var(--aiims-text-secondary, #64748b)',
                marginTop: '2px',
              }}
            >
              {completedFocusSessions} Completed Session{completedFocusSessions === 1 ? '' : 's'}
            </div>
          </div>

          {/* Tile 6: AI Wallet Credits */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'var(--aiims-bg-card, #ffffff)',
              border: '1px solid var(--aiims-border-card, #ede9fe)',
              boxShadow: 'var(--aiims-shadow-card, 0 2px 8px rgba(99, 102, 241, 0.04))',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-muted, #64748b)',
                  textTransform: 'uppercase',
                }}
              >
                AI Wallet
              </span>
              <Wallet size={16} color="var(--aiims-token-sunshine-accent, #d97706)" />
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading, #0f172a)',
              }}
            >
              {acBalance} AC
            </div>
            <div
              style={{
                fontSize: '11.5px',
                color: 'var(--aiims-text-secondary, #64748b)',
                marginTop: '2px',
              }}
            >
              Authoritative Ledger
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION D & E: CONTINUE LEARNING & RECOMMENDED ACTION    */}
      {/* ======================================================== */}
      <section
        aria-label="Recommended Next Learning Action"
        style={{
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          borderRadius: '14px',
          border: '1.5px solid var(--aiims-primary, #6366f1)',
          padding: '22px 26px',
          boxShadow: 'var(--aiims-shadow-card, 0 4px 16px rgba(99, 102, 241, 0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ flex: '1 1 500px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--aiims-token-mint-accent, #059669)',
                boxShadow: '0 0 8px var(--aiims-token-mint-accent, #059669)',
              }}
            />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--aiims-primary, #6366f1)',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
              }}
            >
              Recommended Next Action
            </span>
          </div>

          <h2
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading, #0f172a)',
              margin: '0 0 6px 0',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {nextAction.nextActionTitle}
          </h2>

          <p
            style={{
              fontSize: '13.5px',
              color: 'var(--aiims-text-secondary, #475569)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {nextAction.nextActionReason}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          {activeFocusTrack && (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--aiims-text-secondary, #64748b)',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                border: '1px solid var(--aiims-border-card, #ede9fe)',
              }}
            >
              Track:{' '}
              <strong style={{ color: 'var(--aiims-primary, #6366f1)' }}>{activeFocusTrack}</strong>
            </span>
          )}

          <Button
            variant="lavender"
            size="md"
            icon={<ArrowRight size={16} />}
            onClick={() => setActiveTab(nextAction.targetTab)}
          >
            {nextAction.actionButtonLabel}
          </Button>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION C: 9 QUICK ACCESS CARDS                          */}
      {/* ======================================================== */}
      <section aria-label="Quick Access Workspaces">
        <div style={{ marginBottom: '14px' }}>
          <h2
            style={{
              margin: '0 0 4px 0',
              fontSize: '18px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading, #0f172a)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Core Learning Modules
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--aiims-text-secondary, #64748b)' }}>
            Jump directly into any AIIMS workspace, lab, or telemetry feed.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {quickAccessCards.map((card) => {
            const Icon = card.icon;
            const access = getFeatureAccess(card.route, state);
            const isLocked = !access.unlocked;

            return (
              <div
                key={card.id}
                role="button"
                tabIndex={0}
                onClick={() => setActiveTab(card.route)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveTab(card.route);
                  }
                }}
                style={{
                  padding: '20px',
                  borderRadius: '14px',
                  backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                  border: '1px solid var(--aiims-border-card, #ede9fe)',
                  boxShadow: 'var(--aiims-shadow-card, 0 2px 8px rgba(99, 102, 241, 0.04))',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = card.accent;
                  e.currentTarget.style.boxShadow =
                    'var(--aiims-shadow-hover, 0 8px 24px rgba(99, 102, 241, 0.1))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = 'var(--aiims-border-card, #ede9fe)';
                  e.currentTarget.style.boxShadow =
                    'var(--aiims-shadow-card, 0 2px 8px rgba(99, 102, 241, 0.04))';
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: card.bg,
                        color: card.accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={20} />
                    </div>

                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: card.text,
                        backgroundColor: card.bg,
                        border: `1px solid ${card.border}`,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {isLocked && <Lock size={10} />}
                      {card.badge}
                    </span>
                  </div>

                  <h3
                    style={{
                      margin: '0 0 3px 0',
                      fontSize: '16px',
                      fontWeight: 800,
                      color: 'var(--aiims-text-heading, #0f172a)',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    {card.title}
                  </h3>

                  <div
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: card.accent,
                      marginBottom: '8px',
                    }}
                  >
                    {card.subtitle}
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: '12.5px',
                      color: 'var(--aiims-text-secondary, #64748b)',
                      lineHeight: 1.45,
                    }}
                  >
                    {card.desc}
                  </p>
                </div>

                <div
                  style={{
                    marginTop: '16px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--aiims-border-subtle, #f1f5f9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--aiims-primary, #6366f1)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    Open Workspace <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 10-STAGE CANONICAL MILESTONE ROADMAP STRIP               */}
      {/* ======================================================== */}
      <Card variant="bordered" radius="default" padding="default">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2
                style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0f172a)',
                  margin: 0,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                10-Stage Learning Roadmap
              </h2>
              <Badge variant="mint" size="sm" icon={<Route size={12} />}>
                Stage {completedMilestones < 10 ? completedMilestones + 1 : 10} of 10
              </Badge>
            </div>
            <p
              style={{
                fontSize: '12.5px',
                color: 'var(--aiims-text-secondary, #64748b)',
                margin: '3px 0 0 0',
              }}
            >
              Continuous capability progression from diagnostic baseline to autonomous capstone
              workflows.
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowRight size={14} />}
            onClick={() => setActiveTab('journey')}
          >
            Roadmap Details
          </Button>
        </div>

        {/* 10 Connected Stages */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '10px',
          }}
        >
          {nextAction.journeyStages.map((stage) => {
            const isCompleted = stage.status === 'completed';
            const isCurrent = stage.status === 'current';
            const _isLocked = stage.status === 'locked';

            return (
              <div
                key={stage.id}
                role="button"
                tabIndex={0}
                onClick={() => setActiveTab(stage.targetTab)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveTab(stage.targetTab);
                  }
                }}
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: isCurrent
                    ? 'var(--aiims-primary-light, #eef2ff)'
                    : isCompleted
                      ? 'var(--aiims-token-mint-bg, #ecfdf5)'
                      : 'var(--aiims-bg-card-hover, #faf9ff)',
                  border: isCurrent
                    ? '2px solid var(--aiims-primary, #6366f1)'
                    : isCompleted
                      ? '1px solid var(--aiims-token-mint-border, #a7f3d0)'
                      : '1px solid var(--aiims-border-card, #ede9fe)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '100px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      color: isCurrent
                        ? 'var(--aiims-primary, #4338ca)'
                        : isCompleted
                          ? 'var(--aiims-token-mint-text, #047857)'
                          : 'var(--aiims-text-muted, #94a3b8)',
                      letterSpacing: '0.4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Stage {stage.number < 10 ? `0${stage.number}` : stage.number}
                  </span>

                  {isCompleted ? (
                    <CheckCircle2 size={14} color="#059669" />
                  ) : isCurrent ? (
                    <Flame size={13} color="#6366f1" />
                  ) : (
                    <Lock size={12} color="#94a3b8" />
                  )}
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 700,
                      color: 'var(--aiims-text-heading, #0f172a)',
                      lineHeight: 1.3,
                      marginBottom: '2px',
                    }}
                  >
                    {stage.name}
                  </div>
                  <div
                    style={{
                      fontSize: '10.5px',
                      color: 'var(--aiims-text-secondary, #64748b)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {stage.subtitle}
                  </div>
                </div>

                <div style={{ marginTop: '6px' }}>
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: isCompleted
                        ? 'var(--aiims-token-mint-border, #a7f3d0)'
                        : isCurrent
                          ? 'var(--aiims-primary, #6366f1)'
                          : 'var(--aiims-border-card, #ede9fe)',
                      color: isCompleted
                        ? 'var(--aiims-token-mint-text, #047857)'
                        : isCurrent
                          ? '#ffffff'
                          : 'var(--aiims-text-muted, #64748b)',
                    }}
                  >
                    {isCompleted ? 'Done' : isCurrent ? 'Active' : 'Locked'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ======================================================== */}
      {/* SECTION F: RECENT ACTIVITY & FOCUS CARD (2-COLUMN)       */}
      {/* ======================================================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Recent Ledger Activity */}
        <Card
          variant="bordered"
          radius="default"
          padding="default"
          title="Recent Learning Ledger"
          icon={<Activity size={18} color="var(--aiims-primary, #6366f1)" />}
          footer={
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowRight size={14} />}
              onClick={() => setActiveTab('credits')}
            >
              View Full Credits Ledger
            </Button>
          }
        >
          {recentTransactions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    backgroundColor: 'var(--aiims-bg-card-hover, #faf9ff)',
                    borderRadius: '8px',
                    border: '1px solid var(--aiims-border-card, #ede9fe)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                    <div
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 700,
                        color: 'var(--aiims-text-heading, #0f172a)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {tx.description}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--aiims-text-muted, #94a3b8)',
                        marginTop: '2px',
                      }}
                    >
                      {tx.timestamp}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 800,
                      color: 'var(--aiims-token-mint-text, #047857)',
                      flexShrink: 0,
                    }}
                  >
                    +{tx.amount} AC
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Clock size={24} />}
              title="No Activity Recorded Yet"
              description={
                isAssessmentDone
                  ? 'Complete clarity prompt labs or evaluate radar signals to earn AIIMS Credits.'
                  : 'Complete your Baseline Assessment to earn your first 50 AIIMS Credits.'
              }
              actionLabel={isAssessmentDone ? 'Explore Clarity Lab' : 'Start Assessment'}
              onAction={() => setActiveTab(isAssessmentDone ? 'clarity' : 'assessment')}
            />
          )}
        </Card>

        {/* Focus Sprint Spotlight */}
        <Card
          variant="bordered"
          radius="default"
          padding="default"
          title="Daily Focus & Momentum"
          icon={<Target size={18} color="var(--aiims-token-coral-accent, #e11d48)" />}
          badge={
            <Badge variant="coral" size="sm">
              {todayFocusMinutes}m Recorded
            </Badge>
          }
          footer={
            <Button
              variant="coral"
              size="sm"
              icon={<ArrowRight size={14} />}
              onClick={() => setActiveTab('focus')}
            >
              Launch Focus Sprint
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                padding: '12px',
                borderRadius: '10px',
                backgroundColor: 'var(--aiims-token-coral-bg, #fff1f2)',
                border: '1px solid var(--aiims-token-coral-border, #fecdd3)',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--aiims-token-coral-text, #be123c)',
                }}
              >
                {activeFocusTrack ? `Track: ${activeFocusTrack}` : 'Structured Pomodoro Cycles'}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--aiims-text-secondary, #475569)',
                  marginTop: '2px',
                  lineHeight: 1.4,
                }}
              >
                Timed intervals exclude breaks and ensure deep cognitive focus without distraction.
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
              }}
            >
              <span style={{ color: 'var(--aiims-text-secondary, #64748b)' }}>
                Today's Focus Time:
              </span>
              <strong style={{ color: 'var(--aiims-text-heading, #0f172a)' }}>
                {todayFocusMinutes} minutes
              </strong>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
              }}
            >
              <span style={{ color: 'var(--aiims-text-secondary, #64748b)' }}>
                Completed Sessions:
              </span>
              <strong style={{ color: 'var(--aiims-text-heading, #0f172a)' }}>
                {completedFocusSessions} sessions
              </strong>
            </div>
          </div>
        </Card>
      </div>

      {/* ======================================================== */}
      {/* SECTION G: VERIFIED AI TOOL DISCOVERY                    */}
      {/* ======================================================== */}
      <Card variant="bordered" radius="default" padding="default">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2
                style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0f172a)',
                  margin: 0,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                Verified AI Tool Intelligence
              </h2>
              <Badge variant="sunshine" size="sm" icon={<Zap size={12} />}>
                Live Toolkit
              </Badge>
            </div>
            <p
              style={{
                fontSize: '12.5px',
                color: 'var(--aiims-text-secondary, #64748b)',
                margin: '3px 0 0 0',
              }}
            >
              Curated, verified AI platforms grounded in actual task capabilities and pricing tiers.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={<ArrowRight size={14} />}
            onClick={() => setActiveTab('wallet')}
          >
            Explore AI Wallet
          </Button>
        </div>

        {isToolsLoading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '12px',
            }}
          >
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--aiims-bg-card-hover, #faf9ff)',
                  border: '1px solid var(--aiims-border-card, #ede9fe)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <Skeleton width="40%" height="14px" />
                <Skeleton width="70%" height="18px" />
                <Skeleton width="90%" height="14px" />
              </div>
            ))}
          </div>
        ) : catalogTools.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '12px',
            }}
          >
            {catalogTools.map((tool, idx) => (
              <div
                key={tool._id || tool.id || idx}
                role="button"
                tabIndex={0}
                onClick={() => setActiveTab('wallet')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveTab('wallet');
                  }
                }}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--aiims-bg-card-hover, #faf9ff)',
                  border: '1px solid var(--aiims-border-card, #ede9fe)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                  minHeight: '130px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 800,
                        color: 'var(--aiims-primary, #6366f1)',
                        textTransform: 'uppercase',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Sparkles size={11} />
                      {tool.category || 'AI Platform'}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: 'var(--aiims-token-mint-text, #047857)',
                        backgroundColor: 'var(--aiims-token-mint-bg, #ecfdf5)',
                        border: '1px solid var(--aiims-token-mint-border, #a7f3d0)',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <CheckCircle2 size={10} />
                      {tool.pricing || 'Verified'}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--aiims-text-heading, #0f172a)',
                      marginBottom: '4px',
                    }}
                  >
                    {tool.name}
                  </div>

                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--aiims-text-secondary, #64748b)',
                      lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {tool.summary ||
                      tool.description ||
                      'Verified AI capability ready for workspace workflows.'}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--aiims-text-muted, #94a3b8)',
                      fontWeight: 600,
                    }}
                  >
                    {tool.domain || 'Multi-domain'}
                  </span>
                  <span
                    style={{
                      fontSize: '11.5px',
                      color: 'var(--aiims-primary, #6366f1)',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    View in Wallet <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Wallet size={24} />}
            title="Curated AI Tool Catalog"
            description="Explore verified AI platforms, models, and specialized workflows cataloged in your AI Wallet."
            actionLabel="Open AI Wallet"
            onAction={() => setActiveTab('wallet')}
          />
        )}
      </Card>
    </div>
  );
};

export default HomeScreen;
