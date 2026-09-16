import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { useLearner } from '../../context/LearnerContext';
import {
  BarChart3,
  Users,
  Globe,
  TrendingUp,
  AlertTriangle,
  Lock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Brain,
  Compass
} from 'lucide-react';

interface AnalysisScreenProps {
  setActiveTab?: (tab: string) => void;
}

export const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ setActiveTab }) => {
  const { state, viewAnalysis, selectClarityArea } = useLearner();
  const [activeSubTab, setActiveSubTab] = useState<'me' | 'compare' | 'overall'>('me');

  const isCompleted = state.assessment.status === 'completed';

  useEffect(() => {
    if (isCompleted) {
      viewAnalysis();
    }
  }, [isCompleted]);

  const handleExploreArea = (areaName: string) => {
    selectClarityArea(areaName);
    if (setActiveTab) {
      setActiveTab('clarity');
    }
  };

  // 1. LOCKED STATE (If assessment has not been completed)
  if (!isCompleted) {
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
            Your Analysis is Waiting
          </h2>

          <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6, margin: '0 0 32px' }}>
            Complete your AI Assessment first. Your responses will give AIIMS the information it needs to create your profile.
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

  // Real assessment scores derived from LearnerState
  const scores = state.assessment.scores || {
    usageFrequency: 68,
    evaluationCapability: 82,
    workflowDesign: 54,
    strategicVision: 70,
    mentorshipReadiness: 65
  };

  return (
    <div style={{ maxWidth: '1060px', margin: '32px auto', padding: '0 20px' }}>

      {/* 2. PAGE HEADER */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 800,
          color: '#0f172a',
          margin: '0 0 6px 0',
          fontFamily: "'Outfit', sans-serif"
        }}>
          Your AI Profile
        </h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: '15px', fontWeight: 500 }}>
          Here's what AIIMS discovered from your assessment.
        </p>
      </div>

      {/* 3. PERSPECTIVES TAB SELECTOR (ME / COMPARE / OVERALL) */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <button
          onClick={() => setActiveSubTab('me')}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: '14px',
            border: activeSubTab === 'me' ? '2px solid #4f46e5' : '1px solid #e2e8f0',
            backgroundColor: activeSubTab === 'me' ? '#e0e7ff' : '#ffffff',
            color: activeSubTab === 'me' ? '#3730a3' : '#475569',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <BarChart3 size={18} /> Me
        </button>

        <button
          onClick={() => setActiveSubTab('compare')}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: '14px',
            border: activeSubTab === 'compare' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
            backgroundColor: activeSubTab === 'compare' ? '#f3e8ff' : '#ffffff',
            color: activeSubTab === 'compare' ? '#5b21b6' : '#475569',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <Users size={18} /> Compare
        </button>

        <button
          onClick={() => setActiveSubTab('overall')}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: '14px',
            border: activeSubTab === 'overall' ? '2px solid #0284c7' : '1px solid #e2e8f0',
            backgroundColor: activeSubTab === 'overall' ? '#e0f2fe' : '#ffffff',
            color: activeSubTab === 'overall' ? '#0369a1' : '#475569',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <Globe size={18} /> Overall
        </button>
      </div>


      {/* 4. PERSPECTIVE 1: ME (INDIVIDUAL PROFILE) */}
      {activeSubTab === 'me' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          {/* Dimension Profile Summary Cards */}
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0', fontFamily: "'Outfit', sans-serif" }}>
              Profile Dimensions
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>

              {/* Dimension 1 */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #eef2f6', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>How you use AI</span>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#4f46e5', margin: '6px 0', fontFamily: "'Outfit', sans-serif" }}>
                  {scores.usageFrequency} <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>/ 100</span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                  Your responses indicate you regularly consult AI tools for drafting and task-level assistance.
                </p>
              </div>

              {/* Dimension 2 */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #eef2f6', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>How you evaluate AI</span>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#10b981', margin: '6px 0', fontFamily: "'Outfit', sans-serif" }}>
                  {scores.evaluationCapability} <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>/ 100</span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                  Your responses indicate relatively strong attention to checking and evaluating AI output for accuracy.
                </p>
              </div>

              {/* Dimension 3 */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #eef2f6', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>How you work with AI</span>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#d97706', margin: '6px 0', fontFamily: "'Outfit', sans-serif" }}>
                  {scores.workflowDesign} <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>/ 100</span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                  You appear comfortable interacting with AI, with room to move from single prompts to repeatable workflows.
                </p>
              </div>

            </div>
          </div>


          {/* What you're doing well (Strengths) */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '28px 32px', border: '1px solid #eef2f6', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <TrendingUp style={{ width: '22px', height: '22px', color: '#10b981' }} />
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
                What you're doing well
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '16px 20px', backgroundColor: '#ecfdf5', borderRadius: '16px', border: '1px solid #a7f3d0' }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: '#047857' }}>
                  Evaluating AI Output
                </h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#166534', lineHeight: 1.5 }}>
                  Your responses suggest that you pay attention to whether AI-generated information should be trusted or verified before relying on it.
                </p>
              </div>

              <div style={{ padding: '16px 20px', backgroundColor: '#ecfdf5', borderRadius: '16px', border: '1px solid #a7f3d0' }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: '#047857' }}>
                  Human Oversight & Judgment
                </h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#166534', lineHeight: 1.5 }}>
                  You maintain clear boundaries on where AI tools assist versus where human decision-making remains critical.
                </p>
              </div>
            </div>
          </div>


          {/* Areas worth developing */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '28px 32px', border: '1px solid #eef2f6', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <AlertTriangle style={{ width: '22px', height: '22px', color: '#d97706' }} />
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
                Areas worth developing
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Development Area 1 */}
              <div style={{
                padding: '20px',
                backgroundColor: '#fffbeb',
                borderRadius: '16px',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: '#92400e' }}>
                    AI Workflow Design
                  </h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#b45309', lineHeight: 1.5 }}>
                    You appear comfortable interacting with AI, but there is an opportunity to move from individual AI interactions toward repeatable workflows.
                  </p>
                </div>

                <button
                  onClick={() => handleExploreArea('AI Workflow & Architecture Design')}
                  style={{
                    padding: '10px 18px',
                    backgroundColor: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '9999px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Explore this</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* Development Area 2 */}
              <div style={{
                padding: '20px',
                backgroundColor: '#fffbeb',
                borderRadius: '16px',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: '#92400e' }}>
                    AI Agents & Autonomous Workflows
                  </h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#b45309', lineHeight: 1.5 }}>
                    Opportunity to transition from simple conversational queries to multi-turn agentic task delegation.
                  </p>
                </div>

                <button
                  onClick={() => handleExploreArea('AI Agents & Autonomous Workflows')}
                  style={{
                    padding: '10px 18px',
                    backgroundColor: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '9999px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Explore this</span>
                  <ArrowRight size={14} />
                </button>
              </div>

            </div>
          </div>


          {/* Conversational "✦ What I noticed" Mentor Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            borderRadius: '24px',
            padding: '28px 32px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 24px rgba(49, 46, 129, 0.2)'
          }}>
            <div style={{ maxWidth: '680px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Sparkles style={{ width: '18px', height: '18px', color: '#a5b4fc' }} />
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  WHAT I NOTICED
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '16px', color: '#e0e7ff', lineHeight: 1.55 }}>
                "You already have experience using AI in your work. One area worth exploring further is how you turn individual AI interactions into a repeatable process."
              </p>
            </div>

            <button
              onClick={() => handleExploreArea('AI Workflow Design')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#ffffff',
                color: '#312e81',
                border: 'none',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
              }}
            >
              <span>Explore this</span>
              <ArrowRight size={16} />
            </button>
          </div>


          {/* What would you like to understand better? Bridge to Clarity */}
          <div style={{ marginTop: '8px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0', fontFamily: "'Outfit', sans-serif" }}>
              What would you like to understand better?
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

              <div
                onClick={() => handleExploreArea('AI Agents & Autonomous Workflows')}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '20px',
                  padding: '24px',
                  border: '1px solid #eef2f6',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
                }}
              >
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    AI Agents & Autonomous Workflows
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Understand how agents execute multi-step tasks
                  </p>
                </div>
                <ArrowRight style={{ width: '18px', height: '18px', color: '#4f46e5' }} />
              </div>

              <div
                onClick={() => handleExploreArea('AI Workflow & Architecture Design')}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '20px',
                  padding: '24px',
                  border: '1px solid #eef2f6',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
                }}
              >
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    AI Workflow Design
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Create structured, repeatable AI execution flows
                  </p>
                </div>
                <ArrowRight style={{ width: '18px', height: '18px', color: '#4f46e5' }} />
              </div>

            </div>
          </div>

        </div>
      )}


      {/* 5. PERSPECTIVE 2: COMPARE */}
      {activeSubTab === 'compare' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px', border: '1px solid #eef2f6' }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
              Compare
            </h2>
            <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px' }}>
              Understand how your profile relates to a relevant group.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#4f46e5', marginBottom: '4px' }}>
                  AI Evaluation Comparison
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
                  Your responses show stronger emphasis on AI evaluation than the selected group average.
                </p>
              </div>

              <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7', marginBottom: '4px' }}>
                  Workflow Design Comparison
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
                  Your workflow design alignment is close to the peer cohort baseline, with opportunities to explore agentic orchestration.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* 6. PERSPECTIVE 3: OVERALL */}
      {activeSubTab === 'overall' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px', border: '1px solid #eef2f6' }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
              Overall Cohort Insights
            </h2>
            <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px' }}>
              Understand what AIIMS is seeing across students.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div style={{ padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '16px', border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>Common Strength</span>
                <h3 style={{ margin: '6px 0 0 0', fontSize: '16px', fontWeight: 700, color: '#166534' }}>AI-assisted exploration</h3>
              </div>

              <div style={{ padding: '20px', backgroundColor: '#fff1f2', borderRadius: '16px', border: '1px solid #fecdd3' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#be123c', textTransform: 'uppercase' }}>Common Development Area</span>
                <h3 style={{ margin: '6px 0 0 0', fontSize: '16px', fontWeight: 700, color: '#9f1239' }}>AI Workflow & Agent Design</h3>
              </div>

              <div style={{ padding: '20px', backgroundColor: '#e0f2fe', borderRadius: '16px', border: '1px solid #bae6fd' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>Emerging Behaviour</span>
                <h3 style={{ margin: '6px 0 0 0', fontSize: '16px', fontWeight: 700, color: '#075985' }}>More students using AI daily</h3>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
