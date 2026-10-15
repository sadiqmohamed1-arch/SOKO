-- =============================================================================
-- SOKO Module 1B identity classification tests
-- Run as database owner against NON-production AFTER migration 14.
-- One transaction; always ends in ROLLBACK. Fixture emails use .test TLD.
-- Compatible with staging schema after migrations 01–14 (create_company 6-arg,
-- company_taxonomy kinds, column-level companies grants, profiles RLS).
-- =============================================================================
begin;

create schema soko_ci;
create table soko_ci.results (n serial primary key, label text not null, passed boolean not null, detail text);
create table soko_ci.ids (key text primary key, id uuid not null);
grant usage on schema soko_ci to anon, authenticated, service_role;
grant all on all tables in schema soko_ci to anon, authenticated, service_role;
grant all on all sequences in schema soko_ci to anon, authenticated, service_role;

create function soko_ci.id(p_key text) returns uuid language sql stable as
  $$ select id from soko_ci.ids where key = p_key $$;

create function soko_ci.as_user(p_key text) returns void language sql as $$
  select set_config('request.jwt.claims',
           json_build_object('sub', soko_ci.id(p_key), 'role', 'authenticated')::text, true),
         set_config('request.jwt.claim.sub', soko_ci.id(p_key)::text, true);
$$;

create function soko_ci.as_anon() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true),
         set_config('request.jwt.claim.sub', '', true);
$$;

create function soko_ci.expect_ok(p_label text, p_sql text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
    insert into soko_ci.results (label, passed, detail) values (p_label, true, 'ok');
  exception when others then
    insert into soko_ci.results (label, passed, detail) values (p_label, false, 'unexpected error: ' || sqlerrm);
  end;
end $$;

create function soko_ci.expect_fail(p_label text, p_sql text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
    insert into soko_ci.results (label, passed, detail) values (p_label, false, 'expected failure');
  exception when others then
    insert into soko_ci.results (label, passed, detail) values (p_label, true, 'denied: ' || sqlerrm);
  end;
end $$;

-- RLS often returns 0 rows instead of raising; treat both as denial.
create function soko_ci.expect_denied(p_label text, p_sql text) returns void language plpgsql as $$
declare v_rows bigint;
begin
  begin
    execute p_sql;
    get diagnostics v_rows = row_count;
    insert into soko_ci.results (label, passed, detail) values (p_label, v_rows = 0, 'affected ' || v_rows || ' row(s)');
  exception when others then
    insert into soko_ci.results (label, passed, detail) values (p_label, true, 'denied: ' || sqlerrm);
  end;
end $$;

create function soko_ci.expect_true(p_label text, p_sql text) returns void language plpgsql as $$
declare v boolean;
begin
  begin
    execute p_sql into v;
    insert into soko_ci.results (label, passed, detail) values (p_label, coalesce(v, false), coalesce(v::text, 'null'));
  exception when others then
    insert into soko_ci.results (label, passed, detail) values (p_label, false, 'error: ' || sqlerrm);
  end;
end $$;

grant execute on all functions in schema soko_ci to anon, authenticated, service_role;

insert into soko_ci.ids (key, id) values
  ('owner',  '00000000-0000-4000-8000-00000000d001'),
  ('other',  '00000000-0000-4000-8000-00000000d002');

insert into auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at)
select i.id, i.key || '@soko-identity.test', 'authenticated', 'authenticated',
       jsonb_build_object('full_name', 'CI ' || i.key), now()
from soko_ci.ids i
on conflict (id) do nothing;

insert into public.profiles (id, full_name)
select i.id, 'CI ' || i.key from soko_ci.ids i
on conflict (id) do nothing;

-- Schema presence
select soko_ci.expect_true(
  'companies.org_classification exists',
  $$select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'companies' and column_name = 'org_classification')$$);

select soko_ci.expect_true(
  'profiles.professional_classification exists',
  $$select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'professional_classification')$$);

select soko_ci.expect_true(
  'profiles.username exists',
  $$select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'username')$$);

