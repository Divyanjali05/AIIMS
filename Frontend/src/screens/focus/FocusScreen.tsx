import React, { useState } from 'react';
import { useLearner } from '../../context/LearnerContext';
import {
  Target,
  Sparkles,
  ArrowRight,
  Lock,
  Brain,
  Compass,
  CheckCircle2,
  RefreshCw,
  MessageSquare,
  Zap,
  Info,
  Layers,
  History,
  Check
} from 'lucide-react';

interface FocusScreenProps {
  setActiveTab?: (tab: string) => void;
}

interface TopicFocusDetail {
  title: string;
  whyItMatters: string;
  practicalNextStep: string;
  suggestedAction: string;
}

const FOCUS_DETAILS_DATABASE: Record<string, TopicFocusDetail> = {
  'AI Workflow Design': {
    title: 'AI Workflow Design',
    whyItMatters: 'Establishing repeatable AI workflows gives you the highest leverage by turning one-off prompting into reliable, multi-step processes.',
    practicalNextStep: 'Take one repeated task from your week (e.g., weekly status reporting, research summaries, or code reviews) and map out the inputs, prompt steps, and verification checks.',
    suggestedAction: 'Map a 3-step repeatable workflow for your weekly update'
  },
  'AI Workflow & Architecture Design': {
    title: 'AI Workflow Design',
    whyItMatters: 'Establishing repeatable AI workflows gives you the highest leverage by turning one-off prompting into reliable, multi-step processes.',
    practicalNextStep: 'Take one repeated task from your week (e.g., weekly status reporting, research summaries, or code reviews) and map out the inputs, prompt steps, and verification checks.',
    suggestedAction: 'Map a 3-step repeatable workflow for your weekly update'
  },
  'AI Agents & Autonomous Workflows': {
    title: 'AI Agents & Autonomous Workflows',
    whyItMatters: 'Delegating multi-step goals to autonomous AI tools allows you to shift from line-by-line prompting to high-level goal delegation.',
    practicalNextStep: 'Define a multi-step research or data auditing goal and specify clear tool boundaries and review checkpoints for an AI agent assistant.',
    suggestedAction: 'Specify goal & boundaries for an autonomous agent task'
  },
  'Evaluating AI Output & Critical Assessment': {
    title: 'Evaluating AI Output & Critical Assessment',
    whyItMatters: 'Structured verification turns confident AI generation into trustworthy, production-grade output by catching hallucinations and logic gaps.',
    practicalNextStep: 'Create a 3-step verification checklist for checking primary facts, logical consistency, and context alignment before sharing AI output.',
    suggestedAction: 'Draft a 3-step verification checklist for your AI outputs'
  },
  'Human Judgment & Oversight': {
    title: 'Human Judgment & Oversight',
    whyItMatters: 'Ensuring human intuition, ethics, and accountability remain at critical decision points where AI augments rather than replaces responsibility.',
    practicalNextStep: 'Identify 2 high-stakes decision points in your team\'s workflow where human sign-off must remain mandatory.',
    suggestedAction: 'Define human-in-the-loop review points for key decisions'
  }
};

const getFallbackFocusDetail = (topicName: string): TopicFocusDetail => {
  return {
    title: topicName,
    whyItMatters: `Focusing on ${topicName} allows you to turn concepts explored in Clarity into practical work habits.`,
    practicalNextStep: `Identify one recurring scenario in your work where applying ${topicName} creates immediate efficiency or quality gains.`,
    suggestedAction: `Apply ${topicName} to one active work project`
  };
};

