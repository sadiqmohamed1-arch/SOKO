import { BuyerSupplier, IMG } from './buyerSuppliers';
import { CompanyContact, CompanyDocument, CompanyKind, CompanyMembership, CompanyProduct, CompanyRecord, DocumentCategory, SupplierStore, AuditEntry, SupplierVisit, VisitFollowUp, VisitTask, VendorRecord, VendorNote, DocumentVisibility } from './supplierTypes';

export const SUPPLIER_STORE_VERSION = 6;
export const DEMO_USER = { id: 'usr_me_01', name: 'Mohamed Sadiq', email: 'mohamed.sadiq@soko.demo', title: 'Director of Strategic Sourcing' };

const day = 86400000;
const ago = (n: number) => new Date(Date.now() - n * day).toISOString();
const ahead = (n: number) => new Date(Date.now() + n * day).toISOString().slice(0, 10);

const DETAILS: Record<string, { licenseNo: string; authority: string; address: string; phone: string; legal: string }> = {
  sup_abc_waterproofing: {
    licenseNo: 'DED-784512',
    authority: 'Dubai Department of Economy & Tourism',
    address: 'Warehouse 14, Al Quoz Industrial Area 3, Dubai',
    phone: '+971 4 340 2210',
    legal: 'ABC Waterproofing L.L.C.',
  },
  sup_emirates_steel: {
    licenseNo: 'CN-1002846',
    authority: 'Abu Dhabi Department of Economic Development',
    address: 'ICAD 1, Mussafah Industrial Area, Abu Dhabi',
    phone: '+971 2 551 1000',
    legal: 'Emirates Steel Industries PJSC',
  },
  con_gec_dubai: {
    licenseNo: 'DED-998877',
    authority: 'Dubai Department of Economy & Tourism',
    address: 'GEC Dubai Head Office, Al Barsha 1, Dubai',
    phone: '+971 4 390 8421',
    legal: 'GEC Dubai Contracting LLC',
  },
};

export const companyFromDirectory = (s: BuyerSupplier, tier: CompanyRecord['tier'], kind: CompanyKind = 'supplier'): CompanyRecord => {
  const d = DETAILS[s.id];
  return {
    id: s.id,
    sokoId: s.sokoId ?? s.id,
    kind,
    tier,
    demo: true,
    createdAt: ago(400),
    updatedAt: ago(s.updatedDaysAgo),
    verification: s.status === 'verified' ? { status: 'verified', licenseFile: 'trade-license.pdf', submittedAt: ago(40), reviewedAt: s.lastVerified ?? ago(30) } : { status: 'not_submitted' },
    profile: {
      legalName: d?.legal ?? s.name,
      tradingName: s.name,
      types: [...s.types],
      descriptor: s.descriptor,
      licenseNo: d?.licenseNo ?? '',
      issuingAuthority: d?.authority ?? '',
      licenseExpiry: s.tradeLicense.expiry ?? '',
      country: s.country,
      emirate: s.headquarters,
      address: d?.address ?? '',
      website: s.website ?? '',
      generalEmail: s.generalEmail ?? '',
      phone: d?.phone ?? '',
      established: s.established,
      description: s.description,
      categories: [...s.categories],
      subcategories: [...s.subcategories],
      brands: [...s.brands],
      capabilities: [...s.capabilities],
      regionsServed: [...s.regionsServed],
      marketsServed: s.marketsServed ? [...s.marketsServed] : ['UAE'],
      contacts: s.contacts.map((c) => ({ ...c })),
      certifications: s.certifications.map((c) => ({ ...c })),
      logoTone: s.logoTone,
    },
  };
};

