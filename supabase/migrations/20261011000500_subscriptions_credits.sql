-- =============================================================================
-- SOKO migration 05 — Subscriptions, entitlements and the credit ledger
-- Clients can read their plan and balance but can never change either.
-- The balance is always SUM(delta); there is no stored counter to tamper with.
-- =============================================================================

-- Opens the function-ownership scope closed by apply_function_grants() below.
select private.begin_function_scope();

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
  select c.kind into v_company_kind from public.companies c where c.id = new.company_id;
  if not found then
    raise exception 'company not found' using errcode = 'P0002';
  end if;
  select p.company_kind into v_plan_kind from public.plans p where p.id = new.plan_id;
  if not found then
    raise exception 'plan % does not exist', new.plan_id using errcode = 'P0002';
  end if;
  -- A null plan kind means the plan is offered to both kinds.
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

-- Payment-provider reference is redacted.
select private.attach_audit('public.company_subscriptions',
  array['company_id'],
  array['company_id', 'plan_id', 'status', 'current_period_end'],
  array['updated_at']);

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
-- TRUNCATE skips row triggers, so it needs its own statement-level guard.
create trigger credit_ledger_no_truncate before truncate on public.credit_ledger
  for each statement execute function private.forbid_mutation();

-- -----------------------------------------------------------------------------
-- Per-company credit serialisation.
-- Every balance-reducing write locks the subscription row and then writes the
-- company's guard row. The real write (not a lock-only FOR UPDATE) matters:
-- under READ COMMITTED the second transaction waits and re-reads the balance
-- with a fresh snapshot; under REPEATABLE READ / SERIALIZABLE it fails with
-- 40001 instead of spending against a stale balance. The guard holds no
-- balance, so the ledger stays the only source of truth.
-- -----------------------------------------------------------------------------
create table private.credit_guard (
  company_id uuid primary key references public.companies (id) on delete cascade,
  version    bigint not null default 0
);
revoke all on table private.credit_guard from public, anon, authenticated, service_role;

