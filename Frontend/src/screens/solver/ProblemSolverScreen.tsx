import React, { useState, useEffect } from 'react';
import { useLearner } from '../../context/LearnerContext';
import { trackLearningLoopEvent } from '../../services/learningLoop';
import { SolvedWorkflow } from '../../types';
import {
  Wrench,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Layers,
  Wallet,
  BookOpen,
  Cpu,
  Search,
  HelpCircle,
  Lightbulb,
  Zap,
  Radar
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';

interface ProblemSolverScreenProps {
  setActiveTab: (tab: string) => void;
}

interface ProblemPreset {
  id: string;
  title: string;
  description: string;
  category: string;
  sampleInput: string;
}

const PRESETS: ProblemPreset[] = [
  {
    id: 'p-1',
    title: 'Analyze 500 Customer Responses',
    description: 'Extract recurring sentiment, top feature requests, and pain points from qualitative survey feedback.',
    category: 'Data Analysis',
    sampleInput: 'I need to analyze 500 open-ended customer responses to find common complaints and sentiment themes.'
  },
  {
    id: 'p-2',
    title: 'Automate Code Reviews & PR Checks',
    description: 'Set up an automated check to verify pull requests against team coding standards and security patterns.',
    category: 'Agentic Coding',
    sampleInput: 'I want to automate code reviews for pull requests to flag security flaws and style violations.'
  },
  {
    id: 'p-3',
    title: 'Synthesize 20 Dense Research Papers',
    description: 'Build a RAG pipeline or search synthesis workflow to query multi-document academic PDFs.',
    category: 'Research & RAG',
    sampleInput: 'I need to extract key conclusions and comparative data from 20 research PDFs without reading each cover to cover.'
  },
  {
    id: 'p-4',
    title: 'Generate Weekly Executive Status Deck',
    description: 'Transform raw project logs and metric sheets into a polished executive visual presentation.',
    category: 'Presentation',
    sampleInput: 'I need to turn weekly Jira logs and Excel metrics into a clean 5-slide summary deck for leadership.'
  }
];

export const ProblemSolverScreen: React.FC<ProblemSolverScreenProps> = ({ setActiveTab }) => {
  const { state, saveSolvedWorkflow } = useLearner();
  const [inputText, setInputText] = useState<string>('');
  const [activeSolution, setActiveSolution] = useState<SolvedWorkflow | null>(state.solver?.latestWorkflow || null);
  const [isResolving, setIsResolving] = useState<boolean>(false);

  const walletTools = state.aiWallet?.userTools || [];
  const userRole = state.profile.role || 'AI Learner';
  const activeFocus = state.focus.selectedTrack || 'AI Workflow Design';
  const radarContext = state.radarOpportunityContext;

  // Auto-fill from AI Radar Opportunity context if passed
  useEffect(() => {
    if (radarContext?.opportunityTitle && !inputText) {
      const opportunityQuery = `Apply ${radarContext.opportunityTitle}: ${radarContext.opportunityDesc || 'Automate workflow steps using evaluated tools'}`;
      setInputText(opportunityQuery);
      solveProblem(opportunityQuery, radarContext.activeSignalId || undefined);
    }
  }, [radarContext]);

  const solveProblem = (queryText: string, sourceSignalId?: string) => {
    if (!queryText.trim()) return;
    setIsResolving(true);

    setTimeout(() => {
      const queryLower = queryText.toLowerCase();

      let category = 'Data Analysis';
      let requiredCapability = 'Natural Language Categorization & Sentiment Extraction';
      let capabilityDesc = 'Transform unformatted qualitative feedback into structured data categories with explicit confidence ratings.';
      let steps = [
        { stepNumber: 1, title: 'Input Ingestion & Schema Definition', description: 'Define structured JSON schema for Sentiment, Category, and Urgency.', toolCategory: 'Reasoning & Writing' },
        { stepNumber: 2, title: 'Batch Processing & Extraction', description: 'Run structured prompt over 50-item batches to aggregate statistics.', toolCategory: 'Data Analysis' },
        { stepNumber: 3, title: 'Human Verification & Scrutiny', description: 'Audit 5% sample using baseline evaluation protocol to verify accuracy.', toolCategory: 'AI Evaluation' }
      ];

      if (queryLower.includes('code') || queryLower.includes('pr') || queryLower.includes('git')) {
        category = 'Agentic Coding';
        requiredCapability = 'Automated Static Code Analysis & Refactoring';
        capabilityDesc = 'Evaluate code diffs against predefined safety guidelines and highlight syntax optimizations.';
        steps = [
          { stepNumber: 1, title: 'Diff Analysis & Parsing', description: 'Feed PR diff into specialized coding model context window.', toolCategory: 'Agentic Coding' },
          { stepNumber: 2, title: 'Rule Set Verification', description: 'Check against custom style guidelines and vulnerability databases.', toolCategory: 'Agentic Coding' },
          { stepNumber: 3, title: 'Inline Annotation & Review', description: 'Generate human-readable review comments with suggested fixes.', toolCategory: 'Agentic Coding' }
        ];
      } else if (queryLower.includes('paper') || queryLower.includes('pdf') || queryLower.includes('research')) {
        category = 'Research & RAG';
        requiredCapability = 'Multi-Document Retrieval Augmented Generation';
        capabilityDesc = 'Extract semantic facts from dense PDF document collections with citation verification.';
        steps = [
          { stepNumber: 1, title: 'Vector Indexing & Embedding', description: 'Chunk and index PDFs into searchable vector embeddings.', toolCategory: 'Research & RAG' },
          { stepNumber: 2, title: 'Semantic Querying & Synthesis', description: 'Execute natural language queries with document page citations.', toolCategory: 'Research & RAG' },
          { stepNumber: 3, title: 'Citation Scrutiny & Cross-Check', description: 'Verify source quotes against original PDF paragraphs.', toolCategory: 'AI Evaluation' }
        ];
      } else if (queryLower.includes('deck') || queryLower.includes('presentation') || queryLower.includes('slide')) {
        category = 'Presentation';
        requiredCapability = 'Visual Storytelling & Data Structuring';
        capabilityDesc = 'Convert raw tabular data into structured narrative slide layouts.';
        steps = [
          { stepNumber: 1, title: 'Metrics Summarization', description: 'Condense weekly logs into 3 primary key performance indicators.', toolCategory: 'Data Analysis' },
          { stepNumber: 2, title: 'Slide Deck Generation', description: 'Generate styled visual slides using automated slide creation AI.', toolCategory: 'Presentation' },
          { stepNumber: 3, title: 'Executive Polish', description: 'Refine visual spacing, titles, and callouts for presentation.', toolCategory: 'Presentation' }
        ];
      }

      // Match tools in wallet or catalog
      const matchedTools = [
        {
          name: category === 'Agentic Coding' ? 'Claude 3.7 Sonnet / Cursor' : category === 'Research & RAG' ? 'NotebookLM / Perplexity Pro' : 'ChatGPT Plus / Claude 3.5',
          category: category,
          inWallet: walletTools.some((t) => t.primaryCategory === category),
          reason: 'Primary engine for multi-step reasoning and schema compliance.'
        },
        {
          name: category === 'Agentic Coding' ? 'GitHub Copilot' : 'v0 by Vercel / Gamma AI',
          category: category === 'Agentic Coding' ? 'Agentic Coding' : 'Presentation',
          inWallet: false,
          reason: 'Specialized accelerator for output generation and layout.'
        }
      ];

      const newWorkflowPayload = {
        problemSummary: queryText,
        requiredCapability,
        capabilityDescription: capabilityDesc,
        workflowSteps: steps,
        matchedTools,
        suggestedApproach: `Use your top evaluation strength to audit step 3 of this workflow while keeping human oversight over final deliverables.`,
        sourceSignalId
      };

      // Save into central LearnerState
      saveSolvedWorkflow(newWorkflowPayload);

      // Track learning-loop event
      trackLearningLoopEvent({
        eventType: 'PROBLEM_SOLVED',
        metadata: { problemSummary: queryText, category, sourceSignalId }
      });

      const fullWorkflowObj: SolvedWorkflow = {
        ...newWorkflowPayload,
        id: `wf-${Date.now()}`,
        createdAt: new Date().toISOString()
      };

      setActiveSolution(fullWorkflowObj);
      setIsResolving(false);
    }, 600);
  };

  const handleSelectPreset = (preset: ProblemPreset) => {
    setInputText(preset.sampleInput);
    solveProblem(preset.sampleInput);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* PAGE HEADER */}
      <PageHeader
        icon={<Wrench size={24} />}
        title="AI PROBLEM SOLVER"
        description="I have a real problem. Help me figure out how AI can solve it."
        badge={{ label: 'Stage 8 • Real Problem Solving', variant: 'primary', icon: <Sparkles size={12} /> }}
      />

      {/* RADAR OPPORTUNITY CONTEXT BANNER IF PASSED */}
      {radarContext?.opportunityTitle && (
        <Surface variant="highlight" radius="lg" padding="md" style={{ borderLeft: '5px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Radar size={20} color="#059669" />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>
                PRE-POPULATED FROM AI RADAR OPPORTUNITY
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#064e3b' }}>
                {radarContext.opportunityTitle}
              </div>
            </div>
          </div>
        </Surface>
      )}

      {/* INPUT WORKSPACE SURFACE */}
      <Surface variant="gradient-hero" radius="lg" padding="lg">
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', fontFamily: "'Fredoka', sans-serif" }}>
          What problem do you need to solve with AI today?
        </h2>
        <p style={{ fontSize: '13px', color: '#4338ca', margin: '0 0 16px', fontWeight: 600 }}>
          Enter any real task or select a preset template below to derive capability requirements, tool workflows, and step sequence.
        </p>

        {/* INPUT BOX */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && solveProblem(inputText)}
            placeholder="e.g. I need to analyze 500 open-ended customer responses to find pain points..."
            style={{
              flex: 1,
              padding: '14px 18px',
              borderRadius: '12px',
              border: '2px solid #c7d2fe',
              fontSize: '14px',
              outline: 'none',
              fontFamily: 'inherit',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.08)'
            }}
          />
          <Button
            variant="primary"
            size="lg"
            icon={<Sparkles size={18} />}
            disabled={isResolving || !inputText.trim()}
            onClick={() => solveProblem(inputText)}
          >
            {isResolving ? 'Analyzing...' : 'Solve Problem'}
          </Button>
        </div>

        {/* PRESET TEMPLATES */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
            OR CHOOSE A PRESET PROBLEM TEMPLATE
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {PRESETS.map((preset) => (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  border: '1px solid #c7d2fe',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <Badge variant="cyan" style={{ marginBottom: '6px' }}>{preset.category}</Badge>
                  <h4 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                    {preset.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.35 }}>
                    {preset.description}
                  </p>
                </div>
                <div style={{ marginTop: '10px', fontSize: '11px', fontWeight: 700, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Try Preset</span> <ArrowRight size={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Surface>

      {/* DERIVED SOLUTION ARCHITECTURE BREAKDOWN */}
      {activeSolution && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: "'Fredoka', sans-serif" }}>
              AI SOLUTION WORKFLOW
            </h2>
            <Badge variant="purple">Persisted in LearnerState</Badge>
          </div>

          {/* STEP-BY-STEP SOLUTION FLOW */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>

            {/* 1. PROBLEM */}
            <Surface variant="bordered" radius="lg" padding="md" style={{ borderLeft: '5px solid #4f46e5' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '4px' }}>
                1. PROBLEM STATEMENT
              </div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                "{activeSolution.problemSummary}"
              </p>
            </Surface>

            {/* 2. CAPABILITY NEEDED */}
            <Surface variant="bordered" radius="lg" padding="md" style={{ borderLeft: '5px solid #059669' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', marginBottom: '4px' }}>
                2. REQUIRED AI CAPABILITY
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#064e3b' }}>
                {activeSolution.requiredCapability}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#166534', lineHeight: 1.45 }}>
                {activeSolution.capabilityDescription}
              </p>
            </Surface>

            {/* 3. WORKFLOW SEQUENCE */}
            <Surface variant="bordered" radius="lg" padding="lg">
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#9333ea', textTransform: 'uppercase', marginBottom: '12px' }}>
                3. SUGGESTED AI WORKFLOW SEQUENCE
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeSolution.workflowSteps.map((step) => (
                  <div
                    key={step.stepNumber}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                      backgroundColor: '#f8fafc',
                      padding: '14px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: '#9333ea',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '13px',
                      flexShrink: 0
                    }}>
                      {step.stepNumber}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                          {step.title}
                        </h4>
                        <Badge variant="cyan">{step.toolCategory}</Badge>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Surface>

            {/* 4. RELEVANT TOOLS */}
            <Surface variant="bordered" radius="lg" padding="lg">
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', marginBottom: '12px' }}>
                4. RELEVANT AI WALLET & DISCOVERY TOOLS
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                {activeSolution.matchedTools.map((tool, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '10px',
                      padding: '14px',
                      border: tool.inWallet ? '2px solid #22c55e' : '1px solid #cbd5e1',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{tool.name}</h4>
                        {tool.inWallet ? (
                          <Badge variant="success">In Your Wallet</Badge>
                        ) : (
                          <Badge variant="cyan">Discovery Catalog</Badge>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                        {tool.reason}
                      </p>
                    </div>

                    <Button
                      variant={tool.inWallet ? 'outline' : 'primary'}
                      size="sm"
                      icon={<Wallet size={14} />}
                      onClick={() => setActiveTab('wallet')}
                    >
                      {tool.inWallet ? 'View in AI Wallet' : 'Explore in Wallet'}
                    </Button>
                  </div>
                ))}
              </div>
            </Surface>

            {/* 5. ACTIONS: NEXT STEPS (BRIDGE TO STAGE 9 BUILD) */}
            <Surface variant="highlight" radius="lg" padding="lg" style={{ border: '2px solid #6366f1' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                STAGE 9 • BUILD WORKSPACE
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: "'Fredoka', sans-serif" }}>
                Ready to turn this solution into a project?
              </h3>
              <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 20px', lineHeight: 1.5 }}>
                {activeSolution.suggestedApproach}
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Button
                  variant="violet"
                  size="md"
                  icon={<Layers size={16} />}
                  onClick={() => setActiveTab('build')}
                >
                  Build Workflow in Projects
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  icon={<Wallet size={16} />}
                  onClick={() => setActiveTab('wallet')}
                >
                  Explore Tools in Wallet
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  icon={<BookOpen size={16} />}
                  onClick={() => setActiveTab('clarity')}
                >
                  Refine Goal in Clarity
                </Button>
              </div>
            </Surface>

          </div>
        </div>
      )}

    </div>
  );
};
