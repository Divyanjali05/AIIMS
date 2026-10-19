import React from 'react';
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
  Compass,
  X
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { getFeatureAccess } from '../../services/featureAccessService';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
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

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen = false, onClose }) => {
  const { state } = useLearner();

  const isAssessmentDone = state.assessment.status === 'completed';

  const createNavItem = (id: string, label: string, icon: any, customBadge?: string): NavItem => {
    const access = getFeatureAccess(id, state);
    return {
      id,
      label,
      icon,
      locked: !access.unlocked,
      badge: customBadge,
      lockMsg: access.reason
    };
  };

  const navGroups: NavGroup[] = [
    {
      group: 'TODAY',
      items: [
        createNavItem('home', 'Home', Home)
      ]
    },
    {
      group: 'UNDERSTAND',
      items: [
        createNavItem('assessment', 'Baseline Assessment', ClipboardCheck, isAssessmentDone ? '✓' : 'Start'),
        createNavItem('analysis', 'My AI Profile', BarChart3)
      ]
    },
    {
      group: 'DEVELOP',
      items: [
        createNavItem('wallet', 'AI Wallet', Wallet),
        createNavItem('clarity', 'Clarity', Compass),
        createNavItem('focus', 'Focus', Target)
      ]
    },
    {
      group: 'DISCOVER',
      items: [
        createNavItem('radar', 'AI Radar', Radar),
        createNavItem('relevance', 'AI Relevance', Sparkles)
      ]
    },
    {
      group: 'APPLY',
      items: [
        createNavItem('solver', 'Problem Solver', Wrench)
      ]
    },
    {
      group: 'BUILD',
      items: [
        createNavItem('build', 'Projects', Layers)
      ]
    },
    {
      group: 'OTHER',
      items: [
        createNavItem('mentor', 'Mentor Workspace', MessageCircle),
        createNavItem('credits', 'Credits & Progress', Coins),
        createNavItem('settings', 'Settings', Settings)
      ]
    }
  ];

  const handleNavClick = (item: NavItem) => {
    setActiveTab(item.id);
    if (onClose) {
      onClose();
    }
  };

  const renderNavContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
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
                    title={item.locked && item.lockMsg ? item.lockMsg : item.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      borderRadius: '10px',
                      backgroundColor: isActive ? 'var(--aiims-bg-card-hover, #f4f4fe)' : 'transparent',
                      color: isActive ? '#4f46e5' : item.locked ? 'var(--aiims-text-muted, #94a3b8)' : 'var(--aiims-text-secondary, #334155)',
                      fontWeight: isActive ? 700 : 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                      minHeight: '38px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <div style={{ width: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={16} color={isActive ? '#4f46e5' : item.locked ? '#cbd5e1' : '#64748b'} />
                      </div>
                      <span className="truncate-1-line" style={{ flex: 1 }}>
                        {item.label}
                      </span>
                    </div>

                    {item.locked ? (
                      <Lock size={13} color="#94a3b8" style={{ marginLeft: '8px', flexShrink: 0 }} />
                    ) : item.badge ? (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        backgroundColor: isAssessmentDone ? '#dcfce7' : '#e0e7ff',
                        color: isAssessmentDone ? '#15803d' : '#4338ca',
                        padding: '2px 7px',
                        borderRadius: '10px',
                        marginLeft: '8px',
                        flexShrink: 0
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
        backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
        border: '1px solid var(--aiims-border-card, #e2e8f0)',
        fontSize: '11px',
        color: 'var(--aiims-text-secondary, #64748b)',
        textAlign: 'center',
        marginTop: '20px'
      }}>
        <strong style={{ color: '#4f46e5' }}>AIIMS Platform v2.5</strong>
        <div>10-Stage Canonical Journey</div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar */}
      <aside
        className="aiims-sidebar-desktop"
        style={{
          width: 'var(--aiims-sidebar-width, 240px)',
          minWidth: 'var(--aiims-sidebar-width, 240px)',
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          borderRight: '1px solid var(--aiims-border-card, #ede9fe)',
          padding: '20px 14px',
          height: 'calc(100vh - 64px)',
          position: 'sticky',
          top: '64px',
          boxSizing: 'border-box',
          overflowY: 'auto'
        }}
      >
        {renderNavContent()}
      </aside>

      {/* 2. Mobile Responsive Off-Canvas Drawer Backdrop */}
      <div
        className={`aiims-drawer-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* 3. Mobile Responsive Off-Canvas Drawer */}
      <aside
        className={`aiims-sidebar-drawer ${isOpen ? 'open' : ''}`}
        aria-label="Mobile Navigation"
        style={{
          padding: '16px 14px 24px 14px',
          boxSizing: 'border-box',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--aiims-border-card, #ede9fe)' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#4f46e5', letterSpacing: '0.5px' }}>
            AIIMS NAVIGATION
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            style={{
              border: 'none',
              background: 'var(--aiims-bg-card-hover, #f1f5f9)',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--aiims-text-secondary, #64748b)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {renderNavContent()}
      </aside>
    </>
  );
};

export default Sidebar;
