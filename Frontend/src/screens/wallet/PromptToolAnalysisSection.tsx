import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  AlertCircle,
  HelpCircle,
  Cpu,
  Layers,
  ShieldCheck,
  Compass,
  Check,
  RotateCcw,
  Tag,
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { AITool } from '../../types';
import {
  scorePrompt,
  detectTool,
  suggestTools,
  PromptAnalysisResult,
  SupportedToolName,
  ToolSuggestionResult,
} from '../../services/promptToolAnalysis';

export interface PromptToolAnalysisSectionProps {
  catalog?: AITool[];
  userToolIds?: string[];
}

const SAMPLE_PROMPTS = [
  {
    title: 'Comprehensive Data Analysis Prompt',
    text: 'Act as a Senior Data Scientist. Analyze our customer churn dataset (CSV format, 10,000 records). Context: We are building an early warning system for SaaS enterprise renewals. Identify the top 3 behavioral churn indicators, calculate feature importance, and output the results as a Markdown table followed by a numbered list of actionable retention recommendations. Limit response to 400 words. For example: | Feature | Importance | Rationale |.',
  },
  {
    title: 'Vague One-Liner Prompt',
    text: 'Write code for a chatbot.',
  },
];

export const PromptToolAnalysisSection: React.FC<PromptToolAnalysisSectionProps> = ({
  catalog = [],
  userToolIds = [],
}) => {
  const [promptInput, setPromptInput] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<PromptAnalysisResult | null>(null);
  const [detectedToolName, setDetectedToolName] = useState<SupportedToolName | null>(null);
  const [toolSuggestions, setToolSuggestions] = useState<ToolSuggestionResult | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState<boolean>(false);

  const charCount = promptInput.length;
  const wordCount = promptInput.trim() ? promptInput.trim().split(/\s+/).length : 0;

  const handleAnalyze = () => {
    const scored = scorePrompt(promptInput);
    const detected = detectTool(promptInput);
    const suggestions = suggestTools(promptInput, catalog, userToolIds);

    setAnalysisResult(scored);
    setDetectedToolName(detected);
    setToolSuggestions(suggestions);
    setHasAnalyzed(true);
  };

  const handleClear = () => {
    setPromptInput('');
    setAnalysisResult(null);
    setDetectedToolName(null);
    setToolSuggestions(null);
    setHasAnalyzed(false);
  };

  const handleLoadSample = (sampleText: string) => {
    setPromptInput(sampleText);
    const scored = scorePrompt(sampleText);
    const detected = detectTool(sampleText);
    const suggestions = suggestTools(sampleText, catalog, userToolIds);

    setAnalysisResult(scored);
    setDetectedToolName(detected);
    setToolSuggestions(suggestions);
    setHasAnalyzed(true);
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'var(--aiims-token-mint-text, #059669)';
    if (score >= 70) return 'var(--aiims-primary, #6366f1)';
    if (score >= 50) return 'var(--aiims-token-sunshine-text, #d97706)';
    return 'var(--aiims-token-coral-text, #dc2626)';
  };

  const getGradeBadgeVariant = (grade: string) => {
    switch (grade) {
      case 'Excellent':
        return 'success';
      case 'Good':
        return 'primary';
      case 'Fair':
        return 'warning';
      default:
        return 'coral';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* HEADER BANNER */}
      <Surface
        variant="highlight"
        radius="lg"
        padding="lg"
        style={{
          border: '1px solid var(--aiims-card-banner-border, #e0e7ff)',
          backgroundColor: 'var(--aiims-card-banner-bg, #f5f7ff)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Badge variant="purple" size="sm" icon={<Sparkles size={13} />}>
                Deterministic Prompt Diagnostics
              </Badge>
              <Badge variant="mint" size="sm" icon={<ShieldCheck size={13} />}>
                100% Client-Side Privacy
              </Badge>
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'var(--aiims-text-primary, #1e1b4b)',
              }}
            >
              Prompt Analysis & AI Tool Matching
            </h2>
            <p
              style={{
                margin: '6px 0 0',
                fontSize: '0.9rem',
                color: 'var(--aiims-text-secondary, #475569)',
                maxWidth: '780px',
              }}
            >
              Evaluate prompt efficiency, uncover structural gaps (action verbs, context,
              constraints, formatting), detect mentioned foundation models, and receive tailored
              AIIMS catalog recommendations.
            </p>
          </div>
        </div>
      </Surface>

      {/* INPUT WORKBENCH */}
      <Surface variant="bordered" radius="lg" padding="lg">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
          }}
        >
          <label
            style={{
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--aiims-text-primary, #1e293b)',
            }}
          >
            Enter Prompt to Analyze
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--aiims-text-muted, #64748b)' }}>
              {charCount} characters · {wordCount} words
            </span>
            {promptInput && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                icon={<RotateCcw size={13} />}
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        <textarea
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
          placeholder="Paste or write your prompt here... (e.g., 'Act as a Senior Architect. Analyze our API latency bottleneck...')"
          rows={6}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid var(--aiims-border-subtle, #cbd5e1)',
            backgroundColor: 'var(--aiims-input-bg, #ffffff)',
            color: 'var(--aiims-text-primary, #0f172a)',
            fontSize: '0.92rem',
            fontFamily: 'inherit',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
            lineHeight: 1.5,
          }}
        />

        {/* QUICK SAMPLES & ACTION BUTTON */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--aiims-text-muted, #64748b)' }}>
              Try sample:
            </span>
            {SAMPLE_PROMPTS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleLoadSample(sample.text)}
                style={{
                  background: 'var(--aiims-badge-subtle-bg, #f1f5f9)',
                  border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  color: 'var(--aiims-text-secondary, #334155)',
                }}
              >
                {sample.title}
              </button>
            ))}
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleAnalyze}
            disabled={!promptInput.trim()}
            icon={<Zap size={15} />}
          >
            Analyze Prompt
          </Button>
        </div>
      </Surface>

      {/* ANALYSIS RESULTS SECTION */}
      {hasAnalyzed && analysisResult && (
        <>
          {/* TOP SCORE OVERVIEW */}
          <Surface variant="bordered" radius="lg" padding="lg">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '20px',
                alignItems: 'center',
              }}
            >
              {/* TOTAL SCORE */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div
                  style={{
                    width: '84px',
                    height: '84px',
                    borderRadius: '50%',
                    border: `5px solid ${getScoreColor(analysisResult.totalScore)}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--aiims-surface-subtle, #f8fafc)',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: '1.6rem',
                      fontWeight: 800,
                      color: getScoreColor(analysisResult.totalScore),
                      lineHeight: 1,
                    }}
                  >
                    {analysisResult.totalScore}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--aiims-text-muted, #64748b)',
                      marginTop: '2px',
                    }}
                  >
                    / 100
                  </span>
                </div>
                <div>
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
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        color: 'var(--aiims-text-primary, #0f172a)',
                      }}
                    >
                      Prompt Efficiency Score
                    </h3>
                    <Badge variant={getGradeBadgeVariant(analysisResult.grade)} size="sm">
                      {analysisResult.grade}
                    </Badge>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.84rem',
                      color: 'var(--aiims-text-secondary, #475569)',
                    }}
                  >
                    Measures structural completeness, task specificity, pacing, and constraints.
                  </p>
                </div>
              </div>

              {/* DETECTED AI TOOL & EVIDENCE */}
              <div
                style={{
                  backgroundColor: 'var(--aiims-card-bg, #f8fafc)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}
                >
                  <Cpu size={15} style={{ color: 'var(--aiims-primary, #6366f1)' }} />
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--aiims-text-secondary, #334155)',
                    }}
                  >
                    Target AI Tool Mentioned
                  </span>
                </div>
                {detectedToolName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge variant="purple" size="md" icon={<Zap size={13} />}>
                      {detectedToolName}
                    </Badge>
                    <span style={{ fontSize: '0.8rem', color: 'var(--aiims-text-muted, #64748b)' }}>
                      Explicitly referenced in prompt
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.84rem', color: 'var(--aiims-text-muted, #64748b)' }}>
                    No specific foundation model named in the prompt text.
                  </span>
                )}
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div style={{ marginTop: '20px' }}>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: 'var(--aiims-border-subtle, #e2e8f0)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${analysisResult.totalScore}%`,
                    height: '100%',
                    backgroundColor: getScoreColor(analysisResult.totalScore),
                    transition: 'width 0.4s ease-in-out',
                  }}
                />
              </div>
            </div>

            {/* PRIVACY & EVALUATION NOTICE */}
            <div
              style={{
                marginTop: '16px',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--aiims-token-lavender-bg, #f5f3ff)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.78rem',
                color: 'var(--aiims-token-lavender-accent, #6d28d9)',
              }}
            >
              <ShieldCheck size={14} style={{ flexShrink: 0 }} />
              <span>
                Note: This score evaluates prompt engineering structure, clarity, and constraints.
                It does not guarantee AI provider output quality. All computations execute 100%
                client-side without storing or sending your prompt.
              </span>
            </div>
          </Surface>

          {/* CRITERION BREAKDOWN GRID */}
          <div>
            <h3
              style={{
                margin: '0 0 12px',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--aiims-text-primary, #0f172a)',
              }}
            >
              Individual Criterion Breakdown
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
                gap: '14px',
              }}
            >
              {/* Criterion: Action Verb */}
              <CriterionCard
                title="Clear Action Verb"
                criterion={analysisResult.breakdown.actionVerb}
                icon={<Zap size={15} />}
              />

              {/* Criterion: Context / Background */}
              <CriterionCard
                title="Context & Background"
                criterion={analysisResult.breakdown.context}
                icon={<Layers size={15} />}
              />

              {/* Criterion: Target Role / Audience */}
              <CriterionCard
                title="Target Role or Audience"
                criterion={analysisResult.breakdown.roleAudience}
                icon={<Compass size={15} />}
              />

              {/* Criterion: Output Format */}
              <CriterionCard
                title="Output Format Specification"
                criterion={analysisResult.breakdown.outputFormat}
                icon={<Tag size={15} />}
              />

              {/* Criterion: Constraints */}
              <CriterionCard
                title="Constraints & Requirements"
                criterion={analysisResult.breakdown.constraints}
                icon={<ShieldCheck size={15} />}
              />

              {/* Criterion: Examples */}
              <CriterionCard
                title="Few-Shot Examples"
                criterion={analysisResult.breakdown.examples}
                icon={<Sparkles size={15} />}
              />

              {/* Criterion: Length & Pacing */}
              <CriterionCard
                title="Reasonable Length & Pacing"
                criterion={analysisResult.breakdown.lengthPacing}
                icon={<HelpCircle size={15} />}
              />
            </div>
          </div>

          {/* IMPROVEMENT SUGGESTIONS */}
          {analysisResult.suggestions.length > 0 && (
            <Surface
              variant="bordered"
              radius="lg"
              padding="md"
              style={{ borderLeft: '4px solid var(--aiims-primary, #6366f1)' }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}
              >
                <AlertCircle size={16} style={{ color: 'var(--aiims-primary, #6366f1)' }} />
                <h4
                  style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--aiims-text-primary, #0f172a)',
                  }}
                >
                  Actionable Improvement Suggestions
                </h4>
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '20px',
                  fontSize: '0.88rem',
                  color: 'var(--aiims-text-secondary, #334155)',
                  lineHeight: 1.6,
                }}
              >
                {analysisResult.suggestions.map((suggestion, idx) => (
                  <li key={idx}>{suggestion}</li>
                ))}
              </ul>
            </Surface>
          )}

          {/* TOOLKIT GAPS */}
          {toolSuggestions && toolSuggestions.toolkitGaps.length > 0 && (
            <Surface
              variant="bordered"
              radius="lg"
              padding="md"
              style={{
                backgroundColor: 'var(--aiims-token-sunshine-bg, #fffbeb)',
                border: '1px solid var(--aiims-token-sunshine-border, #fef3c7)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}
              >
                <AlertCircle
                  size={16}
                  style={{ color: 'var(--aiims-token-sunshine-text, #b45309)' }}
                />
                <h4
                  style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: 'var(--aiims-token-sunshine-text, #92400e)',
                  }}
                >
                  Identified Toolkit Gaps for this Task
                </h4>
              </div>
              <p
                style={{
                  margin: '0 0 10px',
                  fontSize: '0.84rem',
                  color: 'var(--aiims-token-sunshine-text, #78350f)',
                }}
              >
                Based on your prompt requirement, your AI Wallet currently lacks a configured tool
                in these areas:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {toolSuggestions.toolkitGaps.map((gap, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.7)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #fde68a',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#92400e' }}>
                      {gap.title}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#78350f', marginTop: '2px' }}>
                      {gap.description}
                    </div>
                  </div>
                ))}
              </div>
            </Surface>
          )}

          {/* RECOMMENDED AI TOOLS */}
          {toolSuggestions && toolSuggestions.recommendedTools.length > 0 && (
            <div>
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
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: 'var(--aiims-text-primary, #0f172a)',
                    }}
                  >
                    Recommended AI Tools for this Prompt
                  </h3>
                  <p
                    style={{
                      margin: '2px 0 0',
                      fontSize: '0.82rem',
                      color: 'var(--aiims-text-secondary, #64748b)',
                    }}
                  >
                    Matched from your AIIMS catalog based on capabilities, task requirements, and
                    strengths.
                  </p>
                </div>
                <Badge variant="neutral" size="sm">
                  {toolSuggestions.totalMatches} matched catalog tools
                </Badge>
              </div>

              {/* CATEGORY GROUPS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.entries(toolSuggestions.categoryGroups).map(([category, tools]) => (
                  <div key={category}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          color: 'var(--aiims-text-primary, #1e293b)',
                        }}
                      >
                        {category}
                      </span>
                      <span
                        style={{ fontSize: '0.78rem', color: 'var(--aiims-text-muted, #64748b)' }}
                      >
                        ({tools.length} recommended)
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                        gap: '12px',
                      }}
                    >
                      {tools.map((item) => (
                        <Surface key={item.tool.id} variant="bordered" radius="md" padding="md">
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: '6px',
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize: '0.95rem',
                                  color: 'var(--aiims-text-primary, #0f172a)',
                                }}
                              >
                                {item.tool.name}
                              </div>
                              <span
                                style={{
                                  fontSize: '0.78rem',
                                  color: 'var(--aiims-text-muted, #64748b)',
                                }}
                              >
                                by {item.tool.provider || 'AI Provider'}
                              </span>
                            </div>
                            <Badge
                              variant={item.relevanceScore >= 60 ? 'purple' : 'neutral'}
                              size="sm"
                            >
                              {item.relevanceScore}% Match
                            </Badge>
                          </div>

                          <p
                            style={{
                              margin: '4px 0 8px',
                              fontSize: '0.82rem',
                              color: 'var(--aiims-text-secondary, #475569)',
                              lineHeight: 1.4,
                            }}
                          >
                            {item.explanation}
                          </p>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginTop: '10px',
                              paddingTop: '8px',
                              borderTop: '1px solid var(--aiims-border-subtle, #f1f5f9)',
                            }}
                          >
                            <Badge variant="outline" size="sm">
                              {item.tool.pricing ||
                                item.tool.pricingDetails?.summary ||
                                'Free Tier'}
                            </Badge>

                            {item.isAlreadyInToolkit ? (
                              <Badge variant="mint" size="sm" icon={<Check size={12} />}>
                                In Your Toolkit
                              </Badge>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.78rem',
                                  color: 'var(--aiims-text-muted, #64748b)',
                                }}
                              >
                                Suggested addition
                              </span>
                            )}
                          </div>
                        </Surface>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface CriterionCardProps {
  title: string;
  criterion: {
    score: number;
    maxScore: number;
    detected: boolean;
    evidence?: string;
    feedback: string;
  };
  icon: React.ReactNode;
}

const CriterionCard: React.FC<CriterionCardProps> = ({ title, criterion, icon }) => {
  const isFull = criterion.score === criterion.maxScore;
  const isPartial = criterion.score > 0 && criterion.score < criterion.maxScore;

  return (
    <Surface
      variant="bordered"
      radius="md"
      padding="md"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: 'var(--aiims-card-bg, #ffffff)',
      }}
    >
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                color: isFull
                  ? 'var(--aiims-token-mint-text, #059669)'
                  : 'var(--aiims-primary, #6366f1)',
              }}
            >
              {icon}
            </span>
            <span
              style={{
                fontWeight: 600,
                fontSize: '0.88rem',
                color: 'var(--aiims-text-primary, #1e293b)',
              }}
            >
              {title}
            </span>
          </div>

          <Badge variant={isFull ? 'success' : isPartial ? 'warning' : 'outline'} size="sm">
            {criterion.score} / {criterion.maxScore}
          </Badge>
        </div>

        <p
          style={{
            margin: '4px 0 0',
            fontSize: '0.82rem',
            color: 'var(--aiims-text-secondary, #475569)',
            lineHeight: 1.4,
          }}
        >
          {criterion.feedback}
        </p>

        {criterion.evidence && (
          <div
            style={{
              marginTop: '6px',
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: 'var(--aiims-surface-subtle, #f8fafc)',
              fontSize: '0.78rem',
              color: 'var(--aiims-text-primary, #0f172a)',
              fontFamily: 'monospace',
            }}
          >
            Evidence: {criterion.evidence}
          </div>
        )}
      </div>
    </Surface>
  );
};
