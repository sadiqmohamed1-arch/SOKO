import { SupplierCertification, SupplierContact } from './buyerSuppliers';
import { OfficeKioskVisit } from '../types';

export type SupplierRole = 'supplier_admin' | 'sales_manager' | 'sales_rep' | 'technical_manager' | 'viewer';

export type Permission =
  | 'profile.edit'
  | 'products.manage'
  | 'documents.view'
  | 'documents.manage'
  | 'documents.share'
  | 'contacts.manage'
  | 'campaigns.manage'
  | 'visits.manage'
  | 'team.manage'
  | 'plan.manage'
  | 'records.delete';

export const ROLE_META: Record<SupplierRole, { label: string; description: string; permissions: Permission[] }> = {
  supplier_admin: {
    label: 'Supplier Admin',
    description: 'Full control of the company workspace, team, plan and records.',
    permissions: ['profile.edit', 'products.manage', 'documents.view', 'documents.manage', 'documents.share', 'contacts.manage', 'campaigns.manage', 'visits.manage', 'team.manage', 'plan.manage', 'records.delete'],
  },
  sales_manager: {
    label: 'Sales Manager',
    description: 'Manages profile, products, buyer relationships, campaigns and document sharing.',
    permissions: ['profile.edit', 'products.manage', 'documents.view', 'documents.share', 'contacts.manage', 'campaigns.manage', 'visits.manage'],
  },
  sales_rep: {
    label: 'Sales Representative',
    description: 'Handles authorised buyer interactions and visits. Cannot change the plan or delete company records.',
    permissions: ['documents.view', 'contacts.manage', 'visits.manage'],
  },
  technical_manager: {
    label: 'Technical Manager',
    description: 'Maintains product information and technical documents.',
    permissions: ['products.manage', 'documents.view', 'documents.manage'],
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to the company workspace.',
    permissions: [],
  },
};

export const SUPPLIER_ROLES = Object.keys(ROLE_META) as SupplierRole[];

export const can = (role: SupplierRole, p: Permission) => ROLE_META[role].permissions.includes(p);

export type SupplierTier = 'free' | 'premium';

export const TIER_CONFIG: Record<SupplierTier, { label: string; tagline: string; storageMb: number; listingLimit: number; specLimit: number; imageLimit: number; teamSeats: number }> = {
  free: { label: 'Supplier Free', tagline: 'Establish your presence on SOKO.', storageMb: 0, listingLimit: 25, specLimit: 4, imageLimit: 1, teamSeats: 3 },
  premium: { label: 'Supplier Premium', tagline: 'Manage your company intelligence and grow your market reach.', storageMb: 10240, listingLimit: 500, specLimit: 30, imageLimit: 6, teamSeats: 25 },
};

export type VerificationStatus = 'not_submitted' | 'pending' | 'verified' | 'rejected';

export interface CompanyVerification {
  status: VerificationStatus;
  licenseFile?: string;
  submittedAt?: string;
  reviewedAt?: string;
  note?: string;
}

export interface CompanyProfile {
  legalName: string;
  tradingName: string;
  types: string[];
  descriptor?: string;
  licenseNo: string;
  issuingAuthority: string;
  licenseExpiry: string;
  country: string;
  emirate: string;
  address: string;
  website: string;
  generalEmail: string;
  phone: string;
  established?: number;
  description: string;
  categories: string[];
  subcategories: string[];
  brands: string[];
  capabilities: string[];
  regionsServed: string[];
  marketsServed: string[];
  contacts: SupplierContact[];
  certifications: SupplierCertification[];
  logoTone: string;
}

export interface CompanyRecord {
  id: string;
  sokoId: string;
  profile: CompanyProfile;
  verification: CompanyVerification;
  tier: SupplierTier;
  storageMb?: number;
  createdAt: string;
  updatedAt: string;
  demo: boolean;
}

export type MembershipStatus = 'active' | 'invited' | 'pending_approval';

