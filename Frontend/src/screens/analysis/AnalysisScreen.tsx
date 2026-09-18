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
  Compass
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
            Complete your baseline assessment first. Your responses will give AIIMS the information it needs to construct your personal report.
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

  const topCapability = state.analysis.topCapability || 'AI Evaluation & Critical Oversight';
  const growthArea = state.analysis.growthArea || 'AI Workflow Design';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* EDITORIAL REPORT HEADER */}
      <PageHeader
        icon={<FileText size={24} />}
        title="YOUR AI PROFILE"
        description="Here's what your baseline diagnostic tells us about how you evaluate, interact, and work with AI."
        badge={{ label: 'Personal Report', variant: 'primary', icon: <BarChart3 size={12} /> }}
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

          {/* SECTION 1: HOW YOU CURRENTLY WORK WITH AI (DIMENSIONS REPORT) */}
          <Surface variant="bordered" radius="lg" padding="lg">
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', fontFamily: "'Fredoka', sans-serif" }}>
              How You Currently Work With AI
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>
              Calculated from your baseline diagnostic responses across 5 core dimensions.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>

              <Surface variant="bordered" radius="md" padding="md" style={{ borderTop: '4px solid #4f46e5' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase' }}>Usage Frequency & Variety</span>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: '4px 0', fontFamily: "'Fredoka', sans-serif" }}>
                  {scores.usageFrequency} <span style={{ fontSize: '14px', color: '#94a3b8' }}>/ 100</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.45 }}>
                  Reflects your hands-on daily reliance and diversity of tools used across work tasks.
                </p>
              </Surface>

              <Surface variant="bordered" radius="md" padding="md" style={{ borderTop: '4px solid #059669' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>Evaluation & Verification</span>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: '4px 0', fontFamily: "'Fredoka', sans-serif" }}>
                  {scores.evaluationCapability} <span style={{ fontSize: '14px', color: '#94a3b8' }}>/ 100</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.45 }}>
                  Measures critical scrutiny, hallucination detection, and primary source cross-checking.
                </p>
              </Surface>

              <Surface variant="bordered" radius="md" padding="md" style={{ borderTop: '4px solid #d97706' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>Workflow Design</span>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: '4px 0', fontFamily: "'Fredoka', sans-serif" }}>
                  {scores.workflowDesign} <span style={{ fontSize: '14px', color: '#94a3b8' }}>/ 100</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.45 }}>
                  Measures how often you build repeatable prompt templates and multi-step processes.
                </p>
              </Surface>

            </div>
          </Surface>

          {/* SECTION 2: YOUR STRENGTHS */}
          <Surface variant="bordered" radius="lg" padding="lg" style={{ backgroundColor: '#f0fdf4', borderLeft: '6px solid #059669' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <TrendingUp style={{ width: '20px', height: '20px', color: '#059669' }} />
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#064e3b', fontFamily: "'Fredoka', sans-serif" }}>
                YOUR STRENGTHS
              </h2>
            </div>

            <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#047857' }}>
              Primary Strength: {topCapability}
            </h3>

            <p style={{ margin: '0 0 14px', fontSize: '14px', color: '#166534', lineHeight: 1.5 }}>
              Your baseline evaluation indicates strong personal accountability and critical scrutiny. You do not accept model outputs at face value, which protects your work quality from hallucinations.
            </p>

            <div style={{ padding: '12px 14px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #a7f3d0', fontSize: '13px', color: '#064e3b' }}>
              <strong>Key Trait: </strong> Uncompromised human oversight and domain judgment when verifying AI responses.
            </div>
          </Surface>

          {/* SECTION 3: YOUR DEVELOPMENT AREAS */}
          <Surface variant="bordered" radius="lg" padding="lg" style={{ backgroundColor: '#fffbeb', borderLeft: '6px solid #d97706' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <AlertTriangle style={{ width: '20px', height: '20px', color: '#d97706' }} />
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#78350f', fontFamily: "'Fredoka', sans-serif" }}>
                YOUR DEVELOPMENT AREAS
              </h2>
            </div>

            <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#92400e' }}>
              Primary Opportunity: {growthArea}
            </h3>

            <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#b45309', lineHeight: 1.5 }}>
              Your profile shows an opportunity to shift from task-by-task prompting toward designing repeatable, structured AI workflows for recurring work.
            </p>

            <Button
              variant="primary"
              size="md"
              icon={<ArrowRight size={15} />}
              onClick={() => handleExploreArea(growthArea)}
            >
              Explore {growthArea} in Clarity
            </Button>
          </Surface>

          {/* SECTION 4: WHAT THIS COULD MEAN */}
          <Surface variant="bordered" radius="lg" padding="lg">
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', fontFamily: "'Fredoka', sans-serif" }}>
              WHAT THIS COULD MEAN FOR YOUR WORK
            </h2>

            <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, margin: '0 0 16px' }}>
              Because your evaluation capability is strong, you are in an ideal position to delegate multi-step work to AI tools without taking on risk. By building structured prompt templates, you can reduce repetitive setup time while keeping quality high.
            </p>

            <MentorMessage
              message={`"Your baseline indicates that you have the critical thinking needed to evaluate AI outputs effectively. Next, let's explore how to turn those evaluation habits into repeatable workflows."`}
            />
          </Surface>

          {/* SECTION 5: WHERE TO EXPLORE NEXT */}
          <Surface variant="highlight" radius="lg" padding="lg">
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#3730a3', margin: '0 0 12px', fontFamily: "'Fredoka', sans-serif" }}>
              WHERE TO EXPLORE NEXT
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

              <Surface variant="bordered" radius="md" padding="md" hoverable onClick={() => handleExploreArea('AI Workflow Design')}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '4px' }}>CLARITY LESSON</div>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>AI Workflow Design</h3>
                <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748b' }}>Learn how to connect inputs, prompts, and checks.</p>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Start Lesson</span> <ArrowRight size={13} />
                </div>
              </Surface>

              <Surface variant="bordered" radius="md" padding="md" hoverable onClick={() => handleExploreArea('AI Agents & Autonomous Workflows')}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', marginBottom: '4px' }}>ADVANCED TOPIC</div>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>AI Agents & Workflows</h3>
                <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748b' }}>Explore goal-based delegation with safety boundaries.</p>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Start Lesson</span> <ArrowRight size={13} />
                </div>
              </Surface>

            </div>
          </Surface>

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
              Your score of {scores.evaluationCapability}/100 places you in the upper 25% of baseline learners for output verification.
            </div>

            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <strong style={{ color: '#0284c7' }}>Workflow Repeatability: </strong>
              Your score of {scores.workflowDesign}/100 indicates opportunity to adopt multi-step templates used by top engineering teams.
            </div>
          </div>
        </Surface>
      )}

      {activeSubTab === 'overall' && (
        <Surface variant="bordered" radius="lg" padding="lg">
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: "'Fredoka', sans-serif" }}>
            Cohort Macro Patterns
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
            Broad capability trends observed across AIIMS learners.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            <div style={{ padding: '14px', backgroundColor: '#ecfdf5', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>Common Strength</span>
              <h3 style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 700, color: '#064e3b' }}>AI-assisted drafting</h3>
            </div>

            <div style={{ padding: '14px', backgroundColor: '#fff1f2', borderRadius: '10px', border: '1px solid #fecdd3' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#be123c', textTransform: 'uppercase' }}>Common Growth Area</span>
              <h3 style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 700, color: '#881337' }}>Repeatable Workflows</h3>
            </div>

            <div style={{ padding: '14px', backgroundColor: '#e0f2fe', borderRadius: '10px', border: '1px solid #bae6fd' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>Macro Trend</span>
              <h3 style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 700, color: '#075985' }}>Daily AI tool usage</h3>
            </div>
          </div>
        </Surface>
      )}

    </div>
  );
};
