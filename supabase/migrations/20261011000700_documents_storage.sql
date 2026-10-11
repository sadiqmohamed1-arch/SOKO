-- =============================================================================
-- SOKO migration 07 — Documents, versions, sharing and Storage
-- Owner members see a document according to its access level. Other companies
-- see it only through an active (unrevoked, unexpired) share. Versions are
-- immutable and are only created by finalize_document_version after the file
-- exists in Storage.
--
-- Storage path conventions (validated strictly; anything else is denied):
--   company-documents  {company_id}/{document_id}/v{n}/{file_name}
--   company-media      {company_id}/{logo|cover|gallery|products}/{file_name}
--   verification       {company_id}/{submission_key uuid}/{file_name}
--   avatars            {user_id}/{file_name}
-- Ids are canonical lower-case uuids; file names match Migration 06's product
-- image rule: [A-Za-z0-9][A-Za-z0-9._-]{0,199}.
--
-- Access rules (the same everywhere: metadata, versions, Storage, downloads):
--   * Owner members by access level, while the company is NOT suspended.
--   * Holders of an admin role may still read their own verification evidence
--     (for_verification) while suspended. Read-only; never grants writes.
--   * Public documents of a public, non-suspended company, unless archived.
--   * Share recipients holding documents.view, through an unrevoked, unexpired
--     share, while the document is not archived and the owner is not suspended.
--     Recipients never read Storage directly: only via document-download.
--   * Platform admins read verification evidence.
--
-- Retention:
--   * Finalised versions are never updated, and never deleted on their own.
--     They go only when their document goes (company deletion or service role).
--   * Users can delete only documents that never had a finalised version; others
--     must be archived.
--   * Finalised Storage objects cannot be deleted or overwritten by users.
--   * Audit entries are never removed (Migration 04).
--   * Storage files are not removed by SQL. private.list_orphaned_storage_objects()
--     reports files left behind for a service-role cleanup job.
-- =============================================================================

-- Opens the function-ownership scope closed by apply_function_grants() below.
select private.begin_function_scope();

-- -----------------------------------------------------------------------------
-- Strict path parsers. A path that does not match returns all NULLs.
-- -----------------------------------------------------------------------------
create or replace function private.parse_document_path(
  p_name text, out company_id uuid, out document_id uuid, out version integer, out file_name text)
language sql immutable set search_path = '' as $$
  select m[1]::uuid, m[2]::uuid, m[3]::integer, m[4]
  from (select pg_catalog.regexp_match(p_name,
    '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/'
    '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/'
    'v([1-9][0-9]{0,8})/([A-Za-z0-9][A-Za-z0-9._-]{0,199})$') as m) x;
$$;

create or replace function private.parse_media_path(
  p_name text, out company_id uuid, out folder text, out file_name text)
language sql immutable set search_path = '' as $$
  select m[1]::uuid, m[2], m[3]
  from (select pg_catalog.regexp_match(p_name,
    '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/'
    '(logo|cover|gallery|products)/([A-Za-z0-9][A-Za-z0-9._-]{0,199})$') as m) x;
$$;

create or replace function private.parse_verification_path(
  p_name text, out company_id uuid, out submission_key uuid, out file_name text)
language sql immutable set search_path = '' as $$
  select m[1]::uuid, m[2]::uuid, m[3]
  from (select pg_catalog.regexp_match(p_name,
    '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/'
    '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/'
    '([A-Za-z0-9][A-Za-z0-9._-]{0,199})$') as m) x;
$$;

create or replace function private.parse_avatar_path(p_name text, out user_id uuid, out file_name text)
language sql immutable set search_path = '' as $$
  select m[1]::uuid, m[2]
  from (select pg_catalog.regexp_match(p_name,
    '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/'
    '([A-Za-z0-9][A-Za-z0-9._-]{0,199})$') as m) x;
$$;

create or replace function private.document_path_matches(
  p_path text, p_company uuid, p_document uuid, p_version integer) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(p.company_id = p_company and p.document_id = p_document and p.version = p_version, false)
  from private.parse_document_path(p_path) p;
$$;

