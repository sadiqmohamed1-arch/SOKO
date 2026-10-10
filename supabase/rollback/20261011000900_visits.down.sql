-- Rollback for migration 09 — visits. DESTROYS visits, notes and tasks.
drop function if exists public.update_visit_details(uuid, uuid, timestamptz, smallint, text, text);
drop function if exists public.set_visit_status(uuid, uuid, public.visit_status, text);
drop function if exists public.request_visit(uuid, uuid, timestamptz, smallint, text, text, text);

drop policy if exists companies_counterparty_read on public.companies;

drop table if exists public.visit_tasks cascade;
drop table if exists public.visit_notes cascade;
drop table if exists public.visit_products cascade;
drop table if exists public.visit_attendees cascade;
drop table if exists public.visits cascade;

drop function if exists private.can_manage_visit_products(uuid, uuid);
drop function if exists private.is_counterparty(uuid);
drop function if exists private.can_read_visit(uuid);
drop function if exists private.is_visit_party(uuid, uuid);
