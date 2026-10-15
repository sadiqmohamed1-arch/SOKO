-- =============================================================================
-- SOKO migration 14 — Module 1B identity classifications (ADDITIVE)
-- Staging only until approved. PRODUCTION rzcsdilzpqvwjmzdxwyf STRICTLY PROHIBITED.
--
-- Adds:
--   public.companies.org_classification   (6 permanent org classes)
--   public.profiles.professional_classification (7 permanent professional roles)
--   public.profiles.username              (optional, unique, lowercase)
--   company_taxonomy kind 'company_type'  (secondary activities; optional)
--
-- Preserves company_kind (supplier|contractor) and all membership RPCs.
-- Does NOT change create_company() argument list (callers stay compatible).
-- Does NOT implement admin handover / recovery RPCs (deferred — see proposal).
--
-- Backfills:
--   OrgType: % capability taxonomy → org_classification
--   profiles.title exact-match role labels → professional_classification
--     (title text is preserved for current UI compatibility)
--
-- Compatibility with current onboarding (no app deploy required):
--   bootstrapOrganization() still inserts capability "OrgType: …";
--   a sync trigger copies that into companies.org_classification so all six
--   product labels stick even when company_kind is only supplier|contractor.
--   replaceTaxonomy() may delete OrgType rows later; the column is left intact.
-- =============================================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'companies' and column_name = 'org_classification'
  ) then
    raise exception 'public.companies.org_classification already exists; refusing to duplicate. Inspect staging and skip or reconcile this migration.';
  end if;
end $$;

select private.begin_function_scope();

-- -----------------------------------------------------------------------------
-- Organization classification (independent of company_kind workspace model)
-- Labels match src/data/registrationIdentity.ts ORG_CLASSIFICATIONS.
-- -----------------------------------------------------------------------------
alter table public.companies
  add column org_classification text;

-- Prefer interim client taxonomy tags written as capability "OrgType: …"
-- (registrationIdentity.orgClassificationTaxonomyValue → "OrgType: <label>")
update public.companies c
set org_classification = nullif(btrim(regexp_replace(t.value, '^OrgType:\s*', '')), '')
from (
  select distinct on (company_id) company_id, value
  from public.company_taxonomy
  where kind = 'capability' and value like 'OrgType:%'
  order by company_id, value
) t
where t.company_id = c.id
  and c.org_classification is null;

-- Drop invalid backfills that are not one of the six product labels
update public.companies
set org_classification = null
where org_classification is not null
  and org_classification not in (
    'Supplier / Manufacturer',
    'Contractor / Subcontractor',
    'Developer / Real Estate',
    'Consultant / Engineering',
    'Service Provider',
    'Other'
  );

-- Remaining rows: derive from immutable company_kind (backward compatible)
update public.companies
set org_classification = case kind
  when 'supplier' then 'Supplier / Manufacturer'
  when 'contractor' then 'Contractor / Subcontractor'
end
where org_classification is null;

alter table public.companies
  alter column org_classification set not null,
  add constraint companies_org_classification_check check (org_classification in (
    'Supplier / Manufacturer',
    'Contractor / Subcontractor',
    'Developer / Real Estate',
    'Consultant / Engineering',
    'Service Provider',
    'Other'
  ));
-- No column DEFAULT: create_company() omits the column; BEFORE INSERT trigger fills from kind.

create index companies_org_classification_idx on public.companies (org_classification)
  where is_public and not is_suspended;

-- Default for inserts that omit the column (keeps create_company() unchanged)
create or replace function private.default_org_classification() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.org_classification is null or btrim(new.org_classification) = '' then
    new.org_classification := case new.kind
      when 'supplier'::public.company_kind then 'Supplier / Manufacturer'
      when 'contractor'::public.company_kind then 'Contractor / Subcontractor'
      else 'Other'
    end;
  end if;
  return new;
end $$;

create trigger companies_default_org_classification
  before insert on public.companies
  for each row execute function private.default_org_classification();

-- Current AuthModal/bootstrapOrganization writes OrgType capability tags after
-- create_company(). Sync those into the permanent column so Developer /
-- Consultant / Service Provider / Other are not stuck on kind defaults.
create or replace function private.sync_org_classification_from_taxonomy() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_label text;
begin
  if new.kind = 'capability' and new.value like 'OrgType:%' then
    v_label := nullif(btrim(regexp_replace(new.value, '^OrgType:\s*', '')), '');
    if v_label is not null then
      -- RLS: caller already passed company_taxonomy insert (profile.edit).
      -- Column UPDATE grant includes org_classification (re-granted below).
      update public.companies
      set org_classification = v_label
      where id = new.company_id;
    end if;
  end if;
  return new;
end $$;

