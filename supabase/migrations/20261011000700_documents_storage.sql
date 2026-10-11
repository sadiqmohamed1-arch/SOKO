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

-- Upload reservations. Supabase Storage checks RLS BEFORE the bytes arrive
-- (testPermission, with only the client-declared contentLength and mimetype)
-- and writes the real size afterwards as the storage superuser, which RLS never
-- sees. So the quota is charged here, ahead of the upload, under the company's
-- guard row lock: concurrent reservations queue and can never jointly exceed
-- the quota. The INSERT/UPDATE policies then require an open reservation by the
-- same user for the exact path, with a declared length that fits it.
--
-- Lifecycle. Every upload Storage admitted under a reservation (RLS runs at the
-- start of a standard upload and on every TUS request) must have started
-- before expires_at, but its body may still be streaming afterwards and is
-- written by the storage superuser whenever it finishes. So a reservation —
-- settled or not — keeps counting max(reserved, bytes at its path) for a fixed
-- 24-hour grace after its window closes; nothing can release it sooner. Only
-- then does reconcile_storage_reservations compare it with the real object:
-- a fitting late upload is settled and released, a missing one is released,
-- and an object that is larger, of another type or replaced after settlement
-- is marked rejected and reported for deletion by list_orphaned_storage_objects.
--
-- One reservation per path, ever, until reconciliation removes it: it is never
-- renewed, extended or handed to another user, so a path has exactly one owner
-- and one admission window and no two admitted uploads can compete for it. A
-- retry after an interrupted or expired upload uses a new file name (every
-- bucket's path scheme leaves the file name free).
create table private.storage_upload_reservations (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete cascade,
  bucket_id      text not null check (bucket_id in ('company-documents', 'company-media', 'verification')),
  object_name    text not null,
  user_id        uuid not null references auth.users (id) on delete cascade,
  reserved_bytes bigint not null check (reserved_bytes > 0),
  mime_type      text not null,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null,
  settled_at     timestamptz,
  object_version text,          -- storage.objects.version seen at settlement
  rejected_at    timestamptz,   -- object found not to match; awaiting deletion
  unique (bucket_id, object_name)
);
create index storage_upload_reservations_company on private.storage_upload_reservations (company_id);
revoke all on private.storage_upload_reservations from public, anon, authenticated;

alter table public.company_verifications
  add constraint company_verifications_license_document_fk
  foreign key (license_document_id) references public.documents (id) on delete set null;

-- The Storage object version a finalised document version was verified
-- against. Storage writes uploads with an upsert as superuser, so a second
-- upload admitted under the same open window could land later and replace the
-- bytes; downloads refuse a file whose version no longer matches.
alter table public.document_versions add column object_version text;

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

-- How long after its upload window closes a reservation keeps counting. Matches
-- the 24-hour lifetime of a Supabase TUS upload URL.
create or replace function private.upload_grace() returns interval
language sql immutable set search_path = '' as $$ select interval '24 hours' $$;

-- How long a reservation admits uploads (RLS passes only inside it).
create or replace function private.upload_window() returns interval
language sql immutable set search_path = '' as $$ select interval '15 minutes' $$;

-- Bytes a company holds (real sizes written by Storage) plus, for every
-- reservation still counting, the reserved bytes not yet covered by the object
-- at its path — so a landed upload counts max(reserved, actual), never both.
-- p_bucket/p_name exclude the object being replaced (and its reservation via
-- p_exclude); the exclusion applies only when both are given, since a NULL
-- comparison would otherwise drop every row. Volatile so each call inside a plpgsql function takes a fresh
-- snapshot after the caller has locked the guard row.
create or replace function private.storage_usage(
  p_company uuid, p_exclude uuid default null, p_bucket text default null, p_name text default null
) returns bigint
language sql volatile security definer set search_path = '' as $$
  select coalesce((select sum(coalesce(private.object_size(o.metadata), 0)) from storage.objects o
                   where o.bucket_id in ('company-documents', 'company-media', 'verification')
                     and o.name like p_company::text || '/%'
                     and (p_bucket is null or p_name is null
                          or not (o.bucket_id = p_bucket and o.name = p_name))), 0)
       -- Unsettled reservations hold their unused bytes for the whole grace
       -- period (an admitted upload may still land). A settled one holds bytes
       -- only while a different upload has replaced the verified file: the
       -- verified file already counts itself, and a deleted one frees quota.
       + coalesce((select sum(greatest(r.reserved_bytes - coalesce(o.size, 0), 0))
                   from private.storage_upload_reservations r
                   left join lateral (select private.object_size(x.metadata) as size, x.version
                                      from storage.objects x
                                      where x.bucket_id = r.bucket_id and x.name = r.object_name) o on true
                   where r.company_id = p_company and r.id is distinct from p_exclude
                     and r.rejected_at is null
                     and now() < r.expires_at + private.upload_grace()
                     and (r.settled_at is null
                          or (o.version is not null and o.version is distinct from r.object_version))), 0);
$$;

-- RLS check at upload time: an open reservation by this user for this exact
-- path, with a declared length and type that fit it. A missing declared length
-- (e.g. a multipart form upload) is refused; clients upload a raw body
-- (ArrayBuffer / Blob with Content-Length) or use resumable uploads.
create or replace function private.upload_reserved(p_bucket text, p_name text, p_metadata jsonb) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.storage_upload_reservations r
    where r.bucket_id = p_bucket and r.object_name = p_name and r.user_id = auth.uid()
      and r.settled_at is null and now() < r.expires_at
      and case when p_metadata ->> 'contentLength' ~ '^[0-9]{1,15}$'
               then (p_metadata ->> 'contentLength')::bigint end between 1 and r.reserved_bytes
      and p_metadata ->> 'mimetype' = r.mime_type);
