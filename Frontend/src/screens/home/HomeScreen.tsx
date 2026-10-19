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
  Activity,
  Lock
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { buildLearnerProfileContext } from '../../services/learnerProfileContext';
import { SignalDataProvider } from '../../services/signalDataProvider';
import { resolveLearnerNextAction } from '../../services/journeyResolver';
import { getFeatureAccess } from '../../services/featureAccessService';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--aiims-grid-gap, 20px)', maxWidth: '980px', margin: '0 auto' }}>

      {/* 1. SHORT WELCOME & NEXT ACTION HERO CARD */}
      <Card variant="gradient-hero" radius="default" padding="default">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '4px' }}>
              AIIMS LEARNER HUB
            </div>
            <h1 style={{ margin: '0 0 4px 0', fontSize: '26px', fontWeight: 800, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          borderRadius: 'var(--aiims-card-radius, 12px)',
          padding: 'var(--aiims-card-padding, 20px)',
          border: '2px solid var(--aiims-primary, #5B4BFF)',
          boxShadow: '0 8px 24px rgba(91, 75, 255, 0.1)',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            backgroundColor: 'var(--aiims-primary, #5B4BFF)',
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: 800,
            padding: '4px 12px',
            borderBottomLeftRadius: '8px',
            letterSpacing: '0.6px'
          }}>
            YOUR NEXT STEP
          </div>

          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--aiims-primary, #4f46e5)', textTransform: 'uppercase', marginBottom: '6px' }}>
            RECOMMENDED ACTION
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--aiims-text-heading, #111827)', margin: '0 0 8px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {nextAction.nextActionTitle}
          </h2>

          <p style={{ fontSize: '14px', color: 'var(--aiims-text-muted, #4B5563)', lineHeight: 1.55, margin: '0 0 18px', maxWidth: '720px' }}>
            {nextAction.nextActionReason}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Button
              variant="violet"
              size="md"
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
      </Card>

      {/* 2. STANDARDIZED 10-STAGE JOURNEY TILES CONTAINER CARD */}
      <Card variant="bordered" radius="default" padding="default">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
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

        {/* Standardized 10-Stage 1:1 Square Grid */}
        <div className="aiims-journey-grid">
          {nextAction.journeyStages.map((stage) => {
            const isCompleted = stage.status === 'completed';
            const isCurrent = stage.status === 'current';
            const isLocked = stage.status === 'locked';

            // Retrieve accurate locked state and reason from Phase 3 single source of truth
            const access = getFeatureAccess(stage.targetTab, state);
            const lockReason = !access.unlocked ? access.reason : undefined;
            const tooltip = isLocked
              ? `${stage.name} (Locked: ${lockReason || 'Activity-gated'})`
              : `${stage.name} — ${stage.subtitle}`;

            return (
              <div
                key={stage.id}
                role="button"
                tabIndex={0}
                aria-label={`${stage.name}: ${isCompleted ? 'Completed' : isCurrent ? 'Recommended next step' : isLocked ? 'Locked' : 'Available'}`}
                onClick={() => setActiveTab(stage.targetTab)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveTab(stage.targetTab);
                  }
                }}
                title={tooltip}
                className="aiims-journey-tile"
                style={{
                  backgroundColor: isCurrent ? 'var(--aiims-card-banner-bg, #EEF2FF)' : isCompleted ? 'var(--aiims-bg-card, #F8FAFC)' : isLocked ? 'var(--aiims-bg-card-hover, #FAFAFC)' : 'var(--aiims-bg-card, #FFFFFF)',
                  border: isCurrent ? '2px solid var(--aiims-primary, #5B4BFF)' : isCompleted ? '1px solid var(--aiims-border-card, #CBD5E1)' : isLocked ? '1px solid var(--aiims-border-card, #E2E8F0)' : '1px dashed var(--aiims-border-card, #CBD5E1)',
                  opacity: isLocked ? 0.78 : 1
                }}
              >
                {/* Top Row: Stage Number + Status Icon (16px standard) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: isCurrent ? 'var(--aiims-primary, #4338CA)' : isCompleted ? 'var(--aiims-text-secondary, #475569)' : 'var(--aiims-text-muted, #94A3B8)'
                  }}>
                    {stage.number < 10 ? `0${stage.number}` : stage.number}
                  </span>

                  <div style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isCompleted ? (
                      <CheckCircle2 size={16} color="#16A34A" />
                    ) : isCurrent ? (
                      <Clock size={16} color="#5B4BFF" />
                    ) : isLocked ? (
                      <Lock size={14} color="#94A3B8" />
                    ) : (
                      <Circle size={15} color="#94A3B8" />
                    )}
                  </div>
                </div>

                {/* Middle Row: Title (truncated with ellipsis) + Subtitle */}
                <div style={{ minWidth: 0 }}>
                  <div
                    className="aiims-journey-tile-title"
                    style={{
                      color: isCurrent ? 'var(--aiims-primary, #312E81)' : isCompleted ? 'var(--aiims-text-heading, #111827)' : 'var(--aiims-text-secondary, #4B5563)'
                    }}
                  >
                    {stage.name}
                  </div>
                  <div
                    className="aiims-journey-tile-subtitle"
                    style={{ color: 'var(--aiims-text-muted, #64748B)' }}
                  >
                    {stage.subtitle}
                  </div>
                </div>

                {/* Bottom Row: Status Badge Pill (10px text, single status) */}
                <div style={{ minWidth: 0 }}>
                  <span
                    className="aiims-journey-tile-badge"
                    style={{
                      backgroundColor: isCompleted ? 'var(--aiims-card-mint-bg, #DCFCE7)' : isCurrent ? 'var(--aiims-card-banner-bg, #E0E7FF)' : 'var(--aiims-bg-card-hover, #F1F5F9)',
                      color: isCompleted ? 'var(--aiims-card-mint-text, #15803D)' : isCurrent ? 'var(--aiims-primary, #4338CA)' : 'var(--aiims-text-muted, #64748B)',
                      border: isCompleted ? '1px solid var(--aiims-card-mint-border, #BBF7D0)' : isCurrent ? '1px solid var(--aiims-border-card, #C7D2FE)' : '1px solid var(--aiims-border-card, #E2E8F0)'
                    }}
                  >
                    {isCompleted ? '✓ Done' : isCurrent ? '● Recommended' : isLocked ? '🔒 Locked' : '○ Available'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 3. RECENT ACTIVITY & TOP OPPORTUNITY (STANDARDIZED 2-COLUMN GRID) */}
      <div className="aiims-card-grid-2col">
        
        {/* RECENT ACTIVITY CARD */}
        <Card
          variant="bordered"
          radius="default"
          padding="default"
          title="Recent Activity"
          icon={<Activity size={20} color="#5B4BFF" />}
          iconSize="button"
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
                    padding: '8px 10px',
                    backgroundColor: 'var(--aiims-table-row-bg, var(--aiims-bg-card-hover))',
                    borderRadius: '8px',
                    border: '1px solid var(--aiims-border-card, #F3F4F6)'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                    <div className="truncate-1-line" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aiims-text-primary, #111827)' }}>
                      {tx.description}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--aiims-text-muted, #64748B)' }}>
                      {tx.timestamp}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#16A34A', flexShrink: 0 }}>
                    +{tx.amount} Credits
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '12.5px', color: '#64748B', fontStyle: 'italic' }}>
              No recent activity recorded yet.
            </div>
          )}
        </Card>

        {/* TOP RELEVANT RADAR OPPORTUNITY CARD */}
        {topOpportunity && (
          <Card
            variant="bordered"
            radius="default"
            padding="default"
            title="AI Opportunity"
            icon={<Radar size={20} color="#7C3AED" />}
            iconSize="button"
            badge={<Badge variant="purple" size="sm">Radar</Badge>}
            footer={
              <Button
                variant="outline"
                size="sm"
                icon={<Lock size={14} />}
                onClick={() => setActiveTab('radar')}
              >
                Locked (Explore Activities)
              </Button>
            }
          >
            <div className="truncate-1-line" style={{ fontSize: '13.5px', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>
              {topOpportunity.title}
            </div>
            <p
              className="aiims-card-body"
              style={{
                fontSize: '12.5px',
                color: '#64748B',
                lineHeight: 1.45,
                margin: 0
              }}
            >
              {topOpportunity.summary}
            </p>
          </Card>
        )}
      </div>

    </div>
  );
};

export default HomeScreen;
