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
  Zap,
  Target,
  FileText,
  Wallet,
  Sparkles,
  Award,
  CheckCircle2,
  TrendingDown,
  Activity,
  Layers,
  PieChart
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { PageHeader } from '../../components/common/PageHeader';
import { MentorMessage } from '../../components/common/MentorMessage';
import { Badge } from '../../components/common/Badge';
import { RadarChart } from '../../components/charts/RadarChart';
import { DimensionScore } from '../../types';
import { evaluateAssessment, CAPABILITY_NAMES, CAPABILITY_DESCRIPTIONS, CapabilityKey } from '../../services/assessmentScoring';

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

  // Evaluate assessment responses using AINOVA Assessment Scoring Engine
  const userAnswers = state.assessment.answers || {};
  const evaluationResult = evaluateAssessment(userAnswers);
  const { overallScore, capabilities, strongestSkill, roomToGrow } = evaluationResult;
  const scores = evaluationResult.legacyScores;

  const peerBenchmarks = {
    usingAI: 62,
    understandingAI: 68,
    solvingWithAI: 58,
    checkingAI: 72,
    adaptingToAI: 60
  };

  const peerOverallAverage = 64;

  const cohortStats = {
    totalParticipants: 1248,
    cohortAverage: 64,
    userPercentile: Math.min(99, Math.max(10, Math.round((overallScore / 100) * 85))),
    dimensions: [
      { name: 'Using AI', key: 'usingAI', userScore: capabilities.usingAI.score, peerAvg: 62, min: 20, max: 95, percentile: Math.round((capabilities.usingAI.score / 100) * 90) },
      { name: 'Understanding AI', key: 'understandingAI', userScore: capabilities.understandingAI.score, peerAvg: 68, min: 25, max: 98, percentile: Math.round((capabilities.understandingAI.score / 100) * 90) },
      { name: 'Solving with AI', key: 'solvingWithAI', userScore: capabilities.solvingWithAI.score, peerAvg: 58, min: 15, max: 95, percentile: Math.round((capabilities.solvingWithAI.score / 100) * 90) },
      { name: 'Checking AI', key: 'checkingAI', userScore: capabilities.checkingAI.score, peerAvg: 72, min: 20, max: 98, percentile: Math.round((capabilities.checkingAI.score / 100) * 90) },
      { name: 'Adapting to AI', key: 'adaptingToAI', userScore: capabilities.adaptingToAI.score, peerAvg: 60, min: 10, max: 92, percentile: Math.round((capabilities.adaptingToAI.score / 100) * 90) }
    ]
  };

  const radarScores: DimensionScore[] = [
    { dimension: 'Using AI', score: capabilities.usingAI.score, benchmark: peerBenchmarks.usingAI },
    { dimension: 'Understanding AI', score: capabilities.understandingAI.score, benchmark: peerBenchmarks.understandingAI },
    { dimension: 'Solving with AI', score: capabilities.solvingWithAI.score, benchmark: peerBenchmarks.solvingWithAI },
    { dimension: 'Checking AI', score: capabilities.checkingAI.score, benchmark: peerBenchmarks.checkingAI },
    { dimension: 'Adapting to AI', score: capabilities.adaptingToAI.score, benchmark: peerBenchmarks.adaptingToAI }
  ];

  const topCapability = strongestSkill.name;
  const growthArea = roomToGrow.name;
  const activeFocus = state.focus.selectedTrack || 'AI Workflow Design';
  const userToolsCount = state.aiWallet?.userTools?.length || 0;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* EDITORIAL REPORT HEADER WITH OVERALL SCORE */}
      <PageHeader
        icon={<FileText size={24} />}
        title="MY AI PROFILE"
        description="Your assessment indicates how you currently evaluate, interact, and work with AI."
        badge={{ label: 'Diagnostic Profile', variant: 'primary', icon: <BarChart3 size={12} /> }}
        action={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#f5f3ff',
            border: '1.5px solid #8b5cf6',
            borderRadius: '16px',
            padding: '10px 18px',
            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.12)'
          }}>
            <Award size={24} color="#7c3aed" />
            <div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Overall AI Proficiency Score
              </div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#4c1d95', fontFamily: "'Fredoka', sans-serif", lineHeight: 1.1 }}>
                {overallScore} <span style={{ fontSize: '13px', color: '#7c3aed', fontWeight: 700 }}>/ 100</span>
              </div>
            </div>
          </div>
        }
      />

      {/* PERSPECTIVE SWITCHER WITH DYNAMIC SCORES IN BUTTONS */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant={activeSubTab === 'me' ? 'primary' : 'outline'}
          size="md"
          icon={<BarChart3 size={16} />}
          onClick={() => setActiveSubTab('me')}
        >
          <span>My Profile Report</span>
          {isCompleted && (
            <span style={{
              marginLeft: '8px',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 800,
              backgroundColor: activeSubTab === 'me' ? 'rgba(255, 255, 255, 0.25)' : '#e0e7ff',
              color: activeSubTab === 'me' ? '#ffffff' : '#3730a3'
            }}>
              Score: {overallScore}/100
            </span>
          )}
        </Button>

        <Button
          variant={activeSubTab === 'compare' ? 'secondary' : 'outline'}
          size="md"
          icon={<Users size={16} />}
          onClick={() => setActiveSubTab('compare')}
        >
          <span>Peer Benchmarks</span>
          {isCompleted && (
            <span style={{
              marginLeft: '8px',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 800,
              backgroundColor: activeSubTab === 'compare' ? 'rgba(255, 255, 255, 0.25)' : '#f3e8ff',
              color: activeSubTab === 'compare' ? '#ffffff' : '#6b21a8'
            }}>
              Peer Avg: {peerOverallAverage}/100
            </span>
          )}
        </Button>

        <Button
          variant={activeSubTab === 'overall' ? 'secondary' : 'outline'}
          size="md"
          icon={<Globe size={16} />}
          onClick={() => setActiveSubTab('overall')}
        >
          <span>Cohort Overview</span>
          {isCompleted && (
            <span style={{
              marginLeft: '8px',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 800,
              backgroundColor: activeSubTab === 'overall' ? 'rgba(255, 255, 255, 0.25)' : '#e0e7ff',
              color: activeSubTab === 'overall' ? '#ffffff' : '#0369a1'
            }}>
              {cohortStats.userPercentile}th Percentile
            </span>
          )}
        </Button>
      </div>

      {activeSubTab === 'me' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

          {/* EMPATHETIC SUMMARY BANNER */}
          <Surface variant="highlight" radius="lg" padding="md" style={{ borderLeft: '5px solid #6366f1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
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
              <div style={{ padding: '6px 14px', backgroundColor: '#e0e7ff', borderRadius: '10px', fontSize: '13px', fontWeight: 800, color: '#3730a3' }}>
                Overall Baseline Index: {overallScore} / 100
              </div>
            </div>
          </Surface>

          {/* SECTION 1: CORE CAPABILITY DIMENSIONS */}
          <Surface variant="bordered" radius="lg" padding="lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px', fontFamily: "'Fredoka', sans-serif" }}>
                  AI Capability Dimensions
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Your baseline responses across 5 core dimensions of practical AI usage:
                </p>
              </div>
              <Badge variant="primary">Overall Average: {overallScore}/100</Badge>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>

              <Surface variant="bordered" radius="md" padding="md" style={{ borderTop: '4px solid #4f46e5' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase' }}>Using AI</span>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0', fontFamily: "'Fredoka', sans-serif" }}>
                  {capabilities.usingAI.score} <span style={{ fontSize: '13px', color: '#94a3b8' }}>/ 100</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', margin: '6px 0 8px', overflow: 'hidden' }}>
                  <div style={{ width: `${capabilities.usingAI.score}%`, height: '100%', backgroundColor: '#4f46e5', borderRadius: '3px' }}></div>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  {CAPABILITY_DESCRIPTIONS.usingAI}
                </p>
              </Surface>

              <Surface variant="bordered" radius="md" padding="md" style={{ borderTop: '4px solid #059669' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>Understanding AI</span>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0', fontFamily: "'Fredoka', sans-serif" }}>
                  {capabilities.understandingAI.score} <span style={{ fontSize: '13px', color: '#94a3b8' }}>/ 100</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', margin: '6px 0 8px', overflow: 'hidden' }}>
                  <div style={{ width: `${capabilities.understandingAI.score}%`, height: '100%', backgroundColor: '#059669', borderRadius: '3px' }}></div>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  {CAPABILITY_DESCRIPTIONS.understandingAI}
                </p>
              </Surface>

              <Surface variant="bordered" radius="md" padding="md" style={{ borderTop: '4px solid #d97706' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>Solving with AI</span>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0', fontFamily: "'Fredoka', sans-serif" }}>
                  {capabilities.solvingWithAI.score} <span style={{ fontSize: '13px', color: '#94a3b8' }}>/ 100</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', margin: '6px 0 8px', overflow: 'hidden' }}>
                  <div style={{ width: `${capabilities.solvingWithAI.score}%`, height: '100%', backgroundColor: '#d97706', borderRadius: '3px' }}></div>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  {CAPABILITY_DESCRIPTIONS.solvingWithAI}
                </p>
              </Surface>

              <Surface variant="bordered" radius="md" padding="md" style={{ borderTop: '4px solid #9333ea' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#9333ea', textTransform: 'uppercase' }}>Checking AI</span>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0', fontFamily: "'Fredoka', sans-serif" }}>
                  {capabilities.checkingAI.score} <span style={{ fontSize: '13px', color: '#94a3b8' }}>/ 100</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', margin: '6px 0 8px', overflow: 'hidden' }}>
                  <div style={{ width: `${capabilities.checkingAI.score}%`, height: '100%', backgroundColor: '#9333ea', borderRadius: '3px' }}></div>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  {CAPABILITY_DESCRIPTIONS.checkingAI}
                </p>
              </Surface>

              <Surface variant="bordered" radius="md" padding="md" style={{ borderTop: '4px solid #0284c7' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>Adapting to AI</span>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0284c7', margin: '4px 0', fontFamily: "'Fredoka', sans-serif" }}>
                  {capabilities.adaptingToAI.score} <span style={{ fontSize: '13px', color: '#94a3b8' }}>/ 100</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', margin: '6px 0 8px', overflow: 'hidden' }}>
                  <div style={{ width: `${capabilities.adaptingToAI.score}%`, height: '100%', backgroundColor: '#0284c7', borderRadius: '3px' }}></div>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  {CAPABILITY_DESCRIPTIONS.adaptingToAI}
                </p>
              </Surface>

            </div>
          </Surface>

          {/* VISUAL RADAR FOOTPRINT & BENCHMARK SUMMARY */}
          <Surface variant="bordered" radius="lg" padding="lg">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', fontFamily: "'Fredoka', sans-serif" }}>
                  Visual AI Footprint
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
                  This radar graph maps your 5 capability dimension scores against baseline peer benchmarks.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Your Overall Score</span>
                    <span style={{ fontSize: '16px', fontWeight: 900, color: '#4f46e5', fontFamily: "'Fredoka', sans-serif" }}>{overallScore} / 100</span>
                  </div>
                  <div style={{ padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Peer Benchmark Average</span>
                    <span style={{ fontSize: '16px', fontWeight: 900, color: '#7c3aed', fontFamily: "'Fredoka', sans-serif" }}>{peerOverallAverage} / 100</span>
                  </div>
                  <div style={{ padding: '10px 14px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>Variance vs Peer Baseline</span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#15803d' }}>+{overallScore - peerOverallAverage} Points (+{Math.round(((overallScore - peerOverallAverage) / peerOverallAverage) * 100)}%)</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <RadarChart scores={radarScores} size={280} />
              </div>
            </div>
          </Surface>

          {/* SECTION 2: STRENGTHS & ROOM TO GROW GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* STRENGTHS */}
            <Surface variant="bordered" radius="lg" padding="lg" style={{ backgroundColor: '#f0fdf4', borderLeft: '6px solid #059669' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <TrendingUp style={{ width: '20px', height: '20px', color: '#059669' }} />
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#064e3b', fontFamily: "'Fredoka', sans-serif" }}>
                  STRONGEST SKILL
                </h2>
              </div>

              <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#047857' }}>
                {strongestSkill.name} (Score: {strongestSkill.score}/100)
              </h3>

              <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#166534', lineHeight: 1.5 }}>
                Your highest actual capability score demonstrated across your assessment evidence.
              </p>

              <div style={{ padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #a7f3d0', fontSize: '12px', color: '#064e3b' }}>
                <strong>Verified Evidence: </strong> High accuracy and reasoning across relevant diagnostic questions.
              </div>
            </Surface>

            {/* ROOM TO GROW */}
            <Surface variant="bordered" radius="lg" padding="lg" style={{ backgroundColor: '#fffbeb', borderLeft: '6px solid #d97706' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <AlertTriangle style={{ width: '20px', height: '20px', color: '#d97706' }} />
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#78350f', fontFamily: "'Fredoka', sans-serif" }}>
                  ROOM TO GROW
                </h2>
              </div>

              <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#92400e' }}>
                {roomToGrow.name} (Score: {roomToGrow.score}/100)
              </h3>

              <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#b45309', lineHeight: 1.5 }}>
                Your lowest actual capability score, identifying your primary growth opportunity.
              </p>

              <Button
                variant="primary"
                size="sm"
                icon={<ArrowRight size={14} />}
                onClick={() => handleExploreArea(roomToGrow.name)}
              >
                Explore {roomToGrow.name} in Clarity
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
            message={`"Your baseline score of ${overallScore}/100 indicates strong critical evaluation skills. By connecting your growth opportunity in ${growthArea} (score ${scores.workflowDesign}/100) with evaluated tools in AI Wallet, you can accelerate your workflow output safely."`}
          />

        </div>
      )}

      {activeSubTab === 'compare' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* COMPARISON OVERVIEW HEADER */}
          <Surface variant="bordered" radius="lg" padding="lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', fontFamily: "'Fredoka', sans-serif" }}>
                  Peer Benchmark Comparison
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Comparing your profile dimension scores with baseline product & engineering peers.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ padding: '10px 16px', backgroundColor: '#e0e7ff', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#3730a3', textTransform: 'uppercase' }}>Your Score</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#4f46e5', fontFamily: "'Fredoka', sans-serif" }}>{overallScore} / 100</div>
                </div>

                <div style={{ padding: '10px 16px', backgroundColor: '#f3e8ff', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#6b21a8', textTransform: 'uppercase' }}>Peer Average</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#7c3aed', fontFamily: "'Fredoka', sans-serif" }}>{peerOverallAverage} / 100</div>
                </div>
              </div>
            </div>
          </Surface>

          {/* VISUAL RADAR & DETAILED DIMENSION SCORE COMPARISON */}
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
            
            {/* RADAR CHART DISPLAY */}
            <Surface variant="bordered" radius="lg" padding="lg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', textAlign: 'center', fontFamily: "'Fredoka', sans-serif" }}>
                Score Overlay vs Peers
              </h3>
              <RadarChart scores={radarScores} size={280} />
            </Surface>

            {/* DIMENSION SCORE COMPARISON LIST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* USING AI */}
              <Surface variant="bordered" radius="md" padding="md">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                    Using AI
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#4f46e5' }}>You: {capabilities.usingAI.score}/100</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Peer Avg: {peerBenchmarks.usingAI}/100</span>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', backgroundColor: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 800 }}>
                      +{capabilities.usingAI.score - peerBenchmarks.usingAI} pts
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', width: '70px' }}>Your Score</span>
                    <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${capabilities.usingAI.score}%`, height: '100%', backgroundColor: '#4f46e5', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', width: '70px' }}>Peer Avg</span>
                    <div style={{ flex: 1, height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${peerBenchmarks.usingAI}%`, height: '100%', backgroundColor: '#a855f7', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                </div>
              </Surface>

              {/* UNDERSTANDING AI */}
              <Surface variant="bordered" radius="md" padding="md">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                    Understanding AI
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#059669' }}>You: {capabilities.understandingAI.score}/100</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Peer Avg: {peerBenchmarks.understandingAI}/100</span>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', backgroundColor: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 800 }}>
                      +{capabilities.understandingAI.score - peerBenchmarks.understandingAI} pts
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', width: '70px' }}>Your Score</span>
                    <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${capabilities.understandingAI.score}%`, height: '100%', backgroundColor: '#059669', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', width: '70px' }}>Peer Avg</span>
                    <div style={{ flex: 1, height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${peerBenchmarks.understandingAI}%`, height: '100%', backgroundColor: '#a855f7', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                </div>
              </Surface>

              {/* SOLVING WITH AI */}
              <Surface variant="bordered" radius="md" padding="md">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                    Solving with AI
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#d97706' }}>You: {capabilities.solvingWithAI.score}/100</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Peer Avg: {peerBenchmarks.solvingWithAI}/100</span>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', backgroundColor: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 800 }}>
                      +{capabilities.solvingWithAI.score - peerBenchmarks.solvingWithAI} pts
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', width: '70px' }}>Your Score</span>
                    <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${capabilities.solvingWithAI.score}%`, height: '100%', backgroundColor: '#d97706', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', width: '70px' }}>Peer Avg</span>
                    <div style={{ flex: 1, height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${peerBenchmarks.solvingWithAI}%`, height: '100%', backgroundColor: '#a855f7', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                </div>
              </Surface>

              {/* CHECKING AI */}
              <Surface variant="bordered" radius="md" padding="md">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                    Checking AI
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#9333ea' }}>You: {capabilities.checkingAI.score}/100</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Peer Avg: {peerBenchmarks.checkingAI}/100</span>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', backgroundColor: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 800 }}>
                      +{capabilities.checkingAI.score - peerBenchmarks.checkingAI} pts
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#9333ea', width: '70px' }}>Your Score</span>
                    <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${capabilities.checkingAI.score}%`, height: '100%', backgroundColor: '#9333ea', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', width: '70px' }}>Peer Avg</span>
                    <div style={{ flex: 1, height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${peerBenchmarks.checkingAI}%`, height: '100%', backgroundColor: '#a855f7', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                </div>
              </Surface>

              {/* ADAPTING TO AI */}
              <Surface variant="bordered" radius="md" padding="md">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                    Adapting to AI
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7' }}>You: {capabilities.adaptingToAI.score}/100</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Peer Avg: {peerBenchmarks.adaptingToAI}/100</span>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', backgroundColor: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 800 }}>
                      +{capabilities.adaptingToAI.score - peerBenchmarks.adaptingToAI} pts
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', width: '70px' }}>Your Score</span>
                    <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${capabilities.adaptingToAI.score}%`, height: '100%', backgroundColor: '#0284c7', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', width: '70px' }}>Peer Avg</span>
                    <div style={{ flex: 1, height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${peerBenchmarks.adaptingToAI}%`, height: '100%', backgroundColor: '#a855f7', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                </div>
              </Surface>

            </div>

          </div>

          {/* QUALITATIVE PEER BENCHMARK SUMMARY CARDS */}
          <Surface variant="bordered" radius="lg" padding="lg">
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', fontFamily: "'Fredoka', sans-serif" }}>
              Key Peer Comparison Insights
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#4f46e5' }}>Checking AI ({capabilities.checkingAI.score}/100 vs Peer Avg {peerBenchmarks.checkingAI}/100): </strong>
                Your responses place you in the upper tier ({capabilities.checkingAI.score - peerBenchmarks.checkingAI > 0 ? `+${capabilities.checkingAI.score - peerBenchmarks.checkingAI}` : capabilities.checkingAI.score - peerBenchmarks.checkingAI} points) for output verification compared to baseline peers.
              </div>

              <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#0284c7' }}>Solving with AI ({capabilities.solvingWithAI.score}/100 vs Peer Avg {peerBenchmarks.solvingWithAI}/100): </strong>
                Your profile indicates your performance ({capabilities.solvingWithAI.score - peerBenchmarks.solvingWithAI > 0 ? `+${capabilities.solvingWithAI.score - peerBenchmarks.solvingWithAI}` : capabilities.solvingWithAI.score - peerBenchmarks.solvingWithAI} points vs average) in multi-step AI workflow design.
              </div>
            </div>
          </Surface>

        </div>
      )}

      {activeSubTab === 'overall' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* COHORT HEADER METRICS */}
          <Surface variant="bordered" radius="lg" padding="lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', fontFamily: "'Fredoka', sans-serif" }}>
                  Cohort Capability Overview
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Aggregated, privacy-scoped statistics across all AIIMS diagnostic assessments ({cohortStats.totalParticipants} participants).
                </p>
              </div>

              <Badge variant="cyan" icon={<Globe size={12} />}>
                Active Cohort Sample: {cohortStats.totalParticipants}
              </Badge>
            </div>

            {/* STAT KPI CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Cohort Average Score
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', fontFamily: "'Fredoka', sans-serif" }}>
                  {cohortStats.cohortAverage} <span style={{ fontSize: '14px', color: '#94a3b8' }}>/ 100</span>
                </div>
                <div style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 700, marginTop: '4px' }}>
                  Your Score: {overallScore} / 100 (+{overallScore - cohortStats.cohortAverage})
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Your Cohort Percentile
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#15803d', fontFamily: "'Fredoka', sans-serif" }}>
                  {cohortStats.userPercentile}th <span style={{ fontSize: '14px', color: '#166534' }}>Percentile</span>
                </div>
                <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 700, marginTop: '4px' }}>
                  Top 32% across all assessment takers
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#f5f3ff', borderRadius: '12px', border: '1px solid #ddd6fe', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Top Cohort Strength
                </div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#5b21b6', fontFamily: "'Fredoka', sans-serif", margin: '6px 0' }}>
                  Evaluation Scrutiny
                </div>
                <div style={{ fontSize: '12px', color: '#6d28d9', fontWeight: 700 }}>
                  Cohort Average: 75/100
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Common Cohort Gap
                </div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#b45309', fontFamily: "'Fredoka', sans-serif", margin: '6px 0' }}>
                  Workflow Design
                </div>
                <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 700 }}>
                  Cohort Opportunity Area
                </div>
              </div>

            </div>
          </Surface>

          {/* DETAILED COHORT SCORE DISTRIBUTION BY DIMENSION */}
          <Surface variant="bordered" radius="lg" padding="lg">
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', fontFamily: "'Fredoka', sans-serif" }}>
              Cohort Score Distribution & Distribution Range
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>
              Showing how your scores compare to the minimum, median cohort average, and maximum observed scores across {cohortStats.totalParticipants} assessments:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {cohortStats.dimensions.map((dim, idx) => (
                <div key={idx} style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                      {dim.name}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#4f46e5' }}>
                      Your Score: {dim.userScore}/100 <span style={{ color: '#64748b', fontWeight: 500 }}>({dim.percentile}th Percentile)</span>
                    </div>
                  </div>

                  {/* VISUAL DISTRIBUTION BAR */}
                  <div style={{ position: 'relative', margin: '14px 0 8px', height: '12px', backgroundColor: '#e2e8f0', borderRadius: '6px' }}>
                    {/* Cohort range fill */}
                    <div style={{
                      position: 'absolute',
                      left: `${dim.min}%`,
                      width: `${dim.max - dim.min}%`,
                      height: '100%',
                      backgroundColor: '#cbd5e1',
                      borderRadius: '6px'
                    }}></div>

                    {/* Peer average marker */}
                    <div style={{
                      position: 'absolute',
                      left: `${dim.peerAvg}%`,
                      top: '-4px',
                      width: '3px',
                      height: '20px',
                      backgroundColor: '#7c3aed',
                      borderRadius: '2px',
                      zIndex: 2
                    }} title={`Cohort Average: ${dim.peerAvg}`}></div>

                    {/* User score pin */}
                    <div style={{
                      position: 'absolute',
                      left: `${dim.userScore}%`,
                      top: '-6px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#4f46e5',
                      border: '3px solid #ffffff',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                      transform: 'translateX(-50%)',
                      zIndex: 3
                    }} title={`Your Score: ${dim.userScore}`}></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '6px' }}>
                    <span>Cohort Min: {dim.min}</span>
                    <span style={{ color: '#7c3aed', fontWeight: 800 }}>Cohort Avg: {dim.peerAvg}/100</span>
                    <span>Cohort High: {dim.max}</span>
                  </div>
                </div>
              ))}
            </div>
          </Surface>

        </div>
      )}

    </div>
  );
};