create trigger company_taxonomy_sync_org_classification
  after insert or update of kind, value on public.company_taxonomy
  for each row execute function private.sync_org_classification_from_taxonomy();

-- Remove interim OrgType capability tags now that the column is source of truth.
-- New dual-writes from the current UI re-insert OrgType and re-sync via trigger.
-- replaceTaxonomy() may delete them again; org_classification is not cleared.
delete from public.company_taxonomy
where kind = 'capability' and value like 'OrgType:%';

-- Secondary / additional activities (optional; primary remains companies.org_classification).
-- Staging stores the kind check as CHECK ((kind = ANY (ARRAY[...]))), not "kind in (...)".
-- Detect the named constraint, verify it is the kind allow-list, then replace only that
-- constraint (no CASCADE) to preserve existing kinds and add company_type.
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
    -- Constraint missing (unexpected on current staging); add the full allow-list.
    alter table public.company_taxonomy
      add constraint company_taxonomy_kind_check
      check (kind in (
        'category', 'subcategory', 'brand', 'capability', 'region', 'market', 'company_type'
      ));
    return;
  end if;

  v_has_company_type := v_def ilike '%company_type%';
  -- Accept both PG renderings: "kind in (...)" and "kind = ANY (ARRAY[...])".
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
      'public.company_taxonomy_kind_check exists but does not look like the taxonomy kind allow-list (def=%). Refusing to replace.',
      v_def;
  end if;

  if v_has_company_type then
    -- Already extended (re-run / partial apply); leave data and constraint alone.
    return;
  end if;

  -- Named drop only — no CASCADE. Recreate with the same six kinds plus company_type.
  alter table public.company_taxonomy drop constraint company_taxonomy_kind_check;
  alter table public.company_taxonomy
    add constraint company_taxonomy_kind_check
    check (kind in (
      'category', 'subcategory', 'brand', 'capability', 'region', 'market', 'company_type'
    ));
end $$;

-- -----------------------------------------------------------------------------
-- Individual professional classification + optional username
-- Labels match src/data/registrationIdentity.ts PROFESSIONAL_CLASSIFICATIONS.
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column professional_classification text,
  add column username text;

-- Copy exact title matches used as interim professional roles.
-- Do NOT clear title: AuthModal / profile UI still read and write title.
update public.profiles
set professional_classification = title
where professional_classification is null
  and title in (
    'Sales / Business Development',
    'Procurement / Buyer',
    'Engineer / Technical',
    'Project / Construction Management',
    'Management / Executive',
    'Consultant',
    'Other'
  );

alter table public.profiles
  add constraint profiles_professional_classification_check check (
    professional_classification is null or professional_classification in (
      'Sales / Business Development',
      'Procurement / Buyer',
      'Engineer / Technical',
      'Project / Construction Management',
      'Management / Executive',
      'Consultant',
      'Other'
    )
  );

-- Current individual signup writes the role into profiles.title only.
-- Keep title intact and mirror exact product labels into the permanent column.
create or replace function private.sync_professional_classification_from_title() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.title in (
    'Sales / Business Development',
    'Procurement / Buyer',
    'Engineer / Technical',
    'Project / Construction Management',
    'Management / Executive',
    'Consultant',
    'Other'
  ) then
    new.professional_classification := new.title;
  end if;
  return new;
end $$;

create trigger profiles_sync_professional_classification
  before insert or update of title on public.profiles
  for each row execute function private.sync_professional_classification_from_title();

-- Username: optional, lowercase, unique when set (same shape as AuthModal preview)
alter table public.profiles
  add constraint profiles_username_format_check check (
    username is null or username ~ '^[a-z0-9]([a-z0-9._]{1,28})[a-z0-9]$'
  );

create unique index profiles_username_uq on public.profiles (username) where username is not null;

-- -----------------------------------------------------------------------------
-- Grants (column-level SELECT/UPDATE must be re-listed after additive columns)
-- -----------------------------------------------------------------------------
select private.reset_table_grants('public.companies');
grant select (id, soko_id, kind, org_classification, legal_name, trading_name, country, emirate, address, website,
              general_email, phone, established, description, logo_path, cover_path,
              is_public, is_suspended, verification_status, verified_at, created_at, updated_at)
  on public.companies to anon, authenticated;
grant update (trading_name, emirate, address, website, general_email, phone,
              established, description, logo_path, cover_path, is_public, org_classification)
  on public.companies to authenticated;

-- Policies are privilege-independent; mig 03 companies_* policies remain.

select private.reset_table_grants('public.profiles');
grant select on public.profiles to authenticated;
grant update (full_name, title, phone, avatar_path, location, professional_classification, username)
  on public.profiles to authenticated;

-- Profiles policies from mig 02 remain; teammates policy from mig 03 remains.

select private.apply_function_grants();
