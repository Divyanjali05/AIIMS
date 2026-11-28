import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  ExternalLink,
  Youtube,
  Globe,
  Clock,
  CheckCircle2,
  Plus,
  GraduationCap,
  Briefcase,
  X,
  Languages,
  Check,
  HelpCircle,
  Layers,
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  LEARN_AI_RESOURCES,
  LEARN_AI_DOMAINS,
  LEARN_AI_LANGUAGES,
  ResourceType,
  ResourceLanguage,
  DifficultyLevel,
} from '../../data/learnAIResources';
import { AITool, AudienceMode } from '../../types';

export interface LearnAISectionProps {
  currentAudienceMode: AudienceMode;
  onAddTool?: (tool: AITool) => void;
  userToolIds?: string[];
  catalog?: AITool[];
}

export const LearnAISection: React.FC<LearnAISectionProps> = ({
  currentAudienceMode,
  onAddTool,
  userToolIds = [],
  catalog = [],
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedDomain, setSelectedDomain] = useState<string>('All Domains');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  // Compute language counts across all resources
  const languageCounts = useMemo(() => {
    return {
      all: LEARN_AI_RESOURCES.length,
      english: LEARN_AI_RESOURCES.filter(
        (r) => r.language === 'English' || r.language === 'Multilingual'
      ).length,
      telugu: LEARN_AI_RESOURCES.filter(
        (r) => r.language === 'Telugu' || r.language === 'Multilingual'
      ).length,
      hindi: LEARN_AI_RESOURCES.filter(
        (r) => r.language === 'Hindi' || r.language === 'Multilingual'
      ).length,
    };
  }, []);

  // Filter & sort resources based on active filters and audience mode
  const filteredResources = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matches = LEARN_AI_RESOURCES.filter((resource) => {
      // 1. Language filter
      if (selectedLanguage !== 'all') {
        const langTarget =
          selectedLanguage === 'english'
            ? 'English'
            : selectedLanguage === 'telugu'
              ? 'Telugu'
              : 'Hindi';
        if (resource.language !== langTarget && resource.language !== 'Multilingual') {
          return false;
        }
      }

      // 2. Domain filter (10 domains)
      if (selectedDomain !== 'All Domains' && resource.domain !== selectedDomain) {
        return false;
      }

      // 3. Resource Type filter
      if (selectedType !== 'all' && resource.type !== selectedType) {
        return false;
      }

      // 4. Difficulty filter
      if (
        selectedDifficulty !== 'all' &&
        resource.difficulty.toLowerCase() !== selectedDifficulty
      ) {
        return false;
      }

      // 5. Text search
      if (q) {
        const matchTitle = resource.title.toLowerCase().includes(q);
        const matchDesc = resource.description.toLowerCase().includes(q);
        const matchAuthor = (resource.channelOrAuthor || '').toLowerCase().includes(q);
        const matchTakeaways = resource.keyTakeaways.some((t) => t.toLowerCase().includes(q));
        const matchDomain = (resource.domain || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchAuthor && !matchTakeaways && !matchDomain) {
          return false;
        }
      }

      return true;
    });

    // Personalization sorting: Prioritize audience mode matches
    return [...matches].sort((a, b) => {
      const aMatchesAudience =
        a.targetAudience === currentAudienceMode ? 2 : a.targetAudience === 'all' ? 1 : 0;
      const bMatchesAudience =
        b.targetAudience === currentAudienceMode ? 2 : b.targetAudience === 'all' ? 1 : 0;
      return bMatchesAudience - aMatchesAudience;
    });
  }, [
    selectedLanguage,
    selectedDomain,
    selectedType,
    selectedDifficulty,
    searchQuery,
    currentAudienceMode,
  ]);

  // Type-specific badge and icon renderers
  const renderTypeIcon = (type: ResourceType) => {
    switch (type) {
      case 'youtube':
        return <Youtube size={14} style={{ color: '#ef4444' }} />;
      case 'website':
        return <Globe size={14} style={{ color: '#0284c7' }} />;
      case 'case_study':
        return <Briefcase size={14} style={{ color: '#8b5cf6' }} />;
      case 'course':
        return <GraduationCap size={14} style={{ color: '#059669' }} />;
      case 'interactive_guide':
      default:
        return <BookOpen size={14} style={{ color: '#059669' }} />;
    }
  };

  const getDifficultyBadge = (level: DifficultyLevel) => {
    switch (level) {
      case 'Beginner':
        return (
          <Badge variant="success" size="sm">
            Beginner
          </Badge>
        );
      case 'Intermediate':
        return (
          <Badge variant="cyan" size="sm">
            Intermediate
          </Badge>
        );
      case 'Advanced':
        return (
          <Badge variant="purple" size="sm">
            Advanced
          </Badge>
        );
      default:
        return null;
    }
  };

  const getLanguageBadge = (lang: ResourceLanguage) => {
    switch (lang) {
      case 'Telugu':
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(217, 119, 6, 0.12)',
              color: '#b45309',
              border: '1px solid rgba(217, 119, 6, 0.3)',
            }}
          >
            Telugu (తెలుగు)
          </span>
        );
      case 'Hindi':
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(225, 29, 72, 0.12)',
              color: '#be123c',
              border: '1px solid rgba(225, 29, 72, 0.3)',
            }}
          >
            Hindi (हिंदी)
          </span>
        );
      case 'Multilingual':
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(124, 58, 237, 0.12)',
              color: '#6d28d9',
              border: '1px solid rgba(124, 58, 237, 0.3)',
            }}
          >
            Multilingual
          </span>
        );
      case 'English':
      default:
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(2, 132, 199, 0.12)',
              color: '#0369a1',
              border: '1px solid rgba(2, 132, 199, 0.3)',
            }}
          >
            English
          </span>
        );
    }
  };

  const handleResetFilters = () => {
    setSelectedLanguage('all');
    setSelectedDomain('All Domains');
    setSelectedType('all');
    setSelectedDifficulty('all');
    setSearchQuery('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ===================================================================== */}
      {/* 1. COMPACT LEARN AI HEADER */}
      {/* ===================================================================== */}
      <Surface
        variant="bordered"
        radius="lg"
        padding="md"
        style={{
          border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(99, 102, 241, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--aiims-primary, #4338ca)',
                }}
              >
                <BookOpen size={18} />
              </div>
              <h1
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0f172a)',
                  margin: 0,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  letterSpacing: '-0.3px',
                }}
              >
                Learn AI — Ten Domain Curriculum
              </h1>
              <Badge variant="cyan" size="sm">
                Free • 0 AC
              </Badge>
            </div>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--aiims-text-muted, #64748b)',
                margin: 0,
                fontWeight: 500,
              }}
            >
              Curated educational resources spanning 10 AI domains across English, Telugu, and
              Hindi.
            </p>
          </div>

          {/* Personalization pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor:
                currentAudienceMode === 'entrepreneur'
                  ? 'rgba(124, 58, 237, 0.08)'
                  : 'rgba(2, 132, 199, 0.08)',
              border:
                currentAudienceMode === 'entrepreneur'
                  ? '1px solid rgba(124, 58, 237, 0.2)'
                  : '1px solid rgba(2, 132, 199, 0.2)',
              fontSize: '12px',
              fontWeight: 700,
              color: currentAudienceMode === 'entrepreneur' ? '#6d28d9' : '#0369a1',
            }}
          >
            {currentAudienceMode === 'entrepreneur' ? (
              <>
                <Briefcase size={14} />
                <span>Entrepreneur Spotlight: Applied AI & Startups</span>
              </>
            ) : (
              <>
                <GraduationCap size={14} />
                <span>Student Spotlight: AI Fundamentals & Academics</span>
              </>
            )}
          </div>
        </div>
      </Surface>

      {/* ===================================================================== */}
      {/* 2. FILTER CONTROLS: LANGUAGE & TEN DOMAINS & SEARCH */}
      {/* ===================================================================== */}
      <Surface
        variant="bordered"
        radius="lg"
        padding="md"
        style={{
          border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* Row A: Language Filter Bar (Preserved on domain switch) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            <Languages size={14} style={{ color: 'var(--aiims-primary, #6366f1)' }} />
            <span>Content Language</span>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {LEARN_AI_LANGUAGES.map((lang) => {
              const isActive = selectedLanguage === lang.id;
              const count =
                lang.id === 'all'
                  ? languageCounts.all
                  : lang.id === 'english'
                    ? languageCounts.english
                    : lang.id === 'telugu'
                      ? languageCounts.telugu
                      : languageCounts.hindi;

              return (
                <button
                  key={lang.id}
                  onClick={() => setSelectedLanguage(lang.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: isActive
                      ? '1px solid var(--aiims-primary, #0f172a)'
                      : '1px solid var(--aiims-border-card, #e2e8f0)',
                    backgroundColor: isActive
                      ? 'var(--aiims-primary, #0f172a)'
                      : 'var(--aiims-bg-card-subtle, #f8fafc)',
                    color: isActive ? '#ffffff' : 'var(--aiims-text-body, #334155)',
                    fontSize: '13px',
                    fontWeight: isActive ? 700 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{lang.label}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '9999px',
                      backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                      color: isActive ? '#ffffff' : '#475569',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: '#f1f5f9' }} />

        {/* Row B: 10 Domain Filter Chips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            <Layers size={14} style={{ color: 'var(--aiims-primary, #6366f1)' }} />
            <span>Select Learning Domain</span>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              alignItems: 'center',
            }}
          >
            {['All Domains', ...LEARN_AI_DOMAINS].map((domain) => {
              const isSelected = selectedDomain === domain;
              const domainCount =
                domain === 'All Domains'
                  ? LEARN_AI_RESOURCES.length
                  : LEARN_AI_RESOURCES.filter((r) => r.domain === domain).length;

              return (
                <button
                  key={domain}
                  onClick={() => setSelectedDomain(domain)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: isSelected
                      ? '1px solid var(--aiims-primary, #6366f1)'
                      : '1px solid var(--aiims-border-card, #e2e8f0)',
                    backgroundColor: isSelected
                      ? 'rgba(99, 102, 241, 0.1)'
                      : 'var(--aiims-bg-card, #ffffff)',
                    color: isSelected
                      ? 'var(--aiims-primary, #4338ca)'
                      : 'var(--aiims-text-muted, #475569)',
                    fontSize: '12.5px',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{domain}</span>
                  <span
                    style={{
                      fontSize: '10.5px',
                      opacity: 0.75,
                      fontWeight: 700,
                    }}
                  >
                    ({domainCount})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: '#f1f5f9' }} />

        {/* Row C: Resource Type Filter & Search Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Resource Type Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Type:</span>
            {[
              { id: 'all', label: 'All Types' },
              { id: 'course', label: 'Courses' },
              { id: 'youtube', label: 'YouTube' },
              { id: 'website', label: 'Websites' },
              { id: 'case_study', label: 'Case Studies' },
            ].map((typeItem) => {
              const isSelected = selectedType === typeItem.id;
              return (
                <button
                  key={typeItem.id}
                  onClick={() => setSelectedType(typeItem.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: isSelected
                      ? '1px solid var(--aiims-primary, #6366f1)'
                      : '1px solid var(--aiims-border-card, #e2e8f0)',
                    backgroundColor: isSelected
                      ? 'var(--aiims-token-lavender-bg, #f5f3ff)'
                      : '#ffffff',
                    color: isSelected ? 'var(--aiims-primary, #6366f1)' : '#64748b',
                    fontSize: '12px',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {typeItem.label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div
            style={{
              position: 'relative',
              minWidth: '240px',
              flexGrow: 1,
              maxWidth: '360px',
            }}
          >
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--aiims-text-muted, #94a3b8)',
              }}
            />
            <input
              type="text"
              placeholder="Search tutorials, topics, creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 30px 7px 32px',
                borderRadius: '8px',
                border: '1px solid var(--aiims-border-card, #cbd5e1)',
                fontSize: '13px',
                color: 'var(--aiims-text-heading, #0f172a)',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: 'var(--aiims-bg-card, #ffffff)',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--aiims-text-muted, #94a3b8)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </Surface>

      {/* ===================================================================== */}
      {/* 3. RESOURCE CARDS GRID */}
      {/* ===================================================================== */}
      {filteredResources.length === 0 ? (
        <Surface
          variant="bordered"
          radius="lg"
          padding="lg"
          style={{
            textAlign: 'center',
            backgroundColor: 'var(--aiims-bg-card, #ffffff)',
            border: '1px solid var(--aiims-border-card, #e2e8f0)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--aiims-bg-card-subtle, #f1f5f9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--aiims-text-muted, #64748b)',
            }}
          >
            <Search size={22} />
          </div>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--aiims-text-heading, #0f172a)',
              margin: 0,
            }}
          >
            No resources found for the selected criteria
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--aiims-text-muted, #64748b)',
              maxWidth: '480px',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {selectedLanguage !== 'all' && selectedDomain !== 'All Domains'
              ? `No verified ${selectedLanguage.toUpperCase()} resources are currently catalogued for "${selectedDomain}". Try switching to English or All Languages to view verified curriculum.`
              : 'No verified educational resources matched your active filters. We only present vetted, canonical educational links without fabricated entries.'}
          </p>
          <Button variant="secondary" size="sm" onClick={handleResetFilters}>
            Reset All Filters
          </Button>
        </Surface>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {filteredResources.map((resource) => {
            const isAudienceSpotlight = resource.targetAudience === currentAudienceMode;

            return (
              <div
                key={resource.id}
                style={{
                  backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                  borderRadius: '12px',
                  border: '1px solid var(--aiims-border-card, #e2e8f0)',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '16px',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 23, 42, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.04)';
                }}
              >
                <div>
                  {/* Top Metadata Row: Type, Language & Verification */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                      flexWrap: 'wrap',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: '#475569',
                          textTransform: 'capitalize',
                        }}
                      >
                        {renderTypeIcon(resource.type)}
                        <span>{resource.type.replace('_', ' ')}</span>
                      </div>
                      {getLanguageBadge(resource.language)}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {getDifficultyBadge(resource.difficulty)}
                      {resource.isVerified ? (
                        <span
                          title="Verified Canonical Resource"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            color: '#059669',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          <CheckCircle2 size={13} />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span
                          title="Link to be verified"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            color: '#b45309',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            backgroundColor: 'rgba(217, 119, 6, 0.1)',
                            border: '1px solid rgba(217, 119, 6, 0.25)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          <HelpCircle size={12} />
                          <span>Link to be verified</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Domain Tag */}
                  <div style={{ marginBottom: '6px' }}>
                    <Badge variant="purple" size="sm">
                      {resource.domain}
                    </Badge>
                  </div>

                  {/* Title & Author */}
                  <h3
                    style={{
                      fontSize: '15.5px',
                      fontWeight: 800,
                      color: 'var(--aiims-text-heading, #0f172a)',
                      margin: '0 0 6px 0',
                      lineHeight: '1.35',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    {resource.title}
                  </h3>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '12px',
                      color: 'var(--aiims-text-muted, #64748b)',
                      marginBottom: '10px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {resource.channelOrAuthor && (
                      <span style={{ fontWeight: 600 }}>{resource.channelOrAuthor}</span>
                    )}
                    {resource.durationOrReadTime && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={12} />
                        <span>{resource.durationOrReadTime}</span>
                      </span>
                    )}
                    {isAudienceSpotlight && (
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 800,
                          color: '#4338ca',
                          backgroundColor: '#eef2ff',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        ★ Recommended for you
                      </span>
                    )}
                  </div>

                  {/* Short Description */}
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--aiims-text-body, #334155)',
                      lineHeight: '1.5',
                      margin: '0 0 12px 0',
                    }}
                  >
                    {resource.description}
                  </p>

                  {/* Search Query Notice if Unverified */}
                  {!resource.isVerified && resource.searchQuery && (
                    <div
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--aiims-token-sunshine-bg, #fffbeb)',
                        border: '1px solid var(--aiims-token-sunshine-border, #fef3c7)',
                        fontSize: '11.5px',
                        color: 'var(--aiims-token-sunshine-text, #92400e)',
                        marginBottom: '10px',
                      }}
                    >
                      Search Query: <strong>"{resource.searchQuery}"</strong>
                    </div>
                  )}

                  {/* Key Takeaways */}
                  {resource.keyTakeaways.length > 0 && (
                    <div
                      style={{
                        backgroundColor: 'var(--aiims-bg-card-subtle, #f8fafc)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        marginBottom: '14px',
                        border: '1px solid var(--aiims-border-subtle, #f1f5f9)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: 'var(--aiims-text-muted, #64748b)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '6px',
                        }}
                      >
                        Key Takeaways
                      </div>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: '16px',
                          fontSize: '12px',
                          color: 'var(--aiims-text-body, #334155)',
                          lineHeight: '1.45',
                        }}
                      >
                        {resource.keyTakeaways.map((takeaway, idx) => (
                          <li
                            key={idx}
                            style={{
                              marginBottom: idx === resource.keyTakeaways.length - 1 ? 0 : '4px',
                            }}
                          >
                            {takeaway}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Bottom Actions Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    paddingTop: '12px',
                    borderTop: '1px solid #f1f5f9',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Tool Integration: Add to Wallet */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}
                  >
                    {resource.associatedToolIds &&
                      resource.associatedToolIds.map((toolId) => {
                        const inWallet = userToolIds.includes(toolId);
                        const matchedTool = catalog.find((t) => t.id === toolId);
                        const toolName = matchedTool
                          ? matchedTool.name
                          : toolId.replace('tool-', '');

                        return (
                          <button
                            key={toolId}
                            disabled={inWallet || !onAddTool || !matchedTool}
                            onClick={() => {
                              if (matchedTool && onAddTool && !inWallet) {
                                onAddTool(matchedTool);
                              }
                            }}
                            title={
                              inWallet
                                ? 'Already in your Tool Stack'
                                : `Add ${toolName} to My Tool Stack`
                            }
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: inWallet || !matchedTool ? 'default' : 'pointer',
                              border: inWallet ? '1px solid #cbd5e1' : '1px solid #c7d2fe',
                              backgroundColor: inWallet ? '#f1f5f9' : '#eef2ff',
                              color: inWallet ? '#64748b' : '#4338ca',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {inWallet ? <Check size={11} /> : <Plus size={11} />}
                            <span>{toolName}</span>
                          </button>
                        );
                      })}
                  </div>

                  {/* External Link Action */}
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      color: 'var(--aiims-text-heading, #0f172a)',
                      textDecoration: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--aiims-bg-card-subtle, #f8fafc)',
                      border: '1px solid var(--aiims-border-card, #e2e8f0)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--aiims-primary, #0f172a)';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        'var(--aiims-bg-card-subtle, #f8fafc)';
                      e.currentTarget.style.color = 'var(--aiims-text-heading, #0f172a)';
                    }}
                  >
                    <span>{resource.isVerified ? 'Open Resource' : 'Open Search Link'}</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