$$;

create or replace function private.storage_company(p_name text) returns uuid
language sql immutable set search_path = '' as $$
  select private.try_uuid((storage.foldername(p_name))[1]);
$$;

-- Uploads go only to the exact next version folder of a live document the
-- caller manages. The quota is charged by reserve_storage_upload.
create or replace function private.can_upload_document_object(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.parse_document_path(p_name) p
    join public.documents d on d.id = p.document_id and d.company_id = p.company_id
    where not d.archived and p.version = d.current_version + 1
      and private.has_permission(d.company_id, 'documents.manage')
      and private.has_doc_access(d.company_id, d.access_level));
$$;

-- Direct Storage reads: finalised versions follow can_read_document minus the
-- share branch (recipients use the document-download Edge Function, which
-- issues 60-second links). Managers may also read a pending upload for the
-- next version so the Storage API can confirm it before finalising.
-- A finalised path is readable only while it holds the exact bytes verified at
-- finalisation (same storage.objects.version), matching record_document_download.
create or replace function private.can_read_document_object(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
      select 1 from public.document_versions v
      join public.documents d on d.id = v.document_id
      join public.companies c on c.id = d.company_id
      join storage.objects o on o.bucket_id = 'company-documents' and o.name = v.storage_path
                            and o.version = v.object_version
      where v.storage_path = p_name and (
        private.has_doc_access(d.company_id, d.access_level)
        or (d.for_verification and (private.holds_admin_role(d.company_id) or private.is_platform_admin()))
        or (d.is_public and not d.archived and c.is_public and not c.is_suspended)))
    or exists (
      select 1 from private.parse_document_path(p_name) p
      join public.documents d on d.id = p.document_id and d.company_id = p.company_id
      where p.version = d.current_version + 1 and not d.archived
        and not exists (select 1 from public.document_versions v where v.storage_path = p_name)
        and exists (select 1 from private.storage_upload_reservations r
                    where r.bucket_id = 'company-documents' and r.object_name = p_name
                      and r.user_id = auth.uid() and r.rejected_at is null)
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

-- Nobody reads a suspended company's media. Otherwise members read all of
-- their company's media, and everyone else reads only a public company's
-- media, and within its products/ folder only images referenced by a published
-- product — draft and archived product images stay private even though the
-- bucket path is guessable. Malformed paths: nobody.
create or replace function private.can_read_company_media(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.parse_media_path(p_name) m
    join public.companies c on c.id = m.company_id
    where not c.is_suspended
      and (private.is_member(c.id)
       or (c.is_public
           and (m.folder <> 'products'
                or exists (select 1 from public.products p
                           where p.company_id = c.id and p.status = 'published'
                             and p.image_paths @> array[p_name])))));
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

-- Verification evidence: uploaded by admins of an active (non-suspended)
-- company, read by that company's admin-role holders (even while suspended,
-- to resolve the suspension) and platform admins. Never updated or deleted by
-- users; files of a deleted company are reported as orphans.
create or replace function private.can_upload_verification_object(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select private.is_company_admin(v.company_id)
                   from private.parse_verification_path(p_name) v where v.company_id is not null), false);
