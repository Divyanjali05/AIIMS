import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ASSESSMENT_QUESTIONS,
  STORY_STATIONS,
  QuestionData,
  QuestLevel,
} from '../../data/assessmentQuestions';
import { useLearner } from '../../context/LearnerContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Brain,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Check,
  RotateCcw,
  AlertCircle,
  Award,
  Wallet,
  ListChecks,
  Info,
  Compass,
  ShieldCheck,
  Bookmark,
  Maximize2,
  Minimize2,
  Star,
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Assessment3DVisual } from '../../components/3d/Assessment3DVisual';
import {
  ASSESSMENT_RUBRICS,
  evaluateAssessment,
  CapabilityKey,
} from '../../services/assessmentScoring';

export type AssessmentFlowStage = 'WELCOME' | 'QUESTION' | 'TRANSITION' | 'REVIEW' | 'COMPLETE';

type AnswerValue = string | number | string[];

interface AssessmentScreenProps {
  onComplete: () => void;
  setActiveTab?: (tab: string) => void;
}

const DIMENSION_LABELS: Record<CapabilityKey, { label: string; color: string }> = {
  usingAI: { label: 'AI Exposure & Usage', color: '#6366F1' },
  understandingAI: { label: 'Conceptual AI Fluency', color: '#0284C7' },
  solvingWithAI: { label: 'Systematic Problem Solving', color: '#7C3AED' },
  checkingAI: { label: 'Critical Verification', color: '#D97706' },
  adaptingToAI: { label: 'Adaptive Innovation', color: '#059669' },
};

