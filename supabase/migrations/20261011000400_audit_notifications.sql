-- =============================================================================
-- SOKO migration 04 — Audit log and notifications
-- Both are written only by the database (triggers and trusted functions).
-- The audit log is append-only and keeps the company id even after a company
-- is deleted, so there is deliberately no foreign key on it.
-- =============================================================================

-- Opens the function-ownership scope closed by apply_function_grants() below.
select private.begin_function_scope();

create table public.audit_log (
  id         bigint generated always as identity primary key,
  company_id uuid,
  actor_id   uuid,
  action     text not null,
  entity     text not null,
  entity_id  text,
  entity_key jsonb,
  diff       jsonb not null default '{}'::jsonb,
  at         timestamptz not null default now()
);
comment on column public.audit_log.entity_id is
  'Primary-key value of the audited row; composite keys are joined with "/" in key order.';
comment on column public.audit_log.entity_key is
  'Primary key of the audited row as {column: value}, for exact lookups on any key shape.';
create index audit_log_company_at on public.audit_log (company_id, at desc);
create index audit_log_entity on public.audit_log (entity, entity_id);
create trigger audit_log_append_only before update or delete on public.audit_log
  for each row execute function private.forbid_mutation();

-- -----------------------------------------------------------------------------
-- Audit registry. Each audited table declares:
--   company_columns  which row columns name the companies that may read the entry
--                    (one entry per distinct company; none = platform admins only)
--   logged_columns   columns whose VALUES are copied into the diff
--   omitted_columns  noise or secrets dropped entirely (not even named)
-- Every other column — including any added later — is default-deny: the diff
-- records only that it was set or changed, under "redacted", never its value.
-- -----------------------------------------------------------------------------
create table private.audit_config (
  schema_name     text   not null,
  table_name      text   not null,
  pk_columns      text[] not null,
  company_columns text[] not null default '{}',
  logged_columns  text[] not null,
  omitted_columns text[] not null default '{}',
  primary key (schema_name, table_name)
);
revoke all on table private.audit_config from public, anon, authenticated, service_role;

-- Diff shape:
--   insert/delete  {"values":  {col: value, ...},              "redacted": [col, ...]}
--   update         {"changed": {col: {"from": v, "to": v}, ...}, "redacted": [col, ...]}
create or replace function private.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_cfg       private.audit_config;
  v_new       jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_old       jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_row       jsonb := coalesce(v_new, v_old);
  v_key       jsonb;
  v_entity_id text;
  v_values    jsonb := '{}'::jsonb;
  v_redacted  text[] := '{}';
  v_diff      jsonb;
  v_companies uuid[];
  r           record;
begin
  select * into v_cfg from private.audit_config c
  where c.schema_name = tg_table_schema and c.table_name = tg_table_name;

  -- A trigger without a registry entry must never leak data nor block the write.
  if not found then
    insert into public.audit_log (company_id, actor_id, action, entity, diff)
    values (null, auth.uid(), lower(tg_op), tg_table_name, jsonb_build_object('unconfigured', true));
    return coalesce(new, old);
  end if;

  select jsonb_object_agg(p.col, v_row -> p.col),
         string_agg(coalesce(v_row ->> p.col, ''), '/' order by p.ord)
  into v_key, v_entity_id
  from unnest(v_cfg.pk_columns) with ordinality as p(col, ord);

  for r in
    select e.key, e.value as new_value, v_old -> e.key as old_value
    from jsonb_each(v_row) e
    where not (e.key = any (v_cfg.omitted_columns))
      and case when tg_op = 'UPDATE' then e.value is distinct from (v_old -> e.key)
               else e.value <> 'null'::jsonb end
    order by e.key
  loop
    if r.key = any (v_cfg.logged_columns) then
      v_values := v_values || jsonb_build_object(r.key,
        case when tg_op = 'UPDATE' then jsonb_build_object('from', r.old_value, 'to', r.new_value)
             else r.new_value end);
    else
      v_redacted := v_redacted || r.key;
    end if;
  end loop;

  if tg_op = 'UPDATE' and v_values = '{}'::jsonb and cardinality(v_redacted) = 0 then
    return new;
  end if;

  v_diff := jsonb_build_object(case when tg_op = 'UPDATE' then 'changed' else 'values' end, v_values);
  if cardinality(v_redacted) > 0 then
    v_diff := v_diff || jsonb_build_object('redacted', to_jsonb(v_redacted));
  end if;

  select array_agg(distinct s.company) into v_companies
  from (select private.try_uuid(v_row ->> c) as company from unnest(v_cfg.company_columns) c) s
  where s.company is not null;

  insert into public.audit_log (company_id, actor_id, action, entity, entity_id, entity_key, diff)
  select c, auth.uid(), lower(tg_op), tg_table_name, v_entity_id, v_key, v_diff
  from unnest(coalesce(v_companies, array[null::uuid])) c;

  return coalesce(new, old);
