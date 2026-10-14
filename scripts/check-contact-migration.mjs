#!/usr/bin/env node
/** Local migration/rollback consistency for Module 1A. No database connection. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const up = fs.readFileSync(path.join(root, 'supabase/migrations/20261013000100_contact_inquiries.sql'), 'utf8');
const down = fs.readFileSync(path.join(root, 'supabase/rollback/20261013000100_contact_inquiries.down.sql'), 'utf8');
const older = fs
  .readdirSync(path.join(root, 'supabase/migrations'))
  .filter((f) => f.endsWith('.sql') && f < '20261013000100_contact_inquiries.sql')
  .map((f) => fs.readFileSync(path.join(root, 'supabase/migrations', f), 'utf8'))
  .join('\n');

let failed = 0;
const check = (ok, label) => {
  if (!ok) failed += 1;
  console.log(ok ? 'PASS' : 'FAIL', label);
};

check(!/rzcsdilzpqvwjmzdxwyf/.test(up + down), 'no production project ref');
check(/create table public.contact_inquiries/.test(up), 'creates contact_inquiries');
check(/create table public.contact_inquiry_notes/.test(up), 'creates contact_inquiry_notes');
check(/drop table if exists public.contact_inquiries/.test(down), 'rollback drops inquiries');
check(/drop table if exists public.contact_inquiry_notes/.test(down), 'rollback drops notes');
check(/drop function if exists public.submit_contact_inquiry/.test(down), 'rollback drops submit RPC');
check(/create or replace function public.admin_platform_stats/.test(down), 'rollback restores stats RPC');
check(!/grant insert on table public.contact_inquiries to anon/i.test(up), 'no anon insert grant');
check(!/grant select on table public.contact_inquiries to anon/i.test(up), 'no anon select grant');
check(/allow_execute\(array\['anon', 'authenticated'\]/.test(up), 'submit RPC allowlisted for anon');
check(/private\.audit_contact_inquiry/.test(up), 'custom audit trigger');
check(!/attach_audit\('public.contact_inquiries'/.test(up), 'does not use generic attach_audit on inquiries');
check(/notify_platform_admins/.test(up), 'notifies platform admins');
check(!/create table public.contact_inquiries/.test(older), 'does not duplicate 01–12 inquiry table');
check(!/create table public.notifications /.test(up), 'does not recreate notifications');
check(!/create table public.audit_log /.test(up), 'does not recreate audit_log');
check(/refusing to duplicate/.test(up), 'refuses to recreate an existing table');

if (failed) {
  console.error(`check-contact-migration: ${failed} failed`);
  process.exit(1);
}
console.log('check-contact-migration: all passed');
