import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Award,
  TrendingUp,
  Sparkles,
  Coins,
  ChevronDown,
  ChevronUp,
  Compass,
  Star,
  Lock
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';

interface JourneyScreenProps {
  setActiveTab: (tab: string) => void;
}

export const JourneyScreen: React.FC<JourneyScreenProps> = ({ setActiveTab }) => {
  const { state } = useLearner();
  const credits = state.credits.balance;

  const isAssessmentDone = state.assessment.status === 'completed';
  const isAnalysisDone = state.analysis.status === 'viewed';
  const isAnalysisUnlocked = state.analysis.status !== 'locked';
  const isFocusActive = state.focus.status === 'active';
  const isRadarUnlocked = true;
  const isInvestigationDone = state.investigation.status === 'completed';
  const isRelevanceUnlocked = state.relevance.status !== 'locked';

  const [expandedStage, setExpandedStage] = useState<string | null>('assessment');

  // Compute actual overall journey completion %
  const completedCount = [
    isAssessmentDone,
    isAnalysisDone,
    state.clarity.status === 'completed',
    isFocusActive,
    state.radar.investigatedSignalIds.length > 0,
    isInvestigationDone,
    isRelevanceUnlocked
  ].filter(Boolean).length;

  const completionPercentage = Math.round((completedCount / 7) * 100);

  const stages = [
    {
      id: 'assessment',
      title: 'Assessment',
      status: isAssessmentDone ? 'completed' : 'current',
      date: isAssessmentDone ? (state.assessment.completedAt || '16 Sep 2026') : 'Active Stage',
      summary: isAssessmentDone ? '25 questions answered across 5 core dimensions' : 'Multidimensional AI baseline diagnostic',
      bullets: isAssessmentDone
        ? [
            'Discovered your AI usage pattern & baseline stage',
            'Created multidimensional AI capability profile',
            `Top capability identified: ${state.analysis.topCapability}`
          ]
        : [
            '25 questions across 5 dimensions',
            'Saves progress as you answer',
            'Awards +50 AIIMS Credits on completion'
          ],
      reward: '+50 AIIMS Credits',
      actionLabel: isAssessmentDone ? 'View Assessment Analysis' : 'Start Assessment',
      tabTarget: isAssessmentDone ? 'analysis' : 'assessment'
    },
    {
      id: 'analysis',
      title: 'Analysis',
      status: !isAnalysisUnlocked ? 'locked' : isAnalysisDone ? 'completed' : isAssessmentDone ? 'current' : 'upcoming',
      date: isAnalysisUnlocked ? 'Unlocked' : 'Locked',
      summary: 'Profile analyzed across Individual, Comparison & Cohort baseline',
      bullets: [
        `Top Capability: "${state.analysis.topCapability}"`,
        `Growth Opportunity: "${state.analysis.growthArea}"`,
        'Benchmarked against AI Product & Engineering peers'
      ],
      reward: '+10 AIIMS Credits',
      actionLabel: isAnalysisUnlocked ? 'View Full Analysis' : 'Complete Assessment to Unlock',
      tabTarget: isAnalysisUnlocked ? 'analysis' : 'assessment'
    },
    {
      id: 'clarity',
      title: 'Clarity',
      status: state.clarity.status === 'completed' || (state.clarity.completedTopics && state.clarity.completedTopics.length > 0)
        ? 'completed'
        : (state.clarity.selectedTopic ? 'current' : (isAnalysisDone ? 'available' : (isAnalysisUnlocked ? 'available' : 'locked'))),
      date: (state.clarity.status === 'completed' || (state.clarity.completedTopics && state.clarity.completedTopics.length > 0))
        ? 'Completed'
        : (state.clarity.selectedTopic ? 'In Progress' : (isAnalysisDone ? 'Available' : 'Locked')),
      summary: state.clarity.selectedTopic
        ? `Exploring: ${state.clarity.selectedTopic}`
        : `${(state.clarity.selectedAreas && state.clarity.selectedAreas.length) || 2} primary development areas identified`,
      bullets: state.clarity.selectedAreas && state.clarity.selectedAreas.length > 0
        ? state.clarity.selectedAreas
        : ['AI Workflow Design', 'AI Agents & Autonomous Workflows'],
      reward: 'Personal Development Clarity',
      actionLabel: state.clarity.selectedTopic ? `Continue Exploring (${state.clarity.selectedTopic})` : 'Explore Clarity Hub',
      tabTarget: isAnalysisUnlocked ? 'clarity' : 'assessment'
    },
    {
      id: 'focus',
      title: 'Focus',
      status: state.focus.status === 'active'
        ? 'completed'
        : (state.clarity.status === 'completed' || (state.clarity.completedTopics && state.clarity.completedTopics.length > 0) ? 'current' : (isAnalysisDone ? 'upcoming' : 'locked')),
      date: state.focus.status === 'active'
        ? (state.focus.activatedAt || 'Active Focus')
        : (state.clarity.status === 'completed' ? 'Available' : 'Locked'),
      summary: state.focus.status === 'active'
        ? `Active Focus: ${state.focus.selectedTrack}`
        : 'Decide your priority area of attention',
      bullets: state.focus.selectedTrack
        ? [`Active Track: ${state.focus.selectedTrack}`, 'Target capability: Repeatable AI Workflow']
        : ['Awaiting Focus Decision', 'Explored via Clarity'],
      reward: 'Priority Direction Decision',
      actionLabel: state.focus.status === 'active' ? `View Focus Track (${state.focus.selectedTrack})` : 'Decide Focus Track',
      tabTarget: isAnalysisUnlocked ? 'focus' : 'assessment'
    },
    {
      id: 'radar',
      title: 'AI Radar',
      status: state.radar.investigatedSignalIds.length > 0 ? 'completed' : 'current',
      date: 'Available',
      summary: `${state.radar.investigatedSignalIds.length} real-time AI landscape signals explored`,
      bullets: [
        'Signal: "AI Agents moving from chat to action"',
        'Evaluating relevance to your focus track'
      ],
      reward: '+30 Credits per Investigation',
      actionLabel: 'Explore AI Radar',
      tabTarget: 'radar'
    },
    {
      id: 'investigation',
      title: 'Investigation',
      status: isInvestigationDone ? 'completed' : 'upcoming',
      date: isInvestigationDone ? 'Completed' : 'Next Stage',
      summary: 'Deep-dive structured analysis of active market signals',
      bullets: [
        'Formulate hypotheses on emerging AI tools',
        'Simulate impact on workflow'
      ],
      reward: '+15 AIIMS Credits',
      actionLabel: isInvestigationDone ? 'View Investigation' : 'Start Investigation',
      tabTarget: 'radar'
    },
    {
      id: 'relevance',
      title: 'AI Relevance',
      status: isRelevanceUnlocked ? 'unlocked' : 'locked',
      date: isRelevanceUnlocked ? 'Unlocked' : 'Future Stage',
      summary: 'Personalized action plan connecting signals to career goals',
      bullets: [
        'Actionable implementation project blueprint',
        'Mentorship feedback loop'
      ],
      reward: '+25 AIIMS Credits',
      actionLabel: isRelevanceUnlocked ? 'View Relevance Map' : 'Investigate Signal to Unlock',
      tabTarget: isRelevanceUnlocked ? 'relevance' : 'radar'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1140px', margin: '0 auto' }}>

      {/* 1. PAGE HEADER */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <Compass style={{ width: '28px', height: '28px', color: '#4f46e5' }} />
          <h1 style={{
            margin: 0,
            fontSize: '32px',
            fontWeight: 800,
            color: '#0f172a',
            fontFamily: "'Outfit', sans-serif"
          }}>
            My AI Journey
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: '15px', color: '#64748b', fontWeight: 500 }}>
          From where I started → to where I'm going
        </p>
      </div>


      {/* 2. REAL SUPPORTING METRICS GRID (TOP SUMMARY) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px'
      }}>
        {/* Metric 1 */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '20px 24px',
          border: '1px solid #eef2f6',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
              Journey Completion
            </span>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginTop: '4px', fontFamily: "'Outfit', sans-serif" }}>
              {completionPercentage}%
            </div>
          </div>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            backgroundColor: '#e0e7ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <TrendingUp style={{ width: '22px', height: '22px', color: '#4f46e5' }} />
          </div>
        </div>

        {/* Metric 2 */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '20px 24px',
          border: '1px solid #eef2f6',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
              Discoveries Made
            </span>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginTop: '4px', fontFamily: "'Outfit', sans-serif" }}>
              {state.radar.investigatedSignalIds.length + (isAssessmentDone ? 2 : 0)}
            </div>
          </div>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            backgroundColor: '#e0f2fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles style={{ width: '22px', height: '22px', color: '#0284c7' }} />
          </div>
        </div>

        {/* Metric 3 */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '20px 24px',
          border: '1px solid #eef2f6',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
              AIIMS Credits
            </span>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginTop: '4px', fontFamily: "'Outfit', sans-serif" }}>
              {credits}
            </div>
          </div>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            backgroundColor: '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Coins style={{ width: '22px', height: '22px', color: '#d97706' }} />
          </div>
        </div>
      </div>


      {/* 3. CENTRAL VISUAL JOURNEY TIMELINE */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '28px',
        padding: '36px',
        border: '1px solid #eef2f6',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
      }}>
        <h2 style={{
          margin: '0 0 24px 0',
          fontSize: '20px',
          fontWeight: 800,
          color: '#0f172a',
          fontFamily: "'Outfit', sans-serif",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>Progression Path</span>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>START → NEXT</span>
        </h2>

        <div style={{ position: 'relative', paddingLeft: '28px' }}>
          {/* Vertical Connecting Line */}
          <div style={{
            position: 'absolute',
            top: '20px',
            bottom: '20px',
            left: '11px',
            width: '3px',
            backgroundColor: '#e2e8f0',
            zIndex: 1
          }} />

          {/* Render Timeline Cards */}
          {stages.map((stage) => {
            const isCompleted = stage.status === 'completed';
            const isCurrent = stage.status === 'current';
            const isLocked = stage.status === 'locked';
            const isExpanded = expandedStage === stage.id;

            return (
              <div
                key={stage.id}
                style={{
                  position: 'relative',
                  zIndex: 2,
                  marginBottom: '24px'
                }}
              >
                {/* Node Icon on Line */}
                <div style={{
                  position: 'absolute',
                  left: '-28px',
                  top: '16px',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#ffffff',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {isCompleted && (
                    <CheckCircle2 style={{ width: '24px', height: '24px', color: '#10b981', fill: '#dcfce7' }} />
                  )}
                  {isCurrent && (
                    <div style={{
                      position: 'relative',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{
                        position: 'absolute',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(79, 70, 229, 0.25)',
                        animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
                      }} />
                      <div style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: '#4f46e5',
                        border: '3px solid #ffffff'
                      }} />
                    </div>
                  )}
                  {isLocked && (
                    <Lock style={{ width: '20px', height: '20px', color: '#cbd5e1' }} />
                  )}
                  {!isCompleted && !isCurrent && !isLocked && (
                    <Circle style={{ width: '22px', height: '22px', color: '#cbd5e1', fill: '#f8fafc' }} />
                  )}
                </div>

                {/* Card Container */}
                <div style={{
                  backgroundColor: isCurrent ? '#f5f3ff' : isLocked ? '#f8fafc' : '#ffffff',
                  borderRadius: '20px',
                  border: isCurrent ? '2px solid #818cf8' : isLocked ? '1px dashed #cbd5e1' : '1px solid #e2e8f0',
                  padding: '20px 24px',
                  transition: 'all 0.2s ease',
                  opacity: isLocked ? 0.75 : 1
                }}>
                  {/* Top Bar inside Card */}
                  <div
                    onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                          {stage.title}
                        </h3>
                        {isCurrent && (
                          <span style={{
                            padding: '2px 10px',
                            backgroundColor: '#4f46e5',
                            color: '#ffffff',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: 700
                          }}>
                            YOU ARE HERE
                          </span>
                        )}
                        {isCompleted && (
                          <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                            ✓ Completed
                          </span>
                        )}
                        {isLocked && (
                          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
                            🔒 Locked
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                        {stage.summary}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
                        {stage.date}
                      </span>
                      {isExpanded ? (
                        <ChevronUp style={{ width: '18px', height: '18px', color: '#64748b' }} />
                      ) : (
                        <ChevronDown style={{ width: '18px', height: '18px', color: '#64748b' }} />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div style={{
                      marginTop: '16px',
                      paddingTop: '16px',
                      borderTop: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                        Key Highlights:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                        {stage.bullets.map((b, idx) => (
                          <li key={idx}>{b}</li>
                        ))}
                      </ul>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '8px'
                      }}>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#d97706',
                          backgroundColor: '#fef3c7',
                          padding: '4px 10px',
                          borderRadius: '8px'
                        }}>
                          💠 {stage.reward}
                        </span>

                        <button
                          onClick={() => setActiveTab(stage.tabTarget)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            backgroundColor: isLocked ? '#94a3b8' : '#4f46e5',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '9999px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <span>{stage.actionLabel}</span>
                          <ArrowRight style={{ width: '14px', height: '14px' }} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
