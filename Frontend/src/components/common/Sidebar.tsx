import React, { useState } from 'react';
import {
  Home,
  Route,
  ClipboardCheck,
  BarChart3,
  Lightbulb,
  Target,
  Radar,
  Search,
  Sparkles,
  Coins,
  MessageCircle,
  Settings,
  Lock,
  Wallet
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  locked: boolean;
  badge?: string;
  lockMsg?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { state } = useLearner();
  const [lockedModal, setLockedModal] = useState<{ title: string; message: string; targetTab: string } | null>(null);

  const isAssessmentDone = state.assessment.status === 'completed';
  const isAnalysisUnlocked = state.analysis.status !== 'locked';

  const navGroups: NavGroup[] = [
    {
      group: 'TODAY',
      items: [
        { id: 'home', label: 'Home', icon: Home, locked: false },
        { id: 'journey', label: 'My Journey', icon: Route, locked: false }
      ]
    },
    {
      group: 'DISCOVER',
      items: [
        {
          id: 'assessment',
          label: 'Assessment',
          icon: ClipboardCheck,
          locked: false,
          badge: isAssessmentDone ? '✓' : 'Start'
        },
        {
          id: 'analysis',
          label: 'Analysis',
          icon: BarChart3,
          locked: !isAnalysisUnlocked,
          lockMsg: 'Analysis unlocks after you complete your baseline assessment.'
        }
      ]
    },
    {
      group: 'DEVELOP',
      items: [
        {
          id: 'clarity',
          label: 'Clarity',
          icon: Lightbulb,
          locked: !isAnalysisUnlocked,
          lockMsg: 'Clarity unlocks after your assessment profile is analyzed.'
        },
        {
          id: 'focus',
          label: 'Focus',
          icon: Target,
          locked: !isAnalysisUnlocked,
          lockMsg: 'Focus unlocks after you explore Clarity.'
        },
        {
          id: 'wallet',
          label: 'AI Wallet',
          icon: Wallet,
          locked: false
        }
      ]
    },
    {
      group: 'AI CHANGE',
      items: [
        { id: 'radar', label: 'AI Radar', icon: Radar, locked: false },
        { id: 'investigation', label: 'Investigation', icon: Search, locked: false },
        { id: 'relevance', label: 'AI Relevance', icon: Sparkles, locked: false }
      ]
    },
    {
      group: 'OTHER',
      items: [
        { id: 'credits', label: 'Credits', icon: Coins, locked: false },
        { id: 'mentor', label: 'Mentor', icon: MessageCircle, locked: false },
        { id: 'insights', label: 'Insights', icon: BarChart3, locked: !isAnalysisUnlocked, lockMsg: 'Insights unlock after your assessment analysis.' },
        { id: 'settings', label: 'Settings', icon: Settings, locked: false }
      ]
    }
  ];

  const handleNavClick = (item: NavItem) => {
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
        width: '230px',
        minWidth: '230px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #ede9fe',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px 14px',
        height: 'calc(100vh - 64px)',
        position: 'sticky',
        top: '64px',
        boxSizing: 'border-box',
        overflowY: 'auto'
      }}>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {navGroups.map((group) => (
            <div key={group.group}>
              <div style={{
                fontSize: '11px',
                fontWeight: 900,
                color: '#94a3b8',
                letterSpacing: '1.2px',
                padding: '0 10px 6px 10px',
                textTransform: 'uppercase',
                fontFamily: "'Nunito', sans-serif"
              }}>
                {group.group}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {group.items.map((item) => {
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
                        padding: '9px 12px',
                        borderRadius: '12px',
                        border: 'none',
                        cursor: item.locked ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: isActive ? 800 : 600,
                        fontFamily: "'Nunito', sans-serif",
                        width: '100%',
                        transition: 'all 0.15s ease',
                        backgroundColor: isActive ? '#eef2ff' : 'transparent',
                        color: isActive ? '#4338ca' : item.locked ? '#94a3b8' : '#475569',
                        opacity: item.locked ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive && !item.locked) {
                          e.currentTarget.style.backgroundColor = '#f8f7fd';
                          e.currentTarget.style.color = '#1e1b4b';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive && !item.locked) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#475569';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Icon style={{ width: '16px', height: '16px', color: isActive ? '#6366f1' : item.locked ? '#cbd5e1' : '#64748b' }} />
                        <span>{item.label}</span>
                      </div>

                      {item.locked ? (
                        <Lock style={{ width: '12px', height: '12px', color: '#cbd5e1' }} />
                      ) : item.badge ? (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '9999px',
                          backgroundColor: item.badge === '✓' ? '#ecfdf5' : '#eef2ff',
                          color: item.badge === '✓' ? '#047857' : '#6366f1'
                        }}>
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

      </aside>

      {/* Locked Feature Modal */}
      {lockedModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.3)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '28px',
            maxWidth: '380px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto'
            }}>
              <Lock style={{ width: '22px', height: '22px', color: '#d97706' }} />
            </div>

            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              {lockedModal.title}
            </h3>

            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              {lockedModal.message}
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => setLockedModal(null)}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '9999px',
                  fontSize: '13px',
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
                  padding: '10px 20px',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Start Assessment →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
