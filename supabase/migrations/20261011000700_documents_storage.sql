-- =============================================================================
-- SOKO migration 07 — Documents, versions, sharing and Storage
-- Owner members see a document according to its access level. Other companies
-- see it only through an active (unrevoked, unexpired) share. Versions are
-- immutable and are only created by finalize_document_version after the file
-- exists in Storage.
--
-- Storage path conventions (first segment is always the owning id):
--   company-documents  {company_id}/{document_id}/v{n}/{file_name}
--   company-media      {company_id}/{logo|cover|products|gallery}/{file_name}
--   verification       {company_id}/{any}/{file_name}
--   avatars            {user_id}/{file_name}
-- =============================================================================

create table public.documents (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 200),
  category         text check (char_length(category) <= 120),
  access_level     public.doc_access_level not null default 'team',
  is_public        boolean not null default false,
  expiry           date,
  reminder_days    smallint[] not null default '{30,7}'
                   check (cardinality(reminder_days) <= 5 and 0 <= all (reminder_days) and 365 >= all (reminder_days)),
  for_verification boolean not null default false,
  archived         boolean not null default false,
  current_version  integer not null default 0,
  created_by       uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index documents_company on public.documents (company_id) where not archived;
create index documents_expiry on public.documents (expiry) where expiry is not null and not archived;
create trigger documents_updated_at before update on public.documents
  for each row execute function private.set_updated_at();
create trigger documents_created_by before insert on public.documents
  for each row execute function private.stamp_created_by();

create table public.document_versions (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.documents (id) on delete cascade,
  company_id   uuid not null references public.companies (id) on delete cascade,
  version      integer not null check (version > 0),
  storage_path text not null unique,
  file_name    text not null check (char_length(file_name) <= 255),
  mime_type    text,
  size_bytes   bigint not null check (size_bytes > 0),
  uploaded_by  uuid references auth.users (id) on delete set null,
  uploaded_at  timestamptz not null default now(),
  unique (document_id, version)
);
create trigger document_versions_immutable before update on public.document_versions
  for each row execute function private.forbid_mutation();

create table public.document_shares (
  id                   uuid primary key default gen_random_uuid(),
  document_id          uuid not null references public.documents (id) on delete cascade,
  owner_company_id     uuid not null references public.companies (id) on delete cascade,
  recipient_company_id uuid not null references public.companies (id) on delete cascade,
  shared_by            uuid references auth.users (id) on delete set null,
  shared_at            timestamptz not null default now(),
  expires_at           timestamptz,
  revoked_at           timestamptz,
  revoked_by           uuid references auth.users (id) on delete set null,
  check (owner_company_id <> recipient_company_id)
);
create unique index document_shares_one_active
  on public.document_shares (document_id, recipient_company_id) where revoked_at is null;
create index document_shares_recipient on public.document_shares (recipient_company_id) where revoked_at is null;

create table public.document_reminders_sent (
  document_id uuid not null references public.documents (id) on delete cascade,
  expiry      date not null,
  days_before smallint not null,
  sent_at     timestamptz not null default now(),
  primary key (document_id, expiry, days_before)
);

alter table public.company_verifications
  add constraint company_verifications_license_document_fk
  foreign key (license_document_id) references public.documents (id) on delete set null;

select private.attach_audit('public.documents');
select private.attach_audit('public.document_versions');
select private.attach_audit('public.document_shares');

-- -----------------------------------------------------------------------------
-- Access predicates
-- -----------------------------------------------------------------------------
create or replace function private.can_read_document(p_document uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.documents d
    where d.id = p_document and (
      -- owner members, by access level
      exists (
        select 1 from public.company_memberships m
        join public.role_document_access a on a.company_kind = m.company_kind and a.role_key = m.role_key
        where m.company_id = d.company_id and m.user_id = auth.uid()
          and m.status = 'active' and a.access_level = d.access_level)
      -- public documents of public companies
      or (d.is_public and not d.archived and exists (
        select 1 from public.companies c where c.id = d.company_id and c.is_public and not c.is_suspended))
      -- recipients of an active share who hold documents.view
      or (not d.archived and exists (
        select 1 from public.document_shares s
        where s.document_id = d.id and s.revoked_at is null
          and (s.expires_at is null or s.expires_at > now())
          and private.has_permission(s.recipient_company_id, 'documents.view')))
      -- platform admins reviewing verification evidence
      or (d.for_verification and private.is_platform_admin())
    )
  );
$$;
grant execute on function private.can_read_document(uuid) to anon, authenticated;