end $$;

-- Registers (or re-registers) a table and attaches the trigger. Fails loudly on
-- unknown columns, overlapping lists or a missing primary key so a typo cannot
-- silently widen what is logged.
create or replace function private.attach_audit(
  p_table regclass, p_company_columns text[], p_logged text[], p_omitted text[] default '{}'
) returns void
language plpgsql set search_path = '' as $$
declare
  v_schema text;
  v_name   text;
  v_pk     text[];
  v_cols   text[];
  v_bad    text[];
begin
  select n.nspname, c.relname into v_schema, v_name
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where c.oid = p_table;

  select array_agg(a.attname::text order by array_position(i.indkey::int[], a.attnum::int))
  into v_pk
  from pg_catalog.pg_index i
  join pg_catalog.pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
  where i.indrelid = p_table and i.indisprimary;
  if v_pk is null then
    raise exception 'attach_audit: % has no primary key', p_table;
  end if;

  select array_agg(a.attname::text) into v_cols
  from pg_catalog.pg_attribute a
  where a.attrelid = p_table and a.attnum > 0 and not a.attisdropped;

  select array_agg(x) into v_bad
  from unnest(coalesce(p_company_columns, '{}') || coalesce(p_logged, '{}') || coalesce(p_omitted, '{}')) x
  where not (x = any (v_cols));
  if v_bad is not null then
    raise exception 'attach_audit: % has no column(s) %', p_table, v_bad;
  end if;

  select array_agg(x) into v_bad from unnest(p_logged) x where x = any (p_omitted);
  if v_bad is not null then
    raise exception 'attach_audit: column(s) % cannot be both logged and omitted', v_bad;
  end if;

  insert into private.audit_config as ac
    (schema_name, table_name, pk_columns, company_columns, logged_columns, omitted_columns)
  values (v_schema, v_name, v_pk, coalesce(p_company_columns, '{}'), coalesce(p_logged, '{}'), coalesce(p_omitted, '{}'))
  on conflict (schema_name, table_name) do update
    set pk_columns = excluded.pk_columns, company_columns = excluded.company_columns,
        logged_columns = excluded.logged_columns, omitted_columns = excluded.omitted_columns;

  execute format('drop trigger if exists audit_row on %s', p_table);
  execute format(
    'create trigger audit_row after insert or update or delete on %s for each row execute function private.audit_row()',
    p_table);
end $$;

-- Redacted by default here: licence number, issuing authority and expiry,
-- address, email, phone, description and media paths.
select private.attach_audit('public.companies',
  array['id'],
  array['id', 'soko_id', 'kind', 'legal_name', 'trading_name', 'country', 'emirate', 'website',
        'established', 'is_public', 'verification_status', 'verified_at', 'is_suspended', 'created_by'],
  array['created_at', 'updated_at']);

select private.attach_audit('public.company_memberships',
  array['company_id'],
  array['id', 'company_id', 'company_kind', 'user_id', 'role_key', 'status', 'invited_by', 'removed_at'],
  array['created_at', 'updated_at']);

-- Invitee email is redacted; the token hash is dropped entirely.
select private.attach_audit('public.company_invitations',
  array['company_id'],
  array['id', 'company_id', 'company_kind', 'role_key', 'expires_at', 'accepted_at', 'accepted_by',
        'revoked_at', 'invited_by'],
  array['token_hash', 'created_at']);

-- Licence document reference and reviewer note are redacted.
select private.attach_audit('public.company_verifications',
  array['company_id'],
  array['id', 'company_id', 'status', 'submitted_by', 'submitted_at', 'reviewed_by', 'reviewed_at']);

select private.attach_audit('public.platform_admins',
  array[]::text[],
  array['user_id', 'granted_at']);

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
      jsonb_build_object('verification_id', new.id, 'note', left(new.note, 500)));
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

select private.apply_function_grants();
