import React, { useState } from 'react';
import {
  Home,
  Route,
  ClipboardCheck,
  BarChart3,
  Wallet,
  Compass,
  Target,
  Radar,
  Sparkles,
  Wrench,
  Layers,
  MessageCircle,
  Coins,
  Settings,
  Lock,
  X,
  PanelLeftClose,
  PanelLeft,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { getFeatureAccess } from '../../services/featureAccessService';
import { AiimsLogo } from './AiimsLogo';

export interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
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

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed = false,
  onToggleCollapse,
  isOpen = false,
  onClose
}) => {
  const { state } = useLearner();
  const [lockedModal, setLockedModal] = useState<{ title: string; message: string; targetTab: string } | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const isAssessmentDone = state?.assessment?.status === 'completed';
  const userName = state?.profile?.name ? state.profile.name.split(' ')[0] : 'Learner';
  const userStage = state?.profile?.stage || 'Explorer';

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
      group: 'WORKSPACE',
      items: [
        createNavItem('home', 'Home', Home),
        createNavItem('journey', 'My AI Journey', Route)
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
      group: 'BUILD',
      items: [
        createNavItem('solver', 'Problem Solver', Wrench),
        createNavItem('build', 'Projects', Layers)
      ]
    },
    {
      group: 'SUPPORT',
      items: [
        createNavItem('mentor', 'Mentor Workspace', MessageCircle),
        createNavItem('credits', 'Credits & Progress', Coins, state?.credits?.balance ? `${state.credits.balance}` : undefined),
        createNavItem('settings', 'Settings', Settings)
      ]
    }
  ];

  const handleNavClick = (item: NavItem) => {
    if (item.locked) {
      setLockedModal({
        title: item.label,
        message: item.lockMsg || 'This workspace is locked pending prerequisite milestone completion.',
        targetTab: item.id
      });
    } else {
      setActiveTab(item.id);
      if (onClose) {
        onClose();
      }
    }
  };

  const renderNavList = (collapsed: boolean) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
      {/* Scrollable Navigation Groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: collapsed ? '12px' : '18px', overflowY: 'auto', paddingRight: collapsed ? '0' : '4px' }}>
        {navGroups.map((group, groupIdx) => (
          <div key={group.group}>
            {/* Section Heading or Divider */}
            {collapsed ? (
              groupIdx > 0 ? (
                <div
                  style={{
                    height: '1px',
                    backgroundColor: 'var(--aiims-border-subtle, #f1f5f9)',
                    margin: '4px 10px 8px 10px'
                  }}
                />
              ) : null
            ) : (
              <div style={{
                fontSize: '10.5px',
                fontWeight: 800,
                color: 'var(--aiims-text-muted, #64748b)',
                letterSpacing: '0.8px',
                padding: '0 10px',
                marginBottom: '5px',
                textTransform: 'uppercase',
                userSelect: 'none'
              }}>
                {group.group}
              </div>
            )}

            {/* Nav Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <div
                    key={item.id}
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setHoveredItemId(item.id)}
                    onMouseLeave={() => setHoveredItemId(null)}
                  >
                    <button
                      type="button"
                      onClick={() => handleNavClick(item)}
                      aria-label={item.label}
                      title={!collapsed ? (item.locked && item.lockMsg ? item.lockMsg : undefined) : undefined}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'space-between',
                        width: '100%',
                        padding: collapsed ? '9px 0' : '8px 10px',
                        border: 'none',
                        borderRadius: '8px',
                        backgroundColor: isActive
                          ? 'var(--aiims-accent-glow, rgba(99, 102, 241, 0.12))'
                          : 'transparent',
                        color: isActive
                          ? 'var(--aiims-primary, #6366f1)'
                          : item.locked
                          ? 'var(--aiims-text-muted, #94a3b8)'
                          : 'var(--aiims-text-secondary, #334155)',
                        fontWeight: isActive ? 700 : 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease, color 0.15s ease',
                        textAlign: 'left',
                        boxSizing: 'border-box',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'var(--aiims-bg-card-hover, #f8f7fd)';
                          e.currentTarget.style.color = 'var(--aiims-text-heading, #0f172a)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = item.locked
                            ? 'var(--aiims-text-muted, #94a3b8)'
                            : 'var(--aiims-text-secondary, #334155)';
                        }
                      }}
                    >
                      {/* Left highlight indicator line for active item */}
                      {isActive && (
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: '6px',
                            bottom: '6px',
                            width: '3px',
                            borderRadius: '0 3px 3px 0',
                            backgroundColor: 'var(--aiims-primary, #6366f1)'
                          }}
                        />
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div style={{
                          width: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Icon
                            size={17}
                            color={
                              isActive
                                ? 'var(--aiims-primary, #6366f1)'
                                : item.locked
                                ? 'var(--aiims-text-subtle, #94a3b8)'
                                : 'var(--aiims-text-secondary, #64748b)'
                            }
                          />
                        </div>

                        {!collapsed && (
                          <span style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '13px'
                          }}>
                            {item.label}
                          </span>
                        )}
                      </div>

                      {/* Right Lock / Badge indicators */}
                      {!collapsed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          {item.locked && (
                            <Lock size={12} color="var(--aiims-text-muted, #94a3b8)" />
                          )}
                          {item.badge ? (
                            <span style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '6px',
                              backgroundColor: isActive
                                ? 'var(--aiims-primary, #6366f1)'
                                : 'var(--aiims-border-subtle, #ede9fe)',
                              color: isActive ? '#ffffff' : 'var(--aiims-primary, #4338ca)',
                              lineHeight: 1
                            }}>
                              {item.badge}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </button>

                    {/* Floating Tooltip in Collapsed Mode */}
                    {collapsed && hoveredItemId === item.id && (
                      <div
                        className="aiims-nav-tooltip"
                        style={{
                          position: 'absolute',
                          left: '100%',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          marginLeft: '10px',
                          backgroundColor: 'var(--aiims-modal-bg, #ffffff)',
                          border: '1px solid var(--aiims-modal-border, #e2e8f0)',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          boxShadow: 'var(--aiims-shadow-dropdown, 0 10px 25px rgba(0,0,0,0.12))',
                          zIndex: 1000,
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aiims-text-heading, #0f172a)' }}>
                          {item.label}
                        </span>
                        {item.locked && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--aiims-border-subtle, #f1f5f9)',
                            color: 'var(--aiims-text-muted, #64748b)'
                          }}>
                            Locked
                          </span>
                        )}
                        {item.badge && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--aiims-primary, #6366f1)',
                            color: '#ffffff'
                          }}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Profile & Account Bottom Anchor */}
      <div style={{
        marginTop: '16px',
        paddingTop: '12px',
        borderTop: '1px solid var(--aiims-border-card, #ede9fe)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        position: 'relative'
      }}>
        {collapsed ? (
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            title={`${userName} (${userStage}) - Click for Settings`}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: 'var(--aiims-accent-glow, #e0e7ff)',
              color: 'var(--aiims-primary, #4f46e5)',
              border: '1px solid var(--aiims-border-card, #c7d2fe)',
              fontWeight: 800,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {userName.charAt(0)}
          </button>
        ) : (
          <div
            onClick={() => setActiveTab('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: '8px',
              width: '100%',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--aiims-bg-card-hover, #f8f7fd)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--aiims-accent-glow, #e0e7ff)',
              color: 'var(--aiims-primary, #4f46e5)',
              border: '1px solid var(--aiims-border-card, #c7d2fe)',
              fontWeight: 800,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {userName.charAt(0)}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--aiims-text-heading, #0f172a)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {userName}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'var(--aiims-text-secondary, #64748b)',
                lineHeight: 1.2
              }}>
                {userStage}
              </div>
            </div>
            <Settings size={14} color="var(--aiims-text-muted, #94a3b8)" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar */}
      <aside
        className="aiims-sidebar-desktop"
        style={{
          width: isCollapsed ? 'var(--aiims-sidebar-collapsed-width, 68px)' : 'var(--aiims-sidebar-width, 250px)',
          minWidth: isCollapsed ? 'var(--aiims-sidebar-collapsed-width, 68px)' : 'var(--aiims-sidebar-width, 250px)',
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          borderRight: '1px solid var(--aiims-border-card, #ede9fe)',
          height: 'calc(100vh - var(--aiims-header-height, 60px))',
          position: 'sticky',
          top: 'var(--aiims-header-height, 60px)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 90,
          overflow: 'visible'
        }}
      >
        {/* Sidebar Brand & Collapse Control Header */}
        <div style={{
          height: '52px',
          padding: isCollapsed ? '0 12px' : '0 14px',
          borderBottom: '1px solid var(--aiims-border-card, #ede9fe)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          flexShrink: 0
        }}>
          {!isCollapsed ? (
            <>
              <AiimsLogo size="sm" showWordmark={true} onClick={() => setActiveTab('home')} />
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  title="Collapse Sidebar (⌘B)"
                  aria-label="Collapse Sidebar"
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--aiims-text-secondary, #64748b)',
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--aiims-bg-card-hover, #f1f5f9)';
                    e.currentTarget.style.color = 'var(--aiims-text-heading, #0f172a)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--aiims-text-secondary, #64748b)';
                  }}
                >
                  <PanelLeftClose size={16} />
                </button>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              {onToggleCollapse ? (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  title="Expand Sidebar (⌘B)"
                  aria-label="Expand Sidebar"
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--aiims-text-secondary, #64748b)',
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--aiims-bg-card-hover, #f1f5f9)';
                    e.currentTarget.style.color = 'var(--aiims-text-heading, #0f172a)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--aiims-text-secondary, #64748b)';
                  }}
                >
                  <PanelLeft size={18} />
                </button>
              ) : (
                <AiimsLogo size="sm" showWordmark={false} onClick={() => setActiveTab('home')} />
              )}
            </div>
          )}
        </div>

        {/* Navigation Content Area */}
        <div style={{ flex: 1, padding: isCollapsed ? '12px 8px' : '14px 12px', overflowY: 'auto', boxSizing: 'border-box' }}>
          {renderNavList(isCollapsed)}
        </div>
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
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--aiims-border-card, #ede9fe)'
        }}>
          <AiimsLogo size="sm" showWordmark={true} onClick={() => { setActiveTab('home'); if (onClose) onClose(); }} />
          <button
            type="button"
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

        <div style={{ flex: 1 }}>
          {renderNavList(false)}
        </div>
      </aside>

      {/* Locked Feature Guidance Modal */}
      {lockedModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--aiims-modal-bg, #ffffff)',
            borderRadius: '16px',
            border: '1px solid var(--aiims-modal-border, #e2e8f0)',
            boxShadow: 'var(--aiims-shadow-modal, 0 20px 40px rgba(0, 0, 0, 0.2))',
            maxWidth: '440px',
            width: '100%',
            padding: '24px',
            position: 'relative'
          }}>
            <button
              onClick={() => setLockedModal(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: 'var(--aiims-text-muted, #94a3b8)'
              }}
            >
              <X size={18} />
            </button>

            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: 'var(--aiims-accent-glow, #eef2ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px'
            }}>
              <Lock size={20} color="var(--aiims-primary, #6366f1)" />
            </div>

            <h3 style={{
              margin: '0 0 6px 0',
              fontSize: '18px',
              fontWeight: 800,
              color: 'var(--aiims-text-heading, #0f172a)',
              fontFamily: "'Fredoka', sans-serif"
            }}>
              {lockedModal.title}
            </h3>

            <p style={{
              margin: '0 0 20px 0',
              fontSize: '13px',
              color: 'var(--aiims-text-secondary, #475569)',
              lineHeight: 1.5
            }}>
              {lockedModal.message}
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setLockedModal(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--aiims-border-card, #cbd5e1)',
                  backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                  color: 'var(--aiims-text-secondary, #475569)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab(lockedModal.targetTab);
                  setLockedModal(null);
                  if (onClose) onClose();
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'var(--aiims-primary, #6366f1)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>View Details</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
