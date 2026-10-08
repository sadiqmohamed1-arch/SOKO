import { SupplierCertification, SupplierContact } from './buyerSuppliers';
import { OfficeKioskVisit } from '../types';

export type SupplierRole = 'supplier_admin' | 'sales_manager' | 'sales_rep' | 'technical_manager' | 'viewer';

export type CompanyKind = 'supplier' | 'contractor';

export type ContractorRole = 'contractor_admin' | 'procurement_manager' | 'procurement_officer' | 'technical_reviewer' | 'viewer';

export type CompanyRole = SupplierRole | ContractorRole;

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

export const CONTRACTOR_ROLE_META: Record<ContractorRole, { label: string; description: string; permissions: Permission[] }> = {
  contractor_admin: {
    label: 'Company Admin',
    description: 'Full control of the contractor workspace, team, vendor directory and settings.',
    permissions: ['profile.edit', 'products.manage', 'documents.view', 'documents.manage', 'documents.share', 'contacts.manage', 'campaigns.manage', 'visits.manage', 'team.manage', 'plan.manage', 'records.delete'],
  },
  procurement_manager: {
    label: 'Procurement Manager',
    description: 'Manages vendors, suppliers, RFQs and procurement intelligence.',
    permissions: ['profile.edit', 'products.manage', 'documents.view', 'documents.share', 'contacts.manage', 'campaigns.manage', 'visits.manage'],
  },
  procurement_officer: {
    label: 'Procurement Officer',
    description: 'Handles day-to-day supplier interactions and vendor records.',
    permissions: ['products.manage', 'documents.view', 'contacts.manage', 'visits.manage'],
  },
  technical_reviewer: {
    label: 'Technical Reviewer',
    description: 'Reviews supplier compliance and technical documentation.',
    permissions: ['documents.view', 'documents.manage'],
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to the contractor workspace.',
    permissions: [],
  },
};

export const CONTRACTOR_ROLES = Object.keys(CONTRACTOR_ROLE_META) as ContractorRole[];

export const can = (role: CompanyRole, p: Permission): boolean => {
  if (role in ROLE_META) return ROLE_META[role as SupplierRole].permissions.includes(p);
  if (role in CONTRACTOR_ROLE_META) return CONTRACTOR_ROLE_META[role as ContractorRole].permissions.includes(p);
  return false;
};

export const roleMeta = (role: CompanyRole) =>
  role in ROLE_META ? ROLE_META[role as SupplierRole] : role in CONTRACTOR_ROLE_META ? CONTRACTOR_ROLE_META[role as ContractorRole] : { label: role, description: '', permissions: [] as Permission[] };

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
  kind: CompanyKind;
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
  role: CompanyRole;
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

export const ACCESS_META: Record<DocumentAccessLevel, { label: string; roles: CompanyRole[] }> = {
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

export type VisitStatus = 'scheduled' | 'checked-in' | 'in-meeting' | 'completed' | 'cancelled' | 'no-show';
export type VisitType = 'scheduled' | 'walk-in';
export type VisitPurpose = 'Sample Demonstration' | 'Contract Negotiation' | 'RFQ Discussion' | 'Vendor Onboarding' | 'Facility Inspection' | 'Commercial Review' | 'Other';

export interface SupplierVisit {
  id: string;
  companyId: string;
  hostCompanyId?: string;
  date: string;
  time: string;
  representative: string;
  hostCompany: string;
  hostContact: string;
  location: string;
  purpose: VisitPurpose;
  productsDiscussed: string[];
  status: VisitStatus;
  visitType: VisitType;
  kioskBadge?: string;
  checkInAt?: string;
  checkOutAt?: string;
  createdById: string;
  createdByName: string;
  confirmedById?: string;
  confirmedByName?: string;
  remarks?: string;
}

export interface VisitFollowUp {
  id: string;
  visitId: string;
  companyId: string;
  side: 'supplier' | 'contractor';
  note: string;
  at: string;
  by: string;
  byId: string;
}

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'in-progress' | 'completed';

export interface VisitTask {
  id: string;
  visitId: string;
  companyId: string;
  side: 'supplier' | 'contractor';
  description: string;
  assignedTo: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
  createdBy: string;
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
  visitTasks: VisitTask[];
  audit: AuditEntry[];
  previewRole: Record<string, CompanyRole | undefined>;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  title: string;
}

export type SupplierResult<T = undefined> = { ok: true; store: SupplierStore; value: T } | { ok: false; error: string };

export interface DemoAccount {
  id: string;
  userId: string;
  name: string;
  email: string;
  title: string;
  role: 'buyer' | 'supplier' | 'contractor';
  company: string;
  avatarUrl: string;
  label: string;
  description: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'demo_mohamed',
    userId: 'usr_me_01',
    name: 'Mohamed Sadiq',
    email: 'mohamed.sadiq@soko.demo',
    title: 'Director of Strategic Sourcing & EPC Contracts',
    role: 'buyer',
    company: 'GEC Dubai',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    label: 'Mohamed Sadiq — Personal Buyer',
    description: 'Personal Buyer Workspace',
  },
  {
    id: 'demo_ahmed',
    userId: 'usr_ahmed_khan',
    name: 'Ahmed Khan',
    email: 'a.khan@abcwaterproofing.ae',
    title: 'Commercial Manager',
    role: 'supplier',
    company: 'ABC Waterproofing LLC',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    label: 'Ahmed Khan — ABC Waterproofing — Supplier Free',
    description: 'Supplier Free Workspace',
  },
  {
    id: 'demo_sarah',
    userId: 'usr_sarah_thomas_es',
    name: 'Sarah Thomas',
    email: 's.thomas@emiratessteel.example',
    title: 'Sales Manager',
    role: 'supplier',
    company: 'Emirates Steel Industries',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    label: 'Sarah Thomas — Emirates Steel — Supplier Premium',
    description: 'Supplier Premium Workspace',
  },
  {
    id: 'demo_mohamed_gec',
    userId: 'usr_me_01',
    name: 'Mohamed Sadiq',
    email: 'mohamed.sadiq@gec-dubai.ae',
    title: 'Procurement Manager / Authorized Buyer',
    role: 'contractor',
    company: 'GEC Dubai',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    label: 'Mohamed Sadiq — GEC Dubai — Contractor (Step 7B)',
    description: 'Contractor / Developer Workspace (placeholder)',
  },
];
