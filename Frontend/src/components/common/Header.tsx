import React, { useState } from 'react';
import { Search, Sun, Moon, Bell, ChevronDown, Coins, X, ArrowRight, Settings, Wallet, Sparkles, MessageCircle, LogOut } from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { Badge } from './Badge';
import { buildLearnerProfileContext } from '../../services/learnerProfileContext';
import { MentorService } from '../../services/mentorProvider';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const { state, markNotificationRead, clearNotifications, logout } = useLearner();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
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
    { title: 'Take Baseline Assessment', desc: '25-question multidimensional diagnostic', tab: 'assessment' },
    { title: 'View AI Profile Analysis', desc: 'Individual, comparison, & cohort insights', tab: 'analysis' },
    { title: 'Explore AI Radar', desc: 'Emerging tech shifts & model releases', tab: 'radar' },
    { title: 'AIIMS Credits Wallet', desc: 'View transactions & earned balance', tab: 'credits' },
    { title: 'Select Focus Track', desc: 'Prioritize skill development tracks', tab: 'focus' },
    { title: 'My AI Journey', desc: 'Development timeline & milestone history', tab: 'journey' },
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
    <header style={{
      height: '64px',
      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
      borderBottom: isDarkMode ? '1px solid #1e293b' : '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxSizing: 'border-box',
      transition: 'all 0.2s ease'
    }}>
      {/* Brand Logo & Top Primary Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div
          onClick={() => setActiveTab('home')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '18px',
            fontFamily: "'Fredoka', sans-serif",
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}>
            A
          </div>
          <div>
            <span style={{
              fontSize: '20px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #6366f1 0%, #9333ea 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: "'Fredoka', sans-serif",
              letterSpacing: '-0.3px'
            }}>
              AIIMS
            </span>
          </div>
        </div>

        {/* Top Primary Navigation Links with Semantic Active Colors */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {[
            { id: 'home', label: 'Home', activeBg: '#eef2ff', activeColor: '#4338ca' },
            { id: 'journey', label: 'My Journey', activeBg: '#f3e8ff', activeColor: '#6b21a8' },
            { id: 'discover', label: 'Discover', activeBg: '#e0f2fe', activeColor: '#0369a1' },
            { id: 'clarity', label: 'Develop', activeBg: '#ecfdf5', activeColor: '#047857' },
            { id: 'radar', label: 'AI Change', activeBg: '#ecfeff', activeColor: '#155e75' },
            { id: 'mentor', label: 'Mentor', activeBg: '#f3e8ff', activeColor: '#6b21a8' }
          ].map((tab) => {
            const isActive = activeTab === tab.id || (tab.id === 'clarity' && (activeTab === 'clarity' || activeTab === 'focus')) || (tab.id === 'radar' && (activeTab === 'radar' || activeTab === 'investigation' || activeTab === 'relevance'));
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  backgroundColor: isActive ? tab.activeBg : 'transparent',
                  color: isActive ? tab.activeColor : '#475569',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '7px 15px',
                  fontSize: '13px',
                  fontWeight: isActive ? 800 : 600,
                  fontFamily: "'Nunito', sans-serif",
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', width: '380px', maxWidth: '35%' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: isDarkMode ? '#1e293b' : '#f4f3ff',
          padding: '8px 14px',
          borderRadius: '9999px',
          border: '1px solid #ede9fe',
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
              color: isDarkMode ? '#f8fafc' : '#0f172a',
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
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e2e8f0',
            padding: '8px',
            zIndex: 200,
            maxHeight: '320px',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px 8px 8px', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Quick Search</span>
              <X style={{ width: '14px', height: '14px', color: '#94a3b8', cursor: 'pointer' }} onClick={() => setShowSearchModal(false)} />
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
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{item.desc}</div>
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

        {/* Notifications Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
              border: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: unreadCount > 0 ? '#4f46e5' : '#64748b'
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
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
              padding: '12px',
              zIndex: 200
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Notifications</span>
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
                      backgroundColor: notif.read ? '#f8fafc' : '#e0e7ff',
                      border: notif.read ? '1px solid #f1f5f9' : '1px solid #c7d2fe',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{notif.title}</span>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{notif.timestamp}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
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
          <span style={{ fontSize: '13px', fontWeight: 600, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
            {userName}
          </span>
          <ChevronDown style={{ width: '14px', height: '14px', color: '#64748b' }} />

          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              top: '42px',
              right: 0,
              width: '180px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
              padding: '6px',
              zIndex: 200
            }}>
              <div
                onClick={() => setActiveTab('settings')}
                style={{ padding: '8px 10px', fontSize: '12px', color: '#0f172a', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Settings size={14} /> Account Settings
              </div>
              <div
                onClick={() => setActiveTab('credits')}
                style={{ padding: '8px 10px', fontSize: '12px', color: '#0f172a', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Wallet size={14} /> Wallet ({state.credits.balance} Credits)
              </div>
              <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '4px 0' }} />
              <div
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                }}
                style={{ padding: '8px 10px', fontSize: '12px', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
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
