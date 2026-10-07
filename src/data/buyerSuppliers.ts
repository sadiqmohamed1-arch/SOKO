export type SupplierStatus = 'verified' | 'pending' | 'listed' | 'update-required';

export type SupplierType =
  | 'Manufacturer'
  | 'Distributor'
  | 'Authorized Dealer'
  | 'Trader'
  | 'Subcontractor'
  | 'Service Provider';

export const SUPPLIER_TYPES: SupplierType[] = [
  'Manufacturer',
  'Distributor',
  'Authorized Dealer',
  'Trader',
  'Subcontractor',
  'Service Provider',
];

export const STATUS_META: Record<SupplierStatus, { label: string; description: string }> = {
  verified: {
    label: 'SOKO Verified',
    description: "Required information has been reviewed according to SOKO's verification process.",
  },
  pending: {
    label: 'Verification Pending',
    description: 'The supplier has submitted information and SOKO verification is in progress.',
  },
  listed: {
    label: 'SOKO Listed',
    description: 'This supplier exists on SOKO but has not yet completed SOKO verification.',
  },
  'update-required': {
    label: 'Update Required',
    description: 'Important verification information has expired or requires an update.',
  },
};

export const STATUS_ORDER: SupplierStatus[] = ['verified', 'pending', 'update-required', 'listed'];

export interface SupplierProduct {
  id: string;
  name: string;
  type: string;
  category: string;
  brand: string;
  technicalDatasheet: boolean;
  certifications: boolean;
  intelligenceScore?: number;
  imageUrl: string;
}

export type ContactVisibility = 'public' | 'network' | 'on-request';

export interface SupplierContact {
  id: string;
  name: string;
  title: string;
  category: string;
  location: string;
  phone?: string;
  email?: string;
  visibility: ContactVisibility;
}

export interface SupplierCertification {
  name: string;
  issuer: string;
  status: 'active' | 'expired' | 'pending';
  validUntil?: string;
}

export type DocumentAccess = 'public' | 'status-only';

export interface SupplierDocumentGroup {
  label: string;
  count: number;
  access: DocumentAccess;
}

export interface BuyerSupplier {
  id: string;
  name: string;
  logoTone: string;
  status: SupplierStatus;
  types: SupplierType[];
  descriptor?: string;
  categories: string[];
  subcategories: string[];
  capabilities: string[];
  brands: string[];
  countryCode: string;
  country: string;
  headquarters: string;
  regionsServed: string[];
  marketsServed?: string[];
  description: string;
  established?: number;
  website?: string;
  generalEmail?: string;
  tradeLicense: { status: 'verified' | 'pending' | 'expired' | 'not-submitted'; expiry?: string };
  companyInfoVerified: boolean;
  documentationPct: number;
  profileCompletenessPct: number;
  certifications: SupplierCertification[];
  technicalDocuments: SupplierDocumentGroup[];
  products: SupplierProduct[];
  contacts: SupplierContact[];
  intelligenceScore: number;
  networkActivity: 'Active' | 'Moderate' | 'Low';
  lastVerified?: string;
  updatedDaysAgo: number;
  externalSourceFields?: string[];
}

const IMG = {
  waterproofing: 'https://images.pexels.com/photos/31762405/pexels-photo-31762405.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  membrane: 'https://images.pexels.com/photos/39238328/pexels-photo-39238328.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  rebar: 'https://images.pexels.com/photos/46167/iron-rods-reinforcing-bars-rods-steel-bars-46167.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  concrete: 'https://images.pexels.com/photos/10068081/pexels-photo-10068081.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  mep: 'https://images.pexels.com/photos/32032996/pexels-photo-32032996.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  facade: 'https://images.pexels.com/photos/37320179/pexels-photo-37320179.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  equipment: 'https://images.pexels.com/photos/37393680/pexels-photo-37393680.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  doors: 'https://images.pexels.com/photos/7587822/pexels-photo-7587822.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  tiles: 'https://images.pexels.com/photos/7566201/pexels-photo-7566201.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  precast: 'https://images.pexels.com/photos/18448817/pexels-photo-18448817.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  chemicals: 'https://images.pexels.com/photos/5691680/pexels-photo-5691680.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
};

const p = (
  id: string,
  name: string,
  type: string,
  category: string,
  brand: string,
  imageUrl: string,
  technicalDatasheet = true,
  certifications = true,
  intelligenceScore?: number
): SupplierProduct => ({ id, name, type, category, brand, imageUrl, technicalDatasheet, certifications, intelligenceScore });

const iso = (name: string, validUntil: string): SupplierCertification => ({
  name,
  issuer: 'Accredited certification body',
  status: 'active',
  validUntil,
});

const docs = (tds: number, sds: number, certs: number, approvals: number, tests: number): SupplierDocumentGroup[] => [
  { label: 'Product Datasheets', count: tds, access: 'public' },
  { label: 'Safety Datasheets', count: sds, access: 'public' },
  { label: 'Product Certifications', count: certs, access: 'public' },
  { label: 'Technical Approvals', count: approvals, access: 'status-only' },
  { label: 'Test Reports', count: tests, access: 'status-only' },
];

const UAE = { countryCode: 'AE', country: 'United Arab Emirates' };

