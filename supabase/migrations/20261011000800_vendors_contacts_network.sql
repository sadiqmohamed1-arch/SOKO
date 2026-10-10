-- =============================================================================
-- SOKO migration 08 — Vendors, compliance, private contacts and the network
-- Vendor records, vendor notes and company contacts are private to the
-- company that keeps them. Suppliers see only the compliance requirements
-- addressed to them and their own submissions. Business cards and
-- connections are personal (user-owned), not company data.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Personal network
-- -----------------------------------------------------------------------------
create table public.business_cards (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 120),
  title         text check (char_length(title) <= 120),
  company_label text check (char_length(company_label) <= 200),
  email         text check (char_length(email) <= 254),
  phone         text check (char_length(phone) <= 40),
  linkedin_url  text check (char_length(linkedin_url) <= 300),
  bio           text check (char_length(bio) <= 1000),
  is_public     boolean not null default false,
  updated_at    timestamptz not null default now()
);
create trigger business_cards_updated_at before update on public.business_cards
  for each row execute function private.set_updated_at();

create table public.connections (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status       public.connection_status not null default 'pending',
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);
create unique index connections_pair_uq
  on public.connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index on public.connections (addressee_id, status);

create or replace function private.connections_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.connections c
      where c.requester_id = new.requester_id and c.created_at > now() - interval '1 day') >= 50 then
    raise exception 'connection request limit reached' using errcode = '54000';
  end if;
  return new;
end $$;
create trigger connections_rate_limit before insert on public.connections
  for each row execute function private.connections_rate_limit();

create or replace function private.is_connected(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.connections c
    where c.status = 'accepted'
      and ((c.requester_id = auth.uid() and c.addressee_id = p_user)
        or (c.addressee_id = auth.uid() and c.requester_id = p_user)));
$$;
grant execute on function private.is_connected(uuid) to authenticated;

create policy profiles_select_connections on public.profiles
  for select to authenticated using (private.is_connected(id));

