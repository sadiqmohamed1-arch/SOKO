# SOKO database migrations

Version-controlled PostgreSQL schema and Row Level Security for SOKO on Supabase.
**Nothing here has been executed against the SOKOfinalbackend project.** These files
contain no keys, passwords or connection strings.

## Execution order

Apply strictly in filename order. Each file depends on the ones before it.

| # | File | Contents |
|---|------|----------|
| 01 | `migrations/20261011000100_foundation.sql` | `private` schema, enums, permissions, roles, role permissions, role document access, plans (reference data only) |
| 02 | `migrations/20261011000200_identity.sql` | `profiles`, `platform_admins`, `is_platform_admin()`, profile-on-signup trigger |
| 03 | `migrations/20261011000300_companies_memberships.sql` | companies, taxonomy, certifications, public contacts, memberships, invitations, verifications, RLS helpers, team and verification RPCs, last-admin guard |
| 04 | `migrations/20261011000400_audit_notifications.sql` | append-only `audit_log`, `notifications`, audit and notification triggers |
| 05 | `migrations/20261011000500_subscriptions_credits.sql` | `company_subscriptions`, append-only `credit_ledger`, entitlement helpers, admin-only plan/credit RPCs |
| 06 | `migrations/20261011000600_products.sql` | products, specs, regions, saved products, product views |
| 07 | `migrations/20261011000700_documents_storage.sql` | documents, immutable versions, shares, expiry reminders, four private Storage buckets and their policies |
| 08 | `migrations/20261011000800_vendors_contacts_network.sql` | vendor records, private vendor notes, compliance requirements and submissions, company contacts, business cards, connections |
| 09 | `migrations/20261011000900_visits.sql` | visits, attendees, products, per-company private notes and tasks, visit status RPCs |
| 10 | `migrations/20261011001000_market_hub.sql` | opportunities, interests, saved opportunities, campaigns, recipients, responses, events, buyer preferences, supplier mutes |
| 11 | `migrations/20261011001100_intelligence.sql` | company profile views, `supplier_metrics_daily`, nightly aggregation function |
| 12 | `migrations/20261011001200_admin_moderation.sql` | content reports, platform-admin moderation and stats RPCs |

Recommended apply procedure (when approved):

1. Take a database backup / enable point-in-time recovery.
2. Apply on a Supabase **branch or staging project** first and run `tests/security_tests.sql` there.
3. Apply each migration in its own transaction, in order. Stop on the first error.
4. Register the scheduled functions (`private.refresh_supplier_metrics`, `private.grant_monthly_credits`,
   `private.queue_document_expiry_reminders`, `private.activate_due_campaigns`) with `pg_cron` — not included,
   pending approval.
5. Grant the first platform admin manually (`insert into public.platform_admins`) with the SQL editor.

## Rollback and recovery

- Each migration has a matching `rollback/<name>.down.sql`. Roll back **in reverse order** (12 → 01),
  only as far as needed.
- Rollbacks **destroy data** in the tables they drop. Each file header says what is lost. Export first.
- `07` will not delete Storage buckets that still contain files. Empty them through the Storage API
  first so files are never orphaned.
- `02` never touches `auth.users`; user accounts survive a full rollback.
- Preferred recovery for production is point-in-time restore, not rollback scripts. Rollbacks are for
  staging and for failed first-time applies.

## Security tests

`tests/security_tests.sql` runs 61 checks (unauthorised attempts plus positive controls) inside one
transaction that always ends in `ROLLBACK`, so its fixture users and records never persist. It
switches to the `authenticated` / `anon` roles and sets `request.jwt.claims` to impersonate users.

Run it only against a staging database or Supabase branch, never production.

### Static verification performed

- Full chain applied in order to PGlite (PostgreSQL 17 in WASM) with stub `auth` and `storage`
  schemas mirroring Supabase, and with `anon` / `authenticated` roles: all 12 migrations applied.
- All 61 security tests passed with RLS enforced.
- Full rollback 12 → 01 left 0 public tables, 0 public enums and 0 storage policies.

### Limitations

- Stubbed `auth.uid()` and `storage.objects` behave like Supabase's but are not Supabase's.
  Realtime publication, `pg_cron`, Storage API uploads and GoTrue sign-up were not exercised.
- Performance of RLS predicates under real data volumes is untested.