export const BUYER_SUPPLIERS: BuyerSupplier[] = [
  {
    id: 'sup_abc_waterproofing',
    name: 'ABC Waterproofing LLC',
    logoTone: 'bg-blue-900',
    status: 'verified',
    types: ['Distributor'],
    descriptor: 'Specialist Supplier',
    categories: ['Waterproofing', 'Construction Chemicals'],
    subcategories: ['Membranes', 'Injection Systems', 'Joint Sealants', 'Concrete Repair'],
    capabilities: ['Waterproofing Systems', 'Construction Chemicals', 'Concrete Repair', 'Joint Sealants', 'Injection Systems'],
    brands: ['Sika', 'Mapei', 'Fosroc'],
    ...UAE,
    headquarters: 'Dubai',
    regionsServed: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'],
    description:
      'Supplier of waterproofing systems, construction chemicals and specialist building materials serving projects across the UAE.',
    established: 2009,
    website: 'abcwaterproofing.ae',
    generalEmail: 'info@abcwaterproofing.ae',
    tradeLicense: { status: 'verified', expiry: '2027-08-18' },
    companyInfoVerified: true,
    documentationPct: 92,
    profileCompletenessPct: 96,
    certifications: [
      iso('ISO 9001:2015', '2027-03-12'),
      iso('ISO 14001:2015', '2027-03-12'),
      iso('ISO 45001:2018', '2027-06-30'),
      { name: 'Dubai Central Laboratory Product Conformity', issuer: 'Dubai Central Laboratory', status: 'active', validUntil: '2026-12-31' },
    ],
    technicalDocuments: docs(28, 24, 11, 6, 9),
    products: [
      p('prd_sikaproof_a_plus', 'SikaProof A+', 'Waterproofing Membrane', 'Waterproofing', 'Sika', IMG.membrane, true, true, 86),
      p('prd_abc_pvc_waterstop', 'PVC Waterstop 250 mm', 'Joint Waterstop', 'Waterproofing', 'Sika', IMG.waterproofing, true, true, 81),
      p('prd_abc_cementitious', 'Mapelastic Cementitious Coating', 'Cementitious Waterproofing', 'Waterproofing', 'Mapei', IMG.waterproofing, true, true, 84),
      p('prd_abc_injection', 'Sika Injection-201 CE', 'PU Injection Resin', 'Waterproofing', 'Sika', IMG.chemicals, true, false, 74),
      p('prd_abc_bitumen', 'Proofex 3000 MR', 'Bituminous Membrane', 'Waterproofing', 'Fosroc', IMG.membrane, true, true, 79),
      p('prd_abc_polyurea', 'Purtop 1000 N', 'Polyurea Membrane', 'Waterproofing', 'Mapei', IMG.waterproofing, true, true, 83),
      p('prd_abc_repair_mortar', 'Renderoc HB40', 'Concrete Repair Mortar', 'Construction Chemicals', 'Fosroc', IMG.chemicals, true, true, 77),
      p('prd_abc_sealant', 'Sikaflex PRO-3', 'Joint Sealant', 'Construction Chemicals', 'Sika', IMG.chemicals, true, true, 80),
      p('prd_abc_admixture', 'Conplast WP421', 'Waterproofing Admixture', 'Construction Chemicals', 'Fosroc', IMG.chemicals, true, false, 71),
      p('prd_abc_primer', 'Primer 3296', 'Membrane Primer', 'Waterproofing', 'Mapei', IMG.chemicals, false, false, 58),
      p('prd_abc_crystalline', 'Sika WT-200 P', 'Crystalline Waterproofing', 'Waterproofing', 'Sika', IMG.waterproofing, true, true, 82),
      p('prd_abc_tape', 'Mapeband Easy', 'Sealing Tape', 'Waterproofing', 'Mapei', IMG.membrane, true, false, 69),
    ],
    contacts: [
      { id: 'ct_ahmed_khan', name: 'Ahmed Khan', title: 'Commercial Manager', category: 'Waterproofing', location: 'Dubai, UAE', phone: '+971501234567', email: 'ahmed.khan@abcwaterproofing.ae', visibility: 'public' },
      { id: 'ct_sarah_thomas', name: 'Sarah Thomas', title: 'Technical Sales Engineer', category: 'Waterproofing', location: 'Dubai, UAE', phone: '+971502345678', email: 'sarah.thomas@abcwaterproofing.ae', visibility: 'public' },
      { id: 'ct_rajesh_nair', name: 'Rajesh Nair', title: 'Projects Coordinator', category: 'Construction Chemicals', location: 'Abu Dhabi, UAE', visibility: 'on-request' },
    ],
    intelligenceScore: 82,
    networkActivity: 'Active',
    lastVerified: '2026-10-05',
    updatedDaysAgo: 5,
  },
  {
    id: 'sup_gulf_cm',
    name: 'Gulf Construction Materials',
    logoTone: 'bg-slate-800',
    status: 'verified',
    types: ['Distributor'],
    categories: ['Waterproofing', 'Finishes'],
    subcategories: ['Membranes', 'Tile Adhesives', 'Grouts'],
    capabilities: ['Foundation Waterproofing', 'Tile Adhesives & Grouts', 'Floor Preparation'],
    brands: ['Mapei', 'Weber'],
    ...UAE,
    headquarters: 'Dubai',
    regionsServed: ['Dubai', 'Sharjah'],
    description: 'Distributor of waterproofing, tiling and floor preparation systems for commercial and residential projects.',
    established: 2012,
    website: 'gulfcm.ae',
    generalEmail: 'sales@gulfcm.ae',
    tradeLicense: { status: 'verified', expiry: '2027-04-02' },
    companyInfoVerified: true,
    documentationPct: 85,
    profileCompletenessPct: 88,
    certifications: [iso('ISO 9001:2015', '2027-01-20'), iso('ISO 14001:2015', '2027-01-20')],
    technicalDocuments: docs(14, 12, 5, 2, 3),
    products: [
      p('prd_mapelastic', 'Mapei Mapelastic Foundation', 'Waterproofing System', 'Waterproofing', 'Mapei', IMG.membrane, true, true, 86),
      p('prd_gcm_keraflex', 'Keraflex Maxi S1', 'Tile Adhesive', 'Finishes', 'Mapei', IMG.tiles, true, true, 78),
      p('prd_gcm_weberfloor', 'weberfloor 4310', 'Self-levelling Screed', 'Finishes', 'Weber', IMG.tiles, true, false, 70),
      p('prd_gcm_ultracolor', 'Ultracolor Plus FA', 'Tile Grout', 'Finishes', 'Mapei', IMG.tiles, true, false, 72),
    ],
    contacts: [
      { id: 'ct_omar_saleh', name: 'Omar Saleh', title: 'Sales Manager', category: 'Finishes', location: 'Dubai, UAE', phone: '+971503456789', email: 'omar.saleh@gulfcm.ae', visibility: 'public' },
    ],
    intelligenceScore: 78,
    networkActivity: 'Active',
    lastVerified: '2026-09-18',
    updatedDaysAgo: 9,
  },
  {
    id: 'sup_emirates_steel',
    name: 'Emirates Steel Industries',
    logoTone: 'bg-slate-700',
    status: 'verified',
    types: ['Manufacturer'],
    categories: ['Steel & Rebar'],
    subcategories: ['Reinforcement Bar', 'Wire Rod', 'Structural Sections'],
    capabilities: ['Reinforcement Steel', 'Wire Rod', 'Structural Sections', 'Rebar in Coil', 'Steel Manufacturing', 'Construction Steel'],
    brands: ['Emirates Steel'],
    ...UAE,
    headquarters: 'Abu Dhabi',
    regionsServed: ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ras Al Khaimah'],
    marketsServed: ['UAE', 'GCC'],
    description:
      'Manufacturer and supplier of reinforcement steel, wire rod and structural steel products serving construction and infrastructure projects across the UAE and regional markets.',
    established: 1998,
    website: 'emiratessteel.example',
    generalEmail: 'sales@emiratessteel.example',
    tradeLicense: { status: 'verified', expiry: '2027-08-18' },
    companyInfoVerified: true,
    documentationPct: 94,
    profileCompletenessPct: 96,
    certifications: [
      iso('ISO 9001', '2027-03-12'),
      iso('ISO 14001', '2027-06-20'),
      iso('ISO 45001', '2027-06-20'),
      { name: 'CARES Product Certification', issuer: 'UK CARES', status: 'active', validUntil: '2027-02-28' },
      { name: 'EPD (Environmental Product Declaration)', issuer: 'International EPD System', status: 'active', validUntil: '2029-07-01' },
    ],
    technicalDocuments: docs(9, 4, 8, 5, 12),
    products: [
      p('prd_es_b500b', 'B500B Rebar', 'Reinforcement Steel', 'Steel & Rebar', 'Emirates Steel', IMG.rebar, true, true, 91),
      p('prd_es_wirerod', 'Low Carbon Wire Rod', 'Steel Wire Rod', 'Steel & Rebar', 'Emirates Steel', IMG.rebar, true, true, 85),
      p('prd_es_heavy', 'Heavy Sections (HEA/HEB)', 'Structural Steel', 'Steel & Rebar', 'Emirates Steel', IMG.rebar, true, true, 88),
      p('prd_es_coil', 'Rebar in Coil 8-16 mm', 'Reinforcement Steel', 'Steel & Rebar', 'Emirates Steel', IMG.rebar, true, true, 84),
      p('prd_es_b500c', 'B500C High Ductility Rebar', 'Reinforcement Steel', 'Steel & Rebar', 'Emirates Steel', IMG.rebar, true, true, 87),
      p('prd_es_ipe', 'IPE Beams', 'Structural Steel', 'Steel & Rebar', 'Emirates Steel', IMG.rebar, true, true, 83),
      p('prd_es_upn', 'UPN Channels', 'Structural Steel', 'Steel & Rebar', 'Emirates Steel', IMG.rebar, true, false, 78),
      p('prd_es_angles', 'Equal Angles', 'Structural Steel', 'Steel & Rebar', 'Emirates Steel', IMG.rebar, true, false, 76),
      p('prd_es_sheet_piles', 'Steel Sheet Piles', 'Foundation Steel', 'Steel & Rebar', 'Emirates Steel', IMG.rebar, true, true, 82),
      p('prd_es_mesh', 'Welded Wire Mesh', 'Reinforcement Steel', 'Steel & Rebar', 'Emirates Steel', IMG.rebar, true, true, 80),
      p('prd_es_highc', 'High Carbon Wire Rod', 'Steel Wire Rod', 'Steel & Rebar', 'Emirates Steel', IMG.rebar, true, false, 74),
      p('prd_es_billets', 'Steel Billets', 'Semi-Finished Steel', 'Steel & Rebar', 'Emirates Steel', IMG.rebar, false, false),
      p('prd_es_blooms', 'Steel Blooms', 'Semi-Finished Steel', 'Steel & Rebar', 'Emirates Steel', IMG.rebar, false, false),
      p('prd_es_epoxy', 'Epoxy Coated Rebar', 'Reinforcement Steel', 'Steel & Rebar', 'Emirates Steel', IMG.rebar, true, true, 81),
      p('prd_es_couplers', 'Rebar Couplers', 'Reinforcement Accessories', 'Steel & Rebar', 'Emirates Steel', IMG.rebar, true, false, 72),
      p('prd_es_cutbend', 'Cut & Bend Rebar Service', 'Fabrication Service', 'Steel & Rebar', 'Emirates Steel', IMG.rebar, false, false),
      p('prd_es_hpiles', 'H-Piles', 'Foundation Steel', 'Steel & Rebar', 'Emirates Steel', IMG.rebar, true, true, 79),
      p('prd_es_rails', 'Crane Rails', 'Structural Steel', 'Steel & Rebar', 'Emirates Steel', IMG.rebar, true, false, 70),
    ],
    contacts: [
      { id: 'ct_ahmed_khan', name: 'Ahmed Khan', title: 'Commercial Manager', category: 'Steel & Rebar', location: 'Abu Dhabi, UAE', phone: '+971501234567', email: 'a.khan@emiratessteel.example', visibility: 'public' },
      { id: 'ct_sarah_thomas', name: 'Sarah Thomas', title: 'Sales Manager', category: 'Steel & Rebar', location: 'Dubai, UAE', phone: '+971552345678', email: 's.thomas@emiratessteel.example', visibility: 'public' },
      { id: 'ct_khalid_mansoori', name: 'Khalid Al Mansoori', title: 'Key Accounts Director', category: 'Steel & Rebar', location: 'Abu Dhabi, UAE', phone: '+971504567890', email: 'k.mansoori@emiratessteel.example', visibility: 'public' },
      { id: 'ct_priya_menon', name: 'Priya Menon', title: 'Technical Services Engineer', category: 'Steel & Rebar', location: 'Abu Dhabi, UAE', email: 'p.menon@emiratessteel.example', visibility: 'network' },
    ],
    intelligenceScore: 91,
    networkActivity: 'Active',
    lastVerified: '2026-10-05',
    updatedDaysAgo: 5,
  },
  {
    id: 'sup_conares',
    name: 'Conares Steel Trading',
    logoTone: 'bg-blue-800',
    status: 'verified',
    types: ['Manufacturer', 'Distributor'],
    categories: ['Steel & Rebar'],
    subcategories: ['Reinforcement Bar', 'Cut & Bend'],
    capabilities: ['Steel Reinforcement', 'Cut & Bend Services', 'Mesh Fabrication'],
    brands: ['Conares'],
    ...UAE,
    headquarters: 'Sharjah',
    regionsServed: ['Sharjah', 'Dubai', 'Ajman', 'Umm Al Quwain'],
    description: 'Rebar producer and processor offering high-yield reinforcement, cut & bend and welded mesh for the Northern Emirates.',
    established: 2005,
    website: 'conares.example',
    generalEmail: 'info@conares.example',
    tradeLicense: { status: 'verified', expiry: '2027-02-15' },
    companyInfoVerified: true,
    documentationPct: 88,
    profileCompletenessPct: 90,
    certifications: [iso('ISO 9001:2015', '2027-03-01'), { name: 'CARES Product Certification', issuer: 'UK CARES', status: 'active', validUntil: '2027-01-10' }, iso('ISO 45001:2018', '2026-12-05')],
    technicalDocuments: docs(5, 2, 4, 3, 6),
    products: [
      p('prd_b500b_rebar', 'B500B High-Yield Rebar (12-32 mm)', 'Reinforcement Steel', 'Steel & Rebar', 'Conares', IMG.rebar, true, true, 91),
      p('prd_conares_mesh', 'Welded Wire Mesh A393', 'Reinforcement Mesh', 'Steel & Rebar', 'Conares', IMG.rebar, true, true, 80),
      p('prd_conares_cutbend', 'Cut & Bend Service', 'Rebar Processing', 'Steel & Rebar', 'Conares', IMG.rebar, false, false, 66),
    ],
    contacts: [
      { id: 'ct_vikram_shah', name: 'Vikram Shah', title: 'Sales Manager', category: 'Steel & Rebar', location: 'Sharjah, UAE', phone: '+971505678901', email: 'vikram.shah@conares.example', visibility: 'public' },
    ],
    intelligenceScore: 84,
    networkActivity: 'Active',
    lastVerified: '2026-10-04',
    updatedDaysAgo: 3,
  },
  {
    id: 'sup_al_falah_mep',
    name: 'Al Falah MEP Supplies',
    logoTone: 'bg-emerald-800',
    status: 'pending',
    types: ['Authorized Dealer'],
    categories: ['MEP'],
    subcategories: ['HVAC', 'Piping', 'Electrical'],
    capabilities: ['Chilled Water Piping', 'VRF Systems', 'Cable Management', 'Pre-insulated Pipes'],
    brands: ['Kingspan', 'Daikin', 'Legrand'],
    ...UAE,
    headquarters: 'Dubai',
    regionsServed: ['Dubai', 'Abu Dhabi'],
    description: 'Authorized dealer of HVAC, piping and electrical containment products for MEP contractors.',
    established: 2014,
    website: 'alfalahmep.example',
    generalEmail: 'sales@alfalahmep.example',
    tradeLicense: { status: 'verified', expiry: '2027-06-20' },
    companyInfoVerified: false,
    documentationPct: 68,
    profileCompletenessPct: 74,
    certifications: [iso('ISO 9001:2015', '2027-09-01'), { name: 'Daikin Authorized Dealer Certificate', issuer: 'Daikin Middle East', status: 'pending' }],
    technicalDocuments: docs(11, 3, 2, 1, 0),
    products: [
      p('prd_preinsulated_pipe', 'Pre-Insulated CHW Pipe System', 'Chilled Water Piping', 'MEP', 'Kingspan', IMG.mep, true, false, 72),
      p('prd_alf_vrf', 'Daikin VRV 5 Indoor Units', 'VRF Indoor Unit', 'MEP', 'Daikin', IMG.mep, true, true, 76),
      p('prd_alf_tray', 'Fire-rated Cable Tray', 'Cable Management', 'MEP', 'Legrand', IMG.mep, true, false, 64),
    ],
    contacts: [
      { id: 'ct_fatima_noor', name: 'Fatima Noor', title: 'Business Development Manager', category: 'MEP', location: 'Dubai, UAE', phone: '+971506789012', email: 'fatima@alfalahmep.example', visibility: 'public' },
    ],
    intelligenceScore: 64,
    networkActivity: 'Moderate',
    updatedDaysAgo: 4,
  },
  {
    id: 'sup_al_noor_readymix',
    name: 'Al Noor Ready Mix',
    logoTone: 'bg-stone-700',
    status: 'verified',
    types: ['Manufacturer'],
    categories: ['Ready Mix Concrete'],
    subcategories: ['Structural Concrete', 'Specialty Mixes'],
    capabilities: ['Ready Mix Concrete', 'Self-compacting Concrete', 'Pumping Services', 'Low-carbon Mixes'],
    brands: ['Al Noor'],
    ...UAE,
    headquarters: 'Abu Dhabi',
    regionsServed: ['Abu Dhabi', 'Dubai'],
    description: 'Ready mix concrete producer with batching plants in Abu Dhabi and Dubai, supplying structural and specialty mixes with pumping.',
    established: 2003,
    website: 'alnoorreadymix.example',
    generalEmail: 'orders@alnoorreadymix.example',
    tradeLicense: { status: 'verified', expiry: '2027-07-07' },
    companyInfoVerified: true,
    documentationPct: 86,
    profileCompletenessPct: 89,
    certifications: [iso('ISO 9001:2015', '2027-04-11'), { name: 'ADQCC Plant Certification', issuer: 'Abu Dhabi Quality & Conformity Council', status: 'active', validUntil: '2027-01-31' }, iso('ISO 14001:2015', '2027-04-11')],
    technicalDocuments: docs(8, 2, 3, 4, 10),
    products: [
      p('prd_noor_c40', 'C40/50 Structural Concrete', 'Ready Mix Concrete', 'Ready Mix Concrete', 'Al Noor', IMG.concrete, true, true, 83),
      p('prd_noor_scc', 'Self-compacting Concrete C50', 'Specialty Concrete', 'Ready Mix Concrete', 'Al Noor', IMG.concrete, true, true, 81),
      p('prd_noor_lowcarbon', 'Low-carbon GGBS Mix', 'Sustainable Concrete', 'Ready Mix Concrete', 'Al Noor', IMG.concrete, true, false, 74),
    ],
    contacts: [
      { id: 'ct_hassan_ali', name: 'Hassan Ali', title: 'Sales Engineer', category: 'Ready Mix Concrete', location: 'Abu Dhabi, UAE', phone: '+971507890123', email: 'hassan@alnoorreadymix.example', visibility: 'public' },
    ],
    intelligenceScore: 80,
    networkActivity: 'Active',
    lastVerified: '2026-09-28',
    updatedDaysAgo: 6,
  },
  {
    id: 'sup_desert_rock_precast',
    name: 'Desert Rock Precast',
    logoTone: 'bg-amber-900',
    status: 'update-required',
    types: ['Manufacturer'],
    categories: ['Precast'],
    subcategories: ['Hollow Core Slabs', 'Façade Panels'],
    capabilities: ['Precast Concrete', 'Hollow Core Slabs', 'Precast Boundary Walls'],
    brands: ['Desert Rock'],
    ...UAE,
    headquarters: 'Ras Al Khaimah',
    regionsServed: ['Ras Al Khaimah', 'Sharjah', 'Dubai'],
    description: 'Precast concrete manufacturer producing hollow core slabs, façade panels and boundary wall systems.',
    established: 2010,
    website: 'desertrockprecast.example',
    tradeLicense: { status: 'expired', expiry: '2026-08-31' },
    companyInfoVerified: true,
    documentationPct: 61,
    profileCompletenessPct: 72,
    certifications: [{ name: 'ISO 9001:2015', issuer: 'Accredited certification body', status: 'expired', validUntil: '2026-07-15' }],
    technicalDocuments: docs(4, 1, 1, 0, 2),
    products: [
      p('prd_dr_hollowcore', 'Hollow Core Slab 200 mm', 'Precast Slab', 'Precast', 'Desert Rock', IMG.precast, true, false, 62),
      p('prd_dr_panels', 'Architectural Façade Panel', 'Precast Panel', 'Precast', 'Desert Rock', IMG.precast, false, false, 51),
    ],
    contacts: [
      { id: 'ct_samir_haddad', name: 'Samir Haddad', title: 'General Manager', category: 'Precast', location: 'Ras Al Khaimah, UAE', email: 'samir@desertrockprecast.example', visibility: 'public' },
    ],
    intelligenceScore: 58,
    networkActivity: 'Low',
    lastVerified: '2025-09-02',
    updatedDaysAgo: 41,
  },
  {
    id: 'sup_falcon_fire_doors',
    name: 'Falcon Fire Doors Industries',
    logoTone: 'bg-red-900',
    status: 'verified',
    types: ['Manufacturer'],
    categories: ['Doors'],
    subcategories: ['Fire-rated Doors', 'Steel Doors', 'Door Hardware'],
    capabilities: ['Fire-rated Doors', 'Steel Doorsets', 'Ironmongery Supply', 'Installation Support'],
    brands: ['Falcon', 'ASSA ABLOY', 'dormakaba'],
    ...UAE,
    headquarters: 'Sharjah',
    regionsServed: ['Sharjah', 'Dubai', 'Abu Dhabi', 'Ajman'],
    description: 'Manufacturer of certified fire-rated and steel doorsets with integrated ironmongery for commercial, healthcare and hospitality projects.',
    established: 2007,
    website: 'falconfiredoors.example',
    generalEmail: 'projects@falconfiredoors.example',
    tradeLicense: { status: 'verified', expiry: '2027-05-25' },
    companyInfoVerified: true,
    documentationPct: 95,
    profileCompletenessPct: 94,
    certifications: [
      iso('ISO 9001:2015', '2027-08-08'),
      { name: 'UL 10C Fire Door Listing', issuer: 'UL Solutions', status: 'active', validUntil: '2027-10-01' },
      { name: 'Dubai Civil Defence Product Approval', issuer: 'Dubai Civil Defence', status: 'active', validUntil: '2027-03-20' },
      { name: 'Sharjah Civil Defence Approval', issuer: 'Sharjah Civil Defence', status: 'active', validUntil: '2027-02-14' },
    ],
    technicalDocuments: docs(12, 0, 9, 6, 8),
    products: [
      p('prd_falcon_fd90', '90-min Fire-rated Steel Door', 'Fire-rated Door', 'Doors', 'Falcon', IMG.doors, true, true, 90),
      p('prd_falcon_fd60_timber', '60-min Fire-rated Timber Door', 'Fire-rated Door', 'Doors', 'Falcon', IMG.doors, true, true, 87),
      p('prd_falcon_closer', 'DC340 Door Closer', 'Door Hardware', 'Doors', 'dormakaba', IMG.doors, true, true, 79),
      p('prd_falcon_panic', 'Panic Exit Device', 'Door Hardware', 'Doors', 'ASSA ABLOY', IMG.doors, true, true, 80),
    ],
    contacts: [
      { id: 'ct_nadia_rahman', name: 'Nadia Rahman', title: 'Projects Sales Manager', category: 'Doors', location: 'Sharjah, UAE', phone: '+971508901234', email: 'nadia@falconfiredoors.example', visibility: 'public' },
      { id: 'ct_george_mathew', name: 'George Mathew', title: 'Estimation Engineer', category: 'Doors', location: 'Dubai, UAE', phone: '+971509012345', email: 'george@falconfiredoors.example', visibility: 'network' },
    ],
    intelligenceScore: 87,
    networkActivity: 'Active',
    lastVerified: '2026-09-30',
    updatedDaysAgo: 7,
  },
  {
    id: 'sup_skyline_facade',
    name: 'Skyline Aluminium & Glass',
    logoTone: 'bg-sky-900',
    status: 'pending',
    types: ['Subcontractor'],
    descriptor: 'Façade Specialist',
    categories: ['Façade'],
    subcategories: ['Curtain Wall', 'Aluminium Windows', 'Cladding'],
    capabilities: ['Aluminium Façade', 'Unitised Curtain Wall', 'ACP Cladding', 'Glazing Installation'],
    brands: ['Schüco', 'Technal', 'Guardian Glass'],
    ...UAE,
    headquarters: 'Dubai',
    regionsServed: ['Dubai', 'Abu Dhabi', 'Sharjah'],
    description: 'Design, fabrication and installation of aluminium façade, curtain wall and glazing systems for mid- and high-rise buildings.',
    established: 2011,
    website: 'skylinefacade.example',
    generalEmail: 'tenders@skylinefacade.example',
    tradeLicense: { status: 'pending' },
    companyInfoVerified: false,
    documentationPct: 58,
    profileCompletenessPct: 70,
    certifications: [iso('ISO 9001:2015', '2027-02-02'), { name: 'Schüco Partner Fabricator', issuer: 'Schüco Middle East', status: 'pending' }],
    technicalDocuments: docs(6, 0, 2, 1, 2),
    products: [
      p('prd_sky_unitised', 'Unitised Curtain Wall System', 'Curtain Wall', 'Façade', 'Schüco', IMG.facade, true, false, 66),
      p('prd_sky_window', 'Thermally Broken Aluminium Window', 'Aluminium Window', 'Façade', 'Technal', IMG.facade, true, false, 63),
      p('prd_sky_dgu', 'SunGuard Double Glazed Unit', 'Glazing', 'Façade', 'Guardian Glass', IMG.facade, true, true, 70),
    ],
    contacts: [
      { id: 'ct_li_wei', name: 'Li Wei', title: 'Façade Design Manager', category: 'Façade', location: 'Dubai, UAE', phone: '+971501112233', email: 'li.wei@skylinefacade.example', visibility: 'public' },
    ],
    intelligenceScore: 61,
    networkActivity: 'Moderate',
    updatedDaysAgo: 12,
  },
  {
    id: 'sup_horizon_equipment',
    name: 'Horizon Equipment Rental',
    logoTone: 'bg-yellow-800',
    status: 'verified',
    types: ['Service Provider'],
    categories: ['Equipment'],
    subcategories: ['Cranes', 'Earthmoving', 'Access Equipment'],
    capabilities: ['Equipment Rental', 'Mobile Cranes', 'Earthmoving Equipment', 'Operator Supply'],
    brands: ['Liebherr', 'JCB', 'CAT'],
    ...UAE,
    headquarters: 'Dubai',
    regionsServed: ['Dubai', 'Sharjah', 'Abu Dhabi', 'Ajman'],
    description: 'Construction equipment rental with certified operators: mobile cranes, earthmoving and access equipment.',
    established: 2008,
    website: 'horizonrental.example',
    generalEmail: 'rentals@horizonrental.example',
    tradeLicense: { status: 'verified', expiry: '2027-01-18' },
    companyInfoVerified: true,
    documentationPct: 82,
    profileCompletenessPct: 86,
    certifications: [iso('ISO 45001:2018', '2027-06-01'), { name: 'Third-party Lifting Equipment Inspection', issuer: 'Accredited inspection body', status: 'active', validUntil: '2026-12-15' }],
    technicalDocuments: docs(10, 0, 0, 2, 6),
    products: [
      p('prd_hz_ltm1050', 'Liebherr LTM 1050 Mobile Crane', 'Mobile Crane (50T)', 'Equipment', 'Liebherr', IMG.equipment, true, true, 79),
      p('prd_hz_jcb3cx', 'JCB 3CX Backhoe Loader', 'Backhoe Loader', 'Equipment', 'JCB', IMG.equipment, true, false, 72),
      p('prd_hz_cat320', 'CAT 320 Excavator', 'Excavator', 'Equipment', 'CAT', IMG.equipment, true, false, 74),
    ],
    contacts: [
      { id: 'ct_mark_dsouza', name: "Mark D'Souza", title: 'Rental Desk Manager', category: 'Equipment', location: 'Dubai, UAE', phone: '+971502223344', email: 'mark@horizonrental.example', visibility: 'public' },
    ],
    intelligenceScore: 76,
    networkActivity: 'Active',
    lastVerified: '2026-09-22',
    updatedDaysAgo: 1,
  },
  {
    id: 'sup_coastal_tiles',
    name: 'Coastal Tiles & Finishes Trading',
    logoTone: 'bg-slate-500',
    status: 'listed',
    types: ['Trader'],
    categories: ['Finishes'],
    subcategories: ['Ceramic Tiles', 'Porcelain Tiles'],
    capabilities: ['Ceramic & Porcelain Tiles'],
    brands: [],
    ...UAE,
    headquarters: 'Sharjah',
    regionsServed: ['Sharjah'],
    description: 'Trader of ceramic and porcelain tiles. Information identified from public business listings.',
    tradeLicense: { status: 'not-submitted' },
    companyInfoVerified: false,
    documentationPct: 10,
    profileCompletenessPct: 35,
    certifications: [],
    technicalDocuments: [],
    products: [p('prd_coastal_porcelain', 'Porcelain Floor Tile 60x60', 'Porcelain Tile', 'Finishes', 'Unbranded', IMG.tiles, false, false)],
    contacts: [],
    intelligenceScore: 31,
    networkActivity: 'Low',
    updatedDaysAgo: 120,
    externalSourceFields: ['Company name', 'Location', 'Activity description'],
  },
  {
    id: 'sup_al_mesbah',
    name: 'Al Mesbah Building Chemicals',
    logoTone: 'bg-teal-800',
    status: 'verified',
    types: ['Distributor'],
    categories: ['Construction Chemicals', 'Waterproofing'],
    subcategories: ['Admixtures', 'Membranes', 'Grouts'],
    capabilities: ['Concrete Admixtures', 'Pre-applied Membranes', 'Non-shrink Grouts', 'Flooring Systems'],
    brands: ['Fosroc', 'Henkel'],
    ...UAE,
    headquarters: 'Dubai',
    regionsServed: ['Dubai', 'Abu Dhabi', 'Sharjah'],
    description: 'Distributor of construction chemicals, admixtures and waterproofing membranes with on-site technical support.',
    established: 2001,
    website: 'almesbah.example',
    generalEmail: 'info@almesbah.example',
    tradeLicense: { status: 'verified', expiry: '2027-09-09' },
    companyInfoVerified: true,
    documentationPct: 87,
    profileCompletenessPct: 91,
    certifications: [iso('ISO 9001:2015', '2027-05-05'), iso('ISO 14001:2015', '2027-05-05'), iso('ISO 45001:2018', '2027-05-05')],
    technicalDocuments: docs(22, 20, 7, 3, 5),
    products: [
      p('prd_proofex_engage', 'Fosroc Proofex Engage', 'Pre-applied Waterproofing Membrane', 'Waterproofing', 'Fosroc', IMG.membrane, true, true, 82),
      p('prd_mesbah_conbextra', 'Conbextra GP', 'Non-shrink Grout', 'Construction Chemicals', 'Fosroc', IMG.chemicals, true, true, 80),
      p('prd_mesbah_auracast', 'Auracast 200', 'Superplasticiser Admixture', 'Construction Chemicals', 'Fosroc', IMG.chemicals, true, true, 78),
      p('prd_mesbah_ceresit', 'Ceresit CR 166', 'Flexible Waterproofing Slurry', 'Waterproofing', 'Henkel', IMG.waterproofing, true, false, 73),
    ],
    contacts: [
      { id: 'ct_anil_kumar', name: 'Anil Kumar', title: 'Technical Manager', category: 'Construction Chemicals', location: 'Dubai, UAE', phone: '+971503334455', email: 'anil@almesbah.example', visibility: 'public' },
    ],
    intelligenceScore: 79,
    networkActivity: 'Active',
    lastVerified: '2026-09-25',
    updatedDaysAgo: 8,
  },
  {
    id: 'sup_prime_chem',
    name: 'Prime Chem Industries',
    logoTone: 'bg-slate-500',
    status: 'listed',
    types: ['Manufacturer'],
    categories: ['Construction Chemicals'],
    subcategories: ['Admixtures'],
    capabilities: ['Concrete Admixtures'],
    brands: [],
    ...UAE,
    headquarters: 'Ajman',
    regionsServed: ['Ajman', 'Sharjah'],
    description: 'Local manufacturer of concrete admixtures and curing compounds.',
    tradeLicense: { status: 'not-submitted' },
    companyInfoVerified: false,
    documentationPct: 0,
    profileCompletenessPct: 30,
    certifications: [],
    technicalDocuments: [],
    products: [],
    contacts: [],
    intelligenceScore: 24,
    networkActivity: 'Low',
    updatedDaysAgo: 210,
    externalSourceFields: ['Company name', 'Location', 'Activity description'],
  },
  {
    id: 'sup_northern_ducting',
    name: 'Northern Ducting & HVAC Contracting',
    logoTone: 'bg-slate-500',
    status: 'listed',
    types: ['Subcontractor'],
    categories: ['MEP'],
    subcategories: ['HVAC', 'Ductwork'],
    capabilities: ['HVAC Ductwork', 'MEP Installation'],
    brands: [],
    ...UAE,
    headquarters: 'Abu Dhabi',
    regionsServed: ['Abu Dhabi'],
    description: 'MEP contractor specialising in HVAC ductwork fabrication and installation.',
    tradeLicense: { status: 'not-submitted' },
    companyInfoVerified: false,
    documentationPct: 15,
    profileCompletenessPct: 38,
    certifications: [],
    technicalDocuments: [],
    products: [],
    contacts: [
      { id: 'ct_northern_office', name: 'Sales Office', title: 'General Enquiries', category: 'MEP', location: 'Abu Dhabi, UAE', visibility: 'on-request' },
    ],
    intelligenceScore: 33,
    networkActivity: 'Low',
    updatedDaysAgo: 64,
    externalSourceFields: ['Company name', 'Location'],
  },
  {
    id: 'sup_buildpro_waterproofing',
    name: 'BuildPro Waterproofing Contracting',
    logoTone: 'bg-cyan-900',
    status: 'pending',
    types: ['Subcontractor'],
    categories: ['Waterproofing'],
    subcategories: ['Membranes', 'Roofing'],
    capabilities: ['Waterproofing Application', 'Roof Waterproofing', 'Basement Tanking'],
    brands: ['Sika', 'Bitumat'],
    ...UAE,
    headquarters: 'Abu Dhabi',
    regionsServed: ['Abu Dhabi', 'Al Ain'],
    description: 'Waterproofing application subcontractor for basements, podiums and roofs.',
    established: 2016,
    generalEmail: 'info@buildpro.example',
    tradeLicense: { status: 'verified', expiry: '2027-03-03' },
    companyInfoVerified: false,
    documentationPct: 52,
    profileCompletenessPct: 63,
    certifications: [{ name: 'Sika Approved Applicator', issuer: 'Sika Gulf', status: 'pending' }],
    technicalDocuments: docs(3, 0, 0, 0, 1),
    products: [
      p('prd_buildpro_roof', 'Roof Waterproofing System (Bitumat)', 'Roofing System', 'Waterproofing', 'Bitumat', IMG.waterproofing, true, false, 58),
      p('prd_buildpro_tanking', 'Basement Tanking (SikaProof)', 'Application Service', 'Waterproofing', 'Sika', IMG.membrane, false, false, 54),
    ],
    contacts: [
      { id: 'ct_yousef_ahmed', name: 'Yousef Ahmed', title: 'Operations Manager', category: 'Waterproofing', location: 'Abu Dhabi, UAE', phone: '+971504445566', visibility: 'public' },
    ],
    intelligenceScore: 57,
    networkActivity: 'Moderate',
    updatedDaysAgo: 15,
  },
  {
    id: 'sup_al_ain_concrete',
    name: 'Al Ain Concrete Products',
    logoTone: 'bg-stone-600',
    status: 'update-required',
    types: ['Manufacturer'],
    categories: ['Precast', 'Ready Mix Concrete'],
    subcategories: ['Kerbs & Paving', 'Structural Concrete'],
    capabilities: ['Precast Concrete', 'Interlock Paving', 'Ready Mix Concrete'],
    brands: ['Al Ain Concrete'],
    ...UAE,
    headquarters: 'Al Ain',
    regionsServed: ['Al Ain', 'Abu Dhabi'],
    description: 'Producer of precast kerbs, interlock paving and ready mix concrete for infrastructure projects.',
    established: 1996,
    website: 'alainconcrete.example',
    generalEmail: 'sales@alainconcrete.example',
    tradeLicense: { status: 'verified', expiry: '2027-02-28' },
    companyInfoVerified: true,
    documentationPct: 64,
    profileCompletenessPct: 76,
    certifications: [
      { name: 'ADQCC Plant Certification', issuer: 'Abu Dhabi Quality & Conformity Council', status: 'expired', validUntil: '2026-09-01' },
      iso('ISO 9001:2015', '2027-01-15'),
    ],
    technicalDocuments: docs(5, 1, 2, 1, 3),
    products: [
      p('prd_alain_interlock', 'Interlock Paver 80 mm', 'Precast Paving', 'Precast', 'Al Ain Concrete', IMG.precast, true, false, 60),
      p('prd_alain_kerb', 'Precast Kerb Stone', 'Precast Kerb', 'Precast', 'Al Ain Concrete', IMG.precast, true, false, 57),
      p('prd_alain_c35', 'C35 Ready Mix', 'Ready Mix Concrete', 'Ready Mix Concrete', 'Al Ain Concrete', IMG.concrete, true, true, 65),
    ],
    contacts: [
      { id: 'ct_salem_ketbi', name: 'Salem Al Ketbi', title: 'Commercial Manager', category: 'Precast', location: 'Al Ain, UAE', phone: '+971505556677', email: 'salem@alainconcrete.example', visibility: 'public' },
    ],
    intelligenceScore: 55,
    networkActivity: 'Moderate',
    lastVerified: '2025-10-01',
    updatedDaysAgo: 22,
  },
];

