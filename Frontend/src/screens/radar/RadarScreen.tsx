import React, { useState, useEffect } from 'react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { SignalDataProvider } from '../../services/signalDataProvider';
import { RadarSignal } from '../../types';
import { Radar, Bookmark, ArrowRight, Target, Sparkles, ShieldCheck, Database, Layers } from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';

export const RadarScreen: React.FC<{ onInvestigate: (signal: RadarSignal) => void }> = ({ onInvestigate }) => {
  const { state } = useLearner();
  const [signals, setSignals] = useState<RadarSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const activeFocus = state.focus.selectedTrack || 'AI Workflow Design';

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
  }, []);

  const handleToggleFollow = async (id: string) => {
    await SignalDataProvider.toggleFollowSignal(id);
    fetchSignals();
  };

  const featuredSignal = signals.length > 0 ? signals[0] : null;
  const secondarySignals = signals.length > 1 ? signals.slice(1) : [];

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* HEADER */}
      <PageHeader
        icon={<Radar size={24} />}
        title="AI Radar — Discovery Feed"
        description="A distinct cyan/blue technical discovery feed of model releases, tool-calling shifts, and emerging patterns."
        badge={{ label: `Connected Focus: ${activeFocus}`, variant: 'cyan', icon: <Target size={12} /> }}
      />

      {/* FEATURED HERO SIGNAL (CYAN/BLUE ATMOSPHERIC FIELD) */}
      {featuredSignal && (
        <Surface variant="gradient-radar" radius="lg" padding="lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge variant="purple">{featuredSignal.category}</Badge>
              <Badge variant="cyan" icon={<Database size={12} />}>
                {featuredSignal.source || 'ArXiv Technical Feed'}
              </Badge>
            </div>

            <button
              onClick={() => handleToggleFollow(featuredSignal.id)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: featuredSignal.isFollowed ? '#059669' : '#0369a1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              <Bookmark size={14} fill={featuredSignal.isFollowed ? '#059669' : 'none'} />
              {featuredSignal.isFollowed ? 'Following' : 'Follow Signal'}
            </button>
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px', color: '#0f172a', fontFamily: "'Fredoka', sans-serif" }}>
            {featuredSignal.title}
          </h2>

          <p style={{ fontSize: '15px', color: '#334155', margin: '0 0 16px', lineHeight: 1.5, fontWeight: 500 }}>
            {featuredSignal.summary}
          </p>

          <div style={{
            padding: '14px 16px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #bae6fd',
            marginBottom: '20px',
            fontSize: '13px',
            color: '#0369a1'
          }}>
            <strong>Why you're seeing this: </strong>
            Connected to your current focus in <strong>{activeFocus}</strong>.
          </div>

          {/* Shift Scaffold Preview */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div style={{ padding: '12px 14px', backgroundColor: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a', fontSize: '12px' }}>
              <span style={{ color: '#b45309', fontWeight: 800, textTransform: 'uppercase', fontSize: '10px' }}>YESTERDAY</span>
              <p style={{ margin: '4px 0 0', color: '#78350f', lineHeight: 1.4, fontWeight: 500 }}>{featuredSignal.scaffold.yesterday}</p>
            </div>

            <div style={{ padding: '12px 14px', backgroundColor: '#ecfdf5', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '12px' }}>
              <span style={{ color: '#047857', fontWeight: 800, textTransform: 'uppercase', fontSize: '10px' }}>TODAY</span>
              <p style={{ margin: '4px 0 0', color: '#064e3b', lineHeight: 1.4, fontWeight: 500 }}>{featuredSignal.scaffold.today}</p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              variant="cyan"
              size="lg"
              icon={<ArrowRight size={16} />}
              onClick={() => onInvestigate(featuredSignal)}
            >
              Start Investigation (+30 Credits)
            </Button>

            <span style={{ fontSize: '12px', color: '#0369a1', fontWeight: 600 }}>
              {featuredSignal.dateTime || 'September 2026'}
            </span>
          </div>
        </Surface>
      )}

      {/* MORE AI CHANGES SECTION (CYAN TILES GRID) */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px', fontFamily: "'Fredoka', sans-serif" }}>
          More AI Changes
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {secondarySignals.map((sig) => (
            <Surface
              key={sig.id}
              variant="cyan"
              radius="lg"
              padding="md"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <Badge variant="purple">{sig.category}</Badge>

                  <button
                    onClick={() => handleToggleFollow(sig.id)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: sig.isFollowed ? '#059669' : '#0369a1',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: 700
                    }}
                  >
                    <Bookmark size={14} fill={sig.isFollowed ? '#059669' : 'none'} />
                    {sig.isFollowed ? 'Following' : 'Follow'}
                  </button>
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px', color: '#0f172a' }}>
                  {sig.title}
                </h3>

                <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 14px', lineHeight: 1.45 }}>
                  {sig.summary}
                </p>

                <div style={{ padding: '10px', backgroundColor: '#ffffff', border: '1px solid #bae6fd', borderRadius: '8px', fontSize: '12px', color: '#0369a1', marginBottom: '16px' }}>
                  <strong>Today: </strong>
                  {sig.scaffold.today}
                </div>
              </div>

              <Button
                variant="cyan"
                size="md"
                fullWidth
                icon={<ArrowRight size={14} />}
                onClick={() => onInvestigate(sig)}
              >
                Start Investigation (+30 Credits)
              </Button>
            </Surface>
          ))}
        </div>
      </div>

    </div>
  );
};
