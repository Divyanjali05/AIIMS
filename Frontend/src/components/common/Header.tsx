import React, { useState } from 'react';
import { Search, Sun, Moon, Bell, ChevronDown, Check, Coins, Sparkles, X, ArrowRight } from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const { state, markNotificationRead, clearNotifications } = useLearner();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const unreadCount = state.notifications.filter((n) => !n.read).length;
  const userName = state.profile?.name ? state.profile.name.split(' ')[0] : 'Divya';

  const searchableFeatures = [
    { title: 'Take Baseline Assessment', desc: '25-question multidimensional diagnostic', tab: 'assessment' },
    { title: 'View AI Profile Analysis', desc: 'Individual, comparison, & cohort insights', tab: 'analysis' },
    { title: 'Explore AI Radar', desc: 'Emerging tech shifts & model releases', tab: 'radar' },
    { title: 'AIIMS Credits Wallet', desc: 'View transactions & earned balance', tab: 'credits' },
    { title: 'Talk to AIIMS Mentor', desc: 'Personalized AI advice & guidance', tab: 'mentor' },
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
      height: '72px',
      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
      borderBottom: isDarkMode ? '1px solid #1e293b' : '1px solid #eef2f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxSizing: 'border-box',
      transition: 'all 0.3s ease'
    }}>
      {/* Brand Logo & Tagline */}
      <div
        onClick={() => setActiveTab('home')}
        style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
      >
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #ec4899 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 900,
          fontSize: '20px',
          fontFamily: "'Outfit', sans-serif",
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
        }}>
          A
        </div>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '22px',
            fontWeight: 800,
            color: isDarkMode ? '#f8fafc' : '#0f172a',
            fontFamily: "'Outfit', sans-serif",
            letterSpacing: '-0.3px',
            lineHeight: 1
          }}>
            AIIMS
          </h1>
          <p style={{
            margin: '3px 0 0 0',
            fontSize: '10px',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            fontWeight: 500,
            letterSpacing: '0.3px'
          }}>
            Learn • Think • Create • Grow
          </p>
        </div>
      </div>

      {/* Center Search Pill */}
      <div style={{ position: 'relative', width: '420px', maxWidth: '40%' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
          padding: '10px 18px',
          borderRadius: '9999px',
          border: '1px solid transparent',
          transition: 'all 0.2s ease',
        }}>
          <Search style={{ width: '16px', height: '16px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Ask AIIMS anything..."
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
              color: isDarkMode ? '#f8fafc' : '#1e293b',
              width: '100%',
              fontFamily: "'Inter', sans-serif"
            }}
          />
          {searchQuery && (
            <X
              style={{ width: '16px', height: '16px', color: '#94a3b8', cursor: 'pointer' }}
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
            top: '52px',
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.12)',
            border: '1px solid #e2e8f0',
            padding: '12px',
            zIndex: 200,
            maxHeight: '360px',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px 10px 10px', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>AIIMS Quick Search</span>
              <X style={{ width: '14px', height: '14px', color: '#94a3b8', cursor: 'pointer' }} onClick={() => setShowSearchModal(false)} />
            </div>

            <div style={{ marginTop: '8px' }}>
              {filteredSearchResults.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setActiveTab(item.tab);
                    setShowSearchModal(false);
                    setSearchQuery('');
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
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

      {/* Right User Actions & Dynamic State */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

        {/* Live Credits Badge Pill */}
        <div
          onClick={() => setActiveTab('credits')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: '#fef3c7',
            borderRadius: '9999px',
            border: '1px solid #fde68a',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 700,
            color: '#b45309',
            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.12)'
          }}
        >
          <Coins style={{ width: '16px', height: '16px', color: '#d97706' }} />
          <span>{state.credits.balance} Credits</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          title="Toggle Daylight / Dark Theme"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
            border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: isDarkMode ? '#fbbf24' : '#64748b',
            transition: 'all 0.2s ease'
          }}
        >
          {isDarkMode ? <Moon style={{ width: '18px', height: '18px' }} /> : <Sun style={{ width: '18px', height: '18px' }} />}
        </button>

        {/* Interactive Notifications Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
              border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: unreadCount > 0 ? '#4f46e5' : '#64748b',
              transition: 'all 0.2s ease'
            }}
          >
            <Bell style={{ width: '18px', height: '18px' }} />
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
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #ffffff'
            }}>
              {unreadCount}
            </span>
          )}

          {/* Notifications Dropdown Modal */}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: '48px',
              right: 0,
              width: '320px',
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.12)',
              border: '1px solid #e2e8f0',
              padding: '16px',
              zIndex: 200
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Notifications ({unreadCount} new)</span>
                <span
                  onClick={clearNotifications}
                  style={{ fontSize: '11px', color: '#4f46e5', fontWeight: 600, cursor: 'pointer' }}
                >
                  Mark all read
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                {state.notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '12px',
                      backgroundColor: notif.read ? '#f8fafc' : '#eef2ff',
                      border: notif.read ? '1px solid #f1f5f9' : '1px solid #c7d2fe',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{notif.title}</span>
                      <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>{notif.timestamp}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px', lineHeight: 1.35 }}>
                      {notif.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile dropdown */}
        <div
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '12px',
            position: 'relative'
          }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2px solid #e2e8f0',
            backgroundColor: '#e0e7ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
              alt="User profile"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: isDarkMode ? '#f8fafc' : '#0f172a', lineHeight: '1.2' }}>
              Hi, {userName}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
              {state.profile.role.split('/')[0]}
            </div>
          </div>
          <ChevronDown style={{ width: '16px', height: '16px', color: '#64748b', marginLeft: '2px' }} />

          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              top: '50px',
              right: 0,
              width: '200px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.12)',
              border: '1px solid #e2e8f0',
              padding: '8px',
              zIndex: 200
            }}>
              <div
                onClick={() => setActiveTab('settings')}
                style={{ padding: '10px', fontSize: '13px', color: '#0f172a', borderRadius: '8px', cursor: 'pointer' }}
              >
                ⚙️ Account Settings
              </div>
              <div
                onClick={() => setActiveTab('credits')}
                style={{ padding: '10px', fontSize: '13px', color: '#0f172a', borderRadius: '8px', cursor: 'pointer' }}
              >
                🪙 Wallet ({state.credits.balance} Credits)
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