export interface LocationOption {
  id: string;
  label: string;
  countryCode?: string;
  regions?: string[];
  excludeRegions?: string[];
}

// Country-scoped so additional markets can be added as new entries without changing filter logic.
export const LOCATION_OPTIONS: LocationOption[] = [
  { id: 'all', label: 'All locations' },
  { id: 'AE', label: 'UAE', countryCode: 'AE' },
  { id: 'AE-dubai', label: 'Dubai', countryCode: 'AE', regions: ['Dubai'] },
  { id: 'AE-abu-dhabi', label: 'Abu Dhabi', countryCode: 'AE', regions: ['Abu Dhabi', 'Al Ain'] },
  { id: 'AE-sharjah', label: 'Sharjah', countryCode: 'AE', regions: ['Sharjah'] },
  { id: 'AE-other', label: 'Other Emirates', countryCode: 'AE', excludeRegions: ['Dubai', 'Abu Dhabi', 'Al Ain', 'Sharjah'] },
];

export const matchesLocation = (s: BuyerSupplier, option: LocationOption) => {
  if (option.countryCode && s.countryCode !== option.countryCode) return false;
  if (option.regions) return s.regionsServed.some((r) => option.regions!.includes(r));
  if (option.excludeRegions) return s.regionsServed.some((r) => !option.excludeRegions!.includes(r));
  return true;
};

