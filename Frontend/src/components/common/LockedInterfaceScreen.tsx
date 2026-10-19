import React from 'react';
import {
  Lock,
  Radar,
  Search,
  Sparkles,
  Wrench,
  Layers,
  MessageCircle,
  ArrowRight,
  Compass,
  CheckCircle2,
  Clock,
  ShieldAlert,
  BarChart3,
  Target
} from 'lucide-react';
import { Surface } from './Surface';
import { Button } from './Button';
import { Badge } from './Badge';
import { useLearner } from '../../context/LearnerContext';
import { getFeatureAccess } from '../../services/featureAccessService';

interface LockedInterfaceScreenProps {
  targetTab: string;
  setActiveTab: (tab: string) => void;
}

interface InterfaceConfig {
  name: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  primaryColor: string;
  secondaryBg: string;
  borderColor: string;
}

const INTERFACE_CONFIGS: Record<string, InterfaceConfig> = {
  analysis: {
    name: 'My AI Profile',
    tagline: 'AI Capability Diagnostic & Radar',
    description: 'Your personalized 5-dimension AI capability breakdown, top skill strengths, and growth recommendations.',
    icon: BarChart3,
    primaryColor: '#4f46e5',
    secondaryBg: '#eef2ff',
    borderColor: '#c7d2fe'
  },
  clarity: {
    name: 'Clarity',
    tagline: 'AI Goal Clarification & Prompt Lab',
    description: 'Interactive prompt engineering tasks and AI model evaluations to build hands-on capability.',
    icon: Compass,
    primaryColor: '#0ea5e9',
    secondaryBg: '#f0f9ff',
    borderColor: '#bae6fd'
  },
  focus: {
    name: 'Focus Track',
    tagline: 'Targeted AI Learning Concentration',
    description: 'Select a concentrated discipline track to personalize your technical discovery stream and practice tasks.',
    icon: Target,
    primaryColor: '#10b981',
    secondaryBg: '#ecfdf5',
    borderColor: '#a7f3d0'
  },
  radar: {
    name: 'AI Radar',
    tagline: 'Technical AI Market Shifts',
    description: 'A continuous stream of real model releases, tool-calling breakthroughs, and workflow evolutions tailored to your profile.',
    icon: Radar,
    primaryColor: '#0284c7',
    secondaryBg: '#f0f9ff',
    borderColor: '#bae6fd'
  },
  investigation: {
    name: 'Signal Investigation',
    tagline: 'Structured Technical Research',
    description: 'Deep dive scaffold analyzing yesterday vs. today vs. what changed to formulate actionable implementation hypotheses.',
    icon: Search,
    primaryColor: '#0369a1',
    secondaryBg: '#f0f9ff',
    borderColor: '#bae6fd'
  },
  relevance: {
    name: 'AI Relevance',
    tagline: 'Personalized Impact Synthesis',
    description: 'Connects your Profile, active Focus track, and evaluated tools into a concrete payoff map explaining why shifts matter to your work.',
    icon: Sparkles,
    primaryColor: '#4f46e5',
    secondaryBg: '#eef2ff',
    borderColor: '#c7d2fe'
  },
  solver: {
    name: 'Problem Solver',
    tagline: 'Workflow & Solution Generator',
    description: 'Input real tasks and business friction to derive tool capabilities, step-by-step architectures, and executable workflows.',
    icon: Wrench,
    primaryColor: '#059669',
    secondaryBg: '#ecfdf5',
    borderColor: '#a7f3d0'
  },
  build: {
    name: 'Projects Workspace',
    tagline: 'Production Project Development',
    description: 'Turn your solved workflows into reusable projects, templates, and automated AI agents ready for deployment.',
    icon: Layers,
    primaryColor: '#d97706',
    secondaryBg: '#fffbeb',
    borderColor: '#fde68a'
  },
  mentor: {
    name: 'Mentor Workspace',
    tagline: 'Contextual AI Coaching & Guidance',
    description: 'Adaptive mentor delivering reflective questions, personalized roadmaps, and strategic observations based on your learning actions.',
    icon: MessageCircle,
    primaryColor: '#7c3aed',
    secondaryBg: '#f5f3ff',
    borderColor: '#ddd6fe'
  },
  insights: {
    name: 'Growth Insights',
    tagline: 'Personalized Progression Trends',
    description: 'Historical capability evolution tracking and benchmark comparison across AI dimensions.',
    icon: BarChart3,
    primaryColor: '#8b5cf6',
    secondaryBg: '#f5f3ff',
    borderColor: '#ddd6fe'
  }
};

