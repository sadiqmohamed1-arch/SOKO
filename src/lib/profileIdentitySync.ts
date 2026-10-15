/**
 * Persist Module 1B professional identity across email-confirmation signups.
 *
 * Supabase returns no session when confirm-email is required, so profiles cannot
 * be updated at signUp time. Values travel in auth user_metadata, then are
 * written to public.profiles on the first authenticated session — only filling
 * null columns (never overwriting existing classifications or usernames).
 */
import type { User } from '@supabase/supabase-js';
import type { ProfessionalClassification } from '../data/registrationIdentity';
import {
  isProfessionalClassification,
  isValidUsername,
  normalizeUsername,
} from '../data/registrationIdentity';
import { mapOnboardingError } from './companyOnboardingShared';

export const META_PROFESSIONAL_CLASSIFICATION = 'professional_classification';
export const META_USERNAME = 'username';

export type PendingIdentity = {
  professional_classification?: ProfessionalClassification;
  username?: string;
};

export type ProfileIdentityRow = {
  professional_classification: string | null;
  username: string | null;
};

export type IdentitySyncResult = {
  applied: boolean;
  patch: Partial<ProfileIdentityRow>;
  errors?: Record<string, string>;
  /** True when metadata pending keys should be cleared after a successful or abandoned apply. */
  clearMetadata: boolean;
};

/** Auth signup `options.data` payload (full_name + optional identity fields). */
export function buildSignupUserMetadata(input: {
  fullName: string;
  professionalClassification?: ProfessionalClassification | null;
  username?: string | null;
}): Record<string, string> {
  const data: Record<string, string> = {
    full_name: input.fullName.trim().slice(0, 120),
  };
  if (input.professionalClassification && isProfessionalClassification(input.professionalClassification)) {
    data[META_PROFESSIONAL_CLASSIFICATION] = input.professionalClassification;
  }
  if (input.username?.trim()) {
    const u = normalizeUsername(input.username);
    if (isValidUsername(u)) data[META_USERNAME] = u;
  }
  return data;
}

export function pendingIdentityFromMetadata(
  meta: Record<string, unknown> | null | undefined,
): PendingIdentity {
  const out: PendingIdentity = {};
  if (!meta || typeof meta !== 'object') return out;
  const pro = meta[META_PROFESSIONAL_CLASSIFICATION];
  if (typeof pro === 'string' && isProfessionalClassification(pro)) {
    out.professional_classification = pro;
  }
  const rawUser = meta[META_USERNAME];
  if (typeof rawUser === 'string' && rawUser.trim()) {
    const u = normalizeUsername(rawUser);
    if (isValidUsername(u)) out.username = u;
  }
  return out;
}

/**
 * Only fill null permanent columns from pending metadata.
 * Existing classifications / usernames are never replaced.
 */
export function buildIdentityFillPatch(
  current: ProfileIdentityRow,
  pending: PendingIdentity,
): Partial<ProfileIdentityRow> {
  const patch: Partial<ProfileIdentityRow> = {};
  if (
    (current.professional_classification == null || current.professional_classification === '') &&
    pending.professional_classification
  ) {
    patch.professional_classification = pending.professional_classification;
  }
  if ((current.username == null || current.username === '') && pending.username) {
    patch.username = pending.username;
  }
  return patch;
}

export function isUsernameConflictError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    (/profiles_username_uq|username.*unique|unique.*username/i.test(m) || /23505/.test(m)) &&
    /username/i.test(m)
  );
}

export function isUsernameFormatError(message: string): boolean {
  return /profiles_username_format|23514.*username|username.*check/i.test(message.toLowerCase());
}

/** Metadata keys to null out after identity has been applied (or abandoned on conflict). */
export function clearedIdentityMetadata(): Record<string, null> {
  return {
    [META_PROFESSIONAL_CLASSIFICATION]: null,
    [META_USERNAME]: null,
  };
}

/** Minimal Supabase surface used by sync (keeps unit tests free of the full client type). */
export type ProfileIdentitySyncClient = {
  from: (table: 'profiles') => {
    select: (cols: string) => {
      eq: (
        col: string,
        val: string,
      ) => {
        maybeSingle: () => PromiseLike<{
          data: ProfileIdentityRow | null;
          error: { message: string } | null;
        }>;
      };
    };
    update: (patch: Record<string, string | null>) => {
      eq: (
        col: string,
        val: string,
      ) => PromiseLike<{
        error: { message: string; code?: string; details?: string; hint?: string } | null;
      }>;
    };
  };
  auth: {
    updateUser: (args: {
      data: Record<string, unknown>;
    }) => PromiseLike<{ error: { message: string } | null }>;
  };
};

/**
 * Copy pending signup identity from auth user_metadata into public.profiles
 * under the caller's RLS session. Idempotent; safe for returning users.
 */
export async function syncPendingProfileIdentity(
  supabase: ProfileIdentitySyncClient,
  user: Pick<User, 'id' | 'user_metadata'>,
): Promise<IdentitySyncResult> {
  const pending = pendingIdentityFromMetadata(
    user.user_metadata as Record<string, unknown> | null | undefined,
  );
  if (!pending.professional_classification && !pending.username) {
    return { applied: false, patch: {}, clearMetadata: false };
  }

  const { data: current, error: readErr } = await supabase
    .from('profiles')
    .select('professional_classification, username')
    .eq('id', user.id)
    .maybeSingle();
  if (readErr || !current) {
    return { applied: false, patch: {}, clearMetadata: false };
  }

  const patch = buildIdentityFillPatch(current, pending);
  if (!Object.keys(patch).length) {
    // Profile already has values — drop stale signup metadata so it cannot re-apply later.
    return { applied: false, patch: {}, clearMetadata: true };
  }

  const { error: writeErr } = await supabase.from('profiles').update(patch).eq('id', user.id);
  if (!writeErr) {
    return { applied: true, patch, clearMetadata: true };
  }

  const details = `${writeErr.message} ${writeErr.code ?? ''} ${writeErr.details ?? ''} ${writeErr.hint ?? ''}`;
  const errors: Record<string, string> = {};

  if (patch.username && (isUsernameConflictError(details) || isUsernameFormatError(details))) {
    errors.username = mapOnboardingError(details);
    const { username: _drop, ...rest } = patch;
    if (Object.keys(rest).length) {
      await supabase.from('profiles').update(rest).eq('id', user.id);
    }
    // Clear metadata so a taken username is not retried on every login.
    return { applied: Object.keys(rest).length > 0, patch: rest, errors, clearMetadata: true };
  }

  console.warn('syncPendingProfileIdentity:', writeErr.message);
  return { applied: false, patch: {}, clearMetadata: false };
}

/** Best-effort clear of pending identity keys from auth user_metadata. */
export async function clearPendingIdentityMetadata(
  supabase: ProfileIdentitySyncClient,
): Promise<void> {
  const { error } = await supabase.auth.updateUser({ data: clearedIdentityMetadata() });
  if (error) console.warn('clearPendingIdentityMetadata:', error.message);
}
