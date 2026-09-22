import React, { useState, useEffect } from 'react';
import { useLearner } from '../../context/LearnerContext';
import {
  BarChart3,
  Users,
  Globe,
  TrendingUp,
  AlertTriangle,
  Lock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Target,
  FileText,
  Wallet,
  Sparkles
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { PageHeader } from '../../components/common/PageHeader';
import { MentorMessage } from '../../components/common/MentorMessage';
import { Badge } from '../../components/common/Badge';

interface AnalysisScreenProps {
  setActiveTab?: (tab: string) => void;
}

export const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ setActiveTab }) => {
  const { state, viewAnalysis, selectClarityArea } = useLearner();
  const [activeSubTab, setActiveSubTab] = useState<'me' | 'compare' | 'overall'>('me');

  const isCompleted = state.assessment.status === 'completed';

  useEffect(() => {
    if (isCompleted) {
      viewAnalysis();
    }
  }, [isCompleted]);

  const handleExploreArea = (areaName: string) => {
    selectClarityArea(areaName);
    if (setActiveTab) {
      setActiveTab('clarity');
    }
  };

  // LOCKED STATE
  if (!isCompleted) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
        <Surface variant="bordered" radius="lg" padding="lg">
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: '#e0e7ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#4f46e5'
          }}>
            <Lock size={28} />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: "'Fredoka', sans-serif" }}>
            Your AI Profile Report is Waiting
          </h2>

          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.5, margin: '0 0 24px' }}>
            Complete your baseline assessment first. Your diagnostic responses will give AIIMS the information it needs to construct your personal capability profile.
          </p>

          <Button
            variant="primary"
            size="lg"
            icon={<ArrowRight size={16} />}
            onClick={() => setActiveTab && setActiveTab('assessment')}
          >
            Start Baseline Assessment
          </Button>
        </Surface>
      </div>
    );
  }

  const scores = state.assessment.scores || {
    usageFrequency: 68,
    evaluationCapability: 82,
    workflowDesign: 54,
    strategicVision: 70,
    mentorshipReadiness: 65
  };

  const topCapability = state.analysis.topCapability || 'AI Evaluation & Critical Scrutiny';
  const growthArea = state.analysis.growthArea || 'AI Workflow Design';
  const activeFocus = state.focus.selectedTrack || 'AI Workflow Design';
  const userToolsCount = state.aiWallet?.userTools?.length || 0;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* EDITORIAL REPORT HEADER */}
      <PageHeader
        icon={<FileText size={24} />}
        title="MY AI PROFILE"
        description="Your assessment indicates how you currently evaluate, interact, and work with AI."
        badge={{ label: 'Diagnostic Profile', variant: 'primary', icon: <BarChart3 size={12} /> }}
      />

      {/* PERSPECTIVE SWITCHER */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <Button
          variant={activeSubTab === 'me' ? 'primary' : 'outline'}
          size="md"
          icon={<BarChart3 size={16} />}
          onClick={() => setActiveSubTab('me')}
        >
          My Profile Report
        </Button>

        <Button
          variant={activeSubTab === 'compare' ? 'secondary' : 'outline'}
          size="md"
          icon={<Users size={16} />}
          onClick={() => setActiveSubTab('compare')}
        >
          Peer Benchmarks
        </Button>

        <Button
          variant={activeSubTab === 'overall' ? 'secondary' : 'outline'}
          size="md"
          icon={<Globe size={16} />}
          onClick={() => setActiveSubTab('overall')}
        >
          Cohort Overview
        </Button>
      </div>

      {activeSubTab === 'me' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

          {/* EMPATHETIC SUMMARY BANNER */}
          <Surface variant="highlight" radius="lg" padding="md" style={{ borderLeft: '5px solid #6366f1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Sparkles size={24} color="#4f46e5" />
              <div>
                <h3 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 800, color: '#3730a3' }}>
                  Diagnostic Profile Summary
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#4338ca', lineHeight: 1.4 }}>
                  Your assessment indicates an established strength in <strong>{topCapability}</strong>, with a key opportunity to develop <strong>{growthArea}</strong>.
                </p>
              </div>
            </div>
          </Surface>

          {/* SECTION 1: CORE CAPABILITY DIMENSIONS */}
          <Surface variant="bordered" radius="lg" padding="lg">
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', fontFamily: "'Fredoka', sans-serif" }}>
              AI Capability Dimensions
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>
              Your baseline responses across 5 core dimensions of practical AI usage:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>

              <Surface variant="bordered" radius="md" padding="md" style={{ borderTop: '4px solid #4f46e5' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase' }}>Usage Frequency</span>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0', fontFamily: "'Fredoka', sans-serif" }}>
                  {scores.usageFrequency} <span style={{ fontSize: '13px', color: '#94a3b8' }}>/ 100</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  Indicates daily reliance and tool diversity.
                </p>
              </Surface>

              <Surface variant="bordered" radius="md" padding="md" style={{ borderTop: '4px solid #059669' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>Evaluation Scrutiny</span>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0', fontFamily: "'Fredoka', sans-serif" }}>
                  {scores.evaluationCapability} <span style={{ fontSize: '13px', color: '#94a3b8' }}>/ 100</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  Indicates critical verification and oversight.
                </p>
              </Surface>

              <Surface variant="bordered" radius="md" padding="md" style={{ borderTop: '4px solid #d97706' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>Workflow Design</span>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0', fontFamily: "'Fredoka', sans-serif" }}>
                  {scores.workflowDesign} <span style={{ fontSize: '13px', color: '#94a3b8' }}>/ 100</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  Indicates repeatable prompt & tool sequencing.
                </p>
              </Surface>

              <Surface variant="bordered" radius="md" padding="md" style={{ borderTop: '4px solid #9333ea' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#9333ea', textTransform: 'uppercase' }}>Strategic Vision</span>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0', fontFamily: "'Fredoka', sans-serif" }}>
                  {scores.strategicVision} <span style={{ fontSize: '13px', color: '#94a3b8' }}>/ 100</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  Indicates foresight on AI ecosystem shifts.
                </p>
              </Surface>

              <Surface variant="bordered" radius="md" padding="md" style={{ borderTop: '4px solid #0284c7' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>Mentorship Readiness</span>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0284c7', margin: '4px 0', fontFamily: "'Fredoka', sans-serif" }}>
                  {scores.mentorshipReadiness} <span style={{ fontSize: '13px', color: '#94a3b8' }}>/ 100</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  Indicates readiness to guide peer AI adoption.
                </p>
              </Surface>

            </div>
          </Surface>

          {/* SECTION 2: STRENGTHS & GROWTH AREAS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* STRENGTHS */}
            <Surface variant="bordered" radius="lg" padding="lg" style={{ backgroundColor: '#f0fdf4', borderLeft: '6px solid #059669' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <TrendingUp style={{ width: '20px', height: '20px', color: '#059669' }} />
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#064e3b', fontFamily: "'Fredoka', sans-serif" }}>
                  YOUR STRENGTHS
                </h2>
              </div>

              <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#047857' }}>
                {topCapability}
              </h3>

              <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#166534', lineHeight: 1.5 }}>
                Your assessment responses indicate strong scrutiny and critical verification when interacting with AI outputs.
              </p>

              <div style={{ padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #a7f3d0', fontSize: '12px', color: '#064e3b' }}>
                <strong>Key Trait: </strong> Uncompromised oversight when verifying AI model accuracy.
              </div>
            </Surface>

            {/* GROWTH AREAS */}
            <Surface variant="bordered" radius="lg" padding="lg" style={{ backgroundColor: '#fffbeb', borderLeft: '6px solid #d97706' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <AlertTriangle style={{ width: '20px', height: '20px', color: '#d97706' }} />
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#78350f', fontFamily: "'Fredoka', sans-serif" }}>
                  YOUR GROWTH AREA
                </h2>
              </div>

              <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#92400e' }}>
                {growthArea}
              </h3>

              <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#b45309', lineHeight: 1.5 }}>
                Your diagnostic profile indicates an opportunity to strengthen how you design repeatable, multi-step AI workflows.
              </p>

              <Button
                variant="primary"
                size="sm"
                icon={<ArrowRight size={14} />}
                onClick={() => handleExploreArea(growthArea)}
              >
                Explore {growthArea} in Clarity
              </Button>
            </Surface>
          </div>

          {/* SECTION 3: CURRENT FOCUS & TOOLKIT COVERAGE */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Surface variant="bordered" radius="lg" padding="lg">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Target size={20} color="#4f46e5" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>YOUR CURRENT FOCUS</h3>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#4338ca', margin: '0 0 8px' }}>
                {activeFocus}
              </p>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                This focus track guides your AI Radar signals and tool recommendations in AI Wallet.
              </p>
            </Surface>

            <Surface variant="bordered" radius="lg" padding="lg">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Wallet size={20} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>YOUR TOOLKIT COVERAGE</h3>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#047857', margin: '0 0 8px' }}>
                {userToolsCount} Tools in Wallet
              </p>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                Your current toolkit has initial coverage. Explore AI Wallet to discover workflow automation tools.
              </p>
            </Surface>
          </div>

          {/* SECTION 4: YOUR NEXT OPPORTUNITY (DIRECT AI WALLET LINK) */}
          <Surface variant="highlight" radius="lg" padding="lg" style={{ border: '2px solid #6366f1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  YOUR NEXT OPPORTUNITY
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '4px 0 6px', fontFamily: "'Fredoka', sans-serif" }}>
                  Connect {growthArea} to your AI Toolkit
                </h2>
                <p style={{ fontSize: '13px', color: '#475569', margin: 0, maxWidth: '650px', lineHeight: 1.5 }}>
                  Your assessment indicates an opportunity in {growthArea}. Discover and evaluate tools in AI Wallet specifically suited for automation and workflow design.
                </p>
              </div>

              <Button
                variant="violet"
                size="lg"
                icon={<Wallet size={18} />}
                onClick={() => setActiveTab && setActiveTab('wallet')}
              >
                Explore AI Wallet Tools
              </Button>
            </div>
          </Surface>

          {/* MENTOR GUIDANCE OBSERVATION */}
          <MentorMessage
            message={`"Your baseline indicates strong critical evaluation skills. By connecting your growth opportunity in ${growthArea} with evaluated tools in AI Wallet, you can accelerate your workflow output safely."`}
          />

        </div>
      )}

      {activeSubTab === 'compare' && (
        <Surface variant="bordered" radius="lg" padding="lg">
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: "'Fredoka', sans-serif" }}>
            Peer Benchmark Comparison
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
            Comparing your profile dimensions with baseline product & engineering peers.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <strong style={{ color: '#4f46e5' }}>Evaluation Rigor: </strong>
              Your responses place you in the upper tier for output verification compared to baseline peers.
            </div>

            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <strong style={{ color: '#0284c7' }}>Workflow Repeatability: </strong>
              Your profile indicates opportunity to adopt multi-step templates used by leading AI practitioners.
            </div>
          </div>
        </Surface>
      )}

      {activeSubTab === 'overall' && (
        <Surface variant="bordered" radius="lg" padding="lg">
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: "'Fredoka', sans-serif" }}>
            Cohort Capability Overview
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
            Aggregated, privacy-scoped statistics across all AIIMS diagnostic assessments.
          </p>
          <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '10px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
            Cohort stats update dynamically as baseline completions grow.
          </div>
        </Surface>
      )}

    </div>
  );
};