export const LockedInterfaceScreen: React.FC<LockedInterfaceScreenProps> = ({
  targetTab,
  setActiveTab
}) => {
  const { state } = useLearner();
  const access = getFeatureAccess(targetTab, state);

  const isAssessmentCompleted = state.assessment.status === 'completed';
  const isClarityStarted = (state.clarity.completedTopics?.length || 0) > 0 || !!state.clarity.selectedTopic;
  const isFocusSelected = !!state.focus.selectedTrack;

  const currentConfig: InterfaceConfig = INTERFACE_CONFIGS[targetTab] || {
    name: access.name || 'Advanced Interface',
    tagline: `${access.level} Activity-Gated Feature`,
    description: access.reason || 'This workspace is locked for now. It will unlock based on your learning activities.',
    icon: Lock,
    primaryColor: '#4f46e5',
    secondaryBg: '#f1f5f9',
    borderColor: '#cbd5e1'
  };

  const IconComponent = currentConfig.icon;

  const handleNextActiveTab = () => {
    if (access.targetTab) {
      setActiveTab(access.targetTab);
    } else if (!isAssessmentCompleted) {
      setActiveTab('assessment');
    } else if (!isClarityStarted) {
      setActiveTab('clarity');
    } else if (!isFocusSelected) {
      setActiveTab('focus');
    } else {
      setActiveTab('wallet');
    }
  };

  const getRecommendedActionLabel = () => {
    return access.unlockAction || (
      !isAssessmentCompleted ? 'Complete Baseline Assessment' :
      !isClarityStarted ? 'Explore Clarity Lessons' :
      !isFocusSelected ? 'Choose Focus Track' : 'Explore AI Wallet'
    );
  };

  return (
    <div style={{
      maxWidth: '920px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      paddingBottom: '40px'
    }}>
      {/* 1. HERO LOCK BANNER */}
      <div style={{
        position: 'relative',
        backgroundColor: 'var(--aiims-bg-card, #ffffff)',
        borderRadius: '24px',
        border: `1px solid var(--aiims-border-card, ${currentConfig.borderColor})`,
        padding: '36px 32px',
        boxShadow: 'var(--aiims-shadow-card, 0 10px 30px -10px rgba(0, 0, 0, 0.05))',
        overflow: 'hidden'
      }}>
        {/* Subtle decorative background gradient */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '320px',
          height: '100%',
          background: `radial-gradient(circle at top right, ${currentConfig.secondaryBg} 0%, transparent 70%)`,
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Status Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              fontSize: '11px',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '9999px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <Lock size={12} />
              Status: Locked
            </span>

            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: currentConfig.secondaryBg,
              color: currentConfig.primaryColor,
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '9999px'
            }}>
              {currentConfig.tagline}
            </span>
          </div>

          {/* Icon + Title Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
            <div style={{
              position: 'relative',
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              backgroundColor: currentConfig.secondaryBg,
              border: `2px solid ${currentConfig.borderColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <IconComponent size={30} color={currentConfig.primaryColor} />
              <div style={{
                position: 'absolute',
                bottom: '-6px',
                right: '-6px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#dc2626',
                border: '2px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}>
                <Lock size={12} />
              </div>
            </div>

            <div>
              <h1 style={{
                fontSize: '26px',
                fontWeight: 900,
                color: 'var(--aiims-text-heading, #0f172a)',
                margin: '0 0 6px',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}>
                {currentConfig.name} is Locked
              </h1>
              <p style={{
                fontSize: '14.5px',
                color: 'var(--aiims-text-secondary, #475569)',
                margin: 0,
                lineHeight: 1.5,
                maxWidth: '680px'
              }}>
                {currentConfig.description}
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '8px',
            flexWrap: 'wrap'
          }}>
            <Button
              variant="violet"
              size="md"
              icon={<ArrowRight size={15} />}
              onClick={handleNextActiveTab}
            >
              {getRecommendedActionLabel()}
            </Button>

            <Button
              variant="outline"
              size="md"
              icon={<Compass size={15} />}
              onClick={() => setActiveTab('journey')}
            >
              View My Journey
            </Button>

            <button
              onClick={() => setActiveTab('home')}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '8px'
              }}
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>

      {/* 2. ACTIVITY UNLOCKING TIMELINE EXPLANATION */}
      <Surface variant="bordered" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <ShieldAlert size={20} color="#6366f1" />
          <h2 style={{
            fontSize: '17px',
            fontWeight: 800,
            color: '#0f172a',
            margin: 0,
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            How Unlocking Works
          </h2>
        </div>

        <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
          This interface is currently locked. The unlocking logic will be activated based on completed user activities and progression milestones. Complete preceding activities below to prepare your profile:
        </p>

        {/* 4 Steps Visual Progression */}
        <div className="aiims-card-grid">
          {/* Step 1: Assessment */}
          <div style={{
            backgroundColor: isAssessmentCompleted ? 'var(--aiims-card-mint-bg, #f0fdf4)' : 'var(--aiims-bg-card-hover, #f8fafc)',
            border: isAssessmentCompleted ? '1px solid var(--aiims-card-mint-border, #bbf7d0)' : '1px solid var(--aiims-border-card, #e2e8f0)',
            borderRadius: '12px',
            padding: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--aiims-text-secondary, #64748b)' }}>STEP 1</span>
              {isAssessmentCompleted ? (
                <CheckCircle2 size={16} color="#16a34a" />
              ) : (
                <Clock size={16} color="#94a3b8" />
              )}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--aiims-text-primary, #0f172a)', marginBottom: '4px' }}>
              Baseline Assessment
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--aiims-text-secondary, #64748b)' }}>
              {isAssessmentCompleted ? 'Completed 25 diagnostic questions' : 'Diagnostic not yet completed'}
            </div>
          </div>

          {/* Step 2: Capability Clarity */}
          <div style={{
            backgroundColor: isClarityStarted ? 'var(--aiims-card-mint-bg, #f0fdf4)' : 'var(--aiims-bg-card-hover, #f8fafc)',
            border: isClarityStarted ? '1px solid var(--aiims-card-mint-border, #bbf7d0)' : '1px solid var(--aiims-border-card, #e2e8f0)',
            borderRadius: '12px',
            padding: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--aiims-text-secondary, #64748b)' }}>STEP 2</span>
              {isClarityStarted ? (
                <CheckCircle2 size={16} color="#16a34a" />
              ) : (
                <Clock size={16} color="#94a3b8" />
              )}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--aiims-text-primary, #0f172a)', marginBottom: '4px' }}>
              Clarity Reflections
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--aiims-text-secondary, #64748b)' }}>
              {isClarityStarted ? 'Lessons & mental models explored' : 'Explore capability lessons & submit reflections'}
            </div>
          </div>

          {/* Step 3: Focus Selection */}
          <div style={{
            backgroundColor: isFocusSelected ? 'var(--aiims-card-mint-bg, #f0fdf4)' : 'var(--aiims-bg-card-hover, #f8fafc)',
            border: isFocusSelected ? '1px solid var(--aiims-card-mint-border, #bbf7d0)' : '1px solid var(--aiims-border-card, #e2e8f0)',
            borderRadius: '12px',
            padding: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--aiims-text-secondary, #64748b)' }}>STEP 3</span>
              {isFocusSelected ? (
                <CheckCircle2 size={16} color="#16a34a" />
              ) : (
                <Clock size={16} color="#94a3b8" />
              )}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--aiims-text-primary, #0f172a)', marginBottom: '4px' }}>
              Active Focus Track
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--aiims-text-secondary, #64748b)' }}>
              {isFocusSelected ? `Selected: ${state.focus.selectedTrack}` : 'Choose primary direction of concentration'}
            </div>
          </div>

          {/* Step 4: Activity Unlocking */}
          <div style={{
            backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
            border: '1px dashed var(--aiims-border-card, #cbd5e1)',
            borderRadius: '12px',
            padding: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--aiims-text-secondary, #64748b)' }}>STEP 4</span>
              <Lock size={16} color="#94a3b8" />
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--aiims-text-primary, #0f172a)', marginBottom: '4px' }}>
              Activity-Gated Workspaces
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--aiims-text-secondary, #64748b)' }}>
              Radar, Relevance, Problem Solver, Projects & Mentor unlock based on activity
            </div>
          </div>
        </div>
      </Surface>

      {/* 3. LIST OF LOCKED WORKSPACES */}
      <Surface variant="bordered" radius="lg" padding="lg">
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '14px', letterSpacing: '0.5px' }}>
          Interfaces Locked For Now
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '12px'
        }}>
          {[
            { id: 'radar', name: 'AI Radar', icon: Radar, status: 'Locked', desc: 'Market shifts & breakthrough signals' },
            { id: 'relevance', name: 'AI Relevance', icon: Sparkles, status: 'Locked', desc: 'Personalized payoff & impact synthesis' },
            { id: 'solver', name: 'Problem Solver', icon: Wrench, status: 'Locked', desc: 'Real-task derivation & workflow generator' },
            { id: 'build', name: 'Projects', icon: Layers, status: 'Locked', desc: 'Production-ready reusable project templates' },
            { id: 'mentor', name: 'Mentor Workspace', icon: MessageCircle, status: 'Locked', desc: 'Contextual AI coaching & observations' }
          ].map((item) => {
            const ItemIcon = item.icon;
            const isCurrent = targetTab === item.id;

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: isCurrent ? 'var(--aiims-card-banner-bg, #f1f5f9)' : 'var(--aiims-bg-card, #ffffff)',
                  border: isCurrent ? '2px solid var(--aiims-primary, #6366f1)' : '1px solid var(--aiims-border-card, #e2e8f0)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ItemIcon size={18} color="#94a3b8" />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--aiims-text-primary, #0f172a)' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--aiims-text-secondary, #64748b)' }}>
                      {item.desc}
                    </div>
                  </div>
                </div>

                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  padding: '2px 8px',
                  borderRadius: '9999px'
                }}>
                  <Lock size={10} />
                  Locked
                </span>
              </div>
            );
          })}
        </div>
      </Surface>
    </div>
  );
};
