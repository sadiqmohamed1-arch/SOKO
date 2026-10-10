-- Rollback for migration 12 — admin and moderation. DESTROYS content reports.
drop function if exists public.admin_platform_stats();
drop function if exists public.admin_resolve_report(uuid, text, text);
drop function if exists public.admin_suspend_campaign(uuid, text);
drop function if exists public.admin_set_company_suspension(uuid, boolean, text);
drop function if exists private.require_platform_admin();
drop table if exists public.content_reports cascade;
drop function if exists private.content_reports_rate_limit();
