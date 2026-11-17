import React from 'react';
import {
  ExternalLink,
  Plus,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Check,
  AlertTriangle,
  Flag,
  DollarSign,
  Tag,
  ArrowRightLeft,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { AITool, MARKET_TIER_DEFINITIONS, MarketTier } from '../../types';
import { MarketTierBadge } from './MarketTierBadge';

export interface ToolDetailModalProps {
  tool: AITool | null;
  isOpen: boolean;
  onClose: () => void;
  isInWallet: boolean;
  isAdding: boolean;
  onAdd: (tool: AITool) => void;
  onToggleCompare?: (toolId: string) => void;
  isSelectedForCompare?: boolean;
  onReport: (tool: AITool) => void;
}

export const ToolDetailModal: React.FC<ToolDetailModalProps> = ({
  tool,
  isOpen,
  onClose,
  isInWallet,
  isAdding,
  onAdd,
  onToggleCompare,
  isSelectedForCompare,
  onReport,
}) => {
  if (!tool) return null;

  const tierNum =
    typeof tool.marketTier === 'number' && [1, 2, 3, 4].includes(tool.marketTier)
      ? (tool.marketTier as MarketTier)
      : null;
  const tierMeta = tierNum ? MARKET_TIER_DEFINITIONS[tierNum] : null;

  // Format verification timestamp safely
  const formatTimestamp = (iso?: string | null) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      return isNaN(d.getTime())
        ? iso
        : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  const verifiedDate = formatTimestamp(tool.pricingVerifiedAt || tool.lastVerifiedAt);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="720px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '18px', fontWeight: 800 }}>{tool.name}</span>
          <MarketTierBadge
            marketTier={tool.marketTier}
            marketTierName={tool.marketTierName}
            marketTierLabel={tool.marketTierLabel}
          />
        </div>
      }
      subtitle={
        <span style={{ fontSize: '12.5px', color: 'var(--aiims-text-muted)' }}>
          {tool.provider} • {tool.category || 'AI Tool'}
        </span>
      }
      footer={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button
              variant="outline"
              size="sm"
              icon={<Flag size={13} />}
              onClick={() => {
                onClose();
                onReport(tool);
              }}
            >
              Report Outdated Info
            </Button>
            {onToggleCompare && (
              <Button
                variant={isSelectedForCompare ? 'violet' : 'ghost'}
                size="sm"
                icon={<ArrowRightLeft size={13} />}
                onClick={() => onToggleCompare(tool.id)}
              >
                {isSelectedForCompare ? 'Remove from Compare' : 'Add to Compare'}
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              variant={isInWallet ? 'green' : 'primary'}
              size="sm"
              disabled={isInWallet || isAdding}
              icon={isInWallet ? <CheckCircle2 size={13} /> : <Plus size={13} />}
              onClick={() => onAdd(tool)}
            >
              {isInWallet ? 'In AI Wallet' : isAdding ? 'Adding...' : 'Add to Wallet'}
            </Button>
          </div>
        </div>
      }
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          maxHeight: '70vh',
          overflowY: 'auto',
          paddingRight: '4px',
        }}
      >
        {/* Description & Links */}
        <div>
          <p
            style={{
              margin: '0 0 12px',
              fontSize: '13.5px',
              lineHeight: 1.5,
              color: 'var(--aiims-text-secondary)',
            }}
          >
            {tool.description || tool.shortDescription}
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {tool.officialWebsite && (
              <a
                href={tool.officialWebsite}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: 'var(--aiims-primary, #6366f1)',
                  textDecoration: 'none',
                }}
              >
                Official Website <ExternalLink size={12} />
              </a>
            )}

            {tool.websiteUrl && tool.websiteUrl !== tool.officialWebsite && (
              <a
                href={tool.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: 'var(--aiims-text-muted, #64748b)',
                  textDecoration: 'none',
                }}
              >
                Product Page <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>

        {/* Market Tier Provenance Section */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
            border: '1px solid var(--aiims-border-subtle, #f1f5f9)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--aiims-primary)',
              }}
            >
              Market Tier Footprint
            </span>
            <MarketTierBadge
              marketTier={tool.marketTier}
              marketTierName={tool.marketTierName}
              marketTierLabel={tool.marketTierLabel}
              size="sm"
            />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '12.5px',
              color: 'var(--aiims-text-secondary)',
              lineHeight: 1.45,
            }}
          >
            {tierMeta
              ? tierMeta.description
              : 'This tool is currently classified as Unrated pending verified market traction data.'}
          </p>
        </div>

        {/* Pricing & Plan Details */}
        <div>
          <h4
            style={{
              margin: '0 0 10px',
              fontSize: '14px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <DollarSign size={16} /> Pricing & Plan Options
          </h4>

          {/* Free Tier Info */}
          <div
            style={{
              marginBottom: '10px',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--aiims-card-banner-bg, #eef2ff)',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--aiims-primary)',
                marginBottom: '2px',
              }}
            >
              Free Tier Status:{' '}
              {tool.freePlan ||
                (tool.pricingDetails?.freeTierAvailable
                  ? 'Yes'
                  : tool.pricingDetails?.freeTrialAvailable
                    ? 'Trial Only'
                    : 'No Free Tier')}
            </div>
            {tool.freePlanDetails && (
              <div style={{ fontSize: '12.5px', color: 'var(--aiims-text-secondary)' }}>
                {tool.freePlanDetails}
              </div>
            )}
          </div>

          {/* Paid Plans List */}
          {tool.paidPlans && tool.paidPlans.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '8px',
                marginBottom: '10px',
              }}
            >
              {tool.paidPlans.map((plan, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--aiims-border-card, #e2e8f0)',
                    backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 800 }}>{plan.name}</span>
                    <span
                      style={{ fontSize: '13px', fontWeight: 800, color: 'var(--aiims-primary)' }}
                    >
                      {typeof plan.price === 'number' ? `$${plan.price}` : plan.price}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}>
                    {plan.billingPeriod} {plan.currency ? `(${plan.currency})` : ''}
                  </div>
                  {plan.limits && (
                    <div
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--aiims-text-secondary)',
                        marginTop: '4px',
                      }}
                    >
                      {plan.limits}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pricing Provenance Metadata */}
          <div
            style={{
              display: 'flex',
              gap: '14px',
              flexWrap: 'wrap',
              fontSize: '11.5px',
              color: 'var(--aiims-text-muted)',
              paddingTop: '4px',
            }}
          >
            {tool.pricingSourceUrl && (
              <a
                href={tool.pricingSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--aiims-primary)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                Official Pricing Source <ExternalLink size={10} />
              </a>
            )}
            {verifiedDate && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={11} /> Verified: {verifiedDate}
              </span>
            )}
          </div>
        </div>

        {/* Domains & Skill Level */}
        <div>
          <h4
            style={{
              margin: '0 0 8px',
              fontSize: '13.5px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading)',
            }}
          >
            Domains & Difficulty
          </h4>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {(tool.domains || [tool.category]).filter(Boolean).map((d, i) => (
              <Badge key={i} variant="neutral" size="sm">
                {d}
              </Badge>
            ))}
            {tool.skillLevel && (
              <Badge variant="outline" size="sm">
                Level: {tool.skillLevel}
              </Badge>
            )}
          </div>
        </div>

        {/* Use Cases */}
        {tool.useCases && tool.useCases.length > 0 && (
          <div>
            <h4
              style={{
                margin: '0 0 8px',
                fontSize: '13.5px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading)',
              }}
            >
              Primary Use Cases
            </h4>
            <ul
              style={{
                margin: 0,
                paddingLeft: '20px',
                fontSize: '12.5px',
                color: 'var(--aiims-text-secondary)',
                lineHeight: 1.6,
              }}
            >
              {tool.useCases.map((uc, i) => (
                <li key={i}>{uc}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Strengths & Limitations */}
        {((tool.strengths && tool.strengths.length > 0) ||
          (tool.limitations && tool.limitations.length > 0)) && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '12px',
            }}
          >
            {tool.strengths && tool.strengths.length > 0 && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--aiims-token-mint-bg, #ecfdf5)',
                  border: '1px solid var(--aiims-token-mint-border, #a7f3d0)',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: 'var(--aiims-token-mint-text, #047857)',
                    marginBottom: '4px',
                  }}
                >
                  Strengths
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '16px',
                    fontSize: '12px',
                    color: 'var(--aiims-token-mint-text, #047857)',
                    lineHeight: 1.5,
                  }}
                >
                  {tool.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {tool.limitations && tool.limitations.length > 0 && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--aiims-token-coral-bg, #fff1f2)',
                  border: '1px solid var(--aiims-token-coral-border, #fecdd3)',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: 'var(--aiims-token-coral-text, #be123c)',
                    marginBottom: '4px',
                  }}
                >
                  Considerations & Limitations
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '16px',
                    fontSize: '12px',
                    color: 'var(--aiims-token-coral-text, #be123c)',
                    lineHeight: 1.5,
                  }}
                >
                  {tool.limitations.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
