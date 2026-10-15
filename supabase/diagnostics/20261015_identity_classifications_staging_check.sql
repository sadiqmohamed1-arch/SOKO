-- =============================================================================
-- READ-ONLY diagnostic — Module 1B identity migration failure (42710)
-- Staging only: iqzvlsgwphmjuornlbmj
-- PRODUCTION rzcsdilzpqvwjmzdxwyf STRICTLY PROHIBITED.
--
-- Run as a role that can read pg_catalog + information_schema + public tables.
-- Does not modify data, constraints, triggers, grants, or RLS.
-- =============================================================================

-- 1) company_taxonomy CHECK constraints (name + definition)
--    Expect: existing kind check may show "= ANY (ARRAY[...])" not "kind in (...)"
select
  c.conname as constraint_name,
  pg_get_constraintdef(c.oid) as constraint_def,
  pg_get_constraintdef(c.oid) ilike '%kind in%' as matches_kind_in_pattern,
  pg_get_constraintdef(c.oid) ilike '%kind%any%array%' as matches_kind_any_array,
  pg_get_constraintdef(c.oid) ilike '%company_type%' as already_allows_company_type
from pg_catalog.pg_constraint c
join pg_catalog.pg_class rel on rel.oid = c.conrelid
join pg_catalog.pg_namespace n on n.oid = rel.relnamespace
where n.nspname = 'public'
  and rel.relname = 'company_taxonomy'
  and c.contype = 'c'
order by c.conname;

-- 2) Whether the exact name the migration tries to ADD already exists
select exists (
  select 1
  from pg_catalog.pg_constraint c
  join pg_catalog.pg_class rel on rel.oid = c.conrelid
  join pg_catalog.pg_namespace n on n.oid = rel.relnamespace
  where n.nspname = 'public'
    and rel.relname = 'company_taxonomy'
    and c.conname = 'company_taxonomy_kind_check'
) as company_taxonomy_kind_check_exists;

-- 3) Partial-apply fingerprint: columns / indexes / triggers from migration 14
select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'companies'
      and column_name = 'org_classification'
  ) as has_org_classification,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'professional_classification'
  ) as has_professional_classification,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'username'
  ) as has_username,
  exists (
    select 1 from pg_catalog.pg_class idx
    join pg_catalog.pg_namespace n on n.oid = idx.relnamespace
    where n.nspname = 'public' and idx.relname = 'profiles_username_uq' and idx.relkind = 'i'
  ) as has_profiles_username_uq,
  exists (
    select 1 from pg_catalog.pg_class idx
    join pg_catalog.pg_namespace n on n.oid = idx.relnamespace
    where n.nspname = 'public' and idx.relname = 'companies_org_classification_idx' and idx.relkind = 'i'
  ) as has_companies_org_classification_idx;

-- 4) Migration 14 trigger / function presence
select t.tgname as trigger_name, p.proname as function_name
from pg_catalog.pg_trigger t
join pg_catalog.pg_class rel on rel.oid = t.tgrelid
join pg_catalog.pg_namespace n on n.oid = rel.relnamespace
join pg_catalog.pg_proc p on p.oid = t.tgfoid
where n.nspname = 'public'
  and rel.relname in ('companies', 'company_taxonomy', 'profiles')
  and not t.tgisinternal
  and t.tgname in (
    'companies_default_org_classification',
    'company_taxonomy_sync_org_classification',
    'profiles_sync_professional_classification'
  )
order by t.tgname;

select n.nspname || '.' || p.proname as function_name
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private'
  and p.proname in (
    'default_org_classification',
    'sync_org_classification_from_taxonomy',
    'sync_professional_classification_from_title'
  )
order by 1;

-- 5) Taxonomy data integrity (counts only — no row dumps)
select
  count(*) as taxonomy_rows,
  count(*) filter (where kind = 'company_type') as company_type_rows,
  count(*) filter (where kind = 'capability' and value like 'OrgType:%') as orgtype_capability_rows,
  count(distinct kind) as distinct_kinds
from public.company_taxonomy;

select kind, count(*) as n
from public.company_taxonomy
group by kind
order by kind;

-- 6) org_classification backfill state (dynamic — safe if column absent)
do $$
declare
  v_companies bigint;
  v_with bigint;
  v_null bigint;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'companies'
      and column_name = 'org_classification'
  ) then
    raise notice 'org_classification: ABSENT (migration likely stopped at/before taxonomy constraint)';
    return;
  end if;
  execute $q$
    select count(*), count(org_classification), count(*) filter (where org_classification is null)
    from public.companies
  $q$ into v_companies, v_with, v_null;
  raise notice 'org_classification: PRESENT companies=% with_value=% nulls=%', v_companies, v_with, v_null;
end $$;

-- 7) Existing companies CHECK constraints related to org_classification
select c.conname, pg_get_constraintdef(c.oid) as constraint_def
from pg_catalog.pg_constraint c
join pg_catalog.pg_class rel on rel.oid = c.conrelid
join pg_catalog.pg_namespace n on n.oid = rel.relnamespace
where n.nspname = 'public'
  and rel.relname = 'companies'
  and c.contype = 'c'
  and (
    c.conname ilike '%org_classification%'
    or pg_get_constraintdef(c.oid) ilike '%org_classification%'
  )
order by c.conname;

-- 8) Column grants snapshot for companies.org_classification / profiles new cols
select
  table_name,
  column_name,
  grantee,
  privilege_type
from information_schema.column_privileges
where table_schema = 'public'
  and (
    (table_name = 'companies' and column_name = 'org_classification')
    or (table_name = 'profiles' and column_name in ('professional_classification', 'username'))
  )
order by table_name, column_name, grantee, privilege_type;

-- 9) RLS still enabled on taxonomy (should remain true)
select c.relname, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('companies', 'company_taxonomy', 'profiles')
order by c.relname;

-- 10) Summary for paste-back
select
  (select count(*) from pg_catalog.pg_constraint c
     join pg_catalog.pg_class rel on rel.oid = c.conrelid
     join pg_catalog.pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'company_taxonomy' and c.contype = 'c'
      and c.conname = 'company_taxonomy_kind_check') as named_kind_check_count,
  (select pg_get_constraintdef(c.oid)
     from pg_catalog.pg_constraint c
     join pg_catalog.pg_class rel on rel.oid = c.conrelid
     join pg_catalog.pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'company_taxonomy' and c.contype = 'c'
      and c.conname = 'company_taxonomy_kind_check'
    limit 1) as named_kind_check_def,
  (select count(*) from pg_catalog.pg_constraint c
     join pg_catalog.pg_class rel on rel.oid = c.conrelid
     join pg_catalog.pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'company_taxonomy' and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%kind in%') as defs_matching_kind_in,
  (select count(*) from pg_catalog.pg_constraint c
     join pg_catalog.pg_class rel on rel.oid = c.conrelid
     join pg_catalog.pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'company_taxonomy' and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ~* 'kind\s*=\s*any') as defs_matching_kind_any;
