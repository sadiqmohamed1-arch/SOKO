/**
 * Module 1B unit tests — no network. Run: npm run test:onboarding
 */
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  mapOnboardingError,
  saveOnboardingDraft,
  type OnboardingDraft,
} from './companyOnboardingShared';
import type { CompanyProfile } from '../data/supplierTypes';

let passed = 0;
let failed = 0;

function assert(cond: unknown, label: string) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL ${label}`);
  }
}

const blankProfile = (): CompanyProfile => ({
  legalName: 'Acme LLC',
  tradingName: 'Acme',
  types: ['Manufacturer'],
  licenseNo: 'CN-1',
  issuingAuthority: 'DET',
  licenseExpiry: '2027-01-01',
  country: 'United Arab Emirates',
  emirate: 'Dubai',
  address: '',
  website: '',
  generalEmail: '',
  phone: '',
  description: '',
  categories: ['Steel'],
  subcategories: [],
  brands: [],
  capabilities: [],
  regionsServed: [],
  marketsServed: ['UAE'],
  contacts: [],
  certifications: [],
  logoTone: 'bg-slate-800',
});

assert(
  mapOnboardingError('company creation limit reached; try again later').includes('too many companies'),
  'maps creation limit',
);
assert(
  mapOnboardingError('you already belong to or have requested this company').includes('already'),
  'maps duplicate membership',
);
assert(mapOnboardingError('company not found').includes('invitation'), 'maps private/non-public join');
assert(mapOnboardingError('not allowed').includes('not allowed'), 'maps permission denial');
assert(mapOnboardingError('weird backend blob XYZ').includes('weird backend blob XYZ'), 'passes through unknown errors');

const mem = new Map<string, string>();
const original = globalThis.localStorage;
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
  },
});

const userId = '11111111-1111-1111-1111-111111111111';
clearOnboardingDraft(userId);
assert(loadOnboardingDraft(userId) === null, 'no draft initially');

const draft: Omit<OnboardingDraft, 'updatedAt'> = {
  intent: 'supplier',
  step: 2,
  profile: blankProfile(),
  q: 'Acme',
};
saveOnboardingDraft(userId, draft);
const loaded = loadOnboardingDraft(userId);
assert(loaded?.step === 2, 'restores step');
assert(loaded?.profile.tradingName === 'Acme', 'restores profile');
assert(loaded?.intent === 'supplier', 'restores intent');
assert(typeof loaded?.updatedAt === 'string' && loaded.updatedAt.length > 0, 'stamps updatedAt');

clearOnboardingDraft(userId);
assert(loadOnboardingDraft(userId) === null, 'clears draft');

if (original !== undefined) {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: original });
}

console.log(`companyOnboarding tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