$$;

-- document_shares visibility. Owners: members of a non-suspended owner company.
-- Recipients: documents.view holders (void while the recipient is suspended),
-- only while the share is in force, the document is not archived and the owner
-- is not suspended — the same conditions as can_read_document's share branch.
create or replace function private.can_see_share_as_owner(p_owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_member(p_owner)
     and exists (select 1 from public.companies c where c.id = p_owner and not c.is_suspended);
$$;

create or replace function private.can_see_share_as_recipient(p_document uuid, p_recipient uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_permission(p_recipient, 'documents.view')
     and exists (select 1 from public.documents d join public.companies c on c.id = d.company_id
                 where d.id = p_document and not d.archived and not c.is_suspended);
$$;

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
select private.allow_execute(array['authenticated'], array['private.object_size(jsonb)']);
select private.allow_execute(array['authenticated'], array[
  'private.upload_reserved(text, text, jsonb)',
  'private.can_upload_document_object(text)',
  'private.can_read_document_object(text)',
  'private.can_delete_document_object(text)',
  'private.can_write_company_media(text)',
  'private.can_upload_verification_object(text)',
  'private.can_read_verification_object(text)',
  'private.is_own_avatar_path(text)',
  'private.can_see_share_as_owner(uuid)',
  'private.can_see_share_as_recipient(uuid, uuid)'
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
  using (private.can_see_share_as_owner(owner_company_id)
         or (revoked_at is null and (expires_at is null or expires_at > now())
             and private.can_see_share_as_recipient(document_id, recipient_company_id)));

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
              and private.can_upload_document_object(name)
              and private.upload_reserved(bucket_id, name, metadata));
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
              and private.can_write_company_media(name)
              and private.upload_reserved(bucket_id, name, metadata));
create policy soko_media_update on storage.objects
  for update to authenticated
  using (bucket_id = 'company-media' and private.can_write_company_media(name))
  with check (bucket_id = 'company-media'
              and private.can_write_company_media(name)
              and private.upload_reserved(bucket_id, name, metadata));
-- Deleting frees space, so it is never blocked by the quota.
create policy soko_media_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'company-media' and private.can_write_company_media(name));

create policy soko_verification_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'verification'
              and private.can_upload_verification_object(name)
              and private.upload_reserved(bucket_id, name, metadata));
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
  v_res private.storage_upload_reservations%rowtype;
  v_size bigint;
  v_mime text;
  v_found boolean;
  v_objver text;
  v_owner text;
  v_written timestamptz;
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

  -- The caller's own open reservation for this exact path is mandatory: it is
  -- the only proof the bytes were admitted through reserve_storage_upload (and
  -- charged to the quota). One message for every failure, so it does not reveal
  -- whether someone else holds the path.
  select * into v_res from private.storage_upload_reservations r
  where r.bucket_id = 'company-documents' and r.object_name = p_storage_path for update;
  if v_res.id is null or v_res.user_id <> v_uid
     or v_res.settled_at is not null or v_res.rejected_at is not null then
    raise exception 'no open upload reservation for this path' using errcode = '22023';
  end if;

  -- FOR SHARE blocks a concurrent Storage upsert of the row until we commit.
  select true, private.object_size(o.metadata), o.metadata ->> 'mimetype', o.version, o.owner_id,
         greatest(o.created_at, coalesce(o.updated_at, o.created_at))
    into v_found, v_size, v_mime, v_objver, v_owner, v_written
  from storage.objects o where o.bucket_id = 'company-documents' and o.name = p_storage_path for share;
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
  -- The stored object must be the one this reservation admitted: real size
  -- within the reserved bytes, the reserved MIME type, written by the reserving
  -- user (Storage sets owner_id from the JWT sub) no earlier than the
  -- reservation, and carrying a Storage version (pinned on the version row).
  if v_size > v_res.reserved_bytes
     or v_mime is distinct from v_res.mime_type
     or v_objver is null or v_objver = ''
     or (v_res.object_version is not null and v_objver is distinct from v_res.object_version)
     or v_owner is distinct from v_uid::text
     or v_written < v_res.created_at then
    raise exception 'uploaded file does not match its reservation' using errcode = '22023';
  end if;
  update private.storage_upload_reservations set settled_at = now(), object_version = v_objver
  where id = v_res.id;

  v_name := left(coalesce(nullif(btrim(p_file_name), ''), v_path.file_name), 255);
  if v_name ~ '[[:cntrl:]]' then
    raise exception 'invalid file name' using errcode = '22023';
  end if;

  insert into public.document_versions (document_id, company_id, version, storage_path, file_name, mime_type, size_bytes, uploaded_by, object_version)
  values (v_doc.id, v_doc.company_id, v_path.version, p_storage_path, v_name, v_mime, v_size, v_uid, v_objver)
  returning id into v_id;
  update public.documents set current_version = v_path.version where id = v_doc.id;
  return v_id;
