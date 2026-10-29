import React, { useState, useEffect } from 'react';
import { Shield, FileText, RefreshCw, Mail, ArrowLeft, AlertTriangle } from 'lucide-react';
import { SUPPORT_EMAIL } from '../../config/appConfig';
import { AiimsLogo } from '../../components/common/AiimsLogo';
import { useTheme } from '../../context/ThemeContext';

export type LegalTab = 'privacy' | 'terms' | 'refunds';

interface LegalScreenProps {
  initialTab?: LegalTab;
  onNavigate?: (tab: string) => void;
  onBack?: () => void;
}

export const LegalScreen: React.FC<LegalScreenProps> = ({
  initialTab = 'privacy',
  onNavigate,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);
  const { isDarkMode } = useTheme();

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (tab: LegalTab) => {
    setActiveTab(tab);
    if (onNavigate) {
      onNavigate(tab);
    } else {
      window.history.pushState(null, '', `/${tab}`);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('home');
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: 'var(--aiims-bg-page, #F8F9FE)',
        color: 'var(--aiims-text-primary, #0F172A)',
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
        boxSizing: 'border-box',
        padding: '32px 16px 80px',
      }}
    >
      <div
        style={{
          maxWidth: '920px',
          margin: '0 auto',
        }}
      >
        {/* Navigation Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={handleBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: '1px solid var(--aiims-border-card, #E2E8F0)',
              backgroundColor: 'var(--aiims-bg-card, #ffffff)',
              color: 'var(--aiims-text-secondary, #64748B)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AiimsLogo size="sm" showWordmark={true} />
          </div>
        </div>

        {/* Tab Selection */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--aiims-bg-card-hover, rgba(0,0,0,0.03))',
            padding: '6px',
            borderRadius: '14px',
            border: '1px solid var(--aiims-border-card, #E2E8F0)',
            marginBottom: '24px',
            overflowX: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => handleTabChange('privacy')}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === 'privacy' ? 800 : 600,
              backgroundColor:
                activeTab === 'privacy' ? 'var(--aiims-bg-card, #ffffff)' : 'transparent',
              color:
                activeTab === 'privacy'
                  ? 'var(--aiims-primary, #5B4BFF)'
                  : 'var(--aiims-text-secondary, #64748B)',
              boxShadow:
                activeTab === 'privacy'
                  ? 'var(--aiims-shadow-card, 0 2px 8px rgba(0,0,0,0.06))'
                  : 'none',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <Shield size={16} /> Privacy Policy
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('terms')}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === 'terms' ? 800 : 600,
              backgroundColor:
                activeTab === 'terms' ? 'var(--aiims-bg-card, #ffffff)' : 'transparent',
              color:
                activeTab === 'terms'
                  ? 'var(--aiims-primary, #5B4BFF)'
                  : 'var(--aiims-text-secondary, #64748B)',
              boxShadow:
                activeTab === 'terms'
                  ? 'var(--aiims-shadow-card, 0 2px 8px rgba(0,0,0,0.06))'
                  : 'none',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <FileText size={16} /> Terms of Service
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('refunds')}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === 'refunds' ? 800 : 600,
              backgroundColor:
                activeTab === 'refunds' ? 'var(--aiims-bg-card, #ffffff)' : 'transparent',
              color:
                activeTab === 'refunds'
                  ? 'var(--aiims-primary, #5B4BFF)'
                  : 'var(--aiims-text-secondary, #64748B)',
              boxShadow:
                activeTab === 'refunds'
                  ? 'var(--aiims-shadow-card, 0 2px 8px rgba(0,0,0,0.06))'
                  : 'none',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <RefreshCw size={16} /> Refunds & Credits
          </button>
        </div>

        {/* Mandatory Placeholder Notice Banner */}
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7',
            border: `1px solid ${isDarkMode ? 'rgba(245, 158, 11, 0.3)' : '#F59E0B'}`,
            color: isDarkMode ? '#FDE68A' : '#92400E',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '0.02em' }}>
              PLACEHOLDER: replace with reviewed legal text
            </div>
            <div style={{ fontSize: '13px', marginTop: '4px', lineHeight: 1.5 }}>
              This policy document is a preliminary structural draft configured to meet Google Play
              and Apple App Store policy requirements. It does not constitute formal legal counsel.
              Review and replace with finalized text approved by legal counsel prior to commercial
              deployment.
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div
          style={{
            backgroundColor: 'var(--aiims-bg-card, #ffffff)',
            borderRadius: '16px',
            border: '1px solid var(--aiims-border-card, #E2E8F0)',
            padding: '36px',
            boxShadow: 'var(--aiims-shadow-card, 0 4px 16px rgba(0, 0, 0, 0.04))',
            lineHeight: 1.65,
          }}
        >
          {activeTab === 'privacy' && <PrivacyPolicyContent />}
          {activeTab === 'terms' && <TermsOfServiceContent />}
          {activeTab === 'refunds' && <RefundsContent />}

          {/* Support Contact Section */}
          <div
            style={{
              marginTop: '40px',
              paddingTop: '24px',
              borderTop: '1px solid var(--aiims-border-subtle, #E2E8F0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div
                style={{ fontSize: '14px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}
              >
                Have questions or privacy requests?
              </div>
              <div style={{ fontSize: '13px', color: 'var(--aiims-text-secondary)' }}>
                Contact our support and data governance desk directly.
              </div>
            </div>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                backgroundColor: 'var(--aiims-primary, #5B4BFF)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <Mail size={16} /> {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const PrivacyPolicyContent: React.FC = () => {
  return (
    <div>
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 800,
          color: 'var(--aiims-text-heading)',
          marginTop: 0,
          marginBottom: '8px',
        }}
      >
        Privacy Policy
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--aiims-text-secondary)', marginBottom: '24px' }}>
        Effective Date: October 26, 2026 · App Store & Play Store Data Safety Notice
      </p>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
          1. Information We Collect
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--aiims-text-body)' }}>
          AIIMS collects only data strictly necessary to provide capability diagnostics, tool
          discovery, and AI mentoring:
        </p>
        <ul style={{ fontSize: '14px', color: 'var(--aiims-text-body)', paddingLeft: '20px' }}>
          <li>
            <strong>Account Credentials:</strong> Full name, email address, password hash (salted
            bcrypt), and multi-factor authentication tokens (AES-256 encrypted).
          </li>
          <li>
            <strong>Academic Profile:</strong> Higher education level, stream (Tech / Non-Tech),
            degree program, specialization, and year of study.
          </li>
          <li>
            <strong>Capability Assessment & Diagnostic Data:</strong> Answers to capability
            questions, evaluation scores across 5 dimensions, and clarity reflections.
          </li>
          <li>
            <strong>Task Submissions & Exercises:</strong> Prompt engineering exercises, practice
            answers, and mentor evaluation rubrics.
          </li>
          <li>
            <strong>Credit Ledger & Usage Records:</strong> Non-personal transaction history (credit
            awards, tool consumption, and balance records) required for ledger audit integrity.
          </li>
          <li>
            <strong>Device & Diagnostic Logs:</strong> Technical error reports and connection
            telemetry used solely for platform reliability.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
          2. How We Use Your Data
        </h2>
        <ul style={{ fontSize: '14px', color: 'var(--aiims-text-body)', paddingLeft: '20px' }}>
          <li>To calculate personalized AI capability radar benchmarks and learning tracks.</li>
          <li>To provide contextual feedback and AI mentoring recommendations.</li>
          <li>To enforce server-side security, rate limiting, and credit balances.</li>
          <li>
            We <strong>never sell</strong> personal data or share user responses with advertisers.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
          3. Third-Party AI Model Processing
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--aiims-text-body)' }}>
          AIIMS connects to secure AI providers (Google Gemini, Anthropic Claude) to synthesize
          mentoring feedback. Prompts sent to providers are stripped of personally identifying
          profile data and transmitted over encrypted TLS connections.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
          4. In-App Account Deletion & Right to Erasure
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--aiims-text-body)' }}>
          In accordance with Google Play Data Safety and Apple App Store Review Guidelines, users
          may permanently delete their account at any time directly in Settings under "Delete My
          Account".
        </p>
        <p style={{ fontSize: '14px', color: 'var(--aiims-text-body)' }}>
          Upon deletion, the server permanently purges your personal profile, credentials,
          submissions content, reflections, and session tokens. Non-personal credit ledger entries
          are retained in anonymized form solely to ensure accounting totals balance. Deletion is
          logged without personal data in system audit logs.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
          5. Contact Data Governance
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--aiims-text-body)' }}>
          For inquiries or data privacy requests, contact: <strong>{SUPPORT_EMAIL}</strong>.
        </p>
      </section>
    </div>
  );
};

