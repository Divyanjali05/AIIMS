import React, { useState, useEffect } from 'react';
import {
  Compass,
  Search,
  Filter,
  ExternalLink,
  Plus,
  CheckCircle2,
  Video,
  BarChart2,
  Palette,
  BookOpen,
  Code,
  Layers,
  Zap,
  Volume2,
  Briefcase,
  Send,
  Activity,
  Shield,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { apiClient } from '../../api/client';
import { DomainCard, DomainCardTool } from '../../types';

interface DomainCardsSectionProps {
  onAddTool: (tool: { id: string; name: string; category?: any }) => void;
  onOpenConfirmation: (tool: { id: string; name: string }) => void;
  userToolIds: string[];
  confirmedToolIds: string[];
}

export const DomainCardsSection: React.FC<DomainCardsSectionProps> = ({
  onAddTool,
  onOpenConfirmation,
  userToolIds,
  confirmedToolIds,
}) => {
  const [domainCards, setDomainCards] = useState<DomainCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomainFilter, setSelectedDomainFilter] = useState('All');
  const [pricingFilter, setPricingFilter] = useState<'All' | 'Free' | 'Paid'>('All');
  const [expandedDomainId, setExpandedDomainId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .getDomainCards()
      .then((res: any) => {
        if (isMounted && res && Array.isArray(res.domains)) {
          setDomainCards(res.domains);
        }
      })
      .catch((err: any) => {
        console.warn('Failed to fetch 13 domain cards:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getDomainIcon = (iconName: string) => {
    switch (iconName) {
      case 'Video':
        return <Video size={18} />;
      case 'BarChart2':
        return <BarChart2 size={18} />;
      case 'Palette':
        return <Palette size={18} />;
      case 'BookOpen':
        return <BookOpen size={18} />;
      case 'Code':
        return <Code size={18} />;
      case 'Search':
        return <Search size={18} />;
      case 'Layers':
        return <Layers size={18} />;
      case 'Zap':
        return <Zap size={18} />;
      case 'Volume2':
        return <Volume2 size={18} />;
      case 'Briefcase':
        return <Briefcase size={18} />;
      case 'Send':
        return <Send size={18} />;
      case 'Activity':
        return <Activity size={18} />;
      case 'Shield':
        return <Shield size={18} />;
      default:
        return <Compass size={18} />;
    }
  };

  // Filter domain cards
  const filteredDomains = domainCards.filter((card) => {
    if (selectedDomainFilter !== 'All' && card.id !== selectedDomainFilter) {
      return false;
    }

    if (pricingFilter === 'Free' && !card.hasFreeTier) {
      return false;
    }
    if (pricingFilter === 'Paid' && card.hasFreeTier && card.totalTools === 1) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = card.title.toLowerCase().includes(q);
      const matchesDesc = card.description.toLowerCase().includes(q);
      const matchesCap = card.keyCapabilities.some((c) => c.toLowerCase().includes(q));
      const matchesTools = (card.tools || []).some(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.provider.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );

      return matchesTitle || matchesDesc || matchesCap || matchesTools;
    }

    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Search and Filters Bar */}
      <Surface
        variant="bordered"
        radius="lg"
        padding="md"
        style={{
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          border: '1px solid var(--aiims-border-card, #e2e8f0)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--aiims-bg-card-subtle, #f8fafc)',
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1px solid var(--aiims-border-subtle, #cbd5e1)',
            flex: '1 1 280px',
            maxWidth: '480px',
          }}
        >
          <Search size={16} style={{ color: 'var(--aiims-text-muted, #94a3b8)' }} />
          <input
            type="text"
            placeholder="Search tools, capabilities, or domains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              fontSize: '13.5px',
              color: 'var(--aiims-text-primary, #0f172a)',
            }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Category Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} style={{ color: 'var(--aiims-text-muted, #94a3b8)' }} />
            <select
              aria-label="Filter by Domain"
              value={selectedDomainFilter}
              onChange={(e) => setSelectedDomainFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--aiims-border-subtle, #cbd5e1)',
                backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                color: 'var(--aiims-text-primary, #0f172a)',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <option value="All">All 13 Domain Categories</option>
              {domainCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.totalTools || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Pricing Filter */}
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: 'var(--aiims-bg-card-subtle, #f1f5f9)',
              padding: '3px',
              borderRadius: '8px',
              gap: '2px',
            }}
          >
            {(['All', 'Free', 'Paid'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPricingFilter(p)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor:
                    pricingFilter === p ? 'var(--aiims-bg-card, #ffffff)' : 'transparent',
                  color:
                    pricingFilter === p
                      ? 'var(--aiims-primary, #6366f1)'
                      : 'var(--aiims-text-secondary, #64748b)',
                  fontWeight: pricingFilter === p ? 800 : 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: pricingFilter === p ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {p === 'All' ? 'All Pricing' : p === 'Free' ? 'Free / Freemium' : 'Paid'}
              </button>
            ))}
          </div>
        </div>
      </Surface>

      {/* Domain Cards Grid */}
      {loading ? (
        <Surface
          variant="bordered"
          radius="lg"
          padding="lg"
          style={{ textAlign: 'center', color: '#64748b' }}
        >
          Loading 13 verified domain cards...
        </Surface>
      ) : filteredDomains.length === 0 ? (
        <Surface
          variant="bordered"
          radius="lg"
          padding="lg"
          style={{ textAlign: 'center', color: '#64748b' }}
        >
          No domains or tools match your search criteria.
        </Surface>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredDomains.map((domain) => {
            const isExpanded = expandedDomainId === domain.id;
            const tools = domain.tools || [];

            return (
              <Surface
                key={domain.id}
                variant="bordered"
                radius="lg"
                padding="md"
                style={{
                  backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                  border: '1px solid var(--aiims-border-card, #e2e8f0)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Domain Card Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  onClick={() => setExpandedDomainId(isExpanded ? null : domain.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        color: 'var(--aiims-primary, #6366f1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {getDomainIcon(domain.icon)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: '16px',
                            fontWeight: 800,
                            color: 'var(--aiims-text-primary, #0f172a)',
                          }}
                        >
                          {domain.title}
                        </h3>
                        <Badge variant="primary" size="sm">
                          {domain.totalTools || tools.length} Verified Tools
                        </Badge>
                        {domain.hasFreeTier && (
                          <Badge variant="cyan" size="sm">
                            Free Tier Available
                          </Badge>
                        )}
                      </div>
                      <p
                        style={{
                          margin: '3px 0 0 0',
                          fontSize: '13px',
                          color: 'var(--aiims-text-secondary, #64748b)',
                        }}
                      >
                        {domain.description}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 700,
                        color: 'var(--aiims-primary, #6366f1)',
                      }}
                    >
                      {isExpanded ? 'Hide Tools' : 'View Tools'}
                    </span>
                    {isExpanded ? (
                      <ChevronUp size={18} style={{ color: 'var(--aiims-primary)' }} />
                    ) : (
                      <ChevronDown size={18} style={{ color: 'var(--aiims-text-muted)' }} />
                    )}
                  </div>
                </div>

                {/* Key Capabilities Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {domain.keyCapabilities.map((cap, capIdx) => (
                    <span
                      key={capIdx}
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--aiims-bg-card-subtle, #f8fafc)',
                        color: 'var(--aiims-text-secondary, #475569)',
                        border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                      }}
                    >
                      {cap}
                    </span>
                  ))}
                </div>

                {/* Expanded Tools View */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: '10px',
                      paddingTop: '14px',
                      borderTop: '1px solid var(--aiims-border-subtle, #f1f5f9)',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                      gap: '14px',
                    }}
                  >
                    {tools.length === 0 ? (
                      <div
                        style={{
                          gridColumn: '1 / -1',
                          padding: '16px',
                          textAlign: 'center',
                          color: '#64748b',
                        }}
                      >
                        No verified tools currently registered for this domain.
                      </div>
                    ) : (
                      tools.map((tool: DomainCardTool) => {
                        const isAdded = userToolIds.includes(tool.id);
                        const isConfirmed = confirmedToolIds.includes(tool.id);

                        return (
                          <Surface
                            key={tool.id}
                            variant="bordered"
                            radius="md"
                            padding="md"
                            style={{
                              backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                              border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              gap: '10px',
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'flex-start',
                                }}
                              >
                                <div>
                                  <h4
                                    style={{
                                      margin: 0,
                                      fontSize: '14.5px',
                                      fontWeight: 800,
                                      color: 'var(--aiims-text-primary, #0f172a)',
                                    }}
                                  >
                                    {tool.name}
                                  </h4>
                                  <span
                                    style={{
                                      fontSize: '12px',
                                      color: 'var(--aiims-text-secondary, #64748b)',
                                    }}
                                  >
                                    By {tool.provider}
                                  </span>
                                </div>
                                <Badge
                                  variant={tool.freeTierAvailable ? 'cyan' : 'warning'}
                                  size="sm"
                                >
                                  {tool.freeTierAvailable ? 'Free Tier' : tool.pricingType}
                                </Badge>
                              </div>

                              <p
                                style={{
                                  margin: '8px 0 0 0',
                                  fontSize: '12.5px',
                                  color: 'var(--aiims-text-secondary, #475569)',
                                  lineHeight: 1.4,
                                }}
                              >
                                {tool.description}
                              </p>

                              <div
                                style={{
                                  margin: '6px 0 0 0',
                                  fontSize: '11.5px',
                                  color: 'var(--aiims-text-muted, #64748b)',
                                }}
                              >
                                <strong>Pricing:</strong> {tool.pricingSummary}
                              </div>

                              {tool.lastVerifiedAt && (
                                <div
                                  style={{
                                    fontSize: '11px',
                                    color: 'var(--aiims-text-muted, #94a3b8)',
                                    marginTop: '2px',
                                  }}
                                >
                                  Verified: {tool.lastVerifiedAt.split('T')[0]}
                                </div>
                              )}
                            </div>

                            {/* Action Row */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingTop: '8px',
                                borderTop: '1px solid var(--aiims-border-subtle, #f1f5f9)',
                                gap: '6px',
                                flexWrap: 'wrap',
                              }}
                            >
                              <a
                                href={tool.officialWebsite}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '12px',
                                  color: 'var(--aiims-primary, #6366f1)',
                                  textDecoration: 'none',
                                  fontWeight: 700,
                                }}
                              >
                                Website <ExternalLink size={11} />
                              </a>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {isConfirmed ? (
                                  <Badge
                                    variant="success"
                                    size="sm"
                                    icon={<CheckCircle2 size={11} />}
                                  >
                                    Confirmed
                                  </Badge>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      onOpenConfirmation({ id: tool.id, name: tool.name })
                                    }
                                  >
                                    Confirm Usage
                                  </Button>
                                )}

                                <Button
                                  variant={isAdded ? 'outline' : 'primary'}
                                  size="sm"
                                  onClick={() =>
                                    onAddTool({
                                      id: tool.id,
                                      name: tool.name,
                                      category: domain.category,
                                    })
                                  }
                                  disabled={isAdded}
                                >
                                  {isAdded ? (
                                    <>
                                      <Check size={12} style={{ marginRight: '3px' }} /> In Toolkit
                                    </>
                                  ) : (
                                    <>
                                      <Plus size={12} style={{ marginRight: '3px' }} /> Add
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </Surface>
                        );
                      })
                    )}
                  </div>
                )}
              </Surface>
            );
          })}
        </div>
      )}
    </div>
  );
};
