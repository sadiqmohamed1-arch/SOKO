#!/usr/bin/env node
/** Local migration/rollback/test consistency for Module 1B identity. No database connection. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const upPath = 'supabase/migrations/20261015000100_identity_classifications.sql';
const downPath = 'supabase/rollback/20261015000100_identity_classifications.down.sql';
const testsPath = 'supabase/tests/identity_classification_tests.sql';
const identityTs = 'src/data/registrationIdentity.ts';

const up = fs.readFileSync(path.join(root, upPath), 'utf8');
const down = fs.readFileSync(path.join(root, downPath), 'utf8');
const tests = fs.readFileSync(path.join(root, testsPath), 'utf8');
const identity = fs.readFileSync(path.join(root, identityTs), 'utf8');
const older = fs
  .readdirSync(path.join(root, 'supabase/migrations'))
  .filter((f) => f.endsWith('.sql') && f < '20261015000100_identity_classifications.sql')
  .map((f) => fs.readFileSync(path.join(root, 'supabase/migrations', f), 'utf8'))
  .join('\n');

const ORG = [
  'Supplier / Manufacturer',
  'Contractor / Subcontractor',
  'Developer / Real Estate',
  'Consultant / Engineering',
  'Service Provider',
  'Other',
];
const PRO = [
  'Sales / Business Development',
  'Procurement / Buyer',
  'Engineer / Technical',
  'Project / Construction Management',
  'Management / Executive',
  'Consultant',
  'Other',
];

let failed = 0;
const check = (ok, label) => {
  if (!ok) failed += 1;
  console.log(ok ? 'PASS' : 'FAIL', label);
};

// Allow "STRICTLY PROHIBITED" documentation; forbid live connection strings / apply targets.
check(!/supabase\.co.*rzcsdilzpqvwjmzdxwyf|project[_ -]?ref['":=\s]+rzcsdilzpqvwjmzdxwyf/i.test(up + down + tests), 'no production connection target');
check(/STRICTLY PROHIBITED/.test(up), 'documents production prohibition');
check(/add column org_classification/.test(up), 'adds companies.org_classification');
check(/add column professional_classification/.test(up), 'adds profiles.professional_classification');
check(/add column username/.test(up), 'adds profiles.username');
check(/company_type/.test(up), 'extends taxonomy with company_type');
check(/c\.conname = 'company_taxonomy_kind_check'/.test(up), 'targets named company_taxonomy_kind_check');
check(up.includes(String.raw`kind\s*=\s*any\s*\(\s*array\s*\[`), 'accepts ANY(ARRAY) constraint rendering');
check(up.includes(String.raw`kind\s+in\s*\(`), 'accepts IN (...) constraint rendering');
check(/v_has_base_kinds/.test(up), 'verifies base taxonomy kinds before replace');
check(/v_has_company_type/.test(up), 'skips replace when company_type already present');
check(/Refusing to replace/.test(up), 'refuses unexpected kind-check definition');
check(/drop constraint company_taxonomy_kind_check;/.test(up), 'drops named kind check only');
check(!/cascade/i.test(up.match(/drop constraint company_taxonomy_kind_check[^;]*/i)?.[0] ?? ''), 'no CASCADE on kind-check drop');
check(!/ilike '%kind in%'/.test(up), 'does not rely on fragile kind-in-only detection');
check(/OrgType:/.test(up), 'migrates interim OrgType capability tags');
check(/professional_classification = title/.test(up), 'migrates exact-match titles');
check(!/set title = null/.test(up), 'preserves profiles.title (no clear)');
check(/sync_org_classification_from_taxonomy/.test(up), 'syncs OrgType taxonomy → org_classification');
check(/sync_professional_classification_from_title/.test(up), 'syncs title → professional_classification');
check(!/create or replace function public\.create_company/.test(up), 'does not alter create_company signature');
check(!/create or replace function public\.(transfer_primary_admin|recover_admin|claim_company)/.test(up), 'defers admin handover/recovery RPCs');
check(/Does NOT implement admin handover/.test(up), 'documents handover deferral');
check(/company_kind/.test(up) && !/alter type public\.company_kind/.test(up), 'preserves company_kind enum');
check(/profiles_username_uq/.test(up), 'unique username index');
check(/\^\[a-z0-9\]\(\[a-z0-9\._\]\{1,28\}\)\[a-z0-9\]\$/.test(up), 'username format matches AuthModal');
check(/org_classification\)\s*\n\s*on public\.companies to authenticated/.test(up), 'grants org_classification update');
check(/professional_classification, username\)/.test(up), 'grants professional_classification + username update');
check(/refusing to duplicate/.test(up), 'refuses duplicate apply');
check(/private\.begin_function_scope\(\)/.test(up) && /private\.apply_function_grants\(\)/.test(up), 'function grant scope bookends');
check(!/org_classification/.test(older), 'does not duplicate org_classification in prior migrations');
check(!/professional_classification/.test(older), 'does not duplicate professional_classification in prior migrations');
check(!/drop table|truncate /i.test(up), 'no table drops or truncates');
check(/delete from public\.company_taxonomy[\s\S]*OrgType:/.test(up), 'only destructive delete is interim OrgType tags');

for (const label of ORG) {
  check(up.includes(`'${label}'`) && identity.includes(`'${label}'`), `org label present: ${label}`);
}
for (const label of PRO) {
  check(up.includes(`'${label}'`) && identity.includes(`'${label}'`), `pro label present: ${label}`);
}

check(/drop column if exists org_classification/.test(down), 'rollback drops org_classification');
check(/drop column if exists professional_classification/.test(down), 'rollback drops professional_classification');
check(/drop column if exists username/.test(down), 'rollback drops username');
check(/OrgType:/.test(down), 'rollback restores OrgType tags');
check(/company_type/.test(down), 'rollback removes company_type rows');
check(/c\.conname = 'company_taxonomy_kind_check'/.test(down), 'rollback targets named kind check');
check(/v_has_base_kinds/.test(down), 'rollback verifies base kinds before replace');
check(/drop function if exists private\.sync_org_classification_from_taxonomy/.test(down), 'rollback drops org sync trigger fn');
check(/drop function if exists private\.sync_professional_classification_from_title/.test(down), 'rollback drops title sync trigger fn');
check(/grant update \(full_name, title, phone, avatar_path, location\)/.test(down), 'rollback restores profile grants');

check(/rollback;/.test(tests), 'SQL tests always roll back');
check(/all companies have org_classification/.test(tests), 'tests data preservation');
check(/create_company still callable/.test(tests), 'tests create_company compatibility');
check(/company_taxonomy_kind_check allows company_type and base kinds/.test(tests), 'tests kind-check preserves base + company_type');
check(/legacy capability taxonomy kind still allowed/.test(tests), 'tests legacy taxonomy kinds still insertable');
check(/OrgType sync →/.test(tests), 'tests all six OrgType sync labels');
check(/org_classification survives OrgType taxonomy delete/.test(tests), 'tests replaceTaxonomy safety');
check(/title sync populated professional_classification/.test(tests), 'tests title→professional sync');
check(/duplicate username rejected/.test(tests), 'tests username uniqueness');
check(/no residual OrgType/.test(tests), 'tests OrgType cleanup');
check(/\.test TLD|@soko-identity\.test/.test(tests), 'tests use .test fixture emails');

if (failed) {
  console.error(`check-identity-classification-migration: ${failed} failed`);
  process.exit(1);
}
console.log('check-identity-classification-migration: all passed');
