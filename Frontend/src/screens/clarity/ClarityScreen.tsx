import React, { useState, useEffect, useMemo } from 'react';
import { useLearner } from '../../context/LearnerContext';
import {
  Sparkles,
  ArrowRight,
  ArrowUp,
  Lock,
  Unlock,
  CheckCircle2,
  Brain,
  Compass,
  MessageCircle,
  HelpCircle,
  Lightbulb,
  Check,
  BookOpen,
  Edit3,
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { MentorMessage } from '../../components/common/MentorMessage';
import { Level2AITaskLab } from './Level2AITaskLab';
import { apiClient } from '../../api/client';

interface ClarityScreenProps {
  setActiveTab?: (tab: string) => void;
}

interface ReflectionTemplate {
  question: string;
  guidance: string;
  placeholder: string;
  chips: { label: string; text: string }[];
}

const getReflectionContent = (topicName: string): ReflectionTemplate => {
  const isAgents =
    topicName.toLowerCase().includes('agent') || topicName.toLowerCase().includes('autonom');
  const isCheckingAI =
    topicName.toLowerCase().includes('check') || topicName.toLowerCase().includes('eval');

  if (isAgents) {
    return {
      question:
        'Where could you delegate a multi-step objective to an autonomous AI agent, and what guardrails will you establish?',
      guidance:
        'Identify a recurring task requiring multi-file analysis, continuous research, or cross-tool workflows. Where will you place supervisory checkpoints before taking action?',
      placeholder:
        'e.g. In my weekly sprint cycle, I can delegate codebase documentation audits to an agent that scans changed files, identifies missing API schemas, and submits a PR draft for my review before merging...',
      chips: [
        {
          label: '🤖 Repo Documentation Auditor',
          text: 'In my engineering workflow, I can deploy an AI agent to scan pull requests for missing docstrings and API schema drifts, creating draft suggestions for my approval before merge.',
        },
        {
          label: '🔎 Competitor Intelligence Scout',
          text: 'In my weekly strategy syncs, I can delegate an agent to monitor release notes across 5 competitor sites, summarize product changes, and flag strategic opportunities in a single briefing.',
        },
        {
          label: '⚡ Support Ticket Triager',
          text: 'In customer operations, I can configure an agent to categorize incoming bug reports, reproduce steps from logs, and draft troubleshooting steps for the engineering lead to verify.',
        },
        {
          label: '🛡️ Compliance Checklist Agent',
          text: 'In security audits, I can set up an autonomous agent to evaluate repository config files against our security checklist, flagging missing environment variables for human verification.',
        },
      ],
    };
  }

  if (isCheckingAI) {
    return {
      question:
        'In which critical deliverables does an unverified AI hallucination carry the highest risk, and what is your personal verification protocol?',
      guidance:
        'Define the explicit verification checklist (e.g. source cross-referencing, unit test execution, boundary validation) you will use before AI-assisted work is shipped.',
      placeholder:
        'e.g. When using AI to draft client contract summaries and financial models, I will require citation tags linking directly to the source PDF and manually verify all numerical figures before distribution...',
      chips: [
        {
          label: '📑 Financial & Metric Citation Check',
          text: 'When preparing financial forecasts and executive summaries, I will enforce a verification rule where all numerical figures must cite direct source ledger lines before presenting to stakeholders.',
        },
        {
          label: '🛡️ Code Pull Request Verification',
          text: 'When generating database migrations or backend logic with AI, I will execute automated test suites and inspect boundary edge cases manually to prevent regression bugs.',
        },
        {
          label: '✍️ Client Deliverable Fact-check',
          text: 'For customer-facing documentation, I will cross-check all AI-generated technical steps against live staging environments to eliminate outdated instructions or hallucinations.',
        },
        {
          label: '🧪 Unit Test & Edge Case Coverage',
          text: 'When AI generates unit tests, I will test for false-positive assertions and inject deliberate failure inputs to verify that the tests genuinely fail when expected.',
        },
      ],
    };
  }

  return {
    question:
      'Where could structured, repeatable AI workflows replace ad-hoc prompts in your day-to-day work?',
    guidance:
      'Think about a recurring process you handle weekly (sprint reports, spec documents, data summaries). How will you standardize inputs, prompts, and quality checks?',
    placeholder:
      'e.g. In my weekly status reporting, I will establish a template where raw commit logs and ticket status are fed into an AI prompt with a strict 3-section markdown schema, cutting prep time from 45 mins to 5 mins...',
    chips: [
      {
        label: '📋 Sprint Review & Metric Digest',
        text: 'In our weekly sprint closure, I will turn our ad-hoc prompt into a standard pipeline: input commit logs and Jira tickets, apply a strict 3-bullet schema, and verify blockers before sharing.',
      },
      {
        label: '🔍 PR Code Quality & Docs Review',
        text: 'For daily code reviews, I will establish a repeatable prompt workflow that inspects diffs against our team style guide, highlights missing tests, and drafts inline review comments for my final check.',
      },
      {
        label: '📊 User Interview Theme Synthesis',
        text: 'For monthly user research, I will create a structured pipeline that parses interview transcripts into categorized pain points, quote citations, and priority ranking.',
      },
      {
        label: '📑 Executive Client Briefing',
        text: 'For client deliverables, I will configure a template that ingests raw project milestones, generates concise executive summaries, and leaves placeholders for key financial metrics I verify manually.',
      },
    ],
  };
};

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
    subtitle:
      'AI can help with individual tasks. The bigger opportunity is designing a repeatable way of working with it.',
    whyItAppeared:
      'Your assessment responses indicate that establishing structured, repeatable workflows will give you the highest leverage.',
    mentorNote: 'Start by understanding how individual tasks fit together into a workflow.',
    concept: {
      whatIsIt:
        'Connecting inputs, AI prompts, human evaluation points, and formatted outputs into a reliable, repeatable multi-step process.',
      inSimpleTerms:
        'Instead of treating AI like a casual chat partner every time, you build a clear assembly line for your recurring tasks.',
    },
    example: {
      isolated:
        'Asking AI to write a report summary from scratch every Friday using whatever prompt comes to mind.',
      repeatable:
        'Setting up a standard template with defined input data, step-by-step instructions, quality checks, and output formatting.',
    },
    tryThis: {
      question:
        'You are using AI to prepare a weekly progress report for your team. What would turn this into a repeatable workflow?',
      options: [
        {
          id: 'A',
          text: 'Use a vague prompt every week',
          explanation:
            'Using a vague prompt leads to unpredictable output quality and requires heavy rewriting.',
        },
        {
          id: 'B',
          text: 'Define inputs, steps, verification checks, and expected output template',
          explanation:
            'Defining inputs, steps, quality checks, and output templates creates a reliable workflow.',
          isRecommended: true,
        },
        {
          id: 'C',
          text: 'Ask AI to make the report longer',
          explanation: 'Length does not create repeatability or efficiency.',
        },
        {
          id: 'D',
          text: 'Start a completely new unguided conversation every time',
          explanation: 'Starting from scratch each time prevents building process efficiency.',
        },
      ],
    },
  },
  'AI Workflow & Architecture Design': {
    title: 'AI Workflow Design',
    subtitle:
      'AI can help with individual tasks. The bigger opportunity is designing a repeatable way of working with it.',
    whyItAppeared:
      'Your assessment responses indicate that establishing structured, repeatable workflows will give you the highest leverage.',
    mentorNote: 'Start by understanding how individual tasks fit together into a workflow.',
    concept: {
      whatIsIt:
        'Connecting inputs, AI prompts, human evaluation points, and formatted outputs into a reliable, repeatable multi-step process.',
      inSimpleTerms:
        'Instead of treating AI like a casual chat partner every time, you build a clear assembly line for your recurring tasks.',
    },
    example: {
      isolated:
        'Asking AI to write a report summary from scratch every Friday using whatever prompt comes to mind.',
      repeatable:
        'Setting up a standard template with defined input data, step-by-step instructions, quality checks, and output formatting.',
    },
    tryThis: {
      question:
        'You are using AI to prepare a weekly progress report for your team. What would turn this into a repeatable workflow?',
      options: [
        {
          id: 'A',
          text: 'Use a vague prompt every week',
          explanation:
            'Using a vague prompt leads to unpredictable output quality and requires heavy rewriting.',
        },
        {
          id: 'B',
          text: 'Define inputs, steps, verification checks, and expected output template',
          explanation:
            'Defining inputs, steps, quality checks, and output templates creates a reliable workflow.',
          isRecommended: true,
        },
        {
          id: 'C',
          text: 'Ask AI to make the report longer',
          explanation: 'Length does not create repeatability or efficiency.',
        },
        {
          id: 'D',
          text: 'Start a completely new unguided conversation every time',
          explanation: 'Starting from scratch each time prevents building process efficiency.',
        },
      ],
    },
  },
  'AI Agents & Autonomous Workflows': {
    title: 'AI Agents & Autonomous Workflows',
    subtitle:
      'Moving from typing instructions line-by-line to delegating multi-step goals to autonomous AI tools.',
    whyItAppeared:
      'Your analysis shows strong evaluation capability, which is the foundation needed to delegate multi-step tasks to AI agents safely.',
    mentorNote:
      'Agents are AI systems that can plan, execute tools, and self-correct toward a goal under human guidance.',
    concept: {
      whatIsIt:
        'AI systems configured to perform multi-step tasks independently by choosing tools, inspecting results, and making decisions to achieve an objective.',
      inSimpleTerms:
        'Instead of doing step 1, copying the result, doing step 2... you give the AI the final goal and inspect its work at key checkpoints.',
    },
    example: {
      isolated:
        'Asking AI for research topics, copying the result, asking for outlines, copying again, and asking for drafting.',
      repeatable:
        'Giving an agentic assistant the goal: "Gather top news items, synthesize trends, and draft a formatted briefing for my review."',
    },
    tryThis: {
      question:
        'You want an AI tool to audit project documentation for missing sections. Which approach reflects an autonomous agent mindset?',
      options: [
        {
          id: 'A',
          text: 'Manually copy-pasting every single page into chat one by one',
          explanation: 'This is manual task execution, not agentic delegation.',
        },
        {
          id: 'B',
          text: 'Providing access to the doc folder with a goal: "Scan files, identify gaps against checklist, and list missing items"',
          explanation:
            'Delegating the goal with clear boundaries allows the AI agent to execute multi-file analysis autonomously.',
          isRecommended: true,
        },
        {
          id: 'C',
          text: 'Asking AI what a compliance checklist is',
          explanation: 'This is querying information, not delegating execution.',
        },
        {
          id: 'D',
          text: 'Writing the audit manually without using AI',
          explanation: 'This avoids leveraging AI capability altogether.',
        },
      ],
    },
  },
};

