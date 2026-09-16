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
import { RadarSignal } from './types';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedSignal, setSelectedSignal] = useState<RadarSignal | null>(null);

  const handleStartInvestigation = (signal: RadarSignal) => {
    setSelectedSignal(signal);
    setActiveTab('investigation');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f4f6fc',
      color: '#0f172a',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Sticky Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Body Layout: Sidebar + Canvas */}
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 72px)' }}>
        {/* Left Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Content Area */}
        <main style={{
          flex: 1,
          padding: '32px 36px 60px 36px',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}>
          {activeTab === 'home' && (
            <HomeScreen setActiveTab={setActiveTab} />
          )}

          {activeTab === 'journey' && (
            <JourneyScreen setActiveTab={setActiveTab} />
          )}

          {activeTab === 'assessment' && (
            <AssessmentScreen
              onComplete={() => { setActiveTab('analysis'); }}
            />
          )}

          {activeTab === 'analysis' && <AnalysisScreen />}
          {activeTab === 'credits' && <CreditsScreen />}
          {activeTab === 'clarity' && <ClarityScreen />}
          {activeTab === 'focus' && <FocusScreen />}

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

          {activeTab === 'mentor' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '40px', border: '1px solid #eef2f6' }}>
              <h2 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: 700 }}>💬 AIIMS Mentor</h2>
              <p style={{ color: '#64748b' }}>Interactive AI Mentor chat and advice session...</p>
            </div>
          )}

          {activeTab === 'insights' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '40px', border: '1px solid #eef2f6' }}>
              <h2 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: 700 }}>📊 Growth Insights</h2>
              <p style={{ color: '#64748b' }}>Personalized learner growth analytics and progress trends...</p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '40px', border: '1px solid #eef2f6' }}>
              <h2 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: 700 }}>⚙️ Account Settings</h2>
              <p style={{ color: '#64748b' }}>Manage profile details, preferences, and notifications...</p>
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
