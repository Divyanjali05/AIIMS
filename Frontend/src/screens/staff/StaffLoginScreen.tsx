import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Sun,
  Moon,
  Smartphone,
  Key,
  CheckCircle,
  Copy,
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { useTheme } from '../../context/ThemeContext';
import { Surface } from '../../components/common/Surface';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { apiClient } from '../../api/client';

interface StaffLoginScreenProps {
  onSuccess?: (role: string) => void;
}

type Step =
  | 'credentials' // Step 1: email + password
  | 'totp-verify' // Step 2a: enter TOTP code (for users with 2FA already set up)
  | 'totp-setup-scan' // Step 2b: first-time setup — scan QR
  | 'totp-setup-confirm' // Step 2c: confirm first code after scan
  | 'totp-backup-codes'; // Step 2d: show backup codes once

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px 10px 36px',
  borderRadius: '8px',
  border: '1px solid var(--aiims-border-card, #e2e8f0)',
  backgroundColor: 'var(--aiims-bg-card, #ffffff)',
  color: 'var(--aiims-text-primary, #0f172a)',
  fontSize: '14px',
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border-color 0.15s ease',
};

const iconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--aiims-text-muted, #94a3b8)',
};

export const StaffLoginScreen: React.FC<StaffLoginScreenProps> = ({ onSuccess }) => {
  const { login } = useLearner();
  const { isDark, toggleTheme } = useTheme();

  // Step state
  const [step, setStep] = useState<Step>('credentials');

  // Credentials step
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // TOTP verify step (existing 2FA)
  const [totpUserId, setTotpUserId] = useState('');
  const [totpUserRole, setTotpUserRole] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  // TOTP setup step (first-time)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedBackups, setCopiedBackups] = useState(false);

  // Shared
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Step 1: credentials ───────────────────────────────────────────────────

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await login(email.trim(), password);

      if (result?.totpRequired) {
        // Server wants a second factor
        setTotpUserId(result.userId ?? '');
        setTotpUserRole(result.role ?? '');
        setStep('totp-verify');
        return;
      }

      if (result?.user) {
        const userRole = result.user.role;
        if (userRole === 'evaluator' || userRole === 'admin') {
          // Staff logged in but no 2FA set up yet — start guided setup
          try {
            const setupData = await apiClient.totpInitiateSetup();
            setQrCodeDataUrl(setupData.qrCode);
            setManualKey(setupData.manualEntryKey);
            setStep('totp-setup-scan');
          } catch {
            // 2FA setup optional error — still let them in (they'll be prompted next time)
            routeByRole(userRole);
          }
        } else {
          // Learner — redirect away
          setErrorMessage(
            'Access restricted: Learners cannot access the staff portal. Redirecting to student dashboard...'
          );
          setTimeout(() => {
            window.location.href = '/home';
          }, 1500);
        }
      } else {
        setErrorMessage('Invalid credentials. Please verify your email and password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2a: verify existing TOTP ────────────────────────────────────────

  const handleTotpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode.trim()) {
      setErrorMessage('Please enter your authenticator code.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await apiClient.totpVerifyLogin(totpUserId, totpCode.trim(), useBackupCode);

      if (result?.user) {
        if (result.warning) {
          console.warn('[2FA]', result.warning);
        }
        routeByRole(result.user.role);
      } else if (result?.error) {
        setErrorMessage(result.error);
      } else {
        setErrorMessage('Verification failed. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || '2FA verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2b→2c: first-time setup confirm ─────────────────────────────────

  const handleSetupConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupCode.trim()) {
      setErrorMessage('Please enter the 6-digit code from your authenticator app.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await apiClient.totpVerifySetup(setupCode.trim());
      setBackupCodes(result.backupCodes);
      setStep('totp-backup-codes');
    } catch (err: any) {
      setErrorMessage(err.message || 'Code verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Shared helpers ────────────────────────────────────────────────────────

  const routeByRole = (role: string) => {
    if (onSuccess) {
      onSuccess(role);
    } else {
      window.location.href = role === 'admin' ? '/staff/admin' : '/staff/queue';
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n')).then(() => {
      setCopiedBackups(true);
      setTimeout(() => setCopiedBackups(false), 2000);
    });
  };

  // ── Shared wrapper ────────────────────────────────────────────────────────

  const renderWrapper = (
    children: React.ReactNode,
    title: string,
    subtitle: string,
    icon: React.ReactNode
  ) => (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--aiims-bg-page, #f8f7fd)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        fontFamily: "'Nunito', -apple-system, sans-serif",
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <a
          href="/home"
          style={{
            fontSize: '13px',
            color: 'var(--aiims-text-secondary, #64748b)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 600,
          }}
        >
          ← Return to Student App
        </a>
        <button
          onClick={toggleTheme}
          style={{
            background: 'var(--aiims-bg-card, #ffffff)',
            border: '1px solid var(--aiims-border-subtle, #e2e8f0)',
            borderRadius: '8px',
            padding: '6px 10px',
            cursor: 'pointer',
            color: 'var(--aiims-text-secondary, #64748b)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
          }}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
          <span>{isDark ? 'Light' : 'Dark'}</span>
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: '480px' }}>
        <Surface
          variant="sky"
          radius="lg"
          padding="lg"
          style={{ boxShadow: 'var(--aiims-shadow-lg)' }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                backgroundColor: 'var(--aiims-sky-subtle, #e0f2fe)',
                color: 'var(--aiims-sky-text, #0369a1)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                boxShadow: 'var(--aiims-shadow-sm)',
              }}
            >
              {icon}
            </div>
            <div
              style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}
            >
              <Badge variant="primary">Staff Portal</Badge>
              <Badge variant="neutral">Evaluators &amp; Admins</Badge>
            </div>
            <h1
              style={{
                margin: '8px 0 4px',
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading, #0f172a)',
                letterSpacing: '-0.5px',
              }}
            >
              {title}
            </h1>
            <p
              style={{ margin: 0, fontSize: '14px', color: 'var(--aiims-text-secondary, #64748b)' }}
            >
              {subtitle}
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--aiims-coral-subtle, #ffe4e6)',
                border: '1px solid var(--aiims-coral-border, #fecdd3)',
                color: 'var(--aiims-coral-text, #9f1239)',
                fontSize: '13px',
                marginBottom: '18px',
                lineHeight: 1.4,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{errorMessage}</div>
            </div>
          )}

          {children}

          <div
            style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid var(--aiims-border-subtle, #e2e8f0)',
              fontSize: '12px',
              color: 'var(--aiims-text-muted, #64748b)',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            Evaluator accounts are provisioned exclusively by AIIMS administrators. Public
            registration cannot grant staff privileges.
          </div>
        </Surface>
      </div>
    </div>
  );

  // ── Render by step ────────────────────────────────────────────────────────

  if (step === 'credentials') {
    return renderWrapper(
      <form onSubmit={handleCredentialsSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="staff-email"
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--aiims-text-heading, #0f172a)',
              marginBottom: '6px',
            }}
          >
            Staff Email Address
          </label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={iconStyle} />
            <input
              id="staff-email"
              type="email"
              required
              placeholder="evaluator@aiims.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: '22px' }}>
          <label
            htmlFor="staff-password"
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--aiims-text-heading, #0f172a)',
              marginBottom: '6px',
            }}
          >
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={iconStyle} />
            <input
              id="staff-password"
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={loading}
          icon={<ArrowRight size={16} />}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {loading ? 'Authenticating...' : 'Sign In to Staff Portal'}
        </Button>
      </form>,
      'Staff Sign In',
      'Access the evaluation queue, rubric grading, and administration',
      <ShieldCheck size={32} />
    );
  }

  if (step === 'totp-verify') {
    return renderWrapper(
      <form onSubmit={handleTotpVerify}>
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--aiims-sky-subtle, #e0f2fe)',
            border: '1px solid var(--aiims-sky-border, #bae6fd)',
            color: 'var(--aiims-sky-text, #0369a1)',
            fontSize: '13px',
            marginBottom: '18px',
            lineHeight: 1.5,
          }}
        >
          <strong>Two-factor authentication required.</strong>
          <br />
          {useBackupCode
            ? 'Enter one of your 8-character backup codes (format: XXXX-XXXX).'
            : 'Open your authenticator app and enter the 6-digit code for AIIMS Staff.'}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="totp-code"
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--aiims-text-heading, #0f172a)',
              marginBottom: '6px',
            }}
          >
            {useBackupCode ? 'Backup Code' : 'Authenticator Code'}
          </label>
          <div style={{ position: 'relative' }}>
            <Key size={16} style={iconStyle} />
            <input
              id="totp-code"
              type="text"
              inputMode={useBackupCode ? 'text' : 'numeric'}
              required
              placeholder={useBackupCode ? 'XXXX-XXXX' : '000 000'}
              maxLength={useBackupCode ? 9 : 6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              autoComplete="one-time-code"
              style={{
                ...inputStyle,
                letterSpacing: '0.15em',
                fontSize: '18px',
                textAlign: 'center',
              }}
              autoFocus
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={loading}
          icon={<ArrowRight size={16} />}
          style={{ width: '100%', justifyContent: 'center', marginBottom: '12px' }}
        >
          {loading ? 'Verifying...' : 'Verify & Sign In'}
        </Button>

        <button
          type="button"
          onClick={() => {
            setUseBackupCode((v) => !v);
            setTotpCode('');
            setErrorMessage(null);
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--aiims-text-secondary, #64748b)',
            fontSize: '13px',
            width: '100%',
            textAlign: 'center',
            padding: '4px',
          }}
        >
          {useBackupCode ? '← Use authenticator app instead' : 'Use a backup code instead →'}
        </button>
      </form>,
      'Two-Factor Verification',
      `Signing in as ${totpUserRole}`,
      <Smartphone size={32} />
    );
  }

  if (step === 'totp-setup-scan') {
    return renderWrapper(
      <div>
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--aiims-mint-subtle, #d1fae5)',
            border: '1px solid var(--aiims-mint-border, #a7f3d0)',
            color: 'var(--aiims-mint-text, #065f46)',
            fontSize: '13px',
            marginBottom: '18px',
            lineHeight: 1.5,
          }}
        >
          <strong>Secure your account with 2FA.</strong>
          <br />
          Scan this QR code with Google Authenticator, Authy, or any TOTP app.
        </div>

        {qrCodeDataUrl && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <img
              src={qrCodeDataUrl}
              alt="TOTP QR Code for AIIMS Staff 2FA"
              style={{
                border: '4px solid white',
                borderRadius: '8px',
                boxShadow: 'var(--aiims-shadow-md)',
              }}
            />
          </div>
        )}

        {manualKey && (
          <div style={{ marginBottom: '18px', textAlign: 'center' }}>
            <p
              style={{
                margin: '0 0 6px',
                fontSize: '12px',
                color: 'var(--aiims-text-muted, #94a3b8)',
              }}
            >
              Can't scan? Enter this key manually:
            </p>
            <code
              style={{
                display: 'inline-block',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--aiims-bg-subtle, #f1f5f9)',
                fontSize: '13px',
                letterSpacing: '0.1em',
                fontFamily: 'monospace',
                color: 'var(--aiims-text-primary, #0f172a)',
              }}
            >
              {manualKey}
            </code>
          </div>
        )}

        <Button
          type="button"
          variant="primary"
          size="lg"
          icon={<ArrowRight size={16} />}
          onClick={() => {
            setErrorMessage(null);
            setStep('totp-setup-confirm');
          }}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          I've Scanned the Code →
        </Button>
      </div>,
      'Set Up Authenticator',
      'Step 1 of 2 — Scan the QR code',
      <Smartphone size={32} />
    );
  }

  if (step === 'totp-setup-confirm') {
    return renderWrapper(
      <form onSubmit={handleSetupConfirm}>
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--aiims-sky-subtle, #e0f2fe)',
            border: '1px solid var(--aiims-sky-border, #bae6fd)',
            color: 'var(--aiims-sky-text, #0369a1)',
            fontSize: '13px',
            marginBottom: '18px',
            lineHeight: 1.5,
          }}
        >
          Enter the 6-digit code now showing in your authenticator app to confirm setup.
        </div>

        <div style={{ marginBottom: '22px' }}>
          <label
            htmlFor="setup-code"
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--aiims-text-heading, #0f172a)',
              marginBottom: '6px',
            }}
          >
            Verification Code
          </label>
          <div style={{ position: 'relative' }}>
            <Key size={16} style={iconStyle} />
            <input
              id="setup-code"
              type="text"
              inputMode="numeric"
              required
              placeholder="000 000"
              maxLength={6}
              value={setupCode}
              onChange={(e) => setSetupCode(e.target.value)}
              autoComplete="one-time-code"
              style={{
                ...inputStyle,
                letterSpacing: '0.15em',
                fontSize: '20px',
                textAlign: 'center',
              }}
              autoFocus
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={loading}
          icon={<CheckCircle size={16} />}
          style={{ width: '100%', justifyContent: 'center', marginBottom: '10px' }}
        >
          {loading ? 'Confirming...' : 'Confirm & Activate 2FA'}
        </Button>

        <button
          type="button"
          onClick={() => {
            setErrorMessage(null);
            setStep('totp-setup-scan');
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--aiims-text-secondary, #64748b)',
            fontSize: '13px',
            width: '100%',
            textAlign: 'center',
            padding: '4px',
          }}
        >
          ← Back to QR code
        </button>
      </form>,
      'Confirm Authenticator',
      'Step 2 of 2 — Enter the code from your app',
      <Key size={32} />
    );
  }

  if (step === 'totp-backup-codes') {
    return renderWrapper(
      <div>
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--aiims-sunshine-subtle, #fef9c3)',
            border: '1px solid var(--aiims-sunshine-border, #fde047)',
            color: 'var(--aiims-sunshine-text, #854d0e)',
            fontSize: '13px',
            marginBottom: '18px',
            lineHeight: 1.5,
          }}
        >
          <strong>⚠ Save these backup codes now.</strong>
          <br />
          Each code can be used once if you lose access to your authenticator app. Store them
          somewhere safe — they will not be shown again.
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: 'var(--aiims-bg-subtle, #f1f5f9)',
            fontFamily: 'monospace',
          }}
        >
          {backupCodes.map((code) => (
            <div
              key={code}
              style={{
                padding: '6px 10px',
                backgroundColor: 'var(--aiims-bg-card, #ffffff)',
                borderRadius: '6px',
                fontSize: '14px',
                letterSpacing: '0.05em',
                color: 'var(--aiims-text-primary, #0f172a)',
                textAlign: 'center',
                border: '1px solid var(--aiims-border-card, #e2e8f0)',
              }}
            >
              {code}
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="secondary"
          size="md"
          icon={copiedBackups ? <CheckCircle size={15} /> : <Copy size={15} />}
          onClick={copyBackupCodes}
          style={{ width: '100%', justifyContent: 'center', marginBottom: '12px' }}
        >
          {copiedBackups ? 'Copied!' : 'Copy All Backup Codes'}
        </Button>

        <Button
          type="button"
          variant="primary"
          size="lg"
          icon={<ArrowRight size={16} />}
          onClick={() => routeByRole(totpUserRole || 'evaluator')}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          Continue to Dashboard →
        </Button>
      </div>,
      '2FA Activated ✓',
      'Save your backup codes before continuing',
      <ShieldCheck size={32} />
    );
  }

  // Fallback
  return null;
};
