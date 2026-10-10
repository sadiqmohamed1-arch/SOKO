-- Rollback for migration 11 — intelligence. DESTROYS metrics and profile views.
drop function if exists private.refresh_supplier_metrics(date);
drop function if exists public.record_profile_view(uuid, uuid);
drop table if exists public.supplier_metrics_daily cascade;
drop table if exists public.company_profile_views cascade;
