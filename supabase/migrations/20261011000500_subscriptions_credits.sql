-- =============================================================================
-- SOKO migration 05 — Subscriptions, entitlements and the credit ledger
-- Clients can read their plan and balance but can never change either.
-- The balance is always SUM(delta); there is no stored counter to tamper with.
-- =============================================================================

create table public.company_subscriptions (
  company_id         uuid primary key references public.companies (id) on delete cascade,
  plan_id            text not null references public.plans (id),
  status             public.subscription_status not null default 'active',
  current_period_end timestamptz,
  external_ref       text check (char_length(external_ref) <= 200),  -- payment-provider id
  updated_at         timestamptz not null default now()
);
create trigger company_subscriptions_updated_at before update on public.company_subscriptions
  for each row execute function private.set_updated_at();

create or replace function private.check_subscription_plan() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_plan_kind public.company_kind; v_company_kind public.company_kind;
begin
  select p.company_kind into v_plan_kind from public.plans p where p.id = new.plan_id;
  select c.kind into v_company_kind from public.companies c where c.id = new.company_id;
  if v_plan_kind is not null and v_plan_kind <> v_company_kind then
    raise exception 'plan % is not available to % companies', new.plan_id, v_company_kind using errcode = '23514';
  end if;
  return new;
end $$;
create trigger company_subscriptions_plan_kind before insert or update on public.company_subscriptions
  for each row execute function private.check_subscription_plan();

-- Every new company starts on its kind's default free plan.
create or replace function private.assign_default_plan() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.company_subscriptions (company_id, plan_id)
  select new.id, p.id from public.plans p where p.company_kind = new.kind and p.is_default
  on conflict (company_id) do nothing;
  return new;
end $$;
create trigger companies_default_plan after insert on public.companies
  for each row execute function private.assign_default_plan();

insert into public.company_subscriptions (company_id, plan_id)
select c.id, p.id from public.companies c join public.plans p on p.company_kind = c.kind and p.is_default
on conflict (company_id) do nothing;

select private.attach_audit('public.company_subscriptions');

-- -----------------------------------------------------------------------------
-- Credit ledger (append-only)
-- -----------------------------------------------------------------------------
create table public.credit_ledger (
  id         bigint generated always as identity primary key,
  company_id uuid not null references public.companies (id) on delete cascade,
  delta      integer not null check (delta <> 0),
  reason     text not null check (reason in ('monthly_grant','campaign_launch','campaign_refund','admin_adjustment','purchase')),
  ref_id     uuid,
  period     date,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index credit_ledger_company on public.credit_ledger (company_id, created_at desc);
create unique index credit_ledger_one_grant_per_period
  on public.credit_ledger (company_id, period) where reason = 'monthly_grant';

create trigger credit_ledger_no_update before update on public.credit_ledger
  for each row execute function private.forbid_mutation();

-- Rows may only disappear through the company-delete cascade.
create or replace function private.forbid_delete_unless_company_gone() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.companies c where c.id = old.company_id) then
    raise exception '% is append-only', tg_table_name using errcode = '42501';
  end if;
  return old;
end $$;
create trigger credit_ledger_no_delete before delete on public.credit_ledger
  for each row execute function private.forbid_delete_unless_company_gone();

-- -----------------------------------------------------------------------------
-- Entitlement and credit helpers (internal: called from trusted RPCs)
-- -----------------------------------------------------------------------------
create or replace function private.plan_entitlements(p_company uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select p.entitlements from public.company_subscriptions s
       join public.plans p on p.id = s.plan_id
      where s.company_id = p_company and s.status in ('trialing', 'active')),
    (select p.entitlements from public.companies c
       join public.plans p on p.company_kind = c.kind and p.is_default
      where c.id = p_company),
    '{}'::jsonb);
$$;