create or replace function private.storage_quota_ok(p_company uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(sum((o.metadata ->> 'size')::bigint), 0)
         < private.entitlement_int(p_company, 'storageMb')::bigint * 1024 * 1024
  from storage.objects o
  where o.bucket_id in ('company-documents', 'company-media')
    and (storage.foldername(o.name))[1] = p_company::text;
$$;

create or replace function private.storage_company(p_name text) returns uuid
language sql immutable set search_path = '' as $$
  select private.try_uuid((storage.foldername(p_name))[1]);
$$;

create or replace function private.can_upload_document_object(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.documents d
    where d.company_id = private.storage_company(p_name)
      and d.id = private.try_uuid((storage.foldername(p_name))[2])
      and private.has_permission(d.company_id, 'documents.manage')
      and private.storage_quota_ok(d.company_id)
  );
$$;

create or replace function private.can_read_document_object(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.document_versions v
                 where v.storage_path = p_name and private.can_read_document(v.document_id))
      or private.has_permission(private.storage_company(p_name), 'documents.manage');
$$;

-- Uploaded but never finalised objects may be deleted; finalised versions may not.
create or replace function private.can_delete_document_object(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_permission(private.storage_company(p_name), 'documents.manage')
     and not exists (select 1 from public.document_versions v where v.storage_path = p_name);
$$;

create or replace function private.can_read_company_media(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.companies c
                 where c.id = private.storage_company(p_name)
                   and ((c.is_public and not c.is_suspended) or private.is_member(c.id)));
$$;

create or replace function private.can_write_company_media(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.storage_quota_ok(private.storage_company(p_name)) and (
    private.has_permission(private.storage_company(p_name), 'profile.edit')
    or ((storage.foldername(p_name))[2] = 'products'
        and private.has_permission(private.storage_company(p_name), 'products.manage')));
$$;

grant execute on function private.storage_company(text) to anon, authenticated;
grant execute on function private.can_upload_document_object(text) to authenticated;
grant execute on function private.can_read_document_object(text) to authenticated;
grant execute on function private.can_delete_document_object(text) to authenticated;
grant execute on function private.can_read_company_media(text) to anon, authenticated;
grant execute on function private.can_write_company_media(text) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.documents               enable row level security;
alter table public.document_versions       enable row level security;
alter table public.document_shares         enable row level security;
alter table public.document_reminders_sent enable row level security;

select private.reset_table_grants('public.documents');
grant select on public.documents to anon, authenticated;
grant insert (company_id, name, category, access_level, is_public, expiry, reminder_days, for_verification),
      update (name, category, access_level, is_public, expiry, reminder_days, for_verification, archived),
      delete
  on public.documents to authenticated;
create policy documents_read on public.documents
  for select to anon, authenticated using (private.can_read_document(id));
create policy documents_insert on public.documents
  for insert to authenticated with check (private.has_permission(company_id, 'documents.manage'));
create policy documents_update on public.documents
  for update to authenticated
  using (private.has_permission(company_id, 'documents.manage'))
  with check (private.has_permission(company_id, 'documents.manage'));
create policy documents_delete on public.documents
  for delete to authenticated using (private.has_permission(company_id, 'records.delete'));

select private.reset_table_grants('public.document_versions');
grant select on public.document_versions to anon, authenticated;
create policy document_versions_read on public.document_versions
  for select to anon, authenticated using (private.can_read_document(document_id));

select private.reset_table_grants('public.document_shares');
grant select on public.document_shares to authenticated;
create policy document_shares_read on public.document_shares
  for select to authenticated
  using (private.is_member(owner_company_id) or private.is_member(recipient_company_id));

select private.reset_table_grants('public.document_reminders_sent');

-- -----------------------------------------------------------------------------
-- Storage buckets (all private; access is decided by the policies below)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('company-documents', 'company-documents', false, 52428800,
   array['application/pdf','image/png','image/jpeg','image/webp',
         'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('company-media', 'company-media', false, 10485760,
   array['image/png','image/jpeg','image/webp','image/avif']),
  ('verification', 'verification', false, 20971520,
   array['application/pdf','image/png','image/jpeg']),
  ('avatars', 'avatars', false, 5242880,
   array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy soko_documents_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'company-documents' and private.can_upload_document_object(name));
create policy soko_documents_select on storage.objects
  for select to authenticated
  using (bucket_id = 'company-documents' and private.can_read_document_object(name));
create policy soko_documents_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'company-documents' and private.can_delete_document_object(name));

create policy soko_media_select on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'company-media' and private.can_read_company_media(name));
create policy soko_media_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'company-media' and private.can_write_company_media(name));
create policy soko_media_update on storage.objects
  for update to authenticated
  using (bucket_id = 'company-media' and private.can_write_company_media(name))
  with check (bucket_id = 'company-media' and private.can_write_company_media(name));
create policy soko_media_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'company-media' and private.can_write_company_media(name));

create policy soko_verification_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'verification' and private.is_company_admin(private.storage_company(name)));
create policy soko_verification_select on storage.objects
  for select to authenticated
  using (bucket_id = 'verification'
         and (private.is_company_admin(private.storage_company(name)) or private.is_platform_admin()));

create policy soko_avatars_select on storage.objects
  for select to authenticated using (bucket_id = 'avatars');
