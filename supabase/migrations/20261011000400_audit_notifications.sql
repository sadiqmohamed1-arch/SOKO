-- =============================================================================
-- SOKO migration 04 — Audit log and notifications
-- Both are written only by the database (triggers and trusted functions).
-- The audit log is append-only and keeps the company id even after a company
-- is deleted, so there is deliberately no foreign key on it.
-- =============================================================================

create table public.audit_log (
  id         bigint generated always as identity primary key,
  company_id uuid,
  actor_id   uuid,
  action     text not null,
  entity     text not null,
  entity_id  text,
  diff       jsonb not null default '{}'::jsonb,
  at         timestamptz not null default now()
);
create index audit_log_company_at on public.audit_log (company_id, at desc);
create index audit_log_entity on public.audit_log (entity, entity_id);
create trigger audit_log_append_only before update or delete on public.audit_log
  for each row execute function private.forbid_mutation();

-- Generic row auditor. Company is resolved from the usual ownership columns.
-- Secrets and derived columns are stripped from the stored diff.
create or replace function private.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_diff jsonb;
  v_company uuid;
begin
  v_company := private.try_uuid(case
    when tg_table_name = 'companies' then v_row ->> 'id'
    else coalesce(v_row ->> 'company_id', v_row ->> 'owner_company_id',
                  v_row ->> 'contractor_company_id', v_row ->> 'host_company_id')
  end);

  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(n.key, jsonb_build_object('from', v_old -> n.key, 'to', n.value)), '{}'::jsonb)
    into v_diff
    from jsonb_each(v_new) n
    where n.value is distinct from (v_old -> n.key) and n.key not in ('updated_at', 'search');
    if v_diff = '{}'::jsonb then
      return new;
    end if;
  else
    v_diff := v_row;
  end if;

  v_diff := v_diff - 'token_hash' - 'search';

  insert into public.audit_log (company_id, actor_id, action, entity, entity_id, diff)
  values (v_company, auth.uid(), lower(tg_op), tg_table_name, v_row ->> 'id', v_diff);
  return coalesce(new, old);
end $$;

create or replace function private.attach_audit(p_table regclass) returns void
language plpgsql set search_path = '' as $$
begin
  execute format(
    'create trigger audit_row after insert or update or delete on %s for each row execute function private.audit_row()',
    p_table);
end $$;

select private.attach_audit('public.companies');
select private.attach_audit('public.company_memberships');
select private.attach_audit('public.company_invitations');
select private.attach_audit('public.company_verifications');
select private.attach_audit('public.platform_admins');

-- -----------------------------------------------------------------------------
-- Notifications
-- -----------------------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  type       text not null check (char_length(type) <= 60),
  payload    jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_created on public.notifications (user_id, created_at desc);
create index notifications_user_unread on public.notifications (user_id) where read_at is null;

-- Internal only (no EXECUTE grant): callable from triggers and trusted RPCs.
create or replace function private.notify(p_user uuid, p_company uuid, p_type text, p_payload jsonb default '{}'::jsonb)
returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, company_id, type, payload)
  select p_user, p_company, p_type, coalesce(p_payload, '{}'::jsonb)
  where p_user is not null;
$$;

create or replace function private.notify_permission_holders(
  p_company uuid, p_perm text, p_type text, p_payload jsonb default '{}'::jsonb, p_exclude uuid default null
) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, company_id, type, payload)
  select distinct m.user_id, p_company, p_type, coalesce(p_payload, '{}'::jsonb)
  from public.company_memberships m
  join public.role_permissions rp on rp.company_kind = m.company_kind and rp.role_key = m.role_key
  where m.company_id = p_company and m.status = 'active' and rp.permission = p_perm
    and m.user_id is distinct from p_exclude;
$$;

create or replace function private.membership_notifications() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'pending_approval' and (tg_op = 'INSERT' or old.status is distinct from 'pending_approval') then
    perform private.notify_permission_holders(new.company_id, 'team.manage', 'membership.join_requested',
      jsonb_build_object('membership_id', new.id, 'user_id', new.user_id));
  elsif tg_op = 'UPDATE' and new.status = 'active' and old.status = 'pending_approval' then
    perform private.notify(new.user_id, new.company_id, 'membership.approved',
      jsonb_build_object('role', new.role_key));
  elsif tg_op = 'UPDATE' and new.status = 'active' and new.role_key <> old.role_key then
    perform private.notify(new.user_id, new.company_id, 'membership.role_changed',
      jsonb_build_object('from', old.role_key, 'to', new.role_key));
  end if;
  return new;
end $$;
create trigger company_memberships_notify after insert or update on public.company_memberships
  for each row execute function private.membership_notifications();

create or replace function private.verification_notifications() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform private.notify_permission_holders(new.company_id, 'team.manage', 'verification.' || new.status::text,
      jsonb_build_object('verification_id', new.id, 'note', new.note));
  end if;
  return new;
end $$;
create trigger company_verifications_notify after update on public.company_verifications
  for each row execute function private.verification_notifications();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.audit_log enable row level security;
alter table public.notifications enable row level security;

select private.reset_table_grants('public.audit_log');
grant select on public.audit_log to authenticated;
create policy audit_log_read on public.audit_log
  for select to authenticated
  using (private.has_permission(company_id, 'team.manage') or private.is_platform_admin());

select private.reset_table_grants('public.notifications');
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy notifications_read_own on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy notifications_update_own on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete_own on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- Realtime delivery, only when Supabase's publication exists.
do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

select private.lock_down_public_functions();