-- Storage's own size metadata, or NULL when absent or not a plain integer.
create or replace function private.object_size(p_metadata jsonb) returns bigint
language sql immutable set search_path = '' as $$
  select case when p_metadata ->> 'size' ~ '^[0-9]{1,15}$' then (p_metadata ->> 'size')::bigint end;
$$;

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
  updated_at       timestamptz not null default now(),
  -- Target for composite keys: children must name the document's own company.
  constraint documents_id_company_key unique (id, company_id)
);
create index documents_company on public.documents (company_id) where not archived;
create index documents_expiry on public.documents (expiry) where expiry is not null and not archived;
create trigger documents_updated_at before update on public.documents
  for each row execute function private.set_updated_at();
create trigger documents_created_by before insert on public.documents
  for each row execute function private.stamp_created_by();

create table public.document_versions (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null,
  company_id   uuid not null references public.companies (id) on delete cascade,
  version      integer not null check (version > 0),
  storage_path text not null unique,
  file_name    text not null check (char_length(file_name) between 1 and 255 and file_name !~ '[[:cntrl:]]'),
  mime_type    text,
  size_bytes   bigint not null check (size_bytes > 0),
  uploaded_by  uuid references auth.users (id) on delete set null,
  uploaded_at  timestamptz not null default now(),
  unique (document_id, version),
  constraint document_versions_document_fk foreign key (document_id, company_id)
    references public.documents (id, company_id) on delete cascade,
  constraint document_versions_path_matches
    check (private.document_path_matches(storage_path, company_id, document_id, version))
);
create trigger document_versions_immutable before update on public.document_versions
  for each row execute function private.forbid_mutation();

-- A version is removed only together with its document. During a cascade the
-- parent row is already gone, so this lets company and document deletes through.
create or replace function private.retain_document_version() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.documents d where d.id = old.document_id) then
    raise exception 'finalised document versions are retained; archive the document instead'
      using errcode = '42501';
  end if;
  return old;
end $$;
create trigger document_versions_retained before delete on public.document_versions
  for each row execute function private.retain_document_version();

create table public.document_shares (
  id                   uuid primary key default gen_random_uuid(),
  document_id          uuid not null,
  owner_company_id     uuid not null references public.companies (id) on delete cascade,
  recipient_company_id uuid not null references public.companies (id) on delete cascade,
  shared_by            uuid references auth.users (id) on delete set null,
  shared_at            timestamptz not null default now(),
  expires_at           timestamptz,
  revoked_at           timestamptz,
  revoked_by           uuid references auth.users (id) on delete set null,
  check (owner_company_id <> recipient_company_id),
  constraint document_shares_document_fk foreign key (document_id, owner_company_id)
    references public.documents (id, company_id) on delete cascade
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

-- One row per company, written by every quota check so concurrent uploads
-- queue (READ COMMITTED) or fail with a retryable 40001 (REPEATABLE READ /
-- SERIALIZABLE) instead of all passing against the same stale total.
create table private.storage_quota_guard (
  company_id uuid primary key references public.companies (id) on delete cascade,
  checked_at timestamptz not null default now()
);
revoke all on private.storage_quota_guard from public, anon, authenticated;

alter table public.company_verifications
  add constraint company_verifications_license_document_fk
  foreign key (license_document_id) references public.documents (id) on delete set null;

-- Document names are redacted (they often identify people or licences).
select private.attach_audit('public.documents',
  array['company_id'],
  array['id', 'company_id', 'category', 'access_level', 'is_public', 'expiry', 'reminder_days',
        'for_verification', 'archived', 'current_version', 'created_by'],
  array['created_at', 'updated_at']);
-- Storage path and file name are redacted.
select private.attach_audit('public.document_versions',
  array['company_id'],
  array['id', 'document_id', 'company_id', 'version', 'mime_type', 'size_bytes', 'uploaded_by', 'uploaded_at']);
select private.attach_audit('public.document_shares',
  array['owner_company_id'],
  array['id', 'document_id', 'owner_company_id', 'recipient_company_id', 'shared_by', 'shared_at',
        'expires_at', 'revoked_at', 'revoked_by']);

-- -----------------------------------------------------------------------------
-- Access predicates
-- -----------------------------------------------------------------------------
-- True when the caller's role in the company may see documents at this level.
-- Void while the company is suspended.
create or replace function private.has_doc_access(p_company uuid, p_level public.doc_access_level)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.company_memberships m
    join public.role_document_access a on a.company_kind = m.company_kind and a.role_key = m.role_key
    join public.companies c on c.id = m.company_id
    where m.company_id = p_company and m.user_id = auth.uid() and m.status = 'active'
      and a.access_level = p_level and not c.is_suspended);
