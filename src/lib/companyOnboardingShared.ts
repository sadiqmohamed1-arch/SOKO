import type { CompanyProfile } from '../data/supplierTypes';

export type OnboardingIntent = 'join' | 'supplier' | 'contractor';

export interface OnboardingDraft {
  intent: OnboardingIntent;
  step: number;
  profile: CompanyProfile;
  q: string;
  updatedAt: string;
}

const draftKey = (userId: string) => `soko_onboarding_draft_v1_${userId}`;

export function mapOnboardingError(message: string): string {
  const m = message.toLowerCase();
  if (/company creation limit/i.test(message)) return 'You have created too many companies today. Try again tomorrow.';
  if (/already belong|already have requested|already a member/i.test(message)) {
    return 'You already belong to or have requested this company.';
  }
  if (/company not found/i.test(message)) {
    return 'That company is not open for join requests. Ask an admin for an invitation.';
  }
  if (/duplicate key|23505|already exists/i.test(m)) {
    return 'This company or membership already exists. Search for it and request access instead.';
  }
  if (/not allowed|42501/i.test(m)) return 'You are not allowed to perform this action.';
  if (/jwt|expired|session/i.test(m)) return 'Your session has expired. Please sign in again.';
  if (/license|licence/i.test(m) && /required|invalid/i.test(m)) return 'Check your trade license details and try again.';
  return message.trim() || 'Something went wrong. Please try again.';
}

export function saveOnboardingDraft(userId: string, draft: Omit<OnboardingDraft, 'updatedAt'>): void {
  if (!userId || typeof localStorage === 'undefined') return;
  const payload: OnboardingDraft = { ...draft, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(draftKey(userId), JSON.stringify(payload));
  } catch {
    /* quota / private mode — non-fatal */
  }
}

export function loadOnboardingDraft(userId: string): OnboardingDraft | null {
  if (!userId || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(draftKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingDraft;
    if (!parsed || typeof parsed.step !== 'number' || !parsed.profile) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearOnboardingDraft(userId: string): void {
  if (!userId || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(draftKey(userId));
  } catch {
    /* ignore */
  }
}