end $$;

-- Step 1 of every company-documents, company-media and verification upload.
-- Authorises the path, then charges p_size against the quota under the guard
-- row lock (READ COMMITTED: concurrent callers queue; REPEATABLE READ /
-- SERIALIZABLE: they fail with a retryable 40001). Returns when the 15-minute
-- upload window closes. Errors: 42501 not allowed, 22023 invalid size/type/
-- bucket, 55006 the path already has a reservation (open, in its grace period,
-- awaiting reconciliation or rejected) or, for buckets without overwrite, an
-- object; 53400 quota or open-upload limit reached.
create or replace function public.reserve_storage_upload(p_bucket text, p_name text, p_size bigint, p_mime_type text)
returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_bucket storage.buckets%rowtype;
  v_company uuid;
  v_allowed boolean;
  v_expires timestamptz := now() + private.upload_window();
begin
  select * into v_bucket from storage.buckets b
  where b.id = p_bucket and b.id in ('company-documents', 'company-media', 'verification');
  if v_bucket.id is null then
    raise exception 'unsupported bucket' using errcode = '22023';
  end if;
  if p_size is null or p_size <= 0 or (v_bucket.file_size_limit is not null and p_size > v_bucket.file_size_limit) then
    raise exception 'invalid file size' using errcode = '22023';
  end if;
  if v_bucket.allowed_mime_types is not null
     and (p_mime_type is null or not p_mime_type = any (v_bucket.allowed_mime_types)) then
    raise exception 'file type is not allowed' using errcode = '22023';
  end if;
  v_allowed := case p_bucket
    when 'company-documents' then private.can_upload_document_object(p_name)
    when 'company-media'     then private.can_write_company_media(p_name)
    else private.can_upload_verification_object(p_name) end;
  if not coalesce(v_allowed, false) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  v_company := private.storage_company(p_name);

  insert into private.storage_quota_guard (company_id) values (v_company)
  on conflict (company_id) do update set checked_at = now();

  -- The path's company is fixed by its first folder, so the guard row lock
  -- above also serialises every reserve and reconcile on this exact path.
  -- Any existing row means an upload was admitted here whose outcome is not
  -- yet settled by reconciliation: never renew, extend or reassign it.
  if exists (select 1 from private.storage_upload_reservations r
             where r.bucket_id = p_bucket and r.object_name = p_name) then
    raise exception 'this path already has an upload; use a new file name' using errcode = '55006';
  end if;
  -- company-documents and verification have no UPDATE policy: an existing
  -- object can never be overwritten, so a reservation for it is refused.
  if p_bucket <> 'company-media'
     and exists (select 1 from storage.objects o where o.bucket_id = p_bucket and o.name = p_name) then
    raise exception 'a file already exists at this path; use a new file name' using errcode = '55006';
  end if;

  if (select count(*) from private.storage_upload_reservations r
      where r.company_id = v_company and r.settled_at is null and now() < r.expires_at) >= 20 then
    raise exception 'too many uploads in progress' using errcode = '53400';
  end if;
  if private.storage_usage(v_company, null, p_bucket, p_name) + p_size
     > private.entitlement_int(v_company, 'storageMb')::bigint * 1024 * 1024 then
    raise exception 'storage quota exceeded' using errcode = '53400';
  end if;

  insert into private.storage_upload_reservations
    (company_id, bucket_id, object_name, user_id, reserved_bytes, mime_type, expires_at)
  values (v_company, p_bucket, p_name, v_uid, p_size, p_mime_type, v_expires);
  return v_expires;
