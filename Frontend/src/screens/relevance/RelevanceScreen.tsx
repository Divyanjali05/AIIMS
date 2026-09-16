import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { apiClient } from '../../api/client';
import { AIRelevanceReport, RadarSignal } from '../../types';
import { HelpCircle, Sparkles, CheckCircle, RefreshCw } from 'lucide-react';

export const RelevanceScreen: React.FC<{ signal: RadarSignal | null }> = ({ signal }) => {
  const [report, setReport] = useState<AIRelevanceReport | null>(null);
  const [loading, setLoading] = useState(false);

  const activeSignalId = signal?.id || 'sig-1';

  const generateReport = async () => {
    setLoading(true);
    const data = await apiClient.generateRelevance(activeSignalId);
    setReport(data);
    setLoading(false);
  };

  useEffect(() => {
    generateReport();
  }, [activeSignalId]);

  return (
    <div style={{ maxWidth: '900px', margin: '32px auto', padding: '0 20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', backgroundColor: '#e0e7ff', borderRadius: '20px', color: '#3730a3', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
          <HelpCircle size={14} /> Stage 8: AI Relevance Engine
        </div>
        <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0', fontFamily: "'Outfit', sans-serif" }}>Why does this matter to me?</h2>
        <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
          Personalized Anthropic Claude analysis connecting signals directly with your AI Profile, Focus Areas, and Gaps.
        </p>
      </div>

      {loading ? (
        <Card style={{ textAlign: 'center', padding: '60px' }}>
          <RefreshCw className="spin" style={{ width: '40px', height: '40px', color: '#4f46e5', margin: '0 auto 16px', animation: 'spin 1.5s linear infinite' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>Generating Claude AI Personalization...</h3>
        </Card>
      ) : report ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Impact Score Banner */}
          <Card style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #e0f2fe 100%)', border: '1px solid #c7d2fe' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: 700, textTransform: 'uppercase' }}>Personal Impact Score</span>
                <div style={{ fontSize: '44px', fontWeight: 800, color: '#0f172a', marginTop: '4px', fontFamily: "'Outfit', sans-serif" }}>
                  {report.relevanceScore}% <span style={{ fontSize: '16px', color: '#059669', fontWeight: 700 }}>High Relevance</span>
                </div>
              </div>
              <Sparkles style={{ width: '56px', height: '56px', color: '#4f46e5', opacity: 0.8 }} />
            </div>
          </Card>

          {/* Custom Narrative */}
          <Card>
            <div style={{ fontSize: '13px', color: '#6b21a8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Sparkles size={16} /> Personal Relevance Synthesis
            </div>
            <p style={{ margin: 0, fontSize: '15px', color: '#1e293b', lineHeight: 1.6 }}>{report.whyItMatters}</p>
          </Card>

          {/* Actionable Next Step */}
          <Card style={{ borderLeft: '4px solid #059669', backgroundColor: '#ecfdf5' }}>
            <div style={{ fontSize: '13px', color: '#047857', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <CheckCircle size={16} /> Recommended Immediate Next Step
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: '#064e3b', lineHeight: 1.5, fontWeight: 500 }}>{report.actionableTakeaway}</p>
          </Card>
        </div>
      ) : null}
    </div>
  );
};
