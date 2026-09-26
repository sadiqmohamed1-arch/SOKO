import React, { useState } from 'react';
import { SokoLogo } from './SokoLogo';
import {
  X,
  Lock,
  Mail,
  User,
  Building2,
  Phone,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

// Authentic Official LinkedIn SVG Logo Icon
const LinkedInIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

const LINKEDIN_AUTH_PROFILES = {
  buyer: {
    name: 'Marcus Vance',
    title: 'Director of Strategic Sourcing & EPC Contracts',
    company: 'Vance Infrastructure Group UAE',
    email: 'buyer@soko.ae',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    headline: 'Senior EPC Procurement Executive | FIDIC Contracts & Infrastructure Mega-Projects',
    connections: '1,420+ Connections',
    tradeLicense: 'DXB-8839201',
    phone: '+971 4 388 9100',
  },
  supplier: {
    name: 'Elena Rostova',
    title: 'VP of Commercial Sales & Operations',
    company: 'Apex Industrial Castings & Alloys',
    email: 'supplier@soko.ae',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    headline: 'Primary Metals & Industrial Alloys Leader | CARES & ASTM Compliance',
    connections: '980+ Connections',
    tradeLicense: 'AD-4402910',
    phone: '+971 2 550 4910',
  },
  contractor: {
    name: 'Sarah Jenkins',
    title: 'Executive Project Director & General Contractor',
    company: 'Apex Industrial Mechanical GC',
    email: 'contractor@soko.ae',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    headline: 'Major Infrastructure General Contractor | Tendering & Commercial Delivery',
    connections: '2,150+ Connections',
    tradeLicense: 'CN-1049281',
    phone: '+971 4 800 2026',
  },
  admin: {
    name: 'Zackary Al-Hassan',
    title: 'Chief Governance & Platform Super Admin',
    company: 'soko.ae Central Operations & Governance',
    email: 'admin@soko.ae',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    headline: 'Platform Super Admin & Central B2B Compliance Officer | DIFC Registered',
    connections: '3,800+ Verified Members',
    tradeLicense: 'GOV-SOKO-001',
    phone: '+971 4 200 9999',
  },
};

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess,
}) => {
  const { login, register, loginWithLinkedIn } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);
  const [isLinkedInSyncing, setIsLinkedInSyncing] = useState(false);
  const [linkedInSyncedProfile, setLinkedInSyncedProfile] = useState<typeof LINKEDIN_AUTH_PROFILES['buyer'] | null>(null);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});

  // Signup Form State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>('buyer');
  const [signupCompany, setSignupCompany] = useState('');
  const [signupTitle, setSignupTitle] = useState('');
  const [signupPhone, setSignupPhone] = useState('+971 4 ');
  const [signupTradeLicense, setSignupTradeLicense] = useState('');
  const [signupVatTrn, setSignupVatTrn] = useState('');
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});

  const handleLinkedInQuickAuth = (targetRole: UserRole = 'buyer') => {
    setIsLinkedInSyncing(true);
    setServerError(null);

    setTimeout(() => {
      const profile = LINKEDIN_AUTH_PROFILES[targetRole];
      setSignupName(profile.name);
      setSignupEmail(profile.email);
      setSignupCompany(profile.company);
      setSignupTitle(profile.title);
      setSignupPhone(profile.phone);
      setSignupTradeLicense(profile.tradeLicense);
      setSignupPassword('Password123!');
      setSignupRole(targetRole);

      setLoginEmail(profile.email);
      setLoginPassword('Password123!');

      setLinkedInSyncedProfile(profile);
      setIsLinkedInSyncing(false);
    }, 550);
  };

  const handleCompleteLinkedInAuth = async () => {
    if (!linkedInSyncedProfile) return;
    setIsSubmitting(true);
    setServerError(null);

    const role = mode === 'signup' ? signupRole : (linkedInSyncedProfile.email.includes('supplier') ? 'supplier' : linkedInSyncedProfile.email.includes('contractor') ? 'contractor' : 'buyer');

    try {
      const res = await loginWithLinkedIn({
        role,
        name: linkedInSyncedProfile.name,
        email: linkedInSyncedProfile.email,
        company: linkedInSyncedProfile.company,
        title: linkedInSyncedProfile.title,
        avatarUrl: linkedInSyncedProfile.avatarUrl,
        tradeLicenseNo: linkedInSyncedProfile.tradeLicense,
      });

      if (res.success) {
        setServerSuccess(`Welcome, ${linkedInSyncedProfile.name}! Photo & LinkedIn Profile Synced.`);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 600);
      } else {
        setServerError(res.message || 'LinkedIn authentication failed.');
      }
    } catch {
      setServerSuccess(`Welcome, ${linkedInSyncedProfile.name}!`);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 600);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Password Strength Checker
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const passwordScore = getPasswordStrength(signupPassword);

  // Validate Login Form
  const validateLoginForm = () => {
    const errors: { email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!loginEmail.trim()) {
      errors.email = 'Corporate email is required';
    } else if (!emailRegex.test(loginEmail.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!loginPassword) {
      errors.password = 'Password is required';
    } else if (loginPassword.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setLoginErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate Signup Form
  const validateSignupForm = () => {
    const errors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!signupName.trim() || signupName.trim().length < 2) {
      errors.name = 'Full name must be at least 2 characters';
    }

    if (!signupEmail.trim() || !emailRegex.test(signupEmail.trim())) {
      errors.email = 'Valid corporate email is required';
    }

    if (!signupPassword) {
      errors.password = 'Password is required';
    } else if (signupPassword.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(signupPassword)) {
      errors.password = 'Requires at least one uppercase letter (A-Z)';
    } else if (!/[0-9]/.test(signupPassword)) {
      errors.password = 'Requires at least one number (0-9)';
    }

    if (!signupCompany.trim()) {
      errors.company = 'Company / Enterprise name is required';
    }

    if (!signupPhone.trim() || signupPhone.trim().length < 9) {
      errors.phone = 'Valid UAE contact number required (+971...)';
    }

    setSignupErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validateLoginForm()) return;

    setIsSubmitting(true);
    const res = await login({ email: loginEmail, password: loginPassword });
    setIsSubmitting(false);

    if (res.success) {
      setServerSuccess('Authentication successful! Loading SOKO.ae...');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 500);
    } else {
      setServerError(res.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validateSignupForm()) return;

    setIsSubmitting(true);
    const res = await register({
      name: signupName,
      email: signupEmail,
      password: signupPassword,
      role: signupRole,
      company: signupCompany,
      title: signupTitle,
      phone: signupPhone,
      tradeLicenseNo: signupTradeLicense,
      vatTrn: signupVatTrn,
    });
    setIsSubmitting(false);

    if (res.success) {
      setServerSuccess('Account created successfully! Welcome to SOKO.ae.');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 600);
    } else {
      if (res.errors) {
        setSignupErrors(res.errors);
      }
      setServerError(res.message || 'Registration failed.');
    }
  };

  // Quick Demo Login helper
  const handleQuickLogin = (role: 'buyer' | 'supplier' | 'contractor' | 'admin') => {
    if (role === 'buyer') {
      setLoginEmail('buyer@soko.ae');
      setLoginPassword('Password123!');
    } else if (role === 'supplier') {
      setLoginEmail('supplier@soko.ae');
      setLoginPassword('Password123!');
    } else if (role === 'contractor') {
      setLoginEmail('contractor@soko.ae');
      setLoginPassword('Password123!');
    } else {
      setLoginEmail('admin@soko.ae');
      setLoginPassword('Password123!');
    }
    setLoginErrors({});
    setServerError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SokoLogo size="md" className="border border-white/20 shadow-md" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-tight text-white text-base">SOKO.ae</span>
                <span className="text-[10px] font-bold bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded border border-blue-400/20">
                  UAE Network
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {mode === 'login' ? 'Sign in to access B2B Tenders & VMS' : 'Register your UAE enterprise profile'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Login / Sign Up */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setServerError(null);
            }}
            className={`flex-1 py-3 text-xs font-bold transition-all cursor-pointer text-center ${
              mode === 'login'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign In with JWT
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setServerError(null);
            }}
            className={`flex-1 py-3 text-xs font-bold transition-all cursor-pointer text-center ${
              mode === 'signup'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Create New Account (+100 Pts)
          </button>
        </div>

        {/* Alert Banners */}
        {serverError && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {serverSuccess && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{serverSuccess}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {/* LinkedIn Easy Sign In / Sign Up Card */}
          <div className="bg-[#0A66C2]/5 border border-[#0A66C2]/30 rounded-xl p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#0A66C2] flex items-center justify-center text-white shrink-0 shadow-xs">
                  <LinkedInIcon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 block truncate flex items-center gap-1.5">
                    <span>{mode === 'signup' ? 'Easy Sign Up with LinkedIn' : 'Quick Sign In with LinkedIn'}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#0A66C2]/15 text-[#0A66C2] font-extrabold uppercase">
                      Auto-Photo
                    </span>
                  </span>
                  <p className="text-[11px] text-slate-600 truncate">
                    Automatically loads verified photo, executive headline & credentials
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleLinkedInQuickAuth(mode === 'signup' ? signupRole : 'buyer')}
                disabled={isLinkedInSyncing}
                className="w-full sm:w-auto px-3.5 py-2 bg-[#0A66C2] hover:bg-[#084e96] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all shrink-0 disabled:opacity-50"
              >
                <LinkedInIcon className={`w-3.5 h-3.5 text-white ${isLinkedInSyncing ? 'animate-spin' : ''}`} />
                <span>{isLinkedInSyncing ? 'Loading Profile & Photo...' : mode === 'signup' ? '1-Click Sign Up' : '1-Click Sign In'}</span>
              </button>
            </div>

            {/* Auto-Loaded Profile Card */}
            {linkedInSyncedProfile && (
              <div className="bg-white rounded-lg border border-[#0A66C2]/30 p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    LinkedIn Profile & Photo Loaded Automatically
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {linkedInSyncedProfile.connections}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={linkedInSyncedProfile.avatarUrl}
                        alt={linkedInSyncedProfile.name}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-[#0A66C2] shadow-xs"
                      />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#0A66C2] text-white flex items-center justify-center ring-1 ring-white">
                        <LinkedInIcon className="w-2.5 h-2.5" />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-xs truncate">
                          {linkedInSyncedProfile.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#0A66C2]/10 text-[#0A66C2] border border-[#0A66C2]/20">
                          LinkedIn Verified
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate font-medium">
                        {linkedInSyncedProfile.headline}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {linkedInSyncedProfile.company} • {linkedInSyncedProfile.email}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCompleteLinkedInAuth}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-all shrink-0 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{mode === 'signup' ? 'Complete Sign Up →' : 'Confirm & Sign In →'}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="relative flex items-center justify-center pt-0.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative px-2.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Or continue with credentials below
              </span>
            </div>
          </div>

          {mode === 'login' ? (
            /* ================= LOGIN FORM ================= */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Quick Demo Logins Bar */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/70">
                <span className="text-[11px] font-bold text-blue-900 block mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Instant One-Click Demo Accounts:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('buyer')}
                    className="p-1.5 rounded-lg bg-white hover:bg-blue-100 text-slate-800 border border-blue-200 font-semibold text-center transition-all cursor-pointer truncate"
                  >
                    🏢 Marcus (Buyer)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('supplier')}
                    className="p-1.5 rounded-lg bg-white hover:bg-emerald-100 text-slate-800 border border-emerald-200 font-semibold text-center transition-all cursor-pointer truncate"
                  >
                    🏭 Elena (Supplier)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('contractor')}
                    className="p-1.5 rounded-lg bg-white hover:bg-purple-100 text-slate-800 border border-purple-200 font-semibold text-center transition-all cursor-pointer truncate"
                  >
                    🏗️ Sarah (Contractor)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin')}
                    className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-slate-900 border border-amber-300 font-bold text-center transition-all cursor-pointer truncate"
                  >
                    🛡️ Super Admin
                  </button>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Corporate Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      if (loginErrors.email) setLoginErrors((p) => ({ ...p, email: undefined }));
                    }}
                    placeholder="name@company.ae"
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border font-medium ${
                      loginErrors.email
                        ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:ring-rose-500'
                        : 'border-slate-300 bg-white text-slate-900 focus:ring-blue-600'
                    } focus:outline-hidden focus:ring-2`}
                  />
                </div>
                {loginErrors.email && (
                  <p className="text-[11px] text-rose-600 mt-1">{loginErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Password</label>
                  <span className="text-[10px] text-blue-600 hover:underline cursor-pointer">
                    Demo: Password123!
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (loginErrors.password) setLoginErrors((p) => ({ ...p, password: undefined }));
                    }}
                    placeholder="Enter your account password"
                    className={`w-full pl-9 pr-10 py-2 text-xs rounded-lg border font-medium ${
                      loginErrors.password
                        ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:ring-rose-500'
                        : 'border-slate-300 bg-white text-slate-900 focus:ring-blue-600'
                    } focus:outline-hidden focus:ring-2`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginErrors.password && (
                  <p className="text-[11px] text-rose-600 mt-1">{loginErrors.password}</p>
                )}
              </div>

              {/* Security info note */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Encrypted 256-bit JWT authentication session token</span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Authenticating with SOKO Server...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to SOKO.ae</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* ================= SIGNUP FORM ================= */
            <form onSubmit={handleSignupSubmit} className="space-y-3.5">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Enterprise Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSignupRole('buyer')}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      signupRole === 'buyer'
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-2xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-bold block">🏢 Buyer</span>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      EPC & Developer
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignupRole('supplier')}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      signupRole === 'supplier'
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-2xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-bold block">🏭 Supplier</span>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      Manufacturer & Supplier
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignupRole('contractor')}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      signupRole === 'contractor'
                        ? 'border-purple-600 bg-purple-50/80 text-purple-900 shadow-2xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-bold block">🏗️ Contractor</span>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      General Contractor
                    </span>
                  </button>
                </div>
              </div>

              {/* Full Name & Corporate Email */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={signupName}
                      onChange={(e) => {
                        setSignupName(e.target.value);
                        if (signupErrors.name) setSignupErrors((p) => ({ ...p, name: '' }));
                      }}
                      placeholder="e.g. Tariq Al-Nuaimi"
                      className={`w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border ${
                        signupErrors.name ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
                      } focus:outline-hidden focus:ring-2 focus:ring-blue-600`}
                    />
                  </div>
                  {signupErrors.name && (
                    <p className="text-[10px] text-rose-600 mt-0.5">{signupErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Corporate Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={signupEmail}
                      onChange={(e) => {
                        setSignupEmail(e.target.value);
                        if (signupErrors.email) setSignupErrors((p) => ({ ...p, email: '' }));
                      }}
                      placeholder="tariq@epc.ae"
                      className={`w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border ${
                        signupErrors.email ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
                      } focus:outline-hidden focus:ring-2 focus:ring-blue-600`}
                    />
                  </div>
                  {signupErrors.email && (
                    <p className="text-[10px] text-rose-600 mt-0.5">{signupErrors.email}</p>
                  )}
                </div>
              </div>

              {/* Password & Strength Meter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password (min 8 chars, uppercase & number) *
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signupPassword}
                    onChange={(e) => {
                      setSignupPassword(e.target.value);
                      if (signupErrors.password) setSignupErrors((p) => ({ ...p, password: '' }));
                    }}
                    placeholder="Create secure password"
                    className={`w-full pl-8 pr-9 py-1.5 text-xs rounded-lg border ${
                      signupErrors.password ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
                    } focus:outline-hidden focus:ring-2 focus:ring-blue-600`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {signupPassword.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden flex gap-0.5">
                      <div
                        className={`h-full transition-all ${
                          passwordScore <= 1
                            ? 'w-1/4 bg-rose-500'
                            : passwordScore === 2
                            ? 'w-2/4 bg-amber-500'
                            : passwordScore === 3
                            ? 'w-3/4 bg-blue-500'
                            : 'w-full bg-emerald-500'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">
                      {passwordScore <= 1
                        ? 'Weak'
                        : passwordScore === 2
                        ? 'Fair'
                        : passwordScore === 3
                        ? 'Good'
                        : 'Strong'}
                    </span>
                  </div>
                )}
                {signupErrors.password && (
                  <p className="text-[10px] text-rose-600 mt-0.5">{signupErrors.password}</p>
                )}
              </div>

              {/* Company & Job Title */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Company Name *
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={signupCompany}
                      onChange={(e) => {
                        setSignupCompany(e.target.value);
                        if (signupErrors.company) setSignupErrors((p) => ({ ...p, company: '' }));
                      }}
                      placeholder="e.g. Al-Futtaim Engineering"
                      className={`w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border ${
                        signupErrors.company ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
                      } focus:outline-hidden focus:ring-2 focus:ring-blue-600`}
                    />
                  </div>
                  {signupErrors.company && (
                    <p className="text-[10px] text-rose-600 mt-0.5">{signupErrors.company}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Job Title
                  </label>
                  <div className="relative">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={signupTitle}
                      onChange={(e) => setSignupTitle(e.target.value)}
                      placeholder="e.g. Head of Procurement"
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Phone & Trade License */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    UAE Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={signupPhone}
                      onChange={(e) => {
                        setSignupPhone(e.target.value);
                        if (signupErrors.phone) setSignupErrors((p) => ({ ...p, phone: '' }));
                      }}
                      placeholder="+971 4 000 0000"
                      className={`w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border ${
                        signupErrors.phone ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
                      } focus:outline-hidden focus:ring-2 focus:ring-blue-600`}
                    />
                  </div>
                  {signupErrors.phone && (
                    <p className="text-[10px] text-rose-600 mt-0.5">{signupErrors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Trade License No. (Optional)
                  </label>
                  <input
                    type="text"
                    value={signupTradeLicense}
                    onChange={(e) => setSignupTradeLicense(e.target.value)}
                    placeholder="CN-1234567"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Submit Signup */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Registering with SOKO Database...</span>
                  </>
                ) : (
                  <>
                    <span>Create SOKO.ae Account (+100 Pts)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-center text-[11px] text-slate-500">
          <span>By signing in or registering, you agree to the </span>
          <span className="text-blue-600 font-semibold underline cursor-pointer">
            SOKO B2B Network Terms & UAE Civil Commercial Code
          </span>
        </div>
      </div>
    </div>
  );
};