const getFallbackTopicContent = (topicName: string): TopicContent => {
  return {
    title: topicName,
    subtitle: `Understand how ${topicName} applies to your real-world work with AI.`,
    whyItAppeared: `Identified in your analysis as a priority area worth exploring based on your assessment responses.`,
    mentorNote: `Let's make ${topicName} practical and easy to apply.`,
    concept: {
      whatIsIt: `The core principles and practices defining ${topicName} within modern AI workflows.`,
      inSimpleTerms: `Building a clear, practical mental model for ${topicName} so you can use it confidently.`,
    },
    example: {
      isolated: `Approaching ${topicName} as a one-off attempt without structured guidance.`,
      repeatable: `Applying ${topicName} systematically with defined inputs, quality checks, and clear objectives.`,
    },
    tryThis: {
      question: `When applying ${topicName} to a critical work project, which practice delivers the highest reliability?`,
      options: [
        {
          id: 'A',
          text: 'Relying solely on default settings without context',
          explanation: 'Default settings lack domain context and specific project constraints.',
        },
        {
          id: 'B',
          text: 'Defining clear goals, contextual inputs, and human verification checkpoints',
          explanation:
            'Structured context and checkpoints turn concepts into reliable work practices.',
          isRecommended: true,
        },
        {
          id: 'C',
          text: 'Avoiding any human review of the results',
          explanation: 'Human verification is essential for maintaining work quality.',
        },
        {
          id: 'D',
          text: "Discarding the tool whenever output isn't perfect instantly",
          explanation: 'Refining inputs and context is part of effective AI collaboration.',
        },
      ],
    },
  };
};