create policy soko_avatars_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy soko_avatars_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy soko_avatars_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- -----------------------------------------------------------------------------
-- Trusted RPCs
-- -----------------------------------------------------------------------------
-- Called after the client uploads to company-documents. Size and MIME type are
-- taken from Storage's own metadata, never from the client.
create or replace function public.finalize_document_version(p_document uuid, p_storage_path text, p_file_name text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_doc public.documents%rowtype;
  v_size bigint;
  v_mime text;
  v_id uuid;
begin
  select * into v_doc from public.documents where id = p_document for update;
  if v_doc.id is null or not private.has_permission(v_doc.company_id, 'documents.manage') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_storage_path not like v_doc.company_id::text || '/' || v_doc.id::text || '/%' then
    raise exception 'storage path does not belong to this document' using errcode = '22023';
  end if;
  select (o.metadata ->> 'size')::bigint, o.metadata ->> 'mimetype' into v_size, v_mime
  from storage.objects o where o.bucket_id = 'company-documents' and o.name = p_storage_path;
  if v_size is null then
    raise exception 'uploaded file not found' using errcode = '22023';
  end if;

  insert into public.document_versions (document_id, company_id, version, storage_path, file_name, mime_type, size_bytes, uploaded_by)
  values (v_doc.id, v_doc.company_id, v_doc.current_version + 1, p_storage_path, left(p_file_name, 255), v_mime, v_size, v_uid)
  returning id into v_id;
  update public.documents set current_version = v_doc.current_version + 1 where id = v_doc.id;
  return v_id;
end $$;

create or replace function public.share_document(p_document uuid, p_recipient_company uuid, p_expires_at timestamptz default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_doc public.documents%rowtype;
  v_id uuid;
begin
  select * into v_doc from public.documents where id = p_document;
  if v_doc.id is null or not private.has_permission(v_doc.company_id, 'documents.share')
     or not private.can_read_document(v_doc.id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_doc.archived or v_doc.current_version = 0 then
    raise exception 'document has no active version' using errcode = '22023';
  end if;
  if v_doc.access_level = 'admins' and not private.is_company_admin(v_doc.company_id) then
    raise exception 'only admins can share admin-only documents' using errcode = '42501';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'expiry must be in the future' using errcode = '22023';
  end if;
  if not exists (select 1 from public.companies c where c.id = p_recipient_company and not c.is_suspended)
     or p_recipient_company = v_doc.company_id then
    raise exception 'invalid recipient' using errcode = '22023';
  end if;

  update public.document_shares set expires_at = p_expires_at, shared_by = v_uid, shared_at = now()
  where document_id = v_doc.id and recipient_company_id = p_recipient_company and revoked_at is null
  returning id into v_id;
  if v_id is null then
    insert into public.document_shares (document_id, owner_company_id, recipient_company_id, shared_by, expires_at)
    values (v_doc.id, v_doc.company_id, p_recipient_company, v_uid, p_expires_at)
    returning id into v_id;
  end if;

  perform private.notify_permission_holders(p_recipient_company, 'documents.view', 'document.shared',
    jsonb_build_object('share_id', v_id, 'document_id', v_doc.id, 'document_name', v_doc.name));
  return v_id;
end $$;

create or replace function public.revoke_document_share(p_share uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_owner uuid;
begin
  select s.owner_company_id into v_owner from public.document_shares s where s.id = p_share;
  if v_owner is null or not private.has_permission(v_owner, 'documents.share') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.document_shares set revoked_at = now(), revoked_by = v_uid
  where id = p_share and revoked_at is null;
end $$;

-- The client calls this, then asks Storage for a short-lived signed URL
-- (Storage re-checks soko_documents_select before signing).
create or replace function public.record_document_download(p_version uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_v public.document_versions%rowtype;
begin
  perform private.require_user();
  select * into v_v from public.document_versions where id = p_version;
  if v_v.id is null or not private.can_read_document(v_v.document_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.audit_log (company_id, actor_id, action, entity, entity_id, diff)
  values (v_v.company_id, auth.uid(), 'download', 'document_versions', v_v.id::text,
          jsonb_build_object('document_id', v_v.document_id, 'version', v_v.version,
                             'by_member', private.is_member(v_v.company_id)));
  return v_v.storage_path;
end $$;

-- Scheduled job (service role / pg_cron): idempotent per document, expiry and offset.
create or replace function private.queue_document_expiry_reminders() returns integer
language plpgsql security definer set search_path = '' as $$
declare r record; v_count integer := 0;
begin
  for r in
    select d.id, d.company_id, d.name, d.expiry, x.days
    from public.documents d
    cross join lateral unnest(d.reminder_days) as x(days)
    where not d.archived and d.expiry is not null and d.expiry - current_date = x.days
  loop
    insert into public.document_reminders_sent (document_id, expiry, days_before)
    values (r.id, r.expiry, r.days) on conflict do nothing;
    if found then
      perform private.notify_permission_holders(r.company_id, 'documents.manage', 'document.expiring',
        jsonb_build_object('document_id', r.id, 'document_name', r.name, 'expiry', r.expiry, 'days', r.days));
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end $$;
grant execute on function private.queue_document_expiry_reminders() to service_role;

select private.lock_down_public_functions();
