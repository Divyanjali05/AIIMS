import React, { useState, useEffect } from 'react';
import { useLearner } from '../../context/LearnerContext';
import { Surface, SurfaceProps } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { MentorMessage } from '../../components/common/MentorMessage';
import { SignalDataProvider } from '../../services/signalDataProvider';
import { RadarSignal } from '../../types';
import {
  Compass,
  ArrowRight,
  Brain,
  Zap,
  ShieldCheck,
  Target,
  Sparkles,
  Layers,
  BookOpen,
  Cpu,
  Bookmark,
  CheckCircle2,
  TrendingUp,
  Radar
} from 'lucide-react';

interface DiscoverScreenProps {
  setActiveTab: (tab: string) => void;
}

interface CapabilityTile {
  title: string;
  category: 'LITERACY' | 'WORKFLOWS' | 'CRITICAL_THINKING' | 'STRATEGY' | 'INNOVATION';
  description: string;
  variant: SurfaceProps['variant'];
  btnVariant: 'green' | 'amber' | 'cyan' | 'violet' | 'rose' | 'primary';
  icon: React.ReactNode;
  actionTab: string;
}

const CAPABILITY_TILES: CapabilityTile[] = [
  {
    title: 'AI Fundamentals',
    category: 'LITERACY',
    description: 'Understand token prediction, context windows, and foundational LLM boundaries.',
    variant: 'sky',
    btnVariant: 'cyan',
    icon: <Cpu size={20} />,
    actionTab: 'clarity'
  },
  {
    title: 'AI Literacy & Verification',
    category: 'LITERACY',
    description: 'Master hallucination detection, primary source verification, and privacy safeguards.',
    variant: 'mint',
    btnVariant: 'green',
    icon: <ShieldCheck size={20} />,
    actionTab: 'clarity'
  },
  {
    title: 'Prompting & Workflow Design',
    category: 'WORKFLOWS',
    description: 'Move from single-turn chat prompts to multi-step repeatable AI work templates.',
    variant: 'violet',
    btnVariant: 'violet',
    icon: <Zap size={20} />,
    actionTab: 'clarity'
  },
  {
    title: 'AI Agents & Automation',
    category: 'WORKFLOWS',
    description: 'Delegate multi-turn execution tasks to tool-calling agents with strict safety boundaries.',
    variant: 'cyan',
    btnVariant: 'cyan',
    icon: <Layers size={20} />,
    actionTab: 'clarity'
  },
  {
    title: 'Critical Thinking & Oversight',
    category: 'CRITICAL_THINKING',
    description: 'Evaluate AI output quality against explicit requirements and edge-case criteria.',
    variant: 'amber',
    btnVariant: 'amber',
    icon: <Brain size={20} />,
    actionTab: 'clarity'
  },
  {
    title: 'AI Strategy & Problem Framing',
    category: 'STRATEGY',
    description: 'Identify high-leverage AI opportunities before choosing tools or prompt models.',
    variant: 'violet',
    btnVariant: 'violet',
    icon: <Target size={20} />,
    actionTab: 'clarity'
  },
  {
    title: 'Emerging AI Innovation',
    category: 'INNOVATION',
    description: 'Adapt your career skills as new model releases, multimodal tools, and RAG architectures arrive.',
    variant: 'rose',
    btnVariant: 'rose',
    icon: <Sparkles size={20} />,
    actionTab: 'radar'
  },
  {
    title: 'Human + AI Collaboration',
    category: 'STRATEGY',
    description: 'Balance speed and automation while preserving human judgment and accountability.',
    variant: 'peach',
    btnVariant: 'amber',
    icon: <BookOpen size={20} />,
    actionTab: 'clarity'
  }
];

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({ setActiveTab }) => {
  const { state, selectClarityArea } = useLearner();
  const [signals, setSignals] = useState<RadarSignal[]>([]);

  const isAssessmentCompleted = state.assessment.status === 'completed';
  const growthArea = state.analysis.growthArea || 'AI Workflow Design';
  const activeFocus = state.focus.selectedTrack || growthArea;

  useEffect(() => {
    SignalDataProvider.getSignals().then((data) => setSignals(data));
  }, []);

  const handleExploreCapability = (title: string, actionTab: string) => {
    selectClarityArea(title);
    setActiveTab(actionTab);
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* PAGE HEADER */}
      <PageHeader
        icon={<Compass size={24} />}
        title="Discover AI Capabilities & Directions"
        description="Explore structured AI learning domains, emerging technical shifts, and recommended development paths."
        badge={{ label: `Current Focus: ${activeFocus}`, variant: 'purple', icon: <Target size={12} /> }}
      />

      {/* SECTION 1: WHAT DESERVES YOUR ATTENTION (COLOURFUL DISCOVERY TILES) */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px', fontFamily: "'Fredoka', sans-serif" }}>
          What Deserves Your Attention
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>

          <Surface variant="violet" radius="lg" padding="md" hoverable onClick={() => setActiveTab(isAssessmentCompleted ? 'analysis' : 'assessment')}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#6b21a8', textTransform: 'uppercase', marginBottom: '4px' }}>
              PROFILE REPORT
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              {isAssessmentCompleted ? `Growth Area: ${growthArea}` : 'Discover Your Baseline Profile'}
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#475569', lineHeight: 1.45 }}>
              {isAssessmentCompleted ? 'Surfaced because your diagnostic indicated this dimension as your primary growth area.' : 'Complete your 25-question baseline assessment.'}
            </p>
            <Button variant="violet" size="sm" icon={<ArrowRight size={13} />}>
              {isAssessmentCompleted ? 'Explore Analysis' : 'Start Assessment'}
            </Button>
          </Surface>

          <Surface variant="cyan" radius="lg" padding="md" hoverable onClick={() => setActiveTab('radar')}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', marginBottom: '4px' }}>
              EMERGING SIGNAL
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              Autonomous Tool Agents
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#155e75', lineHeight: 1.45 }}>
              LLM providers are shipping native agent loop capabilities with dynamic tool execution.
            </p>
            <Button variant="cyan" size="sm" icon={<ArrowRight size={13} />}>
              Explore Signal
            </Button>
          </Surface>

          <Surface variant="amber" radius="lg" padding="md" hoverable onClick={() => setActiveTab('focus')}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', marginBottom: '4px' }}>
              ACTIVE FOCUS TRACK
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              {activeFocus}
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#78350f', lineHeight: 1.45 }}>
              You are currently prioritizing attention on this learning direction.
            </p>
            <Button variant="amber" size="sm" icon={<ArrowRight size={13} />}>
              Manage Focus
            </Button>
          </Surface>

        </div>
      </div>

      {/* SECTION 2: EXPLORE AI CAPABILITIES (SEMANTIC TILES GRID) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px', fontFamily: "'Fredoka', sans-serif" }}>
              Explore AI Capabilities
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Select a capability area to build understanding and practical habits.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {CAPABILITY_TILES.map((tile, idx) => (
            <Surface
              key={idx}
              variant={tile.variant}
              radius="lg"
              padding="md"
              hoverable
              onClick={() => handleExploreCapability(tile.title, tile.actionTab)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '10px'
                }}>
                  {tile.icon}
                </div>

                <Badge variant="neutral" style={{ fontSize: '10px', marginBottom: '8px' }}>
                  {tile.category}
                </Badge>

                <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  {tile.title}
                </h3>

                <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#334155', lineHeight: 1.45 }}>
                  {tile.description}
                </p>
              </div>

              <Button variant={tile.btnVariant} size="sm" icon={<ArrowRight size={13} />}>
                Explore Capability
              </Button>
            </Surface>
          ))}
        </div>
      </div>

      {/* SECTION 3: AI RADAR SIGNALS SHOWCASE */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px', fontFamily: "'Fredoka', sans-serif" }}>
              AI Radar — Technical Shifts
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Real-time model releases, workflow evolutions, and technical paradigm shifts.
            </p>
          </div>

          <Button variant="cyan" size="sm" icon={<ArrowRight size={14} />} onClick={() => setActiveTab('radar')}>
            View All Radar Signals
          </Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {signals.slice(0, 3).map((sig) => (
            <Surface key={sig.id} variant="cyan" radius="lg" padding="md" hoverable onClick={() => setActiveTab('radar')}>
              <Badge variant="purple" style={{ marginBottom: '8px' }}>{sig.category}</Badge>

              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 6px', color: '#0f172a' }}>
                {sig.title}
              </h3>

              <p style={{ fontSize: '12px', color: '#334155', margin: '0 0 12px', lineHeight: 1.45 }}>
                {sig.summary}
              </p>

              <div style={{ padding: '10px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '11px', color: '#0369a1' }}>
                <strong>Today: </strong> {sig.scaffold.today}
              </div>
            </Surface>
          ))}
        </div>
      </div>

      {/* SECTION 4: MENTOR GUIDANCE FOOTER */}
      <MentorMessage
        message="Discovery is about connecting what is changing in AI with your personal capability profile. Choose a capability to explore or investigate a technical signal."
        action={
          <Button variant="violet" size="md" icon={<ArrowRight size={14} />} onClick={() => setActiveTab('clarity')}>
            Explore Clarity Workspace
          </Button>
        }
      />

    </div>
  );
};
