import type { CompanyProfileAudit } from '../../types';

export type LiveVerificationStatus = 'not_submitted' | 'pending' | 'verified' | 'rejected';

export type AdminCompany = CompanyProfileAudit & {
  liveVerificationStatus?: LiveVerificationStatus;
  sokoId?: string | null;
  legalName?: string;
  tradingName?: string | null;
  emirate?: string | null;
  country?: string | null;
  verifiedAt?: string | null;
  updatedAt?: string | null;
};

export const VERIFICATION_LABELS: Record<LiveVerificationStatus, string> = {
  not_submitted: 'Not submitted',
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
};

export const DASH = '—';

export function formatDate(iso?: string | null): string {
  if (!iso) return DASH;
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return DASH;
  return new Date(time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return DASH;
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return DASH;
  return new Date(time).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export type VerificationTone = 'verified' | 'pending' | 'rejected' | 'none';

export function verificationOf(company: AdminCompany, isLive: boolean): { label: string; tone: VerificationTone } {
  if (isLive) {
    const status = company.liveVerificationStatus ?? 'not_submitted';
    const tone: VerificationTone =
      status === 'verified' ? 'verified' : status === 'pending' ? 'pending' : status === 'rejected' ? 'rejected' : 'none';
    return { label: VERIFICATION_LABELS[status], tone };
  }
  if (company.isVerified) return { label: 'Verified', tone: 'verified' };
  if (company.status === 'pending_verification') return { label: 'Pending', tone: 'pending' };
  return { label: 'Not verified', tone: 'none' };
}

export const VERIFICATION_TONE_CLASSES: Record<VerificationTone, string> = {
  verified: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  none: 'bg-slate-100 text-slate-600 border-slate-200',
};

export type VerificationStage = 'not_submitted' | 'pending' | 'verified' | 'rejected';

// Demo records only carry isVerified + an account status, so they never resolve to "rejected".
export function verificationStageOf(company: AdminCompany, isLive: boolean): VerificationStage {
  if (isLive) return company.liveVerificationStatus ?? 'not_submitted';
  if (company.isVerified) return 'verified';
  if (company.status === 'pending_verification') return 'pending';
  return 'not_submitted';
}

export const VERIFICATION_STAGE_LABELS: Record<VerificationStage, string> = {
  not_submitted: 'Not Submitted',
  pending: 'Pending Review',
  verified: 'Verified',
  rejected: 'Rejected',
};

export const VERIFICATION_STAGE_TONE: Record<VerificationStage, VerificationTone> = {
  not_submitted: 'none',
  pending: 'pending',
  verified: 'verified',
  rejected: 'rejected',
};

export const ROLE_LABELS: Record<string, string> = {
  supplier: 'Supplier',
  contractor: 'Contractor',
  buyer: 'Buyer',
  admin: 'Admin',
};

export const ROLE_TONE_CLASSES: Record<string, string> = {
  supplier: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  contractor: 'bg-blue-50 text-blue-800 border-blue-200',
  buyer: 'bg-sky-50 text-sky-800 border-sky-200',
  admin: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function companyInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'CO'
  );
}
