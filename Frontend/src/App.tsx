import React, { useState, useEffect } from 'react';
import { LearnerProvider, useLearner } from './context/LearnerContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { HomeScreen } from './screens/home/HomeScreen';
import { JourneyScreen } from './screens/journey/JourneyScreen';
import { AssessmentScreen } from './screens/assessment/AssessmentScreen';
import { AnalysisScreen } from './screens/analysis/AnalysisScreen';
import { CreditsScreen } from './screens/credits/CreditsScreen';
import { ClarityScreen } from './screens/clarity/ClarityScreen';
import { FocusScreen } from './screens/focus/FocusScreen';
import { RadarScreen } from './screens/radar/RadarScreen';
import { InvestigationScreen } from './screens/investigation/InvestigationScreen';
import { RelevanceScreen } from './screens/relevance/RelevanceScreen';
import { ProblemSolverScreen } from './screens/solver/ProblemSolverScreen';
import { BuildScreen } from './screens/build/BuildScreen';
import { RadarSignal } from './types';
import { Surface } from './components/common/Surface';
import { PageHeader } from './components/common/PageHeader';
import { MentorMessage } from './components/common/MentorMessage';
import { MessageCircle, BarChart3, Settings, Sun, Moon } from 'lucide-react';

import { ThemeProvider, useTheme } from './context/ThemeContext';
import { DiscoverScreen } from './screens/discover/DiscoverScreen';
import { LoginScreen } from './screens/auth/LoginScreen';
import { PublicHeroScreen } from './screens/home/PublicHeroScreen';
import { AIWalletScreen } from './screens/wallet/AIWalletScreen';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LockedInterfaceScreen } from './components/common/LockedInterfaceScreen';
import { getFeatureAccess } from './services/featureAccessService';

// Interfaces locked for now — unlocking logic is managed centrally by featureAccessService
export const LOCKED_INTERFACES = ['radar', 'investigation', 'relevance', 'solver', 'build', 'mentor'];

const mapPathToTab = (path: string): string => {
  const cleanPath = path.toLowerCase().replace(/^\/+|\/+$/g, '');
  if (!cleanPath || cleanPath === 'index.html') return 'home';
  if (cleanPath === 'problem-solver' || cleanPath === 'solver') return 'solver';
  if (cleanPath === 'profile' || cleanPath === 'settings') return 'settings';
  if (cleanPath === 'wallet' || cleanPath === 'ai-wallet' || cleanPath === 'aiwallet') return 'wallet';
  if (cleanPath === 'hero' || cleanPath === 'preview-hero') return 'hero';
  return cleanPath;
};

const mapTabToPath = (tab: string): string => {
  if (tab === 'home') return '/home';
  if (tab === 'solver') return '/problem-solver';
  if (tab === 'settings') return '/profile';
  if (tab === 'hero') return '/hero';
  return `/${tab}`;
};

