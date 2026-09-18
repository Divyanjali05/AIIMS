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
  Zap,
  Info,
  History,
  Radar
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { MentorMessage } from '../../components/common/MentorMessage';

interface FocusScreenProps {
  setActiveTab?: (tab: string) => void;
}

interface TopicFocusDetail {
  title: string;
  whyThisMatters: string;
  practicalNextStep: string;
  suggestedAction: string;
}

const FOCUS_DETAILS_DATABASE: Record<string, TopicFocusDetail> = {
  'AI Workflow Design': {
    title: 'AI Workflow Design',
    whyThisMatters: 'Establishing repeatable AI workflows gives you high leverage by turning one-off prompting into reliable, multi-step processes.',
    practicalNextStep: 'Take one repeated task from your week (e.g., weekly status reporting) and map out the inputs, prompt steps, and verification checks.',
    suggestedAction: 'Map a 3-step repeatable workflow for your weekly update'
  },
  'AI Workflow & Architecture Design': {
    title: 'AI Workflow Design',
    whyThisMatters: 'Establishing repeatable AI workflows gives you high leverage by turning one-off prompting into reliable, multi-step processes.',
    practicalNextStep: 'Take one repeated task from your week (e.g., weekly status reporting) and map out the inputs, prompt steps, and verification checks.',
    suggestedAction: 'Map a 3-step repeatable workflow for your weekly update'
  },
  'AI Agents & Autonomous Workflows': {
    title: 'AI Agents & Autonomous Workflows',
    whyThisMatters: 'Delegating multi-step goals to autonomous AI tools allows you to shift from line-by-line prompting to high-level goal delegation.',
    practicalNextStep: 'Define a multi-step research or data auditing goal and specify clear tool boundaries and review checkpoints for an AI agent assistant.',
    suggestedAction: 'Specify goal & boundaries for an autonomous agent task'
  }
};

const getFallbackFocusDetail = (topicName: string): TopicFocusDetail => {
  return {
    title: topicName,
    whyThisMatters: `Focusing on ${topicName} allows you to turn concepts explored in Clarity into practical work habits.`,
    practicalNextStep: `Identify one recurring scenario in your work where applying ${topicName} creates immediate efficiency or quality gains.`,
    suggestedAction: `Apply ${topicName} to one active work project`
  };
};

