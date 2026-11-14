import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  GraduationCap,
  Sparkles,
  User,
  Eye,
  EyeOff,
  Search,
  Plus,
  Loader2,
  Sun,
  Moon,
  Briefcase,
} from 'lucide-react';
import { useLearner, RegistrationPayload } from '../../context/LearnerContext';
import { useTheme } from '../../context/ThemeContext';
import { AiimsLogo } from '../../components/common/AiimsLogo';
import { SUPPORT_EMAIL } from '../../config/appConfig';
import {
  STREAMS,
  TECH_SUB_CATEGORIES,
  NON_TECH_SUB_CATEGORIES,
  EDUCATION_LEVELS,
  PROGRAMS,
  SPECIALIZATIONS,
  AI_FAMILIARITY_OPTIONS,
  AI_USAGE_CONTEXTS,
  PRIMARY_GOAL_OPTIONS,
  Stream,
  EducationLevel,
  getProgramsForStreamAndLevel,
  getSpecializationsForProgram,
  getYearsForLevel,
  getProgramDuration,
  getStudyYearsForProgram,
  getDynamicStartYears,
  getDynamicGraduationYears,
  deriveExpectedGraduationYear,
  VENTURE_STAGES,
  VENTURE_INDUSTRIES,
  ENTREPRENEUR_GOALS,
  SKILLS_TO_DEVELOP,
  BUSINESS_CHALLENGES,
  PREFERRED_SUPPORT_AREAS,
} from '../../config/academicTaxonomy';
import { apiClient } from '../../api/client';
import { calculatePasswordStrength, isCommonPassword } from '../../utils/passwordSecurity';

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

const STUDENT_STEP_LABELS = ['Account', 'Academics', 'AI Profile'];
const STUDENT_STEP_ICONS = [User, GraduationCap, Sparkles];

