import React, { useState } from 'react';
import { useLearner } from '../../context/LearnerContext';
import {
  Target,
  ArrowRight,
  Lock,
  Brain,
  Compass,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { FocusChallenges } from './FocusChallenges';

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
    whyThisMatters:
      'Establishing repeatable AI workflows gives you high leverage by turning one-off prompting into reliable, multi-step processes.',
    practicalNextStep:
      'Take one repeated task from your week (e.g., weekly status reporting) and map out the inputs, prompt steps, and verification checks.',
    suggestedAction: 'Map a 3-step repeatable workflow for your weekly update',
  },
  'AI Workflow & Architecture Design': {
    title: 'AI Workflow Design',
    whyThisMatters:
      'Establishing repeatable AI workflows gives you high leverage by turning one-off prompting into reliable, multi-step processes.',
    practicalNextStep:
      'Take one repeated task from your week (e.g., weekly status reporting) and map out the inputs, prompt steps, and verification checks.',
    suggestedAction: 'Map a 3-step repeatable workflow for your weekly update',
  },
  'AI Agents & Autonomous Workflows': {
    title: 'AI Agents & Autonomous Workflows',
    whyThisMatters:
      'Delegating multi-step goals to autonomous AI tools allows you to shift from line-by-line prompting to high-level goal delegation.',
    practicalNextStep:
      'Define a multi-step research or data auditing goal and specify clear tool boundaries and review checkpoints for an AI agent assistant.',
    suggestedAction: 'Specify goal & boundaries for an autonomous agent task',
  },
};

const getFallbackFocusDetail = (topicName: string): TopicFocusDetail => {
  return {
    title: topicName,
    whyThisMatters: `Focusing on ${topicName} allows you to turn concepts explored in Clarity into practical work habits.`,
    practicalNextStep: `Identify one recurring scenario in your work where applying ${topicName} creates immediate efficiency or quality gains.`,
    suggestedAction: `Apply ${topicName} to one active work project`,
  };
};

