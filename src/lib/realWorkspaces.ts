import type { AuthUser, AuthWorkspace } from '../context/AuthContext';
import type { UserProfile } from '../types';
import type { CompanyMembership, CompanyRecord, SupplierStore } from '../data/supplierTypes';

function initialsAvatar(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || 'S';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="150" height="150" fill="#334155"/><text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="sans-serif" font-size="56" fill="#f8fafc">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Builds the displayed profile for a Supabase-authenticated user. For a new identity, every
 * demo-persona detail on `base` is cleared so the real account shows only its own data.
 */
export function realUserProfile(base: UserProfile, user: AuthUser, isNewIdentity: boolean): UserProfile {
  const cleared: UserProfile = isNewIdentity
    ? {
        ...base,
        avatarUrl: initialsAvatar(user.name),
        location: '',
        website: '',
        dunsNumber: '',
        taxId: '',
        verified: false,
        bio: '',
        connectionsCount: 0,
        rating: 0,
        reviewsCount: 0,
        certifications: [],
        capabilities: [],
        paymentTerms: '',
        warehouseLocations: [],
        isPremium: false,
        subscriptionPlan: undefined,
      }
    : base;
  return {
    ...cleared,
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    company: user.company,
    title: user.title,
    phone: user.phone,
    avatarUrl: user.avatarUrl || cleared.avatarUrl,
    location: user.location || cleared.location,
  };
}

function toCompanyRecord({ company: c }: AuthWorkspace): CompanyRecord {
  return {
    id: c.id,
    sokoId: c.soko_id,
    kind: c.kind,
    profile: {
      legalName: c.legal_name,
      tradingName: c.trading_name || c.legal_name,
      types: [],
      // Licence fields are only readable through public.get_company_private.
      licenseNo: '',
      issuingAuthority: '',
      licenseExpiry: '',
      country: c.country,
      emirate: c.emirate ?? '',
      address: c.address ?? '',
      website: c.website ?? '',
      generalEmail: c.general_email ?? '',
      phone: c.phone ?? '',
      established: c.established ?? undefined,
      description: c.description ?? '',
      categories: [],
      subcategories: [],
      brands: [],
      capabilities: [],
      regionsServed: [],
      marketsServed: [],
      contacts: [],
      certifications: [],
      logoTone: 'slate',
    },
    verification: { status: c.verification_status, reviewedAt: c.verified_at ?? undefined },
    tier: 'free',
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    demo: false,
  };
}

function toMembership(w: AuthWorkspace, user: AuthUser): CompanyMembership {
  return {
    id: w.membershipId,
    companyId: w.company.id,
    userId: user.id,
    name: user.name,
    email: user.email,
    title: user.title,
    role: w.role,
    status: 'active',
    at: w.joinedAt,
  };
}

/**
 * Overlays the signed-in user's Supabase companies and active memberships on the local store.
 * Any locally stored membership for this user is discarded, so browser storage can never grant workspace access.
 */
export function withRealWorkspaces(store: SupplierStore, user: AuthUser, workspaces: AuthWorkspace[]): SupplierStore {
  const realIds = new Set(workspaces.map((w) => w.company.id));
  return {
    ...store,
    companies: [...workspaces.map(toCompanyRecord), ...store.companies.filter((c) => !realIds.has(c.id))],
    memberships: [
      ...workspaces.map((w) => toMembership(w, user)),
      ...store.memberships.filter((m) => m.userId !== user.id && !realIds.has(m.companyId)),
    ],
  };
}

/** Removes Supabase-sourced identity records before the store is written to browser storage. */
export function withoutRealWorkspaces(store: SupplierStore, userId: string, companyIds: ReadonlySet<string>): SupplierStore {
  if (!userId && companyIds.size === 0) return store;
  return {
    ...store,
    companies: store.companies.filter((c) => !companyIds.has(c.id)),
    memberships: store.memberships.filter((m) => m.userId !== userId && !companyIds.has(m.companyId)),
  };
}
