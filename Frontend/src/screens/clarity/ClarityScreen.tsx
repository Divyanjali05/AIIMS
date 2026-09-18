import React, { useState, useEffect } from 'react';
import { useLearner } from '../../context/LearnerContext';
import {
  Sparkles,
  ArrowRight,
  Lock,
  CheckCircle2,
  Brain,
  Compass,
  MessageCircle,
  HelpCircle,
  Lightbulb,
  Check,
  BookOpen
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { MentorMessage } from '../../components/common/MentorMessage';

interface ClarityScreenProps {
  setActiveTab?: (tab: string) => void;
}

interface TopicContent {
  title: string;
  subtitle: string;
  whyItAppeared: string;
  mentorNote: string;
  concept: {
    whatIsIt: string;
    inSimpleTerms: string;
  };
  example: {
    isolated: string;
    repeatable: string;
  };
  tryThis: {
    question: string;
    options: {
      id: string;
      text: string;
      explanation: string;
      isRecommended?: boolean;
    }[];
  };
}

const TOPIC_DATABASE: Record<string, TopicContent> = {
  'AI Workflow Design': {
    title: 'AI Workflow Design',
    subtitle: 'AI can help with individual tasks. The bigger opportunity is designing a repeatable way of working with it.',
    whyItAppeared: 'Your assessment responses indicate that establishing structured, repeatable workflows will give you the highest leverage.',
    mentorNote: 'Start by understanding how individual tasks fit together into a workflow.',
    concept: {
      whatIsIt: 'Connecting inputs, AI prompts, human evaluation points, and formatted outputs into a reliable, repeatable multi-step process.',
      inSimpleTerms: 'Instead of treating AI like a casual chat partner every time, you build a clear assembly line for your recurring tasks.'
    },
    example: {
      isolated: 'Asking AI to write a report summary from scratch every Friday using whatever prompt comes to mind.',
      repeatable: 'Setting up a standard template with defined input data, step-by-step instructions, quality checks, and output formatting.'
    },
    tryThis: {
      question: 'You are using AI to prepare a weekly progress report for your team. What would turn this into a repeatable workflow?',
      options: [
        {
          id: 'A',
          text: 'Use a vague prompt every week',
          explanation: 'Using a vague prompt leads to unpredictable output quality and requires heavy rewriting.'
        },
        {
          id: 'B',
          text: 'Define inputs, steps, verification checks, and expected output template',
          explanation: 'Defining inputs, steps, quality checks, and output templates creates a reliable workflow.',
          isRecommended: true
        },
        {
          id: 'C',
          text: 'Ask AI to make the report longer',
          explanation: 'Length does not create repeatability or efficiency.'
        },
        {
          id: 'D',
          text: 'Start a completely new unguided conversation every time',
          explanation: 'Starting from scratch each time prevents building process efficiency.'
        }
      ]
    }
  },
  'AI Workflow & Architecture Design': {
    title: 'AI Workflow Design',
    subtitle: 'AI can help with individual tasks. The bigger opportunity is designing a repeatable way of working with it.',
    whyItAppeared: 'Your assessment responses indicate that establishing structured, repeatable workflows will give you the highest leverage.',
    mentorNote: 'Start by understanding how individual tasks fit together into a workflow.',
    concept: {
      whatIsIt: 'Connecting inputs, AI prompts, human evaluation points, and formatted outputs into a reliable, repeatable multi-step process.',
      inSimpleTerms: 'Instead of treating AI like a casual chat partner every time, you build a clear assembly line for your recurring tasks.'
    },
    example: {
      isolated: 'Asking AI to write a report summary from scratch every Friday using whatever prompt comes to mind.',
      repeatable: 'Setting up a standard template with defined input data, step-by-step instructions, quality checks, and output formatting.'
    },
    tryThis: {
      question: 'You are using AI to prepare a weekly progress report for your team. What would turn this into a repeatable workflow?',
      options: [
        {
          id: 'A',
          text: 'Use a vague prompt every week',
          explanation: 'Using a vague prompt leads to unpredictable output quality and requires heavy rewriting.'
        },
        {
          id: 'B',
          text: 'Define inputs, steps, verification checks, and expected output template',
          explanation: 'Defining inputs, steps, quality checks, and output templates creates a reliable workflow.',
          isRecommended: true
        },
        {
          id: 'C',
          text: 'Ask AI to make the report longer',
          explanation: 'Length does not create repeatability or efficiency.'
        },
        {
          id: 'D',
          text: 'Start a completely new unguided conversation every time',
          explanation: 'Starting from scratch each time prevents building process efficiency.'
        }
      ]
    }
  },
  'AI Agents & Autonomous Workflows': {
    title: 'AI Agents & Autonomous Workflows',
    subtitle: 'Moving from typing instructions line-by-line to delegating multi-step goals to autonomous AI tools.',
    whyItAppeared: 'Your analysis shows strong evaluation capability, which is the foundation needed to delegate multi-step tasks to AI agents safely.',
    mentorNote: 'Agents are AI systems that can plan, execute tools, and self-correct toward a goal under human guidance.',
    concept: {
      whatIsIt: 'AI systems configured to perform multi-step tasks independently by choosing tools, inspecting results, and making decisions to achieve an objective.',
      inSimpleTerms: 'Instead of doing step 1, copying the result, doing step 2... you give the AI the final goal and inspect its work at key checkpoints.'
    },
    example: {
      isolated: 'Asking AI for research topics, copying the result, asking for outlines, copying again, and asking for drafting.',
      repeatable: 'Giving an agentic assistant the goal: "Gather top news items, synthesize trends, and draft a formatted briefing for my review."'
    },
    tryThis: {
      question: 'You want an AI tool to audit project documentation for missing sections. Which approach reflects an autonomous agent mindset?',
      options: [
        {
          id: 'A',
          text: 'Manually copy-pasting every single page into chat one by one',
          explanation: 'This is manual task execution, not agentic delegation.'
        },
        {
          id: 'B',
          text: 'Providing access to the doc folder with a goal: "Scan files, identify gaps against checklist, and list missing items"',
          explanation: 'Delegating the goal with clear boundaries allows the AI agent to execute multi-file analysis autonomously.',
          isRecommended: true
        },
        {
          id: 'C',
          text: 'Asking AI what a compliance checklist is',
          explanation: 'This is querying information, not delegating execution.'
        },
        {
          id: 'D',
          text: 'Writing the audit manually without using AI',
          explanation: 'This avoids leveraging AI capability altogether.'
        }
      ]
    }
  }
};

const getFallbackTopicContent = (topicName: string): TopicContent => {
  return {
    title: topicName,
    subtitle: `Understand how ${topicName} applies to your real-world work with AI.`,
    whyItAppeared: `Identified in your analysis as a priority area worth exploring based on your assessment responses.`,
    mentorNote: `Let's make ${topicName} practical and easy to apply.`,
    concept: {
      whatIsIt: `The core principles and practices defining ${topicName} within modern AI workflows.`,
      inSimpleTerms: `Building a clear, practical mental model for ${topicName} so you can use it confidently.`
    },
    example: {
      isolated: `Approaching ${topicName} as a one-off attempt without structured guidance.`,
      repeatable: `Applying ${topicName} systematically with defined inputs, quality checks, and clear objectives.`
    },
    tryThis: {
      question: `When applying ${topicName} to a critical work project, which practice delivers the highest reliability?`,
      options: [
        {
          id: 'A',
          text: 'Relying solely on default settings without context',
          explanation: 'Default settings lack domain context and specific project constraints.'
        },
        {
          id: 'B',
          text: 'Defining clear goals, contextual inputs, and human verification checkpoints',
          explanation: 'Structured context and checkpoints turn concepts into reliable work practices.',
          isRecommended: true
        },
        {
          id: 'C',
          text: 'Avoiding any human review of the results',
          explanation: 'Human verification is essential for maintaining work quality.'
        },
        {
          id: 'D',
          text: 'Discarding the tool whenever output isn\'t perfect instantly',
          explanation: 'Refining inputs and context is part of effective AI collaboration.'
        }
      ]
    }
  };
};

export const ClarityScreen: React.FC<ClarityScreenProps> = ({ setActiveTab }) => {
  const {
    state,
    setClarityTopic,
    saveClarityReflection,
    completeClarityTopic
  } = useLearner();

  const isAssessmentCompleted = state.assessment.status === 'completed';
  const isAnalysisViewed = state.analysis.status === 'viewed' || state.analysis.status === 'unlocked';
  const selectedTopic = state.clarity.selectedTopic;
  const reflections = state.clarity.reflections || {};
  const completedTopics = state.clarity.completedTopics || [];

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [reflectionInput, setReflectionInput] = useState<string>('');
  const [reflectionSaved, setReflectionSaved] = useState<boolean>(false);

  useEffect(() => {
    if (selectedTopic) {
      const storedRef = reflections[selectedTopic] || '';
      setReflectionInput(storedRef);
      setReflectionSaved(!!storedRef);
      setSelectedOptionId(null);
    }
  }, [selectedTopic, reflections]);

  if (!isAssessmentCompleted) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
        <Surface variant="mint" radius="lg" padding="lg">
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: '#d1fae5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#059669'
          }}>
            <Lock size={28} />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: "'Fredoka', sans-serif" }}>
            Clarity is waiting for your profile
          </h2>

          <p style={{ color: '#064e3b', fontSize: '14px', lineHeight: 1.5, margin: '0 0 24px' }}>
            Complete your AI Assessment first. AIIMS will use your responses to identify areas that may be useful to explore.
          </p>

          <Button
            variant="green"
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
            Your profile is ready
          </h2>

          <p style={{ color: '#78350f', fontSize: '14px', lineHeight: 1.5, margin: '0 0 24px' }}>
            Open your Analysis to see what AIIMS discovered about how you work with AI.
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

  const availableTopics = state.clarity.selectedAreas && state.clarity.selectedAreas.length > 0
    ? state.clarity.selectedAreas
    : ['AI Workflow Design', 'AI Agents & Autonomous Workflows'];

  if (!selectedTopic) {
    return (
      <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <PageHeader
          icon={<Lightbulb size={24} />}
          title="What would you like to understand better?"
          description="Select a development area identified from your profile to explore short explanations, examples, and practical reflection."
          badge={{ label: 'Green / Mint Learning Hub', variant: 'success' }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {availableTopics.map((topicName) => {
            const data = TOPIC_DATABASE[topicName] || getFallbackTopicContent(topicName);
            const isExplored = completedTopics.includes(topicName);

            return (
              <Surface
                key={topicName}
                variant="mint"
                radius="lg"
                padding="md"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '20px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a', fontFamily: "'Fredoka', sans-serif" }}>
                      {data.title}
                    </h3>
                    {isExplored && (
                      <Badge variant="success" icon={<CheckCircle2 size={12} />}>
                        Explored
                      </Badge>
                    )}
                  </div>

                  <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#064e3b', lineHeight: 1.45 }}>
                    {data.subtitle}
                  </p>

                  <div style={{ fontSize: '12px', color: '#047857' }}>
                    <strong>Why it appeared: </strong> {data.whyItAppeared}
                  </div>
                </div>

                <Button
                  variant="green"
                  size="md"
                  icon={<ArrowRight size={14} />}
                  onClick={() => setClarityTopic(topicName)}
                >
                  {isExplored ? 'Review Topic' : 'Explore'}
                </Button>
              </Surface>
            );
          })}
        </div>
      </div>
    );
  }

  const topicData = TOPIC_DATABASE[selectedTopic] || getFallbackTopicContent(selectedTopic);
  const isTopicCompleted = completedTopics.includes(selectedTopic);

  const isConceptRead = true;
  const isExampleRead = true;
  const isTryThisDone = selectedOptionId !== null || isTopicCompleted;
  const isReflectDone = reflectionSaved || isTopicCompleted;

  const handleSaveReflection = () => {
    if (!reflectionInput.trim()) return;
    saveClarityReflection(selectedTopic, reflectionInput);
    setReflectionSaved(true);
    completeClarityTopic(selectedTopic);
  };

  const handleContinueToFocus = () => {
    completeClarityTopic(selectedTopic);
    if (setActiveTab) {
      setActiveTab('focus');
    }
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* TOP BREADCRUMB */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setClarityTopic(null)}
        >
          ← Explore another area
        </Button>

        {isTopicCompleted && (
          <Badge variant="success" icon={<CheckCircle2 size={14} />}>
            Topic Clarity Built
          </Badge>
        )}
      </div>

      {/* TOPIC HEADER (MINT GRADIENT) */}
      <Surface variant="gradient-clarity" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <Compass style={{ width: '16px', height: '16px', color: '#059669' }} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#047857', letterSpacing: '1px', textTransform: 'uppercase' }}>
            CLARITY WORKSPACE
          </span>
        </div>

        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', fontFamily: "'Fredoka', sans-serif" }}>
          {topicData.title}
        </h1>

        <p style={{ fontSize: '15px', color: '#064e3b', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
          "{topicData.subtitle}"
        </p>
      </Surface>

      {/* MENTOR NOTE */}
      <MentorMessage message={topicData.mentorNote} />

      {/* STEPPER TRACKER */}
      <Surface variant="mint" radius="lg" padding="sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#047857' }}>Lesson Stepper:</span>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: isConceptRead ? '#059669' : '#94a3b8' }}>
            <BookOpen size={14} /> 1. Concept
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: isExampleRead ? '#059669' : '#94a3b8' }}>
            <Lightbulb size={14} /> 2. Example
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: isTryThisDone ? '#059669' : '#94a3b8' }}>
            <HelpCircle size={14} /> 3. Try It
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: isReflectDone ? '#059669' : '#94a3b8' }}>
            <MessageCircle size={14} /> 4. Reflect
          </div>
        </div>
      </Surface>

      {/* 1. CONCEPT (MINT) */}
      <Surface variant="mint" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <BookOpen style={{ width: '18px', height: '18px', color: '#059669' }} />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', fontFamily: "'Fredoka', sans-serif" }}>
            1. What is it?
          </h2>
        </div>

        <p style={{ fontSize: '14px', color: '#0f172a', lineHeight: 1.6, margin: '0 0 16px' }}>
          {topicData.concept.whatIsIt}
        </p>

        <div style={{ padding: '14px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>
            In simple terms
          </span>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#064e3b', lineHeight: 1.45, fontWeight: 500 }}>
            {topicData.concept.inSimpleTerms}
          </p>
        </div>
      </Surface>

      {/* 2. EXAMPLE (LIGHT GREEN) */}
      <Surface variant="mint" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Lightbulb style={{ width: '18px', height: '18px', color: '#d97706' }} />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', fontFamily: "'Fredoka', sans-serif" }}>
            2. Real Example
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ padding: '14px', backgroundColor: '#fff1f2', borderRadius: '12px', border: '1px solid #fecdd3' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#be123c', textTransform: 'uppercase' }}>
              Isolated Task Usage
            </span>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#881337', lineHeight: 1.45 }}>
              {topicData.example.isolated}
            </p>
          </div>

          <div style={{ padding: '14px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>
              Repeatable Workflow
            </span>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#064e3b', lineHeight: 1.45 }}>
              {topicData.example.repeatable}
            </p>
          </div>
        </div>
      </Surface>

      {/* 3. TRY THIS (TURQUOISE / SKY) */}
      <Surface variant="sky" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <HelpCircle style={{ width: '18px', height: '18px', color: '#0284c7' }} />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', fontFamily: "'Fredoka', sans-serif" }}>
            3. Try This
          </h2>
        </div>

        <p style={{ fontSize: '14px', fontWeight: 600, color: '#075985', lineHeight: 1.45, margin: '0 0 16px' }}>
          {topicData.tryThis.question}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {topicData.tryThis.options.map((option) => {
            const isSelected = selectedOptionId === option.id;

            return (
              <div
                key={option.id}
                onClick={() => setSelectedOptionId(option.id)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: isSelected
                    ? (option.isRecommended ? '2px solid #059669' : '2px solid #0284c7')
                    : '1px solid #bae6fd',
                  backgroundColor: isSelected
                    ? (option.isRecommended ? '#ecfdf5' : '#ffffff')
                    : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: isSelected ? (option.isRecommended ? '#059669' : '#0284c7') : '#e0f2fe',
                    color: isSelected ? '#ffffff' : '#0369a1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 800,
                    flexShrink: 0
                  }}>
                    {option.id}
                  </div>

                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>
                      {option.text}
                    </p>

                    {isSelected && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        backgroundColor: '#ffffff',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: option.isRecommended ? '#047857' : '#334155',
                        border: '1px solid rgba(0,0,0,0.05)',
                        lineHeight: 1.4
                      }}>
                        <strong>{option.isRecommended ? 'Spot on: ' : 'Explanation: '}</strong>
                        {option.explanation}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Surface>

      {/* 4. REFLECT (DEEPER MINT) */}
      <Surface variant="mint" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <MessageCircle style={{ width: '18px', height: '18px', color: '#059669' }} />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', fontFamily: "'Fredoka', sans-serif" }}>
            4. Personal Connection
          </h2>
        </div>

        <p style={{ fontSize: '13px', color: '#064e3b', lineHeight: 1.45, margin: '0 0 12px' }}>
          Where could this show up in your actual daily work or projects?
        </p>

        <textarea
          rows={3}
          value={reflectionInput}
          onChange={(e) => {
            setReflectionInput(e.target.value);
            setReflectionSaved(false);
          }}
          placeholder="e.g. I can build a repeatable prompt template for summarizing weekly user interview notes..."
          style={{
            width: '100%',
            boxSizing: 'border-box',
            borderRadius: '10px',
            border: '1px solid #a7f3d0',
            padding: '12px',
            fontSize: '13px',
            color: '#0f172a',
            fontFamily: 'inherit',
            outline: 'none',
            marginBottom: '12px',
            backgroundColor: '#ffffff'
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            variant={reflectionSaved ? 'secondary' : 'green'}
            size="md"
            icon={reflectionSaved ? <Check size={14} /> : <CheckCircle2 size={14} />}
            disabled={!reflectionInput.trim()}
            onClick={handleSaveReflection}
          >
            {reflectionSaved ? 'Reflection Saved' : 'Save Reflection'}
          </Button>

          {reflectionSaved && (
            <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
              ✓ Saved to your LearnerState profile
            </span>
          )}
        </div>
      </Surface>

      {/* FOCUS HANDOFF */}
      {(isTopicCompleted || reflectionSaved) && (
        <Surface variant="mint" radius="lg" padding="lg" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#064e3b', margin: '0 0 6px', fontFamily: "'Fredoka', sans-serif" }}>
            You have more clarity on this.
          </h2>

          <p style={{ fontSize: '14px', color: '#047857', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            You understand what <strong>{topicData.title}</strong> means for your work. Now decide whether this area deserves your focus right now.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Button
              variant="green"
              size="lg"
              icon={<ArrowRight size={16} />}
              onClick={handleContinueToFocus}
            >
              Continue to Focus
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => setClarityTopic(null)}
            >
              Explore another area
            </Button>
          </div>
        </Surface>
      )}

    </div>
  );
};
