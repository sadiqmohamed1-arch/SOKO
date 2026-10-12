import { normaliseBrand } from './productShared';

/**
 * Reusable admin import system. Each admin module describes its own template columns, validation
 * rules, identity (for duplicate / update detection) and allowed bulk actions. Parsing and validation
 * run entirely in the browser; nothing in this module writes to the database.
 */

export type ImportModuleId = 'products' | 'categories' | 'brands' | 'companies' | 'users' | 'cards' | 'visits';

export type ImportFieldType = 'text' | 'longtext' | 'enum' | 'reference' | 'list' | 'email' | 'url' | 'date';

/** Which summary bucket a failed reference check counts toward. */
export type ReferenceIssueKind = 'taxonomy' | 'supplier' | 'reference';

export interface ImportField {
  key: string;
  label: string;
  required: boolean;
  type: ImportFieldType;
  description: string;
  /** Permitted values for enum fields. */
  allowed?: string[];
  /** Key into ImportContext.references for reference fields. */
  reference?: string;
  referenceIssue?: ReferenceIssueKind;
  /** Extra header spellings recognised during automatic column mapping. */
  aliases?: string[];
  /** True when the column has no backing column in the current schema and would not be stored yet. */
  notInSchema?: boolean;
}

export interface BulkActionDef {
  id: string;
  label: string;
  description: string;
  /** Export runs locally and is the only bulk action that works today. */
  kind: 'privileged' | 'export';
  tone?: 'default' | 'danger';
}

export interface ImportModuleConfig {
  id: ImportModuleId;
  entitySingular: string;
  entityPlural: string;
  templateFileName: string;
  fields: ImportField[];
  sampleRows: Record<string, string>[];
  /** Normalised identity keys for a row. A row matching an existing key would update that record. */
  identityKeys: (values: Record<string, string>) => string[];
  bulkActions: BulkActionDef[];
}

export interface ImportContext {
  /** reference key -> (normalised value -> display value) */
  references: Record<string, Map<string, string>>;
  /** normalised identity key -> human label of the existing record */
  existing: Map<string, string>;
}

export const EMPTY_IMPORT_CONTEXT: ImportContext = { references: {}, existing: new Map() };

export const normaliseKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const EXPORT_SELECTED: BulkActionDef = { id: 'export', label: 'Export selected records', description: 'Download the selected rows as CSV.', kind: 'export' };
const ARCHIVE: BulkActionDef = { id: 'archive', label: 'Archive', description: 'Hide records from the marketplace without deleting them.', kind: 'privileged', tone: 'danger' };
const FLAG: BulkActionDef = { id: 'flag', label: 'Flag for review', description: 'Queue records for catalog governance review.', kind: 'privileged' };

const LIST_HINT = 'Separate multiple values with a semicolon (;).';

// ---------------------------------------------------------------------------------------------------------
// Module configurations
// ---------------------------------------------------------------------------------------------------------