const AppContent: React.FC = () => {
  const { state, isAuthenticated } = useLearner();
  const [intendedRoute, setIntendedRoute] = useState<string | null>(null);

  const [activeTab, setActiveTabState] = useState<string>(() => {
    const initialPath = window.location.pathname;
    const tabFromPath = mapPathToTab(initialPath);
    const publicPaths = ['', '/', '/login', '/register', '/index.html'];
    if (!publicPaths.includes(initialPath.toLowerCase())) {
      return tabFromPath;
    }
    return localStorage.getItem('aiims_active_tab') || 'home';
  });

  const [selectedSignal, setSelectedSignal] = useState<RadarSignal | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('aiims_sidebar_collapsed') === 'true';
  });

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('aiims_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Keyboard shortcut: Cmd+B / Ctrl+B for sidebar collapse toggle
  useEffect(() => {
    const handleSidebarShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleSidebarCollapse();
      }
    };
    window.addEventListener('keydown', handleSidebarShortcut);
    return () => window.removeEventListener('keydown', handleSidebarShortcut);
  }, []);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('aiims_active_tab', tab);
      const newPath = mapTabToPath(tab);
      if (window.location.pathname !== newPath) {
        window.history.pushState(null, '', newPath);
      }
    } catch (e) {
      console.error('Failed to save activeTab', e);
    }
  };

  // Sync route path changes & handle authorization checks
  useEffect(() => {
    const handleLocationSync = () => {
      const currentPath = window.location.pathname.toLowerCase();
      const publicPaths = ['/', '/hero', '/preview-hero', '/login', '/register', '/index.html'];

      if (!isAuthenticated) {
        if (!publicPaths.includes(currentPath)) {
          // Unauthenticated attempt to access protected route -> save intended route & redirect to /login
          const attemptedTab = mapPathToTab(currentPath);
          setIntendedRoute(attemptedTab);
          window.history.replaceState(null, '', '/login');
        }
      } else {
        // Authenticated user accessing auth routes or root -> redirect to dashboard
        if (['/', '/login', '/register', '/index.html'].includes(currentPath)) {
          const targetTab = intendedRoute || (activeTab === 'hero' ? 'hero' : (activeTab || 'home'));
          const targetPath = mapTabToPath(targetTab);
          window.history.replaceState(null, '', targetPath);
          setActiveTabState(targetTab);
          setIntendedRoute(null);
        } else {
          const pathTab = mapPathToTab(currentPath);
          setActiveTabState(pathTab);
        }
      }
    };

    handleLocationSync();
    window.addEventListener('popstate', handleLocationSync);
    return () => window.removeEventListener('popstate', handleLocationSync);
  }, [isAuthenticated]);

  const handleStartInvestigation = (signal: RadarSignal) => {
    setSelectedSignal(signal);
    setActiveTab('investigation');
  };

  // Handle Unauthenticated State (Public Home, Hero, Register, Login)
  if (!isAuthenticated) {
    const currentPath = window.location.pathname.toLowerCase();
    let initialMode: 'home' | 'login' | 'register' = 'home';
    if (currentPath === '/register') initialMode = 'register';
    else if (currentPath === '/login') initialMode = 'login';
    else if (currentPath === '/hero' || currentPath === '/preview-hero' || currentPath === '/' || currentPath === '/index.html') initialMode = 'home';

    return (
      <LoginScreen
        initialMode={initialMode}
        onSuccess={() => {
          const targetTab = intendedRoute || (state?.assessment?.status === 'completed' ? 'home' : 'assessment');
          setActiveTab(targetTab);
          setIntendedRoute(null);
        }}
      />
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--aiims-bg-page, #f8f7fd)',
      color: 'var(--aiims-text-primary, #0f172a)',
      fontFamily: "'Nunito', -apple-system, sans-serif"
    }}>
      {/* Sticky Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebarCollapse={handleToggleSidebarCollapse}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Body Layout: Sidebar + Canvas */}
      <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--aiims-header-height, 60px))' }}>
        {/* Left Navigation Sidebar (Desktop + Mobile Drawer) */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebarCollapse}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Canvas */}
        <main
          className={`aiims-main-canvas ${isSidebarCollapsed ? 'aiims-sidebar-collapsed' : 'aiims-sidebar-expanded'}`}
          style={{
            flex: 1,
            padding: '24px 32px 48px 32px',
            overflowY: 'auto',
            overflowX: 'hidden',
            boxSizing: 'border-box',
            minWidth: 0,
            transition: 'padding 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <ErrorBoundary onReset={() => setActiveTab('home')}>
            {(() => {
              const access = getFeatureAccess(activeTab, state);

              if (!access.unlocked) {
                return (
                  <div className="aiims-page-container">
                    <LockedInterfaceScreen targetTab={activeTab} setActiveTab={setActiveTab} />
                  </div>
                );
              }

              return (
                <div className="aiims-page-container">
                  {activeTab === 'home' && (
                    <HomeScreen setActiveTab={setActiveTab} />
                  )}

                  {activeTab === 'wallet' && (
                    <AIWalletScreen setActiveTab={setActiveTab} />
                  )}

                  {activeTab === 'discover' && (
                    <DiscoverScreen setActiveTab={setActiveTab} />
                  )}

                  {activeTab === 'journey' && (
                    <JourneyScreen setActiveTab={setActiveTab} />
                  )}

                  {activeTab === 'assessment' && (
                    <AssessmentScreen
                      onComplete={() => { setActiveTab('analysis'); }}
                      setActiveTab={setActiveTab}
                    />
                  )}

                  {activeTab === 'analysis' && <AnalysisScreen setActiveTab={setActiveTab} />}
                  {activeTab === 'credits' && <CreditsScreen />}
                  {activeTab === 'clarity' && <ClarityScreen setActiveTab={setActiveTab} />}
                  {activeTab === 'focus' && <FocusScreen setActiveTab={setActiveTab} />}

                  {activeTab === 'radar' && (
                    <RadarScreen onInvestigate={handleStartInvestigation} />
                  )}

                  {activeTab === 'investigation' && (
                    <InvestigationScreen
                      signal={selectedSignal}
                      onComplete={() => { setActiveTab('relevance'); }}
                    />
                  )}

                  {activeTab === 'relevance' && <RelevanceScreen signal={selectedSignal} />}

                  {activeTab === 'solver' && (
                    <ProblemSolverScreen setActiveTab={setActiveTab} />
                  )}

                  {activeTab === 'build' && (
                    <BuildScreen setActiveTab={setActiveTab} />
                  )}

                  {activeTab === 'mentor' && (
                    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <PageHeader
                        icon={<MessageCircle size={24} />}
                        title="AIIMS Mentor Workspace"
                        description="Contextual guidance and observations based on your real-time LearnerState."
                      />
                      <MentorMessage
                        title="AIIMS MENTOR ADVICE"
                        message={`"Hello ${state.profile.name.split(' ')[0]}! You are currently at the '${state.profile.stage}' stage of your AI journey. Keep advancing through your Focus track and Signal Investigations."`}
                      />
                    </div>
                  )}

                  {activeTab === 'insights' && (
                    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <PageHeader
                        icon={<BarChart3 size={24} />}
                        title="Growth Insights"
                        description="Personalized progression trends and capability evaluation history."
                      />
                      <Surface variant="bordered" radius="lg" padding="lg">
                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--aiims-text-secondary, #64748b)' }}>
                          Insights connect directly to your baseline Assessment and completed Clarity topics.
                        </p>
                      </Surface>
                    </div>
                  )}

                  {activeTab === 'hero' && (
                    <PublicHeroScreen
                      onStartJourney={() => setActiveTab('assessment')}
                      onSignIn={() => setActiveTab('home')}
                    />
                  )}

                  {activeTab === 'settings' && <SettingsView />}

                  {![
                    'home', 'wallet', 'discover', 'journey', 'assessment', 'analysis',
                    'credits', 'clarity', 'focus', 'radar', 'investigation', 'relevance',
                    'solver', 'build', 'mentor', 'insights', 'settings', 'hero'
                  ].includes(activeTab) && (
                    <HomeScreen setActiveTab={setActiveTab} />
                  )}
                </div>
              );
            })()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

const SettingsView: React.FC = () => {
  const { state } = useLearner();
  const { theme, setTheme, isDarkMode } = useTheme();

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        icon={<Settings size={24} />}
        title="Account & System Settings"
        description="Manage your profile settings, preferences, and theme appearance."
      />

      {/* Appearance & Theme Setting */}
      <Surface variant="bordered" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--aiims-text-heading, #0f172a)', marginBottom: '4px' }}>
              Appearance & Theme
            </div>
            <p style={{ fontSize: '13px', color: 'var(--aiims-text-secondary, #64748b)', margin: 0 }}>
              Customize your interface theme. Selection persists across sessions and synchronizes with the header toggle.
            </p>
          </div>
          <div style={{
            display: 'inline-flex',
            padding: '4px',
            backgroundColor: 'var(--aiims-bg-card-hover, #f1f5f9)',
            borderRadius: '12px',
            border: '1px solid var(--aiims-border-card, #e2e8f0)',
            gap: '4px'
          }}>
            <button
              id="theme-light-btn"
              type="button"
              onClick={() => setTheme('light')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: !isDarkMode ? 700 : 500,
                backgroundColor: !isDarkMode ? 'var(--aiims-bg-card, #ffffff)' : 'transparent',
                color: !isDarkMode ? '#4f46e5' : 'var(--aiims-text-secondary, #64748b)',
                boxShadow: !isDarkMode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Sun size={16} /> Light
            </button>
            <button
              id="theme-dark-btn"
              type="button"
              onClick={() => setTheme('dark')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: isDarkMode ? 700 : 500,
                backgroundColor: isDarkMode ? '#6366f1' : 'transparent',
                color: isDarkMode ? '#ffffff' : 'var(--aiims-text-secondary, #64748b)',
                boxShadow: isDarkMode ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Moon size={16} /> Dark
            </button>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--aiims-text-muted, #94a3b8)' }}>
          Active theme: <strong style={{ color: 'var(--aiims-text-primary, #0f172a)', textTransform: 'capitalize' }}>{theme} Theme</strong>
        </div>
      </Surface>

      {/* Learner Profile */}
      <Surface variant="bordered" radius="lg" padding="lg">
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--aiims-text-heading, #0f172a)', marginBottom: '8px' }}>
          Learner Profile
        </div>
        <p style={{ fontSize: '13px', color: 'var(--aiims-text-secondary, #64748b)', margin: 0 }}>
          Logged in as <strong>{state.profile.name}</strong> ({state.profile.email})
        </p>
        <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--aiims-text-muted, #94a3b8)' }}>
          Stage: {state.profile.stage} • ID: {state.profile.id}
        </div>
      </Surface>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LearnerProvider>
        <AppContent />
      </LearnerProvider>
    </ThemeProvider>
  );
};

export default App;