export const FocusScreen: React.FC<FocusScreenProps> = ({ setActiveTab }) => {
  const {
    state,
    selectFocusTrack,
    changeFocusTrack,
    clearFocusSelection
  } = useLearner();

  const isAssessmentCompleted = state.assessment.status === 'completed';
  const isAnalysisViewed = state.analysis.status === 'viewed' || state.analysis.status === 'unlocked';
  const isClarityExplored = state.clarity.status === 'completed' || (state.clarity.completedTopics && state.clarity.completedTopics.length > 0) || state.clarity.selectedTopic !== null;

  const activeFocusTrack = state.focus.selectedTrack;
  const focusStatus = state.focus.status;
  const isFocusActive = focusStatus === 'active';
  const focusHistory = state.focus.history || [];
  const reflections = state.clarity.reflections || {};

  // Default candidate topic coming from Clarity state
  const defaultCandidate = state.clarity.selectedTopic || state.clarity.completedTopics[0] || (state.clarity.selectedAreas && state.clarity.selectedAreas[0]) || 'AI Workflow Design';
  const [candidateTopic, setCandidateTopic] = useState<string>(defaultCandidate);
  const [showChangeSelector, setShowChangeSelector] = useState<boolean>(false);
  const [showPracticeNote, setShowPracticeNote] = useState<boolean>(false);

  // -------------------------------------------------------------
  // STATE A — Assessment not completed
  // -------------------------------------------------------------
  if (!isAssessmentCompleted) {
    return (
      <div style={{ maxWidth: '640px', margin: '60px auto', textAlign: 'center' }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '28px',
          padding: '48px 36px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            backgroundColor: '#e0e7ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: '#4f46e5'
          }}>
            <Lock size={32} />
          </div>

          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', fontFamily: "'Outfit', sans-serif" }}>
            Focus comes after understanding your AI profile
          </h2>

          <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6, margin: '0 0 32px' }}>
            Complete your AI Assessment first. AIIMS will evaluate your profile and help you decide where to focus.
          </p>

          <button
            onClick={() => setActiveTab && setActiveTab('assessment')}
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
              boxShadow: '0 8px 24px rgba(79, 70, 229, 0.35)'
            }}
          >
            <span>Start Assessment</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATE B — Assessment completed but Analysis not viewed
  // -------------------------------------------------------------
  if (!isAnalysisViewed) {
    return (
      <div style={{ maxWidth: '640px', margin: '60px auto', textAlign: 'center' }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '28px',
          padding: '48px 36px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            backgroundColor: '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: '#d97706'
          }}>
            <Brain size={32} />
          </div>

          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', fontFamily: "'Outfit', sans-serif" }}>
            Your profile comes first
          </h2>

          <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6, margin: '0 0 32px' }}>
            Open your Analysis to understand what AIIMS discovered about how you work with AI.
          </p>

          <button
            onClick={() => setActiveTab && setActiveTab('analysis')}
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
              boxShadow: '0 8px 24px rgba(79, 70, 229, 0.35)'
            }}
          >
            <span>View Analysis</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATE C — Analysis available but Clarity not completed
  // -------------------------------------------------------------
  if (!isClarityExplored) {
    return (
      <div style={{ maxWidth: '640px', margin: '60px auto', textAlign: 'center' }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '28px',
          padding: '48px 36px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            backgroundColor: '#e0f2fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: '#0284c7'
          }}>
            <Compass size={32} />
          </div>

          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', fontFamily: "'Outfit', sans-serif" }}>
            Build some Clarity first
          </h2>

          <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6, margin: '0 0 32px' }}>
            Explore an area from your profile before deciding where to focus. Clarity will help you understand the concept first.
          </p>

          <button
            onClick={() => setActiveTab && setActiveTab('clarity')}
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
              boxShadow: '0 8px 24px rgba(79, 70, 229, 0.35)'
            }}
          >
            <span>Explore Clarity</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Determine current active topic or candidate topic
  const displayTopic = isFocusActive && activeFocusTrack && !showChangeSelector
    ? activeFocusTrack
    : candidateTopic;

  const topicDetail = FOCUS_DETAILS_DATABASE[displayTopic] || getFallbackFocusDetail(displayTopic);
  const savedReflection = reflections[displayTopic] || null;

  // Available alternative areas from Clarity
  const alternativeAreas = (state.clarity.selectedAreas || [
    'AI Workflow Design',
    'AI Agents & Autonomous Workflows',
    'Evaluating AI Output & Critical Assessment'
  ]).filter((a) => a !== displayTopic);

  const handleMakeFocus = () => {
    selectFocusTrack(displayTopic);
    setShowChangeSelector(false);
  };

  const handleChangeFocus = (newTopic: string) => {
    changeFocusTrack(newTopic);
    setCandidateTopic(newTopic);
    setShowChangeSelector(false);
  };

  return (
    <div style={{ maxWidth: '980px', margin: '32px auto', padding: '0 20px' }}>

      {/* 1. HEADER */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Target style={{ width: '22px', height: '22px', color: '#4f46e5' }} />
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5', letterSpacing: '1px', textTransform: 'uppercase' }}>
            STAGE 5: FOCUS CENTER
          </span>
        </div>

        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: "'Outfit', sans-serif" }}>
          What matters for you right now?
        </h1>

        <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>
          Focus is a deliberate decision. Choose the area of attention you want to give your priority to next.
        </p>
      </div>


      {/* 2. MAIN FOCUS DECISION CARD */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '36px',
        border: isFocusActive && !showChangeSelector ? '2px solid #4f46e5' : '1px solid #eef2f6',
        boxShadow: '0 8px 30px rgba(0,0,0,0.03)',
        marginBottom: '32px',
        position: 'relative'
      }}>
        {/* Active Pill */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 800,
            color: isFocusActive && !showChangeSelector ? '#4f46e5' : '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            {isFocusActive && !showChangeSelector ? '🎯 YOUR CURRENT ACTIVE FOCUS' : 'CANDIDATE FOCUS AREA'}
          </span>

          {isFocusActive && !showChangeSelector && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              backgroundColor: '#e0e7ff',
              color: '#3730a3',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 700
            }}>
              <CheckCircle2 size={15} /> Active Selection
            </span>
          )}
        </div>

        <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', fontFamily: "'Outfit', sans-serif" }}>
          {topicDetail.title}
        </h2>

        <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.6, margin: '0 0 28px' }}>
          "You explored this area in Clarity. Now decide whether it deserves your primary attention right now."
        </p>


        {/* 3. WHY THIS MAY MATTER TO YOU */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '20px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          marginBottom: '28px'
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} style={{ color: '#4f46e5' }} /> Why this may matter to you
          </h3>

          <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#334155', lineHeight: 1.55 }}>
            {topicDetail.whyItMatters}
          </p>

          {/* Surfaced Clarity Reflection if it exists */}
          {savedReflection ? (
            <div style={{
              padding: '16px',
              backgroundColor: '#f0f5ff',
              borderRadius: '14px',
              borderLeft: '4px solid #4f46e5'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#3730a3', textTransform: 'uppercase', marginBottom: '4px' }}>
                Your saved reflection from Clarity
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: '#1e1b4b', fontStyle: 'italic', lineHeight: 1.5 }}>
                "{savedReflection}"
              </p>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
              Note: You can return to Clarity to add a personal reflection anytime.
            </div>
          )}
        </div>


        {/* 4. AIIMS MENTOR PERSPECTIVE */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          borderRadius: '20px',
          padding: '20px 24px',
          color: '#ffffff',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px'
        }}>
          <Sparkles size={20} style={{ color: '#c7d2fe', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#c7d2fe', letterSpacing: '1px', textTransform: 'uppercase' }}>
              AIIMS MENTOR PERSPECTIVE
            </span>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#e0e7ff', lineHeight: 1.5 }}>
              "Clarity helped you understand the area. Focus is simply deciding whether it deserves your attention now. You don't need to work on everything at once."
            </p>
          </div>
        </div>


        {/* 5. PRIMARY ACTION BUTTON */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {(!isFocusActive || showChangeSelector || activeFocusTrack !== displayTopic) ? (
            <button
              onClick={handleMakeFocus}
              style={{
                padding: '16px 36px',
                borderRadius: '9999px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 8px 24px rgba(79, 70, 229, 0.3)'
              }}
            >
              <span>Make this my focus →</span>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setShowChangeSelector(!showChangeSelector)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '9999px',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <RefreshCw size={14} />
                <span>Change Focus</span>
              </button>

              <span style={{ fontSize: '13px', color: '#059669', fontWeight: 600 }}>
                ✓ Currently set as your active Focus track
              </span>
            </div>
          )}
        </div>
      </div>


      {/* 6. PRACTICAL NEXT STEP SECTION */}
      {isFocusActive && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '32px',
          border: '1px solid #eef2f6',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
          marginBottom: '32px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Compass style={{ width: '22px', height: '22px', color: '#4f46e5' }} />
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
              Practical Next Step
            </h2>
          </div>

          <p style={{ fontSize: '15px', color: '#334155', lineHeight: 1.6, margin: '0 0 20px' }}>
            <strong>Try this next:</strong> {topicDetail.practicalNextStep}
          </p>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => setActiveTab && setActiveTab('radar')}
              style={{
                padding: '14px 28px',
                borderRadius: '9999px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)'
              }}
            >
              <span>Explore AI Radar Signals →</span>
            </button>

            <button
              onClick={() => setShowPracticeNote(!showPracticeNote)}
              style={{
                padding: '14px 24px',
                borderRadius: '9999px',
                backgroundColor: '#f8fafc',
                color: '#475569',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Start Practice Trial
            </button>
          </div>

          {showPracticeNote && (
            <div style={{
              marginTop: '16px',
              padding: '14px 18px',
              backgroundColor: '#fffbeb',
              borderRadius: '14px',
              border: '1px solid #fde68a',
              fontSize: '13px',
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Info size={16} /> Practical experimentation toolkits will become available as your AIIMS journey develops. Next stage: AI Radar!
            </div>
          )}
        </div>
      )}


      {/* 7. OTHER AREAS YOU COULD FOCUS ON (UNRANKED) */}
      {(alternativeAreas.length > 0 || showChangeSelector) && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '32px',
          border: '1px solid #eef2f6',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
          marginBottom: '32px'
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
            Other areas you could focus on
          </h3>

          <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#64748b' }}>
            AIIMS provides factual context from your analysis, but the decision is entirely yours. Changing your focus doesn't erase your previous Clarity work.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {alternativeAreas.map((altTopic) => {
              const altDetail = FOCUS_DETAILS_DATABASE[altTopic] || getFallbackFocusDetail(altTopic);

              return (
                <div
                  key={altTopic}
                  style={{
                    padding: '20px',
                    borderRadius: '16px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px'
                  }}
                >
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                      {altDetail.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.4 }}>
                      {altDetail.whyItMatters}
                    </p>
                  </div>

                  <button
                    onClick={() => handleChangeFocus(altTopic)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '9999px',
                      backgroundColor: '#ffffff',
                      color: '#4f46e5',
                      border: '1px solid #c7d2fe',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Select this Focus
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* 8. FOCUS HISTORY */}
      {focusHistory.length > 0 && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '24px 32px',
          border: '1px solid #eef2f6'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <History size={16} style={{ color: '#64748b' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Focus History
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {focusHistory.map((topic, idx) => (
              <span
                key={idx}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  backgroundColor: topic === activeFocusTrack ? '#e0e7ff' : '#f1f5f9',
                  color: topic === activeFocusTrack ? '#3730a3' : '#475569',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                {topic} {topic === activeFocusTrack ? '(Current)' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
