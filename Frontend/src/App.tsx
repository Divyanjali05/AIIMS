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
import { MessageCircle, BarChart3, Settings } from 'lucide-react';

import { DiscoverScreen } from './screens/discover/DiscoverScreen';
import { LoginScreen } from './screens/auth/LoginScreen';
import { AIWalletScreen } from './screens/wallet/AIWalletScreen';

const mapPathToTab = (path: string): string => {
  const cleanPath = path.toLowerCase().replace(/^\/+|\/+$/g, '');
  if (!cleanPath || cleanPath === 'index.html') return 'home';
  if (cleanPath === 'problem-solver' || cleanPath === 'solver') return 'solver';
  if (cleanPath === 'profile' || cleanPath === 'settings') return 'settings';
  if (cleanPath === 'wallet' || cleanPath === 'ai-wallet') return 'wallet';
  return cleanPath;
};

const mapTabToPath = (tab: string): string => {
  if (tab === 'home') return '/home';
  if (tab === 'solver') return '/problem-solver';
  if (tab === 'settings') return '/profile';
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
      const publicPaths = ['/', '/login', '/register', '/index.html'];

      if (!isAuthenticated) {
        if (!publicPaths.includes(currentPath)) {
          // Unauthenticated attempt to access protected route -> save intended route & redirect to /login
          const attemptedTab = mapPathToTab(currentPath);
          setIntendedRoute(attemptedTab);
          window.history.replaceState(null, '', '/login');
        }
      } else {
        // Authenticated user accessing public path -> redirect to intended route or /home
        if (publicPaths.includes(currentPath)) {
          const targetTab = intendedRoute || activeTab || 'home';
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

  // Handle Unauthenticated State (Public Home, Register, Login)
  if (!isAuthenticated) {
    const currentPath = window.location.pathname.toLowerCase();
    let initialMode: 'home' | 'login' | 'register' = 'home';
    if (currentPath === '/register') initialMode = 'register';
    else if (currentPath === '/login') initialMode = 'login';

    return (
      <LoginScreen
        initialMode={initialMode}
        onSuccess={() => {
          const targetTab = intendedRoute || 'home';
          setActiveTab(targetTab);
          setIntendedRoute(null);
        }}
      />
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f7fd',
      color: '#0f172a',
      fontFamily: "'Nunito', -apple-system, sans-serif"
    }}>
      {/* Sticky Top Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Body Layout: Sidebar + Canvas */}
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
        {/* Left Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Content Canvas */}
        <main style={{
          flex: 1,
          padding: '24px 32px 48px 32px',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}>
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
                title="Ainova Mentor Workspace"
                description="Contextual guidance and observations based on your real-time LearnerState."
              />
              <MentorMessage
                title="AINOVA MENTOR ADVICE"
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
                <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                  Insights connect directly to your baseline Assessment and completed Clarity topics.
                </p>
              </Surface>
            </div>
          )}

          {activeTab === 'settings' && (
            <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <PageHeader
                icon={<Settings size={24} />}
                title="Account Settings"
                description="Manage your profile settings, preferences, and notifications."
              />
              <Surface variant="bordered" radius="lg" padding="lg">
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                  Learner Profile
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Logged in as {state.profile.name} ({state.profile.email})
                </p>
              </Surface>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <LearnerProvider>
      <AppContent />
    </LearnerProvider>
  );
};

export default App;
