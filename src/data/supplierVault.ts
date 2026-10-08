import { BuyerSupplier, SupplierPlan, supplierPlan } from './buyerSuppliers';

export type VaultCategory = 'Company & Legal' | 'Certifications' | 'Commercial' | 'Catalogues & Technical';

export const VAULT_CATEGORIES: { id: VaultCategory; types: string[] }[] = [
  { id: 'Company & Legal', types: ['Trade License', 'VAT Certificate', 'Company Profile', 'Chamber / Registration'] },
  { id: 'Certifications', types: ['ISO Certification', 'Quality Certification', 'HSE Certification', 'Manufacturer Authorization'] },
  { id: 'Commercial', types: ['Bank Details', 'Insurance', 'Other'] },
  {
    id: 'Catalogues & Technical',
    types: [
      'Product Catalogue',
      'Technical Catalogue',
      'Brochure',
      'Technical Data Sheet',
      'Safety Data Sheet',
      'Test Report',
      'Product Certificate',
      'Technical Approval',
    ],
  },
];

export type DocumentVisibility = 'public' | 'soko-users' | 'on-request' | 'private';

export const VISIBILITY_META: Record<DocumentVisibility, { label: string; description: string }> = {
  public: { label: 'Public', description: 'Anyone with the SOKO profile link can view this document.' },
  'soko-users': { label: 'SOKO Users', description: 'Available to signed-in SOKO users.' },
  'on-request': { label: 'On Request', description: 'Shared by the supplier after a request.' },
  private: { label: 'Private', description: 'Only visible to the supplier.' },
};

export type DocumentVerification = 'verified' | 'supplier-provided' | 'pending';

export interface VaultDocument {
  id: string;
  name: string;
  type: string;
  category: VaultCategory;
  issueDate?: string;
  expiryDate?: string;
  verification: DocumentVerification;
  visibility: DocumentVisibility;
  uploadedBy: string;
  lastUpdated: string;
  fileType: 'PDF' | 'XLSX' | 'DOCX';
  sizeMb: number;
  featuredCatalogue?: boolean;
}

export interface DocumentPack {
  id: string;
  name: string;
  description: string;
  documentIds: string[];
  visibility: Exclude<DocumentVisibility, 'private'>;
}

export interface SupplierVault {
  documents: VaultDocument[];
  packs: DocumentPack[];
}

export const PLAN_META: Record<SupplierPlan, { label: string; vault: boolean; storageAllowanceMb?: number }> = {
  free: { label: 'SOKO Supplier', vault: false },
  pro: { label: 'SOKO Supplier Pro', vault: true },
};

const doc = (d: Omit<VaultDocument, 'uploadedBy' | 'fileType'> & Partial<Pick<VaultDocument, 'uploadedBy' | 'fileType'>>): VaultDocument => ({
  uploadedBy: 'Compliance Team',
  fileType: 'PDF',
  ...d,
});

