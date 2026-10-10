-- =============================================================================
-- SOKO migration 11 — Supplier intelligence
-- Raw event rows (product_views, company_profile_views, campaign_events) stay
-- private to SOKO. Companies only ever read daily aggregates of their own data.
-- =============================================================================

create table public.company_profile_views (
  id                bigint generated always as identity primary key,
  company_id        uuid not null references public.companies (id) on delete cascade,
  viewer_user_id    uuid references auth.users (id) on delete set null,
  viewer_company_id uuid references public.companies (id) on delete set null,
  viewed_on         date not null default current_date,
  created_at        timestamptz not null default now(),
  unique (company_id, viewer_user_id, viewed_on)
);
create index company_profile_views_day on public.company_profile_views (company_id, viewed_on);

create table public.supplier_metrics_daily (
  company_id uuid not null references public.companies (id) on delete cascade,
  day        date not null,
  metric     text not null check (metric in (
               'product_views', 'profile_views', 'product_saves', 'opportunity_interests',
               'campaign_views', 'campaign_clicks', 'campaign_responses',
               'documents_shared', 'visits_completed')),
  value      bigint not null default 0,
  primary key (company_id, day, metric)
);

alter table public.company_profile_views  enable row level security;
alter table public.supplier_metrics_daily enable row level security;

select private.reset_table_grants('public.company_profile_views');

select private.reset_table_grants('public.supplier_metrics_daily');
grant select on public.supplier_metrics_daily to authenticated;
create policy supplier_metrics_read on public.supplier_metrics_daily
  for select to authenticated using (private.is_member(company_id) or private.is_platform_admin());

create or replace function public.record_profile_view(p_company uuid, p_viewer_company uuid default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  if not exists (select 1 from public.companies c where c.id = p_company and c.is_public and not c.is_suspended)
     or private.is_member(p_company) then
    return;
  end if;
  if p_viewer_company is not null and not private.is_member(p_viewer_company) then
    p_viewer_company := null;
  end if;
  insert into public.company_profile_views (company_id, viewer_user_id, viewer_company_id)
  values (p_company, v_uid, p_viewer_company)
  on conflict (company_id, viewer_user_id, viewed_on) do nothing;
end $$;

-- Scheduled job (service role / pg_cron). Recomputes one day; safe to re-run.
create or replace function private.refresh_supplier_metrics(p_day date default current_date - 1) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  delete from public.supplier_metrics_daily where day = p_day;

  insert into public.supplier_metrics_daily (company_id, day, metric, value)
  select company_id, p_day, metric, value from (
    select pv.company_id, 'product_views' as metric, count(*) as value
      from public.product_views pv where pv.viewed_on = p_day group by pv.company_id
    union all
    select cv.company_id, 'profile_views', count(*)
      from public.company_profile_views cv where cv.viewed_on = p_day group by cv.company_id
    union all
    select p.company_id, 'product_saves', count(*)
      from public.saved_products s join public.products p on p.id = s.product_id
      where s.created_at::date = p_day group by p.company_id
    union all
    select i.responder_company_id, 'opportunity_interests', count(*)
      from public.opportunity_interests i
      where i.responder_company_id is not null and i.created_at::date = p_day group by i.responder_company_id
    union all
    select c.owner_company_id, 'campaign_views', count(*)
      from public.campaign_events e join public.campaigns c on c.id = e.campaign_id
      where e.type = 'view' and e.event_day = p_day group by c.owner_company_id
    union all
    select c.owner_company_id, 'campaign_clicks', count(*)
      from public.campaign_events e join public.campaigns c on c.id = e.campaign_id
      where e.type = 'click' and e.event_day = p_day group by c.owner_company_id
    union all
    select c.owner_company_id, 'campaign_responses', count(*)
      from public.campaign_responses r join public.campaigns c on c.id = r.campaign_id
      where r.created_at::date = p_day group by c.owner_company_id
    union all
    select s.owner_company_id, 'documents_shared', count(*)
      from public.document_shares s where s.shared_at::date = p_day group by s.owner_company_id
    union all
    select v.supplier_company_id, 'visits_completed', count(*)
      from public.visits v where v.status = 'completed' and v.check_out_at::date = p_day group by v.supplier_company_id
  ) m;
  get diagnostics v_count = row_count;
  return v_count;
end $$;
grant execute on function private.refresh_supplier_metrics(date) to service_role;

select private.lock_down_public_functions();
