import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { apiClient } from '../../api/client';
import { RadarSignal } from '../../types';
import { Layers, Send, CheckCircle2, ArrowRight } from 'lucide-react';

export const InvestigationScreen: React.FC<{ signal: RadarSignal | null; onComplete: () => void }> = ({ signal, onComplete }) => {
  const [personalInterpretation, setPersonalInterpretation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const activeSignal = signal || {
    id: 'sig-1',
    title: 'Claude 3.5 Sonnet & Computer Use Capability',
    category: 'Model Release',
    summary: 'AI models can now interact directly with desktop OS environments via mouse and keyboard emulation.',
    scaffold: {
      yesterday: 'AI models responded purely via text/JSON APIs requiring human developers to bind tools.',
      today: 'Models interpret visual screenshots and execute native GUI actions directly.',
      whatChanged: 'Shift from text-only APIs to direct GUI interaction loops.',
      whosAffected: 'QA Automation Engineers, Software Developers, Workflow Automation Specialists.'
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await apiClient.submitInvestigation(activeSignal.id, personalInterpretation);
    setIsSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '32px auto', padding: '0 20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', backgroundColor: '#f3e8ff', border: '1px solid #e9d5ff', borderRadius: '20px', color: '#6b21a8', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
          <Layers size={14} /> Stage 7: Signal Investigation Framework
        </div>
        <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0', fontFamily: "'Outfit', sans-serif" }}>Investigating: {activeSignal.title}</h2>
        <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
          Work through the 4-part framework and submit your personal reflection to earn +30 AIIMS Credits.
        </p>
      </div>

      {submitted ? (
        <Card style={{ textAlign: 'center', padding: '48px 36px' }}>
          <CheckCircle2 style={{ width: '56px', height: '56px', color: '#059669', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px', color: '#0f172a' }}>Investigation Completed!</h3>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>+30 AIIMS Credits added to your persistent account balance.</p>

          <button
            onClick={onComplete}
            style={{
              padding: '14px 32px',
              borderRadius: '12px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '15px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 20px rgba(79, 70, 229, 0.3)'
            }}
          >
            Calculate Personal AI Relevance <ArrowRight size={16} />
          </button>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 4-Step Scaffold Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Card style={{ borderLeft: '4px solid #d97706' }}>
              <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 800, marginBottom: '6px' }}>1. YESTERDAY</div>
              <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>{activeSignal.scaffold.yesterday}</p>
            </Card>

            <Card style={{ borderLeft: '4px solid #059669' }}>
              <div style={{ fontSize: '12px', color: '#047857', fontWeight: 800, marginBottom: '6px' }}>2. TODAY</div>
              <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>{activeSignal.scaffold.today}</p>
            </Card>

            <Card style={{ borderLeft: '4px solid #4f46e5' }}>
              <div style={{ fontSize: '12px', color: '#4338ca', fontWeight: 800, marginBottom: '6px' }}>3. WHAT CHANGED?</div>
              <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>{activeSignal.scaffold.whatChanged}</p>
            </Card>

            <Card style={{ borderLeft: '4px solid #7c3aed' }}>
              <div style={{ fontSize: '12px', color: '#6b21a8', fontWeight: 800, marginBottom: '6px' }}>4. WHO'S AFFECTED?</div>
              <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>{activeSignal.scaffold.whosAffected}</p>
            </Card>
          </div>

          {/* Learner Personal Reflection Form */}
          <Card>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginTop: 0, marginBottom: '12px', color: '#0f172a' }}>Your Personal Reflection & Interpretation</h3>
            <textarea
              rows={4}
              value={personalInterpretation}
              onChange={(e) => setPersonalInterpretation(e.target.value)}
              placeholder="How will this signal change your daily workflow, target skills, or project architecture?"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '16px',
                color: '#0f172a',
                fontSize: '14px',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                outline: 'none',
                resize: 'vertical'
              }}
            />

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !personalInterpretation.trim()}
              style={{
                marginTop: '16px',
                padding: '14px',
                width: '100%',
                borderRadius: '12px',
                backgroundColor: isSubmitting || !personalInterpretation.trim() ? '#cbd5e1' : '#7c3aed',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '15px',
                cursor: isSubmitting || !personalInterpretation.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.25)'
              }}
            >
              <Send size={18} /> {isSubmitting ? 'Recording Investigation...' : 'Submit Investigation (+30 Credits)'}
            </button>
          </Card>
        </div>
      )}
    </div>
  );
};
