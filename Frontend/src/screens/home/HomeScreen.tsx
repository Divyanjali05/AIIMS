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
  Activity
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { buildLearnerProfileContext } from '../../services/learnerProfileContext';
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

  const [topOpportunity, setTopOpportunity] = useState<RadarSignal | null>(null);

  useEffect(() => {
    let isMounted = true;
    SignalDataProvider.getSignals().then((signals) => {
      if (isMounted && signals.length > 0) {
        setTopOpportunity(signals[0]);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const activeFocus = state.focus?.selectedTrack;
  const recentTransactions = (state.credits?.transactions || []).slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '980px', margin: '0 auto' }}>

      {/* 1. SHORT WELCOME & NEXT ACTION HERO */}
      <Surface variant="gradient-hero" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '4px' }}>
              AINOVA LEARNER HUB
            </div>
            <h1 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: 800, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Welcome back, {userName}
            </h1>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#4338ca', fontWeight: 600 }}>
              Current Stage: <span style={{ fontWeight: 800 }}>{nextAction.currentStageTitle}</span>
            </p>
          </div>

          <Badge variant="purple" icon={<Sparkles size={13} />}>
            {nextAction.progressPercent}% Completed
          </Badge>
        </div>

        {/* ONE PRIMARY NEXT ACTION CARD */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '2px solid #5B4BFF',
          boxShadow: '0 8px 24px rgba(91, 75, 255, 0.1)',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            backgroundColor: '#5B4BFF',
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: 800,
            padding: '4px 12px',
            borderBottomLeftRadius: '8px',
            letterSpacing: '0.6px'
          }}>
            YOUR NEXT STEP
          </div>

          <div style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '6px' }}>
            RECOMMENDED ACTION
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: '0 0 8px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {nextAction.nextActionTitle}
          </h2>

          <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: 1.55, margin: '0 0 20px', maxWidth: '720px' }}>
            {nextAction.nextActionReason}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Button
              variant="violet"
              size="lg"
              icon={<ArrowRight size={17} />}
              onClick={() => setActiveTab(nextAction.targetTab)}
            >
              {nextAction.actionButtonLabel}
            </Button>

            {activeFocus && (
              <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                Active Focus Track: <strong style={{ color: '#4338CA' }}>{activeFocus}</strong>
              </span>
            )}
          </div>
        </div>
      </Surface>

      {/* 2. COMPACT JOURNEY PROGRESS */}
      <Surface variant="bordered" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#111827', margin: '0 0 2px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              YOUR AI JOURNEY
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
              The 10-stage progression path. Click any stage to explore.
            </p>
          </div>
          <Badge variant="cyan" icon={<Compass size={12} />}>
            Non-Linear Exploration Enabled
          </Badge>
        </div>

        {/* Compact Grid of 10 Stages */}
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
                  backgroundColor: isCurrent ? '#EEF2FF' : isCompleted ? '#F8FAFC' : '#ffffff',
                  border: isCurrent ? '2px solid #5B4BFF' : isCompleted ? '1px solid #CBD5E1' : '1px dashed #CBD5E1',
                  borderRadius: '12px',
                  padding: '12px 10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: isCurrent ? '#4338CA' : isCompleted ? '#475569' : '#94A3B8'
                  }}>
                    {stage.number < 10 ? `0${stage.number}` : stage.number}
                  </span>

                  {isCompleted ? (
                    <CheckCircle2 size={14} color="#16A34A" />
                  ) : isCurrent ? (
                    <Clock size={14} color="#5B4BFF" />
                  ) : (
                    <Circle size={14} color="#94A3B8" />
                  )}
                </div>

                <div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: isCurrent ? '#312E81' : isCompleted ? '#111827' : '#4B5563',
                    lineHeight: 1.25
                  }}>
                    {stage.name}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px', lineHeight: 1.2 }}>
                    {stage.subtitle}
                  </div>
                </div>

                <div style={{
                  fontSize: '9.5px',
                  fontWeight: 700,
                  color: isCompleted ? '#16A34A' : isCurrent ? '#5B4BFF' : '#94A3B8',
                  marginTop: 'auto'
                }}>
                  {isCompleted ? '✓ Done' : isCurrent ? '● Recommended' : '○ Available'}
                </div>
              </div>
            );
          })}
        </div>
      </Surface>

      {/* 3. RECENT ACTIVITY & TOP OPPORTUNITY (SIDE-BY-SIDE COMPACT) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* RECENT ACTIVITY */}
        <Surface variant="bordered" radius="lg" padding="md">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Activity size={16} color="#5B4BFF" />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Recent Activity
            </h3>
          </div>

          {recentTransactions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentTransactions.map((tx) => (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#F8F9FF', borderRadius: '8px', border: '1px solid #F3F4F6' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}>{tx.description}</div>
                    <div style={{ fontSize: '10px', color: '#64748B' }}>{tx.timestamp}</div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#16A34A' }}>+{tx.amount} Credits</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '12.5px', color: '#64748B', fontStyle: 'italic' }}>
              No recent activity recorded yet.
            </div>
          )}
        </Surface>

        {/* TOP RELEVANT RADAR OPPORTUNITY */}
        {topOpportunity && (
          <Surface variant="bordered" radius="lg" padding="md">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radar size={16} color="#7C3AED" />
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  AI Opportunity
                </h3>
              </div>
              <Badge variant="purple">Radar</Badge>
            </div>

            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
              {topOpportunity.title}
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 12px 0', lineHeight: 1.45 }}>
              {topOpportunity.summary}
            </p>

            <Button
              variant="outline"
              size="sm"
              icon={<ArrowRight size={13} />}
              onClick={() => setActiveTab('radar')}
            >
              Explore Opportunity
            </Button>
          </Surface>
        )}
      </div>

    </div>
  );
};
