import React, { useState } from 'react';
import { Search, Sun, Moon, Bell, ChevronDown, Coins, X, ArrowRight, Settings, Wallet, Sparkles, MessageCircle, LogOut, Lock, Menu } from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { useTheme } from '../../context/ThemeContext';
import { Badge } from './Badge';
import { buildLearnerProfileContext } from '../../services/learnerProfileContext';
import { MentorService } from '../../services/mentorProvider';
import { AiimsLogo } from './AiimsLogo';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onToggleMobileMenu }) => {
  const { state, markNotificationRead, clearNotifications, logout } = useLearner();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const unreadCount = state.notifications.filter((n) => !n.read).length;
  const userName = state.profile?.name ? state.profile.name.split(' ')[0] : 'Divya';

  const [mentorTurn, setMentorTurn] = useState<any | null>(null);
  const [isAskingMentor, setIsAskingMentor] = useState(false);

  // Stage-relevant quick mentor prompts based on activeTab
  const getStageQuickPrompts = () => {
    switch (activeTab) {
      case 'analysis':
        return [
          { text: 'What does my top capability mean?', desc: 'Interpret profile strength' },
          { text: 'Why is this my growth area?', desc: 'Explain development opportunity' }
        ];
      case 'focus':
        return [
          { text: 'Should I choose this candidate focus?', desc: 'Evaluate focus priority' },
          { text: 'How long should I stay on a focus?', desc: 'Focus strategy guide' }
        ];
      case 'radar':
        return [
          { text: 'Why is this signal relevant to my focus?', desc: 'Explain signal connection' },
          { text: 'What should I investigate first?', desc: 'Prioritize research signals' }
        ];
      case 'investigation':
        return [
          { text: 'What perspective am I missing?', desc: 'Deepen research scaffold' },
          { text: 'How do I complete my reflection?', desc: 'Reflection guidance' }
        ];
      case 'relevance':
        return [
          { text: 'What is my recommended next action?', desc: 'Next step synthesis' },
          { text: 'How does this connect to my profile?', desc: 'Traceability breakdown' }
        ];
      default:
        return [
          { text: 'What should I focus on right now?', desc: 'Contextual mentor guidance' },
          { text: 'How do AIIMS Credits work?', desc: 'Ledger & rewards guide' }
        ];
    }
  };

  const handleAskMentor = async (question: string) => {
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

  const searchableFeatures = [
    { title: 'AI Wallet', desc: 'Personalized AI toolkit & recommendations', tab: 'wallet' },
    { title: 'Take Baseline Assessment', desc: '25-question multidimensional diagnostic', tab: 'assessment' },
    { title: 'View AI Profile Analysis', desc: 'Individual, comparison, & cohort insights', tab: 'analysis' },
    { title: 'Explore AI Radar (Locked)', desc: 'Emerging tech shifts & model releases', tab: 'radar' },
    { title: 'AIIMS Credits Wallet', desc: 'View transactions & earned balance', tab: 'credits' },
    { title: 'Select Focus Track', desc: 'Prioritize skill development tracks', tab: 'focus' },
    { title: 'My AI Journey', desc: 'Development timeline & milestone history', tab: 'journey' },
    { title: 'Problem Solver (Locked)', desc: 'Derive workflows for real tasks', tab: 'solver' },
    { title: 'Projects Workspace (Locked)', desc: 'Build production project templates', tab: 'build' },
    { title: 'Mentor Workspace (Locked)', desc: 'Adaptive AI mentorship and guidance', tab: 'mentor' },
  ];

  const filteredSearchResults = searchQuery.trim()
    ? searchableFeatures.filter(
        (f) =>
          f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.desc.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : searchableFeatures;

  const handleNotificationClick = (notif: any) => {
    markNotificationRead(notif.id);
    setActiveTab(notif.targetTab);
    setShowNotifications(false);
  };

  return (
    <header
      className="aiims-header-container"
      style={{
        height: '64px',
        backgroundColor: 'var(--aiims-bg-card, #ffffff)',
        borderBottom: '1px solid var(--aiims-border-card, #e2e8f0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxSizing: 'border-box',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Brand Logo & Top Primary Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {onToggleMobileMenu && (
          <button
            className="aiims-mobile-toggle-btn"
            onClick={onToggleMobileMenu}
            aria-label="Open Navigation Menu"
            style={{
              border: 'none',
              background: 'var(--aiims-bg-card-hover, #f1f5f9)',
              borderRadius: '8px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--aiims-text-primary, #334155)',
              flexShrink: 0
            }}
          >
            <Menu size={20} />
          </button>
        )}

        <AiimsLogo size="md" onClick={() => setActiveTab('home')} />

        {/* Top Primary Navigation Links with Semantic Active Colors */}
        <nav className="aiims-header-nav" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {[
            { id: 'home', label: 'Home', activeBg: '#eef2ff', activeColor: '#4338ca', locked: false },
            { id: 'journey', label: 'My Journey', activeBg: '#f3e8ff', activeColor: '#6b21a8', locked: false },
            { id: 'discover', label: 'Discover', activeBg: '#e0f2fe', activeColor: '#0369a1', locked: false },
            { id: 'clarity', label: 'Develop', activeBg: '#ecfdf5', activeColor: '#047857', locked: false },
            { id: 'radar', label: 'AI Change', activeBg: '#ecfeff', activeColor: '#155e75', locked: true },
            { id: 'mentor', label: 'Mentor', activeBg: '#f3e8ff', activeColor: '#6b21a8', locked: true }
          ].map((tab) => {
            const isActive = activeTab === tab.id || (tab.id === 'clarity' && (activeTab === 'clarity' || activeTab === 'focus')) || (tab.id === 'radar' && (activeTab === 'radar' || activeTab === 'investigation' || activeTab === 'relevance'));
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  backgroundColor: isActive ? tab.activeBg : 'transparent',
                  color: isActive ? tab.activeColor : tab.locked ? '#94a3b8' : '#475569',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '7px 14px',
                  fontSize: '13px',
                  fontWeight: isActive ? 800 : 600,
                  fontFamily: "'Nunito', sans-serif",
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <span>{tab.label}</span>
                {tab.locked && <Lock size={11} color={isActive ? tab.activeColor : '#94a3b8'} />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Search Input */}
      <div className="aiims-header-search" style={{ position: 'relative', width: '380px', maxWidth: '35%' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--aiims-input-bg, #f4f3ff)',
          padding: '8px 14px',
          borderRadius: '9999px',
          border: '1px solid var(--aiims-input-border, #ede9fe)',
          transition: 'all 0.2s ease',
        }}>
          <Search style={{ width: '15px', height: '15px', color: '#6366f1' }} />
          <input
            type="text"
            placeholder="Search / Ask AIIMS..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchModal(true);
            }}
            onFocus={() => setShowSearchModal(true)}
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              outline: 'none',
              fontSize: '13px',
              color: 'var(--aiims-input-text, #0f172a)',
              width: '100%',
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 600
            }}
          />

          {searchQuery && (
            <X
              style={{ width: '14px', height: '14px', color: '#94a3b8', cursor: 'pointer' }}
              onClick={() => {
                setSearchQuery('');
                setShowSearchModal(false);
              }}
            />
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearchModal && (
          <div style={{
            position: 'absolute',
            top: '44px',
            left: 0,
            right: 0,
            backgroundColor: 'var(--aiims-modal-bg, #ffffff)',
            borderRadius: '12px',
            boxShadow: 'var(--aiims-shadow-dropdown, 0 10px 30px rgba(0, 0, 0, 0.15))',
            border: '1px solid var(--aiims-modal-border, #e2e8f0)',
            padding: '8px',
            zIndex: 200,
            maxHeight: '320px',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px 8px 8px', borderBottom: '1px solid var(--aiims-border-card, #f1f5f9)' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--aiims-text-muted, #94a3b8)', textTransform: 'uppercase' }}>Quick Search</span>
              <X style={{ width: '14px', height: '14px', color: 'var(--aiims-text-muted, #94a3b8)', cursor: 'pointer' }} onClick={() => setShowSearchModal(false)} />
            </div>

            <div style={{ marginTop: '4px' }}>
              {filteredSearchResults.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setActiveTab(item.tab);
                    setShowSearchModal(false);
                    setSearchQuery('');
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'backgroundColor 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--aiims-bg-card-hover, #f8fafc)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--aiims-text-primary, #0f172a)' }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--aiims-text-secondary, #64748b)' }}>{item.desc}</div>
                  </div>
                  <ArrowRight style={{ width: '14px', height: '14px', color: '#4f46e5' }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right User Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

        {/* Live Credits Badge Pill */}
        <Badge
          variant="warning"
          icon={<Coins style={{ width: '14px', height: '14px', color: '#d97706' }} />}
          style={{ cursor: 'pointer' }}
        >
          <span onClick={() => setActiveTab('credits')}>{state.credits.balance} Credits</span>
        </Badge>

        {/* Theme Toggle Button */}
        <button
          id="header-theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
            border: '1px solid var(--aiims-border-card, #cbd5e1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: isDarkMode ? '#fbbf24' : '#4f46e5',
            transition: 'all 0.15s ease'
          }}
        >
          {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notifications Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: 'var(--aiims-bg-card-hover, #f8fafc)',
              border: '1px solid var(--aiims-border-card, #cbd5e1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: unreadCount > 0 ? '#4f46e5' : 'var(--aiims-text-secondary, #64748b)'
            }}
          >
            <Bell style={{ width: '16px', height: '16px' }} />
          </button>
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 700,
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {unreadCount}
            </span>
          )}

          {/* Notifications Modal */}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: '42px',
              right: 0,
              width: '300px',
              backgroundColor: 'var(--aiims-modal-bg, #ffffff)',
              borderRadius: '12px',
              boxShadow: 'var(--aiims-shadow-dropdown, 0 10px 30px rgba(0, 0, 0, 0.15))',
              border: '1px solid var(--aiims-modal-border, #e2e8f0)',
              padding: '12px',
              zIndex: 200
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--aiims-border-card, #f1f5f9)' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aiims-text-primary, #0f172a)' }}>Notifications</span>
                <span
                  onClick={clearNotifications}
                  style={{ fontSize: '11px', color: '#4f46e5', fontWeight: 600, cursor: 'pointer' }}
                >
                  Mark all read
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                {state.notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: notif.read ? 'var(--aiims-bg-card-hover, #f8fafc)' : (isDarkMode ? 'rgba(99, 102, 241, 0.18)' : '#e0e7ff'),
                      border: notif.read ? '1px solid var(--aiims-border-card, #f1f5f9)' : '1px solid #c7d2fe',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aiims-text-primary, #0f172a)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{notif.title}</span>
                      <span style={{ fontSize: '10px', color: 'var(--aiims-text-muted, #94a3b8)' }}>{notif.timestamp}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--aiims-text-secondary, #475569)', marginTop: '2px' }}>
                      {notif.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Menu Dropdown */}
        <div
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '8px',
            position: 'relative'
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#e0e7ff',
            color: '#4f46e5',
            fontWeight: 700,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #c7d2fe'
          }}>
            {userName.charAt(0)}
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--aiims-text-primary, #0f172a)' }}>
            {userName}
          </span>
          <ChevronDown style={{ width: '14px', height: '14px', color: 'var(--aiims-text-secondary, #64748b)' }} />

          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              top: '42px',
              right: 0,
              width: '180px',
              backgroundColor: 'var(--aiims-modal-bg, #ffffff)',
              borderRadius: '12px',
              boxShadow: 'var(--aiims-shadow-dropdown, 0 10px 30px rgba(0, 0, 0, 0.15))',
              border: '1px solid var(--aiims-modal-border, #e2e8f0)',
              padding: '6px',
              zIndex: 200
            }}>
              <div
                onClick={() => setActiveTab('settings')}
                style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--aiims-text-primary, #0f172a)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--aiims-bg-card-hover, #f8fafc)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Settings size={14} /> Account Settings
              </div>
              <div
                onClick={() => setActiveTab('credits')}
                style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--aiims-text-primary, #0f172a)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--aiims-bg-card-hover, #f8fafc)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Wallet size={14} /> Wallet ({state.credits.balance} Credits)
              </div>
              <div style={{ height: '1px', backgroundColor: 'var(--aiims-border-card, #f1f5f9)', margin: '4px 0' }} />
              <div
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                }}
                style={{ padding: '8px 10px', fontSize: '12px', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--aiims-bg-card-hover, #f8fafc)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <LogOut size={14} color="#ef4444" /> Sign Out
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
