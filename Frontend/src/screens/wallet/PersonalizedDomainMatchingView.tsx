import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Video,
  BarChart2,
  Palette,
  ExternalLink,
  Plus,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Info,
  Check,
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { apiClient } from '../../api/client';
import {
  PersonalizedDomainMatchingResult,
  PersonalizedRecommendationItem,
  AITool,
} from '../../types';

interface PersonalizedDomainMatchingViewProps {
  onAddTool: (tool: { id: string; name: string; category?: any }) => void;
  onOpenConfirmation: (tool: { id: string; name: string }) => void;
  userToolIds: string[];
  confirmedToolIds: string[];
}

export const PersonalizedDomainMatchingView: React.FC<PersonalizedDomainMatchingViewProps> = ({
  onAddTool,
  onOpenConfirmation,
  userToolIds,
  confirmedToolIds,
}) => {
  const [selectedDomain, setSelectedDomain] = useState<
    'All' | 'Video Editing' | 'Data Analytics' | 'Graphic Design'
  >('All');
  const [freeOnly, setFreeOnly] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [matchData, setMatchData] = useState<PersonalizedDomainMatchingResult[]>([]);
  const [isPersonalized, setIsPersonalized] = useState<boolean>(false);
  const [learnerGoal, setLearnerGoal] = useState<string>('');

  const fetchMatching = async (domain: string, isFree: boolean) => {
    setLoading(true);
    try {
      const response = await apiClient.getPersonalizedMatching({
        domain,
        freeOnly: isFree,
      });

      if (response && response.success && Array.isArray(response.results)) {
        setMatchData(response.results);
        setIsPersonalized(response.isPersonalized);
        setLearnerGoal(response.learnerGoal || '');
      }
    } catch (err) {
      console.warn('Failed to fetch personalized domain matching:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatching(selectedDomain, freeOnly);
  }, [selectedDomain, freeOnly]);

  const domainTabs = [
    { id: 'All', label: 'All 3 Required Domains', icon: Sparkles },
    { id: 'Video Editing', label: '1. Video Editing', icon: Video },
    { id: 'Data Analytics', label: '2. Data Analytics', icon: BarChart2 },
    { id: 'Graphic Design', label: '3. Graphic Design', icon: Palette },
  ];

  const renderToolCard = (item: PersonalizedRecommendationItem) => {
    const isAdded = userToolIds.includes(item.toolId);
    const isConfirmed = confirmedToolIds.includes(item.toolId);

    return (
      <Surface
        key={item.toolId}
        variant="bordered"
        radius="lg"
        padding="md"
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '12px',
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
          boxShadow: 'var(--aiims-shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05))',
        }}
      >
        <div>
          {/* Header Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h4
                  style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-primary, #0f172a)',
                  }}
                >
                  {item.name}
                </h4>
                <Badge variant={item.skillTier === 'beginner' ? 'success' : 'purple'} size="sm">
                  {item.skillTier === 'beginner' ? 'Beginner-Friendly' : 'Advanced / Power User'}
                </Badge>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--aiims-text-secondary, #64748b)' }}>
                By {item.provider}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Badge variant={item.pricing.freeTierAvailable ? 'cyan' : 'warning'} size="sm">
                {item.pricing.freeTierAvailable ? 'Free Tier Available' : item.pricing.type}
              </Badge>
            </div>
          </div>

          {/* Pricing summary */}
          <p
            style={{
              margin: '6px 0 0 0',
              fontSize: '12.5px',
              color: 'var(--aiims-text-secondary, #64748b)',
              fontWeight: 600,
            }}
          >
            Pricing: {item.pricing.summary}
          </p>

          {/* Explanation bullets */}
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {item.whyMatches.map((reason, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                  fontSize: '12.5px',
                  color: 'var(--aiims-text-primary, #1e293b)',
                  lineHeight: 1.4,
                }}
              >
                <span style={{ color: 'var(--aiims-primary, #6366f1)', fontWeight: 800 }}>•</span>
                <span>{reason}</span>
              </div>
            ))}
          </div>

          {/* Capabilities tags */}
          {item.capabilities.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '10px' }}>
              {item.capabilities.slice(0, 4).map((cap, cIdx) => (
                <span
                  key={cIdx}
                  style={{
                    fontSize: '11px',
                    padding: '2px 7px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--aiims-bg-card-subtle, #f1f5f9)',
                    color: 'var(--aiims-text-secondary, #475569)',
                    border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                  }}
                >
                  {cap}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            paddingTop: '10px',
            borderTop: '1px solid var(--aiims-border-subtle, #f1f5f9)',
          }}
        >
          <a
            href={item.officialWebsite}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12.5px',
              color: 'var(--aiims-primary, #6366f1)',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            Official Website <ExternalLink size={12} />
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isConfirmed ? (
              <Badge variant="success" size="sm" icon={<CheckCircle2 size={12} />}>
                Usage Confirmed
              </Badge>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenConfirmation({ id: item.toolId, name: item.name })}
              >
                Confirm Usage
              </Button>
            )}

            <Button
              variant={isAdded ? 'outline' : 'primary'}
              size="sm"
              onClick={() => onAddTool({ id: item.toolId, name: item.name, category: item.domain })}
              disabled={isAdded}
            >
              {isAdded ? (
                <>
                  <Check size={13} style={{ marginRight: '4px' }} /> In Toolkit
                </>
              ) : (
                <>
                  <Plus size={13} style={{ marginRight: '4px' }} /> Add to Toolkit
                </>
              )}
            </Button>
          </div>
        </div>
      </Surface>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Top Banner explaining personalization */}
      <Surface
        variant="bordered"
        radius="lg"
        padding="md"
        style={{
          backgroundColor: isPersonalized
            ? 'rgba(99, 102, 241, 0.05)'
            : 'var(--aiims-bg-card-subtle, #f8fafc)',
          border: `1px solid ${
            isPersonalized ? 'rgba(99, 102, 241, 0.2)' : 'var(--aiims-border-subtle, #e2e8f0)'
          }`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: isPersonalized
                ? 'var(--aiims-primary, #6366f1)'
                : 'var(--aiims-text-muted, #94a3b8)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={16} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-primary, #0f172a)',
                }}
              >
                {isPersonalized
                  ? 'Personalized to Your AI Learner Profile'
                  : 'Grounded Domain Recommendations'}
              </span>
              <Badge variant={isPersonalized ? 'primary' : 'outline'} size="sm">
                {isPersonalized ? 'Persistent Profile' : 'General Fallback'}
              </Badge>
            </div>
            <p
              style={{
                margin: '2px 0 0 0',
                fontSize: '12.5px',
                color: 'var(--aiims-text-secondary, #64748b)',
              }}
            >
              {isPersonalized
                ? `Matched against your demonstrated goal: "${learnerGoal}". Free and beginner/advanced options highlighted.`
                : 'Profile synthesis pending in My AI Profile. Displaying verified industry recommendations with zero hallucinated data.'}
            </p>
          </div>
        </div>

        {/* Free-Only Filter Toggle */}
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            color: 'var(--aiims-text-primary, #0f172a)',
          }}
        >
          <input
            type="checkbox"
            checked={freeOnly}
            onChange={(e) => setFreeOnly(e.target.checked)}
            style={{ accentColor: 'var(--aiims-primary, #6366f1)', width: '16px', height: '16px' }}
          />
          <span>Free / Freemium Only</span>
        </label>
      </Surface>

      {/* Domain Selection Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
        }}
      >
        {domainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedDomain === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedDomain(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: isActive
                  ? 'var(--aiims-primary, #6366f1)'
                  : 'var(--aiims-bg-card, #ffffff)',
                color: isActive ? '#ffffff' : 'var(--aiims-text-secondary, #475569)',
                fontWeight: isActive ? 800 : 600,
                fontSize: '13px',
                fontFamily: 'inherit',
                cursor: 'pointer',
                boxShadow: isActive ? 'var(--aiims-shadow-sm)' : 'none',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: isActive
                  ? 'var(--aiims-primary, #6366f1)'
                  : 'var(--aiims-border-subtle, #e2e8f0)',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Recommendations Content */}
      {loading ? (
        <Surface
          variant="bordered"
          radius="lg"
          padding="lg"
          style={{ textAlign: 'center', color: '#64748b' }}
        >
          Loading personalized tool matches...
        </Surface>
      ) : matchData.length === 0 ? (
        <Surface
          variant="bordered"
          radius="lg"
          padding="lg"
          style={{ textAlign: 'center', color: '#64748b' }}
        >
          No tools match the selected filters. Try unchecking "Free / Freemium Only".
        </Surface>
      ) : (
        matchData.map((dResult) => (
          <div
            key={dResult.domain}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '17px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-primary, #0f172a)',
                }}
              >
                {dResult.domain} Recommendations
              </h3>
              <Badge variant="cyan" size="sm">
                {dResult.totalMatches} Verified Matches
              </Badge>
            </div>

            {/* Beginner-Friendly Section */}
            <div>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: '#059669',
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                  }}
                >
                  Beginner-Friendly Options ({dResult.recommendations.beginner.length})
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  — Easy onboarding & intuitive interfaces
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '14px',
                }}
              >
                {dResult.recommendations.beginner.map(renderToolCard)}
              </div>
            </div>

            {/* Advanced / Power User Section */}
            {dResult.recommendations.advanced.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#7c3aed',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Advanced & High-Fidelity Platforms ({dResult.recommendations.advanced.length})
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    — Fine-grained control, parameters & API pipelines
                  </span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '14px',
                  }}
                >
                  {dResult.recommendations.advanced.map(renderToolCard)}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};