export interface SupplierFilters {
  categories: string[];
  subcategories: string[];
  locationId: string;
  statuses: SupplierStatus[];
  brands: string[];
  certifications: string[];
  types: SupplierType[];
  minIntelligence: number;
}

export const EMPTY_FILTERS: SupplierFilters = {
  categories: [],
  subcategories: [],
  locationId: 'all',
  statuses: [],
  brands: [],
  certifications: [],
  types: [],
  minIntelligence: 0,
};

export const INTELLIGENCE_THRESHOLDS = [0, 50, 70, 85];

const unique = (values: string[]) => Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));

export const certificationFamily = (name: string) => name.split(':')[0].trim();

export const FILTER_FACETS = {
  categories: unique(BUYER_SUPPLIERS.flatMap((s) => s.categories)),
  brands: unique(BUYER_SUPPLIERS.flatMap((s) => s.brands)),
  certifications: unique(BUYER_SUPPLIERS.flatMap((s) => s.certifications.map((c) => certificationFamily(c.name)))),
};

export const subcategoriesFor = (categories: string[]) =>
  unique(
    BUYER_SUPPLIERS.filter((s) => !categories.length || s.categories.some((c) => categories.includes(c))).flatMap(
      (s) => s.subcategories
    )
  );

export const applyFilters = (s: BuyerSupplier, f: SupplierFilters) => {
  const location = LOCATION_OPTIONS.find((o) => o.id === f.locationId) ?? LOCATION_OPTIONS[0];
  return (
    (!f.categories.length || s.categories.some((c) => f.categories.includes(c))) &&
    (!f.subcategories.length || s.subcategories.some((c) => f.subcategories.includes(c))) &&
    matchesLocation(s, location) &&
    (!f.statuses.length || f.statuses.includes(s.status)) &&
    (!f.brands.length || s.brands.some((b) => f.brands.includes(b))) &&
    (!f.certifications.length ||
      s.certifications.some((c) => c.status === 'active' && f.certifications.includes(certificationFamily(c.name)))) &&
    (!f.types.length || s.types.some((t) => f.types.includes(t))) &&
    s.intelligenceScore >= f.minIntelligence
  );
};

