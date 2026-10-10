-- Rollback for migration 04 — audit log and notifications.
-- DESTROYS the audit trail and all notifications. Export audit_log first.
do $$
begin
  if exists (select 1 from pg_catalog.pg_publication_tables
             where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime drop table public.notifications;
  end if;
end $$;

drop trigger if exists company_verifications_notify on public.company_verifications;
drop trigger if exists company_memberships_notify on public.company_memberships;
drop function if exists private.verification_notifications();
drop function if exists private.membership_notifications();
drop function if exists private.notify_permission_holders(uuid, text, text, jsonb, uuid);
drop function if exists private.notify(uuid, uuid, text, jsonb);
drop table if exists public.notifications cascade;

-- Dropping the auditor removes every audit_row trigger that uses it.
drop function if exists private.attach_audit(regclass);
drop function if exists private.audit_row() cascade;
drop table if exists public.audit_log cascade;
