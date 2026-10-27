import React, { useState, useEffect, useRef } from 'react';
import { LearnerProvider, useLearner } from './context/LearnerContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { BottomNav } from './components/common/BottomNav';
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
  Trash2,
  AlertTriangle,
  FileText,
  Shield,
  RefreshCw,
  Mail,
  Loader2,
  X,
} from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { getApiBaseUrl, apiClient } from './api/client';
import { SUPPORT_EMAIL } from './config/appConfig';
import { LegalScreen } from './screens/legal/LegalScreen';

import { ThemeProvider, useTheme } from './context/ThemeContext';
import { DiscoverScreen } from './screens/discover/DiscoverScreen';
import { LoginScreen } from './screens/auth/LoginScreen';
import { PublicHeroScreen } from './screens/home/PublicHeroScreen';
import { AIWalletScreen } from './screens/wallet/AIWalletScreen';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LockedInterfaceScreen } from './components/common/LockedInterfaceScreen';
import { getFeatureAccess } from './services/featureAccessService';
import { StaffHeader } from './components/staff/StaffHeader';
import { StaffLoginScreen } from './screens/staff/StaffLoginScreen';
import { EvaluatorQueueScreen } from './screens/staff/EvaluatorQueueScreen';
import { EvaluationReviewScreen } from './screens/staff/EvaluationReviewScreen';
import { AdminDashboardScreen } from './screens/staff/AdminDashboardScreen';

const mapPathToTab = (path: string): string => {
  const cleanPath = path.toLowerCase().replace(/^\/+|\/+$/g, '');
  if (!cleanPath || cleanPath === 'index.html') return 'home';
  if (cleanPath === 'privacy') return 'privacy';
  if (cleanPath === 'terms') return 'terms';
  if (cleanPath === 'refunds') return 'refunds';
  if (cleanPath.startsWith('staff/review/')) return cleanPath;
  if (cleanPath === 'staff/login') return 'staff/login';
  if (cleanPath === 'staff/queue') return 'staff/queue';
  if (cleanPath === 'staff/admin') return 'staff/admin';
  if (cleanPath === 'staff') return 'staff';
  if (cleanPath === 'problem-solver' || cleanPath === 'solver') return 'solver';
  if (cleanPath === 'profile' || cleanPath === 'settings') return 'settings';
  if (cleanPath === 'wallet' || cleanPath === 'ai-wallet' || cleanPath === 'aiwallet')
    return 'wallet';
  if (cleanPath === 'improve' || cleanPath === 'mentor' || cleanPath === 'mentor-workspace')
    return 'mentor';
  if (cleanPath === 'investigation' || cleanPath === 'signal-investigation') return 'investigation';
  if (cleanPath === 'insights' || cleanPath === 'growth-insights') return 'insights';
  if (cleanPath === 'hero' || cleanPath === 'preview-hero') return 'hero';
  return cleanPath;
};

const mapTabToPath = (tab: string): string => {
  if (tab === 'privacy') return '/privacy';
  if (tab === 'terms') return '/terms';
  if (tab === 'refunds') return '/refunds';
  if (tab.startsWith('staff/')) return `/${tab}`;
  if (tab === 'staff') return '/staff/queue';
  if (tab === 'home') return '/home';
  if (tab === 'solver') return '/problem-solver';
  if (tab === 'settings') return '/profile';
  if (tab === 'mentor') return '/improve';
  if (tab === 'investigation') return '/investigation';
  if (tab === 'insights') return '/growth-insights';
  if (tab === 'hero') return '/hero';
  return `/${tab}`;
};

