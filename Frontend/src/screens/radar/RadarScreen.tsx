import React, { useState, useEffect } from 'react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { SignalDataProvider } from '../../services/signalDataProvider';
import { RadarSignal } from '../../types';
import {
  Radar,
  Bookmark,
  ArrowRight,
  Target,
  Sparkles,
  AlertCircle,
  Database,
  Layers,
  Search,
  Code,
  Compass,
  Cpu,
  BookmarkCheck,
  CheckCircle2
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { evaluateSignalRelevance } from '../../services/relevanceEngine';
import { buildLearnerProfileContext } from '../../services/learnerProfileContext';
import { trackLearningLoopEvent } from '../../services/learningLoop';

interface RadarScreenProps {
  onInvestigate: (signal: RadarSignal) => void;
}

export const RadarScreen: React.FC<RadarScreenProps> = ({ onInvestigate }) => {
  const { state, toggleSaveSignal, dismissSignal } = useLearner();
  const [signals, setSignals] = useState<RadarSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDomainFilter, setActiveDomainFilter] = useState<string | null>(null);

  const profileCtx = buildLearnerProfileContext(state);
  const activeFocus = state.focus.selectedTrack || state.analysis.growthArea || 'AI Workflow Design';
  const savedIds = new Set(state.radar.savedSignalIds || []);
  const dismissedIds = new Set(state.radar.dismissedSignalIds || []);
  const investigatedIds = new Set(state.radar.investigatedSignalIds || []);

  const fetchSignals = async () => {
    setLoading(true);
    try {
      const data = await SignalDataProvider.getSignals();
      setSignals(data);
    } catch (e) {
      console.error('Failed to load signals from SignalDataProvider', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    trackLearningLoopEvent({
      eventType: 'RADAR_VIEWED',
      metadata: { focusTrack: activeFocus }
    });
  }, []);

  // Filter out dismissed signals
  const activeSignals = signals.filter((s) => !dismissedIds.has(s.id));

  // Determine Hero Signal "For You" (highest relevance score for learner context)
  const evaluatedSignals = activeSignals.map((sig) => {
    const rel = evaluateSignalRelevance(sig, profileCtx);
    return { signal: sig, relevance: rel };
  });

  // Sort by relevance score descending
  evaluatedSignals.sort((a, b) => b.relevance.relevanceScore - a.relevance.relevanceScore);

  const forYouItem = evaluatedSignals.length > 0 ? evaluatedSignals[0] : null;
  const whatsNewItems = activeSignals.filter(
    (s) => (!forYouItem || s.id !== forYouItem.signal.id) &&
           (!activeDomainFilter || s.category.toLowerCase().includes(activeDomainFilter.toLowerCase()) || (s.tags && s.tags.some(t => t.toLowerCase().includes(activeDomainFilter.toLowerCase()))))
  );
  const savedSignals = activeSignals.filter((s) => savedIds.has(s.id));

  const trendingDomains = [
    { name: 'Agentic Coding', icon: Code, filterKey: 'Coding', desc: 'Autonomous diffs & multi-file agents' },
    { name: 'Research AI', icon: Compass, filterKey: 'Research', desc: 'Live web citation & RAG synthesis' },
    { name: 'Computer Use', icon: Cpu, filterKey: 'Agentic', desc: 'OS desktop GUI interaction loops' },
    { name: 'AI Automation', icon: Layers, filterKey: 'Automation', desc: 'No-code visual agent node pipelines' },
    { name: 'Multimodal Creation', icon: Sparkles, filterKey: 'Multimodal', desc: '2M context video & audio ingestion' }
  ];

  const getImpactBadgeVariant = (impact: string) => {
    switch (impact) {
      case 'Critical':
        return 'purple';
      case 'High':
        return 'warning';
      case 'Medium':
      default:
        return 'cyan';
    }
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* HEADER */}
      <PageHeader
        icon={<Radar style={{ width: '24px', height: '24px', color: '#0284c7' }} />}
        title="AI Radar — Ecosystem Shifts & Intelligence Feed"
        description="Detect emerging AI capabilities, understand technical shifts, evaluate relevance for your profile, and investigate actionable tools."
        badge={{ label: `Connected Focus: ${activeFocus}`, variant: 'cyan', icon: <Target size={12} /> }}
      />

      {/* ========================================================================= */}
      {/* SECTION 2: FOR YOU (HERO SECTION) */}
      {/* ========================================================================= */}
      {forYouItem && (
        <Surface variant="gradient-radar" radius="lg" padding="lg" style={{ borderLeft: '6px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Badge variant="warning" icon={<AlertCircle size={12} />}>
                🚨 WORTH YOUR ATTENTION
              </Badge>
              <Badge variant={getImpactBadgeVariant(forYouItem.signal.impactLevel || 'Medium')}>
                {forYouItem.signal.category} • {forYouItem.signal.impactLevel || 'Medium'} Impact
              </Badge>
              <Badge variant="cyan" icon={<Database size={12} />}>
                {forYouItem.signal.source}
              </Badge>
            </div>

            <button
              onClick={() => {
                toggleSaveSignal(forYouItem.signal.id);
                trackLearningLoopEvent({
                  eventType: 'SIGNAL_SAVED',
                  signalId: forYouItem.signal.id
                });
              }}
              style={{
                backgroundColor: savedIds.has(forYouItem.signal.id) ? '#ecfdf5' : '#ffffff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                padding: '6px 12px',
                color: savedIds.has(forYouItem.signal.id) ? '#047857' : '#0369a1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              <Bookmark size={14} fill={savedIds.has(forYouItem.signal.id) ? '#047857' : 'none'} />
              {savedIds.has(forYouItem.signal.id) ? 'Saved' : 'Save Signal'}
            </button>
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 12px', color: '#0f172a', fontFamily: "'Fredoka', sans-serif" }}>
            {forYouItem.signal.title}
          </h2>

          {/* 5-STEP STRUCTURED OPPORTUNITY CARD FOR UX 5-SECOND TEST */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '12px 14px', border: '1px solid #bae6fd' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>1. WHAT CHANGED?</span>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#334155', lineHeight: 1.4, fontWeight: 600 }}>
                {forYouItem.signal.scaffold.whatChanged || forYouItem.signal.summary}
              </p>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '12px 14px', border: '1px solid #bae6fd' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>2. WHY IT MATTERS</span>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#334155', lineHeight: 1.4, fontWeight: 600 }}>
                {forYouItem.signal.scaffold.today || 'Enables automated execution loops.'}
              </p>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '12px 14px', border: '1px solid #a7f3d0' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>3. OPPORTUNITY FOR YOU</span>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#064e3b', lineHeight: 1.4, fontWeight: 700 }}>
                {forYouItem.relevance.personalConnection}
              </p>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '12px 14px', border: '1px solid #c7d2fe' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase' }}>4. WHY YOU'RE SEEING THIS</span>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#3730a3', lineHeight: 1.4, fontWeight: 700, fontStyle: 'italic' }}>
                "{forYouItem.relevance.attributionReason}"
              </p>
            </div>

          </div>

          {/* 5. WHAT CAN YOU DO NEXT? (ACTION BAR) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Button
                variant="cyan"
                size="md"
                icon={<ArrowRight size={16} />}
                onClick={() => {
                  onInvestigate(forYouItem.signal);
                  trackLearningLoopEvent({
                    eventType: 'INVESTIGATION_OPENED',
                    signalId: forYouItem.signal.id
                  });
                }}
              >
                Investigate Opportunity (+30 Credits)
              </Button>

              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  toggleSaveSignal(forYouItem.signal.id);
                  trackLearningLoopEvent({
                    eventType: 'SIGNAL_SAVED',
                    signalId: forYouItem.signal.id
                  });
                }}
              >
                {savedIds.has(forYouItem.signal.id) ? 'Saved' : 'Save Opportunity'}
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                dismissSignal(forYouItem.signal.id);
                trackLearningLoopEvent({
                  eventType: 'RECOMMENDATION_DISMISSED',
                  signalId: forYouItem.signal.id
                });
              }}
              style={{ color: '#94a3b8' }}
            >
              Maybe Later
            </Button>
          </div>
        </Surface>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: TRENDING DOMAINS */}
      {/* ========================================================================= */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: "'Fredoka', sans-serif" }}>
            🔥 Trending AI Domains
          </h2>
          {activeDomainFilter && (
            <button
              onClick={() => setActiveDomainFilter(null)}
              style={{ border: 'none', background: 'transparent', color: '#0284c7', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              Clear Filter ({activeDomainFilter}) ✕
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {trendingDomains.map((dom) => {
            const Icon = dom.icon;
            const isSelected = activeDomainFilter === dom.filterKey;
            return (
              <Surface
                key={dom.name}
                variant={isSelected ? 'sky' : 'bordered'}
                radius="lg"
                padding="md"
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0'
                }}
                onClick={() => setActiveDomainFilter(isSelected ? null : dom.filterKey)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: isSelected ? '#0284c7' : '#e0f2fe', color: isSelected ? '#ffffff' : '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={14} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                    {dom.name}
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                  {dom.desc}
                </p>
              </Surface>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: WHAT'S NEW */}
      {/* ========================================================================= */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px', fontFamily: "'Fredoka', sans-serif" }}>
          📡 What's New in AI {activeDomainFilter ? `(${activeDomainFilter})` : ''}
        </h2>

        {whatsNewItems.length === 0 ? (
          <Surface variant="bordered" radius="lg" padding="lg" style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              No active developments matching this filter.
            </p>
          </Surface>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {whatsNewItems.map((sig) => {
              const isInvestigated = investigatedIds.has(sig.id);
              const isSaved = savedIds.has(sig.id);

              return (
                <Surface
                  key={sig.id}
                  variant="cyan"
                  radius="lg"
                  padding="md"
                  style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Badge variant="purple" size="sm">{sig.category}</Badge>
                        <Badge variant={getImpactBadgeVariant(sig.impactLevel || 'Medium')} size="sm">{sig.impactLevel || 'Medium'}</Badge>
                      </div>

                      <button
                        onClick={() => {
                          toggleSaveSignal(sig.id);
                          trackLearningLoopEvent({
                            eventType: 'SIGNAL_SAVED',
                            signalId: sig.id
                          });
                        }}
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: isSaved ? '#059669' : '#0369a1',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 700
                        }}
                      >
                        <Bookmark size={13} fill={isSaved ? '#059669' : 'none'} />
                        {isSaved ? 'Saved' : 'Save'}
                      </button>
                    </div>

                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
                      {sig.title}
                    </h3>

                    <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 12px', lineHeight: 1.45 }}>
                      {sig.summary}
                    </p>

                    <div style={{ padding: '8px 10px', backgroundColor: '#ffffff', border: '1px solid #bae6fd', borderRadius: '8px', fontSize: '11px', color: '#0369a1' }}>
                      <strong>Today: </strong>{sig.scaffold.today}
                    </div>
                  </div>

                  <Button
                    variant={isInvestigated ? 'green' : 'cyan'}
                    size="md"
                    fullWidth
                    icon={isInvestigated ? <CheckCircle2 size={14} /> : <ArrowRight size={14} />}
                    onClick={() => {
                      onInvestigate(sig);
                      trackLearningLoopEvent({
                        eventType: 'INVESTIGATION_OPENED',
                        signalId: sig.id
                      });
                    }}
                  >
                    {isInvestigated ? 'Revisit Investigation' : 'Investigate (+30 Credits)'}
                  </Button>
                </Surface>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: SAVED SIGNALS */}
      {/* ========================================================================= */}
      {savedSignals.length > 0 && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px', fontFamily: "'Fredoka', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookmarkCheck size={18} style={{ color: '#059669' }} />
            <span>Saved Signals ({savedSignals.length})</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            {savedSignals.map((sig) => (
              <Surface key={sig.id} variant="mint" radius="lg" padding="md" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <Badge variant="success" size="sm">{sig.category}</Badge>
                    <button
                      onClick={() => toggleSaveSignal(sig.id)}
                      style={{ border: 'none', background: 'transparent', color: '#059669', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Remove ✕
                    </button>
                  </div>

                  <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    {sig.title}
                  </h3>

                  <p style={{ margin: 0, fontSize: '12px', color: '#064e3b', lineHeight: 1.4 }}>
                    {sig.summary}
                  </p>
                </div>

                <Button
                  variant="green"
                  size="sm"
                  icon={<ArrowRight size={13} />}
                  onClick={() => onInvestigate(sig)}
                >
                  Open Investigation
                </Button>
              </Surface>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
