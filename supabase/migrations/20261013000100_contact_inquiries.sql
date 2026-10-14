-- =============================================================================
-- SOKO migration 13 — Contact Us inquiries
-- Additive. Does not alter migrations 01–12. Refuses to create a second copy
-- of contact_inquiries if staging already has the table.
--
-- Public submit is RPC-only (anon + authenticated EXECUTE). No table INSERT,
-- UPDATE or SELECT is granted to anon. Personal fields are never written to
-- audit_log; a dedicated trigger records metadata only.
-- =============================================================================

do $$
begin
  if to_regclass('public.contact_inquiries') is not null then
    raise exception 'public.contact_inquiries already exists; refusing to duplicate. Inspect staging and skip or reconcile this migration.';
  end if;
end $$;

select private.begin_function_scope();

-- Hourly/daily counters. Raw IP is never stored: only a SHA-256 hex digest.
-- Rows expire and are deleted on the next submit (48h retention).
create table private.contact_submit_throttle (
  kind         text not null check (kind in ('email', 'ip', 'global')),
  key_hash     text not null,
  window_start timestamptz not null,
  hits         integer not null check (hits > 0),
  expires_at   timestamptz not null,
  primary key (kind, key_hash, window_start)
);
revoke all on table private.contact_submit_throttle from public, anon, authenticated, service_role;

create sequence private.contact_inquiry_ref_seq as integer;

create table public.contact_inquiries (
  id           uuid primary key default gen_random_uuid(),
  reference    text not null unique
                 check (reference ~ '^SOKO-INQ-[0-9]{8}-[0-9]{5}$'),
  full_name    text not null check (char_length(full_name) between 2 and 120),
  company      text check (company is null or char_length(company) between 1 and 160),
  email        text not null check (char_length(email) between 5 and 254),
  email_norm   text not null check (char_length(email_norm) between 5 and 254),
  phone        text check (phone is null or char_length(phone) between 7 and 40),
  user_type    text not null check (user_type in ('Supplier', 'Buyer', 'Contractor', 'Other')),
  category     text not null check (category in (
                 'General Inquiry', 'Supplier Support', 'Buyer Support',
                 'Contractor Support', 'Partnership', 'Technical Support', 'Other')),
  subject      text not null check (char_length(subject) between 3 and 200),
  message      text not null check (char_length(message) between 10 and 8000),
  status       text not null default 'new' check (status in (
                 'new', 'open', 'in_progress', 'waiting', 'resolved', 'closed', 'spam')),
  assigned_to  uuid references auth.users (id) on delete set null,
  user_id      uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  closed_at    timestamptz
);
create index contact_inquiries_status_created on public.contact_inquiries (status, created_at desc);
create index contact_inquiries_email_norm_created on public.contact_inquiries (email_norm, created_at desc);
create index contact_inquiries_assigned_to on public.contact_inquiries (assigned_to) where assigned_to is not null;
create trigger contact_inquiries_updated_at before update on public.contact_inquiries
  for each row execute function private.set_updated_at();

create table public.contact_inquiry_notes (
  id          uuid primary key default gen_random_uuid(),
  inquiry_id  uuid not null references public.contact_inquiries (id) on delete cascade,
  author_id   uuid not null references auth.users (id) on delete restrict,
  body        text not null check (char_length(body) between 1 and 4000),
  created_at  timestamptz not null default now()
);
create index contact_inquiry_notes_inquiry_created on public.contact_inquiry_notes (inquiry_id, created_at);
create trigger contact_inquiry_notes_append_only before update or delete on public.contact_inquiry_notes
  for each row execute function private.forbid_mutation();
create trigger contact_inquiry_notes_no_truncate before truncate on public.contact_inquiry_notes
  for each statement execute function private.forbid_mutation();

-- -----------------------------------------------------------------------------
-- Metadata-only audit (does not use private.attach_audit / audit_row).
-- Never copies full_name, company, email, email_norm, phone, message, or note body.
-- -----------------------------------------------------------------------------
create or replace function private.audit_contact_inquiry() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_diff jsonb;
begin
  if tg_op = 'INSERT' then
    v_diff := jsonb_build_object(
      'reference', new.reference,
      'category', new.category,
      'user_type', new.user_type,
      'status', new.status);
    insert into public.audit_log (company_id, actor_id, action, entity, entity_id, entity_key, diff)
    values (null, auth.uid(), 'insert', 'contact_inquiries', new.id::text,
            jsonb_build_object('id', new.id), v_diff);
    return new;
  end if;

  if new.status is not distinct from old.status
     and new.assigned_to is not distinct from old.assigned_to
     and new.closed_at is not distinct from old.closed_at then
    return new;
  end if;

  v_diff := jsonb_build_object('changed', jsonb_strip_nulls(jsonb_build_object(
    'status', case when new.status is distinct from old.status
              then jsonb_build_object('from', old.status, 'to', new.status) end,
    'assigned_to', case when new.assigned_to is distinct from old.assigned_to
                   then jsonb_build_object('from', old.assigned_to, 'to', new.assigned_to) end,
    'closed_at', case when new.closed_at is distinct from old.closed_at
                 then jsonb_build_object('set', true) end)));
  insert into public.audit_log (company_id, actor_id, action, entity, entity_id, entity_key, diff)
  values (null, auth.uid(), 'update', 'contact_inquiries', new.id::text,
          jsonb_build_object('id', new.id), v_diff);
  return new;
