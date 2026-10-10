import { CompanyProfile } from './supplierTypes';

export const CONTRACTOR_CLASSIFICATIONS = [
  'Main Contractor',
  'Developer',
  'Design & Build Contractor',
  'Specialist Subcontractor',
  'Engineering Consultant',
  'Project Management Consultant',
  'Infrastructure Contractor',
  'Fit-Out Contractor',
];

/** Construction disciplines describe work a contractor performs, not materials it sells. */
export const CONSTRUCTION_DISCIPLINES: Record<string, string[]> = {
  'Structural & Civil': ['Concrete Works', 'Structural Steel', 'Piling & Foundations', 'Earthworks & Excavation', 'Precast Installation'],
  MEP: ['Mechanical Installation', 'Electrical Installation', 'Plumbing & Drainage', 'HVAC', 'Fire Protection'],
  'Architectural & Finishes': ['Waterproofing Works', 'Interior Fit-Out', 'Façade Installation', 'Joinery & Carpentry', 'Flooring & Tiling'],
  Infrastructure: ['Roads & Utilities', 'Bridges & Structures', 'Marine Works', 'Landscaping & Hardscape'],
  'Specialist Works': ['Demolition', 'Scaffolding & Formwork', 'Insulation Works', 'Specialist Coatings'],
  'Project Development & Management': ['Project Development', 'Construction Management', 'Design Management', 'Cost & Contract Management'],
};

export const DISCIPLINE_NAMES = Object.keys(CONSTRUCTION_DISCIPLINES);
export const disciplineSubsOf = (d: string) => CONSTRUCTION_DISCIPLINES[d] ?? [];

const CLASSIFICATION_MAP: Record<string, string> = {
  Contractor: 'Main Contractor',
  'General Contractor': 'Main Contractor',
  'Main Contractor': 'Main Contractor',
  Developer: 'Developer',
  'Design-Build': 'Design & Build Contractor',
  Subcontractor: 'Specialist Subcontractor',
  'Specialist Contractor': 'Specialist Subcontractor',
  Consultant: 'Engineering Consultant',
};

const DISCIPLINE_MAP: Record<string, string> = {
  Finishes: 'Architectural & Finishes',
  'Architectural Finishes': 'Architectural & Finishes',
  'Civil & Structural': 'Structural & Civil',
  'Project Management': 'Project Development & Management',
};

const SUB_MAP: Record<string, string[]> = {
  'MEP Installation': ['Mechanical Installation', 'Electrical Installation'],
  Waterproofing: ['Waterproofing Works'],
  'Fit-Out': ['Interior Fit-Out'],
  Facade: ['Façade Installation'],
  Piling: ['Piling & Foundations'],
};

const uniq = (xs: string[]) => Array.from(new Set(xs));

/**
 * Maps legacy contractor values onto the contractor taxonomy. Values with no mapping
 * are kept as-is so existing company data is never silently dropped.
 */
export const normalizeContractorProfile = (p: CompanyProfile): CompanyProfile => {
  const types = uniq(p.types.map((t) => CLASSIFICATION_MAP[t] ?? t));
  const categories = uniq(p.categories.map((c) => DISCIPLINE_MAP[c] ?? c));
  const subcategories = uniq(p.subcategories.flatMap((s) => SUB_MAP[s] ?? [s]));
  return { ...p, types: types.length ? types : ['Main Contractor'], categories, subcategories };
};

/** Values the company already holds that sit outside the standard lists — shown so they can be kept or removed. */
export const legacyValues = (selected: string[], options: string[]) => selected.filter((v) => !options.includes(v));
