-- =============================================================================
-- SOKO migration 09 — Visits
-- A visit is ONE shared record between a supplier and a host company. Both
-- sides read it; status moves only through set_visit_status, which enforces
-- who may make each transition. Notes and tasks are private to each side.
-- =============================================================================

create table public.visits (
  id                    uuid primary key default gen_random_uuid(),
  supplier_company_id   uuid not null references public.companies (id) on delete cascade,
  host_company_id       uuid not null references public.companies (id) on delete cascade,
  requested_by_company  uuid not null references public.companies (id) on delete cascade,
  scheduled_at          timestamptz not null,
  duration_minutes      smallint not null default 60 check (duration_minutes between 5 and 600),
  location              text check (char_length(location) <= 300),
  purpose               text check (char_length(purpose) <= 2000),
  visit_type            text check (char_length(visit_type) <= 60),
  status                public.visit_status not null default 'pending-confirmation',
  kiosk_badge           text unique,
  check_in_at           timestamptz,
  check_out_at          timestamptz,
  created_by            uuid references auth.users (id) on delete set null,
  confirmed_by          uuid references auth.users (id) on delete set null,
  declined_by           uuid references auth.users (id) on delete set null,
  status_reason         text check (char_length(status_reason) <= 1000),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (supplier_company_id <> host_company_id),
  check (requested_by_company in (supplier_company_id, host_company_id))
);
create index visits_host_time on public.visits (host_company_id, scheduled_at);
create index visits_supplier_time on public.visits (supplier_company_id, scheduled_at);
create trigger visits_updated_at before update on public.visits
  for each row execute function private.set_updated_at();
select private.attach_audit('public.visits');

