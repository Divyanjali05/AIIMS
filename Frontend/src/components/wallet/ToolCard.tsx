import React from 'react';
import {
  ExternalLink,
  Plus,
  CheckCircle2,
  Info,
  Flag,
  CheckSquare,
  Square,
  RefreshCw,
} from 'lucide-react';
import { Surface } from '../common/Surface';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { AITool } from '../../types';
import { MarketTierBadge } from './MarketTierBadge';

export interface ToolCardProps {
  tool: AITool;
  isInWallet: boolean;
  isAdding: boolean;
  isSelectedForCompare: boolean;
  canSelectForCompare: boolean;
  onAdd: (tool: AITool) => void;
  onViewDetails: (tool: AITool) => void;
  onToggleCompare: (toolId: string) => void;
  onReport: (tool: AITool) => void;
}

export const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  isInWallet,
  isAdding,
  isSelectedForCompare,
  canSelectForCompare,
  onAdd,
  onViewDetails,
  onToggleCompare,
  onReport,
}) => {
  // Determine pricing display text
  const pricingSummary =
    tool.pricingDetails?.summary ||
    tool.pricing ||
    (tool.paidPlans && tool.paidPlans.length > 0
      ? tool.paidPlans
          .map((p) => `${p.name}: ${typeof p.price === 'number' ? `$${p.price}` : p.price}`)
          .join(' • ')
      : null);

  const displayPricing = pricingSummary || 'Check vendor site';

  // Free tier display status
  const hasFreeTier =
    tool.pricingDetails?.type === 'FREE' ||
    Boolean(tool.pricingDetails?.freeTierAvailable) ||
    tool.freePlan === 'Yes';

  const hasFreeTrial = tool.pricingDetails?.freeTrialAvailable || tool.freePlan === 'Trial';

  // Determine primary domain display
  const primaryDomain =
    tool.domains && tool.domains.length > 0 ? tool.domains[0] : tool.category || 'AI Tool';

  return (
    <Surface
      variant="bordered"
      radius="lg"
      padding="md"
      className="aiims-tool-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '12px',
        height: '100%',
        boxSizing: 'border-box',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
        borderColor: isSelectedForCompare ? 'var(--aiims-primary, #6366f1)' : undefined,
        backgroundColor: isSelectedForCompare
          ? 'var(--aiims-card-banner-bg, #eef2ff)'
          : 'var(--aiims-bg-card, #ffffff)',
      }}
    >
      <div>
        {/* Header: Identity, Provider, Market Tier, and Compare Checkbox */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '8px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '15px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0f172a)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={tool.name}
              >
                {tool.name}
              </h3>
              <MarketTierBadge
                marketTier={tool.marketTier}
                marketTierName={tool.marketTierName}
                marketTierLabel={tool.marketTierLabel}
              />
            </div>
            <div
              style={{
                fontSize: '11.5px',
                color: 'var(--aiims-text-muted, #64748b)',
                fontWeight: 600,
                marginTop: '2px',
              }}
            >
              {tool.provider}
            </div>
          </div>

          {/* Quick Compare Selector */}
          <button
            type="button"
            onClick={() => onToggleCompare(tool.id)}
            disabled={!isSelectedForCompare && !canSelectForCompare}
            title={
              isSelectedForCompare
                ? 'Remove from comparison'
                : canSelectForCompare
                  ? 'Select to compare (2–4 tools)'
                  : 'Maximum 4 tools selected for comparison'
            }
            aria-label={
              isSelectedForCompare
                ? `Deselect ${tool.name} from comparison`
                : `Select ${tool.name} for comparison`
            }
            style={{
              background: 'none',
              border: 'none',
              cursor: !isSelectedForCompare && !canSelectForCompare ? 'not-allowed' : 'pointer',
              color: isSelectedForCompare
                ? 'var(--aiims-primary, #6366f1)'
                : 'var(--aiims-text-muted, #94a3b8)',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              opacity: !isSelectedForCompare && !canSelectForCompare ? 0.4 : 1,
            }}
          >
            {isSelectedForCompare ? <CheckSquare size={18} /> : <Square size={18} />}
          </button>
        </div>

        {/* Short Description */}
        <p
          style={{
            margin: '0 0 10px',
            fontSize: '12.5px',
            color: 'var(--aiims-text-secondary, #475569)',
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '36px',
          }}
        >
          {tool.shortDescription || tool.description}
        </p>

        {/* Feature Badges: Domain, Pricing/Free, Skill Level */}
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <Badge variant="neutral" size="sm">
            {primaryDomain}
          </Badge>

          {hasFreeTier && (
            <Badge variant="mint" size="sm">
              Free Plan
            </Badge>
          )}

          {!hasFreeTier && hasFreeTrial && (
            <Badge variant="sunshine" size="sm">
              Free Trial
            </Badge>
          )}

          {!hasFreeTier && !hasFreeTrial && tool.pricingDetails?.type === 'PAID' && (
            <Badge variant="coral" size="sm">
              Paid Only
            </Badge>
          )}

          {tool.skillLevel && (
            <Badge variant="outline" size="sm">
              {tool.skillLevel}
            </Badge>
          )}
        </div>

        {/* Pricing Summary */}
        <div
          style={{
            fontSize: '11.5px',
            fontWeight: 700,
            color: 'var(--aiims-text-primary, #1e293b)',
            padding: '4px 8px',
            borderRadius: '6px',
            backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
            border: '1px solid var(--aiims-border-subtle, #f1f5f9)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: '8px',
          }}
          title={displayPricing}
        >
          💰 {displayPricing}
        </div>
      </div>

      {/* Card Footer Actions */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingTop: '8px',
          borderTop: '1px solid var(--aiims-border-subtle, #f1f5f9)',
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
          {/* Details Button */}
          <Button
            variant="ghost"
            size="sm"
            icon={<Info size={13} />}
            onClick={() => onViewDetails(tool)}
            style={{ fontSize: '12px', padding: '4px 8px' }}
          >
            Details
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Vendor Website Action */}
            {tool.officialWebsite && (
              <a
                href={tool.officialWebsite}
                target="_blank"
                rel="noopener noreferrer"
                title={`Visit ${tool.name} official website`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  color: 'var(--aiims-text-muted, #64748b)',
                  backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                  border: '1px solid var(--aiims-border-card, #e2e8f0)',
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={13} />
              </a>
            )}

            {/* Outdated Report Action */}
            <button
              type="button"
              onClick={() => onReport(tool)}
              title="Report outdated info or broken link"
              aria-label={`Report outdated information for ${tool.name}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                color: 'var(--aiims-text-muted, #94a3b8)',
                backgroundColor: 'transparent',
                border: '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              <Flag size={13} />
            </button>
          </div>
        </div>

        {/* Primary Action: Add to Wallet */}
        <Button
          variant={isInWallet ? 'green' : 'primary'}
          size="sm"
          disabled={isInWallet || isAdding}
          icon={
            isInWallet ? (
              <CheckCircle2 size={13} />
            ) : isAdding ? (
              <RefreshCw size={13} className="spin" />
            ) : (
              <Plus size={13} />
            )
          }
          onClick={() => onAdd(tool)}
          style={{ width: '100%', justifyContent: 'center', fontSize: '12.5px' }}
        >
          {isInWallet ? 'In AI Wallet' : isAdding ? 'Adding...' : 'Add to Wallet'}
        </Button>
      </div>
    </Surface>
  );
};
