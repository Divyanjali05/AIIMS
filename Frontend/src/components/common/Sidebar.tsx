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
  Wallet,
  Wrench,
  Layers,
  Compass
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
        { id: 'home', label: 'Home', icon: Home, locked: false }
      ]
    },
    {
      group: 'UNDERSTAND',
      items: [
        {
          id: 'assessment',
          label: 'Baseline Assessment',
          icon: ClipboardCheck,
          locked: false,
          badge: isAssessmentDone ? '✓' : 'Start'
        },
        {
          id: 'analysis',
          label: 'My AI Profile',
          icon: BarChart3,
          locked: !isAnalysisUnlocked,
          lockMsg: 'My AI Profile unlocks after you complete your baseline assessment.'
        }
      ]
    },
    {
      group: 'DEVELOP',
      items: [
        {
          id: 'wallet',
          label: 'AI Wallet',
          icon: Wallet,
          locked: false
        },
        {
          id: 'clarity',
          label: 'Clarity',
          icon: Compass,
          locked: !isAnalysisUnlocked,
          lockMsg: 'Clarity unlocks after your assessment profile is analyzed.'
        },
        {
          id: 'focus',
          label: 'Focus',
          icon: Target,
          locked: !isAnalysisUnlocked,
          lockMsg: 'Focus unlocks after you explore Clarity.'
        }
      ]
    },
    {
      group: 'DISCOVER',
      items: [
        {
          id: 'radar',
          label: 'AI Radar',
          icon: Radar,
          locked: false
        },
        {
          id: 'relevance',
          label: 'AI Relevance',
          icon: Sparkles,
          locked: false
        }
      ]
    },
    {
      group: 'APPLY',
      items: [
        {
          id: 'solver',
          label: 'Problem Solver',
          icon: Wrench,
          locked: false
        }
      ]
    },
    {
      group: 'BUILD',
      items: [
        {
          id: 'build',
          label: 'Projects',
          icon: Layers,
          locked: false
        }
      ]
    },
    {
      group: 'OTHER',
      items: [
        { id: 'mentor', label: 'Mentor Workspace', icon: MessageCircle, locked: false },
        { id: 'credits', label: 'Credits & Progress', icon: Coins, locked: false },
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
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {navGroups.map((group) => (
            <div key={group.group}>
              <div style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#64748b',
                letterSpacing: '1px',
                padding: '0 10px',
                marginBottom: '6px',
                textTransform: 'uppercase'
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
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        borderRadius: '10px',
                        backgroundColor: isActive ? '#f4f4fe' : 'transparent',
                        color: isActive ? '#4f46e5' : item.locked ? '#94a3b8' : '#334155',
                        fontWeight: isActive ? 700 : 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Icon size={16} color={isActive ? '#4f46e5' : item.locked ? '#cbd5e1' : '#64748b'} />
                        <span>{item.label}</span>
                      </div>

                      {item.locked ? (
                        <Lock size={13} color="#94a3b8" />
                      ) : item.badge ? (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          backgroundColor: isAssessmentDone ? '#dcfce7' : '#e0e7ff',
                          color: isAssessmentDone ? '#15803d' : '#4338ca',
                          padding: '2px 7px',
                          borderRadius: '10px'
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

        {/* FOOTER METRIC / BRANDING */}
        <div style={{
          padding: '12px',
          borderRadius: '10px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          fontSize: '11px',
          color: '#64748b',
          textAlign: 'center'
        }}>
          <strong style={{ color: '#4f46e5' }}>AIIMS Platform v2.5</strong>
          <div>10-Stage Canonical Journey</div>
        </div>
      </aside>

      {/* LOCKED MODAL DIALOG */}
      {lockedModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '420px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              color: '#dc2626'
            }}>
              <Lock size={22} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', fontFamily: "'Fredoka', sans-serif" }}>
              {lockedModal.title}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.45 }}>
              {lockedModal.message}
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => setLockedModal(null)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  const target = lockedModal.targetTab;
                  setLockedModal(null);
                  setActiveTab(target);
                }}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Go to Baseline Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
