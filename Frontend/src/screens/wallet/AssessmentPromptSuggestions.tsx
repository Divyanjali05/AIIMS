import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  FileCode,
  Terminal,
  ExternalLink,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { TaskCategory, ToolFamiliarity, UserToolItem } from '../../types';
import { AssessmentToolInsights, AssessmentPromptMatch } from '../../services/assessmentToolMatcher';

interface AssessmentPromptSuggestionsProps {
  insights: AssessmentToolInsights;
  userTools: UserToolItem[];
  onAddTool: (toolId: string, category: TaskCategory, familiarity?: ToolFamiliarity, notes?: string) => void;
  onAddAllTools: (tools: UserToolItem[]) => void;
  onOpenToolDetail?: (toolId: string) => void;
}

export const AssessmentPromptSuggestions: React.FC<AssessmentPromptSuggestionsProps> = ({
  insights,
  userTools,
  onAddTool,
  onAddAllTools,
  onOpenToolDetail
}) => {
  const [showPrompts, setShowPrompts] = useState<boolean>(true);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [allAddedToast, setAllAddedToast] = useState<boolean>(false);

  const userToolIdSet = new Set(userTools.map(t => t.toolId));

  // Determine unadded tools from suggested list
  const unaddedCandidates = insights.autoAddTools.filter(t => !userToolIdSet.has(t.toolId));

  const handleAddSingle = (item: AssessmentPromptMatch) => {
    onAddTool(
      item.toolId,
      item.category,
      item.recommendedFamiliarity,
      `Auto-added from Assessment: Matched ${item.sourceChallengeTitle} (${item.reason.slice(0, 60)}...)`
    );
    setJustAddedId(item.toolId);
    setTimeout(() => setJustAddedId(null), 2500);
  };

  const handleAddAll = () => {
    if (unaddedCandidates.length === 0) return;
    onAddAllTools(unaddedCandidates);
    setAllAddedToast(true);
    setTimeout(() => setAllAddedToast(false), 3000);
  };

  return (
    <Surface
      variant="highlight"
      radius="lg"
      padding="lg"
      style={{
        border: '1px solid #c7d2fe',
        background: 'linear-gradient(135deg, #f5f3ff 0%, #eef2ff 50%, #f0fdf4 100%)',
        marginBottom: '20px'
      }}
    >
      {/* HEADER ROW */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
            flexShrink: 0
          }}>
            <Sparkles size={22} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e1b4b', fontFamily: "'Fredoka', sans-serif" }}>
                AI Tools Suggested from Your Assessment Prompts
              </h3>
              <Badge variant="purple" size="sm">
                Assessment Prompt Intelligence
              </Badge>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#4338ca', lineHeight: 1.5 }}>
              AIIMS analyzed your prompts from <strong>Challenge 11 (Software Architecture)</strong> and <strong>Challenge 12 (MVP Prototype)</strong> to identify and auto-provision the optimal AI toolkit for your workflow.
            </p>
          </div>
        </div>

        {/* BATCH ACTION & TOGGLE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {unaddedCandidates.length > 0 ? (
            <Button
              variant="primary"
              size="sm"
              icon={<Zap size={14} />}
              onClick={handleAddAll}
            >
              {allAddedToast ? '✓ All Added!' : `⚡ Auto-Add All (${unaddedCandidates.length}) to Wallet`}
            </Button>
          ) : (
            <Badge variant="success" size="sm" icon={<CheckCircle2 size={13} />}>
              All Recommended Tools in Wallet
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPrompts(!showPrompts)}
            icon={showPrompts ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          >
            {showPrompts ? 'Hide Prompts' : 'View Prompts'}
          </Button>
        </div>
      </div>

      {/* PROMPT EVIDENCE DRAWER */}
      {showPrompts && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '12px 16px',
          border: '1px solid #e0e7ff',
          marginBottom: '16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px'
        }}>
          {/* Challenge 11 Prompt */}
          <div style={{ fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#4338ca', marginBottom: '4px' }}>
              <FileCode size={14} /> Your Architecture Prompt (Challenge 11):
            </div>
            <div style={{
              backgroundColor: '#f8fafc',
              padding: '8px 10px',
              borderRadius: '6px',
              fontStyle: 'italic',
              color: '#334155',
              lineHeight: 1.45,
              border: '1px solid #f1f5f9'
            }}>
              "{insights.architecturePrompt.slice(0, 140)}
              {insights.architecturePrompt.length > 140 ? '...' : ''}"
            </div>
          </div>

          {/* Challenge 12 Prompt */}
          <div style={{ fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#059669', marginBottom: '4px' }}>
              <Terminal size={14} /> Your Prototype Prompt (Challenge 12):
            </div>
            <div style={{
              backgroundColor: '#f8fafc',
              padding: '8px 10px',
              borderRadius: '6px',
              fontStyle: 'italic',
              color: '#334155',
              lineHeight: 1.45,
              border: '1px solid #f1f5f9'
            }}>
              "{insights.prototypePrompt.slice(0, 140)}
              {insights.prototypePrompt.length > 140 ? '...' : ''}"
            </div>
          </div>
        </div>
      )}

      {/* SUGGESTED TOOLS CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
        {insights.suggestedTools.map((item) => {
          const isInWallet = userToolIdSet.has(item.toolId);
          const wasJustAdded = justAddedId === item.toolId;

          return (
            <div
              key={item.toolId}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '14px 16px',
                border: isInWallet ? '1.5px solid #a7f3d0' : '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease'
              }}
            >
              <div>
                {/* TOP META ROW */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                      {item.toolName}
                    </h4>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                      {item.provider} • {item.category}
                    </span>
                  </div>

                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#059669',
                    backgroundColor: '#ecfdf5',
                    padding: '2px 6px',
                    borderRadius: '6px'
                  }}>
                    {item.matchScore}% Match
                  </span>
                </div>

                {/* MATCH CONTEXT PILL */}
                <div style={{ marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: '#4338ca',
                    backgroundColor: '#eef2ff',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    {item.sourceChallengeTitle}
                  </span>
                </div>

                {/* REASON */}
                <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.45 }}>
                  {item.reason}
                </p>
              </div>

              {/* ACTION FOOTER */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                  {item.pricing}
                </span>

                {isInWallet ? (
                  <Badge variant="success" size="sm" icon={<Check size={12} />}>
                    {wasJustAdded ? 'Added to Wallet!' : 'In Wallet'}
                  </Badge>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus size={13} />}
                    onClick={() => handleAddSingle(item)}
                  >
                    + Add to Wallet
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Surface>
  );
};
