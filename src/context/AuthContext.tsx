import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { AuthError, PostgrestError, Session, User } from '@supabase/supabase-js';
import { UserRole } from '../types';
import type { OrgClassification, ProfessionalClassification } from '../data/registrationIdentity';
import { isProfessionalClassification } from '../data/registrationIdentity';
import type { CompanyKind, CompanyRole, VerificationStatus } from '../data/supplierTypes';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company: string;
  /** Actual job title — not professional classification. */
  title: string;
  phone: string;
  tradeLicenseNo?: string;
  vatTrn?: string;
  avatarUrl: string;
  location?: string;
  isVerified?: boolean;
  rewardPoints?: number;
  streakDays?: number;
  professionalClassification?: ProfessionalClassification | null;
  username?: string | null;
}

/** Company columns granted to authenticated (select('*') is not permitted). */
const COMPANY_COLUMNS =
  'id, soko_id, kind, org_classification, legal_name, trading_name, country, emirate, address, website, general_email, phone, established, description, is_public, is_suspended, verification_status, verified_at, created_at, updated_at';

export interface AuthCompany {
  id: string;
  soko_id: string;
  kind: CompanyKind;
  org_classification: OrgClassification | string | null;
  legal_name: string;
  trading_name: string | null;
  country: string;
  emirate: string | null;
  address: string | null;
  website: string | null;
  general_email: string | null;
  phone: string | null;
  established: number | null;
  description: string | null;
  is_public: boolean;
  is_suspended: boolean;
  verification_status: VerificationStatus;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

/** An active company membership of the signed-in user, loaded under RLS. */
export interface AuthWorkspace {
  membershipId: string;
  role: CompanyRole;
  joinedAt: string;
  company: AuthCompany;
}

type AuthStatus = 'loading' | 'signed_out' | 'signed_in';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isPlatformAdmin: boolean;
  workspaces: AuthWorkspace[];
  workspacesLoaded: boolean;
  /** User-facing explanation of the last auth or authorization failure. */
  authNotice: string | null;
  clearAuthNotice: () => void;
  refreshAccess: () => Promise<void>;
  login: (credentials: { email: string; password: string }) => Promise<{ success: boolean; message?: string }>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
    company?: string;
    /** Actual job title only. */
    title?: string;
    phone?: string;
    tradeLicenseNo?: string;
    vatTrn?: string;
    location?: string;
    professionalClassification?: ProfessionalClassification;
    username?: string;
  }) => Promise<{ success: boolean; message?: string; errors?: Record<string, string> }>;
  logout: () => void;
  updateUserContext: (partial: Partial<AuthUser>) => void;
  loginWithLinkedIn: (payload: {
    role: UserRole;
    email?: string;
    name?: string;
    avatarUrl?: string;
    company?: string;
    title?: string;
    tradeLicenseNo?: string;
  }) => Promise<{ success: boolean; message?: string; user?: AuthUser }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const NOT_CONFIGURED_MESSAGE = 'Sign-in is unavailable because Supabase is not configured for this deployment.';
const EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.';
const KNOWN_ROLES: Record<CompanyKind, readonly CompanyRole[]> = {
  supplier: ['supplier_admin', 'sales_manager', 'sales_rep', 'technical_manager', 'viewer'],
  contractor: ['contractor_admin', 'procurement_manager', 'procurement_officer', 'project_manager', 'viewer'],
};
// Identity from the retired /api/auth flow; never trusted again.
const LEGACY_AUTH_KEYS = ['soko_jwt_token', 'soko_auth_user'];

class SessionExpiredError extends Error {}
class AccessLoadError extends Error {}

function isAuthFailure(error: PostgrestError | AuthError): boolean {
  const code = 'code' in error ? String(error.code ?? '') : '';
  const status = 'status' in error ? Number(error.status) : 0;
  return status === 401 || code === 'PGRST301' || code === 'PGRST303' || /jwt|expired/i.test(error.message);
}

function check(error: PostgrestError | null, what: string): void {
  if (!error) return;
  if (isAuthFailure(error)) throw new SessionExpiredError(EXPIRED_MESSAGE);
  if (error.code === '42501') throw new AccessLoadError(`You are not authorised to read ${what}.`);
  throw new AccessLoadError(`We could not load ${what}. Please try again.`);
}

interface LoadedAccess {
  user: AuthUser;
  isPlatformAdmin: boolean;
  workspaces: AuthWorkspace[];
}

