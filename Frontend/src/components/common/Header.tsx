import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Sun,
  Moon,
  Bell,
  ChevronDown,
  ChevronRight,
  Coins,
  X,
  ArrowRight,
  Settings,
  Wallet,
  Sparkles,
  MessageCircle,
  LogOut,
  Lock,
  Menu,
  PanelLeftClose,
  PanelLeft,
  Home,
  Route,
  ClipboardCheck,
  BarChart3,
  Compass,
  Target,
  Radar,
  Wrench,
  Layers,
  CornerDownLeft,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { useTheme } from '../../context/ThemeContext';
import { buildLearnerProfileContext } from '../../services/learnerProfileContext';
import { MentorService } from '../../services/mentorProvider';
import { AiimsLogo } from './AiimsLogo';

export interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  onToggleMobileMenu?: () => void;
}

interface SearchableItem {
  id: string;
  title: string;
  category: string;
  desc: string;
  icon: any;
  locked?: boolean;
  action?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
  onToggleMobileMenu
}) => {
  const { state, markNotificationRead, clearNotifications, logout } = useLearner();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  // Dialog & Dropdown States
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Mentor Observation in Command Palette
  const [mentorTurn, setMentorTurn] = useState<any | null>(null);
  const [isAskingMentor, setIsAskingMentor] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = state?.notifications ? state.notifications.filter((n) => !n.read).length : 0;
  const userName = state?.profile?.name ? state.profile.name.split(' ')[0] : 'Learner';
  const userFullName = state?.profile?.name || 'Learner';
  const userStage = state?.profile?.stage || 'Explorer';
  const creditsBalance = state?.credits?.balance || 0;

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const shortcutSymbol = isMac ? '⌘K' : 'Ctrl+K';

  // Breadcrumb mapping
  const breadcrumbMap: Record<string, { section: string; title: string }> = {
    home: { section: 'Workspace', title: 'Home' },
    journey: { section: 'Workspace', title: 'My AI Journey' },
    assessment: { section: 'Understand', title: 'Baseline Assessment' },
    analysis: { section: 'Understand', title: 'My AI Profile' },
    wallet: { section: 'Develop', title: 'AI Wallet' },
    clarity: { section: 'Develop', title: 'Clarity' },
    focus: { section: 'Develop', title: 'Focus' },
    radar: { section: 'Discover', title: 'AI Radar' },
    relevance: { section: 'Discover', title: 'AI Relevance' },
    investigation: { section: 'Discover', title: 'Investigation Lab' },
    discover: { section: 'Discover', title: 'Discover' },
    solver: { section: 'Build', title: 'Problem Solver' },
    build: { section: 'Build', title: 'Projects' },
    mentor: { section: 'Support', title: 'Mentor Workspace' },
    credits: { section: 'Support', title: 'Credits & Progress' },
    settings: { section: 'Support', title: 'Account Settings' }
  };

  const currentBreadcrumb = breadcrumbMap[activeTab] || { section: 'Workspace', title: 'Home' };

  // Searchable feature registry for Command Palette
  const searchableFeatures: SearchableItem[] = useMemo(() => [
    { id: 'home', title: 'Home Dashboard', category: 'Workspace', desc: 'Daily focus, progress, and stage overview', icon: Home },
    { id: 'journey', title: 'My AI Journey', category: 'Workspace', desc: '10-stage canonical development timeline', icon: Route },
    { id: 'assessment', title: 'Baseline Assessment', category: 'Understand', desc: '25-question multidimensional diagnostic', icon: ClipboardCheck },
    { id: 'analysis', title: 'My AI Profile', category: 'Understand', desc: 'Strengths, gap radar, and capability analysis', icon: BarChart3 },
    { id: 'wallet', title: 'AI Wallet', category: 'Develop', desc: 'Personalized AI toolkit & prompt suggestions', icon: Wallet },
    { id: 'clarity', title: 'Clarity & Prompts', category: 'Develop', desc: 'Systematic prompt engineering & task derivation', icon: Compass },
    { id: 'focus', title: 'Focus Workspace', category: 'Develop', desc: 'Pomodoro timer with session history', icon: Target },
    { id: 'radar', title: 'AI Radar', category: 'Discover', desc: 'Market shifts & breakthrough model releases', icon: Radar, locked: true },
    { id: 'relevance', title: 'AI Relevance', category: 'Discover', desc: 'Impact synthesis & practical utility', icon: Sparkles, locked: true },
    { id: 'solver', title: 'Problem Solver', category: 'Build', desc: 'Real-task derivation & workflow generator', icon: Wrench, locked: true },
    { id: 'build', title: 'Projects Workspace', category: 'Build', desc: 'Production-ready reusable project templates', icon: Layers, locked: true },
    { id: 'mentor', title: 'Mentor Workspace', category: 'Support', desc: 'Adaptive AI mentorship and guidance', icon: MessageCircle, locked: true },
    { id: 'credits', title: 'Credits & Ledger', category: 'Support', desc: 'Transaction history and earned AIIMS credits', icon: Coins },
    { id: 'settings', title: 'Account Settings', category: 'Support', desc: 'Learner profile, academic stream, and preferences', icon: Settings }
  ], []);

  // Filtered command palette items
  const filteredItems = useMemo(() => {
    if (!paletteQuery.trim()) return searchableFeatures;
    const q = paletteQuery.toLowerCase().trim();
    return searchableFeatures.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [paletteQuery, searchableFeatures]);

  // Global keyboard shortcut: Cmd+K / Ctrl+K & Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowNotifications(false);
        setShowProfileMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when Command Palette opens
  useEffect(() => {
    if (showCommandPalette) {
      setSelectedIndex(0);
      setMentorTurn(null);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [showCommandPalette]);

  // Handle Command Palette arrow keys & Enter
  const handlePaletteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems.length > 0 && filteredItems[selectedIndex]) {
        handleSelectItem(filteredItems[selectedIndex]);
      } else if (paletteQuery.trim()) {
        handleAskMentor(paletteQuery);
      }
    }
  };

  const handleSelectItem = (item: SearchableItem) => {
    if (item.action) {
      item.action();
    } else {
      setActiveTab(item.id);
    }
    setShowCommandPalette(false);
    setPaletteQuery('');
  };

  const handleAskMentor = async (question: string) => {
    if (!question.trim()) return;
    setIsAskingMentor(true);
    try {
      const learnerContext = buildLearnerProfileContext(state);
      const res = await MentorService.getMentorObservation(learnerContext, state, question);
      setMentorTurn(res);
    } catch (e) {
      console.error('Failed to query mentor', e);
    } finally {
      setIsAskingMentor(false);
    }
  };

  const handleNotificationClick = (notif: any) => {
    markNotificationRead(notif.id);
    if (notif.targetTab) {
      setActiveTab(notif.targetTab);
    }
    setShowNotifications(false);
  };

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <>
      <header
        className="aiims-header-container"
        style={{
          height: 'var(--aiims-header-height, 60px)',
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          borderBottom: '1px solid var(--aiims-border-card, #ede9fe)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxSizing: 'border-box',
          backdropFilter: 'blur(8px)',
          transition: 'border-color 0.15s ease, background-color 0.15s ease'
        }}
      >
        {/* ======================================================== */}
        {/* A. LEFT AREA: MOBILE / SIDEBAR TOGGLE & BREADCRUMB      */}
        {/* ======================================================== */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          {/* Mobile drawer toggle */}
          {onToggleMobileMenu && (
            <button
              type="button"
              className="aiims-mobile-toggle-btn"
              onClick={onToggleMobileMenu}
              aria-label="Open Navigation Menu"
              style={{
                border: 'none',
                background: 'var(--aiims-bg-card-hover, #f1f5f9)',
                borderRadius: '8px',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--aiims-text-primary, #334155)',
                flexShrink: 0
              }}
            >
              <Menu size={18} />
            </button>
          )}

          {/* Desktop Sidebar Collapse Toggle */}
          {onToggleSidebarCollapse && (
            <button
              type="button"
              className="aiims-desktop-sidebar-btn"
              onClick={onToggleSidebarCollapse}
              title={isSidebarCollapsed ? `Expand sidebar (${isMac ? '⌘B' : 'Ctrl+B'})` : `Collapse sidebar (${isMac ? '⌘B' : 'Ctrl+B'})`}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--aiims-text-secondary, #64748b)',
                transition: 'all 0.15s ease',
                flexShrink: 0
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
              {isSidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
            </button>
          )}

          {/* Breadcrumb Indicator */}
          <nav aria-label="Breadcrumb" className="aiims-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <span
              onClick={() => setActiveTab('home')}
              style={{
                color: 'var(--aiims-text-muted, #94a3b8)',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'color 0.15s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--aiims-primary, #6366f1)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--aiims-text-muted, #94a3b8)')}
            >
              AIIMS
            </span>
            <ChevronRight size={13} color="var(--aiims-text-subtle, #cbd5e1)" />
            <span style={{ color: 'var(--aiims-text-muted, #94a3b8)', fontWeight: 500 }}>
              {currentBreadcrumb.section}
            </span>
            <ChevronRight size={13} color="var(--aiims-text-subtle, #cbd5e1)" />
            <span style={{ color: 'var(--aiims-text-heading, #0f172a)', fontWeight: 700 }}>
              {currentBreadcrumb.title}
            </span>
          </nav>
        </div>

        {/* ======================================================== */}
        {/* B. QUICK NAVIGATION (DESKTOP)                            */}
        {/* ======================================================== */}
        <nav
          className="aiims-quick-nav"
          aria-label="Quick Navigation"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            backgroundColor: 'var(--aiims-border-subtle, #f8fafc)',
            padding: '3px',
            borderRadius: '9px',
            border: '1px solid var(--aiims-border-card, #ede9fe)'
          }}
        >
          {[
            { id: 'home', label: 'Home', isMatch: activeTab === 'home' },
            { id: 'journey', label: 'My Journey', isMatch: activeTab === 'journey' },
            { id: 'wallet', label: 'Develop', isMatch: ['wallet', 'clarity', 'focus'].includes(activeTab) },
            { id: 'discover', label: 'Discover', isMatch: ['discover', 'radar', 'relevance', 'investigation'].includes(activeTab) }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              style={{
                border: 'none',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '12.5px',
                fontWeight: item.isMatch ? 700 : 600,
                backgroundColor: item.isMatch ? 'var(--aiims-bg-card, #ffffff)' : 'transparent',
                color: item.isMatch ? 'var(--aiims-primary, #6366f1)' : 'var(--aiims-text-secondary, #475569)',
                boxShadow: item.isMatch ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!item.isMatch) {
                  e.currentTarget.style.color = 'var(--aiims-text-heading, #0f172a)';
                }
              }}
              onMouseLeave={(e) => {
                if (!item.isMatch) {
                  e.currentTarget.style.color = 'var(--aiims-text-secondary, #475569)';
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* ======================================================== */}
        {/* C. GLOBAL SEARCH BUTTON & D. RIGHT-SIDE UTILITIES       */}
        {/* ======================================================== */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Global Search Field (Opens Command Palette) */}
          <button
            type="button"
            onClick={() => setShowCommandPalette(true)}
            aria-label="Search or open command palette"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              backgroundColor: 'var(--aiims-input-bg, #f4f3ff)',
              border: '1px solid var(--aiims-input-border, #ede9fe)',
              borderRadius: '8px',
              padding: '6px 10px',
              width: '210px',
              cursor: 'pointer',
              color: 'var(--aiims-text-muted, #94a3b8)',
              fontSize: '12.5px',
              fontFamily: 'inherit',
              transition: 'border-color 0.15s ease, background-color 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--aiims-primary, #6366f1)';
              e.currentTarget.style.backgroundColor = 'var(--aiims-bg-card-hover, #ffffff)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--aiims-input-border, #ede9fe)';
              e.currentTarget.style.backgroundColor = 'var(--aiims-input-bg, #f4f3ff)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Search size={14} color="var(--aiims-primary, #6366f1)" />
              <span style={{ color: 'var(--aiims-text-secondary, #64748b)' }}>Search...</span>
            </div>
            <kbd style={{
              fontSize: '10.5px',
              fontWeight: 700,
              padding: '2px 5px',
              borderRadius: '4px',
              backgroundColor: 'var(--aiims-bg-card, #ffffff)',
              border: '1px solid var(--aiims-border-card, #cbd5e1)',
              color: 'var(--aiims-text-muted, #64748b)',
              lineHeight: 1
            }}>
              {shortcutSymbol}
            </kbd>
          </button>

          {/* AI Credits Pill */}
          <button
            type="button"
            className="aiims-credits-pill"
            onClick={() => setActiveTab('credits')}
            title="AIIMS Credits Ledger & Balance"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '20px',
              backgroundColor: 'var(--aiims-tint-amber-bg, #fffbeb)',
              border: '1px solid var(--aiims-card-amber-border, #fde68a)',
              color: 'var(--aiims-card-amber-text, #b45309)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
          >
            <Coins size={14} color="var(--aiims-card-amber-text, #b45309)" />
            <span>{creditsBalance.toLocaleString()}</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} mode`}
            aria-label={`Toggle theme (currently ${theme})`}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
              border: '1px solid var(--aiims-border-card, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isDarkMode ? '#f59e0b' : 'var(--aiims-text-secondary, #475569)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--aiims-border-subtle, #ede9fe)';
              e.currentTarget.style.color = 'var(--aiims-primary, #6366f1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--aiims-bg-card-hover, #f8fafc)';
              e.currentTarget.style.color = isDarkMode ? '#f59e0b' : 'var(--aiims-text-secondary, #475569)';
            }}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Notifications Button & Dropdown */}
          <div ref={notifMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notifications"
              aria-label="View notifications"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
                border: '1px solid var(--aiims-border-card, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: unreadCount > 0 ? 'var(--aiims-primary, #4f46e5)' : 'var(--aiims-text-secondary, #64748b)',
                transition: 'all 0.15s ease',
                position: 'relative'
              }}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '9.5px',
                  fontWeight: 800,
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid var(--aiims-bg-card, #ffffff)'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {showNotifications && (
              <div style={{
                position: 'absolute',
                top: '42px',
                right: 0,
                width: '320px',
                backgroundColor: 'var(--aiims-modal-bg, #ffffff)',
                borderRadius: '12px',
                boxShadow: 'var(--aiims-shadow-dropdown, 0 10px 30px rgba(0, 0, 0, 0.15))',
                border: '1px solid var(--aiims-modal-border, #e2e8f0)',
                padding: '12px',
                zIndex: 200
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--aiims-border-card, #f1f5f9)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--aiims-text-heading, #0f172a)' }}>
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--aiims-primary, #6366f1)',
                        color: '#fff'
                      }}>
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {state?.notifications && state.notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={clearNotifications}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '11px',
                        color: 'var(--aiims-primary, #4f46e5)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
                  {state?.notifications && state.notifications.length > 0 ? (
                    state.notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          backgroundColor: notif.read
                            ? 'var(--aiims-bg-card-hover, #f8fafc)'
                            : (isDarkMode ? 'rgba(99, 102, 241, 0.16)' : '#eef2ff'),
                          border: notif.read
                            ? '1px solid var(--aiims-border-card, #f1f5f9)'
                            : '1px solid var(--aiims-border-card-hover, #c7d2fe)',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aiims-text-heading, #0f172a)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{notif.title}</span>
                          <span style={{ fontSize: '10px', color: 'var(--aiims-text-muted, #94a3b8)', fontWeight: 500 }}>
                            {notif.timestamp}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--aiims-text-secondary, #475569)', marginTop: '3px', lineHeight: 1.35 }}>
                          {notif.message}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--aiims-text-muted, #94a3b8)', fontSize: '12px' }}>
                      No new notifications.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar & Dropdown */}
          <div ref={profileMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              aria-label="User Account Menu"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: '8px',
                border: '1px solid transparent',
                backgroundColor: showProfileMenu ? 'var(--aiims-bg-card-hover, #f8fafc)' : 'transparent',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--aiims-bg-card-hover, #f8fafc)')}
              onMouseLeave={(e) => {
                if (!showProfileMenu) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: 'var(--aiims-accent-glow, #e0e7ff)',
                color: 'var(--aiims-primary, #4f46e5)',
                fontWeight: 800,
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid var(--aiims-border-card, #c7d2fe)'
              }}>
                {userName.charAt(0)}
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--aiims-text-heading, #0f172a)' }}>
                {userName}
              </span>
              <ChevronDown size={14} color="var(--aiims-text-secondary, #64748b)" />
            </button>

            {/* Account Menu Dropdown */}
            {showProfileMenu && (
              <div style={{
                position: 'absolute',
                top: '42px',
                right: 0,
                width: '210px',
                backgroundColor: 'var(--aiims-modal-bg, #ffffff)',
                borderRadius: '12px',
                boxShadow: 'var(--aiims-shadow-dropdown, 0 10px 30px rgba(0, 0, 0, 0.15))',
                border: '1px solid var(--aiims-modal-border, #e2e8f0)',
                padding: '6px',
                zIndex: 200
              }}>
                {/* User Identity Summary */}
                <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--aiims-border-card, #f1f5f9)', marginBottom: '4px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--aiims-text-heading, #0f172a)' }}>
                    {userFullName}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--aiims-text-muted, #64748b)', marginTop: '1px' }}>
                    Stage: {userStage}
                  </div>
                </div>

                <div
                  onClick={() => {
                    setActiveTab('settings');
                    setShowProfileMenu(false);
                  }}
                  style={{
                    padding: '8px 10px',
                    fontSize: '12.5px',
                    color: 'var(--aiims-text-heading, #0f172a)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--aiims-bg-card-hover, #f8fafc)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Settings size={14} color="var(--aiims-text-secondary, #64748b)" />
                  Account Settings
                </div>

                <div
                  onClick={() => {
                    setActiveTab('credits');
                    setShowProfileMenu(false);
                  }}
                  style={{
                    padding: '8px 10px',
                    fontSize: '12.5px',
                    color: 'var(--aiims-text-heading, #0f172a)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--aiims-bg-card-hover, #f8fafc)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Coins size={14} color="var(--aiims-card-amber-text, #b45309)" />
                  AIIMS Wallet ({creditsBalance})
                </div>

                <div style={{ height: '1px', backgroundColor: 'var(--aiims-border-card, #f1f5f9)', margin: '4px 0' }} />

                <div
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  style={{
                    padding: '8px 10px',
                    fontSize: '12.5px',
                    color: '#ef4444',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 700
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--aiims-bg-card-hover, #f8fafc)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <LogOut size={14} color="#ef4444" />
                  Sign Out
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* COMMAND PALETTE MODAL (CMD+K / CTRL+K)                   */}
      {/* ======================================================== */}
      {showCommandPalette && (
        <div
          className="aiims-palette-backdrop"
          onClick={() => setShowCommandPalette(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '12vh',
            zIndex: 10000,
            paddingLeft: '16px',
            paddingRight: '16px'
          }}
        >
          <div
            className="aiims-palette-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '620px',
              backgroundColor: 'var(--aiims-modal-bg, #ffffff)',
              borderRadius: '16px',
              border: '1px solid var(--aiims-modal-border, #e2e8f0)',
              boxShadow: 'var(--aiims-shadow-modal, 0 25px 50px -12px rgba(0, 0, 0, 0.25))',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Command Palette Input Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 18px',
              borderBottom: '1px solid var(--aiims-border-card, #ede9fe)'
            }}>
              <Search size={18} color="var(--aiims-primary, #6366f1)" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search workspaces, diagnostics, tools, or ask mentor..."
                value={paletteQuery}
                onChange={(e) => {
                  setPaletteQuery(e.target.value);
                  setSelectedIndex(0);
                  setMentorTurn(null);
                }}
                onKeyDown={handlePaletteKeyDown}
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--aiims-text-heading, #0f172a)',
                  fontSize: '15px',
                  fontWeight: 600,
                  width: '100%',
                  fontFamily: 'inherit'
                }}
              />
              {paletteQuery ? (
                <button
                  type="button"
                  onClick={() => setPaletteQuery('')}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--aiims-text-muted)' }}
                >
                  <X size={16} />
                </button>
              ) : (
                <kbd style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--aiims-bg-subtle, #f1f5f9)',
                  border: '1px solid var(--aiims-border-card, #cbd5e1)',
                  color: 'var(--aiims-text-muted, #64748b)'
                }}>
                  ESC
                </kbd>
              )}
            </div>

            {/* Results / Mentor Body */}
            <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '8px' }}>
              {/* If Mentor Observation result exists */}
              {mentorTurn && (
                <div style={{
                  margin: '8px 4px 12px 4px',
                  padding: '14px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--aiims-accent-glow, #eef2ff)',
                  border: '1px solid var(--aiims-border-card-hover, #c7d2fe)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: 'var(--aiims-primary, #4338ca)', fontWeight: 800, fontSize: '13px' }}>
                    <Sparkles size={16} /> AIIMS Mentor Observation
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--aiims-text-body, #334155)', lineHeight: 1.5 }}>
                    {mentorTurn.observation || mentorTurn.guidance || JSON.stringify(mentorTurn)}
                  </p>
                </div>
              )}

              {/* Categorized List of Results */}
              {filteredItems.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {filteredItems.map((item, idx) => {
                    const Icon = item.icon;
                    const isSelected = idx === selectedIndex;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: isSelected
                            ? 'var(--aiims-accent-glow, rgba(99, 102, 241, 0.12))'
                            : 'transparent',
                          cursor: 'pointer',
                          transition: 'background-color 0.12s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: isSelected
                              ? 'var(--aiims-primary, #6366f1)'
                              : 'var(--aiims-bg-card-hover, #f1f5f9)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isSelected ? '#ffffff' : 'var(--aiims-text-secondary, #475569)',
                            flexShrink: 0,
                            transition: 'all 0.12s ease'
                          }}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <div style={{
                              fontSize: '13.5px',
                              fontWeight: 700,
                              color: isSelected ? 'var(--aiims-primary, #6366f1)' : 'var(--aiims-text-heading, #0f172a)'
                            }}>
                              {item.title}
                            </div>
                            <div style={{
                              fontSize: '11.5px',
                              color: 'var(--aiims-text-secondary, #64748b)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {item.desc}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--aiims-border-subtle, #f1f5f9)',
                            color: 'var(--aiims-text-muted, #64748b)'
                          }}>
                            {item.category}
                          </span>
                          {item.locked && <Lock size={12} color="var(--aiims-text-muted, #94a3b8)" />}
                          {isSelected && <CornerDownLeft size={14} color="var(--aiims-primary, #6366f1)" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                  <HelpCircle size={32} color="var(--aiims-text-muted, #94a3b8)" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--aiims-text-heading, #0f172a)' }}>
                    No matching workspace found
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--aiims-text-secondary, #64748b)', margin: '4px 0 14px' }}>
                    Try searching for Assessment, Wallet, Focus, Credits, or ask the AIIMS Mentor.
                  </p>
                  {paletteQuery.trim() && (
                    <button
                      type="button"
                      disabled={isAskingMentor}
                      onClick={() => handleAskMentor(paletteQuery)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'var(--aiims-primary, #6366f1)',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Sparkles size={14} />
                      {isAskingMentor ? 'Consulting Mentor...' : `Ask Mentor: "${paletteQuery}"`}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer Quick Keys */}
            <div style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--aiims-border-card, #ede9fe)',
              backgroundColor: 'var(--aiims-bg-subtle, #f8fafc)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: 'var(--aiims-text-muted, #64748b)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', background: 'var(--aiims-border-card)', color: 'inherit' }}>↑↓</kbd> to navigate</span>
                <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', background: 'var(--aiims-border-card)', color: 'inherit' }}>↵</kbd> to select</span>
                <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', background: 'var(--aiims-border-card)', color: 'inherit' }}>ESC</kbd> to close</span>
              </div>
              <span>{filteredItems.length} {filteredItems.length === 1 ? 'result' : 'results'}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