const TermsOfServiceContent: React.FC = () => {
  return (
    <div>
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 800,
          color: 'var(--aiims-text-heading)',
          marginTop: 0,
          marginBottom: '8px',
        }}
      >
        Terms of Service
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--aiims-text-secondary)', marginBottom: '24px' }}>
        Effective Date: October 26, 2026 · Platform Terms of Use
      </p>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
          1. Acceptance of Terms
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--aiims-text-body)' }}>
          By creating an account or accessing the AIIMS platform, you agree to these Terms of
          Service and our Privacy Policy. If you do not agree, do not access or use the application.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
          2. Educational & Diagnostic Mentoring Purpose
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--aiims-text-body)' }}>
          AIIMS is designed exclusively for educational capability diagnostics, tool discovery, and
          AI mentoring. Diagnostic scores and AI feedback are educational aids and do not guarantee
          employment, certification, academic admission, or error-free outputs.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
          3. User Accounts & Responsibilities
        </h2>
        <ul style={{ fontSize: '14px', color: 'var(--aiims-text-body)', paddingLeft: '20px' }}>
          <li>You are responsible for maintaining the confidentiality of your credentials.</li>
          <li>Staff accounts are required to configure multi-factor authentication (TOTP).</li>
          <li>
            You must not perform automated scraping, prompt injection attacks, denial-of-service
            attempts, or reverse engineering of the platform.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
          4. AI Model Interactions & Content
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--aiims-text-body)' }}>
          AI outputs generated within the platform are dynamic and probabilistic. Users should
          critically review all synthesized suggestions before applying them in production
          workflows.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
          5. Termination & In-App Deletion
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--aiims-text-body)' }}>
          You may terminate your account at any time via the in-app "Delete My Account" option. We
          reserve the right to suspend or terminate accounts that violate security rules or attempt
          malicious exploitation of credit ledgers.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
          6. Support & Inquiries
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--aiims-text-body)' }}>
          For inquiries regarding these terms, contact: <strong>{SUPPORT_EMAIL}</strong>.
        </p>
      </section>
    </div>
  );
};

