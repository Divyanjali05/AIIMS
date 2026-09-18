import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
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
  ClipboardCheck
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { Surface, SurfaceProps } from '../../components/common/Surface';
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

  const [expandedStage, setExpandedStage] = useState<string | null>('assessment');

  const completedCount = [
    isAssessmentDone,
    isAnalysisDone,
    state.clarity.status === 'completed',
    isFocusActive,
    state.radar.investigatedSignalIds.length > 0,
    isInvestigationDone,
    isRelevanceUnlocked
  ].filter(Boolean).length;

  const completionPercentage = Math.round((completedCount / 7) * 100);

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
      icon: <ClipboardCheck size={18} style={{ color: '#4f46e5' }} />,
      status: isAssessmentDone ? 'completed' : 'current',
      date: isAssessmentDone ? (state.assessment.completedAt || 'Completed') : 'Active Stage',
      summary: isAssessmentDone ? '25 questions answered across 5 core dimensions' : 'Multidimensional AI baseline evaluation',
      explanation: 'Evaluates your AI usage frequency, evaluation habits, workflow design, strategic vision, and mentorship readiness.',
      variant: 'violet',
      btnVariant: 'violet',
      badgeVariant: 'purple',
      history: isAssessmentDone ? [
        'Discovered usage pattern: Hands-on workflow integrator',
        `Top capability identified: ${state.analysis.topCapability}`,
        `Growth opportunity: ${state.analysis.growthArea}`
      ] : [
        '25 questions across 5 dimensions',
        'Saves progress as you answer',
        'Awards +50 AIIMS Credits on completion'
      ],
      reward: '+50 AIIMS Credits',
      actionLabel: isAssessmentDone ? 'View Analysis' : 'Start Assessment',
      tabTarget: isAssessmentDone ? 'analysis' : 'assessment'
    },
    {
      id: 'analysis',
      title: '2. My AI Profile Report',
      icon: <BarChart3 size={18} style={{ color: '#6b21a8' }} />,
      status: !isAnalysisUnlocked ? 'locked' : isAnalysisDone ? 'completed' : isAssessmentDone ? 'current' : 'upcoming',
      date: isAnalysisUnlocked ? 'Unlocked' : 'Locked',
      summary: 'Personal report analyzing baseline strengths and growth areas',
      explanation: 'Transforms baseline assessment responses into actionable capability insights and peer benchmarks.',
      variant: 'violet',
      btnVariant: 'violet',
      badgeVariant: 'purple',
      history: [
        `Top Capability: "${state.analysis.topCapability}"`,
        `Growth Opportunity: "${state.analysis.growthArea}"`,
        'Benchmarked against AI Product & Engineering peers'
      ],
      reward: '+10 AIIMS Credits',
      actionLabel: isAnalysisUnlocked ? 'View Profile Report' : 'Complete Assessment to Unlock',
      tabTarget: isAnalysisUnlocked ? 'analysis' : 'assessment'
    },
    {
      id: 'clarity',
      title: '3. Capability Clarity Hub',
      icon: <Compass size={18} style={{ color: '#059669' }} />,
      status: state.clarity.status === 'completed' || (state.clarity.completedTopics && state.clarity.completedTopics.length > 0)
        ? 'completed'
        : (state.clarity.selectedTopic ? 'current' : (isAnalysisDone ? 'available' : 'locked')),
      date: (state.clarity.status === 'completed' || (state.clarity.completedTopics && state.clarity.completedTopics.length > 0))
        ? 'Completed'
        : (state.clarity.selectedTopic ? 'In Progress' : (isAnalysisDone ? 'Available' : 'Locked')),
      summary: state.clarity.selectedTopic
        ? `Exploring: ${state.clarity.selectedTopic}`
        : 'Interactive lesson workspace with concepts, examples, scenarios & reflections',
      explanation: 'Build clear mental models for specific AI capability areas before applying them to real projects.',
      variant: 'mint',
      btnVariant: 'green',
      badgeVariant: 'success',
      history: state.clarity.selectedAreas && state.clarity.selectedAreas.length > 0
        ? state.clarity.selectedAreas.map(a => `Explored capability area: ${a}`)
        : ['AI Workflow Design', 'AI Agents & Autonomous Workflows'],
      reward: 'Capability Mental Model',
      actionLabel: state.clarity.selectedTopic ? `Continue (${state.clarity.selectedTopic})` : 'Explore Clarity Hub',
      tabTarget: isAnalysisUnlocked ? 'clarity' : 'assessment'
    },
    {
      id: 'focus',
      title: '4. Active Focus Selection',
      icon: <Target size={18} style={{ color: '#d97706' }} />,
      status: state.focus.status === 'active'
        ? 'completed'
        : (state.clarity.status === 'completed' ? 'current' : 'locked'),
      date: state.focus.status === 'active'
        ? (state.focus.activatedAt || 'Active Focus')
        : (state.clarity.status === 'completed' ? 'Available' : 'Locked'),
      summary: state.focus.status === 'active'
        ? `Active Focus: ${state.focus.selectedTrack}`
        : 'Deliberate selection of your primary learning direction',
      explanation: 'Focus is choosing which capability deserves your active priority attention.',
      variant: 'amber',
      btnVariant: 'amber',
      badgeVariant: 'warning',
      history: state.focus.selectedTrack
        ? [`Active Track: ${state.focus.selectedTrack}`, 'Target capability: Repeatable AI Workflows']
        : ['Awaiting Focus Decision'],
      reward: 'Priority Direction Decision',
      actionLabel: state.focus.status === 'active' ? `View Active Focus (${state.focus.selectedTrack})` : 'Decide Focus Track',
      tabTarget: isAnalysisUnlocked ? 'focus' : 'assessment'
    },
    {
      id: 'radar',
      title: '5. AI Radar Signals',
      icon: <Radar size={18} style={{ color: '#0284c7' }} />,
      status: state.radar.investigatedSignalIds.length > 0 ? 'completed' : 'current',
      date: 'Available',
      summary: `${state.radar.investigatedSignalIds.length} technical AI market shifts explored`,
      explanation: 'Continuous discovery feed of real model releases, tool-calling breakthroughs, and workflow shifts.',
      variant: 'cyan',
      btnVariant: 'cyan',
      badgeVariant: 'cyan',
      history: [
        'Signal: "Autonomous Tool-Calling Agents"',
        'Connected to active focus track'
      ],
      reward: '+30 Credits per Investigation',
      actionLabel: 'Explore AI Radar',
      tabTarget: 'radar'
    },
    {
      id: 'investigation',
      title: '6. Technical Signal Investigation',
      icon: <Search size={18} style={{ color: '#0369a1' }} />,
      status: isInvestigationDone ? 'completed' : 'upcoming',
      date: isInvestigationDone ? 'Completed' : 'Next Stage',
      summary: 'Structured 4-step research scaffold (Yesterday vs. Today vs. What Changed)',
      explanation: 'Formulate hypotheses and record your reflection on how technical shifts impact your work.',
      variant: 'sky',
      btnVariant: 'cyan',
      badgeVariant: 'cyan',
      history: [
        'Recorded personal evidence & interpretation',
        'Received AIIMS Mentor reflective question'
      ],
      reward: '+30 AIIMS Credits',
      actionLabel: isInvestigationDone ? 'View Investigation' : 'Start Investigation',
      tabTarget: 'radar'
    },
    {
      id: 'relevance',
      title: '7. AI Relevance Synthesis',
      icon: <Sparkles size={18} style={{ color: '#4f46e5' }} />,
      status: isRelevanceUnlocked ? 'unlocked' : 'locked',
      date: isRelevanceUnlocked ? 'Unlocked' : 'Future Stage',
      summary: 'Personalized payoff map connecting Profile → Focus → Signal → Action',
      explanation: 'Synthesizes all journey steps into clear, actionable advice on why this AI shift matters for your work.',
      variant: 'gradient-relevance',
      btnVariant: 'primary',
      badgeVariant: 'purple',
      history: [
        'Calculated personal relevance score & badge',
        'Generated recommended 3-step action protocol'
      ],
      reward: '+25 AIIMS Credits',
      actionLabel: isRelevanceUnlocked ? 'View Relevance Map' : 'Investigate Signal to Unlock',
      tabTarget: isRelevanceUnlocked ? 'relevance' : 'radar'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1040px', margin: '0 auto' }}>

      {/* PAGE HEADER */}
      <PageHeader
        icon={<Route size={24} />}
        title="My AI Journey — Semantic Color Timeline"
        description="Assessment (Indigo) → Profile (Violet) → Clarity (Mint) → Focus (Amber) → Radar (Cyan) → Investigation (Blue) → Relevance (Gradient Synthesis)."
      />

      {/* METRICS TOP SUMMARY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <Surface variant="violet" radius="lg" padding="md">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase' }}>
                Progression Completion
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '2px', fontFamily: "'Fredoka', sans-serif" }}>
                {completionPercentage}%
              </div>
            </div>
            <TrendingUp style={{ width: '22px', height: '22px', color: '#6b21a8' }} />
          </div>
        </Surface>

        <Surface variant="cyan" radius="lg" padding="md">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>
                Discoveries & Signals
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '2px', fontFamily: "'Fredoka', sans-serif" }}>
                {state.radar.investigatedSignalIds.length + (isAssessmentDone ? 2 : 0)}
              </div>
            </div>
            <Sparkles style={{ width: '22px', height: '22px', color: '#0284c7' }} />
          </div>
        </Surface>

        <Surface variant="amber" radius="lg" padding="md">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
                Earned Credits
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '2px', fontFamily: "'Fredoka', sans-serif" }}>
                {credits} AC
              </div>
            </div>
            <Coins style={{ width: '22px', height: '22px', color: '#d97706' }} />
          </div>
        </Surface>
      </div>

      {/* CENTRAL ROADMAP */}
      <Surface variant="bordered" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: "'Fredoka', sans-serif" }}>
            Semantic Color Progression Roadmap
          </h2>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
            COLOURFUL PROGRESSION STORY
          </span>
        </div>

        <div style={{ position: 'relative', paddingLeft: '28px' }}>
          {/* Vertical Line */}
          <div style={{
            position: 'absolute',
            top: '20px',
            bottom: '20px',
            left: '11px',
            width: '2px',
            backgroundColor: '#cbd5e1',
            zIndex: 1
          }} />

          {stages.map((stage) => {
            const isCompleted = stage.status === 'completed';
            const isCurrent = stage.status === 'current';
            const isLocked = stage.status === 'locked';
            const isExpanded = expandedStage === stage.id;

            return (
              <div key={stage.id} style={{ position: 'relative', zIndex: 2, marginBottom: '20px' }}>

                {/* Node Icon on Line */}
                <div style={{
                  position: 'absolute',
                  left: '-28px',
                  top: '16px',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#ffffff',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {isCompleted ? (
                    <CheckCircle2 style={{ width: '22px', height: '22px', color: '#059669' }} />
                  ) : isCurrent ? (
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #4f46e5' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4f46e5' }} />
                    </div>
                  ) : (
                    <Lock style={{ width: '18px', height: '18px', color: '#cbd5e1' }} />
                  )}
                </div>

                {/* Stage Card with Semantic Variant */}
                <Surface
                  variant={isLocked ? 'subtle' : stage.variant}
                  radius="md"
                  padding="md"
                  style={{ opacity: isLocked ? 0.75 : 1 }}
                >
                  <div
                    onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {stage.icon}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                            {stage.title}
                          </h3>
                          {isCurrent && (
                            <Badge variant="primary" style={{ fontSize: '9px' }}>YOU ARE HERE</Badge>
                          )}
                          {isCompleted && (
                            <Badge variant="success" style={{ fontSize: '9px' }}>✓ Completed</Badge>
                          )}
                          {isLocked && (
                            <Badge variant="neutral" style={{ fontSize: '9px' }}>Locked</Badge>
                          )}
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#334155' }}>
                          {stage.summary}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                        {stage.date}
                      </span>
                      {isExpanded ? (
                        <ChevronUp style={{ width: '16px', height: '16px', color: '#64748b' }} />
                      ) : (
                        <ChevronDown style={{ width: '16px', height: '16px', color: '#64748b' }} />
                      )}
                    </div>
                  </div>

                  {/* Expanded Stage Detail */}
                  {isExpanded && (
                    <div style={{
                      marginTop: '14px',
                      paddingTop: '14px',
                      borderTop: '1px solid rgba(0,0,0,0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}>
                      <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.5, fontWeight: 500 }}>
                        {stage.explanation}
                      </p>

                      <div style={{ padding: '10px 14px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                          LEARNER STAGE HISTORY & HIGHLIGHTS
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                          {stage.history.map((h, idx) => (
                            <li key={idx}>{h}</li>
                          ))}
                        </ul>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
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
                </Surface>

              </div>
            );
          })}
        </div>
      </Surface>

    </div>
  );
};
