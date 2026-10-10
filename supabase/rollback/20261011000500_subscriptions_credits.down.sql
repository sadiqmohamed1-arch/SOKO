-- Rollback for migration 05 — subscriptions and credits.
-- DESTROYS plan assignments and the credit ledger. Export both first.
drop function if exists public.admin_adjust_credits(uuid, integer, text);
drop function if exists public.admin_set_subscription(uuid, text, public.subscription_status, timestamptz, text);
drop function if exists public.get_credit_balance(uuid);
drop function if exists private.grant_monthly_credits(date);
drop function if exists private.add_credits(uuid, integer, text, uuid);
drop function if exists private.spend_credits(uuid, integer, text, uuid);
drop function if exists private.credit_balance(uuid);
drop function if exists private.entitlement_int(uuid, text);
drop function if exists private.entitled(uuid, text);
drop function if exists private.plan_entitlements(uuid);

drop table if exists public.credit_ledger cascade;
drop function if exists private.forbid_delete_unless_company_gone();

drop trigger if exists companies_default_plan on public.companies;
drop function if exists private.assign_default_plan();
drop table if exists public.company_subscriptions cascade;
drop function if exists private.check_subscription_plan();