const RefundsContent: React.FC = () => {
  return (
    <div>
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 800,
          color: 'var(--aiims-text-heading)',
          marginTop: 0,
          marginBottom: '8px',
        }}
      >
        Refund & Credit Policy
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--aiims-text-secondary)', marginBottom: '24px' }}>
        Effective Date: October 26, 2026 · AIIMS Credits & Transaction Policy
      </p>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
          1. AIIMS Virtual Educational Credits
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--aiims-text-body)' }}>
          AIIMS uses a virtual credit system ("AIIMS Credits" or "AC") to track learning activity,
          tool discovery executions, and mentoring sessions. Credits represent virtual platform
          units and possess no real-world monetary value.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
          2. Promotional & Earned Credits
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--aiims-text-body)' }}>
          Credits granted upon registration (welcome bonus) or earned by completing capability
          assessments, clarity quests, and mentoring exercises are non-transferable, non-refundable,
          and cannot be exchanged for fiat currency or cash.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
          3. Technical Malfunctions & Automatic Reimbursement
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--aiims-text-body)' }}>
          If an AI evaluation, mentor query, or clarity exercise fails due to a server error,
          connection interruption, or downstream provider outage:
        </p>
        <ul style={{ fontSize: '14px', color: 'var(--aiims-text-body)', paddingLeft: '20px' }}>
          <li>
            Our idempotent dual-ledger engine automatically rejects duplicate deductions or records
            a compensating <code>REFUND</code> transaction back to your balance.
          </li>
          <li>
            If credits were deducted without providing the corresponding output, our support team
            will review the audit log and credit your balance within 2 business days.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
          4. In-App Purchases (App Store & Google Play)
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--aiims-text-body)' }}>
          When in-app purchases are enabled, transactions processed via the Apple App Store or
          Google Play Store are subject to the respective store's refund policies:
        </p>
        <ul style={{ fontSize: '14px', color: 'var(--aiims-text-body)', paddingLeft: '20px' }}>
          <li>
            <strong>Apple App Store:</strong> Request refunds via Apple's reportaproblem.apple.com
            portal according to Apple Media Services Terms.
          </li>
          <li>
            <strong>Google Play Store:</strong> Request refunds via Google Play Order History
            according to Google Play Refund Policy.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
          5. Account Deletion & Unused Balance
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--aiims-text-body)' }}>
          Upon executing in-app account deletion, any remaining virtual credits on the account are
          permanently forfeited. Ledger records are anonymized to maintain system totals without
          personal identifiers.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
          6. Support & Dispute Inquiries
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--aiims-text-body)' }}>
          For inquiries or assistance regarding transactions, contact:{' '}
          <strong>{SUPPORT_EMAIL}</strong>.
        </p>
      </section>
    </div>
  );
};