export const AssessmentScreen: React.FC<AssessmentScreenProps> = ({ onComplete, setActiveTab }) => {
  const {
    state: learnerState,
    saveAssessmentAnswer,
    setQuestionIndex,
    completeAssessment,
  } = useLearner();
  const { isDarkMode } = useTheme();

  const savedAnswers = (learnerState.assessment.answers || {}) as Record<number, AnswerValue>;
  const isAlreadyCompleted = learnerState.assessment.status === 'completed';
  const savedQuestionIdx = learnerState.assessment.currentQuestionIndex || 0;

  // Determine initial stage
  const [stage, setStage] = useState<AssessmentFlowStage>(() => {
    if (isAlreadyCompleted) return 'COMPLETE';
    const answeredCount = Object.keys(savedAnswers).length;
    if (answeredCount > 0) return 'QUESTION';
    return 'WELCOME';
  });

  const [currentQuestionIndex, setCurrentIdx] = useState<number>(savedQuestionIdx); // 0 to 24
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>(savedAnswers);
  const [markedForReview, setMarkedForReview] = useState<number[]>([]);
  const [isImmersiveMode, setIsImmersiveMode] = useState<boolean>(false);
  const [pulseTrigger, setPulseTrigger] = useState<number>(0);
  const [transitionStationId, setTransitionStationId] = useState<number>(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [returnToReview, setReturnToReview] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync answers with learnerState
  useEffect(() => {
    setAnswers((learnerState.assessment.answers || {}) as Record<number, AnswerValue>);
  }, [learnerState.assessment.answers]);

  // Handle escape key to exit immersive mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isImmersiveMode) {
        setIsImmersiveMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImmersiveMode]);

  // Sync question index to context
  const updateCurrentQuestionIndex = (newIdx: number) => {
    setCurrentIdx(newIdx);
    setQuestionIndex(newIdx);
    setValidationError(null);
  };

  const activeQuestion: QuestionData =
    ASSESSMENT_QUESTIONS[currentQuestionIndex] || ASSESSMENT_QUESTIONS[0];
  const activeStation: QuestLevel =
    STORY_STATIONS.find((s) => s.id === activeQuestion.levelId) || STORY_STATIONS[0];
  const currentAnswer = answers[activeQuestion.id];
  const rubricPurpose = ASSESSMENT_RUBRICS[activeQuestion.id]?.purpose;

  // Question validation check
  const isQuestionAnswered = useCallback(
    (q: QuestionData): boolean => {
      const val = answers[q.id];
      if (val === undefined || val === null || val === '') return false;
      if (q.type === 'single_select' || q.type === 'scale') {
        return val !== undefined && val !== null && val !== '';
      }
      if (q.type === 'multi_select') {
        if (!Array.isArray(val)) return false;
        if (q.requiredSelections) {
          return val.length === q.requiredSelections;
        }
        if (q.minSelections) {
          return val.length >= q.minSelections;
        }
        return val.length > 0;
      }
      if (q.type === 'long_text') {
        return typeof val === 'string' && val.trim().length > 0;
      }
      return true;
    },
    [answers]
  );

  const answeredQuestionsCount = ASSESSMENT_QUESTIONS.filter(isQuestionAnswered).length;
  const totalQuestions = ASSESSMENT_QUESTIONS.length;
  const progressPercent = Math.round((answeredQuestionsCount / totalQuestions) * 100);

  // Completed Station IDs
  const completedStationIds = useMemo(() => {
    return STORY_STATIONS.filter((station) => {
      const stationQuestions = ASSESSMENT_QUESTIONS.filter((q) => q.levelId === station.id);
      return stationQuestions.every(isQuestionAnswered);
    }).map((s) => s.id);
  }, [isQuestionAnswered]);

  // Dynamic baseline score evaluation
  const evaluationPreview = useMemo(() => {
    try {
      return evaluateAssessment(answers);
    } catch {
      return null;
    }
  }, [answers]);

  // Answer selection handler
  const handleSelectAnswer = (val: AnswerValue) => {
    setValidationError(null);
    const updated = { ...answers, [activeQuestion.id]: val };
    setAnswers(updated);
    setPulseTrigger((prev) => prev + 1);
    saveAssessmentAnswer(activeQuestion.id, val);
  };

  // Multi-select toggle handler
  const handleMultiSelectToggle = (optId: string) => {
    setValidationError(null);
    const existing: string[] = Array.isArray(answers[activeQuestion.id])
      ? (answers[activeQuestion.id] as string[])
      : [];
    let updatedList: string[];

    if (existing.includes(optId)) {
      updatedList = existing.filter((id) => id !== optId);
    } else {
      const max = activeQuestion.requiredSelections || activeQuestion.maxSelections || 99;
      if (existing.length >= max) {
        setValidationError(`You can select a maximum of ${max} options for this question.`);
        return;
      }
      updatedList = [...existing, optId];
    }
    handleSelectAnswer(updatedList);
  };

  // Toggle mark for review
  const handleToggleMarkReview = (qId: number) => {
    setMarkedForReview((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  // Validate current question before proceeding
  const validateCurrentQuestion = (): boolean => {
    const val = answers[activeQuestion.id];

    if (activeQuestion.type === 'single_select') {
      if (!val) {
        setValidationError('Please select an option before continuing.');
        return false;
      }
    } else if (activeQuestion.type === 'scale') {
      if (typeof val !== 'number' || val < 1 || val > 5) {
        setValidationError('Please select a rating score from 1 to 5 before continuing.');
        return false;
      }
    } else if (activeQuestion.type === 'multi_select') {
      const selectedList: string[] = Array.isArray(val) ? val : [];
      if (activeQuestion.requiredSelections) {
        if (selectedList.length !== activeQuestion.requiredSelections) {
          setValidationError(
            `Please select exactly ${activeQuestion.requiredSelections} options to continue (${selectedList.length}/${activeQuestion.requiredSelections} selected).`
          );
          return false;
        }
      } else if (activeQuestion.minSelections) {
        if (selectedList.length < activeQuestion.minSelections) {
          setValidationError(
            `Please select at least ${activeQuestion.minSelections} option${activeQuestion.minSelections > 1 ? 's' : ''} to continue.`
          );
          return false;
        }
      } else if (selectedList.length === 0) {
        setValidationError('Please select at least 1 option before continuing.');
        return false;
      }
    } else if (activeQuestion.type === 'long_text') {
      if (typeof val !== 'string' || val.trim().length === 0) {
        setValidationError(
          'Your response is empty. Please enter your thoughts or prompt before continuing.'
        );
        return false;
      }
    }

    setValidationError(null);
    return true;
  };

  // Next Question or Transition or Review
  const handleNext = () => {
    if (!validateCurrentQuestion()) return;

    if (returnToReview) {
      setReturnToReview(false);
      setStage('REVIEW');
      return;
    }

    // Interstitial station transition triggers at Q5, Q10, Q15, Q20
    if (
      currentQuestionIndex === 4 ||
      currentQuestionIndex === 9 ||
      currentQuestionIndex === 14 ||
      currentQuestionIndex === 19
    ) {
      const completedStationNum = Math.floor(currentQuestionIndex / 5) + 1;
      setTransitionStationId(completedStationNum);
      setStage('TRANSITION');
      return;
    }

    if (currentQuestionIndex < 24) {
      updateCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setStage('REVIEW');
    }
  };

  const handlePrev = () => {
    setValidationError(null);
    if (returnToReview) {
      setReturnToReview(false);
      setStage('REVIEW');
      return;
    }
    if (currentQuestionIndex > 0) {
      updateCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Final Assessment Submission
  const handleFinalSubmission = async () => {
    if (isSubmitting) return;
    const unAnswered = ASSESSMENT_QUESTIONS.filter((q) => !isQuestionAnswered(q));
    if (unAnswered.length > 0) {
      setValidationError(
        `Please complete all required questions before submitting (${unAnswered.length} remaining).`
      );
      return;
    }
    try {
      setIsSubmitting(true);
      await completeAssessment();
      setStage('COMPLETE');
    } catch (err) {
      console.error('Assessment submission error:', err);
      setValidationError('An error occurred during submission. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Station status helper
  const getStationStatus = (stationId: number) => {
    const stationQuestions = ASSESSMENT_QUESTIONS.filter((q) => q.levelId === stationId);
    const answeredInStation = stationQuestions.filter(isQuestionAnswered).length;
    return {
      answered: answeredInStation,
      total: stationQuestions.length,
      isComplete: answeredInStation === stationQuestions.length,
      isCurrent: activeStation.id === stationId,
    };
  };

  // =========================================================================
  // 1. WELCOME STAGE: 5-STATION DISCOVERY INTRO WITH 3D NEURAL CORE
  // =========================================================================
  if (stage === 'WELCOME') {
    const hasSavedProgress = answeredQuestionsCount > 0;

    return (
      <div
        style={{
          width: '100%',
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <Surface variant="bordered" radius="lg" padding="lg">
          {/* Top Bar Badges */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <Badge variant="purple" icon={<Compass size={14} />}>
              5-STATION AI DISCOVERY JOURNEY
            </Badge>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Badge variant="warning" icon={<Wallet size={14} />}>
                Wallet: {learnerState.credits.balance} AC
              </Badge>
              <Badge variant="cyan" icon={<Sparkles size={14} />}>
                Bounty: +50 Credits
              </Badge>
            </div>
          </div>

          {/* Dual-Column Hero Grid: Left Content / Right 3D Neural Scene */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '32px',
              alignItems: 'center',
            }}
          >
            {/* Left Narrative */}
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--aiims-primary-light, rgba(99, 102, 241, 0.1))',
                  color: 'var(--aiims-primary, #6366f1)',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                }}
              >
                <Brain size={14} />
                COMPREHENSIVE COMPETENCY DIAGNOSTIC
              </div>

              <h1
                style={{
                  fontSize: 'clamp(26px, 3.2vw, 36px)',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0f172a)',
                  margin: '0 0 12px',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  lineHeight: 1.25,
                  letterSpacing: '-0.6px',
                }}
              >
                Discover Your Authentic{' '}
                <span style={{ color: 'var(--aiims-primary, #6366f1)' }}>AI Profile</span>
              </h1>

              <p
                style={{
                  fontSize: '14.5px',
                  color: 'var(--aiims-text-secondary, #475569)',
                  lineHeight: 1.6,
                  margin: '0 0 24px',
                }}
              >
                Complete 25 experiential challenges across 5 calibrated learning stations. Rather
                than a superficial quiz, this diagnostic records evidence of your daily workflow
                habits, prompt framing strategies, verification rigor, and adaptive capability.
              </p>

              {/* 5 Story Stations Quick Preview Strip */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginBottom: '28px',
                }}
              >
                {STORY_STATIONS.map((station) => (
                  <div
                    key={station.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                      border: '1px solid var(--aiims-border-card, #e2e8f0)',
                      borderLeft: `4px solid ${station.themeColor}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '18px' }}>{station.icon}</span>
                      <span
                        style={{
                          fontSize: '13.5px',
                          fontWeight: 700,
                          color: 'var(--aiims-text-heading, #0f172a)',
                        }}
                      >
                        Station 0{station.id}: {station.stationName}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: 'var(--aiims-text-secondary, #64748b)',
                      }}
                    >
                      {station.domainTitle} (5 Challenges)
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  size="lg"
                  icon={<ArrowRight size={18} />}
                  onClick={() => setStage('QUESTION')}
                >
                  {hasSavedProgress
                    ? `Resume Assessment (${answeredQuestionsCount}/25 Done) →`
                    : 'Begin Assessment Expedition →'}
                </Button>

                {hasSavedProgress && (
                  <Button
                    variant="ghost"
                    size="md"
                    icon={<RotateCcw size={15} />}
                    onClick={() => {
                      updateCurrentQuestionIndex(0);
                      setStage('QUESTION');
                    }}
                  >
                    Start From Q1
                  </Button>
                )}
              </div>
            </div>

            {/* Right 3D Neural Core Interactive Scene */}
            <div style={{ height: '440px', minHeight: '400px' }}>
              <Assessment3DVisual
                activeStationId={1}
                stationThemeColor="#6366f1"
                stationName="Workbench"
                domainTitle="Using AI"
                progressPercent={progressPercent}
                answeredCount={answeredQuestionsCount}
                isDarkMode={isDarkMode}
                pulseTrigger={pulseTrigger}
                completedStationIds={completedStationIds}
                height="100%"
              />
            </div>
          </div>
        </Surface>

        {/* 3-Pillar Assessment Highlights Grid to fill & balance layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '18px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--aiims-bg-card, #ffffff)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid var(--aiims-border-card, #e2e8f0)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--aiims-primary-light, rgba(99, 102, 241, 0.12))',
                  color: 'var(--aiims-primary, #6366f1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Compass size={18} />
              </div>
              <div
                style={{
                  fontSize: '14.5px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0f172a)',
                }}
              >
                25 Experiential Challenges
              </div>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: 'var(--aiims-text-secondary, #64748b)',
                lineHeight: 1.55,
              }}
            >
              Realistic work scenarios test prompt engineering precision, edge-case mitigation, and
              real-task synthesis.
            </p>
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '8px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--aiims-primary, #6366f1)',
              }}
            >
              Station-By-Station Narrative
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--aiims-bg-card, #ffffff)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid var(--aiims-border-card, #e2e8f0)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--aiims-card-sky-bg, rgba(14, 165, 233, 0.12))',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={18} />
              </div>
              <div
                style={{
                  fontSize: '14.5px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0f172a)',
                }}
              >
                5 Calibrated Dimensions
              </div>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: 'var(--aiims-text-secondary, #64748b)',
                lineHeight: 1.55,
              }}
            >
              Continuous multi-factor rubric evaluation across Using, Understanding, Solving,
              Checking, and Adapting to pinpoint your authentic AI strengths.
            </p>
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '8px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#0284c7',
              }}
            >
              Multi-Factor Rubric Engine
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--aiims-bg-card, #ffffff)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid var(--aiims-border-card, #e2e8f0)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--aiims-card-mint-bg, rgba(16, 185, 129, 0.12))',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Award size={18} />
              </div>
              <div
                style={{
                  fontSize: '14.5px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0f172a)',
                }}
              >
                Platform Unlocks & Bounty
              </div>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: 'var(--aiims-text-secondary, #64748b)',
                lineHeight: 1.55,
              }}
            >
              Earn +50 AIIMS Credits and +100 XP to immediately unlock the full AIIMS ecosystem,
              including Clarity Labs, AI Radar, and your verified capability radar.
            </p>
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '8px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#059669',
              }}
            >
              +50 AC Bounty · +100 XP Guaranteed
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. SECTION TRANSITION INTERSTITIAL STAGE
  // =========================================================================
  if (stage === 'TRANSITION') {
    const completedStation =
      STORY_STATIONS.find((s) => s.id === transitionStationId) || STORY_STATIONS[0];
    const nextStation =
      STORY_STATIONS.find((s) => s.id === transitionStationId + 1) || STORY_STATIONS[0];

    return (
      <div style={{ width: '100%', maxWidth: '720px', margin: '32px auto', textAlign: 'center' }}>
        <Surface variant="bordered" radius="lg" padding="lg">
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '20px',
              backgroundColor: 'var(--aiims-card-mint-bg, #ecfdf5)',
              color: '#059669',
              border: '1px solid var(--aiims-card-mint-border, #a7f3d0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)',
            }}
          >
            <CheckCircle2 size={34} />
          </div>

          <Badge variant="success" size="sm" style={{ marginBottom: '12px' }}>
            STATION 0{completedStation.id} CLEARED • {completedStation.stationName.toUpperCase()}
          </Badge>

          <h2
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading, #0f172a)',
              margin: '0 0 10px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {completedStation.transitionRecap}
          </h2>

          <p
            style={{
              fontSize: '14px',
              color: 'var(--aiims-text-secondary, #64748b)',
              lineHeight: 1.6,
              margin: '0 0 24px',
              maxWidth: '520px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            {completedStation.transitionTeaser}
          </p>

          {/* Stepper Progress Visualizer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '32px',
              flexWrap: 'wrap',
            }}
          >
            {STORY_STATIONS.map((s) => {
              const isPast = s.id <= completedStation.id;
              const isNext = s.id === nextStation.id;
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      backgroundColor: isPast
                        ? '#059669'
                        : isNext
                          ? s.themeColor
                          : 'var(--aiims-bg-card-hover, #e2e8f0)',
                      color: isPast || isNext ? '#ffffff' : 'var(--aiims-text-muted, #94a3b8)',
                      border: `2px solid ${isPast ? '#059669' : isNext ? s.themeColor : 'var(--aiims-border-card, #e2e8f0)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 800,
                    }}
                  >
                    {isPast ? '✓' : `0${s.id}`}
                  </div>
                  {s.id < 5 && (
                    <div
                      style={{
                        width: '22px',
                        height: '2px',
                        backgroundColor: isPast ? '#059669' : 'var(--aiims-border-card, #e2e8f0)',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <Button
            variant="primary"
            size="lg"
            icon={<ArrowRight size={18} />}
            onClick={() => {
              updateCurrentQuestionIndex(currentQuestionIndex + 1);
              setStage('QUESTION');
            }}
          >
            Enter Station 0{nextStation.id}: {nextStation.stationName} →
          </Button>
        </Surface>
      </div>
    );
  }

  // =========================================================================
  // 3. DEDICATED REVIEW STAGE
  // =========================================================================
  if (stage === 'REVIEW') {
    const unAnsweredQuestions = ASSESSMENT_QUESTIONS.filter((q) => !isQuestionAnswered(q));
    const isAllComplete = unAnsweredQuestions.length === 0;

    return (
      <div
        style={{
          width: '100%',
          maxWidth: '1120px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <Surface variant="bordered" radius="lg" padding="lg">
          {/* Header Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  color: 'var(--aiims-primary, #6366f1)',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  marginBottom: '2px',
                }}
              >
                EXPEDITION SUMMARY & VERIFICATION
              </div>
              <h2
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0f172a)',
                  margin: 0,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                Review Your Assessment Responses
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Badge
                variant={isAllComplete ? 'success' : 'warning'}
                icon={isAllComplete ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              >
                {answeredQuestionsCount} / {totalQuestions} Challenges Answered
              </Badge>
              <Badge variant="cyan" icon={<Sparkles size={14} />}>
                Bounty: +50 AC
              </Badge>
            </div>
          </div>

          <p
            style={{
              color: 'var(--aiims-text-secondary, #64748b)',
              fontSize: '13.5px',
              margin: '0 0 20px 0',
              lineHeight: 1.5,
            }}
          >
            Verify your responses across the five stations before generating your baseline
            capability calibration. Click any challenge to modify your answer.
          </p>

          {/* Validation Notice if any question missing */}
          {!isAllComplete && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--aiims-card-rose-bg, #fff1f2)',
                border: '1px solid var(--aiims-card-rose-border, #fecdd3)',
                borderRadius: '12px',
                color: 'var(--aiims-card-rose-text, #be123c)',
                fontSize: '13px',
                fontWeight: 700,
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>
                  Please complete all 25 challenges before submitting ({unAnsweredQuestions.length}{' '}
                  remaining).
                </span>
              </div>
              {unAnsweredQuestions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const firstUnanswered = unAnsweredQuestions[0];
                    updateCurrentQuestionIndex(firstUnanswered.id - 1);
                    setReturnToReview(true);
                    setStage('QUESTION');
                  }}
                >
                  Answer Challenge {unAnsweredQuestions[0].id} →
                </Button>
              )}
            </div>
          )}

          {/* Explicit Error Feedback Alert */}
          {validationError && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--aiims-card-rose-bg, #fff1f2)',
                border: '1px solid var(--aiims-card-rose-border, #fecdd3)',
                borderRadius: '12px',
                color: 'var(--aiims-card-rose-text, #be123c)',
                fontSize: '13px',
                fontWeight: 700,
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{validationError}</span>
            </div>
          )}

          {/* 5-Station Breakdown List */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}
          >
            {STORY_STATIONS.map((station) => {
              const status = getStationStatus(station.id);

              return (
                <div
                  key={station.id}
                  style={{
                    backgroundColor: 'var(--aiims-bg-card)',
                    borderRadius: 'var(--aiims-card-radius, 14px)',
                    padding: '16px',
                    border: '1px solid var(--aiims-border-card)',
                    borderLeft: `4px solid ${station.themeColor}`,
                    boxShadow: 'var(--aiims-shadow-card)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13.5px',
                        fontWeight: 800,
                        color: 'var(--aiims-text-heading)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>{station.icon}</span>
                      <span>
                        Station 0{station.id}: {station.stationName} — {station.domainTitle}
                      </span>
                    </div>

                    <Badge variant={status.isComplete ? 'success' : 'warning'} size="sm">
                      {status.answered} / {status.total} Completed
                    </Badge>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {station.challengeIds.map((qId) => {
                      const qIdx = qId - 1;
                      const question = ASSESSMENT_QUESTIONS[qIdx];
                      const isAnswered = isQuestionAnswered(question);
                      const isMarked = markedForReview.includes(qId);
                      const val = answers[qId];

                      let answerPreview = 'Not answered yet';
                      if (isAnswered) {
                        if (question.type === 'single_select') {
                          const opt = question.options?.find((o) => o.id === val);
                          answerPreview = opt ? opt.label : String(val);
                        } else if (question.type === 'multi_select' && Array.isArray(val)) {
                          answerPreview =
                            `${val.length} selected: ` +
                            val
                              .map((id) => {
                                const opt = question.options?.find((o) => o.id === id);
                                return opt ? opt.label : id;
                              })
                              .join(', ');
                        } else if (question.type === 'scale') {
                          const numVal = typeof val === 'number' ? val : 0;
                          answerPreview = `Rating: ${numVal} / 5 (${numVal >= 4 ? 'High' : numVal === 3 ? 'Moderate' : 'Developing'})`;
                        } else if (question.type === 'long_text') {
                          answerPreview =
                            typeof val === 'string'
                              ? `"${val.slice(0, 70)}${val.length > 70 ? '...' : ''}"`
                              : 'Prompt drafted';
                        }
                      }

                      return (
                        <div
                          key={qId}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            updateCurrentQuestionIndex(qIdx);
                            setReturnToReview(true);
                            setStage('QUESTION');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              updateCurrentQuestionIndex(qIdx);
                              setReturnToReview(true);
                              setStage('QUESTION');
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            backgroundColor: isAnswered
                              ? 'var(--aiims-bg-card-hover, #f8f7fd)'
                              : 'var(--aiims-card-rose-bg, #fff1f2)',
                            border: isAnswered
                              ? '1px solid var(--aiims-border-card, #ede9fe)'
                              : '1px solid var(--aiims-card-rose-border, #fecdd3)',
                            gap: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '2px',
                                flexWrap: 'wrap',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 800,
                                  color: 'var(--aiims-text-heading, #0f172a)',
                                }}
                              >
                                Challenge {question.challengeNumber}: {question.title}
                              </span>
                              {isMarked && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    color: '#d97706',
                                    backgroundColor: '#fef3c7',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  ★ Flagged
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: '12px',
                                color: isAnswered
                                  ? 'var(--aiims-text-secondary, #64748b)'
                                  : 'var(--aiims-card-rose-text, #be123c)',
                                fontStyle: isAnswered ? 'normal' : 'italic',
                              }}
                            >
                              {answerPreview}
                            </div>
                          </div>

                          <span
                            style={{
                              fontSize: '12px',
                              color: station.themeColor,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            Modify →
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submission Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '20px',
              borderTop: '1px solid var(--aiims-border-card)',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            <Button
              variant="outline"
              size="md"
              icon={<RotateCcw size={15} />}
              onClick={() => {
                updateCurrentQuestionIndex(0);
                setStage('QUESTION');
              }}
            >
              Back to Challenges
            </Button>

            <Button
              variant="primary"
              size="lg"
              icon={isSubmitting ? undefined : <CheckCircle2 size={18} />}
              disabled={!isAllComplete || isSubmitting}
              onClick={handleFinalSubmission}
            >
              {isSubmitting
                ? 'Calibrating & Submitting...'
                : 'Confirm & Submit Baseline Calibration (+50 AC) →'}
            </Button>
          </div>
        </Surface>
      </div>
    );
  }

  // =========================================================================
  // 4. COMPLETE STAGE: HIGH-IMPACT REWARD CELEBRATION
  // =========================================================================
  if (stage === 'COMPLETE') {
    return (
      <div
        style={{
          width: '100%',
          maxWidth: '940px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* Main Milestone Banner */}
        <Surface
          variant="gradient-hero"
          radius="lg"
          padding="lg"
          style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}
        >
          {/* Subtle Cosmic Glows */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '-30%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '400px',
              height: '300px',
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Achievement Trophy Object */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
              border: '2px solid rgba(110, 231, 183, 0.4)',
              boxShadow: '0 12px 32px rgba(16, 185, 129, 0.45), 0 0 40px rgba(52, 211, 153, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: '#FFFFFF',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Award style={{ width: '44px', height: '44px' }} />
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 14px',
              borderRadius: '9999px',
              backgroundColor: 'var(--aiims-card-mint-bg, #ecfdf5)',
              border: '1px solid var(--aiims-card-mint-border, #a7f3d0)',
              color: 'var(--aiims-card-mint-text, #059669)',
              fontSize: '11.5px',
              fontWeight: 800,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            <CheckCircle2 size={13} />
            MILESTONE COMPLETED · BASELINE ESTABLISHED
          </div>

          <h1
            style={{
              fontSize: '32px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading, #0f172a)',
              margin: '0 0 10px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              letterSpacing: '-0.5px',
            }}
          >
            Assessment Complete!
          </h1>

          <p
            style={{
              fontSize: '15px',
              color: 'var(--aiims-text-secondary, #475569)',
              maxWidth: '560px',
              margin: '0 auto 24px',
              lineHeight: 1.6,
            }}
          >
            Your 25 diagnostic answers have been evaluated. Your authoritative AI Profile Analysis
            and custom development tracks are now fully unlocked.
          </p>

          {/* Reward & Authoritative Balance Banner */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              maxWidth: '560px',
              margin: '0 auto 28px',
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--aiims-card-mint-bg, rgba(16, 185, 129, 0.1))',
                border: '1px solid var(--aiims-card-mint-border, rgba(52, 211, 153, 0.35))',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--aiims-card-mint-text, #059669)',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}
              >
                Reward Claimed
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: 'var(--aiims-card-mint-text, #059669)',
                  fontFamily: "'Fredoka', sans-serif",
                }}
              >
                +50 AC
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--aiims-card-mint-text, #065f46)',
                  fontWeight: 500,
                }}
              >
                Authoritative Milestone Grant
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--aiims-card-banner-bg, rgba(99, 102, 241, 0.1))',
                border: '1px solid var(--aiims-border-card, #c7d2fe)',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--aiims-primary, #6366f1)',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}
              >
                Current Wallet Balance
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0f172a)',
                  fontFamily: "'Fredoka', sans-serif",
                }}
              >
                {learnerState.credits.balance}{' '}
                <span style={{ fontSize: '13px', color: 'var(--aiims-primary, #6366f1)' }}>
                  Credits
                </span>
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--aiims-text-muted, #64748b)',
                  fontWeight: 500,
                }}
              >
                Authoritative Total Balance
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              size="lg"
              icon={<ArrowRight size={17} />}
              onClick={onComplete}
            >
              Explore My AI Profile Analysis →
            </Button>

            {setActiveTab && (
              <Button
                variant="outline"
                size="lg"
                icon={<Compass size={17} />}
                onClick={() => setActiveTab('journey')}
              >
                View Learning Roadmap
              </Button>
            )}
          </div>
        </Surface>

        {/* Competency Dimensions Calibration Preview */}
        {evaluationPreview && (
          <Surface variant="bordered" radius="lg" padding="lg">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '18px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: 'var(--aiims-primary, #6366f1)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                  }}
                >
                  CALIBRATED PROFILE PREVIEW
                </div>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading, #0f172a)',
                    margin: '2px 0 0',
                  }}
                >
                  5-Dimension Competency Baseline
                </h3>
              </div>
              <Badge variant="cyan" size="sm">
                Evidence Confidence:{' '}
                {Math.round((evaluationPreview.overallEvidenceCoverage || 1) * 100)}%
              </Badge>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(Object.keys(evaluationPreview.capabilities) as CapabilityKey[]).map((dimKey) => {
                const capResult = evaluationPreview.capabilities[dimKey];
                const score = capResult ? capResult.score : 0;
                const dimMeta = DIMENSION_LABELS[dimKey] || {
                  label: capResult?.capabilityName || dimKey,
                  color: '#8B5CF6',
                };

                return (
                  <div
                    key={dimKey}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                      border: '1px solid var(--aiims-border-card, #e2e8f0)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '13.5px',
                          fontWeight: 700,
                          color: 'var(--aiims-text-heading, #0f172a)',
                        }}
                      >
                        {dimMeta.label}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: dimMeta.color }}>
                        {score} / 100
                      </span>
                    </div>

                    <div
                      style={{
                        height: '6px',
                        width: '100%',
                        backgroundColor: 'var(--aiims-border-subtle, #e2e8f0)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${score}%`,
                          backgroundColor: dimMeta.color,
                          borderRadius: '3px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Surface>
        )}
      </div>
    );
  }

  // =========================================================================
  // 5. QUESTION INTERFACE STAGE (DUAL-AREA RESPONSIVE WORKSPACE)
  // =========================================================================
  const renderQuestionControl = () => {
    switch (activeQuestion.type) {
      case 'single_select':
        return (
          <div
            role="radiogroup"
            aria-label={activeQuestion.title}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {activeQuestion.options?.map((opt) => {
              const isSelected = currentAnswer === opt.id;
              return (
                <div
                  key={opt.id}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      handleSelectAnswer(opt.id);
                    }
                  }}
                  onClick={() => handleSelectAnswer(opt.id)}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '14px',
                    backgroundColor: isSelected
                      ? isDarkMode
                        ? 'rgba(99, 102, 241, 0.16)'
                        : 'var(--aiims-primary-light, #eef2ff)'
                      : 'var(--aiims-bg-card, #ffffff)',
                    border: isSelected
                      ? `2px solid ${activeStation.themeColor}`
                      : '1px solid var(--aiims-border-card, #e2e8f0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isSelected
                      ? `0 4px 14px ${activeStation.themeColor}22`
                      : 'var(--aiims-shadow-card)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--aiims-bg-card-hover, #faf9ff)';
                      e.currentTarget.style.borderColor = 'var(--aiims-border-card-hover, #c7d2fe)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--aiims-bg-card, #ffffff)';
                      e.currentTarget.style.borderColor = 'var(--aiims-border-card, #e2e8f0)';
                    }
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      flex: 1,
                      minWidth: 0,
                      paddingRight: '12px',
                    }}
                  >
                    {opt.icon && (
                      <span style={{ fontSize: '20px', flexShrink: 0 }}>{opt.icon}</span>
                    )}
                    <div>
                      <div
                        style={{
                          fontSize: '14.5px',
                          fontWeight: isSelected ? 800 : 600,
                          color: isSelected
                            ? isDarkMode
                              ? '#c7d2fe'
                              : 'var(--aiims-primary-text, #312e81)'
                            : 'var(--aiims-text-heading, #1e293b)',
                        }}
                      >
                        {opt.label}
                      </div>
                      {opt.sublabel && (
                        <div
                          style={{
                            fontSize: '12.5px',
                            color: isSelected
                              ? isDarkMode
                                ? '#a5b4fc'
                                : 'var(--aiims-primary, #4338ca)'
                              : 'var(--aiims-text-secondary, #64748b)',
                            marginTop: '3px',
                            lineHeight: 1.45,
                          }}
                        >
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Radio Affordance Indicator */}
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      border: isSelected
                        ? `2px solid ${activeStation.themeColor}`
                        : '2px solid var(--aiims-border-card, #cbd5e1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSelected && (
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: activeStation.themeColor,
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'multi_select': {
        const selectedList: string[] = Array.isArray(currentAnswer)
          ? (currentAnswer as string[])
          : [];
        const count = selectedList.length;
        const required = activeQuestion.requiredSelections;
        const max = activeQuestion.maxSelections || 99;

        return (
          <div role="group" aria-label={activeQuestion.title}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <span
                style={{ fontSize: '12.5px', color: activeStation.themeColor, fontWeight: 800 }}
              >
                {required
                  ? `Select exactly ${required} options`
                  : max < 99
                    ? `Select up to ${max} options`
                    : 'Select all options that apply'}
              </span>
              <Badge variant={required && count !== required ? 'warning' : 'primary'} size="sm">
                {count} / {required || (max < 99 ? max : 'all')} Selected
              </Badge>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeQuestion.options?.map((opt) => {
                const isSelected = selectedList.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handleMultiSelectToggle(opt.id);
                      }
                    }}
                    onClick={() => handleMultiSelectToggle(opt.id)}
                    style={{
                      padding: '16px 20px',
                      borderRadius: '14px',
                      backgroundColor: isSelected
                        ? isDarkMode
                          ? 'rgba(99, 102, 241, 0.16)'
                          : 'var(--aiims-primary-light, #eef2ff)'
                        : 'var(--aiims-bg-card, #ffffff)',
                      border: isSelected
                        ? `2px solid ${activeStation.themeColor}`
                        : '1px solid var(--aiims-border-card, #e2e8f0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isSelected
                        ? `0 4px 14px ${activeStation.themeColor}22`
                        : 'var(--aiims-shadow-card)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor =
                          'var(--aiims-bg-card-hover, #faf9ff)';
                        e.currentTarget.style.borderColor =
                          'var(--aiims-border-card-hover, #c7d2fe)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'var(--aiims-bg-card, #ffffff)';
                        e.currentTarget.style.borderColor = 'var(--aiims-border-card, #e2e8f0)';
                      }
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        flex: 1,
                        minWidth: 0,
                        paddingRight: '12px',
                      }}
                    >
                      {opt.icon && (
                        <span style={{ fontSize: '20px', flexShrink: 0 }}>{opt.icon}</span>
                      )}
                      <div>
                        <div
                          style={{
                            fontSize: '14.5px',
                            fontWeight: isSelected ? 800 : 600,
                            color: isSelected
                              ? isDarkMode
                                ? '#c7d2fe'
                                : 'var(--aiims-primary-text, #312e81)'
                              : 'var(--aiims-text-heading, #1e293b)',
                          }}
                        >
                          {opt.label}
                        </div>
                        {opt.sublabel && (
                          <div
                            style={{
                              fontSize: '12.5px',
                              color: isSelected
                                ? isDarkMode
                                  ? '#a5b4fc'
                                  : 'var(--aiims-primary, #4338ca)'
                                : 'var(--aiims-text-secondary, #64748b)',
                              marginTop: '3px',
                              lineHeight: 1.45,
                            }}
                          >
                            {opt.sublabel}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Checkbox Affordance Indicator */}
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        border: isSelected
                          ? `2px solid ${activeStation.themeColor}`
                          : '2px solid var(--aiims-border-card, #cbd5e1)',
                        backgroundColor: isSelected ? activeStation.themeColor : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSelected && <Check size={13} color="#ffffff" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'scale': {
        const val = typeof currentAnswer === 'number' ? currentAnswer : 0;
        const scaleDescriptions: Record<number, string> = {
          1: activeQuestion.minLabel || 'Strongly Disagree',
          2: 'Disagree',
          3: 'Neutral',
          4: 'Agree',
          5: activeQuestion.maxLabel || 'Strongly Agree',
        };

        return (
          <div role="radiogroup" aria-label={activeQuestion.title} style={{ padding: '8px 0' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '12px',
                marginBottom: '14px',
              }}
            >
              {[1, 2, 3, 4, 5].map((num) => {
                const isSelected = val === num;
                return (
                  <button
                    key={num}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSelectAnswer(num)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '68px',
                      padding: '8px 4px',
                      borderRadius: '14px',
                      border: isSelected
                        ? `2px solid ${activeStation.themeColor}`
                        : '1px solid var(--aiims-border-card, #cbd5e1)',
                      backgroundColor: isSelected
                        ? isDarkMode
                          ? 'rgba(99, 102, 241, 0.22)'
                          : 'var(--aiims-primary-light, #eef2ff)'
                        : 'var(--aiims-bg-card, #ffffff)',
                      color: isSelected
                        ? activeStation.themeColor
                        : 'var(--aiims-text-heading, #475569)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? `0 4px 14px ${activeStation.themeColor}25` : 'none',
                    }}
                  >
                    <span style={{ fontSize: '20px', fontWeight: 800, lineHeight: 1 }}>{num}</span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        marginTop: '4px',
                        color: isSelected
                          ? activeStation.themeColor
                          : 'var(--aiims-text-muted, #94a3b8)',
                        textAlign: 'center',
                        lineHeight: 1.1,
                      }}
                    >
                      {scaleDescriptions[num]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: 'var(--aiims-text-secondary, #64748b)',
                padding: '0 4px',
              }}
            >
              <div>
                <strong style={{ color: '#ef4444' }}>1:</strong>{' '}
                {activeQuestion.minLabel || 'Strongly Disagree'}
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ color: '#059669' }}>5:</strong>{' '}
                {activeQuestion.maxLabel || 'Strongly Agree'}
              </div>
            </div>
          </div>
        );
      }

      case 'long_text': {
        const textVal = typeof currentAnswer === 'string' ? currentAnswer : '';
        const wordCount = textVal.trim() ? textVal.trim().split(/\s+/).length : 0;

        return (
          <div>
            {activeQuestion.labNotice && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--aiims-card-banner-bg, #eef2ff)',
                  borderRadius: '12px',
                  borderLeft: `4px solid ${activeStation.themeColor}`,
                  fontSize: '12.5px',
                  color: isDarkMode ? '#a5b4fc' : '#3730a3',
                  marginBottom: '16px',
                  lineHeight: 1.5,
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    marginBottom: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Sparkles size={15} /> AI Thinking Lab Challenge
                </div>
                {activeQuestion.labNotice}
              </div>
            )}

            <textarea
              rows={5}
              aria-label={activeQuestion.title}
              value={textVal}
              onChange={(e) => handleSelectAnswer(e.target.value)}
              placeholder={
                activeQuestion.placeholder ||
                'Type your authentic response or system prompt here...'
              }
              style={{
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: 'var(--aiims-input-bg, #ffffff)',
                border: '1.5px solid var(--aiims-input-border, #cbd5e1)',
                borderRadius: '14px',
                padding: '16px',
                color: 'var(--aiims-input-text, #0f172a)',
                fontSize: '14px',
                fontFamily: "'Nunito', 'Inter', -apple-system, sans-serif",
                lineHeight: 1.55,
                outline: 'none',
                resize: 'vertical',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = activeStation.themeColor;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${activeStation.themeColor}22`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--aiims-input-border, #cbd5e1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11.5px',
                color: 'var(--aiims-text-muted, #94a3b8)',
                marginTop: '8px',
              }}
            >
              <span>Draft what you would actually submit into an AI interface.</span>
              <span style={{ fontWeight: 600 }}>
                {wordCount} words · {textVal.length} characters
              </span>
            </div>
          </div>
        );
      }
    }
  };

  const isCurrentMarked = markedForReview.includes(activeQuestion.id);

  // Main Container Style: adapts if Fullscreen Immersive Mode is Active
  const containerStyle: React.CSSProperties = isImmersiveMode
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        backgroundColor: 'var(--aiims-bg-page, #f8f9fe)',
        overflowY: 'auto',
        padding: '16px 24px 48px 24px',
        boxSizing: 'border-box',
      }
    : {
        width: '100%',
        maxWidth: '1360px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      };

  return (
    <div style={containerStyle}>
      {/* TOP HEADER CONTROLS BAR */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          borderRadius: '16px',
          border: '1px solid var(--aiims-border-card, #e2e8f0)',
          boxShadow: 'var(--aiims-shadow-card)',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Title & Station Identifier */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: activeStation.themeColor,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Brain size={18} />
          </div>

          <div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading, #0f172a)',
              }}
            >
              AIIMS Baseline Assessment
            </div>
            <div
              style={{
                fontSize: '11.5px',
                color: 'var(--aiims-text-secondary, #64748b)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>
                Station 0{activeStation.id}: <strong>{activeStation.stationName}</strong>
              </span>
              <span>•</span>
              <span style={{ color: activeStation.themeColor, fontWeight: 700 }}>
                {activeStation.domainTitle}
              </span>
            </div>
          </div>
        </div>

        {/* Progress & Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Progress Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '9999px',
              backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
              border: '1px solid var(--aiims-border-card, #e2e8f0)',
            }}
          >
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading, #0f172a)',
              }}
            >
              {answeredQuestionsCount}/25
            </span>
            <div
              style={{
                width: '60px',
                height: '6px',
                backgroundColor: 'var(--aiims-border-subtle, #e2e8f0)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  backgroundColor: activeStation.themeColor,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--aiims-text-secondary, #64748b)',
                fontWeight: 700,
              }}
            >
              {progressPercent}%
            </span>
          </div>

          {/* Mark for Review Button */}
          <button
            type="button"
            onClick={() => handleToggleMarkReview(activeQuestion.id)}
            title={isCurrentMarked ? 'Unmark challenge' : 'Flag for Review'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '10px',
              border: `1px solid ${isCurrentMarked ? '#d97706' : 'var(--aiims-border-card, #cbd5e1)'}`,
              backgroundColor: isCurrentMarked
                ? 'var(--aiims-card-amber-bg, #fffbeb)'
                : 'transparent',
              color: isCurrentMarked ? '#d97706' : 'var(--aiims-text-secondary, #64748b)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Bookmark size={14} fill={isCurrentMarked ? '#d97706' : 'none'} />
            <span>{isCurrentMarked ? 'Flagged' : 'Flag'}</span>
          </button>

          {/* Fullscreen Immersive Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsImmersiveMode(!isImmersiveMode)}
            title={isImmersiveMode ? 'Exit Fullscreen' : 'Expand to Fullscreen Assessment'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '10px',
              border: '1px solid var(--aiims-border-card, #cbd5e1)',
              backgroundColor: 'transparent',
              color: 'var(--aiims-text-secondary, #64748b)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {isImmersiveMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isImmersiveMode ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>

          {/* Review All / Save Button */}
          <button
            type="button"
            onClick={() => setStage('REVIEW')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '10px',
              border: '1px solid var(--aiims-border-card, #cbd5e1)',
              backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
              color: 'var(--aiims-text-heading, #0f172a)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <ListChecks size={14} />
            <span>Review All</span>
          </button>
        </div>
      </div>

      {/* DUAL-COLUMN MAIN ASSESSMENT STUDIO */}
      <div className="aiims-assessment-grid">
        {/* LEFT COLUMN: QUESTION CARD & ANSWER CONTROLS */}
        <Surface variant="bordered" radius="lg" padding="lg">
          {/* Return to Review Banner if in Edit Mode */}
          {returnToReview && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--aiims-card-banner-bg, #f0eeff)',
                padding: '10px 14px',
                borderRadius: '10px',
                marginBottom: '16px',
                border: '1px solid var(--aiims-border-card, #c7d2fe)',
              }}
            >
              <span
                style={{
                  fontSize: '12.5px',
                  fontWeight: 800,
                  color: 'var(--aiims-primary, #4338ca)',
                }}
              >
                Editing Challenge {currentQuestionIndex + 1} from Review Mode
              </span>
              <Button
                variant="ghost"
                size="sm"
                icon={<ListChecks size={13} />}
                onClick={() => {
                  setReturnToReview(false);
                  setStage('REVIEW');
                }}
              >
                Return to Review
              </Button>
            </div>
          )}

          {/* Station Narrative Header Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'var(--aiims-bg-card-hover, #fafafa)',
              borderRadius: '12px',
              border: '1px solid var(--aiims-border-card, #e2e8f0)',
              borderLeft: `5px solid ${activeStation.themeColor}`,
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>{activeStation.icon}</span>
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: activeStation.themeColor,
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                  }}
                >
                  STATION 0{activeStation.id}: {activeStation.domainTitle.toUpperCase()}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading, #0f172a)',
                  }}
                >
                  {activeStation.stationName}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--aiims-text-secondary, #64748b)',
                    marginTop: '2px',
                    lineHeight: 1.4,
                  }}
                >
                  {activeStation.narrative}
                </div>
              </div>
            </div>

            <Badge variant="purple" size="sm">
              Challenge {activeQuestion.challengeNumber} of 5
            </Badge>
          </div>

          {/* Challenge Question Heading */}
          <div style={{ marginBottom: '8px' }}>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 800,
                color: activeStation.themeColor,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
              }}
            >
              CHALLENGE {currentQuestionIndex + 1} OF {totalQuestions}
            </span>
            <h2
              style={{
                fontSize: '21px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading, #0f172a)',
                margin: '4px 0 8px 0',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                lineHeight: 1.35,
              }}
            >
              {activeQuestion.title}
            </h2>
          </div>

          {activeQuestion.subtitle && (
            <p
              style={{
                margin: '0 0 16px 0',
                fontSize: '13.5px',
                color: 'var(--aiims-text-secondary, #64748b)',
                lineHeight: 1.55,
              }}
            >
              {activeQuestion.subtitle}
            </p>
          )}

          {/* Rubric Rationale Notice: Why We Ask This */}
          {rubricPurpose && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                border: '1px solid var(--aiims-border-card, #e2e8f0)',
                borderRadius: '10px',
                fontSize: '12px',
                color: 'var(--aiims-text-secondary, #475569)',
                marginBottom: '20px',
                lineHeight: 1.5,
              }}
            >
              <Info
                size={15}
                style={{ color: activeStation.themeColor, marginTop: '2px', flexShrink: 0 }}
              />
              <div>
                <strong style={{ color: 'var(--aiims-text-heading, #1e293b)' }}>
                  Why we evaluate this:{' '}
                </strong>
                {rubricPurpose}
              </div>
            </div>
          )}

          {/* Interactive Answer Control */}
          <div style={{ marginBottom: '24px' }}>{renderQuestionControl()}</div>

          {/* Validation Notice Alert */}
          {validationError && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--aiims-card-rose-bg, #fff1f2)',
                border: '1px solid var(--aiims-card-rose-border, #fecdd3)',
                borderRadius: '10px',
                color: 'var(--aiims-card-rose-text, #be123c)',
                fontSize: '12.5px',
                fontWeight: 700,
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{validationError}</span>
            </div>
          )}

          {/* Bottom Navigation Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '18px',
              borderTop: '1px solid var(--aiims-border-card, #f1f5f9)',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <Button
              variant="ghost"
              size="md"
              icon={<ArrowLeft size={16} />}
              iconPosition="left"
              disabled={currentQuestionIndex === 0}
              onClick={handlePrev}
            >
              Previous
            </Button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Button
                variant="outline"
                size="md"
                icon={<Bookmark size={14} fill={isCurrentMarked ? '#d97706' : 'none'} />}
                onClick={() => handleToggleMarkReview(activeQuestion.id)}
              >
                {isCurrentMarked ? 'Flagged' : 'Flag for Review'}
              </Button>

              <Button
                variant="primary"
                size="md"
                icon={<ArrowRight size={16} />}
                onClick={handleNext}
              >
                {returnToReview
                  ? 'Save & Return to Review'
                  : currentQuestionIndex === 4 ||
                      currentQuestionIndex === 9 ||
                      currentQuestionIndex === 14 ||
                      currentQuestionIndex === 19
                    ? 'Complete Station →'
                    : currentQuestionIndex === 24
                      ? 'Review All Responses →'
                      : 'Next Challenge →'}
              </Button>
            </div>
          </div>
        </Surface>

        {/* RIGHT COLUMN: 3D VISUAL & 25-QUESTION NAVIGATOR MATRIX */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. Real Interactive Three.js Assessment Scene */}
          <div style={{ height: '310px', minHeight: '280px' }}>
            <Assessment3DVisual
              activeStationId={activeStation.id}
              stationThemeColor={activeStation.themeColor}
              stationName={activeStation.stationName}
              domainTitle={activeStation.domainTitle}
              progressPercent={progressPercent}
              answeredCount={answeredQuestionsCount}
              isDarkMode={isDarkMode}
              pulseTrigger={pulseTrigger}
              completedStationIds={completedStationIds}
              height="100%"
            />
          </div>

          {/* 2. Interactive 25-Question Matrix Navigator */}
          <Surface variant="bordered" radius="lg" padding="md">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0f172a)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Compass size={15} color={activeStation.themeColor} />
                <span>25-Challenge Matrix Navigator</span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--aiims-text-secondary, #64748b)',
                  fontWeight: 600,
                }}
              >
                {answeredQuestionsCount} of 25 Answered
              </span>
            </div>

            {/* Matrix Station Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {STORY_STATIONS.map((station) => {
                const isCurrentStation = activeStation.id === station.id;

                return (
                  <div
                    key={station.id}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      backgroundColor: isCurrentStation
                        ? isDarkMode
                          ? 'rgba(99, 102, 241, 0.12)'
                          : 'var(--aiims-primary-light, #f5f3ff)'
                        : 'var(--aiims-bg-card-hover, #fafafa)',
                      border: `1px solid ${isCurrentStation ? station.themeColor : 'var(--aiims-border-card, #e2e8f0)'}`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '6px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: isCurrentStation
                            ? station.themeColor
                            : 'var(--aiims-text-secondary, #64748b)',
                        }}
                      >
                        0{station.id}: {station.stationName}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--aiims-text-muted, #94a3b8)' }}>
                        {station.domainTitle}
                      </span>
                    </div>

                    <div
                      style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}
                    >
                      {station.challengeIds.map((qId) => {
                        const qIdx = qId - 1;
                        const isCurrent = currentQuestionIndex === qIdx;
                        const isAnswered = isQuestionAnswered(ASSESSMENT_QUESTIONS[qIdx]);
                        const isMarked = markedForReview.includes(qId);

                        return (
                          <button
                            key={qId}
                            type="button"
                            onClick={() => updateCurrentQuestionIndex(qIdx)}
                            title={`Challenge ${qId}: ${ASSESSMENT_QUESTIONS[qIdx].title}`}
                            style={{
                              height: '32px',
                              borderRadius: '8px',
                              border: isCurrent
                                ? `2px solid ${station.themeColor}`
                                : isMarked
                                  ? '1.5px solid #d97706'
                                  : '1px solid var(--aiims-border-card, #cbd5e1)',
                              backgroundColor: isCurrent
                                ? station.themeColor
                                : isAnswered
                                  ? 'var(--aiims-card-mint-bg, #dcfce7)'
                                  : 'var(--aiims-bg-card, #ffffff)',
                              color: isCurrent
                                ? '#ffffff'
                                : isAnswered
                                  ? 'var(--aiims-card-mint-text, #15803d)'
                                  : 'var(--aiims-text-secondary, #64748b)',
                              fontSize: '11.5px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '2px',
                              transition: 'all 0.15s ease',
                              boxShadow: isCurrent ? `0 2px 8px ${station.themeColor}35` : 'none',
                            }}
                          >
                            <span>{qId}</span>
                            {isMarked ? (
                              <Star size={9} fill="#d97706" color="#d97706" />
                            ) : isAnswered && !isCurrent ? (
                              <Check size={10} color={isDarkMode ? '#4ade80' : '#15803d'} />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigator Legend */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '12px',
                paddingTop: '10px',
                borderTop: '1px solid var(--aiims-border-card, #f1f5f9)',
                fontSize: '10.5px',
                color: 'var(--aiims-text-secondary, #64748b)',
                flexWrap: 'wrap',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: activeStation.themeColor,
                  }}
                />
                <span>Current</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '2px',
                    backgroundColor: 'var(--aiims-card-mint-bg, #dcfce7)',
                    border: '1px solid var(--aiims-card-mint-border, #15803d)',
                  }}
                />
                <span>Answered</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={10} fill="#d97706" color="#d97706" />
                <span>Flagged</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '2px',
                    backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                    border: '1px solid var(--aiims-border-card, #cbd5e1)',
                  }}
                />
                <span>Unanswered</span>
              </div>
            </div>
          </Surface>

          {/* 3. Station Progress & Verified Bounty Card */}
          <Surface variant="bordered" radius="lg" padding="md">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--aiims-primary, #6366f1)',
                  textTransform: 'uppercase',
                }}
              >
                MILESTONE REWARD
              </div>
              <Badge variant="success" size="sm">
                +50 AC Claimable
              </Badge>
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--aiims-text-heading, #0f172a)',
                marginBottom: '4px',
              }}
            >
              Baseline AI Competency Profile
            </div>
            <p
              style={{
                fontSize: '12px',
                color: 'var(--aiims-text-secondary, #64748b)',
                margin: 0,
                lineHeight: 1.45,
              }}
            >
              Answer all 25 challenges to claim your +50 AC milestone grant and unlock full peer
              comparisons, tailored AI Wallet tools, and active Focus tracks.
            </p>
          </Surface>
        </div>
      </div>
    </div>
  );
};

export default AssessmentScreen;
