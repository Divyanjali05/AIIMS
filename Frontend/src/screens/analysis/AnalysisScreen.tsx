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
  ShieldCheck,
  Brain,
  Compass,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { PageHeader } from '../../components/common/PageHeader';
import { MentorMessage } from '../../components/common/MentorMessage';
import { Badge } from '../../components/common/Badge';
import { RadarChart } from '../../components/charts/RadarChart';
import {
  DimensionScore,
  PersistentAILearnerProfile,
  PeerBranchComparisonResult,
  CohortAllComparisonResult,
} from '../../types';
import {
  evaluateAssessment,
  CAPABILITY_DESCRIPTIONS,
  CapabilityKey,
  AssessmentEvaluationResult,
} from '../../services/assessmentScoring';

interface AnalysisScreenProps {
  setActiveTab?: (tab: string) => void;
}

export const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ setActiveTab }) => {
  const { state, viewAnalysis, selectClarityArea, generateAIProfile } = useLearner();
  const [activeSubTab, setActiveSubTab] = useState<'me' | 'compare' | 'overall'>('me');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const [peerBranchData, setPeerBranchData] = useState<PeerBranchComparisonResult | null>(null);
  const [cohortAllData, setCohortAllData] = useState<CohortAllComparisonResult | null>(null);

  const [peerData, setPeerData] = useState<{
    available: boolean;
    totalComparableRecords: number;
    minRequiredRecords: number;
    message?: string;
    benchmarks?: {
      usingAI: number;
      understandingAI: number;
      solvingWithAI: number;
      checkingAI: number;
      adaptingToAI: number;
    };
    peerOverallAverage?: number;
    userPercentile?: number;
  }>({ available: false, totalComparableRecords: 0, minRequiredRecords: 30 });

  const isCompleted = state.assessment.status === 'completed';
  const currentBalance = state.credits.balance;
  const aiProfile: PersistentAILearnerProfile | undefined = state.analysis.aiProfile;

  useEffect(() => {
    if (isCompleted) {
      viewAnalysis();
      apiClient
        .getPeerBenchmarks()
        .then((res) => {
          if (res) setPeerData(res);
        })
        .catch((err) => console.warn('Peer benchmarks notice:', err));

      apiClient
        .getPeerBranchComparison()
        .then((res) => {
          if (res) setPeerBranchData(res);
        })
        .catch((err) => console.warn('Peer branch comparison notice:', err));

      apiClient
        .getCohortAllComparison()
        .then((res) => {
          if (res) setCohortAllData(res);
        })
        .catch((err) => console.warn('Cohort comparison notice:', err));
    }
  }, [isCompleted, viewAnalysis]);

  const handleGenerateProfile = async () => {
    if (isGenerating || currentBalance < 50) return;
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const res = await generateAIProfile();
      if (!res.success) {
        setGenerationError(res.error || 'Failed to generate AI Learner Profile');
      } else {
        setShowConfirmModal(false);
      }
    } catch (err: any) {
      setGenerationError(err?.message || 'Error occurred during generation');
    } finally {
      setIsGenerating(false);
    }
  };

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
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              backgroundColor: '#e0e7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#4f46e5',
            }}
          >
            <Lock size={28} />
          </div>

          <h2
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading, #0f172a)',
              margin: '0 0 8px',
              fontFamily: "'Fredoka', sans-serif",
            }}
          >
            Your AI Profile Report is Waiting
          </h2>

          <p
            style={{
              color: 'var(--aiims-text-secondary, #64748b)',
              fontSize: '14px',
              lineHeight: 1.5,
              margin: '0 0 24px',
            }}
          >
            Complete your baseline assessment first. Your diagnostic responses will give AIIMS the
            evidence needed to construct your personal capability profile.
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
  const evaluationResult: AssessmentEvaluationResult =
    state.assessment.evaluationResult || evaluateAssessment(userAnswers);
  const {
    overallScore,
    overallConfidence,
    overallEvidenceCoverage,
    assessmentStatus,
    scoringVersion,
    capabilities,
    strongestSkill,
    roomToGrow,
  } = evaluationResult;

  const activePeerBenchmarks = peerData.benchmarks || {
    usingAI: 0,
    understandingAI: 0,
    solvingWithAI: 0,
    checkingAI: 0,
    adaptingToAI: 0,
  };

  const radarScores: DimensionScore[] = [
    {
      dimension: 'Using AI',
      score: capabilities.usingAI.score,
      benchmark: activePeerBenchmarks.usingAI,
    },
    {
      dimension: 'Understanding AI',
      score: capabilities.understandingAI.score,
      benchmark: activePeerBenchmarks.understandingAI,
    },
    {
      dimension: 'Solving with AI',
      score: capabilities.solvingWithAI.score,
      benchmark: activePeerBenchmarks.solvingWithAI,
    },
    {
      dimension: 'Checking AI',
      score: capabilities.checkingAI.score,
      benchmark: activePeerBenchmarks.checkingAI,
    },
    {
      dimension: 'Adapting to AI',
      score: capabilities.adaptingToAI.score,
      benchmark: activePeerBenchmarks.adaptingToAI,
    },
  ];

  const topCapability = strongestSkill.name;
  const growthArea = roomToGrow.name;
  const activeFocus = state.focus.selectedTrack || 'AI Workflow Design';
  const userToolsCount = state.aiWallet?.userTools?.length || 0;

  return (
    <div
      style={{
        maxWidth: '1000px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
      }}
    >
      {/* EDITORIAL REPORT HEADER WITH OVERALL SCORE */}
      <PageHeader
        icon={<FileText size={24} />}
        title="MY AI PROFILE"
        description="Evidence-backed AI Capability Profile and Anthropic Diagnostic Evaluation."
        badge={{
          label: `Engine ${scoringVersion || '3.0.0-evidence-based'}`,
          variant: 'primary',
          icon: <ShieldCheck size={12} />,
        }}
        action={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: 'var(--aiims-card-violet-bg)',
              border: '1.5px solid var(--aiims-card-violet-border)',
              borderRadius: '16px',
              padding: '10px 18px',
              boxShadow: 'var(--aiims-shadow-card)',
            }}
          >
            <Award size={24} color="var(--aiims-primary)" />
            <div>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: 'var(--aiims-card-violet-text)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                }}
              >
                Overall AI Capability Score
              </div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 900,
                  color: 'var(--aiims-text-heading)',
                  fontFamily: "'Fredoka', sans-serif",
                  lineHeight: 1.1,
                }}
              >
                {overallScore}{' '}
                <span style={{ fontSize: '13px', color: 'var(--aiims-primary)', fontWeight: 700 }}>
                  / 100
                </span>
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
          <span
            style={{
              marginLeft: '8px',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 800,
              backgroundColor:
                activeSubTab === 'me' ? 'rgba(255, 255, 255, 0.25)' : 'var(--aiims-tint-indigo-bg)',
              color: activeSubTab === 'me' ? '#ffffff' : 'var(--aiims-primary)',
            }}
          >
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
          <span
            style={{
              marginLeft: '8px',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 800,
              backgroundColor:
                activeSubTab === 'compare'
                  ? 'rgba(255, 255, 255, 0.25)'
                  : 'var(--aiims-tint-purple-bg)',
              color: activeSubTab === 'compare' ? '#ffffff' : 'var(--aiims-tint-purple-text)',
            }}
          >
            {peerBranchData?.available
              ? `Branch Avg: ${peerBranchData.peerAverage}/100`
              : peerData.available
                ? `Peer Avg: ${peerData.peerOverallAverage}/100`
                : 'k ≥ 5 Guard'}
          </span>
        </Button>

        <Button
          variant={activeSubTab === 'overall' ? 'secondary' : 'outline'}
          size="md"
          icon={<Globe size={16} />}
          onClick={() => setActiveSubTab('overall')}
        >
          <span>Cohort Overview</span>
          <span
            style={{
              marginLeft: '8px',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 800,
              backgroundColor:
                activeSubTab === 'overall'
                  ? 'rgba(255, 255, 255, 0.25)'
                  : 'var(--aiims-tint-indigo-bg)',
              color: activeSubTab === 'overall' ? '#ffffff' : 'var(--aiims-primary)',
            }}
          >
            {cohortAllData?.available
              ? `${cohortAllData.userPercentile}th Percentile`
              : peerData.available
                ? `${peerData.userPercentile}th Percentile`
                : 'k ≥ 5 Guard'}
          </span>
        </Button>
      </div>

      {activeSubTab === 'me' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* EVIDENCE-BASED SUMMARY BANNER */}
          <Surface
            variant="highlight"
            radius="lg"
            padding="md"
            style={{ borderLeft: '5px solid var(--aiims-primary)' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Sparkles size={24} color="var(--aiims-primary)" />
                <div>
                  <h3
                    style={{
                      margin: '0 0 2px',
                      fontSize: '15px',
                      fontWeight: 800,
                      color: 'var(--aiims-text-heading)',
                    }}
                  >
                    Diagnostic Profile Summary (Scoring Version{' '}
                    {scoringVersion || '3.0.0-evidence-based'})
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '13px',
                      color: 'var(--aiims-text-secondary)',
                      lineHeight: 1.4,
                    }}
                  >
                    Your assessment demonstrates verified evidence of strength in{' '}
                    <strong>{topCapability}</strong> ({capabilities[strongestSkill.key].score}/100),
                    with a key opportunity in <strong>{growthArea}</strong> (
                    {capabilities[roomToGrow.key].score}/100).
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge
                  variant={assessmentStatus === 'complete' ? 'success' : 'warning'}
                  icon={<CheckCircle2 size={12} />}
                >
                  {assessmentStatus === 'complete' ? 'Evaluation Complete' : 'Provisional Preview'}
                </Badge>
                <div
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'var(--aiims-tint-indigo-bg)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: 'var(--aiims-primary)',
                  }}
                >
                  Coverage: {Math.round((overallEvidenceCoverage || 1) * 100)}% • Confidence:{' '}
                  {Math.round((overallConfidence || 0.9) * 100)}%
                </div>
              </div>
            </div>
          </Surface>

          {/* AI LEARNER PROFILE SYNTHESIS (PHASE 2) */}
          <Surface variant="bordered" radius="lg" padding="lg">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--aiims-primary, #6366f1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: 800,
                      margin: 0,
                      color: 'var(--aiims-text-heading)',
                    }}
                  >
                    AI Learner Profile Synthesis
                  </h3>
                  <p style={{ fontSize: '12px', margin: 0, color: 'var(--aiims-text-secondary)' }}>
                    Deep qualitative capability synthesis powered by your 25 diagnostic answers.
                  </p>
                </div>
              </div>
              {aiProfile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Badge variant="success">Version {aiProfile.version} · Active</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={
                      isGenerating ? (
                        <Loader2 size={12} className="aiims-spin" />
                      ) : (
                        <RefreshCw size={12} />
                      )
                    }
                    disabled={isGenerating || currentBalance < 50}
                    onClick={() => setShowConfirmModal(true)}
                  >
                    Regenerate (50 AC)
                  </Button>
                </div>
              ) : (
                <Badge variant="primary">Cost: 50 AC</Badge>
              )}
            </div>

            {!aiProfile ? (
              <div
                style={{
                  padding: '24px',
                  backgroundColor: 'var(--aiims-card-sky-bg, #f8fafc)',
                  borderRadius: '14px',
                  border: '1.5px dashed var(--aiims-card-sky-border, #cbd5e1)',
                  textAlign: 'center',
                }}
              >
                <Brain
                  size={40}
                  color="var(--aiims-primary, #6366f1)"
                  style={{ margin: '0 auto 12px' }}
                />
                <h4
                  style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading)',
                    margin: '0 0 6px',
                  }}
                >
                  Unlock Your Persistent AI Learner Profile
                </h4>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--aiims-text-secondary)',
                    maxWidth: '520px',
                    margin: '0 auto 16px',
                    lineHeight: 1.5,
                  }}
                >
                  Generate an AI-synthesized profile of your demonstrated strengths, cognitive blind
                  spots, concrete skill gaps, learning preferences, and recommended AI industry
                  tracks grounded strictly in your assessment evidence.
                </p>

                {currentBalance < 50 && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      marginBottom: '16px',
                    }}
                  >
                    <AlertTriangle size={16} />
                    Insufficient Credits: 50 AC required (Current Balance: {currentBalance} AC)
                  </div>
                )}

                {generationError && (
                  <div
                    style={{
                      padding: '10px 16px',
                      backgroundColor: '#fef2f2',
                      color: '#991b1b',
                      borderRadius: '10px',
                      fontSize: '13px',
                      marginBottom: '16px',
                      textAlign: 'center',
                    }}
                  >
                    {generationError}
                  </div>
                )}

                <div>
                  <Button
                    variant="primary"
                    size="md"
                    icon={
                      isGenerating ? (
                        <Loader2 size={16} className="aiims-spin" />
                      ) : (
                        <Sparkles size={16} />
                      )
                    }
                    disabled={isGenerating || currentBalance < 50}
                    onClick={() => setShowConfirmModal(true)}
                  >
                    {isGenerating
                      ? 'Synthesizing AI Profile...'
                      : 'Generate AI Learner Profile (50 AC)'}
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Executive Summary */}
                <div
                  style={{
                    padding: '16px 20px',
                    backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                    borderRadius: '12px',
                    borderLeft: '4px solid var(--aiims-primary, #6366f1)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: 'var(--aiims-primary)',
                      marginBottom: '4px',
                    }}
                  >
                    Executive Capability Summary
                  </div>
                  <p
                    style={{
                      fontSize: '14px',
                      lineHeight: 1.6,
                      color: 'var(--aiims-text-heading)',
                      margin: 0,
                    }}
                  >
                    {aiProfile.summary}
                  </p>
                </div>

                {/* Grid of Strengths, Weaknesses, Skill Gaps, Priorities */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '16px',
                  }}
                >
                  {/* Demonstrated Strengths */}
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#f0fdf4',
                      borderRadius: '12px',
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#166534',
                        fontWeight: 800,
                        fontSize: '13px',
                        marginBottom: '10px',
                      }}
                    >
                      <CheckCircle2 size={16} />
                      Demonstrated Strengths
                    </div>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: '18px',
                        fontSize: '13px',
                        color: '#14532d',
                        lineHeight: 1.6,
                      }}
                    >
                      {aiProfile.strengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Weaknesses & Blind Spots */}
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#fef2f2',
                      borderRadius: '12px',
                      border: '1px solid #fecaca',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#991b1b',
                        fontWeight: 800,
                        fontSize: '13px',
                        marginBottom: '10px',
                      }}
                    >
                      <AlertTriangle size={16} />
                      Weaknesses & Blind Spots
                    </div>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: '18px',
                        fontSize: '13px',
                        color: '#7f1d1d',
                        lineHeight: 1.6,
                      }}
                    >
                      {aiProfile.weaknesses.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Concrete Skill Gaps */}
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#fffbeb',
                      borderRadius: '12px',
                      border: '1px solid #fde68a',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#92400e',
                        fontWeight: 800,
                        fontSize: '13px',
                        marginBottom: '10px',
                      }}
                    >
                      <Target size={16} />
                      Concrete Skill Gaps
                    </div>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: '18px',
                        fontSize: '13px',
                        color: '#78350f',
                        lineHeight: 1.6,
                      }}
                    >
                      {aiProfile.skillGaps.map((g, idx) => (
                        <li key={idx}>{g}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Priority Improvement Areas */}
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#f5f3ff',
                      borderRadius: '12px',
                      border: '1px solid #ddd6fe',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#5b21b6',
                        fontWeight: 800,
                        fontSize: '13px',
                        marginBottom: '10px',
                      }}
                    >
                      <Compass size={16} />
                      Priority Improvement Areas
                    </div>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: '18px',
                        fontSize: '13px',
                        color: '#4c1d95',
                        lineHeight: 1.6,
                      }}
                    >
                      {aiProfile.improvementAreas.map((area, idx) => (
                        <li key={idx}>{area}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommended Focus & Roles Footer */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                    padding: '14px 18px',
                    backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                    borderRadius: '12px',
                    border: '1px solid var(--aiims-border-card, #e2e8f0)',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: 'var(--aiims-text-secondary)',
                      }}
                    >
                      Recommended Focus Track:{' '}
                    </span>
                    <span
                      style={{ fontSize: '13px', fontWeight: 800, color: 'var(--aiims-primary)' }}
                    >
                      {aiProfile.recommendedFocus}
                    </span>
                    {aiProfile.recommendedRoles && aiProfile.recommendedRoles.length > 0 && (
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--aiims-text-secondary)',
                          marginLeft: '12px',
                        }}
                      >
                        · Recommended Roles: {aiProfile.recommendedRoles.join(', ')}
                      </span>
                    )}
                  </div>

                  <span style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}>
                    Generated: {new Date(aiProfile.generatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </Surface>

          {/* SECTION 1: CORE CAPABILITY DIMENSIONS WITH EVIDENCE & GAPS */}
          <Surface variant="bordered" radius="lg" padding="lg">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading, #0f172a)',
                    margin: '0 0 4px',
                    fontFamily: "'Fredoka', sans-serif",
                  }}
                >
                  Five AI Capability Dimensions
                </h2>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--aiims-text-secondary, #64748b)',
                    margin: 0,
                  }}
                >
                  Evaluated strictly against demonstrated diagnostic evidence:
                </p>
              </div>
              <Badge variant="primary">Overall Score: {overallScore}/100</Badge>
            </div>

            <div
              className="aiims-card-grid"
              style={{
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(var(--aiims-card-min-width-desktop, 260px), 1fr))',
              }}
            >
              {/* 1. USING AI */}
              <Surface
                variant="bordered"
                radius="md"
                padding="md"
                style={{ borderTop: '4px solid #4f46e5' }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#4f46e5',
                      textTransform: 'uppercase',
                    }}
                  >
                    USING AI
                  </span>
                  <Badge variant="outline" size="sm">
                    Coverage: {Math.round((capabilities.usingAI.evidenceCoverage || 1) * 100)}%
                  </Badge>
                </div>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading, #0f172a)',
                    margin: '4px 0',
                    fontFamily: "'Fredoka', sans-serif",
                  }}
                >
                  {capabilities.usingAI.score}{' '}
                  <span style={{ fontSize: '13px', color: 'var(--aiims-text-muted, #94a3b8)' }}>
                    / 100
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: 'var(--aiims-border-card, #e2e8f0)',
                    borderRadius: '3px',
                    margin: '6px 0 8px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${capabilities.usingAI.score}%`,
                      height: '100%',
                      backgroundColor: '#4f46e5',
                      borderRadius: '3px',
                    }}
                  ></div>
                </div>
                <p
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '12px',
                    color: 'var(--aiims-text-secondary, #475569)',
                    lineHeight: 1.4,
                  }}
                >
                  {CAPABILITY_DESCRIPTIONS.usingAI}
                </p>
                {capabilities.usingAI.demonstratedStrengths &&
                  capabilities.usingAI.demonstratedStrengths.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#15803d', marginTop: '6px' }}>
                      <strong>Strengths:</strong>
                      <ul style={{ margin: '2px 0 0 14px', padding: 0 }}>
                        {capabilities.usingAI.demonstratedStrengths.slice(0, 2).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </Surface>

              {/* 2. UNDERSTANDING AI */}
              <Surface
                variant="bordered"
                radius="md"
                padding="md"
                style={{ borderTop: '4px solid #059669' }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#059669',
                      textTransform: 'uppercase',
                    }}
                  >
                    UNDERSTANDING AI
                  </span>
                  <Badge variant="outline" size="sm">
                    Coverage:{' '}
                    {Math.round((capabilities.understandingAI.evidenceCoverage || 1) * 100)}%
                  </Badge>
                </div>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading, #0f172a)',
                    margin: '4px 0',
                    fontFamily: "'Fredoka', sans-serif",
                  }}
                >
                  {capabilities.understandingAI.score}{' '}
                  <span style={{ fontSize: '13px', color: 'var(--aiims-text-muted, #94a3b8)' }}>
                    / 100
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: 'var(--aiims-border-card, #e2e8f0)',
                    borderRadius: '3px',
                    margin: '6px 0 8px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${capabilities.understandingAI.score}%`,
                      height: '100%',
                      backgroundColor: '#059669',
                      borderRadius: '3px',
                    }}
                  ></div>
                </div>
                <p
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '12px',
                    color: 'var(--aiims-text-secondary, #475569)',
                    lineHeight: 1.4,
                  }}
                >
                  {CAPABILITY_DESCRIPTIONS.understandingAI}
                </p>
                {capabilities.understandingAI.demonstratedStrengths &&
                  capabilities.understandingAI.demonstratedStrengths.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#15803d', marginTop: '6px' }}>
                      <strong>Strengths:</strong>
                      <ul style={{ margin: '2px 0 0 14px', padding: 0 }}>
                        {capabilities.understandingAI.demonstratedStrengths
                          .slice(0, 2)
                          .map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                      </ul>
                    </div>
                  )}
              </Surface>

              {/* 3. SOLVING WITH AI */}
              <Surface
                variant="bordered"
                radius="md"
                padding="md"
                style={{ borderTop: '4px solid #d97706' }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#d97706',
                      textTransform: 'uppercase',
                    }}
                  >
                    SOLVING WITH AI
                  </span>
                  <Badge variant="outline" size="sm">
                    Coverage: {Math.round((capabilities.solvingWithAI.evidenceCoverage || 1) * 100)}
                    %
                  </Badge>
                </div>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading, #0f172a)',
                    margin: '4px 0',
                    fontFamily: "'Fredoka', sans-serif",
                  }}
                >
                  {capabilities.solvingWithAI.score}{' '}
                  <span style={{ fontSize: '13px', color: 'var(--aiims-text-muted, #94a3b8)' }}>
                    / 100
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: 'var(--aiims-border-card, #e2e8f0)',
                    borderRadius: '3px',
                    margin: '6px 0 8px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${capabilities.solvingWithAI.score}%`,
                      height: '100%',
                      backgroundColor: '#d97706',
                      borderRadius: '3px',
                    }}
                  ></div>
                </div>
                <p
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '12px',
                    color: 'var(--aiims-text-secondary, #475569)',
                    lineHeight: 1.4,
                  }}
                >
                  {CAPABILITY_DESCRIPTIONS.solvingWithAI}
                </p>
                {capabilities.solvingWithAI.identifiedGaps &&
                  capabilities.solvingWithAI.identifiedGaps.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#b45309', marginTop: '6px' }}>
                      <strong>Gaps / Growth Areas:</strong>
                      <ul style={{ margin: '2px 0 0 14px', padding: 0 }}>
                        {capabilities.solvingWithAI.identifiedGaps.slice(0, 2).map((g, i) => (
                          <li key={i}>{g}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </Surface>

              {/* 4. CHECKING AI */}
              <Surface
                variant="bordered"
                radius="md"
                padding="md"
                style={{ borderTop: '4px solid #9333ea' }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#9333ea',
                      textTransform: 'uppercase',
                    }}
                  >
                    CHECKING AI
                  </span>
                  <Badge variant="outline" size="sm">
                    Coverage: {Math.round((capabilities.checkingAI.evidenceCoverage || 1) * 100)}%
                  </Badge>
                </div>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading, #0f172a)',
                    margin: '4px 0',
                    fontFamily: "'Fredoka', sans-serif",
                  }}
                >
                  {capabilities.checkingAI.score}{' '}
                  <span style={{ fontSize: '13px', color: 'var(--aiims-text-muted, #94a3b8)' }}>
                    / 100
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: 'var(--aiims-border-card, #e2e8f0)',
                    borderRadius: '3px',
                    margin: '6px 0 8px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${capabilities.checkingAI.score}%`,
                      height: '100%',
                      backgroundColor: '#9333ea',
                      borderRadius: '3px',
                    }}
                  ></div>
                </div>
                <p
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '12px',
                    color: 'var(--aiims-text-secondary, #475569)',
                    lineHeight: 1.4,
                  }}
                >
                  {CAPABILITY_DESCRIPTIONS.checkingAI}
                </p>
                {capabilities.checkingAI.demonstratedStrengths &&
                  capabilities.checkingAI.demonstratedStrengths.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#15803d', marginTop: '6px' }}>
                      <strong>Strengths:</strong>
                      <ul style={{ margin: '2px 0 0 14px', padding: 0 }}>
                        {capabilities.checkingAI.demonstratedStrengths.slice(0, 2).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </Surface>

              {/* 5. ADAPTING TO AI */}
              <Surface
                variant="bordered"
                radius="md"
                padding="md"
                style={{ borderTop: '4px solid #0284c7' }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#0284c7',
                      textTransform: 'uppercase',
                    }}
                  >
                    ADAPTING TO AI
                  </span>
                  <Badge variant="outline" size="sm">
                    Coverage: {Math.round((capabilities.adaptingToAI.evidenceCoverage || 1) * 100)}%
                  </Badge>
                </div>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading, #0f172a)',
                    margin: '4px 0',
                    fontFamily: "'Fredoka', sans-serif",
                  }}
                >
                  {capabilities.adaptingToAI.score}{' '}
                  <span style={{ fontSize: '13px', color: 'var(--aiims-text-muted, #94a3b8)' }}>
                    / 100
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: 'var(--aiims-border-card, #e2e8f0)',
                    borderRadius: '3px',
                    margin: '6px 0 8px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${capabilities.adaptingToAI.score}%`,
                      height: '100%',
                      backgroundColor: '#0284c7',
                      borderRadius: '3px',
                    }}
                  ></div>
                </div>
                <p
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '12px',
                    color: 'var(--aiims-text-secondary, #475569)',
                    lineHeight: 1.4,
                  }}
                >
                  {CAPABILITY_DESCRIPTIONS.adaptingToAI}
                </p>
                {capabilities.adaptingToAI.demonstratedStrengths &&
                  capabilities.adaptingToAI.demonstratedStrengths.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#15803d', marginTop: '6px' }}>
                      <strong>Strengths:</strong>
                      <ul style={{ margin: '2px 0 0 14px', padding: 0 }}>
                        {capabilities.adaptingToAI.demonstratedStrengths.slice(0, 2).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </Surface>
            </div>
          </Surface>

          {/* SECTION 2: STRENGTHS & ROOM TO GROW GRID */}
          <div className="aiims-card-grid-2col">
            {/* STRENGTHS */}
            <Surface
              variant="bordered"
              radius="lg"
              padding="lg"
              style={{
                backgroundColor: 'var(--aiims-card-mint-bg, #f0fdf4)',
                border: '1px solid var(--aiims-card-mint-border, #bbf7d0)',
                borderLeft: '6px solid #059669',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}
              >
                <TrendingUp style={{ width: '20px', height: '20px', color: '#059669' }} />
                <h2
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--aiims-card-mint-text, #064e3b)',
                    fontFamily: "'Fredoka', sans-serif",
                  }}
                >
                  STRONGEST SKILL
                </h2>
              </div>

              <h3
                style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#059669' }}
              >
                {strongestSkill.name} (Score: {strongestSkill.score}/100)
              </h3>

              <p
                style={{
                  margin: '0 0 14px',
                  fontSize: '13px',
                  color: 'var(--aiims-text-secondary, #166534)',
                  lineHeight: 1.5,
                }}
              >
                Your highest actual capability score supported by verified diagnostic evidence.
              </p>

              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--aiims-bg-card)',
                  borderRadius: '8px',
                  border: '1px solid var(--aiims-border-card)',
                  fontSize: '12px',
                  color: 'var(--aiims-text-body)',
                  boxShadow: 'var(--aiims-shadow-card)',
                }}
              >
                <strong style={{ color: 'var(--aiims-primary)' }}>Verified Evidence: </strong>{' '}
                Strong accuracy and reasoning across contributing questions.
              </div>
            </Surface>

            {/* ROOM TO GROW */}
            <Surface
              variant="bordered"
              radius="lg"
              padding="lg"
              style={{
                backgroundColor: 'var(--aiims-tint-amber-bg)',
                border: '1px solid var(--aiims-tint-amber-border)',
                borderLeft: '6px solid #d97706',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}
              >
                <AlertTriangle style={{ width: '20px', height: '20px', color: '#d97706' }} />
                <h2
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading)',
                    fontFamily: "'Fredoka', sans-serif",
                  }}
                >
                  ROOM TO GROW
                </h2>
              </div>

              <h3
                style={{
                  margin: '0 0 6px',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--aiims-tint-amber-text)',
                }}
              >
                {roomToGrow.name} (Score: {roomToGrow.score}/100)
              </h3>

              <p
                style={{
                  margin: '0 0 14px',
                  fontSize: '13px',
                  color: 'var(--aiims-text-muted)',
                  lineHeight: 1.5,
                }}
              >
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
          <div className="aiims-card-grid-2col">
            <Surface variant="bordered" radius="lg" padding="lg">
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}
              >
                <Target size={20} color="#4f46e5" />
                <h3
                  style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading, #0f172a)',
                  }}
                >
                  YOUR CURRENT FOCUS
                </h3>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#4338ca', margin: '0 0 8px' }}>
                {activeFocus}
              </p>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--aiims-text-secondary, #64748b)',
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                This focus track guides your AI Radar signals and tool recommendations in AI Wallet.
              </p>
            </Surface>

            <Surface variant="bordered" radius="lg" padding="lg">
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}
              >
                <Wallet size={20} color="#059669" />
                <h3
                  style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading, #0f172a)',
                  }}
                >
                  YOUR TOOLKIT COVERAGE
                </h3>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#047857', margin: '0 0 8px' }}>
                {userToolsCount} Tools in Wallet
              </p>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--aiims-text-secondary, #64748b)',
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                Explore AI Wallet to discover workflow automation tools mapped to your growth areas.
              </p>
            </Surface>
          </div>

          {/* SECTION 4: YOUR NEXT OPPORTUNITY */}
          <Surface
            variant="highlight"
            radius="lg"
            padding="lg"
            style={{ border: '2px solid #6366f1' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#4f46e5',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  YOUR RECOMMENDED ACTION
                </span>
                <h2
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading, #0f172a)',
                    margin: '4px 0 6px',
                    fontFamily: "'Fredoka', sans-serif",
                  }}
                >
                  Connect {growthArea} to your AI Toolkit
                </h2>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--aiims-text-secondary, #475569)',
                    margin: 0,
                    maxWidth: '650px',
                    lineHeight: 1.5,
                  }}
                >
                  Your assessment indicates a key opportunity in {growthArea}. Discover and evaluate
                  tools in AI Wallet specifically suited for workflow automation.
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
          {peerBranchData?.available ? (
            <>
              {/* PEER BRANCH COMPARISON (VIEW A - SAME BRANCH ACROSS COLLEGES) */}
              <Surface variant="bordered" radius="lg" padding="lg">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px',
                      }}
                    >
                      <Badge variant="primary">View A: Peer Comparison</Badge>
                      <Badge variant="success">k ≥ 5 Guard Passed</Badge>
                    </div>
                    <h2
                      style={{
                        fontSize: '22px',
                        fontWeight: 800,
                        color: 'var(--aiims-text-heading, #0f172a)',
                        margin: '0 0 6px',
                        fontFamily: "'Fredoka', sans-serif",
                      }}
                    >
                      {peerBranchData.branchName} · Cross-College Benchmarks
                    </h2>
                    <p
                      style={{
                        fontSize: '13px',
                        color: 'var(--aiims-text-secondary, #64748b)',
                        margin: 0,
                      }}
                    >
                      Comparing your capabilities with {peerBranchData.totalComparableRecords} peers
                      in {peerBranchData.branchName} across{' '}
                      {peerBranchData.distinctCollegesCount || 1} colleges with strict k-anonymity.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div
                      style={{
                        padding: '10px 16px',
                        backgroundColor: 'var(--aiims-card-sky-bg, #e0e7ff)',
                        borderRadius: '12px',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          color: '#3730a3',
                          textTransform: 'uppercase',
                        }}
                      >
                        Your Score
                      </div>
                      <div
                        style={{
                          fontSize: '22px',
                          fontWeight: 900,
                          color: '#4f46e5',
                          fontFamily: "'Fredoka', sans-serif",
                        }}
                      >
                        {peerBranchData.userScore || overallScore} / 100
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '10px 16px',
                        backgroundColor: 'var(--aiims-card-violet-bg, #f3e8ff)',
                        borderRadius: '12px',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          color: '#6b21a8',
                          textTransform: 'uppercase',
                        }}
                      >
                        Branch Average
                      </div>
                      <div
                        style={{
                          fontSize: '22px',
                          fontWeight: 900,
                          color: '#7c3aed',
                          fontFamily: "'Fredoka', sans-serif",
                        }}
                      >
                        {peerBranchData.peerAverage} / 100
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '10px 16px',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '12px',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          color: '#475569',
                          textTransform: 'uppercase',
                        }}
                      >
                        Median / P90
                      </div>
                      <div
                        style={{
                          fontSize: '18px',
                          fontWeight: 900,
                          color: '#334155',
                          fontFamily: "'Fredoka', sans-serif",
                        }}
                      >
                        {peerBranchData.median} / {peerBranchData.p90}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '10px 16px',
                        backgroundColor: '#ecfdf5',
                        borderRadius: '12px',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          color: '#065f46',
                          textTransform: 'uppercase',
                        }}
                      >
                        Branch Percentile
                      </div>
                      <div
                        style={{
                          fontSize: '22px',
                          fontWeight: 900,
                          color: '#059669',
                          fontFamily: "'Fredoka', sans-serif",
                        }}
                      >
                        {peerBranchData.userPercentile}th
                      </div>
                    </div>
                  </div>
                </div>
              </Surface>

              {/* CAPABILITY COMPARISON VS BRANCH PEERS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {(
                  [
                    'usingAI',
                    'understandingAI',
                    'solvingWithAI',
                    'checkingAI',
                    'adaptingToAI',
                  ] as CapabilityKey[]
                ).map((key) => {
                  const uScore = capabilities[key].score;
                  const pScore = peerBranchData.capabilityAverages?.[key] || 0;
                  const diff = uScore - pScore;
                  return (
                    <Surface key={key} variant="bordered" radius="md" padding="md">
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px',
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: '14px',
                            color: 'var(--aiims-text-heading, #0f172a)',
                          }}
                        >
                          {capabilities[key].capabilityName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#4f46e5' }}>
                            You: {uScore}/100
                          </span>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: 'var(--aiims-text-secondary, #64748b)',
                            }}
                          >
                            Branch Peer Avg: {pScore}/100
                          </span>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor:
                                diff >= 0
                                  ? 'var(--aiims-card-mint-bg, #dcfce7)'
                                  : 'var(--aiims-card-amber-bg, #fef3c7)',
                              color: diff >= 0 ? '#15803d' : '#b45309',
                              fontSize: '11px',
                              fontWeight: 800,
                            }}
                          >
                            {diff >= 0 ? `+${diff}` : diff} pts
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#4f46e5',
                              width: '70px',
                            }}
                          >
                            Your Score
                          </span>
                          <div
                            style={{
                              flex: 1,
                              height: '8px',
                              backgroundColor: 'var(--aiims-border-card, #e2e8f0)',
                              borderRadius: '4px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${uScore}%`,
                                height: '100%',
                                backgroundColor: '#4f46e5',
                                borderRadius: '4px',
                              }}
                            ></div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#7c3aed',
                              width: '70px',
                            }}
                          >
                            Branch Avg
                          </span>
                          <div
                            style={{
                              flex: 1,
                              height: '8px',
                              backgroundColor: 'var(--aiims-bg-card-hover, #f1f5f9)',
                              borderRadius: '4px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${pScore}%`,
                                height: '100%',
                                backgroundColor: '#a855f7',
                                borderRadius: '4px',
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </Surface>
                  );
                })}
              </div>
            </>
          ) : (
            /* K-ANONYMITY SUPPRESSION NOTICE OR FALLBACK */
            <Surface
              variant="bordered"
              radius="lg"
              padding="lg"
              style={{
                textAlign: 'center',
                backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
              }}
            >
              <ShieldCheck size={40} color="#6366f1" style={{ margin: '0 auto 12px' }} />
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                <Badge variant="warning">K-Anonymity Privacy Guard (k ≥ 5)</Badge>
              </div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0f172a)',
                  margin: '0 0 8px',
                  fontFamily: "'Fredoka', sans-serif",
                }}
              >
                Branch Comparison Under Privacy Protection
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--aiims-text-secondary, #64748b)',
                  maxWidth: '560px',
                  margin: '0 auto 16px',
                  lineHeight: 1.5,
                }}
              >
                To protect individual learner privacy, peer comparisons for your academic branch (
                <strong>{peerBranchData?.branchName || 'Your Branch'}</strong>) across colleges
                require a minimum cohort of <strong>5 completed diagnostic assessments</strong>. No
                individual or PII data is ever exposed.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <Badge variant="outline">
                  Completed in Branch: {peerBranchData?.totalComparableRecords || 0} / 5 required
                </Badge>
              </div>
            </Surface>
          )}
        </div>
      )}

      {activeSubTab === 'overall' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {cohortAllData?.available ? (
            <>
              {/* COHORT ALL BRANCHES COMPARISON (VIEW B) */}
              <Surface variant="bordered" radius="lg" padding="lg">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                    gap: '16px',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px',
                      }}
                    >
                      <Badge variant="primary">View B: Overall Cohort</Badge>
                      <Badge variant="success">All Branches Normalized</Badge>
                    </div>
                    <h2
                      style={{
                        fontSize: '22px',
                        fontWeight: 800,
                        color: 'var(--aiims-text-heading, #0f172a)',
                        margin: '0 0 6px',
                        fontFamily: "'Fredoka', sans-serif",
                      }}
                    >
                      Platform-Wide Cohort Intelligence
                    </h2>
                    <p
                      style={{
                        fontSize: '13px',
                        color: 'var(--aiims-text-secondary, #64748b)',
                        margin: 0,
                      }}
                    >
                      Aggregated capability intelligence across{' '}
                      {cohortAllData.totalComparableRecords} learners from multiple disciplines
                      under calibrated capability weighting.
                    </p>
                  </div>
                  <Badge variant="cyan" icon={<Globe size={12} />}>
                    Total Cohort: {cohortAllData.totalComparableRecords}
                  </Badge>
                </div>

                <div
                  className="aiims-card-grid"
                  style={{
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(var(--aiims-card-min-width-desktop, 200px), 1fr))',
                    gap: '14px',
                    marginBottom: '20px',
                  }}
                >
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                      borderRadius: '12px',
                      border: '1px solid var(--aiims-border-card, #e2e8f0)',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: 'var(--aiims-text-secondary, #64748b)',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                      }}
                    >
                      Cohort Average
                    </div>
                    <div
                      style={{
                        fontSize: '24px',
                        fontWeight: 900,
                        color: 'var(--aiims-text-heading, #0f172a)',
                        fontFamily: "'Fredoka', sans-serif",
                      }}
                    >
                      {cohortAllData.cohortAverage}{' '}
                      <span style={{ fontSize: '13px', color: 'var(--aiims-text-muted, #94a3b8)' }}>
                        / 100
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#4f46e5',
                        fontWeight: 700,
                        marginTop: '4px',
                      }}
                    >
                      Your Score: {overallScore} / 100
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                      }}
                    >
                      Cohort Median / P90
                    </div>
                    <div
                      style={{
                        fontSize: '22px',
                        fontWeight: 900,
                        color: '#334155',
                        fontFamily: "'Fredoka', sans-serif",
                      }}
                    >
                      {cohortAllData.median} / {cohortAllData.p90}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#64748b',
                        fontWeight: 600,
                        marginTop: '4px',
                      }}
                    >
                      P90 Benchmark Threshold
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--aiims-card-mint-bg, #f0fdf4)',
                      borderRadius: '12px',
                      border: '1px solid var(--aiims-card-mint-border, #bbf7d0)',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: 'var(--aiims-card-mint-text, #166534)',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                      }}
                    >
                      Overall Percentile
                    </div>
                    <div
                      style={{
                        fontSize: '24px',
                        fontWeight: 900,
                        color: '#15803d',
                        fontFamily: "'Fredoka', sans-serif",
                      }}
                    >
                      {cohortAllData.userPercentile}th{' '}
                      <span
                        style={{ fontSize: '13px', color: 'var(--aiims-card-mint-text, #166534)' }}
                      >
                        Percentile
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#15803d',
                        fontWeight: 700,
                        marginTop: '4px',
                      }}
                    >
                      Across All Disciplines
                    </div>
                  </div>
                </div>

                {/* NORMALIZATION DISCLAIMER */}
                <Surface
                  variant="highlight"
                  radius="md"
                  padding="md"
                  style={{
                    borderLeft: '4px solid #0284c7',
                    backgroundColor: '#f0f9ff',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldCheck size={20} color="#0284c7" />
                    <div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 800,
                          color: '#0369a1',
                          textTransform: 'uppercase',
                        }}
                      >
                        Academic Normalization Methodology
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: '#0c4a6e', lineHeight: 1.4 }}>
                        {cohortAllData.normalizationNote ||
                          'Capability scores across differing disciplines are mathematically normalized using standardized z-scores against baseline branch distributions to ensure rigorous, equitable comparison.'}
                      </p>
                    </div>
                  </div>
                </Surface>
              </Surface>
            </>
          ) : (
            /* K-ANONYMITY SUPPRESSION NOTICE */
            <Surface
              variant="bordered"
              radius="lg"
              padding="lg"
              style={{
                textAlign: 'center',
                backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
              }}
            >
              <Globe size={40} color="#6366f1" style={{ margin: '0 auto 12px' }} />
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                <Badge variant="warning">K-Anonymity Privacy Guard (k ≥ 5)</Badge>
              </div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0f172a)',
                  margin: '0 0 8px',
                  fontFamily: "'Fredoka', sans-serif",
                }}
              >
                Cohort Overview Under Privacy Protection
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--aiims-text-secondary, #64748b)',
                  maxWidth: '540px',
                  margin: '0 auto 16px',
                  lineHeight: 1.5,
                }}
              >
                Platform-wide cohort comparisons require at least{' '}
                <strong>5 completed assessments</strong> across academic branches under k-anonymity
                privacy safeguards.
              </p>
              <Badge variant="outline">
                Completed Platform-Wide: {cohortAllData?.totalComparableRecords || 0} / 5 required
              </Badge>
            </Surface>
          )}
        </div>
      )}

      {/* CONFIRMATION MODAL FOR 50 AC AI PROFILE GENERATION */}
      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => !isGenerating && setShowConfirmModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--aiims-bg-card, #ffffff)',
              borderRadius: '20px',
              maxWidth: '500px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--aiims-border-card, #e2e8f0)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--aiims-card-violet-bg, #f3e8ff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7c3aed',
                }}
              >
                <Sparkles size={24} />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading, #0f172a)',
                    fontFamily: "'Fredoka', sans-serif",
                  }}
                >
                  Generate AI Learner Profile
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--aiims-text-secondary, #64748b)' }}>
                  Persistent Qualitative Capability Synthesis
                </span>
              </div>
            </div>

            <p
              style={{
                fontSize: '13px',
                color: 'var(--aiims-text-secondary, #475569)',
                lineHeight: 1.5,
                margin: '0 0 16px',
              }}
            >
              Our Anthropic-powered diagnostic engine will analyze your 25 assessment answers to
              construct your persistent AI Learner Profile with strengths, concrete skill gaps,
              blind spots, and personalized career track recommendations.
            </p>

            <div
              style={{
                backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '16px',
                border: '1px solid var(--aiims-border-card, #e2e8f0)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  marginBottom: '8px',
                }}
              >
                <span style={{ color: 'var(--aiims-text-secondary, #64748b)' }}>
                  Generation Fee:
                </span>
                <span style={{ fontWeight: 800, color: '#b91c1c' }}>-50 AC</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  marginBottom: '8px',
                }}
              >
                <span style={{ color: 'var(--aiims-text-secondary, #64748b)' }}>
                  Current Balance:
                </span>
                <span style={{ fontWeight: 800, color: 'var(--aiims-text-heading, #0f172a)' }}>
                  {currentBalance} AC
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  paddingTop: '8px',
                  borderTop: '1px dashed var(--aiims-border-card, #cbd5e1)',
                }}
              >
                <span style={{ fontWeight: 700, color: 'var(--aiims-text-heading, #0f172a)' }}>
                  Remaining Balance:
                </span>
                <span style={{ fontWeight: 900, color: '#059669' }}>{currentBalance - 50} AC</span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: '#059669',
                backgroundColor: '#ecfdf5',
                padding: '8px 12px',
                borderRadius: '8px',
                marginBottom: '20px',
              }}
            >
              <ShieldCheck size={16} />
              <span>Deduction is atomic and 100% refundable if AI generation fails.</span>
            </div>

            {generationError && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  color: '#991b1b',
                  borderRadius: '10px',
                  fontSize: '12px',
                  marginBottom: '16px',
                }}
              >
                {generationError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button
                variant="outline"
                size="md"
                disabled={isGenerating}
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={isGenerating || currentBalance < 50}
                icon={
                  isGenerating ? (
                    <Loader2 size={16} className="aiims-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )
                }
                onClick={handleGenerateProfile}
              >
                {isGenerating ? 'Synthesizing Profile...' : 'Confirm & Generate (50 AC)'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
