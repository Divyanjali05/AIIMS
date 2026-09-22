import React, { useState } from 'react';
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

const AppContent: React.FC = () => {
  const [activeTab, setActiveTabState] = useState<string>(() => {
    return localStorage.getItem('aiims_active_tab') || 'home';
  });
  const [selectedSignal, setSelectedSignal] = useState<RadarSignal | null>(null);
  const { state, isAuthenticated } = useLearner();

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('aiims_active_tab', tab);
    } catch (e) {
      console.error('Failed to save activeTab', e);
    }
  };

  const handleStartInvestigation = (signal: RadarSignal) => {
    setSelectedSignal(signal);
    setActiveTab('investigation');
  };

  if (!isAuthenticated) {
    return <LoginScreen onSuccess={() => setActiveTab('home')} />;
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