$$;

create or replace function private.can_read_document(p_document uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.documents d
    join public.companies c on c.id = d.company_id
    where d.id = p_document and (
      -- owner members, by access level, while not suspended
      private.has_doc_access(d.company_id, d.access_level)
      -- own verification evidence stays readable to admin-role holders
      or (d.for_verification and private.holds_admin_role(d.company_id))
      -- public documents of public companies
      or (d.is_public and not d.archived and c.is_public and not c.is_suspended)
      -- recipients of an active share who hold documents.view
      or (not d.archived and not c.is_suspended and exists (
        select 1 from public.document_shares s
        where s.document_id = d.id and s.owner_company_id = d.company_id
          and s.revoked_at is null
          and (s.expires_at is null or s.expires_at > now())
          and private.has_permission(s.recipient_company_id, 'documents.view')))
      -- platform admins reviewing verification evidence
      or (d.for_verification and private.is_platform_admin())
    )
  );
$$;
select private.allow_execute(array['anon', 'authenticated'], array['private.can_read_document(uuid)']);

-- Serialised per company through storage_quota_guard. An unknown incoming size
-- counts as one byte, so a company at its limit cannot add even empty objects.
create or replace function private.storage_quota_ok(p_company uuid, p_incoming bigint) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare v_used bigint; v_limit bigint;
begin
  if p_company is null or not exists (select 1 from public.companies c where c.id = p_company) then
    return false;
  end if;
  insert into private.storage_quota_guard as g (company_id) values (p_company)
  on conflict (company_id) do update set checked_at = now();

  -- A fresh snapshot (volatile plpgsql), taken after the guard row lock, so it
  -- includes every upload that committed while this one was waiting.
  select coalesce(sum(coalesce(private.object_size(o.metadata), 0)), 0) into v_used
  from storage.objects o
  where o.bucket_id in ('company-documents', 'company-media', 'verification')
    and o.name like p_company::text || '/%';
  v_limit := private.entitlement_int(p_company, 'storageMb')::bigint * 1024 * 1024;
  return v_used + greatest(coalesce(p_incoming, 0), 1) <= v_limit;
end $$;

create or replace function private.storage_company(p_name text) returns uuid
language sql immutable set search_path = '' as $$
  select private.try_uuid((storage.foldername(p_name))[1]);
$$;

-- Uploads go only to the exact next version folder of a live document the
-- caller manages, and only while the company is within quota.
create or replace function private.can_upload_document_object(p_name text, p_size bigint) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare v_path record; v_doc public.documents%rowtype;
begin
  select * into v_path from private.parse_document_path(p_name);
  if v_path.company_id is null then
    return false;
  end if;
  select * into v_doc from public.documents d
  where d.id = v_path.document_id and d.company_id = v_path.company_id;
  if v_doc.id is null or v_doc.archived
     or v_path.version <> v_doc.current_version + 1
     or not private.has_permission(v_doc.company_id, 'documents.manage')
     or not private.has_doc_access(v_doc.company_id, v_doc.access_level) then
    return false;
  end if;
  return private.storage_quota_ok(v_doc.company_id, p_size);
end $$;

-- Direct Storage reads: finalised versions follow can_read_document minus the
-- share branch (recipients use the document-download Edge Function, which
-- issues 60-second links). Managers may also read a pending upload for the
-- next version so the Storage API can confirm it before finalising.
create or replace function private.can_read_document_object(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
      select 1 from public.document_versions v
      join public.documents d on d.id = v.document_id
      join public.companies c on c.id = d.company_id
      where v.storage_path = p_name and (
        private.has_doc_access(d.company_id, d.access_level)
        or (d.for_verification and (private.holds_admin_role(d.company_id) or private.is_platform_admin()))
        or (d.is_public and not d.archived and c.is_public and not c.is_suspended)))
    or exists (
      select 1 from private.parse_document_path(p_name) p
      join public.documents d on d.id = p.document_id and d.company_id = p.company_id
      where p.version = d.current_version + 1 and not d.archived
        and not exists (select 1 from public.document_versions v where v.storage_path = p_name)
        and private.has_permission(d.company_id, 'documents.manage')
        and private.has_doc_access(d.company_id, d.access_level));
