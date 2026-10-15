/**
 * Module 1B registration identity taxonomy.
 * Maps product classifications onto existing company_kind (supplier | contractor)
 * until a dedicated org_classification column is approved.
 */
import type { CompanyKind } from './supplierTypes';

export const ORG_CLASSIFICATIONS = [
  'Supplier / Manufacturer',
  'Contractor / Subcontractor',
  'Developer / Real Estate',
  'Consultant / Engineering',
  'Service Provider',
  'Other',
] as const;

export type OrgClassification = (typeof ORG_CLASSIFICATIONS)[number];

export const PROFESSIONAL_CLASSIFICATIONS = [
  'Sales / Business Development',
  'Procurement / Buyer',
  'Engineer / Technical',
  'Project / Construction Management',
  'Management / Executive',
  'Consultant',
  'Other',
] as const;

export type ProfessionalClassification = (typeof PROFESSIONAL_CLASSIFICATIONS)[number];

/** Workspace kind for create_company — only two values exist in staging schema today. */
export function companyKindForOrgClassification(c: OrgClassification): CompanyKind {
  switch (c) {
    case 'Supplier / Manufacturer':
    case 'Service Provider':
    case 'Other':
      return 'supplier';
    case 'Contractor / Subcontractor':
    case 'Developer / Real Estate':
    case 'Consultant / Engineering':
      return 'contractor';
    default:
      return 'supplier';
  }
}

export function isOrgClassification(v: string): v is OrgClassification {
  return (ORG_CLASSIFICATIONS as readonly string[]).includes(v);
}

export function isProfessionalClassification(v: string): v is ProfessionalClassification {
  return (PROFESSIONAL_CLASSIFICATIONS as readonly string[]).includes(v);
}

/** Persisted on company_taxonomy as capability until company_type kind is approved. */
export function orgClassificationTaxonomyValue(c: OrgClassification): string {
  return `OrgType: ${c}`;
}

export const ORG_BOOTSTRAP_KEY = 'soko_org_bootstrap_v1';

export interface OrgBootstrapDraft {
  companyId: string | null;
  classification: OrgClassification;
  legalName: string;
  tradingName: string;
  emirate: string;
  countryLabel: string;
  generalEmail: string;
  description: string;
  representativeName: string;
  kind: CompanyKind;
}

export function saveOrgBootstrap(draft: OrgBootstrapDraft): void {
  try {
    sessionStorage.setItem(ORG_BOOTSTRAP_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export function loadOrgBootstrap(): OrgBootstrapDraft | null {
  try {
    const raw = sessionStorage.getItem(ORG_BOOTSTRAP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OrgBootstrapDraft;
  } catch {
    return null;
  }
}

export function clearOrgBootstrap(): void {
  try {
    sessionStorage.removeItem(ORG_BOOTSTRAP_KEY);
  } catch {
    /* ignore */
  }
}

export const PRO_ROLE_KEY = 'soko_pro_role_v1';

export function saveProfessionalRole(role: ProfessionalClassification): void {
  try {
    sessionStorage.setItem(PRO_ROLE_KEY, role);
  } catch {
    /* ignore */
  }
}

export function loadProfessionalRole(): ProfessionalClassification | null {
  try {
    const v = sessionStorage.getItem(PRO_ROLE_KEY);
    return v && isProfessionalClassification(v) ? v : null;
  } catch {
    return null;
  }
}

export function clearProfessionalRole(): void {
  try {
    sessionStorage.removeItem(PRO_ROLE_KEY);
  } catch {
    /* ignore */
  }
}