const gecCompany = (): CompanyRecord => ({
  id: 'con_gec_dubai',
  sokoId: 'SK-10601',
  kind: 'contractor',
  tier: 'premium',
  demo: true,
  createdAt: ago(500),
  updatedAt: ago(2),
  verification: { status: 'verified', licenseFile: 'gec-trade-license.pdf', submittedAt: ago(450), reviewedAt: ago(440) },
  profile: {
    legalName: 'GEC Dubai Contracting LLC',
    tradingName: 'GEC Dubai',
    types: ['Contractor', 'Developer'],
    licenseNo: 'DED-998877',
    issuingAuthority: 'Dubai Department of Economy & Tourism',
    licenseExpiry: '2027-06-30',
    country: 'United Arab Emirates',
    emirate: 'Dubai',
    address: 'GEC Dubai Head Office, Al Barsha 1, Dubai',
    website: 'https://gec-dubai.ae',
    generalEmail: 'info@gec-dubai.ae',
    phone: '+971 4 390 8421',
    established: 1998,
    description: 'GEC Dubai is a leading general contracting and development company specializing in residential, commercial and infrastructure projects across the UAE.',
    categories: ['Structural & Civil', 'MEP', 'Finishes'],
    subcategories: ['Concrete Works', 'Structural Steel', 'MEP Installation', 'Waterproofing'],
    brands: [],
    capabilities: ['Turnkey Construction', 'Design-Build', 'Project Management', 'MEP Installation'],
    regionsServed: ['Dubai', 'Abu Dhabi', 'Sharjah'],
    marketsServed: ['UAE'],
    contacts: [],
    certifications: [{ name: 'ISO 9001 Quality Management', issuer: 'Bureau Veritas', status: 'active' as const }, { name: 'ISO 45001 OH&S', issuer: 'Bureau Veritas', status: 'active' as const }],
    logoTone: 'bg-slate-800',
  },
});

const SPECS: Record<string, { label: string; value: string }[]> = {
  'Reinforcement Steel': [
    { label: 'Grade', value: 'B500B to BS 4449:2005' },
    { label: 'Diameters', value: '8 – 40 mm' },
    { label: 'Lengths', value: '12 m standard, cut lengths on request' },
    { label: 'Yield strength', value: '≥ 500 MPa' },
    { label: 'Certification', value: 'CARES approved' },
  ],
  'Structural Steel': [
    { label: 'Standard', value: 'EN 10025 S275JR / S355JR' },
    { label: 'Sizes', value: 'HEA/HEB 100 – 600' },
    { label: 'Length', value: '12 m and 15 m' },
    { label: 'Finish', value: 'Mill finish, shot-blast option' },
  ],
  'Waterproofing Membrane': [
    { label: 'Thickness', value: '1.2 mm' },
    { label: 'Roll size', value: '2 m × 20 m' },
    { label: 'Application', value: 'Pre-applied, below-grade' },
  ],
};

const fallbackSpecs = (type: string) => SPECS[type] ?? [
  { label: 'Product type', value: type },
  { label: 'Packaging', value: 'Standard trade packaging' },
];

const productsFor = (s: BuyerSupplier, premium: boolean): CompanyProduct[] =>
  s.products.map((p, i) => ({
    id: p.id,
    companyId: s.id,
    name: p.name,
    type: p.type,
    category: p.category,
    subcategory: s.subcategories.find((x) => p.type.toLowerCase().includes(x.toLowerCase().split(' ')[0])) ?? s.subcategories[0] ?? '',
    brand: p.brand,
    description: `${p.name} by ${p.brand}. ${p.type} supplied for UAE construction projects with stock held locally.`,
    specs: premium ? fallbackSpecs(p.type) : fallbackSpecs(p.type).slice(0, 3),
    regions: s.regionsServed.slice(0, premium ? 4 : 2),
    images: premium && i < 6 ? [p.imageUrl, IMG.equipment, IMG.concrete] : [p.imageUrl],
    variations: premium && p.type === 'Reinforcement Steel' ? ['10 mm', '12 mm', '16 mm', '20 mm', '25 mm', '32 mm'] : premium && p.type === 'Structural Steel' ? ['HEA 200', 'HEB 300', 'HEB 400'] : [],
    attachments: premium
      ? [
          ...(p.technicalDatasheet ? [{ name: `${p.name} – Technical Datasheet.pdf`, kind: 'Datasheet' as const }] : []),
          ...(p.certifications ? [{ name: `${p.name} – Product Certificate.pdf`, kind: 'Certificate' as const }] : []),
          ...(i < 4 ? [{ name: `${p.name} – Brochure.pdf`, kind: 'Brochure' as const }] : []),
        ]
      : [],
    collection: premium ? (p.type.includes('Wire') ? 'Wire Rod' : p.type.includes('Structural') || p.type.includes('Foundation') ? 'Structural & Foundation' : p.type.includes('Semi') ? 'Semi-Finished' : 'Reinforcement') : '',
    status: i === s.products.length - 1 && !premium ? 'draft' : 'active',
    views: Math.max(12, 260 - i * 17 + (premium ? 140 : 0)),
    enquiries: Math.max(0, 14 - i),
    intelligenceScore: p.intelligenceScore,
    updatedAt: ago(2 + i * 3),
  }));

