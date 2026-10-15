-- =============================================================================
-- Rollback for migration 14 — Module 1B identity classifications.
-- Restores interim OrgType: taxonomy tags from the permanent column.
-- Does NOT touch company_kind, memberships, or create_company().
-- Does NOT clear profiles.title (up migration preserved title text).
-- =============================================================================

-- Restore OrgType capability tags from the permanent column (best-effort)
insert into public.company_taxonomy (company_id, kind, value)
select c.id, 'capability', 'OrgType: ' || c.org_classification
from public.companies c
where c.org_classification is not null
on conflict (company_id, kind, value) do nothing;

drop trigger if exists company_taxonomy_sync_org_classification on public.company_taxonomy;
drop function if exists private.sync_org_classification_from_taxonomy();

drop trigger if exists companies_default_org_classification on public.companies;
drop function if exists private.default_org_classification();

drop index if exists public.companies_org_classification_idx;
alter table public.companies drop constraint if exists companies_org_classification_check;
alter table public.companies drop column if exists org_classification;

-- Remove secondary company_type rows before restoring the narrower check
delete from public.company_taxonomy where kind = 'company_type';

-- Restore pre-migration kind allow-list via named constraint (IN or ANY formatting).
do $$
declare
  v_def text;
  v_has_company_type boolean;
  v_has_base_kinds boolean;
begin
  select pg_get_constraintdef(c.oid)
  into v_def
  from pg_catalog.pg_constraint c
  join pg_catalog.pg_class rel on rel.oid = c.conrelid
  join pg_catalog.pg_namespace n on n.oid = rel.relnamespace
  where n.nspname = 'public'
    and rel.relname = 'company_taxonomy'
    and c.contype = 'c'
    and c.conname = 'company_taxonomy_kind_check';

  if v_def is null then
    alter table public.company_taxonomy
      add constraint company_taxonomy_kind_check
      check (kind in (
        'category', 'subcategory', 'brand', 'capability', 'region', 'market'
      ));
    return;
  end if;

  v_has_company_type := v_def ilike '%company_type%';
  v_has_base_kinds :=
       v_def ilike '%category%'
   and v_def ilike '%subcategory%'
   and v_def ilike '%brand%'
   and v_def ilike '%capability%'
   and v_def ilike '%region%'
   and v_def ilike '%market%'
   and (
        v_def ~* 'kind\s+in\s*\('
     or v_def ~* 'kind\s*=\s*any\s*\(\s*array\s*\['
   );

  if not v_has_base_kinds then
    raise exception
      'rollback: company_taxonomy_kind_check unexpected definition (def=%). Refusing to replace.',
      v_def;
  end if;

  if not v_has_company_type then
    -- Already at pre-migration shape.
    return;
  end if;

  alter table public.company_taxonomy drop constraint company_taxonomy_kind_check;
  alter table public.company_taxonomy
    add constraint company_taxonomy_kind_check
    check (kind in (
      'category', 'subcategory', 'brand', 'capability', 'region', 'market'
    ));
end $$;

drop trigger if exists profiles_sync_professional_classification on public.profiles;
drop function if exists private.sync_professional_classification_from_title();

drop index if exists public.profiles_username_uq;
alter table public.profiles drop constraint if exists profiles_username_format_check;
alter table public.profiles drop constraint if exists profiles_professional_classification_check;
alter table public.profiles drop column if exists username;
alter table public.profiles drop column if exists professional_classification;

-- Restore pre-migration column grants (match migration 02 / 03)
select private.reset_table_grants('public.companies');
grant select (id, soko_id, kind, legal_name, trading_name, country, emirate, address, website,
              general_email, phone, established, description, logo_path, cover_path,
              is_public, is_suspended, verification_status, verified_at, created_at, updated_at)
  on public.companies to anon, authenticated;
grant update (trading_name, emirate, address, website, general_email, phone,
              established, description, logo_path, cover_path, is_public)
  on public.companies to authenticated;

select private.reset_table_grants('public.profiles');
grant select on public.profiles to authenticated;
grant update (full_name, title, phone, avatar_path, location) on public.profiles to authenticated;