const STOP_WORDS = new Set(['supplier', 'suppliers', 'contractor', 'contractors', 'company', 'companies', 'the', 'and', 'for', 'in', 'of', 'uae']);

const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const stem = (word: string) => (word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word);
const tokenize = (text: string) => normalize(text).split(/[^a-z0-9]+/).filter(Boolean).map(stem);

export const queryTokens = (query: string) => tokenize(query).filter((t) => !STOP_WORDS.has(t));

const hits = (tokens: string[], text: string) => {
  const words = tokenize(text);
  return (token: string) => words.some((w) => w.startsWith(token));
};

const productText = (prod: SupplierProduct) => `${prod.name} ${prod.type} ${prod.category} ${prod.brand}`;

export interface SupplierMatch {
  score: number;
  categoryMatch: boolean;
  capabilityMatch: boolean;
  brandMatch: boolean;
  nameMatch: boolean;
  relevantProducts: SupplierProduct[];
}

export function matchSupplier(s: BuyerSupplier, tokens: string[]): SupplierMatch | null {
  if (!tokens.length) {
    return { score: 0, categoryMatch: false, capabilityMatch: false, brandMatch: false, nameMatch: false, relevantProducts: [] };
  }
  const fields = {
    name: { test: hits(tokens, s.name), weight: 40 },
    category: { test: hits(tokens, [...s.categories, ...s.subcategories].join(' ')), weight: 30 },
    brand: { test: hits(tokens, s.brands.join(' ')), weight: 25 },
    capability: { test: hits(tokens, s.capabilities.join(' ')), weight: 20 },
    product: { test: hits(tokens, s.products.map(productText).join(' ')), weight: 15 },
    description: { test: hits(tokens, s.description), weight: 5 },
  };
  let score = 0;
  for (const token of tokens) {
    const matched = Object.values(fields).filter((f) => f.test(token));
    if (!matched.length) return null;
    score += Math.max(...matched.map((f) => f.weight));
  }
  const allMatch = (prod: SupplierProduct) => tokens.every(hits(tokens, productText(prod)));
  const anyMatch = (prod: SupplierProduct) => tokens.some(hits(tokens, productText(prod)));
  const strict = s.products.filter(allMatch);
  const relevantProducts = strict.length ? strict : s.products.filter(anyMatch);
  return {
    score: score + relevantProducts.length * 3,
    nameMatch: tokens.some(fields.name.test),
    categoryMatch: tokens.some(fields.category.test),
    brandMatch: tokens.some(fields.brand.test),
    capabilityMatch: tokens.some(fields.capability.test),
    relevantProducts,
  };
}

