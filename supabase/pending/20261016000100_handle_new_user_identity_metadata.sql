-- =============================================================================
-- STAGING MIGRATION — REQUIRES APPROVAL BEFORE APPLY
-- Project: iqzvlsgwphmjuornlbmj only. Do not apply to production.
--
-- Extends private.handle_new_user so professional_classification and username
-- from auth.users.raw_user_meta_data are written onto public.profiles at insert.
-- This complements the client-side sync in profileIdentitySync.ts (used when
-- email confirmation means no session at signUp). Trigger path is authoritative
-- when metadata is present at user creation; client sync fills gaps and never
-- overwrites existing non-null profile values.
--
-- Username unique / format failures do not abort user creation — username is
-- left null so the authenticated client can prompt for another handle.
-- =============================================================================

create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_full_name text;
  v_pro text;
  v_username text;
begin
  v_full_name := left(
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    120
  );
  v_pro := nullif(btrim(new.raw_user_meta_data ->> 'professional_classification'), '');
  v_username := nullif(lower(btrim(new.raw_user_meta_data ->> 'username')), '');

  -- Only accept taxonomy values already enforced by profiles check constraint.
  if v_pro is not null and v_pro not in (
    'Sales / Business Development',
    'Procurement / Buyer',
    'Engineer / Technical',
    'Project / Construction Management',
    'Management / Executive',
    'Consultant',
    'Other'
  ) then
    v_pro := null;
  end if;

  -- Format must match profiles_username_format_check; invalid → omit (do not fail signup).
  if v_username is not null and v_username !~ '^[a-z0-9]([a-z0-9._]{1,28})[a-z0-9]$' then
    v_username := null;
  end if;

  begin
    insert into public.profiles (id, full_name, professional_classification, username)
    values (new.id, v_full_name, v_pro, v_username)
    on conflict (id) do nothing;
  exception
    when unique_violation then
      -- Username taken: create profile without username so signup still succeeds.
      insert into public.profiles (id, full_name, professional_classification, username)
      values (new.id, v_full_name, v_pro, null)
      on conflict (id) do nothing;
    when check_violation then
      insert into public.profiles (id, full_name, professional_classification, username)
      values (new.id, v_full_name, v_pro, null)
      on conflict (id) do nothing;
  end;

  return new;
end $$;

comment on function private.handle_new_user() is
  'Creates public.profiles from auth.users; copies professional_classification and username from raw_user_meta_data when valid.';