end $$;

create trigger contact_inquiries_audit after insert or update on public.contact_inquiries
  for each row execute function private.audit_contact_inquiry();

create or replace function private.audit_contact_inquiry_note() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log (company_id, actor_id, action, entity, entity_id, entity_key, diff)
  values (null, auth.uid(), 'insert', 'contact_inquiry_notes', new.id::text,
          jsonb_build_object('id', new.id),
          jsonb_build_object('inquiry_id', new.inquiry_id));
  return new;
end $$;

create trigger contact_inquiry_notes_audit after insert on public.contact_inquiry_notes
  for each row execute function private.audit_contact_inquiry_note();

create or replace function private.notify_contact_inquiry_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify_platform_admins(
    'contact_inquiry.created',
    jsonb_build_object('id', new.id, 'reference', new.reference, 'category', new.category));
  return new;
end $$;

create trigger contact_inquiries_notify after insert on public.contact_inquiries
  for each row execute function private.notify_contact_inquiry_created();

-- -----------------------------------------------------------------------------
-- RLS and grants — no anon table access; authenticated SELECT for admins only.
-- -----------------------------------------------------------------------------
alter table public.contact_inquiries enable row level security;
alter table public.contact_inquiry_notes enable row level security;

select private.reset_table_grants('public.contact_inquiries');
grant select on public.contact_inquiries to authenticated;
create policy contact_inquiries_admin_read on public.contact_inquiries
  for select to authenticated using (private.is_platform_admin());

select private.reset_table_grants('public.contact_inquiry_notes');
grant select on public.contact_inquiry_notes to authenticated;
create policy contact_inquiry_notes_admin_read on public.contact_inquiry_notes
  for select to authenticated using (private.is_platform_admin());

-- -----------------------------------------------------------------------------
-- Submit + admin RPCs
-- -----------------------------------------------------------------------------
create or replace function private.contact_throttle_hit(p_kind text, p_key text, p_window interval, p_limit integer)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_hash text := encode(sha256(convert_to(p_key, 'UTF8')), 'hex');
  v_start timestamptz := date_trunc('hour', now());
  v_hits integer;
begin
  if p_window >= interval '1 day' then
    v_start := date_trunc('day', now());
  end if;

  -- Two-arg form is (int4, int4) only — not (int, bigint).
  perform pg_advisory_xact_lock(
    813001,
    ('x' || substr(encode(sha256(convert_to(p_kind || ':' || p_key, 'UTF8')), 'hex'), 1, 8))::bit(32)::integer);

  delete from private.contact_submit_throttle where expires_at < now();

  insert into private.contact_submit_throttle (kind, key_hash, window_start, hits, expires_at)
  values (p_kind, v_hash, v_start, 1, now() + interval '48 hours')
  on conflict (kind, key_hash, window_start)
  do update set hits = private.contact_submit_throttle.hits + 1
  returning hits into v_hits;

  if v_hits > p_limit then
    raise exception 'inquiry limit reached' using errcode = '54000';
  end if;
end $$;

