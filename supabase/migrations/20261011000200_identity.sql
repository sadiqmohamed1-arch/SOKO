-- =============================================================================
-- SOKO migration 02 — Identity
-- One person = one auth.users row = one profiles row. Personal data hangs off
-- the profile, never off a company. Platform admin is a separate table, not a
-- company role, and can only be granted by the database owner.
-- =============================================================================

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  title       text check (char_length(title) <= 120),
  phone       text check (char_length(phone) <= 40),
  avatar_path text check (char_length(avatar_path) <= 500),
  location    text check (char_length(location) <= 120),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

create table public.platform_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now(),
  note       text
);

-- -----------------------------------------------------------------------------
-- Predicates used by RLS policies (security definer so they can read
-- membership tables regardless of the caller's own row visibility).
-- -----------------------------------------------------------------------------
create or replace function private.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid());
$$;
grant execute on function private.is_platform_admin() to authenticated;

-- Profile row is created by the database, never by the client, so a failed
-- client write can never leave a user without a profile.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 120)
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- -----------------------------------------------------------------------------
-- RLS
-- (Profiles of teammates and connections become visible in migrations 03/08.)
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;

select private.reset_table_grants('public.profiles');
grant select on public.profiles to authenticated;
grant update (full_name, title, phone, avatar_path, location) on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid() or private.is_platform_admin());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

select private.reset_table_grants('public.platform_admins');
grant select on public.platform_admins to authenticated;
create policy platform_admins_select_self on public.platform_admins
  for select to authenticated using (user_id = auth.uid());

select private.lock_down_public_functions();