create table public.visit_attendees (
  id         uuid primary key default gen_random_uuid(),
  visit_id   uuid not null references public.visits (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id    uuid references auth.users (id) on delete set null,
  full_name  text not null check (char_length(full_name) <= 120),
  email      text check (char_length(email) <= 254)
);
create index on public.visit_attendees (visit_id);

create table public.visit_products (
  visit_id   uuid not null references public.visits (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  primary key (visit_id, product_id)
);

create table public.visit_notes (
  id         uuid primary key default gen_random_uuid(),
  visit_id   uuid not null references public.visits (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 5000),
  author_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index on public.visit_notes (visit_id, company_id);

create table public.visit_tasks (
  id          uuid primary key default gen_random_uuid(),
  visit_id    uuid not null references public.visits (id) on delete cascade,
  company_id  uuid not null references public.companies (id) on delete cascade,
  kind        text not null default 'task' check (kind in ('task', 'follow_up')),
  title       text not null check (char_length(title) between 1 and 200),
  status      public.task_status not null default 'pending',
  assignee_id uuid references auth.users (id) on delete set null,
  due_on      date,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on public.visit_tasks (visit_id, company_id);
create trigger visit_tasks_updated_at before update on public.visit_tasks
  for each row execute function private.set_updated_at();
create trigger visit_tasks_created_by before insert on public.visit_tasks
  for each row execute function private.stamp_created_by();

-- -----------------------------------------------------------------------------
-- Predicates
-- -----------------------------------------------------------------------------
create or replace function private.is_visit_party(p_visit uuid, p_company uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.visits v
                 where v.id = p_visit and p_company in (v.supplier_company_id, v.host_company_id));
$$;

create or replace function private.can_read_visit(p_visit uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.visits v
                 where v.id = p_visit
                   and (private.is_member(v.supplier_company_id) or private.is_member(v.host_company_id)));
$$;

-- Companies that have a working relationship with one of mine. Lets members
-- see the name and profile of non-public counterparties. Extended in 10.
create or replace function private.is_counterparty(p_company uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
      select 1 from public.visits v
      where (v.host_company_id = p_company and private.is_member(v.supplier_company_id))
         or (v.supplier_company_id = p_company and private.is_member(v.host_company_id)))
    or exists (
      select 1 from public.document_shares s
      where s.revoked_at is null
        and ((s.owner_company_id = p_company and private.is_member(s.recipient_company_id))
          or (s.recipient_company_id = p_company and private.is_member(s.owner_company_id))))
    or exists (
      select 1 from public.vendor_records vr
      where (vr.supplier_company_id = p_company and private.is_member(vr.contractor_company_id))
         or (vr.contractor_company_id = p_company and private.is_member(vr.supplier_company_id)));
$$;

grant execute on function private.is_visit_party(uuid, uuid) to authenticated;
grant execute on function private.can_read_visit(uuid) to authenticated;
grant execute on function private.is_counterparty(uuid) to authenticated;

create policy companies_counterparty_read on public.companies
  for select to authenticated using (private.is_counterparty(id));

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.visits          enable row level security;
alter table public.visit_attendees enable row level security;
alter table public.visit_products  enable row level security;
alter table public.visit_notes     enable row level security;
alter table public.visit_tasks     enable row level security;

select private.reset_table_grants('public.visits');
grant select on public.visits to authenticated;
create policy visits_read on public.visits
  for select to authenticated
  using (private.is_member(supplier_company_id) or private.is_member(host_company_id));

select private.reset_table_grants('public.visit_attendees');
grant select, insert, delete on public.visit_attendees to authenticated;
create policy visit_attendees_read on public.visit_attendees
  for select to authenticated using (private.can_read_visit(visit_id));
create policy visit_attendees_insert on public.visit_attendees
  for insert to authenticated
  with check (private.has_permission(company_id, 'visits.manage') and private.is_visit_party(visit_id, company_id));
create policy visit_attendees_delete on public.visit_attendees
  for delete to authenticated using (private.has_permission(company_id, 'visits.manage'));

create or replace function private.can_manage_visit_products(p_visit uuid, p_product uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.visits v join public.products p on p.company_id = v.supplier_company_id
                 where v.id = p_visit and p.id = p_product
                   and private.has_permission(v.supplier_company_id, 'visits.manage'));
$$;
grant execute on function private.can_manage_visit_products(uuid, uuid) to authenticated;

select private.reset_table_grants('public.visit_products');
grant select, insert, delete on public.visit_products to authenticated;
create policy visit_products_read on public.visit_products
  for select to authenticated using (private.can_read_visit(visit_id));
create policy visit_products_insert on public.visit_products
  for insert to authenticated with check (private.can_manage_visit_products(visit_id, product_id));
create policy visit_products_delete on public.visit_products
  for delete to authenticated using (private.can_manage_visit_products(visit_id, product_id));

-- Notes and tasks: only the authoring company's members ever see them.
select private.reset_table_grants('public.visit_notes');
grant select, delete on public.visit_notes to authenticated;
grant insert (visit_id, company_id, body), update (body) on public.visit_notes to authenticated;
create policy visit_notes_read on public.visit_notes
  for select to authenticated using (private.is_member(company_id));
create policy visit_notes_insert on public.visit_notes
  for insert to authenticated
  with check (author_id = auth.uid() and private.is_member(company_id) and private.is_visit_party(visit_id, company_id));
create policy visit_notes_update on public.visit_notes
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy visit_notes_delete on public.visit_notes
  for delete to authenticated
  using (author_id = auth.uid() or private.has_permission(company_id, 'records.delete'));

select private.reset_table_grants('public.visit_tasks');
grant select, delete on public.visit_tasks to authenticated;
grant insert (visit_id, company_id, kind, title, status, assignee_id, due_on),
      update (kind, title, status, assignee_id, due_on)
  on public.visit_tasks to authenticated;
create policy visit_tasks_read on public.visit_tasks
  for select to authenticated using (private.is_member(company_id));
create policy visit_tasks_insert on public.visit_tasks
  for insert to authenticated
  with check (private.has_permission(company_id, 'visits.manage') and private.is_visit_party(visit_id, company_id));
create policy visit_tasks_update on public.visit_tasks
  for update to authenticated
  using (private.has_permission(company_id, 'visits.manage'))
  with check (private.has_permission(company_id, 'visits.manage'));
create policy visit_tasks_delete on public.visit_tasks
  for delete to authenticated using (private.has_permission(company_id, 'visits.manage'));

-- -----------------------------------------------------------------------------
-- Trusted RPCs
-- -----------------------------------------------------------------------------
create or replace function public.request_visit(
  p_my_company uuid, p_other_company uuid, p_scheduled_at timestamptz,
  p_duration_minutes smallint default 60, p_location text default null,
  p_purpose text default null, p_visit_type text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_my_kind public.company_kind;
  v_other_kind public.company_kind;
  v_id uuid;
begin
  if not private.has_permission(p_my_company, 'visits.manage') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select c.kind into v_my_kind from public.companies c where c.id = p_my_company;
  select c.kind into v_other_kind from public.companies c where c.id = p_other_company and not c.is_suspended;
  if v_other_kind is null or v_other_kind = v_my_kind then
    raise exception 'a visit needs one supplier and one host company' using errcode = '22023';
  end if;
  if p_scheduled_at < now() then
    raise exception 'visit must be in the future' using errcode = '22023';
  end if;
  if (select count(*) from public.visits v
      where v.requested_by_company = p_my_company and v.created_at > now() - interval '1 day') >= 100 then
    raise exception 'visit request limit reached' using errcode = '54000';
  end if;

  insert into public.visits (supplier_company_id, host_company_id, requested_by_company, scheduled_at,
                             duration_minutes, location, purpose, visit_type, created_by)
  values (case when v_my_kind = 'supplier' then p_my_company else p_other_company end,
          case when v_my_kind = 'supplier' then p_other_company else p_my_company end,
          p_my_company, p_scheduled_at, coalesce(p_duration_minutes, 60),
          left(p_location, 300), left(p_purpose, 2000), left(p_visit_type, 60), v_uid)
  returning id into v_id;

  perform private.notify_permission_holders(p_other_company, 'visits.manage', 'visit.requested',
    jsonb_build_object('visit_id', v_id, 'scheduled_at', p_scheduled_at));
  return v_id;
end $$;

-- Transition rules:
--   scheduled | declined   from pending-confirmation, by the side that did NOT request it
--   cancelled              from pending-confirmation | scheduled, by either side
--   checked-in             from scheduled, host only
--   in-meeting             from checked-in, host only
--   completed              from checked-in | in-meeting, host only
--   no-show                from scheduled after the start time, host only
create or replace function public.set_visit_status(
  p_visit uuid, p_acting_company uuid, p_status public.visit_status, p_reason text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v public.visits%rowtype;
  v_is_host boolean;
  v_other uuid;
  v_ok boolean := false;
begin
  select * into v from public.visits where id = p_visit for update;
  if v.id is null or p_acting_company not in (v.supplier_company_id, v.host_company_id)
     or not private.has_permission(p_acting_company, 'visits.manage') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  v_is_host := p_acting_company = v.host_company_id;
  v_other := case when v_is_host then v.supplier_company_id else v.host_company_id end;

  v_ok := case p_status
    when 'scheduled'  then v.status = 'pending-confirmation' and p_acting_company <> v.requested_by_company
    when 'declined'   then v.status = 'pending-confirmation' and p_acting_company <> v.requested_by_company
    when 'cancelled'  then v.status in ('pending-confirmation', 'scheduled')
    when 'checked-in' then v_is_host and v.status = 'scheduled'
    when 'in-meeting' then v_is_host and v.status = 'checked-in'
    when 'completed'  then v_is_host and v.status in ('checked-in', 'in-meeting')
    when 'no-show'    then v_is_host and v.status = 'scheduled' and v.scheduled_at < now()
    else false
  end;
  if not v_ok then
    raise exception 'transition % -> % is not allowed for this side', v.status, p_status using errcode = '42501';
  end if;

  update public.visits set
    status        = p_status,
    status_reason = case when p_status in ('declined', 'cancelled', 'no-show') then left(p_reason, 1000) else status_reason end,
    confirmed_by  = case when p_status = 'scheduled' then v_uid else confirmed_by end,
    declined_by   = case when p_status = 'declined' then v_uid else declined_by end,
    kiosk_badge   = case when p_status = 'scheduled'
                         then 'V-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
                         else kiosk_badge end,
    check_in_at   = case when p_status = 'checked-in' then now() else check_in_at end,
    check_out_at  = case when p_status = 'completed' then now() else check_out_at end
  where id = p_visit;

  perform private.notify_permission_holders(v_other, 'visits.manage', 'visit.' || replace(p_status::text, '-', '_'),
    jsonb_build_object('visit_id', v.id));
end $$;

-- Changing time or place sends the visit back for the other side to confirm.
create or replace function public.update_visit_details(
  p_visit uuid, p_acting_company uuid, p_scheduled_at timestamptz,
  p_duration_minutes smallint, p_location text, p_purpose text
) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.visits%rowtype;
begin
  perform private.require_user();
  select * into v from public.visits where id = p_visit for update;
  if v.id is null or p_acting_company not in (v.supplier_company_id, v.host_company_id)
     or not private.has_permission(p_acting_company, 'visits.manage')
     or v.status not in ('pending-confirmation', 'scheduled') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_scheduled_at < now() then
    raise exception 'visit must be in the future' using errcode = '22023';
  end if;
  update public.visits set
    scheduled_at = p_scheduled_at,
    duration_minutes = coalesce(p_duration_minutes, duration_minutes),
    location = left(p_location, 300),
    purpose = left(p_purpose, 2000),
    status = 'pending-confirmation',
    requested_by_company = p_acting_company,
    kiosk_badge = null
  where id = p_visit;
  perform private.notify_permission_holders(
    case when p_acting_company = v.host_company_id then v.supplier_company_id else v.host_company_id end,
    'visits.manage', 'visit.rescheduled', jsonb_build_object('visit_id', v.id, 'scheduled_at', p_scheduled_at));
end $$;

select private.lock_down_public_functions();
