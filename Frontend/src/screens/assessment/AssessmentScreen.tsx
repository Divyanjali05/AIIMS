import React, { useState, useEffect } from 'react';
import {
  ASSESSMENT_QUESTIONS,
  QUEST_LEVELS,
  STORY_STATIONS,
  QuestionData,
  QuestLevel
} from '../../data/assessmentQuestions';
import { useLearner } from '../../context/LearnerContext';
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
  ClipboardCheck,
  ListChecks,
  Info,
  Layers,
  Wrench,
  Cpu,
  Compass,
  ShieldCheck,
  Rocket
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ASSESSMENT_RUBRICS } from '../../services/assessmentScoring';

export type AssessmentFlowStage =
  | 'WELCOME'
  | 'QUESTION'
  | 'TRANSITION'
  | 'REVIEW'
  | 'COMPLETE';

interface AssessmentScreenProps {
  onComplete: () => void;
}

export const AssessmentScreen: React.FC<AssessmentScreenProps> = ({ onComplete }) => {
  const { state: learnerState, saveAssessmentAnswer, setQuestionIndex, completeAssessment } = useLearner();

  const savedAnswers = learnerState.assessment.answers || {};
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
  const [answers, setAnswers] = useState<Record<number, any>>(savedAnswers);
  const [transitionStationId, setTransitionStationId] = useState<number>(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [returnToReview, setReturnToReview] = useState<boolean>(false);

  // Keep answers synced with context state
  useEffect(() => {
    setAnswers(learnerState.assessment.answers || {});
  }, [learnerState.assessment.answers]);

  // Sync index changes to Context & LocalStorage
  const updateCurrentQuestionIndex = (newIdx: number) => {
    setCurrentIdx(newIdx);
    setQuestionIndex(newIdx);
  };

  const activeQuestion: QuestionData = ASSESSMENT_QUESTIONS[currentQuestionIndex] || ASSESSMENT_QUESTIONS[0];
  const activeStation: QuestLevel = STORY_STATIONS.find(s => s.id === activeQuestion.levelId) || STORY_STATIONS[0];
  const activeLevel: QuestLevel = activeStation; // Backwards-compatible alias
  const currentAnswer = answers[activeQuestion.id];
  const rubricPurpose = ASSESSMENT_RUBRICS[activeQuestion.id]?.purpose;

  // Helper to check if a specific question has a valid answer
  const isQuestionAnswered = (q: QuestionData): boolean => {
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
  };

  const answeredQuestionsCount = ASSESSMENT_QUESTIONS.filter(isQuestionAnswered).length;
  const totalQuestions = ASSESSMENT_QUESTIONS.length;
  const remainingQuestionsCount = totalQuestions - answeredQuestionsCount;

  // Handle single answer selection
  const handleSelectAnswer = (val: any) => {
    setValidationError(null);
    const updated = { ...answers, [activeQuestion.id]: val };
    setAnswers(updated);
    saveAssessmentAnswer(activeQuestion.id, val);
  };

  // Handle multi-select toggle with exact selection requirements
  const handleMultiSelectToggle = (optId: string) => {
    setValidationError(null);
    const existing: string[] = Array.isArray(answers[activeQuestion.id]) ? answers[activeQuestion.id] : [];
    let updatedList: string[];

    if (existing.includes(optId)) {
      updatedList = existing.filter(id => id !== optId);
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

  // Strictly validate current question before advancing
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
        setValidationError('Your response is empty. Please enter your thoughts or prompt before continuing.');
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

    // Check for Station Transitions at Q5, Q10, Q15, Q20 (end of stations 1, 2, 3, 4)
    if (currentQuestionIndex === 4 || currentQuestionIndex === 9 || currentQuestionIndex === 14 || currentQuestionIndex === 19) {
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
  const handleFinalSubmission = () => {
    const unAnswered = ASSESSMENT_QUESTIONS.filter(q => !isQuestionAnswered(q));
    if (unAnswered.length > 0) {
      setValidationError(`Please complete all required questions before submitting (${unAnswered.length} remaining).`);
      return;
    }
    completeAssessment();
    setStage('COMPLETE');
  };

  // Helper to get station completion status
  const getStationStatus = (stationId: number) => {
    const stationQuestions = ASSESSMENT_QUESTIONS.filter(q => q.levelId === stationId);
    const answeredInStation = stationQuestions.filter(isQuestionAnswered).length;
    return {
      answered: answeredInStation,
      total: stationQuestions.length,
      isComplete: answeredInStation === stationQuestions.length,
      isCurrent: activeStation.id === stationId
    };
  };

  // =========================================================================
  // 1. WELCOME STAGE: 5-STATION DISCOVERY INTRO
  // =========================================================================
  if (stage === 'WELCOME') {
    const hasSavedProgress = answeredQuestionsCount > 0;

    return (
      <div style={{ maxWidth: '820px', margin: '24px auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Surface variant="bordered" radius="lg" padding="lg">
          {/* Header Status Badges */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
            <Badge variant="primary" icon={<Compass size={14} />}>
              5-STATION AI DISCOVERY JOURNEY
            </Badge>

            <Badge variant="warning" icon={<Wallet size={14} />}>
              Wallet: {learnerState.credits.balance} Credits
            </Badge>
          </div>

          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '20px',
              backgroundColor: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: '#ffffff',
              boxShadow: '0 8px 24px rgba(79, 70, 229, 0.25)'
            }}>
              <Brain style={{ width: '34px', height: '34px' }} />
            </div>

            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Discover Your Authentic AI Profile
            </h1>

            <p style={{ fontSize: '14.5px', color: '#475569', maxWidth: '580px', margin: '0 auto 24px', lineHeight: 1.55 }}>
              Journey through five specialized narrative stations — from your practical daily workbench to the panoramic radar tower — answering 25 interactive challenges that build your multidimensional capability baseline.
            </p>

            {/* Metrics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxWidth: '540px', margin: '0 auto 28px' }}>
              <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#4f46e5' }}>25</div>
                <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700 }}>Challenges</div>
              </div>
              <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#7c3aed' }}>5</div>
                <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700 }}>Story Stations</div>
              </div>
              <div style={{ padding: '14px', backgroundColor: '#ecfdf5', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#059669' }}>+50 AC</div>
                <div style={{ fontSize: '11.5px', color: '#047857', fontWeight: 700 }}>Completion Reward</div>
              </div>
            </div>

            {/* 5 Story Stations Roadmap Grid */}
            <div style={{ textAlign: 'left', marginBottom: '32px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#4338ca', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px', textAlign: 'center' }}>
                YOUR 5-STATION EXPEDITION
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {STORY_STATIONS.map((station) => (
                  <div
                    key={station.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--aiims-bg-card)',
                      border: '1px solid var(--aiims-border-card)',
                      borderLeft: `5px solid ${station.themeColor}`,
                      boxShadow: 'var(--aiims-shadow-card)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '22px' }}>{station.icon}</span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--aiims-text-heading)' }}>
                          Station 0{station.id}: {station.title}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--aiims-text-muted)' }}>
                          {station.narrative}
                        </div>
                      </div>
                    </div>

                    <span style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 9px',
                      borderRadius: '9999px',
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      whiteSpace: 'nowrap'
                    }}>
                      5 Challenges
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Start / Resume Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {hasSavedProgress && (
                <Button
                  variant="outline"
                  size="lg"
                  icon={<RotateCcw size={16} />}
                  onClick={() => setStage('QUESTION')}
                >
                  Resume at Station {activeStation.id}: {activeStation.stationName} ({answeredQuestionsCount}/25 Saved)
                </Button>
              )}

              <Button
                variant="primary"
                size="lg"
                icon={<ArrowRight size={18} />}
                onClick={() => {
                  updateCurrentQuestionIndex(0);
                  setStage('QUESTION');
                }}
              >
                {hasSavedProgress ? 'Restart Fresh Expedition' : 'Begin Assessment Journey →'}
              </Button>
            </div>
          </div>
        </Surface>
      </div>
    );
  }

  // =========================================================================
  // 2. SECTION TRANSITION INTERSTITIAL STAGE
  // =========================================================================
  if (stage === 'TRANSITION') {
    const completedStation = STORY_STATIONS.find(s => s.id === transitionStationId) || STORY_STATIONS[0];
    const nextStation = STORY_STATIONS.find(s => s.id === transitionStationId + 1) || STORY_STATIONS[0];

    return (
      <div style={{ maxWidth: '640px', margin: '40px auto', textAlign: 'center' }}>
        <Surface variant="bordered" radius="lg" padding="lg">
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            backgroundColor: '#ecfdf5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 6px 18px rgba(16, 185, 129, 0.2)'
          }}>
            <CheckCircle2 size={32} />
          </div>

          <Badge variant="success" size="sm" style={{ marginBottom: '12px' }}>
            STATION 0{completedStation.id} CLEARED • {completedStation.stationName.toUpperCase()}
          </Badge>

          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {completedStation.transitionRecap}
          </h2>

          <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.55, margin: '0 0 24px', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
            {completedStation.transitionTeaser}
          </p>

          {/* Stepper Progress Visualizer */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
            {STORY_STATIONS.map((s) => {
              const isPast = s.id <= completedStation.id;
              const isNext = s.id === nextStation.id;
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: isPast ? '#059669' : isNext ? s.themeColor : '#e2e8f0',
                    color: isPast || isNext ? '#ffffff' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 800
                  }}>
                    {isPast ? '✓' : `0${s.id}`}
                  </div>
                  {s.id < 5 && (
                    <div style={{ width: '20px', height: '2px', backgroundColor: isPast ? '#059669' : '#e2e8f0' }} />
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
    const unAnsweredQuestions = ASSESSMENT_QUESTIONS.filter(q => !isQuestionAnswered(q));
    const isAllComplete = unAnsweredQuestions.length === 0;

    return (
      <div style={{ maxWidth: '820px', margin: '24px auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Surface variant="bordered" radius="lg" padding="lg">
          {/* Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 900, color: '#6366f1', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>
                5-STATION EXPEDITION REVIEW
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Review Your Assessment Responses
              </h2>
            </div>

            <Badge variant={isAllComplete ? 'success' : 'warning'} icon={isAllComplete ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}>
              {answeredQuestionsCount} / {totalQuestions} Answered
            </Badge>
          </div>

          <p style={{ color: '#64748b', fontSize: '13.5px', margin: '0 0 20px 0', lineHeight: 1.5 }}>
            Verify all responses across the five stations before final submission. Click on any challenge to modify your answer.
          </p>

          {/* Validation Notice */}
          {!isAllComplete && (
            <div style={{ padding: '12px 16px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', color: '#be123c', fontSize: '13px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>Please complete all required challenges before submitting ({unAnsweredQuestions.length} incomplete).</span>
            </div>
          )}

          {/* 5-Station Breakdown List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
            {STORY_STATIONS.map((station) => {
              const status = getStationStatus(station.id);

              return (
                <div
                  key={station.id}
                  style={{
                    backgroundColor: 'var(--aiims-bg-card)',
                    borderRadius: 'var(--aiims-card-radius, 12px)',
                    padding: '16px',
                    border: '1px solid var(--aiims-border-card)',
                    borderLeft: `4px solid ${station.themeColor}`,
                    boxShadow: 'var(--aiims-shadow-card)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--aiims-text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>{station.icon}</span>
                      <span>Station 0{station.id}: {station.title}</span>
                    </div>

                    <Badge variant={status.isComplete ? 'success' : 'warning'} size="sm">
                      {status.answered} / {status.total} Done
                    </Badge>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {station.challengeIds.map((qId) => {
                      const qIdx = qId - 1;
                      const question = ASSESSMENT_QUESTIONS[qIdx];
                      const isAnswered = isQuestionAnswered(question);
                      const val = answers[qId];

                      let answerPreview = 'Not answered yet';
                      if (isAnswered) {
                        if (question.type === 'single_select') {
                          const opt = question.options?.find(o => o.id === val);
                          answerPreview = opt ? opt.label : String(val);
                        } else if (question.type === 'multi_select' && Array.isArray(val)) {
                          answerPreview = `${val.length} selected: ` + val.map(id => {
                            const opt = question.options?.find(o => o.id === id);
                            return opt ? opt.label : id;
                          }).join(', ');
                        } else if (question.type === 'scale') {
                          answerPreview = `Rating: ${val} / 5`;
                        } else if (question.type === 'long_text') {
                          answerPreview = typeof val === 'string' ? `"${val.slice(0, 60)}${val.length > 60 ? '...' : ''}"` : 'Text response';
                        }
                      }

                      return (
                        <div
                          key={qId}
                          onClick={() => {
                            updateCurrentQuestionIndex(qIdx);
                            setReturnToReview(true);
                            setStage('QUESTION');
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            backgroundColor: isAnswered ? '#f8f7fd' : '#fff1f2',
                            border: isAnswered ? '1px solid #ede9fe' : '1px solid #fecdd3',
                            gap: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                              <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
                                Challenge {question.challengeNumber}: {question.title.slice(0, 55)}{question.title.length > 55 ? '...' : ''}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: isAnswered ? '#475569' : '#be123c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {answerPreview}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Badge variant={isAnswered ? 'success' : 'warning'} size="sm">
                              {isAnswered ? '✓ Complete' : '⚠ Required'}
                            </Badge>
                            <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 700 }}>
                              Edit →
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Review Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '10px' }}>
            <Button
              variant="outline"
              size="md"
              icon={<ArrowLeft size={15} />}
              iconPosition="left"
              onClick={() => {
                updateCurrentQuestionIndex(24);
                setStage('QUESTION');
              }}
            >
              Back to Challenge 25
            </Button>

            <Button
              variant="primary"
              size="lg"
              icon={<CheckCircle2 size={16} />}
              disabled={!isAllComplete}
              onClick={handleFinalSubmission}
            >
              Submit Final Assessment
            </Button>
          </div>
        </Surface>
      </div>
    );
  }

  // =========================================================================
  // 4. COMPLETE STAGE
  // =========================================================================
  if (stage === 'COMPLETE') {
    return (
      <div style={{ maxWidth: '680px', margin: '32px auto' }}>
        <Surface variant="bordered" radius="lg" padding="lg" style={{ textAlign: 'center' }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '22px',
            backgroundColor: '#059669',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 24px rgba(5, 150, 105, 0.25)'
          }}>
            <Award style={{ width: '38px', height: '38px' }} />
          </div>

          <Badge variant="success" size="md" style={{ marginBottom: '12px' }}>
            5 STATIONS COMPLETED • DIAGNOSTIC SYNTHESIZED
          </Badge>

          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Assessment Complete!
          </h1>

          <p style={{ fontSize: '14.5px', color: '#475569', maxWidth: '520px', margin: '0 auto 20px', lineHeight: 1.55 }}>
            Congratulations! You have conquered all 5 Story Stations and answered 25 verified challenges. Your authentic AI Profile Analysis is now unlocked.
          </p>

          {/* Reward & Credits Box */}
          <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--aiims-card-radius, 12px)', padding: '18px', maxWidth: '440px', margin: '0 auto 24px' }}>
            <div style={{ fontSize: '12px', color: '#047857', fontWeight: 700, marginBottom: '4px' }}>
              ✓ +50 AIIMS Credits Reward Claimed
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {learnerState.credits.balance} <span style={{ fontSize: '13px', color: '#4f46e5', fontWeight: 600 }}>Credits Available</span>
            </div>
          </div>

          <div>
            <Button
              variant="primary"
              size="lg"
              icon={<ArrowRight size={18} />}
              onClick={onComplete}
            >
              Explore My AI Profile Analysis →
            </Button>
          </div>
        </Surface>
      </div>
    );
  }

  // =========================================================================
  // 5. QUESTION INTERFACE STAGE
  // =========================================================================
  const renderQuestionControl = () => {
    switch (activeQuestion.type) {
      case 'single_select':
        return (
          <div role="radiogroup" aria-label={activeQuestion.title} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                    padding: '14px 18px',
                    borderRadius: '12px',
                    backgroundColor: isSelected ? '#eef2ff' : '#ffffff',
                    border: isSelected ? `2px solid ${activeStation.themeColor}` : '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? `0 2px 8px rgba(79, 70, 229, 0.12)` : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {opt.icon && <span style={{ fontSize: '18px' }}>{opt.icon}</span>}
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#312e81' : '#1e293b' }}>
                        {opt.label}
                      </div>
                      {opt.sublabel && (
                        <div style={{ fontSize: '12px', color: isSelected ? '#4338ca' : '#64748b', marginTop: '2px' }}>
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: isSelected ? `2px solid ${activeStation.themeColor}` : '2px solid #cbd5e1',
                    backgroundColor: isSelected ? activeStation.themeColor : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isSelected && <Check size={12} color="#ffffff" />}
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'multi_select': {
        const selectedList: string[] = Array.isArray(currentAnswer) ? currentAnswer : [];
        const count = selectedList.length;
        const required = activeQuestion.requiredSelections;
        const max = activeQuestion.maxSelections || 99;

        return (
          <div role="group" aria-label={activeQuestion.title}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: activeStation.themeColor, fontWeight: 800 }}>
                {required
                  ? `Select exactly ${required} options`
                  : max < 99
                  ? `Select up to ${max} options`
                  : 'Select all that apply'}
              </span>
              <Badge variant={required && count !== required ? 'warning' : 'primary'} size="sm">
                {count} / {required || (max < 99 ? max : 'all')} selected
              </Badge>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                      padding: '14px 18px',
                      borderRadius: '12px',
                      backgroundColor: isSelected ? '#eef2ff' : '#ffffff',
                      border: isSelected ? `2px solid ${activeStation.themeColor}` : '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {opt.icon && <span style={{ fontSize: '18px' }}>{opt.icon}</span>}
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#312e81' : '#1e293b' }}>
                          {opt.label}
                        </div>
                        {opt.sublabel && (
                          <div style={{ fontSize: '12px', color: isSelected ? '#4338ca' : '#64748b', marginTop: '2px' }}>
                            {opt.sublabel}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      border: isSelected ? `2px solid ${activeStation.themeColor}` : '2px solid #cbd5e1',
                      backgroundColor: isSelected ? activeStation.themeColor : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {isSelected && <Check size={12} color="#ffffff" />}
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
        return (
          <div role="radiogroup" aria-label={activeQuestion.title} style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
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
                      flex: 1,
                      height: '52px',
                      borderRadius: '12px',
                      border: isSelected ? `2px solid ${activeStation.themeColor}` : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? '#eef2ff' : '#ffffff',
                      color: isSelected ? activeStation.themeColor : '#475569',
                      fontSize: '18px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(99, 102, 241, 0.15)' : 'none'
                    }}
                  >
                    {num}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', gap: '10px' }}>
              <div><strong style={{ color: '#ef4444' }}>1:</strong> {activeQuestion.minLabel || 'Strongly Disagree'}</div>
              <div style={{ textAlign: 'right' }}><strong style={{ color: '#059669' }}>5:</strong> {activeQuestion.maxLabel || 'Strongly Agree'}</div>
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
              <div style={{ padding: '12px 14px', backgroundColor: '#eef2ff', borderRadius: '10px', borderLeft: `3px solid ${activeStation.themeColor}`, fontSize: '12px', color: '#3730a3', marginBottom: '14px' }}>
                <div style={{ fontWeight: 800, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} /> AI Thinking Lab Challenge
                </div>
                {activeQuestion.labNotice}
              </div>
            )}

            <textarea
              rows={5}
              aria-label={activeQuestion.title}
              value={textVal}
              onChange={(e) => handleSelectAnswer(e.target.value)}
              placeholder={activeQuestion.placeholder || 'Type your authentic response here...'}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: 'var(--aiims-input-bg)',
                border: '1px solid var(--aiims-input-border)',
                borderRadius: '12px',
                padding: '14px',
                color: 'var(--aiims-input-text)',
                fontSize: '14px',
                fontFamily: "'Inter', sans-serif",
                lineHeight: 1.5,
                outline: 'none',
                resize: 'vertical'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--aiims-text-muted)', marginTop: '6px' }}>
              <span>Write what you would actually type into an AI prompt box.</span>
              <span>{wordCount} words • {textVal.length} chars</span>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div style={{ maxWidth: '820px', margin: '24px auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* 5-Station Stepper Navigation Bar */}
      <div
        role="navigation"
        aria-label="Story Station Progress"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'var(--aiims-bg-card)',
          padding: '8px 12px',
          borderRadius: '14px',
          border: '1px solid var(--aiims-border-card)',
          boxShadow: 'var(--aiims-shadow-card)',
          overflowX: 'auto'
        }}
      >
        {STORY_STATIONS.map((station) => {
          const status = getStationStatus(station.id);
          const isCurrent = activeStation.id === station.id;

          return (
            <div
              key={station.id}
              style={{
                flex: 1,
                minWidth: '120px',
                padding: '8px 10px',
                borderRadius: '10px',
                backgroundColor: isCurrent ? station.themeColor : status.isComplete ? '#f0fdf4' : '#f8fafc',
                border: isCurrent ? `1px solid ${station.themeColor}` : status.isComplete ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                color: isCurrent ? '#ffffff' : status.isComplete ? '#15803d' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                backgroundColor: isCurrent ? 'rgba(255,255,255,0.25)' : status.isComplete ? '#dcfce7' : '#e2e8f0',
                color: isCurrent ? '#ffffff' : status.isComplete ? '#15803d' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 800,
                flexShrink: 0
              }}>
                {status.isComplete ? '✓' : `0${station.id}`}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {station.stationName}
                </div>
                <div style={{ fontSize: '9.5px', opacity: isCurrent ? 0.9 : 0.75, whiteSpace: 'nowrap' }}>
                  {status.answered}/5 Done
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Surface variant="bordered" radius="lg" padding="lg">

        {/* Return to Review Banner if in Edit Mode */}
        {returnToReview && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f0eeff', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #c7d2fe' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#4338ca' }}>
              Editing Challenge {currentQuestionIndex + 1} from Review
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon={<ListChecks size={12} />}
              onClick={() => {
                setReturnToReview(false);
                setStage('REVIEW');
              }}
            >
              Return to Review
            </Button>
          </div>
        )}

        {/* Station Narrative Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: '#fafafa',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          borderLeft: `5px solid ${activeStation.themeColor}`,
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>{activeStation.icon}</span>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: activeStation.themeColor, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                STATION 0{activeStation.id}: {activeStation.domainTitle.toUpperCase()}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                {activeStation.stationName}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                {activeStation.narrative}
              </div>
            </div>
          </div>

          <Badge variant="neutral" size="sm">
            Challenge {activeQuestion.challengeNumber} of 5
          </Badge>
        </div>

        {/* Header Progress Information */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>
            Overall Progress: {currentQuestionIndex + 1} of {totalQuestions} Challenges
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
              {answeredQuestionsCount} / {totalQuestions} Answered
            </span>
            <Badge variant="warning" size="sm">
              {learnerState.credits.balance} AC
            </Badge>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div style={{ height: '6px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '22px' }}>
          <div
            style={{
              height: '100%',
              width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
              backgroundColor: activeStation.themeColor,
              transition: 'width 0.25s ease'
            }}
          />
        </div>

        {/* Question Prompt */}
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.35 }}>
          {activeQuestion.title}
        </h2>

        {activeQuestion.subtitle && (
          <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
            {activeQuestion.subtitle}
          </p>
        )}

        {/* Approved Rubric Explanation: Why We Ask This */}
        {rubricPurpose && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '9px 12px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#475569',
            marginBottom: '20px',
            lineHeight: 1.45
          }}>
            <Info size={14} style={{ color: activeStation.themeColor, marginTop: '2px', flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#1e293b' }}>Why we ask this: </strong>
              {rubricPurpose}
            </div>
          </div>
        )}

        {/* Input Control */}
        <div style={{ marginBottom: '24px' }}>
          {renderQuestionControl()}
        </div>

        {/* Validation Error Notice */}
        {validationError && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: '10px',
            color: '#be123c',
            fontSize: '12px',
            fontWeight: 700,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <AlertCircle size={15} /> {validationError}
          </div>
        )}

        {/* Control Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
          <Button
            variant="ghost"
            size="md"
            icon={<ArrowLeft size={15} />}
            iconPosition="left"
            disabled={currentQuestionIndex === 0}
            onClick={handlePrev}
          >
            Previous
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={<ArrowRight size={15} />}
            onClick={handleNext}
          >
            {returnToReview
              ? 'Save & Return to Review'
              : currentQuestionIndex === 4 || currentQuestionIndex === 9 || currentQuestionIndex === 14 || currentQuestionIndex === 19
              ? 'Complete Station →'
              : currentQuestionIndex === 24
              ? 'Review All Responses →'
              : 'Next Challenge →'}
          </Button>
        </div>

      </Surface>
    </div>
  );
};
