import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Target,
  Radar,
  Coins,
  MessageCircle,
  TrendingUp,
  Zap,
  BarChart3,
  Route,
  Sparkles,
  Compass,
  CheckCircle2,
  ShieldCheck,
  Layers,
  Brain,
  Cpu,
  BookOpen
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { MentorMessage } from '../../components/common/MentorMessage';
import { buildLearnerProfileContext } from '../../services/learnerProfileContext';
import { MentorService, MentorResponse } from '../../services/mentorProvider';
import { SignalDataProvider } from '../../services/signalDataProvider';
import { RadarSignal } from '../../types';

interface HomeScreenProps {
  setActiveTab: (tab: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ setActiveTab }) => {
  const { state, selectClarityArea } = useLearner();
  const userName = state.profile?.name ? state.profile.name.split(' ')[0] : 'Learner';
  const credits = state.credits.balance;

  const learnerContext = buildLearnerProfileContext(state);
  const [mentorResponse, setMentorResponse] = useState<MentorResponse | null>(null);
  const [featuredSignal, setFeaturedSignal] = useState<RadarSignal | null>(null);

  useEffect(() => {
    let isMounted = true;
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

  const isAssessmentCompleted = state.assessment.status === 'completed';
  const isAnalysisViewed = state.analysis.status === 'viewed' || state.analysis.status === 'unlocked';
  const isFocusActive = state.focus.status === 'active' && state.focus.selectedTrack !== null;
  const activeFocusTrack = state.focus.selectedTrack || 'AI Workflow Design';
  const growthArea = state.analysis.growthArea || 'AI Workflow Design';
  const topCapability = state.analysis.topCapability || 'AI Literacy';

  let heroTitle = 'Start by discovering your AI profile.';
  let heroNotice = 'AIIMS needs to understand your usage habits, evaluation skills, and workflow patterns.';
  let heroNextStep = 'Start Baseline Assessment (+50 Credits)';
  let heroNextTab = 'assessment';

  if (!isAssessmentCompleted) {
    heroTitle = 'Start by discovering your AI profile.';
    heroNotice = 'AIIMS needs to understand your usage habits, evaluation skills, and workflow patterns.';
    heroNextStep = 'Start Baseline Assessment (+50 Credits)';
    heroNextTab = 'assessment';
  } else if (!isAnalysisViewed) {
    heroTitle = "Your baseline is ready. Let's understand what it says.";
    heroNotice = `Your profile shows top strength in ${topCapability} and growth opportunity in ${growthArea}.`;
    heroNextStep = 'Explore Your AI Profile Analysis';
    heroNextTab = 'analysis';
  } else if (isFocusActive) {
    heroTitle = `You're exploring ${activeFocusTrack}. Here's what is changing around it.`;
    heroNotice = `Your active focus track is connected to emerging AI Radar signals and capability clarity modules.`;
    heroNextStep = 'Investigate Connected AI Signals';
    heroNextTab = 'radar';
  } else {
    heroTitle = `Your growth opportunity is ${growthArea}. Choose your focus.`;
    heroNotice = `You have explored Clarity. Select your primary area of focus to prioritize your learning attention.`;
    heroNextStep = 'Decide Your Focus Track';
    heroNextTab = 'focus';
  }

  const handleExploreCapability = (title: string) => {
    selectClarityArea(title);
    setActiveTab('clarity');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1060px', margin: '0 auto' }}>

      {/* 1. ATMOSPHERIC DAYLIGHT HERO */}
      <Surface variant="gradient-hero" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>
            <h1 style={{
              margin: '0 0 4px 0',
              fontSize: '32px',
              fontWeight: 800,
              color: '#0f172a',
              fontFamily: "'Fredoka', 'Outfit', sans-serif",
              letterSpacing: '-0.5px'
            }}>
              Good morning, {userName}
            </h1>
            <p style={{ margin: 0, fontSize: '15px', color: '#4338ca', fontWeight: 600 }}>
              Your AI journey starts here. Welcome to your personal learning environment.
            </p>
          </div>

          <Badge variant="purple" icon={<Sparkles size={13} />}>
            {learnerContext.journeyProgress.statusLabel}
          </Badge>
        </div>

        <MentorMessage
          message={mentorResponse?.message || "Welcome to AIIMS. Complete your baseline assessment to reveal your personal AI capability profile."}
          action={
            <Button
              variant="violet"
              size="md"
              icon={<ArrowRight size={15} />}
              onClick={() => setActiveTab(mentorResponse?.suggestedAction?.targetTab || heroNextTab)}
            >
              {mentorResponse?.suggestedAction?.text || 'Explore Guidance'}
            </Button>
          }
          style={{ marginBottom: '24px' }}
        />

        {/* HERO DECISION PANEL */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #c7d2fe',
          boxShadow: '0 4px 20px rgba(79, 70, 229, 0.06)'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#4338ca', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>
            WHERE YOU ARE NOW
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1e1b4b', margin: '0 0 14px', fontFamily: "'Fredoka', 'Outfit', sans-serif", lineHeight: 1.3 }}>
            {heroTitle}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div style={{ padding: '14px', backgroundColor: '#f5f3ff', borderRadius: '10px', border: '1px solid #ddd6fe' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#6b21a8', textTransform: 'uppercase', marginBottom: '2px' }}>
                WHAT AIIMS HAS NOTICED
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.45, fontWeight: 500 }}>
                {heroNotice}
              </p>
            </div>

            <div style={{ padding: '14px', backgroundColor: '#ecfdf5', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#047857', textTransform: 'uppercase', marginBottom: '2px' }}>
                WHAT YOU CAN DO NEXT
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#064e3b', lineHeight: 1.45, fontWeight: 500 }}>
                Take action on your current priority stage to build practical capabilities.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Button
              variant="primary"
              size="lg"
              icon={<ArrowRight size={16} />}
              onClick={() => setActiveTab(heroNextTab)}
              style={{ fontWeight: 800, padding: '14px 28px' }}
            >
              {heroNextStep}
            </Button>

            <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>
              Or view your <a onClick={() => setActiveTab('journey')} style={{ color: '#4f46e5', cursor: 'pointer', textDecoration: 'underline' }}>full journey roadmap →</a>
            </span>
          </div>
        </div>
      </Surface>

      {/* 2. WORTH EXPLORING (COLOURFUL DISCOVERY TILES) */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px', fontFamily: "'Fredoka', 'Outfit', sans-serif" }}>
          Worth Exploring
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>

          {/* Tile 1: Soft Violet */}
          <Surface variant="violet" radius="lg" padding="md" hoverable onClick={() => setActiveTab(isAssessmentCompleted ? 'analysis' : 'assessment')}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
              <BarChart3 size={18} />
            </div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#6b21a8', textTransform: 'uppercase', marginBottom: '4px' }}>
              AI PROFILE
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              {isAssessmentCompleted ? `Top: ${topCapability}` : 'Discover Profile'}
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
              {isAssessmentCompleted ? 'Inspect your diagnostic baseline strength.' : 'Answer 25 questions.'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#6b21a8' }}>
              <span>{isAssessmentCompleted ? 'View Analysis' : 'Start'}</span> <ArrowRight size={12} />
            </div>
          </Surface>

          {/* Tile 2: Soft Mint */}
          <Surface variant="mint" radius="lg" padding="md" hoverable onClick={() => setActiveTab('clarity')}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
              <Compass size={18} />
            </div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#047857', textTransform: 'uppercase', marginBottom: '4px' }}>
              CLARITY HUB
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              {growthArea}
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#064e3b', lineHeight: 1.4 }}>
              Primary opportunity area identified in baseline.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#047857' }}>
              <span>Build Clarity</span> <ArrowRight size={12} />
            </div>
          </Surface>

          {/* Tile 3: Soft Amber */}
          <Surface variant="amber" radius="lg" padding="md" hoverable onClick={() => setActiveTab('focus')}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
              <Target size={18} />
            </div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', marginBottom: '4px' }}>
              YOUR FOCUS
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              {activeFocusTrack}
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#78350f', lineHeight: 1.4 }}>
              Active skill track under development.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#b45309' }}>
              <span>Manage Focus</span> <ArrowRight size={12} />
            </div>
          </Surface>

          {/* Tile 4: Soft Cyan */}
          <Surface variant="cyan" radius="lg" padding="md" hoverable onClick={() => setActiveTab('radar')}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
              <Radar size={18} />
            </div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', marginBottom: '4px' }}>
              AI RADAR
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              Autonomous Tool Agents
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#155e75', lineHeight: 1.4 }}>
              Models moving from chat to autonomous loops.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#0369a1' }}>
              <span>Investigate</span> <ArrowRight size={12} />
            </div>
          </Surface>

        </div>
      </div>

      {/* 3. EXPLORE AI CAPABILITIES (SEMANTIC COLOUR SYSTEM) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px', fontFamily: "'Fredoka', 'Outfit', sans-serif" }}>
              Explore AI Capabilities
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Each capability area possesses a distinct semantic visual identity.
            </p>
          </div>

          <Button variant="outline" size="sm" icon={<ArrowRight size={14} />} onClick={() => setActiveTab('discover')}>
            View All Capabilities
          </Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>

          <Surface variant="sky" radius="lg" padding="md" hoverable onClick={() => handleExploreCapability('AI Fundamentals')}>
            <Badge variant="neutral" style={{ fontSize: '9px', marginBottom: '8px' }}>LITERACY</Badge>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#075985', margin: '0 0 4px' }}>AI Fundamentals</h3>
            <p style={{ fontSize: '12px', color: '#0369a1', margin: '0 0 12px', lineHeight: 1.4 }}>Token prediction & foundational LLM limits.</p>
            <Button variant="cyan" size="sm" icon={<ArrowRight size={12} />}>Explore</Button>
          </Surface>

          <Surface variant="mint" radius="lg" padding="md" hoverable onClick={() => handleExploreCapability('AI Literacy & Verification')}>
            <Badge variant="neutral" style={{ fontSize: '9px', marginBottom: '8px' }}>LITERACY</Badge>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#064e3b', margin: '0 0 4px' }}>AI Literacy</h3>
            <p style={{ fontSize: '12px', color: '#047857', margin: '0 0 12px', lineHeight: 1.4 }}>Hallucination checks & source verification.</p>
            <Button variant="green" size="sm" icon={<ArrowRight size={12} />}>Explore</Button>
          </Surface>

          <Surface variant="violet" radius="lg" padding="md" hoverable onClick={() => handleExploreCapability('AI Workflow Design')}>
            <Badge variant="neutral" style={{ fontSize: '9px', marginBottom: '8px' }}>WORKFLOWS</Badge>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#4c1d95', margin: '0 0 4px' }}>Workflow Design</h3>
            <p style={{ fontSize: '12px', color: '#6b21a8', margin: '0 0 12px', lineHeight: 1.4 }}>Repeatable prompt templates & multi-steps.</p>
            <Button variant="violet" size="sm" icon={<ArrowRight size={12} />}>Explore</Button>
          </Surface>

          <Surface variant="amber" radius="lg" padding="md" hoverable onClick={() => handleExploreCapability('Critical Thinking & Oversight')}>
            <Badge variant="neutral" style={{ fontSize: '9px', marginBottom: '8px' }}>CRITICAL THINKING</Badge>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#78350f', margin: '0 0 4px' }}>Critical Thinking</h3>
            <p style={{ fontSize: '12px', color: '#b45309', margin: '0 0 12px', lineHeight: 1.4 }}>Output evaluation & edge-case testing.</p>
            <Button variant="amber" size="sm" icon={<ArrowRight size={12} />}>Explore</Button>
          </Surface>

        </div>
      </div>

      {/* 4. AI RADAR — DISTINCT CYAN/BLUE FEATURED SIGNAL */}
      <Surface variant="gradient-radar" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radar size={22} style={{ color: '#0284c7' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: "'Fredoka', 'Outfit', sans-serif" }}>
              AI RADAR — WHAT'S CHANGING IN AI?
            </h2>
          </div>

          <Badge variant="purple">FEATURED SIGNAL</Badge>
        </div>

        {featuredSignal ? (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', fontFamily: "'Fredoka', 'Outfit', sans-serif" }}>
              {featuredSignal.title}
            </h3>
            <p style={{ fontSize: '14px', color: '#334155', margin: '0 0 16px', lineHeight: 1.5, fontWeight: 500 }}>
              {featuredSignal.summary}
            </p>

            <div style={{
              padding: '12px 16px',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #bae6fd',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#0369a1'
            }}>
              <strong style={{ color: '#0284c7' }}>Why you're seeing this: </strong>
              Connected to your current focus in <strong>{activeFocusTrack}</strong>.
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                variant="cyan"
                size="lg"
                icon={<ArrowRight size={16} />}
                onClick={() => setActiveTab('radar')}
              >
                Investigate Signal (+30 Credits)
              </Button>

              <span style={{ fontSize: '12px', color: '#0369a1', fontWeight: 600 }}>
                Source: {featuredSignal.source || 'ArXiv Technical Feed'}
              </span>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: '#64748b' }}>Loading latest AI market signals...</p>
        )}
      </Surface>

      {/* 5. CONTINUE YOUR JOURNEY (SOFT LAVENDER ENVIRONMENT) */}
      <Surface variant="violet" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Route size={20} style={{ color: '#6b21a8' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#4c1d95', margin: 0, fontFamily: "'Fredoka', 'Outfit', sans-serif" }}>
              Continue Your Journey
            </h2>
          </div>

          <Button variant="outline" size="sm" icon={<ArrowRight size={14} />} onClick={() => setActiveTab('journey')}>
            View Journey Roadmap
          </Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>

          <div style={{ padding: '14px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #ddd6fe' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#6b21a8', textTransform: 'uppercase' }}>Active Stage</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
              {isAssessmentCompleted ? 'Clarity & Focus' : 'Baseline Assessment'}
            </div>
          </div>

          <div style={{ padding: '14px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #ddd6fe' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>Active Focus</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
              {activeFocusTrack}
            </div>
          </div>

          <div style={{ padding: '14px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #ddd6fe' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>Credits Balance</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
              {credits} AIIMS Credits
            </div>
          </div>

        </div>
      </Surface>

    </div>
  );
};
