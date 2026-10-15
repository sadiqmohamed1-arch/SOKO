/**
 * Registration identity mapping tests. Run: npx tsx src/lib/registrationIdentity.test.ts
 */
import {
  companyKindForOrgClassification,
  isOrgClassification,
  isProfessionalClassification,
  orgClassificationTaxonomyValue,
  ORG_CLASSIFICATIONS,
  PROFESSIONAL_CLASSIFICATIONS,
} from '../data/registrationIdentity';

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
assert(companyKindForOrgClassification('Contractor / Subcontractor') === 'contractor', 'contractor maps to contractor kind');
assert(companyKindForOrgClassification('Developer / Real Estate') === 'contractor', 'developer → contractor');
assert(companyKindForOrgClassification('Consultant / Engineering') === 'contractor', 'consultant → contractor');
assert(isOrgClassification('Other'), 'Other is valid org class');
assert(!isOrgClassification('Buyer'), 'Buyer is not an org class');
assert(isProfessionalClassification('Procurement / Buyer'), 'buyer professional role');
assert(orgClassificationTaxonomyValue('Supplier / Manufacturer').startsWith('OrgType:'), 'taxonomy prefix');

console.log(`registrationIdentity tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