export const FocusScreen: React.FC<FocusScreenProps> = ({ setActiveTab }) => {
  const {
    state,
    selectFocusTrack,
    changeFocusTrack
  } = useLearner();

  const isAssessmentCompleted = state.assessment.status === 'completed';
  const isAnalysisViewed = state.analysis.status === 'viewed' || state.analysis.status === 'unlocked';
  const isClarityExplored = state.clarity.status === 'completed' || (state.clarity.completedTopics && state.clarity.completedTopics.length > 0) || state.clarity.selectedTopic !== null;

  const activeFocusTrack = state.focus.selectedTrack;
  const focusStatus = state.focus.status;
  const isFocusActive = focusStatus === 'active';
  const focusHistory = state.focus.history || [];
  const reflections = state.clarity.reflections || {};

  const defaultCandidate = state.clarity.selectedTopic || state.clarity.completedTopics[0] || (state.clarity.selectedAreas && state.clarity.selectedAreas[0]) || 'AI Workflow Design';
  const [candidateTopic, setCandidateTopic] = useState<string>(defaultCandidate);
  const [showChangeSelector, setShowChangeSelector] = useState<boolean>(false);

  if (!isAssessmentCompleted) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
        <Surface variant="amber" radius="lg" padding="lg">
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#d97706'
          }}>
            <Lock size={28} />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: "'Fredoka', sans-serif" }}>
            Focus comes after understanding your profile
          </h2>

          <p style={{ color: '#78350f', fontSize: '14px', lineHeight: 1.5, margin: '0 0 24px' }}>
            Complete your AI Assessment first. AIIMS will evaluate your profile and help you decide where to focus.
          </p>

          <Button
            variant="amber"
            size="lg"
            icon={<ArrowRight size={16} />}
            onClick={() => setActiveTab && setActiveTab('assessment')}
          >
            Start Assessment
          </Button>
        </Surface>
      </div>
    );
  }

  if (!isAnalysisViewed) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
        <Surface variant="amber" radius="lg" padding="lg">
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#d97706'
          }}>
            <Brain size={28} />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: "'Fredoka', sans-serif" }}>
            Your profile comes first
          </h2>

          <p style={{ color: '#78350f', fontSize: '14px', lineHeight: 1.5, margin: '0 0 24px' }}>
            Open your Analysis to understand what AIIMS discovered about how you work with AI.
          </p>

          <Button
            variant="amber"
            size="lg"
            icon={<ArrowRight size={16} />}
            onClick={() => setActiveTab && setActiveTab('analysis')}
          >
            View Analysis
          </Button>
        </Surface>
      </div>
    );
  }

  if (!isClarityExplored) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
        <Surface variant="amber" radius="lg" padding="lg">
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: '#e0f2fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#0284c7'
          }}>
            <Compass size={28} />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: "'Fredoka', sans-serif" }}>
            Build some Clarity first
          </h2>

          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.5, margin: '0 0 24px' }}>
            Explore an area from your profile before deciding where to focus. Clarity will help you understand the concept first.
          </p>

          <Button
            variant="primary"
            size="lg"
            icon={<ArrowRight size={16} />}
            onClick={() => setActiveTab && setActiveTab('clarity')}
          >
            Explore Clarity
          </Button>
        </Surface>
      </div>
    );
  }

  const displayTopic = isFocusActive && activeFocusTrack && !showChangeSelector
    ? activeFocusTrack
    : candidateTopic;

  const topicDetail = FOCUS_DETAILS_DATABASE[displayTopic] || getFallbackFocusDetail(displayTopic);
  const savedReflection = reflections[displayTopic] || null;

  const alternativeAreas = (state.clarity.selectedAreas || [
    'AI Workflow Design',
    'AI Agents & Autonomous Workflows'
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
    <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* PAGE HEADER */}
      <PageHeader
        icon={<Target size={24} />}
        title="Personal Decision Workspace"
        description="Focus is an intentional choice. Decide where you want to focus your primary attention."
        badge={{ label: 'Amber / Orange Focus Environment', variant: 'warning' }}
      />

      {/* MAIN DECISION WORKSPACE (GRADIENT FOCUS PANEL) */}
      <Surface
        variant={isFocusActive && !showChangeSelector ? 'gradient-hero' : 'gradient-focus'}
        radius="lg"
        padding="lg"
        style={{
          borderLeft: isFocusActive && !showChangeSelector ? '6px solid #4f46e5' : '6px solid #d97706'
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 800, color: isFocusActive && !showChangeSelector ? '#3730a3' : '#b45309', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
          {isFocusActive && !showChangeSelector ? 'YOUR CURRENT ACTIVE FOCUS' : 'YOU ARE CONSIDERING'}
        </div>

        <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', fontFamily: "'Fredoka', sans-serif" }}>
          {topicDetail.title}
        </h2>

        {/* WHY THIS MATTERS */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #fde68a',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', marginBottom: '4px' }}>
            WHY THIS MATTERS
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: '#78350f', lineHeight: 1.5, fontWeight: 500 }}>
            {topicDetail.whyThisMatters}
          </p>
        </div>

        {/* WHAT YOU ALREADY DISCOVERED */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #a7f3d0',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#047857', textTransform: 'uppercase', marginBottom: '4px' }}>
            WHAT YOU ALREADY DISCOVERED IN CLARITY
          </div>
          {savedReflection ? (
            <p style={{ margin: 0, fontSize: '13px', color: '#064e3b', fontStyle: 'italic', lineHeight: 1.5 }}>
              "{savedReflection}"
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
              You explored {topicDetail.title} conceptually. Add a reflection in Clarity anytime to connect it further.
            </p>
          )}
        </div>

        {/* ACTION / CTA */}
        {(!isFocusActive || showChangeSelector || activeFocusTrack !== displayTopic) ? (
          <Button
            variant="amber"
            size="lg"
            icon={<ArrowRight size={16} />}
            onClick={handleMakeFocus}
            style={{ fontWeight: 800, padding: '14px 28px' }}
          >
            MAKE THIS MY FOCUS
          </Button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3730a3', fontWeight: 800, fontSize: '15px' }}>
              <CheckCircle2 size={20} style={{ color: '#4f46e5' }} /> Active Focus Track Selection
            </div>

            <Button
              variant="outline"
              size="md"
              icon={<RefreshCw size={14} />}
              onClick={() => setShowChangeSelector(!showChangeSelector)}
            >
              Change Focus Track
            </Button>
          </div>
        )}
      </Surface>

      {/* WHAT'S CHANGING AROUND IT (CYAN ENVIRONMENT LINK) */}
      {isFocusActive && (
        <Surface variant="cyan" radius="lg" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', marginBottom: '2px' }}>
                CONNECTED LANDSCAPE
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', fontFamily: "'Fredoka', sans-serif" }}>
                WHAT'S CHANGING AROUND YOUR FOCUS
              </h3>
            </div>

            <Button
              variant="cyan"
              size="sm"
              icon={<Radar size={14} />}
              onClick={() => setActiveTab && setActiveTab('radar')}
            >
              Explore Connected Signals
            </Button>
          </div>

          <div style={{ padding: '14px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #bae6fd' }}>
            <strong style={{ color: '#0284c7' }}>Active AI Signal: </strong>
            Autonomous Tool-Calling Agents are shifting core workflow design in {displayTopic}.
          </div>
        </Surface>
      )}

      {/* OTHER CANDIDATE AREAS */}
      {(alternativeAreas.length > 0 || showChangeSelector) && (
        <Surface variant="amber" radius="lg" padding="lg">
          <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 800, color: '#0f172a', fontFamily: "'Fredoka', sans-serif" }}>
            Other Focus Candidates
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {alternativeAreas.map((altTopic) => {
              const altDetail = FOCUS_DETAILS_DATABASE[altTopic] || getFallbackFocusDetail(altTopic);

              return (
                <div
                  key={altTopic}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #fde68a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <h4 style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                      {altDetail.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#78350f' }}>
                      {altDetail.whyThisMatters}
                    </p>
                  </div>

                  <Button
                    variant="amber"
                    size="sm"
                    onClick={() => handleChangeFocus(altTopic)}
                  >
                    Select as Focus
                  </Button>
                </div>
              );
            })}
          </div>
        </Surface>
      )}

    </div>
  );
};
