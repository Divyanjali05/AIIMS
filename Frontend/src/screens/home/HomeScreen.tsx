import React, { useState, useEffect } from 'react';
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
  Zap,
  Layers,
  Cpu,
  HelpCircle,
  Wrench,
  Bot
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { MentorMessage } from '../../components/common/MentorMessage';
import { buildLearnerProfileContext } from '../../services/learnerProfileContext';
import { MentorService, MentorResponse } from '../../services/mentorProvider';
import { SignalDataProvider } from '../../services/signalDataProvider';
import { resolveLearnerNextAction } from '../../services/journeyResolver';
import { evaluateSignalRelevance } from '../../services/relevanceEngine';
import { RadarSignal } from '../../types';

interface HomeScreenProps {
  setActiveTab: (tab: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ setActiveTab }) => {
  const { state } = useLearner();
  const userName = state.profile?.name ? state.profile.name.split(' ')[0] : 'Learner';

  const learnerContext = buildLearnerProfileContext(state);
  const nextAction = resolveLearnerNextAction(state);

  const [mentorResponse, setMentorResponse] = useState<MentorResponse | null>(null);
  const [recentSignals, setRecentSignals] = useState<RadarSignal[]>([]);

  useEffect(() => {
    let isMounted = true;
    MentorService.getMentorObservation(learnerContext, state).then((res) => {
      if (isMounted) setMentorResponse(res);
    });
    SignalDataProvider.getSignals().then((signals) => {
      if (isMounted) {
        setRecentSignals(signals.slice(0, 3));
      }
    });
    return () => {
      isMounted = false;
    };
  }, [state]);

  const activeFocus = state.focus.selectedTrack || 'AI Workflow Design';
  const userTools = state.aiWallet?.userTools || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1060px', margin: '0 auto' }}>

      {/* 1. ATMOSPHERIC JOURNEY HUB HEADER */}
      <Surface variant="gradient-hero" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', letterSpacing: '1px', textTransform: 'uppercase' }}>
                AIIMS CANONICAL LEARNER JOURNEY HUB
              </span>
            </div>
            <h1 style={{
              margin: '0 0 4px 0',
              fontSize: '30px',
              fontWeight: 800,
              color: '#0f172a',
              fontFamily: "'Fredoka', 'Outfit', sans-serif",
              letterSpacing: '-0.5px'
            }}>
              Welcome back, {userName}
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#4338ca', fontWeight: 600 }}>
              Current Stage: <span style={{ fontWeight: 800 }}>{nextAction.currentStageTitle}</span> • {state.profile.role || 'AI Learner'}
            </p>
          </div>

          <Badge variant="purple" icon={<Sparkles size={13} />}>
            {nextAction.progressPercent}% Journey Completion
          </Badge>
        </div>

        <MentorMessage
          message={mentorResponse?.message || `Welcome to AIIMS! Your next step is to ${nextAction.nextActionTitle.toLowerCase()}.`}
          action={
            <Button
              variant="violet"
              size="md"
              icon={<ArrowRight size={15} />}
              onClick={() => setActiveTab(nextAction.targetTab)}
            >
              {nextAction.actionButtonLabel}
            </Button>
          }
          style={{ marginBottom: '24px' }}
        />

        {/* PRIMARY HERO SECTION: YOUR NEXT STEP */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '2px solid #6366f1',
          boxShadow: '0 8px 30px rgba(99, 102, 241, 0.12)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            backgroundColor: '#6366f1',
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: 800,
            padding: '4px 12px',
            borderBottomLeftRadius: '8px',
            letterSpacing: '1px'
          }}>
            RECOMMENDED NEXT STEP
          </div>

          <div style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>
            YOUR NEXT STEP
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: "'Fredoka', sans-serif" }}>
            {nextAction.nextActionTitle}
          </h2>

          <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, margin: '0 0 20px', maxWidth: '780px' }}>
            {nextAction.nextActionReason}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              size="lg"
              icon={<ArrowRight size={18} />}
              onClick={() => setActiveTab(nextAction.targetTab)}
            >
              {nextAction.actionButtonLabel}
            </Button>

            {activeFocus && (
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                Active Focus Track: <strong style={{ color: '#4338ca' }}>{activeFocus}</strong>
              </span>
            )}
          </div>
        </div>
      </Surface>

      {/* 2. YOUR AI JOURNEY (10-STAGE CANONICAL VISUAL TIMELINE) */}
      <Surface variant="bordered" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px', fontFamily: "'Fredoka', sans-serif" }}>
              YOUR AI JOURNEY
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              The canonical 10-stage AIIMS learning path. Click any stage to open available modules directly.
            </p>
          </div>

          <Badge variant="cyan" icon={<Compass size={12} />}>
            Non-Linear Guidance Enabled
          </Badge>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px'
        }}>
          {nextAction.journeyStages.map((stage) => {
            const isCompleted = stage.status === 'completed';
            const isCurrent = stage.status === 'current';

            return (
              <div
                key={stage.id}
                onClick={() => setActiveTab(stage.targetTab)}
                style={{
                  backgroundColor: isCurrent ? '#f0fdf4' : isCompleted ? '#f8fafc' : '#ffffff',
                  border: isCurrent ? '2px solid #22c55e' : isCompleted ? '1px solid #cbd5e1' : '1px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '12px 10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: isCurrent ? '#15803d' : isCompleted ? '#475569' : '#94a3b8'
                  }}>
                    {stage.number < 10 ? `0${stage.number}` : stage.number}
                  </span>

                  {isCompleted ? (
                    <CheckCircle2 size={14} color="#16a34a" />
                  ) : isCurrent ? (
                    <Clock size={14} color="#22c55e" />
                  ) : (
                    <Circle size={14} color="#94a3b8" />
                  )}
                </div>

                <div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: isCurrent ? '#14532d' : isCompleted ? '#0f172a' : '#475569',
                    lineHeight: 1.2
                  }}>
                    {stage.name}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', lineHeight: 1.2 }}>
                    {stage.subtitle}
                  </div>
                </div>

                <div style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: isCurrent ? '#16a34a' : isCompleted ? '#64748b' : '#94a3b8',
                  marginTop: 'auto'
                }}>
                  {isCompleted ? '✓ Done' : isCurrent ? '● Recommended' : '○ Available'}
                </div>
              </div>
            );
          })}
        </div>
      </Surface>

      {/* 3. RECENT AI OPPORTUNITIES (MULTI-SIGNAL RADAR PERSONALIZATION) */}
      <Surface variant="bordered" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px', fontFamily: "'Fredoka', sans-serif" }}>
              RECENT AI OPPORTUNITIES FOR YOU
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              AI ecosystem shifts personalized against your profile, focus ({activeFocus}), and evaluated Wallet tools.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={<Radar size={14} />}
            onClick={() => setActiveTab('radar')}
          >
            Explore AI Radar
          </Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
          {recentSignals.map((sig) => {
            const rel = evaluateSignalRelevance(sig, learnerContext);
            return (
              <div
                key={sig.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Badge variant="cyan">{rel.qualitativeTier}</Badge>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{sig.category}</span>
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                    {sig.title}
                  </h4>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', fontStyle: 'italic', marginBottom: '6px' }}>
                    "{rel.attributionReason}"
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                    {sig.summary}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  icon={<ArrowRight size={13} />}
                  onClick={() => setActiveTab('radar')}
                  style={{ alignSelf: 'flex-start' }}
                >
                  Inspect Opportunity Details
                </Button>
              </div>
            );
          })}
        </div>
      </Surface>

      {/* 4. YOUR AI TOOLKIT SUMMARY */}
      <Surface variant="bordered" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px', fontFamily: "'Fredoka', sans-serif" }}>
              YOUR AI TOOLKIT ({userTools.length} Tools)
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Your evaluated tools available for problem solving and project workflows.
            </p>
          </div>

          <Button variant="outline" size="sm" icon={<Wallet size={14} />} onClick={() => setActiveTab('wallet')}>
            Manage AI Wallet
          </Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {userTools.map((t) => (
            <div key={t.toolId} style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>{t.toolId.replace('tool-', '').toUpperCase()}</div>
              <span style={{ fontSize: '11px', color: '#4f46e5', fontWeight: 600 }}>{t.primaryCategory}</span>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>Familiarity: {t.familiarity}</div>
            </div>
          ))}
        </div>
      </Surface>

      {/* 5. SECONDARY EXPLORATION MODULE CARDS */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px', fontFamily: "'Fredoka', sans-serif" }}>
          CONTINUE EXPLORING MODULES
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Card 1: Clarity */}
          <Surface variant="bordered" radius="lg" padding="md" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#fef3c7', color: '#d97706' }}>
                  <Compass size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Clarity</h4>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>AI Goals & Direction</span>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4, margin: '0 0 14px' }}>
                Clarify what you actually want AI to help you accomplish in your work.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('clarity')}>
              Open Clarity
            </Button>
          </Surface>

          {/* Card 2: AI Radar */}
          <Surface variant="bordered" radius="lg" padding="md" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                  <Radar size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>AI Radar</h4>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Ecosystem shifts</span>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4, margin: '0 0 14px' }}>
                Discover technical shifts and personalized AI opportunities.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('radar')}>
              Open AI Radar
            </Button>
          </Surface>

          {/* Card 3: Problem Solver */}
          <Surface variant="bordered" radius="lg" padding="md" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#faf5ff', color: '#9333ea' }}>
                  <Wrench size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Problem Solver</h4>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Task workflows</span>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4, margin: '0 0 14px' }}>
                Input real tasks to derive required capabilities and tool execution sequences.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('solver')}>
              Launch Solver
            </Button>
          </Surface>

          {/* Card 4: Build Layer */}
          <Surface variant="bordered" radius="lg" padding="md" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#fff7ed', color: '#ea580c' }}>
                  <Layers size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Build Workspace</h4>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Projects & Workflows</span>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4, margin: '0 0 14px' }}>
                Turn tool capabilities and problem solutions into reusable AI project templates.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('build')}>
              Open Build Area
            </Button>
          </Surface>
        </div>
      </div>
    </div>
  );
};