$$;

-- Never-finalised objects may be deleted by the company's document managers
-- (including malformed leftovers in their own folder), but not files of a
-- document above the caller's access level. Finalised versions never.
create or replace function private.can_delete_document_object(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.document_versions v where v.storage_path = p_name)
     and private.has_permission(private.storage_company(p_name), 'documents.manage')
     and not exists (
       select 1 from private.parse_document_path(p_name) p
       join public.documents d on d.id = p.document_id and d.company_id = p.company_id
       where not private.has_doc_access(d.company_id, d.access_level));
$$;

-- Members read all of their company's media. Everyone else reads only a public,
-- non-suspended company's media, and within its products/ folder only images
-- referenced by a published product — draft and archived product images stay
-- private even though the bucket path is guessable. Malformed paths: nobody.
create or replace function private.can_read_company_media(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.parse_media_path(p_name) m
    join public.companies c on c.id = m.company_id
    where private.is_member(c.id)
       or (c.is_public and not c.is_suspended
           and (m.folder <> 'products'
                or exists (select 1 from public.products p
                           where p.company_id = c.id and p.status = 'published'
                             and p.image_paths @> array[p_name]))));
$$;

-- Permission only (update / delete). products/ needs products.manage; logo,
-- cover and gallery need profile.edit. Neither permission covers the other.
create or replace function private.can_write_company_media(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.parse_media_path(p_name) m
    where case m.folder
            when 'products' then private.has_permission(m.company_id, 'products.manage')
            else private.has_permission(m.company_id, 'profile.edit')
          end);
$$;

-- New bytes (insert, overwrite): permission first, then quota.
create or replace function private.can_store_company_media(p_name text, p_size bigint) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not private.can_write_company_media(p_name) then
    return false;
  end if;
  return private.storage_quota_ok(private.storage_company(p_name), p_size);
end $$;

-- Verification evidence: uploaded by admins of an active (non-suspended)
-- company, read by that company's admin-role holders (even while suspended,
-- to resolve the suspension) and platform admins. Never updated or deleted by
-- users; files of a deleted company are reported as orphans.
create or replace function private.can_upload_verification_object(p_name text, p_size bigint) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare v_company uuid;
begin
  select v.company_id into v_company from private.parse_verification_path(p_name) v;
  if v_company is null or not private.is_company_admin(v_company) then
    return false;
  end if;
  return private.storage_quota_ok(v_company, p_size);
end $$;

create or replace function private.can_read_verification_object(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.parse_verification_path(p_name) v
    join public.companies c on c.id = v.company_id
    where private.holds_admin_role(c.id) or private.is_platform_admin());
$$;

create or replace function private.is_own_avatar_path(p_name text) returns boolean
language sql stable set search_path = '' as $$
  select coalesce((select a.user_id = auth.uid() from private.parse_avatar_path(p_name) a), false);
$$;

select private.allow_execute(array['authenticated'], array['private.has_doc_access(uuid, public.doc_access_level)']);
select private.allow_execute(array['anon', 'authenticated'], array['private.storage_company(text)']);
select private.allow_execute(array['anon', 'authenticated'], array['private.object_size(jsonb)']);
select private.allow_execute(array['authenticated'], array[
  'private.can_upload_document_object(text, bigint)',
  'private.can_read_document_object(text)',
  'private.can_delete_document_object(text)',
  'private.can_write_company_media(text)',
  'private.can_store_company_media(text, bigint)',
  'private.can_upload_verification_object(text, bigint)',
  'private.can_read_verification_object(text)',
  'private.is_own_avatar_path(text)'
]);
select private.allow_execute(array['anon', 'authenticated'], array['private.can_read_company_media(text)']);

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
  for insert to authenticated
  with check (private.has_permission(company_id, 'documents.manage')
              and private.has_doc_access(company_id, access_level));
