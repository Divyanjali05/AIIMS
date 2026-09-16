import React, { useState } from 'react';
import {
  Home,
  Compass,
  FileText,
  Radio,
  Coins,
  MessageSquare,
  BarChart3,
  Settings,
  ArrowRight,
  Sprout,
  Lock,
  Target,
  Sparkles
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { state } = useLearner();
  const [lockedModal, setLockedModal] = useState<{ title: string; message: string; targetTab: string } | null>(null);

  const isAssessmentDone = state.assessment.status === 'completed';
  const isAnalysisUnlocked = state.analysis.status !== 'locked';
  const isFocusUnlocked = state.focus.status !== 'locked';
  const isInvestigationUnlocked = state.investigation.status !== 'locked';
  const isRelevanceUnlocked = state.relevance.status !== 'locked';

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, locked: false },
    { id: 'journey', label: 'My Journey', icon: Compass, locked: false },
    { id: 'assessment', label: 'Assessment', icon: FileText, locked: false, badge: isAssessmentDone ? '✓ Done' : 'Start' },
    { id: 'analysis', label: 'Analysis', icon: BarChart3, locked: !isAnalysisUnlocked, lockMsg: 'Analysis unlocks after you complete your baseline assessment.' },
    { id: 'radar', label: 'AI Radar', icon: Radio, locked: false },
    { id: 'credits', label: 'My Credits', icon: Coins, locked: false },
    { id: 'mentor', label: 'Mentor', icon: MessageSquare, locked: false },
    { id: 'insights', label: 'Insights', icon: BarChart3, locked: !isAnalysisUnlocked, lockMsg: 'Insights unlock after your assessment profile is analyzed.' },
    { id: 'settings', label: 'Settings', icon: Settings, locked: false },
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.locked) {
      setLockedModal({
        title: `${item.label} is Locked`,
        message: item.lockMsg || 'Complete the preceding stage to unlock this module.',
        targetTab: 'assessment'
      });
      return;
    }
    setActiveTab(item.id);
  };

  return (
    <>
      <aside style={{
        width: '240px',
        minWidth: '240px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #eef2f6',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 16px',
        height: 'calc(100vh - 72px)',
        position: 'sticky',
        top: '72px',
        boxSizing: 'border-box'
      }}>
        {/* Navigation List */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  border: 'none',
                  cursor: item.locked ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 500,
                  width: '100%',
                  transition: 'all 0.2s ease',
                  background: isActive ? 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)' : 'transparent',
                  color: isActive ? '#ffffff' : item.locked ? '#94a3b8' : '#64748b',
                  boxShadow: isActive ? '0 8px 20px rgba(79, 70, 229, 0.25)' : 'none',
                  opacity: item.locked ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isActive && !item.locked) {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.color = '#1e293b';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive && !item.locked) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#64748b';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon style={{ width: '18px', height: '18px', color: isActive ? '#ffffff' : item.locked ? '#cbd5e1' : '#64748b' }} />
                  <span>{item.label}</span>
                </div>

                {item.locked ? (
                  <Lock style={{ width: '14px', height: '14px', color: '#cbd5e1' }} />
                ) : item.badge ? (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: isActive ? '#ffffff' : item.badge.includes('✓') ? '#dcfce7' : '#e0e7ff',
                    color: isActive ? '#4f46e5' : item.badge.includes('✓') ? '#15803d' : '#4f46e5'
                  }}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Bottom Promo Card */}
        <div style={{
          backgroundColor: '#f0fdf4',
          borderRadius: '20px',
          padding: '18px 16px',
          border: '1px solid #dcfce7',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)'
            }}>
              <Sprout style={{ color: '#10b981', width: '20px', height: '20px' }} />
            </div>
            <button
              onClick={() => setActiveTab('journey')}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#4f46e5',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)'
              }}
            >
              <ArrowRight style={{ color: '#ffffff', width: '14px', height: '14px' }} />
            </button>
          </div>

          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '13px',
            fontWeight: 700,
            color: '#166534',
            lineHeight: '1.4'
          }}>
            A more human future with AI
          </h4>

          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            color: '#15803d',
            letterSpacing: '0.5px',
            display: 'flex',
            gap: '6px',
            alignItems: 'center'
          }}>
            <span>PEOPLE</span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span>PURPOSE</span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span>PROGRESS</span>
          </div>
        </div>
      </aside>

      {/* Self-Explaining Locked State Modal */}
      {lockedModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '420px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <Lock style={{ width: '28px', height: '28px', color: '#d97706' }} />
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              {lockedModal.title}
            </h3>

            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
              {lockedModal.message}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setLockedModal(null)}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>

              <button
                onClick={() => {
                  setActiveTab(lockedModal.targetTab);
                  setLockedModal(null);
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)'
                }}
              >
                Complete Assessment →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