export type SupplierSort = 'relevant' | 'intelligence' | 'recently-verified' | 'recently-updated';

export const SORT_OPTIONS: { id: SupplierSort; label: string }[] = [
  { id: 'relevant', label: 'Most Relevant' },
  { id: 'intelligence', label: 'Highest Intelligence' },
  { id: 'recently-verified', label: 'Recently Verified' },
  { id: 'recently-updated', label: 'Recently Updated' },
];

export const formatDate = (isoDate?: string) =>
  isoDate
    ? new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Not yet verified';

export const supplierLocation = (s: BuyerSupplier) => `${s.headquarters}, ${s.countryCode === 'AE' ? 'UAE' : s.country}`;

export const supplierTypeLine = (s: BuyerSupplier) => [...s.types, ...(s.descriptor ? [s.descriptor] : [])].join(' · ');

export const supplierMarkets = (s: BuyerSupplier) => s.marketsServed ?? [s.countryCode === 'AE' ? 'UAE' : s.country, ...s.regionsServed];

export const freshnessLabel = (days: number) => (days <= 1 ? 'Updated today' : `Updated ${days} days ago`);

export const activeCertifications = (s: BuyerSupplier) => s.certifications.filter((c) => c.status === 'active').length;

export const tradeLicenseLabel = (s: BuyerSupplier) =>
  ({ verified: 'Verified', pending: 'Under review', expired: 'Expired', 'not-submitted': 'Not submitted' })[s.tradeLicense.status];

