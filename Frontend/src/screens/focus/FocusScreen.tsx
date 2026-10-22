import React, { useState } from 'react';
import { useLearner } from '../../context/LearnerContext';
import {
  Target,
  Sparkles,
  ArrowRight,
  Lock,
  Brain,
  Compass,
  CheckCircle2,
  RefreshCw,
  Zap,
  Info,
  History,
  Radar,
  Play,
  Pause,
  StopCircle,
  Coffee,
  Volume2,
  VolumeX,
  Bell,
  Clock,
  TrendingUp,
  AlertCircle,
  Trash2,
  Check
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { PageHeader } from '../../components/common/PageHeader';
import { requestFocusNotificationPermission, getNotificationPermission } from '../../utils/focusNotifications';

interface FocusScreenProps {
  setActiveTab?: (tab: string) => void;
}

interface TopicFocusDetail {
  title: string;
  whyThisMatters: string;
  practicalNextStep: string;
  suggestedAction: string;
}

const FOCUS_DETAILS_DATABASE: Record<string, TopicFocusDetail> = {
  'AI Workflow Design': {
    title: 'AI Workflow Design',
    whyThisMatters: 'Establishing repeatable AI workflows gives you high leverage by turning one-off prompting into reliable, multi-step processes.',
    practicalNextStep: 'Take one repeated task from your week (e.g., weekly status reporting) and map out the inputs, prompt steps, and verification checks.',
    suggestedAction: 'Map a 3-step repeatable workflow for your weekly update'
  },
  'AI Workflow & Architecture Design': {
    title: 'AI Workflow Design',
    whyThisMatters: 'Establishing repeatable AI workflows gives you high leverage by turning one-off prompting into reliable, multi-step processes.',
    practicalNextStep: 'Take one repeated task from your week (e.g., weekly status reporting) and map out the inputs, prompt steps, and verification checks.',
    suggestedAction: 'Map a 3-step repeatable workflow for your weekly update'
  },
  'AI Agents & Autonomous Workflows': {
    title: 'AI Agents & Autonomous Workflows',
    whyThisMatters: 'Delegating multi-step goals to autonomous AI tools allows you to shift from line-by-line prompting to high-level goal delegation.',
    practicalNextStep: 'Define a multi-step research or data auditing goal and specify clear tool boundaries and review checkpoints for an AI agent assistant.',
    suggestedAction: 'Specify goal & boundaries for an autonomous agent task'
  }
};

const getFallbackFocusDetail = (topicName: string): TopicFocusDetail => {
  return {
    title: topicName,
    whyThisMatters: `Focusing on ${topicName} allows you to turn concepts explored in Clarity into practical work habits.`,
    practicalNextStep: `Identify one recurring scenario in your work where applying ${topicName} creates immediate efficiency or quality gains.`,
    suggestedAction: `Apply ${topicName} to one active work project`
  };
};

const FOCUS_DURATION_PRESETS = [
  { minutes: 15, label: '15m', title: 'Quick Sprint' },
  { minutes: 25, label: '25m', title: 'Pomodoro (Standard)' },
  { minutes: 45, label: '45m', title: 'Deep Work' },
  { minutes: 60, label: '60m', title: 'Mastery Block' }
];

const BREAK_DURATION_PRESETS = [
  { minutes: 3, label: '3m', title: 'Quick Rest' },
  { minutes: 5, label: '5m', title: 'Standard Break' },
  { minutes: 10, label: '10m', title: 'Extended Rest' }
];

export const FocusScreen: React.FC<FocusScreenProps> = ({ setActiveTab }) => {
  const {
    state,
    selectFocusTrack,
    changeFocusTrack,
    updateFocusSessionConfig,
    startFocusSession,
    pauseFocusSession,
    resumeFocusSession,
    completeFocusPeriod,
    startBreakPeriod,
    skipBreakPeriod,
    endFocusSession,
    clearFocusSessionHistory
  } = useLearner();

  const isAssessmentCompleted = state.assessment.status === 'completed';
  const isAnalysisViewed = state.analysis.status === 'viewed' || state.analysis.status === 'unlocked';
  const isClarityExplored = state.clarity.status === 'completed' || (state.clarity.completedTopics && state.clarity.completedTopics.length > 0) || state.clarity.selectedTopic !== null;

  const activeFocusTrack = state.focus.selectedTrack;
  const focusStatus = state.focus.status;
  const isFocusActive = focusStatus === 'active';
  const reflections = state.clarity.reflections || {};

  const defaultCandidate = state.clarity.selectedTopic || state.clarity.completedTopics[0] || (state.clarity.selectedAreas && state.clarity.selectedAreas[0]) || 'AI Workflow Design';
  const [candidateTopic, setCandidateTopic] = useState<string>(defaultCandidate);
  const [showChangeSelector, setShowChangeSelector] = useState<boolean>(false);

  // Focus Session Config State
  const currentConfig = state.focus.sessionConfig || {
    focusDurationMinutes: 25,
    breakDurationMinutes: 5,
    enableLongBreak: true,
    longBreakDurationMinutes: 15,
    longBreakInterval: 4,
    soundEnabled: true
  };

  const activeSession = state.focus.activeSession;
  const sessionHistory = state.focus.sessionHistory || [];

  const [selectedFocusMinutes, setSelectedFocusMinutes] = useState<number>(currentConfig.focusDurationMinutes);
  const [selectedBreakMinutes, setSelectedBreakMinutes] = useState<number>(currentConfig.breakDurationMinutes);
  const [enableLongBreak, setEnableLongBreak] = useState<boolean>(currentConfig.enableLongBreak);
  const [sessionIntention, setSessionIntention] = useState<string>('');
  const [customFocusInput, setCustomFocusInput] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [showEndConfirm, setShowEndConfirm] = useState<boolean>(false);
  const [notificationStatus, setNotificationStatus] = useState<string>(getNotificationPermission());
  const [historyFilter, setHistoryFilter] = useState<'all' | 'completed'>('all');

  // Gating guards
  if (!isAssessmentCompleted) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
        <Surface variant="amber" radius="lg" padding="lg">
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#d97706'
          }}>
            <Lock size={28} />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--aiims-text-heading)', margin: '0 0 8px', fontFamily: "'Fredoka', sans-serif" }}>
            Focus comes after understanding your profile
          </h2>

          <p style={{ color: 'var(--aiims-tint-amber-text)', fontSize: '14px', lineHeight: 1.5, margin: '0 0 24px' }}>
            Complete your AI Assessment first. AIIMS will evaluate your profile and help you decide where to focus.
          </p>

          <Button
            variant="amber"
            size="lg"
            icon={<ArrowRight size={16} />}
            onClick={() => setActiveTab && setActiveTab('assessment')}
          >
            Start Assessment
          </Button>
        </Surface>
      </div>
    );
  }

  if (!isAnalysisViewed) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
        <Surface variant="amber" radius="lg" padding="lg">
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#d97706'
          }}>
            <Brain size={28} />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--aiims-text-heading)', margin: '0 0 8px', fontFamily: "'Fredoka', sans-serif" }}>
            Your profile comes first
          </h2>

          <p style={{ color: 'var(--aiims-tint-amber-text)', fontSize: '14px', lineHeight: 1.5, margin: '0 0 24px' }}>
            Open your Analysis to understand what AIIMS discovered about how you work with AI.
          </p>

          <Button
            variant="amber"
            size="lg"
            icon={<ArrowRight size={16} />}
            onClick={() => setActiveTab && setActiveTab('analysis')}
          >
            View Analysis
          </Button>
        </Surface>
      </div>
    );
  }

  if (!isClarityExplored) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
        <Surface variant="amber" radius="lg" padding="lg">
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: '#e0f2fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#0284c7'
          }}>
            <Compass size={28} />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--aiims-text-heading)', margin: '0 0 8px', fontFamily: "'Fredoka', sans-serif" }}>
            Build some Clarity first
          </h2>

          <p style={{ color: 'var(--aiims-text-secondary)', fontSize: '14px', lineHeight: 1.5, margin: '0 0 24px' }}>
            Explore an area from your profile before deciding where to focus. Clarity will help you understand the concept first.
          </p>

          <Button
            variant="primary"
            size="lg"
            icon={<ArrowRight size={16} />}
            onClick={() => setActiveTab && setActiveTab('clarity')}
          >
            Explore Clarity
          </Button>
        </Surface>
      </div>
    );
  }

  const displayTopic = isFocusActive && activeFocusTrack && !showChangeSelector
    ? activeFocusTrack
    : candidateTopic;

  const topicDetail = FOCUS_DETAILS_DATABASE[displayTopic] || getFallbackFocusDetail(displayTopic);
  const savedReflection = reflections[displayTopic] || null;

  const alternativeAreas = (state.clarity.selectedAreas || [
    'AI Workflow Design',
    'AI Agents & Autonomous Workflows'
  ]).filter((a) => a !== displayTopic);

  const handleMakeFocus = () => {
    selectFocusTrack(displayTopic);
    setShowChangeSelector(false);
  };

  const handleChangeFocus = (newTopic: string) => {
    changeFocusTrack(newTopic);
    setCandidateTopic(newTopic);
    setShowChangeSelector(false);
  };

  const handleToggleSound = () => {
    const nextVal = !currentConfig.soundEnabled;
    updateFocusSessionConfig({ soundEnabled: nextVal });
  };

  const handleRequestNotifications = async () => {
    const granted = await requestFocusNotificationPermission();
    setNotificationStatus(granted ? 'granted' : 'denied');
  };

  const handleStartSession = () => {
    let focusMins = selectedFocusMinutes;
    if (isCustomMode && customFocusInput) {
      const parsed = parseInt(customFocusInput, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 180) {
        focusMins = parsed;
      }
    }

    // Persist user preference
    updateFocusSessionConfig({
      focusDurationMinutes: focusMins,
      breakDurationMinutes: selectedBreakMinutes,
      enableLongBreak
    });

    startFocusSession({
      trackTitle: displayTopic,
      intention: sessionIntention,
      customFocusMinutes: focusMins,
      customBreakMinutes: selectedBreakMinutes
    });
  };

  // Timer calculations
  const remainingSeconds = activeSession?.remainingSeconds ?? (selectedFocusMinutes * 60);
  const totalSeconds = activeSession?.totalPeriodSeconds ?? (selectedFocusMinutes * 60);
  const progressRatio = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;
  const progressPercent = Math.min(100, Math.max(0, Math.round(progressRatio * 100)));

  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // SVG ring properties
  const radius = 86;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * progressRatio);

  // Statistics
  const completedSessions = sessionHistory.filter(s => s.status === 'completed');
  const totalFocusSeconds = sessionHistory.reduce((acc, curr) => acc + (curr.actualFocusSeconds || 0), 0);
  const totalFocusHours = (totalFocusSeconds / 3600).toFixed(1);
  const totalFocusMins = Math.round(totalFocusSeconds / 60);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySessions = sessionHistory.filter(s => s.startedAt && s.startedAt.startsWith(todayStr));

  const filteredHistory = historyFilter === 'completed'
    ? sessionHistory.filter(s => s.status === 'completed')
    : sessionHistory;

  return (
    <div style={{ maxWidth: '1020px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* PAGE HEADER */}
      <PageHeader
        icon={<Target size={24} />}
        title="Personal Focus & Decision Workspace"
        description="Deliberate, distraction-free focus intervals with reliable timekeeping, restorative breaks, and session history."
        badge={{ label: 'Amber / Orange Focus Environment', variant: 'warning' }}
      />

      {/* ACTIVE FOCUS TOPIC / DECISION PANEL */}
      <Surface
        variant={isFocusActive && !showChangeSelector ? 'gradient-hero' : 'gradient-focus'}
        radius="lg"
        padding="lg"
        style={{
          borderLeft: isFocusActive && !showChangeSelector ? '6px solid #4f46e5' : '6px solid #d97706'
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 800, color: isFocusActive && !showChangeSelector ? '#3730a3' : '#b45309', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
          {isFocusActive && !showChangeSelector ? 'YOUR CURRENT ACTIVE FOCUS TRACK' : 'YOU ARE CONSIDERING'}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--aiims-text-heading)', margin: 0, fontFamily: "'Fredoka', sans-serif" }}>
            {topicDetail.title}
          </h2>

          {isFocusActive && !showChangeSelector && (
            <Badge variant="primary" icon={<CheckCircle2 size={14} />}>
              Active Focus Target
            </Badge>
          )}
        </div>

        {/* WHY THIS MATTERS */}
        <div style={{
          backgroundColor: 'var(--aiims-tint-amber-bg)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid var(--aiims-tint-amber-border)',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--aiims-tint-amber-text)', textTransform: 'uppercase', marginBottom: '4px' }}>
            WHY THIS MATTERS
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--aiims-text-heading)', lineHeight: 1.5, fontWeight: 500 }}>
            {topicDetail.whyThisMatters}
          </p>
        </div>

        {/* WHAT YOU ALREADY DISCOVERED */}
        <div style={{
          backgroundColor: 'var(--aiims-tint-emerald-bg)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid var(--aiims-tint-emerald-border)',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--aiims-tint-emerald-text)', textTransform: 'uppercase', marginBottom: '4px' }}>
            WHAT YOU ALREADY DISCOVERED IN CLARITY
          </div>
          {savedReflection ? (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--aiims-tint-emerald-text)', fontStyle: 'italic', lineHeight: 1.5 }}>
              "{savedReflection}"
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--aiims-text-muted)', fontStyle: 'italic' }}>
              You explored {topicDetail.title} conceptually. Add a reflection in Clarity anytime to connect it further.
            </p>
          )}
        </div>

        {/* ACTION / CTA */}
        {(!isFocusActive || showChangeSelector || activeFocusTrack !== displayTopic) ? (
          <Button
            variant="amber"
            size="lg"
            icon={<ArrowRight size={16} />}
            onClick={handleMakeFocus}
            style={{ fontWeight: 800, padding: '14px 28px' }}
          >
            MAKE THIS MY FOCUS
          </Button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3730a3', fontWeight: 800, fontSize: '15px' }}>
              <CheckCircle2 size={20} style={{ color: '#4f46e5' }} /> All session tracking will be logged under this track
            </div>

            <Button
              variant="outline"
              size="md"
              icon={<RefreshCw size={14} />}
              onClick={() => setShowChangeSelector(!showChangeSelector)}
            >
              Change Focus Track
            </Button>
          </div>
        )}
      </Surface>

      {/* ======================================================== */}
      {/* SECTION 2: FOCUS SESSION TIMER & CONTROLS                */}
      {/* ======================================================== */}
      <Surface variant="bordered" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', marginBottom: '2px' }}>
              POMODORO & DEEP WORK TIMER
            </div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--aiims-text-heading)', fontFamily: "'Fredoka', sans-serif" }}>
              Focus Session Workspace
            </h3>
          </div>

          {/* Quick Sound & Notification Toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleToggleSound}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--aiims-border-subtle)',
                backgroundColor: currentConfig.soundEnabled ? 'var(--aiims-card-mint-bg)' : 'var(--aiims-bg-subtle)',
                color: currentConfig.soundEnabled ? 'var(--aiims-card-mint-text)' : 'var(--aiims-text-muted)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700
              }}
              title="Toggle audio chimes for session completion"
            >
              {currentConfig.soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              <span>{currentConfig.soundEnabled ? 'Chimes On' : 'Muted'}</span>
            </button>

            {notificationStatus !== 'granted' && (
              <button
                onClick={handleRequestNotifications}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #fed7aa',
                  backgroundColor: '#fff7ed',
                  color: '#c2410c',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 700
                }}
                title="Enable browser notifications for focus and break alerts"
              >
                <Bell size={15} />
                <span>Alerts</span>
              </button>
            )}
          </div>
        </div>

        {/* CASE A: ACTIVE SESSION RUNNING (FOCUSING OR PAUSED) */}
        {activeSession && (activeSession.sessionState === 'focusing' || activeSession.sessionState === 'paused') && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '32px 16px',
            backgroundColor: activeSession.sessionState === 'paused' ? '#fffbeb' : '#faf5ff',
            borderRadius: '16px',
            border: activeSession.sessionState === 'paused' ? '2px solid #fde68a' : '2px solid #c7d2fe',
            position: 'relative'
          }}>
            {/* Session State Badge */}
            <div style={{ marginBottom: '16px' }}>
              {activeSession.sessionState === 'focusing' ? (
                <Badge variant="primary" icon={<Sparkles size={14} />}>
                  FOCUSING ACTIVE
                </Badge>
              ) : (
                <Badge variant="warning" icon={<Pause size={14} />}>
                  TIMER PAUSED (TIME FROZEN)
                </Badge>
              )}
            </div>

            {/* Track Title & Intention */}
            <h4 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: 'var(--aiims-text-heading)', textAlign: 'center' }}>
              {activeSession.trackTitle}
            </h4>

            {activeSession.intention ? (
              <div style={{
                fontSize: '13px',
                color: 'var(--aiims-text-body)',
                backgroundColor: 'var(--aiims-bg-card)',
                padding: '4px 14px',
                borderRadius: '20px',
                border: '1px solid var(--aiims-border-card)',
                marginBottom: '24px',
                fontStyle: 'italic',
                maxWidth: '80%',
                boxShadow: 'var(--aiims-shadow-card)'
              }}>
                "{activeSession.intention}"
              </div>
            ) : (
              <div style={{ marginBottom: '24px' }} />
            )}

            {/* Circular Progress Ring */}
            <div style={{ position: 'relative', width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="220" height="220" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background Ring */}
                <circle
                  cx="110"
                  cy="110"
                  r={radius}
                  fill="transparent"
                  stroke={activeSession.sessionState === 'paused' ? '#fed7aa' : '#e0e7ff'}
                  strokeWidth="12"
                />
                {/* Progress Arc */}
                <circle
                  cx="110"
                  cy="110"
                  r={radius}
                  fill="transparent"
                  stroke={activeSession.sessionState === 'paused' ? '#f59e0b' : '#4f46e5'}
                  strokeWidth="12"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>

              {/* Center Countdown Digits */}
              <div style={{
                position: 'absolute',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <span style={{
                  fontSize: '46px',
                  fontWeight: 900,
                  color: activeSession.sessionState === 'paused' ? '#b45309' : 'var(--aiims-text-heading)',
                  fontFamily: "'Courier New', Courier, monospace",
                  letterSpacing: '-1px'
                }}>
                  {formatTime(remainingSeconds)}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aiims-text-muted)' }}>
                  {progressPercent}% completed
                </span>
              </div>
            </div>

            {/* Cycle indicator */}
            <div style={{ marginTop: '16px', fontSize: '12px', fontWeight: 700, color: 'var(--aiims-text-muted)' }}>
              Focus Block #{activeSession.completedCycles + 1}
              {activeSession.config.enableLongBreak && (
                <span> &bull; Long Break after {activeSession.config.longBreakInterval} cycles</span>
              )}
            </div>

            {/* Controls Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {activeSession.sessionState === 'focusing' ? (
                <Button
                  variant="amber"
                  size="lg"
                  icon={<Pause size={18} />}
                  onClick={pauseFocusSession}
                  style={{ minWidth: '130px' }}
                >
                  Pause
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  icon={<Play size={18} />}
                  onClick={resumeFocusSession}
                  style={{ minWidth: '130px' }}
                >
                  Resume
                </Button>
              )}

              <Button
                variant="outline"
                size="lg"
                icon={<CheckCircle2 size={18} />}
                onClick={completeFocusPeriod}
                title="Mark this focus period as completed"
              >
                Complete Early
              </Button>

              <Button
                variant="ghost"
                size="md"
                icon={<StopCircle size={16} />}
                onClick={() => setShowEndConfirm(true)}
                style={{ color: '#dc2626' }}
              >
                End Session
              </Button>
            </div>

            {/* End Confirmation Modal/Prompt */}
            {showEndConfirm && (
              <div style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: 'var(--aiims-modal-bg)',
                borderRadius: '12px',
                border: '1px solid var(--aiims-modal-border)',
                maxWidth: '420px',
                textAlign: 'center',
                boxShadow: 'var(--aiims-shadow-modal)'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--aiims-text-heading)', marginBottom: '6px' }}>
                  End this focus session early?
                </div>
                <p style={{ fontSize: '12px', color: 'var(--aiims-text-secondary, #64748b)', margin: '0 0 14px', lineHeight: 1.4 }}>
                  {activeSession.accumulatedFocusSeconds >= 30
                    ? `Your ${Math.round(activeSession.accumulatedFocusSeconds / 60)} minutes of active focus will be preserved in your session history.`
                    : 'Sessions with less than 30 seconds of focus are discarded.'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      endFocusSession(true);
                      setShowEndConfirm(false);
                    }}
                  >
                    Yes, End Session
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEndConfirm(false)}
                  >
                    Keep Focusing
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CASE B: FOCUS PERIOD COMPLETED (OFFER BREAK) */}
        {activeSession && activeSession.sessionState === 'completed' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '36px 20px',
            backgroundColor: 'var(--aiims-card-banner-bg)',
            borderRadius: '16px',
            border: '2px solid var(--aiims-card-banner-border)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--aiims-bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--aiims-primary)',
              marginBottom: '16px'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <Badge variant="purple" size="md">
              FOCUS PERIOD COMPLETED
            </Badge>

            <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--aiims-text-heading)', margin: '12px 0 8px', fontFamily: "'Fredoka', sans-serif" }}>
              Great Work! Focus Interval Finished.
            </h3>

            <p style={{ color: 'var(--aiims-text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 0 24px', lineHeight: 1.5 }}>
              You focused for <strong>{Math.round(activeSession.totalPeriodSeconds / 60)} minutes</strong> on <em>{activeSession.trackTitle}</em>.
              Taking a restorative break now boosts memory consolidation and prevents mental fatigue.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                variant="green"
                size="lg"
                icon={<Coffee size={18} />}
                onClick={() => startBreakPeriod()}
              >
                Start {activeSession.config.breakDurationMinutes}-min Break
              </Button>

              <Button
                variant="secondary"
                size="lg"
                icon={<Play size={18} />}
                onClick={skipBreakPeriod}
              >
                Skip Break & Focus Again
              </Button>

              <Button
                variant="outline"
                size="md"
                onClick={() => endFocusSession(false)}
              >
                Finish & Review
              </Button>
            </div>
          </div>
        )}

        {/* CASE C: ACTIVE BREAK RUNNING */}
        {activeSession && activeSession.sessionState === 'break' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '36px 20px',
            backgroundColor: '#ecfdf5',
            borderRadius: '16px',
            border: '2px solid #a7f3d0',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#d1fae5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              marginBottom: '14px'
            }}>
              <Coffee size={28} />
            </div>

            <Badge variant="success" size="md">
              {activeSession.periodType === 'long_break' ? 'LONG RESTORATIVE BREAK' : 'REST & RECHARGE BREAK'}
            </Badge>

            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#064e3b', margin: '12px 0 6px', fontFamily: "'Fredoka', sans-serif" }}>
              Time to Step Away
            </h3>

            <p style={{ color: '#047857', fontSize: '13px', maxWidth: '440px', margin: '0 0 20px', lineHeight: 1.4 }}>
              Hydrate, stretch, look at something 20 feet away, or take a quick walk. AIIMS will alert you when it's time to focus again.
            </p>

            {/* Break Countdown Display */}
            <div style={{
              fontSize: '52px',
              fontWeight: 900,
              color: '#065f46',
              fontFamily: "'Courier New', Courier, monospace",
              marginBottom: '20px'
            }}>
              {formatTime(remainingSeconds)}
            </div>

            {/* Break Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                variant="primary"
                size="lg"
                icon={<Play size={18} />}
                onClick={skipBreakPeriod}
              >
                Resume Focus Early
              </Button>

              <Button
                variant="ghost"
                size="md"
                icon={<StopCircle size={16} />}
                onClick={() => endFocusSession(false)}
                style={{ color: 'var(--aiims-text-secondary, #64748b)' }}
              >
                End Session
              </Button>
            </div>
          </div>
        )}

        {/* CASE D: IDLE SETUP (NO ACTIVE SESSION) */}
        {(!activeSession || activeSession.sessionState === 'idle' || activeSession.sessionState === 'abandoned') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* FOCUS DURATION SELECTOR */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--aiims-text-heading)', marginBottom: '8px' }}>
                1. Focus Duration
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                {FOCUS_DURATION_PRESETS.map((preset) => {
                  const isSelected = !isCustomMode && selectedFocusMinutes === preset.minutes;
                  return (
                    <button
                      key={preset.minutes}
                      type="button"
                      onClick={() => {
                        setSelectedFocusMinutes(preset.minutes);
                        setIsCustomMode(false);
                      }}
                      style={{
                        padding: '14px 12px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid var(--aiims-primary)' : '1px solid var(--aiims-border-subtle)',
                        backgroundColor: isSelected ? 'var(--aiims-bg-card)' : 'var(--aiims-bg-subtle)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontSize: '18px', fontWeight: 900, color: isSelected ? 'var(--aiims-primary)' : 'var(--aiims-text-heading)' }}>
                        {preset.label}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: isSelected ? 'var(--aiims-primary)' : 'var(--aiims-text-muted)' }}>
                        {preset.title}
                      </div>
                    </button>
                  );
                })}

                {/* Custom Duration Button */}
                <button
                  type="button"
                  onClick={() => setIsCustomMode(!isCustomMode)}
                  style={{
                    padding: '14px 12px',
                    borderRadius: '12px',
                    border: isCustomMode ? '2px solid var(--aiims-primary)' : '1px solid var(--aiims-border-subtle)',
                    backgroundColor: isCustomMode ? 'var(--aiims-bg-card)' : 'var(--aiims-bg-subtle)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 900, color: isCustomMode ? 'var(--aiims-primary)' : 'var(--aiims-text-heading)' }}>
                    Custom
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: isCustomMode ? 'var(--aiims-primary)' : 'var(--aiims-text-muted)' }}>
                    1–180 minutes
                  </div>
                </button>
              </div>

              {isCustomMode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    placeholder="Enter minutes (e.g. 35)"
                    value={customFocusInput}
                    onChange={(e) => setCustomFocusInput(e.target.value)}
                    style={{
                      width: '180px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--aiims-input-border, #cbd5e1)',
                      backgroundColor: 'var(--aiims-input-bg, transparent)',
                      color: 'var(--aiims-input-text, inherit)',
                      fontSize: '14px'
                    }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--aiims-text-secondary, #64748b)' }}>
                    Recommended: 25 to 50 minutes for cognitive retention.
                  </span>
                </div>
              )}
            </div>

            {/* BREAK DURATION SELECTOR */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--aiims-text-heading)', marginBottom: '8px' }}>
                2. Rest Rhythm (Break Interval)
              </label>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {BREAK_DURATION_PRESETS.map((preset) => {
                  const isSelected = selectedBreakMinutes === preset.minutes;
                  return (
                    <button
                      key={preset.minutes}
                      type="button"
                      onClick={() => setSelectedBreakMinutes(preset.minutes)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid #059669' : '1px solid var(--aiims-border-subtle)',
                        backgroundColor: isSelected ? 'var(--aiims-card-mint-bg)' : 'var(--aiims-bg-subtle)',
                        color: isSelected ? 'var(--aiims-card-mint-text)' : 'var(--aiims-text-body)',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      {preset.title} ({preset.label})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LONG BREAK SETTINGS */}
            <div style={{
              padding: '14px 16px',
              backgroundColor: 'var(--aiims-bg-subtle)',
              borderRadius: '12px',
              border: '1px solid var(--aiims-border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--aiims-text-heading)' }}>
                  Extended 15-Minute Break
                </div>
                <div style={{ fontSize: '12px', color: 'var(--aiims-text-muted)' }}>
                  Automatically triggers after 4 completed focus blocks.
                </div>
              </div>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
                <input
                  type="checkbox"
                  checked={enableLongBreak}
                  onChange={(e) => setEnableLongBreak(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#d97706', cursor: 'pointer' }}
                />
                Enable Long Breaks
              </label>
            </div>

            {/* SESSION INTENTION INPUT */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--aiims-text-heading)', marginBottom: '6px' }}>
                3. Focus Goal or Intention (Optional)
              </label>
              <input
                type="text"
                placeholder={`e.g., Draft a 3-step prompt pipeline in ${displayTopic}`}
                value={sessionIntention}
                onChange={(e) => setSessionIntention(e.target.value)}
                maxLength={120}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--aiims-input-border)',
                  fontSize: '14px',
                  color: 'var(--aiims-input-text)',
                  backgroundColor: 'var(--aiims-input-bg)'
                }}
              />
            </div>

            {/* START BUTTON */}
            <div>
              <Button
                variant="amber"
                size="lg"
                icon={<Play size={18} />}
                onClick={handleStartSession}
                style={{
                  fontWeight: 900,
                  fontSize: '15px',
                  padding: '14px 32px',
                  width: '100%',
                  justifyContent: 'center'
                }}
              >
                START FOCUS SESSION ({isCustomMode && customFocusInput ? customFocusInput : selectedFocusMinutes} MIN)
              </Button>

              <div style={{ fontSize: '12px', color: 'var(--aiims-text-secondary, #64748b)', textAlign: 'center', marginTop: '8px' }}>
                Zero credit deductions. Uses precision epoch timestamps that stay accurate even if this tab is closed or backgrounded.
              </div>
            </div>
          </div>
        )}
      </Surface>

      {/* ======================================================== */}
      {/* SECTION 3: SESSION HISTORY & PROGRESS RECORDS            */}
      {/* ======================================================== */}
      <Surface variant="bordered" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', marginBottom: '2px' }}>
              ACCOUNTABILITY & HABIT TRACKING
            </div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--aiims-text-heading)', fontFamily: "'Fredoka', sans-serif" }}>
              Focus Session History
            </h3>
          </div>

          {sessionHistory.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setHistoryFilter(historyFilter === 'all' ? 'completed' : 'all')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--aiims-border-card)',
                  backgroundColor: 'var(--aiims-bg-card)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--aiims-text-muted)',
                  cursor: 'pointer'
                }}
              >
                {historyFilter === 'all' ? 'Filter: All Sessions' : 'Filter: Completed Only'}
              </button>

              <button
                type="button"
                onClick={clearFocusSessionHistory}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #fee2e2',
                  backgroundColor: '#fff5f5',
                  color: '#dc2626',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Clear all recorded session history"
              >
                <Trash2 size={13} /> Clear
              </button>
            </div>
          )}
        </div>

        {/* SUMMARY STATS GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{ padding: '16px', backgroundColor: 'var(--aiims-bg-subtle)', borderRadius: '12px', border: '1px solid var(--aiims-border-subtle)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--aiims-text-muted)', textTransform: 'uppercase' }}>
              Completed Sessions
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--aiims-text-heading)', marginTop: '4px' }}>
              {completedSessions.length}
            </div>
          </div>

          <div style={{ padding: '16px', backgroundColor: 'var(--aiims-bg-subtle)', borderRadius: '12px', border: '1px solid var(--aiims-border-subtle)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--aiims-text-muted)', textTransform: 'uppercase' }}>
              Total Focus Time
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--aiims-primary)', marginTop: '4px' }}>
              {totalFocusMins >= 60 ? `${totalFocusHours}h` : `${totalFocusMins}m`}
            </div>
          </div>

          <div style={{ padding: '16px', backgroundColor: 'var(--aiims-bg-subtle)', borderRadius: '12px', border: '1px solid var(--aiims-border-subtle)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--aiims-text-muted)', textTransform: 'uppercase' }}>
              Today's Sessions
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#059669', marginTop: '4px' }}>
              {todaySessions.length}
            </div>
          </div>
        </div>

        {/* HISTORY LIST */}
        {filteredHistory.length === 0 ? (
          <div style={{
            padding: '36px 16px',
            textAlign: 'center',
            backgroundColor: 'var(--aiims-bg-subtle)',
            borderRadius: '12px',
            border: '1px dashed var(--aiims-border-card)'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'var(--aiims-bg-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--aiims-text-muted)',
              margin: '0 auto 10px'
            }}>
              <Clock size={20} />
            </div>
            <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: 'var(--aiims-text-heading)' }}>
              No focus sessions recorded yet
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--aiims-text-muted)' }}>
              Start your first session above. All completed and partial blocks will be reliably tracked here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredHistory.map((session) => {
              const startDate = new Date(session.startedAt);
              const formattedDate = !isNaN(startDate.getTime())
                ? startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : 'Recent';

              const actualMins = Math.round((session.actualFocusSeconds || 0) / 60);

              return (
                <div
                  key={session.id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--aiims-bg-card)',
                    border: '1px solid var(--aiims-border-card)',
                    boxShadow: 'var(--aiims-shadow-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: session.status === 'completed' ? 'var(--aiims-tint-emerald-bg)' : 'var(--aiims-bg-card-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: session.status === 'completed' ? 'var(--aiims-tint-emerald-text)' : 'var(--aiims-text-muted)'
                    }}>
                      {session.status === 'completed' ? <Check size={16} /> : <StopCircle size={16} />}
                    </div>

                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--aiims-text-heading)' }}>
                        {session.trackTitle}
                      </div>
                      {session.intention && (
                        <div style={{ fontSize: '12px', color: 'var(--aiims-text-muted)', fontStyle: 'italic' }}>
                          "{session.intention}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--aiims-text-heading)' }}>
                        {actualMins}m focused
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--aiims-text-subtle)' }}>
                        {formattedDate}
                      </div>
                    </div>

                    {session.status === 'completed' ? (
                      <Badge variant="success" size="sm">
                        Completed
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        Ended Early
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Surface>

      {/* ======================================================== */}
      {/* SECTION 4: CONNECTED SIGNALS (RADAR LINK)               */}
      {/* ======================================================== */}
      {isFocusActive && (
        <Surface variant="cyan" radius="lg" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', marginBottom: '2px' }}>
                CONNECTED LANDSCAPE
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--aiims-text-heading)', fontFamily: "'Fredoka', sans-serif" }}>
                WHAT'S CHANGING AROUND YOUR FOCUS
              </h3>
            </div>

            <Button
              variant="cyan"
              size="sm"
              icon={<Radar size={14} />}
              onClick={() => setActiveTab && setActiveTab('radar')}
            >
              Explore Connected Signals
            </Button>
          </div>

          <div style={{ padding: '14px', backgroundColor: 'var(--aiims-bg-card)', borderRadius: 'var(--aiims-card-radius, 12px)', border: '1px solid var(--aiims-border-card)', boxShadow: 'var(--aiims-shadow-card)', color: 'var(--aiims-text-body)' }}>
            <strong style={{ color: 'var(--aiims-primary)' }}>Active AI Signal: </strong>
            Autonomous Tool-Calling Agents are shifting core workflow design in {displayTopic}.
          </div>
        </Surface>
      )}

      {/* ======================================================== */}
      {/* SECTION 5: OTHER CANDIDATE AREAS                         */}
      {/* ======================================================== */}
      {(alternativeAreas.length > 0 || showChangeSelector) && (
        <Surface variant="amber" radius="lg" padding="lg">
          <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 800, color: 'var(--aiims-text-heading)', fontFamily: "'Fredoka', sans-serif" }}>
            Other Focus Candidates
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {alternativeAreas.map((altTopic) => {
              const altDetail = FOCUS_DETAILS_DATABASE[altTopic] || getFallbackFocusDetail(altTopic);

              return (
                <div
                  key={altTopic}
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--aiims-card-radius, 12px)',
                    backgroundColor: 'var(--aiims-bg-card)',
                    border: '1px solid var(--aiims-border-card)',
                    boxShadow: 'var(--aiims-shadow-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div>
                    <h4 style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
                      {altDetail.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--aiims-text-muted)' }}>
                      {altDetail.whyThisMatters}
                    </p>
                  </div>

                  <Button
                    variant="amber"
                    size="sm"
                    onClick={() => handleChangeFocus(altTopic)}
                  >
                    Select as Focus
                  </Button>
                </div>
              );
            })}
          </div>
        </Surface>
      )}

    </div>
  );
};
