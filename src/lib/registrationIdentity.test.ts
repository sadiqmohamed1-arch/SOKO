/**
 * Registration identity mapping tests. Run: npx tsx src/lib/registrationIdentity.test.ts
 */
import {
  companyKindForOrgClassification,
  isOrgClassification,
  isProfessionalClassification,
  isValidUsername,
  normalizeUsername,
  parseOrgClassificationLabel,
  ORG_CLASSIFICATIONS,
  PROFESSIONAL_CLASSIFICATIONS,
  USERNAME_RE,
} from '../data/registrationIdentity';
import { mapOnboardingError } from './companyOnboardingShared';

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

assert(ORG_CLASSIFICATIONS.length === 6, 'six org classifications');
assert(PROFESSIONAL_CLASSIFICATIONS.length === 7, 'seven professional classifications');
assert(companyKindForOrgClassification('Supplier / Manufacturer') === 'supplier', 'supplier maps to supplier kind');
assert(companyKindForOrgClassification('Service Provider') === 'supplier', 'service provider → supplier');
assert(companyKindForOrgClassification('Other') === 'supplier', 'other → supplier');
assert(companyKindForOrgClassification('Contractor / Subcontractor') === 'contractor', 'contractor maps to contractor kind');
assert(companyKindForOrgClassification('Developer / Real Estate') === 'contractor', 'developer → contractor');
assert(companyKindForOrgClassification('Consultant / Engineering') === 'contractor', 'consultant → contractor');
assert(isOrgClassification('Other'), 'Other is valid org class');
assert(!isOrgClassification('Buyer'), 'Buyer is not an org class');
assert(isProfessionalClassification('Procurement / Buyer'), 'buyer professional role');
assert(isProfessionalClassification('Management / Executive'), 'executive professional role');
assert(!isProfessionalClassification('Authorized representative'), 'job title is not a professional class');
assert(parseOrgClassificationLabel('OrgType: Developer / Real Estate') === 'Developer / Real Estate', 'legacy OrgType prefix parsed');
assert(parseOrgClassificationLabel('Service Provider') === 'Service Provider', 'plain org label parsed');
assert(parseOrgClassificationLabel('not-a-class') === null, 'invalid org label rejected');
assert(normalizeUsername('  Ahmed.Khan ') === 'ahmed.khan', 'username normalized');
assert(isValidUsername('ahmed.khan'), 'valid username');
assert(!isValidUsername('ab'), 'username too short');
assert(!isValidUsername('Bad Name!'), 'username rejects spaces/symbols');
assert(USERNAME_RE.test('a_b'), 'USERNAME_RE accepts underscore');
assert(
  mapOnboardingError('duplicate key value violates unique constraint "profiles_username_uq"').includes('already taken'),
  'maps username uniqueness',
);
assert(
  mapOnboardingError('new row violates check constraint "profiles_username_format_check"').includes('3–30'),
  'maps username format',
);

console.log(`registrationIdentity tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
