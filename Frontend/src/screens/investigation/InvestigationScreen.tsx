import React, { useState } from 'react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { apiClient } from '../../api/client';
import { RadarSignal } from '../../types';
import {
  Search,
  Send,
  CheckCircle2,
  ArrowRight,
  Database,
  UserCheck,
  ShieldCheck,
  HelpCircle,
  Users,
  Zap,
  Plus,
  ArrowRightLeft,
  ExternalLink
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { MentorMessage } from '../../components/common/MentorMessage';
import { trackLearningLoopEvent } from '../../services/learningLoop';

interface InvestigationScreenProps {
  signal: RadarSignal | null;
  onComplete: () => void;
  onNavigateTab?: (tab: string, metadata?: any) => void;
}

export const InvestigationScreen: React.FC<InvestigationScreenProps> = ({
  signal,
  onComplete,
  onNavigateTab
}) => {
  const { investigateSignal, addToolToWallet, state } = useLearner();
  const [personalInterpretation, setPersonalInterpretation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const activeSignal: RadarSignal = signal || {
    id: 'sig-1',
    title: 'Claude 3.5 Sonnet & Computer Use OS Automation',
    category: 'Agentic AI',
    impactLevel: 'Critical',
    publishedAt: 'September 2026',
    source: 'Anthropic Technical Release Bulletin',
    summary: 'AI models can now interact directly with desktop OS environments via mouse and keyboard emulation loops.',
    capabilities: ['Visual Screenshot Grounding', 'OS GUI Control', 'Multi-step Desktop Navigation'],
    affectedDomains: ['QA Engineering', 'Workflow Automation', 'Software Development'],
    recommendedTasks: ['Automated desktop GUI testing', 'Cross-application workflow execution'],
    relatedTools: ['tool-claude', 'tool-make'],
    investigationAvailable: true,
    tags: ['agentic-ai', 'computer-use'],
    active: true,
    scaffold: {
      yesterday: 'AI models responded purely via single-turn text/JSON prompts requiring human developers to bind custom tool handlers.',
      today: 'Models interpret visual screenshots, call tools dynamically, and execute native multi-step desktop GUI actions directly.',
      whatChanged: 'Shift from text-only APIs to direct GUI interaction loops.',
      whosAffected: 'Developers, product managers, workflow designers, and QA engineers.'
    }
  };

  const handleSubmit = async () => {
    if (!personalInterpretation.trim()) return;
    setIsSubmitting(true);
    await apiClient.submitInvestigation(activeSignal.id, personalInterpretation);
    investigateSignal(activeSignal.id, personalInterpretation);
    trackLearningLoopEvent({
      eventType: 'INVESTIGATION_COMPLETED',
      signalId: activeSignal.id,
      metadata: { reflectionLength: personalInterpretation.length }
    });
    setIsSubmitting(false);
    setSubmitted(true);
  };

  const relatedToolId = activeSignal.relatedTools && activeSignal.relatedTools.length > 0 ? activeSignal.relatedTools[0] : 'tool-claude';
  const isToolInWallet = (state.aiWallet?.userTools || []).some((t) => t.toolId === relatedToolId);

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* PAGE HEADER */}
      <PageHeader
        icon={<Search size={24} />}
        title="Research Workspace — Technical Investigation"
        description="Deep dive analysis answering What Changed, Why It Matters, Who Should Care, and What You Can Do."
        badge={{ label: activeSignal.category, variant: 'cyan', icon: <Database size={12} /> }}
      />

      {submitted ? (
        <Surface variant="mint" radius="lg" padding="lg" style={{ textAlign: 'center' }}>
          <CheckCircle2 style={{ width: '48px', height: '48px', color: '#059669', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px', color: '#0f172a', fontFamily: "'Fredoka', sans-serif" }}>
            Investigation Completed!
          </h3>
          <p style={{ color: '#064e3b', marginBottom: '20px', fontSize: '14px' }}>
            +30 AIIMS Credits added to your balance. Your personal reflection has been recorded into LearnerState.
          </p>

          <Button
            variant="green"
            size="lg"
            icon={<ArrowRight size={16} />}
            onClick={onComplete}
          >
            Calculate Personal AI Relevance →
          </Button>
        </Surface>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* 1. SOURCE DATA BANNER */}
          <Surface variant="sky" radius="lg" padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Badge variant="cyan" icon={<Database size={12} />}>
                SOURCE: {activeSignal.source || 'Technical AI Feed'}
              </Badge>
              <Badge variant="purple" size="sm">{activeSignal.impactLevel} Impact</Badge>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: "'Fredoka', sans-serif" }}>
              {activeSignal.title}
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#075985', lineHeight: 1.5, fontWeight: 500 }}>
              {activeSignal.summary}
            </p>
          </Surface>

          {/* 4 CORE QUESTIONS GRID */}

          {/* Q1: WHAT CHANGED? */}
          <Surface variant="violet" radius="lg" padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Badge variant="purple" icon={<ShieldCheck size={12} />}>1. WHAT CHANGED?</Badge>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1e1b4b', margin: '0 0 10px' }}>
              {activeSignal.scaffold.whatChanged}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>YESTERDAY</span>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>{activeSignal.scaffold.yesterday}</p>
              </div>

              <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>TODAY</span>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>{activeSignal.scaffold.today}</p>
              </div>
            </div>
          </Surface>

          {/* Q2: WHY DOES IT MATTER? */}
          <Surface variant="amber" radius="lg" padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Badge variant="warning" icon={<Zap size={12} />}>2. WHY DOES IT MATTER?</Badge>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#78350f', margin: '0 0 8px' }}>
              Practical Engineering & Capability Impact
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#92400e', lineHeight: 1.5 }}>
              This shift changes how technical tasks are structured. Instead of writing rigid procedural code or manual step-by-step prompts, professionals specify goals and build verification rails for automated tool loops.
            </p>

            {activeSignal.capabilities && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {activeSignal.capabilities.map((cap, i) => (
                  <span key={i} style={{ fontSize: '11px', backgroundColor: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                    ⚡ {cap}
                  </span>
                ))}
              </div>
            )}
          </Surface>

          {/* Q3: WHO SHOULD CARE? */}
          <Surface variant="sky" radius="lg" padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Badge variant="cyan" icon={<Users size={12} />}>3. WHO SHOULD CARE?</Badge>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0369a1', margin: '0 0 6px' }}>
              Target Roles & Domains Affected
            </h3>
            <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#075985', lineHeight: 1.45 }}>
              {activeSignal.scaffold.whosAffected}
            </p>

            {activeSignal.affectedDomains && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {activeSignal.affectedDomains.map((dom, i) => (
                  <span key={i} style={{ fontSize: '11px', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                    🎯 {dom}
                  </span>
                ))}
              </div>
            )}
          </Surface>

          {/* Q4: WHAT CAN I DO? (ACTION PALETTE) */}
          <Surface variant="bordered" radius="lg" padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Badge variant="primary" icon={<HelpCircle size={12} />}>4. WHAT CAN I DO NEXT?</Badge>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>
              Actionable Pathways in AIIMS
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              <Button
                variant="primary"
                size="sm"
                icon={isToolInWallet ? <CheckCircle2 size={13} /> : <Plus size={13} />}
                disabled={isToolInWallet}
                onClick={() => {
                  addToolToWallet(relatedToolId, 'Reasoning & Writing', 'exploring');
                  trackLearningLoopEvent({
                    eventType: 'TOOL_ADDED',
                    toolId: relatedToolId,
                    metadata: { sourceSignalId: activeSignal.id }
                  });
                }}
              >
                {isToolInWallet ? 'Tool in Wallet' : 'Add Related Tool to Wallet'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                icon={<ArrowRightLeft size={13} />}
                onClick={() => {
                  if (onNavigateTab) onNavigateTab('wallet');
                  trackLearningLoopEvent({
                    eventType: 'TOOLS_COMPARED',
                    toolId: relatedToolId,
                    metadata: { sourceSignalId: activeSignal.id }
                  });
                }}
              >
                Compare Related Tools
              </Button>

              <Button
                variant="ghost"
                size="sm"
                icon={<ExternalLink size={13} />}
                onClick={() => {
                  if (onNavigateTab) onNavigateTab('wallet');
                }}
              >
                Explore Wallet Toolkit
              </Button>
            </div>
          </Surface>

          {/* MENTOR DEEPENING QUESTION */}
          <MentorMessage
            title="AIIMS MENTOR QUESTION TO DEEPEN YOUR THINKING"
            message={`"As automated tools execute multi-turn steps autonomously, what verification checkpoint must you build into your workflow before accepting output?"`}
          />

          {/* 5. YOUR REFLECTION */}
          <Surface variant="mint" radius="lg" padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Badge variant="success" icon={<UserCheck size={12} />}>YOUR REFLECTION (GREEN)</Badge>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 10px', color: '#0f172a' }}>
              Record your personal investigation reflection & conclusion
            </h3>

            <textarea
              rows={4}
              value={personalInterpretation}
              onChange={(e) => setPersonalInterpretation(e.target.value)}
              placeholder="e.g. In my weekly status reporting workflow, I will delegate initial drafting to an agent, but enforce a human review verification step..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                border: '1px solid #a7f3d0',
                borderRadius: '10px',
                padding: '12px',
                color: '#0f172a',
                fontSize: '13px',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                outline: 'none',
                marginBottom: '16px'
              }}
            />

            <Button
              variant="green"
              size="lg"
              fullWidth
              icon={<Send size={16} />}
              disabled={isSubmitting || !personalInterpretation.trim()}
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Recording Investigation...' : 'Complete Investigation (+30 Credits)'}
            </Button>
          </Surface>

        </div>
      )}
    </div>
  );
};
