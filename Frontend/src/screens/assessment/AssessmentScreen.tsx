import React, { useState, useEffect } from 'react';
import {
  ASSESSMENT_QUESTIONS,
  QUEST_LEVELS,
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
  ClipboardCheck
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export type AssessmentFlowStage =
  | 'WELCOME'
  | 'QUESTION'
  | 'TRANSITION'
  | 'REVIEW'
  | 'COMPLETE';

interface AssessmentScreenProps {
  onComplete: () => void;
}

const SECTION_TRANSITIONS: Record<number, { title: string; subtitle: string; nextSection: string }> = {
  1: {
    title: "Nice. Let's look a little deeper.",
    subtitle: "Next, we'll explore how you conceptualize AI capability boundaries under the hood.",
    nextSection: "Section 2: AI Literacy & Fluency"
  },
  2: {
    title: "Great insights so far.",
    subtitle: "Next, we'll look at your raw problem-framing and prompt-writing strategy.",
    nextSection: "Section 3: AI Thinking & Prompting"
  },
  3: {
    title: "Thoughtful responses.",
    subtitle: "Now, let's explore verification, ethics, and human-in-the-loop oversight.",
    nextSection: "Section 4: Critical Thinking & Judgment"
  },
  4: {
    title: "Almost there!",
    subtitle: "Finally, we'll evaluate your adaptiveness as emerging AI tools evolve.",
    nextSection: "Section 5: Innovation Readiness"
  }
};

export const AssessmentScreen: React.FC<AssessmentScreenProps> = ({ onComplete }) => {
  const { state: learnerState, saveAssessmentAnswer, completeAssessment } = useLearner();

  const savedAnswers = learnerState.assessment.answers || {};
  const isAlreadyCompleted = learnerState.assessment.status === 'completed';

  const [stage, setStage] = useState<AssessmentFlowStage>(
    isAlreadyCompleted ? 'COMPLETE' : 'WELCOME'
  );

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0); // 0 to 24
  const [answers, setAnswers] = useState<Record<number, any>>(savedAnswers);
  const [transitionSection, setTransitionSection] = useState<number>(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync answers with learnerState
  useEffect(() => {
    setAnswers(learnerState.assessment.answers || {});
  }, [learnerState.assessment.answers]);

  const activeQuestion: QuestionData = ASSESSMENT_QUESTIONS[currentQuestionIndex] || ASSESSMENT_QUESTIONS[0];
  const activeLevel: QuestLevel = QUEST_LEVELS.find(l => l.id === activeQuestion.levelId) || QUEST_LEVELS[0];

  const currentAnswer = answers[activeQuestion.id];
  const totalAnsweredCount = Object.keys(answers).filter(k => {
    const val = answers[Number(k)];
    return val !== undefined && val !== '' && (Array.isArray(val) ? val.length > 0 : true);
  }).length;

  const handleSelectAnswer = (val: any) => {
    setValidationError(null);
    const updated = { ...answers, [activeQuestion.id]: val };
    setAnswers(updated);
    saveAssessmentAnswer(activeQuestion.id, val);
  };

  const handleMultiSelectToggle = (optId: string) => {
    setValidationError(null);
    const existing: string[] = Array.isArray(answers[activeQuestion.id]) ? answers[activeQuestion.id] : [];
    let updatedList: string[];
    if (existing.includes(optId)) {
      updatedList = existing.filter(id => id !== optId);
    } else {
      const max = activeQuestion.maxSelections || 99;
      if (existing.length >= max) return;
      updatedList = [...existing, optId];
    }
    handleSelectAnswer(updatedList);
  };

  const validateCurrentQuestion = (): boolean => {
    const val = answers[activeQuestion.id];
    if (val === undefined || val === null || val === '') {
      if (activeQuestion.type === 'long_text') {
        setValidationError('Your response is still empty. Please write your thoughts or prompt before continuing.');
      } else if (activeQuestion.type === 'multi_select') {
        setValidationError('Please select at least 1 option before continuing.');
      } else {
        setValidationError('Please select an answer before continuing.');
      }
      return false;
    }
    if (Array.isArray(val) && val.length === 0) {
      setValidationError('Please select at least 1 option before continuing.');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentQuestion()) return;

    if (currentQuestionIndex === 4 || currentQuestionIndex === 9 || currentQuestionIndex === 14 || currentQuestionIndex === 19) {
      const sectionNum = Math.floor(currentQuestionIndex / 5) + 1;
      setTransitionSection(sectionNum);
      setStage('TRANSITION');
      return;
    }

    if (currentQuestionIndex < 24) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setStage('REVIEW');
    }
  };

  const handlePrev = () => {
    setValidationError(null);
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleFinalSubmission = () => {
    completeAssessment();
    setStage('COMPLETE');
  };

  // 1. WELCOME SCREEN
  if (stage === 'WELCOME') {
    const hasSavedProgress = totalAnsweredCount > 0;

    return (
      <div style={{ maxWidth: '720px', margin: '24px auto' }}>
        <Surface variant="bordered" radius="lg" padding="lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <Badge variant="primary" icon={<ClipboardCheck size={14} />}>
              AI ASSESSMENT
            </Badge>

            <Badge variant="warning" icon={<Wallet size={14} />}>
              Wallet: {learnerState.credits.balance} Credits
            </Badge>
          </div>

          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              backgroundColor: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: '#ffffff'
            }}>
              <Brain style={{ width: '32px', height: '32px' }} />
            </div>

            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: "'Fredoka', sans-serif" }}>
              Discover Your AI Profile
            </h1>

            <p style={{ fontSize: '14px', color: '#475569', maxWidth: '540px', margin: '0 auto 24px', lineHeight: 1.5 }}>
              A short assessment to understand how you currently use, think about and work with AI. Your honest answers help AIIMS build your personal capability profile.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxWidth: '540px', margin: '0 auto 28px' }}>
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#4f46e5' }}>25</div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Questions</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#7c3aed' }}>10–15</div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Minutes</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>+50 AC</div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Completion Reward</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {hasSavedProgress && (
                <Button
                  variant="outline"
                  size="md"
                  icon={<RotateCcw size={15} />}
                  onClick={() => setStage('QUESTION')}
                >
                  Resume ({totalAnsweredCount}/25 Saved)
                </Button>
              )}

              <Button
                variant="primary"
                size="lg"
                icon={<ArrowRight size={16} />}
                onClick={() => {
                  setCurrentQuestionIndex(0);
                  setStage('QUESTION');
                }}
              >
                {hasSavedProgress ? 'Start Over' : 'Begin Assessment'}
              </Button>
            </div>
          </div>
        </Surface>
      </div>
    );
  }

  // 2. SECTION TRANSITION INTERSTITIAL
  if (stage === 'TRANSITION') {
    const transitionData = SECTION_TRANSITIONS[transitionSection] || SECTION_TRANSITIONS[1];

    return (
      <div style={{ maxWidth: '600px', margin: '48px auto', textAlign: 'center' }}>
        <Surface variant="bordered" radius="lg" padding="lg">
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: '#ecfdf5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <CheckCircle2 size={28} />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: "'Fredoka', sans-serif" }}>
            {transitionData.title}
          </h2>

          <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, margin: '0 0 24px' }}>
            {transitionData.subtitle}
          </p>

          <Button
            variant="primary"
            size="md"
            icon={<ArrowRight size={16} />}
            onClick={() => {
              setCurrentQuestionIndex(currentQuestionIndex + 1);
              setStage('QUESTION');
            }}
          >
            Continue to {transitionData.nextSection}
          </Button>
        </Surface>
      </div>
    );
  }

  // 3. REVIEW STATE
  if (stage === 'REVIEW') {
    return (
      <div style={{ maxWidth: '720px', margin: '24px auto' }}>
        <Surface variant="bordered" radius="lg" padding="lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', letterSpacing: '0.5px' }}>FINAL REVIEW</span>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '2px 0', fontFamily: "'Fredoka', sans-serif" }}>
                25 of 25 Completed
              </h2>
            </div>

            <Badge variant="success" icon={<CheckCircle2 size={14} />}>
              All Answered
            </Badge>
          </div>

          <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
            Review or jump back to modify any response before submitting your baseline assessment.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
            {QUEST_LEVELS.map((level) => (
              <div
                key={level.id}
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  padding: '14px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Section 0{level.id}: {level.title}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                  {level.challengeIds.map((qId) => {
                    const qIdx = qId - 1;
                    const isAns = answers[qId] !== undefined && answers[qId] !== '';
                    return (
                      <button
                        key={qId}
                        onClick={() => {
                          setCurrentQuestionIndex(qIdx);
                          setStage('QUESTION');
                        }}
                        style={{
                          padding: '8px 4px',
                          borderRadius: '8px',
                          border: isAns ? '1px solid #a7f3d0' : '1px solid #fecdd3',
                          backgroundColor: isAns ? '#ecfdf5' : '#fff1f2',
                          color: isAns ? '#047857' : '#be123c',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px'
                        }}
                      >
                        <span>Q{qId}</span>
                        {isAns ? <Check size={11} /> : <AlertCircle size={11} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              variant="outline"
              size="md"
              icon={<ArrowLeft size={15} />}
              iconPosition="left"
              onClick={() => {
                setCurrentQuestionIndex(24);
                setStage('QUESTION');
              }}
            >
              Back to Q25
            </Button>

            <Button
              variant="primary"
              size="lg"
              icon={<ArrowRight size={16} />}
              onClick={handleFinalSubmission}
            >
              Submit Assessment
            </Button>
          </div>
        </Surface>
      </div>
    );
  }

  // 4. COMPLETE STATE
  if (stage === 'COMPLETE') {
    return (
      <div style={{ maxWidth: '640px', margin: '32px auto' }}>
        <Surface variant="bordered" radius="lg" padding="lg" style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            backgroundColor: '#059669',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <Award style={{ width: '36px', height: '36px' }} />
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', fontFamily: "'Fredoka', sans-serif" }}>
            Your Assessment is Complete
          </h1>

          <p style={{ fontSize: '14px', color: '#475569', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            AIIMS is ready to show you what it discovered about your current AI profile.
          </p>

          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: '14px', padding: '18px', maxWidth: '440px', margin: '0 auto 24px' }}>
            <div style={{ fontSize: '12px', color: '#047857', fontWeight: 700, marginBottom: '4px' }}>
              ✓ +50 AIIMS Credits Reward Issued
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', fontFamily: "'Fredoka', sans-serif" }}>
              {learnerState.credits.balance} <span style={{ fontSize: '13px', color: '#4f46e5', fontWeight: 600 }}>Credits</span>
            </div>
          </div>

          <div>
            <Button
              variant="primary"
              size="lg"
              icon={<ArrowRight size={18} />}
              onClick={onComplete}
            >
              Reveal My Analysis
            </Button>
          </div>
        </Surface>
      </div>
    );
  }

  // 5. QUESTION INTERFACE
  const renderQuestionControl = () => {
    switch (activeQuestion.type) {
      case 'single_select':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeQuestion.options?.map((opt) => {
              const isSelected = currentAnswer === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelectAnswer(opt.id)}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '12px',
                    backgroundColor: isSelected ? '#e0e7ff' : '#ffffff',
                    border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#3730a3' : '#1e293b' }}>
                    {opt.label}
                  </span>

                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: isSelected ? '2px solid #4f46e5' : '2px solid #cbd5e1',
                    backgroundColor: isSelected ? '#4f46e5' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
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
        const max = activeQuestion.maxSelections || 99;

        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 600 }}>
                {max < 99 ? `Select up to ${max} options` : 'Select all that apply'}
              </span>
              <Badge variant="primary" size="sm">
                {count} / {max < 99 ? max : 'all'} selected
              </Badge>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeQuestion.options?.map((opt) => {
                const isSelected = selectedList.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleMultiSelectToggle(opt.id)}
                    style={{
                      padding: '14px 18px',
                      borderRadius: '12px',
                      backgroundColor: isSelected ? '#e0e7ff' : '#ffffff',
                      border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#3730a3' : '#1e293b' }}>
                      {opt.label}
                    </span>

                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      border: isSelected ? '2px solid #4f46e5' : '2px solid #cbd5e1',
                      backgroundColor: isSelected ? '#4f46e5' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
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
          <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              {[1, 2, 3, 4, 5].map((num) => {
                const isSelected = val === num;
                return (
                  <button
                    key={num}
                    onClick={() => handleSelectAnswer(num)}
                    style={{
                      flex: 1,
                      height: '52px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? '#e0e7ff' : '#ffffff',
                      color: isSelected ? '#3730a3' : '#475569',
                      fontSize: '18px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    {num}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
              <div><strong style={{ color: '#ef4444' }}>1:</strong> {activeQuestion.minLabel || 'Strongly Disagree'}</div>
              <div><strong style={{ color: '#059669' }}>5:</strong> {activeQuestion.maxLabel || 'Strongly Agree'}</div>
            </div>
          </div>
        );
      }

      case 'long_text': {
        const textVal = typeof currentAnswer === 'string' ? currentAnswer : '';
        return (
          <div>
            {activeQuestion.labNotice && (
              <div style={{ padding: '12px 14px', backgroundColor: '#e0e7ff', borderRadius: '10px', borderLeft: '3px solid #4f46e5', fontSize: '12px', color: '#3730a3', marginBottom: '14px' }}>
                <div style={{ fontWeight: 700, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={14} /> AI Prompt Challenge
                </div>
                {activeQuestion.labNotice}
              </div>
            )}

            <textarea
              rows={5}
              value={textVal}
              onChange={(e) => handleSelectAnswer(e.target.value)}
              placeholder={activeQuestion.placeholder || 'Type your authentic response here...'}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '14px',
                color: '#0f172a',
                fontSize: '14px',
                fontFamily: "'Inter', sans-serif",
                lineHeight: 1.5,
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>
        );
      }
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '24px auto' }}>
      <Surface variant="bordered" radius="lg" padding="lg">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5' }}>
            Question {currentQuestionIndex + 1} of 25 • Section 0{activeLevel.id}: {activeLevel.title}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
              {Math.round(((currentQuestionIndex + 1) / 25) * 100)}%
            </span>
            <Badge variant="warning" size="sm">
              {learnerState.credits.balance} AC
            </Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ height: '6px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '24px' }}>
          <div
            style={{
              height: '100%',
              width: `${((currentQuestionIndex + 1) / 25) * 100}%`,
              backgroundColor: '#4f46e5',
              transition: 'width 0.2s ease'
            }}
          />
        </div>

        {/* Question Prompt */}
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0', fontFamily: "'Fredoka', sans-serif", lineHeight: 1.35 }}>
          {activeQuestion.title}
        </h2>

        {activeQuestion.subtitle && (
          <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
            {activeQuestion.subtitle}
          </p>
        )}

        {/* Input Controls */}
        <div style={{ marginBottom: '24px' }}>
          {renderQuestionControl()}
        </div>

        {/* Validation Error Notice */}
        {validationError && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: '8px',
            color: '#be123c',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <AlertCircle size={14} /> {validationError}
          </div>
        )}

        {/* Controls */}
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
            {currentQuestionIndex === 24 ? 'Review Responses →' : 'Next Question'}
          </Button>
        </div>

      </Surface>
    </div>
  );
};
