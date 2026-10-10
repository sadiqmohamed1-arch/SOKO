-- Rollback for migration 07 — documents and storage.
-- DESTROYS document metadata, versions and shares. Files in Storage are NOT
-- deleted by SQL: empty the four buckets through the Storage API first, or the
-- bucket deletes below will fail (by design, so files are never orphaned).
drop function if exists private.queue_document_expiry_reminders();
drop function if exists public.record_document_download(uuid);
drop function if exists public.revoke_document_share(uuid);
drop function if exists public.share_document(uuid, uuid, timestamptz);
drop function if exists public.finalize_document_version(uuid, text, text);

drop policy if exists soko_documents_insert on storage.objects;
drop policy if exists soko_documents_select on storage.objects;
drop policy if exists soko_documents_delete on storage.objects;
drop policy if exists soko_media_select on storage.objects;
drop policy if exists soko_media_insert on storage.objects;
drop policy if exists soko_media_update on storage.objects;
drop policy if exists soko_media_delete on storage.objects;
drop policy if exists soko_verification_insert on storage.objects;
drop policy if exists soko_verification_select on storage.objects;
drop policy if exists soko_avatars_select on storage.objects;
drop policy if exists soko_avatars_insert on storage.objects;
drop policy if exists soko_avatars_update on storage.objects;
drop policy if exists soko_avatars_delete on storage.objects;

delete from storage.buckets
where id in ('company-documents', 'company-media', 'verification', 'avatars')
  and not exists (select 1 from storage.objects o where o.bucket_id = storage.buckets.id);

alter table if exists public.company_verifications
  drop constraint if exists company_verifications_license_document_fk;

drop table if exists public.document_reminders_sent cascade;
drop table if exists public.document_shares cascade;
drop table if exists public.document_versions cascade;
drop table if exists public.documents cascade;

drop function if exists private.can_write_company_media(text);
drop function if exists private.can_read_company_media(text);
drop function if exists private.can_delete_document_object(text);
drop function if exists private.can_read_document_object(text);
drop function if exists private.can_upload_document_object(text);
drop function if exists private.storage_company(text);
drop function if exists private.storage_quota_ok(uuid);
drop function if exists private.can_read_document(uuid);