const EMIRATES_STEEL_VAULT: SupplierVault = {
  documents: [
    doc({ id: 'es_trade', name: 'Trade License', type: 'Trade License', category: 'Company & Legal', issueDate: '2026-08-19', expiryDate: '2027-08-18', verification: 'verified', visibility: 'public', lastUpdated: '2026-08-21', sizeMb: 1.2 }),
    doc({ id: 'es_vat', name: 'VAT Registration Certificate', type: 'VAT Certificate', category: 'Company & Legal', issueDate: '2018-01-01', verification: 'verified', visibility: 'soko-users', lastUpdated: '2026-02-11', sizeMb: 0.4 }),
    doc({ id: 'es_profile', name: 'Company Profile', type: 'Company Profile', category: 'Company & Legal', issueDate: '2026-09-01', verification: 'supplier-provided', visibility: 'public', uploadedBy: 'Marketing Team', lastUpdated: '2026-09-20', sizeMb: 6, featuredCatalogue: true }),
    doc({ id: 'es_chamber', name: 'Abu Dhabi Chamber Registration', type: 'Chamber / Registration', category: 'Company & Legal', issueDate: '2026-05-31', expiryDate: '2027-05-30', verification: 'verified', visibility: 'soko-users', lastUpdated: '2026-06-02', sizeMb: 0.6 }),
    doc({ id: 'es_iso9001', name: 'ISO 9001 Quality Management', type: 'ISO Certification', category: 'Certifications', issueDate: '2024-03-13', expiryDate: '2027-03-12', verification: 'verified', visibility: 'public', lastUpdated: '2026-03-15', sizeMb: 0.8 }),
    doc({ id: 'es_iso14001', name: 'ISO 14001 Environmental Management', type: 'ISO Certification', category: 'Certifications', issueDate: '2024-06-21', expiryDate: '2027-06-20', verification: 'verified', visibility: 'public', lastUpdated: '2026-06-22', sizeMb: 0.8 }),
    doc({ id: 'es_iso45001', name: 'ISO 45001 Occupational Health & Safety', type: 'ISO Certification', category: 'Certifications', issueDate: '2024-06-21', expiryDate: '2027-06-20', verification: 'verified', visibility: 'public', lastUpdated: '2026-06-22', sizeMb: 0.9 }),
    doc({ id: 'es_cares', name: 'CARES Product Certification', type: 'Product Certificate', category: 'Catalogues & Technical', issueDate: '2025-03-01', expiryDate: '2027-02-28', verification: 'verified', visibility: 'soko-users', uploadedBy: 'Quality Department', lastUpdated: '2026-03-04', sizeMb: 1.1 }),
    doc({ id: 'es_bank', name: 'Bank Details Letter', type: 'Bank Details', category: 'Commercial', issueDate: '2026-07-01', verification: 'supplier-provided', visibility: 'on-request', uploadedBy: 'Finance Team', lastUpdated: '2026-07-01', sizeMb: 0.3 }),
    doc({ id: 'es_insurance', name: 'Product Liability Insurance', type: 'Insurance', category: 'Commercial', issueDate: '2026-02-01', expiryDate: '2027-01-31', verification: 'supplier-provided', visibility: 'on-request', uploadedBy: 'Finance Team', lastUpdated: '2026-02-03', sizeMb: 0.7 }),
    doc({ id: 'es_catalogue', name: 'Steel Product Catalogue 2026', type: 'Product Catalogue', category: 'Catalogues & Technical', issueDate: '2026-01-10', verification: 'supplier-provided', visibility: 'public', uploadedBy: 'Marketing Team', lastUpdated: '2026-09-28', sizeMb: 18, featuredCatalogue: true }),
    doc({ id: 'es_techguide', name: 'Technical Product Guide', type: 'Technical Catalogue', category: 'Catalogues & Technical', issueDate: '2026-04-15', verification: 'supplier-provided', visibility: 'public', uploadedBy: 'Technical Services', lastUpdated: '2026-09-12', sizeMb: 9, featuredCatalogue: true }),
    doc({ id: 'es_tds_rebar', name: 'B500B Rebar Technical Data Sheet', type: 'Technical Data Sheet', category: 'Catalogues & Technical', issueDate: '2026-02-20', verification: 'supplier-provided', visibility: 'public', uploadedBy: 'Technical Services', lastUpdated: '2026-08-30', sizeMb: 1.4 }),
    doc({ id: 'es_mtc', name: 'Mill Test Certificate (Sample)', type: 'Test Report', category: 'Catalogues & Technical', issueDate: '2026-09-02', verification: 'supplier-provided', visibility: 'soko-users', uploadedBy: 'Quality Department', lastUpdated: '2026-09-02', sizeMb: 0.5 }),
    doc({ id: 'es_financials', name: 'Audited Financial Statements 2025', type: 'Other', category: 'Commercial', issueDate: '2026-04-30', verification: 'supplier-provided', visibility: 'private', uploadedBy: 'Finance Team', lastUpdated: '2026-05-02', sizeMb: 3.4 }),
  ],
  packs: [
    {
      id: 'pack_vendor',
      name: 'Vendor Registration Pack',
      description: 'Everything typically required to register Emirates Steel as a vendor.',
      documentIds: ['es_trade', 'es_vat', 'es_profile', 'es_iso9001', 'es_iso14001', 'es_iso45001', 'es_bank', 'es_catalogue'],
      visibility: 'on-request',
    },
    {
      id: 'pack_intro',
      name: 'Company Introduction Pack',
      description: 'Company profile and catalogues for a first introduction.',
      documentIds: ['es_profile', 'es_catalogue', 'es_techguide'],
      visibility: 'public',
    },
    {
      id: 'pack_prequal',
      name: 'Prequalification Pack',
      description: 'Legal, certification and insurance documents for project prequalification.',
      documentIds: ['es_trade', 'es_vat', 'es_chamber', 'es_iso9001', 'es_iso14001', 'es_iso45001', 'es_insurance'],
      visibility: 'on-request',
    },
    {
      id: 'pack_technical',
      name: 'Technical Pack',
      description: 'Technical guide and product certification for consultants and engineers.',
      documentIds: ['es_techguide', 'es_tds_rebar', 'es_mtc', 'es_cares', 'es_catalogue'],
      visibility: 'soko-users',
    },
  ],
};

const VAULTS: Record<string, SupplierVault> = {
  sup_emirates_steel: EMIRATES_STEEL_VAULT,
};

export const canOpenDocument = (d: VaultDocument) => d.visibility === 'public' || d.visibility === 'soko-users';

export interface BuyerVault {
  documents: VaultDocument[];
  packs: (DocumentPack & { onRequestCount: number })[];
}

export const buyerVault = (s: BuyerSupplier): BuyerVault | null => {
  if (!PLAN_META[supplierPlan(s)].vault) return null;
  const vault = VAULTS[s.id];
  if (!vault) return null;
  const accessible = new Set(vault.documents.filter(canOpenDocument).map((d) => d.id));
  return {
    documents: vault.documents.filter((d) => accessible.has(d.id)),
    packs: vault.packs.map((p) => ({
      ...p,
      documentIds: p.documentIds.filter((id) => accessible.has(id)),
      onRequestCount: p.documentIds.filter((id) => !accessible.has(id)).length,
    })),
  };
};

export type ExpiryState = 'current' | 'expiring' | 'expired' | 'no-expiry';

const EXPIRING_WINDOW_DAYS = 60;

export const expiryState = (d: VaultDocument): ExpiryState => {
  if (!d.expiryDate) return 'no-expiry';
  const days = (new Date(d.expiryDate).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return 'expired';
  return days <= EXPIRING_WINDOW_DAYS ? 'expiring' : 'current';
};

export const fileLabel = (d: VaultDocument) => `${d.fileType} · ${d.sizeMb >= 1 ? `${Math.round(d.sizeMb)} MB` : `${Math.round(d.sizeMb * 1000)} KB`}`;