export const FocusScreen: React.FC<FocusScreenProps> = ({ setActiveTab }) => {
  const { state, selectFocusTrack, changeFocusTrack } = useLearner();

  const isAssessmentCompleted = state.assessment.status === 'completed';
  const isAnalysisViewed =
    state.analysis.status === 'viewed' || state.analysis.status === 'unlocked';
  const isClarityExplored =
    state.clarity.status === 'completed' ||
    (state.clarity.completedTopics && state.clarity.completedTopics.length > 0) ||
    state.clarity.selectedTopic !== null;

  const activeFocusTrack = state.focus.selectedTrack;
  const isFocusActive = state.focus.status === 'active';
  const reflections = state.clarity.reflections || {};

  const defaultCandidate =
    state.clarity.selectedTopic ||
    state.clarity.completedTopics[0] ||
    (state.clarity.selectedAreas && state.clarity.selectedAreas[0]) ||
    'AI Workflow Design';

  const [candidateTopic, setCandidateTopic] = useState<string>(defaultCandidate);
  const [showChangeSelector, setShowChangeSelector] = useState<boolean>(false);

  // Gating guard: Assessment
  if (!isAssessmentCompleted) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
        <Surface variant="amber" radius="lg" padding="lg">
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              backgroundColor: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#d97706',
            }}
          >
            <Lock size={28} />
          </div>

          <h2
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading)',
              margin: '0 0 8px',
              fontFamily: "'Fredoka', sans-serif",
            }}
          >
            Focus comes after understanding your profile
          </h2>

          <p
            style={{
              color: 'var(--aiims-tint-amber-text)',
              fontSize: '14px',
              lineHeight: 1.5,
              margin: '0 0 24px',
            }}
          >
            Complete your AI Assessment first. AIIMS will evaluate your profile and help you decide
            where to focus.
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

  // Gating guard: Analysis
  if (!isAnalysisViewed) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
        <Surface variant="amber" radius="lg" padding="lg">
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              backgroundColor: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#d97706',
            }}
          >
            <Brain size={28} />
          </div>

          <h2
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading)',
              margin: '0 0 8px',
              fontFamily: "'Fredoka', sans-serif",
            }}
          >
            Your profile comes first
          </h2>

          <p
            style={{
              color: 'var(--aiims-tint-amber-text)',
              fontSize: '14px',
              lineHeight: 1.5,
              margin: '0 0 24px',
            }}
          >
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

  // Gating guard: Clarity
  if (!isClarityExplored) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
        <Surface variant="amber" radius="lg" padding="lg">
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              backgroundColor: 'var(--aiims-tint-indigo-bg)',
              border: '1px solid var(--aiims-tint-indigo-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--aiims-primary)',
            }}
          >
            <Compass size={28} />
          </div>

          <h2
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading)',
              margin: '0 0 8px',
              fontFamily: "'Fredoka', sans-serif",
            }}
          >
            Build some Clarity first
          </h2>

          <p
            style={{
              color: 'var(--aiims-text-secondary)',
              fontSize: '14px',
              lineHeight: 1.5,
              margin: '0 0 24px',
            }}
          >
            Explore an area from your profile before deciding where to focus. Clarity will help you
            understand the concept first.
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

  const displayTopic =
    isFocusActive && activeFocusTrack && !showChangeSelector ? activeFocusTrack : candidateTopic;

  const topicDetail = FOCUS_DETAILS_DATABASE[displayTopic] || getFallbackFocusDetail(displayTopic);
  const savedReflection = reflections[displayTopic] || null;

  const availableAreas: string[] = Array.from(
    new Set([
      ...(state.clarity.selectedAreas || []),
      ...(state.clarity.completedTopics || []),
      'AI Workflow Design',
      'AI Agents & Autonomous Workflows',
    ])
  );

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
    <div
      style={{
        maxWidth: '1020px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* ───────────────────────────────────────────────────────────── */}
      {/* PAGE HEADER                                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <PageHeader
        icon={<Target size={24} />}
        title="Personal Focus & Timed Challenges"
        description="Apply your AI skills to timed real-world challenges. Choose Easy (10 min), Medium (20 min), or Hard (30 min) challenges evaluated authoritatively by AI rubrics."
        badge={{ label: 'Focus Practice Environment', variant: 'warning' }}
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ACTIVE FOCUS TARGET / TOPIC CARD                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Surface
        variant={isFocusActive && !showChangeSelector ? 'gradient-hero' : 'gradient-focus'}
        radius="lg"
        padding="lg"
        style={{
          borderLeft:
            isFocusActive && !showChangeSelector ? '6px solid #4f46e5' : '6px solid #d97706',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 800,
            color: isFocusActive && !showChangeSelector ? '#3730a3' : '#b45309',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          {isFocusActive && !showChangeSelector
            ? 'YOUR CURRENT ACTIVE FOCUS TRACK'
            : 'FOCUS TARGET CANDIDATE'}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '12px',
          }}
        >
          <h2
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading)',
              margin: 0,
              fontFamily: "'Fredoka', sans-serif",
            }}
          >
            {topicDetail.title}
          </h2>

          {isFocusActive && !showChangeSelector && (
            <Badge variant="primary" icon={<CheckCircle2 size={14} />}>
              Active Focus Target
            </Badge>
          )}
        </div>

        {/* Why this matters */}
        <div
          style={{
            backgroundColor: 'var(--aiims-tint-amber-bg)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid var(--aiims-tint-amber-border)',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--aiims-tint-amber-text)',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            WHY THIS MATTERS
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: 'var(--aiims-text-heading)',
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            {topicDetail.whyThisMatters}
          </p>
        </div>

        {/* What you already discovered in clarity */}
        <div
          style={{
            backgroundColor: 'var(--aiims-tint-emerald-bg)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid var(--aiims-tint-emerald-border)',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--aiims-tint-emerald-text)',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            WHAT YOU ALREADY DISCOVERED IN CLARITY
          </div>
          {savedReflection ? (
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: 'var(--aiims-tint-emerald-text)',
                fontStyle: 'italic',
                lineHeight: 1.5,
              }}
            >
              "{savedReflection}"
            </p>
          ) : (
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: 'var(--aiims-text-muted)',
                fontStyle: 'italic',
              }}
            >
              You explored {topicDetail.title} conceptually. Practice challenges below will
              reinforce hands-on application.
            </p>
          )}
        </div>

        {/* Track switch selector */}
        {showChangeSelector && (
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--aiims-bg-card)',
              borderRadius: '12px',
              border: '1px solid var(--aiims-border-card)',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading)',
                marginBottom: '10px',
              }}
            >
              Switch Active Focus Topic:
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {availableAreas.map((area) => (
                <Button
                  key={area}
                  variant={area === displayTopic ? 'amber' : 'outline'}
                  size="sm"
                  onClick={() => handleChangeFocus(area)}
                >
                  {area}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Action / CTA */}
        {!isFocusActive || showChangeSelector || activeFocusTrack !== displayTopic ? (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Button
              variant="amber"
              size="lg"
              icon={<ArrowRight size={16} />}
              onClick={handleMakeFocus}
              style={{ fontWeight: 800, padding: '14px 28px' }}
            >
              MAKE THIS MY FOCUS
            </Button>
            <Button
              variant="outline"
              size="lg"
              icon={<RefreshCw size={14} />}
              onClick={() => setShowChangeSelector(!showChangeSelector)}
            >
              {showChangeSelector ? 'Cancel' : 'Change Topic'}
            </Button>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#3730a3',
                fontWeight: 800,
                fontSize: '14px',
              }}
            >
              <Sparkles size={18} style={{ color: '#4f46e5' }} /> Practice challenge results will be
              linked to this focus track
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw size={14} />}
              onClick={() => setShowChangeSelector(!showChangeSelector)}
            >
              {showChangeSelector ? 'Done' : 'Change Focus Track'}
            </Button>
          </div>
        )}
      </Surface>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN FOCUS EXPERIENCE: TIMED PRACTICE CHALLENGES              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <FocusChallenges
        topicName={displayTopic}
        track="General"
        onChallengeCompleted={(score) => {
          console.log(`[FocusScreen] Focus challenge completed with score: ${score}`);
        }}
      />
    </div>
  );
};