const member = (companyId: string, id: string, name: string, email: string, title: string, role: CompanyMembership['role'], status: CompanyMembership['status'] = 'active', daysAgo = 120, note?: string): CompanyMembership => ({
  id: `mem_${companyId}_${id}`,
  companyId,
  userId: id,
  name,
  email,
  title,
  role,
  status,
  at: ago(daysAgo),
  note,
});

const doc = (companyId: string, id: string, name: string, category: DocumentCategory, sizeMb: number, uploadedDaysAgo: number, extra: Partial<CompanyDocument> = {}): CompanyDocument => ({
  id: `doc_${companyId}_${id}`,
  companyId,
  name,
  category,
  fileName: `${name.replace(/[^\w]+/g, '-').replace(/-+$/, '')}.pdf`,
  sizeMb,
  uploadedAt: ago(uploadedDaysAgo),
  uploadedBy: 'Khalid Al Mansoori',
  reminderDays: 30,
  access: 'team',
  archived: false,
  forVerification: false,
  visibility: 'private' as DocumentVisibility,
  shares: [],
  versions: [{ version: 1, fileName: `${name.replace(/[^\w]+/g, '-')}.pdf`, at: ago(uploadedDaysAgo), by: 'Khalid Al Mansoori' }],
  ...extra,
});

const ES = 'sup_emirates_steel';
const ABC = 'sup_abc_waterproofing';
const GEC = 'con_gec_dubai';

const contact = (companyId: string, id: string, kind: CompanyContact['kind'], name: string, title: string, company: string, category: string, emirate: string, daysAgo: number, extra: Partial<CompanyContact> = {}): CompanyContact => ({
  id: `cc_${companyId}_${id}`,
  companyId,
  kind,
  name,
  title,
  company,
  category,
  emirate,
  consentToShare: kind === 'connection',
  at: ago(daysAgo),
  ...extra,
});

const visit = (companyId: string, id: string, days: number, time: string, representative: string, hostCompany: string, hostContact: string, location: string, purpose: SupplierVisit['purpose'], productsDiscussed: string[], status: SupplierVisit['status'], kioskBadge: string | undefined, hostCompanyId: string | undefined, createdByName: string, createdById: string, remarks?: string): SupplierVisit => ({
  id: `vst_${companyId === ES ? 'es' : companyId === ABC ? 'abc' : 'gec'}_${id}`,
  companyId,
  hostCompanyId,
  date: ahead(days),
  time,
  representative,
  hostCompany,
  hostContact,
  location,
  purpose,
  productsDiscussed,
  status,
  visitType: kioskBadge ? 'walk-in' : 'scheduled',
  kioskBadge,
  checkInAt: status === 'completed' || status === 'checked-in' || status === 'in-meeting' ? ahead(days) + 'T' + time.replace(/\s/g, '') : undefined,
  checkOutAt: status === 'completed' ? ahead(days) + 'T15:00:00' : undefined,
  createdById,
  createdByName,
  remarks,
});