export const PRODUCT_IMPORT: ImportModuleConfig = {
  id: 'products',
  entitySingular: 'product',
  entityPlural: 'products',
  templateFileName: 'soko-product-import-template.csv',
  fields: [
    { key: 'product_code', label: 'Product ID', required: false, type: 'text', description: 'Existing PRD- code. Leave blank to create a new listing.', aliases: ['id', 'product id', 'code', 'sku'] },
    { key: 'name', label: 'Product Name', required: true, type: 'text', description: 'Listing title shown to buyers.', aliases: ['name', 'title', 'product'] },
    { key: 'supplier', label: 'Supplier', required: true, type: 'reference', reference: 'supplier', referenceIssue: 'supplier', description: 'SOKO ID or registered company name.', aliases: ['supplier company', 'company', 'soko id', 'vendor'] },
    { key: 'brand', label: 'Brand', required: false, type: 'reference', reference: 'brand', referenceIssue: 'taxonomy', description: 'Must match a brand in the Brands registry.', aliases: ['manufacturer brand', 'make'] },
    { key: 'category', label: 'Main Category', required: true, type: 'reference', reference: 'category', referenceIssue: 'taxonomy', description: 'Must match an existing catalog category.', aliases: ['category', 'main category', 'parent category'] },
    { key: 'subcategory', label: 'Subcategory', required: false, type: 'text', description: 'Free text within the main category.', aliases: ['sub category', 'sub-category'] },
    { key: 'type', label: 'Product Type', required: false, type: 'text', description: 'For example: material, equipment, service.' },
    { key: 'description', label: 'Description', required: false, type: 'longtext', description: 'Plain text, up to a few paragraphs.' },
    { key: 'unit', label: 'Unit of Measure', required: false, type: 'enum', allowed: ['piece', 'set', 'kg', 'tonne', 'metre', 'm2', 'm3', 'litre', 'box', 'roll'], description: 'Selling unit.', aliases: ['uom', 'unit'], notInSchema: true },
    { key: 'origin', label: 'Country of Origin', required: false, type: 'text', description: 'Country name or ISO code.', aliases: ['country', 'origin'], notInSchema: true },
    { key: 'certifications', label: 'Certifications', required: false, type: 'list', description: `Standards or approvals, e.g. ISO 9001. ${LIST_HINT}`, notInSchema: true },
    { key: 'regions', label: 'Service Regions', required: false, type: 'list', description: `Regions the listing serves. ${LIST_HINT}`, aliases: ['region', 'regions'] },
    { key: 'specs', label: 'Specifications', required: false, type: 'list', description: 'Label: value pairs separated by semicolons, e.g. Grade: S355; Length: 12 m.', aliases: ['specifications', 'technical specifications'] },
    { key: 'status', label: 'Listing Status', required: false, type: 'enum', allowed: ['draft', 'published', 'archived'], description: 'Leave blank to import as draft for review.', aliases: ['status'] },
  ],
  sampleRows: [
    { product_code: '', name: 'Structural Steel I-Beam IPE 300', supplier: 'SOKO-0001', brand: 'Emirates Steel', category: 'Construction Materials', subcategory: 'Structural Steel', type: 'material', description: 'Hot-rolled S355 I-beam, mill certified.', unit: 'tonne', origin: 'United Arab Emirates', certifications: 'EN 10025; ISO 9001', regions: 'Dubai; Abu Dhabi', specs: 'Grade: S355; Length: 12 m', status: 'draft' },
    { product_code: 'PRD-1A2B3C4D', name: 'HDPE Pressure Pipe PN16', supplier: 'Gulf Pipe Industries', brand: '', category: 'Plumbing', subcategory: 'Pipes', type: 'material', description: '', unit: 'metre', origin: '', certifications: '', regions: 'Sharjah', specs: 'Diameter: 110 mm', status: 'published' },
  ],
  identityKeys: (v) => {
    const keys: string[] = [];
    if (v.product_code?.trim()) keys.push(`code:${normaliseKey(v.product_code)}`);
    if (v.supplier?.trim() && v.name?.trim()) keys.push(`name:${normaliseKey(v.supplier)}|${normaliseKey(v.name)}`);
    return keys;
  },
  bulkActions: [
    { id: 'assign_category', label: 'Assign category', description: 'Move the selected listings to another category.', kind: 'privileged' },
    { id: 'assign_brand', label: 'Assign brand', description: 'Set or correct the brand on the selected listings.', kind: 'privileged' },
    { id: 'change_status', label: 'Change listing status', description: 'Publish, return to draft or unpublish.', kind: 'privileged' },
    FLAG,
    ARCHIVE,
    EXPORT_SELECTED,
  ],
};

