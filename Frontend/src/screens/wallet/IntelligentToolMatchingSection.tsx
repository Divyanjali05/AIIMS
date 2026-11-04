import React, { useState } from 'react';
import {
  Sparkles,
  ExternalLink,
  Plus,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Check,
  Zap,
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { apiClient } from '../../api/client';
import { AITool, TaskCategory } from '../../types';

interface MatchedToolItem {
  toolId: string;
  name: string;
  provider: string;
  category: string;
  description: string;
  matchScore: number;
  matchLabel: string;
  confidence: number;
  whyMatches: string[];
  limitations: string[];
  pricing: string;
  freeTierAvailable: boolean;
  pricingType: string;
  isIntegrated: boolean;
  officialWebsite?: string;
  learningTrackLevel1?: string | null;
}

interface ToolCombination {
  workflowName: string;
  description: string;
  tools: string[];
}

interface IntelligentToolMatchingSectionProps {
  catalog: AITool[];
  userTools: Array<{ toolId: string }>;
  onAddTool: (tool: { id: string; name: string; category?: TaskCategory }) => void;
  onOpenToolDetail?: (tool: AITool, reason?: string) => void;
  currentAudienceMode?: 'student' | 'entrepreneur';
}

const DESIRED_OUTPUTS = [
  'All Outputs',
  'Document / Report',
  'Presentation / Slides',
  'Spreadsheet / Data',
  'Code / App Scaffolding',
  'Image / Graphic',
  'Video / Animation',
  'Workflow Automation',
];

const INPUT_FORMATS = [
  'Text Prompt',
  'Document / PDF',
  'Codebase / Git Repo',
  'Tabular / CSV',
  'Audio / Speech',
];

const PROMPT_SUGGESTIONS = {
  student: [
    {
      title: 'Academic Literature Review',
      task: 'Review 50-page PDF academic papers and summarize key methodology, citations, and findings.',
      output: 'Document / Report',
    },
    {
      title: 'Statistical Dataset Analysis',
      task: 'Clean tabular CSV experimental data and generate summary statistics and charts.',
      output: 'Spreadsheet / Data',
    },
    {
      title: 'Full-Stack Web App Scaffolding',
      task: 'Generate React and TypeScript components with accessible UI tokens.',
      output: 'Code / App Scaffolding',
    },
    {
      title: 'Seminar Presentation Deck',
      task: 'Create a clean 10-slide visual presentation from research notes.',
      output: 'Presentation / Slides',
    },
  ],
  entrepreneur: [
    {
      title: 'MVP Prototype Scaffolding',
      task: 'Build interactive frontend wireframes and rapid React prototype for investor demo.',
      output: 'Code / App Scaffolding',
    },
    {
      title: 'Customer Interview Synthesis',
      task: 'Extract customer pain points, quotes, and feature requests from 10 user interview transcripts.',
      output: 'Document / Report',
    },
    {
      title: 'Investor Pitch Deck',
      task: 'Generate high-impact investor pitch deck with market sizing and business model graphics.',
      output: 'Presentation / Slides',
    },
    {
      title: 'Automated Lead Qualification',
      task: 'Connect CRM webhook to automated outbound email generation and lead scoring.',
      output: 'Workflow Automation',
    },
  ],
};

export const IntelligentToolMatchingSection: React.FC<IntelligentToolMatchingSectionProps> = ({
  catalog,
  userTools,
  onAddTool,
  onOpenToolDetail,
  currentAudienceMode = 'student',
}) => {
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [desiredOutput, setDesiredOutput] = useState<string>('All Outputs');
  const [inputFormat, setInputFormat] = useState<string>('Text Prompt');
  const [freeOnly, setFreeOnly] = useState<boolean>(false);
  const [isMatching, setIsMatching] = useState<boolean>(false);

  const [matches, setMatches] = useState<MatchedToolItem[]>([]);
  const [combinations, setCombinations] = useState<ToolCombination[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [addedToolId, setAddedToolId] = useState<string | null>(null);

  const handleRunMatch = async (customTask?: string, customOutput?: string) => {
    const task = (customTask !== undefined ? customTask : taskDescription).trim();
    if (!task || task.length < 3 || isMatching) return;

    if (customTask) setTaskDescription(customTask);
    const outputParam = customOutput !== undefined ? customOutput : desiredOutput;
    if (customOutput) setDesiredOutput(customOutput);

    setIsMatching(true);
    setHasSearched(true);

    try {
      const res = await apiClient.matchTools({
        taskDescription: task,
        desiredOutput: outputParam !== 'All Outputs' ? outputParam : undefined,
        inputFormat: inputFormat || undefined,
        freeOnly,
      });

      if (res && res.matches) {
        setMatches(res.matches);
        setCombinations(res.toolCombinations || []);
        setSuggestions(res.suggestionsIfNoMatches || []);
      }
    } catch (err) {
      console.error('Intelligent tool matching failed:', err);
    } finally {
      setIsMatching(false);
    }
  };

  const handleAdd = (m: MatchedToolItem) => {
    onAddTool({
      id: m.toolId,
      name: m.name,
      category: m.category as TaskCategory,
    });
    setAddedToolId(m.toolId);
    setTimeout(() => setAddedToolId(null), 2500);
  };

  const promptList =
    currentAudienceMode === 'entrepreneur'
      ? PROMPT_SUGGESTIONS.entrepreneur
      : PROMPT_SUGGESTIONS.student;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. TASK-FIRST REQUIREMENT BUILDER HERO */}
      <Surface variant="gradient-hero" radius="lg" padding="lg">
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--aiims-primary)',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            TASK-FIRST INTELLIGENT MATCHING
          </div>
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading)',
              margin: '0 0 6px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {currentAudienceMode === 'entrepreneur'
              ? 'Match AI Tools for Your Startup Milestone'
              : 'Match AI Tools for Your Study & Project Goals'}
          </h2>
          <p
            style={{
              fontSize: '13.5px',
              color: 'var(--aiims-primary)',
              margin: 0,
              fontWeight: 500,
            }}
          >
            Describe what you need to achieve in plain English. AIIMS performs multi-signal scoring
            against our verified catalog with transparent reasons, limitations, and pricing.
          </p>
        </div>

        {/* PROMPT CHIP SUGGESTIONS */}
        <div style={{ marginBottom: '14px' }}>
          <div
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              color: 'var(--aiims-text-secondary)',
              marginBottom: '6px',
            }}
          >
            Try an example prompt:
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {promptList.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleRunMatch(p.task, p.output)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--aiims-border-card)',
                  backgroundColor: 'var(--aiims-bg-card)',
                  color: 'var(--aiims-text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Sparkles size={11} color="var(--aiims-primary)" />
                <span>{p.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* INPUT TEXTAREA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <textarea
              rows={3}
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleRunMatch();
                }
              }}
              placeholder="e.g. I need an AI tool to review 10 research papers, extract quantitative results, and format APA citations..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                borderRadius: '12px',
                border: '1px solid var(--aiims-border-card-hover)',
                padding: '12px 16px',
                fontSize: '14px',
                fontFamily: "'Nunito', sans-serif",
                color: 'var(--aiims-input-text)',
                outline: 'none',
                backgroundColor: 'var(--aiims-input-bg)',
                boxShadow: 'var(--aiims-shadow-card)',
              }}
            />
          </div>

          {/* DESIRED OUTPUT FILTER CHIPS */}
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--aiims-text-secondary)',
                marginBottom: '6px',
              }}
            >
              Desired Output Format:
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {DESIRED_OUTPUTS.map((out) => {
                const isSelected = desiredOutput === out;
                return (
                  <button
                    key={out}
                    type="button"
                    onClick={() => setDesiredOutput(out)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      border: isSelected
                        ? '1px solid var(--aiims-primary)'
                        : '1px solid var(--aiims-border-card)',
                      backgroundColor: isSelected ? 'var(--aiims-primary)' : 'var(--aiims-bg-card)',
                      color: isSelected ? '#ffffff' : 'var(--aiims-text-secondary)',
                      fontSize: '12px',
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                    }}
                  >
                    {out}
                  </button>
                );
              })}
            </div>
          </div>

          {/* INPUT FORMAT & FREE TIER TOGGLE */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              paddingTop: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-secondary)',
                  }}
                >
                  Input Format:
                </span>
                <select
                  value={inputFormat}
                  onChange={(e) => setInputFormat(e.target.value)}
                  style={{
                    padding: '5px 8px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    border: '1px solid var(--aiims-border-card)',
                    backgroundColor: 'var(--aiims-input-bg)',
                    color: 'var(--aiims-input-text)',
                  }}
                >
                  {INPUT_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '12.5px',
                  color: 'var(--aiims-text-secondary)',
                  fontWeight: 600,
                }}
              >
                <input
                  type="checkbox"
                  checked={freeOnly}
                  onChange={(e) => setFreeOnly(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span>Free or Free Tier available only</span>
              </label>
            </div>

            <Button
              variant="primary"
              size="md"
              disabled={isMatching || taskDescription.trim().length < 3}
              icon={<Sparkles size={16} />}
              onClick={() => handleRunMatch()}
            >
              {isMatching ? 'Matching Tools...' : 'Match AI Tools'}
            </Button>
          </div>
        </div>
      </Surface>

      {/* 2. MATCHING RESULTS LIST */}
      {hasSearched && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 2px',
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '17px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading)',
                }}
              >
                Matching AI Tools ({matches.length})
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--aiims-text-muted)' }}>
                Ranked by task intent alignment, capability domain, and input/output relevance
              </p>
            </div>
            <Badge variant="mint" size="sm" icon={<ShieldCheck size={12} />}>
              100% Catalog Grounded
            </Badge>
          </div>

          {matches.length === 0 ? (
            <Surface radius="lg" padding="lg">
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <AlertCircle
                  size={32}
                  style={{ color: 'var(--aiims-tint-amber-text)', margin: '0 auto 12px' }}
                />
                <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800 }}>
                  No Direct Tool Matches Found
                </h4>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--aiims-text-muted)',
                    maxWidth: '500px',
                    margin: '0 auto 14px',
                  }}
                >
                  We could not find a verified tool matching all your constraints in the active
                  catalog.
                </p>
                {suggestions.length > 0 && (
                  <div
                    style={{
                      textAlign: 'left',
                      maxWidth: '480px',
                      margin: '0 auto',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--aiims-card-banner-bg)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        marginBottom: '6px',
                        color: 'var(--aiims-text-heading)',
                      }}
                    >
                      Suggestions:
                    </div>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: '18px',
                        fontSize: '12.5px',
                        color: 'var(--aiims-text-secondary)',
                      }}
                    >
                      {suggestions.map((s, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Surface>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
              {matches.map((m) => {
                const inWallet = userTools.some((u) => u.toolId === m.toolId);
                const isJustAdded = addedToolId === m.toolId;
                const fullTool = catalog.find((c) => c.id === m.toolId);

                return (
                  <Surface
                    key={m.toolId}
                    radius="lg"
                    padding="md"
                    style={{
                      borderLeft:
                        m.matchScore >= 90
                          ? '4px solid var(--aiims-tint-emerald-text)'
                          : '4px solid var(--aiims-primary)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* HEADER ROW */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <h4
                              style={{
                                margin: 0,
                                fontSize: '17px',
                                fontWeight: 800,
                                color: 'var(--aiims-text-heading)',
                              }}
                            >
                              {m.name}
                            </h4>
                            <span
                              style={{
                                fontSize: '12px',
                                color: 'var(--aiims-text-muted)',
                                fontWeight: 600,
                              }}
                            >
                              by {m.provider}
                            </span>
                            <Badge variant={m.matchScore >= 90 ? 'success' : 'primary'} size="sm">
                              {m.matchScore}% Match ({m.matchLabel})
                            </Badge>
                            {m.isIntegrated ? (
                              <Badge variant="cyan" size="sm" icon={<Zap size={10} />}>
                                AIIMS Native Integration
                              </Badge>
                            ) : (
                              <Badge variant="neutral" size="sm">
                                External Verified Tool
                              </Badge>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: '12.5px',
                              color: 'var(--aiims-text-secondary)',
                              marginTop: '4px',
                            }}
                          >
                            {m.description}
                          </div>
                        </div>

                        {/* PRICING BADGE */}
                        <Badge variant={m.freeTierAvailable ? 'mint' : 'warning'} size="sm">
                          {m.pricing}
                        </Badge>
                      </div>

                      {/* WHY THIS MATCHES BULLETS */}
                      {m.whyMatches && m.whyMatches.length > 0 && (
                        <div
                          style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--aiims-tint-emerald-bg)',
                            border: '1px solid var(--aiims-tint-emerald-border)',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              color: 'var(--aiims-tint-emerald-text)',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase',
                              marginBottom: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <CheckCircle2 size={13} />
                            <span>Why This Tool Matches Your Task:</span>
                          </div>
                          <ul
                            style={{
                              margin: 0,
                              paddingLeft: '18px',
                              fontSize: '12.5px',
                              color: 'var(--aiims-tint-emerald-text)',
                            }}
                          >
                            {m.whyMatches.map((w, idx) => (
                              <li key={idx} style={{ marginBottom: '2px' }}>
                                {w}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* LIMITATIONS */}
                      {m.limitations && m.limitations.length > 0 && (
                        <div
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--aiims-card-banner-bg)',
                            fontSize: '12px',
                            color: 'var(--aiims-text-secondary)',
                          }}
                        >
                          <span style={{ fontWeight: 800, color: 'var(--aiims-text-heading)' }}>
                            Limitations to Note:{' '}
                          </span>
                          <span>{m.limitations.join(' • ')}</span>
                        </div>
                      )}

                      {/* ACTION BUTTONS ROW */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px',
                          paddingTop: '6px',
                          borderTop: '1px solid var(--aiims-border-card)',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {inWallet ? (
                            <Badge variant="success" size="sm" icon={<Check size={12} />}>
                              In Your Tech Stack
                            </Badge>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={isJustAdded ? <Check size={14} /> : <Plus size={14} />}
                              onClick={() => handleAdd(m)}
                            >
                              {isJustAdded ? 'Added!' : 'Add to Tech Stack'}
                            </Button>
                          )}

                          {fullTool && onOpenToolDetail && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                onOpenToolDetail(fullTool, `Matched for: ${taskDescription}`)
                              }
                            >
                              View Details & Track
                            </Button>
                          )}
                        </div>

                        {m.officialWebsite && (
                          <a
                            href={m.officialWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '12.5px',
                              color: 'var(--aiims-primary)',
                              textDecoration: 'none',
                              fontWeight: 700,
                            }}
                          >
                            <span>Visit Official Tool</span>
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    </div>
                  </Surface>
                );
              })}
            </div>
          )}

          {/* 3. MULTI-TOOL COMBINATION WORKFLOWS */}
          {combinations.length > 0 && (
            <Surface radius="lg" padding="md" style={{ marginTop: '8px' }}>
              <div style={{ marginBottom: '12px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: 'var(--aiims-primary)',
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                  }}
                >
                  COMPOSABLE STACK
                </div>
                <h4
                  style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading)',
                    margin: '2px 0 0',
                  }}
                >
                  Suggested Multi-Tool Workflows
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {combinations.map((comb, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--aiims-card-banner-bg)',
                      border: '1px solid var(--aiims-border-card)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13.5px',
                        fontWeight: 800,
                        color: 'var(--aiims-text-heading)',
                        marginBottom: '4px',
                      }}
                    >
                      {comb.workflowName}
                    </div>
                    <div
                      style={{
                        fontSize: '12.5px',
                        color: 'var(--aiims-text-secondary)',
                        marginBottom: '8px',
                      }}
                    >
                      {comb.description}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {comb.tools.map((tName, tIdx) => (
                        <React.Fragment key={tIdx}>
                          <Badge variant="primary" size="sm">
                            {tName}
                          </Badge>
                          {tIdx < comb.tools.length - 1 && (
                            <ArrowRight size={12} style={{ color: 'var(--aiims-text-muted)' }} />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Surface>
          )}
        </div>
      )}
    </div>
  );
};
