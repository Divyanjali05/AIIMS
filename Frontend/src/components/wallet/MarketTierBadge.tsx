import React from 'react';
import { Badge } from '../common/Badge';
import { MARKET_TIER_DEFINITIONS, MarketTier } from '../../types';

export interface MarketTierBadgeProps {
  marketTier?: number | null;
  marketTierName?: string;
  marketTierLabel?: string;
  size?: 'sm' | 'md';
  showDescriptionTooltip?: boolean;
}

export const MarketTierBadge: React.FC<MarketTierBadgeProps> = ({
  marketTier,
  marketTierName,
  marketTierLabel,
  size = 'sm',
  showDescriptionTooltip = true,
}) => {
  const tierNum =
    typeof marketTier === 'number' && [1, 2, 3, 4].includes(marketTier)
      ? (marketTier as MarketTier)
      : null;

  if (tierNum) {
    const meta = MARKET_TIER_DEFINITIONS[tierNum];
    const label = marketTierLabel || meta.label;
    return (
      <span title={showDescriptionTooltip ? meta.description : undefined}>
        <Badge variant={meta.badgeVariant} size={size}>
          {label}
        </Badge>
      </span>
    );
  }

  // Unrated / Null tier representation: neutral, non-prominent text badge
  const unratedLabel = marketTierLabel || marketTierName || 'Unrated';
  return (
    <span title={showDescriptionTooltip ? 'Pending market tier verification' : undefined}>
      <Badge variant="neutral" size={size}>
        {unratedLabel}
      </Badge>
    </span>
  );
};
