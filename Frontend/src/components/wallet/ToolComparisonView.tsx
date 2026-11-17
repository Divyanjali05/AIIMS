import React, { useState, useEffect } from 'react';
import {
  ArrowRightLeft,
  X,
  Plus,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Surface } from '../common/Surface';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { AITool, RequirementToolComparison } from '../../types';
import { apiClient } from '../../api/client';
import { MarketTierBadge } from './MarketTierBadge';

export interface ToolComparisonViewProps {
  allCatalogTools: AITool[];
  selectedToolIds: string[];
  onRemoveTool: (toolId: string) => void;
  onAddTool: (toolId: string) => void;
  onClearAll: () => void;
}

export const ToolComparisonView: React.FC<ToolComparisonViewProps> = ({
  allCatalogTools,
  selectedToolIds,
  onRemoveTool,
  onAddTool,
  onClearAll,
}) => {
  const [requirementText, setRequirementText] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<RequirementToolComparison | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tools currently selected
  const selectedTools = selectedToolIds
    .map((id) => allCatalogTools.find((t) => t.id === id))
    .filter(Boolean) as AITool[];

  const canCompare = selectedTools.length >= 2 && selectedTools.length <= 4;

  const handleRunComparison = async () => {
    if (!canCompare) {
      setErrorMessage('Please select between 2 and 4 AI tools to run a side-by-side comparison.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await apiClient.compareToolsForRequirement(
        selectedToolIds,
        requirementText.trim() || undefined
      );
      if (res && res.tools) {
        setComparisonResult(res);
      } else {
        setErrorMessage(
          res?.error || 'Unable to generate comparison. Please check selected tools.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Comparison request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Run automatically when selectedTools change and count is between 2 and 4
  useEffect(() => {
    if (canCompare) {
      handleRunComparison();
    } else {
      setComparisonResult(null);
    }
  }, [selectedToolIds.join(',')]);

  // Unselected tools for adding
  const unselectedTools = allCatalogTools.filter((t) => !selectedToolIds.includes(t.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Tool Selection Bar */}
      <Surface variant="bordered" radius="lg" padding="md">
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
                fontSize: '16px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <ArrowRightLeft size={18} style={{ color: 'var(--aiims-primary)' }} />
              Side-by-Side Tool Comparison ({selectedTools.length}/4)
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--aiims-text-muted)' }}>
              Compare features, market tiers, pricing structures, and limitations across 2 to 4
              tools. Free of charge (0 AC, 0 XP).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {selectedTools.length > 0 && (
              <Button variant="ghost" size="sm" onClick={onClearAll}>
                Clear All
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              disabled={!canCompare || isLoading}
              icon={isLoading ? <RefreshCw size={13} className="spin" /> : <Sparkles size={13} />}
              onClick={handleRunComparison}
            >
              {isLoading ? 'Comparing...' : 'Refresh Comparison'}
            </Button>
          </div>
        </div>

        {/* Selected Tools Chips */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          {selectedTools.map((tool) => (
            <span
              key={tool.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--aiims-card-banner-bg, #eef2ff)',
                border: '1px solid var(--aiims-border-card, #c7d2fe)',
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--aiims-primary, #4338ca)',
              }}
            >
              <span>{tool.name}</span>
              <MarketTierBadge
                marketTier={tool.marketTier}
                marketTierLabel={tool.marketTierLabel}
                size="sm"
              />
              <button
                type="button"
                onClick={() => onRemoveTool(tool.id)}
                title={`Remove ${tool.name}`}
                aria-label={`Remove ${tool.name} from comparison`}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--aiims-primary)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            </span>
          ))}

          {selectedTools.length < 4 && (
            <select
              aria-label="Add tool to comparison"
              value=""
              onChange={(e) => {
                if (e.target.value) onAddTool(e.target.value);
              }}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px dashed var(--aiims-border-card, #cbd5e1)',
                backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                color: 'var(--aiims-text-muted, #64748b)',
                fontSize: '12px',
                fontWeight: 600,
                fontFamily: "'Nunito', sans-serif",
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="" disabled>
                + Add tool to compare ({4 - selectedTools.length} remaining)...
              </option>
              {unselectedTools.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.provider})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Optional Task Requirement Grounding */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            value={requirementText}
            onChange={(e) => setRequirementText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRunComparison();
            }}
            placeholder="Optional requirement: e.g. Generating interactive pitch deck slides for healthcare investors..."
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--aiims-border-card)',
              backgroundColor: 'var(--aiims-bg-card)',
              color: 'var(--aiims-text-primary)',
              fontSize: '12.5px',
              fontFamily: "'Nunito', sans-serif",
              outline: 'none',
            }}
          />
        </div>
      </Surface>

      {/* Error Message */}
      {errorMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'var(--aiims-token-coral-bg, #fff1f2)',
            border: '1px solid var(--aiims-token-coral-border, #fecdd3)',
            color: 'var(--aiims-token-coral-text, #be123c)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Insufficient tools prompt */}
      {selectedTools.length < 2 && (
        <Surface variant="bordered" radius="lg" padding="lg" style={{ textAlign: 'center' }}>
          <ArrowRightLeft
            size={36}
            style={{ color: 'var(--aiims-primary)', margin: '0 auto 12px' }}
          />
          <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800 }}>
            Select at least 2 AI tools to compare
          </h4>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--aiims-text-secondary)' }}>
            Use the checkbox on tool cards in the catalog or the dropdown above to add up to 4
            tools.
          </p>
        </Surface>
      )}

      {/* Comparison Grid Results */}
      {canCompare && (
        <div
          style={{
            overflowX: 'auto',
            borderRadius: '12px',
            border: '1px solid var(--aiims-border-card)',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: 'var(--aiims-bg-card, #ffffff)',
              fontSize: '13px',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                  borderBottom: '2px solid var(--aiims-border-card)',
                }}
              >
                <th
                  style={{
                    padding: '12px 16px',
                    width: '180px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-muted)',
                  }}
                >
                  Criteria
                </th>
                {selectedTools.map((tool) => (
                  <th
                    key={tool.id}
                    style={{
                      padding: '12px 16px',
                      fontWeight: 800,
                      color: 'var(--aiims-text-heading)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '15px' }}>{tool.name}</div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--aiims-text-muted)',
                            fontWeight: 600,
                          }}
                        >
                          {tool.provider}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveTool(tool.id)}
                        aria-label={`Remove ${tool.name} from comparison`}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--aiims-text-muted)',
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Row 1: Market Tier */}
              <tr style={{ borderBottom: '1px solid var(--aiims-border-subtle)' }}>
                <td
                  style={{
                    padding: '12px 16px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-primary)',
                  }}
                >
                  Market Tier
                </td>
                {selectedTools.map((t) => (
                  <td key={t.id} style={{ padding: '12px 16px' }}>
                    <MarketTierBadge
                      marketTier={t.marketTier}
                      marketTierName={t.marketTierName}
                      marketTierLabel={t.marketTierLabel}
                    />
                  </td>
                ))}
              </tr>

              {/* Row 2: Pricing & Free Tier */}
              <tr
                style={{
                  borderBottom: '1px solid var(--aiims-border-subtle)',
                  backgroundColor: 'var(--aiims-bg-card-hover)',
                }}
              >
                <td
                  style={{
                    padding: '12px 16px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-primary)',
                  }}
                >
                  Pricing Model
                </td>
                {selectedTools.map((t) => (
                  <td key={t.id} style={{ padding: '12px 16px' }}>
                    <div
                      style={{
                        fontWeight: 700,
                        color: 'var(--aiims-text-heading)',
                        marginBottom: '4px',
                      }}
                    >
                      {t.pricingDetails?.summary || t.pricing || 'Check vendor site'}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--aiims-text-secondary)' }}>
                      Free plan:{' '}
                      {t.freePlan ||
                        (t.pricingDetails?.freeTierAvailable
                          ? 'Yes'
                          : t.pricingDetails?.freeTrialAvailable
                            ? 'Trial'
                            : 'No')}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Row 3: Primary Domains */}
              <tr style={{ borderBottom: '1px solid var(--aiims-border-subtle)' }}>
                <td
                  style={{
                    padding: '12px 16px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-primary)',
                  }}
                >
                  Domains
                </td>
                {selectedTools.map((t) => (
                  <td key={t.id} style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {(t.domains || [t.category]).filter(Boolean).map((d, i) => (
                        <Badge key={i} variant="neutral" size="sm">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Row 4: Skill Level */}
              <tr
                style={{
                  borderBottom: '1px solid var(--aiims-border-subtle)',
                  backgroundColor: 'var(--aiims-bg-card-hover)',
                }}
              >
                <td
                  style={{
                    padding: '12px 16px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-primary)',
                  }}
                >
                  Skill Level
                </td>
                {selectedTools.map((t) => (
                  <td key={t.id} style={{ padding: '12px 16px' }}>
                    <Badge variant="outline" size="sm">
                      {t.skillLevel || 'General'}
                    </Badge>
                  </td>
                ))}
              </tr>

              {/* Row 5: Capabilities */}
              <tr style={{ borderBottom: '1px solid var(--aiims-border-subtle)' }}>
                <td
                  style={{
                    padding: '12px 16px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-primary)',
                  }}
                >
                  Key Capabilities
                </td>
                {selectedTools.map((t) => (
                  <td key={t.id} style={{ padding: '12px 16px' }}>
                    <ul
                      style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', lineHeight: 1.5 }}
                    >
                      {(t.capabilities || []).slice(0, 4).map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>

              {/* Row 6: Strengths */}
              <tr
                style={{
                  borderBottom: '1px solid var(--aiims-border-subtle)',
                  backgroundColor: 'var(--aiims-bg-card-hover)',
                }}
              >
                <td
                  style={{
                    padding: '12px 16px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-primary)',
                  }}
                >
                  Strengths
                </td>
                {selectedTools.map((t) => (
                  <td key={t.id} style={{ padding: '12px 16px' }}>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: '16px',
                        fontSize: '12px',
                        color: 'var(--aiims-token-mint-text, #047857)',
                        lineHeight: 1.5,
                      }}
                    >
                      {(t.strengths || []).slice(0, 3).map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>

              {/* Row 7: Limitations */}
              <tr style={{ borderBottom: '1px solid var(--aiims-border-subtle)' }}>
                <td
                  style={{
                    padding: '12px 16px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-primary)',
                  }}
                >
                  Limitations
                </td>
                {selectedTools.map((t) => (
                  <td key={t.id} style={{ padding: '12px 16px' }}>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: '16px',
                        fontSize: '12px',
                        color: 'var(--aiims-token-coral-text, #be123c)',
                        lineHeight: 1.5,
                      }}
                    >
                      {(t.limitations || []).slice(0, 3).map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>

              {/* Row 8: Official Links */}
              <tr>
                <td
                  style={{
                    padding: '12px 16px',
                    fontWeight: 700,
                    color: 'var(--aiims-text-primary)',
                  }}
                >
                  Official Site
                </td>
                {selectedTools.map((t) => (
                  <td key={t.id} style={{ padding: '12px 16px' }}>
                    {t.officialWebsite ? (
                      <a
                        href={t.officialWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: 'var(--aiims-primary)',
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        Visit Website <ExternalLink size={12} />
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
