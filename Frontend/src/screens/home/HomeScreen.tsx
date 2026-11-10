import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  Route,
  CheckCircle2,
  Lock,
  Flame,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { resolveLearnerNextAction } from '../../services/journeyResolver';

export interface HomeScreenProps {
  setActiveTab: (tab: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ setActiveTab }) => {
  const { state } = useLearner();

  // Authoritative Learner Details
  const userName = state.profile?.name ? state.profile.name.trim().split(' ')[0] : 'Learner';
  const userStage = state.profile?.stage || 'Explorer';

  // Authoritative Next Action & Canonical 10 Stages
  const nextAction = useMemo(() => resolveLearnerNextAction(state), [state]);

  // Actual Milestone Progress Calculation (no hardcoded/hallucinated values)
  const completedMilestones = useMemo(() => {
    return nextAction.journeyStages.filter((s) => s.status === 'completed').length;
  }, [nextAction.journeyStages]);

  const progressPercent = Math.min(100, Math.max(0, Math.round((completedMilestones / 10) * 100)));

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

  // Roadmap flowchart expansion state (collapsed by default)
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 'var(--aiims-content-max-width, 1120px)',
        margin: '0 auto',
        padding: 'clamp(16px, 3vw, 24px)',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      {/* Waving-hand subtle CSS keyframes */}
      <style>{`
        @keyframes aiimsWave {
          0% { transform: rotate(0deg); }
          15% { transform: rotate(14deg); }
          30% { transform: rotate(-10deg); }
          45% { transform: rotate(14deg); }
          60% { transform: rotate(-4deg); }
          75% { transform: rotate(10deg); }
          100% { transform: rotate(0deg); }
        }
        .aiims-wave-hand {
          display: inline-block;
          transform-origin: 70% 70%;
          animation: aiimsWave 2s ease-in-out infinite;
        }
      `}</style>

      {/* =========================================================================
          ELEMENT A: PERSONALIZED GREETING
          ========================================================================= */}
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--aiims-text-muted, #64748b)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <span>{formattedDate}</span>
            <span>•</span>
            <Badge variant="lavender" size="sm">
              {userStage}
            </Badge>
          </div>
        </div>

        <h1
          style={{
            fontSize: 'clamp(22px, 4vw, 28px)',
            fontWeight: 800,
            color: 'var(--aiims-text-heading, #0f172a)',
            margin: 0,
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <span>
            {greeting}, {userName}
          </span>
          <span className="aiims-wave-hand" role="img" aria-label="Waving hand">
            👋
          </span>
        </h1>

        <p
          style={{
            fontSize: '14px',
            color: 'var(--aiims-text-secondary, #475569)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Welcome to your personal AI learning command center. Here is your current progress and next step.
        </p>
      </header>

      {/* =========================================================================
          ELEMENT B: LEARNER PROGRESS LINE
          ========================================================================= */}
      <div
        style={{
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          border: '1px solid var(--aiims-border-card, #ede9fe)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: 'var(--aiims-shadow-card, 0 2px 8px rgba(99, 102, 241, 0.04))',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} color="var(--aiims-primary, #6366f1)" />
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--aiims-text-heading, #0f172a)',
              }}
            >
              Overall Journey Progress
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--aiims-text-secondary, #475569)',
              }}
            >
              {completedMilestones} of 10 stages completed
            </span>
            <Badge
              variant={progressPercent === 100 ? 'mint' : progressPercent > 0 ? 'sky' : 'neutral'}
              size="sm"
            >
              {progressPercent}% Complete
            </Badge>
          </div>
        </div>

        {/* Thin, clean progress bar */}
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Learner Journey Progress"
          style={{
            height: '6px',
            width: '100%',
            backgroundColor: 'var(--aiims-border-subtle, #f1f5f9)',
            borderRadius: '9999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              backgroundColor:
                progressPercent === 100
                  ? 'var(--aiims-token-mint-base, #059669)'
                  : 'var(--aiims-primary, #6366f1)',
              borderRadius: '9999px',
              transition: 'width 0.4s ease-in-out',
            }}
          />
        </div>
      </div>

      {/* =========================================================================
          ELEMENT C: NEXT RECOMMENDED STEP
          ========================================================================= */}
      <div
        style={{
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          border: '1.5px solid var(--aiims-primary-border, #c7d2fe)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 4px 14px rgba(99, 102, 241, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background:
              'linear-gradient(90deg, var(--aiims-primary, #6366f1), var(--aiims-token-lavender-accent, #7c3aed))',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--aiims-primary, #4338ca)',
            }}
          >
            <Sparkles size={14} color="var(--aiims-primary, #6366f1)" />
            <span>Recommended Next Step • {nextAction.currentStageTitle}</span>
          </div>
          <Badge variant="primary" size="sm">
            Active Goal
          </Badge>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ flex: '1 1 280px', minWidth: '240px' }}>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--aiims-text-heading, #0f172a)',
                margin: '0 0 6px 0',
                lineHeight: 1.3,
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

          <div>
            <Button
              variant="primary"
              size="md"
              icon={<ArrowRight size={15} />}
              onClick={() => setActiveTab(nextAction.targetTab)}
              style={{
                minHeight: '44px',
                padding: '0 20px',
                fontWeight: 700,
              }}
            >
              {nextAction.actionButtonLabel}
            </Button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ELEMENT D: TEN-STAGE LEARNING GRID
          ========================================================================= */}
      <section style={{ marginBottom: '28px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--aiims-text-heading, #0f172a)',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              10-Stage Curriculum
            </h2>
            <p
              style={{
                fontSize: '12.5px',
                color: 'var(--aiims-text-muted, #64748b)',
                margin: '2px 0 0 0',
              }}
            >
              Structured progression from baseline awareness to continuous improvement.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: '12px',
          }}
        >
          {nextAction.journeyStages.map((stage) => {
            const isCompleted = stage.status === 'completed';
            const isCurrent = stage.status === 'current';
            const isLocked = !isCompleted && !isCurrent;

            const stageNumberStr = stage.number < 10 ? `Stage 0${stage.number}` : `Stage ${stage.number}`;

            return (
              <div
                key={stage.id}
                role={isLocked ? undefined : 'button'}
                tabIndex={isLocked ? -1 : 0}
                aria-disabled={isLocked ? true : undefined}
                onClick={isLocked ? undefined : () => setActiveTab(stage.targetTab)}
                onKeyDown={
                  isLocked
                    ? undefined
                    : (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setActiveTab(stage.targetTab);
                        }
                      }
                }
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: isCurrent
                    ? 'var(--aiims-primary-light, #eef2ff)'
                    : isCompleted
                      ? 'var(--aiims-token-mint-bg, #ecfdf5)'
                      : 'var(--aiims-bg-card, #ffffff)',
                  border: isCurrent
                    ? '2px solid var(--aiims-primary, #6366f1)'
                    : isCompleted
                      ? '1px solid var(--aiims-token-mint-border, #a7f3d0)'
                      : '1px solid var(--aiims-border-card, #ede9fe)',
                  boxShadow: isCurrent
                    ? '0 4px 12px rgba(99, 102, 241, 0.12)'
                    : 'var(--aiims-shadow-card, 0 2px 6px rgba(0, 0, 0, 0.02))',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.72 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '130px',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  outline: 'none',
                }}
              >
                <div>
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
                          ? 'var(--aiims-primary, #4338ca)'
                          : isCompleted
                            ? 'var(--aiims-token-mint-text, #047857)'
                            : 'var(--aiims-text-muted, #94a3b8)',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {stageNumberStr}
                    </span>

                    {isCompleted ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--aiims-token-mint-text, #047857)',
                          backgroundColor: 'rgba(5, 150, 105, 0.08)',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                        }}
                      >
                        <CheckCircle2 size={13} color="#059669" />
                        Completed
                      </span>
                    ) : isCurrent ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--aiims-primary-text, #4338ca)',
                          backgroundColor: 'rgba(99, 102, 241, 0.12)',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                        }}
                      >
                        <Flame size={13} color="var(--aiims-primary, #6366f1)" />
                        Current
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--aiims-text-muted, #94a3b8)',
                          backgroundColor: 'rgba(148, 163, 184, 0.1)',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                        }}
                      >
                        <Lock size={12} color="#94a3b8" />
                        Locked
                      </span>
                    )}
                  </div>

                  <h3
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: isLocked
                        ? 'var(--aiims-text-secondary, #475569)'
                        : 'var(--aiims-text-heading, #0f172a)',
                      margin: '0 0 3px 0',
                      lineHeight: 1.3,
                    }}
                  >
                    {stage.name}
                  </h3>

                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: isCurrent
                        ? 'var(--aiims-primary-text, #4338ca)'
                        : isCompleted
                          ? 'var(--aiims-token-mint-text, #047857)'
                          : 'var(--aiims-text-muted, #64748b)',
                      marginBottom: '6px',
                    }}
                  >
                    {stage.subtitle}
                  </div>

                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--aiims-text-muted, #64748b)',
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {stage.description}
                  </p>
                </div>

                <div
                  style={{
                    marginTop: '12px',
                    paddingTop: '8px',
                    borderTop: isCurrent
                      ? '1px solid rgba(99, 102, 241, 0.15)'
                      : isCompleted
                        ? '1px solid rgba(5, 150, 105, 0.15)'
                        : '1px solid var(--aiims-border-subtle, #f1f5f9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: isLocked
                        ? 'var(--aiims-text-muted, #94a3b8)'
                        : isCurrent
                          ? 'var(--aiims-primary, #6366f1)'
                          : 'var(--aiims-token-mint-text, #047857)',
                    }}
                  >
                    {isLocked ? 'Locked' : isCurrent ? 'Continue Stage' : 'Review Stage'}
                  </span>
                  {!isLocked && (
                    <ArrowRight
                      size={13}
                      color={isCurrent ? 'var(--aiims-primary, #6366f1)' : '#059669'}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          ELEMENT E: COLLAPSED ROADMAP FLOWCHART
          ========================================================================= */}
      <section
        style={{
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          border: '1px solid var(--aiims-border-card, #ede9fe)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '28px',
          boxShadow: 'var(--aiims-shadow-card, 0 2px 8px rgba(99, 102, 241, 0.04))',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none',
            gap: '12px',
            flexWrap: 'wrap',
          }}
          onClick={() => setIsRoadmapOpen((prev) => !prev)}
          role="button"
          tabIndex={0}
          aria-expanded={isRoadmapOpen}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsRoadmapOpen((prev) => !prev);
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'var(--aiims-primary-light, #eef2ff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Route size={16} color="var(--aiims-primary, #6366f1)" />
            </div>
            <div>
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--aiims-text-heading, #0f172a)',
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                10-Stage Learning Roadmap Flowchart
              </h3>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--aiims-text-muted, #64748b)',
                  margin: '2px 0 0 0',
                }}
              >
                Sequential visual progression path from Baseline Assessment to Mastery
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            icon={isRoadmapOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            onClick={(e) => {
              e.stopPropagation();
              setIsRoadmapOpen((prev) => !prev);
            }}
            aria-label={isRoadmapOpen ? 'Collapse Flowchart' : 'Expand Flowchart'}
          >
            {isRoadmapOpen ? 'Collapse Flowchart' : 'View Flowchart'}
          </Button>
        </div>

        {/* Expandable Flowchart View */}
        {isRoadmapOpen && (
          <div
            style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid var(--aiims-border-subtle, #f1f5f9)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {nextAction.journeyStages.map((stage, idx) => {
                const isCompleted = stage.status === 'completed';
                const isCurrent = stage.status === 'current';
                const isLocked = !isCompleted && !isCurrent;
                const isLast = idx === nextAction.journeyStages.length - 1;

                return (
                  <React.Fragment key={stage.id}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        backgroundColor: isCurrent
                          ? 'var(--aiims-primary-light, #eef2ff)'
                          : isCompleted
                            ? 'var(--aiims-token-mint-bg, #ecfdf5)'
                            : 'var(--aiims-border-subtle, #f8fafc)',
                        border: isCurrent
                          ? '1.5px solid var(--aiims-primary, #6366f1)'
                          : isCompleted
                            ? '1px solid var(--aiims-token-mint-border, #a7f3d0)'
                            : '1px solid var(--aiims-border-subtle, #e2e8f0)',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: isCurrent
                          ? 'var(--aiims-primary-text, #4338ca)'
                          : isCompleted
                            ? 'var(--aiims-token-mint-text, #047857)'
                            : 'var(--aiims-text-muted, #94a3b8)',
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        opacity: isLocked ? 0.75 : 1,
                      }}
                      onClick={isLocked ? undefined : () => setActiveTab(stage.targetTab)}
                      title={`${stage.name}: ${stage.subtitle} (${isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Locked'})`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={13} color="#059669" />
                      ) : isCurrent ? (
                        <Flame size={13} color="var(--aiims-primary, #6366f1)" />
                      ) : (
                        <Lock size={12} color="#94a3b8" />
                      )}
                      <span>
                        {stage.number}. {stage.name}
                      </span>
                    </div>
                    {!isLast && (
                      <span
                        style={{
                          color: 'var(--aiims-text-muted, #cbd5e1)',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                        aria-hidden="true"
                      >
                        →
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default HomeScreen;