-- USING checks the current level, WITH CHECK the new one: nobody can edit a
-- document above their level or move one to a level they don't hold.
create policy documents_update on public.documents
  for update to authenticated
  using (private.has_permission(company_id, 'documents.manage')
         and private.has_doc_access(company_id, access_level))
  with check (private.has_permission(company_id, 'documents.manage')
              and private.has_doc_access(company_id, access_level));
-- Only documents that never had a finalised version; the rest are archived.
create policy documents_delete on public.documents
  for delete to authenticated
  using (current_version = 0
         and private.has_permission(company_id, 'records.delete')
         and private.has_doc_access(company_id, access_level));

select private.reset_table_grants('public.document_versions');
grant select on public.document_versions to anon, authenticated;
create policy document_versions_read on public.document_versions
  for select to anon, authenticated using (private.can_read_document(document_id));

-- Owners see their share history; recipients only see shares still in force.
select private.reset_table_grants('public.document_shares');
grant select on public.document_shares to authenticated;
create policy document_shares_read on public.document_shares
  for select to authenticated
  using (private.is_member(owner_company_id)
         or (private.is_member(recipient_company_id)
             and revoked_at is null and (expires_at is null or expires_at > now())));

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

-- company-documents: no UPDATE policy, so no object is ever overwritten or moved.
create policy soko_documents_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'company-documents'
              and private.can_upload_document_object(name, private.object_size(metadata)));
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
  with check (bucket_id = 'company-media'
              and private.can_store_company_media(name, private.object_size(metadata)));
create policy soko_media_update on storage.objects
  for update to authenticated
  using (bucket_id = 'company-media' and private.can_write_company_media(name))
  with check (bucket_id = 'company-media'
              and private.can_store_company_media(name, private.object_size(metadata)));
-- Deleting frees space, so it is never blocked by the quota.
create policy soko_media_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'company-media' and private.can_write_company_media(name));

create policy soko_verification_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'verification'
              and private.can_upload_verification_object(name, private.object_size(metadata)));
create policy soko_verification_select on storage.objects
  for select to authenticated
  using (bucket_id = 'verification' and private.can_read_verification_object(name));

create policy soko_avatars_select on storage.objects
  for select to authenticated using (bucket_id = 'avatars');
create policy soko_avatars_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and private.is_own_avatar_path(name));
create policy soko_avatars_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and private.is_own_avatar_path(name))
  with check (bucket_id = 'avatars' and private.is_own_avatar_path(name));
create policy soko_avatars_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and private.is_own_avatar_path(name));

