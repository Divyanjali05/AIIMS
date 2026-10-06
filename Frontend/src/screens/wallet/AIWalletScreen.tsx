import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Sparkles,
  Search,
  CheckCircle2,
  ExternalLink,
  Plus,
  Trash2,
  BarChart2,
  ArrowRightLeft,
  Compass,
  Briefcase,
  AlertCircle,
  ChevronRight,
  X,
  Edit3,
  Save,
  Info,
  Layers,
  ShieldCheck,
  Tag,
  ArrowRight,
  Target,
  RefreshCw,
  Zap,
  Globe,
  Check,
  Clock,
  BookOpen
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { MentorMessage } from '../../components/common/MentorMessage';
import {
  AITool,
  TaskCategory,
  ToolFamiliarity,
  ToolRecommendation,
  ToolSearchResult,
  RequirementToolComparison,
  ToolLifecycleStatus
} from '../../types';
import { apiClient } from '../../api/client';
import { generateWalletRecommendations } from '../../services/recommendationEngine';
import { trackLearningLoopEvent } from '../../services/learningLoop';

interface AIWalletScreenProps {
  setActiveTab: (tab: string) => void;
}

export const AIWalletScreen: React.FC<AIWalletScreenProps> = ({ setActiveTab }) => {
  const {
    state,
    addToolToWallet,
    removeToolFromWallet,
    updateToolFamiliarity,
    dismissRecommendation
  } = useLearner();

  const [activeSection, setActiveSection] = useState<'wallet' | 'discover' | 'compare' | 'gaps'>('discover');
  const [catalog, setCatalog] = useState<AITool[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPricing, setSelectedPricing] = useState<string>('All');
  const [filterSearch, setFilterSearch] = useState<string>('');

  // Natural Language Requirement Search State
  const [requirementQuery, setRequirementQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<ToolSearchResult | null>(null);

  // Requirement-First Comparison State
  const [comparisonRequirement, setComparisonRequirement] = useState<string>('');
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>(['tool-chatgpt', 'tool-claude']);
  const [reqComparisonData, setReqComparisonData] = useState<RequirementToolComparison | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);

  // Tool Detail Modal State
  const [selectedDetailTool, setSelectedDetailTool] = useState<AITool | null>(null);
  const [detailContextReason, setDetailContextReason] = useState<string | null>(null);
  const [detailEvidence, setDetailEvidence] = useState<any[]>([]);
  const [detailHistory, setDetailHistory] = useState<any[]>([]);

  const handleOpenToolDetail = async (tool: AITool, reason?: string) => {
    setSelectedDetailTool(tool);
    setDetailContextReason(reason || null);
    setDetailEvidence([]);
    setDetailHistory([]);

    try {
      const [ev, hist] = await Promise.all([
        apiClient.getToolEvidence(tool.id),
        apiClient.getToolHistory(tool.id)
      ]);
      if (Array.isArray(ev)) setDetailEvidence(ev);
      if (Array.isArray(hist)) setDetailHistory(hist);
    } catch (err) {
      console.warn('Failed to fetch evidence/history:', err);
    }
  };

  // User Notes Editing State
  const [editingNotesToolId, setEditingNotesToolId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState<string>('');

  // Toolkit Gaps State
  const [gapData, setGapData] = useState<any | null>(null);

  // Discovery Job Status State
  const [discoveryStatus, setDiscoveryStatus] = useState<any | null>(null);
  const [isRefreshingDiscovery, setIsRefreshingDiscovery] = useState<boolean>(false);

  // Fetch Catalog & Initial Data on Mount
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    Promise.all([
      apiClient.getWalletCatalog(),
      apiClient.getToolkitGaps(),
      apiClient.getDiscoveryStatus()
    ])
      .then(([catalogData, gaps, discStatus]) => {
        if (isMounted) {
          if (Array.isArray(catalogData)) setCatalog(catalogData);
          if (gaps) setGapData(gaps);
          if (discStatus) setDiscoveryStatus(discStatus);
        }
      })
      .catch((err) => console.warn('API fetch warning:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const userTools = state.aiWallet?.userTools || [];
  const recommendations: ToolRecommendation[] = generateWalletRecommendations(state, catalog);

  const categories: TaskCategory[] = [
    'Reasoning & Writing',
    'Agentic Coding',
    'Multi-Modal',
    'Research & RAG',
    'Image & Vision',
    'Data Analysis',
    'Presentation',
    'Video',
    'Automation'
  ];

  // Map user tool items to detailed catalog data
  const userToolsWithDetails = userTools.map((item) => {
    const detail = catalog.find((c) => c.id === item.toolId);
    return {
      ...item,
      name: detail?.name || item.toolId,
      description: detail?.description || 'Personal AI tool item',
      capabilities: detail?.capabilities || [],
      websiteUrl: detail?.officialWebsite || detail?.websiteUrl || '#',
      detail
    };
  });

  // Handle Natural Language Requirement Search
  const handleExecuteRequirementSearch = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : requirementQuery).trim();
    if (!q) return;

    setRequirementQuery(q);
    setIsSearching(true);
    try {
      const res = await apiClient.searchRequirement(q, userTools);
      setSearchResult(res);
      trackLearningLoopEvent({
        eventType: 'TOOL_SEARCHED',
        metadata: { query: q, totalMatches: res.totalMatches }
      });
    } catch (err) {
      console.error('Requirement search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle Triggering Automated Discovery Refresh Job
  const handleTriggerDiscovery = async () => {
    setIsRefreshingDiscovery(true);
    try {
      const res = await apiClient.triggerDiscoveryJob();
      if (res && res.report) {
        setDiscoveryStatus({ status: res.report, newAndUpdatedTools: res.newAndUpdatedTools });
        const updatedCatalog = await apiClient.getWalletCatalog();
        if (Array.isArray(updatedCatalog)) setCatalog(updatedCatalog);
      }
    } catch (err) {
      console.warn('Discovery trigger error:', err);
    } finally {
      setIsRefreshingDiscovery(false);
    }
  };

  // Handle Dynamic Requirement-First Comparison
  const handleRunRequirementComparison = async () => {
    if (selectedCompareIds.length < 2) return;
    setIsComparing(true);
    try {
      const res = await apiClient.compareToolsForRequirement(selectedCompareIds, comparisonRequirement);
      setReqComparisonData(res);
      trackLearningLoopEvent({
        eventType: 'TOOLS_COMPARED',
        toolId: selectedCompareIds[0],
        metadata: { selectedCompareIds, requirement: comparisonRequirement }
      });
    } catch (err) {
      console.error('Comparison execution failed:', err);
    } finally {
      setIsComparing(false);
    }
  };

  const toggleSelectCompareId = (id: string) => {
    if (selectedCompareIds.includes(id)) {
      if (selectedCompareIds.length > 2) {
        setSelectedCompareIds(selectedCompareIds.filter(i => i !== id));
      }
    } else {
      if (selectedCompareIds.length < 4) {
        setSelectedCompareIds([...selectedCompareIds, id]);
      }
    }
  };

  const handleOpenDetailModal = async (tool: AITool, contextReason?: string) => {
    setSelectedDetailTool(tool);
    setDetailContextReason(contextReason || null);
    setDetailEvidence([]);
    setDetailHistory([]);
    trackLearningLoopEvent({
      eventType: 'TOOL_EXPLORED_DETAIL',
      toolId: tool.id,
      category: tool.category
    });

    try {
      const [ev, hist] = await Promise.all([
        apiClient.getToolEvidence(tool.id),
        apiClient.getToolHistory(tool.id)
      ]);
      if (Array.isArray(ev)) setDetailEvidence(ev);
      if (Array.isArray(hist)) setDetailHistory(hist);
    } catch (err) {
      console.warn('Failed to fetch evidence/history:', err);
    }
  };

  const handleSaveNotes = (toolId: string) => {
    const currentTool = userTools.find((t) => t.toolId === toolId);
    if (currentTool) {
      updateToolFamiliarity(toolId, currentTool.familiarity, notesInput);
    }
    setEditingNotesToolId(null);
  };

  const getFamiliarityBadgeVariant = (fam: ToolFamiliarity) => {
    switch (fam) {
      case 'mastered': return 'success';
      case 'proficient': return 'cyan';
      case 'practicing': return 'warning';
      case 'exploring': default: return 'purple';
    }
  };

  const getFamiliarityLabel = (fam: ToolFamiliarity) => {
    switch (fam) {
      case 'mastered': return 'Mastered';
      case 'proficient': return 'Proficient';
      case 'practicing': return 'Practicing';
      case 'exploring': default: return 'Exploring';
    }
  };

  const getStatusBadge = (status: ToolLifecycleStatus) => {
    if (status === 'NEW') return <Badge variant="success" size="sm" icon={<Sparkles size={10} />}>NEW</Badge>;
    if (status === 'RECENTLY_UPDATED' || status === 'UPDATED') return <Badge variant="cyan" size="sm" icon={<Zap size={10} />}>RECENTLY UPDATED</Badge>;
    return null;
  };

  const newAndUpdatedTools = catalog.filter(t => t.status === 'NEW' || t.status === 'RECENTLY_UPDATED' || t.status === 'UPDATED');

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Page Header */}
      <PageHeader
        icon={<Wallet style={{ width: '24px', height: '24px', color: '#6366f1' }} />}
        title="AI Wallet & Tool Intelligence"
        description="Dynamic AI tool discovery, natural language requirement matching, verified pricing, 5-level learning tracks, task comparison, and personal toolkit layer."
        action={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Badge variant="primary" icon={<Briefcase size={12} />}>
              {userTools.length} Tools in Wallet
            </Badge>
            <Badge variant="cyan" icon={<Sparkles size={12} />}>
              {catalog.length} Verified Tools
            </Badge>
          </div>
        }
      />

      {/* AI Mentor Advice Banner */}
      <MentorMessage
        title="AINOVA TOOL INTELLIGENCE"
        message={`"Describe what you want to accomplish in natural language below. AINOVA continuously discovers and verifies new tools across the AI ecosystem to match your exact requirement."`}
      />

      {/* Primary 4 Section Navigation Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#ffffff',
        padding: '6px',
        borderRadius: '16px',
        border: '1px solid #ede9fe',
        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.04)'
      }}>
        {[
          { id: 'discover', label: '1. Requirement Search & Discover', icon: Compass, badge: `${catalog.length}` },
          { id: 'wallet', label: '2. My Wallet', icon: Wallet, badge: `${userTools.length}` },
          { id: 'compare', label: '3. Task Comparison', icon: ArrowRightLeft, badge: undefined },
          { id: 'gaps', label: '4. Toolkit Gaps', icon: BarChart2, badge: undefined }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: isActive ? '#6366f1' : 'transparent',
                color: isActive ? '#ffffff' : '#64748b',
                fontWeight: isActive ? 800 : 600,
                fontSize: '13px',
                fontFamily: "'Nunito', sans-serif",
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#eef2ff',
                  color: isActive ? '#ffffff' : '#6366f1'
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: REQUIREMENT SEARCH & DISCOVER */}
      {/* ========================================================================= */}
      {activeSection === 'discover' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* HERO NATURAL-LANGUAGE REQUIREMENT BOX */}
          <Surface variant="gradient-hero" radius="lg" padding="lg">
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>
                NATURAL-LANGUAGE AI TOOL MATCHING
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                What are you trying to accomplish?
              </h2>
              <p style={{ fontSize: '13.5px', color: '#4338ca', margin: 0, fontWeight: 500 }}>
                Describe your task in plain English. AINOVA extracts intent, domains, constraints, and ranks verified AI tools.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <textarea
                  rows={3}
                  value={requirementQuery}
                  onChange={(e) => setRequirementQuery(e.target.value)}
                  placeholder="e.g. I need a free AI tool that can analyze a 100-page PDF and generate interactive charts..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    borderRadius: '12px',
                    border: '2px solid #c7d2fe',
                    padding: '14px 16px',
                    fontSize: '14px',
                    fontFamily: "'Nunito', sans-serif",
                    color: '#0f172a',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.08)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                {/* Example Query Quick Chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Try:</span>
                  {[
                    'Analyze a 100-page PDF',
                    'Free AI for Excel charts',
                    'Telugu voice generation',
                    'Free AI for college presentation',
                    'Coding assistant like Cursor'
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleExecuteRequirementSearch(chip)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        border: '1px solid #c7d2fe',
                        backgroundColor: '#ffffff',
                        color: '#4338ca',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <Button
                  variant="violet"
                  size="md"
                  icon={isSearching ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
                  disabled={isSearching || !requirementQuery.trim()}
                  onClick={() => handleExecuteRequirementSearch()}
                >
                  {isSearching ? 'Understanding Intent...' : 'Find Relevant Tools'}
                </Button>
              </div>
            </div>
          </Surface>

              {/* INTENT BREAKDOWN & MATCH RESULTS PANEL */}
              {searchResult && (
                <Surface variant="bordered" radius="lg" padding="lg" style={{ borderLeft: '5px solid #6366f1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#4338ca', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '2px' }}>
                        TOOLS FOR YOUR REQUIREMENT
                      </div>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {searchResult.intent.primaryGoal || searchResult.intent.task || 'Requirement Matching'}
                      </h3>
                    </div>

                    <Badge variant="purple" icon={<Sparkles size={12} />}>
                      {searchResult.totalMatches} Verified Matches
                    </Badge>
                  </div>

                  {/* Extracted Intent Badges */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', padding: '10px 14px', backgroundColor: '#f8f7fd', borderRadius: '10px', border: '1px solid #ede9fe' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Primary Domain:</span>
                    {(searchResult.intent.domain || []).map((d: string, i: number) => (
                      <Badge key={i} variant="cyan" size="sm">{d}</Badge>
                    ))}
                    {searchResult.intent.tasks && searchResult.intent.tasks.length > 0 && (
                      <Badge variant="purple" size="sm">Tasks: {searchResult.intent.tasks.join(', ')}</Badge>
                    )}
                    {searchResult.intent.constraints?.freeOnly && (
                      <Badge variant="success" size="sm">✓ Free Tier / No Cost</Badge>
                    )}
                    {searchResult.intent.constraints?.language && (
                      <Badge variant="warning" size="sm">Language: {Array.isArray(searchResult.intent.constraints.language) ? searchResult.intent.constraints.language.join(', ') : searchResult.intent.constraints.language}</Badge>
                    )}
                    {searchResult.intent.knownTools && searchResult.intent.knownTools.length > 0 && (
                      <Badge variant="purple" size="sm">Reference Tool: {searchResult.intent.knownTools.join(', ')}</Badge>
                    )}
                  </div>

                  {/* Tool Combinations Workflow (if present for multi-intent queries) */}
                  {searchResult.toolCombinations && searchResult.toolCombinations.length > 0 && (
                    <div style={{ marginBottom: '20px', padding: '14px 16px', backgroundColor: '#eef2ff', borderRadius: '12px', border: '1px solid #c7d2fe' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#4338ca', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Layers size={14} /> SUGGESTED MULTI-TOOL WORKFLOW
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e1b4b', marginBottom: '4px' }}>
                        {searchResult.toolCombinations[0].workflowTitle}
                      </div>
                      <p style={{ fontSize: '12px', color: '#3730a3', margin: 0, lineHeight: 1.5 }}>
                        {searchResult.toolCombinations[0].explanation}
                      </p>
                    </div>
                  )}

                  {/* Search Result Matches Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {searchResult.matches.map((resItem) => {
                      const tool = resItem.tool;
                      const isAlreadyInWallet = userTools.some((t) => t.toolId === tool.id);
                      const isSelectedForCompare = selectedCompareIds.includes(tool.id);

                      return (
                        <Surface key={tool.id} variant="bordered" radius="lg" padding="md" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px', borderTop: '4px solid #6366f1' }}>
                          <div>
                            {/* Header Row */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                                    {tool.name}
                                  </h4>
                                  {getStatusBadge(tool.status)}
                                </div>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                                  by {tool.provider}
                                </span>
                              </div>

                              <Badge variant={resItem.matchLabel === 'Strong match' ? 'success' : resItem.matchLabel === 'Good match' ? 'purple' : 'neutral'} size="sm">
                                {resItem.matchLabel || `${resItem.matchScore || resItem.relevanceScore}% Match`}
                              </Badge>
                            </div>

                            {/* Why Matched Box */}
                            <div style={{ backgroundColor: '#f0eeff', border: '1px solid #c7d2fe', padding: '8px 12px', borderRadius: '8px', fontSize: '11.5px', color: '#312e81', marginBottom: '10px', fontWeight: 600 }}>
                              💡 <strong>Why it matches:</strong>
                              {resItem.whyMatches && resItem.whyMatches.length > 0 ? (
                                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                                  {resItem.whyMatches.map((why: string, idx: number) => (
                                    <li key={idx}>{why}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span> {resItem.matchReason}</span>
                              )}
                            </div>

                        <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: '#475569', lineHeight: 1.45 }}>
                          {tool.shortDescription || tool.description}
                        </p>

                        {/* Pricing Pill & Verified Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                          <Badge variant="purple" size="sm" icon={<Tag size={10} />}>
                            {tool.pricingDetails.summary}
                          </Badge>
                          <Badge variant="cyan" size="sm" icon={<ShieldCheck size={10} />}>
                            Verified
                          </Badge>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #f1f5f9', gap: '8px' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Info size={12} />}
                          onClick={() => handleOpenDetailModal(tool, resItem.matchReason)}
                        >
                          Details
                        </Button>

                        <button
                          onClick={() => toggleSelectCompareId(tool.id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: isSelectedForCompare ? '1px solid #6366f1' : '1px solid #cbd5e1',
                            backgroundColor: isSelectedForCompare ? '#eef2ff' : '#ffffff',
                            color: isSelectedForCompare ? '#4338ca' : '#64748b',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {isSelectedForCompare ? '✓ In Compare' : '+ Compare'}
                        </button>

                        <Button
                          variant={isAlreadyInWallet ? 'green' : 'primary'}
                          size="sm"
                          disabled={isAlreadyInWallet}
                          icon={isAlreadyInWallet ? <CheckCircle2 size={12} /> : <Plus size={12} />}
                          onClick={() => addToolToWallet(tool.id, tool.category, 'exploring')}
                        >
                          {isAlreadyInWallet ? 'In Wallet' : 'Add to Wallet'}
                        </Button>
                      </div>
                    </Surface>
                  );
                })}
              </div>
            </Surface>
          )}

          {/* DYNAMIC NEW & RECENTLY UPDATED TOOLS SECTION */}
          {newAndUpdatedTools.length > 0 && (
            <Surface variant="sky" radius="lg" padding="md">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={18} color="#0284c7" />
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    NEW & RECENTLY UPDATED AI TOOLS
                  </h3>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  icon={isRefreshingDiscovery ? <RefreshCw size={12} className="spin" /> : <RefreshCw size={12} />}
                  onClick={handleTriggerDiscovery}
                >
                  {isRefreshingDiscovery ? 'Syncing...' : 'Sync Ecosystem Discovery'}
                </Button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {newAndUpdatedTools.map((tool) => (
                  <div key={tool.id} style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #bae6fd', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{tool.name}</span>
                        {getStatusBadge(tool.status)}
                      </div>
                      <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#334155', lineHeight: 1.4 }}>
                        {tool.shortDescription || tool.description}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #f0f9ff' }}>
                      <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700 }}>
                        {tool.pricingDetails.summary}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDetailModal(tool)}>
                        View Details →
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Surface>
          )}

          {/* MULTI-DOMAIN CATEGORY EXPLORER */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Explore Verified Tools by Category & Domain
              </h3>

              {/* Filters Bar */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={selectedPricing}
                  onChange={(e) => setSelectedPricing(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 700, outline: 'none' }}
                >
                  <option value="All">All Pricing</option>
                  <option value="Free">Free / Free Tier</option>
                  <option value="Trial">Free Trial Available</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
              {['All', ...categories].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    border: selectedCategory === cat ? '1px solid #6366f1' : '1px solid #e2e8f0',
                    backgroundColor: selectedCategory === cat ? '#eef2ff' : '#ffffff',
                    color: selectedCategory === cat ? '#4338ca' : '#64748b',
                    fontSize: '12px',
                    fontWeight: selectedCategory === cat ? 800 : 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Catalog Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {catalog
                .filter((t) => selectedCategory === 'All' || t.category === selectedCategory || t.categories.includes(selectedCategory as any))
                .filter((t) => {
                  if (selectedPricing === 'Free') return t.pricingDetails.type === 'FREE' || t.pricingDetails.freeTierAvailable;
                  if (selectedPricing === 'Trial') return t.pricingDetails.freeTrialAvailable;
                  if (selectedPricing === 'Paid') return t.pricingDetails.type === 'PAID';
                  return true;
                })
                .map((tool) => {
                  const isAlreadyInWallet = userTools.some((t) => t.toolId === tool.id);
                  return (
                    <Surface key={tool.id} variant="bordered" radius="lg" padding="md" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <div>
                            <h4 style={{ margin: '0 0 2px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                              {tool.name}
                            </h4>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                              {tool.provider} • {tool.category}
                            </span>
                          </div>
                          {getStatusBadge(tool.status)}
                        </div>

                        <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: '#475569', lineHeight: 1.45 }}>
                          {tool.shortDescription || tool.description}
                        </p>

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                          <Badge variant="purple" size="sm">{tool.pricingDetails.summary}</Badge>
                          {tool.domains.slice(0, 1).map((d, i) => (
                            <Badge key={i} variant="neutral" size="sm">{d}</Badge>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                        <Button variant="ghost" size="sm" icon={<Info size={12} />} onClick={() => handleOpenDetailModal(tool)}>
                          View Detail & Track
                        </Button>
                        <Button
                          variant={isAlreadyInWallet ? 'green' : 'primary'}
                          size="sm"
                          disabled={isAlreadyInWallet}
                          icon={isAlreadyInWallet ? <CheckCircle2 size={12} /> : <Plus size={12} />}
                          onClick={() => addToolToWallet(tool.id, tool.category, 'exploring')}
                        >
                          {isAlreadyInWallet ? 'In Wallet' : 'Add to Wallet'}
                        </Button>
                      </div>
                    </Surface>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: MY WALLET */}
      {/* ========================================================================= */}
      {activeSection === 'wallet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Surface variant="gradient-hero" radius="lg" padding="md">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🧰 Your AI Toolkit</span>
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                  Tools you currently use and are learning to master. Update familiarity levels to evolve your profile.
                </p>
              </div>

              <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setActiveSection('discover')}>
                Discover & Add Tools
              </Button>
            </div>
          </Surface>

          {/* User Tools List */}
          {userToolsWithDetails.length === 0 ? (
            <Surface variant="bordered" radius="lg" padding="lg" style={{ textAlign: 'center' }}>
              <Wallet style={{ width: '40px', height: '40px', color: '#6366f1', margin: '0 auto 12px' }} />
              <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                Your AI Wallet is empty
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
                Use Requirement Search in Discover to find and add AI tools relevant to your work.
              </p>
              <Button variant="primary" size="sm" onClick={() => setActiveSection('discover')}>
                Explore Discover →
              </Button>
            </Surface>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {userToolsWithDetails.map((tool) => (
                <Surface key={tool.toolId} variant="bordered" radius="lg" padding="md" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                          {tool.name}
                        </h3>
                        <Badge variant="neutral" size="sm">
                          {tool.primaryCategory}
                        </Badge>
                      </div>

                      <Badge variant={getFamiliarityBadgeVariant(tool.familiarity)} size="sm">
                        {getFamiliarityLabel(tool.familiarity)}
                      </Badge>
                    </div>

                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                      {tool.description}
                    </p>

                    {/* Notes Section */}
                    {editingNotesToolId === tool.toolId ? (
                      <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <textarea
                          value={notesInput}
                          onChange={(e) => setNotesInput(e.target.value)}
                          placeholder="Add personal notes..."
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #6366f1', fontSize: '12px', outline: 'none' }}
                        />
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <Button variant="ghost" size="sm" onClick={() => setEditingNotesToolId(null)}>Cancel</Button>
                          <Button variant="primary" size="sm" icon={<Save size={12} />} onClick={() => handleSaveNotes(tool.toolId)}>Save Note</Button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', backgroundColor: '#f8f7fd', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', color: '#475569', marginBottom: '12px', borderLeft: '3px solid #6366f1' }}>
                        <span style={{ fontStyle: 'italic', flex: 1 }}>
                          {tool.userNotes ? `"${tool.userNotes}"` : 'No personal notes added yet.'}
                        </span>
                        <button
                          onClick={() => {
                            setEditingNotesToolId(tool.toolId);
                            setNotesInput(tool.userNotes || '');
                          }}
                          style={{ border: 'none', background: 'transparent', color: '#6366f1', cursor: 'pointer', padding: '0 0 0 8px' }}
                        >
                          <Edit3 size={12} />
                        </button>
                      </div>
                    )}

                    {/* Familiarity Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', backgroundColor: '#fafafa', padding: '6px 10px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Familiarity:</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {(['exploring', 'practicing', 'proficient', 'mastered'] as ToolFamiliarity[]).map((fam) => (
                          <button
                            key={fam}
                            onClick={() => updateToolFamiliarity(tool.toolId, fam)}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              border: tool.familiarity === fam ? '1px solid #6366f1' : '1px solid transparent',
                              backgroundColor: tool.familiarity === fam ? '#eef2ff' : 'transparent',
                              color: tool.familiarity === fam ? '#4338ca' : '#94a3b8',
                              fontSize: '10px',
                              fontWeight: tool.familiarity === fam ? 800 : 600,
                              cursor: 'pointer'
                            }}
                          >
                            {getFamiliarityLabel(fam)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Info size={12} />}
                      onClick={() => tool.detail && handleOpenDetailModal(tool.detail)}
                    >
                      View Details & Track
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 size={12} />}
                      onClick={() => removeToolFromWallet(tool.toolId)}
                      style={{ color: '#ef4444' }}
                    >
                      Remove
                    </Button>
                  </div>
                </Surface>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: COMPARE TOOLS — REQUIREMENT FIRST */}
      {/* ========================================================================= */}
      {activeSection === 'compare' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Surface variant="gradient-hero" radius="lg" padding="md">
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowRightLeft size={20} style={{ color: '#6366f1' }} />
                <span>Requirement-First Dynamic Tool Comparison</span>
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                Compare 2 to 4 AI tools side-by-side for your specific task. Comparison criteria dynamically adapt to your domain requirements.
              </p>
            </div>
          </Surface>

          {/* Selector & Requirement Form */}
          <Surface variant="bordered" radius="lg" padding="md">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
                  What task are you comparing tools for? (Optional):
                </label>
                <input
                  type="text"
                  value={comparisonRequirement}
                  onChange={(e) => setComparisonRequirement(e.target.value)}
                  placeholder="e.g. Analyzing 100-page research PDFs and drafting summaries..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #c7d2fe', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
                  Select 2 to 4 tools to compare:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {catalog.map((t) => {
                    const isSelected = selectedCompareIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleSelectCompareId(t.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #6366f1' : '1px solid #e2e8f0',
                          backgroundColor: isSelected ? '#eef2ff' : '#ffffff',
                          color: isSelected ? '#4338ca' : '#475569',
                          fontSize: '12px',
                          fontWeight: isSelected ? 800 : 600,
                          cursor: 'pointer'
                        }}
                      >
                        {isSelected ? '✓ ' : '+ '} {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="violet"
                  size="md"
                  icon={isComparing ? <RefreshCw size={14} className="spin" /> : <ArrowRightLeft size={14} />}
                  disabled={isComparing || selectedCompareIds.length < 2}
                  onClick={handleRunRequirementComparison}
                >
                  {isComparing ? 'Comparing...' : 'Compare Selected Tools'}
                </Button>
              </div>
            </div>
          </Surface>

          {/* Dynamic Comparison Matrix */}
          {reqComparisonData && (
            <Surface variant="bordered" radius="lg" padding="lg">
              <div style={{ marginBottom: '16px' }}>
                <Badge variant="purple" icon={<Sparkles size={12} />}>
                  Domain: {reqComparisonData.taskDomain}
                </Badge>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '8px 0 4px' }}>
                  How These Tools Fit Your Task
                </h3>
                <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                  "{reqComparisonData.overallSynthesis}"
                </p>
              </div>

              {/* Side-by-Side Criteria Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f7fd', borderBottom: '2px solid #ede9fe' }}>
                      <th style={{ textAlign: 'left', padding: '12px', color: '#475569', fontWeight: 800 }}>Comparison Criterion</th>
                      {reqComparisonData.tools.map(t => (
                        <th key={t.id} style={{ textAlign: 'left', padding: '12px', color: '#1e1b4b', fontWeight: 800, minWidth: '180px' }}>
                          {t.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reqComparisonData.comparisonCriteria.map((crit, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a', backgroundColor: '#fafafa' }}>
                          {crit.criterion}
                        </td>
                        {reqComparisonData.tools.map(t => (
                          <td key={t.id} style={{ padding: '12px', color: '#334155', lineHeight: 1.45 }}>
                            {crit.evaluations[t.id] || 'N/A'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a', backgroundColor: '#fafafa' }}>
                        Why It Fits
                      </td>
                      {reqComparisonData.tools.map(t => (
                        <td key={t.id} style={{ padding: '12px', color: '#047857', fontWeight: 600 }}>
                          {reqComparisonData.fitAnalysis[t.id]?.whyItFits}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a', backgroundColor: '#fafafa' }}>
                        Key Trade-off
                      </td>
                      {reqComparisonData.tools.map(t => (
                        <td key={t.id} style={{ padding: '12px', color: '#b45309', fontWeight: 600 }}>
                          {reqComparisonData.fitAnalysis[t.id]?.keyTradeoff}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Surface>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: TOOLKIT GAPS */}
      {/* ========================================================================= */}
      {activeSection === 'gaps' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Surface variant="gradient-hero" radius="lg" padding="md">
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={20} style={{ color: '#6366f1' }} />
                <span>Toolkit Coverage & Capability Gaps</span>
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                Automated coverage analysis across 35+ major AI domains based on your current AI Wallet tools.
              </p>
            </div>
          </Surface>

          {gapData && (
            <Surface variant="bordered" radius="lg" padding="lg">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>
                    Toolkit Domain Coverage: {gapData.coveredCount} of {gapData.totalDomains} Domains Covered
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                    Adding tools across missing domains rounds out your capabilities for real-world tasks.
                  </p>
                </div>
              </div>

              {/* Gaps List */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
                {gapData.gaps.map((gap: any, idx: number) => (
                  <div key={idx} style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#fef3c7', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', marginBottom: '4px' }}>
                      UNREPRESENTED DOMAIN
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#78350f', marginBottom: '6px' }}>
                      {gap.domain}
                    </div>
                    <p style={{ fontSize: '12px', color: '#92400e', margin: '0 0 12px', lineHeight: 1.4 }}>
                      Subdomains: {gap.subdomains.slice(0, 3).join(', ')}
                    </p>
                    <Button
                      variant="amber"
                      size="sm"
                      onClick={() => {
                        setActiveSection('discover');
                        handleExecuteRequirementSearch(gap.recommendedQuery);
                      }}
                    >
                      Find {gap.domain} Tools →
                    </Button>
                  </div>
                ))}
              </div>
            </Surface>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* IN-APP TOOL DETAILS & 5-LEVEL LEARNING TRACK MODAL */}
      {/* ========================================================================= */}
      {selectedDetailTool && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            maxWidth: '720px',
            width: '100%',
            maxHeight: '85vh',
            overflowY: 'auto',
            padding: '24px',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <button
              onClick={() => setSelectedDetailTool(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Badge variant="purple" size="sm">{selectedDetailTool.category}</Badge>
                <Badge variant="cyan" size="sm" icon={<ShieldCheck size={10} />}>Verified Source</Badge>
                {getStatusBadge(selectedDetailTool.status)}
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {selectedDetailTool.name}
              </h2>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                by <strong>{selectedDetailTool.provider}</strong> • Verified at {new Date(selectedDetailTool.lastVerifiedAt).toLocaleDateString()}
              </div>
            </div>

            {/* Description */}
            <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, marginBottom: '20px' }}>
              {selectedDetailTool.description}
            </p>

            {/* Pricing Breakdown Box */}
            <div style={{ backgroundColor: '#f8f7fd', border: '1px solid #ede9fe', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#4338ca', marginBottom: '8px', textTransform: 'uppercase' }}>
                VERIFIED PRICING SUMMARY
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>
                {selectedDetailTool.pricingDetails.summary}
              </div>
              {selectedDetailTool.pricingDetails.freeTierLimitations && (
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Note: {selectedDetailTool.pricingDetails.freeTierLimitations}
                </div>
              )}
            </div>

            {/* VERIFIED SOURCE EVIDENCE CLAIMS */}
            {detailEvidence.length > 0 && (
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#15803d', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} color="#16a34a" />
                  VERIFIED SOURCE EVIDENCE
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {detailEvidence.map((ev, i) => (
                    <div key={i} style={{ fontSize: '12px', color: '#166534', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span><strong>• {ev.claim}:</strong> {ev.value}</span>
                      <a href={ev.sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#047857', fontWeight: 700 }}>
                        {ev.sourceTitle || 'View Source'}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* WHAT CHANGED? (VERSION HISTORY) */}
            {detailHistory.length > 0 && (
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} color="#6366f1" />
                  WHAT CHANGED? (VERSION & CHANGE LOG)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {detailHistory.map((hist, i) => (
                    <div key={i} style={{ fontSize: '12px', color: '#334155' }}>
                      <span style={{ fontWeight: 700, color: '#4338ca' }}>[{hist.version}]</span> {hist.summary}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5-LEVEL LEARNING TRACK */}
            {selectedDetailTool.learningTrack && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BookOpen size={16} color="#6366f1" />
                  BEGINNER → ADVANCED LEARNING TRACK
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedDetailTool.learningTrack.map((lvl) => (
                    <div key={lvl.level} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5', marginBottom: '2px' }}>
                        {lvl.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#334155', marginBottom: '4px' }}>
                        {lvl.description}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        <strong>Suggested Workflow:</strong> {lvl.suggestedWorkflow}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths & Limitations */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '12px', backgroundColor: '#ecfdf5', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#047857', marginBottom: '6px' }}>STRENGTHS</div>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#064e3b', lineHeight: 1.5 }}>
                  {selectedDetailTool.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <div style={{ padding: '12px', backgroundColor: '#fffbe6', borderRadius: '10px', border: '1px solid #fde68a' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', marginBottom: '6px' }}>LIMITATIONS</div>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#92400e', lineHeight: 1.5 }}>
                  {selectedDetailTool.limitations.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <a
                href={selectedDetailTool.officialWebsite}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#6366f1' }}
              >
                Official Website <ExternalLink size={14} />
              </a>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDetailTool(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  icon={<Plus size={14} />}
                  onClick={() => {
                    addToolToWallet(selectedDetailTool.id, selectedDetailTool.category, 'exploring');
                    setSelectedDetailTool(null);
                  }}
                >
                  Add to My Wallet
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