const ENTREPRENEUR_STEP_LABELS = ['Account', 'Venture Info', 'Growth & Goals'];
const ENTREPRENEUR_STEP_ICONS = [User, Briefcase, Sparkles];

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
  const [track, setTrack] = useState<'Student' | 'Entrepreneur' | ''>('Student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Dynamic Stepper definitions
  const stepLabels = track === 'Entrepreneur' ? ENTREPRENEUR_STEP_LABELS : STUDENT_STEP_LABELS;
  const stepIcons = track === 'Entrepreneur' ? ENTREPRENEUR_STEP_ICONS : STUDENT_STEP_ICONS;

  // Password strength
  const passwordStrength = calculatePasswordStrength(password);

  // Step 1 validity guard (disables Continue when invalid)
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

  // ── Step 2: Academics (Student) ───────────────────────────────────────────
  const [instituteQuery, setInstituteQuery] = useState('');
  const [instituteOptions, setInstituteOptions] = useState<InstituteOption[]>([]);
  const [selectedInstitute, setSelectedInstitute] = useState<InstituteOption | null>(null);
  const [instituteDropdownOpen, setInstituteDropdownOpen] = useState(false);
  const [isLoadingInstitutes, setIsLoadingInstitutes] = useState(false);
  const [isCustomCollege, setIsCustomCollege] = useState(false);
  const [customCollegeName, setCustomCollegeName] = useState('');

  const [stream, setStream] = useState<Stream | ''>('');
  const [streamSubCategory, setStreamSubCategory] = useState('');
  const [educationLevel, setEducationLevel] = useState<EducationLevel | ''>('');
  const [programId, setProgramId] = useState('');
  const [specializationId, setSpecializationId] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState<number | ''>('');
  const [admissionYear, setAdmissionYear] = useState<number | ''>('');
  const [expectedGraduationYear, setExpectedGraduationYear] = useState<number | ''>('');

  // ── Step 2 & 3: Entrepreneur Specific Onboarding State ────────────────────
  const [ventureName, setVentureName] = useState('');
  const [isIdeationVenture, setIsIdeationVenture] = useState(false);
  const [industry, setIndustry] = useState(VENTURE_INDUSTRIES[0]);
  const [problemStatement, setProblemStatement] = useState('');
  const [ventureStage, setVentureStage] = useState('exploring_idea');

  const [entrepreneurGoal, setEntrepreneurGoal] = useState(ENTREPRENEUR_GOALS[0].value);
  const [skillsToDevelop, setSkillsToDevelop] = useState<string[]>([SKILLS_TO_DEVELOP[0]]);
  const [businessChallenges, setBusinessChallenges] = useState<string[]>([BUSINESS_CHALLENGES[0]]);
  const [preferredSupport, setPreferredSupport] = useState<string[]>([PREFERRED_SUPPORT_AREAS[0]]);

  const toggleSkill = (skill: string) => {
    setSkillsToDevelop((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const toggleChallenge = (item: string) => {
    setBusinessChallenges((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    );
  };

  const toggleSupport = (item: string) => {
    setPreferredSupport((prev) =>
      prev.includes(item) ? prev.filter((s) => s !== item) : [...prev, item]
    );
  };

  // Derived lists for Student
  const subCategories = stream
    ? stream === 'TECH'
      ? TECH_SUB_CATEGORIES
      : NON_TECH_SUB_CATEGORIES
    : [];
  const availablePrograms =
    stream && educationLevel
      ? getProgramsForStreamAndLevel(stream as Stream, educationLevel as EducationLevel)
      : [];
  const availableSpecializations =
    programId && stream ? getSpecializationsForProgram(programId, stream as Stream) : [];
  const availableYears = programId
    ? getStudyYearsForProgram(programId)
    : educationLevel
      ? getYearsForLevel(educationLevel as EducationLevel)
      : [1, 2, 3, 4];
  const availableStartYears = getDynamicStartYears(programId || undefined);
  const availableGraduationYears = getDynamicGraduationYears(
    programId || undefined,
    admissionYear ? Number(admissionYear) : undefined,
    yearOfStudy ? Number(yearOfStudy) : undefined
  );

  // Auto-derive expected graduation year when programId or admissionYear changes
  useEffect(() => {
    if (admissionYear && programId) {
      const derived = deriveExpectedGraduationYear(
        Number(admissionYear),
        programId,
        yearOfStudy ? Number(yearOfStudy) : undefined
      );
      setExpectedGraduationYear(derived);
    }
  }, [admissionYear, programId, yearOfStudy]);

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

  // ── Step 3: AI Context ────────────────────────────────────────────────────
  const [aiFamiliarity, setAiFamiliarity] = useState('');
  const [aiUsageContexts, setAiUsageContexts] = useState<string[]>([]);
  const [primaryGoal, setPrimaryGoal] = useState('');

  const toggleUsageContext = (val: string) => {
    setAiUsageContexts((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  // ── Step validation ───────────────────────────────────────────────────────
  const validateStep1 = (): string | null => {
    if (!track || !['Student', 'Entrepreneur'].includes(track)) {
      setErrorField('track');
      return 'Please select your track (Student or Entrepreneur).';
    }
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
      if (isCustomCollege) {
        if (!customCollegeName.trim() || customCollegeName.trim().length < 2) {
          setErrorField('college');
          return 'Please enter your college or institute name.';
        }
      } else {
        if (!selectedInstitute && !customCollegeName.trim()) {
          setErrorField('college');
          return 'Please select your college or enter it manually.';
        }
      }
      if (!stream) {
        setErrorField('stream');
        return 'Please select your academic stream.';
      }
      if (!educationLevel) {
        setErrorField('educationLevel');
        return 'Please select your education level.';
      }
      if (!programId) {
        setErrorField('programId');
        return 'Please select your degree or program.';
      }
      if (!specializationId) {
        setErrorField('specializationId');
        return 'Please select your branch or specialization.';
      }
      if (!yearOfStudy) {
        setErrorField('yearOfStudy');
        return 'Please select your current year of study.';
      }
      if (!admissionYear) {
        setErrorField('admissionYear');
        return 'Please select your admission year.';
      }
      if (!expectedGraduationYear) {
        setErrorField('expectedGraduationYear');
        return 'Please select your expected graduation year.';
      }
      if (Number(expectedGraduationYear) <= Number(admissionYear)) {
        setErrorField('expectedGraduationYear');
        return 'Expected graduation year must be after admission year.';
      }
    } else if (track === 'Entrepreneur') {
      if (!isIdeationVenture && ventureName.trim().length > 0 && ventureName.trim().length < 2) {
        setErrorField('ventureName');
        return 'Venture name must be at least 2 characters long.';
      }
      if (!industry) {
        setErrorField('industry');
        return 'Please select your industry or sector.';
      }
      if (!ventureStage) {
        setErrorField('ventureStage');
        return 'Please select your current venture stage.';
      }
    }
    return null;
  };

  const validateStep3 = (): string | null => {
    if (track === 'Student') {
      if (!aiFamiliarity) {
        setErrorField('aiFamiliarity');
        return 'Please describe your current AI experience.';
      }
      if (!primaryGoal) {
        setErrorField('primaryGoal');
        return 'Please select your primary learning goal.';
      }
    } else if (track === 'Entrepreneur') {
      if (!entrepreneurGoal) {
        setErrorField('primaryGoal');
        return 'Please select your primary venture goal.';
      }
    }
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
    if (isLoading) return;
    setErrorMessage('');
    setErrorField('');
    const err = validateStep3();
    if (err) {
      setErrorMessage(err);
      return;
    }

    const selectedProgram = programId ? PROGRAMS.find((p) => p.id === programId) : undefined;
    const selectedSpec = specializationId
      ? SPECIALIZATIONS.find((s) => s.id === specializationId)
      : undefined;

    let payload: RegistrationPayload;

    if (track === 'Student') {
      const instituteNameFinal = isCustomCollege
        ? customCollegeName.trim()
        : selectedInstitute?.name || customCollegeName.trim() || 'Independent Learner';

      payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        track: 'Student',
        instituteId:
          isCustomCollege || !selectedInstitute?._id || selectedInstitute._id.startsWith('inst-')
            ? undefined
            : selectedInstitute._id,
        instituteName: instituteNameFinal,
        stream: stream as string,
        streamSubCategory: streamSubCategory || undefined,
        educationLevel: educationLevel as string,
        programId,
        programName: selectedProgram?.label || programId,
        specializationId,
        specializationName: selectedSpec?.label || specializationId,
        yearOfStudy: Number(yearOfStudy),
        admissionYear: Number(admissionYear),
        expectedGraduationYear: Number(expectedGraduationYear),
        aiFamiliarity,
        aiUsageContexts,
        primaryGoal,
      };
    } else {
      payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        track: 'Entrepreneur',
        ventureName: isIdeationVenture
          ? 'Ideation / Not started'
          : ventureName.trim() || 'Ideation / Not started',
        industry,
        problemStatement: problemStatement.trim() || undefined,
        ventureStage,
        primaryGoal: entrepreneurGoal,
        skillsToDevelop,
        businessChallenges,
        preferredSupport,
      };
    }

    setIsLoading(true);
    try {
      const res = await register(payload);
      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.error || 'Registration failed. Please try again.');
        if (res.field) setErrorField(res.field);
        // Navigate back to the relevant step if error is field-specific
        if (
          res.field &&
          ['name', 'email', 'password', 'confirmPassword', 'track'].includes(res.field)
        )
          setStep(1);
        else if (
          res.field &&
          [
            'stream',
            'educationLevel',
            'programId',
            'specializationId',
            'yearOfStudy',
            'admissionYear',
            'expectedGraduationYear',
            'ventureName',
            'industry',
            'ventureStage',
          ].includes(res.field)
        )
          setStep(2);
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
    gap: '8px',
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
    gap: '8px',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: '36px',
    cursor: 'pointer',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: 'var(--aiims-bg-page, #F8F9FE)',
        backgroundImage: isDarkMode
          ? 'radial-gradient(circle at 50% 15%, rgba(139, 92, 246, 0.14) 0%, transparent 60%)'
          : 'radial-gradient(circle at 50% 15%, rgba(109, 93, 251, 0.08) 0%, transparent 60%)',
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
        color: 'var(--aiims-text-primary, #0F172A)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 16px 64px',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
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
          zIndex: 50,
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
        .reg-select option {
          background-color: var(--aiims-bg-card, #ffffff);
          color: var(--aiims-text-primary, #0F172A);
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
          color: var(--aiims-primary-text, #4338CA);
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
        .institute-item.selected { background: rgba(91,75,255,0.12); color: var(--aiims-primary-text, #4338CA); font-weight: 600; }
        .reg-btn-primary:hover:not(:disabled) {
          background: #4338CA !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(91, 75, 255, 0.4);
        }
        .reg-btn-secondary:hover:not(:disabled) {
          background: var(--aiims-bg-card-hover, #F8FAFC) !important;
          transform: translateY(-1px);
        }
      `}</style>

      {/* Logo */}
      <div style={{ marginBottom: '28px', cursor: 'pointer' }} onClick={onNavigateToHome}>
        <AiimsLogo size="lg" showWordmark={true} />
      </div>

      {/* Step Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0',
          marginBottom: '28px',
          maxWidth: '480px',
          width: '100%',
        }}
      >
        {stepLabels.map((label, i) => {
          const stepNum = (i + 1) as Step;
          const isActive = step === stepNum;
          const isComplete = step > stepNum;
          const StepIcon = stepIcons[i];

          return (
            <React.Fragment key={stepNum}>
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}
              >
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
                          ? 'var(--aiims-border-card, #202b4d)'
                          : '#E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s',
                    marginBottom: '4px',
                  }}
                >
                  {isComplete ? (
                    <Check size={16} color="#fff" />
                  ) : (
                    <StepIcon
                      size={16}
                      color={isActive ? '#fff' : isDarkMode ? '#64748B' : '#94A3B8'}
                    />
                  )}
                </div>
                <span
                  style={{
                    fontSize: '11px',
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
                          ? 'var(--aiims-border-card, #202b4d)'
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

      {/* Card */}
      <div
        style={{
          maxWidth: '520px',
          width: '100%',
          backgroundColor: 'var(--aiims-bg-card, #ffffff)',
          borderRadius: '20px',
          border: '1px solid var(--aiims-border-card, #E2E8F0)',
          padding: '36px 32px',
          boxShadow: isDarkMode
            ? '0 20px 40px -15px rgba(0,0,0,0.5)'
            : 'var(--aiims-shadow-card, 0 20px 40px -15px rgba(0,0,0,0.06))',
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
              style={{ flexShrink: 0, marginTop: '1px', color: isDarkMode ? '#EF4444' : '#DC2626' }}
            />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ─── STEP 1: ACCOUNT ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="reg-fade">
            <div style={{ marginBottom: '24px' }}>
              <h2
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0F172A)',
                  letterSpacing: '-0.4px',
                  margin: '0 0 4px',
                }}
              >
                Create your AIIMS account
              </h2>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--aiims-text-secondary, #64748B)',
                  margin: 0,
                }}
              >
                Your journey into AI intelligence starts here.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Mandatory Learner Track Selection */}
              <div style={fieldGroupStyle}>
                <label
                  style={{
                    ...labelStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>
                    Select Learner Track <span style={{ color: '#EF4444' }}>*</span>
                  </span>
                  {track && (
                    <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 650 }}>
                      ✓ {track} Track Selected
                    </span>
                  )}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    id="track-student-btn"
                    onClick={() => {
                      setTrack('Student');
                      if (errorField === 'track') setErrorField('');
                      setErrorMessage('');
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '6px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s',
                      border:
                        track === 'Student'
                          ? '2px solid #5B4BFF'
                          : errorField === 'track'
                            ? '1.5px solid #F87171'
                            : isDarkMode
                              ? '1.5px solid var(--aiims-input-border, #2c3b63)'
                              : '1.5px solid #E2E8F0',
                      backgroundColor:
                        track === 'Student'
                          ? isDarkMode
                            ? 'rgba(91, 75, 255, 0.18)'
                            : 'rgba(91, 75, 255, 0.08)'
                          : isDarkMode
                            ? 'var(--aiims-input-bg, #111a36)'
                            : '#ffffff',
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}
                    >
                      <GraduationCap
                        size={18}
                        color={track === 'Student' ? '#5B4BFF' : isDarkMode ? '#94A3B8' : '#64748B'}
                      />
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '14px',
                          color:
                            track === 'Student' ? '#5B4BFF' : 'var(--aiims-text-heading, #0F172A)',
                        }}
                      >
                        Student
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--aiims-text-secondary, #64748B)',
                        lineHeight: 1.35,
                      }}
                    >
                      College & university academics, career & AI skills
                    </span>
                  </button>

                  <button
                    type="button"
                    id="track-entrepreneur-btn"
                    onClick={() => {
                      setTrack('Entrepreneur');
                      if (errorField === 'track') setErrorField('');
                      setErrorMessage('');
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '6px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s',
                      border:
                        track === 'Entrepreneur'
                          ? '2px solid #5B4BFF'
                          : errorField === 'track'
                            ? '1.5px solid #F87171'
                            : isDarkMode
                              ? '1.5px solid var(--aiims-input-border, #2c3b63)'
                              : '1.5px solid #E2E8F0',
                      backgroundColor:
                        track === 'Entrepreneur'
                          ? isDarkMode
                            ? 'rgba(91, 75, 255, 0.18)'
                            : 'rgba(91, 75, 255, 0.08)'
                          : isDarkMode
                            ? 'var(--aiims-input-bg, #111a36)'
                            : '#ffffff',
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}
                    >
                      <Briefcase
                        size={18}
                        color={
                          track === 'Entrepreneur' ? '#5B4BFF' : isDarkMode ? '#94A3B8' : '#64748B'
                        }
                      />
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '14px',
                          color:
                            track === 'Entrepreneur'
                              ? '#5B4BFF'
                              : 'var(--aiims-text-heading, #0F172A)',
                        }}
                      >
                        Entrepreneur
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--aiims-text-secondary, #64748B)',
                        lineHeight: 1.35,
                      }}
                    >
                      Founders & innovators building and scaling ventures
                    </span>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Full Name</label>
                <input
                  id="reg-name"
                  className="reg-input"
                  type="text"
                  style={{
                    ...inputStyle,
                    borderColor:
                      errorField === 'name'
                        ? '#F87171'
                        : isDarkMode
                          ? 'var(--aiims-input-border, #2c3b63)'
                          : '#E2E8F0',
                  }}
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errorField === 'name') setErrorField('');
                    if (errorMessage) setErrorMessage('');
                  }}
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
                  style={{
                    ...inputStyle,
                    borderColor:
                      errorField === 'email'
                        ? '#F87171'
                        : isDarkMode
                          ? 'var(--aiims-input-border, #2c3b63)'
                          : '#E2E8F0',
                  }}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorField === 'email') setErrorField('');
                    if (errorMessage) setErrorMessage('');
                  }}
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle} htmlFor="reg-password">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reg-password"
                    className="reg-input"
                    type={showPassword ? 'text' : 'password'}
                    style={{
                      ...inputStyle,
                      paddingRight: '42px',
                      borderColor:
                        errorField === 'password'
                          ? '#F87171'
                          : password && isCommonPassword(password)
                            ? '#F87171'
                            : password && password.length >= 8
                              ? '#10B981'
                              : isDarkMode
                                ? 'var(--aiims-input-border, #2c3b63)'
                                : '#E2E8F0',
                    }}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorField === 'password') setErrorField('');
                      if (errorMessage) setErrorMessage('');
                    }}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password helper & validation status */}
                {!password ? (
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--aiims-text-secondary, #64748B)',
                      marginTop: '4px',
                    }}
                  >
                    Must be at least 8 characters long
                  </span>
                ) : isCommonPassword(password) ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '5px',
                      color: '#EF4444',
                      fontSize: '12px',
                      fontWeight: 500,
                    }}
                  >
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    <span>This password is too common or easily guessed.</span>
                  </div>
                ) : password.length < 8 ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '5px',
                      color: 'var(--aiims-text-secondary, #64748B)',
                      fontSize: '12px',
                    }}
                  >
                    <span>At least 8 characters required ({password.length}/8)</span>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '5px',
                      color: '#10B981',
                      fontSize: '12px',
                      fontWeight: 500,
                    }}
                  >
                    <Check size={14} style={{ flexShrink: 0 }} />
                    <span>At least 8 characters</span>
                  </div>
                )}

                {/* Password strength indicator */}
                {password && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', gap: '5px', marginBottom: '4px' }}>
                      {[1, 2, 3].map((s) => (
                        <div
                          key={s}
                          style={{
                            flex: 1,
                            height: '4px',
                            borderRadius: '4px',
                            background:
                              s <= passwordStrength.score
                                ? passwordStrength.color
                                : isDarkMode
                                  ? 'var(--aiims-border-card, #202b4d)'
                                  : '#E2E8F0',
                            transition: 'all 0.25s ease',
                          }}
                        />
                      ))}
                    </div>
                    {passwordStrength.label && (
                      <span
                        style={{
                          fontSize: '12px',
                          color: passwordStrength.color,
                          fontWeight: 600,
                          transition: 'color 0.2s',
                        }}
                      >
                        {passwordStrength.label} password
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle} htmlFor="reg-confirm-password">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reg-confirm-password"
                    className="reg-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    style={{
                      ...inputStyle,
                      paddingRight: '42px',
                      borderColor:
                        !confirmPassword
                          ? errorField === 'confirmPassword'
                            ? '#F87171'
                            : isDarkMode
                              ? 'var(--aiims-input-border, #2c3b63)'
                              : '#E2E8F0'
                          : confirmPassword === password
                            ? '#10B981'
                            : '#EF4444',
                    }}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errorField === 'confirmPassword') setErrorField('');
                      if (errorMessage) setErrorMessage('');
                    }}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Confirm Password match / mismatch indicator */}
                {confirmPassword && (
                  confirmPassword === password ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '6px',
                        color: '#10B981',
                        fontSize: '12px',
                        fontWeight: 550,
                      }}
                    >
                      <CheckCircle size={14} style={{ flexShrink: 0 }} />
                      <span>Passwords match</span>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '6px',
                        color: '#EF4444',
                        fontSize: '12px',
                        fontWeight: 550,
                      }}
                    >
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span>Passwords do not match</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 2: ACADEMICS / VENTURE ─────────────────────────────────── */}
        {step === 2 && (
          <div className="reg-fade">
            <div style={{ marginBottom: '24px' }}>
              <h2
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0F172A)',
                  letterSpacing: '-0.4px',
                  margin: '0 0 4px',
                }}
              >
                {track === 'Entrepreneur'
                  ? 'Venture & Startup Information'
                  : 'Your Academic Identity'}
              </h2>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--aiims-text-secondary, #64748B)',
                  margin: 0,
                }}
              >
                {track === 'Entrepreneur'
                  ? 'Tell us about your venture so AIIMS can tailor AI tool discovery, business diagnostics, and workflow templates.'
                  : 'This powers accurate peer benchmarks and ensures your learning context is correct.'}
              </p>
            </div>

            {track === 'Entrepreneur' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Venture Name */}
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>
                    Venture / Startup Name{' '}
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 400 }}>
                      (Optional)
                    </span>
                  </label>
                  <input
                    id="reg-venture-name"
                    type="text"
                    style={{
                      ...inputStyle,
                      opacity: isIdeationVenture ? 0.6 : 1,
                      backgroundColor: isIdeationVenture
                        ? isDarkMode
                          ? 'rgba(255,255,255,0.03)'
                          : '#F8FAFC'
                        : inputStyle.backgroundColor,
                    }}
                    disabled={isIdeationVenture}
                    placeholder="e.g. Apex AI, Stealth Startup, or Leave Blank"
                    value={isIdeationVenture ? 'Ideation / Not started' : ventureName}
                    onChange={(e) => setVentureName(e.target.value)}
                  />
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '6px',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                      color: 'var(--aiims-text-secondary, #475569)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isIdeationVenture}
                      onChange={(e) => {
                        setIsIdeationVenture(e.target.checked);
                        if (e.target.checked) setVentureName('');
                      }}
                      style={{
                        width: '16px',
                        height: '16px',
                        accentColor: '#5B4BFF',
                        cursor: 'pointer',
                      }}
                    />
                    <span>Not started yet / Exploring startup ideas</span>
                  </label>
                </div>

                {/* Industry / Sector */}
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>
                    Industry / Sector <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    id="reg-venture-industry"
                    className="reg-select"
                    style={selectStyle}
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  >
                    {VENTURE_INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Problem Statement / Business Idea */}
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>
                    Problem Statement & Business Idea{' '}
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 400 }}>
                      (Optional)
                    </span>
                  </label>
                  <textarea
                    id="reg-problem-statement"
                    rows={3}
                    style={{
                      ...inputStyle,
                      resize: 'vertical',
                      minHeight: '75px',
                      lineHeight: 1.45,
                    }}
                    placeholder="Briefly describe the customer problem you're addressing, your proposed product/service concept, or target market..."
                    value={problemStatement}
                    onChange={(e) => setProblemStatement(e.target.value)}
                  />
                </div>

                {/* Venture Stage Selection Cards */}
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>
                    Current Venture Stage <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      maxHeight: '260px',
                      overflowY: 'auto',
                      paddingRight: '4px',
                    }}
                  >
                    {VENTURE_STAGES.map((stg) => {
                      const isSelected = ventureStage === stg.value;
                      return (
                        <button
                          key={stg.value}
                          type="button"
                          onClick={() => setVentureStage(stg.value)}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            transition: 'all 0.15s',
                            border: isSelected
                              ? '2px solid #5B4BFF'
                              : isDarkMode
                                ? '1.5px solid var(--aiims-border-card, #202b4d)'
                                : '1.5px solid #E2E8F0',
                            background: isSelected
                              ? isDarkMode
                                ? 'rgba(91, 75, 255, 0.18)'
                                : 'rgba(91, 75, 255, 0.08)'
                              : isDarkMode
                                ? 'var(--aiims-bg-card, #111a36)'
                                : '#ffffff',
                          }}
                        >
                          <div
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              marginTop: '2px',
                              flexShrink: 0,
                              border: `2px solid ${isSelected ? '#5B4BFF' : isDarkMode ? '#475569' : '#CBD5E1'}`,
                              background: isSelected ? '#5B4BFF' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {isSelected && (
                              <div
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: '#fff',
                                }}
                              />
                            )}
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: 700,
                                color: isSelected
                                  ? '#5B4BFF'
                                  : 'var(--aiims-text-heading, #0F172A)',
                              }}
                            >
                              {stg.label}
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: 'var(--aiims-text-secondary, #64748B)',
                                marginTop: '2px',
                                lineHeight: 1.35,
                              }}
                            >
                              {stg.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* College / Institute with Free-text & Directory toggle */}
                <div style={{ ...fieldGroupStyle, position: 'relative' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px',
                    }}
                  >
                    <label style={{ ...labelStyle, marginBottom: 0 }}>
                      College / University / Institute <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCollege(!isCustomCollege);
                        setSelectedInstitute(null);
                        setInstituteDropdownOpen(false);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#5B4BFF',
                        fontSize: '12px',
                        fontWeight: 650,
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                      }}
                    >
                      {isCustomCollege ? 'Search verified directory' : 'My college is not listed'}
                    </button>
                  </div>

                  {isCustomCollege ? (
                    <div>
                      <input
                        id="reg-custom-college"
                        className="reg-input"
                        type="text"
                        style={inputStyle}
                        placeholder="Type your college or university full name..."
                        value={customCollegeName}
                        onChange={(e) => setCustomCollegeName(e.target.value)}
                      />
                      <span
                        style={{
                          fontSize: '11.5px',
                          color: 'var(--aiims-text-muted, #94A3B8)',
                          marginTop: '4px',
                          display: 'block',
                        }}
                      >
                        Enter your institution name manually. You will receive full access.
                      </span>
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <Search
                        size={15}
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#94A3B8',
                        }}
                      />
                      <input
                        id="reg-institute"
                        className="reg-input"
                        type="text"
                        style={{ ...inputStyle, paddingLeft: '36px', paddingRight: '36px' }}
                        placeholder="Search your college or university..."
                        value={selectedInstitute ? selectedInstitute.name : instituteQuery}
                        onChange={(e) => {
                          setInstituteQuery(e.target.value);
                          setSelectedInstitute(null);
                          setInstituteDropdownOpen(true);
                        }}
                        onFocus={() => setInstituteDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setInstituteDropdownOpen(false), 200)}
                      />
                      {isLoadingInstitutes && (
                        <Loader2
                          size={15}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#94A3B8',
                            animation: 'spin 1s linear infinite',
                          }}
                        />
                      )}
                      {selectedInstitute && (
                        <Check
                          size={15}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#10B981',
                          }}
                        />
                      )}
                      {instituteDropdownOpen && (
                        <div className="institute-dropdown">
                          {instituteOptions.map((inst) => (
                            <div
                              key={inst._id}
                              className={`institute-item ${selectedInstitute?._id === inst._id ? 'selected' : ''}`}
                              onMouseDown={() => {
                                setSelectedInstitute(inst);
                                setInstituteQuery('');
                                setInstituteDropdownOpen(false);
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: '13px',
                                  color: 'var(--aiims-text-primary, #0F172A)',
                                }}
                              >
                                {inst.name}
                              </div>
                              {inst.city && (
                                <div
                                  style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}
                                >
                                  {inst.city}
                                </div>
                              )}
                            </div>
                          ))}
                          <div
                            className="institute-item"
                            style={{
                              color: '#5B4BFF',
                              fontWeight: 600,
                              borderTop: '1px dashed #CBD5E1',
                            }}
                            onMouseDown={() => {
                              setIsCustomCollege(true);
                              setSelectedInstitute(null);
                              setInstituteDropdownOpen(false);
                            }}
                          >
                            <Plus
                              size={13}
                              style={{ marginRight: '6px', verticalAlign: 'middle' }}
                            />
                            My college is not listed (enter manually)
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Stream Selection */}
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>
                    Stream <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {STREAMS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        className={`reg-stream-card ${stream === s.value ? 'selected' : ''}`}
                        onClick={() => setStream(s.value)}
                      >
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color:
                              stream === s.value
                                ? isDarkMode
                                  ? '#A5B4FC'
                                  : '#4338CA'
                                : 'var(--aiims-text-primary, #0F172A)',
                            marginBottom: '2px',
                          }}
                        >
                          {s.label}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--aiims-text-muted, #64748B)',
                            lineHeight: 1.4,
                          }}
                        >
                          {s.description}
                        </div>
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
                      onChange={(e) => setStreamSubCategory(e.target.value)}
                    >
                      <option value="">Select department...</option>
                      {subCategories.map((sc) => (
                        <option key={sc.value} value={sc.value}>
                          {sc.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Education Level */}
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>
                    Education Level <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    id="reg-education-level"
                    className="reg-select"
                    style={selectStyle}
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value as EducationLevel)}
                  >
                    <option value="">Select level...</option>
                    {EDUCATION_LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Program with Duration Label */}
                {educationLevel && stream && (
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>
                      Program / Degree <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                      id="reg-program"
                      className="reg-select"
                      style={selectStyle}
                      value={programId}
                      onChange={(e) => setProgramId(e.target.value)}
                    >
                      <option value="">Select program...</option>
                      {availablePrograms.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label} ({p.normalDuration} {p.normalDuration === 1 ? 'Year' : 'Years'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Specialization */}
                {programId && availableSpecializations.length > 0 && (
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>
                      Specialization / Branch <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                      id="reg-specialization"
                      className="reg-select"
                      style={selectStyle}
                      value={specializationId}
                      onChange={(e) => setSpecializationId(e.target.value)}
                    >
                      <option value="">Select specialization...</option>
                      {availableSpecializations.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Dynamic Study Years, Dynamic Start Year & Dynamic Graduation Year */}
                {educationLevel && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div style={fieldGroupStyle}>
                      <label style={{ ...labelStyle, fontSize: '12px' }}>
                        Current Year <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <select
                        id="reg-year-of-study"
                        className="reg-select"
                        style={{ ...selectStyle, fontSize: '13px' }}
                        value={yearOfStudy}
                        onChange={(e) => setYearOfStudy(Number(e.target.value))}
                      >
                        <option value="">Year</option>
                        {availableYears.map((y) => (
                          <option key={y} value={y}>
                            Year {y}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={{ ...labelStyle, fontSize: '12px' }}>
                        Start Year <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <select
                        id="reg-admission-year"
                        className="reg-select"
                        style={{ ...selectStyle, fontSize: '13px' }}
                        value={admissionYear}
                        onChange={(e) => setAdmissionYear(Number(e.target.value))}
                      >
                        <option value="">Year</option>
                        {availableStartYears.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={{ ...labelStyle, fontSize: '12px' }}>
                        Graduating <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <select
                        id="reg-graduation-year"
                        className="reg-select"
                        style={{ ...selectStyle, fontSize: '13px' }}
                        value={expectedGraduationYear}
                        onChange={(e) => setExpectedGraduationYear(Number(e.target.value))}
                      >
                        <option value="">Year</option>
                        {availableGraduationYears.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 3: AI PROFILE / ENTREPRENEUR GROWTH ────────────────────── */}
        {step === 3 && (
          <div className="reg-fade">
            <div style={{ marginBottom: '24px' }}>
              <h2
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: 'var(--aiims-text-heading, #0F172A)',
                  letterSpacing: '-0.4px',
                  margin: '0 0 4px',
                }}
              >
                {track === 'Entrepreneur' ? 'Growth Goals & Support Areas' : 'Your AI Profile'}
              </h2>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--aiims-text-secondary, #64748B)',
                  margin: 0,
                }}
              >
                {track === 'Entrepreneur'
                  ? 'Select your core growth priorities, skills to master, and preferred mentoring areas.'
                  : 'This personalizes your learning journey. It does not affect your capability score.'}
              </p>
            </div>

            {track === 'Entrepreneur' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Primary Entrepreneur Goal */}
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>
                    Primary Venture Goal <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    id="reg-entrepreneur-goal"
                    className="reg-select"
                    style={selectStyle}
                    value={entrepreneurGoal}
                    onChange={(e) => setEntrepreneurGoal(e.target.value)}
                  >
                    {ENTREPRENEUR_GOALS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Skills to Develop (multi-select pills) */}
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>
                    Skills You Want to Develop{' '}
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 400 }}>
                      Select all that apply
                    </span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {SKILLS_TO_DEVELOP.map((skill) => {
                      const isSelected = skillsToDevelop.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          className={`reg-pill ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleSkill(skill)}
                        >
                          {isSelected && (
                            <Check
                              size={12}
                              style={{ marginRight: '4px', verticalAlign: 'middle' }}
                            />
                          )}
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Key Business Challenges (multi-select pills) */}
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>
                    Key Business Challenges{' '}
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 400 }}>
                      Select all that apply
                    </span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {BUSINESS_CHALLENGES.map((ch) => {
                      const isSelected = businessChallenges.includes(ch);
                      return (
                        <button
                          key={ch}
                          type="button"
                          className={`reg-pill ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleChallenge(ch)}
                        >
                          {isSelected && (
                            <Check
                              size={12}
                              style={{ marginRight: '4px', verticalAlign: 'middle' }}
                            />
                          )}
                          {ch}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Preferred Support Areas (multi-select pills) */}
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>
                    Preferred Support & Mentoring Areas{' '}
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 400 }}>
                      Select all that apply
                    </span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {PREFERRED_SUPPORT_AREAS.map((sup) => {
                      const isSelected = preferredSupport.includes(sup);
                      return (
                        <button
                          key={sup}
                          type="button"
                          className={`reg-pill ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleSupport(sup)}
                        >
                          {isSelected && (
                            <Check
                              size={12}
                              style={{ marginRight: '4px', verticalAlign: 'middle' }}
                            />
                          )}
                          {sup}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Entrepreneur guidance banner */}
                <div
                  style={{
                    padding: '12px 14px',
                    background: isDarkMode ? 'rgba(91, 75, 255, 0.15)' : 'rgba(91, 75, 255, 0.07)',
                    border: isDarkMode
                      ? '1px solid rgba(91, 75, 255, 0.35)'
                      : '1px solid rgba(91, 75, 255, 0.2)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: isDarkMode ? '#C7D2FE' : '#4338CA',
                    lineHeight: 1.5,
                  }}
                >
                  <strong>Founder Advantage:</strong> Your responses configure your AI Wallet tools,
                  Clarity Task Lab challenges, and industry radars specifically for venture
                  building.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* AI Familiarity */}
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>
                    How familiar are you with AI tools? <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {AI_FAMILIARITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAiFamiliarity(opt.value)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: `1.5px solid ${aiFamiliarity === opt.value ? 'var(--aiims-accent-primary, #5B4BFF)' : isDarkMode ? 'var(--aiims-border-card, #202b4d)' : 'var(--aiims-border-card, #E2E8F0)'}`,
                          background:
                            aiFamiliarity === opt.value
                              ? isDarkMode
                                ? 'rgba(91,75,255,0.15)'
                                : 'var(--aiims-accent-glow, rgba(91,75,255,0.07))'
                              : 'var(--aiims-bg-card, #fff)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: 'inherit',
                          transition: 'all 0.15s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            flexShrink: 0,
                            border: `2px solid ${aiFamiliarity === opt.value ? 'var(--aiims-accent-primary, #5B4BFF)' : isDarkMode ? 'var(--aiims-border-card, #2c3b63)' : '#CBD5E1'}`,
                            background:
                              aiFamiliarity === opt.value
                                ? 'var(--aiims-accent-primary, #5B4BFF)'
                                : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {aiFamiliarity === opt.value && (
                            <div
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#fff',
                              }}
                            />
                          )}
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color:
                                aiFamiliarity === opt.value
                                  ? isDarkMode
                                    ? '#A5B4FC'
                                    : '#4338CA'
                                  : 'var(--aiims-text-primary, #0F172A)',
                            }}
                          >
                            {opt.label}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--aiims-text-muted, #94A3B8)',
                              marginTop: '1px',
                            }}
                          >
                            {opt.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Usage Contexts */}
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>
                    How do you use (or plan to use) AI?{' '}
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 400 }}>
                      Select all that apply
                    </span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {AI_USAGE_CONTEXTS.map((ctx) => (
                      <button
                        key={ctx.value}
                        type="button"
                        className={`reg-pill ${aiUsageContexts.includes(ctx.value) ? 'selected' : ''}`}
                        onClick={() => toggleUsageContext(ctx.value)}
                      >
                        {aiUsageContexts.includes(ctx.value) && (
                          <Check
                            size={12}
                            style={{ marginRight: '4px', verticalAlign: 'middle' }}
                          />
                        )}
                        {ctx.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Goal */}
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>
                    What's your primary goal with AIIMS? <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    id="reg-primary-goal"
                    className="reg-select"
                    style={selectStyle}
                    value={primaryGoal}
                    onChange={(e) => setPrimaryGoal(e.target.value)}
                  >
                    <option value="">Select your main goal...</option>
                    {PRIMARY_GOAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Important note about AI context vs capability */}
                <div
                  style={{
                    padding: '12px 14px',
                    background: isDarkMode ? 'rgba(14, 165, 233, 0.15)' : '#F0F9FF',
                    border: isDarkMode ? '1px solid rgba(14, 165, 233, 0.35)' : '1px solid #BAE6FD',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: isDarkMode ? '#7DD3FC' : '#0369A1',
                    lineHeight: 1.5,
                  }}
                >
                  <strong>Note:</strong> Your AI Profile is for personalization only. Your actual
                  capability score is measured exclusively through the AIIMS Assessment — not by
                  what you say here.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Navigation Buttons ──────────────────────────────────────────── */}
        <div style={{ marginTop: '28px', display: 'flex', gap: '12px' }}>
          {step > 1 && (
            <button
              type="button"
              className="reg-btn-secondary"
              style={{ ...btnSecondary, flex: '0 0 auto', width: 'auto', padding: '12px 20px' }}
              onClick={handlePrevStep}
              disabled={isLoading}
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              className="reg-btn-primary"
              style={{
                ...btnPrimary,
                opacity: (step === 1 && !isStep1Valid) || isLoading ? 0.6 : 1,
                cursor: (step === 1 && !isStep1Valid) || isLoading ? 'not-allowed' : 'pointer',
              }}
              onClick={handleNextStep}
              disabled={isLoading || (step === 1 && !isStep1Valid)}
            >
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="reg-btn-primary"
              style={{ ...btnPrimary, background: isLoading ? '#A5B4FC' : '#5B4BFF' }}
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating
                  Account...
                </>
              ) : (
                <>
                  <CheckCircle size={16} /> Create My Account
                </>
              )}
            </button>
          )}
        </div>

        {/* Sign in link */}
        <div
          style={{
            marginTop: '20px',
            textAlign: 'center',
            fontSize: '14px',
            color: 'var(--aiims-text-secondary, #64748B)',
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
              fontSize: 'inherit',
              fontFamily: 'inherit',
            }}
          >
            Sign In
          </button>
        </div>

        {/* Store-Required Legal & Support Links */}
        <div
          style={{
            marginTop: '28px',
            paddingTop: '16px',
            borderTop: '1px solid var(--aiims-border-subtle, #E2E8F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontSize: '12px',
            color: 'var(--aiims-text-muted, #94A3B8)',
            flexWrap: 'wrap',
          }}
        >
          <a
            href="/privacy"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState(null, '', '/privacy');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#5B4BFF')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'inherit')}
          >
            Privacy Policy
          </a>
          <span>•</span>
          <a
            href="/terms"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState(null, '', '/terms');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#5B4BFF')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'inherit')}
          >
            Terms of Service
          </a>
          <span>•</span>
          <a
            href="/refunds"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState(null, '', '/refunds');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#5B4BFF')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'inherit')}
          >
            Refunds
          </a>
          <span>•</span>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#5B4BFF')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'inherit')}
          >
            Support
          </a>
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;