export function intelligenceSignals(s: BuyerSupplier) {
  const withTds = s.products.filter((prod) => prod.technicalDatasheet).length;
  const ratio = s.products.length ? withTds / s.products.length : 0;
  const verification =
    s.status === 'verified' ? 'Strong' : s.status === 'pending' ? 'In progress' : s.status === 'update-required' ? 'Needs update' : 'Not verified';
  const productInfo = !s.products.length ? 'Not available' : ratio >= 0.8 ? 'Strong' : ratio >= 0.5 ? 'Moderate' : 'Limited';
  const freshness = s.updatedDaysAgo < 60 ? freshnessLabel(s.updatedDaysAgo) : 'Not recently updated';
  return [
    { label: 'Verification', value: verification, tone: s.status === 'verified' ? 'good' : s.status === 'listed' ? 'neutral' : 'warn' },
    { label: 'Documentation Completeness', value: `${s.documentationPct}%`, tone: s.documentationPct >= 80 ? 'good' : s.documentationPct >= 50 ? 'warn' : 'neutral' },
    { label: 'Product Information', value: productInfo, tone: productInfo === 'Strong' ? 'good' : productInfo === 'Moderate' ? 'warn' : 'neutral' },
    { label: 'Profile Completeness', value: `${s.profileCompletenessPct}%`, tone: s.profileCompletenessPct >= 80 ? 'good' : s.profileCompletenessPct >= 50 ? 'warn' : 'neutral' },
    { label: 'Network Activity', value: s.networkActivity, tone: s.networkActivity === 'Active' ? 'good' : s.networkActivity === 'Moderate' ? 'warn' : 'neutral' },
    { label: 'Information Freshness', value: freshness, tone: s.updatedDaysAgo < 30 ? 'good' : s.updatedDaysAgo < 60 ? 'warn' : 'neutral' },
  ] as const;
}

