import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowRight,
  Target,
  Radar,
  Sparkles,
  CheckCircle2,
  Circle,
  Clock,
  Compass,
  Wallet,
  Activity,
  Lock,
  Zap,
  Award,
  Route,
  Wrench,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { useTheme } from '../../context/ThemeContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { resolveLearnerNextAction } from '../../services/journeyResolver';
import { getFeatureAccess } from '../../services/featureAccessService';
import { SignalDataProvider } from '../../services/signalDataProvider';
import { apiClient } from '../../api/client';
import { RadarSignal } from '../../types';

interface HomeScreenProps {
  setActiveTab: (tab: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ setActiveTab }) => {
  const { state } = useLearner();
  const { isDarkMode } = useTheme();
  const userName = state.profile?.name ? state.profile.name.split(' ')[0] : 'Learner';

  const nextAction = resolveLearnerNextAction(state);

  // Authoritative Balances & XP from central LearnerState
  const acBalance = state.credits?.balance ?? state.profile?.aiimsCredits ?? 0;
  const xpBalance = state.profile?.xpPoints ?? 0;
  const activeFocus = state.focus?.selectedTrack;

  // Genuine stage completion evidence
  const isAssessmentDone = state.assessment?.status === 'completed';
  const assessmentAnswersCount = Object.keys(state.assessment?.answers || {}).length;
  const diagnosticProgress = isAssessmentDone
    ? 100
    : Math.round((assessmentAnswersCount / 25) * 100);

  const clarityCount =
    state.clarity?.completedTopics?.length ||
    Object.keys(state.clarity?.taskScores || {}).length ||
    0;
  const radarCount = state.radar?.investigatedSignalIds?.length || 0;
  const solverCount = state.solver?.history?.length || (state.solver?.latestWorkflow ? 1 : 0);

  // Calculate actual completed count across the 10 stages
  const completedCount = useMemo(() => {
    return nextAction.journeyStages.filter((s) => s.status === 'completed').length;
  }, [nextAction.journeyStages]);

  const completionPercentage = Math.round((completedCount / 10) * 100);

  // Genuine Learning Milestones derived strictly from state evidence
  const genuineMilestones = [
    {
      id: 'diagnostic',
      title: 'Diagnostic Baseline',
      subtitle: '5-dimension AI competence diagnostic',
      achieved: isAssessmentDone,
      reward: '50 AC · 100 XP',
      progressPercent: diagnosticProgress,
      progressText: isAssessmentDone
        ? 'Verified Complete'
        : assessmentAnswersCount > 0
          ? `${assessmentAnswersCount}/25 Challenges Answered`
          : 'Pending completion',
      tab: 'assessment',
      icon: ShieldCheck,
    },
    {
      id: 'clarity',
      title: 'Prompt Reasoning Lab',
      subtitle: 'Systematic prompt derivation & task engineering',
      achieved: clarityCount > 0,
      reward: '25 AC · 50 XP',
      progressPercent: clarityCount > 0 ? 100 : 0,
      progressText: clarityCount > 0 ? `${clarityCount} Tasks Mastered` : '0/1 Task Completed',
      tab: 'clarity',
      icon: Compass,
    },
    {
      id: 'radar',
      title: 'Signal Investigation',
      subtitle: 'Emerging AI technology & market shifts research',
      achieved: radarCount > 0,
      reward: '30 AC · 60 XP',
      progressPercent: radarCount > 0 ? 100 : 0,
      progressText: radarCount > 0 ? `${radarCount} Signals Analyzed` : '0/1 Signal Investigated',
      tab: 'radar',
      icon: Radar,
    },
    {
      id: 'solver',
      title: 'AI System Architecture',
      subtitle: 'End-to-end real-task solution derivation',
      achieved: solverCount > 0,
      reward: '40 AC · 80 XP',
      progressPercent: solverCount > 0 ? 100 : 0,
      progressText: solverCount > 0 ? `${solverCount} Solutions Designed` : '0/1 Problem Solved',
      tab: 'solver',
      icon: Wrench,
    },
  ];

  const [topOpportunity, setTopOpportunity] = useState<RadarSignal | null>(null);
  const [isOpportunityLoading, setIsOpportunityLoading] = useState<boolean>(true);
  const [catalogTools, setCatalogTools] = useState<any[]>([]);
  const [isToolsLoading, setIsToolsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    SignalDataProvider.getSignals()
      .then((signals) => {
        if (isMounted) {
          if (signals && signals.length > 0) {
            setTopOpportunity(signals[0]);
          }
          setIsOpportunityLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to load radar signals:', err);
        if (isMounted) setIsOpportunityLoading(false);
      });

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

  // Time-aware personalized greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // 2D SVG Circular Progress Constants
  const circleRadius = 46;
  const circleCircumference = 2 * Math.PI * circleRadius; // ~289.02px
  const circleOffset = circleCircumference - (circleCircumference * completionPercentage) / 100;

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
      }}
    >
      {/* ======================================================== */}
      {/* 1. HERO SECTION: EDITORIAL STUDENT DASHBOARD HERO (2D)   */}
      {/* ======================================================== */}
      <section
        style={{
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          border: '1px solid var(--aiims-border-card, #ede9fe)',
          borderRadius: '16px',
          padding: '28px 32px',
          boxShadow: 'var(--aiims-shadow-card, 0 4px 20px -2px rgba(99, 102, 241, 0.06))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle decorative cosmic gradient accent line at top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background:
              'linear-gradient(90deg, var(--aiims-primary, #6366f1) 0%, #a855f7 50%, #38bdf8 100%)',
          }}
        />

        {/* LEFT SIDE: GREETING & CALL TO ACTIONS */}
        <div style={{ flex: '1 1 480px', minWidth: '280px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: 'var(--aiims-primary-light, rgba(99, 102, 241, 0.1))',
              color: 'var(--aiims-primary, #6366f1)',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            <Sparkles size={13} />
            <span>AI CAPABILITY DASHBOARD · {state.profile?.stage || 'EXPLORER'} STAGE</span>
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
              Build your verified AI advantage.
            </span>
          </h1>

          <p
            style={{
              margin: '0 0 22px 0',
              fontSize: '14px',
              color: 'var(--aiims-text-secondary, #475569)',
              lineHeight: 1.55,
              maxWidth: '560px',
            }}
          >
            You are advancing through <strong>{nextAction.currentStageTitle}</strong>. Follow your
            personalized milestone path to master authentic prompt reasoning, tool stacking, and
            real-task workflows.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Button
              variant="violet"
              size="md"
              icon={<ArrowRight size={16} />}
              onClick={() => setActiveTab(nextAction.targetTab)}
            >
              Continue Learning: {nextAction.actionButtonLabel}
            </Button>

            <Button
              variant="outline"
              size="md"
              icon={<Route size={16} />}
              onClick={() => setActiveTab('journey')}
            >
              Explore Full Roadmap
            </Button>
          </div>
        </div>

        {/* RIGHT SIDE: 2D PROGRESS ILLUSTRATION & SUMMARY GAUGE */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            padding: '16px 20px',
            borderRadius: '14px',
            backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
            border: '1px solid var(--aiims-border-card, #ede9fe)',
            flexShrink: 0,
          }}
        >
          {/* Circular SVG Progress Ring */}
          <div style={{ position: 'relative', width: '108px', height: '108px', flexShrink: 0 }}>
            <svg
              width="108"
              height="108"
              viewBox="0 0 108 108"
              style={{ transform: 'rotate(-90deg)' }}
            >
              {/* Background Track Circle */}
              <circle
                cx="54"
                cy="54"
                r={circleRadius}
                stroke="var(--aiims-border-subtle, #ede9fe)"
                strokeWidth="8"
                fill="none"
              />
              {/* Dynamic Active Progress Arc */}
              <circle
                cx="54"
                cy="54"
                r={circleRadius}
                stroke="url(#aiimsProgressGradient)"
                strokeWidth="8"
                strokeDasharray={circleCircumference}
                strokeDashoffset={circleOffset}
                strokeLinecap="round"
                fill="none"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
              <defs>
                <linearGradient id="aiimsProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>

            {/* Centered Percentage Label */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0f172a)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  lineHeight: 1,
                }}
              >
                {completionPercentage}%
              </span>
              <span
                style={{
                  fontSize: '8.5px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-muted, #94a3b8)',
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  marginTop: '3px',
                }}
              >
                PROGRESS
              </span>
            </div>
          </div>

          {/* Compact Metric Summary Pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                borderRadius: '8px',
                backgroundColor: 'var(--aiims-card-mint-bg, #f0fdf4)',
                border: '1px solid var(--aiims-card-mint-border, #bbf7d0)',
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--aiims-card-mint-text, #15803d)',
              }}
            >
              <CheckCircle2 size={14} />
              <span>{completedCount} / 10 Stages Done</span>
            </div>

            <div
              onClick={() => setActiveTab('credits')}
              title="View credits ledger"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveTab('credits');
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                borderRadius: '8px',
                backgroundColor: 'var(--aiims-card-amber-bg, #fffbeb)',
                border: '1px solid var(--aiims-card-amber-border, #fde68a)',
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--aiims-card-amber-text, #b45309)',
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
                padding: '6px 10px',
                borderRadius: '8px',
                backgroundColor: 'var(--aiims-primary-light, #f5f3ff)',
                border: '1px solid var(--aiims-border-card-hover, #ddd6fe)',
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--aiims-primary, #6366f1)',
              }}
            >
              <Award size={14} />
              <span>{xpBalance.toLocaleString()} XP Points</span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. PERSONALIZED "YOUR NEXT STEP" BANNER                  */}
      {/* ======================================================== */}
      <section
        style={{
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          borderRadius: '14px',
          border: '1.5px solid var(--aiims-primary, #6366f1)',
          padding: '20px 24px',
          boxShadow: 'var(--aiims-shadow-card, 0 6px 20px -4px rgba(99, 102, 241, 0.1))',
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
                backgroundColor: '#10b981',
                boxShadow: '0 0 8px #10b981',
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
              YOUR NEXT ACTIONABLE STEP
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
          {activeFocus && (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--aiims-text-secondary, #64748b)',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                border: '1px solid var(--aiims-border-card, #e2e8f0)',
              }}
            >
              Track:{' '}
              <strong style={{ color: 'var(--aiims-primary, #6366f1)' }}>{activeFocus}</strong>
            </span>
          )}

          <Button
            variant="violet"
            size="md"
            icon={<ArrowRight size={16} />}
            onClick={() => setActiveTab(nextAction.targetTab)}
          >
            {nextAction.actionButtonLabel}
          </Button>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. VISUALLY STRONG 10-STAGE LEARNING JOURNEY PROGRESSION */}
      {/* ======================================================== */}
      <Card variant="bordered" radius="default" padding="default">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0f172a)',
                  margin: 0,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                10-Stage Learning Journey
              </h2>
              <Badge variant="purple" size="sm">
                Stage {completedCount < 10 ? completedCount + 1 : 10} of 10
              </Badge>
            </div>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--aiims-text-secondary, #64748b)',
                margin: '4px 0 0 0',
              }}
            >
              Your systematic progression path from baseline competency diagnostic to capstone
              project builds.
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowRight size={14} />}
            onClick={() => setActiveTab('journey')}
          >
            Full Roadmap
          </Button>
        </div>

        {/* CONNECTED 10-STAGE GRID (2 ROWS OF 5 STAGES ON DESKTOP) */}
        <div className="aiims-10stage-grid">
          {nextAction.journeyStages.map((stage) => {
            const isCompleted = stage.status === 'completed';
            const isCurrent = stage.status === 'current';
            const isLocked = stage.status === 'locked';

            const access = getFeatureAccess(stage.targetTab, state);
            const lockReason = !access.unlocked ? access.reason : undefined;

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
                title={
                  isLocked
                    ? `${stage.name} (Locked: ${lockReason || 'Activity-gated'})`
                    : `${stage.name}: ${stage.subtitle}`
                }
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  backgroundColor: isCurrent
                    ? isDarkMode
                      ? 'rgba(99, 102, 241, 0.15)'
                      : 'var(--aiims-primary-light, #eef2ff)'
                    : isCompleted
                      ? 'var(--aiims-bg-card, #ffffff)'
                      : isLocked
                        ? 'var(--aiims-bg-card-hover, #f8fafc)'
                        : 'var(--aiims-bg-card, #ffffff)',
                  border: isCurrent
                    ? '2px solid var(--aiims-primary, #6366f1)'
                    : isCompleted
                      ? '1.5px solid var(--aiims-card-mint-border, #86efac)'
                      : '1px solid var(--aiims-border-card, #ede9fe)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '136px',
                  cursor: 'pointer',
                  transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = isDarkMode
                    ? '0 8px 24px -4px rgba(0, 0, 0, 0.45)'
                    : '0 8px 20px -4px rgba(99, 102, 241, 0.14)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Stage Header: Step number & Status icon */}
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
                      color: isCurrent
                        ? 'var(--aiims-primary, #6366f1)'
                        : isCompleted
                          ? 'var(--aiims-card-mint-text, #15803d)'
                          : 'var(--aiims-text-muted, #94a3b8)',
                      letterSpacing: '0.5px',
                    }}
                  >
                    STAGE {stage.number < 10 ? `0${stage.number}` : stage.number}
                  </span>

                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isCompleted
                        ? 'var(--aiims-card-mint-bg, #f0fdf4)'
                        : isCurrent
                          ? 'var(--aiims-primary-light, #eef2ff)'
                          : 'transparent',
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={16} color={isDarkMode ? '#4ade80' : '#16a34a'} />
                    ) : isCurrent ? (
                      <Flame size={14} color={isDarkMode ? '#818cf8' : '#6366f1'} />
                    ) : isLocked ? (
                      <Lock size={12} color="var(--aiims-text-muted, #94a3b8)" />
                    ) : (
                      <Circle size={14} color="var(--aiims-text-muted, #94a3b8)" />
                    )}
                  </div>
                </div>

                {/* Stage Title & Short Subtitle */}
                <div style={{ marginBottom: '10px' }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: isCurrent
                        ? 'var(--aiims-primary, #6366f1)'
                        : 'var(--aiims-text-heading, #0f172a)',
                      marginBottom: '3px',
                      lineHeight: 1.3,
                    }}
                  >
                    {stage.name}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--aiims-text-secondary, #64748b)',
                      lineHeight: 1.35,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {stage.subtitle}
                  </div>
                </div>

                {/* Stage Status Badge */}
                <div>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: isCompleted
                        ? 'var(--aiims-card-mint-bg, #f0fdf4)'
                        : isCurrent
                          ? 'var(--aiims-primary, #6366f1)'
                          : isLocked
                            ? 'var(--aiims-bg-card-hover, #f1f5f9)'
                            : 'var(--aiims-border-subtle, #ede9fe)',
                      color: isCompleted
                        ? 'var(--aiims-card-mint-text, #15803d)'
                        : isCurrent
                          ? '#ffffff'
                          : isLocked
                            ? 'var(--aiims-text-muted, #64748b)'
                            : 'var(--aiims-primary, #6366f1)',
                    }}
                  >
                    {isCompleted
                      ? '✓ Completed'
                      : isCurrent
                        ? '● Active Step'
                        : isLocked
                          ? 'Locked'
                          : '○ Available'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ======================================================== */}
      {/* 4. GENUINE LEARNING MILESTONES & REWARDS STRIP           */}
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
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0f172a)',
                  margin: 0,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                Learning Milestones & Capability Rewards
              </h2>
              <Badge variant="purple" size="sm" icon={<Award size={12} />}>
                Verifiable Competency Rewards
              </Badge>
            </div>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--aiims-text-secondary, #64748b)',
                margin: '4px 0 0 0',
              }}
            >
              Authentic milestones unlocked by diagnostic performance and hands-on laboratory
              derivation.
            </p>
          </div>
        </div>

        <div className="aiims-milestones-grid">
          {genuineMilestones.map((m) => (
            <div
              key={m.id}
              role="button"
              tabIndex={0}
              onClick={() => setActiveTab(m.tab)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveTab(m.tab);
                }
              }}
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: m.achieved
                  ? 'var(--aiims-card-mint-bg, #f0fdf4)'
                  : 'var(--aiims-bg-card-hover, #f8fafc)',
                border: m.achieved
                  ? '1.5px solid var(--aiims-card-mint-border, #86efac)'
                  : '1px solid var(--aiims-border-card, #e2e8f0)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
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
                    marginBottom: '10px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      color: m.achieved
                        ? 'var(--aiims-card-mint-text, #15803d)'
                        : 'var(--aiims-primary, #6366f1)',
                      backgroundColor: m.achieved
                        ? 'var(--aiims-card-mint-bg, #dcfce7)'
                        : 'var(--aiims-primary-light, #eef2ff)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      letterSpacing: '0.4px',
                    }}
                  >
                    +{m.reward}
                  </span>

                  {m.achieved ? (
                    <CheckCircle2 size={18} color={isDarkMode ? '#4ade80' : '#16a34a'} />
                  ) : (
                    <Circle size={17} color="var(--aiims-text-muted, #94a3b8)" />
                  )}
                </div>

                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-heading, #0f172a)',
                    marginBottom: '4px',
                  }}
                >
                  {m.title}
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--aiims-text-secondary, #64748b)',
                    lineHeight: 1.4,
                    marginBottom: '12px',
                  }}
                >
                  {m.subtitle}
                </div>
              </div>

              <div>
                {/* Progress Bar */}
                <div
                  style={{
                    width: '100%',
                    height: '5px',
                    borderRadius: '3px',
                    backgroundColor: 'var(--aiims-border-card, #e2e8f0)',
                    overflow: 'hidden',
                    marginBottom: '8px',
                  }}
                >
                  <div
                    style={{
                      width: `${m.progressPercent}%`,
                      height: '100%',
                      borderRadius: '3px',
                      backgroundColor: m.achieved
                        ? isDarkMode
                          ? '#22c55e'
                          : '#16a34a'
                        : 'var(--aiims-primary, #6366f1)',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>

                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: m.achieved
                      ? 'var(--aiims-card-mint-text, #15803d)'
                      : 'var(--aiims-text-muted, #94a3b8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{m.progressText}</span>
                  <ArrowRight size={12} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ======================================================== */}
      {/* 5. STUDENT ACTIVITY & PROGRESS AREA (2-COLUMN GRID)      */}
      {/* ======================================================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
        }}
      >
        {/* RECENT ACTIVITY & CREDIT LEDGER CARD */}
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
                    backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                    borderRadius: '8px',
                    border: '1px solid var(--aiims-border-card, #f1f5f9)',
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
                      color: 'var(--aiims-card-mint-text, #15803d)',
                      flexShrink: 0,
                    }}
                  >
                    +{tx.amount} Credits
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <Clock
                size={28}
                color="var(--aiims-text-muted, #94a3b8)"
                style={{ margin: '0 auto 8px' }}
              />
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: 'var(--aiims-text-heading, #0f172a)',
                }}
              >
                No Activity Recorded Yet
              </div>
              <p
                style={{
                  fontSize: '12.5px',
                  color: 'var(--aiims-text-secondary, #64748b)',
                  margin: '4px auto 14px',
                  maxWidth: '320px',
                  lineHeight: 1.5,
                }}
              >
                {isAssessmentDone
                  ? 'Complete laboratory exercises in Clarity or analyze Radar signals to earn additional AIIMS Credits.'
                  : 'Complete your Baseline Assessment to earn your first 50 AIIMS Credits and unlock your personalized profile.'}
              </p>
              <Button
                variant="violet"
                size="sm"
                icon={<ArrowRight size={14} />}
                onClick={() => setActiveTab(isAssessmentDone ? 'clarity' : 'assessment')}
              >
                {isAssessmentDone ? 'Explore Clarity Tasks' : 'Start Baseline Assessment'}
              </Button>
            </div>
          )}
        </Card>

        {/* TOP RELEVANT RADAR OPPORTUNITY CARD / FOCUS TRACK */}
        {isOpportunityLoading ? (
          <Card
            variant="bordered"
            radius="default"
            padding="default"
            title="Trending AI Opportunity"
            icon={<Radar size={18} color="var(--aiims-primary, #6366f1)" />}
          >
            <div
              style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              <div
                style={{
                  height: '18px',
                  width: '70%',
                  backgroundColor: 'var(--aiims-border-subtle, #f1f5f9)',
                  borderRadius: '4px',
                }}
              />
              <div
                style={{
                  height: '14px',
                  width: '100%',
                  backgroundColor: 'var(--aiims-border-subtle, #f1f5f9)',
                  borderRadius: '4px',
                }}
              />
              <div
                style={{
                  height: '14px',
                  width: '85%',
                  backgroundColor: 'var(--aiims-border-subtle, #f1f5f9)',
                  borderRadius: '4px',
                }}
              />
            </div>
          </Card>
        ) : topOpportunity ? (
          <Card
            variant="bordered"
            radius="default"
            padding="default"
            title="Trending AI Opportunity"
            icon={<Radar size={18} color="#7c3aed" />}
            badge={
              <Badge variant="purple" size="sm">
                Signal Radar
              </Badge>
            }
            footer={
              <Button
                variant="outline"
                size="sm"
                icon={<Lock size={14} />}
                onClick={() => setActiveTab('radar')}
              >
                Explore Signals
              </Button>
            }
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--aiims-text-heading, #0f172a)',
                marginBottom: '6px',
              }}
            >
              {topOpportunity.title}
            </div>
            <p
              style={{
                fontSize: '12.5px',
                color: 'var(--aiims-text-secondary, #475569)',
                lineHeight: 1.5,
                margin: '0 0 10px 0',
              }}
            >
              {topOpportunity.summary}
            </p>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: 'var(--aiims-primary, #6366f1)',
                fontWeight: 700,
              }}
            >
              <span>Category: {topOpportunity.category}</span>
              {topOpportunity.affectedDomains && topOpportunity.affectedDomains.length > 0 && (
                <span>· {topOpportunity.affectedDomains[0]}</span>
              )}
            </div>
          </Card>
        ) : (
          /* Fallback Quick Navigation Help Card */
          <Card
            variant="bordered"
            radius="default"
            padding="default"
            title="Your Learning Focus"
            icon={<Target size={18} color="var(--aiims-primary, #6366f1)" />}
            footer={
              <Button variant="violet" size="sm" onClick={() => setActiveTab('focus')}>
                Choose Focus Track
              </Button>
            }
          >
            <div
              style={{
                fontSize: '13.5px',
                fontWeight: 700,
                color: 'var(--aiims-text-heading, #0f172a)',
                marginBottom: '4px',
              }}
            >
              Select a Core AI Competency Track
            </div>
            <p
              style={{
                fontSize: '12.5px',
                color: 'var(--aiims-text-secondary, #64748b)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Tailor your AIIMS experience by focusing on AI Prompt Engineering, Task Automation, or
              System Architecture.
            </p>
          </Card>
        )}
      </div>

      {/* ======================================================== */}
      {/* 6. VERIFIED AI TOOL CATALOG PREVIEW (WALLET CONNECTOR)    */}
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
              <Badge variant="cyan" size="sm" icon={<Wallet size={12} />}>
                Live Toolkit
              </Badge>
            </div>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--aiims-text-secondary, #64748b)',
                margin: '2px 0 0 0',
              }}
            >
              Curated AI platforms matched to your discipline and focus track.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowRight size={14} />}
            onClick={() => setActiveTab('wallet')}
          >
            Open AI Wallet
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
                  backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                  border: '1px solid var(--aiims-border-card, #ede9fe)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    height: '14px',
                    width: '40%',
                    backgroundColor: 'var(--aiims-border-subtle, #ede9fe)',
                    borderRadius: '4px',
                  }}
                />
                <div
                  style={{
                    height: '18px',
                    width: '70%',
                    backgroundColor: 'var(--aiims-border-subtle, #ede9fe)',
                    borderRadius: '4px',
                  }}
                />
                <div
                  style={{
                    height: '14px',
                    width: '90%',
                    backgroundColor: 'var(--aiims-border-subtle, #ede9fe)',
                    borderRadius: '4px',
                  }}
                />
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
                  padding: '14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                  border: '1px solid var(--aiims-border-card, #ede9fe)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
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
                        fontSize: '10px',
                        fontWeight: 800,
                        color: 'var(--aiims-primary, #6366f1)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {tool.category || 'AI Platform'}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: 'var(--aiims-card-mint-text, #059669)',
                        backgroundColor: 'var(--aiims-card-mint-bg, #f0fdf4)',
                        padding: '2px 6px',
                        borderRadius: '6px',
                      }}
                    >
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    View Details <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <Wallet
              size={28}
              color="var(--aiims-text-muted, #94a3b8)"
              style={{ margin: '0 auto 8px' }}
            />
            <div
              style={{
                fontSize: '13.5px',
                fontWeight: 700,
                color: 'var(--aiims-text-heading, #0f172a)',
              }}
            >
              Curated Toolkit Ready in AI Wallet
            </div>
            <p
              style={{
                fontSize: '12.5px',
                color: 'var(--aiims-text-secondary, #64748b)',
                margin: '4px auto 14px',
                maxWidth: '360px',
              }}
            >
              Explore certified generative AI platforms, models, and specialized workflows cataloged
              in your AI Wallet.
            </p>
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowRight size={14} />}
              onClick={() => setActiveTab('wallet')}
            >
              Explore AI Wallet
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default HomeScreen;
