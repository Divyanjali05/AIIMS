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
  ChevronRight,
  UserCheck,
  Wallet,
  FileEdit,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  Award
} from 'lucide-react';

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

    // Check if section completed (Q5, Q10, Q15, Q20)
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

  const daylightCardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    padding: '40px 36px',
    border: '1px solid #eef2f6',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)'
  };


  // ---------------------------------------------------------------------------
  // 1. WELCOME SCREEN
  // ---------------------------------------------------------------------------
  if (stage === 'WELCOME') {
    const hasSavedProgress = totalAnsweredCount > 0;

    return (
      <div style={{ maxWidth: '820px', margin: '32px auto' }}>
        <div style={daylightCardStyle}>
          {/* Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, padding: '6px 14px', backgroundColor: '#e0e7ff', color: '#4338ca', borderRadius: '20px', letterSpacing: '0.5px' }}>
              AI ASSESSMENT
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '20px', color: '#b45309', fontSize: '13px', fontWeight: 700 }}>
              <Wallet size={16} /> Wallet: {learnerState.credits.balance} Credits
            </div>
          </div>

          {/* Body */}
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 12px 30px rgba(79, 70, 229, 0.3)'
            }}>
              <Brain style={{ width: '42px', height: '42px', color: '#ffffff' }} />
            </div>

            <h1 style={{ fontSize: '34px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', fontFamily: "'Outfit', sans-serif" }}>
              Discover Your AI Profile
            </h1>

            <p style={{ fontSize: '16px', color: '#475569', maxWidth: '620px', margin: '0 auto 28px', lineHeight: 1.6 }}>
              A short assessment to understand how you currently use, think about and work with AI. Your honest answers help AIIMS build your multidimensional capability profile.
            </p>

            {/* Assessment Facts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', maxWidth: '620px', margin: '0 auto 32px' }}>
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#4f46e5' }}>25</div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Questions</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#7c3aed' }}>10–15</div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Minutes Duration</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#059669' }}>+50 AC</div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Completion Reward</div>
              </div>
            </div>

            {/* Mentor Reassurance */}
            <div style={{
              padding: '16px 20px',
              backgroundColor: '#f0fdf4',
              borderRadius: '16px',
              border: '1px solid #bbf7d0',
              maxWidth: '620px',
              margin: '0 auto 36px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textAlign: 'left'
            }}>
              <UserCheck style={{ width: '22px', height: '22px', color: '#047857', flexShrink: 0 }} />
              <div style={{ fontSize: '13px', color: '#166534', lineHeight: 1.5 }}>
                <strong>AIIMS Mentor:</strong> "Take your time. This is about your actual behavior and thinking rather than finding perfect test answers."
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              {hasSavedProgress && (
                <button
                  onClick={() => setStage('QUESTION')}
                  style={{
                    padding: '16px 32px',
                    borderRadius: '16px',
                    backgroundColor: '#e0e7ff',
                    color: '#3730a3',
                    border: '1px solid #c7d2fe',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <RotateCcw size={18} /> Resume ({totalAnsweredCount}/25 Saved)
                </button>
              )}

              <button
                onClick={() => {
                  setCurrentQuestionIndex(0);
                  setStage('QUESTION');
                }}
                style={{
                  padding: '16px 44px',
                  borderRadius: '16px',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 8px 25px rgba(79, 70, 229, 0.35)'
                }}
              >
                <span>{hasSavedProgress ? 'Start Over' : 'Begin Assessment'}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }


  // ---------------------------------------------------------------------------
  // 2. SECTION TRANSITION INTERSTITIAL
  // ---------------------------------------------------------------------------
  if (stage === 'TRANSITION') {
    const transitionData = SECTION_TRANSITIONS[transitionSection] || SECTION_TRANSITIONS[1];

    return (
      <div style={{ maxWidth: '680px', margin: '60px auto', textAlign: 'center' }}>
        <div style={daylightCardStyle}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            backgroundColor: '#ecfdf5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', fontFamily: "'Outfit', sans-serif" }}>
            {transitionData.title}
          </h2>

          <p style={{ fontSize: '16px', color: '#64748b', lineHeight: 1.6, margin: '0 0 32px' }}>
            {transitionData.subtitle}
          </p>

          <button
            onClick={() => {
              setCurrentQuestionIndex(currentQuestionIndex + 1);
              setStage('QUESTION');
            }}
            style={{
              padding: '16px 36px',
              borderRadius: '16px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 8px 24px rgba(79, 70, 229, 0.3)'
            }}
          >
            <span>Continue to {transitionData.nextSection}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }


  // ---------------------------------------------------------------------------
  // 3. REVIEW STATE
  // ---------------------------------------------------------------------------
  if (stage === 'REVIEW') {
    return (
      <div style={{ maxWidth: '840px', margin: '32px auto' }}>
        <div style={daylightCardStyle}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5', letterSpacing: '0.5px' }}>FINAL REVIEW</span>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0', fontFamily: "'Outfit', sans-serif" }}>
                25 of 25 Completed
              </h2>
            </div>

            <div style={{ padding: '6px 16px', backgroundColor: '#ecfdf5', borderRadius: '20px', color: '#047857', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} /> All Questions Answered
            </div>
          </div>

          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '28px' }}>
            You can review or jump back to modify any response before submitting your baseline assessment.
          </p>

          {/* Section Review Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '36px' }}>
            {QUEST_LEVELS.map((level) => (
              <div
                key={level.id}
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Section 0{level.id}: {level.title}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
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
                          padding: '10px 8px',
                          borderRadius: '10px',
                          border: isAns ? '1px solid #a7f3d0' : '1px solid #fecdd3',
                          backgroundColor: isAns ? '#ecfdf5' : '#fff1f2',
                          color: isAns ? '#047857' : '#be123c',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>Q{qId}</span>
                        {isAns ? <Check size={12} /> : <AlertCircle size={12} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => {
                setCurrentQuestionIndex(24);
                setStage('QUESTION');
              }}
              style={{
                padding: '14px 24px',
                borderRadius: '14px',
                backgroundColor: 'transparent',
                border: '1px solid #cbd5e1',
                color: '#475569',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <ArrowLeft size={16} /> Back to Question 25
            </button>

            <button
              onClick={handleFinalSubmission}
              style={{
                padding: '16px 40px',
                borderRadius: '16px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 8px 25px rgba(79, 70, 229, 0.4)'
              }}
            >
              <span>Submit Assessment</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }


  // ---------------------------------------------------------------------------
  // 4. COMPLETION STATE
  // ---------------------------------------------------------------------------
  if (stage === 'COMPLETE') {
    return (
      <div style={{ maxWidth: '780px', margin: '40px auto' }}>
        <div style={{ ...daylightCardStyle, textAlign: 'center', padding: '48px 36px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '28px',
            background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 12px 30px rgba(16, 185, 129, 0.35)'
          }}>
            <Award style={{ width: '44px', height: '44px', color: '#ffffff' }} />
          </div>

          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: "'Outfit', sans-serif" }}>
            Your Assessment is Complete
          </h1>

          <p style={{ fontSize: '16px', color: '#475569', maxWidth: '580px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            AIIMS is ready to show you what it discovered about your current AI profile.
          </p>

          {/* Reward & Wallet Transaction Summary */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '20px', padding: '24px', maxWidth: '520px', margin: '0 auto 32px', boxShadow: '0 8px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '13px', color: '#059669', fontWeight: 700, marginBottom: '6px' }}>
              ✓ +50 AIIMS Credits Reward Issued
            </div>

            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginTop: '8px' }}>
              Current Wallet Balance
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginTop: '2px', fontFamily: "'Outfit', sans-serif" }}>
              {learnerState.credits.balance} <span style={{ fontSize: '16px', color: '#4f46e5', fontWeight: 600 }}>Credits</span>
            </div>
          </div>

          {/* Mentor Guidance */}
          <div style={{ padding: '20px 24px', backgroundColor: '#f0fdf4', borderRadius: '16px', border: '1px solid #bbf7d0', maxWidth: '520px', margin: '0 auto 36px', textAlign: 'left' }}>
            <div style={{ fontSize: '12px', color: '#047857', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <UserCheck size={16} /> AIIMS Mentor Guidance:
            </div>
            <p style={{ margin: 0, fontSize: '15px', color: '#166534', lineHeight: 1.6 }}>
              "Your multi-dimensional baseline is ready. Let's explore your strengths and skill growth opportunities."
            </p>
          </div>

          <div>
            <button
              onClick={onComplete}
              style={{
                padding: '18px 44px',
                borderRadius: '16px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                fontSize: '17px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 8px 25px rgba(79, 70, 229, 0.4)'
              }}
            >
              Reveal My Analysis <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }


  // ---------------------------------------------------------------------------
  // 5. QUESTION BY QUESTION INTERFACE
  // ---------------------------------------------------------------------------
  const renderQuestionControl = () => {
    switch (activeQuestion.type) {
      case 'single_select':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {activeQuestion.options?.map((opt) => {
              const isSelected = currentAnswer === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelectAnswer(opt.id)}
                  style={{
                    padding: '18px 24px',
                    borderRadius: '16px',
                    backgroundColor: isSelected ? '#e0e7ff' : '#ffffff',
                    border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {opt.icon && <span style={{ fontSize: '22px' }}>{opt.icon}</span>}
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#3730a3' : '#1e293b' }}>
                        {opt.label}
                      </div>
                      {opt.sublabel && (
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: isSelected ? '2px solid #4f46e5' : '2px solid #cbd5e1',
                      backgroundColor: isSelected ? '#4f46e5' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isSelected && <Check size={16} color="#ffffff" />}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', color: '#6366f1', fontWeight: 600 }}>
                {max < 99 ? `Select up to ${max} options` : 'Select all that apply'}
              </span>
              <span style={{ fontSize: '12px', padding: '4px 12px', backgroundColor: '#e0e7ff', color: '#4338ca', borderRadius: '12px', fontWeight: 700 }}>
                {count} / {max < 99 ? max : 'all'} selected
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {activeQuestion.options?.map((opt) => {
                const isSelected = selectedList.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleMultiSelectToggle(opt.id)}
                    style={{
                      padding: '18px 24px',
                      borderRadius: '16px',
                      backgroundColor: isSelected ? '#e0e7ff' : '#ffffff',
                      border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {opt.icon && <span style={{ fontSize: '22px' }}>{opt.icon}</span>}
                      <span style={{ fontSize: '15px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#3730a3' : '#1e293b' }}>
                        {opt.label}
                      </span>
                    </div>

                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid #4f46e5' : '2px solid #cbd5e1',
                        backgroundColor: isSelected ? '#4f46e5' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {isSelected && <Check size={16} color="#ffffff" />}
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
          <div style={{ padding: '16px 0' }}>
            <div style={{ display: 'flex', gap: '14px', marginBottom: '24px' }}>
              {[1, 2, 3, 4, 5].map((num) => {
                const isSelected = val === num;
                return (
                  <button
                    key={num}
                    onClick={() => handleSelectAnswer(num)}
                    style={{
                      flex: 1,
                      height: '64px',
                      borderRadius: '16px',
                      border: isSelected ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? '#e0e7ff' : '#ffffff',
                      color: isSelected ? '#3730a3' : '#475569',
                      fontSize: '22px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 6px 20px rgba(79, 70, 229, 0.2)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {num}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', lineHeight: 1.4 }}>
              <div style={{ maxWidth: '220px' }}>
                <strong style={{ color: '#ef4444' }}>1:</strong> {activeQuestion.minLabel || 'Strongly Disagree'}
              </div>
              <div style={{ maxWidth: '220px', textAlign: 'right' }}>
                <strong style={{ color: '#10b981' }}>5:</strong> {activeQuestion.maxLabel || 'Strongly Agree'}
              </div>
            </div>
          </div>
        );
      }

      case 'long_text': {
        const textVal = typeof currentAnswer === 'string' ? currentAnswer : '';
        return (
          <div>
            {activeQuestion.labNotice && (
              <div style={{ padding: '16px', backgroundColor: '#e0e7ff', borderRadius: '14px', borderLeft: '4px solid #4f46e5', fontSize: '13px', color: '#3730a3', marginBottom: '20px', lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700, color: '#4338ca', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} /> AI Prompting Challenge
                </div>
                {activeQuestion.labNotice}
              </div>
            )}

            <textarea
              rows={6}
              value={textVal}
              onChange={(e) => handleSelectAnswer(e.target.value)}
              placeholder={activeQuestion.placeholder || 'Type your authentic prompt or response here...'}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '16px',
                padding: '18px',
                color: '#0f172a',
                fontSize: '15px',
                fontFamily: "'Inter', sans-serif",
                lineHeight: 1.6,
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
    <div style={{ maxWidth: '840px', margin: '32px auto' }}>
      <div style={daylightCardStyle}>

        {/* Top Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#4f46e5' }}>
            Question {currentQuestionIndex + 1} of 25 • Section 0{activeLevel.id}: {activeLevel.title}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
              {Math.round(((currentQuestionIndex + 1) / 25) * 100)}% Complete
            </span>
            <div style={{ padding: '4px 10px', backgroundColor: '#fef3c7', borderRadius: '12px', color: '#b45309', fontSize: '12px', fontWeight: 700 }}>
              {learnerState.credits.balance} AC
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ height: '8px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '28px' }}>
          <div
            style={{
              height: '100%',
              width: `${((currentQuestionIndex + 1) / 25) * 100}%`,
              background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)',
              transition: 'width 0.3s ease'
            }}
          />
        </div>

        {/* Main Question Card */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '36px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.04)', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', lineHeight: 1.4 }}>
            {activeQuestion.title}
          </h2>

          {activeQuestion.subtitle && (
            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
              {activeQuestion.subtitle}
            </p>
          )}

          {renderQuestionControl()}

          {/* Validation Notice */}
          {validationError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '20px',
              padding: '10px 16px',
              backgroundColor: '#fff1f2',
              borderRadius: '12px',
              border: '1px solid #fecdd3',
              color: '#be123c',
              fontSize: '13px',
              fontWeight: 600
            }}>
              <AlertCircle size={16} />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* Calm Mentor Message (Occasional) */}
        {(currentQuestionIndex === 2 || currentQuestionIndex === 12 || currentQuestionIndex === 22) && (
          <div style={{ padding: '14px 20px', backgroundColor: '#f0fdf4', borderRadius: '14px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <UserCheck size={18} color="#047857" />
            <span style={{ fontSize: '13px', color: '#166534', fontWeight: 500 }}>
              AIIMS Mentor: "Take your time. AIIMS is learning how you actually work with AI."
            </span>
          </div>
        )}

        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={handlePrev}
            disabled={currentQuestionIndex === 0}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              backgroundColor: 'transparent',
              border: '1px solid #cbd5e1',
              color: currentQuestionIndex === 0 ? '#cbd5e1' : '#475569',
              cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={16} /> Previous
          </button>

          <button
            onClick={handleNext}
            style={{
              padding: '14px 32px',
              borderRadius: '14px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 6px 20px rgba(79, 70, 229, 0.3)'
            }}
          >
            <span>{currentQuestionIndex === 24 ? 'Review Answers' : 'Continue'}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