export const CATEGORY_IMPORT: ImportModuleConfig = {
  id: 'categories',
  entitySingular: 'category',
  entityPlural: 'categories',
  templateFileName: 'soko-category-import-template.csv',
  fields: [
    { key: 'name', label: 'Category Name', required: true, type: 'text', description: 'Display name, unique within its parent.', aliases: ['name', 'category'] },
    { key: 'parent', label: 'Parent Category', required: false, type: 'reference', reference: 'category', referenceIssue: 'taxonomy', description: 'Leave blank for a top-level category.', aliases: ['parent'] },
    { key: 'description', label: 'Description', required: false, type: 'longtext', description: 'Guidance shown to suppliers when classifying listings.', notInSchema: true },
    { key: 'attributes', label: 'Category Attributes', required: false, type: 'list', description: `Specification labels suppliers should complete. ${LIST_HINT}`, aliases: ['attributes'], notInSchema: true },
  ],
  sampleRows: [
    { name: 'Structural Steel', parent: 'Construction Materials', description: 'Beams, columns and plates.', attributes: 'Grade; Length; Standard' },
    { name: 'Safety Equipment', parent: '', description: 'PPE and site safety.', attributes: 'Certification; Size' },
  ],
  identityKeys: (v) => (v.name?.trim() ? [`name:${normaliseKey(v.parent ?? '')}|${normaliseKey(v.name)}`, `name:|${normaliseKey(v.name)}`] : []),
  bulkActions: [
    { id: 'merge', label: 'Merge categories', description: 'Combine duplicates and re-point their listings.', kind: 'privileged' },
    { id: 'reparent', label: 'Change parent', description: 'Move the selected categories under another parent.', kind: 'privileged' },
    ARCHIVE,
    EXPORT_SELECTED,
  ],
};

export const BRAND_IMPORT: ImportModuleConfig = {
  id: 'brands',
  entitySingular: 'brand',
  entityPlural: 'brands',
  templateFileName: 'soko-brand-import-template.csv',
  fields: [
    { key: 'name', label: 'Brand Name', required: true, type: 'text', description: 'Canonical brand spelling.', aliases: ['name', 'brand'] },
    { key: 'manufacturer', label: 'Manufacturer', required: false, type: 'text', description: 'Legal manufacturer or brand owner.', aliases: ['owner', 'company'], notInSchema: true },
    { key: 'country', label: 'Country', required: false, type: 'text', description: 'Manufacturer country.', notInSchema: true },
    { key: 'website', label: 'Website', required: false, type: 'url', description: 'https:// address of the brand.', aliases: ['url'], notInSchema: true },
    { key: 'aliases', label: 'Known Spellings', required: false, type: 'list', description: `Alternative spellings to normalise to this brand. ${LIST_HINT}`, aliases: ['aliases', 'variants'], notInSchema: true },
  ],
  sampleRows: [
    { name: 'Emirates Steel', manufacturer: 'Emirates Steel Arkan', country: 'United Arab Emirates', website: 'https://www.emiratessteel.com', aliases: 'Emirates Steel LLC; EMSTEEL' },
    { name: 'Grundfos', manufacturer: 'Grundfos Holding A/S', country: 'Denmark', website: 'https://www.grundfos.com', aliases: '' },
  ],
  identityKeys: (v) => (v.name?.trim() ? [`brand:${normaliseBrand(v.name)}`] : []),
  bulkActions: [
    { id: 'merge', label: 'Merge brands', description: 'Combine spellings into one canonical brand.', kind: 'privileged' },
    { id: 'normalise', label: 'Normalise spelling', description: 'Rewrite listing brands to the canonical spelling.', kind: 'privileged' },
    ARCHIVE,
    EXPORT_SELECTED,
  ],
};

export const COMPANY_IMPORT: ImportModuleConfig = {
  id: 'companies',
  entitySingular: 'company',
  entityPlural: 'companies',
  templateFileName: 'soko-company-import-template.csv',
  fields: [
    { key: 'soko_id', label: 'SOKO ID', required: false, type: 'text', description: 'Existing SOKO ID to update. Leave blank to create.' },
    { key: 'name', label: 'Company Name', required: true, type: 'text', description: 'Registered legal name.', aliases: ['company', 'legal name'] },
    { key: 'trade_license', label: 'Trade License No.', required: true, type: 'text', description: 'As shown on the trade license.' },
    { key: 'email', label: 'Contact Email', required: true, type: 'email', description: 'Primary company contact.' },
    { key: 'city', label: 'City', required: false, type: 'text', description: 'Head office city.' },
    { key: 'sectors', label: 'Sectors', required: false, type: 'list', description: LIST_HINT },
  ],
  sampleRows: [{ soko_id: '', name: 'Al Noor Building Supplies LLC', trade_license: 'CN-1234567', email: 'info@alnoor.example', city: 'Dubai', sectors: 'Construction; MEP' }],
  identityKeys: (v) => [v.soko_id?.trim() && `soko:${normaliseKey(v.soko_id)}`, v.name?.trim() && `name:${normaliseKey(v.name)}`].filter(Boolean) as string[],
  bulkActions: [{ id: 'verify', label: 'Request verification', description: 'Send selected companies to the Verification Center.', kind: 'privileged' }, FLAG, ARCHIVE, EXPORT_SELECTED],
};

