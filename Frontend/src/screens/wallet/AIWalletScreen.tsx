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
  Target
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
  ToolComparison
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

  const [activeSection, setActiveSection] = useState<'wallet' | 'discover' | 'compare' | 'gaps'>('wallet');
  const [catalog, setCatalog] = useState<AITool[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Tool Comparison State
  const [compareToolAId, setCompareToolAId] = useState<string>('tool-chatgpt');
  const [compareToolBId, setCompareToolBId] = useState<string>('tool-claude');
  const [comparisonData, setComparisonData] = useState<ToolComparison | null>(null);

  // Tool Detail Modal State
  const [selectedDetailTool, setSelectedDetailTool] = useState<AITool | null>(null);
  const [detailContextReason, setDetailContextReason] = useState<string | null>(null);

  // User Notes Editing State
  const [editingNotesToolId, setEditingNotesToolId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState<string>('');

  // Fetch Backend Catalog on Mount
  useEffect(() => {
    let isMounted = true;
    apiClient
      .getWalletCatalog()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setCatalog(data);
        }
      })
      .catch((err) => console.warn('Could not fetch wallet catalog from API:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute recommendations dynamically using recommendationEngine with full LearnerContext
  const recommendations: ToolRecommendation[] = generateWalletRecommendations(state, catalog);

  const userTools = state.aiWallet?.userTools || [];

  // All 9 Task Categories
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
      websiteUrl: detail?.websiteUrl || '#',
      detail
    };
  });

  // Filtered user tools for MY WALLET section
  const filteredUserTools = userToolsWithDetails.filter((t) => {
    const matchesCategory = selectedCategory === 'All' || t.primaryCategory === selectedCategory;
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.primaryCategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Fetch side-by-side comparison when tools change in COMPARE section
  useEffect(() => {
    if (activeSection === 'compare' && compareToolAId && compareToolBId) {
      apiClient
        .compareTools(compareToolAId, compareToolBId)
        .then((res) => {
          if (res && res.toolA && res.toolB) {
            setComparisonData(res);
            trackLearningLoopEvent({
              eventType: 'TOOLS_COMPARED',
              toolId: compareToolAId,
              metadata: { toolBId: compareToolBId }
            });
          }
        })
        .catch((e) => console.warn('Comparison fetch failed:', e));
    }
  }, [activeSection, compareToolAId, compareToolBId]);

  const handleStartCompare = (toolAId: string, toolBId: string) => {
    setCompareToolAId(toolAId);
    setCompareToolBId(toolBId);
    setActiveSection('compare');
  };

  const handleOpenDetailModal = (tool: AITool, contextReason?: string) => {
    setSelectedDetailTool(tool);
    setDetailContextReason(contextReason || null);
    trackLearningLoopEvent({
      eventType: 'TOOL_EXPLORED_DETAIL',
      toolId: tool.id,
      category: tool.category
    });
  };

  const handleSaveNotes = (toolId: string) => {
    const currentTool = userTools.find((t) => t.toolId === toolId);
    if (currentTool) {
      updateToolFamiliarity(toolId, currentTool.familiarity, notesInput);
      trackLearningLoopEvent({
        eventType: 'FAMILIARITY_UPDATED',
        toolId,
        familiarity: currentTool.familiarity,
        metadata: { notesUpdated: true }
      });
    }
    setEditingNotesToolId(null);
  };

  const getFamiliarityBadgeVariant = (fam: ToolFamiliarity) => {
    switch (fam) {
      case 'mastered':
        return 'success';
      case 'proficient':
        return 'cyan';
      case 'practicing':
        return 'warning';
      case 'exploring':
      default:
        return 'purple';
    }
  };

  const getFamiliarityLabel = (fam: ToolFamiliarity) => {
    switch (fam) {
      case 'mastered':
        return 'Mastered';
      case 'proficient':
        return 'Proficient';
      case 'practicing':
        return 'Practicing';
      case 'exploring':
      default:
        return 'Exploring';
    }
  };

  const getRuleTypeBadge = (type: string) => {
    switch (type) {
      case 'RADAR_DISCOVERY':
        return <Badge variant="warning" size="sm" icon={<AlertCircle size={10} />}>Radar Shift</Badge>;
      case 'FOCUS_BASED':
        return <Badge variant="cyan" size="sm" icon={<Target size={10} />}>Active Focus</Badge>;
      case 'SKILL_GAP':
        return <Badge variant="purple" size="sm" icon={<BarChart2 size={10} />}>Growth Area</Badge>;
      case 'TASK_BASED':
        return <Badge variant="cyan" size="sm" icon={<Briefcase size={10} />}>Active Focus</Badge>;
      case 'ALTERNATIVE_TOOL':
        return <Badge variant="neutral" size="sm" icon={<ArrowRightLeft size={10} />}>Alternative Workflow</Badge>;
      case 'TOOLKIT_GAP':
        return <Badge variant="warning" size="sm" icon={<Layers size={10} />}>Toolkit Gap</Badge>;
      default:
        return <Badge variant="primary" size="sm" icon={<Sparkles size={10} />}>Recommended</Badge>;
    }
  };

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <PageHeader
        icon={<Wallet style={{ width: '24px', height: '24px', color: '#6366f1' }} />}
        title="AI Wallet"
        description="Your personalized AI toolkit layer. Track tools you currently use, discover relevant workflows based on your learning profile, compare alternatives neutrally, and round out your AI capabilities."
        action={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Badge variant="primary" icon={<Briefcase size={12} />}>
              {userTools.length} Tools in Toolkit
            </Badge>
            <Badge variant="cyan" icon={<Sparkles size={12} />}>
              {recommendations.length} Recommendations
            </Badge>
          </div>
        }
      />

      {/* WALLET -> CLARITY GUIDANCE BRIDGE BANNER (STAGE 3 -> STAGE 4) */}
      <Surface variant="highlight" radius="lg" padding="md" style={{ borderLeft: '5px solid #6366f1' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Compass size={22} color="#4f46e5" />
            <div>
              <h4 style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 800, color: '#3730a3' }}>
                NEXT JOURNEY STEP • CLARITY
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#4338ca', lineHeight: 1.4 }}>
                You've explored the tools available to you. Now clarify what you actually want AI to help you accomplish.
              </p>
            </div>
          </div>

          <Button
            variant="violet"
            size="sm"
            icon={<ArrowRight size={14} />}
            onClick={() => setActiveTab && setActiveTab('clarity')}
          >
            Build My AI Direction
          </Button>
        </div>
      </Surface>

      {/* AI Mentor Contextual Advice */}
      <MentorMessage
        title="AI WALLET MENTOR ADVICE"
        message={`"Welcome to your AI Wallet, ${state.profile?.name?.split(' ')[0]}! Having a focused, diverse toolkit accelerates your capability in '${state.analysis?.growthArea || 'AI Workflows'}'. Explore recommended workflows below to find tools that fit your daily tasks."`}
      />

      {/* Primary Section Navigation Tabs */}
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
          { id: 'wallet', label: '1. My Wallet', icon: Wallet, badge: `${userTools.length}` },
          { id: 'discover', label: '2. Discover & Recommendations', icon: Compass, badge: `${recommendations.length}` },
          { id: 'compare', label: '3. Compare Tools', icon: ArrowRightLeft, badge: undefined },
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
      {/* SECTION 1: MY WALLET */}
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
                  Tools you currently use and are learning to master across your daily workflows. Update familiarity levels to evolve your profile.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => setActiveSection('discover')}
              >
                Discover & Add Tools
              </Button>
            </div>
          </Surface>

          {/* Search & Category Filter Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '4px', maxWidth: '100%' }}>
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
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#ffffff', padding: '6px 14px', borderRadius: '9999px', border: '1px solid #ede9fe' }}>
              <Search size={14} style={{ color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Filter tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: '12px', fontFamily: "'Nunito', sans-serif", width: '140px' }}
              />
            </div>
          </div>

          {/* User Tools Grid */}
          {filteredUserTools.length === 0 ? (
            <Surface variant="bordered" radius="lg" padding="lg" style={{ textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                <Wallet style={{ width: '22px', height: '22px', color: '#6366f1' }} />
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                No tools in this view
              </h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
                Explore recommended tools in the Discover section to start populating your wallet.
              </p>
              <Button variant="primary" size="sm" onClick={() => setActiveSection('discover')}>
                Explore Discover →
              </Button>
            </Surface>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {filteredUserTools.map((tool) => (
                <Surface key={tool.toolId} variant="bordered" radius="lg" padding="md" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
                  <div>
                    {/* Header Row */}
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

                    {/* User Notes Section */}
                    {editingNotesToolId === tool.toolId ? (
                      <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <textarea
                          value={notesInput}
                          onChange={(e) => setNotesInput(e.target.value)}
                          placeholder="Add your personal notes for this tool..."
                          style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '8px',
                            border: '1px solid #6366f1',
                            fontSize: '12px',
                            fontFamily: "'Nunito', sans-serif",
                            outline: 'none',
                            resize: 'vertical',
                            minHeight: '54px'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <Button variant="ghost" size="sm" onClick={() => setEditingNotesToolId(null)}>
                            Cancel
                          </Button>
                          <Button variant="primary" size="sm" icon={<Save size={12} />} onClick={() => handleSaveNotes(tool.toolId)}>
                            Save Note
                          </Button>
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
                          title="Edit personal notes"
                        >
                          <Edit3 size={12} />
                        </button>
                      </div>
                    )}

                    {/* Inline Familiarity Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', backgroundColor: '#fafafa', padding: '6px 10px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Familiarity:</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {(['exploring', 'practicing', 'proficient', 'mastered'] as ToolFamiliarity[]).map((fam) => (
                          <button
                            key={fam}
                            onClick={() => {
                              updateToolFamiliarity(tool.toolId, fam);
                              trackLearningLoopEvent({
                                eventType: 'FAMILIARITY_UPDATED',
                                toolId: tool.toolId,
                                familiarity: fam
                              });
                            }}
                            title={`Mark as ${getFamiliarityLabel(fam)}`}
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
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Info size={12} />}
                        onClick={() => tool.detail && handleOpenDetailModal(tool.detail)}
                      >
                        View Detail
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<ArrowRightLeft size={12} />}
                        onClick={() => handleStartCompare(tool.toolId, 'tool-claude')}
                      >
                        Compare
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 size={12} />}
                      onClick={() => {
                        removeToolFromWallet(tool.toolId);
                        trackLearningLoopEvent({
                          eventType: 'TOOL_REMOVED',
                          toolId: tool.toolId
                        });
                      }}
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
      {/* SECTION 2: DISCOVER & RECOMMENDATIONS */}
      {/* ========================================================================= */}
      {activeSection === 'discover' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Surface variant="gradient-hero" radius="lg" padding="md">
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>💡 Worth Exploring</span>
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                Personalized AI tool recommendations derived from your AI Profile, diagnostic assessment scores, active focus track, AI Radar investigations, and current toolkit coverage.
              </p>
            </div>
          </Surface>

          {/* Recommendations List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {recommendations.length === 0 ? (
              <Surface variant="bordered" radius="lg" padding="lg" style={{ textAlign: 'center' }}>
                <CheckCircle2 style={{ width: '32px', height: '32px', color: '#059669', margin: '0 auto 8px auto' }} />
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800 }}>
                  Your recommendations are up to date!
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  You have explored or added all current recommendations to your wallet.
                </p>
              </Surface>
            ) : (
              recommendations.map((rec) => {
                const toolDetail = catalog.find((c) => c.id === rec.toolId);
                const isAlreadyInWallet = userTools.some((t) => t.toolId === rec.toolId);

                return (
                  <Surface
                    key={rec.id}
                    variant="bordered"
                    radius="lg"
                    padding="md"
                    style={{
                      borderLeft: '4px solid #6366f1',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        {/* Header Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          <Badge variant="primary" icon={<Sparkles size={12} />}>
                            💡 Worth exploring
                          </Badge>
                          {getRuleTypeBadge(rec.type)}
                          {rec.relatedTask && (
                            <Badge variant="cyan" size="sm">
                              Task: {rec.relatedTask}
                            </Badge>
                          )}
                          {rec.relatedSkill && (
                            <Badge variant="purple" size="sm">
                              Skill: {rec.relatedSkill}
                            </Badge>
                          )}
                        </div>

                        <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                          {toolDetail?.name || rec.toolId}
                        </h3>

                        <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                          {toolDetail?.description}
                        </p>

                        {/* Recommendation Reason Box */}
                        <div style={{ backgroundColor: '#f0eeff', border: '1px solid #c7d2fe', padding: '12px 16px', borderRadius: '12px', marginBottom: '12px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#4338ca', marginBottom: '4px' }}>
                            WHY YOU'RE SEEING THIS:
                          </div>
                          <div style={{ fontSize: '13px', color: '#312e81', lineHeight: 1.5 }}>
                            "{rec.reason}"
                          </div>
                        </div>

                        {/* Capability Pills */}
                        {toolDetail?.capabilities && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {toolDetail.capabilities.map((cap, idx) => (
                              <span key={idx} style={{ fontSize: '11px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '3px 9px', borderRadius: '6px', fontWeight: 600 }}>
                                • {cap}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Info size={13} />}
                          onClick={() => toolDetail && handleOpenDetailModal(toolDetail, rec.reason)}
                        >
                          Explore Detail
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<ArrowRightLeft size={13} />}
                          onClick={() => handleStartCompare('tool-chatgpt', rec.toolId)}
                        >
                          Compare
                        </Button>

                        <Button
                          variant={isAlreadyInWallet ? 'green' : 'primary'}
                          size="sm"
                          icon={isAlreadyInWallet ? <CheckCircle2 size={13} /> : <Plus size={13} />}
                          disabled={isAlreadyInWallet}
                          onClick={() => {
                            if (toolDetail) {
                              addToolToWallet(toolDetail.id, toolDetail.category, 'exploring');
                              trackLearningLoopEvent({
                                eventType: 'TOOL_ADDED',
                                toolId: toolDetail.id,
                                category: toolDetail.category,
                                recommendationId: rec.id
                              });
                            }
                          }}
                        >
                          {isAlreadyInWallet ? 'Added to Wallet' : 'Add to Wallet'}
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          dismissRecommendation(rec.id);
                          trackLearningLoopEvent({
                            eventType: 'RECOMMENDATION_DISMISSED',
                            recommendationId: rec.id,
                            toolId: rec.toolId
                          });
                        }}
                        style={{ color: '#94a3b8' }}
                      >
                        Maybe Later
                      </Button>
                    </div>
                  </Surface>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: COMPARE TOOLS */}
      {/* ========================================================================= */}
      {activeSection === 'compare' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Surface variant="gradient-hero" radius="lg" padding="md">
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowRightLeft size={20} style={{ color: '#6366f1' }} />
                <span>Task-Based Tool Comparison</span>
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                Compare AI tools side-by-side based on task suitability, context window, specialized strengths, and limitations. We evaluate tools objectively without binary "better/worse" claims.
              </p>
            </div>
          </Surface>

          {/* Selector Row */}
          <Surface variant="bordered" radius="lg" padding="md">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
                  Select Tool A (Current or Baseline):
                </label>
                <select
                  value={compareToolAId}
                  onChange={(e) => setCompareToolAId(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #c7d2fe', backgroundColor: '#ffffff', fontSize: '13px', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                >
                  {catalog.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
                  Select Tool B (Alternative / Exploring):
                </label>
                <select
                  value={compareToolBId}
                  onChange={(e) => setCompareToolBId(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #c7d2fe', backgroundColor: '#ffffff', fontSize: '13px', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                >
                  {catalog.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Surface>

          {/* Side-by-Side Comparison Cards */}
          {comparisonData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Tool A Card */}
                <Surface variant="bordered" radius="lg" padding="md" style={{ borderTop: '4px solid #6366f1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                      {comparisonData.toolA.name}
                    </h3>
                    <Badge variant="primary" size="sm">Tool A</Badge>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
                    {comparisonData.toolA.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Strengths</div>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#334155', lineHeight: 1.6 }}>
                        {comparisonData.toolA.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Limitations / Trade-offs</div>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
                        {comparisonData.toolA.limitations.map((l, i) => (
                          <li key={i}>{l}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Surface>

                {/* Tool B Card */}
                <Surface variant="bordered" radius="lg" padding="md" style={{ borderTop: '4px solid #059669' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                      {comparisonData.toolB.name}
                    </h3>
                    <Badge variant="success" size="sm">Tool B</Badge>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
                    {comparisonData.toolB.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Strengths</div>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#334155', lineHeight: 1.6 }}>
                        {comparisonData.toolB.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Limitations / Trade-offs</div>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
                        {comparisonData.toolB.limitations.map((l, i) => (
                          <li key={i}>{l}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Surface>
              </div>

              {/* Neutral Task Synthesis Prompt */}
              <Surface variant="highlight" radius="lg" padding="md" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                  Task Synthesis & Decision Framework
                </div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800, color: '#1e1b4b' }}>
                  {comparisonData.summaryQuestion}
                </h4>
                <p style={{ fontSize: '13px', color: '#312e81', maxWidth: '700px', margin: '0 auto', lineHeight: 1.5 }}>
                  {comparisonData.keyConsideration}
                </p>
              </Surface>
            </div>
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
                <span>Toolkit Capability Coverage</span>
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                Overview of task category representation in your personal wallet. We highlight opportunity areas to help you discover tools across diverse AI domains.
              </p>
            </div>
          </Surface>

          {/* Category Coverage Matrix */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {categories.map((cat) => {
              const toolsInCat = userToolsWithDetails.filter((t) => t.primaryCategory === cat);
              const hasTools = toolsInCat.length > 0;

              return (
                <Surface
                  key={cat}
                  variant={hasTools ? 'bordered' : 'subtle'}
                  radius="lg"
                  padding="md"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    borderLeft: hasTools ? '4px solid #059669' : '4px solid #f59e0b'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                        {cat}
                      </h3>
                      <Badge variant={hasTools ? 'success' : 'warning'} size="sm">
                        {hasTools ? `${toolsInCat.length} Tool${toolsInCat.length > 1 ? 's' : ''}` : 'Opportunity'}
                      </Badge>
                    </div>

                    {hasTools ? (
                      <div>
                        <div style={{ fontSize: '12px', color: '#059669', fontWeight: 700, marginBottom: '6px' }}>
                          ✓ Represented in wallet
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {toolsInCat.map((t) => (
                            <span key={t.toolId} style={{ fontSize: '11px', backgroundColor: '#ecfdf5', color: '#047857', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '12px', color: '#d97706', fontWeight: 700, marginBottom: '4px' }}>
                          Opportunity to explore
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                          You haven't added a {cat.toLowerCase()}-focused tool to your wallet yet.
                        </p>
                      </div>
                    )}
                  </div>

                  {!hasTools && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<ChevronRight size={12} />}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setActiveSection('discover');
                      }}
                      style={{ alignSelf: 'flex-start', color: '#6366f1', padding: 0 }}
                    >
                      Explore {cat} Tools →
                    </Button>
                  )}
                </Surface>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOOL DETAIL MODAL EXPERIENCE */}
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
          <Surface variant="bordered" radius="lg" padding="lg" style={{
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedDetailTool(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                border: 'none',
                background: '#f1f5f9',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Badge variant="primary" icon={<Tag size={12} />}>{selectedDetailTool.category}</Badge>
                <Badge variant="neutral" size="sm">Active Tool</Badge>
              </div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
                {selectedDetailTool.name}
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.5 }}>
                {selectedDetailTool.description}
              </p>
            </div>

            {/* Contextual Reason Box */}
            {detailContextReason && (
              <div style={{ backgroundColor: '#f0eeff', border: '1px solid #c7d2fe', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#4338ca', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Why AIIMS recommends exploring this:
                </div>
                <div style={{ fontSize: '13px', color: '#312e81', lineHeight: 1.5 }}>
                  "{detailContextReason}"
                </div>
              </div>
            )}

            {/* Core Capabilities */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                Key Capabilities
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {selectedDetailTool.capabilities.map((cap, i) => (
                  <span key={i} style={{ fontSize: '12px', backgroundColor: '#eef2ff', color: '#4338ca', padding: '4px 10px', borderRadius: '8px', fontWeight: 700 }}>
                    ✓ {cap}
                  </span>
                ))}
              </div>
            </div>

            {/* Strengths & Limitations Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Primary Strengths
                </div>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#166534', lineHeight: 1.6 }}>
                  {selectedDetailTool.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <div style={{ backgroundColor: '#fff7ed', padding: '12px', borderRadius: '10px', border: '1px solid #fed7aa' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#c2410c', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Trade-offs & Considerations
                </div>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#9a3412', lineHeight: 1.6 }}>
                  {selectedDetailTool.limitations.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Action Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <Button
                variant="secondary"
                size="md"
                icon={<ArrowRightLeft size={14} />}
                onClick={() => {
                  handleStartCompare('tool-chatgpt', selectedDetailTool.id);
                  setSelectedDetailTool(null);
                }}
              >
                Compare Tool
              </Button>

              <div style={{ display: 'flex', gap: '10px' }}>
                {userTools.some((t) => t.toolId === selectedDetailTool.id) ? (
                  <Button variant="green" size="md" icon={<CheckCircle2 size={14} />} disabled>
                    In Your Wallet
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    icon={<Plus size={14} />}
                    onClick={() => {
                      addToolToWallet(selectedDetailTool.id, selectedDetailTool.category, 'exploring');
                      trackLearningLoopEvent({
                        eventType: 'TOOL_ADDED',
                        toolId: selectedDetailTool.id,
                        category: selectedDetailTool.category
                      });
                      setSelectedDetailTool(null);
                    }}
                  >
                    Add to Wallet
                  </Button>
                )}

                <a href={selectedDetailTool.websiteUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <Button variant="outline" size="md" icon={<ExternalLink size={14} />}>
                    Open Tool Website
                  </Button>
                </a>
              </div>
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
};
