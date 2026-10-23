import React, { useState, useEffect, useRef } from 'react';
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
import {
  MessageCircle,
  BarChart3,
  Settings,
  Sun,
  Moon,
  LogOut,
  Volume2,
  VolumeX,
  Briefcase,
  GraduationCap,
  Wifi,
} from 'lucide-react';
import { getApiBaseUrl } from './api/client';

import { ThemeProvider, useTheme } from './context/ThemeContext';
import { DiscoverScreen } from './screens/discover/DiscoverScreen';
import { LoginScreen } from './screens/auth/LoginScreen';
import { PublicHeroScreen } from './screens/home/PublicHeroScreen';
import { AIWalletScreen } from './screens/wallet/AIWalletScreen';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LockedInterfaceScreen } from './components/common/LockedInterfaceScreen';
import { getFeatureAccess } from './services/featureAccessService';

// Interfaces locked for now — unlocking logic is managed centrally by featureAccessService
export const LOCKED_INTERFACES = [
  'radar',
  'investigation',
  'relevance',
  'solver',
  'build',
  'mentor',
];

const mapPathToTab = (path: string): string => {
  const cleanPath = path.toLowerCase().replace(/^\/+|\/+$/g, '');
  if (!cleanPath || cleanPath === 'index.html') return 'home';
  if (cleanPath === 'problem-solver' || cleanPath === 'solver') return 'solver';
  if (cleanPath === 'profile' || cleanPath === 'settings') return 'settings';
  if (cleanPath === 'wallet' || cleanPath === 'ai-wallet' || cleanPath === 'aiwallet')
    return 'wallet';
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

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const intendedRouteRef = useRef(intendedRoute);
  intendedRouteRef.current = intendedRoute;

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
          const targetTab =
            intendedRouteRef.current ||
            (activeTabRef.current === 'hero' ? 'hero' : activeTabRef.current || 'home');
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
    else if (
      currentPath === '/hero' ||
      currentPath === '/preview-hero' ||
      currentPath === '/' ||
      currentPath === '/index.html'
    )
      initialMode = 'home';

    return (
      <LoginScreen
        initialMode={initialMode}
        onSuccess={() => {
          const targetTab =
            intendedRoute || (state?.assessment?.status === 'completed' ? 'home' : 'assessment');
          setActiveTab(targetTab);
          setIntendedRoute(null);
        }}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--aiims-bg-page, #f8f7fd)',
        color: 'var(--aiims-text-primary, #0f172a)',
        fontFamily: "'Nunito', -apple-system, sans-serif",
      }}
    >
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
            transition: 'padding 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
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
                  {activeTab === 'home' && <HomeScreen setActiveTab={setActiveTab} />}

                  {activeTab === 'wallet' && <AIWalletScreen setActiveTab={setActiveTab} />}

                  {activeTab === 'discover' && <DiscoverScreen setActiveTab={setActiveTab} />}

                  {activeTab === 'journey' && <JourneyScreen setActiveTab={setActiveTab} />}

                  {activeTab === 'assessment' && (
                    <AssessmentScreen
                      onComplete={() => {
                        setActiveTab('analysis');
                      }}
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
                      onComplete={() => {
                        setActiveTab('relevance');
                      }}
                    />
                  )}

                  {activeTab === 'relevance' && <RelevanceScreen signal={selectedSignal} />}

                  {activeTab === 'solver' && <ProblemSolverScreen setActiveTab={setActiveTab} />}

                  {activeTab === 'build' && <BuildScreen setActiveTab={setActiveTab} />}

                  {activeTab === 'mentor' && (
                    <div
                      style={{
                        maxWidth: '900px',
                        margin: '0 auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                      }}
                    >
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
                    <div
                      style={{
                        maxWidth: '900px',
                        margin: '0 auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                      }}
                    >
                      <PageHeader
                        icon={<BarChart3 size={24} />}
                        title="Growth Insights"
                        description="Personalized progression trends and capability evaluation history."
                      />
                      <Surface variant="bordered" radius="lg" padding="lg">
                        <p
                          style={{
                            margin: 0,
                            fontSize: '14px',
                            color: 'var(--aiims-text-secondary, #64748b)',
                          }}
                        >
                          Insights connect directly to your baseline Assessment and completed
                          Clarity topics.
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
                    'home',
                    'wallet',
                    'discover',
                    'journey',
                    'assessment',
                    'analysis',
                    'credits',
                    'clarity',
                    'focus',
                    'radar',
                    'investigation',
                    'relevance',
                    'solver',
                    'build',
                    'mentor',
                    'insights',
                    'settings',
                    'hero',
                  ].includes(activeTab) && <HomeScreen setActiveTab={setActiveTab} />}
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
  const { state, setAudienceMode, updateFocusSessionConfig, logout } = useLearner();
  const { theme, setTheme, isDarkMode } = useTheme();

  const currentAudience = state.aiWallet?.audienceMode || 'student';
  const soundEnabled = state.focus?.sessionConfig?.soundEnabled ?? true;
  const defaultFocusMins = state.focus?.sessionConfig?.focusDurationMinutes ?? 25;

  const initials = state.profile.name
    ? state.profile.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'AI';

  const [apiUrlInput, setApiUrlInput] = useState<string>(() => {
    return localStorage.getItem('aiims_api_base_url') || '';
  });
  const [urlSavedMessage, setUrlSavedMessage] = useState<string>('');

  const handleSaveApiUrl = () => {
    const trimmed = apiUrlInput.trim();
    if (trimmed) {
      localStorage.setItem('aiims_api_base_url', trimmed);
      setUrlSavedMessage(`Saved: ${trimmed}`);
    } else {
      localStorage.removeItem('aiims_api_base_url');
      setUrlSavedMessage('Reset to default (/api)');
    }
    setTimeout(() => setUrlSavedMessage(''), 3000);
  };

  const handleResetApiUrl = () => {
    localStorage.removeItem('aiims_api_base_url');
    setApiUrlInput('');
    setUrlSavedMessage('Reset to default (/api)');
    setTimeout(() => setUrlSavedMessage(''), 3000);
  };

  return (
    <div
      style={{
        maxWidth: '960px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      <PageHeader
        icon={<Settings size={24} />}
        title="Account & System Settings"
        description="Manage your learner profile, learning lens, focus preferences, and theme appearance."
      />

      {/* 1. LEARNER IDENTITY CARD */}
      <Surface variant="bordered" radius="lg" padding="lg">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 800,
                fontFamily: "'Fredoka', sans-serif",
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
              }}
            >
              {initials}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '20px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading)',
                    fontFamily: "'Fredoka', sans-serif",
                  }}
                >
                  {state.profile.name || 'AIIMS Learner'}
                </h2>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    backgroundColor: 'var(--aiims-tint-indigo-bg)',
                    color: 'var(--aiims-primary)',
                  }}
                >
                  {state.profile.role || 'STUDENT'}
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    backgroundColor: 'var(--aiims-tint-emerald-bg)',
                    color: 'var(--aiims-tint-emerald-text)',
                  }}
                >
                  Stage: {state.profile.stage}
                </span>
              </div>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '13px',
                  color: 'var(--aiims-text-secondary)',
                }}
              >
                {state.profile.email} • ID:{' '}
                <code style={{ fontSize: '12px', color: 'var(--aiims-text-muted)' }}>
                  {state.profile.id || 'usr_active'}
                </code>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid var(--aiims-tint-rose-border)',
              backgroundColor: 'var(--aiims-tint-rose-bg)',
              color: 'var(--aiims-tint-rose-text)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              transition: 'opacity 0.15s ease',
            }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>

        {/* ACADEMIC PROFILE DETAILS (IF AVAILABLE) */}
        {state.academicProfile && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--aiims-bg-subtle)',
              borderRadius: '12px',
              border: '1px solid var(--aiims-border-subtle)',
              marginBottom: '16px',
              fontSize: '13px',
              color: 'var(--aiims-text-body)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--aiims-text-muted)',
                  display: 'block',
                  fontWeight: 700,
                }}
              >
                Program
              </span>
              <strong>
                {state.academicProfile.programName || state.academicProfile.educationLevel}
              </strong>
            </div>
            {state.academicProfile.specializationName && (
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--aiims-text-muted)',
                    display: 'block',
                    fontWeight: 700,
                  }}
                >
                  Specialization
                </span>
                <strong>{state.academicProfile.specializationName}</strong>
              </div>
            )}
            <div>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--aiims-text-muted)',
                  display: 'block',
                  fontWeight: 700,
                }}
              >
                Stream
              </span>
              <strong>{state.academicProfile.stream}</strong>
            </div>
            {state.academicProfile.instituteName && (
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--aiims-text-muted)',
                    display: 'block',
                    fontWeight: 700,
                  }}
                >
                  Institution
                </span>
                <strong>{state.academicProfile.instituteName}</strong>
              </div>
            )}
          </div>
        )}

        {/* PROGRESS METRICS CHIPS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
          }}
        >
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: 'var(--aiims-card-amber-bg)',
              border: '1px solid var(--aiims-card-amber-border)',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--aiims-card-amber-text)',
                textTransform: 'uppercase',
              }}
            >
              AIIMS Credits
            </span>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 900,
                color: 'var(--aiims-text-heading)',
                marginTop: '2px',
              }}
            >
              {state.credits.balance} AC
            </div>
          </div>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: 'var(--aiims-card-violet-bg)',
              border: '1px solid var(--aiims-card-violet-border)',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--aiims-card-violet-text)',
                textTransform: 'uppercase',
              }}
            >
              Total XP
            </span>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 900,
                color: 'var(--aiims-text-heading)',
                marginTop: '2px',
              }}
            >
              {state.profile.xpPoints || 0} XP
            </div>
          </div>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: 'var(--aiims-card-mint-bg)',
              border: '1px solid var(--aiims-card-mint-border)',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--aiims-card-mint-text)',
                textTransform: 'uppercase',
              }}
            >
              Assessment Status
            </span>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading)',
                marginTop: '4px',
              }}
            >
              {state.assessment.status === 'completed' ? '✓ Completed' : 'In Progress'}
            </div>
          </div>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: 'var(--aiims-card-sky-bg)',
              border: '1px solid var(--aiims-card-sky-border)',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--aiims-card-sky-text)',
                textTransform: 'uppercase',
              }}
            >
              Active Focus
            </span>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading)',
                marginTop: '4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {state.focus.selectedTrack || 'None Selected'}
            </div>
          </div>
        </div>
      </Surface>

      {/* 2. AUDIENCE MODE LENS */}
      <Surface variant="bordered" radius="lg" padding="lg">
        <div style={{ marginBottom: '14px' }}>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--aiims-text-heading)',
              marginBottom: '4px',
            }}
          >
            Audience Lens & Role Perspective
          </div>
          <p style={{ fontSize: '13px', color: 'var(--aiims-text-secondary)', margin: 0 }}>
            Choose how AIIMS curates tool discovery, clarity exercises, and workflow prompts for
            your profile.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px',
          }}
        >
          <div
            onClick={() => setAudienceMode('student')}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border:
                currentAudience === 'student'
                  ? '2px solid var(--aiims-primary)'
                  : '1px solid var(--aiims-border-subtle)',
              backgroundColor:
                currentAudience === 'student' ? 'var(--aiims-bg-card)' : 'var(--aiims-bg-subtle)',
              cursor: 'pointer',
              boxShadow: currentAudience === 'student' ? 'var(--aiims-shadow-card)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}
            >
              <GraduationCap
                size={20}
                color={
                  currentAudience === 'student' ? 'var(--aiims-primary)' : 'var(--aiims-text-muted)'
                }
              />
              <div
                style={{ fontSize: '15px', fontWeight: 800, color: 'var(--aiims-text-heading)' }}
              >
                Student / Academic Lens
              </div>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '12.5px',
                color: 'var(--aiims-text-secondary)',
                lineHeight: 1.45,
              }}
            >
              Tailored for learners mastering AI foundations, academic research workflows, exam
              prep, and agentic coding skills.
            </p>
          </div>

          <div
            onClick={() => setAudienceMode('entrepreneur')}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border:
                currentAudience === 'entrepreneur'
                  ? '2px solid var(--aiims-primary)'
                  : '1px solid var(--aiims-border-subtle)',
              backgroundColor:
                currentAudience === 'entrepreneur'
                  ? 'var(--aiims-bg-card)'
                  : 'var(--aiims-bg-subtle)',
              cursor: 'pointer',
              boxShadow: currentAudience === 'entrepreneur' ? 'var(--aiims-shadow-card)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}
            >
              <Briefcase
                size={20}
                color={
                  currentAudience === 'entrepreneur'
                    ? 'var(--aiims-primary)'
                    : 'var(--aiims-text-muted)'
                }
              />
              <div
                style={{ fontSize: '15px', fontWeight: 800, color: 'var(--aiims-text-heading)' }}
              >
                Entrepreneur / Builder Lens
              </div>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '12.5px',
                color: 'var(--aiims-text-secondary)',
                lineHeight: 1.45,
              }}
            >
              Tailored for builders, operators, and professionals automating business workflows,
              customer operations, and technical tooling.
            </p>
          </div>
        </div>
      </Surface>

      {/* 3. APPEARANCE & THEME SETTING */}
      <Surface variant="bordered" radius="lg" padding="lg">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--aiims-text-heading)',
                marginBottom: '4px',
              }}
            >
              Appearance & Theme
            </div>
            <p style={{ fontSize: '13px', color: 'var(--aiims-text-secondary)', margin: 0 }}>
              Customize your interface theme. Selection persists across sessions and synchronizes
              with the header toggle.
            </p>
          </div>
          <div
            style={{
              display: 'inline-flex',
              padding: '4px',
              backgroundColor: 'var(--aiims-bg-card-hover)',
              borderRadius: '12px',
              border: '1px solid var(--aiims-border-card)',
              gap: '4px',
            }}
          >
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
                backgroundColor: !isDarkMode ? 'var(--aiims-bg-card)' : 'transparent',
                color: !isDarkMode ? 'var(--aiims-primary)' : 'var(--aiims-text-secondary)',
                boxShadow: !isDarkMode ? 'var(--aiims-shadow-card)' : 'none',
                transition: 'all 0.2s ease',
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
                backgroundColor: isDarkMode ? 'var(--aiims-primary)' : 'transparent',
                color: isDarkMode ? '#ffffff' : 'var(--aiims-text-secondary)',
                boxShadow: isDarkMode ? 'var(--aiims-shadow-card)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <Moon size={16} /> Dark
            </button>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--aiims-text-muted)' }}>
          Active theme:{' '}
          <strong style={{ color: 'var(--aiims-text-heading)', textTransform: 'capitalize' }}>
            {theme} Theme
          </strong>
        </div>
      </Surface>

      {/* 4. FOCUS & TIMEKEEPING PREFERENCES */}
      <Surface variant="bordered" radius="lg" padding="lg">
        <div
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--aiims-text-heading)',
            marginBottom: '4px',
          }}
        >
          Focus Session Defaults
        </div>
        <p style={{ fontSize: '13px', color: 'var(--aiims-text-secondary)', margin: '0 0 16px' }}>
          Configure your default interval durations and completion alerts.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
              Default Block:
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[15, 25, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => updateFocusSessionConfig({ focusDurationMinutes: mins })}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border:
                      defaultFocusMins === mins
                        ? '2px solid var(--aiims-primary)'
                        : '1px solid var(--aiims-border-subtle)',
                    backgroundColor:
                      defaultFocusMins === mins ? 'var(--aiims-bg-card)' : 'var(--aiims-bg-subtle)',
                    color:
                      defaultFocusMins === mins
                        ? 'var(--aiims-primary)'
                        : 'var(--aiims-text-heading)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => updateFocusSessionConfig({ soundEnabled: !soundEnabled })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid var(--aiims-border-subtle)',
              backgroundColor: soundEnabled
                ? 'var(--aiims-card-mint-bg)'
                : 'var(--aiims-bg-subtle)',
              color: soundEnabled ? 'var(--aiims-card-mint-text)' : 'var(--aiims-text-muted)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>Sound Chimes: {soundEnabled ? 'Enabled' : 'Muted'}</span>
          </button>
        </div>
      </Surface>

      {/* 5. BACKEND & NETWORK CONNECTIVITY (Mobile & Android Configuration) */}
      <Surface variant="bordered" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Wifi size={18} style={{ color: 'var(--aiims-primary)' }} />
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
            Backend Server & Network Connectivity
          </div>
        </div>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--aiims-text-secondary)',
            margin: '0 0 16px',
            lineHeight: 1.5,
          }}
        >
          Configure the API endpoint used by AIIMS. Essential when running as an Android APK on an
          emulator or physical mobile phone.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              id="backend-api-url-input"
              value={apiUrlInput}
              onChange={(e) => setApiUrlInput(e.target.value)}
              placeholder="e.g. http://10.0.2.2:5001/api or http://192.168.1.10:5001/api"
              style={{
                flex: 1,
                minWidth: '240px',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--aiims-border-card)',
                backgroundColor: 'var(--aiims-bg-card)',
                color: 'var(--aiims-text-heading)',
                fontSize: '13px',
                fontFamily: 'monospace',
              }}
            />
            <button
              type="button"
              onClick={handleSaveApiUrl}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--aiims-primary)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Save URL
            </button>
            <button
              type="button"
              onClick={handleResetApiUrl}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--aiims-border-subtle)',
                backgroundColor: 'var(--aiims-bg-subtle)',
                color: 'var(--aiims-text-muted)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Reset (/api)
            </button>
          </div>

          {urlSavedMessage && (
            <div style={{ fontSize: '12.5px', color: 'var(--aiims-primary)', fontWeight: 600 }}>
              {urlSavedMessage}
            </div>
          )}

          <div
            style={{
              fontSize: '12px',
              color: 'var(--aiims-text-muted)',
              lineHeight: 1.5,
              backgroundColor: 'var(--aiims-bg-subtle)',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--aiims-border-subtle)',
            }}
          >
            <strong>Mobile Connectivity Guide:</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
              <li>
                <strong>Web Browser:</strong> Leave as default <code>/api</code> (proxied to backend
                automatically).
              </li>
              <li>
                <strong>Android Emulator:</strong> Use <code>http://10.0.2.2:5001/api</code> to
                reach development PC.
              </li>
              <li>
                <strong>Physical Android Phone:</strong> Use{' '}
                <code>http://&lt;your-pc-ip&gt;:5001/api</code> (phone and PC must be on the same
                Wi-Fi).
              </li>
            </ul>
          </div>
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
