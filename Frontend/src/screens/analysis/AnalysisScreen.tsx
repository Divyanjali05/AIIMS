import React, { useState, useEffect } from 'react';
import { useLearner } from '../../context/LearnerContext';
import { apiClient } from '../../api/client';
import {
  BarChart3,
  Users,
  Globe,
  TrendingUp,
  AlertTriangle,
  Lock,
  ArrowRight,
  FileText,
  Wallet,
  Sparkles,
  Award,
  CheckCircle2,
  Target,
  ShieldCheck
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { PageHeader } from '../../components/common/PageHeader';
import { MentorMessage } from '../../components/common/MentorMessage';
import { Badge } from '../../components/common/Badge';
import { RadarChart } from '../../components/charts/RadarChart';
import { DimensionScore } from '../../types';
import {
  evaluateAssessment,
  CAPABILITY_DESCRIPTIONS,
  CapabilityKey,
  AssessmentEvaluationResult
} from '../../services/assessmentScoring';

interface AnalysisScreenProps {
  setActiveTab?: (tab: string) => void;
}

export const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ setActiveTab }) => {
  const { state, viewAnalysis, selectClarityArea } = useLearner();
  const [activeSubTab, setActiveSubTab] = useState<'me' | 'compare' | 'overall'>('me');

  const [peerData, setPeerData] = useState<{
    available: boolean;
    totalComparableRecords: number;
    minRequiredRecords: number;
    message?: string;
    benchmarks?: { usingAI: number; understandingAI: number; solvingWithAI: number; checkingAI: number; adaptingToAI: number };
    peerOverallAverage?: number;
    userPercentile?: number;
  }>({ available: false, totalComparableRecords: 0, minRequiredRecords: 30 });

  const isCompleted = state.assessment.status === 'completed';

  useEffect(() => {
    if (isCompleted) {
      viewAnalysis();
      apiClient.getPeerBenchmarks()
        .then((res) => {
          if (res) setPeerData(res);
        })
        .catch((err) => console.warn('Peer benchmarks notice:', err));
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
            Complete your baseline assessment first. Your diagnostic responses will give AINOVA the evidence needed to construct your personal capability profile.
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

  // Evaluate assessment responses using authoritative result or fallback engine
  const userAnswers = state.assessment.answers || {};
  const evaluationResult: AssessmentEvaluationResult = state.assessment.evaluationResult || evaluateAssessment(userAnswers);
  const {
    overallScore,
    overallConfidence,
    overallEvidenceCoverage,
    assessmentStatus,
    scoringVersion,
    evaluatedAt,
    capabilities,
    strongestSkill,
    roomToGrow
  } = evaluationResult;

  const activePeerBenchmarks = peerData.benchmarks || {
    usingAI: 0,
    understandingAI: 0,
    solvingWithAI: 0,
    checkingAI: 0,
    adaptingToAI: 0
  };

  const radarScores: DimensionScore[] = [
    { dimension: 'Using AI', score: capabilities.usingAI.score, benchmark: activePeerBenchmarks.usingAI },
    { dimension: 'Understanding AI', score: capabilities.understandingAI.score, benchmark: activePeerBenchmarks.understandingAI },
    { dimension: 'Solving with AI', score: capabilities.solvingWithAI.score, benchmark: activePeerBenchmarks.solvingWithAI },
    { dimension: 'Checking AI', score: capabilities.checkingAI.score, benchmark: activePeerBenchmarks.checkingAI },
    { dimension: 'Adapting to AI', score: capabilities.adaptingToAI.score, benchmark: activePeerBenchmarks.adaptingToAI }
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
        description="Evidence-backed AI Capability Profile and Anthropic Diagnostic Evaluation."
        badge={{ label: `Engine ${scoringVersion || '3.0.0-evidence-based'}`, variant: 'primary', icon: <ShieldCheck size={12} /> }}
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
                Overall AI Capability Score
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
        </Button>

        <Button
          variant={activeSubTab === 'compare' ? 'secondary' : 'outline'}
          size="md"
          icon={<Users size={16} />}
          onClick={() => setActiveSubTab('compare')}
        >
          <span>Peer Benchmarks</span>
          <span style={{
            marginLeft: '8px',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 800,
            backgroundColor: activeSubTab === 'compare' ? 'rgba(255, 255, 255, 0.25)' : '#f3e8ff',
            color: activeSubTab === 'compare' ? '#ffffff' : '#6b21a8'
          }}>
            {peerData.available ? `Peer Avg: ${peerData.peerOverallAverage}/100` : 'Pending Data'}
          </span>
        </Button>

        <Button
          variant={activeSubTab === 'overall' ? 'secondary' : 'outline'}
          size="md"
          icon={<Globe size={16} />}
          onClick={() => setActiveSubTab('overall')}
        >
          <span>Cohort Overview</span>
          <span style={{
            marginLeft: '8px',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 800,
            backgroundColor: activeSubTab === 'overall' ? 'rgba(255, 255, 255, 0.25)' : '#e0e7ff',
            color: activeSubTab === 'overall' ? '#ffffff' : '#0369a1'
          }}>
            {peerData.available ? `${peerData.userPercentile}th Percentile` : 'Cohort Stats'}
          </span>
        </Button>
      </div>

      {activeSubTab === 'me' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

          {/* EVIDENCE-BASED SUMMARY BANNER */}
          <Surface variant="highlight" radius="lg" padding="md" style={{ borderLeft: '5px solid #6366f1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Sparkles size={24} color="#4f46e5" />
                <div>
                  <h3 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 800, color: '#3730a3' }}>
                    Diagnostic Profile Summary (Scoring Version {scoringVersion || '3.0.0-evidence-based'})
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#4338ca', lineHeight: 1.4 }}>
                    Your assessment demonstrates verified evidence of strength in <strong>{topCapability}</strong> ({capabilities[strongestSkill.key].score}/100), with a key opportunity in <strong>{growthArea}</strong> ({capabilities[roomToGrow.key].score}/100).
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge variant={assessmentStatus === 'complete' ? 'success' : 'warning'} icon={<CheckCircle2 size={12} />}>
                  {assessmentStatus === 'complete' ? 'Evaluation Complete' : 'Provisional Preview'}
                </Badge>
                <div style={{ padding: '6px 12px', backgroundColor: '#e0e7ff', borderRadius: '10px', fontSize: '12px', fontWeight: 800, color: '#3730a3' }}>
                  Coverage: {Math.round((overallEvidenceCoverage || 1) * 100)}% • Confidence: {Math.round((overallConfidence || 0.9) * 100)}%
                </div>
              </div>
            </div>
          </Surface>

          {/* SECTION 1: CORE CAPABILITY DIMENSIONS WITH EVIDENCE & GAPS */}
          <Surface variant="bordered" radius="lg" padding="lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px', fontFamily: "'Fredoka', sans-serif" }}>
                  Five AI Capability Dimensions
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Evaluated strictly against demonstrated diagnostic evidence:
                </p>
              </div>
              <Badge variant="primary">Overall Score: {overallScore}/100</Badge>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>

              {/* 1. USING AI */}
              <Surface variant="bordered" radius="md" padding="md" style={{ borderTop: '4px solid #4f46e5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase' }}>USING AI</span>
                  <Badge variant="outline" size="sm">Coverage: {Math.round((capabilities.usingAI.evidenceCoverage || 1) * 100)}%</Badge>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0', fontFamily: "'Fredoka', sans-serif" }}>
                  {capabilities.usingAI.score} <span style={{ fontSize: '13px', color: '#94a3b8' }}>/ 100</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', margin: '6px 0 8px', overflow: 'hidden' }}>
                  <div style={{ width: `${capabilities.usingAI.score}%`, height: '100%', backgroundColor: '#4f46e5', borderRadius: '3px' }}></div>
                </div>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  {CAPABILITY_DESCRIPTIONS.usingAI}
                </p>
                {capabilities.usingAI.demonstratedStrengths && capabilities.usingAI.demonstratedStrengths.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#15803d', marginTop: '6px' }}>
                    <strong>Strengths:</strong>
                    <ul style={{ margin: '2px 0 0 14px', padding: 0 }}>
                      {capabilities.usingAI.demonstratedStrengths.slice(0, 2).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
              </Surface>

              {/* 2. UNDERSTANDING AI */}
              <Surface variant="bordered" radius="md" padding="md" style={{ borderTop: '4px solid #059669' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>UNDERSTANDING AI</span>
                  <Badge variant="outline" size="sm">Coverage: {Math.round((capabilities.understandingAI.evidenceCoverage || 1) * 100)}%</Badge>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0', fontFamily: "'Fredoka', sans-serif" }}>
                  {capabilities.understandingAI.score} <span style={{ fontSize: '13px', color: '#94a3b8' }}>/ 100</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', margin: '6px 0 8px', overflow: 'hidden' }}>
                  <div style={{ width: `${capabilities.understandingAI.score}%`, height: '100%', backgroundColor: '#059669', borderRadius: '3px' }}></div>
                </div>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  {CAPABILITY_DESCRIPTIONS.understandingAI}
                </p>
                {capabilities.understandingAI.demonstratedStrengths && capabilities.understandingAI.demonstratedStrengths.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#15803d', marginTop: '6px' }}>
                    <strong>Strengths:</strong>
                    <ul style={{ margin: '2px 0 0 14px', padding: 0 }}>
                      {capabilities.understandingAI.demonstratedStrengths.slice(0, 2).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
              </Surface>

              {/* 3. SOLVING WITH AI */}
              <Surface variant="bordered" radius="md" padding="md" style={{ borderTop: '4px solid #d97706' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>SOLVING WITH AI</span>
                  <Badge variant="outline" size="sm">Coverage: {Math.round((capabilities.solvingWithAI.evidenceCoverage || 1) * 100)}%</Badge>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0', fontFamily: "'Fredoka', sans-serif" }}>
                  {capabilities.solvingWithAI.score} <span style={{ fontSize: '13px', color: '#94a3b8' }}>/ 100</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', margin: '6px 0 8px', overflow: 'hidden' }}>
                  <div style={{ width: `${capabilities.solvingWithAI.score}%`, height: '100%', backgroundColor: '#d97706', borderRadius: '3px' }}></div>
                </div>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  {CAPABILITY_DESCRIPTIONS.solvingWithAI}
                </p>
                {capabilities.solvingWithAI.identifiedGaps && capabilities.solvingWithAI.identifiedGaps.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#b45309', marginTop: '6px' }}>
                    <strong>Gaps / Growth Areas:</strong>
                    <ul style={{ margin: '2px 0 0 14px', padding: 0 }}>
                      {capabilities.solvingWithAI.identifiedGaps.slice(0, 2).map((g, i) => <li key={i}>{g}</li>)}
                    </ul>
                  </div>
                )}
              </Surface>

              {/* 4. CHECKING AI */}
              <Surface variant="bordered" radius="md" padding="md" style={{ borderTop: '4px solid #9333ea' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#9333ea', textTransform: 'uppercase' }}>CHECKING AI</span>
                  <Badge variant="outline" size="sm">Coverage: {Math.round((capabilities.checkingAI.evidenceCoverage || 1) * 100)}%</Badge>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0', fontFamily: "'Fredoka', sans-serif" }}>
                  {capabilities.checkingAI.score} <span style={{ fontSize: '13px', color: '#94a3b8' }}>/ 100</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', margin: '6px 0 8px', overflow: 'hidden' }}>
                  <div style={{ width: `${capabilities.checkingAI.score}%`, height: '100%', backgroundColor: '#9333ea', borderRadius: '3px' }}></div>
                </div>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  {CAPABILITY_DESCRIPTIONS.checkingAI}
                </p>
                {capabilities.checkingAI.demonstratedStrengths && capabilities.checkingAI.demonstratedStrengths.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#15803d', marginTop: '6px' }}>
                    <strong>Strengths:</strong>
                    <ul style={{ margin: '2px 0 0 14px', padding: 0 }}>
                      {capabilities.checkingAI.demonstratedStrengths.slice(0, 2).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
              </Surface>

              {/* 5. ADAPTING TO AI */}
              <Surface variant="bordered" radius="md" padding="md" style={{ borderTop: '4px solid #0284c7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>ADAPTING TO AI</span>
                  <Badge variant="outline" size="sm">Coverage: {Math.round((capabilities.adaptingToAI.evidenceCoverage || 1) * 100)}%</Badge>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0284c7', margin: '4px 0', fontFamily: "'Fredoka', sans-serif" }}>
                  {capabilities.adaptingToAI.score} <span style={{ fontSize: '13px', color: '#94a3b8' }}>/ 100</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', margin: '6px 0 8px', overflow: 'hidden' }}>
                  <div style={{ width: `${capabilities.adaptingToAI.score}%`, height: '100%', backgroundColor: '#0284c7', borderRadius: '3px' }}></div>
                </div>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  {CAPABILITY_DESCRIPTIONS.adaptingToAI}
                </p>
                {capabilities.adaptingToAI.demonstratedStrengths && capabilities.adaptingToAI.demonstratedStrengths.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#15803d', marginTop: '6px' }}>
                    <strong>Strengths:</strong>
                    <ul style={{ margin: '2px 0 0 14px', padding: 0 }}>
                      {capabilities.adaptingToAI.demonstratedStrengths.slice(0, 2).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
              </Surface>

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
                Your highest actual capability score supported by verified diagnostic evidence.
              </p>

              <div style={{ padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #a7f3d0', fontSize: '12px', color: '#064e3b' }}>
                <strong>Verified Evidence: </strong> Strong accuracy and reasoning across contributing questions.
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
                Explore AI Wallet to discover workflow automation tools mapped to your growth areas.
              </p>
            </Surface>
          </div>

          {/* SECTION 4: YOUR NEXT OPPORTUNITY */}
          <Surface variant="highlight" radius="lg" padding="lg" style={{ border: '2px solid #6366f1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  YOUR RECOMMENDED ACTION
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '4px 0 6px', fontFamily: "'Fredoka', sans-serif" }}>
                  Connect {growthArea} to your AI Toolkit
                </h2>
                <p style={{ fontSize: '13px', color: '#475569', margin: 0, maxWidth: '650px', lineHeight: 1.5 }}>
                  Your assessment indicates a key opportunity in {growthArea}. Discover and evaluate tools in AI Wallet specifically suited for workflow automation.
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
            message={`"Your overall score of ${overallScore}/100 is supported by evidence in ${topCapability} (score ${capabilities[strongestSkill.key].score}/100). Focus your next learning steps on ${growthArea} (score ${capabilities[roomToGrow.key].score}/100) using evaluated tools in AI Wallet."`}
          />

        </div>
      )}

      {activeSubTab === 'compare' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {!peerData.available ? (
            <Surface variant="bordered" radius="lg" padding="lg" style={{ textAlign: 'center', backgroundColor: '#f8fafc' }}>
              <AlertTriangle size={36} color="#d97706" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: "'Fredoka', sans-serif" }}>
                Peer Benchmarks Not Available Yet
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '540px', margin: '0 auto 16px', lineHeight: 1.5 }}>
                {peerData.message || 'Peer benchmarks are not available yet. They will appear when enough comparable assessments have been completed.'}
              </p>
              <Badge variant="warning">
                Completed Assessments: {peerData.totalComparableRecords} / {peerData.minRequiredRecords} required
              </Badge>
            </Surface>
          ) : (
            <>
              {/* COMPARISON OVERVIEW HEADER */}
              <Surface variant="bordered" radius="lg" padding="lg">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', fontFamily: "'Fredoka', sans-serif" }}>
                      Peer Benchmark Comparison
                    </h2>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                      Comparing your profile dimension scores with actual completed peer assessments ({peerData.totalComparableRecords} records).
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ padding: '10px 16px', backgroundColor: '#e0e7ff', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#3730a3', textTransform: 'uppercase' }}>Your Score</div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: '#4f46e5', fontFamily: "'Fredoka', sans-serif" }}>{overallScore} / 100</div>
                    </div>

                    <div style={{ padding: '10px 16px', backgroundColor: '#f3e8ff', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#6b21a8', textTransform: 'uppercase' }}>Peer Average</div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: '#7c3aed', fontFamily: "'Fredoka', sans-serif" }}>{peerData.peerOverallAverage} / 100</div>
                    </div>
                  </div>
                </div>
              </Surface>

              {/* VISUAL RADAR & DETAILED DIMENSION SCORE COMPARISON */}
              <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
                <Surface variant="bordered" radius="lg" padding="lg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', textAlign: 'center', fontFamily: "'Fredoka', sans-serif" }}>
                    Score Overlay vs Peers
                  </h3>
                  <RadarChart scores={radarScores} size={280} />
                </Surface>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {(['usingAI', 'understandingAI', 'solvingWithAI', 'checkingAI', 'adaptingToAI'] as CapabilityKey[]).map((key) => {
                    const uScore = capabilities[key].score;
                    const pScore = activePeerBenchmarks[key] || 0;
                    const diff = uScore - pScore;
                    return (
                      <Surface key={key} variant="bordered" radius="md" padding="md">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                            {capabilities[key].capabilityName}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#4f46e5' }}>You: {uScore}/100</span>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Peer Avg: {pScore}/100</span>
                            <span style={{ padding: '2px 8px', borderRadius: '6px', backgroundColor: diff >= 0 ? '#dcfce7' : '#fef3c7', color: diff >= 0 ? '#15803d' : '#b45309', fontSize: '11px', fontWeight: 800 }}>
                              {diff >= 0 ? `+${diff}` : diff} pts
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', width: '70px' }}>Your Score</span>
                            <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${uScore}%`, height: '100%', backgroundColor: '#4f46e5', borderRadius: '4px' }}></div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', width: '70px' }}>Peer Avg</span>
                            <div style={{ flex: 1, height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${pScore}%`, height: '100%', backgroundColor: '#a855f7', borderRadius: '4px' }}></div>
                            </div>
                          </div>
                        </div>
                      </Surface>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeSubTab === 'overall' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {!peerData.available ? (
            <Surface variant="bordered" radius="lg" padding="lg" style={{ textAlign: 'center', backgroundColor: '#f8fafc' }}>
              <AlertTriangle size={36} color="#d97706" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: "'Fredoka', sans-serif" }}>
                Cohort Overview Not Available Yet
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '540px', margin: '0 auto 16px', lineHeight: 1.5 }}>
                {peerData.message || 'Peer benchmarks are not available yet. They will appear when enough comparable assessments have been completed.'}
              </p>
              <Badge variant="warning">
                Completed Assessments: {peerData.totalComparableRecords} / {peerData.minRequiredRecords} required
              </Badge>
            </Surface>
          ) : (
            <Surface variant="bordered" radius="lg" padding="lg">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', fontFamily: "'Fredoka', sans-serif" }}>
                    Cohort Capability Overview
                  </h2>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                    Aggregated statistics across {peerData.totalComparableRecords} completed assessments.
                  </p>
                </div>
                <Badge variant="cyan" icon={<Globe size={12} />}>
                  Cohort Sample: {peerData.totalComparableRecords}
                </Badge>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Cohort Average Score
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', fontFamily: "'Fredoka', sans-serif" }}>
                    {peerData.peerOverallAverage} <span style={{ fontSize: '14px', color: '#94a3b8' }}>/ 100</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 700, marginTop: '4px' }}>
                    Your Score: {overallScore} / 100 ({overallScore - (peerData.peerOverallAverage || 0) >= 0 ? `+${overallScore - (peerData.peerOverallAverage || 0)}` : overallScore - (peerData.peerOverallAverage || 0)})
                  </div>
                </div>

                <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Your Cohort Percentile
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#15803d', fontFamily: "'Fredoka', sans-serif" }}>
                    {peerData.userPercentile}th <span style={{ fontSize: '14px', color: '#166534' }}>Percentile</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#15803d', fontWeight 700, marginTop: '4px' }}>
                    Calculated from actual comparison distribution
                  </div>
                </div>
              </div>
            </Surface>
          )}
        </div>
      )}

    </div>
  );
};
