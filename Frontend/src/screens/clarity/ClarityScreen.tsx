import React, { useState, useEffect } from 'react';
import { useLearner } from '../../context/LearnerContext';
import {
  Sparkles,
  ArrowRight,
  Lock,
  CheckCircle2,
  Brain,
  Compass,
  MessageSquare,
  HelpCircle,
  Lightbulb,
  Check,
  RefreshCw,
  BookOpen
} from 'lucide-react';

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
    whyItAppeared: 'Your assessment responses indicate that while you use AI frequently for isolated tasks, establishing structured, repeatable workflows will give you the highest leverage.',
    mentorNote: 'I noticed this area came up in your profile. You don\'t need to master everything at once — start by understanding how individual tasks fit together into a workflow.',
    concept: {
      whatIsIt: 'The practice of connecting inputs, AI prompts, human evaluation points, and formatted outputs into a reliable, repeatable multi-step process.',
      inSimpleTerms: 'Instead of treating AI like a casual chat partner every time, you build a clear "assembly line" for your recurring tasks.'
    },
    example: {
      isolated: 'Asking AI to write a report summary from scratch every Friday using whatever prompt comes to mind.',
      repeatable: 'Setting up a standard template with defined input data, step-by-step instructions, quality checks, and output formatting so every Friday report is consistent in 2 minutes.'
    },
    tryThis: {
      question: 'You are using AI to prepare a weekly progress report for your team. You ask AI to write the report every Friday. What would turn this into a repeatable workflow?',
      options: [
        {
          id: 'A',
          text: 'Use the same vague prompt every week',
          explanation: 'Using a vague prompt leads to unpredictable output quality and requires heavy rewriting every week.'
        },
        {
          id: 'B',
          text: 'Define the inputs, steps, verification checks, and expected output template',
          explanation: 'Exactly! Defining inputs, steps, quality checks, and expected outputs creates a reliable, repeatable workflow.',
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
    whyItAppeared: 'Your assessment responses indicate that while you use AI frequently for isolated tasks, establishing structured, repeatable workflows will give you the highest leverage.',
    mentorNote: 'I noticed this area came up in your profile. You don\'t need to master everything at once — start by understanding how individual tasks fit together into a workflow.',
    concept: {
      whatIsIt: 'The practice of connecting inputs, AI prompts, human evaluation points, and formatted outputs into a reliable, repeatable multi-step process.',
      inSimpleTerms: 'Instead of treating AI like a casual chat partner every time, you build a clear "assembly line" for your recurring tasks.'
    },
    example: {
      isolated: 'Asking AI to write a report summary from scratch every Friday using whatever prompt comes to mind.',
      repeatable: 'Setting up a standard template with defined input data, step-by-step instructions, quality checks, and output formatting so every Friday report is consistent in 2 minutes.'
    },
    tryThis: {
      question: 'You are using AI to prepare a weekly progress report for your team. You ask AI to write the report every Friday. What would turn this into a repeatable workflow?',
      options: [
        {
          id: 'A',
          text: 'Use the same vague prompt every week',
          explanation: 'Using a vague prompt leads to unpredictable output quality and requires heavy rewriting every week.'
        },
        {
          id: 'B',
          text: 'Define the inputs, steps, verification checks, and expected output template',
          explanation: 'Exactly! Defining inputs, steps, quality checks, and expected outputs creates a reliable, repeatable workflow.',
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
    whyItAppeared: 'Your analysis shows strong evaluation capability, which is the exact foundation needed to delegate complex multi-step tasks to AI agents safely.',
    mentorNote: 'Agents aren\'t magic — they are AI systems that can plan, execute tools, and self-correct toward a goal under human guidance.',
    concept: {
      whatIsIt: 'AI systems configured to perform multi-step tasks independently by choosing tools, inspecting results, and making decisions to achieve an objective.',
      inSimpleTerms: 'Instead of doing step 1, copying the result, doing step 2... you give the AI the final goal and inspect its work at key checkpoints.'
    },
    example: {
      isolated: 'Asking AI for research topics, copying the result, asking for outlines, copying again, and asking for drafting.',
      repeatable: 'Giving an agentic assistant the goal: "Gather top 5 industry news items, synthesize trends, and draft a formatted briefing for my review."'
    },
    tryThis: {
      question: 'You want an AI tool to audit your project documentation for missing sections. Which approach reflects an autonomous agent mindset?',
      options: [
        {
          id: 'A',
          text: 'Manually copy-pasting every single page into chat one by one',
          explanation: 'This is manual task execution, not agentic delegation.'
        },
        {
          id: 'B',
          text: 'Providing access to the doc folder with a goal: "Scan all files, identify gaps against our compliance checklist, and list missing items"',
          explanation: 'Spot on! Delegating the goal with boundaries allows the AI agent to execute multi-file analysis autonomously.',
          isRecommended: true
        },
        {
          id: 'C',
          text: 'Asking AI what a compliance checklist is',
          explanation: 'This is querying information, not delegating execution.'
        },
        {
          id: 'D',
          text: 'Writing the compliance audit manually without using AI',
          explanation: 'This avoids leveraging AI capability altogether.'
        }
      ]
    }
  },
  'Evaluating AI Output & Critical Assessment': {
    title: 'Evaluating AI Output & Critical Assessment',
    subtitle: 'AI produces confident text. Learning to spot hallucinations, bias, and subtle errors is what turns raw output into trustworthy work.',
    whyItAppeared: 'Assessment data highlights that critical evaluation is essential for high-stakes decision-making with AI.',
    mentorNote: 'Never trust AI blindly because it sounds polite or authoritative. Your human judgment is the quality bar.',
    concept: {
      whatIsIt: 'The structured verification of AI-generated responses for factual accuracy, logical consistency, hallucinations, and alignment with real constraints.',
      inSimpleTerms: 'Fact-checking and refining AI output before taking action on it.'
    },
    example: {
      isolated: 'Copying code or data summaries directly into a production email or project without reading or testing.',
      repeatable: 'Running a 3-step verification checklist: 1) Verify primary facts, 2) Test code/logic locally, 3) Ensure tone and context match requirements.'
    },
    tryThis: {
      question: 'An AI tool gives you a beautifully formatted financial summary with cited numbers. What is the right evaluation step before sharing it?',
      options: [
        {
          id: 'A',
          text: 'Share it immediately because it has citations and bold formatting',
          explanation: 'Formatting can mask inaccurate data or invented sources.'
        },
        {
          id: 'B',
          text: 'Spot-check 2-3 key calculations and verify source data links directly',
          explanation: 'Correct! Verification ensures that subtle hallucinations don\'t enter your final deliverables.',
          isRecommended: true
        },
        {
          id: 'C',
          text: 'Ask the AI if it is 100% sure it is right',
          explanation: 'AI models will often confirm wrong answers with complete confidence.'
        },
        {
          id: 'D',
          text: 'Ignore the report entirely',
          explanation: 'Dismissing AI output without checking prevents gaining efficiency.'
        }
      ]
    }
  },
  'Human Judgment & Oversight': {
    title: 'Human Judgment & Oversight',
    subtitle: 'Knowing where AI should assist vs where human responsibility, ethics, and intuition must decide.',
    whyItAppeared: 'Identified in your assessment as a key dimension for strategic AI leadership.',
    mentorNote: 'AI augments your capability; it does not replace your accountability.',
    concept: {
      whatIsIt: 'The deliberate placement of human decision points within AI-assisted workflows to ensure ethical, contextual, and strategic alignment.',
      inSimpleTerms: 'Keeping a human in the loop for decisions that require empathy, ethics, or domain responsibility.'
    },
    example: {
      isolated: 'Letting an automated script auto-approve customer refund requests above threshold without review.',
      repeatable: 'Using AI to categorize refund requests and draft responses, while keeping a human manager as the final sign-off for approvals.'
    },
    tryThis: {
      question: 'You are implementing AI for team performance appraisals. Where is human judgment essential?',
      options: [
        {
          id: 'A',
          text: 'Letting AI write and publish performance reviews automatically',
          explanation: 'Performance reviews impact careers and require human empathy and context.'
        },
        {
          id: 'B',
          text: 'Using AI to summarize project logs, while humans conduct the review and deliver feedback',
          explanation: 'Exactly right. AI handles information synthesis, while human judgment drives the evaluation and conversation.',
          isRecommended: true
        },
        {
          id: 'C',
          text: 'Not letting AI summarize any notes at all',
          explanation: 'This misses the efficiency gains of AI synthesis.'
        },
        {
          id: 'D',
          text: 'Flipping a coin to decide reviews',
          explanation: 'Unrelated to structured workflow design.'
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
    mentorNote: `I noticed ${topicName} came up in your profile. Let's make it practical and easy to apply.`,
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
          text: 'Relying solely on default settings without providing context',
          explanation: 'Default settings lack domain context and specific project constraints.'
        },
        {
          id: 'B',
          text: 'Defining clear goals, contextual inputs, and human verification checkpoints',
          explanation: 'Correct! Structured context and checkpoints turn concepts into reliable work practices.',
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

  // Local state for Interactive Scenario ("Try This")
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [reflectionInput, setReflectionInput] = useState<string>('');
  const [reflectionSaved, setReflectionSaved] = useState<boolean>(false);

  // Sync stored reflection input when topic changes
  useEffect(() => {
    if (selectedTopic) {
      const storedRef = reflections[selectedTopic] || '';
      setReflectionInput(storedRef);
      setReflectionSaved(!!storedRef);
      setSelectedOptionId(null);
    }
  }, [selectedTopic, reflections]);

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
            Clarity is waiting for your profile
          </h2>

          <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6, margin: '0 0 32px' }}>
            Complete your AI Assessment first. AIIMS will use your responses to identify areas that may be useful to explore.
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
            Your profile is ready
          </h2>

          <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6, margin: '0 0 32px' }}>
            Open your Analysis to see what AIIMS discovered about how you work with AI.
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
  // STATE C — Analysis viewed, but no topic currently selected
  // -------------------------------------------------------------
  const availableTopics = state.clarity.selectedAreas && state.clarity.selectedAreas.length > 0
    ? state.clarity.selectedAreas
    : ['AI Workflow Design', 'AI Agents & Autonomous Workflows', 'Evaluating AI Output & Critical Assessment'];

  if (!selectedTopic) {
    return (
      <div style={{ maxWidth: '980px', margin: '32px auto', padding: '0 20px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Compass style={{ width: '22px', height: '22px', color: '#4f46e5' }} />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5', letterSpacing: '1px', textTransform: 'uppercase' }}>
              CLARITY HUB
            </span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: "'Outfit', sans-serif" }}>
            What would you like to understand better?
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>
            Here are the development areas identified through your assessment analysis. Select an area to explore short contextual explanations, examples, and practical reflection.
          </p>
        </div>

        {/* Development Areas List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {availableTopics.map((topicName) => {
            const data = TOPIC_DATABASE[topicName] || getFallbackTopicContent(topicName);
            const isExplored = completedTopics.includes(topicName);

            return (
              <div
                key={topicName}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '24px',
                  padding: '28px 32px',
                  border: isExplored ? '1px solid #c7d2fe' : '1px solid #eef2f6',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '24px',
                  transition: 'transform 0.2s ease, boxShadow 0.2s ease'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
                      {data.title}
                    </h3>
                    {isExplored && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        backgroundColor: '#ecfdf5',
                        color: '#047857',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: 700
                      }}>
                        <CheckCircle2 size={13} /> Explored
                      </span>
                    )}
                  </div>

                  <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#475569', lineHeight: 1.5 }}>
                    {data.subtitle}
                  </p>

                  <div style={{
                    padding: '10px 14px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    fontSize: '13px',
                    color: '#64748b',
                    display: 'inline-block'
                  }}>
                    <strong style={{ color: '#334155' }}>Why it appeared: </strong> {data.whyItAppeared}
                  </div>
                </div>

                <button
                  onClick={() => setClarityTopic(topicName)}
                  style={{
                    padding: '14px 28px',
                    borderRadius: '9999px',
                    backgroundColor: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)'
                  }}
                >
                  <span>{isExplored ? 'Review Topic' : 'Explore →'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATE D & E — Topic Selected / Exploring / Completed
  // -------------------------------------------------------------
  const topicData = TOPIC_DATABASE[selectedTopic] || getFallbackTopicContent(selectedTopic);
  const isTopicCompleted = completedTopics.includes(selectedTopic);

  // Stepper completion tracker
  const isConceptRead = true; // Auto-active when topic selected
  const isExampleRead = true;
  const isTryThisDone = selectedOptionId !== null || isTopicCompleted;
  const isReflectDone = reflectionSaved || isTopicCompleted;

  const handleSaveReflection = () => {
    if (!reflectionInput.trim()) return;
    saveClarityReflection(selectedTopic, reflectionInput);
    setReflectionSaved(true);
    // Complete topic when reflection is saved
    completeClarityTopic(selectedTopic);
  };

  const handleContinueToFocus = () => {
    completeClarityTopic(selectedTopic);
    if (setActiveTab) {
      setActiveTab('focus');
    }
  };

  return (
    <div style={{ maxWidth: '980px', margin: '32px auto', padding: '0 20px' }}>

      {/* TOP BREADCRUMB & SWITCH TOPIC */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button
          onClick={() => setClarityTopic(null)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#64748b',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0
          }}
        >
          <span>← Explore another area</span>
        </button>

        {isTopicCompleted && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            backgroundColor: '#ecfdf5',
            color: '#047857',
            borderRadius: '9999px',
            fontSize: '13px',
            fontWeight: 700
          }}>
            <CheckCircle2 size={15} /> Topic Clarity Built
          </span>
        )}
      </div>


      {/* 1. TOPIC HEADER */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '32px 36px',
        border: '1px solid #eef2f6',
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Compass style={{ width: '18px', height: '18px', color: '#4f46e5' }} />
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            CLARITY FOCUS
          </span>
        </div>

        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', fontFamily: "'Outfit', sans-serif" }}>
          {topicData.title}
        </h1>

        <p style={{ fontSize: '17px', color: '#334155', lineHeight: 1.6, margin: '0 0 20px', fontWeight: 500 }}>
          "{topicData.subtitle}"
        </p>

        {/* Why this appeared in your profile */}
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#f0f5ff',
          borderRadius: '16px',
          borderLeft: '4px solid #4f46e5'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#3730a3', textTransform: 'uppercase', marginBottom: '4px' }}>
            Why this appeared in your profile
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: '#1e1b4b', lineHeight: 1.5 }}>
            {topicData.whyItAppeared}
          </p>
        </div>
      </div>


      {/* 2. CONTEXTUAL AIIMS MENTOR BRIEF */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        borderRadius: '24px',
        padding: '24px 32px',
        color: '#ffffff',
        marginBottom: '32px',
        boxShadow: '0 8px 24px rgba(49, 46, 129, 0.15)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Sparkles size={20} style={{ color: '#c7d2fe' }} />
        </div>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#c7d2fe', letterSpacing: '1px', textTransform: 'uppercase' }}>
            AIIMS MENTOR NOTE
          </span>
          <p style={{ margin: '4px 0 0', fontSize: '15px', color: '#e0e7ff', lineHeight: 1.55 }}>
            "{topicData.mentorNote}"
          </p>
        </div>
      </div>


      {/* 3. LIGHTWEIGHT PROGRESS STEPPER */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderRadius: '18px',
        padding: '16px 24px',
        border: '1px solid #eef2f6',
        marginBottom: '32px'
      }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>Understanding Progress:</span>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: isConceptRead ? '#059669' : '#94a3b8' }}>
            {isConceptRead ? <CheckCircle2 size={16} /> : <BookOpen size={16} />}
            <span>1. Concept</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: isExampleRead ? '#059669' : '#94a3b8' }}>
            {isExampleRead ? <CheckCircle2 size={16} /> : <Lightbulb size={16} />}
            <span>2. Example</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: isTryThisDone ? '#059669' : '#94a3b8' }}>
            {isTryThisDone ? <CheckCircle2 size={16} /> : <HelpCircle size={16} />}
            <span>3. Try It</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: isReflectDone ? '#059669' : '#94a3b8' }}>
            {isReflectDone ? <CheckCircle2 size={16} /> : <MessageSquare size={16} />}
            <span>4. Reflect</span>
          </div>

        </div>
      </div>


      {/* 4. EXPLAIN THE CONCEPT */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '32px',
        border: '1px solid #eef2f6',
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <BookOpen style={{ width: '22px', height: '22px', color: '#4f46e5' }} />
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
            1. What is it?
          </h2>
        </div>

        <p style={{ fontSize: '16px', color: '#1e293b', lineHeight: 1.6, margin: '0 0 20px' }}>
          {topicData.concept.whatIsIt}
        </p>

        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #e2e8f0'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>
            In simple terms
          </span>
          <p style={{ margin: '6px 0 0', fontSize: '15px', color: '#334155', lineHeight: 1.5, fontWeight: 500 }}>
            {topicData.concept.inSimpleTerms}
          </p>
        </div>
      </div>


      {/* 5. EXAMPLE SECTION */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '32px',
        border: '1px solid #eef2f6',
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Lightbulb style={{ width: '22px', height: '22px', color: '#d97706' }} />
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
            2. Real Example
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Isolated usage */}
          <div style={{
            padding: '20px',
            backgroundColor: '#fff1f2',
            borderRadius: '18px',
            border: '1px solid #fecdd3'
          }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#be123c', textTransform: 'uppercase' }}>
              ❌ Isolated Task Usage
            </span>
            <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#881337', lineHeight: 1.5 }}>
              {topicData.example.isolated}
            </p>
          </div>

          {/* Repeatable workflow usage */}
          <div style={{
            padding: '20px',
            backgroundColor: '#ecfdf5',
            borderRadius: '18px',
            border: '1px solid #a7f3d0'
          }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>
              ✅ Repeatable Workflow
            </span>
            <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#064e3b', lineHeight: 1.5 }}>
              {topicData.example.repeatable}
            </p>
          </div>

        </div>
      </div>


      {/* 6. INTERACTIVE "TRY THIS" MOMENT */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '32px',
        border: '1px solid #eef2f6',
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <HelpCircle style={{ width: '22px', height: '22px', color: '#4f46e5' }} />
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
            3. Try This
          </h2>
        </div>

        <p style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', lineHeight: 1.5, margin: '0 0 24px' }}>
          {topicData.tryThis.question}
        </p>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {topicData.tryThis.options.map((option) => {
            const isSelected = selectedOptionId === option.id;

            return (
              <div
                key={option.id}
                onClick={() => setSelectedOptionId(option.id)}
                style={{
                  padding: '16px 20px',
                  borderRadius: '16px',
                  border: isSelected
                    ? (option.isRecommended ? '2px solid #10b981' : '2px solid #4f46e5')
                    : '1px solid #e2e8f0',
                  backgroundColor: isSelected
                    ? (option.isRecommended ? '#ecfdf5' : '#f0f5ff')
                    : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    backgroundColor: isSelected ? (option.isRecommended ? '#10b981' : '#4f46e5') : '#f1f5f9',
                    color: isSelected ? '#ffffff' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 800,
                    flexShrink: 0
                  }}>
                    {option.id}
                  </div>

                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a', lineHeight: 1.5 }}>
                      {option.text}
                    </p>

                    {isSelected && (
                      <div style={{
                        marginTop: '10px',
                        padding: '10px 14px',
                        backgroundColor: '#ffffff',
                        borderRadius: '10px',
                        fontSize: '13px',
                        color: option.isRecommended ? '#047857' : '#334155',
                        border: '1px solid rgba(0,0,0,0.05)',
                        lineHeight: 1.4
                      }}>
                        <strong>{option.isRecommended ? '💡 Spot on: ' : 'ℹ️ Explanation: '}</strong>
                        {option.explanation}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* 7. PERSONAL REFLECTION SECTION */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '32px',
        border: '1px solid #eef2f6',
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <MessageSquare style={{ width: '22px', height: '22px', color: '#4f46e5' }} />
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
            4. Personal Connection
          </h2>
        </div>

        <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.5, margin: '0 0 16px' }}>
          Where could this show up in your actual daily work or projects?
        </p>

        <textarea
          rows={3}
          value={reflectionInput}
          onChange={(e) => {
            setReflectionInput(e.target.value);
            setReflectionSaved(false);
          }}
          placeholder="e.g. I can build a repeatable prompt template for summarizing weekly user interview notes into Jira tasks..."
          style={{
            width: '100%',
            boxSizing: 'border-box',
            borderRadius: '16px',
            border: '1px solid #cbd5e1',
            padding: '16px',
            fontSize: '14px',
            color: '#0f172a',
            fontFamily: 'inherit',
            outline: 'none',
            marginBottom: '16px',
            backgroundColor: '#f8fafc'
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={handleSaveReflection}
            disabled={!reflectionInput.trim()}
            style={{
              padding: '12px 24px',
              borderRadius: '9999px',
              backgroundColor: reflectionInput.trim() ? '#4f46e5' : '#cbd5e1',
              color: '#ffffff',
              border: 'none',
              fontSize: '14px',
              fontWeight: 700,
              cursor: reflectionInput.trim() ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {reflectionSaved ? <Check size={16} /> : <CheckCircle2 size={16} />}
            <span>{reflectionSaved ? 'Reflection Saved' : 'Save Reflection'}</span>
          </button>

          {reflectionSaved && (
            <span style={{ fontSize: '13px', color: '#059669', fontWeight: 600 }}>
              ✓ Saved to your LearnerState profile
            </span>
          )}
        </div>
      </div>


      {/* 8. COMPLETION & FOCUS HANDOFF */}
      {(isTopicCompleted || reflectionSaved) && (
        <div style={{
          backgroundColor: '#ecfdf5',
          borderRadius: '24px',
          padding: '32px 36px',
          border: '1px solid #a7f3d0',
          boxShadow: '0 8px 24px rgba(5, 150, 105, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '18px',
            backgroundColor: '#10b981',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <CheckCircle2 size={32} />
          </div>

          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#064e3b', margin: '0 0 8px', fontFamily: "'Outfit', sans-serif" }}>
            You have more clarity on this.
          </h2>

          <p style={{ fontSize: '15px', color: '#047857', maxWidth: '580px', margin: '0 0 28px', lineHeight: 1.5 }}>
            You understand what <strong>{topicData.title}</strong> means for your work. Now decide whether this area deserves your focus right now.
          </p>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={handleContinueToFocus}
              style={{
                padding: '14px 32px',
                borderRadius: '9999px',
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 4px 16px rgba(5, 150, 105, 0.3)'
              }}
            >
              <span>Continue to Focus →</span>
            </button>

            <button
              onClick={() => setClarityTopic(null)}
              style={{
                padding: '14px 28px',
                borderRadius: '9999px',
                backgroundColor: '#ffffff',
                color: '#047857',
                border: '1px solid #a7f3d0',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Explore another area
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