const audit = (companyId: string, n: number, actor: string, action: string, kind: AuditEntry['kind']): AuditEntry => ({ id: `aud_${companyId}_${n}`, companyId, at: ago(n), actor, action, kind });

export const buildSupplierDemo = (directory: BuyerSupplier[]): SupplierStore => {
  const abc = directory.find((s) => s.id === ABC)!;
  const es = directory.find((s) => s.id === ES)!;
  const gec = gecCompany();
  return {
    version: SUPPLIER_STORE_VERSION,
    previewRole: {},
    companies: [companyFromDirectory(abc, 'free'), companyFromDirectory(es, 'premium'), gec],
    memberships: [
      // ABC Waterproofing — Ahmed Khan is admin
      member(ABC, 'usr_ahmed_khan', 'Ahmed Khan', 'a.khan@abcwaterproofing.ae', 'Commercial Manager', 'supplier_admin', 'active', 180),
      member(ABC, 'usr_sarah_thomas_abc', 'Sarah Thomas', 's.thomas@abcwaterproofing.ae', 'Technical Sales Engineer', 'technical_manager', 'active', 150),
      member(ABC, 'usr_omar_abc', 'Omar Haddad', 'o.haddad@abcwaterproofing.ae', 'Sales Representative', 'sales_rep', 'active', 60),
      // ABC Free tier: 3 seats — 3 active members, no invited (was 4/3 oversubscribed)
      // Emirates Steel — Sarah Thomas is admin
      member(ES, 'usr_sarah_thomas_es', 'Sarah Thomas', 's.thomas@emiratessteel.example', 'Sales Manager', 'supplier_admin', 'active', 420),
      member(ES, 'usr_khalid', 'Khalid Al Mansoori', 'k.mansoori@emiratessteel.example', 'Key Accounts Director', 'sales_manager', 'active', 600),
      member(ES, 'usr_priya', 'Priya Menon', 'p.menon@emiratessteel.example', 'Technical Services Engineer', 'technical_manager', 'active', 380),
      member(ES, 'usr_omar_es', 'Omar Haddad', 'o.haddad@emiratessteel.example', 'Sales Representative', 'sales_rep', 'active', 90),
      member(ES, 'usr_lina', 'Lina Farouk', 'l.farouk@emiratessteel.example', 'Sales Representative', 'sales_rep', 'active', 60),
      member(ES, 'inv_nadia', 'Nadia Joseph', 'n.joseph@emiratessteel.example', 'Commercial Analyst', 'viewer', 'invited', 2),
      member(ES, 'req_faisal', 'Faisal Rahman', 'faisal.rahman@gmail.com', 'Area Sales Executive', 'sales_rep', 'pending_approval', 1, 'Requested access from the SOKO company search. Uses a personal email domain.'),
      // GEC Dubai — Mohamed Sadiq is procurement_manager (approved membership)
      member(GEC, 'usr_me_01', 'Mohamed Sadiq', 'mohamed.sadiq@gec-dubai.ae', 'Procurement Manager / Authorized Buyer', 'contractor_admin', 'active', 200),
      member(GEC, 'usr_hassan_q', 'Hassan Qureshi', 'h.qureshi@gec-dubai.ae', 'Project Engineer', 'procurement_officer', 'active', 150),
      member(GEC, 'usr_fatima_n', 'Fatima Nasser', 'f.nasser@gec-dubai.ae', 'Technical Reviewer', 'technical_reviewer', 'active', 100),
    ],
    products: [...productsFor(abc, false), ...productsFor(es, true)],
    documents: [
      doc(ABC, 'license', 'Trade License 2025-2027', 'Trade Licenses', 1.2, 60, { expiry: abc.tradeLicense.expiry, forVerification: true, access: 'admins', uploadedBy: 'Ahmed Khan', visibility: 'private' as DocumentVisibility }),
      doc(ABC, 'datasheet_mapeproof', 'Mapelastic Cementitious Coating – Technical Datasheet', 'Technical Datasheets', 1.8, 8, { uploadedBy: 'Ahmed Khan', visibility: 'shared' as DocumentVisibility, shares: [{ id: 'sh_abc_gec_1', company: 'GEC Dubai', at: ago(8), until: ahead(22), by: 'Ahmed Khan' }] }),
      doc(ABC, 'icv_cert', 'ICV Certificate 2026', 'Company Registrations', 0.5, 3, { uploadedBy: 'Ahmed Khan', visibility: 'shared' as DocumentVisibility, shares: [{ id: 'sh_abc_gec_2', company: 'GEC Dubai', at: ago(3), until: ahead(27), by: 'Ahmed Khan' }] }),
      doc(ABC, 'company_brochure', 'ABC Waterproofing Company Profile', 'Company Brochures', 4.2, 12, { uploadedBy: 'Ahmed Khan', visibility: 'public' as DocumentVisibility }),
      doc(ES, 'license', 'Trade License', 'Trade Licenses', 1.4, 300, {
        expiry: '2026-12-12',
        access: 'admins',
        forVerification: true,
        versions: [
          { version: 1, fileName: 'Trade-License-2024.pdf', at: ago(700), by: 'Khalid Al Mansoori' },
          { version: 2, fileName: 'Trade-License-2025.pdf', at: ago(300), by: 'Khalid Al Mansoori' },
        ],
      }),
      doc(ES, 'vat', 'VAT Registration Certificate', 'VAT / Tax Certificates', 0.6, 410, { access: 'admins' }),
      doc(ES, 'moa', 'Memorandum of Association', 'Company Registrations', 3.8, 900, { access: 'admins' }),
      doc(ES, 'iso9001', 'ISO 9001 Quality Management Certificate', 'ISO Certifications', 0.9, 220, { expiry: '2027-03-12' }),
      doc(ES, 'iso14001', 'ISO 14001 Environmental Certificate', 'ISO Certifications', 0.8, 220, { expiry: '2027-06-20' }),
      doc(ES, 'iso45001', 'ISO 45001 OH&S Certificate', 'ISO Certifications', 0.8, 220, { expiry: ahead(21) }),
      doc(ES, 'cares', 'CARES Product Certificate – B500B', 'Product Certifications', 1.1, 160, { expiry: '2027-02-28', access: 'technical', uploadedBy: 'Priya Menon' }),
      doc(ES, 'dcl', 'Dubai Central Laboratory Conformity – Rebar', 'Product Certifications', 1.6, 340, { expiry: ahead(-6), access: 'technical', uploadedBy: 'Priya Menon' }),
      doc(ES, 'tds_b500b', 'B500B Rebar Technical Datasheet', 'Technical Datasheets', 2.3, 40, { access: 'team', uploadedBy: 'Priya Menon', shares: [{ id: 'sh_1', company: 'Apex Industrial Mechanical GC', at: ago(6), until: ahead(24), by: 'Sarah Thomas' }] }),
      doc(ES, 'tds_heavy', 'Heavy Sections Technical Datasheet', 'Technical Datasheets', 2.9, 70, { uploadedBy: 'Priya Menon' }),
      doc(ES, 'msds', 'Steel Products Safety Datasheet', 'Material Safety Datasheets', 0.7, 120, { uploadedBy: 'Priya Menon' }),
      doc(ES, 'tensile', 'Tensile Test Report – Heat 24-1187', 'Test Reports', 4.6, 12, { access: 'technical', uploadedBy: 'Priya Menon' }),
      doc(ES, 'fatigue', 'Fatigue Test Report – B500C', 'Test Reports', 5.2, 35, { access: 'technical', uploadedBy: 'Priya Menon' }),
      doc(ES, 'auth_dist', 'Authorized Distributor Letter – Northern Emirates', 'Manufacturer Authorizations', 0.4, 90, { expiry: ahead(48) }),
      doc(ES, 'brochure', 'Company Brochure 2026', 'Company Brochures', 18.5, 25, { uploadedBy: 'Sarah Thomas', shares: [{ id: 'sh_2', company: 'Meridian Developments', at: ago(3), until: ahead(27), by: 'Sarah Thomas' }] }),
      doc(ES, 'pq', 'Prequalification Pack – Infrastructure', 'Prequalification Documents', 26.4, 18, { uploadedBy: 'Sarah Thomas' }),
      doc(ES, 'insurance', 'Product Liability Insurance', 'Other Company Documents', 1.0, 200, { expiry: ahead(14), access: 'admins' }),
      doc(ES, 'old_brochure', 'Company Brochure 2024', 'Company Brochures', 14.2, 520, { archived: true, uploadedBy: 'Sarah Thomas' }),
    ],
    contacts: [
      contact(ABC, 'c1', 'connection', 'Mohammed Ali', 'Procurement Manager', 'Al Habtoor Contracting', 'Waterproofing', 'Dubai', 20, { email: 'm.ali@habtoor.example', phone: '+971 50 214 7788' }),
      contact(ABC, 'c2', 'connection', 'Grace Wong', 'Senior QS', 'Meridian Developments', 'Construction Chemicals', 'Dubai', 44, { email: 'g.wong@meridian.example' }),
      contact(ABC, 's1', 'saved', 'Hassan Qureshi', 'Project Engineer', 'GEC Dubai', 'Waterproofing', 'Dubai', 9),
      contact(ABC, 'i1', 'incoming', 'Ravi Shankar', 'Purchasing Officer', 'Arabian Builders LLC', 'Waterproofing', 'Sharjah', 1, { message: 'Looking for a podium waterproofing supplier for a G+12 project in Al Nahda.' }),
      contact(ES, 'c1', 'connection', 'Sarah Jenkins', 'Head of Procurement', 'Apex Industrial Mechanical GC', 'Steel & Rebar', 'Dubai', 30, { email: 'sarah.jenkins@apexgc.example', phone: '+971 55 902 4411' }),
      contact(ES, 'c2', 'connection', 'Mohammed Ali', 'Procurement Manager', 'Al Habtoor Contracting', 'Steel & Rebar', 'Dubai', 80, { email: 'm.ali@habtoor.example' }),
      contact(ES, 'c3', 'connection', 'Faris Al Nuaimi', 'Package Manager', 'ALEC Engineering', 'Steel & Rebar', 'Abu Dhabi', 12, { email: 'f.nuaimi@alec.example', phone: '+971 50 330 9081' }),
      contact(ES, 'c4', 'connection', 'Anita Desai', 'Commercial Director', 'Meridian Developments', 'Steel & Rebar', 'Dubai', 140, { consentToShare: false }),
      contact(ES, 's1', 'saved', 'Yousef Karim', 'Procurement Lead', 'Ras Al Khaimah Infrastructure', 'Steel & Rebar', 'Ras Al Khaimah', 15),
      contact(ES, 's2', 'saved', 'Elif Demir', 'Planning Manager', 'Bayan Towers Contracting', 'Steel & Rebar', 'Abu Dhabi', 22),
      contact(ES, 'i1', 'incoming', 'Tariq Hussain', 'Buyer', 'Al Ain Civil Works', 'Steel & Rebar', 'Abu Dhabi', 1, { message: 'We need 600 t of B500B for a bridge package in Q1 – please connect.' }),
      contact(ES, 'i2', 'incoming', 'Meera Pillai', 'Procurement Executive', 'Sahel Contracting', 'Steel & Rebar', 'Dubai', 2, { message: 'Interested in cut & bend capacity for a villa cluster.' }),
    ],
    visits: [
      visit(ES, '1', -3, '10:00 AM', 'Sarah Thomas', 'Apex Industrial Mechanical GC', 'Sarah Jenkins', 'Apex GC Head Office, Dubai', 'Commercial Review', ['B500B Rebar', 'Cut & Bend Service'], 'completed', 'SK-KIOSK-8231', undefined, 'Sarah Thomas', 'usr_sarah_thomas_es'),
      visit(ES, '2', -9, '02:30 PM', 'Omar Haddad', 'ALEC Engineering', 'Faris Al Nuaimi', 'ALEC Site Office, Abu Dhabi', 'Sample Demonstration', ['Heavy Sections HEB'], 'completed', 'SK-KIOSK-8170', undefined, 'Omar Haddad', 'usr_omar_es'),
      visit(ES, '3', 0, '11:30 AM', 'Lina Farouk', 'Meridian Developments', 'Anita Desai', 'Meridian Tower, Business Bay', 'RFQ Discussion', ['B500B Rebar', 'Wire Rod'], 'in-meeting', 'SK-KIOSK-8302', undefined, 'Lina Farouk', 'usr_lina'),
      visit(ES, '4', 4, '09:00 AM', 'Sarah Thomas', 'Al Habtoor Contracting', 'Mohammed Ali', 'Al Habtoor HQ, Dubai', 'Contract Negotiation', ['B500B Rebar'], 'scheduled', undefined, undefined, 'Sarah Thomas', 'usr_sarah_thomas_es', 'Discuss annual rebar supply terms and volume discounts.'),
      visit(ABC, '1', -5, '10:30 AM', 'Ahmed Khan', 'Al Habtoor Contracting', 'Mohammed Ali', 'Al Habtoor HQ, Dubai', 'Sample Demonstration', ['SikaProof A+', 'Sika WT-200 P'], 'completed', 'SK-KIOSK-8199', undefined, 'Ahmed Khan', 'usr_ahmed_khan'),
      // ABC visits GEC Dubai — shared visit record; both sides can see it
      visit(ABC, '2', 3, '01:00 PM', 'Ahmed Khan', 'GEC Dubai', 'Hassan Qureshi', 'GEC Dubai Office, Al Barsha', 'Vendor Onboarding', ['Mapelastic Cementitious Coating'], 'scheduled', undefined, GEC, 'Ahmed Khan', 'usr_ahmed_khan', 'Initial vendor onboarding meeting with GEC procurement team.'),
    ],
    followUps: [
      { id: 'fu_es_1', visitId: 'vst_es_1', companyId: ES, side: 'supplier', note: 'Send revised price list for 16–25 mm and CARES certificate. Follow up Thursday.', at: ago(2), by: 'Sarah Thomas', byId: 'usr_sarah_thomas_es' } as VisitFollowUp,
      { id: 'fu_abc_1', visitId: 'vst_abc_2', companyId: ABC, side: 'supplier', note: 'Prepare ICV certificate and project references for GEC vendor onboarding meeting.', at: ago(1), by: 'Ahmed Khan', byId: 'usr_ahmed_khan' } as VisitFollowUp,
      // Contractor-side note for the same GEC Dubai visit — private to GEC, not visible to ABC
      { id: 'fu_gec_1', visitId: 'vst_abc_2', companyId: GEC, side: 'contractor', note: 'Request ICV certificate and 3 project references before approving as an approved vendor.', at: ago(1), by: 'Mohamed Sadiq', byId: 'usr_me_01' } as VisitFollowUp,
    ],
    visitTasks: [
      { id: 'tsk_es_1', visitId: 'vst_es_1', companyId: ES, side: 'supplier', description: 'Send revised price list for 16-25mm rebar', assignedTo: 'Sarah Thomas', dueDate: ahead(2), priority: 'high', status: 'pending', createdAt: ago(2), createdBy: 'Sarah Thomas' } as VisitTask,
      { id: 'tsk_es_2', visitId: 'vst_es_4', companyId: ES, side: 'supplier', description: 'Prepare volume discount proposal for Al Habtoor', assignedTo: 'Khalid Al Mansoori', dueDate: ahead(3), priority: 'medium', status: 'pending', createdAt: ago(1), createdBy: 'Sarah Thomas' } as VisitTask,
    ],
    vendorRecords: [
      { id: 'vnd_gec_1', companyId: GEC, supplierCompanyId: ABC, supplierName: 'ABC Waterproofing LLC', tradeCategory: 'Waterproofing', location: 'Dubai', sokoVerified: true, approvalStatus: 'under-review', contactPerson: 'Ahmed Khan', contactEmail: 'a.khan@abcwaterproofing.ae', contactPhone: '+971 50 214 7788', lastVisitDate: ahead(3), addedAt: ago(15), addedBy: 'Mohamed Sadiq', external: false, notes: [
        { id: 'vn_1', vendorId: 'vnd_gec_1', companyId: GEC, note: 'Initial review in progress. Requested ICV certificate and 3 project references.', at: ago(10), by: 'Mohamed Sadiq', byId: 'usr_me_01' } as VendorNote,
      ] } as VendorRecord,
      { id: 'vnd_gec_2', companyId: GEC, supplierCompanyId: ES, supplierName: 'Emirates Steel Industries', tradeCategory: 'Steel & Rebar', location: 'Abu Dhabi', sokoVerified: true, approvalStatus: 'approved', contactPerson: 'Sarah Thomas', contactEmail: 's.thomas@emiratessteel.example', contactPhone: '+971 55 902 4411', lastVisitDate: ahead(-3), addedAt: ago(120), addedBy: 'Mohamed Sadiq', external: false, notes: [
        { id: 'vn_2', vendorId: 'vnd_gec_2', companyId: GEC, note: 'Approved vendor for structural steel and rebar. Annual contract review due Q1 2027.', at: ago(90), by: 'Mohamed Sadiq', byId: 'usr_me_01' } as VendorNote,
      ] } as VendorRecord,
      { id: 'vnd_gec_3', companyId: GEC, supplierName: 'Al Falaj Ready Mix', tradeCategory: 'Concrete & Ready Mix', location: 'Sharjah', sokoVerified: false, approvalStatus: 'not-reviewed', contactPerson: 'Saeed Al Falaj', contactPhone: '+971 6 555 1234', addedAt: ago(5), addedBy: 'Hassan Qureshi', external: true, notes: [] } as VendorRecord,
      { id: 'vnd_gec_4', companyId: GEC, supplierName: 'Meridian Fire Doors LLC', tradeCategory: 'Fire Protection', location: 'Dubai', sokoVerified: false, approvalStatus: 'conditionally-approved', contactPerson: 'Grace Wong', contactEmail: 'g.wong@meridianfd.ae', addedAt: ago(30), addedBy: 'Mohamed Sadiq', external: true, notes: [
        { id: 'vn_3', vendorId: 'vnd_gec_4', companyId: GEC, note: 'Conditionally approved pending UL certification submission.', at: ago(28), by: 'Mohamed Sadiq', byId: 'usr_me_01' } as VendorNote,
      ] } as VendorRecord,
    ],
    audit: [
      audit(ES, 1, 'Priya Menon', 'Uploaded "Tensile Test Report – Heat 24-1187"', 'document'),
      audit(ES, 2, 'Sarah Thomas', 'Shared "Company Brochure 2026" with Meridian Developments', 'document'),
      audit(ES, 4, 'Khalid Al Mansoori', 'Invited Nadia Joseph as Viewer', 'team'),
      audit(ES, 6, 'Priya Menon', 'Updated specifications for B500B Rebar', 'product'),
      audit(ABC, 3, 'Ahmed Khan', 'Updated company description', 'profile'),
      audit(ABC, 5, 'Sarah Thomas', 'Added product "Mapeband Easy" as draft', 'product'),
      audit(GEC, 1, 'Mohamed Sadiq', 'Added vendor "ABC Waterproofing LLC" to vendor register', 'contact'),
      audit(GEC, 2, 'Mohamed Sadiq', 'Updated "Emirates Steel Industries" vendor approval to Approved', 'contact'),
    ],
  };
};
