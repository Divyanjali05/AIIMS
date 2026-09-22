import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Circle,
  Compass,
  Target,
  BarChart3,
  Radar,
  Coins,
  MessageCircle
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { buildLearnerProfileContext } from '../../services/learnerProfileContext';
import { MentorService, MentorResponse } from '../../services/mentorProvider';
import { SignalDataProvider } from '../../services/signalDataProvider';
import { RadarSignal } from '../../types';
import { resolveJourneyState } from '../../services/journeyResolver';

interface HomeScreenProps {
  setActiveTab: (tab: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ setActiveTab }) => {
  const { state, selectClarityArea } = useLearner();
  const userName = state.profile?.name ? state.profile.name.split(' ')[0] : 'Learner';
  const credits = state.credits.balance;

  const [mentorResponse, setMentorResponse] = useState<MentorResponse | null>(null);
  const [featuredSignal, setFeaturedSignal] = useState<RadarSignal | null>(null);

  // Dynamic single source of truth for journey & next step
  const journey = resolveJourneyState(state);

  useEffect(() => {
    let isMounted = true;
    const learnerContext = buildLearnerProfileContext(state);
    MentorService.getMentorObservation(learnerContext, state).then((res) => {
      if (isMounted) setMentorResponse(res);
    });
    SignalDataProvider.getSignals().then((signals) => {
      if (isMounted && signals.length > 0) {
        setFeaturedSignal(signals[0]);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [state]);

  const handleExploreCapability = (title: string) => {
    selectClarityArea(title);
    setActiveTab('clarity');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        maxWidth: '920px',
        margin: '0 auto',
        boxSizing: 'border-box',
        paddingBottom: '32px'
      }}
    >
      {/* ==================================================================== */}
      {/* SECTION 1 — HEADER (Lightweight Greeting)                            */}
      {/* ==================================================================== */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '4px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: 800,
            color: '#0f172a',
            fontFamily: "'Fredoka', 'Outfit', sans-serif",
            letterSpacing: '-0.3px',
            lineHeight: 1.2
          }}
        >
          Good morning, {userName}.
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: '15px',
            color: '#64748b',
            fontWeight: 500,
            lineHeight: 1.4
          }}
        >
          Let's continue where you left off.
        </p>
      </header>

      {/* ==================================================================== */}
      {/* SECTION 2 — PRIMARY HERO: LEVEL 1 — YOUR NEXT STEP (Dominant CTA)   */}
      {/* ==================================================================== */}
      <Surface
        variant="bordered"
        radius="lg"
        padding="lg"
        style={{
          backgroundColor: '#ffffff',
          border: '1.5px solid #c7d2fe',
          boxShadow: '0 10px 30px rgba(99, 102, 241, 0.08), 0 2px 6px rgba(0, 0, 0, 0.02)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Subtle decorative accent pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '9999px',
            backgroundColor: '#eef2ff',
            border: '1px solid #c7d2fe',
            color: '#4338ca',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            marginBottom: '14px'
          }}
        >
          <Sparkles size={13} color="#6366f1" />
          YOUR NEXT STEP
        </div>

        <h2
          style={{
            fontSize: 'clamp(22px, 2.6vw, 26px)',
            fontWeight: 800,
            color: '#1e1b4b',
            margin: '0 0 10px 0',
            fontFamily: "'Fredoka', 'Outfit', sans-serif",
            lineHeight: 1.25,
            letterSpacing: '-0.4px'
          }}
        >
          {journey.nextActionTitle}
        </h2>

        <p
          style={{
            margin: '0 0 22px 0',
            fontSize: '15px',
            color: '#475569',
            lineHeight: 1.55,
            fontWeight: 500,
            maxWidth: '720px'
          }}
        >
          {journey.nextActionReason}
        </p>

        {/* The single primary CTA button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            size="lg"
            icon={<ArrowRight size={16} />}
            onClick={() => setActiveTab(journey.targetTab)}
            style={{
              fontWeight: 800,
              padding: '13px 28px',
              fontSize: '14.5px',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.32)'
            }}
          >
            {journey.actionButtonLabel}
          </Button>
        </div>
      </Surface>

      {/* ==================================================================== */}
      {/* SECTION 3 — LEVEL 2: WHERE YOU ARE (Compact Horizontal Progression)  */}
      {/* ==================================================================== */}
      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px'
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: '#64748b',
              letterSpacing: '0.6px',
              textTransform: 'uppercase'
            }}
          >
            Where you are
          </span>

          <span style={{ fontSize: '12px', color: '#6366f1', fontWeight: 700 }}>
            Stage {journey.currentStageIndex + 1} of 7: {journey.currentStageLabel}
          </span>
        </div>

        <Surface
          variant="subtle"
          radius="md"
          padding="sm"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #ede9fe',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px',
              overflowX: 'auto',
              padding: '4px 2px',
              scrollbarWidth: 'none'
            }}
          >
            {journey.journeyStages.map((stage, idx) => {
              const isCurrent = stage.status === 'current';
              const isCompleted = stage.status === 'completed';

              return (
                <div
                  key={stage.key}
                  onClick={() => setActiveTab(stage.targetTab)}
                  title={`${stage.label}: ${stage.sublabel} (Click to open)`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flex: '1 1 0',
                    minWidth: '95px',
                    cursor: 'pointer',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    backgroundColor: isCurrent ? '#f5f3ff' : 'transparent',
                    border: isCurrent ? '1px solid #c7d2fe' : '1px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    {isCompleted ? (
                      <CheckCircle2 size={15} style={{ color: '#059669' }} />
                    ) : isCurrent ? (
                      <div
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          backgroundColor: '#e0e7ff',
                          border: '2px solid #4f46e5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <div
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            backgroundColor: '#4f46e5'
                          }}
                        />
                      </div>
                    ) : (
                      <Circle size={14} style={{ color: '#cbd5e1' }} />
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: isCurrent ? 800 : isCompleted ? 700 : 500,
                        color: isCurrent ? '#4338ca' : isCompleted ? '#334155' : '#94a3b8',
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {stage.label}
                    </span>
                    {isCurrent && (
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: 800,
                          color: '#6366f1',
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                          lineHeight: 1
                        }}
                      >
                        ● Current
                      </span>
                    )}
                  </div>

                  {idx < journey.journeyStages.length - 1 && (
                    <span
                      style={{
                        color: '#cbd5e1',
                        fontSize: '11px',
                        marginLeft: 'auto',
                        userSelect: 'none'
                      }}
                    >
                      →
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Surface>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 4 — LEVEL 3: YOUR CURRENT DIRECTION (Focus, Clarity, Profile)*/}
      {/* ==================================================================== */}
      <section>
        <span
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 800,
            color: '#64748b',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            marginBottom: '10px'
          }}
        >
          Your current direction
        </span>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '14px'
          }}
        >
          {/* Card 1: Focus */}
          <Surface
            variant="bordered"
            radius="md"
            padding="sm"
            hoverable
            onClick={() => setActiveTab(journey.direction.focus.targetTab)}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #ede9fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Target size={17} />
              </div>
              <div style={{ minWidth: 0 }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: '#b45309',
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    display: 'block',
                    lineHeight: 1
                  }}
                >
                  Focus
                </span>
                <div
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginTop: '3px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {journey.direction.focus.title}
                </div>
              </div>
            </div>

            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#6366f1',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                flexShrink: 0
              }}
            >
              {journey.direction.focus.actionLabel} <ArrowRight size={13} />
            </span>
          </Surface>

          {/* Card 2: Clarity */}
          <Surface
            variant="bordered"
            radius="md"
            padding="sm"
            hoverable
            onClick={() => setActiveTab(journey.direction.clarity.targetTab)}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #ede9fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  backgroundColor: '#d1fae5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Compass size={17} />
              </div>
              <div style={{ minWidth: 0 }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: '#047857',
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    display: 'block',
                    lineHeight: 1
                  }}
                >
                  Clarity
                </span>
                <div
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginTop: '3px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {journey.direction.clarity.status}
                </div>
              </div>
            </div>

            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#059669',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                flexShrink: 0
              }}
            >
              {journey.direction.clarity.actionLabel} <ArrowRight size={13} />
            </span>
          </Surface>

          {/* Card 3: Profile */}
          <Surface
            variant="bordered"
            radius="md"
            padding="sm"
            hoverable
            onClick={() => setActiveTab(journey.direction.profile.targetTab)}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #ede9fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  backgroundColor: '#e0e7ff',
                  color: '#4f46e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <BarChart3 size={17} />
              </div>
              <div style={{ minWidth: 0 }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: '#4338ca',
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    display: 'block',
                    lineHeight: 1
                  }}
                >
                  Profile
                </span>
                <div
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginTop: '3px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {journey.direction.profile.title}
                </div>
              </div>
            </div>

            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#4f46e5',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                flexShrink: 0
              }}
            >
              {journey.direction.profile.actionLabel} <ArrowRight size={13} />
            </span>
          </Surface>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 5 — LEVEL 3: RECENT AI SHIFT ("ONE THING WORTH KNOWING")     */}
      {/* ==================================================================== */}
      <section>
        <span
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 800,
            color: '#64748b',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            marginBottom: '10px'
          }}
        >
          One thing worth knowing
        </span>

        <Surface
          variant="bordered"
          radius="md"
          padding="md"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #bae6fd',
            boxShadow: '0 2px 10px rgba(2, 132, 199, 0.04)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '6px'
                }}
              >
                <Radar size={15} style={{ color: '#0284c7' }} />
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 800,
                    color: '#0369a1',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px'
                  }}
                >
                  AI Radar Signal
                </span>
              </div>

              <h3
                style={{
                  margin: '0 0 6px 0',
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#0f172a',
                  lineHeight: 1.3
                }}
              >
                {featuredSignal?.title || 'Autonomous Tool-Calling Agents'}
              </h3>

              <p
                style={{
                  margin: '0 0 10px 0',
                  fontSize: '13.5px',
                  color: '#475569',
                  lineHeight: 1.45
                }}
              >
                {featuredSignal?.summary ||
                  'Frontier models are shifting from single conversational responses to multi-step execution loops with tool APIs.'}
              </p>

              <div
                style={{
                  fontSize: '12.5px',
                  color: '#0369a1',
                  fontWeight: 600
                }}
              >
                Relevant to your focus in{' '}
                <strong style={{ color: '#0284c7' }}>
                  {journey.direction.focus.title}
                </strong>
                .
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '8px',
                flexShrink: 0
              }}
            >
              <Button
                variant="cyan"
                size="md"
                icon={<ArrowRight size={14} />}
                onClick={() => setActiveTab('radar')}
                style={{ fontWeight: 800, padding: '9px 18px' }}
              >
                Investigate
              </Button>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                {featuredSignal?.source || 'ArXiv Technical Feed'}
              </span>
            </div>
          </div>
        </Surface>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 6 — LEVEL 4: MENTOR INSIGHT & EXPLORE CHIPS                 */}
      {/* ==================================================================== */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '14px',
          alignItems: 'stretch'
        }}
      >
        {/* Mentor Insight (Subtle, contextual) */}
        <Surface
          variant="subtle"
          radius="md"
          padding="md"
          style={{
            backgroundColor: '#fbfaff',
            border: '1px solid #e0e7ff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '8px'
              }}
            >
              <MessageCircle size={14} style={{ color: '#6366f1' }} />
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  color: '#4338ca',
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase'
                }}
              >
                Mentor insight
              </span>
            </div>

            <p
              style={{
                margin: 0,
                fontSize: '13.5px',
                color: '#334155',
                lineHeight: 1.5,
                fontWeight: 500,
                fontStyle: 'normal'
              }}
            >
              {mentorResponse?.message ||
                `"You are currently building practical understanding in ${journey.direction.focus.title}. Keep progressing through your structured milestones."`}
            </p>
          </div>

          <div>
            <span
              onClick={() => setActiveTab('mentor')}
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#6366f1',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              View Mentor <ArrowRight size={12} />
            </span>
          </div>
        </Surface>

        {/* Explore Chips (Compact capability tags) */}
        <Surface
          variant="bordered"
          radius="md"
          padding="md"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #ede9fe',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px'
              }}
            >
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  color: '#64748b',
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase'
                }}
              >
                Explore
              </span>
              <span
                onClick={() => setActiveTab('discover')}
                style={{
                  fontSize: '11.5px',
                  color: '#6366f1',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                All Capabilities →
              </span>
            </div>

            {/* Compact inline chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[
                { title: 'AI Fundamentals', tab: 'AI Fundamentals' },
                { title: 'AI Literacy', tab: 'AI Literacy & Verification' },
                { title: 'Workflow Design', tab: 'AI Workflow Design' },
                { title: 'Critical Thinking', tab: 'Critical Thinking & Oversight' }
              ].map((chip) => (
                <button
                  key={chip.title}
                  onClick={() => handleExploreCapability(chip.tab)}
                  style={{
                    backgroundColor: '#f8fafc',
                    color: '#334155',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#c7d2fe';
                    e.currentTarget.style.color = '#4338ca';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.color = '#334155';
                  }}
                >
                  {chip.title}
                </button>
              ))}
            </div>
          </div>

          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            Click any area to explore structured clarity lessons.
          </span>
        </Surface>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 7 — LEVEL 5: UTILITY (Credits subtly placed)                */}
      {/* ==================================================================== */}
      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #f1f5f9'
        }}
      >
        <span
          onClick={() => setActiveTab('credits')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12.5px',
            color: '#64748b',
            cursor: 'pointer',
            padding: '4px 10px',
            borderRadius: '6px',
            transition: 'color 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
        >
          <Coins size={14} style={{ color: '#d97706' }} />
          <span>{credits} AIIMS Credits</span>
          <span style={{ color: '#cbd5e1' }}>•</span>
          <span style={{ color: '#4f46e5', fontWeight: 600 }}>View Wallet Ledger →</span>
        </span>
      </footer>
    </div>
  );
};