export interface CompanyMembership {
  id: string;
  companyId: string;
  userId: string;
  name: string;
  email: string;
  title: string;
  role: SupplierRole;
  status: MembershipStatus;
  at: string;
  note?: string;
}

export interface CompanyProduct {
  id: string;
  companyId: string;
  name: string;
  type: string;
  category: string;
  subcategory: string;
  brand: string;
  description: string;
  specs: { label: string; value: string }[];
  regions: string[];
  images: string[];
  variations: string[];
  attachments: { name: string; kind: 'Datasheet' | 'Brochure' | 'Certificate' | 'Technical Document' }[];
  collection: string;
  status: 'active' | 'inactive' | 'draft';
  views: number;
  enquiries: number;
  intelligenceScore?: number;
  updatedAt: string;
}

export const DOCUMENT_CATEGORIES = [
  'Trade Licenses',
  'VAT / Tax Certificates',
  'Company Registrations',
  'ISO Certifications',
  'Product Certifications',
  'Technical Datasheets',
  'Material Safety Datasheets',
  'Test Reports',
  'Manufacturer Authorizations',
  'Company Brochures',
  'Prequalification Documents',
  'Other Company Documents',
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export type DocumentAccessLevel = 'admins' | 'team' | 'technical';

export const ACCESS_META: Record<DocumentAccessLevel, { label: string; roles: SupplierRole[] }> = {
  admins: { label: 'Admins only', roles: ['supplier_admin'] },
  team: { label: 'All team members', roles: ['supplier_admin', 'sales_manager', 'sales_rep', 'technical_manager', 'viewer'] },
  technical: { label: 'Admins & technical', roles: ['supplier_admin', 'technical_manager', 'sales_manager'] },
};

export interface DocumentShare {
  id: string;
  company: string;
  at: string;
  until: string;
  by: string;
}

export interface CompanyDocument {
  id: string;
  companyId: string;
  name: string;
  category: DocumentCategory;
  fileName: string;
  sizeMb: number;
  uploadedAt: string;
  uploadedBy: string;
  expiry?: string;
  reminderDays: number;
  access: DocumentAccessLevel;
  archived: boolean;
  forVerification: boolean;
  shares: DocumentShare[];
  versions: { version: number; fileName: string; at: string; by: string }[];
}

export type CompanyContactKind = 'connection' | 'saved' | 'incoming';

export interface CompanyContact {
  id: string;
  companyId: string;
  kind: CompanyContactKind;
  name: string;
  title: string;
  company: string;
  category: string;
  emirate: string;
  email?: string;
  phone?: string;
  consentToShare: boolean;
  message?: string;
  at: string;
}

export interface SupplierVisit {
  id: string;
  companyId: string;
  date: string;
  time: string;
  representative: string;
  hostCompany: string;
  hostContact: string;
  location: string;
  purpose: OfficeKioskVisit['purposeOfVisit'];
  productsDiscussed: string[];
  status: OfficeKioskVisit['visitorStatus'];
  kioskBadge?: string;
}

export interface VisitFollowUp {
  visitId: string;
  companyId: string;
  note: string;
  at: string;
  by: string;
}

export interface AuditEntry {
  id: string;
  companyId: string;
  at: string;
  actor: string;
  action: string;
  kind: 'profile' | 'product' | 'document' | 'team' | 'plan' | 'verification' | 'contact' | 'visit';
}

export interface SupplierStore {
  version: number;
  companies: CompanyRecord[];
  memberships: CompanyMembership[];
  products: CompanyProduct[];
  documents: CompanyDocument[];
  contacts: CompanyContact[];
  visits: SupplierVisit[];
  followUps: VisitFollowUp[];
  audit: AuditEntry[];
  previewRole: Record<string, SupplierRole | undefined>;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  title: string;
}

export type SupplierResult<T = undefined> = { ok: true; store: SupplierStore; value: T } | { ok: false; error: string };
