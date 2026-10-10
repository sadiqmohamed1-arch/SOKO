-- Rollback for migration 08 — vendors, contacts and network.
-- DESTROYS vendor records, compliance, contacts, cards and connections.
drop function if exists public.review_compliance_submission(uuid, public.vendor_doc_status, text);
drop function if exists public.submit_compliance_document(uuid, uuid, uuid);
drop function if exists public.set_vendor_approval(uuid, public.vendor_approval_status, text);
drop function if exists public.respond_connection(uuid, text);

drop policy if exists profiles_select_connections on public.profiles;

drop table if exists public.vendor_compliance_submissions cascade;
drop table if exists public.vendor_compliance_requirements cascade;
drop table if exists public.vendor_notes cascade;
drop table if exists public.vendor_records cascade;
drop table if exists public.company_contacts cascade;
drop table if exists public.connections cascade;
drop table if exists public.business_cards cascade;

drop function if exists private.connection_requested_notify();
drop function if exists private.vendor_record_company(uuid);
drop function if exists private.is_supplier_of(uuid);
drop function if exists private.is_vendor_supplier(uuid);
drop function if exists private.is_connected(uuid);
drop function if exists private.connections_rate_limit();
