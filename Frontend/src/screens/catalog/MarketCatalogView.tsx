import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  ArrowRightLeft,
  X,
  Compass,
  AlertCircle,
  CheckCircle2,
  Layers,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { CardSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useLearner } from '../../context/LearnerContext';
import { apiClient } from '../../api/client';
import {
  AITool,
  CANONICAL_DOMAINS,
  CanonicalDomainId,
  MARKET_TIER_DEFINITIONS,
  MarketTier,
  TaskCategory,
} from '../../types';
import { ToolCard } from '../../components/wallet/ToolCard';
import { ToolDetailModal } from '../../components/wallet/ToolDetailModal';
import { ReportOutdatedModal } from '../../components/wallet/ReportOutdatedModal';
import { ConfirmRemoveModal } from '../../components/wallet/ConfirmRemoveModal';
import { ToolComparisonView } from '../../components/wallet/ToolComparisonView';

export interface MarketCatalogViewProps {
  onNavigateToWallet?: () => void;
}

export const MarketCatalogView: React.FC<MarketCatalogViewProps> = ({ onNavigateToWallet }) => {
  const { state, addToolToWallet, removeToolFromWallet } = useLearner();

  // Filters State
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedDomain, setSelectedDomain] = useState<string>('All');
  const [selectedTier, setSelectedTier] = useState<string>('All');
  const [freeTierOnly, setFreeTierOnly] = useState<boolean>(false);
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string>('All');
  const [selectedPricing, setSelectedPricing] = useState<string>('All');

  // Data & Async State
  const [tools, setTools] = useState<AITool[]>([]);
  const [allToolsCache, setAllToolsCache] = useState<AITool[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals & Action States
  const [detailTool, setDetailTool] = useState<AITool | null>(null);
  const [reportTool, setReportTool] = useState<AITool | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [addingToolId, setAddingToolId] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  // Comparison State (2–4 tools)
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch Catalog from Backend using Phase C API Query Parameters
  const fetchCatalog = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const queryParams: Record<string, string> = {};
    if (debouncedSearch) queryParams.search = debouncedSearch;
    if (selectedDomain !== 'All') queryParams.domain = selectedDomain;
    if (selectedTier !== 'All') queryParams.marketTier = selectedTier;
    if (freeTierOnly) queryParams.freeTierAvailable = 'true';
    if (selectedSkillLevel !== 'All') queryParams.skillLevel = selectedSkillLevel;
    if (selectedPricing !== 'All') queryParams.pricing = selectedPricing;

    try {
      const data = await apiClient.getWalletCatalog(queryParams);
      if (Array.isArray(data)) {
        setTools(data);
        // Cache full catalog for comparison suggestions
        if (Object.keys(queryParams).length === 0) {
          setAllToolsCache(data);
        }
      } else {
        setErrorMessage(data?.error || 'Failed to load tools catalog.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error while fetching catalog.');
    } finally {
      setIsLoading(false);
    }
  }, [
    debouncedSearch,
    selectedDomain,
    selectedTier,
    freeTierOnly,
    selectedSkillLevel,
    selectedPricing,
  ]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // Also prefetch full catalog once if cache is empty
  useEffect(() => {
    if (allToolsCache.length === 0) {
      apiClient
        .getWalletCatalog()
        .then((res) => {
          if (Array.isArray(res)) setAllToolsCache(res);
        })
        .catch(() => {});
    }
  }, []);

  const userTools = state.aiWallet?.userTools || [];
  const userToolIds = useMemo(() => new Set(userTools.map((t) => t.toolId)), [userTools]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setActionToast({ message, type });
    setTimeout(() => {
      setActionToast(null);
    }, 3500);
  };

  // Add tool to wallet
  const handleAddTool = async (tool: AITool) => {
    if (userToolIds.has(tool.id) || addingToolId === tool.id) return;
    setAddingToolId(tool.id);

    try {
      addToolToWallet(
        tool.id,
        (tool.category || 'Reasoning & Writing') as TaskCategory,
        'exploring'
      );
      await apiClient.addToolToWallet(tool.id, tool.category || 'Reasoning & Writing', 'exploring');
      showToast(`${tool.name} added to your AI Wallet!`, 'success');
    } catch (err: any) {
      showToast(`Added to local wallet (${err?.message || 'offline'})`, 'info');
    } finally {
      setAddingToolId(null);
    }
  };

  // Confirm and Remove tool from wallet
  const handleConfirmRemove = async (toolId: string) => {
    setIsRemoving(true);
    try {
      removeToolFromWallet(toolId);
      await apiClient.removeFromWallet(toolId);
      showToast('Tool removed from AI Wallet.', 'info');
      setRemoveTarget(null);
    } catch (err: any) {
      showToast(`Removed from local wallet (${err?.message || 'offline'})`, 'info');
      setRemoveTarget(null);
    } finally {
      setIsRemoving(false);
    }
  };

  // Toggle tool in comparison dock (max 4 tools)
  const handleToggleCompare = (toolId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(toolId)) {
        return prev.filter((id) => id !== toolId);
      }
      if (prev.length >= 4) {
        showToast('Maximum 4 tools can be compared simultaneously.', 'info');
        return prev;
      }
      return [...prev, toolId];
    });
  };

  const handleClearAllFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedDomain('All');
    setSelectedTier('All');
    setFreeTierOnly(false);
    setSelectedSkillLevel('All');
    setSelectedPricing('All');
  };

  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    selectedDomain !== 'All' ||
    selectedTier !== 'All' ||
    freeTierOnly ||
    selectedSkillLevel !== 'All' ||
    selectedPricing !== 'All';

  return (
    <div
      className="aiims-market-catalog-view"
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
      {/* Toast Notification */}
      {actionToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            borderRadius: '10px',
            backgroundColor:
              actionToast.type === 'success'
                ? 'var(--aiims-token-mint-bg, #ecfdf5)'
                : actionToast.type === 'error'
                  ? 'var(--aiims-token-coral-bg, #fff1f2)'
                  : 'var(--aiims-card-banner-bg, #eef2ff)',
            color:
              actionToast.type === 'success'
                ? 'var(--aiims-token-mint-text, #047857)'
                : actionToast.type === 'error'
                  ? 'var(--aiims-token-coral-text, #be123c)'
                  : 'var(--aiims-primary, #4338ca)',
            border:
              actionToast.type === 'success'
                ? '1px solid var(--aiims-token-mint-border, #a7f3d0)'
                : actionToast.type === 'error'
                  ? '1px solid var(--aiims-token-coral-border, #fecdd3)'
                  : '1px solid var(--aiims-border-card, #c7d2fe)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            fontWeight: 700,
            fontSize: '13px',
          }}
        >
          {actionToast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{actionToast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Market AI Tools Catalog"
        description="Discover, compare, and integrate verified AI tools across 13 canonical domains from Starter to Enterprise tiers."
        badge={{
          label: '13 Domains • 4 Market Tiers',
          variant: 'purple',
        }}
        action={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {compareIds.length > 0 && (
              <Button
                variant="violet"
                size="sm"
                icon={<ArrowRightLeft size={13} />}
                onClick={() => setIsCompareModalOpen(true)}
              >
                Compare ({compareIds.length})
              </Button>
            )}
            {onNavigateToWallet && (
              <Button variant="outline" size="sm" onClick={onNavigateToWallet}>
                My AI Wallet ({userTools.length})
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={13} className={isLoading ? 'spin' : ''} />}
              onClick={fetchCatalog}
              disabled={isLoading}
              title="Refresh catalog from server"
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Main Search & Multi-Filter Bar */}
      <Surface variant="bordered" radius="lg" padding="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Top Row: Search Input */}
          <div style={{ position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--aiims-text-muted, #94a3b8)',
              }}
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search AI tools by name, vendor, description, or capability..."
              aria-label="Search catalog tools"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 40px 12px 42px',
                borderRadius: '10px',
                border: '1px solid var(--aiims-border-card, #e2e8f0)',
                backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                color: 'var(--aiims-text-primary, #0f172a)',
                fontSize: '14px',
                fontFamily: "'Nunito', sans-serif",
                outline: 'none',
              }}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                aria-label="Clear search text"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--aiims-text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Canonical 13 Domain Filter Carousel / Pills */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  color: 'var(--aiims-text-muted)',
                }}
              >
                13 Canonical Domains
              </span>
              {selectedDomain !== 'All' && (
                <button
                  type="button"
                  onClick={() => setSelectedDomain('All')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--aiims-primary)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  View All Domains
                </button>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                paddingBottom: '4px',
                scrollbarWidth: 'thin',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedDomain('All')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor:
                    selectedDomain === 'All' ? 'var(--aiims-primary)' : 'var(--aiims-border-card)',
                  backgroundColor:
                    selectedDomain === 'All' ? 'var(--aiims-primary)' : 'var(--aiims-bg-card)',
                  color: selectedDomain === 'All' ? '#ffffff' : 'var(--aiims-text-secondary)',
                  fontSize: '12px',
                  fontWeight: selectedDomain === 'All' ? 800 : 600,
                  fontFamily: "'Nunito', sans-serif",
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                All Domains
              </button>

              {CANONICAL_DOMAINS.map((domain) => {
                const isSelected = selectedDomain === domain.id;
                return (
                  <button
                    key={domain.id}
                    type="button"
                    onClick={() => setSelectedDomain(domain.id)}
                    title={domain.description}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--aiims-primary)' : 'var(--aiims-border-card)',
                      backgroundColor: isSelected ? 'var(--aiims-primary)' : 'var(--aiims-bg-card)',
                      color: isSelected ? '#ffffff' : 'var(--aiims-text-secondary)',
                      fontSize: '12px',
                      fontWeight: isSelected ? 800 : 600,
                      fontFamily: "'Nunito', sans-serif",
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {domain.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Market Tier & Attribute Controls */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              alignItems: 'center',
              paddingTop: '8px',
              borderTop: '1px solid var(--aiims-border-subtle, #f1f5f9)',
            }}
          >
            {/* Market Tier Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aiims-text-muted)' }}>
                Market Tier:
              </span>
              {[
                { id: 'All', label: 'All Tiers' },
                { id: '1', label: 'Starter (Tier 1)' },
                { id: '2', label: 'Growth (Tier 2)' },
                { id: '3', label: 'Leading (Tier 3)' },
                { id: '4', label: 'Enterprise (Tier 4)' },
              ].map((tier) => {
                const isSelected = selectedTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedTier(tier.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--aiims-primary)' : 'var(--aiims-border-card)',
                      backgroundColor: isSelected ? 'var(--aiims-card-banner-bg)' : 'transparent',
                      color: isSelected ? 'var(--aiims-primary)' : 'var(--aiims-text-secondary)',
                      fontSize: '11.5px',
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {tier.label}
                  </button>
                );
              })}
            </div>

            {/* Free Tier Only Toggle */}
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--aiims-text-primary)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={freeTierOnly}
                onChange={(e) => setFreeTierOnly(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--aiims-primary)' }}
              />
              <span>Permanent Free Tier Only</span>
            </label>

            {/* Skill Level Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aiims-text-muted)' }}>
                Skill Level:
              </span>
              <select
                aria-label="Filter by skill level"
                value={selectedSkillLevel}
                onChange={(e) => setSelectedSkillLevel(e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--aiims-border-card)',
                  backgroundColor: 'var(--aiims-bg-card)',
                  color: 'var(--aiims-text-primary)',
                  fontSize: '12px',
                  fontFamily: "'Nunito', sans-serif",
                  outline: 'none',
                }}
              >
                <option value="All">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Pricing Filter Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aiims-text-muted)' }}>
                Pricing:
              </span>
              <select
                aria-label="Filter by pricing model"
                value={selectedPricing}
                onChange={(e) => setSelectedPricing(e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--aiims-border-card)',
                  backgroundColor: 'var(--aiims-bg-card)',
                  color: 'var(--aiims-text-primary)',
                  fontSize: '12px',
                  fontFamily: "'Nunito', sans-serif",
                  outline: 'none',
                }}
              >
                <option value="All">All Models</option>
                <option value="Free">Free / Freemium</option>
                <option value="Trial">Free Trial</option>
                <option value="Paid">Subscription Only</option>
              </select>
            </div>

            {/* Clear All Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                icon={<X size={12} />}
                onClick={handleClearAllFilters}
                style={{ fontSize: '11.5px', padding: '3px 8px', marginLeft: 'auto' }}
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </Surface>

      {/* Results Header / Counter */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4px',
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--aiims-text-muted)' }}>
          {isLoading ? (
            'Searching catalog...'
          ) : (
            <>
              Showing <strong style={{ color: 'var(--aiims-text-heading)' }}>{tools.length}</strong>{' '}
              {hasActiveFilters ? 'filtered' : 'verified'} AI tools
              {selectedDomain !== 'All' &&
                ` in ${CANONICAL_DOMAINS.find((d) => d.id === selectedDomain)?.name || selectedDomain}`}
            </>
          )}
        </div>

        {compareIds.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aiims-primary)' }}>
              {compareIds.length} tool{compareIds.length > 1 ? 's' : ''} in comparison
            </span>
            <Button
              variant="violet"
              size="sm"
              icon={<ArrowRightLeft size={12} />}
              onClick={() => setIsCompareModalOpen(true)}
            >
              Open Comparison
            </Button>
          </div>
        )}
      </div>

      {/* Loading Skeleton State */}
      {isLoading && (
        <div
          className="aiims-card-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error & Retry State */}
      {!isLoading && errorMessage && (
        <Surface variant="bordered" radius="lg" padding="lg" style={{ textAlign: 'center' }}>
          <AlertCircle
            size={40}
            style={{ color: 'var(--aiims-token-coral-text, #be123c)', margin: '0 auto 12px' }}
          />
          <h3
            style={{
              margin: '0 0 6px',
              fontSize: '16px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading)',
            }}
          >
            Unable to Load Catalog
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--aiims-text-secondary)' }}>
            {errorMessage}
          </p>
          <Button variant="primary" size="sm" icon={<RefreshCw size={13} />} onClick={fetchCatalog}>
            Retry Request
          </Button>
        </Surface>
      )}

      {/* Empty State */}
      {!isLoading && !errorMessage && tools.length === 0 && (
        <EmptyState
          icon={<Compass size={28} />}
          title="No AI Tools Found"
          description={
            hasActiveFilters
              ? 'No verified tools match your active filter combination. Try clearing some filters or searching with different terms.'
              : 'No tools are currently verified in this category.'
          }
          actionLabel={hasActiveFilters ? 'Reset All Filters' : undefined}
          onAction={hasActiveFilters ? handleClearAllFilters : undefined}
        />
      )}

      {/* Tools Grid */}
      {!isLoading && !errorMessage && tools.length > 0 && (
        <div
          className="aiims-card-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {tools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              isInWallet={userToolIds.has(tool.id)}
              isAdding={addingToolId === tool.id}
              isSelectedForCompare={compareIds.includes(tool.id)}
              canSelectForCompare={compareIds.length < 4}
              onAdd={handleAddTool}
              onViewDetails={(t) => setDetailTool(t)}
              onToggleCompare={handleToggleCompare}
              onReport={(t) => setReportTool(t)}
            />
          ))}
        </div>
      )}

      {/* Sticky Bottom Comparison Floating Dock */}
      {compareIds.length > 0 && (
        <div
          style={{
            position: 'sticky',
            bottom: '20px',
            zIndex: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderRadius: '12px',
            backgroundColor: 'var(--aiims-text-heading, #0f172a)',
            color: '#ffffff',
            boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ArrowRightLeft size={18} style={{ color: '#818cf8' }} />
            <div>
              <span style={{ fontWeight: 800, fontSize: '13.5px' }}>
                Tool Comparison Ready ({compareIds.length}/4)
              </span>
              <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                {compareIds.length < 2
                  ? 'Select at least 1 more tool to generate side-by-side criteria analysis'
                  : 'Compare features, pricing limits, and market tiers'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="ghost"
              size="sm"
              style={{ color: '#cbd5e1' }}
              onClick={() => setCompareIds([])}
            >
              Clear
            </Button>
            <Button
              variant="violet"
              size="sm"
              disabled={compareIds.length < 2}
              icon={<ArrowRightLeft size={13} />}
              onClick={() => setIsCompareModalOpen(true)}
            >
              Compare Now
            </Button>
          </div>
        </div>
      )}

      {/* Tool Detail Modal */}
      <ToolDetailModal
        tool={detailTool}
        isOpen={Boolean(detailTool)}
        onClose={() => setDetailTool(null)}
        isInWallet={Boolean(detailTool && userToolIds.has(detailTool.id))}
        isAdding={Boolean(detailTool && addingToolId === detailTool.id)}
        onAdd={handleAddTool}
        onToggleCompare={handleToggleCompare}
        isSelectedForCompare={Boolean(detailTool && compareIds.includes(detailTool.id))}
        onReport={(t) => setReportTool(t)}
      />

      {/* Report Outdated Info Modal */}
      <ReportOutdatedModal
        tool={reportTool}
        isOpen={Boolean(reportTool)}
        onClose={() => setReportTool(null)}
        onSuccess={() => showToast('Report submitted for reviewer audit.', 'success')}
      />

      {/* Confirm Remove Tool Modal */}
      <ConfirmRemoveModal
        tool={removeTarget}
        isOpen={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleConfirmRemove}
        isRemoving={isRemoving}
      />

      {/* Comparison Modal */}
      <Modal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        maxWidth="960px"
        title="Side-by-Side Tool Comparison"
        subtitle="Compare specifications, tiers, capabilities, and pricing models without cost."
      >
        <ToolComparisonView
          allCatalogTools={allToolsCache.length > 0 ? allToolsCache : tools}
          selectedToolIds={compareIds}
          onRemoveTool={(id) => setCompareIds((prev) => prev.filter((item) => item !== id))}
          onAddTool={(id) => {
            if (compareIds.length < 4 && !compareIds.includes(id)) {
              setCompareIds((prev) => [...prev, id]);
            }
          }}
          onClearAll={() => setCompareIds([])}
        />
      </Modal>
    </div>
  );
};
