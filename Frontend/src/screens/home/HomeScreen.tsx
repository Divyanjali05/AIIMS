import React from 'react';
import {
  Sparkles,
  ArrowRight,
  Target,
  Radio,
  Coins,
  MessageSquare,
  BarChart3,
  Compass,
  CheckCircle2,
  TrendingUp,
  Zap,
  Lock
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';

interface HomeScreenProps {
  setActiveTab: (tab: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ setActiveTab }) => {
  const { state } = useLearner();
  const userName = state.profile?.name ? state.profile.name.split(' ')[0] : 'Divya';
  const credits = state.credits.balance;

  const isAssessmentCompleted = state.assessment.status === 'completed';
  const isAnalysisViewed = state.analysis.status === 'viewed' || state.analysis.status === 'unlocked';

  // Dynamic Content based on Learner State
  let headerSubtitle = "Here's what's happening with your AI journey.";
  let mentorBriefText = "";
  let primaryCtaText = "";
  let primaryCtaTab = "";
  let contextualFocusLabel = "";

  const clarityStatus = state.clarity.status;
  const selectedClarityTopic = state.clarity.selectedTopic;
  const completedTopics = state.clarity.completedTopics || [];
  const latestCompletedTopic = selectedClarityTopic || completedTopics[0];

  const isFocusActive = state.focus.status === 'active' && state.focus.selectedTrack !== null;
  const activeFocusTrack = state.focus.selectedTrack || 'AI Workflow Design';

  if (!isAssessmentCompleted) {
    headerSubtitle = "Your AI journey starts with understanding where you are today.";
    mentorBriefText = "Let's start by completing your multidimensional baseline diagnostic. AIIMS needs to understand how you currently approach AI usage, capability evaluation, and workflow design.";
    primaryCtaText = "Start Assessment";
    primaryCtaTab = "assessment";
    contextualFocusLabel = "Next Step: Baseline Assessment";
  } else if (!isAnalysisViewed) {
    headerSubtitle = "Your AI profile is ready. Here's what AIIMS discovered.";
    mentorBriefText = `Your assessment is complete! Your strongest capability is ${state.analysis.topCapability}, but your ${state.analysis.growthArea} has room to grow. Open your Analysis to see what AIIMS discovered.`;
    primaryCtaText = "View Analysis";
    primaryCtaTab = "analysis";
    contextualFocusLabel = "Analysis Unlocked";
  } else if (isFocusActive) {
    headerSubtitle = `Your active focus is ${activeFocusTrack}.`;
    mentorBriefText = `Your current priority focus track is ${activeFocusTrack}. Explore real-time market signals in AI Radar relevant to your focus.`;
    primaryCtaText = "Explore AI Radar Signals";
    primaryCtaTab = "radar";
    contextualFocusLabel = `Active Focus: ${activeFocusTrack}`;
  } else if (clarityStatus === 'completed' || completedTopics.length > 0) {
    const topic = latestCompletedTopic || 'AI Workflow Design';
    headerSubtitle = `You've built clarity around ${topic}. Decide what matters next.`;
    mentorBriefText = `Now that you have built clarity around ${topic}, continue to Focus to set your priority learning track.`;
    primaryCtaText = "Continue to Focus";
    primaryCtaTab = "focus";
    contextualFocusLabel = `Clarity Built: ${topic}`;
  } else if (selectedClarityTopic) {
    headerSubtitle = `Continue exploring ${selectedClarityTopic}.`;
    mentorBriefText = `You're currently exploring ${selectedClarityTopic}. Open Clarity to finish your understanding journey and practical reflection.`;
    primaryCtaText = `Continue Exploring ${selectedClarityTopic}`;
    primaryCtaTab = "clarity";
    contextualFocusLabel = `Exploring: ${selectedClarityTopic}`;
  } else {
    headerSubtitle = "Explore what you want to understand better.";
    mentorBriefText = "Your analysis identified areas for development. Open Clarity to choose an area you'd like to understand.";
    primaryCtaText = "Explore Clarity";
    primaryCtaTab = "clarity";
    contextualFocusLabel = "Explore Clarity";
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1140px', margin: '0 auto' }}>

      {/* 1. GREETING HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{
            margin: '0 0 6px 0',
            fontSize: '32px',
            fontWeight: 800,
            color: '#0f172a',
            fontFamily: "'Outfit', sans-serif"
          }}>
            Good morning, {userName} 👋
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: '#64748b', fontWeight: 500 }}>
            {headerSubtitle}
          </p>
        </div>

        {/* Dynamic Contextual Indicator Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          backgroundColor: isAssessmentCompleted ? '#eef2ff' : '#fef3c7',
          borderRadius: '9999px',
          border: isAssessmentCompleted ? '1px solid #c7d2fe' : '1px solid #fde68a',
          fontSize: '13px',
          fontWeight: 600,
          color: isAssessmentCompleted ? '#4f46e5' : '#b45309'
        }}>
          <Zap style={{ width: '15px', height: '15px', color: isAssessmentCompleted ? '#4f46e5' : '#d97706' }} />
          <span>{contextualFocusLabel}</span>
        </div>
      </div>


      {/* 2. ZONE A: DYNAMIC AIIMS MENTOR BRIEF */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
        borderRadius: '24px',
        padding: '32px 36px',
        color: '#ffffff',
        boxShadow: '0 12px 36px rgba(49, 46, 129, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glowing background accent */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(129, 140, 248, 0.3) 0%, rgba(0, 0, 0, 0) 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Sparkles style={{ width: '18px', height: '18px', color: '#a5b4fc' }} />
          <span style={{
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '1.5px',
            color: '#c7d2fe',
            textTransform: 'uppercase'
          }}>
            AIIMS MENTOR BRIEF
          </span>
        </div>

        <p style={{
          fontSize: '17px',
          lineHeight: 1.6,
          fontWeight: 400,
          color: '#e0e7ff',
          margin: '0 0 24px 0',
          maxWidth: '840px'
        }}>
          "{mentorBriefText}"
        </p>

        <button
          onClick={() => setActiveTab(primaryCtaTab)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 24px',
            backgroundColor: '#ffffff',
            color: '#312e81',
            border: 'none',
            borderRadius: '9999px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e0e7ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
          }}
        >
          <span>{primaryCtaText}</span>
          <ArrowRight style={{ width: '16px', height: '16px' }} />
        </button>
      </div>


      {/* 3. ZONE B: WHAT NEEDS YOUR ATTENTION? */}
      <div>
        <h2 style={{
          margin: '0 0 16px 0',
          fontSize: '18px',
          fontWeight: 700,
          color: '#0f172a',
          fontFamily: "'Outfit', sans-serif"
        }}>
          WHAT NEEDS YOUR ATTENTION?
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px'
        }}>

          {/* Card 1: Your Focus / Assessment Status */}
          <div
            onClick={() => setActiveTab(isAssessmentCompleted ? 'focus' : 'assessment')}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid #eef2f6',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.2s ease, boxShadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.02)';
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Target style={{ width: '18px', height: '18px', color: '#4f46e5' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#4f46e5' }}>
                  {isAssessmentCompleted ? '🎯 Your Focus' : '📄 Assessment Pending'}
                </span>
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                {isAssessmentCompleted ? activeFocusTrack : 'Take Baseline Assessment'}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                {isAssessmentCompleted ? 'Active skill development track' : '25-question multidimensional evaluation'}
              </p>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '20px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#4f46e5'
            }}>
              <span>{isAssessmentCompleted ? 'Continue exploring' : 'Start Assessment'}</span>
              <ArrowRight style={{ width: '14px', height: '14px' }} />
            </div>
          </div>

          {/* Card 2: New Signal */}
          <div
            onClick={() => setActiveTab('radar')}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid #eef2f6',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.2s ease, boxShadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.02)';
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Radio style={{ width: '18px', height: '18px', color: '#0284c7' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7' }}>🔭 New Signal</span>
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a', lineHeight: 1.35 }}>
                AI Agents are moving from chat to action.
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                High relevance to your capability profile
              </p>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '20px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#0284c7'
            }}>
              <span>Investigate</span>
              <ArrowRight style={{ width: '14px', height: '14px' }} />
            </div>
          </div>

          {/* Card 3: Real Dynamic Credits */}
          <div
            onClick={() => setActiveTab('credits')}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid #eef2f6',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.2s ease, boxShadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.02)';
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Coins style={{ width: '18px', height: '18px', color: '#d97706' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#d97706' }}>💠 Credits</span>
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '26px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
                {credits}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Available AIIMS Credits balance
              </p>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '20px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#d97706'
            }}>
              <span>View wallet</span>
              <ArrowRight style={{ width: '14px', height: '14px' }} />
            </div>
          </div>

        </div>
      </div>


      {/* 4. TODAY IN AIIMS DYNAMIC SUMMARY BAR */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '24px 32px',
        border: '1px solid #eef2f6',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <TrendingUp style={{ width: '18px', height: '18px', color: '#4f46e5' }} />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Today in AIIMS</h3>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px',
          paddingTop: '12px',
          borderTop: '1px solid #f1f5f9'
        }}>
          <div>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Current Focus</span>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
              {isAssessmentCompleted ? activeFocusTrack : 'Baseline Assessment'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>New Insight</span>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
              {isAssessmentCompleted ? 'AI evaluation is top strength' : 'Diagnostic ready'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Next Step</span>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#4f46e5', marginTop: '4px' }}>
              {isAssessmentCompleted ? 'Explore Analysis →' : 'Start Assessment →'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Credits</span>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#d97706', marginTop: '4px' }}>{credits} AIIMS</div>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Progress</span>
            <div style={{ fontSize: '13px', fontWeight: 700, color: isAssessmentCompleted ? '#10b981' : '#f59e0b', marginTop: '4px' }}>
              {isAssessmentCompleted ? '38% Complete' : '0% Complete'}
            </div>
          </div>
        </div>
      </div>


      {/* 5. ZONE C: CONTEXTUAL QUICK ACTIONS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 700,
          color: '#0f172a',
          fontFamily: "'Outfit', sans-serif"
        }}>
          What would you like to do?
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px'
        }}>

          {/* Dynamic Action 1 */}
          <button
            onClick={() => setActiveTab(isAssessmentCompleted ? 'analysis' : 'assessment')}
            style={{
              padding: '16px 20px',
              backgroundColor: '#eef2ff',
              border: '1px solid #c7d2fe',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              color: '#3730a3',
              fontWeight: 700,
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            <span>{isAssessmentCompleted ? 'Explore My Analysis' : 'Complete Assessment'}</span>
            <ArrowRight style={{ width: '16px', height: '16px' }} />
          </button>

          {/* Action 2 */}
          <button
            onClick={() => setActiveTab('radar')}
            style={{
              padding: '16px 20px',
              backgroundColor: '#ffffff',
              border: '1px solid #eef2f6',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              color: '#334155',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            <span>Explore Radar</span>
            <ArrowRight style={{ width: '16px', height: '16px', color: '#94a3b8' }} />
          </button>

          {/* Action 3 */}
          <button
            onClick={() => setActiveTab('mentor')}
            style={{
              padding: '16px 20px',
              backgroundColor: '#ffffff',
              border: '1px solid #eef2f6',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              color: '#334155',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            <span>Talk to Mentor</span>
            <ArrowRight style={{ width: '16px', height: '16px', color: '#94a3b8' }} />
          </button>

          {/* Action 4 */}
          <button
            onClick={() => setActiveTab('journey')}
            style={{
              padding: '16px 20px',
              backgroundColor: '#ffffff',
              border: '1px solid #eef2f6',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              color: '#334155',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            <span>View My Journey</span>
            <ArrowRight style={{ width: '16px', height: '16px', color: '#94a3b8' }} />
          </button>

        </div>
      </div>

    </div>
  );
};