async function loadAccess(authUser: User): Promise<LoadedAccess> {
  const supabase = getSupabaseClient();
  const uid = authUser.id;

  const [profileRes, adminRes, membershipRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, title, phone, location, professional_classification, username')
      .eq('id', uid)
      .maybeSingle(),
    supabase.from('platform_admins').select('user_id').eq('user_id', uid).maybeSingle(),
    // Teammates' memberships are also visible under RLS, so scope to the caller explicitly.
    supabase
      .from('company_memberships')
      .select('id, company_id, company_kind, role_key, created_at')
      .eq('user_id', uid)
      .eq('status', 'active'),
  ]);
  check(profileRes.error, 'your profile');
  check(adminRes.error, 'your platform access');
  check(membershipRes.error, 'your company memberships');

  const memberships = (membershipRes.data ?? []).filter((m) =>
    KNOWN_ROLES[m.company_kind as CompanyKind]?.includes(m.role_key as CompanyRole),
  );
  let companies: AuthCompany[] = [];
  if (memberships.length > 0) {
    const companyRes = await supabase
      .from('companies')
      .select(COMPANY_COLUMNS)
      .in('id', memberships.map((m) => m.company_id));
    check(companyRes.error, 'your companies');
    companies = (companyRes.data ?? []) as AuthCompany[];
  }
  const companyMap = new Map(companies.map((c) => [c.id, c]));
  const workspaces: AuthWorkspace[] = memberships.flatMap((m) => {
    const company = companyMap.get(m.company_id);
    return company
      ? [{ membershipId: m.id, role: m.role_key as CompanyRole, joinedAt: m.created_at, company }]
      : [];
  });

  const isPlatformAdmin = Boolean(adminRes.data);
  const profile = profileRes.data;
  const email = authUser.email ?? '';
  const metaName = typeof authUser.user_metadata?.full_name === 'string' ? authUser.user_metadata.full_name : '';
  const primary = workspaces[0]?.company;

  return {
    isPlatformAdmin,
    workspaces,
    user: {
      id: uid,
      name: profile?.full_name || metaName || email.split('@')[0] || 'SOKO member',
      email,
      // Company roles are per workspace; the account itself is a personal account unless the DB grants platform admin.
      role: isPlatformAdmin ? 'admin' : 'buyer',
      company: primary ? primary.trading_name || primary.legal_name : '',
      title: profile?.title ?? '',
      professionalClassification:
        typeof profile?.professional_classification === 'string' &&
        isProfessionalClassification(profile.professional_classification)
          ? profile.professional_classification
          : null,
      username: (profile?.username as string | null | undefined) ?? null,
      phone: profile?.phone ?? '',
      location: profile?.location ?? undefined,
      avatarUrl: '',
      isVerified: Boolean(authUser.email_confirmed_at),
    },
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'signed_out');
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [workspaces, setWorkspaces] = useState<AuthWorkspace[]>([]);
  const [workspacesLoaded, setWorkspacesLoaded] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const loadSeq = useRef(0);

  const resetIdentity = useCallback(() => {
    loadSeq.current += 1;
    setSession(null);
    setUser(null);
    setIsPlatformAdmin(false);
    setWorkspaces([]);
    setWorkspacesLoaded(false);
    setStatus('signed_out');
  }, []);

  const applySession = useCallback(
    async (next: Session) => {
      const seq = ++loadSeq.current;
      const supabase = getSupabaseClient();
      // getUser() validates the token with Supabase Auth; a locally cached session alone is never trusted.
      const { data, error } = await supabase.auth.getUser(next.access_token);
      if (seq !== loadSeq.current) return;
      if (error || !data.user) {
        await supabase.auth.signOut({ scope: 'local' });
        resetIdentity();
        setAuthNotice(EXPIRED_MESSAGE);
        return;
      }
      try {
        const access = await loadAccess(data.user);
        if (seq !== loadSeq.current) return;
        setSession(next);
        setUser(access.user);
        setIsPlatformAdmin(access.isPlatformAdmin);
        setWorkspaces(access.workspaces);
        setWorkspacesLoaded(true);
        setStatus('signed_in');
      } catch (err) {
        if (seq !== loadSeq.current) return;
        if (err instanceof SessionExpiredError) {
          await supabase.auth.signOut({ scope: 'local' });
          resetIdentity();
          setAuthNotice(err.message);
          return;
        }
        // Signed in, but company access could not be read: keep the personal account only.
        setSession(next);
        setUser((prev) =>
          prev?.id === data.user.id
            ? prev
            : {
                id: data.user.id,
                name: data.user.email?.split('@')[0] || 'SOKO member',
                email: data.user.email ?? '',
                role: 'buyer',
                company: '',
                title: '',
                phone: '',
                avatarUrl: '',
              },
        );
        setIsPlatformAdmin(false);
        setWorkspaces([]);
        setWorkspacesLoaded(false);
        setStatus('signed_in');
        setAuthNotice(err instanceof Error ? err.message : 'We could not load your workspaces.');
      }
    },
    [resetIdentity],
  );

  useEffect(() => {
    LEGACY_AUTH_KEYS.forEach((k) => localStorage.removeItem(k));
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseClient();
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      // Supabase calls must not run inside this callback (it holds the auth lock), so defer them.
      window.setTimeout(() => {
        if (event === 'SIGNED_OUT' || !next) {
          resetIdentity();
          return;
        }
        if (event === 'TOKEN_REFRESHED') {
          setSession(next);
          return;
        }
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          void applySession(next);
        }
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [applySession, resetIdentity]);

  const login = async (credentials: { email: string; password: string }) => {
    if (!isSupabaseConfigured) return { success: false, message: NOT_CONFIGURED_MESSAGE };
    setAuthNotice(null);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error || !data.session) {
      return {
        success: false,
        message:
          error?.code === 'email_not_confirmed'
            ? 'Please confirm your email address before signing in.'
            : error?.status === 400 || error?.code === 'invalid_credentials'
            ? 'Email or password is incorrect.'
            : 'We could not sign you in right now. Please try again.',
      };
    }
    await applySession(data.session);
    return { success: true };
  };

  const register: AuthContextType['register'] = async (data) => {
    if (!isSupabaseConfigured) return { success: false, message: NOT_CONFIGURED_MESSAGE };
    setAuthNotice(null);
    const supabase = getSupabaseClient();
    // The profile row is created by the on_auth_user_created trigger from full_name metadata.
    const { data: result, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.name } },
    });
    if (error) {
      return {
        success: false,
        message: /already registered/i.test(error.message)
          ? 'An account with this email already exists. Please sign in.'
          : error.message || 'We could not create your account. Please try again.',
      };
    }
    if (!result.session) {
      return { success: false, message: 'Check your inbox to confirm your email address, then sign in.' };
    }
    // Persist optional profile fields (trigger only sets full_name from metadata).
    // professional_classification and username are permanent identity columns; title is job title only.
    const profilePatch: {
      title?: string;
      phone?: string;
      location?: string;
      full_name?: string;
      professional_classification?: string;
      username?: string;
    } = {};
    if (data.title?.trim()) profilePatch.title = data.title.trim();
    if (data.phone?.trim()) profilePatch.phone = data.phone.trim();
    if (data.location?.trim()) profilePatch.location = data.location.trim();
    if (data.name?.trim()) profilePatch.full_name = data.name.trim();
    if (data.professionalClassification && isProfessionalClassification(data.professionalClassification)) {
      profilePatch.professional_classification = data.professionalClassification;
    }
    if (data.username?.trim()) {
      profilePatch.username = data.username.trim().toLowerCase();
    }
    const fieldErrors: Record<string, string> = {};
    if (Object.keys(profilePatch).length && result.user) {
      const { error: profileErr } = await supabase.from('profiles').update(profilePatch).eq('id', result.user.id);
      if (profileErr) {
        const msg = profileErr.message || '';
        const details = `${msg} ${profileErr.code ?? ''} ${profileErr.details ?? ''} ${profileErr.hint ?? ''}`;
        if (/profiles_username_uq|duplicate key.*username|username.*already|23505/i.test(details) && /username/i.test(details)) {
          fieldErrors.username = 'That username is already taken. Try another.';
          const { username: _drop, ...rest } = profilePatch;
          if (Object.keys(rest).length) {
            await supabase.from('profiles').update(rest).eq('id', result.user.id);
          }
        } else if (/profiles_username_format|23514/i.test(details)) {
          fieldErrors.username = 'Use 3–30 lowercase letters, numbers, dots or underscores.';
          const { username: _drop, ...rest } = profilePatch;
          if (Object.keys(rest).length) {
            await supabase.from('profiles').update(rest).eq('id', result.user.id);
          }
        } else if (/23505/i.test(details) && profilePatch.username) {
          // Unique violation while setting username — treat as taken.
          fieldErrors.username = 'That username is already taken. Try another.';
          const { username: _drop, ...rest } = profilePatch;
          if (Object.keys(rest).length) {
            await supabase.from('profiles').update(rest).eq('id', result.user.id);
          }
        } else {
          console.warn('profiles update after signup:', profileErr.message);
        }
      }
    }
    await applySession(result.session);
    if (Object.keys(fieldErrors).length) {
      return {
        success: true,
        message: fieldErrors.username,
        errors: fieldErrors,
      };
    }
    return { success: true };
  };

  const logout = () => {
    setAuthNotice(null);
    resetIdentity();
    if (isSupabaseConfigured) void getSupabaseClient().auth.signOut();
  };

  const refreshAccess = async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await getSupabaseClient().auth.getSession();
    if (data.session) await applySession(data.session);
  };

  // Display-only edits; profile persistence goes through public.profiles, not this context.
  const updateUserContext = (partial: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...partial, id: prev.id, email: prev.email, role: prev.role } : null));
  };

  const loginWithLinkedIn: AuthContextType['loginWithLinkedIn'] = async () => ({
    success: false,
    message: 'LinkedIn sign-in is not available yet. Please sign in with your email and password.',
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        token: session?.access_token ?? null,
        isAuthenticated: status === 'signed_in' && !!user && !!session,
        isLoading: status === 'loading',
        isPlatformAdmin,
        workspaces,
        workspacesLoaded,
        authNotice,
        clearAuthNotice: () => setAuthNotice(null),
        refreshAccess,
        login,
        register,
        logout,
        updateUserContext,
        loginWithLinkedIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