select soko_ci.expect_true(
  'company_taxonomy_kind_check allows company_type and base kinds',
  $$select
      d ilike '%company_type%'
      and d ilike '%category%'
      and d ilike '%subcategory%'
      and d ilike '%brand%'
      and d ilike '%capability%'
      and d ilike '%region%'
      and d ilike '%market%'
      and (d ~* 'kind\s+in\s*\(' or d ~* 'kind\s*=\s*any\s*\(\s*array\s*\[')
    from (
      select pg_get_constraintdef(c.oid) as d
      from pg_constraint c
      join pg_class rel on rel.oid = c.conrelid
      join pg_namespace n on n.oid = rel.relnamespace
      where n.nspname = 'public' and rel.relname = 'company_taxonomy'
        and c.conname = 'company_taxonomy_kind_check'
    ) s$$);

-- Data preservation on existing rows
select soko_ci.expect_true(
  'all companies have org_classification',
  $$select not exists (select 1 from public.companies where org_classification is null)$$);

select soko_ci.expect_true(
  'no invalid org_classification values',
  $$select not exists (
      select 1 from public.companies
      where org_classification not in (
        'Supplier / Manufacturer','Contractor / Subcontractor','Developer / Real Estate',
        'Consultant / Engineering','Service Provider','Other'))$$);

select soko_ci.expect_true(
  'no residual OrgType capability tags after migration backfill',
  $$select not exists (
      select 1 from public.company_taxonomy
      where kind = 'capability' and value like 'OrgType:%')$$);

-- create_company still works and trigger fills classification from kind
select soko_ci.as_user('owner');
set local role authenticated;
select soko_ci.expect_ok(
  'create_company still callable (6-arg)',
  $sql$select public.create_company('supplier'::public.company_kind, 'Identity Test Co LLC', 'Identity Test Co', null, null, 'Dubai')$sql$);

reset role;
select soko_ci.expect_true(
  'new company got org_classification from kind',
  $$select exists (
      select 1 from public.companies
      where legal_name = 'Identity Test Co LLC'
        and org_classification = 'Supplier / Manufacturer')$$);

-- Simulate current bootstrapOrganization OrgType dual-write for all six labels
select soko_ci.as_user('owner');
set local role authenticated;

do $$
declare
  v_labels text[] := array[
    'Supplier / Manufacturer',
    'Contractor / Subcontractor',
    'Developer / Real Estate',
    'Consultant / Engineering',
    'Service Provider',
    'Other'
  ];
  v_label text;
  v_company uuid;
  v_got text;
begin
  select id into v_company from public.companies where legal_name = 'Identity Test Co LLC';
  foreach v_label in array v_labels loop
    delete from public.company_taxonomy
    where company_id = v_company and kind = 'capability' and value like 'OrgType:%';
    insert into public.company_taxonomy (company_id, kind, value)
    values (v_company, 'capability', 'OrgType: ' || v_label);
    select org_classification into v_got from public.companies where id = v_company;
    if v_got is distinct from v_label then
      insert into soko_ci.results (label, passed, detail)
      values ('OrgType sync → ' || v_label, false, 'got ' || coalesce(v_got, 'null'));
    else
      insert into soko_ci.results (label, passed, detail)
      values ('OrgType sync → ' || v_label, true, 'ok');
    end if;
  end loop;
end $$;

-- Simulate replaceTaxonomy wiping OrgType rows — permanent column must remain
select soko_ci.expect_ok(
  'replaceTaxonomy-style delete of OrgType succeeds',
  $sql$delete from public.company_taxonomy
     where company_id = (select id from public.companies where legal_name = 'Identity Test Co LLC')
       and kind = 'capability' and value like 'OrgType:%'$sql$);

select soko_ci.expect_true(
  'org_classification survives OrgType taxonomy delete',
  $$select org_classification = 'Other'
    from public.companies where legal_name = 'Identity Test Co LLC'$$);

