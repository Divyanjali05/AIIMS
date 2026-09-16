import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { apiClient } from '../../api/client';
import { RadarSignal } from '../../types';
import { Radio, Bookmark, ArrowRight } from 'lucide-react';

export const RadarScreen: React.FC<{ onInvestigate: (signal: RadarSignal) => void }> = ({ onInvestigate }) => {
  const [signals, setSignals] = useState<RadarSignal[]>([]);

  const fetchSignals = async () => {
    const data = await apiClient.getRadarSignals();
    setSignals(data);
  };

  useEffect(() => {
    fetchSignals();
  }, []);

  const handleToggleFollow = async (id: string) => {
    await apiClient.toggleFollowSignal(id);
    fetchSignals();
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '32px auto', padding: '0 20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', backgroundColor: '#e0f2fe', borderRadius: '20px', color: '#0369a1', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
          <Radio size={14} /> Stage 6: AI Opportunity Radar
        </div>
        <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0', fontFamily: "'Outfit', sans-serif" }}>Real-time AI Change Feed</h2>
        <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
          Continuous feed of significant technical shifts, new workflows, model releases, and emerging roles.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {signals.map((sig) => (
          <Card key={sig.id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  backgroundColor: '#e0e7ff',
                  color: '#3730a3',
                  fontWeight: 700
                }}>
                  {sig.category}
                </span>

                <button
                  onClick={() => handleToggleFollow(sig.id)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: sig.isFollowed ? '#059669' : '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 700
                  }}
                >
                  <Bookmark size={16} fill={sig.isFollowed ? '#059669' : 'none'} />
                  {sig.isFollowed ? 'Following' : 'Follow'}
                </button>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>{sig.title}</h3>
              <p style={{ fontSize: '14px', color: '#475569', margin: '0 0 16px', lineHeight: 1.5 }}>{sig.summary}</p>

              {/* Scaffold Snapshot */}
              <div style={{ padding: '14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px', color: '#334155', marginBottom: '20px' }}>
                <div style={{ color: '#0284c7', fontWeight: 700, marginBottom: '4px' }}>Yesterday vs. Today Shift:</div>
                <div><b>Yesterday:</b> {sig.scaffold.yesterday}</div>
                <div style={{ marginTop: '4px' }}><b>Today:</b> {sig.scaffold.today}</div>
              </div>
            </div>

            <button
              onClick={() => onInvestigate(sig)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)'
              }}
            >
              Start Investigation (+30 Credits) <ArrowRight size={16} />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
};