-- -----------------------------------------------------------------------------
-- Company-private CRM contacts
-- -----------------------------------------------------------------------------
create table public.company_contacts (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies (id) on delete cascade,
  kind              text not null default 'other'
                    check (kind in ('buyer','supplier','contractor','consultant','other')),
  full_name         text not null check (char_length(full_name) between 1 and 120),
  title             text check (char_length(title) <= 120),
  organisation      text check (char_length(organisation) <= 200),
  email             text check (char_length(email) <= 254),
  phone             text check (char_length(phone) <= 40),
  notes             text check (char_length(notes) <= 5000),
  linked_user_id    uuid references auth.users (id) on delete set null,
  source_company_id uuid references public.companies (id) on delete set null,
  consent_to_share  boolean not null default false,
  created_by        uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on public.company_contacts (company_id);
create trigger company_contacts_updated_at before update on public.company_contacts
  for each row execute function private.set_updated_at();
create trigger company_contacts_created_by before insert on public.company_contacts
  for each row execute function private.stamp_created_by();

-- -----------------------------------------------------------------------------
-- Contractor vendor management
-- -----------------------------------------------------------------------------
create table public.vendor_records (
  id                    uuid primary key default gen_random_uuid(),
  contractor_company_id uuid not null,
  contractor_kind       public.company_kind not null default 'contractor' check (contractor_kind = 'contractor'),
  supplier_company_id   uuid references public.companies (id) on delete set null,
  external_name         text check (char_length(external_name) <= 200),
  trade_category        text check (char_length(trade_category) <= 120),
  approval_status       public.vendor_approval_status not null default 'not-reviewed',
  approval_note         text check (char_length(approval_note) <= 2000),
  approved_by           uuid references auth.users (id) on delete set null,
  approved_at           timestamptz,
  contact_name          text check (char_length(contact_name) <= 120),
  contact_email         text check (char_length(contact_email) <= 254),
  contact_phone         text check (char_length(contact_phone) <= 40),
  created_by            uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (contractor_company_id, contractor_kind) references public.companies (id, kind) on delete cascade,
  check (supplier_company_id is not null or external_name is not null),
  unique (contractor_company_id, supplier_company_id)
);
create index on public.vendor_records (supplier_company_id);
create trigger vendor_records_updated_at before update on public.vendor_records
  for each row execute function private.set_updated_at();
create trigger vendor_records_created_by before insert on public.vendor_records
  for each row execute function private.stamp_created_by();
select private.attach_audit('public.vendor_records');

create table public.vendor_notes (
  id                    uuid primary key default gen_random_uuid(),
  vendor_record_id      uuid not null references public.vendor_records (id) on delete cascade,
  contractor_company_id uuid not null references public.companies (id) on delete cascade,
  body                  text not null check (char_length(body) between 1 and 5000),
  author_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at            timestamptz not null default now()
);
create index on public.vendor_notes (vendor_record_id);

create table public.vendor_compliance_requirements (
  id                    uuid primary key default gen_random_uuid(),
  contractor_company_id uuid not null references public.companies (id) on delete cascade,
  vendor_record_id      uuid references public.vendor_records (id) on delete cascade,  -- null = all vendors
  name                  text not null check (char_length(name) between 1 and 200),
  document_category     text check (char_length(document_category) <= 120),
  mandatory             boolean not null default true,
  created_by            uuid,
  created_at            timestamptz not null default now()
);
create index on public.vendor_compliance_requirements (contractor_company_id);
create trigger vendor_requirements_created_by before insert on public.vendor_compliance_requirements
  for each row execute function private.stamp_created_by();

create table public.vendor_compliance_submissions (
  id                  uuid primary key default gen_random_uuid(),
  requirement_id      uuid not null references public.vendor_compliance_requirements (id) on delete cascade,
  vendor_record_id    uuid not null references public.vendor_records (id) on delete cascade,
  supplier_company_id uuid not null references public.companies (id) on delete cascade,
  document_version_id uuid not null references public.document_versions (id) on delete cascade,
  status              public.vendor_doc_status not null default 'submitted',
  submitted_by        uuid references auth.users (id) on delete set null,
  submitted_at        timestamptz not null default now(),
  reviewed_by         uuid references auth.users (id) on delete set null,
  reviewed_at         timestamptz,
  review_note         text check (char_length(review_note) <= 2000),
  unique (requirement_id, vendor_record_id)
);
create index on public.vendor_compliance_submissions (supplier_company_id);
select private.attach_audit('public.vendor_compliance_submissions');

-- Supplier-side visibility helpers (the supplier cannot read vendor_records).
create or replace function private.is_vendor_supplier(p_vendor_record uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.vendor_records v
                 where v.id = p_vendor_record and private.is_member(v.supplier_company_id));
$$;
create or replace function private.is_supplier_of(p_contractor uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.vendor_records v
                 where v.contractor_company_id = p_contractor and private.is_member(v.supplier_company_id));
$$;
create or replace function private.vendor_record_company(p_vendor_record uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select v.contractor_company_id from public.vendor_records v where v.id = p_vendor_record;
$$;
grant execute on function private.is_vendor_supplier(uuid) to authenticated;
grant execute on function private.is_supplier_of(uuid) to authenticated;
grant execute on function private.vendor_record_company(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.business_cards                 enable row level security;
alter table public.connections                    enable row level security;
alter table public.company_contacts               enable row level security;
alter table public.vendor_records                 enable row level security;
alter table public.vendor_notes                   enable row level security;
alter table public.vendor_compliance_requirements enable row level security;
alter table public.vendor_compliance_submissions  enable row level security;

select private.reset_table_grants('public.business_cards');
grant select, insert, update, delete on public.business_cards to authenticated;
create policy business_cards_read on public.business_cards
  for select to authenticated
  using (user_id = auth.uid() or is_public or private.is_connected(user_id) or private.shares_company_with(user_id));
create policy business_cards_insert on public.business_cards
  for insert to authenticated with check (user_id = auth.uid());
create policy business_cards_update on public.business_cards
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy business_cards_delete on public.business_cards
  for delete to authenticated using (user_id = auth.uid());

select private.reset_table_grants('public.connections');
grant select, delete on public.connections to authenticated;
grant insert (addressee_id) on public.connections to authenticated;
create policy connections_read on public.connections
  for select to authenticated using (auth.uid() in (requester_id, addressee_id));
create policy connections_insert on public.connections
  for insert to authenticated with check (requester_id = auth.uid() and status = 'pending');
-- A block can only be lifted by the person who placed it.
create policy connections_delete on public.connections
  for delete to authenticated
  using (auth.uid() in (requester_id, addressee_id) and (status <> 'blocked' or addressee_id = auth.uid()));

select private.reset_table_grants('public.company_contacts');
grant select, delete on public.company_contacts to authenticated;
grant insert (company_id, kind, full_name, title, organisation, email, phone, notes,
              linked_user_id, source_company_id, consent_to_share),
      update (kind, full_name, title, organisation, email, phone, notes,
              linked_user_id, source_company_id, consent_to_share)
  on public.company_contacts to authenticated;
create policy company_contacts_read on public.company_contacts
  for select to authenticated using (private.is_member(company_id));
create policy company_contacts_insert on public.company_contacts
  for insert to authenticated with check (private.has_permission(company_id, 'contacts.manage'));
create policy company_contacts_update on public.company_contacts
  for update to authenticated
  using (private.has_permission(company_id, 'contacts.manage'))
  with check (private.has_permission(company_id, 'contacts.manage'));
create policy company_contacts_delete on public.company_contacts
  for delete to authenticated using (private.has_permission(company_id, 'records.delete'));

-- Approval columns are excluded from client grants: set_vendor_approval only.
select private.reset_table_grants('public.vendor_records');
grant select, delete on public.vendor_records to authenticated;
grant insert (contractor_company_id, supplier_company_id, external_name, trade_category,
              contact_name, contact_email, contact_phone),
      update (external_name, trade_category, contact_name, contact_email, contact_phone)
  on public.vendor_records to authenticated;
create policy vendor_records_read on public.vendor_records
  for select to authenticated using (private.is_member(contractor_company_id));
create policy vendor_records_insert on public.vendor_records
  for insert to authenticated with check (private.has_permission(contractor_company_id, 'contacts.manage'));
create policy vendor_records_update on public.vendor_records
  for update to authenticated
  using (private.has_permission(contractor_company_id, 'contacts.manage'))
  with check (private.has_permission(contractor_company_id, 'contacts.manage'));
create policy vendor_records_delete on public.vendor_records
  for delete to authenticated using (private.has_permission(contractor_company_id, 'records.delete'));

select private.reset_table_grants('public.vendor_notes');
grant select, delete on public.vendor_notes to authenticated;
grant insert (vendor_record_id, contractor_company_id, body), update (body) on public.vendor_notes to authenticated;
create policy vendor_notes_read on public.vendor_notes
  for select to authenticated using (private.is_member(contractor_company_id));
create policy vendor_notes_insert on public.vendor_notes
  for insert to authenticated
  with check (author_id = auth.uid()
              and private.has_permission(contractor_company_id, 'contacts.manage')
              and private.vendor_record_company(vendor_record_id) = contractor_company_id);
create policy vendor_notes_update on public.vendor_notes
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy vendor_notes_delete on public.vendor_notes
  for delete to authenticated
  using (author_id = auth.uid() or private.has_permission(contractor_company_id, 'records.delete'));

select private.reset_table_grants('public.vendor_compliance_requirements');
grant select, delete on public.vendor_compliance_requirements to authenticated;
grant insert (contractor_company_id, vendor_record_id, name, document_category, mandatory),
      update (name, document_category, mandatory)
  on public.vendor_compliance_requirements to authenticated;
create policy vendor_requirements_read on public.vendor_compliance_requirements
  for select to authenticated
  using (private.is_member(contractor_company_id)
         or (vendor_record_id is not null and private.is_vendor_supplier(vendor_record_id))
         or (vendor_record_id is null and private.is_supplier_of(contractor_company_id)));
create policy vendor_requirements_insert on public.vendor_compliance_requirements
  for insert to authenticated
  with check (private.has_permission(contractor_company_id, 'vendors.approve')
              and (vendor_record_id is null
                   or private.vendor_record_company(vendor_record_id) = contractor_company_id));
create policy vendor_requirements_update on public.vendor_compliance_requirements
  for update to authenticated
  using (private.has_permission(contractor_company_id, 'vendors.approve'))
  with check (private.has_permission(contractor_company_id, 'vendors.approve'));
create policy vendor_requirements_delete on public.vendor_compliance_requirements
  for delete to authenticated using (private.has_permission(contractor_company_id, 'vendors.approve'));

select private.reset_table_grants('public.vendor_compliance_submissions');
grant select on public.vendor_compliance_submissions to authenticated;
create policy vendor_submissions_read on public.vendor_compliance_submissions
  for select to authenticated
  using (private.is_member(supplier_company_id)
         or private.is_member(private.vendor_record_company(vendor_record_id)));

-- -----------------------------------------------------------------------------
-- Trusted RPCs
-- -----------------------------------------------------------------------------
create or replace function public.respond_connection(p_connection uuid, p_action text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_c public.connections%rowtype;
begin
  select * into v_c from public.connections where id = p_connection for update;
  if v_c.id is null or v_c.addressee_id <> v_uid then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_action not in ('accept', 'decline', 'block') then
    raise exception 'invalid action' using errcode = '22023';
  end if;
  if v_c.status <> 'pending' and p_action <> 'block' then
    raise exception 'connection is not pending' using errcode = '22023';
  end if;
  update public.connections
  set status = case p_action when 'accept' then 'accepted'::public.connection_status
                             when 'decline' then 'declined'::public.connection_status
                             else 'blocked'::public.connection_status end,
      responded_at = now()
  where id = p_connection;
  if p_action = 'accept' then
    perform private.notify(v_c.requester_id, null, 'connection.accepted', jsonb_build_object('connection_id', v_c.id));
  end if;
end $$;

create or replace function private.connection_requested_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify(new.addressee_id, null, 'connection.requested',
    jsonb_build_object('connection_id', new.id, 'from', new.requester_id));
  return new;
end $$;
create trigger connections_notify after insert on public.connections
  for each row execute function private.connection_requested_notify();

create or replace function public.set_vendor_approval(
  p_vendor_record uuid, p_status public.vendor_approval_status, p_note text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_company uuid := private.vendor_record_company(p_vendor_record);
begin
  if v_company is null or not private.has_permission(v_company, 'vendors.approve') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.vendor_records
  set approval_status = p_status,
      approval_note = left(p_note, 2000),
      approved_by = case when p_status in ('approved', 'conditionally-approved') then v_uid end,
      approved_at = case when p_status in ('approved', 'conditionally-approved') then now() end
  where id = p_vendor_record;
end $$;

-- Supplier submits one of its own document versions against a requirement.
-- The document is shared with the contractor automatically so it can be read.
create or replace function public.submit_compliance_document(
  p_requirement uuid, p_vendor_record uuid, p_document_version uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_vendor public.vendor_records%rowtype;
  v_req public.vendor_compliance_requirements%rowtype;
  v_ver public.document_versions%rowtype;
  v_id uuid;
begin
  select * into v_vendor from public.vendor_records where id = p_vendor_record;
  select * into v_req from public.vendor_compliance_requirements where id = p_requirement;
  select * into v_ver from public.document_versions where id = p_document_version;

  if v_vendor.id is null or v_req.id is null or v_ver.id is null
     or v_vendor.supplier_company_id is null
     or not private.has_permission(v_vendor.supplier_company_id, 'documents.share')
     or v_ver.company_id <> v_vendor.supplier_company_id
     or v_req.contractor_company_id <> v_vendor.contractor_company_id
     or (v_req.vendor_record_id is not null and v_req.vendor_record_id <> v_vendor.id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if not exists (select 1 from public.document_shares s
                 where s.document_id = v_ver.document_id and s.recipient_company_id = v_vendor.contractor_company_id
                   and s.revoked_at is null and (s.expires_at is null or s.expires_at > now())) then
    insert into public.document_shares (document_id, owner_company_id, recipient_company_id, shared_by)
    values (v_ver.document_id, v_ver.company_id, v_vendor.contractor_company_id, v_uid)
    on conflict (document_id, recipient_company_id) where revoked_at is null
    do update set expires_at = null;
  end if;

  insert into public.vendor_compliance_submissions
    (requirement_id, vendor_record_id, supplier_company_id, document_version_id, submitted_by)
  values (v_req.id, v_vendor.id, v_vendor.supplier_company_id, v_ver.id, v_uid)
  on conflict (requirement_id, vendor_record_id) do update
    set document_version_id = excluded.document_version_id, status = 'submitted',
        submitted_by = excluded.submitted_by, submitted_at = now(),
        reviewed_by = null, reviewed_at = null, review_note = null
  returning id into v_id;

  perform private.notify_permission_holders(v_vendor.contractor_company_id, 'vendors.approve',
    'compliance.submitted', jsonb_build_object('submission_id', v_id, 'requirement', v_req.name));
  return v_id;
end $$;

create or replace function public.review_compliance_submission(
  p_submission uuid, p_status public.vendor_doc_status, p_note text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_s public.vendor_compliance_submissions%rowtype;
begin
  select * into v_s from public.vendor_compliance_submissions where id = p_submission for update;
  if v_s.id is null
     or not private.has_permission(private.vendor_record_company(v_s.vendor_record_id), 'vendors.approve') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_status not in ('under-review', 'accepted', 'rejected') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  update public.vendor_compliance_submissions
  set status = p_status, reviewed_by = v_uid, reviewed_at = now(), review_note = left(p_note, 2000)
  where id = p_submission;
  perform private.notify_permission_holders(v_s.supplier_company_id, 'documents.share',
    'compliance.' || replace(p_status::text, '-', '_'), jsonb_build_object('submission_id', v_s.id));
end $$;

select private.lock_down_public_functions();
