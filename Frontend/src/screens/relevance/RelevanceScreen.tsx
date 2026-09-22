import React from 'react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { RadarSignal } from '../../types';
import { Sparkles, CheckCircle2, ArrowRight, Target, ShieldCheck, UserCheck, Database, Layers, ArrowDown } from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { MentorMessage } from '../../components/common/MentorMessage';
import { buildLearnerProfileContext } from '../../services/learnerProfileContext';
import { evaluateSignalRelevance } from '../../services/relevanceEngine';

export const RelevanceScreen: React.FC<{ signal: RadarSignal | null; setActiveTab?: (tab: string) => void }> = ({
  signal,
  setActiveTab
}) => {
  const { state, setRadarOpportunityContext } = useLearner();
  const learnerContext = buildLearnerProfileContext(state);

  const fallbackSignal: RadarSignal = {
    id: 'sig-1',
    title: 'Autonomous Tool-Calling Agents Shift Core Prompting Models',
    category: 'Tech Shift',
    source: 'ArXiv & Tech Release Feed',
    dateTime: 'September 2026',
    summary: 'LLM providers are shipping native agent loop capabilities, reducing the need for line-by-line user instruction in favor of high-level goal specification.',
    scaffold: {
      yesterday: 'Single-prompt back-and-forth chat requiring manual step-by-step instructions for every action.',
      today: 'Goal-based agent execution with dynamic tool calling, autonomous file editing, and automated verification loops.',
      whatChanged: 'Models execute multi-turn function calls internally before returning a final verified result.',
      whosAffected: 'Software developers, product managers, and knowledge workers relying on repetitive multi-step workflows.'
    },
    isFollowed: true
  };

  const activeSignal = signal || fallbackSignal;
  const relevance = evaluateSignalRelevance(activeSignal, learnerContext);

  const topCapability = learnerContext.assessment.topCapability;
  const growthArea = learnerContext.assessment.growthArea;
  const activeFocus = learnerContext.focus.activeFocusTrack || growthArea;
  const clarityReflection = learnerContext.clarity.latestReflection;
  const userInvestigationNote = learnerContext.investigation.latestNote;

  const handleLaunchProblemSolver = () => {
    setRadarOpportunityContext({
      activeSignalId: activeSignal.id,
      opportunityTitle: activeSignal.title,
      opportunityDesc: activeSignal.summary,
      passedContext: {
        activeFocus,
        growthArea,
        topCapability,
        category: activeSignal.category
      }
    });
    if (setActiveTab) {
      setActiveTab('solver');
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* PAGE HEADER */}
      <PageHeader
        icon={<Sparkles size={24} />}
        title="WHY THIS MATTERS TO YOU"
        description="A visual synthesis story connecting Profile (Violet) → Focus (Amber) → AI Change (Cyan) → Investigation (Blue) → What it means for you."
        badge={{ label: relevance.relevanceBadgeText, variant: 'purple', icon: <Target size={12} /> }}
      />

      {/* VISUAL NARRATIVE CHAIN WITH SEMANTIC TILES */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>

        {/* STEP 1: YOUR PROFILE (VIOLET) */}
        <Surface variant="violet" radius="lg" padding="lg" style={{ width: '100%' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#6b21a8', textTransform: 'uppercase' }}>1. YOUR PROFILE</span>
          <h3 style={{ margin: '4px 0 2px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Top Strength: {topCapability}</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#4c1d95' }}>Primary growth opportunity: {growthArea}.</p>
        </Surface>

        <ArrowDown size={22} style={{ color: '#6b21a8' }} />

        {/* STEP 2: YOUR FOCUS (AMBER) */}
        <Surface variant="amber" radius="lg" padding="lg" style={{ width: '100%' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>2. YOUR FOCUS</span>
          <h3 style={{ margin: '4px 0 2px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Active Focus Track: {activeFocus}</h3>
          {clarityReflection && (
            <p style={{ margin: 0, fontSize: '13px', color: '#78350f', fontStyle: 'italic' }}>"{clarityReflection}"</p>
          )}
        </Surface>

        <ArrowDown size={22} style={{ color: '#b45309' }} />

        {/* STEP 3: AI CHANGE (CYAN) */}
        <Surface variant="cyan" radius="lg" padding="lg" style={{ width: '100%' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>3. AI CHANGE (AI RADAR)</span>
          <h3 style={{ margin: '4px 0 2px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{activeSignal.title}</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#155e75' }}>{activeSignal.scaffold.whatChanged}</p>
        </Surface>

        <ArrowDown size={22} style={{ color: '#0369a1' }} />

        {/* STEP 4: YOUR INVESTIGATION (BLUE/SKY) */}
        <Surface variant="sky" radius="lg" padding="lg" style={{ width: '100%' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#075985', textTransform: 'uppercase' }}>4. YOUR INVESTIGATION</span>
          <h3 style={{ margin: '4px 0 2px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Personal Reflection Recorded</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#0369a1', fontStyle: 'italic' }}>"{userInvestigationNote || 'Evaluating impact on daily workflow.'}"</p>
        </Surface>

        <ArrowDown size={22} style={{ color: '#075985' }} />

        {/* STEP 5: SYNTHESIS PAYOFF (GRADIENT RELEVANCE) */}
        <Surface variant="gradient-relevance" radius="lg" padding="lg" style={{ width: '100%' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#4338ca', textTransform: 'uppercase' }}>5. WHAT THIS MEANS FOR YOU (YOUR SYNTHESIS PAYOFF)</span>
          <p style={{ margin: '8px 0 0', fontSize: '15px', color: '#1e1b4b', lineHeight: 1.6, fontWeight: 600 }}>
            Because you possess high evaluation rigor ({topCapability}), you can safely adopt autonomous agent tools in {activeFocus} without taking on hallucination risks. Documenting a 3-step prompt verification template allows you to elevate your workflow design efficiency immediately.
          </p>
        </Surface>

      </div>

      {/* RECOMMENDED ACTION: BRIDGE TO STAGE 8 PROBLEM SOLVER */}
      <Surface variant="mint" radius="lg" padding="lg" style={{ border: '2px solid #10b981' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '1px' }}>
          STAGE 8 • REAL PROBLEM SOLVING
        </span>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '4px 0 8px', fontFamily: "'Fredoka', sans-serif" }}>
          Apply this opportunity to a real problem
        </h3>
        <p style={{ fontSize: '13px', color: '#064e3b', margin: '0 0 18px', lineHeight: 1.5 }}>
          Pre-populate Problem Solver with this AI Radar signal context ({activeSignal.title}) to derive required capabilities and tool execution sequences.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button
            variant="violet"
            size="md"
            icon={<ArrowRight size={16} />}
            onClick={handleLaunchProblemSolver}
          >
            Explore this in Problem Solver
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => setActiveTab && setActiveTab('home')}
          >
            Return to Journey Hub
          </Button>
        </div>
      </Surface>

      {/* MENTOR SUMMARY */}
      <MentorMessage
        message="You now clearly understand why this AI change matters to you personally. Apply this opportunity in Problem Solver to build a practical workflow."
      />

    </div>
  );
};