export function similarSuppliers(target: BuyerSupplier, limit = 3) {
  return BUYER_SUPPLIERS.filter((s) => s.id !== target.id)
    .map((s) => {
      const shared = (a: string[], b: string[]) => a.filter((x) => b.includes(x)).length;
      const score =
        shared(s.categories, target.categories) * 30 +
        shared(s.brands, target.brands) * 15 +
        shared(s.subcategories, target.subcategories) * 10 +
        shared(s.regionsServed, target.regionsServed) * 3;
      return { supplier: s, score };
    })
    .filter((e) => e.score >= 30)
    .sort((a, b) => b.score - a.score || b.supplier.intelligenceScore - a.supplier.intelligenceScore)
    .slice(0, limit)
    .map((e) => e.supplier);
}

export type SearchSuggestionSource = 'prototype' | 'popular-category' | 'user-interest' | 'recent-search' | 'market-activity';

export interface SearchSuggestion {
  query: string;
  source: SearchSuggestionSource;
}

const PROTOTYPE_SUGGESTIONS: SearchSuggestion[] = [
  'Waterproofing supplier',
  'Ready mix concrete',
  'Sika',
  'Steel reinforcement',
  'Fire-rated doors',
  'MEP contractor',
  'Precast concrete',
  'Aluminium façade',
].map((query) => ({ query, source: 'prototype' }));

// Static for the prototype; later merge popular categories, buyer interests, recent searches and market activity here.
export function getSearchSuggestions(limit = 8): SearchSuggestion[] {
  return PROTOTYPE_SUGGESTIONS.slice(0, limit);
}