export const USER_IMPORT: ImportModuleConfig = {
  id: 'users',
  entitySingular: 'user',
  entityPlural: 'users',
  templateFileName: 'soko-user-import-template.csv',
  fields: [
    { key: 'email', label: 'Email', required: true, type: 'email', description: 'Invitation is sent to this address.' },
    { key: 'full_name', label: 'Full Name', required: true, type: 'text', description: 'As it should appear on the profile.', aliases: ['name'] },
    { key: 'company', label: 'Company', required: true, type: 'reference', reference: 'supplier', referenceIssue: 'supplier', description: 'SOKO ID or registered company name.' },
    { key: 'role', label: 'Company Role', required: true, type: 'text', description: 'Role within the company workspace.' },
  ],
  sampleRows: [{ email: 'procurement@alnoor.example', full_name: 'Layla Haddad', company: 'SOKO-0001', role: 'member' }],
  identityKeys: (v) => (v.email?.trim() ? [`email:${normaliseKey(v.email)}`] : []),
  bulkActions: [{ id: 'resend', label: 'Resend invitations', description: 'Re-send pending invitations.', kind: 'privileged' }, { id: 'suspend', label: 'Suspend access', description: 'Block sign-in for the selected users.', kind: 'privileged', tone: 'danger' }, EXPORT_SELECTED],
};

export const CARD_IMPORT: ImportModuleConfig = {
  id: 'cards',
  entitySingular: 'business card',
  entityPlural: 'business cards',
  templateFileName: 'soko-business-card-import-template.csv',
  fields: [
    { key: 'owner_email', label: 'Owner Email', required: true, type: 'email', description: 'Existing SOKO user who owns the card.' },
    { key: 'full_name', label: 'Display Name', required: true, type: 'text', description: 'Name printed on the card.' },
    { key: 'designation', label: 'Designation', required: false, type: 'text', description: 'Job title.' },
    { key: 'company', label: 'Company', required: true, type: 'reference', reference: 'supplier', referenceIssue: 'supplier', description: 'SOKO ID or registered company name.' },
    { key: 'phone', label: 'Phone', required: false, type: 'text', description: 'International format.' },
  ],
  sampleRows: [{ owner_email: 'omar@gulfpipe.example', full_name: 'Omar Siddiqui', designation: 'Sales Director', company: 'Gulf Pipe Industries', phone: '+971 50 000 0000' }],
  identityKeys: (v) => (v.owner_email?.trim() ? [`email:${normaliseKey(v.owner_email)}`] : []),
  bulkActions: [{ id: 'disable', label: 'Disable cards', description: 'Stop public card pages from resolving.', kind: 'privileged', tone: 'danger' }, EXPORT_SELECTED],
};

export const VISIT_IMPORT: ImportModuleConfig = {
  id: 'visits',
  entitySingular: 'supplier visit',
  entityPlural: 'supplier visits',
  templateFileName: 'soko-supplier-visit-import-template.csv',
  fields: [
    { key: 'supplier', label: 'Supplier', required: true, type: 'reference', reference: 'supplier', referenceIssue: 'supplier', description: 'Visiting supplier: SOKO ID or company name.' },
    { key: 'host', label: 'Host Company', required: true, type: 'reference', reference: 'supplier', referenceIssue: 'supplier', description: 'Company being visited.' },
    { key: 'scheduled_for', label: 'Scheduled Date', required: true, type: 'date', description: 'YYYY-MM-DD.' },
    { key: 'purpose', label: 'Purpose', required: false, type: 'longtext', description: 'Agenda or meeting purpose.' },
  ],
  sampleRows: [{ supplier: 'SOKO-0001', host: 'Gulf Pipe Industries', scheduled_for: '2026-11-04', purpose: 'Quarterly product presentation' }],
  identityKeys: (v) => (v.supplier && v.host && v.scheduled_for ? [`visit:${normaliseKey(v.supplier)}|${normaliseKey(v.host)}|${v.scheduled_for.trim()}`] : []),
  bulkActions: [{ id: 'cancel', label: 'Cancel visits', description: 'Cancel the selected scheduled visits.', kind: 'privileged', tone: 'danger' }, EXPORT_SELECTED],
};