create or replace function public.submit_contact_inquiry(
  p_full_name text,
  p_company text,
  p_email text,
  p_phone text,
  p_user_type text,
  p_category text,
  p_subject text,
  p_message text,
  p_honeypot text default ''
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := btrim(coalesce(p_full_name, ''));
  v_company text := nullif(btrim(coalesce(p_company, '')), '');
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_subject text := btrim(coalesce(p_subject, ''));
  v_message text := btrim(coalesce(p_message, ''));
  v_ip text := host(coalesce(inet_client_addr(), '0.0.0.0'::inet));
  v_id uuid;
  v_ref text;
begin
  -- Bots that fill hidden fields are dropped without storing anything.
  if length(btrim(coalesce(p_honeypot, ''))) > 0 then
    return jsonb_build_object('ok', true, 'ignored', true);
  end if;

  if char_length(v_name) < 2 then
    raise exception 'invalid full name' using errcode = '22023';
  end if;
  if v_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  if v_phone is not null and v_phone !~ '^\+?[\d\s().-]{7,20}$' then
    raise exception 'invalid phone' using errcode = '22023';
  end if;
  if p_user_type not in ('Supplier', 'Buyer', 'Contractor', 'Other') then
    raise exception 'invalid user type' using errcode = '22023';
  end if;
  if p_category not in (
       'General Inquiry', 'Supplier Support', 'Buyer Support',
       'Contractor Support', 'Partnership', 'Technical Support', 'Other') then
    raise exception 'invalid category' using errcode = '22023';
  end if;
  if char_length(v_subject) < 3 then
    raise exception 'invalid subject' using errcode = '22023';
  end if;
  if char_length(v_message) < 10 then
    raise exception 'invalid message' using errcode = '22023';
  end if;

  -- Serialise counters for the same email / IP / global window (concurrency-safe).
  perform pg_advisory_xact_lock(813001, 1);
  perform private.contact_throttle_hit('global', 'all', interval '1 hour', 30);
  perform private.contact_throttle_hit('email', v_email, interval '1 day', 3);
  perform private.contact_throttle_hit('ip', v_ip, interval '1 hour', 8);

  v_ref := 'SOKO-INQ-' || to_char(timezone('utc', now()), 'YYYYMMDD') || '-' ||
           lpad(nextval('private.contact_inquiry_ref_seq')::text, 5, '0');

  insert into public.contact_inquiries (
    reference, full_name, company, email, email_norm, phone, user_type, category,
    subject, message, user_id
  ) values (
    v_ref, left(v_name, 120), left(v_company, 160), left(v_email, 254), v_email,
    left(v_phone, 40), p_user_type, p_category, left(v_subject, 200), left(v_message, 8000),
    auth.uid()
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'reference', v_ref);
end $$;

create or replace function public.admin_update_contact_inquiry(
  p_id uuid, p_status text default null, p_assigned_to uuid default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_platform_admin();
  if p_status is not null and p_status not in ('new', 'open', 'in_progress', 'waiting', 'resolved', 'closed', 'spam') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  if p_assigned_to is not null and not exists (
       select 1 from public.platform_admins pa where pa.user_id = p_assigned_to) then
    raise exception 'assignee must be a platform admin' using errcode = '22023';
  end if;
  if not exists (select 1 from public.contact_inquiries i where i.id = p_id) then
    raise exception 'inquiry not found' using errcode = 'P0002';
  end if;

  -- Callers send the intended assignee (null = unassigned) together with status.
  update public.contact_inquiries
  set status = coalesce(p_status, status),
      assigned_to = p_assigned_to,
      closed_at = case
        when coalesce(p_status, status) in ('resolved', 'closed', 'spam') then coalesce(closed_at, now())
        when p_status is not null then null
        else closed_at
      end
  where id = p_id;
end $$;

create or replace function public.admin_add_contact_inquiry_note(p_id uuid, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_platform_admin();
  v_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if char_length(v_body) < 1 then
    raise exception 'note is required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.contact_inquiries i where i.id = p_id) then
    raise exception 'inquiry not found' using errcode = 'P0002';
  end if;
  insert into public.contact_inquiry_notes (inquiry_id, author_id, body)
  values (p_id, v_uid, left(v_body, 4000))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.admin_list_contact_assignees()
returns table (user_id uuid, full_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_platform_admin();
  return query
  select pa.user_id, coalesce(p.full_name, '')::text
  from public.platform_admins pa
  left join public.profiles p on p.id = pa.user_id
  order by 2, 1;
end $$;

-- Extend dashboard counters; same privilege as migration 12.
create or replace function public.admin_platform_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_platform_admin();
  return jsonb_build_object(
    'users',                 (select count(*) from public.profiles),
    'companies',             (select count(*) from public.companies),
    'suppliers',             (select count(*) from public.companies where kind = 'supplier'),
    'contractors',           (select count(*) from public.companies where kind = 'contractor'),
    'verified',              (select count(*) from public.companies where verification_status = 'verified'),
    'pending_verifications', (select count(*) from public.company_verifications where status = 'pending'),
    'campaigns_pending',     (select count(*) from public.campaigns where status = 'pending_review'),
    'open_reports',          (select count(*) from public.content_reports where status = 'open'),
    'published_products',    (select count(*) from public.products where status = 'published'),
    'open_contact_inquiries',(select count(*) from public.contact_inquiries
                              where status in ('new', 'open', 'in_progress', 'waiting')));
end $$;

select private.allow_execute(array['anon', 'authenticated'], array[
  'public.submit_contact_inquiry(text, text, text, text, text, text, text, text, text)'
]);
select private.allow_execute(array['authenticated'], array[
  'public.admin_update_contact_inquiry(uuid, text, uuid)',
  'public.admin_add_contact_inquiry_note(uuid, text)',
  'public.admin_list_contact_assignees()'
]);

select private.apply_function_grants();