-- -----------------------------------------------------------------------------
-- Trusted RPCs
-- -----------------------------------------------------------------------------
-- Called after the client uploads to company-documents. Size and MIME type are
-- taken from Storage's own metadata, never from the client. The document row
-- lock serialises finalisation, so each version number is used exactly once.
create or replace function public.finalize_document_version(p_document uuid, p_storage_path text, p_file_name text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_doc public.documents%rowtype;
  v_path record;
  v_bucket storage.buckets%rowtype;
  v_size bigint;
  v_mime text;
  v_found boolean;
  v_name text;
  v_id uuid;
begin
  select * into v_doc from public.documents where id = p_document for update;
  if v_doc.id is null or not private.has_permission(v_doc.company_id, 'documents.manage')
     or not private.has_doc_access(v_doc.company_id, v_doc.access_level) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_doc.archived then
    raise exception 'document is archived' using errcode = '22023';
  end if;

  select * into v_path from private.parse_document_path(p_storage_path);
  if v_path.company_id is null
     or v_path.company_id <> v_doc.company_id or v_path.document_id <> v_doc.id then
    raise exception 'storage path does not belong to this document' using errcode = '22023';
  end if;
  if v_path.version <> v_doc.current_version + 1 then
    raise exception 'storage path must use the next version (v%)', v_doc.current_version + 1
      using errcode = '22023';
  end if;

  select true, private.object_size(o.metadata), o.metadata ->> 'mimetype'
    into v_found, v_size, v_mime
  from storage.objects o where o.bucket_id = 'company-documents' and o.name = p_storage_path;
  if v_found is null then
    raise exception 'uploaded file not found' using errcode = '22023';
  end if;
  select * into v_bucket from storage.buckets b where b.id = 'company-documents';
  if v_size is null or v_size <= 0 or (v_bucket.file_size_limit is not null and v_size > v_bucket.file_size_limit) then
    raise exception 'uploaded file has an invalid size' using errcode = '22023';
  end if;
  if v_bucket.allowed_mime_types is not null and (v_mime is null or not v_mime = any (v_bucket.allowed_mime_types)) then
    raise exception 'uploaded file type is not allowed' using errcode = '22023';
  end if;

  v_name := left(coalesce(nullif(btrim(p_file_name), ''), v_path.file_name), 255);
  if v_name ~ '[[:cntrl:]]' then
    raise exception 'invalid file name' using errcode = '22023';
  end if;

  insert into public.document_versions (document_id, company_id, version, storage_path, file_name, mime_type, size_bytes, uploaded_by)
  values (v_doc.id, v_doc.company_id, v_path.version, p_storage_path, v_name, v_mime, v_size, v_uid)
  returning id into v_id;
  update public.documents set current_version = v_path.version where id = v_doc.id;
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

-- Called by the document-download Edge Function WITH THE CALLER'S JWT. It
-- authorises through can_read_document (so revocation, expiry, archival and
-- suspension all apply), writes the audit entry and returns the storage path.
-- Only then does the function sign a 60-second URL with the service role.
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

-- Scheduled job (service role / pg_cron): idempotent per document, expiry and
-- offset. Suspended companies are skipped.
create or replace function private.queue_document_expiry_reminders() returns integer
language plpgsql security definer set search_path = '' as $$
declare r record; v_count integer := 0;
begin
  for r in
    select d.id, d.company_id, d.name, d.expiry, x.days
    from public.documents d
    join public.companies c on c.id = d.company_id and not c.is_suspended
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
select private.allow_execute(array['service_role'], array['private.queue_document_expiry_reminders()']);

-- Service-role cleanup report: Storage files no SQL row accounts for. Delete
-- them through the Storage API (SQL deletes leave the bytes behind).
create or replace function private.list_orphaned_storage_objects(p_min_age interval default interval '1 day')
returns table (bucket_id text, name text, reason text)
language sql stable security definer set search_path = '' as $$
  select o.bucket_id, o.name, x.reason
  from storage.objects o
  cross join lateral (select
    case
      when o.bucket_id = 'avatars' then
        case when (select a.user_id from private.parse_avatar_path(o.name) a) is null then 'malformed path'
             when not exists (select 1 from auth.users u
                              where u.id = (select a.user_id from private.parse_avatar_path(o.name) a))
               then 'user deleted' end
      when private.storage_company(o.name) is null
        or not exists (select 1 from public.companies c where c.id = private.storage_company(o.name))
        then 'company deleted or malformed path'
      when o.bucket_id = 'company-documents' then
        case when (select p.company_id from private.parse_document_path(o.name) p) is null then 'malformed path'
             when not exists (select 1 from public.document_versions v where v.storage_path = o.name)
                  and o.created_at < now() - p_min_age then 'never finalised' end
      when o.bucket_id = 'company-media'
        and (select m.company_id from private.parse_media_path(o.name) m) is null then 'malformed path'
      when o.bucket_id = 'verification'
        and (select v.company_id from private.parse_verification_path(o.name) v) is null then 'malformed path'
    end as reason) x
  where o.bucket_id in ('company-documents', 'company-media', 'verification', 'avatars')
    and x.reason is not null;
$$;
select private.allow_execute(array['service_role'], array['private.list_orphaned_storage_objects(interval)']);

-- Approved RPCs: callable by signed-in users only; each checks its own authorization.
select private.allow_execute(array['authenticated'], array[
  'public.finalize_document_version(uuid, text, text)',
  'public.share_document(uuid, uuid, timestamptz)',
  'public.revoke_document_share(uuid)',
  'public.record_document_download(uuid)'
]);

select private.apply_function_grants();