export const IMPORT_MODULES: Record<ImportModuleId, ImportModuleConfig> = {
  products: PRODUCT_IMPORT,
  categories: CATEGORY_IMPORT,
  brands: BRAND_IMPORT,
  companies: COMPANY_IMPORT,
  users: USER_IMPORT,
  cards: CARD_IMPORT,
  visits: VISIT_IMPORT,
};

// ---------------------------------------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------------------------------------

const csvCell = (value: string) => (/[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export function toCsv(rows: string[][]): string {
  // BOM so Excel opens UTF-8 (Arabic names, en dashes) correctly.
  return '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

export function downloadCsv(fileName: string, rows: string[][]) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function templateRows(config: ImportModuleConfig): string[][] {
  return [config.fields.map((f) => f.label), ...config.sampleRows.map((row) => config.fields.map((f) => row[f.key] ?? ''))];
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export interface ParsedSheet {
  fileName: string;
  headers: string[];
  rows: string[][];
}

export const MAX_IMPORT_ROWS = 5000;

export async function parseImportFile(file: File): Promise<ParsedSheet> {
  const lower = file.name.toLowerCase();
  let matrix: string[][];
  if (lower.endsWith('.csv')) {
    matrix = parseCsv(await file.text());
  } else if (lower.endsWith('.xlsx')) {
    const { default: readXlsxFile } = await import('read-excel-file');
    const sheet = await readXlsxFile(file);
    matrix = sheet
      .map((r) => r.map((c) => (c === null || c === undefined ? '' : c instanceof Date ? c.toISOString().slice(0, 10) : String(c))))
      .filter((r) => r.some((c) => c.trim() !== ''));
  } else {
    throw new Error('Only .xlsx and .csv files are supported.');
  }
  if (matrix.length === 0) throw new Error('The file is empty.');
  const [headers, ...rows] = matrix;
  if (rows.length > MAX_IMPORT_ROWS) throw new Error(`The file has ${rows.length.toLocaleString()} rows. The limit is ${MAX_IMPORT_ROWS.toLocaleString()} per import.`);
  return { fileName: file.name, headers: headers.map((h) => h.trim()), rows };
}

// ---------------------------------------------------------------------------------------------------------
// Mapping and validation
// ---------------------------------------------------------------------------------------------------------

/** field key -> column index in the uploaded sheet, or null when unmapped. */
export type ColumnMapping = Record<string, number | null>;

const headerKey = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function autoMapColumns(config: ImportModuleConfig, headers: string[]): ColumnMapping {
  const normalised = headers.map(headerKey);
  const used = new Set<number>();
  const mapping: ColumnMapping = {};
  for (const field of config.fields) {
    const candidates = [field.label, field.key.replace(/_/g, ' '), ...(field.aliases ?? [])].map(headerKey);
    const index = normalised.findIndex((h, i) => !used.has(i) && candidates.includes(h));
    mapping[field.key] = index >= 0 ? index : null;
    if (index >= 0) used.add(index);
  }
  return mapping;
}

export type IssueKind = 'missing' | 'enum' | 'format' | 'taxonomy' | 'supplier' | 'reference' | 'duplicate';

export interface RowIssue {
  field: string;
  kind: IssueKind;
  message: string;
}

export type RowAction = 'create' | 'update' | 'skip';

export interface ValidatedRow {
  rowNumber: number;
  values: Record<string, string>;
  issues: RowIssue[];
  action: RowAction;
  /** Label of the existing record a row would update. */
  matches: string | null;
}

export interface ValidationSummary {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  missingMandatory: number;
  invalidTaxonomy: number;
  invalidSupplier: number;
  create: number;
  update: number;
  skip: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateRows(config: ImportModuleConfig, sheet: ParsedSheet, mapping: ColumnMapping, ctx: ImportContext): { rows: ValidatedRow[]; summary: ValidationSummary } {
  const seen = new Map<string, number>();
  const rows: ValidatedRow[] = sheet.rows.map((cells, i) => {
    const rowNumber = i + 2; // header is row 1
    const values: Record<string, string> = {};
    for (const f of config.fields) {
      const col = mapping[f.key];
      values[f.key] = col === null || col === undefined ? '' : (cells[col] ?? '').trim();
    }
    const issues: RowIssue[] = [];
    for (const f of config.fields) {
      const v = values[f.key];
      if (!v) {
        if (f.required) issues.push({ field: f.label, kind: 'missing', message: `${f.label} is required.` });
        continue;
      }
      if (f.type === 'enum' && f.allowed && !f.allowed.includes(v.toLowerCase())) {
        issues.push({ field: f.label, kind: 'enum', message: `"${v}" is not allowed. Use one of: ${f.allowed.join(', ')}.` });
      } else if (f.type === 'email' && !EMAIL_RE.test(v)) {
        issues.push({ field: f.label, kind: 'format', message: `"${v}" is not a valid email address.` });
      } else if (f.type === 'date' && (!DATE_RE.test(v) || Number.isNaN(Date.parse(v)))) {
        issues.push({ field: f.label, kind: 'format', message: `"${v}" is not a date in YYYY-MM-DD format.` });
      } else if (f.type === 'url' && !/^https?:\/\/\S+\.\S+/.test(v)) {
        issues.push({ field: f.label, kind: 'format', message: `"${v}" is not a valid http(s) address.` });
      } else if (f.type === 'reference' && f.reference) {
        const ref = ctx.references[f.reference];
        const key = f.reference === 'brand' ? normaliseBrand(v) : normaliseKey(v);
        if (!ref || !ref.has(key)) {
          const kind = f.referenceIssue ?? 'reference';
          const what = kind === 'supplier' ? 'company on SOKO' : `${f.label.toLowerCase()} in the catalog`;
          issues.push({ field: f.label, kind, message: ref ? `"${v}" does not match any ${what}.` : `${f.label} references could not be loaded, so "${v}" cannot be checked.` });
        }
      }
    }

    const keys = config.identityKeys(values);
    const firstSeen = keys.map((k) => seen.get(k)).find((n) => n !== undefined);
    if (firstSeen !== undefined) {
      issues.push({ field: 'Row', kind: 'duplicate', message: `Duplicate of row ${firstSeen} in this file.` });
    } else {
      for (const k of keys) seen.set(k, rowNumber);
    }
    const matchKey = keys.find((k) => ctx.existing.has(k));
    const matches = matchKey ? ctx.existing.get(matchKey) ?? null : null;
    const action: RowAction = issues.length > 0 ? 'skip' : matches ? 'update' : 'create';
    return { rowNumber, values, issues, action, matches };
  });

  const has = (r: ValidatedRow, k: IssueKind) => r.issues.some((x) => x.kind === k);
  const summary: ValidationSummary = {
    total: rows.length,
    valid: rows.filter((r) => r.issues.length === 0).length,
    invalid: rows.filter((r) => r.issues.length > 0).length,
    duplicates: rows.filter((r) => has(r, 'duplicate')).length,
    missingMandatory: rows.filter((r) => has(r, 'missing')).length,
    invalidTaxonomy: rows.filter((r) => has(r, 'taxonomy')).length,
    invalidSupplier: rows.filter((r) => has(r, 'supplier')).length,
    create: rows.filter((r) => r.action === 'create').length,
    update: rows.filter((r) => r.action === 'update').length,
    skip: rows.filter((r) => r.action === 'skip').length,
  };
  return { rows, summary };
}

export function errorReportRows(rows: ValidatedRow[]): string[][] {
  return [['Row', 'Field', 'Problem', 'Message'], ...rows.flatMap((r) => r.issues.map((i) => [String(r.rowNumber), i.field, i.kind, i.message]))];
}
