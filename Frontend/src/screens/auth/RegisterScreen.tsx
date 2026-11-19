import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  GraduationCap,
  User,
  Eye,
  EyeOff,
  Search,
  Plus,
  Loader2,
  Sun,
  Moon,
  Briefcase,
  BookOpen,
  School,
  Building,
} from 'lucide-react';
import { useLearner, RegistrationPayload } from '../../context/LearnerContext';
import { useTheme } from '../../context/ThemeContext';
import { AiimsLogo } from '../../components/common/AiimsLogo';
import { SUPPORT_EMAIL } from '../../config/appConfig';
import {
  PROGRAMS,
  SPECIALIZATIONS,
  Stream,
  EducationLevel,
  getProgramsForStreamAndLevel,
  getSpecializationsForProgram,
  getStudyYearsForProgram,
  deriveExpectedGraduationYear,
  VENTURE_STAGES,
  VENTURE_INDUSTRIES,
} from '../../config/academicTaxonomy';
import { apiClient } from '../../api/client';
import { calculatePasswordStrength, isCommonPassword } from '../../utils/passwordSecurity';

interface RegisterScreenProps {
  onSuccess?: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToHome?: () => void;
}

type Step = 1 | 2;

export type EducationCategory =
  | 'BELOW_10TH'
  | 'CLASS_9_10'
  | 'INTERMEDIATE'
  | 'DIPLOMA'
  | 'DEGREE'
  | 'POSTGRADUATE';

interface InstituteOption {
  _id: string;
  name: string;
  shortName?: string;
  city?: string;
  country?: string;
  type?: string;
}

const STUDENT_STEP_LABELS = ['Account', 'Education'];
const STUDENT_STEP_ICONS = [User, GraduationCap];

const ENTREPRENEUR_STEP_LABELS = ['Account', 'Venture Info'];
const ENTREPRENEUR_STEP_ICONS = [User, Briefcase];

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
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 650,
  color: 'var(--aiims-text-secondary, #334155)',
  marginBottom: '6px',
};

const fieldGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onSuccess,
  onNavigateToLogin,
  onNavigateToHome,
}) => {
  const { register } = useLearner();
  const { isDarkMode, toggleTheme } = useTheme();
  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorField, setErrorField] = useState('');

  // ── Step 1: Account ──────────────────────────────────────────────────────
  const [track, setTrack] = useState<'Student' | 'Entrepreneur'>('Student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Stepper metadata
  const stepLabels = track === 'Entrepreneur' ? ENTREPRENEUR_STEP_LABELS : STUDENT_STEP_LABELS;
  const stepIcons = track === 'Entrepreneur' ? ENTREPRENEUR_STEP_ICONS : STUDENT_STEP_ICONS;

  // Password strength
  const passwordStrength = calculatePasswordStrength(password);

  // Step 1 validity guard
  const isStep1Valid = Boolean(
    track &&
    name.trim().length >= 2 &&
    email.trim().length > 0 &&
    email.includes('@') &&
    email.includes('.') &&
    password.length >= 8 &&
    !isCommonPassword(password) &&
    confirmPassword.length > 0 &&
    confirmPassword === password
  );

  // ── Step 2: Student Education Category ────────────────────────────────────
  const [educationCategory, setEducationCategory] = useState<EducationCategory>('DEGREE');

  // School fields (Below 10th & Class 9/10)
  const [schoolClass, setSchoolClass] = useState<'Class 9' | 'Class 10'>('Class 10');
  const [schoolName, setSchoolName] = useState('');

  // Intermediate (+2) fields
  const [intermediateGroup, setIntermediateGroup] = useState('MPC');
  const [intermediateYear, setIntermediateYear] = useState<1 | 2>(2);
  const [juniorCollegeName, setJuniorCollegeName] = useState('');

  // Diploma fields
  const [diplomaBranch, setDiplomaBranch] = useState('Computer Engineering');
  const [diplomaYear, setDiplomaYear] = useState<1 | 2 | 3>(2);
  const [polytechnicName, setPolytechnicName] = useState('');

  // Degree & Postgraduate fields
  const [stream, setStream] = useState<Stream>('TECH');
  const [programId, setProgramId] = useState('btech');
  const [specializationId, setSpecializationId] = useState('cs');
  const [customSpecialization, setCustomSpecialization] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState<number>(3);
  const [admissionYear, setAdmissionYear] = useState<number>(new Date().getFullYear() - 2);
  const [expectedGraduationYear, setExpectedGraduationYear] = useState<number>(new Date().getFullYear() + 2);

  // College search / custom college for Degree & PG
  const [instituteQuery, setInstituteQuery] = useState('');
  const [instituteOptions, setInstituteOptions] = useState<InstituteOption[]>([]);
  const [selectedInstitute, setSelectedInstitute] = useState<InstituteOption | null>(null);
  const [instituteDropdownOpen, setInstituteDropdownOpen] = useState(false);
  const [isLoadingInstitutes, setIsLoadingInstitutes] = useState(false);
  const [isCustomCollege, setIsCustomCollege] = useState(false);
  const [customCollegeName, setCustomCollegeName] = useState('');

  // ── Step 2: Entrepreneur Fields ──────────────────────────────────────────
  const [ventureName, setVentureName] = useState('');
  const [industry, setIndustry] = useState(VENTURE_INDUSTRIES[0] || 'Technology & Software');
  const [ventureStage, setVentureStage] = useState('exploring_idea');

  // Derived programs & specializations for Degree & PG
  const currentEduLevel: EducationLevel = educationCategory === 'POSTGRADUATE' ? 'POSTGRADUATE' : 'UNDERGRADUATE';
  const availablePrograms = getProgramsForStreamAndLevel(stream, currentEduLevel);
  const availableSpecializations = programId ? getSpecializationsForProgram(programId, stream) : [];
  const availableYears = programId ? getStudyYearsForProgram(programId) : [1, 2, 3, 4];

  // Auto-sync program & specialization defaults when category or stream changes
  useEffect(() => {
    if (educationCategory === 'POSTGRADUATE') {
      const defaultPg = stream === 'TECH' ? 'mtech' : 'mba';
      setProgramId(defaultPg);
      setSpecializationId(stream === 'TECH' ? 'mtech_cs' : 'mba_general');
      setYearOfStudy(1);
    } else if (educationCategory === 'DEGREE') {
      const defaultUg = stream === 'TECH' ? 'btech' : 'bcom';
      setProgramId(defaultUg);
      setSpecializationId(stream === 'TECH' ? 'cs' : 'commerce_general');
      setYearOfStudy(2);
    }
  }, [educationCategory, stream]);

  // Auto-derive expected graduation year
  useEffect(() => {
    if (admissionYear && programId) {
      const derived = deriveExpectedGraduationYear(admissionYear, programId, yearOfStudy);
      setExpectedGraduationYear(derived);
    }
  }, [admissionYear, programId, yearOfStudy]);

  // Institute search autocomplete
  const instituteSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (instituteSearchTimeout.current) clearTimeout(instituteSearchTimeout.current);
    if (instituteQuery.length < 2) {
      setIsLoadingInstitutes(true);
      apiClient
        .searchInstitutes('', 20)
        .then((res) => setInstituteOptions(res.institutes || []))
        .catch(() => {})
        .finally(() => setIsLoadingInstitutes(false));
      return;
    }
    instituteSearchTimeout.current = setTimeout(() => {
      setIsLoadingInstitutes(true);
      apiClient
        .searchInstitutes(instituteQuery, 20)
        .then((res) => setInstituteOptions(res.institutes || []))
        .catch(() => {})
        .finally(() => setIsLoadingInstitutes(false));
    }, 300);
  }, [instituteQuery]);

  // ── Validation ───────────────────────────────────────────────────────────
  const validateStep1 = (): string | null => {
    if (!name.trim() || name.trim().length < 2) {
      setErrorField('name');
      return 'Please enter your full name.';
    }
    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setErrorField('email');
      return 'Enter a valid email address.';
    }
    if (!password || password.length < 8) {
      setErrorField('password');
      return 'Password must be at least 8 characters long.';
    }
    if (isCommonPassword(password)) {
      setErrorField('password');
      return 'This password is too common or easily guessed. Please choose a more secure password.';
    }
    if (!confirmPassword) {
      setErrorField('confirmPassword');
      return 'Please confirm your password.';
    }
    if (password !== confirmPassword) {
      setErrorField('confirmPassword');
      return 'Passwords do not match.';
    }
    return null;
  };

  const validateStep2 = (): string | null => {
    if (track === 'Student') {
      if (educationCategory === 'DEGREE' || educationCategory === 'POSTGRADUATE') {
        if (!programId) {
          setErrorField('programId');
          return 'Please select your degree program.';
        }
        if (!specializationId && !customSpecialization.trim()) {
          setErrorField('specializationId');
          return 'Please select or enter your branch/specialization.';
        }
      }
    }
    return null;
  };

  const handleNextStep = () => {
    setErrorMessage('');
    setErrorField('');
    const err = validateStep1();
    if (err) {
      setErrorMessage(err);
      return;
    }
    setStep(2);
  };

  const handlePrevStep = () => {
    setErrorMessage('');
    setErrorField('');
    setStep(1);
  };

  // ── Submit Registration ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (isLoading) return;
    setErrorMessage('');
    setErrorField('');

    const err = validateStep2();
    if (err) {
      setErrorMessage(err);
      return;
    }

    let payload: RegistrationPayload;

    if (track === 'Student') {
      if (educationCategory === 'BELOW_10TH') {
        payload = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          track: 'Student',
          educationCategory: 'BELOW_10TH',
          instituteName: schoolName.trim() || 'School Student',
        };
      } else if (educationCategory === 'CLASS_9_10') {
        payload = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          track: 'Student',
          educationCategory: 'CLASS_9_10',
          programName: schoolClass,
          yearOfStudy: schoolClass === 'Class 10' ? 2 : 1,
          instituteName: schoolName.trim() || 'Secondary School Student',
        };
      } else if (educationCategory === 'INTERMEDIATE') {
        payload = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          track: 'Student',
          educationCategory: 'INTERMEDIATE',
          specializationId: intermediateGroup.toLowerCase(),
          specializationName: intermediateGroup,
          yearOfStudy: intermediateYear,
          instituteName: juniorCollegeName.trim() || 'Junior College Student',
        };
      } else if (educationCategory === 'DIPLOMA') {
        payload = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          track: 'Student',
          educationCategory: 'DIPLOMA',
          specializationId: diplomaBranch.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          specializationName: diplomaBranch,
          yearOfStudy: diplomaYear,
          instituteName: polytechnicName.trim() || 'Polytechnic Student',
        };
      } else {
        // DEGREE or POSTGRADUATE
        const selectedProg = PROGRAMS.find((p) => p.id === programId);
        const selectedSpec = SPECIALIZATIONS.find((s) => s.id === specializationId);
        const collegeFinal = isCustomCollege
          ? customCollegeName.trim()
          : selectedInstitute?.name || customCollegeName.trim() || 'Independent Learner';

        payload = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          track: 'Student',
          educationCategory,
          stream,
          educationLevel: currentEduLevel,
          programId,
          programName: selectedProg?.label || programId.toUpperCase(),
          specializationId: specializationId || 'general',
          specializationName: customSpecialization.trim() || selectedSpec?.label || specializationId,
          yearOfStudy,
          admissionYear,
          expectedGraduationYear,
          instituteId:
            isCustomCollege || !selectedInstitute?._id || selectedInstitute._id.startsWith('inst-')
              ? undefined
              : selectedInstitute._id,
          instituteName: collegeFinal,
        };
      }
    } else {
      // Entrepreneur
      payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        track: 'Entrepreneur',
        ventureName: ventureName.trim() || 'Ideation / Not started',
        industry: industry || 'Technology & Software',
        ventureStage: ventureStage || 'exploring_idea',
      };
    }

    setIsLoading(true);
    try {
      const res = await register(payload);
      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.error || 'Registration failed. Please check your details and try again.');
        if (res.field) {
          setErrorField(res.field);
          if (['name', 'email', 'password', 'confirmPassword', 'track'].includes(res.field)) {
            setStep(1);
          }
        }
      }
    } catch (submitErr: any) {
      setErrorMessage(submitErr?.message || 'A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Common Button Styles ─────────────────────────────────────────────────
  const btnPrimary: React.CSSProperties = {
    background: '#5B4BFF',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '13px 24px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'inherit',
    flex: 1,
  };

  const btnSecondary: React.CSSProperties = {
    background: 'transparent',
    color: 'var(--aiims-text-secondary, #475569)',
    border: '1.5px solid var(--aiims-border-card, #E2E8F0)',
    borderRadius: '12px',
    padding: '13px 20px',
    fontSize: '15px',
    fontWeight: 650,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: 'var(--aiims-bg-page, #F8FAFC)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        boxSizing: 'border-box',
        position: 'relative',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* Theme Toggle in top right */}
      <button
        onClick={toggleTheme}
        aria-label="Toggle Theme"
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'var(--aiims-bg-card, #ffffff)',
          border: '1px solid var(--aiims-border-card, #E2E8F0)',
          borderRadius: '10px',
          padding: '8px 12px',
          cursor: 'pointer',
          color: 'var(--aiims-text-secondary, #64748B)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          fontWeight: 600,
        }}
      >
        {isDarkMode ? <Sun size={15} color="#F59E0B" /> : <Moon size={15} color="#5B4BFF" />}
        {isDarkMode ? 'Light' : 'Dark'}
      </button>

      <style>{`
        .reg-fade {
          animation: regFadeIn 0.24s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes regFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .institute-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0; right: 0;
          background: var(--aiims-modal-bg, #fff);
          border: 1.5px solid var(--aiims-modal-border, #E2E8F0);
          border-radius: 10px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15);
          max-height: 200px;
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
        .institute-item.selected { background: rgba(91,75,255,0.12); color: #5B4BFF; font-weight: 600; }
        .reg-btn-primary:hover:not(:disabled) {
          background: #4A3BE8 !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(91, 75, 255, 0.35);
        }
        .reg-btn-secondary:hover:not(:disabled) {
          background: var(--aiims-bg-card-hover, #F8FAFC) !important;
          transform: translateY(-1px);
        }
      `}</style>

      {/* Logo */}
      <div style={{ marginBottom: '24px', cursor: 'pointer' }} onClick={onNavigateToHome}>
        <AiimsLogo size="lg" showWordmark={true} />
      </div>

      {/* Step Indicator (Minimal 2 Steps) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          maxWidth: '420px',
          width: '100%',
          marginBottom: '24px',
        }}
      >
        {stepLabels.map((label, i) => {
          const stepNum = (i + 1) as Step;
          const isActive = step === stepNum;
          const isComplete = step > stepNum;
          const StepIcon = stepIcons[i];

          return (
            <React.Fragment key={stepNum}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: isComplete
                      ? '#10B981'
                      : isActive
                        ? '#5B4BFF'
                        : isDarkMode
                          ? '#1E293B'
                          : '#E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s',
                    marginBottom: '4px',
                  }}
                >
                  {isComplete ? (
                    <Check size={16} color="#ffffff" />
                  ) : (
                    <StepIcon
                      size={16}
                      color={isActive ? '#ffffff' : isDarkMode ? '#64748B' : '#94A3B8'}
                    />
                  )}
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive
                      ? '#5B4BFF'
                      : isComplete
                        ? '#10B981'
                        : isDarkMode
                          ? '#64748B'
                          : '#94A3B8',
                  }}
                >
                  {label}
                </span>
              </div>
              {i < stepLabels.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: '2px',
                    background:
                      step > i + 1
                        ? '#10B981'
                        : isDarkMode
                          ? '#1E293B'
                          : '#E2E8F0',
                    marginBottom: '20px',
                    transition: 'all 0.3s',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Main Registration Card */}
      <div
        style={{
          maxWidth: '520px',
          width: '100%',
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          borderRadius: '20px',
          border: '1px solid var(--aiims-border-card, #E2E8F0)',
          padding: '32px 28px',
          boxShadow: isDarkMode
            ? '0 20px 40px -15px rgba(0,0,0,0.5)'
            : '0 20px 40px -15px rgba(0,0,0,0.06)',
          boxSizing: 'border-box',
        }}
      >
        {/* Error Banner */}
        {errorMessage && (
          <div
            style={{
              background: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
              border: isDarkMode ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid #FCA5A5',
              color: isDarkMode ? '#FCA5A5' : '#991B1B',
              padding: '12px 14px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <AlertCircle
              size={16}
              style={{ flexShrink: 0, marginTop: '2px', color: isDarkMode ? '#EF4444' : '#DC2626' }}
            />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ─── STEP 1: ACCOUNT ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="reg-fade">
            <div style={{ marginBottom: '22px' }}>
              <h2
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0F172A)',
                  letterSpacing: '-0.4px',
                  margin: '0 0 4px',
                }}
              >
                Create your AIIMS Account
              </h2>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--aiims-text-muted, #64748B)',
                  margin: 0,
                }}
              >
                Choose your track and set up your login credentials.
              </p>
            </div>

            {/* Track Selector */}
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>I am registering as</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setTrack('Student')}
                  style={{
                    padding: '14px 12px',
                    borderRadius: '12px',
                    border:
                      track === 'Student'
                        ? '2px solid #5B4BFF'
                        : '1.5px solid var(--aiims-input-border, #E2E8F0)',
                    background:
                      track === 'Student'
                        ? isDarkMode
                          ? 'rgba(91, 75, 255, 0.15)'
                          : '#EEF2FF'
                        : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit',
                  }}
                >
                  <GraduationCap
                    size={22}
                    color={track === 'Student' ? '#5B4BFF' : isDarkMode ? '#94A3B8' : '#64748B'}
                  />
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color:
                        track === 'Student'
                          ? '#5B4BFF'
                          : 'var(--aiims-text-heading, #0F172A)',
                    }}
                  >
                    Student
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--aiims-text-muted, #64748B)',
                      textAlign: 'center',
                    }}
                  >
                    School, Diploma, Degree or PG
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTrack('Entrepreneur')}
                  style={{
                    padding: '14px 12px',
                    borderRadius: '12px',
                    border:
                      track === 'Entrepreneur'
                        ? '2px solid #5B4BFF'
                        : '1.5px solid var(--aiims-input-border, #E2E8F0)',
                    background:
                      track === 'Entrepreneur'
                        ? isDarkMode
                          ? 'rgba(91, 75, 255, 0.15)'
                          : '#EEF2FF'
                        : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit',
                  }}
                >
                  <Briefcase
                    size={22}
                    color={track === 'Entrepreneur' ? '#5B4BFF' : isDarkMode ? '#94A3B8' : '#64748B'}
                  />
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color:
                        track === 'Entrepreneur'
                          ? '#5B4BFF'
                          : 'var(--aiims-text-heading, #0F172A)',
                    }}
                  >
                    Entrepreneur
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--aiims-text-muted, #64748B)',
                      textAlign: 'center',
                    }}
                  >
                    Founders, Startups & Builders
                  </span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Full Name */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    ...inputStyle,
                    borderColor:
                      errorField === 'name' ? '#EF4444' : 'var(--aiims-input-border, #E2E8F0)',
                  }}
                />
              </div>

              {/* Email */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Email Address *</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    ...inputStyle,
                    borderColor:
                      errorField === 'email' ? '#EF4444' : 'var(--aiims-input-border, #E2E8F0)',
                  }}
                />
              </div>

              {/* Password */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Password (min. 8 characters) *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      ...inputStyle,
                      paddingRight: '40px',
                      borderColor:
                        errorField === 'password'
                          ? '#EF4444'
                          : 'var(--aiims-input-border, #E2E8F0)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--aiims-text-muted, #94A3B8)',
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Password strength bar */}
                {password.length > 0 && (
                  <div style={{ marginTop: '6px' }}>
                    <div
                      style={{
                        height: '4px',
                        background: 'var(--aiims-border-card, #E2E8F0)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${(passwordStrength.score / 4) * 100}%`,
                          background:
                            passwordStrength.score <= 1
                              ? '#EF4444'
                              : passwordStrength.score === 2
                                ? '#F59E0B'
                                : passwordStrength.score === 3
                                  ? '#3B82F6'
                                  : '#10B981',
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        color: passwordStrength.color,
                        fontWeight: 600,
                        marginTop: '2px',
                        display: 'block',
                      }}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Confirm Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      ...inputStyle,
                      paddingRight: '40px',
                      borderColor:
                        errorField === 'confirmPassword'
                          ? '#EF4444'
                          : 'var(--aiims-input-border, #E2E8F0)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--aiims-text-muted, #94A3B8)',
                      padding: 0,
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <div style={{ marginTop: '28px' }}>
              <button
                type="button"
                className="reg-btn-primary"
                style={{
                  ...btnPrimary,
                  width: '100%',
                  opacity: !isStep1Valid ? 0.6 : 1,
                  cursor: !isStep1Valid ? 'not-allowed' : 'pointer',
                }}
                disabled={!isStep1Valid}
                onClick={handleNextStep}
              >
                <span>{track === 'Student' ? 'Continue to Education' : 'Continue to Venture Details'}</span>
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: EDUCATION (STUDENT) ─────────────────────────────────── */}
        {step === 2 && track === 'Student' && (
          <div className="reg-fade">
            <div style={{ marginBottom: '20px' }}>
              <h2
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0F172A)',
                  letterSpacing: '-0.4px',
                  margin: '0 0 4px',
                }}
              >
                Select Education Level
              </h2>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--aiims-text-muted, #64748B)',
                  margin: 0,
                }}
              >
                We tailor your diagnostic challenges and mentoring to your educational journey.
              </p>
            </div>

            {/* 6 Education Category Options */}
            <div style={{ marginBottom: '22px' }}>
              <label style={labelStyle}>Education Category</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '8px',
                }}
              >
                {(
                  [
                    { id: 'BELOW_10TH', label: 'Below 10th', sub: 'Class 1–8' },
                    { id: 'CLASS_9_10', label: '9th / 10th', sub: 'Secondary' },
                    { id: 'INTERMEDIATE', label: 'Intermediate', sub: '+2 / Jr. College' },
                    { id: 'DIPLOMA', label: 'Diploma', sub: 'Polytechnic' },
                    { id: 'DEGREE', label: 'Degree', sub: 'B.Tech / B.Sc / BA' },
                    { id: 'POSTGRADUATE', label: 'Postgraduate', sub: 'M.Tech / MBA / PhD' },
                  ] as const
                ).map((cat) => {
                  const isSelected = educationCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setEducationCategory(cat.id)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '10px',
                        border: isSelected
                          ? '2px solid #5B4BFF'
                          : '1px solid var(--aiims-input-border, #E2E8F0)',
                        background: isSelected
                          ? isDarkMode
                            ? 'rgba(91, 75, 255, 0.2)'
                            : '#EEF2FF'
                          : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s',
                        fontFamily: 'inherit',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: isSelected ? '#5B4BFF' : 'var(--aiims-text-heading, #0F172A)',
                        }}
                      >
                        {cat.label}
                      </div>
                      <div
                        style={{
                          fontSize: '10.5px',
                          color: isSelected ? '#5B4BFF' : 'var(--aiims-text-muted, #64748B)',
                          marginTop: '2px',
                        }}
                      >
                        {cat.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Category A: Below 10th (Class 1–8) ────────────────────────── */}
            {educationCategory === 'BELOW_10TH' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  background: isDarkMode ? 'rgba(59, 130, 246, 0.08)' : '#F0F9FF',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <School size={18} color="#0284C7" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0369A1' }}>
                    Primary / Middle School Track
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--aiims-text-secondary, #334155)', lineHeight: 1.5 }}>
                  No branch, specialization, or graduation year required. AIIMS will adapt prompt engineering basics suitable for school level.
                </p>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>School Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Kendriya Vidyalaya / Delhi Public School"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            {/* ── Category B: Class 9th / 10th ─────────────────────────────── */}
            {educationCategory === 'CLASS_9_10' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  background: isDarkMode ? 'rgba(59, 130, 246, 0.08)' : '#F0F9FF',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <School size={18} color="#0284C7" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0369A1' }}>
                    Secondary School Track
                  </span>
                </div>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Current Class *</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {(['Class 9', 'Class 10'] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSchoolClass(c)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '8px',
                          border:
                            schoolClass === c
                              ? '2px solid #5B4BFF'
                              : '1px solid var(--aiims-input-border, #E2E8F0)',
                          background: schoolClass === c ? '#5B4BFF' : 'var(--aiims-bg-card, #ffffff)',
                          color: schoolClass === c ? '#ffffff' : 'var(--aiims-text-heading, #0F172A)',
                          fontWeight: 650,
                          fontSize: '13px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>School Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. St. Xavier's High School"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            {/* ── Category C: Intermediate (+2 / Junior College) ──────────── */}
            {educationCategory === 'INTERMEDIATE' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Intermediate Stream / Group *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {['MPC', 'BiPC', 'CEC', 'MEC', 'HEC', 'Other'].map((grp) => (
                      <button
                        key={grp}
                        type="button"
                        onClick={() => setIntermediateGroup(grp)}
                        style={{
                          padding: '9px',
                          borderRadius: '8px',
                          border:
                            intermediateGroup === grp
                              ? '2px solid #5B4BFF'
                              : '1px solid var(--aiims-input-border, #E2E8F0)',
                          background:
                            intermediateGroup === grp ? '#5B4BFF' : 'transparent',
                          color: intermediateGroup === grp ? '#ffffff' : 'var(--aiims-text-heading, #0F172A)',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {grp}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Year of Study *</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {[
                      { val: 1, label: '1st Year (+1)' },
                      { val: 2, label: '2nd Year (+2)' },
                    ].map((y) => (
                      <button
                        key={y.val}
                        type="button"
                        onClick={() => setIntermediateYear(y.val as 1 | 2)}
                        style={{
                          flex: 1,
                          padding: '9px',
                          borderRadius: '8px',
                          border:
                            intermediateYear === y.val
                              ? '2px solid #5B4BFF'
                              : '1px solid var(--aiims-input-border, #E2E8F0)',
                          background:
                            intermediateYear === y.val ? '#5B4BFF' : 'transparent',
                          color: intermediateYear === y.val ? '#ffffff' : 'var(--aiims-text-heading, #0F172A)',
                          fontWeight: 650,
                          fontSize: '13px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {y.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Junior College / Higher Secondary Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Narayana Junior College"
                    value={juniorCollegeName}
                    onChange={(e) => setJuniorCollegeName(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            {/* ── Category D: Diploma (Polytechnic) ─────────────────────────── */}
            {educationCategory === 'DIPLOMA' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Diploma Branch *</label>
                  <select
                    value={diplomaBranch}
                    onChange={(e) => setDiplomaBranch(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="Computer Engineering">Computer Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Electrical & Electronics">Electrical & Electronics</option>
                    <option value="Electronics & Communication">Electronics & Communication</option>
                    <option value="Automobile Engineering">Automobile Engineering</option>
                    <option value="Other">Other Diploma Discipline</option>
                  </select>
                </div>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Year of Study *</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {[
                      { val: 1, label: '1st Year' },
                      { val: 2, label: '2nd Year' },
                      { val: 3, label: '3rd Year' },
                    ].map((y) => (
                      <button
                        key={y.val}
                        type="button"
                        onClick={() => setDiplomaYear(y.val as 1 | 2 | 3)}
                        style={{
                          flex: 1,
                          padding: '9px',
                          borderRadius: '8px',
                          border:
                            diplomaYear === y.val
                              ? '2px solid #5B4BFF'
                              : '1px solid var(--aiims-input-border, #E2E8F0)',
                          background: diplomaYear === y.val ? '#5B4BFF' : 'transparent',
                          color: diplomaYear === y.val ? '#ffffff' : 'var(--aiims-text-heading, #0F172A)',
                          fontWeight: 650,
                          fontSize: '13px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {y.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Polytechnic / Institute Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Government Polytechnic College"
                    value={polytechnicName}
                    onChange={(e) => setPolytechnicName(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            {/* ── Category E & F: Degree & Postgraduate ─────────────────────── */}
            {(educationCategory === 'DEGREE' || educationCategory === 'POSTGRADUATE') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Academic Stream */}
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Academic Stream *</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setStream('TECH')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border:
                          stream === 'TECH'
                            ? '2px solid #5B4BFF'
                            : '1px solid var(--aiims-input-border, #E2E8F0)',
                        background: stream === 'TECH' ? '#5B4BFF' : 'transparent',
                        color: stream === 'TECH' ? '#ffffff' : 'var(--aiims-text-heading, #0F172A)',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Technology & Engineering
                    </button>
                    <button
                      type="button"
                      onClick={() => setStream('NON_TECH')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border:
                          stream === 'NON_TECH'
                            ? '2px solid #5B4BFF'
                            : '1px solid var(--aiims-input-border, #E2E8F0)',
                        background: stream === 'NON_TECH' ? '#5B4BFF' : 'transparent',
                        color: stream === 'NON_TECH' ? '#ffffff' : 'var(--aiims-text-heading, #0F172A)',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Non-Technology & Commerce
                    </button>
                  </div>
                </div>

                {/* Degree Program */}
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Program / Degree *</label>
                  <select
                    value={programId}
                    onChange={(e) => {
                      setProgramId(e.target.value);
                      const specs = getSpecializationsForProgram(e.target.value, stream);
                      if (specs.length > 0) setSpecializationId(specs[0].id);
                    }}
                    style={inputStyle}
                  >
                    {availablePrograms.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Specialization / Branch */}
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Branch / Specialization *</label>
                  {availableSpecializations.length > 0 ? (
                    <select
                      value={specializationId}
                      onChange={(e) => setSpecializationId(e.target.value)}
                      style={inputStyle}
                    >
                      {availableSpecializations.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. Computer Science & Engineering"
                      value={customSpecialization}
                      onChange={(e) => setCustomSpecialization(e.target.value)}
                      style={inputStyle}
                    />
                  )}
                </div>

                {/* Year of Study */}
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Current Year of Study *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {availableYears.map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setYearOfStudy(yr)}
                        style={{
                          flex: 1,
                          padding: '9px',
                          borderRadius: '8px',
                          border:
                            yearOfStudy === yr
                              ? '2px solid #5B4BFF'
                              : '1px solid var(--aiims-input-border, #E2E8F0)',
                          background: yearOfStudy === yr ? '#5B4BFF' : 'transparent',
                          color: yearOfStudy === yr ? '#ffffff' : 'var(--aiims-text-heading, #0F172A)',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        Year {yr}
                      </button>
                    ))}
                  </div>
                </div>

                {/* College / Institute Selection */}
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>College or University *</label>
                  {!isCustomCollege ? (
                    <div style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <input
                            type="text"
                            placeholder="Search your college or university..."
                            value={
                              selectedInstitute ? selectedInstitute.name : instituteQuery
                            }
                            onChange={(e) => {
                              setSelectedInstitute(null);
                              setInstituteQuery(e.target.value);
                              setInstituteDropdownOpen(true);
                            }}
                            onFocus={() => setInstituteDropdownOpen(true)}
                            style={{ ...inputStyle, paddingLeft: '36px' }}
                          />
                          <Search
                            size={16}
                            style={{
                              position: 'absolute',
                              left: '12px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: 'var(--aiims-text-muted, #94A3B8)',
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomCollege(true);
                            setSelectedInstitute(null);
                          }}
                          style={{
                            ...btnSecondary,
                            padding: '0 12px',
                            fontSize: '12px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Plus size={14} /> Other
                        </button>
                      </div>

                      {/* Dropdown Results */}
                      {instituteDropdownOpen && instituteOptions.length > 0 && (
                        <div className="institute-dropdown">
                          {instituteOptions.map((opt) => (
                            <div
                              key={opt._id}
                              className={`institute-item ${
                                selectedInstitute?._id === opt._id ? 'selected' : ''
                              }`}
                              onClick={() => {
                                setSelectedInstitute(opt);
                                setInstituteDropdownOpen(false);
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>{opt.name}</div>
                              {opt.city && (
                                <div
                                  style={{
                                    fontSize: '11px',
                                    color: 'var(--aiims-text-muted, #64748B)',
                                  }}
                                >
                                  {opt.city}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Type full college / university name"
                        value={customCollegeName}
                        onChange={(e) => setCustomCollegeName(e.target.value)}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => setIsCustomCollege(false)}
                        style={{ ...btnSecondary, padding: '0 12px', fontSize: '12px' }}
                      >
                        Search list
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
              <button
                type="button"
                className="reg-btn-secondary"
                style={btnSecondary}
                onClick={handlePrevStep}
                disabled={isLoading}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>

              <button
                type="button"
                className="reg-btn-primary"
                style={{ ...btnPrimary, opacity: isLoading ? 0.7 : 1 }}
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <Check size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: VENTURE DETAILS (ENTREPRENEUR) ───────────────────────── */}
        {step === 2 && track === 'Entrepreneur' && (
          <div className="reg-fade">
            <div style={{ marginBottom: '22px' }}>
              <h2
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0F172A)',
                  letterSpacing: '-0.4px',
                  margin: '0 0 4px',
                }}
              >
                Your Venture Profile
              </h2>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--aiims-text-muted, #64748B)',
                  margin: 0,
                }}
              >
                Tell us about your startup or venture idea. All fields are optional.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Venture Name */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Venture or Project Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. HealthAI, NovaPay, or leave blank if exploring"
                  value={ventureName}
                  onChange={(e) => setVentureName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Industry */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Primary Industry / Sector</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  style={inputStyle}
                >
                  {VENTURE_INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              {/* Venture Stage */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Current Stage</label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                  }}
                >
                  {VENTURE_STAGES.slice(0, 4).map((stg) => {
                    const isSelected = ventureStage === stg.value;
                    return (
                      <button
                        key={stg.value}
                        type="button"
                        onClick={() => setVentureStage(stg.value)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: isSelected
                            ? '2px solid #5B4BFF'
                            : '1px solid var(--aiims-input-border, #E2E8F0)',
                          background: isSelected
                            ? isDarkMode
                              ? 'rgba(91, 75, 255, 0.2)'
                              : '#EEF2FF'
                            : 'transparent',
                          color: isSelected
                            ? '#5B4BFF'
                            : 'var(--aiims-text-heading, #0F172A)',
                          fontSize: '12.5px',
                          fontWeight: isSelected ? 700 : 550,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s',
                          fontFamily: 'inherit',
                        }}
                      >
                        {stg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Navigation buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
              <button
                type="button"
                className="reg-btn-secondary"
                style={btnSecondary}
                onClick={handlePrevStep}
                disabled={isLoading}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>

              <button
                type="button"
                className="reg-btn-primary"
                style={{ ...btnPrimary, opacity: isLoading ? 0.7 : 1 }}
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <Check size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer Link to Sign In */}
        <div
          style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '13px',
            color: 'var(--aiims-text-muted, #64748B)',
          }}
        >
          Already have an account?{' '}
          <button
            type="button"
            onClick={onNavigateToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: '#5B4BFF',
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'inherit',
              textDecoration: 'underline',
            }}
          >
            Sign In
          </button>
        </div>
      </div>

      {/* Support text */}
      <div
        style={{
          marginTop: '20px',
          fontSize: '12px',
          color: 'var(--aiims-text-muted, #94A3B8)',
          textAlign: 'center',
        }}
      >
        Need assistance? Contact{' '}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          style={{ color: '#5B4BFF', textDecoration: 'none', fontWeight: 600 }}
        >
          {SUPPORT_EMAIL}
        </a>
      </div>
    </div>
  );
};
