-- =============================================================================
-- SOKO migration 03 — Companies, memberships, invitations, verification
-- The core of the security model. Every later policy is built on the helper
-- predicates defined here. Membership rows are never written by clients:
-- creation, invitation, approval, re-roling and removal are trusted RPCs.
-- =============================================================================

create table public.companies (
  id                uuid primary key default gen_random_uuid(),
  soko_id           text not null unique
                    default ('SOKO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  kind              public.company_kind not null,
  legal_name        text not null check (char_length(legal_name) between 2 and 200),
  trading_name      text check (char_length(trading_name) <= 200),
  license_no        text check (char_length(license_no) <= 80),
  issuing_authority text check (char_length(issuing_authority) <= 120),
  license_expiry    date,
  country           text not null default 'AE' check (char_length(country) = 2),
  emirate           text check (char_length(emirate) <= 60),
  address           text check (char_length(address) <= 500),
  website           text check (char_length(website) <= 300),
  general_email     text check (char_length(general_email) <= 254),
  phone             text check (char_length(phone) <= 40),
  established       smallint check (established between 1800 and 2100),
  description       text check (char_length(description) <= 5000),
  logo_path         text check (char_length(logo_path) <= 500),
  cover_path        text check (char_length(cover_path) <= 500),
  is_public         boolean not null default false,
  verification_status public.verification_status not null default 'not_submitted',
  verified_at       timestamptz,
  is_suspended      boolean not null default false,
  created_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, kind)
);
create unique index companies_license_uq
  on public.companies (lower(issuing_authority), lower(license_no))
  where license_no is not null and issuing_authority is not null;
create index companies_public_idx on public.companies (kind) where is_public and not is_suspended;
create trigger companies_updated_at before update on public.companies
  for each row execute function private.set_updated_at();

-- A company can never change kind, regardless of who is writing.
create or replace function private.guard_company_kind() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.kind is distinct from old.kind then
    raise exception 'company kind is immutable' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger companies_kind_immutable before update on public.companies
  for each row execute function private.guard_company_kind();

create table public.company_taxonomy (
  company_id uuid not null references public.companies (id) on delete cascade,
  kind       text not null check (kind in ('category','subcategory','brand','capability','region','market')),
  value      text not null check (char_length(value) between 1 and 120),
  primary key (company_id, kind, value)
);
create index company_taxonomy_lookup on public.company_taxonomy (kind, value);

create table public.company_certifications (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  name        text not null check (char_length(name) <= 200),
  issuer      text check (char_length(issuer) <= 200),
  valid_until date,
  created_at  timestamptz not null default now()
);
create index on public.company_certifications (company_id);

create table public.company_public_contacts (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  full_name  text not null check (char_length(full_name) <= 120),
  title      text check (char_length(title) <= 120),
  email      text check (char_length(email) <= 254),
  phone      text check (char_length(phone) <= 40),
  position   smallint not null default 0
);
create index on public.company_public_contacts (company_id);

create table public.company_memberships (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null,
  company_kind public.company_kind not null,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role_key     text not null,
  status       public.membership_status not null default 'active',
  invited_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (company_id, user_id),
  foreign key (company_id, company_kind) references public.companies (id, kind) on delete cascade,
  foreign key (company_kind, role_key) references public.roles (company_kind, key)
);
create index company_memberships_user_status on public.company_memberships (user_id, status);
create index company_memberships_company on public.company_memberships (company_id, status);
create trigger company_memberships_updated_at before update on public.company_memberships
  for each row execute function private.set_updated_at();

create table public.company_invitations (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null,
  company_kind public.company_kind not null,
  email        text not null check (email = lower(email) and char_length(email) <= 254),
  role_key     text not null,
  token_hash   text not null unique,
  expires_at   timestamptz not null,
  accepted_at  timestamptz,
  accepted_by  uuid references auth.users (id) on delete set null,
  revoked_at   timestamptz,
  invited_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  foreign key (company_id, company_kind) references public.companies (id, kind) on delete cascade,
  foreign key (company_kind, role_key) references public.roles (company_kind, key)
);
create index on public.company_invitations (company_id);
create unique index company_invitations_one_open
  on public.company_invitations (company_id, email)
  where accepted_at is null and revoked_at is null;