const AppContent: React.FC = () => {
  const { state, isAuthenticated } = useLearner();
  const [intendedRoute, setIntendedRoute] = useState<string | null>(null);

  const [activeTab, setActiveTabState] = useState<string>(() => {
    const initialPath = window.location.pathname;
    const tabFromPath = mapPathToTab(initialPath);
    const publicPaths = [
      '',
      '/',
      '/login',
      '/register',
      '/index.html',
      '/hero',
      '/preview-hero',
      '/privacy',
      '/terms',
      '/refunds',
    ];
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
      const publicPaths = [
        '/',
        '/hero',
        '/preview-hero',
        '/login',
        '/register',
        '/index.html',
        '/staff/login',
        '/privacy',
        '/terms',
        '/refunds',
      ];

      if (!isAuthenticated) {
        if (currentPath.startsWith('/staff')) {
          if (currentPath !== '/staff/login') {
            window.history.replaceState(null, '', '/staff/login');
            setActiveTabState('staff/login');
          }
        } else if (!publicPaths.includes(currentPath)) {
          // Unauthenticated attempt to access protected route -> save intended route & redirect to /login
          const attemptedTab = mapPathToTab(currentPath);
          setIntendedRoute(attemptedTab);
          window.history.replaceState(null, '', '/login');
        }
      } else {
        const userRole = state?.profile?.role || 'learner';

        // 1. Learner opened /staff/* -> redirect away to /home immediately (show nothing role-specific)
        if (userRole === 'learner' && currentPath.startsWith('/staff')) {
          window.history.replaceState(null, '', '/home');
          setActiveTabState('home');
          return;
        }

        // 2. Evaluator opened /staff/admin -> redirect to /staff/queue
        if (userRole === 'evaluator' && currentPath === '/staff/admin') {
          window.history.replaceState(null, '', '/staff/queue');
          setActiveTabState('staff/queue');
          return;
        }

        // 3. Authenticated user accessing auth routes or staff login
        if (['/', '/login', '/register', '/index.html'].includes(currentPath)) {
          const targetTab =
            userRole === 'admin'
              ? 'staff/admin'
              : userRole === 'evaluator'
                ? 'staff/queue'
                : intendedRouteRef.current ||
                  (activeTabRef.current === 'hero' ? 'hero' : activeTabRef.current || 'home');
          const targetPath = mapTabToPath(targetTab);
          window.history.replaceState(null, '', targetPath);
          setActiveTabState(targetTab);
          setIntendedRoute(null);
        } else if (currentPath === '/staff/login' || currentPath === '/staff') {
          const targetPath =
            userRole === 'admin'
              ? '/staff/admin'
              : userRole === 'evaluator'
                ? '/staff/queue'
                : '/home';
          window.history.replaceState(null, '', targetPath);
          setActiveTabState(mapPathToTab(targetPath));
        } else {
          const pathTab = mapPathToTab(currentPath);
          setActiveTabState(pathTab);
        }
      }
    };

    handleLocationSync();
    window.addEventListener('popstate', handleLocationSync);
    return () => window.removeEventListener('popstate', handleLocationSync);
  }, [isAuthenticated, state?.profile?.role]);

  const handleStartInvestigation = (signal: RadarSignal) => {
    setSelectedSignal(signal);
    setActiveTab('investigation');
  };

  // Tab history stack to support back navigation through visited tabs
  const tabHistoryRef = useRef<string[]>([activeTab]);
  useEffect(() => {
    const stack = tabHistoryRef.current;
    if (stack[stack.length - 1] !== activeTab) {
      stack.push(activeTab);
    }
  }, [activeTab]);

  const isMobileMenuOpenRef = useRef(isMobileMenuOpen);
  isMobileMenuOpenRef.current = isMobileMenuOpen;
  const selectedSignalRef = useRef(selectedSignal);
  selectedSignalRef.current = selectedSignal;

  // Android Hardware Back Button wiring (Capacitor)
  // - Closes drawers/modals first
  // - Returns to previous screen in history
  // - Exits app only from the home screen
  useEffect(() => {
    let removeListener: (() => void) | null = null;

    const setupListener = async () => {
      try {
        if (!Capacitor.isNativePlatform()) return;

        const listenerHandle = await CapApp.addListener('backButton', ({ canGoBack }) => {
          // 1. Close mobile drawer menu if open
          if (isMobileMenuOpenRef.current) {
            setIsMobileMenuOpen(false);
            return;
          }

          // 2. Close active modal/signal investigation if open
          if (selectedSignalRef.current) {
            setSelectedSignal(null);
            return;
          }

          // 3. Check current route / tab
          const currentTab = activeTabRef.current;
          const isAtHomeScreen = currentTab === 'home' || currentTab === 'hero';

          if (isAtHomeScreen) {
            // Exit app only from the home screen
            CapApp.exitApp();
            return;
          }

          // 4. Return to previous screen
          const stack = tabHistoryRef.current;
          if (stack.length > 1) {
            stack.pop(); // remove current
            const previousTab = stack[stack.length - 1] || 'home';
            setActiveTab(previousTab);
          } else if (canGoBack && window.history.length > 1) {
            window.history.back();
          } else {
            setActiveTab('home');
          }
        });

        removeListener = () => {
          listenerHandle.remove();
        };
      } catch (err) {
        console.warn('[Capacitor] Failed to wire Android back button:', err);
      }
    };

    setupListener();

    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, []);

  // Handle Unauthenticated State (Public Home, Hero, Register, Login, Staff Login)
  if (!isAuthenticated) {
    const currentPath = window.location.pathname.toLowerCase();

    // Dedicated Staff Login Route
    if (currentPath.startsWith('/staff')) {
      return (
        <StaffLoginScreen
          onSuccess={(role) => {
            const target = role === 'admin' ? '/staff/admin' : '/staff/queue';
            window.history.pushState(null, '', target);
            setActiveTabState(mapPathToTab(target));
          }}
        />
      );
    }

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

  const userRole = state?.profile?.role || 'learner';
  const currentPath = window.location.pathname.toLowerCase();

  // STAFF PORTAL WORKSPACE (for Evaluator & Admin users accessing /staff/*)
  if ((userRole === 'evaluator' || userRole === 'admin') && currentPath.startsWith('/staff')) {
    const rawPath = window.location.pathname;
    const reviewId = currentPath.startsWith('/staff/review/')
      ? rawPath.replace(/^\/staff\/review\/?/i, '').split('/')[0]
      : '';

    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--aiims-bg-page, #f8f7fd)',
          color: 'var(--aiims-text-primary, #0f172a)',
          fontFamily: "'Nunito', -apple-system, sans-serif",
        }}
      >
        <StaffHeader
          currentPath={currentPath}
          onNavigate={(path) => {
            window.history.pushState(null, '', path);
            setActiveTabState(mapPathToTab(path));
          }}
        />

        <main
          style={{
            minHeight: 'calc(100vh - 64px)',
            paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {currentPath.startsWith('/staff/queue') && (
            <EvaluatorQueueScreen
              onSelectSubmission={(id) => {
                const target = `/staff/review/${id}`;
                window.history.pushState(null, '', target);
                setActiveTabState(mapPathToTab(target));
              }}
              onNavigate={(path) => {
                window.history.pushState(null, '', path);
                setActiveTabState(mapPathToTab(path));
              }}
            />
          )}

          {currentPath.startsWith('/staff/review') && (
            <EvaluationReviewScreen
              submissionId={reviewId}
              onBackToQueue={() => {
                window.history.pushState(null, '', '/staff/queue');
                setActiveTabState('staff/queue');
              }}
            />
          )}

          {currentPath.startsWith('/staff/admin') &&
            (userRole === 'admin' ? (
              <AdminDashboardScreen />
            ) : (
              <EvaluatorQueueScreen
                onSelectSubmission={(id) => {
                  const target = `/staff/review/${id}`;
                  window.history.pushState(null, '', target);
                  setActiveTabState(mapPathToTab(target));
                }}
              />
            ))}
        </main>
      </div>
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

                  {activeTab === 'settings' && <SettingsView onNavigateTab={setActiveTab} />}

                  {(activeTab === 'privacy' ||
                    activeTab === 'terms' ||
                    activeTab === 'refunds') && (
                    <LegalScreen
                      initialTab={activeTab as 'privacy' | 'terms' | 'refunds'}
                      onNavigate={(tab) => setActiveTab(tab)}
                      onBack={() => setActiveTab(isAuthenticated ? 'settings' : 'home')}
                    />
                  )}

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
                    'privacy',
                    'terms',
                    'refunds',
                  ].includes(activeTab) && <HomeScreen setActiveTab={setActiveTab} />}

                  {/* Persistent Web Footer */}
                  <footer
                    style={{
                      marginTop: '48px',
                      paddingTop: '20px',
                      paddingBottom: '20px',
                      borderTop: '1px solid var(--aiims-border-subtle, #E2E8F0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      fontSize: '12px',
                      color: 'var(--aiims-text-muted, #94A3B8)',
                    }}
                  >
                    <div>
                      © {new Date().getFullYear()} AIIMS · AI Capability Diagnostic & Mentoring
                      Platform
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveTab('privacy')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          fontSize: 'inherit',
                          padding: 0,
                          fontWeight: 500,
                        }}
                      >
                        Privacy Policy
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('terms')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          fontSize: 'inherit',
                          padding: 0,
                          fontWeight: 500,
                        }}
                      >
                        Terms of Service
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('refunds')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          fontSize: 'inherit',
                          padding: 0,
                          fontWeight: 500,
                        }}
                      >
                        Refunds
                      </button>
                      <span>•</span>
                      <a
                        href={`mailto:${SUPPORT_EMAIL}`}
                        style={{ color: 'inherit', textDecoration: 'none', fontWeight: 500 }}
                      >
                        Support ({SUPPORT_EMAIL})
                      </a>
                    </div>
                  </footer>
                </div>
              );
            })()}
          </ErrorBoundary>
        </main>
      </div>

      {/* Fixed Mobile Bottom Navigation Bar (< 768px with safe-area support) */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

interface SettingsViewProps {
  onNavigateTab?: (tab: string) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onNavigateTab }) => {
  const { state, setAudienceMode, updateFocusSessionConfig, logout } = useLearner();
  const { theme, setTheme, isDarkMode } = useTheme();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteAccount = async () => {
    if (deleteConfirmationInput.trim() !== 'DELETE') return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const res = await apiClient.deleteAccount('DELETE');
      if (res && res.success) {
        try {
          localStorage.clear();
        } catch {}
        await logout();
        window.location.href = '/login';
      } else {
        setDeleteError(res?.error || 'Failed to delete account. Please try again.');
      }
    } catch {
      setDeleteError('An unexpected network error occurred while deleting account.');
    } finally {
      setIsDeleting(false);
    }
  };

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

      {/* 6. LEGAL & PLATFORM POLICIES (App Store & Play Store Required) */}
      <Surface variant="bordered" radius="lg" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Shield size={18} style={{ color: 'var(--aiims-primary)' }} />
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
            Legal Documents & Platform Policies
          </div>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--aiims-text-secondary)', margin: '0 0 16px' }}>
          Review public policy documents, terms of service, and support channels for AIIMS.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={() =>
              onNavigateTab ? onNavigateTab('privacy') : (window.location.href = '/privacy')
            }
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              border: '1px solid var(--aiims-border-subtle)',
              backgroundColor: 'var(--aiims-bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <Shield size={18} color="var(--aiims-primary)" />
            <div>
              <div
                style={{ fontSize: '13px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}
              >
                Privacy Policy
              </div>
              <div style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}>
                Data safety & retention
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              onNavigateTab ? onNavigateTab('terms') : (window.location.href = '/terms')
            }
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              border: '1px solid var(--aiims-border-subtle)',
              backgroundColor: 'var(--aiims-bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <FileText size={18} color="var(--aiims-primary)" />
            <div>
              <div
                style={{ fontSize: '13px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}
              >
                Terms of Service
              </div>
              <div style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}>
                Platform terms of use
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              onNavigateTab ? onNavigateTab('refunds') : (window.location.href = '/refunds')
            }
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              border: '1px solid var(--aiims-border-subtle)',
              backgroundColor: 'var(--aiims-bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <RefreshCw size={18} color="var(--aiims-primary)" />
            <div>
              <div
                style={{ fontSize: '13px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}
              >
                Refunds & Credits
              </div>
              <div style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}>
                Credit rules & disputes
              </div>
            </div>
          </button>

          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              border: '1px solid var(--aiims-border-subtle)',
              backgroundColor: 'var(--aiims-bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Mail size={18} color="var(--aiims-primary)" />
            <div>
              <div
                style={{ fontSize: '13px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}
              >
                Support Contact
              </div>
              <div style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}>
                {SUPPORT_EMAIL}
              </div>
            </div>
          </a>
        </div>
      </Surface>

      {/* 7. DANGER ZONE: IN-APP ACCOUNT DELETION */}
      <Surface
        variant="bordered"
        radius="lg"
        padding="lg"
        style={{
          borderColor: 'rgba(239, 68, 68, 0.3)',
          backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.04)' : '#FEF2F2',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <AlertTriangle size={20} color="#DC2626" />
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#DC2626' }}>
            Danger Zone: Delete My Account
          </div>
        </div>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--aiims-text-secondary)',
            margin: '0 0 16px',
            lineHeight: 1.55,
          }}
        >
          Permanently delete your AIIMS account, profile data, assessment answers, clarity
          reflections, and task submissions. In compliance with store privacy guidelines, personal
          data is permanently purged. Non-personal credit ledger transaction entries are anonymized
          to maintain accounting totals. This action is immediate and cannot be undone.
        </p>

        <button
          id="delete-account-trigger-btn"
          type="button"
          onClick={() => {
            setDeleteConfirmationInput('');
            setDeleteError('');
            setIsDeleteModalOpen(true);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            border: '1px solid #DC2626',
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'opacity 0.2s ease',
          }}
        >
          <Trash2 size={16} /> Delete my account
        </button>
      </Surface>

      {/* Account Deletion Confirmation Modal */}
      {isDeleteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--aiims-bg-card, #FFFFFF)',
              borderRadius: '18px',
              border: '1px solid var(--aiims-border-card, #E2E8F0)',
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            <button
              type="button"
              onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
              aria-label="Close modal"
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'none',
                border: 'none',
                color: 'var(--aiims-text-muted, #94A3B8)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={20} />
            </button>

            <div
              style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DC2626',
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading, #0F172A)',
                  }}
                >
                  Confirm Account Deletion
                </h3>
                <span style={{ fontSize: '12px', color: '#DC2626', fontWeight: 700 }}>
                  Irreversible Action
                </span>
              </div>
            </div>

            <div
              style={{
                fontSize: '13.5px',
                color: 'var(--aiims-text-secondary, #64748B)',
                lineHeight: 1.55,
                marginBottom: '18px',
              }}
            >
              <p style={{ margin: '0 0 10px' }}>
                You are about to permanently delete your AIIMS account (
                <strong style={{ color: 'var(--aiims-text-heading)' }}>
                  {state.profile.email}
                </strong>
                ).
              </p>
              <div
                style={{
                  backgroundColor: 'var(--aiims-bg-subtle, #F8F9FE)',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--aiims-border-subtle, #E2E8F0)',
                  fontSize: '12.5px',
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: 'var(--aiims-text-heading)',
                    marginBottom: '4px',
                  }}
                >
                  What happens when you delete your account:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li>All profile data, academic details, and personal tokens are purged.</li>
                  <li>
                    Assessment answers, clarity reflections, and submission content are removed.
                  </li>
                  <li>You will be logged out and cannot sign in with this account again.</li>
                  <li>
                    Non-personal transaction records needed for ledger reconciliation are kept in
                    anonymized form.
                  </li>
                </ul>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label
                htmlFor="delete-confirm-input"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--aiims-text-heading, #0F172A)',
                  marginBottom: '8px',
                }}
              >
                To confirm, type <span style={{ color: '#DC2626', fontWeight: 900 }}>DELETE</span>{' '}
                below:
              </label>
              <input
                id="delete-confirm-input"
                type="text"
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                placeholder="Type DELETE"
                disabled={isDeleting}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border:
                    deleteConfirmationInput === 'DELETE'
                      ? '2px solid #DC2626'
                      : '1px solid var(--aiims-border-card, #E2E8F0)',
                  backgroundColor: 'var(--aiims-bg-card, #FFFFFF)',
                  color: 'var(--aiims-text-heading, #0F172A)',
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {deleteError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#FEE2E2',
                  color: '#DC2626',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: '1px solid var(--aiims-border-card, #E2E8F0)',
                  backgroundColor: 'var(--aiims-bg-card, #FFFFFF)',
                  color: 'var(--aiims-text-secondary, #64748B)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                id="confirm-delete-account-btn"
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmationInput.trim() !== 'DELETE' || isDeleting}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor:
                    deleteConfirmationInput.trim() === 'DELETE' ? '#DC2626' : '#94A3B8',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor:
                    deleteConfirmationInput.trim() === 'DELETE' && !isDeleting
                      ? 'pointer'
                      : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'aiimsSpin 1s linear infinite' }} />
                    Deleting Account...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} /> Permanently Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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