create or replace function private.entitled(p_company uuid, p_key text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((private.plan_entitlements(p_company) ->> p_key)::boolean, false);
$$;

create or replace function private.entitlement_int(p_company uuid, p_key text) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce((private.plan_entitlements(p_company) ->> p_key)::integer, 0);
$$;

create or replace function private.credit_balance(p_company uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(l.delta), 0)::integer from public.credit_ledger l where l.company_id = p_company;
$$;

-- Serialised per company by locking the subscription row.
create or replace function private.spend_credits(p_company uuid, p_amount integer, p_reason text, p_ref uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive' using errcode = '22023';
  end if;
  perform 1 from public.company_subscriptions s where s.company_id = p_company for update;
  if private.credit_balance(p_company) < p_amount then
    raise exception 'insufficient credits' using errcode = '53400';
  end if;
  insert into public.credit_ledger (company_id, delta, reason, ref_id, created_by)
  values (p_company, -p_amount, p_reason, p_ref, auth.uid());
end $$;

create or replace function private.add_credits(p_company uuid, p_amount integer, p_reason text, p_ref uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive' using errcode = '22023';
  end if;
  insert into public.credit_ledger (company_id, delta, reason, ref_id, created_by)
  values (p_company, p_amount, p_reason, p_ref, auth.uid());
end $$;

-- Scheduled job (service role / pg_cron). Idempotent per calendar month.
create or replace function private.grant_monthly_credits(p_period date default (date_trunc('month', now()))::date)
returns integer
language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  insert into public.credit_ledger (company_id, delta, reason, period)
  select s.company_id, (p.entitlements ->> 'monthlyCredits')::integer, 'monthly_grant', p_period
  from public.company_subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.status in ('trialing', 'active') and coalesce((p.entitlements ->> 'monthlyCredits')::integer, 0) > 0
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end $$;
grant execute on function private.grant_monthly_credits(date) to service_role;

-- -----------------------------------------------------------------------------
-- Client-facing RPCs
-- -----------------------------------------------------------------------------
create or replace function public.get_credit_balance(p_company uuid) returns integer
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_user();
  if not private.is_member(p_company) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return private.credit_balance(p_company);
end $$;

-- Manual plan changes until a payment provider is chosen. Provider webhooks
-- will call an equivalent function as service_role from a server endpoint.
create or replace function public.admin_set_subscription(
  p_company uuid, p_plan text, p_status public.subscription_status default 'active',
  p_period_end timestamptz default null, p_external_ref text default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_user();
  if not private.is_platform_admin() then
    raise exception 'platform admin only' using errcode = '42501';
  end if;
  insert into public.company_subscriptions (company_id, plan_id, status, current_period_end, external_ref)
  values (p_company, p_plan, p_status, p_period_end, p_external_ref)
  on conflict (company_id) do update
    set plan_id = excluded.plan_id, status = excluded.status,
        current_period_end = excluded.current_period_end, external_ref = excluded.external_ref;
end $$;

create or replace function public.admin_adjust_credits(p_company uuid, p_delta integer, p_note text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_user();
  if not private.is_platform_admin() then
    raise exception 'platform admin only' using errcode = '42501';
  end if;
  if p_delta is null or p_delta = 0 or abs(p_delta) > 100000 then
    raise exception 'invalid adjustment' using errcode = '22023';
  end if;
  insert into public.credit_ledger (company_id, delta, reason, created_by)
  values (p_company, p_delta, 'admin_adjustment', auth.uid());
  insert into public.audit_log (company_id, actor_id, action, entity, diff)
  values (p_company, auth.uid(), 'credit_adjustment', 'credit_ledger',
          jsonb_build_object('delta', p_delta, 'note', left(p_note, 500)));
end $$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.company_subscriptions enable row level security;
alter table public.credit_ledger enable row level security;

select private.reset_table_grants('public.company_subscriptions');
grant select on public.company_subscriptions to authenticated;
create policy subscriptions_read on public.company_subscriptions
  for select to authenticated using (private.is_member(company_id) or private.is_platform_admin());

select private.reset_table_grants('public.credit_ledger');
grant select on public.credit_ledger to authenticated;
create policy credit_ledger_read on public.credit_ledger
  for select to authenticated
  using (private.has_permission(company_id, 'campaigns.manage')
         or private.has_permission(company_id, 'plan.manage')
         or private.is_platform_admin());

select private.lock_down_public_functions();