create or replace function private.lock_credit_account(p_company uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_company is null or not exists (select 1 from public.companies c where c.id = p_company) then
    raise exception 'company not found' using errcode = 'P0002';
  end if;
  perform 1 from public.company_subscriptions s where s.company_id = p_company for update;
  if not found then
    raise exception 'company has no subscription' using errcode = 'P0002';
  end if;
  insert into private.credit_guard as g (company_id) values (p_company)
  on conflict (company_id) do update set version = g.version + 1;
end $$;

-- Backstop for every path, including direct inserts by the database owner:
-- no debit may take a company's balance below zero.
create or replace function private.ledger_no_overdraft() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.delta < 0 then
    perform private.lock_credit_account(new.company_id);
    if (select coalesce(sum(l.delta), 0) from public.credit_ledger l where l.company_id = new.company_id)
       + new.delta < 0 then
      raise exception 'insufficient credits' using errcode = '53400';
    end if;
  end if;
  return new;
end $$;
create trigger credit_ledger_no_overdraft before insert on public.credit_ledger
  for each row execute function private.ledger_no_overdraft();

-- -----------------------------------------------------------------------------
-- Manual-adjustment notes: platform-admin only, never in the company-readable
-- audit log. Append-only; rows leave only with their company.
-- -----------------------------------------------------------------------------
create table public.credit_adjustment_notes (
  ledger_id  bigint primary key references public.credit_ledger (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  note       text not null check (char_length(note) between 1 and 500),
  created_by uuid,
  created_at timestamptz not null default now()
);
create trigger credit_adjustment_notes_no_update before update on public.credit_adjustment_notes
  for each row execute function private.forbid_mutation();
create trigger credit_adjustment_notes_no_delete before delete on public.credit_adjustment_notes
  for each row execute function private.forbid_delete_unless_company_gone();
create trigger credit_adjustment_notes_no_truncate before truncate on public.credit_adjustment_notes
  for each statement execute function private.forbid_mutation();

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

-- Serialised per company by private.lock_credit_account().
create or replace function private.spend_credits(p_company uuid, p_amount integer, p_reason text, p_ref uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive' using errcode = '22023';
  end if;
  if p_reason is distinct from 'campaign_launch' then
    raise exception 'invalid debit reason' using errcode = '22023';
  end if;
  perform private.lock_credit_account(p_company);
  if private.credit_balance(p_company) < p_amount then
    raise exception 'insufficient credits' using errcode = '53400';
  end if;
  insert into public.credit_ledger (company_id, delta, reason, ref_id, created_by)
  values (p_company, -p_amount, p_reason, p_ref, auth.uid());
end $$;

-- Credits cannot overspend, but the same lock keeps ordering consistent and
-- rejects missing companies or subscriptions explicitly.
create or replace function private.add_credits(p_company uuid, p_amount integer, p_reason text, p_ref uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive' using errcode = '22023';
  end if;
  if p_reason is null or p_reason not in ('campaign_refund', 'purchase') then
    raise exception 'invalid credit reason' using errcode = '22023';
  end if;
  perform private.lock_credit_account(p_company);
  insert into public.credit_ledger (company_id, delta, reason, ref_id, created_by)
  values (p_company, p_amount, p_reason, p_ref, auth.uid());
end $$;

-- Scheduled job (service role / pg_cron). Idempotent per calendar month: any
-- date is normalised to the first of its month, and the partial unique index
-- makes concurrent runs grant at most once.
create or replace function private.grant_monthly_credits(p_period date default (date_trunc('month', now()))::date)
returns integer
language plpgsql security definer set search_path = '' as $$
declare v_count integer; v_period date;
begin
  if p_period is null then
    raise exception 'period is required' using errcode = '22023';
  end if;
  v_period := date_trunc('month', p_period)::date;
  insert into public.credit_ledger (company_id, delta, reason, period)
  select s.company_id, (p.entitlements ->> 'monthlyCredits')::integer, 'monthly_grant', v_period
  from public.company_subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.status in ('trialing', 'active') and coalesce((p.entitlements ->> 'monthlyCredits')::integer, 0) > 0
  on conflict (company_id, period) where reason = 'monthly_grant' do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end $$;
select private.allow_execute(array['service_role'], array['private.grant_monthly_credits(date)']);

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

-- Business rule: adjustments may never leave a negative balance.
-- The free-text note goes to the platform-admin-only notes table; the
-- company-readable audit entry records only the amounts and that a note exists.
create or replace function public.admin_adjust_credits(p_company uuid, p_delta integer, p_note text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_balance integer;
  v_ledger_id bigint;
  v_note text := nullif(btrim(left(p_note, 500)), '');
begin
  if not private.is_platform_admin() then
    raise exception 'platform admin only' using errcode = '42501';
  end if;
  if p_delta is null or p_delta = 0 or abs(p_delta) > 100000 then
    raise exception 'invalid adjustment' using errcode = '22023';
  end if;
  perform private.lock_credit_account(p_company);
  v_balance := private.credit_balance(p_company);
  if v_balance + p_delta < 0 then
    raise exception 'adjustment would make the balance negative' using errcode = '53400';
  end if;
  insert into public.credit_ledger (company_id, delta, reason, created_by)
  values (p_company, p_delta, 'admin_adjustment', v_uid)
  returning id into v_ledger_id;
  if v_note is not null then
    insert into public.credit_adjustment_notes (ledger_id, company_id, note, created_by)
    values (v_ledger_id, p_company, v_note, v_uid);
  end if;
  insert into public.audit_log (company_id, actor_id, action, entity, entity_id, entity_key, diff)
  values (p_company, v_uid, 'credit_adjustment', 'credit_ledger',
          v_ledger_id::text, jsonb_build_object('id', v_ledger_id),
          jsonb_build_object('delta', p_delta, 'balance_before', v_balance,
                             'balance_after', v_balance + p_delta, 'has_note', v_note is not null));
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
-- Only the database owner (trusted functions) writes the ledger; the service
-- role may read it but never insert, rewrite, delete or truncate entries.
revoke insert, update, delete, truncate on public.credit_ledger from service_role;
grant select on public.credit_ledger to authenticated;
create policy credit_ledger_read on public.credit_ledger
  for select to authenticated
  using (private.has_permission(company_id, 'campaigns.manage')
         or private.has_permission(company_id, 'plan.manage')
         or private.is_platform_admin());

alter table public.credit_adjustment_notes enable row level security;
select private.reset_table_grants('public.credit_adjustment_notes');
revoke insert, update, delete, truncate on public.credit_adjustment_notes from service_role;
grant select on public.credit_adjustment_notes to authenticated;
create policy credit_adjustment_notes_read on public.credit_adjustment_notes
  for select to authenticated using (private.is_platform_admin());

-- Approved RPCs: callable by signed-in users only; each checks its own authorization.
select private.allow_execute(array['authenticated'], array[
  'public.get_credit_balance(uuid)',
  'public.admin_set_subscription(uuid, text, public.subscription_status, timestamptz, text)',
  'public.admin_adjust_credits(uuid, integer, text)'
]);

select private.apply_function_grants();