export const ClarityScreen: React.FC<ClarityScreenProps> = ({ setActiveTab }) => {
  const { state, setClarityTopic, saveClarityReflection, completeClarityTopic } = useLearner();

  const isAssessmentCompleted = state.assessment.status === 'completed';
  const isAnalysisViewed =
    state.analysis.status === 'viewed' || state.analysis.status === 'unlocked';
  const selectedTopic = state.clarity.selectedTopic;
  const reflections = useMemo(() => state.clarity.reflections || {}, [state.clarity.reflections]);
  const completedTopics = state.clarity.completedTopics || [];

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [reflectionInput, setReflectionInput] = useState<string>('');
  const [reflectionSaved, setReflectionSaved] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isDraftingAI, setIsDraftingAI] = useState<boolean>(false);
  const [reflectionNotice, setReflectionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (selectedTopic) {
      const storedRef = reflections[selectedTopic] || '';
      setReflectionInput(storedRef);
      setReflectionSaved(!!storedRef);
      setIsEditing(!storedRef);
      setSelectedOptionId(null);
      setReflectionNotice(null);
    }
  }, [selectedTopic, reflections]);

  if (!isAssessmentCompleted) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
        <Surface variant="mint" radius="lg" padding="lg">
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              backgroundColor: 'var(--aiims-tint-emerald-bg)',
              border: '1px solid var(--aiims-tint-emerald-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--aiims-tint-emerald-text)',
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
            Clarity is waiting for your profile
          </h2>

          <p
            style={{
              color: 'var(--aiims-card-mint-text)',
              fontSize: '14px',
              lineHeight: 1.5,
              margin: '0 0 24px',
            }}
          >
            Complete your AI Assessment first. AIIMS will use your responses to identify areas that
            may be useful to explore.
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
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              backgroundColor: 'var(--aiims-tint-amber-bg)',
              border: '1px solid var(--aiims-tint-amber-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--aiims-tint-amber-text)',
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
            Your profile is ready
          </h2>

          <p
            style={{
              color: 'var(--aiims-tint-amber-text)',
              fontSize: '14px',
              lineHeight: 1.5,
              margin: '0 0 24px',
            }}
          >
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

  const availableTopics =
    state.clarity.selectedAreas && state.clarity.selectedAreas.length > 0
      ? state.clarity.selectedAreas
      : ['AI Workflow Design', 'AI Agents & Autonomous Workflows'];

  if (!selectedTopic) {
    return (
      <div
        style={{
          maxWidth: '980px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
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
                  gap: '20px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px',
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '18px',
                        fontWeight: 700,
                        color: 'var(--aiims-text-heading)',
                        fontFamily: "'Fredoka', sans-serif",
                      }}
                    >
                      {data.title}
                    </h3>
                    {isExplored && (
                      <Badge variant="success" icon={<CheckCircle2 size={12} />}>
                        Explored
                      </Badge>
                    )}
                  </div>

                  <p
                    style={{
                      margin: '0 0 8px',
                      fontSize: '13px',
                      color: 'var(--aiims-card-mint-text)',
                      lineHeight: 1.45,
                    }}
                  >
                    {data.subtitle}
                  </p>

                  <div style={{ fontSize: '12px', color: 'var(--aiims-card-mint-text)' }}>
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
  const reflectionTemplate = getReflectionContent(selectedTopic);

  const isConceptRead = true;
  const isExampleRead = true;
  const hasCompletedAnyTask =
    Object.keys(state.clarity.taskScores?.[selectedTopic] || {}).length > 0;
  const isTryThisDone = selectedOptionId !== null || hasCompletedAnyTask || isTopicCompleted;
  const isReflectDone = reflectionSaved || isTopicCompleted;

  const handleChipClick = (text: string) => {
    setReflectionInput(text);
    setReflectionSaved(false);
    setIsEditing(true);
    setReflectionNotice(
      'Filled from practical scenario template. Tweak details to match your workflow.'
    );
  };

  const handleSuggestReflection = async () => {
    setIsDraftingAI(true);
    setReflectionNotice(null);
    try {
      const topicScores = state.clarity.taskScores?.[selectedTopic] || {};
      const scoreValues = Object.values(topicScores);
      const numericScores = scoreValues.map((v: any) =>
        typeof v === 'number' ? v : v?.score || 85
      );
      const topScore = numericScores.length > 0 ? Math.max(...numericScores) : 85;

      const res = await apiClient.suggestClarityReflection({
        topic: selectedTopic,
        taskTitle: `${topicData.title} Task`,
        score: topScore,
      });

      if (res && res.suggestion) {
        setReflectionInput(res.suggestion);
        setReflectionSaved(false);
        setIsEditing(true);
        setReflectionNotice(
          '✨ Drafted by AI based on your Step 3 Lab performance! Personalize it before saving.'
        );
      } else {
        const fallbackTemplate = reflectionTemplate.chips[0].text;
        setReflectionInput(fallbackTemplate);
        setReflectionSaved(false);
        setIsEditing(true);
        setReflectionNotice(
          'Generated from recommended workflow template. Personalize it before saving.'
        );
      }
    } catch {
      const fallbackTemplate = reflectionTemplate.chips[0].text;
      setReflectionInput(fallbackTemplate);
      setReflectionSaved(false);
      setIsEditing(true);
      setReflectionNotice(
        'Generated from recommended workflow template. Personalize it before saving.'
      );
    } finally {
      setIsDraftingAI(false);
    }
  };

  const handleSaveReflection = () => {
    if (!reflectionInput.trim()) return;
    saveClarityReflection(selectedTopic, reflectionInput);
    setReflectionSaved(true);
    setIsEditing(false);
    completeClarityTopic(selectedTopic);
    setReflectionNotice(null);
  };

  const handleContinueToFocus = () => {
    completeClarityTopic(selectedTopic);
    if (setActiveTab) {
      setActiveTab('focus');
    }
  };

  return (
    <div
      style={{
        maxWidth: '980px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* TOP BREADCRUMB */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="ghost" size="sm" onClick={() => setClarityTopic(null)}>
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
          <Compass
            style={{ width: '16px', height: '16px', color: 'var(--aiims-tint-emerald-text)' }}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--aiims-tint-emerald-text)',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            CLARITY WORKSPACE
          </span>
        </div>

        <h1
          style={{
            fontSize: '28px',
            fontWeight: 800,
            color: 'var(--aiims-text-heading)',
            margin: '0 0 6px',
            fontFamily: "'Fredoka', sans-serif",
          }}
        >
          {topicData.title}
        </h1>

        <p
          style={{
            fontSize: '15px',
            color: 'var(--aiims-card-mint-text)',
            lineHeight: 1.5,
            margin: 0,
            fontWeight: 500,
          }}
        >
          "{topicData.subtitle}"
        </p>
      </Surface>

      {/* MENTOR NOTE */}
      <MentorMessage message={topicData.mentorNote} />

      {/* STEPPER TRACKER */}
      <Surface
        variant="mint"
        radius="lg"
        padding="sm"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <span
          style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aiims-tint-emerald-text)' }}
        >
          Lesson Stepper:
        </span>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 700,
              color: isConceptRead ? 'var(--aiims-tint-emerald-text)' : 'var(--aiims-text-muted)',
            }}
          >
            <BookOpen size={14} /> 1. Concept
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 700,
              color: isExampleRead ? 'var(--aiims-tint-emerald-text)' : 'var(--aiims-text-muted)',
            }}
          >
            <Lightbulb size={14} /> 2. Example
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 700,
              color: isTryThisDone ? 'var(--aiims-tint-emerald-text)' : 'var(--aiims-text-muted)',
            }}
          >
            <HelpCircle size={14} /> 3. Try It
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 700,
              color: isReflectDone
                ? 'var(--aiims-tint-emerald-text)'
                : !isTryThisDone
                  ? 'var(--aiims-text-muted)'
                  : 'var(--aiims-tint-emerald-text)',
            }}
          >
            {!isTryThisDone ? (
              <Lock size={13} style={{ color: 'var(--aiims-text-muted)' }} />
            ) : isReflectDone ? (
              <Check size={14} style={{ color: 'var(--aiims-tint-emerald-text)' }} />
            ) : (
              <MessageCircle size={14} style={{ color: 'var(--aiims-tint-emerald-text)' }} />
            )}
            4. Reflect {!isTryThisDone && '(Locked)'}
          </div>
        </div>
      </Surface>

      {/* 1. CONCEPT (MINT) */}
      <Surface variant="mint" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <BookOpen style={{ width: '18px', height: '18px', color: '#059669' }} />
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading)',
              fontFamily: "'Fredoka', sans-serif",
            }}
          >
            1. What is it?
          </h2>
        </div>

        <p
          style={{
            fontSize: '14px',
            color: 'var(--aiims-text-heading)',
            lineHeight: 1.6,
            margin: '0 0 16px',
          }}
        >
          {topicData.concept.whatIsIt}
        </p>

        <div
          style={{
            padding: '14px',
            backgroundColor: 'var(--aiims-bg-card)',
            borderRadius: '10px',
            border: '1px solid var(--aiims-border-card)',
            boxShadow: 'var(--aiims-shadow-card)',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--aiims-primary)',
              textTransform: 'uppercase',
            }}
          >
            In simple terms
          </span>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '13px',
              color: 'var(--aiims-text-body)',
              lineHeight: 1.45,
              fontWeight: 500,
            }}
          >
            {topicData.concept.inSimpleTerms}
          </p>
        </div>
      </Surface>

      {/* 2. EXAMPLE (LIGHT GREEN) */}
      <Surface variant="mint" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Lightbulb style={{ width: '18px', height: '18px', color: '#d97706' }} />
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading)',
              fontFamily: "'Fredoka', sans-serif",
            }}
          >
            2. Real Example
          </h2>
        </div>

        <div className="aiims-card-grid-2col">
          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--aiims-tint-rose-bg)',
              borderRadius: '12px',
              border: '1px solid var(--aiims-tint-rose-border)',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--aiims-tint-rose-text)',
                textTransform: 'uppercase',
              }}
            >
              Isolated Task Usage
            </span>
            <p
              style={{
                margin: '6px 0 0',
                fontSize: '13px',
                color: 'var(--aiims-tint-rose-text)',
                lineHeight: 1.45,
              }}
            >
              {topicData.example.isolated}
            </p>
          </div>

          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--aiims-bg-card)',
              borderRadius: '12px',
              border: '1px solid var(--aiims-border-card)',
              boxShadow: 'var(--aiims-shadow-card)',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--aiims-primary)',
                textTransform: 'uppercase',
              }}
            >
              Repeatable Workflow
            </span>
            <p
              style={{
                margin: '6px 0 0',
                fontSize: '13px',
                color: 'var(--aiims-text-body)',
                lineHeight: 1.45,
              }}
            >
              {topicData.example.repeatable}
            </p>
          </div>
        </div>
      </Surface>

      {/* 3. TRY THIS: LEVEL 2 INTERACTIVE AI TASKS */}
      <div id="step-3-try-this">
        <Level2AITaskLab
          topicName={selectedTopic}
          legacyTryThis={topicData.tryThis}
          onTaskCompleted={(diff, _score) => {
            setSelectedOptionId(diff);
          }}
        />
      </div>

      {/* 4. REFLECT / PERSONAL CONNECTION */}
      {!isTryThisDone ? (
        <Surface
          variant="mint"
          radius="lg"
          padding="lg"
          style={{
            border: '2px dashed var(--aiims-tint-emerald-border)',
            backgroundColor: 'var(--aiims-bg-card-subtle)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--aiims-tint-rose-bg)',
                  border: '1px solid var(--aiims-tint-rose-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--aiims-tint-rose-text)',
                }}
              >
                <Lock size={20} />
              </div>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading)',
                    fontFamily: "'Fredoka', sans-serif",
                  }}
                >
                  4. Personal Connection
                </h2>
                <span
                  style={{ fontSize: '12px', color: 'var(--aiims-text-muted)', fontWeight: 600 }}
                >
                  Locked • Complete at least one task in Step 3 to unlock
                </span>
              </div>
            </div>
            <Badge variant="neutral" icon={<Lock size={11} />}>
              Locked
            </Badge>
          </div>

          <div
            style={{
              padding: '16px 18px',
              borderRadius: '12px',
              backgroundColor: 'var(--aiims-bg-card)',
              border: '1px solid var(--aiims-border-card)',
              boxShadow: 'var(--aiims-shadow-card)',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: '260px' }}>
              <p
                style={{
                  margin: '0 0 6px',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--aiims-text-heading)',
                }}
              >
                Practical experience required before reflection
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: 'var(--aiims-text-muted)',
                  lineHeight: 1.5,
                }}
              >
                Run at least one AI prompt task in <strong>Step 3 (Try It)</strong> above to unlock
                this reflection. Observing AI task outputs and reviewing rubric scores gives you the
                tangible insight required to anchor this topic in your actual work.
              </p>
            </div>
            <Button
              variant="green"
              size="md"
              icon={<ArrowUp size={14} />}
              onClick={() =>
                document.getElementById('step-3-try-this')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              Complete Step 3 to Unlock ↑
            </Button>
          </div>

          {/* Locked Preview Ghost */}
          <div
            style={{
              opacity: 0.5,
              filter: 'grayscale(0.4)',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            <p
              style={{
                fontSize: '13px',
                color: 'var(--aiims-tint-emerald-text)',
                fontWeight: 600,
                margin: '0 0 8px',
              }}
            >
              Preview: {reflectionTemplate.question}
            </p>
            <div
              style={{
                height: '76px',
                borderRadius: '10px',
                border: '1px solid var(--aiims-border-card)',
                backgroundColor: 'var(--aiims-bg-subtle)',
                padding: '12px',
                fontSize: '12px',
                color: 'var(--aiims-text-muted)',
                fontStyle: 'italic',
              }}
            >
              {reflectionTemplate.placeholder}
            </div>
          </div>
        </Surface>
      ) : reflectionSaved && !isEditing ? (
        <Surface variant="mint" radius="lg" padding="lg">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--aiims-tint-emerald-bg)',
                  border: '1px solid var(--aiims-tint-emerald-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--aiims-tint-emerald-text)',
                }}
              >
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading)',
                    fontFamily: "'Fredoka', sans-serif",
                  }}
                >
                  4. Personal Connection
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--aiims-tint-emerald-text)',
                    fontWeight: 700,
                  }}
                >
                  ✓ Synced to your Learner Profile
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Badge variant="success" icon={<Check size={12} />}>
                Reflection Saved
              </Badge>
              <Button
                variant="outline"
                size="sm"
                icon={<Edit3 size={13} />}
                onClick={() => setIsEditing(true)}
              >
                Edit Reflection
              </Button>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--aiims-bg-card)',
              borderRadius: '12px',
              border: '1px solid var(--aiims-border-card)',
              padding: '16px 18px',
              fontSize: '14px',
              color: 'var(--aiims-text-body)',
              lineHeight: 1.6,
              fontWeight: 500,
              boxShadow: 'var(--aiims-shadow-card)',
            }}
          >
            "{reflectionInput}"
          </div>
        </Surface>
      ) : (
        <Surface variant="mint" radius="lg" padding="lg">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageCircle
                style={{ width: '20px', height: '20px', color: 'var(--aiims-tint-emerald-text)' }}
              />
              <h2
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading)',
                  fontFamily: "'Fredoka', sans-serif",
                }}
              >
                4. Personal Connection
              </h2>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Badge variant="success" icon={<Unlock size={12} />}>
                Unlocked
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                icon={<Sparkles size={13} style={{ color: 'var(--aiims-tint-emerald-text)' }} />}
                disabled={isDraftingAI}
                onClick={handleSuggestReflection}
              >
                {isDraftingAI ? 'Drafting with AI...' : '✨ Suggest with AI'}
              </Button>
            </div>
          </div>

          <p
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--aiims-card-mint-text)',
              lineHeight: 1.45,
              margin: '0 0 6px',
            }}
          >
            {reflectionTemplate.question}
          </p>

          <p
            style={{
              fontSize: '12.5px',
              color: 'var(--aiims-card-mint-text)',
              lineHeight: 1.5,
              margin: '0 0 14px',
            }}
          >
            {reflectionTemplate.guidance}
          </p>

          {/* INSPIRATION CHIPS */}
          <div style={{ marginBottom: '14px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--aiims-tint-emerald-text)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px',
              }}
            >
              Quick-Select Inspiration Scenarios (Click to Fill):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {reflectionTemplate.chips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleChipClick(chip.text)}
                  style={{
                    background: 'var(--aiims-bg-card)',
                    border: '1px solid var(--aiims-border-card)',
                    borderRadius: '20px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--aiims-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    boxShadow: 'var(--aiims-shadow-card)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--aiims-card-mint-bg)';
                    e.currentTarget.style.borderColor = 'var(--aiims-tint-emerald-border)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--aiims-bg-card)';
                    e.currentTarget.style.borderColor = 'var(--aiims-border-card)';
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {reflectionNotice && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--aiims-card-mint-bg)',
                border: '1px solid var(--aiims-card-mint-border)',
                color: 'var(--aiims-card-mint-text)',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Sparkles size={14} style={{ color: '#059669', flexShrink: 0 }} />
              <span>{reflectionNotice}</span>
            </div>
          )}

          <textarea
            rows={4}
            value={reflectionInput}
            onChange={(e) => {
              setReflectionInput(e.target.value);
              setReflectionSaved(false);
              setReflectionNotice(null);
            }}
            placeholder={reflectionTemplate.placeholder}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              borderRadius: '12px',
              border: '1px solid var(--aiims-input-border)',
              padding: '12px 14px',
              fontSize: '13.5px',
              color: 'var(--aiims-input-text)',
              fontFamily: 'inherit',
              outline: 'none',
              marginBottom: '8px',
              backgroundColor: 'var(--aiims-input-bg)',
              lineHeight: 1.5,
              transition: 'border-color 0.15s ease',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--aiims-primary)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--aiims-input-border)')}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px',
              fontSize: '11.5px',
              color: 'var(--aiims-card-mint-text)',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span>
                🎯 <strong>Target Use Case</strong>
              </span>
              <span>•</span>
              <span>
                🛡️ <strong>Quality Checkpoint</strong>
              </span>
              <span>•</span>
              <span>
                ⏱️ <strong>Leverage Gain</strong>
              </span>
            </div>
            <span
              style={{
                fontWeight: 600,
                color:
                  reflectionInput.length >= 40
                    ? 'var(--aiims-tint-emerald-text)'
                    : 'var(--aiims-text-muted)',
              }}
            >
              {reflectionInput.length} chars{' '}
              {reflectionInput.length >= 40 ? '• Good depth' : '(aim for 40+ chars)'}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="green"
                size="md"
                icon={<CheckCircle2 size={15} />}
                disabled={!reflectionInput.trim() || reflectionInput.trim().length < 10}
                onClick={handleSaveReflection}
              >
                Save Reflection
              </Button>
              {reflectionSaved && isEditing && (
                <Button variant="ghost" size="md" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>

            <span
              style={{ fontSize: '12px', color: 'var(--aiims-tint-emerald-text)', fontWeight: 600 }}
            >
              {reflectionSaved
                ? '✓ Saved to your Learner Profile'
                : 'Saves to your LearnerState profile'}
            </span>
          </div>
        </Surface>
      )}

      {/* FOCUS HANDOFF */}
      {(isTopicCompleted || reflectionSaved) && (
        <Surface variant="mint" radius="lg" padding="lg" style={{ textAlign: 'center' }}>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: 'var(--aiims-card-mint-text)',
              margin: '0 0 6px',
              fontFamily: "'Fredoka', sans-serif",
            }}
          >
            You have more clarity on this.
          </h2>

          <p
            style={{
              fontSize: '14px',
              color: 'var(--aiims-card-mint-text)',
              maxWidth: '480px',
              margin: '0 auto 20px',
              lineHeight: 1.5,
            }}
          >
            You understand what <strong>{topicData.title}</strong> means for your work. Now decide
            whether this area deserves your focus right now.
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

            <Button variant="outline" size="lg" onClick={() => setClarityTopic(null)}>
              Explore another area
            </Button>
          </div>
        </Surface>
      )}
    </div>
  );
};
