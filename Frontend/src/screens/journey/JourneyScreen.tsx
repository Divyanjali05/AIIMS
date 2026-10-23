import React, { useState } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Coins,
  ChevronDown,
  ChevronUp,
  Route,
  Lock,
  Compass,
  Target,
  Radar,
  Search,
  BarChart3,
  ClipboardCheck,
  Wrench,
  Layers,
  MessageCircle,
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { Card } from '../../components/common/Card';
import { SurfaceProps } from '../../components/common/Surface';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

interface JourneyScreenProps {
  setActiveTab: (tab: string) => void;
}

export const JourneyScreen: React.FC<JourneyScreenProps> = ({ setActiveTab }) => {
  const { state } = useLearner();
  const credits = state.credits.balance;

  const isAssessmentDone = state.assessment.status === 'completed';
  const isAnalysisDone = state.analysis.status === 'viewed';
  const isAnalysisUnlocked = state.analysis.status !== 'locked';
  const isFocusActive = state.focus.status === 'active';
  const isInvestigationDone = state.investigation.status === 'completed';
  const isRelevanceUnlocked = state.relevance.status !== 'locked';
  const isSolverUnlocked = isInvestigationDone || isAssessmentDone;
  const isBuildUnlocked = (state.solver?.history?.length || 0) > 0 || isSolverUnlocked;
  const isMentorUnlocked = isAssessmentDone;

  const [expandedStage, setExpandedStage] = useState<string | null>('assessment');

  const completedCount = [
    isAssessmentDone,
    isAnalysisDone,
    state.clarity.status === 'completed' ||
      (state.clarity.completedTopics && state.clarity.completedTopics.length > 0),
    isFocusActive,
    state.radar.investigatedSignalIds.length > 0,
    isInvestigationDone,
    isRelevanceUnlocked,
    (state.solver?.history?.length || 0) > 0,
    (state.build?.projects?.length || 0) > 0,
    isMentorUnlocked,
  ].filter(Boolean).length;

  const completionPercentage = Math.round((completedCount / 10) * 100);

  const stages: {
    id: string;
    title: string;
    icon: React.ReactNode;
    status: 'completed' | 'current' | 'available' | 'locked' | 'upcoming' | 'unlocked';
    date: string;
    summary: string;
    explanation: string;
    variant: SurfaceProps['variant'];
    btnVariant: 'green' | 'amber' | 'cyan' | 'violet' | 'rose' | 'primary';
    badgeVariant: 'primary' | 'success' | 'warning' | 'cyan' | 'purple' | 'neutral';
    history: string[];
    reward: string;
    actionLabel: string;
    tabTarget: string;
  }[] = [
    {
      id: 'assessment',
      title: '1. Diagnostic Assessment',
      icon: <ClipboardCheck size={18} style={{ color: 'var(--aiims-primary)' }} />,
      status: isAssessmentDone ? 'completed' : 'current',
      date: isAssessmentDone ? state.assessment.completedAt || 'Completed' : 'Active Stage',
      summary: isAssessmentDone
        ? '25 questions answered across 5 core dimensions'
        : 'Multidimensional AI baseline evaluation',
      explanation:
        'Evaluates your AI usage frequency, evaluation habits, workflow design, strategic vision, and mentorship readiness.',
      variant: 'violet',
      btnVariant: 'violet',
      badgeVariant: 'purple',
      history: isAssessmentDone
        ? [
            'Discovered usage pattern: Hands-on workflow integrator',
            `Top capability identified: ${state.analysis.topCapability}`,
            `Growth opportunity: ${state.analysis.growthArea}`,
          ]
        : [
            '25 questions across 5 dimensions',
            'Saves progress as you answer',
            'Awards +50 AIIMS Credits on completion',
          ],
      reward: '+50 AIIMS Credits',
      actionLabel: isAssessmentDone ? 'View Analysis' : 'Start Assessment',
      tabTarget: isAssessmentDone ? 'analysis' : 'assessment',
    },
    {
      id: 'analysis',
      title: '2. My AI Profile Report',
      icon: <BarChart3 size={18} style={{ color: 'var(--aiims-tint-purple-text)' }} />,
      status: !isAnalysisUnlocked
        ? 'locked'
        : isAnalysisDone
          ? 'completed'
          : isAssessmentDone
            ? 'current'
            : 'upcoming',
      date: isAnalysisUnlocked ? 'Unlocked' : 'Locked',
      summary: 'Personal report analyzing baseline strengths and growth areas',
      explanation:
        'Transforms baseline assessment responses into actionable capability insights and peer benchmarks.',
      variant: 'violet',
      btnVariant: 'violet',
      badgeVariant: 'purple',
      history: [
        `Top Capability: "${state.analysis.topCapability}"`,
        `Growth Opportunity: "${state.analysis.growthArea}"`,
        'Benchmarked against AI Product & Engineering peers',
      ],
      reward: '+10 AIIMS Credits',
      actionLabel: isAnalysisUnlocked ? 'View Profile Report' : 'Complete Assessment to Unlock',
      tabTarget: isAnalysisUnlocked ? 'analysis' : 'assessment',
    },
    {
      id: 'clarity',
      title: '3. Capability Clarity Hub',
      icon: <Compass size={18} style={{ color: 'var(--aiims-tint-emerald-text)' }} />,
      status:
        state.clarity.status === 'completed' ||
        (state.clarity.completedTopics && state.clarity.completedTopics.length > 0)
          ? 'completed'
          : state.clarity.selectedTopic
            ? 'current'
            : isAnalysisDone
              ? 'available'
              : 'locked',
      date:
        state.clarity.status === 'completed' ||
        (state.clarity.completedTopics && state.clarity.completedTopics.length > 0)
          ? 'Completed'
          : state.clarity.selectedTopic
            ? 'In Progress'
            : isAnalysisDone
              ? 'Available'
              : 'Locked',
      summary: state.clarity.selectedTopic
        ? `Exploring: ${state.clarity.selectedTopic}`
        : 'Interactive lesson workspace with concepts, examples, scenarios & reflections',
      explanation:
        'Build clear mental models for specific AI capability areas before applying them to real projects.',
      variant: 'mint',
      btnVariant: 'green',
      badgeVariant: 'success',
      history:
        state.clarity.selectedAreas && state.clarity.selectedAreas.length > 0
          ? state.clarity.selectedAreas.map((a) => `Explored capability area: ${a}`)
          : ['AI Workflow Design', 'AI Agents & Autonomous Workflows'],
      reward: 'Capability Mental Model',
      actionLabel: state.clarity.selectedTopic
        ? `Continue (${state.clarity.selectedTopic})`
        : 'Explore Clarity Hub',
      tabTarget: isAnalysisUnlocked ? 'clarity' : 'assessment',
    },
    {
      id: 'focus',
      title: '4. Active Focus Selection',
      icon: <Target size={18} style={{ color: 'var(--aiims-tint-amber-text)' }} />,
      status:
        state.focus.status === 'active'
          ? 'completed'
          : state.clarity.status === 'completed'
            ? 'current'
            : 'locked',
      date:
        state.focus.status === 'active'
          ? state.focus.activatedAt || 'Active Focus'
          : state.clarity.status === 'completed'
            ? 'Available'
            : 'Locked',
      summary:
        state.focus.status === 'active'
          ? `Active Focus: ${state.focus.selectedTrack}`
          : 'Deliberate selection of your primary learning direction',
      explanation: 'Focus is choosing which capability deserves your active priority attention.',
      variant: 'amber',
      btnVariant: 'amber',
      badgeVariant: 'warning',
      history: state.focus.selectedTrack
        ? [
            `Active Track: ${state.focus.selectedTrack}`,
            'Target capability: Repeatable AI Workflows',
          ]
        : ['Awaiting Focus Decision'],
      reward: 'Priority Direction Decision',
      actionLabel:
        state.focus.status === 'active'
          ? `View Active Focus (${state.focus.selectedTrack})`
          : 'Decide Focus Track',
      tabTarget: isAnalysisUnlocked ? 'focus' : 'assessment',
    },
    {
      id: 'radar',
      title: '5. AI Radar Signals',
      icon: <Radar size={18} style={{ color: '#94a3b8' }} />,
      status: 'locked',
      date: 'Locked',
      summary: 'Technical AI market shifts and emerging capabilities',
      explanation:
        'Continuous discovery feed of real model releases, tool-calling breakthroughs, and workflow shifts.',
      variant: 'cyan',
      btnVariant: 'cyan',
      badgeVariant: 'neutral',
      history: ['Activity-Gated Module — will unlock based on completed learning activities'],
      reward: '+30 Credits per Investigation',
      actionLabel: 'Locked (Activity Gated)',
      tabTarget: 'radar',
    },
    {
      id: 'investigation',
      title: '6. Technical Signal Investigation',
      icon: <Search size={18} style={{ color: '#94a3b8' }} />,
      status: 'locked',
      date: 'Locked',
      summary: 'Structured 4-step research scaffold (Yesterday vs. Today vs. What Changed)',
      explanation:
        'Formulate hypotheses and record your reflection on how technical shifts impact your work.',
      variant: 'sky',
      btnVariant: 'cyan',
      badgeVariant: 'neutral',
      history: ['Activity-Gated Module — will unlock based on completed learning activities'],
      reward: '+30 AIIMS Credits',
      actionLabel: 'Locked (Activity Gated)',
      tabTarget: 'radar',
    },
    {
      id: 'relevance',
      title: '7. AI Relevance Synthesis',
      icon: <Sparkles size={18} style={{ color: '#94a3b8' }} />,
      status: 'locked',
      date: 'Locked',
      summary: 'Personalized payoff map connecting Profile → Focus → Signal → Action',
      explanation:
        'Synthesizes all journey steps into clear, actionable advice on why this AI shift matters for your work.',
      variant: 'gradient-relevance',
      btnVariant: 'primary',
      badgeVariant: 'neutral',
      history: ['Activity-Gated Module — will unlock based on completed learning activities'],
      reward: '+25 AIIMS Credits',
      actionLabel: 'Locked (Activity Gated)',
      tabTarget: 'relevance',
    },
    {
      id: 'solver',
      title: '8. Problem Solver Architecture',
      icon: (
        <Wrench
          size={18}
          style={{ color: isSolverUnlocked ? 'var(--aiims-primary)' : 'var(--aiims-text-muted)' }}
        />
      ),
      status:
        (state.solver?.history?.length || 0) > 0
          ? 'completed'
          : isSolverUnlocked
            ? 'available'
            : 'locked',
      date: isSolverUnlocked ? 'Available' : 'Locked',
      summary: 'Synthesize end-to-end AI workflows & component architectures',
      explanation:
        'Derive actionable AI workflows with prompt engineering, tool routing, and evaluation criteria.',
      variant: 'cyan',
      btnVariant: 'cyan',
      badgeVariant: isSolverUnlocked ? 'cyan' : 'neutral',
      history:
        (state.solver?.history?.length || 0) > 0
          ? [`${state.solver?.history?.length} Workflows Synthesized`]
          : ['Derive custom system architectures for concrete real-world tasks'],
      reward: '+40 AIIMS Credits',
      actionLabel: isSolverUnlocked
        ? 'Open Problem Solver'
        : 'Locked (Requires Prerequisite Tasks)',
      tabTarget: 'solver',
    },
    {
      id: 'build',
      title: '9. Projects & Production Workspace',
      icon: (
        <Layers
          size={18}
          style={{
            color: isBuildUnlocked ? 'var(--aiims-tint-purple-text)' : 'var(--aiims-text-muted)',
          }}
        />
      ),
      status:
        (state.build?.projects?.length || 0) > 0
          ? 'completed'
          : isBuildUnlocked
            ? 'available'
            : 'locked',
      date: isBuildUnlocked ? 'Available' : 'Locked',
      summary: 'Build real scaffolded AI systems & production-ready workflows',
      explanation:
        'Turn architecture designs into executable codebase templates and monitored deployments.',
      variant: 'violet',
      btnVariant: 'violet',
      badgeVariant: isBuildUnlocked ? 'purple' : 'neutral',
      history:
        (state.build?.projects?.length || 0) > 0
          ? [`${state.build?.projects?.length} Production Templates Generated`]
          : ['Production workspace for full-stack AI project scaffolds'],
      reward: '+50 AIIMS Credits',
      actionLabel: isBuildUnlocked
        ? 'Open Projects Workspace'
        : 'Locked (Requires Solver Workflows)',
      tabTarget: 'build',
    },
    {
      id: 'mentor',
      title: '10. AI Mentor & Continuous Calibration',
      icon: (
        <MessageCircle
          size={18}
          style={{
            color: isMentorUnlocked ? 'var(--aiims-tint-emerald-text)' : 'var(--aiims-text-muted)',
          }}
        />
      ),
      status: isMentorUnlocked ? 'available' : 'locked',
      date: isMentorUnlocked ? 'Active' : 'Locked',
      summary: 'Adaptive mentorship, growth tracking, and ongoing calibration',
      explanation:
        'Real-time coaching from the AIIMS mentor tailored to your progress across all 5 dimensions.',
      variant: 'mint',
      btnVariant: 'green',
      badgeVariant: isMentorUnlocked ? 'success' : 'neutral',
      history: ['Continuous developmental calibration across all 5 dimensions'],
      reward: '+20 Credits per Milestone',
      actionLabel: isMentorUnlocked ? 'Open Mentor Workspace' : 'Locked (Continuous Growth)',
      tabTarget: 'mentor',
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
      }}
    >
      {/* PAGE HEADER */}
      <PageHeader
        icon={<Route size={24} />}
        title="My AI Journey — 10-Stage Canonical Progression"
        description="Assessment (Indigo) → Profile (Violet) → Clarity (Mint) → Focus (Amber) → Radar (Cyan) → Investigation (Sky) → Relevance (Synthesis) → Solver (Cyan) → Projects (Violet) → Mentor (Mint)."
      />

      {/* METRICS TOP SUMMARY */}
      <div
        className="aiims-card-grid"
        style={{
          gridTemplateColumns:
            'repeat(auto-fit, minmax(var(--aiims-card-min-width-desktop, 260px), 1fr))',
        }}
      >
        <Card variant="violet" radius="default" padding="default">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--aiims-card-violet-text)',
                  textTransform: 'uppercase',
                }}
              >
                Progression Completion
              </span>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading)',
                  marginTop: '2px',
                  fontFamily: "'Fredoka', sans-serif",
                }}
              >
                {completionPercentage}%
              </div>
            </div>
            <TrendingUp
              style={{ width: '22px', height: '22px', color: 'var(--aiims-card-violet-text)' }}
            />
          </div>
        </Card>

        <Card variant="cyan" radius="default" padding="default">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--aiims-card-cyan-text)',
                  textTransform: 'uppercase',
                }}
              >
                Discoveries & Signals
              </span>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading)',
                  marginTop: '2px',
                  fontFamily: "'Fredoka', sans-serif",
                }}
              >
                {state.radar.investigatedSignalIds.length + (isAssessmentDone ? 2 : 0)}
              </div>
            </div>
            <Sparkles
              style={{ width: '22px', height: '22px', color: 'var(--aiims-card-cyan-text)' }}
            />
          </div>
        </Card>

        <Card variant="amber" radius="default" padding="default">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--aiims-card-amber-text)',
                  textTransform: 'uppercase',
                }}
              >
                Earned Credits
              </span>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading)',
                  marginTop: '2px',
                  fontFamily: "'Fredoka', sans-serif",
                }}
              >
                {credits} AC
              </div>
            </div>
            <Coins
              style={{ width: '22px', height: '22px', color: 'var(--aiims-card-amber-text)' }}
            />
          </div>
        </Card>
      </div>

      {/* CENTRAL ROADMAP */}
      <Card variant="bordered" radius="default" padding="default">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading)',
              margin: 0,
              fontFamily: "'Fredoka', sans-serif",
            }}
          >
            Semantic Color Progression Roadmap
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--aiims-text-muted)', fontWeight: 600 }}>
            COLOURFUL PROGRESSION STORY
          </span>
        </div>

        <div style={{ position: 'relative', paddingLeft: '28px' }}>
          {/* Vertical Line */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              bottom: '20px',
              left: '11px',
              width: '2px',
              backgroundColor: 'var(--aiims-border-card)',
              zIndex: 1,
            }}
          />

          {stages.map((stage) => {
            const isCompleted = stage.status === 'completed';
            const isCurrent = stage.status === 'current';
            const isLocked = stage.status === 'locked';
            const isExpanded = expandedStage === stage.id;

            return (
              <div key={stage.id} style={{ position: 'relative', zIndex: 2, marginBottom: '20px' }}>
                {/* Node Icon on Line */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-28px',
                    top: '16px',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'var(--aiims-bg-page)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isCompleted ? (
                    <CheckCircle2
                      style={{
                        width: '22px',
                        height: '22px',
                        color: 'var(--aiims-tint-emerald-text)',
                      }}
                    />
                  ) : isCurrent ? (
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--aiims-primary-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid var(--aiims-primary)',
                      }}
                    >
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--aiims-primary)',
                        }}
                      />
                    </div>
                  ) : (
                    <Lock
                      style={{ width: '18px', height: '18px', color: 'var(--aiims-text-muted)' }}
                    />
                  )}
                </div>

                {/* Stage Card with Semantic Variant */}
                <Card
                  variant={isLocked ? 'subtle' : stage.variant}
                  radius="default"
                  padding="default"
                  style={{ opacity: isLocked ? 0.75 : 1 }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedStage(isExpanded ? null : stage.id);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      outline: 'none',
                      borderRadius: '8px',
                      padding: '2px 4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {stage.icon}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3
                            style={{
                              margin: 0,
                              fontSize: '16px',
                              fontWeight: 700,
                              color: 'var(--aiims-text-heading)',
                            }}
                          >
                            {stage.title}
                          </h3>
                          {isCurrent && (
                            <Badge variant="primary" style={{ fontSize: '9px' }}>
                              YOU ARE HERE
                            </Badge>
                          )}
                          {isCompleted && (
                            <Badge variant="success" style={{ fontSize: '9px' }}>
                              ✓ Completed
                            </Badge>
                          )}
                          {isLocked && (
                            <Badge variant="neutral" style={{ fontSize: '9px' }}>
                              Locked
                            </Badge>
                          )}
                        </div>
                        <p
                          style={{
                            margin: '2px 0 0',
                            fontSize: '13px',
                            color: 'var(--aiims-text-body)',
                          }}
                        >
                          {stage.summary}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--aiims-text-muted)',
                          fontWeight: 500,
                        }}
                      >
                        {stage.date}
                      </span>
                      {isExpanded ? (
                        <ChevronUp
                          style={{
                            width: '16px',
                            height: '16px',
                            color: 'var(--aiims-text-muted)',
                          }}
                        />
                      ) : (
                        <ChevronDown
                          style={{
                            width: '16px',
                            height: '16px',
                            color: 'var(--aiims-text-muted)',
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Expanded Stage Detail */}
                  {isExpanded && (
                    <div
                      style={{
                        marginTop: '14px',
                        paddingTop: '14px',
                        borderTop: '1px solid var(--aiims-border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          color: 'var(--aiims-text-body)',
                          lineHeight: 1.5,
                          fontWeight: 500,
                        }}
                      >
                        {stage.explanation}
                      </p>

                      <div
                        style={{
                          padding: '10px 14px',
                          backgroundColor: 'var(--aiims-bg-card-subtle)',
                          borderRadius: '8px',
                          border: '1px solid var(--aiims-border-subtle)',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            color: 'var(--aiims-text-muted)',
                            textTransform: 'uppercase',
                            marginBottom: '4px',
                          }}
                        >
                          LEARNER STAGE HISTORY & HIGHLIGHTS
                        </div>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: '16px',
                            fontSize: '12px',
                            color: 'var(--aiims-text-body)',
                            lineHeight: 1.5,
                          }}
                        >
                          {stage.history.map((h, idx) => (
                            <li key={idx}>{h}</li>
                          ))}
                        </ul>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '6px',
                        }}
                      >
                        <Badge variant={stage.badgeVariant}>{stage.reward}</Badge>

                        <Button
                          variant={isLocked ? 'outline' : stage.btnVariant}
                          size="sm"
                          icon={<ArrowRight size={13} />}
                          disabled={isLocked}
                          onClick={() => setActiveTab(stage.tabTarget)}
                        >
                          {stage.actionLabel}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
