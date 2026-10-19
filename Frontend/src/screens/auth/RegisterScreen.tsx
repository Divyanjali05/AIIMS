import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertCircle, CheckCircle, ArrowLeft, ArrowRight, Check,
  Building2, GraduationCap, Sparkles, User, Eye, EyeOff,
  Search, ChevronDown, ChevronUp, Plus, Loader2, Sun, Moon
} from 'lucide-react';
import { useLearner, RegistrationPayload } from '../../context/LearnerContext';
import { useTheme } from '../../context/ThemeContext';
import { AiimsLogo } from '../../components/common/AiimsLogo';
import {
  STREAMS, TECH_SUB_CATEGORIES, NON_TECH_SUB_CATEGORIES,
  EDUCATION_LEVELS, PROGRAMS, SPECIALIZATIONS,
  AI_FAMILIARITY_OPTIONS, AI_USAGE_CONTEXTS, PRIMARY_GOAL_OPTIONS,
  Stream, EducationLevel,
  getProgramsForStreamAndLevel, getSpecializationsForProgram, getYearsForLevel,
  getAdmissionYears, getExpectedGraduationYears
} from '../../config/academicTaxonomy';
import { apiClient } from '../../api/client';

interface RegisterScreenProps {
  onSuccess?: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToHome?: () => void;
}

type Step = 1 | 2 | 3;

interface InstituteOption {
  _id: string;
  name: string;
  shortName?: string;
  city?: string;
  country?: string;
  type?: string;
}

const STEP_LABELS = ['Account', 'Academics', 'AI Profile'];
const STEP_ICONS = [User, GraduationCap, Sparkles];

// ─── Shared input style ─────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: '10px',
  border: '1.5px solid var(--aiims-input-border, #E2E8F0)',
  backgroundColor: 'var(--aiims-input-bg, #ffffff)',
  color: 'var(--aiims-input-text, #0F172A)',
  fontSize: '14px',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 650,
  color: 'var(--aiims-text-secondary, #334155)',
  marginBottom: '6px'
};

const fieldGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px'
};

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onSuccess,
  onNavigateToLogin,
  onNavigateToHome
}) => {
  const { register } = useLearner();
  const { isDarkMode, toggleTheme } = useTheme();
  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorField, setErrorField] = useState('');

  // ── Step 1: Account ──────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength
  const passwordStrength = (() => {
    if (!password) return { score: 0, label: '', color: '' };
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', '#EF4444', '#F59E0B', '#3B82F6', '#10B981'];
    return { score: s, label: labels[s], color: colors[s] };
  })();

  // ── Step 2: Academics ─────────────────────────────────────────────────────
  const [instituteQuery, setInstituteQuery] = useState('');
  const [instituteOptions, setInstituteOptions] = useState<InstituteOption[]>([]);
  const [selectedInstitute, setSelectedInstitute] = useState<InstituteOption | null>(null);
  const [instituteDropdownOpen, setInstituteDropdownOpen] = useState(false);
  const [isLoadingInstitutes, setIsLoadingInstitutes] = useState(false);
  const [showRequestInstitute, setShowRequestInstitute] = useState(false);

  const [stream, setStream] = useState<Stream | ''>('');
  const [streamSubCategory, setStreamSubCategory] = useState('');
  const [educationLevel, setEducationLevel] = useState<EducationLevel | ''>('');
  const [programId, setProgramId] = useState('');
  const [specializationId, setSpecializationId] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState<number | ''>('');
  const [admissionYear, setAdmissionYear] = useState<number | ''>('');
  const [expectedGraduationYear, setExpectedGraduationYear] = useState<number | ''>('');

  // Derived lists
  const subCategories = stream ? (stream === 'TECH' ? TECH_SUB_CATEGORIES : NON_TECH_SUB_CATEGORIES) : [];
  const availablePrograms = (stream && educationLevel)
    ? getProgramsForStreamAndLevel(stream as Stream, educationLevel as EducationLevel)
    : [];
  const availableSpecializations = (programId && stream)
    ? getSpecializationsForProgram(programId, stream as Stream)
    : [];
  const availableYears = educationLevel ? getYearsForLevel(educationLevel as EducationLevel) : [1, 2, 3, 4];

  // Reset downstream when stream/level changes
  useEffect(() => {
    setProgramId('');
    setSpecializationId('');
    setStreamSubCategory('');
  }, [stream]);

  useEffect(() => {
    setProgramId('');
    setSpecializationId('');
  }, [educationLevel]);

  useEffect(() => {
    setSpecializationId('');
  }, [programId]);

  // Institute search
  const instituteSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (instituteSearchTimeout.current) clearTimeout(instituteSearchTimeout.current);
    if (instituteQuery.length < 2) {
      // Load initial list
      setIsLoadingInstitutes(true);
      apiClient.searchInstitutes('', 20)
        .then(res => setInstituteOptions(res.institutes || []))
        .catch(() => {})
        .finally(() => setIsLoadingInstitutes(false));
      return;
    }
    instituteSearchTimeout.current = setTimeout(() => {
      setIsLoadingInstitutes(true);
      apiClient.searchInstitutes(instituteQuery, 20)
        .then(res => setInstituteOptions(res.institutes || []))
        .catch(() => {})
        .finally(() => setIsLoadingInstitutes(false));
    }, 300);
  }, [instituteQuery]);

  // ── Step 3: AI Context ────────────────────────────────────────────────────
  const [aiFamiliarity, setAiFamiliarity] = useState('');
  const [aiUsageContexts, setAiUsageContexts] = useState<string[]>([]);
  const [primaryGoal, setPrimaryGoal] = useState('');

  const toggleUsageContext = (val: string) => {
    setAiUsageContexts(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  // ── Step validation ───────────────────────────────────────────────────────
  const validateStep1 = (): string | null => {
    if (!name.trim() || name.trim().length < 2) return 'Please enter your full name.';
    if (!email.trim() || !email.includes('@') || !email.includes('.')) return 'Enter a valid email address.';
    if (!password || password.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
    if (!/[0-9]/.test(password)) return 'Password must include at least one number.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const validateStep2 = (): string | null => {
    if (!stream) return 'Please select your stream.';
    if (!educationLevel) return 'Please select your education level.';
    if (!programId) return 'Please select your program / degree.';
    if (!specializationId) return 'Please select your specialization.';
    if (!yearOfStudy) return 'Please select your current year of study.';
    if (!admissionYear) return 'Please select your admission year.';
    if (!expectedGraduationYear) return 'Please select your expected graduation year.';
    return null;
  };

  const validateStep3 = (): string | null => {
    if (!aiFamiliarity) return 'Please describe your current AI experience.';
    if (!primaryGoal) return 'Please select your primary goal.';
    return null;
  };

  const handleNextStep = () => {
    setErrorMessage('');
    setErrorField('');
    let err: string | null = null;
    if (step === 1) err = validateStep1();
    if (step === 2) err = validateStep2();
    if (err) {
      setErrorMessage(err);
      return;
    }
    setStep((prev) => (prev < 3 ? ((prev + 1) as Step) : prev));
  };

  const handlePrevStep = () => {
    setErrorMessage('');
    setErrorField('');
    setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    setErrorField('');
    const err = validateStep3();
    if (err) {
      setErrorMessage(err);
      return;
    }

    const selectedProgram = PROGRAMS.find(p => p.id === programId);
    const selectedSpec = SPECIALIZATIONS.find(s => s.id === specializationId);

    const payload: RegistrationPayload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      confirmPassword,
      instituteId: selectedInstitute?._id?.startsWith('inst-') ? undefined : selectedInstitute?._id,
      instituteName: selectedInstitute?.name || '',
      stream,
      streamSubCategory,
      educationLevel,
      programId,
      programName: selectedProgram?.label || programId,
      specializationId,
      specializationName: selectedSpec?.label || specializationId,
      yearOfStudy: Number(yearOfStudy),
      admissionYear: Number(admissionYear),
      expectedGraduationYear: Number(expectedGraduationYear),
      aiFamiliarity,
      aiUsageContexts,
      primaryGoal
    };

    setIsLoading(true);
    try {
      const res = await register(payload);
      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.error || 'Registration failed. Please try again.');
        if (res.field) setErrorField(res.field);
        // Navigate back to the relevant step if error is field-specific
        if (res.field && ['name', 'email', 'password', 'confirmPassword'].includes(res.field)) setStep(1);
        else if (res.field && ['stream', 'educationLevel', 'programId', 'specializationId', 'yearOfStudy', 'admissionYear'].includes(res.field)) setStep(2);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const btnPrimary: React.CSSProperties = {
    background: '#5B4BFF',
    color: '#fff',
    border: '1px solid #5B4BFF',
    borderRadius: '10px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  };

  const btnSecondary: React.CSSProperties = {
    background: 'var(--aiims-bg-card)',
    color: 'var(--aiims-text-heading)',
    border: '1px solid var(--aiims-border-card)',
    borderRadius: '10px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: '36px',
    cursor: 'pointer'
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      backgroundColor: 'var(--aiims-bg-page, #F8F9FE)',
      fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
      color: 'var(--aiims-text-primary, #0F172A)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '32px 16px 64px',
      boxSizing: 'border-box',
      position: 'relative'
    }}>
      {/* Logged-out Theme Toggle */}
      <button
        id="register-theme-toggle-btn"
        onClick={toggleTheme}
        aria-label={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        style={{
          position: 'absolute',
          top: '20px',
          right: '24px',
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          border: '1px solid var(--aiims-border-card, #E2E8F0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: isDarkMode ? '#fbbf24' : '#4f46e5',
          boxShadow: 'var(--aiims-shadow-card, 0 2px 8px rgba(0,0,0,0.06))',
          transition: 'all 0.2s ease',
          zIndex: 50
        }}
      >
        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <style>{`
        .reg-input:focus {
          border-color: #5B4BFF !important;
          box-shadow: 0 0 0 3px rgba(91, 75, 255, 0.12) !important;
        }
        .reg-select:focus {
          border-color: #5B4BFF !important;
          box-shadow: 0 0 0 3px rgba(91, 75, 255, 0.12) !important;
          outline: none;
        }
        .reg-pill {
          padding: 8px 14px;
          border-radius: 100px;
          border: 1.5px solid var(--aiims-border-card, #E2E8F0);
          background: var(--aiims-bg-card, #fff);
          font-size: 13px;
          font-weight: 600;
          color: var(--aiims-text-secondary, #475569);
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }
        .reg-pill:hover {
          border-color: #5B4BFF;
          color: #5B4BFF;
          background: rgba(91,75,255,0.05);
        }
        .reg-pill.selected {
          border-color: #5B4BFF;
          background: rgba(91,75,255,0.12);
          color: #4338CA;
        }
        .reg-stream-card {
          padding: 16px;
          border-radius: 12px;
          border: 2px solid var(--aiims-border-card, #E2E8F0);
          background: var(--aiims-bg-card, #fff);
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
          font-family: inherit;
          width: 100%;
        }
        .reg-stream-card:hover {
          border-color: #5B4BFF;
          background: rgba(91,75,255,0.06);
        }
        .reg-stream-card.selected {
          border-color: #5B4BFF;
          background: rgba(91,75,255,0.12);
        }
        .reg-fade {
          animation: regFade 0.25s ease forwards;
        }
        @keyframes regFade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .institute-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0; right: 0;
          background: var(--aiims-modal-bg, #fff);
          border: 1.5px solid var(--aiims-modal-border, #E2E8F0);
          border-radius: 10px;
          box-shadow: var(--aiims-shadow-dropdown, 0 8px 24px -4px rgba(0,0,0,0.12));
          max-height: 220px;
          overflow-y: auto;
          z-index: 100;
        }
        .institute-item {
          padding: 10px 14px;
          cursor: pointer;
          font-size: 13px;
          transition: background 0.1s;
          border-bottom: 1px solid var(--aiims-border-card, #F1F5F9);
          color: var(--aiims-text-primary, #0F172A);
        }
        .institute-item:last-child { border-bottom: none; }
        .institute-item:hover { background: var(--aiims-bg-card-hover, #F8FAFC); }
        .institute-item.selected { background: rgba(91,75,255,0.12); color: #4338CA; font-weight: 600; }
      `}</style>

      {/* Logo */}
      <div style={{ marginBottom: '28px', cursor: 'pointer' }} onClick={onNavigateToHome}>
        <AiimsLogo size="lg" showWordmark={true} />
      </div>

      {/* Step Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '28px', maxWidth: '480px', width: '100%' }}>
        {STEP_LABELS.map((label, i) => {
          const stepNum = (i + 1) as Step;
          const isActive = step === stepNum;
          const isComplete = step > stepNum;
          const StepIcon = STEP_ICONS[i];

          return (
            <React.Fragment key={stepNum}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  width: '36px', height: '36px',
                  borderRadius: '50%',
                  background: isComplete ? '#10B981' : isActive ? '#5B4BFF' : '#E2E8F0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s',
                  marginBottom: '4px'
                }}>
                  {isComplete
                    ? <Check size={16} color="#fff" />
                    : <StepIcon size={16} color={isActive ? '#fff' : '#94A3B8'} />
                  }
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#5B4BFF' : isComplete ? '#10B981' : '#94A3B8'
                }}>{label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div style={{
                  flex: 1,
                  height: '2px',
                  background: step > i + 1 ? '#10B981' : '#E2E8F0',
                  marginBottom: '20px',
                  transition: 'all 0.3s'
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Card */}
      <div style={{
        maxWidth: '520px',
        width: '100%',
        backgroundColor: 'var(--aiims-bg-card, #ffffff)',
        borderRadius: '20px',
        border: '1px solid var(--aiims-border-card, #E2E8F0)',
        padding: '36px 32px',
        boxShadow: 'var(--aiims-shadow-card, 0 20px 40px -15px rgba(0,0,0,0.06))',
        boxSizing: 'border-box'
      }}>
        {/* Error Banner */}
        {errorMessage && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FCA5A5',
            color: '#991B1B', padding: '12px 14px', borderRadius: '10px',
            fontSize: '13px', fontWeight: 600, marginBottom: '20px',
            display: 'flex', alignItems: 'flex-start', gap: '10px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px', color: '#DC2626' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ─── STEP 1: ACCOUNT ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="reg-fade">
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--aiims-text-heading, #0F172A)', letterSpacing: '-0.4px', margin: '0 0 4px' }}>
                Create your AIIMS account
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--aiims-text-secondary, #64748B)', margin: 0 }}>
                Your journey into AI intelligence starts here.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Full Name */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Full Name</label>
                <input
                  id="reg-name"
                  className="reg-input"
                  type="text"
                  style={{ ...inputStyle, borderColor: errorField === 'name' ? '#F87171' : '#E2E8F0' }}
                  placeholder="Jane Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {/* Email */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Email Address</label>
                <input
                  id="reg-email"
                  className="reg-input"
                  type="email"
                  style={{ ...inputStyle, borderColor: errorField === 'email' ? '#F87171' : '#E2E8F0' }}
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reg-password"
                    className="reg-input"
                    type={showPassword ? 'text' : 'password'}
                    style={{ ...inputStyle, paddingRight: '42px', borderColor: errorField === 'password' ? '#F87171' : '#E2E8F0' }}
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Password strength indicator */}
                {password && (
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                      {[1, 2, 3, 4].map(s => (
                        <div key={s} style={{
                          flex: 1, height: '3px', borderRadius: '4px',
                          background: s <= passwordStrength.score ? passwordStrength.color : '#E2E8F0',
                          transition: 'all 0.2s'
                        }} />
                      ))}
                    </div>
                    {passwordStrength.label && (
                      <span style={{ fontSize: '11px', color: passwordStrength.color, fontWeight: 600 }}>
                        {passwordStrength.label} password
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reg-confirm-password"
                    className="reg-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    style={{
                      ...inputStyle, paddingRight: '42px',
                      borderColor: confirmPassword && confirmPassword !== password ? '#F87171'
                        : confirmPassword && confirmPassword === password ? '#10B981'
                        : '#E2E8F0'
                    }}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}>
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 2: ACADEMICS ───────────────────────────────────────────── */}
        {step === 2 && (
          <div className="reg-fade">
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.4px', margin: '0 0 4px' }}>
                Your Academic Identity
              </h2>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
                This powers accurate peer benchmarks and ensures your learning context is correct.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Institute Search */}
              <div style={{ ...fieldGroupStyle, position: 'relative' }}>
                <label style={labelStyle}>College / University</label>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    id="reg-institute"
                    className="reg-input"
                    type="text"
                    style={{ ...inputStyle, paddingLeft: '36px', paddingRight: '36px' }}
                    placeholder="Search your college or university..."
                    value={selectedInstitute ? selectedInstitute.name : instituteQuery}
                    onChange={e => {
                      setInstituteQuery(e.target.value);
                      setSelectedInstitute(null);
                      setInstituteDropdownOpen(true);
                    }}
                    onFocus={() => setInstituteDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setInstituteDropdownOpen(false), 200)}
                  />
                  {isLoadingInstitutes && <Loader2 size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', animation: 'spin 1s linear infinite' }} />}
                  {selectedInstitute && <Check size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#10B981' }} />}
                </div>

                {instituteDropdownOpen && (
                  <div className="institute-dropdown">
                    {instituteOptions.map(inst => (
                      <div
                        key={inst._id}
                        className={`institute-item ${selectedInstitute?._id === inst._id ? 'selected' : ''}`}
                        onMouseDown={() => {
                          setSelectedInstitute(inst);
                          setInstituteQuery('');
                          setInstituteDropdownOpen(false);
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#0F172A' }}>{inst.name}</div>
                        {inst.city && <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>{inst.city}</div>}
                      </div>
                    ))}
                    <div
                      className="institute-item"
                      style={{ color: '#5B4BFF', fontWeight: 600 }}
                      onMouseDown={() => {
                        setInstituteDropdownOpen(false);
                        setShowRequestInstitute(true);
                      }}
                    >
                      <Plus size={13} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                      My college is not listed
                    </div>
                  </div>
                )}

                {showRequestInstitute && (
                  <div style={{ marginTop: '8px', padding: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
                    <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 8px' }}>Type your institution name and we'll add it:</p>
                    <input
                      className="reg-input"
                      type="text"
                      style={{ ...inputStyle, fontSize: '13px' }}
                      placeholder="Your college/university name"
                      value={instituteQuery}
                      onChange={e => setInstituteQuery(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button
                        type="button"
                        style={{ ...btnPrimary, fontSize: '12px', padding: '8px 12px' }}
                        onClick={() => {
                          if (instituteQuery.trim()) {
                            setSelectedInstitute({ _id: `custom-${Date.now()}`, name: instituteQuery.trim() });
                            setShowRequestInstitute(false);
                            apiClient.requestInstitute({ name: instituteQuery.trim() }).catch(() => {});
                          }
                        }}
                      >Use This Name</button>
                      <button
                        type="button"
                        style={{ ...btnSecondary, fontSize: '12px', padding: '8px 12px' }}
                        onClick={() => setShowRequestInstitute(false)}
                      >Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Stream Selection */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Stream <span style={{ color: '#EF4444' }}>*</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {STREAMS.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      className={`reg-stream-card ${stream === s.value ? 'selected' : ''}`}
                      onClick={() => setStream(s.value)}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 700, color: stream === s.value ? '#4338CA' : '#0F172A', marginBottom: '2px' }}>{s.label}</div>
                      <div style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.4 }}>{s.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-Category */}
              {stream && (
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Department / Field</label>
                  <select
                    id="reg-sub-category"
                    className="reg-select"
                    style={selectStyle}
                    value={streamSubCategory}
                    onChange={e => setStreamSubCategory(e.target.value)}
                  >
                    <option value="">Select department...</option>
                    {subCategories.map(sc => (
                      <option key={sc.value} value={sc.value}>{sc.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Education Level */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Education Level <span style={{ color: '#EF4444' }}>*</span></label>
                <select
                  id="reg-education-level"
                  className="reg-select"
                  style={selectStyle}
                  value={educationLevel}
                  onChange={e => setEducationLevel(e.target.value as EducationLevel)}
                >
                  <option value="">Select level...</option>
                  {EDUCATION_LEVELS.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>

              {/* Program */}
              {educationLevel && stream && (
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Program / Degree <span style={{ color: '#EF4444' }}>*</span></label>
                  <select
                    id="reg-program"
                    className="reg-select"
                    style={selectStyle}
                    value={programId}
                    onChange={e => setProgramId(e.target.value)}
                  >
                    <option value="">Select program...</option>
                    {availablePrograms.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Specialization */}
              {programId && availableSpecializations.length > 0 && (
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Specialization / Branch <span style={{ color: '#EF4444' }}>*</span></label>
                  <select
                    id="reg-specialization"
                    className="reg-select"
                    style={selectStyle}
                    value={specializationId}
                    onChange={e => setSpecializationId(e.target.value)}
                  >
                    <option value="">Select specialization...</option>
                    {availableSpecializations.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Year + Admission + Graduation in a row */}
              {educationLevel && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div style={fieldGroupStyle}>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>Current Year <span style={{ color: '#EF4444' }}>*</span></label>
                    <select className="reg-select" style={{ ...selectStyle, fontSize: '13px' }} value={yearOfStudy} onChange={e => setYearOfStudy(Number(e.target.value))}>
                      <option value="">Year</option>
                      {availableYears.map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                  </div>
                  <div style={fieldGroupStyle}>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>Admitted <span style={{ color: '#EF4444' }}>*</span></label>
                    <select className="reg-select" style={{ ...selectStyle, fontSize: '13px' }} value={admissionYear} onChange={e => setAdmissionYear(Number(e.target.value))}>
                      <option value="">Year</option>
                      {getAdmissionYears().map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div style={fieldGroupStyle}>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>Graduating <span style={{ color: '#EF4444' }}>*</span></label>
                    <select className="reg-select" style={{ ...selectStyle, fontSize: '13px' }} value={expectedGraduationYear} onChange={e => setExpectedGraduationYear(Number(e.target.value))}>
                      <option value="">Year</option>
                      {getExpectedGraduationYears().map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── STEP 3: AI PROFILE ──────────────────────────────────────────── */}
        {step === 3 && (
          <div className="reg-fade">
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.4px', margin: '0 0 4px' }}>
                Your AI Profile
              </h2>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
                This personalizes your learning journey. It does <strong>not</strong> affect your capability score.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* AI Familiarity */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>How familiar are you with AI tools? <span style={{ color: '#EF4444' }}>*</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {AI_FAMILIARITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAiFamiliarity(opt.value)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: `1.5px solid ${aiFamiliarity === opt.value ? '#5B4BFF' : '#E2E8F0'}`,
                        background: aiFamiliarity === opt.value ? 'rgba(91,75,255,0.07)' : '#fff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${aiFamiliarity === opt.value ? '#5B4BFF' : '#CBD5E1'}`,
                        background: aiFamiliarity === opt.value ? '#5B4BFF' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {aiFamiliarity === opt.value && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: aiFamiliarity === opt.value ? '#4338CA' : '#0F172A' }}>{opt.label}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>{opt.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Usage Contexts */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>How do you use (or plan to use) AI? <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 400 }}>Select all that apply</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {AI_USAGE_CONTEXTS.map(ctx => (
                    <button
                      key={ctx.value}
                      type="button"
                      className={`reg-pill ${aiUsageContexts.includes(ctx.value) ? 'selected' : ''}`}
                      onClick={() => toggleUsageContext(ctx.value)}
                    >
                      {aiUsageContexts.includes(ctx.value) && <Check size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}
                      {ctx.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Goal */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>What's your primary goal with AIIMS? <span style={{ color: '#EF4444' }}>*</span></label>
                <select
                  id="reg-primary-goal"
                  className="reg-select"
                  style={selectStyle}
                  value={primaryGoal}
                  onChange={e => setPrimaryGoal(e.target.value)}
                >
                  <option value="">Select your main goal...</option>
                  {PRIMARY_GOAL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Important note about AI context vs capability */}
              <div style={{
                padding: '12px 14px', background: '#F0F9FF', border: '1px solid #BAE6FD',
                borderRadius: '10px', fontSize: '12px', color: '#0369A1', lineHeight: 1.5
              }}>
                <strong>Note:</strong> Your AI Profile is for personalization only. Your actual capability score is measured exclusively through the AIIMS Assessment — not by what you say here.
              </div>
            </div>
          </div>
        )}

        {/* ─── Navigation Buttons ──────────────────────────────────────────── */}
        <div style={{ marginTop: '28px', display: 'flex', gap: '12px' }}>
          {step > 1 && (
            <button type="button" style={{ ...btnSecondary, flex: '0 0 auto', width: 'auto', padding: '12px 20px' }} onClick={handlePrevStep} disabled={isLoading}>
              <ArrowLeft size={16} /> Back
            </button>
          )}

          {step < 3 ? (
            <button type="button" style={btnPrimary} onClick={handleNextStep} disabled={isLoading}>
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              style={{ ...btnPrimary, background: isLoading ? '#A5B4FC' : '#5B4BFF' }}
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating Account...</>
              ) : (
                <><CheckCircle size={16} /> Create My Account</>
              )}
            </button>
          )}
        </div>

        {/* Sign in link */}
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#64748B' }}>
          Already have an account?{' '}
          <button type="button" onClick={onNavigateToLogin}
            style={{ background: 'none', border: 'none', color: '#5B4BFF', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 'inherit', fontFamily: 'inherit' }}>
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;
