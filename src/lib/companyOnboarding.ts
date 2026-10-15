/**
 * Module 1B — live supplier/contractor onboarding against Supabase RPCs + RLS.
 * Demo mode continues to use src/data/supplierService.ts; never mix the two paths.
 */
import type { CompanyKind, CompanyProfile, CompanyRecord } from '../data/supplierTypes';
import {
  isOrgClassification,
  isProfessionalClassification,
  isValidUsername,
  normalizeUsername,
  type OrgClassification,
  type ProfessionalClassification,
} from '../data/registrationIdentity';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  mapOnboardingError,
  saveOnboardingDraft,
  type OnboardingDraft,
  type OnboardingIntent,
} from './companyOnboardingShared';

export {
  clearOnboardingDraft,
  loadOnboardingDraft,
  mapOnboardingError,
  saveOnboardingDraft,
  type OnboardingDraft,
  type OnboardingIntent,
};

const COMPANY_COLUMNS =
  'id, soko_id, kind, org_classification, legal_name, trading_name, country, emirate, address, website, general_email, phone, established, description, is_public, is_suspended, verification_status, verified_at, created_at, updated_at';

export interface LiveCompanyHit {
  id: string;
  name: string;
  location: string;
  sokoId: string;
  /** Public directory rows are joinable via request_to_join; claim-unclaimed is not in schema. */
  managed: boolean;
  kind: CompanyKind;
}

export type LiveResult<T> = { ok: true; value: T } | { ok: false; error: string };

function fail<T = never>(error: string): LiveResult<T> {
  return { ok: false, error: mapOnboardingError(error) };
}

function ok<T>(value: T): LiveResult<T> {
  return { ok: true, value };
}

function requireClient() {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured for this environment.');
  return getSupabaseClient();
}

