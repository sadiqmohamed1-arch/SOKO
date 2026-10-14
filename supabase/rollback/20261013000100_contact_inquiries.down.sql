-- Rollback for migration 13 — Contact Us. DESTROYS inquiries, notes and throttle rows.
-- Restores admin_platform_stats() to the migration 12 definition.

drop function if exists public.submit_contact_inquiry(text, text, text, text, text, text, text, text, text);
drop function if exists public.admin_update_contact_inquiry(uuid, text, uuid);
drop function if exists public.admin_add_contact_inquiry_note(uuid, text);
drop function if exists public.admin_list_contact_assignees();
drop function if exists private.contact_throttle_hit(text, text, interval, integer);
drop function if exists private.notify_contact_inquiry_created();
drop function if exists private.audit_contact_inquiry_note();
drop function if exists private.audit_contact_inquiry();

drop table if exists public.contact_inquiry_notes cascade;
drop table if exists public.contact_inquiries cascade;
drop table if exists private.contact_submit_throttle cascade;
drop sequence if exists private.contact_inquiry_ref_seq;

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
    'published_products',    (select count(*) from public.products where status = 'published'));
end $$;