end $$;

-- Step 3 for company-media and verification uploads (documents settle in
-- finalize_document_version). Checks Storage's real size and type against the
-- caller's reservation and settles it. Returns the real size.
create or replace function public.complete_storage_upload(p_bucket text, p_name text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_res private.storage_upload_reservations%rowtype;
  v_size bigint;
  v_mime text;
  v_objver text;
  v_found boolean;
begin
  select * into v_res from private.storage_upload_reservations r
  where r.bucket_id = p_bucket and r.object_name = p_name and r.user_id = v_uid
    and r.settled_at is null and r.rejected_at is null
  for update;
  if v_res.id is null then
    raise exception 'no upload in progress for this path' using errcode = '22023';
  end if;
  select true, private.object_size(o.metadata), o.metadata ->> 'mimetype', o.version
    into v_found, v_size, v_mime, v_objver
  from storage.objects o where o.bucket_id = p_bucket and o.name = p_name;
  if v_found is null then
    raise exception 'uploaded file not found' using errcode = '22023';
  end if;
  if v_size is null or v_size <= 0 or v_size > v_res.reserved_bytes or v_mime is distinct from v_res.mime_type then
    raise exception 'uploaded file does not match its reservation' using errcode = '22023';
  end if;
  update private.storage_upload_reservations set settled_at = now(), object_version = v_objver
  where id = v_res.id;
  return v_size;
end $$;

-- Scheduled service-role job. Only reservations whose grace has run out are
-- touched (no caller can shorten it), each under its company's guard row so it
-- serialises with reserve_storage_upload. Each is reconciled with the object
-- actually at its path:
--   released     no object (abandoned or interrupted upload, or deleted file)
--   settled_late an unsettled upload that landed and fits, then released
--   released     a settled upload whose object is unchanged
--   rejected     larger than reserved, another type, or replaced after
--                settlement; kept (and the path blocked) until the file is
--                deleted via the Storage API, listed by list_orphaned_storage_objects
-- Rejected rows whose file is gone are released.
create or replace function private.reconcile_storage_reservations()
returns table (outcome text, reservations integer)
language plpgsql volatile security definer set search_path = '' as $$
declare
  r private.storage_upload_reservations%rowtype;
  v_found boolean;
  v_size bigint;
  v_mime text;
  v_objver text;
  v_outcome text;
  v_counts jsonb := '{}'::jsonb;
begin
  for r in
    select * from private.storage_upload_reservations x
    where now() >= x.expires_at + private.upload_grace()
    order by x.company_id, x.id
  loop
    insert into private.storage_quota_guard (company_id) values (r.company_id)
    on conflict (company_id) do update set checked_at = now();
    -- Re-read under the lock: a concurrent reserve may have renewed this path.
    select * into r from private.storage_upload_reservations x
    where x.id = r.id and now() >= x.expires_at + private.upload_grace() for update;
    continue when r.id is null;

    v_found := null;
    select true, private.object_size(o.metadata), o.metadata ->> 'mimetype', o.version
      into v_found, v_size, v_mime, v_objver
    from storage.objects o where o.bucket_id = r.bucket_id and o.name = r.object_name;

    if v_found is null then
      v_outcome := 'released';
    elsif r.rejected_at is not null then
      v_outcome := 'still_rejected';
    elsif v_size is null or v_size <= 0 or v_size > r.reserved_bytes
          or v_mime is distinct from r.mime_type
          or (r.settled_at is not null and v_objver is distinct from r.object_version) then
      v_outcome := 'rejected';
    elsif r.settled_at is null then
      v_outcome := 'settled_late';
    else
      v_outcome := 'released';
    end if;

    if v_outcome = 'rejected' then
      -- Record exactly which object version was judged, so cleanup can only
      -- ever delete those bytes.
      update private.storage_upload_reservations set rejected_at = now(), object_version = v_objver
      where id = r.id;
    elsif v_outcome in ('released', 'settled_late') then
      delete from private.storage_upload_reservations where id = r.id;
    end if;
    v_counts := jsonb_set(v_counts, array[v_outcome],
                          to_jsonb(coalesce((v_counts ->> v_outcome)::int, 0) + 1));
  end loop;
  return query select k, v::int from jsonb_each_text(v_counts) as e(k, v) order by k;
end $$;
select private.allow_execute(array['service_role'], array['private.reconcile_storage_reservations()']);

create or replace function public.share_document(p_document uuid, p_recipient_company uuid, p_expires_at timestamptz default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_doc public.documents%rowtype;
  v_id uuid;
begin
  -- Only an active member of the owning company, holding documents.share and
  -- internal access at the document's own level, while the company is not
  -- suspended. can_read_document is deliberately not used: public visibility
  -- or a share received from another company must never authorise resharing.
  select * into v_doc from public.documents where id = p_document for share;
  if v_doc.id is null or not private.has_permission(v_doc.company_id, 'documents.share')
     or not private.has_doc_access(v_doc.company_id, v_doc.access_level) then
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
  v_level public.doc_access_level;
begin
  -- Same rule as share_document: documents.share in the owning company and
  -- internal access at the document's current level (both void while suspended).
  select s.owner_company_id, d.access_level into v_owner, v_level
  from public.document_shares s join public.documents d on d.id = s.document_id
  where s.id = p_share for share of d;
  if v_owner is null or not private.has_permission(v_owner, 'documents.share')
     or not private.has_doc_access(v_owner, v_level) then
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
  -- Never sign a URL for bytes other than the ones verified at finalisation.
  if not exists (select 1 from storage.objects o
                 where o.bucket_id = 'company-documents' and o.name = v_v.storage_path
                   and o.version = v_v.object_version) then
    raise exception 'file is unavailable or failed its integrity check' using errcode = '55000';
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
--
-- Safety rules, so a report can never race an upload that is still allowed to
-- land:
--   * Nothing is reported while its path has a reservation that is unsettled
--     or settled and not yet past window + grace (an admitted upload may still
--     be streaming). Company deletion cascades its reservations, and its
--     objects are reported as 'company deleted'.
--   * A rejected object is reported only while the object at the path is the
--     exact version reconciliation judged; anything newer is left alone.
--   * Age-based reasons use the later of created_at/updated_at and never less
--     than window + grace, whatever p_min_age the caller passes.
create or replace function private.list_orphaned_storage_objects(p_min_age interval default interval '1 day')
returns table (bucket_id text, name text, reason text)
language sql stable security definer set search_path = '' as $$
  select o.bucket_id, o.name, x.reason
  from storage.objects o
  left join lateral (select r.rejected_at, r.object_version,
                            (r.rejected_at is null
                             and now() < r.expires_at + private.upload_grace()) as in_grace
                     from private.storage_upload_reservations r
                     where r.bucket_id = o.bucket_id and r.object_name = o.name) res on true
  cross join lateral (select
    case
      when coalesce(res.in_grace, false) then null
      -- A finalised document file is never a routine deletion candidate, even
      -- if its bytes were replaced or its reservation was rejected: that is an
      -- integrity incident (list_storage_integrity_incidents), not garbage.
      when o.bucket_id = 'company-documents'
        and exists (select 1 from public.document_versions v where v.storage_path = o.name)
        then null
      when o.bucket_id = 'avatars' then
        case when (select a.user_id from private.parse_avatar_path(o.name) a) is null then 'malformed path'
             when not exists (select 1 from auth.users u
                              where u.id = (select a.user_id from private.parse_avatar_path(o.name) a))
               then 'user deleted' end
      when private.storage_company(o.name) is null
        or not exists (select 1 from public.companies c where c.id = private.storage_company(o.name))
        then 'company deleted or malformed path'
      when res.rejected_at is not null then
        case when res.object_version is not distinct from o.version then 'does not match its reservation' end
      when o.bucket_id = 'company-documents' then
        case when (select p.company_id from private.parse_document_path(o.name) p) is null then 'malformed path'
             when greatest(o.created_at, coalesce(o.updated_at, o.created_at))
                      < now() - greatest(coalesce(p_min_age, interval '0'),
                                         private.upload_window() + private.upload_grace())
               then 'never finalised' end
      when o.bucket_id = 'company-media'
        and (select m.company_id from private.parse_media_path(o.name) m) is null then 'malformed path'
      when o.bucket_id = 'verification'
        and (select v.company_id from private.parse_verification_path(o.name) v) is null then 'malformed path'
    end as reason) x
  where o.bucket_id in ('company-documents', 'company-media', 'verification', 'avatars')
    and x.reason is not null;
$$;
select private.allow_execute(array['service_role'], array['private.list_orphaned_storage_objects(interval)']);

-- Service-role integrity report: finalised document versions whose Storage
-- object no longer matches what finalize_document_version verified. These are
-- never deletion candidates; each needs investigation (who wrote the bytes,
-- what the original was). Downloads already refuse them.
--   replaced  the object at the path has a different Storage version
--   missing   the object at the path is gone
create or replace function private.list_storage_integrity_incidents()
returns table (bucket_id text, name text, company_id uuid, document_id uuid, document_version_id uuid,
               version integer, expected_object_version text, actual_object_version text, incident text)
language sql stable security definer set search_path = '' as $$
  select 'company-documents', v.storage_path, v.company_id, v.document_id, v.id,
         v.version, v.object_version, o.version,
         case when o.id is null then 'missing' else 'replaced' end
  from public.document_versions v
  left join storage.objects o on o.bucket_id = 'company-documents' and o.name = v.storage_path
  where o.id is null or o.version is distinct from v.object_version
  order by v.company_id, v.storage_path;
$$;
select private.allow_execute(array['service_role'], array['private.list_storage_integrity_incidents()']);

-- Approved RPCs: callable by signed-in users only; each checks its own authorization.
select private.allow_execute(array['authenticated'], array[
  'public.finalize_document_version(uuid, text, text)',
  'public.reserve_storage_upload(text, text, bigint, text)',
  'public.complete_storage_upload(text, text)',
  'public.share_document(uuid, uuid, timestamptz)',
  'public.revoke_document_share(uuid)',
  'public.record_document_download(uuid)'
]);

select private.apply_function_grants();