/** Directory search for join flow — only public, non-suspended companies (RLS). */
export async function searchLiveCompanies(query: string): Promise<LiveResult<LiveCompanyHit[]>> {
  const q = query.trim();
  if (q.length < 2) return ok([]);
  try {
    const supabase = requireClient();
    const safe = q.replace(/[%_,()"]/g, ' ').trim();
    const pattern = `%${safe}%`;
    const { data, error } = await supabase
      .from('companies')
      .select(COMPANY_COLUMNS)
      .eq('is_public', true)
      .eq('is_suspended', false)
      .or(`trading_name.ilike."${pattern}",legal_name.ilike."${pattern}",soko_id.ilike."${pattern}"`)
      .order('trading_name', { ascending: true })
      .limit(20);
    if (error) return fail(error.message);
    const hits: LiveCompanyHit[] = (data ?? []).map((row) => ({
      id: row.id as string,
      name: (row.trading_name as string) || (row.legal_name as string),
      location: [row.emirate, row.country].filter(Boolean).join(', '),
      sokoId: (row.soko_id as string) || '',
      managed: true,
      kind: row.kind as CompanyKind,
    }));
    return ok(hits);
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Search failed.');
  }
}

/** Soft duplicate warning from public directory names (licence numbers are not publicly readable). */
export async function findLiveDuplicateCompanies(
  tradingName: string,
  legalName: string,
): Promise<LiveResult<{ id: string; name: string; reason: string }[]>> {
  const names = [tradingName, legalName].map((n) => n.trim()).filter((n) => n.length >= 3);
  if (!names.length) return ok([]);
  try {
    const supabase = requireClient();
    const filters = names
      .map((n) => {
        const p = `%${n.replace(/[%_,()"]/g, ' ').trim()}%`;
        return `trading_name.ilike."${p}",legal_name.ilike."${p}"`;
      })
      .join(',');
    const { data, error } = await supabase
      .from('companies')
      .select('id, legal_name, trading_name')
      .eq('is_public', true)
      .eq('is_suspended', false)
      .or(filters)
      .limit(10);
    if (error) return fail(error.message);
    const needle = names.map((n) => n.toLowerCase());
    const dupes = (data ?? [])
      .map((row) => {
        const name = (row.trading_name as string) || (row.legal_name as string);
        const lower = name.toLowerCase();
        const reason = needle.some((n) => lower === n || lower.includes(n) || n.includes(lower))
          ? 'Similar company name already listed'
          : '';
        return reason ? { id: row.id as string, name, reason } : null;
      })
      .filter((x): x is { id: string; name: string; reason: string } => Boolean(x));
    return ok(dupes);
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Duplicate check failed.');
  }
}

export async function updateOwnProfile(fields: {
  full_name?: string;
  /** Actual job title only — not professional classification. */
  title?: string | null;
  phone?: string;
  location?: string;
  professional_classification?: ProfessionalClassification | null;
  username?: string | null;
}): Promise<LiveResult<void>> {
  try {
    const supabase = requireClient();
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth.user) return fail(authErr?.message || 'Not signed in.');
    const patch: Record<string, string | null> = {};
    if (fields.full_name !== undefined) patch.full_name = fields.full_name.trim();
    if (fields.title !== undefined) patch.title = fields.title === null ? null : fields.title.trim() || null;
    if (fields.phone !== undefined) patch.phone = fields.phone.trim();
    if (fields.location !== undefined) patch.location = fields.location.trim();
    if (fields.professional_classification !== undefined) {
      if (fields.professional_classification === null) {
        patch.professional_classification = null;
      } else if (!isProfessionalClassification(fields.professional_classification)) {
        return fail('Select a valid professional role.');
      } else {
        patch.professional_classification = fields.professional_classification;
      }
    }
    if (fields.username !== undefined) {
      if (fields.username === null || !fields.username.trim()) {
        patch.username = null;
      } else {
        const u = normalizeUsername(fields.username);
        if (!isValidUsername(u)) {
          return fail('Use 3–30 lowercase letters, numbers, dots or underscores.');
        }
        patch.username = u;
      }
    }
    if (!Object.keys(patch).length) return ok(undefined);
    const { error } = await supabase.from('profiles').update(patch).eq('id', auth.user.id);
    if (error) return fail(error.message);
    return ok(undefined);
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not update profile.');
  }
}

export interface OwnIdentityProfile {
  full_name: string | null;
  title: string | null;
  phone: string | null;
  location: string | null;
  professional_classification: ProfessionalClassification | null;
  username: string | null;
}

/** Load permanent identity fields for returning users (RLS: own / teammates). */
export async function fetchOwnIdentityProfile(): Promise<LiveResult<OwnIdentityProfile | null>> {
  try {
    const supabase = requireClient();
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth.user) return fail(authErr?.message || 'Not signed in.');
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, title, phone, location, professional_classification, username')
      .eq('id', auth.user.id)
      .maybeSingle();
    if (error) return fail(error.message);
    if (!data) return ok(null);
    const pro = data.professional_classification;
    return ok({
      full_name: (data.full_name as string) ?? null,
      title: (data.title as string) ?? null,
      phone: (data.phone as string) ?? null,
      location: (data.location as string) ?? null,
      professional_classification:
        typeof pro === 'string' && isProfessionalClassification(pro) ? pro : null,
      username: (data.username as string) ?? null,
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not load profile.');
  }
}

/** Read company.org_classification for onboarding prefill / returning users. */
export async function fetchCompanyOrgClassification(
  companyId: string,
): Promise<LiveResult<OrgClassification | null>> {
  try {
    const supabase = requireClient();
    const { data, error } = await supabase
      .from('companies')
      .select('org_classification')
      .eq('id', companyId)
      .maybeSingle();
    if (error) return fail(error.message);
    const v = data?.org_classification;
    return ok(typeof v === 'string' && isOrgClassification(v) ? v : null);
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not load organization type.');
  }
}

export async function requestLiveJoin(companyId: string): Promise<LiveResult<string>> {
  try {
    const supabase = requireClient();
    const { data, error } = await supabase.rpc('request_to_join', { p_company: companyId });
    if (error) return fail(error.message);
    return ok(String(data));
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Join request failed.');
  }
}

async function replaceTaxonomy(companyId: string, profile: CompanyProfile): Promise<LiveResult<void>> {
  const supabase = requireClient();
  const rows: { company_id: string; kind: string; value: string }[] = [];
  const push = (kind: string, values: string[]) => {
    for (const raw of values) {
      const value = raw.trim().slice(0, 120);
      if (value) rows.push({ company_id: companyId, kind, value });
    }
  };
  push('category', profile.categories);
  push('subcategory', profile.subcategories);
  push('brand', profile.brands);
  push('capability', profile.capabilities);
  push('region', profile.regionsServed);
  push('market', profile.marketsServed);
  // Supplier "types" stored as capability tags prefixed for display consistency.
  push(
    'capability',
    profile.types.map((t) => `Type: ${t}`),
  );

  const { error: delErr } = await supabase.from('company_taxonomy').delete().eq('company_id', companyId);
  if (delErr) return fail(delErr.message);
  if (!rows.length) return ok(undefined);
  const { error: insErr } = await supabase.from('company_taxonomy').insert(rows);
  if (insErr) return fail(insErr.message);
  return ok(undefined);
}

async function fetchCompanyRecord(companyId: string): Promise<LiveResult<CompanyRecord>> {
  const supabase = requireClient();
  const { data, error } = await supabase.from('companies').select(COMPANY_COLUMNS).eq('id', companyId).maybeSingle();
  if (error) return fail(error.message);
  if (!data) return fail('Company was created but could not be reloaded.');
  const record: CompanyRecord = {
    id: data.id as string,
    sokoId: (data.soko_id as string) || '',
    kind: data.kind as CompanyKind,
    profile: {
      legalName: data.legal_name as string,
      tradingName: (data.trading_name as string) || (data.legal_name as string),
      types: [],
      licenseNo: '',
      issuingAuthority: '',
      licenseExpiry: '',
      country: (data.country as string) || 'United Arab Emirates',
      emirate: (data.emirate as string) || '',
      address: (data.address as string) || '',
      website: (data.website as string) || '',
      generalEmail: (data.general_email as string) || '',
      phone: (data.phone as string) || '',
      established: (data.established as number) ?? undefined,
      description: (data.description as string) || '',
      categories: [],
      subcategories: [],
      brands: [],
      capabilities: [],
      regionsServed: [],
      marketsServed: [],
      contacts: [],
      certifications: [],
      logoTone: 'bg-slate-800',
    },
    verification: {
      status: data.verification_status as CompanyRecord['verification']['status'],
      reviewedAt: (data.verified_at as string) ?? undefined,
    },
    tier: 'free',
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
    demo: false,
  };
  return ok(record);
}

export interface RegisterLiveInput {
  kind: CompanyKind;
  profile: CompanyProfile;
  /** When true, calls submit_verification (document upload is a known follow-up). */
  submitForVerification: boolean;
  /** When set, updates an org already created at signup instead of calling create_company again. */
  existingCompanyId?: string | null;
}

/** Minimal org create after Option A signup — license/taxonomy completed in progressive onboarding. */
export interface BootstrapOrganizationInput {
  kind: CompanyKind;
  legalName: string;
  tradingName?: string;
  /** Permanent product classification → companies.org_classification (not taxonomy). */
  orgClassification: OrgClassification;
  emirate?: string;
  generalEmail?: string;
  description?: string;
}

export async function bootstrapOrganization(input: BootstrapOrganizationInput): Promise<LiveResult<{ companyId: string }>> {
  const legal = input.legalName.trim();
  if (legal.length < 2) return fail('Registered company name is required.');
  if (!isOrgClassification(input.orgClassification)) {
    return fail('Select a valid organization type.');
  }
  try {
    const supabase = requireClient();
    // Keep the existing 6-arg create_company RPC; set org_classification on the follow-up UPDATE.
    const { data: companyId, error: createErr } = await supabase.rpc('create_company', {
      p_kind: input.kind,
      p_legal_name: legal,
      p_trading_name: (input.tradingName || legal).trim(),
      p_license_no: null,
      p_issuing_authority: null,
      p_emirate: input.emirate?.trim() || null,
    });
    if (createErr) return fail(createErr.message);
    if (!companyId || typeof companyId !== 'string') return fail('Company creation did not return an id.');

    const { error: updErr } = await supabase
      .from('companies')
      .update({
        trading_name: (input.tradingName || legal).trim(),
        emirate: input.emirate?.trim() || null,
        general_email: input.generalEmail?.trim() || null,
        description: input.description?.trim() || null,
        is_public: true,
        org_classification: input.orgClassification,
      })
      .eq('id', companyId);
    if (updErr) return fail(updErr.message);

    return ok({ companyId });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Organization registration failed.');
  }
}

/**
 * create_company RPC → profile UPDATE (RLS) → taxonomy → optional submit_verification.
 * Caller must refreshAccess() so workspaces pick up the new membership.
 */
export async function registerLiveCompany(input: RegisterLiveInput): Promise<LiveResult<CompanyRecord>> {
  const p = input.profile;
  if (!p.legalName.trim() || !p.tradingName.trim()) return fail('Legal and trading names are required.');
  if (input.submitForVerification && !p.licenseNo.trim()) {
    return fail('Trade license number is required to submit verification.');
  }
  if (!p.categories.length) {
    return fail(input.kind === 'contractor' ? 'Choose at least one construction discipline.' : 'Choose at least one trade category.');
  }
  if (!p.types.length) {
    return fail(input.kind === 'contractor' ? 'Choose at least one contractor type.' : 'Choose at least one supplier type.');
  }

  try {
    const supabase = requireClient();
    let companyId = input.existingCompanyId?.trim() || '';

    if (!companyId) {
      const { data: createdId, error: createErr } = await supabase.rpc('create_company', {
        p_kind: input.kind,
        p_legal_name: p.legalName.trim(),
        p_trading_name: p.tradingName.trim(),
        p_license_no: p.licenseNo.trim() || null,
        p_issuing_authority: p.issuingAuthority.trim() || null,
        p_emirate: p.emirate.trim() || null,
      });
      if (createErr) return fail(createErr.message);
      if (!createdId || typeof createdId !== 'string') return fail('Company creation did not return an id.');
      companyId = createdId;
    }

    const { error: updErr } = await supabase
      .from('companies')
      .update({
        trading_name: p.tradingName.trim(),
        emirate: p.emirate.trim() || null,
        address: p.address.trim() || null,
        website: p.website.trim() || null,
        general_email: p.generalEmail.trim() || null,
        phone: p.phone.trim() || null,
        established: p.established ?? null,
        description: p.description.trim() || null,
        // Public so peers can discover and request_to_join (RPC requires is_public).
        is_public: true,
      })
      .eq('id', companyId);
    if (updErr) return fail(updErr.message);

    // License fields are written only through submit_verification (not client UPDATE grants).

    const tax = await replaceTaxonomy(companyId, p);
    if (!tax.ok) return tax;

    let verificationStatus: CompanyRecord['verification']['status'] = 'not_submitted';
    if (input.submitForVerification) {
      const expiry = p.licenseExpiry?.trim();
      if (!expiry) return fail('License expiry date is required to submit verification.');
      const { error: verErr } = await supabase.rpc('submit_verification', {
        p_company: companyId,
        p_license_no: p.licenseNo.trim(),
        p_issuing_authority: p.issuingAuthority.trim(),
        p_license_expiry: expiry,
        p_license_document: null,
      });
      if (verErr) return fail(verErr.message);
      verificationStatus = 'pending';
    }

    const loaded = await fetchCompanyRecord(companyId);
    if (!loaded.ok) return loaded;
    return ok({
      ...loaded.value,
      profile: {
        ...loaded.value.profile,
        ...p,
        legalName: loaded.value.profile.legalName || p.legalName,
        tradingName: loaded.value.profile.tradingName || p.tradingName,
      },
      verification: { ...loaded.value.verification, status: verificationStatus },
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Company registration failed.');
  }
}