create table public.company_verifications (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies (id) on delete cascade,
  status              public.verification_status not null default 'pending',
  license_document_id uuid,          -- FK added in migration 07 (documents)
  submitted_by        uuid references auth.users (id) on delete set null,
  submitted_at        timestamptz not null default now(),
  reviewed_by         uuid references auth.users (id) on delete set null,
  reviewed_at         timestamptz,
  note                text check (char_length(note) <= 2000)
);
create index on public.company_verifications (company_id, submitted_at desc);
create unique index company_verifications_one_pending
  on public.company_verifications (company_id) where status = 'pending';

-- -----------------------------------------------------------------------------
-- Helper predicates. Authorization is ALWAYS derived from company_memberships;
-- the "current workspace" chosen in the UI never grants anything.
-- -----------------------------------------------------------------------------
create or replace function private.my_company_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.company_id from public.company_memberships m
  where m.user_id = auth.uid() and m.status = 'active';
$$;

create or replace function private.is_member(p_company uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.company_memberships m
    where m.company_id = p_company and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

-- Permissions are void while the company is suspended.
create or replace function private.has_permission(p_company uuid, p_perm text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.company_memberships m
    join public.role_permissions rp
      on rp.company_kind = m.company_kind and rp.role_key = m.role_key
    join public.companies c on c.id = m.company_id
    where m.company_id = p_company
      and m.user_id = auth.uid()
      and m.status = 'active'
      and rp.permission = p_perm
      and not c.is_suspended
  );
$$;

create or replace function private.is_company_admin(p_company uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.company_memberships m
    join public.roles r on r.company_kind = m.company_kind and r.key = m.role_key
    where m.company_id = p_company and m.user_id = auth.uid()
      and m.status = 'active' and r.is_admin
  );
$$;

create or replace function private.shares_company_with(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.company_memberships mine
    join public.company_memberships theirs on theirs.company_id = mine.company_id
    where mine.user_id = auth.uid() and mine.status = 'active'
      and theirs.user_id = p_user and theirs.status in ('active', 'pending_approval')
  );
$$;

grant execute on function private.my_company_ids() to authenticated;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.has_permission(uuid, text) to authenticated;
grant execute on function private.is_company_admin(uuid) to authenticated;
grant execute on function private.shares_company_with(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Invariant: a company always keeps at least one active admin.
-- The company row is locked so concurrent demotions are serialised.
-- -----------------------------------------------------------------------------
create or replace function private.guard_last_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_was_admin boolean;
  v_still_admin boolean := false;
  v_others int;
begin
  select r.is_admin into v_was_admin from public.roles r
  where r.company_kind = old.company_kind and r.key = old.role_key;

  if not (v_was_admin and old.status = 'active') then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE' then
    select r.is_admin into v_still_admin from public.roles r
    where r.company_kind = new.company_kind and r.key = new.role_key;
    v_still_admin := v_still_admin and new.status = 'active';
  end if;

  if not v_still_admin then
    perform 1 from public.companies c where c.id = old.company_id for update;
    select count(*) into v_others
    from public.company_memberships m
    join public.roles r on r.company_kind = m.company_kind and r.key = m.role_key
    where m.company_id = old.company_id and m.id <> old.id and m.status = 'active' and r.is_admin;
    -- Deleting the whole company cascades; allow that.
    if v_others = 0 and exists (select 1 from public.companies c where c.id = old.company_id) then
      raise exception 'a company must keep at least one active admin' using errcode = '23514';
    end if;
  end if;
  return coalesce(new, old);
end $$;
create trigger company_memberships_last_admin
  before update or delete on public.company_memberships
  for each row execute function private.guard_last_admin();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.companies               enable row level security;
alter table public.company_taxonomy        enable row level security;
alter table public.company_certifications  enable row level security;
alter table public.company_public_contacts enable row level security;
alter table public.company_memberships     enable row level security;
alter table public.company_invitations     enable row level security;
alter table public.company_verifications   enable row level security;

-- companies: public directory read; members read; profile editors update a
-- fixed column list. Kind, licence, verification, suspension and soko_id are
-- never client-writable. Insert and delete happen only through RPCs/support.
select private.reset_table_grants('public.companies');
grant select on public.companies to anon, authenticated;
grant update (trading_name, emirate, address, website, general_email, phone,
              established, description, logo_path, cover_path, is_public)
  on public.companies to authenticated;

create policy companies_public_read on public.companies
  for select to anon, authenticated using (is_public and not is_suspended);
create policy companies_member_read on public.companies
  for select to authenticated using (private.is_member(id) or private.is_platform_admin());
create policy companies_update_profile on public.companies
  for update to authenticated
  using (private.has_permission(id, 'profile.edit'))
  with check (private.has_permission(id, 'profile.edit'));

-- Company-owned public profile children.
do $$
declare t text;
begin
  foreach t in array array['company_taxonomy','company_certifications','company_public_contacts'] loop
    perform private.reset_table_grants(format('public.%I', t)::regclass);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format($p$create policy %I on public.%I for select to anon, authenticated
      using (exists (select 1 from public.companies c where c.id = company_id))$p$, t || '_read', t);
    execute format($p$create policy %I on public.%I for insert to authenticated
      with check (private.has_permission(company_id, 'profile.edit'))$p$, t || '_insert', t);
    execute format($p$create policy %I on public.%I for update to authenticated
      using (private.has_permission(company_id, 'profile.edit'))
      with check (private.has_permission(company_id, 'profile.edit'))$p$, t || '_update', t);
    execute format($p$create policy %I on public.%I for delete to authenticated
      using (private.has_permission(company_id, 'profile.edit'))$p$, t || '_delete', t);
  end loop;
end $$;

-- memberships: read-only to clients.
select private.reset_table_grants('public.company_memberships');
grant select on public.company_memberships to authenticated;
create policy memberships_read on public.company_memberships
  for select to authenticated
  using (user_id = auth.uid() or private.is_member(company_id) or private.is_platform_admin());

-- invitations: team managers read; token_hash is never readable.
select private.reset_table_grants('public.company_invitations');
grant select (id, company_id, company_kind, email, role_key, expires_at, accepted_at,
              accepted_by, revoked_at, invited_by, created_at)
  on public.company_invitations to authenticated;
create policy invitations_read on public.company_invitations
  for select to authenticated using (private.has_permission(company_id, 'team.manage'));

-- verifications: members and platform admins read; nobody writes directly.
select private.reset_table_grants('public.company_verifications');
grant select on public.company_verifications to authenticated;
create policy verifications_read on public.company_verifications
  for select to authenticated
  using (private.is_member(company_id) or private.is_platform_admin());

-- Teammates can see each other's profiles.
create policy profiles_select_teammates on public.profiles
  for select to authenticated using (private.shares_company_with(id));

-- -----------------------------------------------------------------------------
-- Trusted RPCs
-- -----------------------------------------------------------------------------
create or replace function public.create_company(
  p_kind public.company_kind,
  p_legal_name text,
  p_trading_name text default null,
  p_license_no text default null,
  p_issuing_authority text default null,
  p_emirate text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_company uuid;
  v_admin_role text;
begin
  if (select count(*) from public.companies c
      where c.created_by = v_uid and c.created_at > now() - interval '1 day') >= 5 then
    raise exception 'company creation limit reached; try again later' using errcode = '54000';
  end if;

  select r.key into v_admin_role from public.roles r
  where r.company_kind = p_kind and r.is_admin limit 1;

  insert into public.companies (kind, legal_name, trading_name, license_no, issuing_authority, emirate, created_by)
  values (p_kind, btrim(p_legal_name), nullif(btrim(p_trading_name), ''), nullif(btrim(p_license_no), ''),
          nullif(btrim(p_issuing_authority), ''), nullif(btrim(p_emirate), ''), v_uid)
  returning id into v_company;

  insert into public.company_memberships (company_id, company_kind, user_id, role_key, status)
  values (v_company, p_kind, v_uid, v_admin_role, 'active');

  return v_company;
end $$;

-- Returns the raw invitation token ONCE. Only its SHA-256 hash is stored.
create or replace function public.invite_member(p_company uuid, p_email text, p_role_key text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_kind public.company_kind;
  v_token text;
  v_is_admin_role boolean;
begin
  if not private.has_permission(p_company, 'team.manage') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select c.kind into v_kind from public.companies c where c.id = p_company;
  select r.is_admin into v_is_admin_role from public.roles r
  where r.company_kind = v_kind and r.key = p_role_key;
  if v_is_admin_role is null then
    raise exception 'unknown role % for % companies', p_role_key, v_kind using errcode = '22023';
  end if;
  if v_is_admin_role and not private.is_company_admin(p_company) then
    raise exception 'only admins can invite admins' using errcode = '42501';
  end if;
  if (select count(*) from public.company_invitations i
      where i.company_id = p_company and i.created_at > now() - interval '1 day') >= 50 then
    raise exception 'invitation limit reached' using errcode = '54000';
  end if;

  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  insert into public.company_invitations (company_id, company_kind, email, role_key, token_hash, expires_at, invited_by)
  values (p_company, v_kind, lower(btrim(p_email)), p_role_key,
          encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), now() + interval '7 days', v_uid);
  return v_token;
end $$;

create or replace function public.revoke_invitation(p_invitation uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_company uuid;
begin
  perform private.require_user();
  select i.company_id into v_company from public.company_invitations i where i.id = p_invitation;
  if v_company is null or not private.has_permission(v_company, 'team.manage') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.company_invitations set revoked_at = now()
  where id = p_invitation and accepted_at is null and revoked_at is null;
end $$;

-- The signed-in user's email must match the invitation email.
create or replace function public.accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_email text;
  v_inv public.company_invitations%rowtype;
begin
  select lower(u.email) into v_email from auth.users u where u.id = v_uid;

  select * into v_inv from public.company_invitations i
  where i.token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
  for update;

  if v_inv.id is null or v_inv.accepted_at is not null or v_inv.revoked_at is not null
     or v_inv.expires_at < now() or v_inv.email <> v_email then
    raise exception 'invitation is invalid or expired' using errcode = '22023';
  end if;

  insert into public.company_memberships (company_id, company_kind, user_id, role_key, status, invited_by)
  values (v_inv.company_id, v_inv.company_kind, v_uid, v_inv.role_key, 'active', v_inv.invited_by)
  on conflict (company_id, user_id) do update
    set role_key = excluded.role_key, status = 'active', invited_by = excluded.invited_by;

  update public.company_invitations set accepted_at = now(), accepted_by = v_uid where id = v_inv.id;
  return v_inv.company_id;
end $$;

-- Requests always start as a viewer; an admin chooses the real role on approval.
create or replace function public.request_to_join(p_company uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_kind public.company_kind;
  v_id uuid;
begin
  select c.kind into v_kind from public.companies c
  where c.id = p_company and c.is_public and not c.is_suspended;
  if v_kind is null then
    raise exception 'company not found' using errcode = '22023';
  end if;
  insert into public.company_memberships (company_id, company_kind, user_id, role_key, status)
  values (p_company, v_kind, v_uid, 'viewer', 'pending_approval')
  on conflict (company_id, user_id) do update
    set status = 'pending_approval', role_key = 'viewer'
    where public.company_memberships.status = 'removed'
  returning id into v_id;
  if v_id is null then
    raise exception 'you already belong to or have requested this company' using errcode = '23505';
  end if;
  return v_id;
end $$;

create or replace function public.approve_join_request(p_membership uuid, p_role_key text default 'viewer')
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_m public.company_memberships%rowtype;
  v_is_admin_role boolean;
begin
  select * into v_m from public.company_memberships where id = p_membership for update;
  if v_m.id is null or v_m.status <> 'pending_approval'
     or not private.has_permission(v_m.company_id, 'team.manage') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select r.is_admin into v_is_admin_role from public.roles r
  where r.company_kind = v_m.company_kind and r.key = p_role_key;
  if v_is_admin_role is null then
    raise exception 'unknown role' using errcode = '22023';
  end if;
  if v_is_admin_role and not private.is_company_admin(v_m.company_id) then
    raise exception 'only admins can grant admin' using errcode = '42501';
  end if;
  update public.company_memberships
  set status = 'active', role_key = p_role_key, invited_by = v_uid
  where id = p_membership;
end $$;

create or replace function public.decline_join_request(p_membership uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_m public.company_memberships%rowtype;
begin
  perform private.require_user();
  select * into v_m from public.company_memberships where id = p_membership for update;
  if v_m.id is null or v_m.status <> 'pending_approval'
     or not private.has_permission(v_m.company_id, 'team.manage') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.company_memberships set status = 'removed' where id = p_membership;
end $$;

-- Nobody can change their own role: this blocks self-promotion outright.
create or replace function public.change_member_role(p_membership uuid, p_role_key text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_m public.company_memberships%rowtype;
  v_target_admin boolean;
  v_current_admin boolean;
begin
  select * into v_m from public.company_memberships where id = p_membership for update;
  if v_m.id is null or v_m.status <> 'active'
     or not private.has_permission(v_m.company_id, 'team.manage') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_m.user_id = v_uid then
    raise exception 'you cannot change your own role' using errcode = '42501';
  end if;
  select r.is_admin into v_target_admin from public.roles r
  where r.company_kind = v_m.company_kind and r.key = p_role_key;
  if v_target_admin is null then
    raise exception 'unknown role' using errcode = '22023';
  end if;
  select r.is_admin into v_current_admin from public.roles r
  where r.company_kind = v_m.company_kind and r.key = v_m.role_key;
  if (v_target_admin or v_current_admin) and not private.is_company_admin(v_m.company_id) then
    raise exception 'only admins can grant or remove admin' using errcode = '42501';
  end if;
  update public.company_memberships set role_key = p_role_key where id = p_membership;
end $$;

-- Team managers remove others; anyone may leave. Last-admin guard still applies.
create or replace function public.remove_member(p_membership uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_m public.company_memberships%rowtype;
  v_target_admin boolean;
begin
  select * into v_m from public.company_memberships where id = p_membership for update;
  if v_m.id is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_m.user_id <> v_uid then
    if not private.has_permission(v_m.company_id, 'team.manage') then
      raise exception 'not allowed' using errcode = '42501';
    end if;
    select r.is_admin into v_target_admin from public.roles r
    where r.company_kind = v_m.company_kind and r.key = v_m.role_key;
    if v_target_admin and not private.is_company_admin(v_m.company_id) then
      raise exception 'only admins can remove admins' using errcode = '42501';
    end if;
  end if;
  update public.company_memberships set status = 'removed' where id = p_membership;
end $$;

-- Company admins submit; the company becomes "pending", never "verified".
create or replace function public.submit_verification(
  p_company uuid,
  p_license_no text,
  p_issuing_authority text,
  p_license_expiry date,
  p_license_document uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_id uuid;
begin
  if not private.is_company_admin(p_company) then
    raise exception 'only company admins can submit verification' using errcode = '42501';
  end if;
  if (select c.verification_status from public.companies c where c.id = p_company) = 'verified' then
    raise exception 'company is already verified' using errcode = '22023';
  end if;
  update public.companies
  set license_no = nullif(btrim(p_license_no), ''),
      issuing_authority = nullif(btrim(p_issuing_authority), ''),
      license_expiry = p_license_expiry,
      verification_status = 'pending'
  where id = p_company;
  insert into public.company_verifications (company_id, status, license_document_id, submitted_by)
  values (p_company, 'pending', p_license_document, v_uid)
  returning id into v_id;
  return v_id;
end $$;

-- Platform admins only, and never for a company they belong to.
create or replace function public.review_verification(p_verification uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_ver public.company_verifications%rowtype;
  v_status public.verification_status := case when p_approve then 'verified' else 'rejected' end;
begin
  if not private.is_platform_admin() then
    raise exception 'platform admin only' using errcode = '42501';
  end if;
  select * into v_ver from public.company_verifications where id = p_verification for update;
  if v_ver.id is null or v_ver.status <> 'pending' then
    raise exception 'verification is not pending' using errcode = '22023';
  end if;
  if private.is_member(v_ver.company_id) then
    raise exception 'you cannot review a company you belong to' using errcode = '42501';
  end if;
  update public.company_verifications
  set status = v_status, reviewed_by = v_uid, reviewed_at = now(), note = left(p_note, 2000)
  where id = p_verification;
  update public.companies
  set verification_status = v_status,
      verified_at = case when p_approve then now() else null end
  where id = v_ver.company_id;
end $$;

select private.lock_down_public_functions();
