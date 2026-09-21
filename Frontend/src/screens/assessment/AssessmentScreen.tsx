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
  ClipboardCheck,
  Edit3,
  ListChecks
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
    title: "Nice work on AI Exposure!",
    subtitle: "Next, we'll explore how you conceptualize AI capability boundaries and model mechanics under the hood.",
    nextSection: "Section 2: AI Fluency"
  },
  2: {
    title: "Great insights on AI Fluency.",
    subtitle: "Next, we'll look at your raw problem-framing, prompt-writing strategy, and AI Thinking Labs.",
    nextSection: "Section 3: AI Thinking"
  },
  3: {
    title: "Thoughtful responses in AI Thinking.",
    subtitle: "Now, let's explore verification, ethics, and human-in-the-loop oversight.",
    nextSection: "Section 4: Human Judgment"
  },
  4: {
    title: "Almost there!",
    subtitle: "Finally, we'll evaluate your adaptiveness as emerging AI tools evolve.",
    nextSection: "Section 5: Innovation Readiness"
  }
};

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
  const [transitionSection, setTransitionSection] = useState<number>(1);
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
  const activeLevel: QuestLevel = QUEST_LEVELS.find(l => l.id === activeQuestion.levelId) || QUEST_LEVELS[0];

  const currentAnswer = answers[activeQuestion.id];

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

    // Check for Section Transitions at Q5, Q10, Q15, Q20
    if (currentQuestionIndex === 4 || currentQuestionIndex === 9 || currentQuestionIndex === 14 || currentQuestionIndex === 19) {
      const sectionNum = Math.floor(currentQuestionIndex / 5) + 1;
      setTransitionSection(sectionNum);
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

  // =========================================================================
  // 1. WELCOME STAGE
  // =========================================================================
  if (stage === 'WELCOME') {
    const hasSavedProgress = answeredQuestionsCount > 0;

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
              A 25-question multi-dimensional assessment to evaluate your AI usage frequency, capability evaluation, workflow design, strategic vision, and mentorship readiness.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxWidth: '540px', margin: '0 auto 28px' }}>
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#4f46e5' }}>25</div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Questions</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#7c3aed' }}>5</div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Sections</div>
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
                  Resume Assessment ({answeredQuestionsCount}/25 Saved)
                </Button>
              )}

              <Button
                variant="primary"
                size="lg"
                icon={<ArrowRight size={16} />}
                onClick={() => {
                  updateCurrentQuestionIndex(0);
                  setStage('QUESTION');
                }}
              >
                {hasSavedProgress ? 'Restart Fresh' : 'Begin Assessment'}
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
              updateCurrentQuestionIndex(currentQuestionIndex + 1);
              setStage('QUESTION');
            }}
          >
            Continue to {transitionData.nextSection}
          </Button>
        </Surface>
      </div>
    );
  }

  // =========================================================================
  // 3. DEDICATED REVIEW STAGE (Bug 3 Fix)
  // =========================================================================
  if (stage === 'REVIEW') {
    const unAnsweredQuestions = ASSESSMENT_QUESTIONS.filter(q => !isQuestionAnswered(q));
    const isAllComplete = unAnsweredQuestions.length === 0;

    return (
      <div style={{ maxWidth: '780px', margin: '24px auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Surface variant="bordered" radius="lg" padding="lg">
          {/* Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 900, color: '#6366f1', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>
                ASSESSMENT REVIEW
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: "'Fredoka', sans-serif" }}>
                Review Your Answers
              </h2>
            </div>

            <Badge variant={isAllComplete ? 'success' : 'warning'} icon={isAllComplete ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}>
              {answeredQuestionsCount} / {totalQuestions} Answered
            </Badge>
          </div>

          <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 20px 0', lineHeight: 1.5 }}>
            Verify all responses before final submission. Click <strong>Edit</strong> on any question to modify your answer or complete missing selections.
          </p>

          {/* Validation Notice */}
          {!isAllComplete && (
            <div style={{ padding: '12px 16px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', color: '#be123c', fontSize: '13px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>Please complete all required questions before submitting ({unAnsweredQuestions.length} incomplete).</span>
            </div>
          )}

          {/* Section Breakdown Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
            {QUEST_LEVELS.map((level) => (
              <div
                key={level.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  padding: '16px',
                  border: '1px solid #ede9fe',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.03)'
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#4338ca', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{level.icon}</span> Section 0{level.id}: {level.title}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {level.challengeIds.map((qId) => {
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
                        answerPreview = `Score: ${val} / 5`;
                      } else if (question.type === 'long_text') {
                        answerPreview = typeof val === 'string' ? `"${val.slice(0, 60)}${val.length > 60 ? '...' : ''}"` : 'Text response';
                      }
                    }

                    return (
                      <div
                        key={qId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          backgroundColor: isAnswered ? '#f8f7fd' : '#fff1f2',
                          border: isAnswered ? '1px solid #ede9fe' : '1px solid #fecdd3',
                          gap: '12px'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                              Q{qId}. {question.title.slice(0, 50)}{question.title.length > 50 ? '...' : ''}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: isAnswered ? '#475569' : '#be123c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {answerPreview}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Badge variant={isAnswered ? 'success' : 'warning'} size="sm">
                            {isAnswered ? '✓ Answered' : '⚠ Needs Attention'}
                          </Badge>

                          <Button
                            variant="outline"
                            size="sm"
                            icon={<Edit3 size={11} />}
                            onClick={() => {
                              updateCurrentQuestionIndex(qIdx);
                              setReturnToReview(true);
                              setStage('QUESTION');
                            }}
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Review Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: '16px', borderTop: '1px solid #f1f5f9' }}>
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
              Back to Q25
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
            Assessment Complete!
          </h1>

          <p style={{ fontSize: '14px', color: '#475569', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            Your baseline multi-dimensional diagnostic has been submitted. Your AI Profile Analysis is now unlocked.
          </p>

          <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '14px', padding: '18px', maxWidth: '440px', margin: '0 auto 24px' }}>
            <div style={{ fontSize: '12px', color: '#047857', fontWeight: 700, marginBottom: '4px' }}>
              ✓ +50 AIIMS Credits Reward Claimed
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
        const required = activeQuestion.requiredSelections;
        const max = activeQuestion.maxSelections || 99;

        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 700 }}>
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

        {/* Return to Review Banner if in Edit Mode */}
        {returnToReview && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f0eeff', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #c7d2fe' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#4338ca' }}>
              Editing Question {currentQuestionIndex + 1} from Review
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

        {/* Header Information */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5' }}>
            Question {currentQuestionIndex + 1} of {totalQuestions} • Section 0{activeLevel.id}: {activeLevel.title}
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

        {/* Progress Bar */}
        <div style={{ height: '6px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '24px' }}>
          <div
            style={{
              height: '100%',
              width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
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
              : currentQuestionIndex === 24
              ? 'Review Responses →'
              : 'Next Question'}
          </Button>
        </div>

      </Surface>
    </div>
  );
};