-- Profile self-update + title→professional sync (current individual signup path)
select soko_ci.expect_ok(
  'owner can set title to professional role (UI path)',
  $sql$update public.profiles
     set title = 'Procurement / Buyer', username = 'ci.owner'
   where id = soko_ci.id('owner')$sql$);

select soko_ci.expect_true(
  'title sync populated professional_classification',
  $$select professional_classification = 'Procurement / Buyer'
      and title = 'Procurement / Buyer'
    from public.profiles where id = soko_ci.id('owner')$$);

select soko_ci.expect_ok(
  'owner can set professional_classification directly',
  $sql$update public.profiles
     set professional_classification = 'Consultant'
   where id = soko_ci.id('owner')$sql$);

select soko_ci.expect_fail(
  'invalid professional_classification rejected',
  $sql$update public.profiles set professional_classification = 'Hacker' where id = soko_ci.id('owner')$sql$);

select soko_ci.expect_fail(
  'invalid username rejected',
  $sql$update public.profiles set username = 'Bad Name!' where id = soko_ci.id('owner')$sql$);

-- Other user cannot update owner profile (RLS)
select soko_ci.as_user('other');
select soko_ci.expect_denied(
  'other cannot update owner professional_classification',
  $sql$update public.profiles set professional_classification = 'Consultant' where id = soko_ci.id('owner')$sql$);

-- Username uniqueness
select soko_ci.expect_ok(
  'other can claim different username',
  $sql$update public.profiles set username = 'ci.other' where id = soko_ci.id('other')$sql$);

select soko_ci.expect_fail(
  'duplicate username rejected',
  $sql$update public.profiles set username = 'ci.owner' where id = soko_ci.id('other')$sql$);

-- Member with profile.edit can update org_classification
select soko_ci.as_user('owner');
set local role authenticated;
select soko_ci.expect_ok(
  'admin can set org_classification to Developer',
  $sql$update public.companies
      set org_classification = 'Developer / Real Estate'
    where legal_name = 'Identity Test Co LLC'$sql$);

select soko_ci.expect_fail(
  'invalid org_classification rejected',
  $sql$update public.companies
      set org_classification = 'Not A Real Class'
    where legal_name = 'Identity Test Co LLC'$sql$);

-- Existing kinds remain insertable (allow-list was extended, not replaced with a subset)
select soko_ci.expect_ok(
  'legacy capability taxonomy kind still allowed',
  $sql$insert into public.company_taxonomy (company_id, kind, value)
     select id, 'capability', 'Waterproofing'
     from public.companies where legal_name = 'Identity Test Co LLC'$sql$);

-- company_type taxonomy kind allowed
select soko_ci.expect_ok(
  'company_type taxonomy insert allowed for admin',
  $sql$insert into public.company_taxonomy (company_id, kind, value)
     select id, 'company_type', 'Secondary: Fit-Out'
     from public.companies where legal_name = 'Identity Test Co LLC'$sql$);

-- Anon cannot update profiles / companies
select soko_ci.as_anon();
set local role anon;
select soko_ci.expect_denied(
  'anon cannot update professional_classification',
  $sql$update public.profiles set professional_classification = 'Other' where id = soko_ci.id('owner')$sql$);
select soko_ci.expect_denied(
  'anon cannot update org_classification',
  $sql$update public.companies set org_classification = 'Other' where legal_name = 'Identity Test Co LLC'$sql$);

reset role;

-- Report
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
from soko_ci.results order by n;

do $$
declare
  v_failed int;
  v_total int;
  v_detail text;
begin
  select count(*) filter (where not passed), count(*) into v_failed, v_total from soko_ci.results;
  if v_failed > 0 then
    select string_agg(n::text || '. FAIL ' || label || ' — ' || coalesce(detail, ''), E'\n' order by n)
      into v_detail
    from soko_ci.results
    where not passed;
    raise exception 'SOKO identity classification tests: % of % FAILED%Detail:%', v_failed, v_total, E'\n', E'\n' || v_detail;
  end if;
  raise notice 'SOKO identity classification tests: all % passed', v_total;
end $$;

rollback;
