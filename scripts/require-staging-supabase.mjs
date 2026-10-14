#!/usr/bin/env node
/**
 * Staging-only guard. Never connects to a database.
 *
 * Allowed Supabase project: iqzvlsgwphmjuornlbmj (soko-development)
 * Prohibited:               rzcsdilzpqvwjmzdxwyf (production)
 * Prohibited Vercel prod:   project name "soko"
 *
 * Exit 0 only with --approve-staging-migration AND a staging-only identity.
 * Does not run migrations, SQL, or deploys.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STAGING_REF = 'iqzvlsgwphmjuornlbmj';
const PRODUCTION_REF = 'rzcsdilzpqvwjmzdxwyf';
const PRODUCTION_VERCEL = 'soko';
const STAGING_VERCEL = 'soko-staging';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const approved = process.argv.includes('--approve-staging-migration');

const failures = [];
const notes = [];

const envBlob = Object.entries(process.env)
  .filter(([k]) => /SUPABASE|POSTGRES|DATABASE|VERCEL|SOKO/i.test(k))
  .map(([k, v]) => `${k}=${v ?? ''}`)
  .join('\n');

const haystack = `${envBlob}\n${process.argv.join(' ')}`.toLowerCase();

if (haystack.includes(PRODUCTION_REF)) {
  failures.push(`Production Supabase project ${PRODUCTION_REF} is prohibited.`);
}

const vercelName = (process.env.VERCEL_PROJECT_NAME || process.env.VERCEL_PROJECT_ID || '').trim();
if (vercelName === PRODUCTION_VERCEL) {
  failures.push(`Production Vercel project "${PRODUCTION_VERCEL}" is prohibited.`);
}

const ref =
  process.env.SUPABASE_PROJECT_REF ||
  process.env.SOKO_SUPABASE_PROJECT_REF ||
  '';
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';

const refsFound = new Set();
if (ref) refsFound.add(ref);
const urlMatch = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
if (urlMatch) refsFound.add(urlMatch[1]);

for (const found of refsFound) {
  if (found === PRODUCTION_REF) {
    failures.push(`Refusing production project ref ${PRODUCTION_REF}.`);
  } else if (found && found !== STAGING_REF) {
    failures.push(`Unknown project ref "${found}". Only ${STAGING_REF} is allowed.`);
  }
}

if (refsFound.size === 0) {
  notes.push(
    `No project ref in the environment. When applying, set SUPABASE_PROJECT_REF=${STAGING_REF}.`,
  );
} else if (refsFound.has(STAGING_REF) && refsFound.size === 1) {
  notes.push(`Identity matches staging Supabase ${STAGING_REF}.`);
}

if (vercelName && vercelName !== STAGING_VERCEL && vercelName !== PRODUCTION_VERCEL) {
  notes.push(`Vercel project "${vercelName}" is not ${STAGING_VERCEL}; confirm this is not production.`);
}

const migrationsDir = path.join(root, 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
const created = new Map();
for (const file of files) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  for (const m of sql.matchAll(/create table (?:if not exists )?((?:public|private)\.[a-z0-9_]+)/gi)) {
    const name = m[1].toLowerCase();
    if (created.has(name) && path.basename(created.get(name)) !== file) {
      failures.push(`Table ${name} is created in both ${created.get(name)} and ${file}.`);
    } else {
      created.set(name, file);
    }
  }
}

const latest = files[files.length - 1];
notes.push(`Local migrations (${files.length}): ${files.join(', ')}`);
if (latest !== '20261013000100_contact_inquiries.sql') {
  notes.push(`Latest local migration is ${latest}.`);
}

const contactUp = path.join(migrationsDir, '20261013000100_contact_inquiries.sql');
const contactDown = path.join(root, 'supabase', 'rollback', '20261013000100_contact_inquiries.down.sql');
if (!fs.existsSync(contactUp)) failures.push('Missing contact inquiries migration.');
if (!fs.existsSync(contactDown)) failures.push('Missing contact inquiries rollback.');

if (fs.existsSync(contactUp)) {
  const up = fs.readFileSync(contactUp, 'utf8');
  if (/rzcsdilzpqvwjmzdxwyf/.test(up)) failures.push('Contact migration contains the production project ref.');
  if (!/submit_contact_inquiry/.test(up)) failures.push('Contact migration is missing submit_contact_inquiry.');
  if (!/already exists; refusing to duplicate/.test(up)) {
    failures.push('Contact migration must refuse to duplicate an existing contact_inquiries table.');
  }
}

console.log('SOKO staging guard (no network, no SQL)');
console.log(`Allowed ref: ${STAGING_REF}`);
console.log(`Denied ref:  ${PRODUCTION_REF}`);
for (const n of notes) console.log('NOTE', n);

if (failures.length) {
  for (const f of failures) console.error('FAIL', f);
  console.error('Refusing to continue.');
  process.exit(1);
}

if (!approved) {
  console.log('OK local checks passed.');
  console.log('This script does not apply migrations. After human approval, re-run with:');
  console.log('  node scripts/require-staging-supabase.mjs --approve-staging-migration');
  console.log('Then (still not executed here) apply only against staging, for example:');
  console.log(`  supabase link --project-ref ${STAGING_REF}`);
  console.log('  supabase migration list   # verify remote history; do not apply 01–12 again');
  console.log('  supabase db push          # pending migrations only, staging linked');
  process.exit(2);
}

console.log('APPROVED staging identity for a future apply. No database connection was opened.');
process.exit(0);
