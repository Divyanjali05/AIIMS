import React, { useState } from 'react';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { apiClient } from '../../api/client';
import { RadarSignal } from '../../types';
import { Search, Send, CheckCircle2, ArrowRight, Database, UserCheck, MessageCircle, ShieldCheck } from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { MentorMessage } from '../../components/common/MentorMessage';

export const InvestigationScreen: React.FC<{ signal: RadarSignal | null; onComplete: () => void }> = ({ signal, onComplete }) => {
  const { investigateSignal } = useLearner();
  const [personalInterpretation, setPersonalInterpretation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const activeSignal = signal || {
    id: 'sig-1',
    title: 'Autonomous Tool-Calling Agents Shift Core Prompting Models',
    category: 'Model Release',
    summary: 'AI models can now interact directly with desktop OS environments and APIs via mouse, keyboard, and function execution loops.',
    scaffold: {
      yesterday: 'AI models responded purely via single-turn text/JSON prompts requiring human developers to coordinate every sub-step.',
      today: 'Models interpret visual screenshots, call tools dynamically, and execute native multi-step loops directly.',
      whatChanged: 'Shift from line-by-line manual prompting to goal specification with automated tool-execution loops.',
      whosAffected: 'Developers, product managers, workflow designers, and knowledge workers relying on recurring multi-step tasks.'
    }
  };

  const handleSubmit = async () => {
    if (!personalInterpretation.trim()) return;
    setIsSubmitting(true);
    await apiClient.submitInvestigation(activeSignal.id, personalInterpretation);
    investigateSignal(activeSignal.id, personalInterpretation);
    setIsSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div style={{ maxWidth: '940px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* PAGE HEADER */}
      <PageHeader
        icon={<Search size={24} />}
        title="Research Workspace — Technical Investigation"
        description="Multi-tiered evidence palette distinguishing Source Data (Blue), AIIMS Interpretation (Violet), and Learner Reflection (Green)."
        badge={{ label: 'Evidence Architecture', variant: 'cyan', icon: <Database size={12} /> }}
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

          {/* 1. SOURCE DATA (BLUE / SKY PALETTE) */}
          <Surface variant="sky" radius="lg" padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Badge variant="cyan" icon={<Database size={12} />}>SOURCE DATA (BLUE)</Badge>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', fontFamily: "'Fredoka', sans-serif" }}>
              {activeSignal.title}
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#075985', lineHeight: 1.5, fontWeight: 500 }}>
              {activeSignal.summary}
            </p>
          </Surface>

          {/* 2 & 3. YESTERDAY vs TODAY */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Surface variant="amber" radius="lg" padding="md">
              <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                YESTERDAY — WHAT WAS TRUE BEFORE?
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#78350f', lineHeight: 1.45, fontWeight: 500 }}>
                {activeSignal.scaffold.yesterday}
              </p>
            </Surface>

            <Surface variant="mint" radius="lg" padding="md">
              <div style={{ fontSize: '11px', color: '#047857', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                TODAY — WHAT IS TRUE NOW?
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#064e3b', lineHeight: 1.45, fontWeight: 500 }}>
                {activeSignal.scaffold.today}
              </p>
            </Surface>
          </div>

          {/* 4. AIIMS INTERPRETATION (VIOLET PALETTE) */}
          <Surface variant="violet" radius="lg" padding="lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Badge variant="purple" icon={<ShieldCheck size={12} />}>AIIMS SYSTEM INTERPRETATION (VIOLET)</Badge>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#6b21a8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '2px' }}>WHAT CHANGED?</div>
                <p style={{ margin: 0, fontSize: '13px', color: '#4c1d95', lineHeight: 1.45 }}>{activeSignal.scaffold.whatChanged}</p>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#6b21a8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '2px' }}>WHO'S AFFECTED?</div>
                <p style={{ margin: 0, fontSize: '13px', color: '#4c1d95', lineHeight: 1.45 }}>{activeSignal.scaffold.whosAffected}</p>
              </div>
            </div>
          </Surface>

          {/* MENTOR QUESTION */}
          <MentorMessage
            title="AIIMS MENTOR QUESTION TO DEEPEN YOUR THINKING"
            message={`"As tool-calling agents execute multi-turn steps autonomously, what verification checkpoint must you build into your workflow before accepting the agent's output?"`}
          />

          {/* 5. YOUR REFLECTION (GREEN PALETTE) */}
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
              placeholder="e.g. In my weekly status reporting workflow, I will delegate the initial draft to an agent tool, but set a mandatory human review step before distribution..."
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
